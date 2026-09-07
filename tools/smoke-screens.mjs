// The screens, live on the sandbox: a person's round trip through the window, driven on the DOM —
// fx an ability up and read its sentence; type a spell the sheet does not know yet; give it a
// fx through the Create-a-fx walk (for what, start from: duplicate Misty Step, the FX: dark
// black, when it plays, save to: the house corpus); read it on Overrides with who wrote it; bind
// and unbind it on Corpus; give one item its own FX through the walk and take it back; switch a
// fx off and on; SHIP from Corpus — the corpus files and the version written into the module on
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
    const before = api.fx.buffer().map((l) => l.id);
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
      ok('§1 the window opens with its five tabs in order, Look up last (Stock FX waits behind the maintainer switch)', app?.rendered && $$('[role=tab]').length === 5 && /^House FX ?FX Editor ?Asset Library ?Audit ?Look up/.test(text('.tabs')) && /Look up/.test(text('.tabs')), `${$$('[role=tab]').map((t) => t.textContent).join(', ')}`);
      ok('§1 Look up shows Misty Step as a sentence, and why', /Misty Step · when used/.test(text('.sentence')) && /Global Hook · Misty Step \(spell\) · (Stock|House)/.test(text('.why')), `${text('.sentence')} | ${text('.why')}`);
      ok('§1 the card carries no sheet line, only the title and the sentence', !$('.result .owner'), text('.result .owner') || 'none');
      ok('§1 the card offers Duplicate', /Duplicate/.test(text('.actions')), text('.actions'));

      // 2 · a spell the corpus has never heard of
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con', activities: { dnd5eactivity000: { type: 'utility', _id: 'dnd5eactivity000' } } } }]);
      await sleep(200);
      app.refresh();
      await type('.fx-q', 'Sharran');
      const hit = $$('.suggest .hit').find((h) => /Sharran Step/.test(h.textContent));
      ok('§2 typing a few letters offers the sheet\'s Sharran Step', !!hit && /FX Test Caster/.test(hit.textContent), hit?.textContent);
      await click(hit);
      ok('§2 it plays nothing yet, and says so in words', /Nothing plays/.test(text('.sentence')) && /No FX for Sharran Step \(spell\)/.test(text('.why')), `${text('.sentence')} | ${text('.why')}`);
      ok('§2 the card offers Create FX, and a Close', /Create FX/.test(text('.actions')) && !!$('[data-act="close-card"]'), text('.actions'));
      await click('[data-act="close-card"]');
      ok('§2 Close clears the card and the box', !$('.result') && $('.fx-q')?.value === '', `${$('.fx-q')?.value}`);
      await type('.fx-q', 'Sharran');
      await click($$('.suggest .hit').find((h) => /Sharran Step/.test(h.textContent)));
      await type('.fx-q', '');
      await sleep(350);
      ok('§2 emptying the box clears the card', !$('.result'), $('.result') ? 'card still there' : 'cleared');
      await type('.fx-q', 'Sharran');
      await click($$('.suggest .hit').find((h) => /Sharran Step/.test(h.textContent)));

      // 3 · the walk: for what (done), start from, the FX
      await click('[data-act="create-new"]');
      ok('§3 Create FX opens the walk on step 2, step 1 already answered', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && stepNow() === 2 && $('.step[data-state="done"]')?.dataset.step === '1', `tab ${$('[role=tab][aria-selected="true"]')?.dataset.tab}, step ${stepNow()}`);
      ok('§3 step 2 offers duplicate, a starter and from scratch', $$('[data-act="cw-start"]').length === 3 && /Duplicate/.test(text('.choices')) && /Blank/.test(text('.choices')), text('.choices').slice(0, 120));
      ok('§3 Next waits until a start is chosen', $('[data-act="cw-next"]')?.disabled === true, '');
      await click('[data-act="cw-start"][data-start="dup"]');
      await type('.cw-like', 'misty step');
      const like = $$('.suggest .hit').find((h) => h.dataset.id === 'misty-step');
      ok('§3 the Which-fx box offers the Misty Step fx', !!like, $$('.suggest .hit').map((h) => h.dataset.id).join(', '));
      await click(like);
      await click('[data-act="cw-next"]');
      ok('§3 step 3 shows Misty Step\'s scenes, one line each, seeded from the copy', stepNow() === 3 && $$('.scene').length >= 2 && /Copy of Misty Step/.test(text('.walk .lead')), `${$$('.scene').length} scenes · ${text('.walk .lead').slice(0, 60)}`);
      const colours = $$('.cw-colour')[0] ? [...$$('.cw-colour')[0].options].map((o) => o.value) : [];
      ok('§3 each scene\'s colour picker lists its family\'s own colours, dark black among them', colours.includes('dark_black') && colours.includes('blue'), colours.join(', '));
      for (let i = 0; i < 6; i++) { const sel = $$('.cw-colour').find((s) => s.value !== 'dark_black' && [...s.options].some((o) => o.value === 'dark_black')); if (!sel) break; await choose(sel, 'dark_black'); }
      ok('§3 the draft reads back as the sentence, in black, before anything is saved', /dark black/.test(text('.walk .preview')) && /Sharran Step · when used/.test(text('.walk .preview')) && !/blue/.test(text('.walk .preview')), text('.walk .preview'));
      await choose($$('.cw-delay')[1], '750');
      ok('§3 the Delay field on scene 2 is read back in its line and the preview', $$('.cw-delay')[1]?.value === '750' && /after 750 ms/.test($$('.scene .line')[1]?.textContent ?? '') && /after 750 ms/.test(text('.walk .preview')), `${$$('.cw-delay').map((d) => d.value).join(',')} · ${$$('.scene .line')[1]?.textContent}`);
      await choose($$('.cw-delay')[1], '500');
      ok('§3 nothing has been saved yet', api.fx.buffer().length === before.length, `${api.fx.buffer().length}`);

      // 4 · when it plays, save to
      await click('[data-act="cw-next"]');
      ok('§4 step 4 answers for the spell Sharran Step, when used', stepNow() === 4 && /Sharran Step/.test(text('[data-act="cw-key"][aria-pressed="true"]')) && $('[data-act="cw-on"][aria-pressed="true"]')?.dataset.on === 'use', `${text('[data-act="cw-key"][aria-pressed="true"]')}`);
      ok('§4 the outcomes are shown as phase 4, not offered yet', /phase 4/.test(text('.walk')) && $$('.walk .pills button:disabled').length >= 4, '');
      ok('§4 what will be saved is read back on step 4, before Save', /dark black/.test(text('.walk .preview')) && /Preview/.test(text('.walk .preview')) && !!$('[data-act="cw-save"]'), text('.walk .preview').slice(0, 200));
      await click('[data-act="cw-save"]');
      await sleep(500);
      const saved = api.fx.buffer().find((l) => l.id === 'sharran-step');
      if (saved) made.push(saved.id);
      ok('§4 Save writes the FX to the world buffer with its scenes, a draft, with provenance', saved && Array.isArray(saved.scenes) && saved.scenes.length >= 2 && !saved.to && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at) && /like Misty Step/.test(saved.note), JSON.stringify(saved).slice(0, 300));
      ok('§4 the window lands on Look up with the custom FX', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'lookup' && /Custom/.test(text('.status')) && /dark black/.test(text('.sentence')) && /Draft/.test(text('.why')), `${text('.status')} | ${text('.sentence')} | ${text('.why')}`);
      ok('§4 the spell resolves to it from the world layer', api.resolve(tmp).fx?.id === 'sharran-step' && api.resolve(tmp).source === 'world', api.resolve(tmp).source);
      const r4 = api.sentenceFor(tmp);
      ok('§4 the API reads the same sentence the screen shows', r4.sentence === text('.sentence'), `${r4.sentence} | ${text('.sentence')}`);

      // 5 · Custom lists it, newest first, with who wrote it
      await click('[data-tab="house"]');
      const firstRow = $('.list .row');
      ok('§5 Custom lists Sharran Step first under Global Hook, one line, a Draft, with Edit, Export and Delete', firstRow && /^Sharran Step/.test(firstRow.textContent.trim()) && /Sharran Step \(spell\)/.test(firstRow.textContent) && /Draft/.test(firstRow.textContent) && !/when used/.test(firstRow.textContent) && !!firstRow.querySelector('[data-act="export-fx"]') && !!firstRow.querySelector('[data-act="delete-fx"]'), firstRow?.textContent.replace(/\s+/g, ' ').slice(0, 200));
      await type('.fx-cq', 'sharran');
      await sleep(400);
      ok('§5 the search narrows the list', $$('.list .row').length === 1, `${$$('.list .row').length} rows`);
      ok('§5 two sub-tabs with counts: Global Hook, Item Hook', $$('[data-act="custom-kind"]').length === 2 && /Global Hook · \d+/.test(text('.subtabs')) && /Item Hook · \d+/.test(text('.subtabs')), text('.subtabs'));
      await click('[data-act="custom-kind"][data-kind="item"]');
      ok('§5 the Item Hook sub-tab carries its line and its own rows', /Item Hooks play for one item only/.test(text('[data-pane="house"]')) && $$('.list .row').every((r) => !/\(spell\)/.test(r.textContent)), `${$$('.list .row').length} rows`);
      await click('[data-act="custom-kind"][data-kind="global"]');

      // 6 · Corpus (behind the maintainer switch): what waits, binding and unbinding
      ok('§6 without the maintainer switch there is no Stock FX tab', !$('[data-tab="stock"]'), $$('[role=tab]').map((t) => t.textContent).join(', '));
      await game.settings.set(MOD, 'maintainer', true);
      await app.render(); await sleep(200);
      await click('[data-tab="stock"]');
      ok('§6 Corpus lists Stock as rows, searchable, with a Maintain card', $$('.list .row').length >= 200 && /Stock · \d+ FX/.test(text('[data-pane="stock"]')) && /Maintain · /.test(text('[data-pane="stock"]')), `${$$('.list .row').length} rows`);
      const row6 = $$('.list .row').find((r) => /Sharran Step/.test(r.textContent));
      ok('§6 Not yet shipped lists Sharran Step as a Draft, with Stage: House', row6 && /Draft/.test(row6.textContent) && !!row6.querySelector('[data-act="co-stage"][data-to="house"]'), row6?.textContent.replace(/\s+/g, ' ').slice(0, 160));
      ok('§6 with nothing staged there is no Ship card', !$('[data-act="co-ship"]'), '');
      await click(row6.querySelector('[data-act="co-stage"][data-to="house"]'));
      await sleep(300);
      ok('§6 Stage: House stages it, and the Ship button names the version, the card the file', api.fx.buffer().find((l) => l.id === 'sharran-step')?.to === 'house' && /^Ship /.test(text('[data-act="co-ship"]')) && /house\.json/.test(text('[data-pane="stock"]')), text('[data-act="co-ship"]'));
      await click($$('.list .row').find((r) => /Sharran Step/.test(r.textContent))?.querySelector('[data-act="co-stage"][data-to=""]'));
      await sleep(300);
      ok('§6 Unstage makes it a draft again', !api.fx.buffer().find((l) => l.id === 'sharran-step')?.to && !$('[data-act="co-ship"]'), '');
      await click($$('.list .row').find((r) => /Sharran Step/.test(r.textContent))?.querySelector('[data-act="co-stage"][data-to="house"]'));
      await sleep(300);
      ok('§6 staged again for the ship later', api.fx.buffer().find((l) => l.id === 'sharran-step')?.to === 'house', '');

      // 7 · one item's own FX, through the walk (from the card, duplicating the FX it has)
      api.open({ item: tmp });
      await sleep(300);
      await click('[data-act="create-from"]');
      ok('§7 Duplicate opens the walk on step 3 with the FX copied', stepNow() === 3 && $$('.scene').length >= 2 && /Copy of Sharran Step/.test(text('.walk .lead')), `step ${stepNow()} · ${text('.walk .lead').slice(0, 40)}`);
      await click('[data-act="cw-next"]');
      const only = $('[data-act="cw-only"]');
      ok('§7 step 4 offers an Item Hook for an item on a sheet', !!only && /Item Hook/.test(only.textContent), only?.textContent);
      await click(only);
      ok('§7 with the Item Hook the preview says so', /Item Hook: Sharran Step/.test(text('.walk .preview')), text('.walk .preview').slice(-120));
      await click('[data-act="cw-save"]');
      await sleep(500);
      const own = api.fx.buffer().find((l) => l.id === 'sharran-step-fx-test-caster');
      if (own) made.push(own.id);
      const flag = tmp.getFlag(MOD, 'fx');
      ok('§7 the item now points at an FX of its own, keyed to nothing, a draft in this world', own && own.for?.length === 0 && !own.to && flag === own.id, `flag ${flag} · ${JSON.stringify(own).slice(0, 200)}`);
      const r7 = api.sentenceFor(tmp);
      ok('§7 the item plays its own FX ahead of the spell\'s, and says so', r7.fx?.id === own?.id && /Item Hook/.test(r7.why), `${r7.sentence} | ${r7.why}`);
      const other = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const r7b = api.sentenceFor(other[0]);
      ok('§7 another copy of the spell still plays the spell\'s fx', r7b.fx?.id === 'sharran-step' && /dark black/.test(r7b.sentence), r7b.sentence);
      await other[0].delete();
      ok('§7 the card offers Revert, and no Play nothing', /Revert/.test(text('.actions')) && !$('[data-act="silence"]'), text('.actions'));
      await click('[data-act="remove"]');
      await sleep(400);
      ok('§7 back: the pointer is gone and the spell\'s fx answers again', !tmp.getFlag(MOD, 'fx') && !api.fx.buffer().some((l) => l.id === own?.id) && api.resolve(tmp).fx?.id === 'sharran-step', api.resolve(tmp).fx?.id);

      // 9 · the ship: the corpus files and the version written into the module on this server, then restored
      api.open({ tab: 'stock' });
      await sleep(300);
      const versionBefore = api.corpus.version();
      const next = api.corpus.nextVersions(versionBefore);
      await choose('.co-version', next.patch);
      await type('.co-note', 'the suite shipped Sharran Step');
      ok('§9 the Ship button names the version chosen', text('[data-act="co-ship"]').includes(next.patch), text('[data-act="co-ship"]'));
      let shipped;
      try { shipped = await api.corpus.ship({ version: next.patch, note: 'the suite shipped Sharran Step' }); } catch (e) { shipped = { ok: false, problems: [e.message] }; }
      ok('§9 the ship writes house.json and the record, and says so', shipped.ok && shipped.version === next.patch && shipped.previous === versionBefore && shipped.written.some((w) => w.file === 'recipes/house.json' && w.fx.includes('sharran-step')), JSON.stringify(shipped).slice(0, 300));
      const houseNow = JSON.parse(await readFile('recipes/house.json'));
      const recordNow = JSON.parse(await readFile('recipes/shipped.json'));
      ok('§9 the server\'s house.json now holds Sharran Step, with no "to" left on it', houseNow.fx.some((l) => l.id === 'sharran-step' && l.to === undefined && l.by === game.user.name), `${houseNow.fx.length} fx`);
      ok('§9 the record\'s first line is this ship, with the version stamped', recordNow.shipped[0]?.version === next.patch && recordNow.shipped[0].by === game.user.name && recordNow.shipped[0].fx.some((l) => l.id === 'sharran-step' && l.to === 'house'), JSON.stringify(recordNow.shipped[0]));
      ok('§9 the module\'s own manifest is left alone (the pull tool stamps the repo)', JSON.parse(await readFile('module.json')).version === game.modules.get(MOD).version, '');
      ok('§9 the shipped fx has left the world buffer and answers from the house corpus now', !api.fx.buffer().some((l) => l.id === 'sharran-step') && api.resolve(tmp).source === 'house' && api.resolve(tmp).fx?.id === 'sharran-step', `${api.resolve(tmp).source}`);
      app.refresh();
      await app.render();
      await sleep(300);
      ok('§9 Corpus lists the ship in Shipped from here and shows the new version', /the suite shipped Sharran Step/.test(text('[data-pane="stock"]')) && text('[data-pane="stock"]').includes(`Maintain · ${next.patch}`), text('[data-pane="stock"]').match(/Maintain · [^\s]+/)?.[0] ?? 'no version line');
      // restore the module's files byte for byte, and read the corpora again
      for (const p of FILES) await writeFile(p, snapshot[p]);
      await api.corpus.reload();
      let same = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) same = false;
      ok('§9 restored: the module\'s files are as they were and Sharran Step is gone from the corpus', same && !api.resolve(tmp).fx, `${api.resolve(tmp).why ?? ''}`);

      // 12 · Check: pick a book, read it, find unused assets
      await click('[data-tab="audit"]');
      const bookPills = $$('[data-act="book"]');
      ok('§12 Check lists the item compendiums to pick from, and the button waits for a pick', bookPills.length > 0 && $('[data-act="books"]')?.disabled, `${bookPills.length} books, button ${$('[data-act="books"]')?.textContent}`);
      const smallest = bookPills.map((b) => ({ b, n: Number(b.querySelector('.note')?.textContent) || 0 })).filter((x) => x.n > 0).sort((x, y) => x.n - y.n)[0]?.b ?? bookPills[0];
      await click(smallest);
      ok('§12 one compendium picked: the button says so', /Check \(1\)/.test($('[data-act="books"]')?.textContent) && !$('[data-act="books"]').disabled, $('[data-act="books"]')?.textContent);
      await click('[data-act="books"]');
      for (let i = 0; i < 120 && !$('.tile'); i++) await sleep(250);
      const ctiles = $$('.tile').map((t) => t.textContent.replace(/\s+/g, ' ').trim());
      ok('§12 the book is read: Abilities, With FX, No FX', ctiles.length === 3 && /Abilities/.test(ctiles[0]) && /With FX/.test(ctiles[1]), ctiles.join(' | '));

      // 13 · the Asset Library: browse, step the variants, sounds, the unused filter, and the picker door from the walk
      await click('[data-tab="library"]');
      const styles = $$('[data-act="lib-sel"]');
      ok('§13 the Asset Library lists the JB2A styles with their variant counts', styles.length > 100 && styles.every((r) => /\d+/.test(r.querySelector('.c')?.textContent ?? '')), `${styles.length} styles`);
      await click(styles.find((r) => r.dataset.id === 'jb2a.arcane_hand'));
      const video = $('.stage video');
      ok('§13 a style plays its webm on a loop, muted, and shows the Sequencer path', !!video && video.loop && video.muted && /\.webm$/.test(video.getAttribute('src') ?? '') && text('.lib-dbpath') === 'jb2a.arcane_hand.blue', `${video?.getAttribute('src')} · ${text('.lib-dbpath')}`);
      const content = app.element.querySelector('.fxstudio-content');
      ok('§13 the stage fits the window: nothing scrolls sideways', content.scrollWidth <= content.clientWidth + 1, `${content.scrollWidth} vs ${content.clientWidth}`);
      $('.shelf .list').scrollTop = 300; await sleep(50);
      await click('[data-act="lib-next"]');
      ok('§13 the arrow steps to the next variant, the dropdown follows, and the list keeps its scroll', text('.lib-dbpath') !== 'jb2a.arcane_hand.blue' && $('.lib-variant')?.value === '1' && $('.shelf .list').scrollTop === 300, `${text('.lib-dbpath')} · ${$('.lib-variant')?.value} · scroll ${$('.shelf .list').scrollTop}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.fire_bolt'));
      ok('§13 the FX that use a style are named, with their variant', /Used in \d+ FX/.test(text('.lib-users')) && !!$('[data-act="lib-open-fx"]'), text('.lib-users').slice(0, 120));
      await click('[data-act="lib-switch"][data-lib="psfx"]');
      ok('§13 sounds are grouped by PSFX group, with one Play button and a psfx path', $$('.shelf .letter').length > 5 && $$('[data-act="lib-play"]').length === 1 && !$('[data-act="lib-map"]') && /^psfx\./.test(text('.lib-dbpath')), `${$$('.shelf .letter').length} groups · ${text('.lib-dbpath')}`);
      const allSounds = $$('[data-act="lib-sel"]').length;
      await click('[data-act="lib-only"][data-only="unused"]');
      const unusedN = $$('[data-act="lib-sel"]').length;
      ok('§13 the Unused pill narrows the list, no count line under the pills', unusedN < allSounds && !$('.shelf .count') && $('[data-act="lib-only"][data-only="unused"]')?.getAttribute('aria-pressed') === 'true', `${unusedN} of ${allSounds}`);
      await click('[data-act="lib-only"][data-only="used"]');
      ok('§13 the Used pill shows the rest', $$('[data-act="lib-sel"]').length === allSounds - unusedN, `${$$('[data-act="lib-sel"]').length}`);
      await click('[data-act="lib-only"][data-only="used"]');
      // the picker door: a line of the walk opens the Library, Use this writes the path into that line
      await click('[data-tab="lookup"]');
      await type('.fx-q', 'Misty Step');
      await click($$('.suggest .hit').find((h) => /Misty Step/.test(h.textContent)));
      await click('[data-act="create-from"]');
      ok('§13 Duplicate is on step 3 with a Browse button on the first VFX', stepNow() === 3 && !!$('[data-act="cw-browse"][data-slot="asset"]'), `step ${stepNow()}`);
      await click('[data-act="cw-browse"][data-slot="asset"]');
      ok('§13 Browse opens the Asset Library as the picker, saying what it picks for', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'library' && /VFX for Misty Step · scene 1/.test(text('.picking')), text('.picking'));
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.arcane_hand'));
      await click('[data-act="lib-pick-use"]');
      ok('§13 Use returns to step 3 with the scene playing it', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && stepNow() === 3 && /arcane hand/i.test(text('.walk .preview')), text('.walk .preview').slice(0, 160));
      ok('§13 the shapes carry tooltips and a legend on request', $$('[data-act="cw-add"]').every((b) => (b.dataset.tooltip ?? '').length > 20), '');
      await click('[data-act="cw-shapes"]');
      ok('§13 Shapes opens the legend', $$('.legend .row').length === 8, `${$$('.legend .row').length} rows`);
      app.walk = null; app.view.tab = 'lookup'; await app.render(); await sleep(200);
      ok('§13 the walk is dropped, nothing saved', api.fx.buffer().length === before.length, `${api.fx.buffer().length}`);

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
      for (const id of made) if (api.fx.buffer().some((l) => l.id === id)) await api.fx.remove(id).catch(() => null);
      await game.settings.set(MOD, 'maintainer', false).catch(() => null);
      let restored = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) { restored = false; await writeFile(p, snapshot[p]).catch(() => null); }
      if (!restored) await api.corpus.reload().catch(() => null);
      if (tmp) await tmp.delete().catch(() => null);
      try { await app?.close(); } catch { /* fine */ }
    }
    const after = api.fx.buffer().map((l) => l.id);
    results.push({ name: '§11 the world buffer is as it was', pass: JSON.stringify(after) === JSON.stringify(before), detail: `${before.length} → ${after.length}` });
    return { results };
  }, { fx: fixture });
  report('screens', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[screens] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
