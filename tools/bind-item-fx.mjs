// Point the items that have their own FX at those FX, so each answers for that one item and shares
// no key with the ability's FX (DESIGN §8). Idempotent, and it also UNBINDS: an item pointing at an
// FX the corpus no longer holds is left pointing at a dead id, which plays nothing and says nothing.
// The user cut the house corpus to two custom swords on 2026-09-08; the two it dropped are unbound.
//
//   node tools/bind-item-fx.mjs           # the sandbox
//   node tools/bind-item-fx.mjs --prod    # prod, only on the user's word
import { connectSandbox } from './lib/foundry.mjs';

const OWN = [
  ['Thomas A. Invictus', 'First Light', 'first-light-thomas-a-invictus'],
  ['Jetten Elisedil', 'Goldthorn', 'goldthorn-jetten-elisedil'],
];
/** items whose own FX the user deleted: the pointer comes off, or it names an FX nothing holds */
const UNBIND = [
  ['Harrow Vane', 'Unholy Word'],
  ['Harrow Vane', 'Necrotic Burst'],
];
const prod = process.argv.includes('--prod');
if (prod) { console.error("prod binding runs only on the user's word, through a prod connector this tool does not yet have (tools/README.md)"); process.exit(2); }
const { f, dispose } = await connectSandbox({ tag: 'bind', watchdogMs: 60_000 });
const out = await f.evaluate(async ({ own, unbind }) => {
  const res = [];
  for (const [actorName, itemName, id] of own) {
    const item = game.actors.getName(actorName)?.items.getName(itemName);
    if (!item) { res.push(`${actorName} / ${itemName}: not found`); continue; }
    const had = item.getFlag('fvtt-mod-fxstudio', 'fx');
    if (had !== id) await item.setFlag('fvtt-mod-fxstudio', 'fx', id);
    res.push(`${actorName} / ${itemName} → ${id}${had === id ? ' (already)' : ''}`);
  }
  for (const [actorName, itemName] of unbind) {
    const item = game.actors.getName(actorName)?.items.getName(itemName);
    if (!item) { res.push(`${actorName} / ${itemName}: not found`); continue; }
    const had = item.getFlag('fvtt-mod-fxstudio', 'fx');
    if (had) await item.unsetFlag('fvtt-mod-fxstudio', 'fx');
    res.push(`${actorName} / ${itemName} → unbound${had ? ` (was ${had})` : ' (already)'}`);
  }
  return res;
}, { own: OWN, unbind: UNBIND });
for (const line of out) console.log(`[bind] ${line}`);
await dispose();
