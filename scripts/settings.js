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
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.fx, {
    name: 'Drafts',
    hint: 'The FX written in this world (the screens or the API), before they ship into House or Stock.',
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });
  // the buffer's key before 2026-09-06 ("looks"); read once and carried over, then left empty
  game.settings.register(MODULE_ID, SETTINGS.legacyBuffer, { scope: 'world', config: false, type: Array, default: [] });
  game.settings.register(MODULE_ID, SETTINGS.play, {
    name: 'Play FX',
    hint: 'Off: the screens still work, nothing plays. For comparing with Automated Animations.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, SETTINGS.log, {
    name: 'Console log',
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
    if (!Array.isArray(v)) return [];
    // the corpus was called "baseline" before 2026-09-06; a draft staged for it reads as Stock
    return v.map((l) => (l?.to === 'baseline' ? { ...l, to: 'stock' } : l));
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

export const playing = () => { try { return game.settings.get(MODULE_ID, SETTINGS.play) !== false; } catch { return true; } };
export const logging = () => { try { return game.settings.get(MODULE_ID, SETTINGS.log) === true; } catch { return false; } };
