import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const db = new ClassicLevel(`${S}/db/settings`, { readOnly: true }); await db.open();
const settings = {}; for await (const [k, v] of db.iterator()) { const d = JSON.parse(v); settings[d.key] = d.value; } await db.close();
const MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];
const menus = {}; let rawBytes = 0; for (const m of MENUS) { const s = settings['autoanimations.aaAutorec-' + m] ?? '[]'; rawBytes += s.length; menus[m] = JSON.parse(s); }
// databases
const j = await import(`file:///${S}/jb2a_db.mjs`); await j.jb2aPatreonDatabase('modules'); const jb = j.patreonDatabase;
const a = await import(`file:///${S}/aa_db.mjs`); await a.initializeJB2APatreonDB('modules/jb2a_patreon'); const aa = a.JB2APATREONDB;
const merge = (t, s) => { for (const [k, v] of Object.entries(s)) { if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) merge(t[k], v); else t[k] = v; } };
for (const v of ['047', '048', '049', '050', '051', '052', '053', '054']) { const m = await import(`file:///${S}/aa_${v}.mjs`); merge(aa, await m['db' + v]('modules/jb2a_patreon')); }
const leaves = (dbo, root) => { const out = new Map(); const walk = (o, pre) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; const q = pre + '.' + k; if (Array.isArray(v)) out.set(q, v); else if (typeof v === 'string') out.set(q, [v]); else if (v && typeof v === 'object') walk(v, q); } }; walk(dbo, root); return out; };
const jbLeaves = leaves(jb, 'jb2a'), aaLeaves = leaves(aa, 'autoanimations');
const fileToJb = new Map(); for (const [path, files] of jbLeaves) for (const f of files) fileToJb.set(f, path);
const commonPrefix = (paths) => { if (!paths.length) return null; const parts = paths.map(p => p.split('.')); let i = 0; while (i < parts[0].length && parts.every(p => p[i] === parts[0][i])) i++; return parts[0].slice(0, i).join('.'); };
const stats = { mapped: 0, mappedExact: 0, mappedPrefix: 0, unmapped: 0, custom: 0 };
function mapVideo(v) {
  if (!v) return null;
  if (v.enableCustom && v.customPath) { stats.custom++; return v.customPath; }
  const path = `autoanimations.${v.dbSection}.${v.menuType}.${v.animation}.${v.variant}${v.color === 'random' ? '' : '.' + v.color}`;
  const files = [...aaLeaves.entries()].filter(([k]) => k === path || k.startsWith(path + '.')).flatMap(([, f]) => f);
  const jbPaths = files.map(f => fileToJb.get(f)).filter(Boolean);
  if (!jbPaths.length || jbPaths.length !== files.length) { stats.unmapped++; return { unmapped: path }; }
  const uniq = [...new Set(jbPaths)]; stats.mapped++;
  if (uniq.length === 1) { stats.mappedExact++; return uniq[0]; }
  const pre = commonPrefix(uniq); stats.mappedPrefix++; return v.color === 'random' ? pre + '.{random}' : pre;
}
// modal defaults per (menu, field) so we only emit what differs
const flatten = (o, p = '', out = {}) => { if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flatten(v, p ? p + '.' + k : k, out); else out[p] = o; return out; };
const modal = {};
for (const m of MENUS) for (const e of menus[m]) for (const [k, v] of Object.entries(flatten(e.primary?.options ?? {}))) { const key = m + '|' + k; modal[key] ??= {}; const s = JSON.stringify(v); modal[key][s] = (modal[key][s] ?? 0) + 1; }
const modeOf = (key) => { const c = modal[key]; if (!c) return undefined; return JSON.parse(Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]); };
const nonDefault = (m, opts) => { const out = {}; for (const [k, v] of Object.entries(flatten(opts ?? {}))) if (JSON.stringify(v) !== JSON.stringify(modeOf(m + '|' + k))) out[k] = v; return out; };
const varyCount = {}; for (const [key, c] of Object.entries(modal)) if (Object.keys(c).length > 1) { const [m, k] = key.split('|'); (varyCount[m] ??= []).push(k + '(' + Object.keys(c).length + ')'); }
const sound = (s) => { if (!s?.enable || !s.file) return undefined; const o = { file: s.file }; if (s.volume !== undefined && s.volume !== 0.75) o.volume = s.volume; if (s.delay) o.delay = s.delay; if (s.startTime) o.startTime = s.startTime; if (s.repeat && s.repeat !== 1) o.repeat = s.repeat; return o; };
const MOMENT = { melee: 'attack', range: 'attack', ontoken: 'use', templatefx: 'template', aura: 'effect', aefx: 'effect', preset: null };
const PRESET_NAME = { melee: 'melee-swing', range: 'projectile', ontoken: 'on-token', templatefx: 'template', aura: 'aura', aefx: 'on-effect' };
const GENERIC = new Set(['melee', 'range']);
const drop = { levels3d: 0, macro: 0, metaData: 0, meleeSwitchOn: 0, advanced: 0, soundOnly: 0 };
const rows = []; const extras = { secondary: 0, source: 0, target: 0 };
const trivial = (k, v) => v === false || v === 0 || v === '' || v === null || v === undefined || (k === 'opacity' && v === 1) || (k === 'repeat' && v === 1) || (k === 'repeatDelay' && v === 250) || (k === 'playbackRate' && v === 1) || (k === 'elevation' && v === 1000) || (k === 'zIndex' && v === 1) || (k === 'scale' && v === 1) || (k === 'size' && v === 1) || k === 'tintColor';
for (const m of MENUS) for (const e of menus[m]) {
  if (e.levels3d) drop.levels3d++; if (e.metaData) drop.metaData++; if (e.macro?.enable) drop.macro++; if (e.meleeSwitch?.options?.switchType && e.meleeSwitch.options.switchType !== 'off') drop.meleeSwitchOn++; if (e.soundOnly?.sound?.enable) drop.soundOnly++;
  const row = { name: e.label };
  if (GENERIC.has(m) && e.primary?.video?.menuType !== 'spell') row.match = 'contains';
  if (e.advanced?.exactMatch || e.advanced?.excludedTerms?.length) { drop.advanced++; if (e.advanced.exactMatch) row.match = 'exact'; if (e.advanced.excludedTerms?.length) row.exclude = e.advanced.excludedTerms; }
  if (m === 'preset') {
    row.on = e.presetType === 'teleportation' ? 'move' : (e.presetType === 'proToTemp' || e.presetType === 'thunderwave') ? 'template' : 'attack';
    const data = JSON.parse(JSON.stringify(e.data ?? {}));
    const walk = (o) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') { if ('dbSection' in v || 'customPath' in v) o[k] = mapVideo(v); else walk(v); } } }; walk(data);
    row.fx = [{ preset: e.presetType, data }];
  } else {
    row.on = MOMENT[m]; if (m === 'aefx') row.effectType = e.activeEffectType;
    const fx = { preset: PRESET_NAME[m], file: mapVideo(e.primary?.video) };
    const snd = sound(e.primary?.sound); if (snd) fx.sound = snd;
    const opts = nonDefault(m, e.primary?.options); if (Object.keys(opts).length) fx.options = opts;
    row.fx = [fx];
    for (const part of ['secondary', 'source', 'target']) {
      const b = e[part]; if (!b?.enable) continue; extras[part]++;
      const x = { preset: part, file: mapVideo(b.video) }; const s2 = sound(b.sound); if (s2) x.sound = s2;
      const o2 = {}; for (const [k, v] of Object.entries(flatten(b.options ?? {}))) if (!trivial(k, v)) o2[k] = v; if (Object.keys(o2).length) x.options = o2;
      row.fx.push(x);
    }
  }
  row._source = m; rows.push(row);
}
const out = JSON.stringify(rows, null, 1);
writeFileSync(`${S}/fx-recipes.json`, out);
const compact = JSON.stringify(rows);
console.log(`AA autorec raw (7 world settings): ${(rawBytes / 1024).toFixed(0)} KB   converted: ${(out.length / 1024).toFixed(0)} KB pretty / ${(compact.length / 1024).toFixed(0)} KB compact   rows=${rows.length}`);
console.log('video mapping:', JSON.stringify(stats));
console.log('extras kept:', JSON.stringify(extras), ' dropped/flagged:', JSON.stringify(drop));
console.log('\nOPTION FIELDS THAT ACTUALLY VARY per menu (distinct values):');
for (const [m, ks] of Object.entries(varyCount)) console.log(`  ${m}: ${ks.join(', ')}`);
const nd = rows.filter(r => r._source !== 'preset').map(r => Object.keys(r.fx[0].options ?? {}).length); const hist = {}; for (const n of nd) hist[n] = (hist[n] ?? 0) + 1;
console.log('\nnon-default option fields per row (histogram):', JSON.stringify(hist));
console.log('\nSAMPLE ROWS:');
for (const n of ['Fire Bolt', 'Longsword', 'Bless', 'Fireball', 'Misty Step', 'Shield', 'Spirit Guardians', 'Divine Smite', 'Sneak Attack', 'Claw', 'Hunter\'s Mark']) { for (const x of rows.filter(r => r.name === n)) console.log(JSON.stringify(x)); }
