// Battle Flow, read at arm's length. Nothing is imported from it and nothing is required: this
// file is one feature detect on a module that may not be installed, and when it is not, the gate
// it makes answers "not held" to everything — which is this module's behaviour with no gate at all.
//
// THE HOLD, in Battle Flow's own words (its ARCHITECTURE and ours say the same sentences):
//
//   A hold is client-local, in-memory, keyed by subject. `holdFor(subject)` answers with a promise
//   or null; null means nothing here is holding, which on a remote client may mean nothing here can
//   SEE a hold. A hold always settles: with the CARD that lifted it (play it), with NULL meaning
//   nothing was posted and nothing should play, or with a truthy SENTINEL meaning the hold lifted
//   and nothing is known — carry on. The consumer bounds its own wait; a hold is a courtesy, never
//   a guarantee of liveness.
//
// That third way is Battle Flow's own correction (2026-09-09): its self-bound used to settle null,
// and an expired bound establishes NOTHING about the cast — the points are spent and the template is
// on the map, so a late answer would have cost the picture for good. A sentinel is truthy, so this
// module's rule needs no special case: truthy plays, and only an explicit release says "nothing".
//
// Battle Flow holds a cast while its caster answers a question the area raised — Careful Spell:
// who does the spell spare? — and posts the real card on the answer (the user, 2026-09-09: "the
// animation fires early"). `holdFor` takes any subject: an activity uuid, a message id, a document
// uuid. `castHold` is the older surface, activity uuids only, and is kept as an alias for good, so
// this asks for the general one first and falls back.

const MODULE = 'fvtt-mod-battleflow';

/** the subject a moment is held by: the activity it came from, else the document it is */
export const subjectOf = (moment) => moment?.activity || moment?.id || null;

/**
 * A gate (core/gates.js) that asks Battle Flow whether this moment is held.
 * Not installed, disabled, or an older build without the surface → null, every time.
 */
export function battleflowGate(moment) {
  const api = game.modules.get(MODULE)?.active ? game.modules.get(MODULE).api : null;
  if (!api) return null;
  // The card that LIFTS a hold must not wait on it: its createChatMessage hook runs INSIDE the
  // create that releases the hold, so it can see its own hold still open. Battle Flow closes the
  // hold before the create on current builds; this is the belt for older ones.
  if (moment.flags?.[MODULE]?.metamagic?.chosen) return null;
  const subject = subjectOf(moment);
  if (!subject) return null;
  // Pick the surface, then ask ONCE: `holdFor` answers null meaningfully ("nothing is holding"), so
  // a ?? chain would ask the older surface again on every un-held moment and read as if null were
  // no answer. `holdFor` is the general one; `castHold` is what older builds have.
  const ask = api.holdFor ?? api.castHold;
  return typeof ask === 'function' ? ask.call(api, subject) ?? null : null;
}
