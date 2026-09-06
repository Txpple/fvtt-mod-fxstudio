// Fold the world buffer (the looks written in the game through the screens or the API) into
// recipes/house.json, so git holds the history. The only way a look reaches house.json: a person
// runs this and reads the sentences. Offline: reads the world's settings LevelDB.
//
//   node tools/export-looks.mjs            # show what the buffer holds, as sentences; write nothing
//   node tools/export-looks.mjs --write    # fold into house.json (same id replaces) and clear nothing
//                                          # (the buffer is cleared in the game, by the Check screen or api)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES, worldDb } from './lib/env.mjs';
import { readSettings, snapshot } from './lib/leveldb.mjs';
import { readRecipes, indexRecipes } from './lib/recipes.mjs';
import { expand, provenance, sentence, validate } from '../scripts/core/looks.js';

const WRITE = process.argv.includes('--write');
const settings = await readSettings(snapshot(worldDb('settings')));
const raw = settings['fvtt-mod-fxstudio.looks'];
const buffer = raw ? JSON.parse(raw) : [];
if (!Array.isArray(buffer) || !buffer.length) { console.log('the world buffer is empty; nothing to export'); process.exit(0); }
const recipes = readRecipes();
const index = indexRecipes(recipes, buffer);
const lookup = (id) => index.byId.get(id)?.look ?? index.starters.get(id) ?? null;
const ids = new Set([...index.byId.keys(), ...index.starters.keys()]);
let bad = 0;
console.log(`the world buffer holds ${buffer.length} look(s):`);
for (const look of buffer) {
  const errs = validate(look, { ids });
  if (errs.length) { bad++; console.log(`  ✗ ${look.id}: ${errs.join('; ')}`); continue; }
  const replaces = recipes.house.some((l) => l.id === look.id) ? ' (replaces the house look of that id)' : recipes.baseline.some((l) => l.id === look.id) ? ' (replaces the baseline look of that id)' : '';
  console.log(`  · ${sentence(look.off ? look : expand(look, lookup))}${replaces}`);
  console.log(`    ${provenance(look)}`);
}
if (bad) { console.log(`FAIL: ${bad} look(s) do not validate; fix them in the game first`); process.exit(1); }
if (!WRITE) { console.log('pass --write to fold them into recipes/house.json'); process.exit(0); }
const path = join(RECIPES, 'house.json');
const file = JSON.parse(readFileSync(path, 'utf8'));
const kept = (file.looks ?? []).filter((l) => !buffer.some((b) => b.id === l.id));
file.looks = [...kept, ...buffer];
file._meta = { ...(file._meta ?? {}), schema: 2, looks: file.looks.length, exported: new Date().toISOString().slice(0, 10) };
writeFileSync(path, JSON.stringify(file, null, 1));
console.log(`wrote recipes/house.json: ${file.looks.length} looks (${buffer.length} from the buffer). Clear the buffer in the game when the file is deployed.`);
