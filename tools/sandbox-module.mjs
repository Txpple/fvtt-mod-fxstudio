// Switch a module on or off in the LOCAL sandbox world, offline: writes core.moduleConfiguration
// straight into the world's settings LevelDB while the sandbox is DOWN. Local only — prod's
// module configuration is changed through Foundry's own screens on the user's word, never here.
//
//   node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop
//   node tools/sandbox-module.mjs --enable fvtt-mod-fxstudio [--disable autoanimations,dnd5e-animations]
//   node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs start
//
// Foundry scans Data/modules at PROCESS boot, so a module deployed for the first time registers
// on the next start; this write makes it active in the world on that same start.
import { existsSync } from 'node:fs';
import { classicLevel, worldDb } from './lib/env.mjs';

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : null; };
const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
const enable = list(arg('enable'));
const disable = list(arg('disable'));
if (!enable.length && !disable.length) { console.error('usage: node tools/sandbox-module.mjs --enable a,b --disable c,d   (sandbox stopped)'); process.exit(2); }

const dir = worldDb('settings');
const ClassicLevel = classicLevel();
const db = new ClassicLevel(dir);
try {
  await db.open();
} catch (e) {
  console.error(`cannot open ${dir} for writing (${e.code ?? e.message}); is the sandbox stopped?`);
  process.exit(1);
}
let key = null, doc = null;
for await (const [k, v] of db.iterator()) { const d = JSON.parse(v); if (d.key === 'core.moduleConfiguration') { key = k; doc = d; break; } }
if (!doc) { console.error('core.moduleConfiguration not found'); await db.close(); process.exit(1); }
const before = JSON.parse(doc.value);
const next = { ...before };
for (const id of enable) { if (!existsSync(`${worldDb('').replace(/\/worlds\/.*$/, '')}/modules/${id}/module.json`)) console.warn(`  ⚠ ${id} is not deployed under Data/modules; it will not register`); next[id] = true; }
for (const id of disable) next[id] = false;
const changes = [...enable, ...disable].filter((id) => before[id] !== next[id]).map((id) => `${id}: ${before[id]} -> ${next[id]}`);
if (!changes.length) console.log('nothing to change');
else {
  doc.value = JSON.stringify(next);
  await db.put(key, JSON.stringify(doc));
  console.log('wrote core.moduleConfiguration: ' + changes.join(', '));
}
await db.close();
