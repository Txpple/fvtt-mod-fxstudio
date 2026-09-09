import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'dist/batches';
const out = ['key\tconfidence\tbasis\tvfx\tsfx\tsentence'];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.tsv')).sort()) {
  for (const line of readFileSync(`${dir}/${f}`, 'utf8').split('\n')) if (line.trim()) out.push(line.replace(/\r$/, ''));
}
writeFileSync('dist/proposals.tsv', `${out.join('\n')}\n`);
console.log(`${out.length - 1} proposals from ${readdirSync(dir).length} batches`);
