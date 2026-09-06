# Import report — Automated Animations → FX Studio

Run 2026-09-06 against the world `the-broken-heart-of-greenrest` snapshot (AA 7.0.22, D&D5e Animations 3.3.0, JB2A 0.9.2, PSFX 0.17.0, Sequencer 4.2.3). Regenerate with `node tools/import-aa.mjs --write --psfx-free <free build>`.

## Numbers

| Measure | Count |
| --- | --- |
| Preset rows (the baseline) | 1289 |
| · melee | 120 |
| · range | 159 |
| · ontoken | 562 |
| · templatefx | 218 |
| · aura | 0 |
| · preset | 46 |
| · aefx | 184 |
| World rows under AA | 1289 |
| World rows identical to the preset | 1286 |
| Modified here (house rows) | 3 |
| Made here (house rows) | 0 |
| Removed here (house rows that switch a look off) | 0 |
| Item flags kept as house rows | 4 |
| Item flags that add nothing | 1 |
| House rows | 7 |
| Layers converted | 1772 |
| · with an exact JB2A twin (same files, same structure) | 38 |
| · named by their JB2A family (the family holds more than AA's pick) | 1201 |
| · without a twin (play through the private table only) | 0 |
| · custom paths kept as given | 533 |
| · paths AA silently replaced with its first entry | 2 |
| · custom paths that do not exist on this install (silent under AA too) | 1 |
| · return animations AA named but its table lacks (none played) | 1 |
| · files in AA's table this JB2A build does not ship | 1 |
| Sounds | 1413 |
| · in the PSFX/JB2A tables | 1254 |
| · raw files on disk | 159 |
| · re-pointed (PSFX Patreon regrouped them) | 0 |
| · unresolved (silent under AA too) | 0 |
| Melee rows with the thrown-weapon switch on | 122 |
| Sound-only rows | 0 |
| Macro rows | 0 |
| Private twin: variant nodes / Sequencer entries | 325 / 1576 |
| **Parity: world rows that play identically** | **1289 of 1289** |
| Labels shadowed by another row under AA | 8 |
| JB2A twins whose Sequencer metadata differs from AA's (why the private table exists) | 1178 |

## The house layer

- **Sorcerous Burst** [range]: changed in this world: primary.video.menuType, primary.video.animation, primary.video.variant, primary.video.color, primary.video.enableCustom
- **Necrotic Burst** [range]: changed in this world: primary.video.animation, primary.video.variant, primary.video.color, primary.video.enableCustom, primary.video.customPath, primary.sound.file +17
- **Misty Step** [preset]: changed in this world: data.start.color, data.end.color
- **Unholy Word** [templatefx]: the item's own look (Harrow Vane / Unholy Word)
- **Necrotic Burst** [range]: the item's own look (Harrow Vane / Necrotic Burst)
- **First Light** [melee]: the item's own look (Thomas A. Invictus / First Light)
- **Goldthorn** [melee]: the item's own look (Jetten Elisedil / Goldthorn)

Item flags that add nothing over the baseline:

- Eldritch Blast [range]: differs from the preset only in fields fxstudio does not carry (soundOnly.sound.enable)

## Re-pointed sounds

None.

## Layers without a JB2A twin

These play only through the private table (`fxstudio.aa.*`); their files are not in JB2A's own registration.


## Paths AA replaced with its first entry

- [melee] Arcane Sword thrown: variant: fire -> 01; color: red -> blue
- [melee] Morningstar thrown: variant: 02 -> 01

## Paths that do not exist on this install

Carried as they are, marked, and silent — as they were under AA.

- [range] Boomerang: return autoanimations.return.weapon.boomerang.02.white (no such node in AA's table; no return animation played)
- [ontoken] Adventurer's Atlas secondary: modules/dnd5e-animations/assets/graphics/Map.png
- AA's table names `modules/jb2a_patreon/Library/Generic/Magic_Signs/RunesTransmutationRuneComplete_01_Regular_Pink_400x400.webm`

## Shadowed labels

Under AA these rows can never play for their own name because a shorter or earlier label wins the substring search; fxstudio matches whole names, so the row's own name now reaches it.

- [range] "Witch Bolt" is shadowed by [preset] "Witch Bolt" under AA; fxstudio plays [preset] "Witch Bolt"
- [ontoken] "Arcane Sword" is shadowed by [melee] "Arcane Sword" under AA; fxstudio plays [melee] "Arcane Sword"
- [ontoken] "Cordon of Arrows" is shadowed by [range] "Cordon of Arrows" under AA; fxstudio plays [range] "Cordon of Arrows"
- [ontoken] "Gore" is shadowed by [melee] "Gore" under AA; fxstudio plays [melee] "Gore"
- [preset] "Ice Knife" is shadowed by [range] "Ice Knife" under AA; fxstudio plays [range] "Ice Knife"
- [preset] "Lightning Arrow" is shadowed by [ontoken] "Lightning Arrow" under AA; fxstudio plays [ontoken] "Lightning Arrow"
- [preset] "Meteor Swarm" is shadowed by [ontoken] "Meteor Swarm" under AA; fxstudio plays [ontoken] "Meteor Swarm"
- [preset] "Step of the Wind" is shadowed by [ontoken] "Step of the Wind" under AA; fxstudio plays [ontoken] "Step of the Wind"

## Why the private table

AA registers its own copy of the JB2A files with its own Sequencer metadata (templates, markers). The native `jb2a.*` paths carry JB2A's metadata, which differs for 1178 layers; playing those through the native path would change how Sequencer stretches and times them. The module therefore registers AA's subset verbatim as `fxstudio.aa` and the baseline plays through it. Examples:

- autoanimations.melee.generic.slashing.03.orange → jb2a.melee_generic.slash.01.orange: {"template":[100,0,0]} vs {"metadata":{"name":"Melee - Generic"},"template":[200,300,300]}
- autoanimations.melee.weapon.sword.fire.red → jb2a.sword.melee.fire.red: {"template":[100,0,0]} vs {"metadata":{"name":"Sword"},"template":[200,300,300]}
- autoanimations.melee.generic.2hb.01.white → jb2a.melee_generic.bludgeoning.two_handed: {"template":[100,0,0]} vs {"metadata":{"name":"Melee - Generic"},"template":[200,300,300]}
- autoanimations.melee.generic.1hs.01.white → jb2a.melee_generic.slashing.one_handed: {"template":[100,0,0]} vs {"metadata":{"name":"Melee - Generic"},"template":[200,300,300]}
- autoanimations.melee.generic.2hp.01.white → jb2a.melee_generic.piercing.two_handed: {"template":[100,0,0]} vs {"metadata":{"name":"Melee - Generic"},"template":[200,300,300]}

## Matching census

Every item on the world's actors and in the PHB packs, through AA's lookup (longest label contained in the activity name, then the item name) and through fxstudio's (the whole name; generic weapon and creature rows by whole word). 713 distinct names; 585 get the same answer.

### AA plays something, fxstudio plays nothing (93)

Each of these is a substring or activity-name match under AA. Where the picture was actually wanted, add a house row with that name.

- Gren Greenmantle (character) / Fey-Touched (activities: Misty Step - Fey-Touched, Bless - Fey-Touched): AA "Misty Step" [preset] · fxstudio nothing
- Gren Greenmantle (character) / Candle (activities: Light): AA "Light" [ontoken] · fxstudio nothing
- Gren Greenmantle (character) / Manacles (activities: Bind, Escape Check, Burst Check): AA "Burst" [range] · fxstudio nothing
- Gren Greenmantle (character) / Spellcasting: AA "Sting" [melee] · fxstudio nothing
- Gren Greenmantle (character) / Magic Initiate (activities: Healing Word - Magic Initiate): AA "Healing Word" [ontoken] · fxstudio nothing
- Gren Greenmantle (character) / Rope (activities: Tie Knot, Burst Rope, Escape Check): AA "Burst" [range] · fxstudio nothing
- Gren Greenmantle (character) / Lesser Restoration: AA "Restoration" [ontoken] · fxstudio nothing
- Ettercap (npc) / Web Strand (activities: Save): AA "Web" [range] · fxstudio nothing
- Ettercap (npc) / Web Walker: AA "Web" [range] · fxstudio nothing
- Harrow Vane (npc) / Mass Healing Word: AA "Healing Word" [ontoken] · fxstudio nothing
- Harrow Vane (npc) / Spellcasting (activities: Death Armor, Zone of Truth, Dispel Magic, Healing Word, Flame Strike, Cure Wounds, Mass Healing Word, Word of Recall): AA "Death Armor" [ontoken] · fxstudio nothing
- Hobgoblin Shaman (npc) / Spellcasting (activities: Healing Word, Misty Step, Cure Wounds): AA "Healing Word" [ontoken] · fxstudio nothing
- Sharran Acolyte (npc) / Spellcasting (activities: Spirit Guardians, Hold Person, Healing Word, Heat Metal, Inflict Wounds, Shield of Faith): AA "Hold Person" [ontoken] · fxstudio nothing
- Sharran Acolyte (npc) / Shield of Faith: AA "Shield" [melee] · fxstudio nothing
- Morgash the Gravemaker (character) / Maul of Momentum (activities: Unstoppable Drive): AA "Maul" [melee] · fxstudio nothing
- Morgash the Gravemaker (character) / Healer's Kit (activities: Stabilize): AA "Stab" [melee] · fxstudio nothing
- Sleeping Cat (npc) / Jumper: AA "Jump" [ontoken] · fxstudio nothing
- Mother Wend (npc) / Battleaxe: AA "Axe" [melee] · fxstudio nothing
- Hazel (npc) / Locate Object (activities: Cast): AA "Locate" [ontoken] · fxstudio nothing
- Hazel (npc) / Mimicry: AA "Mimic" [ontoken] · fxstudio nothing
- Hazel (npc) / Spellcasting (activities: Misty Step - Spellcasting, Suggestion - Spellcasting, Hellish Rebuke - Spellcasting, Hex - Spellcasting): AA "Misty Step" [preset] · fxstudio nothing
- Skeletal Mage (npc) / Spellcasting (activities: Ray of Frost - Spellcasting, Fire Bolt - Spellcasting, Magic Missile - Spellcasting, Shield - Spellcasting, Ice Knife - Spellcasting, Darkness - Spellcasting): AA "Ray of Frost" [range] · fxstudio nothing
- Animated Rug of Smothering (npc) / Smother (activities: Grappled: Damage): AA "Grapple" [melee] · fxstudio nothing
- Salyth (character) / Blessing of Moonlight (activities: Moonlight Healing, Modify Moonbeam, Modified Save (Blessing of Moonlight)): AA "Moonbeam" [templatefx] · fxstudio nothing
- Sharran Zealot (npc) / Wrathful Smite (activities: Frightened Save, Damage): AA "Smite" [ontoken] · fxstudio nothing
- Sharran Zealot (npc) / Spellcasting (activities: Misty Step, Bane, Wrathful Smite): AA "Misty Step" [preset] · fxstudio nothing
- Mabel (npc) / Spellcasting (activities: Misty Step - Spellcasting, Dissonant Whispers - Spellcasting, Mirror Image - Spellcasting, Hex - Spellcasting): AA "Misty Step" [preset] · fxstudio nothing
- Thomas A. Invictus (character) / Blessed Warrior: AA "Bless" [ontoken] · fxstudio nothing
- Thomas A. Invictus (character) / Shield Master (activities: Shield Bash): AA "Shield" [melee] · fxstudio nothing
- Thomas A. Invictus (character) / Wrathful Smite: AA "Smite" [ontoken] · fxstudio nothing
- Thomas A. Invictus (character) / Thunderous Smite (activities: Save vs. Push): AA "Smite" [ontoken] · fxstudio nothing
- Thomas A. Invictus (character) / Searing Smite (activities: Start of Turn Save, Damage): AA "Smite" [ontoken] · fxstudio nothing
- Thomas A. Invictus (character) / Detect Poison and Disease: AA "Poison" [ontoken] · fxstudio nothing
- Thomas A. Invictus (character) / Paladin's Smite: AA "Smite" [ontoken] · fxstudio nothing
- Thomas A. Invictus (character) / Shining Smite: AA "Smite" [ontoken] · fxstudio nothing
- Enthralled Bullywug Bog Sage (npc) / Multiattack (activities: Expand Use): AA "Pan" [melee] · fxstudio nothing
- Selma (npc) / Potion of Pugilism (activities: Drink, Extra Force Damage): AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Resistance (activities: Drink Potion): AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Diminution: AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Fire Breath (activities: Breathe Fire, Drink): AA "Fire Breath" [templatefx] · fxstudio nothing
- Selma (npc) / Potion of Water Breathing (activities: Drink): AA "Water Breathing" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Growth: AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Clairvoyance: AA "Clairvoyance" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Climbing (activities: Drink): AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Animal Friendship: AA "Animal Friendship" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Comprehension: AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Heroism (activities: Drink): AA "Potion of" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Invisibility (activities: Drink): AA "Invisibility" [ontoken] · fxstudio nothing
- Selma (npc) / Potion of Giant Strength (Hill) (activities: Drink Potion): AA "Potion of" [ontoken] · fxstudio nothing
- Edda (npc) / Spellcasting (activities: Bane - Spellcasting, Command - Spellcasting, Blindness/Deafness - Spellcasting, Hold Person - Spellcasting): AA "Sting" [melee] · fxstudio nothing
- Vine Blight (npc) / Constricting Vine (activities: Damage: Grappled): AA "Grapple" [melee] · fxstudio nothing
- Jetten Elisedil (character) / Favored Enemy (activities: Hunter's Mark - Favored Enemy): AA "Hunter's Mark" [ontoken] · fxstudio nothing
- Jetten Elisedil (character) / Elven Lineage, Wood Elf (activities: Longstrider - Elven Lineage, Wood Elf): AA "Longstrider" [ontoken] · fxstudio nothing
- Jetten Elisedil (character) / Pass without Trace (activities: Use (free casting)): AA "Sting" [melee] · fxstudio nothing
- PHB spells / Mordenkainen's Faithful Hound (activities: Move Hound): AA "Faithful Hound" [ontoken] · fxstudio nothing
- PHB spells / Mordenkainen's Magnificent Mansion (activities: Create Door): AA "Magnificent Mansion" [ontoken] · fxstudio nothing
- PHB spells / Mordenkainen's Private Sanctum: AA "Private Sanctum" [ontoken] · fxstudio nothing
- PHB spells / Banishing Smite (activities: Banishment Save, Damage): AA "Banishment" [ontoken] · fxstudio nothing
- PHB spells / Blinding Smite (activities: End of Turn Save): AA "Smite" [ontoken] · fxstudio nothing
- PHB spells / Drawmij's Instant Summons (activities: Inscribe Mark, Recall Object): AA "Lob" [range] · fxstudio nothing
- PHB spells / Evard's Black Tentacles: AA "Black Tentacles" [templatefx] · fxstudio nothing
- PHB spells / Jallarzi's Storm of Radiance: AA "Storm of Radiance" [templatefx] · fxstudio nothing
- PHB spells / Leomund's Secret Chest (activities: Recall Chest, Hide Chest): AA "Secret Chest" [ontoken] · fxstudio nothing
- PHB spells / Leomund's Tiny Hut: AA "Tiny Hut" [templatefx] · fxstudio nothing
- PHB spells / Locate Animals or Plants: AA "Locate" [ontoken] · fxstudio nothing
- PHB spells / Locate Object: AA "Locate" [ontoken] · fxstudio nothing
- PHB spells / Mass Suggestion: AA "Suggestion" [ontoken] · fxstudio nothing
- PHB spells / Nystul's Magic Aura: AA "Magic Aura" [ontoken] · fxstudio nothing
- PHB spells / Otiluke's Freezing Sphere (activities: Cast and Fire, Freeze Water, Cast and Hold, Throw Held Globe): AA "Lob" [range] · fxstudio nothing
- PHB spells / Otiluke's Resilient Sphere: AA "Resilient Sphere" [ontoken] · fxstudio nothing
- PHB spells / Otto's Irresistible Dance: AA "Irresistible Dance" [ontoken] · fxstudio nothing
- PHB spells / Staggering Smite (activities: Stun Save, Damage): AA "Smite" [ontoken] · fxstudio nothing
- PHB spells / Tasha's Hideous Laughter: AA "Hideous Laughter" [ontoken] · fxstudio nothing
- PHB spells / Tenser's Floating Disk: AA "Floating Disk" [ontoken] · fxstudio nothing
- PHB spells / True Polymorph: AA "Polymorph" [ontoken] · fxstudio nothing
- PHB spells / True Resurrection: AA "Resurrection" [ontoken] · fxstudio nothing
- PHB feats / Boon of Dimensional Travel (activities: Teleport): AA "Teleport" [preset] · fxstudio nothing
- PHB feats / Unarmed Fighting (activities: Unarmed Strike (Weapon in Hand), Unarmed Strike (Empty Hand), Grappled Damage): AA "Unarmed Strike" [melee] · fxstudio nothing
- PHB feats / Actor (activities: Mimicry): AA "Mimic" [ontoken] · fxstudio nothing
- PHB feats / Charger (activities: Charge Attack): AA "Charge" [melee] · fxstudio nothing
- PHB feats / Chef (activities: Replenishing Meal, Bolstering Treats, Eat Treat): AA "Bolster" [ontoken] · fxstudio nothing
- PHB feats / Crossbow Expert: AA "Crossbow" [range] · fxstudio nothing
- PHB feats / Crusher: AA "Crush" [ontoken] · fxstudio nothing
- PHB feats / Defensive Duelist (activities: Parry): AA "Parry" [melee] · fxstudio nothing
- PHB feats / Fey-Touched: AA "Touch" [ontoken] · fxstudio nothing
- PHB feats / Grappler: AA "Grapple" [melee] · fxstudio nothing
- PHB feats / Poisoner (activities: Create Poison Doses, Apply Poison, Poison Save (Dexterity), Poison Save (Intelligence)): AA "Poison" [ontoken] · fxstudio nothing
- PHB feats / Polearm Master (activities: Pole Strike, Reactive Strike): AA "Strike" [melee] · fxstudio nothing
- PHB feats / Shadow-Touched: AA "Touch" [ontoken] · fxstudio nothing
- PHB feats / Slasher: AA "Slash" [melee] · fxstudio nothing
- PHB feats / Tavern Brawler (activities: Enhanced Unarmed Strike): AA "Unarmed Strike" [melee] · fxstudio nothing
- PHB equipment / Alchemist's Fire: AA "Alchemist's" [range] · fxstudio nothing
- PHB equipment / Poison, Basic: AA "Poison" [ontoken] · fxstudio nothing

### Both play, but different rows (34)

- Gren Greenmantle (character) / Spellfire Burst (activities: Bolstering Flames, Radiant Fire): AA "Bolster" [ontoken] · fxstudio "Burst" [range]
- Gren Greenmantle (character) / Speak with Animals (activities: Use (free casting)): AA "Sting" [melee] · fxstudio "Speak with Animals" [ontoken]
- Gren Greenmantle (character) / Font of Magic (activities: Regain Spell Slot, Regain Sorcery Points): AA "Sorcery Points" [ontoken] · fxstudio "Font of Magic" [ontoken]
- Gren Greenmantle (character) / Sorcerous Restoration (activities: Restore Sorcery Points): AA "Sorcery Points" [ontoken] · fxstudio "Sorcerous Restoration" [ontoken]
- Hobgoblin Captain (npc) / First Light (activities: Cast Heroism): AA "Heroism" [ontoken] · fxstudio "First Light" [melee]
- Harrow Vane (npc) / Word of Recall (activities: Teleport to Sanctuary, Designate Sanctuary): AA "Sanctuary" [ontoken] · fxstudio "Word of Recall" [ontoken]
- Harrow Vane (npc) / Vesper Staff (activities: Darkness, Invisibility, Dispel Magic, Counterspell): AA "Darkness" [templatefx] · fxstudio "Staff" [melee]
- Morgash the Gravemaker (character) / Tactical Mind (activities: Expend Second Wind): AA "Second Wind" [ontoken] · fxstudio "Tactical Mind" [ontoken]
- Salyth (character) / Ray of Enfeeblement (activities: Save (free casting)): AA "Sting" [melee] · fxstudio "Ray of Enfeeblement" [range]
- Salyth (character) / False Life (activities: Temporary Health, Temporary Health (free casting)): AA "Sting" [melee] · fxstudio "False Life" [ontoken]
- Sharran Zealot (npc) / Lay on Hands (activities: Remove Poison): AA "Poison" [ontoken] · fxstudio "Lay on Hands" [ontoken]
- Thomas A. Invictus (character) / Find Steed (activities: Summon Steed, Summon Flying Steed, Summon Steed (free casting), Summon Flying Steed (free casting)): AA "Fly" [ontoken] · fxstudio "Find Steed" [ontoken]
- Thomas A. Invictus (character) / Divine Smite (activities: Unholy Creature Damage, Cast, Unholy Creature Damage (free casting), Cast (free casting)): AA "Sting" [melee] · fxstudio "Divine Smite" [ontoken]
- Thomas A. Invictus (character) / Channel Divinity (activities: Divine Sense): AA "Divine Sense" [ontoken] · fxstudio "Channel Divinity" [ontoken]
- Jetten Elisedil (character) / Dread Ambusher (activities: Dreadful Strike, Ambusher's Leap): AA "Strike" [melee] · fxstudio "Dread Ambusher" [ontoken]
- Jetten Elisedil (character) / Goldthorn (activities: Cast Faerie Fire): AA "Faerie Fire" [templatefx] · fxstudio "Goldthorn" [melee]
- PHB spells / Alter Self (activities: Aquatic Adaptation, Change Appearance, Natural Weapons, Attack: Claws, Attack: Fangs/Horns, Attack: Hooves): AA "Claw" [melee] · fxstudio "Alter Self" [ontoken]
- PHB spells / Blade Barrier (activities: Blade Wall, Blade Ring): AA "Blade Wall" [templatefx] · fxstudio "Blade Barrier" [ontoken]
- PHB spells / Conjure Celestial (activities: Conjure Pillar, Healing Light, Searing Light): AA "Healing Light" [ontoken] · fxstudio "Conjure Celestial" [templatefx]
- PHB spells / Control Weather (activities: Cast and Control, Change Conditions): AA "Control " [ontoken] · fxstudio "Control Weather" [ontoken]
- PHB spells / Create Undead (activities: Animate Corpses, Reassert Control, Mentally Command): AA "Control " [ontoken] · fxstudio "Create Undead" [ontoken]
- PHB spells / Delayed Blast Fireball (activities: Create Bead, Touch Bead, Turn End Damage Increase, Trigger Explosion): AA "Touch" [ontoken] · fxstudio "Delayed Blast Fireball" [preset]
- PHB spells / Find Steed (activities: Summon Steed, Summon Flying Steed): AA "Fly" [ontoken] · fxstudio "Find Steed" [ontoken]
- PHB spells / Flame Blade (activities: Evoke Blade): AA "Blade" [melee] · fxstudio "Flame Blade" [ontoken]
- PHB spells / Hunger of Hadar (activities: Open Gateway, Start of Turn Damage, End of Turn Save): AA "Gate" [ontoken] · fxstudio "Hunger of Hadar" [ontoken]
- PHB spells / Maze (activities: Banish to Maze): AA "Banish" [ontoken] · fxstudio "Maze" [range]
- PHB spells / Prismatic Wall (activities: Create Wall, Create Globe, Blinding Save, Traversal Save): AA "Lob" [range] · fxstudio "Prismatic Wall" [templatefx]
- PHB spells / Storm of Vengeance (activities: Create Storm, Turn 2: Acid Rain, Turn 3: Lightning, Turn 4: Hailstones, Turn 5+: Gusts and Rain): AA "Gust" [ontoken] · fxstudio "Storm of Vengeance" [ontoken]
- PHB spells / Symbol (activities: Inscribe Glyph, Death, Discord, Fear, Pain, Sleep, Stunning): AA "Fear" [templatefx] · fxstudio "Symbol" [ontoken]
- PHB spells / Wall of Force (activities: Sphere or Globe, Panels): AA "Lob" [range] · fxstudio "Wall of Force" [templatefx]
- PHB spells / Wall of Ice (activities: Create Globe, Create Panels, Frigid Air): AA "Lob" [range] · fxstudio "Wall of Ice" [templatefx]
- PHB spells / Wall of Stone (activities: Square Panels, Long Panels): AA "Pan" [melee] · fxstudio "Wall of Stone" [templatefx]
- PHB spells / Mordenkainen's Sword (activities: Create Spectral Sword): AA "Spectral Sword" [ontoken] · fxstudio "Mordenkainen's Sword" [ontoken]
- PHB equipment / Unarmed Strike (activities: Grapple/Shove): AA "Grapple" [melee] · fxstudio "Unarmed Strike" [melee]

### fxstudio plays, AA does not (1)

- Harrow Vane (npc) / Unholy Word (activities: Save): AA nothing · fxstudio "Unholy Word" [templatefx]

### Same answer, reached by the name without its qualifier (13)

"Misty Step - Spellcasting", "Bless - Fey-Touched", "Potion of Healing (Greater)": the name before the dash or the parenthesis is tried when the whole name has no row.

- Gren Greenmantle (character) / Bless - Fey-Touched → "Bless" (as "Bless")
- Gren Greenmantle (character) / Healing Word - Magic Initiate → "Healing Word" (as "Healing Word")
- Gren Greenmantle (character) / Misty Step - Fey-Touched → "Misty Step" (as "Misty Step")
- Morgash the Gravemaker (character) / Potion of Healing (Greater) → "Potion of Healing" (as "Potion of Healing")
- Hazel (npc) / Misty Step - Spellcasting → "Misty Step" (as "Misty Step")
- Hazel (npc) / Suggestion - Spellcasting → "Suggestion" (as "Suggestion")
- Hazel (npc) / Hex - Spellcasting → "Hex" (as "Hex")
- Hazel (npc) / Hellish Rebuke - Spellcasting → "Hellish Rebuke" (as "Hellish Rebuke")
- Mabel (npc) / Dissonant Whispers - Spellcasting → "Dissonant Whispers" (as "Dissonant Whispers")
- Mabel (npc) / Mirror Image - Spellcasting → "Mirror Image" (as "Mirror Image")
- Selma (npc) / Potion of Healing (Superior) → "Potion of Healing" (as "Potion of Healing")
- Jetten Elisedil (character) / Hunter's Mark - Favored Enemy → "Hunter's Mark" (as "Hunter's Mark")
- Jetten Elisedil (character) / Longstrider - Elven Lineage, Wood Elf → "Longstrider" (as "Longstrider")

### Effects (137 names, 19 differ)

- Gren Greenmantle (character) / effect "Survival Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Intimidation Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Performance Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Acrobatic Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Nature Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Deception Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Investigation Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Stealth Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Medicine Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Arcana Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Insight Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "History Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Persuasion Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Religion Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Sleight of Hand Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Perception Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Athletic Guidance": AA "Guidance" · fxstudio nothing
- Gren Greenmantle (character) / effect "Animal Handling Guidance": AA "Guidance" · fxstudio nothing
- Hazel (npc) / effect "Pursuing Suggestion": AA "Suggestion" · fxstudio nothing

## Nothing plays yet — the party's sheets

123 of 174 abilities with an activity have a look. These do not, and play nothing until given one:

- **Gren Greenmantle** (12): Torch [consumable]; Fey-Touched [feat]; Candle [consumable]; Manacles [consumable]; Aura of Vitality [spell]; Oil [consumable]; Subtle Spell [feat]; Magic Initiate [feat]; Rope [consumable]; Antitoxin [consumable]; Lesser Restoration [spell]; Careful Spell [feat]
- **Morgash the Gravemaker** (10): Riposte [feat]; Maul of Momentum [weapon]; Great Weapon Master [feat]; Precision Attack [feat]; Healer's Kit [consumable]; Keoghtom's Ointment [consumable]; Torch [consumable]; Rope [consumable]; Rally [feat]; Antitoxin [consumable]
- **Salyth** (5): Bullseye Lantern [consumable]; Moon's Inspiration [feat]; Blessing of Moonlight [feat]; Water (Pint) [consumable]; Oil [consumable]
- **Thomas A. Invictus** (14): Shield Master [feat]; Healer [feat]; Wrathful Smite [spell]; Thunderous Smite [spell]; Searing Smite [spell]; Resourceful [feat]; Detect Magic [spell]; Healer's Kit [consumable]; Shield of Faith [spell]; Detect Evil and Good [spell]; Detect Poison and Disease [spell]; Shining Smite [spell]; Torch [consumable]; Antitoxin [consumable]
- **Jetten Elisedil** (10): Torch [consumable]; Favored Enemy [feat]; Rope [consumable]; Healer's Kit [consumable]; Bullseye Lantern [consumable]; Antitoxin [consumable]; Magic Initiate [feat]; Elven Lineage, Wood Elf [feat]; Pass without Trace [spell]; Oil [consumable]
