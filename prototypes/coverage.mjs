import { createRequire } from 'node:module';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
async function dump(name) { const db = new ClassicLevel(`${S}/db/${name}`, { readOnly: true }); await db.open(); const out = []; for await (const [k, v] of db.iterator()) out.push([k, v]); await db.close(); return out; }
const settings = {}; for (const [k, v] of await dump('settings')) { const d = JSON.parse(v); settings[d.key] = d.value; }
const MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];
const menus = {}; for (const m of MENUS) menus[m] = JSON.parse(settings['autoanimations.aaAutorec-' + m] ?? '[]');
const rinse = (s) => (s ?? '').replace(/\s+/g, '').toLowerCase();
const all = MENUS.flatMap(m => menus[m].map(e => ({ ...e, _menu: m }))).sort((a, b) => rinse(b.label).length - rinse(a.label).length);
const exact = all.filter(x => x.advanced?.exactMatch), best = all.filter(x => !x.advanced?.exactMatch);
function search(trueName) { const r = rinse(trueName); return exact.find(x => x.label && x.label === trueName) || best.find(x => x.label && r.includes(rinse(x.label)) && !(x.advanced?.excludedTerms?.length && x.advanced.excludedTerms.some(t => r.includes(rinse(t))))) || false; }
const actors = await dump('actors');
const actorDocs = {}; const items = {};
for (const [k, v] of actors) { if (k.startsWith('!actors!')) { const a = JSON.parse(v); actorDocs[a._id] = a; } else if (k.startsWith('!actors.items!')) { const aid = k.split('!')[2].split('.')[0]; (items[aid] ??= []).push(JSON.parse(v)); } }
const TYPES = new Set(['weapon', 'spell', 'feat', 'consumable']);
const PCS = Object.values(actorDocs).filter(a => a.type === 'character' && !/BF Test|Test/.test(a.name));
let totals = { items: 0, byFlag: 0, byActivity: 0, byName: 0, none: 0 };
const unmatched = {};
for (const a of PCS) {
  const its = (items[a._id] ?? []).filter(i => TYPES.has(i.type) && Object.keys(i.system?.activities ?? {}).length);
  const counts = { items: its.length, byFlag: 0, byActivity: 0, byName: 0, none: 0 }; const miss = [];
  for (const i of its) {
    const f = i.flags?.autoanimations; if (f?.isEnabled && f?.isCustomized) { counts.byFlag++; continue; }
    if (f && f.isEnabled === false) { counts.none++; miss.push(i.name + ' (disabled)'); continue; }
    const acts = Object.values(i.system.activities ?? {});
    const actNames = acts.map(x => x.name).filter(n => n && !['heal', 'summon'].includes(n.trim()));
    let hit = actNames.map(n => search(n)).find(Boolean);
    if (hit) { counts.byActivity++; continue; }
    hit = search(i.name);
    if (hit) { counts.byName++; continue; }
    counts.none++; miss.push(i.name + ' [' + i.type + (acts[0]?.type ? '/' + acts.map(x => x.type).join('+') : '') + ']');
  }
  for (const k of Object.keys(totals)) totals[k] += counts[k];
  console.log(`\n## ${a.name}: items-with-activities=${counts.items}  item-flag=${counts.byFlag}  autorec-by-activity-name=${counts.byActivity}  autorec-by-item-name=${counts.byName}  NO ANIMATION=${counts.none}`);
  console.log('   none: ' + miss.join('; '));
}
console.log('\nTOTAL PCs: ' + JSON.stringify(totals));
// what do the Battle Flow list settings name, and which of those names have an autorec entry?
const lists = ['interruptList', 'maneuverFolds', 'd20Folds', 'riderList', 'blockList'];
for (const l of lists) { const v = settings['fvtt-mod-battleflow.' + l]; if (!v) continue; const names = JSON.parse(v).split(',').map(s => s.trim().split(':')[0]).filter(Boolean); console.log(`\n${l}: ` + names.map(n => n + (search(n) ? ' ✓' : ' ✗')).join(', ')); }
// activity-name overrides that hit something DIFFERENT from the item name (AA's override rule)
console.log('\nACTIVITY-NAME OVERRIDES that change the pick (PCs):');
for (const a of PCS) for (const i of (items[a._id] ?? [])) { if (!TYPES.has(i.type)) continue; for (const act of Object.values(i.system?.activities ?? {})) { if (!act.name || ['heal','summon'].includes(act.name.trim())) continue; const h1 = search(act.name), h2 = search(i.name); if (h1 && h2 && h1.label !== h2.label) console.log(`  ${a.name} / ${i.name} :: activity "${act.name}" -> "${h1.label}" [${h1._menu}] instead of "${h2.label}" [${h2._menu}]`); else if (h1 && !h2) console.log(`  ${a.name} / ${i.name} :: activity "${act.name}" -> "${h1.label}" [${h1._menu}] (item name matches nothing)`); } }
