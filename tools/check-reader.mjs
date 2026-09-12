// The dnd5e reader, proved without Foundry (scripts/readers/dnd5e.js): what happened at the table →
// a moment, on a stand-in world (tools/lib/world.mjs) that holds only what the reader touches. The
// TIMING POLICY written at the top of the reader is what this check writes down as checks: an
// attack plays on its attack roll, a save or a heal on the damage roll, an area on the template,
// everything else on the card, and who plays it. Read-only, offline, a second.
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
const { readMessage, readRegion, readEffect, subjectOfItem, subjectOfEffect, electedFor, tokenForActorUuid, speakerToken, registerReader } = await import(S('readers/dnd5e.js'));

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
const rolled = (item, type, { roll = {}, ...over } = {}) => W.message({ author: gm, speaker: caster, activity: act(item), roll: { type, total: 18, ...roll }, ...over });

// ---------------------------------------------------------------------------------------------
if (t.section('the timing policy: a use fires as late as the answer is known and no later')) {
  const atk = readMessage(rolled(bow, 'attack', { targets: [{ actor: goblin, ac: 15 }] }));
  t.same('an attack plays on the attack roll', [atk.when, atk.kind, atk.subject.name], ['use', 'attack', 'Longbow']);
  t.is('… its usage card is skipped, pointing at the damage roll', readMessage(usage(bow)).skip, 'plays on the damage roll');
  t.is('… and its damage roll is skipped, pointing back at the attack roll', readMessage(rolled(bow, 'damage')).skip, 'an attack plays on its attack roll');
  t.is('a save with damage: the card is skipped', readMessage(usage(holdPerson)).skip ?? readMessage(usage(fireball)).skip, 'plays on the template');
  const saveDamage = W.item(caster, { id: 'poison', name: 'Poison Spray', type: 'spell', activities: [{ id: 'save', type: 'save', damage: true }] });
  t.is('a save with damage and no template: the card is skipped for the damage roll', readMessage(usage(saveDamage)).skip, 'plays on the damage roll');
  t.same('… and plays on the damage roll', [readMessage(rolled(saveDamage, 'damage')).kind, readMessage(rolled(saveDamage, 'damage')).subject.name], ['damage', 'Poison Spray']);
  t.is('a heal: the card is skipped', readMessage(usage(cureWounds)).skip, 'plays on the damage roll');
  t.same("… and plays on the healing roll (dnd5e flags a heal's roll 'healing'; the same moment)", [readMessage(rolled(cureWounds, 'healing')).kind, readMessage(rolled(cureWounds, 'healing')).subject.name], ['damage', 'Cure Wounds']);
  t.same('a feature that heals plays on its healing roll too', readMessage(rolled(secondWind, 'healing')).subject.keys[0], 'feature:second-wind/heal');
  t.same('a save with no damage plays on the card', [readMessage(usage(holdPerson)).kind, readMessage(usage(holdPerson)).subject.name], ['use', 'Hold Person']);
  t.same('a utility plays on the card', [readMessage(usage(mistyStep)).kind, readMessage(usage(mistyStep)).subject.keys[0]], ['use', 'spell:misty-step/utility']);
  t.is('an area: every message is skipped for the template', readMessage(rolled(fireball, 'damage')).skip, 'plays on the template');
  t.is('… the card too', readMessage(usage(fireball)).skip, 'plays on the template');
  t.is('a message that is not dnd5e\'s is not a moment', readMessage({ id: 'x', flags: {} }), null);
  t.is('a usage card with a roll type that is neither attack nor damage is not a moment', readMessage(W.message({ author: gm, speaker: caster, activity: act(bow), roll: { type: 'save' } })), null);
  t.is('a roll message with no roll type that is not a usage card is not a moment', readMessage({ ...usage(mistyStep), type: 'other' }), null);
  t.is('an item that is gone: skipped', readMessage(W.message({ author: gm, speaker: caster, activity: { uuid: 'Actor.caster.Item.gone.Activity.x' }, item: { uuid: 'Actor.caster.Item.gone' }, type: 'usage' })).skip, 'the item is gone');
  t.is('a speaker with no token: skipped', readMessage(W.message({ author: gm, speaker: ghost, type: 'usage', activity: act(mistyStep) })).skip, 'no token for the speaker');
}

// ---------------------------------------------------------------------------------------------
if (t.section('the verdict: hit or miss per target, from dnd5e\'s own numbers')) {
  const m = (roll, targets) => readMessage(rolled(bow, 'attack', { roll, targets }));
  t.same('a roll at or over the AC hits; under it misses', m({ total: 15 }, [{ actor: goblin, ac: 15 }, { actor: orc, ac: 16 }]).targets.map((x) => [x.token.name, x.hit]), [['Goblin', true], ['Orc', false]]);
  t.is('a critical hits whatever the AC', m({ total: 3, isCritical: true }, [{ actor: goblin, ac: 20 }]).targets[0].hit, true);
  t.is('a fumble misses whatever the AC', m({ total: 30, isFumble: true }, [{ actor: goblin, ac: 5 }]).targets[0].hit, false);
  t.is('no roll on the message: every target counts as hit', readMessage({ ...rolled(bow, 'attack', { targets: [{ actor: goblin, ac: 25 }] }), rolls: [] }).targets[0].hit, true);
  t.is('a damage roll carries no verdict', readMessage(rolled(holdPerson, 'damage', { targets: [{ actor: goblin, ac: 25 }] })).targets[0].hit, undefined);
  t.same('a target whose actor has no token is dropped', m({ total: 18 }, [{ actor: ghost, ac: 10 }, { actor: goblin, ac: 10 }]).targets.map((x) => x.token.name), ['Goblin']);
  t.same('no targets: none', m({ total: 18 }, []).targets, []);
}

// ---------------------------------------------------------------------------------------------
if (t.section('the subject: what acted, by identity, with the activity, the spell, the ammunition, the pointer')) {
  t.same('a weapon: its name, then its base weapon, each with the activity first', subjectOfItem(bow, { activity: act(bow) }).keys, ['weapon:longbow/attack', 'weapon:longbow']);
  const named = W.item(caster, { id: 'vesper', name: 'Vesper Staff', type: 'weapon', system: { type: { value: 'simpleM', baseItem: 'quarterstaff' } }, activities: [{ id: 'atk', type: 'attack' }] });
  t.same('… a named weapon: its own name ahead of its base', subjectOfItem(named, { activity: act(named) }).keys, ['weapon:vesper-staff/attack', 'weapon:vesper-staff', 'weapon:quarterstaff/attack', 'weapon:quarterstaff']);
  t.same('a natural weapon is natural', subjectOfItem(bite, { activity: act(bite) }).keys, ['natural:bite/attack', 'natural:bite']);
  t.same("a spell: dnd5e's identifier, then the slug of its name", subjectOfItem(fireBolt, { activity: act(fireBolt) }).keys, ['spell:fire-bolt/attack', 'spell:fire-bolt']);
  t.same('a feature', subjectOfItem(secondWind).keys, ['feature:second-wind']);
  t.same('a consumable is an item', subjectOfItem(arrows).keys, ['item:arrow-1']);
  t.same('a cast activity puts the linked spell first', subjectOfItem(wand, { activity: act(wand) }).keys.slice(0, 2), ['spell:fire-bolt/cast', 'spell:fire-bolt']);
  t.same('ammunition fired comes before the weapon', subjectOfItem(bow, { activity: act(bow), ammunition: arrows }).keys.slice(0, 2), ['item:arrow-1', 'weapon:longbow/attack']);
  const withAmmo = readMessage(rolled(bow, 'attack', { roll: { type: 'attack', ammunition: 'arrows' }, targets: [{ actor: goblin, ac: 10 }] }));
  t.same("… read off the attack roll's ammunition flag", withAmmo.subject.keys[0], 'item:arrow-1');
  t.is('… but only on an attack roll', readMessage(rolled(holdPerson, 'damage', { roll: { type: 'damage', ammunition: 'arrows' } })).subject.ammunition ?? null, null);
  t.is('a reach weapon says so', subjectOfItem(glaive).reach, true);
  t.is('… and a plain one does not', subjectOfItem(bow).reach, false);
  t.is("the item's uuid rides along", subjectOfItem(bow).uuid, bow.uuid);
  const pointed = W.item(caster, { id: 'sword', name: 'First Light', type: 'weapon', flags: { 'fvtt-mod-fxstudio': { fx: 'first-light' } }, activities: [{ id: 'atk', type: 'attack' }] });
  t.is("an item's own FX (the pointer flag) is on the subject, ahead of every key", subjectOfItem(pointed).pointer, 'first-light');
  t.is('… and absent when the flag is empty', subjectOfItem(W.item(caster, { id: 'p2', name: 'Plain', flags: { 'fvtt-mod-fxstudio': { fx: '' } } })).pointer, undefined);
  t.is('no item: no subject', subjectOfItem(null), null);
  const qualified = W.item(goblin, { id: 'ms', name: 'Misty Step - Spellcasting', type: 'spell' });
  t.same("an NPC's qualified spell name keys by its own name first", subjectOfItem(qualified).keys, ['spell:misty-step-spellcasting', 'spell:misty-step']);
  const m = readMessage(usage(mistyStep));
  t.same('a moment carries what a gate asks by: the activity uuid and the flags', [m.activity, Object.keys(m.flags)], [act(mistyStep).uuid, ['dnd5e']]);
  t.same("… the item's uuid as the origin, the message id, the author", [m.origin, m.id, m.user], [mistyStep.uuid, m.id, 'gm']);
}

// ---------------------------------------------------------------------------------------------
if (t.section('a placed template: the Region is the moment, with the user\'s targets')) {
  gm.targets = new Set([goblin.tokens[0]]);
  const region = W.template(act(fireball), { type: 'circle', distance: 20 });
  const m = readRegion(region);
  t.same('a template with a dnd5e origin is a use of its spell', [m.when, m.kind, m.subject.keys[0]], ['use', 'template', 'spell:fireball/save']);
  t.same("the caster's token is the source; the user's targets are the targets", [m.source.name, m.targets.map((x) => x.token.name)], ['Aria', ['Goblin']]);
  t.same('the Region is the place and what persistent pictures are tied to', [m.place, m.tie], [region, region]);
  t.same('the activity and the flags ride along for a gate', [m.activity, m.flags.dnd5e.origin], [act(fireball).uuid, act(fireball).uuid]);
  gm.targets = new Set();
  t.same('no targets: none', readRegion(W.template(act(fireball))).targets, []);
  t.is('a Region with no dnd5e origin is not a moment', readRegion({ id: 'r', flags: {} }), null);
  t.is('an origin that no longer resolves: skipped', readRegion({ id: 'r', flags: { dnd5e: { origin: 'Actor.x.Item.y.Activity.z' } } }).skip, 'the template names no item');
}

// ---------------------------------------------------------------------------------------------
if (t.section('an active effect: its own name, then what made it')) {
  const bless = W.effect(caster, { id: 'bless', name: 'Bless', origin: holdPerson.uuid });
  const m = readEffect(bless);
  t.same('an effect on an actor is an effect moment on its token', [m.when, m.kind, m.source.name, m.targets.map((x) => x.token.name)], ['effect', 'effect', 'Aria', ['Aria']]);
  t.same("keyed by the effect's own name, then its origin's keys", m.subject.keys, ['effect:bless', 'spell:hold-person']);
  t.same('the effect is the tie and the origin; it has no activity', [m.tie, m.origin, m.activity], [bless, bless.uuid, null]);
  const onItem = W.effect(bow, { id: 'sharp', name: 'Sharpened' });
  t.is("an effect on an item is a moment on the item's actor", readEffect(onItem).source.name, 'Aria');
  t.same('… keyed by its name alone when it has no origin', readEffect(onItem).subject.keys, ['effect:sharpened']);
  t.is('an effect on an actor with no token: skipped', readEffect(W.effect(ghost, { id: 'e', name: 'Haunted' })).skip, 'no token for the effect');
  t.is('an effect with no actor at all is not a moment', readEffect({ parent: null, name: 'x' }), null);
  const fromEffect = W.effect(caster, { id: 'e2', name: 'Blinded', origin: bless.uuid });
  t.same('an origin that is not an item gives no origin keys', subjectOfEffect(fromEffect).keys, ['effect:blinded']);
}

// ---------------------------------------------------------------------------------------------
if (t.section('who plays: the author when connected, else the first active GM')) {
  const gm2 = W.user({ id: 'a-gm', name: 'Second GM', isGM: true });
  W.as(gm);
  t.is('the message\'s author plays it', electedFor({ author: gm }), true);
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
  t.same('the reader listens to messages, templates and effects', [...hooks.keys()].sort(), ['createActiveEffect', 'createChatMessage', 'createRegion', 'updateActiveEffect']);
  hooks.get('createChatMessage')(usage(mistyStep));
  t.same('an elected message is dispatched as its moment', [dispatched.length, dispatched[0]?.subject.name], [1, 'Misty Step']);
  hooks.get('createChatMessage')(usage(mistyStep, { author: player }));
  t.is("another connected user's message is theirs to play", dispatched.length, 1);
  hooks.get('createChatMessage')(usage(bow));
  t.is('a skipped message is logged, not dispatched', dispatched.length, 1);
  hooks.get('createChatMessage')({ id: 'x', author: gm, flags: {} });
  t.is('a message that is no moment is nothing', dispatched.length, 1);
  await t.step('the template hook', async () => {
    const region = W.template(act(fireball));
    await hooks.get('createRegion')(region, {}, gm.id);
    t.same('a template I placed is dispatched after half a second for the Region to draw', [dispatched.length, dispatched[1]?.kind, dispatched[1]?.place], [2, 'template', region]);
    await hooks.get('createRegion')(W.template(act(fireball)), {}, player.id);
    t.is("a template another user placed is theirs", dispatched.length, 2);
    await hooks.get('createRegion')({ id: 'r', flags: {} }, {}, gm.id);
    t.is('a Region that is no template is nothing', dispatched.length, 2);
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
