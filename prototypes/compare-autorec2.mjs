import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const db = new ClassicLevel(`${S}/db/settings`, { readOnly: true });
await db.open();
const settings = {};
for await (const [k, v] of db.iterator()) { const d = JSON.parse(v); settings[d.key] = d.value; }
await db.close();
const parse = (s) => { try { return JSON.parse(s); } catch { return s; } };
const mod = JSON.parse(readFileSync('C:/Users/sippelmc/AppData/Local/FoundryVTT/Data/modules/dnd5e-animations/module/autorec.json', 'utf8'));
const MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];
function flatten(o, p = '', out = {}) { if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flatten(v, p ? p + '.' + k : k, out); else out[p] = o; return out; }
const diffKeys = (a, b) => { const fa = flatten(a), fb = flatten(b); const ks = new Set([...Object.keys(fa), ...Object.keys(fb)]); return [...ks].filter(k => k !== 'id' && JSON.stringify(fa[k]) !== JSON.stringify(fb[k])); };
const desc = (e) => (e.primary?.video?.enableCustom ? e.primary.video.customPath : [e.primary?.video?.dbSection, e.primary?.video?.menuType, e.primary?.video?.animation, e.primary?.video?.variant, e.primary?.video?.color].join('/')) + '  sound=' + (e.primary?.sound?.enable ? e.primary.sound.file : '-') + (e.macro?.enable ? '  MACRO' : '') + (e.secondary?.enable ? '  +secondary' : '') + (e.source?.enable ? '  +source' : '') + (e.target?.enable ? '  +target' : '');
let idMatch = 0;
for (const m of MENUS) {
  const world = parse(settings['autoanimations.aaAutorec-' + m] ?? '[]') || [];
  const modArr = mod[m] ?? [];
  const modIds = new Set(modArr.map(e => e.id)); idMatch += world.filter(e => modIds.has(e.id)).length;
  const key = (e) => (e.label ?? '').toLowerCase();
  const byLabel = new Map(); for (const e of modArr) { const k = key(e); if (!byLabel.has(k)) byLabel.set(k, []); byLabel.get(k).push(e); }
  const worldLabels = new Map(); for (const e of world) { const k = key(e); if (!worldLabels.has(k)) worldLabels.set(k, []); worldLabels.get(k).push(e); }
  const userMade = [], modified = [], removed = [];
  for (const [k, ws] of worldLabels) {
    const ms = byLabel.get(k) ?? [];
    ws.forEach((w, i) => { const r = ms[i]; if (!r) { userMade.push(w); return; } const d = diffKeys(w, r); if (d.length) modified.push([w, r, d]); });
  }
  for (const [k, ms] of byLabel) { const ws = worldLabels.get(k) ?? []; for (let i = ws.length; i < ms.length; i++) removed.push(ms[i]); }
  console.log(`\n## ${m}: world=${world.length} module=${modArr.length}  user-made=${userMade.length}  modified=${modified.length}  removed=${removed.length}`);
  for (const e of userMade) console.log(`  + ${e.label}  ->  ${desc(e)}`);
  for (const [w, r, d] of modified) console.log(`  ~ ${w.label}: ` + d.slice(0, 10).map(k => `${k} ${JSON.stringify(flatten(r)[k])}→${JSON.stringify(flatten(w)[k])}`).join('; '));
  for (const e of removed) console.log(`  - ${e.label}`);
}
console.log('\nid matches world↔module:', idMatch);
// menu feature usage census across the world's autorec
const feat = { macro: 0, secondary: 0, source: 0, target: 0, custom: 0, soundOnly: 0, sound: 0, soundRawPath: 0, persistent: 0 };
let n = 0; const menuTypes = {};
for (const m of MENUS) for (const e of (parse(settings['autoanimations.aaAutorec-' + m] ?? '[]') || [])) {
  n++; if (e.macro?.enable) feat.macro++; if (e.secondary?.enable) feat.secondary++; if (e.source?.enable) feat.source++; if (e.target?.enable) feat.target++;
  if (e.primary?.video?.enableCustom) feat.custom++; if (e.soundOnly?.sound?.enable) feat.soundOnly++; if (e.primary?.sound?.enable) { feat.sound++; if (/^modules\//.test(e.primary.sound.file)) feat.soundRawPath++; }
  if (e.primary?.options?.persistent) feat.persistent++;
  const mt = m + '/' + (e.primary?.video?.menuType ?? e.presetType ?? '?'); menuTypes[mt] = (menuTypes[mt] ?? 0) + 1;
}
console.log('\nFEATURE USE across', n, 'entries:', JSON.stringify(feat));
console.log('menu/menuType census:', JSON.stringify(menuTypes));
// preset entries: what presets are used
const presets = parse(settings['autoanimations.aaAutorec-preset'] ?? '[]') || [];
console.log('\nPRESET entries:'); for (const e of presets) console.log('  ' + e.label + ' -> ' + e.presetType);
