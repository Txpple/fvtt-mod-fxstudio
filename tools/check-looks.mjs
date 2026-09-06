// Every path in both corpora, checked against the libraries' own registration files and the disk,
// with no Foundry running. A look that names a path that does not exist is a defect, and this is
// what catches a library regrouping its paths (as PSFX 0.17.0 did). The Check screen runs the
// same test live through Sequencer.Database.
//
//   node tools/check-looks.mjs            # both corpora and the private table
//   node tools/check-looks.mjs --quiet    # counts only
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES, ROOTS } from './lib/env.mjs';
import { leafPaths, loadJb2a, loadPsfx, resolvePath } from './lib/libraries.mjs';

const quiet = process.argv.includes('--quiet');
const read = (f) => (existsSync(join(RECIPES, f)) ? JSON.parse(readFileSync(join(RECIPES, f), 'utf8')) : null);
const baseline = read('baseline.json');
const house = read('house.json');
const twin = read('aa-database.json');
if (!baseline) { console.error('recipes/baseline.json is missing; run tools/import-aa.mjs --write first'); process.exit(1); }

const dbs = { jb2a: await loadJb2a(), psfx: await loadPsfx(), fxstudio: twin?.db ?? {} };
const problems = [];
const known = new Set(twin?.meta?.missingFiles ?? []); // AA's table names them, this JB2A build lacks them: silent under AA too
const counts = { rows: 0, layers: 0, dbPaths: 0, rawPaths: 0, sounds: 0, ok: 0, missing: 0, knownMissing: 0, filesChecked: 0, filesMissing: 0 };

function checkPath(path, where, kind) {
  if (!path) return;
  if (!path.includes('/') && /^[a-z0-9_-]+\./i.test(path)) counts.dbPaths++; else counts.rawPaths++;
  if (kind === 'sound') counts.sounds++;
  if (resolvePath(path, dbs, ROOTS)) counts.ok++;
  else { counts.missing++; problems.push(`${where}: ${kind} ${path} does not resolve`); }
}
function checkLayer(l, where) {
  counts.layers++;
  if (l.aa) checkPath(l.aa.replace(/^autoanimations\./, 'fxstudio.aa.'), where, 'private table');
  if (l.returnAa) checkPath(l.returnAa.replace(/^autoanimations\./, 'fxstudio.aa.'), where, 'return');
  if (l.file && l.missing) counts.knownMissing++;
  else if (l.file) checkPath(l.file, where, l.aa ? 'jb2a twin' : 'custom');
  if (l.sound?.file && !l.sound.unresolved) checkPath(l.sound.file, where, 'sound');
}
function checkRow(r, source) {
  counts.rows++;
  if (r.off) return;
  const where = `${source} "${r.name}" [${r.menu}]`;
  for (const l of r.fx ?? []) {
    if (l.data) {
      for (const part of ['projectile', 'preExplosion', 'explosion', 'start', 'between', 'end', 'video']) if (l.data[part]?.video || l.data[part]?.file) checkLayer(l.data[part], `${where} ${part}`);
      if (l.data.sound?.file && !l.data.sound.unresolved) checkPath(l.data.sound.file, where, 'sound');
      if (l.data.afterImage?.customPath) checkPath(l.data.afterImage.customPath, where, 'after-image');
    } else checkLayer(l, `${where} ${l.preset}`);
  }
  if (r.thrown) checkLayer(r.thrown, `${where} thrown`);
  if (r.soundOnly?.file && !r.soundOnly.unresolved) checkPath(r.soundOnly.file, where, 'sound');
}
for (const r of baseline.rows) checkRow(r, 'baseline');
for (const r of house?.rows ?? []) checkRow(r, 'house');

// every file the private table names must exist on disk
for (const [, files] of leafPaths(dbs.fxstudio, 'fxstudio')) for (const f of files) { counts.filesChecked++; if (!ROOTS.some((r) => existsSync(`${r}/${f}`))) { if (known.has(f)) counts.knownMissing++; else { counts.filesMissing++; problems.push(`private table: ${f} is not on disk`); } } }

console.log(`check-looks: ${counts.rows} rows, ${counts.layers} layers · ${counts.dbPaths} database paths, ${counts.rawPaths} raw paths (${counts.sounds} sounds) · resolve ${counts.ok}, missing ${counts.missing} · private table files on disk ${counts.filesChecked - counts.filesMissing} of ${counts.filesChecked} · known-missing since AA (listed in the import report) ${counts.knownMissing}`);
if (!quiet) for (const p of problems) console.log('  ✗ ' + p);
if (problems.length) { console.log(`FAIL: ${problems.length} problem(s)`); process.exitCode = 1; } else console.log('PASS');
