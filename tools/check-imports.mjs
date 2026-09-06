// Every module under scripts/ loads in plain node with Foundry's globals stubbed, so a misspelt
// import, a missing export or a syntax error is caught here in a second rather than at the table.
// Read-only; no Foundry.
//   node tools/check-imports.mjs
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, toUrl } from './lib/env.mjs';

globalThis.Hooks = { once() {}, on() {}, callAll() {} };
globalThis.game = { settings: { get() {}, register() {}, registerMenu() {} }, modules: { get: () => ({}) }, user: {}, users: [] };
globalThis.foundry = { applications: { api: { ApplicationV2: class { constructor() {} render() {} }, DialogV2: { confirm: async () => false } } } };
globalThis.Sequencer = { Database: { entryExists: () => false, getPathsUnder: () => [], getEntry: () => null }, EffectManager: { getEffects: () => [] } };
globalThis.Item = class {};
globalThis.CONFIG = { DND5E: {} };

const files = [];
const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) files.push(p); } };
walk(join(REPO, 'scripts'));
let failed = 0;
for (const f of files) {
  try { await import(toUrl(f)); console.log(`  ✓ ${f.slice(REPO.length + 1)}`); }
  catch (e) { failed++; console.log(`  ✗ ${f.slice(REPO.length + 1)}: ${e.message}`); }
}
console.log(failed ? `FAIL: ${failed}` : `PASS: ${files.length} modules load`);
process.exitCode = failed ? 1 : 0;
