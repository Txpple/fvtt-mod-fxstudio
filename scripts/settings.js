// World settings. One holds the live edit buffer the screens write (`looks`: an array of rows in the
// corpus format); tools/export-looks.mjs folds it into recipes/house.json so it is versioned. `play`
// is the cutover switch: with it off the module loads, resolves and lists, but plays nothing, so
// Automated Animations and FX Studio can be compared on the same table one at a time.
import { MODULE_ID } from './fxstudio.js';

export const SETTINGS = {
  looks: 'looks',
  play: 'play',
  log: 'log',
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.looks, {
    name: 'FX Studio looks (world buffer)',
    hint: 'The looks changed in this world through the FX Studio screens, before they are folded into the house corpus.',
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

export function getWorldRows() {
  try {
    const v = game.settings.get(MODULE_ID, SETTINGS.looks);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const playing = () => { try { return game.settings.get(MODULE_ID, SETTINGS.play) !== false; } catch { return true; } };
export const logging = () => { try { return game.settings.get(MODULE_ID, SETTINGS.log) === true; } catch { return false; } };
