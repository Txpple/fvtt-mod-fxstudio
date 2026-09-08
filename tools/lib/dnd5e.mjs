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
 */
export const LIST_PACKS = [
  ['phb', 'spells', 'spell'], ['phb', 'feats', 'feature'], ['phb', 'classes', 'feature'], ['phb', 'origins', 'feature'], ['phb', 'equipment', 'item'],
  ['dnd5e', 'spells24', 'spell'], ['dnd5e', 'spells', 'spell'], ['dnd5e', 'feats24', 'feature'], ['dnd5e', 'classfeatures', 'feature'], ['dnd5e', 'monsterfeatures', 'feature'], ['dnd5e', 'monsterfeatures24', 'feature'], ['dnd5e', 'equipment24', 'item'], ['dnd5e', 'items', 'item'], ['dnd5e', 'tradegoods', 'item'],
  ['dmg', 'equipment', 'item'], ['dmg', 'features', 'feature'], ['mm', 'features', 'feature'],
  ['ravenloft', 'items', 'item'], ['ravenloft', 'options', 'feature'],
  ['faerun', 'items', 'item'], ['faerun', 'options', 'feature'],
];

/** the compendia of creatures whose attacks are the natural-attack census */
export const CREATURE_PACKS = [['mm', 'actors'], ['dnd5e', 'monsters'], ['dnd5e', 'actors24'], ['phb', 'actors'], ['dmg', 'actors'], ['ravenloft', 'actors'], ['ravenloft', 'fallback-actors'], ['faerun', 'actors']];

export const ITEM_TYPES = ['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool', 'loot'];
