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
    // the Library's path and file boxes are read-only fields (2026-09-07): their value is the text
    const val = (sel) => ($(sel)?.value ?? '').trim();
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
      ok('§1 the window opens with its six tabs in order, Look up last', app?.rendered && $$('[role=tab]').length === 6 && /^Stock FX ?House FX ?FX Editor ?Asset Library ?Audit ?Look up/.test(text('.tabs')), `${$$('[role=tab]').map((t) => t.textContent).join(', ')}`);
      ok('§1 Look up shows Misty Step as a sentence, and why', /Misty Step · when used/.test(text('.sentence')) && /Global Hook · Misty Step \(spell\) · (Stock|House)/.test(text('.why')), `${text('.sentence')} | ${text('.why')}`);
      ok('§1 the card carries no sheet line, only the title and the sentence', !$('.result .owner'), text('.result .owner') || 'none');
      ok('§1 the card offers Open FX', /Open FX/.test(text('.actions')), text('.actions'));

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

      // 3 · the sheet: Create FX opens a new sheet unlocked, hooked to Sharran Step; Copy from seeds it
      await click('[data-act="create-new"]');
      ok('§3 Create FX opens the FX Editor on a new sheet, unlocked, hooked to the spell', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && $('.sheet')?.dataset.edit === 'true' && /Global Hook: Sharran Step \(spell\)/.test(text('.sheet .grid2')) && /New/.test(text('.sheet h2')), `tab ${$('[role=tab][aria-selected="true"]')?.dataset.tab} · ${text('.sheet h2')}`);
      ok('§3 Save waits: no scenes yet, the problem is named', $('[data-act="sh-save"]')?.disabled === true && !!$('.sheet .problem'), text('.sheet .problem'));
      ok('§3 an empty sequence offers Copy from and Add', !!$('.sh-like') && $$('[data-act="cw-add"]').length === 8, `${$$('[data-act="cw-add"]').length} shapes`);
      await type('.sh-like', 'misty step');
      const like = $$('.suggest .hit').find((h) => h.dataset.id === 'misty-step');
      ok('§3 Copy from offers the Misty Step FX', !!like, $$('.suggest .hit').map((h) => h.dataset.id).join(', '));
      await click(like);
      ok('§3 the sequence holds Misty Step\'s scenes, numbered, one plain-English line each', $$('.scene').length >= 2 && $$('.scene .num').map((n) => n.textContent).join('') === [...Array($$('.scene').length)].map((_, k) => k + 1).join('') && $$('.scene .line').every((l) => l.textContent.length > 10), `${$$('.scene').length} scenes`);
      ok('§3 the rows are typed and striped by kind: VFX, VFX, Move', $$('.scene').map((r) => r.dataset.kind).join(',') === 'vfx,vfx,move', $$('.scene').map((r) => r.dataset.kind).join(','));
      ok('§3 the knobs sit in labelled fields', $$('.scene .f .l').length >= 8 && /VFX/.test(text('.scene .f-vfx .l')) && /Delay/.test(text('.scene .f-delay .l')), `${$$('.scene .f .l').length} fields`);
      ok('§3 no colour knob on a scene: the VFX field names the variant and Browse is the door', !$('.cw-colour') && $$('[data-act="cw-browse"][data-slot="asset"]').length === 2 && /misty step 01/i.test($('.scene .f-vfx input')?.value ?? ''), $('.scene .f-vfx input')?.value ?? '');
      // paint both marks black through the Library: Browse → the dark black variant → Use
      const blacken = async (n) => {
        await click($$('[data-act="cw-browse"][data-slot="asset"]')[n]);
        const sel = $('.lib-variant');
        // the family holds every number and colour (01 Blue, 01 Dark Black, 02 Blue…): keep this
        // scene's own number and take its dark black
        const now = sel ? sel.options[sel.selectedIndex].textContent.trim().split(' ')[0] : '';
        const opt = sel ? [...sel.options].find((o) => o.textContent.trim().startsWith(now) && /dark black/i.test(o.textContent)) : null;
        if (opt) await choose(sel, opt.value);
        await click('[data-act="lib-pick-use"]');
      };
      await blacken(0);
      await blacken(1);
      ok('§3 Browse → the dark black variant → Use paints a scene without a colour knob', /dark black/.test($('.scene .f-vfx input')?.value ?? ''), $('.scene .f-vfx input')?.value ?? '');
      ok('§3 the draft reads back as the sentence, in black, before anything is saved', /dark black/.test(text('.sheet .preview')) && /Sharran Step · when used/.test(text('.sheet .preview')) && !/blue/.test(text('.sheet .preview')), text('.sheet .preview'));
      await choose($$('.cw-delay')[1], '750');
      ok('§3 the Delay field on scene 2 is read back in its line and the preview', $$('.cw-delay')[1]?.value === '750' && /after 750 ms/.test($$('.scene .line')[1]?.textContent ?? '') && /after 750 ms/.test(text('.sheet .preview')), `${$$('.cw-delay').map((d) => d.value).join(',')} · ${$$('.scene .line')[1]?.textContent}`);
      await choose($$('.cw-delay')[1], '500');
      const wait0 = $$('.cw-wait')[0];
      wait0.checked = true; wait0.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250);
      ok('§3 Then · wait for it to finish on scene 1 turns the sentence\'s "and" into "then"', /, then a mark/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 160));
      const wait0b = $$('.cw-wait')[0]; wait0b.checked = false; wait0b.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250);
      ok('§3 Lasts sits on every row and is live only on the marks (R1)', $$('.cw-persist').length === $$('.scene').length && $$('.cw-persist').filter((x) => !x.disabled).length === 2 && $('.scene[data-kind="move"] .f-lasts')?.dataset.na === 'true', `${$$('.cw-persist').filter((x) => !x.disabled).length} live of ${$$('.cw-persist').length}`);
      await click($$('[data-act="cw-down"]')[0]);
      ok('§3 the arrows reorder: scene 1 moved down', $$('.scene').map((r) => r.dataset.kind).join(',') === 'vfx,vfx,move' && /misty step 02/.test($$('.scene .line')[0]?.textContent ?? ''), $$('.scene .line')[0]?.textContent);
      await click($$('[data-act="cw-up"]')[1]);
      ok('§3 and back up', /misty step 01/.test($$('.scene .line')[0]?.textContent ?? ''), $$('.scene .line')[0]?.textContent);
      ok('§3 nothing has been saved yet', api.fx.buffer().length === before.length, `${api.fx.buffer().length}`);

      // 4 · the hook block and Save
      ok('§4 the Hook block: On use pressed, On pressed, no outcomes until phase 4', $('[data-act="sh-on"][aria-pressed="true"]')?.dataset.on === 'use' && $('[data-act="sh-off"][aria-pressed="true"]')?.dataset.v === 'false' && text('[data-act="sh-off"][data-v="false"]') === 'On' && !/phase 4/.test(text('.sheet .grid2')), text('.sheet .grid2').replace(/\s+/g, ' ').slice(0, 100));
      ok('§4 the bar is static: every control is there, greyed where the mode does not offer it', $$('.lockbar button').length === 7 && !!$('[data-act="sh-new"]') && $('[data-act="sh-dup"]')?.disabled === true && $('[data-act="sh-export"]')?.disabled === true && $('[data-act="sh-delete"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 the id is shown, derived from the ability', text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      ok('§4 Save is enabled now the sequence has scenes', $('[data-act="sh-save"]')?.disabled === false && !$('.sheet .problem'), text('.sheet .problem'));
      await click('[data-act="sh-save"]');
      await sleep(500);
      const saved = api.fx.buffer().find((l) => l.id === 'sharran-step');
      if (saved) made.push(saved.id);
      ok('§4 Save writes the FX to the world buffer with its scenes, a draft, with provenance', saved && Array.isArray(saved.scenes) && saved.scenes.length >= 2 && !saved.to && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at) && /copied from Misty Step/.test(saved.note), JSON.stringify(saved ?? null).slice(0, 300));
      ok('§4 what Copy from wrote is a full copy, standing on its own: no shortcut of any kind', saved && saved.like === undefined && saved.with === undefined, `like ${saved?.like} · with ${JSON.stringify(saved?.with)}`);
      ok('§4 the sheet stays open, locked, tagged Draft, with the sentence', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && $('.sheet')?.dataset.edit === 'false' && /Draft/.test(text('.sheet h2')) && /dark black/.test(text('.sheet .preview')) && !!$('[data-act="sh-dup"]') && /Delete/.test(text('[data-act="sh-delete"]')), `${text('.sheet h2')} | ${text('[data-act="sh-delete"]')}`);
      ok('§4 locked: the knobs are read-only and the tools are hidden', $$('.scene .knobs select').every((x) => x.disabled) && !$('[data-act="cw-drop"]'), '');
      ok('§4 locked: the same bar, Save and Cancel greyed instead, nothing moved', $$('.lockbar button').length === 7 && $('[data-act="sh-save"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === true && $('[data-act="sh-dup"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 the spell resolves to it from the world layer', api.resolve(tmp).fx?.id === 'sharran-step' && api.resolve(tmp).source === 'world', api.resolve(tmp).source);
      const r4 = api.sentenceFor(tmp);
      ok('§4 the API reads the same sentence the sheet shows, in the What plays box', text('.sheet .preview') === `What plays${r4.sentence}`, `${r4.sentence} | ${text('.sheet .preview')}`);
      ok('§4 the sentence is said once: What plays at the top, none under the sequence', $$('.sheet .preview').length === 1 && !$('.sheet .sentence') && /^What plays/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 60));
      await click('[data-act="sh-back"]');
      ok('§4 Back returns to where the sheet was opened from: Look up, on the card', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'lookup' && /Custom/.test(text('.status')) && /Draft/.test(text('.why')), `${text('.status')} | ${text('.why')}`);

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

      // 6 · Stock FX and the maintainer card on Audit: what waits, staging and unstaging
      ok('§6 Stock FX is always there, no setting to switch it on', !!$('[data-tab="stock"]') && !game.settings.settings.has(`${MOD}.maintainer`), $$('[role=tab]').map((t) => t.textContent).join(', '));
      await click('[data-tab="stock"]');
      ok('§6 Stock FX lists the corpus as rows, searchable, and no Maintain card', $$('.list .row').length >= 200 && /Stock · \d+ FX/.test(text('[data-pane="stock"]')) && !/Maintain · /.test(text('[data-pane="stock"]')), `${$$('.list .row').length} rows`);
      const first6 = $$('.list .row')[0];
      ok('§6 a stock row is read, not edited: View, no Edit', !!first6?.querySelector('[data-act="open-fx"]') && !first6?.querySelector('[data-act="edit-fx"]') && /View/.test(first6?.textContent ?? ''), first6?.textContent.replace(/\s+/g, ' ').slice(0, 120));
      const page6 = $$('.list .row').length;
      ok('§6 the foot offers Load more with what is left, not a search-to-narrow line', !!$('[data-act="co-more"]') && !/Search to narrow/.test(text('[data-pane="stock"]')), text('.more').replace(/\s+/g, ' '));
      await click('[data-act="co-more"]');
      ok('§6 Load more brings the next page in', $$('.list .row').length > page6, `${page6} → ${$$('.list .row').length}`);
      await click('[data-tab="audit"]');
      ok('§6 the Maintain card sits under Audit now', /Maintain · /.test(text('[data-pane="audit"]')), text('[data-pane="audit"]').match(/Maintain · [^\s]+/)?.[0] ?? 'no card');
      const row6 = $$('.list .row').find((r) => /Sharran Step/.test(r.textContent));
      ok('§6 Not yet shipped lists Sharran Step as a Draft, with Stage: House', row6 && /Draft/.test(row6.textContent) && !!row6.querySelector('[data-act="co-stage"][data-to="house"]'), row6?.textContent.replace(/\s+/g, ' ').slice(0, 160));
      ok('§6 with nothing staged there is no Ship card', !$('[data-act="co-ship"]'), '');
      await click(row6.querySelector('[data-act="co-stage"][data-to="house"]'));
      await sleep(300);
      ok('§6 Stage: House stages it, and the Ship button names the version, the card the file', api.fx.buffer().find((l) => l.id === 'sharran-step')?.to === 'house' && /^Ship /.test(text('[data-act="co-ship"]')) && /house\.json/.test(text('[data-pane="audit"]')), text('[data-act="co-ship"]'));
      await click($$('.list .row').find((r) => /Sharran Step/.test(r.textContent))?.querySelector('[data-act="co-stage"][data-to=""]'));
      await sleep(300);
      ok('§6 Unstage makes it a draft again', !api.fx.buffer().find((l) => l.id === 'sharran-step')?.to && !$('[data-act="co-ship"]'), '');
      await click($$('.list .row').find((r) => /Sharran Step/.test(r.textContent))?.querySelector('[data-act="co-stage"][data-to="house"]'));
      await sleep(300);
      ok('§6 staged again for the ship later', api.fx.buffer().find((l) => l.id === 'sharran-step')?.to === 'house', '');

      // 7 · one item's own FX, through the sheet (Open FX from the card, unlock, Item Hook, Save)
      api.open({ item: tmp });
      await sleep(300);
      await click('[data-act="open-sheet"]');
      ok('§7 Open FX opens the sheet on the spell\'s FX, locked', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && $('.sheet')?.dataset.edit === 'false' && text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      const sw = $('.sh-edit'); sw.checked = true; sw.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      ok('§7 the Edit switch unlocks the sheet: Save and Cancel appear, the tools too', $('.sheet')?.dataset.edit === 'true' && !!$('[data-act="sh-save"]') && !!$('[data-act="sh-cancel"]') && !!$('[data-act="cw-drop"]'), '');
      const only = $('[data-act="sh-only"]');
      ok('§7 the Hook block offers an Item Hook for an item on a sheet', !!only && /Item Hook/.test(only.textContent), only?.textContent);
      await click(only);
      ok('§7 with the Item Hook the sheet says so and the id is the item\'s own', /Item Hook/.test(text('.sheet h2')) && text('.sheet code.id') === 'sharran-step-fx-test-caster', `${text('.sheet h2')} · ${text('.sheet code.id')}`);
      await click('[data-act="sh-save"]');
      await sleep(500);
      const own = api.fx.buffer().find((l) => l.id === 'sharran-step-fx-test-caster');
      if (own) made.push(own.id);
      const flag = tmp.getFlag(MOD, 'fx');
      ok('§7 the item now points at an FX of its own, keyed to nothing, a draft in this world', own && own.for?.length === 0 && !own.to && flag === own.id, `flag ${flag} · ${JSON.stringify(own ?? null).slice(0, 200)}`);
      const r7 = api.sentenceFor(tmp);
      ok('§7 the item plays its own FX ahead of the spell\'s, and says so', r7.fx?.id === own?.id && /Item Hook/.test(r7.why), `${r7.sentence} | ${r7.why}`);
      const other = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const r7b = api.sentenceFor(other[0]);
      ok('§7 another copy of the spell still plays the spell\'s fx', r7b.fx?.id === 'sharran-step' && /dark black/.test(r7b.sentence), r7b.sentence);
      await other[0].delete();
      api.open({ item: tmp });
      await sleep(300);
      ok('§7 the card offers Revert, and no Play nothing', /Revert/.test(text('.actions')) && !$('[data-act="silence"]'), text('.actions'));
      await click('[data-act="remove"]');
      await sleep(400);
      ok('§7 back: the pointer is gone and the spell\'s fx answers again', !tmp.getFlag(MOD, 'fx') && !api.fx.buffer().some((l) => l.id === own?.id) && api.resolve(tmp).fx?.id === 'sharran-step', api.resolve(tmp).fx?.id);
      // the guard: a locked sheet's Cancel drops changes; Delete on a plain draft is Delete
      await click('[data-act="open-sheet"]');
      const sw2 = $('.sh-edit'); sw2.checked = true; sw2.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      await choose($$('.cw-delay')[1], '900');
      ok('§7 a change unlocks Save', /after 900 ms/.test(text('.sheet .preview')) && $('[data-act="sh-save"]')?.disabled === false, '');
      await click('[data-act="sh-cancel"]');
      ok('§7 Cancel drops the change and locks the sheet again', $('.sheet')?.dataset.edit === 'false' && /after 500 ms/.test(text('.sheet .preview')) && api.fx.buffer().find((l) => l.id === 'sharran-step')?.scenes?.[1]?.delay === 500, text('.sheet .preview').slice(0, 120));

      // 9 · the ship: the corpus files and the version written into the module on this server, then restored
      api.open({ tab: 'audit' });
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
      ok('§9 Audit lists the ship in Shipped from here and shows the new version', /the suite shipped Sharran Step/.test(text('[data-pane="audit"]')) && text('[data-pane="audit"]').includes(`Maintain · ${next.patch}`), text('[data-pane="audit"]').match(/Maintain · [^\s]+/)?.[0] ?? 'no version line');
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
      ok('§13 a style plays its webm on a loop, muted, and shows the Sequencer path', !!video && video.loop && video.muted && /\.webm$/.test(video.getAttribute('src') ?? '') && val('.lib-dbpath') === 'jb2a.arcane_hand.blue', `${video?.getAttribute('src')} · ${val('.lib-dbpath')}`);
      const content = app.element.querySelector('.fxstudio-content');
      ok('§13 the stage fits the window: nothing scrolls sideways', content.scrollWidth <= content.clientWidth + 1, `${content.scrollWidth} vs ${content.clientWidth}`);
      // R3: selecting a row changes its colour and nothing else — every other row stays where it is
      const rects13 = () => $$('.shelf .list button.row').slice(0, 14).map((r) => { const b = r.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }).join(',');
      const geom13 = rects13();
      await click($$('[data-act="lib-sel"]')[3]);
      const moved13 = rects13() !== geom13;
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.arcane_hand'));
      ok('§13 selecting a row changes its colour, never the layout (R3)', !moved13 && rects13() === geom13, moved13 ? `${geom13.slice(0, 70)} -> ${rects13().slice(0, 70)}` : 'every row unmoved');
      $('.shelf .list').scrollTop = 300; await sleep(50);
      await click('[data-act="lib-next"]');
      ok('§13 the arrow steps to the next variant, the dropdown follows, and the list keeps its scroll', val('.lib-dbpath') !== 'jb2a.arcane_hand.blue' && $('.lib-variant')?.value === '1' && $('.shelf .list').scrollTop === 300, `${val('.lib-dbpath')} · ${$('.lib-variant')?.value} · scroll ${$('.shelf .list').scrollTop}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.fire_bolt'));
      ok('§13 the FX that use a style are named, with the path each names', /Used in \d+ FX/.test(text('.lib-users')) && !!$('[data-act="lib-open-fx"]') && !!$('[data-act="lib-goto"]'), text('.lib-users').slice(0, 120));
      await click('[data-act="lib-switch"][data-lib="psfx"]');
      ok('§13 sounds are grouped by PSFX group, with one Play button and a psfx path', $$('.shelf .letter').length > 5 && $$('[data-act="lib-play"]').length === 1 && !$('[data-act="lib-map"]') && /^psfx\./.test(val('.lib-dbpath')), `${$$('.shelf .letter').length} groups · ${val('.lib-dbpath')}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'psfx.weapon-swooshes.light'));
      const goto13 = $$('[data-act="lib-goto"]').find((g) => /\.\d+$/.test(g.dataset.path)) ?? $$('[data-act="lib-goto"]')[0];
      const want13 = goto13?.dataset.path ?? "";
      await click(goto13);
      ok('§13 clicking a used line loads that exact path in the viewer, and marks the line', val('.lib-dbpath') === want13 && $('.use[data-now="true"] .v')?.dataset.path === want13, `${want13} → ${val('.lib-dbpath')}`);
      ok('§13 a used path deeper than a variant plays that one file', /\.(ogg|wav|mp3|webm)$/i.test(val('.lib-file')), val('.lib-file').split('/').pop());
      const allSounds = $$('[data-act="lib-sel"]').length;
      await click('[data-act="lib-only"][data-only="unused"]');
      const unusedN = $$('[data-act="lib-sel"]').length;
      ok('§13 the Unused pill narrows the list, no count line under the pills', unusedN < allSounds && !$('.shelf .count') && $('[data-act="lib-only"][data-only="unused"]')?.getAttribute('aria-pressed') === 'true', `${unusedN} of ${allSounds}`);
      await click('[data-act="lib-only"][data-only="used"]');
      ok('§13 the Used pill shows the rest', $$('[data-act="lib-sel"]').length === allSounds - unusedN, `${$$('[data-act="lib-sel"]').length}`);
      await click('[data-act="lib-only"][data-only="used"]');
      // headless hygiene: let go of the webms this section loaded before the next one
      $$('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      await sleep(300);
      // the picker door: a scene of the sheet opens the Library, Use writes the path into that scene
      await click('[data-tab="lookup"]');
      await type('.fx-q', 'Misty Step');
      await click($$('.suggest .hit').find((h) => /Misty Step/.test(h.textContent)));
      await click('[data-act="open-sheet"]');
      const sw3 = $('.sh-edit'); sw3.checked = true; sw3.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      ok('§13 the sheet is unlocked with a Browse button on the first VFX', $('.sheet')?.dataset.edit === 'true' && !!$('[data-act="cw-browse"][data-slot="asset"]'), '');
      const has13 = $('.sheet .scene .f-vfx input')?.value ?? '';
      ok('§13 the VFX field names the variant, not just the family', /misty step 01/i.test(has13), has13.replace(/\s+/g, ' ').slice(0, 80));
      await click('[data-act="cw-browse"][data-slot="asset"]');
      ok('§13 Browse opens the Asset Library as the picker, saying what it picks for', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'library' && /VFX for Misty Step · scene 1/.test(text('.picking')), text('.picking'));
      ok('§13 Browse lands on what the scene names already, not the top of the list', /^jb2a\.misty_step\.01/.test(val('.lib-dbpath')), val('.lib-dbpath'));
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.arcane_hand'));
      await click('[data-act="lib-pick-use"]');
      ok('§13 Use returns to the sheet with the scene playing it', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && /arcane hand/i.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 160));
      ok('§13 editing Misty Step (House) says Save writes a Draft over it', /Draft/.test(text('.sheet .banner')), text('.sheet .banner'));
      // the same door for the SFX slot: Browse lands on the sound the scene carries, Use writes it back
      await click('[data-act="cw-browse"][data-slot="sound"]');
      ok('§13 Browse for SFX opens on the sound the scene names', /^psfx\./.test(val('.lib-dbpath')) && /SFX for Misty Step/.test(text('.picking')), `${val('.lib-dbpath')} · ${text('.picking').slice(0, 40)}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'psfx.weapon-swooshes.light'));
      const sfx13 = val('.lib-dbpath');
      await click('[data-act="lib-pick-use"]');
      ok('§13 Use writes the SFX back into the scene, and the sentence says so', $('[role=tab][aria-selected="true"]')?.dataset.tab === 'editor' && /weapon-swooshes light/.test(text('.sheet .preview')) && api.assets.resolve(app.sheet.scenes[0].scene.sound.asset).path === sfx13, `${sfx13} | ${text('.sheet .preview').slice(-90)}`);
      const kr13 = (n) => [...$$('.scene')[n].querySelectorAll('.kr')].map((r) => [...r.querySelectorAll('.f')].map((x) => x.className.replace('f f-', '')).join(','));
      const GRID13 = 'vfx,place,size,opacity|tint,below,sfx,lasts|delay,wait,times,every|rate,spot,range,fade';
      ok('§13 every scene is the same grid: sixteen cells at permanent addresses, four to a row (R1)', $$('.scene').every((_, n) => kr13(n).join('|') === GRID13), kr13(0).join(' | '));
      const na13 = (n) => [...$$('.scene')[n].querySelectorAll('.f[data-na="true"]')].map((x) => x.className.replace('f f-', ''));
      ok('§13 a Move row and a Mark row are that same grid with different cells live', !na13(0).includes('vfx') && na13(0).includes('spot') && na13(0).includes('range') && na13(2).includes('vfx') && !na13(2).includes('spot'), `mark greys ${na13(0).join(',')} · move greys ${na13(2).join(',')}`);
      ok('§13 a greyed cell is switched off, not merely faded', $$('.scene .f[data-na="true"]').length > 0 && $$('.scene .f[data-na="true"]').every((c) => [...c.querySelectorAll('input, select, button')].every((x) => x.disabled)), `${$$('.scene .f[data-na="true"]').length} greyed cells`);
      ok('§13 nothing wraps: a knob row is four proportional columns (R2)', $$('.scene .kr').every((r) => getComputedStyle(r).display === 'grid' && getComputedStyle(r).gridTemplateColumns.split(' ').length === 4), getComputedStyle($('.scene .kr')).gridTemplateColumns);
      ok('§13 the Add pills carry tooltips', $$('[data-act="cw-add"]').every((b) => (b.dataset.tooltip ?? '').length > 20), '');
      ok('§13 the SFX select has no Find SFX: Browse is the only door', $$('.cw-sound option').every((o) => o.value !== 'find'), $$('.cw-sound option').map((o) => o.value).join(', '));
      await choose('.cw-opacity', '50');
      ok('§13 Opacity is a knob and the sentence reads it back', /at 50% opacity/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 140));
      const tintEl = $('.cw-tint');
      tintEl.value = '#ff0000'; tintEl.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200);
      ok('§13 Tint is a colour picker and the sentence reads it back', /tinted #ff0000/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 160));
      // the knobs the sentence used to speak with nothing to change them (2026-09-07)
      await choose('.cw-times', '3');
      ok('§13 Times repeats the scene, the sentence counts it, and Every comes alive in place', /3 times/.test(text('.sheet .preview')) && $('.scene .f-every')?.dataset.na !== 'true' && $('.cw-every')?.disabled === false, text('.sheet .preview').slice(-110));
      await choose('.cw-times', '1');
      await choose('.cw-rate', '0.5');
      ok('§13 Speed is read back', /0\.5× speed/.test(text('.sheet .preview')), text('.sheet .preview').slice(-110));
      await choose('.cw-rate', '1');
      const below13 = $('.cw-below'); below13.checked = true; below13.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200);
      ok('§13 Under the tokens is read back', /under the tokens/.test(text('.sheet .preview')), text('.sheet .preview').slice(-110));
      below13.checked = false; below13.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200);
      await click('[data-act="cw-tint-off"]');
      ok('§13 the tint clears again', !/tinted/.test(text('.sheet .preview')), '');
      app.sheet = null; app.view.tab = 'lookup'; await app.render(); await sleep(200);
      ok('§13 the sheet is dropped, nothing saved', api.fx.buffer().length === before.length, `${api.fx.buffer().length}`);

      // 14 · Play: the sheet plays through api.preview and saves nothing (HANDOFF step 2)
      app = api.open({ tab: 'editor', id: 'misty-step' });
      await sleep(500);
      canvas.tokens.releaseAll();
      await app.render(); await sleep(250);
      ok('§14 with no token selected Play keeps its place, greyed, and says why', $('[data-act="sh-play"]')?.disabled === true && /select a token/.test(text('[data-act="sh-play"]')) && $$('[data-act="sh-play-scene"]').length === $$('.scene').length && $$('[data-act="sh-play-scene"]').every((b) => b.disabled), text('[data-act="sh-play"]'));
      caster.control({ releaseOthers: true });
      await app.render(); await sleep(250);
      ok('§14 with a token selected both Play controls come alive', $('[data-act="sh-play"]')?.disabled === false && text('[data-act="sh-play"]').trim() === '▶ Play all' && $$('[data-act="sh-play-scene"]').every((b) => !b.disabled), text('[data-act="sh-play"]'));
      ok('§14 every scene carries a still of what it plays', $$('.scene .thumb').length === $$('.scene').length && $$('.scene video.thumb, .scene img.thumb').length >= 1, `${$$('.scene .thumb').length} thumbs of ${$$('.scene').length} scenes`);
      const buf14 = api.fx.buffer().length;
      await click($$('[data-act="sh-play-scene"]')[0]);
      await sleep(1200);
      const e14 = api.ledger[0];
      ok('§14 the row ▶ plays that one scene through the preview, and saves nothing', e14?.fx === 'preview' && e14.played && String(e14.id).startsWith('preview-') && api.fx.buffer().length === buf14, `${e14?.fx} · played ${e14?.played} · ${(e14?.files ?? []).join(', ').slice(0, 70)}`);
      await click('[data-act="sh-play"]');
      await sleep(1200);
      const e14b = api.ledger[0];
      ok('§14 ▶ Play all plays the whole FX, still saving nothing', e14b?.fx === 'misty-step' && String(e14b.id).startsWith('preview-') && api.fx.buffer().length === buf14, `${e14b?.fx} · played ${e14b?.played} · ${e14b?.why ?? ''}`);
      Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
      canvas.app.stage.removeAllListeners?.('pointerdown');
      app.sheet = null; app.view.tab = 'lookup'; await app.render(); await sleep(200);

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
    } catch (err) {
      results.push({ name: 'THROW', pass: false, detail: String(err.stack ?? err).slice(0, 600) });
    } finally {
      for (const id of made) if (api.fx.buffer().some((l) => l.id === id)) await api.fx.remove(id).catch(() => null);
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
