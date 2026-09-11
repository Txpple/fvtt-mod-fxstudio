// A MOMENT is what happened at the table, as plain data every reader produces the same way
// (ARCHITECTURE §2). Pure: no Foundry here.
//
//   { when, subject, source, targets: [{token, hit?}], place?, destination?, tie?, id, user }
//
//   when         one of WHEN — the kind of moment an FX can answer ("on")
//   subject      what acted, with its identity keys (core/subjects.js): {keys, name, kind, ...}
//   source       the acting token (a Token placeable at the table; a plain stand-in in the tools)
//   targets      the targeted tokens, each with `hit` when the moment knows it (an attack does)
//   place        a placed template (a Region document), or absent
//   destination  a point {x, y} a move already knows (a suite, a preview), or absent: the move asks
//   tie          the document persistent pictures live and die with (an active effect, a Region)
//   origin       the uuid Sequencer effects are stamped with (the item's, the effect's)
//   id           the message or document id (the ledger keys on it)
//   activity     the dnd5e activity uuid the moment came from, or null (what a GATE asks by)
//   flags        the flags of the document the moment was read from (a gate may read them)

// A moment may also be HELD: another module can ask this table to wait until an answer is known
// (core/gates.js). That is the timing policy's other half and nothing here needs to know about it —
// a moment is the same record held or not.

/**
 * The closed vocabulary of moment kinds; phase 4 adds the outcomes and the table's events. The five
 * after `effect` are BATTLE FLOW'S MOMENTS (readers/battleflow.js, 2026-09-11): the resolves that
 * exist only in its rules and post no card of their own — a maneuver die riding a hit or answering
 * a hold, Sneak Attack's dice, a die folded into a d20 test, a clock rider's damage, a held roll
 * answered by a cast. The words are Battle Flow's contract (`api.moments.events`), one for one.
 */
export const WHEN = ['use', 'effect', 'maneuver', 'sneak', 'fold', 'rider', 'hold-answered'];

/**
 * The Battle Flow words this build READS (readers/battleflow.js) — a closed list of its own, not
 * WHEN. Battle Flow's contract v2 (2026-09-11) publishes seventeen words, and two of the rest, `use`
 * and `effect`, are also moment kinds here: they name the card and the effect the dnd5e reader
 * already plays from, so hearing them off the hook would play the same picture twice (the effect
 * receipt lands a beat after the effect is created; a revert would land it a third time). A word is
 * added here only with a reader that knows what the table should see for it.
 */
export const BATTLEFLOW_WORDS = ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered'];

/** what the sentence says for each kind */
export const WHEN_WORDS = {
  use: 'when used',
  effect: 'while the effect stands',
  maneuver: 'when its maneuver die rides',
  sneak: 'when Sneak Attack rides',
  fold: 'when its die folds into a roll',
  rider: 'when its damage rides a hit',
  'hold-answered': 'when it answers a held roll',
};

/**
 * A Battle Flow moment whose ability never posts a card falls back to the ability's `use` look when
 * no look names the moment's own word (engine/render.js resolveMoment): the picture for "Sneak
 * Attack, used" IS the picture for Sneak Attack's dice riding a hit, and a table that authored one
 * for the card gets it on the dice with nothing to write. `hold-answered` is NOT here on purpose: a
 * cast that answers a hold (Shield) posts its own usage card, which already plays the `use` look —
 * a fallback would play it twice.
 */
export const FALLS_BACK_TO_USE = ['maneuver', 'sneak', 'fold', 'rider'];

/** every target that was hit; a moment with no verdict (a use, a save) counts every target as hit */
export const hitTargets = (moment) => (moment.targets ?? []).filter((t) => t.hit !== false);

export const wasHit = (moment, token) => (moment.targets ?? []).find((t) => t.token === token)?.hit !== false;

/** a moment as the ledger and the tools describe it: names only, nothing live */
export function describe(moment) {
  return {
    when: moment.when,
    subject: moment.subject?.name ?? null,
    keys: moment.subject?.keys ?? [],
    source: moment.source?.name ?? null,
    targets: (moment.targets ?? []).map((t) => ({ name: t.token?.name ?? null, hit: t.hit ?? null })),
    place: moment.place ? (moment.place.shapes?.[0]?.type ?? 'template') : null,
    id: moment.id ?? null,
  };
}
