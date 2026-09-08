# Migration report — Automated Animations → FX Studio fx

Run 2026-09-08 from phase 1's lossless rows (Automated Animations 7.0.22, D&D5e Animations 3.3.0) against JB2A 0.9.3, PSFX 0.17.0, Sequencer 4.2.3, dnd5e null. Regenerate with `node tools/migrate-aa.mjs --write`.

## Numbers

| Measure | Count |
| --- | --- |
| Rows in (stock / house) | 1289 / 7 |
| Fx out (stock / house) | 1022 / 7 |
| · keyed by the closed lists (a spell, feature, item or weapon the books or the world hold) | 686 |
| · family rows expanded against the base weapons, the natural attacks and the world's weapons | 143 |
| · effect rows, keyed by the effect's name | 79 |
| · names no list holds — NOT carried, see the exceptions below | 388 |
| · weapon words that also caught a spell, a feat or an item under AA (listed, not carried) | 67 |
| AA paths | 437 |
| · now the libraries' own path with the same files and structure | 17 |
| · now a list of the libraries' own leaves | 317 |
| · now the libraries' own by-distance nodes (a variant at random, then the distance, as AA picked) | 65 |
| · now the raw files AA picked out of a larger set | 28 |
| · AA's stretch metadata carried on the scene (`template`) | 61 |
| **· still on the frozen table (the measurement; goal zero)** | **10** (loop markers differ 10, picked by distance 0, no such node 0) |
| Frozen table entries shipped | 15 |
| **Render-level proof: fx equal to AA's own sequence** | **1029 of 1029** (2802 of 2907 moments exactly, 105 by a named allowance below) |
| Abilities on the world's actors | 738 |
| · same answer as under AA | 701 |
| · a different fx now | 25 |
| · play now, played nothing under AA | 2 |
| · play nothing now, played under AA | 10 |
| Fx that can never answer (a same-key fx of the same layer comes first) | 1 |

## What the proof allows, by name

The proof compares what Sequencer is told, section by section, in a canonical form: the order of calls inside a section is ignored (they set properties); a call stating Sequencer's own default is dropped (opacity 1, delay 0, fade 0, rotate 0, zIndex 0, rate 1, one repeat, missed false, below-tokens false, anchor ½ ½); option keys that are false, zero or empty are dropped; a token is its centre for a location and its id for an attachment; names, origins and document ties are dropped (the engine stamps every picture with its origin and ties every picture of an effect to it, a superset of what AA stamped that changes no picture); a path is compared by what it plays — the files, the stretch template and the loop markers — not its spelling; thenDo sections by count.

Deliberate differences, each a choice of the model over AA's accident. Those the proof met are counted (moments):

- **6** × a bolt from inside a standing area, with none standing, leaves from the caster's centre (AA left from the token's top-left corner)
- **6** × a follow-up mark with nothing to land on plays no sound (AA played its sound anyway)
- **84** × an FX whose pictures need a target plays nothing, sound included, when nothing is targeted (AA played the sound alone)
- **4** × a mark that falls back to the caster honours the FX's delay (AA dropped it there)
- **5** × the same pictures start in a different order with no wait between them (a shield's bottom halves first, then its top halves)
- a swing and a bolt at several targets some in reach and some beyond: the engine plays all the swings, then all the flights, then the follow-up marks once over every target; AA interleaved them per group and played the follow-up sound per group (the proof's mixed-reach case is not in the canonical moments; the single-reach cases are)
- a follow-up mark that waits: the engine waits after the last target it plays on; AA waited after the last of all the moment's targets
- a picture on both the caster and the targets: the follow-up mark plays once over both with one sound; AA played it twice, once per group, with its sound each time
- a mark or an aura sized in token widths measures the token as its image is drawn (scale and ring included), everywhere; AA's teleport marks and swings used the bare footprint
- the hundred-millisecond pause before every animation (AA's "global delay" world setting) is gone; the reader's own half-second wait for a Region to be drawn stays
- the range ring of a move is shown to everyone and measured alternating; AA's switches for hiding it and measuring equidistant were used by no row

## Rows translated with a note (169)

- Axe [melee] → natural:mercurial-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:frost-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:pact-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:berserker-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:executioners-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Baton [melee] → natural:bejeweled-baton: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:beak: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:beaks: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:sharpened-beak: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:beak-raven-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beard [melee] → natural:beard: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:chaos-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:clockwork-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:heated-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:lightning-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:psi-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:storm-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:beheading-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:whirling-blades: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:dread-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:force-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:psychic-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:dragon-tooth-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:dread-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:pact-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:luck-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:sun-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bone Whip [melee] → natural:bone-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Chain [melee] → weapon:chain: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:banishing-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:chaos-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claws: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:devilish-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:elemental-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:fearsome-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:injecting-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:mutating-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:spectral-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:umbral-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claws-yugoloth-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:rotting-claw-putrid-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:rotting-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:eldritch-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → natural:stone-club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:tree-club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fist [melee] → natural:fist: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fist [melee] → natural:rotting-fist: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → natural:bone-flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:elemental-flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Foreleg [melee] → natural:foreleg: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fork [melee] → natural:searing-fork: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fork [melee] → weapon:infernal-fork: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gear [melee] → natural:gear: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:abyssal-glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:infernal-glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gore [melee] → natural:gore: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gore [melee] → natural:brutal-gore: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gore [melee] → natural:gore-boar-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gouge [melee] → natural:gouge: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Grave Strike [melee] → natural:grave-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Grave Strike [melee] → natural:grave-strike-vampire-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:greataxe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:greatclub: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:thunderous-greatclub: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Halberd [melee] → weapon:halberd: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Hook [melee] → natural:hook: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Hooves [melee] → natural:hooves: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Horn [melee] → natural:radiant-horn: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:aquatic-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:caustic-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:tentacle-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:vine-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → natural:radiant-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → natural:radiant-mace-defender-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:fiery-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:holy-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:thunderous-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → weapon:maul: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → natural:earthen-maul: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:warpick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:war-pick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pincer [melee] → natural:pincer: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pseudopod [melee] → natural:pseudopod: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pseudopod [melee] → natural:dissolving-pseudopod: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quarterstaff [melee] → weapon:quarterstaff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rake [melee] → natural:rake: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Ram [melee] → weapon:ram: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Ram [melee] → natural:ram: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:insectile-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Ravage [melee] → natural:ravage: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend-jackal-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend-bear-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend-dire-wolf-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:mind-rend: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scratch [melee] → natural:scratch: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scythe [melee] → natural:dread-scythe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → weapon:sickle: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → natural:ritual-sickle: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:avalanche-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:object-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:rotting-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:thunderous-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:slam-human-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slash [melee] → natural:slash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slash [melee] → natural:darkflame-slash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Snake Hair [melee] → natural:snake-hair: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Spike [melee] → natural:tail-spike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:bog-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:chaos-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:pincer-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:vine-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:wooden-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:forest-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:wind-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:enspelled-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stick [melee] → natural:hex-stick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sting [melee] → natural:sting: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sting [melee] → natural:infernal-sting: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stinger [melee] → natural:stinger: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stinger [melee] → natural:tail-stinger: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:unarmed-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:abyssal-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:beguiling-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:draconic-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:otherworldly-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:psi-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:shadow-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:beasts-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:fiery-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:fiery-strike-devil-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:death-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tail [melee] → natural:tail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Talon [melee] → natural:talons: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Talon [melee] → weapon:sylvan-talon: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tusk [melee] → natural:tusk: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tusk [melee] → natural:tusk-boar-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Warhammer [melee] → weapon:warhammer: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → natural:flame-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:mercurial-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade Barrier [ontoken] → spell:blade-barrier: mark: loop markers differ (AA null, JB2A {"loop":{"start":700,"end":3333}})
- Blade Ward [ontoken] → spell:blade-ward: mark: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Contact Other Plane [ontoken] → spell:contact-other-plane: source: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Enthrall [ontoken] → spell:enthrall: secondary: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Euphoria Breath [ontoken] → feature:euphoria-breath: mark: raw files cannot carry loop markers
- Find Traps [ontoken] → spell:find-traps: mark: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Glibness [ontoken] → spell:glibness: mark: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Grasping Vine [ontoken] → spell:grasping-vine: source: raw files cannot carry loop markers; mark: raw files cannot carry loop markers
- Hail of Thorns [ontoken] → spell:hail-of-thorns: mark: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Imprisonment [ontoken] → spell:imprisonment: secondary: loop markers differ (AA {"loop":{"start":2033,"end":7000},"forcedEnd":7933}, JB2A {"loop":{"start":2033,"end":7000}})
- Mind Blank [ontoken] → spell:mind-blank: source: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Steady Aim [ontoken] → feature:steady-aim: on both: AA played the secondary layer twice (once for the caster, once for the targets) with its sound each time; the scene plays once over both
- Suggestion [ontoken] → spell:suggestion: mark: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Telepathy [ontoken] → spell:telepathy: on both: AA played the secondary layer twice (once for the caster, once for the targets) with its sound each time; the scene plays once over both; secondary: loop markers differ (AA null, JB2A {"loop":{"start":1500,"end":6500}})
- Transport via Plants [ontoken] → spell:transport-via-plants: mark: raw files cannot carry loop markers
- Weight of Years [ontoken] → feature:weight-of-years: mark: loop markers differ (AA {"loop":{"start":2033,"end":7000},"forcedEnd":7933}, JB2A {"loop":{"start":2033,"end":7000}})
- house Goldthorn [melee]: thrown: the switch was on but named no flight; nothing is thrown (as under AA)

## The family rows, expanded (143)

Each of Automated Animations' weapon and creature-attack rows matched a word inside a name. Here each is expanded once, against the base weapons (dnd5e's list), the natural attacks of the installed creatures, and the world's own weapons, and the keys are written down. Read what each word would and would not have caught; a wanted catch that is missing is one house fx away.

- **Arcane Sword** [melee] → natural:arcane-sword
  - natural:arcane-sword (1 creatures)
  - natural:arcane-sword ← Arcane Sword (1 creatures (Helmed Horror))
- **Axe** [melee] → natural:mercurial-axe, weapon:frost-axe, weapon:pact-axe, weapon:berserker-axe, weapon:executioners-axe
  - natural:mercurial-axe ← Mercurial Axe (1 creatures (Nycaloth))
  - weapon:frost-axe ← Frost Axe (mm/features)
  - weapon:pact-axe ← Pact Axe (mm/features)
  - weapon:berserker-axe ← Berserker Axe (dmg/equipment)
  - weapon:executioners-axe ← Executioner's Axe (dmg/equipment)
- **Baton** [melee] → natural:bejeweled-baton
  - natural:bejeweled-baton ← Bejeweled Baton (2 creatures (Performer Legend))
- **Beak** [melee] → natural:beak, natural:beaks, natural:sharpened-beak, natural:beak-raven-or-hybrid-form-only
  - natural:beak (18 creatures)
  - natural:beak ← Beak (18 creatures (Axe Beak, Blood Hawk, Grell))
  - natural:beaks ← Beaks (2 creatures (Swarm of Ravens))
  - natural:sharpened-beak ← Sharpened Beak (1 creatures (Giant Axe Beak))
  - natural:beak-raven-or-hybrid-form-only ← Beak (Raven or Hybrid Form Only) (1 creatures (Wereraven))
- **Beard** [melee] → natural:beard
  - natural:beard (2 creatures)
  - natural:beard ← Beard (2 creatures (Bearded Devil))
- **Blade** [melee] → natural:chaos-blade, natural:clockwork-blade, natural:heated-blade, natural:lightning-blade, natural:psi-blade, natural:storm-blade, natural:beheading-blade, natural:whirling-blades, natural:dread-blade, natural:force-blade, weapon:psychic-blade, weapon:dragon-tooth-blade, weapon:dread-blade, weapon:pact-blade, weapon:shadow-blade, weapon:luck-blade, weapon:sun-blade
  - natural:chaos-blade ← Chaos Blade (1 creatures (Death Slaad))
  - natural:clockwork-blade ← Clockwork Blade (1 creatures (Modron Duodrone))
  - natural:heated-blade ← Heated Blade (2 creatures (Efreeti))
  - natural:lightning-blade ← Lightning Blade (2 creatures (Balor))
  - natural:psi-blade ← Psi Blade (1 creatures (Githyanki Warrior))
  - natural:storm-blade ← Storm Blade (2 creatures (Djinni))
  - natural:beheading-blade ← Beheading Blade (1 creatures (Dullahan))
  - natural:whirling-blades ← Whirling Blades (1 creatures (Gallows Speaker))
  - natural:dread-blade ← Dread Blade (1 creatures (Ramya Vasavadan))
  - natural:force-blade ← Force Blade (1 creatures (Inquisitor of the Tome))
  - weapon:psychic-blade ← Psychic Blade (phb/classes)
  - weapon:dragon-tooth-blade ← Dragon-Tooth Blade (mm/features)
  - weapon:dread-blade ← Dread Blade (mm/features)
  - weapon:pact-blade ← Pact Blade (mm/features)
  - weapon:shadow-blade ← Shadow Blade (mm/features)
  - weapon:luck-blade ← Luck Blade (dmg/equipment)
  - weapon:sun-blade ← Sun Blade (dmg/equipment)
- **Bone Whip** [melee] → natural:bone-whip
  - natural:bone-whip (2 creatures)
  - natural:bone-whip ← Bone Whip (2 creatures (Gnoll Pack Lord, Kuo-toa Monitor))
- **Chain** [melee] → weapon:chain
  - weapon:chain (mm/features)
  - weapon:chain ← Chain (mm/features)
- **Claw** [melee] → natural:claw, natural:banishing-claw, natural:chaos-claw, natural:claws, natural:devilish-claw, natural:elemental-claw, natural:fearsome-claw, natural:injecting-claw, natural:mutating-claw, natural:spectral-claw, natural:umbral-claw, natural:claws-yugoloth-only, natural:rotting-claw-putrid-only, natural:rotting-claw, natural:eldritch-claw
  - natural:claw (80 creatures)
  - natural:banishing-claw ← Banishing Claw (2 creatures (Arcanaloth))
  - natural:chaos-claw ← Chaos Claw (1 creatures (Gray Slaad))
  - natural:claw ← Claw (80 creatures (Abominable Yeti, Bone Devil, Brown Bear))
  - natural:claws ← Claws (6 creatures (Allosaurus, Barbed Devil, Mezzoloth))
  - natural:devilish-claw ← Devilish Claw (2 creatures (Pit Fiend))
  - natural:elemental-claw ← Elemental Claw (2 creatures (Elemental Cultist))
  - natural:fearsome-claw ← Fearsome Claw (1 creatures (Scarecrow))
  - natural:injecting-claw ← Injecting Claw (1 creatures (Red Slaad))
  - natural:mutating-claw ← Mutating Claw (1 creatures (Blue Slaad))
  - natural:spectral-claw ← Spectral Claw (1 creatures (Arch-hag))
  - natural:umbral-claw ← Umbral Claw (1 creatures (Shadow Demon))
  - natural:claws-yugoloth-only ← Claws (Yugoloth Only) (1 creatures (Fiendish Spirit))
  - natural:rotting-claw-putrid-only ← Rotting Claw (Putrid Only) (1 creatures (Undead Spirit))
  - natural:rotting-claw ← Rotting Claw (1 creatures (Putrid Spirit))
  - natural:eldritch-claw ← Eldritch Claw (1 creatures (Cthulhu))
- **Club** [melee] → weapon:club, natural:stone-club, weapon:tree-club
  - weapon:club (the base weapons)
  - weapon:club ← Club (the base weapons)
  - natural:stone-club ← Stone Club (2 creatures (Stone Giant))
  - weapon:tree-club ← Tree Club (mm/features)
- **Dagger** [melee] → weapon:dagger, weapon:umbral-dagger
  - weapon:dagger (the base weapons)
  - weapon:dagger ← Dagger (the base weapons)
  - weapon:umbral-dagger ← Umbral Dagger (mm/features)
- **Fist** [melee] → natural:fist, natural:rotting-fist
  - natural:fist (7 creatures)
  - natural:fist ← Fist (7 creatures (Ape, Giant Ape, Shield Guardian))
  - natural:rotting-fist ← Rotting Fist (5 creatures (Mummy, Mummy Lord))
- **Flail** [melee] → weapon:flail, natural:bone-flail, weapon:elemental-flail
  - weapon:flail (the base weapons)
  - weapon:flail ← Flail (the base weapons)
  - natural:bone-flail ← Bone Flail (1 creatures (Gnoll Fang of Yeenoghu))
  - weapon:elemental-flail ← Elemental Flail (mm/features)
- **Foreleg** [melee] → natural:foreleg
  - natural:foreleg (2 creatures)
  - natural:foreleg ← Foreleg (2 creatures (Drider))
- **Fork** [melee] → natural:searing-fork, weapon:infernal-fork
  - natural:searing-fork ← Searing Fork (2 creatures (Horned Devil))
  - weapon:infernal-fork ← Infernal Fork (mm/features)
- **Gear** [melee] → natural:gear
  - natural:gear (1 creatures)
  - natural:gear ← Gear (1 creatures (Modron Monodrone))
- **Glaive** [melee] → weapon:glaive, weapon:abyssal-glaive, weapon:infernal-glaive
  - weapon:glaive (the base weapons)
  - weapon:glaive ← Glaive (the base weapons)
  - weapon:abyssal-glaive ← Abyssal Glaive (mm/features)
  - weapon:infernal-glaive ← Infernal Glaive (mm/features)
- **Gore** [melee] → natural:gore, natural:brutal-gore, natural:gore-boar-or-hybrid-form-only
  - natural:gore (20 creatures)
  - natural:brutal-gore ← Brutal Gore (1 creatures (Goristro))
  - natural:gore ← Gore (20 creatures (Boar, Brazen Gorgon, Elephant))
  - natural:gore-boar-or-hybrid-form-only ← Gore  (Boar or Hybrid Form Only) (2 creatures (Wereboar))
- **Gouge** [melee] → natural:gouge
  - natural:gouge (2 creatures)
  - natural:gouge ← Gouge (2 creatures (Giant Vulture))
- **Grave Strike** [melee] → natural:grave-strike, natural:grave-strike-vampire-form-only
  - natural:grave-strike (2 creatures)
  - natural:grave-strike ← Grave Strike (2 creatures (Vampire Umbral Lord))
  - natural:grave-strike-vampire-form-only ← Grave Strike (Vampire Form Only) (2 creatures (Vampire))
- **Greataxe** [melee] → weapon:greataxe
  - weapon:greataxe (the base weapons)
  - weapon:greataxe ← Greataxe (the base weapons)
- **Greatclub** [melee] → weapon:greatclub, weapon:thunderous-greatclub
  - weapon:greatclub (the base weapons)
  - weapon:greatclub ← Greatclub (the base weapons)
  - weapon:thunderous-greatclub ← Thunderous Greatclub (dmg/equipment)
- **Greatsword** [melee] → weapon:greatsword
  - weapon:greatsword (the base weapons)
  - weapon:greatsword ← Greatsword (the base weapons)
- **Gythka** [melee] → natural:gythka
  - natural:gythka (1 creatures)
  - natural:gythka ← Gythka (1 creatures (Thri-kreen Marauder))
- **Halberd** [melee] → weapon:halberd
  - weapon:halberd (the base weapons)
  - weapon:halberd ← Halberd (the base weapons)
- **Hammer** [melee] → weapon:lighthammer, natural:burning-hammer, weapon:light-hammer
  - weapon:lighthammer ← Light Hammer (the base weapons)
  - natural:burning-hammer ← Burning Hammer (2 creatures (Azer Sentinel))
  - weapon:light-hammer ← Light Hammer (phb/equipment)
- **Handaxe** [melee] → weapon:handaxe
  - weapon:handaxe (the base weapons)
  - weapon:handaxe ← Handaxe (the base weapons)
- **Harpoon** [melee] → natural:harpoon
  - natural:harpoon (2 creatures)
  - natural:harpoon ← Harpoon (2 creatures (Merrow))
- **Hook** [melee] → natural:hook
  - natural:hook (1 creatures)
  - natural:hook ← Hook (1 creatures (Hook Horror))
- **Hooves** [melee] → natural:hooves
  - natural:hooves (32 creatures)
  - natural:hooves ← Hooves (32 creatures (Draft Horse, Mule, Nightmare))
- **Horn** [melee] → natural:radiant-horn
  - natural:radiant-horn ← Radiant Horn (2 creatures (Unicorn))
- **Knife** [melee] → natural:sculpting-knife
  - natural:sculpting-knife ← Sculpting Knife (1 creatures (Waxwork))
- **Lance** [melee] → weapon:lance, natural:psionic-lance
  - weapon:lance (the base weapons)
  - weapon:lance ← Lance (the base weapons)
  - natural:psionic-lance ← Psionic Lance (1 creatures (Thri-kreen Psion))
- **Lash** [melee] → natural:aquatic-lash, natural:caustic-lash, natural:tentacle-lash, natural:vine-lash
  - natural:aquatic-lash ← Aquatic Lash (1 creatures (Marid))
  - natural:caustic-lash ← Caustic Lash (1 creatures (Yochlol))
  - natural:tentacle-lash ← Tentacle Lash (2 creatures (Aberrant Cultist))
  - natural:vine-lash ← Vine Lash (2 creatures (Dryad))
- **Longsword** [melee] → weapon:longsword
  - weapon:longsword (the base weapons)
  - weapon:longsword ← Longsword (the base weapons)
- **Mace** [melee] → weapon:mace, natural:radiant-mace, natural:radiant-mace-defender-only, weapon:fiery-mace, weapon:holy-mace, weapon:thunderous-mace
  - weapon:mace (the base weapons)
  - weapon:mace ← Mace (the base weapons)
  - natural:radiant-mace ← Radiant Mace (1 creatures (Defender Spirit))
  - natural:radiant-mace-defender-only ← Radiant Mace (Defender Only) (1 creatures (Celestial Spirit))
  - weapon:fiery-mace ← Fiery Mace (mm/features)
  - weapon:holy-mace ← Holy Mace (mm/features)
  - weapon:thunderous-mace ← Thunderous Mace (mm/features)
- **Maul** [melee] → weapon:maul, natural:earthen-maul
  - weapon:maul (the base weapons)
  - weapon:maul ← Maul (the base weapons)
  - natural:earthen-maul ← Earthen Maul (4 creatures (Dao, Lizardfolk Sovereign))
- **Morningstar** [melee] → weapon:morningstar
  - weapon:morningstar (the base weapons)
  - weapon:morningstar ← Morningstar (the base weapons)
- **Pick** [melee] → weapon:warpick, weapon:war-pick
  - weapon:warpick ← War Pick (the base weapons)
  - weapon:war-pick ← War Pick (phb/equipment)
- **Pike** [melee] → weapon:pike
  - weapon:pike (the base weapons)
  - weapon:pike ← Pike (the base weapons)
- **Pincer** [melee] → natural:pincer
  - natural:pincer (6 creatures)
  - natural:pincer ← Pincer (6 creatures (Chuul, Glabrezu, Mi-Go))
- **Pseudopod** [melee] → natural:pseudopod, natural:dissolving-pseudopod
  - natural:pseudopod (12 creatures)
  - natural:dissolving-pseudopod ← Dissolving Pseudopod (2 creatures (Black Pudding))
  - natural:pseudopod ← Pseudopod (12 creatures (Blob of Annihilation, Gelatinous Cube, Gray Ooze))
- **Quarterstaff** [melee] → weapon:quarterstaff
  - weapon:quarterstaff (the base weapons)
  - weapon:quarterstaff ← Quarterstaff (the base weapons)
- **Rake** [melee] → natural:rake
  - natural:rake (2 creatures)
  - natural:rake ← Rake (2 creatures (Awakened Shrub))
- **Ram** [melee] → weapon:ram, natural:ram
  - weapon:ram (dmg/equipment)
  - natural:ram (14 creatures)
  - natural:ram ← Ram (14 creatures (Chimera, Deer, Elk))
  - weapon:ram ← Ram (dmg/equipment)
- **Rapier** [melee] → weapon:rapier, weapon:insectile-rapier
  - weapon:rapier (the base weapons)
  - weapon:rapier ← Rapier (the base weapons)
  - weapon:insectile-rapier ← Insectile Rapier (mm/features)
- **Ravage** [melee] → natural:ravage
  - natural:ravage (1 creatures)
  - natural:ravage ← Ravage (1 creatures (Primeval Owlbear))
- **Rend** [melee] → natural:rend, natural:rend-jackal-or-hybrid-form-only, natural:rend-bear-or-hybrid-form-only, natural:rend-dire-wolf-or-hybrid-form-only, natural:mind-rend
  - natural:rend (130 creatures)
  - natural:rend ← Rend (130 creatures (Adult Black Dragon, Adult Blue Dragon, Adult Brass Dragon))
  - natural:rend-jackal-or-hybrid-form-only ← Rend (Jackal or Hybrid Form Only) (1 creatures (Jackalwere))
  - natural:rend-bear-or-hybrid-form-only ← Rend (Bear or Hybrid Form Only) (2 creatures (Werebear))
  - natural:rend-dire-wolf-or-hybrid-form-only ← Rend (Dire Wolf or Hybrid Form Only) (1 creatures (Loup Garou))
  - natural:mind-rend ← Mind Rend (1 creatures (Mist Horror))
- **Scimitar** [melee] → weapon:scimitar
  - weapon:scimitar (the base weapons)
  - weapon:scimitar ← Scimitar (the base weapons)
- **Scratch** [melee] → natural:scratch
  - natural:scratch (10 creatures)
  - natural:scratch ← Scratch (10 creatures (Cat, Wererat, Weretiger))
- **Scythe** [melee] → natural:dread-scythe
  - natural:dread-scythe ← Dread Scythe (2 creatures (Death Cultist))
- **Shortsword** [melee] → weapon:shortsword
  - weapon:shortsword (the base weapons)
  - weapon:shortsword ← Shortsword (the base weapons)
- **Sickle** [melee] → weapon:sickle, natural:ritual-sickle
  - weapon:sickle (the base weapons)
  - weapon:sickle ← Sickle (the base weapons)
  - natural:ritual-sickle ← Ritual Sickle (2 creatures (Cultist))
- **Slam** [melee] → natural:slam, natural:avalanche-slam, natural:object-slam, natural:rotting-slam, natural:thunderous-slam, natural:slam-human-or-hybrid-form-only
  - natural:slam (48 creatures)
  - natural:avalanche-slam ← Avalanche Slam (2 creatures (Animated Boulder, Galeb Duhr))
  - natural:object-slam ← Object Slam (5 creatures (Haunting Revenant, Poltergeist, Wilfred Godefroy))
  - natural:rotting-slam ← Rotting Slam (2 creatures (Violet Fungus Necrohulk))
  - natural:slam ← Slam (48 creatures (Animated Armor, Animated Broom, Awakened Tree))
  - natural:thunderous-slam ← Thunderous Slam (2 creatures (Air Elemental))
  - natural:slam-human-or-hybrid-form-only ← Slam (Human or Hybrid Form Only) (1 creatures (Jackalwere))
- **Slash** [melee] → natural:slash, natural:darkflame-slash
  - natural:slash (2 creatures)
  - natural:slash ← Slash (2 creatures (Animated Flying Sword))
  - natural:darkflame-slash ← Darkflame Slash (1 creatures (Ebonbane))
- **Snake Hair** [melee] → natural:snake-hair
  - natural:snake-hair (2 creatures)
  - natural:snake-hair ← Snake Hair (2 creatures (Medusa))
- **Spear** [melee] → weapon:spear, natural:clockwork-spear, natural:flame-spear, natural:ice-spear, natural:ocean-spear
  - weapon:spear (the base weapons)
  - weapon:spear ← Spear (the base weapons)
  - natural:clockwork-spear ← Clockwork Spear (1 creatures (Modron Tridrone))
  - natural:flame-spear ← Flame Spear (2 creatures (Salamander))
  - natural:ice-spear ← Ice Spear (2 creatures (Ice Devil))
  - natural:ocean-spear ← Ocean Spear (2 creatures (Merfolk Skirmisher))
- **Spike** [melee] → natural:tail-spike
  - natural:tail-spike ← Tail Spike (2 creatures (Manticore))
- **Staff** [melee] → weapon:staff, natural:bog-staff, natural:chaos-staff, natural:pincer-staff, natural:vine-staff, weapon:wooden-staff, weapon:forest-staff, weapon:wind-staff, weapon:enspelled-staff
  - weapon:staff (phb/equipment)
  - natural:bog-staff ← Bog Staff (2 creatures (Bullywug Bog Sage))
  - natural:chaos-staff ← Chaos Staff (1 creatures (Green Slaad))
  - natural:pincer-staff ← Pincer Staff (1 creatures (Kuo-toa Whip))
  - natural:vine-staff ← Vine Staff (2 creatures (Druid))
  - weapon:staff ← Staff (phb/equipment)
  - weapon:wooden-staff ← Wooden staff (phb/equipment)
  - weapon:forest-staff ← Forest Staff (mm/features)
  - weapon:wind-staff ← Wind Staff (mm/features)
  - weapon:enspelled-staff ← Enspelled Staff (dmg/equipment)
- **Stick** [melee] → natural:hex-stick
  - natural:hex-stick ← Hex Stick (1 creatures (Goblin Hexer))
- **Sting** [melee] → natural:sting, natural:infernal-sting
  - natural:sting (12 creatures)
  - natural:infernal-sting ← Infernal Sting (2 creatures (Bone Devil))
  - natural:sting ← Sting (12 creatures (Giant Scorpion, Giant Wasp, Imp))
- **Stinger** [melee] → natural:stinger, natural:tail-stinger
  - natural:stinger (1 creatures)
  - natural:tail-stinger ← Tail Stinger (2 creatures (Purple Worm))
  - natural:stinger ← Stinger (1 creatures (Carrion Stalker))
- **Strike** [melee] → natural:unarmed-strike, natural:abyssal-strike, natural:beguiling-strike, natural:draconic-strike, natural:grave-strike, natural:otherworldly-strike, natural:psi-strike, natural:shadow-strike, natural:grave-strike-vampire-form-only, natural:beasts-strike, natural:fiery-strike, natural:fiery-strike-devil-only, natural:death-strike
  - natural:unarmed-strike ← Unarmed Strike (10 creatures (Barbarian, Monk, Merric))
  - natural:abyssal-strike ← Abyssal Strike (1 creatures (Gnoll Demoniac))
  - natural:beguiling-strike ← Beguiling Strike (1 creatures (Noble Prodigy))
  - natural:draconic-strike ← Draconic Strike (1 creatures (Githyanki Dracomancer))
  - natural:grave-strike ← Grave Strike (2 creatures (Vampire Umbral Lord))
  - natural:otherworldly-strike ← Otherworldly Strike (1 creatures (Empyrean Iota))
  - natural:psi-strike ← Psi Strike (2 creatures (Githzerai Monk, Githzerai Zerth))
  - natural:shadow-strike ← Shadow Strike (1 creatures (Vampire Nightbringer))
  - natural:grave-strike-vampire-form-only ← Grave Strike (Vampire Form Only) (2 creatures (Vampire))
  - natural:beasts-strike ← Beast's Strike (3 creatures (Beast of the Land, Beast of the Sea, Beast of the Sky))
  - natural:fiery-strike ← Fiery Strike (1 creatures (Devil Spirit))
  - natural:fiery-strike-devil-only ← Fiery Strike (Devil Only) (1 creatures (Fiendish Spirit))
  - natural:death-strike ← Death Strike (1 creatures (Strahd von Zarovich))
- **Sword** [melee] → natural:arcane-sword, natural:flying-sword, natural:necrotic-sword, natural:needle-sword, natural:silver-sword, weapon:flame-sword, weapon:radiant-sword, weapon:storm-sword, weapon:withering-sword, weapon:dancing-sword, weapon:moon-touched-sword, weapon:vorpal-sword
  - natural:arcane-sword ← Arcane Sword (1 creatures (Helmed Horror))
  - natural:flying-sword ← Flying Sword (2 creatures (Solar))
  - natural:necrotic-sword ← Necrotic Sword (3 creatures (Wight))
  - natural:needle-sword ← Needle Sword (3 creatures (Sprite))
  - natural:silver-sword ← Silver Sword (1 creatures (Githyanki Knight))
  - weapon:flame-sword ← Flame Sword (mm/features)
  - weapon:radiant-sword ← Radiant Sword (mm/features)
  - weapon:storm-sword ← Storm Sword (mm/features)
  - weapon:withering-sword ← Withering Sword (mm/features)
  - weapon:dancing-sword ← Dancing Sword (dmg/equipment)
  - weapon:moon-touched-sword ← Moon-Touched Sword (dmg/equipment)
  - weapon:vorpal-sword ← Vorpal Sword (dmg/equipment)
- **Tail** [melee] → natural:tail
  - natural:tail (18 creatures)
  - natural:tail ← Tail (18 creatures (Ankylosaurus, Barbed Devil, Cloaker))
- **Talon** [melee] → natural:talons, weapon:sylvan-talon
  - natural:talons ← Talons (16 creatures (Aarakocra Skirmisher, Cockatrice Regent, Eagle))
  - weapon:sylvan-talon ← Sylvan Talon (dmg/equipment)
- **Trident** [melee] → weapon:trident, weapon:flame-trident, weapon:mercurial-trident
  - weapon:trident (the base weapons)
  - weapon:trident ← Trident (the base weapons)
  - weapon:flame-trident ← Flame Trident (mm/features)
  - weapon:mercurial-trident ← Mercurial Trident (mm/features)
- **Tusk** [melee] → natural:tusk, natural:tusk-boar-or-hybrid-form-only
  - natural:tusk (0 creatures)
  - natural:tusk ← Tusk (0 creatures ())
  - natural:tusk-boar-or-hybrid-form-only ← Tusk (Boar or Hybrid Form Only) (2 creatures (Wereboar))
- **Unarmed Strike** [melee] → natural:unarmed-strike
  - natural:unarmed-strike (10 creatures)
  - natural:unarmed-strike ← Unarmed Strike (10 creatures (Barbarian, Monk, Merric))
- **War Pick** [melee] → weapon:warpick, weapon:war-pick
  - weapon:warpick (the base weapons)
  - weapon:war-pick (phb/equipment)
  - weapon:warpick ← War Pick (the base weapons)
  - weapon:war-pick ← War Pick (phb/equipment)
- **Warhammer** [melee] → weapon:warhammer
  - weapon:warhammer (the base weapons)
  - weapon:warhammer ← Warhammer (the base weapons)
- **Whip** [melee] → weapon:whip, natural:bone-whip, natural:flame-whip, weapon:mercurial-whip
  - weapon:whip (the base weapons)
  - weapon:whip ← Whip (the base weapons)
  - natural:bone-whip ← Bone Whip (2 creatures (Gnoll Pack Lord, Kuo-toa Monitor))
  - natural:flame-whip ← Flame Whip (2 creatures (Balor))
  - weapon:mercurial-whip ← Mercurial Whip (mm/features)
- **Acid Arrow** [range] → spell:acid-arrow
  - spell:acid-arrow (dnd5e/spells24)
- **Antimatter Rifle** [range] → weapon:antimatter-rifle
  - weapon:antimatter-rifle (dmg/equipment)
  - weapon:antimatter-rifle ← Antimatter Rifle (dmg/equipment)
- **Antipathy/Sympathy** [range] → spell:antipathy-sympathy
  - spell:antipathy-sympathy (phb/spells)
- **Aquatic Burst** [range] → natural:aquatic-burst
  - natural:aquatic-burst (1 creatures)
  - natural:aquatic-burst ← Aquatic Burst (1 creatures (Merfolk Wavebender))
- **Awakened Mind** [range] → feature:awakened-mind
  - feature:awakened-mind (phb/classes)
- **Befuddlement** [range] → spell:befuddlement
  - spell:befuddlement (phb/spells)
- **Beguiling Defenses** [range] → feature:beguiling-defenses
  - feature:beguiling-defenses (phb/classes)
- **Blowgun** [range] → weapon:blowgun
  - weapon:blowgun (the base weapons)
  - weapon:blowgun ← Blowgun (the base weapons)
- **Bomb** [range] → item:bomb
  - item:bomb (dmg/equipment)
- **Bone Bow** [range] → weapon:bone-bow
  - weapon:bone-bow (mm/features)
  - weapon:bone-bow ← Bone Bow (mm/features)
- **Boulder** [range] → natural:boulder
  - natural:boulder (2 creatures)
  - natural:boulder ← Boulder (2 creatures (Stone Giant))
- **Bow** [range] → natural:enchanting-bow, natural:radiant-bow, natural:radiant-bow-avenger-only, weapon:bone-bow, weapon:great-bow, weapon:necrotic-bow, weapon:energy-bow
  - natural:enchanting-bow ← Enchanting Bow (3 creatures (Sprite))
  - natural:radiant-bow ← Radiant Bow (1 creatures (Avenger Spirit))
  - natural:radiant-bow-avenger-only ← Radiant Bow (Avenger Only) (1 creatures (Celestial Spirit))
  - weapon:bone-bow ← Bone Bow (mm/features)
  - weapon:great-bow ← Great Bow (mm/features)
  - weapon:necrotic-bow ← Necrotic Bow (mm/features)
  - weapon:energy-bow ← Energy Bow (dmg/equipment)
- **Burnt Othur Fumes** [range] → item:burnt-othur-fumes
  - item:burnt-othur-fumes (dmg/equipment)
- **Burst** [range] → natural:aquatic-burst, natural:arcane-burst, natural:earth-burst, natural:eldritch-burst, natural:elemental-burst, natural:fiendish-burst, natural:flame-burst, natural:necrotic-burst, natural:poison-burst, natural:radiant-burst, natural:thorn-burst, natural:poison-burst-yuan-ti-form-only, natural:negative-energy-burst, natural:disrupting-burst
  - natural:aquatic-burst ← Aquatic Burst (1 creatures (Merfolk Wavebender))
  - natural:arcane-burst ← Arcane Burst (6 creatures (Archmage, Mage, Mage Apprentice))
  - natural:earth-burst ← Earth Burst (3 creatures (Dao, Lizardfolk Geomancer))
  - natural:eldritch-burst ← Eldritch Burst (3 creatures (Lich, Azalin Rex))
  - natural:elemental-burst ← Elemental Burst (1 creatures (Elemental Cataclysm))
  - natural:fiendish-burst ← Fiendish Burst (2 creatures (Arcanaloth))
  - natural:flame-burst ← Flame Burst (1 creatures (Azer Pyromancer))
  - natural:necrotic-burst ← Necrotic Burst (3 creatures (Demilich, Necrichor, Saidra d’Honaire))
  - natural:poison-burst ← Poison Burst (2 creatures (Drider))
  - natural:radiant-burst ← Radiant Burst (3 creatures (Archpriest, Mist Wanderer))
  - natural:thorn-burst ← Thorn Burst (2 creatures (Dryad))
  - natural:poison-burst-yuan-ti-form-only ← Poison Burst (Yuan-ti Form Only) (1 creatures (Yuan-ti Malison (Type 3)))
  - natural:negative-energy-burst ← Negative Energy Burst (1 creatures (Ankhtepot))
  - natural:disrupting-burst ← Disrupting Burst (1 creatures (Brain in a Jar))
- **Chatkcha** [range] → natural:chatkcha
  - natural:chatkcha (1 creatures)
  - natural:chatkcha ← Chatkcha (1 creatures (Thri-kreen Marauder))
- **Cinder Breath** [range] → feature:cinder-breath
  - feature:cinder-breath (mm/features)
- **Consume Life** [range] → feature:consume-life
  - feature:consume-life (mm/features)
- **Cordon of Arrows** [range] → spell:cordon-of-arrows
  - spell:cordon-of-arrows (phb/spells)
- **Crossbow** [range] → weapon:handcrossbow, weapon:heavycrossbow, weapon:lightcrossbow, weapon:hand-crossbow, weapon:heavy-crossbow, weapon:light-crossbow
  - weapon:handcrossbow ← Hand Crossbow (the base weapons)
  - weapon:heavycrossbow ← Heavy Crossbow (the base weapons)
  - weapon:lightcrossbow ← Light Crossbow (the base weapons)
  - weapon:hand-crossbow ← Hand Crossbow (phb/equipment)
  - weapon:heavy-crossbow ← Heavy Crossbow (phb/equipment)
  - weapon:light-crossbow ← Light Crossbow (phb/equipment)
- **Dart** [range] → weapon:dart
  - weapon:dart (the base weapons)
  - weapon:dart ← Dart (the base weapons)
- **Devour Intellect** [range] → feature:devour-intellect
  - feature:devour-intellect (mm/features)
- **Dominate Mind** [range] → feature:dominate-mind
  - feature:dominate-mind (mm/features)
- **Draining Kiss** [range] → feature:draining-kiss
  - feature:draining-kiss (mm/features)
- **Earth Burst** [range] → natural:earth-burst
  - natural:earth-burst (3 creatures)
  - natural:earth-burst ← Earth Burst (3 creatures (Dao, Lizardfolk Geomancer))
- **Energy Drain** [range] → feature:energy-drain
  - feature:energy-drain (mm/features)
- **Essence of Ether** [range] → item:essence-of-ether
  - item:essence-of-ether (dmg/equipment)
- **Gear Flinger** [range] → natural:gear-flinger
  - natural:gear-flinger (1 creatures)
  - natural:gear-flinger ← Gear Flinger (1 creatures (Modron Monodrone))
- **Grenade Launcher** [range] → weapon:grenade-launcher
  - weapon:grenade-launcher (dmg/equipment)
  - weapon:grenade-launcher ← Grenade Launcher (dmg/equipment)
- **Hail of Bark** [range] → natural:hail-of-bark
  - natural:hail-of-bark (2 creatures)
  - natural:hail-of-bark ← Hail of Bark (2 creatures (Treant))
- **Holy Water** [range] → item:holy-water
  - item:holy-water (phb/equipment)
- **Ice Knife** [range] → spell:ice-knife
  - spell:ice-knife (phb/spells)
- **Javelin** [range] → weapon:javelin, natural:bone-javelin, weapon:wind-javelin
  - weapon:javelin (the base weapons)
  - weapon:javelin ← Javelin (the base weapons)
  - natural:bone-javelin ← Bone Javelin (1 creatures (Gnoll Pack Lord))
  - weapon:wind-javelin ← Wind Javelin (mm/features)
- **Life Drain** [range] → feature:life-drain
  - feature:life-drain (mm/features)
- **Lob** [range] → natural:wax-lob, weapon:trash-lob
  - natural:wax-lob ← Wax Lob (1 creatures (Waxwork))
  - weapon:trash-lob ← Trash Lob (mm/features)
- **Longbow** [range] → weapon:longbow
  - weapon:longbow (the base weapons)
  - weapon:longbow ← Longbow (the base weapons)
- **Malice** [range] → item:malice
  - item:malice (dmg/equipment)
- **Maze** [range] → spell:maze
  - spell:maze (phb/spells)
- **Message** [range] → spell:message
  - spell:message (phb/spells)
- **Mind Sliver** [range] → spell:mind-sliver
  - spell:mind-sliver (phb/spells)
- **Mind Spike** [range] → spell:mind-spike
  - spell:mind-spike (phb/spells)
- **Modify Memory** [range] → spell:modify-memory
  - spell:modify-memory (phb/spells)
- **Mud Breath** [range] → feature:mud-breath
  - feature:mud-breath (mm/features)
- **Musket** [range] → weapon:musket
  - weapon:musket (the base weapons)
  - weapon:musket ← Musket (the base weapons)
- **Needle** [range] → natural:silver-needle, weapon:needles
  - natural:silver-needle ← Silver Needle (1 creatures (Carrionette))
  - weapon:needles ← Needles (mm/features)
- **Pistol** [range] → weapon:pistol, weapon:laser-pistol, weapon:semiautomatic-pistol
  - weapon:pistol (the base weapons)
  - weapon:pistol ← Pistol (the base weapons)
  - weapon:laser-pistol ← Laser Pistol (dmg/equipment)
  - weapon:semiautomatic-pistol ← Semiautomatic Pistol (dmg/equipment)
- **Planar Binding** [range] → spell:planar-binding
  - spell:planar-binding (phb/spells)
- **Poison Ray** [range] → natural:poison-ray, natural:poison-ray-yuan-ti-form-only
  - natural:poison-ray (3 creatures)
  - natural:poison-ray ← Poison Ray (3 creatures (Medusa, Yuan-ti Infiltrator))
  - natural:poison-ray-yuan-ti-form-only ← Poison Ray  (Yuan-ti Form Only) (2 creatures (Yuan-ti Malison (Type 1)))
- **Poison Spray** [range] → spell:poison-spray, feature:poison-spray
  - spell:poison-spray (phb/spells)
  - feature:poison-spray (mm/features)
- **Possession** [range] → feature:possession
  - feature:possession (mm/features)
- **Proboscis** [range] → natural:proboscis
  - natural:proboscis (4 creatures)
  - natural:proboscis ← Proboscis (4 creatures (Chasme, Stirge, Strigoi))
- **Ray of Enfeeblement** [range] → spell:ray-of-enfeeblement
  - spell:ray-of-enfeeblement (phb/spells)
- **Rend Mind** [range] → feature:rend-mind
  - feature:rend-mind (phb/classes)
- **Restore Balance** [range] → feature:restore-balance
  - feature:restore-balance (phb/classes)
- **Revolver** [range] → weapon:revolver
  - weapon:revolver (dmg/equipment)
  - weapon:revolver ← Revolver (dmg/equipment)
- **Rifle** [range] → natural:hunting-rifle, weapon:antimatter-rifle, weapon:automatic-rifle, weapon:hunting-rifle, weapon:laser-rifle
  - natural:hunting-rifle ← Hunting Rifle (1 creatures (Wilfred Godefroy))
  - weapon:antimatter-rifle ← Antimatter Rifle (dmg/equipment)
  - weapon:automatic-rifle ← Automatic Rifle (dmg/equipment)
  - weapon:hunting-rifle ← Hunting Rifle (dmg/equipment)
  - weapon:laser-rifle ← Laser Rifle (dmg/equipment)
- **Rock** [range] → natural:rock
  - natural:rock (3 creatures)
  - natural:rock ← Rock (3 creatures (Ape, Cyclops Sentry))
- **Rock Launch** [range] → natural:rock-launch
  - natural:rock-launch (2 creatures)
  - natural:rock-launch ← Rock Launch (2 creatures (Earth Elemental))
- **Shortbow** [range] → weapon:shortbow
  - weapon:shortbow (the base weapons)
  - weapon:shortbow ← Shortbow (the base weapons)
- **Shotgun** [range] → weapon:shotgun
  - weapon:shotgun (dmg/equipment)
  - weapon:shotgun ← Shotgun (dmg/equipment)
- **Sling** [range] → weapon:sling
  - weapon:sling (the base weapons)
  - weapon:sling ← Sling (the base weapons)
- **Sorcerous Burst** [range] → spell:sorcerous-burst
  - spell:sorcerous-burst (phb/spells)
- **Stench Spray** [range] → feature:stench-spray
  - feature:stench-spray (mm/features)
- **Sun Blade** [range] → weapon:sun-blade
  - weapon:sun-blade (dmg/equipment)
  - weapon:sun-blade ← Sun Blade (dmg/equipment)
- **Surge** [range] → natural:surge
  - natural:surge (1 creatures)
  - natural:surge ← Surge (1 creatures (Water Weird))
- **Telepathic Bond** [range] → spell:telepathic-bond, feature:telepathic-bond
  - spell:telepathic-bond (dnd5e/spells24)
  - feature:telepathic-bond (mm/features)
- **Telepathic Speech** [range] → feature:telepathic-speech
  - feature:telepathic-speech (phb/classes)
- **Wardaway** [range] → spell:wardaway
  - spell:wardaway (faerun/options)
- **Watery Rebuke** [range] → feature:watery-rebuke
  - feature:watery-rebuke (mm/features)
- **Web** [range] → spell:web, feature:web
  - spell:web (phb/spells)
  - feature:web (mm/features)
- **First Light** [melee] → weapon:first-light
  - weapon:first-light (the world (Hobgoblin Captain))
  - weapon:first-light ← First Light (the world (Hobgoblin Captain))
- **Goldthorn** [melee] → weapon:goldthorn
  - weapon:goldthorn (the world (Jetten Elisedil))
  - weapon:goldthorn ← Goldthorn (the world (Jetten Elisedil))

## Caught by a weapon word under AA, not carried (67 words)

Automated Animations' weapon and creature-attack rows matched their word inside any name — a feat, a wand, a spell. Those catches are accidents of the word and are not carried: a weapon fx never answers a spell, a feature or an item. Each is one house fx away if it was wanted ("like the Burst fx, for feature:spellfire-burst").

- **Blade** [melee]: Flame Blade [spell] (phb/spells)
- **Chain** [melee]: Chain [consumable] on Mother Wend
- **Claw** [melee]: Claw [weapon] on Ettercap — this world's own; Claw [weapon] on Twig Blight — this world's own; Claw [weapon] on Hazel — this world's own; Claw [weapon] on Mabel — this world's own; Claw [weapon] on Ettercap Broodmother — this world's own; Claw [weapon] on Ettercap Broodling — this world's own
- **Club** [melee]: Club [weapon] on Rurik Dunn — this world's own; Club [weapon] on Brother Aldous — this world's own; Club [weapon] on Garrison 08 — this world's own; Club [weapon] on Garrison 04 — this world's own; Club [weapon] on Villager 04 — this world's own; Club [weapon] on Tam Harrow — this world's own; Club [weapon] on Rue — this world's own; Club [weapon] on Tessa the Drummer — this world's own; Club [weapon] on Militia 04 — this world's own; Club [weapon] on Pip — this world's own; Club [weapon] on Ellie the Waitress — this world's own; Club [weapon] on Garrison 03 — this world's own; Club [weapon] on Lord Hargrove — this world's own; Club [weapon] on Garvin the Merchant — this world's own; Club [weapon] on Gorm Alder — this world's own; Club [weapon] on Villager 05 — this world's own; Club [weapon] on Dellan the Bartender — this world's own; Club [weapon] on Warden Brill — this world's own; Club [weapon] on Harrow Child (Boy) — this world's own; Club [weapon] on Nell Alder — this world's own; Club [weapon] on Mother Wend — this world's own; Club [weapon] on Maddoc the Seer — this world's own; Club [weapon] on Ambrose Featherstone — this world's own; Club [weapon] on Pib — this world's own; Club [weapon] on Garrison 07 — this world's own; Club [weapon] on Harrow Child (Girl) — this world's own; Club [weapon] on Brother Tobin — this world's own; Club [weapon] on Nessa the Waitress — this world's own; Club [weapon] on Greenrest Militia — Spearman — this world's own; Club [weapon] on Dame Ryla — this world's own; Club [weapon] on Militia 01 — this world's own; Club [weapon] on Denby Cobble — this world's own; Club [weapon] on Mother Ziska — this world's own; Club [weapon] on Osric the Bartender — this world's own; Club [weapon] on Marisel — this world's own; Club [weapon] on Inn Hand 02 — this world's own; Club [weapon] on Masie — this world's own; Club [weapon] on Petra the Merchant — this world's own; Club [weapon] on Garrison 05 — this world's own; Club [weapon] on Selise the Courtesan — this world's own; Club [weapon] on Garrison 01 — this world's own; Club [weapon] on Villager 08 — this world's own; Club [weapon] on Torvald the Sellsword — this world's own; Club [weapon] on Old Crake — this world's own; Club [weapon] on Corwin Vale — this world's own; Club [weapon] on Villager 06 — this world's own; Club [weapon] on Villager 07 — this world's own; Club [weapon] on Garrison 11 — this world's own; Club [weapon] on Fenwick the List-Keeper — this world's own; Club [weapon] on Granny Fell — this world's own; Club [weapon] on Merek — this world's own; Club [weapon] on Edrin the Scholar — this world's own; Club [weapon] on Mayor Oswin Applewhite — this world's own; Club [weapon] on Durgan — this world's own; Club [weapon] on Worshipper 02 — this world's own; Club [weapon] on Garrison 10 — this world's own; Club [weapon] on Goody Till — this world's own; Club [weapon] on Constable Warin Holt — this world's own; Club [weapon] on Villager 02 — this world's own; Club [weapon] on Selma — this world's own; Club [weapon] on Inn Hand 01 — this world's own; Club [weapon] on Ordella Vance — this world's own; Club [weapon] on Militia 02 — this world's own; Club [weapon] on Worshipper 01 — this world's own; Club [weapon] on Fern the Druidling — this world's own; Club [weapon] on Militia 03 — this world's own; Club [weapon] on Garrison 09 — this world's own; Club [weapon] on Acolyte Enid — this world's own; Club [weapon] on Josk — this world's own; Club [weapon] on Sister Wynn — this world's own; Club [weapon] on Faelar the Sorcerer — this world's own; Club [weapon] on Tibby — this world's own; Club [weapon] on Garrison 02 — this world's own; Club [weapon] on Lyra the Musician — this world's own; Club [weapon] on Hensel — this world's own; Club [weapon] on Villager 01 — this world's own; Club [weapon] on Greenrest Militia — Archer — this world's own; Club [weapon] on Sergeant Dunmar — this world's own; Club [weapon] on Villager 03 — this world's own; Club [weapon] on Garrison 06 — this world's own; Club [weapon] on Coll — this world's own; Club [weapon] on Oswin's Butler — this world's own; Club [weapon] on Weslo Crane — this world's own; Club [weapon] on Old Bramwell — this world's own; Club [weapon] on Halgar Vos — this world's own; Club [weapon] on Wick — this world's own
- **Dagger** [melee]: Dagger [weapon] on Gren Greenmantle — this world's own; Dagger [weapon] on Mother Wend — this world's own; Dagger [weapon] on Salyth — this world's own; Dagger [weapon] on Corpse — this world's own; Dagger [weapon] on BF Test Bard — this world's own; Dagger [weapon] on BF Test Shielder — this world's own; Dagger [weapon] on Dead Traveler — this world's own; +1 Dagger [weapon] on Jetten Elisedil — this world's own; Dagger [weapon] on Jetten Elisedil — this world's own; Cloud of Daggers [spell] (phb/spells)
- **Flail** [melee]: Flail [weapon] on Mother Wend — this world's own
- **Glaive** [melee]: Glaive [weapon] on Mother Wend — this world's own
- **Gore** [melee]: Gore [weapon] on Peryton — this world's own; Gore [weapon] on Longshadow — this world's own
- **Greataxe** [melee]: Greataxe [weapon] on Morgash the Gravemaker — this world's own; Greataxe [weapon] on Mother Wend — this world's own; Greataxe [weapon] on BF Test Fighter — this world's own
- **Greatclub** [melee]: Greatclub [weapon] on Mother Wend — this world's own
- **Greatsword** [melee]: Greatsword [weapon] on Hobgoblin Captain — this world's own; Ember-Touched Greatsword [weapon] on Morgash the Gravemaker — this world's own; Greatsword [weapon] on Mother Wend — this world's own; Ember-Touched Greatsword [weapon] on BF Test Fighter — this world's own
- **Halberd** [melee]: Halberd [weapon] on Mother Wend — this world's own; Halberd [weapon] on Sharran Zealot — this world's own
- **Hammer** [melee]: Light Hammer [weapon] on Mother Wend — this world's own
- **Handaxe** [melee]: Handaxe [weapon] on Mother Wend — this world's own
- **Horn** [melee]: Horn [tool] on Mother Wend
- **Knife** [melee]: Ice Knife [spell] on Skeletal Mage; Ice Knife [spell] (phb/spells)
- **Lance** [melee]: Lance [weapon] on Mother Wend — this world's own; Laeral's Silver Lance [spell] (faerun/options)
- **Longsword** [melee]: Longsword [weapon] on BF Test PC Attacker — this world's own; Longsword [weapon] on BF Test Attacker — this world's own; Longsword [weapon] on BF Test Victim — this world's own; Longsword [weapon] on Mother Wend — this world's own; Longsword [weapon] on BF Test Paladin — this world's own; Longsword [weapon] on BF Test Rogue — this world's own; Longsword [weapon] on Hobgoblin Archer — this world's own; Longsword [weapon] on Hobgoblin Warrior — this world's own; Longsword [weapon] on Sharran Enforcer — this world's own; Longsword [weapon] on BF Test Ranger — this world's own
- **Mace** [melee]: Mace [weapon] on Sharran Acolyte — this world's own; Mace [weapon] on Mother Wend — this world's own; Mace [weapon] on BF Test Cleric — this world's own
- **Maul** [melee]: Maul [weapon] on Mother Wend — this world's own
- **Morningstar** [melee]: Morningstar [weapon] on Mother Wend — this world's own
- **Pick** [melee]: War Pick [weapon] on Mother Wend — this world's own
- **Pike** [melee]: Pike [weapon] on Morgash the Gravemaker — this world's own; Pike [weapon] on Mother Wend — this world's own; Pike [weapon] on BF Test Fighter — this world's own
- **Quarterstaff** [melee]: Quarterstaff [weapon] on Mother Wend — this world's own
- **Rapier** [melee]: Insectile Rapier [weapon] on Enthralled Bullywug Warrior — this world's own; Rapier [weapon] on Mother Wend — this world's own; Rapier [weapon] on BF Test Rogue — this world's own
- **Rend** [melee]: Rend [weapon] on Alpha Displacer Beast — this world's own; Rend [weapon] on Displacer Beast — this world's own
- **Scimitar** [melee]: Scimitar [weapon] on Mother Wend — this world's own; Scimitar [weapon] on Jetten Elisedil — this world's own
- **Scratch** [melee]: Scratch [weapon] on Sleeping Cat — this world's own
- **Scythe** [melee]: Necrotic Scythe [weapon] on Cadoc, the Guardian — this world's own
- **Shield** [melee]: Shield [spell] on Gren Greenmantle; Shield [equipment] on BF Test Attacker; Shield [equipment] on BF Test Victim; Shield [equipment] on Mother Wend; Sentinel Shield [equipment] on Mother Wend; Shield [spell] on Skeletal Mage; Shield [equipment] on Hobgoblin Warrior; Shield [equipment] on Sharran Enforcer; +1 Shield [equipment] on Thomas A. Invictus; Shield [spell] on BF Test Shielder; Fire Shield [spell] (phb/spells); Cacophonic Shield [spell] (faerun/options)
- **Shortsword** [melee]: Shortsword [weapon] on Skeleton 1 — this world's own; Shortsword [weapon] on Skeleton 4 — this world's own; Shortsword [weapon] on Mother Wend — this world's own; Sera's Shortsword [weapon] on Mother Wend — this world's own; Shortsword [weapon] on Skeletal Mage — this world's own; Shortsword [weapon] on Skeleton 5 — this world's own; Shortsword [weapon] on Skeletal Archer — this world's own; Shortsword [weapon] on Skeleton 3 — this world's own; Shortsword [weapon] on Jetten Elisedil — this world's own
- **Sickle** [melee]: Sickle [weapon] on Mother Wend — this world's own
- **Slam** [melee]: Slam [weapon] on Zombie 6 — this world's own; Slam [weapon] on Animated Armor — this world's own; Slam [weapon] on Zombie 1 — this world's own; Slam [weapon] on Zombie 4 — this world's own; Slam [weapon] on Zombie 2 — this world's own; Slam [weapon] on Zombie 3 — this world's own; Slam [weapon] on Animated Broom — this world's own; Slam [weapon] on Zombie 5 — this world's own
- **Slash** [melee]: Slash [weapon] on Animated Flying Sword — this world's own
- **Spear** [melee]: Spear [weapon] on Gren Greenmantle — this world's own; Spear [weapon] on Mother Wend — this world's own; Spear [weapon] on BF Test Shielder — this world's own
- **Spike** [melee]: Mind Spike [spell] (phb/spells)
- **Staff** [melee]: Bog Staff [weapon] on Gren Greenmantle — this world's own; Vesper Staff [weapon] on Harrow Vane — this world's own; Vine Staff [weapon] on Hobgoblin Shaman — this world's own; Staff [weapon] on Mother Wend — this world's own; Wooden staff [weapon] on Mother Wend — this world's own; Bog Staff [weapon] on Enthralled Bullywug Bog Sage — this world's own; Bog Staff [weapon] on BF Test Shielder — this world's own
- **Strike** [melee]: Flame Strike [spell] on Harrow Vane; True Strike [spell] on Sharran Acolyte; Cunning Strike [feat] on BF Test Rogue; Devious Strikes [feat] on BF Test Rogue; Improved Cunning Strike [feat] on BF Test Rogue; Ensnaring Strike [spell] (phb/spells); Flame Strike [spell] (phb/spells); Steel Wind Strike [spell] (phb/spells); True Strike [spell] (phb/spells)
- **Sword** [melee]: Necrotic Sword [weapon] on Aldous — this world's own; Necrotic Sword [weapon] on Osric, the Keeper — this world's own; Necrotic Sword [weapon] on Wight — this world's own; Necrotic Sword [weapon] on The Party — this world's own; Necrotic Sword [weapon] on Edda — this world's own; Necrotic Sword [weapon] on Hesper, the Mortician — this world's own; Mordenkainen's Sword [spell] (phb/spells); Arcane Sword [spell] (dnd5e/spells24)
- **Talon** [melee]: Talons [weapon] on Peryton — this world's own; Talons [weapon] on Longshadow — this world's own
- **Trident** [melee]: Trident [weapon] on Mother Wend — this world's own
- **War Pick** [melee]: War Pick [weapon] on Mother Wend — this world's own
- **Warhammer** [melee]: Warhammer [weapon] on Mother Wend — this world's own
- **Whip** [melee]: Whip [weapon] on Mother Wend — this world's own; Thorn Whip [spell] (phb/spells)
- **Acid Arrow** [range]: Melf's Acid Arrow [spell] (phb/spells)
- **Blowgun** [range]: Blowgun [weapon] on Mother Wend — this world's own
- **Bow** [range]: Necrotic Bow [weapon] on Aldous — this world's own; Necrotic Bow [weapon] on Osric, the Keeper — this world's own; Necrotic Bow [weapon] on Wight — this world's own; Necrotic Bow [weapon] on Cadoc, the Guardian — this world's own; Necrotic Bow [weapon] on Edda — this world's own; Necrotic Bow [weapon] on Hesper, the Mortician — this world's own
- **Burst** [range]: Spellfire Burst [feat] on Gren Greenmantle; Sorcerous Burst [spell] on Gren Greenmantle; Necrotic Burst [weapon] on Harrow Vane — this world's own; Spellfire Burst [feat] on BF Test Shielder; Sorcerous Burst [spell] on BF Test Shielder; Sorcerous Burst [spell] (phb/spells)
- **Consume Life** [range]: Consume Life [feat] on Will-o'-Wisp
- **Crossbow** [range]: Heavy Crossbow [weapon] on Mother Wend — this world's own; Light Crossbow [weapon] on Mother Wend — this world's own; Hand Crossbow [weapon] on Mother Wend — this world's own; Marn's Light Crossbow [weapon] on Mother Wend — this world's own; Heavy Crossbow [weapon] on Sharran Enforcer — this world's own
- **Dart** [range]: Dart [weapon] on Mother Wend — this world's own
- **Ice Knife** [range]: Ice Knife [spell] on Skeletal Mage
- **Javelin** [range]: Javelin [weapon] on Mother Wend — this world's own; Javelin [weapon] on Thomas A. Invictus — this world's own
- **Life Drain** [range]: Life Drain [feat] on Aldous; Life Drain [feat] on Osric, the Keeper; Life Drain [feat] on Wight; Life Drain [feat] on Cadoc, the Guardian; Life Drain [feat] on Edda; Life Drain [feat] on Hesper, the Mortician
- **Longbow** [range]: Longbow [weapon] on BF Test Attacker — this world's own; Longbow [weapon] on BF Test Victim — this world's own; Longbow [weapon] on Mother Wend — this world's own; Longbow [weapon] on Hobgoblin Archer — this world's own; Longbow [weapon] on Hobgoblin Warrior — this world's own; Sera's Longbow [weapon] on Selma — this world's own; Longbow [weapon] on BF Test Ranger — this world's own; Longbow [weapon] on Jetten Elisedil — this world's own
- **Mind Sliver** [range]: Mind Sliver [spell] on Gren Greenmantle; Mind Sliver [spell] on BF Test Shielder
- **Missile** [range]: Magic Missile [spell] on Gren Greenmantle; Wand of Magic Missiles [equipment] on Gren Greenmantle; Magic Missile [spell] on Skeletal Mage; Magic Missile [spell] on BF Test Shielder; Wand of Magic Missiles [equipment] on BF Test Shielder; Magic Missile [spell] (phb/spells)
- **Modify Memory** [range]: Modify Memory [spell] on Harrow Vane
- **Needle** [range]: Needles [consumable] on Mother Wend
- **Ray of Enfeeblement** [range]: Ray of Enfeeblement [spell] on Salyth; Ray of Enfeeblement [spell] on BF Test Bard
- **Shortbow** [range]: Shortbow [weapon] on Skeleton 1 — this world's own; Shortbow [weapon] on Skeleton 4 — this world's own; Shortbow [weapon] on Mother Wend — this world's own; Shortbow [weapon] on BF Test Rogue — this world's own; Shortbow [weapon] on Skeletal Mage — this world's own; Shortbow [weapon] on Skeleton 5 — this world's own; Shortbow [weapon] on Skeletal Archer — this world's own; Shortbow [weapon] on Skeleton 3 — this world's own
- **Sling** [range]: Bullets, Sling [consumable] on Mother Wend; Sling [weapon] on Mother Wend — this world's own
- **Sorcerous Burst** [range]: Sorcerous Burst [spell] on Gren Greenmantle; Sorcerous Burst [spell] on BF Test Shielder
- **Surge** [range]: Action Surge [feat] on Morgash the Gravemaker; Action Surge [feat] on BF Test Fighter
- **Telepathic Bond** [range]: Rary's Telepathic Bond [spell] (phb/spells)
- **Thorn** [range]: Hail of Thorns [spell] on Jetten Elisedil; Hail of Thorns [spell] (phb/spells); Wall of Thorns [spell] (phb/spells)
- **Web** [range]: Web [spell] on Gren Greenmantle; Web [spell] on BF Test Shielder

## Keys ceded to a longer label (0)

Where two rows claimed one key, the longer label keeps it, as Automated Animations' search took the longest label contained in a name.


## EXCEPTION · rows no list holds, NOT carried (388)

Neither the books, the base weapons, the creature attacks nor this world hold an ability of this name, so there is no evidence of what kind it is. The first migration keyed each of these as a spell, a feature AND an item — the one place the corpus guessed. **The user ruled that out (2026-09-08): these rows are not carried.** Each is one FX away if it turns out to be wanted: open the Editor, name the ability, and copy the scenes of whatever it should look like.

| Row | AA menu |
| --- | --- |
| Green-Flame Blade | ontoken |
| Heal-disabled | ontoken |
| Starlight Step | preset |
| Thunder Step | preset |
| Abjuration Ward | aefx |
| Arcane Ward | aefx |
| Armor of Agathys | aefx |
| Barkskin | aefx |
| Bless | aefx |
| Concentrating: Blur | aefx |
| Fire Shield | aefx |
| Haste | aefx |
| Shield | aefx |
| Shield of Faith | aefx |
| Slow | aefx |
| Antennae | melee |
| Bash | melee |
| Bone | melee |
| Brutal Strike | melee |
| Butterfly | melee |
| Charge | melee |
| Cutlass | melee |
| Deflect | melee |
| Elemental Strike | melee |
| Falchion | melee |
| Flurry of Blows | melee |
| Force-Empowered Rend | melee |
| Grapple | melee |
| Hoof | melee |
| Interception | melee |
| Katana | melee |
| Katar | melee |
| Lasersword | melee |
| Machete | melee |
| Martial Arts | melee |
| Nagamaki | melee |
| Naginata | melee |
| Nodachi | melee |
| Nunchaku | melee |
| Odachi | melee |
| Open Hand Technique | melee |
| Pan | melee |
| Parry | melee |
| Primal Savagery | melee |
| Punch | melee |
| Quivering Palm | melee |
| Retaliation | melee |
| Shield | melee |
| Shove | melee |
| Stab | melee |
| Steel Wind Strike | melee |
| Stomp | melee |
| Stunning Strike | melee |
| Tachi | melee |
| Tanto | melee |
| Tonfa | melee |
| Trample | melee |
| Unarmed | melee |
| Wakizashi | melee |
| Wing | melee |
| Wrench | melee |
| Yari | melee |
| Yklwa | melee |
| Alchemist's | range |
| Antagonize | range |
| Arcane Firearm | range |
| Automatic | range |
| Beam | range |
| Blood Drain | range |
| Boomerang | range |
| Catapult | range |
| Catapult Munition | range |
| Chakram | range |
| Chaos Bolt | range |
| Charm Ray | range |
| Confusion Ray | range |
| Danse Macabre | range |
| Death Ray | range |
| Disintegration Ray | range |
| Dynamite | range |
| Enemies Abound | range |
| Enervation Ray | range |
| Fear Ray | range |
| Feeblemind | range |
| Force Ballista | range |
| Fragmentation Grenade | range |
| Gear Launcher | range |
| Gnomengarde Grenade | range |
| Grave Bolt | range |
| Grenade | range |
| Gun | range |
| Jim's Glowing Coin | range |
| Kunai | range |
| Laser | range |
| Life Transference | range |
| Lightning Launcher | range |
| Lightning Lure | range |
| Magic Stone | range |
| Missile | range |
| Negative Energy Flood | range |
| Paralyzing Ray | range |
| Petrification Ray | range |
| Psychic Scream | range |
| Ray | range |
| Shuriken | range |
| Siege Boulder | range |
| Sleep Ray | range |
| Slowing Ray | range |
| Smoke Grenade | range |
| Snow Ball | range |
| Soul Cage | range |
| Spittle | range |
| Tasha's Mind Whip | range |
| Telekinetic Ray | range |
| Thorn | range |
| Thunder Gauntlet | range |
| Wounding Ray | range |
| Absorb Elements | ontoken |
| Adventurer's Atlas | ontoken |
| Air Bubble | ontoken |
| Arcane Armor | ontoken |
| Arcane Jolt | ontoken |
| Armor Model | ontoken |
| Ashardalon's Stride | ontoken |
| Beast Bond | ontoken |
| Booming Blade | ontoken |
| Borrowed Knowledge | ontoken |
| Bubbling Cauldron | ontoken |
| Catnap | ontoken |
| Cause Fear | ontoken |
| Ceremony | ontoken |
| Chemical Mastery | ontoken |
| Children of the Night | ontoken |
| Cleansing Touch | ontoken |
| Concentration Check: | ontoken |
| Control | ontoken |
| Create Homunculus | ontoken |
| Create Magen | ontoken |
| Create Spelljamming Helm | ontoken |
| Crown of Stars | ontoken |
| Defense Roll | ontoken |
| Defensive Field | ontoken |
| Deflect Missiles | ontoken |
| Divine Sense | ontoken |
| Divine Strike | ontoken |
| Dream of the Blue Veil | ontoken |
| Drow Poison | ontoken |
| Druid Grove | ontoken |
| Earth Tremor | ontoken |
| Earthbind | ontoken |
| Eldritch Cannon | ontoken |
| Elemental Bane | ontoken |
| Empty Body | ontoken |
| Encode Thoughts | ontoken |
| Experimental Elixir | ontoken |
| Find Greater Steed | ontoken |
| Fizban's Platinum Shield | ontoken |
| Flame Arrows | ontoken |
| Flash of Genius | ontoken |
| Frostbite | ontoken |
| Gaze | ontoken |
| Gift of Gab | ontoken |
| Greater Comprehension | ontoken |
| Guardian of Nature | ontoken |
| Gust | ontoken |
| Healing Surge | ontoken |
| Healing Touch | ontoken |
| Hide in Plain Sight | ontoken |
| Holy Weapon | ontoken |
| Homunculus Servant | ontoken |
| Horrifying Visage | ontoken |
| Hunter's Defense | ontoken |
| Illusory Dragon | ontoken |
| Immolation | ontoken |
| Incite Greed | ontoken |
| Infernal Calling | ontoken |
| Jaw | ontoken |
| Kinetic Jaunt | ontoken |
| Locate | ontoken |
| Maelstrom | ontoken |
| Magic Aura | ontoken |
| Magic Item Tinker | ontoken |
| Magical Tinkering | ontoken |
| Mass Polymorph | ontoken |
| Melf's Minute Meteors | ontoken |
| Mental Prison | ontoken |
| Mighty Fortress | ontoken |
| Mimic | ontoken |
| Mold Earth | ontoken |
| Motivational Speech | ontoken |
| Necrotic Shroud | ontoken |
| Patient Defense | ontoken |
| Perfect Self | ontoken |
| Potion of | ontoken |
| Potion of Greater Healing | ontoken |
| Potion of Superior Healing | ontoken |
| Potion of Supreme Healing | ontoken |
| Power Word | ontoken |
| Power Word Pain | ontoken |
| Primeval Awareness | ontoken |
| Quickened Healing | ontoken |
| Raulothim's Psychic Lance | ontoken |
| Repair | ontoken |
| Restoration | ontoken |
| Sapping Sting | ontoken |
| Scatter | ontoken |
| Shadow of Moil | ontoken |
| Shape Water | ontoken |
| Silvery Barbs | ontoken |
| Skill Empowerment | ontoken |
| Skywrite | ontoken |
| Slime | ontoken |
| Snare | ontoken |
| Song of Rest | ontoken |
| Sorcery Points | ontoken |
| Soul of Artifice | ontoken |
| Spectral Fangs | ontoken |
| Spectral Sword | ontoken |
| Spirit of Death | ontoken |
| Spore | ontoken |
| Steel Defender | ontoken |
| Step of the Wind | ontoken |
| Stillness of Mind | ontoken |
| Summon Draconic Spirit | ontoken |
| Summon Greater Demon | ontoken |
| Summon Lesser Demon | ontoken |
| Summon Shadowspawn | ontoken |
| Sword Burst | ontoken |
| Tasha's Otherworldly Guise | ontoken |
| Temple of the Gods | ontoken |
| Tenser's Transformation | ontoken |
| Tidal Wave | ontoken |
| Tiny Servant | ontoken |
| Tongue | ontoken |
| Unsettling Words | ontoken |
| Vigilant Blessing | ontoken |
| Vortex Warp | ontoken |
| Warp Sense | ontoken |
| Zephyr Strike | ontoken |
| Abi-Dalzim's Horrid Wilting | templatefx |
| Aganazzar's Scorcher | templatefx |
| Aura of Annihilation | templatefx |
| Blade Ring | templatefx |
| Blade Wall | templatefx |
| Bones of the Earth | templatefx |
| Caustic Brew | templatefx |
| Control | templatefx |
| Control Flames | templatefx |
| Control Winds | templatefx |
| Create Bonfire | templatefx |
| Dawn | templatefx |
| Detonate Eldritch Cannon | templatefx |
| Distort Value | templatefx |
| Draconic Transformation | templatefx |
| Dust Devil | templatefx |
| Erupting Earth | templatefx |
| Explosive Cannon | templatefx |
| Flamethrower | templatefx |
| Frost Fingers | templatefx |
| Gate Seal | templatefx |
| Healing Spirit | templatefx |
| Image | templatefx |
| Investiture of Flame | templatefx |
| Investiture of Ice | templatefx |
| Investiture of Stone | templatefx |
| Investiture of Wind | templatefx |
| Maximilian's Earthen Grasp | templatefx |
| Mold Earth | templatefx |
| Nathair's Mischief | templatefx |
| Pyrotechnics | templatefx |
| Rime's Binding Ice | templatefx |
| Shape Water | templatefx |
| Sickening Radiance | templatefx |
| Storm of Radiance | templatefx |
| Storm Sphere | templatefx |
| Sword Burst | templatefx |
| Tidal Wave | templatefx |
| Transmute Rock | templatefx |
| Turn Undead | templatefx |
| Wall of Light | templatefx |
| Wall of Sand | templatefx |
| Wall of Water | templatefx |
| Warding Wind | templatefx |
| Watery Sphere | templatefx |
| Wither and Bloom | templatefx |
| Wrath of Nature | templatefx |
| Enervation | preset |
| Far Step | preset |
| Ingenious Movement | preset |
| Portal Jump | preset |
| Psychic Teleportation | preset |
| Snilloc's Snowball Swarm | preset |
| Spray of Cards | preset |
| Step of the Wind | preset |
| Absorb Acid | aefx |
| Absorb Cold | aefx |
| Absorb Elements | aefx |
| Absorb Fire | aefx |
| Absorb Lightning | aefx |
| Absorb Thunder | aefx |
| Aura of Alacrity | aefx |
| Aura of Conquest | aefx |
| Aura of Courage | aefx |
| Aura of Devotion | aefx |
| Aura of Protection | aefx |
| Aura of the Guardian | aefx |
| Aura of the Sentinel | aefx |
| Bardic Inspiration | aefx |
| Bastion of Law | aefx |
| Befuddle | aefx |
| Blade Ward | aefx |
| Blue Light | aefx |
| Circle of Power | aefx |
| Comic Dancing | aefx |
| Concentrating: Alustriel's Mooncloak | aefx |
| Concentrating: Antilife Shell | aefx |
| Concentrating: Antimagic Field | aefx |
| Concentrating: Aura of Life | aefx |
| Concentrating: Aura of Purity | aefx |
| Concentrating: Aura of Vitality | aefx |
| Concentrating: Cacophonic Shield | aefx |
| Concentrating: Conjure Minor Elementals | aefx |
| Concentrating: Conjure Woodland Beings | aefx |
| Concentrating: Crusader's Mantle | aefx |
| Concentrating: Detect Evil and Good | aefx |
| Concentrating: Detect Magic | aefx |
| Concentrating: Detect Poison and Disease | aefx |
| Concentrating: Dirge | aefx |
| Concentrating: Expeditious Retreat | aefx |
| Concentrating: Holy Aura | aefx |
| Concentrating: Holy Star of Mystra | aefx |
| Concentrating: Investiture of Flame | aefx |
| Concentrating: Investiture of Ice | aefx |
| Concentrating: Investiture of Stone | aefx |
| Concentrating: Investiture of Wind | aefx |
| Concentrating: Invulnerability | aefx |
| Concentrating: Pass without Trace | aefx |
| Concentrating: Primordial Ward | aefx |
| Concentrating: Songal's Elemental Suffusion | aefx |
| Concentrating: Spirit Guardians | aefx |
| Concentrating: Spirit Shroud | aefx |
| Concentrating: Sunbeam | aefx |
| Concentrating: Yolande's Regal Presence | aefx |
| Conjured Minor Elementals | aefx |
| Contagion: Poison | aefx |
| Covered in Acid | aefx |
| Crown of Madness: Charmed | aefx |
| Curse | aefx |
| Diminish Defiance | aefx |
| Draconic Transformation | aefx |
| Dragon Wings | aefx |
| Elemental Attunement | aefx |
| Encased | aefx |
| Ensnaring Strike: Restrained | aefx |
| Entangle: Restrained | aefx |
| Enthralled | aefx |
| Flesh to Stone: | aefx |
| Fortified Intellect | aefx |
| Glittering | aefx |
| Green Light | aefx |
| Guidance | aefx |
| Heat Metal: | aefx |
| Hold Monster: | aefx |
| Hold Person: | aefx |
| Hypnotic Pattern: | aefx |
| Imprisonment: | aefx |
| Infected | aefx |
| Laughing Uncontrollably | aefx |
| Living Legend | aefx |
| Mass Suggestion | aefx |
| On Fire | aefx |
| Protection from Acid | aefx |
| Protection from Cold | aefx |
| Protection from Fire | aefx |
| Protection from Lightning | aefx |
| Protection from Thunder | aefx |
| Resilient Sphere | aefx |
| Resistance: | aefx |
| Sleep: | aefx |
| Stonecunning: Tremorsense | aefx |
| Suggestion | aefx |
| Synaptic Static: Muddled Thoughts | aefx |
| Unbreakable Majesty | aefx |
| Vicious Mockery | aefx |
| Violet Light | aefx |
| Wielding Shadow Blade | aefx |
| Wreathed in Moonlight | aefx |
| Yolande's Regal Presence: Prone | aefx |

## EXCEPTION · keys a row lost to an earlier one, NOT carried (72)

One FX answers one key. Where two rows both earned the same key, Automated Animations' own precedence keeps it — its exact-match rows first, then its menu order — which is what answered at the table under AA. The losing row's FX for THAT key is not written; where the row earned other keys, those are.

| Key | Kept | Not carried |
| --- | --- | --- |
| `weapon:shadow-blade` | Shadow Blade [ontoken] → shadow-blade | Blade [melee] |
| `natural:grave-strike` | Grave Strike [melee] → grave-strike | Strike [melee] |
| `natural:grave-strike-vampire-form-only` | Grave Strike [melee] → grave-strike-vampire-form-only | Strike [melee] |
| `natural:arcane-sword` | Arcane Sword [melee] → arcane-sword | Sword [melee] |
| `natural:unarmed-strike` | Strike [melee] → unarmed-strike | Unarmed Strike [melee] |
| `weapon:warpick` | Pick [melee] → warpick | War Pick [melee] |
| `weapon:war-pick` | Pick [melee] → war-pick | War Pick [melee] |
| `natural:bone-whip` | Bone Whip [melee] → bone-whip | Whip [melee] |
| `weapon:bone-bow` | Bone Bow [range] → bone-bow | Bow [range] |
| `natural:aquatic-burst` | Aquatic Burst [range] → aquatic-burst | Burst [range] |
| `natural:arcane-burst` | Arcane Burst [range] → arcane-burst | Burst [range] |
| `natural:earth-burst` | Burst [range] → earth-burst | Earth Burst [range] |
| `natural:eldritch-burst` | Burst [range] → eldritch-burst | Eldritch Burst [range] |
| `natural:necrotic-burst` | Burst [range] → necrotic-burst | Necrotic Burst [range] |
| `weapon:antimatter-rifle` | Antimatter Rifle [range] → antimatter-rifle | Rifle [range] |
| `weapon:sun-blade` | Blade [melee] → sun-blade | Sun Blade [range] |
| `spell:witch-bolt` | Witch Bolt [preset] → witch-bolt | Witch Bolt [range] |
| `natural:arcane-sword` | Arcane Sword [melee] → arcane-sword | Arcane Sword [ontoken] |
| `spell:cordon-of-arrows` | Cordon of Arrows [range] → cordon-of-arrows | Cordon of Arrows [ontoken] |
| `natural:death-strike` | Strike [melee] → death-strike | Death Strike [ontoken] |
| `natural:gore` | Gore [melee] → gore | Gore [ontoken] |
| `natural:otherworldly-strike` | Strike [melee] → otherworldly-strike | Otherworldly Strike [ontoken] |
| `spell:arcane-gate` | Arcane Gate [ontoken] → arcane-gate | Arcane Gate [templatefx] |
| `spell:arms-of-hadar` | Arms of Hadar [ontoken] → arms-of-hadar | Arms of Hadar [templatefx] |
| `spell:blade-barrier` | Blade Barrier [ontoken] → blade-barrier | Blade Barrier [templatefx] |
| `feature:breath-weapon` | Breath Weapon [templatefx] → breath-weapon | Breath Weapon (Acid) [templatefx] |
| `feature:breath-weapon` | Breath Weapon [templatefx] → breath-weapon | Breath Weapon (Cold) [templatefx] |
| `feature:breath-weapon` | Breath Weapon [templatefx] → breath-weapon | Breath Weapon (Fire) [templatefx] |
| `feature:breath-weapon` | Breath Weapon [templatefx] → breath-weapon | Breath Weapon (Lightning) [templatefx] |
| `feature:breath-weapon` | Breath Weapon [templatefx] → breath-weapon | Breath Weapon (Poison) [templatefx] |
| `spell:call-lightning` | Call Lightning [range] → call-lightning | Call Lightning [templatefx] |
| `spell:circle-of-power` | Circle of Power [ontoken] → circle-of-power | Circle of Power [templatefx] |
| `spell:confusion` | Confusion [ontoken] → confusion | Confusion [templatefx] |
| `spell:control-weather` | Control Weather [ontoken] → control-weather | Control Weather [templatefx] |
| `feature:control-weather` | Control Weather [ontoken] → control-weather-mark | Control Weather [templatefx] |
| `spell:cordon-of-arrows` | Cordon of Arrows [range] → cordon-of-arrows | Cordon of Arrows [templatefx] |
| `spell:demiplane` | Demiplane [ontoken] → demiplane | Demiplane [templatefx] |
| `spell:druidcraft` | Druidcraft [ontoken] → druidcraft | Druidcraft [templatefx] |
| `spell:earthquake` | Earthquake [ontoken] → earthquake | Earthquake [templatefx] |
| `natural:elemental-burst` | Burst [range] → elemental-burst | Elemental Burst [templatefx] |
| `feature:euphoria-breath` | Euphoria Breath [ontoken] → euphoria-breath | Euphoria Breath [templatefx] |
| `spell:fabricate` | Fabricate [ontoken] → fabricate | Fabricate [templatefx] |
| `spell:fire-storm` | Fire Storm [ontoken] → fire-storm | Fire Storm [templatefx] |
| `spell:forcecage` | Forcecage [ontoken] → forcecage | Forcecage [templatefx] |
| `spell:gate` | Gate [ontoken] → gate | Gate [templatefx] |
| `spell:guards-and-wards` | Guards and Wards [ontoken] → guards-and-wards | Guards and Wards [templatefx] |
| `spell:hail-of-thorns` | Hail of Thorns [ontoken] → hail-of-thorns | Hail of Thorns [templatefx] |
| `spell:heroes-feast` | Heroes' Feast [ontoken] → heroes-feast | Heroes' Feast [templatefx] |
| `spell:hunger-of-hadar` | Hunger of Hadar [ontoken] → hunger-of-hadar | Hunger of Hadar [templatefx] |
| `feature:hunger-of-hadar` | Hunger of Hadar [ontoken] → hunger-of-hadar-mark | Hunger of Hadar [templatefx] |
| `spell:ice-knife` | Ice Knife [range] → ice-knife | Ice Knife [templatefx] |
| `spell:magnificent-mansion` | Magnificent Mansion [ontoken] → magnificent-mansion | Magnificent Mansion [templatefx] |
| `spell:meteor-swarm` | Meteor Swarm [ontoken] → meteor-swarm | Meteor Swarm [templatefx] |
| `spell:minor-illusion` | Minor Illusion [ontoken] → minor-illusion | Minor Illusion [templatefx] |
| `spell:move-earth` | Move Earth [ontoken] → move-earth | Move Earth [templatefx] |
| `spell:passwall` | Passwall [ontoken] → passwall | Passwall [templatefx] |
| `spell:planar-ally` | Planar Ally [ontoken] → planar-ally | Planar Ally [templatefx] |
| `spell:plant-growth` | Plant Growth [ontoken] → plant-growth | Plant Growth [templatefx] |
| `spell:private-sanctum` | Private Sanctum [ontoken] → private-sanctum | Private Sanctum [templatefx] |
| `spell:spiritual-weapon` | Spiritual Weapon [ontoken] → spiritual-weapon | Spiritual Weapon [templatefx] |
| `feature:spiritual-weapon` | Spiritual Weapon [ontoken] → spiritual-weapon-mark | Spiritual Weapon [templatefx] |
| `spell:storm-of-vengeance` | Storm of Vengeance [ontoken] → storm-of-vengeance | Storm of Vengeance [templatefx] |
| `spell:symbol` | Symbol [ontoken] → symbol | Symbol [templatefx] |
| `spell:teleportation-circle` | Teleportation Circle [ontoken] → teleportation-circle | Teleportation Circle [templatefx] |
| `spell:tsunami` | Tsunami [ontoken] → tsunami | Tsunami [templatefx] |
| `spell:web` | Web [range] → web | Web [templatefx] |
| `feature:web` | Web [range] → web-bolt | Web [templatefx] |
| `feature:whirlwind` | Whirlwind [ontoken] → whirlwind | Whirlwind [templatefx] |
| `spell:word-of-radiance` | Word of Radiance [ontoken] → word-of-radiance | Word of Radiance [templatefx] |
| `spell:ice-knife` | Ice Knife [range] → ice-knife | Ice Knife [preset] |
| `spell:lightning-arrow` | Lightning Arrow [ontoken] → lightning-arrow | Lightning Arrow [preset] |
| `spell:meteor-swarm` | Meteor Swarm [ontoken] → meteor-swarm | Meteor Swarm [preset] |

## Fx that can never answer (1)

Two fx in the same layer answer the same key for the same kind of moment; the first (AA's own precedence: its exact-match rows, then its menu order) answers, as it did under AA. Listed so nothing is lost silently.

- natural:necrotic-burst (use): "necrotic-burst-bolt" answers; "necrotic-burst-harrow-vane" never will

## Still on the frozen table (10)

These play through AA's own metadata because the libraries' own registration holds no node that plays the same files the same way.

- fxstudio.aa.static.chains.diamond.complete.blue
- fxstudio.aa.static.chains.standard.complete.blue
- fxstudio.aa.static.energy.circle.complete.red
- fxstudio.aa.static.magicsign.abjuration.runecomplete.blue
- fxstudio.aa.static.magicsign.conjuration.runecomplete.yellow
- fxstudio.aa.static.magicsign.divination.runecomplete.blue
- fxstudio.aa.static.magicsign.enchantment.runecomplete.pink
- fxstudio.aa.static.magicsign.transmutation.runecomplete.yellow
- fxstudio.aa.static.smoke.plume.complete
- fxstudio.aa.static.vines.complete.nature.green

## The census in the new keys — what changes for the user

Every ability on the world's actors, keyed by identity and resolved against the new corpus, beside what Automated Animations' name search answered.

### A different fx now (25)

- Enthralled Bullywug Warrior (npc) / Insectile Rapier [weapon] · keys weapon:insectile-rapier/attack, weapon:insectile-rapier, weapon:rapier/attack, weapon:rapier · was Rapier [melee] · now insectile-rapier (weapon:insectile-rapier)
- Gren Greenmantle (character) / Bog Staff [weapon] · keys natural:bog-staff/attack, natural:bog-staff · was Staff [melee] · now bog-staff (natural:bog-staff)
- Harrow Vane (npc) / Vesper Staff [weapon] · keys weapon:vesper-staff/attack, weapon:vesper-staff, weapon:quarterstaff/attack, weapon:quarterstaff · was Staff [melee] · now quarterstaff (weapon:quarterstaff)
- Hobgoblin Shaman (npc) / Vine Staff [weapon] · keys natural:vine-staff/attack, natural:vine-staff · was Staff [melee] · now vine-staff (natural:vine-staff)
- Aldous (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Aldous (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Osric, the Keeper (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Osric, the Keeper (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Mother Wend (npc) / Heavy Crossbow [weapon] · keys weapon:heavy-crossbow/attack, weapon:heavy-crossbow, weapon:heavycrossbow/attack, weapon:heavycrossbow · was Crossbow [range] · now heavy-crossbow (weapon:heavy-crossbow)
- Mother Wend (npc) / Wooden staff [weapon] · keys weapon:wooden-staff/attack, weapon:wooden-staff, weapon:quarterstaff/attack, weapon:quarterstaff · was Staff [melee] · now wooden-staff (weapon:wooden-staff)
- Mother Wend (npc) / Light Crossbow [weapon] · keys weapon:light-crossbow/attack, weapon:light-crossbow, weapon:lightcrossbow/attack, weapon:lightcrossbow · was Crossbow [range] · now light-crossbow (weapon:light-crossbow)
- Mother Wend (npc) / Hand Crossbow [weapon] · keys weapon:hand-crossbow/attack, weapon:hand-crossbow, weapon:handcrossbow/attack, weapon:handcrossbow · was Crossbow [range] · now hand-crossbow (weapon:hand-crossbow)
- Mother Wend (npc) / Marn's Light Crossbow [weapon] · keys weapon:marns-light-crossbow/attack, weapon:marns-light-crossbow, weapon:lightcrossbow/attack, weapon:lightcrossbow · was Crossbow [range] · now lightcrossbow (weapon:lightcrossbow)
- Mother Wend (npc) / Light Hammer [weapon] · keys weapon:light-hammer/attack, weapon:light-hammer, weapon:lighthammer/attack, weapon:lighthammer · was Hammer [melee] · now light-hammer (weapon:light-hammer)
- Wight (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Wight (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Sharran Enforcer (npc) / Heavy Crossbow [weapon] · keys weapon:heavy-crossbow/attack, weapon:heavy-crossbow, weapon:heavycrossbow/attack, weapon:heavycrossbow · was Crossbow [range] · now heavy-crossbow (weapon:heavy-crossbow)
- Enthralled Bullywug Bog Sage (npc) / Bog Staff [weapon] · keys natural:bog-staff/attack, natural:bog-staff · was Staff [melee] · now bog-staff (natural:bog-staff)
- The Party (group) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- BF Test Shielder (character) / Bog Staff [weapon] · keys natural:bog-staff/attack, natural:bog-staff · was Staff [melee] · now bog-staff (natural:bog-staff)
- Cadoc, the Guardian (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Edda (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Edda (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Hesper, the Mortician (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Hesper, the Mortician (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)

### Play now, played nothing under AA (2)

- Morgash the Gravemaker (character) / Maul of Momentum [weapon] · keys weapon:maul-of-momentum/attack, weapon:maul-of-momentum, weapon:maul/attack, weapon:maul · was nothing · now maul (weapon:maul)
- BF Test Fighter (character) / Maul of Momentum [weapon] · keys weapon:maul-of-momentum/attack, weapon:maul-of-momentum, weapon:maul/attack, weapon:maul · was nothing · now maul (weapon:maul)

### Play nothing now, played under AA (10)

- Gren Greenmantle (character) / Spellfire Burst [feat] · keys feature:spellfire-burst/heal, feature:spellfire-burst · was Burst [range] · now nothing
- Gren Greenmantle (character) / Wand of Magic Missiles [equipment] · keys item:wand-of-magic-missiles/cast, item:wand-of-magic-missiles · was Missile [range] · now nothing
- Gren Greenmantle (character) / Shield [spell] · keys spell:shield/utility, spell:shield · was Shield [melee] · now nothing
- Mother Wend (npc) / Horn [tool] · keys item:horn/check, item:horn · was Horn [melee] · now nothing
- Mother Wend (npc) / Chain [consumable] · keys item:chain/check, item:chain · was Chain [melee] · now nothing
- Skeletal Mage (npc) / Shield [spell] · keys spell:shield/utility, spell:shield · was Shield [melee] · now nothing
- BF Test Shielder (character) / Spellfire Burst [feat] · keys feature:spellfire-burst/heal, feature:spellfire-burst · was Burst [range] · now nothing
- BF Test Shielder (character) / Wand of Magic Missiles [equipment] · keys item:wand-of-magic-missiles/cast, item:wand-of-magic-missiles · was Missile [range] · now nothing
- BF Test Shielder (character) / Shield [spell] · keys spell:shield/utility, spell:shield · was Shield [melee] · now nothing
- Cadoc, the Guardian (npc) / Necrotic Scythe [weapon] · keys natural:necrotic-scythe/attack, natural:necrotic-scythe · was Scythe [melee] · now nothing

### NPC attacks

202 attack weapons on the world's NPCs: 157 answered by the weapon's own name, 4 by its base weapon, 35 as a natural attack, 6 nothing.

- by base weapon, e.g. Vesper Staff → weapon:quarterstaff; Sera's Shortsword → weapon:shortsword; Marn's Light Crossbow → weapon:lightcrossbow; Sera's Longbow → weapon:longbow
- as a natural attack, e.g. Claw → natural:claw; Bite → natural:bite; Necrotic Burst → natural:necrotic-burst; Vine Staff → natural:vine-staff; Slam → natural:slam; Necrotic Sword → natural:necrotic-sword; Claw → natural:claw; Necrotic Sword → natural:necrotic-sword; Gore → natural:gore; Talons → natural:talons
- nothing: Battleaxe; Smother; Necrotic Scythe; Constricting Vine

### Nothing plays yet — the party's sheets

- **Gren Greenmantle** (37 of 57 play; 20 nothing): Spellfire Burst [feat]; Driftglobe [equipment]; Wand of the War Mage +1 [equipment]; Torch [consumable]; Fey-Touched [feat]; Candle [consumable]; Tinderbox [equipment]; Manacles [consumable]; Aura of Vitality [spell]; Oil [consumable]; Wand of Magic Missiles [equipment]; Subtle Spell [feat]; Three-dragon ante [tool]; Magic Initiate [feat]; Pearl of Power [equipment]; Shield [spell]; Rope [consumable]; Antitoxin [consumable]; Lesser Restoration [spell]; Careful Spell [feat]
- **Morgash the Gravemaker** (11 of 25 play; 14 nothing): Riposte [feat]; Smith's Tools [tool]; Tinderbox [equipment]; Cook's Utensils [tool]; Great Weapon Master [feat]; The Graveheart [equipment]; Precision Attack [feat]; Healer's Kit [consumable]; Keoghtom's Ointment [consumable]; Torch [consumable]; Rope [consumable]; Rally [feat]; Antitoxin [consumable]; Dice [tool]
- **Salyth** (21 of 30 play; 9 nothing): Flute [tool]; Lute [tool]; The Graveheart [equipment]; Bullseye Lantern [consumable]; Moon's Inspiration [feat]; Tinderbox [equipment]; Blessing of Moonlight [feat]; Water (Pint) [consumable]; Oil [consumable]
- **Thomas A. Invictus** (30 of 47 play; 17 nothing): Shield Master [feat]; Lantern, Hooded [equipment]; Fine Clothes [equipment]; Healer [feat]; Wrathful Smite [spell]; Thunderous Smite [spell]; Lantern of Revealing [equipment]; Searing Smite [spell]; Resourceful [feat]; Detect Magic [spell]; Healer's Kit [consumable]; Shield of Faith [spell]; Detect Evil and Good [spell]; Detect Poison and Disease [spell]; Shining Smite [spell]; Torch [consumable]; Antitoxin [consumable]
- **Jetten Elisedil** (23 of 35 play; 12 nothing): Torch [consumable]; Favored Enemy [feat]; Rope [consumable]; Healer's Kit [consumable]; Tinderbox [equipment]; Bullseye Lantern [consumable]; Antitoxin [consumable]; Magic Initiate [feat]; Cartographer's Tools [tool]; Elven Lineage, Wood Elf [feat]; Pass without Trace [spell]; Oil [consumable]

### Effects on the world's actors (162 names, 27 with an FX)

- Bloodied: nothing
- Shard-Hardened (Natural Armor): nothing
- War Mage +3: nothing
- War Mage +1: nothing
- War Mage +2: nothing
- Wand of the War Mage +1: nothing
- Wand of the War Mage, +1: nothing
- Wand of the War Mage, +2: nothing
- Wand of the War Mage, +3: nothing
- Spell Changes: nothing
- Bestial Communication: nothing
- Manacled: nothing
- Survival Guidance: nothing
- Intimidation Guidance: nothing
- Performance Guidance: nothing
- Acrobatic Guidance: nothing
- Nature Guidance: nothing
- Deception Guidance: nothing
- Investigation Guidance: nothing
- Stealth Guidance: nothing
- Medicine Guidance: nothing
- Arcana Guidance: nothing
- Insight Guidance: nothing
- History Guidance: nothing
- Persuasion Guidance: nothing
- Religion Guidance: nothing
- Sleight of Hand Guidance: nothing
- Perception Guidance: nothing
- Athletic Guidance: nothing
- Animal Handling Guidance: nothing
- Slivered: nothing
- Duplicate A: nothing
- Duplicate B: nothing
- Duplicate C: nothing
- Gnomish Cunning: nothing
- Paralyzed: nothing
- Antitoxin: nothing
- Innate Sorcery: nothing
- Lucky: nothing
- Bravery: nothing
- Restrained: nothing
- Cannot Lie: nothing
- Memory Modification: nothing
- Death Armor: nothing
- The Duskheart: nothing
- Invisible: nothing
- Bonus AC/Saves: +1: nothing
- Vesper Staff: nothing
- Booming Voice: nothing
- Half Speed: nothing
- True Strike: nothing
- Unstoppable Drive: nothing
- The Graveheart: nothing
- Tough: nothing
- Trapped: nothing
- Tripped: nothing
- Initiative Advantage: nothing
- Disguised: nothing
- Pursuing Suggestion: nothing
- Hexed Intelligence: nothing
- Hexed Dexterity: nothing
- Hexed Constitution: nothing
- Hexed Wisdom: nothing
- Hexed Strength: nothing
- Hexed Charisma: nothing
- Cunning Strike: Tripped: nothing
- Cunning Strike: Poisoned: nothing
- Devious Strikes: Knocked Out: nothing
- Devious Strikes: Blinded: nothing
- Devious Strikes: Dazed: nothing
- Assasinate: nothing
- Grappled + Other Conditions: nothing
- Blocked Healing: nothing
- Inspired: nothing
- Enervated: nothing
- Brief Enfeeblement: nothing
- Poisoned: nothing
- Shocked: nothing
- Lunar Vitality: nothing
- Blinded: nothing
- Blessed by Moonlight: nothing
- Blessing of Moonlight: nothing
- Jack of All Trades: nothing
- Prone: nothing
- Hunter's Mark: nothing
- Flying Steed: nothing
- Vow of Enmity: nothing
- Shield Bashed: nothing
- Ogre Strength: nothing
- Divine Sense: nothing
- Compelled: nothing
- Magic Weapon +2: nothing
- Magic Weapon +3: nothing
- Magic Weapon +1: nothing
- Detect Magic: nothing
- Detect Evil and Good: nothing
- Detect Poison and Disease: nothing
- Level 4: +15 Max HP: nothing
- Level 8: +35 Max HP: nothing
- Level 5: +20 Max HP: nothing
- Level 2: +5 Max HP: nothing
- Level 9: +40 Max HP: nothing
- Level 3: +10 Max HP: nothing
- Level 7: +30 Max HP: nothing
- Level 6: +25 Max HP: nothing
- Healed by Prayer: nothing
- Speaking with Plants: nothing
- Necrotic Resistance: nothing
- Psychic Resistance: nothing
- Force Resistance: nothing
- Cold Resistance: nothing
- Radiant Resistance: nothing
- Fire Resistance: nothing
- Poison Resistance: nothing
- Lightning Resistance: nothing
- Thunder Resistance: nothing
- Acid  Resistance: nothing
- Reduced: nothing
- Enlarged: nothing
- Water Breather: nothing
- Climber: nothing
- Strength of Hills: nothing
- The Tideheart: nothing
- Blindness: nothing
- Deafness: nothing
- Grappled: nothing
- Failure: Dead: nothing
- Ambusher's Leap: nothing
- Dread Ambusher: nothing
- Archery Style: nothing
- Bonus Damage: Bows: nothing
- Bow Proficiencies: nothing
- Concealed: nothing
- Umbral Sight: nothing
- Stealth Advantage: nothing
