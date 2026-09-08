# Handoff — the UI revamp is done (2026-09-07)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page. **All seven steps of
[HANDOFF.md](HANDOFF.md) are settled: 1 superseded, 2 · 3 · 4 · 5 · 7 built and green, 6 ruled out
by the user.** Nothing of the revamp is owed. What is left is outside it, and every piece of it
waits on the user's word.

---

## 1. Read this before you look at any screen

**There are no shortcuts. No FX points at another one, and none inherits.**

The user ruled it on 2026-09-07:

> *"I don't want a Sharran Step that inherits from Misty Step with like a pointer. I just want flush
> and fill copies. That really overcomplicates things. … we can't have shortcuts because it can
> leave orphans."*

`like` and `with` are **gone from the grammar** — `core/fx.js`, `core/corpus.js`, `api.js`,
`ui/sheet.js`, `ui/library.js` and every document. Every FX states its scenes in full.
**"Sharran Step is Misty Step in black" means the whole of Misty Step written out again with the
colour changed.** A variant is a COPY.

If you meet `like`, `with`, `expand`, an inheritance bar, *Break the link* or "N overrides"
anywhere, it is stale — **do not rebuild it.** The full record is [DESIGN.md](DESIGN.md) §9.

- Making a variant: `api.fx.scenesOf(id)` gives you the scenes of an FX or a starter as a fresh
  copy. Change what differs, give it an `id`, `for` and `on`, save it. That is what *Copy from*,
  *Duplicate* and the **Add** pills already do on the screens.
- The **starters** (`recipes/starters.json`) are **stencils** the Add pills stamp a scene out of.
  Nothing in a corpus refers to one, and nothing ever did.
- `validate` refuses an FX naming `like` or `with` **in a sentence that says what to write
  instead**, so an old file or an assistant is told rather than half-read.

## 2. The two design docs, and where they are wrong

| Doc | What it is | State |
| --- | --- | --- |
| [HANDOFF.md](HANDOFF.md) | the written brief: §Rules (five acceptance criteria) and seven steps | Every step is marked. **1 SUPERSEDED and 6 RULED OUT — neither is to be built.** Step 5's "based on another FX" facet is struck out; all three Open questions are answered. |
| [prototypes/fxstudio6-proposal.html](prototypes/fxstudio6-proposal.html) | the Claude Design screens the brief illustrates | A red **CORRECTION** banner is pinned at the top. **BAND 2 of the sheet mockup still draws an inheritance bar, and the FX tab's facet list still shows "Based on another FX". Ignore both.** Its Assets screen is now also illustration of a rebuild that will not happen (step 6). |

**The screens are illustration, the Rules are the spec.** This is the user's own instruction:

> *"An agent handed a mockup will reproduce the mockup's pixels and invent its own answers
> everywhere the mockup is silent — which is where the shifting came from last time. Hand it §02's
> five rules first, as acceptance criteria it can check itself against, then the screens as
> illustration. 'No flex-wrap in a knob row' is testable. 'Looks like the picture' is not."*

## 3. What the window is now

**Three tabs — FX · Assets · Coverage — with the search in the window header and the FX sheet as a
pane, not a tab.** The window opens at 1080px.

**FX** (`ui/fxtab.js`) — 190px facets · the rows · a 300px detail pane, and the rows are the only
thing that scrolls. One list of every FX grouped Draft → House → Stock (resolution order, later
wins). Facets at permanent addresses with counts, greyed at zero: *Lives in* · *Kind* · *Only* (On
my actors, Item Hooks, Switched off, Broken assets). The detail pane is the old Look up card: name,
tags, why, id, provenance, the sentence, the sequence as stills, and Edit · ▶ Play · Ships as ·
Duplicate · Export · Delete — or *Nothing plays* + **Create FX** when the search finds an ability
nothing answers.

**Assets** (`ui/library.js`) — **unchanged, by the user's ruling.** Shelf · stage · paths · Used-in,
the picker contract with the sheet (`openPicker` / `applyPick` / the banner) exactly as it was.

**Coverage** (`ui/coverage.js`, step 7) — four bands, and only the last scrolls:
**Maintain** (the band at the top: a head line, then Waiting · Ship · Shipped, then the corpus's
problems on one foot line) · **the scope** (My actors · Compendiums, with Books · N and Check) ·
**the tiles** (Abilities · With FX · No FX · **Errors**) · **the rows**. My actors is the census
with no await — it was computed on every render and never drawn until now. Every No FX row opens a
new sheet for that ability. Errors is the door to the FX tab's Broken assets facet.

**The FX sheet** (`ui/sheet.js`) — five bands: identity + action bar · a fixed two-line sentence ·
the hook strip (Answers · Reach · Moment · State) · the sequence · the note. The sequence is a 288px
rail, an overlap strip on one ms scale, and an inspector whose frame never resizes (band tabs
Picture · Timing · Sound · Placement · ⟨the shape's own⟩, each the same 4×2 grid, live from `KNOBS`
alone). The two delays are named apart: `delay` is *Wait before*, `wait` is *Hold next*. **Reach
picks its own item** since step 7 — an Item Hook no longer needs you to have arrived from that
item's sheet.

Full record, with the deviations and what each step measured: [DESIGN.md](DESIGN.md) §9.

## 4. What is next — nothing is owed, everything waits on the word

| | What | Notes |
| --- | --- | --- |
| **Phase 4** | outcomes and moments (PLAN §6) | **What the module was for.** The layers AA never had. Battle Flow's hooks are its own commission, in its repo. Nothing of it starts before the user's word. |
| | the **502 migrated assets keyed `file`** that are really library paths | BACKLOG. Still needs a word on what to do with them. |
| | `thrown` / `return` / `breathe` / `pulse` written from the sheet | BACKLOG. Readable and clearable today, not writable — it needs a picker slot. It was step 6's to carry and **step 6 is ruled out**, so nothing is waiting behind it. |
| | cutover | PLAN §6 phase 5: AA and D&D5e Animations are off on the sandbox, still on on prod. |

The user's standing way of working has not changed: **iterate off screenshots, aggregate, and hold
until "go".**

## 5. How to work here

Everything below is in CLAUDE.md; these are the ones this work keeps needing.

- **Wait for "go".** Build only when told; one green pass, then check in.
- **The sandbox is the test box, never prod.**
  `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop|start|status`, deploy with
  `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local` **while the
  server is down** for a `module.json` change, then start. `recipes/` must travel with
  `scripts/ styles/ templates/ lang/`. **A script edit needs a re-deploy before the suite sees it**
  — the suite drives the browser's own copy of the module, not the repo's.
- **Suites:** `tools/smoke-screens.mjs` (the window on the DOM — **163 of 163**),
  `tools/smoke-author.mjs` (the API round trip — 15 of 15), `tools/smoke-fx.mjs` (every FX builds —
  1293), `tools/smoke-replay.mjs` (real dnd5e flows — 45 of 45). After any edit under `scripts/`:
  `check-imports`, `check-layers`, `check-legacy`. After any edit under `recipes/`: `check-fx`.
- **A rule is only worth having if it can be checked.** Every rule in §Rules has a grep or a
  measurement; write the check into `smoke-screens` rather than asserting it in prose.
- **Four lessons worth keeping.** A measurement saying a feature is used **zero times** is a reason
  to ask whether it should exist at all, not only how to preserve it (`like` and `with`: 0 of 1296,
  and the first pass spent a day protecting them). **Measure the corpus before designing a
  control**: step 4's band contents were settled by counting what the 1808 scenes actually use.
  **Two screens that differ only by a filter are one screen** — Stock FX and House FX differed by
  `e.source`, which was already printed as a tag on every row of both. And **one number, one
  meaning**: step 7's Errors tile counts the corpus rather than the scope, because a scope-local
  count would print a different number from the facet it opens.
