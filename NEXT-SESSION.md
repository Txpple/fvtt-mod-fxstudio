# Handoff — the data pass (2026-09-08)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page. It is short on purpose.

**Where we are.** The UI was rebuilt from the user's judgment over two days; then the *data* was, in
two sessions. This one made the corpus **answer for itself**: every FX now opens the compendium
record its key was earned against, and the evidence rule was corrected twice — first because a world
item had keyed the shipped corpus, then because the 2014 SRD had. Everything is committed, pushed
and green. **The next session continues on migration work.**

---

## 1. How this work happens

The user gives a ruling in their own words, often mid-build, sometimes several in a row. You build
it, prove it with the suites, and report. That is the whole method.

- **Wait for "go".** Investigate and prototype freely; build when told.
- **The vetting is theirs.** They use it and say what is broken. Do not go bug-hunting.
- **Do not build from `shelved/`.** It is history, not authority.
- **Measure before you change data, and say what it costs item by item.** Every ruling below stands
  on a number, and twice the number said *this costs nothing at the table*, which is what made the
  change safe to make.
- ⚠ **An FX per record playing the same animation as another is the DESIGN, not redundancy**
  (DESIGN §18). Do not offer to "clean up" the 25 weapons that share the dagger animation. *"its a
  record on its own that points to a correct entry … thats the whole purpose of this all."*
- ⚠ **Do not present a menu when the answer is obvious.** *"cant you just make it good and
  consistent for me?"* Judgment first; ask only what is genuinely the user's to decide.

## 2. What was ruled and built (DESIGN §15–19)

| | |
| --- | --- |
| §15 | **The record door.** Every Library row opens the compendium record (or world item) its key was earned against — 1288 of 1288 at the time, no gaps. `recipes/records.json` addresses every key the closed lists hold; the address is settled where the key is earned, never searched for by name at the table. |
| §16 | **Stock is the books; House is this table.** This world's items stopped being evidence for Stock. 7 FX left it, 5 of them pure redundancy; Vesper Staff and Necrotic Scythe moved into `house.json`, so nothing changed at the table. |
| §17 | **No SRD 5.1.** Every dnd5e pack flagged `sourceBook: "SRD 5.1"` left the evidence. Stock 1279 → 1022 and **the census did not move a line** — almost all of it was the SRD's magic-weapon variants, which the base-weapon key answers anyway. |
| §18 | **Clean data.** 393 library paths had been written as raw `file`s since the migration (the oldest backlog item); fixed at the writer, proof 1029 of 1029. Structurally clean: no duplicate ids, no key collisions, every key has a record. |
| §19 | **The books first, and a name is the record's name.** `LIST_PACKS` reads the books before the system's SRD 5.2 copies, so a record names the book it is really from. One function, `nameForKey()`, answers what an FX is called on every screen — 142 rows read properly that did not. |

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
| Corpus | stock **1022** (spells 368 · features 282 · natural 173 · weapons 100 · effects 79 · items 22 — one key each), house **4** (2 Item Hooks + Vesper Staff and Necrotic Scythe) |
| Records | `recipes/records.json`, **4179 keys** addressed, 786 KB; read when the window opens, never by the engine |
| `ui/records.js` | `recordFor()`, `nameForKey()` (what every screen calls to name an FX), `openRecord()` |
| `ui/fxtab.js` | the Library: search · facets · rows, each row **Record · Delete · Editor** |
| Suites | `smoke-screens` **182** · `smoke-fx` **1026** · `smoke-replay` **45** · `smoke-author` **15** · `check-fx` 1036 fx / 0 invalid · imports/layers/legacy green |

Sandbox byte-identical to the repo. The user has **`FX Studio stock report.xlsx`** on their desktop
(1022 rows: FX · record · type · source compendium, plus a By-compendium tally) — rebuild it from
`recipes/records.json` + `recipes/stock/*.json` if it moves.

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
- Phase 4 — outcomes and moments (PLAN §6). Cutover — AA off on prod (PLAN §6 phase 5).
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
  never runs it **leaves its FX in the world buffer**, where it then shadows Stock and fails the
  next run for a reason that looks like a product defect. If a suite fails oddly, check
  `api.fx.buffer()` for anything written by *Tester Assistant* and remove it; the user's own Drafts
  are by *Matt the DM*.
- ⚠ **A live pack is locked while Foundry runs.** Read compendia through `snapshot(dir, tag)`.
- After any edit under `scripts/`: `check-imports`, `check-layers`, `check-legacy`. After any edit
  under `recipes/`: `check-fx`, then the live suites.
- One green pass, then check in. Build only when told.
