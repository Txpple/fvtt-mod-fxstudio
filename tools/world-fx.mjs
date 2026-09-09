// THE WORLD BUFFER, SAVED AND PUT BACK — the FX written in the game that git does not otherwise
// hold (the user, 2026-09-09: "i eventually need to reset the sandbox, so i will need to push the
// work back down when it is refreshed. i dont want to lose any work").
//
// An FX written through the screens or the API lives in the WORLD's settings, not in a file, until
// it is Staged and Shipped (then it is in recipes/house.json, which git holds). Everything between
// those two moments — a Draft in progress — exists in one place only, and a prod → sandbox refresh
// (pull-prod-to-local.mjs) overwrites that world. This is the tool that makes the round trip safe.
//
//   node tools/world-fx.mjs                # what the buffer holds, as sentences; write nothing
//   node tools/world-fx.mjs --save         # buffer → tools/world-buffer.json (COMMIT IT)
//   node tools/world-fx.mjs --restore      # tools/world-buffer.json → buffer (sandbox STOPPED)
//
// The refresh routine, in order:
//   1  node tools/world-fx.mjs --save   and commit tools/world-buffer.json
//   2  the refresh (pull-prod-to-local.mjs), which wipes the world, the deployed module and its
//      enabled flag
//   3  sandbox STOPPED:  deploy-house-module.mjs fvtt-mod-fxstudio --local
//                        node tools/sandbox-module.mjs --enable fvtt-mod-fxstudio
//                        node tools/world-fx.mjs --restore
//   4  start the sandbox; the Drafts are on the FX tab again, by their own author
//
// ⚠ SAVED, NOT SHIPPED. This parks work in progress so a refresh cannot take it; it is not the way
// an FX reaches the corpus. A Draft that is finished belongs in recipes/house.json — Stage it on
// Coverage and Ship it on Corpus, or fold it in offline with tools/export-fx.mjs --write.
//
// ⚠ LOCAL ONLY. It reads and writes the world at FOUNDRY_DATA (lib/env.mjs), which is the sandbox.
// Prod's buffer is prod's; nothing here reaches it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, WORLD, classicLevel, worldDb } from './lib/env.mjs';
import { readSettings, snapshot } from './lib/leveldb.mjs';
import { readRecipes, indexRecipes } from './lib/recipes.mjs';
import { provenance, sentence, validate } from '../scripts/core/fx.js';

const SETTING = 'fvtt-mod-fxstudio.fx';
const FILE = join(REPO, 'tools', 'world-buffer.json');
const SAVE = process.argv.includes('--save');
const RESTORE = process.argv.includes('--restore');
if (SAVE && RESTORE) { console.error('--save or --restore, not both'); process.exit(2); }

const say = (s = '') => console.log(s);
const recipes = readRecipes();

/** the buffer as the world holds it right now (read-only: a snapshot, so the sandbox may be up) */
async function readBuffer() {
  const settings = await readSettings(snapshot(worldDb('settings'), 'world-fx'));
  const raw = settings[SETTING];
  return raw ? JSON.parse(raw) : [];
}

/** every FX in a list as its sentence, with who wrote it and where it is bound */
function show(list, what) {
  const index = indexRecipes(recipes, list);
  say(`${what}: ${list.length} fx`);
  for (const fx of list) {
    const errs = validate(fx);
    const where = fx.to ? `staged for ${fx.to}` : 'Draft, not staged';
    say(`  ${fx.id} · ${where}${provenance(fx) ? ` · ${provenance(fx)}` : ''}`);
    say(`    ${errs.length ? `⚠ ${errs.join('; ')}` : sentence(fx, { index })}`);
  }
}

// ── read ──────────────────────────────────────────────────────────────────────────────────────
if (!RESTORE) {
  const buffer = await readBuffer();
  if (!buffer.length) say(`the world buffer of "${WORLD}" is empty — nothing written in the game that git does not hold`);
  else show(buffer, `the world buffer of "${WORLD}"`);
  if (!SAVE) {
    if (existsSync(FILE)) {
      const saved = JSON.parse(readFileSync(FILE, 'utf8'));
      say(`\ntools/world-buffer.json holds ${saved.fx?.length ?? 0} fx, saved ${saved.at ?? '?'} — --restore puts them back`);
    }
    say('\n(nothing written — pass --save to park them in git, or --restore to put a saved set back)');
    process.exit(0);
  }
  writeFileSync(FILE, `${JSON.stringify({
    _meta: {
      schema: 1,
      at: new Date().toISOString().slice(0, 10),
      world: WORLD,
      fx: buffer.length,
      note: 'The world buffer parked in git so a sandbox refresh cannot take it. NOT the corpus: an FX reaches recipes/house.json by being Staged and Shipped. Put back with tools/world-fx.mjs --restore, sandbox stopped.',
    },
    fx: buffer,
  }, null, 1)}\n`);
  say(`\n✓ wrote ${FILE} — commit it, then the refresh cannot lose them`);
  process.exit(0);
}

// ── put back ──────────────────────────────────────────────────────────────────────────────────
if (!existsSync(FILE)) { console.error(`nothing saved: ${FILE} does not exist. Run --save first.`); process.exit(1); }
const saved = JSON.parse(readFileSync(FILE, 'utf8'));
const list = saved.fx ?? [];
if (!list.length) { say('the saved file holds no fx; nothing to put back'); process.exit(0); }

const invalid = list.filter((fx) => validate(fx).length);
if (invalid.length) { console.error(`${invalid.length} saved fx do not validate; fix the file first: ${invalid.map((f) => f.id).join(', ')}`); process.exit(1); }

const dir = worldDb('settings');
const ClassicLevel = classicLevel();
const db = new ClassicLevel(dir);
try {
  await db.open();
} catch (e) {
  console.error(`cannot open ${dir} for writing (${e.code ?? e.message}); is the sandbox stopped?`);
  console.error('  node ../fvtt-mcp-molten5e/scripts/local-foundry.mjs stop');
  process.exit(1);
}
let key = null, doc = null;
for await (const [k, v] of db.iterator()) { const d = JSON.parse(v); if (d.key === SETTING) { key = k; doc = d; break; } }
const now = doc?.value ? JSON.parse(doc.value) : [];
// the saved FX win by id; anything written since the save is kept beside them, so nothing is dropped
const kept = now.filter((l) => !list.some((s) => s.id === l.id));
const next = [...kept, ...list];
const value = JSON.stringify(next);
if (key) await db.put(key, JSON.stringify({ ...doc, value }));
else {
  const id = foundryId();
  await db.put(`!settings!${id}`, JSON.stringify({ _id: id, key: SETTING, value }));
}
await db.close();
say(`✓ put ${list.length} fx back into the world buffer of "${WORLD}"${kept.length ? `, keeping ${kept.length} already there` : ''}`);
show(next, 'the buffer now');
say('\nStart the sandbox; they are on the FX tab as Drafts, by their own author.');

/** a Foundry-shaped 16-char id, for the case where the world has never held this setting */
function foundryId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
