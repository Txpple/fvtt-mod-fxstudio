// A SUBJECT is what acted, and its identity keys (ARCHITECTURE §3): a look is found by what the
// thing IS, in the vocabulary dnd5e already keeps, and only then by what it is called. No
// substrings, no word rules, no exclude lists — at the table a lookup is an exact map hit on one of
// these keys, most specific first. Pure: the readers hand this module plain data.
//
// A subject, as a reader describes it:
//   { kind, name, identifier?, baseItem?, activityType?, spell?: {name, identifier}, ammunition?: subject, origin?: subject, statusId? }
//   kind        spell | weapon | natural | feature | item | effect | status | damage | event
//   name        the thing's own name (the item's, the effect's)
//   identifier  dnd5e's identifier for the item (system.identifier when set; else the slug of its name)
//   baseItem    a weapon's base weapon (system.type.baseItem): "longsword", "maul"
//   activityType  the activity that acted (attack, save, heal, damage, utility, cast, …)
//   spell       for a "cast spell" activity: the spell it links (its name and identifier)
//   ammunition  the ammunition fired, as a subject of its own (its keys come first)
//   origin      an effect's origin (the spell or item that made it), as a subject
//
// KEYS are `<kind>:<id>`, optionally `/<activity type>` for the most specific form:
//   spell:fire-bolt/attack  spell:fire-bolt  ·  weapon:maul-of-momentum  weapon:maul  ·  natural:bite
//   feature:brutal-strike  ·  item:potion-of-healing  ·  effect:shield  then the origin's key  ·  status:prone

export const KINDS = ['spell', 'weapon', 'natural', 'feature', 'item', 'effect', 'status', 'damage', 'event'];

/** which kind a dnd5e item type is, before the weapon/natural split */
export const KIND_OF_ITEM_TYPE = { spell: 'spell', weapon: 'weapon', feat: 'feature', consumable: 'item', equipment: 'item', tool: 'item', loot: 'item', container: 'item' };

// Foundry's String#slugify({strict: true}) after dnd5e's formatIdentifier: "Blindness/Deafness" →
// blindness-deafness, "Melf's Minute Meteors" → melfs-minute-meteors, "Acid (vial)" → acid-vial.
const CHAR_MAP = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ł': 'l' };
export function slug(name) {
  if (!name) return '';
  let s = String(name).replace(/(\w+)([\\|/])(\w+)/g, '$1-$3');
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.split('').map((c) => CHAR_MAP[c.toLowerCase()] ?? c).join('').trim().toLowerCase();
  s = s.replace(/[\s-]+/g, '-');
  s = s.replace(/[^a-z0-9-]/g, '');
  return s.replace(/^-+|-+$/g, '');
}

/**
 * The name, then the name with a qualifier dnd5e or the DM appends removed: "Misty Step - Spellcasting"
 * (an NPC's spell), "Bless - Fey-Touched" (a granted spell), "Potion of Healing (Greater)". Still the
 * thing's own name; nothing is derived from anything else.
 */
export function nameForms(name) {
  const forms = [name];
  const dash = name?.match(/^(.+?)\s+[-–—]\s+.+$/);
  if (dash) forms.push(dash[1]);
  const paren = name?.match(/^(.+?)\s*\([^)]*\)\s*$/);
  if (paren) forms.push(paren[1]);
  return [...new Set(forms.filter(Boolean))];
}

/** the ids a name stands for: dnd5e's identifier when known, then the slug of each form of the name */
export function idsFor(name, identifier) {
  const ids = [];
  if (identifier) ids.push(identifier);
  for (const form of nameForms(name)) ids.push(slug(form));
  return [...new Set(ids.filter(Boolean))];
}

/**
 * A subject's keys, most specific first. `activityType` makes a `<key>/<type>` form ahead of each bare
 * key; a "cast spell" activity puts the linked spell's keys first; ammunition's keys come before the
 * weapon's; an effect's own name comes before its origin's keys.
 */
export function keysFor(subject) {
  if (!subject) return [];
  const out = [];
  const push = (k) => { if (k && !out.includes(k)) out.push(k); };
  const withActivity = (kind, ids) => {
    for (const id of ids) {
      if (subject.activityType) push(`${kind}:${id}/${subject.activityType}`);
      push(`${kind}:${id}`);
    }
  };
  if (subject.ammunition) for (const k of keysFor(subject.ammunition)) push(k);
  if (subject.spell) withActivity('spell', idsFor(subject.spell.name, subject.spell.identifier));
  switch (subject.kind) {
    case 'spell': withActivity('spell', idsFor(subject.name, subject.identifier)); break;
    // a weapon, a natural attack and an item go by their own name: dnd5e's identifier on them is a slug of the name that goes stale when the item is renamed
    case 'weapon':
      withActivity('weapon', idsFor(subject.name));
      if (subject.baseItem) withActivity('weapon', [subject.baseItem]);
      break;
    case 'natural': withActivity('natural', idsFor(subject.name)); break;
    case 'feature': withActivity('feature', idsFor(subject.name, subject.identifier)); break;
    case 'item': withActivity('item', idsFor(subject.name)); break;
    case 'effect':
      for (const id of idsFor(subject.name)) push(`effect:${id}`);
      if (subject.origin) for (const k of keysFor(subject.origin)) push(k);
      break;
    case 'status': push(`status:${subject.statusId ?? slug(subject.name)}`); break;
    case 'damage': push(`damage:${subject.damageType ?? slug(subject.name)}`); break;
    case 'event': push(`event:${subject.eventId ?? slug(subject.name)}`); break;
    default: break;
  }
  return out;
}

/** a subject from a dnd5e item's plain data (the reader and the offline census both use it) */
export function subjectOfItemData({ name, type, system = {}, activityType = null, spell = null, ammunition = null }) {
  let kind = KIND_OF_ITEM_TYPE[type] ?? 'item';
  if (type === 'weapon' && system.type?.value === 'natural') kind = 'natural';
  const s = { kind, name, identifier: system.identifier || null, activityType: activityType || null };
  if (type === 'weapon' && system.type?.baseItem) s.baseItem = system.type.baseItem;
  if (spell) s.spell = spell;
  if (ammunition) s.ammunition = ammunition;
  s.keys = keysFor(s);
  return s;
}

/** the kind and id of a key: "spell:fire-bolt/attack" → {kind, id, activity} */
export function parseKey(key) {
  const m = /^([a-z]+):([^/]+)(?:\/(.+))?$/.exec(key ?? '');
  if (!m) return null;
  return { kind: m[1], id: m[2], activity: m[3] ?? null };
}

export const isKey = (key) => { const p = parseKey(key); return !!p && KINDS.includes(p.kind); };

/** a key as a sentence says it: "the spell Fire Bolt (attack)", "any maul", "the Bite natural attack" */
export function keyWords(key) {
  const p = parseKey(key);
  if (!p) return String(key);
  const name = p.id.replace(/-/g, ' ');
  const act = p.activity ? ` (${p.activity})` : '';
  switch (p.kind) {
    case 'spell': return `the spell ${titleCase(name)}${act}`;
    case 'weapon': return `a ${name}${act}`;
    case 'natural': return `a ${name} attack${act}`;
    case 'feature': return `the feature ${titleCase(name)}${act}`;
    case 'item': return `the item ${titleCase(name)}${act}`;
    case 'effect': return `the effect ${titleCase(name)}`;
    case 'status': return `the ${name} condition`;
    case 'damage': return `${name} damage`;
    case 'event': return `${name}`;
    default: return key;
  }
}

export const titleCase = (s) => String(s ?? '').replace(/\b[a-z]/g, (c) => c.toUpperCase());
