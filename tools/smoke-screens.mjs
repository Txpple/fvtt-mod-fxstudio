// The screens, live on the sandbox: a person's round trip through the window, driven on the DOM —
// fx an ability up and read its sentence; type a spell the sheet does not know yet; give it an
// FX through the sheet (copy Misty Step, paint it dark black, Save — which WRITES house.json on
// the sandbox, there being no draft layer since 2026-09-12); read it in the House group; edit a
// Stock FX and choose the House override, then Stock itself; give one item its own FX and take it
// back; the facets; Coverage; the Asset Library; Play; find the button on the item sheet. Builds
// and tears down its own fixture; leaves the module's files as it found them, byte for byte.
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
    const houseIds = () => api.corpora.house.map((l) => l.id);
    const before = houseIds();
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
    // four tabs (2026-09-08): Library · Editor · Assets · Coverage — the sheet is the Editor TAB
    const paneNow = () => $('.pane[data-active="true"]')?.dataset.pane ?? '';
    const tabNow = () => $('[role=tab][aria-selected="true"]')?.dataset.tab ?? '';
    // the sheet is a rail and an inspector (HANDOFF step 4): pick a scene, then a band of knobs
    const pick = async (n) => click($$('.rail .pickbtn')[n]);
    // a row on the FX tab only marks itself (2026-09-07): clicking one takes no action at all. By
    // id, not by name — two FX can wear the same name (a spell's, and one item's Item Hook copy)
    const clickFxRow = async (id) => { const b = $(`.fxlist .pickbtn[data-id="${id}"]`); if (!b) throw new Error(`no FX row for ${id}`); return click(b); };
    // so the Editor is reached the way the API reaches it, or through the subject the search found
    const openEditor = async (id) => { api.open({ tab: 'editor', id }); await sleep(450); };
    // Delete asks first (DialogV2.confirm). The suite answers yes for one action, then puts it back
    const sayYes = async (fn) => { const D = foundry.applications.api.DialogV2; const was = D.confirm; D.confirm = async () => true; try { await fn(); await sleep(700); } finally { D.confirm = was; } };
    // Save uploads a file and reads the corpora again, Delete likewise: wait for the fact, never a clock
    const until = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch { /* not yet */ } await sleep(100); } return false; };
    const openEditorForSubject = async () => { app.openFor(app.view.subject); await app.render(); await sleep(350); };
    const band = async (b) => click(`[data-act="sh-band"][data-band="${b}"]`);
    const cells = (b) => [...$$(`.inspector[data-band="${b}"] .knobs .f`)].map((x) => x.className.replace('f f-', '').replace(' wide', ''));
    // the module's files on the server, read fresh and written back (what Corpus does, for the restore)
    const readFile = async (p) => (await fetch(`modules/${MOD}/${p}?t=${Date.now()}`, { cache: 'no-store' })).text();
    const writeFile = async (p, textValue) => { const FP = foundry.applications.apps.FilePicker.implementation; const parts = p.split('/'); const name = parts.pop(); return FP.upload('data', [`modules/${MOD}`, ...parts].join('/'), new File([textValue], name, { type: 'application/json' }), {}, { notify: false }); };
    const FILES = ['recipes/house.json', 'recipes/stock/spells.json'];
    const snapshot = {};
    for (const p of FILES) snapshot[p] = await readFile(p);
    try {
      // 1 · the window opens on an item and reads its sentence
      const misty = caster.actor.items.getName('Misty Step');
      app = api.open({ item: misty });
      await sleep(600);
      ok('§1 the window opens with four tabs: Library · Editor · Assets · Coverage', app?.rendered && $$('[role=tab]').length === 4 && $$('[role=tab]').map((t) => t.textContent).join('|') === 'Library|Editor|Assets|Coverage', `${$$('[role=tab]').map((t) => t.textContent).join(', ')}`);
      ok('§1 the search belongs to the FX tab, under the tabs, not to the window header', !!$('.pane[data-pane="fx"] .fxsearch .fx-q') && !$('.fx-head') && $('.fx-q')?.placeholder === 'Search for an FX…', $('.fx-q')?.placeholder ?? 'no box');
      ok('§1 the search is on the FX screen alone', !$('.pane[data-pane="assets"] .fx-q') && !$('.pane[data-pane="coverage"] .fx-q') && $$('.fx-q').length === 1, `${$$('.fx-q').length} boxes`);
      ok('§1 the box has no dropdown: one box, one job — it narrows the list and nothing else', !$('.fxsearch .suggest') && !$('[data-act="hit"]') && !$('[data-act="new"]'), 'no suggest under the FX search');
      ok('§1 there is no detail pane: the FX tab is the search, the facets and the rows', tabNow() === 'fx' && !$('.detail') && !!$('.fxsearch') && !!$('.facets') && !!$('.fxlist'), $$('.fxtab > *').map((x) => x.className.split(' ')[0]).join(', '));
      ok('§1 opening on an item lands on FX with the FX that answers it marked in the list', tabNow() === 'fx' && app.view.fxSel === 'misty-step' && $('.fx-q')?.value === 'Misty Step' && /Misty Step/.test($('.fxlist .row[data-now="true"]')?.textContent ?? ''), `${app.view.fxSel} · ${text('.fxlist .row[data-now="true"]')}`);
      // the Editor tab is in the strip with nothing open, and says what it is for
      await click('[data-tab="editor"]');
      ok('§1 the Editor tab opens with no FX and says every FX is edited there', tabNow() === 'editor' && paneNow() === 'editor' && !$('.sheet') && /Every FX is edited here/.test(text('.pane[data-pane="editor"] .card')) && !!$('[data-act="sh-new"]'), text('.pane[data-pane="editor"] .card').slice(0, 110));
      await click('[data-tab="fx"]');

      // 2 · a spell the corpus has never heard of
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con', activities: { dnd5eactivity000: { type: 'utility', _id: 'dnd5eactivity000' } } } }]);
      await sleep(200);
      app.refresh();
      await type('.fx-q', 'Sharran');
      await sleep(450);
      ok('§2 it plays nothing yet, and the list says so by having nothing to show', api.sentenceFor(tmp, 'use').sentence === 'Nothing plays.' && !$$('.fxlist .row').length && /^0 of \d+ FX$/.test(text('.fxlist .listhead')), `${api.sentenceFor(tmp, 'use').sentence} | ${text('.fxlist .listhead')}`);
      await type('.fx-q', '');
      await sleep(400);
      ok('§2 emptying the box shows the whole list again', $$('.fxlist .row').length > 100, `${$$('.fxlist .row').length} rows`);

      // 3 · the sheet: a new sheet unlocked, hooked to Sharran Step; Copy from seeds it. The FX tab
      // has no door that makes an FX since the dropdown went ("we'll add new later"), so this is
      // the API's, which is the door the item sheet's own button uses too
      api.open({ tab: 'editor', key: 'spell:sharran-step', edit: true });
      await sleep(450);
      ok('§3 the Editor opens on a new sheet, unlocked, hooked to the spell', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'true' && /Sharran Step \(spell\)/.test(text('.hookstrip')) && /New/.test(text('.sheet h2')), `pane ${paneNow()} · ${text('.sheet h2')}`);
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
      ok('§3 nothing has been saved yet', houseIds().length === before.length, `${houseIds().length}`);

      // 4 · the hook block and Save
      ok('§4 the Hook strip is one row of four: Answers · Reach · Moment · State', $$('.hookstrip .hcol').length === 4 && [...$$('.hookstrip .lbl')].map((l) => l.textContent).join(' · ') === 'Answers · Reach · Moment · State' && $('[data-act="sh-on"][aria-pressed="true"]')?.dataset.on === 'use' && $('[data-act="sh-off"][aria-pressed="true"]')?.dataset.v === 'false' && !/phase 4/.test(text('.hookstrip')), [...$$('.hookstrip .lbl')].map((l) => l.textContent).join(' · '));
      ok('§4 Reach offers both hooks with Global Hook pressed, since this sheet came from an item', $('.hookstrip [data-act="sh-global"]')?.getAttribute('aria-pressed') === 'true' && $('.hookstrip [data-act="sh-only"]')?.getAttribute('aria-pressed') === 'false' && /FX Test Caster · Sharran Step/.test(text('.hookstrip')), text('.hookstrip .hcol:nth-child(2)').replace(/\s+/g, ' '));
      ok('§4 the bar is static: every control is there, greyed where the mode does not offer it', $$('.lockbar button').length === 7 && !!$('[data-act="sh-new"]') && $('[data-act="sh-dup"]')?.disabled === true && $('[data-act="sh-export"]')?.disabled === true && $('[data-act="sh-delete"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 the id is shown, derived from the ability', text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      ok('§4 Save is enabled now the sequence has scenes', $('[data-act="sh-save"]')?.disabled === false && !$('.sheet .problem'), text('.sheet .problem'));
      await click('[data-act="sh-save"]');
      await until(() => api.fx.get('sharran-step') && $('.sheet')?.dataset.edit === 'false');
      const saved = api.fx.get('sharran-step')?.original;
      if (saved) made.push(saved.id);
      const house4 = JSON.parse(await readFile('recipes/house.json'));
      ok('§4 Save writes the FX into house.json on the server with its scenes and provenance, no dialog for a new FX', saved && Array.isArray(saved.scenes) && saved.scenes.length >= 2 && saved.to === undefined && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at) && /copied from Misty Step/.test(saved.note) && house4.fx.some((l) => l.id === 'sharran-step'), JSON.stringify(saved ?? null).slice(0, 300));
      ok('§4 what Copy from wrote is a full copy, standing on its own: no shortcut of any kind', saved && saved.like === undefined && saved.with === undefined, `like ${saved?.like} · with ${JSON.stringify(saved?.with)}`);
      ok('§4 the sheet stays open, locked, tagged House, with the sentence', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'false' && /House/.test(text('.sheet h2')) && /dark black/.test(text('.sheet .preview')) && !!$('[data-act="sh-dup"]') && /Delete/.test(text('[data-act="sh-delete"]')), `${text('.sheet h2')} | ${text('[data-act="sh-delete"]')}`);
      ok('§4 locked: the knobs are read-only and the tools are hidden', $$('.inspector .knobs select').every((x) => x.disabled) && !$('[data-act="cw-drop"]'), '');
      ok('§4 locked: the same bar, Save and Cancel greyed instead, nothing moved', $$('.lockbar button').length === 7 && $('[data-act="sh-save"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === true && $('[data-act="sh-dup"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 the spell resolves to it from House', api.resolve(tmp).fx?.id === 'sharran-step' && api.resolve(tmp).source === 'house', api.resolve(tmp).source);
      const r4 = api.sentenceFor(tmp);
      ok('§4 the API reads the same sentence the sheet shows, in the What plays box', text('.sheet .preview') === `What plays${r4.sentence}`, `${r4.sentence} | ${text('.sheet .preview')}`);
      ok('§4 the sentence is said once: What plays at the top, none under the sequence', $$('.sheet .preview').length === 1 && !$('.sheet .sentence') && /^What plays/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 60));
      await click('[data-act="sh-back"]');
      ok('§4 Back returns to where the sheet was opened from: the FX tab, on the FX it wrote', tabNow() === 'fx' && paneNow() === 'fx' && app.view.fxSel === 'sharran-step' && /Sharran Step/.test($('.fxlist .row[data-now="true"]')?.textContent ?? ''), `${app.view.fxSel} | ${text('.fxlist .row[data-now="true"]')}`);
      // the Editor is a tab now: leaving it does not close the sheet, and it is reachable with none open
      await click('[data-tab="editor"]');
      ok('§4 the Editor tab still holds the FX the sheet was on: leaving a tab does not close it', tabNow() === 'editor' && paneNow() === 'editor' && text('.sheet code.id') === 'sharran-step', `${tabNow()} · ${text('.sheet code.id')}`);
      await click('[data-tab="fx"]');

      // 5 · ONE FX tab: one list of every FX, grouped House → Stock (no Draft group, 2026-09-12)
      await type('.fx-q', '');
      await sleep(450);
      const rows5 = () => $$('.fxlist .row');
      const groups5 = () => $$('.fxlist .grouphead').map((g) => g.textContent.replace(/\s+/g, ' ').trim());
      ok('§5 there is no Stock FX, House FX or Look up tab: one FX tab holds them, and editing is the Editor tab', !$('[data-tab="stock"]') && !$('[data-tab="house"]') && !$('[data-tab="lookup"]') && !!$('[data-tab="fx"]') && !!$('[data-tab="editor"]'), $$('[role=tab]').map((t) => t.dataset.tab).join(', '));
      ok('§5 the list is grouped in resolution order, later wins: House, then Stock — and no Draft group', groups5().map((g) => g.split(' ')[0]).join(',') === 'House,Stock' && /^House · \d+ FX$/.test(groups5()[0]) && !/Draft/.test(text('.fxlist')), `${groups5().join(' | ')} · ${rows5().length} rows shown`);
      const first5 = rows5()[0];
      const houseRows5 = rows5().slice(0, api.corpora.house.length);
      ok('§5 the FX this world wrote is in the House group, by name among its peers', houseRows5.some((r) => r.querySelector('.n')?.textContent.trim() === 'Sharran Step') && groups5()[0] === `House · ${api.corpora.house.length} FX`, houseRows5.map((r) => r.querySelector('.n')?.textContent.trim()).join(', '));
      ok('§5 a row is the name and NOTHING else: no sentence, no layer pill, no shape tags', rows5().every((r) => r.querySelectorAll('.n').length === 1 && !r.querySelector('.s') && !r.querySelector('.tag') && !r.querySelector('.shapes')) && !/spell:/.test(text('.fxlist')) && !/when used/.test(text('.fxlist')), first5?.textContent.replace(/\s+/g, ' ') ?? '');
      ok('§5 the list head is the count alone', !$('.fxlist .listhead button') && /^\d+( of \d+)? FX$/.test(text('.fxlist .listhead')), text('.fxlist .listhead'));
      // Import sits on the search row, ending where the list ends, the same height as the box
      const imp5 = $('.fxsearch button.import');
      const box5b = $('.fxsearch input').getBoundingClientRect();
      ok('§5 Import is right-justified with the list and the same height as the search box', !!imp5 && Math.abs(imp5.getBoundingClientRect().height - box5b.height) <= 1 && Math.abs(imp5.getBoundingClientRect().right - $('.fxlist').getBoundingClientRect().right) <= 2 && imp5.dataset.act === 'import-fx', `${Math.round(imp5.getBoundingClientRect().right)} vs list ${Math.round($('.fxlist').getBoundingClientRect().right)}`);
      // R3: picking a row opens it in the Editor, and moves nothing in the list it left
      const geom5 = () => rows5().slice(0, 12).map((r) => { const b = r.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }).join(',');
      const was5 = geom5();
      const row5 = rows5().slice(0, 12).find((r) => r.querySelector('.pickbtn').dataset.id !== app.sheet?.id);
      const id5 = row5.querySelector('.pickbtn').dataset.id;
      await click(row5.querySelector('.pickbtn'));
      ok('§5 clicking a row takes NO action: it marks itself, the tab does not move, no sheet opens on it', tabNow() === 'fx' && paneNow() === 'fx' && app.view.fxSel === id5 && app.sheet?.id !== id5, `${tabNow()} · sheet on ${app.sheet?.id ?? 'nothing'} · row ${id5}`);
      ok('§5 the row is marked, one height, the layout unmoved (R3)', geom5() === was5 && new Set(rows5().map((r) => Math.round(r.getBoundingClientRect().height))).size === 1 && $('.fxlist .row[data-now="true"]') === row5, `${new Set(rows5().map((r) => Math.round(r.getBoundingClientRect().height))).size} row height(s)`);
      // the marked row is the only one showing its two doors, and they cost the row no height (R3)
      const acts5 = rows5()[4].querySelector('.acts');
      ok('§5 every row carries Record, then Delete, then Editor, right-justified', rows5().every((r) => [...r.querySelector('.acts').children].map((x) => x.textContent.trim()).join(',') === 'Record,Delete,Editor') && rows5().every((r) => getComputedStyle(r.querySelector('.acts')).visibility === 'visible') && acts5.getBoundingClientRect().right > rows5()[4].querySelector('.n').getBoundingClientRect().right, `${[...acts5.children].map((x) => x.textContent.trim()).join(', ')} on ${rows5().length} rows`);
      ok('§5 Delete is painted as the destructive one; Record and Editor read as plain text', getComputedStyle(acts5.querySelector('.danger')).color !== getComputedStyle(acts5.querySelector('[data-act="fx-editor"]')).color && getComputedStyle(acts5.querySelector('[data-act="fx-editor"]')).color === getComputedStyle(rows5()[4].querySelector('.n')).color, `delete ${getComputedStyle(acts5.querySelector('.danger')).color} · editor ${getComputedStyle(acts5.querySelector('[data-act="fx-editor"]')).color}`);
      // the group heads are the one painted thing on the screen: where an FX lives
      const head5 = $('.fxlist .grouphead');
      ok('§5 a group head is plainly painted, not another grey band', !/rgba\(0, 0, 0, 0\)/.test(getComputedStyle(head5).backgroundColor) && getComputedStyle(head5).color !== getComputedStyle(rows5()[0].querySelector('.n')).color && getComputedStyle(head5).borderTopWidth !== '0px', `${getComputedStyle(head5).backgroundColor} · ${getComputedStyle(head5).color}`);
      // and it does not take the list away from you: scrolled down, picking a row keeps the scroll
      const scroller5 = $('.fxlist .rows');
      scroller5.scrollTop = 400;
      await sleep(150);
      const deep5 = rows5().find((r) => r.getBoundingClientRect().top > scroller5.getBoundingClientRect().top + 50);
      await click(deep5.querySelector('.pickbtn'));
      ok('§5 picking a row keeps the list exactly where it was scrolled to', $('.fxlist .rows') === scroller5 && Math.round(scroller5.scrollTop) === 400 && deep5.dataset.now === 'true', `scrollTop ${Math.round(scroller5.scrollTop)} of 400 · same node ${$('.fxlist .rows') === scroller5}`);
      // the row's Editor link, and a double click, are the same door
      const deepId5 = deep5.querySelector('.pickbtn').dataset.id;
      await click(deep5.querySelector('[data-act="fx-editor"]'));
      ok('§5 the Editor link on the marked row opens it in the Editor', tabNow() === 'editor' && text('.sheet code.id') === deepId5, `${deepId5} → ${text('.sheet code.id')}`);
      await click('[data-tab="fx"]');
      const other5 = rows5().find((r) => r.querySelector('.pickbtn').dataset.id !== deepId5);
      const otherId5 = other5.querySelector('.pickbtn').dataset.id;
      other5.querySelector('.pickbtn').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await sleep(500);
      ok('§5 double-clicking a row is the same door', tabNow() === 'editor' && text('.sheet code.id') === otherId5, `${otherId5} → ${text('.sheet code.id')}`);
      await click('[data-tab="fx"]');
      $('.fxlist .rows').scrollTop = 0;
      await sleep(120);
      // R4: one scroll region — the rows scroll, the facets and the search do not
      const overflows5 = (sel) => { const el = $(sel); return !!el && el.scrollHeight > el.clientHeight + 1; };
      ok('§5 one scroll region on the screen: the rows (R4)', !overflows5('.facets') && !overflows5('.fxsearch') && getComputedStyle($('.fxlist .rows')).overflowY === 'auto', `facets ${overflows5('.facets')}`);
      // R5: two columns under a search of its own, and the window never scrolls sideways
      const content5 = app.element.querySelector('.fxstudio-content');
      ok('§5 the tab is a search over two columns — facets and rows — none of them spilling (R2, R5)', !$('.detail') && getComputedStyle($('.fxtab')).gridTemplateColumns.split(' ').length === 2 && $('.fxsearch').getBoundingClientRect().bottom <= $('.facets').getBoundingClientRect().top && content5.scrollWidth <= content5.clientWidth + 1, `${getComputedStyle($('.fxtab')).gridTemplateColumns} · ${content5.scrollWidth} vs ${content5.clientWidth}`);
      // the facets, all of them from data the window already had
      ok('§5 three facet groups: Lives in, Kind, Only', [...$$('.facets .sub')].map((x) => x.textContent).join(' · ') === 'Lives in · Kind · Only', [...$$('.facets .sub')].map((x) => x.textContent).join(' · '));
      const live5 = $$('.facets [data-group="lives"]');
      ok('§5 Lives in counts House and Stock, and they add up to the corpus', live5.length === 2 && live5.reduce((t, b) => t + Number(b.querySelector('.c').textContent), 0) === api.fx.list().length, live5.map((b) => b.textContent.replace(/\s+/g, ' ')).join(', '));
      ok('§5 Kind lists the six authored kinds: no Statuses, Damage or Events (2026-09-12)', $$('.facets [data-group="kinds"]').length === 6 && !$('[data-group="kinds"][data-v="status"]') && !$('[data-group="kinds"][data-v="event"]') && $$('.facets [data-group="kinds"][data-na="true"]').every((b) => b.disabled), `${$$('.facets [data-group="kinds"]').length} kinds, ${$$('.facets [data-group="kinds"][data-na="true"]').length} at zero`);
      const all5 = rows5().length;
      await click('[data-group="lives"][data-v="house"]');
      ok('§5 a facet narrows the list to that layer alone', rows5().length < all5 && groups5().length === 1 && /^House · /.test(groups5()[0]), `${all5} → ${rows5().length} rows · ${groups5().join(' | ')}`);
      // a filter that is on must LOOK on: it lost to the base rule on specificity until 2026-09-07
      const on5 = $('.facets [data-group="lives"][data-v="house"]');
      const paint5 = getComputedStyle(on5);
      const flat5 = getComputedStyle($('.facets [data-group="lives"][data-v="stock"]'));
      ok('§5 an active filter stays highlighted, plainly different from an inactive one', on5.getAttribute('aria-pressed') === 'true' && paint5.backgroundColor !== flat5.backgroundColor && paint5.borderTopColor !== flat5.borderTopColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(paint5.backgroundColor), `on ${paint5.backgroundColor} / ${paint5.borderTopColor} · off ${flat5.backgroundColor}`);
      await click('[data-group="kinds"][data-v="spell"]');
      ok('§5 the facets stack, and Clear counts what is on', groups5().length === 1 && rows5().length >= 1 && /Clear · 2/.test(text('[data-act="fx-clear"]')), `${text('[data-act="fx-clear"]')} · ${rows5().length} rows`);
      await type('.fx-q', 'a');
      await sleep(450);
      ok('§5 the facets work in conjunction with the search: both narrow at once', rows5().length >= 1 && rows5().every((r) => /a/i.test(r.textContent)) && $$('.facets [aria-pressed="true"]').length === 2, `${rows5().length} rows · ${$$('.facets [aria-pressed="true"]').length} filters on`);
      await click('[data-act="fx-clear"]');
      ok('§5 Clear clears the left-hand filters and leaves the search alone', !$('.facets [aria-pressed="true"]') && $('.fx-q').value === 'a' && rows5().length > 1, `${rows5().length} rows · box "${$('.fx-q').value}"`);
      await type('.fx-q', '');
      await sleep(450);
      ok('§5 and emptying the box puts every FX back', rows5().length === all5, `${rows5().length} rows`);
      ok('§5 Only offers Item Hooks and Switched off, nothing else: On my actors and Broken assets went (2026-09-12)', $$('[data-group="only"]').length === 2 && !$('[data-group="only"][data-v="broken"]') && !$('[data-group="only"][data-v="mine"]'), $$('[data-group="only"]').map((b) => b.dataset.v).join(', '));
      // the search, which belongs to this tab now, narrows the same list
      const box5 = $('.fx-q');
      await type('.fx-q', 'sharran');
      await sleep(450);
      ok('§5 the tab\'s own search narrows the list without redrawing the box being typed in', rows5().length === 1 && /Sharran Step/.test(rows5()[0].textContent) && $('.fx-q') === box5 && $('.fx-q').value === 'sharran', `${rows5().length} rows · same box ${$('.fx-q') === box5}`);
      await type('.fx-q', 'guiding bolt 01 blueyellow');
      await sleep(450);
      ok('§5 the search matches the NAME and only the name: what an FX plays is not searched', rows5().length === 0, `${rows5().length} rows for an asset the sentence names`);
      await type('.fx-q', 'dagger');
      await sleep(450);
      ok('§5 so Dagger does not drag in Sculpting Knife, whose sentence names one', rows5().length >= 1 && rows5().every((r) => /dagger/i.test(r.textContent)), rows5().map((r) => r.textContent.trim()).join(', ').slice(0, 120));
      // the box is a control, not a banner
      const box = $('.fxsearch input').getBoundingClientRect();
      ok('§5 the search box is sized like a control: one facet row tall, well under half the width', Math.round(box.height) <= 28 && Math.round(box.width) <= 300 && Math.round(box.width) < content5.clientWidth / 2, `${Math.round(box.width)}×${Math.round(box.height)}`);
      // THE RECORD DOOR (the user, 2026-09-08): one word on every row that opens the compendium
      // record the key was earned against. The address was settled offline when the name met the
      // closed lists (recipes/records.json) — nothing is matched by name here, at the table.
      await type('.fx-q', 'fire bolt');
      await sleep(450);
      const rec5 = rows5().map((r) => r.querySelector('[data-act="fx-record"]')).find(Boolean);
      ok('§5 a stock row carries the Record it was keyed against, named with its book', !!rec5 && /^Compendium\.[^.]+\.[^.]+\.Item\./.test(rec5.dataset.uuid ?? '') && /Fire Bolt/.test(rec5.dataset.tooltip ?? '') && /Player's Handbook/.test(rec5.dataset.tooltip ?? ''), `${rec5?.dataset.uuid} · ${rec5?.dataset.tooltip}`);
      await click(rec5);
      await sleep(900);
      const shown5 = () => [...(foundry.applications.instances?.values() ?? [])].concat(Object.values(ui.windows ?? {}));
      const hit5 = shown5().find((w) => w?.document?.uuid === rec5.dataset.uuid);
      ok('§5 clicking it opens that record in its own sheet, beside the window', !!hit5, hit5 ? `${hit5.constructor.name} on ${hit5.document?.name}` : shown5().map((w) => w?.constructor?.name).join(', ').slice(0, 160));
      await hit5?.close?.();
      await sleep(200);
      // and where nothing holds the key — a spell this world invented — the door is greyed in place
      await type('.fx-q', 'sharran');
      await sleep(450);
      const grey5 = $('.fxlist .row [data-act], .fxlist .row .link.record');
      const rdoor5 = $('.fxlist .row .acts').children[0];
      ok('§5 an FX for something no book or actor holds is greyed WHERE IT STANDS with its reason (R1)', rdoor5?.textContent.trim() === 'Record' && rdoor5.disabled && rdoor5.dataset.na === 'true' && /Nothing here holds Sharran Step/.test(rdoor5.dataset.tooltip ?? ''), `${rdoor5?.dataset.tooltip} · ${!!grey5}`);
      await type('.fx-q', '');
      await sleep(450);

      // THE EDITOR NAMES ITS BOOK (the user, 2026-09-09). Every keyed FX carries its own record
      // (DESIGN §20), so the screen the work happens on says where the ability comes from, and the
      // line is the same door the row's Record is.
      await type('.fx-q', 'fire bolt');
      await sleep(450);
      await click($$('.fxlist .row .n')[0]);
      await sleep(120);
      await click($('.fxlist .row .acts [data-act="fx-editor"]'));
      await sleep(500);
      const recline = $('.sheet-title .recordline [data-act="sh-record"]');
      ok('§5 the Editor names the book the ability comes from, under its name', /Player's Handbook/.test(recline?.textContent ?? '') && /^Compendium\./.test(recline?.dataset.uuid ?? ''), `${recline?.textContent} · ${recline?.dataset.uuid}`);
      await click(recline);
      await sleep(900);
      const hitEd = shown5().find((w) => w?.document?.name === 'Fire Bolt');
      ok('§5 that line opens the same record the Record door opens', !!hitEd, hitEd ? `${hitEd.constructor.name} on ${hitEd.document?.name}` : 'nothing opened');
      await hitEd?.close?.();
      await click('[data-tab="fx"]');
      await type('.fx-q', '');
      await sleep(450);

      // 6 · no staging, no ship (2026-09-12); a Stock FX edited asks: House override, or Stock itself
      ok('§6 staging is nowhere: no select on the FX tab, no Stage, no Ship', !$('[data-pane="fx"] select') && !$('[data-act="co-stage"]') && !$('[data-act="co-ship"]') && !/Draft/.test(text('[data-pane="fx"]')), text('[data-pane="fx"] .fxlist .listhead'));
      ok('§6 Stock is in the same list as everything else', Number($$('.facets [data-group="lives"]')[1].querySelector('.c').textContent) > 200, $$('.facets [data-group="lives"]')[1].textContent.replace(/\s+/g, ' '));
      await click('[data-tab="coverage"]');
      ok('§6 the Maintain band sits at the top of Coverage: Import to Stock and the corpus line, no columns to stage or ship', /Maintain · /.test(text('[data-pane="coverage"]')) && $('.coverage').firstElementChild.classList.contains('maintain') && !!$('.maintain [data-act="import-fx"][data-to="stock"]') && !$('.maintain .mcol') && !$('.maintain .co-version'), text('.maintain').replace(/\s+/g, ' ').slice(0, 160));
      // the Stock choice, through the sheet's own Save: the dialog is answered for it
      const stock6 = 'fire-bolt';
      const stockNote6 = api.fx.get(stock6)?.original?.note ?? '';
      const answerSave = async (choice, fn) => { const D = foundry.applications.api.DialogV2; const was = D.wait; let asked = false; D.wait = async () => { asked = true; return choice; }; try { await fn(); if (choice === 'cancel') await sleep(400); else await until(() => $('.sheet')?.dataset.edit === 'false'); } finally { D.wait = was; } return asked; };
      const editNote = async (note) => { const sw = $('.sh-edit'); if (!sw.checked) { sw.checked = true; sw.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300); } await type('.sh-note', note); };
      await openEditor(stock6);
      ok('§6 a Stock FX opens tagged Stock', api.fx.get(stock6)?.source === 'stock' && /Stock/.test(text('.sheet h2')), text('.sheet h2'));
      await editNote('override by the suite');
      ok('§6 editing Stock, the banner says Save will ask: House override or Stock', /House override/.test(text('.sheet .banner')) && /Stock itself/.test(text('.sheet .banner')), text('.sheet .banner'));
      const asked6 = await answerSave('house', () => click('[data-act="sh-save"]'));
      made.push(stock6);
      ok('§6 Save asked, and House override writes the same id into house.json: House wins, Stock is untouched', asked6 && api.fx.get(stock6)?.source === 'house' && api.fx.get(stock6)?.original?.note === 'override by the suite' && api.corpus.under(stock6) === 'stock' && api.corpora.stock.find((l) => l.id === stock6)?.note === stockNote6 && JSON.parse(await readFile('recipes/house.json')).fx.some((l) => l.id === stock6), `${api.fx.get(stock6)?.source} · under ${api.corpus.under(stock6)}`);
      ok('§6 the sheet reopens on the override, tagged House override', /House override/.test(text('.sheet h2')) && $('.sheet')?.dataset.edit === 'false', text('.sheet h2'));
      // the Stock row is NOT lost (the user, 2026-09-12): both rows are listed, House first, Stock dimmed
      await click('[data-tab="fx"]');
      await type('.fx-q', 'fire bolt');
      await sleep(450);
      const both6 = $$(`.fxlist .pickbtn[data-id="${stock6}"]`);
      ok('§6 the Library lists the override AND the Stock FX under it, two rows of one id, Stock marked as overridden', both6.length === 2 && both6.map((b) => b.dataset.source).join(',') === 'house,stock' && both6[1].closest('.row')?.dataset.shadowed === 'true' && /overrides this/.test(both6[1].dataset.tooltip ?? ''), both6.map((b) => `${b.dataset.source}:${b.closest('.row')?.dataset.shadowed}`).join(' · '));
      await click(both6[1].closest('.row').querySelector('[data-act="fx-editor"]'));
      ok('§6 the Stock row\'s Editor opens the Stock FX itself, saying House overrides it', paneNow() === 'editor' && app.sheet?.source === 'stock' && app.sheet?.shadowed === true && /House overrides it/.test(text('.sheet h2')) && app.sheet?.note === stockNote6, `${app.sheet?.source} · ${text('.sheet h2')}`);
      await click('[data-tab="fx"]');
      await type('.fx-q', '');
      await sleep(450);
      await click($(`.fxlist .pickbtn[data-id="${stock6}"][data-source="house"]`).closest('.row').querySelector('[data-act="fx-editor"]'));
      ok('§6 and the House row\'s Editor opens the override', app.sheet?.source === 'house' && app.sheet?.note === 'override by the suite', `${app.sheet?.source}`);
      await sayYes(() => click('[data-act="sh-delete"]'));
      await until(() => api.fx.get(stock6)?.source === 'stock' && text('.sheet code.id') === stock6);
      ok('§6 Delete on the override shows Stock again, and the sheet reopens on it', api.fx.get(stock6)?.source === 'stock' && api.fx.get(stock6)?.original?.note === stockNote6 && text('.sheet code.id') === stock6 && /Stock/.test(text('.sheet h2')), `${api.fx.get(stock6)?.source} · ${text('.sheet h2')}`);
      await editNote('stock edited by the suite');
      const asked6b = await answerSave('stock', () => click('[data-act="sh-save"]'));
      ok('§6 Edit Stock writes the Stock file itself: no override, the books changed', asked6b && api.fx.get(stock6)?.source === 'stock' && api.fx.get(stock6)?.original?.note === 'stock edited by the suite' && JSON.parse(await readFile('recipes/stock/spells.json')).fx.find((l) => l.id === stock6)?.note === 'stock edited by the suite' && !JSON.parse(await readFile('recipes/house.json')).fx.some((l) => l.id === stock6), `${api.fx.get(stock6)?.source} · ${api.fx.get(stock6)?.original?.note}`);
      await editNote(stockNote6);
      await answerSave('stock', () => click('[data-act="sh-save"]'));
      ok('§6 and written back as it was', api.fx.get(stock6)?.original?.note === stockNote6, api.fx.get(stock6)?.original?.note ?? '');
      await editNote('cancelled');
      const asked6c = await answerSave('cancel', () => click('[data-act="sh-save"]'));
      ok('§6 Cancel in the dialog saves nothing and leaves the sheet unlocked', asked6c && $('.sheet')?.dataset.edit === 'true' && api.fx.get(stock6)?.original?.note === stockNote6, `${$('.sheet')?.dataset.edit}`);
      await click('[data-act="sh-cancel"]');
      await click('[data-tab="fx"]');

      // 7 · one item's own FX, through the sheet (Open FX from the card, unlock, Item Hook, Save)
      api.open({ item: tmp });
      await sleep(300);
      await openEditorForSubject();
      ok('§7 the Editor opens on the FX that answers the item, locked, to read', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'false' && text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      const sw = $('.sh-edit'); sw.checked = true; sw.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      ok('§7 the Edit switch unlocks the sheet: Save and Cancel appear, the tools too', $('.sheet')?.dataset.edit === 'true' && !!$('[data-act="sh-save"]') && !!$('[data-act="sh-cancel"]') && !!$('[data-act="cw-drop"]'), '');
      const only = $('[data-act="sh-only"]');
      ok('§7 the Hook block offers an Item Hook for an item on a sheet', !!only && /Item Hook/.test(only.textContent), only?.textContent);
      await click(only);
      ok('§7 with the Item Hook the sheet says so and the id is the item\'s own', /Item Hook/.test(text('.sheet h2')) && text('.sheet code.id') === 'sharran-step-fx-test-caster', `${text('.sheet h2')} · ${text('.sheet code.id')}`);
      await click('[data-act="sh-save"]');
      await until(() => api.fx.get('sharran-step-fx-test-caster') && $('.sheet')?.dataset.edit === 'false');
      const own = api.fx.get('sharran-step-fx-test-caster')?.original;
      if (own) made.push(own.id);
      const flag = tmp.getFlag(MOD, 'fx');
      ok('§7 the item now points at an FX of its own, keyed to nothing, in House', own && own.for?.length === 0 && api.fx.get(own.id)?.source === 'house' && flag === own.id, `flag ${flag} · ${JSON.stringify(own ?? null).slice(0, 200)}`);
      const r7 = api.sentenceFor(tmp);
      ok('§7 the item plays its own FX ahead of the spell\'s, and says so', r7.fx?.id === own?.id && /Item Hook/.test(r7.why), `${r7.sentence} | ${r7.why}`);
      const other = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const r7b = api.sentenceFor(other[0]);
      ok('§7 another copy of the spell still plays the spell\'s fx', r7b.fx?.id === 'sharran-step' && /dark black/.test(r7b.sentence), r7b.sentence);
      await other[0].delete();
      api.open({ item: tmp });
      await sleep(300);
      // Revert is Delete now (2026-09-07): the sheet's Delete erases the FX AND unpins the item that
      // pointed at it, which is the one thing Delete used not to do
      await clickFxRow(own.id);
      ok('§7 the Item Hook has a row of its own on the FX tab', tabNow() === 'fx' && app.view.fxSel === own.id, app.view.fxSel);
      // an Item Hook answers no key, so its record is the ITEM it is pinned to, on its own actor
      const rec7 = $(`.fxlist .row [data-act="fx-record"][data-name="${tmp.name}"]`) ?? [...$$('.fxlist .row')].find((r) => r.querySelector('.pickbtn')?.dataset.id === own.id)?.querySelector('[data-act="fx-record"]');
      ok('§7 its Record opens the item it is pinned to, not a book', !!rec7 && rec7.dataset.uuid === tmp.uuid && /this world/.test(rec7.dataset.tooltip ?? ''), `${rec7?.dataset.uuid} vs ${tmp.uuid} · ${rec7?.dataset.tooltip}`);
      await openEditor(own.id);
      ok('§7 the Editor opens on it, an Item Hook', paneNow() === 'editor' && text('.sheet code.id') === own.id && /Item Hook/.test(text('.sheet h2')), text('.sheet code.id'));
      await sayYes(() => click('[data-act="sh-delete"]'));
      await until(() => !api.fx.get(own.id) && !tmp.getFlag(MOD, 'fx'));
      ok('§7 Delete erases it and leaves no item pointing at a dead id: the spell\'s fx answers again', !tmp.getFlag(MOD, 'fx') && !api.fx.get(own?.id) && api.resolve(tmp).fx?.id === 'sharran-step', `flag ${tmp.getFlag(MOD, 'fx')} · ${api.resolve(tmp).fx?.id}`);
      await click('[data-tab="fx"]');
      // the guard: a locked sheet's Cancel drops changes
      await openEditor('sharran-step');
      const sw2 = $('.sh-edit'); sw2.checked = true; sw2.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
      await pick(1); await band('timing');
      await choose('.cw-delay', '900');
      ok('§7 a change unlocks Save', /after 900 ms/.test(text('.sheet .preview')) && $('[data-act="sh-save"]')?.disabled === false, '');
      await click('[data-act="sh-cancel"]');
      ok('§7 Cancel drops the change and locks the sheet again', $('.sheet')?.dataset.edit === 'false' && /after 500 ms/.test(text('.sheet .preview')) && api.fx.get('sharran-step')?.original?.scenes?.[1]?.delay === 500, text('.sheet .preview').slice(0, 120));

      // 9 · there is no ship (2026-09-12): Save wrote house.json in §4. The old name still lands on
      //     Coverage; the module's manifest is never touched by a Save; then the files are put back
      api.open({ tab: 'audit' });
      await sleep(300);
      ok('§9 the old tab name lands on Coverage, whose Maintain band has no Ship', tabNow() === 'coverage' && !$('[data-act="co-ship"]') && !/Shipped/.test(text('.maintain')), text('.maintain').replace(/\s+/g, ' ').slice(0, 100));
      const houseNow = JSON.parse(await readFile('recipes/house.json'));
      ok('§9 the server\'s house.json holds Sharran Step from §4, with no staging field', houseNow.fx.some((l) => l.id === 'sharran-step' && l.to === undefined && l.by === game.user.name), `${houseNow.fx.length} fx`);
      ok('§9 the module\'s own manifest is left alone (a Save writes corpus files only)', JSON.parse(await readFile('module.json')).version === game.modules.get(MOD).version, '');
      ok('§9 nothing is pending anywhere: no corpus.pending, stage or ship on the API', !api.corpus.pending && !api.corpus.stage && !api.corpus.ship && !api.fx.buffer && !api.fx.remove, Object.keys(api.corpus).join(', '));
      // restore the module's files byte for byte, and read the corpora again
      for (const p of FILES) await writeFile(p, snapshot[p]);
      await api.corpus.reload();
      let same = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) same = false;
      ok('§9 restored: the module\'s files are as they were and Sharran Step is gone from the corpus', same && !api.resolve(tmp).fx, `${api.resolve(tmp).why ?? ''}`);

      // 12 · COVERAGE (HANDOFF step 7): Maintain at the top, two scopes, four tiles, one list —
      //      and the Item Hook gap it closed
      await click('[data-tab="coverage"]');
      app.refresh();
      await app.render();
      await sleep(250);
      const cvKids = () => [...$('.coverage').children].map((c) => (c.className.match(/maintain|cvscope|tiles|cvlist/) ?? ['?'])[0]);
      ok('§12 four bands in one order: Maintain, the scope, the tiles, the rows', cvKids().join(' > ') === 'maintain > cvscope > tiles > cvlist', cvKids().join(' > '));
      ok('§12 Maintain is the band at the top: Import to Stock and the corpus line, no columns', !$('.maintain .mcol') && !!$('.maintain [data-act="import-fx"][data-to="stock"]') && /corpus files read clean|corpus problem/.test(text('.maintain')), text('.maintain').replace(/\s+/g, ' ').slice(0, 120));
      const tileL = () => $$('.tiles .tile').map((t) => t.querySelector('.l').textContent.trim());
      const tileN = () => $$('.tiles .tile').map((t) => t.querySelector('.num').textContent.trim());
      ok('§12 four tiles at permanent addresses: Abilities · With FX · No FX · Errors', tileL().join(' · ') === 'Abilities · With FX · No FX · Errors', tileL().join(' · '));
      const c12 = api.census();
      ok('§12 it opens on My actors — the scope that was computed on every render and never shown', $('[data-act="cv-scope"][data-scope="mine"]')?.getAttribute('aria-pressed') === 'true' && $$('[data-act="cv-scope"]').length === 2 && tileN()[0] === String(c12.asked) && tileN()[1] === String(c12.answered) && tileN()[2] === String(c12.asked - c12.answered), `${tileN().join(' · ')} vs census ${c12.answered} of ${c12.asked}`);
      const cvRows = () => $$('.cvlist .rows .row');
      ok('§12 the rows are the abilities on this world\'s actors that play nothing, grouped by actor', cvRows().length === Math.min(200, c12.asked - c12.answered) && $$('.cvlist .grouphead').length >= 1 && new Set(cvRows().map((r) => Math.round(r.getBoundingClientRect().height))).size === 1, `${cvRows().length} rows · ${$$('.cvlist .grouphead').length} groups`);
      const overflows12 = (sel) => { const el = $(sel); return !!el && el.scrollHeight > el.clientHeight + 1; };
      ok('§12 one scroll region: the rows (R4)', getComputedStyle($('.cvlist .rows')).overflowY === 'auto' && !overflows12('.maintain') && !overflows12('.cvscope') && !overflows12('.tiles'), `band ${overflows12('.maintain')} · scope ${overflows12('.cvscope')} · tiles ${overflows12('.tiles')}`);
      const content12 = app.element.querySelector('.fxstudio-content');
      ok('§12 nothing wraps: four tiles across, no band columns left, no sideways scroll (R2)', getComputedStyle($('.tiles')).gridTemplateColumns.split(' ').length === 4 && !$('.mgrid') && content12.scrollWidth <= content12.clientWidth + 1, `${getComputedStyle($('.tiles')).gridTemplateColumns} · ${content12.scrollWidth} vs ${content12.clientWidth}`);
      // every No FX row is the door to a sheet for it
      const first12 = cvRows()[0];
      const name12 = first12?.querySelector('.n')?.textContent.trim() ?? '';
      await click(first12.querySelector('.pickbtn'));
      ok('§12 a No FX row opens a new sheet on that ability, unlocked, hooked to it', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'true' && text('.sheet h2').includes(name12) && $$('.hookstrip .pill.key').length >= 1, `${text('.sheet h2')} | ${text('.hookstrip .hcol').slice(0, 60)}`);
      await click('[data-act="sh-back"]');
      ok('§12 Back returns to Coverage, where the row was', tabNow() === 'coverage' && !!$('.coverage'), tabNow());
      // the second scope: the books, picked as rows, read once
      await click('[data-act="cv-scope"][data-scope="books"]');
      ok('§12 the Compendiums scope lists the books as rows to pick, the tiles waiting with "—"', cvRows().length > 0 && !!$('[data-act="cv-book"]') && $('[data-act="cv-check"]')?.disabled === true && tileN().slice(0, 3).join('') === '———', `${cvRows().length} books · ${tileN().join(' · ')}`);
      // the smallest book with enough in it to be worth reading, so the tiles have real numbers
      const sized12 = cvRows().map((r) => ({ r, n: Number(r.querySelector('.tag')?.textContent) || 0 })).sort((x, y) => x.n - y.n);
      const smallest = (sized12.find((x) => x.n >= 25) ?? sized12[sized12.length - 1])?.r ?? cvRows()[0];
      await click(smallest.querySelector('.pickbtn'));
      ok('§12 one compendium picked: the button says so', /Check \(1\)/.test($('[data-act="cv-check"]')?.textContent ?? '') && !$('[data-act="cv-check"]').disabled, ($('[data-act="cv-check"]')?.textContent ?? '').trim());
      await click('[data-act="cv-check"]');
      for (let i = 0; i < 120 && /Checking/.test($('[data-act="cv-check"]')?.textContent ?? ''); i++) await sleep(250);
      await sleep(300);
      ok('§12 the book is read: the tiles are its numbers, they add up, and the rows are the No FX ones', Number(tileN()[0]) > 0 && Number(tileN()[0]) === Number(tileN()[1]) + Number(tileN()[2]) && cvRows().length === Math.min(200, Number(tileN()[2])), `${tileN().join(' · ')} · ${cvRows().length} rows`);
      const bookRow12 = cvRows()[0];
      if (bookRow12) {
        await click(bookRow12.querySelector('.pickbtn'));
        ok('§12 an ability in a book with no FX opens a new sheet hooked to that key', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'true' && $$('.hookstrip .pill.key').length >= 1, `${text('.sheet h2')} | ${text('.hookstrip .hcol').slice(0, 60)}`);
        await click('[data-act="sh-back"]');
      } else {
        ok('§12 an ability in a book with no FX opens a new sheet hooked to that key', /All have FX/.test(text('.cvlist')), 'every ability in that book is answered');
      }
      await click('[data-act="cv-pick"]');
      ok('§12 Books goes back to the picking with the pick remembered, and both scopes hold their place', !!$('[data-act="cv-book"][aria-pressed="true"]') && /Books · 1/.test(text('[data-act="cv-pick"]')) && $$('[data-act="cv-scope"]').length === 2, text('[data-act="cv-pick"]'));
      await click('[data-act="cv-scope"][data-scope="mine"]');
      // the Errors tile: the check tools/check-fx.mjs runs, on screen — a count, not a door (2026-09-12)
      const broke0 = Number(tileN()[3]);
      ok('§12 the Errors tile counts the check the tools run, and is not a door', /^\d+$/.test(tileN()[3]) && !$('[data-act="cv-broken"]') && $$('.tiles .tile')[3].tagName === 'DIV', `${broke0} broken`);
      const probe = { id: 'fx-broken-probe', for: ['spell:fx-broken-probe'], on: 'use', scenes: [{ shape: 'mark', at: 'source', asset: { path: 'jb2a.no_such_asset_here.blue' } }] };
      const savedProbe = await api.fx.save(probe, { by: game.user.name });
      if (savedProbe.ok) made.push(probe.id);
      app.refresh();
      await app.render();
      await sleep(250);
      ok('§12 an FX naming an asset the libraries do not have is counted there, and the tooltip names it', savedProbe.ok && Number(tileN()[3]) === broke0 + 1 && /fx-broken-probe/.test($$('.tiles .tile')[3].dataset.tooltip ?? ''), `${JSON.stringify(savedProbe.problems ?? [])} · ${broke0} → ${tileN()[3]}`);
      await api.corpus.erase(probe.id);
      await sleep(300);
      await click('[data-tab="fx"]');
      await click('[data-act="fx-clear"]');

      // the Item Hook gap step 7 closed: pinning an FX to one item without arriving from its sheet
      await click('[data-tab="editor"]');
      await click('[data-act="sh-new"]');
      const pin12 = $('[data-act="sh-pick-item"]');
      ok('§12 a new sheet from the Editor knows no item, and Reach offers to choose one', paneNow() === 'editor' && !!pin12 && pin12.disabled === false && pin12.textContent.trim() === 'Item Hook', pin12 ? `${pin12.textContent.trim()} · ${pin12.dataset.tooltip}` : 'no Item Hook control at all');
      await click(pin12);
      await type('.sh-item-q', 'misty');
      const hits12 = $$('.sh-item-search .hit');
      ok('§12 the chooser lists the items on this world\'s actors, by owner and name', hits12.length >= 1 && hits12.some((h) => /FX Test Caster · Misty Step/.test(h.textContent.replace(/\s+/g, ' '))), hits12.map((h) => h.textContent.replace(/\s+/g, ' ')).join(' | ').slice(0, 160));
      await click(hits12.find((h) => /FX Test Caster · Misty Step/.test(h.textContent.replace(/\s+/g, ' '))));
      ok('§12 picking one pins the sheet to it: Reach reads the owner and the item, pressed', $('[data-act="sh-only"]')?.getAttribute('aria-pressed') === 'true' && /Item Hook: FX Test Caster · Misty Step/.test(text('.hookstrip').replace(/\s+/g, ' ')) && text('.sheet code.id') === 'misty-step-fx-test-caster', `${text('.hookstrip .hcol:nth-child(2)').replace(/\s+/g, ' ')} · ${text('.sheet code.id')}`);
      await type('.sh-like', 'misty');
      await sleep(250);
      const like12 = $$('.suggest .hit').find((h) => h.dataset.id === 'misty-step');
      await click(like12);
      await click('[data-act="sh-save"]');
      await until(() => api.fx.get('misty-step-fx-test-caster') && $('.sheet')?.dataset.edit === 'false');
      const pinned12 = api.fx.get('misty-step-fx-test-caster')?.original;
      if (pinned12) made.push(pinned12.id);
      const misty12 = caster.actor.items.getName('Misty Step');
      ok('§12 Save writes it as an Item Hook and the item points at it — the hole step 7 closed', !!pinned12 && pinned12.for?.length === 0 && misty12?.getFlag(MOD, 'fx') === pinned12?.id && api.resolve(misty12).fx?.id === pinned12?.id, `flag ${misty12?.getFlag(MOD, 'fx')} · for ${JSON.stringify(pinned12?.for)}`);
      await misty12.unsetFlag(MOD, 'fx');
      await api.corpus.erase('misty-step-fx-test-caster');
      await sleep(300);

      // 13 · the Asset Library: browse, step the variants, sounds, the unused filter, and the picker door from the walk
      await click('[data-tab="assets"]');
      const styles = $$('[data-act="lib-sel"]');
      ok('§13 the Asset Library browses and does not write: no Use button outside the picker', !$('[data-act="lib-use"]') && !$('.lib-actions'), 'no lib-use on the tab');
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
      ok('§13 the FX that use a style are named, with the path each names', /Used in \d+ FX · every path under /.test(text('.lib-users')) && !!$('[data-act="lib-open-fx"]') && !!$('[data-act="lib-goto"]'), text('.lib-users').slice(0, 120));
      // one path, one spelling: a used line that IS a variant reads exactly as the viewer reads it
      const varLabels13 = [...$$('.lib-variant option')].map((o) => o.textContent.split(' · ')[0]);
      const useLabels13 = $$('.lib-users .use .v').map((b) => b.textContent.trim());
      ok('§13 a used line names its variant the way the viewer names it, no stray dots', useLabels13.every((l) => l === 'Default' || varLabels13.includes(l) || / · file \d+$/.test(l)) && !useLabels13.some((l) => /\w\.\w/.test(l)), `${useLabels13.join(' | ')}`);
      await click('[data-act="lib-switch"][data-lib="psfx"]');
      ok('§13 sounds are grouped by PSFX group, with one Play button and a psfx path', $$('.shelf .letter').length > 5 && $$('[data-act="lib-play"]').length === 1 && !$('[data-act="lib-map"]') && /^psfx\./.test(val('.lib-dbpath')), `${$$('.shelf .letter').length} groups · ${val('.lib-dbpath')}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'psfx.weapon-swooshes.light'));
      const goto13 = $$('[data-act="lib-goto"]').find((g) => /\.\d+$/.test(g.dataset.path)) ?? $$('[data-act="lib-goto"]')[0];
      const want13 = goto13?.dataset.path ?? "";
      await click(goto13);
      ok('§13 clicking a used line loads that exact path in the viewer, and marks the line', val('.lib-dbpath') === want13 && $('.use[data-now="true"] .v')?.dataset.path === want13, `${want13} → ${val('.lib-dbpath')}`);
      // the stepper stands on every playable thing, files included, and the caption agrees with it
      const optLabels13 = [...$$('.lib-variant option')].map((o) => o.textContent.trim());
      ok('§13 the stepper offers every stop, and its count matches what it lists', /· 1 of \d+/.test(optLabels13[0] ?? '') && Number((optLabels13[0] ?? '').match(/· \d+ of (\d+)/)?.[1]) === optLabels13.length, `${optLabels13.length} options · ${optLabels13[0]}`);
      const sel13 = [...$$('.lib-variant option')].find((o) => o.selected)?.textContent.trim() ?? '';
      ok('§13 the caption above names the very stop the dropdown is on, word for word', !!text('.stage .v') && sel13.startsWith(`${text('.stage .v')} · `), `caption "${text('.stage .v')}" vs option "${sel13}"`);
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
      // on the item, so the sheet knows which ABILITY is being asked about (Misty Step is on more
      // than one thing: a spell, and a feat that grants it), then the Editor on what answers it
      api.open({ item: misty });
      await sleep(450);
      await openEditorForSubject();
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
      ok('§13 editing Misty Step (Stock) says Save will ask: House override, or Stock', /House override/.test(text('.sheet .banner')) && !/Draft/.test(text('.sheet .banner')), text('.sheet .banner'));
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
        placement: 'rotate,anchor,elevation,zindex,mask,attach,spacer,spacer',
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
      ok('§13 the shape band is the shape\'s own knobs, and is named for it', cells('shape').join(',') === 'range,spot,jump,fade,speed,after,spacer,spacer' && /Move/.test(text('[data-act="sh-band"][data-band="shape"]')), cells('shape').join(','));
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
      ok('§13 the sheet is dropped, nothing saved', houseIds().length === before.length, `${houseIds().length}`);

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
      const buf14 = houseIds().length;
      await click($$('[data-act="sh-play-scene"]')[0]);
      await sleep(1200);
      const e14 = api.ledger[0];
      ok('§14 the row ▶ plays that one scene through the preview, and saves nothing', e14?.fx === 'preview' && e14.played && String(e14.id).startsWith('preview-') && houseIds().length === buf14, `${e14?.fx} · played ${e14?.played} · ${(e14?.files ?? []).join(', ').slice(0, 70)}`);
      await click('[data-act="sh-play"]');
      await sleep(1200);
      const e14b = api.ledger[0];
      ok('§14 ▶ Play all plays the whole FX, still saving nothing', e14b?.fx === 'misty-step' && String(e14b.id).startsWith('preview-') && houseIds().length === buf14, `${e14b?.fx} · played ${e14b?.played} · ${e14b?.why ?? ''}`);
      Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
      canvas.app.stage.removeAllListeners?.('pointerdown');
      app.sheet = null; app.view.tab = 'fx'; await app.render(); await sleep(200);
      // the two delays, on an FX the migration wrote with the hold's offset in `delay`. Stock:
      // `imperceptible-barrier`, which is what the 2024 PHB's Shield spell calls its effect — the
      // SRD spelled it "Shield" and the SRD is not evidence any more (DESIGN §17). Same three
      // scenes, same -500 on the first.
      api.open({ tab: 'editor', id: 'imperceptible-barrier' });
      await sleep(500);
      await pick(0); await band('timing');
      const held14 = app.sheet.scenes.map((x) => JSON.stringify({ delay: x.scene.delay, wait: x.scene.wait }));
      ok('§14 a hold whose offset was written as a delay is read as one thing: Hold next −500 ms, Wait before 0', $('.cw-hold')?.checked === true && $('.cw-holdms')?.value === '-500' && $('.cw-delay')?.value === '0' && held14[0] === '{"wait":-500}', held14.join(' · '));
      ok('§14 and it plays the same: the sentence no longer says "after −500 ms" about a hold', !/after -\d+ ms/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 150));
      app.sheet = null; app.view.tab = 'fx'; await app.render(); await sleep(200);
      // a blank sheet: Reach keeps its place with no item to pin to — and since step 7 it picks one
      api.open({ tab: 'editor' });
      await sleep(400);
      ok('§14 with no item to pin to, an unlocked Reach offers to choose one (step 7)', $$('.hookstrip .hcol').length === 4 && $('[data-act="sh-pick-item"]')?.disabled === false && $('[data-act="sh-pick-item"]')?.textContent.trim() === 'Item Hook' && ($('[data-act="sh-pick-item"]')?.dataset.tooltip ?? '').length > 20, text('.hookstrip .hcol:nth-child(2)').replace(/\s+/g, ' '));
      ok('§14 a blank sheet says so and offers no rail', !$('.rail .row') && /No scenes yet/.test(text('.inspector')), text('.inspector').replace(/\s+/g, ' ').slice(0, 80));
      // and locked, with no item and nothing to choose with, it greys where it stands with the reason (R1)
      const owned14 = new Set(app.entries.filter((e) => e.uuid).flatMap((e) => e.keys));
      const orphan14 = api.fx.list().find((e) => e.source === 'stock' && (e.fx.for ?? []).length && !(e.fx.for ?? []).some((k) => owned14.has(k)));
      api.open({ tab: 'editor', id: orphan14.fx.id });
      await sleep(400);
      ok('§14 locked, with no item at all, Reach greys in place with the reason, never dropped (R1)', $('.sheet')?.dataset.edit === 'false' && $$('.hookstrip .hcol').length === 4 && $('.hookstrip .pill[data-na="true"]')?.textContent.trim() === 'Item Hook' && ($('.hookstrip .pill[data-na="true"]')?.dataset.tooltip ?? '').length > 20, `${orphan14.fx.id} · ${text('.hookstrip .hcol:nth-child(2)').replace(/\s+/g, ' ')}`);
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
      ok('§10 the button opens the window on that item, on the FX tab, with the search carrying it', app?.rendered && tabNow() === 'fx' && app.view.fxSel === 'misty-step' && $('.fx-q')?.value === 'Misty Step', `${app.view.fxSel} | box "${$('.fx-q')?.value}"`);
      await sheet.close();
    } catch (err) {
      results.push({ name: 'THROW', pass: false, detail: String(err.stack ?? err).slice(0, 600) });
    } finally {
      for (const id of made) if (api.fx.get(id)?.source === 'house') await api.corpus.erase(id).catch(() => null);
      let restored = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) { restored = false; await writeFile(p, snapshot[p]).catch(() => null); }
      if (!restored) await api.corpus.reload().catch(() => null);
      if (tmp) await tmp.delete().catch(() => null);
      try { await app?.close(); } catch { /* fine */ }
    }
    const after = houseIds();
    results.push({ name: '§11 House is as it was', pass: JSON.stringify(after) === JSON.stringify(before), detail: `${before.length} → ${after.length}` });
    return { results };
  }, { fx: fixture });
  report('screens', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[screens] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
