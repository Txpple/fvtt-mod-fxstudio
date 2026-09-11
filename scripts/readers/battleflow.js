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

//
// THE MOMENTS (2026-09-11, the other direction). The hold tells this table NOT YET; Battle Flow's
// moment events tell it NOW, AND HERE IS WHAT. An ability used through one of Battle Flow's own
// popups posts no dnd5e card — a maneuver die rides the damage roll, Parry rides the hold's answer,
// Sneak Attack's dice write a record on a message that already exists — so the dnd5e reader never
// sees it, though the same ability used from the sheet would play. Battle Flow publishes a hook at
// the resolve, `battleflow.moment`, with a PLAIN payload (uuids and ids, never documents, never its
// flag shape), on the client that resolved the moment. This file reads that payload into a moment
// and hands it to the same dispatcher as everything else: the gates are asked, the play switch is
// honoured, the ledger keeps it. Not installed → the hook never fires → nothing here runs.
//
// The user's ruling (2026-09-11): "from the battleflow perspective, no real dependency because fx
// studio is optional. events would just fail silently … from the fx studio, it does its normal card
// processing, but should have an additional event hook to accept battleflow pushes like sneakattack."
//
// THE PAYLOAD, in Battle Flow's contract (its ARCHITECTURE §7 *The moment events*, `api.moments`):
//   { event, module, version, actorUuid, actorName, tokenUuid, itemUuid, itemName, activityUuid,
//     ability, messageId, attackId, targets: [{actorUuid, tokenUuid, name, hit?}], spend, details, at }
//   event   one of maneuver · sneak · fold · rider · hold-answered — our WHEN words, one for one
//   ⚠ VERSION 2 (2026-09-11, later): Battle Flow publishes EVERY resolve through a gate over its
//   records — seventeen words (the five above plus mastery · shield · spend · damage · effect · save ·
//   break · use · cast · volley · choice · metamagic), and `kind` (the record), `marker`, `momentId`
//   (`<messageId>|<kind>|<marker>`, unique per resolve — the dedupe key) on the payload. This reader
//   hears the five it knows and logs the rest as skips; reading more is this module's manager's call.
//
// THE SUBJECT: the item's own keys when the item resolves (feature:sneak-attack — so a look authored
// for the ability answers), then `event:<event>` last, so a look can also be keyed to the moment
// itself; with no item, the event key alone. WHEN is the event's word; a moment whose ability posts no
// card falls back to the ability's `use` look (core/moments.js FALLS_BACK_TO_USE, engine/render.js).
import { keysFor } from '../core/subjects.js';
import { WHEN } from '../core/moments.js';
import { subjectOfItem, tokenForActorUuid } from './dnd5e.js';

const MODULE = 'fvtt-mod-battleflow';
const log = (...a) => console.log('FX Studio |', ...a);

/** the token a Battle Flow target row means: its token uuid when the canvas had one, else the actor's active token */
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
 * A Battle Flow moment payload → a moment (core/moments.js), or null when the payload is not one
 * this module plays from, or {skip} with the reason. `resolve` is the live readers unless a tool
 * hands in its own (tools/check-moments.mjs proves this offline).
 */
export function readMoment(payload, resolve = LIVE) {
  if (!payload || typeof payload !== 'object' || typeof payload.event !== 'string') return null;
  if (!WHEN.includes(payload.event)) return { skip: `"${payload.event}" is not a moment kind this build knows` };
  const item = payload.itemUuid ? resolve.item(payload.itemUuid) : null;
  const subject = item ? subjectOfItem(item, { activity: null }) : { kind: 'event', name: payload.ability ?? payload.event, eventId: payload.event, keys: [] };
  if (!item) subject.keys = keysFor(subject);
  const eventKey = `event:${payload.event}`;
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
    when: payload.event, kind: 'battleflow', subject, source, targets,
    origin: item?.uuid ?? `battleflow.${payload.event}`,
    id: `${payload.messageId ?? payload.at ?? 'battleflow'}:${payload.event}`,
    activity: payload.activityUuid ?? null,
    // no Battle Flow flag is read, by contract; the payload rides for a gate or a tool that wants the plain facts
    flags: {}, event: payload,
    user: resolve.user(),
  };
}

/** register the hook; `dispatch(moment)` plays it through the same road as every other reader */
export function registerBattleflowReader({ dispatch }) {
  Hooks.on('battleflow.moment', (payload) => {
    let moment = null;
    try { moment = readMoment(payload); } catch (e) { log(`a Battle Flow moment could not be read: ${e.message}`); return; }
    if (!moment) return;
    if (moment.skip) { log(`battleflow ${payload?.event ?? '?'}: ${moment.skip}`); return; }
    dispatch(moment);
  });
}

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
