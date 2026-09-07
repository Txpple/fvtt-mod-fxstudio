# fxstudio

Visual and sound effects for dnd5e on Foundry VTT, played from what actually happened at the
table. A greenfield design: Automated Animations' corpus is migrated once so the table does not
start from zero, and none of its architecture is carried. Keeps [Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer) as the engine
and JB2A and PSFX as the libraries; replaces Automated Animations by carrying its whole D&D5e
Animations corpus over losslessly, adds the user's own FX and the outcome layers AA never had,
and is driven through one window of six tabs — Stock FX, House FX, FX Editor, Asset Library, Audit, Look up — terms and labels around one generated sentence per FX. It never guesses an FX.

**Status: phase 3 (the screens) built, 2026-09-06, with the authoring walk and the Corpus tab
ruled and built the same day.** FX Studio opens from the Settings sidebar (the GM's "Open FX
Studio" button) or from the wand on any item sheet: *Look up* an ability and read what it plays
as a sentence, with the hook that answered and where it lives (Stock, House or Draft); the *FX
Editor* is one sheet per FX, the same whether you read it or change it — an Edit switch is the
guard (off: Duplicate, Export, Delete or Revert; on: Cancel, Save), the Hook block (one or more
abilities, or one item; Plays or Off; the moment; on miss), the Sequence (one row per scene in
fixed labelled columns — VFX, colour, place, size, SFX, lasts, delay, wait — with the
plain-English line under each and the sentence read back as you go), a Note; Save always writes
a Draft, so Stock and House are never changed by accident; New FX is a blank sheet with Copy
from; *House FX* lists the FX written over Stock in two sub-tabs, *Global Hook* and *Item
Hook*, each name opening its sheet, with Edit, Export and Delete on every row and Import;
*Stock FX* (maintainers) lists Stock the same way and is where the shippable corpus is built —
drafts staged for House or Stock, one Ship button that writes the corpus files into the module
on the server and stamps a version, and `tools/pull-corpus.mjs` to bring them into the repo for
the release; *Asset Library* browses
JB2A by style and PSFX by group and sound, each variant stepped by arrows or a dropdown, the picture
playing on a loop and the sound behind a Play button, with the Sequencer path and the file under it;
the same browser opens from a scene of the sheet to pick that scene's VFX or SFX, and every FX that uses an asset opens its sheet from there; *Audit* reads
the compendiums you pick, by source, and shows what plays nothing in them and what did not resolve.
One item can carry an FX of its own (an Item Hook).
Everything the screens do goes through the API, so a macro or an assistant can do the same
(`tools/smoke-screens.mjs` and `tools/smoke-author.mjs` prove both doors). [ARCHITECTURE.md](ARCHITECTURE.md) is the
design: an FX is found by what acted and when (identity keys dnd5e already keeps — a spell's
identifier, a weapon's name then its base weapon, a natural attack, a feature, an item, an
effect), never by a name rule; an FX is written as the sentence the user would say
(`recipes/SCHEMA.md` is the grammar); the engine knows eight shapes and one escape hatch
(`scripts/engine/shapes/`). The corpus is `recipes/stock/` (the D&D5e Animations corpus
migrated once, one file per kind, 1289 FX), `house.json` (the user's), `starters.json` (what a
new FX starts from) and `aa-assets.json` (the 15 pictures still played through AA's own
metadata, counted). The migration (`tools/migrate-aa.mjs`) is proved at the render: for every
row, the exact Sequencer calls the new engine makes equal the calls AA's own sequence made, with
five deliberate differences named and counted (1296 of 1296; `recipes/migration-report.md`).
Measured on the sandbox: every FX builds and every path resolves live (`tools/smoke-fx.mjs`),
one FX of every shape and moment plays through real dnd5e flows (`tools/smoke-replay.mjs`, 40 of
40 — a Maul of Momentum plays the maul, the Shield spell no longer bashes, a heal plays on its healing roll), and an assistant's
round trip through the API — write, validate, read as a sentence, preview, save with provenance,
export — is green (`tools/smoke-author.mjs`), and the screens are driven on the DOM, a real ship
included (`tools/smoke-screens.mjs`, 54 of 54). A move is a teleport: the token is placed with
Foundry's own teleport action across walls and creatures, and the spot is judged by the spell's
words first — an unoccupied space the caster can see (Misc Patches' teleport patch, carried here). Phase 4, the outcomes and Battle Flow's moments, starts on
the user's word. Read [PLAN.md](PLAN.md) for the phases, [DESIGN.md](DESIGN.md) for what was
decided while building, [BACKLOG.md](BACKLOG.md) for what is parked, and the migration report for
what the user reads before cutover. `prototypes/` holds the investigation's scripts and the
clickable prototype the screens were ruled on.

**Licence.** The code is MIT. `recipes/stock/*.json` is a derived work of
[D&D5e Animations](https://github.com/MrVauxs/dnd5e-animations) 3.3.0 by MrVauxs and Sisimshow and is
licensed GPL-3 (see `recipes/STOCK-LICENSE`); it is carried over whole so nothing that played under
Automated Animations is lost.

Sister of [Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow) and
[Misc Patches](https://github.com/Txpple/fvtt-mod-miscpatches); same author, same conventions:
plain ES modules, no build step, no patching, MIT.
