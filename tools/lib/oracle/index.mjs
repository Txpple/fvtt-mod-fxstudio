// The ORACLE: phase 1's line-for-line port of Automated Animations' sequences, kept here so the
// migration can prove, row by row, that the new engine tells Sequencer the same things AA did
// (ARCHITECTURE §6.2). It builds AA's Sequence for a row against a phase-1 moment on the offline
// stage. Nothing in scripts/ imports this; it is the proof's independent side and then history.
//
//   rows()                    the phase-1 rows: {baseline: [row…], house: [row…]} (import-aa.mjs wrote them)
//   oracleMoment(kind, …)     a phase-1 moment from stage tokens
//   buildRow(row, moment)     {seq, ctx} — the recording Sequence AA's port makes
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './play.js';

const HERE = dirname(fileURLToPath(import.meta.url));

export function rows() {
  const read = (f) => JSON.parse(readFileSync(join(HERE, f), 'utf8'));
  return { baseline: read('baseline-rows.json').rows, house: read('house-rows.json').rows, twin: read('aa-database.json') };
}

/**
 * A phase-1 moment: {kind, on, names, item, activity, sourceToken, targets, hits, template, origin, tieTo, id, destination, noMove}
 * @param kind      attack | damage | use | template | effect
 * @param opts      {source, targets, hits: [tokens hit] | null, template, tieTo, destination, name, reach}
 */
export function oracleMoment(kind, { source, targets = [], hits = null, template = null, tieTo = null, destination = null, name = 'x', reach = false } = {}) {
  const on = kind === 'template' ? 'template' : kind === 'effect' ? 'effect' : 'use';
  const item = { name, uuid: `oracle.${name}`, system: { properties: new Set(reach ? ['rch'] : []) } };
  return { kind, on, names: [name], item, activity: null, sourceToken: source, targets, hits: hits ? new Set(hits.map((t) => t.id)) : null, template, origin: item.uuid, tieTo, id: `oracle-${kind}`, destination, noMove: true };
}

/** AA's Sequence for a row against a moment (a sound-only row is a Sequence of its sound) */
export function buildRow(row, moment) {
  if (row.soundOnly) {
    const s = row.soundOnly;
    const seq = new Sequence({ moduleName: 'FX Studio', softFail: true });
    seq.sound().file(s.file).volume(s.volume ?? 0.75).delay(s.delay ?? 0).startTime(s.startTime ?? 0).repeats(s.repeat ?? 1, s.repeatDelay ?? 250);
    return { seq, ctx: { files: [], sounds: [s.file] } };
  }
  return build(row, moment, row.name);
}
