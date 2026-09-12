// The assistant's round trip (ARCHITECTURE §7), live on the sandbox: a VARIANT written as data —
// the scenes of an existing FX COPIED and one thing changed, standing on its own, because no FX
// ever points at another one (ruled 2026-09-07); validated; read back as a sentence; previewed on
// the fixture without saving; SAVED INTO recipes/house.json on the server with provenance (there is
// no draft layer, 2026-09-12); resolved for a new ability by its key; played from the real usage
// card; a House override written over a Stock FX and erased again; then erased. Builds and tears
// down its own fixture; leaves the module's files as it found them.
//
//   node tools/smoke-author.mjs
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp, report } from './lib/suite.mjs';

const { f, dispose } = await connectSandbox({ tag: 'author', watchdogMs: 600_000 });
let fixture = null;
const since = Date.now();
try {
  fixture = await f.evaluate(fixtureUp, { items: ['Misty Step'] });
  const out = await f.evaluate(async ({ fx }) => {
    const MOD = 'fvtt-mod-fxstudio';
    const api = game.modules.get(MOD).api;
    const results = [];
    const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const caster = canvas.tokens.get(fx.casterTokenId);
    const readFile = async (p) => (await fetch(`modules/${MOD}/${p}?t=${Date.now()}`, { cache: 'no-store' })).text();
    const writeFile = async (p, textValue) => { const FP = foundry.applications.apps.FilePicker.implementation; const parts = p.split('/'); const name = parts.pop(); return FP.upload('data', [`modules/${MOD}`, ...parts].join('/'), new File([textValue], name, { type: 'application/json' }), {}, { notify: false }); };
    const FILES = ['recipes/house.json', 'recipes/stock/spells.json'];
    const snapshot = {};
    for (const p of FILES) snapshot[p] = await readFile(p);
    const houseIds = () => api.corpora.house.map((l) => l.id);
    const before = houseIds();
    // a variant is a copy: take Misty Step's scenes and paint them black. Nothing points anywhere.
    const scenes = api.fx.scenesOf('misty-step');
    for (const sc of scenes) if (sc.asset?.path) sc.asset = { path: sc.asset.path.replace(/\.[a-z_]+$/, '.dark_black') };
    const variant = { id: 'sharran-step', for: ['spell:sharran-step'], on: 'use', scenes, note: 'Misty Step in black' };
    let tmp = null;
    try {
      // 1 · validate, as data
      const problems = api.fx.validate(variant);
      ok('§1 the FX validates', problems.length === 0, problems.join('; '));
      ok('§1 the variant stands on its own: every scene written out, nothing pointing anywhere', variant.scenes.length >= 2 && !variant.like && !variant.with, `${variant.scenes.length} scenes`);
      const bad = api.fx.validate({ ...variant, scenes: [{ shape: 'swing' }] });
      ok('§1 a wrong shape is named in a sentence', bad.some((p) => /shape "swing" is not one of/.test(p)), bad.join('; '));
      const shortcut = api.fx.validate({ id: 'shortcut', for: ['spell:x'], like: 'misty-step' });
      ok('§1 a shortcut is refused, and told what to write instead', shortcut.some((p) => /"like" is not part of the grammar/.test(p) && /states its scenes in full/.test(p)), shortcut.join('; '));
      const staged = api.fx.validate({ ...variant, to: 'house' });
      ok('§1 the old staging field is refused: an FX lives in a file', staged.some((p) => /"to" is not part of the grammar/.test(p)), staged.join('; '));
      // 2 · the sentence
      const s = api.fx.sentence(variant);
      ok('§2 the sentence reads the copied fx in black', /dark black/.test(s) && !/blue/.test(s) && /mark/.test(s) && /chosen spot/.test(s), s);
      // 3 · preview without saving
      const pre = await api.preview(variant, { source: caster, targets: [], destination: { x: 850, y: 850 } });
      await sleep(1500);
      ok('§3 the preview plays it in black', pre.ok && pre.entry?.played && pre.entry.files.some((p) => String(p).includes('dark_black')), JSON.stringify(pre.entry?.files));
      ok('§3 nothing was saved by the preview', houseIds().length === before.length, `${houseIds().length} in House`);
      // 4 · save with provenance: into house.json on the server, and the corpus read again
      const saved = await api.fx.save(variant, { by: 'Tester Assistant' });
      ok('§4 saved into House with provenance', saved.ok && saved.file === 'recipes/house.json' && saved.fx.by === 'Tester Assistant' && /^\d{4}-\d{2}-\d{2}$/.test(saved.fx.at), JSON.stringify({ file: saved.file, by: saved.fx?.by, at: saved.fx?.at, problems: saved.problems }));
      const houseNow = JSON.parse(await readFile('recipes/house.json'));
      ok('§4 the server\'s house.json holds it, with no staging field', houseNow.fx.some((l) => l.id === 'sharran-step' && l.to === undefined && l.by === 'Tester Assistant'), `${houseNow.fx.length} fx`);
      ok('§4 the corpus resolves spell:sharran-step to it, from House', api.resolve({ keys: ['spell:sharran-step'] }).fx?.id === 'sharran-step' && api.resolve({ keys: ['spell:sharran-step'] }).source === 'house', JSON.stringify(api.resolve({ keys: ['spell:sharran-step'] }).source));
      // 5 · a new spell on the sheet reads back as the sentence, and plays from its card
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const sf = api.sentenceFor(tmp);
      ok('§5 the sheet\'s new spell reads back as the sentence', sf.fx?.id === 'sharran-step' && /Sharran Step · when used/.test(sf.sentence), sf.sentence);
      const m = await ChatMessage.create({ type: 'usage', speaker: ChatMessage.getSpeaker({ actor: caster.actor }), content: tmp.name, flags: { dnd5e: { activity: { uuid: `${tmp.uuid}.Activity.none`, type: 'utility', id: 'none' }, item: { uuid: tmp.uuid, id: tmp.id, type: 'spell' }, targets: [] } } });
      await sleep(1200);
      const e = api.ledger.find((x) => x.id === m.id);
      ok('§5 the card resolves it (a move, waiting for its click)', e?.fx === 'sharran-step' && e.source === 'house' && /destination/.test(e.why ?? ''), `${e?.fx} · ${e?.why}`);
      Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
      canvas.app.stage.removeAllListeners?.('pointerdown');
      // 6 · listed among the House fx, with who wrote it
      const mine = api.fx.list().filter((l) => l.source === 'house');
      ok('§6 the House list holds it with its author', mine.some((l) => l.fx.id === 'sharran-step' && l.original.by === 'Tester Assistant'), `${mine.length} house fx(s)`);
      // 6b · the copy is its own: editing what it came from leaves it alone (no orphans, ruled 2026-09-07).
      //      Misty Step is Stock; the edit is a HOUSE OVERRIDE — the same id in House, which wins by id
      const parent = api.fx.get('misty-step');
      const before6 = JSON.stringify(api.fx.get('sharran-step').fx.scenes);
      const edited = { ...JSON.parse(JSON.stringify(parent.original)), note: 'edited by the suite' };
      for (const sc of edited.scenes ?? []) if (sc.asset?.path) sc.asset = { path: sc.asset.path.replace(/\.[a-z_]+$/, '.green') };
      const over = await api.fx.save(edited, { by: 'Tester Assistant', to: 'house' });
      ok('§6 a Stock FX saved to House is its override: House wins by id, Stock is untouched', over.ok && api.fx.get('misty-step').source === 'house' && api.corpus.under('misty-step') === 'stock' && /green/.test(api.fx.sentence(api.fx.get('misty-step').fx)) && api.corpora.stock.some((l) => l.id === 'misty-step' && !/green/.test(JSON.stringify(l))), `${api.fx.get('misty-step').source} · under ${api.corpus.under('misty-step')}`);
      ok('§6 changing what it was copied from does not change it', JSON.stringify(api.fx.get('sharran-step').fx.scenes) === before6, `${api.fx.sentence(api.fx.get('sharran-step').fx).slice(0, 70)}`);
      const gone = await api.corpus.erase('misty-step');
      ok('§6 erasing the override takes the House copy alone: Stock shows again, untouched', gone.ok && gone.written.length === 1 && gone.written[0] === 'recipes/house.json' && api.fx.get('misty-step')?.source === 'stock' && !/green/.test(api.fx.sentence(api.fx.get('misty-step').fx)), JSON.stringify(gone));
      ok('§6 an Item Hook cannot go to Stock, and is told so', !(await api.fx.save({ id: 'hook-probe', for: [], on: 'use', scenes: variant.scenes }, { to: 'stock' })).ok, '');
      // 7 · erased again: the file is as it was
      const r7 = await api.corpus.erase('sharran-step');
      ok('§7 erased from House; the key resolves to nothing again', r7.ok && !api.fx.get('sharran-step') && api.resolve({ keys: ['spell:sharran-step'] }).fx === null, JSON.stringify(r7));
    } finally {
      if (tmp) await tmp.delete().catch(() => null);
      let restored = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) { restored = false; await writeFile(p, snapshot[p]).catch(() => null); }
      if (!restored) await api.corpus.reload().catch(() => null);
      results.push({ name: '§8 the module\'s files are as they were', pass: JSON.stringify(houseIds()) === JSON.stringify(before), detail: `${before.length} → ${houseIds().length}${restored ? '' : ' (restored byte for byte at the end)'}` });
    }
    return { results };
  }, { fx: fixture });
  report('author', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[author] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
