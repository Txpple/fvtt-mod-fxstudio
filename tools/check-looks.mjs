// Every look validates (the grammar of core/looks.js, the same validator the API runs) and every
// asset it names resolves against JB2A's and PSFX's own registration files and the disk — with no
// Foundry running. A look that names a path that does not exist is a defect, and this is what
// catches a library regrouping its paths. Run after any library update and on any look file
// before it is proposed.
//
//   node tools/check-looks.mjs                # every recipe: the baseline per kind, the house, the starters
//   node tools/check-looks.mjs <file.json>    # a look file (a list, {looks: [...]}, or one look) against the recipes
//   node tools/check-looks.mjs --quiet        # counts only
//   node tools/check-looks.mjs --sentences    # print every look's sentence as well
import { existsSync } from 'node:fs';
import { ROOTS } from './lib/env.mjs';
import { readLookFile, readRecipes, useLibraries } from './lib/recipes.mjs';
import { assetsOf, expand, sentence, validate } from '../scripts/core/looks.js';
import { resolveAsset } from '../scripts/engine/assets.js';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const sentences = args.includes('--sentences');
const file = args.find((a) => !a.startsWith('--'));

const recipes = readRecipes();
const { db } = await useLibraries(recipes);
const known = new Set(recipes.frozen?.meta?.missingFiles ?? []); // files AA's table names that this JB2A build lacks: silent under AA too
const sets = file ? [['file', readLookFile(file)]] : [['baseline', recipes.baseline], ['house', recipes.house], ['starters', recipes.starters.map((s) => ({ ...s, id: s.id }))]];
const ids = new Set([...recipes.baseline, ...recipes.house].map((l) => l.id).concat(recipes.starters.map((s) => `starter:${s.id}`)));
if (file) for (const l of sets[0][1]) if (l?.id) ids.add(l.id);
const lookup = (id) => [...recipes.baseline, ...recipes.house].find((l) => l.id === id) ?? recipes.starters.map((s) => ({ ...s, id: `starter:${s.id}` })).find((s) => s.id === id) ?? (file ? sets[0][1].find((l) => l.id === id) : null) ?? null;

const problems = [];
const counts = { looks: 0, off: 0, scenes: 0, assets: 0, ok: 0, missing: 0, knownMissing: 0, invalid: 0, frozen: 0 };
for (const [source, looks] of sets) {
  for (const look of looks) {
    counts.looks++;
    const where = `${source} "${look?.id}"`;
    const errs = validate(look, { ids });
    if (errs.length) { counts.invalid++; problems.push(`${where}: ${errs.join('; ')}`); continue; }
    if (look.off) { counts.off++; continue; }
    let full;
    try { full = expand(look, lookup); } catch (e) { counts.invalid++; problems.push(`${where}: ${e.message}`); continue; }
    for (const scene of full.scenes ?? []) {
      counts.scenes++;
      for (const { asset, where: w } of assetsOf(scene)) {
        counts.assets++;
        const r = resolveAsset(asset);
        const plays = r.play ? (Array.isArray(r.play) ? r.play : [r.play]) : [];
        if (String(plays[0] ?? '').startsWith('fxstudio.')) counts.frozen++;
        if (r.missing) {
          const raw = plays.filter((p) => p.includes('/'));
          if (raw.length && raw.every((p) => known.has(p) || p.endsWith('Map.png'))) { counts.knownMissing++; continue; }
          counts.missing++; problems.push(`${where} ${w}: ${r.why}`);
        } else {
          // a raw file must be on disk too
          for (const p of plays) if (p.includes('/') && !p.includes('*') && !ROOTS.some((root) => existsSync(`${root}/${p}`))) { if (known.has(p) || p.endsWith('Map.png')) counts.knownMissing++; else { counts.missing++; problems.push(`${where} ${w}: ${p} is not on disk`); } }
          counts.ok++;
        }
      }
    }
    if (sentences) console.log(`  ${sentence(full)}`);
  }
}
// every file the frozen table names must be on disk
let frozenFiles = 0, frozenMissing = 0;
if (recipes.frozen?.db) {
  const walk = (o) => { if (typeof o === 'string') { frozenFiles++; if (!ROOTS.some((r) => existsSync(`${r}/${o}`))) { if (known.has(o)) counts.knownMissing++; else { frozenMissing++; problems.push(`frozen table: ${o} is not on disk`); } } } else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!k.startsWith('_')) walk(v); };
  walk(recipes.frozen.db);
}
void db;
console.log(`check-looks: ${counts.looks} looks (${counts.off} off), ${counts.scenes} scenes, ${counts.assets} assets · resolve ${counts.ok}, missing ${counts.missing}, on the frozen table ${counts.frozen} · invalid ${counts.invalid} · frozen table files on disk ${frozenFiles - frozenMissing} of ${frozenFiles} · known-missing since AA ${counts.knownMissing}`);
if (!quiet) for (const p of problems) console.log('  ✗ ' + p);
if (problems.length) { console.log(`FAIL: ${problems.length} problem(s)`); process.exitCode = 1; } else console.log('PASS');
