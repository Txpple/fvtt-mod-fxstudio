// The pool a proposal may draw from, written flat so a person (or an assistant) can read all of it:
//   dist/pool-corpus.txt    every FX there is — key, name, and what its scenes actually play
//   dist/pool-jb2a.txt      the JB2A families, collapsed, with the colour variants each one has
//   dist/pool-psfx.txt      the PSFX families, the same way
// Nothing here plays and nothing is written to recipes/. It exists so a proposed variant names a
// path that REALLY EXISTS, which is the only thing that makes a proposal worth reading.
import { readFileSync, writeFileSync } from 'node:fs';
import { REPO, RECIPES } from './lib/env.mjs';
import { loadJb2a, loadPsfx } from './lib/libraries.mjs';

const say = (s = '') => console.log(s);

// ── the corpus ───────────────────────────────────────────────────────────────────────────────
const fxs = [];
for (const f of ['spells', 'weapons', 'natural', 'features', 'items', 'effects']) {
  for (const fx of JSON.parse(readFileSync(`${RECIPES}/stock/${f}.json`, 'utf8')).fx) fxs.push({ ...fx, file: f });
}
for (const fx of JSON.parse(readFileSync(`${RECIPES}/house.json`, 'utf8')).fx) fxs.push({ ...fx, file: 'house' });

const asset = (a) => (a?.path ?? a?.file ?? '');
const sceneWords = (s) => {
  const bits = [s.shape];
  if (s.at) bits.push(`@${s.at}`);
  const a = asset(s.asset);
  if (a) bits.push(a);
  if (s.thrown?.asset) bits.push(`thrown ${asset(s.thrown.asset)}`);
  if (s.sound?.asset) bits.push(`+${s.sound.asset}`);
  if (s.tint) bits.push(`tint ${s.tint}`);
  return bits.join(' ');
};
const corpus = fxs.map((fx) => `${fx.for?.[0] ?? '(item hook)'}\t${fx.id}\t${fx.file}\t${(fx.scenes ?? []).map(sceneWords).join(' | ')}`);
writeFileSync(`${REPO}/dist/pool-corpus.txt`, `${fxs.length} FX — key\tid\tfile\tscenes\n${corpus.sort().join('\n')}\n`);
say(`pool-corpus.txt  ${fxs.length} FX`);

// ── the libraries, collapsed to families ─────────────────────────────────────────────────────
/** every leaf path a database offers, as `ns.a.b.c` strings */
function flatten(db, prefix, out = []) {
  for (const [k, v] of Object.entries(db ?? {})) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out);
    else out.push(path);
  }
  return out;
}

/**
 * Collapse a flat list to families: everything but the last one or two segments is the family, and
 * the segments that vary under it are listed as its variants. JB2A's own shape is
 * `jb2a.<effect>.<variant>.<colour>.<take>`, so the family is what you pick and the tail is how.
 */
function families(paths, depth) {
  const fam = new Map();
  for (const p of paths) {
    const seg = p.split('.');
    const head = seg.slice(0, Math.min(depth, seg.length - 1)).join('.');
    const tail = seg.slice(Math.min(depth, seg.length - 1)).join('.');
    (fam.get(head) ?? fam.set(head, new Set()).get(head)).add(tail);
  }
  return [...fam].sort(([a], [b]) => a.localeCompare(b)).map(([h, t]) => `${h}\t${[...t].sort().join(' ')}`);
}

const jb2a = await loadJb2a();
const jpaths = flatten(jb2a, 'jb2a');
const jfam = families(jpaths, 3);
writeFileSync(`${REPO}/dist/pool-jb2a.txt`, `${jpaths.length} paths in ${jfam.length} families — family\tvariants\n${jfam.join('\n')}\n`);
say(`pool-jb2a.txt    ${jpaths.length} paths · ${jfam.length} families`);

const psfx = await loadPsfx();
const ppaths = flatten(psfx, 'psfx');
const pfam = families(ppaths, 3);
writeFileSync(`${REPO}/dist/pool-psfx.txt`, `${ppaths.length} paths in ${pfam.length} families — family\tvariants\n${pfam.join('\n')}\n`);
say(`pool-psfx.txt    ${ppaths.length} paths · ${pfam.length} families`);
