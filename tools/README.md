# tools/

Development tooling; none of it ships in the module zip. Paths live in `lib/env.mjs`
(`FOUNDRY_DATA`, `FXS_WORLD`, `FXS_MCP_REPO` override the defaults). LevelDB is read through
`classic-level` from the MCP repo's `node_modules`.

## Offline — no Foundry, seconds

| Tool | What it does |
| --- | --- |
| `import-aa.mjs` | the one-and-done migration (PLAN §4): snapshots the world's settings and actors, reads the D&D5e Animations preset and the libraries' registration files, converts every row losslessly, splits baseline from house, **proves parity** (every world row plays the same files, sound, options and metadata through the resolver; the run fails on any mismatch), runs the matching census and writes the report. `--write` writes `recipes/{baseline,house,aa-database}.json` and `recipes/import-report.md`; `--psfx-free <file>` re-points sounds a PSFX build regrouped. Needs Automated Animations installed (its sourcemap) — once. |
| `check-looks.mjs` | every path in both corpora and the private table against JB2A's and PSFX's own registration files and the disk (Data and the app's `public/`). Fails on any path that does not resolve; tolerates only the files the import report already lists as missing since AA. Run after any library update. |

`lib/aa-port.mjs` is AA's own reading of an autorec entry (its option tables, path builder and
lookup), ported line for line so the proof has an independent side. `lib/libraries.mjs` loads the
three databases and reads them the way Sequencer does.

## Live — the local sandbox only

| Tool | What it does |
| --- | --- |
| `smoke-boot.mjs` | read-only: connects as "Tester Assistant", asks the world what the module loaded, resolves sample rows through the live resolver and through `Sequencer.Database`, compares with the recipes on disk. Disconnect the MCP bridge first. |
| `sandbox-module.mjs` | switches a module on or off in the sandbox world **offline** (sandbox stopped): writes `core.moduleConfiguration` into the settings LevelDB. Local only; there is no prod path. |

The deploy loop for a code change: `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs
fvtt-mod-fxstudio --local`, then a world reload (or a sandbox restart when `module.json`
changed). A brand-new module registers on the next sandbox process start: stop, deploy, enable
with `sandbox-module.mjs`, start.
