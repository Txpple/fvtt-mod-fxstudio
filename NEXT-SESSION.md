# Handoff — the UI revamp, after steps 1–4 (2026-09-07)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page, then §Rules of
[HANDOFF.md](HANDOFF.md). **Steps 2, 3 and 4 are built and green; step 1 was built and then ruled
out entirely.** Nothing of steps 5–7 is started.

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
colour changed, standing on its own.** A variant is a COPY.

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
| [HANDOFF.md](HANDOFF.md) | the written brief: §Rules (five acceptance criteria) and seven steps | Steps 1 (SUPERSEDED — must not be rebuilt), 3 and 4 are marked; step 5's "based on another FX" facet struck out; all three Open questions answered. Steps 5–7 stand as written. |
| [prototypes/fxstudio6-proposal.html](prototypes/fxstudio6-proposal.html) | the Claude Design screens the brief illustrates | A red **CORRECTION** banner is pinned at the top. **BAND 2 of the sheet mockup still draws an inheritance bar. Ignore it.** Everything else on the screens stands. |

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
game by the user.**

**Step 3 — Layout primitives.** `--fx-gutter` / `--fx-row` / `--fx-radius` on
`.application.fxstudio`; no `flex-wrap` or `flex: 0 1 <px>` in a knob row; every list row one
height with selection changing colour only; `minmax(0, 1fr)` wherever a long string sits.

**Step 4 — the sheet as a rail and an inspector.** Five bands (there is no inheritance band):
identity + action bar · a fixed two-line sentence · the hook strip (Answers · Reach · Moment ·
State) · the sequence · the note.

- **The rail** is one 44px row per scene: number, still, "Shape · place", when it starts, ▶.
- **The overlap strip** under it draws every scene on one ms scale — what plays *while* what. The
  timing rule is the engine's own (`engine/common.js` `timing`). A picture's own length is not in
  the grammar, so it is measured from the file the browser loaded for the still and drawn hatched
  and marked *about* until it is known.
- **The inspector** is a frame that never resizes (102px of knobs in every band): band tabs
  **Picture · Timing · Sound · Placement · ⟨the shape's own⟩**, each the same 4×2 grid of eight
  cells, live from `KNOBS` and nothing else. Twenty knobs that had no address now have one.
- **The two delays are named apart** (the user's parked question, closed): `delay` is *Wait before*,
  `wait` is *Hold next* with its offset. The sheet normalises `{wait: true, delay: −1000}` to
  `{wait: −1000}` as it loads — identical playback, nothing written until Save, no file touched.
- **Size shows the grammar's unit** (*2.25 tokens wide*, *3 squares around*); the 50–200% multiplier
  and the `scale` it multiplied are gone.
- Every problem is listed, each one the button to the scene it names; `off` collapses the Sequence
  band; Reach is greyed in place with its reason when there is no item to pin to.
- Both things noted after step 3 are fixed: the lockbar no longer wraps, and `draftFx` no longer
  emits dead scenes on an `off` FX.

Full record and the two stated deviations: [DESIGN.md](DESIGN.md) §9.

## 4. What is next — steps 5 to 7, none started

The user's standing instruction: **one or two steps at a time, then stop and check in.**

| | What | Notes |
| --- | --- | --- |
| **5** | one FX tab | **Both halves are already RULED YES:** merge Stock FX and House FX into one list grouped Draft → House → Stock, and fold Look up's search into the window header, dropping that tab. Tabs become **FX · Assets · Coverage**. Re-home the item sheet's wand button onto the header search. `off` stays a mode of the sheet (ruled); revisit the row here. |
| **6** | Assets | One scroll region (that tab has three today), a filmstrip replacing the stage arrows *and* the stepper *and* Used-in variant switching, one path line, exactly one **Use** on screen. It owns the `openPicker`/`applyPick` contract — if `thrown` / `return` are ever to be written from the sheet (BACKLOG), it happens here. |
| **7** | Coverage | Audit + Maintain + a new *My actors* scope in one tab. Closes a real hole: **`renderHook` only offers the Item Hook pill when `subject.uuid && subject.owner`**, so pinning an FX to one item is possible only if you arrived from that item's sheet. Step 4 left that pill greyed **in place** with its reason, which is where the fix lands. |

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
- **Suites:** `tools/smoke-screens.mjs` (the window on the DOM — **132 of 132**),
  `tools/smoke-author.mjs` (the API round trip — 15 of 15), `tools/smoke-fx.mjs` (every FX builds —
  1293), `tools/smoke-replay.mjs` (real dnd5e flows — 45 of 45). After any edit under `scripts/`:
  `check-imports`, `check-layers`, `check-legacy`. After any edit under `recipes/`: `check-fx`.
- **A rule is only worth having if it can be checked.** Every rule in §Rules has a grep or a
  measurement; write the check into `smoke-screens` rather than asserting it in prose.
- **Two lessons worth keeping.** A measurement saying a feature is used **zero times** is a reason
  to ask whether it should exist at all, not only how to preserve it (`like` and `with`: 0 of 1296,
  and the first pass spent a day protecting them). And **measure the corpus before designing a
  control**: step 4's band contents were settled by counting what the 1808 scenes actually use —
  `elevation` 444, `zIndex` 161, `follow` 73, `mask` 65, `thrown` 19, `return`/`breathe`/`pulse` 0 —
  which is also how the two-delay fix was found to touch 68 real scenes, all with negative delays.
