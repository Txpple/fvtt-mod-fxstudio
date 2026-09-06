// The recipes, read offline the way the module reads them at boot: the baseline per kind, the house
// looks, the starters, the frozen table — and the corpus index built from them (scripts/core/corpus.js,
// the very same code). Also wires the engine's asset database to the libraries' registration files so
// a tool resolves assets exactly as the table does.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPES } from './env.mjs';
import { loadJb2a, loadPsfx } from './libraries.mjs';
import { database } from './stage.mjs';
import { buildIndex } from '../../scripts/core/corpus.js';
import { useDatabase } from '../../scripts/engine/assets.js';

export const BASELINE_FILES = ['spells', 'weapons', 'natural', 'features', 'items', 'effects'];

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** {baseline: [looks], house: [looks], starters: [looks], frozen: {meta, db} | null, files: {name: path}} */
export function readRecipes() {
  const files = {};
  const baseline = [];
  for (const k of BASELINE_FILES) {
    const p = join(RECIPES, 'baseline', `${k}.json`);
    files[k] = p;
    const j = readJson(p);
    if (j) baseline.push(...(j.looks ?? []));
  }
  const house = readJson(join(RECIPES, 'house.json'))?.looks ?? [];
  const starters = readJson(join(RECIPES, 'starters.json'))?.looks ?? [];
  const frozen = readJson(join(RECIPES, 'aa-assets.json'));
  return { baseline, house, starters, frozen, files };
}

/** the corpus index over the recipes (plus `world` looks when given: the buffer, or a file under test) */
export function indexRecipes(recipes, world = []) {
  return buildIndex({ baseline: recipes.baseline, house: recipes.house, world, starters: recipes.starters });
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

/** a look file given on the command line: a JSON file with {looks: [...]}, a bare look, or a bare list */
export function readLookFile(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  if (Array.isArray(j)) return j;
  if (Array.isArray(j.looks)) return j.looks;
  return [j];
}
