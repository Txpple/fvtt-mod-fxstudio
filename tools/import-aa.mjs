// The one-and-done migration from Automated Animations (PLAN §4). Offline: reads a snapshot of the
// world's LevelDB, the D&D5e Animations preset file, and the libraries' own registration files.
//
//   node tools/import-aa.mjs                 # convert, split, prove, census, report; write nothing
//   node tools/import-aa.mjs --write         # also write recipes/{baseline,house,aa-database}.json
//   node tools/import-aa.mjs --psfx-free <psfx_sequencer.js of the free build>   # for re-pointing sounds
//
// Steps, each measured and printed:
//   1 read      the preset file, the seven aaAutorec-* world settings, every flags.autoanimations on items
//   2 convert   every entry to a row, losslessly (tools/lib/aa-port.mjs is AA's own reading of an entry)
//   3 split     rows equal to the preset are the baseline; what differs, is missing, or is an item flag
//               is the house layer
//   4 prove     for every world entry, what AA would play for its label == what fxstudio resolves:
//               same file set (through the private twin AND the jb2a twin), same sound, same options.
//               Any mismatch fails the run.
//   5 census    every item and effect name on the world's actors and in the PHB packs through AA's
//               lookup and through fxstudio's; every name whose answer differs is listed
//   6 report    recipes/import-report.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DATA, MODULES, RECIPES, REPO, ROOTS, moduleVersion, worldDb } from './lib/env.mjs';
import { packDir, readActors, readPackItems, readSettings, snapshot } from './lib/leveldb.mjs';
import { fileIndex, filesUnder, leafPaths, loadAA, loadJb2a, loadPsfx, loadPsfxOther, metadataAt, nodeAt, resolvePath, shape, subtreeAt } from './lib/libraries.mjs';
import { MENUS, aaLookup, buildPath, rinse, sanitizeEntry } from './lib/aa-port.mjs';
import { buildIndex, lookup } from '../scripts/corpus.js';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const psfxFreeFile = args.includes('--psfx-free') ? args[args.indexOf('--psfx-free') + 1] : null;
const t0 = Date.now();
const say = (s) => console.log(s);
const fail = (s) => { console.error(`\n✗ ${s}`); process.exitCode = 1; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const report = [];
const R = (s = '') => report.push(s);

// ---------------------------------------------------------------------------------------------
// 1 · read
// ---------------------------------------------------------------------------------------------
say('1 · read');
const versions = { aa: moduleVersion(MODULES.aa), dnd5eAnimations: moduleVersion(MODULES.dnd5eAnimations), jb2a: moduleVersion(MODULES.jb2a), psfx: moduleVersion(MODULES.psfx), sequencer: moduleVersion(MODULES.sequencer) };
const preset = JSON.parse(readFileSync(`${MODULES.dnd5eAnimations}/module/autorec.json`, 'utf8'));
const settings = await readSettings(snapshot(worldDb('settings')));
const world = {};
for (const m of MENUS) world[m] = JSON.parse(settings[`autoanimations.aaAutorec-${m}`] ?? '[]').map((e) => ({ ...e, menu: m }));
for (const m of MENUS) (preset[m] ??= []).forEach((e) => (e.menu = m));
const { actors, items, effects } = await readActors(snapshot(worldDb('actors')));
const flagged = [];
for (const [actorId, list] of Object.entries(items)) for (const it of list) if (it.flags?.autoanimations && Object.keys(it.flags.autoanimations).length) flagged.push({ actor: actors[actorId], item: it, flags: it.flags.autoanimations });
const countRows = (o) => MENUS.reduce((n, m) => n + (o[m]?.length ?? 0), 0);
say(`   preset ${countRows(preset)} rows (D&D5e Animations ${versions.dnd5eAnimations}) · world ${countRows(world)} rows (AA ${versions.aa}) · item flags ${flagged.length}`);

say('   libraries');
const jb2a = await loadJb2a();
const psfx = await loadPsfx();
const psfxFree = psfxFreeFile ? await loadPsfxOther(psfxFreeFile) : null;
const aa = await loadAA();
const jb2aLeaves = leafPaths(jb2a, 'jb2a');
const psfxLeaves = leafPaths(psfx, 'psfx');
const psfxFreeLeaves = psfxFree ? leafPaths(psfxFree, 'psfx') : null;
const aaLeaves = leafPaths(aa, 'autoanimations');
say(`   jb2a ${versions.jb2a}: ${jb2aLeaves.size} entries · psfx ${versions.psfx}: ${psfxLeaves.size} · autoanimations table: ${aaLeaves.size}${psfxFree ? ` · psfx free build ${psfxFreeLeaves.size}` : ''}`);

// every jb2a node keyed by the shape of its subtree, so an AA node finds its twin by content
const jb2aByShape = new Map();
(function walk(o, pre) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    const q = `${pre}.${k}`;
    const key = JSON.stringify(shape(v));
    if (!jb2aByShape.has(key)) jb2aByShape.set(key, q);
    if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, q);
  }
})(jb2a, 'jb2a');

const jb2aFiles = fileIndex(jb2aLeaves);
const commonPrefix = (paths) => { const parts = paths.map((p) => p.split('.')); let i = 0; while (i < parts[0].length && parts.every((p) => p[i] === parts[0][i])) i++; return parts[0].slice(0, i).join('.'); };
const psfxByBasenames = new Map();
for (const [path, files] of psfxLeaves) psfxByBasenames.set(files.map((f) => basename(f)).sort().join('|'), path);

// ---------------------------------------------------------------------------------------------
// 2 · convert
// ---------------------------------------------------------------------------------------------
say('2 · convert');
const PRESET_OF = { melee: 'melee-swing', range: 'projectile', ontoken: 'on-token', templatefx: 'template', aura: 'aura' };
const PRESET_TYPE = { teleportation: 'teleport', proToTemp: 'projectile-to-template', dualattach: 'dual-attach', thunderwave: 'thunderwave' };
const stats = { layers: 0, twinExact: 0, twinFamily: 0, twinNone: 0, custom: 0, customMissing: 0, returnMissing: 0, fallback: 0, sounds: 0, soundDb: 0, soundRaw: 0, soundRepointed: 0, soundUnresolved: 0, meleeSwitchOn: 0, soundOnly: 0, macro: 0, levels3d: 0 };
const twinless = [];
const fallbacks = [];
const missingFiles = [];
const repointed = new Map();
const unresolvedSounds = [];
const aaNeeded = new Set(); // variant-level AA paths the private twin must carry

const DBS = { jb2a, psfx };
const isDbPath = (p) => !p.includes('/') && /^[a-z0-9_-]+\./i.test(p);

function convertSound(s, where) {
  if (!s) return undefined;
  stats.sounds++;
  const out = { file: s.file, volume: s.volume, delay: s.delay, startTime: s.startTime, repeat: s.repeat, repeatDelay: s.repeatDelay };
  const files = resolvePath(s.file, DBS, ROOTS);
  if (files) { if (isDbPath(s.file)) stats.soundDb++; else stats.soundRaw++; return out; }
  if (s.file.startsWith('psfx.') && psfxFree) {
    // regrouped by the Patreon build: the node in the new table with the same files
    const freeFiles = resolvePath(s.file, { psfx: psfxFree }, ROOTS);
    const to = freeFiles ? psfxByBasenames.get(freeFiles.map((f) => basename(f)).sort().join('|')) : null;
    if (to) { stats.soundRepointed++; repointed.set(s.file, to); out.file = to; return out; }
  }
  stats.soundUnresolved++; unresolvedSounds.push(`${where}: ${s.file}`); out.unresolved = true; return out;
}

/** a video descriptor → {video, aa, file} */
function convertVideo(video, where, opts = {}) {
  stats.layers++;
  const path = buildPath(aa, video, opts);
  if (!path) return { video: null, file: null };
  if (path.custom) {
    stats.custom++;
    const out = { video: null, file: path.file };
    if (!resolvePath(path.file, { ...DBS, autoanimations: aa }, ROOTS)) { stats.customMissing++; missingFiles.push(`${where}: ${path.file}`); out.missing = true; }
    return out;
  }
  if (path.fallback) { stats.fallback++; fallbacks.push(`${where}: ${path.fallback.join('; ')}`); }
  const { dbSection, menuType, animation, variant, color } = video;
  const clean = path.file.split('.'); // autoanimations.sec.type.anim.variant[.color]
  const out = { video: { dbSection, menuType, animation: clean[3], variant: clean[4], color: color === 'random' ? 'random' : clean[5] }, aa: path.file, file: null };
  if (clean[2] !== menuType) out.video.menuType = clean[2];
  aaNeeded.add(clean.slice(0, 5).join('.'));
  if (path.returnFile) {
    // AA names a return animation for every returning weapon; where its table has no such node,
    // Sequencer soft-failed and nothing came back. Carry only what resolves, and say so.
    if (nodeAt(aa, path.returnFile) !== undefined) { out.returnAa = path.returnFile; aaNeeded.add(path.returnFile.split('.').slice(0, 5).join('.')); }
    else { stats.returnMissing++; missingFiles.push(`${where}: return ${path.returnFile} (no such node in AA's table; no return animation played)`); }
  }
  const node = nodeAt(aa, path.file);
  const twin = jb2aByShape.get(JSON.stringify(shape(node)));
  if (twin) { stats.twinExact++; out.file = twin; out.twin = 'exact'; return out; }
  // no node with exactly these files: name the JB2A family the files belong to (readable, a superset)
  const paths = filesUnder(node).map((f) => jb2aFiles.get(f)?.[0]);
  if (paths.length && paths.every(Boolean)) { stats.twinFamily++; out.file = commonPrefix(paths); out.twin = 'family'; }
  else { stats.twinNone++; twinless.push(`${where}: ${path.file}`); }
  return out;
}

function convertEntry(entry) {
  const s = sanitizeEntry(entry);
  const row = { name: entry.label, menu: entry.menu };
  if (entry.menu === 'aefx') row.effectType = entry.activeEffectType;
  if (entry.advanced?.exactMatch) row.match = 'exact';
  else if (['melee', 'range'].includes(entry.menu) && entry.primary?.video?.menuType !== 'spell') row.match = 'word';
  if (entry.advanced?.excludedTerms?.length) row.exclude = entry.advanced.excludedTerms;
  const where = `[${entry.menu}] ${entry.label}`;
  if (entry.menu === 'preset') {
    row.presetType = entry.presetType;
    const data = JSON.parse(JSON.stringify(s.primary));
    for (const part of ['projectile', 'preExplosion', 'explosion', 'start', 'between', 'end', 'video']) {
      const p = data[part];
      if (!p || !p.video) continue;
      Object.assign(p, convertVideo(p.video, `${where} ${part}`));
      if (p.sound) p.sound = convertSound(p.sound, `${where} ${part}`); else delete p.sound;
    }
    if (data.sound) data.sound = convertSound(data.sound, where); else delete data.sound;
    if (data.afterImage && !data.afterImage.enable) delete data.afterImage;
    row.fx = [{ preset: PRESET_TYPE[entry.presetType], data }];
    return row;
  }
  const menu = s.menu;
  const primary = { preset: PRESET_OF[menu], ...convertVideo(s.primary.video, where, { getTruePath: ['ontoken', 'templatefx', 'aura'].includes(menu), isReturnable: ['melee', 'range'].includes(menu) }) };
  const snd = convertSound(s.primary.sound, where);
  if (snd) primary.sound = snd;
  primary.options = s.primary.options;
  row.fx = [primary];
  for (const part of ['secondary', 'source', 'target']) {
    const b = s[part];
    if (!b) continue;
    const layer = { preset: part, ...convertVideo(b.video, `${where} ${part}`) };
    const bs = convertSound(b.sound, `${where} ${part}`);
    if (bs) layer.sound = bs;
    layer.options = b.options;
    row.fx.push(layer);
  }
  if (menu === 'melee' && s.primary.meleeSwitch && s.primary.meleeSwitch.options.switchType !== 'off') {
    stats.meleeSwitchOn++;
    const sw = s.primary.meleeSwitch;
    row.thrown = { options: sw.options };
    if (sw.options.switchType === 'custom') Object.assign(row.thrown, convertVideo(sw.video, `${where} thrown`, { isReturnable: true }));
    else if (sw.options.switchType === 'on' && aa.range?.weapon?.[primary.video?.animation]) {
      // AA swaps in the range weapon of the same name when the target is out of reach
      Object.assign(row.thrown, convertVideo({ ...s.primary.video, dbSection: 'range' }, `${where} thrown`, { isReturnable: true }));
    }
    const ss = convertSound(sw.sound, `${where} thrown`);
    if (ss) row.thrown.sound = ss;
  }
  if (s.soundOnly) { stats.soundOnly++; row.soundOnly = convertSound(s.soundOnly, `${where} soundOnly`); }
  if (s.macro) { stats.macro++; row.macro = s.macro; }
  if (entry.levels3d?.enable || entry.levels3d?.type && entry.levels3d?.data && Object.keys(entry.levels3d.data).length > 3) stats.levels3d++;
  return row;
}

const presetRows = MENUS.flatMap((m) => preset[m].map(convertEntry));
say(`   ${presetRows.length} preset rows · layers ${stats.layers}: jb2a twin exact ${stats.twinExact}, family ${stats.twinFamily}, none ${stats.twinNone}, custom path ${stats.custom}, AA fallback ${stats.fallback}`);

// ---------------------------------------------------------------------------------------------
// 3 · split
// ---------------------------------------------------------------------------------------------
say('3 · split');
const flatten = (o, p = '', out = {}) => { if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flatten(v, p ? `${p}.${k}` : k, out); else out[p] = o; return out; };
const diffKeys = (a, b) => { const fa = flatten(a), fb = flatten(b); return [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => k !== 'id' && k !== 'menu' && !k.startsWith('levels3d') && !k.startsWith('metaData') && !eq(fa[k], fb[k])); };
const houseRows = [];
const split = { same: 0, modified: [], userMade: [], deleted: [], flagsKept: [], flagsDropped: [] };
for (const m of MENUS) {
  const byLabel = new Map();
  for (const e of preset[m]) (byLabel.get(rinse(e.label)) ?? byLabel.set(rinse(e.label), []).get(rinse(e.label))).push(e);
  const seen = new Map();
  for (const w of world[m]) {
    const k = rinse(w.label);
    const i = seen.get(k) ?? 0;
    seen.set(k, i + 1);
    const p = byLabel.get(k)?.[i];
    if (!p) { split.userMade.push(w); const row = convertEntry(w); row.note = 'made in this world; the preset has no such row'; houseRows.push(row); continue; }
    const d = diffKeys(w, p);
    if (!d.length) { split.same++; continue; }
    const row = convertEntry(w);
    const pr = convertEntry(p);
    if (eq(row, pr)) { split.same++; split.flagsDropped.push(`${w.label} [${m}]: differs from the preset only in fields fxstudio does not carry (${d.slice(0, 4).join(', ')})`); continue; }
    row.note = `changed in this world: ${d.slice(0, 6).join(', ')}${d.length > 6 ? ` +${d.length - 6}` : ''}`;
    split.modified.push([w, d]);
    houseRows.push(row);
  }
  for (const [k, list] of byLabel) for (let i = seen.get(k) ?? 0; i < list.length; i++) { split.deleted.push(list[i]); houseRows.push({ name: list[i].label, menu: m, off: true, note: 'removed in this world' }); }
}
// item flags → house rows, unless they equal the baseline row of that name
const baselineIndexOnly = buildIndex({ baseline: presetRows });
for (const f of flagged) {
  const fl = f.flags;
  const where = `${f.actor?.name ?? '?'} / ${f.item.name}`;
  if (fl.isEnabled === false) { houseRows.push({ name: f.item.name, menu: 'ontoken', off: true, note: `switched off on the item (${where})` }); split.flagsKept.push(`${where}: off`); continue; }
  if (!fl.isCustomized) continue;
  const entry = { ...fl, label: f.item.name, menu: fl.menu };
  const row = convertEntry(entry);
  const base = lookup(baselineIndexOnly, f.item.name, { on: fl.menu === 'aefx' ? 'effect' : 'use' });
  const strip = (r) => { const c = JSON.parse(JSON.stringify(r)); delete c.note; return c; };
  if (base && eq(strip(base.row), strip(row))) { split.flagsDropped.push(`${where}: the item's own look equals the baseline row "${base.row.name}" once the 3D-only fields are dropped`); continue; }
  row.note = `the item's own look (${where})`;
  houseRows.push(row);
  split.flagsKept.push(`${where} → "${row.name}" [${row.menu}]`);
}
say(`   same as preset ${split.same} · modified ${split.modified.length} · made here ${split.userMade.length} · removed here ${split.deleted.length} · item flags kept ${split.flagsKept.length}, dropped ${split.flagsDropped.length} → house rows ${houseRows.length}`);

// ---------------------------------------------------------------------------------------------
// the private twin: the subset of AA's table the corpus plays, metadata and all
// ---------------------------------------------------------------------------------------------
// Registered as Sequencer module "fxstudio" with `_templates` at its root (Sequencer reads templates
// from the registered root only), the table itself under `aa`, so paths read fxstudio.aa.<AA path>.
const twinDb = { _templates: JSON.parse(JSON.stringify(aa._templates ?? {})), aa: {} };
for (const p of aaNeeded) {
  const parts = p.split('.').slice(1); // sec.type.anim.variant
  let src = aa, dst = twinDb.aa;
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i];
    if (!(k in src)) break;
    for (const [mk, mv] of Object.entries(src)) if (mk.startsWith('_') && mk !== '_free' && mk !== '_templates' && !(mk in dst)) dst[mk] = JSON.parse(JSON.stringify(mv));
    if (i === parts.length - 1) { dst[k] = subtreeAt(aa, p); break; }
    dst[k] ??= {};
    src = src[k]; dst = dst[k];
  }
}
const twinLeaves = leafPaths(twinDb, 'fxstudio');
// files AA's table names that this JB2A build does not ship: silent under AA, listed, not carried as a defect
const twinMissing = [...new Set([...twinLeaves.values()].flat().filter((f) => !existsSync(`${DATA}/${f}`)))];
say(`   private twin: ${aaNeeded.size} variant nodes, ${twinLeaves.size} entries, ${twinMissing.length} file(s) not on disk`);

// ---------------------------------------------------------------------------------------------
// 4 · prove
// ---------------------------------------------------------------------------------------------
say('4 · prove');
const index = buildIndex({ baseline: presetRows, house: houseRows });
const twinRoot = twinDb;
const filesAt = (db, path) => { const n = nodeAt(db, path); return n === undefined ? null : filesUnder(n); };
const basenames = (files) => (files ? files.map((f) => basename(f)).sort() : null);
const soundFilesAt = (file) => basenames(resolvePath(file, DBS, ROOTS));
// what AA plays for a sound on THIS install: the installed tables, else the older build it was authored against
const soundFilesFree = (file) => basenames(resolvePath(file, DBS, ROOTS)) ?? (psfxFree ? basenames(resolvePath(file, { psfx: psfxFree }, ROOTS)) : null) ?? [basename(file)];
const proof = { entries: 0, ok: 0, shadowed: [], failures: [], metaDiff: 0, metaDiffExamples: [] };

function proveLayer(expectedVideo, expectedSound, expectedOptions, layer, where) {
  const problems = [];
  const exp = buildPath(aa, expectedVideo);
  if (exp?.custom) { if (layer.file !== exp.file) problems.push(`custom path ${exp.file} vs ${layer.file}`); }
  else if (exp) {
    const expFiles = filesAt(aa, exp.file);
    const viaTwin = filesAt(twinRoot, exp.file.replace(/^autoanimations\./, 'fxstudio.aa.'));
    if (layer.aa !== exp.file) problems.push(`aa path ${exp.file} vs ${layer.aa}`);
    if (!eq(expFiles, viaTwin)) problems.push(`files through fxstudio.aa differ at ${exp.file}`);
    if (layer.file) { const viaJb2a = filesAt(jb2a, layer.file); if (layer.twin === 'exact' ? !eq(expFiles, viaJb2a) : !expFiles.every((f) => viaJb2a?.includes(f))) problems.push(`files through ${layer.file} do not cover ${exp.file}`); }
    const m1 = metadataAt(aa, exp.file), m2 = metadataAt(twinRoot, exp.file.replace(/^autoanimations\./, 'fxstudio.aa.'));
    if (!eq(m1, m2)) problems.push(`metadata through fxstudio.aa differs at ${exp.file}`);
    if (layer.file) { const m3 = metadataAt(jb2a, layer.file); if (!eq(m1, m3)) { proof.metaDiff++; if (proof.metaDiffExamples.length < 5) proof.metaDiffExamples.push(`${exp.file} → ${layer.file}: ${JSON.stringify(m1)} vs ${JSON.stringify(m3)}`); } }
  } else if (layer.file || layer.aa) problems.push('AA plays nothing here but the row has a file');
  if (expectedSound) {
    if (!layer.sound) problems.push('sound missing');
    else {
      const a = soundFilesFree(expectedSound.file), b = soundFilesAt(layer.sound.file);
      if (layer.sound.unresolved) { /* listed in the report; AA could not play it either */ }
      else if (!eq(a, b)) problems.push(`sound ${expectedSound.file} vs ${layer.sound.file}`);
      for (const k of ['volume', 'delay', 'startTime', 'repeat', 'repeatDelay']) if (expectedSound[k] !== layer.sound[k]) problems.push(`sound.${k} ${expectedSound[k]} vs ${layer.sound[k]}`);
    }
  } else if (layer.sound) problems.push('row has a sound AA does not play');
  if (expectedOptions && !eq(expectedOptions, layer.options)) problems.push(`options differ: ${JSON.stringify(expectedOptions)} vs ${JSON.stringify(layer.options)}`);
  return problems.map((p) => `${where}: ${p}`);
}

function prove(entry) {
  proof.entries++;
  const on = entry.menu === 'aefx' ? 'effect' : entry.menu === 'templatefx' ? 'template' : 'use';
  const aaPick = aaLookup(world, { itemName: entry.label, isTemplate: entry.menu === 'templatefx', isEffect: entry.menu === 'aefx' });
  const ours = lookup(index, entry.label, { on });
  if (!aaPick) { if (ours) proof.failures.push(`[${entry.menu}] ${entry.label}: AA finds nothing for its own label, fxstudio finds "${ours.row.name}"`); return; }
  if (aaPick.id !== entry.id) { proof.shadowed.push(`[${entry.menu}] "${entry.label}" is shadowed by [${aaPick.menu}] "${aaPick.label}" under AA; fxstudio plays ${ours ? `[${ours.row.menu}] "${ours.row.name}"` : 'nothing'}`); }
  const target = aaPick; // what AA plays for this name is the thing to match
  if (!ours) { proof.failures.push(`[${target.menu}] ${entry.label}: AA plays it, fxstudio resolves nothing`); return; }
  if (ours.row.menu !== target.menu || rinse(ours.row.name) !== rinse(target.label)) { proof.failures.push(`[${target.menu}] ${entry.label}: AA plays "${target.label}" [${target.menu}], fxstudio "${ours.row.name}" [${ours.row.menu}]`); return; }
  const s = sanitizeEntry(target);
  const row = ours.row;
  const where = `[${target.menu}] ${target.label}`;
  const problems = [];
  if (target.menu === 'preset') {
    const d = row.fx[0].data;
    for (const part of ['projectile', 'preExplosion', 'explosion', 'start', 'between', 'end', 'video']) {
      const e = s.primary[part];
      if (!e || !e.video) { if (d[part] && d[part].video) problems.push(`${where}: ${part} present but AA has none`); continue; }
      problems.push(...proveLayer(e.video, e.sound || null, e.options, d[part] ?? {}, `${where} ${part}`));
    }
    if (s.primary.options && !eq(s.primary.options, d.options)) problems.push(`${where}: preset options differ`);
    if (s.primary.color && s.primary.color !== d.color) problems.push(`${where}: colour differs`);
    if (s.primary.sound) { const a = soundFilesFree(s.primary.sound.file), b = d.sound ? soundFilesAt(d.sound.file) : null; if (!d.sound?.unresolved && !eq(a, b)) problems.push(`${where}: preset sound differs`); }
  } else {
    problems.push(...proveLayer(s.primary.video, s.primary.sound || null, s.primary.options, row.fx[0], where));
    const parts = ['secondary', 'source', 'target'];
    for (const part of parts) {
      const e = s[part];
      const layer = row.fx.find((l) => l.preset === part);
      if (!e) { if (layer) problems.push(`${where}: ${part} present but AA has none`); continue; }
      if (!layer) { problems.push(`${where}: ${part} missing`); continue; }
      problems.push(...proveLayer(e.video, e.sound || null, e.options, layer, `${where} ${part}`));
    }
    const sw = s.primary.meleeSwitch;
    if (sw && sw.options.switchType !== 'off') { if (!row.thrown || !eq(row.thrown.options, sw.options)) problems.push(`${where}: thrown switch differs`); }
    else if (row.thrown) problems.push(`${where}: thrown switch present but off under AA`);
    if (!!s.soundOnly !== !!row.soundOnly) problems.push(`${where}: soundOnly differs`);
    if (!!s.macro !== !!row.macro) problems.push(`${where}: macro differs`);
  }
  if (problems.length) proof.failures.push(...problems); else proof.ok++;
}
for (const m of MENUS) for (const e of world[m]) prove(e);
say(`   ${proof.ok} of ${proof.entries} world rows play identically · shadowed labels ${proof.shadowed.length} · failures ${proof.failures.length} · jb2a twins whose Sequencer metadata differs from AA's ${proof.metaDiff}`);
if (proof.failures.length) { for (const f of proof.failures.slice(0, 30)) console.error('   ✗ ' + f); fail(`parity failed on ${proof.failures.length} row(s)`); }

// ---------------------------------------------------------------------------------------------
// 5 · census
// ---------------------------------------------------------------------------------------------
say('5 · census');
const TYPES = new Set(['weapon', 'spell', 'feat', 'consumable']);
const census = { names: 0, same: 0, aaOnly: [], differ: [], fxOnly: [], byQualifier: [], effects: { names: 0, same: 0, differ: [] } };
const seenNames = new Set();
function censusItem(it, where) {
  const acts = Object.values(it.system?.activities ?? {});
  const activityNames = acts.map((a) => a.name).filter(Boolean);
  const key = `${it.name}|${activityNames.join('|')}`;
  if (seenNames.has(key)) return;
  seenNames.add(key);
  census.names++;
  const a = aaLookup(world, { itemName: it.name, activityNames });
  const f = lookup(index, it.name, { on: 'use' });
  const aName = a ? `"${a.label}" [${a.menu}]` : null;
  const fName = f ? `"${f.row.name}" [${f.row.menu}]` : null;
  if (aName === fName) { census.same++; if (f?.matchedAs) census.byQualifier.push(`${where} / ${it.name} → "${f.row.name}" (as "${f.matchedAs}")`); return; }
  const line = `${where} / ${it.name}${activityNames.length ? ` (activities: ${activityNames.join(', ')})` : ''}: AA ${aName ?? 'nothing'} · fxstudio ${fName ?? 'nothing'}${f?.matchedAs ? ` (as "${f.matchedAs}")` : ''}`;
  if (a && !f) census.aaOnly.push(line); else if (a && f) census.differ.push(line); else census.fxOnly.push(line);
}
function censusEffect(name, where) {
  const key = `effect|${name}`;
  if (seenNames.has(key)) return;
  seenNames.add(key);
  census.effects.names++;
  const a = aaLookup(world, { itemName: name, isEffect: true });
  const f = lookup(index, name, { on: 'effect' });
  const aName = a ? `"${a.label}"` : null;
  const fName = f ? `"${f.row.name}"` : null;
  if (aName === fName) census.effects.same++; else census.effects.differ.push(`${where} / effect "${name}": AA ${aName ?? 'nothing'} · fxstudio ${fName ?? 'nothing'}`);
}
for (const [actorId, list] of Object.entries(items)) {
  const actor = actors[actorId];
  const where = `${actor?.name ?? actorId} (${actor?.type ?? '?'})`;
  for (const it of list) {
    if (!TYPES.has(it.type)) continue;
    censusItem(it, where);
    for (const ef of effects[`${actorId}.${it._id}`] ?? []) censusEffect(ef.name, where);
  }
  for (const ef of effects[actorId] ?? []) censusEffect(ef.name, where);
}
const packs = { spells: 'PHB spells', feats: 'PHB feats', equipment: 'PHB equipment' };
for (const [pack, label] of Object.entries(packs)) {
  const dir = packDir(MODULES.phb, pack);
  if (!dir) continue;
  for (const it of await readPackItems(snapshot(dir, `phb-${pack}`))) { if (TYPES.has(it.type)) censusItem(it, label); }
}
say(`   ${census.names} distinct item names: same answer ${census.same} · AA only ${census.aaOnly.length} · different rows ${census.differ.length} · fxstudio only ${census.fxOnly.length} · effects ${census.effects.names}, differ ${census.effects.differ.length}`);

// nothing plays: the party's own sheets
const PCS = Object.values(actors).filter((a) => a.type === 'character' && !/^BF Test/.test(a.name));
const nothing = [];
let partyItems = 0, partyPlays = 0;
for (const a of PCS) {
  const miss = [];
  for (const it of items[a._id] ?? []) {
    if (!TYPES.has(it.type) || !Object.keys(it.system?.activities ?? {}).length) continue;
    partyItems++;
    if (lookup(index, it.name, { on: 'use' })) partyPlays++; else miss.push(`${it.name} [${it.type}]`);
  }
  nothing.push({ actor: a.name, miss });
}
say(`   party: ${partyPlays} of ${partyItems} abilities have a look; ${partyItems - partyPlays} play nothing`);

// ---------------------------------------------------------------------------------------------
// 6 · report and write
// ---------------------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
R(`# Import report — Automated Animations → FX Studio`);
R();
R(`Run ${today} against the world \`${basename(worldDb('').replace(/\/data\/$/, ''))}\` snapshot (AA ${versions.aa}, D&D5e Animations ${versions.dnd5eAnimations}, JB2A ${versions.jb2a}, PSFX ${versions.psfx}, Sequencer ${versions.sequencer}). Regenerate with \`node tools/import-aa.mjs --write${psfxFreeFile ? ' --psfx-free <free build>' : ''}\`.`);
R();
R(`## Numbers`);
R();
R(`| Measure | Count |`);
R(`| --- | --- |`);
R(`| Preset rows (the baseline) | ${presetRows.length} |`);
for (const m of MENUS) R(`| · ${m} | ${preset[m].length} |`);
R(`| World rows under AA | ${countRows(world)} |`);
R(`| World rows identical to the preset | ${split.same} |`);
R(`| Modified here (house rows) | ${split.modified.length} |`);
R(`| Made here (house rows) | ${split.userMade.length} |`);
R(`| Removed here (house rows that switch a look off) | ${split.deleted.length} |`);
R(`| Item flags kept as house rows | ${split.flagsKept.length} |`);
R(`| Item flags that add nothing | ${split.flagsDropped.length} |`);
R(`| House rows | ${houseRows.length} |`);
R(`| Layers converted | ${stats.layers} |`);
R(`| · with an exact JB2A twin (same files, same structure) | ${stats.twinExact} |`);
R(`| · named by their JB2A family (the family holds more than AA's pick) | ${stats.twinFamily} |`);
R(`| · without a twin (play through the private table only) | ${stats.twinNone} |`);
R(`| · custom paths kept as given | ${stats.custom} |`);
R(`| · paths AA silently replaced with its first entry | ${stats.fallback} |`);
R(`| · custom paths that do not exist on this install (silent under AA too) | ${stats.customMissing} |`);
R(`| · return animations AA named but its table lacks (none played) | ${stats.returnMissing} |`);
R(`| · files in AA's table this JB2A build does not ship | ${twinMissing.length} |`);
R(`| Sounds | ${stats.sounds} |`);
R(`| · in the PSFX/JB2A tables | ${stats.soundDb} |`);
R(`| · raw files on disk | ${stats.soundRaw} |`);
R(`| · re-pointed (PSFX Patreon regrouped them) | ${stats.soundRepointed} |`);
R(`| · unresolved (silent under AA too) | ${stats.soundUnresolved} |`);
R(`| Melee rows with the thrown-weapon switch on | ${stats.meleeSwitchOn} |`);
R(`| Sound-only rows | ${stats.soundOnly} |`);
R(`| Macro rows | ${stats.macro} |`);
R(`| Private twin: variant nodes / Sequencer entries | ${aaNeeded.size} / ${twinLeaves.size} |`);
R(`| **Parity: world rows that play identically** | **${proof.ok} of ${proof.entries}** |`);
R(`| Labels shadowed by another row under AA | ${proof.shadowed.length} |`);
R(`| JB2A twins whose Sequencer metadata differs from AA's (why the private table exists) | ${proof.metaDiff} |`);
R();
R(`## The house layer`);
R();
for (const r of houseRows) R(`- **${r.name}** [${r.menu}]${r.off ? ' — off' : ''}: ${r.note ?? ''}`);
if (split.flagsDropped.length) { R(); R(`Item flags that add nothing over the baseline:`); R(); for (const s of split.flagsDropped) R(`- ${s}`); }
R();
R(`## Re-pointed sounds`);
R();
if (!repointed.size) R(psfxFree ? `None.` : `(run with \`--psfx-free\` to re-point regrouped PSFX paths)`);
for (const [from, to] of repointed) R(`- \`${from}\` → \`${to}\``);
if (unresolvedSounds.length) { R(); R(`Unresolved sounds (these were silent under AA on this install as well):`); R(); for (const s of unresolvedSounds) R(`- ${s}`); }
R();
R(`## Layers without a JB2A twin`);
R();
R(`These play only through the private table (\`fxstudio.aa.*\`); their files are not in JB2A's own registration.`);
R();
for (const s of twinless) R(`- ${s}`);
if (fallbacks.length) { R(); R(`## Paths AA replaced with its first entry`); R(); for (const s of fallbacks) R(`- ${s}`); }
if (missingFiles.length || twinMissing.length) { R(); R(`## Paths that do not exist on this install`); R(); R(`Carried as they are, marked, and silent — as they were under AA.`); R(); for (const s of missingFiles) R(`- ${s}`); for (const s of twinMissing) R(`- AA's table names \`${s}\``); }
if (proof.shadowed.length) { R(); R(`## Shadowed labels`); R(); R(`Under AA these rows can never play for their own name because a shorter or earlier label wins the substring search; fxstudio matches whole names, so the row's own name now reaches it.`); R(); for (const s of proof.shadowed) R(`- ${s}`); }
if (proof.metaDiffExamples.length) { R(); R(`## Why the private table`); R(); R(`AA registers its own copy of the JB2A files with its own Sequencer metadata (templates, markers). The native \`jb2a.*\` paths carry JB2A's metadata, which differs for ${proof.metaDiff} layers; playing those through the native path would change how Sequencer stretches and times them. The module therefore registers AA's subset verbatim as \`fxstudio.aa\` and the baseline plays through it. Examples:`); R(); for (const s of proof.metaDiffExamples) R(`- ${s}`); }
R();
R(`## Matching census`);
R();
R(`Every item on the world's actors and in the PHB packs, through AA's lookup (longest label contained in the activity name, then the item name) and through fxstudio's (the whole name; generic weapon and creature rows by whole word). ${census.names} distinct names; ${census.same} get the same answer.`);
R();
R(`### AA plays something, fxstudio plays nothing (${census.aaOnly.length})`);
R();
R(`Each of these is a substring or activity-name match under AA. Where the picture was actually wanted, add a house row with that name.`);
R();
for (const s of census.aaOnly) R(`- ${s}`);
R();
R(`### Both play, but different rows (${census.differ.length})`);
R();
for (const s of census.differ) R(`- ${s}`);
R();
R(`### fxstudio plays, AA does not (${census.fxOnly.length})`);
R();
for (const s of census.fxOnly) R(`- ${s}`);
R();
R(`### Same answer, reached by the name without its qualifier (${census.byQualifier.length})`);
R();
R(`"Misty Step - Spellcasting", "Bless - Fey-Touched", "Potion of Healing (Greater)": the name before the dash or the parenthesis is tried when the whole name has no row.`);
R();
for (const s of census.byQualifier) R(`- ${s}`);
R();
R(`### Effects (${census.effects.names} names, ${census.effects.differ.length} differ)`);
R();
for (const s of census.effects.differ) R(`- ${s}`);
R();
R(`## Nothing plays yet — the party's sheets`);
R();
R(`${partyPlays} of ${partyItems} abilities with an activity have a look. These do not, and play nothing until given one:`);
R();
for (const { actor, miss } of nothing) R(`- **${actor}** (${miss.length}): ${miss.join('; ') || '—'}`);
R();

mkdirSync(RECIPES, { recursive: true });
const reportPath = join(RECIPES, 'import-report.md');
if (WRITE) {
  const meta = (extra) => ({ generated: today, tool: 'tools/import-aa.mjs', sources: versions, ...extra });
  writeFileSync(join(RECIPES, 'baseline.json'), JSON.stringify({ _meta: meta({ licence: 'GPL-3.0-or-later (see BASELINE-LICENSE)', source: `D&D5e Animations ${versions.dnd5eAnimations}`, authors: ['MrVauxs', 'Sisimshow'], note: 'The D&D5e Animations preset converted row for row, nothing retired. A derived work of that GPL-3 module, a separate work from the MIT code beside it.', rows: presetRows.length }), rows: presetRows }, null, 1));
  writeFileSync(join(RECIPES, 'house.json'), JSON.stringify({ _meta: meta({ licence: 'MIT', note: "The user's own looks: what this world changed over the baseline at import, and everything built since.", rows: houseRows.length }), rows: houseRows }, null, 1));
  writeFileSync(join(RECIPES, 'aa-database.json'), JSON.stringify({ meta: meta({ licence: 'MIT', source: `Automated Animations ${versions.aa} (c) Otigon and contributors, MIT`, note: 'The subset of AA\'s private Sequencer table the corpus plays, verbatim with its metadata, registered as fxstudio.aa so every baseline row resolves to the same Sequencer entry it did under AA.', aaVersion: versions.aa, nodes: aaNeeded.size, entries: twinLeaves.size, missingFiles: twinMissing }), db: twinDb }));
  writeFileSync(reportPath, report.join('\n'));
  say(`6 · wrote recipes/baseline.json (${presetRows.length}), recipes/house.json (${houseRows.length}), recipes/aa-database.json, recipes/import-report.md`);
} else {
  const p = join(REPO, 'dist', 'import-report.md');
  mkdirSync(join(REPO, 'dist'), { recursive: true });
  writeFileSync(p, report.join('\n'));
  say(`6 · dry run: report at dist/import-report.md (pass --write to write the recipes)`);
}
say(`   ${((Date.now() - t0) / 1000).toFixed(1)}s`);
