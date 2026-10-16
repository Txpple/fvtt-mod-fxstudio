// THE JUDGEMENTS, SHIPPED: recipes/proposals.json, the gap table the Coverage tab reads. One entry
// per key no FX answers (exactly the gaps gaps.mjs counts), saying why it plays nothing:
//
//   proposed  a proposal waits: its basis (the FX id to copy from), its sentence, the two fits
//   none      judged to need no FX: a reason from the closed list below, and the row's own words
//   open      a gap with no judgement yet
//
// It is built from two inputs, both from the gap pipeline (tools/README.md): dist/gaps.json
// (gaps.mjs --write: every gap with its `moment`, DESIGN 25) and the hand-written rows in
// gap-proposals/*.tsv. A key with no row is still read by the moment rule, so a record with no
// activity or an effect that is always on says so even before anyone wrote a row for it.
//
// The file is the screens' alone, like records.json: the engine never reads it, the window
// fetches it when the tab asks. It carries only what the tab shows (the long columns of the TSVs,
// the record's own text and the in-use counts stay in dist/), and an empty field is left out.
// Its _meta names the packs the records come from, so the tab offers exactly those books.
//
//   node tools/proposals.mjs           # the tally, nothing written
//   node tools/proposals.mjs --write   # write recipes/proposals.json
//   node tools/proposals.mjs --check   # the file against the gaps and the rows now; exit 1 on a difference
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES, RECIPES, REPO, packageMeta } from './lib/env.mjs';
import { CREATURE_PACKS, LIST_PACKS } from './lib/dnd5e.mjs';
import { readRecipes, indexRecipes } from './lib/recipes.mjs';
import { resolve } from '../scripts/core/corpus.js';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const CHECK = args.includes('--check');
const say = (s = '') => console.log(s);
const FILE = join(RECIPES, 'proposals.json');
/** what the file may weigh: it is fetched when the Coverage tab opens, beside records.json */
const BUDGET = 640 * 1024;

/**
 * THE REASONS, a closed list: why a gap needs no FX, in the words the tab prints. The moment rule
 * (DESIGN 25) gives the first five; the rest are the kinds of judgement the rows made by hand.
 * The tab reads the words from the file, so this is the one place they are written.
 */
export const REASONS = {
  'no-activity': 'no activity on the record',
  'always-on': 'always on',
  'bookkeeping': 'bookkeeping for another ability',
  'enchantment': 'a lasting enchantment',
  'rest': 'chosen at a rest',
  'mundane': 'mundane gear',
  'header': 'a name, not an ability',
  'judged': 'judged by hand',
};

/** a row's own sentence, read for which reason it gives (first match wins; the words stay the row's) */
const BY_WORDS = [
  ['no-activity', /no activity/i],
  ['rest', /\b(long|short) rest\b|\bon a rest\b|\bat a rest\b/i],
  ['enchantment', /lasting enchantment/i],
  ['header', /, not an ability/i],
  ['bookkeeping', /own FX|has its own|have their own|its own record|own effect record|has a proposal|have a proposal|each has a proposal|plays the moment|effect plays|is its own|are their own|the Deck itself|'s FX\b|its own attack plays|an FX on the|where an FX belongs/i],
  ['mundane', /mundane|treasure|clothing|\bfood\b|container|tool kit|pack of gear|^a game\b|no rules of its own|service bought|^(solvent|glue|a compass|a clock|a fishing rod|a pole)\b/i],
  ['always-on', /always on|worn armour|no activation|passive|proficiency|\bbonus\b|no moment to play|no moment of its own|no moment at the table|a state, not a moment|nothing at the table/i],
];
const reasonOfWords = (s) => BY_WORDS.find(([, re]) => re.test(s ?? ''))?.[0] ?? null;

/**
 * THE MOMENT RULE read off a gap's `moment` (gaps.mjs): null when something happens at the table,
 * else the reason nothing does. A record with no activity never posts the card the reader plays
 * on; an effect that sits on its owner with no duration, and that no activity applies, is always on;
 * an effect that is neither applied nor carried by its owner never reaches a token.
 */
export function momentReason(gap) {
  const m = gap?.moment;
  if (!m) return null;
  if (gap.kind === 'effect' && m.effect) {
    const e = m.effect;
    if (e.applied || e.duration) return null;
    if (e.type === 'enchantment') return 'enchantment';
    return e.transfer ? 'always-on' : 'no-activity';
  }
  return m.activities === 0 ? 'no-activity' : null;
}

/** the rows in gap-proposals/*.tsv, by key (the same reading gap-assemble makes) */
function readRows() {
  const dir = join(REPO, 'tools', 'gap-proposals');
  const rows = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsv')).sort()) {
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const [key, confidence, basis, vfx, sfx, sentence, vfxFit, sfxFit] = line.replace(/\r$/, '').split('\t');
      rows.set(key, { confidence, basis: basis?.trim() ?? '', vfx: vfx?.trim() ?? '', sfx: sfx?.trim() ?? '', sentence: sentence?.trim() ?? '', vfxFit: vfxFit?.trim() ?? '', sfxFit: sfxFit?.trim() ?? '' });
    }
  }
  return rows;
}

/** the packs the records come from, as the tab offers them: [{id, label, kind, keys, gaps}] */
function packsOf(records, gapSet) {
  const out = [];
  const count = new Map();
  for (const [key, rec] of Object.entries(records)) {
    const id = collectionOf(rec.uuid);
    const c = count.get(id) ?? count.set(id, { keys: 0, gaps: 0 }).get(id);
    c.keys++;
    if (gapSet.has(key)) c.gaps++;
  }
  const seen = new Set();
  for (const [list, kind] of [[LIST_PACKS, 'list'], [CREATURE_PACKS, 'creatures']]) {
    for (const [mod, pack] of list) {
      const meta = MODULES[mod] ? packageMeta(MODULES[mod]) : null;
      if (!meta || !meta.packs[pack]) continue;
      const id = `${meta.id}.${pack}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const c = count.get(id) ?? { keys: 0, gaps: 0 };
      // a creature pack the records hold no natural attack from is not a book worth a pick
      if (kind === 'creatures' && !c.keys) continue;
      out.push({ id, label: `${meta.title} · ${meta.packs[pack]}`, kind, keys: c.keys, gaps: c.gaps });
    }
  }
  const w = count.get('world');
  if (w) out.push({ id: 'world', label: 'This world · its actors’ own items', kind: 'world', keys: w.keys, gaps: w.gaps });
  return out;
}

/** the collection a record's uuid lives in: `<package>.<pack>`, or `world` for an item on this world's actor */
export const collectionOf = (uuid) => /^Compendium\.([^.]+\.[^.]+)\./.exec(uuid ?? '')?.[1] ?? 'world';

/** an entry with its empty fields left out, in the written order */
const tidy = (e) => Object.fromEntries(['status', 'reason', 'basis', 'sentence', 'vfxFit', 'sfxFit', 'vfx', 'sfx'].filter((k) => e[k]).map((k) => [k, e[k]]));

// ── the inputs ────────────────────────────────────────────────────────────────────────────────
const recipes = readRecipes();
const index = indexRecipes(recipes);
const { records } = recipes;
const recMeta = JSON.parse(readFileSync(join(RECIPES, 'records.json'), 'utf8'))._meta ?? {};
const answered = new Set([...recipes.stock, ...recipes.house].map((fx) => fx.for?.[0]).filter(Boolean));
// exactly gaps.mjs's rule: every addressed key no FX answers
const gapKeys = Object.keys(records).filter((k) => !answered.has(k));
const gapSet = new Set(gapKeys);
const rows = readRows();

const gapsFile = join(REPO, 'dist', 'gaps.json');
const dump = existsSync(gapsFile) ? JSON.parse(readFileSync(gapsFile, 'utf8')) : null;
const byKey = new Map((dump?.rows ?? []).map((g) => [g.key, g]));
const old = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null;
const problems = [];
if (!dump) {
  if (!CHECK) { say('no dist/gaps.json: run node tools/gaps.mjs --write first (the moment readings come from it)'); process.exit(1); }
  say('⚠ no dist/gaps.json, so the moment readings are taken from the file as it stands (run gaps.mjs --write to read them again)');
} else if (dump.rows.length !== gapKeys.length || dump.rows.some((g) => !gapSet.has(g.key))) {
  problems.push(`dist/gaps.json holds ${dump.rows.length} gaps and the recipes say ${gapKeys.length}: run node tools/gaps.mjs --write again`);
}

/** the FX id a basis key names: the one that answers it on its own word */
const basisFx = (key) => {
  const r = resolve(index, [key], key.startsWith('effect:') ? 'effect' : 'use');
  return r.fx?.id ?? null;
};

// ── the entries ───────────────────────────────────────────────────────────────────────────────
const entries = {};
const counts = { proposed: 0, none: 0, open: 0 };
const reasons = {};
const conflicts = [];
for (const key of [...gapKeys].sort()) {
  const row = rows.get(key);
  const gap = byKey.get(key) ?? null;
  // with no dump (a --check on a clone without dist/), the file's own reading of the rule stands in
  const rule = gap ? momentReason(gap) : (old?.proposals?.[key]?.status === 'none' && !row ? old.proposals[key].reason : null);
  let e;
  if (row && row.confidence !== 'No proposed FX') {
    const basis = row.basis ? basisFx(row.basis) : null;
    if (row.basis && !basis) problems.push(`${key}: its basis ${row.basis} is answered by no FX`);
    e = { status: 'proposed', basis, sentence: row.sentence, vfxFit: row.vfxFit, sfxFit: row.sfxFit, vfx: row.vfx, sfx: row.sfx };
    // a proposal the moment rule says can never play: reported, never overruled (the row is the judgement)
    if (rule) conflicts.push(`${key} (${REASONS[rule]})`);
  } else if (row) {
    e = { status: 'none', reason: reasonOfWords(row.sentence) ?? rule ?? 'judged', sentence: row.sentence };
  } else if (rule) {
    e = { status: 'none', reason: rule };
  } else {
    e = { status: 'open' };
  }
  counts[e.status]++;
  if (e.reason) reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
  entries[key] = tidy(e);
}
const strays = [...rows.keys()].filter((k) => !gapSet.has(k));
if (strays.length) problems.push(`${strays.length} rows for keys that are not gaps (gap-check names them): ${strays.slice(0, 8).join(', ')}`);

const out = {
  _meta: {
    schema: 1,
    tool: 'tools/proposals.mjs',
    records: recMeta.generated ?? null,
    gaps: gapKeys.length,
    counts,
    reasons: REASONS,
    packs: packsOf(records, gapSet),
    licence: 'MIT',
    note: 'Why each key no FX answers plays nothing: a proposal waiting (its basis is the FX to copy from), a judgement that it needs none, or open. Built from the gap table (tools/gap-proposals) and the moment rule; the screens read it, the engine never does.',
  },
  proposals: entries,
};
const text = JSON.stringify(out);

// ── the report ────────────────────────────────────────────────────────────────────────────────
say(`${gapKeys.length} gaps · ${counts.proposed} proposed · ${counts.none} judged no FX · ${counts.open} open`);
say(`reasons: ${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
say(`packs offered: ${out._meta.packs.length} (${out._meta.packs.filter((p) => p.kind === 'list').length} books' lists, ${out._meta.packs.filter((p) => p.kind === 'creatures').length} creature packs${out._meta.packs.some((p) => p.kind === 'world') ? ', this world' : ''}) · their gaps add up to ${out._meta.packs.reduce((t, p) => t + p.gaps, 0)}`);
if (conflicts.length) say(`note: ${conflicts.length} proposals for a record the moment rule reads as having no moment: ${conflicts.slice(0, 6).join(', ')}${conflicts.length > 6 ? ', …' : ''}`);
say(`${(text.length / 1024).toFixed(0)} KB (budget ${BUDGET / 1024} KB)`);
if (text.length > BUDGET) problems.push(`the file weighs ${(text.length / 1024).toFixed(0)} KB, over its ${BUDGET / 1024} KB budget`);
if (out._meta.packs.reduce((t, p) => t + p.gaps, 0) !== gapKeys.length) problems.push('the packs offered do not hold every gap: a record lives in a pack LIST_PACKS and CREATURE_PACKS do not name');

if (CHECK) {
  if (!old) problems.push('recipes/proposals.json is missing: node tools/proposals.mjs --write');
  else {
    const keys = Object.keys(old.proposals ?? {});
    if (keys.length !== gapKeys.length) problems.push(`the file holds ${keys.length} entries and gaps.mjs counts ${gapKeys.length}`);
    if (old._meta?.gaps !== gapKeys.length) problems.push(`the file's _meta says ${old._meta?.gaps} gaps and gaps.mjs counts ${gapKeys.length}`);
    const missing = gapKeys.filter((k) => !old.proposals?.[k]);
    const extra = keys.filter((k) => !gapSet.has(k));
    if (missing.length) problems.push(`${missing.length} gaps have no entry: ${missing.slice(0, 8).join(', ')}`);
    if (extra.length) problems.push(`${extra.length} entries are not gaps: ${extra.slice(0, 8).join(', ')}`);
    const stale = Object.keys(entries).filter((k) => JSON.stringify(entries[k]) !== JSON.stringify(old.proposals?.[k] ?? null));
    if (stale.length) problems.push(`${stale.length} entries differ from the rows now: ${stale.slice(0, 8).join(', ')} (node tools/proposals.mjs --write)`);
    if (JSON.stringify(old._meta?.packs) !== JSON.stringify(out._meta.packs)) problems.push('the packs offered differ from LIST_PACKS and CREATURE_PACKS now (node tools/proposals.mjs --write)');
    if (JSON.stringify(old._meta?.reasons) !== JSON.stringify(REASONS)) problems.push('the reasons in the file are not the closed list (node tools/proposals.mjs --write)');
  }
  for (const p of problems) say(`  ✗ ${p}`);
  say(problems.length ? `FAIL: ${problems.length} problem(s)` : `PASS: recipes/proposals.json agrees with the ${gapKeys.length} gaps and the rows`);
  process.exitCode = problems.length ? 1 : 0;
} else {
  for (const p of problems) say(`  ✗ ${p}`);
  if (WRITE && !problems.length) { writeFileSync(FILE, text); say(`✓ wrote ${FILE}`); } else if (WRITE) { say('nothing written: fix the problems first'); process.exitCode = 1; } else say('(nothing written: pass --write)');
}
