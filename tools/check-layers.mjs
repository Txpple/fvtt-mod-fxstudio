// The layers point down only (ARCHITECTURE §1): core/ imports nothing but core/; readers/ import
// core/ (never the engine); engine/ imports core/ (never readers/); ui/ imports the API. The entry
// and the API may import anything. Any import that points up fails here.
//   node tools/check-layers.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO } from './lib/env.mjs';

const ALLOWED = {
  core: ['core'],
  readers: ['core', 'readers'],
  engine: ['core', 'engine'],
  ui: ['core', 'ui', 'api.js', 'settings.js'],
};
const files = [];
const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) files.push(p); } };
walk(join(REPO, 'scripts'));
let problems = 0, checked = 0;
for (const f of files) {
  const rel = relative(join(REPO, 'scripts'), f).replace(/\\/g, '/');
  const layer = rel.includes('/') ? rel.split('/')[0] : null;
  if (!layer || !ALLOWED[layer]) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from\s+'([^']+)'/g)) {
    const target = m[1];
    if (!target.startsWith('.')) continue;
    checked++;
    const abs = relative(join(REPO, 'scripts'), join(f, '..', target)).replace(/\\/g, '/');
    const targetLayer = abs.includes('/') ? abs.split('/')[0] : abs;
    if (!ALLOWED[layer].includes(targetLayer)) { problems++; console.log(`  ✗ ${rel} imports ${abs} (${layer} may import only ${ALLOWED[layer].join(', ')})`); }
  }
}
console.log(problems ? `FAIL: ${problems} import(s) point up` : `PASS: ${checked} imports, every one points down the layer order`);
process.exitCode = problems ? 1 : 0;
