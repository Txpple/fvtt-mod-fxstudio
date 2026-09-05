import { createRequire } from 'node:module';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const mode = process.argv[3] ?? 'settings';
async function dump(name) {
  const db = new ClassicLevel(`${S}/db/${name}`, { readOnly: true });
  await db.open();
  const out = [];
  for await (const [k, v] of db.iterator()) out.push([k, v]);
  await db.close();
  return out;
}
const hasAA = (o) => o?.flags?.autoanimations && Object.keys(o.flags.autoanimations).length;
if (mode === 'settings') {
  const rows = await dump('settings');
  const keys = rows.map(([k, v]) => { const d = JSON.parse(v); return [d.key, (d.value ?? '').length]; });
  console.log('SETTING KEYS (' + keys.length + '):');
  for (const [k, n] of keys) console.log('  ' + k + '  [' + n + ']');
  for (const [k, v] of rows) {
    const d = JSON.parse(v);
    if (/autoanimations|dnd5e-animations|sequencer|psfx|moduleConfiguration/.test(d.key)) {
      let val; try { val = JSON.parse(d.value); } catch { val = d.value; }
      console.log('\n=== ' + d.key);
      if (d.key === 'core.moduleConfiguration') console.log(JSON.stringify(val));
      else if (typeof val === 'object' && val) {
        for (const [mk, mv] of Object.entries(val)) {
          if (Array.isArray(mv)) console.log('  ' + mk + ': array[' + mv.length + ']');
          else if (typeof mv === 'object' && mv) console.log('  ' + mk + ': object{' + Object.keys(mv).length + '}');
          else console.log('  ' + mk + ': ' + JSON.stringify(mv));
        }
      } else console.log('  ' + JSON.stringify(val).slice(0, 300));
    }
  }
} else if (mode === 'items') {
  const actors = await dump('actors');
  const actorName = {};
  const items = [];
  for (const [k, v] of actors) {
    if (k.startsWith('!actors!')) { const a = JSON.parse(v); actorName[a._id] = a.name + ' (' + a.type + ')'; }
    else if (k.startsWith('!actors.items!')) { const it = JSON.parse(v); items.push([k.split('!')[2].split('.')[0], it]); }
  }
  const world = (await dump('items')).filter(([k]) => k.startsWith('!items!')).map(([k, v]) => ['(world)', JSON.parse(v)]);
  const all = [...items, ...world];
  const withAA = all.filter(([, it]) => hasAA(it));
  console.log('embedded items: ' + items.length + '  world items: ' + world.length + '  with flags.autoanimations: ' + withAA.length);
  const byType = {}; for (const [, it] of withAA) byType[it.type] = (byType[it.type] ?? 0) + 1; console.log('by type: ' + JSON.stringify(byType));
  const byActor = {}; for (const [a] of withAA) { const n = actorName[a] ?? a; byActor[n] = (byActor[n] ?? 0) + 1; }
  console.log('by actor:'); for (const [n, c] of Object.entries(byActor).sort((x, y) => y[1] - x[1])) console.log('  ' + c + '  ' + n);
  console.log('\nSAMPLE flag shapes:');
  const seen = new Set();
  for (const [a, it] of withAA) {
    const f = it.flags.autoanimations;
    const sig = Object.keys(f).sort().join(',');
    if (seen.has(sig)) continue; seen.add(sig);
    console.log('\n-- ' + (actorName[a] ?? a) + ' / ' + it.name + ' [' + it.type + ']');
    console.log(JSON.stringify(f).slice(0, 1200));
  }
  // also: the distinct AA "isEnabled"/"isCustomized"/menu values
  const menus = {}; for (const [, it] of withAA) { const f = it.flags.autoanimations; const m = (f.menu ?? f.animType ?? f.presetType ?? '?') + '/' + (f.isEnabled ?? '?') + '/' + (f.isCustomized ?? f.override ?? '?'); menus[m] = (menus[m] ?? 0) + 1; }
  console.log('\nmenu/isEnabled/isCustomized: ' + JSON.stringify(menus));
  // full list of customized ones
  console.log('\nCUSTOMIZED (isCustomized true) items:');
  for (const [a, it] of withAA) { const f = it.flags.autoanimations; if (f.isCustomized) console.log('  ' + (actorName[a] ?? a) + ' / ' + it.name + ' -> ' + (f.menu ?? '?') + ' ' + JSON.stringify(f.primary?.video ?? f.macro ?? '').slice(0, 160)); }
} else if (mode === 'macros') {
  const rows = await dump('macros');
  for (const [k, v] of rows) { if (!k.startsWith('!macros!')) continue; const m = JSON.parse(v); if (/Sequence|autoanimations|AutomatedAnimations|jb2a|psfx/i.test(m.command ?? '')) console.log('-- ' + m.name + ' [' + m.type + '] ' + (m.command ?? '').length + ' chars'); }
}
