// THE RECORD AN FX CARRIES — where its key's evidence lives, ON THE FX (the user, 2026-09-09:
// "every fx file should be completely isolateable, because multiple people may be working on fx
// at any given time, less risk of data loss, and import/export of fx functionality requires it").
//
// Before this an FX carried only its key, and what the key pointed at lived in recipes/records.json
// alone (DESIGN §15). An exported Misty Step was a key and some scenes; a person reading it could
// not tell what it was for without a second file — the same smell as a lookup table beside the
// data. Now `record` is on the FX: {uuid, name, where}, plus `on` and `of` where they mean something.
//
// It is STAMPED, never typed: every writer (the migration, api.fx.save, tools/records.mjs) sets it
// from records.json by the FX's key at the moment it writes. records.json stays — it is the address
// book for every key that has NO FX yet, and the source the stamp is taken from. And a uuid is
// evidence AT THIS INSTALL: an FX from a table that holds Misty Step only in the SRD pack carries
// their uuid, which is why the screens read the FX's record first and fall back to records.json by
// key — so a foreign FX still opens the right door here. Pure: no I/O, nothing of Foundry.

/** the fields a record may carry, in the order they are written */
export const RECORD_FIELDS = ['uuid', 'name', 'where', 'on', 'of'];

/** problems with a record's shape, in sentences; [] when it is well formed or absent */
export function recordProblems(rec) {
  if (rec === undefined) return [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return ['"record" must be an object: {uuid, name, where}'];
  const out = [];
  for (const k of ['uuid', 'name', 'where']) if (typeof rec[k] !== 'string' || !rec[k]) out.push(`"record.${k}" must be a non-empty string`);
  if (rec.on !== undefined && typeof rec.on !== 'string') out.push('"record.on" must be a string (the creature a natural attack sits on)');
  if (rec.of !== undefined && !Number.isInteger(rec.of)) out.push('"record.of" must be a whole number (how many creatures share it)');
  for (const k of Object.keys(rec)) if (!RECORD_FIELDS.includes(k)) out.push(`a record does not have a "${k}"`);
  return out;
}

/** a record copied with its fields in the written order and nothing else */
const tidy = (rec) => Object.fromEntries(RECORD_FIELDS.filter((k) => rec[k] !== undefined).map((k) => [k, rec[k]]));

/**
 * The FX with its record stamped from the records map by its first key. An FX with no key (an
 * Item Hook) carries none. A key the map does not hold keeps whatever record the FX already has
 * (a foreign FX keeps its own evidence) — nothing is invented. Field order: id, for, record, then
 * the rest as they were.
 */
export function stampRecord(fx, records) {
  if (!fx || typeof fx !== 'object') return fx;
  const key = fx.for?.[0];
  const rec = key && records ? records[key] : undefined;
  const { id, for: keys, record: own, ...rest } = fx;
  const chosen = rec ? tidy(rec) : own && typeof own === 'object' ? tidy(own) : undefined;
  const out = { id };
  if (keys !== undefined) out.for = keys;
  if (chosen && keys?.length) out.record = chosen;
  return Object.assign(out, rest);
}

/** the record an FX stands on: its own first, then the map by its key, then nothing */
export const recordOf = (fx, records = null) => fx?.record ?? (fx?.for?.[0] && records ? records[fx.for[0]] : null) ?? null;

/** true when the FX's record says the same as the map's for its key (the drift check) */
export function recordAgrees(fx, records) {
  const key = fx?.for?.[0];
  if (!key || !records?.[key]) return true;
  return JSON.stringify(tidy(records[key])) === JSON.stringify(fx.record ? tidy(fx.record) : null);
}
