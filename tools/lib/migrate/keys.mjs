// The closed lists a migrated look is keyed against (ARCHITECTURE §3): the spells, features and
// items of the installed books and the system, the base weapons, the natural attacks of the
// installed creatures, and the world's own items. A row's label meets these lists ONCE, here, and
// becomes explicit keys; no name rule survives into the corpus.
import { existsSync } from 'node:fs';
import { MODULES } from '../env.mjs';
import { packDir, readActors, readPackItems, snapshot } from '../leveldb.mjs';
import { BASE_WEAPONS, BASE_WEAPON_NAMES, CREATURE_PACKS, LIST_PACKS } from '../dnd5e.mjs';
import { nameForms, slug } from '../../../scripts/core/subjects.js';

/** the phase-1 whole-word rule, run once at migration: the label names the END of a name as whole words, an optional plural and a trailing "+1" or parenthesis allowed */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const wordRule = (label) => new RegExp(`(^|[^a-z0-9])${escapeRe(label.trim().toLowerCase()).replace(/ /g, '\\s+')}s?(\\s*\\+\\s*\\d+)?(\\s*\\([^)]*\\))?\\s*$`, 'i');

/**
 * Build the lists. Returns {spells, features, items, weapons, natural, world, kindsOfName, expandWord, stats}
 *   spells/features/items  Map<slug(name), {name, identifier, kind, from}>
 *   weapons                Map<slug(name), {name, baseItem, from}> (equipment weapons with a base item)
 *   natural                Map<slug(name), {name, count, creatures: [names…]}> (natural weapons on creatures)
 *   world                  {items: [{name, type, baseItem, natural, actor}], effects: [names]}
 */
export async function buildLists({ worldActors, worldItems, worldEffects }) {
  const spells = new Map(), features = new Map(), items = new Map(), weapons = new Map(), natural = new Map();
  const stats = { packs: [], skipped: [] };
  const put = (map, name, extra) => { const k = slug(name); if (!k) return; if (!map.has(k)) map.set(k, { name, ...extra }); };
  for (const [mod, pack, kind] of LIST_PACKS) {
    const dir = MODULES[mod] ? packDir(MODULES[mod], pack) : null;
    if (!dir) { stats.skipped.push(`${mod}/${pack}`); continue; }
    const docs = await readPackItems(snapshot(dir, `${mod}-${pack}`));
    let n = 0;
    for (const it of docs) {
      n++;
      const identifier = it.system?.identifier || slug(it.name);
      if (it.type === 'spell') put(spells, it.name, { identifier, kind: 'spell', from: `${mod}/${pack}` });
      else if (it.type === 'feat' || it.type === 'class' || it.type === 'subclass' || it.type === 'background' || it.type === 'race') put(features, it.name, { identifier, kind: 'feature', from: `${mod}/${pack}` });
      else if (it.type === 'weapon') {
        if (it.system?.type?.value === 'natural') put(natural, it.name, { count: 0, creatures: [] });
        else put(weapons, it.name, { baseItem: it.system?.type?.baseItem || null, from: `${mod}/${pack}` });
        put(items, it.name, { identifier, kind: 'weapon', from: `${mod}/${pack}` });
      } else if (['consumable', 'equipment', 'tool', 'loot', 'container'].includes(it.type)) put(items, it.name, { identifier, kind: 'item', from: `${mod}/${pack}` });
    }
    stats.packs.push(`${mod}/${pack}: ${n}`);
  }
  // the natural attacks: every natural weapon on every creature in the installed books
  for (const [mod, pack] of CREATURE_PACKS) {
    const dir = MODULES[mod] ? packDir(MODULES[mod], pack) : null;
    if (!dir) { stats.skipped.push(`${mod}/${pack}`); continue; }
    const { actors, items: byActor } = await readActors(snapshot(dir, `${mod}-${pack}-actors`));
    let n = 0;
    for (const [actorId, list] of Object.entries(byActor)) {
      for (const it of list) {
        if (it.type !== 'weapon' || it.system?.type?.value !== 'natural') continue;
        n++;
        const k = slug(it.name);
        const e = natural.get(k) ?? natural.set(k, { name: it.name, count: 0, creatures: [] }).get(k);
        e.count++;
        if (e.creatures.length < 6 && actors[actorId]?.name && !e.creatures.includes(actors[actorId].name)) e.creatures.push(actors[actorId].name);
      }
    }
    stats.packs.push(`${mod}/${pack}: ${n} natural attacks`);
  }
  // the world's own items
  const world = { items: [], effects: [] };
  for (const [actorId, list] of Object.entries(worldItems ?? {})) {
    const actor = worldActors?.[actorId];
    for (const it of list) {
      if (!['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool', 'loot'].includes(it.type)) continue;
      world.items.push({ name: it.name, type: it.type, identifier: it.system?.identifier || null, baseItem: it.system?.type?.baseItem || null, natural: it.type === 'weapon' && it.system?.type?.value === 'natural', actor: actor?.name ?? actorId, actorType: actor?.type ?? '?' });
    }
  }
  for (const list of Object.values(worldEffects ?? {})) for (const ef of list) if (ef.name && !world.effects.includes(ef.name)) world.effects.push(ef.name);

  /** which kinds a label is, by the lists: [{kind, id, from}] — the identifier where the list has one */
  function kindsOfName(label, { only = null } = {}) {
    const out = [];
    const seen = new Set();
    const add = (kind, id, from) => { if (only && !only.includes(kind)) return; const k = `${kind}:${id}`; if (!seen.has(k)) { seen.add(k); out.push({ kind, id, from }); } };
    for (const form of nameForms(label)) {
      const k = slug(form);
      if (!k) continue;
      const sp = spells.get(k); if (sp) { add('spell', sp.identifier, sp.from); if (sp.identifier !== k) add('spell', k, 'the name'); }
      const ft = features.get(k); if (ft) { add('feature', ft.identifier, ft.from); if (ft.identifier !== k) add('feature', k, 'the name'); }
      if (BASE_WEAPONS.includes(k)) add('weapon', k, 'the base weapons');
      const baseByName = Object.entries(BASE_WEAPON_NAMES).find(([, n]) => slug(n) === k)?.[0];
      if (baseByName && baseByName !== k) add('weapon', baseByName, 'the base weapons');
      const wp = weapons.get(k); if (wp) add('weapon', k, wp.from);
      const nt = natural.get(k); if (nt) add('natural', k, `${nt.count} creatures`);
      const it = items.get(k); if (it && it.kind === 'item') add('item', it.identifier, it.from);
      for (const w of world.items) {
        if (slug(w.name) !== k) continue;
        if (w.type === 'weapon') add(w.natural ? 'natural' : 'weapon', k, `the world (${w.actor})`);
        else if (w.type === 'spell') add('spell', w.identifier || k, `the world (${w.actor})`);
        else if (w.type === 'feat') add('feature', w.identifier || k, `the world (${w.actor})`);
        else add('item', k, `the world (${w.actor})`);
      }
    }
    return out;
  }

  /**
   * A family row's word ("Sword", "Bite", "Axe") expanded once against the closed lists: the base
   * weapons, the natural attacks, the books' and the world's weapons. What the word would also have
   * caught outside weapons (a feat, a wand, a spell) is NOT carried — it is returned as `notCarried`
   * for the user to keep with one word. Returns {keys: [{kind, id, name, from}], notCarried: [sentences]}.
   */
  function expandWord(label) {
    const re = wordRule(label);
    const out = [];
    const notCarried = [];
    const seen = new Set();
    const add = (kind, id, name, from) => { const k = `${kind}:${id}`; if (!seen.has(k)) { seen.add(k); out.push({ kind, id, name, from }); } };
    for (const id of BASE_WEAPONS) if (re.test(BASE_WEAPON_NAMES[id])) add('weapon', id, BASE_WEAPON_NAMES[id], 'the base weapons');
    for (const [k, e] of natural) if (re.test(e.name)) add('natural', k, e.name, `${e.count} creatures (${e.creatures.slice(0, 3).join(', ')})`);
    for (const [k, e] of weapons) if (re.test(e.name)) add('weapon', k, e.name, e.from);
    // the world's own weapons; anything else the word would have caught is listed, not carried
    for (const w of world.items) {
      if (!re.test(w.name)) continue;
      const k = slug(w.name);
      if (w.type === 'weapon') add(w.natural ? 'natural' : 'weapon', k, w.name, `the world (${w.actor})`);
      else notCarried.push(`${w.name} [${w.type}] on ${w.actor}`);
    }
    for (const [k, e] of spells) if (re.test(e.name) && slug(e.name) !== slug(label)) notCarried.push(`${e.name} [spell] (${e.from})`);
    return { keys: out, notCarried: [...new Set(notCarried)] };
  }

  return { spells, features, items, weapons, natural, world, kindsOfName, expandWord, stats };
}

export const packExists = (mod, pack) => !!(MODULES[mod] && existsSync(`${MODULES[mod]}/packs/${pack}`));
