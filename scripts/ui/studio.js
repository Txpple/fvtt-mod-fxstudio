// FX Studio — the screens (ARCHITECTURE §7, the first door), built on the API and nothing else:
// Look up (what plays for an ability and why), Create a look (the five-step walk, ui/create.js),
// Custom looks (what is written here and in the house corpus, newest first, who wrote each), Corpus
// (the shippable corpus, ui/corpus.js) and Check (what plays nothing, per sheet and per book; what
// did not resolve; what played last). Every sentence on these screens is generated from a look by
// core/looks.js; nothing is parsed back. One window, five tabs, plain DOM: ApplicationV2 with its
// own _renderHTML, no template engine.
import { MODULE_ID } from '../settings.js';
import { keyWords, parseKey, slug } from '../core/subjects.js';
import { provenance } from '../core/looks.js';
import { SOURCE_TAG, STATUS_WORDS, dot, esc, idWords, statusOf } from './html.js';
import { onCreateChange, onCreateClick, onCreateInput, onCreateKey, renderCreate, startWalk } from './create.js';
import { onCorpusChange, onCorpusClick, onCorpusInput, renderCorpus } from './corpus.js';

const api = () => game.modules.get(MODULE_ID).api;
const KIND_WORDS = { spell: 'a spell', weapon: 'a weapon', feature: 'a feature', item: 'an item', effect: 'an effect' };
const TABS = [['lookup', 'Look up'], ['create', 'Create a look'], ['custom', 'Custom looks'], ['corpus', 'Corpus'], ['check', 'Check']];

const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2 ?? class { constructor() {} render() {} };

export class Studio extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'fxstudio',
    classes: ['fxstudio'],
    window: { title: 'FX Studio', icon: 'fa-solid fa-wand-sparkles', resizable: true, contentClasses: ['fxstudio-content'] },
    position: { width: 860, height: 800 },
  };

  /** the one open window, so the sheet button and the API reuse it */
  static current = null;

  constructor(options = {}) {
    super(options);
    this.view = { tab: 'lookup', sheet: null, subject: null, customQuery: '', books: null, everyActor: false };
    this.walk = null;
    this.co = null;
    this._bound = false;
  }

  /** open the window at a tab, on an item, on a key, or on a look id; tab 'create' starts the walk on it */
  static open({ tab = null, item = null, id = null, key = null } = {}) {
    const app = Studio.current ?? (Studio.current = new Studio());
    if (!app.entries) app.refresh();
    if (tab) app.view.tab = tab;
    if (tab === 'create') {
      if (item) startWalk(app, { subject: app.subjectFromItem(item) });
      else if (id) startWalk(app, { lookId: id });
      else if (key) startWalk(app, { subject: app.subjectForKey(key) });
      else if (!app.walk) startWalk(app);
    } else if (item) app.showItem(item);
    else if (key) app.showKey(key);
    else if (id) app.showLook(id);
    app.render({ force: true });
    if (app.rendered) app.bringToFront?.();
    return app;
  }

  async close(options) { Studio.current = null; return super.close(options); }

  // -------------------------------------------------------------------------------------------
  // the index of what can be looked up: every ability on every actor, then every key the corpus knows
  // -------------------------------------------------------------------------------------------
  refresh() {
    const a = api();
    this.census = a.census();
    const entries = [];
    for (const row of this.census.actors) {
      for (const it of row.items) entries.push({ name: it.name, owner: row.name, actorType: row.type, uuid: it.uuid, keys: it.keys, hasPlace: it.hasPlace, on: 'use', status: statusOf(it), type: it.type });
      for (const ef of row.effects) entries.push({ name: ef.name, owner: row.name, actorType: row.type, keys: ef.keys, on: 'effect', status: statusOf(ef), type: 'effect', effect: true });
    }
    const seen = new Set(entries.flatMap((e) => e.keys));
    for (const { look, source } of a.looks.list()) {
      for (const key of look.for ?? []) {
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ name: keyWords(key), key, keys: [key], on: look.on ?? 'use', owner: null, status: look.off ? 'off' : (source === 'baseline' ? 'baseline' : 'custom'), corpus: true });
      }
    }
    this.entries = entries;
    this.sheets = this.census.actors.filter((r) => r.type === 'character').map((r) => r.name);
  }

  /** the party's sheets, or every actor when asked */
  sheetRows() { return this.census.actors.filter((r) => this.view.everyActor || r.type === 'character'); }

  // -------------------------------------------------------------------------------------------
  // subjects: what a card or a walk is about — {name, keys, pointer, uuid, owner, actor, hasPlace, on, kind, isNew}
  // -------------------------------------------------------------------------------------------
  subjectFromItem(item) {
    const a = api();
    const acts = item.system?.activities?.contents ?? [];
    const hasPlace = acts.some((x) => x?.target?.template?.type);
    const subject = a.subjects.ofItem(item, { activity: acts[0] ?? null });
    return { name: item.name, keys: subject.keys, pointer: subject.pointer ?? null, uuid: item.uuid, owner: item.actor?.name ?? null, actor: item.actor ?? null, hasPlace, on: 'use', kind: subject.kind };
  }
  subjectFromEntry(e) {
    if (e.uuid) { const item = fromUuidSync(e.uuid); if (item) return this.subjectFromItem(item); }
    return { name: e.name, keys: e.keys, owner: e.owner, hasPlace: !!e.hasPlace, on: e.on ?? 'use', kind: parseKey(e.keys[0])?.kind ?? 'spell' };
  }
  subjectForKey(key) {
    const p = parseKey(key);
    const e = this.entries?.find((x) => x.keys.includes(key));
    if (e) return this.subjectFromEntry(e);
    return { name: idWords(p?.id ?? key), keys: [key], owner: null, hasPlace: false, on: p?.kind === 'effect' ? 'effect' : 'use', kind: p?.kind ?? 'spell' };
  }
  subjectForLook(id) {
    const entry = api().looks.get(id);
    const key = entry?.look?.for?.[0];
    if (key) return this.subjectForKey(key);
    return { name: idWords(id), keys: [], owner: null, hasPlace: false, on: entry?.look?.on ?? 'use', kind: 'spell', lookId: id };
  }
  /** a name typed that is on no sheet: a new ability, keyed by its name as the kind the user picks */
  subjectNew(name, kind = 'spell') {
    return { name, keys: [`${kind}:${slug(name)}`], owner: null, hasPlace: false, on: kind === 'effect' ? 'effect' : 'use', kind, isNew: true };
  }

  showItem(item) { this.view.subject = this.subjectFromItem(item); this.view.tab = 'lookup'; }
  showEntry(e) { this.view.subject = this.subjectFromEntry(e); this.view.tab = 'lookup'; }
  showKey(key) { this.view.subject = this.subjectForKey(key); this.view.tab = 'lookup'; }
  showLook(id) { this.view.subject = this.subjectForLook(id); this.view.tab = 'lookup'; }
  showNew(name, kind = 'spell') { this.view.subject = this.subjectNew(name, kind); }

  /** what a subject plays, through the API */
  answerFor(s) {
    if (!s) return null;
    const a = api();
    if (s.lookId && !s.keys.length) {
      const e = a.looks.get(s.lookId);
      return e ? { sentence: a.looks.sentence(e.original, { name: s.name }), look: e.look, original: e.original, source: e.source, key: null, why: `A look with no ability of its own yet (${SOURCE_TAG[e.source]}).` } : { sentence: 'Nothing plays yet.', why: '' };
    }
    const item = s.uuid ? fromUuidSync(s.uuid) : null;
    return a.sentenceFor(item ?? { name: s.name, keys: s.keys, pointer: s.pointer ?? null }, s.on, { hasPlace: s.hasPlace });
  }
  answer() { return this.answerFor(this.view.subject); }

  // -------------------------------------------------------------------------------------------
  // rendering
  // -------------------------------------------------------------------------------------------
  async _prepareContext() { if (!this.entries) this.refresh(); return {}; }

  async _renderHTML() {
    const t = this.view.tab;
    const tab = (id, label) => `<button type="button" role="tab" aria-selected="${t === id}" data-act="tab" data-tab="${id}">${label}</button>`;
    return `<div class="fx-wrap">
      <header><p>Every ability on your sheets gets a look. Look one up, create one, ship the corpus.</p></header>
      <div class="tabs" role="tablist">${TABS.map(([id, label]) => tab(id, label)).join('')}</div>
      <section class="pane" data-pane="lookup" data-active="${t === 'lookup'}">${this.renderLookup()}</section>
      <section class="pane" data-pane="create" data-active="${t === 'create'}">${t === 'create' ? renderCreate(this) : ''}</section>
      <section class="pane" data-pane="custom" data-active="${t === 'custom'}">${t === 'custom' ? this.renderCustom() : ''}</section>
      <section class="pane" data-pane="corpus" data-active="${t === 'corpus'}">${t === 'corpus' ? renderCorpus(this) : ''}</section>
      <section class="pane" data-pane="check" data-active="${t === 'check'}">${t === 'check' ? this.renderCheck() : ''}</section>
      <div class="toast" data-on="false"></div>
    </div>`;
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  async _onRender() {
    if (this._bound) return;
    this._bound = true;
    const root = this.element;
    root.addEventListener('click', (ev) => this.onClick(ev));
    root.addEventListener('input', (ev) => this.onInput(ev));
    root.addEventListener('change', (ev) => this.onChange(ev));
    root.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  toast(msg) {
    const t = this.element?.querySelector('.toast');
    if (!t) return;
    t.textContent = msg;
    t.dataset.on = 'true';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.dataset.on = 'false'; }, 3200);
  }

  // ---- Look up -------------------------------------------------------------------------------
  renderLookup() {
    const s = this.view.subject;
    const sheets = this.sheets.map((n) => `<button type="button" class="pill" aria-pressed="${this.view.sheet === n}" data-act="sheet" data-sheet="${esc(n)}">${esc(n.split(' ')[0])}</button>`).join('');
    const more = this.census.actors.length > this.sheets.length ? `<button type="button" class="pill quiet" data-act="every-actor">${this.view.everyActor ? 'the party only' : 'every actor…'}</button>` : '';
    const others = this.view.everyActor ? this.census.actors.filter((r) => r.type !== 'character').map((r) => `<button type="button" class="pill" aria-pressed="${this.view.sheet === r.name}" data-act="sheet" data-sheet="${esc(r.name)}">${esc(r.name)}</button>`).join('') : '';
    return `<div class="stack">
      <div class="search"><input type="search" class="fx-q" placeholder="Type an ability… Fire Bolt, Goldthorn, Second Wind" aria-label="Look up an ability" autocomplete="off" value="${esc(s?.name ?? '')}"><div class="suggest" data-open="false"></div></div>
      <div class="card"><div class="pills"><span class="lbl">or pick a sheet:</span>${sheets}${more}</div>${others ? `<div class="pills others">${others}</div>` : ''}
        <div class="abilities">${this.renderAbilities()}</div></div>
      ${s ? `<div class="card result">${this.renderResult()}</div>` : ''}
    </div>`;
  }

  renderAbilities() {
    const name = this.view.sheet;
    if (!name) return `<span class="note">Pick a sheet to see every ability on it, coloured by what plays: ${dot('baseline')} imported · ${dot('custom')} custom · ${dot('none')} nothing yet · ${dot('off')} switched off.</span>`;
    const row = this.census.actors.find((r) => r.name === name);
    if (!row) return '';
    const items = row.items.map((it) => `<button type="button" class="pill" data-act="entry" data-uuid="${esc(it.uuid)}">${dot(statusOf(it))}${esc(it.name)}</button>`).join('');
    const effects = row.effects.map((ef, i) => `<button type="button" class="pill" data-act="effect" data-actor="${esc(row.name)}" data-i="${i}">${dot(statusOf(ef))}${esc(ef.name)} <span class="note">effect</span></button>`).join('');
    return items + effects || '<span class="note">Nothing on this sheet can be given a look.</span>';
  }

  renderResult() {
    const a = api();
    const s = this.view.subject;
    const r = this.answer();
    const status = r.off ? 'off' : r.look ? (r.source === 'baseline' ? 'baseline' : 'custom') : 'none';
    const owners = s.keys.length ? this.entries.filter((e) => e.uuid && e.keys[0] === s.keys[0]).map((e) => e.owner) : [];
    const where = s.owner ? `On ${esc(s.owner)}’s sheet` : owners.length ? `On ${esc([...new Set(owners)].join(', '))}’s sheet` : s.isNew ? 'Not on any sheet yet' : 'Not on a party sheet';
    const kindLine = s.keys.length ? ` · ${esc(keyWords(s.keys.find((k) => !k.includes('/')) ?? s.keys[0]))}` : '';
    const kinds = s.isNew ? ` · <span class="pills inline"><span class="lbl">it is</span>${Object.entries(KIND_WORDS).map(([k, w]) => `<button type="button" class="pill" aria-pressed="${s.kind === k}" data-act="new-kind" data-kind="${k}">${w}</button>`).join('')}</span>` : '';
    const id = r.original?.id;
    const underneath = id && a.looks.get(id)?.source === 'world' && (a.corpora.house.some((h) => h.id === id) || a.corpora.baseline.some((b) => b.id === id));
    const canRemove = (r.source === 'world' || r.off && r.source === 'world') || (s.pointer && r.key === 'this item');
    const bound = r.original?.to ? ` <span class="tag bound">bound for ${esc(a.corpus.words[r.original.to])}</span>` : '';
    return `<h2>${esc(s.name)}<span class="status">${dot(status)}${STATUS_WORDS[status]}</span></h2>
      <div class="owner">${where}${kindLine}${kinds}</div>
      <p class="sentence">${esc(r.sentence)}</p>
      <p class="why">${esc(r.why ?? '')}${r.original ? ` <span class="note">${esc(provenance(r.original))}</span>` : ''}${bound}</p>
      <div class="actions">
        ${r.look ? '<button type="button" class="primary" data-act="preview">Preview on the map</button>' : ''}
        <button type="button" ${r.look ? '' : 'class="primary"'} data-act="${r.look ? 'create-from' : 'create-new'}">${r.look ? 'Create a look from this' : 'Give it a look'}</button>
        ${r.look && s.keys.length ? '<button type="button" class="quiet" data-act="silence">Play nothing</button>' : ''}
        ${canRemove ? `<button type="button" class="quiet" data-act="remove">${underneath || s.pointer ? 'Back to the look it had' : 'Remove this look'}</button>` : ''}
      </div>`;
  }

  /** the looks and starters that match a few letters, for a Start-from box */
  likeHits(q) {
    const a = api();
    const needle = q.trim().toLowerCase();
    const starters = [...a.index.starters.values()].map((st) => ({ id: st.id, words: `${idWords(st.id)} — ${st.note ?? ''}`, tag: 'starter' }));
    const looks = a.looks.list().filter((e) => !e.look.off).map((e) => ({ id: e.look.id, words: idWords(e.look.id), tag: SOURCE_TAG[e.source], keys: (e.look.for ?? []).map(keyWords).join(', ') }));
    if (!needle) return [...starters, ...looks.slice(0, 12)];
    return [...starters, ...looks].filter((h) => h.words.toLowerCase().includes(needle) || (h.keys ?? '').toLowerCase().includes(needle)).slice(0, 12);
  }

  // ---- Custom looks ---------------------------------------------------------------------------
  renderCustom() {
    const a = api();
    const q = this.view.customQuery.trim().toLowerCase();
    const list = a.looks.list().filter((e) => e.source !== 'baseline');
    // written here first, newest first: by date, then by the order they were written (the buffer appends)
    const order = new Map(a.looks.buffer().map((l, i) => [l.id, i]));
    list.sort((x, y) => (x.source === 'world' ? 0 : 1) - (y.source === 'world' ? 0 : 1) || String(y.original.at ?? '').localeCompare(String(x.original.at ?? '')) || (order.get(y.look.id) ?? -1) - (order.get(x.look.id) ?? -1));
    const rows = list.map((e) => {
      const name = e.look.for?.[0] ? idWords(parseKey(e.look.for[0])?.id) : undefined;
      const sentence = a.looks.sentence(e.original, { name });
      const keys = (e.look.for ?? []).map(keyWords).join(', ');
      return { e, sentence, keys, text: `${e.look.id} ${keys} ${sentence} ${e.original.by ?? ''}`.toLowerCase() };
    }).filter((r) => !q || r.text.includes(q));
    const tagOf = (e) => (e.source !== 'world' ? '<span class="tag">house corpus</span>' : e.original.to ? `<span class="tag bound">bound for ${esc(a.corpus.words[e.original.to])}</span>` : '<span class="tag yours">draft in this world</span>');
    const body = rows.slice(0, 300).map(({ e, sentence, keys }) => `<div class="row">
        <span class="n">${esc(idWords(e.look.id))}${keys ? ` <span class="note">· ${esc(keys)}</span>` : ' <span class="note">· one item’s own look</span>'}</span>
        <span class="b">${tagOf(e)}<button type="button" class="quiet" data-act="edit-look" data-id="${esc(e.look.id)}">Edit</button>${e.source === 'world' ? `<button type="button" class="quiet" data-act="remove-look" data-id="${esc(e.look.id)}">Remove</button>` : ''}</span>
        <span class="s">${esc(sentence)}${e.original.by || e.original.note ? ` <span class="note">— ${esc(provenance(e.original))}</span>` : ''}</span></div>`).join('');
    const { drafts, bound } = a.corpus.pending();
    const note = drafts.length + bound.length
      ? `${drafts.length + bound.length} look${drafts.length + bound.length === 1 ? '' : 's'} written in this world${bound.length ? `, ${bound.length} bound for a corpus and waiting on the Corpus tab to ship` : ''}.`
      : 'Nothing is written in this world beyond what the corpus holds. Create a look to add one.';
    return `<div class="stack">
      <input type="search" class="fx-cq" placeholder="Search custom looks…" aria-label="Search custom looks" value="${esc(this.view.customQuery)}">
      <p class="note">${esc(note)}</p>
      <div class="card list"><div class="sub">${rows.length} custom look${rows.length === 1 ? '' : 's'}${q ? ' matching' : ''} · written here first, newest first</div>${body || '<p class="note">No custom looks yet. Create one.</p>'}${rows.length > 300 ? '<p class="note">Showing 300. Search to narrow.</p>' : ''}</div>
    </div>`;
  }

  // ---- Check ----------------------------------------------------------------------------------
  renderCheck() {
    const a = api();
    const rows = this.sheetRows();
    let imported = 0, custom = 0, none = 0, off = 0;
    const gaps = [];
    for (const r of rows) {
      for (const it of r.items) {
        const st = statusOf(it);
        if (st === 'baseline') imported++; else if (st === 'custom') custom++; else if (st === 'off') off++; else { none++; gaps.push({ ...it, owner: r.name }); }
      }
    }
    const { drafts, bound } = a.corpus.pending();
    const problems = a.index.problems ?? [];
    const tiles = [['good', imported, 'abilities on the sheets play an imported look'], ['', custom, 'have a custom look'], [none ? 'warn' : 'good', none, 'play nothing yet'], ['', off, 'switched off on purpose'], [problems.length ? 'bad' : '', problems.length, 'looks that do not read'], [bound.length ? 'warn' : '', drafts.length + bound.length, `written in this world${bound.length ? ` · ${bound.length} not yet shipped` : ''}`]];
    const byOwner = new Map();
    for (const g of gaps) (byOwner.get(g.owner) ?? byOwner.set(g.owner, []).get(g.owner)).push(g);
    const gapsHtml = [...byOwner.entries()].map(([owner, list]) => `<div class="sub">${esc(owner)} · ${list.length}</div><div class="abilities">${list.map((g) => `<button type="button" class="pill" data-act="entry" data-uuid="${esc(g.uuid)}" data-create="1">${dot('none')}${esc(g.name)}</button>`).join('')}</div>`).join('');
    const recent = a.ledger.slice(0, 15).map((e) => `<div class="row"><span class="n">${esc(e.subject ?? '?')} <span class="note">· ${esc(e.when)}</span></span><span class="b"><span class="tag">${e.look ? esc(idWords(e.look)) : 'nothing'}</span></span><span class="s">${e.look ? esc(`${e.played ? 'played' : 'built, not played'} · ${SOURCE_TAG[e.source] ?? e.source}`) : esc(e.why ?? '')}${e.missing?.length ? ` <span class="bad">· missing: ${esc(e.missing.join('; '))}</span>` : ''}</span></div>`).join('');
    const books = this.view.books;
    return `<div class="stack">
      <div class="tiles">${tiles.map(([c, n, l]) => `<div class="tile ${c}"><div class="num">${n}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>
      <div class="card"><div class="sub">Nothing plays yet${this.view.everyActor ? ' · every actor' : ' · the party'}</div>
        ${gaps.length ? `<p class="note">Click one to give it a look, or leave it silent on purpose.</p>${gapsHtml}` : '<p class="note">Every ability on these sheets plays something.</p>'}
        <p class="note"><button type="button" class="quiet" data-act="every-actor">${this.view.everyActor ? 'Show the party only' : 'Show every actor'}</button></p></div>
      ${problems.length ? `<div class="card"><div class="sub">Looks that do not read</div>${problems.map((p) => `<p class="bad">${esc(p)}</p>`).join('')}</div>` : ''}
      <div class="card"><div class="sub">The books</div>${books ? this.renderBooks(books) : '<p class="note">See how much of the Player’s Handbook plays. It reads every spell, feat and piece of equipment in the book once, which takes a few seconds.</p><button type="button" data-act="books">Check the books</button>'}</div>
      <div class="card list"><div class="sub">What played last</div>${recent || '<p class="note">Nothing has played since the world loaded.</p>'}</div>
    </div>`;
  }

  renderBooks(books) {
    return books.map((b) => `<div class="sub">${esc(b.name)} · ${b.answered} of ${b.asked} play</div>${b.nothing.length ? `<div class="abilities">${b.nothing.slice(0, 200).map((n) => `<button type="button" class="pill" data-act="key" data-key="${esc(n.key)}">${dot('none')}${esc(n.name)}</button>`).join('')}${b.nothing.length > 200 ? `<span class="note">and ${b.nothing.length - 200} more</span>` : ''}</div>` : '<p class="note">Everything in it plays.</p>'}`).join('');
  }

  async checkBooks() {
    const a = api();
    const packs = game.packs.filter((p) => p.documentName === 'Item' && /^dnd-players-handbook\.(spells|feats|equipment)/.test(p.collection));
    const out = [];
    for (const p of packs) {
      const docs = await p.getDocuments();
      const row = { name: p.title ?? p.collection, asked: 0, answered: 0, nothing: [] };
      for (const d of docs) {
        if (!['spell', 'feat', 'weapon', 'consumable', 'equipment', 'tool'].includes(d.type)) continue;
        const acts = d.system?.activities?.contents ?? [];
        if (!acts.length && d.type !== 'weapon') continue;
        const hasPlace = acts.some((x) => x?.target?.template?.type);
        const r = a.resolve(a.subjects.ofItem(d, { activity: acts[0] ?? null }), 'use', { hasPlace });
        row.asked++;
        if (r.look) row.answered++;
        else row.nothing.push({ name: d.name, key: r.subject?.keys?.find((k) => !k.includes('/')) ?? r.subject?.keys?.[0] });
      }
      out.push(row);
    }
    this.view.books = out;
  }

  // -------------------------------------------------------------------------------------------
  // events
  // -------------------------------------------------------------------------------------------
  async onClick(ev) {
    const b = ev.target.closest('[data-act]');
    if (!b || !this.element.contains(b)) { if (!ev.target.closest('.search')) this.element.querySelectorAll('.suggest').forEach((x) => { x.dataset.open = 'false'; }); return undefined; }
    const act = b.dataset.act;
    if (act.startsWith('cw-')) return onCreateClick(this, b, act);
    if (act.startsWith('co-')) return onCorpusClick(this, b, act);
    const S = this.view;
    switch (act) {
      case 'tab': S.tab = b.dataset.tab; return this.render();
      case 'sheet': S.sheet = S.sheet === b.dataset.sheet ? null : b.dataset.sheet; return this.render();
      case 'every-actor': S.everyActor = !S.everyActor; return this.render();
      case 'entry': { const item = fromUuidSync(b.dataset.uuid); if (!item) return undefined; if (b.dataset.create) startWalk(this, { subject: this.subjectFromItem(item) }); else this.showItem(item); return this.render(); }
      case 'effect': { const row = this.census.actors.find((r) => r.name === b.dataset.actor); const ef = row?.effects[Number(b.dataset.i)]; if (!ef) return undefined; this.showEntry({ name: ef.name, keys: ef.keys, owner: row.name, on: 'effect' }); return this.render(); }
      case 'key': startWalk(this, { subject: this.subjectForKey(b.dataset.key) }); return this.render();
      case 'hit': { const e = this.entries[Number(b.dataset.i)]; if (e) this.showEntry(e); return this.render(); }
      case 'new': this.showNew(b.dataset.name); return this.render();
      case 'new-kind': this.showNew(S.subject.name, b.dataset.kind); return this.render();
      case 'create-new': startWalk(this, { subject: S.subject }); return this.render();
      case 'create-from': { const r = this.answer(); startWalk(this, { subject: S.subject, from: r?.original?.id ?? null }); return this.render(); }
      case 'preview': return this.preview(this.answer()?.original, S.subject);
      case 'silence': return this.silence();
      case 'remove': return this.removeCurrent();
      case 'edit-look': startWalk(this, { lookId: b.dataset.id }); return this.render();
      case 'remove-look': return this.removeLook(b.dataset.id);
      case 'books': b.disabled = true; b.textContent = 'Reading the books…'; await this.checkBooks(); return this.render();
      default: return undefined;
    }
  }

  onInput(ev) {
    const el = ev.target;
    if (el.className.includes('cw-')) return onCreateInput(this, el);
    if (el.className.includes('co-')) return onCorpusInput(this, el);
    if (el.classList.contains('fx-q')) return this.suggest(el);
    if (el.classList.contains('fx-cq')) {
      this.view.customQuery = el.value;
      clearTimeout(this._cqTimer);
      this._cqTimer = setTimeout(() => {
        const pane = this.element.querySelector('[data-pane="custom"]');
        if (!pane) return;
        pane.innerHTML = this.renderCustom();
        const q = pane.querySelector('.fx-cq');
        q?.focus();
        q?.setSelectionRange(q.value.length, q.value.length);
      }, 250);
    }
    return undefined;
  }

  onChange(ev) {
    const el = ev.target;
    if (el.className.includes('cw-')) return onCreateChange(this, el);
    if (el.className.includes('co-')) return onCorpusChange(this, el);
    return undefined;
  }

  onKey(ev) {
    const el = ev.target;
    if (ev.key === 'Escape') { this.element.querySelectorAll('.suggest').forEach((x) => { x.dataset.open = 'false'; }); return; }
    if (el.className.includes('cw-') && onCreateKey(this, ev)) return;
    if (ev.key !== 'Enter') return;
    if (el.classList.contains('fx-q')) {
      ev.preventDefault();
      const q = el.value.trim();
      if (!q) return;
      const hits = this.searchHits(q);
      const exact = hits.find((h) => h.e.name.toLowerCase() === q.toLowerCase()) ?? hits[0];
      if (exact) this.showEntry(exact.e); else this.showNew(q);
      this.render();
    }
  }

  searchHits(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out = [];
    this.entries.forEach((e, i) => { if (e.name.toLowerCase().includes(needle)) out.push({ e, i }); });
    out.sort((x, y) => (x.e.owner ? 0 : 1) - (y.e.owner ? 0 : 1) || (x.e.actorType === 'character' ? 0 : 1) - (y.e.actorType === 'character' ? 0 : 1) || x.e.name.localeCompare(y.e.name));
    const seen = new Set();
    return out.filter(({ e }) => { const k = `${e.name}|${e.owner ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
  }

  suggest(input) {
    const box = input.parentElement.querySelector('.suggest');
    const q = input.value.trim();
    if (!q) { box.dataset.open = 'false'; return; }
    const hits = this.searchHits(q);
    box.innerHTML = hits.map(({ e, i }) => `<div class="hit" data-act="hit" data-i="${i}"><span>${dot(e.status)}${esc(e.name)}${e.effect ? ' <span class="note">effect</span>' : ''}</span><span class="o">${esc(e.owner ?? 'in the corpus')}</span></div>`).join('')
      + `<div class="hit" data-act="new" data-name="${esc(q)}"><span class="o">${hits.length ? 'Not one of these? ' : 'Nothing called that on a sheet. '}Give a new ability called “${esc(q)}” a look.</span></div>`;
    box.dataset.open = 'true';
  }

  // -------------------------------------------------------------------------------------------
  // doing things: preview, silence, remove (saving is the walk's, ui/create.js)
  // -------------------------------------------------------------------------------------------
  /** the token the picture plays from: the selected token, else the owner's token on this scene */
  sourceToken(subject) {
    const controlled = canvas.tokens?.controlled?.[0];
    if (controlled) return controlled;
    const actor = subject?.actor ?? (subject?.owner ? game.actors.getName(subject.owner) : null);
    return actor?.getActiveTokens?.()[0] ?? null;
  }

  async preview(look, subject = this.view.subject) {
    if (!look) return this.toast('Nothing to preview.');
    const a = api();
    const source = this.sourceToken(subject);
    if (!source) return this.toast('Select a token on the map first (the picture plays from it).');
    const targets = Array.from(game.user.targets);
    const place = subject?.hasPlace ? (canvas.scene?.regions?.contents?.slice(-1)[0] ?? null) : null;
    const r = await a.preview(look, { source, targets, place, on: subject?.on ?? null });
    if (!r.ok) return this.toast(r.problems.join(' '));
    if (r.entry?.played) return this.toast(`Playing on ${source.name}${targets.length ? ` at ${targets.map((t) => t.name).join(', ')}` : ''}.`);
    if (/destination/.test(r.entry?.why ?? '')) return this.toast('Click the spot on the map it should go to.');
    if (subject?.hasPlace && !place) return this.toast('This look plays on a placed template: place one on the map, then preview.');
    return this.toast(r.entry?.why ? `Nothing played: ${r.entry.why}` : 'Nothing played.');
  }

  async silence() {
    const a = api();
    const s = this.view.subject;
    const key = s.keys.find((k) => !k.includes('/')) ?? s.keys[0];
    const p = parseKey(key);
    const id = p?.id ?? slug(s.name);
    const existing = a.looks.get(id);
    const taken = existing && !(existing.original?.for ?? []).includes(key);
    const look = { id: taken ? `${p?.kind ?? 'look'}-${id}` : id, for: existing && !taken ? [...new Set([...(existing.original?.for ?? []), key])] : [key], off: true, note: `switched off for ${s.name}` };
    const r = await a.looks.save(look, { by: game.user.name });
    if (!r.ok) return this.toast(r.problems.join(' '));
    this.refresh();
    await this.render();
    return this.toast(`${s.name} now plays nothing.`);
  }

  async removeCurrent() {
    const a = api();
    const s = this.view.subject;
    const r = this.answer();
    const id = r?.original?.id ?? (r?.off ? a.looks.buffer().find((l) => l.off && (l.for ?? []).some((k) => s.keys.includes(k)))?.id : null);
    const item = s.uuid ? fromUuidSync(s.uuid) : null;
    if (item && s.pointer) await item.unsetFlag(MODULE_ID, 'look');
    if (id && a.looks.get(id)?.source === 'world') await a.looks.remove(id);
    this.refresh();
    if (item) this.showItem(item);
    await this.render();
    return this.toast(`${s.name} is back to the look it had.`);
  }

  async removeLook(id) {
    const a = api();
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Remove this look?' }, content: `<p>${esc(idWords(id))} goes back to the look it had before it was written here, or to nothing.</p>`, rejectClose: false });
    if (!ok) return undefined;
    await a.looks.remove(id);
    this.refresh();
    await this.render();
    return this.toast(`${idWords(id)} removed.`);
  }
}

// an open window follows the corpus: a look saved through the API from elsewhere (a macro, an assistant) shows at once
Hooks.on('fxstudio.rebuilt', () => { const app = Studio.current; if (app?.rendered) { app.refresh(); app.render(); } });
