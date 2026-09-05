# fxstudio — working notes for sessions in this repo

**What this is.** A house Foundry VTT module that plays visual and sound effects for dnd5e from
what happened at the table. It keeps Sequencer as the engine and JB2A + PSFX as the libraries,
and replaces Automated Animations (AA) and the D&D5e Animations preset with seven plain rules, a
short list of custom looks, and four screens that speak in sentences. Sister of Battle Flow
(`../fvtt-mod-battleflow`, the rules of the game) and Misc Patches (`../fvtt-mod-miscpatches`):
same author, same conventions — plain ES modules, no build step, no patching, no libWrapper, no
socketlib, MIT.

**Status: PLANNED, NOT BUILT (2026-09-05).** Read [PLAN.md](PLAN.md) first; it holds the
architecture, the measured facts, the one-and-done AA import, Battle Flow's part, and five
phases with an exit measurement each. `prototypes/` holds the investigation's scripts and the
clickable prototype the user ruled the shape on ("it reads right"). Work starts on the user's
explicit **"go"**; a handoff or a plan is not one. Each phase ends at a check-in.

## How the user works (standing rules, learned in the sister repos)

- **Wait for "go".** Investigate, prototype and plan freely; build only when told. One green
  pass, then check in at every break point.
- **UI questions get a clickable prototype first** (an HTML artifact); the user rules off it,
  then says go. The ruled prototype's source is `prototypes/fxstudio2.template.html` and the
  live artifact was https://claude.ai/code/artifact/33a2e286-f1fe-4358-a407-16e7ef0ea316.
- **Plain language, signal over detail.** Summaries in sentences; parked work is never presented
  as owed work. No JSON in anything a non-technical GM sees.
- **A named ability in the user's ask illustrates a class.** "Sharran Step like Misty Step but
  black" is the variant workflow, not a one-off.
- **Docs are the state.** Keep PLAN.md current; when something ships, write the same doc set the
  sisters keep (README, a design/architecture note, a backlog of what is parked and why).

## Test environment

- **The LOCAL sandbox is the test box**, never prod. It is a byte copy of the Molten prod world,
  run headless: `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs start|stop|status|restart`.
  Never launch the Electron app for suites. Data lives at
  `C:\Users\sippelmc\AppData\Local\FoundryVTT\Data` (world `the-broken-heart-of-greenrest`).
- **Deploy to the sandbox:** `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs
  fvtt-mod-fxstudio --local`, then **restart** the sandbox when `module.json` changed (a new
  setting, a new file in `esmodules`, a new version); a world reload is enough for script edits.
  Deploy while the server is down, then start — that satisfies the script-cache discipline.
- **A prod → sandbox refresh** (`pull-prod-to-local.mjs`) wipes locally deployed modules AND
  Battle Flow's test fixtures. Re-deploy after every refresh. The user wants the sandbox an
  EXACT copy of prod after a refresh: add fixtures (`node
  ../fvtt-mod-battleflow/tools/fixture-suite.mjs`) only when a suite run is asked for, and say so.
- **Two MCP bridges, two worlds.** `foundry-local5e` is the sandbox (localhost:30000).
  ⚠ `foundry-molten5e` is **PROD** — reading is harmless, writing is a prod change; never write
  there without the user's word. Both worlds share ids, so a `get-world-info` tells them apart
  only by Foundry version and who is connected. `disconnect-bridge` before a suite or a restart:
  one connected user blocks the restart.
- **Suites** go in `tools/` and use the MCP repo's Foundry client
  (`../fvtt-mcp-molten5e/dist/foundry.js`, credentials from its `.env`; the suite identity is
  "Tester Assistant"). Follow Battle Flow's `tools/README.md` pattern: section-filterable, every
  suite restores what it touched and deletes its own chat messages.
- **Reading the world offline** (no Foundry needed, as the investigation did): copy a LevelDB
  folder (`data/settings`, `data/actors`, a module's `packs/<name>`) to a scratch dir and read
  it with `classic-level` from `../fvtt-mcp-molten5e/node_modules`; see `prototypes/read-db.mjs`.
  The libraries' registration files evaluate in plain node: `modules/jb2a_patreon/scripts/
  jb2a_sequencer.js` (call `jb2aPatreonDatabase('modules')`) and `modules/psfx/scripts/
  psfx_sequencer.js` (`registerPSFXDatabase('modules/psfx')`); see `prototypes/derive.mjs`.

## What is installed on the sandbox (mirrors prod, 2026-09-05)

Sequencer 4.2.3 · JB2A Patreon 0.9.2 (209 styles, 10052 database paths, registers `jb2a.*`) ·
PSFX 0.16.0 — the **free** build today (277 paths; ~203 preset sounds need Patreon) · Automated
Animations 7.0.22 and D&D5e Animations 3.3.0 — **still on until cutover** (PLAN §6 phase 4) ·
dnd5e 5.3.3 on Foundry 14. AA's world settings hold the 1290-row autorec; leave them alone until
the import has run and been checked.

## Prod

Deployed with the same script without `--local`, **only on the user's explicit say-so**. A
module.json change needs the prod process restarted, which is not ours to do. Never force-reload
the user's prod window. Prod parity is a measurement: `deploy-house-module.mjs fvtt-mod-fxstudio
--check` byte-compares.

## Licence rule (measured 2026-09-05)

D&D5e Animations is **GPL-3**. Its preset rows are its authors' work: the import **tool** is ours
and ships; the **data** it generates (`recipes/imported.json`, `prototypes/fx-recipes.json`) is
produced from the user's own world and is **never committed** to this MIT repo (gitignored).
AA's Sequencer chains are MIT and may be vendored with attribution. Sequencer is used through its
public API only — presets, custom sections, our own database namespace — never patched.

## Battle Flow relationship

Zero dependency either way. Battle Flow will emit a small set of public hooks at its resolve
points (its own commission, in its repo, walked and batteried there); fxstudio listens and never
reads Battle Flow's internal message flags. Anything that is a rule of the game belongs to Battle
Flow; anything that is a platform fix belongs to Misc Patches; this module only plays pictures
and sounds.

## Release ritual (as the sisters do it)

Bump `version` AND the `download` URL in `module.json` together, one `release:` commit, tag
`vX.Y.Z`, push with tags, `gh release create vX.Y.Z` with a zip of `module.json` + `scripts/` (+
`recipes/`, `styles/`, `templates/` once they exist; forward-slash entry names — see Battle
Flow's `tools/build-release.ps1` for why) and a bare `module.json`.
