// The gate contract, proved without Foundry and without Battle Flow (scripts/core/gates.js,
// scripts/readers/battleflow.js). A gate is how another module asks this table to wait until an
// answer is known; the rules it must keep are the ones that decide whether a picture is late, or
// lost. Read-only, offline, a second to run.
//   node tools/check-gates.mjs
import { toUrl } from './lib/env.mjs';
import { join } from 'node:path';
import { REPO } from './lib/env.mjs';

const { clearGates, gateNames, heldUntil, registerGate, HOLD_BOUND_MS } = await import(toUrl(join(REPO, 'scripts/core/gates.js')));

let ok = 0, bad = 0;
const is = (what, got, want) => { const pass = got === want; pass ? ok++ : bad++; console.log(`  ${pass ? '✓' : '✗'} ${what}${pass ? '' : ` — got ${got}, wanted ${want}`}`); };
const moment = (over = {}) => ({ when: 'use', kind: 'use', subject: { name: 'Fireball' }, id: 'msg1', activity: 'Actor.a.Item.i.Activity.x', flags: {}, ...over });

console.log('the registry');
clearGates();
is('no gate registered: a moment is not held', heldUntil(moment()), null);
registerGate('nothing', () => null);
is('a gate that answers null: not held', heldUntil(moment()), null);
clearGates();
is('clearGates empties the registry', gateNames().length, 0);

console.log('\nthe answer');
clearGates();
registerGate('held', () => Promise.resolve({ id: 'the card' }));
const held = heldUntil(moment());
is('a promise means held', held?.names?.join(), 'held');
is('and it plays when the hold lifts on a card', await held.wait, true);

clearGates();
registerGate('lifted, nothing known', () => Promise.resolve({ lifted: true }));
is('a sentinel means the hold lifted and nothing is known: carry on', await heldUntil(moment()).wait, true);

clearGates();
registerGate('came to nothing', () => Promise.resolve(null));
is('a hold that lifts on nothing drops the moment', await heldUntil(moment()).wait, false);

clearGates();
registerGate('two', () => Promise.resolve(1));
registerGate('holds', () => Promise.resolve(null));
is('one gate saying nothing happened is enough to drop it', await heldUntil(moment()).wait, false);

console.log('\nthe table is never the loser');
clearGates();
registerGate('broken', () => { throw new Error('another module’s bug'); });
is('a gate that throws is ignored, not fatal', heldUntil(moment(), { log: () => {} }), null);

clearGates();
registerGate('gone quiet', () => new Promise(() => {}));
is('a hold nobody lifts PLAYS when the bound expires', await heldUntil(moment(), { bound: 20, log: () => {} }).wait, true);
is('the bound at the table is five minutes', HOLD_BOUND_MS, 5 * 60 * 1000);

clearGates();
let asked = 0;
registerGate('counted', () => { asked++; return null; });
heldUntil(moment());
is('a gate is asked once per moment', asked, 1);

console.log('\nthe Battle Flow gate (feature-detected, never imported)');
const { battleflowGate, subjectOf } = await import(toUrl(join(REPO, 'scripts/readers/battleflow.js')));
const world = (mod) => { globalThis.game = { modules: { get: (id) => (id === 'fvtt-mod-battleflow' ? mod : undefined) } }; };
const promise = Promise.resolve('card');

world(undefined);
is('Battle Flow not installed: not held', battleflowGate(moment()), null);
world({ active: false, api: { holdFor: () => promise } });
is('installed but disabled: not held', battleflowGate(moment()), null);
world({ active: true, api: {} });
is('installed without the hold surface: not held', battleflowGate(moment()), null);
world({ active: true, api: { holdFor: (s) => (s === 'Actor.a.Item.i.Activity.x' ? promise : null) } });
is('holdFor is asked by the moment’s activity', battleflowGate(moment()), promise);
world({ active: true, api: { castHold: (s) => (s === 'Actor.a.Item.i.Activity.x' ? promise : null) } });
is('an older build answers on castHold', battleflowGate(moment()), promise);
let asks = 0;
world({ active: true, api: { holdFor: () => { asks++; return null; }, castHold: () => { asks++; return null; } } });
battleflowGate(moment());
is('an un-held moment asks ONE surface once (holdFor’s null is an answer, not a miss)', asks, 1);
world({ active: true, api: { holdFor: () => promise } });
is('the card that LIFTS a hold does not wait on it', battleflowGate(moment({ flags: { 'fvtt-mod-battleflow': { metamagic: { chosen: true } } } })), null);
is('a moment with nothing to ask by: not held', battleflowGate(moment({ activity: null, id: null })), null);
is('the subject is the activity when there is one', subjectOf(moment()), 'Actor.a.Item.i.Activity.x');
is('and the document otherwise', subjectOf(moment({ activity: null })), 'msg1');

clearGates();
console.log(bad ? `\nFAIL: ${bad} of ${ok + bad}` : `\nPASS: ${ok} of ${ok}, the gate contract holds`);
process.exitCode = bad ? 1 : 0;
