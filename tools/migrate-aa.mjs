// The migration: Automated Animations' corpus in, AA's practices out (ARCHITECTURE §6). Reads
// phase 1's lossless rows (tools/lib/oracle/, written by import-aa.mjs from AA's own data), keys
// every row by identity against the closed lists, turns every row into an FX in the grammar of
// core/fx.js with every AA option mapped onto a knob, points every asset at the libraries' own
// paths where the same files play the same way (the frozen table is what is left), PROVES at the
// render that the engine tells Sequencer what AA told it (tools/lib/migrate/proof.mjs), runs the
// census in the new keys, and writes the stock per kind, the house FX, the frozen table and
// the report. Offline; seconds.
//
//   node tools/migrate-aa.mjs            # everything, write nothing (report at dist/migration-report.md)
//   node tools/migrate-aa.mjs --write    # also write recipes/stock/*.json, house.json, aa-assets.json, migration-report.md
//   node tools/migrate-aa.mjs --show <row label>   # print the FX and the proof for one row
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES, RECIPES, REPO, moduleVersion, worldDb } from './lib/env.mjs';
import { readActors, snapshot } from './lib/leveldb.mjs';
import { leafPaths, loadJb2a, loadPsfx } from './lib/libraries.mjs';
import { install } from './lib/stage.mjs';
import { rows as oracleRows } from './lib/oracle/index.mjs';
import { buildIndex as oracleIndex, lookup as oracleLookup } from './lib/oracle/corpus.js';
import { buildLists } from './lib/migrate/keys.mjs';
import { makeNativiser } from './lib/migrate/nativise.mjs';
import { idFor, rowToFx } from './lib/migrate/rows.mjs';
import { makePlays, proveRow, stageTokens } from './lib/migrate/proof.mjs';
import { validate, sentence } from '../scripts/core/fx.js';
import { buildIndex, needsPlace, resolve } from '../scripts/core/corpus.js';
import { slug, subjectOfItemData, keysFor } from '../scripts/core/subjects.js';
import { useDatabase } from '../scripts/engine/assets.js';
import { database as stageDatabase } from './lib/stage.mjs';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const SHOW = args.includes('--show') ? args[args.indexOf('--show') + 1] : null;
const t0 = Date.now();
const say = (s) => console.log(s);
const fail = (s) => { console.error(`\n✗ ${s}`); process.exitCode = 1; };
const report = [];
const R = (s = '') => report.push(s);
const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------------------------
// 1 · read
// ---------------------------------------------------------------------------------------------
say('1 · read');
const versions = { aa: moduleVersion(MODULES.aa), dnd5eAnimations: moduleVersion(MODULES.dnd5eAnimations), jb2a: moduleVersion(MODULES.jb2a), psfx: moduleVersion(MODULES.psfx), sequencer: moduleVersion(MODULES.sequencer), dnd5e: moduleVersion(MODULES.dnd5e) };
const { stock: stockRows, house: houseRows, twin } = oracleRows();
const jb2a = await loadJb2a();
const psfx = await loadPsfx();
const dbs = { jb2a, psfx, fxstudio: twin.db };
say(`   rows: stock ${stockRows.length}, house ${houseRows.length} · libraries: jb2a ${versions.jb2a}, psfx ${versions.psfx}, the frozen twin ${leafPaths(twin.db, 'fxstudio').size} entries`);
const { actors: worldActors, items: worldItems, effects: worldEffects } = await readActors(snapshot(worldDb('actors')));
const lists = await buildLists({ worldActors, worldItems, worldEffects });
say(`   closed lists: spells ${lists.spells.size} · features ${lists.features.size} · items ${lists.items.size} · weapons ${lists.weapons.size} · natural attacks ${lists.natural.size} · world items ${lists.world.items.length}${lists.stats.skipped.length ? ` · packs not installed: ${lists.stats.skipped.join(', ')}` : ''}`);

// ---------------------------------------------------------------------------------------------
// 2 · keys — every row's label meets the closed lists once
// ---------------------------------------------------------------------------------------------
say('2 · keys');
const MENU_ORDER = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];
const keyed = { byList: 0, expanded: 0, ownNameOnly: 0, threeKinds: 0, effects: 0 };
const expansions = [];
const notCarried = [];
const threeKinds = [];
const ownOnly = [];
function keysForRow(row) {
  const label = row.name.trim();
  const own = slug(label);
  if (row.menu === 'aefx') { keyed.effects++; return [`effect:${own}`]; }
  const out = [];
  const add = (k) => { if (k && !out.includes(k)) out.push(k); };
  if (row.match === 'word') {
    // a family row (a weapon or a creature attack): expanded once against the base weapons, the natural attacks and the
    // books' and the world's weapons; never a spell, a feature or an item, whatever its word also names
    const { keys: ex, notCarried: nc } = lists.expandWord(label);
    // a swing is a weapon or a creature attack whatever its word also names ("Shield" is the bash, never the spell);
    // a bolt row named exactly as a spell or a feature IS that spell or feature (Mind Sliver, Life Drain)
    const kinds = lists.kindsOfName(label, { only: row.menu === 'melee' ? ['weapon', 'natural'] : null });
    if (nc.length) notCarried.push({ label, menu: row.menu, caught: nc });
    for (const k of kinds) add(`${k.kind}:${k.id}`);
    for (const e of ex) add(`${e.kind}:${e.id}`);
    if (!kinds.length && !ex.length) { add(row.menu === 'range' ? `weapon:${own}` : `weapon:${own}`); add(`natural:${own}`); }
    else if (!kinds.some((k) => k.id === own) && !ex.some((e) => e.id === own)) { add(`weapon:${own}`); add(`natural:${own}`); }
    keyed.expanded++;
    expansions.push({ label, menu: row.menu, keys: out, from: [...kinds.map((k) => `${k.kind}:${k.id} (${k.from})`), ...ex.map((e) => `${e.kind}:${e.id} ← ${e.name} (${e.from})`)] });
    return out;
  }
  const kinds = lists.kindsOfName(label);
  if (kinds.length) { keyed.byList++; for (const k of kinds) add(`${k.kind}:${k.id}`); return out; }
  // no list holds the name: keyed in the three kinds it could be, and listed
  keyed.threeKinds++;
  threeKinds.push(`${label} [${row.menu}]`);
  return [`spell:${own}`, `feature:${own}`, `item:${own}`];
}

// ---------------------------------------------------------------------------------------------
// 3 · fx — every row an FX, in AA's own precedence (exact-match rows first, then its menu order)
// ---------------------------------------------------------------------------------------------
say('3 · fx');
const nativiser = makeNativiser({ jb2a, twin: twin.db });
const taken = new Set();
const stockFx = []; // {fx, row, notes, source}
const notesByRow = [];
const ordered = [...stockRows].sort((a, b) => (a.match === 'exact' ? 0 : 1) - (b.match === 'exact' ? 0 : 1) || MENU_ORDER.indexOf(a.menu) - MENU_ORDER.indexOf(b.menu));
const idOfRow = new Map();
for (const row of ordered) {
  const id = idFor(row.name, row.menu, taken);
  idOfRow.set(row, id);
  const keys = keysForRow(row);
  const on = row.menu === 'aefx' ? 'effect' : 'use';
  const { fx, notes } = rowToFx(row, nativiser, { id, keys, on });
  fx.by = 'the migration';
  fx.at = today;
  fx.note = `D&D5e Animations ${versions.dnd5eAnimations}: "${row.name}" (${row.menu})`;
  stockFx.push({ fx, row, notes, source: 'stock' });
  if (notes.length) notesByRow.push(`${row.name} [${row.menu}]: ${notes.join('; ')}`);
}
// the house rows: a changed stock row keeps its id (and replaces it); an item's own FX is keyed like its name and named for its owner
const houseFx = [];
for (const row of houseRows) {
  const twinRow = stockRows.find((b) => b.name === row.name && b.menu === row.menu && !(row.note ?? '').includes("the item's own FX"));
  let id;
  if (row.off) { id = idOfRow.get(twinRow) ?? idFor(row.name, row.menu, taken); houseFx.push({ fx: { id, for: keysForRow(row), off: true, by: 'the migration', at: today, note: row.note ?? 'switched off in this world' }, row, notes: [], source: 'house' }); continue; }
  if (twinRow) id = idOfRow.get(twinRow);
  else { const owner = /\(([^/]+) \/ /.exec(row.note ?? '')?.[1]; id = idFor(owner ? `${row.name} ${owner}` : row.name, row.menu, taken); }
  const keys = keysForRow(row);
  const { fx, notes } = rowToFx(row, nativiser, { id, keys, on: row.menu === 'aefx' ? 'effect' : 'use' });
  fx.by = 'the migration';
  fx.at = today;
  fx.note = `${row.note ?? 'this world'} (Automated Animations ${versions.aa})`;
  houseFx.push({ fx, row, notes, source: 'house' });
  if (notes.length) notesByRow.push(`house ${row.name} [${row.menu}]: ${notes.join('; ')}`);
}
say(`   ${stockFx.length} stock FX, ${houseFx.length} house FX · keys: by the lists ${keyed.byList}, family rows expanded ${keyed.expanded}, effects ${keyed.effects}, in three kinds (no list holds the name) ${keyed.threeKinds}`);
const ns = nativiser.stats;
say(`   assets: ${ns.paths} AA paths → native exact ${ns.exact}, as JB2A leaves ${ns.leaves}, as JB2A range nodes ${ns.ranges}, as raw files ${ns.files} (AA's stretch metadata carried on ${ns.templateCarried}) · frozen ${ns.frozen} (markers ${ns.markersFrozen}, by-distance ${ns.rangeFrozen}, missing ${ns.missingNode})`);

// a key several stock FX claim goes to the one with the longest label, as AA's search took the longest label contained in a name;
// the shorter labels lose the key (an equal length keeps both, and the first in AA's order answers — listed as shadowed)
const claims = new Map();
for (const e of stockFx) for (const key of e.fx.for) (claims.get(`${key}|${e.fx.on}`) ?? claims.set(`${key}|${e.fx.on}`, []).get(`${key}|${e.fx.on}`)).push(e);
const ceded = [];
for (const [k, list] of claims) {
  if (list.length < 2) continue;
  const longest = Math.max(...list.map((e) => e.row.name.trim().length));
  for (const e of list) if (e.row.name.trim().length < longest) { const key = k.split('|')[0]; e.fx.for = e.fx.for.filter((x) => x !== key); ceded.push(`${key}: "${e.row.name}" cedes to ${list.filter((x) => x.row.name.trim().length === longest).map((x) => `"${x.row.name}"`).join(', ')}`); }
}
for (const e of stockFx) if (!e.fx.for.length) { e.fx.for = [`${e.row.menu === 'aefx' ? 'effect' : 'weapon'}:${slug(e.row.name)}`]; }
say(`   keys ceded to a longer label, as under AA: ${ceded.length}`);

// every FX validates
const allFx = [...stockFx, ...houseFx];
const ids = new Set(allFx.map((l) => l.fx.id));
let invalid = 0;
for (const { fx, row } of allFx) { const p = validate(fx, { ids }); if (p.length) { invalid++; if (invalid <= 10) console.error(`   ✗ "${row.name}" [${row.menu}] → ${fx.id}: ${p.join('; ')}`); } }
if (invalid) fail(`${invalid} fx(s) do not validate`); else say(`   every FX validates`);

// ---------------------------------------------------------------------------------------------
// 4 · prove — at the render, row by row, against the canonical moments
// ---------------------------------------------------------------------------------------------
say('4 · prove');
const stageDb = install({ dbs });
useDatabase(stageDb);
const plays = makePlays(dbs);
const T = stageTokens();
const proof = { rows: 0, ok: 0, failed: [], moments: 0, momentsOk: 0, momentsExact: 0, allowed: new Map(), missingAssets: new Map() };
for (const { fx, row } of allFx) {
  if (fx.off) continue;
  if (SHOW && row.name !== SHOW) continue;
  proof.rows++;
  const r = proveRow(row, fx, T, plays);
  proof.moments += r.moments.length;
  proof.momentsOk += r.moments.filter((m) => m.ok).length;
  proof.momentsExact += r.moments.filter((m) => m.exact).length;
  for (const m of r.moments) if (m.allowed) proof.allowed.set(m.allowed, (proof.allowed.get(m.allowed) ?? 0) + 1);
  for (const m of r.moments) for (const miss of m.missing) proof.missingAssets.set(miss, (proof.missingAssets.get(miss) ?? 0) + 1);
  if (r.ok) proof.ok++; else proof.failed.push({ name: `${row.name} [${row.menu}] → ${fx.id}`, moments: r.moments.filter((m) => !m.ok) });
  if (SHOW) { console.log(JSON.stringify(fx, null, 1)); console.log(sentence(fx)); for (const m of r.moments) { console.log(`   ${m.ok ? '✓' : '✗'} ${m.name}: ${m.files.join(', ')}${m.sounds.length ? ' + ' + m.sounds.join(', ') : ''}`); for (const d of m.diffs) console.log(`      ${d}`); } }
}
say(`   ${proof.ok} of ${proof.rows} fx equal at the render (${proof.momentsExact} of ${proof.moments} moments exactly, ${proof.momentsOk - proof.momentsExact} by a named allowance) · failed ${proof.failed.length}`);
for (const [name, n] of proof.allowed) say(`   · ${n}× ${name}`);
if (proof.failed.length) { for (const f of proof.failed.slice(0, args.includes('--all') ? 999 : 12)) { console.error(`   ✗ ${f.name}`); for (const m of f.moments.slice(0, 2)) for (const d of m.diffs.slice(0, 3)) console.error(`      ${m.name}: ${d}`); } fail(`the render-level proof failed on ${proof.failed.length} fx(s)`); }
if (SHOW) process.exit(proof.failed.length ? 1 : 0);

// ---------------------------------------------------------------------------------------------
// 5 · census — what changes for the user, in the new keys
// ---------------------------------------------------------------------------------------------
say('5 · census');
const index = buildIndex({ stock: stockFx.map((l) => l.fx), house: houseFx.map((l) => l.fx) });
for (const p of index.problems) console.error('   index: ' + p);
const oldIndex = oracleIndex({ stock: stockRows, house: houseRows });
const census = { asked: 0, same: 0, changed: [], gained: [], lost: [], byKind: {}, npc: { attacks: 0, actors: 0, exact: 0, base: 0, natural: 0, none: 0, samples: { base: [], natural: [], none: [] } }, party: [] };
const TYPES = ['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool'];
const shadowed = [];
for (const [k, list] of index.byKey) if (list.length > 1) { const [on] = k.split('|').slice(1); const first = list[0]; const rest = list.slice(1).filter((e) => e.source === first.source && needsPlace(e.fx) === needsPlace(first.fx)); if (rest.length) shadowed.push(`${k.split('|')[0]} (${on}): "${first.fx.id}" answers; ${rest.map((e) => `"${e.fx.id}"`).join(', ')} never will`); }
const PCS = Object.values(worldActors).filter((a) => a.type === 'character' && !/^BF Test/.test(a.name));
const seen = new Set();
for (const [actorId, list] of Object.entries(worldItems)) {
  const actor = worldActors[actorId];
  if (!actor) continue;
  for (const it of list) {
    if (!TYPES.has?.(it.type) && !TYPES.includes(it.type)) continue;
    const acts = Object.values(it.system?.activities ?? {});
    if (!acts.length && it.type !== 'weapon') continue;
    const subject = subjectOfItemData({ name: it.name, type: it.type, system: it.system, activityType: acts[0]?.type ?? null, spell: acts[0]?.type === 'cast' ? null : null });
    const hasPlace = acts.some((a) => a?.target?.template?.type);
    const now = resolve(index, subject.keys, 'use', { hasPlace });
    const before = oracleLookup(oldIndex, it.name, { on: hasPlace ? 'template' : 'use' });
    const key = `${actor.name}|${it.name}|${subject.keys.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    census.asked++;
    const nowName = now.fx ? `${now.fx.id} (${now.key})` : null;
    const beforeName = before ? `${before.row.name} [${before.row.menu}]` : null;
    const beforeId = before ? idOfRow.get(stockRows.find((b) => b === before.row)) ?? slug(before.row.name) : null;
    const same = (!now.fx && !before) || (now.fx && before && (now.fx.id === beforeId || now.fx.id.startsWith(beforeId + '-') || slug(before.row.name) === now.fx.id.replace(/-(swing|bolt|mark|area|aura|preset|effect)(-\d+)?$/, '')));
    const line = `${actor.name} (${actor.type}) / ${it.name} [${it.type}] · keys ${subject.keys.join(', ')} · was ${beforeName ?? 'nothing'} · now ${nowName ?? 'nothing'}`;
    if (same) census.same++; else if (now.fx && !before) census.gained.push(line); else if (!now.fx && before) census.lost.push(line); else census.changed.push(line);
    if (actor.type === 'npc' && it.type === 'weapon' && acts.some((a) => a.type === 'attack')) {
      census.npc.attacks++;
      if (!now.fx) { census.npc.none++; if (census.npc.samples.none.length < 14 && !census.npc.samples.none.includes(it.name)) census.npc.samples.none.push(it.name); }
      else if (now.key.startsWith('natural:')) { census.npc.natural++; if (census.npc.samples.natural.length < 10) census.npc.samples.natural.push(`${it.name} → ${now.key}`); }
      else if (now.key === subject.keys[0] || now.key === subject.keys[1]) census.npc.exact++;
      else { census.npc.base++; if (census.npc.samples.base.length < 10) census.npc.samples.base.push(`${it.name} → ${now.key}`); }
    }
  }
}
for (const a of PCS) {
  const miss = [];
  let plays = 0, items = 0;
  for (const it of worldItems[a._id] ?? []) {
    if (!TYPES.includes(it.type) || !Object.keys(it.system?.activities ?? {}).length) continue;
    items++;
    const acts = Object.values(it.system.activities);
    const subject = subjectOfItemData({ name: it.name, type: it.type, system: it.system, activityType: acts[0]?.type ?? null });
    const hasPlace = acts.some((x) => x?.target?.template?.type);
    if (resolve(index, subject.keys, 'use', { hasPlace }).fx) plays++; else miss.push(`${it.name} [${it.type}]`);
  }
  census.party.push({ actor: a.name, items, plays, miss });
}
// effects on the world's actors
const effectCensus = { names: 0, plays: 0, nothing: [] };
for (const name of lists.world.effects) {
  effectCensus.names++;
  const r = resolve(index, keysFor({ kind: 'effect', name }), 'effect');
  if (r.fx) effectCensus.plays++; else effectCensus.nothing.push(name);
}
say(`   ${census.asked} abilities on the world's actors: same answer ${census.same} · changed ${census.changed.length} · now play (were nothing) ${census.gained.length} · play nothing now (were playing) ${census.lost.length}`);
say(`   NPC attacks ${census.npc.attacks}: by their own name ${census.npc.exact} · by base weapon ${census.npc.base} · by natural attack ${census.npc.natural} · nothing ${census.npc.none}`);
say(`   effects: ${effectCensus.plays} of ${effectCensus.names} names have an FX · FX that can never answer (shadowed by a same-key fx) ${shadowed.length}`);

// ---------------------------------------------------------------------------------------------
// 6 · report and write
// ---------------------------------------------------------------------------------------------
const frozen = nativiser.frozenTable();
R(`# Migration report — Automated Animations → FX Studio fx`);
R();
R(`Run ${today} from phase 1's lossless rows (Automated Animations ${versions.aa}, D&D5e Animations ${versions.dnd5eAnimations}) against JB2A ${versions.jb2a}, PSFX ${versions.psfx}, Sequencer ${versions.sequencer}, dnd5e ${versions.dnd5e}. Regenerate with \`node tools/migrate-aa.mjs --write\`.`);
R();
R(`## Numbers`);
R();
R(`| Measure | Count |`);
R(`| --- | --- |`);
R(`| Rows in (stock / house) | ${stockRows.length} / ${houseRows.length} |`);
R(`| Fx out (stock / house) | ${stockFx.length} / ${houseFx.length} |`);
R(`| · keyed by the closed lists (a spell, feature, item or weapon the books or the world hold) | ${keyed.byList} |`);
R(`| · family rows expanded against the base weapons, the natural attacks and the world's weapons | ${keyed.expanded} |`);
R(`| · effect rows, keyed by the effect's name | ${keyed.effects} |`);
R(`| · names no list holds, keyed in all three kinds they could be | ${keyed.threeKinds} |`);
R(`| · weapon words that also caught a spell, a feat or an item under AA (listed, not carried) | ${notCarried.length} |`);
R(`| AA paths | ${ns.paths} |`);
R(`| · now the libraries' own path with the same files and structure | ${ns.exact} |`);
R(`| · now a list of the libraries' own leaves | ${ns.leaves} |`);
R(`| · now the libraries' own by-distance nodes (a variant at random, then the distance, as AA picked) | ${ns.ranges} |`);
R(`| · now the raw files AA picked out of a larger set | ${ns.files} |`);
R(`| · AA's stretch metadata carried on the scene (\`template\`) | ${ns.templateCarried} |`);
R(`| **· still on the frozen table (the measurement; goal zero)** | **${ns.frozen}** (loop markers differ ${ns.markersFrozen}, picked by distance ${ns.rangeFrozen}, no such node ${ns.missingNode}) |`);
R(`| Frozen table entries shipped | ${frozen.entries} |`);
R(`| **Render-level proof: fx equal to AA's own sequence** | **${proof.ok} of ${proof.rows}** (${proof.momentsExact} of ${proof.moments} moments exactly, ${proof.momentsOk - proof.momentsExact} by a named allowance below) |`);
R(`| Abilities on the world's actors | ${census.asked} |`);
R(`| · same answer as under AA | ${census.same} |`);
R(`| · a different fx now | ${census.changed.length} |`);
R(`| · play now, played nothing under AA | ${census.gained.length} |`);
R(`| · play nothing now, played under AA | ${census.lost.length} |`);
R(`| Fx that can never answer (a same-key fx of the same layer comes first) | ${shadowed.length} |`);
R();
R(`## What the proof allows, by name`);
R();
R(`The proof compares what Sequencer is told, section by section, in a canonical form: the order of calls inside a section is ignored (they set properties); a call stating Sequencer's own default is dropped (opacity 1, delay 0, fade 0, rotate 0, zIndex 0, rate 1, one repeat, missed false, below-tokens false, anchor ½ ½); option keys that are false, zero or empty are dropped; a token is its centre for a location and its id for an attachment; names, origins and document ties are dropped (the engine stamps every picture with its origin and ties every picture of an effect to it, a superset of what AA stamped that changes no picture); a path is compared by what it plays — the files, the stretch template and the loop markers — not its spelling; thenDo sections by count.`);
R();
R(`Deliberate differences, each a choice of the model over AA's accident. Those the proof met are counted (moments):`);
R();
for (const [name, n] of proof.allowed) R(`- **${n}** × ${name}`);
R(`- a swing and a bolt at several targets some in reach and some beyond: the engine plays all the swings, then all the flights, then the follow-up marks once over every target; AA interleaved them per group and played the follow-up sound per group (the proof's mixed-reach case is not in the canonical moments; the single-reach cases are)`);
R(`- a follow-up mark that waits: the engine waits after the last target it plays on; AA waited after the last of all the moment's targets`);
R(`- a picture on both the caster and the targets: the follow-up mark plays once over both with one sound; AA played it twice, once per group, with its sound each time`);
R(`- a mark or an aura sized in token widths measures the token as its image is drawn (scale and ring included), everywhere; AA's teleport marks and swings used the bare footprint`);
R(`- the hundred-millisecond pause before every animation (AA's "global delay" world setting) is gone; the reader's own half-second wait for a Region to be drawn stays`);
R(`- the range ring of a move is shown to everyone and measured alternating; AA's switches for hiding it and measuring equidistant were used by no row`);
R();
if (notesByRow.length) { R(`## Rows translated with a note (${notesByRow.length})`); R(); for (const n of notesByRow) R(`- ${n}`); R(); }
R(`## The family rows, expanded (${expansions.length})`);
R();
R(`Each of Automated Animations' weapon and creature-attack rows matched a word inside a name. Here each is expanded once, against the base weapons (dnd5e's list), the natural attacks of the installed creatures, and the world's own weapons, and the keys are written down. Read what each word would and would not have caught; a wanted catch that is missing is one house fx away.`);
R();
for (const e of expansions) R(`- **${e.label}** [${e.menu}] → ${e.keys.join(', ')}${e.from.length ? `\n  - ${e.from.join('\n  - ')}` : ''}`);
R();
R(`## Caught by a weapon word under AA, not carried (${notCarried.length} words)`);
R();
R(`Automated Animations' weapon and creature-attack rows matched their word inside any name — a feat, a wand, a spell. Those catches are accidents of the word and are not carried: a weapon fx never answers a spell, a feature or an item. Each is one house fx away if it was wanted ("like the Burst fx, for feature:spellfire-burst").`);
R();
for (const n of notCarried) R(`- **${n.label}** [${n.menu}]: ${n.caught.join('; ')}`);
R();
R(`## Keys ceded to a longer label (${ceded.length})`);
R();
R(`Where two rows claimed one key, the longer label keeps it, as Automated Animations' search took the longest label contained in a name.`);
R();
for (const c of ceded) R(`- ${c}`);
R();
R(`## Names no list holds (${threeKinds.length})`);
R();
R(`Keyed as a spell, a feature and an item of that name, since neither the books nor the world say which; whichever the table has answers.`);
R();
for (const n of threeKinds) R(`- ${n}`);
R();
R(`## Fx that can never answer (${shadowed.length})`);
R();
R(`Two fx in the same layer answer the same key for the same kind of moment; the first (AA's own precedence: its exact-match rows, then its menu order) answers, as it did under AA. Listed so nothing is lost silently.`);
R();
for (const s of shadowed) R(`- ${s}`);
R();
R(`## Still on the frozen table (${frozen.paths.length})`);
R();
R(`These play through AA's own metadata because the libraries' own registration holds no node that plays the same files the same way.`);
R();
for (const p of frozen.paths) R(`- ${p}`);
R();
if (proof.missingAssets.size) { R(`## Assets the stage could not resolve (${proof.missingAssets.size})`); R(); for (const [m, n] of proof.missingAssets) R(`- ${m} (${n})`); R(); }
R(`## The census in the new keys — what changes for the user`);
R();
R(`Every ability on the world's actors, keyed by identity and resolved against the new corpus, beside what Automated Animations' name search answered.`);
R();
R(`### A different fx now (${census.changed.length})`); R();
for (const l of census.changed) R(`- ${l}`);
R(); R(`### Play now, played nothing under AA (${census.gained.length})`); R();
for (const l of census.gained) R(`- ${l}`);
R(); R(`### Play nothing now, played under AA (${census.lost.length})`); R();
for (const l of census.lost) R(`- ${l}`);
R();
R(`### NPC attacks`); R();
R(`${census.npc.attacks} attack weapons on the world's NPCs: ${census.npc.exact} answered by the weapon's own name, ${census.npc.base} by its base weapon, ${census.npc.natural} as a natural attack, ${census.npc.none} nothing.`);
R();
if (census.npc.samples.base.length) R(`- by base weapon, e.g. ${census.npc.samples.base.join('; ')}`);
if (census.npc.samples.natural.length) R(`- as a natural attack, e.g. ${census.npc.samples.natural.join('; ')}`);
if (census.npc.samples.none.length) R(`- nothing: ${census.npc.samples.none.join('; ')}`);
R();
R(`### Nothing plays yet — the party's sheets`); R();
for (const p of census.party) R(`- **${p.actor}** (${p.plays} of ${p.items} play; ${p.miss.length} nothing): ${p.miss.join('; ') || '—'}`);
R();
R(`### Effects on the world's actors (${effectCensus.names} names, ${effectCensus.plays} with an FX)`); R();
for (const n of effectCensus.nothing) R(`- ${n}: nothing`);
R();

const KIND_FILE = { spell: 'spells', weapon: 'weapons', natural: 'natural', feature: 'features', item: 'items', effect: 'effects' };
const files = Object.fromEntries(Object.values(KIND_FILE).map((f) => [f, []]));
for (const { fx } of stockFx) { const kind = fx.for[0]?.split(':')[0]; files[KIND_FILE[kind] ?? 'items'].push(fx); }
const reportPath = WRITE ? join(RECIPES, 'migration-report.md') : join(REPO, 'dist', 'migration-report.md');
mkdirSync(join(REPO, 'dist'), { recursive: true });
if (WRITE) {
  mkdirSync(join(RECIPES, 'stock'), { recursive: true });
  const meta = (extra) => ({ schema: 2, generated: today, tool: 'tools/migrate-aa.mjs', sources: versions, ...extra });
  for (const [name, list] of Object.entries(files)) {
    writeFileSync(join(RECIPES, 'stock', `${name}.json`), JSON.stringify({ _meta: meta({ licence: 'GPL-3.0-or-later (see STOCK-LICENSE)', source: `D&D5e Animations ${versions.dnd5eAnimations}`, authors: ['MrVauxs', 'Sisimshow'], note: `The ${name} of the D&D5e Animations preset, migrated to fx keyed by identity, nothing retired. A derived work of that GPL-3 module, a separate work from the MIT code beside it.`, fx: list.length }), fx: list }, null, 1));
  }
  writeFileSync(join(RECIPES, 'house.json'), JSON.stringify({ _meta: meta({ licence: 'MIT', note: "The user's own fx: what this world changed over the stock at migration, and everything kept from the world buffer since (tools/export-fx.mjs).", fx: houseFx.length }), fx: houseFx.map((l) => l.fx) }, null, 1));
  writeFileSync(join(RECIPES, 'aa-assets.json'), JSON.stringify({ meta: meta({ licence: 'MIT', source: `Automated Animations ${versions.aa} (c) Otigon and contributors, MIT`, note: 'What the migration could not point at the libraries\' own paths: AA\'s own Sequencer entries for these, verbatim with their metadata, registered as fxstudio.aa. Counted, meant to reach zero.', entries: frozen.entries, paths: frozen.paths.length, missingFiles: twin.meta?.missingFiles ?? [] }), db: frozen.db }));
  writeFileSync(reportPath, report.join('\n'));
  say(`6 · wrote recipes/stock/{${Object.entries(files).map(([k, v]) => `${k} ${v.length}`).join(', ')}}, recipes/house.json (${houseFx.length}), recipes/aa-assets.json (${frozen.entries} entries), recipes/migration-report.md`);
} else {
  writeFileSync(reportPath, report.join('\n'));
  say(`6 · dry run: report at dist/migration-report.md (pass --write to write the recipes)`);
}
say(`   ${((Date.now() - t0) / 1000).toFixed(1)}s`);
