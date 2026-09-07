// The corpus: fx indexed by (subject key, moment kind) across the layers, later wins
// (world buffer → house → stock), plus the starters the screens stamp
// a fresh scene out of (nothing in a corpus ever refers to one). Resolution is an exact
// map hit on the first of a subject's keys that has an FX; nothing is derived from a name.
// Pure: the tools run the very same lookup offline that the module runs at the table.
import { validate, withDefaults } from './fx.js';

/** the layers in the order they win */
export const LAYERS = ['world', 'house', 'stock'];
/** the term for each layer on a screen: the world buffer is a Draft, the files are House and Stock */
export const LAYER_WORDS = { world: 'Draft', house: 'House', stock: 'Stock' };

/**
 * @param corpora  {stock: [fx…], house: [fx…], world: [fx…], starters: [fx…]}
 * @returns an index {byId, byKey: Map<"key|on", [{fx, source}…]>, starters: Map, problems: [sentences]}
 */
export function buildIndex({ stock = [], house = [], world = [], starters = [] } = {}) {
  const problems = [];
  const starterMap = new Map();
  for (const s of starters) if (s?.id) starterMap.set(`starter:${s.id}`, { ...s, id: `starter:${s.id}` });
  // by id, later wins: a house fx with a stock fx's id replaces it
  const raw = new Map();
  const sourceOf = new Map();
  for (const [source, list] of [['stock', stock], ['house', house], ['world', world]]) {
    for (const fx of list) {
      if (!fx?.id) { problems.push(`${source}: an FX with no id`); continue; }
      raw.set(fx.id, fx);
      sourceOf.set(fx.id, source);
    }
  }
  const byId = new Map();
  // every FX states itself in full (no shortcuts, ruled 2026-09-07), so what plays is what was
  // written; the copy is kept so a screen editing it cannot reach into the corpus
  for (const [id, fx] of raw) {
    const errs = validate(fx);
    if (errs.length) { problems.push(`${sourceOf.get(id)} "${id}": ${errs.join('; ')}`); continue; }
    byId.set(id, { fx: JSON.parse(JSON.stringify(fx)), original: fx, source: sourceOf.get(id) });
  }
  // by key and kind, the later layer first
  const byKey = new Map();
  const rank = (source) => LAYERS.indexOf(source);
  for (const entry of byId.values()) {
    const { fx } = entry;
    for (const key of fx.for ?? []) {
      const on = fx.off && !fx.on ? '*' : fx.on;
      const k = `${key}|${on}`;
      (byKey.get(k) ?? byKey.set(k, []).get(k)).push(entry);
    }
  }
  for (const list of byKey.values()) list.sort((a, b) => rank(a.source) - rank(b.source));
  return { byId, byKey, starters: starterMap, problems, counts: { stock: stock.length, house: house.length, world: world.length, starters: starters.length } };
}

/** does the FX need what the moment has? An FX with a scene at the template needs a placed template. */
export function needsPlace(fx) {
  return (fx.scenes ?? []).some((s) => { const f = withDefaults(s); return f.shape === 'fill' || f.at === 'template' || f.to === 'template' || f.from === 'template'; });
}

/**
 * The FX that answers: the first key with an FX for this moment kind; among those, one that uses
 * the placed template when the moment has one, else one that does not; a house fx that is `off`
 * silences the key. Returns {fx, key, source} or {fx: null, why}.
 * @param index   from buildIndex
 * @param keys    the subject's keys, most specific first
 * @param on      the moment kind
 * @param opts    {hasPlace: the moment carries a placed template; pointer: the FX id one specific item names (its own FX, ahead of every key)}
 */
export function resolve(index, keys, on, { hasPlace = false, pointer = null } = {}) {
  if (pointer) {
    const own = index.byId.get(pointer);
    if (own && (own.fx.off || own.fx.on === on)) {
      if (own.fx.off) return { fx: null, off: true, key: 'this item', source: own.source, why: `this item's own FX "${pointer}" is switched off` };
      return { fx: own.fx, key: 'this item', source: own.source, original: own.original, pointer };
    }
  }
  for (const key of keys ?? []) {
    const candidates = [...(index.byKey.get(`${key}|${on}`) ?? []), ...(index.byKey.get(`${key}|*`) ?? [])];
    if (!candidates.length) continue;
    // the winning layer's own answer first: an off fx there silences the key
    const top = candidates[0];
    if (top.fx.off) return { fx: null, off: true, key, source: top.source, why: `"${key}" is switched off by ${top.source} "${top.fx.id}"` };
    const fits = candidates.filter((c) => !c.fx.off && needsPlace(c.fx) === hasPlace);
    const pick = fits[0] ?? candidates.find((c) => !c.fx.off);
    if (!pick) continue;
    return { fx: pick.fx, key, source: pick.source, original: pick.original };
  }
  return { fx: null, why: keys?.length ? `no FX for ${keys.join(', ')}` : 'the subject has no keys' };
}

/** every FX, later layer winning per id, for the screens and the census */
export function allFx(index) {
  return [...index.byId.values()];
}

/** every FX that answers a key on any moment kind (the Look up card's "why") */
export function fxFor(index, key) {
  const out = [];
  for (const [k, list] of index.byKey) if (k.startsWith(`${key}|`)) for (const e of list) out.push({ ...e, on: k.split('|')[1] });
  return out;
}
