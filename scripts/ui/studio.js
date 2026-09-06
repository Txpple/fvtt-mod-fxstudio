// FX Studio — the screens (ARCHITECTURE §7, the first door), built on the API and nothing else:
// Look up (what plays for an ability and why), Change the look (a starter or an existing look,
// its colours, a sound, a size; previewed; saved to the world buffer with provenance), Custom looks
// (the house first, newest first, who wrote each) and Check (what plays nothing, per sheet and per
// book; what did not resolve; the buffer against the house file). Every sentence on these screens
// is generated from a look by core/looks.js; nothing is parsed back. One window, three tabs and
// the editor inside the first, plain DOM: ApplicationV2 with its own _renderHTML, no template engine.
import { MODULE_ID } from '../settings.js';
import { keyWords, parseKey, slug } from '../core/subjects.js';
import { pathWords, provenance } from '../core/looks.js';
import { SOURCE_TAG, STATUS_WORDS, colourWords, dot, esc, idWords, statusOf, swatch } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;
const KIND_WORDS = { spell: 'a spell', weapon: 'a weapon', feature: 'a feature', item: 'an item', effect: 'an effect' };
const SCALES = [[0.5, 'half size'], [0.75, 'a little smaller'], [1, 'as it comes'], [1.5, 'a little bigger'], [2, 'twice the size']];

const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2 ?? class { constructor() {} render() {} };

export class Studio extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'fxstudio',
    classes: ['fxstudio'],
    window: { title: 'FX Studio', icon: 'fa-solid fa-wand-sparkles', resizable: true, contentClasses: ['fxstudio-content'] },
    position: { width: 840, height: 780 },
  };

  /** the one open window, so the sheet button and the API reuse it */
  static current = null;

  constructor(options = {}) {
    super(options);
    this.view = { tab: 'lookup', sheet: null, subject: null, editor: null, customQuery: '', books: null, everyActor: false };
    this._bound = false;
  }

  /** open the window at a tab, on an item, on a key, or on a look id */
  static open({ tab = null, item = null, id = null, key = null } = {}) {
    const app = Studio.current ?? (Studio.current = new Studio());
    if (!app.entries) app.refresh();
    if (tab) app.view.tab = tab;
    if (item) app.showItem(item);
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
  // subjects: what the result card is about
  // -------------------------------------------------------------------------------------------
  showItem(item) {
    const a = api();
    const acts = item.system?.activities?.contents ?? [];
    const hasPlace = acts.some((x) => x?.target?.template?.type);
    const subject = a.subjects.ofItem(item, { activity: acts[0] ?? null });
    this.view.subject = { name: item.name, keys: subject.keys, pointer: subject.pointer ?? null, uuid: item.uuid, owner: item.actor?.name ?? null, actor: item.actor ?? null, hasPlace, on: 'use', kind: subject.kind };
    this.view.editor = null;
    this.view.tab = 'lookup';
  }
  showEntry(e) {
    if (e.uuid) { const item = fromUuidSync(e.uuid); if (item) { this.showItem(item); return; } }
    this.view.subject = { name: e.name, keys: e.keys, owner: e.owner, hasPlace: !!e.hasPlace, on: e.on ?? 'use', kind: parseKey(e.keys[0])?.kind ?? 'spell' };
    this.view.editor = null;
    this.view.tab = 'lookup';
  }
  showKey(key) {
    const p = parseKey(key);
    const e = this.entries?.find((x) => x.keys.includes(key));
    if (e) { this.showEntry(e); return; }
    this.view.subject = { name: idWords(p?.id ?? key), keys: [key], owner: null, hasPlace: false, on: p?.kind === 'effect' ? 'effect' : 'use', kind: p?.kind ?? 'spell' };
    this.view.editor = null;
    this.view.tab = 'lookup';
  }
  showLook(id) {
    const entry = api().looks.get(id);
    const key = entry?.look?.for?.[0];
    if (key) this.showKey(key);
    else this.view.subject = { name: idWords(id), keys: [], owner: null, hasPlace: false, on: entry?.look?.on ?? 'use', kind: 'spell', lookId: id };
    this.view.editor = null;
    this.view.tab = 'lookup';
  }
  /** a name typed that is on no sheet: a new ability, keyed by its name as the kind the user picks */
  showNew(name, kind = 'spell') {
    const id = slug(name);
    this.view.subject = { name, keys: [`${kind}:${id}`], owner: null, hasPlace: false, on: kind === 'effect' ? 'effect' : 'use', kind, isNew: true };
    this.view.editor = null;
  }

  /** what the current subject plays, through the API */
  answer() {
    const s = this.view.subject;
    if (!s) return null;
    const a = api();
    if (s.lookId && !s.keys.length) {
      const e = a.looks.get(s.lookId);
      return e ? { sentence: a.looks.sentence(e.original, { name: s.name }), look: e.look, original: e.original, source: e.source, key: null, why: `A look with no ability of its own yet (${SOURCE_TAG[e.source]}).` } : { sentence: 'Nothing plays yet.', why: '' };
    }
    const item = s.uuid ? fromUuidSync(s.uuid) : null;
    return a.sentenceFor(item ?? { name: s.name, keys: s.keys, pointer: s.pointer ?? null }, s.on, { hasPlace: s.hasPlace });
  }

  // -------------------------------------------------------------------------------------------
  // rendering
  // -------------------------------------------------------------------------------------------
  async _prepareContext() { if (!this.entries) this.refresh(); return {}; }

  async _renderHTML() {
    const t = this.view.tab;
    const tab = (id, label) => `<button type="button" role="tab" aria-selected="${t === id}" data-act="tab" data-tab="${id}">${label}</button>`;
    return `<div class="fx-wrap">
      <header><p>Every ability on your sheets gets a look. Look one up, change it if you like.</p></header>
      <div class="tabs" role="tablist">${tab('lookup', 'Look up')}${tab('custom', 'Custom looks')}${tab('check', 'Check')}</div>
      <section class="pane" data-pane="lookup" data-active="${t === 'lookup'}">${this.renderLookup()}</section>
      <section class="pane" data-pane="custom" data-active="${t === 'custom'}">${t === 'custom' ? this.renderCustom() : ''}</section>
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
    return `<h2>${esc(s.name)}<span class="status">${dot(status)}${STATUS_WORDS[status]}</span></h2>
      <div class="owner">${where}${kindLine}${kinds}</div>
      <p class="sentence">${esc(r.sentence)}</p>
      <p class="why">${esc(r.why ?? '')}${r.original ? ` <span class="note">${esc(provenance(r.original))}</span>` : ''}</p>
      <div class="actions">
        ${r.look ? '<button type="button" class="primary" data-act="preview">Preview on the map</button>' : ''}
        <button type="button" ${r.look ? '' : 'class="primary"'} data-act="change">${r.look ? 'Change the look' : 'Give it a look'}</button>
        ${r.look && s.keys.length ? '<button type="button" class="quiet" data-act="silence">Play nothing</button>' : ''}
        ${canRemove ? `<button type="button" class="quiet" data-act="remove">${underneath || s.pointer ? 'Back to the look it had' : 'Remove this look'}</button>` : ''}
      </div>
      <div class="editor" data-open="${this.view.editor ? 'true' : 'false'}">${this.view.editor ? this.renderEditor() : ''}</div>`;
  }

  // ---- Change the look ------------------------------------------------------------------------
  openEditor() {
    const s = this.view.subject;
    const r = this.answer();
    const bare = s.keys.filter((k) => !k.includes('/'));
    const key = bare[0] ?? s.keys[0] ?? null;
    const like = r?.original && !r.original.off ? r.original.id : (s.kind === 'weapon' || s.kind === 'natural' ? 'starter:swing' : s.on === 'effect' ? 'starter:aura' : 'starter:bolt');
    this.view.editor = { like, colour: this.wornColour(like), sound: 'keep', soundPath: null, scale: 1, note: '', key, onlyThis: false };
  }

  /** the family of the first picture of a look (as expanded), and its colours */
  paletteOf(like) {
    const a = api();
    try {
      const base = a.looks.get(like)?.original ?? a.index.starters.get(like);
      if (!base || base.off) return { family: null, colours: [] };
      const expanded = a.looks.expand(base);
      const first = (expanded.scenes ?? []).find((sc) => sc.asset && sc.shape !== 'sound');
      if (!first) return { family: null, colours: [] };
      const res = a.assets.resolve(first.asset);
      if (!res.path) return { family: null, colours: [] };
      const family = a.assets.familyOf(res.path);
      return { family, colours: a.assets.colours(family), path: res.path };
    } catch { return { family: null, colours: [] }; }
  }
  wornColour(like) {
    const p = this.paletteOf(like);
    if (!p.path || !p.colours.length) return '';
    const last = p.path.split('.').pop();
    return p.colours.includes(last) ? last : '';
  }

  /** the look the editor describes, ready to validate, preview or save */
  draft() {
    const a = api();
    const s = this.view.subject;
    const ed = this.view.editor;
    const w = {};
    if (ed.colour) w.colour = ed.colour;
    if (ed.sound === 'none') w.sound = null; else if (ed.sound === 'path' && ed.soundPath) w.sound = ed.soundPath;
    if (ed.scale && ed.scale !== 1) w.scale = ed.scale;
    const p = parseKey(ed.key);
    const owner = s.actor?.name ?? s.owner ?? null;
    let id = ed.onlyThis ? `${p?.id ?? slug(s.name)}-${slug(owner ?? 'this')}` : (p?.id ?? slug(s.name));
    const existing = a.looks.get(id);
    const note = ed.note?.trim() || `like ${idWords(ed.like)}${w.colour ? ` but ${colourWords(w.colour)}` : ''}`;
    if (existing && ed.like === id) {
      // changing the look that already carries this id: replace it by id with a copy that has the changes applied, keeping every key it answered
      const expanded = a.looks.expand({ id: `${id}-draft`, like: ed.like, with: Object.keys(w).length ? w : undefined });
      const keys = ed.onlyThis ? [] : [...new Set([...(existing.original?.for ?? []), ed.key])];
      return { id, for: keys, on: expanded.on, scenes: expanded.scenes, note };
    }
    if (existing && !ed.onlyThis && !(existing.original?.for ?? []).includes(ed.key)) id = `${p?.kind ?? 'look'}-${id}`;
    const look = { id, for: ed.onlyThis ? [] : [ed.key], like: ed.like, note };
    if (Object.keys(w).length) look.with = w;
    const base = a.looks.get(ed.like)?.original ?? a.index.starters.get(ed.like);
    if (base?.on && base.on !== s.on) look.on = s.on;
    return look;
  }

  renderEditor() {
    const s = this.view.subject;
    const ed = this.view.editor;
    const bare = s.keys.filter((k) => !k.includes('/'));
    const palette = this.paletteOf(ed.like);
    const colours = palette.colours.length ? palette.colours.map((c) => `<option value="${esc(c)}"${c === ed.colour ? ' selected' : ''}>${esc(colourWords(c))}</option>`).join('') : '<option value="">(this one has no colour choices)</option>';
    const keys = bare.map((k) => `<button type="button" class="pill" aria-pressed="${ed.key === k}" data-act="ed-key" data-key="${esc(k)}">${esc(keyWords(k))}</button>`).join('');
    const only = s.uuid && s.owner ? `<button type="button" class="pill" aria-pressed="${ed.onlyThis}" data-act="ed-only">only this one, on ${esc(s.owner.split(' ')[0])}’s sheet</button>` : '';
    const scales = SCALES.map(([v, w]) => `<option value="${v}"${Number(ed.scale) === v ? ' selected' : ''}>${w}</option>`).join('');
    const soundWord = ed.soundPath ? esc(pathWords(ed.soundPath)) : 'another sound…';
    return `<h3>${this.answer()?.look ? `Change how ${esc(s.name)} looks` : `Give ${esc(s.name)} a look`}</h3>
      <div class="fields">
        <div class="field search"><label>Start from</label><input type="text" class="ed-like" value="${esc(this.likeWords(ed.like))}" placeholder="a look or a starter… Misty Step, a bolt" autocomplete="off"><div class="suggest" data-open="false"></div></div>
        <div class="field"><label class="colour-label">Colour ${swatch(ed.colour)}</label><select class="ed-colour" ${palette.colours.length ? '' : 'disabled'}>${palette.colours.length && !ed.colour ? '<option value="" selected>as it comes</option>' : ''}${colours}</select></div>
        <div class="field"><label>Sound</label><select class="ed-sound"><option value="keep"${ed.sound === 'keep' ? ' selected' : ''}>the sound it has</option><option value="none"${ed.sound === 'none' ? ' selected' : ''}>no sound</option><option value="path"${ed.sound === 'path' ? ' selected' : ''}>${soundWord}</option></select></div>
        <div class="field"><label>Size</label><select class="ed-scale">${scales}</select></div>
      </div>
      <div class="field search sound-search" data-open="${ed.sound === 'path' ? 'true' : 'false'}"><label>Find a sound</label><input type="text" class="ed-sound-q" placeholder="fire, sword, heal, teleport…" autocomplete="off"><div class="suggest" data-open="false"></div></div>
      ${bare.length > 1 || only ? `<div class="pills"><span class="lbl">answers</span>${keys}${only}</div>` : ''}
      <div class="field"><label>Why (a note for whoever reads this later)</label><input type="text" class="ed-note" value="${esc(ed.note)}" placeholder="${esc(`like ${idWords(ed.like)}${ed.colour ? ` but ${colourWords(ed.colour)}` : ''}`)}"></div>
      <div class="preview">${this.renderDraftSentence()}</div>
      <div class="actions"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="preview-draft">Preview on the map</button><button type="button" class="quiet" data-act="cancel">Cancel</button></div>`;
  }

  likeWords(id) {
    if (!id) return '';
    if (id.startsWith('starter:')) { const st = api().index.starters.get(id); return st?.note ? `${idWords(id)} — ${st.note}` : idWords(id); }
    return idWords(id);
  }

  renderDraftSentence() {
    const a = api();
    try {
      const look = this.draft();
      const problems = a.looks.validate(look);
      if (problems.length) return `<span class="bad">${esc(problems[0])}</span>`;
      return `<b>${esc(a.looks.sentence(look, { name: this.view.subject.name }))}</b>`;
    } catch (e) { return `<span class="bad">${esc(e.message)}</span>`; }
  }

  refreshDraftSentence() { const p = this.element?.querySelector('.editor .preview'); if (p) p.innerHTML = this.renderDraftSentence(); }

  /** the looks and starters that match a few letters, for the Start-from box */
  likeHits(q) {
    const a = api();
    const needle = q.trim().toLowerCase();
    const starters = [...a.index.starters.values()].map((st) => ({ id: st.id, words: `${idWords(st.id)} — ${st.note ?? ''}`, tag: 'starter' }));
    if (!needle) return starters;
    const looks = a.looks.list().filter((e) => !e.look.off).map((e) => ({ id: e.look.id, words: idWords(e.look.id), tag: SOURCE_TAG[e.source], keys: (e.look.for ?? []).map(keyWords).join(', ') }));
    return [...starters, ...looks].filter((h) => h.words.toLowerCase().includes(needle) || (h.keys ?? '').toLowerCase().includes(needle)).slice(0, 12);
  }

  // ---- Custom looks ---------------------------------------------------------------------------
  renderCustom() {
    const a = api();
    const q = this.view.customQuery.trim().toLowerCase();
    const list = a.looks.list().filter((e) => e.source !== 'baseline');
    list.sort((x, y) => (x.source === 'world' ? 0 : 1) - (y.source === 'world' ? 0 : 1) || String(y.original.at ?? '').localeCompare(String(x.original.at ?? '')));
    const rows = list.map((e) => {
      const name = e.look.for?.[0] ? idWords(parseKey(e.look.for[0])?.id) : undefined;
      const sentence = a.looks.sentence(e.original, { name });
      const keys = (e.look.for ?? []).map(keyWords).join(', ');
      return { e, sentence, keys, text: `${e.look.id} ${keys} ${sentence} ${e.original.by ?? ''}`.toLowerCase() };
    }).filter((r) => !q || r.text.includes(q));
    const exported = new Set(a.looks.exported().map((l) => l.id));
    const body = rows.slice(0, 300).map(({ e, sentence, keys }) => `<div class="row">
        <span class="n">${esc(idWords(e.look.id))}${keys ? ` <span class="note">· ${esc(keys)}</span>` : ' <span class="note">· one item’s own look</span>'}</span>
        <span class="b"><span class="tag ${e.source === 'world' ? 'yours' : ''}">${e.source === 'world' ? (exported.has(e.look.id) ? 'written here · in the house file' : 'written here') : 'house file'}</span><button type="button" class="quiet" data-act="edit-look" data-id="${esc(e.look.id)}">Edit</button>${e.source === 'world' ? `<button type="button" class="quiet" data-act="remove-look" data-id="${esc(e.look.id)}">Remove</button>` : ''}</span>
        <span class="s">${esc(sentence)}${e.original.by || e.original.note ? ` <span class="note">— ${esc(provenance(e.original))}</span>` : ''}</span></div>`).join('');
    const written = a.looks.buffer().length;
    const note = written
      ? `${written} look${written === 1 ? '' : 's'} written in this world${exported.size ? `, ${exported.size} already folded into the house file` : ''}. The export tool folds them into the house file so the repo keeps them.`
      : 'Nothing has been written in this world yet. Looks written here are kept in the world until the export tool folds them into the house file.';
    return `<div class="stack">
      <input type="search" class="fx-cq" placeholder="Search custom looks…" aria-label="Search custom looks" value="${esc(this.view.customQuery)}">
      <p class="note">${esc(note)}</p>
      <div class="card list"><div class="sub">${rows.length} custom look${rows.length === 1 ? '' : 's'}${q ? ' matching' : ''} · written here first, newest first</div>${body || '<p class="note">No custom looks yet. Look an ability up and give it one.</p>'}${rows.length > 300 ? '<p class="note">Showing 300. Search to narrow.</p>' : ''}</div>
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
    const buffer = a.looks.buffer().length;
    const exported = a.looks.exported().length;
    const problems = a.index.problems ?? [];
    const tiles = [['good', imported, 'abilities on the sheets play an imported look'], ['', custom, 'have a custom look'], [none ? 'warn' : 'good', none, 'play nothing yet'], ['', off, 'switched off on purpose'], [problems.length ? 'bad' : '', problems.length, 'looks that do not read'], ['', buffer, `written in this world${exported ? ` · ${exported} in the house file` : ''}`]];
    const byOwner = new Map();
    for (const g of gaps) (byOwner.get(g.owner) ?? byOwner.set(g.owner, []).get(g.owner)).push(g);
    const gapsHtml = [...byOwner.entries()].map(([owner, list]) => `<div class="sub">${esc(owner)} · ${list.length}</div><div class="abilities">${list.map((g) => `<button type="button" class="pill" data-act="entry" data-uuid="${esc(g.uuid)}" data-edit="1">${dot('none')}${esc(g.name)}</button>`).join('')}</div>`).join('');
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
      <div class="card"><div class="sub">The house file</div><p class="note">${buffer ? `${buffer} look${buffer === 1 ? '' : 's'} written in this world. From the repo, the export tool (tools/export-looks.mjs --write) shows each as a sentence and folds them into the house file.${exported ? ` ${exported} of them ${exported === 1 ? 'is' : 'are'} already there and can be cleared from this world.` : ''}` : 'Nothing written in this world is waiting for the export.'}</p>${exported ? '<button type="button" data-act="clear-exported">Clear what the house file already holds</button>' : ''}</div>
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
    const S = this.view;
    switch (act) {
      case 'tab': S.tab = b.dataset.tab; return this.render();
      case 'sheet': S.sheet = S.sheet === b.dataset.sheet ? null : b.dataset.sheet; return this.render();
      case 'every-actor': S.everyActor = !S.everyActor; return this.render();
      case 'entry': { const item = fromUuidSync(b.dataset.uuid); if (!item) return undefined; this.showItem(item); if (b.dataset.edit) this.openEditor(); return this.render(); }
      case 'effect': { const row = this.census.actors.find((r) => r.name === b.dataset.actor); const ef = row?.effects[Number(b.dataset.i)]; if (!ef) return undefined; this.showEntry({ name: ef.name, keys: ef.keys, owner: row.name, on: 'effect' }); return this.render(); }
      case 'key': this.showKey(b.dataset.key); this.openEditor(); return this.render();
      case 'hit': { const e = this.entries[Number(b.dataset.i)]; if (e) this.showEntry(e); return this.render(); }
      case 'new': this.showNew(b.dataset.name); return this.render();
      case 'new-kind': this.showNew(S.subject.name, b.dataset.kind); return this.render();
      case 'change': this.openEditor(); await this.render(); this.element.querySelector('.editor')?.scrollIntoView?.({ block: 'nearest' }); return undefined;
      case 'cancel': S.editor = null; return this.render();
      case 'preview': return this.preview(this.answer()?.original);
      case 'preview-draft': { try { return await this.preview(this.draft()); } catch (e) { return this.toast(e.message); } }
      case 'save': return this.save();
      case 'silence': return this.silence();
      case 'remove': return this.removeCurrent();
      case 'ed-key': S.editor.key = b.dataset.key; return this.render();
      case 'ed-only': S.editor.onlyThis = !S.editor.onlyThis; return this.render();
      case 'like-hit': { S.editor.like = b.dataset.id; S.editor.colour = this.wornColour(S.editor.like); return this.render(); }
      case 'sound-hit': { S.editor.sound = 'path'; S.editor.soundPath = b.dataset.path; return this.render(); }
      case 'edit-look': this.showLook(b.dataset.id); this.openEditor(); return this.render();
      case 'remove-look': return this.removeLook(b.dataset.id);
      case 'books': b.disabled = true; b.textContent = 'Reading the books…'; await this.checkBooks(); return this.render();
      case 'clear-exported': { const r = await api().looks.clearExported(); this.refresh(); await this.render(); return this.toast(`${r.cleared} look${r.cleared === 1 ? '' : 's'} cleared; the house file holds ${r.cleared === 1 ? 'it' : 'them'}.`); }
      default: return undefined;
    }
  }

  onInput(ev) {
    const el = ev.target;
    if (el.classList.contains('fx-q')) return this.suggest(el);
    if (el.classList.contains('ed-like')) return this.suggestLike(el);
    if (el.classList.contains('ed-sound-q')) return this.suggestSound(el);
    if (el.classList.contains('ed-note') && this.view.editor) { this.view.editor.note = el.value; return undefined; }
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
    const ed = this.view.editor;
    if (!ed) return;
    if (el.classList.contains('ed-colour')) { ed.colour = el.value; const lbl = this.element.querySelector('.editor .colour-label'); if (lbl) lbl.innerHTML = `Colour ${swatch(ed.colour)}`; this.refreshDraftSentence(); }
    if (el.classList.contains('ed-sound')) { ed.sound = el.value; const box = this.element.querySelector('.sound-search'); if (box) box.dataset.open = ed.sound === 'path' ? 'true' : 'false'; if (ed.sound === 'path') box?.querySelector('input')?.focus(); this.refreshDraftSentence(); }
    if (el.classList.contains('ed-scale')) { ed.scale = Number(el.value); this.refreshDraftSentence(); }
  }

  onKey(ev) {
    const el = ev.target;
    if (ev.key === 'Escape') { this.element.querySelectorAll('.suggest').forEach((x) => { x.dataset.open = 'false'; }); return; }
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
    if (el.classList.contains('ed-like')) {
      ev.preventDefault();
      const hit = this.likeHits(el.value)[0];
      if (hit) { this.view.editor.like = hit.id; this.view.editor.colour = this.wornColour(hit.id); this.render(); }
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

  suggestLike(input) {
    const box = input.parentElement.querySelector('.suggest');
    const hits = this.likeHits(input.value);
    box.innerHTML = hits.map((h) => `<div class="hit" data-act="like-hit" data-id="${esc(h.id)}"><span>${esc(h.words)}${h.keys ? ` <span class="note">· ${esc(h.keys.slice(0, 60))}</span>` : ''}</span><span class="o">${esc(h.tag)}</span></div>`).join('') || '<div class="hit"><span class="o">No look or starter called that.</span></div>';
    box.dataset.open = 'true';
  }

  suggestSound(input) {
    const box = input.parentElement.querySelector('.suggest');
    const q = input.value.trim();
    if (q.length < 2) { box.dataset.open = 'false'; return; }
    const hits = api().assets.search(q, { roots: ['psfx'], limit: 30 });
    box.innerHTML = hits.map((h) => `<div class="hit" data-act="sound-hit" data-path="${esc(h.path)}"><span>${esc(pathWords(h.path))}</span><span class="o">${h.colours.length ? `one of ${h.colours.length}` : 'sound'}</span></div>`).join('') || '<div class="hit"><span class="o">No sound with that in its name.</span></div>';
    box.dataset.open = 'true';
  }

  // -------------------------------------------------------------------------------------------
  // doing things: preview, save, silence, remove
  // -------------------------------------------------------------------------------------------
  /** the token the picture plays from: the selected token, else the owner's token on this scene */
  sourceToken() {
    const controlled = canvas.tokens?.controlled?.[0];
    if (controlled) return controlled;
    const actor = this.view.subject?.actor ?? (this.view.subject?.owner ? game.actors.getName(this.view.subject.owner) : null);
    return actor?.getActiveTokens?.()[0] ?? null;
  }

  async preview(look) {
    if (!look) return this.toast('Nothing to preview.');
    const a = api();
    const source = this.sourceToken();
    if (!source) return this.toast('Select a token on the map first (the picture plays from it).');
    const targets = Array.from(game.user.targets);
    const place = this.view.subject?.hasPlace ? (canvas.scene?.regions?.contents?.slice(-1)[0] ?? null) : null;
    const r = await a.preview(look, { source, targets, place, on: this.view.subject?.on ?? null });
    if (!r.ok) return this.toast(r.problems.join(' '));
    if (r.entry?.played) return this.toast(`Playing on ${source.name}${targets.length ? ` at ${targets.map((t) => t.name).join(', ')}` : ''}.`);
    if (/destination/.test(r.entry?.why ?? '')) return this.toast('Click the spot on the map it should go to.');
    if (this.view.subject?.hasPlace && !place) return this.toast('This look plays on a placed template: place one on the map, then preview.');
    return this.toast(r.entry?.why ? `Nothing played: ${r.entry.why}` : 'Nothing played.');
  }

  async save() {
    const a = api();
    let look;
    try { look = this.draft(); } catch (e) { return this.toast(e.message); }
    const ed = this.view.editor;
    const s = this.view.subject;
    const r = await a.looks.save(look, { by: game.user.name });
    if (!r.ok) return this.toast(r.problems.join(' '));
    const item = s.uuid ? fromUuidSync(s.uuid) : null;
    if (ed.onlyThis && item) await item.setFlag(MODULE_ID, 'look', look.id);
    else if (item && s.pointer && !ed.onlyThis) await item.unsetFlag(MODULE_ID, 'look');
    this.view.editor = null;
    this.refresh();
    if (item) this.showItem(item);
    await this.render();
    return this.toast(`Saved. ${s.name} now has its own look.`);
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
