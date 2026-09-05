import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const db = new ClassicLevel(`${S}/db/settings`, { readOnly: true }); await db.open();
const settings = {}; for await (const [k, v] of db.iterator()) { const d = JSON.parse(v); settings[d.key] = d.value; } await db.close();
const MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];
const raw = {}; for (const m of MENUS) raw[m] = settings['autoanimations.aaAutorec-' + m] ?? '[]';
// parse cost (what every client pays at load)
let t = performance.now(); const menus = {}; for (const m of MENUS) menus[m] = JSON.parse(raw[m]); const parseMs = performance.now() - t;
// AA's per-use path: 7 settings reads (cached objects), combine, sort by label length, exact/best split, substring scan
const rinse = (s) => (s ?? '').replace(/\s+/g, '').toLowerCase();
function aaLookup(name) {
  let combined = []; for (const m of MENUS) combined = [...combined, ...menus[m]];
  const sorted = combined.sort((a, b) => rinse(b.label).length - rinse(a.label).length);
  const exact = sorted.filter(x => x.advanced?.exactMatch), best = sorted.filter(x => !x.advanced?.exactMatch);
  const r = rinse(name);
  return exact.find(x => x.label === name) || best.find(x => x.label && r.includes(rinse(x.label))) || false;
}
const names = ['Fire Bolt', 'Longsword +1', 'Bless', 'Use', 'Riposte', 'Hunter\'s Mark', 'Torch', 'Divine Smite', 'Cast (free casting)', 'Goldthorn'];
t = performance.now(); let hits = 0; for (let i = 0; i < 200; i++) for (const n of names) if (aaLookup(n)) hits++; const aaMs = (performance.now() - t) / 2000;
// recipe path: one Map keyed by exact rinsed name, plus a short "contains" list for generic nouns
const rows = JSON.parse(readFileSync(`${S}/fx-recipes.json`, 'utf8'));
const exactMap = new Map(); const contains = [];
for (const r of rows) { if (r.match === 'contains') contains.push([rinse(r.name), r]); else exactMap.set(rinse(r.name), r); }
contains.sort((a, b) => b[0].length - a[0].length);
function recipeLookup(name) { const r = rinse(name); return exactMap.get(r) || contains.find(([k]) => r.includes(k))?.[1] || false; }
t = performance.now(); let hits2 = 0; for (let i = 0; i < 200; i++) for (const n of names) if (recipeLookup(n)) hits2++; const rMs = (performance.now() - t) / 2000;
console.log(`world-setting JSON parse (per client, at load): ${parseMs.toFixed(1)} ms for ${(Object.values(raw).join('').length / 1024).toFixed(0)} KB`);
console.log(`AA lookup per item use: ${(aaMs * 1000).toFixed(0)} µs  (${hits} hits/2000)`);
console.log(`recipe lookup per item use: ${(rMs * 1000).toFixed(1)} µs  (${hits2} hits/2000)   contains-list size=${contains.length}, exact-map size=${exactMap.size}`);
console.log('what each name resolves to (AA → recipe):');
for (const n of names) { const a = aaLookup(n), r = recipeLookup(n); console.log(`  ${n.padEnd(22)} AA: ${a ? a.label : '-'}   recipe: ${r ? r.name : '-'}`); }
