import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2]; const DATA = 'C:/Users/sippelmc/AppData/Local/FoundryVTT/Data';
const db = new ClassicLevel(`${S}/db/settings`, { readOnly: true }); await db.open();
const settings = {}; for await (const [k, v] of db.iterator()) { const d = JSON.parse(v); settings[d.key] = d.value; } await db.close();
const MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];
const menus = {}; for (const m of MENUS) menus[m] = JSON.parse(settings['autoanimations.aaAutorec-' + m] ?? '[]');
const j = await import(`file:///${S}/jb2a_db.mjs`); await j.jb2aPatreonDatabase('modules'); const jb = j.patreonDatabase;
const p = await import(`file:///${S}/psfx_db.mjs`); await p.registerPSFXDatabase('modules/psfx'); const ps = p.psfxDatabase;
const a = await import(`file:///${S}/aa_db.mjs`); await a.initializeJB2APatreonDB('modules/jb2a_patreon'); const aa = a.JB2APATREONDB;
const merge = (t, s) => { for (const [k, v] of Object.entries(s)) { if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) merge(t[k], v); else t[k] = v; } };
for (const v of ['047', '048', '049', '050', '051', '052', '053', '054']) { const m = await import(`file:///${S}/aa_${v}.mjs`); const fn = m['db' + v]; merge(aa, await fn('modules/jb2a_patreon')); }
const leaves = (dbo, root) => { const out = new Map(); const walk = (o, pre) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; const q = pre + '.' + k; if (Array.isArray(v)) out.set(q, v); else if (typeof v === 'string') out.set(q, [v]); else if (v && typeof v === 'object') walk(v, q); } }; walk(dbo, root); return out; };
const jbLeaves = leaves(jb, 'jb2a'), psLeaves = leaves(ps, 'psfx'), aaLeaves = leaves(aa, 'autoanimations');
console.log(`jb2a leaves=${jbLeaves.size}  psfx leaves=${psLeaves.size}  autoanimations (base + 8 merges) leaves=${aaLeaves.size}`);
console.log('jb2a sample file:', [...jbLeaves.values()][0][0]);
const fileToJb = new Map(); for (const [path, files] of jbLeaves) for (const f of files) fileToJb.set(f, path);
const nodeSet = (m) => { const s = new Set(); for (const k of m.keys()) { const parts = k.split('.'); for (let i = 1; i <= parts.length; i++) s.add(parts.slice(0, i).join('.')); } return s; };
const jbNodes = nodeSet(jbLeaves), psNodes = nodeSet(psLeaves), aaNodes = nodeSet(aaLeaves);
const isLeaf = (path) => jbLeaves.has(path) || psLeaves.has(path) || aaLeaves.has(path);
const dbPathOk = (path) => { if (jbNodes.has(path) || psNodes.has(path) || aaNodes.has(path)) return true; const m = /^(.*)\.(\d+)$/.exec(path); return !!(m && isLeaf(m[1])); };
const rawOk = (path) => { if (!path) return false; if (path.includes('*')) { const dir = path.slice(0, path.lastIndexOf('/')); return existsSync(`${DATA}/${dir}`) && readdirSync(`${DATA}/${dir}`).length > 0; } return existsSync(`${DATA}/${path}`); };
const st = { entries: 0, preset: 0, videoCustom: 0, videoCustomOk: 0, videoAA: 0, videoAAOk: 0, videoAAFilesOnDisk: 0, videoAAMapsToJb2aPath: 0, sound: 0, soundDbOk: 0, soundRawOk: 0, soundBad: 0, soundPsfxBad: 0 };
const badVideo = [], badSound = [];
for (const m of MENUS) for (const e of menus[m]) {
  st.entries++;
  if (m === 'preset') st.preset++;
  else {
    const v = e.primary?.video ?? {};
    if (v.enableCustom && v.customPath) { st.videoCustom++; if (dbPathOk(v.customPath) || rawOk(v.customPath)) st.videoCustomOk++; else badVideo.push(`[${m}] ${e.label}: custom ${v.customPath}`); }
    else { st.videoAA++; const path = `autoanimations.${v.dbSection}.${v.menuType}.${v.animation}.${v.variant}${v.color === 'random' ? '' : '.' + v.color}`; if (aaNodes.has(path)) { st.videoAAOk++; const files = [...aaLeaves.entries()].filter(([k]) => k === path || k.startsWith(path + '.')).flatMap(([, f]) => f); if (files.every(f => existsSync(`${DATA}/${f}`))) st.videoAAFilesOnDisk++; if (files.length && files.every(f => fileToJb.has(f))) st.videoAAMapsToJb2aPath++; } else badVideo.push(`[${m}] ${e.label}: ${path}`); }
  }
  const s = e.primary?.sound ?? e.data?.sound; if (s?.enable && s.file) { st.sound++; if (dbPathOk(s.file)) st.soundDbOk++; else if (rawOk(s.file)) st.soundRawOk++; else { st.soundBad++; if (s.file.startsWith('psfx.')) st.soundPsfxBad++; badSound.push(`[${m}] ${e.label}: ${s.file}`); } }
}
console.log(JSON.stringify(st, null, 1));
console.log('\nUNRESOLVED VIDEO (' + badVideo.length + '):\n  ' + badVideo.slice(0, 12).join('\n  '));
console.log('\nUNRESOLVED SOUND (' + badSound.length + ', first 12):\n  ' + badSound.slice(0, 12).join('\n  '));
// stray entries in full
const rinse = (x) => (x ?? '').replace(/\s+/g, '').toLowerCase();
const all = MENUS.flatMap(m => menus[m].map(e => ({ ...e, _menu: m }))).sort((x, y) => rinse(y.label).length - rinse(x.label).length);
const search = (n) => all.find(x => x.label && rinse(n).includes(rinse(x.label)));
for (const lbl of ['U', 'Ne']) { const e = all.find(x => x.label === lbl); console.log(`\nSTRAY ENTRY "${lbl}" [${e._menu}]: ` + JSON.stringify({ video: e.primary?.video, sound: e.primary?.sound?.file, options: { persistent: e.primary?.options?.persistent, persistType: e.primary?.options?.persistType, removeTemplate: e.primary?.options?.removeTemplate, opacity: e.primary?.options?.opacity }, advanced: e.advanced, metaData: e.metaData })); }
console.log('\nDND5E FALLBACK ACTIVITY NAMES vs autorec (AA searches the activity name FIRST):');
for (const n of ['Attack', 'Damage', 'Save', 'Utility', 'Cast', 'Check', 'Enchant', 'Forward', 'Order', 'Transform']) { const h = search(n); console.log(`  ${n.padEnd(10)} -> ${h ? '"' + h.label + '" [' + h._menu + ']' : '(nothing)'}`); }
console.log('\nBATTLE FLOW LIST NAMES -> matched label:');
for (const l of ['interruptList', 'maneuverFolds', 'd20Folds']) { const names = JSON.parse(settings['fvtt-mod-battleflow.' + l]).split(',').map(s => s.trim().split(':')[0]).filter(Boolean); console.log(`  ${l}: ` + [...new Set(names)].map(n => { const h = search(n); return n + ' -> ' + (h ? '"' + h.label + '" [' + h._menu + ']' : '✗'); }).join('; ')); }
// how many labels are <= 3 chars (substring hazards)
console.log('\nSHORT LABELS (<=4 chars) in the autorec: ' + all.filter(x => rinse(x.label).length <= 4).map(x => x.label + '[' + x._menu + ']').join(', '));
