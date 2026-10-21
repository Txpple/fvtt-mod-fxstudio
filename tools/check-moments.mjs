// By the Books' moments (formerly Battle Flow), read without Foundry and without By the Books
// (scripts/readers/bythebooks.js `readMoment` and `firstHearing`, core/moments.js WHEN and
// FALLS_BACK_TO_USE, engine/render.js resolveMoment). The contract is By the Books'
// `bythebooks.moment` payload (`battleflow.moment` on 2.x) — plain uuids and ids — and the rules here
// decide whether a picture plays for a resolve that never posts a card. Read-only, offline, a second.
//   node tools/check-moments.mjs
import { toUrl } from './lib/env.mjs';
import { join } from 'node:path';
import { REPO } from './lib/env.mjs';

const { readMoment, firstHearing, declinedBy } = await import(toUrl(join(REPO, 'scripts/readers/bythebooks.js')));
const { WHEN, BYTHEBOOKS_WORDS, FALLS_BACK_TO_USE, WHEN_WORDS } = await import(toUrl(join(REPO, 'scripts/core/moments.js')));
const { buildIndex } = await import(toUrl(join(REPO, 'scripts/core/corpus.js')));

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
  event: 'sneak', module: 'fvtt-mod-bythebooks', version: 2, kind: 'sneakDamage', marker: 'message',
  actorUuid: 'Actor.rogue', actorName: 'Rogue', tokenUuid: 'Scene.s.Token.r',
  itemUuid: sneak.uuid, itemName: 'Sneak Attack', activityUuid: null, ability: 'Sneak Attack',
  messageId: 'msgDamage', attackId: 'msgAttack',
  targets: [{ actorUuid: 'Actor.goblin', tokenUuid: 'Scene.s.Token.g', name: 'Goblin', hit: true }],
  spend: null, details: { formula: '6d6', picks: ['trip'] }, at: 1, ...over,
});

console.log('the vocabulary');
is('the five By the Books words are moment kinds', ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered'].every((w) => WHEN.includes(w)), true);
is('each has a sentence', ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered'].every((w) => typeof WHEN_WORDS[w] === 'string' && WHEN_WORDS[w].length), true);
is('the four that post no card fall back to the use look', FALLS_BACK_TO_USE.join(), 'maneuver,sneak,fold,rider');
is('hold-answered does NOT fall back (its cast posts a card that already plays)', FALLS_BACK_TO_USE.includes('hold-answered'), false);
is('summon is a moment kind with a sentence', WHEN.includes('summon') && WHEN_WORDS.summon, 'when its creature appears');
is('summon does NOT fall back (the summoning spell\'s card already played its use)', FALLS_BACK_TO_USE.includes('summon'), false);

console.log('\nthe reading');
const m = readMoment(payload(), world);
is('when is the event word', m?.when, 'sneak');
is('the subject is the item, keyed by identity first', m?.subject?.keys?.[0], 'feature:sneak-attack');
is('and by the event last', m?.subject?.keys?.at(-1), 'event:sneak');
is('the source is the token the payload named', m?.source, rogueToken);
is('the target is the token the row named, with its verdict', m?.targets?.[0]?.token === goblinToken && m?.targets?.[0]?.hit === true, true);
is('the origin is the item (Sequencer stamps and ends by it)', m?.origin, sneak.uuid);
is('the id is the message and the event (the ledger keys on it; the same message may carry a use)', m?.id, 'msgDamage:sneak');
is('no By the Books flag is read — no document and no data ride, by contract', JSON.stringify([m?.document, m?.data, m?.type]), '[null,null,"bythebooks"]');
is('the moment kind names the reader', m?.kind, 'bythebooks');
is('the moment knows its use: the message the resolve rode', m?.use, 'msgDamage');
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
is('a word this build does not know: a skip, so a newer By the Books never throws here', readMoment(payload({ event: 'emanation' }), world)?.skip?.startsWith('"emanation" is not a By the Books word'), true);
is('the words read are a closed list of their own, every one a moment kind', BYTHEBOOKS_WORDS.every((w) => WHEN.includes(w)), true);
is('`use` off the hook is a skip: the card already plays it', typeof readMoment(payload({ event: 'use' }), world)?.skip, 'string');
is('`effect` off the hook is a skip: the effect reader already plays it (and a revert would play it again)', typeof readMoment(payload({ event: 'effect' }), world)?.skip, 'string');
is('the momentId rides on the moment', readMoment(payload({ momentId: 'msgDamage|sneakDamage|message' }), world)?.momentId, 'msgDamage|sneakDamage|message');
is('and its ticket is the momentId and the word', readMoment(payload({ momentId: 'msgDamage|sneakDamage|message' }), world)?.ticket, 'msgDamage|sneakDamage|message|sneak');
is('no momentId (a v1 Battle Flow): null, never undefined', readMoment(payload(), world)?.momentId, null);
is('and no ticket', readMoment(payload(), world)?.ticket, null);

console.log('\na resolve that came to nothing plays nothing');
const parried = (over = {}) => payload({ event: 'hold-answered', kind: 'hold', marker: 'Actor.rogue', momentId: 'msgAttack|hold|Actor.rogue', ...over });
is('a held roll answered with a cast is read', readMoment(parried({ details: { answer: 'cast' } }), world)?.when, 'hold-answered');
is('a held roll passed is a skip', readMoment(parried({ details: { answer: 'pass', timedOut: false } }), world)?.skip?.startsWith('a resolve that came to nothing (answer "pass")'), true);
is('a fold offered and passed is a skip', typeof readMoment(payload({ event: 'fold', kind: 'd20fold', marker: 'passed', details: { outcome: 'passed' } }), world)?.skip, 'string');
is('a Precision die passed by the timer is a skip', typeof readMoment(payload({ event: 'maneuver', kind: 'precision', details: { outcome: 'passed (timer)' } }), world)?.skip, 'string');
is('a Riposte declined is a skip', typeof readMoment(payload({ event: 'maneuver', kind: 'riposte', details: { answer: 'declined' } }), world)?.skip, 'string');
is('a Precision die used is read', readMoment(payload({ event: 'maneuver', kind: 'precision', details: { outcome: 'used' } }), world)?.when, 'maneuver');
is('a fold spent (no outcome) is read', readMoment(payload({ event: 'fold', kind: 'd20fold', marker: 'spend:0', details: { kind: 'bardic' } }), world)?.when, 'fold');
is('declinedBy names why', declinedBy({ details: { outcome: 'no longer needed' } }), 'outcome "no longer needed"');
is('and nothing for a resolve that happened', declinedBy({ details: { answer: 'use', outcome: 'used' } }), null);

console.log('\na summon (By the Books\' cast on its summon record, 2026-10-12)');
const imp = { name: 'Imp', uuid: 'Scene.s.Token.i' };
const owl = { name: 'Owl', uuid: 'Scene.s.Token.o' };
const summonWorld = { ...world, token: (uuid) => ({ 'Scene.s.Token.i': imp, 'Scene.s.Token.o': owl })[uuid] ?? world.token(uuid) };
const summoned = (over = {}) => payload({ event: 'cast', kind: 'summon', marker: 'message', momentId: 'msgSummon|summon|message', messageId: 'msgSummon',
  itemUuid: null, itemName: 'Find Familiar', ability: 'Find Familiar',
  targets: [{ actorUuid: 'Actor.imp', tokenUuid: 'Scene.s.Token.i', name: 'Imp' }, { actorUuid: 'Actor.owl', tokenUuid: 'Scene.s.Token.o', name: 'Owl' }],
  details: { outcome: 'landed', count: 2 }, ...over });
const sm = readMoment(summoned(), summonWorld);
is('cast on the summon record is a summon moment', sm?.when, 'summon');
is('keyed by the moment word last', sm?.subject?.keys?.at(-1), 'event:summon');
is('the source is the caster', sm?.source, rogueToken);
is('the targets are the tokens the creatures landed as', sm?.targets?.map((t) => t.token.name).join(), 'Imp,Owl');
is('the ledger id names the word', sm?.id, 'msgSummon:summon');
is('a cast on any other record (a transform) stays a skip', typeof readMoment(summoned({ kind: 'transform' }), summonWorld)?.skip, 'string');
is('a cast with no record stays a skip', typeof readMoment(summoned({ kind: null }), summonWorld)?.skip, 'string');
is('the word alone off the hook is not read (it is ours, not By the Books\')', typeof readMoment(payload({ event: 'summon' }), world)?.skip, 'string');
const leaving = readMoment(summoned({ marker: 'companion-abc', momentId: 'msgSummon|summon|companion-abc', details: { companion: 'leave', summon: 'Owl' } }), summonWorld);
is('a companion leaving (its pocket, dismissed) is an unsummon moment', leaving?.when, 'unsummon');
is('keyed event:unsummon last', leaving?.subject?.keys?.at(-1), 'event:unsummon');
is('a later beat keeps its own ledger row', leaving?.id, 'msgSummon:unsummon:companion-abc');
is('a companion called back is a summon again', readMoment(summoned({ marker: 'companion-def', details: { companion: 'appear' } }), summonWorld)?.when, 'summon');
is('unsummon is a moment kind with a sentence', WHEN.includes('unsummon') && WHEN_WORDS.unsummon, 'when its creature leaves');
is('unsummon does NOT fall back to use', FALLS_BACK_TO_USE.includes('unsummon'), false);

console.log('\na gift (By the Books\' choice on its restSong record: Musician\'s Heroic Inspiration after a rest, 2026-10-21)');
const bard = { name: 'Bard', uuid: 'Scene.s.Token.b' };
const fighter = { name: 'Fighter', uuid: 'Scene.s.Token.f' };
const musician = { documentName: 'Item', uuid: 'Actor.bard.Item.musician', name: 'Musician', type: 'feat', system: { identifier: 'musician' }, flags: {} };
const leader = { documentName: 'Item', uuid: 'Actor.bard.Item.leader', name: 'Inspiring Leader', type: 'feat', system: { identifier: 'inspiring-leader' }, flags: {} };
const giftWorld = {
  ...world,
  token: (uuid) => ({ 'Scene.s.Token.b': bard, 'Scene.s.Token.f': fighter })[uuid] ?? world.token(uuid),
  item: (uuid) => ({ [musician.uuid]: musician, [leader.uuid]: leader })[uuid] ?? world.item(uuid),
};
const given = (over = {}) => payload({ event: 'choice', kind: 'restSong', marker: 'message', momentId: 'msgSong|restSong|message', messageId: 'msgSong', attackId: null,
  actorUuid: 'Actor.bard', actorName: 'Bard', tokenUuid: 'Scene.s.Token.b', itemUuid: musician.uuid, itemName: 'Musician', ability: 'Musician',
  targets: [{ actorUuid: 'Actor.rogue', tokenUuid: 'Scene.s.Token.r', name: 'Rogue' }, { actorUuid: 'Actor.fighter', tokenUuid: 'Scene.s.Token.f', name: 'Fighter' }],
  details: { grant: 'inspiration', given: ['Rogue', 'Fighter'] }, ...over });
const gift = readMoment(given(), giftWorld);
is('choice on the restSong record is a gift moment', gift?.when, 'gift');
is('the subject is the feat that gave it, keyed by identity first', gift?.subject?.keys?.[0], 'feature:musician');
is('and by the moment word last', gift?.subject?.keys?.at(-1), 'event:gift');
is('the source is the giver', gift?.source, bard);
is('the targets are the creatures who received it', gift?.targets?.map((t) => t.token.name).join(), 'Rogue,Fighter');
is('the ledger id names the word', gift?.id, 'msgSong:gift');
is('its ticket is the momentId and By the Books\' word', gift?.ticket, 'msgSong|restSong|message|choice');
const bareGift = readMoment(given({ itemUuid: null, itemName: null }), giftWorld);
is('no item named (only the row\'s name): the event key alone', bareGift?.subject?.keys?.join(), 'event:gift');
is('a recipient with no token uuid: the actor\'s token on the viewed scene', readMoment(given({ targets: [{ actorUuid: 'Actor.goblin', tokenUuid: null, name: 'Goblin' }] }), giftWorld)?.targets?.[0]?.token, goblinToken);
is('given to no one: a moment with no targets (an each-target picture plays nothing)', readMoment(given({ targets: [], details: { grant: 'inspiration', given: [] } }), giftWorld)?.targets?.length, 0);
is('a choice on any other record (an Initiative swap) stays a skip', typeof readMoment(given({ kind: 'initiativeSwap' }), giftWorld)?.skip, 'string');
is('the word alone off the hook is not read (it is ours, not By the Books\')', typeof readMoment(payload({ event: 'gift' }), world)?.skip, 'string');
is('gift is a moment kind with a sentence', WHEN.includes('gift') && WHEN_WORDS.gift, 'when it is given to allies');
is('gift does NOT fall back to use (what it gives is often rolled on a card that already played)', FALLS_BACK_TO_USE.includes('gift'), false);

console.log('\nthe twin (3.0 emits bythebooks.moment and battleflow.moment for one payload)');
const twin = payload({ momentId: 'msgTwin|sneakDamage|message' });
is('the first name is heard', firstHearing(twin), true);
is('the same momentId under the other name is not', firstHearing({ ...twin }), false);
is('another momentId is heard', firstHearing(payload({ momentId: 'msgTwin|clockRiders|0' })), true);
is('a payload with no momentId is always heard (no double-emitting build publishes one)', firstHearing(payload()) && firstHearing(payload()), true);

console.log('\none resolve under two words (Parry: hold-answered and maneuver, one momentId)');
const parry = { event: 'hold-answered', kind: 'hold', marker: 'Actor.rogue', momentId: 'msgParry|hold|Actor.rogue', details: { answer: 'cast', mode: 'reduce' } };
is('the first word is heard', firstHearing(payload(parry)), true);
is('the second word on the same momentId is heard too: it is not a twin', firstHearing(payload({ ...parry, event: 'maneuver' })), true);
is('and its twin under the other hook name is not', firstHearing(payload({ ...parry, event: 'maneuver' })), false);

console.log('\nthe fallback, through the corpus index');
const index = buildIndex({
  stock: [{ id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'jb2a.sneak_attack.dark_green' } }] }],
  house: [], starters: [],
});
const { resolveMoment, firstTime } = await import(toUrl(join(REPO, 'scripts/engine/render.js'))); // a failed import FAILS the check; it used to be swallowed
{
  console.log('\nthe tickets');
  const ticketed = readMoment(payload({ momentId: 'msgDamage|sneakDamage|message' }), world);
  is('a ticket plays the first time', firstTime(ticketed), true);
  is('and never a second time on this client', firstTime(ticketed), false);
  is('a different ticket is new', firstTime(readMoment(payload({ momentId: 'msgDamage|clockRiders|0' }), world)), true);
  const parryHold = readMoment(payload({ event: 'hold-answered', kind: 'hold', marker: 'Actor.rogue', momentId: 'msgParry2|hold|Actor.rogue', details: { answer: 'cast' } }), world);
  const parryDie = readMoment(payload({ event: 'maneuver', kind: 'hold', marker: 'Actor.rogue', momentId: 'msgParry2|hold|Actor.rogue', details: { answer: 'cast' } }), world);
  is('one resolve under two words: the first word plays', firstTime(parryHold), true);
  is('and the second word plays too, its own ticket on the same momentId', firstTime(parryDie), true);
  is('a moment with no ticket is always new (the card readers, a v1 Battle Flow)', firstTime(m) && firstTime(m), true);
  const r = resolveMoment(index, m);
  is('a sneak moment with only a use look plays the use look', r?.fx?.id, 'sneak-attack');
  is('and says it fell back', r?.fellBackFrom, 'sneak');
  const own = buildIndex({ stock: [
    { id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'a' } }] },
    { id: 'sneak-attack-dice', for: ['feature:sneak-attack'], on: 'sneak', scenes: [{ shape: 'mark', asset: { path: 'b' } }] },
  ], house: [], starters: [] });
  is('a look authored for the word wins over the use look', resolveMoment(own, m)?.fx?.id, 'sneak-attack-dice');
  const off = buildIndex({ stock: [{ id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'a' } }] }],
    house: [{ id: 'sneak-quiet', for: ['feature:sneak-attack'], on: 'sneak', off: true }], world: [], starters: [] });
  is('an off on the word silences it — no fallback past a silence', resolveMoment(off, m)?.fx ?? null, null);
  const held = readMoment(payload({ event: 'hold-answered', itemUuid: sneak.uuid }), world);
  is('hold-answered with only a use look plays nothing (the card already did)', resolveMoment(index, held)?.fx ?? null, null);
  const castOnly = buildIndex({ stock: [{ id: 'any-cast', for: ['event:summon'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'a' } }] }], house: [], starters: [] });
  is('a summon with only a use FX plays nothing (the cast already did)', resolveMoment(castOnly, sm)?.fx ?? null, null);
  is('an FX keyed event:summon on summon answers every summon', resolveMoment(buildIndex({ stock: [{ id: 'any-summon', for: ['event:summon'], on: 'summon', scenes: [{ shape: 'mark', asset: { path: 'd' } }] }], house: [], starters: [] }), sm)?.fx?.id, 'any-summon');
  const song = buildIndex({ stock: [
    { id: 'musician', for: ['feature:musician'], on: 'gift', scenes: [{ shape: 'mark', at: 'each-target', asset: { path: 'e' } }] },
    { id: 'inspiring-leader', for: ['feature:inspiring-leader'], on: 'use', scenes: [{ shape: 'mark', asset: { path: 'f' } }] },
  ], house: [], starters: [] });
  is('an FX keyed to the feat on gift answers its gift', resolveMoment(song, gift)?.fx?.id, 'musician');
  is('another feat\'s gift is not answered by it, and does not fall back to its use FX', resolveMoment(song, readMoment(given({ itemUuid: leader.uuid, ability: 'Inspiring Leader', details: { grant: 'temphp', given: ['Rogue'] } }), giftWorld))?.fx ?? null, null);
  is('with no item named, the feat\'s FX cannot answer (By the Books must name the item)', resolveMoment(song, bareGift)?.fx ?? null, null);
  is('a gift plays once per momentId', firstTime(gift) && !firstTime(gift), true);
  is('the event key answers on its own when a look is keyed to it', resolveMoment(buildIndex({ stock: [{ id: 'any-sneak', for: ['event:sneak'], on: 'sneak', scenes: [{ shape: 'mark', asset: { path: 'c' } }] }], house: [], starters: [] }), m)?.fx?.id, 'any-sneak');
}

console.log(`\n${bad ? 'FAIL' : 'PASS'}: ${ok} of ${ok + bad}, By the Books' moments read as the contract says`);
process.exit(bad ? 1 : 0);
