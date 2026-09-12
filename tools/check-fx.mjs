// Every FX validates (the grammar of core/fx.js, the same validator the API runs) and every
// asset it names resolves against JB2A's and PSFX's own registration files and the disk — with no
// Foundry running. An FX that names a path that does not exist is a defect, and this is what
// catches a library regrouping its paths. Run after any library update and on any FX file
// before it is proposed.
//
//   node tools/check-fx.mjs                # every recipe: the stock per kind, the house, the starters
//   node tools/check-fx.mjs <file.json>    # an FX file (a list, {fx: [...]}, or one FX) against the recipes
//   node tools/check-fx.mjs --quiet        # counts only
//   node tools/check-fx.mjs --sentences    # print every FX's sentence as well
import { existsSync } from 'node:fs';
import { ROOTS } from './lib/env.mjs';
import { readFxFile, readRecipes, useLibraries } from './lib/recipes.mjs';
import { assetsOf, sentence, validate } from '../scripts/core/fx.js';
import { recordAgrees } from '../scripts/core/records.js';
import { resolveAsset } from '../scripts/engine/assets.js';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const sentences = args.includes('--sentences');
const file = args.find((a) => !a.startsWith('--'));

const recipes = readRecipes();
const { db } = await useLibraries(recipes);
const known = new Set(recipes.frozen?.meta?.missingFiles ?? []); // files AA's table names that this JB2A build lacks: silent under AA too
const sets = file ? [['file', readFxFile(file)]] : [['stock', recipes.stock], ['house', recipes.house], ['starters', recipes.starters.map((s) => ({ ...s, id: s.id }))]];

const problems = [];
const counts = { fx: 0, off: 0, scenes: 0, assets: 0, ok: 0, missing: 0, knownMissing: 0, invalid: 0, frozen: 0, unrecorded: 0 };
for (const [source, list] of sets) {
  for (const fx of list) {
    counts.fx++;
    const where = `${source} "${fx?.id}"`;
    const errs = validate(fx);
    if (errs.length) { counts.invalid++; problems.push(`${where}: ${errs.join('; ')}`); continue; }
    // every keyed FX in the corpora carries the record the evidence says (core/records.js); a file under test may not, and is told
    if (source !== 'starters' && fx.for?.[0] && recipes.records[fx.for[0]] && !recordAgrees(fx, recipes.records)) {
      counts.unrecorded++;
      problems.push(`${where}: ${fx.record ? 'its record disagrees with' : 'carries no record; the evidence is'} ${recipes.records[fx.for[0]].where} · ${recipes.records[fx.for[0]].name}${source === 'file' ? ' (saving it stamps the record)' : ' (node tools/records.mjs --write stamps it)'}`);
    }
    if (fx.off) { counts.off++; continue; }
    for (const scene of fx.scenes ?? []) {
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
    if (sentences) console.log(`  ${sentence(fx)}`);
  }
}
// every file the frozen table names must be on disk
let frozenFiles = 0, frozenMissing = 0;
if (recipes.frozen?.db) {
  const walk = (o) => { if (typeof o === 'string') { frozenFiles++; if (!ROOTS.some((r) => existsSync(`${r}/${o}`))) { if (known.has(o)) counts.knownMissing++; else { frozenMissing++; problems.push(`frozen table: ${o} is not on disk`); } } } else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!k.startsWith('_')) walk(v); };
  walk(recipes.frozen.db);
}
void db;
console.log(`check-fx: ${counts.fx} fx (${counts.off} off), ${counts.scenes} scenes, ${counts.assets} assets · resolve ${counts.ok}, missing ${counts.missing}, on the frozen table ${counts.frozen} · invalid ${counts.invalid} · frozen table files on disk ${frozenFiles - frozenMissing} of ${frozenFiles} · known-missing since AA ${counts.knownMissing}`);
if (!quiet) for (const p of problems) console.log('  ✗ ' + p);
if (problems.length) { console.log(`FAIL: ${problems.length} problem(s)`); process.exitCode = 1; } else console.log('PASS');
