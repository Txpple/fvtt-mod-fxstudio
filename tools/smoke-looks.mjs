// Does every row in both corpora BUILD on the sandbox? Every effective row is compiled by its
// preset against a synthetic moment on the test fixture (a caster, a target, a placed template),
// never played, and every path the build named is checked against Sequencer's database and the
// server. This is the phase 1 exit's automated half: the presets accept the whole corpus, and the
// corpus resolves live, not only offline (check-looks). Builds and tears down its own fixture.
//
//   node tools/smoke-looks.mjs
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp } from './lib/suite.mjs';

// files the import report already lists as absent on this install (silent under AA, silent now)
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
    // one placed template of each shape the corpus sizes by: a circle and a cone, made as templates and migrated to Regions by Foundry 14
    const origin = caster.actor.items.contents[0]?.uuid ?? caster.actor.uuid;
    const [circle] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'circle', distance: 20, x: 1100, y: 500, flags: { fxstudio: { test: true } } }]);
    const [cone] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'cone', distance: 15, direction: 0, x: 600, y: 550, angle: 53.13, flags: { fxstudio: { test: true } } }]);
    const [square] = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{ t: 'rect', distance: 15, direction: 45, x: 1000, y: 400, flags: { fxstudio: { test: true } } }]);
    await new Promise((r) => setTimeout(r, 400));
    const regionOf = (doc) => canvas.scene.regions.get(doc.id) ?? doc;
    const templates = { circle: regionOf(circle), cone: regionOf(cone), square: regionOf(square) };
    const rows = api.effectiveRows();
    const results = { rows: rows.length, built: 0, empty: [], errors: [], paths: new Map(), byPreset: {} };
    const momentFor = (row) => {
      const base = { names: [row.name], item: caster.actor.items.contents[0] ?? null, activity: null, sourceToken: caster, targets: [target], hits: null, origin, id: 'looks' };
      const preset = row.fx?.[0]?.preset;
      if (row.menu === 'aefx') return { ...base, kind: 'effect', on: 'effect', tieTo: null };
      if (row.menu === 'templatefx' || preset === 'projectile-to-template' || preset === 'thunderwave') {
        const t = preset === 'thunderwave' ? templates.square : row.fx[0].video?.menuType === 'cone' || row.fx[0].video?.menuType === 'ray' ? templates.cone : templates.circle;
        return { ...base, kind: 'template', on: 'template', template: t };
      }
      if (preset === 'teleport') return { ...base, kind: 'use', on: 'use', destination: { x: 850, y: 850 }, noMove: true };
      return { ...base, kind: 'use', on: 'use' };
    };
    for (const { row, source } of rows) {
      if (row.off) continue;
      const preset = row.fx?.[0]?.preset ?? (row.soundOnly ? 'sound-only' : '?');
      results.byPreset[preset] = (results.byPreset[preset] ?? 0) + 1;
      try {
        const { seq, ctx } = api.build(row, momentFor(row), row.name);
        results.built++;
        if (!seq) results.empty.push(`${row.name} [${row.menu}] (${preset})`);
        for (const p of [...ctx.files, ...ctx.sounds]) { if (!p) { results.errors.push(`${row.name} [${row.menu}] (${source}): a layer has no path`); continue; } (results.paths.get(p) ?? results.paths.set(p, []).get(p)).push(row.name); }
      } catch (e) {
        results.errors.push(`${row.name} [${row.menu}] (${source}): ${e.message}`);
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
      const isWild = p.includes('*');
      const probe = isWild ? null : p;
      let ok = true;
      if (probe) {
        if (!checked.has(probe)) { try { const r = await fetch(probe, { method: 'HEAD' }); checked.set(probe, r.ok); } catch { checked.set(probe, false); } }
        ok = checked.get(probe);
      } else {
        // a wildcard path: Sequencer resolves it through the server's file browser at play; ask the same way
        try { const dir = p.slice(0, p.lastIndexOf('/')); const list = await foundry.applications.apps.FilePicker.implementation.browse('data', dir); ok = list.files.length > 0; } catch { ok = false; }
      }
      if (!ok) missing.push(`${p} (${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''})`);
    }
    const tolerated = missing.filter((m) => knownMissing.some((k) => m.includes(k)));
    const real = missing.filter((m) => !tolerated.includes(m));

    // the party's sheets: every ability with a look builds; the rest is the "nothing plays yet" list
    const partyId = game.settings.get('dnd5e', 'primaryParty')?.actor?.id ?? null;
    const party = partyId ? (game.actors.get(partyId)?.system?.members ?? []).map((m) => m.actor ?? game.actors.get(m.actor?.id ?? m)).filter(Boolean) : game.actors.filter((a) => a.type === 'character' && a.hasPlayerOwner);
    const partyOut = [];
    const nothing = [];
    for (const actor of party) {
      let looks = 0, builds = 0, none = 0;
      for (const it of actor.items) {
        if (!['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool'].includes(it.type)) continue;
        const hit = api.lookup(it.name);
        if (!hit) { none++; nothing.push(`${actor.name}: ${it.name}`); continue; }
        looks++;
        try { const m = momentFor(hit.row); m.item = it; api.build(hit.row, m, hit.name ?? it.name); builds++; }
        catch (e) { results.errors.push(`${actor.name} / ${it.name} → "${hit.row.name}": ${e.message}`); }
      }
      partyOut.push({ name: actor.name, looks, builds, none });
    }

    // monster attacks (PLAN §7): the world's NPCs' attack activities, and how many reach a row by whole word
    const npcOut = { actors: 0, attacks: 0, exact: 0, word: 0, none: 0, samples: { word: [], none: [] } };
    for (const actor of game.actors.filter((a) => a.type === 'npc')) {
      let any = false;
      for (const it of actor.items) {
        if (!it.system?.activities?.some?.((a) => a.type === 'attack')) continue;
        any = true;
        npcOut.attacks++;
        const hit = api.lookup(it.name);
        if (!hit) { npcOut.none++; if (npcOut.samples.none.length < 12 && !npcOut.samples.none.includes(it.name)) npcOut.samples.none.push(it.name); }
        else if (hit.how === 'word') { npcOut.word++; if (npcOut.samples.word.length < 12) { const s = `${it.name} → ${hit.row.name}`; if (!npcOut.samples.word.includes(s)) npcOut.samples.word.push(s); } }
        else npcOut.exact++;
      }
      if (any) npcOut.actors++;
    }

    await canvas.scene.deleteEmbeddedDocuments('Region', [circle.id, cone.id, square.id].filter((id) => canvas.scene.regions.get(id)));
    return { rows: results.rows, built: results.built, byPreset: results.byPreset, empty: results.empty, errors: results.errors, paths: results.paths.size, rawChecked: checked.size, missing: real, tolerated, party: partyOut, nothing, npc: npcOut };
  }, { casterTokenId: fixture.casterTokenId, targetTokenId: fixture.targetTokenId, knownMissing: KNOWN_MISSING });
  console.log(`[looks] ${out.rows} rows · built ${out.built} · presets ${Object.entries(out.byPreset).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`[looks] ${out.paths} distinct paths named, ${out.rawChecked} raw files asked of the server`);
  for (const e of out.errors) console.log(`  ✗ build: ${e}`);
  for (const m of out.missing) console.log(`  ✗ missing: ${m}`);
  for (const m of out.tolerated) console.log(`  · known missing since AA: ${m}`);
  if (out.empty.length) console.log(`  · ${out.empty.length} row(s) built to nothing against this moment: ${out.empty.slice(0, 6).join('; ')}${out.empty.length > 6 ? '…' : ''}`);
  console.log(`[looks] the party: ${out.party.map((p) => `${p.name} ${p.builds}/${p.looks} build, ${p.none} nothing`).join(' · ')}`);
  if (out.nothing.length) console.log(`  · nothing plays yet for ${out.nothing.length} abilities (the import report lists them)`);
  console.log(`[looks] NPC attacks: ${out.npc.attacks} on ${out.npc.actors} actors · by exact name ${out.npc.exact} · by whole word ${out.npc.word} · nothing ${out.npc.none}`);
  if (out.npc.samples.word.length) console.log(`  · by word, e.g. ${out.npc.samples.word.slice(0, 8).join('; ')}`);
  if (out.npc.samples.none.length) console.log(`  · nothing, e.g. ${out.npc.samples.none.slice(0, 12).join('; ')}`);
  const failed = out.errors.length + out.missing.length;
  console.log(failed ? `FAIL: ${out.errors.length} build error(s), ${out.missing.length} missing path(s)` : `PASS: ${out.built} rows build, every path resolves`);
  process.exitCode = failed ? 1 : 0;
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[looks] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
