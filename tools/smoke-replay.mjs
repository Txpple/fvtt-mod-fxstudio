// The replay suite: one FX of every shape and moment, driven through the real dnd5e flows on
// the sandbox (attack rolls, damage rolls, activity use, placed templates, active effects), and
// what FX Studio played read back from its ledger and from Sequencer's effect manager. Run with
// `--watch` (a pause after each play, milliseconds, default 4000) from a second client on the
// sandbox to watch it.
//
// Builds its own fixture (tools/lib/suite.mjs) and tears it down; deletes its own messages.
//
//   node tools/smoke-replay.mjs                the whole suite
//   node tools/smoke-replay.mjs --section 3    just §3 (fixture and teardown always run)
//   node tools/smoke-replay.mjs --list
//   node tools/smoke-replay.mjs --watch 5000   pause 5 s after every play so a watcher can see it
import { connectSandbox } from './lib/foundry.mjs';
import { announce, fixtureDown, fixtureUp, report, sectionPlan } from './lib/suite.mjs';

const SECTIONS = {
  1: 'the strike: Longsword at an adjacent target, a hit (AC 1) and a miss (AC 99) — the ledger knows which; keyed weapon:longsword, played from JB2A\'s own path',
  2: 'the thrown flight: Dagger at a target six squares away plays the thrown dagger, not the swing',
  3: 'the bolt: Fire Bolt, a hit and a miss, with its PSFX sound; keyed spell:fire-bolt',
  4: 'a mark from a use: Charm Person (no damage, no template) plays on the target with its follow-up mark from the usage card',
  5: 'the damage roll: Sacred Flame (a save, no template) plays on the damage roll, not on use',
  6: 'fills: Burning Hands (cone), Lightning Bolt (line), Grease (rectangle) and Cloud of Daggers (circle, persistent, attached: gone when the template is deleted)',
  7: 'compositions on a template: Fireball (a bolt to the template, then the burst) and Thunderwave (the picture picked by where the template sits)',
  8: 'the beam: Witch Bolt stands on the caster, stretched to the target, until ended',
  9: 'the move: Misty Step (the house fx) with a destination given — the token appears there; the teleport crosses a movement wall (displace), a sight wall refuses it, an FX that need not see crosses it, a creature on the spot refuses it',
  10: 'active effects: Barkskin (a shield, two halves, persistent) appears on create, ends on disable, returns on enable, ends on delete; Bless is an aura',
  11: 'the play switch: off, nothing plays and the ledger says so; on again',
  12: 'no FX: an ability with no FX plays nothing and the ledger lists its keys',
  13: 'identity over names: a "Maul of Momentum" plays the maul fx by its base weapon; a Shield spell plays nothing (no bash)',
  14: 'the heal: Cure Wounds plays on its healing roll (dnd5e flags it "healing", not "damage"), on the target when one is aimed and on the caster when none is',
};
const DEPENDS = {};
const ITEMS = ['Longsword', 'Dagger', 'Fire Bolt', 'Charm Person', 'Sacred Flame', 'Burning Hands', 'Lightning Bolt', 'Grease', 'Cloud of Daggers', 'Fireball', 'Thunderwave', 'Witch Bolt', 'Misty Step', 'Barkskin', 'Bless', 'Maul', 'Shield', 'Cure Wounds'];

const { plan, pulled, watch } = sectionPlan(SECTIONS, DEPENDS);
const { f, dispose } = await connectSandbox({ tag: 'replay', watchdogMs: 900_000 });
announce('replay', plan, pulled);
let fixture = null;
const since = Date.now();
try {
  fixture = await f.evaluate(fixtureUp, { items: ITEMS });
  console.log(`[replay] fixture: caster ${fixture.casterTokenId}, target ${fixture.targetTokenId}; items added ${fixture.added.length}${fixture.missing.length ? `, MISSING from the packs: ${fixture.missing.join(', ')}` : ''}`);

  const out = await f.evaluate(async ({ sections, titles, fx, watch }) => {
    const MOD = 'fvtt-mod-fxstudio';
    const api = game.modules.get(MOD).api;
    const results = [];
    const skips = [];
    const errors = [];
    const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });
    const want = (id) => { if (!sections || sections.includes(String(id))) return true; skips.push(`§${id} ${titles?.[id] ?? ''}`); return false; };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const origError = console.error;
    console.error = (...args) => { errors.push(args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' ').slice(0, 800)); origError(...args); };
    const caster = canvas.tokens.get(fx.casterTokenId);
    const target = canvas.tokens.get(fx.targetTokenId);
    const item = (name) => caster.actor.items.getName(name);
    const activityOf = (name, type) => { const it = item(name); return it ? (type ? it.system.activities.find((a) => a.type === type) : it.system.activities.contents[0]) : null; };
    const aim = async (on = true) => { await target.setTarget(on, { user: game.user, releaseOthers: true }); await sleep(100); };
    const setAC = async (v) => target.actor.update({ 'system.attributes.ac.flat': v });
    // ⚠ Foundry 14 animates the token DOCUMENT's coordinates through a move: wait for the landing
    const moveTo = async (token, x, y = token.document.y) => { await token.document.update({ x, y }, { animate: false }); for (let i = 0; i < 40 && (token.document.x !== x || token.document.y !== y); i++) await sleep(100); await sleep(150); };
    const ledgerFor = (id) => api.ledger.find((e) => e.id === id);
    const settle = async () => { await sleep(1400 + watch); };
    const effectsOn = (token, origin) => Sequencer.EffectManager.getEffects({ object: token, ...(origin ? { origin } : {}) });
    const rollAttack = async (name) => { const a = activityOf(name, 'attack'); const before = game.messages.size; await a.rollAttack({}, { configure: false }, {}); await settle(); const m = game.messages.contents.slice(before).find((x) => x.flags?.dnd5e?.roll?.type === 'attack'); return { m, e: m ? ledgerFor(m.id) : null }; };
    const rollDamage = async (name) => { const a = activityOf(name); const before = game.messages.size; await a.rollDamage({}, { configure: false }, {}); await settle(); const m = game.messages.contents.slice(before).find((x) => ['damage', 'healing'].includes(x.flags?.dnd5e?.roll?.type)); return { m, e: m ? ledgerFor(m.id) : null }; };
    const useIt = async (name) => { const a = activityOf(name); const before = game.messages.size; await a.use({ consume: false, create: { measuredTemplate: false } }, { configure: false }, {}); await settle(); const m = game.messages.contents.slice(before).find((x) => x.type === 'usage'); return { m, e: m ? ledgerFor(m.id) : null }; };
    const placeTemplate = async (name, data) => { const a = activityOf(name); const [doc] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ ...data, flags: { dnd5e: { origin: a.uuid, item: a.item.uuid } } }]); await sleep(600); await settle(); const region = canvas.scene.regions.get(doc.id) ?? doc; return { region, e: ledgerFor(region.id) }; };
    const removeTemplate = async (region) => { if (canvas.scene.regions.get(region.id)) await canvas.scene.deleteEmbeddedDocuments('Region', [region.id]); await sleep(600); };
    const files = (e) => (e?.files ?? []).flat().join(', ');
    const named = (e, part) => (e?.files ?? []).flat().some((p) => String(p).includes(part));
    const usage = async (it) => { const before = game.messages.size; const m = await ChatMessage.create({ type: 'usage', speaker: ChatMessage.getSpeaker({ actor: caster.actor }), content: it.name, flags: { dnd5e: { activity: { uuid: `${it.uuid}.Activity.none`, type: 'utility', id: 'none' }, item: { uuid: it.uuid, id: it.id, type: it.type }, targets: [] } } }); await settle(); void before; return { m, e: ledgerFor(m.id) }; };

    const startAC = target.actor.system.attributes.ac.flat;
    try {
      if (want(1)) {
        await aim();
        await setAC(1);
        await moveTo(target, 600);
        let hit = await rollAttack('Longsword');
        for (let i = 0; i < 3 && hit.m?.rolls?.[0]?.isFumble; i++) hit = await rollAttack('Longsword'); // a natural 1 misses AC 1: roll again
        let { e } = hit;
        ok('§1 Longsword hit: the longsword fx answered by weapon:longsword, from JB2A\'s own path', e?.fx === 'longsword' && e.key === 'weapon:longsword' && named(e, 'jb2a.sword.melee'), `${e?.fx} (${e?.key}) ${files(e)}`);
        ok('§1 Longsword hit: the ledger marks the target hit', e?.targets?.[0]?.hit === true, JSON.stringify(e?.targets));
        ok('§1 Longsword hit: the PSFX sound came with it', e?.sounds?.[0]?.startsWith('psfx.'), e?.sounds?.join(', '));
        await setAC(99);
        let miss = await rollAttack('Longsword');
        for (let i = 0; i < 3 && miss.m?.rolls?.[0]?.isCritical; i++) miss = await rollAttack('Longsword'); // a natural 20 hits AC 99: roll again
        ({ e } = miss);
        ok('§1 Longsword miss: the swing still plays (as a miss)', e?.fx === 'longsword' && e.played, files(e));
        ok('§1 Longsword miss: the ledger marks no hit', e?.targets?.[0]?.hit === false, JSON.stringify(e?.targets));
        await setAC(1);
        await moveTo(target, 1100);
      }
      if (want(2)) {
        await aim();
        await moveTo(target, 1100);
        const { e } = await rollAttack('Dagger');
        ok('§2 Dagger at six squares: the thrown dagger flies', e?.fx === 'dagger' && named(e, 'jb2a.dagger.throw'), files(e));
        await moveTo(target, 600);
        const near = await rollAttack('Dagger');
        ok('§2 Dagger adjacent: the swing plays', named(near.e, 'jb2a.dagger.melee'), files(near.e));
        await moveTo(target, 1100);
      }
      if (want(3)) {
        await aim();
        await setAC(1);
        let { e } = await rollAttack('Fire Bolt');
        ok('§3 Fire Bolt hit: keyed spell:fire-bolt, the bolt and its sound', e?.fx === 'fire-bolt' && e.key?.startsWith('spell:fire-bolt') && named(e, 'jb2a.fire_bolt') && e.sounds.length === 1, `${e?.key} ${files(e)} + ${e?.sounds}`);
        await setAC(99);
        ({ e } = await rollAttack('Fire Bolt'));
        ok('§3 Fire Bolt miss: played as a miss', e?.played && e.targets?.[0]?.hit === false, JSON.stringify(e?.targets));
        await setAC(1);
      }
      if (want(4)) {
        await aim();
        const { m, e } = await useIt('Charm Person');
        ok('§4 Charm Person: the usage card is the moment', !!m && !!e, m ? `message ${m.id}` : 'no usage message');
        ok('§4 Charm Person: a mark on the target with its follow-up mark (two files)', e?.fx === 'charm-person' && e.files.length === 2, files(e));
      }
      if (want(5)) {
        await aim();
        const used = await useIt('Sacred Flame');
        ok('§5 Sacred Flame: the usage card plays nothing (it has damage)', !used.e, used.e ? `ledger: ${used.e.fx}` : 'no ledger entry for the card');
        const { e } = await rollDamage('Sacred Flame');
        ok('§5 Sacred Flame: the damage roll plays the FX', e?.fx === 'sacred-flame' && e.played, files(e));
      }
      if (want(6)) {
        await aim(false);
        let t = await placeTemplate('Burning Hands', { t: 'cone', distance: 15, direction: 0, x: 600, y: 550, angle: 53.13 });
        ok('§6 Burning Hands: the cone fills', t.e?.fx === 'burning-hands' && t.e.played, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Lightning Bolt', { t: 'ray', distance: 100, width: 5, direction: 0, x: 600, y: 550 });
        ok('§6 Lightning Bolt: the line fills', t.e?.fx === 'lightning-bolt' && t.e.played, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Grease', { t: 'rect', distance: 14.14, direction: 45, x: 1000, y: 400 });
        ok('§6 Grease: the rectangle fills', t.e?.fx === 'grease' && t.e.played, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Cloud of Daggers', { t: 'circle', distance: 5, x: 1100, y: 500 });
        ok('§6 Cloud of Daggers: the circle fills, persistent', t.e?.fx === 'cloud-of-daggers' && t.e.played, files(t.e));
        const standing = Sequencer.EffectManager.getEffects({ origin: item('Cloud of Daggers')?.uuid }).length;
        ok('§6 Cloud of Daggers: a Sequencer effect stands with the item as its origin', standing > 0, `${standing} effect(s)`);
        await removeTemplate(t.region);
        await sleep(800);
        const after = Sequencer.EffectManager.getEffects({ origin: item('Cloud of Daggers')?.uuid }).length;
        ok('§6 Cloud of Daggers: deleting the template ends it', after === 0, `${after} effect(s) left`);
      }
      if (want(7)) {
        await aim(false);
        let t = await placeTemplate('Fireball', { t: 'circle', distance: 20, x: 1100, y: 500 });
        ok('§7 Fireball: the bolt to the template, then the burst', t.e?.fx === 'fireball' && t.e.files.length >= 2 && named(t.e, 'jb2a.fireball'), files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Thunderwave', { t: 'rect', distance: 21.21, direction: 45, x: 600, y: 400 });
        ok('§7 Thunderwave: the square right of the caster picks a mid shape from JB2A', t.e?.fx === 'thunderwave' && /jb2a\.thunderwave\.(center|bottom_middle|bottom_left)\./.test(t.e.files[0] ?? ''), files(t.e));
        await removeTemplate(t.region);
      }
      if (want(8)) {
        await aim();
        const { e } = await rollAttack('Witch Bolt');
        ok('§8 Witch Bolt: the beam fx answered (the composition beats the plain bolt)', e?.fx === 'witch-bolt' && named(e, 'jb2a.witch_bolt'), `${e?.fx} ${files(e)}`);
        const standing = effectsOn(caster, item('Witch Bolt')?.uuid).length;
        ok('§8 Witch Bolt: the beam stands on the caster', standing > 0, `${standing} effect(s)`);
        Sequencer.EffectManager.endEffects({ origin: item('Witch Bolt')?.uuid });
        await sleep(400);
      }
      if (want(9)) {
        await aim(false);
        const it = item('Misty Step');
        const before = { x: caster.document.x, y: caster.document.y };
        // the token is placed a second after the pictures end: wait for the landing (or for a refusal to stand) before measuring
        const play = async (destination, extra = {}) => { const moment = { when: 'use', kind: 'use', subject: api.subjects.ofItem(it), source: caster, targets: [], origin: it?.uuid ?? 'test', id: `replay-move-${Date.now()}`, destination }; const e = await api.play(moment, extra); const want = canvas.grid.getTopLeftPoint(destination); for (let i = 0; i < 60 && e.played && (caster.document.x !== want.x || caster.document.y !== want.y); i++) await sleep(100); await sleep(1500 + watch); return e; };
        let e = await play({ x: 350, y: 850 });
        ok('§9 Misty Step: the house fx played the move', e?.fx === 'misty-step' && e.source === 'house' && e.played, `${e?.source} ${files(e)}`);
        ok('§9 Misty Step: the token moved to the destination', caster.document.x === 300 && caster.document.y === 800, `${caster.document.x},${caster.document.y}`);
        ok('§9 the sentence says what the spot must be', /an unoccupied space they can see/.test(api.sentenceFor(it).sentence), api.sentenceFor(it).sentence);
        await moveTo(caster, before.x, before.y);
        // the teleport's words, judged before the token moves (Misc Patches' teleport patch, carried here 2026-09-06)
        const g = canvas.grid.size;
        const cx = before.x, cy = before.y;
        const destX = cx + 4 * g;
        const wallX = cx + 2 * g + g / 2;
        const raise = async (sight) => { const [w] = await canvas.scene.createEmbeddedDocuments('Wall', [{ c: [wallX, cy - 2 * g, wallX, cy + 3 * g], move: 20, sight }]); await sleep(300); return w.id; };
        const lower = async (id) => { if (canvas.scene.walls.get(id)) await canvas.scene.deleteEmbeddedDocuments('Wall', [id]); await sleep(300); };
        // home again with a displace move: a plain move would be walked into the suite's own wall
        const home = async () => { for (let tries = 0; tries < 4; tries++) { await caster.document.move([{ x: cx, y: cy, action: 'displace' }], { animate: false }); for (let i = 0; i < 30 && (caster.document.x !== cx || caster.document.y !== cy); i++) await sleep(100); if (caster.document.x === cx && caster.document.y === cy) break; await sleep(500); } await sleep(150); };
        let wallId = await raise(0);
        try {
          e = await play({ x: destX + 10, y: cy + 10 });
          ok('§9 a wall that blocks movement only: the teleport crosses it (Foundry\'s own displace action, no walk)', e.played && caster.document.x === destX && caster.document.y === cy, `${e.why || 'played'} · at ${caster.document.x},${caster.document.y}`);
          await home();
          await lower(wallId); wallId = await raise(20);
          e = await play({ x: destX + 10, y: cy + 10 });
          ok('§9 a sight-blocking wall between: refused ("a space you can see"), the token where it was, the ledger says why', !e.played && /space you can see/.test(e.why ?? '') && caster.document.x === cx, `${e.why} · at ${caster.document.x}`);
          const noSight = api.fx.expand({ id: 'replay-no-sight', like: 'misty-step' });
          for (const sc of noSight.scenes) if (sc.shape === 'move') sc.seen = false;
          e = await play({ x: destX + 10, y: cy + 10 }, { fx: noSight });
          ok('§9 an FX whose spot need not be seen (Dimension Door\'s words) crosses the sight wall', e.played && caster.document.x === destX, `${e.why || 'played'} · at ${caster.document.x}`);
          await home();
        } finally { await lower(wallId); }
        const tb = { x: target.document.x, y: target.document.y };
        await moveTo(target, destX, cy);
        e = await play({ x: destX + 10, y: cy + 10 });
        ok('§9 a creature standing on the spot: refused ("an unoccupied space")', !e.played && /unoccupied space/.test(e.why ?? '') && caster.document.x === cx, `${e.why} · at ${caster.document.x}`);
        await moveTo(target, tb.x, tb.y);
        await home();
      }
      if (want(10)) {
        const mk = async (name) => { const [eff] = await target.actor.createEmbeddedDocuments('ActiveEffect', [{ name, img: 'icons/svg/aura.svg', origin: target.actor.uuid }]); await sleep(1200 + watch); return eff; };
        const eff = await mk('Barkskin');
        let e = ledgerFor(eff.id);
        ok('§10 Barkskin created: the shield fx plays on the token, bottom and top halves', e?.fx === 'barkskin' && e.key === 'effect:barkskin' && e.files.length === 2, `${e?.key} ${files(e)}`);
        ok('§10 Barkskin: a persistent picture stands with the effect as its origin', effectsOn(target, eff.uuid).length > 0, `${effectsOn(target, eff.uuid).length}`);
        await eff.update({ disabled: true });
        await sleep(700);
        ok('§10 Barkskin disabled: the picture ends', effectsOn(target, eff.uuid).length === 0, `${effectsOn(target, eff.uuid).length}`);
        await eff.update({ disabled: false });
        await sleep(1200 + watch);
        ok('§10 Barkskin enabled again: it returns', effectsOn(target, eff.uuid).length > 0, `${effectsOn(target, eff.uuid).length}`);
        await eff.delete();
        await sleep(700);
        ok('§10 Barkskin deleted: the picture is gone (tied to the document)', effectsOn(target, eff.uuid).length === 0, `${effectsOn(target, eff.uuid).length}`);
        const bless = await mk('Bless');
        e = ledgerFor(bless.id);
        ok('§10 Bless created: the aura plays', e?.fx === 'bless' && e.played && named(e, 'jb2a.bless'), files(e));
        ok('§10 Bless: the aura stands on the token', effectsOn(target, bless.uuid).length > 0, `${effectsOn(target, bless.uuid).length}`);
        await bless.delete();
        await sleep(600);
      }
      if (want(11)) {
        await aim();
        await game.settings.set(MOD, 'play', false);
        const { e } = await rollAttack('Fire Bolt');
        ok('§11 play off: nothing plays and the ledger says why', e && !e.fx && /switched off/.test(e.why), e?.why);
        await game.settings.set(MOD, 'play', true);
        const on = await rollAttack('Fire Bolt');
        ok('§11 play on: it plays again', on.e?.played, files(on.e));
      }
      if (want(12)) {
        await aim();
        const [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'feat', system: {} }]);
        const { e } = await usage(tmp);
        ok('§12 no FX: the ledger lists the ability with its keys and "no FX"', e && !e.fx && /no FX/.test(e.why) && e.keys.includes('feature:sharran-step'), `${e?.why} · ${e?.keys?.join(', ')}`);
        await tmp.delete();
      }
      if (want(13)) {
        await aim();
        await setAC(1);
        await moveTo(target, 600);
        const maul = item('Maul');
        await maul.update({ name: 'Maul of Momentum' });
        const { e } = await rollAttack('Maul of Momentum');
        ok('§13 Maul of Momentum: the maul fx answers by the base weapon (AA played nothing)', e?.fx === 'maul' && e.key === 'weapon:maul' && e.played, `${e?.fx} (${e?.key}) ${files(e)}`);
        await maul.update({ name: 'Maul' });
        await moveTo(target, 1100);
        const shield = item('Shield');
        const s = shield ? await usage(shield) : { e: null };
        ok('§13 the Shield spell: keyed spell:shield, plays nothing (AA played the shield bash)', shield && s.e && !s.e.fx && s.e.keys[0]?.startsWith('spell:shield'), shield ? `${s.e?.why} · ${s.e?.keys?.join(', ')}` : 'no Shield spell in the packs');
      }
      if (want(14)) {
        await aim();
        const used = await useIt('Cure Wounds');
        ok('§14 Cure Wounds: the usage card plays nothing (it heals)', !used.e, used.e ? `ledger: ${used.e.fx}` : 'no ledger entry for the card');
        const aimed = await rollDamage('Cure Wounds');
        ok('§14 Cure Wounds: the healing roll plays the FX on the target', aimed.m?.flags?.dnd5e?.roll?.type === 'healing' && aimed.e?.fx === 'cure-wounds' && aimed.e.played && aimed.e.targets?.[0]?.name === target.name, `${aimed.m?.flags?.dnd5e?.roll?.type} · ${aimed.e?.fx} on ${aimed.e?.targets?.map((t) => t.name).join(', ')} ${files(aimed.e)}`);
        await aim(false);
        const alone = await rollDamage('Cure Wounds');
        ok('§14 Cure Wounds with nothing targeted: the healing roll plays the FX on the caster', alone.e?.fx === 'cure-wounds' && alone.e.played && !alone.e.targets?.length, `${alone.e?.fx} ${alone.e?.why || ''} ${files(alone.e)}`);
      }
    } finally {
      await setAC(startAC);
      await aim(false);
      await game.settings.set(MOD, 'play', true);
      console.error = origError;
    }
    return { results, skips, errors };
  }, { sections: plan, titles: SECTIONS, fx: fixture, watch });
  report('replay', out, plan);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[replay] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
