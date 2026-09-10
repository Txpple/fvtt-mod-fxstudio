// GATES — the other half of the timing policy. The policy in readers/dnd5e.js says WHEN a moment
// plays; a gate says a moment may be HELD, and plays when the hold lifts. Pure: no Foundry here.
//
// A gate is one function, `(moment) => promise | null`, registered by the entry. It is asked ONCE
// per moment, at read time, before the moment plays — never around the player, so a moment can
// never wait twice for the same hold.
//
//   null (or anything not a promise)   nothing here is holding this moment — play it now
//   a promise resolving TRUTHY         held; play when it settles. The value may be the thing that
//                                      lifted it (a card) or a bare sentinel meaning "lifted,
//                                      nothing is known" — both mean carry on, so neither is a case.
//   a promise resolving null/false     the thing the moment came from never happened — play NOTHING
//
// ⚠ The two nulls mean opposite things: a null RETURN is "not held", a null RESOLUTION is "held,
// and it came to nothing". A gate may also answer null because it cannot SEE a hold (Battle Flow's
// is client-local, so a remote client is told null for a cast that is really held) — which is why a
// gate is a courtesy and never a guarantee: the wait is always bounded here, and a bound that
// expires PLAYS. A gate can delay a picture; it must never be able to swallow one by going quiet.

/** how long any hold may delay a picture before we play it anyway */
export const HOLD_BOUND_MS = 5 * 60 * 1000;

const gates = [];

/** register a gate under a name (the name is what the log says when it holds something) */
export function registerGate(name, ask) {
  if (typeof ask !== 'function') throw new Error(`FX Studio: the gate "${name}" is not a function`);
  gates.push({ name, ask });
  return () => { const i = gates.findIndex((g) => g.name === name); if (i >= 0) gates.splice(i, 1); };
}

/** every registered gate, by name (the tools read this; nothing else needs it) */
export const gateNames = () => gates.map((g) => g.name);

/** forget every gate (the tools; the table registers once at init) */
export const clearGates = () => { gates.length = 0; };

/**
 * Ask every gate once, before `moment` plays.
 * → null when nothing holds it (the whole of the table, most of the time)
 * → { names, wait } when something does: `wait` settles true to play, false to drop the moment.
 * A gate that throws is logged and ignored — another module's bug never costs this table a picture.
 */
export function heldUntil(moment, { bound = HOLD_BOUND_MS, log = () => {} } = {}) {
  const waits = [];
  for (const g of gates) {
    let answer = null;
    try { answer = g.ask(moment); } catch (e) { log(`the gate "${g.name}" failed, ignored: ${e.message}`); continue; }
    if (answer && typeof answer.then === 'function') waits.push({ name: g.name, answer });
  }
  if (!waits.length) return null;
  return { names: waits.map((w) => w.name), wait: settle(waits, bound, log) };
}

/** all the holds, bounded: true to play, false when a hold lifted on nothing */
async function settle(waits, bound, log) {
  let timer = null;
  const expired = Symbol('bound');
  const bounded = new Promise((r) => { timer = setTimeout(() => r(expired), bound); });
  try {
    const results = await Promise.race([Promise.all(waits.map((w) => w.answer)), bounded]);
    if (results === expired) { log(`a hold outlived its bound (${Math.round(bound / 1000)}s) — playing anyway`); return true; }
    const dead = waits.find((w, i) => !results[i]);
    if (dead) { log(`the hold "${dead.name}" lifted on nothing — nothing plays`); return false; }
    return true;
  } finally { clearTimeout(timer); }
}
