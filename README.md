# fxstudio

Visual and sound effects for dnd5e on Foundry VTT, played from what actually happened at the
table. Keeps [Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer) as the engine
and JB2A and PSFX as the libraries; replaces Automated Animations by carrying its whole D&D5e
Animations corpus over losslessly, adds the user's own looks and the outcome layers AA never had,
and is driven through four screens that speak in sentences. It never guesses a look.

**Status: planned, not built.** Read [PLAN.md](PLAN.md). `prototypes/` holds the investigation's
scripts: the AA-to-rows converter, the preset diff and feature census, the parked derivation-rule
tests against the 2024 Player's Handbook, and the clickable prototype the design was ruled on.

**Licence.** The code is MIT. `recipes/baseline.json` is a derived work of
[D&D5e Animations](https://github.com/MrVauxs/dnd5e-animations) 3.3.0 by MrVauxs and Sisimshow and is
licensed GPL-3 (see `recipes/BASELINE-LICENSE`); it is carried over whole so nothing that played under
Automated Animations is lost.

Sister of [Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow) and
[Misc Patches](https://github.com/Txpple/fvtt-mod-miscpatches); same author, same conventions:
plain ES modules, no build step, no patching, MIT.
