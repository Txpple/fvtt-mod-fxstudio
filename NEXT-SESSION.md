# Handoff — the UI revamp, after steps 1–3 (2026-09-07)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page, then §Rules of
[HANDOFF.md](HANDOFF.md). **Steps 2 and 3 are built and green; step 1 was built and then ruled out
entirely.** Nothing of steps 4–7 is started.

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

That example appears throughout the older docs and it had **drifted** into meaning a pointer, then
into "the whole authoring model for most FX is one line". That was never a ruling. If you meet
`like`, `with`, `expand`, an inheritance bar, *Break the link* or "N overrides" anywhere, it is
stale — **do not rebuild it.** The full record is [DESIGN.md](DESIGN.md) §9.

- Making a variant: `api.fx.scenesOf(id)` gives you the scenes of an FX or a starter as a fresh
  copy. Change what differs, give it an `id`, `for` and `on`, save it. That is the whole workflow,
  and it is what *Copy from*, *Duplicate* and the **Add** pills already do on the screens.
- The **starters** (`recipes/starters.json`) are unaffected. They are **stencils** the Add pills
  stamp a scene out of. Nothing in a corpus refers to one, and nothing ever did.
- `validate` refuses an FX naming `like` or `with` **in a sentence that says what to write
  instead**, so an old file or an assistant is told rather than half-read.

## 2. The two design docs, and where they are wrong

Both are in the repo. Both have been corrected, but read the corrections rather than trusting the
body text.

| Doc | What it is | Corrections applied |
| --- | --- | --- |
| [HANDOFF.md](HANDOFF.md) | the written brief: §Rules (five acceptance criteria) and seven steps | **Step 1 marked SUPERSEDED — "must not be rebuilt"**; step 3 marked BUILT; step 4's *Inheritance bar* band struck out; step 4's rail row no longer says "inherited/N overrides"; all three Open questions answered; *What not to change* notes the grammar change. |
| [prototypes/fxstudio6-proposal.html](prototypes/fxstudio6-proposal.html) | the Claude Design screens the brief illustrates | A red **CORRECTION** banner is pinned at the top of the page; the *inheritance bar* explainer card is headed "REMOVED — do not build"; the rail's "· inherited" captions are gone. **BAND 2 of the sheet mockup still draws an inheritance bar. Ignore it.** Everything else on the screens stands. |

**The screens are illustration, the Rules are the spec.** This is the user's own instruction, and it
is why the brief is written the way it is:

> *"An agent handed a mockup will reproduce the mockup's pixels and invent its own answers
> everywhere the mockup is silent — which is where the shifting came from last time. Hand it §02's
> five rules first, as acceptance criteria it can check itself against, then the screens as
> illustration. 'No flex-wrap in a knob row' is testable. 'Looks like the picture' is not."*

## 3. What is built

**Step 2 — Play.** `▶ Play all` in the Sequence header and `▶` on every scene row, both through
`api.preview`, both saving nothing. Source is the selected token, targets are the user's own, a
selected Region is passed as the placed template. Every reason a Play cannot run is **in the
label**, greyed in place: *select a token*, *select a placed template*, *switched off*, *no
scenes*. A move with no destination arms the canvas and the toast says *Click a spot on the
canvas*. Each row carries a still of what it plays. **Confirmed working in game by the user.**

**Step 3 — Layout primitives.** All four checkable rules hold, each proved by its own stated check:

- **R5** `--fx-gutter` / `--fx-row` / `--fx-radius` on `.application.fxstudio`; one radius
  everywhere a panel or control has one. `--fx-col` is deliberately **not** declared until a panel
  grid uses it (steps 5–7).
- **R2** a knob row is `grid-template-columns: repeat(4, minmax(0, 1fr))`; all thirteen
  `flex: 0 1 <px>` basis rules deleted. *Its check: grep `flex-wrap` and `flex: 0 1` under
  `.scene`, `.knobs`, `.kr`, `.lib`, `.grid2` → nothing.*
- **R1** every scene row is the **same sixteen cells in one order, four to a row** — VFX · At/To ·
  Size · Opacity / Tint · Depth · SFX · Lasts / Delay · Then · Times · Every / Speed · Spot ·
  Range · Fade. Which are live comes **from `KNOBS` in core/fx.js and nothing else**; the rest are
  greyed **and disabled** in place via `[data-na="true"]`.
- **R3** shelf rows are `height: var(--fx-row)`; selection changes colour only, measured with
  `getBoundingClientRect()` in the suite.
- Every grid holding a long string uses `minmax(0, 1fr)`, not `1fr`.

## 4. What is next — steps 4 to 7, none started

The user's standing instruction: **one or two steps at a time, then stop and check in.** Do not
start step 4 and step 5 in the same pass.

| | What | Notes |
| --- | --- | --- |
| **4** | the sheet as rail + inspector with band tabs | The largest. Its band table is still good — **minus band 2 (the inheritance bar), which does not exist.** It also carries two fixes the user will feel: **naming the two delays** (`delay` = *Wait before*, `wait` = *Hold next* — this closes the user's own deferred question) and **Size showing the grammar's unit** (the field says 100% while the sentence says "3 token wide" about the same value). Also: show all of `problemsOf`, not `problems[0]`. |
| **5** | one FX tab | **Both halves are already RULED YES:** merge Stock FX and House FX into one list grouped Draft → House → Stock, and fold Look up's search into the window header, dropping that tab. Tabs become **FX · Assets · Coverage**. Re-home the item sheet's wand button onto the header search. |
| **6** | Assets | One scroll region (that tab has three today), a filmstrip replacing the stage arrows *and* the stepper *and* Used-in variant switching, one path line, exactly one **Use** on screen. Keep the `openPicker`/`applyPick` contract with the sheet unchanged. |
| **7** | Coverage | Audit + Maintain + a new *My actors* scope in one tab. Closes a real hole: **`renderHook` only offers the Item Hook pill when `subject.uuid && subject.owner`**, so pinning an FX to one item is possible only if you arrived from that item's sheet — while House FX has an Item Hook sub-tab and a New FX button that cannot make one. |

**Outside the revamp, still waiting on the user's word:** the **502 migrated assets keyed `file`
that are really library paths** (BACKLOG), and **phase 4** — outcomes and moments (PLAN §6), which
is what the module was for.

**Small, noted, not fixed:** `draftFx` emits `scenes` on an `off` FX, which needs none, so a
switched-off FX carries dead scenes in the buffer. It belongs with the `off` ruling (it stays a
mode of the sheet) when step 5 rebuilds the row. And the lockbar still wraps; the room to stop it
comes with step 4's band 1.

## 5. How to work here

Everything below is in CLAUDE.md; these are the ones this work keeps needing.

- **Wait for "go".** Build only when told; one green pass, then check in.
- **The sandbox is the test box, never prod.**
  `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop|start|status`, deploy with
  `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local` **while the
  server is down**, then start. `recipes/` must travel with `scripts/ styles/ templates/ lang/`.
- **Suites:** `tools/smoke-screens.mjs` (the window on the DOM — 116 of 116),
  `tools/smoke-author.mjs` (the API round trip — 15 of 15), `tools/smoke-fx.mjs` (every FX builds —
  1293), `tools/smoke-replay.mjs` (real dnd5e flows — 45 of 45). After any edit under `scripts/`:
  `check-imports`, `check-layers`, `check-legacy`. After any edit under `recipes/`: `check-fx`.
- **A rule is only worth having if it can be checked.** Every rule in §Rules has a grep or a
  measurement; write the check into `smoke-screens` rather than asserting it in prose.
- **The lesson from this session, worth keeping:** a measurement saying a feature is used **zero
  times** is a reason to ask whether it should exist at all, not only how to preserve it. `like`
  and `with` were used 0 times in 1296 FX, and the first pass spent a day protecting them.
