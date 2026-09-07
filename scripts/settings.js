// World settings. `fx` is the live edit buffer the screens and the API write (an array of fx
// in the grammar of core/fx.js); tools/export-fx.mjs folds it into recipes/house.json so git
// holds the history. `play` is the cutover switch: with it off the module loads, resolves and lists,
// but plays nothing, so Automated Animations and FX Studio can be compared on the same table.
export const MODULE_ID = 'fvtt-mod-fxstudio';

export const SETTINGS = {
  fx: 'fx',
  legacyBuffer: 'looks',
  play: 'play',
  log: 'log',
  maintainer: 'maintainer',
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.fx, {
    name: 'FX Studio fx (world buffer)',
    hint: 'The FX written in this world through the FX Studio screens or its API, before they are folded into the house corpus.',
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });
  // the buffer's key before 2026-09-06 ("looks"); read once and carried over, then left empty
  game.settings.register(MODULE_ID, SETTINGS.legacyBuffer, { scope: 'world', config: false, type: Array, default: [] });
  game.settings.register(MODULE_ID, SETTINGS.maintainer, {
    name: 'FX Studio: show the Corpus tab',
    hint: 'For whoever maintains the FX corpus: binds what was written in this world for the house or main corpus and ships it into the module. A table that only uses the module never needs it.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register(MODULE_ID, SETTINGS.play, {
    name: 'FX Studio plays effects',
    hint: 'Off: the module still loads its corpus and answers the screens, but plays nothing. Use it to compare with Automated Animations one at a time.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, SETTINGS.log, {
    name: 'FX Studio logs what it plays to the console',
    hint: 'One line per moment: what happened, which FX answered, which files played.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
  });
}

export function getWorldFx() {
  try {
    const v = game.settings.get(MODULE_ID, SETTINGS.fx);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function setWorldFx(fx) {
  return game.settings.set(MODULE_ID, SETTINGS.fx, fx);
}

/** the world buffer written under the old key, carried into the new one once (a GM, at ready) */
export async function carryOverLegacyBuffer() {
  try {
    const old = game.settings.get(MODULE_ID, SETTINGS.legacyBuffer);
    if (!Array.isArray(old) || !old.length || !game.user?.isGM) return 0;
    const now = getWorldFx();
    const ids = new Set(now.map((l) => l?.id));
    await setWorldFx([...now, ...old.filter((l) => l?.id && !ids.has(l.id))]);
    await game.settings.set(MODULE_ID, SETTINGS.legacyBuffer, []);
    return old.length;
  } catch { return 0; }
}

export const maintaining = () => { try { return game.settings.get(MODULE_ID, SETTINGS.maintainer) === true; } catch { return false; } };
export const playing = () => { try { return game.settings.get(MODULE_ID, SETTINGS.play) !== false; } catch { return true; } };
export const logging = () => { try { return game.settings.get(MODULE_ID, SETTINGS.log) === true; } catch { return false; } };
