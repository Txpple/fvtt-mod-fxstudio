// The renderer: one FX against one moment → one Sequence, scene by scene, through the nine
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
  if (settings.logging()) log(entry.fx ? `${entry.when} "${entry.subject}" → "${entry.fx}" (${entry.source}, ${entry.key})${entry.played ? '' : ' (built, not played)'}: ${entry.files.join(', ')}${entry.sounds.length ? ' + ' + entry.sounds.join(', ') : ''}` : `${entry.when} "${entry.subject}" → nothing (${entry.why})`);
  return entry;
}

/**
 * Build the Sequence for an FX against a moment without playing it.
 * @returns {{seq, ctx}}  seq is null when nothing would play (no targets, every token already carries it, a move waiting for its click)
 */
export function build(fx, moment) {
  const ctx = contextFor(fx, moment);
  const seq = new Sequence(SEQUENCE_OPTIONS);
  const scenes = fx.scenes ?? [];
  for (const scene of scenes) {
    const shape = SHAPES[scene.shape];
    if (!shape) throw new Error(`FX Studio: no shape "${scene.shape}" in fx "${fx.id}"`);
    shape.build(seq, scene, ctx);
  }
  if (ctx.clearTemplate) { const region = ctx.clearTemplate; seq.thenDo(() => { canvas.scene.deleteEmbeddedDocuments(region.documentName ?? 'Region', [region.id]); }); }
  const hasPictureScenes = scenes.some((s) => s.shape !== 'sound');
  // a refused move (the spot is not what the words demand) stops the whole fx: no mark plays where the token will not go
  const empty = ctx.waiting || ctx.refused || (hasPictureScenes && ctx.pictures === 0) || (!hasPictureScenes && ctx.sounds.length === 0);
  return { seq: empty ? null : seq, ctx };
}

/** the FX that answers a moment, through the corpus index */
export function resolveMoment(index, moment) {
  return resolve(index, moment.subject?.keys ?? [], moment.when, { hasPlace: !!moment.place, pointer: moment.subject?.pointer ?? null });
}

/**
 * Resolve and play a moment on this client. Returns the ledger entry.
 * @param index   the corpus index (core/corpus.js)
 * @param moment  core/moments.js
 * @param opts    {dryRun: build only, never play; fx: play this FX instead of resolving}
 */
export async function play(index, moment, { dryRun = false, fx: given = null } = {}) {
  const d = describe(moment);
  const base = { when: d.when, subject: d.subject, keys: d.keys, id: d.id, targets: d.targets, place: d.place, files: [], sounds: [] };
  if (!dryRun && !settings.playing()) return record({ ...base, fx: null, why: 'playing is switched off' });
  const found = given ? { fx: given, key: given.for?.[0] ?? null, source: 'given' } : resolveMoment(index, moment);
  if (!found.fx) return record({ ...base, fx: null, why: found.why ?? 'no FX in any corpus', key: found.key ?? null });
  const { fx, key, source } = found;
  let seq;
  let ctx;
  try { ({ seq, ctx } = build(fx, moment)); } catch (e) {
    console.error('FX Studio | building the FX failed', e);
    return record({ ...base, fx: fx.id, key, source, why: `build failed: ${e.message}` });
  }
  const entry = { ...base, fx: fx.id, key, source, files: ctx.files, sounds: ctx.sounds, missing: ctx.missing, notes: ctx.notes, played: false, why: seq ? '' : ctx.waiting?.why ?? (ctx.refused ? `the move was refused: ${ctx.refused}` : 'nothing to play (no targets, or the token already carries it)') };
  if (ctx.waiting && !dryRun) {
    // a move with no destination yet: arm the click, then play the whole fx from there
    move.armPicker(ctx.waiting.scene, moment, (pos) => { play(index, { ...moment, destination: pos }, { fx }).catch((e) => console.error('FX Studio |', e)); });
    return record(entry);
  }
  if (!seq || dryRun) return record(entry);
  entry.played = true;
  record(entry);
  try {
    await seq.play();
    ctx.after?.();
  } catch (e) {
    console.error('FX Studio | playing the FX failed', e);
    entry.why = `play failed: ${e.message}`;
  }
  return entry;
}

/** end every standing picture of an origin on a token (an effect switched off) */
export function endPicturesOf(origin, token) {
  Sequencer.EffectManager.endEffects({ origin, ...(token ? { object: token } : {}) });
}
