// Does every look in the corpus BUILD on the sandbox? Every look is built by the engine against a
// synthetic moment on the test fixture (a caster, a target, a placed template), never played, and
// every path the build names is checked against Sequencer's database and the server. Then the
// party's sheets and the NPC attacks through the API's census: what plays, what plays nothing.
// Builds and tears down its own fixture.
//
//   node tools/smoke-looks.mjs
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp } from './lib/suite.mjs';

// files the migration report already lists as absent on this install (silent under AA, silent now)
const KNOWN_MISSING = ['Map.png'];

const { f, dispose } = await connectSandbox({ tag: 'looks', watchdogMs: 600_000 });
let fixture = null;
const since = Date.now();
try {
  fixture = await f.evaluate(fixtureUp, { items: [] });
  console.log(`[looks] fixture: scene ${fixture.sceneId}, caster ${fixture.casterTokenId}, target ${fixture.targetTokenId}`);
  const out = await f.evaluate(async ({ casterTokenId, targetTokenId, knownMissing }) => {
    const api = game.modules.get('fvtt-mod-fxstudio').api;
    const caster = canvas.tokens.get(casterTokenId);
    const target = canvas.tokens.get(targetTokenId);
    const origin = caster.actor.uuid;
    const [circle] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'circle', distance: 20, x: 1100, y: 500 }]);
    const [cone] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'cone', distance: 15, direction: 0, x: 600, y: 550, angle: 53.13 }]);
    const [square] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'rect', distance: 15, direction: 45, x: 1000, y: 400 }]);
    await new Promise((r) => setTimeout(r, 400));
    const regionOf = (doc) => canvas.scene.regions.get(doc.id) ?? doc;
    const templates = { circle: regionOf(circle), cone: regionOf(cone), square: regionOf(square) };
    const list = api.looks.list();
    const results = { looks: list.length, built: 0, empty: [], errors: [], paths: new Map(), byShape: {}, problems: api.index.problems };
    const needsPlace = (look) => look.scenes.some((s) => s.shape === 'fill' || s.at === 'template' || s.to === 'template');
    const momentFor = (look) => {
      const base = { subject: { name: look.id, keys: look.for }, source: caster, targets: [{ token: target, hit: true }], origin, id: 'looks' };
      if (look.on === 'effect') return { ...base, when: 'effect', kind: 'effect', source: target, tie: null };
      if (needsPlace(look)) return { ...base, when: 'use', kind: 'template', place: templates.circle, tie: templates.circle };
      if (look.scenes.some((s) => s.shape === 'move')) return { ...base, when: 'use', kind: 'use', destination: { x: 850, y: 850 }, noMove: true };
      return { ...base, when: 'use', kind: 'use' };
    };
    for (const { look, source } of list) {
      if (look.off) continue;
      const shape = look.scenes?.[0]?.shape ?? '?';
      results.byShape[shape] = (results.byShape[shape] ?? 0) + 1;
      try {
        const { seq, ctx } = api.build(look, momentFor(look));
        results.built++;
        if (!seq) results.empty.push(`${look.id} (${shape})`);
        for (const m of ctx.missing) results.errors.push(`${look.id} (${source}): ${m}`);
        for (const p of [...ctx.files.flat(), ...ctx.sounds]) { if (!p) { results.errors.push(`${look.id} (${source}): a scene has no path`); continue; } (results.paths.get(p) ?? results.paths.set(p, []).get(p)).push(look.id); }
      } catch (e) {
        results.errors.push(`${look.id} (${source}): ${e.message}`);
      }
    }
    // every named path resolves: database paths through Sequencer, raw paths through the server
    const missing = [];
    const raw = [];
    for (const [p, names] of results.paths) {
      if (p.includes('/')) { raw.push([p, names]); continue; }
      if (!Sequencer.Database.entryExists(p)) missing.push(`${p} (${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''})`);
    }
    const checked = new Map();
    for (const [p, names] of raw) {
      let ok = true;
      if (p.includes('*')) { try { const dir = p.slice(0, p.lastIndexOf('/')); const l = await foundry.applications.apps.FilePicker.implementation.browse('data', dir); ok = l.files.length > 0; } catch { ok = false; } }
      else { if (!checked.has(p)) { try { const r = await fetch(p, { method: 'HEAD' }); checked.set(p, r.ok); } catch { checked.set(p, false); } } ok = checked.get(p); }
      if (!ok) missing.push(`${p} (${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''})`);
    }
    const tolerated = missing.filter((m) => knownMissing.some((k) => m.includes(k)));
    const real = missing.filter((m) => !tolerated.includes(m));

    // the party and the NPCs, through the API's census
    const partyId = game.settings.get('dnd5e', 'primaryParty')?.actor?.id ?? null;
    const party = partyId ? (game.actors.get(partyId)?.system?.members ?? []).map((m) => m.actor ?? game.actors.get(m.actor?.id ?? m)).filter(Boolean) : game.actors.filter((a) => a.type === 'character' && a.hasPlayerOwner);
    const c = api.census({ actors: party });
    const partyOut = c.actors.map((a) => ({ name: a.name, plays: a.items.filter((i) => i.look).length, items: a.items.length, effects: a.effects.filter((e) => e.look).length, effectsAll: a.effects.length }));
    const npc = api.census({ actors: game.actors.filter((a) => a.type === 'npc') });
    const attacks = npc.actors.flatMap((a) => a.items.filter((i) => i.type === 'weapon'));
    const npcOut = { attacks: attacks.length, plays: attacks.filter((i) => i.look).length, byBase: attacks.filter((i) => i.look && i.key && i.keys.indexOf(i.key) > 1).map((i) => `${i.name} → ${i.key}`).slice(0, 8), nothing: [...new Set(attacks.filter((i) => !i.look).map((i) => i.name))].slice(0, 14) };

    await canvas.scene.deleteEmbeddedDocuments('Region', [circle.id, cone.id, square.id].filter((id) => canvas.scene.regions.get(id)));
    return { looks: results.looks, built: results.built, byShape: results.byShape, empty: results.empty, errors: results.errors, problems: results.problems, paths: results.paths.size, rawChecked: checked.size, missing: real, tolerated, party: partyOut, nothing: c.nothing.map((n) => `${n.actor}: ${n.name}`), npc: npcOut };
  }, { casterTokenId: fixture.casterTokenId, targetTokenId: fixture.targetTokenId, knownMissing: KNOWN_MISSING });
  console.log(`[looks] ${out.looks} looks · built ${out.built} · shapes ${Object.entries(out.byShape).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`[looks] ${out.paths} distinct paths named, ${out.rawChecked} raw files asked of the server`);
  for (const p of out.problems) console.log(`  ✗ index: ${p}`);
  for (const e of out.errors) console.log(`  ✗ build: ${e}`);
  for (const m of out.missing) console.log(`  ✗ missing: ${m}`);
  for (const m of out.tolerated) console.log(`  · known missing since AA: ${m}`);
  if (out.empty.length) console.log(`  · ${out.empty.length} look(s) built to nothing against this moment: ${out.empty.slice(0, 6).join('; ')}${out.empty.length > 6 ? '…' : ''}`);
  console.log(`[looks] the party: ${out.party.map((p) => `${p.name} ${p.plays}/${p.items} play, effects ${p.effects}/${p.effectsAll}`).join(' · ')}`);
  if (out.nothing.length) console.log(`  · nothing plays yet for ${out.nothing.length} abilities (the migration report lists them)`);
  console.log(`[looks] NPC attacks: ${out.npc.attacks}, ${out.npc.plays} play · by a later key, e.g. ${out.npc.byBase.join('; ') || '—'} · nothing: ${out.npc.nothing.join('; ') || '—'}`);
  const failed = out.errors.length + out.missing.length + out.problems.length;
  console.log(failed ? `FAIL: ${out.errors.length} build error(s), ${out.missing.length} missing path(s), ${out.problems.length} index problem(s)` : `PASS: ${out.built} looks build, every path resolves`);
  process.exitCode = failed ? 1 : 0;
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[looks] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
