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
    // three tabs since step 5; the sheet is a PANE with no tab of its own, opened on an FX
    const paneNow = () => $('.pane[data-active="true"]')?.dataset.pane ?? '';
    const tabNow = () => $('[role=tab][aria-selected="true"]')?.dataset.tab ?? '';
    // the sheet is a rail and an inspector (HANDOFF step 4): pick a scene, then a band of knobs
    const pick = async (n) => click($$('.rail .pickbtn')[n]);
    const band = async (b) => click(`[data-act="sh-band"][data-band="${b}"]`);
    const cells = (b) => [...$$(`.inspector[data-band="${b}"] .knobs .f`)].map((x) => x.className.replace('f f-', '').replace(' wide', ''));
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
      ok('§1 the window opens with three tabs: FX · Assets · Coverage, and no tab for the sheet', app?.rendered && $$('[role=tab]').length === 3 && $$('[role=tab]').map((t) => t.textContent).join('|') === 'FX|Assets|Coverage', `${$$('[role=tab]').map((t) => t.textContent).join(', ')}`);
      ok('§1 the search sits in the window header, above the tabs, not in a pane', !!$('.fx-head .fx-q') && !$('.pane .fx-q') && $('.fx-q')?.placeholder === 'What plays for…', $('.fx-q')?.placeholder ?? 'no box');
      ok('§1 opening on an item lands on FX with the FX that answers it selected, and says why', tabNow() === 'fx' && $('.detail')?.dataset.on === 'fx' && /Misty Step/.test(text('.detail .dhead')) && /Global Hook · Misty Step \(spell\)( \+\d+)? · (Stock|House)/.test(text('.detail .whyline')), `${text('.detail .dhead')} | ${text('.detail .whyline')}`);
      ok('§1 the pane reads it back as its sentence, its id and its provenance', /Misty Step · when used/.test(text('.detail .dsentence')) && text('.detail code.id') === 'misty-step' && text('.detail').includes('Sequence'), `${text('.detail .dsentence').slice(0, 90)} | ${text('.detail code.id')}`);
      ok('§1 the pane offers the six actions, at their own places', $$('.detail .agrid > *').length === 6 && /Edit/.test(text('[data-act="fx-edit"]')) && !!$('[data-act="fx-play"]') && !!$('.fx-stage') && !!$('[data-act="fx-dup"]') && !!$('[data-act="export-fx"]'), [...$$('.detail .agrid > *')].map((x) => x.textContent.trim().split(' ')[0]).join(', '));

      // 2 · a spell the corpus has never heard of
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con', activities: { dnd5eactivity000: { type: 'utility', _id: 'dnd5eactivity000' } } } }]);
      await sleep(200);
      app.refresh();
      await type('.fx-q', 'Sharran');
      const hit = $$('.suggest .hit').find((h) => /Sharran Step/.test(h.textContent));
      ok('§2 typing a few letters offers the sheet\'s Sharran Step', !!hit && /FX Test Caster/.test(hit.textContent), hit?.textContent);
      await click(hit);
      ok('§2 it plays nothing yet, and the pane says so in words', $('.detail')?.dataset.on === 'ask' && /Nothing plays/.test(text('.detail .dsentence')) && /No FX for Sharran Step \(spell\)/.test(text('.detail .whyline')), `${text('.detail .dsentence')} | ${text('.detail .whyline')}`);
      ok('§2 the pane offers Create FX', /Create FX/.test(text('.detail .agrid')), text('.detail .agrid'));
      await type('.fx-q', '');
      await sleep(400);
      ok('§2 emptying the box clears the pane and shows the whole list again', $('.detail')?.dataset.on === 'none' && $$('.fxlist .row').length > 100, `${$('.detail')?.dataset.on} · ${$$('.fxlist .row').length} rows`);
      await type('.fx-q', 'Sharran');
      await click($$('.suggest .hit').find((h) => /Sharran Step/.test(h.textContent)));

      // 3 · the sheet: Create FX opens a new sheet unlocked, hooked to Sharran Step; Copy from seeds it
      await click('[data-act="create-new"]');
      ok('§3 Create FX opens the FX Editor on a new sheet, unlocked, hooked to the spell', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'true' && /Sharran Step \(spell\)/.test(text('.hookstrip')) && /New/.test(text('.sheet h2')), `pane ${paneNow()} · ${text('.sheet h2')}`);
      ok('§3 Save waits: no scenes yet, the problem is named', $('[data-act="sh-save"]')?.disabled === true && !!$('.sheet .problem'), text('.sheet .problem'));
      ok('§3 an empty sequence offers Copy from and Add', !!$('.sh-like') && $$('[data-act="cw-add"]').length === 8, `${$$('[data-act="cw-add"]').length} shapes`);
      await type('.sh-like', 'misty step');
      const like = $$('.suggest .hit').find((h) => h.dataset.id === 'misty-step');
      ok('§3 Copy from offers the Misty Step FX', !!like, $$('.suggest .hit').map((h) => h.dataset.id).join(', '));
      await click(like);
      const rail = () => $$('.rail .row');
      ok('§3 the rail holds Misty Step\'s scenes, numbered, one row each, the selected one in the inspector', rail().length >= 2 && rail().map((r) => r.querySelector('.num').textContent).join('') === [...Array(rail().length)].map((_, k) => k + 1).join('') && $('.inspector .line').textContent.length > 10, `${rail().length} scenes · ${text('.inspector .line')}`);
      ok('§3 the rail rows are typed and striped by kind: VFX, VFX, Move', rail().map((r) => r.dataset.kind).join(',') === 'vfx,vfx,move', rail().map((r) => r.dataset.kind).join(','));
      ok('§3 the knobs sit in labelled fields in the Picture band', $$('.inspector .f .l').length === 8 && /VFX/.test(text('.inspector .f-vfx .l')) && $('.inspector')?.dataset.band === 'picture', `${$$('.inspector .f .l').length} fields · band ${$('.inspector')?.dataset.band}`);
      ok('§3 no colour knob on a scene: the VFX field names the variant and Browse is the door', !$('.cw-colour') && $$('[data-act="cw-browse"][data-slot="asset"]').length === 1 && /misty step 01/i.test($('.inspector .f-vfx input')?.value ?? ''), $('.inspector .f-vfx input')?.value ?? '');
      // paint both marks black through the Library: pick the scene, Browse → the dark black variant → Use
      const blacken = async (n) => {
        await pick(n);
        await click('[data-act="cw-browse"][data-slot="asset"]');
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
      ok('§3 Browse → the dark black variant → Use paints a scene without a colour knob', /dark black/.test($('.inspector .f-vfx input')?.value ?? ''), $('.inspector .f-vfx input')?.value ?? '');
      ok('§3 the draft reads back as the sentence, in black, before anything is saved', /dark black/.test(text('.sheet .preview')) && /Sharran Step · when used/.test(text('.sheet .preview')) && !/blue/.test(text('.sheet .preview')), text('.sheet .preview'));
      // the two delays are named apart (HANDOFF step 4): Wait before is `delay`, Hold next is `wait`
      await pick(1); await band('timing');
      ok('§3 the Timing band names the two delays apart: Wait before and Hold next', /WAIT BEFORE/i.test(text('.inspector .f-delay .l')) && /HOLD NEXT/i.test(text('.inspector .f-hold .l')) && !!$('.cw-delay') && !!$('.cw-hold'), `${text('.inspector .f-delay .l')} · ${text('.inspector .f-hold .l')}`);
      await choose('.cw-delay', '750');
      ok('§3 Wait before on scene 2 is read back in its line and the preview', $('.cw-delay')?.value === '750' && /after 750 ms/.test(text('.inspector .line')) && /after 750 ms/.test(text('.sheet .preview')), `${$('.cw-delay')?.value} · ${text('.inspector .line')}`);
      await choose('.cw-delay', '500');
      await pick(0); await band('timing');
      const hold0 = $('.cw-hold');
      hold0.checked = true; hold0.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250);
      ok('§3 Hold next on scene 1 turns the sentence\'s "and" into "then"', /, then a mark/.test(text('.sheet .preview')) && $('.cw-holdms')?.disabled === false, text('.sheet .preview').slice(0, 160));
      const hold0b = $('.cw-hold'); hold0b.checked = false; hold0b.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250);
      // R1 in the bands: Timing is the same eight cells for a mark and for a move, live where the shape reads them
      const timingMark = cells('timing');
      const marksPersist = !$('.f-lasts')?.dataset.na;
      await pick(2); await band('timing');
      ok('§3 Lasts keeps its place in the Timing band and is live only on the marks (R1)', timingMark.join(',') === cells('timing').join(',') && marksPersist && $('.inspector .f-lasts')?.dataset.na === 'true' && $('.cw-persist')?.disabled === true, `${timingMark.join(',')} | move greys ${[...$$('.inspector .f[data-na="true"]')].map((x) => x.className.replace('f f-', '')).join(',')}`);
      await pick(0);
      await click('[data-act="cw-down"]');
      await pick(0);
      ok('§3 the arrows reorder: scene 1 moved down', rail().map((r) => r.dataset.kind).join(',') === 'vfx,vfx,move' && /misty step 02/.test(text('.inspector .line')), text('.inspector .line'));
      await pick(1);
      await click('[data-act="cw-up"]');
      ok('§3 and back up, and the inspector follows the scene it moved', /misty step 01/.test(text('.inspector .line')) && $('.rail .pickbtn')?.getAttribute('aria-current') === 'true', text('.inspector .line'));
      ok('§3 nothing has been saved yet', api.fx.buffer().length === before.length, `${api.fx.buffer().length}`);

      // 4 · the hook block and Save
      ok('§4 the Hook strip is one row of four: Answers · Reach · Moment · State', $$('.hookstrip .hcol').length === 4 && [...$$('.hookstrip .lbl')].map((l) => l.textContent).join(' · ') === 'Answers · Reach · Moment · State' && $('[data-act="sh-on"][aria-pressed="true"]')?.dataset.on === 'use' && $('[data-act="sh-off"][aria-pressed="true"]')?.dataset.v === 'false' && !/phase 4/.test(text('.hookstrip')), [...$$('.hookstrip .lbl')].map((l) => l.textContent).join(' · '));
      ok('§4 Reach offers both hooks with Global Hook pressed, since this sheet came from an item', $('.hookstrip [data-act="sh-global"]')?.getAttribute('aria-pressed') === 'true' && $('.hookstrip [data-act="sh-only"]')?.getAttribute('aria-pressed') === 'false' && /FX Test Caster · Sharran Step/.test(text('.hookstrip')), text('.hookstrip .hcol:nth-child(2)').replace(/\s+/g, ' '));
      ok('§4 the bar is static: every control is there, greyed where the mode does not offer it', $$('.lockbar button').length === 7 && !!$('[data-act="sh-new"]') && $('[data-act="sh-dup"]')?.disabled === true && $('[data-act="sh-export"]')?.disabled === true && $('[data-act="sh-delete"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 the id is shown, derived from the ability', text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      ok('§4 Save is enabled now the sequence has scenes', $('[data-act="sh-save"]')?.disabled === false && !$('.sheet .problem'), text('.sheet .problem'));
      await click('[data-act="sh-save"]');
      await sleep(500);
      const saved = api.fx.buffer().find((l) => l.id === 'sharran-step');
      if (saved) made.push(saved.id);
      ok('§4 Save writes the FX to the world buffer with its scenes, a draft, with provenance', saved && Array.isArray(saved.scenes) && saved.scenes.length >= 2 && !saved.to && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at) && /copied from Misty Step/.test(saved.note), JSON.stringify(saved ?? null).slice(0, 300));
      ok('§4 what Copy from wrote is a full copy, standing on its own: no shortcut of any kind', saved && saved.like === undefined && saved.with === undefined, `like ${saved?.like} · with ${JSON.stringify(saved?.with)}`);
      ok('§4 the sheet stays open, locked, tagged Draft, with the sentence', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'false' && /Draft/.test(text('.sheet h2')) && /dark black/.test(text('.sheet .preview')) && !!$('[data-act="sh-dup"]') && /Delete/.test(text('[data-act="sh-delete"]')), `${text('.sheet h2')} | ${text('[data-act="sh-delete"]')}`);
      ok('§4 locked: the knobs are read-only and the tools are hidden', $$('.inspector .knobs select').every((x) => x.disabled) && !$('[data-act="cw-drop"]'), '');
      ok('§4 locked: the same bar, Save and Cancel greyed instead, nothing moved', $$('.lockbar button').length === 7 && $('[data-act="sh-save"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === true && $('[data-act="sh-dup"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 the spell resolves to it from the world layer', api.resolve(tmp).fx?.id === 'sharran-step' && api.resolve(tmp).source === 'world', api.resolve(tmp).source);
      const r4 = api.sentenceFor(tmp);
      ok('§4 the API reads the same sentence the sheet shows, in the What plays box', text('.sheet .preview') === `What plays${r4.sentence}`, `${r4.sentence} | ${text('.sheet .preview')}`);
      ok('§4 the sentence is said once: What plays at the top, none under the sequence', $$('.sheet .preview').length === 1 && !$('.sheet .sentence') && /^What plays/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 60));
      await click('[data-act="sh-back"]');
      ok('§4 Back returns to where the sheet was opened from: the FX tab, on the FX it wrote', tabNow() === 'fx' && paneNow() === 'fx' && $('.detail')?.dataset.on === 'fx' && /Sharran Step/.test(text('.detail .dhead')) && /Draft/.test(text('.detail .dhead')), `${text('.detail .dhead')} | ${text('.detail .whyline')}`);

      // 5 · ONE FX tab (HANDOFF step 5): one list of every FX, grouped Draft → House → Stock
      await type('.fx-q', '');
      await sleep(450);
      const rows5 = () => $$('.fxlist .row');
      const groups5 = () => $$('.fxlist .grouphead').map((g) => g.textContent.replace(/\s+/g, ' ').trim());
      ok('§5 there is no Stock FX, House FX, FX Editor or Look up tab: one FX tab holds them', !$('[data-tab="stock"]') && !$('[data-tab="house"]') && !$('[data-tab="editor"]') && !$('[data-tab="lookup"]') && !!$('[data-tab="fx"]'), $$('[role=tab]').map((t) => t.dataset.tab).join(', '));
      ok('§5 the list is grouped in resolution order, later wins: Draft, then House, then Stock', groups5().map((g) => g.split(' ')[0]).join(',') === 'Draft,House,Stock' && /^Draft · \d+ FX$/.test(groups5()[0]), `${groups5().join(' | ')} · ${rows5().length} rows shown`);
      const first5 = rows5()[0];
      ok('§5 the Draft this world wrote is the first row of all, with its sentence, its layer and its shapes', /^Sharran Step/.test(first5?.textContent.trim() ?? '') && /when used/.test(first5?.textContent ?? '') && /Draft/.test(first5?.querySelector('.tag')?.textContent ?? '') && first5?.querySelectorAll('.shapes .tag').length >= 1, first5?.textContent.replace(/\s+/g, ' ').slice(0, 160));
      ok('§5 a row is a name and a sentence, never the whole key list', !/spell:/.test(text('.fxlist')) && !!first5?.querySelector('.n') && !!first5?.querySelector('.s'), first5?.querySelector('.n')?.textContent.trim() ?? '');
      // R3: picking a row swaps the pane's contents and moves nothing
      const geom5 = () => rows5().slice(0, 12).map((r) => { const b = r.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }).join(',');
      const was5 = geom5();
      await click(rows5()[4].querySelector('.pickbtn'));
      ok('§5 picking a row changes colour and swaps the pane, never the layout (R3)', geom5() === was5 && new Set(rows5().map((r) => Math.round(r.getBoundingClientRect().height))).size === 1 && $('.fxlist .row[data-now="true"]') === rows5()[4], `${new Set(rows5().map((r) => Math.round(r.getBoundingClientRect().height))).size} row height(s)`);
      // R4: one scroll region — the rows scroll, the facets and the pane do not
      const overflows5 = (sel) => { const el = $(sel); return !!el && el.scrollHeight > el.clientHeight + 1; };
      ok('§5 one scroll region on the screen: the rows (R4)', !overflows5('.facets') && !overflows5('.detail') && getComputedStyle($('.fxlist .rows')).overflowY === 'auto', `facets ${overflows5('.facets')} · pane ${overflows5('.detail')}`);
      // R5: the same 300px pane in the same place, and the window never scrolls sideways
      const content5 = app.element.querySelector('.fxstudio-content');
      ok('§5 three columns: the facets, the rows, and the 300px pane, none of them spilling (R2, R5)', Math.round($('.detail').getBoundingClientRect().width) === 300 && getComputedStyle($('.fxtab')).gridTemplateColumns.split(' ').length === 3 && content5.scrollWidth <= content5.clientWidth + 1, `${getComputedStyle($('.fxtab')).gridTemplateColumns} · ${content5.scrollWidth} vs ${content5.clientWidth}`);
      // the facets, all of them from data the window already had
      ok('§5 three facet groups: Lives in, Kind, Only', [...$$('.facets .sub')].map((x) => x.textContent).join(' · ') === 'Lives in · Kind · Only', [...$$('.facets .sub')].map((x) => x.textContent).join(' · '));
      const live5 = $$('.facets [data-group="lives"]');
      ok('§5 Lives in counts Draft, House and Stock, and they add up to the corpus', live5.length === 3 && live5.reduce((t, b) => t + Number(b.querySelector('.c').textContent), 0) === api.fx.list().length, live5.map((b) => b.textContent.replace(/\s+/g, ' ')).join(', '));
      ok('§5 a kind with nothing in it is greyed where it stands, not dropped (R1)', $$('.facets [data-group="kinds"]').length === 9 && $$('.facets [data-group="kinds"][data-na="true"]').every((b) => b.disabled), `${$$('.facets [data-group="kinds"]').length} kinds, ${$$('.facets [data-group="kinds"][data-na="true"]').length} at zero`);
      const all5 = rows5().length;
      await click('[data-group="lives"][data-v="world"]');
      ok('§5 a facet narrows the list to that layer alone', rows5().length < all5 && rows5().every((r) => r.dataset.source === 'world') && groups5().length === 1, `${all5} → ${rows5().length} rows`);
      await click('[data-group="kinds"][data-v="spell"]');
      ok('§5 the facets stack, and Clear counts what is on', rows5().every((r) => r.dataset.source === 'world') && rows5().length >= 1 && /Clear · 2/.test(text('[data-act="fx-clear"]')), `${text('[data-act="fx-clear"]')} · ${rows5().length} rows`);
      await click('[data-act="fx-clear"]');
      ok('§5 Clear puts every FX back', rows5().length === all5 && !$('.facets [aria-pressed="true"]'), `${rows5().length} rows`);
      ok('§5 Broken assets is a facet, counted by the same check the tools run', !!$('[data-group="only"][data-v="broken"]') && /^\d+$/.test($('[data-group="only"][data-v="broken"] .c')?.textContent ?? ''), text('[data-group="only"][data-v="broken"]').replace(/\s+/g, ' '));
      // the one search in the header narrows the same list
      await type('.fx-q', 'sharran');
      await sleep(450);
      ok('§5 the one search in the header narrows the list', rows5().length === 1 && /Sharran Step/.test(rows5()[0].textContent), `${rows5().length} rows`);
      await type('.fx-q', '');
      await sleep(450);
      // the pane's own actions
      await click(rows5().find((r) => /Sharran Step/.test(r.textContent)).querySelector('.pickbtn'));
      ok('§5 the pane draws the sequence as stills and lines, four at most', $$('.detail .sc').length >= 2 && $$('.detail .sc').length <= 4 && $$('.detail .sc .thumb').length === $$('.detail .sc').length, `${$$('.detail .sc').length} scenes shown`);
      ok('§5 Play keeps its place on the pane and greys with its reason (R1)', !!$('[data-act="fx-play"]') && $('[data-act="fx-play"]').disabled === !canvas.tokens.controlled.length, text('[data-act="fx-play"]'));
      ok('§5 Delete on a plain Draft says Delete, not Revert', /^Delete/.test(text('[data-act="delete-fx"]')), text('[data-act="delete-fx"]'));

      // 6 · staging from the row's own pane, and the maintainer's card on Coverage
      ok('§6 the pane stages a Draft where the Maintain card used to be the only door', !!$('.fx-stage') && $('.fx-stage').disabled === false && [...$('.fx-stage').options].map((o) => o.textContent).join(' · ') === 'Draft only · Staged: House · Staged: Stock', [...($('.fx-stage')?.options ?? [])].map((o) => o.textContent).join(' · '));
      await choose('.fx-stage', 'house');
      ok('§6 Staged: House on the pane stages it', api.fx.buffer().find((l) => l.id === 'sharran-step')?.to === 'house' && $('.fx-stage')?.value === 'house', `${api.fx.buffer().find((l) => l.id === 'sharran-step')?.to}`);
      await choose('.fx-stage', '');
      ok('§6 and Draft only unstages it again', !api.fx.buffer().find((l) => l.id === 'sharran-step')?.to, '');
      const stockRow6 = rows5().find((r) => r.dataset.source === 'stock');
      await click(stockRow6.querySelector('.pickbtn'));
      ok('§6 a Stock FX cannot be staged: the cell greys where it stands, with the reason (R1)', $('.fx-stage')?.disabled === true && $('.fx-stage')?.dataset.na === 'true' && /Only a Draft is staged/.test($('.fx-stage')?.dataset.tooltip ?? ''), $('.fx-stage')?.dataset.tooltip ?? '');
      ok('§6 Stock is in the same list as everything else, and no Maintain card is on this tab', Number($$('.facets [data-group="lives"]')[2].querySelector('.c').textContent) > 200 && !/Maintain · /.test(text('[data-pane="fx"]')), $$('.facets [data-group="lives"]')[2].textContent.replace(/\s+/g, ' '));
      await click('[data-tab="coverage"]');
      ok('§6 the Maintain card sits on Coverage', /Maintain · /.test(text('[data-pane="coverage"]')), text('[data-pane="coverage"]').match(/Maintain · [^\s]+/)?.[0] ?? 'no card');
      const row6 = $$('.list .row').find((r) => /Sharran Step/.test(r.textContent));
      ok('§6 Not yet shipped lists Sharran Step as a Draft, with Stage: House', row6 && /Draft/.test(row6.textContent) && !!row6.querySelector('[data-act="co-stage"][data-to="house"]'), row6?.textContent.replace(/\s+/g, ' ').slice(0, 160));
      ok('§6 with nothing staged there is no Ship card', !$('[data-act="co-ship"]'), '');
      await click(row6.querySelector('[data-act="co-stage"][data-to="house"]'));
      await sleep(300);
      ok('§6 Stage: House stages it, and the Ship button names the version, the card the file', api.fx.buffer().find((l) => l.id === 'sharran-step')?.to === 'house' && /^Ship /.test(text('[data-act="co-ship"]')) && /house\.json/.test(text('[data-pane="coverage"]')), text('[data-act="co-ship"]'));

      // 7 · one item's own FX, through the sheet (Open FX from the card, unlock, Item Hook, Save)
      api.open({ item: tmp });
      await sleep(300);
      await click('.detail .dhead [data-act="fx-open"]');
      ok('§7 the pane\'s own name opens the sheet on that FX, locked, to read', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'false' && text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
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
      ok('§7 the pane offers Revert on the FX the item points at, and no Play nothing', /Revert/.test(text('.detail .agrid')) && !!$('[data-act="remove"]') && !$('[data-act="silence"]'), text('.detail .agrid').replace(/\s+/g, ' '));
      await click('[data-act="remove"]');
      await sleep(400);
      ok('§7 back: the pointer is gone and the spell\'s fx answers again', !tmp.getFlag(MOD, 'fx') && !api.fx.buffer().some((l) => l.id === own?.id) && api.resolve(tmp).fx?.id === 'sharran-step', api.resolve(tmp).fx?.id);
      // the guard: a locked sheet's Cancel drops changes; Delete on a plain draft is Delete
      await click('.detail .dhead [data-act="fx-open"]');
      const sw2 = $('.sh-edit'); sw2.checked = true; sw2.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      await pick(1); await band('timing');
      await choose('.cw-delay', '900');
      ok('§7 a change unlocks Save', /after 900 ms/.test(text('.sheet .preview')) && $('[data-act="sh-save"]')?.disabled === false, '');
      await click('[data-act="sh-cancel"]');
      ok('§7 Cancel drops the change and locks the sheet again', $('.sheet')?.dataset.edit === 'false' && /after 500 ms/.test(text('.sheet .preview')) && api.fx.buffer().find((l) => l.id === 'sharran-step')?.scenes?.[1]?.delay === 500, text('.sheet .preview').slice(0, 120));

      // 9 · the ship: the corpus files and the version written into the module on this server, then restored
      api.open({ tab: 'audit' })  // the old name still lands on Coverage;
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
      ok('§9 Audit lists the ship in Shipped from here and shows the new version', /the suite shipped Sharran Step/.test(text('[data-pane="coverage"]')) && text('[data-pane="coverage"]').includes(`Maintain · ${next.patch}`), text('[data-pane="coverage"]').match(/Maintain · [^\s]+/)?.[0] ?? 'no version line');
      // restore the module's files byte for byte, and read the corpora again
      for (const p of FILES) await writeFile(p, snapshot[p]);
      await api.corpus.reload();
      let same = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) same = false;
      ok('§9 restored: the module\'s files are as they were and Sharran Step is gone from the corpus', same && !api.resolve(tmp).fx, `${api.resolve(tmp).why ?? ''}`);

      // 12 · Check: pick a book, read it, find unused assets
      await click('[data-tab="coverage"]');
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
      await click('[data-tab="assets"]');
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
      await click('[data-tab="fx"]');
      await type('.fx-q', 'Misty Step');
      await click($$('.suggest .hit').find((h) => /Misty Step/.test(h.textContent)));
      await click('.detail .dhead [data-act="fx-open"]');
      const sw3 = $('.sh-edit'); sw3.checked = true; sw3.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      ok('§13 the sheet is unlocked with a Browse button on the first VFX', $('.sheet')?.dataset.edit === 'true' && !!$('[data-act="cw-browse"][data-slot="asset"]'), '');
      const has13 = $('.sheet .inspector .f-vfx input')?.value ?? '';
      ok('§13 the VFX field names the variant, not just the family', /misty step 01/i.test(has13), has13.replace(/\s+/g, ' ').slice(0, 80));
      await click('[data-act="cw-browse"][data-slot="asset"]');
      ok('§13 Browse opens the Asset Library as the picker, saying what it picks for', paneNow() === 'assets' && /VFX for Misty Step · scene 1/.test(text('.picking')), text('.picking'));
      ok('§13 Browse lands on what the scene names already, not the top of the list', /^jb2a\.misty_step\.01/.test(val('.lib-dbpath')), val('.lib-dbpath'));
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.arcane_hand'));
      await click('[data-act="lib-pick-use"]');
      ok('§13 Use returns to the sheet with the scene playing it', paneNow() === 'editor' && /arcane hand/i.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 160));
      ok('§13 editing Misty Step (House) says Save writes a Draft over it', /Draft/.test(text('.sheet .banner')), text('.sheet .banner'));
      // the same door for the SFX slot, in the Sound band: Browse lands on the sound the scene carries
      await band('sound');
      await click('[data-act="cw-browse"][data-slot="sound"]');
      ok('§13 Browse for SFX opens on the sound the scene names', /^psfx\./.test(val('.lib-dbpath')) && /SFX for Misty Step/.test(text('.picking')), `${val('.lib-dbpath')} · ${text('.picking').slice(0, 40)}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'psfx.weapon-swooshes.light'));
      const sfx13 = val('.lib-dbpath');
      await click('[data-act="lib-pick-use"]');
      ok('§13 Use writes the SFX back into the scene, and the sentence says so', paneNow() === 'editor' && /weapon-swooshes light/.test(text('.sheet .preview')) && api.assets.resolve(app.sheet.scenes[0].scene.sound.asset).path === sfx13, `${sfx13} | ${text('.sheet .preview').slice(-90)}`);
      ok('§13 the SFX cell carries Browse and ✕, and no select to hide a door behind', !$('.cw-sound') && !!$('[data-act="cw-browse"][data-slot="sound"]') && !!$('[data-act="cw-sound-off"]') && $('.inspector .f-sfx')?.classList.contains('wide'), text('.inspector .f-sfx').replace(/\s+/g, ' '));
      // R1 in the bands (HANDOFF step 4): the same eight addresses in one order, for every shape
      const BANDS13 = {
        picture: 'vfx,place,size,opacity,tint,below,mirror,scatter',
        timing: 'delay,times,every,rate,fadein,fadeout,lasts,hold',
        sound: 'sfx,volume,start,sdelay,stimes,severy,spacer',
        placement: 'rotate,anchor,elevation,zindex,mask,attach,abovelight,xray',
      };
      const grids13 = [];
      const heights13 = [];
      for (const b of Object.keys(BANDS13)) {
        for (const n of [0, 2]) {
          await pick(n); await band(b);
          grids13.push(`${b}/${n}:${cells(b).join(',')}`);
          heights13.push(Math.round($('.inspector .knobs').getBoundingClientRect().height));
        }
      }
      const wrong13 = grids13.filter((g) => g.split(':')[1] !== BANDS13[g.split('/')[0]]);
      ok('§13 every band is the same eight cells in one order, for a Mark and for a Move (R1)', !wrong13.length, wrong13.length ? wrong13.join(' | ') : grids13[0]);
      ok('§13 the inspector frame never resizes: every band is the same height (R3)', new Set(heights13).size === 1, heights13.join(','));
      const na13 = () => [...$$('.inspector .f[data-na="true"]')].map((x) => x.className.replace('f f-', '').replace(' wide', ''));
      await pick(0); await band('picture'); const naMark13 = na13();
      await pick(2); await band('picture'); const naMove13 = na13();
      ok('§13 a Move scene and a Mark scene are that same grid with different cells live', !naMark13.includes('vfx') && naMark13.includes('scatter') && naMove13.includes('vfx') && naMove13.includes('size'), `mark greys ${naMark13.join(',')} · move greys ${naMove13.join(',')}`);
      await band('shape');
      ok('§13 the shape band is the shape\'s own knobs, and is named for it', cells('shape').join(',') === 'range,spot,jump,fade,pick,speed,after,spacer' && /Move/.test(text('[data-act="sh-band"][data-band="shape"]')), cells('shape').join(','));
      ok('§13 a greyed cell is switched off, not merely faded', $$('.inspector .f[data-na="true"]').length > 0 && $$('.inspector .f[data-na="true"]').every((c) => [...c.querySelectorAll('input, select, button')].every((x) => x.disabled)), `${$$('.inspector .f[data-na="true"]').length} greyed cells`);
      ok('§13 nothing wraps: a band is four proportional columns (R2)', getComputedStyle($('.inspector .knobs')).display === 'grid' && getComputedStyle($('.inspector .knobs')).gridTemplateColumns.split(' ').length === 4, getComputedStyle($('.inspector .knobs')).gridTemplateColumns);
      ok('§13 the Add pills carry tooltips', $$('[data-act="cw-add"]').every((b) => (b.dataset.tooltip ?? '').length > 20), '');
      await pick(0); await band('picture');
      await choose('.cw-opacity', '50');
      ok('§13 Opacity is a knob and the sentence reads it back', /at 50% opacity/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 140));
      const tintEl = $('.cw-tint');
      tintEl.value = '#ff0000'; tintEl.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200);
      ok('§13 Tint is a colour picker and the sentence reads it back', /tinted #ff0000/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 160));
      // the knobs the sentence used to speak with nothing to change them (2026-09-07)
      await band('timing');
      await choose('.cw-times', '3');
      ok('§13 Times repeats the scene, the sentence counts it, and Every comes alive in place', /3 times/.test(text('.sheet .preview')) && $('.inspector .f-every')?.dataset.na !== 'true' && $('.cw-every')?.disabled === false, text('.sheet .preview').slice(-110));
      await choose('.cw-times', '1');
      await choose('.cw-rate', '0.5');
      ok('§13 Speed is read back', /0\.5× speed/.test(text('.sheet .preview')), text('.sheet .preview').slice(-110));
      await choose('.cw-rate', '1');
      await band('picture');
      const below13 = $('.cw-below'); below13.checked = true; below13.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200);
      ok('§13 Under the tokens is read back', /under the tokens/.test(text('.sheet .preview')), text('.sheet .preview').slice(-110));
      below13.checked = false; below13.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200);
      await click('[data-act="cw-tint-off"]');
      ok('§13 the tint clears again', !/tinted/.test(text('.sheet .preview')), '');
      app.sheet = null; app.view.tab = 'fx'; await app.render(); await sleep(200);
      ok('§13 the sheet is dropped, nothing saved', api.fx.buffer().length === before.length, `${api.fx.buffer().length}`);

      // 14 · Play: the sheet plays through api.preview and saves nothing (HANDOFF step 2)
      app = api.open({ tab: 'editor', id: 'misty-step' });
      await sleep(500);
      canvas.tokens.releaseAll();
      await app.render(); await sleep(250);
      ok('§14 with no token selected Play keeps its place, greyed, and says why', $('[data-act="sh-play"]')?.disabled === true && /select a token/.test(text('[data-act="sh-play"]')) && $$('[data-act="sh-play-scene"]').length === $$('.rail .row').length && $$('[data-act="sh-play-scene"]').every((b) => b.disabled), text('[data-act="sh-play"]'));
      caster.control({ releaseOthers: true });
      await app.render(); await sleep(250);
      ok('§14 with a token selected both Play controls come alive', $('[data-act="sh-play"]')?.disabled === false && text('[data-act="sh-play"]').trim() === '▶ Play all' && $$('[data-act="sh-play-scene"]').every((b) => !b.disabled), text('[data-act="sh-play"]'));
      ok('§14 every rail row carries a still of what it plays', $$('.rail .thumb').length === $$('.rail .row').length && $$('.rail video.thumb, .rail img.thumb').length >= 1, `${$$('.rail .thumb').length} thumbs of ${$$('.rail .row').length} scenes`);
      // band 1: the action bar stopped wrapping (noted after step 3, fixed here)
      const content14 = app.element.querySelector('.fxstudio-content');
      const bar14 = Math.round($('.lockbar').getBoundingClientRect().height);
      ok('§14 band 1 is one line: eight controls, no wrap, and the sheet does not scroll sideways', getComputedStyle($('.lockbar')).flexWrap === 'nowrap' && bar14 < 40 && $$('.lockbar button').length + $$('.lockbar .switch').length === 8 && content14.scrollWidth <= content14.clientWidth + 1, `bar ${bar14}px · ${content14.scrollWidth} vs ${content14.clientWidth}`);
      ok('§14 the rail and the inspector are one band: 288px and the rest, the same height', Math.round($('.railside').getBoundingClientRect().width) === 288 && Math.abs($('.railside').getBoundingClientRect().height - $('.inspector').getBoundingClientRect().height) <= 1, `${Math.round($('.railside').getBoundingClientRect().width)}px · ${Math.round($('.railside').getBoundingClientRect().height)} vs ${Math.round($('.inspector').getBoundingClientRect().height)}`);
      const box14 = $('.sentence-box');
      ok('§14 the sentence sits in a fixed two-line box that never grows', getComputedStyle(box14).overflow === 'hidden' && Math.abs(box14.getBoundingClientRect().height - 2 * 1.55 * 15) < 2, `${Math.round(box14.getBoundingClientRect().height)}px`);
      // the overlap strip (HANDOFF step 4): one bar per scene, all on one ms scale
      const bars14 = $$('.strip .bar');
      const left14 = bars14.map((b) => Math.round(b.getBoundingClientRect().left));
      ok('§14 the overlap strip draws one bar per scene, on one shared scale', bars14.length === $$('.rail .row').length && $$('.strip .lane').length === bars14.length && /ms$/.test(text('.strip .axis')), `${bars14.length} bars · ${text('.strip .axis')}`);
      ok('§14 a scene that waits before it starts is drawn further along than one that does not', new Set(left14).size > 1 && left14[1] > left14[0], left14.join(','));
      ok('§14 a length the file has not told us yet is drawn as an estimate, not as a fact', bars14.every((b) => b.dataset.est === 'true' || b.dataset.est === 'false') && bars14.every((b) => /starts at \d+ ms/.test(b.dataset.tooltip ?? '')), bars14.map((b) => b.dataset.est).join(','));
      const geom14 = $$('.rail .row').map((r) => Math.round(r.getBoundingClientRect().height)).join(',');
      await click($$('.rail .pickbtn')[1]);
      ok('§14 picking a scene in the rail changes colour, never layout (R3)', $$('.rail .row').map((r) => Math.round(r.getBoundingClientRect().height)).join(',') === geom14 && $('.rail .row[data-now="true"]') === $$('.rail .row')[1] && $('.inspector .ihead .num')?.textContent === '2', `${geom14} · now ${[...$$('.rail .row')].findIndex((r) => r.dataset.now === 'true')}`);
      ok('§14 the sentence marks the clause of the scene the inspector is on', !!$('.sentence-box mark') && text('.inspector .line').includes(text('.sentence-box mark')), text('.sentence-box mark'));
      await click($$('.rail .pickbtn')[0]);
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
      app.sheet = null; app.view.tab = 'fx'; await app.render(); await sleep(200);
      // the two delays, on an FX the migration wrote with the hold's offset in `delay` (stock: shield)
      api.open({ tab: 'editor', id: 'shield' });
      await sleep(500);
      await pick(0); await band('timing');
      const held14 = app.sheet.scenes.map((x) => JSON.stringify({ delay: x.scene.delay, wait: x.scene.wait }));
      ok('§14 a hold whose offset was written as a delay is read as one thing: Hold next −500 ms, Wait before 0', $('.cw-hold')?.checked === true && $('.cw-holdms')?.value === '-500' && $('.cw-delay')?.value === '0' && held14[0] === '{"wait":-500}', held14.join(' · '));
      ok('§14 and it plays the same: the sentence no longer says "after −500 ms" about a hold', !/after -\d+ ms/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 150));
      app.sheet = null; app.view.tab = 'fx'; await app.render(); await sleep(200);
      // a blank sheet: Reach keeps its place with no item to pin to, greyed and saying why (R1)
      api.open({ tab: 'editor' });
      await sleep(400);
      ok('§14 with no item to pin to, Reach is greyed in place with the reason, never dropped', $$('.hookstrip .hcol').length === 4 && $('.hookstrip .pill[data-na="true"]')?.textContent.trim() === 'Item Hook' && ($('.hookstrip .pill[data-na="true"]')?.dataset.tooltip ?? '').length > 20, text('.hookstrip .hcol:nth-child(2)').replace(/\s+/g, ' '));
      ok('§14 a blank sheet says so and offers no rail', !$('.rail .row') && /No scenes yet/.test(text('.inspector')), text('.inspector').replace(/\s+/g, ' ').slice(0, 80));
      app.sheet = null; app.view.tab = 'fx'; await app.render(); await sleep(200);

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
      ok('§10 the button opens the window on that item, on the FX tab, with the search carrying it', app?.rendered && tabNow() === 'fx' && /Misty Step/.test(text('.detail .dhead')) && $('.fx-q')?.value === 'Misty Step', `${text('.detail .dhead')} | box "${$('.fx-q')?.value}"`);
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
