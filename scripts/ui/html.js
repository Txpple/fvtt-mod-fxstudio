// Small helpers the screens render with: escaping, the colour swatches, the words for a source.
// No Foundry here; strings in, strings out.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** a swatch for the colour names the libraries use; nothing for a name we do not know */
const HEX = {
  blue: '#4f8fd6', green: '#4caf50', red: '#d64f4f', orange: '#e08a3a', yellow: '#e0c03a', purple: '#8a5fd6', pink: '#e07ab8', white: '#eeeeee', grey: '#999999', gray: '#999999', black: '#222222', teal: '#3aaea0',
  dark_black: '#1a1a1a', dark_green: '#1f6b2e', dark_purple: '#4a2b8a', dark_red: '#8a1f1f', dark_blue: '#1f3a8a', dark_orange: '#8a4a1f', dark_yellow: '#8a7a1f', light_blue: '#8fc4ee', bluegreen: '#3aaea0', blueyellow: '#9ab84a', purpleblue: '#6a5fd6', yellowblue: '#b0b84a', rainbow: '#c86ad6', regular: '#cfcfcf', darkgreen: '#1f6b2e', darkred: '#8a1f1f', lightblue: '#8fc4ee', greenred: '#8a6a2e', orangered: '#e0603a', greenorange: '#a0a03a', bluepurple: '#6a5fd6', redyellow: '#e0a03a', pinkpurple: '#b06ad6', greenyellow: '#b0c03a', silver: '#c0c0c0', gold: '#d4af37', bronze: '#b08d57', brown: '#8b5a2b', dark_bluepurple: '#3a2b6a', greypurple: '#8a7aa0',
};
export const swatch = (colour) => (colour && HEX[colour] ? `<span class="sw" style="background:${HEX[colour]}"></span>` : '');
export const colourWords = (colour) => String(colour ?? '').replace(/_/g, ' ');

/** the words for where a look came from */
export const SOURCE_TAG = { world: 'written here', house: 'house file', baseline: 'imported' };

/** the status of an ability, for the dot and the words: custom | baseline | none | off */
export function statusOf({ look, source, off }) {
  if (off) return 'off';
  if (!look) return 'none';
  return source === 'baseline' ? 'baseline' : 'custom';
}
export const STATUS_WORDS = { custom: 'custom look', baseline: 'imported look', none: 'nothing yet', off: 'switched off' };

export const dot = (status) => `<span class="dot ${status}"></span>`;

/** the title words for a look id: "sharran-step" → "Sharran Step" */
export const idWords = (id) => String(id ?? '').replace(/^starter:/, '').replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** the moment words in a list: "when used", "while the effect stands" */
export const ON_WORDS = { use: 'when used', effect: 'while the effect stands' };
