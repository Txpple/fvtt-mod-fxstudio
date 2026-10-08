# Open Roll 5e: FX Studio

A Foundry VTT module for the dnd5e system that plays visual and sound effects from what actually
happened at the table: an attack that hit or missed, a save spell, a heal, an area placed on the
map, an effect applied to a token. Sequencer is the engine and JB2A and PSFX are the libraries. It
replaces Automated Animations: the D&D5e Animations collection was migrated once into the module's
own Stock, so a table does not start from zero, and the GM's own FX sit on top of it. Everything is
browsed and edited in one window.

## How it works

- **An FX answers one ability, exactly.** Each FX is keyed to one spell, weapon, natural attack,
  feature, item or effect by dnd5e's own identifier. There are no name rules and no guessing: an
  ability with no FX plays nothing.
- **An FX plays when the outcome is known.** An attack plays on its attack card, with hit and miss
  known per target; a save or a heal on its damage or healing card; an area when its template is
  placed; anything else on the usage card. An effect's picture lasts while the effect stands.
- **Stock and House.** Stock is about a thousand FX for the 2024 core books, Ravenloft: The Horrors
  Within, Heroes of Faerûn, the system's SRD 5.2 content and dnd5e's base weapons. House is your
  table's own. A House FX with the same key as a Stock FX overrides it; delete the override and
  Stock plays again.
- **One copy can play differently from another.** Own key gives a single item an identifier of its
  own, so one character's Fire Bolt can look different from everyone else's. Nothing of the module
  is stored on the item.
- **Save writes the file.** An FX lives in the module's recipe files on the server, not in the
  world. There is no draft layer.
- **One client plays, everyone sees it.** The user behind the moment plays the FX and Sequencer
  carries it to every other client.

## Installation

Paste the manifest URL into Foundry's *Install Module* dialog:

```
https://github.com/Txpple/fvtt-mod-fxstudio/releases/latest/download/module.json
```

Requires Foundry VTT v14, the dnd5e system 6.x and the
[Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer) module 4.0 or later. The FX
draw their pictures from JB2A and their sounds from PSFX, installed separately; Stock was built
against the Patreon editions, and a scene whose file is not in your libraries plays nothing.

## The window

The GM opens FX Studio from the **Open FX Studio** button in the Settings sidebar, or from the wand
on any item sheet's header, which opens that item's FX. The window has four tabs.

- **Library** lists every FX, House above Stock, with a search by name and facets for where an FX
  lives, its kind and whether it is switched off. **Import** and **Export** at the top left read and
  write FX as JSON files.
- **Editor** is the FX sheet, the same whether you read it or change it; an Edit switch guards it.
  The Key strip says which ability the FX answers, the item it is on (with Own key), the moment and
  whether it is on. Below it the sequence lists the FX's scenes, each one a shape (strike, shoot,
  beam, fill, aura, mark, move or sound, plus a custom escape hatch) with its picture, placement,
  size, opacity, colour, sound and timing. The FX reads back as a plain-English sentence as you
  edit. New FX, Duplicate, Export and Delete sit in the action bar. Saving a Stock FX asks whether
  the change is a House override or a change to Stock itself.
- **Assets** browses JB2A by style and PSFX by group and sound, with the picture looping, the sound
  behind a Play button, and every FX that uses the asset one click away. The same browser opens from
  a scene to pick its VFX or SFX.
- **Coverage** reads the compendiums you pick and shows which abilities play nothing and which
  files did not resolve.

Everything the window does goes through the module's API
(`game.modules.get('fvtt-mod-fxstudio').api`), so a macro can do the same.

## Areas and moves

A lasting area picture, such as Fog Cloud or Web, hides dnd5e's template region from the players
while the picture stands; the GM still sees it on the Regions layer. A teleport, such as Misty
Step, places the token with Foundry's own teleport action, on a spot the spell allows.

## Battle Flow

With [Open Roll 5e: Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow) installed, FX
Studio also plays the moments that post no card of their own (a maneuver die, Sneak Attack, a die
folded into a roll, a rider's damage, a held roll answered), and waits while Battle Flow holds a
cast for an answer. Neither module needs the other.

## Settings

*Game Settings → Configure Settings → Open Roll 5e: FX Studio.*

| Setting | What it does |
| --- | --- |
| Play FX | On by default. Off keeps the window working and plays nothing. |
| Console log | Off by default. On writes one console line per moment: what happened, which FX answered and which files played. Per client. |

## Repository layout

```
module.json            the Foundry manifest
scripts/
  fxstudio.js          the module's entry point
  api.js               the API the window and macros share
  core/                what an FX is: keys, shapes, moments, gates
  engine/              plays a shape through Sequencer
  readers/             turns dnd5e cards, templates and effects (and Battle Flow moments) into moments
  ui/                  the window: Library, Editor, Assets, Coverage
  files.js, settings.js
recipes/
  stock/               the Stock FX, one file per kind (GPL-3, see below)
  house.json           this table's own FX and overrides
  records.json         the record names behind the keys
  SCHEMA.md            the recipe schema
styles/  templates/
tools/                 the offline checks, the live suites, the release build (tools/README.md)
prototypes/            clickable mock-ups ruled on before a feature is built
```

## Development

There is no build step: the module is plain ES modules loaded straight from `scripts/`. The
offline gate is the `check-*.mjs` scripts in `tools/`, which prove the engine, the readers, the
layers and every recipe file; `tools/build-release.ps1` runs them all and writes the zip. The live
suites (`smoke-*.mjs`) run against the local sandbox through the house MCP repo (`fvtt-mcp-dnd5e`,
a `file:` dev dependency beside this one); run `npm install` once. [tools/README.md](tools/README.md)
describes each tool. Releases: bump `version` and the `download` URL in `module.json` together, tag
`vX.Y.Z`, build with `tools/build-release.ps1`, and publish the zip and manifest as a GitHub
release.

<!-- openroll5e:family -->
## Part of Open Roll 5e

FX Studio is one of the Open Roll 5e modules for Foundry VTT, a suite built for one D&D 5e table and
shared. Each module installs and works on its own and none needs another; together they cover the
table from the fog of war to the loot. The other modules:

- [Open Roll 5e: Autoexplore](https://github.com/Txpple/fvtt-mod-autoexplore): lets a scene start fully explored, so the whole map shows through the fog of war while tokens still need line of sight.
- [Open Roll 5e: Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow): combat automation for dnd5e 2024 rules: a hit rolls and applies its own damage, saves resolve themselves, reactions hold, and concentration is tracked. Every rule that touches a fight in the 2024 core books, Heroes of Faerûn, Arcana Unleashed and Ravenloft: The Horrors Within.
- [Open Roll 5e: Combat Plus](https://github.com/Txpple/fvtt-mod-combatplus): automates the chores of running a fight: combat music, an initiative gate, an out-of-turn movement block, defeated marking at 0 HP and turn alerts.
- [Open Roll 5e: Errata](https://github.com/Txpple/fvtt-mod-errata5e): corrects, in memory, bugs in the premium D&D 2024 books, the dnd5e system and Foundry itself, each fix held until the vendor ships its own.
- [Open Roll 5e: Loot Shelf](https://github.com/Txpple/fvtt-mod-lootshelf): loot chests and merchant shelves that players can take from, buy from and sell to without owning them, with a receipt for every trade.
- [Open Roll 5e: Open Server](https://github.com/Txpple/fvtt-mod-openserver): for hosted worlds: clears the startup pause so players can play before the GM arrives, and gives any user a landing scene of their own.
- [Open Roll 5e: Party Stash](https://github.com/Txpple/fvtt-mod-partystash): makes a dnd5e Group actor's inventory a working party stash: drags move instead of copying, coin moves through a dialog, and every transfer posts a receipt.
- [Open Roll 5e: Soundscape](https://github.com/Txpple/fvtt-mod-soundscape): background sound for scenes: random one-shots with silence between them, seamless crossfaded loops, day and night gating, and quiet during combat.

Three MCP servers for [Claude Code](https://claude.com/claude-code) complete the suite:

- [fvtt-mcp-dnd5e](https://github.com/Txpple/fvtt-mcp-dnd5e): builds D&D 5e content in a live Foundry world from Claude Code: a stat block becomes a complete NPC, a map image a walled and lit scene, an adventure its journals, tables and handouts.
- [fvtt-mcp-imagegen](https://github.com/Txpple/fvtt-mcp-imagegen): makes the art with Google's Gemini image models: icons, tokens, props, portraits, illustrations and battlemap restyles, grounded in what the world already shows.
- [fvtt-mcp-sessionscribe](https://github.com/Txpple/fvtt-mcp-sessionscribe): turns a session's Discord recording and Foundry chat log into its record. Its end-to-end `session-scribe` skill drives the server from the Craig link to a speaker-labelled transcript, a fully illustrated player recap, combat statistics, GM notes and a party snapshot.

How they fit together is mapped in [fvtt-suite-openroll5e](https://github.com/Txpple/fvtt-suite-openroll5e).
<!-- /openroll5e:family -->

## License

The code is MIT; see [LICENSE](LICENSE). `recipes/stock/*.json` is a derived work of
[D&D5e Animations](https://github.com/MrVauxs/dnd5e-animations) 3.3.0 by MrVauxs and Sisimshow and
is licensed GPL-3 (see `recipes/STOCK-LICENSE`).
