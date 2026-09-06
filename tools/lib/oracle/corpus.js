// The corpus: rows keyed by ability name, two layers (baseline, house) plus the world's live edit
// buffer, later wins. Pure: no Foundry globals, so the tools run the very same lookup offline that
// the module runs at the table (that is what makes the parity proof a proof).
//
// A ROW
//   { name, menu, match?, exclude?, effectType?, presetType?, fx: [layer...], thrown?, soundOnly?, off? }
//   name        the ability's name, matched whole (case and spacing do not matter)
//   menu        which of Automated Animations' menus the row came from, which is also which preset
//               plays it: melee | range | ontoken | templatefx | aura | preset | aefx
//   match       "exact" (default) — the whole name; "word" — the row's name appears as whole words
//               inside the ability's name (the generic weapon and creature rows: "Longsword +1",
//               "Bite (wolf form)"). Never a bare substring.
//   exclude     names containing any of these terms do not match (carried from AA's excluded terms)
//   off         a house row that switches the baseline's row off: the ability plays nothing
//   fx          the layers, in play order: {preset, video, file, aa, sound, options}
//               preset   melee-swing | projectile | on-token | template | aura | secondary | source | target
//                        | teleport | projectile-to-template | dual-attach | thunderwave
//               video    AA's descriptor {dbSection, menuType, animation, variant, color} — the presets
//                        branch on it (claw/bite sizing, "complete" loops, returning weapons)
//               aa       the private database path the layer plays through (registered by this module
//                        as fxstudio.aa.*, byte-identical to AA's own table), or absent for a custom path
//               file     the readable twin: the native jb2a.* path with the same files, a raw file
//                        path, or null when JB2A has no node with exactly these files
//               sound    {file, volume, delay, startTime, repeat, repeatDelay} or absent
//               options  AA's option set for the layer, every field, defaults applied
//
// LOOKUP, as AA does it, minus the substring accidents:
//   on "use"      (an attack, a damage roll, an item use)  rows from melee, range, ontoken,
//                 templatefx, aura and preset, in that order for a tie
//   on "template" (a template placed)  as "use", but a melee/range/ontoken hit is replaced by the
//                 templatefx row of the same name, or nothing
//   on "effect"   (an active effect created)  aefx rows only
//   house beats baseline; the world buffer beats both; an exact match beats a word match.

export const USE_MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset'];

export const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @returns an index: {layers: [{source, rows, exact: Map<norm name, row[]>, word: [{re, row}]}]} */
export function buildIndex({ baseline = [], house = [], world = [] } = {}) {
  const layer = (source, rows) => {
    const exact = new Map();
    const word = [];
    for (const row of rows) {
      if (!row?.name) continue;
      const key = norm(row.name);
      // a weapon or creature-attack row names the END of the ability's name, as whole words, with
      // an optional plural and a trailing "+1" or parenthesis: "Light Hammer", "Sera's Shortsword",
      // "Longsword +1", "Talons", "Bite (wolf form)" — never "Shield of Faith" for "Shield"
      if (row.match === 'word') word.push({ re: new RegExp(`(^|[^a-z0-9])${escapeRe(key).replace(/ /g, '\\s+')}s?(\\s*\\+\\s*\\d+)?(\\s*\\([^)]*\\))?\\s*$`, 'i'), row });
      (exact.get(key) ?? exact.set(key, []).get(key)).push(row);
    }
    return { source, rows, exact, word };
  };
  // later wins: world, then house, then baseline
  return { layers: [layer('world', world), layer('house', house), layer('baseline', baseline)] };
}

function excluded(row, name) {
  if (!row.exclude?.length) return false;
  const n = norm(name).replace(/\s+/g, '');
  return row.exclude.some((t) => n.includes(norm(t).replace(/\s+/g, '')));
}

/** every row of a layer that names this ability, exact first then word, in row order */
function candidates(layer, name) {
  const out = [];
  for (const row of layer.exact.get(norm(name)) ?? []) if (!excluded(row, name)) out.push({ row, how: 'exact' });
  for (const { re, row } of layer.word) if (re.test(name) && norm(row.name) !== norm(name) && !excluded(row, name)) out.push({ row, how: 'word' });
  return out;
}

const MENU_RANK = Object.fromEntries([...USE_MENUS, 'aefx'].map((m, i) => [m, i]));

function pick(index, name, menus, { effectType } = {}) {
  for (const layer of index.layers) {
    const found = candidates(layer, name).filter(({ row }) => menus.includes(row.menu) && (!effectType || !row.effectType || row.effectType === effectType));
    if (!found.length) continue;
    // a whole-name hit beats a word hit; a row AA flagged "exact match" beats one it did not (AA
    // searched those first); among equals, AA's menu order, then row order
    const rank = (c) => (c.how === 'exact' ? 0 : 10) + (c.row.match === 'exact' ? 0 : 1);
    found.sort((a, b) => rank(a) - rank(b) || MENU_RANK[a.row.menu] - MENU_RANK[b.row.menu]);
    const { row, how } = found[0];
    if (row.off) return null;
    return { row, how, source: layer.source };
  }
  return null;
}

/**
 * @param on  "use" | "template" | "effect"
 * @returns {row, how, source} | null   — null means: nothing plays, and the Check screen lists it
 */
export function lookup(index, name, { on = 'use', qualifiers = true } = {}) {
  if (!name) return null;
  for (const n of qualifiers ? nameForms(name) : [name]) {
    const hit = lookupOne(index, n, on);
    if (hit) return n === name ? hit : { ...hit, asked: name, matchedAs: n };
  }
  return null;
}

function lookupOne(index, name, on) {
  if (on === 'effect') return pick(index, name, ['aefx']);
  const hit = pick(index, name, USE_MENUS);
  if (on === 'template' && hit && ['melee', 'range', 'ontoken'].includes(hit.row.menu)) return pick(index, name, ['templatefx']);
  return hit;
}

/**
 * The name, then the name with a qualifier dnd5e or the DM appends removed: "Misty Step - Spellcasting"
 * (an NPC's spell), "Bless - Fey-Touched" (a granted spell), "Potion of Healing (Greater)". This is
 * still the ability's own name; no look is derived from anything else.
 */
export function nameForms(name) {
  const forms = [name];
  const dash = name.match(/^(.+?)\s+[-–—]\s+.+$/);
  if (dash) forms.push(dash[1]);
  const paren = name.match(/^(.+?)\s*\([^)]*\)\s*$/);
  if (paren) forms.push(paren[1]);
  return forms;
}

/** every row that names this ability, across layers and menus (for the Look up card) */
export function rowsNamed(index, name) {
  const out = [];
  for (const layer of index.layers) for (const { row, how } of candidates(layer, name)) out.push({ row, how, source: layer.source });
  return out;
}

/** the corpus as sentences see it: one entry per name, later layer wins per menu */
export function effectiveRows(index) {
  const seen = new Map();
  for (const layer of index.layers) for (const row of layer.rows) {
    const key = `${norm(row.name)}|${row.menu}|${row.effectType ?? ''}`;
    if (!seen.has(key)) seen.set(key, { row, source: layer.source });
  }
  return [...seen.values()];
}
