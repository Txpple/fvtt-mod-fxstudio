# fxstudio — the architecture (ruled 2026-09-06)

> **Vocabulary (ruled 2026-09-06).** What this document calls a *look* is an **FX** on the screens, in the code (`scripts/core/fx.js`, `api.fx`, the item flag `flags.fvtt-mod-fxstudio.fx`, the world setting `fx`) and in the recipe files (`"fx": [...]`): a picture is a **VFX**, a sound an **SFX**. A look written over the main corpus is an **override**. The earlier sections keep the word they were written with.

**Why this document exists.** Phase 1 proved the corpus can play: every one of Automated
Animations' 1289 rows plays through FX Studio with the same files, sound and options, measured
(DESIGN §6). It proved it by porting AA's own model — rows keyed by name, AA's menus, AA's option
blobs, AA's sequences — and the first evening of use showed the cost: "Maul of Momentum" plays
nothing because the weapon word comes first, and Gren's Shield spell plays a shield bash because a
name is all a row knows. Those are not two bugs; they are one design, AA's, inherited whole. The
user ruled: **abandon AA's practices, keep only its corpus, and design the thing right for the long
term** — modular, clear, sustainable, and with a better way for people *and* assistants to add
looks. This is that design, **ruled by the user the same day with its costs accepted ("those are
fine")**; it is PLAN §0's seventh locked decision and supersedes PLAN §3.1's resolver, presets and
data paragraphs. PLAN §0's first six decisions stand (whole corpus, zero loss measured, GPL
stock, house corpus, no guessing, improvements in scope).

**This is a greenfield opportunity to do it right.** Automated Animations was written before
Foundry 14 and before assistants, and its architecture (rows keyed by name, menus, thirty-field
option blobs, sequences that branch on the row) is not one this module carries. AA's corpus is
migrated once so the table does not start from zero; none of its practices, vocabulary or model
survive in `scripts/`. Ruled by the user 2026-09-06 after the first evening on phase 1.

The one-line version: **a look is found by what acted and when, not by what it was called; a look
is written as the sentence the user would say; the engine knows eight shapes, plus one escape hatch, and nothing else.**

## 0. Read this every time, and check yourself against it

This is a greenfield design. We do not inherit Automated Animations' legacy architecture or its
practices, on purpose. Phase 1 showed how easily that happens anyway: the plan carried AA's rows,
menus and option blobs because they were in front of us and the easiest thing to prove equal, and
the first evening of use found the cost. So, **every time you read this, stop and ask: what am I
doing right now, does it follow this principle, and am I adopting AA's shape out of convenience?**
Cross-check against these tells before writing code or data:

- a rule about *names* (a substring, a word regex, an exclude list) instead of a key from
  identity;
- a field that carries an AA option verbatim, or a concept that exists only because AA had it
  (a menu, a preset type, "playOn: default", a shield flag, a wait that counts "the last of all
  targets") — bake the *value* onto a scene, never the concept;
- a branch in the engine on what a *row* says instead of on what a *shape* needs;
- a special case for one look (claw sizing, a dagger's return delay) instead of a knob every
  look can use;
- choosing "the same representation as AA" because it is easier to prove equal — the proof is at
  the render, not the representation;
- a vocabulary word a GM would not say, or an assistant could not guess the meaning of.

If a tell fires, the answer is not "AA did it this way"; it is the sentence the user would say,
the identity dnd5e already keeps, and the eight shapes. A mechanical check backs this up:
`tools/check-legacy.mjs` (phase 2) fails on any AA vocabulary in `scripts/` or `recipes/`
(`autoanimations`, `menu`, `aefx`, `ontoken`, `templatefx`, `playOn`, `isRadius`, and the rest of
the option-blob names) except inside the migration tool and its oracle.

## 1. The model in one picture

```
                 readers (one per source)                           the corpus (data)
  dnd5e messages, regions, effects ─┐                     stock/  house/  starters  outcomes
  core: statuses, combat, movement ─┼──► MOMENT ──► resolve ◄── looks indexed by (subject key, moment)
  Battle Flow's public hooks ───────┘   {when, subject,     │
                                         source, targets,   ▼
                                         outcomes, place}  LOOK = scenes (shape + asset + place + knobs)
                                                            │
                                                            ▼
                                                 engine: 8 shapes → one Sequence → Sequencer
```

Four layers, each a directory, dependencies pointing down only (enforced by a check, as Battle
Flow does):

| Layer | Knows about | Never imports |
| --- | --- | --- |
| `core/` — moments, subjects, looks, resolve | plain data | Foundry, Sequencer |
| `readers/` — dnd5e, core, battleflow | Foundry documents and hooks | the engine |
| `engine/` — shapes, places, assets, render | Sequencer and the canvas | readers |
| `ui/` — the four screens (phase 3) | the API | Sequencer |

The entry file wires them and nothing else. Adding a source of moments is a reader; adding a way
a picture can move is a shape; adding a kind of thing that can have a look is a subject kind.
None of those touch the others.

## 2. Moments — what happened

A moment is a plain record every reader produces the same way:

```
{ when, subject, source, targets: [{token, outcome?}], place?, tie?, id, user }
```

- `when` is one of a closed vocabulary. Now: `use`, `effect`, and **Battle Flow's five** (built
  2026-09-11, below): `maneuver`, `sneak`, `fold`, `rider`, `hold-answered`. Phase 4 adds the
  outcomes and events: `hit`, `miss`, `saved`, `failed-save`, `damaged` (with the damage type),
  `healed`, `status` (on and off), `downed`, `critical`, `fumble`, the rest of Battle Flow's
  (`riposte`, `shield-paid`, `emanation` — when it publishes them), plus core's (`turn-start`,
  `combat-start`, `rest`). Each is a word a sentence can use.
- `subject` is what acted, with its identity keys (§3).
- `source` is the acting token; `targets` the targeted tokens, each with its outcome when the
  moment knows it (an attack knows hit or miss per target from dnd5e's own message).
- `place` is a placed template (a Region), a destination, or nothing.
- `tie` is the document persistent pictures live and die with (an active effect, a Region).

**The timing policy is the reader's, written down once.** A `use` fires as late as the answer is
known and no later: after the attack roll for attacks (hit and miss known), after the damage roll
for save and healing spells (targets known), on template placement for areas, on the card for
everything else. This is what AA did on this world by accident of its hooks; here it is one table
in `readers/dnd5e.js` and one paragraph in the docs, and Battle Flow's verdict hook can replace
"after the attack roll" in phase 4 without any look changing.

**The policy's other half: a moment can be HELD** (ruled 2026-09-09; `core/gates.js`). Some answers
are not known when the table's own event fires — Battle Flow asks a Careful Spell's caster who the
area spares *after* the template lands, and holds the cast's card until they answer, so the picture
would otherwise play before the question (the user: *"the animation fires early"*). So:

> *A moment another module holds plays when the hold lifts.*

A **gate** is one function, `(moment) => promise | null`, registered by the entry or by any module
through `api.gates.register(name, ask)`. It is asked **once per moment, at read time, before the
moment plays** — never around the player, so nothing can wait twice. `null` means not held; a
promise means held, and its resolution decides: truthy plays, `null` or `false` says the thing never
happened and **nothing plays**. The dispatcher asks; the readers do not (they only carry `activity`
and `flags` on the moment, so a gate has something to ask by). Nothing registered — which is every
table without a module that holds — is the straight road, unchanged: not-installed is not a branch,
it is the default with an empty registry.

**The hold's contract, in Battle Flow's words and ours, so the two repos say the same sentences:**

> **The hold.** A hold is client-local, in-memory, keyed by subject. `holdFor(subject)` answers with
> a promise or `null`; `null` means nothing here is holding, which on a remote client may mean
> nothing here can *see* a hold. A hold always settles: with the **card** that lifted it (play it),
> with **`null`** meaning nothing was posted and nothing should play, or with a truthy **sentinel**
> meaning the hold lifted and nothing is known — carry on. The consumer bounds its own wait; a hold
> is a courtesy, never a guarantee of liveness.

⚠ **The wait is bounded here (five minutes) and a bound that expires PLAYS.** A gate may delay a
picture; it must never be able to swallow one by going quiet. A gate that throws is logged and
ignored — another module's bug never costs this table a picture. `readers/battleflow.js` is the only
Battle Flow-shaped code in the module: one feature detect (`holdFor`, falling back to the older
`castHold`), no import, no manifest relationship, nothing required. Battle Flow's side of the
contract is its `scripts/holds.js` and its ARCHITECTURE §7; `api.holds.version` tells the two
contracts apart if it is ever needed, and `castHold` is kept there for good.

**Battle Flow's moments — the other direction (2026-09-11).** The hold tells this table *not yet*;
Battle Flow's moment events tell it *now, and here is what*. An ability used through one of Battle
Flow's own popups posts no dnd5e card — a maneuver die rides the damage roll, Parry rides the hold's
answer, Sneak Attack's dice write a record on a message that already exists — so the dnd5e reader
never sees it, though the same ability used from the sheet would play. Battle Flow publishes a
Foundry hook at the resolve, **`battleflow.moment`** (and `battleflow.<event>` beside it), with a
**plain payload** — uuids and ids, never documents, never its flag shape — on the client that
resolved the moment. The user's ruling: *"from the battleflow perspective, no real dependency because
fx studio is optional. events would just fail silently … from the fx studio, it does its normal card
processing, but should have an additional event hook to accept battleflow pushes like sneakattack."*

> `readers/battleflow.js` `readMoment(payload)` turns the payload into a moment — `when` is the
> event's word; the subject is the **item's own keys** when the item resolves (`feature:sneak-attack`,
> so a look authored for the ability answers) with **`event:<word>` last** (so a look can be keyed to
> the moment itself); source and targets are the tokens the payload names, `hit` carried when known;
> `id` is `<messageId>:<event>` (the same message may also carry a `use`); `flags` is **empty by
> contract** (no Battle Flow flag is read — the payload rides as `event` for a gate or a tool). It goes
> to the **same dispatcher** as every other reader: the gates are asked, the play switch is honoured,
> the ledger keeps it. Not installed → the hook never fires → nothing runs. A word this build does not
> know is a logged skip, so a newer Battle Flow never throws here.

**The fallback, ruled with it:** a Battle Flow moment whose ability posts **no card of its own**
(`maneuver`, `sneak`, `fold`, `rider` — `core/moments.js` `FALLS_BACK_TO_USE`) is answered by the
ability's **`use` look** when nothing names the moment's own word (`engine/render.js`
`resolveMoment`): the picture for "Sneak Attack, used" *is* the picture for Sneak Attack's dice
riding a hit, so a table that authored one for the card gets it on the dice with nothing to write —
the migration's feature looks included. The word wins when it is authored; an `off` on the word is
a silence, never fallen past. `hold-answered` does **not** fall back, on purpose: a cast that
answers a hold (Shield) posts its own usage card, which already plays the `use` look, and a
fallback would play it twice. `tools/check-moments.mjs` proves the reading and the fallback offline
(29 rules); `smoke-replay` §16 fires the payload at the table and reads the ledger.

## 3. Subjects — what acted, by identity, not by name

The user's two bugs are one rule: **a look is keyed by what the thing IS, in a vocabulary dnd5e
already keeps, and only then by what it is called.** No substring, no whole-word regex, no
"exclude" lists. Matching happens once, at migration and at authoring, against closed lists; at
the table a lookup is an exact map hit.

A subject has an ordered list of keys, most specific first. The resolver takes the first key that
has a look (unless that look is switched off). Keys are `<kind>:<id>`:

| Kind | Id, most specific first | Where dnd5e keeps it |
| --- | --- | --- |
| `spell` | the spell's identifier (`fire-bolt`) | `system.identifier` (every item has one; dnd5e slugs the name) |
| `weapon` | the name slug (`maul-of-momentum`), then the base weapon (`maul`) | `system.type.baseItem`, one of 43 in the 2024 list |
| `natural` | the name slug (`bite`) | a weapon whose `type.value` is `natural` (monster attacks) |
| `feature` | the identifier (`brutal-strike`) | `system.identifier` |
| `item` | the name slug (`potion-of-healing`) | consumables, equipment, tools, loot |
| `effect` | the effect's name slug, then its origin's key (`spell:shield`) | `ActiveEffect.name`, `origin` |
| `status` | the status id (`prone`) | `CONFIG.statusEffects`, the token's statuses |
| `damage` | the damage type (`fire`) | phase 4 |
| `event` | the event name (`riposte`, `turn-start`) | the reader that emits it |

Two refinements, ruled with the rest on 2026-09-06: a subject's most specific key may
name the activity (`spell:fire-bolt/attack`), so one item can carry a different look per activity
without the activity's *name* ever being consulted; and a "cast spell" activity is keyed by the
spell it links, so a staff that casts Fireball plays Fireball's look.

One normalisation rule, documented and testable: a slug is the lower-cased name with a trailing
qualifier removed — "Misty Step - Spellcasting", "Bless - Fey-Touched", "Potion of Healing
(Greater)" — after the full name has been tried first. It is still the thing's own name.

What this does to the two bugs: "Maul of Momentum" is `weapon:maul-of-momentum` then
`weapon:maul`, and the migrated Maul look answers the second. Gren's Shield is `spell:shield`; the
shield-bash look is keyed `weapon:shield` and can never meet it. Nothing about names had to be
patched, and nothing about it will need patching when the next oddly named weapon or spell arrives.

**AA's family rows** ("Sword" for anything with sword in it, "Bite" for any bite) do not survive
as rules. The migration expands each one, once, against the closed lists: the 43 base weapons'
names, the natural-attack names across the installed compendia (a census), and the world's own
items — and writes explicit keys: the Sword look is `for: [weapon:longsword, weapon:shortsword,
weapon:greatsword]`. The census lists every expansion so the user reads what AA's substring would
and would not have caught before it becomes data. Where AA's rule caught something by accident
("Axe" for Battleaxe, "Shield" for Shield of Faith), the census shows it and it is not carried;
where it caught something wanted, the user keeps it with one word.

**No guessing, still.** Keying a maul as a maul is identity, not derivation: the look for
`weapon:maul` exists because the corpus has one, and a subject with no key in the corpus plays
nothing and is listed. The derivation rules (a look from a spell's school or damage type) stay
parked exactly as PLAN §7 says.

## 4. Looks — the sentence is the data

A look is written the way the user would say it, and the screens, the docs and an assistant all
read and write the same shape:

```
{ id: "fire-bolt",
  for: ["spell:fire-bolt"],
  on: "use",
  scenes: [
    { shape: "shoot", asset: { family: "jb2a.fire_bolt", colour: "orange" },
      from: "source", to: "each-target", onMiss: "fly-past",
      sound: { asset: "psfx.cantrips.fire-bolt", volume: 0.75 } }
  ],
  by: "stock", note: "D&D5e Animations 3.3.0" }
```

which the screens render as *"Fire Bolt · when used · a bolt (JB2A fire bolt, orange) shoots from
the caster to each target and flies past on a miss · with the fire bolt sound."* There is no
second grammar: the sentence is generated from the look, never parsed back.

### 4.1 The look

| Field | Meaning |
| --- | --- |
| `id` | unique across the corpora; a house look with a stock look's id replaces it |
| `for` | the subject keys it answers (§3); empty for a starter |
| `on` | the moment kind (§2) |
| `off` | a house look that silences a stock look |
| `scenes` | the pictures, in start order — always this look's own; no look points at another (see *No shortcuts*) |
| `by`, `at`, `note` | provenance: who wrote it (a user, an assistant, the migration), when, and why in a sentence |

### 4.2 The scene

| Field | Meaning |
| --- | --- |
| `shape` | one of eight (§5) |
| `asset` | `{family, variant?, colour?}` resolved against the libraries' own registration, or a database path, or `{file}` for a raw path; `template: [grid, start, end]` only where the migration must reproduce AA's stretch metadata (§6.3) |
| `from`, `to`, `at` | places: `source`, `each-target`, `targets-else-source`, `both`, `template`, `destination`, `impact` (where the previous scene landed, a miss included) |
| `size` | `{squares}`, `{scale}`, `{radius, plusToken}` or `{fit: template}` — one of, by shape |
| `timing` | `delay`, `wait` (the next scene starts after this one), `repeat` and `every`, `rate`, `fadeIn`, `fadeOut` |
| `look` | `opacity`, `tint`, `mirror`, `below` (under tokens), `elevation`, `mask`, `zIndex` |
| `persist` | `none`, `effect` (while the tying effect stands), `template` (while the Region stands), `until-removed` |
| `onMiss` | `fly-past`, `skip`, `play` — for shapes that can miss |
| `sound` | `{asset, volume, delay, start, repeat, every}` |
| `thrown` | strike only: the shoot to use when the target is out of reach, and its return flight |

Every knob is named for what it does and has one meaning across shapes. AA's thirty-field option
blobs, its `playOn: default`, `isRadius` + `addTokenWidth`, `isShieldFX`, `animationSource`, its
"complete" loops and "the last of all targets" waits are all gone: the migration turns each into a
value on a scene (a shield look becomes two mark scenes, a loop becomes `fadeOut: 0`), and the
concept does not survive.

### 4.3 Files

```
recipes/
  stock/      spells.json  weapons.json  natural.json  features.json  items.json  effects.json
                 (GPL-3, migrated, read-only, regenerated by the migration; one file per kind so a
                  person or an assistant can read the spells without the weapons)
  house.json     the user's looks and overrides (MIT, committed, portable)
  starters.json  the abstract looks every new look starts from (§7)
  outcomes.json  the outcome layers' looks and colour defaults (phase 4)
  aa-assets.json the frozen private asset table, only for what cannot be nativised (§6.3); goal: empty
  SCHEMA.md      the grammar above with every knob's range and default, for people and assistants
```

plus the world setting `looks` as the live edit buffer, and an item pointer `flags.fvtt-mod-fxstudio.look`
naming a look id for one specific item (phase 3; the flag's scope is the module id, as Foundry requires). Every file carries `schema: 2`; a future change to the
shape is a migration function in the tools, never a hand edit. **As built (phase 2, 2026-09-06):**
`recipes/stock/` holds 1289 looks (spells 586, weapons 132, natural 87, features 277, items 23,
effects 184), `house.json` 7, `starters.json` 10, `aa-assets.json` 15 paths; `migration-report.md`
is the census; the scene's knobs are flat on the scene (`delay`, `opacity`, …) rather than grouped
under `timing`/`look`, and an asset may also be `{byPosition: {center, mid, left}}` (a picture picked
by where the template sits) — `recipes/SCHEMA.md` is the grammar as written.

## 5. The engine — eight shapes, one escape hatch, nothing else

`engine/shapes/` is the only place Sequencer's API is called. Each shape is one small module that
turns a scene plus resolved places into Sequencer sections on one Sequence:

| Shape | The picture | Replaces in AA |
| --- | --- | --- |
| `strike` | a swing at the source, rotated toward each target (moved toward it when out of reach); can miss; `thrown` swaps in a shoot with a return flight | the melee menu and its switch |
| `shoot` | from a place to a place, stretched; can miss; a return flight | the range menu |
| `mark` | a static picture at a place, sized to the token or as a radius; once or persistent; masked | on-token, secondary, source and target layers, shield halves |
| `fill` | a picture sized to a placed template's shape (circle, cone, line, rectangle), attached to it or left on the ground | templatefx; thunderwave's position-picked variant is an asset rule |
| `aura` | attached to a token, a radius, breathing and pulsing | the aura menu |
| `beam` | attached at both ends, persistent | dual attach |
| `move` | the token itself: fade, travel, arrive; the destination picked by click or read from the token's own movement | the teleport preset's second half |
| `sound` | a sound section | every sound block |
| `custom` | the escape hatch: a list of Sequencer calls as data, validated against a whitelist, read in the sentence as "a custom effect"; rare by design, so the vocabulary never grows one special case at a time | nothing in the corpus |

The presets AA had are compositions in data, not code: teleport is *mark at source, shoot to the
destination, mark at the destination, move*; the Fireball shape is *shoot to the template (wait),
mark at the template, mark persistent*. The engine never learns the word "preset".

`engine/places.js` resolves a place word to canvas objects and points (the source token, each
target, the Region, the destination, the impact spot). `engine/assets.js` resolves `{family,
colour}` to a path against the libraries' registration, lists a family's colours and variants
(the screens' colour picker, the assistant's catalogue), and answers "does this exist" — the same
code `check-looks` runs offline. `engine/render.js` builds one Sequence from a look's scenes,
decides who plays (the author, else the first active GM; the creator for templates and effects —
DESIGN §6, unchanged), stamps origins for persistence and dedupe, and writes the ledger.

## 6. Migration — AA's corpus in, AA's practices out

One tool, run once more, then history: `tools/migrate-aa.mjs`.

### 6.1 Rows to looks

Every AA row becomes a look whose subject keys come from AA's own descriptor (its `weapon`,
`spell`, `creature` types and its effect section say the kind) plus the migration's expansion of
family rows against the closed lists (§3); `on` is `use` for every menu and `effect` for AA's
effect rows; layers become scenes in AA's own order (source, sound, primary, secondary, target)
with AA's values mapped onto the knobs. The mapping is a table in the tool, one line per AA
option, and the docs carry it so a reader can see where every value went.

### 6.2 Zero loss, proved at the render

Phase 1's ported presets become the **oracle**: moved to `tools/lib/oracle/`, they still build AA's
Sequence for any row and moment. The proof records, for every row against a canonical moment of
its kind, the exact Sequencer calls the oracle makes and the exact calls the new engine makes from
the migrated look, and compares them call for call. Exit: every row equal, with the deliberate
differences listed by name (the reach fix, the mask fix, a miss playing as a miss). This is a
stronger proof than phase 0's (same files and options) because it compares what Sequencer is
told, and it is what lets the ported presets be deleted from `scripts/` with a clear conscience.

### 6.3 The private asset table, retired by measurement

AA played JB2A's files through its own Sequencer table with its own stretch metadata, and 1182
layers differ from JB2A's own entries in that metadata; phase 0 froze AA's subset as
`fxstudio.aa.*` so the pictures would not change. Sequencer 4.2.3 lets a single effect override
that metadata (`template()`), so the migration can point every migrated asset at JB2A's native
path and carry AA's metadata as a per-scene `template` value only where the shape actually uses it
(a stretch; not a swing sized in grid squares). The oracle proof decides layer by layer; what it
cannot reproduce natively stays in `recipes/aa-assets.json`. The measurement is the count left in
that file; the goal is zero, and the house corpus never needs it.

## 7. Authoring — one grammar, three doors, one validator

This is the part the user called the most important: **a newer, better way for end users and
assistants to create looks.** The design makes them the same activity.

**One grammar.** A look is the sentence (§4). A person composes it from pickers; an assistant
writes it as data; both produce the same object, checked by the same validator, saved to the same
buffer, exported to the same file, and read back as the same sentence. There is nothing an
assistant can write that a screen cannot show, and nothing a screen can build that an assistant
cannot read.

**Three doors.**

1. **The screens** (phase 3, built 2026-09-06 as ruled on the prototype; DESIGN §8): *Look up* shows a subject's sentence and why;
   *Change the look* starts from a starter or an existing look, offers the family's colours and
   the sound, previews, and saves to the world buffer; *Custom looks* lists the house first;
   *Check* shows what plays nothing, per sheet and per compendium, and what does not resolve.
2. **The API**, in the game, for anything that can run script — a macro, a bridge, an assistant
   at the table: `api.looks.validate(look)` returns problems in sentences; `api.looks.sentence(look)`
   the sentence; `api.looks.save(look)` writes the buffer with provenance; `api.preview(look,
   {source, targets})` plays it once on the chosen tokens without saving; `api.census()` the
   "nothing plays yet" list as data. The screens are built on this API, so it is always complete.
3. **The files and tools**, offline, for an assistant working from the repo: `recipes/SCHEMA.md`
   is the grammar with every default; `tools/assets.mjs "misty step"` searches the libraries'
   own registration (families, variants, colours, sizes, sounds) so a path is looked up, never
   guessed; `tools/check-fx.mjs` validates a look file the way the API does; `tools/census.mjs`
   lists what has no look, per sheet and compendium, as text or data; `tools/preview.mjs <look>`
   plays a look on the sandbox fixture so the result can be seen (and captured) before it is
   proposed. An assistant's round trip is: census → pick a subject → pick a starter → find the
   asset → write the look → validate → preview → propose.

**Starters.** `recipes/starters.json` holds one abstract look per shape and per common intent — a
bolt to the target, a swing, a mark on the target, a mark on yourself, a burst on an area, a fill
of an area, an aura, a beam, a teleport — with sensible sizes and timings. Every new look is a
starter or an existing look COPIED, then given a subject, an asset and a colour. A stencil, not a
reference: what is stamped out belongs to the new look and nothing can reach back into it.

**No shortcuts (ruled 2026-09-07).** No look points at another one, and none inherits. "Sharran
Step is Misty Step in black" means the whole of Misty Step written out again with the colour
changed. The grammar had `like` and `with` for this and they are gone: a pointer can leave an
orphan, and one look silently changing what a different look plays is not something a person can
see on the screen in front of them. The cost is accepted — a variant is longer to write, and
improving what it was copied from does not improve it.

**Provenance and review.** Every look records `by` (a user's name, an assistant's name, or the
migration), `at`, and a `note` in a sentence. The Custom looks screen shows the newest first with
who wrote them; the export tool folds the buffer into `house.json` so git holds the history. An
assistant's looks are proposals in the buffer until the user keeps them by exporting; nothing an
assistant writes reaches `house.json` without a person running the export. No guessing at the
table: an assistant proposing fifty looks for the fifty PHB spells with none is fine, and the user
reads fifty sentences and keeps the ones that read right.

## 8. Tools and checks

| Tool | Kind | What it proves |
| --- | --- | --- |
| `migrate-aa.mjs` | one-time | AA's corpus into looks, the family expansions, the oracle proof (§6.2), the asset nativisation count (§6.3), the census, the report |
| `check-fx.mjs` | offline, seconds | every look validates; every asset resolves against the libraries' registration and the disk |
| `check-imports.mjs`, `check-layers.mjs` | offline | every module loads; every import points down the layer order |
| `check-gates.mjs` | offline, a second | the gate contract (§2): not held, held, held-and-came-to-nothing, a gate that throws, a bound that expires plays, asked once; and the Battle Flow gate with Battle Flow absent, disabled, old and current |
| `census.mjs` | offline or live | every subject in the world and the compendia → which look answers, what plays nothing |
| `assets.mjs` | offline | the catalogue search |
| `smoke-fx.mjs` | live | every look builds on the sandbox against a synthetic moment and every path resolves live |
| `smoke-replay.mjs` | live | one look of every shape and moment through real dnd5e flows; §15 drives a real hold at the table |
| `smoke-author.mjs` | live | the assistant's round trip: a look written as data, validated, previewed, saved, read back as a sentence, exported |
| `preview.mjs` | live | plays a look on the fixture for a person or an assistant to see |
| `check-legacy.mjs` | offline | no Automated Animations vocabulary in `scripts/` or `recipes/` (§0's mechanical half) |
| `export-fx.mjs` | offline | the world buffer as sentences with who wrote them; `--write` folds it into `house.json` |

All of these exist as of phase 2 (2026-09-06); tools/README.md is the reference.

## 9. What changes for the user, and what does not

- Every picture that plays today keeps playing, proved at the render, minus the two accidents
  the user already saw (a maul that did nothing, a spell that bashed).
- The sentence screens arrive on a shape that *is* the sentence, so they are thinner and the
  prototype's wording holds.
- Adding a look for a spell, a weapon, a feature, an effect, a condition, a Battle Flow moment or
  a table event is the same act with the same grammar, whoever does it.
- The module's own vocabulary is small enough to hold in one head: eight shapes, a dozen moment
  kinds, nine subject kinds, twenty knobs. None of AA's words survive in `scripts/`; a check greps
  for them.

## 10. Decisions — ruled 2026-09-06 ("those are fine")

1. **Identity keys replace name matching** (§3): weapons by base weapon after their own name,
   spells and features by dnd5e's identifier, effects by name then origin. The family rows are
   expanded once at migration and listed.
2. **The look grammar** (§4) is the corpus's shape from here, and the sentence is generated from
   it, never parsed.
3. **Eight shapes** (§5); AA's presets become compositions in data; the ported presets are
   retired to the oracle after the proof.
4. **The private asset table is retired by measurement** (§6.3); what cannot be nativised stays
   frozen and counted.
5. **The authoring model** (§7): one grammar, the screens, the API and the files as three doors,
   starters, provenance, and export as the only way into `house.json`.
6. **The stock splits per kind** (§4.3) for readability.
7. **Teleport picks its destination by click** as migrated, with "from the token's own movement"
   as the user's switch per look.

The costs the user accepted with them, in plain words: about three days before the screens; a
long list of small questions while AA's thirty settings per look are translated and checked; AA's
private copy of the video list may not fully go away (counted, not promised); nothing plays by
luck any more, so the "nothing plays yet" list starts a little longer; a new weapon type or
creature name later needs a look added on purpose; a small new vocabulary; a few more tools to
keep alive.

The plan's phases from here are in PLAN §6. Phase 2 builds this; the user's "continue" in the
next context is the go.
