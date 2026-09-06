# fxstudio

Visual and sound effects for dnd5e on Foundry VTT, played from what actually happened at the
table. A greenfield design: Automated Animations' corpus is migrated once so the table does not
start from zero, and none of its architecture is carried. Keeps [Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer) as the engine
and JB2A and PSFX as the libraries; replaces Automated Animations by carrying its whole D&D5e
Animations corpus over losslessly, adds the user's own looks and the outcome layers AA never had,
and is driven through four screens that speak in sentences. It never guesses a look.

**Status: phase 3 (the screens) built, 2026-09-06.** FX Studio opens from the Settings sidebar
(the GM's "Open FX Studio" button) or from the wand on any item sheet: *Look up* an ability and
read what it plays as a sentence and why; *Change the look* from a starter or any existing look,
in the family's own colours, with a sound found in PSFX or none, and Save it to the world with your
name on it; *Custom looks* lists what was written here and in the house file, newest first, with
who wrote each; *Check* shows what plays nothing on each sheet and in the books, what did not
resolve, and what waits for the export. One item can carry a look of its own ("only this one").
Everything the screens do goes through the API, so a macro or an assistant can do the same
(`tools/smoke-screens.mjs` and `tools/smoke-author.mjs` prove both doors). [ARCHITECTURE.md](ARCHITECTURE.md) is the
design: a look is found by what acted and when (identity keys dnd5e already keeps — a spell's
identifier, a weapon's name then its base weapon, a natural attack, a feature, an item, an
effect), never by a name rule; a look is written as the sentence the user would say
(`recipes/SCHEMA.md` is the grammar); the engine knows eight shapes and one escape hatch
(`scripts/engine/shapes/`). The corpus is `recipes/baseline/` (the D&D5e Animations corpus
migrated once, one file per kind, 1289 looks), `house.json` (the user's), `starters.json` (what a
new look starts from) and `aa-assets.json` (the 15 pictures still played through AA's own
metadata, counted). The migration (`tools/migrate-aa.mjs`) is proved at the render: for every
row, the exact Sequencer calls the new engine makes equal the calls AA's own sequence made, with
five deliberate differences named and counted (1296 of 1296; `recipes/migration-report.md`).
Measured on the sandbox: every look builds and every path resolves live (`tools/smoke-looks.mjs`),
one look of every shape and moment plays through real dnd5e flows (`tools/smoke-replay.mjs`, 37 of
37 — a Maul of Momentum plays the maul, the Shield spell no longer bashes), and an assistant's
round trip through the API — write, validate, read as a sentence, preview, save with provenance,
export — is green (`tools/smoke-author.mjs`). Phase 4, the outcomes and Battle Flow's moments, starts on
the user's word. Read [PLAN.md](PLAN.md) for the phases, [DESIGN.md](DESIGN.md) for what was
decided while building, [BACKLOG.md](BACKLOG.md) for what is parked, and the migration report for
what the user reads before cutover. `prototypes/` holds the investigation's scripts and the
clickable prototype the screens were ruled on.

**Licence.** The code is MIT. `recipes/baseline/*.json` is a derived work of
[D&D5e Animations](https://github.com/MrVauxs/dnd5e-animations) 3.3.0 by MrVauxs and Sisimshow and is
licensed GPL-3 (see `recipes/BASELINE-LICENSE`); it is carried over whole so nothing that played under
Automated Animations is lost.

Sister of [Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow) and
[Misc Patches](https://github.com/Txpple/fvtt-mod-miscpatches); same author, same conventions:
plain ES modules, no build step, no patching, MIT.
