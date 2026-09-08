// The FX sheet: one screen per FX, the same whether it is read or changed. It opens from a row on
// the FX tab, from its detail pane's Edit, from "Used in" on Assets, from Coverage, and from New FX.
// IT IS THE EDITOR TAB (the user's ruling, 2026-09-07 — it was a pane over the FX tab at step 5):
// every edit of an FX is made here and nowhere else, the tab is in the strip whether an FX is open
// or not, and walking off to another tab leaves it open, unsaved changes and all. Back is still
// here as the shortcut to the tab the sheet was opened from; it does not close the sheet.
// An Edit switch is the guard: off, the sheet is read-only and offers Duplicate,
// Export and Delete (or Revert, when a Draft sits over Stock or House); on, every control unlocks
// and the buttons are Cancel and Save. Save always writes a Draft (the world buffer) through the
// API — Stock and House files are never touched here.
//
// FIVE BANDS, top to bottom (rebuilt 2026-09-07, HANDOFF step 4). Only the inspector's contents
// ever change:
//   1 Identity + action bar   name, tags, and one monospace line: the hook, the id, the provenance
//   2 Sentence                a fixed two-line box; the selected scene's clause is marked
//   3 Hook strip              one row, four columns: Answers · Reach · Moment · State
//   4 Sequence                rail | inspector, the overlap strip under the rail
//   5 Note                    one row
// (There is no inheritance band. Nothing inherits — see below.)
//
// THE SEQUENCE IS A RAIL AND AN INSPECTOR. The rail is one fixed row per scene: its number, a still
// of what it plays, "Shape · place", when it starts, and ▶. Under it the overlap strip draws every
// scene on one ms scale, which is the thing a list of rows cannot show: what plays *while* what.
// The inspector holds one scene at a time in a frame that never resizes — five band tabs
// (Picture · Timing · Sound · Placement · the shape's own), each the same 4×2 grid of eight cells.
// A knob keeps its address in both modes and for every shape; what a shape does not read is greyed
// AND switched off where it stands (R1), taken from KNOBS in core/fx.js and from nothing else.
//
// THE TWO DELAYS ARE NAMED (the user's parked question, closed here). `delay` is **Wait before**:
// how long this scene waits before it starts. `wait` is **Hold next**: the next scene waits for
// this one to finish, plus or minus an offset. The engine folds a `wait: true` scene's `delay`
// into that offset (engine/common.js `timing`), which is how one word came to mean two things; a
// scene like that is normalised as the sheet loads it — `{wait: true, delay: -1000}` becomes
// `{wait: -1000}`, which plays identically and says one thing in one place. Nothing is rewritten
// on disk: the FX is written back only if the user saves it.
//
// EVERY FX IS A FULL COPY (ruled 2026-09-07): no FX points at another one, so nothing here has to
// show, guard or preserve a reference. "Copy from" and Duplicate stamp the scenes out and the new
// FX owns them; changing it changes nothing else, and nothing it came from can orphan it.
import { MODULE_ID } from '../settings.js';
import { keyLabel, parseKey, slug } from '../core/subjects.js';
import { needsPlace } from '../core/corpus.js';
import { KNOBS, PLACES, PLACE_WORDS, assetWords, pathWords, provenance, sceneWords, withDefaults } from '../core/fx.js';
import { HOOK_WORDS, KIND_WORDS, ON_WORDS, SOURCE_TAG, dot, esc, idWords } from './html.js';
import { openPicker } from './library.js';

const api = () => game.modules.get(MODULE_ID).api;
const STARTER_OF_SHAPE = { strike: 'starter:swing', shoot: 'starter:bolt', mark: 'starter:mark', fill: 'starter:fill', aura: 'starter:aura', beam: 'starter:beam', move: 'starter:teleport', sound: 'starter:sound' };
export const SHAPE_WORDS = { strike: 'Swing', shoot: 'Bolt', mark: 'Mark', fill: 'Fill', aura: 'Aura', beam: 'Beam', move: 'Move', sound: 'Sound', custom: 'Custom' };
const KIND_OF_SHAPE = (sh) => (sh === 'sound' ? 'sfx' : sh === 'move' ? 'move' : 'vfx');
const KIND_TITLE = { vfx: 'VFX', sfx: 'SFX', move: '' };
/** what each shape does, in plain words: the tooltip on its Add pill */
const SHAPE_HELP = {
  strike: 'A melee attack played on the target, like a sword arc. For weapons and claws.',
  shoot: 'Something flies from the caster to each target. Fire Bolt, an arrow, Guiding Bolt.',
  mark: 'A VFX placed on one spot or one token, once. A burst on the caster, a glyph on the target.',
  fill: 'The whole area of a placed template is covered, for as long as it stands. Fireball, Web, Grease.',
  aura: 'A VFX that stays around a token and moves with it until the effect ends. Shield of Faith, Spirit Guardians.',
  beam: 'A line held from the caster to the target while it lasts. Lightning Bolt, a ray.',
  move: 'The caster fades and reappears at the chosen spot. Misty Step and every teleport.',
  sound: 'An SFX on its own, with no VFX.',
};
const PERSIST_WORDS = { none: 'Once', effect: 'While the effect lasts', template: 'While the template stands', 'until-removed': 'Until removed' };
const MISS_WORDS = { play: 'Plays anyway', skip: 'Skipped', 'fly-past': 'Flies past' };
const hasPicture = (scene) => !['sound', 'move', 'custom'].includes(scene.shape);
const clone = (v) => JSON.parse(JSON.stringify(v));

/** the key a subject answers by: its first bare key */
export const bareKey = (subject) => subject?.keys?.find((k) => !k.includes('/')) ?? subject?.keys?.[0] ?? null;

// -----------------------------------------------------------------------------------------------
// opening
// -----------------------------------------------------------------------------------------------
/**
 * Open a sheet on the window. {id: an FX to read or edit; subject: the ability it is for (a new
 * FX, or the item an Item Hook pins to); from: an FX id to duplicate; scenes: rows to begin with
 * (the Library's Use); edit: open unlocked}. With nothing, a blank sheet.
 */
export function openSheet(app, { id = null, subject = null, from = null, scenes = null, edit = false } = {}) {
  const a = api();
  const s = { id: null, source: null, original: null, subject: null, keys: [], newKeys: [], on: 'use', off: false, onlyThis: false, scenes: [], note: '', edit: !!edit, cameFrom: app.view.tab === 'editor' ? (app.sheet?.cameFrom ?? 'fx') : app.view.tab, isNew: !id, from: null, snapshot: null, keyQuery: '', itemQuery: null, pick: 0, band: 'picture' };
  const e = id ? a.fx.get(id) : null;
  if (e) {
    s.id = id; s.source = e.source; s.original = e.original;
    s.keys = [...(e.original.for ?? [])];
    s.on = e.original.on ?? 'use';
    s.off = !!e.original.off;
    s.note = e.original.note ?? '';
    s.scenes = seedFrom(id);
    s.subject = subject ?? app.subjectForFx(id);
    // no keys IS the Item Hook: an FX opened straight by id must read as one, however it was reached
    s.onlyThis = subject?.pointer === id || !(e.original.for ?? []).length;
  } else {
    s.subject = subject;
    if (subject) { const k = bareKey(subject); if (k) s.keys = [k]; s.on = subject.on ?? 'use'; if (subject.isNew) s.newKeys = [k]; }
    if (from && a.fx.get(from)) { s.from = from; s.scenes = seedFrom(from); }
    if (scenes?.length) s.scenes = scenes.map((scene) => ({ scene: named(clone(scene)) }));
    s.edit = true;
  }
  app.sheet = s;
  s.snapshot = JSON.stringify(safeDraft(app));
  app.view.tab = 'editor';
  return s;
}

/**
 * The one normalisation the sheet makes as it loads a scene: a hold whose offset is written as
 * `delay` (which is how the engine reads it, and how the migration wrote it) becomes a numeric
 * `wait`, so that Wait before and Hold next each mean one thing. It plays the same either way —
 * `waitUntilFinished(ms)` — and nothing is written until Save.
 */
function named(scene) {
  if (!scene?.wait) return scene;
  const offset = scene.delay;
  if (offset === undefined) return scene;
  delete scene.delay;
  scene.wait = typeof offset === 'number' && offset !== 0 ? offset : true;
  return scene;
}

/** the rows an FX (or a starter) holds, copied: what a new FX is stamped out of */
function seedFrom(id) {
  try { return api().fx.scenesOf(id).map((scene) => ({ scene: named(scene) })); } catch { return []; }
}

/** the scene the inspector is on, clamped to what is there */
const pickOf = (app) => Math.min(Math.max(0, app.sheet?.pick ?? 0), Math.max(0, (app.sheet?.scenes?.length ?? 1) - 1));

/** the FX the sheet describes, ready to validate or save */
export function draftFx(app) {
  const a = api();
  const s = app.sheet;
  const sub = s.subject;
  const owner = sub?.actor?.name ?? sub?.owner ?? null;
  let id = s.id;
  const p = parseKey(s.keys[0] ?? '');
  const baseId = (p?.id ?? (s.id ? s.id.replace(/-[a-z0-9-]+$/, (m) => (owner && m === `-${slug(owner)}` ? '' : m)) : slug(sub?.name ?? ''))) || 'fx';
  // an Item Hook is the item's own FX: its id is the ability's plus the owner's, never the Global Hook's
  const ownAlready = !!s.original && !(s.original.for?.length);
  if (s.onlyThis && !ownAlready) id = `${baseId}-${slug(owner ?? 'this')}`;
  else if (!id) {
    id = baseId;
    if (s.keys.length) {
      const existing = a.fx.get(id);
      if (existing && !s.keys.some((k) => (existing.original?.for ?? []).includes(k))) id = `${p?.kind ?? 'fx'}-${id}`;
    }
  }
  const note = s.note.trim() || (s.from ? `copied from ${idWords(s.from)}` : s.original?.note ?? '');
  const fx = { id, for: s.onlyThis ? [] : [...s.keys], on: s.on };
  // an off FX plays nothing, so it carries no scenes; the sheet keeps them for when it is switched on
  if (s.off) fx.off = true;
  else fx.scenes = s.scenes.map(({ scene }) => clone(scene));
  if (note) fx.note = note;
  return fx;
}
const safeDraft = (app) => { try { return draftFx(app); } catch { return null; } };
export const sheetDirty = (app) => !!app.sheet && app.sheet.edit && JSON.stringify(safeDraft(app)) !== app.sheet.snapshot;

/** every problem the API would raise on Save, in sentences; [] when it is clean */
function problemsOf(app) {
  try { const fx = draftFx(app); const out = api().fx.validate(fx); if (!fx.for.length && !app.sheet.onlyThis) out.unshift('No hook: add an ability, or pin it to an item.'); return out; } catch (e) { return [e.message]; }
}

/** ask before dropping unsaved changes; true when it is fine to leave */
export async function leaveSheet(app) {
  if (!sheetDirty(app)) return true;
  const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Drop unsaved changes?' }, content: `<p>${esc(sheetName(app))} has unsaved changes.</p>`, rejectClose: false, modal: true });
  if (ok) { app.sheet.edit = false; if (app.sheet.id) openSheet(app, { id: app.sheet.id, subject: app.sheet.subject }); else app.sheet = null; }
  return !!ok;
}

const sheetName = (app) => { const s = app.sheet; const k = s.keys[0]; return s.subject?.name ?? (k ? idWords(parseKey(k)?.id) : s.id ? idWords(s.id) : 'New FX'); };

// -----------------------------------------------------------------------------------------------
// rendering
// -----------------------------------------------------------------------------------------------
export function renderSheet(app) {
  const a = api();
  const s = app.sheet;
  // the tab's resting state: it is always in the strip, so it has to say what it is when it is empty
  if (!s) return `<div class="stack"><div class="card"><div class="sub">Editor</div><p class="note">No FX open. Every FX is edited here — pick one on the FX tab and press Edit, or start a new one.</p><div class="actions"><button type="button" class="primary" data-act="sh-new">New FX</button><button type="button" class="quiet" data-act="tab" data-tab="fx">Browse FX</button></div></div></div>`;
  const edit = s.edit;
  const fx = safeDraft(app);
  const problems = edit ? problemsOf(app) : [];
  const name = sheetName(app);
  const under = s.id && s.source === 'world' ? (a.corpora.house.some((h) => h.id === s.id) ? 'house' : a.corpora.stock.some((b) => b.id === s.id) ? 'stock' : null) : null;
  const tags = [
    s.source ? `<span class="tag ${s.source === 'world' ? 'yours' : ''}">${SOURCE_TAG[s.source]}</span>` : '<span class="tag yours">New</span>',
    `<span class="tag">${s.onlyThis ? HOOK_WORDS.item : HOOK_WORDS.global}</span>`,
    s.off ? '<span class="tag off">Off</span>' : '',
  ].join('');
  const deleteWord = under ? `Revert to ${SOURCE_TAG[under]}` : 'Delete';
  // the bar never reflows: every control keeps its place, and what the mode does not offer is greyed
  const onSaved = !edit && !!s.id;
  const lockbar = `<div class="lockbar">
      <button type="button" class="quiet" data-act="sh-back">‹ Back</button>
      <button type="button" class="quiet" data-act="sh-new">New FX</button>
      <button type="button" data-act="sh-dup" ${onSaved ? '' : 'disabled'}>Duplicate</button>
      <button type="button" class="quiet" data-act="sh-export" ${onSaved ? '' : 'disabled'}>Export</button>
      <button type="button" class="quiet danger" data-act="sh-delete" ${onSaved ? '' : 'disabled'}>${deleteWord}</button>
      <label class="switch"><input type="checkbox" class="sh-edit" aria-label="Edit" ${edit ? 'checked' : ''}> Edit</label>
      <button type="button" class="quiet" data-act="sh-cancel" ${edit ? '' : 'disabled'}>Cancel</button>
      <button type="button" class="primary" data-act="sh-save" ${edit && !problems.length ? '' : 'disabled'}>Save</button>
    </div>`;
  const banner = edit && (s.source === 'stock' || s.source === 'house') ? `<div class="banner">Editing ${SOURCE_TAG[s.source]}. Save writes a <b>Draft</b> that overrides it; ${SOURCE_TAG[s.source]} itself is not changed.</div>` : '';
  // every problem, each one the button that takes you to the scene it names
  const problemList = problems.length ? `<ul class="problems">${problems.map((p) => {
    const m = /\bscene (\d+)\b/.exec(p);
    const body = m ? `<button type="button" class="link bad" data-act="sh-pick" data-i="${Number(m[1]) - 1}">${esc(p)}</button>` : esc(p);
    return `<li class="problem bad">${body}</li>`;
  }).join('')}</ul>` : '';
  return `<div class="card sheet" data-edit="${edit}">
    <div class="sheet-head">
      <div class="sheet-title"><h2><span class="nm">${esc(name)}</span>${tags}</h2></div>
      ${lockbar}
    </div>
    <p class="whyline"><span class="why">${esc(whyWords(app))}</span><code class="id">${esc(fx?.id ?? s.id ?? '')}</code>${s.original && provenance(s.original) ? `<span class="prov">${esc(provenance(s.original))}</span>` : ''}</p>
    ${banner}${problemList}
    <div class="preview"><div class="sub">What plays</div><div class="sentence-box">${sentenceHtml(app, fx, name)}</div></div>
    <div class="section"><div class="sub">Hook</div>${renderHook(app)}</div>
    <div class="section sequence"><div class="sechead"><div class="sub">Sequence</div>${playAll(app)}</div>${renderSequence(app)}</div>
    <div class="section"><div class="sub">Note</div><input type="text" class="sh-note knob" value="${esc(s.note)}" placeholder="${esc(s.from ? `copied from ${idWords(s.from)}` : 'Why this FX, for whoever reads it later')}" ${edit ? '' : 'disabled'}></div>
  </div>`;
}

/** the hook and the layer, in terms: "Global Hook · Misty Step (spell) · House" */
function whyWords(app) {
  const s = app.sheet;
  const reach = s.onlyThis ? HOOK_WORDS.item : HOOK_WORDS.global;
  const key = s.keys.length ? `${keyLabel(s.keys[0])}${s.keys.length > 1 ? ` +${s.keys.length - 1}` : ''}` : (s.onlyThis && s.subject?.name ? s.subject.name : 'no hook yet');
  return `${reach} · ${key} · ${s.source ? SOURCE_TAG[s.source] : 'New'}`;
}

/** the FX as its sentence, with the selected scene's own clause marked */
function sentenceHtml(app, fx, name) {
  if (!fx) return '';
  const line = api().fx.sentence(fx, { name });
  const scene = app.sheet.scenes[pickOf(app)]?.scene;
  const clause = scene && !app.sheet.off ? sceneWords(scene) : '';
  const at = clause ? line.indexOf(clause) : -1;
  if (at < 0) return `<b title="${esc(line)}">${esc(line)}</b>`;
  return `<b title="${esc(line)}">${esc(line.slice(0, at))}<mark>${esc(clause)}</mark>${esc(line.slice(at + clause.length))}</b>`;
}

// --- Play (HANDOFF step 2): api.preview, on the selected token, saving nothing ------------------
const assetUrl = (file) => (globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(file) : `/${file}`);

/**
 * Why Play cannot run right now, in words, or null when it can. One rule, in one place: the sheet's
 * Play all, its per-scene ▶ and the FX tab's Play all read it, and every one of them greys WHERE IT
 * STANDS with the reason in its label rather than disappearing (R1).
 */
export function playWhyOf(scenes, off = false) {
  if (off) return 'switched off';
  if (!scenes.length) return 'no scenes';
  if (!canvas?.tokens?.controlled?.length) return 'select a token';
  if (needsPlace({ scenes }) && !canvas.regions?.controlled?.length) return 'select a placed template';
  return null;
}
const playWhy = (app, scene = null) => playWhyOf(scene ? [scene] : app.sheet.scenes.map((x) => x.scene), app.sheet.off);

/** ▶ Play all, in the Sequence header */
function playAll(app) {
  const why = playWhy(app);
  return `<button type="button" class="quiet play" data-act="sh-play" data-tooltip="${esc(why ?? 'Play the whole FX on the selected token. Nothing is saved.')}" ${why ? 'disabled' : ''}>▶ Play all${why ? ` · ${esc(why)}` : ''}</button>`;
}

/** the first file behind a scene's picture, for its thumbnail */
function thumbFile(scene) {
  if (!hasPicture(scene) || !scene.asset) return null;
  const a = api();
  const r = a.assets.resolve(scene.asset);
  if (r.missing) return null;
  return r.file ?? (r.path ? a.assets.database()?.files(r.path)?.[0] ?? null : null);
}

const isVideo = (file) => /\.(webm|mp4|m4v)$/i.test(file);
/** a still of what a scene plays, for the rail and for the FX tab's detail pane */
export function thumbHtml(scene, cls = 'thumb') {
  const file = thumbFile(scene);
  if (!file) return `<span class="${cls} none"></span>`;
  return isVideo(file)
    ? `<video class="${cls}" data-file="${esc(file)}" src="${esc(assetUrl(file))}#t=0.1" preload="metadata" muted playsinline></video>`
    : `<img class="${cls}" src="${esc(assetUrl(file))}" alt="">`;
}

// -----------------------------------------------------------------------------------------------
// band 3 — the hook strip: one row, four columns
// -----------------------------------------------------------------------------------------------
/**
 * The items this FX can be pinned to: every ability on this world's actors, matched on its own name
 * or its owner's. Deliberately NOT deduplicated by key the way the header search is — the whole
 * point of an Item Hook is that this Bob's Misty Step is not that Alice's.
 */
function itemHits(app, q) {
  const needle = q.trim().toLowerCase();
  const rows = (app.entries ?? []).filter((e) => e.uuid && e.owner);
  const hit = needle ? rows.filter((e) => e.name.toLowerCase().includes(needle) || e.owner.toLowerCase().includes(needle)) : rows;
  return [...hit].sort((x, y) => x.owner.localeCompare(y.owner) || x.name.localeCompare(y.name)).slice(0, 12);
}

function renderHook(app) {
  const s = app.sheet;
  const edit = s.edit;
  const sub = s.subject;
  // read-only, a long key list is a count: the sheet is for reading then. Edit shows every one.
  const SHOWN = 6;
  const keys = edit ? s.keys : s.keys.slice(0, SHOWN);
  const keyPills = keys.map((k) => `<span class="pill key" aria-pressed="${!s.onlyThis}">${esc(keyLabel(k))}${edit ? `<button type="button" class="x" data-act="sh-key-del" data-key="${esc(k)}" aria-label="Remove hook">✕</button>` : ''}</span>`).join('')
    + (!edit && s.keys.length > SHOWN ? `<span class="pill more">+${s.keys.length - SHOWN} more</span>` : '');
  const addKey = edit ? `<div class="search sh-key-search"><input type="search" class="sh-key-q" placeholder="Add ability" aria-label="Add ability" autocomplete="off" value="${esc(s.keyQuery)}"><div class="suggest" data-open="false"></div></div>` : '';
  const lastNew = s.newKeys.length ? s.newKeys[s.newKeys.length - 1] : null;
  const kinds = edit && lastNew && s.keys.includes(lastNew) ? `<span class="pills inline kinds"><span class="lbl">Type of ${esc(idWords(parseKey(lastNew)?.id))}</span>${Object.entries(KIND_WORDS).map(([k, w]) => `<button type="button" class="pill" aria-pressed="${parseKey(lastNew)?.kind === k}" data-act="sh-kind" data-kind="${k}">${w}</button>`).join('')}</span>` : '';
  const pills = (list, cur, act, attr) => list.map(([v, w]) => `<button type="button" class="pill" aria-pressed="${cur === v}" data-act="${act}" data-${attr}="${v}">${w}</button>`).join('');
  // Reach keeps its place whether or not we came from an item (R1). Until step 7 it was greyed for
  // good unless you had arrived from that item's own sheet, which made an Item Hook impossible to
  // write from the FX tab — so unlocked, it picks the actor and the item itself.
  const canItem = !!(sub?.uuid && sub?.owner);
  const picking = s.itemQuery !== null;
  const reach = canItem
    ? `<button type="button" class="pill" aria-pressed="${s.onlyThis}" data-act="sh-only">${HOOK_WORDS.item}: ${esc(sub.owner)} · ${esc(sub.name)}</button>`
    : edit
      ? `<button type="button" class="pill" aria-pressed="${picking}" data-act="sh-pick-item" data-tooltip="Pin this FX to one item on one actor: pick the actor and the item here.">${HOOK_WORDS.item}</button>`
      : `<span class="pill" data-na="true" data-tooltip="Unlock the sheet to pin this FX to one item, or open it from that item's own sheet.">${HOOK_WORDS.item}</span>`;
  const pickItem = picking && !canItem ? `<div class="search sh-item-search"><input type="search" class="sh-item-q" placeholder="Find an item on an actor" aria-label="Find an item on an actor" autocomplete="off" value="${esc(s.itemQuery)}"><div class="suggest" data-open="false"></div></div>` : '';
  return `<div class="hookstrip">
    <div class="hcol wide"><span class="lbl">Answers</span><div class="pills wrap">${keyPills}${!s.keys.length ? '<span class="note">No hook yet</span>' : ''}${addKey}${kinds}</div></div>
    <div class="hcol"><span class="lbl">Reach</span><div class="pills"><button type="button" class="pill" aria-pressed="${!s.onlyThis}" data-act="sh-global">${HOOK_WORDS.global}</button>${reach}</div>${pickItem}</div>
    <div class="hcol"><span class="lbl">Moment</span><div class="pills">${pills(Object.entries(ON_WORDS), s.on, 'sh-on', 'on')}</div></div>
    <div class="hcol"><span class="lbl">State</span><div class="pills">${pills([[false, 'On'], [true, 'Off']], s.off, 'sh-off', 'v')}</div></div>
  </div>`;
}

// -----------------------------------------------------------------------------------------------
// band 4 — the sequence: the rail, the overlap strip, the inspector
// -----------------------------------------------------------------------------------------------
/**
 * When each scene starts and how long it runs, on one ms scale. The rule is the engine's own
 * (engine/common.js `timing`): a scene that holds the sequence makes the next one start when it
 * has finished, plus or minus the offset; a scene that does not hold starts alongside the one
 * before it, after its own Wait before. A picture's own length is NOT in the grammar, so it is
 * measured from the file the browser has loaded (DURATIONS, filled by hydrateSheet) and marked an
 * estimate until then — never quietly guessed.
 */
const NOMINAL_MS = 1000;
const DURATIONS = new Map();
const ASKED = new Set();

function timeline(scenes) {
  let cursor = 0;
  return scenes.map(({ scene }) => {
    const sc = withDefaults(scene);
    const file = thumbFile(scene);
    const known = file ? DURATIONS.get(file) : undefined;
    const times = Math.max(1, Math.round(sc.repeat ?? 1));
    const one = (known ?? NOMINAL_MS) / (sc.rate && sc.rate > 0 ? sc.rate : 1);
    const dur = one * times + (sc.every ?? 0) * (times - 1);
    const holds = !!scene.wait;
    const start = holds ? cursor : cursor + (scene.delay ?? 0);
    const end = start + dur;
    if (holds) cursor = end + (typeof scene.wait === 'number' ? scene.wait : 0);
    return { start, end, dur, open: (sc.persist ?? 'none') !== 'none', est: known === undefined };
  });
}

/** the strip: one bar per scene, all on the same scale, so an overlap is visible as an overlap */
function stripHtml(app) {
  const s = app.sheet;
  const t = timeline(s.scenes);
  const lo = Math.min(0, ...t.map((x) => x.start));
  const hi = Math.max(lo + 500, ...t.map((x) => x.end));
  const span = hi - lo || 1;
  const at = (v) => ((v - lo) / span) * 100;
  const now = pickOf(app);
  const lanes = s.scenes.map(({ scene }, i) => {
    const x = t[i];
    const left = at(x.start);
    const width = Math.max(1.5, at(x.end) - left);
    const words = `Scene ${i + 1} starts at ${Math.round(x.start)} ms and runs ${x.est ? 'about ' : ''}${Math.round(x.dur)} ms${x.open ? ', then stays' : ''}${x.est ? ' (the file\'s own length is not known yet)' : ''}`;
    return `<div class="lane"><button type="button" class="bar" data-act="sh-pick" data-i="${i}" data-kind="${KIND_OF_SHAPE(scene.shape)}" data-est="${x.est}" data-open="${x.open}" data-now="${i === now}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%" data-tooltip="${esc(words)}" aria-label="${esc(words)}"></button></div>`;
  }).join('');
  return `<div class="strip"><div class="lanes">${lanes}</div><div class="axis"><span>0</span><span>${Math.round(hi)} ms</span></div></div>`;
}

/** the rail: one fixed row per scene — its number, a still, "Shape · place", when it starts, ▶ */
function railHtml(app) {
  const s = app.sheet;
  const t = timeline(s.scenes);
  const now = pickOf(app);
  const rows = s.scenes.map(({ scene }, i) => {
    const sc = withDefaults(scene);
    const place = scene.shape === 'move' ? 'the chosen spot' : PLACE_WORDS[sc.to ?? sc.at] ?? '';
    const why = playWhy(app, scene);
    return `<div class="row" data-kind="${KIND_OF_SHAPE(scene.shape)}" data-now="${i === now}">
      <button type="button" class="pickbtn" data-act="sh-pick" data-i="${i}" aria-current="${i === now}">
        <span class="num">${i + 1}</span>${thumbHtml(scene)}
        <span class="n">${esc(SHAPE_WORDS[scene.shape] ?? scene.shape)}${place ? ` · ${esc(place)}` : ''}</span>
        <span class="ms">${Math.round(t[i].start)}ms</span>
      </button>
      <button type="button" class="quiet play" data-act="sh-play-scene" data-i="${i}" data-tooltip="${esc(why ?? `Play scene ${i + 1} now. Nothing is saved.`)}" aria-label="Play scene ${i + 1}" ${why ? 'disabled' : ''}>▶</button>
    </div>`;
  }).join('');
  return `<div class="rail">${rows || '<p class="note">No scenes yet.</p>'}</div>`;
}

/** the five band tabs; the last is named for the shape, and is off when the shape has no knobs of its own */
function bandTabs(scene, band) {
  const own = shapeCells(scene?.shape).length > 0;
  const tabs = [['picture', 'Picture'], ['timing', 'Timing'], ['sound', 'Sound'], ['placement', 'Placement'], ['shape', SHAPE_WORDS[scene?.shape] ?? 'Shape']];
  return `<div class="bandtabs" role="tablist">${tabs.map(([id, w]) => {
    const off = id === 'shape' && !own;
    return `<button type="button" role="tab" class="pill" aria-selected="${band === id && !off}" data-act="sh-band" data-band="${id}" ${off ? 'disabled' : ''}>${esc(w)}</button>`;
  }).join('')}</div>`;
}

function renderSequence(app) {
  const s = app.sheet;
  if (s.off) return `<p class="note off-note">Switched off: this FX plays nothing, and the abilities it answers fall through to nothing. Switch it back on to write its sequence — the ${s.scenes.length} scene${s.scenes.length === 1 ? '' : 's'} it had ${s.scenes.length === 1 ? 'is' : 'are'} kept until you do.</p>`;
  const copy = s.edit && !s.scenes.length ? `<div class="field search copy"><label>Copy from</label><input type="text" class="sh-like" placeholder="Search FX… Misty Step, Fire Bolt" autocomplete="off"><div class="suggest" data-open="false"></div></div>` : '';
  const add = s.edit ? `<div class="pills add"><span class="lbl">Add</span>${Object.entries(SHAPE_WORDS).filter(([sh]) => sh !== 'custom').map(([sh, wd]) => `<button type="button" class="pill" data-act="cw-add" data-shape="${sh}" data-tooltip="${esc(SHAPE_HELP[sh])}">${wd}</button>`).join('')}</div>` : '';
  if (!s.scenes.length) return `<div class="seq"><div class="railside">${railHtml(app)}</div><div class="inspector empty"><p class="note">No scenes yet. Copy the scenes of an FX you like, or add one.</p></div></div>${copy}${add}`;
  return `<div class="seq"><div class="railside">${railHtml(app)}${stripHtml(app)}</div>${inspector(app)}</div>${copy}${add}`;
}

// -----------------------------------------------------------------------------------------------
// the inspector: one scene, five bands, each the same 4×2 grid of eight cells
// -----------------------------------------------------------------------------------------------
/** the eight addresses of each band, in one order, for every shape (R1) */
const BAND_CELLS = {
  picture: ['vfx', 'place', 'size', 'opacity', 'tint', 'below', 'mirror', 'scatter'],
  timing: ['delay', 'times', 'every', 'rate', 'fadein', 'fadeout', 'lasts', 'hold'],
  sound: ['sfx', 'volume', 'start', 'sdelay', 'stimes', 'severy'],
  placement: ['rotate', 'anchor', 'elevation', 'zindex', 'mask', 'attach', 'abovelight', 'xray'],
};
/** the shape band is the shape's own knobs; it is padded to eight so the frame never resizes */
const SHAPE_CELLS = {
  strike: ['onmiss', 'thrown', 'reach'],
  shoot: ['onmiss', 'return', 'cleartemplate'],
  mark: ['onmiss', 'follow', 'face'],
  fill: ['cleartemplate'],
  aura: ['breathe', 'pulse'],
  move: ['range', 'spot', 'jump', 'fade', 'pick', 'speed', 'after'],
  beam: [], sound: [], custom: [],
};
const shapeCells = (shape) => SHAPE_CELLS[shape] ?? [];
/** the cells of a band, padded to eight (the SFX cell is two wide, so its band holds seven) */
function cellsOf(band, shape) {
  const list = band === 'shape' ? shapeCells(shape) : BAND_CELLS[band] ?? [];
  const wanted = band === 'sound' ? 7 : 8;
  return [...list, ...Array(Math.max(0, wanted - list.length)).fill('spacer')];
}

/** one cell. `na` greys it and switches it off IN PLACE; a cell is never dropped (R1). */
const field = (col, label, ctrl, na = false, wide = false) => `<div class="f f-${col}${wide ? ' wide' : ''}"${na ? ' data-na="true"' : ''}><span class="l">${label}</span><div class="c">${ctrl}</div></div>`;
const placeOptions = (current) => PLACES.filter((p) => !['impact', 'area'].includes(p) || p === current).map((p) => `<option value="${p}"${p === current ? ' selected' : ''}>${esc(PLACE_WORDS[p])}</option>`).join('');
const options = (list, cur) => list.map(([v, w]) => `<option value="${esc(String(v))}"${String(cur) === String(v) ? ' selected' : ''}>${esc(w)}</option>`).join('');

function inspector(app) {
  const s = app.sheet;
  const i = pickOf(app);
  const x = s.scenes[i];
  const scene = x.scene;
  const band = shapeCells(scene.shape).length || s.band !== 'shape' ? s.band : 'picture';
  const kind = KIND_OF_SHAPE(scene.shape);
  const locked = !s.edit;
  const last = s.scenes.length - 1;
  const tools = locked ? '' : `<button type="button" class="quiet" data-act="cw-up" data-i="${i}" aria-label="Up" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="quiet" data-act="cw-down" data-i="${i}" aria-label="Down" ${i === last ? 'disabled' : ''}>↓</button><button type="button" class="quiet drop" data-act="cw-drop" data-i="${i}" aria-label="Remove scene">✕</button>`;
  const cells = cellsOf(band, scene.shape).map((key) => cellHtml(app, key, scene, i)).join('');
  return `<div class="inspector" data-kind="${kind}" data-band="${band}">
    <div class="ihead"><span class="num">${i + 1}</span><span class="kind">${esc(SHAPE_WORDS[scene.shape] ?? scene.shape)}${KIND_TITLE[kind] ? ` · ${KIND_TITLE[kind]}` : ''}</span><div class="tools">${tools}</div></div>
    ${bandTabs(scene, band)}
    <div class="knobs">${cells}</div>
    <div class="line">${esc(sceneWords(scene))}</div>
  </div>`;
}

/**
 * One cell of the inspector. Which cells a shape reads comes from KNOBS (core/fx.js) and from
 * nothing else — there is no table here to fall out of step with the grammar. A cell the shape
 * does not read, or that means nothing yet (Every while Times is 1, Hold next on the last scene),
 * is greyed and switched off where it stands.
 */
function cellHtml(app, key, scene, i) {
  const a = api();
  const s = app.sheet;
  const sc = withDefaults(scene);
  const locked = !s.edit;
  const may = (k) => (KNOBS[scene.shape] ?? []).includes(k);
  const dis = (on) => (!on || locked ? 'disabled' : '');
  const naDis = (on) => (on ? '' : 'disabled');
  const isSound = scene.shape === 'sound';
  const snd = isSound ? scene : (scene.sound ?? null);
  const hasSound = isSound || !!scene.sound?.asset;
  const num = (cls, on, value, extra = '') => `<input type="number" class="${cls}" data-i="${i}" value="${esc(String(value))}" ${extra} ${dis(on)}>`;
  const check = (cls, on, checked, words) => `<label class="check"><input type="checkbox" class="${cls}" data-i="${i}" ${checked ? 'checked' : ''} ${dis(on)}> ${words}</label>`;
  const select = (cls, on, list, cur, label) => `<select class="${cls}" data-i="${i}" aria-label="${esc(label)}" ${dis(on)}>${options(list, cur)}</select>`;
  // a knob the sheet can show and clear but not yet write (thrown, return, breathe, pulse): what it
  // holds, in words, a door to the Library when it is an asset, and ✕. Writing one is the file's job.
  const compound = (col, label, on, slot, held, act) => {
    if (!held) return field(col, label, `<span class="suffix">${on ? 'none' : '—'}</span>`, !on);
    const words = slot ? assetWords(held) : String(held);
    const shown = slot
      ? `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="${slot}" data-tooltip="Asset Library">${esc(words)}</button>`
      : `<span class="suffix">${esc(words)}</span>`;
    return field(col, label, `${shown}${locked ? '' : `<button type="button" class="quiet" data-act="${act}" data-i="${i}" data-tooltip="Remove" aria-label="Remove">✕</button>`}`, !on);
  };

  switch (key) {
    // ---- Picture -----------------------------------------------------------------------------
    case 'vfx': {
      const on = may('asset') && !isSound;
      const r = on && scene.asset ? a.assets.resolve(scene.asset) : null;
      const path = r ? (r.path ?? (typeof r.file === 'string' ? r.file : '')) : '';
      const shown = pathWords(path) || 'No VFX';
      return field('vfx', 'VFX', !locked && on
        ? `<span class="search"><input type="text" class="cw-asset" data-i="${i}" value="${esc(pathWords(path))}" placeholder="VFX" aria-label="VFX" autocomplete="off"><div class="suggest" data-open="false"></div></span><button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="asset" data-tooltip="Asset Library">Browse</button>`
        : `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="asset" data-tooltip="Asset Library" ${naDis(on)}>${esc(shown)}</button>`, !on);
    }
    case 'place': {
      const travels = ['strike', 'shoot', 'beam'].includes(scene.shape);
      const stays = ['mark', 'aura'].includes(scene.shape);
      const on = travels || stays;
      return field('place', travels ? 'To' : stays ? 'At' : 'At / To',
        `<select class="cw-place" data-i="${i}" data-k="${travels ? 'to' : 'at'}" aria-label="${travels ? 'To' : 'At'}" ${dis(on)}>${placeOptions(travels ? sc.to : sc.at)}</select>`, !on);
    }
    case 'size': {
      const on = may('size') && !!sc.size;
      const size = sc.size ?? {};
      // the field says what the grammar says: tokens wide, squares around, squares wide, scaled by
      if (!on) return field('size', 'Size', `${num('cw-size', false, 1)}<span class="suffix">—</span>`, true);
      if (size.tokenWidths !== undefined) return field('size', 'Size', `${num('cw-size', on, size.tokenWidths, 'data-k="tokenWidths" min="0.1" step="0.25" aria-label="Size (tokens wide)"')}<span class="suffix">tokens wide</span>`);
      if (size.radius !== undefined) return field('size', 'Size', `${num('cw-size', on, size.radius, 'data-k="radius" min="0.5" step="0.5" aria-label="Size (squares around)"')}<span class="suffix">squares around</span>`);
      if (size.squares !== undefined) return field('size', 'Size', `${num('cw-size', on, size.squares, 'data-k="squares" min="0.5" step="0.5" aria-label="Size (squares wide)"')}<span class="suffix">squares wide</span>`);
      const fit = size.fit === 'object' ? 'the object' : 'the shape';
      if (size.scale && typeof size.scale === 'object') return field('size', 'Size', `${num('cw-size', on, size.scale.x ?? 1, 'data-k="scale.x" min="0.05" step="0.05" aria-label="Size across"')}${num('cw-size', on, size.scale.y ?? 1, 'data-k="scale.y" min="0.05" step="0.05" aria-label="Size down"')}<span class="suffix">× ${fit}</span>`);
      return field('size', 'Size', `${num('cw-size', on, size.scale ?? 1, 'data-k="scale" min="0.05" step="0.05" aria-label="Size"')}<span class="suffix">× ${fit}</span>`);
    }
    case 'opacity': {
      const on = may('opacity');
      return field('opacity', 'Opacity', `${num('cw-opacity', on, Math.round((sc.opacity ?? 1) * 100), 'min="0" max="100" step="5" aria-label="Opacity (%)"')}<span class="suffix">%</span>`, !on);
    }
    case 'tint': {
      const on = may('tint');
      const tint = scene.tint?.colour ?? '';
      return field('tint', 'Tint', !locked && on
        ? `<input type="color" class="cw-tint" data-i="${i}" value="${esc(tint || '#ffffff')}" aria-label="Tint">${tint ? `<button type="button" class="quiet" data-act="cw-tint-off" data-i="${i}" data-tooltip="No tint" aria-label="No tint">✕</button>` : '<span class="suffix">none</span>'}`
        : (tint ? `<span class="swatch" style="background:${esc(tint)}"></span><span class="suffix">${esc(tint)}</span>` : '<span class="suffix">none</span>'), !on);
    }
    case 'below': {
      const on = may('below');
      return field('below', 'Depth', check('cw-below', on, scene.below, 'under the tokens'), !on);
    }
    case 'mirror': {
      const on = may('mirror');
      return field('mirror', 'Mirror', select('cw-mirror', on, [['random', 'Randomly flipped'], ['none', 'Never flipped']], sc.mirror ?? 'random', 'Mirror'), !on);
    }
    case 'scatter': {
      const on = may('scatter');
      return field('scatter', 'Scatter', check('cw-scatter', on, scene.scatter, 'lands off centre'), !on);
    }

    // ---- Timing ------------------------------------------------------------------------------
    case 'delay': {
      const on = may('delay');
      return field('delay', 'Wait before', `${num('cw-delay', on, scene.delay ?? 0, 'min="0" step="50" aria-label="Wait before (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    case 'times': {
      const on = may('repeat');
      return field('times', 'Times', num('cw-times', on, sc.repeat ?? 1, 'min="1" step="1" aria-label="Times"'), !on);
    }
    case 'every': {
      const on = may('every') && (sc.repeat ?? 1) > 1;
      return field('every', 'Every', `${num('cw-every', on, sc.every ?? 250, 'min="0" step="50" aria-label="Every (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    case 'rate': {
      const on = may('rate');
      return field('rate', 'Speed', `${num('cw-rate', on, sc.rate ?? 1, 'min="0.1" step="0.25" aria-label="Speed"')}<span class="suffix">×</span>`, !on);
    }
    case 'fadein': {
      const on = may('fadeIn');
      return field('fadein', 'Fade in', `${num('cw-fadein', on, sc.fadeIn ?? 0, 'min="0" step="50" aria-label="Fade in (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    case 'fadeout': {
      const on = may('fadeOut');
      return field('fadeout', 'Fade out', `${num('cw-fadeout', on, sc.fadeOut ?? 0, 'min="0" step="50" aria-label="Fade out (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    case 'lasts': {
      const on = may('persist');
      return field('lasts', 'Lasts', select('cw-persist', on, Object.entries(PERSIST_WORDS), sc.persist ?? 'none', 'Lasts'), !on);
    }
    case 'hold': {
      // Hold next: the next scene waits for this one to finish, plus or minus the offset. It means
      // nothing on the last scene, so it greys where it stands.
      const on = may('wait') && i < s.scenes.length - 1;
      const held = !!scene.wait;
      const offset = typeof scene.wait === 'number' ? scene.wait : 0;
      return field('hold', 'Hold next', `${check('cw-hold', on, held, 'waits for this')}${num('cw-holdms', on && held, offset, 'step="50" aria-label="Hold next (ms)"')}<span class="suffix">ms</span>`, !on);
    }

    // ---- Sound -------------------------------------------------------------------------------
    case 'sfx': {
      const on = isSound ? may('asset') : may('sound');
      const asset = isSound ? scene.asset : scene.sound?.asset;
      const r = on && asset ? a.assets.resolve(asset) : null;
      const words = r ? (pathWords(r.path ?? '') || (typeof r.file === 'string' ? r.file.split('/').pop() : '') || (r.paths ? `one of ${r.paths.length}` : 'SFX')) : 'No SFX';
      const clear = !locked && on && !isSound && scene.sound ? `<button type="button" class="quiet" data-act="cw-sound-off" data-i="${i}" data-tooltip="No SFX" aria-label="No SFX">✕</button>` : '';
      return field('sfx', 'SFX', `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="sound" data-tooltip="Asset Library" ${naDis(on)}>${esc(words)}</button>${!locked && on ? `<button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="sound" data-tooltip="Asset Library">Browse</button>${clear}` : ''}`, !on, true);
    }
    case 'volume': {
      const on = hasSound && (isSound ? may('volume') : true);
      return field('volume', 'Volume', `${num('cw-volume', on, Math.round((snd?.volume ?? 0.75) * 100), 'min="0" max="100" step="5" aria-label="Volume (%)"')}<span class="suffix">%</span>`, !on);
    }
    case 'start': {
      const on = hasSound;
      return field('start', 'Start at', `${num('cw-start', on, snd?.start ?? 0, 'min="0" step="50" aria-label="Start at (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    case 'sdelay': {
      // for a sound scene these are the scene's own knobs and live in Timing; here they grey
      const on = hasSound && !isSound;
      return field('sdelay', 'SFX wait', `${num('cw-sdelay', on, scene.sound?.delay ?? 0, 'min="0" step="50" aria-label="SFX wait before (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    case 'stimes': {
      const on = hasSound && !isSound;
      return field('stimes', 'SFX times', num('cw-stimes', on, scene.sound?.repeat ?? 1, 'min="1" step="1" aria-label="SFX times"'), !on);
    }
    case 'severy': {
      const on = hasSound && !isSound && (scene.sound?.repeat ?? 1) > 1;
      return field('severy', 'SFX every', `${num('cw-severy', on, scene.sound?.every ?? 250, 'min="0" step="50" aria-label="SFX every (ms)"')}<span class="suffix">ms</span>`, !on);
    }

    // ---- Placement ---------------------------------------------------------------------------
    case 'rotate': {
      const on = may('rotate');
      const byPos = scene.rotate === 'by-position';
      return field('rotate', 'Rotate', `${num('cw-rotate', on && !byPos, typeof scene.rotate === 'number' ? scene.rotate : 0, 'step="15" aria-label="Rotate (degrees)"')}<span class="suffix">°</span>${check('cw-rotpos', on, byPos, 'by position')}`, !on);
    }
    case 'anchor': {
      const on = may('anchor');
      const anc = sc.anchor ?? { x: 0.5, y: 0.5 };
      return field('anchor', 'Anchor', `${num('cw-anchor', on, anc.x, 'data-k="x" min="0" max="1" step="0.05" aria-label="Anchor across"')}${num('cw-anchor', on, anc.y, 'data-k="y" min="0" max="1" step="0.05" aria-label="Anchor down"')}`, !on);
    }
    case 'elevation': {
      const on = may('elevation');
      const el = scene.elevation ?? null;
      return field('elevation', 'Elevation', `${num('cw-elev', on, el?.level ?? 0, 'step="1" aria-label="Elevation"')}${check('cw-elev-abs', on && !!el, el?.absolute, 'absolute')}`, !on);
    }
    case 'zindex': {
      const on = may('zIndex');
      return field('zindex', 'Draw order', num('cw-zindex', on, sc.zIndex ?? 0, 'step="1" aria-label="Draw order"'), !on);
    }
    case 'mask': {
      const on = may('mask');
      return field('mask', 'Mask', check('cw-mask', on, scene.mask, 'to the template'), !on);
    }
    case 'attach': {
      const on = may('attach');
      const at = scene.attach ?? null;
      return field('attach', 'Attach', `${check('cw-attach-alpha', on, at?.alpha, 'alpha')}${check('cw-attach-vis', on, at?.visibility, 'visible')}`, !on);
    }
    case 'abovelight': {
      const on = may('aboveLighting');
      return field('abovelight', 'Above lighting', check('cw-abovelight', on, scene.aboveLighting, 'over the light'), !on);
    }
    case 'xray': {
      const on = may('xray');
      return field('xray', 'Through walls', check('cw-xray', on, scene.xray, 'seen through walls'), !on);
    }

    // ---- the shape's own -----------------------------------------------------------------------
    case 'onmiss': {
      const on = may('onMiss');
      const list = scene.shape === 'shoot' ? [['fly-past', MISS_WORDS['fly-past']], ['play', MISS_WORDS.play], ['skip', MISS_WORDS.skip]] : [['play', MISS_WORDS.play], ['skip', MISS_WORDS.skip]];
      return field('onmiss', 'On miss', select('cw-onmiss', on, list, sc.onMiss ?? 'play', 'On miss'), !on);
    }
    case 'thrown': return compound('thrown', 'Thrown', may('thrown'), 'thrown', scene.thrown?.asset, 'cw-thrown-off');
    case 'reach': {
      const on = may('thrown') && !!scene.thrown;
      return field('reach', 'Reach', `${num('cw-reach', on, scene.thrown?.reach ?? 5, 'min="5" step="5" aria-label="Reach (ft)"')}<span class="suffix">ft</span>`, !on);
    }
    case 'return': return compound('return', 'Return', may('return'), 'return', scene.return?.asset, 'cw-return-off');
    case 'cleartemplate': {
      const on = may('clearTemplate');
      return field('cleartemplate', 'Clear template', check('cw-cleartemplate', on, scene.clearTemplate, 'when it has played'), !on);
    }
    case 'follow': {
      const on = may('follow');
      return field('follow', 'Follow', check('cw-follow', on, scene.follow, 'moves with the token'), !on);
    }
    case 'face': {
      const on = may('face');
      return field('face', 'Face', check('cw-face', on, scene.face === 'away-from-source', 'away from the caster'), !on);
    }
    case 'breathe': return compound('breathe', 'Breathe', may('breathe'), null, scene.breathe ? `${scene.breathe.min ?? 0}–${scene.breathe.max ?? 0} every ${scene.breathe.every ?? 0} ms` : null, 'cw-breathe-off');
    case 'pulse': return compound('pulse', 'Pulse', may('pulse'), null, scene.pulse ? `${scene.pulse.min ?? 0}–${scene.pulse.max ?? 0} every ${scene.pulse.every ?? 0} ms` : null, 'cw-pulse-off');
    case 'range': {
      const on = may('range');
      return field('range', 'Range', `${num('cw-range', on, sc.range ?? 30, 'min="5" step="5" aria-label="Range (ft)"')}<span class="suffix">ft</span>`, !on);
    }
    case 'spot': {
      const on = may('seen') || may('unoccupied');
      const spot = sc.seen && sc.unoccupied ? 'seen-unoccupied' : sc.seen ? 'seen' : sc.unoccupied ? 'unoccupied' : 'any';
      return field('spot', 'Spot', select('cw-spot', on, [['seen-unoccupied', 'to an unoccupied space they can see'], ['unoccupied', 'to an unoccupied space, seen or not'], ['seen', 'to a space they can see'], ['any', 'to any space']], spot, 'Spot'), !on);
    }
    case 'jump': {
      const on = may('jump');
      return field('jump', 'Travel or jump', select('cw-jump', on, [['true', 'Appears there'], ['false', 'Travels there']], String(sc.jump ?? true), 'Travel or jump'), !on);
    }
    case 'fade': {
      const on = may('fade');
      return field('fade', 'Fade', check('cw-fade', on, scene.fade, 'fades out and in'), !on);
    }
    case 'pick': {
      const on = may('pick');
      return field('pick', 'Chosen by', select('cw-pick', on, [['click', 'a click on the canvas'], ['movement', 'the token\'s own move']], sc.pick ?? 'click', 'Chosen by'), !on);
    }
    case 'speed': {
      const on = may('speed') && !sc.jump;
      return field('speed', 'Travel speed', num('cw-speed', on, sc.speed ?? 120, 'min="1" step="10" aria-label="Travel speed"'), !on);
    }
    case 'after': {
      const on = may('after');
      return field('after', 'Before moving', `${num('cw-after', on, sc.after ?? 0, 'min="0" step="50" aria-label="Before moving (ms)"')}<span class="suffix">ms</span>`, !on);
    }
    default: return field('spacer', '', '', true);
  }
}

// -----------------------------------------------------------------------------------------------
// after the render: the strip needs the pictures' own lengths, which only the browser knows
// -----------------------------------------------------------------------------------------------
/**
 * Ask each still how long its file runs, once per file, and redraw the strip when an answer comes
 * back. Until then the bar is drawn at a nominal length and marked an estimate — the sheet never
 * states a duration it has not been told.
 */
export function hydrateSheet(app) {
  const root = app.element;
  if (!root) return;
  for (const v of root.querySelectorAll('video[data-file]')) {
    const file = v.dataset.file;
    if (!file || ASKED.has(file)) continue;
    ASKED.add(file);
    const read = () => {
      const d = Number(v.duration);
      if (!Number.isFinite(d) || d <= 0) return;
      DURATIONS.set(file, Math.round(d * 1000));
      clearTimeout(app._stripTimer);
      app._stripTimer = setTimeout(() => { if (app.view?.tab === 'editor' && app.sheet) app.render(); }, 150);
    };
    if (v.readyState >= 1) read(); else v.addEventListener('loadedmetadata', read, { once: true });
  }
}

// -----------------------------------------------------------------------------------------------
// events (the window routes every act that starts with sh- or cw- here)
// -----------------------------------------------------------------------------------------------
/**
 * Play an FX once on the selected token through the API, saving nothing. Says what happened: a
 * move with no destination arms the canvas click and plays from there (render.js).
 */
export async function previewFx(app, fx, what) {
  const a = api();
  const source = canvas?.tokens?.controlled?.[0] ?? null;
  if (!source) return app.toast('Select a token to play from.');
  const place = canvas.regions?.controlled?.[0]?.document ?? null;
  let r;
  try { r = await a.preview(fx, { source, targets: [...(game.user.targets ?? [])], place }); }
  catch (e) { return app.toast(`Could not play it: ${e.message}`); }
  if (!r.ok) return app.toast(r.problems.join(' '));
  if (r.entry?.played) return app.toast(`Playing ${what}. Nothing was saved.`);
  // a move with no destination is not a failure: the canvas is armed and the FX plays from the click
  if (/destination click/.test(r.entry?.why ?? '')) return app.toast(`Click a spot on the canvas to play ${what}.`);
  return app.toast(`Nothing played: ${r.entry?.why ?? 'nothing to play'}.`);
}

/** the library path one slot of a scene names, or null */
function slotPath(s, i, slot) {
  const a = api();
  const x = s.scenes[i];
  if (!x) return null;
  const scene = x.scene;
  const asset = slot === 'sound' ? (scene.shape === 'sound' ? scene.asset : scene.sound?.asset)
    : slot === 'thrown' ? scene.thrown?.asset
      : slot === 'return' ? scene.return?.asset
        : scene.asset;
  if (!asset) return null;
  const r = a.assets.resolve(asset);
  // some migrated rows keep a library path under "file"; a slashless file is a path
  return r.path ?? (typeof r.file === "string" && !r.file.includes("/") ? r.file : null);
}

export async function onSheetClick(app, b, act) {
  const a = api();
  if (act === 'sh-new') { if (!(await leaveSheet(app))) return undefined; openSheet(app, {}); return app.render(); }
  const s = app.sheet;
  if (!s) return undefined;
  const i = Number(b.dataset.i);
  const x = s.scenes[i];
  switch (act) {
    case 'sh-back': { if (!(await leaveSheet(app))) return undefined; app.view.tab = s.cameFrom ?? 'fx'; break; }
    case 'sh-cancel': { if (s.id) openSheet(app, { id: s.id, subject: s.subject }); else { app.sheet = null; app.view.tab = s.cameFrom ?? 'fx'; } app.toast('Changes dropped.'); break; }
    case 'sh-save': return saveSheet(app);
    case 'sh-dup': { openSheet(app, { subject: s.subject, from: s.id }); app.sheet.cameFrom = s.cameFrom; app.toast(`Copy of ${idWords(s.id)}. Add its hook, then Save.`); break; }
    case 'sh-export': return app.exportFx(s.id);
    case 'sh-delete': {
      const under = s.source === 'world' && (a.corpora.house.some((h) => h.id === s.id) || a.corpora.stock.some((b2) => b2.id === s.id));
      if (under) { await app.removeFx(s.id); openSheet(app, { id: s.id }); break; }
      // deleteFx unpins whatever pointed at it — what the detail pane's Revert used to do by hand
      await app.deleteFx(s.id);
      if (!a.fx.get(s.id)) { app.sheet = null; app.view.tab = s.cameFrom ?? 'fx'; }
      break;
    }
    case 'sh-key-del': s.keys = s.keys.filter((k) => k !== b.dataset.key); s.newKeys = s.newKeys.filter((k) => k !== b.dataset.key); break;
    case 'sh-key-hit': { const e = app.entries[i]; if (e) for (const k of e.keys.filter((y) => !y.includes('/'))) if (!s.keys.includes(k)) s.keys.push(k); if (!s.subject && e) s.subject = app.subjectFromEntry(e); s.keyQuery = ''; s.onlyThis = false; break; }
    case 'sh-key-new': { const k = `spell:${slug(b.dataset.name)}`; if (!s.keys.includes(k)) { s.keys.push(k); s.newKeys.push(k); } if (!s.subject) s.subject = app.subjectNew(b.dataset.name); s.keyQuery = ''; s.onlyThis = false; break; }
    case 'sh-kind': { const last = s.newKeys[s.newKeys.length - 1]; const p = parseKey(last); if (!p) break; const k = `${b.dataset.kind}:${p.id}`; s.keys = s.keys.map((y) => (y === last ? k : y)); s.newKeys = s.newKeys.map((y) => (y === last ? k : y)); if (s.subject?.isNew) s.subject = app.subjectNew(s.subject.name, b.dataset.kind); s.on = b.dataset.kind === 'effect' ? 'effect' : s.on; break; }
    case 'sh-only': s.onlyThis = true; break;
    case 'sh-global': s.onlyThis = false; s.itemQuery = null; break;
    case 'sh-pick-item': s.itemQuery = s.itemQuery === null ? '' : null; break;
    case 'sh-item-hit': { const item = fromUuidSync(b.dataset.uuid); if (item) { s.subject = app.subjectFromItem(item); s.onlyThis = true; } s.itemQuery = null; break; }
    // --- the rail and the inspector (HANDOFF step 4) ---
    case 'sh-pick': s.pick = i; if (s.band === 'shape' && !shapeCells(s.scenes[i]?.scene.shape).length) s.band = 'picture'; break;
    case 'sh-band': s.band = b.dataset.band; break;
    // --- Play (HANDOFF step 2) ---
    case 'sh-play': { const fx = safeDraft(app); if (!fx) return app.toast('Nothing to play yet.'); return previewFx(app, fx, sheetName(app)); }
    case 'sh-play-scene': {
      if (!x) return undefined;
      return previewFx(app, { id: 'preview', on: s.on, scenes: [clone(x.scene)] }, `scene ${i + 1}`);
    }
    case 'sh-off': s.off = b.dataset.v === 'true'; break;
    case 'sh-on': s.on = b.dataset.on; break;
    case 'sh-like-hit': s.from = b.dataset.id; s.scenes = seedFrom(b.dataset.id); s.pick = 0; break;
    case 'cw-add': {
      // the starter is a stencil: its scene is stamped out and the FX owns the copy
      const stencil = a.fx.scenesOf(STARTER_OF_SHAPE[b.dataset.shape]);
      const scene = stencil.find((sc) => sc.shape === b.dataset.shape) ?? stencil[0];
      if (scene) { s.scenes.push({ scene: named(scene) }); s.pick = s.scenes.length - 1; s.band = 'picture'; }
      break;
    }
    case 'cw-drop': s.scenes.splice(i, 1); s.pick = Math.max(0, Math.min(s.pick, s.scenes.length - 1)); break;
    case 'cw-up': if (i > 0) { [s.scenes[i - 1], s.scenes[i]] = [s.scenes[i], s.scenes[i - 1]]; s.pick = i - 1; } break;
    case 'cw-down': if (i < s.scenes.length - 1) { [s.scenes[i + 1], s.scenes[i]] = [s.scenes[i], s.scenes[i + 1]]; s.pick = i + 1; } break;
    case 'cw-browse': if (!s.edit) return undefined; openPicker(app, i, b.dataset.slot, slotPath(s, i, b.dataset.slot)); break;
    case 'cw-show': openPicker(app, i, b.dataset.slot, slotPath(s, i, b.dataset.slot), true); break;
    case 'cw-tint-off': if (x) delete x.scene.tint; break;
    case 'cw-sound-off': if (x) delete x.scene.sound; break;
    case 'cw-thrown-off': if (x) delete x.scene.thrown; break;
    case 'cw-return-off': if (x) delete x.scene.return; break;
    case 'cw-breathe-off': if (x) delete x.scene.breathe; break;
    case 'cw-pulse-off': if (x) delete x.scene.pulse; break;
    case 'cw-asset-hit': if (x) x.scene.asset = { path: b.dataset.path }; break;
    case 'cw-sound-hit': {
      if (x) { if (x.scene.shape === 'sound') x.scene.asset = { path: b.dataset.path }; else x.scene.sound = { ...(x.scene.sound ?? {}), asset: b.dataset.path }; }
      break;
    }
    default: return undefined;
  }
  return app.render();
}

export function onSheetInput(app, el) {
  const a = api();
  const s = app.sheet;
  if (!s) return;
  const box = el.parentElement?.querySelector('.suggest');
  const open = (html) => { if (!box) return; box.innerHTML = html; box.dataset.open = html ? 'true' : 'false'; };
  const q = el.value.trim();
  if (el.classList.contains('sh-key-q')) {
    s.keyQuery = el.value;
    if (!q) return open('');
    const hits = app.searchHits(q);
    return open(hits.map(({ e, i }) => `<div class="hit" data-act="sh-key-hit" data-i="${i}"><span>${dot(e.status)}${esc(e.name)}${e.effect ? ' <span class="note">effect</span>' : ''}</span><span class="o">${esc(app.hitWhere(e))}</span></div>`).join('')
      + `<div class="hit" data-act="sh-key-new" data-name="${esc(q)}"><span class="o">New ability: “${esc(q)}”</span></div>`);
  }
  if (el.classList.contains('sh-item-q')) {
    s.itemQuery = el.value;
    const hits = itemHits(app, q);
    return open(hits.map((e) => `<div class="hit" data-act="sh-item-hit" data-uuid="${esc(e.uuid)}"><span>${dot(e.status)}${esc(e.owner)} · ${esc(e.name)}</span><span class="o">${esc(app.hitWhere(e))}</span></div>`).join('') || '<div class="hit"><span class="o">No item of that name on an actor</span></div>');
  }
  if (el.classList.contains('sh-like')) {
    const hits = app.likeHits(q).filter((h) => h.tag !== 'starter');
    return open(hits.map((h) => `<div class="hit" data-act="sh-like-hit" data-id="${esc(h.id)}"><span>${esc(h.words)}${h.keys ? ` <span class="note">· ${esc(h.keys.slice(0, 60))}</span>` : ''}</span><span class="o">${esc(h.tag)}</span></div>`).join('') || '<div class="hit"><span class="o">No match</span></div>');
  }
  if (el.classList.contains('cw-asset')) {
    if (q.length < 2) return open('');
    const hits = a.assets.search(q, { roots: ['jb2a'], limit: 30 });
    return open(hits.map((h) => `<div class="hit" data-act="cw-asset-hit" data-i="${el.dataset.i}" data-path="${esc(h.colours.length ? `${h.path}.${h.colours[0]}` : h.path)}"><span>${esc(pathWords(h.path))}</span><span class="o">${h.colours.length ? `${h.colours.length} colour${h.colours.length === 1 ? '' : 's'}` : '1 colour'}</span></div>`).join('') || '<div class="hit"><span class="o">No match</span></div>');
  }
  if (el.classList.contains('sh-note')) { s.note = el.value; }
}

/** a number knob: written when it says something, dropped when it says what the shape already says */
function setNum(scene, key, value, fallback) {
  if (!Number.isFinite(value) || value === fallback) delete scene[key];
  else scene[key] = value;
}

export function onSheetChange(app, el) {
  const s = app.sheet;
  if (!s) return undefined;
  if (el.classList.contains('sh-edit')) {
    if (!el.checked) { return leaveSheet(app).then((ok) => { if (ok && app.sheet) app.sheet.edit = false; return app.render(); }); }
    s.edit = true; s.snapshot = JSON.stringify(safeDraft(app)); return app.render();
  }
  const x = s.scenes[Number(el.dataset.i)];
  if (!x) return undefined;
  const scene = x.scene;
  const def = withDefaults({ shape: scene.shape });
  const n = Number(el.value);
  const cls = (name) => el.classList.contains(name);
  const sound = (k, v) => { scene.sound = { ...(scene.sound ?? {}), [k]: v }; };

  // ---- Picture ----
  if (cls('cw-place')) { scene[el.dataset.k] = el.value; return app.render(); }
  if (cls('cw-size')) {
    const size = { ...(withDefaults(scene).size ?? {}) };
    const k = el.dataset.k;
    if (!(n > 0)) return app.render();
    if (k === 'scale.x' || k === 'scale.y') { const sc = typeof size.scale === 'object' ? { ...size.scale } : { x: size.scale ?? 1, y: size.scale ?? 1 }; sc[k.slice(-1)] = n; size.scale = sc; }
    else size[k] = n;
    scene.size = size;
    return app.render();
  }
  if (cls('cw-opacity')) { const v = Math.min(100, Math.max(0, Math.round(n || 0))); setNum(scene, 'opacity', v / 100, 1); return app.render(); }
  if (cls('cw-tint')) { scene.tint = { ...(scene.tint ?? {}), colour: el.value }; return app.render(); }
  if (cls('cw-below')) { if (el.checked) scene.below = true; else delete scene.below; return app.render(); }
  if (cls('cw-mirror')) { if (el.value === (def.mirror ?? 'random')) delete scene.mirror; else scene.mirror = el.value; return app.render(); }
  if (cls('cw-scatter')) { if (el.checked) scene.scatter = true; else delete scene.scatter; return app.render(); }

  // ---- Timing ----
  if (cls('cw-delay')) { setNum(scene, 'delay', Math.max(0, Math.round(n || 0)), 0); return app.render(); }
  if (cls('cw-times')) { const v = Math.max(1, Math.round(n || 1)); if (v > 1) scene.repeat = v; else { delete scene.repeat; delete scene.every; } return app.render(); }
  if (cls('cw-every')) { setNum(scene, 'every', Math.max(0, Math.round(n || 0)), def.every ?? 250); return app.render(); }
  if (cls('cw-rate')) { setNum(scene, 'rate', n, 1); return app.render(); }
  if (cls('cw-fadein')) { setNum(scene, 'fadeIn', Math.max(0, Math.round(n || 0)), def.fadeIn ?? 0); return app.render(); }
  if (cls('cw-fadeout')) { setNum(scene, 'fadeOut', Math.max(0, Math.round(n || 0)), def.fadeOut ?? 0); return app.render(); }
  if (cls('cw-persist')) { if (el.value === 'none') delete scene.persist; else scene.persist = el.value; return app.render(); }
  if (cls('cw-hold')) { if (el.checked) scene.wait = true; else delete scene.wait; return app.render(); }
  if (cls('cw-holdms')) { const v = Math.round(n || 0); scene.wait = v === 0 ? true : v; return app.render(); }

  // ---- Sound ----
  if (cls('cw-volume')) { const v = Math.min(100, Math.max(0, Math.round(n || 0))) / 100; if (scene.shape === 'sound') setNum(scene, 'volume', v, 0.75); else sound('volume', v); return app.render(); }
  if (cls('cw-start')) { const v = Math.max(0, Math.round(n || 0)); if (scene.shape === 'sound') setNum(scene, 'start', v, 0); else sound('start', v); return app.render(); }
  if (cls('cw-sdelay')) { sound('delay', Math.max(0, Math.round(n || 0))); return app.render(); }
  if (cls('cw-stimes')) { sound('repeat', Math.max(1, Math.round(n || 1))); return app.render(); }
  if (cls('cw-severy')) { sound('every', Math.max(0, Math.round(n || 0))); return app.render(); }

  // ---- Placement ----
  if (cls('cw-rotate')) { if (scene.rotate === 'by-position') return app.render(); setNum(scene, 'rotate', Math.round(n || 0), 0); return app.render(); }
  if (cls('cw-rotpos')) { if (el.checked) scene.rotate = 'by-position'; else delete scene.rotate; return app.render(); }
  if (cls('cw-anchor')) { const anc = { ...(withDefaults(scene).anchor ?? { x: 0.5, y: 0.5 }) }; anc[el.dataset.k] = Math.min(1, Math.max(0, n || 0)); scene.anchor = anc; return app.render(); }
  if (cls('cw-elev')) { const v = Math.round(n || 0); if (v === 0 && !scene.elevation?.absolute) delete scene.elevation; else scene.elevation = { ...(scene.elevation ?? {}), level: v }; return app.render(); }
  if (cls('cw-elev-abs')) { if (!scene.elevation) return app.render(); if (el.checked) scene.elevation = { ...scene.elevation, absolute: true }; else delete scene.elevation.absolute; return app.render(); }
  if (cls('cw-zindex')) { setNum(scene, 'zIndex', Math.round(n || 0), def.zIndex ?? 0); return app.render(); }
  if (cls('cw-mask')) { if (el.checked) scene.mask = true; else delete scene.mask; return app.render(); }
  if (cls('cw-attach-alpha') || cls('cw-attach-vis')) {
    const at = { alpha: !!scene.attach?.alpha, visibility: !!scene.attach?.visibility };
    at[cls('cw-attach-alpha') ? 'alpha' : 'visibility'] = el.checked;
    if (!at.alpha && !at.visibility) delete scene.attach; else scene.attach = at;
    return app.render();
  }
  if (cls('cw-abovelight')) { if (el.checked) scene.aboveLighting = true; else delete scene.aboveLighting; return app.render(); }
  if (cls('cw-xray')) { if (el.checked) scene.xray = true; else delete scene.xray; return app.render(); }

  // ---- the shape's own ----
  if (cls('cw-onmiss')) { if (el.value === (def.onMiss ?? 'play')) delete scene.onMiss; else scene.onMiss = el.value; return app.render(); }
  if (cls('cw-reach')) { if (scene.thrown) scene.thrown = { ...scene.thrown, reach: Math.max(0, Math.round(n || 0)) }; return app.render(); }
  if (cls('cw-cleartemplate')) { if (el.checked) scene.clearTemplate = true; else delete scene.clearTemplate; return app.render(); }
  if (cls('cw-follow')) { if (el.checked) scene.follow = true; else delete scene.follow; return app.render(); }
  if (cls('cw-face')) { if (el.checked) scene.face = 'away-from-source'; else delete scene.face; return app.render(); }
  if (cls('cw-range')) { setNum(scene, 'range', n, def.range ?? 30); return app.render(); }
  if (cls('cw-spot')) {
    const seen = el.value === 'seen-unoccupied' || el.value === 'seen';
    const unoccupied = el.value === 'seen-unoccupied' || el.value === 'unoccupied';
    if (seen) delete scene.seen; else scene.seen = false;
    if (unoccupied) delete scene.unoccupied; else scene.unoccupied = false;
    return app.render();
  }
  if (cls('cw-jump')) { const v = el.value === 'true'; if (v === (def.jump ?? true)) delete scene.jump; else scene.jump = v; return app.render(); }
  // a fade written in full ({to, after, back}) is kept as it is: the box only turns it on and off
  if (cls('cw-fade')) { if (el.checked) { if (!scene.fade) scene.fade = true; } else delete scene.fade; return app.render(); }
  if (cls('cw-pick')) { if (el.value === (def.pick ?? 'click')) delete scene.pick; else scene.pick = el.value; return app.render(); }
  if (cls('cw-speed')) { setNum(scene, 'speed', n, def.speed ?? 120); return app.render(); }
  if (cls('cw-after')) { setNum(scene, 'after', Math.max(0, Math.round(n || 0)), def.after ?? 0); return app.render(); }
  return undefined;
}

/** Enter in a search box takes the first hit */
export function onSheetKey(app, ev) {
  const el = ev.target;
  const s = app.sheet;
  if (!s || ev.key !== 'Enter') return false;
  if (el.classList.contains('sh-key-q')) {
    ev.preventDefault();
    const q = el.value.trim();
    if (!q) return true;
    const hits = app.searchHits(q);
    const exact = hits.find((h) => h.e.name.toLowerCase() === q.toLowerCase()) ?? hits[0];
    if (exact) { for (const k of exact.e.keys.filter((x) => !x.includes('/'))) if (!s.keys.includes(k)) s.keys.push(k); if (!s.subject) s.subject = app.subjectFromEntry(exact.e); }
    else { const k = `spell:${slug(q)}`; if (!s.keys.includes(k)) { s.keys.push(k); s.newKeys.push(k); } if (!s.subject) s.subject = app.subjectNew(q); }
    s.keyQuery = '';
    app.render();
    return true;
  }
  if (el.classList.contains('sh-item-q')) {
    ev.preventDefault();
    const first = itemHits(app, el.value)[0];
    if (first) { const item = fromUuidSync(first.uuid); if (item) { s.subject = app.subjectFromItem(item); s.onlyThis = true; } s.itemQuery = null; app.render(); }
    return true;
  }
  if (el.classList.contains('sh-like')) {
    ev.preventDefault();
    const hit = app.likeHits(el.value).filter((h) => h.tag !== 'starter')[0];
    if (hit) { s.from = hit.id; s.scenes = seedFrom(hit.id); s.pick = 0; app.render(); }
    return true;
  }
  return false;
}

async function saveSheet(app) {
  const a = api();
  const s = app.sheet;
  const problems = problemsOf(app);
  if (problems.length) return app.toast(problems[0]);
  const fx = draftFx(app);
  const r = await a.fx.save(fx, { by: game.user.name });
  if (!r.ok) return app.toast(r.problems.join(' '));
  const sub = s.subject;
  const item = sub?.uuid ? fromUuidSync(sub.uuid) : null;
  if (s.onlyThis && item) await item.setFlag(MODULE_ID, 'fx', fx.id);
  else if (item && sub.pointer === fx.id && !s.onlyThis) await item.unsetFlag(MODULE_ID, 'fx');
  app.refresh();
  // what was saved is what the FX tab's pane is on, so Back lands on it
  app.view.fxSel = fx.id;
  const name = sheetName(app);
  const pick = s.pick;
  const band = s.band;
  openSheet(app, { id: fx.id, subject: item ? app.subjectFromItem(item) : sub });
  app.sheet.cameFrom = s.cameFrom;
  app.sheet.pick = pick;
  app.sheet.band = band;
  await app.render();
  return app.toast(`Saved: ${name} (${SOURCE_TAG.world}).`);
}
