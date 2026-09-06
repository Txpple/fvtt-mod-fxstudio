# tools/

Development tooling; none of it ships in the module zip. Paths live in `lib/env.mjs`
(`FOUNDRY_DATA`, `FXS_WORLD`, `FXS_MCP_REPO` override the defaults). LevelDB is read through
`classic-level` from the MCP repo's `node_modules`.

## Offline — no Foundry, seconds

| Tool | What it does |
| --- | --- |
| `import-aa.mjs` | the one-and-done migration (PLAN §4): snapshots the world's settings and actors, reads the D&D5e Animations preset and the libraries' registration files, converts every row losslessly, splits baseline from house, **proves parity** (every world row plays the same files, sound, options and metadata through the resolver; the run fails on any mismatch), runs the matching census and writes the report. `--write` writes `recipes/{baseline,house,aa-database}.json` and `recipes/import-report.md`; `--psfx-free <file>` re-points sounds a PSFX build regrouped. Needs Automated Animations installed (its sourcemap) — once. |
| `check-looks.mjs` | every path in both corpora and the private table against JB2A's and PSFX's own registration files and the disk (Data and the app's `public/`). Fails on any path that does not resolve; tolerates only the files the import report already lists as missing since AA. Run after any library update. |
| `check-imports.mjs` | every module under `scripts/` loads in plain node with Foundry's globals stubbed: a misspelt import, a missing export or a syntax error fails here in a second. Run after any edit under `scripts/`. |

`lib/suite.mjs` is the section filter (`--section`, `--list`, a filtered run stamped PARTIAL) and the
fixture; `lib/foundry.mjs` the sandbox connection as "Tester Assistant". `lib/aa-port.mjs` is AA's own reading of an autorec entry (its option tables, path builder and
lookup), ported line for line so the proof has an independent side. `lib/libraries.mjs` loads the
three databases and reads them the way Sequencer does.

## Live — the local sandbox only

| Tool | What it does |
| --- | --- |
| `smoke-boot.mjs` | read-only: connects as "Tester Assistant", asks the world what the module loaded, resolves sample rows through the live resolver and through `Sequencer.Database`, compares with the recipes on disk. Disconnect the MCP bridge first. |
| `sandbox-module.mjs` | switches a module on or off in the sandbox world **offline** (sandbox stopped): writes `core.moduleConfiguration` into the settings LevelDB. Local only; there is no prod path. |

## Suites — drive real chains on the sandbox, MUTATE it, restore it

Both build their own fixture (`lib/suite.mjs`: a scene of their own viewed by the suite's client
only, two NPC actors, one token each, the caster's items copied from the 2024 PHB packs) and tear it
down; both delete the messages they made. Disconnect the MCP bridge first. **Automated Animations
is still on**, so every action plays under both modules at once — that is the side-by-side.

| Tool | What it asserts |
| --- | --- |
| `smoke-looks.mjs` | every effective row in both corpora BUILDS on the sandbox (its preset compiles it against a synthetic moment, never played) and every path the build names resolves live — database paths through Sequencer, raw files through the server. Then the party's sheets (every ability with a look builds; the rest counted as "nothing plays yet") and the NPC attack census (PLAN §7). The phase 1 exit's automated half. |
| `smoke-replay.mjs` | one row of every menu type and family through the real dnd5e flows: attack rolls (hit and miss, the thrown switch), a damage roll, a usage card, placed templates of every shape (persistent ones ending with their Region), the four presets, active effects created, disabled, enabled and deleted, the `play` switch, an ability with no row. Section-filterable (`--section 6`, `--list`); `--watch 4000` pauses after each play so a person on a second client can compare with AA by eye. |

The deploy loop for a code change: `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs
fvtt-mod-fxstudio --local`, then a world reload (or a sandbox restart when `module.json`
changed). A brand-new module registers on the next sandbox process start: stop, deploy, enable
with `sandbox-module.mjs`, start.
