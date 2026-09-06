// FX Studio — entry point. Loads the two corpora and the world buffer, registers the private
// database twin of Automated Animations' table so every baseline row plays through the same
// Sequencer entries it always did, listens to the table (scripts/reader.js) and plays what the
// corpus answers (scripts/play.js, scripts/presets/). Exposes the resolver and the player on
// game.modules.get('fvtt-mod-fxstudio').api.
import { buildIndex, lookup, rowsNamed, effectiveRows } from './corpus.js';
import { registerSettings, SETTINGS, getWorldRows } from './settings.js';
import { registerReader, readMessage, readRegion, readEffect } from './reader.js';
import { play, build, resolve, ledger, PRESETS } from './play.js';

export const MODULE_ID = 'fvtt-mod-fxstudio';
const log = (...a) => console.log('FX Studio |', ...a);

const state = { baseline: null, house: null, aaDatabase: null, index: null };

async function loadJson(path) {
  const r = await fetch(`modules/${MODULE_ID}/${path}`);
  if (!r.ok) throw new Error(`FX Studio: cannot load ${path} (${r.status})`);
  return r.json();
}

export function rebuildIndex() {
  state.index = buildIndex({ baseline: state.baseline?.rows ?? [], house: state.house?.rows ?? [], world: getWorldRows() });
  return state.index;
}

Hooks.once('init', () => {
  registerSettings();
  registerReader(() => state.index ?? rebuildIndex());
});

Hooks.once('setup', async () => {
  const [baseline, house, aaDatabase] = await Promise.all([
    loadJson('recipes/baseline.json').catch((e) => (log(e.message), { rows: [] })),
    loadJson('recipes/house.json').catch(() => ({ rows: [] })),
    loadJson('recipes/aa-database.json').catch((e) => (log(e.message), null)),
  ]);
  state.baseline = baseline;
  state.house = house;
  state.aaDatabase = aaDatabase;
  rebuildIndex();
  log(`corpus ready: ${baseline.rows.length} baseline rows, ${house.rows.length} house rows, ${getWorldRows().length} in the world buffer`);
});

// The private twin of AA's database: the subset the corpus plays, files pointing at JB2A Patreon,
// metadata and all. Registered under fxstudio.aa so a baseline row's `aa` path resolves to the
// same Sequencer entry AA resolved.
Hooks.on('sequencer.ready', () => {
  if (!state.aaDatabase?.db) return;
  Sequencer.Database.registerEntries('fxstudio', state.aaDatabase.db, true);
  log(`registered fxstudio.aa (${state.aaDatabase.meta?.nodes ?? '?'} nodes from Automated Animations ${state.aaDatabase.meta?.aaVersion ?? ''})`);
});

Hooks.once('ready', () => {
  game.modules.get(MODULE_ID).api = {
    get index() { return state.index; },
    get baseline() { return state.baseline; },
    get house() { return state.house; },
    get ledger() { return ledger; },
    PRESETS,
    lookup: (name, opts) => lookup(state.index, name, opts),
    rowsNamed: (name) => rowsNamed(state.index, name),
    effectiveRows: () => effectiveRows(state.index),
    rebuildIndex,
    /** the row a moment resolves to */
    resolve: (moment) => resolve(state.index, moment),
    /** build a row's Sequence against a moment without playing it: {seq, ctx} */
    build,
    /** resolve and play a moment; {dryRun: true} builds without playing */
    play: (moment, opts) => play(state.index, moment, opts),
    /** what the reader makes of a message, a region, an effect */
    readMessage,
    readRegion,
    readEffect,
    SETTINGS,
  };
});
