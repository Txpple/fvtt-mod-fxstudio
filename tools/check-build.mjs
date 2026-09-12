// Every FX in the corpus BUILDS, without Foundry: each Stock and House FX through the engine on the
// offline stage against a moment fitted to what its scenes need (targets, a placed template for a
// fill or a flight to the template, a destination for a move), with the assets resolved against
// JB2A's and PSFX's own registration. What check-fx proves of the data (it validates, its paths
// exist), this proves of the render: the engine turns every FX into a Sequence with something to
// play, and names every file it would play. smoke-fx proves the same thing live on the sandbox;
// this is the same proof in two seconds with nothing running. Run after any edit under
// scripts/engine/ or recipes/.
//
//   node tools/check-build.mjs             every FX
//   node tools/check-build.mjs <file.json> an FX file (the same shapes check-fx reads)
//   node tools/check-build.mjs --quiet     the report line and the problems only
//   node tools/check-build.mjs --show <id> print one FX's sections as built
import { readFxFile, readRecipes, useLibraries } from './lib/recipes.mjs';
import { install, table, sections, standing } from './lib/stage.mjs';
import { toUrl, REPO } from './lib/env.mjs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const show = (() => { const i = args.indexOf('--show'); return i >= 0 ? args[i + 1] : null; })();
const file = args.find((a) => !a.startsWith('--') && a !== show);

const recipes = readRecipes();
const { dbs } = await useLibraries(recipes);
install({ dbs });
const { useDatabase } = await import(toUrl(join(REPO, 'scripts/engine/assets.js')));
useDatabase(await import('./lib/stage.mjs').then((m) => m.database(dbs)));
const { build } = await import(toUrl(join(REPO, 'scripts/engine/render.js')));
const { needsPlace } = await import(toUrl(join(REPO, 'scripts/core/corpus.js')));
const { withDefaults } = await import(toUrl(join(REPO, 'scripts/core/fx.js')));

const T = table();
const known = new Set(recipes.frozen?.meta?.missingFiles ?? []); // files AA's table names that this JB2A build lacks: silent under AA too
const sets = file ? [['file', readFxFile(file)]] : [['stock', recipes.stock], ['house', recipes.house]];

/** the moment an FX is built against: everything its place words could ask for */
function momentFor(fx) {
  const scenes = (fx.scenes ?? []).map(withDefaults);
  const hasMove = scenes.some((s) => s.shape === 'move');
  const place = needsPlace(fx) ? T.regions.circle : undefined;
  return {
    when: fx.on ?? 'use', kind: 'use', subject: { name: fx.id, keys: fx.for ?? [], reach: false },
    source: T.caster, targets: [{ token: T.near, hit: true }, { token: T.far, hit: true }],
    place, tie: place ?? { uuid: `check.${fx.id}.tie` }, origin: `check.${fx.id}`, id: `check-${fx.id}`, activity: null, flags: {},
    destination: hasMove ? { x: 860, y: 840 } : undefined, noMove: true,
  };
}

const problems = [];
const counts = { fx: 0, off: 0, built: 0, sections: 0, files: 0, sounds: 0, missing: 0, knownMissing: 0, byShape: {} };
for (const [source, list] of sets) {
  for (const fx of list) {
    counts.fx++;
    if (fx.off) { counts.off++; continue; }
    const where = `${source} "${fx.id}"`;
    for (const s of fx.scenes ?? []) counts.byShape[s.shape] = (counts.byShape[s.shape] ?? 0) + 1;
    standing.length = 0;
    let r;
    try { r = build(fx, momentFor(fx)); } catch (e) { problems.push(`${where}: the build threw — ${e.message}`); continue; }
    const { seq, ctx } = r;
    if (show && fx.id === show) {
      console.log(`\n${where}: ${seq ? sections(seq).length : 0} section(s)`);
      for (const s of sections(seq)) console.log(`  ${s.kind}${s.calls.length ? ': ' + s.calls.map(([m, a]) => `${m}(${a.map((x) => (x?._isToken ? x.id : x?._isRegion ? `Region ${x.id}` : JSON.stringify(x))).join(', ')})`).join(' ') : ''}`);
      if (ctx.missing.length) console.log(`  missing: ${ctx.missing.join('; ')}`);
      if (ctx.notes.length) console.log(`  notes: ${ctx.notes.join('; ')}`);
    }
    for (const m of ctx.missing) {
      const raw = /modules\/\S+/.exec(m)?.[0];
      if (raw && (known.has(raw) || raw.endsWith('Map.png'))) { counts.knownMissing++; continue; }
      counts.missing++; problems.push(`${where}: ${m}`);
    }
    if (!seq) { problems.push(`${where}: built nothing — ${ctx.waiting?.why ?? ctx.refused ?? (ctx.notes.join('; ') || 'no pictures and no sounds for a moment with targets, a template and a destination')}`); continue; }
    counts.built++;
    counts.sections += sections(seq).length;
    counts.files += ctx.files.length;
    counts.sounds += ctx.sounds.length;
  }
}
const shapes = Object.entries(counts.byShape).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
console.log(`check-build: ${counts.fx} fx (${counts.off} off) · ${counts.built} build to ${counts.sections} sections naming ${counts.files} files and ${counts.sounds} sounds · missing ${counts.missing} (known since AA ${counts.knownMissing}) · scenes by shape: ${shapes}`);
if (!quiet || problems.length) for (const p of problems) console.log('  ✗ ' + p);
if (problems.length) { console.log(`FAIL: ${problems.length} problem(s)`); process.exitCode = 1; } else console.log(`PASS: every FX builds`);
