import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('file:///D:/Workbench/FVTT/Repos/fvtt-mcp-molten5e/package.json');
const { ClassicLevel } = require('classic-level');
const S = process.argv[2];
const j = await import(`file:///${S}/jb2a_db.mjs`); await j.jb2aPatreonDatabase('modules'); const jb = j.patreonDatabase;
const jbKeys = new Set(Object.keys(jb).filter(k => !k.startsWith('_')));
const slug = (n) => n.toLowerCase().replace(/'s\b/g, 's').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const rows = JSON.parse(readFileSync(`${S}/fx-recipes.json`, 'utf8'));
const primary = (r) => { const f = r.fx?.[0]; if (!f) return null; if (typeof f.file === 'string') return f.file; if (f.data) for (const k of ['start', 'projectile', 'explosion', 'end']) if (typeof f.data[k] === 'string') return f.data[k]; return null; };
const byName = new Map(); for (const r of rows) { const k = r.name.toLowerCase(); if (!byName.has(k) || r.kind === 'ontoken' || r.kind === 'range' || r.kind === 'templatefx' || r.kind === 'preset') byName.set(k, r); }
const db = new ClassicLevel(`${S}/db/phb-spells`, { readOnly: true }); await db.open();
const spells = []; const effects = new Set();
for await (const [k, v] of db.iterator()) { if (k.startsWith('!items!')) spells.push(JSON.parse(v)); else if (k.startsWith('!items.effects!')) effects.add(k.split('!')[2].split('.')[0]); }
await db.close();
const classify = (f) => { if (!f) return 'none'; const seg = f.split('.'); const fam = seg[1]; if (/^magic_signs$/.test(fam)) return 'sign'; if (/^template_/.test(fam)) return 'template'; if (fam === 'healing_generic' || fam === 'cure_wounds') return 'heal'; if (fam === 'markers' || fam === 'icon' || fam === 'particles' || fam === 'condition' || fam === 'eyes') return 'marker'; if (['ranged', 'energy_strands', 'energy_beam', 'bullet', 'throwable', 'spell_projectile', 'melee_generic', 'melee_attack', 'cast_generic', 'impact', 'explosion', 'breath_weapons', 'shield_themed', 'soundwave', 'liquid', 'smoke', 'fire_ring', 'flames'].includes(fam)) return 'generic-' + fam.split('_')[0]; return 'named:' + fam; };
const tab = {}; const bump = (a, b) => { tab[a] ??= {}; tab[a][b] = (tab[a][b] ?? 0) + 1; };
let total = 0, withRow = 0, slugHit = 0; const examples = { agree: [], curated: [], uncovered: [] };
for (const sp of spells) {
  if (sp.type !== 'spell') continue; total++;
  const acts = Object.values(sp.system?.activities ?? {});
  const types = [...new Set(acts.flatMap(a => a.damage?.parts ?? []).flatMap(p => p.types ?? []))];
  const tmpl = acts.map(a => a.target?.template?.type).find(Boolean);
  const attack = acts.find(a => a.type === 'attack'); const heal = acts.find(a => a.type === 'heal');
  const s = slug(sp.name); const hasSlug = jbKeys.has(s); if (hasSlug) slugHit++;
  const rule = hasSlug ? 'named:' + s : tmpl ? 'template' : attack ? (attack.attack?.type?.value === 'melee' ? 'generic-melee' : 'generic-ranged') : heal ? 'heal' : types.length ? 'generic-impact' : 'sign';
  const r = byName.get(sp.name.toLowerCase()); const f = r ? primary(r) : null; const pre = classify(f);
  if (r) withRow++;
  const preClass = pre.startsWith('named:') ? (pre === 'named:' + s ? 'named:' + s : 'named-other') : pre;
  const ruleClass = rule.startsWith('named:') ? rule : rule;
  let verdict; if (!r) verdict = 'no row'; else if (preClass === ruleClass) verdict = 'rule = preset'; else if (preClass === 'named-other') verdict = 'preset curated a named asset'; else verdict = 'differs';
  bump(verdict, ruleClass + ' vs ' + preClass);
  if (verdict === 'rule = preset' && examples.agree.length < 6) examples.agree.push(sp.name + ' → ' + f);
  if (verdict === 'preset curated a named asset' && examples.curated.length < 8) examples.curated.push(sp.name + ' → ' + f);
  if (verdict === 'no row' && examples.uncovered.length < 8) examples.uncovered.push(sp.name + ' (rule: ' + rule + ')');
  if (verdict === 'differs') (examples.differs ??= []).length < 12 && examples.differs.push(sp.name + ': rule ' + rule + ' vs preset ' + f);
}
console.log(`PHB 2024 spells: ${total}; with a preset row: ${withRow}; with a JB2A asset of the same name: ${slugHit}`);
for (const [v, m] of Object.entries(tab)) { const n = Object.values(m).reduce((a, b) => a + b, 0); console.log(`\n${v}: ${n}`); for (const [k, c] of Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log('   ' + String(c).padStart(4) + '  ' + k); }
console.log('\nexamples agree:', examples.agree.join(' | '));
console.log('examples curated:', examples.curated.join(' | '));
console.log('examples differs:', (examples.differs ?? []).join(' | '));
console.log('examples no row:', examples.uncovered.join(' | '));
