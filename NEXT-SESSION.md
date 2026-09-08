# Handoff — the reset (2026-09-07)

Read [CLAUDE.md](CLAUDE.md) first (it is loaded for you), then this page. It is short on purpose.

---

## 1. What happened

The UI was rebuilt over 2026-09-07 in seven steps, off a brief and a set of Claude Design screens.
The user stopped it:

> *"the ui is buggy as fuck, it has mostly what i want, but i dont want to be burdened by the plan
> from the html and redesign, which came from claude design. id like to continue the refactor using
> my own judgment. … make a note which commit we started the redesign, in case we totally need to
> roll back. then shelve teh plans to date and radically clean things up. we need another tabula
> rasa reset where we're going to vet with what we have, fix it and see if we can go fwd, if not
> we'll go back to the commit before this started."*

**The plan is shelved. The user's judgment drives what happens to the UI from here.**

## 2. What you must not do

- **Do not build from `shelved/`.** `HANDOFF.md` and `fxstudio6-proposal.html` are in there as
  history. Their five "rules" (R1–R5) and seven steps are not authority for anything. Nothing in
  them is owed or unfinished.
- **Do not go bug-hunting on your own.** The user vets it by using it. They will say what is broken.
  Driving the window with a script to form an opinion about it is not what "vet" meant.
- **Do not start a UI change the user has not named**, however obvious it looks.
- **Do not do a big rename or a doc-matching sweep.** A large diff with no behaviour change costs
  review time and buys nothing.

## 3. The rollback point

**`a4c9824`** — *"phase 3, the second bug-testing pass (2026-09-07)"* — is the last commit before
the redesign, tagged **`pre-revamp`** (local tag only; `git push origin pre-revamp` to publish it).

```bash
git diff pre-revamp --stat
git checkout -b before-revamp pre-revamp
```

That is the UI after the two in-game bug-testing passes — twenty-seven of the user's own rulings,
tested at the table.

**⚠ One thing rides along.** The first redesign commit, `ce74b8c`, bundled step 2 of the plan
**and** the user's own no-shortcuts ruling (`like` and `with` out of the grammar). A rollback to
`pre-revamp` **puts `like` and `with` back**. If the user wants the rollback without that, the
ruling has to be re-applied on top — a small, self-contained change to `core/fx.js`,
`core/corpus.js`, `api.js` and the two screens that read them. `shelved/README.md` lists what each
redesign commit changed, for weighing keep-or-roll-back.

## 4. What is actually in the repo right now

Everything is committed and green. Nothing is half-built.

| | |
| --- | --- |
| Tabs | **FX · Editor · Assets · Coverage**; the search belongs to the FX tab; the Editor is the FX sheet, and leaving the tab does not close it |
| `ui/fxtab.js` | the search (name only, no dropdown) + Import · facets · rows; every FX in one list, Draft → House → Stock; a row is a name with Delete · Editor, and clicking it takes no action |
| `ui/library.js` | the Asset Library, and the picker the sheet's Browse opens — **untouched by the redesign, by the user's ruling** |
| `ui/coverage.js` | Maintain, the two scopes, four tiles, the rows |
| `ui/sheet.js` | one sheet per FX: the action bar, the sentence, the hook strip, the sequence, the note |
| Suites | `smoke-screens` 163 · `smoke-author` 15 · `smoke-fx` 1293 · `smoke-replay` 45 · `check-fx`/`imports`/`layers`/`legacy` green |

The suites pass. **That is not the same as the UI being right** — the user's word for it is "buggy
as fuck", and they are the one using it.

## 5. Two things already known to be wrong

Found by driving the window once on 2026-09-07, before the user stopped that. **Offered, not owed** —
they have not been ruled on, and they are not a to-do list:

- The window **scrolls sideways below about 780px**, on every tab.
- **A modal dialog swallows every later click.** Back from an unsaved new sheet opens the
  leave-guard dialog; anything clicked while it is up does nothing, with no sign why.

## 6. Where to pick up

**Wait for the user.** They will restart in a fresh window and say what is broken, or say roll back.

Parked elsewhere, each on the user's word: phase 4 — outcomes and moments (PLAN §6, what the module
was actually for); the 502 migrated assets keyed `file` that are really library paths (BACKLOG);
cutover (PLAN §6 phase 5).

## 7. How to work here

In [CLAUDE.md](CLAUDE.md) in full; the ones this work keeps needing:

- **The sandbox is the test box, never prod.**
  `node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop|start|status`, deploy with
  `node ../fvtt-mcp-molten5e/scripts/deploy-house-module.mjs fvtt-mod-fxstudio --local` (while the
  server is down if `module.json` changed), then start. `recipes/` must travel with
  `scripts/ styles/ templates/ lang/`. **A script edit needs a re-deploy before a suite sees it** —
  the suite drives the browser's copy of the module, not the repo's.
- After any edit under `scripts/`: `check-imports`, `check-layers`, `check-legacy`. After any edit
  under `recipes/`: `check-fx`.
- One green pass, then check in. Build only when told.
