// Fold the world buffer (the FX written in the game through the screens or the API) into
// recipes/house.json, so git holds the history. The only way an FX reaches house.json: a person
// runs this and reads the sentences. Offline: reads the world's settings LevelDB.
//
//   node tools/export-fx.mjs            # show what the buffer holds, as sentences; write nothing
//   node tools/export-fx.mjs --write    # fold into house.json (same id replaces) and clear nothing
//                                          # (the buffer is cleared in the game, by the Check screen or api)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES, worldDb } from './lib/env.mjs';
import { readSettings, snapshot } from './lib/leveldb.mjs';
import { readRecipes, indexRecipes } from './lib/recipes.mjs';
import { provenance, sentence, validate } from '../scripts/core/fx.js';

const WRITE = process.argv.includes('--write');
const settings = await readSettings(snapshot(worldDb('settings')));
const raw = settings['fvtt-mod-fxstudio.fx'];
const buffer = raw ? JSON.parse(raw) : [];
if (!Array.isArray(buffer) || !buffer.length) { console.log('the world buffer is empty; nothing to export'); process.exit(0); }
const recipes = readRecipes();
const index = indexRecipes(recipes, buffer);
let bad = 0;
console.log(`the world buffer holds ${buffer.length} fx(s):`);
for (const fx of buffer) {
  const errs = validate(fx);
  if (errs.length) { bad++; console.log(`  ✗ ${fx.id}: ${errs.join('; ')}`); continue; }
  const replaces = recipes.house.some((l) => l.id === fx.id) ? ' (replaces the house fx of that id)' : recipes.stock.some((l) => l.id === fx.id) ? ' (replaces the stock fx of that id)' : '';
  console.log(`  · ${sentence(fx)}${replaces}`);
  console.log(`    ${provenance(fx)}`);
}
if (bad) { console.log(`FAIL: ${bad} fx(s) do not validate; fix them in the game first`); process.exit(1); }
if (!WRITE) { console.log('pass --write to fold them into recipes/house.json'); process.exit(0); }
const path = join(RECIPES, 'house.json');
const file = JSON.parse(readFileSync(path, 'utf8'));
const kept = (file.fx ?? []).filter((l) => !buffer.some((b) => b.id === l.id));
file.fx = [...kept, ...buffer];
file._meta = { ...(file._meta ?? {}), schema: 2, fx: file.fx.length, exported: new Date().toISOString().slice(0, 10) };
writeFileSync(path, JSON.stringify(file, null, 1));
console.log(`wrote recipes/house.json: ${file.fx.length} fx (${buffer.length} from the buffer). Clear the buffer in the game when the file is deployed.`);
