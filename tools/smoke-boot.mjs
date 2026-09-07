// Read-only boot check on the sandbox: connects as "Tester Assistant", asks the world what the
// module loaded (the corpora, the index, the starters, the frozen table in Sequencer), resolves a
// few subjects through the live API and compares with the recipes on disk. Disconnect the MCP
// bridge first.
//   node tools/smoke-boot.mjs
import { connectSandbox } from './lib/foundry.mjs';
import { indexRecipes, readRecipes } from './lib/recipes.mjs';
import { resolve } from '../scripts/core/corpus.js';

const recipes = readRecipes();
const offline = indexRecipes(recipes);
const { f, dispose } = await connectSandbox({ tag: 'boot' });
try {
  const live = await f.evaluate(() => {
    const api = game.modules.get('fvtt-mod-fxstudio')?.api;
    if (!api) return { error: 'the module has no api: did it load?' };
    const probe = (keys, on = 'use') => { const r = api.resolve({ keys }, on); return r.fx ? `${r.fx.id} (${r.source}, ${r.key})` : null; };
    return {
      counts: api.index.counts,
      problems: api.index.problems,
      starters: api.fx.starters().length,
      frozen: Sequencer.Database.entryExists('fxstudio.aa') ? Sequencer.Database.getPathsUnder('fxstudio.aa').length : 0,
      probes: {
        fireBolt: probe(['spell:fire-bolt/attack', 'spell:fire-bolt']),
        maulOfMomentum: probe(['weapon:maul-of-momentum', 'weapon:maul']),
        shieldSpell: probe(['spell:shield/utility', 'spell:shield']),
        shieldEffect: probe(['effect:shield', 'spell:shield'], 'effect'),
        bite: probe(['natural:bite/attack', 'natural:bite']),
        sentence: api.fx.sentence(api.fx.get('fire-bolt')?.fx),
      },
      version: game.modules.get('fvtt-mod-fxstudio').version,
    };
  }, null);
  if (live.error) { console.error(live.error); process.exitCode = 1; }
  else {
    console.log(`[boot] FX Studio ${live.version}: ${JSON.stringify(live.counts)} · starters ${live.starters} · frozen table sections ${live.frozen} · index problems ${live.problems.length}`);
    for (const p of live.problems) console.log(`  ✗ ${p}`);
    const same = (keys, on, name) => { const r = resolve(offline, keys, on); const want = r.fx ? `${r.fx.id} (${r.source}, ${r.key})` : null; return want === live.probes[name]; };
    const checks = [
      ['Fire Bolt resolves the same live and offline', same(['spell:fire-bolt/attack', 'spell:fire-bolt'], 'use', 'fireBolt'), live.probes.fireBolt],
      ['Maul of Momentum plays the maul fx by its base weapon', /^maul \(/.test(live.probes.maulOfMomentum ?? ''), live.probes.maulOfMomentum],
      ['the Shield spell plays nothing', live.probes.shieldSpell === null, String(live.probes.shieldSpell)],
      ['the Shield effect plays the shield fx', /^shield \(/.test(live.probes.shieldEffect ?? ''), live.probes.shieldEffect],
      ['a Bite plays the bite fx', /\(stock, natural:bite\)/.test(live.probes.bite ?? ''), live.probes.bite],
      ['the stock count matches the recipes', live.counts.stock === recipes.stock.length, `${live.counts.stock} vs ${recipes.stock.length}`],
      ['no index problems', live.problems.length === 0, `${live.problems.length}`],
    ];
    let failed = 0;
    for (const [name, pass, detail] of checks) { if (!pass) failed++; console.log(`  ${pass ? '✓' : '✗'} ${name} — ${detail}`); }
    console.log(`  · ${live.probes.sentence}`);
    console.log(failed ? `FAIL: ${failed}` : 'PASS');
    process.exitCode = failed ? 1 : 0;
  }
} finally {
  await dispose();
}
