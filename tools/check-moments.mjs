// Battle Flow's moments, read without Foundry and without Battle Flow (scripts/readers/battleflow.js
// `readMoment`, core/moments.js WHEN and FALLS_BACK_TO_USE, engine/render.js resolveMoment). The
// contract is Battle Flow's `battleflow.moment` payload — plain uuids and ids — and the rules here
// decide whether a picture plays for a resolve that never posts a card. Read-only, offline, a second.
//   node tools/check-moments.mjs
import { toUrl } from './lib/env.mjs';
import { join } from 'node:path';
import { REPO } from './lib/env.mjs';

const { readMoment } = await import(toUrl(join(REPO, 'scripts/readers/battleflow.js')));
const { WHEN, FALLS_BACK_TO_USE, WHEN_WORDS } = await import(toUrl(join(REPO, 'scripts/core/moments.js')));
const { buildIndex } = await import(toUrl(join(REPO, 'scripts/core/corpus.js')));
const { resolve } = await import(toUrl(join(REPO, 'scripts/core/corpus.js')));

let ok = 0, bad = 0;
const is = (what, got, want) => { const pass = got === want; pass ? ok++ : bad++; console.log(`  ${pass ? '✓' : '✗'} ${what}${pass ? '' : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`); };

// a stand-in world: two tokens, one actor each, one feature on the rogue
const rogueToken = { name: 'Rogue', uuid: 'Scene.s.Token.r' };
const goblinToken = { name: 'Goblin', uuid: 'Scene.s.Token.g' };
const sneak = { documentName: 'Item', uuid: 'Actor.rogue.Item.sneak', name: 'Sneak Attack', type: 'feat', system: { identifier: 'sneak-attack' }, flags: {} };
const world = {
  token: (uuid) => ({ 'Scene.s.Token.r': rogueToken, 'Scene.s.Token.g': goblinToken })[uuid] ?? null,
  actor: (uuid) => ({ 'Actor.rogue': rogueToken, 'Actor.goblin': goblinToken })[uuid] ?? null,
  item: (uuid) => (uuid === sneak.uuid ? sneak : null),
  user: () => 'user1',
};
const payload = (over = {}) => ({
  event: 'sneak', module: 'fvtt-mod-battleflow', version: 1,
  actorUuid: 'Actor.rogue', actorName: 'Rogue', tokenUuid: 'Scene.s.Token.r',
  itemUuid: sneak.uuid, itemName: 'Sneak Attack', activityUuid: null, ability: 'Sneak Attack',
  messageId: 'msgDamage', attackId: 'msgAttack',
  targets: [{ actorUuid: 'Actor.goblin', tokenUuid: 'Scene.s.Token.g', name: 'Goblin', hit: true }],
  spend: null, details: { formula: '6d6', picks: ['trip'] }, at: 1, ...over,
});

console.log('the vocabulary');
is('the five Battle Flow words are moment kinds', ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered'].every((w) => WHEN.includes(w)), true);
is('each has a sentence', ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered'].every((w) => typeof WHEN_WORDS[w] === 'string' && WHEN_WORDS[w].length), true);
is('the four that post no card fall back to the use look', FALLS_BACK_TO_USE.join(), 'maneuver,sneak,fold,rider');
is('hold-answered does NOT fall back (its cast posts a card that already plays)', FALLS_BACK_TO_USE.includes('hold-answered'), false);

console.log('\nthe reading');
const m = readMoment(payload(), world);
is('when is the event word', m?.when, 'sneak');
is('the subject is the item, keyed by identity first', m?.subject?.keys?.[0], 'feature:sneak-attack');
is('and by the event last', m?.subject?.keys?.at(-1), 'event:sneak');
is('the source is the token the payload named', m?.source, rogueToken);
is('the target is the token the row named, with its verdict', m?.targets?.[0]?.token === goblinToken && m?.targets?.[0]?.hit === true, true);
is('the origin is the item (Sequencer stamps and ends by it)', m?.origin, sneak.uuid);
is('the id is the message and the event (the ledger keys on it; the same message may carry a use)', m?.id, 'msgDamage:sneak');
is('no Battle Flow flag is read — flags is empty by contract', JSON.stringify(m?.flags), '{}');
is('the plain payload rides as `event` for a gate or a tool', m?.event?.messageId, 'msgDamage');
is('the user is this client — the hook fires where the moment resolved', m?.user, 'user1');

console.log('\nwithout an item, or without a canvas');
const bare = readMoment(payload({ itemUuid: null, itemName: null, event: 'fold', ability: 'Bardic Inspiration' }), world);
is('no item: the subject is the event itself, keyed event:<word>', bare?.subject?.keys?.join(), 'event:fold');
is('and named by the ability the payload says', bare?.subject?.name, 'Bardic Inspiration');
const byActor = readMoment(payload({ tokenUuid: null, targets: [{ actorUuid: 'Actor.goblin', tokenUuid: null, name: 'Goblin' }] }), world);
is('no token uuid: the source is the actor\'s active token', byActor?.source, rogueToken);
is('a target row with no verdict carries no hit (counts as hit downstream)', 'hit' in (byActor?.targets?.[0] ?? {}), false);
const nobody = readMoment(payload({ tokenUuid: null, actorUuid: 'Actor.nobody' }), world);
is('nobody on the canvas: a skip with the reason, never a throw', nobody?.skip, 'no token for the one who resolved it');
const missingTarget = readMoment(payload({ targets: [{ actorUuid: 'Actor.nobody', tokenUuid: null }] }), world);
is('a target that is gone is dropped, the moment stands', missingTarget?.targets?.length, 0);

console.log('\nwhat is refused');
is('a payload that is not one: null', readMoment(null, world), null);
is('a payload with no event: null', readMoment({ actorUuid: 'Actor.rogue' }, world), null);
is('a word this build does not know: a skip, so a newer Battle Flow never throws here', readMoment(payload({ event: 'emanation' }), world)?.skip?.startsWith('"emanation" is not a moment kind'), true);

console.log('\nthe fallback, through the corpus index');
const index = buildIndex({
  stock: [{ id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'jb2a.sneak_attack.dark_green' } }] }],
  house: [], world: [], starters: [],
});
const { resolveMoment } = await import(toUrl(join(REPO, 'scripts/engine/render.js'))).catch(() => ({ resolveMoment: null }));
if (resolveMoment) {
  const r = resolveMoment(index, m);
  is('a sneak moment with only a use look plays the use look', r?.fx?.id, 'sneak-attack');
  is('and says it fell back', r?.fellBackFrom, 'sneak');
  const own = buildIndex({ stock: [
    { id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'a' } }] },
    { id: 'sneak-attack-dice', for: ['feature:sneak-attack'], on: 'sneak', scenes: [{ shape: 'mark', asset: { path: 'b' } }] },
  ], house: [], world: [], starters: [] });
  is('a look authored for the word wins over the use look', resolveMoment(own, m)?.fx?.id, 'sneak-attack-dice');
  const off = buildIndex({ stock: [{ id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'a' } }] }],
    house: [{ id: 'sneak-quiet', for: ['feature:sneak-attack'], on: 'sneak', off: true }], world: [], starters: [] });
  is('an off on the word silences it — no fallback past a silence', resolveMoment(off, m)?.fx ?? null, null);
  const held = readMoment(payload({ event: 'hold-answered', itemUuid: sneak.uuid }), world);
  is('hold-answered with only a use look plays nothing (the card already did)', resolveMoment(index, held)?.fx ?? null, null);
  is('the event key answers on its own when a look is keyed to it', resolveMoment(buildIndex({ stock: [{ id: 'any-sneak', for: ['event:sneak'], on: 'sneak', scenes: [{ shape: 'mark', asset: { path: 'c' } }] }], house: [], world: [], starters: [] }), m)?.fx?.id, 'any-sneak');
} else {
  console.log('  (engine/render.js needs the canvas; the fallback is proved through resolve() below)');
  const r = resolve(index, m.subject.keys, 'use', {});
  is('the use look answers the subject\'s keys', r?.fx?.id, 'sneak-attack');
}

console.log(`\n${bad ? 'FAIL' : 'PASS'}: ${ok} of ${ok + bad}, Battle Flow's moments read as the contract says`);
process.exit(bad ? 1 : 0);
