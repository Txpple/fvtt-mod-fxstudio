// By the Books (formerly Battle Flow), read at arm's length. Nothing is imported from it and nothing
// is required: this file is one feature detect on a module that may not be installed, and when it is
// not, the gate it makes answers "not held" to everything — which is this module's behaviour with no
// gate at all.
//
// THE RENAME (2026-10-11). Battle Flow became By the Books at its 3.0.0: the package id
// `fvtt-mod-battleflow` → `fvtt-mod-bythebooks`, the hooks `battleflow.*` → `bythebooks.*`, the flag
// scope likewise; payloads and the api's shape unchanged. A table may still run 2.x, so this file
// reads both: the api from the new id first and the legacy id when the new one is not active, the
// hook under both names, a flag under both scopes. 3.0 emits every hook under BOTH names for one
// release, so one payload arrives twice — the reader hears a momentId once (`firstHearing` below).
//
// THE HOLD, in By the Books' own words (its ARCHITECTURE and ours say the same sentences):
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
// By the Books holds a cast while its caster answers a question the area raised — Careful Spell:
// who does the spell spare? — and posts the real card on the answer (the user, 2026-09-09: "the
// animation fires early"). `holdFor` takes any subject: an activity uuid, a message id, a document
// uuid. `castHold` is the older surface, activity uuids only, and is kept as an alias for good, so
// this asks for the general one first and falls back.
//
// THE MOMENTS (2026-09-11, the other direction). The hold tells this table NOT YET; By the Books'
// moment events tell it NOW, AND HERE IS WHAT. An ability used through one of its own popups posts
// no dnd5e card — a maneuver die rides the damage roll, Parry rides the hold's answer, Sneak Attack's
// dice write a record on a message that already exists — so the dnd5e reader never sees it, though
// the same ability used from the sheet would play. By the Books publishes a hook at the resolve,
// `bythebooks.moment` (`battleflow.moment` on 2.x, and on 3.0 beside the new name), with a PLAIN
// payload (uuids and ids, never documents, never its flag shape), on the client that resolved the
// moment. This file reads that payload into a moment and hands it to the same dispatcher as
// everything else: the gates are asked, the play switch is honoured, the ledger keeps it. Not
// installed → the hook never fires → nothing here runs.
//
// The user's ruling (2026-09-11, in the module's old name): "from the battleflow perspective, no real
// dependency because fx studio is optional. events would just fail silently … from the fx studio, it
// does its normal card processing, but should have an additional event hook to accept battleflow
// pushes like sneakattack."
//
// THE PAYLOAD, in By the Books' contract (its ARCHITECTURE §7 *The moment events*, `api.moments`):
//   { event, module, version, actorUuid, actorName, tokenUuid, itemUuid, itemName, activityUuid,
//     ability, messageId, attackId, targets: [{actorUuid, tokenUuid, name, hit?}], spend, details, at }
//   event   one of maneuver · sneak · fold · rider · hold-answered — our WHEN words, one for one
//   ⚠ VERSION 2 (2026-09-11, later): every resolve is published through a gate over its records —
//   seventeen words (the five above plus mastery · shield · spend · damage · effect · save · break ·
//   use · cast · volley · choice · metamagic), and `kind` (the record), `marker`, `momentId`
//   (`<messageId>|<kind>|<marker>`, unique per resolve — the dedupe key) on the payload. This reader
//   hears the five in core/moments.js BYTHEBOOKS_WORDS and logs the rest as skips — INCLUDING `use`
//   and `effect`, which are moment kinds here but name what the dnd5e reader already plays. One
//   word is read by its RECORD (core/moments.js BYTHEBOOKS_RECORDS, 2026-10-12): `cast` on the
//   `summon` record is our `summon` — the caster as source, the token each creature landed as as a
//   target, so a picture plays where it appeared; every other `cast` (a transform) stays a skip.
//   `choice` on the `restSong` record (2026-10-21) is our `gift` — a grant given to allies landed
//   (Musician's Heroic Inspiration, Inspiring Leader's Temporary Hit Points), the giver as source and
//   each creature who received it as a target; every other `choice` stays a skip. The
//   momentId rides on the moment; engine/render.js plays a ticket once, so a word read beside a card
//   can be taken later without a second picture.
//
// THE TWIN (3.0's double emit). engine/render.js's ticket alone would keep the picture to one: both
// arrivals carry the same momentId and `firstTime` is checked synchronously at the top of `play`.
// But each arrival would still ask the hold gate, write a second "already played" ledger row and, for
// the twelve words not read, log its skip twice. So the reader hears a momentId once PER WORD: a small
// bounded set of `<momentId>|<event>`, checked before anything is read. One resolve can publish under
// two words with one momentId (Parry: `hold-answered` and `maneuver`; a failed concentration save:
// `save` and `break`), and each word is its own moment here, its own ticket (`ticket`, the same key),
// so the second word is not taken for a twin of the first. A payload with no momentId (a v1 build) is
// never a twin — no build that double-emits publishes one — and is always heard.
//
// THE PASS. By the Books publishes a resolve that came to nothing as well as one that happened: a
// held roll's reaction passed (`details.answer` "pass"), a fold offered and passed (`details.outcome`
// "passed"), a Riposte declined. The table saw nothing happen, so nothing plays: `declinedBy` reads
// the answer and the outcome and the moment is a skip with the reason.
//
// THE CONTRACT. What this file reads of the payload is `READS`, and By the Books records what it
// publishes in its own repo (contracts/moment.json, contracts/card-flags.json); tools/check-contract.mjs
// holds the one to the other from the sibling clone, so a field renamed there fails here before either
// ships. contracts/consumes.json names the versions this module last passed against.
//
// THE SUBJECT: the item's own keys when the item resolves (feature:sneak-attack — so a look authored
// for the ability answers), then `event:<event>` last, so a look can also be keyed to the moment
// itself; with no item, the event key alone. WHEN is the event's word (or the record's, for `summon`
// and `gift`, keyed `event:summon` and `event:gift`); a moment whose ability posts no card falls back to the ability's `use` look
// (core/moments.js FALLS_BACK_TO_USE, engine/render.js).
import { keysFor } from '../core/subjects.js';
import { BYTHEBOOKS_RECORDS, BYTHEBOOKS_WORDS } from '../core/moments.js';
import { subjectOfItem, tokenForActorUuid } from './dnd5e.js';

/** the package id, and the one it had as Battle Flow (2.x) — read when the new one is not active */
const MODULE = 'fvtt-mod-bythebooks';
const LEGACY = 'fvtt-mod-battleflow';
const log = (...a) => console.log('FX Studio |', ...a);

/** the token a By the Books target row means: its token uuid when the canvas had one, else the actor's active token */
function tokenOfRow(row, resolve) {
  const byToken = row?.tokenUuid ? resolve.token(row.tokenUuid) : null;
  return byToken ?? (row?.actorUuid ? resolve.actor(row.actorUuid) : null);
}

/** the live readers: a token by its document uuid, the first active token of an actor, an item by uuid */
const LIVE = {
  token: (uuid) => { const d = fromUuidSync(uuid); return d?.object ?? (d?.documentName === 'Token' ? d.object : null) ?? null; },
  actor: (uuid) => tokenForActorUuid(uuid),
  item: (uuid) => { const d = fromUuidSync(uuid); return d?.documentName === 'Item' ? d : null; },
  user: () => game.user.id,
};

/**
 * What this reader touches of a By the Books payload: the envelope's fields, the `details` fields it
 * reads on the words it plays, and the one card flag the gate reads. tools/check-contract.mjs holds
 * each to By the Books' contract and holds this list to the code below.
 */
export const READS = Object.freeze({
  envelope: ['event', 'kind', 'marker', 'momentId', 'messageId', 'at', 'actorUuid', 'tokenUuid', 'itemUuid', 'activityUuid', 'ability',
    'targets', 'targets[].actorUuid', 'targets[].tokenUuid', 'targets[].hit'],
  details: ['details.answer', 'details.outcome', 'details.companion'],
  flags: { metamagic: ['chosen'] },
});

/** the answers and outcomes By the Books publishes for a resolve that came to nothing: a pass, a decline, an offer withdrawn */
export const DECLINED = Object.freeze({
  answer: ['pass', 'no', 'keep', 'skip', 'decline', 'declined'],
  outcome: ['passed', 'passed (timer)', 'no longer needed', 'gone', 'timed out'],
});

/** why a payload is a resolve that came to nothing, or null when something happened */
export function declinedBy(payload) {
  const answer = payload?.details?.answer;
  if (typeof answer === 'string' && DECLINED.answer.includes(answer)) return `answer "${answer}"`;
  const outcome = payload?.details?.outcome;
  if (typeof outcome === 'string' && DECLINED.outcome.includes(outcome)) return `outcome "${outcome}"`;
  return null;
}

/**
 * A By the Books moment payload → a moment (core/moments.js), or null when the payload is not one
 * this module plays from, or {skip} with the reason. `resolve` is the live readers unless a tool
 * hands in its own (tools/check-moments.mjs proves this offline).
 */
export function readMoment(payload, resolve = LIVE) {
  if (!payload || typeof payload !== 'object' || typeof payload.event !== 'string') return null;
  const read = BYTHEBOOKS_RECORDS[`${payload.event}|${payload.kind}`] ?? (BYTHEBOOKS_WORDS.includes(payload.event) ? payload.event : null);
  // a companion's beat on the summon record: leaving (into its pocket, dismissed) is `unsummon`, coming back `summon`
  const word = (read === 'summon' && payload.details?.companion === 'leave') ? 'unsummon' : read;
  if (!word) return { skip: `"${payload.event}" is not a By the Books word this build reads` };
  const declined = declinedBy(payload);
  if (declined) return { skip: `a resolve that came to nothing (${declined}): nothing to play` };
  const item = payload.itemUuid ? resolve.item(payload.itemUuid) : null;
  const subject = item ? subjectOfItem(item, { activity: null }) : { kind: 'event', name: payload.ability ?? word, eventId: word, keys: [] };
  if (!item) subject.keys = keysFor(subject);
  const eventKey = `event:${word}`;
  if (!subject.keys.includes(eventKey)) subject.keys = [...subject.keys, eventKey];
  const source = tokenOfRow({ tokenUuid: payload.tokenUuid, actorUuid: payload.actorUuid }, resolve);
  if (!source) return { skip: 'no token for the one who resolved it' };
  const targets = [];
  for (const row of payload.targets ?? []) {
    const token = tokenOfRow(row, resolve);
    if (!token) continue;
    const entry = { token };
    if (typeof row.hit === 'boolean') entry.hit = row.hit;
    targets.push(entry);
  }
  return {
    when: word, kind: 'bythebooks', subject, source, targets,
    origin: item?.uuid ?? `bythebooks.${word}`,
    // a record's later beats (a companion's) each keep their own ledger row: the marker names the beat
    id: `${payload.messageId ?? payload.at ?? 'bythebooks'}:${word}${payload.marker && payload.marker !== 'message' ? `:${payload.marker}` : ''}`,
    activity: payload.activityUuid ?? null,
    momentId: typeof payload.momentId === 'string' ? payload.momentId : null,
    // one resolve may publish under two words with one momentId: each word plays once (engine/render.js's ticket)
    ticket: wordTicket(payload),
    // no By the Books flag is read, by contract; the payload rides as `event` for a gate or a tool that wants the plain facts
    use: payload.messageId ?? null, type: 'bythebooks', data: null, document: null, event: payload,
    user: resolve.user(),
  };
}

/** a resolve's word, `<momentId>|<event>`: the key a twin and a ticket are judged by; null for a payload with no momentId (a v1 build) */
export const wordTicket = (payload) => (typeof payload?.momentId === 'string' ? `${payload.momentId}|${payload.event}` : null);

const HEARD_MAX = 500;
const heard = new Set();
/** true the first time a resolve's word arrives, false for its twin under the other hook name; no momentId → always true */
export function firstHearing(payload) {
  const id = wordTicket(payload);
  if (!id) return true;
  if (heard.has(id)) return false;
  heard.add(id);
  if (heard.size > HEARD_MAX) heard.delete(heard.values().next().value);
  return true;
}

/** register the hook under both names; `dispatch(moment)` plays it through the same road as every other reader */
export function registerBythebooksReader({ dispatch }) {
  const hear = (payload) => {
    if (!firstHearing(payload)) return;
    let moment = null;
    try { moment = readMoment(payload); } catch (e) { log(`a By the Books moment could not be read: ${e.message}`); return; }
    if (!moment) return;
    if (moment.skip) { log(`bythebooks ${payload?.event ?? '?'}: ${moment.skip}`); return; }
    dispatch(moment);
  };
  // The moment hook under both names: 3.0 fires both for one release, 2.x only the old one. Two
  // literal registrations, so the suite's integration map (which reads literals) sees the contract.
  Hooks.on('bythebooks.moment', hear);
  Hooks.on('battleflow.moment', hear);
}

/** the subject a moment is held by: the activity it came from, else the document it is */
export const subjectOf = (moment) => moment?.activity || moment?.id || null;

/** the api of whichever build is active: By the Books first, Battle Flow (2.x) when it is not — one lookup each, no more */
function activeApi() {
  const mod = game.modules.get(MODULE);
  if (mod?.active) return mod.api ?? null;
  const legacy = game.modules.get(LEGACY);
  return legacy?.active ? legacy.api ?? null : null;
}

/**
 * A gate (core/gates.js) that asks By the Books (or Battle Flow 2.x) whether this moment is held.
 * Not installed, disabled, or an older build without the surface → null, every time.
 */
export function bythebooksGate(moment) {
  const api = activeApi();
  if (!api) return null;
  // The card that LIFTS a hold must not wait on it: its createChatMessage hook runs INSIDE the
  // create that releases the hold, so it can see its own hold still open. Current builds close the
  // hold before the create; this is the belt for older ones, which write the old flag scope.
  const flags = moment.document?.flags;
  if (flags?.[MODULE]?.metamagic?.chosen || flags?.[LEGACY]?.metamagic?.chosen) return null;
  const subject = subjectOf(moment);
  if (!subject) return null;
  // Pick the surface, then ask ONCE: `holdFor` answers null meaningfully ("nothing is holding"), so
  // a ?? chain would ask the older surface again on every un-held moment and read as if null were
  // no answer. `holdFor` is the general one; `castHold` is what older builds have.
  const ask = api.holdFor ?? api.castHold;
  return typeof ask === 'function' ? ask.call(api, subject) ?? null : null;
}
