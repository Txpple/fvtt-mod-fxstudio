# fxstudio — working notes for sessions in this repo

**What this is.** A house Foundry VTT module that plays visual and sound effects for dnd5e from
what happened at the table. It keeps Sequencer as the engine and JB2A + PSFX as the libraries,
and replaces Automated Animations (AA) and the D&D5e Animations preset by carrying their whole
corpus over losslessly as its stock, with the user's own FX in a house corpus on top, the
outcome layers AA never had, and three screens that speak in sentences. It never guesses an FX:
an ability with no FX plays nothing until the user gives it one. **It is a greenfield opportunity
to do it right: AA was written before Foundry 14 and before assistants, and its architecture is not
carried — AA's corpus is migrated once so the table does not start from zero, and nothing of its
practices, vocabulary or model survives in `scripts/` (ruled 2026-09-06, PLAN §0.7,
[ARCHITECTURE.md](ARCHITECTURE.md)).** Sister of Battle Flow
(`../fvtt-mod-battleflow`, the rules of the game) and Misc Patches (`../fvtt-mod-miscpatches`):
same author, same conventions — plain ES modules, no build step, no patching, no libWrapper, no
socketlib, MIT.

**Status (2026-09-07): A RESET. The UI redesign that ran off a Claude Design brief is SHELVED, on
the user's word:**

> *"the ui is buggy as fuck, it has mostly what i want, but i dont want to be burdened by the plan
> from the html and redesign, which came from claude design. id like to continue the refactor using
> my own judgment. … shelve the plans to date and radically clean things up. we need another tabula
> rasa reset where we're going to vet with what we have, fix it and see if we can go fwd, if not
> we'll go back to the commit before this started."*

**No plan drives the UI. The user's judgment does.** `shelved/HANDOFF.md` and
`shelved/fxstudio6-proposal.html` are history — never instructions, never work to "finish". Do not
propose the shelved steps, do not cite their rules as authority, and do not start a UI change that
the user has not named. **The vetting is the user's**: they use it, they say what is broken, we fix
what they name.

**The rollback point is `a4c9824`, tagged `pre-revamp`** — the UI as it stood after the two in-game
bug-testing passes, before the redesign. ⚠ Rolling back also **restores `like` and `with` to the
grammar**, because the no-shortcuts ruling rode in on the first redesign commit (`ce74b8c`) with
step 2. `shelved/README.md` has the commands and what each redesign commit changed.

**What the window is today** (this is a description of the code, not a plan): three tabs — **FX ·
Assets · Coverage** — with one search in the window header and the FX sheet as a **pane**, not a
tab. It opens at 1080px. **FX** (`ui/fxtab.js`): facets · the rows · a 300px detail pane; one list
of every FX grouped Draft → House → Stock; the pane holds Edit · ▶ Play · Ships as · Duplicate ·
Export · Delete. **Assets** (`ui/library.js`): shelf · stage · paths · Used-in, and the picker the
sheet's Browse opens. **Coverage** (`ui/coverage.js`): Maintain at the top, then My actors ·
Compendiums, four tiles, and the rows. **The FX sheet** (`ui/sheet.js`): identity + action bar · the
sentence · the hook strip · the sequence (a rail, an overlap strip, a band-tabbed inspector) · the
note; `delay` is *Wait before*, `wait` is *Hold next*; Save is always a Draft; Delete is for good.

**The rulings that stand on their own, independent of the shelved plan:** NO SHORTCUTS — `like` and
`with` are out of the grammar, every FX states its scenes in full, and a variant is a full copy
(`api.fx.scenesOf(id)` hands you the scenes to copy). Terms, not sentences: Stock / House / Draft,
Global Hook / Item Hook, staged. FX / VFX / SFX. No JSON or raw library paths in front of a GM. It
never guesses: an ability with no FX plays nothing.

**Known and unfixed, found by driving the window on 2026-09-07** — offered, not owed, and the user
has not ruled on either: the window **scrolls sideways below about 780px** on all three tabs, and
**a modal dialog swallows every later click** (Back from an unsaved new sheet opens the leave guard;
anything clicked while it is up does nothing).

**NEXT: nothing. Wait for the user.** Read [NEXT-SESSION.md](NEXT-SESSION.md) first — it is the
handoff for this reset. Phase 4 (outcomes and moments, PLAN §6), the 502 migrated assets keyed
`file` (BACKLOG) and cutover (PLAN §6 phase 5) are all parked on the user's word.

**The documents.** Read [PLAN.md](PLAN.md) first; §0 holds the six locked decisions (whole corpus as
stock, zero loss measured, GPL stock shipped with attribution, house corpus, no guessing,
improvements in scope), then the architecture, the measured facts, the lossless AA import with its
parity proof and matching census, Battle Flow's part, and five phases with an exit measurement
each. [DESIGN.md](DESIGN.md) holds what was decided while building (the row, the private Sequencer
table `fxstudio.aa.*` and why, the matching rules, and §6: the moments, who plays, the presets,
the ledger; §7: phase 2 — the proof, where every AA option went, the keys, the frozen table); [BACKLOG.md](BACKLOG.md) what is parked;
`recipes/migration-report.md` the census the user reads before cutover; [tools/README.md](tools/README.md)
the tools. `prototypes/` holds the investigation's scripts and the clickable prototype the user
ruled the shape on ("it reads right"); `shelved/` holds the redesign brief and its screens, which
govern nothing. Each phase ends at a check-in; the next phase starts on the user's word, never on a
handoff or a plan — which is the rule the shelved redesign broke.

## How the user works (standing rules, learned in the sister repos)

- **Greenfield, checked every time (the user, 2026-09-06).** We intentionally do not inherit AA's
  legacy architecture or practices. Every time you read this, stop and ask: *what am I doing right
  now, does it follow that principle, and am I adopting AA's shape out of convenience?* Cross-check
  against the tells in [ARCHITECTURE.md](ARCHITECTURE.md) §0 (a rule about names, an AA option
  carried verbatim, a concept that exists only because AA had it, an engine branch on a row, a
  special case for one look, "same representation because it is easier to prove"). Phase 1 is the
  proof it happens by default: the plan carried AA's rows because they were in front of us.

- **Wait for "go".** Investigate, prototype and plan freely; build only when told. One green
  pass, then check in at every break point.
- **The vetting is the user's (2026-09-07, the reset).** They use the thing and say what is broken;
  we fix what they name. Do not go hunting for bugs unbidden, do not drive the window with a script
  to form an opinion about it, and do not offer a list of improvements as though it were work owed.
  A plan is not a mandate: the redesign was shelved precisely because it started driving the work
  instead of the user.
- **A big diff for no behaviour change is not clean-up.** Renaming things across the codebase to
  match a document, or churning test names, costs the user review time and buys nothing. Clean up
  what is wrong, not what is merely named oddly.
- **UI questions get a clickable prototype first** (an HTML artifact); the user rules off it,
  then says go. The ruled prototype's source is `prototypes/fxstudio2.template.html` and the
  live artifact was https://claude.ai/code/artifact/33a2e286-f1fe-4358-a407-16e7ef0ea316.
- **Vocabulary (2026-09-06).** An *FX* is what the corpus holds and what plays: a *VFX* is the picture, an *SFX* the sound, an *override* is the user's FX over the main corpus. The word "look" is retired everywhere (screens, code, recipes, tools); if the UI changes, the back end changes with it — the user wants no drift between the two.
- **Plain language, signal over detail.** Summaries in sentences; parked work is never presented
  as owed work. No JSON in anything a non-technical GM sees.
- **A named ability in the user's ask illustrates a class.** "Sharran Step like Misty Step but
  black" is the variant workflow, not a one-off — and *like* there is ordinary English, not a
  reference: it means **copy the whole of Misty Step and change the colour**. There are no
  shortcuts in the grammar (ruled 2026-09-07, DESIGN §9); reading that example as a pointer is the
  drift that produced `like`/`with` in the first place.
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
  ⚠ The deploy script ships `scripts/`, `styles/`, `templates/`, `lang/` and `module.json`; this
  module also serves **`recipes/`** (fetched at boot), which must travel too — see tools/README.md.
  The module is registered and enabled on the sandbox since 2026-09-06 (`tools/sandbox-module.mjs`
  writes `core.moduleConfiguration` offline; a refresh wipes that as well as the files).
- **A prod → sandbox refresh** (`pull-prod-to-local.mjs`) wipes locally deployed modules AND
  Battle Flow's test fixtures. Re-deploy after every refresh. The user wants the sandbox an
  EXACT copy of prod after a refresh: add fixtures (`node
  ../fvtt-mod-battleflow/tools/fixture-suite.mjs`) only when a suite run is asked for, and say so.
- **Two MCP bridges, two worlds.** `foundry-local5e` is the sandbox (localhost:30000).
  ⚠ `foundry-molten5e` is **PROD** — reading is harmless, writing is a prod change; never write
  there without the user's word. Both worlds share ids, so a `get-world-info` tells them apart
  only by Foundry version and who is connected. `disconnect-bridge` before a suite or a restart:
  one connected user blocks the restart.
- **The suites here** are `tools/smoke-fx.mjs` (every FX builds live), `tools/smoke-author.mjs` (the assistant's round trip), `tools/smoke-screens.mjs` (the window driven on the DOM) and
  `tools/smoke-replay.mjs` (every family through real dnd5e flows; `--watch` for a person to
  compare with AA); both build and tear down their own fixture (`tools/lib/suite.mjs`), so no
  Battle Flow fixtures are needed. `tools/check-imports.mjs`, `check-layers.mjs` and `check-legacy.mjs` after any edit under `scripts/`; `check-fx.mjs` after any edit under `recipes/`.
  ⚠ Foundry 14 animates a token DOCUMENT's coordinates through a move: wait for the landing
  before measuring anything from it (the suite's `moveTo`).
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
PSFX Patreon 0.17.0 on prod as module id `psfx-patreon` (1230 paths, registers `psfx.*`; the sandbox still
has the free `psfx` 0.16.0 until the next refresh) · Automated
Animations 7.0.22 and D&D5e Animations 3.3.0 — **installed but switched OFF on the sandbox since
2026-09-06** (still on on prod until cutover, PLAN §6 phase 5; the migration still needs AA's
sourcemap, so neither is uninstalled) · dnd5e 5.3.3 on Foundry 14. AA's world settings hold the
1290-row autorec; leave them alone.

## Prod

Deployed with the same script without `--local`, **only on the user's explicit say-so**. A
module.json change needs the prod process restarted, which is not ours to do. Never force-reload
the user's prod window. Prod parity is a measurement: `deploy-house-module.mjs fvtt-mod-fxstudio
--check` byte-compares.

## Licence rule (measured 2026-09-05)

D&D5e Animations is **GPL-3**. The user ruled (2026-09-06) that its whole corpus is the stock,
carried over with **zero loss**, and ships in this repo: `recipes/stock.json` is a separate work
under GPL-3 with `recipes/STOCK-LICENSE` and attribution to MrVauxs and Sisimshow (D&D5e
Animations 3.3.0); the code, rules and the user's own `recipes/house.json` stay MIT. Nothing in the
stock is retired to a rule, and there are no rules in scope: the derivation rules the
investigation tested are parked, off, never owed (PLAN §7). Two corpora, later wins: stock →
house (+ the world setting as the live edit buffer). See PLAN §0, §3.1, §4.
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
