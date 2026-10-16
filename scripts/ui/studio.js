// FX Studio — the screens (ARCHITECTURE §7, the first door), built on the API and nothing else.
// FOUR TABS: Library (every FX in one list, grouped House → Stock, ui/fxtab.js), Editor (the FX sheet,
// ui/sheet.js — where every edit of an FX is made), Assets (ui/library.js, a browser) and Coverage
// (ui/coverage.js: what has an FX and what does not).
// THE SHEET IS THE EDITOR TAB. It has its own place in the strip, it is reachable with nothing open
// (it says so), and LEAVING IT DOES NOT CLOSE IT: walk off to Assets and back and the FX is still
// there, unsaved changes and all. Only what would REPLACE the sheet — opening another FX into it —
// asks before dropping them.
//
// THE RENDER MODEL. One window, plain DOM: ApplicationV2 with its own _renderHTML, no template
// engine. Nothing is replaced wholesale: a render lays the new HTML over the old nodes (ui/morph.js),
// so focus, the caret, a half-typed number and every scroll survive it, and most changes do not
// render the window at all — a pane paints itself, and the sheet paints only the parts a change
// touched (ui/sheet.js paintSheet). The toast lives on the window's frame, outside every render.
//
// THE EVENTS are routed by what an element says it is, never by its class: a click by its data-act,
// a box or a switch by its data-field, each to the pane it sits in. The acts that open another FX
// into the sheet (REPLACES) ask first when the sheet holds unsaved changes, whichever pane they are
// in.
import { MODULE_ID } from '../settings.js';
import { keyLabel, parseKey } from '../core/subjects.js';
import { SOURCE_TAG, STATUS_WORDS, idWords, statusOf } from './html.js';
import { asked, closeSuggest, leaveSheet, markClamped, onSheetChange, onSheetClick, onSheetInput, onSheetKey, openSheet, reloadSheet, renderSheet, sheetDirty } from './sheet.js';
import * as corpus from './corpus.js';
import * as coverage from './coverage.js';
import { narrowList, onFxClick, onFxInput, onFxKey, renderFx } from './fxtab.js';
import { nameForKey, nameOf, readRecords, recordsRead } from './records.js';
import { onLibraryChange, onLibraryClick, onLibraryInput, renderLibrary } from './library.js';
import { morph } from './morph.js';

const api = () => game.modules.get(MODULE_ID).api;
const TABS = [['fx', 'Library'], ['editor', 'Editor'], ['assets', 'Assets'], ['coverage', 'Coverage']];
/** the acts that open a DIFFERENT FX into the sheet, and so must ask before dropping unsaved changes */
const REPLACES = new Set(['entry', 'key', 'fx-editor', 'lib-open-fx', 'sh-new']);
/** the tabs an older build had, so a macro, a bridge or an old call still lands where it meant to */
const WAS = { stock: 'fx', house: 'fx', lookup: 'fx', library: 'assets', audit: 'coverage' };

const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2 ?? class { constructor() {} render() {} };

/** each pane's handlers; Coverage's and Corpus's are read off their modules, so either may add a handler without touching this file */
const PANES = {
  fx: { render: renderFx, click: onFxClick, input: onFxInput, key: onFxKey },
  editor: { render: renderSheet, click: onSheetClick, input: onSheetInput, change: onSheetChange, key: onSheetKey },
  assets: { render: renderLibrary, click: onLibraryClick, input: onLibraryInput, change: onLibraryChange },
  coverage: {
    render: (app) => coverage.renderCoverage(app),
    click: (app, b, act) => (act.startsWith('co-') && corpus.onCorpusClick ? corpus.onCorpusClick(app, b, act) : coverage.onCoverageClick?.(app, b, act)),
    input: (app, el, field) => coverage.onCoverageInput?.(app, el, field),
    change: (app, el, field) => coverage.onCoverageChange?.(app, el, field),
    key: (app, ev, field) => coverage.onCoverageKey?.(app, ev, field),
  },
};

export class Studio extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'fxstudio',
    classes: ['fxstudio'],
    window: { title: 'FX Studio', icon: 'fa-solid fa-wand-sparkles', resizable: true, contentClasses: ['fxstudio-content'] },
    // the window opens at the width the screens were ruled at; narrower, the layout follows the window's own width
    position: { width: 1080, height: 800 },
  };

  /** the one open window, so the sheet button and the API reuse it */
  static current = null;

  constructor(options = {}) {
    super(options);
    this.view = { tab: 'fx', subject: null, fxSel: null, q: '' };
    this.sheet = null;
    this._bound = false;
    // THE RECORDS ARE READ WHEN THE WINDOW OPENS, not at boot (ui/records.js): nothing but the screens
    // reads them, and they are the biggest file the module ships. The rows waiting on them repaint
    // once, here, when they arrive. Foundry builds this window itself from the settings menu, so the
    // constructor is the one place every way in passes through.
    if (!recordsRead()) readRecords().then(() => { this._catalogue = null; if (this.rendered) this.paint(); });
  }

  /**
   * Open the window at a tab, on an item, on a key, or on an FX id; tab 'editor' opens the sheet on
   * it (unlocked when `edit`; `from`: an FX whose scenes a new FX for the key starts with; `via`: the
   * door a GM came through, for the landing's words). A dirty sheet is asked about before another FX
   * replaces it.
   */
  static open(opts = {}) {
    const app = Studio.current ?? (Studio.current = new Studio());
    if (!app.entries) app.refresh();
    const replaces = (opts.tab === 'editor' || WAS[opts.tab] === 'editor') && !!(opts.item || opts.id || opts.key);
    if (replaces && sheetDirty(app)) {
      app.render({ force: true });
      leaveSheet(app).then((ok) => { if (ok) { app.land(opts); app.paint(); } });
      return app;
    }
    app.land(opts);
    app.render({ force: true });
    if (app.rendered) app.bringToFront?.();
    return app;
  }

  /** where an open() lands: the tab, and the sheet or the Library's search on what was asked for */
  land({ tab = null, item = null, id = null, key = null, edit = false, from = null, via = null } = {}) {
    const want = tab ? (WAS[tab] ?? tab) : null;
    if (want) this.view.tab = want;
    if (want === 'editor') {
      if (item) this.openFor(this.subjectFromItem(item), { edit, via, from });
      else if (id) openSheet(this, { id, edit });
      else if (key) this.openFor(this.subjectForKey(key), { edit, via, from });
      else if (!this.sheet) openSheet(this, {});
    } else if (item) this.showItem(item);
    else if (key) this.showKey(key);
    else if (id) this.showFx(id);
  }

  /**
   * ONE WINDOW, whoever builds it. The settings menu constructs a fresh Studio on every click
   * (Foundry does `new menu.type()`), never through open(); a second instance under the same id
   * would stand beside the first. So a Studio that is not the open one hands the render to the open
   * one, which comes to the front (a forced render does), and the spare is dropped.
   */
  render(options, _options) {
    const live = Studio.current;
    if (live && live !== this) return live.render(options, _options);
    Studio.current = this;
    return super.render(options, _options);
  }

  async close(options) {
    if (sheetDirty(this) && !(await leaveSheet(this))) return this;
    Studio.current = null;
    return super.close(options);
  }

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
    for (const { fx, source } of a.fx.list()) {
      for (const key of fx.for ?? []) {
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ name: keyLabel(key), key, keys: [key], on: fx.on ?? 'use', owner: null, status: fx.off ? 'off' : (source === 'stock' ? 'stock' : 'custom'), corpus: true });
      }
    }
    this.entries = entries;
    this._shelf = null;
    // the Library reads every FX once per rebuild, not once per keystroke
    this._catalogue = null;
    this._broken = null;
    // an FX deleted for good cannot stay marked in the list
    if (this.view.fxSel && !a.fx.get(this.view.fxSel)) this.view.fxSel = null;
  }

  // -------------------------------------------------------------------------------------------
  // subjects: what a door or a walk is about — {name, keys, uuid, owner, actor, hasPlace, on, kind}
  // -------------------------------------------------------------------------------------------
  /** an item, on an actor or in the sidebar: a world item has no owner, and is an item all the same */
  subjectFromItem(item) {
    const a = api();
    const acts = item.system?.activities?.contents ?? [];
    const hasPlace = acts.some((x) => x?.target?.template?.type);
    const subject = a.subjects.ofItem(item, { activity: acts[0] ?? null });
    return { name: item.name, keys: subject.keys, uuid: item.uuid, owner: item.actor?.name ?? null, actor: item.actor ?? null, hasPlace, on: 'use', kind: subject.kind };
  }
  subjectFromEntry(e) {
    if (e.uuid) { const item = fromUuidSync(e.uuid); if (item) return this.subjectFromItem(item); }
    // a key the corpus knows and no sheet holds is called by its record's name (§15)
    const name = e.corpus ? nameForKey(e.keys[0]) : e.name;
    return { name, keys: e.keys, owner: e.owner, hasPlace: !!e.hasPlace, on: e.on ?? 'use', kind: parseKey(e.keys[0])?.kind ?? 'spell' };
  }
  subjectForKey(key) {
    const p = parseKey(key);
    const e = this.entries?.find((x) => x.keys.includes(key));
    if (e) return this.subjectFromEntry(e);
    return { name: nameForKey(key), keys: [key], owner: null, hasPlace: false, on: p?.kind === 'effect' ? 'effect' : p?.kind === 'event' ? p.id : 'use', kind: p?.kind ?? 'spell' };
  }
  subjectForFx(id) {
    const entry = api().fx.get(id);
    const key = entry?.fx?.for?.[0];
    // an event FX is named for itself (Summon Appears), since no record or item names its key
    if (key && parseKey(key)?.kind === 'event') return { ...this.subjectForKey(key), name: idWords(id) };
    if (key) return this.subjectForKey(key);
    return { name: idWords(id), keys: [], owner: null, hasPlace: false, on: entry?.fx?.on ?? 'use', kind: 'spell', fxId: id };
  }

  /**
   * The sheet for what a subject plays: the FX that answers it, or a new one for it — the landing,
   * "Nothing plays for …" with its three doors, or (with `from`) a new FX holding that FX's scenes.
   */
  openFor(subject, { edit = false, via = null, from = null } = {}) {
    const r = this.answerFor(subject);
    const id = r?.original?.id ?? null;
    if (id) {
      openSheet(this, { id, subject, edit });
      if (from) setTimeout(() => this.toast(`${subject.name} already has an FX: it is open here.`), 0);
      return this.sheet;
    }
    return openSheet(this, { subject, edit: true, via, from });
  }

  /**
   * The search answered: the subject, the FX that answers it marked in the list, and the box carrying
   * what was asked (so the list is narrowed to it too). Picking a row is not an ask — it must not move
   * the list out from under the click — so showFx passes ask: false.
   */
  show(subject, { ask = true } = {}) {
    this.view.subject = subject;
    this.view.fxSel = this.answerFor(subject)?.original?.id ?? null;
    if (ask && subject?.name) this.view.q = subject.name;
    this.view.tab = 'fx';
  }
  showItem(item) { this.show(this.subjectFromItem(item)); }
  showKey(key) { this.show(this.subjectForKey(key)); }
  showFx(id) { this.show(this.subjectForFx(id), { ask: false }); this.view.fxSel = id; }

  /** what a subject plays, through the API */
  answerFor(s) {
    if (!s) return null;
    const a = api();
    if (s.fxId && !s.keys.length) {
      const e = a.fx.get(s.fxId);
      return e ? { sentence: a.fx.sentence(e.original, { name: s.name }), fx: e.fx, original: e.original, source: e.source, key: null, why: `No key · ${SOURCE_TAG[e.source]}` } : { sentence: 'Nothing plays.', why: '' };
    }
    const item = s.uuid ? fromUuidSync(s.uuid) : null;
    return a.sentenceFor(item ?? { name: s.name, keys: s.keys }, s.on, { hasPlace: s.hasPlace });
  }
  answer() { return this.answerFor(this.view.subject); }

  // -------------------------------------------------------------------------------------------
  // rendering
  // -------------------------------------------------------------------------------------------
  async _prepareContext() { if (!this.entries) this.refresh(); return {}; }

  /** the window's content as HTML: the tab strip, and the active pane (the others stand empty) */
  body() {
    const t = this.view.tab;
    const tab = (id, label) => `<button type="button" role="tab" aria-selected="${t === id}" data-act="tab" data-tab="${id}">${label}</button>`;
    return `<div class="fx-wrap" data-tab="${t}">
      <div class="tabs" role="tablist">${TABS.map(([id, label]) => tab(id, label)).join('')}</div>
      ${TABS.map(([id]) => `<section class="pane" data-pane="${id}" data-active="${t === id}">${t === id ? PANES[id].render(this) : ''}</section>`).join('')}
    </div>`;
  }

  async _renderHTML() { return this.body(); }

  /** a render lays the new HTML over the old (ui/morph.js): nothing the person was doing is thrown away */
  _replaceHTML(result, content) { morph(content, result); }

  /** the content painted again in place, now, without the render cycle: a tab switch, a pane that changed under the sheet */
  paint() {
    const content = this.element?.querySelector('.window-content');
    if (!content) return this.render();
    morph(content, this.body());
    if (this.view.tab === 'editor') markClamped(this);
    return undefined;
  }

  /** popped out (Foundry 14): fill the new window at once and follow it as it is resized */
  async _onDetach(...args) {
    const r = await super._onDetach?.(...args);
    setTimeout(() => this.fitDetached(), 50);
    return r;
  }

  fitDetached() {
    const win = this.element?.ownerDocument?.defaultView;
    if (!win || win === window) return;
    const fit = () => { try { this.setPosition({ left: 0, top: 0, width: win.innerWidth, height: win.innerHeight }); } catch { /* the window is closing */ } };
    fit();
    if (!this._fitBound) { this._fitBound = true; win.addEventListener('resize', fit); }
  }

  async _onRender() {
    if (this.element?.ownerDocument !== document) this.fitDetached();
    // the sentence box's measure is the browser's: it is marked after the render
    if (this.view.tab === 'editor') markClamped(this);
    if (this._bound) return;
    this._bound = true;
    const root = this.element;
    root.addEventListener('click', (ev) => this.onClick(ev));
    root.addEventListener('dblclick', (ev) => this.onDblClick(ev));
    root.addEventListener('input', (ev) => this.onInput(ev));
    root.addEventListener('change', (ev) => this.onChange(ev));
    root.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  /**
   * One line of feedback, on the window's frame rather than in its content, so no render takes it
   * away. The node is made once and kept; a screen reader hears it as a status.
   */
  toast(msg) {
    const root = this.element;
    if (!root) return;
    let t = root.querySelector(':scope > .toast');
    if (!t) {
      t = root.ownerDocument.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      root.append(t);
    }
    t.textContent = msg;
    t.dataset.on = 'true';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.dataset.on = 'false'; }, 3200);
  }

  /** the FX and starters that match a few letters, for a Copy from box */
  likeHits(q) {
    const a = api();
    const needle = q.trim().toLowerCase();
    const starters = [...a.index.starters.values()].map((st) => ({ id: st.id, words: `${idWords(st.id)} — ${st.note ?? ''}`, tag: 'starter' }));
    const fx = a.fx.list().filter((e) => !e.fx.off && !e.shadowed).map((e) => ({ id: e.fx.id, words: idWords(e.fx.id), tag: SOURCE_TAG[e.source], keys: (e.fx.for ?? []).map(keyLabel).join(', ') }));
    if (!needle) return [...starters, ...fx.slice(0, 12)];
    return [...starters, ...fx].filter((h) => h.words.toLowerCase().includes(needle) || (h.keys ?? '').toLowerCase().includes(needle)).slice(0, 12);
  }

  /** one FX as a file on the local machine, in the recipe files' own shape; `source` names the layer (a Stock FX under a House override exports as itself) */
  exportFx(id, source = null) {
    const a = api();
    const e = a.fx.get(id, source);
    if (!e) return this.toast('Nothing to export.');
    const meta = { schema: 2, exported: new Date().toISOString().slice(0, 10), by: game.user.name, from: MODULE_ID };
    const text = JSON.stringify({ _meta: meta, fx: [e.original] }, null, 1);
    foundry.utils.saveDataToFile(text, 'application/json', `fx-${id}.json`);
    return this.toast(`Exported: ${idWords(id)}.`);
  }

  /** a file of FX read from the local machine into a corpus file: House (the default) or Stock */
  async importFx(to) {
    const a = api();
    to = to === 'stock' ? 'stock' : 'house';
    const file = await asked('prompt', {
      window: { title: `Import to ${SOURCE_TAG[to]}` },
      content: '<input type="file" name="file" accept=".json,application/json">',
      ok: { label: 'Import', callback: (ev, button) => button.form.elements.file?.files?.[0] ?? null },
      rejectClose: false, modal: true,
    });
    if (!file) return undefined;
    let j;
    try { j = JSON.parse(await foundry.utils.readTextFromFile(file)); } catch (e) { return this.toast(`Not an FX file: ${e.message}`); }
    const list = Array.isArray(j) ? j : Array.isArray(j.fx) ? j.fx : j.id ? [j] : [];
    if (!list.length) return this.toast('No FX in the file.');
    let saved = 0;
    const problems = [];
    this._writing = true;
    try {
      for (const fx of list) {
        const r = await a.fx.save(fx, { by: fx.by ?? game.user.name, to });
        if (!r.ok) { problems.push(`${fx.id ?? '?'}: ${r.problems.join('; ')}`); continue; }
        saved++;
      }
    } finally { this._writing = false; }
    this.refresh();
    // the Editor was on one of them: it reads the file as imported, unless it holds unsaved changes
    const open = this.sheet?.id && list.some((fx) => fx.id === this.sheet.id) ? this.sheet.id : null;
    const kept = open && sheetDirty(this) ? ` The Editor keeps its unsaved changes to ${idWords(open)}.` : '';
    if (open && !kept) reloadSheet(this);
    this.paint();
    return this.toast(`Imported ${saved} FX to ${SOURCE_TAG[to]}.${problems.length ? ` Skipped: ${problems.join(' · ')}` : ''}${kept}`);
  }

  /** delete an FX for good, out of the file of the layer named (else the winner); a House override deleted shows the Stock FX under it again */
  async deleteFx(id, source = null) {
    const a = api();
    const e = a.fx.get(id, source);
    if (!e) return undefined;
    const under = e.source === 'house' ? a.corpus.under(id) : null;
    const note = under ? ` The ${SOURCE_TAG[under]} FX of that id shows through again.` : e.shadowed ? ` The ${SOURCE_TAG.house} override stays and keeps playing.` : '';
    const dirty = this.sheet?.id === id && sheetDirty(this) ? ' The Editor\'s unsaved changes to it go too.' : '';
    // the confirm names what goes: the FX by its record's name, its key and its layer
    const name = e.original?.for?.[0] && parseKey(e.original.for[0])?.kind !== 'event' ? nameOf(e.original, idWords(id)) : idWords(id);
    const key = e.original?.for?.[0];
    const layer = SOURCE_TAG[e.source] ?? e.source;
    const ok = await asked('confirm', { window: { title: `Delete ${name} (${key ? `${key}, ` : ''}${layer})?` }, content: `<p>${layer} file. Deletes it permanently.${note}${dirty}</p>`, rejectClose: false, modal: true });
    if (!ok) return undefined;
    let r;
    this._writing = true;
    try { r = await a.corpus.erase(id, { from: e.source }); } catch (err) { return this.toast(`Could not delete it: ${err.message}`); } finally { this._writing = false; }
    this.refresh();
    if (this.view.subject && this.answer()?.original?.id === id) this.view.subject = { ...this.view.subject };
    // the Editor was on it: it reopens on what shows through, or closes when nothing does
    if (this.sheet?.id === id) reloadSheet(this);
    this.paint();
    return this.toast(`Deleted: ${name}${r.written.length ? ` (${r.written.map((f) => f.split('/').pop()).join(', ')})` : ''}.`);
  }

  // -------------------------------------------------------------------------------------------
  // events: a click by its data-act, a field by its data-field, each to the pane it sits in
  // -------------------------------------------------------------------------------------------
  /** double-clicking an FX row is the same door as its Editor link */
  async onDblClick(ev) {
    const b = ev.target.closest('[data-act="fx-sel"]');
    if (!b || !this.element.contains(b)) return undefined;
    if (sheetDirty(this) && !(await leaveSheet(this))) return undefined;
    const id = b.dataset.id;
    this.view.fxSel = id;
    this.view.fxSelSource = b.dataset.source || null;
    openSheet(this, { id, source: b.dataset.source || null, subject: this.subjectForFx(id) });
    return this.paint();
  }

  /** the suggestions under a search box close when the click lands elsewhere, or on Escape */
  closeSuggestions() {
    for (const x of this.element.querySelectorAll('.suggest[data-open="true"]')) x.dataset.open = 'false';
    if (this.sheet?.suggest) closeSuggest(this);
  }

  async onClick(ev) {
    const b = ev.target.closest('[data-act]');
    // a click outside every search box closes the suggestions; the act it lands on paints what it changes
    if (!ev.target.closest('.search')) {
      for (const x of this.element.querySelectorAll('.suggest[data-open="true"]')) x.dataset.open = 'false';
      if (this.sheet) this.sheet.suggest = null;
    }
    if (!b || !this.element.contains(b)) return undefined;
    // a disclosure's summary is an act of the sheet (its group, remembered per sheet): the browser does not toggle it too
    if (b.matches('summary')) ev.preventDefault();
    const act = b.dataset.act;
    const pane = b.closest('[data-pane]')?.dataset.pane ?? null;
    // the Editor is a tab: switching tabs, marking a row or searching all LEAVE the sheet where it is,
    // so only opening another FX into it asks before dropping unsaved changes
    const replaces = REPLACES.has(act) && !(act === 'entry' && !b.dataset.create);
    if (replaces && sheetDirty(this) && !(await leaveSheet(this))) return undefined;
    switch (act) {
      case 'tab': this.view.tab = b.dataset.tab; return this.paint();
      case 'entry': {
        const item = fromUuidSync(b.dataset.uuid);
        if (!item) return undefined;
        if (b.dataset.create) this.openFor(this.subjectFromItem(item), { edit: true, via: pane === 'coverage' ? 'coverage' : 'search' });
        else this.showItem(item);
        return this.paint();
      }
      // a key with nothing on a sheet (a book's ability, an effect): the same landing; with data-from, a new FX holding that FX's scenes
      case 'key': this.openFor(this.subjectForKey(b.dataset.key), { edit: true, via: pane === 'coverage' ? 'coverage' : 'search', from: b.dataset.from || null }); return this.paint();
      case 'import-fx': return this.importFx(b.dataset.to || null);
      default: return PANES[pane]?.click?.(this, b, act);
    }
  }

  /** the field an element is, and the pane it sits in */
  fieldOf(el) {
    const field = el?.dataset?.field;
    if (!field || !this.element.contains(el)) return null;
    return { field, pane: el.closest('[data-pane]')?.dataset.pane ?? null };
  }

  onInput(ev) {
    const f = this.fieldOf(ev.target);
    if (f) PANES[f.pane]?.input?.(this, ev.target, f.field);
  }

  onChange(ev) {
    const f = this.fieldOf(ev.target);
    if (f) PANES[f.pane]?.change?.(this, ev.target, f.field);
  }

  onKey(ev) {
    const el = ev.target;
    if (ev.key === 'Escape') { this.closeSuggestions(); return; }
    // a box that is a button (the sentence) answers Enter and Space as a button does
    if ((ev.key === 'Enter' || ev.key === ' ') && el.matches?.('[role="button"][data-act]')) { ev.preventDefault(); el.click(); return; }
    const f = this.fieldOf(el);
    if (f) PANES[f.pane]?.key?.(this, ev, f.field);
  }

  /** the Library's list alone, painted again (the search, Load more): its scroll and the box's caret stay */
  narrow() { narrowList(this); }

  /**
   * One row per ability: the corpus first (Stock, then this table's), then what sits on a sheet with
   * no FX yet. The sheet's Answers box and Find an item run on these.
   */
  searchHits(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out = [];
    this.entries.forEach((e, i) => { if (e.name.toLowerCase().includes(needle)) out.push({ e, i }); });
    const rank = (e) => (e.status === 'stock' ? 0 : e.status === 'custom' ? 1 : e.status === 'off' ? 2 : 3);
    out.sort((x, y) => rank(x.e) - rank(y.e) || x.e.name.localeCompare(y.e.name) || (x.e.actorType === 'character' ? 0 : 1) - (y.e.actorType === 'character' ? 0 : 1));
    const seen = new Set();
    return out.filter(({ e }) => { const k = `${e.keys.join('|')}|${e.status}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
  }

  /** the right-hand word on a suggestion: where the FX comes from, or whose sheet it waits on */
  hitWhere(e) {
    if (e.status === 'none' && e.owner) return `${e.owner} · ${STATUS_WORDS.none}`;
    return STATUS_WORDS[e.status] ?? '';
  }
}

/**
 * An open window follows the corpus: an FX saved through the API from elsewhere (a macro, an
 * assistant, another client) shows at once. The window's own writes are not news. The open sheet is
 * read again from the file — unless it holds unsaved changes, which are kept as they are.
 */
Hooks.on('fxstudio.rebuilt', () => {
  const app = Studio.current;
  if (!app?.rendered || app._writing) return;
  app.refresh();
  if (app.sheet?.id && !sheetDirty(app)) reloadSheet(app);
  app.paint();
});
