// The render-level proof (ARCHITECTURE §6.2): for every row, against a canonical moment of its
// kind, the exact Sequencer calls the oracle makes (phase 1's port of AA) and the exact calls the
// new engine makes from the migrated fx, compared section by section. Both run on the offline
// stage (tools/lib/stage.mjs) with a recording Sequence.
//
// CANONICAL FORM — what is compared, and the named allowances (each is also in the report):
//   · a section is its kind plus the SET of its calls; the order of calls within a section does not
//     matter to Sequencer (they set properties), the order of sections does
//   · a call that states Sequencer's own default is dropped: opacity(1), delay(0), fadeIn(0),
//     fadeOut(0), rotate(0), zIndex(0), playbackRate(1), repeats(1, …), missed(false),
//     belowTokens(false), anchor(0.5, 0.5), aboveLighting(false), xray(false), startTime(0)
//   · option objects lose keys whose value is false, 0, null or undefined, and an empty trailing
//     option object is dropped: attachTo(t, {bindAlpha: false}) is attachTo(t)
//   · a token argument becomes its centre point for location calls (atLocation, stretchTo,
//     rotateTowards, moveTowards) and its id for attachment calls (attachTo, mask, on); a Region
//     its id; a named spot its name
//   · .name(), .origin() and .tieToDocuments() are dropped: names are internal handles, and the
//     engine stamps every picture with its origin and ties every picture of an effect to it, where
//     AA stamped and tied only some (a superset that changes no picture)
//   · .file(): a path is compared by what it PLAYS — the file set it resolves to, its stretch
//     template and its loop markers — not by the path's spelling, so a native JB2A path that plays
//     AA's files with AA's metadata equals the private-table path (this is §6.3's measurement)
//   · thenDo sections are compared by count, not position (they run when the sequence starts)
import { metadataAt, resolvePath } from '../libraries.mjs';
import { ROOTS } from '../env.mjs';
import { token, region, standing } from '../stage.mjs';
import { oracleMoment, buildRow } from '../oracle/index.mjs';
import { build as engineBuild } from '../../../scripts/engine/render.js';

const DEFAULT_CALLS = {
  opacity: [1], delay: [0], fadeIn: [0], fadeOut: [0], rotate: [0], zIndex: [0], playbackRate: [1], missed: [false], belowTokens: [false], aboveLighting: [false], xray: [false], startTime: [0], anchor: [{ x: 0.5, y: 0.5 }],
};
/** the stage tokens by id, so a named spot ("spot near") compares as its token's centre: a picture that did not miss landed on the token */
const spotCentres = new Map();
const DROP = new Set(['name', 'origin', 'tieToDocuments']);
const LOCATION = new Set(['atLocation', 'stretchTo', 'rotateTowards', 'moveTowards']);
const ATTACH = new Set(['attachTo', 'mask', 'on']);

function cleanOptions(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v !== false && v !== 0 && v !== null && v !== undefined) out[k] = typeof v === 'object' ? cleanOptions(v) : v;
  return out;
}
const round = (n) => Math.round(n * 1000) / 1000;

function arg(a, method) {
  if (a === undefined || a === null) return a;
  if (a._isToken) return LOCATION.has(method) ? { x: round(a.center.x), y: round(a.center.y) } : { token: a.id };
  if (a._isRegion) return { region: a.id };
  if (typeof a === 'number') return round(a);
  if (typeof a === 'string') { const spot = /^spot (\S+)$/.exec(a); if (spot && LOCATION.has(method) && spotCentres.has(spot[1])) return spotCentres.get(spot[1]); return a; }
  if (typeof a === 'function') return '[fn]';
  if (Array.isArray(a)) return a.map((x) => arg(x, method));
  if (typeof a === 'object') { const o = {}; for (const [k, v] of Object.entries(a)) o[k] = arg(v, method); return cleanOptions(o); }
  return a;
}

/** what a path plays: files (basenames sorted), template, markers — through the given databases */
export function makePlays(dbs) {
  return (path) => {
    const list = Array.isArray(path) ? path : [path];
    const files = [];
    let template = null, markers = null;
    for (const p of list) {
      const f = resolvePath(p, dbs, ROOTS);
      if (f) files.push(...f); else files.push(`MISSING ${p}`);
      if (!p.includes('/')) {
        const db = dbs[p.split('.')[0]];
        if (db) { const m = metadataAt(db, p); template = template ?? m.template ?? null; markers = markers ?? m.markers ?? null; }
      }
    }
    return { files: [...new Set(files)].sort(), template, markers };
  };
}

/** canonical form of a recorded sequence */
export function canonical(seq, plays) {
  const sections = [];
  let thenDo = 0;
  for (const s of seq.sections) {
    if (s.kind === 'thenDo') { thenDo++; continue; }
    const calls = new Set();
    let template = null;
    const rest = [];
    for (const [method, args] of s.calls) {
      if (DROP.has(method)) continue;
      if (method === 'template') { template = args[0]; continue; }
      rest.push([method, args]);
    }
    let played = null;
    for (const [method, args0] of rest) {
      const args = args0.map((a) => arg(a, method));
      while (args.length && (args[args.length - 1] === undefined || (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1]) && !Object.keys(args[args.length - 1]).length))) args.pop();
      if (method === 'repeats' && (args[0] === 1 || args[0] === undefined)) continue;
      if (DEFAULT_CALLS[method] && JSON.stringify(args) === JSON.stringify(DEFAULT_CALLS[method])) continue;
      if (!args.length && ['persist', 'randomizeMirrorY', 'belowTokens', 'aboveLighting', 'xray', 'missed'].includes(method)) { if (method === 'persist' || method === 'randomizeMirrorY') calls.add(JSON.stringify([method, [true]])); else calls.add(JSON.stringify([method, [true]])); continue; }
      if (method === 'persist' && args[0] === true && !args[1]) { calls.add(JSON.stringify(['persist', [true]])); continue; }
      if (method === 'file') { played = plays(args0[0]); continue; }
      calls.add(JSON.stringify([method, args]));
    }
    if (played) {
      const t = template ? [template.gridSize, template.startPoint, template.endPoint] : played.template;
      calls.add(JSON.stringify(['plays', { files: played.files, template: t, markers: played.markers }]));
    }
    sections.push({ kind: s.kind, calls: [...calls].sort() });
  }
  return { sections, thenDo };
}

/** the differences between two canonical forms, as sentences; empty when equal */
export function diff(a, b, { labelA = 'AA', labelB = 'the engine' } = {}) {
  const out = [];
  if (a.thenDo !== b.thenDo) out.push(`${labelA} has ${a.thenDo} thenDo, ${labelB} ${b.thenDo}`);
  const n = Math.max(a.sections.length, b.sections.length);
  for (let i = 0; i < n; i++) {
    const sa = a.sections[i], sb = b.sections[i];
    if (!sa) { out.push(`section ${i + 1}: only ${labelB} has it (${sb.kind}: ${sb.calls.slice(0, 4).join(' ')})`); continue; }
    if (!sb) { out.push(`section ${i + 1}: only ${labelA} has it (${sa.kind}: ${sa.calls.slice(0, 4).join(' ')})`); continue; }
    if (sa.kind !== sb.kind) { out.push(`section ${i + 1}: ${labelA} ${sa.kind}, ${labelB} ${sb.kind}`); continue; }
    const onlyA = sa.calls.filter((c) => !sb.calls.includes(c));
    const onlyB = sb.calls.filter((c) => !sa.calls.includes(c));
    if (onlyA.length || onlyB.length) out.push(`section ${i + 1} (${sa.kind}): ${onlyA.length ? `${labelA} only ${onlyA.join(' ')}` : ''}${onlyA.length && onlyB.length ? ' · ' : ''}${onlyB.length ? `${labelB} only ${onlyB.join(' ')}` : ''}`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// the canonical moments, one set per kind of row
// ---------------------------------------------------------------------------------------------
/** the stage: a caster and two targets, one adjacent and one six squares away */
export function stageTokens() {
  const caster = token({ id: 'caster', name: 'Caster', x: 500, y: 500 });
  const near = token({ id: 'near', name: 'Near', x: 600, y: 500 });
  const far = token({ id: 'far', name: 'Far', x: 1100, y: 500 });
  const other = token({ id: 'other', name: 'Other', x: 500, y: 600 });
  const regions = { circle: region({ id: 'circle', type: 'circle', distance: 20, x: 1100, y: 500 }), cone: region({ id: 'cone', type: 'cone', distance: 15, x: 600, y: 550 }), line: region({ id: 'line', type: 'line', distance: 100, width: 5, x: 600, y: 550 }), rectangle: region({ id: 'rect', type: 'rectangle', distance: 15, x: 1000, y: 400 }) };
  for (const t of [caster, near, far, other]) spotCentres.set(t.id, { x: round(t.center.x), y: round(t.center.y) });
  return { caster, near, far, other, regions };
}

/**
 * The moments a row of this menu is proved against: [{name, oracle: phase-1 moment, engine: phase-2 moment}]
 */
export function momentsFor(row, fx, T) {
  const subject = { name: row.name, keys: fx.for, reach: false };
  const pair = (name, kind, { targets = [], hits = null, template = null, tie = null, destination = null, effect = false }) => ({
    name,
    oracle: oracleMoment(kind, { source: effect ? targets[0]?.token ?? T.caster : T.caster, targets: targets.map((t) => t.token), hits: hits ? hits.map((t) => t.token) : null, template, tieTo: tie, destination, name: row.name }),
    engine: { when: effect ? 'effect' : 'use', kind, subject, source: effect ? targets[0]?.token ?? T.caster : T.caster, targets: targets.map((t) => ({ token: t.token, hit: hits ? hits.some((h) => h.token === t.token) : undefined })), place: template ?? undefined, tie: tie ?? undefined, origin: `oracle.${row.name}`, id: `engine-${kind}`, destination: destination ?? undefined, noMove: true },
  });
  const near = { token: T.near }, far = { token: T.far }, other = { token: T.other };
  const menu = row.menu;
  const preset = row.fx?.[0]?.preset;
  if (menu === 'melee') return [pair('one target hit', 'attack', { targets: [near], hits: [near] }), pair('one target missed', 'attack', { targets: [near], hits: [] }), pair('one target out of reach', 'attack', { targets: [far], hits: [far] }), pair('two targets hit', 'attack', { targets: [near, other], hits: [near, other] })];
  if (menu === 'range') return [pair('one target hit', 'attack', { targets: [far], hits: [far] }), pair('one target missed', 'attack', { targets: [far], hits: [] }), pair('two targets hit', 'attack', { targets: [near, far], hits: [near, far] })];
  if (menu === 'ontoken') return [pair('one target', 'use', { targets: [near] }), pair('no target', 'use', {}), pair('two targets', 'use', { targets: [near, far] })];
  if (menu === 'aura') return [pair('on the token', 'use', { targets: [near] }), pair('no target', 'use', {})];
  if (menu === 'aefx') return [pair('the effect on a token', 'effect', { targets: [near], effect: true, tie: { uuid: 'oracle.effect', _isTie: true } })];
  if (menu === 'templatefx') {
    const type = row.fx[0].video?.menuType;
    const shape = type === 'cone' ? 'cone' : type === 'ray' ? 'line' : type === 'square' ? 'rectangle' : 'circle';
    return [pair(`a ${shape} placed, one target`, 'template', { targets: [near], template: T.regions[shape] }), pair(`a ${shape} placed, no target`, 'template', { template: T.regions[shape] })];
  }
  if (preset === 'teleport') return [pair('a destination chosen', 'use', { destination: { x: 850, y: 850 } })];
  if (preset === 'projectile-to-template') return [pair('a circle placed, one target', 'template', { targets: [near], template: T.regions.circle })];
  if (preset === 'thunderwave') return [pair('a square placed right of the caster', 'template', { template: T.regions.rectangle })];
  if (preset === 'dual-attach') return [pair('one target', 'attack', { targets: [far], hits: [far] })];
  return [pair('one target', 'use', { targets: [near] })];
}

// ---------------------------------------------------------------------------------------------
// the deliberate differences, each named: a difference the model chooses over AA's accident
// ---------------------------------------------------------------------------------------------
const soundsOnly = (c) => c.sections.length > 0 && c.sections.every((s) => s.kind === 'sound');
const withoutSounds = (c) => ({ ...c, sections: c.sections.filter((s) => s.kind !== 'sound') });
const soundCount = (c) => c.sections.filter((s) => s.kind === 'sound').length;
const hasWait = (c) => c.sections.some((s) => s.calls.some((x) => x.startsWith('["waitUntilFinished"')));
const sortedEqual = (a, b) => a.thenDo === b.thenDo && JSON.stringify([...a.sections].map((s) => JSON.stringify(s)).sort()) === JSON.stringify([...b.sections].map((s) => JSON.stringify(s)).sort());

export function allowance(a, b, diffs, momentName) {
  const noTarget = /no target/.test(momentName);
  if (noTarget && !b.sections.length && soundsOnly(a)) return 'an FX whose pictures need a target plays nothing, sound included, when nothing is targeted (AA played the sound alone)';
  if (noTarget && soundCount(a) > soundCount(b) && !diff(withoutSounds(a), withoutSounds(b)).length) return 'a follow-up mark with nothing to land on plays no sound (AA played its sound anyway)';
  if (noTarget && diffs.every((d) => /the engine only \["delay",\[-?\d+\]\]$/.test(d))) return "a mark that falls back to the caster honours the FX's delay (AA dropped it there)";
  if (!hasWait(a) && !hasWait(b) && sortedEqual(a, b)) return 'the same pictures start in a different order with no wait between them (a shield\'s bottom halves first, then its top halves)';
  if (diffs.every((d) => /AA only \["atLocation",\[\{"x":500,"y":500\}\]\] · the engine only \["atLocation",\[\{"x":550,"y":550\}\]\]$/.test(d))) return "a bolt from inside a standing area, with none standing, leaves from the caster's centre (AA left from the token's top-left corner)";
  return null;
}

/**
 * Prove one row against its fx. Returns {ok, moments: [{name, ok, diffs, allowed, files}]}
 */
export function proveRow(row, fx, T, plays) {
  const out = { ok: true, moments: [] };
  for (const m of momentsFor(row, fx, T)) {
    standing.length = 0;
    let a, b, err = null;
    try { a = canonical(buildRow(row, m.oracle).seq ?? { sections: [] }, plays); } catch (e) { err = `the oracle failed: ${e.message}`; }
    let ctx = null;
    try { const r = engineBuild(fx, m.engine); ctx = r.ctx; b = canonical(r.seq ?? { sections: [] }, plays); } catch (e) { err = (err ? err + '; ' : '') + `the engine failed: ${e.stack?.split('\n').slice(0, 2).join(' ') ?? e.message}`; }
    const diffs = err ? [err] : diff(a, b);
    const allowed = diffs.length && !err ? allowance(a, b, diffs, m.name) : null;
    if (diffs.length && !allowed) out.ok = false;
    out.moments.push({ name: m.name, ok: !diffs.length || !!allowed, exact: !diffs.length, diffs, allowed, files: ctx?.files ?? [], sounds: ctx?.sounds ?? [], missing: ctx?.missing ?? [] });
  }
  return out;
}
