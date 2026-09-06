// The screens, live on the sandbox: a person's round trip through the window, driven on the DOM —
// look an ability up and read its sentence; type a spell the sheet does not know yet; give it a
// look through the Create-a-look walk (for what, start from: duplicate Misty Step, the look: dark
// black, when it plays, save to: the house corpus); read it on Custom looks with who wrote it; bind
// and unbind it on Corpus; give one item its own look through the walk and take it back; switch a
// look off and on; SHIP from Corpus — the corpus files and the version written into the module on
// the sandbox, read back, then restored byte for byte; find the button on the item sheet. Builds
// and tears down its own fixture; leaves the world buffer and the module's files as it found them.
//
//   node tools/smoke-screens.mjs
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp, report } from './lib/suite.mjs';

const { f, dispose } = await connectSandbox({ tag: 'screens', watchdogMs: 600_000 });
let fixture = null;
const since = Date.now();
try {
  fixture = await f.evaluate(fixtureUp, { items: ['Misty Step'] });
  const out = await f.evaluate(async ({ fx }) => {
    const MOD = 'fvtt-mod-fxstudio';
    const api = game.modules.get(MOD).api;
    const results = [];
    const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail: String(detail).slice(0, 300) });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const caster = canvas.tokens.get(fx.casterTokenId);
    const before = api.looks.buffer().map((l) => l.id);
    const made = [];
    let tmp = null;
    let app = null;
    const $ = (sel) => app.element.querySelector(sel);
    const $$ = (sel) => [...app.element.querySelectorAll(sel)];
    const click = async (sel) => { const el = typeof sel === 'string' ? $(sel) : sel; if (!el) throw new Error(`nothing to click for ${sel}`); el.click(); await sleep(350); };
    const type = async (sel, value) => { const el = $(sel); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(150); };
    const choose = async (sel, value) => { const el = typeof sel === 'string' ? $(sel) : sel; el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); };
    const text = (sel) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const stepNow = () => Number($('.step[data-state="now"]')?.dataset.step ?? 0);
    // the module's files on the server, read fresh and written back (what Corpus does, for the restore)
    const readFile = async (p) => (await fetch(`modules/${MOD}/${p}?t=${Date.now()}`, { cache: 'no-store' })).text();
    const writeFile = async (p, textValue) => { const FP = foundry.applications.apps.FilePicker.implementation; const parts = p.split('/'); const name = parts.pop(); return FP.upload('data', [`modules/${MOD}`, ...parts].join('/'), new File([textValue], name, { type: 'application/json' }), {}, { notify: false }); };
    const FILES = ['recipes/house.json', 'recipes/shipped.json'];
    const snapshot = {};
    for (const p of FILES) snapshot[p] = await readFile(p);
    try {
      // 1 · the window opens on an item and reads its sentence
      const misty = caster.actor.items.getName('Misty Step');
      app = api.open({ item: misty });
      await sleep(600);
      ok('§1 the window opens with its five tabs', app?.rendered && $$('[role=tab]').length === 5, `${$$('[role=tab]').map((t) => t.textContent).join(', ')}`);
      ok('§1 Look up shows Misty Step as a sentence, and why', /Misty Step · when used/.test(text('.sentence')) && /has a look for that/.test(text('.why')), `${text('.sentence')} | ${text('.why')}`);
      ok('§1 the card says whose sheet it is on and what it is', /FX Test Caster/.test(text('.owner')) && /the spell Misty Step/.test(text('.owner')), text('.owner'));
      ok('§1 the card offers to create a look from this one', /Create a look from this/.test(text('.actions')), text('.actions'));

      // 2 · a spell the corpus has never heard of
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con', activities: { dnd5eactivity000: { type: 'utility', _id: 'dnd5eactivity000' } } } }]);
      await sleep(200);
      app.refresh();
      await type('.fx-q', 'Sharran');
      const hit = $$('.suggest .hit').find((h) => /Sharran Step/.test(h.textContent));
      ok('§2 typing a few letters offers the sheet\'s Sharran Step', !!hit && /FX Test Caster/.test(hit.textContent), hit?.textContent);
      await click(hit);
      ok('§2 it plays nothing yet, and says so in words', /Nothing plays yet/.test(text('.sentence')) && /No look answers the spell Sharran Step/.test(text('.why')), `${text('.sentence')} | ${text('.why')}`);
      ok('§2 the card offers to give it a look', /Give it a look/.test(text('.actions')), text('.actions'));

      // 3 · the walk: for what (done), start from, the look
      await click('[data-act="create-new"]');
      ok('§3 Give it a look opens the walk on step 2, step 1 already answered', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'create' && stepNow() === 2 && $('.step[data-state="done"]')?.dataset.step === '1', `tab ${$('[role=tab][aria-selected="true"]')?.dataset.tab}, step ${stepNow()}`);
      ok('§3 step 2 offers duplicate, a starter and from scratch', $$('[data-act="cw-start"]').length === 3 && /Duplicate an existing look/.test(text('.choices')) && /From scratch/.test(text('.choices')), text('.choices').slice(0, 120));
      ok('§3 Next waits until a start is chosen', $('[data-act="cw-next"]')?.disabled === true, '');
      await click('[data-act="cw-start"][data-start="dup"]');
      await type('.cw-like', 'misty step');
      const like = $$('.suggest .hit').find((h) => h.dataset.id === 'misty-step');
      ok('§3 the Which-look box offers the Misty Step look', !!like, $$('.suggest .hit').map((h) => h.dataset.id).join(', '));
      await click(like);
      await click('[data-act="cw-next"]');
      ok('§3 step 3 shows Misty Step\'s scenes, one line each, seeded from the copy', stepNow() === 3 && $$('.scene').length >= 2 && /A copy of Misty Step/.test(text('.walk .lead')), `${$$('.scene').length} scenes · ${text('.walk .lead').slice(0, 60)}`);
      const colours = $$('.cw-colour')[0] ? [...$$('.cw-colour')[0].options].map((o) => o.value) : [];
      ok('§3 each scene\'s colour picker lists its family\'s own colours, dark black among them', colours.includes('dark_black') && colours.includes('blue'), colours.join(', '));
      for (let i = 0; i < 6; i++) { const sel = $$('.cw-colour').find((s) => s.value !== 'dark_black' && [...s.options].some((o) => o.value === 'dark_black')); if (!sel) break; await choose(sel, 'dark_black'); }
      ok('§3 the draft reads back as the sentence, in black, before anything is saved', /dark black/.test(text('.walk .preview')) && /Sharran Step · when used/.test(text('.walk .preview')) && !/blue/.test(text('.walk .preview')), text('.walk .preview'));
      ok('§3 nothing has been saved yet', api.looks.buffer().length === before.length, `${api.looks.buffer().length}`);

      // 4 · when it plays, save to
      await click('[data-act="cw-next"]');
      ok('§4 step 4 answers for the spell Sharran Step, when used', stepNow() === 4 && /Sharran Step/.test(text('[data-act="cw-key"][aria-pressed="true"]')) && $('[data-act="cw-on"][aria-pressed="true"]')?.dataset.on === 'use', `${text('[data-act="cw-key"][aria-pressed="true"]')}`);
      ok('§4 the outcomes are shown as phase 4, not offered yet', /phase 4/.test(text('.walk')) && $$('.walk .pills button:disabled').length >= 4, '');
      await click('[data-act="cw-next"]');
      ok('§4 step 5 offers this world, the house corpus and the main corpus', stepNow() === 5 && $$('[data-act="cw-to"]').length === 3, `${$$('[data-act="cw-to"]').map((b) => b.dataset.to).join(', ')}`);
      await click('[data-act="cw-to"][data-to="house"]');
      ok('§4 what will be saved is read back before Save, bound for the house corpus', /dark black/.test(text('.walk .preview')) && /To the house corpus/.test(text('.walk .preview')), text('.walk .preview').slice(0, 200));
      await click('[data-act="cw-save"]');
      await sleep(500);
      const saved = api.looks.buffer().find((l) => l.id === 'sharran-step');
      if (saved) made.push(saved.id);
      ok('§4 Save writes the look to the world buffer with its scenes, bound for the house corpus, with provenance', saved && Array.isArray(saved.scenes) && saved.scenes.length >= 2 && saved.to === 'house' && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at) && /like Misty Step/.test(saved.note), JSON.stringify(saved).slice(0, 300));
      ok('§4 the window lands on Look up with the custom look, marked bound', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'lookup' && /custom look/.test(text('.status')) && /dark black/.test(text('.sentence')) && /bound for the house corpus/.test(text('.why')), `${text('.status')} | ${text('.sentence')} | ${text('.why')}`);
      ok('§4 the spell resolves to it from the world layer', api.resolve(tmp).look?.id === 'sharran-step' && api.resolve(tmp).source === 'world', api.resolve(tmp).source);
      const r4 = api.sentenceFor(tmp);
      ok('§4 the API reads the same sentence the screen shows', r4.sentence === text('.sentence'), `${r4.sentence} | ${text('.sentence')}`);

      // 5 · Custom looks lists it, newest first, with who wrote it
      await click('[data-tab="custom"]');
      const firstRow = $('.list .row');
      ok('§5 Custom looks lists Sharran Step first, bound for the house corpus, with the author', firstRow && /Sharran Step/.test(firstRow.textContent) && /bound for the house corpus/.test(firstRow.textContent) && firstRow.textContent.includes(game.user.name), firstRow?.textContent.replace(/\s+/g, ' ').slice(0, 200));
      await type('.fx-cq', 'sharran');
      await sleep(400);
      ok('§5 the search narrows the list', $$('.list .row').length === 1, `${$$('.list .row').length} rows`);

      // 6 · Corpus: what waits, binding and unbinding
      await click('[data-tab="corpus"]');
      const tiles = $$('.tile').map((t) => t.textContent.replace(/\s+/g, ' ').trim());
      ok('§6 Corpus shows the tiles: the main corpus, the house corpus, drafts, bound, the version', tiles.length === 5 && /main corpus/.test(tiles[0]) && /bound for a corpus/.test(tiles[3]) && /version/.test(tiles[4]), tiles.join(' | '));
      const row6 = $$('.list .row').find((r) => /Sharran Step/.test(r.textContent));
      ok('§6 Not yet shipped lists Sharran Step, bound for the house corpus, with Keep as a draft', row6 && /bound for the house corpus/.test(row6.textContent) && !!row6.querySelector('[data-act="co-stage"][data-to=""]'), row6?.textContent.replace(/\s+/g, ' ').slice(0, 160));
      ok('§6 the Ship card names the version to stamp and the file it writes', /Write the corpus files and stamp/.test(text('[data-act="co-ship"]')) && /house\.json/.test(text('[data-pane="corpus"]')), text('[data-act="co-ship"]'));
      await click(row6.querySelector('[data-act="co-stage"][data-to=""]'));
      await sleep(300);
      ok('§6 Keep as a draft unbinds it', !api.looks.buffer().find((l) => l.id === 'sharran-step')?.to && /draft/.test($$('.list .row').find((r) => /Sharran Step/.test(r.textContent))?.textContent ?? ''), '');
      ok('§6 with nothing bound there is no Ship card', !$('[data-act="co-ship"]'), '');
      await click($$('.list .row').find((r) => /Sharran Step/.test(r.textContent))?.querySelector('[data-act="co-stage"][data-to="house"]'));
      await sleep(300);
      ok('§6 Bind for the house corpus binds it again', api.looks.buffer().find((l) => l.id === 'sharran-step')?.to === 'house' && !!$('[data-act="co-ship"]'), '');

      // 7 · one item's own look, through the walk (from the card, duplicating the look it has)
      api.open({ item: tmp });
      await sleep(300);
      await click('[data-act="create-from"]');
      ok('§7 Create a look from this opens the walk on step 3 with the look copied', stepNow() === 3 && $$('.scene').length >= 2 && /A copy of Sharran Step/.test(text('.walk .lead')), `step ${stepNow()} · ${text('.walk .lead').slice(0, 40)}`);
      await click('[data-act="cw-next"]');
      const only = $('[data-act="cw-only"]');
      ok('§7 step 4 offers "only this one" for an item on a sheet', !!only && /only this one/.test(only.textContent), only?.textContent);
      await click(only);
      await click('[data-act="cw-next"]');
      ok('§7 one item\'s own look cannot go to the main corpus', $$('[data-act="cw-to"]').length === 2 && !$('[data-act="cw-to"][data-to="baseline"]'), $$('[data-act="cw-to"]').map((b) => b.dataset.to).join(', '));
      await click('[data-act="cw-to"][data-to="world"]');
      await click('[data-act="cw-save"]');
      await sleep(500);
      const own = api.looks.buffer().find((l) => l.id === 'sharran-step-fx-test-caster');
      if (own) made.push(own.id);
      const flag = tmp.getFlag(MOD, 'look');
      ok('§7 the item now points at a look of its own, keyed to nothing, a draft in this world', own && own.for?.length === 0 && !own.to && flag === own.id, `flag ${flag} · ${JSON.stringify(own).slice(0, 200)}`);
      const r7 = api.sentenceFor(tmp);
      ok('§7 the item plays its own look ahead of the spell\'s, and says so', r7.look?.id === own?.id && /look of its own/.test(r7.why), `${r7.sentence} | ${r7.why}`);
      const other = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const r7b = api.sentenceFor(other[0]);
      ok('§7 another copy of the spell still plays the spell\'s look', r7b.look?.id === 'sharran-step' && /dark black/.test(r7b.sentence), r7b.sentence);
      await other[0].delete();
      ok('§7 the card offers to go back to the look it had', /Back to the look it had/.test(text('.actions')), text('.actions'));
      await click('[data-act="remove"]');
      await sleep(400);
      ok('§7 back: the pointer is gone and the spell\'s look answers again', !tmp.getFlag(MOD, 'look') && !api.looks.buffer().some((l) => l.id === own?.id) && api.resolve(tmp).look?.id === 'sharran-step', api.resolve(tmp).look?.id);

      // 8 · switched off, and on again
      api.open({ item: misty });
      await sleep(300);
      await click('[data-act="silence"]');
      await sleep(400);
      const off = api.looks.buffer().find((l) => l.off && (l.for ?? []).includes('spell:misty-step'));
      if (off) made.push(off.id);
      ok('§8 Play nothing writes an off look for the key', !!off, JSON.stringify(off));
      const r8 = api.sentenceFor(misty);
      ok('§8 the spell now plays nothing and the card says it was switched off on purpose', !r8.look && r8.off && /switched off/.test(text('.status')) && /on purpose/.test(text('.why')), `${text('.status')} | ${text('.why')}`);
      await click('[data-act="remove"]');
      await sleep(400);
      ok('§8 back to the look it had', api.sentenceFor(misty).look?.id === 'misty-step' && !api.looks.buffer().some((l) => l.id === off?.id), api.sentenceFor(misty).look?.id);

      // 9 · the ship: the corpus files and the version written into the module on this server, then restored
      api.open({ tab: 'corpus' });
      await sleep(300);
      const versionBefore = api.corpus.version();
      const next = api.corpus.nextVersions(versionBefore);
      await choose('.co-version', next.patch);
      await type('.co-note', 'the suite shipped Sharran Step');
      ok('§9 the Ship button names the version chosen', text('[data-act="co-ship"]').includes(next.patch), text('[data-act="co-ship"]'));
      let shipped;
      try { shipped = await api.corpus.ship({ version: next.patch, note: 'the suite shipped Sharran Step' }); } catch (e) { shipped = { ok: false, problems: [e.message] }; }
      ok('§9 the ship writes house.json and the record, and says so', shipped.ok && shipped.version === next.patch && shipped.previous === versionBefore && shipped.written.some((w) => w.file === 'recipes/house.json' && w.looks.includes('sharran-step')), JSON.stringify(shipped).slice(0, 300));
      const houseNow = JSON.parse(await readFile('recipes/house.json'));
      const recordNow = JSON.parse(await readFile('recipes/shipped.json'));
      ok('§9 the server\'s house.json now holds Sharran Step, with no "to" left on it', houseNow.looks.some((l) => l.id === 'sharran-step' && l.to === undefined && l.by === game.user.name), `${houseNow.looks.length} looks`);
      ok('§9 the record\'s first line is this ship, with the version stamped', recordNow.shipped[0]?.version === next.patch && recordNow.shipped[0].by === game.user.name && recordNow.shipped[0].looks.some((l) => l.id === 'sharran-step' && l.to === 'house'), JSON.stringify(recordNow.shipped[0]));
      ok('§9 the module\'s own manifest is left alone (the pull tool stamps the repo)', JSON.parse(await readFile('module.json')).version === game.modules.get(MOD).version, '');
      ok('§9 the shipped look has left the world buffer and answers from the house corpus now', !api.looks.buffer().some((l) => l.id === 'sharran-step') && api.resolve(tmp).source === 'house' && api.resolve(tmp).look?.id === 'sharran-step', `${api.resolve(tmp).source}`);
      app.refresh();
      await app.render();
      await sleep(300);
      ok('§9 Corpus lists the ship in Shipped from here and shows the new version', /the suite shipped Sharran Step/.test(text('[data-pane="corpus"]')) && $$('.tile')[4]?.textContent.includes(next.patch), $$('.tile')[4]?.textContent.replace(/\s+/g, ' '));
      // restore the module's files byte for byte, and read the corpora again
      for (const p of FILES) await writeFile(p, snapshot[p]);
      await api.corpus.reload();
      let same = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) same = false;
      ok('§9 restored: the module\'s files are as they were and Sharran Step is gone from the corpus', same && !api.resolve(tmp).look, `${api.resolve(tmp).why ?? ''}`);

      // 10 · the item sheet's button
      const sheet = misty.sheet;
      await sheet.render({ force: true });
      await sleep(800);
      const control = sheet.element?.querySelector('.window-header [data-action="fxstudio"]');
      ok('§10 the item sheet carries the FX Studio button in its header', !!control, control ? 'found' : `not found among ${[...(sheet.element?.querySelectorAll('.header-control') ?? [])].map((c) => c.dataset.action).join(', ')}`);
      const entries = [...sheet._getHeaderControlContextEntries()].map((e) => e.name);
      ok('§10 the controls dropdown on the sheet lists it too', entries.includes('FX Studio'), entries.join(', '));
      await app.close();
      control?.click();
      await sleep(600);
      app = api.open({});
      ok('§10 the button opens the window on that item', app?.rendered && /Misty Step/.test(text('.result h2')), text('.result h2'));
      await sheet.close();
    } finally {
      for (const id of made) if (api.looks.buffer().some((l) => l.id === id)) await api.looks.remove(id).catch(() => null);
      let restored = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) { restored = false; await writeFile(p, snapshot[p]).catch(() => null); }
      if (!restored) await api.corpus.reload().catch(() => null);
      if (tmp) await tmp.delete().catch(() => null);
      try { await app?.close(); } catch { /* fine */ }
    }
    const after = api.looks.buffer().map((l) => l.id);
    results.push({ name: '§11 the world buffer is as it was', pass: JSON.stringify(after) === JSON.stringify(before), detail: `${before.length} → ${after.length}` });
    return { results };
  }, { fx: fixture });
  report('screens', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[screens] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
