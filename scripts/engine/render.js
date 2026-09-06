// The renderer: one look against one moment → one Sequence, scene by scene, through the nine
// shapes; plays it on the client that owns the moment; keeps the ledger the suites and the Check
// screen read. Nothing here knows what a menu, a preset or an option blob was.
import { describe } from '../core/moments.js';
import { resolve } from '../core/corpus.js';
import { SEQUENCE_OPTIONS, contextFor } from './common.js';
import * as strike from './shapes/strike.js';
import * as shoot from './shapes/shoot.js';
import * as mark from './shapes/mark.js';
import * as fill from './shapes/fill.js';
import * as aura from './shapes/aura.js';
import * as beam from './shapes/beam.js';
import * as move from './shapes/move.js';
import * as sound from './shapes/sound.js';
import * as custom from './shapes/custom.js';

export const SHAPES = { strike, shoot, mark, fill, aura, beam, move, sound, custom };

const LEDGER_MAX = 100;
export const ledger = [];
const log = (...a) => console.log('FX Studio |', ...a);
let settings = { playing: () => true, logging: () => false };
export function useSettings(s) { settings = { ...settings, ...s }; }

function record(entry) {
  ledger.unshift({ at: Date.now(), ...entry });
  if (ledger.length > LEDGER_MAX) ledger.length = LEDGER_MAX;
  if (settings.logging()) log(entry.look ? `${entry.when} "${entry.subject}" → "${entry.look}" (${entry.source}, ${entry.key})${entry.played ? '' : ' (built, not played)'}: ${entry.files.join(', ')}${entry.sounds.length ? ' + ' + entry.sounds.join(', ') : ''}` : `${entry.when} "${entry.subject}" → nothing (${entry.why})`);
  return entry;
}

/**
 * Build the Sequence for a look against a moment without playing it.
 * @returns {{seq, ctx}}  seq is null when nothing would play (no targets, every token already carries it, a move waiting for its click)
 */
export function build(look, moment) {
  const ctx = contextFor(look, moment);
  const seq = new Sequence(SEQUENCE_OPTIONS);
  const scenes = look.scenes ?? [];
  for (const scene of scenes) {
    const shape = SHAPES[scene.shape];
    if (!shape) throw new Error(`FX Studio: no shape "${scene.shape}" in look "${look.id}"`);
    shape.build(seq, scene, ctx);
  }
  if (ctx.clearTemplate) { const region = ctx.clearTemplate; seq.thenDo(() => { canvas.scene.deleteEmbeddedDocuments(region.documentName ?? 'Region', [region.id]); }); }
  const hasPictureScenes = scenes.some((s) => s.shape !== 'sound');
  const empty = ctx.waiting || (hasPictureScenes && ctx.pictures === 0) || (!hasPictureScenes && ctx.sounds.length === 0);
  return { seq: empty ? null : seq, ctx };
}

/** the look that answers a moment, through the corpus index */
export function resolveMoment(index, moment) {
  return resolve(index, moment.subject?.keys ?? [], moment.when, { hasPlace: !!moment.place, pointer: moment.subject?.pointer ?? null });
}

/**
 * Resolve and play a moment on this client. Returns the ledger entry.
 * @param index   the corpus index (core/corpus.js)
 * @param moment  core/moments.js
 * @param opts    {dryRun: build only, never play; look: play this look instead of resolving}
 */
export async function play(index, moment, { dryRun = false, look: given = null } = {}) {
  const d = describe(moment);
  const base = { when: d.when, subject: d.subject, keys: d.keys, id: d.id, targets: d.targets, place: d.place, files: [], sounds: [] };
  if (!dryRun && !settings.playing()) return record({ ...base, look: null, why: 'playing is switched off' });
  const found = given ? { look: given, key: given.for?.[0] ?? null, source: 'given' } : resolveMoment(index, moment);
  if (!found.look) return record({ ...base, look: null, why: found.why ?? 'no look in any corpus', key: found.key ?? null });
  const { look, key, source } = found;
  let seq;
  let ctx;
  try { ({ seq, ctx } = build(look, moment)); } catch (e) {
    console.error('FX Studio | building the look failed', e);
    return record({ ...base, look: look.id, key, source, why: `build failed: ${e.message}` });
  }
  const entry = { ...base, look: look.id, key, source, files: ctx.files, sounds: ctx.sounds, missing: ctx.missing, notes: ctx.notes, played: false, why: seq ? '' : ctx.waiting?.why ?? 'nothing to play (no targets, or the token already carries it)' };
  if (ctx.waiting && !dryRun) {
    // a move with no destination yet: arm the click, then play the whole look from there
    move.armPicker(ctx.waiting.scene, moment, (pos) => { play(index, { ...moment, destination: pos }, { look }).catch((e) => console.error('FX Studio |', e)); });
    return record(entry);
  }
  if (!seq || dryRun) return record(entry);
  entry.played = true;
  record(entry);
  try {
    await seq.play();
    ctx.after?.();
  } catch (e) {
    console.error('FX Studio | playing the look failed', e);
    entry.why = `play failed: ${e.message}`;
  }
  return entry;
}

/** end every standing picture of an origin on a token (an effect switched off) */
export function endPicturesOf(origin, token) {
  Sequencer.EffectManager.endEffects({ origin, ...(token ? { object: token } : {}) });
}
