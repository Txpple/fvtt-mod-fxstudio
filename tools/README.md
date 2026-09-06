# tools/

Development tooling; none of it ships in the module zip. Paths live in `lib/env.mjs`
(`FOUNDRY_DATA`, `FXS_WORLD`, `FXS_MCP_REPO` override the defaults). LevelDB is read through
`classic-level` from the MCP repo's `node_modules`.

## Offline — no Foundry, seconds

| Tool | What it does |
| --- | --- |
| `migrate-aa.mjs` | the migration (ARCHITECTURE §6): phase 1's lossless rows (`lib/oracle/`) → looks keyed by identity against the closed lists (the books' and the world's spells, features, items, weapons, the base weapons, the natural attacks of the installed creatures), every AA option mapped onto a knob (`lib/migrate/rows.mjs` is the table), every asset pointed at the libraries' own paths where the same files play the same way (`lib/migrate/nativise.mjs`; the frozen table is what is left), **proved at the render** row by row on the offline stage (`lib/migrate/proof.mjs`: the exact Sequencer calls the oracle makes against the exact calls the engine makes, in a canonical form with every allowance named), the census in the new keys, the report. `--write` writes `recipes/baseline/*.json`, `house.json`, `aa-assets.json`, `migration-report.md`; `--show "<row label>"` prints one row's look and proof; `--all` lists every failure. |
| `check-looks.mjs` | every look validates (the same validator the API runs) and every asset it names resolves against JB2A's and PSFX's own registration files and the disk. `<file.json>` checks a look file against the recipes; `--sentences` prints every sentence. Run after any library update and on any look before it is proposed. |
| `check-imports.mjs` | every module under `scripts/` loads in plain node with Foundry's globals stubbed. Run after any edit under `scripts/`. |
| `check-layers.mjs` | every import points down the layer order (core ← readers, engine ← ui). |
| `check-legacy.mjs` | no Automated Animations vocabulary in `scripts/` or `recipes/` (ARCHITECTURE §0's mechanical half). |
| `census.mjs` | every ability on the world's actors (`--all`, `--actor "Gren"`, `--packs` for the PHB) keyed by identity and resolved: which look answers, what plays nothing, `--json` as data. |
| `assets.mjs` | the catalogue: `"misty step"` searches the libraries' registration; `jb2a.fire_bolt` lists a path's colours and what it plays; `--sounds`, `--json`. A path is looked up, never guessed. |
| `export-looks.mjs` | shows the world buffer (the looks written in the game) as sentences with who wrote them; `--write` folds them into `recipes/house.json`. The only way a look reaches the house corpus. |

`lib/stage.mjs` is the offline stage: enough of the canvas and Sequencer's API for a look to build
in node, with a recording Sequence the proof compares. `lib/recipes.mjs` reads the recipes the way
the module does and wires the engine's asset database to the registration files. `lib/dnd5e.mjs`
holds the base weapons and the pack lists. `lib/oracle/` is phase 1's line-for-line port of AA's
sequences plus its rows (`import-aa.mjs` regenerates them from AA's own data, once), kept as the
proof's independent side and otherwise history; `lib/aa-port.mjs` is AA's own reading of an entry.
`lib/suite.mjs` is the section filter and the live fixture; `lib/foundry.mjs` the sandbox connection
as "Tester Assistant"; `lib/libraries.mjs` loads the three databases and reads them the way Sequencer does.

## Live — the local sandbox only

| Tool | What it does |
| --- | --- |
| `smoke-boot.mjs` | read-only: what the module loaded, a few subjects resolved live against the recipes on disk (Maul of Momentum plays the maul; the Shield spell plays nothing; the Shield effect plays the shield). |
| `preview.mjs` | plays a look (by id, or a look file) on the fixture through the API's preview, never saving it; `--template` places a circle; `--watch ms` keeps it up to look at. |
| `sandbox-module.mjs` | switches a module on or off in the sandbox world **offline** (sandbox stopped). Local only. |

## Suites — drive real chains on the sandbox, MUTATE it, restore it

All build their own fixture (`lib/suite.mjs`: a scene of their own, two NPC actors, one token each,
the caster's items copied from the 2024 PHB packs) and tear it down; all delete the messages they
made. Disconnect the MCP bridge first.

| Tool | What it asserts |
| --- | --- |
| `smoke-looks.mjs` | every look in the corpus BUILDS on the sandbox (the engine compiles it against a synthetic moment, never played) and every path the build names resolves live — database paths through Sequencer, raw files through the server. Then the party's sheets and the NPC attacks through the API's census. |
| `smoke-replay.mjs` | one look of every shape and moment through the real dnd5e flows: attack rolls (hit and miss, the thrown flight), a damage roll, a usage card, placed templates of every shape (a persistent one ending with its Region), the compositions (a bolt to the template then the burst; the picture picked by position; the beam; the move), active effects created, disabled, enabled and deleted, the `play` switch, an ability with no look, and identity over names (a Maul of Momentum plays the maul; the Shield spell plays nothing). Section-filterable (`--section 6`, `--list`); `--watch 4000` pauses after each play. |
| `smoke-screens.mjs` | the screens, driven on the DOM: the window opened on an item and read as a sentence with its why; a spell the corpus has never heard of typed and found on the sheet; the editor's pickers (Start from Misty Step, the family's colours, dark black), the draft read back before Save; Save writing the one-line look with provenance; the same sentence on the screen and from the API; Custom looks listing it first with the author; Check counting it; one item's own look set and taken back; a look switched off and on; the item sheet's FX button and its dropdown entry, opening the window on that item. Leaves the world buffer as it found it. |
| `smoke-author.mjs` | the assistant's round trip: a look written as data (like Misty Step but black), validated, read as a sentence, previewed without saving, saved to the world buffer with provenance, resolved for a new spell by its key, played from its card, listed by the offline export, removed again. |

The deploy loop for a code change: `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs
fvtt-mod-fxstudio --local`, then a world reload (or a sandbox restart when `module.json`
changed). The deploy does not delete files: after a file is removed from the repo, remove it
from the sandbox's module directory by hand.
