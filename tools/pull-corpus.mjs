// Pull the corpus files the game wrote back into the repo. Save writes an FX into its corpus file
// in the module's own folder on the server (there is no draft layer, 2026-09-12); this brings the
// files here, where git, the tag and the release live. Reads the sandbox's module folder by default.
//
//   node tools/pull-corpus.mjs                 # what differs between the module on the sandbox and the repo, as fx
//   node tools/pull-corpus.mjs --write         # copy recipes/house.json and recipes/stock/*.json in
//   node tools/pull-corpus.mjs --from <dir>    # another module folder (a prod copy fetched by hand)
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { DATA, REPO } from './lib/env.mjs';
import { provenance } from '../scripts/core/fx.js';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const fromArg = args.indexOf('--from');
const FROM = fromArg >= 0 ? args[fromArg + 1] : join(DATA, 'modules', 'fvtt-mod-fxstudio');
if (!existsSync(join(FROM, 'recipes'))) { console.error(`no recipes folder under ${FROM}`); process.exit(2); }

const walk = (dir, out = []) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };
const rel = (p, base) => relative(base, p).replace(/\\/g, '/');
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const fxOf = (text) => { try { const j = JSON.parse(text); return Array.isArray(j.fx) ? j.fx : null; } catch { return null; } };

// only what a Save writes travels this way (the docs and the licence go the other way, with the deploy)
const CORPUS = (r) => r === 'recipes/house.json' || /^recipes\/stock\/[a-z]+\.json$/.test(r);
let changed = 0;
const pending = [];
for (const src of walk(join(FROM, 'recipes'))) {
  const r = rel(src, FROM);
  if (!CORPUS(r)) continue;
  const dst = join(REPO, r);
  const theirs = read(src);
  const ours = read(dst);
  if (theirs === ours) continue;
  changed++;
  pending.push([src, dst]);
  const a = fxOf(theirs);
  const b = ours ? fxOf(ours) : [];
  if (a && b) {
    const mine = new Map(b.map((l) => [l.id, JSON.stringify(l)]));
    const added = a.filter((l) => !mine.has(l.id));
    const edited = a.filter((l) => mine.has(l.id) && mine.get(l.id) !== JSON.stringify(l));
    const gone = b.filter((l) => !a.some((x) => x.id === l.id));
    console.log(`${r}: ${added.length} added, ${edited.length} changed, ${gone.length} removed`);
    for (const l of added) console.log(`  + ${l.id} — ${provenance(l)}`);
    for (const l of edited) console.log(`  ~ ${l.id} — ${provenance(l)}`);
    for (const l of gone) console.log(`  - ${l.id}`);
  } else console.log(`${r}: ${ours === null ? 'new' : 'differs'}`);
}
if (!changed) { console.log('the repo already holds what the module on the sandbox holds'); process.exit(0); }
if (!WRITE) { console.log(`\n${changed} file(s) differ. Pass --write to pull them in.`); process.exit(0); }
for (const [src, dst] of pending) { mkdirSync(dirname(dst), { recursive: true }); writeFileSync(dst, readFileSync(src)); console.log(`wrote ${rel(dst, REPO)}`); }
console.log('pulled. Read the diff, then commit and follow the release ritual (CLAUDE.md).');
