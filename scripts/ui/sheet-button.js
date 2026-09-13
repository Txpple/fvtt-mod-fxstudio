// The item-sheet button: an "FX Studio" control on every dnd5e item sheet, for the GM, that opens
// the window on that very item — what plays for it, and the Editor knowing the item, which is where
// it can be given a key of its own (DESIGN §23). Two doors:
// a visible button in the header next to the close button (the markup dnd5e uses for its own
// copy-uuid button), and an entry in the sheet's controls dropdown, which Foundry 14 fills through
// `getHeaderControls<ClassName>` for every class in the sheet's chain (ItemSheet5e is dnd5e's).
export function registerSheetButton(open) {
  Hooks.on('getHeaderControlsItemSheet5e', (app, controls) => {
    if (!game.user?.isGM) return;
    controls.unshift({ icon: 'fa-solid fa-wand-sparkles', label: 'FX Studio', action: 'fxstudio', onClick: () => open({ item: app.document }) });
  });
  Hooks.on('renderItemSheet5e', (app, element) => {
    if (!game.user?.isGM) return;
    const frame = element ?? app.element;
    const close = frame?.querySelector?.('.window-header [data-action="close"]');
    if (!close || frame.querySelector('.window-header [data-action="fxstudio"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'header-control fa-solid fa-wand-sparkles icon';
    button.dataset.action = 'fxstudio';
    button.dataset.tooltip = '';
    button.setAttribute('aria-label', 'FX Studio');
    button.addEventListener('click', (ev) => { ev.preventDefault(); open({ item: app.document }); });
    close.insertAdjacentElement('beforebegin', button);
  });
}
