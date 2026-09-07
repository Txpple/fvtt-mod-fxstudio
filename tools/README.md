# tools/

Development tooling; none of it ships in the module zip. Paths live in `lib/env.mjs`
(`FOUNDRY_DATA`, `FXS_WORLD`, `FXS_MCP_REPO` override the defaults). LevelDB is read through
`classic-level` from the MCP repo's `node_modules`.

## Offline — no Foundry, seconds

| Tool | What it does |
| --- | --- |
| `migrate-aa.mjs` | the migration (ARCHITECTURE §6): phase 1's lossless rows (`lib/oracle/`) → FX keyed by identity against the closed lists (the books' and the world's spells, features, items, weapons, the base weapons, the natural attacks of the installed creatures), every AA option mapped onto a knob (`lib/migrate/rows.mjs` is the table), every asset pointed at the libraries' own paths where the same files play the same way (`lib/migrate/nativise.mjs`; the frozen table is what is left), **proved at the render** row by row on the offline stage (`lib/migrate/proof.mjs`: the exact Sequencer calls the oracle makes against the exact calls the engine makes, in a canonical form with every allowance named), the census in the new keys, the report. `--write` writes `recipes/stock/*.json`, `house.json`, `aa-assets.json`, `migration-report.md`; `--show "<row label>"` prints one row's FX and proof; `--all` lists every failure. |
| `check-fx.mjs` | every FX validates (the same validator the API runs) and every asset it names resolves against JB2A's and PSFX's own registration files and the disk. `<file.json>` checks an FX file against the recipes; `--sentences` prints every sentence. Run after any library update and on any FX before it is proposed. |
| `check-imports.mjs` | every module under `scripts/` loads in plain node with Foundry's globals stubbed. Run after any edit under `scripts/`. |
| `check-layers.mjs` | every import points down the layer order (core ← readers, engine ← ui). |
| `check-legacy.mjs` | no Automated Animations vocabulary in `scripts/` or `recipes/` (ARCHITECTURE §0's mechanical half). |
| `census.mjs` | every ability on the world's actors (`--all`, `--actor "Gren"`, `--packs` for the PHB) keyed by identity and resolved: which FX answers, what plays nothing, `--json` as data. |
| `assets.mjs` | the catalogue: `"misty step"` searches the libraries' registration; `jb2a.fire_bolt` lists a path's colours and what it plays; `--sounds`, `--json`. A path is looked up, never guessed. |
| `pull-corpus.mjs` | brings what the Corpus tab shipped back into the repo: compares the module folder on the sandbox (`--from <dir>` for another) with `recipes/**` as FX added, changed and removed; `--write` copies the files in and takes the shipped version (from `recipes/shipped.json`) into `module.json` and its download URL. Then the release ritual. |
| `export-fx.mjs` | the offline path: shows the world buffer (the FX written in the game) as sentences with who wrote them; `--write` folds them into `recipes/house.json`. Only for a server that forbids uploads; the Corpus tab is the way. |

`lib/stage.mjs` is the offline stage: enough of the canvas and Sequencer's API for an FX to build
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
| `preview.mjs` | plays an FX (by id, or an FX file) on the fixture through the API's preview, never saving it; `--template` places a circle; `--watch ms` keeps it up to look at. |
| `sandbox-module.mjs` | switches a module on or off in the sandbox world **offline** (sandbox stopped). Local only. |

## Suites — drive real chains on the sandbox, MUTATE it, restore it

All build their own fixture (`lib/suite.mjs`: a scene of their own, two NPC actors, one token each,
the caster's items copied from the 2024 PHB packs) and tear it down; all delete the messages they
made. Disconnect the MCP bridge first.

| Tool | What it asserts |
| --- | --- |
| `smoke-fx.mjs` | every FX in the corpus BUILDS on the sandbox (the engine compiles it against a synthetic moment, never played) and every path the build names resolves live — database paths through Sequencer, raw files through the server. Then the party's sheets and the NPC attacks through the API's census. |
| `smoke-replay.mjs` | one FX of every shape and moment through the real dnd5e flows: attack rolls (hit and miss, the thrown flight), a damage roll, a usage card, placed templates of every shape (a persistent one ending with its Region), the compositions (a bolt to the template then the burst; the picture picked by position; the beam; the move — the teleport crossing a movement wall with Foundry's displace action, a sight wall refusing it with the reason in the ledger, an FX that need not see crossing it, a creature on the spot refusing it), active effects created, disabled, enabled and deleted, the `play` switch, an ability with no FX, identity over names (a Maul of Momentum plays the maul; the Shield spell plays nothing), and the heal (Cure Wounds plays on its healing roll, which dnd5e flags `healing`, on the target or on the caster when nothing is targeted). Section-filterable (`--section 6`, `--list`); `--watch 4000` pauses after each play. |
| `smoke-screens.mjs` | the screens, driven on the DOM: the window opened on an item and read as a sentence with its why; a spell the corpus has never heard of typed and found on the sheet; the FX sheet (Create FX opens a new sheet unlocked and hooked to the spell; Copy from seeds it with Misty Step; every scene's colour picked dark black, the delay, wait and lasts fields, the arrows reordering, the draft read back; the Hook block; Save, then the sheet locked and tagged Draft); the same sentence on the sheet and from the API; House FX listing it first, a Draft, with the author; Stock FX staging and unstaging it; one item's own FX through the sheet (Open FX → Edit → Item Hook → Save) and taken back; Cancel dropping a change; an FX switched off and on; a real SHIP from Corpus (house.json and the record written into the module on the sandbox, read back, the FX answering from the house corpus) and the files restored byte for byte; the item sheet's FX button and its dropdown entry; the Delay field on a scene. Since 2026-09-07: Load more on the Stock list, View not Edit on a stock row, the Maintain card under Audit, the static action bar in both modes, the VFX field naming the variant, Browse landing on what the scene names (VFX and SFX) and Use writing both back, the Used-in lines loading a path (and a file inside a variant), no Find SFX, Opacity and Tint read back in the sentence, no outcome pills. Follows the screens' terms (Global Hook / Item Hook, Stock / House / Draft, Stage / Ship). Leaves the world buffer and the module's files as it found them. |
| `smoke-author.mjs` | the assistant's round trip: an FX written as data (like Misty Step but black), validated, read as a sentence, previewed without saving, saved to the world buffer with provenance, resolved for a new spell by its key, played from its card, listed by the offline export, removed again. |

The deploy loop for a code change: `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs
fvtt-mod-fxstudio --local`, then a world reload (or a sandbox restart when `module.json`
changed). The deploy does not delete files: after a file is removed from the repo, remove it
from the sandbox's module directory by hand.

**When a suite prints nothing and hangs** (`[foundry] page not ready — reconnecting`, no
results), the browser page died mid-run. Run it again with `FX_TRACE=1` in front of the command:
`tools/lib/foundry.mjs` then prints `PAGE CRASH`, `PAGE CLOSED`, page errors and the page's own
console errors as they happen. A TypeError thrown inside a suite's page function crashes the
renderer rather than failing the assertion — a stale selector is the usual cause.
