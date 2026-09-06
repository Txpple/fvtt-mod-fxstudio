// The replay suite: one row of every menu type and family, driven through the real dnd5e flows on
// the sandbox (attack rolls, damage rolls, activity use, placed templates, active effects), and
// what FX Studio played read back from its ledger and from Sequencer's effect manager. With
// Automated Animations still on, every action here plays under both modules at once, side by
// side, which is the phase 1 exit the user judges by eye: run with `--watch` (a pause after each
// play, milliseconds, default 4000) from a second client on the sandbox and watch.
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
  1: 'the swing: Longsword at an adjacent target, a hit (AC 1) and a miss (AC 99) — the ledger knows which, the same swing plays from the private twin',
  2: 'the thrown switch: Dagger at a target six squares away plays the ranged dagger, not the swing',
  3: 'the projectile: Fire Bolt, a hit and a miss, with its PSFX sound',
  4: 'on a token from a use: Charm Person (no damage, no template) plays on the target with its secondary layer from the usage card',
  5: 'the damage roll: Sacred Flame (a save, no template) plays on the damage roll, not on use',
  6: 'templates: Burning Hands (cone), Lightning Bolt (ray), Grease (square) and Cloud of Daggers (circle, persistent, attached: gone when the template is deleted)',
  7: 'the presets on a template: Fireball (projectile to template) and Thunderwave (position picks the shape)',
  8: 'dual attach: Witch Bolt stands on the caster, stretched to the target, until ended',
  9: 'teleport: Misty Step (the house row, blue) with a destination given — the token moves there',
  10: 'active effects: Barkskin (a shield look, persistent) appears on create, ends on disable, returns on enable, ends on delete; Bless is an aura',
  11: 'the play switch: off, nothing plays and the ledger says so; on again',
  12: 'no row: an ability with no look plays nothing and the ledger lists it',
};
const DEPENDS = {};
const ITEMS = ['Longsword', 'Dagger', 'Fire Bolt', 'Charm Person', 'Sacred Flame', 'Burning Hands', 'Lightning Bolt', 'Grease', 'Cloud of Daggers', 'Fireball', 'Thunderwave', 'Witch Bolt', 'Misty Step', 'Barkskin', 'Bless'];

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
    // ⚠ Foundry 14 animates the token DOCUMENT's coordinates through a move, so an update returns
    // while x is still travelling; a swing measured then sees a target six squares away
    const moveTo = async (token, x, y = token.document.y) => { await token.document.update({ x, y }, { animate: false }); for (let i = 0; i < 40 && (token.document.x !== x || token.document.y !== y); i++) await sleep(100); await sleep(150); };
    const ledgerFor = (id) => api.ledger.find((e) => e.id === id);
    const settle = async () => { await sleep(1400 + watch); };
    const effectsOn = (token, origin) => Sequencer.EffectManager.getEffects({ object: token, ...(origin ? { origin } : {}) });
    const rollAttack = async (name) => { const a = activityOf(name, 'attack'); const before = game.messages.size; await a.rollAttack({}, { configure: false }, {}); await settle(); const m = game.messages.contents.slice(before).find((x) => x.flags?.dnd5e?.roll?.type === 'attack'); return { m, e: m ? ledgerFor(m.id) : null }; };
    const rollDamage = async (name) => { const a = activityOf(name); const before = game.messages.size; await a.rollDamage({}, { configure: false }, {}); await settle(); const m = game.messages.contents.slice(before).find((x) => x.flags?.dnd5e?.roll?.type === 'damage'); return { m, e: m ? ledgerFor(m.id) : null }; };
    const useIt = async (name) => { const a = activityOf(name); const before = game.messages.size; await a.use({ consume: false, create: { measuredTemplate: false } }, { configure: false }, {}); await settle(); const m = game.messages.contents.slice(before).find((x) => x.type === 'usage'); return { m, e: m ? ledgerFor(m.id) : null }; };
    const placeTemplate = async (name, data) => { const a = activityOf(name); const [doc] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ ...data, flags: { dnd5e: { origin: a.uuid, item: a.item.uuid } } }]); await sleep(600); await settle(); const region = canvas.scene.regions.get(doc.id) ?? doc; return { region, e: ledgerFor(region.id) }; };
    const removeTemplate = async (region) => { if (canvas.scene.regions.get(region.id)) await canvas.scene.deleteEmbeddedDocuments('Region', [region.id]); await sleep(600); };
    const files = (e) => (e?.files ?? []).join(', ');
    const twinPath = (e, part) => (e?.files ?? []).some((p) => p.startsWith('fxstudio.aa.') && p.includes(part));

    const startAC = target.actor.system.attributes.ac.flat;
    try {
      if (want(1)) {
        await aim();
        await setAC(1);
        await moveTo(target, 600);
        let { e } = await rollAttack('Longsword');
        ok('§1 Longsword hit: a melee-swing row answered from the private twin', e?.matched === 'Longsword' && e.preset === 'melee-swing' && twinPath(e, 'melee.weapon.sword'), files(e));
        ok('§1 Longsword hit: the ledger marks the target hit', e?.hits?.includes(target.id), JSON.stringify(e?.hits));
        ok('§1 Longsword hit: the PSFX sound came with it', e?.sounds?.[0]?.startsWith('psfx.'), e?.sounds?.join(', '));
        await setAC(99);
        ({ e } = await rollAttack('Longsword'));
        ok('§1 Longsword miss: the swing still plays (as a miss)', e?.matched === 'Longsword' && e.played, files(e));
        ok('§1 Longsword miss: the ledger marks no hit', Array.isArray(e?.hits) && e.hits.length === 0, JSON.stringify(e?.hits));
        await setAC(1);
        await moveTo(target, 1100);
      }
      if (want(2)) {
        await aim();
        await moveTo(target, 1100);
        const { e } = await rollAttack('Dagger');
        ok('§2 Dagger at six squares: the thrown switch plays the ranged dagger', e?.matched === 'Dagger' && twinPath(e, 'range.weapon.dagger'), files(e));
        await moveTo(target, 600);
        const far = await rollAttack('Dagger');
        ok('§2 Dagger adjacent: the swing plays', twinPath(far.e, 'melee.weapon.dagger'), files(far.e));
        await moveTo(target, 1100);
      }
      if (want(3)) {
        await aim();
        await setAC(1);
        let { e } = await rollAttack('Fire Bolt');
        ok('§3 Fire Bolt hit: the projectile row from the private twin, sound and all', e?.matched === 'Fire Bolt' && e.preset === 'projectile' && twinPath(e, 'range.spell.firebolt') && e.sounds.length === 1, `${files(e)} + ${e?.sounds}`);
        await setAC(99);
        ({ e } = await rollAttack('Fire Bolt'));
        ok('§3 Fire Bolt miss: played as a miss', e?.played && e.hits?.length === 0, JSON.stringify(e?.hits));
        await setAC(1);
      }
      if (want(4)) {
        await aim();
        const { m, e } = await useIt('Charm Person');
        ok('§4 Charm Person: the usage card is the moment', !!m && !!e, m ? `message ${m.id}` : 'no usage message');
        ok('§4 Charm Person: on-token on the target with its secondary layer (two files)', e?.preset === 'on-token' && e.files.length === 2, files(e));
      }
      if (want(5)) {
        await aim();
        const used = await useIt('Sacred Flame');
        ok('§5 Sacred Flame: the usage card plays nothing (it has damage)', !used.e, used.e ? `ledger: ${used.e.matched}` : 'no ledger entry for the card');
        const { e } = await rollDamage('Sacred Flame');
        ok('§5 Sacred Flame: the damage roll plays the row', e?.matched === 'Sacred Flame' && e.played, files(e));
      }
      if (want(6)) {
        await aim(false);
        let t = await placeTemplate('Burning Hands', { t: 'cone', distance: 15, direction: 0, x: 600, y: 550, angle: 53.13 });
        ok('§6 Burning Hands: the cone template plays the templatefx row', t.e?.matched === 'Burning Hands' && t.e.preset === 'template' && t.e.played, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Lightning Bolt', { t: 'ray', distance: 100, width: 5, direction: 0, x: 600, y: 550 });
        ok('§6 Lightning Bolt: the ray plays', t.e?.matched === 'Lightning Bolt' && t.e.played, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Grease', { t: 'rect', distance: 14.14, direction: 45, x: 1000, y: 400 });
        ok('§6 Grease: the square plays', t.e?.matched === 'Grease' && t.e.played, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Cloud of Daggers', { t: 'circle', distance: 5, x: 1100, y: 500 });
        ok('§6 Cloud of Daggers: the circle plays, persistent', t.e?.matched === 'Cloud of Daggers' && t.e.played, files(t.e));
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
        ok('§7 Fireball: projectile to template — the beam, the explosion', t.e?.matched === 'Fireball' && t.e.preset === 'projectile-to-template' && t.e.files.length >= 2, files(t.e));
        await removeTemplate(t.region);
        t = await placeTemplate('Thunderwave', { t: 'rect', distance: 21.21, direction: 45, x: 600, y: 400 });
        ok('§7 Thunderwave: the square right of the caster plays a mid shape from the twin', t.e?.matched === 'Thunderwave' && t.e.preset === 'thunderwave' && /thunderwave\.(mid|left|center)\./.test(t.e.files[0] ?? ''), files(t.e));
        await removeTemplate(t.region);
      }
      if (want(8)) {
        await aim();
        const { e } = await rollAttack('Witch Bolt');
        ok('§8 Witch Bolt: the dual-attach preset answered (the exact-match preset row beats the range row)', e?.matched === 'Witch Bolt' && e.preset === 'dual-attach', `${e?.preset} ${files(e)}`);
        const standing = effectsOn(caster, item('Witch Bolt')?.uuid).length;
        ok('§8 Witch Bolt: the beam stands on the caster', standing > 0, `${standing} effect(s)`);
        Sequencer.EffectManager.endEffects({ origin: item('Witch Bolt')?.uuid });
        await sleep(400);
      }
      if (want(9)) {
        await aim(false);
        const it = item('Misty Step');
        const before = { x: caster.document.x, y: caster.document.y };
        const moment = { kind: 'use', on: 'use', names: ['Misty Step'], item: it, activity: null, sourceToken: caster, targets: [], hits: null, origin: it?.uuid ?? 'test', id: 'replay-teleport', destination: { x: 350, y: 850 } };
        const e = await api.play(moment);
        await sleep(1500 + watch);
        ok('§9 Misty Step: the house row (blue) played the teleport', e?.matched === 'Misty Step' && e.source === 'house' && e.preset === 'teleport' && e.played && files(e).includes('blue'), files(e));
        ok('§9 Misty Step: the token moved to the destination', caster.document.x === 300 && caster.document.y === 800, `${caster.document.x},${caster.document.y}`);
        await moveTo(caster, before.x, before.y);
      }
      if (want(10)) {
        const mk = async (name) => { const [eff] = await target.actor.createEmbeddedDocuments('ActiveEffect', [{ name, img: 'icons/svg/aura.svg', origin: target.actor.uuid }]); await sleep(1200 + watch); return eff; };
        const eff = await mk('Barkskin');
        let e = ledgerFor(eff.id);
        ok('§10 Barkskin created: the aefx shield look plays on the token, top and bottom', e?.matched === 'Barkskin' && e.preset === 'on-token' && e.files.length === 2, files(e));
        ok('§10 Barkskin: a persistent effect stands with the effect as its origin', effectsOn(target, eff.uuid).length > 0, `${effectsOn(target, eff.uuid).length}`);
        await eff.update({ disabled: true });
        await sleep(700);
        ok('§10 Barkskin disabled: the effect ends', effectsOn(target, eff.uuid).length === 0, `${effectsOn(target, eff.uuid).length}`);
        await eff.update({ disabled: false });
        await sleep(1200 + watch);
        ok('§10 Barkskin enabled again: it returns', effectsOn(target, eff.uuid).length > 0, `${effectsOn(target, eff.uuid).length}`);
        await eff.delete();
        await sleep(700);
        ok('§10 Barkskin deleted: the effect is gone (tied to the document)', effectsOn(target, eff.uuid).length === 0, `${effectsOn(target, eff.uuid).length}`);
        const bless = await mk('Bless');
        e = ledgerFor(bless.id);
        ok('§10 Bless created: the aura look plays', e?.matched === 'Bless' && e.preset === 'aura' && e.played, files(e));
        ok('§10 Bless: the aura stands on the token', effectsOn(target, bless.uuid).length > 0, `${effectsOn(target, bless.uuid).length}`);
        await bless.delete();
        await sleep(600);
      }
      if (want(11)) {
        await aim();
        await game.settings.set(MOD, 'play', false);
        const { e } = await rollAttack('Fire Bolt');
        ok('§11 play off: nothing plays and the ledger says why', e && !e.matched && /switched off/.test(e.note), e?.note);
        await game.settings.set(MOD, 'play', true);
        const on = await rollAttack('Fire Bolt');
        ok('§11 play on: it plays again', on.e?.played, files(on.e));
      }
      if (want(12)) {
        await aim();
        const [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'feat', system: { activities: {} } }]);
        const before = game.messages.size;
        const act = tmp.system.activities.contents[0];
        let e = null;
        if (!act) {
          // a bare feat has no activity; post a usage-shaped message by hand so the reader sees the shape it would see
          const m = await ChatMessage.create({ type: 'usage', speaker: ChatMessage.getSpeaker({ actor: caster.actor }), content: 'Sharran Step', flags: { dnd5e: { activity: { uuid: `${tmp.uuid}.Activity.none`, type: 'utility', id: 'none' }, item: { uuid: tmp.uuid, id: tmp.id, type: 'feat' }, targets: [] } } });
          await settle();
          e = ledgerFor(m.id);
        }
        ok('§12 no row: the ledger lists the ability with "no row in any corpus"', e && !e.matched && /no row/.test(e.note), e?.note ?? 'no entry');
        await tmp.delete();
        void before;
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
