// The catalogue: search the libraries' own registration for a word, and list a family's colours,
// so a path is looked up, never guessed. Offline, seconds. The same code answers the screens'
// colour picker at the table (scripts/engine/assets.js).
//
//   node tools/assets.mjs "misty step"          # families whose path contains the words, with their colours
//   node tools/assets.mjs jb2a.fire_bolt         # the colours (children) of a path, and what it plays
//   node tools/assets.mjs --sounds "fire bolt"   # PSFX only
//   node tools/assets.mjs --json "…"             # as data
import { readRecipes, useLibraries } from './lib/recipes.mjs';
import { coloursOf, resolveAsset, search } from '../scripts/engine/assets.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const sounds = args.includes('--sounds');
const word = args.filter((a) => !a.startsWith('--')).join(' ');
if (!word) { console.error('usage: node tools/assets.mjs [--json] [--sounds] <words | path>'); process.exit(2); }

const recipes = readRecipes();
const { db } = await useLibraries(recipes);

const out = [];
if (/^[a-z0-9_-]+\./i.test(word) && !word.includes(' ')) {
  const r = resolveAsset({ path: word });
  const colours = coloursOf(word);
  const children = db.children(word);
  out.push({ path: word, exists: !r.missing, colours, children, files: db.files(word).slice(0, 6) });
} else {
  for (const hit of search(word, { roots: sounds ? ['psfx'] : ['jb2a', 'psfx'], limit: 60 })) out.push(hit);
}
if (json) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
if (!out.length) { console.log(`nothing in the libraries contains "${word}"`); process.exit(0); }
for (const o of out) {
  if (o.children) {
    console.log(`${o.path}${o.exists ? '' : '  (does not resolve)'}`);
    if (o.colours.length) console.log(`  colours: ${o.colours.join(', ')}`);
    else if (o.children.length) console.log(`  under it: ${o.children.join(', ')}`);
    if (o.files.length) console.log(`  plays: ${o.files.map((f) => f.split('/').pop()).join(', ')}${db.files(o.path).length > 6 ? ' …' : ''}`);
  } else console.log(`${o.path}${o.colours.length ? `  · ${o.colours.join(', ')}` : ''}`);
}
