// Pull the corpus the game shipped back into the repo (DESIGN §8). The Corpus tab writes the corpus
// files and the version into the module's own folder on the server; this brings them here, where
// git, the tag and the release live. Reads the sandbox's module folder by default.
//
//   node tools/pull-corpus.mjs                 # what differs between the module on the sandbox and the repo, as fx
//   node tools/pull-corpus.mjs --write         # copy recipes/** in; take the shipped version into module.json (and its download URL)
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

// only what a ship writes travels this way (the docs and the licence go the other way, with the deploy)
const SHIPPED = (r) => r === 'recipes/house.json' || r === 'recipes/shipped.json' || /^recipes\/baseline\/[a-z]+\.json$/.test(r);
let changed = 0;
const pending = [];
for (const src of walk(join(FROM, 'recipes'))) {
  const r = rel(src, FROM);
  if (!SHIPPED(r)) continue;
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
// the version the game stamped lives in the shipping record (the module's own manifest is never rewritten under it)
const record = JSON.parse(read(join(FROM, 'recipes', 'shipped.json')) ?? '{"shipped":[]}');
const theirManifest = { version: record.shipped?.[0]?.version ?? null };
const ourManifest = JSON.parse(read(join(REPO, 'module.json')));
const newer = (a, b) => { const x = String(a).split('.').map(Number); const y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); return false; };
const versionDiffers = theirManifest.version && newer(theirManifest.version, ourManifest.version);
if (versionDiffers) console.log(`version: the last ship stamped ${theirManifest.version}, the repo says ${ourManifest.version}`);
if (!changed && !versionDiffers) { console.log('the repo already holds what the module on the sandbox holds'); process.exit(0); }
if (!WRITE) { console.log(`\n${changed} file(s) differ. Pass --write to pull them in${versionDiffers ? ' and take the version' : ''}.`); process.exit(0); }
for (const [src, dst] of pending) { mkdirSync(dirname(dst), { recursive: true }); writeFileSync(dst, readFileSync(src)); console.log(`wrote ${rel(dst, REPO)}`); }
if (versionDiffers) {
  ourManifest.version = theirManifest.version;
  if (typeof ourManifest.download === 'string') ourManifest.download = ourManifest.download.replace(/\/v[\d.]+\//, `/v${theirManifest.version}/`);
  writeFileSync(join(REPO, 'module.json'), `${JSON.stringify(ourManifest, null, 2)}\n`);
  console.log(`module.json: version ${theirManifest.version} and its download URL`);
}
console.log('pulled. Read the diff, then commit and follow the release ritual (CLAUDE.md).');
