# Shelved — the Claude Design revamp (2026-09-07)

**These do not govern anything. Do not build from them. Do not "finish" them.**

The user shelved this plan on 2026-09-07:

> *"the ui is buggy as fuck, it has mostly what i want, but i dont want to be burdened by the plan
> from the html and redesign, which came from claude design. id like to continue the refactor using
> my own judgment. … shelve the plans to date and radically clean things up. we need another tabula
> rasa reset where we're going to vet with what we have, fix it and see if we can go fwd, if not
> we'll go back to the commit before this started."*

| File | What it was |
| --- | --- |
| `HANDOFF.md` | the written brief: five acceptance rules and seven steps, written 2026-09-07 from a read of the code |
| `fxstudio6-proposal.html` | the Claude Design screens the brief illustrated (it already carried a red CORRECTION banner) |

They are kept only so the record of what was built and why stays readable — `DESIGN.md` §9 cites
them. Read them as **history**, never as instructions.

## The rollback point

**`a4c9824` — "phase 3, the second bug-testing pass (2026-09-07)"** is the last commit *before* the
revamp. It is tagged **`pre-revamp`** (a local tag; `git push origin pre-revamp` if you want it on
the remote).

```
git diff pre-revamp --stat          # everything the revamp changed
git checkout -b before-revamp pre-revamp   # a branch at that state, nothing lost
```

That state is the UI you had after the two in-game bug-testing passes — twenty-seven of your own
rulings, tested at the table.

**⚠ One thing rides along with a rollback.** The first revamp commit, `ce74b8c`, carried *two*
unrelated things: step 2 (Play wired up) **and the no-shortcuts ruling** — `like` and `with` taken
out of the grammar, which you ruled yourself and which had nothing to do with Claude Design.
Rolling back to `pre-revamp` **puts `like` and `with` back into the grammar.** If you want the
rollback without that, the ruling would have to be re-applied on top; it is a small, self-contained
change to `core/fx.js`, `core/corpus.js`, `api.js` and the two screens that read them.

## What the revamp actually changed, if you are weighing it

| Commit | What |
| --- | --- |
| `ce74b8c` | no shortcuts (**your ruling, not the plan's**) + ▶ Play on the sheet |
| `4beb597` | layout primitives: one gutter/row/radius, no wrapping knob rows |
| `de31e86` | the FX sheet as five bands, a rail, an overlap strip and a band-tabbed inspector |
| `6b46e3f` | six tabs → three (FX · Assets · Coverage); the sheet became a pane; search moved to the header |
| `83f4781` | Coverage rebuilt; the Item Hook gap closed; four incidental bug fixes |
