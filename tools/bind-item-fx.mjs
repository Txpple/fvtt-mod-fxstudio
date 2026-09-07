// Point the four items the migration carried as their own FX at those FX, so they answer for that
// one item and no longer share a key with the ability's FX (DESIGN §8, 2026-09-06). Idempotent.
//
//   node tools/bind-item-fx.mjs           # the sandbox
//   node tools/bind-item-fx.mjs --prod    # prod, only on the user's word
import { connectSandbox } from './lib/foundry.mjs';

const OWN = [
  ['Harrow Vane', 'Unholy Word', 'unholy-word-harrow-vane'],
  ['Harrow Vane', 'Necrotic Burst', 'necrotic-burst-harrow-vane'],
  ['Thomas A. Invictus', 'First Light', 'first-light-thomas-a-invictus'],
  ['Jetten Elisedil', 'Goldthorn', 'goldthorn-jetten-elisedil'],
];
const prod = process.argv.includes('--prod');
if (prod) { console.error("prod binding runs only on the user's word, through a prod connector this tool does not yet have (tools/README.md)"); process.exit(2); }
const { f, dispose } = await connectSandbox({ tag: 'bind', watchdogMs: 60_000 });
const out = await f.evaluate(async ({ own }) => {
  const res = [];
  for (const [actorName, itemName, id] of own) {
    const item = game.actors.getName(actorName)?.items.getName(itemName);
    if (!item) { res.push(`${actorName} / ${itemName}: not found`); continue; }
    const had = item.getFlag('fvtt-mod-fxstudio', 'fx');
    if (had !== id) await item.setFlag('fvtt-mod-fxstudio', 'fx', id);
    res.push(`${actorName} / ${itemName} → ${id}${had === id ? ' (already)' : ''}`);
  }
  return res;
}, { own: OWN });
for (const line of out) console.log(`[bind] ${line}`);
await dispose();
