// THE CORPUS FILES (ruled 2026-09-12: "no more concept of draft"). An FX is in a file or it is
// nothing: recipes/house.json for this table's own FX, recipes/stock/<kind>.json for the books'.
// Save writes the file, in the module's own folder on the server (Foundry lets a GM upload files);
// Delete takes it out of the file. There is no world buffer, no staging, no ship: what the game
// writes is the corpus, and the repo pulls the files back with tools/pull-corpus.mjs so git holds
// the history. Nothing here is a rule about fx: it moves files.
import { MODULE_ID } from './settings.js';
import { parseKey } from './core/subjects.js';

/** the stock file a key's kind belongs in */
export const KIND_FILES = { spell: 'spells', weapon: 'weapons', natural: 'natural', feature: 'features', item: 'items', effect: 'effects' };
export const HOUSE_FILE = 'recipes/house.json';

const root = () => `modules/${MODULE_ID}`;
const today = () => new Date().toISOString().slice(0, 10);

/** a JSON file of the module as the server holds it now (never the browser's cached copy) */
export async function readModuleFile(path) {
  const r = await fetch(`${root()}/${path}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`cannot read ${path} (${r.status})`);
  return r.json();
}

/** write a JSON file into the module's folder on the server (a GM's file upload; the file is replaced) */
export async function writeModuleFile(path, data) {
  const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
  const parts = path.split('/');
  const name = parts.pop();
  const dir = [root(), ...parts].join('/');
  const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
  const r = await FP.upload('data', dir, file, {}, { notify: false });
  if (r?.status !== 'success') throw new Error(`could not write ${path}: ${r?.message ?? 'the upload was refused'}`);
  return r.path;
}

/** the stock file an FX belongs in, by the kind of its first key; null when it has none (an Item Hook is House only) */
export function stockFile(fx) {
  const kind = parseKey(fx?.for?.[0] ?? '')?.kind;
  const f = KIND_FILES[kind];
  return f ? `recipes/stock/${f}.json` : null;
}

/** the file an FX goes to for a corpus: House, or the Stock file of its kind */
export const fileFor = (fx, to) => (to === 'stock' ? stockFile(fx) : to === 'house' ? HOUSE_FILE : null);

/**
 * Write one FX into its corpus file (the same id there is replaced). Returns the file written.
 * The caller has validated and stamped it; nothing is checked here but the file.
 */
export async function writeFx(fx, to) {
  const file = fileFor(fx, to);
  if (!file) throw new Error(to === 'stock' ? 'an Item Hook (no ability key) lives in House, not Stock' : `"${to}" is not a corpus (house or stock)`);
  const json = await readModuleFile(file);
  json.fx = [...(json.fx ?? []).filter((l) => l.id !== fx.id), fx];
  json._meta = { ...(json._meta ?? {}), fx: json.fx.length, written: today() };
  await writeModuleFile(file, json);
  return file;
}

/**
 * Erase an FX for good, out of the corpus file that holds THE ONE YOU SEE: the winning layer —
 * House when the id is there (a House override deleted leaves the Stock FX of that id showing),
 * else Stock. `from` names a layer outright. Nothing marks the place: once something is deleted it
 * is gone (the user, 2026-09-06). Returns the files rewritten.
 */
export async function erase(id, { corpora = null, from = null } = {}) {
  const inHouse = !!corpora?.house?.some((l) => l.id === id);
  const layer = from ?? (inHouse ? 'house' : 'stock');
  const files = new Set();
  if (layer === 'house' && inHouse) files.add(HOUSE_FILE);
  if (layer === 'stock') for (const l of corpora?.stock ?? []) if (l.id === id) { const f = stockFile(l); if (f) files.add(f); }
  const written = [];
  for (const file of files) {
    const json = await readModuleFile(file);
    const before = (json.fx ?? []).length;
    json.fx = (json.fx ?? []).filter((l) => l.id !== id);
    if (json.fx.length === before) continue;
    json._meta = { ...(json._meta ?? {}), fx: json.fx.length, erased: today() };
    await writeModuleFile(file, json);
    written.push(file);
  }
  return { ok: written.length > 0, written };
}
