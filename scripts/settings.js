// World settings. One holds the live edit buffer the screens write (`looks`: an array of rows in the
// corpus format); tools/export-looks.mjs folds it into recipes/house.json so it is versioned.
import { MODULE_ID } from './fxstudio.js';

export const SETTINGS = {
  looks: 'looks',
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
}

export function getWorldRows() {
  try {
    const v = game.settings.get(MODULE_ID, SETTINGS.looks);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
