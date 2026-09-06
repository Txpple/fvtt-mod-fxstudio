# fxstudio

Visual and sound effects for dnd5e on Foundry VTT, played from what actually happened at the
table. Keeps [Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer) as the engine
and JB2A and PSFX as the libraries; replaces Automated Animations by carrying its whole D&D5e
Animations corpus over losslessly, adds the user's own looks and the outcome layers AA never had,
and is driven through four screens that speak in sentences. It never guesses a look.

**Status: phase 0 (foundation) built, 2026-09-06; nothing plays yet.** The corpus is in
`recipes/` — the baseline converted row for row from D&D5e Animations with a parity proof (every
row plays the same files, sound and options it did under Automated Animations, 1289 of 1289), the
house layer this world had on top, and the private Sequencer table the baseline plays through. The
module loads both corpora and exposes the resolver; the presets that play them are phase 1. Read
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
