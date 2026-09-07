# Handoff — the UI revamp, after steps 1–5 (2026-09-07)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page, then §Rules of
[HANDOFF.md](HANDOFF.md). **Steps 2, 3, 4 and 5 are built and green; step 1 was built and then ruled
out entirely.** Nothing of steps 6–7 is started.

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
| [HANDOFF.md](HANDOFF.md) | the written brief: §Rules (five acceptance criteria) and seven steps | Steps 1 (SUPERSEDED — must not be rebuilt), 3, 4 and 5 are marked; step 5's "based on another FX" facet struck out; all three Open questions answered. Steps 6–7 stand as written. |
| [prototypes/fxstudio6-proposal.html](prototypes/fxstudio6-proposal.html) | the Claude Design screens the brief illustrates | A red **CORRECTION** banner is pinned at the top. **BAND 2 of the sheet mockup still draws an inheritance bar, and the FX tab's facet list still shows "Based on another FX". Ignore both.** Everything else on the screens stands. |

**The screens are illustration, the Rules are the spec.** This is the user's own instruction:

> *"An agent handed a mockup will reproduce the mockup's pixels and invent its own answers
> everywhere the mockup is silent — which is where the shifting came from last time. Hand it §02's
> five rules first, as acceptance criteria it can check itself against, then the screens as
> illustration. 'No flex-wrap in a knob row' is testable. 'Looks like the picture' is not."*

## 3. What is built

**Step 2 — Play.** `▶ Play all` in the Sequence header and `▶` on every rail row, both through
`api.preview`, both saving nothing. Every reason a Play cannot run is **in the label**, greyed in
place: *select a token*, *select a placed template*, *switched off*, *no scenes*. A move with no
destination arms the canvas and the toast says *Click a spot on the canvas*. **Confirmed working in
game by the user.** The rule now lives in one place — `playWhyOf(scenes, off)` in `ui/sheet.js` —
and the FX tab's own Play reads it too.

**Step 3 — Layout primitives.** `--fx-gutter` / `--fx-row` / `--fx-radius` on
`.application.fxstudio`; no `flex-wrap` or `flex: 0 1 <px>` in a knob row; every list row one
height with selection changing colour only; `minmax(0, 1fr)` wherever a long string sits.

**Step 4 — the sheet as a rail and an inspector.** Five bands (there is no inheritance band):
identity + action bar · a fixed two-line sentence · the hook strip (Answers · Reach · Moment ·
State) · the sequence · the note. The rail is one 44px row per scene; the overlap strip under it
draws every scene on one ms scale (a picture's length is measured from the loaded file and marked
*about* until it is known); the inspector is a frame that never resizes, with band tabs
**Picture · Timing · Sound · Placement · ⟨the shape's own⟩**, each the same 4×2 grid of eight cells,
live from `KNOBS` alone. **The two delays are named apart** — `delay` is *Wait before*, `wait` is
*Hold next* — and a scene the migration wrote as `{wait: true, delay: −1000}` is normalised as the
sheet loads it. Size shows the grammar's unit. Every problem is listed, each the button to the scene
it names. Two deviations are stated in DESIGN §9.

**Step 5 — one FX tab, and the search in the header.** The six tabs are **three**:
**FX · Assets · Coverage**, and the **FX sheet is a pane, not a tab** — opened on an FX, Back
returns where it came from, the FX pill is the current one while it is up. The old tab names still
land where they meant to (`api.open({tab: 'audit'})` opens Coverage).

- **`scripts/ui/fxtab.js`** is the new tab: 190px facets · the rows · a **300px detail pane**, and
  the rows are the only thing that scrolls (R4, R5, measured).
- The list is **grouped Draft → House → Stock** — resolution order, later wins. A row is one 44px
  line: name (+N keys, · Item Hook), the generated sentence ellipsised, the layer tag (or Off), the
  shape tags. **Never the key list.**
- **Facets** at permanent addresses with their counts, greyed at zero (R1): *Lives in* · *Kind* (all
  nine, so none moves) · *Only* — On my actors, Item Hooks, Switched off, **Broken assets** (the
  check `tools/check-fx.mjs` runs, on screen for the first time). No *Based on another FX*.
- **The detail pane is what the Look up card was**: name (the door to the sheet, read-only), tags,
  the `why` line, id and provenance, the sentence, the sequence as stills, and
  **Edit · ▶ Play · Ships as · Duplicate · Export · Delete**. When nothing answers the search, the
  same pane says *Nothing plays*, why, and offers **Create FX**.
- **The header search does two jobs**: the dropdown answers *what plays for this ability*, and the
  letters narrow the list. Asking from outside (the item-sheet wand, `api.open({item})`) fills the
  box; picking a row does not.
- **Staging is on the row's own pane**: one *Ships as* select — *Draft only* · *Staged: House* ·
  *Staged: Stock* — greyed with its reason on a House or Stock FX. Maintain is unchanged, on
  Coverage.
- The window opens at **1080px** (was 860): the tab is three columns.

Full record and the deviations: [DESIGN.md](DESIGN.md) §9.

## 4. What is next — steps 6 and 7, neither started

The user's standing instruction: **one or two steps at a time, then stop and check in.**

| | What | Notes |
| --- | --- | --- |
| **6** | Assets | One scroll region (that tab has three today), a filmstrip replacing the stage arrows *and* the stepper *and* Used-in variant switching, one path line, exactly one **Use** on screen. It owns the `openPicker`/`applyPick` contract — if `thrown` / `return` are ever to be written from the sheet (BACKLOG), it happens here. The detail pane built in step 5 is the component this tab's right-hand column should become (R5). |
| **7** | Coverage | Audit + Maintain + a new *My actors* scope in one tab. Closes a real hole: **`renderHook` only offers the Item Hook pill when `subject.uuid && subject.owner`**, so pinning an FX to one item is possible only if you arrived from that item's sheet. Step 4 left that pill greyed **in place** with its reason, which is where the fix lands. The FX tab's *Broken assets* facet wants an Errors tile here to link to. |

**Outside the revamp, still waiting on the user's word:** the **502 migrated assets keyed `file`
that are really library paths** (BACKLOG), and **phase 4** — outcomes and moments (PLAN §6), which
is what the module was for.

## 5. How to work here

Everything below is in CLAUDE.md; these are the ones this work keeps needing.

- **Wait for "go".** Build only when told; one green pass, then check in.
- **The sandbox is the test box, never prod.**
  `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop|start|status`, deploy with
  `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local` **while the
  server is down**, then start. `recipes/` must travel with `scripts/ styles/ templates/ lang/`.
  **A script edit needs a re-deploy before the suite sees it** — the suite drives the browser's own
  copy of the module, not the repo's.
- **Suites:** `tools/smoke-screens.mjs` (the window on the DOM — **144 of 144**),
  `tools/smoke-author.mjs` (the API round trip — 15 of 15), `tools/smoke-fx.mjs` (every FX builds —
  1293), `tools/smoke-replay.mjs` (real dnd5e flows — 45 of 45). After any edit under `scripts/`:
  `check-imports`, `check-layers`, `check-legacy`. After any edit under `recipes/`: `check-fx`.
- **A rule is only worth having if it can be checked.** Every rule in §Rules has a grep or a
  measurement; write the check into `smoke-screens` rather than asserting it in prose.
- **Three lessons worth keeping.** A measurement saying a feature is used **zero times** is a reason
  to ask whether it should exist at all, not only how to preserve it (`like` and `with`: 0 of 1296,
  and the first pass spent a day protecting them). **Measure the corpus before designing a
  control**: step 4's band contents were settled by counting what the 1808 scenes actually use.
  And **two screens that differ only by a filter are one screen** — Stock FX and House FX differed
  by `e.source`, which was already printed as a tag on every row of both.
