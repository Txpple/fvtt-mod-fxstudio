// FX Studio — entry point. Loads the corpora (the baseline per kind, the house looks, the starters,
// the frozen asset table if any) and the world buffer, indexes them by subject key, listens to the
// table through the dnd5e reader and plays what the corpus answers through the engine. Exposes the
// authoring API on game.modules.get('fvtt-mod-fxstudio').api. Wires the layers and nothing else.
import { MODULE_ID, SETTINGS, getWorldLooks, logging, playing, registerSettings } from './settings.js';
import { buildIndex } from './core/corpus.js';
import { registerReader } from './readers/dnd5e.js';
import { endPicturesOf, play, useSettings } from './engine/render.js';
import { makeApi } from './api.js';
import { registerScreens } from './ui/index.js';

export { MODULE_ID };
const log = (...a) => console.log('FX Studio |', ...a);

const BASELINE_FILES = ['spells', 'weapons', 'natural', 'features', 'items', 'effects'];
const state = { corpora: { baseline: [], house: [], starters: [], frozen: null }, index: null, rebuild, open: null };

async function loadJson(path) {
  const r = await fetch(`modules/${MODULE_ID}/${path}`);
  if (!r.ok) throw new Error(`FX Studio: cannot load ${path} (${r.status})`);
  return r.json();
}

function rebuild() {
  state.index = buildIndex({ baseline: state.corpora.baseline, house: state.corpora.house, world: getWorldLooks(), starters: state.corpora.starters });
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

Hooks.once('setup', async () => {
  const files = await Promise.all(BASELINE_FILES.map((k) => loadJson(`recipes/baseline/${k}.json`).catch((e) => (log(e.message), { looks: [] }))));
  state.corpora.baseline = files.flatMap((f) => f.looks ?? []);
  state.corpora.house = (await loadJson('recipes/house.json').catch(() => ({ looks: [] }))).looks ?? [];
  state.corpora.starters = (await loadJson('recipes/starters.json').catch(() => ({ looks: [] }))).looks ?? [];
  state.corpora.frozen = await loadJson('recipes/aa-assets.json').catch(() => null);
  rebuild();
  log(`corpus ready: ${state.corpora.baseline.length} baseline looks, ${state.corpora.house.length} house looks, ${getWorldLooks().length} in the world buffer, ${state.corpora.starters.length} starters`);
});

// The frozen asset table: what the migration could not point at the libraries' own paths, kept
// verbatim with its metadata and registered under fxstudio.* — counted, and meant to reach zero.
Hooks.on('sequencer.ready', () => {
  const frozen = state.corpora.frozen;
  if (!frozen?.db || !Object.keys(frozen.db).some((k) => !k.startsWith('_'))) return;
  Sequencer.Database.registerEntries('fxstudio', frozen.db, true);
  log(`registered the frozen asset table (${frozen.meta?.entries ?? '?'} entries the libraries do not hold natively)`);
});

Hooks.once('ready', () => {
  game.modules.get(MODULE_ID).api = makeApi(state);
  game.modules.get(MODULE_ID).api.SETTINGS = SETTINGS;
});
