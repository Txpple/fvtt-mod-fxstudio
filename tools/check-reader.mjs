// The dnd5e reader, proved without Foundry (scripts/readers/dnd5e.js): what happened at the table →
// a moment, on a stand-in world (tools/lib/world.mjs) that holds only what the reader touches, in
// dnd5e 6.0's shapes. The TIMING POLICY written at the top of the reader is what this check writes
// down as checks: an attack plays on its attack card, a save or a heal on the damage or healing card,
// an area on the template, everything else on the usage card, and who plays it. Read-only, offline,
// a second.
//
//   node tools/check-reader.mjs                    every section
//   node tools/check-reader.mjs --section timing   one section (stamped PARTIAL)
import { harness } from './lib/check.mjs';
import { install } from './lib/stage.mjs';
import { world } from './lib/world.mjs';
import { toUrl, REPO } from './lib/env.mjs';
import { join } from 'node:path';

install();
const W = world();
const S = (p) => toUrl(join(REPO, 'scripts', p));
const { readMessage, readRegion, readEffect, subjectOfItem, subjectOfEffect, electedFor, tokenForActorUuid, tokenFor, tokenOfTarget, speakerToken, usageIdOf, lookup, registerReader, hideTemplateFor } = await import(S('readers/dnd5e.js'));

const t = harness('the dnd5e reader turns the table into moments as the timing policy says');

// the table: a GM (me), a player, a caster with a token, two targets, one actor with no token
const gm = W.user({ id: 'gm', name: 'The DM', isGM: true });
const player = W.user({ id: 'p1', name: 'Player' });
W.as(gm);
const caster = W.actor({ id: 'caster', name: 'Aria', x: 500, y: 500 });
const goblin = W.actor({ id: 'goblin', name: 'Goblin', x: 600, y: 500 });
const orc = W.actor({ id: 'orc', name: 'Orc', x: 1100, y: 500 });
const ghost = W.actor({ id: 'ghost', name: 'Ghost', x: false });
const bow = W.item(caster, { id: 'bow', name: 'Longbow', type: 'weapon', system: { type: { value: 'martialR', baseItem: 'longbow' } }, activities: [{ id: 'atk', type: 'attack', damage: true }] });
const arrows = W.item(caster, { id: 'arrows', name: 'Arrow +1', type: 'consumable', system: { type: { value: 'ammo' } } });
const glaive = W.item(caster, { id: 'glaive', name: 'Glaive', type: 'weapon', system: { type: { value: 'martialM', baseItem: 'glaive' }, properties: ['rch'] }, activities: [{ id: 'atk', type: 'attack', damage: true }] });
const fireBolt = W.item(caster, { id: 'firebolt', name: 'Fire Bolt', type: 'spell', system: { identifier: 'fire-bolt' }, activities: [{ id: 'atk', type: 'attack', damage: true }] });
const fireball = W.item(caster, { id: 'fireball', name: 'Fireball', type: 'spell', system: { identifier: 'fireball' }, activities: [{ id: 'save', type: 'save', damage: true, target: 'circle' }] });
const cureWounds = W.item(caster, { id: 'cure', name: 'Cure Wounds', type: 'spell', system: { identifier: 'cure-wounds' }, activities: [{ id: 'heal', type: 'heal' }] });
const holdPerson = W.item(caster, { id: 'hold', name: 'Hold Person', type: 'spell', system: { identifier: 'hold-person' }, activities: [{ id: 'save', type: 'save' }] });
const mistyStep = W.item(caster, { id: 'misty', name: 'Misty Step', type: 'spell', system: { identifier: 'misty-step' }, activities: [{ id: 'util', type: 'utility' }] });
const secondWind = W.item(caster, { id: 'wind', name: 'Second Wind', type: 'feat', system: { identifier: 'second-wind' }, activities: [{ id: 'heal', type: 'heal' }] });
const wand = W.item(caster, { id: 'wand', name: 'Wand of Fire Bolts', type: 'consumable', activities: [{ id: 'cast', type: 'cast', spell: fireBolt.uuid }] });
const bite = W.item(goblin, { id: 'bite', name: 'Bite', type: 'weapon', system: { type: { value: 'natural' } }, activities: [{ id: 'atk', type: 'attack', damage: true }] });
const act = (item, id = item.activities[0].id) => item.activities.find((a) => a.id === id);
const usage = (item, over = {}) => W.message({ author: gm, speaker: caster, type: 'usage', activity: act(item), ...over });
/** a roll card of `type` (attack | damage | healing), chained to a usage card */
const rolled = (item, type, { roll = {}, ...over } = {}) => W.message({ author: gm, speaker: caster, activity: act(item), type, roll: { total: 18, ...roll }, origin: 'use1', ...over });

// ---------------------------------------------------------------------------------------------
if (t.section('the timing policy: a use fires as late as the answer is known and no later')) {
  const atk = readMessage(rolled(bow, 'attack', { targets: [{ actor: goblin, ac: 15 }] }));
  t.same('an attack plays on the attack card', [atk.when, atk.kind, atk.subject.name], ['use', 'attack', 'Longbow']);
  t.is('… its usage card is skipped, pointing at the damage card', readMessage(usage(bow)).skip, 'plays on the damage card');
  t.is('… and its damage card is skipped, pointing back at the attack card', readMessage(rolled(bow, 'damage')).skip, 'an attack plays on its attack card');
  t.is('a save with damage: the card is skipped', readMessage(usage(holdPerson)).skip ?? readMessage(usage(fireball)).skip, 'plays on the template');
  const saveDamage = W.item(caster, { id: 'poison', name: 'Poison Spray', type: 'spell', activities: [{ id: 'save', type: 'save', damage: true }] });
  t.is('a save with damage and no template: the card is skipped for the damage card', readMessage(usage(saveDamage)).skip, 'plays on the damage card');
  t.same('… and plays on the damage card', [readMessage(rolled(saveDamage, 'damage')).kind, readMessage(rolled(saveDamage, 'damage')).subject.name], ['damage', 'Poison Spray']);
  t.is('a heal: the card is skipped', readMessage(usage(cureWounds)).skip, 'plays on the damage card');
  t.same("… and plays on the healing card (6.0: a heal is its own card type; the same moment)", [readMessage(rolled(cureWounds, 'healing')).kind, readMessage(rolled(cureWounds, 'healing')).subject.name], ['damage', 'Cure Wounds']);
  t.same('a feature that heals plays on its healing card too', readMessage(rolled(secondWind, 'healing')).subject.keys[0], 'feature:second-wind');
  t.same('a save with no damage plays on the card', [readMessage(usage(holdPerson)).kind, readMessage(usage(holdPerson)).subject.name], ['use', 'Hold Person']);
  t.same('a utility plays on the card', [readMessage(usage(mistyStep)).kind, readMessage(usage(mistyStep)).subject.keys[0]], ['use', 'spell:misty-step']);
  t.is('an area: every card is skipped for the template', readMessage(rolled(fireball, 'damage')).skip, 'plays on the template');
  t.is('… the card too', readMessage(usage(fireball)).skip, 'plays on the template');
  t.is("a message that is not dnd5e's is not a moment", readMessage({ id: 'x', type: 'base', system: {}, flags: {} }), null);
  t.is('a save card is not a moment (a save plays on its damage card, or on the usage card)', readMessage(W.message({ author: gm, speaker: caster, activity: act(holdPerson), type: 'save', roll: { total: 12 } })), null);
  t.is('a check card is not a moment', readMessage(W.message({ author: gm, speaker: caster, activity: act(bow), type: 'check', roll: { total: 12 } })), null);
  t.is('a usage card with no activity on it is not a moment', readMessage({ ...usage(mistyStep), system: { ...usage(mistyStep).system, activity: null } }), null);
  t.is('a card of another type with the activity on it is not a moment', readMessage({ ...usage(mistyStep), type: 'rest' }), null);
  t.is('an item that is gone: skipped', readMessage(W.message({ author: gm, speaker: caster, activity: { uuid: 'Actor.caster.Item.gone.Activity.x', id: 'x', type: 'utility' }, item: { uuid: 'Actor.caster.Item.gone', id: 'gone' }, type: 'usage' })).skip, 'the item is gone');
  t.is('a speaker with no token: skipped', readMessage(W.message({ author: gm, speaker: ghost, type: 'usage', activity: act(mistyStep) })).skip, 'no token for the speaker');
}

// ---------------------------------------------------------------------------------------------
if (t.section("the verdict: hit or miss per target, dnd5e's own (an unreadable AC is a miss)")) {
  const m = (roll, targets) => readMessage(rolled(bow, 'attack', { roll, targets }));
  t.same('a roll at or over the AC hits; under it misses', m({ total: 15 }, [{ actor: goblin, ac: 15 }, { actor: orc, ac: 16 }]).targets.map((x) => [x.token.name, x.hit]), [['Goblin', true], ['Orc', false]]);
  t.is('a critical hits whatever the AC', m({ total: 3, isCritical: true }, [{ actor: goblin, ac: 20 }]).targets[0].hit, true);
  t.is('a fumble misses whatever the AC', m({ total: 30, isFumble: true }, [{ actor: goblin, ac: 5 }]).targets[0].hit, false);
  t.is('an AC dnd5e could not read (total cover) is a MISS — the platform\'s verdict, adopted (the user, 2026-09-15)', m({ total: 30 }, [{ actor: goblin, ac: null }]).targets[0].hit, false);
  t.is('no d20 on the card: no verdict, every target counts as hit', readMessage(W.message({ author: gm, speaker: caster, activity: act(bow), type: 'attack', roll: null, targets: [{ actor: goblin, ac: 25 }] })).targets[0].hit, true);
  t.is('a damage card carries no verdict', readMessage(rolled(holdPerson, 'damage', { targets: [{ actor: goblin, ac: 25 }] })).targets[0].hit, undefined);
  const whole = m({ total: 18 }, [{ actor: goblin, ac: 12 }]).targets[0];
  t.same("dnd5e's target record rides whole: the token, the actor uuid, the AC it read, the name", [whole.token.name, whole.actor, whole.ac, whole.name], ['Goblin', goblin.uuid, 12, 'Goblin']);
  t.same('a target whose actor has no token is dropped', m({ total: 18 }, [{ actor: ghost, ac: 10 }, { actor: goblin, ac: 10 }]).targets.map((x) => x.token.name), ['Goblin']);
  t.same('no targets: none', m({ total: 18 }, []).targets, []);
  t.is("a target's token is read from the descriptor's token uuid first", tokenOfTarget({ token: goblin.tokens[0].document.uuid, actor: orc.uuid }).name, 'Goblin');
  t.is('… else from its actor', tokenOfTarget({ token: null, actor: orc.uuid }).name, 'Orc');
}

// ---------------------------------------------------------------------------------------------
if (t.section("the subject: what acted, by identity — one key per item, dnd5e's identifier, exact or nothing")) {
  t.same('a weapon: one key, its identifier (its name formatted, when none is set); no base weapon, no activity', subjectOfItem(bow, { activity: act(bow) }).keys, ['weapon:longbow']);
  const named = W.item(caster, { id: 'vesper', name: 'Vesper Staff', type: 'weapon', system: { type: { value: 'simpleM', baseItem: 'quarterstaff' } }, activities: [{ id: 'atk', type: 'attack' }] });
  t.same('… a named weapon keys as itself alone: its base weapon is not a rung', subjectOfItem(named, { activity: act(named) }).keys, ['weapon:vesper-staff']);
  const copied = W.item(caster, { id: 'flame', name: 'Flame Tongue', type: 'weapon', system: { identifier: 'longsword', type: { value: 'martialM', baseItem: 'longsword' } }, activities: [{ id: 'atk', type: 'attack' }] });
  t.same('… a weapon copied from the Longsword and renamed keeps the identifier it carries', subjectOfItem(copied).keys, ['weapon:longsword']);
  const own = W.item(caster, { id: 'gold', name: 'Goldthorn', type: 'weapon', system: { identifier: 'goldthorn-bob' }, activities: [{ id: 'atk', type: 'attack' }] });
  t.same('… an item given an identifier of its own keys by it and by nothing else', subjectOfItem(own).keys, ['weapon:goldthorn-bob']);
  t.same('a natural weapon is natural', subjectOfItem(bite, { activity: act(bite) }).keys, ['natural:bite']);
  t.same("a spell: dnd5e's identifier", subjectOfItem(fireBolt, { activity: act(fireBolt) }).keys, ['spell:fire-bolt']);
  const renamed = W.item(caster, { id: 'marks', name: "Mark's Firebolt", type: 'spell', system: { identifier: 'fire-bolt' }, activities: [{ id: 'atk', type: 'attack' }] });
  t.same('… a renamed spell still keys by the identifier the book gave it', subjectOfItem(renamed).keys, ['spell:fire-bolt']);
  t.same('a feature', subjectOfItem(secondWind).keys, ['feature:second-wind']);
  t.same('a consumable is an item', subjectOfItem(arrows).keys, ['item:arrow-1']);
  t.same('a cast activity puts the linked spell before the item', subjectOfItem(wand, { activity: act(wand) }).keys, ['spell:fire-bolt', 'item:wand-of-fire-bolts']);
  t.same('ammunition fired comes before the weapon', subjectOfItem(bow, { activity: act(bow), ammunition: arrows }).keys, ['item:arrow-1', 'weapon:longbow']);
  const withAmmo = readMessage(rolled(bow, 'attack', { ammunition: 'arrows', targets: [{ actor: goblin, ac: 10 }] }));
  t.same("… read off the attack card's ammunition (6.0: the item's id on `system.ammunition`)", withAmmo.subject.keys[0], 'item:arrow-1');
  t.is('… but only on an attack card', readMessage(rolled(holdPerson, 'damage', { ammunition: 'arrows' })).subject.ammunition ?? null, null);
  t.is('a reach weapon says so', subjectOfItem(glaive).reach, true);
  t.is('… and a plain one does not', subjectOfItem(bow).reach, false);
  t.is("the item's uuid rides along", subjectOfItem(bow).uuid, bow.uuid);
  const flagged = W.item(caster, { id: 'sword', name: 'First Light', type: 'weapon', flags: { 'fvtt-mod-fxstudio': { fx: 'first-light' } }, activities: [{ id: 'atk', type: 'attack' }] });
  t.same('a flag of ours on an item is not read: nothing of this module lives on an item (DESIGN §23)', [subjectOfItem(flagged).pointer, subjectOfItem(flagged).keys], [undefined, ['weapon:first-light']]);
  t.is('no item: no subject', subjectOfItem(null), null);
  const qualified = W.item(goblin, { id: 'ms', name: 'Misty Step - Spellcasting', type: 'spell' });
  t.same('a qualified name with no identifier set keys exactly as dnd5e formats it: no form of the name is tried', subjectOfItem(qualified).keys, ['spell:misty-step-spellcasting']);
}

// ---------------------------------------------------------------------------------------------
if (t.section('the moment carries the card: type and data whole, the document, its use, what a gate asks by')) {
  const card = usage(mistyStep);
  const m = readMessage(card);
  t.same('a moment carries what a gate asks by: the activity uuid and the id', [m.activity, m.id], [act(mistyStep).uuid, card.id]);
  t.same("… the item's uuid as the origin, the author", [m.origin, m.user], [mistyStep.uuid, 'gm']);
  t.same("… the card's type and its system data whole, and the document itself", [m.type, m.data === card.system, m.document === card], ['usage', true, true]);
  t.is('a usage card is its own use', m.use, card.id);
  const atkCard = rolled(bow, 'attack', { targets: [{ actor: goblin, ac: 10 }] });
  const atk = readMessage(atkCard);
  t.same('a roll card knows the usage card it chains to (6.0: `system.origin`, the raw id read off the source)', [atk.use, usageIdOf(atkCard)], ['use1', 'use1']);
  t.same("… and carries its type and data: the mode, the mastery, the AC per target are there for a word that asks", [atk.type, atk.data.mode, atk.data.targets[0].ac], ['attack', 'oneHanded', 10]);
  t.is('a live origin link (a resolved document) reads by its id', usageIdOf({ system: { origin: { id: 'use9' } } }), 'use9');
  t.is('no origin: null', usageIdOf({ system: { origin: null } }), null);
  t.is('there is no `flags` on a moment any more: nothing of dnd5e\'s is a flag on a card', 'flags' in m, false);
}

// ---------------------------------------------------------------------------------------------
if (t.section("a placed template: the Region is the moment, with the user's targets")) {
  gm.targets = new Set([goblin.tokens[0]]);
  const region = W.template(act(fireball), { type: 'circle', distance: 20 });
  const m = readRegion(region);
  t.same('a Region stamped with a dnd5e activity is a use of its spell', [m.when, m.kind, m.subject.keys[0]], ['use', 'template', 'spell:fireball']);
  t.same("the usage token dnd5e stamped as `origin` is the source; the user's targets are the targets", [m.source.name, m.targets.map((x) => x.token.name)], ['Aria', ['Goblin']]);
  t.same('the Region is the place and what persistent pictures are tied to', [m.place, m.tie], [region, region]);
  t.same("the activity rides for a gate; the Region's dnd5e flags are the data, whole; the type says region", [m.activity, m.data === region.flags.dnd5e, m.data.spellLevel, m.type, m.document], [act(fireball).uuid, true, 3, 'region', region]);
  gm.targets = new Set();
  t.same('no targets: none', readRegion(W.template(act(fireball))).targets, []);
  const noToken = W.template(act(fireball));
  noToken.flags.dnd5e.origin = null;
  t.is("no usage token on the Region: the caster's active token is the source", readRegion(noToken).source.name, 'Aria');
  t.is('a Region with no dnd5e activity is not a moment', readRegion({ id: 'r', flags: {} }), null);
  t.is("… an older Region that has only `origin` (the 5.x stamp, the activity) is not one either: 6.0's stamp is the activity flag", readRegion({ id: 'r', flags: { dnd5e: { origin: act(fireball).uuid } } }), null);
  t.is('an activity that no longer resolves and no item: skipped', readRegion({ id: 'r', flags: { dnd5e: { activity: 'Actor.x.Item.y.Activity.z' } } }).skip, 'the template names no item');
  t.is("… the item flag answers when the activity is gone", readRegion({ id: 'r', flags: { dnd5e: { activity: 'Actor.x.Item.y.Activity.z', item: fireball.uuid } } }).subject.keys[0], 'spell:fireball');
}

// ---------------------------------------------------------------------------------------------
if (t.section('an active effect: its own name, then what made it (6.0: system.origin, by kind)')) {
  const bless = W.effect(caster, { id: 'bless', name: 'Bless', system: { origin: { item: holdPerson.uuid } } });
  const m = readEffect(bless);
  t.same('an effect on an actor is an effect moment on its token', [m.when, m.kind, m.source.name, m.targets.map((x) => x.token.name)], ['effect', 'effect', 'Aria', ['Aria']]);
  t.same("keyed by the effect's own name, then its origin's keys", m.subject.keys, ['effect:bless', 'spell:hold-person']);
  t.same('the effect is the tie and the origin; it has no activity for a gate (a cast\'s hold is over when its effect lands)', [m.tie, m.origin, m.activity], [bless, bless.uuid, null]);
  t.same("its type and its system data ride whole", [m.type, m.data === bless.system, m.document], ['base', true, bless]);
  const onItem = W.effect(bow, { id: 'sharp', name: 'Sharpened' });
  t.is("an effect on an item is a moment on the item's actor", readEffect(onItem).source.name, 'Aria');
  t.same('… keyed by its name alone when it has no origin', readEffect(onItem).subject.keys, ['effect:sharpened']);
  t.is('an effect on an actor with no token: skipped', readEffect(W.effect(ghost, { id: 'e', name: 'Haunted' })).skip, 'no token for the effect');
  t.is('an effect with no actor at all is not a moment', readEffect({ parent: null, name: 'x' }), null);
  const fromEffect = W.effect(caster, { id: 'e2', name: 'Blinded', system: { origin: { effect: bless.uuid } } });
  t.same("an origin effect that itself has an item origin: that item's keys", subjectOfEffect(fromEffect).keys, ['effect:blinded', 'spell:hold-person']);
  const orphan = W.effect(caster, { id: 'e2b', name: 'Dazed', system: { origin: { effect: onItem.uuid } } });
  t.same("an origin effect that sits ON an item (a rider through a concentration effect): the item", subjectOfEffect(orphan).keys, ['effect:dazed', 'weapon:longbow']);
  const a = holdPerson.activities[0];
  const applied = W.effect(caster, { id: 'e3', name: 'Held', system: { origin: { activity: a.uuid, actor: caster.uuid, message: 'ChatMessage.use7', profile: 'p1' } } });
  t.is("6.0: `origin` is the activity's uuid (the most specific provenance)", applied.origin, a.uuid);
  t.same("6.0: the activity's item is the origin", subjectOfEffect(applied).keys, ['effect:held', 'spell:hold-person']);
  t.is('… and the card that applied it is the use', readEffect(applied).use, 'use7');
  const both = W.effect(caster, { id: 'e3b', name: 'Held Twice', system: { origin: { item: fireBolt.uuid, activity: a.uuid } } });
  t.same('the item under system.origin is read before the activity', subjectOfEffect(both).keys, ['effect:held-twice', 'spell:fire-bolt']);
  const packAct = 'Compendium.dnd-players-handbook.classes.Item.phbmnvGoadingAtt.Activity.YZDchvLnuCD6xMkF';
  t.throws('the stand-in refuses a compendium-embedded uuid the way Foundry does', () => fromUuidSync(packAct));
  t.is('… and lookup answers null for it, never a throw', lookup(packAct), null);
  const goading = W.effect(caster, { id: 'e4', name: 'Goaded', system: { origin: { activity: packAct, actor: caster.uuid } } });
  t.same("6.0: an activity still in a compendium (a class feature's) is no origin, not a throw", subjectOfEffect(goading).keys, ['effect:goaded']);
  t.is('… and the effect is still a moment', readEffect(goading).kind, 'effect');
  const region = W.template(act(fireball));
  const behavior = W.behavior(region, { id: 'apply' });
  const fromArea = W.effect(goblin, { id: 'e5', name: 'Burning', system: { origin: { behavior: behavior.uuid } } });
  t.same("an effect a region behaviour applied (entering an area): the region's activity's item", subjectOfEffect(fromArea).keys, ['effect:burning', 'spell:fireball']);
  const condition = W.effect(goblin, { id: 'e6', name: 'Prone', type: 'condition' });
  t.same("a condition is an effect moment too, typed as dnd5e types it", [readEffect(condition).type, readEffect(condition).subject.keys], ['condition', ['effect:prone']]);
}

// ---------------------------------------------------------------------------------------------
if (t.section('who plays: the author when connected, else the first active GM')) {
  const gm2 = W.user({ id: 'a-gm', name: 'Second GM', isGM: true });
  W.as(gm);
  t.is("the message's author plays it", electedFor({ author: gm }), true);
  t.is('… and nobody else', electedFor({ author: player }), false);
  const away = W.user({ id: 'away', name: 'Away', active: false });
  t.is('an author who is not connected: the first active GM by id plays', electedFor({ author: away }), false);
  W.as(gm2);
  t.is('… which is the lowest id among the active GMs', electedFor({ author: away }), true);
  gm2.active = false;
  W.as(gm);
  t.is('… skipping a GM who is not connected', electedFor({ author: away }), true);
  t.is('an older message with `user` instead of `author` is read the same', electedFor({ user: gm }), true);
  t.is("a target's actor uuid answers its token", tokenForActorUuid(goblin.uuid).name, 'Goblin');
  t.is('… and null for an actor with no token', tokenForActorUuid(ghost.uuid), null);
  t.is('… and null for nothing', tokenForActorUuid(null), null);
  t.is('a token uuid answers its placeable', tokenFor(goblin.tokens[0].document.uuid).name, 'Goblin');
  t.is('… an actor uuid its token', tokenFor(orc.uuid).name, 'Orc');
  t.is('… anything else nothing', tokenFor(bow.uuid), null);
  t.is("a speaker's token by id", speakerToken({ speaker: { token: caster.tokens[0].id } }).name, 'Aria');
  t.is("… else by the speaker's actor", speakerToken({ speaker: { actor: 'goblin' } }).name, 'Goblin');
  t.is('… else nothing', speakerToken({ speaker: {} }), null);
}

// ---------------------------------------------------------------------------------------------
if (t.section('the hooks: what is dispatched, what is ended, what is ignored')) {
  const hooks = new Map();
  globalThis.Hooks = { on: (name, fn) => hooks.set(name, fn), once() {}, callAll() {} };
  const dispatched = [], ended = [];
  const logs = console.log;
  console.log = () => {};
  registerReader({ dispatch: (m) => dispatched.push(m), end: (origin, token) => ended.push([origin, token?.name]) });
  W.as(gm);
  t.same('the reader listens to messages, templates (before and after dnd5e creates the Region) and effects', [...hooks.keys()].sort(), ['createActiveEffect', 'createChatMessage', 'createRegion', 'dnd5e.createMeasuredTemplate', 'updateActiveEffect']);
  hooks.get('createChatMessage')(usage(mistyStep));
  t.same('an elected message is dispatched as its moment', [dispatched.length, dispatched[0]?.subject.name], [1, 'Misty Step']);
  hooks.get('createChatMessage')(usage(mistyStep, { author: player }));
  t.is("another connected user's message is theirs to play", dispatched.length, 1);
  hooks.get('createChatMessage')(usage(bow));
  t.is('a skipped message is logged, not dispatched', dispatched.length, 1);
  hooks.get('createChatMessage')({ id: 'x', author: gm, type: 'base', system: {}, flags: {} });
  t.is('a message that is no moment is nothing', dispatched.length, 1);
  await t.step('the template hook', async () => {
    const region = W.template(act(fireball));
    await hooks.get('createRegion')(region, {}, gm.id);
    t.same('a template I placed is dispatched after half a second for the Region to draw', [dispatched.length, dispatched[1]?.kind, dispatched[1]?.place], [2, 'template', region]);
    await hooks.get('createRegion')(W.template(act(fireball)), {}, player.id);
    t.is('a template another user placed is theirs', dispatched.length, 2);
    await hooks.get('createRegion')({ id: 'r', flags: {} }, {}, gm.id);
    t.is('a Region that is no template is nothing', dispatched.length, 2);
  });
  await t.step('the placement, before the Region exists: a picture that stands for the template hides it', async () => {
    const fog = { id: 'fog', scenes: [{ shape: 'fill', asset: 'x', persist: 'template' }] };
    const burst = { id: 'burst', scenes: [{ shape: 'fill', asset: 'x' }] };
    const data = () => [{ shapes: [], visibility: 2 }, { shapes: [], visibility: 2 }];
    let d = data();
    t.same('a fill that persists with the template: every Region of the placement goes to the layer (LAYER = 0), and the FX is asked for as a use with a place', [hideTemplateFor(act(fireball), d, (m) => (m.when === 'use' && m.place && m.subject.keys[0] === 'spell:fireball' ? fog : null)), d.map((r) => r.visibility)], [true, [0, 0]]);
    d = data();
    t.same('a once-only fill (a burst): the Region stays as dnd5e made it', [hideTemplateFor(act(fireball), d, () => burst), d.map((r) => r.visibility)], [false, [2, 2]]);
    d = data();
    t.same('no FX answers: untouched', [hideTemplateFor(act(fireball), d, () => null), d.map((r) => r.visibility)], [false, [2, 2]]);
    t.is('no item, no data: nothing', hideTemplateFor(null, [], () => fog), false);
    hooks.get('dnd5e.createMeasuredTemplate')(act(fireball), d);
    t.is("the hook is wired with the dispatcher's answers (none here: the Region is left alone)", d[0].visibility, 2);
  });
  const bless = W.effect(caster, { id: 'bless2', name: 'Bless' });
  hooks.get('createActiveEffect')(bless, {}, gm.id);
  t.same('an effect I created is dispatched', [dispatched.length, dispatched[2]?.kind], [3, 'effect']);
  hooks.get('createActiveEffect')(W.effect(caster, { id: 'off', name: 'Off', disabled: true }), {}, gm.id);
  t.is('an effect created disabled is not', dispatched.length, 3);
  hooks.get('createActiveEffect')(bless, {}, player.id);
  t.is("another user's effect is theirs", dispatched.length, 3);
  hooks.get('updateActiveEffect')(bless, { disabled: true }, {}, gm.id);
  t.same('an effect switched off ends its pictures on its token', ended, [[bless.uuid, 'Aria']]);
  hooks.get('updateActiveEffect')(bless, { disabled: false }, {}, gm.id);
  t.is('an effect switched back on is dispatched again', dispatched.length, 4);
  hooks.get('updateActiveEffect')(bless, { name: 'Renamed' }, {}, gm.id);
  t.is('an update that does not touch disabled is nothing', dispatched.length, 4);
  hooks.get('updateActiveEffect')(bless, { disabled: true }, {}, player.id);
  t.is("another user's switch-off is theirs", ended.length, 1);
  console.log = logs;
}

t.done();
