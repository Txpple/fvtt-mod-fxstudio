// THE GAP: every key the closed lists address that NO FX answers, with the words and the mechanics
// a person would read to decide what it should look like. Offline, reads nothing live, writes
// nothing but its own dump.
//
// It stands on exactly the evidence the corpus does (records.json, itself built from LIST_PACKS),
// so a book added there shows up here as new gaps on the next run.
//
//   node tools/gaps.mjs              # the tally
//   node tools/gaps.mjs --write      # also dist/gaps.json (the dump the proposals are read from)
import { readFileSync, writeFileSync } from 'node:fs';
import { MODULES, RECIPES, SCRATCH, packageMeta, worldDb } from './lib/env.mjs';
import { packDir, readAll, readActors, snapshot } from './lib/leveldb.mjs';
import { CREATURE_PACKS, LIST_PACKS } from './lib/dnd5e.mjs';
import { idWords } from '../scripts/ui/html.js';

const WRITE = process.argv.slice(2).includes('--write');
const say = (s = '') => console.log(s);
const t0 = Date.now();

/** the words a person reads, with the markup and the enrichers taken out */
function words(html, max = 340) {
  if (!html) return '';
  let s = String(html);
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&\[\[[^\]]*\]\]/g, ' ').replace(/\[\[[^\]]*\]\]/g, ' ');
  s = s.replace(/@(UUID|Embed|Check|Damage|Heal|Item|Reference|Lookup)\[[^\]]*\]\{([^}]*)\}/g, '$2');
  s = s.replace(/@(UUID|Embed|Check|Damage|Heal|Item|Reference|Lookup)\[[^\]]*\]/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** the mechanics that say what it DOES, in the fewest words that still carry the signal */
function facts(d) {
  const sys = d.system ?? {};
  const f = [];
  if (d.type === 'spell') {
    const lvl = sys.level === 0 ? 'cantrip' : `level ${sys.level}`;
    f.push(`${lvl} ${sys.school ?? ''}`.trim());
    if (sys.properties?.length) f.push(sys.properties.join('/'));
  }
  if (sys.type?.value) f.push(String(sys.type.value));
  if (sys.type?.baseItem) f.push(`base ${sys.type.baseItem}`);
  if (sys.rarity) f.push(String(sys.rarity));
  if (sys.properties && d.type !== 'spell' && Array.isArray(sys.properties) && sys.properties.length) f.push(sys.properties.join('/'));
  // what its activities do: attack/save/heal/damage and the damage types, which is the strongest signal there is
  const acts = Object.values(sys.activities ?? {});
  const kinds = new Set(), dmg = new Set(), ranges = new Set();
  for (const a of acts) {
    if (a?.type) kinds.add(a.type);
    for (const p of a?.damage?.parts ?? []) for (const t of p?.types ?? []) dmg.add(t);
    for (const p of a?.healing ? [a.healing] : []) for (const t of p?.types ?? []) dmg.add(t);
    if (a?.range?.units) ranges.add(a.range.units === 'touch' ? 'touch' : `${a.range.value ?? ''}${a.range.units}`);
    if (a?.target?.template?.type) ranges.add(`${a.target.template.type} template`);
  }
  if (kinds.size) f.push([...kinds].join('+'));
  if (dmg.size) f.push([...dmg].join('/'));
  if (ranges.size) f.push([...ranges].join(','));
  if (sys.activation?.type && !kinds.size) f.push(String(sys.activation.type));
  return f.filter(Boolean).join(' · ');
}

// ── what the corpus already answers ──────────────────────────────────────────────────────────
const answered = new Set();
const corpus = [];
for (const f of ['spells', 'weapons', 'natural', 'features', 'items', 'effects']) {
  for (const fx of JSON.parse(readFileSync(`${RECIPES}/stock/${f}.json`, 'utf8')).fx) {
    if (fx.for?.[0]) answered.add(fx.for[0]);
    corpus.push(fx);
  }
}
for (const fx of JSON.parse(readFileSync(`${RECIPES}/house.json`, 'utf8')).fx) {
  if (fx.for?.[0]) answered.add(fx.for[0]);
  corpus.push(fx);
}

const records = JSON.parse(readFileSync(`${RECIPES}/records.json`, 'utf8')).records;
const gapKeys = Object.keys(records).filter((k) => !answered.has(k));

// ── the documents behind them, indexed by uuid ───────────────────────────────────────────
// The item packs hold the spells, features and items; the CREATURE packs hold the natural attacks,
// which are items ON an actor and so are addressed `Actor.<id>.Item.<id>` inside the pack.
const byUuid = new Map();
const seen = new Set();
for (const [mod, pack] of [...LIST_PACKS, ...CREATURE_PACKS]) {
  if (seen.has(`${mod}/${pack}`)) continue;
  seen.add(`${mod}/${pack}`);
  const dir = MODULES[mod] ? packDir(MODULES[mod], pack) : null;
  if (!dir) continue;
  const m = packageMeta(MODULES[mod]) ?? { id: mod };
  const snap = snapshot(dir, `${mod}-${pack}`);
  for (const [k, v] of await readAll(snap)) {
    const d = JSON.parse(v);
    if (k.startsWith('!items!')) byUuid.set(`Compendium.${m.id}.${pack}.Item.${d._id}`, d);
    else if (k.startsWith('!actors.items!')) {
      const [actorId] = k.split('!')[2].split('.');
      byUuid.set(`Compendium.${m.id}.${pack}.Actor.${actorId}.Item.${d._id}`, d);
    }
  }
}

// this world's own records (a house key's evidence)
const { items: worldItems } = await readActors(snapshot(worldDb('actors'), 'gap-actors'));
for (const [actorId, list] of Object.entries(worldItems)) for (const it of list) byUuid.set(`Actor.${actorId}.Item.${it._id}`, it);

const rows = [];
for (const key of gapKeys) {
  const r = { ...records[key], kind: key.split(':')[0] };
  const d = byUuid.get(r.uuid) ?? null;
  rows.push({
    key,
    kind: r.kind,
    name: r.kind === 'effect' ? idWords(key.split(':')[1].split('/')[0]) : r.name,
    carrier: r.kind === 'effect' ? r.name : (r.on ?? null),
    where: r.where,
    uuid: r.uuid,
    docType: d?.type ?? null,
    facts: d ? facts(d) : '',
    text: d ? words(d.system?.description?.value ?? '') : '',
  });
}

const byWhere = {}, byKind = {}, noDoc = rows.filter((r) => !r.docType).length;
for (const r of rows) { byWhere[r.where] = (byWhere[r.where] ?? 0) + 1; byKind[r.kind] = (byKind[r.kind] ?? 0) + 1; }
say(`${Object.keys(records).length} keys addressed · ${answered.size} answered by an FX · ${rows.length} GAPS`);
say(Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
say(`${rows.length - noDoc} of ${rows.length} gaps have their document read${noDoc ? ` (${noDoc} are effects, whose words live on the record that carries them)` : ''}`);
say();
for (const [w, n] of Object.entries(byWhere).sort((a, b) => b[1] - a[1])) say(`${String(n).padStart(5)}  ${w}`);

if (WRITE) {
  const path = `${SCRATCH}/../gaps.json`;
  writeFileSync(path, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), gaps: rows.length, rows }, null, 1));
  say(`\n✓ wrote ${path} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} else say('\n(nothing written — pass --write)');
