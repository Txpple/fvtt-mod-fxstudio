import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const j = await import(`file:///${S}/jb2a_db.mjs`); await j.jb2aPatreonDatabase('modules'); const jb = j.patreonDatabase;
const p = await import(`file:///${S}/psfx_db.mjs`); await p.registerPSFXDatabase('modules/psfx'); const ps = p.psfxDatabase;
const jbKeys = new Set(Object.keys(jb).filter(k => !k.startsWith('_')));
const psKeys = new Set(); for (const [cat, v] of Object.entries(ps)) for (const k of Object.keys(v)) psKeys.add(k);
const slug = (n) => n.toLowerCase().replace(/'s\b/g, 's').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const dash = (n) => slug(n).replace(/_/g, '-');
const rows = JSON.parse(readFileSync(`${S}/fx-recipes.json`, 'utf8'));
const primary = (r) => { const f = r.fx?.[0]; if (!f) return null; if (f.file) return f.file; if (f.data) for (const k of ['start', 'projectile', 'explosion', 'end']) if (typeof f.data[k] === 'string') return f.data[k]; return null; };
const sound = (r) => r.fx?.[0]?.sound?.file ?? r.fx?.[0]?.data?.sound?.file ?? null;
// families: is the primary asset under a JB2A key that equals the row's own slug, or under a generic family?
const GENERIC = /^jb2a\.(melee_generic|melee_attack|ranged|energy_|cast_generic|cast_shape|explosion|impact|template_|markers|magic_signs|condition|particles|extras|smoke|fog_cloud|aura_themed|token_border|swirling_|shield$|spell_projectile|generic|breath_weapons|liquid|misc|scorching_ray|guiding_bolt|arrow|bolt|dagger|club|greatsword|greataxe|sword|spear|mace|hammer|handaxe|rapier|scimitar|shortsword|sickle|quarterstaff|halberd|glaive|lance|maul|warhammer|whip|flail|morningstar|pike|trident|javelin|dart|sling|bullet|boulder|boomerang|bite|claws|claw|fist|unarmed_strike)/;
const st = { rows: rows.length, slugJb: 0, slugPs: 0, slugBoth: 0, genericFamily: 0, curated: 0, noAsset: 0 };
const families = {}; const curatedList = [];
for (const r of rows) {
  const f = primary(r); if (!f || typeof f !== 'string') { st.noAsset++; continue; }
  const s = slug(r.name); const isSlug = f.startsWith('jb2a.' + s + '.') || f === 'jb2a.' + s;
  const snd = sound(r); const isSlugSnd = snd ? snd.includes('.' + dash(r.name) + '.') || snd.endsWith('.' + dash(r.name)) : false;
  if (isSlug) st.slugJb++; if (isSlugSnd) st.slugPs++; if (isSlug && isSlugSnd) st.slugBoth++;
  const fam = f.split('.').slice(0, 2).join('.'); families[fam] = (families[fam] ?? 0) + 1;
  if (!isSlug) { if (GENERIC.test(f)) st.genericFamily++; else { st.curated++; if (curatedList.length < 40) curatedList.push(r.name + ' → ' + f); } }
}
console.log('ROWS WHOSE ASSET IS SIMPLY jb2a.<slug of the row name>:', JSON.stringify(st));
console.log('\nTOP ASSET FAMILIES (jb2a.<key>) across the rows:');
for (const [k, n] of Object.entries(families).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log('  ' + String(n).padStart(4) + '  ' + k);
console.log('\nCURATED (neither slug nor a generic family), first 40:'); for (const x of curatedList) console.log('  ' + x);
// The party test: for every PC item with activities, would "slug in JB2A" or "descriptor" find something with NO row at all?
const db = new ClassicLevel(`${S}/db/actors`, { readOnly: true }); await db.open();
const actors = {}, items = {}; for await (const [k, v] of db.iterator()) { if (k.startsWith('!actors!')) { const a = JSON.parse(v); actors[a._id] = a; } else if (k.startsWith('!actors.items!')) { (items[k.split('!')[2].split('.')[0]] ??= []).push(JSON.parse(v)); } } await db.close();
const PCS = Object.values(actors).filter(a => a.type === 'character' && !/BF Test|Test/.test(a.name));
const WEAPON_KEYS = new Set(['sword', 'greatsword', 'greataxe', 'scimitar', 'shortsword', 'dagger', 'rapier', 'mace', 'maul', 'hammer', 'warhammer', 'handaxe', 'club', 'spear', 'lance', 'halberd', 'glaive', 'quarterstaff', 'sickle', 'whip', 'flail', 'morningstar', 'pike', 'trident', 'javelin', 'dart', 'sling', 'arrow', 'bolt', 'boulder', 'boomerang']);
const BASE_ALIAS = { longsword: 'sword', battleaxe: 'greataxe', greatclub: 'club', lighthammer: 'hammer', warpick: 'mace', shortbow: 'arrow', longbow: 'arrow', lightcrossbow: 'bolt', heavycrossbow: 'bolt', handcrossbow: 'bolt' };
const tot = { items: 0, slug: 0, weaponBase: 0, damageType: 0, schoolSign: 0, nothing: 0 }; const nothing = [];
for (const a of PCS) for (const it of (items[a._id] ?? [])) {
  if (!['weapon', 'spell', 'feat'].includes(it.type)) continue; const acts = Object.values(it.system?.activities ?? {}); if (!acts.length) continue; tot.items++;
  const s = slug(it.name);
  if (jbKeys.has(s) || psKeys.has(dash(it.name))) { tot.slug++; continue; }
  const base = it.system?.type?.baseItem; const wk = BASE_ALIAS[base] ?? base; if (it.type === 'weapon' && wk && WEAPON_KEYS.has(wk)) { tot.weaponBase++; continue; }
  const dmg = acts.flatMap(x => x.damage?.parts ?? []).flatMap(pt => pt.types ?? []); const base0 = it.system?.damage?.base?.types ?? []; const types = [...new Set([...dmg, ...base0])];
  if (types.length) { tot.damageType++; continue; }
  if (it.type === 'spell' && it.system?.school) { tot.schoolSign++; continue; }
  tot.nothing++; nothing.push(a.name.split(' ')[0] + ': ' + it.name + ' [' + it.type + '/' + acts.map(x => x.type).join('+') + ']');
}
console.log('\nPARTY ITEMS RESOLVED WITH NO ROWS AT ALL (derivation only):', JSON.stringify(tot));
console.log('  unresolved by derivation: ' + nothing.join('; '));
