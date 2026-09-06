// The dnd5e reader: what happened at the table → a MOMENT (core/moments.js) with a SUBJECT keyed
// by identity (core/subjects.js). Moments come from the messages dnd5e posts (their flags carry the
// activity, the item, the targets and, on an attack, each target's armour class, so hit or miss is
// known when the picture plays), from a placed template (a Region created with the activity as its
// origin), and from active effects created, toggled or deleted.
//
// THE TIMING POLICY, written once: a `use` fires as late as the answer is known and no later —
//   an attack            on the attack roll (hit and miss known per target)
//   a save or a heal     on the damage roll (the targets known; a heal's roll is flagged "healing")
//   an area              on the template placement (the Region drawn)
//   everything else      on the usage card
// This is what Automated Animations did on this world by accident of its hooks; here it is one
// table. Battle Flow's verdict hook can replace "on the attack roll" in phase 4 without any look changing.
//
// WHO PLAYS. One client plays and Sequencer carries the picture to every other client: the
// message's author for a message, the user who placed the template or created the effect otherwise;
// the first active GM when the author is not connected.
import { keysFor, subjectOfItemData } from '../core/subjects.js';

const log = (...a) => console.log('FX Studio |', ...a);

/** the token a dnd5e target descriptor points at (its uuid is the ACTOR's) */
export function tokenForActorUuid(uuid) {
  const actor = uuid ? fromUuidSync(uuid) : null;
  if (!actor) return null;
  if (actor.isToken) return actor.token?.object ?? null;
  return actor.getActiveTokens?.()[0] ?? null;
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

/** the subject an item is, with the activity that acted (and the spell a cast activity links, the ammunition an attack fired) */
export function subjectOfItem(item, { activity = null, ammunition = null } = {}) {
  if (!item) return null;
  let spell = null;
  if (activity?.type === 'cast') {
    const linked = activity.spell?.uuid ? fromUuidSync(activity.spell.uuid) : null;
    if (linked) spell = { name: linked.name, identifier: linked.system?.identifier || null };
  }
  const s = subjectOfItemData({
    name: item.name,
    type: item.type,
    system: { identifier: item.system?.identifier, type: item.system?.type ? { value: item.system.type.value, baseItem: item.system.type.baseItem } : undefined },
    activityType: activity?.type ?? null,
    spell,
    ammunition: ammunition ? subjectOfItem(ammunition) : null,
  });
  s.reach = !!item.system?.properties?.has?.('rch');
  s.uuid = item.uuid;
  // one specific item's own look (the item pointer, set from the screens): its id, ahead of every key
  const pointer = item.flags?.['fvtt-mod-fxstudio']?.look;
  if (typeof pointer === 'string' && pointer) s.pointer = pointer;
  return s;
}

/** the subject an active effect is: its own name, then what made it */
export function subjectOfEffect(effect) {
  const originDoc = effect.origin ? fromUuidSync(effect.origin) : null;
  const originItem = originDoc?.documentName === 'Item' ? originDoc : originDoc?.item ?? null;
  const s = { kind: 'effect', name: effect.name, origin: originItem ? subjectOfItem(originItem) : null };
  s.keys = keysFor(s);
  s.uuid = effect.uuid;
  return s;
}

/**
 * A dnd5e message → a moment, or null when the message is not one this module plays from, or
 * {skip} with the reason when it is one but should not play.
 */
export function readMessage(message) {
  const f = message.flags?.dnd5e;
  if (!f?.activity?.uuid || !f.item?.uuid) return null;
  const rollType = f.roll?.type ?? null;
  let kind;
  if (rollType === 'attack') kind = 'attack';
  else if (rollType === 'damage' || rollType === 'healing') kind = 'damage'; // dnd5e flags a heal's roll "healing"; it is the same moment
  else if (!rollType && message.type === 'usage') kind = 'use';
  else return null;

  const activity = fromUuidSync(f.activity.uuid);
  const item = activity?.item ?? fromUuidSync(f.item.uuid);
  if (!item) return { skip: 'the item is gone' };
  if (hasAreaTemplate(activity)) return { skip: 'plays on the template' };
  if (kind === 'damage' && activity?.type === 'attack') return { skip: 'an attack plays on its attack roll' };
  if (kind === 'use' && (activity?.damage?.parts?.length || activity?.type === 'heal')) return { skip: 'plays on the damage roll' };

  const source = speakerToken(message);
  if (!source) return { skip: 'no token for the speaker' };
  const descriptors = f.targets ?? [];
  const roll = message.rolls?.[0];
  const targets = [];
  for (const t of descriptors) {
    const token = tokenForActorUuid(t.uuid);
    if (!token) continue;
    const entry = { token };
    // dnd5e's own verdict: a miss is a non-critical roll under the AC, or a fumble
    if (kind === 'attack') entry.hit = roll ? !(!roll.isCritical && (roll.total < t.ac || roll.isFumble)) : true;
    targets.push(entry);
  }
  const ammunition = kind === 'attack' && f.roll?.ammunition ? source.actor?.items?.get(f.roll.ammunition) ?? null : null;
  const subject = subjectOfItem(item, { activity, ammunition });
  return { when: 'use', kind, subject, source, targets, origin: item.uuid, id: message.id, user: message.author?.id ?? null };
}

/** a placed template (a Region with a dnd5e origin) → a moment */
export function readRegion(region) {
  const originUuid = region.flags?.dnd5e?.origin;
  if (!originUuid) return null;
  const activity = fromUuidSync(originUuid);
  const item = activity?.item;
  if (!item) return { skip: 'the template names no item' };
  const actor = item.actor ?? item.parent;
  const source = actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
  const targets = Array.from(game.user.targets).map((token) => ({ token }));
  return { when: 'use', kind: 'template', subject: subjectOfItem(item, { activity }), source, targets, place: region, tie: region, origin: item.uuid, id: region.id, user: game.user.id };
}

/** an active effect created or switched on → a moment */
export function readEffect(effect) {
  const actor = effect.parent instanceof Item ? effect.parent.actor : effect.parent;
  if (!actor) return null;
  const token = actor.token?.object ?? actor.getActiveTokens?.()[0] ?? null;
  if (!token) return { skip: 'no token for the effect' };
  return { when: 'effect', kind: 'effect', subject: subjectOfEffect(effect), source: token, targets: [{ token }], tie: effect, origin: effect.uuid, id: effect.id, user: game.user.id };
}

/** register the hooks; `dispatch(moment)` plays it, `end(origin, token)` ends standing pictures */
export function registerReader({ dispatch, end }) {
  const handle = (moment, what) => {
    if (!moment) return;
    if (moment.skip) { log(`${what}: ${moment.skip}`); return; }
    dispatch(moment);
  };
  Hooks.on('createChatMessage', (message) => {
    if (!electedFor(message)) return;
    handle(readMessage(message), `message ${message.id}`);
  });
  Hooks.on('createRegion', async (region, options, userId) => {
    if (userId !== game.user.id) return;
    const moment = readRegion(region);
    if (!moment || moment.skip) { if (moment?.skip) log(`template ${region.id}: ${moment.skip}`); return; }
    // half a second for the Region to be drawn before a picture is sized to it
    await new Promise((r) => setTimeout(r, 500));
    handle(moment, `template ${region.id}`);
  });
  Hooks.on('createActiveEffect', (effect, options, userId) => {
    if (userId !== game.user.id || effect.disabled) return;
    handle(readEffect(effect), `effect ${effect.name}`);
  });
  Hooks.on('updateActiveEffect', (effect, changes, options, userId) => {
    if (userId !== game.user.id || changes.disabled === undefined) return;
    if (changes.disabled === true) {
      const actor = effect.parent instanceof Item ? effect.parent.actor : effect.parent;
      const token = actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
      if (token) end(effect.uuid, token);
    } else handle(readEffect(effect), `effect ${effect.name}`);
  });
}
