# fxstudio

Visual and sound effects for dnd5e on Foundry VTT, played from what actually happened at the
table. A greenfield design: Automated Animations' corpus is migrated once so the table does not
start from zero, and none of its architecture is carried. Keeps [Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer) as the engine
and JB2A and PSFX as the libraries; replaces Automated Animations by carrying its whole D&D5e
Animations corpus over losslessly, adds the user's own looks and the outcome layers AA never had,
and is driven through four screens that speak in sentences. It never guesses a look.

**Status: phase 1 (lossless replay) built, 2026-09-06.** The corpus is in `recipes/` — the
baseline converted row for row from D&D5e Animations with a parity proof (every row plays the same
files, sound and options it did under Automated Animations, 1289 of 1289), the house layer this
world had on top, and the private Sequencer table the baseline plays through. The module reads
dnd5e's own messages, placed templates and active effects, resolves by exact name (house, then
baseline, else nothing — listed, never guessed) and plays every row through a port of AA's
sequences; attacks play knowing hit or miss. Measured on the sandbox: every row builds and every
path resolves live (`tools/smoke-looks.mjs`), one row of every family plays through real dnd5e
flows (`tools/smoke-replay.mjs`, 35 of 35). The first evening on it ruled AA's inherited model out:
[ARCHITECTURE.md](ARCHITECTURE.md) is the net-new design (identity keys, the look as the sentence,
nine shapes, one authoring model for people and assistants), ruled 2026-09-06, and phase 2 builds it. Read
[PLAN.md](PLAN.md) for the phases, [DESIGN.md](DESIGN.md) for what was decided while building,
[BACKLOG.md](BACKLOG.md) for what is parked, and `recipes/import-report.md` for the census the
user reads before cutover. `prototypes/` holds the investigation's scripts and the clickable
prototype the design was ruled on.

**Licence.** The code is MIT. `recipes/baseline.json` is a derived work of
[D&D5e Animations](https://github.com/MrVauxs/dnd5e-animations) 3.3.0 by MrVauxs and Sisimshow and is
licensed GPL-3 (see `recipes/BASELINE-LICENSE`); it is carried over whole so nothing that played under
Automated Animations is lost.

Sister of [Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow) and
[Misc Patches](https://github.com/Txpple/fvtt-mod-miscpatches); same author, same conventions:
plain ES modules, no build step, no patching, MIT.
