// The gap table's shared rules, for the tools that build and check recipes/proposals.json
// (tools/proposals.mjs, tools/check-coverage.mjs): the closed list of reasons a gap needs no FX,
// the reading of a row's words into one of them, the moment rule read off gaps.mjs's `moment`
// field (DESIGN 25), and the collection a record lives in.

/**
 * THE REASONS, a closed list: why a gap needs no FX, in the words the tab prints. The moment rule
 * (DESIGN 25) gives the first five; the rest are the kinds of judgement the rows made by hand.
 * The tab reads the words from the file, so this is the one place they are written.
 */
export const REASONS = {
  'no-activity': 'no activity on the record',
  'always-on': 'always on',
  'bookkeeping': 'bookkeeping for another ability',
  'enchantment': 'a lasting enchantment',
  'rest': 'chosen at a rest',
  'mundane': 'mundane gear',
  'header': 'a name, not an ability',
  'judged': 'judged by hand',
};

/** a row's own sentence, read for which reason it gives (first match wins; the words stay the row's) */
export const BY_WORDS = [
  ['no-activity', /no activity/i],
  ['rest', /\b(long|short) rest\b|\bon a rest\b|\bat a rest\b/i],
  ['enchantment', /lasting enchantment/i],
  ['header', /, not an ability/i],
  ['bookkeeping', /own FX|has its own|have their own|its own record|own effect record|has a proposal|have a proposal|each has a proposal|plays the moment|effect plays|is its own|are their own|the Deck itself|'s FX\b|its own attack plays|an FX on the|where an FX belongs/i],
  ['mundane', /mundane|treasure|clothing|\bfood\b|container|tool kit|pack of gear|^a game\b|no rules of its own|service bought|^(solvent|glue|a compass|a clock|a fishing rod|a pole)\b/i],
  ['always-on', /always on|worn armour|no activation|passive|proficiency|\bbonus\b|no moment to play|no moment of its own|no moment at the table|a state, not a moment|nothing at the table/i],
];
export const reasonOfWords = (s) => BY_WORDS.find(([, re]) => re.test(s ?? ''))?.[0] ?? null;

/**
 * THE MOMENT RULE read off a gap's `moment` (gaps.mjs): null when something happens at the table,
 * else the reason nothing does. A record with no activity never posts the card the reader plays
 * on; an effect that sits on its owner with no duration, and that no activity applies, is always on;
 * an effect that is neither applied nor carried by its owner never reaches a token.
 */
export function momentReason(gap) {
  const m = gap?.moment;
  if (!m) return null;
  if (gap.kind === 'effect' && m.effect) {
    const e = m.effect;
    if (e.applied || e.duration) return null;
    if (e.type === 'enchantment') return 'enchantment';
    return e.transfer ? 'always-on' : 'no-activity';
  }
  return m.activities === 0 ? 'no-activity' : null;
}

/** the collection a record's uuid lives in: `<package>.<pack>`, or `world` for an item on this world's actor */
export const collectionOf = (uuid) => /^Compendium\.([^.]+\.[^.]+)\./.exec(uuid ?? '')?.[1] ?? 'world';
