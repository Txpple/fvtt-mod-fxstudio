# fxstudio — backlog

> **Vocabulary (ruled 2026-09-06).** What this document calls a *look* is an **FX** on the screens, in the code (`scripts/core/fx.js`, `api.fx`, the item flag `flags.fvtt-mod-fxstudio.fx`, the world setting `fx`) and in the recipe files (`"fx": [...]`): a picture is a **VFX**, a sound an **SFX**. A look written over the main corpus is an **override**. The earlier sections keep the word they were written with.

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
  house look away: the `burst` starter's scenes copied and keyed to `feature:spellfire-burst`.
- **56 abilities on the party's sheets play nothing** (the report's last section, per sheet). Each
  is a starter or an existing look plus a key; the screens (phase 3) or the API write them.
- **The "Skill Guidance" effects** (18 on Gren) matched AA's "Guidance" effect look by substring
  and now play nothing, as ruled (no name rules). One house look per variant — the
  `guidance` look's scenes copied and keyed to `effect:skill-guidance-…` — or a wider ruling.
- **An item's own FX from the migration** — done 2026-09-06: the four are re-keyed as item-own (`for: []`) and `tools/bind-item-fx.mjs` points the items at them (sandbox done; prod at cutover).
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
- **Retirement** of stock looks a rule reproduces identically. Depends on the option above.
- **Export as a tool run** (`tools/export-fx.mjs --write`) was the phase 3 decision, reopened
  and replaced on 2026-09-06: the Corpus tab ships from the game (DESIGN §8), and the tool stays
  only as the offline path for a server that forbids uploads.
- **Misc Patches' teleport patch** is carried here since 2026-09-06 (the move shape, DESIGN §8) and
  stays switched on in Misc Patches for prod, where Automated Animations still moves the token,
  until the cutover (phase 5); then it retires there. Its list (Misty Step, Dimension Door,
  Moonlight Step, Shadow Step, Arcane Charge) is the looks' own `seen`/`unoccupied` now.
- **The outcomes in the walk.** Step 4 shows "on a hit / on a miss / on a failed save / when
  damage lands" as phase 4 and does not offer them; phase 4 turns them on. The Check screen
  says how many looks wait, and clears from the world only what the house file already holds.

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

## Found while bug testing (2026-09-07)

- **502 migrated assets are keyed `"file"` when they are library paths** (of 634 with that key:
  `{"file": "jb2a.scorched_earth.black"}`, no slash in it). They play — Sequencer takes a path
  where a file is asked for — but the screens read them as raw files: no Colour dropdown on the
  scene row, and the deep-link into the Asset Library only works because `slotPath` now accepts a
  slashless file. Re-keying them `"path"` in `recipes/stock/*.json` is a one-pass tool and a
  measurable diff; parked for the user's word.

## Later phases (PLAN §6)

- Phase 3 is built. Parked from it (DESIGN §8): the prototype's *Automatic* tab (its rules are
  the parked derivation; phase 4 gives the tab the outcome layers' switches instead); "play nothing
  for one item only" (an off look needs a key; one item's silence is a look with no scenes, not yet
  offered); the migration's technical notes on the seven house looks show as written.
- Phase 4: the core reader (statuses, combat, movement) and the outcome FX, on dnd5e and core alone.
- **Battle Flow's hooks (ruled backlog 2026-09-06: "yes battleflow is backlog").** The moments that
  exist only in Battle Flow's rules — Riposte, a held Shield, a maneuver die spent, a shield paid,
  a fold, emanation members gained or lost — need Battle Flow to emit public hooks with plain
  payloads at its resolve points (its own commission, in its repo; no dependency, no setting, no
  flag shape; fxstudio never reads its internal flags). Parked until the user wants those moments
  to play; until then those abilities play nothing, per the no-guessing rule. PLAN §5.
- Phase 5: cutover.
