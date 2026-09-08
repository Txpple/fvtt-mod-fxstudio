# Migration report — Automated Animations → FX Studio fx

Run 2026-09-08 from phase 1's lossless rows (Automated Animations 7.0.22, D&D5e Animations 3.3.0) against JB2A 0.9.3, PSFX 0.17.0, Sequencer 4.2.3, dnd5e null. Regenerate with `node tools/migrate-aa.mjs --write`.

## Numbers

| Measure | Count |
| --- | --- |
| Rows in (stock / house) | 1289 / 7 |
| Fx out (stock / house) | 1554 / 7 |
| · keyed by the closed lists (a spell, feature, item or weapon the books or the world hold) | 694 |
| · family rows expanded against the base weapons, the natural attacks and the world's weapons | 224 |
| · effect rows, keyed by the effect's name | 184 |
| · names no list holds — NOT carried, see the exceptions below | 194 |
| · weapon words that also caught a spell, a feat or an item under AA (listed, not carried) | 26 |
| AA paths | 496 |
| · now the libraries' own path with the same files and structure | 19 |
| · now a list of the libraries' own leaves | 352 |
| · now the libraries' own by-distance nodes (a variant at random, then the distance, as AA picked) | 83 |
| · now the raw files AA picked out of a larger set | 32 |
| · AA's stretch metadata carried on the scene (`template`) | 69 |
| **· still on the frozen table (the measurement; goal zero)** | **10** (loop markers differ 10, picked by distance 0, no such node 0) |
| Frozen table entries shipped | 15 |
| **Render-level proof: fx equal to AA's own sequence** | **1561 of 1561** (4480 of 4591 moments exactly, 111 by a named allowance below) |
| Abilities on the world's actors | 736 |
| · same answer as under AA | 694 |
| · a different fx now | 31 |
| · play now, played nothing under AA | 2 |
| · play nothing now, played under AA | 9 |
| Fx that can never answer (a same-key fx of the same layer comes first) | 1 |

## What the proof allows, by name

The proof compares what Sequencer is told, section by section, in a canonical form: the order of calls inside a section is ignored (they set properties); a call stating Sequencer's own default is dropped (opacity 1, delay 0, fade 0, rotate 0, zIndex 0, rate 1, one repeat, missed false, below-tokens false, anchor ½ ½); option keys that are false, zero or empty are dropped; a token is its centre for a location and its id for an attachment; names, origins and document ties are dropped (the engine stamps every picture with its origin and ties every picture of an effect to it, a superset of what AA stamped that changes no picture); a path is compared by what it plays — the files, the stretch template and the loop markers — not its spelling; thenDo sections by count.

Deliberate differences, each a choice of the model over AA's accident. Those the proof met are counted (moments):

- **6** × a bolt from inside a standing area, with none standing, leaves from the caster's centre (AA left from the token's top-left corner)
- **7** × a follow-up mark with nothing to land on plays no sound (AA played its sound anyway)
- **89** × an FX whose pictures need a target plays nothing, sound included, when nothing is targeted (AA played the sound alone)
- **4** × a mark that falls back to the caster honours the FX's delay (AA dropped it there)
- **5** × the same pictures start in a different order with no wait between them (a shield's bottom halves first, then its top halves)
- a swing and a bolt at several targets some in reach and some beyond: the engine plays all the swings, then all the flights, then the follow-up marks once over every target; AA interleaved them per group and played the follow-up sound per group (the proof's mixed-reach case is not in the canonical moments; the single-reach cases are)
- a follow-up mark that waits: the engine waits after the last target it plays on; AA waited after the last of all the moment's targets
- a picture on both the caster and the targets: the follow-up mark plays once over both with one sound; AA played it twice, once per group, with its sound each time
- a mark or an aura sized in token widths measures the token as its image is drawn (scale and ring included), everywhere; AA's teleport marks and swings used the bare footprint
- the hundred-millisecond pause before every animation (AA's "global delay" world setting) is gone; the reader's own half-second wait for a Region to be drawn stays
- the range ring of a move is shown to everyone and measured alternating; AA's switches for hiding it and measuring equidistant were used by no row

## Rows translated with a note (402)

- Antennae [melee] → weapon:antennae: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Antennae [melee] → natural:antennae: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → natural:mercurial-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:frost-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:berserker-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:pact-axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → weapon:axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Axe [melee] → natural:axe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bash [melee] → natural:shield-bash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bash [melee] → weapon:bash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bash [melee] → natural:bash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Baton [melee] → natural:bejeweled-baton: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Baton [melee] → weapon:baton: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Baton [melee] → natural:baton: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:beak: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:beaks: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:sharpened-beak: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beak [melee] → natural:beak-raven-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Beard [melee] → natural:beard: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:heated-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:lightning-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:storm-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:chaos-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:clockwork-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:psi-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:beheading-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:whirling-blades: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:dread-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:force-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:psychic-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:pact-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:luck-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:sun-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:dragon-tooth-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:dread-blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → weapon:blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Blade [melee] → natural:blade: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bone [melee] → weapon:bone: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bone [melee] → natural:bone: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Bone Whip [melee] → natural:bone-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Brutal Strike [melee] → weapon:brutal-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Brutal Strike [melee] → natural:brutal-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Butterfly [melee] → weapon:butterfly: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Butterfly [melee] → natural:butterfly: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Chain [melee] → weapon:chain: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Chain [melee] → natural:chain: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Charge [melee] → weapon:charge: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Charge [melee] → natural:charge: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claws: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:devilish-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:banishing-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:chaos-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:elemental-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:fearsome-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:injecting-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:mutating-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:spectral-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:umbral-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claws-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claw-oni-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claw-fiend-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claw-bear-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claws-hag-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claw-tiger-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:claws-yugoloth-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:rotting-claw-putrid-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:rotting-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Claw [melee] → natural:eldritch-claw: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → natural:stone-club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:tree-club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:club-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:vicious-club: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:club-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Club [melee] → weapon:club-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Cutlass [melee] → weapon:cutlass: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Cutlass [melee] → natural:cutlass: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Elemental Strike [melee] → weapon:elemental-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Elemental Strike [melee] → natural:elemental-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Falchion [melee] → weapon:falchion: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Falchion [melee] → natural:falchion: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fist [melee] → natural:fist: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fist [melee] → natural:rotting-fist: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fist [melee] → natural:clenched-fist: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → natural:bone-flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:flail-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:vicious-flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:flail-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:flail-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flail [melee] → weapon:elemental-flail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flurry of Blows [melee] → weapon:flurry-of-blows: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Flurry of Blows [melee] → natural:flurry-of-blows: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Force-Empowered Rend [melee] → weapon:force-empowered-rend: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Force-Empowered Rend [melee] → natural:force-empowered-rend: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Foreleg [melee] → natural:foreleg: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fork [melee] → natural:searing-fork: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fork [melee] → weapon:infernal-fork: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fork [melee] → weapon:fork: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Fork [melee] → natural:fork: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gear [melee] → natural:gear: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:abyssal-glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:infernal-glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:glaive-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:glaive-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:vicious-glaive: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Glaive [melee] → weapon:glaive-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gore [melee] → natural:gore: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gore [melee] → natural:brutal-gore: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gore [melee] → natural:gore-boar-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Gouge [melee] → natural:gouge: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Grapple [melee] → weapon:grapple: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Grapple [melee] → natural:grapple: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Grave Strike [melee] → natural:grave-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Grave Strike [melee] → natural:grave-strike-vampire-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:greataxe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:greataxe-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:greataxe-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:giant-slayer-greataxe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:vicious-greataxe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:greataxe-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greataxe [melee] → weapon:berserker-greataxe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:greatclub: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:thunderous-greatclub: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:greatclub-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:greatclub-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:greatclub-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatclub [melee] → weapon:vicious-greatclub: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:vorpal-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:greatsword-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:holy-avenger-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:vicious-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:greatsword-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:flame-tongue-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:luck-blade-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:greatsword-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:giant-slayer-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:defender-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:dragon-slayer-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:nine-lives-stealer-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:frost-brand-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:dancing-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Greatsword [melee] → weapon:ember-touched-greatsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Halberd [melee] → weapon:halberd: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Halberd [melee] → weapon:halberd-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Halberd [melee] → weapon:halberd-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Halberd [melee] → weapon:vicious-halberd: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Halberd [melee] → weapon:halberd-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Hoof [melee] → weapon:hoof: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Hoof [melee] → natural:hoof: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Hook [melee] → natural:hook: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Hooves [melee] → natural:hooves: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Horn [melee] → natural:horn: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Horn [melee] → natural:radiant-horn: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Horn [melee] → natural:horns: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Interception [melee] → weapon:interception: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Interception [melee] → natural:interception: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Katana [melee] → weapon:katana: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Katana [melee] → natural:katana: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Katar [melee] → weapon:katar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Katar [melee] → natural:katar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:vine-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:aquatic-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:caustic-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:tentacle-lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → weapon:lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Lash [melee] → natural:lash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → natural:radiant-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → natural:radiant-mace-defender-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:fiery-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:holy-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:thunderous-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:mace-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:vicious-mace: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:mace-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Mace [melee] → weapon:mace-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Machete [melee] → weapon:machete: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Machete [melee] → natural:machete: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Martial Arts [melee] → weapon:martial-arts: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Martial Arts [melee] → natural:martial-arts: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → weapon:maul: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → natural:earthen-maul: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → weapon:maul-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → weapon:vicious-maul: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → weapon:maul-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Maul [melee] → weapon:maul-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Nagamaki [melee] → weapon:nagamaki: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Nagamaki [melee] → natural:nagamaki: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Naginata [melee] → weapon:naginata: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Naginata [melee] → natural:naginata: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Nodachi [melee] → weapon:nodachi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Nodachi [melee] → natural:nodachi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Nunchaku [melee] → weapon:nunchaku: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Nunchaku [melee] → natural:nunchaku: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Odachi [melee] → weapon:odachi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Odachi [melee] → natural:odachi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Open Hand Technique [melee] → weapon:open-hand-technique: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Open Hand Technique [melee] → natural:open-hand-technique: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pan [melee] → weapon:pan: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pan [melee] → natural:pan: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Parry [melee] → weapon:parry: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Parry [melee] → natural:parry: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:warpick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:war-pick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:war-pick-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:vicious-war-pick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:war-pick-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:war-pick-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → weapon:pick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pick [melee] → natural:pick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pincer [melee] → natural:pincer: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Primal Savagery [melee] → weapon:primal-savagery: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Primal Savagery [melee] → natural:primal-savagery: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pseudopod [melee] → natural:pseudopod: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Pseudopod [melee] → natural:dissolving-pseudopod: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Punch [melee] → weapon:punch: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Punch [melee] → natural:punch: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quarterstaff [melee] → weapon:quarterstaff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quarterstaff [melee] → weapon:quarterstaff-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quarterstaff [melee] → weapon:quarterstaff-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quarterstaff [melee] → weapon:vicious-quarterstaff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quarterstaff [melee] → weapon:quarterstaff-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quivering Palm [melee] → weapon:quivering-palm: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Quivering Palm [melee] → natural:quivering-palm: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rake [melee] → natural:rake: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Ram [melee] → natural:ram: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:dancing-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:flame-tongue-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:giant-slayer-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:nine-lives-stealer-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:rapier-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:dragon-slayer-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:rapier-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:defender-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:frost-brand-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:vicious-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:holy-avenger-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:luck-blade-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:rapier-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rapier [melee] → weapon:insectile-rapier: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Ravage [melee] → natural:ravage: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend-jackal-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend-bear-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:rend-dire-wolf-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Rend [melee] → natural:mind-rend: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Retaliation [melee] → weapon:retaliation: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Retaliation [melee] → natural:retaliation: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:frost-brand-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:scimitar-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:nine-lives-stealer-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:luck-blade-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:vicious-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:vorpal-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:defender-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:holy-avenger-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:scimitar-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:scimitar-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:giant-slayer-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:dragon-slayer-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:dancing-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scimitar [melee] → weapon:flame-tongue-scimitar: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scratch [melee] → natural:scratch: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scythe [melee] → natural:dread-scythe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scythe [melee] → natural:necrotic-scythe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scythe [melee] → weapon:scythe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Scythe [melee] → natural:scythe: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shield [melee] → weapon:shield: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shield [melee] → natural:shield: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:vicious-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:nine-lives-stealer-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:frost-brand-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:dragon-slayer-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:flame-tongue-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:shortsword-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:holy-avenger-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:defender-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:luck-blade-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:shortsword-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:dancing-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:giant-slayer-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:shortsword-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shortsword [melee] → weapon:seras-shortsword: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shove [melee] → weapon:shove: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Shove [melee] → natural:shove: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → weapon:sickle: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → natural:ritual-sickle: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → weapon:vicious-sickle: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → weapon:sickle-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → weapon:sickle-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sickle [melee] → weapon:sickle-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:thunderous-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:avalanche-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:object-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:rotting-slam: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slam [melee] → natural:slam-human-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slash [melee] → natural:slash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Slash [melee] → natural:darkflame-slash: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Snake Hair [melee] → natural:snake-hair: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Spike [melee] → natural:tail-spike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Spike [melee] → weapon:spike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Spike [melee] → natural:spike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stab [melee] → weapon:stab: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stab [melee] → natural:stab: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:vine-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:bog-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:chaos-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → natural:pincer-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:wooden-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:forest-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:wind-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Staff [melee] → weapon:vesper-staff: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Steel Wind Strike [melee] → weapon:steel-wind-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Steel Wind Strike [melee] → natural:steel-wind-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stick [melee] → natural:hex-stick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stick [melee] → weapon:stick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stick [melee] → natural:stick: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sting [melee] → natural:sting: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sting [melee] → natural:infernal-sting: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Sting [melee] → natural:sting-bite-in-beast-form: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stinger [melee] → natural:stinger: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stinger [melee] → natural:tail-stinger: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stomp [melee] → natural:stomp: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:unarmed-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:abyssal-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:beguiling-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:draconic-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:otherworldly-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:psi-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:shadow-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:lightning-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:unarmed-strike-vampire-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:beasts-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:fiery-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:fiery-strike-devil-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:death-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → weapon:unarmed-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → weapon:strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Strike [melee] → natural:strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stunning Strike [melee] → weapon:stunning-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Stunning Strike [melee] → natural:stunning-strike: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tachi [melee] → weapon:tachi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tachi [melee] → natural:tachi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tail [melee] → natural:tail: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Talon [melee] → natural:talons: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Talon [melee] → weapon:talon: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Talon [melee] → natural:talon: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tanto [melee] → weapon:tanto: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tanto [melee] → natural:tanto: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tonfa [melee] → weapon:tonfa: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tonfa [melee] → natural:tonfa: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Trample [melee] → weapon:trample: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Trample [melee] → natural:trample: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tusk [melee] → natural:tusk: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tusk [melee] → natural:tusk-boar-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Tusk [melee] → natural:tusks-boar-or-hybrid-form-only: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Unarmed [melee] → weapon:unarmed: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Unarmed [melee] → natural:unarmed: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Wakizashi [melee] → weapon:wakizashi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Wakizashi [melee] → natural:wakizashi: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Warhammer [melee] → weapon:warhammer: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Warhammer [melee] → weapon:warhammer-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Warhammer [melee] → weapon:vicious-warhammer: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Warhammer [melee] → weapon:warhammer-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Warhammer [melee] → weapon:warhammer-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → natural:flame-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:whip-2: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:whip-3: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:whip-1: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:vicious-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Whip [melee] → weapon:mercurial-whip: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Wing [melee] → weapon:wing: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Wing [melee] → natural:wing: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Wrench [melee] → weapon:wrench: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
- Wrench [melee] → natural:wrench: thrown: the switch was on but named no flight; nothing is thrown (as under AA)
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

## The family rows, expanded (224)

Each of Automated Animations' weapon and creature-attack rows matched a word inside a name. Here each is expanded once, against the base weapons (dnd5e's list), the natural attacks of the installed creatures, and the world's own weapons, and the keys are written down. Read what each word would and would not have caught; a wanted catch that is missing is one house fx away.

- **Antennae** [melee] → weapon:antennae, natural:antennae
- **Arcane Sword** [melee] → natural:arcane-sword
  - natural:arcane-sword (1 creatures)
  - natural:arcane-sword ← Arcane Sword (1 creatures (Helmed Horror))
- **Axe** [melee] → natural:mercurial-axe, weapon:frost-axe, weapon:berserker-axe, weapon:pact-axe, weapon:axe, natural:axe
  - natural:mercurial-axe ← Mercurial Axe (1 creatures (Nycaloth))
  - weapon:frost-axe ← Frost Axe (dnd5e/monsterfeatures24)
  - weapon:berserker-axe ← Berserker Axe (dnd5e/equipment24)
  - weapon:pact-axe ← Pact Axe (mm/features)
- **Bash** [melee] → natural:shield-bash, weapon:bash, natural:bash
  - natural:shield-bash ← Shield Bash (1 creatures (Gladiator))
- **Baton** [melee] → natural:bejeweled-baton, weapon:baton, natural:baton
  - natural:bejeweled-baton ← Bejeweled Baton (1 creatures (Performer Legend))
- **Beak** [melee] → natural:beak, natural:beaks, natural:sharpened-beak, natural:beak-raven-or-hybrid-form-only
  - natural:beak (28 creatures)
  - natural:beak ← Beak (28 creatures (Axe Beak, Blood Hawk, Grell))
  - natural:beaks ← Beaks (3 creatures (Swarm of Ravens))
  - natural:sharpened-beak ← Sharpened Beak (1 creatures (Giant Axe Beak))
  - natural:beak-raven-or-hybrid-form-only ← Beak (Raven or Hybrid Form Only) (1 creatures (Wereraven))
- **Beard** [melee] → natural:beard
  - natural:beard (3 creatures)
  - natural:beard ← Beard (3 creatures (Bearded Devil))
- **Blade** [melee] → natural:heated-blade, natural:lightning-blade, natural:storm-blade, natural:chaos-blade, natural:clockwork-blade, natural:psi-blade, natural:beheading-blade, natural:whirling-blades, natural:dread-blade, natural:force-blade, weapon:psychic-blade, weapon:pact-blade, weapon:luck-blade, weapon:sun-blade, weapon:dragon-tooth-blade, weapon:dread-blade, weapon:shadow-blade, weapon:blade, natural:blade
  - natural:heated-blade ← Heated Blade (2 creatures (Efreeti))
  - natural:lightning-blade ← Lightning Blade (2 creatures (Balor))
  - natural:storm-blade ← Storm Blade (2 creatures (Djinni))
  - natural:chaos-blade ← Chaos Blade (1 creatures (Death Slaad))
  - natural:clockwork-blade ← Clockwork Blade (1 creatures (Modron Duodrone))
  - natural:psi-blade ← Psi Blade (1 creatures (Githyanki Warrior))
  - natural:beheading-blade ← Beheading Blade (1 creatures (Dullahan))
  - natural:whirling-blades ← Whirling Blades (1 creatures (Gallows Speaker))
  - natural:dread-blade ← Dread Blade (1 creatures (Ramya Vasavadan))
  - natural:force-blade ← Force Blade (1 creatures (Inquisitor of the Tome))
  - weapon:psychic-blade ← Psychic Blade (phb/classes)
  - weapon:pact-blade ← Pact Blade (dnd5e/monsterfeatures24)
  - weapon:luck-blade ← Luck Blade (dnd5e/equipment24)
  - weapon:sun-blade ← Sun Blade (dnd5e/equipment24)
  - weapon:dragon-tooth-blade ← Dragon-Tooth Blade (mm/features)
  - weapon:dread-blade ← Dread Blade (mm/features)
  - weapon:shadow-blade ← Shadow Blade (mm/features)
- **Bone** [melee] → weapon:bone, natural:bone
- **Bone Whip** [melee] → natural:bone-whip
  - natural:bone-whip (2 creatures)
  - natural:bone-whip ← Bone Whip (2 creatures (Gnoll Pack Lord, Kuo-toa Monitor))
- **Brutal Strike** [melee] → weapon:brutal-strike, natural:brutal-strike
- **Butterfly** [melee] → weapon:butterfly, natural:butterfly
- **Chain** [melee] → weapon:chain, natural:chain
  - weapon:chain (dnd5e/monsterfeatures24)
  - natural:chain (1 creatures)
  - natural:chain ← Chain (1 creatures (Chain Devil))
  - weapon:chain ← Chain (dnd5e/monsterfeatures24)
- **Charge** [melee] → weapon:charge, natural:charge
- **Claw** [melee] → natural:claw, natural:claws, natural:devilish-claw, natural:banishing-claw, natural:chaos-claw, natural:elemental-claw, natural:fearsome-claw, natural:injecting-claw, natural:mutating-claw, natural:spectral-claw, natural:umbral-claw, natural:claws-hybrid-form-only, natural:claw-oni-form-only, natural:claw-fiend-form-only, natural:claw-bear-or-hybrid-form-only, natural:claws-hag-form-only, natural:claw-tiger-or-hybrid-form-only, natural:claws-yugoloth-only, natural:rotting-claw-putrid-only, natural:rotting-claw, natural:eldritch-claw
  - natural:claw (127 creatures)
  - natural:claw ← Claw (127 creatures (Abominable Yeti, Bone Devil, Brown Bear))
  - natural:claws ← Claws (34 creatures (Allosaurus, Barbed Devil, Mezzoloth))
  - natural:devilish-claw ← Devilish Claw (2 creatures (Pit Fiend))
  - natural:banishing-claw ← Banishing Claw (1 creatures (Arcanaloth))
  - natural:chaos-claw ← Chaos Claw (1 creatures (Gray Slaad))
  - natural:elemental-claw ← Elemental Claw (1 creatures (Elemental Cultist))
  - natural:fearsome-claw ← Fearsome Claw (1 creatures (Scarecrow))
  - natural:injecting-claw ← Injecting Claw (1 creatures (Red Slaad))
  - natural:mutating-claw ← Mutating Claw (1 creatures (Blue Slaad))
  - natural:spectral-claw ← Spectral Claw (1 creatures (Arch-hag))
  - natural:umbral-claw ← Umbral Claw (1 creatures (Shadow Demon))
  - natural:claws-hybrid-form-only ← Claws (Hybrid Form Only) (1 creatures (Werewolf))
  - natural:claw-oni-form-only ← Claw (Oni Form Only) (1 creatures (Oni))
  - natural:claw-fiend-form-only ← Claw (Fiend Form Only) (1 creatures (Succubus/Incubus))
  - natural:claw-bear-or-hybrid-form-only ← Claw (Bear or Hybrid Form Only) (1 creatures (Werebear))
  - natural:claws-hag-form-only ← Claws (Hag Form Only) (1 creatures (Night Hag))
  - natural:claw-tiger-or-hybrid-form-only ← Claw (Tiger or Hybrid Form Only) (1 creatures (Weretiger))
  - natural:claws-yugoloth-only ← Claws (Yugoloth Only) (1 creatures (Fiendish Spirit))
  - natural:rotting-claw-putrid-only ← Rotting Claw (Putrid Only) (1 creatures (Undead Spirit))
  - natural:rotting-claw ← Rotting Claw (1 creatures (Putrid Spirit))
  - natural:eldritch-claw ← Eldritch Claw (1 creatures (Cthulhu))
- **Club** [melee] → weapon:club, natural:stone-club, weapon:tree-club, weapon:club-3, weapon:vicious-club, weapon:club-1, weapon:club-2
  - weapon:club (the base weapons)
  - weapon:club ← Club (the base weapons)
  - natural:stone-club ← Stone Club (2 creatures (Stone Giant))
  - weapon:tree-club ← Tree Club (dnd5e/monsterfeatures24)
  - weapon:club-3 ← Club +3 (dnd5e/items)
  - weapon:vicious-club ← Vicious Club (dnd5e/items)
  - weapon:club-1 ← Club +1 (dnd5e/items)
  - weapon:club-2 ← Club +2 (dnd5e/items)
- **Cutlass** [melee] → weapon:cutlass, natural:cutlass
- **Dagger** [melee] → weapon:dagger, weapon:umbral-dagger, weapon:dagger-1, weapon:vicious-dagger, weapon:dagger-2, weapon:dagger-3, weapon:1-dagger
  - weapon:dagger (the base weapons)
  - weapon:dagger ← Dagger (the base weapons)
  - weapon:umbral-dagger ← Umbral Dagger (dnd5e/monsterfeatures24)
  - weapon:dagger-1 ← Dagger +1 (dnd5e/items)
  - weapon:vicious-dagger ← Vicious Dagger (dnd5e/items)
  - weapon:dagger-2 ← Dagger +2 (dnd5e/items)
  - weapon:dagger-3 ← Dagger +3 (dnd5e/items)
  - weapon:1-dagger ← +1 Dagger (the world (Jetten Elisedil))
- **Deflect** [melee] → weapon:deflect, natural:deflect
- **Elemental Strike** [melee] → weapon:elemental-strike, natural:elemental-strike
- **Falchion** [melee] → weapon:falchion, natural:falchion
- **Fist** [melee] → natural:fist, natural:rotting-fist, natural:clenched-fist
  - natural:fist (10 creatures)
  - natural:fist ← Fist (10 creatures (Ape, Giant Ape, Shield Guardian))
  - natural:rotting-fist ← Rotting Fist (6 creatures (Mummy, Mummy Lord))
  - natural:clenched-fist ← Clenched Fist (1 creatures (Arcane Hand))
- **Flail** [melee] → weapon:flail, natural:bone-flail, weapon:flail-1, weapon:vicious-flail, weapon:flail-3, weapon:flail-2, weapon:elemental-flail
  - weapon:flail (the base weapons)
  - weapon:flail ← Flail (the base weapons)
  - natural:bone-flail ← Bone Flail (1 creatures (Gnoll Fang of Yeenoghu))
  - weapon:flail-1 ← Flail +1 (dnd5e/items)
  - weapon:vicious-flail ← Vicious Flail (dnd5e/items)
  - weapon:flail-3 ← Flail +3 (dnd5e/items)
  - weapon:flail-2 ← Flail +2 (dnd5e/items)
  - weapon:elemental-flail ← Elemental Flail (mm/features)
- **Flurry of Blows** [melee] → weapon:flurry-of-blows, natural:flurry-of-blows
- **Force-Empowered Rend** [melee] → weapon:force-empowered-rend, natural:force-empowered-rend
- **Foreleg** [melee] → natural:foreleg
  - natural:foreleg (2 creatures)
  - natural:foreleg ← Foreleg (2 creatures (Drider))
- **Fork** [melee] → natural:searing-fork, weapon:infernal-fork, weapon:fork, natural:fork
  - natural:searing-fork ← Searing Fork (2 creatures (Horned Devil))
  - weapon:infernal-fork ← Infernal Fork (mm/features)
- **Gear** [melee] → natural:gear
  - natural:gear (1 creatures)
  - natural:gear ← Gear (1 creatures (Modron Monodrone))
- **Glaive** [melee] → weapon:glaive, weapon:abyssal-glaive, weapon:infernal-glaive, weapon:glaive-1, weapon:glaive-2, weapon:vicious-glaive, weapon:glaive-3
  - weapon:glaive (the base weapons)
  - weapon:glaive ← Glaive (the base weapons)
  - weapon:abyssal-glaive ← Abyssal Glaive (dnd5e/monsterfeatures24)
  - weapon:infernal-glaive ← Infernal Glaive (dnd5e/monsterfeatures24)
  - weapon:glaive-1 ← Glaive +1 (dnd5e/items)
  - weapon:glaive-2 ← Glaive +2 (dnd5e/items)
  - weapon:vicious-glaive ← Vicious Glaive (dnd5e/items)
  - weapon:glaive-3 ← Glaive +3 (dnd5e/items)
- **Gore** [melee] → natural:gore, natural:brutal-gore, natural:gore-boar-or-hybrid-form-only
  - natural:gore (27 creatures)
  - natural:gore ← Gore (27 creatures (Boar, Brazen Gorgon, Elephant))
  - natural:brutal-gore ← Brutal Gore (1 creatures (Goristro))
  - natural:gore-boar-or-hybrid-form-only ← Gore  (Boar or Hybrid Form Only) (2 creatures (Wereboar))
- **Gouge** [melee] → natural:gouge
  - natural:gouge (2 creatures)
  - natural:gouge ← Gouge (2 creatures (Giant Vulture))
- **Grapple** [melee] → weapon:grapple, natural:grapple
- **Grave Strike** [melee] → natural:grave-strike, natural:grave-strike-vampire-form-only
  - natural:grave-strike (1 creatures)
  - natural:grave-strike ← Grave Strike (1 creatures (Vampire Umbral Lord))
  - natural:grave-strike-vampire-form-only ← Grave Strike (Vampire Form Only) (2 creatures (Vampire))
- **Greataxe** [melee] → weapon:greataxe, weapon:greataxe-3, weapon:greataxe-2, weapon:giant-slayer-greataxe, weapon:vicious-greataxe, weapon:greataxe-1, weapon:berserker-greataxe
  - weapon:greataxe (the base weapons)
  - weapon:greataxe ← Greataxe (the base weapons)
  - weapon:greataxe-3 ← Greataxe +3 (dnd5e/items)
  - weapon:greataxe-2 ← Greataxe +2 (dnd5e/items)
  - weapon:giant-slayer-greataxe ← Giant Slayer Greataxe (dnd5e/items)
  - weapon:vicious-greataxe ← Vicious Greataxe (dnd5e/items)
  - weapon:greataxe-1 ← Greataxe +1 (dnd5e/items)
  - weapon:berserker-greataxe ← Berserker Greataxe (dnd5e/items)
- **Greatclub** [melee] → weapon:greatclub, weapon:thunderous-greatclub, weapon:greatclub-2, weapon:greatclub-1, weapon:greatclub-3, weapon:vicious-greatclub
  - weapon:greatclub (the base weapons)
  - weapon:greatclub ← Greatclub (the base weapons)
  - weapon:thunderous-greatclub ← Thunderous Greatclub (dnd5e/equipment24)
  - weapon:greatclub-2 ← Greatclub +2 (dnd5e/items)
  - weapon:greatclub-1 ← Greatclub +1 (dnd5e/items)
  - weapon:greatclub-3 ← Greatclub +3 (dnd5e/items)
  - weapon:vicious-greatclub ← Vicious Greatclub (dnd5e/items)
- **Greatsword** [melee] → weapon:greatsword, weapon:vorpal-greatsword, weapon:greatsword-2, weapon:holy-avenger-greatsword, weapon:vicious-greatsword, weapon:greatsword-3, weapon:flame-tongue-greatsword, weapon:luck-blade-greatsword, weapon:greatsword-1, weapon:giant-slayer-greatsword, weapon:defender-greatsword, weapon:dragon-slayer-greatsword, weapon:nine-lives-stealer-greatsword, weapon:frost-brand-greatsword, weapon:dancing-greatsword, weapon:ember-touched-greatsword
  - weapon:greatsword (the base weapons)
  - weapon:greatsword ← Greatsword (the base weapons)
  - weapon:vorpal-greatsword ← Vorpal Greatsword (dnd5e/items)
  - weapon:greatsword-2 ← Greatsword +2 (dnd5e/items)
  - weapon:holy-avenger-greatsword ← Holy Avenger Greatsword (dnd5e/items)
  - weapon:vicious-greatsword ← Vicious Greatsword (dnd5e/items)
  - weapon:greatsword-3 ← Greatsword +3 (dnd5e/items)
  - weapon:flame-tongue-greatsword ← Flame Tongue Greatsword (dnd5e/items)
  - weapon:luck-blade-greatsword ← Luck Blade Greatsword (dnd5e/items)
  - weapon:greatsword-1 ← Greatsword +1 (dnd5e/items)
  - weapon:giant-slayer-greatsword ← Giant Slayer Greatsword (dnd5e/items)
  - weapon:defender-greatsword ← Defender Greatsword (dnd5e/items)
  - weapon:dragon-slayer-greatsword ← Dragon Slayer Greatsword (dnd5e/items)
  - weapon:nine-lives-stealer-greatsword ← Nine Lives Stealer Greatsword (dnd5e/items)
  - weapon:frost-brand-greatsword ← Frost Brand Greatsword (dnd5e/items)
  - weapon:dancing-greatsword ← Dancing Greatsword (dnd5e/items)
  - weapon:ember-touched-greatsword ← Ember-Touched Greatsword (the world (Morgash the Gravemaker))
- **Gythka** [melee] → natural:gythka
  - natural:gythka (1 creatures)
  - natural:gythka ← Gythka (1 creatures (Thri-kreen Marauder))
- **Halberd** [melee] → weapon:halberd, weapon:halberd-2, weapon:halberd-3, weapon:vicious-halberd, weapon:halberd-1
  - weapon:halberd (the base weapons)
  - weapon:halberd ← Halberd (the base weapons)
  - weapon:halberd-2 ← Halberd +2 (dnd5e/items)
  - weapon:halberd-3 ← Halberd +3 (dnd5e/items)
  - weapon:vicious-halberd ← Vicious Halberd (dnd5e/items)
  - weapon:halberd-1 ← Halberd +1 (dnd5e/items)
- **Hammer** [melee] → weapon:lighthammer, natural:burning-hammer, weapon:light-hammer, weapon:vicious-light-hammer, weapon:light-hammer-2, weapon:light-hammer-3, weapon:light-hammer-1, weapon:hammer, natural:hammer
  - weapon:lighthammer ← Light Hammer (the base weapons)
  - natural:burning-hammer ← Burning Hammer (2 creatures (Azer Sentinel))
  - weapon:light-hammer ← Light Hammer (phb/equipment)
  - weapon:vicious-light-hammer ← Vicious Light Hammer (dnd5e/items)
  - weapon:light-hammer-2 ← Light Hammer +2 (dnd5e/items)
  - weapon:light-hammer-3 ← Light Hammer +3 (dnd5e/items)
  - weapon:light-hammer-1 ← Light Hammer +1 (dnd5e/items)
- **Handaxe** [melee] → weapon:handaxe, weapon:giant-slayer-handaxe, weapon:handaxe-2, weapon:vicious-handaxe, weapon:handaxe-1, weapon:handaxe-3, weapon:berserker-handaxe
  - weapon:handaxe (the base weapons)
  - weapon:handaxe ← Handaxe (the base weapons)
  - weapon:giant-slayer-handaxe ← Giant Slayer Handaxe (dnd5e/items)
  - weapon:handaxe-2 ← Handaxe +2 (dnd5e/items)
  - weapon:vicious-handaxe ← Vicious Handaxe (dnd5e/items)
  - weapon:handaxe-1 ← Handaxe +1 (dnd5e/items)
  - weapon:handaxe-3 ← Handaxe +3 (dnd5e/items)
  - weapon:berserker-handaxe ← Berserker Handaxe (dnd5e/items)
- **Harpoon** [melee] → natural:harpoon
  - natural:harpoon (2 creatures)
  - natural:harpoon ← Harpoon (2 creatures (Merrow))
- **Hoof** [melee] → weapon:hoof, natural:hoof
- **Hook** [melee] → natural:hook
  - natural:hook (1 creatures)
  - natural:hook ← Hook (1 creatures (Hook Horror))
- **Hooves** [melee] → natural:hooves
  - natural:hooves (44 creatures)
  - natural:hooves ← Hooves (44 creatures (Draft Horse, Mule, Nightmare))
- **Horn** [melee] → natural:horn, natural:radiant-horn, natural:horns
  - natural:horn (1 creatures)
  - natural:radiant-horn ← Radiant Horn (2 creatures (Unicorn))
  - natural:horn ← Horn (1 creatures (Unicorn))
  - natural:horns ← Horns (2 creatures (Tarrasque, Chimera))
- **Interception** [melee] → weapon:interception, natural:interception
- **Katana** [melee] → weapon:katana, natural:katana
- **Katar** [melee] → weapon:katar, natural:katar
- **Knife** [melee] → natural:sculpting-knife, weapon:knife, natural:knife
  - natural:sculpting-knife ← Sculpting Knife (1 creatures (Waxwork))
- **Lance** [melee] → weapon:lance, natural:psionic-lance, weapon:lance-2, weapon:lance-1, weapon:vicious-lance, weapon:lance-3
  - weapon:lance (the base weapons)
  - weapon:lance ← Lance (the base weapons)
  - natural:psionic-lance ← Psionic Lance (1 creatures (Thri-kreen Psion))
  - weapon:lance-2 ← Lance +2 (dnd5e/items)
  - weapon:lance-1 ← Lance +1 (dnd5e/items)
  - weapon:vicious-lance ← Vicious Lance (dnd5e/items)
  - weapon:lance-3 ← Lance +3 (dnd5e/items)
- **Lasersword** [melee] → weapon:lasersword, natural:lasersword
- **Lash** [melee] → natural:vine-lash, natural:aquatic-lash, natural:caustic-lash, natural:tentacle-lash, weapon:lash, natural:lash
  - natural:vine-lash ← Vine Lash (2 creatures (Dryad))
  - natural:aquatic-lash ← Aquatic Lash (1 creatures (Marid))
  - natural:caustic-lash ← Caustic Lash (1 creatures (Yochlol))
  - natural:tentacle-lash ← Tentacle Lash (1 creatures (Aberrant Cultist))
- **Longsword** [melee] → weapon:longsword, weapon:nine-lives-stealer-longsword, weapon:longsword-3, weapon:vorpal-longsword, weapon:longsword-1, weapon:frost-brand-longsword, weapon:dragon-slayer-longsword, weapon:luck-blade-longsword, weapon:longsword-2, weapon:holy-avenger-longsword, weapon:flame-tongue-longsword, weapon:vicious-longsword, weapon:dancing-longsword, weapon:defender-longsword, weapon:giant-slayer-longsword
  - weapon:longsword (the base weapons)
  - weapon:longsword ← Longsword (the base weapons)
  - weapon:nine-lives-stealer-longsword ← Nine Lives Stealer Longsword (dnd5e/items)
  - weapon:longsword-3 ← Longsword +3 (dnd5e/items)
  - weapon:vorpal-longsword ← Vorpal Longsword (dnd5e/items)
  - weapon:longsword-1 ← Longsword +1 (dnd5e/items)
  - weapon:frost-brand-longsword ← Frost Brand Longsword (dnd5e/items)
  - weapon:dragon-slayer-longsword ← Dragon Slayer Longsword (dnd5e/items)
  - weapon:luck-blade-longsword ← Luck Blade Longsword (dnd5e/items)
  - weapon:longsword-2 ← Longsword +2 (dnd5e/items)
  - weapon:holy-avenger-longsword ← Holy Avenger Longsword (dnd5e/items)
  - weapon:flame-tongue-longsword ← Flame Tongue Longsword (dnd5e/items)
  - weapon:vicious-longsword ← Vicious Longsword (dnd5e/items)
  - weapon:dancing-longsword ← Dancing Longsword (dnd5e/items)
  - weapon:defender-longsword ← Defender Longsword (dnd5e/items)
  - weapon:giant-slayer-longsword ← Giant Slayer Longsword (dnd5e/items)
- **Mace** [melee] → weapon:mace, natural:radiant-mace, natural:radiant-mace-defender-only, weapon:fiery-mace, weapon:holy-mace, weapon:thunderous-mace, weapon:mace-3, weapon:vicious-mace, weapon:mace-1, weapon:mace-2
  - weapon:mace (the base weapons)
  - weapon:mace ← Mace (the base weapons)
  - natural:radiant-mace ← Radiant Mace (1 creatures (Defender Spirit))
  - natural:radiant-mace-defender-only ← Radiant Mace (Defender Only) (1 creatures (Celestial Spirit))
  - weapon:fiery-mace ← Fiery Mace (dnd5e/monsterfeatures24)
  - weapon:holy-mace ← Holy Mace (dnd5e/monsterfeatures24)
  - weapon:thunderous-mace ← Thunderous Mace (dnd5e/monsterfeatures24)
  - weapon:mace-3 ← Mace +3 (dnd5e/items)
  - weapon:vicious-mace ← Vicious Mace (dnd5e/items)
  - weapon:mace-1 ← Mace +1 (dnd5e/items)
  - weapon:mace-2 ← Mace +2 (dnd5e/items)
- **Machete** [melee] → weapon:machete, natural:machete
- **Martial Arts** [melee] → weapon:martial-arts, natural:martial-arts
- **Maul** [melee] → weapon:maul, natural:earthen-maul, weapon:maul-2, weapon:vicious-maul, weapon:maul-1, weapon:maul-3
  - weapon:maul (the base weapons)
  - weapon:maul ← Maul (the base weapons)
  - natural:earthen-maul ← Earthen Maul (2 creatures (Dao, Lizardfolk Sovereign))
  - weapon:maul-2 ← Maul +2 (dnd5e/items)
  - weapon:vicious-maul ← Vicious Maul (dnd5e/items)
  - weapon:maul-1 ← Maul +1 (dnd5e/items)
  - weapon:maul-3 ← Maul +3 (dnd5e/items)
- **Morningstar** [melee] → weapon:morningstar, weapon:morningstar-2, weapon:morningstar-1, weapon:vicious-morningstar, weapon:morningstar-3
  - weapon:morningstar (the base weapons)
  - weapon:morningstar ← Morningstar (the base weapons)
  - weapon:morningstar-2 ← Morningstar +2 (dnd5e/items)
  - weapon:morningstar-1 ← Morningstar +1 (dnd5e/items)
  - weapon:vicious-morningstar ← Vicious Morningstar (dnd5e/items)
  - weapon:morningstar-3 ← Morningstar +3 (dnd5e/items)
- **Nagamaki** [melee] → weapon:nagamaki, natural:nagamaki
- **Naginata** [melee] → weapon:naginata, natural:naginata
- **Nodachi** [melee] → weapon:nodachi, natural:nodachi
- **Nunchaku** [melee] → weapon:nunchaku, natural:nunchaku
- **Odachi** [melee] → weapon:odachi, natural:odachi
- **Open Hand Technique** [melee] → weapon:open-hand-technique, natural:open-hand-technique
- **Pan** [melee] → weapon:pan, natural:pan
- **Parry** [melee] → weapon:parry, natural:parry
- **Pick** [melee] → weapon:warpick, weapon:war-pick, weapon:war-pick-2, weapon:vicious-war-pick, weapon:war-pick-1, weapon:war-pick-3, weapon:pick, natural:pick
  - weapon:warpick ← War Pick (the base weapons)
  - weapon:war-pick ← War Pick (phb/equipment)
  - weapon:war-pick-2 ← War Pick +2 (dnd5e/items)
  - weapon:vicious-war-pick ← Vicious War Pick (dnd5e/items)
  - weapon:war-pick-1 ← War Pick +1 (dnd5e/items)
  - weapon:war-pick-3 ← War Pick +3 (dnd5e/items)
- **Pike** [melee] → weapon:pike, weapon:pike-3, weapon:pike-2, weapon:pike-1, weapon:vicious-pike
  - weapon:pike (the base weapons)
  - weapon:pike ← Pike (the base weapons)
  - weapon:pike-3 ← Pike +3 (dnd5e/items)
  - weapon:pike-2 ← Pike +2 (dnd5e/items)
  - weapon:pike-1 ← Pike +1 (dnd5e/items)
  - weapon:vicious-pike ← Vicious Pike (dnd5e/items)
- **Pincer** [melee] → natural:pincer
  - natural:pincer (8 creatures)
  - natural:pincer ← Pincer (8 creatures (Chuul, Glabrezu, Mi-Go))
- **Primal Savagery** [melee] → weapon:primal-savagery, natural:primal-savagery
- **Pseudopod** [melee] → natural:pseudopod, natural:dissolving-pseudopod
  - natural:pseudopod (15 creatures)
  - natural:dissolving-pseudopod ← Dissolving Pseudopod (2 creatures (Black Pudding))
  - natural:pseudopod ← Pseudopod (15 creatures (Blob of Annihilation, Gelatinous Cube, Gray Ooze))
- **Punch** [melee] → weapon:punch, natural:punch
- **Quarterstaff** [melee] → weapon:quarterstaff, weapon:quarterstaff-2, weapon:quarterstaff-3, weapon:vicious-quarterstaff, weapon:quarterstaff-1
  - weapon:quarterstaff (the base weapons)
  - weapon:quarterstaff ← Quarterstaff (the base weapons)
  - weapon:quarterstaff-2 ← Quarterstaff +2 (dnd5e/items)
  - weapon:quarterstaff-3 ← Quarterstaff +3 (dnd5e/items)
  - weapon:vicious-quarterstaff ← Vicious Quarterstaff (dnd5e/items)
  - weapon:quarterstaff-1 ← Quarterstaff +1 (dnd5e/items)
- **Quivering Palm** [melee] → weapon:quivering-palm, natural:quivering-palm
- **Rake** [melee] → natural:rake
  - natural:rake (3 creatures)
  - natural:rake ← Rake (3 creatures (Awakened Shrub))
- **Ram** [melee] → natural:ram
  - natural:ram (20 creatures)
  - natural:ram ← Ram (20 creatures (Chimera, Deer, Elk))
- **Rapier** [melee] → weapon:rapier, weapon:dancing-rapier, weapon:flame-tongue-rapier, weapon:giant-slayer-rapier, weapon:nine-lives-stealer-rapier, weapon:rapier-1, weapon:dragon-slayer-rapier, weapon:rapier-3, weapon:defender-rapier, weapon:frost-brand-rapier, weapon:vicious-rapier, weapon:holy-avenger-rapier, weapon:luck-blade-rapier, weapon:rapier-2, weapon:insectile-rapier
  - weapon:rapier (the base weapons)
  - weapon:rapier ← Rapier (the base weapons)
  - weapon:dancing-rapier ← Dancing Rapier (dnd5e/items)
  - weapon:flame-tongue-rapier ← Flame Tongue Rapier (dnd5e/items)
  - weapon:giant-slayer-rapier ← Giant Slayer Rapier (dnd5e/items)
  - weapon:nine-lives-stealer-rapier ← Nine Lives Stealer Rapier (dnd5e/items)
  - weapon:rapier-1 ← Rapier +1 (dnd5e/items)
  - weapon:dragon-slayer-rapier ← Dragon Slayer Rapier (dnd5e/items)
  - weapon:rapier-3 ← Rapier +3 (dnd5e/items)
  - weapon:defender-rapier ← Defender Rapier (dnd5e/items)
  - weapon:frost-brand-rapier ← Frost Brand Rapier (dnd5e/items)
  - weapon:vicious-rapier ← Vicious Rapier (dnd5e/items)
  - weapon:holy-avenger-rapier ← Holy Avenger Rapier (dnd5e/items)
  - weapon:luck-blade-rapier ← Luck Blade Rapier (dnd5e/items)
  - weapon:rapier-2 ← Rapier +2 (dnd5e/items)
  - weapon:insectile-rapier ← Insectile Rapier (mm/features)
- **Ravage** [melee] → natural:ravage
  - natural:ravage (1 creatures)
  - natural:ravage ← Ravage (1 creatures (Primeval Owlbear))
- **Rend** [melee] → natural:rend, natural:rend-jackal-or-hybrid-form-only, natural:rend-bear-or-hybrid-form-only, natural:rend-dire-wolf-or-hybrid-form-only, natural:mind-rend
  - natural:rend (128 creatures)
  - natural:rend ← Rend (128 creatures (Adult Black Dragon, Adult Blue Dragon, Adult Brass Dragon))
  - natural:rend-jackal-or-hybrid-form-only ← Rend (Jackal or Hybrid Form Only) (1 creatures (Jackalwere))
  - natural:rend-bear-or-hybrid-form-only ← Rend (Bear or Hybrid Form Only) (2 creatures (Werebear))
  - natural:rend-dire-wolf-or-hybrid-form-only ← Rend (Dire Wolf or Hybrid Form Only) (1 creatures (Loup Garou))
  - natural:mind-rend ← Mind Rend (1 creatures (Mist Horror))
- **Retaliation** [melee] → weapon:retaliation, natural:retaliation
- **Scimitar** [melee] → weapon:scimitar, weapon:frost-brand-scimitar, weapon:scimitar-3, weapon:nine-lives-stealer-scimitar, weapon:luck-blade-scimitar, weapon:vicious-scimitar, weapon:vorpal-scimitar, weapon:defender-scimitar, weapon:holy-avenger-scimitar, weapon:scimitar-1, weapon:scimitar-2, weapon:giant-slayer-scimitar, weapon:dragon-slayer-scimitar, weapon:dancing-scimitar, weapon:flame-tongue-scimitar
  - weapon:scimitar (the base weapons)
  - weapon:scimitar ← Scimitar (the base weapons)
  - weapon:frost-brand-scimitar ← Frost Brand Scimitar (dnd5e/items)
  - weapon:scimitar-3 ← Scimitar +3 (dnd5e/items)
  - weapon:nine-lives-stealer-scimitar ← Nine Lives Stealer Scimitar (dnd5e/items)
  - weapon:luck-blade-scimitar ← Luck Blade Scimitar (dnd5e/items)
  - weapon:vicious-scimitar ← Vicious Scimitar (dnd5e/items)
  - weapon:vorpal-scimitar ← Vorpal Scimitar (dnd5e/items)
  - weapon:defender-scimitar ← Defender Scimitar (dnd5e/items)
  - weapon:holy-avenger-scimitar ← Holy Avenger Scimitar (dnd5e/items)
  - weapon:scimitar-1 ← Scimitar +1 (dnd5e/items)
  - weapon:scimitar-2 ← Scimitar +2 (dnd5e/items)
  - weapon:giant-slayer-scimitar ← Giant Slayer Scimitar (dnd5e/items)
  - weapon:dragon-slayer-scimitar ← Dragon Slayer Scimitar (dnd5e/items)
  - weapon:dancing-scimitar ← Dancing Scimitar (dnd5e/items)
  - weapon:flame-tongue-scimitar ← Flame Tongue Scimitar (dnd5e/items)
- **Scratch** [melee] → natural:scratch
  - natural:scratch (10 creatures)
  - natural:scratch ← Scratch (10 creatures (Cat, Wererat, Weretiger))
- **Scythe** [melee] → natural:dread-scythe, natural:necrotic-scythe, weapon:scythe, natural:scythe
  - natural:dread-scythe ← Dread Scythe (1 creatures (Death Cultist))
  - natural:necrotic-scythe ← Necrotic Scythe (the world (Cadoc, the Guardian))
- **Shield** [melee] → weapon:shield, natural:shield
- **Shortsword** [melee] → weapon:shortsword, weapon:vicious-shortsword, weapon:nine-lives-stealer-shortsword, weapon:frost-brand-shortsword, weapon:dragon-slayer-shortsword, weapon:flame-tongue-shortsword, weapon:shortsword-2, weapon:holy-avenger-shortsword, weapon:defender-shortsword, weapon:luck-blade-shortsword, weapon:shortsword-1, weapon:dancing-shortsword, weapon:giant-slayer-shortsword, weapon:shortsword-3, weapon:seras-shortsword
  - weapon:shortsword (the base weapons)
  - weapon:shortsword ← Shortsword (the base weapons)
  - weapon:vicious-shortsword ← Vicious Shortsword (dnd5e/items)
  - weapon:nine-lives-stealer-shortsword ← Nine Lives Stealer Shortsword (dnd5e/items)
  - weapon:frost-brand-shortsword ← Frost Brand Shortsword (dnd5e/items)
  - weapon:dragon-slayer-shortsword ← Dragon Slayer Shortsword (dnd5e/items)
  - weapon:flame-tongue-shortsword ← Flame Tongue Shortsword (dnd5e/items)
  - weapon:shortsword-2 ← Shortsword +2 (dnd5e/items)
  - weapon:holy-avenger-shortsword ← Holy Avenger Shortsword (dnd5e/items)
  - weapon:defender-shortsword ← Defender Shortsword (dnd5e/items)
  - weapon:luck-blade-shortsword ← Luck Blade Shortsword (dnd5e/items)
  - weapon:shortsword-1 ← Shortsword +1 (dnd5e/items)
  - weapon:dancing-shortsword ← Dancing Shortsword (dnd5e/items)
  - weapon:giant-slayer-shortsword ← Giant Slayer Shortsword (dnd5e/items)
  - weapon:shortsword-3 ← Shortsword +3 (dnd5e/items)
  - weapon:seras-shortsword ← Sera's Shortsword (the world (Mother Wend))
- **Shove** [melee] → weapon:shove, natural:shove
- **Sickle** [melee] → weapon:sickle, natural:ritual-sickle, weapon:vicious-sickle, weapon:sickle-3, weapon:sickle-1, weapon:sickle-2
  - weapon:sickle (the base weapons)
  - weapon:sickle ← Sickle (the base weapons)
  - natural:ritual-sickle ← Ritual Sickle (2 creatures (Cultist))
  - weapon:vicious-sickle ← Vicious Sickle (dnd5e/items)
  - weapon:sickle-3 ← Sickle +3 (dnd5e/items)
  - weapon:sickle-1 ← Sickle +1 (dnd5e/items)
  - weapon:sickle-2 ← Sickle +2 (dnd5e/items)
- **Slam** [melee] → natural:slam, natural:thunderous-slam, natural:avalanche-slam, natural:object-slam, natural:rotting-slam, natural:slam-human-or-hybrid-form-only
  - natural:slam (58 creatures)
  - natural:slam ← Slam (58 creatures (Animated Armor, Animated Broom, Awakened Tree))
  - natural:thunderous-slam ← Thunderous Slam (2 creatures (Air Elemental))
  - natural:avalanche-slam ← Avalanche Slam (2 creatures (Animated Boulder, Galeb Duhr))
  - natural:object-slam ← Object Slam (3 creatures (Haunting Revenant, Poltergeist, Wilfred Godefroy))
  - natural:rotting-slam ← Rotting Slam (1 creatures (Violet Fungus Necrohulk))
  - natural:slam-human-or-hybrid-form-only ← Slam (Human or Hybrid Form Only) (1 creatures (Jackalwere))
- **Slash** [melee] → natural:slash, natural:darkflame-slash
  - natural:slash (2 creatures)
  - natural:slash ← Slash (2 creatures (Animated Flying Sword))
  - natural:darkflame-slash ← Darkflame Slash (1 creatures (Ebonbane))
- **Snake Hair** [melee] → natural:snake-hair
  - natural:snake-hair (3 creatures)
  - natural:snake-hair ← Snake Hair (3 creatures (Medusa))
- **Spear** [melee] → weapon:spear, natural:flame-spear, natural:ice-spear, natural:ocean-spear, natural:clockwork-spear, weapon:spear-3, weapon:spear-2, weapon:spear-1, weapon:vicious-spear
  - weapon:spear (the base weapons)
  - weapon:spear ← Spear (the base weapons)
  - natural:flame-spear ← Flame Spear (2 creatures (Salamander))
  - natural:ice-spear ← Ice Spear (2 creatures (Ice Devil))
  - natural:ocean-spear ← Ocean Spear (2 creatures (Merfolk Skirmisher))
  - natural:clockwork-spear ← Clockwork Spear (1 creatures (Modron Tridrone))
  - weapon:spear-3 ← Spear +3 (dnd5e/items)
  - weapon:spear-2 ← Spear +2 (dnd5e/items)
  - weapon:spear-1 ← Spear +1 (dnd5e/items)
  - weapon:vicious-spear ← Vicious Spear (dnd5e/items)
- **Spike** [melee] → natural:tail-spike, weapon:spike, natural:spike
  - natural:tail-spike ← Tail Spike (3 creatures (Manticore))
- **Stab** [melee] → weapon:stab, natural:stab
- **Staff** [melee] → weapon:staff, natural:vine-staff, natural:bog-staff, natural:chaos-staff, natural:pincer-staff, weapon:wooden-staff, weapon:forest-staff, weapon:wind-staff, weapon:vesper-staff
  - weapon:staff (phb/equipment)
  - natural:vine-staff ← Vine Staff (2 creatures (Druid))
  - natural:bog-staff ← Bog Staff (2 creatures (Bullywug Bog Sage))
  - natural:chaos-staff ← Chaos Staff (1 creatures (Green Slaad))
  - natural:pincer-staff ← Pincer Staff (1 creatures (Kuo-toa Whip))
  - weapon:staff ← Staff (phb/equipment)
  - weapon:wooden-staff ← Wooden staff (phb/equipment)
  - weapon:forest-staff ← Forest Staff (mm/features)
  - weapon:wind-staff ← Wind Staff (mm/features)
  - weapon:vesper-staff ← Vesper Staff (the world (Harrow Vane))
- **Steel Wind Strike** [melee] → weapon:steel-wind-strike, natural:steel-wind-strike
- **Stick** [melee] → natural:hex-stick, weapon:stick, natural:stick
  - natural:hex-stick ← Hex Stick (1 creatures (Goblin Hexer))
- **Sting** [melee] → natural:sting, natural:infernal-sting, natural:sting-bite-in-beast-form
  - natural:sting (17 creatures)
  - natural:infernal-sting ← Infernal Sting (2 creatures (Bone Devil))
  - natural:sting ← Sting (17 creatures (Giant Scorpion, Giant Wasp, Imp))
  - natural:sting-bite-in-beast-form ← Sting (Bite in Beast Form) (1 creatures (Imp))
- **Stinger** [melee] → natural:stinger, natural:tail-stinger
  - natural:stinger (2 creatures)
  - natural:tail-stinger ← Tail Stinger (3 creatures (Purple Worm))
  - natural:stinger ← Stinger (2 creatures (Wyvern, Carrion Stalker))
- **Stomp** [melee] → natural:stomp
  - natural:stomp (3 creatures)
  - natural:stomp ← Stomp (3 creatures (Mammoth, Triceratops, Elephant))
- **Strike** [melee] → natural:unarmed-strike, natural:abyssal-strike, natural:beguiling-strike, natural:draconic-strike, natural:grave-strike, natural:otherworldly-strike, natural:psi-strike, natural:shadow-strike, natural:grave-strike-vampire-form-only, natural:lightning-strike, natural:unarmed-strike-vampire-form-only, natural:beasts-strike, natural:fiery-strike, natural:fiery-strike-devil-only, natural:death-strike, weapon:unarmed-strike, weapon:strike, natural:strike
  - natural:unarmed-strike ← Unarmed Strike (10 creatures (Merric, Perrin, Barbarian))
  - natural:abyssal-strike ← Abyssal Strike (1 creatures (Gnoll Demoniac))
  - natural:beguiling-strike ← Beguiling Strike (1 creatures (Noble Prodigy))
  - natural:draconic-strike ← Draconic Strike (1 creatures (Githyanki Dracomancer))
  - natural:grave-strike ← Grave Strike (1 creatures (Vampire Umbral Lord))
  - natural:otherworldly-strike ← Otherworldly Strike (1 creatures (Empyrean Iota))
  - natural:psi-strike ← Psi Strike (2 creatures (Githzerai Monk, Githzerai Zerth))
  - natural:shadow-strike ← Shadow Strike (1 creatures (Vampire Nightbringer))
  - natural:grave-strike-vampire-form-only ← Grave Strike (Vampire Form Only) (2 creatures (Vampire))
  - natural:lightning-strike ← Lightning Strike (1 creatures (Storm Giant))
  - natural:unarmed-strike-vampire-form-only ← Unarmed Strike (Vampire Form Only) (1 creatures (Vampire))
  - natural:beasts-strike ← Beast's Strike (3 creatures (Beast of the Land, Beast of the Sea, Beast of the Sky))
  - natural:fiery-strike ← Fiery Strike (1 creatures (Devil Spirit))
  - natural:fiery-strike-devil-only ← Fiery Strike (Devil Only) (1 creatures (Fiendish Spirit))
  - natural:death-strike ← Death Strike (1 creatures (Strahd von Zarovich))
  - weapon:unarmed-strike ← Unarmed Strike (dnd5e/items)
- **Stunning Strike** [melee] → weapon:stunning-strike, natural:stunning-strike
- **Sword** [melee] → natural:flying-sword, natural:necrotic-sword, natural:needle-sword, natural:arcane-sword, natural:silver-sword, weapon:flame-sword, weapon:radiant-sword, weapon:storm-sword, weapon:withering-sword, weapon:dancing-sword, weapon:vorpal-sword, weapon:sword, natural:sword
  - natural:flying-sword ← Flying Sword (2 creatures (Solar))
  - natural:necrotic-sword ← Necrotic Sword (2 creatures (Wight))
  - natural:needle-sword ← Needle Sword (3 creatures (Sprite))
  - natural:arcane-sword ← Arcane Sword (1 creatures (Helmed Horror))
  - natural:silver-sword ← Silver Sword (1 creatures (Githyanki Knight))
  - weapon:flame-sword ← Flame Sword (dnd5e/monsterfeatures24)
  - weapon:radiant-sword ← Radiant Sword (dnd5e/monsterfeatures24)
  - weapon:storm-sword ← Storm Sword (dnd5e/monsterfeatures24)
  - weapon:withering-sword ← Withering Sword (dnd5e/monsterfeatures24)
  - weapon:dancing-sword ← Dancing Sword (dnd5e/equipment24)
  - weapon:vorpal-sword ← Vorpal Sword (dnd5e/equipment24)
- **Tachi** [melee] → weapon:tachi, natural:tachi
- **Tail** [melee] → natural:tail
  - natural:tail (47 creatures)
  - natural:tail ← Tail (47 creatures (Ankylosaurus, Barbed Devil, Cloaker))
- **Talon** [melee] → natural:talons, weapon:talon, natural:talon
  - natural:talons ← Talons (24 creatures (Aarakocra Skirmisher, Cockatrice Regent, Eagle))
- **Tanto** [melee] → weapon:tanto, natural:tanto
- **Tonfa** [melee] → weapon:tonfa, natural:tonfa
- **Trample** [melee] → weapon:trample, natural:trample
- **Trident** [melee] → weapon:trident, weapon:trident-2, weapon:vicious-trident, weapon:trident-1, weapon:trident-3, weapon:flame-trident, weapon:mercurial-trident
  - weapon:trident (the base weapons)
  - weapon:trident ← Trident (the base weapons)
  - weapon:trident-2 ← Trident +2 (dnd5e/items)
  - weapon:vicious-trident ← Vicious Trident (dnd5e/items)
  - weapon:trident-1 ← Trident +1 (dnd5e/items)
  - weapon:trident-3 ← Trident +3 (dnd5e/items)
  - weapon:flame-trident ← Flame Trident (mm/features)
  - weapon:mercurial-trident ← Mercurial Trident (mm/features)
- **Tusk** [melee] → natural:tusk, natural:tusk-boar-or-hybrid-form-only, natural:tusks-boar-or-hybrid-form-only
  - natural:tusk (2 creatures)
  - natural:tusk ← Tusk (2 creatures (Giant Boar, Boar))
  - natural:tusk-boar-or-hybrid-form-only ← Tusk (Boar or Hybrid Form Only) (2 creatures (Wereboar))
  - natural:tusks-boar-or-hybrid-form-only ← Tusks (Boar or Hybrid Form Only) (1 creatures (Wereboar))
- **Unarmed** [melee] → weapon:unarmed, natural:unarmed
- **Unarmed Strike** [melee] → weapon:unarmed-strike, natural:unarmed-strike, natural:unarmed-strike-vampire-form-only
  - weapon:unarmed-strike (dnd5e/items)
  - natural:unarmed-strike (10 creatures)
  - natural:unarmed-strike ← Unarmed Strike (10 creatures (Merric, Perrin, Barbarian))
  - natural:unarmed-strike-vampire-form-only ← Unarmed Strike (Vampire Form Only) (1 creatures (Vampire))
  - weapon:unarmed-strike ← Unarmed Strike (dnd5e/items)
- **Wakizashi** [melee] → weapon:wakizashi, natural:wakizashi
- **War Pick** [melee] → weapon:warpick, weapon:war-pick, weapon:war-pick-2, weapon:vicious-war-pick, weapon:war-pick-1, weapon:war-pick-3
  - weapon:warpick (the base weapons)
  - weapon:war-pick (phb/equipment)
  - weapon:warpick ← War Pick (the base weapons)
  - weapon:war-pick ← War Pick (phb/equipment)
  - weapon:war-pick-2 ← War Pick +2 (dnd5e/items)
  - weapon:vicious-war-pick ← Vicious War Pick (dnd5e/items)
  - weapon:war-pick-1 ← War Pick +1 (dnd5e/items)
  - weapon:war-pick-3 ← War Pick +3 (dnd5e/items)
- **Warhammer** [melee] → weapon:warhammer, weapon:warhammer-1, weapon:vicious-warhammer, weapon:warhammer-2, weapon:warhammer-3
  - weapon:warhammer (the base weapons)
  - weapon:warhammer ← Warhammer (the base weapons)
  - weapon:warhammer-1 ← Warhammer +1 (dnd5e/items)
  - weapon:vicious-warhammer ← Vicious Warhammer (dnd5e/items)
  - weapon:warhammer-2 ← Warhammer +2 (dnd5e/items)
  - weapon:warhammer-3 ← Warhammer +3 (dnd5e/items)
- **Whip** [melee] → weapon:whip, natural:flame-whip, natural:bone-whip, weapon:whip-2, weapon:whip-3, weapon:whip-1, weapon:vicious-whip, weapon:mercurial-whip
  - weapon:whip (the base weapons)
  - weapon:whip ← Whip (the base weapons)
  - natural:flame-whip ← Flame Whip (2 creatures (Balor))
  - natural:bone-whip ← Bone Whip (2 creatures (Gnoll Pack Lord, Kuo-toa Monitor))
  - weapon:whip-2 ← Whip +2 (dnd5e/items)
  - weapon:whip-3 ← Whip +3 (dnd5e/items)
  - weapon:whip-1 ← Whip +1 (dnd5e/items)
  - weapon:vicious-whip ← Vicious Whip (dnd5e/items)
  - weapon:mercurial-whip ← Mercurial Whip (mm/features)
- **Wing** [melee] → weapon:wing, natural:wing
- **Wrench** [melee] → weapon:wrench, natural:wrench
- **Yari** [melee] → weapon:yari, natural:yari
- **Yklwa** [melee] → weapon:yklwa, natural:yklwa
- **Acid Arrow** [range] → spell:acid-arrow
  - spell:acid-arrow (dnd5e/spells24)
- **Alchemist's** [range] → weapon:alchemists, natural:alchemists
- **Antagonize** [range] → weapon:antagonize, natural:antagonize
- **Antimatter Rifle** [range] → weapon:antimatter-rifle, natural:antimatter-rifle
- **Antipathy/Sympathy** [range] → spell:antipathy-sympathy
  - spell:antipathy-sympathy (phb/spells)
- **Aquatic Burst** [range] → natural:aquatic-burst
  - natural:aquatic-burst (1 creatures)
  - natural:aquatic-burst ← Aquatic Burst (1 creatures (Merfolk Wavebender))
- **Arcane Firearm** [range] → weapon:arcane-firearm, natural:arcane-firearm
- **Automatic** [range] → weapon:automatic, natural:automatic
- **Awakened Mind** [range] → feature:awakened-mind
  - feature:awakened-mind (phb/classes)
- **Befuddlement** [range] → spell:befuddlement
  - spell:befuddlement (phb/spells)
- **Beguiling Defenses** [range] → feature:beguiling-defenses
  - feature:beguiling-defenses (phb/classes)
- **Blood Drain** [range] → natural:blood-drain
  - natural:blood-drain (1 creatures)
  - natural:blood-drain ← Blood Drain (1 creatures (Stirge))
- **Blowgun** [range] → weapon:blowgun, weapon:blowgun-3, weapon:blowgun-1, weapon:blowgun-2, weapon:vicious-blowgun
  - weapon:blowgun (the base weapons)
  - weapon:blowgun ← Blowgun (the base weapons)
  - weapon:blowgun-3 ← Blowgun +3 (dnd5e/items)
  - weapon:blowgun-1 ← Blowgun +1 (dnd5e/items)
  - weapon:blowgun-2 ← Blowgun +2 (dnd5e/items)
  - weapon:vicious-blowgun ← Vicious Blowgun (dnd5e/items)
- **Bomb** [range] → weapon:bomb, natural:bomb
- **Bone Bow** [range] → weapon:bone-bow
  - weapon:bone-bow (dnd5e/monsterfeatures24)
  - weapon:bone-bow ← Bone Bow (dnd5e/monsterfeatures24)
- **Boomerang** [range] → weapon:boomerang, natural:boomerang
- **Boulder** [range] → natural:boulder
  - natural:boulder (2 creatures)
  - natural:boulder ← Boulder (2 creatures (Stone Giant))
- **Bow** [range] → natural:enchanting-bow, natural:radiant-bow, natural:radiant-bow-avenger-only, weapon:bone-bow, weapon:great-bow, weapon:necrotic-bow, weapon:energy-bow, weapon:bow, natural:bow
  - natural:enchanting-bow ← Enchanting Bow (3 creatures (Sprite))
  - natural:radiant-bow ← Radiant Bow (1 creatures (Avenger Spirit))
  - natural:radiant-bow-avenger-only ← Radiant Bow (Avenger Only) (1 creatures (Celestial Spirit))
  - weapon:bone-bow ← Bone Bow (dnd5e/monsterfeatures24)
  - weapon:great-bow ← Great Bow (dnd5e/monsterfeatures24)
  - weapon:necrotic-bow ← Necrotic Bow (dnd5e/monsterfeatures24)
  - weapon:energy-bow ← Energy Bow (dnd5e/equipment24)
- **Burnt Othur Fumes** [range] → item:burnt-othur-fumes
  - item:burnt-othur-fumes (dnd5e/equipment24)
- **Burst** [range] → natural:arcane-burst, natural:eldritch-burst, natural:poison-burst, natural:thorn-burst, natural:aquatic-burst, natural:earth-burst, natural:elemental-burst, natural:fiendish-burst, natural:flame-burst, natural:necrotic-burst, natural:radiant-burst, natural:poison-burst-yuan-ti-form-only, natural:negative-energy-burst, natural:disrupting-burst, weapon:burst, natural:burst
  - natural:arcane-burst ← Arcane Burst (6 creatures (Archmage, Mage, Mage Apprentice))
  - natural:eldritch-burst ← Eldritch Burst (3 creatures (Lich, Azalin Rex))
  - natural:poison-burst ← Poison Burst (2 creatures (Drider))
  - natural:thorn-burst ← Thorn Burst (2 creatures (Dryad))
  - natural:aquatic-burst ← Aquatic Burst (1 creatures (Merfolk Wavebender))
  - natural:earth-burst ← Earth Burst (2 creatures (Dao, Lizardfolk Geomancer))
  - natural:elemental-burst ← Elemental Burst (1 creatures (Elemental Cataclysm))
  - natural:fiendish-burst ← Fiendish Burst (1 creatures (Arcanaloth))
  - natural:flame-burst ← Flame Burst (1 creatures (Azer Pyromancer))
  - natural:necrotic-burst ← Necrotic Burst (3 creatures (Demilich, Necrichor, Saidra d’Honaire))
  - natural:radiant-burst ← Radiant Burst (2 creatures (Archpriest, Mist Wanderer))
  - natural:poison-burst-yuan-ti-form-only ← Poison Burst (Yuan-ti Form Only) (1 creatures (Yuan-ti Malison (Type 3)))
  - natural:negative-energy-burst ← Negative Energy Burst (1 creatures (Ankhtepot))
  - natural:disrupting-burst ← Disrupting Burst (1 creatures (Brain in a Jar))
- **Catapult** [range] → weapon:catapult, natural:catapult
- **Catapult Munition** [range] → weapon:catapult-munition, natural:catapult-munition
- **Chakram** [range] → weapon:chakram, natural:chakram
- **Charm Ray** [range] → weapon:charm-ray, natural:charm-ray
- **Chatkcha** [range] → natural:chatkcha
  - natural:chatkcha (1 creatures)
  - natural:chatkcha ← Chatkcha (1 creatures (Thri-kreen Marauder))
- **Cinder Breath** [range] → feature:cinder-breath
  - feature:cinder-breath (mm/features)
- **Consume Life** [range] → feature:consume-life
  - feature:consume-life (dnd5e/monsterfeatures)
- **Cordon of Arrows** [range] → spell:cordon-of-arrows
  - spell:cordon-of-arrows (phb/spells)
- **Crossbow** [range] → weapon:handcrossbow, weapon:heavycrossbow, weapon:lightcrossbow, weapon:hand-crossbow, weapon:heavy-crossbow, weapon:light-crossbow, weapon:hand-crossbow-2, weapon:heavy-crossbow-2, weapon:vicious-heavy-crossbow, weapon:vicious-hand-crossbow, weapon:hand-crossbow-1, weapon:heavy-crossbow-3, weapon:vicious-light-crossbow, weapon:light-crossbow-3, weapon:heavy-crossbow-1, weapon:light-crossbow-1, weapon:hand-crossbow-3, weapon:light-crossbow-2, weapon:marns-light-crossbow, weapon:crossbow, natural:crossbow
  - weapon:handcrossbow ← Hand Crossbow (the base weapons)
  - weapon:heavycrossbow ← Heavy Crossbow (the base weapons)
  - weapon:lightcrossbow ← Light Crossbow (the base weapons)
  - weapon:hand-crossbow ← Hand Crossbow (phb/equipment)
  - weapon:heavy-crossbow ← Heavy Crossbow (phb/equipment)
  - weapon:light-crossbow ← Light Crossbow (phb/equipment)
  - weapon:hand-crossbow-2 ← Hand Crossbow +2 (dnd5e/items)
  - weapon:heavy-crossbow-2 ← Heavy Crossbow +2 (dnd5e/items)
  - weapon:vicious-heavy-crossbow ← Vicious Heavy Crossbow (dnd5e/items)
  - weapon:vicious-hand-crossbow ← Vicious Hand Crossbow (dnd5e/items)
  - weapon:hand-crossbow-1 ← Hand Crossbow +1 (dnd5e/items)
  - weapon:heavy-crossbow-3 ← Heavy Crossbow +3 (dnd5e/items)
  - weapon:vicious-light-crossbow ← Vicious Light Crossbow (dnd5e/items)
  - weapon:light-crossbow-3 ← Light Crossbow +3 (dnd5e/items)
  - weapon:heavy-crossbow-1 ← Heavy Crossbow +1 (dnd5e/items)
  - weapon:light-crossbow-1 ← Light Crossbow +1 (dnd5e/items)
  - weapon:hand-crossbow-3 ← Hand Crossbow +3 (dnd5e/items)
  - weapon:light-crossbow-2 ← Light Crossbow +2 (dnd5e/items)
  - weapon:marns-light-crossbow ← Marn's Light Crossbow (the world (Mother Wend))
- **Dart** [range] → weapon:dart, weapon:dart-2, weapon:dart-1, weapon:dart-3, weapon:vicious-dart
  - weapon:dart (the base weapons)
  - weapon:dart ← Dart (the base weapons)
  - weapon:dart-2 ← Dart +2 (dnd5e/items)
  - weapon:dart-1 ← Dart +1 (dnd5e/items)
  - weapon:dart-3 ← Dart +3 (dnd5e/items)
  - weapon:vicious-dart ← Vicious Dart (dnd5e/items)
- **Devour Intellect** [range] → feature:devour-intellect
  - feature:devour-intellect (mm/features)
- **Dominate Mind** [range] → feature:dominate-mind
  - feature:dominate-mind (dnd5e/monsterfeatures24)
- **Draining Kiss** [range] → feature:draining-kiss
  - feature:draining-kiss (dnd5e/monsterfeatures)
- **Dynamite** [range] → weapon:dynamite, natural:dynamite
- **Earth Burst** [range] → natural:earth-burst
  - natural:earth-burst (2 creatures)
  - natural:earth-burst ← Earth Burst (2 creatures (Dao, Lizardfolk Geomancer))
- **Energy Drain** [range] → feature:energy-drain
  - feature:energy-drain (mm/features)
- **Enervation Ray** [range] → weapon:enervation-ray, natural:enervation-ray
- **Essence of Ether** [range] → item:essence-of-ether
  - item:essence-of-ether (dnd5e/equipment24)
- **Fragmentation Grenade** [range] → weapon:fragmentation-grenade, natural:fragmentation-grenade
- **Gear Flinger** [range] → natural:gear-flinger
  - natural:gear-flinger (1 creatures)
  - natural:gear-flinger ← Gear Flinger (1 creatures (Modron Monodrone))
- **Gear Launcher** [range] → weapon:gear-launcher, natural:gear-launcher
- **Gnomengarde Grenade** [range] → weapon:gnomengarde-grenade, natural:gnomengarde-grenade
- **Grave Bolt** [range] → weapon:grave-bolt, natural:grave-bolt
- **Grenade** [range] → weapon:grenade, natural:grenade
- **Grenade Launcher** [range] → weapon:grenade-launcher, natural:grenade-launcher
- **Gun** [range] → weapon:gun, natural:gun
- **Hail of Bark** [range] → natural:hail-of-bark
  - natural:hail-of-bark (2 creatures)
  - natural:hail-of-bark ← Hail of Bark (2 creatures (Treant))
- **Holy Water** [range] → item:holy-water
  - item:holy-water (phb/equipment)
- **Ice Knife** [range] → spell:ice-knife
  - spell:ice-knife (phb/spells)
- **Javelin** [range] → weapon:javelin, natural:bone-javelin, weapon:javelin-3, weapon:javelin-2, weapon:javelin-1, weapon:vicious-javelin, weapon:wind-javelin
  - weapon:javelin (the base weapons)
  - weapon:javelin ← Javelin (the base weapons)
  - natural:bone-javelin ← Bone Javelin (1 creatures (Gnoll Pack Lord))
  - weapon:javelin-3 ← Javelin +3 (dnd5e/items)
  - weapon:javelin-2 ← Javelin +2 (dnd5e/items)
  - weapon:javelin-1 ← Javelin +1 (dnd5e/items)
  - weapon:vicious-javelin ← Vicious Javelin (dnd5e/items)
  - weapon:wind-javelin ← Wind Javelin (mm/features)
- **Jim's Glowing Coin** [range] → weapon:jims-glowing-coin, natural:jims-glowing-coin
- **Kunai** [range] → weapon:kunai, natural:kunai
- **Laser** [range] → weapon:laser, natural:laser
- **Life Drain** [range] → feature:life-drain, natural:life-drain
  - feature:life-drain (dnd5e/monsterfeatures24)
  - natural:life-drain (3 creatures)
  - natural:life-drain ← Life Drain (3 creatures (Wraith, Specter, Wight))
- **Life Transference** [range] → weapon:life-transference, natural:life-transference
- **Lob** [range] → natural:wax-lob, weapon:trash-lob, weapon:lob, natural:lob
  - natural:wax-lob ← Wax Lob (1 creatures (Waxwork))
  - weapon:trash-lob ← Trash Lob (dnd5e/monsterfeatures24)
- **Longbow** [range] → weapon:longbow, weapon:longbow-3, weapon:longbow-1, weapon:longbow-2, weapon:vicious-longbow, weapon:seras-longbow
  - weapon:longbow (the base weapons)
  - weapon:longbow ← Longbow (the base weapons)
  - weapon:longbow-3 ← Longbow +3 (dnd5e/items)
  - weapon:longbow-1 ← Longbow +1 (dnd5e/items)
  - weapon:longbow-2 ← Longbow +2 (dnd5e/items)
  - weapon:vicious-longbow ← Vicious Longbow (dnd5e/items)
  - weapon:seras-longbow ← Sera's Longbow (the world (Selma))
- **Magic Stone** [range] → weapon:magic-stone, natural:magic-stone
- **Malice** [range] → item:malice
  - item:malice (dnd5e/equipment24)
- **Maze** [range] → spell:maze
  - spell:maze (phb/spells)
- **Message** [range] → spell:message
  - spell:message (phb/spells)
- **Mind Sliver** [range] → spell:mind-sliver
  - spell:mind-sliver (phb/spells)
- **Mind Spike** [range] → spell:mind-spike
  - spell:mind-spike (phb/spells)
- **Missile** [range] → weapon:missile, natural:missile
- **Modify Memory** [range] → spell:modify-memory
  - spell:modify-memory (phb/spells)
- **Mud Breath** [range] → feature:mud-breath
  - feature:mud-breath (mm/features)
- **Musket** [range] → weapon:musket
  - weapon:musket (the base weapons)
  - weapon:musket ← Musket (the base weapons)
- **Needle** [range] → natural:silver-needle, weapon:needles, weapon:needle, natural:needle
  - natural:silver-needle ← Silver Needle (1 creatures (Carrionette))
  - weapon:needles ← Needles (mm/features)
- **Negative Energy Flood** [range] → weapon:negative-energy-flood, natural:negative-energy-flood
- **Pistol** [range] → weapon:pistol
  - weapon:pistol (the base weapons)
  - weapon:pistol ← Pistol (the base weapons)
- **Planar Binding** [range] → spell:planar-binding
  - spell:planar-binding (phb/spells)
- **Poison Ray** [range] → natural:poison-ray, natural:poison-ray-yuan-ti-form-only
  - natural:poison-ray (3 creatures)
  - natural:poison-ray ← Poison Ray (3 creatures (Medusa, Yuan-ti Infiltrator))
  - natural:poison-ray-yuan-ti-form-only ← Poison Ray  (Yuan-ti Form Only) (1 creatures (Yuan-ti Malison (Type 1)))
- **Poison Spray** [range] → spell:poison-spray, feature:poison-spray
  - spell:poison-spray (phb/spells)
  - feature:poison-spray (mm/features)
- **Possession** [range] → feature:possession
  - feature:possession (dnd5e/monsterfeatures)
- **Proboscis** [range] → natural:proboscis
  - natural:proboscis (4 creatures)
  - natural:proboscis ← Proboscis (4 creatures (Chasme, Stirge, Strigoi))
- **Psychic Scream** [range] → weapon:psychic-scream, natural:psychic-scream
- **Ray of Enfeeblement** [range] → spell:ray-of-enfeeblement
  - spell:ray-of-enfeeblement (phb/spells)
- **Rend Mind** [range] → feature:rend-mind
  - feature:rend-mind (phb/classes)
- **Restore Balance** [range] → feature:restore-balance
  - feature:restore-balance (phb/classes)
- **Revolver** [range] → weapon:revolver, natural:revolver
- **Rifle** [range] → natural:hunting-rifle, weapon:rifle, natural:rifle
  - natural:hunting-rifle ← Hunting Rifle (1 creatures (Wilfred Godefroy))
- **Rock** [range] → natural:rock
  - natural:rock (5 creatures)
  - natural:rock ← Rock (5 creatures (Ape, Cyclops Sentry, Giant Ape))
- **Rock Launch** [range] → natural:rock-launch
  - natural:rock-launch (2 creatures)
  - natural:rock-launch ← Rock Launch (2 creatures (Earth Elemental))
- **Shortbow** [range] → weapon:shortbow, weapon:vicious-shortbow, weapon:shortbow-3, weapon:shortbow-1, weapon:shortbow-2
  - weapon:shortbow (the base weapons)
  - weapon:shortbow ← Shortbow (the base weapons)
  - weapon:vicious-shortbow ← Vicious Shortbow (dnd5e/items)
  - weapon:shortbow-3 ← Shortbow +3 (dnd5e/items)
  - weapon:shortbow-1 ← Shortbow +1 (dnd5e/items)
  - weapon:shortbow-2 ← Shortbow +2 (dnd5e/items)
- **Shotgun** [range] → weapon:shotgun, natural:shotgun
- **Shuriken** [range] → weapon:shuriken, natural:shuriken
- **Siege Boulder** [range] → weapon:siege-boulder, natural:siege-boulder
- **Sling** [range] → weapon:sling, weapon:sling-1, weapon:sling-2, weapon:sling-3, weapon:vicious-sling
  - weapon:sling (the base weapons)
  - weapon:sling ← Sling (the base weapons)
  - weapon:sling-1 ← Sling +1 (dnd5e/items)
  - weapon:sling-2 ← Sling +2 (dnd5e/items)
  - weapon:sling-3 ← Sling +3 (dnd5e/items)
  - weapon:vicious-sling ← Vicious Sling (dnd5e/items)
- **Smoke Grenade** [range] → weapon:smoke-grenade, natural:smoke-grenade
- **Snow Ball** [range] → weapon:snow-ball, natural:snow-ball
- **Sorcerous Burst** [range] → spell:sorcerous-burst
  - spell:sorcerous-burst (phb/spells)
- **Soul Cage** [range] → weapon:soul-cage, natural:soul-cage
- **Stench Spray** [range] → feature:stench-spray
  - feature:stench-spray (mm/features)
- **Sun Blade** [range] → weapon:sun-blade
  - weapon:sun-blade (dnd5e/equipment24)
  - weapon:sun-blade ← Sun Blade (dnd5e/equipment24)
- **Surge** [range] → natural:surge
  - natural:surge (1 creatures)
  - natural:surge ← Surge (1 creatures (Water Weird))
- **Tasha's Mind Whip** [range] → weapon:tashas-mind-whip, natural:tashas-mind-whip
- **Telepathic Bond** [range] → spell:telepathic-bond, feature:telepathic-bond
  - spell:telepathic-bond (dnd5e/spells24)
  - feature:telepathic-bond (dnd5e/monsterfeatures)
- **Telepathic Speech** [range] → feature:telepathic-speech
  - feature:telepathic-speech (phb/classes)
- **Thorn** [range] → weapon:thorn, natural:thorn
- **Wardaway** [range] → weapon:wardaway, natural:wardaway
- **Watery Rebuke** [range] → feature:watery-rebuke
  - feature:watery-rebuke (mm/features)
- **Web** [range] → spell:web, feature:web
  - spell:web (phb/spells)
  - feature:web (dnd5e/monsterfeatures)
- **First Light** [melee] → weapon:first-light
  - weapon:first-light (the world (Hobgoblin Captain))
  - weapon:first-light ← First Light (the world (Hobgoblin Captain))
- **Goldthorn** [melee] → weapon:goldthorn
  - weapon:goldthorn (the world (Jetten Elisedil))
  - weapon:goldthorn ← Goldthorn (the world (Jetten Elisedil))

## Caught by a weapon word under AA, not carried (26 words)

Automated Animations' weapon and creature-attack rows matched their word inside any name — a feat, a wand, a spell. Those catches are accidents of the word and are not carried: a weapon fx never answers a spell, a feature or an item. Each is one house fx away if it was wanted ("like the Burst fx, for feature:spellfire-burst").

- **Blade** [melee]: Flame Blade [spell] (phb/spells)
- **Chain** [melee]: Chain [consumable] on Mother Wend
- **Dagger** [melee]: Cloud of Daggers [spell] (phb/spells)
- **Horn** [melee]: Horn [tool] on Mother Wend
- **Knife** [melee]: Ice Knife [spell] on Skeletal Mage; Ice Knife [spell] (phb/spells)
- **Shield** [melee]: Shield [spell] on Gren Greenmantle; Shield [equipment] on BF Test Attacker; Shield [equipment] on BF Test Victim; Shield [equipment] on Mother Wend; Sentinel Shield [equipment] on Mother Wend; Shield [spell] on Skeletal Mage; Shield [equipment] on Hobgoblin Warrior; Shield [equipment] on Sharran Enforcer; +1 Shield [equipment] on Thomas A. Invictus; Shield [spell] on BF Test Shielder; Fire Shield [spell] (phb/spells)
- **Spike** [melee]: Mind Spike [spell] (phb/spells)
- **Strike** [melee]: Flame Strike [spell] on Harrow Vane; True Strike [spell] on Sharran Acolyte; Cunning Strike [feat] on BF Test Rogue; Devious Strikes [feat] on BF Test Rogue; Improved Cunning Strike [feat] on BF Test Rogue; Ensnaring Strike [spell] (phb/spells); Flame Strike [spell] (phb/spells); Steel Wind Strike [spell] (phb/spells); True Strike [spell] (phb/spells)
- **Sword** [melee]: Mordenkainen's Sword [spell] (phb/spells); Arcane Sword [spell] (dnd5e/spells24)
- **Whip** [melee]: Thorn Whip [spell] (phb/spells)
- **Acid Arrow** [range]: Melf's Acid Arrow [spell] (phb/spells)
- **Burst** [range]: Spellfire Burst [feat] on Gren Greenmantle; Sorcerous Burst [spell] on Gren Greenmantle; Spellfire Burst [feat] on BF Test Shielder; Sorcerous Burst [spell] on BF Test Shielder; Sorcerous Burst [spell] (phb/spells)
- **Consume Life** [range]: Consume Life [feat] on Will-o'-Wisp
- **Ice Knife** [range]: Ice Knife [spell] on Skeletal Mage
- **Life Drain** [range]: Life Drain [feat] on Aldous; Life Drain [feat] on Osric, the Keeper; Life Drain [feat] on Wight; Life Drain [feat] on Cadoc, the Guardian; Life Drain [feat] on Edda; Life Drain [feat] on Hesper, the Mortician
- **Mind Sliver** [range]: Mind Sliver [spell] on Gren Greenmantle; Mind Sliver [spell] on BF Test Shielder
- **Missile** [range]: Magic Missile [spell] on Gren Greenmantle; Wand of Magic Missiles [equipment] on Gren Greenmantle; Magic Missile [spell] on Skeletal Mage; Magic Missile [spell] on BF Test Shielder; Wand of Magic Missiles [equipment] on BF Test Shielder; Magic Missile [spell] (phb/spells)
- **Modify Memory** [range]: Modify Memory [spell] on Harrow Vane
- **Needle** [range]: Needles [consumable] on Mother Wend
- **Ray of Enfeeblement** [range]: Ray of Enfeeblement [spell] on Salyth; Ray of Enfeeblement [spell] on BF Test Bard
- **Sling** [range]: Bullets, Sling [consumable] on Mother Wend
- **Sorcerous Burst** [range]: Sorcerous Burst [spell] on Gren Greenmantle; Sorcerous Burst [spell] on BF Test Shielder
- **Surge** [range]: Action Surge [feat] on Morgash the Gravemaker; Action Surge [feat] on BF Test Fighter
- **Telepathic Bond** [range]: Rary's Telepathic Bond [spell] (phb/spells)
- **Thorn** [range]: Hail of Thorns [spell] on Jetten Elisedil; Hail of Thorns [spell] (phb/spells); Wall of Thorns [spell] (phb/spells)
- **Web** [range]: Web [spell] on Gren Greenmantle; Web [spell] on BF Test Shielder

## Keys ceded to a longer label (0)

Where two rows claimed one key, the longer label keeps it, as Automated Animations' search took the longest label contained in a name.


## EXCEPTION · rows no list holds, NOT carried (194)

Neither the books, the base weapons, the creature attacks nor this world hold an ability of this name, so there is no evidence of what kind it is. The first migration keyed each of these as a spell, a feature AND an item — the one place the corpus guessed. **The user ruled that out (2026-09-08): these rows are not carried.** Each is one FX away if it turns out to be wanted: open the Editor, name the ability, and copy the scenes of whatever it should look like.

| Row | AA menu |
| --- | --- |
| Green-Flame Blade | ontoken |
| Heal-disabled | ontoken |
| Starlight Step | preset |
| Thunder Step | preset |
| Beam | range |
| Chaos Bolt | range |
| Confusion Ray | range |
| Danse Macabre | range |
| Death Ray | range |
| Disintegration Ray | range |
| Enemies Abound | range |
| Fear Ray | range |
| Force Ballista | range |
| Holy Star of Mystra | range |
| Lightning Launcher | range |
| Lightning Lure | range |
| Paralyzing Ray | range |
| Petrification Ray | range |
| Ray | range |
| Sleep Ray | range |
| Slowing Ray | range |
| Spellfire Flare | range |
| Spittle | range |
| Telekinetic Ray | range |
| Thunder Gauntlet | range |
| Wounding Ray | range |
| Absorb Elements | ontoken |
| Adventurer's Atlas | ontoken |
| Air Bubble | ontoken |
| Arcane Armor | ontoken |
| Arcane Jolt | ontoken |
| Armor Model | ontoken |
| Ashardalon's Stride | ontoken |
| Backlash | ontoken |
| Beast Bond | ontoken |
| Blade of Disaster | ontoken |
| Booming Blade | ontoken |
| Borrowed Knowledge | ontoken |
| Bubbling Cauldron | ontoken |
| Catnap | ontoken |
| Cause Fear | ontoken |
| Ceremony | ontoken |
| Chemical Mastery | ontoken |
| Concentration Check: | ontoken |
| Conjure Constructs | ontoken |
| Control | ontoken |
| Create Homunculus | ontoken |
| Create Magen | ontoken |
| Create Spelljamming Helm | ontoken |
| Crown of Stars | ontoken |
| Defense Roll | ontoken |
| Defensive Field | ontoken |
| Deryan's Helpful Homunculi | ontoken |
| Dream of the Blue Veil | ontoken |
| Drow Poison | ontoken |
| Druid Grove | ontoken |
| Earth Tremor | ontoken |
| Earthbind | ontoken |
| Eldritch Cannon | ontoken |
| Elemental Bane | ontoken |
| Elminster's Effulgent Spheres | ontoken |
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
| Holy Weapon | ontoken |
| Homunculus Servant | ontoken |
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
| Potion of | ontoken |
| Power Word | ontoken |
| Power Word Pain | ontoken |
| Quickened Healing | ontoken |
| Raulothim's Psychic Lance | ontoken |
| Repair | ontoken |
| Restoration | ontoken |
| Sapping Sting | ontoken |
| Scatter | ontoken |
| Shadow of Moil | ontoken |
| Shape Water | ontoken |
| Silvery Barbs | ontoken |
| Simbul's Synostodweomer | ontoken |
| Skill Empowerment | ontoken |
| Skywrite | ontoken |
| Slime | ontoken |
| Snare | ontoken |
| Sorcery Points | ontoken |
| Soul of Artifice | ontoken |
| Spectral Fangs | ontoken |
| Spectral Sword | ontoken |
| Spirit of Death | ontoken |
| Spore | ontoken |
| Steel Defender | ontoken |
| Summon Draconic Spirit | ontoken |
| Summon Greater Demon | ontoken |
| Summon Lesser Demon | ontoken |
| Summon Shadowspawn | ontoken |
| Sword Burst | ontoken |
| Syluné's Viper | ontoken |
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
| Doomtide | templatefx |
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
| Laeral's Silver Lance | templatefx |
| Maximilian's Earthen Grasp | templatefx |
| Mold Earth | templatefx |
| Nathair's Mischief | templatefx |
| Pyrotechnics | templatefx |
| Rime's Binding Ice | templatefx |
| Shape Water | templatefx |
| Sickening Radiance | templatefx |
| Spellfire Storm | templatefx |
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

## EXCEPTION · keys a row lost to an earlier one, NOT carried (81)

One FX answers one key. Where two rows both earned the same key, Automated Animations' own precedence keeps it — its exact-match rows first, then its menu order — which is what answered at the table under AA. The losing row's FX for THAT key is not written; where the row earned other keys, those are.

| Key | Kept | Not carried |
| --- | --- | --- |
| `weapon:shadow-blade` | Shadow Blade [ontoken] → shadow-blade | Blade [melee] |
| `natural:grave-strike` | Grave Strike [melee] → grave-strike | Strike [melee] |
| `natural:grave-strike-vampire-form-only` | Grave Strike [melee] → grave-strike-vampire-form-only | Strike [melee] |
| `natural:arcane-sword` | Arcane Sword [melee] → arcane-sword | Sword [melee] |
| `weapon:unarmed-strike` | Strike [melee] → unarmed-strike-swing | Unarmed Strike [melee] |
| `natural:unarmed-strike` | Strike [melee] → unarmed-strike | Unarmed Strike [melee] |
| `natural:unarmed-strike-vampire-form-only` | Strike [melee] → unarmed-strike-vampire-form-only | Unarmed Strike [melee] |
| `weapon:warpick` | Pick [melee] → warpick | War Pick [melee] |
| `weapon:war-pick` | Pick [melee] → war-pick | War Pick [melee] |
| `weapon:war-pick-2` | Pick [melee] → war-pick-2 | War Pick [melee] |
| `weapon:vicious-war-pick` | Pick [melee] → vicious-war-pick | War Pick [melee] |
| `weapon:war-pick-1` | Pick [melee] → war-pick-1 | War Pick [melee] |
| `weapon:war-pick-3` | Pick [melee] → war-pick-3 | War Pick [melee] |
| `natural:bone-whip` | Bone Whip [melee] → bone-whip | Whip [melee] |
| `weapon:bone-bow` | Bone Bow [range] → bone-bow | Bow [range] |
| `natural:arcane-burst` | Arcane Burst [range] → arcane-burst | Burst [range] |
| `natural:aquatic-burst` | Aquatic Burst [range] → aquatic-burst | Burst [range] |
| `natural:earth-burst` | Burst [range] → earth-burst | Earth Burst [range] |
| `natural:eldritch-burst` | Burst [range] → eldritch-burst | Eldritch Burst [range] |
| `spell:befuddlement` | Befuddlement [range] → befuddlement | Feeblemind [range] |
| `natural:lightning-strike` | Strike [melee] → lightning-strike | Lightning Strike [range] |
| `natural:necrotic-burst` | Burst [range] → necrotic-burst | Necrotic Burst [range] |
| `weapon:sun-blade` | Blade [melee] → sun-blade | Sun Blade [range] |
| `spell:witch-bolt` | Witch Bolt [preset] → witch-bolt | Witch Bolt [range] |
| `natural:arcane-sword` | Arcane Sword [melee] → arcane-sword | Arcane Sword [ontoken] |
| `spell:cordon-of-arrows` | Cordon of Arrows [range] → cordon-of-arrows | Cordon of Arrows [ontoken] |
| `natural:death-strike` | Strike [melee] → death-strike | Death Strike [ontoken] |
| `natural:gore` | Gore [melee] → gore | Gore [ontoken] |
| `natural:otherworldly-strike` | Strike [melee] → otherworldly-strike | Otherworldly Strike [ontoken] |
| `feature:restoring-touch` | Cleansing Touch [ontoken] → restoring-touch | Restoring Touch [ontoken] |
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
| `feature:step-of-the-wind` | Step of the Wind [ontoken] → step-of-the-wind | Step of the Wind [preset] |

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

### A different fx now (31)

- Enthralled Bullywug Warrior (npc) / Insectile Rapier [weapon] · keys weapon:insectile-rapier/attack, weapon:insectile-rapier, weapon:rapier/attack, weapon:rapier · was Rapier [melee] · now insectile-rapier (weapon:insectile-rapier)
- Gren Greenmantle (character) / Bog Staff [weapon] · keys natural:bog-staff/attack, natural:bog-staff · was Staff [melee] · now bog-staff (natural:bog-staff)
- Harrow Vane (npc) / Vesper Staff [weapon] · keys weapon:vesper-staff/attack, weapon:vesper-staff, weapon:quarterstaff/attack, weapon:quarterstaff · was Staff [melee] · now vesper-staff (weapon:vesper-staff)
- Hobgoblin Shaman (npc) / Vine Staff [weapon] · keys natural:vine-staff/attack, natural:vine-staff · was Staff [melee] · now vine-staff (natural:vine-staff)
- Morgash the Gravemaker (character) / Ember-Touched Greatsword [weapon] · keys weapon:ember-touched-greatsword/attack, weapon:ember-touched-greatsword, weapon:greatsword/attack, weapon:greatsword · was Greatsword [melee] · now ember-touched-greatsword (weapon:ember-touched-greatsword)
- Aldous (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Aldous (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Osric, the Keeper (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Osric, the Keeper (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Mother Wend (npc) / Heavy Crossbow [weapon] · keys weapon:heavy-crossbow/attack, weapon:heavy-crossbow, weapon:heavycrossbow/attack, weapon:heavycrossbow · was Crossbow [range] · now heavy-crossbow (weapon:heavy-crossbow)
- Mother Wend (npc) / Sera's Shortsword [weapon] · keys weapon:seras-shortsword/attack, weapon:seras-shortsword, weapon:shortsword/attack, weapon:shortsword · was Shortsword [melee] · now seras-shortsword (weapon:seras-shortsword)
- Mother Wend (npc) / Wooden staff [weapon] · keys weapon:wooden-staff/attack, weapon:wooden-staff, weapon:quarterstaff/attack, weapon:quarterstaff · was Staff [melee] · now wooden-staff (weapon:wooden-staff)
- Mother Wend (npc) / Light Crossbow [weapon] · keys weapon:light-crossbow/attack, weapon:light-crossbow, weapon:lightcrossbow/attack, weapon:lightcrossbow · was Crossbow [range] · now light-crossbow (weapon:light-crossbow)
- Mother Wend (npc) / Hand Crossbow [weapon] · keys weapon:hand-crossbow/attack, weapon:hand-crossbow, weapon:handcrossbow/attack, weapon:handcrossbow · was Crossbow [range] · now hand-crossbow (weapon:hand-crossbow)
- Mother Wend (npc) / Marn's Light Crossbow [weapon] · keys weapon:marns-light-crossbow/attack, weapon:marns-light-crossbow, weapon:lightcrossbow/attack, weapon:lightcrossbow · was Crossbow [range] · now marns-light-crossbow (weapon:marns-light-crossbow)
- Mother Wend (npc) / Light Hammer [weapon] · keys weapon:light-hammer/attack, weapon:light-hammer, weapon:lighthammer/attack, weapon:lighthammer · was Hammer [melee] · now light-hammer (weapon:light-hammer)
- Wight (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Wight (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Sharran Enforcer (npc) / Heavy Crossbow [weapon] · keys weapon:heavy-crossbow/attack, weapon:heavy-crossbow, weapon:heavycrossbow/attack, weapon:heavycrossbow · was Crossbow [range] · now heavy-crossbow (weapon:heavy-crossbow)
- BF Test Fighter (character) / Ember-Touched Greatsword [weapon] · keys weapon:ember-touched-greatsword/attack, weapon:ember-touched-greatsword, weapon:greatsword/attack, weapon:greatsword · was Greatsword [melee] · now ember-touched-greatsword (weapon:ember-touched-greatsword)
- Enthralled Bullywug Bog Sage (npc) / Bog Staff [weapon] · keys natural:bog-staff/attack, natural:bog-staff · was Staff [melee] · now bog-staff (natural:bog-staff)
- Selma (npc) / Sera's Longbow [weapon] · keys weapon:seras-longbow/attack, weapon:seras-longbow, weapon:longbow/attack, weapon:longbow · was Longbow [range] · now seras-longbow (weapon:seras-longbow)
- The Party (group) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- BF Test Shielder (character) / Bog Staff [weapon] · keys natural:bog-staff/attack, natural:bog-staff · was Staff [melee] · now bog-staff (natural:bog-staff)
- Cadoc, the Guardian (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Cadoc, the Guardian (npc) / Necrotic Scythe [weapon] · keys natural:necrotic-scythe/attack, natural:necrotic-scythe · was Scythe [melee] · now necrotic-scythe (natural:necrotic-scythe)
- Edda (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Edda (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Hesper, the Mortician (npc) / Necrotic Bow [weapon] · keys weapon:necrotic-bow/attack, weapon:necrotic-bow, weapon:longbow/attack, weapon:longbow · was Bow [range] · now necrotic-bow (weapon:necrotic-bow)
- Hesper, the Mortician (npc) / Necrotic Sword [weapon] · keys natural:necrotic-sword/attack, natural:necrotic-sword · was Sword [melee] · now necrotic-sword (natural:necrotic-sword)
- Jetten Elisedil (character) / +1 Dagger [weapon] · keys weapon:1-dagger/attack, weapon:1-dagger, weapon:dagger/attack, weapon:dagger · was Dagger [melee] · now 1-dagger (weapon:1-dagger)

### Play now, played nothing under AA (2)

- Morgash the Gravemaker (character) / Maul of Momentum [weapon] · keys weapon:maul-of-momentum/attack, weapon:maul-of-momentum, weapon:maul/attack, weapon:maul · was nothing · now maul (weapon:maul)
- BF Test Fighter (character) / Maul of Momentum [weapon] · keys weapon:maul-of-momentum/attack, weapon:maul-of-momentum, weapon:maul/attack, weapon:maul · was nothing · now maul (weapon:maul)

### Play nothing now, played under AA (9)

- Gren Greenmantle (character) / Spellfire Burst [feat] · keys feature:spellfire-burst/heal, feature:spellfire-burst · was Burst [range] · now nothing
- Gren Greenmantle (character) / Wand of Magic Missiles [equipment] · keys item:wand-of-magic-missiles/cast, item:wand-of-magic-missiles · was Missile [range] · now nothing
- Gren Greenmantle (character) / Shield [spell] · keys spell:shield/utility, spell:shield · was Shield [melee] · now nothing
- Mother Wend (npc) / Horn [tool] · keys item:horn/check, item:horn · was Horn [melee] · now nothing
- Mother Wend (npc) / Chain [consumable] · keys item:chain/check, item:chain · was Chain [melee] · now nothing
- Skeletal Mage (npc) / Shield [spell] · keys spell:shield/utility, spell:shield · was Shield [melee] · now nothing
- BF Test Shielder (character) / Spellfire Burst [feat] · keys feature:spellfire-burst/heal, feature:spellfire-burst · was Burst [range] · now nothing
- BF Test Shielder (character) / Wand of Magic Missiles [equipment] · keys item:wand-of-magic-missiles/cast, item:wand-of-magic-missiles · was Missile [range] · now nothing
- BF Test Shielder (character) / Shield [spell] · keys spell:shield/utility, spell:shield · was Shield [melee] · now nothing

### NPC attacks

202 attack weapons on the world's NPCs: 161 answered by the weapon's own name, 0 by its base weapon, 36 as a natural attack, 5 nothing.

- as a natural attack, e.g. Claw → natural:claw; Bite → natural:bite; Necrotic Burst → natural:necrotic-burst; Vine Staff → natural:vine-staff; Slam → natural:slam; Necrotic Sword → natural:necrotic-sword; Claw → natural:claw; Necrotic Sword → natural:necrotic-sword; Gore → natural:gore; Talons → natural:talons
- nothing: Battleaxe; Smother; Constricting Vine

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
