// A stand-in dnd5e WORLD for the reader (scripts/readers/dnd5e.js), in plain node, on top of the
// stage (stage.mjs install() first). It holds exactly what the reader touches and nothing more:
// users, actors with a token, items with activities, active effects, the messages dnd5e posts and
// the Region a placed template becomes — each addressable by uuid through `fromUuidSync`, the way
// the reader finds them at the table.
//
// THIS IS THE ONE PLACE THE DATA MODEL IS SPELT OUT FOR THE OFFLINE CHECKS. When dnd5e's message
// flags, activity shape or effect shape change, change the builders here and the checks follow;
// a check never writes a flag by hand.
//
//   const W = world();                       installs game.users / game.user / game.actors / canvas.tokens / ChatMessage / fromUuidSync
//   const gm = W.user({id: 'gm', isGM: true}); W.as(gm)
//   const a = W.actor({id: 'a', name: 'Aria', x: 500, y: 500})       an actor with one token on the stage (x: false → no token)
//   const i = W.item(a, {id: 'i', name: 'Longbow', type: 'weapon', system: {...}, activities: [{id: 'atk', type: 'attack', damage: true}]})
//   const e = W.effect(a, {id: 'e', name: 'Bless', origin: i.uuid})
//   W.message({author: gm, speaker: a, type: 'usage', activity: i.activities[0]})                 the usage card
//   W.message({..., roll: {type: 'attack', total: 18, isCritical: false, isFumble: false}, targets: [{actor: b, ac: 15}]})
//   W.template(i.activities[0], {type: 'circle', distance: 20})                                   the Region a template became
import { token as stageToken, region as stageRegion } from './stage.mjs';

export function world() {
  const uuids = new Map();
  const register = (doc) => { uuids.set(doc.uuid, doc); return doc; };
  const users = [];
  const actors = new Map();
  const tokens = new Map();
  let messageCount = 0;

  globalThis.fromUuidSync = (u) => uuids.get(u) ?? null;
  globalThis.game.users = users;
  globalThis.game.actors = { get: (id) => actors.get(id) ?? null, get contents() { return [...actors.values()]; } };
  globalThis.canvas.tokens = { get: (id) => tokens.get(id) ?? null, controlled: [] };
  globalThis.ChatMessage = { getSpeakerActor: (sp) => (sp?.actor ? actors.get(sp.actor) ?? null : null) };

  const W = {
    uuids,
    /** a user; the first one made is `game.user` until `as()` says otherwise */
    user({ id, name = id, isGM = false, active = true, targets = [] } = {}) {
      const u = { id, name, isGM, active, targets: new Set(targets), color: { toString: () => '#ff0000' } };
      users.push(u);
      if (!globalThis.game.user?.id) globalThis.game.user = u;
      return u;
    },
    /** act as this user */
    as(u) { globalThis.game.user = u; return u; },
    /** an actor with one token on the stage (x: false for an actor with no token) */
    actor({ id, name = id, x = 500, y = 500, size = 1, isCreature = true } = {}) {
      const items = [];
      const actor = {
        uuid: `Actor.${id}`, id, name, documentName: 'Actor', isToken: false, type: 'character',
        system: { isCreature },
        items: { get: (iid) => items.find((i) => i.id === iid) ?? null, getName: (n) => items.find((i) => i.name === n) ?? null, contents: items, push: (i) => items.push(i) },
        token: null, tokens: [],
        getActiveTokens: () => actor.tokens,
      };
      if (x !== false) {
        const t = stageToken({ id: `tok-${id}`, name, x, y, size });
        t.actor = actor;
        t.document.actor = actor;
        t.document.id = t.id;
        actor.tokens.push(t);
        tokens.set(t.id, t);
      }
      actors.set(id, actor);
      return register(actor);
    },
    /** an item on an actor, with its activities: [{id, type, damage: true|parts, target: 'circle'|null, spell: uuid, heal}] */
    item(actor, { id, name = id, type = 'weapon', system = {}, flags = {}, activities = [] } = {}) {
      const item = Object.assign(new globalThis.Item(), {
        uuid: `${actor.uuid}.Item.${id}`, id, name, type, documentName: 'Item', actor, parent: actor,
        system: { ...system, identifier: system.identifier ?? null, type: system.type, properties: new Set(system.properties ?? []) },
        flags,
        activities: [],
      });
      for (const a of activities) {
        const act = {
          uuid: `${item.uuid}.Activity.${a.id}`, id: a.id, type: a.type ?? 'utility', item,
          damage: { parts: a.damage === true ? [{ formula: '1d8' }] : Array.isArray(a.damage) ? a.damage : [] },
          target: { template: { type: a.target ?? '' } },
          spell: a.spell ? { uuid: a.spell } : null,
        };
        item.activities.push(register(act));
      }
      actor.items.push(item);
      return register(item);
    },
    /** an active effect on an actor or an item */
    effect(parent, { id, name = id, origin = null, disabled = false, flags = {} } = {}) {
      return register({ uuid: `${parent.uuid}.ActiveEffect.${id}`, id, name, origin, disabled, parent, flags, documentName: 'ActiveEffect' });
    },
    /**
     * A message dnd5e posts: the usage card (`type: 'usage'`, no roll) or a roll message
     * (`roll: {type: 'attack' | 'damage' | 'healing', total, isCritical, isFumble, ammunition}`), with
     * the targets dnd5e stamps ([{actor, ac}]) and the speaker's token.
     */
    message({ author, speaker, type = 'usage', activity, item = activity?.item, roll = null, targets = [], id = null } = {}) {
      messageCount++;
      const flagsRoll = roll ? { type: roll.type, ...(roll.ammunition ? { ammunition: roll.ammunition } : {}) } : undefined;
      return {
        id: id ?? `msg${messageCount}`, type: roll ? 'roll' : type, author,
        speaker: { token: speaker?.tokens?.[0]?.id ?? null, actor: speaker?.id ?? null },
        rolls: roll ? [{ total: roll.total ?? 10, isCritical: !!roll.isCritical, isFumble: !!roll.isFumble }] : [],
        flags: { dnd5e: { activity: { uuid: activity?.uuid }, item: { uuid: item?.uuid }, ...(flagsRoll ? { roll: flagsRoll } : {}), targets: targets.map((t) => ({ uuid: t.actor.uuid, ac: t.ac ?? 10 })) } },
      };
    },
    /** the Region a placed template became, stamped with the activity as dnd5e stamps it */
    template(activity, { id = null, type = 'circle', distance = 20, x = 1100, y = 500 } = {}) {
      const r = stageRegion({ id, type, distance, x, y });
      r.flags = { dnd5e: { origin: activity?.uuid ?? null } };
      return r;
    },
  };
  return W;
}
