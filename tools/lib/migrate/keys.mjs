// The closed lists a migrated fx is keyed against (ARCHITECTURE §3): the spells, features and
// items of the installed books and the system, and the natural attacks of the installed creatures.
// A row's label meets these lists ONCE, here, and becomes explicit keys; no name rule survives into
// the corpus.
//
// ONE KEY PER ITEM, DND5E'S IDENTIFIER (the user, 2026-09-12, DESIGN §23). The key a record earns is
// `<kind>:<identifier>` — the record's own `system.identifier`, else dnd5e's formatting of its name
// — for EVERY kind, weapons and natural attacks included; no second key from the name's slug, and no
// base-weapon key (`weapon:maul` is the PHB Maul's identifier, not a family). The name forms
// ("Potion of Healing (Greater)" → "Potion of Healing") live HERE now and nowhere in scripts/: they
// are how an AA row's label meets the records, once, offline — the reader at the table is exact.
//
// ⚠ STOCK IS THE BOOKS; HOUSE IS THIS TABLE (the user, 2026-09-08: "the 1-dagger is NOT a
// compendium item then, which is what you were supposed to weed out — stuff non-compendium
// (except first light and goldthorn)"). This world's own items are read — the census and the
// report need them — but they are evidence only with `{world: true}`, which is what a HOUSE row
// is keyed with. A shipped stock FX may not be keyed to one table's inventory: stock is the D&D5e
// Animations corpus, and something only this world has belongs in the user's own house.json, the
// way First Light and Goldthorn do. SEVEN keys had come into stock that way: six weapons (+1
// Dagger, Ember-Touched Greatsword, Sera's Shortsword, Vesper Staff, Marn's Light Crossbow, Sera's
// Longbow) and one natural attack (Necrotic Scythe). The `{world: true}` half is not a nicety: the
// three AA house rows that exist only here — First Light, Goldthorn, Unholy Word — would otherwise
// have become unkeyable, which is the opposite of what the user asked for.
import { existsSync } from 'node:fs';
import { MODULES, packageMeta } from '../env.mjs';
import { packDir, readActors, readPackEffects, readPackItems, snapshot } from '../leveldb.mjs';
import { CREATURE_PACKS, LIST_PACKS } from '../dnd5e.mjs';
import { identifierOf, slug } from '../../../scripts/core/subjects.js';

/**
 * The name, then the name with a qualifier dnd5e or the DM appends removed: "Misty Step - Spellcasting"
 * (an NPC's spell), "Bless - Fey-Touched" (a granted spell), "Potion of Healing (Greater)". Used only
 * to meet an AA row's label with the records, here, once. Not a rule of the reader.
 */
export function nameForms(name) {
  const forms = [name];
  const dash = name?.match(/^(.+?)\s+[-–—]\s+.+$/);
  if (dash) forms.push(dash[1]);
  const paren = name?.match(/^(.+?)\s*\([^)]*\)\s*$/);
  if (paren) forms.push(paren[1]);
  return [...new Set(forms.filter(Boolean))];
}

/** the phase-1 whole-word rule, run once at migration: the label names the END of a name as whole words, an optional plural and a trailing "+1" or parenthesis allowed */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const wordRule = (label) => new RegExp(`(^|[^a-z0-9])${escapeRe(label.trim().toLowerCase()).replace(/ /g, '\\s+')}s?(\\s*\\+\\s*\\d+)?(\\s*\\([^)]*\\))?\\s*$`, 'i');

/**
 * Build the lists. Returns {spells, features, items, weapons, natural, world, kindsOfName, expandWord, stats}
 *   spells/features/items  Map<slug(name), {name, identifier, kind, from}>
 *   weapons                Map<slug(name), {name, identifier, from}> (the books' weapons)
 *   natural                Map<slug(name), {name, identifier, count, creatures: [names…]}> (natural weapons on creatures)
 *   alsoBy                 Map<slug(a shorter form of a record's name), [{kind, identifier, name, from}]> — "Potion of Healing" also meets the Greater one
 *   world                  {items: [{name, type, identifier, natural, actor}], effects: [names]}
 *   effects / bookEffects  Set<slug(name)> — every ActiveEffect there is / the ones a BOOK holds (the evidence)
 *   records                Map<key, {uuid, name, where, on?, of?}> — the record each key's evidence lives in
 */
export async function buildLists({ worldActors, worldItems, worldEffects }) {
  const spells = new Map(), features = new Map(), items = new Map(), weapons = new Map(), natural = new Map();
  // `effects` is every effect name there is (the books' and this world's), which the report reads;
  // `bookEffects` is the evidence — an effect a DM made here does not carry a stock FX.
  const effects = new Set();
  const bookEffects = new Set();
  const stats = { packs: [], skipped: [] };
  const put = (map, name, extra) => { const k = slug(name); if (!k) return; if (!map.has(k)) map.set(k, { name, ...extra }); };
  // a record whose name carries a qualifier also meets the label of the plain name, so an AA row
  // "Potion of Healing" fans out to the Greater, Superior and Supreme records as well — what the
  // reader's name forms used to do at the table, done here once, and written as exact keys
  // ONE DOCUMENT, TWO IDENTIFIERS (the user, 2026-09-13): the system's SRD 5.2 copy of a book's record
  // is the same document id, but the SRD strips the product identity, so 36 of them carry another
  // identifier ("Melf's Acid Arrow" → melfs-acid-arrow in the PHB, "Acid Arrow" → acid-arrow in the
  // system). Both copies are dragged onto sheets, so both keys are earned: a row that meets one meets
  // its twins. twins: "<kind>:<identifier>" → [other identifiers of the same document]
  const twins = new Map();
  const seenDoc = new Map(); // _id → [{kind, identifier}]
  const twin = (kind, identifier, docId) => {
    const list = seenDoc.get(docId) ?? seenDoc.set(docId, []).get(docId);
    for (const o of list) {
      if (o.kind !== kind || o.identifier === identifier) continue;
      const a = twins.get(`${kind}:${o.identifier}`) ?? twins.set(`${kind}:${o.identifier}`, []).get(`${kind}:${o.identifier}`);
      if (!a.includes(identifier)) a.push(identifier);
      const b = twins.get(`${kind}:${identifier}`) ?? twins.set(`${kind}:${identifier}`, []).get(`${kind}:${identifier}`);
      if (!b.includes(o.identifier)) b.push(o.identifier);
    }
    if (!list.some((o) => o.kind === kind && o.identifier === identifier)) list.push({ kind, identifier });
  };
  const alsoBy = new Map();
  const also = (kind, identifier, name, from) => { for (const form of nameForms(name).slice(1)) { const k = slug(form); if (!k) continue; const list = alsoBy.get(k) ?? alsoBy.set(k, []).get(k); if (!list.some((e) => e.kind === kind && e.identifier === identifier)) list.push({ kind, identifier, name, from }); } };
  // THE RECORD a key's evidence lives in, addressed ONCE, here, where the evidence is met — never
  // searched for again by name at the table. Keyed by the KEY, not by an FX, so an FX written later
  // for an ability that has none today is addressed too. First in wins, which is LIST_PACKS order:
  // a book's own record before this world's copy of it. {uuid, name, where, on?, of?}
  const records = new Map();
  const record = (key, v) => { if (key && v && !records.has(key)) records.set(key, { ...v }); };
  for (const [mod, pack, kind] of LIST_PACKS) {
    const dir = MODULES[mod] ? packDir(MODULES[mod], pack) : null;
    if (!dir) { stats.skipped.push(`${mod}/${pack}`); continue; }
    const snap = snapshot(dir, `${mod}-${pack}`);
    const docs = await readPackItems(snap);
    const m = packageMeta(MODULES[mod]) ?? { id: mod, title: mod, packs: {} };
    const where = `${m.title} · ${m.packs[pack] ?? pack}`;
    const at = (path) => `Compendium.${m.id}.${pack}.${path}`;
    let n = 0;
    for (const it of docs) {
      n++;
      const identifier = identifierOf(it.name, it.system?.identifier);
      const rec = { uuid: at(`Item.${it._id}`), name: it.name, where };
      const from = `${mod}/${pack}`;
      if (it.type === 'spell') { put(spells, it.name, { identifier, kind: 'spell', from }); record(`spell:${identifier}`, rec); also('spell', identifier, it.name, from); twin('spell', identifier, it._id); }
      else if (it.type === 'feat' || it.type === 'class' || it.type === 'subclass' || it.type === 'background' || it.type === 'race') { put(features, it.name, { identifier, kind: 'feature', from }); record(`feature:${identifier}`, rec); also('feature', identifier, it.name, from); twin('feature', identifier, it._id); }
      else if (it.type === 'weapon') {
        if (it.system?.type?.value === 'natural') { put(natural, it.name, { identifier, count: 0, creatures: [] }); record(`natural:${identifier}`, rec); also('natural', identifier, it.name, from); twin('natural', identifier, it._id); }
        else { put(weapons, it.name, { identifier, from }); record(`weapon:${identifier}`, rec); also('weapon', identifier, it.name, from); twin('weapon', identifier, it._id); }
        put(items, it.name, { identifier, kind: 'weapon', from });
      } else if (['consumable', 'equipment', 'tool', 'loot', 'container'].includes(it.type)) { put(items, it.name, { identifier, kind: 'item', from }); record(`item:${identifier}`, rec); also('item', identifier, it.name, from); twin('item', identifier, it._id); }
    }
    // an effect is not an item: its record is the spell, feature or item that CARRIES it, which is
    // what a person wants opened. The key's kind says so — nothing else has to be written down.
    for (const { name, on } of await readPackEffects(snap)) {
      effects.add(slug(name));
      bookEffects.add(slug(name));
      if (on) record(`effect:${slug(name)}`, { uuid: at(on.path), name: on.name, where });
    }
    stats.packs.push(`${mod}/${pack}: ${n}`);
  }
  // the natural attacks: every natural weapon on every creature in the installed books
  for (const [mod, pack] of CREATURE_PACKS) {
    const dir = MODULES[mod] ? packDir(MODULES[mod], pack) : null;
    if (!dir) { stats.skipped.push(`${mod}/${pack}`); continue; }
    const snap = snapshot(dir, `${mod}-${pack}-actors`);
    const { actors, items: byActor } = await readActors(snap);
    const m = packageMeta(MODULES[mod]) ?? { id: mod, title: mod, packs: {} };
    const where = `${m.title} · ${m.packs[pack] ?? pack}`;
    let n = 0;
    for (const [actorId, list] of Object.entries(byActor)) {
      for (const it of list) {
        if (it.type !== 'weapon' || it.system?.type?.value !== 'natural') continue;
        n++;
        const identifier = identifierOf(it.name, it.system?.identifier);
        const k = slug(it.name);
        const e = natural.get(k) ?? natural.set(k, { name: it.name, identifier, count: 0, creatures: [] }).get(k);
        e.count++;
        also('natural', identifier, it.name, `${mod}/${pack}`);
        if (e.creatures.length < 6 && actors[actorId]?.name && !e.creatures.includes(actors[actorId].name)) e.creatures.push(actors[actorId].name);
        // a creature's own attack is the better record than a loose natural weapon in an items
        // pack: it names the monster. The first creature keeps it; the rest only count (`of`).
        const has = records.get(`natural:${identifier}`);
        if (!has?.on) records.set(`natural:${identifier}`, { uuid: `Compendium.${m.id}.${pack}.Actor.${actorId}.Item.${it._id}`, name: it.name, where, on: actors[actorId]?.name ?? null });
      }
    }
    for (const { name } of await readPackEffects(snap)) { effects.add(slug(name)); bookEffects.add(slug(name)); }
    stats.packs.push(`${mod}/${pack}: ${n} natural attacks`);
  }
  // one record stands for the attack; say how many creatures share it, so nobody reads it as the only one
  for (const e of natural.values()) { const r = records.get(`natural:${e.identifier}`); if (r && e.count > 1) r.of = e.count; }
  // the world's own items
  const world = { items: [], effects: [] };
  for (const [actorId, list] of Object.entries(worldItems ?? {})) {
    const actor = worldActors?.[actorId];
    for (const it of list) {
      if (!['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool', 'loot'].includes(it.type)) continue;
      const identifier = identifierOf(it.name, it.system?.identifier);
      const natural = it.type === 'weapon' && it.system?.type?.value === 'natural';
      world.items.push({ name: it.name, type: it.type, identifier, natural, actor: actor?.name ?? actorId, actorType: actor?.type ?? '?' });
      // this world's own copy is the record only where no book holds one — the same order the keys
      // are earned in. It is addressed on the actor that carries it, which is where a person looks.
      const rec = { uuid: `Actor.${actorId}.Item.${it._id}`, name: it.name, where: `this world · ${actor?.name ?? actorId}` };
      const kind = it.type === 'weapon' ? (natural ? 'natural' : 'weapon') : it.type === 'spell' ? 'spell' : it.type === 'feat' ? 'feature' : 'item';
      record(`${kind}:${identifier}`, rec);
    }
  }
  for (const [owner, list] of Object.entries(worldEffects ?? {})) {
    const [actorId, itemId] = owner.split('.');
    const actor = worldActors?.[actorId];
    for (const ef of list) {
      if (!ef.name) continue;
      if (!world.effects.includes(ef.name)) world.effects.push(ef.name);
      effects.add(slug(ef.name));
      const on = itemId ? (worldItems?.[actorId] ?? []).find((i) => i._id === itemId) : null;
      record(`effect:${slug(ef.name)}`, { uuid: itemId ? `Actor.${actorId}.Item.${itemId}` : `Actor.${actorId}`, name: on?.name ?? actor?.name ?? ef.name, where: `this world · ${actor?.name ?? actorId}` });
    }
  }

  /** which kinds a label is, by the lists: [{kind, id, from}] — the identifier where the list has one */
  function kindsOfName(label, { only = null, world: worldToo = false } = {}) {
    const out = [];
    const seen = new Set();
    const add = (kind, id, from) => {
      if (only && !only.includes(kind)) return;
      const k = `${kind}:${id}`;
      if (!seen.has(k)) { seen.add(k); out.push({ kind, id, from }); }
      // the same document under another identifier (the book's copy beside the system's SRD copy)
      for (const t of twins.get(k) ?? []) { const tk = `${kind}:${t}`; if (!seen.has(tk)) { seen.add(tk); out.push({ kind, id: t, from: `${from}, the same document as ${id}` }); } }
    };
    for (const form of nameForms(label)) {
      const k = slug(form);
      if (!k) continue;
      const sp = spells.get(k); if (sp) add('spell', sp.identifier, sp.from);
      const ft = features.get(k); if (ft) add('feature', ft.identifier, ft.from);
      const wp = weapons.get(k); if (wp) add('weapon', wp.identifier, wp.from);
      const nt = natural.get(k); if (nt) add('natural', nt.identifier, `${nt.count} creatures`);
      const it = items.get(k); if (it && it.kind === 'item') add('item', it.identifier, it.from);
      // the records whose qualified names shorten to this one (Potion of Healing (Greater))
      for (const e of alsoBy.get(k) ?? []) add(e.kind, e.identifier, `${e.from} (${e.name})`);
      // this world's own items are evidence for a HOUSE row alone (see the ⚠ at the top)
      if (worldToo) for (const w of world.items) {
        if (slug(w.name) !== k) continue;
        const kind = w.type === 'weapon' ? (w.natural ? 'natural' : 'weapon') : w.type === 'spell' ? 'spell' : w.type === 'feat' ? 'feature' : 'item';
        add(kind, w.identifier, `the world (${w.actor})`);
      }
    }
    return out;
  }

  /**
   * A family row's word ("Sword", "Bite", "Axe") expanded once against the closed lists: the
   * natural attacks, the books' and the world's weapons. What the word would also have
   * caught outside weapons (a feat, a wand, a spell) is NOT carried — it is returned as `notCarried`
   * for the user to keep with one word. Returns {keys: [{kind, id, name, from}], notCarried: [sentences]}.
   */
  function expandWord(label, { world: worldToo = false } = {}) {
    const re = wordRule(label);
    const out = [];
    const notCarried = [];
    const seen = new Set();
    const add = (kind, id, name, from) => { const k = `${kind}:${id}`; if (!seen.has(k)) { seen.add(k); out.push({ kind, id, name, from }); } };
    for (const e of natural.values()) if (re.test(e.name)) add('natural', e.identifier, e.name, `${e.count} creatures (${e.creatures.slice(0, 3).join(', ')})`);
    for (const e of weapons.values()) if (re.test(e.name)) add('weapon', e.identifier, e.name, e.from);
    // what the word catches on this world's actors is LISTED, and carried only for a house row —
    // a shipped stock FX may not be keyed to one table's inventory (see the ⚠ at the top)
    for (const w of world.items) {
      if (!re.test(w.name)) continue;
      if (worldToo && w.type === 'weapon') add(w.natural ? 'natural' : 'weapon', w.identifier, w.name, `the world (${w.actor})`);
      else notCarried.push(`${w.name} [${w.type}] on ${w.actor}${w.type === 'weapon' ? " — this world's own" : ''}`);
    }
    for (const [k, e] of spells) if (re.test(e.name) && slug(e.name) !== slug(label)) notCarried.push(`${e.name} [spell] (${e.from})`);
    return { keys: out, notCarried: [...new Set(notCarried)] };
  }

  /** does an ActiveEffect of this name exist in the BOOKS? (this world's own only for a house row) */
  const hasEffect = (label, { world: worldToo = false } = {}) => nameForms(label).some((form) => (worldToo ? effects : bookEffects).has(slug(form)));

  return { spells, features, items, weapons, natural, alsoBy, twins, effects, bookEffects, records, world, kindsOfName, expandWord, hasEffect, stats };
}

export const packExists = (mod, pack) => !!(MODULES[mod] && existsSync(`${MODULES[mod]}/packs/${pack}`));
