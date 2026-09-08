// THE RECORDS — where a key's evidence lives, so a screen can open it.
//
// A key is earned offline, once, when a name meets the closed lists (tools/lib/migrate/keys.mjs);
// `recipes/records.json` is that same moment written down: Foundry's own uuid for the compendium
// record (or the item on this world's actor), plus the words a person reads. Nothing here searches
// for a record BY NAME — that rule lives at the migration and never at the table — and the engine
// never reads any of this. It is the screens' file alone.
//
// Read when the window opens, not at boot: the corpus plays without it, and it is the biggest file
// the module ships. Read once per session; a row renders greyed until it arrives.
import { MODULE_ID } from '../settings.js';
import { idWords } from './html.js';

let records = null;
let reading = null;

/** read recipes/records.json once; resolves true when the map is here, false when it is not */
export function readRecords() {
  if (records) return Promise.resolve(true);
  reading ??= fetch(`modules/${MODULE_ID}/recipes/records.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
    .then((j) => { records = j.records ?? {}; return true; })
    .catch((e) => { console.warn('FX Studio | no records file, so no row can open one:', e.message); records = {}; return false; });
  return reading;
}

export const recordsRead = () => !!records;

/** the record a key's evidence lives in: {uuid, name, where, on?, of?}, or null */
export const recordFor = (key) => (key && records?.[key]) || null;

/**
 * WHAT AN FX IS CALLED — the record's own name, spelled as the book spells it (the user,
 * 2026-09-08: "cant you just make it good and consistent for me?"). Every screen asks this one
 * question, so the Library, the Editor, Assets and Corpus never disagree.
 *
 * Before the records existed a name could only be un-slugged from the key, which reads the ability
 * back in the migration's spelling rather than the book's: `feature:light` is the PHB's LIGHT
 * DOMAIN, `spell:helpful-homunculi` is DERYAN'S Helpful Homunculi, and `weapon:lighthammer` is a
 * LIGHT HAMMER — dnd5e's own base-weapon id, which is not a name at all.
 *
 * An `effect:` key is the exception and keeps its own id: its record is the spell or item that
 * APPLIES the effect, so the record's name is Bless where the FX is Blessed.
 */
export function nameForKey(key, fallback = null) {
  if (!key) return fallback;
  const [kind, id] = String(key).split(':');
  const own = idWords((id ?? '').split('/')[0]);
  if (kind === 'effect') return own;
  return recordFor(key)?.name ?? fallback ?? own;
}

/**
 * What the door says when you rest on it. An `effect:` key's record is the spell, feature or item
 * that CARRIES the effect — an effect is not an item, so nothing else could be opened — and a
 * natural attack's record is one creature that has it, of however many share it.
 */
export function recordWords(rec, kind = null) {
  if (!rec) return '';
  const what = rec.on ? `${rec.name} on ${rec.on}` : rec.name;
  const tail = kind === 'effect' ? ' — the record that carries this effect'
    : rec.of ? ` — one of ${rec.of} creatures with it`
    : '';
  return `Open ${what} · ${rec.where}${tail}`;
}

/** open a record in its own sheet; a book that is not installed says so rather than doing nothing */
export async function openRecord(uuid, name = null) {
  const doc = uuid ? await fromUuid(uuid).catch(() => null) : null;
  if (!doc) {
    ui.notifications?.warn(`FX Studio: ${name ?? 'that record'} is not in this world — the book it lives in may not be installed.`);
    return null;
  }
  return doc.sheet?.render(true) ?? null;
}
