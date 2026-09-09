// Every path a proposal names, met against the real databases. A proposal that names a path the
// library does not have is worse than no proposal, so nothing leaves here unchecked.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { REPO } from './lib/env.mjs';
import { loadJb2a, loadPsfx } from './lib/libraries.mjs';

function flatten(db, prefix, out = new Set()) {
  for (const [k, v] of Object.entries(db ?? {})) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out); else out.add(path);
  }
  return out;
}
const paths = new Set([...flatten(await loadJb2a(), 'jb2a'), ...flatten(await loadPsfx(), 'psfx')]);
// a Sequencer path may name a NODE and let Sequencer pick a file under it, so a prefix is valid too
const nodes = new Set();
for (const p of paths) { const s = p.split('.'); for (let i = 2; i < s.length; i++) nodes.add(s.slice(0, i).join('.')); }
const ok = (p) => !p || paths.has(p) || nodes.has(p) || p.startsWith('modules/') || p.startsWith('icons/');

// every `basis` must name an FX the corpus really holds — a proposal that copies nothing is noise
const corpusKeys = new Set();
for (const f of ['spells', 'weapons', 'natural', 'features', 'items', 'effects']) {
  for (const fx of JSON.parse(readFileSync(`${REPO}/recipes/stock/${f}.json`, 'utf8')).fx) if (fx.for?.[0]) corpusKeys.add(fx.for[0]);
}
for (const fx of JSON.parse(readFileSync(`${REPO}/recipes/house.json`, 'utf8')).fx) if (fx.for?.[0]) corpusKeys.add(fx.for[0]);

const file = `${REPO}/dist/proposals.tsv`;
if (!existsSync(file)) { console.log('no proposals yet'); process.exit(0); }
const lines = readFileSync(file, 'utf8').trim().split('\n');
const bad = [], badBasis = [];
let n = 0;
const seen = new Set(), dupes = [];
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  n++;
  const [key, , basis, vfx, sfx] = line.split('\t');
  if (basis?.trim() && !corpusKeys.has(basis.trim())) badBasis.push(`${key} -> ${basis}`);
  if (seen.has(key)) dupes.push(key); else seen.add(key);
  for (const p of [vfx, sfx]) if (p && !ok(p.trim())) bad.push(`${key}\t${p}`);
}
const gapKeys = new Set(Object.keys(JSON.parse(readFileSync(`${REPO}/recipes/records.json`, 'utf8')).records).filter((k) => !corpusKeys.has(k)));
const orphans = [...seen].filter((k) => !gapKeys.has(k));
if (orphans.length) console.log(`⚠ ${orphans.length} proposals for keys that are not gaps: ${orphans.slice(0, 20).join(', ')}`);
console.log(`${n} proposals · ${bad.length} bad paths · ${badBasis.length} bad basis · ${dupes.length} duplicate keys`);
if (badBasis.length) console.log(badBasis.slice(0, 30).join('\n'));
if (bad.length) console.log(bad.slice(0, 40).join('\n'));
if (dupes.length) console.log(`dupes: ${dupes.slice(0, 20).join(', ')}`);
