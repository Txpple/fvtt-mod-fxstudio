// The FX sheet (ruled 2026-09-06 off prototypes/fxstudio5-editor.html, the wizard retired): one
// screen per FX, the same whether it is read or changed. It opens from a row on Stock FX or
// House FX, from "Used in" on the Asset Library, from the Look up card, from Check, and from New
// FX. An Edit switch is the guard: off, the sheet is read-only and offers Duplicate, Export and
// Delete (or Revert, when a Draft sits over Stock or House); on, every control unlocks and the
// buttons are Cancel and Save. Save always writes a Draft (the world buffer) through the API —
// Stock and House files are never touched here. Three blocks: Hook (what it answers, one or
// more keys, or one item; plays or off; the moment; on miss; the outcomes waiting on phase 4),
// Sequence (one row per scene, in fixed rows of labelled knobs, the plain-English line under each —
// kept on the user's word — with wait, lasts and delay), Note. The draft is a plain fx in the
// grammar (core/fx.js); nothing is parsed from words.
//
// EVERY FX IS A FULL COPY (ruled 2026-09-07): no FX points at another one, so nothing here has to
// show, guard or preserve a reference. "Copy from" and Duplicate stamp the scenes out and the new
// FX owns them; changing it changes nothing else, and nothing it came from can orphan it.
import { MODULE_ID } from '../settings.js';
import { keyLabel, parseKey, slug } from '../core/subjects.js';
import { needsPlace } from '../core/corpus.js';
import { KNOBS, PLACES, PLACE_WORDS, pathWords, provenance, sceneWords, withDefaults } from '../core/fx.js';
import { HOOK_WORDS, KIND_WORDS, ON_WORDS, SOURCE_TAG, dot, esc, idWords } from './html.js';
import { openPicker } from './library.js';

const api = () => game.modules.get(MODULE_ID).api;
const SCALES = [[0.5, '50%'], [0.75, '75%'], [1, '100%'], [1.5, '150%'], [2, '200%']];
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
const canMiss = (scene) => ['strike', 'shoot', 'mark'].includes(scene.shape);
const hasPicture = (scene) => !['sound', 'move', 'custom'].includes(scene.shape);
const canPersist = (scene) => ['mark', 'fill', 'aura', 'beam'].includes(scene.shape);
const clone = (v) => JSON.parse(JSON.stringify(v));
const round = (n) => Math.round(n * 100) / 100;

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
  const s = { id: null, source: null, original: null, subject: null, keys: [], newKeys: [], on: 'use', onMiss: 'play', off: false, onlyThis: false, scenes: [], note: '', edit: !!edit, cameFrom: app.view.tab === 'editor' ? (app.sheet?.cameFrom ?? 'house') : app.view.tab, isNew: !id, from: null, snapshot: null, keyQuery: '' };
  const e = id ? a.fx.get(id) : null;
  if (e) {
    s.id = id; s.source = e.source; s.original = e.original;
    s.keys = [...(e.original.for ?? [])];
    s.on = e.original.on ?? 'use';
    s.off = !!e.original.off;
    s.note = e.original.note ?? '';
    s.scenes = seedFrom(id);
    if (s.scenes.some((x) => canMiss(x.scene) && withDefaults(x.scene).onMiss === 'skip')) s.onMiss = 'skip';
    s.subject = subject ?? app.subjectForFx(id);
    if (subject?.pointer === id) s.onlyThis = true;
  } else {
    s.subject = subject;
    if (subject) { const k = bareKey(subject); if (k) s.keys = [k]; s.on = subject.on ?? 'use'; if (subject.isNew) s.newKeys = [k]; }
    if (from && a.fx.get(from)) { s.from = from; s.scenes = seedFrom(from); if (s.scenes.some((x) => canMiss(x.scene) && withDefaults(x.scene).onMiss === 'skip')) s.onMiss = 'skip'; }
    if (scenes?.length) s.scenes = scenes.map((scene) => ({ scene: clone(scene), scale: 1 }));
    s.edit = true;
  }
  app.sheet = s;
  s.snapshot = JSON.stringify(safeDraft(app));
  app.view.tab = 'editor';
  return s;
}

/** the rows an FX (or a starter) holds, copied: what a new FX is stamped out of */
function seedFrom(id) {
  try { return api().fx.scenesOf(id).map((scene) => ({ scene, scale: 1 })); } catch { return []; }
}

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
  fx.scenes = s.scenes.map(({ scene, scale }) => {
    const out = clone(scene);
    if (scale !== 1) {
      const size = clone(withDefaults(scene).size ?? null);
      if (size) {
        for (const k of ['tokenWidths', 'radius', 'squares']) if (size[k] !== undefined) size[k] = round(size[k] * scale);
        if (size.fit) size.scale = typeof size.scale === 'number' ? round(size.scale * scale) : { x: round((size.scale?.x ?? 1) * scale), y: round((size.scale?.y ?? 1) * scale) };
        out.size = size;
      }
    }
    if (canMiss(scene)) { if (s.onMiss === 'skip') out.onMiss = 'skip'; else if (out.onMiss === 'skip') delete out.onMiss; }
    return out;
  });
  if (note) fx.note = note;
  if (s.off) fx.off = true;
  return fx;
}
const safeDraft = (app) => { try { return draftFx(app); } catch { return null; } };
export const sheetDirty = (app) => !!app.sheet && app.sheet.edit && JSON.stringify(safeDraft(app)) !== app.sheet.snapshot;

/** the problems the API would raise on Save; [] when it is clean */
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
  if (!s) return `<div class="stack"><div class="card"><div class="sub">FX Editor</div><p class="note">No FX open. Pick one from Stock FX or House FX, or start a new one.</p><div class="actions"><button type="button" class="primary" data-act="sh-new">New FX</button></div></div></div>`;
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
  const sentence = fx ? a.fx.sentence(fx, { name }) : '';
  const prov = s.original ? provenance(s.original) : '';
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
  const problem = edit && problems.length ? `<p class="bad problem">${esc(problems[0])}</p>` : '';
  return `<div class="card sheet" data-edit="${edit}">
    <div class="sheet-head">
      <div class="sheet-title">
        <h2>${esc(name)}${tags}</h2>
        <code class="id">${esc(fx?.id ?? s.id ?? '')}</code>
        ${prov ? `<p class="prov">${esc(prov)}</p>` : ''}
      </div>
      ${lockbar}
    </div>
    ${sentence ? `<div class="preview"><div class="sub">What plays</div><b>${esc(sentence)}</b></div>` : ''}
    ${banner}${problem}
    <div class="section"><div class="sub">Hook</div>${renderHook(app)}</div>
    <div class="section"><div class="sechead"><div class="sub">Sequence</div>${playAll(app)}</div>${renderSequence(app)}</div>
    <div class="section"><div class="sub">Note</div><input type="text" class="sh-note knob" value="${esc(s.note)}" placeholder="${esc(s.from ? `copied from ${idWords(s.from)}` : 'Why this FX, for whoever reads it later')}" ${edit ? '' : 'disabled'}></div>
  </div>`;
}

// --- Play (HANDOFF step 2): api.preview, on the selected token, saving nothing ------------------
const assetUrl = (file) => (globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(file) : `/${file}`);

/** why Play cannot run right now, in words, or null when it can; the control is greyed, never removed */
function playWhy(app, scene = null) {
  const s = app.sheet;
  const list = scene ? [scene] : s.scenes.map((x) => x.scene);
  if (s.off) return 'switched off';
  if (!list.length) return 'no scenes';
  if (!canvas?.tokens?.controlled?.length) return 'select a token';
  if (needsPlace({ scenes: list }) && !canvas.regions?.controlled?.length) return 'select a placed template';
  return null;
}

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

function renderHook(app) {
  const s = app.sheet;
  const edit = s.edit;
  const sub = s.subject;
  const keyPills = s.keys.map((k) => `<span class="pill key" aria-pressed="${!s.onlyThis}">${HOOK_WORDS.global}: ${esc(keyLabel(k))}${edit ? `<button type="button" class="x" data-act="sh-key-del" data-key="${esc(k)}" aria-label="Remove hook">✕</button>` : ''}</span>`).join('');
  const item = sub?.uuid && sub?.owner ? `<button type="button" class="pill" aria-pressed="${s.onlyThis}" data-act="sh-only">${HOOK_WORDS.item}: ${esc(sub.owner)} · ${esc(sub.name)}</button>` : '';
  const addKey = edit ? `<div class="search sh-key-search"><input type="search" class="sh-key-q" placeholder="Add ability" aria-label="Add ability" autocomplete="off" value="${esc(s.keyQuery)}"><div class="suggest" data-open="false"></div></div>` : '';
  const lastNew = s.newKeys.length ? s.newKeys[s.newKeys.length - 1] : null;
  const kinds = edit && lastNew && s.keys.includes(lastNew) ? `<div class="pills"><span class="lbl">Type of ${esc(idWords(parseKey(lastNew)?.id))}</span>${Object.entries(KIND_WORDS).map(([k, w]) => `<button type="button" class="pill" aria-pressed="${parseKey(lastNew)?.kind === k}" data-act="sh-kind" data-kind="${k}">${w}</button>`).join('')}</div>` : '';
  const pills = (list, cur, act, attr) => list.map(([v, w]) => `<button type="button" class="pill" aria-pressed="${cur === v}" data-act="${act}" data-${attr}="${v}">${w}</button>`).join('');
  return `<div class="grid2">
    <span class="lbl">Answers</span><div class="pills wrap">${keyPills}${item}${!s.keys.length && !item ? '<span class="note">No hook yet</span>' : ''}${addKey}</div>
    ${kinds ? `<span class="lbl"></span>${kinds}` : ''}
    <span class="lbl">State</span><div class="pills">${pills([[false, 'On'], [true, 'Off']], s.off, 'sh-off', 'v')}</div>
    <span class="lbl">Moment</span><div class="pills">${pills(Object.entries(ON_WORDS), s.on, 'sh-on', 'on')}</div>
    ${s.scenes.some((x) => canMiss(x.scene)) ? `<span class="lbl">On miss</span><div class="pills">${pills([['play', 'Play'], ['skip', 'Skip']], s.onMiss, 'sh-miss', 'v')}</div>` : ''}
  </div>`;
}

const placeOptions = (current) => PLACES.filter((p) => !['impact', 'area'].includes(p) || p === current).map((p) => `<option value="${p}"${p === current ? ' selected' : ''}>${esc(PLACE_WORDS[p])}</option>`).join('');
const field = (col, label, ctrl) => `<div class="f f-${col}"><span class="l">${label}</span><div class="c">${ctrl}</div></div>`;

function sceneRow(app, { scene, scale }, i) {
  const a = api();
  const s = app.sheet;
  const sc = withDefaults(scene);
  const locked = !s.edit;
  const dis = locked ? 'disabled' : '';
  const f = [];
  // a picture or a sound the scene names: the whole path in words (the variant, not just the family),
  // typed against the library when the sheet is unlocked, a link to it in the Asset Library when it is not
  const slotField = (col, label, slot, klass, path, empty) => {
    const shown = pathWords(path ?? '') || empty;
    return field(col, label, !locked
      ? `<span class="search"><input type="text" class="${klass}" data-i="${i}" value="${esc(pathWords(path ?? ''))}" placeholder="${label}" aria-label="${label}" autocomplete="off"><div class="suggest" data-open="false"></div></span><button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="${slot}" data-tooltip="Asset Library">Browse</button>`
      : `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="${slot}" data-tooltip="Asset Library">${esc(shown)}</button>`);
  };
  if (hasPicture(scene)) {
    const path = a.assets.resolve(scene.asset).path ?? '';
    f.push(slotField('vfx', 'VFX', 'asset', 'cw-asset', path || (scene.asset?.file ?? ''), 'No VFX'));
  }
  if (scene.shape === 'sound') f.push(slotField('vfx', 'SFX', 'sound', 'cw-sound-q', a.assets.resolve(scene.asset).path ?? '', 'No SFX'));
  if (['strike', 'shoot', 'beam'].includes(scene.shape)) f.push(field('place', 'To', `<select class="cw-place" data-i="${i}" data-k="to" aria-label="To" ${dis}>${placeOptions(sc.to)}</select>`));
  else if (['mark', 'aura'].includes(scene.shape)) f.push(field('place', 'At', `<select class="cw-place" data-i="${i}" data-k="at" aria-label="At" ${dis}>${placeOptions(sc.at)}</select>`));
  if (sc.size) f.push(field('size', 'Size', `<select class="cw-size" data-i="${i}" aria-label="Size" ${dis}>${SCALES.map(([v, wd]) => `<option value="${v}"${Number(scale) === v ? ' selected' : ''}>${wd}</option>`).join('')}</select>`));
  if (scene.shape === 'move') {
    const spot = sc.seen && sc.unoccupied ? 'seen-unoccupied' : sc.seen ? 'seen' : sc.unoccupied ? 'unoccupied' : 'any';
    f.push(field('spot', 'Spot', `<select class="cw-spot" data-i="${i}" aria-label="Spot" ${dis}>${[['seen-unoccupied', 'to an unoccupied space they can see'], ['unoccupied', 'to an unoccupied space, seen or not'], ['seen', 'to a space they can see'], ['any', 'to any space']].map(([v, wd]) => `<option value="${v}"${spot === v ? ' selected' : ''}>${wd}</option>`).join('')}</select>`));
    f.push(field('range', 'Range', `<input type="number" class="cw-range" data-i="${i}" value="${esc(String(sc.range ?? 30))}" min="5" step="5" aria-label="Range (ft)" ${dis}><span class="suffix">ft</span>`));
  }
  if (hasPicture(scene)) {
    const op = Math.round((sc.opacity ?? 1) * 100);
    f.push(field('opacity', 'Opacity', `<input type="number" class="cw-opacity" data-i="${i}" value="${op}" min="0" max="100" step="5" aria-label="Opacity (%)" ${dis}><span class="suffix">%</span>`));
    const tint = scene.tint?.colour ?? '';
    f.push(field('tint', 'Tint', !locked
      ? `<input type="color" class="cw-tint" data-i="${i}" value="${esc(tint || '#ffffff')}" aria-label="Tint">${tint ? `<button type="button" class="quiet" data-act="cw-tint-off" data-i="${i}" data-tooltip="No tint" aria-label="No tint">✕</button>` : '<span class="suffix">none</span>'}`
      : (tint ? `<span class="swatch" style="background:${esc(tint)}"></span><span class="suffix">${esc(tint)}</span>` : '<span class="suffix">none</span>')));
  }
  // the SFX a picture scene carries; Browse is the only door (Find SFX retired 2026-09-07)
  if (scene.shape !== 'sound' && scene.shape !== 'custom' && scene.shape !== 'move') {
    const has = !!scene.sound?.asset;
    const r = has ? a.assets.resolve(scene.sound.asset) : null;
    const words = has ? (pathWords(r.path ?? '') || (r.file ? r.file.split('/').pop() : '') || (r.paths ? `one of ${r.paths.length}` : 'SFX')) : 'No SFX';
    f.push(field('sfx', 'SFX', !locked
      ? `<select class="cw-sound" data-i="${i}" aria-label="SFX"><option value="keep" selected>${esc(words)}</option>${has ? '<option value="none">No SFX</option>' : ''}</select><button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="sound" data-tooltip="Asset Library">Browse</button>`
      : (has ? `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="sound" data-tooltip="Asset Library">${esc(words)}</button>` : '<span class="suffix">No SFX</span>')));
  }
  const may = (k) => (KNOBS[scene.shape] ?? []).includes(k);
  if (may('below')) f.push(field('below', 'Depth', `<label class="check"><input type="checkbox" class="cw-below" data-i="${i}" ${scene.below ? 'checked' : ''} ${dis}> under the tokens</label>`));
  if (may('fade')) f.push(field('fade', 'Fade', `<label class="check"><input type="checkbox" class="cw-fade" data-i="${i}" ${scene.fade ? 'checked' : ''} ${dis}> fades out and in</label>`));
  if (may('repeat')) {
    const times = sc.repeat ?? 1;
    f.push(field('times', 'Times', `<input type="number" class="cw-times" data-i="${i}" value="${times}" min="1" step="1" aria-label="Times" ${dis}>`));
    if (times > 1) f.push(field('every', 'Every', `<input type="number" class="cw-every" data-i="${i}" value="${sc.every ?? 250}" min="0" step="50" aria-label="Every (ms)" ${dis}><span class="suffix">ms</span>`));
  }
  if (may('rate')) f.push(field('rate', 'Speed', `<input type="number" class="cw-rate" data-i="${i}" value="${sc.rate ?? 1}" min="0.1" step="0.25" aria-label="Speed" ${dis}><span class="suffix">×</span>`));
  if (canPersist(scene)) f.push(field('lasts', 'Lasts', `<select class="cw-persist" data-i="${i}" aria-label="Lasts" ${dis}>${Object.entries(PERSIST_WORDS).map(([v, w]) => `<option value="${v}"${(sc.persist ?? 'none') === v ? ' selected' : ''}>${w}</option>`).join('')}</select>`));
  if (scene.shape !== 'custom') {
    f.push(field('delay', 'Delay', `<input type="number" class="cw-delay" data-i="${i}" value="${esc(String(scene.delay ?? 0))}" min="0" step="50" aria-label="Delay (ms)" ${dis}><span class="suffix">ms</span>`));
    if (i < s.scenes.length - 1) f.push(field('wait', 'Then', `<label class="check"><input type="checkbox" class="cw-wait" data-i="${i}" ${scene.wait ? 'checked' : ''} ${dis}> wait for it to finish</label>`));
  }
  // fixed rows: the picture (VFX, where, size, opacity, tint); then how long it lasts with the SFX
  // far right; then the timing — the delay and "wait for it to finish" when a scene follows.
  // A field never moves between the rows on a resize.
  const SECOND = ['lasts', 'sfx'];
  const THIRD = ['delay', 'times', 'every', 'rate', 'wait'];
  const colOf = (html) => html.match(/class="f f-([a-z]+)"/)?.[1] ?? '';
  const row1 = f.filter((x) => !SECOND.includes(colOf(x)) && !THIRD.includes(colOf(x)));
  const row2 = SECOND.map((c) => f.find((x) => colOf(x) === c)).filter(Boolean);
  const row3 = THIRD.map((c) => f.find((x) => colOf(x) === c)).filter(Boolean);
  const kind = KIND_OF_SHAPE(scene.shape);
  // Play is always on the row, greyed with its reason when it cannot run (R1); the reorder tools
  // only when this FX owns its scenes
  const why = playWhy(app, scene);
  const last = s.scenes.length - 1;
  const play = `<button type="button" class="quiet play" data-act="sh-play-scene" data-i="${i}" data-tooltip="${esc(why ?? `Play scene ${i + 1} now. Nothing is saved.`)}" aria-label="Play scene ${i + 1}" ${why ? 'disabled' : ''}>▶</button>`;
  const tools = `<div class="tools">${play}${locked ? '' : `<button type="button" class="quiet" data-act="cw-up" data-i="${i}" aria-label="Up" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="quiet" data-act="cw-down" data-i="${i}" aria-label="Down" ${i === last ? 'disabled' : ''}>↓</button><button type="button" class="quiet drop" data-act="cw-drop" data-i="${i}" aria-label="Remove scene">✕</button>`}</div>`;
  const file = thumbFile(scene);
  const thumb = !file ? '<span class="thumb none"></span>'
    : /\.(webm|mp4|m4v)$/i.test(file) ? `<video class="thumb" src="${esc(assetUrl(file))}#t=0.1" preload="metadata" muted playsinline></video>`
      : `<img class="thumb" src="${esc(assetUrl(file))}" alt="">`;
  return `<div class="scene" data-kind="${kind}"><div class="idx"><span class="num">${i + 1}</span>${thumb}</div><div><div class="kind">${esc(SHAPE_WORDS[scene.shape] ?? scene.shape)}${KIND_TITLE[kind] ? ` · ${KIND_TITLE[kind]}` : ''}</div><div class="knobs"><div class="kr">${row1.join('')}</div><div class="kr">${row2.join('')}</div>${row3.length ? `<div class="kr">${row3.join('')}</div>` : ''}</div></div>${tools}<div class="line">${esc(sceneWords(scene))}</div></div>`;
}

function renderSequence(app) {
  const s = app.sheet;
  const rows = s.scenes.map((x, i) => sceneRow(app, x, i)).join('');
  const copy = s.edit && !s.scenes.length ? `<div class="field search copy"><label>Copy from</label><input type="text" class="sh-like" placeholder="Search FX… Misty Step, Fire Bolt" autocomplete="off"><div class="suggest" data-open="false"></div></div>` : '';
  const add = s.edit ? `<div class="pills add"><span class="lbl">Add</span>${Object.entries(SHAPE_WORDS).filter(([sh]) => sh !== 'custom').map(([sh, wd]) => `<button type="button" class="pill" data-act="cw-add" data-shape="${sh}" data-tooltip="${esc(SHAPE_HELP[sh])}">${wd}</button>`).join('')}</div>` : '';
  return `<div class="scenes">${rows || (s.edit ? '' : '<p class="note">No scenes.</p>')}</div>${copy}${add}`;
}

// -----------------------------------------------------------------------------------------------
// events (the window routes every act that starts with sh- or cw- here)
// -----------------------------------------------------------------------------------------------
/**
 * Play an FX once on the selected token through the API, saving nothing. Says what happened: a
 * move with no destination arms the canvas click and plays from there (render.js).
 */
async function playPreview(app, fx, what) {
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
  const asset = slot === 'sound' ? (x.scene.shape === 'sound' ? x.scene.asset : x.scene.sound?.asset) : x.scene.asset;
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
  switch (act) {
    case 'sh-back': { if (!(await leaveSheet(app))) return undefined; app.view.tab = s.cameFrom ?? 'house'; break; }
    case 'sh-cancel': { if (s.id) openSheet(app, { id: s.id, subject: s.subject }); else { app.sheet = null; app.view.tab = s.cameFrom ?? 'house'; } app.toast('Changes dropped.'); break; }
    case 'sh-save': return saveSheet(app);
    case 'sh-dup': { openSheet(app, { subject: s.subject, from: s.id }); app.sheet.cameFrom = s.cameFrom; app.toast(`Copy of ${idWords(s.id)}. Add its hook, then Save.`); break; }
    case 'sh-export': return app.exportFx(s.id);
    case 'sh-delete': {
      const under = s.source === 'world' && (a.corpora.house.some((h) => h.id === s.id) || a.corpora.stock.some((b2) => b2.id === s.id));
      if (under) { await app.removeFx(s.id); openSheet(app, { id: s.id }); break; }
      await app.deleteFx(s.id);
      if (!a.fx.get(s.id)) { app.sheet = null; app.view.tab = s.cameFrom ?? 'house'; }
      break;
    }
    case 'sh-key-del': s.keys = s.keys.filter((k) => k !== b.dataset.key); s.newKeys = s.newKeys.filter((k) => k !== b.dataset.key); break;
    case 'sh-key-hit': { const e = app.entries[i]; if (e) for (const k of e.keys.filter((x) => !x.includes('/'))) if (!s.keys.includes(k)) s.keys.push(k); if (!s.subject && e) s.subject = app.subjectFromEntry(e); s.keyQuery = ''; s.onlyThis = false; break; }
    case 'sh-key-new': { const k = `spell:${slug(b.dataset.name)}`; if (!s.keys.includes(k)) { s.keys.push(k); s.newKeys.push(k); } if (!s.subject) s.subject = app.subjectNew(b.dataset.name); s.keyQuery = ''; s.onlyThis = false; break; }
    case 'sh-kind': { const last = s.newKeys[s.newKeys.length - 1]; const p = parseKey(last); if (!p) break; const k = `${b.dataset.kind}:${p.id}`; s.keys = s.keys.map((x) => (x === last ? k : x)); s.newKeys = s.newKeys.map((x) => (x === last ? k : x)); if (s.subject?.isNew) s.subject = app.subjectNew(s.subject.name, b.dataset.kind); s.on = b.dataset.kind === 'effect' ? 'effect' : s.on; break; }
    case 'sh-only': s.onlyThis = !s.onlyThis; break;
    // --- Play (HANDOFF step 2) ---
    case 'sh-play': { const fx = safeDraft(app); if (!fx) return app.toast('Nothing to play yet.'); return playPreview(app, fx, sheetName(app)); }
    case 'sh-play-scene': {
      const x = s.scenes[i];
      if (!x) return undefined;
      return playPreview(app, { id: 'preview', on: s.on, scenes: [clone(x.scene)] }, `scene ${i + 1}`);
    }
    case 'sh-off': s.off = b.dataset.v === 'true'; break;
    case 'sh-on': s.on = b.dataset.on; break;
    case 'sh-miss': s.onMiss = b.dataset.v; break;
    case 'sh-like-hit': s.from = b.dataset.id; s.scenes = seedFrom(b.dataset.id); break;
    case 'cw-add': {
      // the starter is a stencil: its scene is stamped out and the FX owns the copy
      const stencil = a.fx.scenesOf(STARTER_OF_SHAPE[b.dataset.shape]);
      const scene = stencil.find((sc) => sc.shape === b.dataset.shape) ?? stencil[0];
      if (scene) s.scenes.push({ scene, scale: 1 });
      break;
    }
    case 'cw-drop': s.scenes.splice(i, 1); break;
    case 'cw-up': if (i > 0) [s.scenes[i - 1], s.scenes[i]] = [s.scenes[i], s.scenes[i - 1]]; break;
    case 'cw-down': if (i < s.scenes.length - 1) [s.scenes[i + 1], s.scenes[i]] = [s.scenes[i], s.scenes[i + 1]]; break;
    case 'cw-browse': if (!s.edit) return undefined; openPicker(app, i, b.dataset.slot, slotPath(s, i, b.dataset.slot)); break;
    case 'cw-show': openPicker(app, i, b.dataset.slot, slotPath(s, i, b.dataset.slot), true); break;
    case 'cw-tint-off': { const x = s.scenes[i]; if (x) delete x.scene.tint; break; }
    case 'cw-asset-hit': { const x = s.scenes[i]; if (x) x.scene.asset = { path: b.dataset.path }; break; }
    case 'cw-sound-hit': {
      const x = s.scenes[i];
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
  if (el.classList.contains('sh-like')) {
    const hits = app.likeHits(q).filter((h) => h.tag !== 'starter');
    return open(hits.map((h) => `<div class="hit" data-act="sh-like-hit" data-id="${esc(h.id)}"><span>${esc(h.words)}${h.keys ? ` <span class="note">· ${esc(h.keys.slice(0, 60))}</span>` : ''}</span><span class="o">${esc(h.tag)}</span></div>`).join('') || '<div class="hit"><span class="o">No match</span></div>');
  }
  if (el.classList.contains('cw-asset')) {
    if (q.length < 2) return open('');
    const hits = a.assets.search(q, { roots: ['jb2a'], limit: 30 });
    return open(hits.map((h) => `<div class="hit" data-act="cw-asset-hit" data-i="${el.dataset.i}" data-path="${esc(h.colours.length ? `${h.path}.${h.colours[0]}` : h.path)}"><span>${esc(pathWords(h.path))}</span><span class="o">${h.colours.length ? `${h.colours.length} colour${h.colours.length === 1 ? '' : 's'}` : '1 colour'}</span></div>`).join('') || '<div class="hit"><span class="o">No match</span></div>');
  }
  if (el.classList.contains('cw-sound-q')) {
    if (q.length < 2) return open('');
    const hits = a.assets.search(q, { roots: ['psfx'], limit: 30 });
    return open(hits.map((h) => `<div class="hit" data-act="cw-sound-hit" data-i="${el.dataset.i}" data-path="${esc(h.path)}"><span>${esc(pathWords(h.path))}</span><span class="o">${h.colours.length ? `${h.colours.length} variants` : 'SFX'}</span></div>`).join('') || '<div class="hit"><span class="o">No match</span></div>');
  }
  if (el.classList.contains('sh-note')) { s.note = el.value; }
}

export function onSheetChange(app, el) {
  const a = api();
  const s = app.sheet;
  if (!s) return undefined;
  if (el.classList.contains('sh-edit')) {
    if (!el.checked) { return leaveSheet(app).then((ok) => { if (ok && app.sheet) app.sheet.edit = false; return app.render(); }); }
    s.edit = true; s.snapshot = JSON.stringify(safeDraft(app)); return app.render();
  }
  const x = s.scenes[Number(el.dataset.i)];
  if (el.classList.contains('cw-place') && x) { x.scene[el.dataset.k] = el.value; return app.render(); }
  if (el.classList.contains('cw-size') && x) { x.scale = Number(el.value) || 1; return app.render(); }
  if (el.classList.contains('cw-spot') && x) {
    const seen = el.value === 'seen-unoccupied' || el.value === 'seen';
    const unoccupied = el.value === 'seen-unoccupied' || el.value === 'unoccupied';
    if (seen) delete x.scene.seen; else x.scene.seen = false;
    if (unoccupied) delete x.scene.unoccupied; else x.scene.unoccupied = false;
    return app.render();
  }
  if (el.classList.contains('cw-range') && x) { const n = Number(el.value); if (n > 0) { if (n === 30) delete x.scene.range; else x.scene.range = n; } return app.render(); }
  if (el.classList.contains('cw-delay') && x) { const n = Math.max(0, Math.round(Number(el.value) || 0)); if (n) x.scene.delay = n; else delete x.scene.delay; return app.render(); }
  if (el.classList.contains('cw-below') && x) { if (el.checked) x.scene.below = true; else delete x.scene.below; return app.render(); }
  if (el.classList.contains('cw-fade') && x) { if (el.checked) x.scene.fade = true; else delete x.scene.fade; return app.render(); }
  if (el.classList.contains('cw-times') && x) {
    const n = Math.max(1, Math.round(Number(el.value) || 1));
    if (n > 1) x.scene.repeat = n; else { delete x.scene.repeat; delete x.scene.every; }
    return app.render();
  }
  if (el.classList.contains('cw-every') && x) { const n = Math.max(0, Math.round(Number(el.value) || 0)); if (n) x.scene.every = n; else delete x.scene.every; return app.render(); }
  if (el.classList.contains('cw-rate') && x) { const n = Number(el.value); if (n > 0 && n !== 1) x.scene.rate = n; else delete x.scene.rate; return app.render(); }
  if (el.classList.contains('cw-wait') && x) { if (el.checked) x.scene.wait = true; else delete x.scene.wait; return app.render(); }
  if (el.classList.contains('cw-persist') && x) { if (el.value === 'none') delete x.scene.persist; else x.scene.persist = el.value; return app.render(); }
  if (el.classList.contains('cw-sound') && x) { if (el.value === 'none') delete x.scene.sound; return app.render(); }
  if (el.classList.contains('cw-opacity') && x) {
    const n = Math.min(100, Math.max(0, Math.round(Number(el.value) || 0)));
    if (n === 100) delete x.scene.opacity; else x.scene.opacity = n / 100;
    return app.render();
  }
  if (el.classList.contains('cw-tint') && x) { x.scene.tint = { ...(x.scene.tint ?? {}), colour: el.value }; return app.render(); }
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
  if (el.classList.contains('sh-like')) {
    ev.preventDefault();
    const hit = app.likeHits(el.value).filter((h) => h.tag !== 'starter')[0];
    if (hit) { s.from = hit.id; s.scenes = seedFrom(hit.id); app.render(); }
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
  const name = sheetName(app);
  openSheet(app, { id: fx.id, subject: item ? app.subjectFromItem(item) : sub });
  app.sheet.cameFrom = s.cameFrom;
  await app.render();
  return app.toast(`Saved: ${name} (${SOURCE_TAG.world}).`);
}
