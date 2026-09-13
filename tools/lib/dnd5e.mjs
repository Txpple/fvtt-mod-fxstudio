// What dnd5e keeps that the tools need offline: where the closed lists of names come from (the
// system's and the installed books' compendia). The base-weapon list went with the base-weapon key
// (DESIGN §23): a weapon keys by its own identifier, and `weapon:maul` is the PHB Maul's.

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
// THE BOOKS FIRST, THE SYSTEM'S SRD 5.2 SECOND (the user, 2026-09-08: "you'd think the PHB would be
// a superset of anything in 5.2"). Nearly: 1559 of the 1603 names in the SRD 5.2 packs are also in
// a book, and 1541 of those are the SAME DOCUMENT ID — the system ships copies. So a record should
// be named for the book it is really from ("Monster Manual · Features", not "dnd5e · Monster
// Features"), and SRD 5.2 stands behind as the fallback for the 44 names no installed book holds.
export const LIST_PACKS = [
  ['phb', 'spells', 'spell'], ['phb', 'feats', 'feature'], ['phb', 'classes', 'feature'], ['phb', 'origins', 'feature'], ['phb', 'equipment', 'item'],
  ['mm', 'features', 'feature'], ['dmg', 'equipment', 'item'], ['dmg', 'features', 'feature'],
  ['ravenloft', 'items', 'item'], ['ravenloft', 'options', 'feature'],
  ['faerun', 'items', 'item'], ['faerun', 'options', 'feature'],
  ['dnd5e', 'spells24', 'spell'], ['dnd5e', 'feats24', 'feature'], ['dnd5e', 'classes24', 'feature'], ['dnd5e', 'origins24', 'feature'], ['dnd5e', 'monsterfeatures24', 'feature'], ['dnd5e', 'equipment24', 'item'],
];

/** the compendia of creatures whose attacks are the natural-attack census (no `dnd5e/monsters`: SRD) */
export const CREATURE_PACKS = [['mm', 'actors'], ['phb', 'actors'], ['dmg', 'actors'], ['ravenloft', 'actors'], ['ravenloft', 'fallback-actors'], ['faerun', 'actors'], ['dnd5e', 'actors24']];

export const ITEM_TYPES = ['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool', 'loot'];
