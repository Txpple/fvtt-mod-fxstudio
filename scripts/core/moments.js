// A MOMENT is what happened at the table, as plain data every reader produces the same way
// (ARCHITECTURE §2). Pure: no Foundry here.
//
//   { when, kind, subject, source, targets: [{token, hit?, actor?, ac?, name?}], place?, destination?, tie?,
//     origin, id, activity, use, type, data, document, user }
//
//   when         one of WHEN — the kind of moment an FX can answer ("on")
//   kind         what the reader read: attack | damage | use | template | effect | bythebooks | preview
//   subject      what acted, with its identity keys (core/subjects.js): {keys, name, kind, ...}
//   source       the acting token (a Token placeable at the table; a plain stand-in in the tools)
//   targets      the targeted tokens — dnd5e's own target record kept whole (the actor uuid, the
//                armour class dnd5e read, the name) with `hit` when the moment knows it (an attack
//                does: dnd5e's verdict, an unreadable AC a miss)
//   place        a placed template (a Region document), or absent
//   destination  a point {x, y} a move already knows (a suite, a preview), or absent: the move asks
//   tie          the document persistent pictures live and die with (an active effect, a Region)
//   origin       the uuid Sequencer effects are stamped with (the item's, the effect's)
//   id           the message or document id (the ledger keys on it)
//   activity     the dnd5e activity uuid the moment came from, or null (what a GATE asks by)
//   use          the id of the usage card this moment belongs to (a roll card chains to it, a usage
//                card is its own, an effect names the card that applied it), or null: one cast's
//                moments know each other by it
//   type         the document's own type: a card's (attack | damage | healing | usage), an effect's
//                (base | condition | enchantment), `region` for a template, `bythebooks`, `preview`
//   data         what the document says, whole: a card's system data, a template's dnd5e flags, an
//                effect's system data (phase 4's words read their outcomes here; nothing structural)
//   document     the live document the moment was read from (a gate may read another module's
//                flag off it), or null
//   event        a By the Books moment only: the plain payload it came from

// A moment may also be HELD: another module can ask this table to wait until an answer is known
// (core/gates.js). That is the timing policy's other half and nothing here needs to know about it —
// a moment is the same record held or not.

/**
 * The closed vocabulary of moment kinds; phase 4 adds the outcomes and the table's events. The six
 * after `effect` are BY THE BOOKS' MOMENTS (readers/bythebooks.js; 2026-09-11, as Battle Flow): the
 * resolves that exist only in its rules and post no card of their own — a maneuver die riding a hit or answering
 * a hold, Sneak Attack's dice, a die folded into a d20 test, a clock rider's damage, a held roll
 * answered by a cast, a summoned creature appearing. The first five are By the Books' contract words
 * (`api.moments.events`), one for one; `summon` (2026-10-12) is ours: its `cast` word on its `summon`
 * record (the reader names it), since a `cast` alone also means a transform and others; `unsummon`
 * (2026-10-12) is the same record's companion beat with `details.companion: "leave"` — a familiar
 * going into its pocket or dismissed (a companion called back is `summon` again).
 */
export const WHEN = ['use', 'effect', 'maneuver', 'sneak', 'fold', 'rider', 'hold-answered', 'summon', 'unsummon'];

/**
 * The By the Books words this build READS (readers/bythebooks.js) — a closed list of its own, not
 * WHEN. Its contract v2 (2026-09-11) publishes seventeen words, and two of the rest, `use`
 * and `effect`, are also moment kinds here: they name the card and the effect the dnd5e reader
 * already plays from, so hearing them off the hook would play the same picture twice (the effect
 * receipt lands a beat after the effect is created; a revert would land it a third time). A word is
 * added here only with a reader that knows what the table should see for it.
 */
export const BYTHEBOOKS_WORDS = ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered'];

/**
 * By the Books RECORDS this build reads under a word it otherwise skips: `<event>|<kind>` → our WHEN
 * word. `cast` on the `summon` record (2026-10-12) is a creature By the Books created where the caster
 * placed it; any other `cast` (a transform, a plain cast) stays a skip.
 */
export const BYTHEBOOKS_RECORDS = { 'cast|summon': 'summon' };

/** what the sentence says for each kind */
export const WHEN_WORDS = {
  use: 'when used',
  effect: 'while the effect stands',
  maneuver: 'when its maneuver die rides',
  sneak: 'when Sneak Attack rides',
  fold: 'when its die folds into a roll',
  rider: 'when its damage rides a hit',
  'hold-answered': 'when it answers a held roll',
  summon: 'when its creature appears',
  unsummon: 'when its creature leaves',
};

/**
 * A By the Books moment whose ability never posts a card falls back to the ability's `use` look when
 * no look names the moment's own word (engine/render.js resolveMoment): the picture for "Sneak
 * Attack, used" IS the picture for Sneak Attack's dice riding a hit, and a table that authored one
 * for the card gets it on the dice with nothing to write. `hold-answered` is NOT here on purpose: a
 * cast that answers a hold (Shield) posts its own usage card, which already plays the `use` look —
 * a fallback would play it twice. Nor is `summon`, for the same reason: the summoning spell's usage card
 * already played its `use` look at the cast, and the creature appearing is a second picture or none.
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
