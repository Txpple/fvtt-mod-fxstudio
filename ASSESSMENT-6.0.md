# dnd5e 6.0 — the assessment (2026-09-15)

The user (2026-09-15): *"dnd5e ruleset has been updated to 6.0 and changed a lot. pls look up and get
up to speed, review what we need to do to make this compat with 6.0. no need for backward compat to
5.x."* This is that review, and the notes that followed it. **Nothing here is started.** The port
begins on the user's go; phase 4's words begin on the user's word after it.

Read against: the dnd5e 6.0.1 source installed on the sandbox (the compiled bundle's source map
carries every module), the sandbox world's own database (72 messages, 24 actor effects, 33 regions
left by Battle Flow's suites on 2026-09-16, read offline), the 6.0.0 and 6.0.1 release notes, and
Battle Flow's `ASSESSMENT.md`, which ported the same platform first (phase 1 committed at its
`338cff3`, phase 2 in flight).

## 1. Where the two boxes stand

| | Foundry | dnd5e | Battle Flow | note |
| --- | --- | --- | --- | --- |
| **prod** (Molten) | 14.364 | **5.3.3** | | 6.0 needs core 14.367 or later |
| **sandbox** | 14.367 | **6.0.1** | 1.42.0, pinned dnd5e 6.0.0 – 6.9.99 | the world is migrated already |

**The upgrade of prod is not ours to make**, and until it is made neither Battle Flow nor a 6.0-only
FX Studio can ship there. The 6.0 world migration walks every chat message and DELETES the
`flags.dnd5e.*` this module reads today; historical cards are retyped, not left alone. Foundry
also **silently refuses to enable** a module whose declared system maximum is exceeded (the setting
write is accepted and dropped; Battle Flow paid for that finding) — so the pin is the first commit,
or nothing else is observable.

## 2. What survives 6.0 untouched (measured, not assumed)

- `system.identifier` on every item type, and `item.identifier` slugifying the name when unset, with
  the same `formatIdentifier` — **the one-key model stands as is** (DESIGN §23).
- No item type renamed; `system.type.value === 'natural'` still marks a natural weapon;
  `system.properties` still a Set with `rch`; a cast activity's `spell.uuid` still the linked spell;
  `system.activities` still the collection the census, Coverage and the api read.
- The system's 23 compendium packs: same names, same `flags.dnd5e.sourceBook` ("SRD 5.1" / "SRD 5.2").
  **`LIST_PACKS` and `CREATURE_PACKS` need no change.** The five books on the sandbox (PHB 2.2.0,
  MM 1.4.0, DMG 2.0.0, Ravenloft 1.0.1, Heroes of Faerûn 1.1.0) declare a dnd5e minimum only.
- `ItemSheet5e` is still the class, ApplicationV2, and `getHeaderControlsItemSheet5e` still fires —
  the item-sheet button stands.
- `ChatMessage.getSpeakerActor`, `actor.getActiveTokens`, `actor.isToken`, `actor.token` — core,
  unchanged. The core document hooks the reader listens to (`createChatMessage`, `createRegion`,
  `createActiveEffect`, `updateActiveEffect`) — unchanged.
- The gates key a hold by the moment's `activity` and `id`, never by flags — the hold contract with
  Battle Flow (ARCHITECTURE §2, `check-gates`) is untouched. Battle Flow's `battleflow.moment` payload
  is unchanged.
- Sequencer 4.2.3 (core max 14), JB2A 0.9.3, PSFX 0.17.0 — all fine on 14.367.

So: the corpus, the keys, the records, the migration tools, the Library, the Editor, Coverage and the
item-sheet button are not in the port. **Everything that breaks is in `scripts/readers/dnd5e.js`,**
and in the stand-ins and suites that imitate it.

## 3. What changed under the reader

Ground truth from the sandbox's database (an attack card, 2026-09-15 17:54 UTC):

```
type: "attack"
system.activity: { id, img, name, type: "attack", uuid: "Actor.….Item.….Activity.…" }
system.item:     { id, img, name, type: "weapon", uuid: "Actor.….Item.…", compendiumSource }
system.targets:  [{ actor: "Scene.….Token.….Actor.…", token: "Scene.….Token.…", ac: 10, img, name }]
system.origin:   "eRZ0W8QZ6Xa7Vgs4"        ← the usage card's id (a ForeignDocumentField)
system.ability / mastery / mode / ammunition (an item ID) / deltas
rolls[0].options.rollType: "attack", .target: 10
flags: { core: { canPopout } }              ← nothing of dnd5e's
```

| 5.3.3 (what the reader reads) | 6.0.1 (what is there) |
| --- | --- |
| `flags.dnd5e.activity.uuid`, `.item.uuid` | `system.activity.uuid`, `system.item.uuid` (source references: id, name, type, img, uuid) |
| `flags.dnd5e.roll.type` attack / damage / healing; `message.type === 'usage'` | **`message.type`**: `attack`, `damage`, `healing`, `usage`, `save`, `check`, `prompt`, `rest`, `turn`, `recharge`, `hitDie`, `hitPoints`, `timePassed`, `item`, `request`, `generic`, `bastion*`. A heal is its own type; `system.isHealing` says so |
| `flags.dnd5e.targets[{uuid (the ACTOR), ac}]` | `system.targets[{actor, token, ac, img, name}]` — **token-precise**; `ac` null under total cover |
| the reader's own verdict `!(!crit && (total < ac \|\| fumble))` | **`system.evaluatedTargets[].isMiss`** — the same formula plus `ac === null` → miss; hit/miss is computed at render, never persisted |
| `flags.dnd5e.roll.ammunition` (item id) | `system.ammunition` (item id), `system.ammunitionItem` (getter; resolves a consumed item from `system.deltas.deleted`) |
| `flags.dnd5e.originatingMessage` | `system.origin` (a document link to the usage card); the messages registry indexes it |
| a Region with `flags.dnd5e.origin` = the **activity** uuid | a Region with **`flags.dnd5e.activity`** (the activity), **`flags.dnd5e.item`**, **`flags.dnd5e.origin` = the usage TOKEN's uuid**, `spellLevel`, `dimensions`; `flags.core.MeasuredTemplate: true`. No MeasuredTemplate document exists on the live path; `create.measuredTemplate` is still the use option's name; the `dnd5e.*ActivityTemplate` hooks fire only in the deprecated path |
| `effect.origin` = the item's uuid | `system.origin: { actor, item, activity, effect, behavior, message, profile }`; `origin` derived at prepare as effect ?? behavior ?? activity ?? item ?? actor (why an applied effect's `origin` is an ACTIVITY uuid — the throw fixed at `c331c2e`). A rider applied through a concentration effect names only `origin.effect`; a region-applied effect names `origin.behavior`. Effects are typed `base` / `condition` / `enchantment` |
| `CONFIG.DND5E.areaTargetTypes` circle cone cube cylinder line radius sphere square | + **`ring`**, **`wall`**; `radius` now maps to an emanation. `activity.target.template.type` unchanged (+ `contiguous`, `stationary`) |

**What the reader would do on 6.0 as written:** every card returns null (no flags) — nothing plays
from chat; every area spell resolves the region's `origin` as an activity, finds a token, and skips
("the template names no item"); effects play (fixed 2026-09-15). The timing policy itself
(ARCHITECTURE §2) does not change: attack on the attack card, save and heal on the damage or healing
card, area on the Region, everything else on the usage card, a held moment when the hold lifts.

The hooks, for the record: `dnd5e.postUseActivity(activity, usageConfig, results)` with
`results.message` and `results.templates` (RegionDocument[]); `dnd5e.rollAttackV2` /
`dnd5e.postRollAttack(rolls, {subject})` (the card exists by then, verdict on it);
`dnd5e.rollDamageV2` — **there is no `dnd5e.postRollDamage`**; saves fire `dnd5e.rollSavingThrow`
per target; templates `dnd5e.preCreateMeasuredTemplate` / `createMeasuredTemplate` /
`postCreateMeasuredTemplate`; `dnd5e.postTeleport`, `dnd5e.postSummon`, `dnd5e.transformActorV2`,
`dnd5e.applyDamage` / `damageActor` / `healActor`, `dnd5e.calculateDamage`. The reader stays on the
core document hooks; these are for phase 4 to choose from.

## 4. The port — one file, in order, one commit each

1. **The pin.** `module.json` dnd5e minimum `6.0.0`, verified `6.0.1`, maximum `6.9.99` (Battle
   Flow's; the user raised its maximum from 6.0.99 on 2026-09-15). First, because of §1.
2. **The message reader** onto `type` and `system.*`: kind from the type (attack / damage / healing /
   usage), activity and item from the source references, **the token from the descriptor**, the
   verdict from `evaluatedTargets` (see ruling A), ammunition by id. The 5.3.3 flag reads go entirely;
   dnd5e's own `getFlag` fallbacks are courtesy, never contract (Battle Flow's posture, adopted).
3. **The region reader** onto the three region flags: `activity` for the activity, `item` for the
   item, **`origin` (the usage token) as the source** — today guessed from the actor's tokens.
4. **The effect origin walk** grows two lines — a parent effect (`origin.effect` → its item) and a
   region behaviour (`origin.behavior` → its region's `activity` flag) — and drops the bare-`origin`
   fallback, which 6.0 derives from the same data.
5. **The stand-in world and its check.** `tools/lib/world.mjs` builds the 5.3.3 flag shape for
   messages and templates, so `check-reader` proves nothing about 6.0 today. Both move to the 6.0
   shapes, **built from the real cards read off the sandbox (§3), outcome fields included**, so
   phase 4's checks stand on the same stand-in; check-reader's cases are rewritten in the same commit.
6. **The live suites.** `smoke-replay.mjs` finds attack and damage cards by `flags.dnd5e.roll.type`
   and fakes a usage card with flags (its §-`usage` helper); both move to types. `a.use({create:
   {measuredTemplate:false}})` is still the option. `smoke-screens` (Own key writes
   `system.identifier`) is unaffected.
7. **Docs.** The reader's header, ARCHITECTURE §2's table and the effect row, CLAUDE.md's pin and
   status lines, tools/README, the handoff.

Corpus and every screen untouched; nothing plays differently on a hit, a save or a template than
it does on 5.3.3 today.

## 5. Shape the port with phase 4 in view (the user, 2026-09-15: *"these are all additive, or do we need to factor that in our fixes?"*)

Almost all of §6 is additive. Four choices INSIDE the port decide whether phase 4 is a moment word
each or a second reader rewrite — the grammar ruling (DESIGN §22: *additive `on` words for phase 4,
nothing structural*) is what they protect:

- **A moment carries the card, not a selection from it.** Today `moment.flags` carries the document's
  flags for the gates. On 6.0 the moment carries **`type` and the whole `system` data** of the message
  (or region, or effect). Save outcomes, deltas, attack mode, mastery, spell level are then on the
  moment when a word wants them.
- **The target record stays whole.** dnd5e's evaluated target — token uuid, actor uuid, AC, name, the
  miss verdict — is the per-target record, not a token and a boolean. A save outcome per target slots
  into the same record.
- **A moment knows its use.** Every roll card links its usage card (`system.origin`). The usage card's
  id rides on the moment beside `activity` and the ticket `id`, so one cast owning one picture
  sequence — the strike, the burn on the failed save, the standing template, one end for all of it —
  needs no new plumbing later.
- **The effect origin walk is complete** (§4 step 4), so region-applied effects play automatically.

Two things are NOT additive and are decided in the port:

- **Ring and wall areas.** The reader's area check reads `areaTargetTypes` at runtime, so those
  spells route to the template path, and the engine has no place shape for either. The port makes an
  unknown region shape a **logged skip, never a throw**; adding the two shapes is a grammar commit of
  its own (engine line, KNOBS, check-engine, in one — DESIGN §22). Ruling B.
- **The stand-in is built from the real 6.0 cards, outcome fields included** (§4 step 5), or it is
  rebuilt again for phase 4.

Everything else in §6 touches the reader's table and the grammar's words and nothing underneath.

## 6. What 6.0 stores that was HTML or guesswork before (the user: *"is there any new data in 5e 6.0 that creates new opportunities?"*)

Noted, none of it owed; phase 4 picks from it on the user's word. Grouped by how directly it serves
a module that only plays pictures and sounds and never guesses.

**Outcomes, now stored instead of inferred**
- **Save results per target.** A `save` card carries the ability, `outcome`, and `resisted`
  (legendary resistance spent); the usage card's `outcomes` aggregates every chained roll. "On a failed
  save / on a successful save" with no arithmetic of ours; a resisted save is a moment nothing could see.
- **Damage as it lands.** Usage, attack and save cards carry HP `deltas` per actor; `dnd5e.calculateDamage`
  exposes per-type totals after resistances and immunities. A picture keyed to the damage type taken,
  to a hit fully resisted, or to the bloodied threshold is data-driven — the outcome layers AA never had.
- **Attack mode and mastery.** `system.mode` (thrown, twoHanded, offhand, ranged) and `system.mastery`
  (graze, cleave, vex …). A dagger thrown is a projectile and a dagger stabbed is a strike; today they
  play the same thing. Cleave and Graze are moments in their own right.
- **Concentration and death saves** are `save` cards with `system.type`; broken or kept, made or
  failed, are readable moments.
- **Spell level and scaling** on the usage card (`system.level`, `system.scaling`): upcast intensity
  as a plain knob.

**Places and standing pictures**
- **Activity regions carry item, activity, token, spell level and dimensions** — a template picture
  sized from data, knowing its caster's token.
- **Region behaviours and native token events.** dnd5e attaches "apply active effect" and "difficult
  terrain" behaviours to areas; an effect applied that way names the behaviour in its origin. Entering a
  Wall of Fire or leaving a Spirit Guardians radius is an effect moment for free; Foundry's region
  enter/exit events are there if a picture should react to movement into an area.
- **Emanations attach to tokens** — an aura region moves with its token; a standing aura picture tied
  to the region follows.
- **Ring and wall** — two new shapes the engine lacks (§5).
- **Effects end themselves.** Expiry events (start/end of a turn, a rest) live on the effect; the
  active GM deletes expired effects even outside combat. Standing effect pictures end on a real delete.

**New moments dnd5e now emits as data**
- **Teleport and transform are activity types** with post-hooks carrying the token and the landing:
  Misty Step at the actual destination, a wild shape on the change of form.
- **Summoning** stamps the activity on the summoned token's effects and fires `dnd5e.postSummon`.
- **Turn, rest, recharge, time-passed cards** are typed messages. Whether a turn-start picture is this
  module's or Battle Flow's is a ruling to make (ruling D); the data is there.
- **The origin chain is a document link** — attack, damage and saves are one cast in data.

**Data that touches standing rulings** (noted as fact, not proposed)
- **Actors have identifiers** (6.0 #7390). Could key an FX to one creature rather than one item; sits
  beside the one-key-per-item ruling (DESIGN §23), not inside it. The user's call. Ruling C.
- **Conditions are typed effects with their statuses.** The Statuses kind was retired on the user's
  word (2026-09-12). The data would make a status layer cheap if that ruling is ever revisited.
- **The activity's name and icon ride on every card.** One item, many activities, one key is the
  design; unused by ruling.

**Shortlist by table value per effort:** the save outcome layer, thrown versus melee on attacks,
damage-type-on-landing — three stored fields on cards the reader will already be parsing after the
port; a moment word each, no new plumbing.

## 7. Rulings asked of the user (2026-09-15) — A, B and C RULED the same day

**Given (2026-09-15):** A — adopt dnd5e's verdict. B — **add both shapes in the port** (ring, and wall as the
line dnd5e places; an emanation came with them, since `radius` maps to one now). C — re-cut the
moment. And the go: *"yes start, but theres another agent in sandbox, so you cant go in there til you
have notice."* Built offline the same day: the pin (`1103efc`), the reader and the moment (`64b83b0`),
the engine's shapes (`fd57e76`), the suites and these docs; seven offline checks green. **Run live on 2026-09-18** on the user's word: deployed `--local`, restarted, the four suites green (fx 1019,
replay 58/58, author 20/20, screens 199/199) after four suite-side fixes (a faked card's activity id, `ac.override`,
a dropdown entry's `label`, a book that holds abilities). The user's testing is next; the release on their word. Open: C (actor identifiers)
and D (turn cards) below, for phase 4. The 108 `check-fx` failures noted on the way were D&D5e Animations'
files; the user ruled them roadkill on 2026-09-16 and Stock was cut clean (1021 → 1014; the seven FX that
were only such a picture are gone, Wall of Ice and Wall of Stone among them — the `wall` shape's first
customers when someone authors them).


- **A — the verdict.** Adopt dnd5e's `evaluatedTargets` as the hit/miss (a target whose AC cannot be
  read, under total cover, is a MISS — the platform's own rule, Battle Flow's ruling 4), or keep the
  reader's own formula (an unreadable AC plays as a hit today).
- **B — ring and wall.** Add the two place shapes to the grammar inside the port (engine + KNOBS +
  check-engine, one commit), or skip them with a log and add them later.
- **C — actor identifiers** as a key: parked (BACKLOG), or in phase 4's scope.
- **D — turn-start and rest cards:** this module's pictures, Battle Flow's, or nobody's — later,
  with phase 4.

Not a ruling, an assumption stated: the pin is 6.0.0 – 6.9.99 like Battle Flow's; 5.x support is
dropped outright (the user, 2026-09-15); the go for the port itself is the user's, as every phase's is.

## 8. Refactor the data models to 6.0? (the user, 2026-09-15: *"fx-studio is still in early development, so now is the time to refactor anything 6.0 in terms of fx studio's data models? we can change them to conform and take advantage"*)

Three models, three different answers.

- **The FX file (recipes: id, `for` key, scenes, the nine shapes and their knobs) — NO change.** It
  describes pictures and sounds and is keyed by dnd5e's identifier, which 6.0 kept. Nothing on a 6.0
  card speaks to a strike's size or a beam's persistence. Re-cutting it would be a big diff for no
  behaviour change, which is not clean-up here.
- **The moment (`core/moments.js`, the reader's output, internal, no file holds one) — YES, re-cut it
  in the port, completely.** It is the seam 6.0 actually changed, nothing persisted depends on it, and
  this is the last cheap moment to do it: a moment carries the card's `type` and whole `system` data
  (the `flags` field goes), its targets are dnd5e's evaluated target records whole, it names its usage
  card beside its activity and ticket (§5). Same shape from the region and effect readers, with their
  documents' data in the same seat.
- **The grammar's words as they grow — conform to dnd5e's stored vocabulary, do not invent.** This is
  ARCHITECTURE's own tenet (*the vocabulary dnd5e already keeps*), and 6.0 stores far more of it: a
  phase 4 word for an outcome uses dnd5e's outcome values, an attack mode is `thrown` / `twoHanded` /
  `offhand` / `ranged` as the card spells it, a mastery is `cleave` / `graze` / `vex`, a damage type is
  dnd5e's, an expiry is dnd5e's expiry event, an area shape is `ring` / `wall` / `emanation` from
  `areaTargetTypes`. The knobs that are the picture's own — `onMiss`, `persist`, `mirror` — stay ours.
  No existing word needs renaming for this; it binds the words that do not exist yet.
