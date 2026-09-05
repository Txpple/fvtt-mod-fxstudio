import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const j = await import(`file:///${S}/jb2a_db.mjs`); await j.jb2aPatreonDatabase('modules'); const jb = j.patreonDatabase;
const p = await import(`file:///${S}/psfx_db.mjs`); await p.registerPSFXDatabase('modules/psfx'); const ps = p.psfxDatabase;
const COLORS = ['blue', 'green', 'red', 'orange', 'yellow', 'purple', 'pink', 'white', 'grey', 'black', 'teal', 'dark_black', 'dark_green', 'dark_purple', 'dark_red', 'dark_blue', 'dark_orange', 'dark_yellow', 'light_blue', 'bluegreen', 'blueyellow', 'purpleblue', 'yellowblue', 'greenred', 'greenyellow', 'pinkyellow', 'orangered', 'rainbow', 'regular', 'darkgreen', 'darkred', 'darkpurple', 'lightblue', 'lightgreen', 'greenpurple', 'bluepurple', 'bluepink', 'redyellow', 'purplepink', 'blackblue', 'darkyellow', 'darkblue', 'darkorange', 'greenblue', 'dark_pink', 'dark_teal', 'gold', 'silver', 'brown', 'cyan'];
const leaves = (o, root) => { const out = []; const walk = (o, pre) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; const q = pre + '.' + k; if (Array.isArray(v) || typeof v === 'string') out.push(q); else if (v && typeof v === 'object') walk(v, q); } }; walk(o, root); return out; };
const jbL = leaves(jb, 'jb2a'), psL = leaves(ps, 'psfx');
// styles: top-level JB2A key -> colours available (as leaf last segments) and variant count
const styles = {};
for (const path of jbL) { const seg = path.split('.'); const key = seg[1]; const st = styles[key] ??= { colors: new Set(), n: 0, sample: path }; st.n++; const last = seg[seg.length - 1]; if (COLORS.includes(last)) st.colors.add(last); }
const stylesOut = {}; for (const [k, v] of Object.entries(styles)) stylesOut[k] = { colors: [...v.colors], n: v.n, sample: v.sample };
// sounds: PSFX leaves as plain labels
const sounds = psL.map(pth => { const seg = pth.split('.'); return { path: pth, label: seg.slice(1).filter(s => !/^v\d+$/.test(s) && !/^\d+$/.test(s) && !/^group/.test(s)).map(s => s.replace(/-/g, ' ')).join(' · ') }; });
// exceptions: preset rows whose asset is a NAMED asset (not a generic family), plus the user's own
const rows = JSON.parse(readFileSync(`${S}/fx-recipes.json`, 'utf8'));
const GEN = new Set(['markers', 'healing_generic', 'melee_generic', 'template_circle', 'template_cone', 'template_line', 'template_square', 'energy_strands', 'cast_generic', 'cast_shape', 'impact', 'magic_signs', 'condition', 'particles', 'melee_attack', 'ranged', 'breath_weapons', 'shield_themed', 'shield', 'liquid', 'smoke', 'icon', 'eyes', 'throwable', 'bullet', 'soundwave', 'explosion', 'energy_beam', 'energy_field', 'extras', 'misc', 'generic', 'fog_cloud', 'token_border', 'swirling_sparkles', 'swirling_leaves', 'spell_projectile', 'flames', 'fire_ring']);
const WEAPON_KEYS = new Set(['sword', 'greatsword', 'greataxe', 'scimitar', 'shortsword', 'dagger', 'rapier', 'mace', 'maul', 'hammer', 'warhammer', 'handaxe', 'club', 'spear', 'lance', 'halberd', 'glaive', 'quarterstaff', 'sickle', 'whip', 'flail', 'morningstar', 'pike', 'trident', 'javelin', 'dart', 'sling', 'arrow', 'bolt', 'boulder', 'boomerang', 'claws', 'bite', 'fist', 'unarmed_strike']);
const primary = (r) => { const f = r.fx?.[0]; if (!f) return null; if (typeof f.file === 'string') return f.file; if (f.data) for (const k of ['start', 'projectile', 'explosion', 'end']) if (typeof f.data[k] === 'string') return f.data[k]; return null; };
const sound = (r) => r.fx?.[0]?.sound?.file ?? r.fx?.[0]?.data?.sound?.file ?? null;
const exceptions = []; let automatic = 0;
for (const r of rows) { const f = primary(r); if (!f || typeof f !== 'string') { automatic++; continue; } const fam = f.split('.')[1]; if (GEN.has(fam) || WEAPON_KEYS.has(fam) || !f.startsWith('jb2a.')) { automatic++; continue; } exceptions.push({ name: r.name, file: f, sound: sound(r), kind: r.on || r.kind, source: 'preset' }); }
// world layer
exceptions.unshift({ name: 'Unholy Word', file: 'jb2a.markers.light.complete.yellow', sound: 'psfx.cantrips.light.v1.001', kind: 'template', source: 'yours', note: "Harrow Vane's feature" });
exceptions.unshift({ name: 'Sharran Step', like: 'Misty Step', file: 'jb2a.misty_step.01.dark_black', sound: 'psfx.2nd-level-spells.misty-step.v1.complete.generic', kind: 'move', source: 'yours', note: 'from today' });
// party sheets
const db = new ClassicLevel(`${S}/db/actors`, { readOnly: true }); await db.open();
const actors = {}, items = {}; for await (const [k, v] of db.iterator()) { if (k.startsWith('!actors!')) { const a = JSON.parse(v); actors[a._id] = a; } else if (k.startsWith('!actors.items!')) { (items[k.split('!')[2].split('.')[0]] ??= []).push(JSON.parse(v)); } } await db.close();
const PCS = Object.values(actors).filter(a => a.type === 'character' && !/BF Test|Test/.test(a.name));
const pcs = PCS.map(a => ({ name: a.name, items: (items[a._id] ?? []).filter(it => ['weapon', 'spell', 'feat', 'consumable'].includes(it.type) && Object.keys(it.system?.activities ?? {}).length).map(it => { const acts = Object.values(it.system.activities); const dmg = [...new Set([...acts.flatMap(x => x.damage?.parts ?? []).flatMap(pt => pt.types ?? []), ...(it.system?.damage?.base?.types ?? [])])]; return { name: it.name, type: it.type, school: it.system?.school || null, level: it.system?.level ?? null, dmg, template: acts.map(x => x.target?.template?.type).find(Boolean) || null, attack: acts.find(x => x.type === 'attack')?.attack?.type?.value || null, heal: acts.some(x => x.type === 'heal'), save: acts.some(x => x.type === 'save'), acts: [...new Set(acts.map(x => x.type))], base: it.system?.type?.baseItem || null, wclass: it.system?.type?.value || null }; }).sort((x, y) => x.name.localeCompare(y.name)) }));
const data = { pcs, exceptions, styles: stylesOut, sounds, stats: { presetRows: rows.length, automatic, exceptions: exceptions.length, soundsWaiting: 203, styles: Object.keys(stylesOut).length } };
writeFileSync(`${S}/ui2-data.json`, JSON.stringify(data));
console.log(JSON.stringify(data.stats), 'pcs', pcs.map(p => p.name + ':' + p.items.length).join(', '), 'bytes', JSON.stringify(data).length);
