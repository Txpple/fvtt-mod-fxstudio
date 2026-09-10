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

/** the closed vocabulary of moment kinds; phase 4 adds the outcomes and the table's events */
export const WHEN = ['use', 'effect'];

/** what the sentence says for each kind */
export const WHEN_WORDS = { use: 'when used', effect: 'while the effect stands' };

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
