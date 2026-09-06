// World settings. `looks` is the live edit buffer the screens and the API write (an array of looks
// in the grammar of core/looks.js); tools/export-looks.mjs folds it into recipes/house.json so git
// holds the history. `play` is the cutover switch: with it off the module loads, resolves and lists,
// but plays nothing, so Automated Animations and FX Studio can be compared on the same table.
export const MODULE_ID = 'fvtt-mod-fxstudio';

export const SETTINGS = {
  looks: 'looks',
  play: 'play',
  log: 'log',
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.looks, {
    name: 'FX Studio looks (world buffer)',
    hint: 'The looks written in this world through the FX Studio screens or its API, before they are folded into the house corpus.',
    scope: 'world',
    config: false,
    type: Array,
    default: [],
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
    hint: 'One line per moment: what happened, which look answered, which files played.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
  });
}

export function getWorldLooks() {
  try {
    const v = game.settings.get(MODULE_ID, SETTINGS.looks);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function setWorldLooks(looks) {
  return game.settings.set(MODULE_ID, SETTINGS.looks, looks);
}

export const playing = () => { try { return game.settings.get(MODULE_ID, SETTINGS.play) !== false; } catch { return true; } };
export const logging = () => { try { return game.settings.get(MODULE_ID, SETTINGS.log) === true; } catch { return false; } };
