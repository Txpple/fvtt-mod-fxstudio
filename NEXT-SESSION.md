# Handoff — the reset, day two (2026-09-08)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page. It is short on purpose.

**Where we are: the reset held.** The UI was rebuilt over two days from the user's own judgment, a
message at a time, with no plan driving it — and then the *data* was rebuilt the same way. Both are
committed and green. **The next session continues on the migrated data.**

---

## 1. How this work happens

The user gives a ruling in their own words, often mid-build, sometimes several in a row. You build
it, prove it with the suites, and report. That is the whole method. It replaced a plan, deliberately
(§3).

- **Wait for "go".** Investigate and prototype freely; build when told.
- **The vetting is theirs.** They use it and say what is broken. Do not go bug-hunting, do not drive
  the window to form an opinion about it, do not offer a list of improvements as though it were owed.
- **Do not build from `shelved/`.** `HANDOFF.md` and `fxstudio6-proposal.html` are history. Their
  R1–R5 and seven steps are not authority. Nothing in them is unfinished.
- **A big diff for no behaviour change is not clean-up.**
- **When a screen looks wrong, find out which side is lying before you change it.** Twice now the
  screen was right and something else was wrong — a CSS specificity bug made a working filter look
  random, and the Editor was honestly displaying data that should not have existed.

## 2. What was ruled and built (DESIGN §10–18)

| | |
| --- | --- |
| §10 | **The Editor is a tab.** Library · Editor · Assets · Coverage. Leaving it does not close the sheet; only opening another FX asks before dropping changes. |
| §11 | **The FX tab stripped back.** No detail pane, a row is a name, the search moved out of the window header. |
| §12 | **What the tab does.** A row takes no action; the search matches the name alone; Assets browses and does not write; Revert folded into Delete, which unpins what pointed at the FX. |
| §13 | **The screen the user drew.** No dropdown; Delete · Editor on every row, double click opens the Editor; amber group heads; Import on the search row; the sound stepper stands on files, not just variants. |
| §14 | **ONE FX ANSWERS ONE KEY**, and the closed lists audited. The big one — see §3. |
| §18 | **Clean data.** 393 library paths had been written as raw files since the migration (the oldest backlog item); fixed at the writer, proof 1029 of 1029. Structurally the corpus is clean: no duplicate ids, no key collisions, every key has a record. |
| §17 | **No SRD 5.1.** Every dnd5e pack labelled "(SRD)" dropped from the evidence. Stock 1279 → 1022, records 4913 → 4168, and the census did not move a line — almost all of it was the SRD's magic-weapon variants, which the base-weapon key answers anyway. |
| §16 | **Stock is the books; House is this table.** This world's items stopped being evidence for Stock: 7 FX left it, 5 of them pure redundancy. Vesper Staff and Necrotic Scythe moved into `house.json` on the user's word, so nothing changed at the table. |
| §15 | **The record door.** Every row in the Library opens the compendium record (or world item) its key was earned against — 1288 of 1288, no gaps. `recipes/records.json` addresses every key the closed lists hold; the address is settled where the key is earned, never searched for by name at the table. |

The tab reads **Library**; its key in code is still `fx`.

## 3. The data ruling, and why it matters most

The user opened the Editor on **Absorb Elements** and found it answering `spell:`, `feature:` and
`item:` at once. That was AA's shape: one namespace of names, so a row stood for whatever was used
with that name. **An FX now answers exactly one key** — a row fans out into one FX per key it earned,
and anything with no evidence is not carried.

What "evidence" means: the ability exists in an installed compendium (the 2024 books — **no SRD
5.1**, §17) or in dnd5e's base weapons.
**This world's own items are NOT evidence for Stock** — corrected 2026-09-08 after the user found
`weapon:1-dagger` in the shipped corpus (§16). **`LIST_PACKS` in `tools/lib/dnd5e.mjs` IS that evidence** — and it was audited
on 2026-09-08 because a pack missing from it now *silently deletes corpus*. It was missing
`dmg/equipment` (571 records, 87 weapons), Ravenloft's items and options, and Heroes of Faerûn
entirely. **If a new book is installed, add its packs there, re-run the migration, and re-run
`tools/records.mjs --write`** — the records (§15) stand on the same evidence.

```
stock 1289 → 1286 FX, one key each          the census DID NOT MOVE:
351 rows no list holds — not carried        694 of 736 abilities answer as under AA
82 keys lost to an earlier row              9 stopped, 27 effects — same before and after
render proof 1293 of 1293                   every FX cut could never have answered anything here
```

Both exception lists are EXCEPTION tables in `recipes/migration-report.md`, and on the user's
desktop as **`FX Studio exception report.xlsx`** (rebuild it from that report if it moves).

**The one to watch is effects.** An item's name is evidence; an effect's is weaker, because a DM
names effects by hand and other modules ship their own. 93 of 184 effect rows survived. Anything
currently on this world's actors is kept; an effect that arrives later needs its FX re-made.

**`recipes/house.json` is the USER'S file.** `migrate-aa.mjs` no longer writes it — it offers
`dist/house-from-migration.json` instead. It holds **two custom swords as Item Hooks**: First Light
and Goldthorn. The user deleted the rest, including this world's Misty Step colour and Sorcerous
Burst animation overrides, which now fall through to Stock.

## 4. What is in the repo right now

Everything is committed and green. Nothing is half-built.

| | |
| --- | --- |
| Corpus | stock **1022** (spells 368 · weapons 99 · features 282 · natural 172 · effects 79 · items 22), house **4** (2 Item Hooks + Vesper Staff and Necrotic Scythe, §16) |
| Records | `recipes/records.json` **4168 keys** addressed (spell 436 · feature 1363 · item 862 · natural 251 · weapon 175 · effect 1081) — every one of the 1024 keys the corpus answers has a record |
| `ui/fxtab.js` | search (name only) + Import · facets · rows; a row is a name with Record · Delete · Editor |
| `ui/records.js` | reads `recipes/records.json` when the window opens; the engine never touches it |
| `ui/sheet.js` | the Editor tab: action bar, sentence, hook strip, sequence, note |
| `ui/library.js` | the Asset Library and the picker; browses, does not write |
| `ui/coverage.js` | Maintain, two scopes, four tiles, the rows |
| Suites | `smoke-screens` **182** · `smoke-author` **15** · `smoke-fx` **1026** · `smoke-replay` **45** · `check-fx` 1036 fx / 0 invalid · imports/layers/legacy green |

Sandbox verified byte-identical to the repo on 2026-09-08, its two item pointers live, its two
Drafts still coherent. A stale `scripts/core/looks.js` and a stale `fvtt-mod-fxstudio.looks` world
setting were removed the same day.

## 5. Known and unfixed — offered, never owed

Not ruled on. Not a to-do list.

- The window **scrolls sideways below about 780px**, on every tab.
- **A modal dialog swallows every later click** (Back from an unsaved new sheet).
- **No door on the Library makes a new FX** — that went with the search dropdown, on the user's word
  (*"we'll add new later"*). The Editor's **New FX** still works.
- `remove-fx`, `delete-fx`, `export-fx`, `create-new`, `new-kind` are handlers with no door, kept in
  `ui/studio.js` with a comment because more passes are coming.
- The migration report's *"FX that can never answer"* section still describes the pre-curation
  house corpus — the tool reads AA's house rows, not `recipes/house.json`.

## 6. Where to pick up

**The user said the next session continues on the migrated data.** Likely shapes, none of them
started or owed:

- Reading the exception lists and deciding what to re-make by hand (the 351, or the 91 effects).
- The 502 migrated assets keyed `file` that are really library paths (BACKLOG).
- Phase 4 — outcomes and moments (PLAN §6), what the module was actually for.
- Cutover: switching AA off on prod (PLAN §6 phase 5).

**Wait for them to say which.**

## 7. How to work here

In [CLAUDE.md](CLAUDE.md) in full; the ones this work keeps needing:

- **The sandbox is the test box, never prod.**
  `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop|start|status`, deploy with
  `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local` (while the
  server is down if `module.json` changed), then start. `recipes/` must travel with
  `scripts/ styles/ templates/ lang/`. **A script or recipe edit needs a re-deploy before a suite
  sees it** — the suite drives the browser's copy, not the repo's. ⚠ The deploy script never
  *deletes*: a file removed from the repo lingers on the sandbox until someone looks.
- **The migration is offline and takes 3 seconds.** `node tools/migrate-aa.mjs` writes nothing and
  leaves its report at `dist/migration-report.md`; `--write` writes the recipes. Run the dry one and
  read the numbers before ever passing `--write`.
- ⚠ **A live pack is locked while Foundry runs.** Read compendia through `snapshot(dir, tag)`, never
  the pack directory itself.
- After any edit under `scripts/`: `check-imports`, `check-layers`, `check-legacy`. After any edit
  under `recipes/`: `check-fx`, then the live suites.
- One green pass, then check in. Build only when told.
