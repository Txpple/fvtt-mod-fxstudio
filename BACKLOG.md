# fxstudio — backlog

What is parked, and why. Nothing here is owed; each line says who decides.

## Waiting on the user (from the migration report, 2026-09-06)

- **Read `recipes/migration-report.md` before cutover.** It holds the family rows expanded
  (what each weapon word now catches, list by list), the weapon words that also caught a spell, a
  feat or an item under AA and are not carried (Spellfire Burst by "Burst", Wand of Magic Missiles
  by "Missile", a Horn tool and a Chain by the creature-attack rows), the keys ceded to a longer
  label, the names no list holds (keyed as a spell, a feature and an item), the seven looks that
  can never answer, the fifteen paths still on the frozen table, and the census in the new keys
  (596 of 603 abilities on the world's actors answer as under AA; Maul of Momentum now plays; the
  Shield spell no longer bashes; the four word-accidents play nothing). Anything wanted back is one
  house look away: `{ "id": "spellfire-burst", "for": ["feature:spellfire-burst"], "like": "burst" }`.
- **56 abilities on the party's sheets play nothing** (the report's last section, per sheet). Each
  is a starter or an existing look plus a key; the screens (phase 3) or the API write them.
- **The "Skill Guidance" effects** (18 on Gren) matched AA's "Guidance" effect look by substring
  and now play nothing, as ruled (no name rules). One house look
  `{ "for": ["effect:skill-guidance-…"], "like": "guidance" }` per variant, or a wider ruling.
- **An item's own look** (four in `house.json`: Unholy Word, Necrotic Burst, First Light, Goldthorn,
  from AA's item flags) is keyed by the item's name, so it answers any item of that name, not only
  the one it was set on. The item pointer `flags.fxstudio.look` (PLAN §3.1) lands with the screens
  in phase 3; until then the four are listed in the report's house section.

## From phase 2 (2026-09-06)

- **The frozen table holds 15 paths** (20 Sequencer entries): pictures whose loop markers differ
  between AA's copy and JB2A's own registration ("complete" intro-loop-outro nodes). Sequencer
  applies markers from the registration, so a native path would change their loop points. They
  stay on the table, counted, until either JB2A's markers are checked by eye against AA's and ruled
  the same, or the pictures are re-made as intro + loop + outro scenes. The user decides.
- **Named allowances in the render-level proof** (the report lists each with its count): a
  targetless cast plays nothing rather than its sound alone (97 moments); a follow-up mark with
  nothing to land on plays no sound (9); a bolt from inside a standing area with none standing
  leaves from the caster's centre, not the token's corner (6); a mark that falls back to the
  caster honours its delay (4); a shield's halves start in a different order with no wait between
  (5). Each is the model over AA's accident; each is reversible by one line if the user wants the
  old behaviour.
- **Two AA switches not carried, used by no row:** hiding a move's range ring from players, and
  measuring it equidistant. A knob each if ever wanted.
- **Tile persistence** (AA's overhead/ground tile through its GM socket) is not carried; no row
  uses it. A look that asks stays on the ground.
- **Levels** is not installed; nothing is ported for it.
- **`impact` after a scene that played on nothing:** a follow-up mark at `impact` when the
  previous scene had no per-target picture resolves nowhere and plays nothing. The validator does
  not yet warn; a warning is a small addition when the screens arrive.
- **The custom shape** is built and whitelisted but exercised by no look; the first custom look
  should come with a suite section.

## Parked options (the user's, PLAN §7)

- **Derived looks**, off by default, never owed: the seven rules in `prototypes/derive*.mjs`.
- **Retirement** of baseline looks a rule reproduces identically. Depends on the option above.
- **Export**: whether folding the world buffer into `house.json` is a tool run or a button on the
  Check screen. The tool exists (`tools/export-looks.mjs`); the button is a phase 3 choice.

## Known and accepted

- **Two AA fallbacks carried as AA played them.** Arcane Sword's thrown flight and Morningstar's
  name a variant AA's table lacks; AA silently played its first entry, and the looks carry that.
- **Three paths that do not exist on this install**, silent under AA and silent now: Adventurer's
  Atlas's secondary `Map.png`, Boomerang's return flight (no such node), one JB2A file AA's table
  names that 0.9.2 does not ship.
- **The migration needs AA installed once** for `tools/lib/oracle/import-aa.mjs` (AA's sourcemap
  and the D&D5e Animations preset file) to regenerate the rows; after cutover the recipes are the
  state and the rows are history.
- **The PSFX free build** (0.16.0) is only needed to re-point regrouped sounds; every sound in the
  corpus resolves on this install without it.

## Later phases (PLAN §6)

- Phase 3: the four screens and the item-sheet button on the look grammar; the item pointer.
- Phase 4: Battle Flow's hooks, the core reader (statuses, combat, movement), the outcome looks.
- Phase 5: cutover.
