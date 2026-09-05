import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const rows = JSON.parse(readFileSync(`${S}/fx-recipes.json`, 'utf8'));
const primary = (r) => { const f = r.fx?.[0]; if (!f) return null; if (typeof f.file === 'string') return f.file; if (f.data) for (const k of ['start', 'projectile', 'explosion', 'end']) if (typeof f.data[k] === 'string') return f.data[k]; return null; };
const db = new ClassicLevel(`${S}/db/actors`, { readOnly: true }); await db.open();
const actors = {}, items = {}; for await (const [k, v] of db.iterator()) { if (k.startsWith('!actors!')) { const a = JSON.parse(v); actors[a._id] = a; } else if (k.startsWith('!actors.items!')) { (items[k.split('!')[2].split('.')[0]] ??= []).push(JSON.parse(v)); } } await db.close();
const PCS = Object.values(actors).filter(a => a.type === 'character' && !/BF Test|Test/.test(a.name));
// (a) magic-sign rows: does the school in the asset path equal the spell's school on the sheet?
const SCHOOL = { abj: 'abjuration', con: 'conjuration', div: 'divination', enc: 'enchantment', evo: 'evocation', ill: 'illusion', nec: 'necromancy', trs: 'transmutation' };
let signRows = 0, signChecked = 0, signMatch = 0; const mism = [];
const byName = new Map(rows.map(r => [r.name.toLowerCase(), r]));
for (const a of PCS) for (const it of (items[a._id] ?? [])) { if (it.type !== 'spell') continue; const r = byName.get(it.name.toLowerCase()); if (!r) continue; const f = primary(r); if (!f || !f.startsWith('jb2a.magic_signs')) continue; signChecked++; const seg = f.split('.'); const school = seg.find(s => Object.values(SCHOOL).includes(s)); const sheet = SCHOOL[it.system?.school]; if (school === sheet) signMatch++; else mism.push(it.name + ': path ' + school + ' vs sheet ' + sheet); }
for (const r of rows) { const f = primary(r); if (f && f.startsWith('jb2a.magic_signs')) signRows++; }
console.log(`MAGIC SIGN rows in the preset: ${signRows}; on the party's sheets: ${signChecked}; school in path == spell's school: ${signMatch}` + (mism.length ? '  mismatches: ' + mism.join('; ') : ''));
// (b) condition rows: are they the standard statuses (derivable from the effect's statuses set)?
const STATUSES = ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion', 'concentrating', 'dead', 'burning', 'bleeding', 'cursed', 'dodging', 'silenced', 'surprised', 'transformed', 'diseased', 'marked', 'hiding', 'flying', 'hovering', 'ethereal'];
let condRows = 0, condStd = 0; const condOther = [];
for (const r of rows) { const f = primary(r); if (!f || !f.startsWith('jb2a.condition')) continue; condRows++; if (STATUSES.includes(r.name.toLowerCase())) condStd++; else condOther.push(r.name); }
console.log(`CONDITION rows: ${condRows}; standard dnd5e statuses: ${condStd}; others: ${condOther.slice(0, 20).join(', ')}`);
// (c) how many rows are pure "generic by kind" (marker / healing_generic / melee_generic / template_circle / energy_strands / cast_generic / impact)
const fam = (f) => f.split('.').slice(0, 2).join('.');
const GEN = ['jb2a.markers', 'jb2a.healing_generic', 'jb2a.melee_generic', 'jb2a.template_circle', 'jb2a.template_cone', 'jb2a.template_line', 'jb2a.energy_strands', 'jb2a.cast_generic', 'jb2a.impact', 'jb2a.magic_signs', 'jb2a.condition', 'jb2a.particles', 'jb2a.melee_attack', 'jb2a.ranged', 'jb2a.breath_weapons', 'jb2a.shield_themed', 'jb2a.shield', 'jb2a.liquid', 'jb2a.smoke', 'jb2a.icon', 'jb2a.eyes', 'jb2a.throwable', 'jb2a.bullet', 'jb2a.soundwave'];
const cnt = {}; let genTotal = 0; for (const r of rows) { const f = primary(r); if (!f) continue; const k = fam(f); if (GEN.includes(k)) { cnt[k] = (cnt[k] ?? 0) + 1; genTotal++; } }
console.log(`GENERIC-FAMILY rows: ${genTotal} of ${rows.length}`);
// (d) the sound side: how many sounds are generic families in PSFX (casting.generic, impacts, magic-signs, weapon-attacks, ranged-magic.generic)?
let snd = 0, sndGeneric = 0; for (const r of rows) { const s = r.fx?.[0]?.sound?.file ?? r.fx?.[0]?.data?.sound?.file; if (!s) continue; snd++; if (/^psfx\.(casting\.generic|impacts|magic-signs|weapon-attacks|weapon-swooshes|ranged-magic\.generic|ranged-weapons|creature|conditions)/.test(s) || /^modules\//.test(s)) sndGeneric++; }
console.log(`SOUNDS: ${snd} rows with sound; generic-family or raw: ${sndGeneric}; spell-specific PSFX: ${snd - sndGeneric}`);
