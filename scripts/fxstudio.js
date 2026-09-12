// FX Studio — entry point. Loads the corpora (the stock per kind, the house FX, the starters,
// the frozen asset table if any), indexes them by subject key, listens to the
// table through the dnd5e reader and plays what the corpus answers through the engine. Exposes the
// authoring API on game.modules.get('fvtt-mod-fxstudio').api. Wires the layers and nothing else.
import { MODULE_ID, SETTINGS, clearOldBuffers, logging, oldBufferFx, playing, registerSettings } from './settings.js';
import { writeFx } from './files.js';
import { buildIndex } from './core/corpus.js';
import { heldUntil, registerGate } from './core/gates.js';
import { registerReader } from './readers/dnd5e.js';
import { battleflowGate, registerBattleflowReader } from './readers/battleflow.js';
import { endPicturesOf, play, useSettings } from './engine/render.js';
import { makeApi } from './api.js';
import { registerScreens } from './ui/index.js';

export { MODULE_ID };
const log = (...a) => console.log('FX Studio |', ...a);

const STOCK_FILES = ['spells', 'weapons', 'natural', 'features', 'items', 'effects'];
const state = { corpora: { stock: [], house: [], starters: [], frozen: null }, index: null, rebuild, reload, open: null };

async function loadJson(path, { fresh = false } = {}) {
  const r = await fetch(`modules/${MODULE_ID}/${path}${fresh ? `?t=${Date.now()}` : ''}`, fresh ? { cache: 'no-store' } : {});
  if (!r.ok) throw new Error(`FX Studio: cannot load ${path} (${r.status})`);
  return r.json();
}

function rebuild() {
  state.index = buildIndex({ stock: state.corpora.stock, house: state.corpora.house, starters: state.corpora.starters });
  for (const p of state.index.problems) console.warn('FX Studio |', p);
  Hooks.callAll('fxstudio.rebuilt', state.index);
  return state.index;
}

/**
 * The dispatcher: one place where a moment becomes a picture, and the one place a HOLD is asked
 * about. Every gate (core/gates.js) is asked once, before the moment plays; nothing registered —
 * which is every table without a module that holds — is the straight road, unchanged.
 */
async function dispatch(moment) {
  const held = heldUntil(moment, { log });
  if (held) {
    log(`${moment.subject?.name ?? moment.id}: held by ${held.names.join(', ')} — waiting`);
    if (!(await held.wait)) return;
  }
  await play(state.index ?? rebuild(), moment);
}

Hooks.once('init', () => {
  registerSettings();
  state.open = registerScreens({ moduleId: MODULE_ID });
  useSettings({ playing, logging });
  // Battle Flow, when the table has it: it holds a cast while its caster answers a question the
  // area raised, and the picture plays when the answer does. Not installed — no gate, no wait.
  registerGate('Battle Flow', battleflowGate);
  const dispatchSafely = (moment) => dispatch(moment).catch((e) => console.error('FX Studio |', e));
  registerReader({ dispatch: dispatchSafely, end: (origin, token) => endPicturesOf(origin, token) });
  // Battle Flow's moments, the other direction (readers/battleflow.js): the resolves that post no
  // card — a maneuver die, Sneak Attack, a hold answered — published on a hook nobody has to listen
  // to. Not installed → the hook never fires; the road it takes here is the same dispatcher.
  registerBattleflowReader({ dispatch: dispatchSafely });
});

/** the corpora as the module's files hold them; `fresh` reads the server past the browser's cache (after a ship) */
async function loadCorpora(fresh = false) {
  const o = { fresh };
  const files = await Promise.all(STOCK_FILES.map((k) => loadJson(`recipes/stock/${k}.json`, o).catch((e) => (log(e.message), { fx: [] }))));
  state.corpora.stock = files.flatMap((f) => f.fx ?? []);
  state.corpora.house = (await loadJson('recipes/house.json', o).catch(() => ({ fx: [] }))).fx ?? [];
  state.corpora.starters = (await loadJson('recipes/starters.json', o).catch(() => ({ fx: [] }))).fx ?? [];
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
  log(`corpus ready: ${state.corpora.stock.length} stock FX, ${state.corpora.house.length} house FX, ${state.corpora.starters.length} starters`);
});

// The frozen asset table: what the migration could not point at the libraries' own paths, kept
// verbatim with its metadata and registered under fxstudio.* — counted, and meant to reach zero.
Hooks.on('sequencer.ready', () => {
  const frozen = state.corpora.frozen;
  if (!frozen?.db || !Object.keys(frozen.db).some((k) => !k.startsWith('_'))) return;
  Sequencer.Database.registerEntries('fxstudio', frozen.db, true);
  log(`registered the frozen asset table (${frozen.meta?.entries ?? '?'} entries the libraries do not hold natively)`);
});

/**
 * The old world buffer, folded into the files ONCE (the draft layer is gone, 2026-09-12). A GM's
 * client at ready: every FX the setting still holds goes into the corpus it was staged for (House
 * when it was a plain Draft), the setting is emptied, the corpora are read again. Nothing is lost
 * and nothing is asked: what played from the buffer plays from the file now.
 */
async function drainBuffer() {
  if (!game.user?.isGM) return 0;
  const held = oldBufferFx();
  if (!held.length) return 0;
  let n = 0;
  for (const { fx, to } of held) {
    const { to: _staged, ...plain } = fx;
    try { await writeFx(plain, to); n++; } catch (e) { console.warn('FX Studio | the old buffer held an FX that could not be written to its file:', fx.id, e.message); }
  }
  await clearOldBuffers();
  if (n) await reload();
  return n;
}

Hooks.once('ready', async () => {
  game.modules.get(MODULE_ID).api = makeApi(state);
  game.modules.get(MODULE_ID).api.SETTINGS = SETTINGS;
  drainBuffer().then((n) => { if (n) log(`the old world buffer was folded into the corpus files: ${n} FX`); }).catch((e) => console.error('FX Studio |', e));
});
