// The recipes, read offline the way the module reads them at boot: the stock per kind, the house
// fx, the starters, the frozen table — and the corpus index built from them (scripts/core/corpus.js,
// the very same code). Also wires the engine's asset database to the libraries' registration files so
// a tool resolves assets exactly as the table does.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES } from './env.mjs';
import { loadJb2a, loadPsfx } from './libraries.mjs';
import { database } from './stage.mjs';
import { buildIndex } from '../../scripts/core/corpus.js';
import { useDatabase } from '../../scripts/engine/assets.js';

export const STOCK_FILES = ['spells', 'weapons', 'natural', 'features', 'items', 'effects'];

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** {stock: [fx], house: [fx], starters: [fx], frozen: {meta, db} | null, files: {name: path}} */
export function readRecipes() {
  const files = {};
  const stock = [];
  for (const k of STOCK_FILES) {
    const p = join(RECIPES, 'stock', `${k}.json`);
    files[k] = p;
    const j = readJson(p);
    if (j) stock.push(...(j.fx ?? []));
  }
  const house = readJson(join(RECIPES, 'house.json'))?.fx ?? [];
  const starters = readJson(join(RECIPES, 'starters.json'))?.fx ?? [];
  const frozen = readJson(join(RECIPES, 'aa-assets.json'));
  const records = readJson(join(RECIPES, 'records.json'))?.records ?? {};
  return { stock, house, starters, frozen, records, files };
}

/** the corpus index over the recipes (plus `extra` fx when given — a file under test — read as House) */
export function indexRecipes(recipes, extra = []) {
  return buildIndex({ stock: recipes.stock, house: [...recipes.house, ...extra], starters: recipes.starters });
}

/** the libraries' registration as the engine's database; returns the stage database and the raw dbs */
export async function useLibraries(recipes = null) {
  const jb2a = await loadJb2a();
  const psfx = await loadPsfx();
  const dbs = { jb2a, psfx, fxstudio: recipes?.frozen?.db ?? {} };
  const db = database(dbs);
  useDatabase(db);
  return { db, dbs };
}

/** an FX file given on the command line: a JSON file with {fx: [...]}, a bare fx, or a bare list */
export function readFxFile(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  if (Array.isArray(j)) return j;
  if (Array.isArray(j.fx)) return j.fx;
  return [j];
}
