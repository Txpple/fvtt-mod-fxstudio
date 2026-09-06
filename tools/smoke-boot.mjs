// Does the module boot on the sandbox? Read-only: connects, asks the running world what it loaded,
// resolves a handful of baseline rows through the live resolver and through Sequencer's database,
// and compares them with the recipes on disk. Touches nothing.
//
//   node tools/smoke-boot.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES } from './lib/env.mjs';
import { connectSandbox } from './lib/foundry.mjs';

const baseline = JSON.parse(readFileSync(join(RECIPES, 'baseline.json'), 'utf8'));
const house = JSON.parse(readFileSync(join(RECIPES, 'house.json'), 'utf8'));
const SAMPLE = ['Fire Bolt', 'Longsword', 'Fireball', 'Misty Step', 'Shield', 'Claw', 'Sorcerous Burst', 'Sharran Step'];
const failures = [];
const ok = (cond, what) => { if (cond) console.log(`  ✓ ${what}`); else { console.log(`  ✗ ${what}`); failures.push(what); } };

const { f, dispose } = await connectSandbox({ tag: 'boot' });
try {
  const r = await f.evaluate((names) => {
    const m = game.modules.get('fvtt-mod-fxstudio');
    const api = m?.api;
    const out = { active: !!m?.active, version: m?.version, api: !!api, sequencer: !!globalThis.Sequencer };
    if (!api) return out;
    out.baseline = api.baseline?.rows?.length;
    out.house = api.house?.rows?.length;
    out.setting = Array.isArray(game.settings.get('fvtt-mod-fxstudio', 'looks'));
    out.twinRegistered = Sequencer.Database.entryExists('fxstudio.aa.range');
    out.lookups = {};
    for (const n of names) {
      const hit = api.lookup(n);
      const row = hit?.row;
      const layer = row?.fx?.[0];
      const aa = layer?.aa ?? layer?.data?.projectile?.aa ?? layer?.data?.start?.aa;
      // a layer plays through the private table, or through its custom path when AA had one
      const path = aa ? aa.replace(/^autoanimations\./, 'fxstudio.aa.') : (layer?.file ?? null);
      let files = null;
      if (path && Sequencer.Database.entryExists(path)) {
        const e = Sequencer.Database.getEntry(path);
        const list = Array.isArray(e) ? e : [e];
        files = list.flatMap((x) => (x.getAllFiles ? x.getAllFiles() : [])).sort();
      }
      out.lookups[n] = hit ? { name: row.name, menu: row.menu, source: hit.source, path, files: files?.length ?? null, template: path ? Sequencer.Database.getEntry(path)?.template ?? null : null } : null;
    }
    return out;
  }, SAMPLE);
  console.log(`module ${r.version} active=${r.active} api=${r.api} sequencer=${r.sequencer}`);
  ok(r.active && r.api, 'module active with its api');
  ok(r.baseline === baseline.rows.length, `baseline rows loaded: ${r.baseline} (disk ${baseline.rows.length})`);
  ok(r.house === house.rows.length, `house rows loaded: ${r.house} (disk ${house.rows.length})`);
  ok(r.setting, 'the looks setting registered as an array');
  ok(r.twinRegistered, 'fxstudio.aa registered with Sequencer');
  for (const n of SAMPLE) {
    const l = r.lookups?.[n];
    if (n === 'Sharran Step') { ok(l === null, `"${n}" resolves to nothing (no row yet)`); continue; }
    ok(l && l.files > 0, `"${n}" → ${l ? `"${l.name}" [${l.menu}] from ${l.source}, ${l.path} = ${l.files} file(s), template ${JSON.stringify(l.template)}` : 'nothing'}`);
  }
  ok(r.lookups?.['Sorcerous Burst']?.source === 'house', 'Sorcerous Burst comes from the house layer');
} finally {
  await dispose();
}
console.log(failures.length ? `FAIL: ${failures.length}` : 'PASS');
process.exitCode = failures.length ? 1 : 0;
