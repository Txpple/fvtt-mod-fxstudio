# fxstudio — backlog

What is parked, and why. Nothing here is owed; each line says who decides.

## Waiting on the user (from the import report, 2026-09-06)

- **93 names that played under AA by accident and play nothing now.** Listed in
  `recipes/import-report.md` under "AA plays something, fxstudio plays nothing". Most are
  substring hits ("Smite" for Wrathful Smite, "Locate" for Locate Object, "Potion of" for every
  potion, "Shield" for Shield Master). Where the picture was actually wanted, the answer is a
  house row with that name, which the Change-the-look screen (phase 2) will write; until then
  the import report is the list. The user reads it before cutover.
- **Weapon names with the weapon word first.** "Maul of Momentum" played AA's Maul swing by
  substring; whole-word matching is anchored to the end of the name, so it plays nothing now.
  Option: allow the word anywhere in the name for weapon rows (would also make "Shield of Faith"
  play a shield bash, which AA did and which was wrong). Recommended: leave anchored, add house
  rows for the few named weapons.
- **The "Skill Guidance" effects** (18 on Gren) matched AA's "Guidance" effect look by substring.
  Recommended: one house row per effect name is heavy; a house row "Guidance" with
  `match: "word"` would cover them. Needs the user's word that this is wanted.

## Parked options (the user's, PLAN §7)

- **Derived looks**, off by default, never owed: the seven rules in `prototypes/derive*.mjs`.
- **Retirement** of baseline rows a rule reproduces identically. Depends on the option above.
- **Export**: whether folding the world buffer into `house.json` is a tool run or a button on the
  Check screen. Phase 2 builds the tool; the button is a later choice.

## Known and accepted

- **Two AA fallbacks carried as AA played them.** Arcane Sword's thrown switch and Morningstar's
  name a variant AA's table lacks; AA silently played its first entry, and the rows carry that
  first entry. Listed in the import report.
- **Three paths that do not exist on this install**, silent under AA and silent now: Adventurer's
  Atlas's secondary `Map.png` (the preset names a file the module does not ship), Boomerang's
  return animation (no such node), one JB2A file AA's table names that 0.9.2 does not ship.
- **Sequencer's prefix match.** `getEntry` accepts a partial segment prefix with a deprecation
  warning; the import resolves on dot boundaries and reports nothing relying on the quirk.
- **The import needs AA installed once.** It rebuilds AA's private table from AA's sourcemap
  (`dist/autoanimations.js.map`) and reads the D&D5e Animations preset file. After cutover the
  recipes are the state and the import is history; regenerate before uninstalling if ever needed.
- **The PSFX free build** (0.16.0) is only needed to re-point regrouped sounds; with the Patreon
  build's own index handling, every sound in the corpus resolves on this install without it.

## Later phases (PLAN §6)

- Phase 1: the reader, the resolver's moment rules on real dnd5e messages, every corpus preset,
  attacks that know hit or miss, the replay suite side by side with AA.
- Phase 2: the four screens and the item-sheet button, Preview, the editor, export.
- Phase 3: Battle Flow's hooks and the outcome layers.
- Phase 4: cutover.
