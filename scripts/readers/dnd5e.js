// The dnd5e reader: what happened at the table → a MOMENT (core/moments.js) with a SUBJECT keyed
// by identity (core/subjects.js). Moments come from the cards dnd5e posts (dnd5e 6.0: a card is a
// typed ChatMessage — `attack`, `damage`, `healing`, `usage` — whose `system` data carries the
// activity, the item, the targets with each one's token and armour class, and on an attack
// dnd5e's own verdict per target, so hit or miss is known when the picture plays), from a placed
// template (the Region dnd5e creates, stamped with the activity, the item and the usage token),
// and from active effects created, toggled or deleted. dnd5e 6.0 and later only (the pin in
// module.json); nothing here reads a flag of dnd5e's on a message.
//
// THE TIMING POLICY, written once: a `use` fires as late as the answer is known and no later —
//   an attack            on the attack card (hit and miss known per target)
//   a save or a heal     on the damage or healing card (the targets known)
//   an area              on the template placement (the Region drawn)
//   everything else      on the usage card
//   a moment another module HOLDS      when the hold lifts (core/gates.js, readers/battleflow.js)
// This is what Automated Animations did on this world by accident of its hooks; here it is one
// table. Battle Flow's verdict hook can replace "on the attack card" in phase 4 without any FX changing.
//
// Every moment carries the card it was read from — `type` and `data` (a card's system data, a
// template's dnd5e flags, an effect's system data) and `document` (the live document) — beside
// what a gate asks by: `activity` (the activity uuid the moment came from, when it has one) and
// `id`. The reader never asks a gate itself — the dispatcher does, once per moment.
//
// WHO PLAYS. One client plays and Sequencer carries the picture to every other client: the
// card's author for a card, the user who placed the template or created the effect otherwise;
// the first active GM when the author is not connected.
import { keysFor, subjectOfItemData } from '../core/subjects.js';

const log = (...a) => console.log('FX Studio |', ...a);

/**
 * A document by uuid, synchronously, or null — never a throw. Foundry refuses to read an EMBEDDED
 * document still inside a compendium (an item's activity or effect in a pack) synchronously; here a
 * refusal is null, and the moment is read without it.
 */
export function lookup(uuid, relative = undefined) {
  if (!uuid || typeof uuid !== 'string') return null;
  try { return fromUuidSync(uuid, { relative, strict: false }) ?? null; } catch { return null; }
}

/** the token a dnd5e actor uuid means: a synthetic actor's own token, else the actor's first active token */
export function tokenForActorUuid(uuid) {
  const actor = lookup(uuid);
  if (!actor || actor.documentName !== 'Actor') return null;
  if (actor.isToken) return actor.token?.object ?? null;
  return actor.getActiveTokens?.()[0] ?? null;
}

/** the token a uuid names outright (a Token document's placeable), else the token its actor has */
export function tokenFor(uuid) {
  const doc = lookup(uuid);
  if (doc?.documentName === 'Token') return doc.object ?? null;
  return tokenForActorUuid(uuid);
}

/** the token a dnd5e target descriptor means: its own token when dnd5e recorded one, else its actor's */
export const tokenOfTarget = (t) => (t?.token ? tokenFor(t.token) : null) ?? (t?.actor ? tokenForActorUuid(t.actor) : null);

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
    const linked = lookup(activity.spell?.uuid);
    if (linked) spell = { name: linked.name, identifier: linked.system?.identifier || null };
  }
  const s = subjectOfItemData({
    name: item.name,
    type: item.type,
    system: { identifier: item.system?.identifier, type: item.system?.type ? { value: item.system.type.value } : undefined },
    spell,
    ammunition: ammunition ? subjectOfItem(ammunition) : null,
  });
  s.reach = !!item.system?.properties?.has?.('rch');
  s.uuid = item.uuid;
  return s;
}

/**
 * The item that made an effect, read synchronously, or null. dnd5e 6.0 keeps an effect's provenance
 * in `system.origin` by kind — {item, activity, effect, behavior, actor, message, profile} — and
 * derives the legacy `origin` string from it (the most specific one, which for an applied effect is
 * the ACTIVITY's uuid). Read by kind, most direct first: the item; the activity's item; the effect
 * it rides (a rider applied through a concentration effect names only that, and the parent effect
 * sits on the item, or names its own origin); the region behaviour that applied it (the region is
 * stamped with the activity). Every lookup is non-strict and caught: a compendium-embedded
 * activity (a class feature's, still in a pack) is no origin, never a throw.
 */
function originItemOf(effect, depth = 0) {
  const o = effect?.system?.origin ?? {};
  const rel = effect?.parent ?? undefined;
  const item = lookup(o.item, rel);
  if (item?.documentName === 'Item') return item;
  const activity = lookup(o.activity, rel);
  if (activity?.item) return activity.item;
  const parentEffect = lookup(o.effect, rel);
  if (parentEffect && parentEffect !== effect && parentEffect.documentName === 'ActiveEffect' && depth < 2) {
    if (parentEffect.parent?.documentName === 'Item') return parentEffect.parent;
    const up = originItemOf(parentEffect, depth + 1);
    if (up) return up;
  }
  const behavior = lookup(o.behavior);
  const viaRegion = lookup(behavior?.parent?.flags?.dnd5e?.activity);
  if (viaRegion?.item) return viaRegion.item;
  return null;
}

/** the subject an active effect is: its own name, then what made it */
export function subjectOfEffect(effect) {
  const originItem = originItemOf(effect);
  const s = { kind: 'effect', name: effect.name, origin: originItem ? subjectOfItem(originItem) : null };
  s.keys = keysFor(s);
  s.uuid = effect.uuid;
  return s;
}

/** the id of the usage card a roll card chains to (`system.origin`, a document link; the raw id survives in the source) */
export function usageIdOf(message) {
  const raw = message._source?.system?.origin ?? message.system?.origin ?? null;
  if (typeof raw === 'string') return raw || null;
  return raw?.id ?? null;
}

/** the message id under a `ChatMessage.<id>` uuid, or null */
const messageIdOf = (uuid) => (typeof uuid === 'string' && uuid.startsWith('ChatMessage.') ? uuid.slice('ChatMessage.'.length) : null);

/** which cards are moments here, and what kind of moment each is (a heal is its own card type in 6.0; it is the same moment) */
const CARD_KIND = { attack: 'attack', damage: 'damage', healing: 'damage', usage: 'use' };

/**
 * A dnd5e card → a moment, or null when the message is not one this module plays from, or
 * {skip} with the reason when it is one but should not play.
 */
export function readMessage(message) {
  const kind = CARD_KIND[message.type] ?? null;
  const sys = message.system;
  if (!kind || !sys?.activity?.uuid || !sys?.item?.uuid) return null;

  const activity = lookup(sys.activity.uuid);
  const item = activity?.item ?? lookup(sys.item.uuid);
  if (!item) return { skip: 'the item is gone' };
  if (hasAreaTemplate(activity)) return { skip: 'plays on the template' };
  if (kind === 'damage' && activity?.type === 'attack') return { skip: 'an attack plays on its attack card' };
  if (kind === 'use' && (activity?.damage?.parts?.length || activity?.type === 'heal')) return { skip: 'plays on the damage card' };

  const source = speakerToken(message);
  if (!source) return { skip: 'no token for the speaker' };
  // dnd5e's own verdict: an attack card evaluates its targets against the roll (a miss is a
  // non-critical roll under the AC, a fumble, or an AC that could not be read — total cover);
  // with no d20 on the card there is no verdict and every target counts as hit
  const evaluated = kind === 'attack' ? sys.evaluatedTargets ?? [] : [];
  const rows = evaluated.length ? evaluated : sys.targets ?? [];
  const targets = [];
  for (const t of rows) {
    const token = tokenOfTarget(t);
    if (!token) continue;
    const entry = { token, actor: t.actor ?? null, ac: t.ac ?? null, name: t.name ?? token.name ?? null };
    if (kind === 'attack') entry.hit = evaluated.length ? !t.isMiss : true;
    targets.push(entry);
  }
  const ammunition = kind === 'attack' ? sys.ammunitionItem ?? (sys.ammunition ? source.actor?.items?.get(sys.ammunition) ?? null : null) : null;
  const subject = subjectOfItem(item, { activity, ammunition });
  const use = usageIdOf(message) ?? (message.type === 'usage' ? message.id : null);
  return { when: 'use', kind, subject, source, targets, origin: item.uuid, id: message.id, activity: sys.activity.uuid, use, type: message.type, data: sys, document: message, user: message.author?.id ?? null };
}

/**
 * A placed template → a moment. dnd5e 6.0 places an area as a Region stamped `flags.dnd5e.activity`
 * (the activity), `.item`, `.origin` (the USAGE TOKEN's uuid — the caster's token as dnd5e saw it),
 * `.spellLevel` and `.dimensions`.
 */
export function readRegion(region) {
  const f = region.flags?.dnd5e;
  if (!f?.activity) return null;
  const activity = lookup(f.activity);
  const item = activity?.item ?? lookup(f.item);
  if (!item) return { skip: 'the template names no item' };
  const actor = item.actor ?? item.parent;
  const source = tokenFor(f.origin) ?? actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
  const targets = Array.from(game.user.targets).map((token) => ({ token }));
  return { when: 'use', kind: 'template', subject: subjectOfItem(item, { activity }), source, targets, place: region, tie: region, origin: item.uuid, id: region.id, activity: f.activity, use: null, type: 'region', data: f, document: region, user: game.user.id };
}

/** an active effect created or switched on → a moment */
export function readEffect(effect) {
  const actor = effect.parent instanceof Item ? effect.parent.actor : effect.parent;
  if (!actor) return null;
  const token = actor.token?.object ?? actor.getActiveTokens?.()[0] ?? null;
  if (!token) return { skip: 'no token for the effect' };
  const sys = effect.system ?? {};
  // `activity` stays null on an effect on purpose: an effect is held by nothing (a cast's hold is
  // over by the time its effect lands); what applied it is on `data.origin` for a word that asks
  return { when: 'effect', kind: 'effect', subject: subjectOfEffect(effect), source: token, targets: [{ token }], tie: effect, origin: effect.uuid, id: effect.id, activity: null, use: messageIdOf(sys.origin?.message), type: effect.type ?? 'base', data: sys, document: effect, user: game.user.id };
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
    // (a hold on this cast is the dispatcher's business now, not the reader's — core/gates.js)
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
