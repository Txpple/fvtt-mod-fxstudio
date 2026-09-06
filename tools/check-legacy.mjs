// No Automated Animations vocabulary survives in scripts/ or recipes/ (ARCHITECTURE §0): the
// mechanical half of the greenfield self-check. The migration tool and its oracle (tools/lib/oracle,
// tools/lib/migrate, tools/lib/aa-port.mjs) are the only places allowed to speak AA's words, since
// they read AA's data once.
//   node tools/check-legacy.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO } from './lib/env.mjs';

const WORDS = ['autoanimations', 'autorec', 'aefx', 'ontoken', 'templatefx', 'playOn', 'isRadius', 'addTokenWidth', 'isShieldFX', 'animationSource', 'isWait', 'isMasked', 'isAbsolute', 'isReturning', 'persistType', 'meleeSwitch', 'dbSection', 'menuType', 'presetType', 'tintColor', 'unbindAlpha', 'unbindVisibility', 'removeTemplate', 'aboveTemplate', 'rotateSource', 'repeatDelay', 'fakeSource', 'proToTemp', 'dualattach', 'levels3d', 'DataSanitizer'];
// words that are also ordinary English or Sequencer's own API, allowed in prose but checked as identifiers
const re = new RegExp(`\\b(${WORDS.join('|')})\\b`);
const files = [];
const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|json|md)$/.test(n)) files.push(p); } };
walk(join(REPO, 'scripts'));
walk(join(REPO, 'recipes'));
let problems = 0;
for (const f of files) {
  const rel = relative(REPO, f).replace(/\\/g, '/');
  if (rel === 'recipes/migration-report.md' || rel === 'recipes/BASELINE-LICENSE') continue;
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = re.exec(line);
    if (!m) return;
    // the migration's provenance notes name the source row's menu in prose ("(range)"), never a field
    if (/^\s*"note":/.test(line) && rel.startsWith('recipes/')) return;
    problems++;
    if (problems <= 40) console.log(`  ✗ ${rel}:${i + 1}: "${m[1]}" — ${line.trim().slice(0, 100)}`);
  });
}
console.log(problems ? `FAIL: ${problems} line(s) carry Automated Animations' vocabulary` : `PASS: ${files.length} files, no Automated Animations vocabulary in scripts/ or recipes/`);
process.exitCode = problems ? 1 : 0;
