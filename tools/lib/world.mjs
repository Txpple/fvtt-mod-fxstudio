// A stand-in dnd5e WORLD for the reader (scripts/readers/dnd5e.js), in plain node, on top of the
// stage (stage.mjs install() first). It holds exactly what the reader touches and nothing more:
// users, actors with a token, items with activities, active effects, the cards dnd5e posts and
// the Region a placed template becomes — each addressable by uuid through `fromUuidSync`, the way
// the reader finds them at the table.
//
// THIS IS THE ONE PLACE THE DATA MODEL IS SPELT OUT FOR THE OFFLINE CHECKS, and it is dnd5e 6.0's,
// built from real cards read off the sandbox's world database on 2026-09-15 (ASSESSMENT-6.0.md §3):
// a card is a typed message whose `system` carries the activity and the item as source references,
// the targets as token-precise descriptors, the usage card it chains to as `origin`, and on an
// attack dnd5e's own verdict (`evaluatedTargets`); a template is a Region stamped with the activity,
// the item and the usage token; an effect's provenance is `system.origin` by kind. When dnd5e's
// shapes change, change the builders here and the checks follow; a check never writes a card by hand.
//
//   const W = world();                       installs game.users / game.user / game.actors / canvas.tokens / ChatMessage / fromUuidSync
//   const gm = W.user({id: 'gm', isGM: true}); W.as(gm)
//   const a = W.actor({id: 'a', name: 'Aria', x: 500, y: 500})       an actor with one token on the stage (x: false → no token)
//   const i = W.item(a, {id: 'i', name: 'Longbow', type: 'weapon', system: {...}, activities: [{id: 'atk', type: 'attack', damage: true}]})
//   const e = W.effect(a, {id: 'e', name: 'Bless', system: {origin: {item: i.uuid, activity: i.activities[0].uuid}}})
//   W.message({author: gm, speaker: a, type: 'usage', activity: i.activities[0]})                 the usage card
//   W.message({..., type: 'attack', roll: {total: 18, isCritical: false, isFumble: false}, targets: [{actor: b, ac: 15}], ammunition: 'arrows'})
//   W.template(i.activities[0], {type: 'circle', distance: 20})                                   the Region a template became
//   W.behavior(region, {id: 'b'})                                                                   a behaviour on that Region (what applies an effect)
import { token as stageToken, region as stageRegion } from './stage.mjs';

const SCENE = 'Scene.stage';

export function world() {
  const uuids = new Map();
  const register = (doc) => { uuids.set(doc.uuid, doc); return doc; };
  const users = [];
  const actors = new Map();
  const tokens = new Map();
  let messageCount = 0;

  // Foundry's refusal, kept: an EMBEDDED document inside a compendium (an item's activity or effect
  // in a pack) cannot be read synchronously - a strict lookup throws, a non-strict one is null.
  globalThis.fromUuidSync = (u, { strict = true } = {}) => {
    if (typeof u === 'string' && u.startsWith('Compendium.') && u.split('.').length > 5) {
      if (strict) throw new Error(`fromUuidSync was invoked on UUID '${u}' which references an Embedded Document and cannot be retrieved synchronously.`);
      return null;
    }
    return uuids.get(u) ?? null;
  };
  globalThis.game.users = users;
  globalThis.game.actors = { get: (id) => actors.get(id) ?? null, get contents() { return [...actors.values()]; } };
  globalThis.canvas.tokens = { get: (id) => tokens.get(id) ?? null, controlled: [] };
  globalThis.ChatMessage = { getSpeakerActor: (sp) => (sp?.actor ? actors.get(sp.actor) ?? null : null) };

  /** a dnd5e source reference: what a card keeps of an activity or an item */
  const ref = (doc) => (doc ? { id: doc.id, uuid: doc.uuid, name: doc.name, type: doc.type, img: null } : null);
  /** a dnd5e target descriptor, as TargetsField.getDescriptors writes it: the actor, its token, the AC (null under total cover) */
  const descriptor = (t) => ({ actor: t.actor.uuid, token: t.actor.tokens?.[0]?.document?.uuid ?? null, ac: t.ac === undefined ? 10 : t.ac, name: t.actor.name, img: null });

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
    /** an actor with one token on the stage (x: false for an actor with no token); the token's document is addressable as Scene.stage.Token.<id> */
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
        t.document.uuid = `${SCENE}.Token.${t.id}`;
        t.document.documentName = 'Token';
        t.document.object = t;
        register(t.document);
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
          uuid: `${item.uuid}.Activity.${a.id}`, id: a.id, name: a.name ?? a.type ?? 'utility', type: a.type ?? 'utility', item,
          damage: { parts: a.damage === true ? [{ formula: '1d8' }] : Array.isArray(a.damage) ? a.damage : [] },
          target: { template: { type: a.target ?? '' } },
          spell: a.spell ? { uuid: a.spell } : null,
          getUsageToken: () => actor.tokens?.[0]?.document ?? null,
        };
        item.activities.push(register(act));
      }
      actor.items.push(item);
      return register(item);
    },
    /**
     * An active effect on an actor or an item, 6.0's shape: `type` (base | condition | enchantment),
     * `system.origin` by kind ({item, activity, effect, behavior, actor, message, profile}) and the
     * legacy `origin` string derived from it the way dnd5e 6.0 prepares it — the most specific one.
     */
    effect(parent, { id, name = id, type = 'base', system = {}, disabled = false, flags = {} } = {}) {
      const o = system.origin ?? {};
      const origin = o.effect ?? o.behavior ?? o.activity ?? o.item ?? o.actor ?? null;
      return register({ uuid: `${parent.uuid}.ActiveEffect.${id}`, id, name, type, origin, system: { ...system, origin: o }, disabled, parent, flags, documentName: 'ActiveEffect' });
    },
    /**
     * A card dnd5e posts, typed: `usage` (no roll), or `attack` | `damage` | `healing` with a roll
     * ({total, isCritical, isFumble}) and the targets dnd5e stamps ([{actor, ac}]); `origin` is the
     * usage card it chains to (an id), `ammunition` the item id an attack fired.
     */
    message({ author, speaker, type = 'usage', activity, item = activity?.item, roll = null, targets = [], id = null, origin = null, ammunition = null } = {}) {
      messageCount++;
      const rolls = roll ? [{ total: roll.total ?? 10, isCritical: !!roll.isCritical, isFumble: !!roll.isFumble, d20: true }] : [];
      const system = {
        activity: activity ? { ...ref(activity), uuid: activity.uuid ?? activity, type: activity.type ?? null } : null,
        item: item ? { ...ref(item), uuid: item.uuid ?? item } : null,
        targets: targets.map(descriptor),
        origin,
        ...(type === 'attack' ? { ammunition, deltas: null, mode: 'oneHanded', mastery: '' } : {}),
        ...(type === 'damage' || type === 'healing' ? { onSave: 'half', get isHealing() { return type === 'healing'; } } : {}),
        // dnd5e's verdict, computed as AttackMessageData#evaluatedTargets does: on the first d20 roll, else nothing
        get evaluatedTargets() {
          const r = message.rolls[0];
          if (!r?.d20 || type !== 'attack') return [];
          return this.targets.map((t) => ({ ...t, isMiss: t.ac === null || (!r.isCritical && (r.total < t.ac || r.isFumble)) }));
        },
        get ammunitionItem() { return ammunition ? speaker?.items?.get?.(ammunition) ?? null : null; },
      };
      const message = {
        id: id ?? `msg${messageCount}`, type, author,
        speaker: { token: speaker?.tokens?.[0]?.id ?? null, actor: speaker?.id ?? null },
        rolls, system, flags: {},
        _source: { system: { origin } },
      };
      return message;
    },
    /** the Region a placed template became, stamped as dnd5e 6.0 stamps it: the activity, the item, the usage token as `origin`, the level, the dimensions */
    template(activity, { id = null, type = 'circle', distance = 20, x = 1100, y = 500, width = 5, spellLevel = 3 } = {}) {
      const r = stageRegion({ id, type, distance, x, y, width });
      r.uuid = `${SCENE}.Region.${r.id}`;
      r.flags = { dnd5e: { activity: activity?.uuid ?? null, item: activity?.item?.uuid ?? null, origin: activity?.getUsageToken?.()?.uuid ?? null, spellLevel, dimensions: { size: distance, width, height: undefined, units: 'ft' } } };
      return register(r);
    },
    /** a behaviour on a Region (dnd5e's "apply active effect" behaviour is what an effect from an area names as its origin) */
    behavior(region, { id, type = 'dnd5e.applyActiveEffect' } = {}) {
      return register({ uuid: `${region.uuid}.RegionBehavior.${id}`, id, type, parent: region, documentName: 'RegionBehavior' });
    },
  };
  return W;
}
