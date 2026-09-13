// A SUBJECT is what acted, and its identity key (ARCHITECTURE §3): an FX is found by what the thing
// IS, in the vocabulary dnd5e already keeps, never by what it is called. ONE KEY PER ITEM, EXACT OR
// NOTHING (the user, 2026-09-12, DESIGN §23): an item's key is dnd5e's own identifier for it —
// `system.identifier` when set, else dnd5e's formatting of the name, which is what `item.identifier`
// answers in the system — and an FX either holds that key or does not play. No name forms, no
// base-weapon fallback, no activity suffix, no per-item pointer: two items that should play
// differently carry different identifiers, which is dnd5e's field and travels with the item.
// Pure: the readers hand this module plain data.
//
// A subject, as a reader describes it:
//   { kind, name, identifier?, spell?: {name, identifier}, ammunition?: subject, origin?: subject }
//   kind        spell | weapon | natural | feature | item | effect | event
//               (status and damage were placeholders for phase 4's outcomes and went on the user's
//               word, 2026-09-12; `event` stays because Battle Flow's moments key by it)
//   name        the thing's own name (the item's, the effect's)
//   identifier  dnd5e's identifier for the item (system.identifier when set; else the slug of its name)
//   spell       for a "cast spell" activity: the spell it links (its name and identifier)
//   ammunition  the ammunition fired, as a subject of its own (its key comes first)
//   origin      an effect's origin (the spell or item that made it), as a subject
//
// KEYS are `<kind>:<identifier>`:
//   spell:fire-bolt  ·  weapon:maul-of-momentum  ·  natural:bite  ·  feature:brutal-strike  ·
//   item:potion-of-healing  ·  effect:shield then the origin's key  ·  event:sneak
// The only orderings left are between DOCUMENTS, each with its own exact key: the ammunition fired
// before the bow, a cast activity's spell before the wand, an effect's own name before what made it.

export const KINDS = ['spell', 'weapon', 'natural', 'feature', 'item', 'effect', 'event'];
/** the kinds a person authors against and the Library lists: every kind but the moment word (`event:<word>` is Battle Flow's) */
export const AUTHORED_KINDS = ['spell', 'weapon', 'natural', 'feature', 'item', 'effect'];

/** which kind a dnd5e item type is, before the weapon/natural split */
export const KIND_OF_ITEM_TYPE = { spell: 'spell', weapon: 'weapon', feat: 'feature', consumable: 'item', equipment: 'item', tool: 'item', loot: 'item', container: 'item' };

// dnd5e's formatIdentifier: Foundry's String#slugify({strict: true}) after a slash is made a dash —
// "Blindness/Deafness" → blindness-deafness, "Melf's Minute Meteors" → melfs-minute-meteors,
// "Acid (vial)" → acid-vial. The same function, so an item with no identifier set keys here exactly
// as dnd5e's own `item.identifier` would say.
const CHAR_MAP = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ł': 'l' };
export function slug(name) {
  if (!name) return '';
  let s = String(name).replace(/(\w+)([\|/])(\w+)/g, '$1-$3');
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.split('').map((c) => CHAR_MAP[c.toLowerCase()] ?? c).join('').trim().toLowerCase();
  s = s.replace(/[\s-]+/g, '-');
  s = s.replace(/[^a-z0-9-]/g, '');
  return s.replace(/^-+|-+$/g, '');
}

/** the one id an item keys by: dnd5e's identifier when set, else what dnd5e would format its name to */
export const identifierOf = (name, identifier) => identifier || slug(name);

/**
 * A subject's keys: its own one key, with the documents that come before it — ammunition fired
 * before the weapon, a cast activity's spell before the item, an effect's own name before its origin.
 */
export function keysFor(subject) {
  if (!subject) return [];
  const out = [];
  const push = (k) => { if (k && !out.includes(k)) out.push(k); };
  if (subject.ammunition) for (const k of keysFor(subject.ammunition)) push(k);
  if (subject.spell) push(`spell:${identifierOf(subject.spell.name, subject.spell.identifier)}`);
  switch (subject.kind) {
    case 'spell': case 'weapon': case 'natural': case 'feature': case 'item':
      push(`${subject.kind}:${identifierOf(subject.name, subject.identifier)}`);
      break;
    case 'effect':
      push(`effect:${slug(subject.name)}`);
      if (subject.origin) for (const k of keysFor(subject.origin)) push(k);
      break;
    case 'event': push(`event:${subject.eventId ?? slug(subject.name)}`); break;
    default: break;
  }
  return out;
}

/** a subject from a dnd5e item's plain data (the reader and the offline census both use it) */
export function subjectOfItemData({ name, type, system = {}, spell = null, ammunition = null }) {
  let kind = KIND_OF_ITEM_TYPE[type] ?? 'item';
  if (type === 'weapon' && system.type?.value === 'natural') kind = 'natural';
  const s = { kind, name, identifier: system.identifier || null };
  if (spell) s.spell = spell;
  if (ammunition) s.ammunition = ammunition;
  s.keys = keysFor(s);
  return s;
}

/** the kind and id of a key: "spell:fire-bolt" → {kind, id} */
export function parseKey(key) {
  const m = /^([a-z]+):([a-z0-9][a-z0-9-]*)$/.exec(key ?? '');
  if (!m) return null;
  return { kind: m[1], id: m[2] };
}

export const isKey = (key) => { const p = parseKey(key); return !!p && KINDS.includes(p.kind); };

/** a key as a sentence says it: "the spell Fire Bolt", "any maul", "the Bite natural attack" */
export function keyWords(key) {
  const p = parseKey(key);
  if (!p) return String(key);
  const name = p.id.replace(/-/g, ' ');
  switch (p.kind) {
    case 'spell': return `the spell ${titleCase(name)}`;
    case 'weapon': return `a ${name}`;
    case 'natural': return `a ${name} attack`;
    case 'feature': return `the feature ${titleCase(name)}`;
    case 'item': return `the item ${titleCase(name)}`;
    case 'effect': return `the effect ${titleCase(name)}`;
    case 'event': return `${name}`;
    default: return key;
  }
}

/** a key as a label on a screen: "Fire Bolt (spell)", "Maul (weapon)", "Bite (natural)" */
export function keyLabel(key) {
  const p = parseKey(key);
  if (!p) return String(key);
  return `${titleCase(p.id.replace(/-/g, ' '))} (${p.kind})`;
}

export const titleCase = (s) => String(s ?? '').replace(/\b[a-z]/g, (c) => c.toUpperCase());
