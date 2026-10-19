// Every proposal in recipes/proposals.json made a Stock FX, in one pass (the user, 2026-10-19: all of them).
// A proposal names a basis (an FX to copy), a picture and a sound; this stamps the basis's MAIN scene out with
// the proposal's picture and sound and fits it to the moment the record really has (DESIGN §25, the reader's
// policy in readers/dnd5e.js):
//   the trigger    an `effect:` key plays on the effect; every other key on its card, or on its placed template
//                  when the record places one (the card then plays nothing)
//   the main scene a template record keeps the basis's fill; a projectile picture keeps its shot; a strike
//                  stays a strike; otherwise the mark where the picture lands. A teleport (a `move` scene)
//                  keeps every scene, the picture on each mark. A layered pair (below + above) is one mark.
//   the fit        an effect plays a mark or an aura on its owner; a fill with no template to fill is a mark;
//                  a place the moment has not got (a template, an impact) is the nearest one it has; a
//                  picture with nothing to end it plays once (persist none)
// Every scene keeps exactly the knobs its shape reads (core/fx.js KNOBS). Nothing is written without --write.
//   node tools/promote-proposals.mjs            report what it would write, by file and by fit
//   node tools/promote-proposals.mjs --write    append the FX to recipes/stock/<kind>.json and set _meta.fx
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { REPO } from './lib/env.mjs';
import { KNOBS, validate } from '../scripts/core/fx.js';
import { stampRecord } from '../scripts/core/records.js';
import { loadJb2a, nodeAt, filesUnder } from './lib/libraries.mjs';

const write = process.argv.includes('--write');
const read = (f) => JSON.parse(readFileSync(`${REPO}/${f}`, 'utf8'));
const FILE_OF = { effect: 'effects', feature: 'features', item: 'items', natural: 'natural', spell: 'spells', weapon: 'weapons' };

const stock = {};
for (const f of readdirSync(`${REPO}/recipes/stock`).filter((f) => f.endsWith('.json'))) stock[f.replace(/\.json$/, '')] = read(`recipes/stock/${f}`);
const house = read('recipes/house.json');
const byId = new Map();
const ids = new Set();
const answered = new Set();
for (const s of Object.values(stock)) for (const fx of s.fx) { byId.set(fx.id, fx); ids.add(fx.id); for (const k of fx.for ?? []) answered.add(k); }
for (const fx of house.fx) { ids.add(fx.id); for (const k of fx.for ?? []) answered.add(k); }

const proposals = read('recipes/proposals.json').proposals;
const records = read('recipes/records.json').records;
const gaps = new Map(read('dist/gaps.json').rows.map((r) => [r.key, r]));

// Sequencer's size() sets width and height alike, so a non-square picture squashes in a mark or an aura (a
// strike's swing is non-square in all of Stock, the look as it stands); a shot or a beam stretches, a fill takes the template's shape.
const jb2a = await loadJb2a();
const SIZED = ['mark', 'aura'];
function nonSquare(path) {
  const files = path.startsWith('jb2a.') ? filesUnder(nodeAt(jb2a, path)) : [path];
  const dims = files.map((f) => String(f).match(/_(\d+)x(\d+)\.webm/)).filter(Boolean);
  return dims.some((m) => m[1] !== m[2]) ? `${dims[0][1]}x${dims[0][2]}` : null;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const PROJECTILE = /bolt|arrow|missile|javelin|dart|bullet|projectile|ray\b|ray_|beam|throw|spear|orb|needle|spit|boulder|rock|shard|ball\./i;
const SWING = /melee_attack|melee_generic|\.melee\./;
const FLIGHT = /projectile|energy_strands|energy_beam|guiding_bolt|\.ranged\.|\.dart\.|\.toss\.|spittle/;
const LINE = /\.line\.|lightning_bolt|gust_of_wind/;
const LANDS = ['each-target', 'impact', 'template', 'targets-else-source', 'destination', 'area', 'both'];

/** the scene of the basis that the proposal's picture stands for */
function mainScene(basis, { onTemplate, vfx }) {
  const sc = basis.scenes.filter((s) => s.shape !== 'sound');
  const fill = sc.find((s) => s.shape === 'fill');
  if (fill && onTemplate) return fill;
  const shot = sc.find((s) => s.shape === 'shoot' || s.shape === 'beam');
  if (shot && (PROJECTILE.test(vfx) || !sc.some((s) => s.shape === 'mark'))) return shot;
  const strike = sc.find((s) => s.shape === 'strike');
  if (strike) return strike;
  const marks = sc.filter((s) => s.shape === 'mark' || s.shape === 'aura');
  if (marks.length) {
    const landing = [...marks].reverse().find((s) => LANDS.includes(s.at));
    // a layered pair's below half is turned over (rotate 180): the above half stands for the pair
    return landing ?? marks.find((s) => typeof s.rotate !== 'number') ?? marks[0];
  }
  return fill ?? shot ?? sc[0];
}

/** the scene fitted to the moment, with only the knobs its shape reads */
function fit(scene0, { on, onTemplate }) {
  const s = clone(scene0);
  const fromLayer = typeof s.asset?.file === 'string' && /Below/.test(s.asset.file);
  if (on === 'effect') {
    if (!['mark', 'aura'].includes(s.shape)) { s.shape = 'mark'; s.at = 'source'; delete s.size; }
    if (s.shape === 'mark' && !['source', 'each-target', 'targets-else-source', 'both'].includes(s.at ?? 'targets-else-source')) s.at = 'source';
    if (s.persist && s.persist !== 'none') s.persist = 'effect';
  } else if (!onTemplate) {
    if (s.shape === 'aura') { s.shape = 'mark'; s.at = 'source'; delete s.size; }
    if (s.shape === 'fill') { s.shape = 'mark'; s.at = 'targets-else-source'; delete s.size; }
    for (const k of ['at', 'to']) if (['template', 'area'].includes(s[k])) s[k] = s.shape === 'mark' ? 'targets-else-source' : 'each-target';
    if (s.from === 'template') s.from = 'source';
    if (s.shape !== 'beam' && s.persist && s.persist !== 'none') s.persist = 'none';
    if (s.shape === 'beam') s.persist = 'none';
  } else if (s.persist === 'effect') s.persist = 'template';
  if (s.size?.fit && s.shape !== 'fill') delete s.size;
  if (fromLayer && typeof s.rotate === 'number') delete s.rotate;
  for (const k of Object.keys(s)) if (!KNOBS[s.shape].includes(k)) delete s[k];
  return s;
}

/** a scene wearing the proposal's picture and sound (asset-bound knobs dropped) */
function dress(s, vfx, sfx, withSound) {
  if (s.shape !== 'move') {
    s.asset = { path: vfx };
    if (typeof s.rotate === 'number' && s.rotate === 180) delete s.rotate;
  }
  if (withSound) s.sound = { ...(s.sound && typeof s.sound === 'object' ? s.sound : {}), asset: sfx };
  else delete s.sound;
  return s;
}

function idFor(key) {
  const [kind, ident] = key.split(':');
  for (const c of [ident, `${ident}-${kind}`, `${ident}-${kind}-2`, `${ident}-${kind}-3`]) if (!ids.has(c)) { ids.add(c); return c; }
  throw new Error(`no free id for ${key}`);
}

const made = [];
const held = [];
const tally = {};
for (const [key, p] of Object.entries(proposals)) {
  if (p.status !== 'proposed') continue;
  if (answered.has(key)) { held.push([key, 'already answered']); continue; }
  const basis = byId.get(p.basis);
  const record = records[key];
  const kind = key.split(':')[0];
  if (!basis) { held.push([key, `basis ${p.basis} not in Stock`]); continue; }
  if (!record) { held.push([key, 'no record']); continue; }
  if (!FILE_OF[kind]) { held.push([key, `kind ${kind} has no Stock file`]); continue; }
  const on = kind === 'effect' ? 'effect' : 'use';
  const onTemplate = on === 'use' && /template/.test(gaps.get(key)?.facts ?? '');
  let scenes;
  if (basis.scenes.some((s) => s.shape === 'move') && on === 'use') {
    scenes = basis.scenes.map((s) => clone(s));
    let first = true;
    scenes = scenes.map((s) => {
      if (s.shape === 'mark') { const d = dress(fit(s, { on, onTemplate }), p.vfx, p.sfx, first); first = false; return d; }
      return fit(s, { on, onTemplate });
    });
  } else {
    scenes = [dress(fit(mainScene(basis, { onTemplate, vfx: p.vfx }), { on, onTemplate }), p.vfx, p.sfx, true)];
  }
  const fx = stampRecord({ id: idFor(key), for: [key], on, scenes }, records);
  const squashed = nonSquare(p.vfx);
  // a non-square picture that is a swing, a flight or a line plays as Stock plays those: a strike, a shot,
  // or (a line on its placed template) a fill — on a card only; an effect has no one to swing at
  if (squashed && on === 'use' && scenes.length === 1 && SIZED.includes(scenes[0].shape)) {
    const sound = scenes[0].sound;
    if (onTemplate && LINE.test(p.vfx)) scenes = [{ shape: 'fill', asset: { path: p.vfx }, sound, persist: 'none' }];
    else if (SWING.test(p.vfx)) scenes = [{ shape: 'strike', asset: { path: p.vfx }, sound, to: 'each-target' }];
    else if (FLIGHT.test(p.vfx) || LINE.test(p.vfx)) scenes = [{ shape: 'shoot', asset: { path: p.vfx }, sound, from: 'source', to: 'each-target' }];
  }
  if (squashed && scenes.some((s) => SIZED.includes(s.shape))) { held.push([key, `${p.vfx} is ${squashed}: it would squash in a ${scenes.find((s) => SIZED.includes(s.shape)).shape}`]); ids.delete(fx.id); continue; }
  const problems = validate(fx) ?? [];
  if (problems.length) { held.push([key, problems.join('; ')]); ids.delete(fx.id); continue; }
  made.push([FILE_OF[kind], fx]);
  const t = `${kind} · ${on}${onTemplate ? ' on its template' : ''} · ${scenes.map((s) => s.shape).join('+')}`;
  tally[t] = (tally[t] ?? 0) + 1;
}

const perFile = {};
for (const [f] of made) perFile[f] = (perFile[f] ?? 0) + 1;
console.log(`${made.length} FX from ${made.length + held.length} proposals; held back ${held.length}`);
for (const [f, n] of Object.entries(perFile)) console.log(`  ${f}.json +${n}`);
for (const [t, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`);
for (const [k, why] of held) console.log(`  held: ${k} — ${why}`);

if (write) {
  for (const [f, fx] of made) stock[f].fx.push(fx);
  for (const f of new Set(made.map(([f]) => f))) {
    stock[f]._meta.fx = stock[f].fx.length;
    writeFileSync(`${REPO}/recipes/stock/${f}.json`, JSON.stringify(stock[f], null, 1) + '\n');
  }
  console.log('✓ written');
}
