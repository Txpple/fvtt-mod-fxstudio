// FX Studio — entry point. Loads the corpora (the stock per kind, the house FX, the starters,
// the frozen asset table if any) and the world buffer, indexes them by subject key, listens to the
// table through the dnd5e reader and plays what the corpus answers through the engine. Exposes the
// authoring API on game.modules.get('fvtt-mod-fxstudio').api. Wires the layers and nothing else.
import { MODULE_ID, SETTINGS, carryOverLegacyBuffer, getWorldFx, logging, playing, registerSettings } from './settings.js';
import { buildIndex } from './core/corpus.js';
import { registerReader } from './readers/dnd5e.js';
import { endPicturesOf, play, useSettings } from './engine/render.js';
import { makeApi } from './api.js';
import { registerScreens } from './ui/index.js';

export { MODULE_ID };
const log = (...a) => console.log('FX Studio |', ...a);

const STOCK_FILES = ['spells', 'weapons', 'natural', 'features', 'items', 'effects'];
const state = { corpora: { stock: [], house: [], starters: [], frozen: null, shipped: [] }, index: null, rebuild, reload, open: null };

async function loadJson(path, { fresh = false } = {}) {
  const r = await fetch(`modules/${MODULE_ID}/${path}${fresh ? `?t=${Date.now()}` : ''}`, fresh ? { cache: 'no-store' } : {});
  if (!r.ok) throw new Error(`FX Studio: cannot load ${path} (${r.status})`);
  return r.json();
}

function rebuild() {
  state.index = buildIndex({ stock: state.corpora.stock, house: state.corpora.house, world: getWorldFx(), starters: state.corpora.starters });
  for (const p of state.index.problems) console.warn('FX Studio |', p);
  Hooks.callAll('fxstudio.rebuilt', state.index);
  return state.index;
}

Hooks.once('init', () => {
  registerSettings();
  state.open = registerScreens({ moduleId: MODULE_ID });
  useSettings({ playing, logging });
  registerReader({
    dispatch: (moment) => play(state.index ?? rebuild(), moment).catch((e) => console.error('FX Studio |', e)),
    end: (origin, token) => endPicturesOf(origin, token),
  });
});

/** the corpora as the module's files hold them; `fresh` reads the server past the browser's cache (after a ship) */
async function loadCorpora(fresh = false) {
  const o = { fresh };
  const files = await Promise.all(STOCK_FILES.map((k) => loadJson(`recipes/stock/${k}.json`, o).catch((e) => (log(e.message), { fx: [] }))));
  state.corpora.stock = files.flatMap((f) => f.fx ?? []);
  state.corpora.house = (await loadJson('recipes/house.json', o).catch(() => ({ fx: [] }))).fx ?? [];
  state.corpora.starters = (await loadJson('recipes/starters.json', o).catch(() => ({ fx: [] }))).fx ?? [];
  state.corpora.shipped = (await loadJson('recipes/shipped.json', o).catch(() => ({ shipped: [] }))).shipped ?? [];
  if (!fresh) state.corpora.frozen = await loadJson('recipes/aa-assets.json').catch(() => null);
}

/** read the corpus files again (a ship wrote them) and rebuild the index */
async function reload() {
  await loadCorpora(true);
  return rebuild();
}

Hooks.once('setup', async () => {
  await loadCorpora();
  rebuild();
  log(`corpus ready: ${state.corpora.stock.length} stock FX, ${state.corpora.house.length} house FX, ${getWorldFx().length} in the world buffer, ${state.corpora.starters.length} starters`);
});

// The frozen asset table: what the migration could not point at the libraries' own paths, kept
// verbatim with its metadata and registered under fxstudio.* — counted, and meant to reach zero.
Hooks.on('sequencer.ready', () => {
  const frozen = state.corpora.frozen;
  if (!frozen?.db || !Object.keys(frozen.db).some((k) => !k.startsWith('_'))) return;
  Sequencer.Database.registerEntries('fxstudio', frozen.db, true);
  log(`registered the frozen asset table (${frozen.meta?.entries ?? '?'} entries the libraries do not hold natively)`);
});

Hooks.once('ready', async () => {
  if (await carryOverLegacyBuffer()) { log('the world buffer was carried over from its old key'); rebuild(); }
  game.modules.get(MODULE_ID).api = makeApi(state);
  game.modules.get(MODULE_ID).api.SETTINGS = SETTINGS;
});
