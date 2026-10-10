// The screens' door: what the entry file wires. Opening goes through the API (api.open) so a macro
// or an assistant can open the same window the settings button, the scene-control tool, the
// keybinding and the item sheet do.
import { Studio } from './studio.js';
import { registerSheetButton } from './sheet-button.js';

export { Studio };

/**
 * register the settings button, the scene-control tool, the keybinding and the item-sheet control;
 * returns the opener the API exposes. Every door calls the same opener, so a second click on any of
 * them brings the one open window to the front (Studio.open).
 */
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
  // the scene-control tool: one button on the token controls, for the GM. Foundry 14's controls are
  // a record keyed by name, and a `button` tool fires onChange on click without becoming active.
  Hooks.on('getSceneControlButtons', (controls) => {
    const tools = controls?.tokens?.tools;
    if (!tools) return;
    const order = Math.max(0, ...Object.values(tools).map((t) => t?.order ?? 0)) + 1;
    tools.fxstudio = {
      name: 'fxstudio',
      title: 'FX Studio',
      icon: 'fa-solid fa-wand-sparkles',
      button: true,
      visible: !!game.user?.isGM,
      order,
      onChange: () => open(),
    };
  });
  // the keybinding: no default key; anyone with the GM's rights binds one in Configure Controls
  game.keybindings.register(moduleId, 'open', {
    name: 'Open FX Studio',
    hint: 'Opens the FX Studio window, or brings it to the front when it is already open.',
    editable: [],
    restricted: true,
    onDown: () => { open(); return true; },
  });
  registerSheetButton(open);
  return open;
}
