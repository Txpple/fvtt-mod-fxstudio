// The corpus: looks indexed by (subject key, moment kind) across the layers, later wins
// (world buffer → house → baseline), plus the starters looks inherit from. Resolution is an exact
// map hit on the first of a subject's keys that has a look; nothing is derived from a name.
// Pure: the tools run the very same lookup offline that the module runs at the table.
import { expand, validate, withDefaults } from './looks.js';

/** the layers in the order they win */
export const LAYERS = ['world', 'house', 'baseline'];

/**
 * @param corpora  {baseline: [look…], house: [look…], world: [look…], starters: [look…]}
 * @returns an index {byId, byKey: Map<"key|on", [{look, source}…]>, starters: Map, problems: [sentences]}
 */
export function buildIndex({ baseline = [], house = [], world = [], starters = [] } = {}) {
  const problems = [];
  const starterMap = new Map();
  for (const s of starters) if (s?.id) starterMap.set(`starter:${s.id}`, { ...s, id: `starter:${s.id}` });
  // by id, later wins: a house look with a baseline look's id replaces it
  const raw = new Map();
  const sourceOf = new Map();
  for (const [source, looks] of [['baseline', baseline], ['house', house], ['world', world]]) {
    for (const look of looks) {
      if (!look?.id) { problems.push(`${source}: a look with no id`); continue; }
      raw.set(look.id, look);
      sourceOf.set(look.id, source);
    }
  }
  const ids = new Set([...raw.keys(), ...starterMap.keys()]);
  const lookup = (id) => raw.get(id) ?? starterMap.get(id) ?? null;
  const byId = new Map();
  for (const [id, look] of raw) {
    const errs = validate(look, { ids });
    if (errs.length) { problems.push(`${sourceOf.get(id)} "${id}": ${errs.join('; ')}`); continue; }
    try {
      const expanded = look.off ? { ...look } : expand(look, lookup);
      byId.set(id, { look: expanded, original: look, source: sourceOf.get(id) });
    } catch (e) { problems.push(`${sourceOf.get(id)} "${id}": ${e.message}`); }
  }
  // by key and kind, the later layer first
  const byKey = new Map();
  const rank = (source) => LAYERS.indexOf(source);
  for (const entry of byId.values()) {
    const { look } = entry;
    for (const key of look.for ?? []) {
      const on = look.off && !look.on ? '*' : look.on;
      const k = `${key}|${on}`;
      (byKey.get(k) ?? byKey.set(k, []).get(k)).push(entry);
    }
  }
  for (const list of byKey.values()) list.sort((a, b) => rank(a.source) - rank(b.source));
  return { byId, byKey, starters: starterMap, problems, counts: { baseline: baseline.length, house: house.length, world: world.length, starters: starters.length } };
}

/** does the look need what the moment has? A look with a scene at the template needs a placed template. */
export function needsPlace(look) {
  return (look.scenes ?? []).some((s) => { const f = withDefaults(s); return f.shape === 'fill' || f.at === 'template' || f.to === 'template' || f.from === 'template'; });
}

/**
 * The look that answers: the first key with a look for this moment kind; among those, one that uses
 * the placed template when the moment has one, else one that does not; a house look that is `off`
 * silences the key. Returns {look, key, source} or {look: null, why}.
 * @param index   from buildIndex
 * @param keys    the subject's keys, most specific first
 * @param on      the moment kind
 * @param opts    {hasPlace: the moment carries a placed template}
 */
export function resolve(index, keys, on, { hasPlace = false } = {}) {
  for (const key of keys ?? []) {
    const candidates = [...(index.byKey.get(`${key}|${on}`) ?? []), ...(index.byKey.get(`${key}|*`) ?? [])];
    if (!candidates.length) continue;
    // the winning layer's own answer first: an off look there silences the key
    const top = candidates[0];
    if (top.look.off) return { look: null, key, source: top.source, why: `"${key}" is switched off by ${top.source} "${top.look.id}"` };
    const fits = candidates.filter((c) => !c.look.off && needsPlace(c.look) === hasPlace);
    const pick = fits[0] ?? candidates.find((c) => !c.look.off);
    if (!pick) continue;
    return { look: pick.look, key, source: pick.source, original: pick.original };
  }
  return { look: null, why: keys?.length ? `no look for ${keys.join(', ')}` : 'the subject has no keys' };
}

/** every look, later layer winning per id, for the screens and the census */
export function allLooks(index) {
  return [...index.byId.values()];
}

/** every look that answers a key on any moment kind (the Look up card's "why") */
export function looksFor(index, key) {
  const out = [];
  for (const [k, list] of index.byKey) if (k.startsWith(`${key}|`)) for (const e of list) out.push({ ...e, on: k.split('|')[1] });
  return out;
}
