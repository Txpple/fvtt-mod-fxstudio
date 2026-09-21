# fxstudio — working notes for sessions in this repo

**What this is.** A house Foundry VTT module that plays visual and sound effects for dnd5e from what
happened at the table. Sequencer is the engine, JB2A + PSFX the libraries. It replaced Automated
Animations (AA) and D&D5e Animations by migrating their corpus once as its Stock, with the user's own FX
in House on top. **It never guesses: an ability with no FX plays nothing.** Greenfield: nothing of
AA's architecture, vocabulary or practices survives in `scripts/` (PLAN §0.7, [ARCHITECTURE.md](ARCHITECTURE.md)).
Sister of Battle Flow (`../fvtt-mod-battleflow`, the rules of the game) and Misc Patches
(`../fvtt-mod-miscpatches`): plain ES modules, no build step, no patching, no libWrapper, no
socketlib, MIT.

**State (2026-09-20).** v0.6.0 released 2026-09-19: **dnd5e 6.0.0–6.9.99 only**, on the sandbox
byte-identical. **Prod was upgraded to dnd5e 6.0 and v0.6.0 was DEPLOYED there 2026-09-21, byte-identical** (its
process vends 0.6.0 after its next restart). **Prod's house.json is canonical**: pull it before any deploy
(two overrides saved there on 2026-09-16, greatsword and maul, were pulled in first). The user is
testing v0.6.0 on the sandbox by hand and names what is broken; we fix what they name. Nothing is
owed. Read [NEXT-SESSION.md](NEXT-SESSION.md) — its top block is the handoff.

## The rulings that govern the code (each recorded in DESIGN.md)

- **An FX is in a file or it is nothing (§21).** `recipes/house.json` (this table's, the user's
  file) or `recipes/stock/<kind>.json` (the books'). Save writes the file on the server; editing a
  Stock FX asks House override or Edit Stock; Delete takes the winning layer only; the Library lists
  both an override and the Stock row under it. No draft, stage, ship or world buffer.
- **Stock is the books; House is this table (§16–17).** A Stock row is keyed against the installed
  compendia (PHB, MM, DMG, Ravenloft, Heroes of Faerûn, then the system's SRD 5.2 packs; no SRD 5.1)
  and dnd5e's base weapons, nothing else. `LIST_PACKS` in `tools/lib/dnd5e.mjs` IS the evidence: a
  new book → add its packs → re-run the migration and `node tools/records.mjs --write`.
- **One FX answers one key; one key per item, dnd5e's identifier, exact or nothing (§14, §23).**
  `<kind>:<identifier>` from `system.identifier`, else dnd5e's formatting of the name. No name forms,
  no base-weapon rung, no hooks, no flag of ours on any item. The Editor's **Own key** writes an
  identifier on an item and the sheet becomes a House FX for it. A key is earned from a record or an
  item, never typed. Stock is 1014 FX, House 4. An FX per record playing the same animation as
  another is the design, not redundancy (§18–19) — never offer to clean it up.
- **A name is the record's name (§15).** `nameForKey()` in `ui/records.js` answers on every screen
  from `recipes/records.json`; the Library's Record door opens that record.
- **The grammar is the engine (§22).** A shape's knob list in `core/fx.js` is exactly what its engine
  file reads; `check-engine` proves it, `check-fx` refuses more; the sheet's cells come from that
  list. A new knob lands in the engine, KNOBS and check-engine in one commit, never in the sheet
  first. The data model is otherwise locked.
- **No shortcuts (§9).** `like` and `with` are out; every FX states its scenes in full; a variant is
  a full copy (`api.fx.scenesOf(id)`).
- **A picture that stands for the template hides its Region (§24).** A fill with `persist: template`
  hides dnd5e 6.0's Region at create time (LAYER visibility); a burst leaves it.
- **D&D5e Animations is roadkill (2026-09-16).** Every Stock reference to its files was cut; seven
  FX that were only such a picture are gone (the two walls among them).
- **Terms, not sentences:** Stock / House, a key, Own key, FX / VFX / SFX, override. The word "look" is
  retired. No JSON or raw library paths in front of a GM.

**The window** (a description, not a plan): four tabs, Library · Editor · Assets · Coverage, 1080px.
Library (`ui/fxtab.js`): search by name, facets, one list House → Stock, Import/Export top left; a
row marks itself and has three doors, Record · Delete · Editor. Editor (`ui/sheet.js`): the FX sheet
— identity, sentence, Key strip (Answers · Item with Own key · Moment · State), the sequence rail and
band-tabbed inspector; it survives a tab switch. Assets (`ui/library.js`), Coverage (`ui/coverage.js`).
**The Claude Design redesign is SHELVED** (`shelved/` governs nothing; rollback tag `pre-revamp`
at `a4c9824` also restores `like`/`with`). No plan drives the UI; the user's judgment does. Known
and unruled: the window scrolls sideways below ~780px; a modal dialog swallows later clicks.

**Parked, not owed** ([BACKLOG.md](BACKLOG.md)): the migration's exception tables
(`recipes/migration-report.md`), a QA pass on Stock FX (the Web lesson is the method), the assets
keyed `file`, phase 4 (outcomes and moments, PLAN §6). The user says which, if any.

**The documents.** [PLAN.md](PLAN.md) §0 holds the six locked decisions and the phases;
[DESIGN.md](DESIGN.md) what was decided while building; [ASSESSMENT-6.0.md](ASSESSMENT-6.0.md) the
6.0 port and its rulings; [tools/README.md](tools/README.md) the tools; `prototypes/` the ruled
prototype. A phase starts on the user's word, never on a handoff.

## How the user works

- **Greenfield, checked every time.** Before adopting a shape, ask: is this AA's, taken out of
  convenience? The tells are in ARCHITECTURE.md §0.
- **Wait for "go".** Investigate and plan freely; build when told; one green pass, then check in.
- **The vetting is the user's.** They use it and say what is broken; we fix what they name. Don't
  hunt bugs unbidden, don't drive the window to form an opinion, don't present a list of improvements
  as owed work.
- **A big diff for no behaviour change is not clean-up.**
- **UI questions get a clickable prototype first** (an HTML artifact); the user rules off it.
- **A named ability illustrates a class** ("Sharran Step like Misty Step but black" is the variant
  workflow: copy the whole FX and change the colour).
- **Plain language, signal over detail. Docs are the state**: keep the doc set current; when
  something is decided, write it down where the next session reads it.

## Test environment

- **The LOCAL sandbox is the test box**, never prod: a byte copy of the Molten prod world run
  headless — `node ../fvtt-mcp-dnd5e/scripts/local-foundry.mjs start|stop|status|restart`. Never
  launch the Electron app for suites. Data: `C:\Users\sippelmc\AppData\Local\FoundryVTT\Data`, world
  `the-broken-heart-of-greenrest`. Sandbox: Foundry 14.367, dnd5e 6.0.1, Sequencer 4.2.3, JB2A
  Patreon, PSFX Patreon (`psfx-patreon`). AA and D&D5e Animations are off on prod and absent from
  the sandbox; AA's autorec world setting stays (the migration's input).
- **Deploy:** `node ../fvtt-mcp-dnd5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local`;
  `--check` byte-compares. A world reload is enough for scripts and recipes; **restart** when
  `module.json` changed (one connected user blocks it — `disconnect-bridge` first). It ships
  `scripts/`, `styles/`, `templates/`, `lang/`, `module.json` and `recipes/`. ⚠ It never deletes.
- **A prod → sandbox refresh** (`pull-prod-to-local.mjs`) wipes the module folder and every FX saved
  in the game. Before: `node tools/pull-corpus.mjs --write` and commit. After, sandbox stopped:
  deploy `--local`, `node tools/sandbox-module.mjs --enable fvtt-mod-fxstudio`, start. Add Battle
  Flow fixtures only when a suite run is asked for, and say so.
- **Two MCP bridges.** `foundry-local5e` is the sandbox (localhost:30000). ⚠ `foundry-molten5e` is
  **PROD**: never write there without the user's word. Both share ids; `get-world-info` tells them
  apart by version and who is connected.
- **The gate:** nine offline checks in `tools/` — `check-imports`, `check-layers`, `check-legacy`,
  `check-gates`, `check-moments`, `check-engine`, `check-reader` after any edit under `scripts/`;
  `check-fx`, `check-build` after any edit under `recipes/`. `build-release.ps1` runs them. Stand-ins
  live in `tools/lib/stage.mjs` and `world.mjs`; a data-model change lands there first.
- **The live suites:** `smoke-fx` (every FX builds live), `smoke-replay` (families through real
  dnd5e flows; `--watch` to look), `smoke-author`, `smoke-screens` (the window on the DOM),
  `smoke-boot`. They build their own fixture (`tools/lib/suite.mjs`) and clean up; the identity is
  "Tester Assistant" through `fvtt-mcp-dnd5e/client` (a `file:../fvtt-mcp-dnd5e` dependency — `npm install` once; `classic-level` is declared here too). ⚠ A live compendium is locked
  while Foundry runs: read packs through `snapshot()` in `tools/lib/leveldb.mjs`. ⚠ Foundry 14
  animates a token document through a move: wait for the landing before measuring.

## Prod

Same deploy script with `FOUNDRY_HOST=molten` and no `--local`, **only on the user's explicit say-so**;
`--check` first, and if `recipes/house.json` differs, fetch prod's copy and `pull-corpus --from` it before
deploying — prod's House is the user's live work. A `module.json` change
needs the prod process restarted, which is not ours. Never force-reload the user's prod window.

## Licence

D&D5e Animations is GPL-3: `recipes/stock/*` is a separate work under GPL-3 with
`recipes/STOCK-LICENSE` and attribution (MrVauxs, Sisimshow); code and `house.json` stay MIT.
Sequencer is used through its public API only, never patched.

## Battle Flow

Zero dependency either way. Battle Flow publishes `battleflow.moment` (a plain payload); this module
reads a closed list of five words (`BATTLEFLOW_WORDS`) in `readers/battleflow.js`, plays a `momentId`
once, and honours Battle Flow's hold through the gate in `core/gates.js`. Neither is required nor in
the manifest. Rules of the game belong to Battle Flow, platform fixes to Misc Patches; this module
only plays pictures and sounds.

## Release ritual

Bump `version` and the `download` URL in `module.json` together, one `release:` commit, tag
`vX.Y.Z`, push main and the tag (a lightweight tag needs `git push origin vX.Y.Z`), then
`powershell -ExecutionPolicy Bypass -File tools/build-release.ps1` (runs the gate, writes the zip
with forward-slash entries) and `gh release create vX.Y.Z --notes-file dist/RELEASE-NOTES.md
dist/fvtt-mod-fxstudio.zip module.json`. Notes are hand-written in `dist/` for a public page.
