// The FX tab (HANDOFF step 5, built 2026-09-07): ONE list of every FX, grouped
// Draft → House → Stock — resolution order, later wins — with the facets on the left and the 300px
// detail pane on the right. Stock FX and House FX were the same list twice, differing by a filter
// on `source`: where an FX lives is a property, not navigation (ruled 2026-09-07).
//
// Three columns, one scroll region (R4): the facets and the pane are fixed, the rows scroll. Every
// row is one height and selection changes colour only (R3). A facet, a tag and an action keep their
// place whatever is selected; what cannot run right now is greyed WHERE IT STANDS with its reason,
// never dropped (R1). Columns are proportional and nothing wraps (R2).
//
// The search is not here. It lives in the window header and answers on every tab (ui/studio.js):
// what it narrows is this list, and what it answers is this pane.
import { MODULE_ID } from '../settings.js';
import { KINDS, keyLabel, parseKey } from '../core/subjects.js';
import { PLACE_WORDS, assetsOf, provenance, withDefaults } from '../core/fx.js';
import { HOOK_WORDS, KIND_PLURAL, KIND_WORDS, SOURCE_TAG, esc, idWords } from './html.js';
import { SHAPE_WORDS, openSheet, playWhyOf, previewFx, thumbHtml } from './sheet.js';

const api = () => game.modules.get(MODULE_ID).api;
const PAGE = 200;
/** the layers in the order they win, which is the order the list is grouped in */
const RANK = { world: 0, house: 1, stock: 2 };
const ONLY_WORDS = { mine: 'On my actors', item: HOOK_WORDS.item + 's', off: 'Switched off', broken: 'Broken assets' };

const fxState = (app) => (app.fxv ??= { lives: new Set(), kinds: new Set(), only: new Set(), show: PAGE });

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

/** one row per FX, sorted Draft (newest first) → House → Stock (by name); cached until the corpus is read again */
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
    const name = p ? idWords(p.id) : owner ? owner.item : idWords(fx.id);
    const sentence = a.fx.sentence(e.original, { name });
    const shapes = [...new Set((fx.scenes ?? []).map((s) => s.shape))].map((sh) => [sh, (fx.scenes ?? []).filter((s) => s.shape === sh).length]);
    return {
      e, id: fx.id, name, keys, kind: p?.kind ?? null, item: !keys.length, owner, sentence, shapes,
      off: !!fx.off, source: e.source, at: e.original.at ?? '', mine: mine.has(fx.id),
      text: `${fx.id} ${name} ${keys.join(' ')} ${sentence} ${e.original.by ?? ''}`.toLowerCase(),
    };
  });
  rows.sort((x, y) => RANK[x.source] - RANK[y.source]
    || (x.source === 'world'
      ? String(y.at).localeCompare(String(x.at)) || (order.get(y.id) ?? -1) - (order.get(x.id) ?? -1)
      : x.name.localeCompare(y.name)));
  app._catalogue = rows;
  return rows;
}

/** the rows the facets and the header search leave */
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

const shapeTags = (r) => r.shapes.map(([sh, k]) => `<span class="tag shape">${esc(SHAPE_WORDS[sh] ?? sh)}${k > 1 ? ` ·${k}` : ''}</span>`).join('') || '<span class="tag shape na">—</span>';

function rowHtml(app, r) {
  const now = app.view.fxSel === r.id;
  const more = r.keys.length > 1 ? ` <span class="note">+${r.keys.length - 1} key${r.keys.length === 2 ? '' : 's'}</span>` : '';
  const hook = r.item ? ` <span class="note">· ${HOOK_WORDS.item}</span>` : '';
  return `<div class="row" data-now="${now}" data-source="${r.source}">
    <button type="button" class="pickbtn" data-act="fx-sel" data-id="${esc(r.id)}" aria-current="${now}">
      <span class="n">${esc(r.name)}${more}${hook}</span>
      <span class="s">${esc(r.sentence)}</span>
    </button>
    <span class="tag${r.source === 'world' ? ' yours' : ''}${r.off ? ' off' : ''}">${r.off ? 'Off' : SOURCE_TAG[r.source]}</span>
    <span class="shapes">${shapeTags(r)}</span>
  </div>`;
}

export function renderFx(app) {
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
  return `<div class="fxtab">
    ${facets(app)}
    <div class="fxlist card">
      <div class="listhead"><span class="sub">${rows.length}${rows.length === total ? '' : ` of ${total}`} FX</span><span class="spacer"></span><button type="button" class="quiet" data-act="import-fx" data-to="">Import</button><button type="button" class="primary" data-act="sh-new">New FX</button></div>
      <div class="rows">${body || `<p class="note">${rows.length ? '' : 'No match.'}</p>`}${more}</div>
    </div>
    ${detail(app)}
  </div>`;
}

// -----------------------------------------------------------------------------------------------
// the detail pane: one component, the same width and position on every tab (R5)
// -----------------------------------------------------------------------------------------------
/** the hook and the layer, in terms: "Global Hook · Misty Step (spell) · House" */
function whyOf(r) {
  const reach = r.item ? HOOK_WORDS.item : HOOK_WORDS.global;
  const key = r.keys.length ? `${keyLabel(r.keys[0])}${r.keys.length > 1 ? ` +${r.keys.length - 1}` : ''}` : (r.owner ? `${r.owner.actor} · ${r.owner.item}` : 'no hook');
  return `${reach} · ${key} · ${SOURCE_TAG[r.source]}`;
}

/** up to four scenes as a still and its line, then a count: the pane never resizes (R3) */
function scenesOf(r) {
  const scenes = r.e.fx.scenes ?? [];
  if (!scenes.length) return `<p class="note">${r.off ? 'Switched off.' : 'No scenes.'}</p>`;
  const shown = scenes.slice(0, 4).map((scene) => {
    const sc = withDefaults(scene);
    const place = scene.shape === 'move' ? 'the chosen spot' : PLACE_WORDS[sc.to ?? sc.at] ?? '';
    return `<div class="sc">${thumbHtml(scene, 'thumb small')}<span class="n">${esc(SHAPE_WORDS[scene.shape] ?? scene.shape)}${place ? ` · ${esc(place)}` : ''}</span></div>`;
  }).join('');
  return shown + (scenes.length > 4 ? `<p class="note">and ${scenes.length - 4} more</p>` : '');
}

/** one action cell; a reason greys it where it stands and says why (R1) */
const act = (id, words, why, cls = 'quiet', extra = '') => `<button type="button" class="${cls}" data-act="${id}" ${extra} data-tooltip="${esc(why ?? words)}" ${why ? 'disabled' : ''}>${esc(words)}${why ? ` · ${esc(why)}` : ''}</button>`;

/** the 2×3 action grid: Edit · Play · Ships as · Duplicate · Export · Delete */
function actions(app, r) {
  const a = api();
  const draft = r.source === 'world';
  const under = draft && (a.corpora.house.some((h) => h.id === r.id) || a.corpora.stock.some((b) => b.id === r.id));
  const pointed = app.view.subject?.pointer === r.id;
  const del = pointed ? ['remove', 'Revert'] : under ? ['remove-fx', `Revert to ${SOURCE_TAG[a.corpora.house.some((h) => h.id === r.id) ? 'house' : 'stock']}`] : ['delete-fx', 'Delete'];
  const why = playWhyOf(r.e.fx.scenes ?? [], r.off);
  const to = r.e.original.to ?? '';
  const stock = a.corpus.canStock(r.e.original);
  // one control at one address for what the Maintain card needs three buttons for: staged where, or
  // nowhere. Only a Draft can be staged, so on House and Stock it greys where it stands (R1).
  const ships = `<select class="fx-stage" data-id="${esc(r.id)}" aria-label="Staged" ${draft ? '' : 'data-na="true" disabled'} data-tooltip="${draft ? 'Where this FX ships when Coverage presses Ship.' : `${SOURCE_TAG[r.source]} already ships. Only a Draft is staged.`}">
      <option value=""${to ? '' : ' selected'}>Draft only</option>
      <option value="house"${to === 'house' ? ' selected' : ''}>Staged: ${esc(a.corpus.words.house)}</option>
      <option value="stock"${to === 'stock' ? ' selected' : ''} ${stock ? '' : 'disabled'}>Staged: ${esc(a.corpus.words.stock)}</option>
    </select>`;
  return `<div class="agrid">
    ${act('fx-edit', 'Edit', null, 'primary', `data-id="${esc(r.id)}"`)}
    ${act('fx-play', '▶ Play', why, 'quiet', `data-id="${esc(r.id)}"`)}
    ${ships}
    ${act('fx-dup', 'Duplicate', null, 'quiet', `data-id="${esc(r.id)}"`)}
    ${act('export-fx', 'Export', null, 'quiet', `data-id="${esc(r.id)}"`)}
    ${act(del[0], del[1], null, 'quiet danger', `data-id="${esc(r.id)}"`)}
  </div>`;
}

/** the FX the pane is on, or the ability the header search answered with nothing */
function detail(app) {
  const sel = app.view.fxSel ? catalogue(app).find((r) => r.id === app.view.fxSel) : null;
  if (sel) {
    return `<div class="detail card" data-on="fx">
      <div class="dhead"><button type="button" class="link nm" data-act="fx-open" data-id="${esc(sel.id)}" data-tooltip="Open its sheet to read it">${esc(sel.name)}</button><span class="tag${sel.source === 'world' ? ' yours' : ''}">${SOURCE_TAG[sel.source]}</span>${sel.off ? '<span class="tag off">Off</span>' : ''}</div>
      <p class="whyline"><span class="why">${esc(whyOf(sel))}</span></p>
      <p class="whyline"><code class="id">${esc(sel.id)}</code><span class="prov">${esc(provenance(sel.e.original))}</span></p>
      <div class="dbox"><div class="sub">Plays</div><div class="dsentence">${esc(sel.sentence)}</div></div>
      <div class="dbox scenes"><div class="sub">Sequence</div><div class="slist">${scenesOf(sel)}</div></div>
      ${actions(app, sel)}
    </div>`;
  }
  const s = app.view.subject;
  if (!s) return `<div class="detail card" data-on="none"><p class="note">Pick an FX, or search an ability in the header to see what plays for it.</p></div>`;
  const r = app.answer();
  const kinds = s.isNew ? `<div class="pills inline kinds"><span class="lbl">Type</span>${Object.entries(KIND_WORDS).map(([k, w]) => `<button type="button" class="pill" aria-pressed="${s.kind === k}" data-act="new-kind" data-kind="${k}">${w}</button>`).join('')}</div>` : '';
  return `<div class="detail card" data-on="ask">
    <div class="dhead"><span class="nm">${esc(s.name)}</span><span class="tag off">${esc(r.off ? 'Off' : 'No FX')}</span></div>
    <p class="whyline"><span class="why">${esc(r.why ?? '')}</span></p>
    ${kinds}
    <div class="dbox"><div class="sub">Plays</div><div class="dsentence">${esc(r.sentence)}</div></div>
    <div class="agrid one"><button type="button" class="primary" data-act="create-new">Create FX</button>${s.pointer ? '<button type="button" class="quiet danger" data-act="remove">Revert</button>' : ''}</div>
  </div>`;
}

// -----------------------------------------------------------------------------------------------
// events
// -----------------------------------------------------------------------------------------------
/**
 * The subject a door out of this pane carries: the ability the pane is answering about, when that
 * is what is selected (so the sheet knows the item an Item Hook could pin to), else the FX's own.
 */
const subjectFor = (app, id) => (app.view.fxSel === id && app.view.subject ? app.view.subject : app.subjectForFx(id));

export async function onFxClick(app, b, act2) {
  const V = fxState(app);
  const id = b.dataset.id;
  switch (act2) {
    case 'fx-facet': {
      const set = V[b.dataset.group];
      const v = b.dataset.v;
      if (set.has(v)) set.delete(v); else set.add(v);
      V.show = PAGE;
      return app.render();
    }
    case 'fx-clear': V.lives.clear(); V.kinds.clear(); V.only.clear(); V.show = PAGE; return app.render();
    case 'fx-more': V.show += PAGE; return app.render();
    case 'fx-sel': app.showFx(id); return app.render();
    case 'fx-open': openSheet(app, { id, subject: subjectFor(app, id) }); return app.render();
    case 'fx-edit': openSheet(app, { id, subject: subjectFor(app, id), edit: true }); return app.render();
    case 'fx-dup': { openSheet(app, { subject: subjectFor(app, id), from: id }); app.toast(`Copy of ${idWords(id)}. Add its hook, then Save.`); return app.render(); }
    case 'fx-play': { const e = api().fx.get(id); if (!e) return undefined; return previewFx(app, e.fx, idWords(id)); }
    default: return undefined;
  }
}

export async function onFxChange(app, el) {
  if (!el.classList.contains('fx-stage')) return undefined;
  const a = api();
  const id = el.dataset.id;
  const to = el.value || null;
  const r = await a.corpus.stage(id, to);
  if (!r.ok) { await app.render(); return app.toast(r.problems.join(' ')); }
  app.refresh();
  await app.render();
  return app.toast(to ? `${idWords(id)} staged: ${a.corpus.words[to]}.` : `${idWords(id)} unstaged.`);
}
