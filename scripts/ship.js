// Shipping the corpus from the game (DESIGN §8, ruled 2026-09-06). An FX written in this world is
// a draft until it is bound for a corpus (`to: house | baseline`, core/fx.js). Ship folds every
// bound FX into its corpus file inside the module's own folder on the server (Foundry lets a GM
// upload files), adds a line with the version to the shipping record (recipes/shipped.json) and
// takes the shipped fx out of the world buffer: from then on they
// come from the corpus like every other fx. The repo pulls those files back with
// tools/pull-corpus.mjs; git, the tag and the release stay there. Nothing here is a rule about
// fx: it moves files and keeps the record.
import { MODULE_ID, getWorldFx, setWorldFx } from './settings.js';
import { parseKey } from './core/subjects.js';

/** the baseline file a key's kind belongs in */
export const KIND_FILES = { spell: 'spells', weapon: 'weapons', natural: 'natural', feature: 'features', item: 'items', effect: 'effects' };
export const TO_WORDS = { house: 'the house corpus', baseline: 'the main corpus' };
export const HOUSE_FILE = 'recipes/house.json';
export const RECORD_FILE = 'recipes/shipped.json';

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

/** the corpus file an FX bound for the baseline belongs in, by the kind of its first key; null when it has none */
export function baselineFile(fx) {
  const kind = parseKey(fx?.for?.[0] ?? '')?.kind;
  const f = KIND_FILES[kind];
  return f ? `recipes/baseline/${f}.json` : null;
}
export const fileFor = (fx) => (fx.to === 'baseline' ? baselineFile(fx) : fx.to === 'house' ? HOUSE_FILE : null);

/**
 * Erase an FX for good: out of the world buffer, and out of every corpus file in the module that
 * holds its id (the house file, the baseline file of its kind). Nothing marks the place: once
 * something is deleted it is gone (the user, 2026-09-06). Returns the files rewritten.
 */
export async function erase(id, { corpora = null } = {}) {
  const files = new Set();
  if (corpora?.house?.some((l) => l.id === id)) files.add(HOUSE_FILE);
  for (const l of corpora?.baseline ?? []) if (l.id === id) { const f = baselineFile(l); if (f) files.add(f); }
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
  const buffer = getWorldFx();
  const inBuffer = buffer.some((l) => l.id === id);
  if (inBuffer) await setWorldFx(buffer.filter((l) => l.id !== id));
  return { ok: written.length > 0 || inBuffer, written, fromBuffer: inBuffer };
}

/** what is written in this world: the drafts, and the FX bound for a corpus with the file each goes to */
export function pending() {
  const buffer = getWorldFx();
  return {
    drafts: buffer.filter((l) => !l.to),
    bound: buffer.filter((l) => l.to).map((l) => ({ fx: l, to: l.to, file: fileFor(l) })),
  };
}

/** bind a draft for a corpus (`to`), or make it a draft again (`to` empty) */
export async function stage(id, to) {
  const buffer = getWorldFx();
  const fx = buffer.find((l) => l.id === id);
  if (!fx) return { ok: false, problems: [`no FX "${id}" is written in this world`] };
  if (to && !TO_WORDS[to]) return { ok: false, problems: [`"${to}" is not a corpus (house or baseline)`] };
  if (to === 'baseline' && !baselineFile(fx)) return { ok: false, problems: ['an FX with no ability of its own belongs in the house corpus'] };
  if (to) fx.to = to; else delete fx.to;
  await setWorldFx(buffer);
  return { ok: true, fx };
}

/** the version numbers a ship can stamp next: a fix (patch) or something people will notice (minor) */
export function nextVersions(current) {
  const [a = 0, b = 0, c = 0] = String(current ?? '0.0.0').split('.').map((n) => Number(n) || 0);
  return { patch: `${a}.${b}.${c + 1}`, minor: `${a}.${b + 1}.0` };
}

/**
 * Ship: every bound FX into its corpus file, the version stamped, the record kept, the buffer
 * relieved of what shipped. Returns {ok, version, previous, written: [{file, fx}], record}.
 */
export async function ship({ version = null, note = '', by = null } = {}) {
  const { bound } = pending();
  if (!bound.length) return { ok: false, problems: ['nothing is bound for a corpus yet'] };
  const byFile = new Map();
  for (const b of bound) (byFile.get(b.file) ?? byFile.set(b.file, []).get(b.file)).push(b.fx);
  const written = [];
  for (const [file, fx] of byFile) {
    const json = await readModuleFile(file);
    const ids = new Set(fx.map((l) => l.id));
    const clean = fx.map(({ to, ...l }) => l);
    json.fx = [...(json.fx ?? []).filter((l) => !ids.has(l.id)), ...clean];
    json._meta = { ...(json._meta ?? {}), fx: json.fx.length, shipped: today(), ...(version ? { version } : {}) };
    await writeModuleFile(file, json);
    written.push({ file, fx: fx.map((l) => l.id) });
  }
  // the version lives in the record, not in module.json: the running module's manifest is never
  // rewritten under it (Foundry refuses that upload anyway); tools/pull-corpus.mjs stamps the repo's
  const record = await readModuleFile(RECORD_FILE).catch(() => ({ shipped: [] }));
  const previous = record.shipped?.[0]?.version ?? game.modules.get(MODULE_ID)?.version ?? '0.0.0';
  const entry = { version: version ?? previous, at: today(), by, note, fx: bound.map((b) => ({ id: b.fx.id, to: b.to })) };
  record.shipped = [entry, ...(record.shipped ?? [])];
  await writeModuleFile(RECORD_FILE, record);
  await setWorldFx(getWorldFx().filter((l) => !l.to));
  return { ok: true, version: entry.version, previous, written, record: entry };
}
