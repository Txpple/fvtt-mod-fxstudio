// The dispatcher: a moment (scripts/reader.js) meets the corpus (scripts/corpus.js) and one preset
// plays the row that answered. Keeps a ledger of the last moments so the suites and the Check
// screen can read what played, what resolved to nothing, and which files were named.
import { lookup } from './corpus.js';
import { logging, playing } from './settings.js';
import { rinse, wait } from './presets/common.js';
import * as swing from './presets/swing.js';
import * as projectile from './presets/projectile.js';
import * as ontoken from './presets/ontoken.js';
import * as template from './presets/template.js';
import * as aura from './presets/aura.js';
import * as teleport from './presets/teleport.js';
import * as protemplate from './presets/protemplate.js';
import * as dualattach from './presets/dualattach.js';
import * as thunderwave from './presets/thunderwave.js';

/** the preset that plays a row, by the name its first layer carries */
export const PRESETS = {
  'melee-swing': swing,
  projectile,
  'on-token': ontoken,
  template,
  aura,
  teleport,
  'projectile-to-template': protemplate,
  'dual-attach': dualattach,
  thunderwave,
};

// AA waited its "global delay" world setting before every animation; this world had it at 100 ms
export const PLAY_DELAY = 100;
const LEDGER_MAX = 100;

export const ledger = [];
const log = (...a) => console.log('FX Studio |', ...a);

function record(entry) {
  ledger.unshift({ at: Date.now(), ...entry });
  if (ledger.length > LEDGER_MAX) ledger.length = LEDGER_MAX;
  if (logging()) log(entry.matched ? `${entry.kind} "${entry.names.join('" / "')}" → "${entry.matched}" [${entry.menu}] ${entry.preset}${entry.played ? '' : ' (built, not played)'}: ${entry.files.join(', ')}${entry.sounds.length ? ' + ' + entry.sounds.join(', ') : ''}` : `${entry.kind} "${entry.names.join('" / "')}" → nothing (${entry.note})`);
  return entry;
}

/**
 * The row that answers a moment: the first of its names (the ammunition's, then the item's)
 * with a row in the corpus for this kind of moment.
 * @returns {{row, how, source, name}|null}
 */
export function resolve(index, moment) {
  for (const name of moment.names) {
    const hit = lookup(index, name, { on: moment.on });
    if (hit) return { ...hit, name: hit.matchedAs ?? name };
  }
  return null;
}

/** the build context a preset works from */
export function contextFor(row, moment, name) {
  const fx = row.fx ?? [];
  return {
    moment,
    row,
    primary: fx[0],
    secondary: fx.find((l) => l.preset === 'secondary'),
    source: fx.find((l) => l.preset === 'source'),
    target: fx.find((l) => l.preset === 'target'),
    name: rinse(name ?? row.name),
    files: [],
    sounds: [],
    after: null,
  };
}

/**
 * Build the Sequence for a row against a moment without playing it (the suites read ctx.files).
 * @returns {{seq, ctx}}  seq is null when the preset has nothing to play (no targets, an effect already standing)
 */
export function build(row, moment, name) {
  const ctx = contextFor(row, moment, name);
  const preset = PRESETS[ctx.primary?.preset];
  if (!preset) throw new Error(`FX Studio: no preset "${ctx.primary?.preset}" for "${row.name}"`);
  const seq = preset.build(ctx);
  return { seq, ctx };
}

/** a sound-only row (AA played the sound and nothing else) */
function soundOnly(row, ctx) {
  const s = row.soundOnly;
  const seq = new Sequence({ moduleName: 'FX Studio', softFail: true });
  ctx.sounds.push(s.file);
  seq.sound().file(s.file).volume(s.volume ?? 0.75).delay(s.delay ?? 0).startTime(s.startTime ?? 0).repeats(s.repeat ?? 1, s.repeatDelay ?? 250);
  return seq;
}

/**
 * Resolve and play a moment on this client. Returns the ledger entry.
 * @param index   the corpus index
 * @param moment  see scripts/reader.js
 * @param opts    {dryRun: build only, never play}
 */
export async function play(index, moment, { dryRun = false } = {}) {
  const base = { kind: moment.kind, names: moment.names, id: moment.id ?? null, targets: moment.targets.map((t) => t.name), hits: moment.hits ? [...moment.hits] : null };
  if (!dryRun && !playing()) return record({ ...base, matched: null, files: [], sounds: [], note: 'playing is switched off' });
  const found = resolve(index, moment);
  if (!found) return record({ ...base, matched: null, files: [], sounds: [], note: 'no row in any corpus' });
  const { row, source, name } = found;
  let ctx;
  let seq;
  try {
    if (row.soundOnly) { ctx = contextFor(row, moment, name); seq = soundOnly(row, ctx); }
    else ({ seq, ctx } = build(row, moment, name));
  } catch (e) {
    console.error('FX Studio | building the look failed', e);
    return record({ ...base, matched: row.name, menu: row.menu, source, preset: row.fx?.[0]?.preset, files: [], sounds: [], note: `build failed: ${e.message}` });
  }
  const entry = { ...base, matched: row.name, menu: row.menu, source, how: found.how, preset: row.fx?.[0]?.preset, files: ctx.files, sounds: ctx.sounds, played: false, note: seq ? '' : (row.fx?.[0]?.preset === 'teleport' ? 'waiting for the destination click' : 'nothing to play (no targets, or the effect already stands)') };
  if (!seq || dryRun) return record(entry);
  entry.played = true;
  record(entry);
  await wait(PLAY_DELAY);
  try {
    await seq.play();
    ctx.after?.();
  } catch (e) {
    console.error('FX Studio | playing the look failed', e);
    entry.note = `play failed: ${e.message}`;
  }
  return entry;
}
