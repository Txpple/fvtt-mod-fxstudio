// The reader: turns what happened at the table into a plain MOMENT and hands it to the dispatcher.
// Standard moments come from the messages dnd5e posts (their flags carry the activity, the item,
// the targets and, on an attack, each target's armour class, so the hit or miss is known when the
// picture plays); a placed template is a Region created with the activity as its origin; an
// active effect is a document created, toggled or deleted.
//
// A MOMENT
//   kind         'attack' | 'damage' | 'use' | 'template' | 'effect'
//   on           the corpus question: 'use' | 'template' | 'effect'
//   names        the names to look up, in order (an ammunition's first, then the item's)
//   item         the item (or the effect) that acted
//   activity     the dnd5e activity, when there is one
//   sourceToken  the token that acted (a Token placeable)
//   targets      the targeted tokens (Token placeables)
//   hits         a Set of token ids that were hit, or null when every target counts as hit
//   template     the placed Region document, for a template moment
//   origin       the uuid Sequencer effects are stamped with (the item's, the effect's)
//   tieTo        a document persistent effects are tied to (the active effect), or undefined
//   id           the message or document id
//
// WHO PLAYS. One client plays and Sequencer carries the picture to every other client, as it
// always did under Automated Animations: the message's author for a message, the user who placed
// the template or created the effect otherwise. When the author is not connected (a message made
// on their behalf), the first active GM plays instead.
import { play } from './play.js';

const log = (...a) => console.log('FX Studio |', ...a);

/** the token a dnd5e target descriptor points at (its uuid is the ACTOR's) */
export function tokenForActorUuid(uuid) {
  const actor = uuid ? fromUuidSync(uuid) : null;
  if (!actor) return null;
  if (actor.isToken) return actor.token?.object ?? null;
  const tokens = actor.getActiveTokens?.() ?? [];
  return tokens[0] ?? null;
}

/** the token that speaks for a message */
export function speakerToken(message) {
  const sp = message.speaker ?? {};
  const byId = sp.token ? canvas?.tokens?.get(sp.token) : null;
  if (byId) return byId;
  const actor = ChatMessage.getSpeakerActor?.(sp) ?? (sp.actor ? game.actors.get(sp.actor) : null);
  return actor?.getActiveTokens?.()[0] ?? null;
}

const hasAreaTemplate = (activity) => Object.keys(CONFIG.DND5E?.areaTargetTypes ?? {}).includes(activity?.target?.template?.type);

/** am I the client that plays this message? */
export function electedFor(message) {
  const author = message.author ?? message.user;
  if (author?.active) return author.id === game.user.id;
  const gm = game.users.filter((u) => u.active && u.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
  return gm?.id === game.user.id;
}

/**
 * A dnd5e message → a moment, or null when the message is not one this module plays from. Mirrors
 * what Automated Animations played on this world (attacks on the attack roll, spells with damage on
 * the damage roll, the rest on use; anything with an area template on the template instead).
 */
export function readMessage(message) {
  const f = message.flags?.dnd5e;
  if (!f?.activity?.uuid || !f.item?.uuid) return null;
  const rollType = f.roll?.type ?? null;
  let kind;
  if (rollType === 'attack') kind = 'attack';
  else if (rollType === 'damage') kind = 'damage';
  else if (!rollType && message.type === 'usage') kind = 'use';
  else return null;

  const activity = fromUuidSync(f.activity.uuid);
  const item = activity?.item ?? fromUuidSync(f.item.uuid);
  if (!item) return { skip: 'the item is gone' };
  if (hasAreaTemplate(activity)) return { skip: 'plays on the template' };
  if (kind === 'damage' && activity?.type === 'attack') return { skip: 'an attack plays on its attack roll' };
  if (kind === 'use' && (activity?.damage?.parts?.length || activity?.type === 'heal')) return { skip: 'plays on the damage roll' };

  const sourceToken = speakerToken(message);
  if (!sourceToken) return { skip: 'no token for the speaker' };
  const descriptors = f.targets ?? [];
  const targets = descriptors.map((t) => tokenForActorUuid(t.uuid)).filter(Boolean);
  let hits = null;
  if (kind === 'attack') {
    const roll = message.rolls?.[0];
    hits = new Set();
    for (const t of descriptors) {
      const token = tokenForActorUuid(t.uuid);
      if (!token) continue;
      // dnd5e's own verdict: a miss is a non-critical roll under the AC, or a fumble
      const isMiss = roll ? !roll.isCritical && (roll.total < t.ac || roll.isFumble) : false;
      if (!isMiss) hits.add(token.id);
    }
  }
  const names = [];
  if (kind === 'attack' && f.roll?.ammunition) {
    const ammo = sourceToken.actor?.items?.get(f.roll.ammunition);
    if (ammo?.name) names.push(ammo.name);
  }
  names.push(item.name);
  return { kind, on: 'use', names, item, activity, sourceToken, targets, hits, origin: item.uuid, id: message.id };
}

/** a placed template (a Region with a dnd5e origin) → a moment */
export function readRegion(region) {
  const originUuid = region.flags?.dnd5e?.origin;
  if (!originUuid) return null;
  const activity = fromUuidSync(originUuid);
  const item = activity?.item;
  if (!item) return { skip: 'the template names no item' };
  const actor = item.actor ?? item.parent;
  const sourceToken = actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
  const targets = Array.from(game.user.targets);
  return { kind: 'template', on: 'template', names: [item.name], item, activity, sourceToken, targets, hits: null, template: region, origin: item.uuid, id: region.id };
}

/** an active effect created or switched on → a moment */
export function readEffect(effect) {
  const actor = effect.parent instanceof Item ? effect.parent.actor : effect.parent;
  if (!actor) return null;
  const token = actor.token?.object ?? actor.getActiveTokens?.()[0] ?? null;
  if (!token) return { skip: 'no token for the effect' };
  return { kind: 'effect', on: 'effect', names: [effect.name], item: effect, activity: null, sourceToken: token, targets: [token], hits: null, origin: effect.uuid, tieTo: effect, id: effect.id };
}

function dispatch(getIndex, moment, what) {
  if (!moment) return;
  if (moment.skip) { log(`${what}: ${moment.skip}`); return; }
  play(getIndex(), moment).catch((e) => console.error('FX Studio |', e));
}

/** register the hooks; `getIndex` returns the live corpus index */
export function registerReader(getIndex) {
  Hooks.on('createChatMessage', (message) => {
    if (!electedFor(message)) return;
    dispatch(getIndex, readMessage(message), `message ${message.id}`);
  });
  Hooks.on('createRegion', async (region, options, userId) => {
    if (userId !== game.user.id) return;
    const moment = readRegion(region);
    if (!moment || moment.skip) { if (moment?.skip) log(`template ${region.id}: ${moment.skip}`); return; }
    // AA waited half a second for the template to be drawn before playing on it
    await new Promise((r) => setTimeout(r, 500));
    dispatch(getIndex, moment, `template ${region.id}`);
  });
  Hooks.on('createActiveEffect', (effect, options, userId) => {
    if (userId !== game.user.id || effect.disabled) return;
    dispatch(getIndex, readEffect(effect), `effect ${effect.name}`);
  });
  Hooks.on('updateActiveEffect', (effect, changes, options, userId) => {
    if (userId !== game.user.id || changes.disabled === undefined) return;
    if (changes.disabled === true) endEffectsOf(effect);
    else dispatch(getIndex, readEffect(effect), `effect ${effect.name}`);
  });
}

/** end the Sequencer effects a switched-off active effect stood for (deletion is handled by tieToDocuments) */
export function endEffectsOf(effect) {
  const actor = effect.parent instanceof Item ? effect.parent.actor : effect.parent;
  const token = actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
  if (!token) return;
  Sequencer.EffectManager.endEffects({ origin: effect.uuid, object: token });
}
