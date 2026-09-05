# fxstudio — the plan

**Status: planned, not started.** Written 2026-09-05 after a day's investigation; the user ruled
the shape off a clickable prototype ("it reads right") and asked for this plan. Nothing here is
built. Work starts on the user's explicit "go", and each phase below ends at a check-in.

## 1. What it is, in one paragraph

A sister module beside Battle Flow that plays visual and sound effects for what happens at the
table. It keeps **Sequencer** as the engine and **JB2A** and **PSFX** (Patreon builds of both) as
the libraries, and it replaces **Automated Animations** and **D&D5e Animations** outright. It
reads each ability's own data and derives a look by a short list of plain rules; a small list of
custom looks overrides by exact name. It plays after the dice, from the chat log, so the picture
matches the outcome. Every ability gets *something*; a custom look only adds the flourish.
Non-technical GMs use it through four screens that speak in sentences, never JSON.

The same author, the same house conventions as the sisters (`../fvtt-mod-miscpatches`,
`../fvtt-mod-combatplus`): plain ES modules, no build step, MIT, one `esmodules` entry, tools in
`tools/`, the local sandbox is the test box, prod deploys only on the user's word.

## 2. What the investigation measured (the facts this plan stands on)

Battle Flow's repo memory holds the detail; the numbers that shape the design:

| Fact | Number |
| --- | --- |
| AA autorec rows in prod, all from the D&D5e Animations 3.3.0 preset | 1290 (the user's own edits: about a dozen, plus 6 item flags) |
| Rows whose asset is a generic family (magic sign by school, marker, generic swing, template, healing) | 743 |
| Rows that reuse a named spell's asset as a deliberate choice (Aid → Bless in blue) | 466 |
| Rows whose asset is simply the spell's own name in JB2A | 60 |
| 2024 PHB spells / with a preset row / where five derivation rules land in the preset's family | 391 / 341 / 122 |
| PHB spells with no row at all, which the rules cover with a baseline | 50 |
| Party items (five PCs) resolved by rules alone, with zero rows | 118 of 144 (the 26 left are features with no damage, heal or school) |
| Converted definition size vs AA's world-setting blob | 381 KB vs 3676 KB |
| AA lookup per item use vs an exact-name map | ~2.8 ms vs ~3 µs |
| Preset sounds that need PSFX Patreon | ~203 rows (silent today on the free build) |
| JB2A library on this install | 209 styles, 10052 database paths, 9.7 GB |

Two AA behaviours are actively wrong at the table and disappear by construction: substring name
matching (a stray "U" row catches every unnamed Utility activity, which dnd5e names "Use"; "(free
casting)" catches the melee "Sting" swing), and animating on the attack hook before the hit is
known.

## 3. Architecture

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
                          custom looks (world) ┘ rules (shipped) ┘ item pointer (rare)
```

- **Reader.** Turns a moment into a plain record: who, what item, which targets, which were hit,
  what damage types landed, which saves failed, which template, which effect. Standard moments
  come from the messages dnd5e itself posts (their `flags.dnd5e` carry the activity and targets);
  Battle Flow's moments come from a small set of hooks Battle Flow will emit at its resolve
  points (see §5). Template placement and effect create/delete are document hooks, not messages.
- **Resolver.** Exact item name in the custom looks → else the rules over the item's data → else
  nothing. Generic creature attacks (Bite, Claw, Slam) match by whole word, never substring. The
  activity's own name is never consulted unless a custom look asks for it.
- **Rules** (shipped, each a switch; counts shown live in the UI): Own animations (JB2A ships one
  named after the spell) · Weapons (by base item) · Attack spells (throw or strike with the damage
  type) · Area spells (paint the template's shape in the damage colour, else the school colour) ·
  Bursts (damage with no attack roll) · Healing · Signs (any other spell casts its school's sign).
  Outcome layers, always on: On a hit (target flashes the damage colour; a miss flies past) · On a
  failed save (a mark) · Conditions (an icon while it lasts). Colour defaults per damage type and
  per school are data, editable on the Automatic screen.
- **Presets.** About ten short Sequencer chains: swing, projectile, area, burst, on-token, sign,
  heal, on-effect loop (persistent, tied to the effect document), teleport, impact flash / save
  mark / condition icon. AA's MIT-licensed standard sequences are the reference; vendor and
  simplify, never depend.
- **Rendering.** Transient effects render **locally on every client** from the same message
  (Sequencer `.locally()`), with any random variant seeded by the message id so all clients agree.
  Persistent effects (a Shield loop, an aura) are created once by the client that created the
  effect document, `.persist()`ed and `.tieToDocuments()`ed so deletion removes them. No sockets
  of our own.
- **Data.** `recipes/rules.json` (switches + colour defaults) · `recipes/imported.json` (the
  custom looks harvested from AA, ~400 rows, read-only) · the **world layer** in one world setting
  (`fxstudio.looks`, tens of rows), exported to `recipes/looks-<worldId>.json` by a tool so it is
  versioned and readable by an assistant · an optional item pointer `flags.fxstudio.look` naming
  a custom look. A row is `{name, like?, style, colour?, sound?, options?}`; `like` inherits
  everything not stated.
- **UI** (ApplicationV2, plain DOM, exactly the ruled prototype): **Look up** (sentence, why,
  what happens after; a sheet's abilities as coloured dots) · **Change the look** (start from,
  colour, sound; a sentence previews; Save writes the world layer) · **Automatic** (rules as
  switches with live counts; colour defaults) · **Custom looks** (sentences, yours first) ·
  **Check** (counts; the "nothing plays yet" list). An **FX** header button on item sheets shows
  the same Look up card for that item.
- **Validation.** `tools/check-looks.mjs` runs offline against the libraries' own registration
  files (no Foundry needed) and refuses a path that does not exist; the Check screen runs the
  same test live.

### 3.2 What it is not

No patching, no libWrapper, no socketlib. No macro platform. No editing of pack content. No
per-item copies of definitions (AA's "custom item" becomes a one-field pointer). No 3D-module
fields. No dependency from Battle Flow on this module or the reverse: either works alone.

## 4. Migration from AA — one and done

`tools/import-aa.mjs`, run once against a copy of the world's LevelDB or through the bridge:

1. Read the seven `autoanimations.aaAutorec-*` settings and every `flags.autoanimations` on items.
2. Convert each entry to a row: AA's private database paths resolve to native `jb2a.*` paths
   (measured: 1235 of 1237 map; the rest are custom paths kept as-is).
3. Classify each row against the rules using the compendium's item data: a row the rules would
   reproduce is **retired**; the rest becomes `recipes/imported.json`. Expected: roughly 880
   retired, 400 kept. Item flags become world rows only where the item is not covered by a rule
   (Goldthorn is a scimitar: no row needed; Unholy Word keeps its custom look).
4. Write a report: what was retired and why, what was kept, every sound that needs PSFX Patreon.

⚠ **Licence.** D&D5e Animations is GPL-3, so its curated rows are its authors' work. The import
**tool** is ours and ships; the **data** it produces (`recipes/imported.json`, and the
investigation's `prototypes/fx-recipes.json`) is generated from the user's own world and stays
out of this public MIT repo (gitignored). The rules and the presets carry no preset data. AA's
sequences are MIT and may be vendored with attribution.

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

| Phase | Builds | Exit |
| --- | --- | --- |
| **0 · Foundation** (½ day) | repo skeleton with `module.json` requiring Sequencer; the row format and `check-looks`; `import-aa` and its report | the import report on prod's data; the check green on every kept row |
| **1 · Standard moments** (1–2 days) | reader for dnd5e messages and template/effect hooks; resolver with the seven rules; presets swing, projectile, area, burst, sign, heal, on-token | the five party sheets play on the sandbox; `smoke-looks` suite green; a side-by-side pass against AA on ten abilities |
| **2 · Outcomes** (1–2 days) | Battle Flow's hooks (its own commit) and the outcome presets: hit flash, miss, save mark, condition icons, damage applied; persistent on-effect loops; teleport | Riposte, a held Shield, a failed save, Fire Shield and an aura all play; suite extended |
| **3 · The screens** (1–2 days) | the four screens and the item-sheet FX button as ruled; Preview; the three-picker editor writing the world layer; export tool | the user adds "Sharran Step" in-game unaided and it plays |
| **4 · Cutover** (½ day + a week's watch) | PSFX Patreon installed; AA and D&D5e Animations off on the sandbox, then prod on the user's word | prod parity check; no AA hook fires; uninstall after a week of play |

Order inside a phase follows the suite: every preset gets a section before the next preset starts.

## 7. Open decisions (the user's) and known risks

- **Go, and the repo name** (`fvtt-mod-fxstudio` assumed). PSFX Patreon before phase 4.
- **World layer storage:** a world setting plus a versioned export (assumed), or a file uploaded
  into the world folder. The setting is simpler and the bridge can read it.
- **Template timing:** dnd5e 5.x places templates as Regions; the reader keys on `createRegion`
  with the activity origin, the same hook AA uses on this version. Measure once on the sandbox.
- **Local rendering and reloads:** a client that reloads mid-animation misses it. Acceptable for
  transient effects; persistent ones survive because they are Sequencer-persisted.
- **Monster attacks:** natural attacks have no base item; the word rule (Bite, Claw, Tail…) plus
  the imported rows cover them. Measure on the campaign's NPCs in phase 1.
- **Performance:** preload the party's styles at combat start (`Sequencer.Preloader`); measure
  first-play latency on a cold client.

## 8. Inputs kept from the investigation

`prototypes/` holds the working scripts and files from 2026-09-05 so nothing is re-derived:
`convert.mjs` (AA → rows), `derive*.mjs` (the rule tests), `build-data2.mjs` and
`fxstudio2.template.html` (the ruled prototype and its data), `fx-recipes.json` (all 1290 rows
converted), `resolve2.mjs` and `coverage.mjs` (the resolution and party census). They read
LevelDB copies and the libraries' registration files; none needs Foundry running.
