# fxstudio — backlog

> **Vocabulary (ruled 2026-09-06).** What this document calls a *look* is an **FX** on the screens, in the code (`scripts/core/fx.js`, `api.fx`, the item flag `flags.fvtt-mod-fxstudio.fx`, the world setting `fx`) and in the recipe files (`"fx": [...]`): a picture is a **VFX**, a sound an **SFX**. A look written over the main corpus is an **override**. The earlier sections keep the word they were written with.

What is parked, and why. Nothing here is owed; each line says who decides.

## The hold, and what is left of it (2026-09-09) - the patch became the rule

**BUILT and green.** The wait moved out of the region reader and into the DISPATCHER as a GATE
(`scripts/core/gates.js`, `scripts/readers/battleflow.js`, ARCHITECTURE §2): every moment is asked
about once, before it plays; Battle Flow is one feature-detected tenant, not a branch; a table
without it registers nothing and takes the straight road. `api.gates.register(name, ask)` is the
seam, so this module's own future reasons to defer a moment need no new machinery.
`check-gates.mjs` 20 of 20 offline, `smoke-replay` §15 drives a real hold at the table (50 of 50).

What is NOT closed, and what to re-read before touching the reader or the dispatcher:

- **A hold is client-local** (Battle Flow's own correction, 2026-09-09): its `castHolds` is an
  in-memory Map on the casting client. On any other client the answer is `null`, which means "I
  cannot SEE a hold", not "nothing holds this". Today the roads that matter are read on the caster's
  client, so this costs nothing; **a GM placing a template on a player's behalf would play early.**
  Making it a real cross-client guarantee means promoting the hold to observable state on Battle
  Flow's side - it offered to cost that and would rather not do it speculatively. **Not ruled.**
- **Battle Flow SHIPPED the general surface** the same day (`1b916c5`, its `scripts/holds.js`,
  ARCHITECTURE §7): `holdFor(subject)`, `castHold` kept **forever** as an alias of it,
  `api.holds = {version: 1, keys: [activity, message, document]}`, and the hooks
  `battleflow.holdOpened` (⚠ NOT `castHoldOpened`, which is what its advisory had said) and
  `battleflow.castReleased`. Its holds are refcounted, because a modal SEQUENCE of windows may hold
  one subject later. **Nothing here changed for it** - our gate asks `holdFor` first and falls back -
  and the fallback is proved live: the sandbox still carries the older Battle Flow, so `smoke-replay`
  50 of 50 ran through the `castHold` road with the gate registered and no error.
- **A hold settles THREE ways, not two** (Battle Flow's own correction, `5c7a282`, found by reviewing
  its contract against this gate): the CARD (play it), an explicit `null` (nothing was posted, play
  nothing), or a truthy SENTINEL (the hold lifted, nothing is known - carry on). Its self-bound used
  to settle `null`, which under our rule would have cost the picture **for good** on a merely LATE
  answer, when the points are already spent and the template is already on the map. **Nothing here
  changed** - a sentinel is truthy, so "truthy plays" was already right - but the `null` row now
  fires only when a cast genuinely produced no card, which is the case it was written for.
  `check-gates` pins all three.
- ⚠ **`holdFor` accepts any subject but every hold raised TODAY is keyed by activity uuid** - Battle
  Flow deliberately did not write the aliasing until a real caller needs it. Asking by
  `activity || id` is right; a message-keyed ask just answers null until then.
- ⚠ **An unbounded wait is reachable by SETTING, not only by bug** (Battle Flow, when it shipped): a
  hold timer of 0 is a clockless ask on purpose, so its hold is clockless on purpose. **Our
  five-minute bound then plays the picture while the question is still on the caster's screen.**
  Safe (a picture is never lost) but it is the one place our rule and their setting disagree. The
  bound is one argument in `core/gates.js` (`heldUntil(moment, { bound })`); a per-gate bound, or a
  setting, is small if the user ever sees it happen. **Not ruled, not owed.**
- **Two holes Battle Flow found reading its own code for us** (a stranded hold when the carrier
  whisper is deleted; another when `postUseActivity` never fires) are its bugs to fix. Ours is
  unaffected because the bound is ours: five minutes, and **an expired bound PLAYS**.
- **A modal sequence of windows** is Battle Flow's stated long-term want - the picture waiting for a
  whole sequence to drain, not one window. That is this gate generalised and needs nothing new here.

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

- ~~**502 migrated assets are keyed `"file"` when they are library paths.**~~ **DONE 2026-09-08**
  (the user: *"what i want is CLEAN data right now"*). Fixed at the writer, not by patching the
  JSON: `rows.mjs` asks the nativiser's new `isLibraryPath()` whether a slashless value names a
  real node in JB2A's own database, and writes `path` when it does. 393 → **3**, library paths 893
  → **1284**, and the render proof says **1029 of 1029 equal** — the value never changed, only the
  key it is written under. The three left (`jb2a.melee_generic.whirlwind.01.orange.0`) end in an
  index into a node's file list, which is not a node; they stay `file` and resolve.
  The **88 raw module paths that remain are genuinely files** — JB2A's database does not name them
  individually — as are the 29 distinct raw sound files (measured: not one has a single-file leaf
  in JB2A's or PSFX's registration).

## Found while building the revamp (2026-09-07)

- **Four knobs can be read and cleared on the FX sheet but not written: `thrown`, `return`,
  `breathe`, `pulse`** (DESIGN §9). Each has its address in the shape band and shows what it holds
  in words, with ✕ to clear it; writing one needs a picker slot the sheet cannot ask for without
  touching the `openPicker`/`applyPick` contract. In the whole corpus `thrown` is used 19 times and
  the other three not at all, so nothing is unreachable that anyone reaches. The file is the other
  door. (This was filed against a step of the shelved redesign; there is no step waiting for it
  now — it needs the user's word like anything else here.)

## Later phases (PLAN §6)

- Phase 3 is built. Parked from it (DESIGN §8): the prototype's *Automatic* tab (its rules are
  the parked derivation; phase 4 gives the tab the outcome layers' switches instead); "play nothing
  for one item only" (an off look needs a key; one item's silence is a look with no scenes, not yet
  offered); the migration's technical notes on the seven house looks show as written.
- Phase 4: the core reader (statuses, combat, movement) and the outcome FX, on dnd5e and core alone.
- ~~**Battle Flow's hooks (ruled backlog 2026-09-06: "yes battleflow is backlog").**~~ ✅ **BUILT
  2026-09-11 on the user's word ("go"), both halves the same day.** Battle Flow publishes
  `battleflow.moment` with a plain payload at three resolves (a maneuver die on the hit menu, Parry
  at the hold's answer, Sneak Attack's dice) under a closed vocabulary of five words (`maneuver`,
  `sneak`, `fold`, `rider`, `hold-answered`; `fold` and `rider` named, not yet published); this
  module reads it in `readers/battleflow.js` through the same dispatcher, with the `use`-look
  fallback for the four that post no card (ARCHITECTURE §2 *Battle Flow's moments*). Still parked
  here, waiting on Battle Flow publishing them: Riposte (its attack already posts an attack roll and
  plays), `shield-paid`, `emanation` members gained or lost. The survey that led here: the moments
  that exist only in Battle Flow's rules need Battle Flow to emit public hooks with plain payloads
  at its resolve points (no dependency, no setting, no flag shape; fxstudio never reads its internal
  flags). PLAN §5.
- Phase 5: cutover.
