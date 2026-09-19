# Handoff — the hold became a seam, and v0.2.0 is on prod (2026-09-10)

> **2026-09-19 — THE USER'S TESTING HAS STARTED; the first two things named are fixed and on the sandbox (not released).** *"when i cast persistent AOE effects, like fog cloud and web, the template region stays on the ground. it should fade out and leave the vfx showing. also, when gren casted web, the web vfx itself didnt appear at all."* The first was the module (nothing ever hid the Region dnd5e 6.0 places): a fill that persists with its template now hides the Region from the table in dnd5e's pre-create hook, LAYER visibility, the GM keeps it on the Regions layer — DESIGN §24 has the rule and the cost (no fade; the area is bare until the picture lands; a player caster's one Stock `clearTemplate` cannot delete its Region, noted not fixed). The second was the JSON: Web was AA's range row (strands to targets, the web on them), re-authored as a fill at the template for both `spell:web` and `feature:web`. Nine checks green (check-reader 124/124); deployed `--local` byte-identical, no module.json change, a reload is enough. **The user keeps testing; the release waits on their word.**

> **2026-09-18 — THE 6.0 PORT IS LIVE ON THE SANDBOX; THE NEXT SESSION IS THE USER'S TESTING (the user: *"wrap up what you need to do so we can start testing in a new session"*).** Deployed `--local` byte-identical and the sandbox restarted for the pin; smoke-boot green (stock 1014, house 4); **smoke-fx 1019 build, smoke-replay 58/58, smoke-author 20/20, smoke-screens 199/199 — on Foundry 14.367 / dnd5e 6.0.1**. The sandbox taught four things, all fixed in the SUITES and none in the module (commit above this one): a faked usage card needs a real 16-character activity id or 6.0 refuses it silently; the forced AC is `ac.override`; a header-controls dropdown entry is named by `label`; the Coverage check must pick a book that holds abilities (the DMG's Bastions reads as an honest zero). **What the user does next, on the sandbox at localhost:30000 (log in as themselves; the world is up):** use things and say what is broken — an attack (hit and miss), a save spell, a heal, an area spell (the Region placed by dnd5e 6.0: circle, cone, line, a wall or a ring if one is at hand), an effect applied from a card, Battle Flow's hold beside it; the window's four tabs. We fix what they name. **Then, on the user's word only:** a release (v0.6.0 — the pin, the port, Stock 1014; the ritual in CLAUDE.md), and prod NOT before prod is upgraded to Foundry 14.367+ and dnd5e 6.0.x (it is 5.3.3 on 14.364 today). Everything is committed and pushed; the nine offline checks and the four live suites are the release gate and are green. ASSESSMENT-6.0.md §7 holds the rulings; C (actor identifiers) and D (turn cards) stay open for phase 4.

> **2026-09-15 — dnd5e 6.0: ASSESSED, NOT STARTED (the user: *"review what we need to do to make this compat with 6.0. no need for backward compat to 5.x"*, then *"lets make note of all of these"*).** Read [ASSESSMENT-6.0.md](ASSESSMENT-6.0.md): prod is still dnd5e 5.3.3 on Foundry 14.364 while the sandbox is 6.0.1 on 14.367 and Battle Flow 1.42.0 is pinned 6.0.0–6.9.99, so nothing 6.0-only ships to prod until prod is upgraded (not ours). Everything that breaks is `scripts/readers/dnd5e.js` (cards are typed with `system.*`, a region's `origin` flag is now the usage TOKEN and the activity moved to its own flag) plus the stand-in world, check-reader and smoke-replay; keys, corpus, packs, records, screens and the item-sheet button are unchanged in 6.0.1. The port is seven commits (§4), shaped so phase 4 is a moment word each (§5: a moment carries the whole card, the target record stays whole, a moment knows its usage card, the effect origin walk is complete; ring and wall are a logged skip until the grammar grows them). §6 notes what 6.0 stores that phase 4 can play from; §7 the four rulings asked. **Then the rulings came (A adopt dnd5e's verdict · B add ring and wall in the port · C re-cut the moment) and the GO — *"yes start, but theres another agent in sandbox, so you cant go in there til you have notice"* — and the port was BUILT OFFLINE the same evening:** the pin `1103efc`, the reader and the moment `64b83b0` (check-reader 119/119 on a stand-in world built from real 6.0 cards), the engine's shapes `fd57e76` (check-engine 210/210; a ring, an emanation, a wall), the suites and docs. **NOT run live, NOT deployed: when the user says the sandbox is free — deploy `--local` (module.json changed: restart), then smoke-fx, smoke-replay, smoke-author, smoke-screens; expect the replay's template sections to be the ones that teach us something (a Region placed the 6.0 way, a real usage card with `system` data).** Prod stays on 5.3.3 until the user upgrades it; nothing 6.0 goes there before. Found on the way and RULED the next morning (the user, 2026-09-16: *"those have been totally dissolved and removed, as they never had a migration path. consider them roadkill"*): every Stock reference to D&D5e Animations' files was cut — 142 sound clauses, 13 picture scenes, and the seven FX that were nothing but such a picture (Heavenly Wings, Turning to Stone, Ball Bearings, Insect Plague, Tasha's Bubbling Cauldron, Wall of Ice, Wall of Stone) — Stock 1021 → 1014, `check-fx` green, every FX builds. Before this, the same day: `c331c2e` guarded the effect origin against 6.0's activity uuids (Battle Flow's smoke-hitmenu had thrown twice on the sandbox).

> **2026-09-13, later — IMPORT AND EXPORT ON THE LIBRARY, TOP LEFT (the user: *"import and export
> should be on the main fx form. on top left. i think right now just one of them is there"*).** First
> the question — *"are the files in json format natively?"* — yes: Export hands the browser
> `fx-<id>.json` (`_meta` and the FX in full, the recipe files' own shape) and Import reads a JSON
> file that is that, a bare list, or one FX; both stand on Foundry 14's own helpers, and the round
> trip was driven on the sandbox through the real dialog before anything changed (it worked). Then the
> move: Import at the left, Export beside it — the marked row's FX, greyed with its reason until a row
> is marked, repainted in place on a mark — and the Editor's Export unchanged. DESIGN §16's screen
> record carries it. On prod since 2026-09-14 (byte-identical, no module.json change, no restart); screens 199/199.

> **2026-09-12, evening — THE EDIT FX WINDOW, on the user's screenshots (their own marks, then the
> sequence block of the shelved mock held up as the target: *"the gui was supposed to look a lot more
> like this … use your judgment"*).** Built on the sandbox, NOT released: the rail is two-line rows
> (number badge, "Shape · place", "0 ms") with no still and no ▶, four rows high and scrolling past
> that so the form never grows; **"+ Add a scene"** beneath it opens the shape menu in place (never a
> modal); the strip is an **Overlap** card with thin lines and three ticks; the header says "3 scenes ·
> 1.4 s"; **Play all and the Note box are gone** (the user's X); the Picture band leads with a
> **preview tile** (the webm looping, its name over it, Change → the Library, ▶ plays the scene) and
> gains a **Colour** cell (the family's own colours, a path swap — this reverses the 2026-09-07 "no
> colour knob" test on the user's mock); **every checkbox is a two-word switch** (Over/Under,
> Random/Never, Off/On …) or a chip, the checkbox hidden inside for the writers; a greyed cell says why
> on hover. The VFX text search went with its cell (the Library is the one door). Found by the suite
> and FIXED: a Stock FX under a House override opened with the OVERRIDE's scenes (the sheet took them
> from the winning layer); a layer opens as itself now. Screens 189/190 (the one is the sandbox's
> version string until a restart the user's session blocks). Not asked and not done: the arrow the
> user drew from the Add pills up to the sequence heading was read as the Add row moving up into the
> rail, which it did; the Note box is gone though the mock shows one — the user's X came first.
> **Then (the user's next two marks): the overlap strip is REMOVED outright**, and **+ Add a scene is a
> DialogV2 popup** of eight cards (shape and its line of help; the pick closes it; Cancel is the one
> footer button), not a menu in place. The header says "N scenes · s". Screens 185/186, the one the
> version string.

> **2026-09-13, evening — ON PROD, AND THE SANDBOX IS A FRESH COPY OF IT (the user: *"deploy to prod, set identifiers, copy prod to sandbox. everything"*).** Deployed to prod over WebDAV (byte-identical, no module.json change, no restart; a passing WebDAV fault answered the first two tries with Molten's web page, the third landed). Identifiers set on prod: Jetten's Goldthorn `goldthorn`, Cadoc's Necrotic Scythe `necrotic-scythe`. **Thomas is "Invictus" now and wields Midnight; First Light is gone from prod**, so `first-light-thomas-a-invictus` in house.json answers nothing on either box until the user keys or deletes it, and Midnight (`weapon:midnight`) plays nothing until it has an FX — both the user's call. Then pull-prod-to-local (657 files, 179 stale deleted, DB integrity OK), deploy --local byte-identical, module enabled, sandbox up, smoke-boot green (stock 1021, house 4), census 134 of 210. The sandbox now has prod's psfx-patreon and JB2A. Battle Flow's fixtures are gone with the refresh (its session had ended; not told).

> **2026-09-13, last — THE CORPUS IS OUR OWN; READY FOR PROD AND A SANDBOX REFRESH.** Every FX lost its migration provenance (by/at/note); the one note left is a twin's ("Separate FX from Melf's Acid Arrow …"); House notes are the user's words; the validator refuses to/source/like/with; the system's packs are named SRD 5.2. Nine checks and three suites green, committed. **Waiting on the user's word: deploy to prod** (scripts + recipes; no module.json change, so no prod restart; NOT released as a version yet), **set the three item identifiers on prod** (Thomas's First Light first-light, Jetten's Goldthorn goldthorn, Cadoc's Necrotic Scythe necrotic-scythe), then the prod → sandbox refresh routine in CLAUDE.md (pull-corpus first — already equal — then deploy --local, sandbox-module --enable, start).

> **2026-09-13, then — THE EDIT SCREEN AGAINST THE MODEL (the user: *"look for other anomalies that no
> longer comport with our data model"* … *"make all those fixes"*).** Five: Duplicate opens with NO key
> (a copy under the same key could only be an override or a replacement); "New ability" and its Type
> pills are gone — the Answers search reads the abilities on actors and then the records address book
> (`recordHits`), so a key is earned from a record or an item, never made from a typed name; a new sheet
> keyed to a key an FX already answers on that moment TAKES that FX's id (`holderOf`) and a banner says
> so, and Save asks House override or Stock when the holder is Stock; the Off note says "the ability";
> and the migration earns BOTH identifiers of a document the SRD 5.2 ships under another one than the
> book (36 of 1707 shared documents — `twins` in `lib/migrate/keys.mjs`): Stock 1005 → 1021, records
> 1025 of 1025 addressed, census unmoved. Screens 190/190. Not released.

> **2026-09-13 — ANSWERS IS ONE KEY (the user: *"each item should be one to one, not 1-n"*).** The Editor's Answers column is one pill, never a list: no Add ability, no remove button; unlocked, the search box REPLACES the key (Change the ability / Choose an ability). Under the pill, the key itself in mono (spell:acid-arrow) and what it is — "every copy answers it" for a book record, "this world's own item" for an Own key — with the full explanation on hover. The why line lost its +N. On the sandbox, deployed under the running server (the user's window was open); screens 190/190. Not released.

> **2026-09-12, latest — ONE KEY PER ITEM, DND5E'S IDENTIFIER, EXACT OR NOTHING (the user: *"i really
> dont like the idea of global hooks anymore, thats the old AA way of thinking … it needs to exact or
> it doesnt happen"*), DESIGN §23.** Global Hook and Item Hook are gone, with the item flag, the name
> forms, the base-weapon rung and the activity suffix: an item has one key, dnd5e's identifier, and an
> FX holds it or the item plays nothing. The Editor's Key strip is Answers · **Item** (the item the sheet
> is on, or Find an item) with **Own key** (writes `system.identifier` on the item, the sheet becomes a
> new House FX for that key) · Moment · State. Migration re-run: Stock 1005 (22 second-spelling keys
> gone, 5 records gained — the potion variants keyed by their own identifiers), records re-keyed, the
> party census unmoved (134 of 225). House: the two swords keyed `weapon:first-light` / `weapon:goldthorn`
> with their items as records. Nine offline checks green; smoke-author 20/20; smoke-boot green (its stale
> Shield-effect probe replaced); smoke-screens 187/187 (Own key walked end to end in §7). **On the sandbox,
> NOT released or on prod.** Prod will need the three item identifiers set (First Light, Goldthorn,
> Necrotic Scythe) on the user's word, or those three play their base weapon's Stock FX there.

> **2026-09-12, last — THE GRAMMAR IS THE ENGINE (the user: *"i really want this clean, both from a ui
> and a corpus perspective, and no bloat"*), DESIGN §22.** Every shape's knob list is now exactly what its
> engine file reads; `aboveLighting`, `xray`, `pick`, `from` on strike, `at` on fill, `persist` on aura,
> `delay` on move and the sound clause's `wait` are retired; the Editor lost Above lighting, Through
> walls and Chosen by (cells grey, they do not vanish — R1 stands); the move's Fade box writes a real
> fade and Reach is in squares. Corpus: 3 aura persists, 5 default fill anchors and Wall of Force's
> x-ray stripped; every other FX builds call-for-call identical (proved on the stage, before against
> after). Nine checks green, screens 188/188 after a sandbox restart, migration proof 1029/1029. On the
> sandbox; NOT released or on prod — the user's word.

> **2026-09-12, later — housekeeping on the user's word.** The two dead files (`scripts/ship.js`,
> `recipes/shipped.json`) are DELETED from prod over WebDAV; the sandbox never had them. The sandbox's
> `house.json` no longer holds Sorcerous Burst, Dimension Door or the shortbow test hook; it still holds
> Abyssal Glaive and a Necrotic Scythe edit the user saved 2026-09-12, not yet pulled (`pull-corpus`).
> `tools/world-buffer.json` is gone from the repo with them. `check-fx --sentences` no longer crashes
> and `check-moments` no longer swallows a failed engine import. **Then, on the user's word ("build
> our offline suite … a good, long term sustainable architecture … versatile enough where we can edit
> it if we still have to make data model changes"): THE OFFLINE SUITE IS BUILT.** Three checks on
> three small libraries: `tools/lib/check.mjs` (the harness: sections, `is`/`same`/`ok`/`throws`,
> `--section` with a PARTIAL stamp), `stage.mjs` (now with `table()`, `sections()`, `click()`) and
> `world.mjs` (a stand-in dnd5e world: users, actors, items, activities, effects, messages, template
> Regions, by uuid). `check-engine` 204/204 (every place word, every shape knob by knob, the build
> path, resolving, the play path with the move's picker driven by a click), `check-reader` 86/86 (the
> timing policy, the verdict, the subject's keys, templates, effects, who plays, the hooks),
> `check-build` 1026/1026 (every FX in the corpus built offline against a fitted moment through the
> real libraries, in two seconds). Nine offline checks are the release gate now. A data-model change
> lands in the two stand-in libraries first and the checks follow. Not deployed (tools only; nothing
> under `scripts/` changed).

> **2026-09-12 — THE DRAFT LAYER IS GONE (the user: *"no more concept of draft … either its a file or
> not … if someone edits a stock file, they should be given a choice to save as a house override, or
> edit the stock file directly"*). Built and green: Save writes the corpus file in the module folder
> on the server (`scripts/files.js`; House by default, the only home of an Item Hook); a Stock FX's
> Save asks House override or Edit Stock (`ui/sheet.js whereToSave`); Delete takes the winning layer
> only (`erase` — it used to take the id out of EVERY file, which the author suite caught by deleting
> Misty Step from Stock on the sandbox; put back). Stage, Ship, the world buffer, `shipped.json`,
> `world-fx.mjs`, `export-fx.mjs`, Revert, the Draft group and facet, the Statuses/Damage/Events kinds,
> On my actors and Broken assets are gone; the old buffer setting is drained into the files once at
> ready by a GM. Proof: author 20/20, screens 184/185 (the one is the sandbox process still reporting
> v0.3.0 until it is restarted, which a connected user blocks), fx 1026, the six offline checks.
> **Not touched, for the user:** the sandbox's `house.json` holds the two parked drafts the drain
> folded in (Sorcerous Burst, Dimension Door) and one Item Hook the user saved today
> (`shortbow-bf-test-rogue`) — `node tools/pull-corpus.mjs` shows them; `tools/world-buffer.json`
> still holds the two parked drafts as a file Import can read, if the sandbox is ever refreshed
> first. `smoke-boot`'s "Shield effect" probe has been stale since the SRD cut (no `effect:shield`
> in Stock) and is not this change's. **RELEASED v0.4.0 and v0.4.1 the same day and DEPLOYED TO PROD, byte-identical** (the user: *"yep push release prod"*); v0.4.1 keeps the Stock row under a House override on the screen (the user found the row vanishing; the files were right). Prod's process has not been restarted, so it vends the old version string until it is; scripts are live on reload. Two dead files linger on prod and the sandbox because the deploy never deletes: `scripts/ship.js` and `recipes/shipped.json`, unreferenced. DESIGN §21, CLAUDE.md carry the ruling.


> **2026-09-11, cold session after — the two unruled costs are RULED, on the user's "ok": leave both.**
> Client-local holds: the fix is Battle Flow's (observable hold state), asked for only if a GM placing
> a template for a player ever sees the picture early. The five-minute bound stays; a per-gate bound
> read from Battle Flow's hold timer is built only if that timer is 0 at the table and the user reports
> the animation firing while they were still choosing. Neither can lose a picture. BACKLOG carries both.

> **2026-09-11, last — the dedupe debt is PAID, v0.3.1, on prod (the user: *"i dont mind paying the
> debt now … go … push and release and deploy to prod"*).** The note below said `readMoment` skipped
> the twelve new words; it did not — `use` and `effect` are WHEN words and passed the filter, so
> Battle Flow's effect receipts (and reverts) would have replayed any ability's `effect` look beside
> the dnd5e effect reader. Now: the reader hears `BATTLEFLOW_WORDS` (core/moments.js, the five, a
> closed list of its own), and a `momentId` ticket plays once per client (engine/render.js
> `firstTime`). ARCHITECTURE §2 carries it. Reading more words is still a design call per word, on
> the user's word — the ticket check is already there for the ones that sit beside a card.

> **2026-09-11, later still — Battle Flow's contract is VERSION 2, a GATE (its repo, the user's "go").**
> Every resolve publishes now — riders, folds, masteries, shields, spends, receipts, saves, breaks —
> seventeen words, `kind` / `marker` / `momentId` on the payload, `api.moments.version === 2`. Nothing
> changed in THIS repo's code: `readMoment` hears the five words it knows and logs the twelve new ones
> as skips, which is the contract working. What to read, what to play and how to dedupe against the
> card (`momentId`) is the next commission here, on the user's word — ARCHITECTURE §2 carries the
> shape. Battle Flow is not released with it yet.

> **2026-09-11, later — Battle Flow's moments landed (both repos, the user's "go"), RELEASED as v0.3.0 and deployed to prod the same day beside Battle Flow v1.38.0.**
> `readers/battleflow.js` now also READS: Battle Flow publishes `battleflow.moment` (a plain
> payload, five words) at its resolves that post no card, this module turns it into a moment
> through the same dispatcher, and a moment whose ability posts no card falls back to the ability's
> `use` look (so Sneak Attack's migrated look plays on the dice with nothing authored). ARCHITECTURE
> §2 *Battle Flow's moments*, `tools/check-moments.mjs` (29/29), `smoke-replay` §16. Nothing is
> released on either side; the sandbox carries both. The rest of this page stands as written.

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page. It is short on purpose.

**Where we are.** FX Studio is **the only thing playing at the user's table**: AA and D&D5e
Animations are OFF on prod (read off prod 2026-09-10 — the user: *"aa is disabled on prod, see for
yourself"*), and **v0.2.0 — the first tagged release — is deployed there, byte-identical, with prod
rebooted** so `module.json` vends it. Battle Flow v1.35.0 is live beside it, so the HOLD works at the
table on both ends. Everything is committed and pushed (main == origin/main), the sandbox matches,
every suite is green. **Nothing is owed. Wait for the user to say what is next.**

---

## 0. What this session did (2026-09-09 → 10)

The user's ruling, in their words: *"i want a systemic version that hopefully improves fxstudio, and
creates compatability with battleflow … but i do not want to break existing functionality or have a
dependency on battleflow. some users may not install battleflow."* Then: *"look for the agent thats
active for battleflow now and initiate a conversation. YOU are the agent modifying this code to make
it better. battleflow is your advisor."*

- **A GATE** (`scripts/core/gates.js`, ARCHITECTURE §2) is the timing policy's other half: *a moment
  another module holds plays when the hold lifts*. `(moment) => promise | null`, asked ONCE per
  moment at read time, in the **dispatcher** (`scripts/fxstudio.js`) — not in a reader, not around
  the player. `null` = not held. A promise = held; its resolution decides: **truthy plays** (the card
  that lifted it, or a bare sentinel meaning "lifted, nothing known"), **`null`/`false` plays nothing**
  (the thing never happened). ⚠ The two nulls mean opposite things; the code comment says so.
- **The bound is ours: five minutes, and an expired bound PLAYS.** A gate that throws is ignored. A
  hold may delay a picture; it can never swallow one by going quiet.
- **No dependency, structurally.** `scripts/readers/battleflow.js` is the only Battle Flow-shaped
  code: one feature detect (`holdFor`, falling back to the older `castHold`; pick the surface, ask
  once), no import, no manifest relationship. Not installed → nothing registered → the straight
  road, which is the default path. There is no second path to regress.
- **The seam is public** — `api.gates.register(name, ask)` — so any future FX Studio reason to defer
  a moment needs no new machinery. Battle Flow is the first tenant, not the reason.
- Moments carry `activity` (the activity uuid) and `flags` (the source document's flags).
- **Battle Flow shipped its side the same day** (`scripts/holds.js`, its ARCHITECTURE §7, released as
  v1.35.0): `holdFor(subject)`, `castHold` kept forever as an alias, `api.holds = {version: 1}`,
  hooks `battleflow.holdOpened` / `castReleased`, refcounted. Both repos quote the same contract
  paragraph verbatim.
- **Release tooling arrived with the first release**: `tools/build-release.ps1` runs the five checks
  as a precondition, asserts version and download URL moved together, packs `scripts/ styles/
  recipes/` (refuses without `recipes/STOCK-LICENSE`) + `module.json LICENSE README.md` with
  forward-slash entries, and reads the archive back (separators, every file, every relative import
  resolving inside it). Notes are hand-written in `dist/` (gitignored).

**Proof:** `check-gates` **22/22** offline · `smoke-replay` **50/50** with §15 registering a real gate
through the public api and casting (nothing plays while held, plays when lifted, a hold lifting on
nothing plays nothing, no gate plays straight away) — run against BOTH the pre-`holds.js` Battle
Flow (the `castHold` fallback) and the new one (`holdFor`), by two independent sessions · screens
184 · fx 1026 · author 15 · check-fx 1036/0 · imports/layers/legacy green.

## 1. The two things the advisor corrected — read before touching the reader or the dispatcher

Both are in [BACKLOG.md](BACKLOG.md) (first section) as **unruled costs**, not work:

- **A hold is CLIENT-LOCAL.** Battle Flow's holds are an in-memory Map on the casting client. On any
  other client `holdFor` answers `null`, meaning *"I cannot SEE a hold"*, not *"nothing holds this"*.
  Today the roads that matter are read on the caster's client, so it costs nothing — **a GM placing a
  template on a player's behalf would play early.** The fix is Battle Flow promoting the hold to
  observable state; it offered to cost it and was not asked to.
- **A clockless ask yields a clockless hold BY SETTING** (hold timer 0). Our five-minute bound then
  plays the picture while the question is still on the caster's screen. Safe — never a lost picture —
  but the one place the two modules' rules disagree. The fix is one argument
  (`heldUntil(moment, { bound })`), most likely per-gate. If the user reports *"the animation fired
  while I was still choosing"*, this is it.

Also from the advisor, not ours to fix: `holdFor` accepts any subject, but every hold raised today is
keyed by activity uuid — the `id` arm of `subjectOf` never hits yet. And one unexplained, unreproduced
truncation of `smoke-replay` inside §6 on their run (no report line at all); four whole green runs
since; not chased, per the vetting rule.

## 2. How this work happened, and how the user pairs sessions

The user gives a ruling in their own words, often mid-build. You build it, prove it with the suites,
and report. That is the whole method. New this session: **the user pairs live sessions across the
sister repos.** Find the other repo's session (`list_sessions` / `ListAgents`), put the design in
front of it with specific numbered questions, and keep the decision here — it advises, it does not
rule, and its *"I intend to build X"* is pending its own user's go: build against what is shipped
today with a fallback, never against a promise. A peer session is never the user's approval for
anything. The two catches that mattered (the client-locality, and its own contract collapsing "came
to nothing" with "the bound expired") came from reviewing the **contract text and the causal claims**,
not the code.

- **Wait for "go".** Investigate and prototype freely; build when told.
- **The vetting is theirs.** They use it and say what is broken. Do not go bug-hunting.
- **Do not build from `shelved/`.** It is history, not authority.
- **Measure before you change data, and say what it costs item by item.**
- ⚠ **An FX per record playing the same animation as another is the DESIGN, not redundancy**
  (DESIGN §18). *"its a record on its own that points to a correct entry … thats the whole purpose."*
- ⚠ **Do not present a menu when the answer is obvious.** *"cant you just make it good and
  consistent for me?"*
- ⚠ **Verify a claim before repeating it, including the docs' own.** This session a line in
  CLAUDE.md was stale (AA "still on on prod") and a peer's diagnosis was wrong (`--help` did not
  cause its partial run); both were settled by reading the thing itself in under a minute.

## 3. The evidence rule, as it now stands

This is the one thing to get right before touching the migration.

```
STOCK is keyed against:      the installed BOOKS (PHB, MM, DMG, Ravenloft, Heroes of Faerun),
                             then SRD 5.2 (the system's ...24 packs) as the fallback,
                             plus dnd5e's base weapons
HOUSE may also key against:  this world's own items and effects   ({world: true})
NOT evidence, ever:          SRD 5.1 — every dnd5e pack flagged sourceBook "SRD 5.1",
                             every record system.source.rules "2014"
```

The books come first because the system ships **copies**: 1559 of the 1603 names in the SRD 5.2
packs are also in a book, and 1541 of those are the same document id. 44 names are only in SRD 5.2,
so the PHB is very nearly — but not quite — a superset, and the difference is monster content.

⚠ **`LIST_PACKS` in `tools/lib/dnd5e.mjs` IS the evidence.** Install a book → add its packs there →
re-run `tools/migrate-aa.mjs --write` **and** `tools/records.mjs --write`.

## 4. What is in the repo right now

| | |
| --- | --- |
| Release | **v0.2.0**, tagged, on GitHub with the zip + bare `module.json`; on prod (rebooted, vending 0.2.0); on the sandbox |
| Corpus | stock **1022** (spells 368 · features 282 · natural 173 · weapons 100 · effects 79 · items 22 — one key each), house **4** |
| Records | `recipes/records.json`, **4179 keys**, read when the window opens, never by the engine |
| The gate | `core/gates.js` (the rule) · `readers/battleflow.js` (the one tenant) · `api.gates.register` (the seam) · ARCHITECTURE §2 (the law and the quoted contract) |
| Suites | `smoke-screens` **184** · `smoke-fx` **1026** · `smoke-replay` **50** · `smoke-author` **15** · `check-fx` 1036/0 · `check-gates` **22** · imports/layers/legacy green |

Prod: FX Studio v0.2.0 active, Battle Flow v1.35.0 active, AA and D&D5e Animations installed and
**off** (not uninstalled — the migration still reads AA's sourcemap). Read prod's module state with
`node ../fvtt-mcp-molten5e/scripts/configure-modules.mjs --dry-run --enable <id>` (a read; it
writes nothing on `--dry-run`).

## 5. Where to pick up — the pass the user named

> *"we will do a pass later looking for items in the compendia that have no vfx, so gaps are ok."*

**The raw material is already built.** `records.json` addresses 4179 keys; the corpus answers 1024.
So **3155 things in the installed books have a record, a name and a book — and no FX**:

```
feature 1083   effect 1011   item 840   natural 78   weapon 75   spell 68
```

Spells are nearly done (368 of 436). Features and effects are where the corpus is thin. Coverage
already has a **Compendiums** scope (`ui/coverage.js`, `SCOPES`) that works off live packs — the
question for that pass is whether it should read `records.json` instead, which would let it answer
for every installed book at once without loading a pack.

Other things standing, none of them started or owed:

- **The gaps §17 left.** Five abilities exist in the 2024 books with no FX, because AA labelled its
  rows with the 2014 name and SRD 5.1 was the bridge: `Deflect Missiles` → `deflect-attacks`,
  `Empty Body` → `superior-defense`, `Perfect Self` → `perfect-focus`, `Stillness of Mind` →
  `self-restoration`, and `Stomp`, which the 2024 MM types as a feature where the SRD typed it a
  natural weapon. Exactly **14 SRD 5.1 records carry a 2024 identifier** and could be read as a
  rename dictionary without ever keying to 5.1 — designed and measured, **not built**; the user said
  gaps are fine for now.
- **Hold Person / Hold Monster now apply "Paralyzed"**, and Guidance applies eighteen "… Guidance"
  effects; none of those effect names has an FX. New FX, not repairs.
- Phase 4 — outcomes and moments (PLAN §6). Cutover is DONE: AA and D&D5e Animations are OFF on prod (read off prod 2026-09-10), and **v0.2.0 is released and deployed to prod** (the first tagged release; `tools/build-release.ps1`).
- The window **scrolls sideways below about 780px**; **a modal dialog swallows every later click**.

## 6. How to work here

In [CLAUDE.md](CLAUDE.md) in full; the ones this work keeps needing:

- **The sandbox is the test box, never prod.** `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs
  stop|start|status`; deploy with `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs
  fvtt-mod-fxstudio --local` (while the server is down if `module.json` changed). `recipes/` travels
  with `scripts/ styles/ templates/ lang/`. **A script or recipe edit needs a re-deploy before a
  suite sees it** — the suite drives the browser's copy, not the repo's. ⚠ The deploy script never
  *deletes*.
- **The migration is offline and takes 2 seconds.** `node tools/migrate-aa.mjs` writes nothing and
  leaves its report at `dist/migration-report.md`; `--write` writes the recipes. **Read the numbers
  before ever passing `--write`** — the census block is what tells you the cost at the table, and
  twice this session it was the thing that made a change safe.
- `node tools/records.mjs` (dry) / `--write` rebuilds the records. Run it whenever `LIST_PACKS`
  changes or the migration is re-run.
- ⚠ **Never run two suites against the sandbox at once.** They build fixtures on the same world and
  collide — one dies mid-`fixtureUp` with *"The Actor … does not exist"*, and because its teardown
  never runs it **leaves its FX in `recipes/house.json` on the sandbox** (there is no world buffer
  since 2026-09-12), where it then shadows Stock and fails the next run for a reason that looks like
  a product defect. If a suite fails oddly, check `api.corpora.house` for anything written by
  *Tester Assistant* and `api.corpus.erase` it; the user's own FX are by *Matt the DM*.
- ⚠ **A live pack is locked while Foundry runs.** Read compendia through `snapshot(dir, tag)`.
- After any edit under `scripts/`: `check-imports`, `check-layers`, `check-legacy`, `check-gates`. After
  any edit under `recipes/`: `check-fx`, then the live suites.
- ⚠ **A partial suite run exits 0** (`--section n` is meant to be usable) and says so on the report
  line: read `PASS: n of n` and the `⚠ PARTIAL RUN` stamp, never the exit code alone. Unknown flags
  are silently ignored (`parseArgs` is `strict: false`) — a typo runs everything.
- One green pass, then check in. Build only when told.
