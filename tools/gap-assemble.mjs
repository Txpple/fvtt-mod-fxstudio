// The proposals, assembled: every batch under tools/gap-proposals/ into one dist/proposals.tsv for
// gap-check.mjs and gap-report.mjs to read.
//
// ⚠ THE BATCHES ARE THE WORK. They are 2950 hand-written judgments — one line per addressed key no
// FX answers — and nothing regenerates them: the tools find the gaps and prove the paths, but what
// an ability should look like was decided a row at a time. They live in the repo for that reason,
// beside the tool that reads them and not under recipes/, which is served to the game at boot.
//
// A row is  key · confidence · basis · vfx · sfx · sentence · vfxFit · sfxFit · vfxInUse
//   key         the addressed key the proposal answers (one row per key, no duplicates)
//   confidence  Close match · Family match · No proposed FX
//   basis       an FX the corpus already holds, to copy and then vary (empty when none)
//   vfx / sfx   a real path in JB2A or PSFX — gap-check.mjs meets every one of them
//   sentence    what it should look like, in plain words
//   vfxFit      how sure the VFX is right for the record: Sure · Likely · Maybe (empty with no proposal)
//   sfxFit      the same for the SFX
//   vfxInUse    how many FX already in the corpus (Stock + House) play the VFX's animation, in any
//               colour: 0 is an animation nothing plays yet. The fits and this count were written
//               against the asset catalogue in fxstudio-assets (2026-10-02).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from './lib/env.mjs';

const dir = join(REPO, 'tools', 'gap-proposals');
const files = readdirSync(dir).filter((f) => f.endsWith('.tsv')).sort();
const out = ['key\tconfidence\tbasis\tvfx\tsfx\tsentence\tvfxFit\tsfxFit\tvfxInUse'];
for (const f of files) {
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const c = line.replace(/\r$/, '').split('\t');
    while (c.length < 9) c.push('');
    out.push(c.join('\t'));
  }
}
writeFileSync(join(REPO, 'dist', 'proposals.tsv'), `${out.join('\n')}\n`);
console.log(`${out.length - 1} proposals from ${files.length} batches`);
