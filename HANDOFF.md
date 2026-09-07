# FX Studio — UI/UX handoff

Design brief for a rebuild of the working tabs. Written 2026-09-07 from a read of
`core/fx.js`, `api.js`, `ui/sheet.js`, `ui/studio.js`, `ui/library.js`, `ui/corpus.js`,
`ui/html.js`, `recipes/SCHEMA.md`, `styles/fxstudio.css`, `CLAUDE.md`.

Visual reference: `FX Studio Proposal.dc.html` (findings, screens, rationale) and
`FX Studio Screens.dc.html` (the earlier per-tab pass). **Read the Rules section before
looking at either.** The screens illustrate the rules; they are not the spec.

Nothing here changes the grammar, the corpora, the API surface or the vocabulary, with one
named exception flagged under Open questions.

---

## Rules

These are acceptance criteria. Each one is checkable without judgement.

**R1 — Every control has a permanent address.**
A knob lives at the same grid coordinate for every shape and in both view and edit mode.
Not-applicable renders greyed and disabled *in place*, never omitted. This is the rule
already stated in `sheet.js` for the lockbar ("the bar never reflows: every control keeps
its place, and what the mode does not offer is greyed") — extend it to every control.
*Check:* no conditional `f.push()` that changes field order between shapes. A Move scene
and a Mark scene produce the same grid with different cells enabled.

**R2 — Nothing wraps. Everything scales.**
No `flex-wrap` inside any panel. No `flex: 0 1 <px>` in a knob row. Columns are
proportional (`minmax(0, Nfr)`), so the grid at 860px is the same grid at 1900px — narrower,
never rearranged. One breakpoint in the whole module, and it moves whole panels only.
*Check:* grep for `flex-wrap` and `flex: 0 1` under `.scene`, `.knobs`, `.kr`, `.lib`,
`.grid2` — should return nothing.

**R3 — Selection never changes layout.**
No accordions, no expand-on-click, no growing cards. Clicking a row swaps the *contents*
of a fixed panel. Every row in a list is the same height selected or not (selection is
background + border colour only).
*Check:* select each row of a list in turn; every other row's `getBoundingClientRect()`
is unchanged.

**R4 — One scroll region per screen.**
Never a scrollbar inside a scrollbar. Today Asset Library has three (window, `.shelf .list`,
the 96px `.uses`). Pick one scrolling element per tab; everything else is fixed height with
a count or a "+N more".

**R5 — One grid, shared by every tab.**
12 columns, one gutter, one row height, one radius, declared as custom properties on
`.application.fxstudio`. Panel edges land on column lines. The 300px detail pane is the
same component in the same position on every tab.

---

## Step 1 — Stop destroying `like` — **SUPERSEDED (the user, 2026-09-07)**

> This step was built as written, shown to the user, and its premise was **ruled out**: *"I don't
> want a Sharran Step that inherits from Misty Step with like a pointer. I just want flush and fill
> copies. That really overcomplicates things. … we can't have shortcuts because it can leave
> orphans."*
>
> `like` and `with` were removed from the grammar altogether — `core/fx.js`, `core/corpus.js`,
> `api.js` (`fx.expand` → `fx.scenesOf`), `ui/sheet.js`, `ui/library.js` and every design document.
> **Every FX states its scenes in full and none points at another.** A variant is a copy: "Sharran
> Step is Misty Step in black" means Misty Step written out again with the colour changed.
> The whole of what this step describes below — the inheritance bar, muted inherited knobs,
> *Break the link* — is **gone and must not be rebuilt**. See DESIGN §9.
>
> The starters are unaffected: they are stencils the Add pills stamp a scene out of, and nothing in
> a corpus refers to one.

## Step 2 — Wire Play

**The gap.** `api.preview(fx, {source, targets, place, destination, on})` validates, expands
and plays without saving. `sheet.js` never calls it. There is no Play control on the sheet.
Asset Library has a looping video stage, so the one screen where you author a visual effect
is the one screen with no picture and no playback.

**What to do.**
- `▶ Play all` in the Sequence header: `api.preview(draftFx(app), { source: canvas.tokens.controlled[0], targets: [...game.user.targets] })`.
- `▶` on each rail row: same call with a one-scene FX built from that scene.
- With no controlled token, both are **disabled in place** with the label
  "select a token" (R1) — never removed.
- A `move` scene or a `fill`/`template` scene needs a destination or a placed template;
  when absent, disable with the reason rather than letting `preview` fail.
- Add a still thumbnail per scene in the rail and a looping video in the inspector, from
  `api.assets.resolve(scene.asset).file` — the same `foundry.utils.getRoute(file)` and
  `<video autoplay loop muted playsinline>` that `library.js` already uses.

**Prove it.** Select a token, open Fire Bolt, press Play, see it. Nothing is saved.

**Stop here and check in. Do not start step 3 or 4 in the same pass.**

---

## Step 3 — Layout primitives — **BUILT 2026-09-07** (DESIGN §9)

- Custom properties on `.application.fxstudio`: `--fx-col`, `--fx-gutter`, `--fx-row`,
  `--fx-radius`.
- Delete every `flex-wrap` and every `flex: 0 1 <px>` in a knob row (R2). Replace with
  `grid-template-columns: repeat(4, minmax(0, 1fr))`.
- Add a `[data-na="true"]` (or `.fx-na`) rule: `opacity:.38; pointer-events:none` — used
  instead of not rendering a knob (R1).
- Every list row gets a fixed height from `--fx-row`; selection changes background and
  border only (R3).
- Any grid holding a long string (a file path, a Sequencer path) uses
  `minmax(0, 1fr)` tracks, not `1fr`, and `min-width: 0` on the direct children —
  `1fr` is `minmax(auto, 1fr)` and inherits the string's min-content width, which is what
  makes the Asset Library path row spill today.

---

## Step 4 — The sheet: rail and inspector, with band tabs — **BUILT 2026-09-07** (DESIGN §9)

> Built as written below, minus band 2 (there is no inheritance). All four fixes landed: the two
> delays are named apart and a hold whose offset was written as `delay` is normalised as the sheet
> loads it; Size shows the grammar's unit; every problem is listed, each one the button to the scene
> it names; `off` collapses the Sequence band. Two deviations are stated in DESIGN §9 (the Answers
> cell wraps when an FX answers many abilities; `thrown` / `return` / `breathe` / `pulse` can be read
> and cleared but not written, because writing one needs a picker slot and step 6 owns that
> contract). `smoke-screens` 132 of 132.

Six bands top to bottom, each a constant height. Only the inspector's contents ever change.

1. **Identity + action bar.** Name, layer tag, hook tag; the `why` line
   (`Global Hook · Misty Step (spell) · House` from `resolveFor`) plus id and provenance on
   one monospace line. Action bar as today, all eight controls always present.
2. ~~**Inheritance bar** (step 1), when `like` is set.~~ **GONE — there is no inheritance. This band does not exist; the five bands below are the whole sheet.**
3. **Sentence.** Fixed two-line box, `overflow:hidden`. `api.fx.sentence(draftFx())`.
   The clause for the selected scene is highlighted.
4. **Hook strip.** One row, four fixed columns: Answers · Reach · Moment · State.
   No wrapping. On miss moves into the shape band (it is a scene knob, not a hook knob).
5. **Sequence.** `288px` rail | inspector, equal height.
   - Rail rows are a fixed 44px: index, thumbnail, "Shape · place", "Nms", `▶`. (No "inherited/N overrides": nothing inherits.)
   - Below the rail, a fixed overlap strip: one bar per scene on a shared ms scale, computed
     from `delay` / `wait` / duration. This is the thing the current sheet cannot show at all.
   - Inspector is a fixed frame with band tabs: **Picture · Timing · Sound · Placement · &lt;Shape&gt;**.
     Each band is the same 4×2 grid, so the frame never resizes.
6. **Note.** One row.

### Band contents

Every knob in `KNOBS[shape]` gets an address. Cells not in `KNOBS[shape]` are greyed in
place (R1).

| Band | Cells |
| --- | --- |
| Picture | At/To · Size · Colour · Opacity · Tint · Depth (`below`) · Mirror · Scatter |
| Timing | Wait before (`delay`) · Times (`repeat`) · Every · Speed (`rate`) · Fade in · Fade out · Lasts (`persist`) · Hold next (`wait`) |
| Sound | SFX (2 cells) · Volume · Start at |
| Placement | Rotate · Anchor · Elevation · Draw order (`zIndex`) · Mask · Attach · Above lighting · Through walls (`xray`) |
| Shape | `strike`: On miss · Thrown · Reach — `shoot`: On miss · Return · Clear template — `mark`: On miss · Follow · Face — `fill`: Clear template · Rotate by position — `aura`: Breathe · Pulse — `move`: Range · Spot · Travel or jump · Fade — `sound`: (band disabled) |

### Two other fixes in this step

- **Name the two delays.** `delay` is "Wait before"; `wait` is "Hold next". They are separate
  cells in the Timing band. This closes the parked question in `CLAUDE.md`.
- **Size shows the grammar's unit.** Drop the `x.scale` multiplier and the 50–200% select.
  Edit `size.tokenWidths` / `size.radius` / `size.squares` / `size.fit.scale` directly, with
  the unit as a suffix ("1.5 tokens", "3 squares around"). Today the field says 100% while
  the sentence says "3 token wide" about the same value.
- **Problems as a list.** `problemsOf` returns every problem as a sentence; the sheet shows
  `problems[0]` in one red line. Show all of them, each linked to the scene it names.
- **`off` collapses the Sequence band** — an `off` FX needs no scenes. See Open questions.

---

**Stop here and check in. Do not start step 5 in the same pass.**

---

## Step 5 — One FX tab

`renderCorpus` and `renderCustom` build near-identical row lists differing by a filter on
`e.source`. Where an FX lives is a property (already a tag via `SOURCE_TAG`), not navigation.

- One list of all FX, grouped **Draft → House → Stock** (resolution order, later wins).
- Facet column, all from data already computed: Lives in (`source`) · Kind (`parseKey().kind`) ·
  On my actors (`census()`) · Item Hooks (`!fx.for.length`) · Switched off (`fx.off`) ·
  Broken assets (`assets.exists()` over `assetsOf(scene)`). (No "based on another FX" facet:
  nothing is based on anything — see Step 1.)
- Row: name + "+N keys" · the generated sentence, ellipsised · layer tag · shape tags.
  **Not** the full key list — that is what makes Abyssal Strike unreadable today.
- Fixed 300px detail pane, shared with Assets and Coverage: name, id, `why`, provenance,
  sentence, sequence thumbnails, and a 2×3 action grid (Edit · Play · Stage · Duplicate ·
  Export · Delete).
- `Stage: House` / `Stage: Stock` available here, not only in Maintain.
- Look up's search moves to a persistent field in the window header, answering on every tab.
  Re-home the item-sheet wand onto it.

Tabs become **FX · Assets · Coverage**.

---

## Step 6 — Assets

Keep the shelf / stage / paths anatomy and the picker contract with the sheet
(`openPicker` / `applyPick` / the banner) unchanged. Four changes:

1. One scroll region: the shelf list. Stage, filmstrip, path line and Used-in are fixed height.
2. A filmstrip of variant thumbnails replaces the stage arrows *and* the stepper dropdown
   *and* variant-switching via Used-in lines. Each frame carries a used-dot.
3. One path line (Sequencer path + Copy); the file behind a disclosure.
4. Exactly one Use on screen: when the picking banner is up, suppress the pane's own Use.
   Rename the pane's `lib-use` to "New FX from this" — that is what it does.

---

## Step 7 — Coverage, and the Item Hook gap

- Audit + Maintain + a new actor scope, one tab. Maintain gets its own band at the top —
  it is the last step of a workflow, not a footnote under a report.
- Two scopes: **My actors** (from `census()`, no await) and **Compendiums** (the existing
  pick-and-Check). Only the second is on screen today although the first is computed on
  every render.
- Tiles: Abilities · With FX · No FX · Errors. Every "No FX" row opens a new sheet hooked to
  that key (what `case 'key'` already does).
- **Item Hook gap:** `renderHook` only offers the Item Hook pill when
  `subject.uuid && subject.owner`, so pinning an FX to one item is possible only when you
  arrived from that item's sheet — while House FX has an Item Hook sub-tab and a New FX
  button that cannot make one. Let the Reach control pick an actor + item.

---

## Open questions — decide these before starting, they are not the agent's to choose

1. ~~**Does `with` cover enough?**~~ **ANSWERED 2026-09-07: neither. `like` and `with` are gone
   from the grammar entirely — there is nothing to override, because nothing inherits.** See the
   note under Step 1 and DESIGN §9.
2. ~~**Is `off` a mode of the editor or a switch on the row?**~~ **ANSWERED 2026-09-07: it stays a
   mode of the sheet.** Revisit when step 5 rebuilds the row.
3. ~~**Merging Stock FX and House FX** (step 5) and **dropping the Look up tab into the
   header**~~ **BOTH ANSWERED 2026-09-07: yes to the merge; the Look up tab's search folds into the
   window header and the tab goes.** Written into `CLAUDE.md` and DESIGN §9. Not built.

---

## What not to change

- The grammar (`core/fx.js` schema) — **except that `like` and `with` were removed from it on
  2026-09-07 on the user's ruling; see Step 1.** Nothing else in it changes.
- The corpora and resolution order (world buffer → house → stock).
- The API surface. Every screen goes through it, as today.
- The vocabulary: FX / VFX / SFX, Stock / House / Draft, Global Hook / Item Hook, staged.
  Terms, not prose. No JSON or raw library paths in front of a GM — note that
  *What plays* currently prints `jb2a.portals.vertical.vortex.blue` while the field above it
  prints "JB2A portals vertical vortex blue"; the sentence should use `pathWords`.
- `Save` always writes a Draft.
- The palette and type in `styles/fxstudio.css`. All screens in the proposal use it unchanged.
