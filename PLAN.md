# fxstudio — the plan

**Status: phase 2 (the model) built and green on the sandbox, 2026-09-06 — ARCHITECTURE.md as
ruled: identity keys, the look grammar (`recipes/SCHEMA.md`), the eight shapes and the escape
hatch, the dnd5e reader on the new moments, the migration with its render-level proof (1296 of
1296 looks equal to AA's own sequence, five deliberate differences named and counted), the
baseline per kind, the starters, the authoring API and tools; phase 1's presets retired to the
oracle and deleted from `scripts/`; no AA vocabulary left (`tools/check-legacy.mjs`). The exit
measurements are in §6. Phase 3 (the screens) is a go, given at the phase 2 check-in; alongside it the user reads
`recipes/migration-report.md` and [BACKLOG.md](BACKLOG.md).** Phase 1 (lossless replay) was built
the same day, and the user's first evening on it ruled the model AA left behind out — "abandon the
old practices of AA; keep only its corpus; do it right"; ARCHITECTURE.md was ruled with its costs
accepted ("those are fine"), and §6 was re-cut from it. Written 2026-09-05 after a
day's investigation; the user ruled the shape off a clickable prototype ("it reads right") and
asked for this plan. Re-reviewed and locked 2026-09-06 (§0); the go came the same day. Phase 0's
exit is measured in `recipes/import-report.md` (parity 1289 of 1289, check green); what was
decided while building is in [DESIGN.md](DESIGN.md). Each phase ends at a check-in.

## 0. Decisions locked (the user's, 2026-09-06)

1. **The baseline corpus is the D&D5e Animations corpus, kept whole.** Every row it holds is
   carried over. Nothing is retired to a rule.
2. **Zero loss.** The migration is complete only when every row plays through fxstudio with the
   same files, the same sound, and the same options it had under AA. This is measured, not
   judged (§4 step 4, §6 phase 1 exit).
3. **The baseline ships in this repo, attributed and licensed.** `recipes/baseline.json` is a
   separate work under GPL-3 with attribution to D&D5e Animations 3.3.0 by MrVauxs and Sisimshow;
   the module's code stays MIT. A new campaign needs neither AA nor D&D5e Animations installed:
   the module carries its own pictures.
4. **The house corpus is the user's** (§3.1 Data), committed, portable across campaigns, and the
   place where everything new gets built.
5. **No guessing.** An ability with no row in either corpus plays **nothing** until the user
   gives it a look. There is no automatic look derived from an ability's school, damage type or
   shape. The derivation rules the investigation tested are kept as a parked option (§7), off
   by default, never owed.
6. **The improvements stay in scope:** playing once the dice are known, the outcome layers,
   Battle Flow's moments, exact-name matching, and the sentence screens. They are additions
   on top of an exact replay, never substitutes for one.
7. **Greenfield (ruled 2026-09-06).** This is a greenfield opportunity to do it right. Automated Animations was written before
   Foundry 14 and before assistants, and its architecture (rows keyed by name, menus, thirty-field
   option blobs, sequences that branch on the row) is not one this module carries. AA's corpus is
   migrated once so the table does not start from zero; none of its practices, vocabulary or model
   survive in `scripts/`. Ruled by the user 2026-09-06 after the first evening on phase 1.
   [ARCHITECTURE.md](ARCHITECTURE.md) is the design; its §10 decisions, the two refinements and the
   costs listed with them were accepted in full. Decision 2's measurement moves to the render (the
   same Sequencer calls, ARCHITECTURE §6.2), and decision 5 is read as ruled there: keying a thing
   by the identity dnd5e stamps on it (a maul as a maul) is identity, not guessing. **Every session
   re-reads ARCHITECTURE §0 and checks its own work against it: what am I doing, does it follow
   this principle, am I adopting AA's shape out of convenience?**

## 1. What it is, in one paragraph

**This is a greenfield opportunity to do it right.** Automated Animations was written before
Foundry 14 and before assistants, and its architecture (rows keyed by name, menus, thirty-field
option blobs, sequences that branch on the row) is not one this module carries. AA's corpus is
migrated once so the table does not start from zero; none of its practices, vocabulary or model
survive in `scripts/`. Ruled by the user 2026-09-06 after the first evening on phase 1.

A sister module beside Battle Flow that plays visual and sound effects for what happens at the
table. It keeps **Sequencer** as the engine and **JB2A** and **PSFX** (Patreon builds of both) as
the libraries, and it replaces **Automated Animations** and **D&D5e Animations** by carrying
their whole corpus over losslessly as its baseline. A house list of the user's own looks sits on
top and overrides by exact name. It plays from the chat log once the dice are known, so a miss
looks like a miss, and it adds the outcome layers and Battle Flow moments AA never had. What
has no look plays nothing, visibly listed, until the user gives it one. Non-technical GMs use it
through four screens that speak in sentences, never JSON.

The same author, the same house conventions as the sisters (`../fvtt-mod-battleflow`,
`../fvtt-mod-miscpatches`): plain ES modules, no build step, MIT code, one `esmodules` entry,
tools in `tools/`, the local sandbox is the test box, prod deploys only on the user's word.

## 2. What the investigation measured (the facts this plan stands on)

Battle Flow's repo memory holds the detail; the numbers that shape the design:

| Fact | Number |
| --- | --- |
| AA autorec rows on prod, the D&D5e Animations 3.3.0 preset plus the user's edits | 1289 (four modified rows, six item flags) |
| Rows whose asset is a generic family (magic sign by school, marker, generic swing, template, healing) | 743 |
| Rows that reuse a named spell's asset as a deliberate choice (Aid → Bless in blue) | 466 |
| Rows whose asset is simply the spell's own name in JB2A | 60 |
| 2024 PHB spells / with a preset row | 391 / 341 |
| PHB spells with no row at all: these play nothing until given a look | 50 |
| Party items (five PCs) with no row: these play nothing until given a look | 26 of 144 |
| AA features the corpus uses (census on prod, 2026-09-05) | secondary layer 244 · source layer 73 · target layer 78 · custom file paths 370 · sounds 1109 (113 raw paths) · persistent 298 · macros 0 |
| AA menu types the corpus uses | melee, range, on-token (23 families), template (circle, ray, cone, square), presets (teleportation 28, projectile-to-template 13, dual-attach 3, thunderwave 2), active-effect 183 |
| Converted definition size vs AA's world-setting blob | 381 KB vs 3676 KB |
| AA lookup per item use vs an exact-name map | ~2.8 ms vs ~3 µs |
| Sound paths unresolved on prod's PSFX Patreon 0.17.0 | 28 of 1212 (paths the Patreon build regrouped; re-pointed in the baseline at import) |
| JB2A library on this install | 209 styles, 10052 database paths, 9.7 GB |

Two AA behaviours are wrong by design and are fixed: substring name matching ("(free casting)"
catches the melee "Sting" swing; "Stabilize" catches "Stab"), and animating on the attack hook
before the hit is known. Neither fix loses a picture. dnd5e's attack message already carries each
target's hit or miss, so fxstudio fires at the same moment AA does, knowing the answer. And the
import runs a matching census (§4 step 5) so every name whose row changes under exact matching is
listed for the user before cutover, never dropped silently.

## 3. Architecture

**2026-09-06: [ARCHITECTURE.md](ARCHITECTURE.md) supersedes this section's resolver, presets and
data paragraphs once the user rules on it.** What stays as written here: the pieces and their
direction, the reader, the rendering decision (DESIGN §6), the UI, the validation. What changes:
a look is found by identity keys (a maul is `weapon:maul`, the Shield spell is `spell:shield`),
never by a name rule; a row is a look written as the sentence (scenes of eight shapes) instead of
AA's menus and option blobs; the ported presets become the migration's oracle and are retired.

### 3.1 The pieces

```
JB2A + PSFX ──register paths──► Sequencer.Database
                                      ▲
 dnd5e messages (attack, damage, save, use)          Battle Flow hooks (verdicts, receipts,
 document hooks (template placed, effect on/off,     maneuvers, shields, holds, emanations)
                 token moved after a listed cast)              │
          │                                                    │
          └────────────► fxstudio: reader ──► resolver ──► presets ──► Sequencer
                                              │
                    house (repo + world setting) ┘ baseline (repo, GPL) ┘
```

- **Reader.** Turns a moment into a plain record: who, what item, which targets, which were hit,
  what damage types landed, which saves failed, which template, which effect. Standard moments
  come from the messages dnd5e itself posts (their `flags.dnd5e` carry the activity, the targets
  and each target's hit or miss); Battle Flow's moments come from a small set of hooks Battle
  Flow will emit at its resolve points (see §5). Template placement and effect create/delete are
  document hooks, not messages.
- **Resolver.** Exact item name in the house corpus → else exact name in the baseline → else
  nothing, and the Check screen lists it. Generic creature attacks (Bite, Claw, Slam) match by
  whole word, never substring. The activity's own name is never consulted unless a look asks for
  it. The matching census at import (§4 step 5) shows what this changes against AA before it
  goes live.
- **Outcome layers**, additive, each a switch, on by default: On a hit (target flashes the
  damage colour; a miss flies past) · On a failed save (a mark) · Conditions (an icon while it
  lasts). Colour defaults per damage type and per school are data, editable on the Automatic
  screen.
- **Presets.** One per AA menu type the corpus uses, so a baseline row replays exactly: swing
  (melee), projectile (range), on-token, template (circle, ray, cone, square), teleport,
  projectile-to-template, dual-attach, thunderwave, active-effect loop (persistent, tied to the
  effect document). Each accepts the four AA layers (primary, secondary, source, target), a
  Sequencer database path **or** a raw file path, a sound with delay and start time, and AA's
  option set carried verbatim (persistent, masked, radius, opacity, size, anchor, elevation,
  z-index, repeat and delays, play on source or target, fade in and out, playback rate, remove
  template, unbind alpha and visibility). Plus the outcome presets: impact flash, miss, save
  mark, condition icon. AA's MIT-licensed sequence code is the reference; vendor and simplify,
  never depend. No macro preset: the corpus uses none.
- **Rendering** (measured in phase 1, DESIGN §6). One client plays and Sequencer carries the
  picture to every other client, as under AA: the message's author (else the first active GM),
  or the user who placed the template or created the effect. The plan had said "locally on every
  client, seeded by the message id"; Sequencer 4.2.3 has no seed, so each client would pick its
  own file and mirror. Persistent effects (a Shield loop, an aura) are `.persist()`ed with the
  document's uuid as origin and `.tieToDocuments()`ed so deletion removes them. No sockets of our
  own.
- **Data, two corpora, later wins.** (1) `recipes/baseline.json`: the **baseline corpus**, the
  D&D5e Animations 3.3.0 preset converted row-for-row from the module's own `autorec.json`,
  committed to this repo under GPL-3 with attribution (`recipes/BASELINE-LICENSE`), read-only,
  regenerable by the import tool. (2) `recipes/house.json`: the **house corpus**, the user's own
  looks, committed, MIT, portable across campaigns ("house", not "campaign": it is the DM's corpus
  across games, and it is where everything AA never had gets built). It starts with the four
  preset edits and the six item-flag looks the import finds on prod, each as an override of a
  baseline row. The **world layer** (`fxstudio.looks`, one world setting) is the live edit
  buffer the screens write; `tools/export-looks.mjs` folds it into `house.json` so it is
  versioned and readable by an assistant. `recipes/colours.json` holds the outcome layers'
  colour defaults. An optional item pointer `flags.fxstudio.look` names a look. A row is
  `{name, like?, fx: [{preset, file, sound?, options?}...]}`; `like` inherits everything not
  stated, and a sentence in the UI is a row with one layer. Rows are keyed by item name and
  reference library paths only, never a document id, so both corpora are portable to any world
  with the same libraries.
- **UI** (ApplicationV2, plain DOM, exactly the ruled prototype): **Look up** (sentence, why,
  what happens after; a sheet's abilities as coloured dots, grey for "nothing yet") · **Change
  the look** (start from, colour, sound; a sentence previews; Save writes the world layer) ·
  **Automatic** (the outcome layers as switches; colour defaults) · **Custom looks** (sentences,
  yours first, the baseline's after) · **Check** (counts; the "nothing plays yet" list; paths
  that do not resolve; the matching census). An **FX** header button on item sheets shows the
  same Look up card for that item.
- **Validation.** `tools/check-looks.mjs` runs offline against the libraries' own registration
  files (no Foundry needed) and refuses a path that does not exist; the Check screen runs the
  same test live. This is what catches a library regrouping its paths, as PSFX 0.17.0 did.

### 3.2 What it is not

No patching, no libWrapper, no socketlib. No macro platform. No editing of pack content. No
per-item copies of definitions (AA's "custom item" becomes a one-field pointer). No 3D-module
fields (the only such edit on prod, Necrotic Burst's, drops out with nothing installed to play
it). No automatic look for an ability nobody has given one (§0.5). No dependency from Battle
Flow on this module or the reverse: either works alone.

## 4. Migration from AA — one and done, lossless

`tools/import-aa.mjs`, run once against a copy of the world's LevelDB or through the bridge:

1. **Read** the D&D5e Animations preset file (`dnd5e-animations/module/autorec.json`), the seven
   `autoanimations.aaAutorec-*` world settings, and every `flags.autoanimations` on items.
2. **Convert** every entry to a row, losslessly: one `fx` layer per AA layer in use (primary,
   secondary, source, target), AA's private database paths resolved to native `jb2a.*` paths
   (measured: 1235 of 1237 map; the two that do not, and the 370 custom paths, are kept as raw
   file paths), sounds kept with their delay and start time, options carried verbatim. The 28
   sound paths PSFX 0.17.0 regrouped are re-pointed to their new location and listed in the
   report.
3. **Split** by diffing the world against the preset file, matched by label per menu. Rows equal
   to the preset are the **baseline**; rows that differ, rows the preset lacks, preset rows the
   world deleted, and the item flags are the **house** layer, each written as an override of
   the baseline row it came from (measured on prod 2026-09-05 after the stray "U" and "Ne" rows
   were removed and the accidentally deleted Slowed row was restored: 1289 rows, of which four
   modified — Eldritch Blast sound-only, Sorcerous Burst as a yellow-blue Guiding Bolt, Misty
   Step in blue, Necrotic Burst's 3D-only change which drops out — and none deleted; plus the
   six item flags: Unholy Word, Necrotic Burst, First Light, Goldthorn twice).
4. **Prove parity.** For every row, resolve the converted paths through the libraries'
   registration files and compare against what AA resolved: the same file set, the same sound
   file, the same option values. The import fails loudly on any row that is not identical. Exit:
   1289 of 1289.
5. **Matching census.** Run every item and activity name on the campaign's actors and its
   compendia through AA's lookup (longest label contained in the name, exact-match flag and
   excluded terms honoured, activity name first) and through fxstudio's exact-name lookup. List
   every name whose row differs, with both answers. The user reads the list before cutover and
   adds a house row where AA's accidental match was actually wanted.
6. **Report**: rows per menu, the house layer, every re-pointed sound, every raw path, the
   matching census, and the "nothing plays" list (abilities on the party's sheets with no row).

⚠ **Licence.** D&D5e Animations is GPL-3. The import **tool** is ours, MIT. The **baseline** it
produces is a derived work of the preset and ships in `recipes/baseline.json` under GPL-3 as a
separate work, with `recipes/BASELINE-LICENSE` (the GPL-3 text) and a `_meta` header naming the
source, version and authors; README carries the same attribution. The module's code and house
corpus stay MIT. AA's sequence code is MIT and may be vendored with attribution. Sequencer is
used through its public API only.

Then AA and D&D5e Animations are switched **off** (not uninstalled) for one or two sandbox
sessions of side-by-side play, and uninstalled after cutover. The AA world settings are left in
place until then; they cost nothing while the module is off.

## 5. Battle Flow's part

One small commission in `../fvtt-mod-battleflow`, walked and batteried like any other: emit
public hooks with plain payloads at the resolve points it already owns — hit verdict, damage
applied (per target, by type), save verdict, hold answered (which reaction), maneuver die spent,
shield paid, fold used, emanation member gained/lost. Hooks only: no dependency, no setting, no
change to any flag shape. fxstudio never reads Battle Flow's internal flags.

## 6. Phases, each with an exit measurement

**Re-cut 2026-09-06** on the user's ruling to abandon AA's model; phases 0 and 1 stand as built,
the rest follow [ARCHITECTURE.md](ARCHITECTURE.md). The screens still come before the outcomes.

| Phase | Builds | Exit |
| --- | --- | --- |
| **0 · Foundation** (½ day) — **built 2026-09-06** | repo skeleton with `module.json` requiring Sequencer; the row format; `check-looks`; `import-aa` with its parity proof, matching census and report; `baseline.json` and `house.json` written and committed with their licences; plus, found while building, the private Sequencer table (`aa-database.json`, DESIGN §3) because AA's metadata differs from JB2A's for 1178 layers | **measured:** parity 1289 of 1289 on the sandbox copy of prod's data; `check-looks` green (4435 paths, 0 missing); the module boots on the sandbox and resolves; the census and the "nothing plays" list are in `recipes/import-report.md` **for the user to read** |
| **1 · Lossless replay** (2 days) — **built 2026-09-06** | reader for dnd5e messages and template/effect hooks; resolver (house → baseline → nothing); every corpus preset: swing, projectile, on-token, template ×4, teleport, projectile-to-template, dual-attach, thunderwave, active-effect loop; attacks play knowing hit or miss; the ledger and the `play` switch | **measured:** `smoke-replay` 35 of 35 (one row of every menu type and family through real dnd5e flows, AA still on beside it); `smoke-looks` green (1292 rows build live, every path resolves; the party's sheets all build); parity still 1289 of 1289 after the twin grew the thunderwave and dual-attach nodes. **Left for the user:** watch it side by side (`node tools/smoke-replay.mjs --watch 4000` from a second client on the sandbox) and call them the same |
| **2 · The model** (≈3 days) — **built 2026-09-06** | ARCHITECTURE §§2–8: the moment and subject vocabularies with identity keys (`scripts/core/`); the look grammar and `recipes/SCHEMA.md`; the eight shapes and the escape hatch, places, assets and the renderer (`scripts/engine/`); the dnd5e reader on the new moments (`scripts/readers/`); `tools/migrate-aa.mjs` with the family expansion against the closed lists, the render-level oracle proof and the asset nativisation; the baseline per kind; the starters; the authoring API (`looks.validate/sentence/save/remove`, `preview`, `census`, `resolve`, `sentenceFor`, `assets`) and the tools (`assets`, `census`, `check-looks`, `check-layers`, `check-legacy`, `export-looks`, `preview`); phase 1's presets and rows moved to `tools/lib/oracle/` and deleted from `scripts/` | **measured:** the proof equal for 1296 of 1296 looks (3208 of 3329 moments exactly, 121 by five named allowances, each counted in `recipes/migration-report.md`); 15 paths still on the frozen table (loop markers differ; from 555); the census in the new keys: 596 of 603 abilities on the world's actors answer as under AA, Maul of Momentum now plays, the Shield spell and four word-accidents play nothing, all listed for the user; `smoke-looks` (1293 looks build, every path resolves), `smoke-replay` (37 of 37) and `smoke-author` (12 of 12) green; `check-legacy` finds no AA vocabulary in `scripts/` or `recipes/`. **Left for the user:** read the report and BACKLOG.md; rule the 15 frozen paths and the four not-carried word catches; say go for phase 3 |
| **3 · The screens** (1–2 days) | the four screens and the item-sheet FX button as ruled, on the look grammar: sentences generated from looks; starters and colours from the asset catalogue; Preview; Save to the buffer with provenance; the export tool | the user adds "Sharran Step, like Misty Step but black" in-game unaided and it plays; an assistant adds one through the API and the user reads it as a sentence on the Custom looks screen |
| **4 · Outcomes and moments** (1–2 days) | Battle Flow's hooks (its own commit) and the core reader (statuses, combat, movement); the outcome looks in `outcomes.json`: hit flash by damage type, miss, save mark, condition icons, damage applied; the Automatic screen's switches as `off` on those looks | Riposte, a held Shield, a failed save, Fire Shield and an aura all play; suite extended |
| **5 · Cutover** (½ day + a week's watch) | AA and D&D5e Animations off on the sandbox (done 2026-09-06 for the user's look), then prod on the user's word | prod parity check; no AA hook fires; uninstall after a week of play |

The screens come before the outcomes because the menu is the pain the user named. Order inside
a phase follows the suite: every preset gets a section before the next preset starts.

## 7. Open decisions (the user's), parked options and known risks

- **Go.**
- **Export:** whether folding the world layer into `house.json` is a tool run or a button on the
  Check screen.
- **Template timing — measured 2026-09-06:** Foundry 14 migrates a created MeasuredTemplate to a
  Region and carries dnd5e's flags with it, so `createRegion` with `flags.dnd5e.origin` is the
  moment; the reader waits the half second AA waited for the Region to be drawn. `smoke-replay` §6–7.
- **Reloads:** a client that reloads mid-animation misses it. Acceptable for transient effects;
  persistent ones survive because they are Sequencer-persisted.
- **Monster attacks — measured 2026-09-06:** of the campaign's 205 NPC attack activities on 135
  actors, 171 reach a row by exact name, 28 by whole word (Necrotic Sword → Sword, Rose-Gold
  Longsword → Longsword), 6 nothing (Smother, Battleaxe, Torch, Constricting Vine); `smoke-looks`
  prints the census each run.
- **Performance:** preload the party's styles at combat start (`Sequencer.Preloader`); measure
  first-play latency on a cold client.
- **Parked, off by default, never owed — derived looks.** The investigation tested seven rules
  that derive a look from an ability's own data (own JB2A animation by name, weapon by base item,
  attack spell by damage type, area by template shape, burst, healing, school sign) and found
  they land in the preset's family for 122 of 341 rowed spells. The user ruled no guessing
  (§0.5). The rule tests stay in `prototypes/derive*.mjs`. If ever wanted, they become switches
  on the Automatic screen with live counts, filling only abilities with no row.
- **Parked — retirement.** Dropping baseline rows a rule reproduces identically, to shrink the
  corpus. Depends on the option above; measured, never judged.

## 8. Inputs kept from the investigation

`prototypes/` holds the working scripts and files from 2026-09-05 so nothing is re-derived:
`convert.mjs` (AA → rows), `derive*.mjs` (the parked rule tests), `build-data2.mjs` and
`fxstudio2.template.html` (the ruled prototype and its data), `fx-recipes.json` (all rows
converted, gitignored), `resolve2.mjs` and `coverage.mjs` (the resolution and party census),
`compare-autorec2.mjs` (the preset diff and the feature census). They read LevelDB copies and the
libraries' registration files; none needs Foundry running. Their staging inputs (LevelDB copies,
the libraries' registration files made importable) are rebuilt per CLAUDE.md "Reading the world
offline".
