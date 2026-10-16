// Coverage — THE GAP TOOL'S SCREEN (DESIGN 28.6). What plays nothing, and WHY, over two scopes: MY
// ACTORS (the census the window already holds) and COMPENDIUMS (the books the records come from,
// read on Check). Every row says why it is there, from three sources:
//
//   the proposals   recipes/proposals.json (tools/proposals.mjs): a proposal waits (its basis, its
//                   sentence, the two fits), or the row was judged to need no FX, with its reason
//   the moment rule what the thing itself says when the file has no judgement for its key: a
//                   record with no activity, an effect that sits on its owner for good (DESIGN 25)
//   the ledger      an ability that HAS an FX whose last play played nothing, with the engine's own
//                   why and when
//
// Effects and natural attacks are rows beside the items. The books offered are the packs the
// records come from (the file's _meta, so LIST_PACKS and nothing else: no SRD 5.1, no world
// compendium), and Check reads the records of the picked packs and asks the API what answers each
// key — so with every pack picked the four tiles agree with tools/gaps.mjs to the number.
//
// Four tiles at permanent addresses (R1): Abilities · With FX · No FX · Errors, "—" before a book
// is read. One scroll region (R4): the rows; a pick, a filter, the search and Load more repaint the
// list in place and keep its scroll. Maintain is a disclosure in the corner (ui/corpus.js).
//
// THE DOORS. A row with a proposal opens the Editor with the basis copied in (data-act "key" with
// data-from, the basis FX's id); every other row keeps a door too, even one judged to need no FX:
// an item on an actor opens through "entry" with data-create, a record or an effect through "key".
// The acts are the window's own (ui/studio.js routes "entry", "key" and the "cv-" prefix).
import { MODULE_ID } from '../settings.js';
import { parseKey } from '../core/subjects.js';
import { assetsOf } from '../core/fx.js';
import { KIND_WORDS, dot, esc } from './html.js';
import { renderMaintain } from './corpus.js';
import { nameForKey, nameOf } from './records.js';

const api = () => game.modules.get(MODULE_ID).api;
const PAGE = 200;
/** the two scopes, at permanent addresses in that order */
const SCOPES = [['mine', 'My actors'], ['books', 'Compendiums']];
/** a key's kind as a tag (html.js names five; a natural attack is its own) */
const KIND_TAG = { ...KIND_WORDS, natural: 'Natural' };

/**
 * WHY A ROW IS THERE, a closed list: the bold word at the head of its line, and the filter that
 * shows or hides it. `off` is a key House switched off, shown under "no FX".
 */
export const ROW_WORDS = { proposal: 'Has a proposal', judged: 'No proposed FX', none: 'No FX', off: 'Switched off', ledger: 'Has an FX, played nothing' };
const FILTERS = [['none', 'no FX'], ['judged', 'no proposed FX'], ['proposal', 'has a proposal'], ['ledger', 'played nothing']];
const filterOf = (st) => (st === 'off' ? 'none' : st);

/** the tab's own state: the scope, the books picked and read, the filters, the search, how much is shown */
const cvState = (app) => (app.cvv ??= { scope: 'mine', picking: true, show: PAGE, books: null, chosen: new Set(), reading: false, shown: new Set(FILTERS.map(([k]) => k)), q: '', maint: false });

// -----------------------------------------------------------------------------------------------
// the row logic: pure over the API, so tools/check-coverage.mjs drives it offline on a stand-in
// -----------------------------------------------------------------------------------------------
/** the collection a record's uuid lives in: `<package>.<pack>`, or `world` for an item on this world's actor */
export const collectionOf = (uuid) => /^Compendium\.([^.]+\.[^.]+)\./.exec(uuid ?? '')?.[1] ?? 'world';

/** the moment word a key is resolved for: an effect's own, else use */
const wordOf = (key) => (parseKey(key)?.kind === 'effect' ? 'effect' : 'use');

/**
 * The moment rule read off the thing itself (DESIGN 25), for a key the file holds no judgement
 * for: an item with no activity never posts the card the reader plays on; an effect that sits on its
 * owner with no duration is always on. Null when something happens at the table.
 */
export function momentRule({ activities = null, effect = null } = {}) {
  if (effect) return effect.temporary ? null : effect.transfer ? 'always-on' : null;
  return activities === 0 ? 'no-activity' : null;
}

/** a proposal's sentence without the name it opens on ("Shield: the barrier snaps up." → "the barrier snaps up.") */
const bare = (s) => String(s ?? '').replace(/^[^:.]{1,48}:\s+/, '');

/**
 * Why a key no FX answers plays nothing: {st, words, note, from?, fromName?, reason?}. The file's
 * judgement first (the proposals), the moment rule second, else no row in the gap table yet.
 * `keys` are the subject's other keys, asked after its own (a wand's spell, an effect's origin).
 */
export function judge(a, own, { keys = [], activities = null, effect = null } = {}) {
  const reasons = a.proposals.reasons();
  const key = [own, ...keys].find((k) => k && a.proposals.get(k)) ?? own;
  const p = key ? a.proposals.get(key) : null;
  if (p?.status === 'proposed') {
    const basis = p.basis ? a.fx.get(p.basis) : null;
    return { st: 'proposal', key, words: bare(p.sentence), from: basis ? p.basis : null, fromName: basis ? nameOf(basis.fx) : null, note: [p.vfxFit, p.sfxFit].filter(Boolean).join(' · ') };
  }
  if (p?.status === 'none') return { st: 'judged', key, reason: p.reason, words: p.sentence || reasons[p.reason] || p.reason, note: reasons[p.reason] ?? '' };
  const rule = momentRule({ activities, effect });
  if (rule) return { st: 'judged', key: own, reason: rule, words: reasons[rule] ?? rule, note: 'the moment rule' };
  return { st: 'none', key: own, words: p?.status === 'open' ? 'no judgement in the gap table yet' : 'no row in the gap table yet', note: '' };
}

/** the newest ledger entry for any of these keys, or null (the ledger is newest first) */
export function lastPlay(a, keys) {
  for (const e of a.ledger ?? []) if ((e.keys ?? []).some((k) => keys.includes(k))) return e;
  return null;
}

/** an FX that answers and whose last play played nothing: the engine's why and when, or null */
function playedNothing(a, keys) {
  const e = lastPlay(a, keys);
  if (!e?.fx || e.played || !e.why) return null;
  const fx = a.fx.get(e.fx)?.fx;
  const at = new Date(e.at);
  const when = Number.isNaN(at.getTime()) ? '' : at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // the ticket a moment carries is an id, not a reason
  return { st: 'ledger', words: String(e.why).replace(/\s*\(ticket [^)]*\)/, ''), note: [when, fx ? nameOf(fx) : null].filter(Boolean).join(' · ') };
}

/**
 * MY ACTORS: per actor, every item (natural attacks among them, by their key's kind) and every
 * effect asked what answers; a row for each that plays nothing and each whose FX last played
 * nothing. Returns {groups: [{head, rows}], asked, answered, counts: {proposal, judged, none, off, ledger}, actors}.
 */
export function actorRows(a, census) {
  const out = { groups: [], asked: 0, answered: 0, counts: { proposal: 0, judged: 0, none: 0, off: 0, ledger: 0 }, actors: 0 };
  const actors = [...(census?.actors ?? [])].sort((x, y) => (x.type === 'character' ? 0 : 1) - (y.type === 'character' ? 0 : 1));
  for (const actor of actors) {
    out.actors++;
    const rows = [];
    let asked = 0;
    const add = (r) => { rows.push(r); out.counts[r.st]++; };
    for (const it of actor.items ?? []) {
      asked++;
      const own = it.keys?.at(-1) ?? null;
      const base = { name: it.name, owner: actor.name, kind: it.kind ?? parseKey(own)?.kind ?? null, key: own, uuid: it.uuid ?? null, item: true };
      if (it.fx) { out.answered++; const l = playedNothing(a, it.keys ?? []); if (l) add({ ...base, ...l }); continue; }
      if (it.off) { add({ ...base, st: 'off', words: 'switched off in House', note: '' }); continue; }
      add({ ...base, ...judge(a, own, { keys: (it.keys ?? []).slice(0, -1), activities: it.activities ?? null }) });
    }
    const seen = new Set();
    for (const ef of actor.effects ?? []) {
      const own = ef.keys?.[0] ?? null;
      if (!own || seen.has(own)) continue;
      seen.add(own);
      asked++;
      const base = { name: ef.name, owner: actor.name, kind: 'effect', key: own, item: false };
      if (ef.fx) { out.answered++; const l = playedNothing(a, ef.keys ?? []); if (l) add({ ...base, ...l }); continue; }
      if (ef.off) { add({ ...base, st: 'off', words: 'switched off in House', note: '' }); continue; }
      // an effect is judged by its own key alone: its origin's proposal is the origin's use, not the effect's
      add({ ...base, ...judge(a, own, { effect: { transfer: !!ef.transfer, temporary: !!ef.temporary } }) });
    }
    out.asked += asked;
    if (rows.length) out.groups.push({ head: `${actor.name} · ${rows.length} of ${asked}`, rows });
  }
  return out;
}

/**
 * COMPENDIUMS: the records of the picked packs, each key asked what answers it on its own word —
 * the very question tools/gaps.mjs asks of the same file, so with every pack picked the two agree
 * to the number. Returns the shape actorRows returns, grouped by pack in the file's order.
 */
export function bookRows(a, chosen) {
  const out = { groups: [], asked: 0, answered: 0, counts: { proposal: 0, judged: 0, none: 0, off: 0, ledger: 0 }, books: 0 };
  const packs = a.proposals.packs();
  const by = new Map(packs.filter((p) => chosen.has(p.id)).map((p) => [p.id, { p, asked: 0, answered: 0, rows: [] }]));
  for (const [key, rec] of Object.entries(a.records.map() ?? {})) {
    const g = by.get(collectionOf(rec.uuid));
    if (!g) continue;
    g.asked++;
    const kind = parseKey(key)?.kind ?? null;
    const name = nameForKey(key, rec.name);
    const owner = kind === 'effect' ? rec.name : rec.on ?? null;
    const base = { name, owner, kind, key, item: false };
    const r = a.resolve({ keys: [key] }, wordOf(key));
    if (r.fx) { g.answered++; const l = playedNothing(a, [key]); if (l) { g.rows.push({ ...base, ...l }); out.counts.ledger++; } continue; }
    if (r.off) { g.rows.push({ ...base, st: 'off', words: 'switched off in House', note: '' }); out.counts.off++; continue; }
    const j = judge(a, key);
    g.rows.push({ ...base, ...j });
    out.counts[j.st]++;
  }
  for (const g of by.values()) {
    out.books++;
    out.asked += g.asked;
    out.answered += g.answered;
    g.rows.sort((x, y) => x.name.localeCompare(y.name));
    if (g.rows.length) out.groups.push({ head: `${g.p.label} · ${g.answered} of ${g.asked} answered`, rows: g.rows });
  }
  return out;
}

// -----------------------------------------------------------------------------------------------
// what the tab is about now
// -----------------------------------------------------------------------------------------------
/** the rows of the scope on screen; null before a book is read (or before the gap table arrives) */
function viewRows(app) {
  const st = cvState(app);
  const a = api();
  if (!a.proposals.loaded) return null;
  if (st.scope === 'mine') return (app._cvMine ??= actorRows(a, app.census));
  return st.picking ? null : st.books;
}

/** the FX naming an asset the libraries do not have — the check tools/check-fx.mjs runs, on screen; cached until the corpus is read again */
function brokenIds(app) {
  if (app._broken) return app._broken;
  const a = api();
  const out = new Set();
  for (const { fx } of a.fx.list()) {
    if (fx.off) continue;
    for (const scene of fx.scenes ?? []) {
      if (assetsOf(scene).some(({ asset }) => !a.assets.exists(asset))) { out.add(fx.id); break; }
    }
  }
  app._broken = out;
  return out;
}

const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US'));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** the four numbers over the list, each with its line of what it is made of */
function tiles(app, v) {
  const st = cvState(app);
  const asked = v?.asked ?? null;
  const answered = v?.answered ?? null;
  const no = v ? asked - answered : null;
  const broken = brokenIds(app);
  const a = api();
  const scope = st.scope === 'mine' ? 'on your actors' : 'in the books read';
  const c = v?.counts;
  const subs = {
    asked: v ? (st.scope === 'mine' ? `on ${plural(v.actors, 'actor')}` : `in ${plural(v.books, 'book')}`) : 'pick the books, then Check',
    answered: c?.ledger ? `${c.ledger} played nothing last time` : '',
    no: c ? `${c.proposal} with a proposal · ${c.judged} judged · ${c.none + c.off} open` : '',
    broken: broken.size ? 'name an asset the libraries do not have' : 'every FX names an asset the libraries have',
  };
  const names = [...broken].map((id) => { const e = a.fx.get(id); return e ? nameOf(e.fx) : null; }).filter(Boolean);
  const cell = (cls, n, label, sub, why) => `<div class="tile ${cls}" data-tooltip="${esc(why)}"><div class="num">${num(n)}</div><div class="l">${esc(label)}</div><div class="sm">${esc(sub)}</div></div>`;
  return `<div class="tiles">
    ${cell('', asked, 'Abilities', subs.asked, `Abilities ${scope}: items, natural attacks and effects.`)}
    ${cell(answered ? 'good' : '', answered, 'With FX', subs.answered, `Abilities ${scope} that something answers.`)}
    ${cell(no ? 'warn' : no === 0 ? 'good' : '', no, 'No FX', subs.no, `Abilities ${scope} that play nothing, each a row below with why.`)}
    ${cell(broken.size ? 'bad' : 'good', broken.size, 'Errors', subs.broken, broken.size ? `${plural(broken.size, 'FX', 'FX')} name an asset the libraries do not have: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''}` : 'Every FX names an asset the libraries have.')}
  </div>`;
}

// -----------------------------------------------------------------------------------------------
// rendering
// -----------------------------------------------------------------------------------------------
/** the door a row carries: the proposal's, an item's, or a key's */
function doorOf(r) {
  const name = esc(r.name);
  if (r.st === 'proposal' && r.from) {
    return `<button type="button" data-act="key" data-key="${esc(r.key)}" data-from="${esc(r.from)}" data-tooltip="Opens the Editor on ${name} with ${esc(r.fromName ?? 'the basis')}'s scenes copied in, to adjust and Save.">Write it from the proposal</button>`;
  }
  const label = r.st === 'ledger' ? 'Editor' : r.st === 'judged' ? 'Write one anyway' : 'Write an FX';
  const why = r.st === 'ledger' ? `Opens the FX that answers ${name} in the Editor.` : r.st === 'judged' ? `The judgement stands unless you write one. Opens the Editor on ${name}.` : `Opens the Editor on ${name}: nothing plays for it yet.`;
  const cls = r.st === 'judged' ? ' class="quiet"' : '';
  if (r.item && r.uuid) return `<button type="button"${cls} data-act="entry" data-uuid="${esc(r.uuid)}" data-create="1" data-tooltip="${why}">${label}</button>`;
  return `<button type="button"${cls} data-act="key" data-key="${esc(r.key)}" data-tooltip="${why}">${label}</button>`;
}

const DOTS = { proposal: 'none', judged: 'judged', none: 'none', off: 'off', ledger: 'stock' };

/** one row: its name and kind, why it is here, and its door */
function rowHtml(r) {
  const from = r.st === 'proposal' && r.fromName ? ` · from ${r.fromName}` : '';
  const line = `${ROW_WORDS[r.st]}: ${r.words}${from}`;
  const who = r.owner && r.owner !== r.name ? `<span class="on">${esc(r.owner)}</span>` : '';
  return `<div class="cvrow" data-st="${r.st}">
    <span class="nm">${dot(DOTS[r.st])}<span class="n">${esc(r.name)}</span>${who}<span class="tag">${esc(KIND_TAG[r.kind] ?? 'Ability')}</span></span>
    <span class="why" data-tooltip="${esc(line + (r.note ? ` (${r.note})` : ''))}"><b>${esc(ROW_WORDS[r.st])}</b>: ${esc(r.words)}${esc(from)}${r.note ? `<span class="conf">${esc(r.note)}</span>` : ''}</span>
    <span class="door2">${doorOf(r)}</span>
  </div>`;
}

/** the rows the filters and the search let through, grouped */
function shownGroups(app, v) {
  const st = cvState(app);
  const needle = st.q.trim().toLowerCase();
  const pass = (r) => st.shown.has(filterOf(r.st)) && (!needle || `${r.name} ${r.owner ?? ''} ${r.words} ${r.fromName ?? ''}`.toLowerCase().includes(needle));
  return (v?.groups ?? []).map((g) => ({ head: g.head, rows: g.rows.filter(pass) })).filter((g) => g.rows.length);
}

/** the books to pick, grouped by the package that ships them: the packs the records come from, and no other */
function pickerHtml(app) {
  const st = cvState(app);
  const groups = new Map();
  for (const p of api().proposals.packs()) {
    const [pkg, ...rest] = p.label.split(' · ');
    (groups.get(pkg) ?? groups.set(pkg, []).get(pkg)).push({ ...p, short: rest.join(' · ') || p.label });
  }
  const all = api().proposals.packs().length;
  const body = [...groups.entries()].map(([pkg, list]) => `<div class="bk"><span class="pk">${esc(pkg)}</span><div class="pills">${list.map((p) => `<button type="button" class="pill" data-act="cv-book" data-book="${esc(p.id)}" aria-pressed="${st.chosen.has(p.id)}" data-tooltip="${esc(`${p.label}: ${p.keys} abilities, ${p.gaps} with no FX`)}">${esc(p.short)}<span class="c">${p.keys}</span></button>`).join('')}</div></div>`).join('');
  return `<div class="cvbooks">
    <div class="bkhead"><span class="sub">The books the records come from · ${st.chosen.size} of ${all} picked</span><button type="button" class="link" data-act="cv-all" data-tooltip="${st.chosen.size === all ? 'Picks none of the books.' : 'Picks every book: Check then agrees with the gap table to the number.'}">${st.chosen.size === all ? 'Pick none' : 'Pick all'}</button></div>
    ${body || '<p class="note">The gap table names no books.</p>'}
    <p class="note">SRD 5.1 is not offered: the records leave it out. A world's own compendiums are not books.</p>
  </div>`;
}

/** what the scope row and the list show, computed once per paint */
function viewOf(app) {
  const st = cvState(app);
  const a = api();
  const v = viewRows(app);
  const books = st.scope === 'books';
  const picking = books && (st.picking || !st.books);
  const groups = shownGroups(app, v);
  const total = groups.reduce((t, g) => t + g.rows.length, 0);
  // one flat run of heads and rows, cut at the page, so the count and the "+N more" agree
  const page = Math.min(st.show, total);
  let left = page;
  const body = groups.map((g) => {
    if (left <= 0) return '';
    const take = g.rows.slice(0, left);
    left -= take.length;
    return `<div class="grouphead">${esc(g.head)}</div>${take.map(rowHtml).join('')}`;
  }).join('');
  const more = total > page ? `<p class="note more"><button type="button" class="link" data-act="cv-more">Load more</button> · ${total - page} more</p>` : '';
  const empty = !a.proposals.loaded ? 'Reading the gap table…'
    : st.scope === 'mine' ? (v?.groups.length ? 'No row matches the filters and the search.' : 'Every ability on your actors has an FX that played.')
      : (v?.groups.length ? 'No row matches the filters and the search.' : 'Every ability in the books read has an FX.');
  const n = st.chosen.size;
  const c = v?.counts;
  const head = !a.proposals.loaded ? 'Reading the gap table…'
    : st.scope === 'mine' ? `${total} rows · ${plural(v?.actors ?? 0, 'actor')}${c ? ` · ${c.proposal + c.judged + c.none + c.off} with no FX, ${c.ledger} played nothing` : ''}`
      : picking ? `${n} picked${st.books ? ' · not read again yet' : ' · not read yet'}`
        : `${total} rows · ${plural(st.books.books, 'book')} read`;
  return { st, v, books, picking, n, head, body, more, empty };
}

function scopeHtml({ st, books, picking, n, head }) {
  const scope = SCOPES.map(([v, w]) => `<button type="button" data-act="cv-scope" data-scope="${v}" aria-pressed="${st.scope === v}">${w}</button>`).join('');
  const checkWhy = !books ? 'My actors is read from the world already.' : n ? 'Read the picked books and ask what plays for each ability, and why not.' : 'Pick a book first.';
  return `<div class="cvscope">
      <div class="segs">${scope}</div>
      <span class="note">${esc(head)}</span>
      <span class="spacer"></span>
      <button type="button" data-act="cv-pick" ${books && !picking ? '' : 'data-na="true" disabled'} data-tooltip="${books ? (picking ? 'The books are being picked below.' : 'Pick the books again.') : 'Books are picked in the Compendiums scope.'}">Books · ${n}</button>
      <button type="button" class="primary" data-act="cv-check" ${books && n && !st.reading ? '' : 'data-na="true" disabled'} data-tooltip="${checkWhy}">${st.reading ? 'Checking…' : `Check${n ? ` (${n})` : ''}`}</button>
    </div>`;
}

/** the filters (one per kind of row) and the search over the rows */
const filtersHtml = ({ st, picking }) => `<div class="cvfilt">${picking ? '' : `<span class="note">Show</span>${FILTERS.map(([k, w]) => `<button type="button" class="pill" data-act="cv-show" data-show="${k}" aria-pressed="${st.shown.has(k)}" data-tooltip="${st.shown.has(k) ? 'Hides' : 'Shows'} the rows that are ${w}.">${w}</button>`).join('')}`}</div>`;

const listHtml = (app, { picking, body, more, empty }) => `<div class="cvlist card">
      <div class="rows">${picking ? pickerHtml(app) : `${body || `<p class="note">${esc(empty)}</p>`}${more}`}</div>
    </div>`;

export function renderCoverage(app) {
  const a = api();
  const st = cvState(app);
  // the gap table is read when this tab first asks, never at boot; the tab paints again when it is here
  if (!a.proposals.loaded) a.proposals.read().then(() => { app._cvMine = null; if (app.view?.tab === 'coverage' && app.rendered) app.render(); });
  // My actors is asked again on every render of the tab (the census may be new, the ledger has grown);
  // a pick, a filter or the search repaints from what this render asked
  app._cvMine = null;
  bindSearch(app);
  const v = viewOf(app);
  return `<div class="coverage cv2">
    ${scopeHtml(v)}
    ${tiles(app, v.picking ? null : v.v)}
    <div class="cvbar">${filtersHtml(v)}<input type="search" class="cv-q" placeholder="Search the rows" aria-label="Search the rows" value="${esc(st.q)}" ${v.picking ? 'disabled data-na="true" data-tooltip="Check the books first: then their rows can be searched."' : ''}></div>
    ${listHtml(app, v)}
    <div class="cvfoot">${renderMaintain(app, { open: st.maint })}</div>
  </div>`;
}

/**
 * The scope row, the filters and the list redrawn in place, the rows keeping their scroll: a pick,
 * a filter, a letter typed or Load more must not throw you back to the top of what you were
 * reading (R4), the way the Library's narrow() keeps its list. The search box is never redrawn, so
 * the caret stays where it is.
 */
function repaint(app) {
  const pane = app.element?.querySelector('[data-pane="coverage"][data-active="true"]');
  if (!pane) return app.render();
  const v = viewOf(app);
  const top = pane.querySelector('.cvlist .rows')?.scrollTop ?? 0;
  const scope = pane.querySelector('.cvscope');
  if (scope) scope.outerHTML = scopeHtml(v);
  const filt = pane.querySelector('.cvfilt');
  if (filt) filt.outerHTML = filtersHtml(v);
  const list = pane.querySelector('.cvlist');
  if (list) list.outerHTML = listHtml(app, v);
  const again = pane.querySelector('.cvlist .rows');
  if (again) again.scrollTop = top;
  return undefined;
}

/**
 * The search box answers as it is typed in. The window routes clicks by prefix but types only into
 * its own boxes, so the tab listens for its box itself: once per window element, delegated.
 */
function bindSearch(app) {
  const root = app.element;
  if (!root) { setTimeout(() => { if (app.element) bindSearch(app); }, 0); return; }
  if (app._cvBound === root) return;
  app._cvBound = root;
  root.addEventListener('input', (ev) => {
    if (!ev.target?.classList?.contains('cv-q')) return;
    const st = cvState(app);
    st.q = ev.target.value;
    st.show = PAGE;
    clearTimeout(app._cvTimer);
    app._cvTimer = setTimeout(() => repaint(app), 200);
  });
}

// -----------------------------------------------------------------------------------------------
// events
// -----------------------------------------------------------------------------------------------
/** read the picked books once: every record in them asked what answers it, and why not */
async function checkBooks(app) {
  const a = api();
  const st = cvState(app);
  await Promise.all([a.records.read(), a.proposals.read()]);
  st.books = bookRows(a, st.chosen);
  st.picking = false;
}

export async function onCoverageClick(app, b, act) {
  const st = cvState(app);
  switch (act) {
    case 'cv-scope': st.scope = b.dataset.scope; st.show = PAGE; return app.render();
    case 'cv-book': { const id = b.dataset.book; if (st.chosen.has(id)) st.chosen.delete(id); else st.chosen.add(id); return repaint(app); }
    case 'cv-all': {
      const all = api().proposals.packs().map((p) => p.id);
      if (st.chosen.size === all.length) st.chosen.clear(); else all.forEach((id) => st.chosen.add(id));
      return repaint(app);
    }
    case 'cv-pick': st.picking = true; st.show = PAGE; return app.render();
    case 'cv-check': st.reading = true; st.show = PAGE; await app.render(); try { await checkBooks(app); } finally { st.reading = false; } return app.render();
    case 'cv-show': { const k = b.dataset.show; if (st.shown.has(k)) st.shown.delete(k); else st.shown.add(k); st.show = PAGE; return repaint(app); }
    case 'cv-more': st.show += PAGE; return repaint(app);
    // the disclosure opens itself; its state is kept so a render does not close it
    case 'cv-maint': st.maint = !st.maint; return undefined;
    default: return undefined;
  }
}
