# fxstudio — working notes for sessions in this repo

**What this is.** A house Foundry VTT module that plays visual and sound effects for dnd5e from what
happened at the table. Sequencer is the engine, JB2A + PSFX the libraries. It replaced Automated
Animations (AA) and D&D5e Animations by migrating their corpus once as its Stock, with the user's own FX
in House on top. **It never guesses: an ability with no FX plays nothing.** Greenfield: nothing of
AA's architecture, vocabulary or practices survives in `scripts/` (PLAN §0.7, [ARCHITECTURE.md](ARCHITECTURE.md)).
Part of Open Roll 5e beside By the Books (`../fvtt-mod-bythebooks`, formerly Battle Flow, the rules of the game) and Errata
(`../fvtt-mod-errata5e`, fixes for vendor bugs): plain ES modules, no build step, no patching, no libWrapper, no
socketlib, MIT.

**State (2026-10-16).** v0.10.2 is the release, on prod through Foundry's installer with prod's House
byte-identical to the repo's before and after. `main` carries unreleased work past it, deployed to the
sandbox for the user's testing: By the Books' contract held by `check-contract` (one picture per word; a
resolve that came to nothing plays nothing); Phase 0 of the state review (the suite's
`docs/reviews/2026-10-16-fxstudio-review.md`), the fix pass that needed no ruling; and Phases 2 to 4, the
rulings of DESIGN §27 and §28 built: the window renders by part (`ui/morph.js`) and keeps focus and
scroll, a picture is a name on the sheet with ▶ on every rail row and Play all, the nine moment words and
`event:` keys are authored, Browse opens a drawer that picks into one scene (`ui/drawer.js`), the
inspector is one column of the cells the shape reads with a size kind and From/To, the layout breaks on
the window's own width, the wand, a search miss and a Coverage row land on "Nothing plays for…" with
Starter, Copy from and Blank, and Coverage is the gap tool's screen over a shipped
`recipes/proposals.json` (`tools/proposals.mjs`; 1,580 proposed, 1,567 judged, 0 open, agreeing with
`gaps.mjs` at 3,147 gaps). Phase 5 (§28.7, the content): the first batch, the Echoes party's nineteen keys
with proposals, is Stock on `main`; the next patches wait on the user's word each; a popped-out
window under a modal is untested. It reads By
the Books (`fvtt-mod-bythebooks`, hooks `bythebooks.*`) and still a table on Battle Flow 2.x (the legacy
id, the `battleflow.moment` hook and flag scope). **dnd5e 6.0.0–6.9.99 only**. **Prod is the Echoes of
Halruaa box** (Molten, the `foundry-halruaa5e` bridge), where FX Studio is active; the repo's House is
prod's, byte for byte, and `recipes/records.json` is built from the Echoes world (`tools/lib/env.mjs`
defaults `FXS_WORLD` to `echoes-of-halruaa`). Four House FX (vesper-staff, first-light-thomas-a-invictus,
goldthorn-jetten-elisedil, necrotic-scythe) answer keys no item in this world carries: made for Greenrest's
characters, they play nothing here and their Record link points nowhere until such an item exists. The
user tests on the sandbox by hand and names what is broken; we fix what they name. Nothing is owed. The
dated journal is `docs/log/YYYY-MM.md`; [NEXT-SESSION.md](NEXT-SESSION.md) holds the older handoff history.

**Prod's house.json is canonical**: pull it before any deploy (see [Prod](#prod)). The clone lives under
the suite folder: `../fvtt-mcp-dnd5e` resolves, the campaign repos are `../../fvtt-campaign-*`.

## The rulings that govern the code (each recorded in DESIGN.md)

- **An FX is in a file or it is nothing (§21).** `recipes/house.json` (this table's, the user's
  file) or `recipes/stock/<kind>.json` (the books'). Save writes the file on the server; editing a
  Stock FX asks House override or Edit Stock; Delete takes the winning layer only; the Library lists
  both an override and the Stock row under it. No draft, stage, ship or world buffer.
- **Stock is the books; House is this table (§16–17).** A Stock row is keyed against the installed
  compendia (PHB, MM, DMG, Ravenloft, Heroes of Faerûn, Arcana Unleashed, then the system's SRD 5.2
  packs; no SRD 5.1) and dnd5e's base weapons, nothing else — save the moment-wide FX in `stock/events.json`, keyed `event:<word>` (the user's exception, DESIGN §26). `LIST_PACKS` in `tools/lib/dnd5e.mjs`
  IS the evidence: a new book → add its packs → `node tools/records.mjs --write`, `node tools/gaps.mjs
  --write`. ⚠ **Never `migrate-aa.mjs --write` again**: Stock has been edited by hand since the last
  migration (the roadkill cut, Web) and a write would undo it. Run it dry, or write to a scratch copy
  and lift only the FX the new book earns (how Arcana Unleashed's 13 came in).
- **An FX needs a moment (§25).** An ability gets an FX only when something happens at the table — an
  instant, or an effect for a limited time. Passive traits (a resistance, darkvision, a proficiency,
  a lasting enchantment, a record with no activity) get none.
- **One FX answers one key; one key per item, dnd5e's identifier, exact or nothing (§14, §23).**
  `<kind>:<identifier>` from `system.identifier`, else dnd5e's formatting of the name. No name forms,
  no base-weapon rung, no hooks, no flag of ours on any item. The Editor's **Own key** writes an
  identifier on an item and the sheet becomes a House FX for it. A key is earned from a record or an
  item, never typed. Stock is 1049 FX (1047 keyed to records, plus `summon-appears` and `summon-leaves` in `stock/events.json`, DESIGN §26), House 9. An FX per record playing the same animation as
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
- **D&D5e Animations is roadkill.** Every Stock reference to its files was cut; seven
  FX that were only such a picture are gone (the two walls among them).
- **Terms, not sentences:** Stock / House, a key, Own key, FX / VFX / SFX, override. The word "look" is
  retired. No JSON or raw library paths in front of a GM.

**The window** (a description, not a plan; its rulings are DESIGN §27 and §28): four tabs, Library ·
Editor · Assets · Coverage, 1080px by default and laid out on its own width (the rail stacks over the
inspector at 800px and under). Library (`ui/fxtab.js`): search by name, facets, one list House → Stock,
Import/Export top left; a row marks itself and has three doors, Record · Delete · Editor; a search miss
lists the abilities on this world's actors that play nothing, each a door. Editor (`ui/sheet.js`, its
parts repainted through `ui/morph.js`): the FX sheet — identity, sentence, Key strip (Answers · Item with
Own key · Moment with the nine words · State), the landing ("Nothing plays for…": Starter, Copy from,
Blank), the sequence rail with ▶ per scene and Play all, the one-column inspector, Browse's drawer
(`ui/drawer.js`); it survives a tab switch. Assets (`ui/library.js`) is a browser only. Coverage
(`ui/coverage.js`) is the gap tool's screen: every row says why, from the moment rule,
`recipes/proposals.json` and the ledger; Maintain is a disclosure in the corner. **The Claude Design
redesign is SHELVED** (`shelved/` governs nothing; rollback tag `pre-revamp` at `a4c9824` also restores
`like`/`with`). No plan drives the UI; the user's judgment does. Untested: a popped-out window under a
modal.

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
  launch the Electron app for suites. Data: the local Foundry data folder (`FOUNDRY_DATA`), world
  `echoes-of-halruaa` (a mirror of prod). Sandbox: Foundry
  14.369, dnd5e 6.0.6, Sequencer 4.2.3, JB2A
  Patreon, PSFX Patreon (`psfx-patreon`). AA and D&D5e Animations are off on prod and absent from
  the sandbox; AA's autorec world setting stays (the migration's input).
- **Deploy:** `node ../fvtt-mcp-dnd5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local`;
  `--check` byte-compares. A world reload is enough for scripts and recipes; **restart** when
  `module.json` changed (one connected user blocks it — `disconnect-bridge` first). It ships
  `module.json` and the served folders (here `scripts/`, `styles/`, `recipes/`). ⚠ It never deletes.
- **A prod → sandbox refresh** (`pull-prod-to-local.mjs`) wipes the module folder and every FX saved
  in the game. Before: `node tools/pull-corpus.mjs --write` and commit. After, sandbox stopped:
  deploy `--local`, `node tools/sandbox-module.mjs --enable fvtt-mod-fxstudio`, start. Add By the
  Books fixtures only when a suite run is asked for, and say so.
- **Two MCP bridges.** `foundry-local5e` is the sandbox (localhost:30000). ⚠ `foundry-halruaa5e` is **PROD** (the
  live Molten box): never write there without the user's word. The two share ids;
  `get-world-info` tells them apart by version and who is connected.
- **The gate:** ten offline checks in `tools/` — `check-imports`, `check-layers`, `check-legacy`,
  `check-gates`, `check-moments`, `check-contract`, `check-engine`, `check-reader` after any edit under `scripts/`;
  `check-fx`, `check-build` after any edit under `recipes/`. `build-release.ps1` runs them.
  `check-contract` reads By the Books' `contracts/` from the sibling clone and skips, saying so, without it. Stand-ins
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

## By the Books (formerly Battle Flow)

Zero dependency either way. By the Books publishes `bythebooks.moment` (a plain payload; Battle Flow
2.x published `battleflow.moment`, and 3.0 emits both names for one release); this module listens to
both names in `readers/bythebooks.js`, hears a `momentId` once per word (the twin; one resolve can publish
under two words), skips a resolve that came to nothing (a pass, a decline: `declinedBy`), reads a closed list of five
words (`BYTHEBOOKS_WORDS`) plus `cast` on its `summon` record as our `summon` (`BYTHEBOOKS_RECORDS`,
DESIGN §26; Stock's `summon-appears` answers every summon, and a companion leaving is `unsummon`, answered by `summon-leaves`), plays a `momentId` once per word, and honours the hold through the gate in
`core/gates.js`, asking `fvtt-mod-bythebooks` first and the legacy `fvtt-mod-battleflow` when that is
the active one. Neither is required nor in the manifest. The legacy names are for a table still on
2.x, not for the double emit; they go when no table runs 2.x (the rename: its issue #6). What this
reads of By the Books is its contract, in its repo (`contracts/moment.json`, `contracts/card-flags.json`);
`check-contract` holds the reader to it and `contracts/consumes.json` names the versions. Rules of
the game belong to By the Books, upstream-bug fixes to Errata; this module only plays pictures and
sounds.

## Release ritual

Bump `version` and the `download` URL in `module.json` together, one `release:` commit, tag
`vX.Y.Z`, push main and the tag (a lightweight tag needs `git push origin vX.Y.Z`), then
`powershell -ExecutionPolicy Bypass -File tools/build-release.ps1` (runs the gate, writes the zip
with forward-slash entries) and `gh release create vX.Y.Z --notes-file dist/RELEASE-NOTES.md
dist/fvtt-mod-fxstudio.zip module.json`. Notes are hand-written in `dist/` for a public page.
