// The screens, live on the sandbox: a person's round trip through the window, driven on the DOM —
// a search that finds no FX and its door to the Editor; the landing's three doors (Blank, a starter
// used whole, Copy from); the inline Add a scene; the drawer picking a picture into one scene; the
// one-column inspector; Save (which WRITES house.json on the sandbox); the Library's list; a Stock FX
// edited as a House override and as Stock; Own key on an actor's item and on a sidebar item; an event
// FX and the nine moment words; Coverage and its doors; the Asset Library as a browser; the drawer
// keeping a random set, a triple and a stretch; Play on every scene and Play all; the window at 1,080
// and 780px with no sideways scroll, and its sticky bands; the item sheet's wand. The Delete dialog
// is a real DialogV2 driven to its answer; a greyed control is hovered with a real mouse. Builds and
// tears down its own fixture; leaves the module's files as it found them, byte for byte.
//
//   node tools/smoke-screens.mjs
import { connectSandbox } from './lib/foundry.mjs';
import { fixtureDown, fixtureUp, report } from './lib/suite.mjs';

/**
 * The greyed reasons under a real mouse (the client's Playwright page): Foundry's tooltip fires on
 * pointerenter through hit-testing, which no event the page dispatches on itself can prove. Each
 * hover opens the window at a state from inside the page, moves the mouse from outside it, and reads
 * the tooltip back.
 */
async function hoverChecks(f) {
  const results = [];
  const page = f.page;
  if (!page?.mouse) { results.push({ name: '§15 a real hover over a greyed control shows its reason', pass: false, detail: 'the client exposes no mouse' }); return results; }
  const read = () => f.evaluate(() => ({ active: !!game.tooltip.tooltip?.classList.contains('active'), text: (game.tooltip.tooltip?.textContent ?? '').trim() }), null);
  const hover = async (name, where, want) => {
    const at = await f.evaluate(where, null);
    if (!at) { results.push({ name, pass: false, detail: 'nothing to hover' }); return; }
    await page.mouse.move(2, 2);
    await page.waitForTimeout(150);
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(900); // TooltipManager.TOOLTIP_ACTIVATION_MS is 500
    const tip = await read();
    results.push({ name, pass: tip.active && want.test(tip.text), detail: `${tip.active ? 'tooltip on' : 'no tooltip'} · "${tip.text.slice(0, 90)}"${tip.active ? '' : ` · pointer over ${at.tag}`}` });
  };
  const centre = (sel) => `const app = game.modules.get('fvtt-mod-fxstudio').api.open({}); const el = app.element.querySelector('${sel}'); const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: el.tagName + '.' + el.className } : null;`;
  await f.evaluate(async () => { const app = game.modules.get('fvtt-mod-fxstudio').api.open({}); app.view.fxSel = null; app.view.fxSelSource = null; app.view.tab = 'fx'; await app.render({ force: true }); await new Promise((r) => setTimeout(r, 400)); }, null);
  await hover('§15 a real hover over the greyed Export button shows its reason (R1: greyed where it stands, with the reason)', new Function(centre('.fxsearch button.export[data-na="true"]')), /Mark an FX to export it/);
  await f.evaluate(async () => { canvas.tokens.releaseAll(); const api = game.modules.get('fvtt-mod-fxstudio').api; api.open({ tab: 'editor', id: 'misty-step' }); await new Promise((r) => setTimeout(r, 500)); }, null);
  await hover('§15 a real hover over the greyed ▶ Play all shows why it cannot play', new Function(centre('[data-act="sh-play-all"]:disabled')), /select a token/);
  await page.mouse.move(2, 2);
  await f.evaluate(async () => { const app = game.modules.get('fvtt-mod-fxstudio').api.open({}); app.sheet = null; await app.close(); }, null);
  return results;
}

const { f, dispose } = await connectSandbox({ tag: 'screens', watchdogMs: 900_000 });
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
    let worldItem = null;
    let app = null;
    const errors = [];
    const onError = (e) => errors.push(String(e.message ?? e.reason ?? e));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);
    const $ = (sel) => app.element.querySelector(sel);
    const $$ = (sel) => [...app.element.querySelectorAll(sel)];
    const click = async (sel) => { const el = typeof sel === 'string' ? $(sel) : sel; if (!el) throw new Error(`nothing to click for ${sel}`); el.click(); await sleep(300); };
    const type = async (sel, value) => { const el = typeof sel === 'string' ? $(sel) : sel; el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(150); };
    const choose = async (sel, value) => { const el = typeof sel === 'string' ? $(sel) : sel; el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); };
    const flip = async (sel, on) => { const el = typeof sel === 'string' ? $(sel) : sel; el.checked = on; el.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); };
    const enter = async (sel) => { $(sel).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(350); };
    const text = (sel) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const val = (sel) => ($(sel)?.value ?? '').trim();
    const paneNow = () => $('.pane[data-active="true"]')?.dataset.pane ?? '';
    const tabNow = () => $('[role=tab][aria-selected="true"]')?.dataset.tab ?? '';
    const pick = async (n) => click($$('.rail .pickbtn')[n]);
    const clickFxRow = async (id) => { const b = $(`.fxlist .pickbtn[data-id="${id}"]`); if (!b) throw new Error(`no FX row for ${id}`); return click(b); };
    const openEditor = async (id, edit = false) => { app = api.open({ tab: 'editor', id, edit }); await sleep(450); };
    const unlock = async () => { if (!$('.sh-edit').checked) await flip('.sh-edit', true); };
    // a group of the inspector, opened when it is not (a disclosure remembered per sheet)
    const group = async (g) => { const d = $(`.inspector .grp[data-group="${g}"]`); if (d && !d.open) await click(`[data-act="sh-group"][data-group="${g}"]`); return $(`.inspector .grp[data-group="${g}"]`); };
    const groups = () => $$('.inspector .grp').map((d) => d.dataset.group);
    const cellsOf = (g) => [...($(`.inspector .grp[data-group="${g}"]`)?.querySelectorAll('.cells > .f') ?? [])].map((x) => x.className.replace('f f-', ''));
    // a confirm answered for the window, its config kept so its words can be read
    const sayYes = async (fn) => { const D = foundry.applications.api.DialogV2; const was = D.confirm; let seen = null; D.confirm = async (cfg) => { seen = cfg; return true; }; try { await fn(); await sleep(700); } finally { D.confirm = was; } return seen; };
    const sayPrompt = async (fn, answer) => { const D = foundry.applications.api.DialogV2; const was = D.prompt; D.prompt = async () => answer; try { await fn(); await sleep(700); } finally { D.prompt = was; } };
    const answerSave = async (choice, fn) => { const D = foundry.applications.api.DialogV2; const was = D.wait; let asked = false; D.wait = async () => { asked = true; return choice; }; try { await fn(); if (choice === 'cancel') await sleep(400); else await until(() => $('.sheet')?.dataset.edit === 'false'); } finally { D.wait = was; } return asked; };
    // Save uploads a file and reads the corpora again, Delete likewise: wait for the fact, never a clock
    const until = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch { /* not yet */ } await sleep(100); } return false; };
    const readFile = async (p) => (await fetch(`modules/${MOD}/${p}?t=${Date.now()}`, { cache: 'no-store' })).text();
    const writeFile = async (p, textValue) => { const FP = foundry.applications.apps.FilePicker.implementation; const parts = p.split('/'); const name = parts.pop(); return FP.upload('data', [`modules/${MOD}`, ...parts].join('/'), new File([textValue], name, { type: 'application/json' }), {}, { notify: false }); };
    const FILES = ['recipes/house.json', 'recipes/stock/spells.json', 'recipes/stock/events.json'];
    const snapshot = {};
    for (const p of FILES) snapshot[p] = await readFile(p);
    const dialogs = () => [...foundry.applications.instances.values()].filter((w) => w instanceof foundry.applications.api.DialogV2);
    const underTab = () => { const t = $('[data-tab="fx"]'); const r = t.getBoundingClientRect(); return [t, document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)]; };
    try {
      // 1 · the window opens on an item and reads its sentence
      const misty = caster.actor.items.getName('Misty Step');
      app = api.open({ item: misty });
      await sleep(600);
      ok('§1 the window opens with four tabs: Library · Editor · Assets · Coverage', app?.rendered && $$('[role=tab]').map((t) => t.textContent).join('|') === 'Library|Editor|Assets|Coverage', $$('[role=tab]').map((t) => t.textContent).join(', '));
      ok('§1 the search belongs to the Library tab alone, one box with no dropdown', !!$('.pane[data-pane="fx"] .fxsearch .fx-q') && $$('.fx-q').length === 1 && !$('.fxsearch .suggest') && $('.fx-q')?.placeholder === 'Search for an FX…', $('.fx-q')?.placeholder ?? 'no box');
      ok('§1 opening the API on an item lands on the Library with the FX that answers it marked', tabNow() === 'fx' && app.view.fxSel === 'misty-step' && $('.fx-q')?.value === 'Misty Step' && /Misty Step/.test($('.fxlist .row[data-now="true"]')?.textContent ?? ''), `${app.view.fxSel} · ${text('.fxlist .row[data-now="true"]')}`);
      await click('[data-tab="editor"]');
      ok('§1 the Editor tab opens with no FX and says every FX is edited there', tabNow() === 'editor' && !$('.sheet') && /Every FX is edited here/.test(text('.pane[data-pane="editor"] .card')) && !!$('[data-act="sh-new"]'), text('.pane[data-pane="editor"] .card').slice(0, 110));
      await click('[data-tab="fx"]');

      // 2 · a spell the corpus has never heard of: the search finds no FX, and its miss is a door (§28.1)
      [tmp] = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con', activities: { dnd5eactivity000: { type: 'utility', _id: 'dnd5eactivity000' } } } }]);
      await sleep(200);
      app.refresh();
      await type('.fx-q', 'Sharran');
      await sleep(450);
      ok('§2 it plays nothing yet: the list has no FX row for it', api.sentenceFor(tmp, 'use').sentence === 'Nothing plays.' && !$$('.fxlist .row').length && /^0 of \d+ FX$/.test(text('.fxlist .listhead')), `${api.sentenceFor(tmp, 'use').sentence} | ${text('.fxlist .listhead')}`);
      const miss2 = $$('.misses .missrow').find((b) => b.dataset.uuid === tmp.uuid);
      ok('§2 the search miss says No match and lists the ability on this world\'s actor that plays nothing, as a door (§28.1)', /^No match\./.test(text('.misses .note')) && !!miss2 && miss2.dataset.act === 'entry' && miss2.dataset.create === '1' && /FX Test Caster · Spell · plays nothing/.test(miss2.textContent), `${text('.misses .note')} · ${miss2?.textContent.replace(/\s+/g, ' ')}`);
      await click(miss2);
      ok('§2 the door lands on the Editor, open on the ability, unlocked, knowing the item: "Nothing plays for Sharran Step"', tabNow() === 'editor' && $('.sheet')?.dataset.edit === 'true' && /Nothing plays for Sharran Step\./.test(text('.nothing .big')) && app.sheet.subject?.uuid === tmp.uuid && /Opened from a Library search/.test(text('.nothing')) && /spell:sharran-step/.test(text('.nothing')), `${text('.nothing .big')} · ${text('.nothing p.note')}`);
      ok('§2 the landing offers three doors: Starter, Copy from, Blank', $$('.nothing .three button').map((b) => b.querySelector('b').textContent).join(',') === 'Starter,Copy from,Blank' && !$('.rail'), $$('.nothing .three b').map((b) => b.textContent).join(','));
      ok('§2 the gap table knows nothing of the fixture\'s key, so the landing says nothing of it', !$('.nothing .judged') && (api.proposals?.get?.('spell:sharran-step') ?? null) === null, String(api.proposals?.get?.('spell:sharran-step')));

      // 3 · Blank: the sheet opens on + Add a scene, a menu in place (never a dialog, §28.9)
      await click('[data-act="sh-blank"]');
      const cards3 = $$('.addmenu [data-shape]');
      const spill3 = cards3.filter((c) => { const r = c.getBoundingClientRect(); return [...c.children].some((k) => { const q = k.getBoundingClientRect(); return q.bottom > r.bottom + 1 || q.right > r.right + 1; }); });
      ok('§3 Blank opens the sheet with the eight shapes in place under the rail, each holding its help line, and no dialog', !$('.nothing') && cards3.length === 8 && cards3.every((c) => (c.querySelector('span')?.textContent.length ?? 0) > 20) && !spill3.length && dialogs().length === 0 && $('.addrow')?.getAttribute('aria-expanded') === 'true', `${cards3.length} shapes · ${spill3.length} spill · ${dialogs().length} dialogs`);
      cards3.find((c) => c.dataset.shape === 'mark').click();
      await sleep(30);
      const [tab3, under3] = underTab();
      ok('§3 picking a shape adds one scene of it and closes the menu; 30 ms later the tab strip is under the pointer', app.sheet.scenes.length === 1 && app.sheet.scenes[0].scene.shape === 'mark' && !$('.addmenu') && under3 === tab3, `${app.sheet.scenes.length} scene(s) · under the tab: ${under3?.tagName}`);
      await click(tab3);
      ok('§3 and that click lands: the Library tab is up', tabNow() === 'fx', tabNow());
      await click('[data-tab="editor"]');
      await click('[data-act="cw-drop"]');
      ok('§3 an empty sequence says so and offers Copy from in the inspector', !$('.rail .row') && /No scenes yet/.test(text('.inspector')) && !!$('.inspector .sh-like'), text('.inspector').slice(0, 80));
      await type('.sh-like', 'misty step');
      const like = $$('.inspector .suggest .hit').find((h) => h.dataset.id === 'misty-step');
      ok('§3 Copy from offers the Misty Step FX (and never a starter: those are the landing\'s Starter door)', !!like && !$$('.inspector .suggest .hit').some((h) => h.dataset.id.startsWith('starter:')), $$('.inspector .suggest .hit').map((h) => h.dataset.id).join(', '));
      await click(like);
      const rail = () => $$('.rail .row');
      ok('§3 the rail holds Misty Step\'s scenes, numbered and striped by kind: VFX, VFX, Move', rail().length === 3 && rail().map((r) => r.querySelector('.num').textContent).join('') === '123' && rail().map((r) => r.dataset.kind).join(',') === 'vfx,vfx,move', rail().map((r) => r.dataset.kind).join(','));
      ok('§3 every rail row, the Move\'s too, carries its own ▶ (§27)', rail().every((r) => !!r.querySelector('[data-act="sh-play-scene"]')), `${$$('.rail [data-act="sh-play-scene"]').length} ▶`);
      // the inspector: one column, the shape's own group first and open, the rest collapsed (§28.4)
      ok('§3 the inspector is one column of groups: the Mark\'s own first and open, then Picture, Timing, Sound, Placement, collapsed', groups().join(',') === 'shape,picture,timing,sound,placement' && $('.inspector .grp[data-group="shape"]').open && ['picture', 'timing', 'sound', 'placement'].every((g) => !$(`.inspector .grp[data-group="${g}"]`).open) && /MARK/i.test(text('.inspector .grp[data-group="shape"] summary')), groups().join(','));
      await group('picture');
      ok('§3 the VFX cell is the SFX cell\'s twin: the picture\'s name, a link, Browse beside it, no ✕, and no video or image on the sheet (§27)', /JB2A misty step 01/i.test(text('.inspector .f-vfx [data-act="cw-show"]')) && !!$('.inspector .f-vfx [data-act="cw-browse"]') && !$('.inspector .f-vfx [aria-label^="No"]') && !$('.sheet video, .sheet img'), text('.inspector .f-vfx'));
      ok('§3 Colour appears because the family lists more than one colour, as a select of them', $('.cw-colour')?.tagName === 'SELECT' && $('.cw-colour').options.length > 1, `${$('.cw-colour')?.options.length ?? 0} colours`);
      // the drawer: Browse opens it under the cell; a pick writes into this scene and no other (§28.3)
      const scene2Before = JSON.stringify(app.sheet.scenes[1].scene.asset);
      const blacken = async (n) => {
        await pick(n);
        await group('picture');
        await click('.inspector [data-act="cw-browse"][data-slot="asset"]');
        const sel = $('.drawer [data-field="dr-step"]');
        const now = sel ? sel.options[sel.selectedIndex].textContent.trim().split(' ')[0] : '';
        const opt = sel ? [...sel.options].find((o) => o.textContent.trim().startsWith(now) && /dark black/i.test(o.textContent)) : null;
        if (opt) await choose(sel, opt.value);
        await click('.drawer [data-act="dr-use"]');
      };
      await pick(0); await group('picture');
      await click('.inspector [data-act="cw-browse"][data-slot="asset"]');
      const drawer3 = $('.inspector .grp[data-group="picture"] .drawer');
      ok('§3 Browse opens a drawer under the cell, inside the inspector: a search, the families, the stepper, and Use for this scene', !!drawer3 && drawer3.previousElementSibling?.classList.contains('f-vfx') && !!drawer3.querySelector('.dr-q') && drawer3.querySelectorAll('.hit').length >= 1 && !!drawer3.querySelector('[data-field="dr-step"]') && /Use in scene 1/.test(drawer3.querySelector('[data-act="dr-use"]')?.textContent ?? '') && paneNow() === 'editor', drawer3 ? drawer3.textContent.replace(/\s+/g, ' ').slice(0, 120) : 'no drawer');
      ok('§3 the drawer opens on what the scene names', /^jb2a\.misty_step\.01\.yellow$/.test(text('.drawer .dpath')), text('.drawer .dpath'));
      await type('.drawer .dr-q', 'ground crack');
      await sleep(300);
      ok('§3 its search finds families by the full library path too (api.assets.search), not by name alone', $$('.drawer .hit').some((h) => h.dataset.id === 'jb2a.impact'), $$('.drawer .hit').map((h) => h.dataset.id).slice(0, 6).join(', '));
      await click('.drawer [data-act="dr-close"]');
      await blacken(0);
      ok('§3 a pick in the drawer writes into scene 1, and scene 2 is not touched', /dark_black/.test(JSON.stringify(app.sheet.scenes[0].scene.asset)) && JSON.stringify(app.sheet.scenes[1].scene.asset) === scene2Before && !$('.drawer'), `${JSON.stringify(app.sheet.scenes[0].scene.asset)} · scene 2 ${JSON.stringify(app.sheet.scenes[1].scene.asset)}`);
      await blacken(1);
      ok('§3 the cell names the dark black picture, and the draft reads back as the sentence before anything is saved', /dark black/.test(text('.inspector .f-vfx')) && /dark black/.test(text('.sheet .preview')) && /Sharran Step · when used/.test(text('.sheet .preview')) && !/yellow/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 160));
      // the render model: a knob keeps its focus and its caret through the repaint it causes
      await pick(1); await group('timing');
      const delay3 = $('[data-field="delay"]');
      delay3.focus();
      await choose(delay3, '750');
      ok('§3 a knob change repaints the sentence and the rail in place, and the box keeps the focus (the same node)', document.activeElement === delay3 && delay3.isConnected && delay3.value === '750' && /after 750 ms/.test(text('.sheet .preview')) && /after 750 ms/.test(text('.inspector .line')), `focus kept ${document.activeElement === delay3} · ${text('.inspector .line')}`);
      ok('§3 the Timing group names the two delays apart: Wait before and Hold next', /Wait before/.test(text('.inspector .f-delay .l')) && /Hold next/.test(text('.inspector .f-hold .l')), `${text('.inspector .f-delay .l')} · ${text('.inspector .f-hold .l')}`);
      await choose('[data-field="delay"]', '500');
      await pick(0); await group('timing');
      await flip('[data-field="hold"]', true);
      ok('§3 Hold next on scene 1 turns the sentence\'s "and" into "then"', /, then a mark/.test(text('.sheet .preview')) && $('[data-field="holdms"]')?.disabled === false, text('.sheet .preview').slice(0, 160));
      await flip('[data-field="hold"]', false);
      ok('§3 a cell that means nothing yet is dim with its reason in words beside it: Every while Times is 1', $('.inspector .f-every')?.dataset.dim === 'true' && /means nothing while Times is 1/.test(text('.inspector .f-every .dimwhy')) && $('[data-field="every"]').disabled === true, text('.inspector .f-every'));
      await click('[data-act="cw-add-ask"]');
      await click('.addmenu [data-shape="mark"]');
      await group('timing');
      ok('§3 … and Hold next on the last scene is dim, saying nothing follows it; on scene 1 it is live', app.sheet.pick === 3 && $('.inspector .f-hold')?.dataset.dim === 'true' && /nothing follows this scene/.test(text('.inspector .f-hold .dimwhy')), text('.inspector .f-hold'));
      await click('[data-act="cw-drop"]');
      await pick(0);
      await click('[data-act="cw-down"]');
      await pick(0);
      ok('§3 the arrows reorder: scene 1 moved down', /misty step 02/.test(text('.inspector .line')), text('.inspector .line'));
      await pick(1);
      await click('[data-act="cw-up"]');
      ok('§3 and back up, and the inspector follows the scene it moved', /misty step 01/.test(text('.inspector .line')) && $('.rail .pickbtn')?.getAttribute('aria-current') === 'true', text('.inspector .line'));
      ok('§3 nothing has been saved yet', houseIds().length === before.length, `${houseIds().length}`);

      // 4 · the Key strip and Save
      ok('§4 the Key strip is one row of four: Answers · Item · Moment · State', $$('.hookstrip .hcol').length === 4 && $$('.hookstrip .lbl').map((l) => l.textContent).join(' · ') === 'Answers · Item · Moment · State' && $('[data-act="sh-on"][aria-pressed="true"]')?.dataset.on === 'use' && $('[data-act="sh-off"][aria-pressed="true"]')?.dataset.v === 'false', $$('.hookstrip .lbl').map((l) => l.textContent).join(' · '));
      ok('§4 the Item column names the item the sheet came from and offers Own key, its words on the screen', /FX Test Caster · Sharran Step/.test(text('.hookstrip [data-act="sh-pick-item"]')) && $('[data-act="sh-own-key"]')?.disabled === false && /Own key gives FX Test Caster's Sharran Step a key of its own/.test(text('.hookstrip .hcol:nth-child(2) .why')), text('.hookstrip .hcol:nth-child(2)'));
      ok('§4 Answers is one pill, the key under it, and what the key is said on the screen, not on hover (§28.9)', $$('.hookstrip .pill.key').length === 1 && text('.hookstrip .keyline code.key') === 'spell:sharran-step' && /this world's own item/.test(text('.hookstrip .keyline')) && /Only an item with that identifier plays this FX/.test(text('.hookstrip .hcol.wide .why')) && !$('.hookstrip .pill.key')?.dataset.tooltip, `${text('.hookstrip .keyline')} · ${text('.hookstrip .hcol.wide .why')}`);
      await type('.sh-key-q', 'Misty Step'); await enter('.sh-key-q');
      ok('§4 choosing another ability replaces the key: one pill, Misty Step, and every copy answers it', $$('.hookstrip .pill.key').length === 1 && text('.hookstrip .keyline code.key') === 'spell:misty-step' && /every copy answers it/.test(text('.hookstrip .keyline')) && /Every copy of Misty Step carries it/.test(text('.hookstrip .hcol.wide .why')), text('.hookstrip .hcol.wide'));
      ok('§4 keyed to an ability that already has a Stock FX, the sheet takes that FX\'s id and the banner says so', text('.sheet code.id') === 'misty-step' && /already has an FX in Stock/.test(text('.sheet .banner')) && /Save asks/.test(text('.sheet .banner')), `${text('.sheet code.id')} · ${text('.sheet .banner')}`);
      await type('.sh-key-q', 'Sharran Step'); await enter('.sh-key-q');
      ok('§4 … and keyed back, no banner and its own id', text('.sheet code.id') === 'sharran-step' && !$('.sheet .banner'), `${text('.sheet code.id')} · ${text('.sheet .banner')}`);
      const unheld = Object.entries(api.records.map() ?? {}).find(([k, r]) => k.startsWith('spell:') && !api.fx.for(k).length && !app.entries.some((e) => e.keys.includes(k)) && r.name.length > 6);
      await type('.sh-key-q', unheld[1].name);
      await sleep(300);
      const recHit = $$('.sh-key-search .hit[data-act="sh-key-rec"]').find((h) => h.dataset.key === unheld[0]);
      ok('§4 a book ability on no sheet is offered from the records, by its record\'s name and book', !!recHit && new RegExp(unheld[1].where.split(' · ')[0]).test(recHit.textContent), `${unheld[0]} · ${recHit?.textContent.replace(/\s+/g, ' ')}`);
      await click(recHit);
      ok('§4 picking it keys the sheet to that record\'s identifier, the record named', text('.hookstrip .keyline code.key') === unheld[0] && text('.sheet h2').includes(unheld[1].name), `${text('.hookstrip .keyline')} · ${text('.sheet h2')}`);
      await type('.sh-key-q', 'maneuver');
      await sleep(300);
      const ev4 = $$('.sh-key-search .hit[data-act="sh-key-rec"]').find((h) => h.dataset.key === 'event:maneuver');
      ok('§4 the Answers box offers By the Books\' words as events, and not dnd5e\'s two, which are never heard as events (§28.2)', !!ev4 && /an event: every ability when its maneuver die rides/.test(ev4.textContent), ev4?.textContent.replace(/\s+/g, ' ') ?? 'no event hit');
      await type('.sh-key-q', 'event');
      await sleep(300);
      const evs4 = $$('.sh-key-search .hit').map((h) => h.dataset.key ?? h.dataset.keys ?? '').filter((k) => k.startsWith('event:'));
      ok('§4 "event" lists the seven words a GM may answer as events', ['maneuver', 'sneak', 'fold', 'rider', 'hold-answered', 'summon', 'unsummon'].every((w) => evs4.includes(`event:${w}`)) && !evs4.includes('event:use') && !evs4.includes('event:effect'), evs4.join(', '));
      await type('.sh-key-q', 'Sharran Step'); await enter('.sh-key-q');
      ok('§4 the bar is static: every control is there, greyed where the mode does not offer it', $$('.lockbar button').length === 7 && $('[data-act="sh-dup"]')?.disabled === true && $('[data-act="sh-export"]')?.disabled === true && $('[data-act="sh-delete"]')?.disabled === true && $('[data-act="sh-cancel"]')?.disabled === false, $$('.lockbar button').map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')).join(', '));
      ok('§4 Save is enabled now the sequence has scenes', $('[data-act="sh-save"]')?.disabled === false && !$('.sheet .problem'), text('.sheet .problem'));
      await click('[data-act="sh-save"]');
      await until(() => api.fx.get('sharran-step') && $('.sheet')?.dataset.edit === 'false');
      const saved = api.fx.get('sharran-step')?.original;
      if (saved) made.push(saved.id);
      const house4 = JSON.parse(await readFile('recipes/house.json'));
      ok('§4 Save writes the FX into house.json on the server with its scenes and provenance, no dialog for a new FX', saved && saved.scenes?.length === 3 && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at) && /copied from Misty Step/.test(saved.note) && house4.fx.some((l) => l.id === 'sharran-step') && saved.like === undefined && saved.with === undefined, JSON.stringify(saved ?? null).slice(0, 300));
      ok('§4 the sheet stays open, locked, tagged House, with the sentence', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'false' && /House/.test(text('.sheet h2')) && /dark black/.test(text('.sheet .preview')), text('.sheet h2'));
      ok('§4 locked: the knobs are read-only, the tools and Add are gone, the same bar with Save and Cancel greyed', $$('.inspector select, .inspector input').every((x) => x.disabled) && !$('[data-act="cw-drop"]') && !$('.addrow') && $$('.lockbar button').length === 7 && $('[data-act="sh-save"]')?.disabled === true && $('[data-act="sh-dup"]')?.disabled === false, '');
      ok('§4 locked, the Moment shows its pressed word alone, with its phrase', $$('.hookstrip .moments .pill').filter((p) => getComputedStyle(p).display !== 'none').map((p) => p.dataset.on).join(',') === 'use' && text('.hookstrip .phrase') === 'when used', text('.hookstrip .moments'));
      const r4 = api.sentenceFor(tmp);
      ok('§4 the spell resolves to it from House, and the API reads the sentence the sheet shows', api.resolve(tmp).fx?.id === 'sharran-step' && text('.sheet .preview') === `What plays${r4.sentence}`, `${r4.sentence} | ${text('.sheet .preview')}`);
      await click('[data-act="sh-back"]');
      ok('§4 Back returns to where the sheet was opened from: the Library, on the FX it wrote', tabNow() === 'fx' && app.view.fxSel === 'sharran-step', `${tabNow()} · ${app.view.fxSel}`);
      await click('[data-tab="editor"]');
      ok('§4 the Editor tab still holds the FX: leaving a tab does not close it', tabNow() === 'editor' && text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      await click('[data-tab="fx"]');

      // 5 · the Library: one list of every FX, grouped House → Stock
      await type('.fx-q', '');
      await sleep(450);
      const rows5 = () => $$('.fxlist .row');
      const groups5 = () => $$('.fxlist .grouphead').map((g) => g.textContent.replace(/\s+/g, ' ').trim());
      ok('§5 the list is grouped in resolution order: House, then Stock', groups5().map((g) => g.split(' ')[0]).join(',') === 'House,Stock' && groups5()[0] === `House · ${api.corpora.house.length} FX`, groups5().join(' | '));
      const names5 = rows5().map((r) => r.querySelector('.n')?.textContent.trim());
      const twice5 = new Set(names5.filter((n, i) => names5.indexOf(n) !== i));
      ok('§5 a row is the name, and a book under it only where two records share the name', rows5().every((r) => r.querySelectorAll('.n').length === 1 && !r.querySelector('.s, .tag, .shapes')) && rows5().every((r) => !r.querySelector('.bk') || twice5.has(r.querySelector('.n').textContent.trim())), `${rows5().filter((r) => r.querySelector('.bk')).length} rows with a book`);
      app.view.fxSel = null; app.view.fxSelSource = null; app.paint(); await sleep(200);
      const imp5 = $('.fxsearch button.import');
      const exp5 = $('.fxsearch button.export');
      const box5b = $('.fxsearch input').getBoundingClientRect();
      ok('§5 Import and Export sit at the top left of the search row, as tall as the box', imp5.getBoundingClientRect().left < exp5.getBoundingClientRect().left && exp5.getBoundingClientRect().right <= box5b.left && Math.abs(exp5.getBoundingClientRect().height - box5b.height) <= 1, `import ${Math.round(imp5.getBoundingClientRect().left)} · box ${Math.round(box5b.left)}`);
      ok('§5 Export is greyed where it stands with its reason until a row is marked (R1)', exp5?.disabled === true && exp5?.dataset.na === 'true' && /Mark an FX/.test(exp5?.dataset.tooltip ?? ''), exp5?.dataset.tooltip ?? '');
      const geom5 = () => rows5().slice(0, 12).map((r) => { const b = r.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }).join(',');
      const was5 = geom5();
      const row5 = rows5().slice(0, 12).find((r) => r.querySelector('.pickbtn').dataset.id !== app.sheet?.id);
      const id5 = row5.querySelector('.pickbtn').dataset.id;
      await click(row5.querySelector('.pickbtn'));
      ok('§5 clicking a row only marks it: the tab does not move, nothing opens, the layout is unmoved (R3)', tabNow() === 'fx' && app.view.fxSel === id5 && app.sheet?.id !== id5 && geom5() === was5 && $('.fxlist .row[data-now="true"]') === row5, `${tabNow()} · ${id5}`);
      ok('§5 marking a row wakes Export in place, naming the row', $('.fxsearch button.export') === exp5 && exp5.disabled === false && (exp5.dataset.tooltip ?? '').includes(row5.querySelector('.n').textContent.trim()), exp5.dataset.tooltip ?? '');
      ok('§5 every row carries Record, then Delete, then Editor', rows5().every((r) => [...r.querySelector('.acts').children].map((x) => x.textContent.trim()).join(',') === 'Record,Delete,Editor'), `${rows5().length} rows`);
      const scroller5 = $('.fxlist .rows');
      scroller5.scrollTop = 400;
      await sleep(150);
      const deep5 = rows5().find((r) => r.getBoundingClientRect().top > scroller5.getBoundingClientRect().top + 50);
      await click(deep5.querySelector('.pickbtn'));
      ok('§5 marking a row keeps the list exactly where it was scrolled to', $('.fxlist .rows') === scroller5 && Math.round(scroller5.scrollTop) === 400 && deep5.dataset.now === 'true', `scrollTop ${Math.round(scroller5.scrollTop)}`);
      await click('[data-group="kinds"][data-v="spell"]');
      ok('§5 a facet repaints the list in place: the same scroller, the facet pressed', $('.fxlist .rows') === scroller5 && $('[data-group="kinds"][data-v="spell"]')?.getAttribute('aria-pressed') === 'true', `same node ${$('.fxlist .rows') === scroller5}`);
      await click('[data-act="fx-clear"]');
      const deepId5 = deep5.querySelector('.pickbtn').dataset.id;
      app.view.fxSel = deepId5; app.paint(); await sleep(150);
      await click($(`.fxlist .pickbtn[data-id="${deepId5}"]`).closest('.row').querySelector('[data-act="fx-editor"]'));
      ok('§5 the Editor link opens the row\'s FX in the Editor', tabNow() === 'editor' && text('.sheet code.id') === deepId5, `${deepId5} → ${text('.sheet code.id')}`);
      await click('[data-tab="fx"]');
      const other5 = rows5().find((r) => r.querySelector('.pickbtn').dataset.id !== deepId5);
      const otherId5 = other5.querySelector('.pickbtn').dataset.id;
      other5.querySelector('.pickbtn').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await sleep(500);
      ok('§5 double-clicking a row is the same door', tabNow() === 'editor' && text('.sheet code.id') === otherId5, `${otherId5} → ${text('.sheet code.id')}`);
      await click('[data-tab="fx"]');
      $('.fxlist .rows').scrollTop = 0;
      const content5 = app.element.querySelector('.fxstudio-content');
      ok('§5 one scroll region on the screen: the rows, and nothing sideways (R4, R5)', getComputedStyle($('.fxlist .rows')).overflowY === 'auto' && content5.scrollWidth <= content5.clientWidth + 1, `${content5.scrollWidth} vs ${content5.clientWidth}`);
      ok('§5 three facet groups, and Kind lists the seven authored kinds, Events among them (§28.2)', $$('.facets .sub').map((x) => x.textContent).join(' · ') === 'Lives in · Kind · Only' && $$('.facets [data-group="kinds"]').length === 7 && Number($('[data-group="kinds"][data-v="event"] .c')?.textContent) >= 2, `${$$('.facets [data-group="kinds"]').map((b) => b.textContent.replace(/\s+/g, ' ')).join(', ')}`);
      const live5 = $$('.facets [data-group="lives"]');
      ok('§5 Lives in counts House and Stock, and they add up to the corpus', live5.reduce((t, b) => t + Number(b.querySelector('.c').textContent), 0) === api.fx.list().length, live5.map((b) => b.textContent.replace(/\s+/g, ' ')).join(', '));
      const all5 = rows5().length;
      await click('[data-group="lives"][data-v="house"]');
      await click('[data-group="kinds"][data-v="spell"]');
      ok('§5 the facets stack, and Clear counts what is on', groups5().length === 1 && /^House · /.test(groups5()[0]) && /Clear · 2/.test(text('[data-act="fx-clear"]')), `${text('[data-act="fx-clear"]')} · ${rows5().length} rows`);
      await click('[data-act="fx-clear"]');
      ok('§5 Clear puts every FX back', rows5().length === all5, `${rows5().length} rows`);
      const box5 = $('.fx-q');
      await type('.fx-q', 'sharran');
      await sleep(450);
      ok('§5 the search narrows the list in place, and the box keeps what is typed', rows5().length === 1 && /Sharran Step/.test(rows5()[0].textContent) && $('.fx-q') === box5 && $('.fx-q').value === 'sharran', `${rows5().length} rows`);
      await type('.fx-q', 'misty');
      await sleep(450);
      const misty5 = rows5().filter((r) => r.querySelector('.n').textContent.trim() === 'Misty Step');
      ok('§5 two records named Misty Step show their book under each row, the name unchanged (§28.9)', misty5.length >= 2 && misty5.some((r) => /Player's Handbook · Spells/.test(r.querySelector('.bk')?.textContent ?? '')) && misty5.some((r) => /Monster Manual/.test(r.querySelector('.bk')?.textContent ?? '')), misty5.map((r) => r.querySelector('.pickbtn').textContent.replace(/\s+/g, ' ')).join(' | '));
      await type('.fx-q', 'fire bolt');
      await sleep(450);
      const rec5 = rows5().map((r) => r.querySelector('[data-act="fx-record"]')).find(Boolean);
      ok('§5 a Stock row carries the Record it was keyed against, named with its book', !!rec5 && /^Compendium\./.test(rec5.dataset.uuid ?? '') && /Player's Handbook/.test(rec5.dataset.tooltip ?? ''), `${rec5?.dataset.uuid}`);
      await click(rec5);
      await sleep(900);
      const shown5 = () => [...(foundry.applications.instances?.values() ?? [])].concat(Object.values(ui.windows ?? {}));
      const hit5 = shown5().find((w) => w?.document?.uuid === rec5.dataset.uuid);
      ok('§5 clicking it opens that record in its own sheet', !!hit5, hit5?.document?.name ?? 'nothing opened');
      await hit5?.close?.();
      await click($('.fxlist .row .acts [data-act="fx-editor"]'));
      await sleep(400);
      ok('§5 the Editor names the book the ability comes from, under its name', /Player's Handbook/.test(text('.sheet-title .recordline')), text('.sheet-title .recordline'));
      await click('[data-tab="fx"]');
      await type('.fx-q', '');
      await sleep(450);

      // 6 · a Stock FX edited asks: House override, or Stock itself; the Delete confirm names the key and the layer
      const stock6 = 'fire-bolt';
      const op6 = (fx) => fx?.scenes?.[0]?.opacity ?? 1;
      const stockOp6 = op6(api.fx.get(stock6)?.original);
      const editOpacity = async (pct) => { await unlock(); await pick(0); await group('picture'); await choose('[data-field="opacity"]', String(pct)); };
      await openEditor(stock6);
      ok('§6 a Stock FX opens tagged Stock', /Stock/.test(text('.sheet h2')), text('.sheet h2'));
      ok('§6 a bolt shows From and To in its Picture group, and no At (§28.4)', !!(await group('picture')) && !!$('[data-field="place"][data-k="from"]') && !!$('[data-field="place"][data-k="to"]') && !$('[data-field="place"][data-k="at"]'), cellsOf('picture').join(','));
      await editOpacity(80);
      ok('§6 editing Stock, the banner says Save will ask: House override or Stock', /House override/.test(text('.sheet .banner')) && /Stock itself/.test(text('.sheet .banner')), text('.sheet .banner'));
      const asked6 = await answerSave('house', () => click('[data-act="sh-save"]'));
      made.push(stock6);
      ok('§6 House override writes the same id into house.json: House wins, Stock is untouched', asked6 && api.fx.get(stock6)?.source === 'house' && op6(api.fx.get(stock6)?.original) === 0.8 && op6(api.corpora.stock.find((l) => l.id === stock6)) === stockOp6, `${api.fx.get(stock6)?.source}`);
      ok('§6 the sheet reopens on the override, tagged House override', /House override/.test(text('.sheet h2')) && $('.sheet')?.dataset.edit === 'false', text('.sheet h2'));
      await click('[data-tab="fx"]');
      await type('.fx-q', 'fire bolt');
      await sleep(450);
      const both6 = $$(`.fxlist .pickbtn[data-id="${stock6}"]`);
      ok('§6 the Library lists the override AND the Stock FX under it, Stock marked as overridden, and no book line (one key)', both6.length === 2 && both6.map((b) => b.dataset.source).join(',') === 'house,stock' && both6[1].closest('.row')?.dataset.shadowed === 'true' && !both6.some((b) => b.querySelector('.bk')), both6.map((b) => b.dataset.source).join(','));
      await click(both6[0].closest('.row').querySelector('[data-act="fx-editor"]'));
      const seen6 = await sayYes(() => click('[data-act="sh-delete"]'));
      await until(() => api.fx.get(stock6)?.source === 'stock' && text('.sheet code.id') === stock6);
      ok('§6 the Delete confirm names the FX, its key and its layer: "Delete Fire Bolt (spell:fire-bolt, House)?" (§28.9)', seen6?.window?.title === 'Delete Fire Bolt (spell:fire-bolt, House)?' && /House file\. Deletes it permanently\. The Stock FX of that id shows through again\./.test(seen6?.content ?? ''), `${seen6?.window?.title} · ${seen6?.content}`);
      ok('§6 Delete on the override shows Stock again, and the sheet reopens on it', api.fx.get(stock6)?.source === 'stock' && /Stock/.test(text('.sheet h2')), text('.sheet h2'));
      await editOpacity(60);
      const asked6b = await answerSave('stock', () => click('[data-act="sh-save"]'));
      ok('§6 Edit Stock writes the Stock file itself, and the sheet reopens on the Stock layer it wrote', asked6b && api.fx.get(stock6)?.source === 'stock' && op6(JSON.parse(await readFile('recipes/stock/spells.json')).fx.find((l) => l.id === stock6)) === 0.6 && app.sheet?.source === 'stock', `${api.fx.get(stock6)?.source} · sheet ${app.sheet?.source}`);
      await editOpacity(Math.round(stockOp6 * 100));
      await answerSave('stock', () => click('[data-act="sh-save"]'));
      ok('§6 and written back as it was', op6(api.fx.get(stock6)?.original) === stockOp6, String(op6(api.fx.get(stock6)?.original)));
      await editOpacity(50);
      // a corpus rebuild from elsewhere does not drop the dirty sheet's edits (the review's 3.2)
      Hooks.callAll('fxstudio.rebuilt', api.index);
      await sleep(300);
      ok('§6 a corpus rebuild from elsewhere keeps the dirty sheet\'s edit and its focus box', app.sheet?.scenes?.[0]?.scene.opacity === 0.5 && $('[data-field="opacity"]')?.value === '50' && $('.sheet')?.dataset.edit === 'true', `${app.sheet?.scenes?.[0]?.scene.opacity}`);
      const asked6c = await answerSave('cancel', () => click('[data-act="sh-save"]'));
      ok('§6 Cancel in the dialog saves nothing and leaves the sheet unlocked', asked6c && $('.sheet')?.dataset.edit === 'true' && op6(api.fx.get(stock6)?.original) === stockOp6, `${$('.sheet')?.dataset.edit}`);
      await click('[data-act="sh-cancel"]');
      await click('[data-tab="fx"]');

      // 7 · one item's own key, through the sheet — on an actor's item, then on a sidebar item (DESIGN §23, §28.9)
      app = api.open({ tab: 'editor', item: tmp, edit: false });
      await sleep(450);
      ok('§7 the Editor opens on the FX that answers the item', paneNow() === 'editor' && text('.sheet code.id') === 'sharran-step', text('.sheet code.id'));
      await click('[data-act="sh-dup"]');
      ok('§7 Duplicate opens an unlocked copy with the scenes and no key', $('.sheet')?.dataset.edit === 'true' && !$$('.hookstrip .pill.key').length && /No key yet/.test(text('.hookstrip')) && $$('.rail .row').length === 3, text('.hookstrip').slice(0, 80));
      await sleep(150);
      const toast7 = app.element.querySelector(':scope > .toast');
      ok('§7 Duplicate\'s instruction is still readable on the frame after the paint that follows it', toast7?.dataset.on === 'true' && /Copy of Sharran Step\. Choose the ability it answers, then Save\./.test(toast7.textContent) && toast7.getAttribute('aria-live') === 'polite', toast7?.textContent ?? 'no toast');
      app.sheet = null;
      app = api.open({ tab: 'editor', item: tmp, edit: true });
      await sleep(450);
      const ownBtn = $('[data-act="sh-own-key"]');
      ok('§7 opened unlocked from the item, the Key strip names the item and offers Own key', !!ownBtn && /FX Test Caster · Sharran Step/.test(text('.hookstrip')), text('.hookstrip').slice(0, 120));
      const ownId = 'sharran-step-fx-test-caster';
      await sayPrompt(() => click(ownBtn), ownId);
      await until(() => tmp.system?.identifier === ownId && text('.sheet code.id') === ownId);
      ok('§7 Own key writes the identifier on the item and the sheet becomes a new House FX for that key alone, its scenes copied', tmp.system?.identifier === ownId && !tmp.getFlag(MOD, 'fx') && text('.sheet code.id') === ownId && /New/.test(text('.sheet h2')) && $$('.rail .row').length === 3, `${tmp.system?.identifier} · ${text('.sheet code.id')}`);
      await click('[data-act="sh-save"]');
      await until(() => api.fx.get(ownId) && $('.sheet')?.dataset.edit === 'false');
      const own = api.fx.get(ownId)?.original;
      if (own) made.push(own.id);
      ok('§7 Save writes it to House, keyed to the item\'s own identifier, with the item as its record', !!own && own.for?.[0] === `spell:${ownId}` && own.record?.uuid === tmp.uuid, JSON.stringify(own ?? null).slice(0, 200));
      ok('§7 the item plays its own FX, by its own key', api.sentenceFor(tmp).fx?.id === own?.id, api.sentenceFor(tmp).why);
      await sayYes(() => click('[data-act="sh-delete"]'));
      await until(() => !api.fx.get(own.id));
      await tmp.update({ 'system.identifier': '' });
      ok('§7 Delete erases it, and with the identifier cleared the spell\'s FX answers the item again', !api.fx.get(own?.id) && api.resolve(tmp).fx?.id === 'sharran-step', `${api.resolve(tmp).fx?.id}`);
      // a sidebar item is an item: Own key is live on it, and its record is the item itself
      worldItem = await Item.create({ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con', activities: { dnd5eactivity000: { type: 'utility', _id: 'dnd5eactivity000' } } } });
      app.refresh();
      app = api.open({ tab: 'editor', item: worldItem, edit: true });
      await sleep(450);
      const ownW = $('[data-act="sh-own-key"]');
      ok('§7 a world item in the sidebar opens the sheet knowing it, and Own key is live on it, not greyed', !!ownW && /Sharran Step · world item/.test(text('.hookstrip')) && /Own key gives the world item Sharran Step a key of its own/.test(text('.hookstrip .hcol:nth-child(2) .why')), text('.hookstrip .hcol:nth-child(2)'));
      const ownWId = 'sharran-step-world';
      await sayPrompt(() => click(ownW), ownWId);
      await until(() => worldItem.system?.identifier === ownWId && text('.sheet code.id') === ownWId);
      await click('[data-act="sh-save"]');
      await until(() => api.fx.get(ownWId) && $('.sheet')?.dataset.edit === 'false');
      const ownW7 = api.fx.get(ownWId)?.original;
      if (ownW7) made.push(ownW7.id);
      ok('§7 Own key on the world item writes its identifier, and Save keys a House FX to it with the item as its record', worldItem.system?.identifier === ownWId && ownW7?.for?.[0] === `spell:${ownWId}` && ownW7?.record?.uuid === worldItem.uuid && /this world/.test(ownW7?.record?.where ?? ''), JSON.stringify(ownW7?.record ?? null));
      await api.corpus.erase(ownWId, { from: 'house' });
      await worldItem.delete(); worldItem = null;
      // the guard: Cancel drops changes
      await openEditor('sharran-step');
      await unlock();
      await pick(1); await group('timing');
      await choose('[data-field="delay"]', '900');
      ok('§7 a change unlocks Save', /after 900 ms/.test(text('.sheet .preview')) && $('[data-act="sh-save"]')?.disabled === false, '');
      await click('[data-act="sh-cancel"]');
      ok('§7 Cancel drops the change and locks the sheet again', $('.sheet')?.dataset.edit === 'false' && /after 500 ms/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 120));
      // Delete asks in a REAL DialogV2, answered No: nothing goes, and the page is clickable the moment it closes
      await pick(1);
      $('[data-act="sh-delete"]').click();
      await until(() => !!dialogs()[0]?.element?.querySelector('button[data-action="no"]'), 5000);
      const dlg7 = dialogs()[0];
      ok('§7 Delete asks in a real dialog naming the FX, its key and its layer, and its file', /Delete Sharran Step \(spell:sharran-step, House\)\?/.test(dlg7?.element?.querySelector('.window-title')?.textContent ?? '') && /House file\. Deletes it permanently\./.test(dlg7?.element?.textContent ?? ''), (dlg7?.element?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 120));
      dlg7?.element?.querySelector('button[data-action="no"]')?.click();
      await sleep(30);
      const [tab7, after7] = underTab();
      ok('§7 answered No: 30 ms later no dialog is open, the FX stays, the sheet keeps its scene, the tab strip is under the pointer', dialogs().length === 0 && !!api.fx.get('sharran-step') && app.sheet?.pick === 1 && after7 === tab7, `${dialogs().length} dialogs · pick ${app.sheet?.pick}`);

      // 8 · an event FX and the nine words (§28.2)
      await openEditor('summon-appears');
      ok('§8 Stock\'s Summon Appears opens with its Moment shown: Summon pressed, its phrase under the words', /Summon Appears/.test(text('.sheet h2')) && /event/.test(text('.sheet h2 .tag.event')) && $('[data-act="sh-on"][aria-pressed="true"]')?.dataset.on === 'summon' && text('.hookstrip .phrase') === 'when its creature appears', `${text('.sheet h2')} · ${text('.hookstrip .phrase')}`);
      ok('§8 its key line says it is an event, and the Item column says an event has no item', /an event: every ability at this moment, after the ability's own FX for the word/.test(text('.hookstrip .keyline')) && !/this world's own item/.test(text('.hookstrip')) && /An event has no item\./.test(text('.hookstrip .hcol:nth-child(2) .why')), `${text('.hookstrip .keyline')} · ${text('.hookstrip .hcol:nth-child(2) .why')}`);
      await unlock();
      ok('§8 unlocked, the Moment column names all nine words, the note saying whose they are and which fall back to use', $$('[data-act="sh-on"]').map((p) => p.dataset.on).join(',') === 'use,effect,maneuver,sneak,fold,rider,hold-answered,summon,unsummon' && /Use and Effect are dnd5e's/.test(text('.hookstrip .hcol:nth-child(3) .why')) && /Maneuver, Sneak, Fold and Rider fall back to the ability's Use FX/.test(text('.hookstrip .hcol:nth-child(3) .why')) && /Held roll, Summon and Unsummon never do/.test(text('.hookstrip .hcol:nth-child(3) .why')), text('.hookstrip .hcol:nth-child(3) .why'));
      ok('§8 on an event, dnd5e\'s two words are greyed with their reason: neither is heard as an event', $('[data-act="sh-on"][data-on="use"]')?.disabled === true && /neither is heard as an event/.test($('[data-act="sh-on"][data-on="use"]')?.dataset.tooltip ?? ''), $('[data-act="sh-on"][data-on="use"]')?.dataset.tooltip ?? '');
      await click('[data-act="sh-on"][data-on="unsummon"]');
      ok('§8 on an event the word IS the event: pressing Unsummon re-keys it to event:unsummon', text('.hookstrip .keyline code.key') === 'event:unsummon' && app.sheet.on === 'unsummon', text('.hookstrip .keyline'));
      await click('[data-act="sh-on"][data-on="summon"]');
      await pick(1); await group('picture');
      await choose('[data-field="opacity"]', '70');
      const asked8 = await answerSave('house', () => click('[data-act="sh-save"]'));
      const ev8 = api.fx.get('summon-appears');
      ok('§8 an event FX is edited on the sheet, not by hand: Save asks, and the House override keeps event:summon on summon', asked8 && ev8?.source === 'house' && ev8.original.for?.[0] === 'event:summon' && ev8.original.on === 'summon' && ev8.original.scenes?.[1]?.opacity === 0.7 && api.fx.validate(ev8.original).length === 0, JSON.stringify({ src: ev8?.source, for: ev8?.original?.for, on: ev8?.original?.on }));
      await api.corpus.erase('summon-appears', { from: 'house' });
      await until(() => api.fx.get('summon-appears')?.source === 'stock');

      // 9 · the files are put back, byte for byte
      const houseNow = JSON.parse(await readFile('recipes/house.json'));
      ok('§9 the server\'s house.json holds Sharran Step from §4', houseNow.fx.some((l) => l.id === 'sharran-step' && l.by === game.user.name), `${houseNow.fx.length} fx`);
      ok('§9 the module\'s own manifest is left alone (a Save writes corpus files only)', JSON.parse(await readFile('module.json')).version === game.modules.get(MOD).version, '');
      for (const p of FILES) await writeFile(p, snapshot[p]);
      await api.corpus.reload();
      let same = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) same = false;
      ok('§9 restored: the module\'s files are as they were and Sharran Step is gone from the corpus', same && !api.resolve(tmp).fx, `${api.resolve(tmp).why ?? ''}`);

      // 12 · COVERAGE and its doors, which land where the wand and the search miss land (§28.1)
      app.sheet = null;
      await click('[data-tab="coverage"]');
      app.refresh(); app.paint(); await sleep(250);
      const tileN = () => $$('.tiles .tile').map((t) => t.querySelector('.num').textContent.trim());
      const c12 = api.census();
      const n12 = (i) => Number(String(tileN()[i] ?? '').replace(/,/g, ''));
      ok('§12 Coverage opens on My actors, its tiles the tab\'s own census (items, effects and natural attacks): at least the items, and No FX is the difference', n12(0) >= c12.asked && n12(1) >= c12.answered && n12(0) - n12(1) === n12(2), `${tileN().join(' · ')} (items alone ${c12.asked} · ${c12.answered})`);
      const cvRows = () => $$('.cvlist .rows .cvrow');
      const door12 = [...cvRows()].map((r) => r.querySelector('[data-act="entry"]')).find((b) => b && b.dataset.uuid === tmp.uuid) ?? null;
      ok('§12 a No FX row is the door data-act="entry" with the item\'s uuid and data-create', !!door12 && !!door12.dataset.uuid && door12.dataset.create === '1', door12?.outerHTML.slice(0, 160) ?? 'no row');
      const name12 = (fromUuidSync(door12.dataset.uuid)?.name) ?? '';
      await click(door12);
      ok('§12 the row lands on the Editor, unlocked, on "Nothing plays for …", saying it came from a Coverage row', paneNow() === 'editor' && $('.sheet')?.dataset.edit === 'true' && text('.nothing .big') === `Nothing plays for ${name12}.` && /Opened from a Coverage row/.test(text('.nothing')), `${text('.nothing .big')} · ${text('.nothing p.note').slice(0, 80)}`);
      // the Starter door: a starter used WHOLE, every scene of it
      await click('[data-act="sh-door"][data-door="starter"]');
      const starters12 = $$('[data-act="sh-use-starter"]');
      ok('§12 the Starter door lists the starters with their notes', starters12.length === api.index.starters.size && starters12.some((b) => b.dataset.id === 'starter:teleport' && /3 scenes: Mark, Mark, Move/.test(b.textContent)), starters12.map((b) => b.dataset.id).join(', '));
      await click($('[data-act="sh-use-starter"][data-id="starter:teleport"]'));
      ok('§12 a starter from the landing is used whole: the teleport starter brings its two marks and its move', app.sheet.scenes.map((x) => x.scene.shape).join('+') === 'mark+mark+move' && $$('.rail .row').length === 3 && !$('.nothing') && app.sheet.from === 'starter:teleport', app.sheet.scenes.map((x) => x.scene.shape).join('+'));
      await click('[data-act="sh-back"]');
      const leave12 = dialogs().length ? dialogs()[0] : null;
      if (leave12) { leave12.element?.querySelector('button[data-action="yes"]')?.click(); await sleep(300); }
      ok('§12 Back returns to Coverage', tabNow() === 'coverage', tabNow());
      // the Copy from door, on the same landing
      app.sheet = null;
      await click([...cvRows()].map((r) => r.querySelector('[data-act="entry"]')).find((b) => b && b.dataset.uuid === tmp.uuid));
      await click('[data-act="sh-door"][data-door="copy"]');
      ok('§12 the Copy from door opens a box listing FX to copy (no starters)', !!$('.nothing .sh-like') && $$('.nothing .suggest .hit').length > 0 && !$$('.nothing .suggest .hit').some((h) => (h.dataset.id ?? '').startsWith('starter:')), `${$$('.nothing .suggest .hit').length} hits`);
      await type('.nothing .sh-like', 'fire bolt');
      await click($$('.nothing .suggest .hit').find((h) => h.dataset.id === 'fire-bolt'));
      ok('§12 picking one copies its scenes in and the sheet follows', app.sheet.from === 'fire-bolt' && app.sheet.scenes.length >= 1 && !!$('.rail .row'), `${app.sheet.from} · ${app.sheet.scenes.length}`);
      app.sheet = null; app.view.tab = 'coverage'; app.paint(); await sleep(200);
      // the key door, and the key door with data-from (the other screen's "has a proposal" door), and the gap table's word
      const unheld12 = Object.keys(api.records.map() ?? {}).find((k) => k.startsWith('spell:') && !api.fx.for(k).length && !app.entries.some((e) => e.keys.includes(k)));
      const pane12 = $('[data-pane="coverage"]');
      const fake = document.createElement('button');
      fake.type = 'button'; fake.dataset.act = 'key'; fake.dataset.key = unheld12; fake.dataset.from = 'misty-step';
      pane12.append(fake);
      const real12 = api.proposals;
      api.proposals = { ...real12, get: (k) => (k === unheld12 ? { status: 'proposed', reason: '', basis: 'misty-step', sentence: 'a mark on the caster', vfxFit: 'Sure', sfxFit: 'Likely' } : null) };
      fake.click(); await sleep(400);
      ok('§12 data-act="key" with data-from opens a new FX for the key with that FX\'s scenes copied in, and says what the gap table proposes', paneNow() === 'editor' && app.sheet.keys[0] === unheld12 && app.sheet.from === 'misty-step' && app.sheet.scenes.length === 3 && !app.sheet.landing && /The gap table proposes “a mark on the caster”, from Misty Step \(picture Sure, sound Likely\)/.test(text('.sheet .notes')), `${app.sheet.keys[0]} · ${text('.sheet .notes')}`);
      app.sheet = null; app.view.tab = 'coverage'; app.paint(); await sleep(200);
      api.proposals = { ...real12, get: (k) => (k === unheld12 ? { status: 'none', reason: 'it is a passive trait' } : null) };
      const fake2 = document.createElement('button');
      fake2.type = 'button'; fake2.dataset.act = 'key'; fake2.dataset.key = unheld12;
      $('[data-pane="coverage"]').append(fake2);
      fake2.click(); await sleep(400);
      ok('§12 data-act="key" alone lands on the landing, which says the gap table\'s judgement and still offers the doors', /Nothing plays for/.test(text('.nothing .big')) && /The gap table judged it: no proposed FX: it is a passive trait\. You can still write one\./.test(text('.nothing .judged')) && $$('.nothing .three button').length === 3, text('.nothing .judged'));
      api.proposals = real12;
      fake.remove(); fake2.remove();
      app.sheet = null; app.view.tab = 'coverage'; app.paint(); await sleep(200);
      // Find an item from a blank sheet (DESIGN §23)
      await click('[data-tab="editor"]');
      await click('[data-act="sh-new"]');
      const find12 = $('[data-act="sh-pick-item"]');
      ok('§12 a new sheet knows no item: Find an item, and Own key greyed with its reason on the screen', find12?.textContent.trim() === 'Find an item' && $('.hookstrip .pill[data-na="true"]')?.textContent.trim() === 'Own key' && /Find an item on an actor; Own key then gives it a key of its own/.test(text('.hookstrip .hcol:nth-child(2) .why')), text('.hookstrip .hcol:nth-child(2)'));
      await click(find12);
      await type('.sh-item-q', 'misty');
      const hits12 = $$('.sh-item-search .hit');
      await click(hits12.find((h) => /FX Test Caster · Misty Step/.test(h.textContent.replace(/\s+/g, ' '))));
      ok('§12 picking one puts the sheet on it: the Item column names it, its key is the sheet\'s, and Own key is live', /FX Test Caster · Misty Step/.test(text('.hookstrip')) && $('[data-act="sh-own-key"]')?.disabled === false && text('.sheet code.id') === 'misty-step', `${text('.sheet code.id')}`);
      app.sheet = null; app.view.tab = 'fx'; app.paint(); await sleep(200);

      // 13 · the Asset Library is a browser; the drawer keeps a set, a triple and a stretch on a same-family pick
      await click('[data-tab="assets"]');
      ok('§13 the Asset Library browses and does not write: no Use, no pick banner', !$('[data-act="lib-pick-use"]') && !$('.picking') && !$('[data-act="lib-use"]'), 'no picker on the tab');
      const styles13 = $$('[data-act="lib-sel"]');
      await click(styles13.find((r) => r.dataset.id === 'jb2a.arcane_hand'));
      const video13 = $('.stage video');
      ok('§13 a style plays its webm on a loop, muted, and shows the Sequencer path', !!video13 && video13.loop && video13.muted && val('.lib-dbpath') === 'jb2a.arcane_hand.blue', val('.lib-dbpath'));
      $('.shelf .list').scrollTop = 300; await sleep(50);
      await click('[data-act="lib-next"]');
      ok('§13 the arrow steps to the next variant and the list keeps its scroll', val('.lib-dbpath') !== 'jb2a.arcane_hand.blue' && $('.shelf .list').scrollTop === 300, `${val('.lib-dbpath')} · ${$('.shelf .list').scrollTop}`);
      await click($$('[data-act="lib-sel"]').find((r) => r.dataset.id === 'jb2a.fire_bolt'));
      const useLine13 = $('[data-act="lib-open-fx"]');
      ok('§13 "Used in" names the FX that use a style, and opens one in the Editor', !!useLine13 && /Used in \d+ FX/.test(text('.lib-users')), text('.lib-users').slice(0, 80));
      const useId13 = useLine13.dataset.id;
      await click(useLine13);
      ok('§13 … in the Editor', paneNow() === 'editor' && text('.sheet code.id') === useId13, `${useId13} → ${text('.sheet code.id')}`);
      $$('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      // the cell's name opens the Assets tab on the asset (a door, never a pick)
      await openEditor('misty-step', true);
      await group('picture');
      await click('.inspector .f-vfx [data-act="cw-show"]');
      ok('§13 the VFX cell\'s name opens the Assets tab on that very picture', paneNow() === 'assets' && /^jb2a\.misty_step\.01/.test(val('.lib-dbpath')) && !$('.picking'), val('.lib-dbpath'));
      $$('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      await click('[data-tab="editor"]');
      // the SFX drawer: a sound picked into the scene, its ▶ beside the stepper, and ✕ on the sound alone
      await group('sound');
      await click('.inspector [data-act="cw-browse"][data-slot="sound"]');
      ok('§13 Browse on the SFX opens the drawer in the Sound group, on the sound the scene names, with a ▶', !!$('.inspector .grp[data-group="sound"] .drawer') && /^psfx\./.test(text('.drawer .dpath')) && !!$('.drawer [data-act="dr-play"]'), text('.drawer .dpath'));
      await type('.drawer .dr-q', 'weapon swooshes');
      await sleep(300);
      await click($$('.drawer .hit').find((h) => h.dataset.id === 'psfx.weapon-swooshes.light'));
      const sfx13 = text('.drawer .dpath');
      await click('.drawer [data-act="dr-use"]');
      ok('§13 Use writes the SFX into the scene, and the sentence says so', api.assets.resolve(app.sheet.scenes[0].scene.sound.asset).path === sfx13 && /weapon-swooshes light/.test(text('.sheet .preview')), `${sfx13}`);
      ok('§13 the SFX cell carries its name, Browse and ✕; the VFX cell has no ✕', !!$('.inspector .f-sfx [data-act="cw-sound-off"]') && !!$('.inspector .f-sfx [data-act="cw-browse"]') && !$('.inspector .f-vfx [data-act$="-off"]'), text('.inspector .f-sfx'));
      app.sheet = null;
      // a random set: Rage's three ground cracks keep their set, in the picked colour
      await openEditor('rage', true);
      await group('picture');
      const set13 = app.sheet.scenes[0].scene.asset.paths;
      await click('.inspector [data-act="cw-browse"][data-slot="asset"]');
      const pickStep = async (re) => { const sel = $('.drawer [data-field="dr-step"]'); const o = [...sel.options].find((x) => re.test(x.textContent)); if (o) await choose(sel, o.value); return !!o; };
      const had13 = await pickStep(/^Ground Crack 01 Blue ·/i);
      await click('.drawer [data-act="dr-use"]');
      const after13 = app.sheet.scenes[0].scene.asset;
      ok('§13 a same-family pick keeps the {paths} random set, every member in the picked colour (§28.3)', had13 && Array.isArray(after13.paths) && after13.paths.length === set13.length && after13.paths.every((p, k) => p === set13[k].replace(/\.orange$/, '.blue')), JSON.stringify(after13));
      await click('.inspector [data-act="cw-browse"][data-slot="asset"]');
      await type('.drawer .dr-q', 'fire bolt');
      await sleep(300);
      await click($$('.drawer .hit').find((h) => h.dataset.id === 'jb2a.fire_bolt'));
      await click('.drawer [data-act="dr-use"]');
      ok('§13 a pick of another family replaces the asset whole', JSON.stringify(Object.keys(app.sheet.scenes[0].scene.asset)) === '["path"]' && /^jb2a\.fire_bolt\./.test(app.sheet.scenes[0].scene.asset.path), JSON.stringify(app.sheet.scenes[0].scene.asset));
      app.sheet = null;
      // a triple by position: Thunderwave's three keep their places
      await openEditor('thunderwave', true);
      await group('picture');
      const tri13 = app.sheet.scenes[0].scene.asset.byPosition;
      await click('.inspector [data-act="cw-browse"][data-slot="asset"]');
      const hadTri = await pickStep(/^Center Green ·/i);
      await click('.drawer [data-act="dr-use"]');
      const triAfter = app.sheet.scenes[0].scene.asset.byPosition;
      ok('§13 a same-family pick keeps the {byPosition} triple, each in its place, in the picked colour', hadTri && !!triAfter && ['center', 'mid', 'left'].every((k) => triAfter[k].path === tri13[k].path.replace(/\.blue$/, '.green')), JSON.stringify(triAfter));
      app.sheet = null;
      // the template stretch: Heated Metal's metadata stays on a same-family pick
      await openEditor('heated-metal', true);
      await group('picture');
      const tpl13 = app.sheet.scenes[0].scene.asset.template;
      await click('.inspector [data-act="cw-browse"][data-slot="asset"]');
      const hadTpl = await pickStep(/^Loop Debris Blue ·/i);
      await click('.drawer [data-act="dr-use"]');
      const tplAfter = app.sheet.scenes[0].scene.asset;
      ok('§13 a same-family pick keeps the template stretch metadata', hadTpl && tplAfter.path === 'jb2a.fireball.loop_debris.blue' && JSON.stringify(tplAfter.template) === JSON.stringify(tpl13), JSON.stringify(tplAfter));
      app.sheet = null;
      // the one-column inspector: only the cells KNOBS lists, the size kind, the dim reasons
      await openEditor('misty-step', true);
      const KN = { mark: ['shape', 'picture', 'timing', 'sound', 'placement'], move: ['shape', 'sound'] };
      await pick(0);
      const markGroups = groups();
      const markPicture = cellsOf('picture');
      await pick(2);
      const moveGroups = groups();
      ok('§13 a Mark and a Move show only the groups their shape reads: a Move is its own six and its Sound', markGroups.join(',') === KN.mark.join(',') && moveGroups.join(',') === KN.move.join(',') && cellsOf('shape').join(',') === 'range,spot,jump,fade,speed,after' && $('.inspector .grp[data-group="shape"]').open && /MOVE/i.test(text('.inspector .grp[data-group="shape"] summary')), `mark ${markGroups.join(',')} · move ${moveGroups.join(',')}`);
      ok('§13 a cell the shape does not read is not drawn: a Mark has no Scatter, From or To', !markPicture.includes('scatter') && !markPicture.includes('from') && !markPicture.includes('to') && markPicture.includes('at'), markPicture.join(','));
      ok('§13 Travel speed is dim with its reason while the move appears without travelling', $('.inspector .f-speed')?.dataset.dim === 'true' && /means nothing while it appears without travelling/.test(text('.inspector .f-speed')), text('.inspector .f-speed'));
      await pick(0); await group('picture');
      ok('§13 Size carries a kind switch and the number', $('[data-field="size-kind"]')?.tagName === 'SELECT' && [...$('[data-field="size-kind"]').options].map((o) => o.value).slice(0, 4).join(',') === 'tokenWidths,radius,squares,fit' && $('[data-field="size-kind"]').value === 'tokenWidths' && $('[data-field="size"]')?.value === '2.25', `${$('[data-field="size-kind"]')?.value} · ${$('[data-field="size"]')?.value}`);
      await choose('[data-field="size-kind"]', 'radius');
      ok('§13 switching the kind writes the size object of that kind, the number carried', JSON.stringify(app.sheet.scenes[0].scene.size) === '{"radius":2.25}' && /2\.25 squares around/.test(text('.sheet .preview')), JSON.stringify(app.sheet.scenes[0].scene.size));
      await choose('[data-field="size-kind"]', 'fit');
      ok('§13 … and "fit the shape" writes a fit at scale 1', JSON.stringify(app.sheet.scenes[0].scene.size) === '{"fit":"shape","scale":1}', JSON.stringify(app.sheet.scenes[0].scene.size));
      await choose('[data-field="size-kind"]', 'tokenWidths');
      await choose('[data-field="opacity"]', '50');
      ok('§13 Opacity is read back in the sentence', /at 50% opacity/.test(text('.sheet .preview')), text('.sheet .preview').slice(0, 140));
      await choose('[data-field="tint"]', '#ff0000');
      ok('§13 Tint is a colour picker, read back', /tinted #ff0000/.test(text('.sheet .preview')), '');
      await click('[data-act="cw-tint-off"]');
      await group('timing');
      await choose('[data-field="times"]', '3');
      ok('§13 Times repeats the scene and Every comes alive in place, its reason gone', /3 times/.test(text('.sheet .preview')) && $('.inspector .f-every')?.dataset.dim !== 'true' && $('[data-field="every"]')?.disabled === false && !$('.inspector .f-every .dimwhy'), text('.sheet .preview').slice(-110));
      await choose('[data-field="times"]', '1');
      // the groups are remembered per sheet: a group opened stays open on the next scene
      await pick(1);
      ok('§13 an opened group is remembered for the sheet: Timing stays open on another scene', $('.inspector .grp[data-group="timing"]')?.open === true, groups().map((g) => `${g}:${$(`.inspector .grp[data-group="${g}"]`).open}`).join(','));
      app.sheet = null; app.view.tab = 'fx'; app.paint(); await sleep(200);
      ok('§13 the sheet is dropped, nothing saved', houseIds().length === before.length, `${houseIds().length}`);

      // 14 · Play on every scene and Play all; the window at 1,080 and 780; its sticky bands
      app = api.open({ tab: 'editor', id: 'misty-step' });
      await sleep(500);
      canvas.tokens.releaseAll();
      app.paint(); await sleep(200);
      ok('§14 with no token selected every ▶ keeps its place, greyed, Play all too, each saying why', $$('[data-act="sh-play-scene"]').length === 3 && $$('[data-act="sh-play-scene"]').every((b) => b.disabled && /select a token/.test(b.dataset.tooltip)) && $('[data-act="sh-play-all"]')?.disabled === true, `${$$('[data-act="sh-play-scene"]').length} ▶`);
      caster.control({ releaseOthers: true });
      app.paint(); await sleep(200);
      ok('§14 with a token selected every ▶ and Play all come alive', $$('[data-act="sh-play-scene"]').every((b) => !b.disabled) && $('[data-act="sh-play-all"]')?.disabled === false, '');
      ok('§14 the sheet loads no picture: no video and no image anywhere in the Editor (§27)', !$('[data-pane="editor"] video, [data-pane="editor"] img'), `${$$('[data-pane="editor"] video, [data-pane="editor"] img').length}`);
      ok('§14 no checkbox is bare: every boolean is a two-word switch or a chip', $$('.inspector input[type="checkbox"]').every((c) => c.closest('label.seg, label.chip')), `${$$('.inspector input[type="checkbox"]').length} switches`);
      ok('§14 the rail scrolls past four scenes instead of growing the form', getComputedStyle($('.rail')).overflowY === 'auto' && parseFloat(getComputedStyle($('.rail')).maxHeight) > 0, getComputedStyle($('.rail')).maxHeight);
      const content14 = app.element.querySelector('.fxstudio-content');
      ok('§14 at 1,080px the head is one line, the rail 288px beside the inspector, and nothing scrolls sideways', getComputedStyle($('.lockbar')).flexWrap === 'nowrap' && Math.round($('.lockbar').getBoundingClientRect().height) < 40 && Math.round($('.railside').getBoundingClientRect().width) === 288 && getComputedStyle($('.seq')).gridTemplateColumns.split(' ').length === 2 && content14.scrollWidth <= content14.clientWidth + 1, `${Math.round($('.railside').getBoundingClientRect().width)}px · ${content14.scrollWidth} vs ${content14.clientWidth}`);
      const buf14 = houseIds().length;
      await click($$('[data-act="sh-play-scene"]')[0]);
      await sleep(1200);
      const e14 = api.ledger[0];
      ok('§14 a rail ▶ plays that one scene through the preview, and saves nothing', e14?.fx === 'preview' && e14.played && houseIds().length === buf14, `${e14?.fx} · played ${e14?.played}`);
      await click($$('[data-act="sh-play-scene"]')[2]);
      await sleep(600);
      ok('§14 a Move\'s ▶ plays too: it arms the canvas for the spot (a one-scene FX through the preview)', /Click a spot on the canvas|Playing scene 3/.test(app.element.querySelector(':scope > .toast')?.textContent ?? ''), app.element.querySelector(':scope > .toast')?.textContent ?? '');
      Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
      canvas.app.stage.removeAllListeners?.('pointerdown');
      await click('[data-act="sh-play-all"]');
      await sleep(1200);
      const e14b = api.ledger[0];
      ok('§14 ▶ Play all plays the whole draft FX through the preview, and saves nothing', e14b?.fx === 'preview' && e14b !== e14 && /the whole FX|Click a spot/.test(app.element.querySelector(':scope > .toast')?.textContent ?? '') && houseIds().length === buf14, `${app.element.querySelector(':scope > .toast')?.textContent}`);
      Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
      canvas.app.stage.removeAllListeners?.('pointerdown');
      // the second width: the window's own width is the breakpoint (§28.5)
      app.setPosition({ width: 780 }); await sleep(400);
      const c780 = app.element.querySelector('.fxstudio-content');
      const win780 = c780.getBoundingClientRect();
      ok('§14 at 780px the rail stacks over the inspector and the Key strip is two columns', getComputedStyle($('.seq')).gridTemplateColumns.split(' ').length === 1 && getComputedStyle($('.hookstrip')).gridTemplateColumns.split(' ').length === 2 && $('.inspect').getBoundingClientRect().top >= $('.railside').getBoundingClientRect().bottom - 1, `${getComputedStyle($('.seq')).gridTemplateColumns} · ${getComputedStyle($('.hookstrip')).gridTemplateColumns}`);
      ok('§14 at 780px nothing scrolls sideways, and the tab strip and the action bar stay inside the window', c780.scrollWidth <= c780.clientWidth + 1 && $('.tabs').getBoundingClientRect().right <= win780.right + 1 && $('.lockbar').getBoundingClientRect().right <= win780.right + 1, `sideways ${c780.scrollWidth - c780.clientWidth}px`);
      await click('[data-tab="fx"]');
      ok('§14 at 780px the Library does not scroll sideways either', c780.scrollWidth <= c780.clientWidth + 1, `sideways ${c780.scrollWidth - c780.clientWidth}px`);
      await click('[data-tab="editor"]');
      app.setPosition({ width: 470 }); await sleep(400);
      ok('§14 at 470px the Key strip is one column', getComputedStyle($('.hookstrip')).gridTemplateColumns.split(' ').length === 1, getComputedStyle($('.hookstrip')).gridTemplateColumns);
      // the laptop case: a short window scrolls the sentence and the sequence under the tabs and the head
      app.setPosition({ width: 1080, height: 520 }); await sleep(400);
      const c14 = app.element.querySelector('.fxstudio-content');
      c14.scrollTop = 400; await sleep(150);
      const top14 = c14.getBoundingClientRect().top;
      const tabsTop = $('.tabs').getBoundingClientRect().top;
      const headTop = $('.sheet-head').getBoundingClientRect().top;
      ok('§14 in a short window the tab strip and the head with its action bar are sticky: scrolled, they stay at the top', c14.scrollTop > 100 && Math.abs(tabsTop - top14) <= 1 && Math.abs(headTop - $('.tabs').getBoundingClientRect().bottom) <= 2 && $('.preview').getBoundingClientRect().top < headTop, `scrolled ${c14.scrollTop} · tabs at ${Math.round(tabsTop - top14)} · head at ${Math.round(headTop - top14)}`);
      c14.scrollTop = 0;
      app.setPosition({ width: 1080, height: 800 }); await sleep(400);
      // the sentence: two lines and an ellipsis, the whole on a click
      const box14 = $('.sentence-box');
      const two14 = 2 * 1.55 * 15;
      ok('§14 the sentence shows two lines and says there is more', Math.abs(box14.getBoundingClientRect().height - two14) < 2 && box14.dataset.clamped === 'true' && /whole sentence/.test(box14.dataset.tooltip ?? ''), `${Math.round(box14.getBoundingClientRect().height)}px`);
      await click(box14);
      ok('§14 a click opens the whole sentence; a second folds it', $('.sentence-box').dataset.open === 'true' && $('.sentence-box').getBoundingClientRect().height > two14 + 10, '');
      await click('.sentence-box');
      await click($$('.rail .pickbtn')[1]);
      ok('§14 picking a scene changes colour, never layout, and the sentence marks its clause', $('.rail .row[data-now="true"]') === $$('.rail .row')[1] && $('.inspector .ihead .num')?.textContent === '2' && !!$('.sentence-box mark') && text('.inspector .line').includes(text('.sentence-box mark')), text('.sentence-box mark'));
      app.sheet = null; app.view.tab = 'fx'; app.paint(); await sleep(200);
      // the two delays, on an FX the migration wrote with the hold's offset in `delay`
      await openEditor('imperceptible-barrier');
      await pick(0); await group('timing');
      ok('§14 a hold whose offset was written as a delay is read as one thing: Hold next −500 ms, Wait before 0', $('[data-field="hold"]')?.checked === true && $('[data-field="holdms"]')?.value === '-500' && $('[data-field="delay"]')?.value === '0' && JSON.stringify({ delay: app.sheet.scenes[0].scene.delay, wait: app.sheet.scenes[0].scene.wait }) === '{"wait":-500}', '');
      app.sheet = null; app.view.tab = 'fx'; app.paint(); await sleep(200);
      // locked, with no item at all, the Item column greys in place with the reason on the screen
      const owned14 = new Set(app.entries.filter((e) => e.uuid).flatMap((e) => e.keys));
      const orphan14 = api.fx.list().find((e) => e.source === 'stock' && (e.fx.for ?? []).length && !(e.fx.for ?? []).some((k) => owned14.has(k)) && !e.fx.for[0].startsWith('event:'));
      await openEditor(orphan14.fx.id);
      ok('§14 locked, with no item, the Item column greys No item and Own key in place, the reason on the screen (R1, §28.9)', $('.sheet')?.dataset.edit === 'false' && $$('.hookstrip .pill[data-na="true"]').map((p) => p.textContent.trim()).join(',') === 'No item,Own key' && /Opened without an item/.test(text('.hookstrip .hcol:nth-child(2) .why')), text('.hookstrip .hcol:nth-child(2)'));
      app.sheet = null; app.view.tab = 'fx'; app.paint(); await sleep(200);

      // 10 · the item sheet's wand: the Editor, on the item, unlocked (§28.1)
      const sheet = misty.sheet;
      await sheet.render({ force: true });
      await sleep(800);
      const control = sheet.element?.querySelector('.window-header [data-action="fxstudio"]');
      ok('§10 the item sheet carries the FX Studio button in its header, and in its controls dropdown', !!control && [...sheet._getHeaderControlContextEntries()].map((e) => e.label ?? e.name).includes('FX Studio'), control ? 'found' : 'not found');
      await app.close();
      control?.click();
      await sleep(700);
      app = api.open({});
      ok('§10 the wand opens the Editor on the FX that answers the item, unlocked, knowing the item', app?.rendered && tabNow() === 'editor' && text('.sheet code.id') === 'misty-step' && $('.sheet')?.dataset.edit === 'true' && app.sheet?.subject?.uuid === misty.uuid && /FX Test Caster · Misty Step/.test(text('.hookstrip')), `${tabNow()} · ${text('.sheet code.id')} · edit ${$('.sheet')?.dataset.edit}`);
      await sheet.close();
      app.sheet = null;
      // and on an item nothing answers, the wand lands on the landing
      [tmp] = tmp && tmp.parent ? [tmp] : await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      await tmp.sheet.render({ force: true });
      await sleep(800);
      await app.close();
      tmp.sheet.element?.querySelector('.window-header [data-action="fxstudio"]')?.click();
      await sleep(700);
      app = api.open({});
      ok('§10 on an item nothing answers, the wand lands on "Nothing plays for Sharran Step" and its three doors', tabNow() === 'editor' && /Nothing plays for Sharran Step\./.test(text('.nothing .big')) && /Opened from the item sheet’s FX Studio button/.test(text('.nothing')) && $$('.nothing .three button').length === 3, text('.nothing').slice(0, 120));
      await tmp.sheet.close();
      ok('§16 no script error was thrown on the page through the walk', !errors.length, errors.slice(0, 3).join(' | '));
    } catch (err) {
      results.push({ name: 'THROW', pass: false, detail: String(err.stack ?? err).slice(0, 600) });
    } finally {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
      for (const id of made) if (api.fx.get(id)?.source === 'house') await api.corpus.erase(id).catch(() => null);
      let restored = true;
      for (const p of FILES) if ((await readFile(p)) !== snapshot[p]) { restored = false; await writeFile(p, snapshot[p]).catch(() => null); }
      if (!restored) await api.corpus.reload().catch(() => null);
      if (tmp) await tmp.delete().catch(() => null);
      if (worldItem) await worldItem.delete().catch(() => null);
      try { if (app) { app.sheet = null; await app.close(); } } catch { /* fine */ }
    }
    const after = houseIds();
    results.push({ name: '§11 House is as it was', pass: JSON.stringify(after) === JSON.stringify(before), detail: `${before.length} → ${after.length}` });
    return { results };
  }, { fx: fixture });
  // the greyed reasons under a real mouse, from outside the page
  out.results.push(...await hoverChecks(f));
  report('screens', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[screens] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
