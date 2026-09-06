// The assistant's round trip (ARCHITECTURE §7), live on the sandbox: a look written as data, like
// an existing look but black; validated; read back as a sentence; previewed on the fixture without
// saving; saved to the world buffer with provenance; resolved for a new ability by its key; played
// from the real usage card; listed by the offline export as a sentence; then removed. Builds and
// tears down its own fixture; leaves the world buffer as it found it.
//
//   node tools/smoke-author.mjs
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO } from './lib/env.mjs';
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp, report } from './lib/suite.mjs';

const { f, dispose } = await connectSandbox({ tag: 'author', watchdogMs: 600_000 });
let fixture = null;
const since = Date.now();
try {
  fixture = await f.evaluate(fixtureUp, { items: ['Misty Step'] });
  const out = await f.evaluate(async ({ fx }) => {
    const api = game.modules.get('fvtt-mod-fxstudio').api;
    const results = [];
    const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const caster = canvas.tokens.get(fx.casterTokenId);
    const before = api.looks.buffer();
    const look = { id: 'sharran-step', for: ['spell:sharran-step'], like: 'misty-step', with: { colour: 'dark_black' }, note: 'like Misty Step but black' };
    let tmp = null;
    try {
      // 1 · validate, as data
      const problems = api.looks.validate(look);
      ok('§1 the look validates', problems.length === 0, problems.join('; '));
      const bad = api.looks.validate({ ...look, scenes: [{ shape: 'swing' }] });
      ok('§1 a wrong shape is named in a sentence', bad.some((p) => /shape "swing" is not one of/.test(p)), bad.join('; '));
      // 2 · the sentence
      const s = api.looks.sentence(look);
      ok('§2 the sentence reads the inherited look in black', /dark black/.test(s) && !/blue/.test(s) && /mark/.test(s) && /chosen spot/.test(s), s);
      // 3 · preview without saving
      const pre = await api.preview(look, { source: caster, targets: [], destination: { x: 850, y: 850 } });
      await sleep(1500);
      ok('§3 the preview plays it in black', pre.ok && pre.entry?.played && pre.entry.files.some((p) => String(p).includes('dark_black')), JSON.stringify(pre.entry?.files));
      ok('§3 nothing was saved by the preview', api.looks.buffer().length === before.length, `${api.looks.buffer().length} in the buffer`);
      // 4 · save with provenance
      const saved = await api.looks.save(look, { by: 'Tester Assistant' });
      ok('§4 saved to the world buffer with provenance', saved.ok && saved.look.by === 'Tester Assistant' && /^\d{4}-\d{2}-\d{2}$/.test(saved.look.at), JSON.stringify({ by: saved.look?.by, at: saved.look?.at }));
      ok('§4 the corpus resolves spell:sharran-step to it, from the world layer', api.resolve({ keys: ['spell:sharran-step'] }).look?.id === 'sharran-step' && api.resolve({ keys: ['spell:sharran-step'] }).source === 'world', JSON.stringify(api.resolve({ keys: ['spell:sharran-step'] }).source));
      // 5 · a new spell on the sheet reads back as the sentence, and plays from its card
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const sf = api.sentenceFor(tmp);
      ok('§5 the sheet\'s new spell reads back as the sentence', sf.look?.id === 'sharran-step' && /Sharran Step · when used/.test(sf.sentence), sf.sentence);
      const m = await ChatMessage.create({ type: 'usage', speaker: ChatMessage.getSpeaker({ actor: caster.actor }), content: tmp.name, flags: { dnd5e: { activity: { uuid: `${tmp.uuid}.Activity.none`, type: 'utility', id: 'none' }, item: { uuid: tmp.uuid, id: tmp.id, type: 'spell' }, targets: [] } } });
      await sleep(1200);
      const e = api.ledger.find((x) => x.id === m.id);
      ok('§5 the card resolves it (a move, waiting for its click)', e?.look === 'sharran-step' && e.source === 'world' && /destination/.test(e.why ?? ''), `${e?.look} · ${e?.why}`);
      Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
      canvas.app.stage.removeAllListeners?.('pointerdown');
      // 6 · listed as newest first among the custom looks, with who wrote it
      const mine = api.looks.list().filter((l) => l.source === 'world');
      ok('§6 the Custom looks list holds it with its author', mine.some((l) => l.look.id === 'sharran-step' && l.original.by === 'Tester Assistant'), `${mine.length} world look(s)`);
    } finally {
      if (tmp) await tmp.delete().catch(() => null);
    }
    return { results, saved: api.looks.buffer().some((l) => l.id === 'sharran-step') };
  }, { fx: fixture });
  // 7 · the offline export reads the buffer from the world's database and lists the sentence
  if (out.saved) {
    let text = '';
    try { text = execFileSync(process.execPath, [join(REPO, 'tools', 'export-looks.mjs')], { encoding: 'utf8' }); } catch (e) { text = String(e.stdout ?? e.message); }
    out.results.push({ name: '§7 the export lists the buffer as a sentence, written by the assistant', pass: /sharran step/i.test(text) && /Tester Assistant/.test(text), detail: text.split('\n').filter((l) => /sharran|Tester/i.test(l)).join(' | ').slice(0, 300) });
  }
  // 8 · removed again: the buffer is as it was
  const after = await f.evaluate(async () => { const api = game.modules.get('fvtt-mod-fxstudio').api; const r = await api.looks.remove('sharran-step'); return { removed: r.ok, left: api.looks.buffer().filter((l) => l.id === 'sharran-step').length, resolves: api.resolve({ keys: ['spell:sharran-step'] }).look?.id ?? null }; }, null);
  out.results.push({ name: '§8 removed from the buffer; the key resolves to nothing again', pass: after.removed && after.left === 0 && after.resolves === null, detail: JSON.stringify(after) });
  report('author', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[author] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
