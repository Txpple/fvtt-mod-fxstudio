// The screens, live on the sandbox (phase 3's exit): a person's round trip through the window,
// driven on the DOM — look an ability up and read its sentence; type a spell the sheet does not
// know yet; give it a look like Misty Step but black through the editor's pickers; save; read it
// on the Custom looks screen with who wrote it; count it on the Check screen; give one item its own
// look (the item pointer) and take it back; switch a look off and back on; find the button on the
// item sheet. Builds and tears down its own fixture; leaves the world buffer as it found it.
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
    const api = game.modules.get('fvtt-mod-fxstudio').api;
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
    const choose = async (sel, value) => { const el = $(sel); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); await sleep(150); };
    const text = (sel) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    try {
      // 1 · the window opens on an item and reads its sentence
      const misty = caster.actor.items.getName('Misty Step');
      app = api.open({ item: misty });
      await sleep(600);
      ok('§1 the window opens with its three tabs', app?.rendered && $$('[role=tab]').length === 3, `${$$('[role=tab]').length} tabs`);
      ok('§1 Look up shows Misty Step as a sentence, and why', /Misty Step · when used/.test(text('.sentence')) && /has a look for that/.test(text('.why')), `${text('.sentence')} | ${text('.why')}`);
      ok('§1 the card says whose sheet it is on and what it is', /FX Test Caster/.test(text('.owner')) && /the spell Misty Step/.test(text('.owner')), text('.owner'));

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

      // 3 · the editor: like Misty Step but black
      await click('[data-act="change"]');
      ok('§3 the editor opens on a starter', $('.editor')?.dataset.open === 'true' && /bolt/i.test($('.ed-like')?.value ?? ''), $('.ed-like')?.value);
      await type('.ed-like', 'misty step');
      const like = $$('.editor .suggest .hit').find((h) => h.dataset.id === 'misty-step');
      ok('§3 the Start-from box offers the Misty Step look', !!like, $$('.editor .suggest .hit').map((h) => h.dataset.id).join(', '));
      await click(like);
      const colours = $$('.ed-colour option').map((o) => o.value);
      ok('§3 the colour picker lists the family\'s own colours, dark black among them', colours.includes('dark_black') && colours.includes('blue'), colours.join(', '));
      await choose('.ed-colour', 'dark_black');
      ok('§3 the draft reads back as the sentence, in black, before anything is saved', /dark black/.test(text('.editor .preview')) && /Sharran Step · when used/.test(text('.editor .preview')) && !/blue/.test(text('.editor .preview')), text('.editor .preview'));
      ok('§3 nothing has been saved yet', api.looks.buffer().length === before.length, `${api.looks.buffer().length}`);

      // 4 · save
      await click('[data-act="save"]');
      await sleep(400);
      const saved = api.looks.buffer().find((l) => l.id === 'sharran-step');
      if (saved) made.push(saved.id);
      ok('§4 Save writes the one-line look to the world buffer with provenance', saved && saved.like === 'misty-step' && saved.with?.colour === 'dark_black' && saved.for?.[0] === 'spell:sharran-step' && saved.by === game.user.name && /^\d{4}-\d{2}-\d{2}$/.test(saved.at), JSON.stringify(saved));
      ok('§4 the card now shows the custom look', /custom look/.test(text('.status')) && /dark black/.test(text('.sentence')), `${text('.status')} | ${text('.sentence')}`);
      ok('§4 the spell resolves to it from the world layer', api.resolve(tmp).look?.id === 'sharran-step' && api.resolve(tmp).source === 'world', api.resolve(tmp).source);
      const r5 = api.sentenceFor(tmp);
      ok('§4 the API reads the same sentence the screen shows', r5.sentence === text('.sentence'), `${r5.sentence} | ${text('.sentence')}`);

      // 5 · Custom looks lists it, newest first, with who wrote it
      await click('[data-tab="custom"]');
      const firstRow = $('.list .row');
      ok('§5 Custom looks lists Sharran Step first, tagged as written here, with the author', firstRow && /Sharran Step/.test(firstRow.textContent) && /written here/.test(firstRow.textContent) && firstRow.textContent.includes(game.user.name), firstRow?.textContent.replace(/\s+/g, ' ').slice(0, 200));
      await type('.fx-cq', 'sharran');
      await sleep(400);
      ok('§5 the search narrows the list', $$('.list .row').length === 1, `${$$('.list .row').length} rows`);

      // 6 · Check counts it
      await click('[data-tab="check"]');
      const tiles = $$('.tile').map((t) => t.textContent.replace(/\s+/g, ' ').trim());
      ok('§6 Check shows the tiles, one of them the buffer', tiles.length === 6 && tiles.some((t) => /written in this world/.test(t) && new RegExp(`^${api.looks.buffer().length}written`).test(t)), tiles.join(' | '));
      ok('§6 Check lists what played last from the ledger', !!$('.list .row') || /Nothing has played/.test(text('[data-pane="check"]')), '');

      // 7 · one item's own look (the pointer), from the item sheet's door
      api.open({ item: tmp });
      await sleep(300);
      await click('[data-act="change"]');
      const only = $('[data-act="ed-only"]');
      ok('§7 the editor offers "only this one" for an item on a sheet', !!only && /only this one/.test(only.textContent), only?.textContent);
      await click(only);
      await type('.ed-like', 'misty step');
      await click($$('.editor .suggest .hit').find((h) => h.dataset.id === 'misty-step'));
      await choose('.ed-colour', 'purple');
      await click('[data-act="save"]');
      await sleep(400);
      const own = api.looks.buffer().find((l) => l.id === 'sharran-step-fx-test-caster');
      if (own) made.push(own.id);
      const flag = tmp.getFlag('fvtt-mod-fxstudio', 'look');
      ok('§7 the item now points at a look of its own, keyed to nothing', own && own.for?.length === 0 && flag === own.id, `flag ${flag} · ${JSON.stringify(own)}`);
      const r7 = api.sentenceFor(tmp);
      ok('§7 the item plays its own look ahead of the spell\'s, and says so', r7.look?.id === own?.id && /look of its own/.test(r7.why) && /purple/.test(r7.sentence), `${r7.sentence} | ${r7.why}`);
      const other = await caster.actor.createEmbeddedDocuments('Item', [{ name: 'Sharran Step', type: 'spell', system: { level: 2, school: 'con' } }]);
      const r7b = api.sentenceFor(other[0]);
      ok('§7 another copy of the spell still plays the spell\'s look', r7b.look?.id === 'sharran-step' && /dark black/.test(r7b.sentence), r7b.sentence);
      await other[0].delete();
      ok('§7 the card offers to go back to the look it had', /Back to the look it had/.test(text('.actions')), text('.actions'));
      await click('[data-act="remove"]');
      await sleep(400);
      ok('§7 back: the pointer is gone and the spell\'s look answers again', !tmp.getFlag('fvtt-mod-fxstudio', 'look') && !api.looks.buffer().some((l) => l.id === own?.id) && api.resolve(tmp).look?.id === 'sharran-step', api.resolve(tmp).look?.id);

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

      // 9 · the item sheet's button
      const sheet = misty.sheet;
      await sheet.render({ force: true });
      await sleep(800);
      const control = sheet.element?.querySelector('.window-header [data-action="fxstudio"]');
      ok('§9 the item sheet carries the FX Studio button in its header', !!control, control ? 'found' : `not found among ${[...(sheet.element?.querySelectorAll('.header-control') ?? [])].map((c) => c.dataset.action).join(', ')}`);
      const entries = [...sheet._getHeaderControlContextEntries()].map((e) => e.name);
      ok('§9 the controls dropdown on the sheet lists it too', entries.includes('FX Studio'), entries.join(', '));
      await app.close();
      control?.click();
      await sleep(600);
      app = api.open({});
      ok('§9 the button opens the window on that item', app?.rendered && /Misty Step/.test(text('.result h2')), text('.result h2'));
      await sheet.close();
    } finally {
      for (const id of made) if (api.looks.buffer().some((l) => l.id === id)) await api.looks.remove(id).catch(() => null);
      if (tmp) await tmp.delete().catch(() => null);
      try { await app?.close(); } catch { /* fine */ }
    }
    const after = api.looks.buffer().map((l) => l.id);
    results.push({ name: '§10 the world buffer is as it was', pass: JSON.stringify(after) === JSON.stringify(before), detail: `${before.length} → ${after.length}` });
    return { results };
  }, { fx: fixture });
  report('screens', out, null);
} finally {
  if (fixture) { const d = await f.evaluate(fixtureDown, { ...fixture, since }).catch((e) => ({ error: e.message })); console.log(`[screens] teardown: ${JSON.stringify(d)}`); }
  await dispose();
}
