// Play a look on the sandbox fixture so a person or an assistant can see it before proposing it.
// Live: builds the fixture (a caster, a target six squares away), plays the look once through the
// API's preview (never saved), reports what played from the ledger, tears the fixture down.
//
//   node tools/preview.mjs fire-bolt                 # a look by id, from the recipes as deployed
//   node tools/preview.mjs my-look.json              # a look file (one look, a list, or {looks: [...]})
//   node tools/preview.mjs my-look.json --template   # with a circle placed on the target (an area look)
//   node tools/preview.mjs … --watch 6000            # keep the fixture up that long after playing, to look
import { existsSync } from 'node:fs';
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp } from './lib/suite.mjs';
import { readLookFile } from './lib/recipes.mjs';

const args = process.argv.slice(2);
const what = args.find((a) => !a.startsWith('--'));
if (!what) { console.error('usage: node tools/preview.mjs <look id | look file> [--template] [--watch ms]'); process.exit(2); }
const watch = args.includes('--watch') ? Number(args[args.indexOf('--watch') + 1]) || 6000 : 2500;
const withTemplate = args.includes('--template');
const looks = existsSync(what) ? readLookFile(what) : null;

const { f, dispose } = await connectSandbox({ tag: 'preview', watchdogMs: 300_000 });
let fixture = null;
const since = Date.now();
try {
  fixture = await f.evaluate(fixtureUp, { items: [] });
  const out = await f.evaluate(async ({ id, looks, withTemplate, casterTokenId, targetTokenId, watch }) => {
    const api = game.modules.get('fvtt-mod-fxstudio').api;
    const caster = canvas.tokens.get(casterTokenId);
    const target = canvas.tokens.get(targetTokenId);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const results = [];
    let region = null;
    if (withTemplate) {
      const [doc] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'circle', distance: 20, x: 1100, y: 500 }]);
      await sleep(500);
      region = canvas.scene.regions.get(doc.id) ?? doc;
    }
    const list = looks ?? [id].map((x) => api.looks.get(x)?.original ?? api.looks.get(x)?.look).filter(Boolean);
    if (!list.length) return { error: `no look "${id}" in the corpus` };
    for (const look of list) {
      const problems = api.looks.validate(look);
      if (problems.length) { results.push({ id: look.id, problems }); continue; }
      const r = await api.preview(look, { source: caster, targets: [target], place: region, destination: { x: 850, y: 850 } });
      results.push({ id: look.id, sentence: r.sentence, entry: r.entry && { played: r.entry.played, files: r.entry.files, sounds: r.entry.sounds, missing: r.entry.missing, why: r.entry.why }, problems: r.problems ?? [] });
      await sleep(watch);
    }
    if (region && canvas.scene.regions.get(region.id)) await canvas.scene.deleteEmbeddedDocuments('Region', [region.id]);
    return { results };
  }, { id: what, looks, withTemplate, casterTokenId: fixture.casterTokenId, targetTokenId: fixture.targetTokenId, watch });
  if (out.error) { console.error(out.error); process.exitCode = 1; }
  for (const r of out.results ?? []) {
    console.log(`\n${r.id}`);
    if (r.problems?.length) { for (const p of r.problems) console.log(`  ✗ ${p}`); process.exitCode = 1; continue; }
    console.log(`  ${r.sentence}`);
    console.log(`  ${r.entry?.played ? 'played' : `not played (${r.entry?.why})`}: ${(r.entry?.files ?? []).join(', ')}${r.entry?.sounds?.length ? ' + ' + r.entry.sounds.join(', ') : ''}`);
    for (const m of r.entry?.missing ?? []) console.log(`  ✗ missing: ${m}`);
  }
} finally {
  if (fixture) await f.evaluate(fixtureDown, { ...fixture, since }).catch(() => null);
  await dispose();
}
