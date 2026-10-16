// The FX sheet: one screen per FX, the same whether it is read or changed. It is the Editor tab: every
// edit of an FX is made here, the tab is in the strip whether an FX is open or not, and walking off to
// another tab leaves it open, unsaved changes and all. Back is the shortcut to the tab the sheet was
// opened from; it does not close the sheet.
// An Edit switch is the guard: off, the sheet is read-only and offers Duplicate, Export and Delete;
// on, every control unlocks and the buttons are Cancel and Save. SAVE WRITES THE FILE: a new FX and a
// House FX go to House; a Stock FX asks — a House override with the same id (Stock untouched, the
// override wins), or Stock itself. An FX with no key is House only.
//
// ONE KEY PER ITEM (DESIGN §23). An FX answers a key, and an item's key is dnd5e's own identifier for
// it. "This Bob's Fire Bolt, not Alice's" is answered by giving Bob's item an identifier of its own:
// the Key strip's Own key writes it into the item (dnd5e's field, which travels with the item) and
// turns the sheet into a new House FX for that key, its scenes copied from what answered before. A
// world item in the sidebar takes an Own key the same way as an item on an actor.
//
// THE PARTS, top to bottom, each painted on its own (data-part), so a change repaints what it
// touched and nothing else, keeping focus, the caret and every scroll (ui/morph.js):
//   head       the name, its tags, its record, the key · id · provenance line, and the action bar
//   notes      the banner (Stock, an override, a key another FX holds), the problems, the gap table's word
//   sentence   the FX as its one sentence, two lines and an ellipsis, the whole on a click
//   key        the Key strip: Answers · Item with Own key · Moment · State, each explained on screen
//   seqhead    "Sequence", how long it runs, and ▶ Play all
//   rail       one row per scene with its own ▶, and + Add a scene opening the eight shapes in place
//   inspector  ONE COLUMN of the cells the scene's shape reads (DESIGN §28.4)
//   landing    in place of the last five, for an ability nothing answers yet: three doors (§28.1)
//
// THE INSPECTOR. The shape's own group comes first and open, then Picture, Timing, Sound and
// Placement, collapsed, each a disclosure remembered per sheet. A group holds only the cells
// KNOBS[shape] lists (core/fx.js): a cell the shape does not read is not drawn at all, and a cell that
// means nothing yet (Every while Times is 1, Hold next on the last scene) is drawn dim with its reason
// beside it, in words. A picture is a name, as a sound is (§27): its words open the Assets tab on it,
// Browse opens the drawer under the cell (ui/drawer.js), and the sheet loads no video and no image.
//
// THE TWO DELAYS ARE NAMED. `delay` is Wait before: how long this scene waits before it starts.
// `wait` is Hold next: the next scene waits for this one to finish, plus or minus an offset. The engine
// folds a `wait: true` scene's `delay` into that offset (engine/common.js `timing`), so a scene like
// that is normalised as the sheet loads it — `{wait: true, delay: -1000}` becomes `{wait: -1000}`,
// which plays identically and says one thing in one place. Nothing is written until Save.
//
// EVERY FX IS A FULL COPY: no FX points at another one. A starter, "Copy from" and Duplicate stamp the
// scenes out and the new FX owns them.
import { MODULE_ID } from '../settings.js';
import { AUTHORED_KINDS, keyLabel, parseKey, slug } from '../core/subjects.js';
import { needsPlace } from '../core/corpus.js';
import { KNOBS, PLACES, PLACE_WORDS, assetWords, provenance, sceneWords, withDefaults } from '../core/fx.js';
import { FALLS_BACK_TO_USE, WHEN, WHEN_WORDS } from '../core/moments.js';
import { MOMENT_TERMS, SOURCE_TAG, dot, esc, idWords } from './html.js';
import { nameForKey, nameOf, openRecord, recordFor, recordOf, recordWords, recordsRead } from './records.js';
import { drawerHtml, onDrawerChange, onDrawerClick, onDrawerInput, openDrawer, slotPath } from './drawer.js';
import { showAsset } from './library.js';
import { morph } from './morph.js';

const api = () => game.modules.get(MODULE_ID).api;
const STARTER_OF_SHAPE = { strike: 'starter:swing', shoot: 'starter:bolt', mark: 'starter:mark', fill: 'starter:fill', aura: 'starter:aura', beam: 'starter:beam', move: 'starter:teleport', sound: 'starter:sound' };
export const SHAPE_WORDS = { strike: 'Swing', shoot: 'Bolt', mark: 'Mark', fill: 'Fill', aura: 'Aura', beam: 'Beam', move: 'Move', sound: 'Sound', custom: 'Custom' };
const KIND_OF_SHAPE = (sh) => (sh === 'sound' ? 'sfx' : sh === 'move' ? 'move' : 'vfx');
const KIND_TITLE = { vfx: 'VFX', sfx: 'SFX', move: '' };
/** what each shape does, in plain words: the help line on its card in Add a scene */
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
const SIZE_WORDS = { tokenWidths: 'tokens wide', radius: 'squares around', squares: 'squares wide', fit: 'fit the shape', 'fit-object': 'fit the object' };
const clone = (v) => JSON.parse(JSON.stringify(v));

/** dnd5e's own two words; every other word of WHEN is By the Books' */
const DND5E_WORDS = ['use', 'effect'];
/** the words an event key is heard at: By the Books' (its reader appends `event:<word>`; the dnd5e reader keys no event) */
const HEARD_EVENTS = WHEN.filter((w) => !DND5E_WORDS.includes(w));
const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs.join(''));

/** the key a subject answers by: its own one (an ammunition's or a cast spell's may come before it) */
export const bareKey = (subject) => subject?.keys?.[0] ?? null;
const kindOf = (key) => parseKey(key ?? '')?.kind ?? null;

/**
 * A DialogV2 that closes at once, on every path (a button, Escape, the X, a close of ours): Foundry
 * closes a window through a transition, and a modal keeps the page inert until it is removed, so a
 * click in that window was lost. Made when first asked for, since the class exists only in the game.
 */
let QuickDialog = null;
const quickDialog = () => (QuickDialog ??= class extends foundry.applications.api.DialogV2 {
  async close(options = {}) { return super.close({ ...options, animate: false }); }
});

/**
 * A dialog asked and answered, with its window gone before the answer is acted on: confirm, prompt
 * and wait resolve as the button is pressed, and the answer then waits for the close. A dialog that
 * never rendered (a suite answering for it) has nothing to wait for.
 */
export async function asked(method, config) {
  let dialog = null;
  let gone = null;
  const closed = new Promise((resolve) => { gone = resolve; });
  const result = await quickDialog()[method]({
    ...config,
    render: (event, d) => { dialog = d; config.render?.(event, d); },
    close: (event, d) => { config.close?.(event, d); gone(); },
  });
  if (dialog) { await dialog.close(); await closed; }
  return result;
}

// -----------------------------------------------------------------------------------------------
// opening
// -----------------------------------------------------------------------------------------------
/**
 * Open a sheet on the window. {id: an FX to read or edit; subject: the ability it is for (a new FX,
 * or the item the sheet was opened from); from: an FX or a starter whose scenes a new FX starts with;
 * edit: open unlocked; via: where a GM came from ('wand' | 'search' | 'coverage'), for the landing's
 * words}. A new sheet for an ability nothing answers, with no scenes to start from, is the LANDING:
 * "Nothing plays for …" and three doors. With nothing at all, a blank sheet.
 */
export function openSheet(app, { id = null, source = null, subject = null, from = null, scenes = null, edit = false, via = null } = {}) {
  const a = api();
  const s = {
    id: null, source: null, shadowed: false, original: null, subject: null, keys: [], on: 'use', off: false, scenes: [], note: '',
    edit: !!edit, cameFrom: app.view.tab === 'editor' ? (app.sheet?.cameFrom ?? 'fx') : app.view.tab, isNew: !id, from: null, snapshot: null,
    keyQuery: '', itemQuery: null, likeQuery: '', suggest: null, pick: 0, open: {}, sentenceOpen: false,
    adding: false, drawer: null, landing: false, door: null, via,
  };
  const e = id ? a.fx.get(id, source) : null;
  if (e) {
    s.id = id; s.source = e.source; s.shadowed = !!e.shadowed; s.original = e.original;
    s.keys = [...(e.original.for ?? [])];
    s.on = e.original.on ?? 'use';
    s.off = !!e.original.off;
    s.note = e.original.note ?? '';
    // this layer's own scenes, copied: a Stock FX under a House override opens as itself
    s.scenes = clone(e.original.scenes ?? []).map((scene) => ({ scene: named(scene) }));
    s.subject = subject ?? app.subjectForFx(id);
  } else {
    s.subject = subject;
    if (subject) { const k = bareKey(subject); if (k) s.keys = [k]; s.on = subject.on ?? 'use'; }
    if (kindOf(s.keys[0]) === 'event') s.on = parseKey(s.keys[0]).id;
    if (from && (a.fx.get(from) || a.index.starters?.has?.(from))) { s.from = from; s.scenes = seedFrom(from); }
    if (scenes?.length) s.scenes = scenes.map((scene) => ({ scene: named(clone(scene)) }));
    s.edit = true;
    s.landing = !!s.keys.length && !s.scenes.length;
  }
  app.sheet = s;
  s.snapshot = JSON.stringify(safeDraft(app));
  app.view.tab = 'editor';
  return s;
}

/**
 * The one normalisation the sheet makes as it loads a scene: a hold whose offset is written as
 * `delay` becomes a numeric `wait`, so that Wait before and Hold next each mean one thing. It plays
 * the same either way — `waitUntilFinished(ms)` — and nothing is written until Save.
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
  let id = s.id;
  const p = parseKey(s.keys[0] ?? '');
  const baseId = (p?.id ?? (s.id || slug(sub?.name ?? ''))) || 'fx';
  if (!id) {
    // ONE FX ANSWERS ONE KEY: a new sheet keyed to a key an FX already answers on this moment IS that
    // FX (its override, or its replacement — Save says which); an id another key holds is qualified
    // by the kind so the two never collide
    const holder = holderOf(app);
    if (holder) id = holder.fx.id;
    else {
      id = baseId;
      const existing = a.fx.get(id);
      if (existing && !s.keys.some((k) => (existing.original?.for ?? []).includes(k))) id = `${p?.kind ?? 'fx'}-${id}`;
    }
  }
  const note = s.note.trim() || (s.from ? `copied from ${idWords(s.from)}` : s.original?.note ?? '');
  const fx = { id, for: [...s.keys], on: s.on };
  // a key earned against this world's own item (an Own key, or a House FX for a world item) carries
  // the item as its record, so the file is complete on its own; the address book wins where it has one
  if (s.keys[0] && sub?.uuid && !recordFor(s.keys[0])) fx.record = { uuid: sub.uuid, name: sub.name, where: `this world · ${sub.owner ?? 'the Items directory'}` };
  // an off FX plays nothing, so it carries no scenes; the sheet keeps them for when it is switched on
  if (s.off) fx.off = true;
  else fx.scenes = s.scenes.map(({ scene }) => clone(scene));
  if (note) fx.note = note;
  return fx;
}
const safeDraft = (app) => { try { return draftFx(app); } catch { return null; } };

/** the FX that already answers this sheet's key on its moment, when the sheet is not that FX itself: {fx, source} or null */
export function holderOf(app) {
  const s = app.sheet;
  const key = s.keys[0];
  if (!key) return null;
  const e = api().fx.for(key).find((x) => x.on === s.on || x.on === '*');
  if (!e || e.fx.id === s.id) return null;
  return e;
}
export const sheetDirty = (app) => !!app.sheet && app.sheet.edit && JSON.stringify(safeDraft(app)) !== app.sheet.snapshot;

/** every problem the API would raise on Save, in sentences; [] when it is clean */
function problemsOf(app) {
  try { const fx = draftFx(app); const out = api().fx.validate(fx); if (!fx.for.length) out.unshift('No key: add an ability, or open the sheet from an item.'); return out; } catch (e) { return [e.message]; }
}

/** ask before dropping unsaved changes; true when it is fine to leave */
export async function leaveSheet(app) {
  if (!sheetDirty(app)) return true;
  const ok = await asked('confirm', { window: { title: 'Drop unsaved changes?' }, content: `<p>${esc(sheetName(app))} has unsaved changes.</p>`, rejectClose: false, modal: true });
  if (ok) { app.sheet.edit = false; if (app.sheet.id) openSheet(app, { id: app.sheet.id, source: app.sheet.source, subject: app.sheet.subject }); else app.sheet = null; }
  return !!ok;
}

/** what the sheet is called: its subject's name; an event FX by its own id (Summon Appears), since no record or item names an event */
const sheetName = (app) => { const s = app.sheet; const k = s.keys[0]; if (kindOf(k) === 'event' && s.id) return idWords(s.id); return s.subject?.name ?? (k ? nameForKey(k) : s.id ? idWords(s.id) : 'New FX'); };

/**
 * The open sheet read again from the file, keeping its place (its tab, where it came from, the scene,
 * the groups it had open, locked or not): after a Delete, an Import or a save made elsewhere. False when the FX
 * is gone: the sheet closes, and the Editor tab goes back to where the sheet came from.
 */
export function reloadSheet(app) {
  const s = app.sheet;
  if (!s?.id) return false;
  const tab = app.view.tab;
  if (!api().fx.get(s.id)) { app.sheet = null; if (tab === 'editor') app.view.tab = s.cameFrom ?? 'fx'; return false; }
  openSheet(app, { id: s.id, subject: s.subject, edit: s.edit });
  Object.assign(app.sheet, { cameFrom: s.cameFrom, pick: s.pick, open: s.open, sentenceOpen: s.sentenceOpen });
  app.view.tab = tab;
  return true;
}

// -----------------------------------------------------------------------------------------------
// painting: the sheet whole, or the parts a change touched
// -----------------------------------------------------------------------------------------------
/** what a change of the sequence touches: Save and the problems, the sentence, the rail's times, the inspector */
const SEQ = ['head', 'notes', 'sentence', 'seqhead', 'rail', 'inspector'];
/** what a change of the key or the moment touches */
const KEYED = ['head', 'notes', 'sentence', 'key'];

/**
 * Paint the sheet over itself: the parts named, or the whole of it when its frame changed (locked or
 * not, on or off, the landing or the sheet, another FX). Nothing is replaced that did not change.
 */
export function paintSheet(app, parts = null) {
  if (app.view.tab !== 'editor') return app.paint();
  const pane = app.element?.querySelector('[data-pane="editor"]');
  if (!pane) return app.render();
  const s = app.sheet;
  const root = pane.querySelector(':scope > .sheet');
  const frame = s ? `${s.edit}|${s.off}|${s.landing}|${s.id ?? ''}` : '';
  if (!parts || !s || !root || root.dataset.frame !== frame) morph(pane, renderSheet(app));
  else {
    for (const p of parts) {
      const el = root.querySelector(`[data-part="${p}"]`);
      if (!el) { morph(pane, renderSheet(app)); break; }
      morph(el, PARTS[p](app));
    }
  }
  markClamped(app);
  return undefined;
}

export function renderSheet(app) {
  const s = app.sheet;
  // the tab's resting state: it is always in the strip, so it has to say what it is when it is empty
  if (!s) return `<div class="stack"><div class="card"><div class="sub">Editor</div><p class="note">No FX open. Every FX is edited here: pick one on the Library tab and press Editor, or start a new one.</p><div class="actions"><button type="button" class="primary" data-act="sh-new">New FX</button><button type="button" class="quiet" data-act="tab" data-tab="fx">Browse FX</button></div></div></div>`;
  const frame = `${s.edit}|${s.off}|${s.landing}|${s.id ?? ''}`;
  const body = s.landing
    ? `<div class="landing" data-part="landing">${landingHtml(app)}</div>`
    : `<div class="preview" data-part="sentence">${sentencePart(app)}</div>
    <div class="section" data-part="key">${renderKey(app)}</div>
    <div class="section sequence">${s.off ? offNote(s) : `<div class="sechead" data-part="seqhead">${seqHead(app)}</div>
      <div class="seq"><div class="railside" data-part="rail">${railHtml(app)}</div><div class="inspect" data-part="inspector">${inspector(app)}</div></div>`}</div>`;
  return `<div class="card sheet" data-edit="${s.edit}" data-frame="${esc(frame)}">
    <div class="sheet-head" data-part="head">${headHtml(app)}</div>
    <div class="notes" data-part="notes">${notesHtml(app)}</div>
    ${body}
  </div>`;
}

const offNote = (s) => `<p class="note off-note">Switched off: this FX plays nothing, and the ability it answers plays nothing. Switch it back on to write its sequence — the ${s.scenes.length} scene${s.scenes.length === 1 ? '' : 's'} it had ${s.scenes.length === 1 ? 'is' : 'are'} kept until you do.</p>`;

// --- the head: identity and the action bar, one band that stays in view as the sheet scrolls ---
function headHtml(app) {
  const a = api();
  const s = app.sheet;
  const edit = s.edit;
  const fx = safeDraft(app);
  const problems = edit ? problemsOf(app) : [];
  // a House FX with a Stock FX's id is its override: the tag says so, and Delete shows Stock again
  const under = s.id && s.source === 'house' ? a.corpus.under(s.id) : null;
  const tags = [
    s.source ? `<span class="tag ${s.source === 'house' ? 'yours' : ''}">${SOURCE_TAG[s.source]}${under ? ' override' : ''}${s.shadowed ? ` · ${SOURCE_TAG.house} overrides it` : ''}</span>` : '<span class="tag yours">New</span>',
    kindOf(s.keys[0]) === 'event' ? '<span class="tag event">event</span>' : '',
    s.off ? '<span class="tag off">Off</span>' : '',
  ].join('');
  // the bar never reflows: every control keeps its place, and what the mode does not offer is greyed
  const onSaved = !edit && !!s.id;
  const lockbar = `<div class="lockbar">
      <button type="button" class="quiet" data-act="sh-back">‹ Back</button>
      <button type="button" class="quiet" data-act="sh-new">New FX</button>
      <button type="button" data-act="sh-dup" ${onSaved ? '' : 'disabled'}>Duplicate</button>
      <button type="button" class="quiet" data-act="sh-export" ${onSaved ? '' : 'disabled'}>Export</button>
      <button type="button" class="quiet danger" data-act="sh-delete" ${onSaved ? '' : 'disabled'}>Delete</button>
      <label class="switch"><input type="checkbox" class="sh-edit" data-field="edit" aria-label="Edit" ${edit ? 'checked' : ''}> Edit</label>
      <button type="button" class="quiet" data-act="sh-cancel" ${edit ? '' : 'disabled'}>Cancel</button>
      <button type="button" class="primary" data-act="sh-save" ${edit && !problems.length && !s.landing ? '' : 'disabled'}>Save</button>
    </div>`;
  return `<div class="sheet-title"><h2><span class="nm">${esc(sheetName(app))}</span>${tags}</h2>${recordLine(app)}
      <p class="whyline"><span class="why">${esc(whyWords(app))}</span><code class="id">${esc(fx?.id ?? s.id ?? '')}</code>${s.original && provenance(s.original) ? `<span class="prov">${esc(provenance(s.original))}</span>` : ''}</p></div>
    ${lockbar}`;
}

/**
 * WHERE THE ABILITY COMES FROM, on the sheet it is edited on: the FX's own record first, then the
 * address book by key (so a new FX names its book before it is saved); a key the address book does
 * not hold, on a sheet opened from a world item, is that item's own.
 */
function recordLine(app) {
  const s = app.sheet;
  const rec = recordOf(s.original) ?? (s.keys[0] ? recordFor(s.keys[0]) : null)
    ?? (s.keys[0] && s.subject?.uuid ? { uuid: s.subject.uuid, name: s.subject.name, where: `this world · ${s.subject.owner ?? 'the Items directory'}` } : null);
  if (!rec?.uuid) return '';
  return `<p class="recordline"><button type="button" class="link record" data-act="sh-record" data-uuid="${esc(rec.uuid)}" data-name="${esc(rec.name)}" data-tooltip="${esc(recordWords(rec, kindOf(s.keys[0])))}">${esc(rec.where)}</button></p>`;
}

/** the key and the layer, in terms: "Misty Step (spell) · House" */
function whyWords(app) {
  const s = app.sheet;
  return `${s.keys.length ? keyLabel(s.keys[0]) : 'no key yet'} · ${s.source ? SOURCE_TAG[s.source] : 'New'}`;
}

// --- the notes: the banner, every problem, and what the gap table says of the key ---
function notesHtml(app) {
  const a = api();
  const s = app.sheet;
  const edit = s.edit;
  const under = s.id && s.source === 'house' ? a.corpus.under(s.id) : null;
  const holder = edit ? holderOf(app) : null;
  const banner = edit && s.source === 'stock' ? `<div class="banner">Editing ${SOURCE_TAG.stock}. Save asks: a <b>${SOURCE_TAG.house} override</b> (${SOURCE_TAG.stock} untouched; the override wins), or ${SOURCE_TAG.stock} itself.</div>`
    : edit && under ? `<div class="banner">Editing the ${SOURCE_TAG.house} override. Save writes ${SOURCE_TAG.house}; ${SOURCE_TAG.stock} is not changed.</div>`
    : holder ? `<div class="banner">${esc(keyLabel(s.keys[0]))} already has an FX in ${SOURCE_TAG[holder.source]} (${esc(idWords(holder.fx.id))}). One FX answers one key: ${holder.source === 'stock' ? `Save asks — a <b>${SOURCE_TAG.house} override</b> of it, or ${SOURCE_TAG.stock} itself.` : 'Save <b>replaces</b> it.'}</div>` : '';
  // every problem, each one the button that takes you to the scene it names
  const problems = edit && !s.landing ? problemsOf(app) : [];
  const problemList = problems.length ? `<ul class="problems">${problems.map((p) => {
    const m = /\bscene (\d+)\b/.exec(p);
    const body = m ? `<button type="button" class="link bad" data-act="sh-pick" data-i="${Number(m[1]) - 1}">${esc(p)}</button>` : esc(p);
    return `<li class="problem bad">${body}</li>`;
  }).join('')}</ul>` : '';
  // the gap table's word on a key nothing answers yet; the landing says it in its own place
  const judged = !s.id && !s.landing ? judgementHtml(app) : '';
  return `${banner}${problemList}${judged}`;
}

/**
 * What the gap table holds for the sheet's key, in one line, through api.proposals when this build
 * has it (null, or {status: proposed | none | open, reason, basis, sentence, vfxFit, sfxFit}). No
 * proposals on the API, or none for the key, says nothing.
 */
function judgementHtml(app) {
  const key = app.sheet.keys[0];
  if (!key) return '';
  let j = null;
  try { j = api().proposals?.get?.(key) ?? null; } catch { j = null; }
  if (!j?.status) return '';
  if (j.status === 'none') return `<p class="judged"><span class="dot off"></span>The gap table judged it: no proposed FX${j.reason ? `: ${esc(j.reason)}` : ''}. You can still write one.</p>`;
  if (j.status === 'open') return '<p class="judged"><span class="dot none"></span>The gap table has not judged it yet.</p>';
  const basis = j.basis ? (api().fx.get(j.basis) ? nameOf(api().fx.get(j.basis).fx, idWords(j.basis)) : String(j.basis)) : '';
  const fits = [j.vfxFit ? `picture ${j.vfxFit}` : '', j.sfxFit ? `sound ${j.sfxFit}` : ''].filter(Boolean).join(', ');
  return `<p class="judged"><span class="dot custom"></span>The gap table proposes ${j.sentence ? `“${esc(j.sentence)}”` : 'an FX'}${basis ? `, from ${esc(basis)}` : ''}${fits ? ` (${esc(fits)})` : ''}.</p>`;
}

// --- the sentence ---
function sentencePart(app) {
  const s = app.sheet;
  return `<div class="sub">What plays</div><div class="sentence-box" role="button" tabindex="0" data-act="sh-sentence" data-open="${!!s.sentenceOpen}">${sentenceHtml(app, safeDraft(app), sheetName(app))}</div>`;
}

/** the FX as its sentence, with the selected scene's own clause marked */
function sentenceHtml(app, fx, name) {
  if (!fx) return '';
  const line = api().fx.sentence(fx, { name });
  const scene = app.sheet.scenes[pickOf(app)]?.scene;
  const clause = scene && !app.sheet.off ? sceneWords(scene) : '';
  const at = clause ? line.indexOf(clause) : -1;
  if (at < 0) return `<b>${esc(line)}</b>`;
  return `<b>${esc(line.slice(0, at))}<mark>${esc(clause)}</mark>${esc(line.slice(at + clause.length))}</b>`;
}

/** the sentence box says whether its two lines hold the sentence, and what a click on it does */
export function markClamped(app) {
  const box = app.element?.querySelector('[data-pane="editor"] .sentence-box');
  const b = box?.querySelector('b');
  if (!box || !b) return;
  const open = box.dataset.open === 'true';
  const clamped = open || b.scrollHeight > b.clientHeight + 1;
  box.dataset.clamped = String(clamped);
  if (clamped) box.dataset.tooltip = open ? 'Show two lines' : 'Show the whole sentence';
  else delete box.dataset.tooltip;
}

// -----------------------------------------------------------------------------------------------
// the landing: an ability nothing answers yet, and three doors (DESIGN §28.1)
// -----------------------------------------------------------------------------------------------
const VIA_WORDS = { wand: 'the item sheet’s FX Studio button', search: 'a Library search', coverage: 'a Coverage row' };

function landingHtml(app) {
  const a = api();
  const s = app.sheet;
  const sub = s.subject;
  const key = s.keys[0];
  const name = sheetName(app);
  const whose = sub?.uuid ? (sub.owner ? `${sub.owner}’s ${sub.name}` : `the world item ${sub.name}`) : null;
  const inBooks = !!recordFor(key);
  const opened = VIA_WORDS[s.via] ? `Opened from ${VIA_WORDS[s.via]}. ` : '';
  const answers = kindOf(key) === 'event'
    ? `An FX written here answers <code>${esc(key)}</code>: every ability at this moment.`
    : inBooks
      ? `An FX written here answers <code>${esc(key)}</code>: every copy of ${esc(nameForKey(key))} carries it.${whose ? ` For ${esc(whose)} alone, Own key on the sheet that follows.` : ''}`
      : `An FX written here answers <code>${esc(key)}</code>, the identifier ${whose ? esc(whose) : 'this item'} carries.`;
  const door = (id, title, sub2, act = 'sh-door') => `<button type="button" class="door" data-act="${act}" data-door="${id}" aria-pressed="${s.door === id}"><b>${title}</b><span>${sub2}</span></button>`;
  let under = '';
  if (s.door === 'starter') {
    const starters = [...(a.index.starters?.values?.() ?? [])];
    under = `<div class="doorbody"><span class="sub">A starter, whole</span><div class="hits">${starters.map((st) => `<button type="button" class="hit" data-act="sh-use-starter" data-id="${esc(st.id)}"><b>${esc(idWords(st.id))}</b><span class="w">${esc(st.note ?? '')}</span><span class="o">${st.scenes?.length ?? 0} scene${st.scenes?.length === 1 ? '' : 's'}: ${esc((st.scenes ?? []).map((x) => SHAPE_WORDS[x.shape] ?? x.shape).join(', '))}</span></button>`).join('')}</div></div>`;
  } else if (s.door === 'copy') {
    under = `<div class="doorbody"><span class="sub">Copy from</span>${likeBox(app)}</div>`;
  }
  return `<div class="nothing">
    <p class="big">Nothing plays for ${esc(name)}.</p>
    <p class="note">${opened}${answers}</p>
    ${judgementHtml(app)}
    <div class="three">
      ${door('starter', 'Starter', 'A whole starter, every scene of it: the teleport starter brings its two marks and its move.')}
      ${door('copy', 'Copy from', 'The scenes of an FX you like, as a copy you own.')}
      ${door('blank', 'Blank', 'An empty sequence. Add scenes yourself.', 'sh-blank')}
    </div>${under}
  </div>`;
}

/** Copy from: a box that finds an FX by name (never a starter: those are the Starter door's) */
function likeBox(app) {
  const s = app.sheet;
  const q = s.likeQuery ?? '';
  const open = s.suggest === 'like';
  const hits = open ? app.likeHits(q).filter((h) => h.tag !== 'starter') : [];
  const rows = hits.map((h) => `<button type="button" class="hit" data-act="sh-like-hit" data-id="${esc(h.id)}"><span>${esc(h.words)}${h.keys ? ` <span class="note">· ${esc(h.keys.slice(0, 60))}</span>` : ''}</span><span class="o">${esc(h.tag)}</span></button>`).join('') || '<div class="hit none"><span class="o">No match</span></div>';
  return `<div class="field search copy"><label>Copy from</label><input type="search" class="sh-like" data-field="like" placeholder="Search FX… Misty Step, Fire Bolt" aria-label="Copy the scenes of an FX" autocomplete="off" value="${esc(q)}"><div class="suggest" data-open="${open}">${open ? rows : ''}</div></div>`;
}

// -----------------------------------------------------------------------------------------------
// the Key strip: Answers · Item with Own key · Moment · State, each explained on the screen
// -----------------------------------------------------------------------------------------------
/**
 * The items the sheet can be opened on from here: every ability on this world's actors, matched on
 * its own name or its owner's. Not deduplicated by key: two copies of Misty Step are two items, and
 * Own key is how one of them gets a key of its own.
 */
function itemHits(app, q) {
  const needle = q.trim().toLowerCase();
  const rows = (app.entries ?? []).filter((e) => e.uuid && e.owner);
  const hit = needle ? rows.filter((e) => e.name.toLowerCase().includes(needle) || e.owner.toLowerCase().includes(needle)) : rows;
  return [...hit].sort((x, y) => x.owner.localeCompare(y.owner) || x.name.localeCompare(y.name)).slice(0, 12);
}

/** the events a GM may key an FX to, by the word, its term or its phrase: the moments By the Books names */
function eventHits(q, taken) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return HEARD_EVENTS.filter((w) => !taken.has(`event:${w}`) && [w, MOMENT_TERMS[w], WHEN_WORDS[w], 'event'].some((t) => String(t).toLowerCase().includes(needle)))
    .map((w) => ({ key: `event:${w}`, name: keyLabel(`event:${w}`), where: `an event: every ability ${WHEN_WORDS[w]}` }));
}

/**
 * The records address book searched by the record's own name, for keys no actor's sheet holds yet:
 * a key is EARNED from a record, never made from a typed name (DESIGN §23).
 */
function recordHits(app, q, taken) {
  const needle = q.trim().toLowerCase();
  if (!needle || !recordsRead()) return [];
  const map = api().records.map() ?? {};
  const out = [];
  for (const [key, rec] of Object.entries(map)) {
    if (taken.has(key) || !rec?.name || !rec.name.toLowerCase().includes(needle)) continue;
    if (!AUTHORED_KINDS.includes(kindOf(key))) continue;
    out.push({ key, name: rec.name, where: rec.where ?? '' });
    if (out.length >= 8) break;
  }
  return out.sort((x, y) => (x.name.toLowerCase() === needle ? 0 : 1) - (y.name.toLowerCase() === needle ? 0 : 1) || x.name.localeCompare(y.name));
}

/** what the Answers box finds: abilities on actors and keys the corpus knows, then the records, then the events */
function keyHits(app, q) {
  const hits = app.searchHits(q);
  const taken = new Set(hits.flatMap(({ e }) => e.keys));
  const recs = recordHits(app, q, taken);
  for (const r of recs) taken.add(r.key);
  return { hits, recs, events: eventHits(q, taken) };
}

/** the words under the key: what it is, and who plays it */
function keyWords(app) {
  const s = app.sheet;
  const key = s.keys[0];
  if (!key) return { note: '', why: 'Choose the ability this FX answers. A key is earned from an item or a record, never typed.' };
  const p = parseKey(key);
  if (p.kind === 'event') return { note: "an event: every ability at this moment, after the ability's own FX for the word", why: `By the Books names the moment “${WHEN_WORDS[p.id] ?? p.id}”. No record and no item carry an event key.` };
  const name = recordFor(key)?.name ?? keyLabel(key).replace(/ \([a-z]+\)$/, '');
  if (recordFor(key)) return { note: 'every copy answers it', why: `The key is the ${p.kind}'s dnd5e identifier “${p.id}”. Every copy of ${name} carries it and plays this FX; Own key gives one copy an identifier of its own.` };
  return { note: "this world's own item", why: `The key is the identifier “${p.id}” this world's own item carries. Only an item with that identifier plays this FX.` };
}

function renderKey(app) {
  const s = app.sheet;
  const edit = s.edit;
  const sub = s.subject;
  const key = s.keys[0] ?? null;
  const isEvent = kindOf(key) === 'event';
  // ONE FX ANSWERS ONE KEY, and an item has one key (DESIGN §23): Answers is ONE pill. Unlocked, the
  // search box REPLACES the key; there is nothing to add and nothing to remove.
  const kw = keyWords(app);
  const keyPill = key ? `<span class="pill key" aria-pressed="true">${esc(keyLabel(key))}</span>` : '<span class="note">No key yet</span>';
  const keyOpen = s.suggest === 'key' && !!s.keyQuery.trim();
  let keySuggest = '';
  if (keyOpen) {
    const { hits, recs, events } = keyHits(app, s.keyQuery);
    keySuggest = hits.map(({ e }) => `<button type="button" class="hit" data-act="sh-key-hit" data-uuid="${esc(e.uuid ?? '')}" data-owner="${esc(e.owner ?? '')}" data-keys="${esc(e.keys.join(' '))}"><span>${dot(e.status)}${esc(e.name)}${e.effect ? ' <span class="note">effect</span>' : ''}</span><span class="o">${esc(app.hitWhere(e))}</span></button>`).join('')
      + recs.map((r) => `<button type="button" class="hit" data-act="sh-key-rec" data-key="${esc(r.key)}"><span>${dot('none')}${esc(r.name)}</span><span class="o">${esc(r.where)}</span></button>`).join('')
      + events.map((r) => `<button type="button" class="hit" data-act="sh-key-rec" data-key="${esc(r.key)}"><span>${dot('none')}${esc(r.name)}</span><span class="o">${esc(r.where)}</span></button>`).join('')
      || '<div class="hit none"><span class="o">No ability of that name in the books or on an actor</span></div>';
  }
  const addKey = edit ? `<div class="search sh-key-search"><input type="search" class="sh-key-q" data-field="key-q" placeholder="${key ? 'Change the ability' : 'Choose an ability'}" aria-label="${key ? 'Change the ability' : 'Choose an ability'}" autocomplete="off" value="${esc(s.keyQuery)}"><div class="suggest" data-open="${keyOpen}">${keySuggest}</div></div>` : '';
  const keyLine = key ? `<div class="keyline"><code class="key">${esc(key)}</code><span class="note">${esc(kw.note)}</span></div>` : '';

  // THE ITEM column keeps its place whether or not the sheet knows an item (R1). An item in the
  // sidebar is an item as much as one on an actor: Own key writes its identifier the same way.
  const canItem = !isEvent && !!sub?.uuid;
  const itemWords = canItem ? (sub.owner ? `${esc(sub.owner)} · ${esc(sub.name)}` : `${esc(sub.name)} · world item`) : 'Find an item';
  const picking = s.itemQuery !== null && s.itemQuery !== undefined;
  let itemPills;
  let itemWhy;
  if (isEvent) {
    itemPills = '<span class="pill" data-na="true">No item</span><span class="pill" data-na="true">Own key</span>';
    itemWhy = 'An event has no item.';
  } else {
    const itemPill = edit
      ? `<button type="button" class="pill" aria-pressed="${picking}" data-act="sh-pick-item">${itemWords}</button>`
      : canItem ? `<span class="pill" aria-pressed="true">${itemWords}</span>` : '<span class="pill" data-na="true">No item</span>';
    const ownKey = canItem && edit ? '<button type="button" class="pill" data-act="sh-own-key">Own key</button>' : '<span class="pill" data-na="true">Own key</span>';
    itemPills = `${itemPill}${ownKey}`;
    const whose = canItem ? (sub.owner ? `${sub.owner}'s ${sub.name}` : `the world item ${sub.name}`) : '';
    itemWhy = canItem && edit ? `Own key gives ${whose} a key of its own; this FX then plays for it alone.`
      : canItem ? 'Unlock the sheet to give this item a key of its own.'
        : edit ? 'Find an item on an actor; Own key then gives it a key of its own.'
          : 'Opened without an item. Own key needs one: open the sheet from an item, or unlock it and find one.';
  }
  const itemOpen = picking && s.suggest === 'item';
  const itemRows = itemOpen ? (itemHits(app, s.itemQuery).map((e) => `<button type="button" class="hit" data-act="sh-item-hit" data-uuid="${esc(e.uuid)}"><span>${dot(e.status)}${esc(e.owner)} · ${esc(e.name)}</span><span class="o">${esc(app.hitWhere(e))}</span></button>`).join('') || '<div class="hit none"><span class="o">No item of that name on an actor</span></div>') : '';
  const pickItem = picking && !isEvent ? `<div class="search sh-item-search"><input type="search" class="sh-item-q" data-field="item-q" placeholder="Find an item on an actor" aria-label="Find an item on an actor" autocomplete="off" value="${esc(s.itemQuery)}"><div class="suggest" data-open="${itemOpen}">${itemRows}</div></div>` : '';

  // THE MOMENT: all nine words of WHEN, the pressed one's phrase under them, and which are whose. On
  // an event key the word IS the event, so pressing another word re-keys it; dnd5e's two are not
  // heard as events and are greyed there.
  const pills = WHEN.map((w) => {
    const off = isEvent && !HEARD_EVENTS.includes(w);
    return `<button type="button" class="pill" aria-pressed="${s.on === w}" data-act="sh-on" data-on="${w}"${off ? ' disabled data-na="true" data-tooltip="Use and Effect are dnd5e’s: neither is heard as an event."' : ''}>${esc(MOMENT_TERMS[w] ?? w)}</button>`;
  }).join('');
  const btb = HEARD_EVENTS;
  const falls = btb.filter((w) => FALLS_BACK_TO_USE.includes(w)).map((w) => MOMENT_TERMS[w]);
  const never = btb.filter((w) => !FALLS_BACK_TO_USE.includes(w)).map((w) => MOMENT_TERMS[w]);
  const momentNote = `${list(DND5E_WORDS.map((w) => MOMENT_TERMS[w]))} are dnd5e's; the other ${btb.length} are By the Books' and play only at a table running it. ${list(falls)} fall back to the ability's Use FX when nothing is written for the word; ${list(never)} never do.`;
  const state = [[false, 'On'], [true, 'Off']].map(([v, w]) => `<button type="button" class="pill" aria-pressed="${s.off === v}" data-act="sh-off" data-v="${v}">${w}</button>`).join('');
  return `<div class="sub">Key</div><div class="hookstrip">
    <div class="hcol wide"><span class="lbl">Answers</span><div class="pills wrap">${keyPill}${addKey}</div>${keyLine}<p class="why">${esc(kw.why)}</p></div>
    <div class="hcol"><span class="lbl">Item</span><div class="pills">${itemPills}</div>${pickItem}<p class="why">${esc(itemWhy)}</p></div>
    <div class="hcol"><span class="lbl">Moment</span><div class="pills moments">${pills}</div><p class="phrase">${esc(WHEN_WORDS[s.on] ?? s.on)}</p><p class="why">${esc(momentNote)}</p></div>
    <div class="hcol"><span class="lbl">State</span><div class="pills">${state}</div></div>
  </div>`;
}

/** the entry a suggestion stands for, found by what it is (its item, its owner, its keys), never by a position in a list refresh() rebuilds under it */
const entryAt = (app, b) => (app.entries ?? []).find((e) => (e.uuid ?? '') === (b.dataset.uuid ?? '') && (e.owner ?? '') === (b.dataset.owner ?? '') && e.keys.join(' ') === (b.dataset.keys ?? '')) ?? null;

/** the sheet's one key, and the moment it implies: an effect plays while it stands, an event is its own word */
function setKey(app, key, subject) {
  const s = app.sheet;
  const wasEvent = kindOf(s.keys[0]) === 'event';
  s.keys = [key];
  s.subject = subject;
  const p = parseKey(key);
  if (p?.kind === 'effect') s.on = 'effect';
  else if (p?.kind === 'event') s.on = p.id;
  else if (wasEvent) s.on = subject?.on ?? 'use';
  s.keyQuery = '';
  s.suggest = null;
}

/** the sheet's key becomes an entry's own (an ammunition's or a cast spell's key may sit before it; an effect's own is first) */
function takeEntry(app, e) {
  const own = e.effect ? e.keys[0] : e.keys[e.keys.length - 1];
  if (own) setKey(app, own, app.subjectFromEntry(e));
}

/** the sheet's key becomes a key the records hold, or an event */
const takeKey = (app, key) => setKey(app, key, app.subjectForKey(key));

/** the sheet moved onto an item: the item is the subject, and its key is the sheet's when the sheet has none yet */
function takeItem(app, item) {
  const s = app.sheet;
  s.subject = app.subjectFromItem(item);
  const k = bareKey(s.subject);
  if (k && !s.keys.length) s.keys = [k];
  s.itemQuery = null;
  s.suggest = null;
}

/**
 * OWN KEY (DESIGN §23): this item, and no other copy of it, gets a key of its own. The identifier is
 * dnd5e's own field on the item (system.identifier), so the key travels with the item and nothing of
 * ours is written on it. The sheet then stands for a NEW House FX keyed to it — whatever answered the
 * item before is copied in — and Save writes House. An item in the sidebar takes one the same way.
 */
async function ownKey(app) {
  const s = app.sheet;
  const sub = s.subject;
  const item = sub?.uuid ? fromUuidSync(sub.uuid) : null;
  if (!item || !s.edit) return undefined;
  const p = parseKey(bareKey(sub) ?? '');
  if (!p) return app.toast('This item has no key to make its own.');
  const was = `${p.kind}:${p.id}`;
  const suggested = `${p.id}-${slug(sub.owner ?? 'own')}`;
  const whose = sub.owner ? `<b>${esc(sub.owner)}</b>’s <b>${esc(sub.name)}</b>` : `the world item <b>${esc(sub.name)}</b>`;
  const chosen = await asked('prompt', {
    window: { title: `Own key for ${esc(sub.name)}` },
    content: `<p>Writes an identifier of its own on ${whose}, so this FX plays for that item alone. Other copies keep answering <b>${esc(keyLabel(was))}</b>.</p>
      <div class="form-group"><label>Identifier</label><input type="text" name="identifier" value="${esc(suggested)}" autocomplete="off"></div>`,
    ok: { label: 'Own key', callback: (ev, button) => button.form.elements.identifier?.value ?? '' },
    rejectClose: false, modal: true,
  });
  if (chosen === null || chosen === undefined) return undefined;
  const id = slug(chosen);
  if (!id) return app.toast('An identifier is letters, digits and dashes.');
  if (id === p.id) return app.toast(`${sub.name} already keys as ${keyLabel(was)}; choose another identifier.`);
  const key = `${p.kind}:${id}`;
  const a = api();
  if (a.fx.get(id) || a.fx.for(key).length) return app.toast(`An FX already answers ${keyLabel(key)}; choose another identifier.`);
  try { await item.update({ 'system.identifier': id }); } catch (err) { return app.toast(`Could not write the identifier: ${err.message}`); }
  // the sheet becomes a new House FX for the new key, copied from what it showed
  const from = s.id;
  s.id = null; s.source = null; s.shadowed = false; s.original = null;
  if (from && !s.from) s.from = from;
  s.keys = [key];
  s.itemQuery = null;
  app.refresh();
  s.subject = app.subjectFromItem(item);
  s.snapshot = null;
  return paintSheet(app);
}

// -----------------------------------------------------------------------------------------------
// the sequence: the head, the rail and the inspector
// -----------------------------------------------------------------------------------------------
/**
 * When each scene starts, on one ms scale, by the engine's own rule (engine/common.js `timing`): a
 * scene that holds the sequence makes the next one start when it has finished, plus or minus the
 * offset; a scene that does not hold starts alongside the one before it, after its own Wait before.
 * A picture's own length is not in the grammar and the sheet loads no picture, so it stands at a
 * nominal length.
 */
const NOMINAL_MS = 1000;
function timeline(scenes) {
  let cursor = 0;
  return scenes.map(({ scene }) => {
    const sc = withDefaults(scene);
    const times = Math.max(1, Math.round(sc.repeat ?? 1));
    const one = NOMINAL_MS / (sc.rate && sc.rate > 0 ? sc.rate : 1);
    const dur = one * times + (sc.every ?? 0) * (times - 1);
    const holds = !!scene.wait;
    const start = holds ? cursor : cursor + (scene.delay ?? 0);
    const end = start + dur;
    if (holds) cursor = end + (typeof scene.wait === 'number' ? scene.wait : 0);
    return { start, end, dur };
  });
}

/**
 * Why Play cannot run right now, in words, or null when it can. One rule, in one place: every ▶
 * reads it and greys where it stands with the reason.
 */
export function playWhyOf(scenes, off = false) {
  if (off) return 'switched off';
  if (!scenes.length) return 'no scenes';
  if (!canvas?.tokens?.controlled?.length) return 'select a token';
  if (needsPlace({ scenes }) && !canvas.regions?.controlled?.length) return 'select a placed template';
  return null;
}
const playWhy = (app, scene = null) => playWhyOf(scene ? [scene] : app.sheet.scenes.map((x) => x.scene), app.sheet.off);

/** "Sequence", how long it runs, and ▶ Play all: the whole draft FX through the preview, saving nothing */
function seqHead(app) {
  const s = app.sheet;
  const t = timeline(s.scenes);
  const meta = s.scenes.length ? `${s.scenes.length} scene${s.scenes.length === 1 ? '' : 's'} · ${(Math.max(...t.map((x) => x.end), 0) / 1000).toFixed(1)} s` : '';
  const why = playWhy(app);
  return `<div class="sub">Sequence</div><span class="seqmeta">${meta}</span><span class="spacer"></span><button type="button" class="quiet playall" data-act="sh-play-all" aria-label="Play all" data-tooltip="${esc(why ? `Play all: ${why}` : 'Play the whole FX on the selected token now. Nothing is saved.')}" ${why ? 'disabled' : ''}>▶ Play all</button>`;
}

/** a scene of this shape, stamped out of its starter (a stencil: the FX owns the copy), opened in the inspector */
function addScene(app, shape) {
  const s = app.sheet;
  const stencil = api().fx.scenesOf(STARTER_OF_SHAPE[shape]);
  const scene = stencil.find((sc) => sc.shape === shape) ?? stencil[0];
  if (!scene) return;
  s.scenes.push({ scene: named(scene) });
  s.pick = s.scenes.length - 1;
}

/** "Shape · place" on a rail row */
function railWords(scene) {
  const sc = withDefaults(scene);
  if (scene.shape === 'move') return `Move · within ${sc.range ?? 30} ft`;
  if (scene.shape === 'shoot' || scene.shape === 'beam') return `${SHAPE_WORDS[scene.shape]} · ${PLACE_WORDS[sc.from] ?? ''} → ${(PLACE_WORDS[sc.to] ?? '').split(',')[0]}`;
  const place = PLACE_WORDS[sc.to ?? sc.at] ?? (scene.shape === 'fill' ? 'the template' : '');
  return `${SHAPE_WORDS[scene.shape] ?? scene.shape}${place ? ` · ${place.split(',')[0]}` : ''}`;
}

/** the rail: one fixed row per scene (its number, "Shape · place", when it starts, its ▶); it scrolls past four; + Add a scene opens the eight shapes in place */
function railHtml(app) {
  const s = app.sheet;
  const t = timeline(s.scenes);
  const now = pickOf(app);
  const rows = s.scenes.map(({ scene }, i) => {
    const why = playWhy(app, scene);
    return `<div class="row" data-kind="${KIND_OF_SHAPE(scene.shape)}" data-now="${i === now}">
      <button type="button" class="pickbtn" data-act="sh-pick" data-i="${i}" aria-current="${i === now}">
        <span class="num">${i + 1}</span>
        <span class="txt"><span class="n">${esc(railWords(scene))}</span><span class="ms">${Math.round(t[i].start)} ms</span></span>
      </button>
      <button type="button" class="quiet play" data-act="sh-play-scene" data-i="${i}" aria-label="Play scene ${i + 1}" data-tooltip="${esc(why ? `Play scene ${i + 1}: ${why}` : `Play scene ${i + 1} on the selected token now. Nothing is saved.`)}" ${why ? 'disabled' : ''}>▶</button>
    </div>`;
  }).join('');
  const menu = s.edit && s.adding ? `<div class="addmenu" role="menu">${Object.entries(SHAPE_WORDS).filter(([sh]) => sh !== 'custom').map(([sh, wd]) => `<button type="button" role="menuitem" data-act="cw-add" data-shape="${sh}"><b>${wd}${KIND_TITLE[KIND_OF_SHAPE(sh)] ? ` · ${KIND_TITLE[KIND_OF_SHAPE(sh)]}` : ''}</b><span>${esc(SHAPE_HELP[sh])}</span></button>`).join('')}</div>` : '';
  const add = s.edit ? `<button type="button" class="addrow" data-act="cw-add-ask" aria-expanded="${!!s.adding}">+ Add a scene</button>${menu}` : '';
  return `<div class="rail">${rows || '<p class="note">No scenes yet.</p>'}</div>${add}`;
}

// -----------------------------------------------------------------------------------------------
// the inspector: one column of the cells the shape reads (DESIGN §28.4)
// -----------------------------------------------------------------------------------------------
/** the shape's own cells, in their order; each is drawn only when KNOBS says the shape reads it */
const OWN_CELLS = { strike: ['onmiss', 'thrown', 'reach'], shoot: ['onmiss', 'return'], mark: ['onmiss', 'follow', 'face'], fill: ['cleartemplate'], aura: ['breathe', 'pulse'], move: ['range', 'spot', 'jump', 'fade', 'speed', 'after'] };
const GROUP_CELLS = {
  picture: ['vfx', 'from', 'to', 'at', 'size', 'colour', 'opacity', 'tint', 'below', 'mirror', 'scatter'],
  timing: ['delay', 'times', 'every', 'rate', 'fadein', 'fadeout', 'lasts', 'hold'],
  sound: ['sfx', 'volume', 'start', 'sdelay', 'stimes', 'severy'],
  placement: ['rotate', 'anchor', 'elevation', 'zindex', 'mask', 'attach'],
};
const GROUP_TITLES = { picture: 'Picture', timing: 'Timing', sound: 'Sound', placement: 'Placement' };
/** the knob in core/fx.js KNOBS a cell writes */
const KNOB_OF = { vfx: 'asset', colour: 'asset', from: 'from', to: 'to', at: 'at', size: 'size', opacity: 'opacity', tint: 'tint', below: 'below', mirror: 'mirror', scatter: 'scatter', delay: 'delay', times: 'repeat', every: 'every', rate: 'rate', fadein: 'fadeIn', fadeout: 'fadeOut', lasts: 'persist', hold: 'wait', rotate: 'rotate', anchor: 'anchor', elevation: 'elevation', zindex: 'zIndex', mask: 'mask', attach: 'attach', onmiss: 'onMiss', thrown: 'thrown', reach: 'thrown', return: 'return', cleartemplate: 'clearTemplate', follow: 'follow', face: 'face', breathe: 'breathe', pulse: 'pulse', range: 'range', spot: 'seen', jump: 'jump', fade: 'fade', speed: 'speed', after: 'after' };

/** does this shape read the cell at all? (KNOBS, and nothing else) */
function reads(cell, shape) {
  const may = (k) => (KNOBS[shape] ?? []).includes(k);
  const isSound = shape === 'sound';
  if (cell === 'vfx' || cell === 'colour') return may('asset') && !isSound;
  if (cell === 'sfx') return isSound ? may('asset') : may('sound');
  if (cell === 'volume' || cell === 'start') return isSound ? may(cell) : may('sound');
  if (cell === 'sdelay' || cell === 'stimes' || cell === 'severy') return !isSound && may('sound');
  return may(KNOB_OF[cell]);
}

/** the groups for one scene, in order: the shape's own, then Picture, Timing, Sound, Placement; empty groups are not drawn */
function groupsOf(scene) {
  const out = [];
  const own = (OWN_CELLS[scene.shape] ?? []).filter((c) => reads(c, scene.shape));
  if (own.length) out.push({ id: 'shape', title: SHAPE_WORDS[scene.shape] ?? scene.shape, cells: own });
  for (const [id, cells] of Object.entries(GROUP_CELLS)) {
    const live = cells.filter((c) => reads(c, scene.shape));
    if (live.length) out.push({ id, title: GROUP_TITLES[id], cells: live });
  }
  return out;
}

function inspector(app) {
  const s = app.sheet;
  if (!s.scenes.length) {
    return `<div class="inspector empty"><p class="note">No scenes yet. Add one${s.edit ? ', or copy the scenes of an FX you like' : ''}.</p>${s.edit ? likeBox(app) : ''}</div>`;
  }
  const i = pickOf(app);
  const scene = s.scenes[i].scene;
  const kind = KIND_OF_SHAPE(scene.shape);
  const last = s.scenes.length - 1;
  const tools = s.edit ? `<button type="button" class="quiet" data-act="cw-up" data-i="${i}" aria-label="Up" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="quiet" data-act="cw-down" data-i="${i}" aria-label="Down" ${i === last ? 'disabled' : ''}>↓</button><button type="button" class="quiet drop" data-act="cw-drop" data-i="${i}" aria-label="Remove scene">✕</button>` : '';
  const groups = groupsOf(scene);
  const drawerIn = s.drawer?.i === i ? (s.drawer.slot === 'sound' ? 'sound' : 'picture') : null;
  const body = groups.map((g, n) => {
    const open = g.id === drawerIn || (s.open[g.id] ?? (n === 0));
    const cells = g.cells.map((c) => {
      const html = cellHtml(app, c, scene, i);
      const slot = c === 'vfx' ? 'asset' : c === 'sfx' ? 'sound' : null;
      return slot && s.drawer?.i === i && s.drawer.slot === slot ? html + drawerHtml(app) : html;
    }).filter(Boolean);
    return `<details class="grp" data-group="${g.id}" ${open ? 'open' : ''}><summary data-act="sh-group" data-group="${g.id}"><span class="t">${esc(g.title)}</span><span class="n">${cells.length} cell${cells.length === 1 ? '' : 's'}</span></summary><div class="cells">${cells.join('')}</div></details>`;
  }).join('');
  return `<div class="inspector" data-kind="${kind}" data-shape="${scene.shape}">
    <div class="ihead"><span class="num">${i + 1}</span><span class="kind">${esc(SHAPE_WORDS[scene.shape] ?? scene.shape)}${KIND_TITLE[kind] ? ` · ${KIND_TITLE[kind]}` : ''}</span><div class="tools">${tools}</div></div>
    <div class="line">${esc(sceneWords(scene))}</div>
    ${body}
  </div>`;
}

/** one cell: its label, its control, and — when it means nothing yet — its reason beside it, in words */
const cell = (col, label, ctrl, why = '') => `<div class="f f-${col}"${why ? ' data-dim="true"' : ''}><span class="l">${label}</span><div class="c">${ctrl}${why ? `<span class="dimwhy">${esc(why)}</span>` : ''}</div></div>`;
const placeOptions = (current) => PLACES.filter((p) => !['impact', 'area'].includes(p) || p === current).map((p) => `<option value="${p}"${p === current ? ' selected' : ''}>${esc(PLACE_WORDS[p])}</option>`).join('');
const options = (pairs, cur) => pairs.map(([v, w]) => `<option value="${esc(String(v))}"${String(cur) === String(v) ? ' selected' : ''}>${esc(w)}</option>`).join('');
/** the size's kind: which of {tokenWidths}, {radius}, {squares}, {fit} it is */
const sizeKind = (size) => (size.tokenWidths !== undefined ? 'tokenWidths' : size.radius !== undefined ? 'radius' : size.squares !== undefined ? 'squares' : size.fit === 'object' ? 'fit-object' : 'fit');

function cellHtml(app, key, scene, i) {
  const a = api();
  const s = app.sheet;
  const sc = withDefaults(scene);
  const locked = !s.edit;
  const isSound = scene.shape === 'sound';
  const snd = isSound ? scene : (scene.sound ?? null);
  const hasSound = isSound || !!scene.sound?.asset;
  const dis = (dim = false) => (locked || dim ? 'disabled' : '');
  const num = (field, value, extra = '', dim = false) => `<input type="number" class="cw-${field}" data-field="${field}" data-i="${i}" value="${esc(String(value))}" ${extra} ${dis(dim)}>`;
  // a two-word switch: the checkbox is there for the writers, the words are what you see
  const seg = (field, checked, offWord, onWord, dim = false) => `<label class="seg"><input type="checkbox" class="cw-${field}" data-field="${field}" data-i="${i}" ${checked ? 'checked' : ''} ${dis(dim)}><span class="off">${offWord}</span><span class="on">${onWord}</span></label>`;
  const select = (field, pairs, cur, label, extra = '') => `<select class="cw-${field}" data-field="${field}" data-i="${i}" aria-label="${esc(label)}" ${extra} ${dis()}>${options(pairs, cur)}</select>`;
  const soundWhy = !hasSound ? 'means nothing until the scene has an SFX' : '';
  // a knob the sheet shows and clears but does not write (thrown, return, breathe, pulse): what it holds, a door to the Assets tab when it is an asset, and ✕
  const compound = (col, label, slot, held, act) => {
    if (!held) return cell(col, label, '<span class="suffix">none</span>');
    const shown = slot ? `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="${slot}" data-tooltip="Open it in the Assets tab">${esc(assetWords(held))}</button>` : `<span class="suffix">${esc(String(held))}</span>`;
    return cell(col, label, `${shown}${locked ? '' : `<button type="button" class="quiet" data-act="${act}" data-i="${i}" aria-label="Remove ${label}">✕</button>`}`);
  };
  // a picture or a sound is a name: its words open the Assets tab on it, and Browse picks another into this scene, here
  const named2 = (slot, asset, none) => {
    const words = asset ? assetWords(asset) : none;
    return `<button type="button" class="link asset" data-act="cw-show" data-i="${i}" data-slot="${slot}" data-tooltip="Open it in the Assets tab" ${asset ? '' : 'disabled'}>${esc(words)}</button>${locked ? '' : `<button type="button" class="browse" data-act="cw-browse" data-i="${i}" data-slot="${slot}" aria-expanded="${s.drawer?.i === i && s.drawer.slot === slot}">Browse</button>`}`;
  };

  switch (key) {
    // ---- the shape's own ----
    case 'onmiss': {
      const pairs = scene.shape === 'shoot' ? [['fly-past', MISS_WORDS['fly-past']], ['play', MISS_WORDS.play], ['skip', MISS_WORDS.skip]] : [['play', MISS_WORDS.play], ['skip', MISS_WORDS.skip]];
      return cell('onmiss', 'On miss', select('onmiss', pairs, sc.onMiss ?? 'play', 'On miss'));
    }
    case 'thrown': return compound('thrown', 'Thrown', 'thrown', scene.thrown?.asset, 'cw-thrown-off');
    case 'reach': {
      // in grid squares, as the engine measures it ("auto", the default, is one square, two for a reach weapon)
      const reach = typeof scene.thrown?.reach === 'number' ? scene.thrown.reach : 1;
      const why = scene.thrown ? '' : 'means nothing while nothing is thrown';
      return cell('reach', 'Reach', `${num('reach', reach, 'min="1" step="1" aria-label="Reach (squares)"', !!why)}<span class="suffix">squares</span>`, why);
    }
    case 'return': return compound('return', 'Return', 'return', scene.return?.asset, 'cw-return-off');
    case 'cleartemplate': return cell('cleartemplate', 'Clear template', seg('cleartemplate', scene.clearTemplate, 'Keep', 'When played'));
    case 'follow': return cell('follow', 'Follow', seg('follow', scene.follow, 'Stays', 'Follows'));
    case 'face': return cell('face', 'Face', seg('face', scene.face === 'away-from-source', 'As is', 'Away'));
    case 'breathe': return compound('breathe', 'Breathe', null, scene.breathe ? `${scene.breathe.min ?? 0}–${scene.breathe.max ?? 0} every ${scene.breathe.every ?? 0} ms` : null, 'cw-breathe-off');
    case 'pulse': return compound('pulse', 'Pulse', null, scene.pulse ? `${scene.pulse.min ?? 0}–${scene.pulse.max ?? 0} every ${scene.pulse.every ?? 0} ms` : null, 'cw-pulse-off');
    case 'range': return cell('range', 'Range', `${num('range', sc.range ?? 30, 'min="5" step="5" aria-label="Range (ft)"')}<span class="suffix">ft</span>`);
    case 'spot': {
      const spot = sc.seen && sc.unoccupied ? 'seen-unoccupied' : sc.seen ? 'seen' : sc.unoccupied ? 'unoccupied' : 'any';
      return cell('spot', 'Spot', select('spot', [['seen-unoccupied', 'to an unoccupied space they can see'], ['unoccupied', 'to an unoccupied space, seen or not'], ['seen', 'to a space they can see'], ['any', 'to any space']], spot, 'Spot'));
    }
    case 'jump': return cell('jump', 'Arrives', seg('jump', sc.jump ?? true, 'Travels', 'Appears'));
    case 'fade': return cell('fade', 'Fade', seg('fade', !!scene.fade, 'Off', 'On'));
    case 'speed': {
      const why = sc.jump ? 'means nothing while it appears without travelling' : '';
      return cell('speed', 'Travel speed', num('speed', sc.speed ?? 120, 'min="1" step="10" aria-label="Travel speed"', !!why), why);
    }
    case 'after': return cell('after', 'Before moving', `${num('after', sc.after ?? 0, 'min="0" step="50" aria-label="Before moving (ms)"')}<span class="suffix">ms</span>`);

    // ---- Picture ----
    case 'vfx': return cell('vfx', 'VFX', named2('asset', scene.asset, 'No VFX'));
    case 'from': return cell('from', 'From', `<select class="cw-place" data-field="place" data-k="from" data-i="${i}" aria-label="From" ${dis()}>${placeOptions(sc.from)}</select>`);
    case 'to': return cell('to', 'To', `<select class="cw-place" data-field="place" data-k="to" data-i="${i}" aria-label="To" ${dis()}>${placeOptions(sc.to)}</select>`);
    case 'at': return cell('at', 'At', `<select class="cw-place" data-field="place" data-k="at" data-i="${i}" aria-label="At" ${dis()}>${placeOptions(sc.at)}</select>`);
    case 'size': {
      const size = sc.size ?? { tokenWidths: 1 };
      const k = sizeKind(size);
      const kinds = Object.entries(SIZE_WORDS).filter(([v]) => v !== 'fit-object' || k === 'fit-object');
      const kindSel = select('size-kind', kinds, k, 'Size kind');
      if ((k === 'fit' || k === 'fit-object') && size.scale && typeof size.scale === 'object') {
        return cell('size', 'Size', `${num('size', size.scale.x ?? 1, 'data-k="scale.x" min="0.05" step="0.05" aria-label="Size across"')}${num('size', size.scale.y ?? 1, 'data-k="scale.y" min="0.05" step="0.05" aria-label="Size down"')}<span class="suffix">×</span>${kindSel}`);
      }
      const field = k === 'fit' || k === 'fit-object' ? 'scale' : k;
      const value = field === 'scale' ? (size.scale ?? 1) : size[field];
      return cell('size', 'Size', `${num('size', value, `data-k="${field}" min="0.05" step="${field === 'scale' ? '0.05' : field === 'tokenWidths' ? '0.25' : '0.5'}" aria-label="Size"`)}${field === 'scale' ? '<span class="suffix">×</span>' : ''}${kindSel}`);
    }
    case 'colour': {
      // the asset's own colour, from the family's registration: a swap, never a tint; shown only when the family has more than one
      const path = scene.asset ? a.assets.resolve(scene.asset).path ?? null : null;
      const family = path ? a.assets.familyOf(path) : null;
      const colours = family ? a.assets.colours(family) : [];
      if (colours.length < 2) return null;
      const current = path && family ? path.slice(family.length + 1) : '';
      return cell('colour', 'Colour', select('colour', colours.map((c) => [c, c.replace(/_/g, ' ')]), current, 'Colour'));
    }
    case 'opacity': return cell('opacity', 'Opacity', `${num('opacity', Math.round((sc.opacity ?? 1) * 100), 'min="0" max="100" step="5" aria-label="Opacity (%)"')}<span class="suffix">%</span>`);
    case 'tint': {
      const tint = scene.tint?.colour ?? '';
      return cell('tint', 'Tint', !locked
        ? `<input type="color" class="cw-tint" data-field="tint" data-i="${i}" value="${esc(tint || '#ffffff')}" aria-label="Tint">${tint ? `<button type="button" class="quiet" data-act="cw-tint-off" data-i="${i}" aria-label="No tint">✕</button>` : '<span class="suffix">none</span>'}`
        : (tint ? `<span class="swatch" style="background:${esc(tint)}"></span><span class="suffix">${esc(tint)}</span>` : '<span class="suffix">none</span>'));
    }
    case 'below': return cell('below', 'Depth', seg('below', scene.below, 'Over', 'Under'));
    case 'mirror': return cell('mirror', 'Mirror', seg('mirror', (sc.mirror ?? 'random') === 'random', 'Never', 'Random'));
    case 'scatter': return cell('scatter', 'Scatter', seg('scatter', scene.scatter, 'Off', 'On'));

    // ---- Timing ----
    case 'delay': return cell('delay', 'Wait before', `${num('delay', scene.delay ?? 0, 'min="0" step="50" aria-label="Wait before (ms)"')}<span class="suffix">ms</span>`);
    case 'times': return cell('times', 'Times', num('times', sc.repeat ?? 1, 'min="1" step="1" aria-label="Times"'));
    case 'every': {
      const why = (sc.repeat ?? 1) > 1 ? '' : 'means nothing while Times is 1';
      return cell('every', 'Every', `${num('every', sc.every ?? 250, 'min="0" step="50" aria-label="Every (ms)"', !!why)}<span class="suffix">ms</span>`, why);
    }
    case 'rate': return cell('rate', 'Speed', `${num('rate', sc.rate ?? 1, 'min="0.1" step="0.25" aria-label="Speed"')}<span class="suffix">×</span>`);
    case 'fadein': return cell('fadein', 'Fade in', `${num('fadein', sc.fadeIn ?? 0, 'min="0" step="50" aria-label="Fade in (ms)"')}<span class="suffix">ms</span>`);
    case 'fadeout': return cell('fadeout', 'Fade out', `${num('fadeout', sc.fadeOut ?? 0, 'min="0" step="50" aria-label="Fade out (ms)"')}<span class="suffix">ms</span>`);
    case 'lasts': return cell('lasts', 'Lasts', select('persist', Object.entries(PERSIST_WORDS), sc.persist ?? 'none', 'Lasts'));
    case 'hold': {
      // Hold next: the next scene waits for this one to finish, plus or minus the offset
      const why = i < s.scenes.length - 1 ? '' : 'nothing follows this scene';
      const held = !!scene.wait;
      const offset = typeof scene.wait === 'number' ? scene.wait : 0;
      return cell('hold', 'Hold next', `${seg('hold', held, 'Off', 'On', !!why)}${num('holdms', offset, 'step="50" aria-label="Hold next (ms)"', !!why || !held)}<span class="suffix">ms</span>`, why);
    }

    // ---- Sound ----
    case 'sfx': {
      const asset = isSound ? scene.asset : scene.sound?.asset;
      const clear = !locked && !isSound && scene.sound ? `<button type="button" class="quiet" data-act="cw-sound-off" data-i="${i}" aria-label="No SFX">✕</button>` : '';
      return cell('sfx', 'SFX', `${named2('sound', asset, 'No SFX')}${clear}`);
    }
    case 'volume': return cell('volume', 'Volume', `${num('volume', Math.round((snd?.volume ?? 0.75) * 100), 'min="0" max="100" step="5" aria-label="Volume (%)"', !!soundWhy)}<span class="suffix">%</span>`, soundWhy);
    case 'start': return cell('start', 'Start at', `${num('start', snd?.start ?? 0, 'min="0" step="50" aria-label="Start at (ms)"', !!soundWhy)}<span class="suffix">ms</span>`, soundWhy);
    case 'sdelay': return cell('sdelay', 'SFX wait', `${num('sdelay', scene.sound?.delay ?? 0, 'min="0" step="50" aria-label="SFX wait before (ms)"', !!soundWhy)}<span class="suffix">ms</span>`, soundWhy);
    case 'stimes': return cell('stimes', 'SFX times', num('stimes', scene.sound?.repeat ?? 1, 'min="1" step="1" aria-label="SFX times"', !!soundWhy), soundWhy);
    case 'severy': {
      const why = soundWhy || ((scene.sound?.repeat ?? 1) > 1 ? '' : 'means nothing while SFX times is 1');
      return cell('severy', 'SFX every', `${num('severy', scene.sound?.every ?? 250, 'min="0" step="50" aria-label="SFX every (ms)"', !!why)}<span class="suffix">ms</span>`, why);
    }

    // ---- Placement ----
    case 'rotate': {
      const byPos = scene.rotate === 'by-position';
      // "by position" (turned to where the template sits against the caster) is a fill's alone
      const pos = scene.shape === 'fill' ? seg('rotpos', byPos, 'Fixed', 'By position') : '';
      return cell('rotate', 'Rotate', `${num('rotate', typeof scene.rotate === 'number' ? scene.rotate : 0, 'step="15" aria-label="Rotate (degrees)"', byPos)}<span class="suffix">°</span>${pos}`);
    }
    case 'anchor': {
      const anc = sc.anchor ?? { x: 0.5, y: 0.5 };
      return cell('anchor', 'Anchor', `${num('anchor', anc.x, 'data-k="x" min="0" max="1" step="0.05" aria-label="Anchor across"')}${num('anchor', anc.y, 'data-k="y" min="0" max="1" step="0.05" aria-label="Anchor down"')}`);
    }
    case 'elevation': {
      const el = scene.elevation ?? null;
      return cell('elevation', 'Elevation', `${num('elev', el?.level ?? 0, 'step="1" aria-label="Elevation"')}${seg('elev-abs', el?.absolute, 'Relative', 'Absolute', !el)}`);
    }
    case 'zindex': return cell('zindex', 'Draw order', num('zindex', sc.zIndex ?? 0, 'step="1" aria-label="Draw order"'));
    case 'mask': return cell('mask', 'Mask', seg('mask', scene.mask, 'Off', scene.shape === 'fill' ? 'To template' : 'To token'));
    case 'attach': {
      const at = scene.attach ?? null;
      return cell('attach', 'Attach', `<label class="chip"><input type="checkbox" class="cw-attach-alpha" data-field="attach-alpha" data-i="${i}" ${at?.alpha ? 'checked' : ''} ${dis()}>Alpha</label><label class="chip"><input type="checkbox" class="cw-attach-vis" data-field="attach-vis" data-i="${i}" ${at?.visibility ? 'checked' : ''} ${dis()}>Visible</label>`);
    }
    default: return null;
  }
}

const PARTS = { head: headHtml, notes: notesHtml, sentence: sentencePart, key: renderKey, seqhead: seqHead, rail: railHtml, inspector, landing: landingHtml };

// -----------------------------------------------------------------------------------------------
// events (the window routes every act and every field inside the Editor pane here)
// -----------------------------------------------------------------------------------------------
/**
 * Play an FX once on the selected token through the API, saving nothing. Says what happened: a move
 * with no destination arms the canvas click and plays from there (render.js).
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

const DRAWER_ACTS = new Set(['dr-close', 'dr-sel', 'dr-prev', 'dr-next', 'dr-play', 'dr-use']);

export async function onSheetClick(app, b, act) {
  // the window has asked before dropping unsaved changes (sh-new replaces the sheet)
  if (act === 'sh-new') { openSheet(app, {}); return paintSheet(app); }
  const s = app.sheet;
  if (!s) return undefined;
  const i = Number(b.dataset.i);
  const x = s.scenes[i];
  if (DRAWER_ACTS.has(act)) {
    const r = await onDrawerClick(app, b, act);
    if (r) paintSheet(app, r === 'scene' ? SEQ : ['inspector']);
    return undefined;
  }
  switch (act) {
    case 'sh-back': if (!(await leaveSheet(app))) return undefined; app.view.tab = s.cameFrom ?? 'fx'; return app.paint();
    case 'sh-cancel': {
      if (s.id) { openSheet(app, { id: s.id, source: s.source, subject: s.subject }); Object.assign(app.sheet, { cameFrom: s.cameFrom, pick: s.pick, open: s.open }); } else { app.sheet = null; app.view.tab = s.cameFrom ?? 'fx'; }
      app.paint();
      return app.toast('Changes dropped.');
    }
    case 'sh-save': return saveSheet(app);
    // a copy answers NO key until one is chosen: one FX answers one key, so a copy under the same key would only be its override or its replacement
    case 'sh-dup': { openSheet(app, { from: s.id }); app.sheet.cameFrom = s.cameFrom; app.paint(); return app.toast(`Copy of ${idWords(s.id)}. Choose the ability it answers, then Save.`); }
    case 'sh-export': return app.exportFx(s.id, s.source);
    case 'sh-record': return openRecord(b.dataset.uuid, b.dataset.name);
    // the sentence opens to its whole length when two lines did not hold it, and closes again
    case 'sh-sentence': if (!s.sentenceOpen && b.dataset.clamped !== 'true') return undefined; s.sentenceOpen = !s.sentenceOpen; return paintSheet(app, ['sentence']);
    // deleteFx asks, then reopens the sheet on what shows through or closes it when nothing does
    case 'sh-delete': return app.deleteFx(s.id, s.source);
    // the key is REPLACED, never added to: one FX, one key
    case 'sh-key-hit': { const e = entryAt(app, b); if (e) takeEntry(app, e); return paintSheet(app, KEYED); }
    case 'sh-key-rec': takeKey(app, b.dataset.key); return paintSheet(app, KEYED);
    case 'sh-pick-item': s.itemQuery = s.itemQuery === null || s.itemQuery === undefined ? '' : null; s.suggest = s.itemQuery === null ? null : 'item'; return paintSheet(app, ['key']);
    case 'sh-item-hit': { const item = fromUuidSync(b.dataset.uuid); if (item) takeItem(app, item); else s.itemQuery = null; return paintSheet(app, KEYED); }
    case 'sh-own-key': return ownKey(app);
    // --- the rail and the inspector ---
    case 'sh-pick': s.pick = i; if (s.drawer && s.drawer.i !== i) s.drawer = null; return paintSheet(app, ['sentence', 'rail', 'inspector']);
    case 'sh-group': {
      const scene = s.scenes[pickOf(app)]?.scene;
      const first = scene ? groupsOf(scene)[0]?.id : null;
      const g = b.dataset.group;
      s.open[g] = !(s.open[g] ?? g === first);
      return paintSheet(app, ['inspector']);
    }
    case 'sh-play-scene': return x ? previewFx(app, { id: 'preview', on: s.on, scenes: [clone(x.scene)] }, `scene ${i + 1}`) : undefined;
    case 'sh-play-all': {
      if (s.off || !s.scenes.length) return undefined;
      const fx = draftFx(app);
      return previewFx(app, { id: 'preview', for: fx.for, on: fx.on, scenes: fx.scenes }, 'the whole FX');
    }
    // locked, the Moment and State pills are read, pressed for nothing
    case 'sh-off': if (!s.edit) return undefined; s.off = b.dataset.v === 'true'; return paintSheet(app);
    case 'sh-on': {
      if (!s.edit) return undefined;
      const w = b.dataset.on;
      s.on = w;
      // on an event key the word IS the event
      if (kindOf(s.keys[0]) === 'event' && HEARD_EVENTS.includes(w)) { s.keys = [`event:${w}`]; s.subject = app.subjectForKey(s.keys[0]); }
      return paintSheet(app, KEYED);
    }
    // --- the landing's doors ---
    case 'sh-door': s.door = s.door === b.dataset.door ? null : b.dataset.door; if (s.door === 'copy') s.suggest = 'like'; return paintSheet(app, ['landing']);
    case 'sh-blank': s.landing = false; s.adding = true; return paintSheet(app);
    case 'sh-use-starter': {
      // a starter from here is used WHOLE: every scene of it, copied (the rail's Add stamps one scene of a shape)
      const id = b.dataset.id;
      s.scenes = seedFrom(id); s.from = id; s.pick = 0; s.landing = false; s.door = null;
      paintSheet(app);
      return app.toast(`${idWords(id)}: ${s.scenes.length} scene${s.scenes.length === 1 ? '' : 's'} copied in. The copy is this FX's own.`);
    }
    case 'sh-like-hit': s.from = b.dataset.id; s.scenes = seedFrom(b.dataset.id); s.pick = 0; s.landing = false; s.door = null; s.likeQuery = ''; s.suggest = null; return paintSheet(app);
    // --- the sequence ---
    case 'cw-add-ask': if (!s.edit) return undefined; s.adding = !s.adding; return paintSheet(app, ['rail']);
    case 'cw-add': if (!s.edit) return undefined; addScene(app, b.dataset.shape); s.adding = false; s.drawer = null; return paintSheet(app, SEQ);
    case 'cw-drop': s.scenes.splice(i, 1); s.pick = Math.max(0, Math.min(s.pick, s.scenes.length - 1)); s.drawer = null; return paintSheet(app, SEQ);
    case 'cw-up': if (i > 0) { [s.scenes[i - 1], s.scenes[i]] = [s.scenes[i], s.scenes[i - 1]]; s.pick = i - 1; s.drawer = null; } return paintSheet(app, SEQ);
    case 'cw-down': if (i < s.scenes.length - 1) { [s.scenes[i + 1], s.scenes[i]] = [s.scenes[i], s.scenes[i + 1]]; s.pick = i + 1; s.drawer = null; } return paintSheet(app, SEQ);
    case 'cw-browse': if (!s.edit || !x) return undefined; openDrawer(app, i, b.dataset.slot); return paintSheet(app, ['inspector']);
    case 'cw-show': { if (!x) return undefined; showAsset(app, slotPath(x.scene, b.dataset.slot), b.dataset.slot); return app.paint(); }
    case 'cw-tint-off': if (x) delete x.scene.tint; return paintSheet(app, SEQ);
    case 'cw-sound-off': if (x) delete x.scene.sound; if (s.drawer?.slot === 'sound') s.drawer = null; return paintSheet(app, SEQ);
    case 'cw-thrown-off': if (x) delete x.scene.thrown; return paintSheet(app, SEQ);
    case 'cw-return-off': if (x) delete x.scene.return; return paintSheet(app, SEQ);
    case 'cw-breathe-off': if (x) delete x.scene.breathe; return paintSheet(app, SEQ);
    case 'cw-pulse-off': if (x) delete x.scene.pulse; return paintSheet(app, SEQ);
    default: return undefined;
  }
}

/** typing in one of the sheet's boxes: the suggestions are painted under it, the caret stays */
export function onSheetInput(app, el, field) {
  const s = app.sheet;
  if (!s) return undefined;
  switch (field) {
    case 'key-q': s.keyQuery = el.value; s.suggest = 'key'; return paintSheet(app, ['key']);
    case 'item-q': s.itemQuery = el.value; s.suggest = 'item'; return paintSheet(app, ['key']);
    case 'like': s.likeQuery = el.value; s.suggest = 'like'; return paintSheet(app, [s.landing ? 'landing' : 'inspector']);
    case 'dr-q': {
      if (!onDrawerInput(app, el)) return undefined;
      clearTimeout(app._drawerTimer);
      app._drawerTimer = setTimeout(() => paintSheet(app, ['inspector']), 150);
      return undefined;
    }
    default: return undefined;
  }
}

/** the suggestions under the sheet's boxes close (Escape, or a click elsewhere) */
export function closeSuggest(app) {
  if (!app.sheet?.suggest) return;
  app.sheet.suggest = null;
  paintSheet(app, [app.sheet.landing ? 'landing' : 'key', ...(app.sheet.landing ? [] : ['inspector'])]);
}

/** a number knob: written when it says something, dropped when it says what the shape already says */
function setNum(scene, key, value, fallback) {
  if (!Number.isFinite(value) || value === fallback) delete scene[key];
  else scene[key] = value;
}

export function onSheetChange(app, el, field) {
  const a = api();
  const s = app.sheet;
  if (!s) return undefined;
  if (field === 'edit') {
    if (!el.checked) return leaveSheet(app).then((ok) => { if (ok && app.sheet) app.sheet.edit = false; return paintSheet(app); });
    s.edit = true; s.snapshot = JSON.stringify(safeDraft(app)); return paintSheet(app);
  }
  if (field === 'dr-step') { if (onDrawerChange(app, el)) paintSheet(app, ['inspector']); return undefined; }
  const x = s.scenes[Number(el.dataset.i)];
  if (!x || !s.edit) return undefined;
  const scene = x.scene;
  const def = withDefaults({ shape: scene.shape });
  const n = Number(el.value);
  const sound = (k, v) => { scene.sound = { ...(scene.sound ?? {}), [k]: v }; };
  const ms = () => Math.max(0, Math.round(n || 0));
  switch (field) {
    // ---- Picture ----
    case 'place': scene[el.dataset.k] = el.value; break;
    case 'size': {
      if (!(n > 0)) break;
      const size = { ...(withDefaults(scene).size ?? {}) };
      const k = el.dataset.k;
      if (k === 'scale.x' || k === 'scale.y') { const sc = typeof size.scale === 'object' ? { ...size.scale } : { x: size.scale ?? 1, y: size.scale ?? 1 }; sc[k.slice(-1)] = n; size.scale = sc; }
      else size[k] = n;
      scene.size = size;
      break;
    }
    case 'size-kind': {
      // the kind switch writes the size object of that kind, carrying the number where it means the same sort of thing
      const cur = withDefaults(scene).size ?? {};
      const carried = cur.tokenWidths ?? cur.radius ?? cur.squares ?? 1;
      if (el.value === 'tokenWidths') scene.size = { tokenWidths: carried };
      else if (el.value === 'radius') scene.size = { radius: carried };
      else if (el.value === 'squares') scene.size = { squares: carried };
      else if (el.value === 'fit') scene.size = { fit: 'shape', scale: 1 };
      else if (el.value === 'fit-object') scene.size = { fit: 'object', scale: 1 };
      break;
    }
    case 'opacity': setNum(scene, 'opacity', Math.min(100, Math.max(0, Math.round(n || 0))) / 100, 1); break;
    case 'tint': scene.tint = { ...(scene.tint ?? {}), colour: el.value }; break;
    case 'colour': { const r = a.assets.recoloured(scene.asset, el.value); if (!r.problem) scene.asset = typeof scene.asset === 'string' ? r.path : { ...scene.asset, path: r.path, family: undefined, variant: undefined, colour: undefined }; break; }
    case 'below': if (el.checked) scene.below = true; else delete scene.below; break;
    case 'mirror': { const v = el.checked ? 'random' : 'none'; if (v === (def.mirror ?? 'random')) delete scene.mirror; else scene.mirror = v; break; }
    case 'scatter': if (el.checked) scene.scatter = true; else delete scene.scatter; break;
    // ---- Timing ----
    case 'delay': setNum(scene, 'delay', ms(), 0); break;
    case 'times': { const v = Math.max(1, Math.round(n || 1)); if (v > 1) scene.repeat = v; else { delete scene.repeat; delete scene.every; } break; }
    case 'every': setNum(scene, 'every', ms(), def.every ?? 250); break;
    case 'rate': setNum(scene, 'rate', n, 1); break;
    case 'fadein': setNum(scene, 'fadeIn', ms(), def.fadeIn ?? 0); break;
    case 'fadeout': setNum(scene, 'fadeOut', ms(), def.fadeOut ?? 0); break;
    case 'persist': if (el.value === 'none') delete scene.persist; else scene.persist = el.value; break;
    case 'hold': if (el.checked) scene.wait = true; else delete scene.wait; break;
    case 'holdms': { const v = Math.round(n || 0); scene.wait = v === 0 ? true : v; break; }
    // ---- Sound ----
    case 'volume': { const v = Math.min(100, Math.max(0, Math.round(n || 0))) / 100; if (scene.shape === 'sound') setNum(scene, 'volume', v, 0.75); else sound('volume', v); break; }
    case 'start': if (scene.shape === 'sound') setNum(scene, 'start', ms(), 0); else sound('start', ms()); break;
    case 'sdelay': sound('delay', ms()); break;
    case 'stimes': sound('repeat', Math.max(1, Math.round(n || 1))); break;
    case 'severy': sound('every', ms()); break;
    // ---- Placement ----
    case 'rotate': if (scene.rotate !== 'by-position') setNum(scene, 'rotate', Math.round(n || 0), 0); break;
    case 'rotpos': if (el.checked) scene.rotate = 'by-position'; else delete scene.rotate; break;
    case 'anchor': { const anc = { ...(withDefaults(scene).anchor ?? { x: 0.5, y: 0.5 }) }; anc[el.dataset.k] = Math.min(1, Math.max(0, n || 0)); scene.anchor = anc; break; }
    case 'elev': { const v = Math.round(n || 0); if (v === 0 && !scene.elevation?.absolute) delete scene.elevation; else scene.elevation = { ...(scene.elevation ?? {}), level: v }; break; }
    case 'elev-abs': if (scene.elevation) { if (el.checked) scene.elevation = { ...scene.elevation, absolute: true }; else delete scene.elevation.absolute; } break;
    case 'zindex': setNum(scene, 'zIndex', Math.round(n || 0), def.zIndex ?? 0); break;
    case 'mask': if (el.checked) scene.mask = true; else delete scene.mask; break;
    case 'attach-alpha': case 'attach-vis': {
      const at = { alpha: !!scene.attach?.alpha, visibility: !!scene.attach?.visibility };
      at[field === 'attach-alpha' ? 'alpha' : 'visibility'] = el.checked;
      if (!at.alpha && !at.visibility) delete scene.attach; else scene.attach = at;
      break;
    }
    // ---- the shape's own ----
    case 'onmiss': if (el.value === (def.onMiss ?? 'play')) delete scene.onMiss; else scene.onMiss = el.value; break;
    case 'reach': if (scene.thrown) { const v = Math.max(1, Math.round(n || 1)); scene.thrown = { ...scene.thrown, reach: v }; if (v === 1) delete scene.thrown.reach; } break;
    case 'cleartemplate': if (el.checked) scene.clearTemplate = true; else delete scene.clearTemplate; break;
    case 'follow': if (el.checked) scene.follow = true; else delete scene.follow; break;
    case 'face': if (el.checked) scene.face = 'away-from-source'; else delete scene.face; break;
    case 'range': setNum(scene, 'range', n, def.range ?? 30); break;
    case 'spot': {
      const seen = el.value === 'seen-unoccupied' || el.value === 'seen';
      const unoccupied = el.value === 'seen-unoccupied' || el.value === 'unoccupied';
      if (seen) delete scene.seen; else scene.seen = false;
      if (unoccupied) delete scene.unoccupied; else scene.unoccupied = false;
      break;
    }
    case 'jump': { const v = el.checked; if (v === (def.jump ?? true)) delete scene.jump; else scene.jump = v; break; }
    // the switch writes the fade the stock moves use (dim to nothing after the sound starts, back once the token lands); one written in full is kept as it is
    case 'fade': if (el.checked) { if (!scene.fade || typeof scene.fade !== 'object') scene.fade = { to: 0.01, after: 750, back: 250 }; } else delete scene.fade; break;
    case 'speed': setNum(scene, 'speed', n, def.speed ?? 120); break;
    case 'after': setNum(scene, 'after', ms(), def.after ?? 0); break;
    default: return undefined;
  }
  return paintSheet(app, SEQ);
}

/** Enter in a search box takes the first hit */
export function onSheetKey(app, ev, field) {
  const el = ev.target;
  const s = app.sheet;
  if (!s || ev.key !== 'Enter') return false;
  if (field === 'key-q') {
    ev.preventDefault();
    const q = el.value.trim();
    if (!q) return true;
    const { hits, recs, events } = keyHits(app, q);
    const exact = hits.find((h) => h.e.name.toLowerCase() === q.toLowerCase()) ?? hits[0];
    const rec = exact ? null : recs[0] ?? events[0];
    if (exact) takeEntry(app, exact.e); else if (rec) takeKey(app, rec.key); else { app.toast('No ability of that name in the books or on an actor.'); return true; }
    paintSheet(app, KEYED);
    return true;
  }
  if (field === 'item-q') {
    ev.preventDefault();
    const first = itemHits(app, el.value)[0];
    if (first) { const item = fromUuidSync(first.uuid); if (item) takeItem(app, item); else s.itemQuery = null; paintSheet(app, KEYED); }
    return true;
  }
  if (field === 'like') {
    ev.preventDefault();
    const hit = app.likeHits(el.value).filter((h) => h.tag !== 'starter')[0];
    if (hit) { s.from = hit.id; s.scenes = seedFrom(hit.id); s.pick = 0; s.landing = false; s.likeQuery = ''; s.suggest = null; paintSheet(app); }
    return true;
  }
  return false;
}

/**
 * Where a Save goes: House for a new FX, a House FX or an FX with no key; a Stock FX asks — the House
 * override (the same id in House, which wins; Stock untouched) or Stock itself. Null: not saved.
 */
async function whereToSave(app, fx) {
  const s = app.sheet;
  const holder = holderOf(app);
  if (!fx.for?.length || (s.source !== 'stock' && holder?.source !== 'stock')) return 'house';
  const choice = await asked('wait', {
    window: { title: `Save ${esc(sheetName(app))}` },
    content: `<p>This FX is ${SOURCE_TAG.stock}. Where does the change go?</p>`,
    buttons: [
      { action: 'house', label: `${SOURCE_TAG.house} override`, icon: 'fa-solid fa-house', default: true },
      { action: 'stock', label: `Edit ${SOURCE_TAG.stock}`, icon: 'fa-solid fa-book' },
      { action: 'cancel', label: 'Cancel', icon: 'fa-solid fa-xmark' },
    ],
    rejectClose: false, modal: true,
  });
  return choice === 'house' || choice === 'stock' ? choice : null;
}

async function saveSheet(app) {
  const a = api();
  const s = app.sheet;
  const problems = problemsOf(app);
  if (problems.length) return app.toast(problems[0]);
  const fx = draftFx(app);
  const to = await whereToSave(app, fx);
  if (!to) return undefined;
  let r;
  // the window's own write: the corpus hook that follows it is not news from elsewhere
  app._writing = true;
  try { r = await a.fx.save(fx, { by: game.user.name, to }); } catch (err) { return app.toast(`Could not save it: ${err.message}`); } finally { app._writing = false; }
  if (!r.ok) return app.toast(r.problems.join(' '));
  const sub = s.subject;
  const item = sub?.uuid ? fromUuidSync(sub.uuid) : null;
  app.refresh();
  // what was saved is what the Library marks, so Back lands on it
  app.view.fxSel = fx.id;
  const name = sheetName(app);
  // a Save to Stock reopens on the Stock layer it wrote, even under a House override
  openSheet(app, { id: fx.id, source: to, subject: item ? app.subjectFromItem(item) : sub });
  Object.assign(app.sheet, { cameFrom: s.cameFrom, pick: s.pick, open: s.open });
  app.paint();
  return app.toast(`Saved: ${name} (${SOURCE_TAG[to]}).`);
}
