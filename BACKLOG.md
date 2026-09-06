# fxstudio — backlog

What is parked, and why. Nothing here is owed; each line says who decides.

## Waiting on the user (from the import report, 2026-09-06)

- **93 names that played under AA by accident and play nothing now.** Listed in
  `recipes/import-report.md` under "AA plays something, fxstudio plays nothing". Most are
  substring hits ("Smite" for Wrathful Smite, "Locate" for Locate Object, "Potion of" for every
  potion, "Shield" for Shield Master). Where the picture was actually wanted, the answer is a
  house row with that name, which the Change-the-look screen (phase 2) will write; until then
  the import report is the list. The user reads it before cutover.
- **Weapon names with the weapon word first — answered by the architecture, not a patch.** "Maul
  of Momentum" played nothing (whole-word matching anchored to the end of the name) and Gren's
  Shield spell played the shield bash (a name is all a row knew) on the first evening, 2026-09-06.
  ARCHITECTURE §3 keys a look by identity — `weapon:maul` after `weapon:maul-of-momentum`,
  `spell:shield` never meeting `weapon:shield` — and both go away without a name rule. Ruled
  2026-09-06; lands with phase 2.
- **The "Skill Guidance" effects** (18 on Gren) matched AA's "Guidance" effect look by substring.
  Recommended: one house row per effect name is heavy; a house row "Guidance" with
  `match: "word"` would cover them. Needs the user's word that this is wanted.

## From phase 1 (2026-09-06)

- **Watching it side by side is the user's half of the exit.** `node tools/smoke-replay.mjs --watch 4000`
  from a second client on the sandbox plays every family under both modules; the automated half
  (35 of 35, `smoke-looks` green) is in. AA stays on until the user says they look the same.
- **The item pointer `flags.fxstudio.look`** (PLAN §3.1) is not read yet; the resolver goes by
  name only. Phase 2's screens write it, so it lands with them.
- **Tile persistence** (AA's overhead/ground tile, which needed its GM socket) is not carried; no
  corpus row uses it. A row that asked for it plays on the ground and warns. Wanted only if a
  house look ever needs a tile; then it is a scene edit by the GM's client, not a socket.
- **Levels** is not installed, so AA's `onLevels` calls are not ported. If Levels ever is, the
  presets need the one-line elevation calls back; the corpus does not change.
- **Battleaxe, Smother, Torch, Constricting Vine** — the NPC attacks with no row (the first was
  AA's substring "Axe"). House rows when wanted, through the phase 2 screens.

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

- Phase 2: the four screens and the item-sheet button, Preview, the editor, export.
- Phase 3: Battle Flow's hooks and the outcome layers.
- Phase 4: cutover.
