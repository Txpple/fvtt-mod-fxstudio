// THE COVERAGE TAB'S ROWS, offline (DESIGN 28.6): the tab's own row logic (scripts/ui/coverage.js)
// driven through the real API (scripts/api.js makeApi) over the recipes on disk, with the two files
// it fetches read from recipes/ and a census of stand-in actors. No Foundry, a second or two.
//
//   1. the judgement file: one entry per gap, the count gaps.mjs counts, every basis an FX that
//      exists, every reason one of the closed list
//   2. Check on the Compendiums scope with every pack picked agrees with gaps.mjs to the number,
//      pack by pack too
//   3. My actors: items, natural attacks and effects, each row saying why from the proposals, the
//      moment rule or the ledger
//   4. the doors the rows emit (the acts studio.js routes) and no raw key in a tooltip
//   5. the books offered are the records' packs and nothing else
//
//   node tools/check-coverage.mjs [--section <n|word>] [--quiet]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, RECIPES, toUrl } from './lib/env.mjs';
import { harness } from './lib/check.mjs';
import { readRecipes } from './lib/recipes.mjs';
import { REASONS, collectionOf as toolCollectionOf } from './lib/gaps.mjs';
import { CREATURE_PACKS, LIST_PACKS } from './lib/dnd5e.mjs';

// ── Foundry's globals, as little as the modules touch at import and at call ──────────────────
const MODULE_ID = 'fvtt-mod-fxstudio';
let theApi = null;
globalThis.Hooks = { once() {}, on() {}, callAll() {} };
globalThis.game = { settings: { get() {}, register() {}, registerMenu() {} }, modules: { get: () => ({ api: theApi, version: '0.0.0' }) }, user: { name: 'GM' }, users: [], actors: { contents: [] } };
globalThis.foundry = { applications: { api: { ApplicationV2: class { constructor() {} render() {} }, DialogV2: { confirm: async () => false } } } };
globalThis.Sequencer = { Database: { entryExists: () => false, getPathsUnder: () => [], getEntry: () => null }, EffectManager: { getEffects: () => [] } };
globalThis.Item = class {};
globalThis.CONFIG = { DND5E: {} };
globalThis.fromUuidSync = () => null;
// the two files the screens fetch, read off disk from the module's own folder
globalThis.fetch = async (url) => {
  const path = String(url).replace(new RegExp(`^modules/${MODULE_ID}/`), '').split('?')[0];
  try { const text = readFileSync(join(REPO, path), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(text) }; }
  catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const { makeApi } = await import(toUrl(join(REPO, 'scripts/api.js')));
const { buildIndex } = await import(toUrl(join(REPO, 'scripts/core/corpus.js')));
const { ledger } = await import(toUrl(join(REPO, 'scripts/engine/render.js')));
const cov = await import(toUrl(join(REPO, 'scripts/ui/coverage.js')));

const recipes = readRecipes();
const corpora = { stock: recipes.stock, house: recipes.house, starters: recipes.starters };
const state = { index: buildIndex(corpora), corpora, rebuild() {}, reload: async () => {}, open: () => null };
theApi = makeApi(state);
const a = theApi;

const t = harness('the Coverage tab says why every row is there, and its Check agrees with gaps.mjs');
const file = JSON.parse(readFileSync(join(RECIPES, 'proposals.json'), 'utf8'));
const records = recipes.records;
const answered = new Set([...recipes.stock, ...recipes.house].map((fx) => fx.for?.[0]).filter(Boolean));
// gaps.mjs's own rule, word for word: every addressed key no FX answers
const gapKeys = Object.keys(records).filter((k) => !answered.has(k));

// ── 1 ──────────────────────────────────────────────────────────────────────────────────────────
if (t.section('the judgement file')) {
  const entries = Object.entries(file.proposals ?? {});
  t.is('one entry per gap: as many as gaps.mjs counts', entries.length, gapKeys.length);
  t.is('its _meta says the same count', file._meta?.gaps, gapKeys.length);
  t.same('every gap has its entry and no entry is anything else', entries.map(([k]) => k).sort(), [...gapKeys].sort());
  const c = file._meta?.counts ?? {};
  t.is('proposed + none + open is every gap', (c.proposed ?? 0) + (c.none ?? 0) + (c.open ?? 0), gapKeys.length);
  t.same('the reasons in the file are the closed list', file._meta?.reasons, REASONS);
  const badStatus = entries.filter(([, e]) => !['proposed', 'none', 'open'].includes(e.status)).map(([k]) => k);
  t.same('every status is proposed, none or open', badStatus, []);
  const badBasis = entries.filter(([, e]) => e.status === 'proposed' && !a.fx.get(e.basis)).map(([k, e]) => `${k} → ${e.basis}`);
  t.same('every proposal\'s basis names an FX that exists', badBasis, []);
  const noBasis = entries.filter(([, e]) => e.status === 'proposed' && !e.basis).map(([k]) => k);
  t.same('every proposal carries a basis', noBasis, []);
  const badReason = entries.filter(([, e]) => e.status === 'none' && !Object.hasOwn(REASONS, e.reason)).map(([k, e]) => `${k}: ${e.reason}`);
  t.same('every judged entry gives a reason from the closed list', badReason, []);
  const stray = entries.filter(([, e]) => e.status !== 'none' && e.reason).map(([k]) => k);
  t.same('only a judged entry gives a reason', stray, []);
  await a.proposals.read();
  t.ok('api.proposals reads the file lazily and says it is loaded', a.proposals.loaded && a.proposals.ready());
  t.same('api.proposals.get gives the whole shape, the empty fields as empty words', a.proposals.get('item:tinderbox'), { status: 'none', reason: 'mundane', basis: '', sentence: 'Mundane gear — nothing to play.', vfxFit: '', sfxFit: '', vfx: '', sfx: '' });
  t.is('a key that is no gap has no entry', a.proposals.get('spell:fire-bolt'), null);
  const shield = a.proposals.get('spell:shield');
  t.ok('spell:shield is judged: the Shield effect plays the barrier (DESIGN 28.8)', shield?.status === 'none' && /^The Shield effect plays the barrier/.test(shield.sentence), JSON.stringify(shield));
}

// ── 2 ──────────────────────────────────────────────────────────────────────────────────────────
if (t.section('Check on the Compendiums scope agrees with gaps.mjs')) {
  await a.records.read();
  const all = new Set(a.proposals.packs().map((p) => p.id));
  const r = cov.bookRows(a, all);
  t.is('every pack picked: Abilities is every record', r.asked, Object.keys(records).length);
  t.is('every pack picked: No FX is gaps.mjs\'s count', r.asked - r.answered, gapKeys.length);
  t.is('every pack picked: With FX is the keys the corpus answers', r.answered, Object.keys(records).length - gapKeys.length);
  const c = file._meta.counts;
  t.is('the rows with a proposal are the file\'s proposals', r.counts.proposal, c.proposed);
  t.is('the judged rows are the file\'s judgements', r.counts.judged, c.none);
  t.is('the open rows are the file\'s open entries', r.counts.none + r.counts.off, c.open);
  t.is('one row per gap (no ledger yet)', r.groups.reduce((n, g) => n + g.rows.length, 0), gapKeys.length);
  const off = [];
  for (const p of a.proposals.packs()) {
    const one = cov.bookRows(a, new Set([p.id]));
    if (one.asked - one.answered !== p.gaps || one.asked !== p.keys) off.push(`${p.label}: the file says ${p.gaps} of ${p.keys}, the tab ${one.asked - one.answered} of ${one.asked}`);
  }
  t.same(`pack by pack (${a.proposals.packs().length}), each picked alone agrees with the file's count for it`, off, []);
  const phb = cov.bookRows(a, new Set(['dnd-players-handbook.spells']));
  t.is('the PHB spells alone: 1 with no FX, the Shield spell (judged): the party batch took seven spells and the Prone effect, the second batch the 235 others', phb.asked - phb.answered, 1);
  const row = phb.groups[0].rows.find((x) => x.key === 'spell:shield');
  t.ok('the Shield spell is a row, judged, saying the effect plays the barrier', row?.st === 'judged' && /Shield effect plays the barrier/.test(row.words), JSON.stringify(row));
  let agree = 0;
  for (const rec of Object.values(records)) if (cov.collectionOf(rec.uuid) === toolCollectionOf(rec.uuid)) agree++;
  t.is('the tab and the tools read a record\'s pack the same way', agree, Object.keys(records).length);
}

// ── 3 ──────────────────────────────────────────────────────────────────────────────────────────
/** a stand-in item the way Foundry hands the census one */
const item = (actor, { name, type, identifier = null, natural = false, acts = 1 }) => ({
  name, type, id: name.toLowerCase().replace(/\W+/g, '-'), uuid: `${actor}.Item.${name.toLowerCase().replace(/\W+/g, '-')}`,
  system: { identifier, type: natural ? { value: 'natural' } : type === 'weapon' ? { value: 'simpleM' } : undefined, properties: new Set(), activities: { contents: Array.from({ length: acts }, (_, i) => ({ id: `a${i}`, type: type === 'weapon' ? 'attack' : 'utility', target: { template: { type: '' } } })) } },
});
const effect = (actor, { name, transfer = false, temporary = false }) => ({ name, id: name, uuid: `${actor}.ActiveEffect.${name}`, transfer, isTemporary: temporary, disabled: false, origin: null, system: { origin: {} } });
const cecil = {
  name: 'Cecil Stand-in', type: 'character', uuid: 'Actor.cecil',
  items: [
    item('Actor.cecil', { name: 'Candle of the Deep', type: 'consumable', acts: 2 }),
    item('Actor.cecil', { name: 'Tinderbox', type: 'tool' }),
    item('Actor.cecil', { name: 'Shield', type: 'spell' }),
    item('Actor.cecil', { name: 'Fire Bolt', type: 'spell' }),
    item('Actor.cecil', { name: 'Rusty Hook', type: 'weapon', acts: 0 }),
    item('Actor.cecil', { name: 'Strange Blade', type: 'weapon' }),
  ],
  allApplicableEffects: () => [
    effect('Actor.cecil', { name: 'Adept', transfer: true }),
    effect('Actor.cecil', { name: 'Glowing Hum', transfer: true }),
    effect('Actor.cecil', { name: 'Odd Flicker', temporary: true }),
    effect('Actor.cecil', { name: 'Adept', transfer: true }),
  ],
};
const grimlock = { name: 'Grimlock Stand-in', type: 'npc', uuid: 'Actor.grim', items: [item('Actor.grim', { name: 'Makeshift Axe', type: 'weapon', natural: true })], allApplicableEffects: () => [] };
const census = a.census({ actors: [grimlock, cecil] });
ledger.length = 0;
ledger.unshift({ at: Date.UTC(2026, 0, 1, 14, 2), when: 'use', subject: 'Fire Bolt', keys: ['spell:fire-bolt'], fx: 'fire-bolt', key: 'spell:fire-bolt', source: 'stock', played: false, why: 'nothing to play (no targets, or the token already carries it)', files: [], sounds: [] });

if (t.section('My actors: why each row is there')) {
  const it = census.actors.find((x) => x.name === 'Cecil Stand-in');
  t.ok('the census carries each item\'s kind and how many activities it has', it.items.every((x) => typeof x.kind === 'string' && Number.isInteger(x.activities)));
  t.is('a natural attack is listed with the items as itself', census.actors.find((x) => x.name === 'Grimlock Stand-in').items[0].kind, 'natural');
  t.ok('an effect row carries its uuid and whether it sits on its owner and for how long', it.effects.every((e) => e.uuid && e.kind === 'effect' && typeof e.transfer === 'boolean' && typeof e.temporary === 'boolean'));
  const r = cov.actorRows(a, census);
  const by = Object.fromEntries(r.groups.flatMap((g) => g.rows).map((x) => [x.name, x]));
  t.is('a character is listed before an npc', r.groups[0].head.startsWith('Cecil Stand-in'), true);
  t.ok('the Candle of the Deep has a proposal, copied from an FX that exists', by['Candle of the Deep']?.st === 'proposal' && !!a.fx.get(by['Candle of the Deep'].from) && by['Candle of the Deep'].note === 'Sure · Likely', JSON.stringify(by['Candle of the Deep']));
  t.ok('the Tinderbox is judged: mundane gear', by.Tinderbox?.st === 'judged' && by.Tinderbox.note === REASONS.mundane, JSON.stringify(by.Tinderbox));
  t.ok('the Shield spell is judged: the effect plays the barrier', by.Shield?.st === 'judged' && /Shield effect plays the barrier/.test(by.Shield.words), JSON.stringify(by.Shield));
  t.ok('Fire Bolt has an FX that played nothing: the engine\'s why and its time from the ledger', by['Fire Bolt']?.st === 'ledger' && /no targets/.test(by['Fire Bolt'].words) && /Fire Bolt/.test(by['Fire Bolt'].note), JSON.stringify(by['Fire Bolt']));
  t.ok('a weapon with no activity and no row is judged by the moment rule', by['Rusty Hook']?.st === 'judged' && by['Rusty Hook'].reason === 'no-activity', JSON.stringify(by['Rusty Hook']));
  t.ok('a weapon with an activity and no row is open: no row in the gap table yet', by['Strange Blade']?.st === 'none', JSON.stringify(by['Strange Blade']));
  t.ok('the Makeshift Axe, a natural attack, is answered by its Stock FX: no row', !by['Makeshift Axe'] && !!a.fx.get('makeshift-axe'), JSON.stringify(by['Makeshift Axe']));
  t.ok('an effect the file judged is judged: always on', by.Adept?.st === 'judged' && by.Adept.reason === 'always-on', JSON.stringify(by.Adept));
  t.ok('an effect with no row that sits on its owner for good is judged by the moment rule', by['Glowing Hum']?.st === 'judged' && by['Glowing Hum'].reason === 'always-on', JSON.stringify(by['Glowing Hum']));
  t.ok('an effect with no row put on for a time is open', by['Odd Flicker']?.st === 'none', JSON.stringify(by['Odd Flicker']));
  t.is('an effect a sheet carries twice is one row', r.groups[0].rows.filter((x) => x.name === 'Adept').length, 1);
  t.is('Abilities counts the items and the effects once each', r.asked, 6 + 3 + 1);
  t.is('With FX counts what answers (Fire Bolt, the Makeshift Axe)', r.answered, 2);
  t.same('the rows by why', r.counts, { proposal: 1, judged: 5, none: 2, off: 0, ledger: 1 });
}

// ── 4 ──────────────────────────────────────────────────────────────────────────────────────────
const app = { view: { tab: 'coverage' }, census, element: null, rendered: false, render: async () => {} };
if (t.section('the doors the rows emit')) {
  const html = cov.renderCoverage(app);
  const drum = /<div class="cvrow" data-st="proposal">(?:(?!<div class="cvrow").)*?Candle of the Deep(?:(?!<div class="cvrow").)*/s.exec(html)?.[0] ?? '';
  const basis = a.proposals.get('item:candle-of-the-deep').basis;
  t.ok('a proposal\'s door opens the Editor with the basis copied in', drum.includes(`data-act="key" data-key="item:candle-of-the-deep" data-from="${basis}"`), drum.slice(0, 300));
  const tinder = /<div class="cvrow" data-st="judged">(?:(?!<div class="cvrow").)*?Tinderbox(?:(?!<div class="cvrow").)*/s.exec(html)?.[0] ?? '';
  t.ok('a judged item on an actor keeps its door: entry, its uuid, create', /data-act="entry" data-uuid="Actor\.cecil\.Item\.tinderbox" data-create="1"/.test(tinder), tinder.slice(0, 300));
  const flicker = /<div class="cvrow" data-st="none">(?:(?!<div class="cvrow").)*?Odd Flicker(?:(?!<div class="cvrow").)*/s.exec(html)?.[0] ?? '';
  t.ok('an effect\'s door is its key', /data-act="key" data-key="effect:odd-flicker"/.test(flicker) && !/data-from/.test(flicker), flicker.slice(0, 300));
  const acts = [...html.matchAll(/data-act="([^"]+)"/g)].map((m) => m[1]);
  const foreign = [...new Set(acts.filter((x) => !['entry', 'key', 'import-fx', 'co-check'].includes(x) && !x.startsWith('cv-')))];
  t.same('every act is one the window routes: entry, key, import-fx, co-check, cv-*', foreign, []);
  const tips = [...html.matchAll(/data-tooltip="([^"]*)"/g)].map((m) => m[1]);
  const raw = tips.filter((x) => /\b(spell|weapon|natural|feature|item|effect|event):[a-z0-9]/.test(x));
  t.same('no tooltip a GM reads carries a raw key', raw, []);
  t.ok('Maintain is a disclosure holding Import, Import to Stock and the corpus check', /<details class="cvmaint"[^>]*>[\s\S]*data-act="import-fx" data-to="house"[\s\S]*data-act="import-fx" data-to="stock"[\s\S]*data-act="co-check"/.test(html));
  t.ok('the repo note has left the GM\'s screen', !/pull the files into the repo/.test(html));
  t.ok('the four tiles keep their addresses', /Abilities[\s\S]*With FX[\s\S]*No FX[\s\S]*Errors/.test(html));
  app.cvv.q = 'candle';
  const searched = cov.renderCoverage(app);
  t.is('the search narrows the rows', (searched.match(/<div class="cvrow"/g) ?? []).length, 1);
  app.cvv.q = '';
  app.cvv.shown.delete('judged');
  const filtered = cov.renderCoverage(app);
  t.ok('a filter hides its rows', !/data-st="judged"/.test(filtered) && /data-st="proposal"/.test(filtered));
  app.cvv.shown.add('judged');
  // the Compendiums scope, every pack read
  Object.assign(app.cvv, { scope: 'books', picking: false, chosen: new Set(a.proposals.packs().map((p) => p.id)) });
  app.cvv.books = cov.bookRows(a, app.cvv.chosen);
  const books = cov.renderCoverage(app);
  t.ok('the No FX tile on every pack reads gaps.mjs\'s count', books.includes(`<div class="num">${gapKeys.length.toLocaleString('en-US')}</div><div class="l">No FX</div>`));
  const shieldRow = /<div class="cvrow" data-st="judged">(?:(?!<div class="cvrow").)*?>Shield<(?:(?!<div class="cvrow").)*/s.exec(books)?.[0] ?? '';
  t.ok('a record judged to need no FX keeps a door: its key', /data-act="key" data-key="spell:shield"/.test(shieldRow), shieldRow.slice(0, 300));
  t.ok('a page of rows and Load more for the rest', /data-act="cv-more"/.test(books) && (books.match(/<div class="cvrow"/g) ?? []).length === 200);
}

// ── 5 ──────────────────────────────────────────────────────────────────────────────────────────
if (t.section('the books offered')) {
  const packs = a.proposals.packs();
  const ids = new Set(packs.map((p) => p.id));
  const used = new Set(Object.values(records).map((r) => cov.collectionOf(r.uuid)));
  t.same('every pack a record lives in is offered', [...used].filter((x) => !ids.has(x)), []);
  t.ok('no SRD 5.1 pack is offered (the system\'s packs offered are its 2024 ones)', packs.filter((p) => p.id.startsWith('dnd5e.')).every((p) => /24$/.test(p.id)), packs.filter((p) => p.id.startsWith('dnd5e.')).map((p) => p.id).join(', '));
  const listed = new Set([...LIST_PACKS, ...CREATURE_PACKS].map(([, pack]) => pack));
  t.same('every pack offered is a LIST_PACKS or CREATURE_PACKS pack, or this world\'s own items', packs.filter((p) => p.id !== 'world' && !listed.has(p.id.split('.').slice(1).join('.'))).map((p) => p.id), []);
  t.ok('no world compendium is offered', packs.every((p) => !p.id.startsWith('world.')));
  app.cvv.scope = 'books'; app.cvv.picking = true;
  const picker = cov.renderCoverage(app);
  t.is('the picker offers exactly the file\'s packs', (picker.match(/data-act="cv-book"/g) ?? []).length, packs.length);
}

t.done();
