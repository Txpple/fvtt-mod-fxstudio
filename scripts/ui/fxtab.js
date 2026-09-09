// The FX tab — stripped back to a list on the user's word (2026-09-07): "remove this pane in its
// entirety and extend out the list view", "remove all the information lines on the fx line items,
// lets start clean here with just the name". So: THE SEARCH · THE FACETS · THE ROWS, and a row is
// a name. Nothing else. What the row used to carry — the sentence, the layer pill, the shape tags —
// and the whole 300px detail pane with its six actions are gone.
//
// CLICKING A ROW ONLY MARKS IT (the user, 2026-09-07: "i dont want any action taken"). The doors
// are right-justified on EVERY row: a red **Delete** that removes it for good after asking, then
// **Editor**, which opens it in the Editor — as a double click on the row does.
//
// THE SEARCH IS THIS TAB'S, AND IT ONLY NARROWS THIS LIST. It was the window's header for a day,
// and it carried a dropdown that answered "what plays for…" — but that dropdown listed ABILITIES
// while the box is named for FX and the list under it holds FX, and it spelled them in a third
// vocabulary again ("Dimension Door (spell)" from a corpus key, "Custom" from STATUS_WORDS). One
// box, one job (the user, 2026-09-07: "clean the search list"). Creating an FX for an ability that
// has none went with it — "we'll add new later" — so no door on this screen makes an FX today.
//
// One list of every FX, grouped Draft → House → Stock: resolution order, later wins. Where an FX
// lives is a property, not navigation (ruled 2026-09-07) — it is the group it sits under and a
// facet on the left, never a second list.
//
// Two columns, one scroll region (R4): the facets are fixed, the rows scroll, AND THE SCROLL IS NOT
// TAKEN AWAY: picking a row repaints two attributes in place and Load more redraws the list card
// alone, so neither rebuilds what you were reading. Every row is one height and selection changes
// colour only (R3). A facet keeps its place whatever is selected;
// what cannot run right now is greyed WHERE IT STANDS with its reason, never dropped (R1).
import { MODULE_ID } from '../settings.js';
import { KINDS, keyLabel, parseKey } from '../core/subjects.js';
import { assetsOf } from '../core/fx.js';
import { HOOK_WORDS, KIND_PLURAL, SOURCE_TAG, esc, idWords } from './html.js';
import { openSheet } from './sheet.js';
import { nameOf, openRecord, recordOf, recordWords, recordsRead } from './records.js';

const api = () => game.modules.get(MODULE_ID).api;
const PAGE = 200;
/** the layers in the order they win, which is the order the list is grouped in */
const RANK = { world: 0, house: 1, stock: 2 };
const ONLY_WORDS = { mine: 'On my actors', item: HOOK_WORDS.item + 's', off: 'Switched off', broken: 'Broken assets' };

const fxState = (app) => (app.fxv ??= { lives: new Set(), kinds: new Set(), only: new Set(), show: PAGE });

/**
 * Coverage's Errors tile, arriving: this list on Broken assets alone, nothing else pressed and the
 * search cleared — the tile asks one question, and a search left over answers another.
 */
export function showBroken(app) {
  const V = fxState(app);
  V.lives.clear();
  V.kinds.clear();
  V.only.clear();
  V.only.add('broken');
  V.show = PAGE;
  app.view.q = '';
  app.view.subject = null;
  app.view.fxSel = null;
  app.view.tab = 'fx';
}

// -----------------------------------------------------------------------------------------------
// the catalogue: every FX as a row, read once per rebuild
// -----------------------------------------------------------------------------------------------
/** the FX that answer something on this world's actors, from the census the window already holds */
function mineIds(app) {
  const out = new Set();
  for (const row of app.census?.actors ?? []) {
    for (const it of row.items) if (it.fx) out.add(it.fx);
    for (const ef of row.effects) if (ef.fx) out.add(ef.fx);
  }
  return out;
}

/** the FX naming an asset the libraries do not have — the check tools/check-fx.mjs runs, on screen */
export function brokenIds(app) {
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

/**
 * One row per FX, sorted Draft (newest first) → House → Stock (by name); cached until the corpus is
 * read again. The row shows only its name, and THE SEARCH MATCHES ONLY THAT NAME (the user,
 * 2026-09-07: "just search on the name … why do i get knife here") — it used to match the whole
 * generated sentence too, so typing "Dagger" returned Sculpting Knife, whose sentence names a PSFX
 * group that lists one. What is not searched is still read here: the facets count by it.
 */
function catalogue(app) {
  if (app._catalogue) return app._catalogue;
  const a = api();
  const mine = mineIds(app);
  const order = new Map(a.fx.buffer().map((l, i) => [l.id, i]));
  const rows = a.fx.list().map((e) => {
    const fx = e.fx;
    const keys = fx.for ?? [];
    const p = keys[0] ? parseKey(keys[0]) : null;
    const owner = keys.length ? null : app.ownerOfFx(fx.id);
    const name = keys[0] ? nameOf(fx) : owner ? owner.item : idWords(fx.id);
    return {
      e, id: fx.id, name, keys, kind: p?.kind ?? null, item: !keys.length, owner,
      off: !!fx.off, source: e.source, at: e.original.at ?? '', mine: mine.has(fx.id),
      text: name.toLowerCase(),
    };
  });
  rows.sort((x, y) => RANK[x.source] - RANK[y.source]
    || (x.source === 'world'
      ? String(y.at).localeCompare(String(x.at)) || (order.get(y.id) ?? -1) - (order.get(x.id) ?? -1)
      : x.name.localeCompare(y.name)));
  app._catalogue = rows;
  return rows;
}

/** the rows the facets and the search leave */
function shownRows(app) {
  const V = fxState(app);
  const q = (app.view.q ?? '').trim().toLowerCase();
  const broken = V.only.has('broken') ? brokenIds(app) : null;
  return catalogue(app).filter((r) => (!V.lives.size || V.lives.has(r.source))
    && (!V.kinds.size || (r.kind && V.kinds.has(r.kind)))
    && (!V.only.has('mine') || r.mine)
    && (!V.only.has('item') || r.item)
    && (!V.only.has('off') || r.off)
    && (!broken || broken.has(r.id))
    && (!q || r.text.includes(q)));
}

// -----------------------------------------------------------------------------------------------
// rendering
// -----------------------------------------------------------------------------------------------
/**
 * The row over the two columns: the search on the left, and Import on the right, ending where the
 * list ends. Import is here on the user's word (2026-09-07); Maintain keeps Import to Stock, which
 * is a different thing — a file straight into the shipped corpus.
 */
const searchBox = (app) => `<div class="fxsearch">
    <div class="search"><input type="search" class="fx-q" placeholder="Search for an FX…" aria-label="Search for an FX" autocomplete="off" value="${esc(app.view.q ?? '')}"></div>
    <button type="button" class="quiet import" data-act="import-fx" data-to="" data-tooltip="Read a file of FX into this world as Drafts">Import</button>
  </div>`;

/** one facet row: a fixed-height toggle with its count, greyed in place when the corpus has none (R1) */
const facet = (group, value, words, n, on) => `<button type="button" class="frow" data-act="fx-facet" data-group="${group}" data-v="${esc(value)}" aria-pressed="${on}" ${n ? '' : 'data-na="true" disabled'}><span class="w">${esc(words)}</span><span class="c">${n}</span></button>`;

function facets(app) {
  const V = fxState(app);
  const all = catalogue(app);
  const broken = brokenIds(app);
  const n = (f) => all.filter(f).length;
  const lives = ['world', 'house', 'stock'].map((s) => facet('lives', s, SOURCE_TAG[s], n((r) => r.source === s), V.lives.has(s))).join('');
  const kinds = KINDS.map((k) => facet('kinds', k, KIND_PLURAL[k] ?? k, n((r) => r.kind === k), V.kinds.has(k))).join('');
  const test = { mine: (r) => r.mine, item: (r) => r.item, off: (r) => r.off, broken: (r) => broken.has(r.id) };
  const only = Object.entries(ONLY_WORDS).map(([k, w]) => facet('only', k, w, n(test[k]), V.only.has(k))).join('');
  const any = V.lives.size + V.kinds.size + V.only.size;
  return `<div class="facets">
    <div class="fgroup"><div class="sub">Lives in</div>${lives}</div>
    <div class="fgroup"><div class="sub">Kind</div>${kinds}</div>
    <div class="fgroup"><div class="sub">Only</div>${only}</div>
    <button type="button" class="quiet clear" data-act="fx-clear" ${any ? '' : 'disabled'}>Clear${any ? ` · ${any}` : ''}</button>
  </div>`;
}

/**
 * THE RECORD DOOR (the user, 2026-09-08: "everything now matches a compendium or an item in the
 * world … a link that opens the compendium object/record"). One word on every row, so the row stays
 * the name it was stripped back to — the record's own name and the book it is in are the tooltip's.
 * The address was settled offline when the key was earned (recipes/records.json, ui/records.js);
 * nothing is searched for by name here. An Item Hook has no key, so its record is the item it is
 * pinned to. Nothing to open is greyed WHERE IT STANDS with its reason (R1), never dropped.
 */
function recordDoor(app, r) {
  const grey = (why) => `<button type="button" class="link record" disabled data-na="true" data-tooltip="${esc(why)}">Record</button>`;
  if (!recordsRead()) return grey('Reading the records…');
  const rec = r.owner
    ? (r.owner.uuid ? { uuid: r.owner.uuid, name: r.owner.item, where: `this world · ${r.owner.actor}` } : null)
    : recordOf(r.e.fx);
  if (!rec?.uuid) return grey(r.item ? 'No item here points at this FX' : `Nothing here holds ${r.keys[0] ? keyLabel(r.keys[0]) : 'a record for this FX'}`);
  return `<button type="button" class="link record" data-act="fx-record" data-uuid="${esc(rec.uuid)}" data-name="${esc(rec.name)}" data-tooltip="${esc(recordWords(rec, r.kind))}">Record</button>`;
}

/** a row is a name; clicking it marks it, and the marked row is the only one showing its doors */
const rowHtml = (app, r) => `<div class="row" data-now="${app.view.fxSel === r.id}">
    <button type="button" class="pickbtn" data-act="fx-sel" data-id="${esc(r.id)}" aria-current="${app.view.fxSel === r.id}"><span class="n">${esc(r.name)}</span></button>
    <span class="acts">${recordDoor(app, r)}<button type="button" class="link danger" data-act="fx-del" data-id="${esc(r.id)}" data-tooltip="Delete ${esc(r.name)} for good">Delete</button><button type="button" class="link" data-act="fx-editor" data-id="${esc(r.id)}" data-tooltip="Open ${esc(r.name)} in the Editor">Editor</button></span>
  </div>`;

/** the list card on its own, so the search can redraw it without redrawing the box being typed in */
export function renderList(app) {
  const V = fxState(app);
  const rows = shownRows(app);
  const total = catalogue(app).length;
  const per = { world: 0, house: 0, stock: 0 };
  for (const r of rows) per[r.source]++;
  const page = Math.min(V.show, rows.length);
  let last = null;
  const body = rows.slice(0, page).map((r) => {
    const head = r.source === last ? '' : `<div class="grouphead">${SOURCE_TAG[r.source]} · ${per[r.source]} FX</div>`;
    last = r.source;
    return head + rowHtml(app, r);
  }).join('');
  const more = rows.length > page ? `<p class="note more"><button type="button" class="link" data-act="fx-more">Load more</button> · ${rows.length - page} more</p>` : '';
  return `<div class="fxlist card">
      <div class="listhead"><span class="sub">${rows.length}${rows.length === total ? '' : ` of ${total}`} FX</span></div>
      <div class="rows">${body || `<p class="note">${rows.length ? '' : 'No match.'}</p>`}${more}</div>
    </div>`;
}

export const renderFx = (app) => `<div class="fxtab">
    ${searchBox(app)}
    ${facets(app)}
    ${renderList(app)}
  </div>`;

// -----------------------------------------------------------------------------------------------
// events
// -----------------------------------------------------------------------------------------------
export async function onFxClick(app, b, act2) {
  const V = fxState(app);
  switch (act2) {
    case 'fx-facet': {
      const set = V[b.dataset.group];
      const v = b.dataset.v;
      if (set.has(v)) set.delete(v); else set.add(v);
      V.show = PAGE;
      return app.render();
    }
    case 'fx-clear': V.lives.clear(); V.kinds.clear(); V.only.clear(); V.show = PAGE; return app.render();
    // Load more must not throw you back to the top of what you were reading
    case 'fx-more': V.show += PAGE; app.narrow(); return undefined;
    // Selection is COLOUR ONLY (R3), so it is painted in place. Re-rendering the window rebuilt the
    // rows and lost the scroll — the user, 2026-09-07: "it resets the listview and i lose its focus"
    case 'fx-sel': {
      const id = b.dataset.id;
      app.view.fxSel = id;
      for (const row of app.element.querySelectorAll('.fxlist .row')) {
        const btn = row.querySelector('.pickbtn');
        const on = String(btn?.dataset.id === id);
        row.dataset.now = on;
        btn?.setAttribute('aria-current', on);
      }
      return undefined;
    }
    case 'fx-editor': { const id = b.dataset.id; app.view.fxSel = id; openSheet(app, { id, subject: app.subjectForFx(id) }); return app.render(); }
    // deleteFx asks first, and unpins whatever item pointed at it
    case 'fx-del': return app.deleteFx(b.dataset.id);
    // the record opens in its OWN sheet, beside the window — the Library is not a book reader
    case 'fx-record': return openRecord(b.dataset.uuid, b.dataset.name);
    default: return undefined;
  }
}
