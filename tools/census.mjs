// The census, offline: every ability on the world's actors and (with --packs) in the books,
// keyed by identity and resolved against the recipes — which look answers, and what plays
// nothing, per sheet. The same question the API's census() answers at the table.
//
//   node tools/census.mjs                 # the party's sheets: what plays, what plays nothing
//   node tools/census.mjs --all           # every actor in the world
//   node tools/census.mjs --actor "Gren"  # one actor, every ability with its keys and its answer
//   node tools/census.mjs --packs         # the PHB spells, feats and equipment as well
//   node tools/census.mjs --json          # as data
import { MODULES, worldDb } from './lib/env.mjs';
import { packDir, readActors, readPackItems, snapshot } from './lib/leveldb.mjs';
import { ITEM_TYPES } from './lib/dnd5e.mjs';
import { indexRecipes, readRecipes } from './lib/recipes.mjs';
import { resolve } from '../scripts/core/corpus.js';
import { keysFor, subjectOfItemData } from '../scripts/core/subjects.js';
import { sentence } from '../scripts/core/looks.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const all = args.includes('--all');
const packs = args.includes('--packs');
const actorFilter = args.includes('--actor') ? args[args.indexOf('--actor') + 1] : null;

const recipes = readRecipes();
const index = indexRecipes(recipes);
for (const p of index.problems) console.error('  index: ' + p);
const { actors, items, effects } = await readActors(snapshot(worldDb('actors')));

const out = { actors: [], packs: [], asked: 0, answered: 0 };
const ask = (it) => {
  const acts = Object.values(it.system?.activities ?? {});
  const subject = subjectOfItemData({ name: it.name, type: it.type, system: it.system, activityType: acts[0]?.type ?? null });
  const hasPlace = acts.some((a) => a?.target?.template?.type);
  const r = resolve(index, subject.keys, 'use', { hasPlace });
  return { name: it.name, type: it.type, keys: subject.keys, look: r.look?.id ?? null, key: r.key ?? null, source: r.source ?? null, sentence: r.look ? sentence(r.look, { name: it.name }) : 'Nothing plays yet.' };
};
const chosen = Object.values(actors).filter((a) => actorFilter ? a.name.toLowerCase().includes(actorFilter.toLowerCase()) : all ? true : a.type === 'character' && !/^BF Test/.test(a.name));
for (const a of chosen) {
  const row = { name: a.name, type: a.type, items: [], effects: [] };
  for (const it of items[a._id] ?? []) {
    if (!ITEM_TYPES.includes(it.type)) continue;
    if (!Object.keys(it.system?.activities ?? {}).length && it.type !== 'weapon') continue;
    const r = ask(it);
    out.asked++;
    if (r.look) out.answered++;
    row.items.push(r);
  }
  for (const ef of effects[a._id] ?? []) {
    const keys = keysFor({ kind: 'effect', name: ef.name });
    const r = resolve(index, keys, 'effect');
    row.effects.push({ name: ef.name, keys, look: r.look?.id ?? null, source: r.source ?? null });
  }
  out.actors.push(row);
}
if (packs) {
  for (const [mod, pack] of [['phb', 'spells'], ['phb', 'feats'], ['phb', 'equipment']]) {
    const dir = packDir(MODULES[mod], pack);
    if (!dir) continue;
    const row = { pack: `${mod}/${pack}`, items: [] };
    for (const it of await readPackItems(snapshot(dir, `${mod}-${pack}`))) if (ITEM_TYPES.includes(it.type)) row.items.push(ask(it));
    out.packs.push(row);
  }
}
if (json) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const a of out.actors) {
  const plays = a.items.filter((i) => i.look);
  const nothing = a.items.filter((i) => !i.look);
  console.log(`\n${a.name} (${a.type}): ${plays.length} of ${a.items.length} play`);
  if (actorFilter) for (const i of a.items) console.log(`  ${i.look ? '✓' : '·'} ${i.name} [${i.type}] · ${i.keys.join(', ')} → ${i.look ? `${i.look} (${i.source}, ${i.key})` : 'nothing'}`);
  else if (nothing.length) console.log(`  nothing yet: ${nothing.map((i) => i.name).join('; ')}`);
  const eff = a.effects.filter((e) => e.look);
  if (a.effects.length) console.log(`  effects: ${eff.length} of ${a.effects.length} have a look${actorFilter ? ` — ${a.effects.map((e) => `${e.name}${e.look ? ` → ${e.look}` : ''}`).join('; ')}` : ''}`);
}
for (const p of out.packs) { const plays = p.items.filter((i) => i.look).length; console.log(`\n${p.pack}: ${plays} of ${p.items.length} play; nothing yet: ${p.items.filter((i) => !i.look).map((i) => i.name).slice(0, 40).join('; ')}${p.items.length - plays > 40 ? ' …' : ''}`); }
console.log(`\n${out.answered} of ${out.asked} abilities have a look`);
