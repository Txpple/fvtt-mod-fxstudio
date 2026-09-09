// The gap report as one JSON the workbook builder reads: every addressed key no FX answers, with
// its record, its words, and the proposal made for it. Joins dist/gaps.json to dist/proposals.tsv.
import { readFileSync, writeFileSync } from 'node:fs';
import { REPO, RECIPES } from './lib/env.mjs';
import { idWords } from '../scripts/ui/html.js';

const gaps = JSON.parse(readFileSync(`${REPO}/dist/gaps.json`, 'utf8')).rows;
const records = JSON.parse(readFileSync(`${RECIPES}/records.json`, 'utf8')).records;

/** what an FX is called, exactly as the screens ask it (ui/records.js nameForKey) */
const nameForKey = (key) => {
  const [kind, id] = String(key).split(':');
  if (kind === 'effect') return idWords((id ?? '').split('/')[0]);
  return records[key]?.name ?? idWords((id ?? '').split('/')[0]);
};

const proposals = new Map();
for (const line of readFileSync(`${REPO}/dist/proposals.tsv`, 'utf8').split('\n').slice(1)) {
  if (!line.trim()) continue;
  const [key, confidence, basis, vfx, sfx, sentence] = line.replace(/\r$/, '').split('\t');
  proposals.set(key, { confidence, basis, vfx, sfx, sentence });
}

const rows = gaps.map((g) => {
  const p = proposals.get(g.key) ?? { confidence: '', basis: '', vfx: '', sfx: '', sentence: '' };
  return {
    where: g.where,
    name: g.name,
    kind: g.kind,
    on: g.carrier ?? '',
    facts: g.facts,
    sentence: p.sentence,
    basis: p.basis ? nameForKey(p.basis) : '',
    basisKey: p.basis ?? '',
    vfx: p.vfx,
    sfx: p.sfx,
    confidence: p.confidence,
    key: g.key,
    text: g.text,
  };
});

writeFileSync(`${REPO}/dist/gap-report.json`, JSON.stringify(rows, null, 1));
const n = rows.filter((r) => r.confidence !== 'No proposed FX').length;
console.log(`${rows.length} gaps · ${n} with a proposed FX · ${rows.length - n} marked no proposed FX`);
