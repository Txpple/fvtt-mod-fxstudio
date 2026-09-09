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
//   node tools/records.mjs --write   # also write recipes/records.json AND stamp every FX's record from it
//
// THE RECORD IS ON THE FX TOO (the user, 2026-09-09): every stock and house FX carries its own
// {uuid, name, where}, stamped from this file by its key so an FX file is complete on its own.
// --write re-stamps them all, which is how a newly installed book re-addresses the corpus.
import { readFileSync, writeFileSync } from 'node:fs';
import { RECIPES, worldDb } from './lib/env.mjs';
import { readActors, snapshot } from './lib/leveldb.mjs';
import { buildLists } from './lib/migrate/keys.mjs';
import { LIST_PACKS } from './lib/dnd5e.mjs';
import { recordAgrees, stampRecord } from '../scripts/core/records.js';

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

// the FX that carry a record that disagrees with the evidence (or none): what --write will stamp
const corpusFiles = [...['spells', 'weapons', 'natural', 'features', 'items', 'effects'].map((f) => `${RECIPES}/stock/${f}.json`), `${RECIPES}/house.json`];
let stale = 0, stamped = 0;
for (const path of corpusFiles) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  let changed = 0;
  j.fx = j.fx.map((fx) => { const next = stampRecord(fx, records); if (JSON.stringify(next) !== JSON.stringify(fx)) changed++; return next; });
  stale += changed;
  if (WRITE && changed) { writeFileSync(path, JSON.stringify(j, null, 1)); stamped += changed; }
}
say(stale ? `${stale} FX carry no record, or one that disagrees with the evidence${WRITE ? ` — stamped ${stamped}` : ' (--write stamps them)'}` : 'every FX carries the record the evidence says');
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
