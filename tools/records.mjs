// The records: every key the closed lists hold, ADDRESSED — the one thing the Library's Record
// link opens, and the Editor's after it. A key is earned when a name meets the closed lists
// (tools/lib/migrate/keys.mjs); this writes down WHERE that evidence lives, as Foundry's own uuid
// plus the words a person reads. Nothing here plays: the engine never reads this file, and no name
// is ever matched again at the table — the address is settled once, offline, here.
//
// Keyed by the KEY and not by an FX, so an FX written later for an ability that has none today is
// addressed too, and neither the stock files nor a Draft has to carry the field.
//
// ⚠ It stands on the same evidence the corpus does: LIST_PACKS in tools/lib/dnd5e.mjs. Install a
// book, add its packs there, and run this again (the migration too, which is what decides whether
// an FX is carried at all).
//
//   node tools/records.mjs           # read everything, write nothing; report the coverage
//   node tools/records.mjs --write   # also write recipes/records.json
import { readFileSync, writeFileSync } from 'node:fs';
import { RECIPES, worldDb } from './lib/env.mjs';
import { readActors, snapshot } from './lib/leveldb.mjs';
import { buildLists } from './lib/migrate/keys.mjs';
import { LIST_PACKS } from './lib/dnd5e.mjs';

const WRITE = process.argv.slice(2).includes('--write');
const say = (s = '') => console.log(s);
const t0 = Date.now();

const { actors: worldActors, items: worldItems, effects: worldEffects } = await readActors(snapshot(worldDb('actors')));
const lists = await buildLists({ worldActors, worldItems, worldEffects });
if (lists.stats.skipped.length) say(`⚠ packs not installed, so nothing they hold is addressed: ${lists.stats.skipped.join(', ')}`);

const records = Object.fromEntries([...lists.records].sort(([a], [b]) => a.localeCompare(b)));
const keys = Object.keys(records);
const byKind = {};
for (const k of keys) byKind[k.split(':')[0]] = (byKind[k.split(':')[0]] ?? 0) + 1;
say(`${keys.length} keys addressed · ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(' · ')}`);

// what the corpus asks for: every key an FX answers, and whether it has a record
const asked = new Set();
for (const f of ['spells', 'weapons', 'natural', 'features', 'items', 'effects']) {
  for (const fx of JSON.parse(readFileSync(`${RECIPES}/stock/${f}.json`, 'utf8')).fx) if (fx.for?.[0]) asked.add(fx.for[0]);
}
for (const fx of JSON.parse(readFileSync(`${RECIPES}/house.json`, 'utf8')).fx) if (fx.for?.[0]) asked.add(fx.for[0]);
const orphans = [...asked].filter((k) => !records[k]);
say(`the corpus answers ${asked.size} keys — ${asked.size - orphans.length} of them have a record${orphans.length ? `, ${orphans.length} do not` : ', every one'}`);
if (orphans.length) say(`  ${orphans.join(', ')}`);

const out = {
  _meta: {
    schema: 1,
    generated: new Date().toISOString().slice(0, 10),
    tool: 'tools/records.mjs',
    keys: keys.length,
    kinds: byKind,
    books: LIST_PACKS.filter(([m, p]) => !lists.stats.skipped.includes(`${m}/${p}`)).map(([m, p]) => `${m}/${p}`),
    licence: 'MIT',
    note: 'Where each key\u2019s evidence lives: a compendium record, or an item on this world\u2019s actors. Our own data about the installed books, not part of the migrated corpus. The screens read it; the engine never does.',
  },
  records,
};
const path = `${RECIPES}/records.json`;
const text = JSON.stringify(out, null, 1);
say(`${(text.length / 1024).toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (WRITE) { writeFileSync(path, text); say(`✓ wrote ${path}`); } else say('(nothing written — pass --write)');
