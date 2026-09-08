// What dnd5e keeps that the tools need offline: the base weapons (CONFIG.DND5E.weaponIds in dnd5e
// 5.3.3, the 2024 list) and where the closed lists of names come from (the system's and the
// installed books' compendia). The module reads the live CONFIG; the tools read this.

/** the base weapon ids, as dnd5e 5.3.3 lists them (system.type.baseItem on a weapon) */
export const BASE_WEAPONS = ['battleaxe', 'blowgun', 'club', 'dagger', 'dart', 'flail', 'glaive', 'greataxe', 'greatclub', 'greatsword', 'halberd', 'handaxe', 'handcrossbow', 'heavycrossbow', 'javelin', 'lance', 'lightcrossbow', 'lighthammer', 'longbow', 'longsword', 'mace', 'maul', 'morningstar', 'musket', 'pike', 'pistol', 'quarterstaff', 'rapier', 'scimitar', 'shortsword', 'sickle', 'spear', 'shortbow', 'sling', 'trident', 'warpick', 'warhammer', 'whip'];

/** the base weapons' display names, for matching a family row's word against them */
export const BASE_WEAPON_NAMES = {
  battleaxe: 'Battleaxe', blowgun: 'Blowgun', club: 'Club', dagger: 'Dagger', dart: 'Dart', flail: 'Flail', glaive: 'Glaive', greataxe: 'Greataxe', greatclub: 'Greatclub', greatsword: 'Greatsword',
  halberd: 'Halberd', handaxe: 'Handaxe', handcrossbow: 'Hand Crossbow', heavycrossbow: 'Heavy Crossbow', javelin: 'Javelin', lance: 'Lance', lightcrossbow: 'Light Crossbow', lighthammer: 'Light Hammer',
  longbow: 'Longbow', longsword: 'Longsword', mace: 'Mace', maul: 'Maul', morningstar: 'Morningstar', musket: 'Musket', pike: 'Pike', pistol: 'Pistol', quarterstaff: 'Quarterstaff', rapier: 'Rapier',
  scimitar: 'Scimitar', shortsword: 'Shortsword', sickle: 'Sickle', spear: 'Spear', shortbow: 'Shortbow', sling: 'Sling', trident: 'Trident', warpick: 'War Pick', warhammer: 'Warhammer', whip: 'Whip',
};

/**
 * The compendia the closed lists are read from: [module dir key, pack name, what it holds]. The
 * third element is a label — buildLists switches on each document's own `type`, so a pack holding
 * a mix (dmg/equipment is 286 equipment, 119 consumables and 87 weapons) is read correctly.
 *
 * ⚠ THE LIST IS THE EVIDENCE. A book that is installed but not named here is invisible, and since
 * 2026-09-08 an FX whose key no list holds is NOT CARRIED — so a missing pack silently deletes
 * corpus. Audited 2026-09-08 against what the sandbox actually ships: `dmg/items` did not exist
 * (the DMG ships `equipment` and `features`, 571 records never read), Ravenloft's own items and
 * options were never read though its actors were, and Heroes of Faerûn was not mapped at all.
 *
 * ⚠ SRD 5.2 IS IN SCOPE; SRD 5.1 IS NOT (the user, 2026-09-08). The dnd5e system ships BOTH, and
 * says which is which in each pack's own `flags.dnd5e.sourceBook`:
 *   "SRD 5.1"  the 2014 set — every pack whose label ends "(SRD)": `spells`, `items`, `tradegoods`,
 *              `classfeatures`, `monsterfeatures`, `monsters`, `classes`, `races`… every record in
 *              them reads `system.source.rules: "2014"`. NOT evidence: this table plays 2024.
 *   "SRD 5.2"  the 2024 set — the `…24` packs: `spells24`, `feats24`, `classes24`, `origins24`,
 *              `equipment24`, `monsterfeatures24`, `actors24`, every record `rules: "2024"`. IN
 *              scope, all of it.
 * `classes24` and `origins24` add nothing to this table's corpus — the Player's Handbook module
 * holds every name they do, and it is read first — but they are the SRD 5.2 evidence in their own
 * right, and they carry 141 ActiveEffects a world without the PHB module would need. It cost 257 stock FX and NOT ONE ability
 * on this world's actors: the census is identical, line for line, with the SRD gone. Most of what
 * went was the SRD's magic-weapon variants (Club +1, Vicious Dagger, Greataxe +3 …), which the
 * base-weapon key answers anyway.
 */
export const LIST_PACKS = [
  ['phb', 'spells', 'spell'], ['phb', 'feats', 'feature'], ['phb', 'classes', 'feature'], ['phb', 'origins', 'feature'], ['phb', 'equipment', 'item'],
  ['dnd5e', 'spells24', 'spell'], ['dnd5e', 'feats24', 'feature'], ['dnd5e', 'classes24', 'feature'], ['dnd5e', 'origins24', 'feature'], ['dnd5e', 'monsterfeatures24', 'feature'], ['dnd5e', 'equipment24', 'item'],
  ['dmg', 'equipment', 'item'], ['dmg', 'features', 'feature'], ['mm', 'features', 'feature'],
  ['ravenloft', 'items', 'item'], ['ravenloft', 'options', 'feature'],
  ['faerun', 'items', 'item'], ['faerun', 'options', 'feature'],
];

/** the compendia of creatures whose attacks are the natural-attack census (no `dnd5e/monsters`: SRD) */
export const CREATURE_PACKS = [['mm', 'actors'], ['dnd5e', 'actors24'], ['phb', 'actors'], ['dmg', 'actors'], ['ravenloft', 'actors'], ['ravenloft', 'fallback-actors'], ['faerun', 'actors']];

export const ITEM_TYPES = ['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool', 'loot'];
