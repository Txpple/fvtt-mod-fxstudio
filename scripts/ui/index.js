// The screens' door: what the entry file wires. Opening goes through the API (api.open) so a macro
// or an assistant can open the same window the settings button and the item sheet do.
import { Studio } from './studio.js';
import { registerSheetButton } from './sheet-button.js';

export { Studio };

/** register the settings button and the item-sheet control; returns the opener the API exposes */
export function registerScreens({ moduleId }) {
  const open = (opts) => Studio.open(opts);
  game.settings.registerMenu(moduleId, 'studio', {
    name: 'FX Studio',
    label: 'Open FX Studio',
    hint: 'Look up what plays for any ability, change it, and see what plays nothing yet.',
    icon: 'fa-solid fa-wand-sparkles',
    type: Studio,
    restricted: true,
  });
  registerSheetButton(open);
  return open;
}
