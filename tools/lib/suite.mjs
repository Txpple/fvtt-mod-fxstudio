// The suite harness, the way Battle Flow's tools/harness.mjs does it, cut to what this repo needs:
// section filtering (`--section 3,5`, `--list`), a plan the page can read, a report that stamps a
// filtered run PARTIAL so it is never mistaken for a full green, and the test fixture every live
// suite here builds and tears down (a scene of its own, two actors, their tokens).
//
// ⚠ Nothing in `fixtureUp` / `fixtureDown` may close over this module: `f.evaluate()` serialises
// the function's source into the browser, where no import exists. They take data and return data.
import { parseArgs } from 'node:util';

const bySectionId = (a, b) => (Number.parseFloat(a) - Number.parseFloat(b)) || String(a).localeCompare(String(b));

export function expandSections(requested, depends = {}) {
  if (!requested) return null;
  const out = new Set();
  const visit = (id) => { if (out.has(id)) return; out.add(id); for (const need of depends[id] ?? []) visit(String(need)); };
  for (const id of requested) visit(String(id));
  return [...out].sort(bySectionId);
}

/** `--section` / `--list` against a suite's section table; {plan: null | [ids], pulled: [ids dragged in], flags} */
export function sectionPlan(table, depends = {}, argv = process.argv.slice(2)) {
  const { values } = parseArgs({ args: argv, options: { section: { type: 'string' }, list: { type: 'boolean' }, watch: { type: 'string' } }, allowPositionals: true, strict: false });
  if (values.list) {
    console.log('Sections:');
    for (const [id, title] of Object.entries(table).sort(([a], [b]) => bySectionId(a, b))) {
      const needs = depends[id]?.length ? `  (needs ${depends[id].join(', ')})` : '';
      console.log(`  ${String(id).padEnd(5)} ${title}${needs}`);
    }
    process.exit(0);
  }
  const watch = values.watch !== undefined ? Number(values.watch) || 4000 : 0;
  if (!values.section) return { plan: null, pulled: [], watch };
  const asked = String(values.section).split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = asked.filter((id) => !(id in table));
  if (unknown.length) { console.error(`--section: no such section ${unknown.join(', ')}. Try --list.`); process.exit(2); }
  const plan = expandSections(asked, depends);
  return { plan, pulled: plan.filter((id) => !asked.includes(id)), watch };
}

export function announce(tag, plan, pulled) {
  if (!plan) { console.log(`[${tag}] running every section`); return; }
  console.log(`[${tag}] running §${plan.join(', §')}${pulled.length ? ` (§${pulled.join(', §')} pulled in by a dependency)` : ''} — ⚠ PARTIAL RUN`);
}

/** print the results; exit code 1 on any failure; a filtered run is stamped PARTIAL */
export function report(tag, out, plan) {
  for (const r of out.results ?? []) console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  for (const s of out.skips ?? []) console.log(`  · skipped ${s}`);
  for (const e of out.errors ?? []) console.log(`  ⚠ console: ${e}`);
  const failed = (out.results ?? []).filter((r) => !r.pass).length;
  const total = (out.results ?? []).length;
  const stamp = plan ? ` ⚠ PARTIAL RUN (§${plan.join(', §')})` : '';
  console.log(`${failed ? 'FAIL' : 'PASS'}: ${total - failed} of ${total}${stamp}${out.errors?.length ? ` · ${out.errors.length} console error(s)` : ''}`);
  process.exitCode = failed ? 1 : 0;
}

/**
 * Page side: build the fixture. A scene of its own (viewed by this client only, never activated),
 * two linked NPC actors with flat AC and a deep HP pool, one token each, six squares apart; the
 * items named are copied onto the caster from the 2024 PHB packs. Idempotent: reuses what exists.
 * Returns ids. Takes {items: [names]}.
 */
export const fixtureUp = async ({ items = [] } = {}) => {
  const NAME = 'FX Studio Test';
  const prevScene = canvas.scene?.id ?? null;
  const prevActive = game.scenes.active?.id ?? null;
  let scene = game.scenes.getName(NAME);
  if (!scene) scene = await Scene.create({ name: NAME, width: 2000, height: 2000, grid: { size: 100, type: 1, distance: 5, units: 'ft' }, padding: 0, background: { color: '#1f2a1f' }, tokenVision: false, fog: { exploration: false }, navigation: false });
  const mk = async (name, ac) => game.actors.getName(name) ?? await Actor.create({ name, type: 'npc', system: { attributes: { ac: { flat: ac, calc: 'flat' }, hp: { value: 400, max: 400 } } }, prototypeToken: { actorLink: true, name, disposition: 0 } });
  const caster = await mk('FX Test Caster', 12);
  const target = await mk('FX Test Target', 1);
  if (canvas.scene?.id !== scene.id) await scene.view();
  const existing = scene.tokens.filter((t) => [caster.id, target.id].includes(t.actorId));
  if (existing.length) await scene.deleteEmbeddedDocuments('Token', existing.map((t) => t.id));
  // ⚠ createEmbeddedDocuments does not return the documents in input order: find each by its actor
  const tokens = await scene.createEmbeddedDocuments('Token', [
    { ...caster.prototypeToken.toObject(), actorId: caster.id, actorLink: true, x: 500, y: 500 },
    { ...target.prototypeToken.toObject(), actorId: target.id, actorLink: true, x: 1100, y: 500 },
  ]);
  const casterToken = tokens.find((t) => t.actorId === caster.id);
  const targetToken = tokens.find((t) => t.actorId === target.id);
  // the caster's items, from the PHB packs by exact name (spells, equipment, features)
  const added = [];
  const missing = [];
  const packs = game.packs.filter((p) => p.documentName === 'Item' && p.collection.startsWith('dnd-players-handbook'));
  for (const name of items) {
    if (caster.items.getName(name)) { added.push(name); continue; }
    let doc = null;
    for (const p of packs) {
      const idx = p.index.find((i) => i.name === name);
      if (idx) { doc = await p.getDocument(idx._id); break; }
    }
    if (!doc) { missing.push(name); continue; }
    await caster.createEmbeddedDocuments('Item', [doc.toObject()]);
    added.push(name);
  }
  await new Promise((r) => setTimeout(r, 300));
  return { sceneId: scene.id, casterId: caster.id, targetId: target.id, casterTokenId: casterToken.id, targetTokenId: targetToken.id, prevScene, prevActive, added, missing };
};

/** Page side: tear the fixture down — messages this run made, effects, tokens, actors, the scene; view the previous scene */
export const fixtureDown = async ({ sceneId, casterId, targetId, prevScene, since } = {}) => {
  try { Sequencer.EffectManager.endAllEffects?.(); } catch { /* best effort */ }
  const msgs = game.messages.filter((m) => m.timestamp >= (since ?? 0) && (m.speaker?.actor === casterId || m.speaker?.actor === targetId));
  if (msgs.length) await ChatMessage.deleteDocuments(msgs.map((m) => m.id));
  const scene = game.scenes.get(sceneId);
  if (prevScene && game.scenes.get(prevScene) && canvas.scene?.id !== prevScene) await game.scenes.get(prevScene).view();
  if (scene) await scene.delete();
  for (const id of [casterId, targetId]) { const a = game.actors.get(id); if (a) await a.delete(); }
  return { deletedMessages: msgs.length };
};
