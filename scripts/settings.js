// World settings. `play` is the cutover switch: with it off the module loads, resolves and lists,
// but plays nothing. `log` is one console line per moment.
//
// THE WORLD BUFFER IS GONE (the user, 2026-09-12: "no more concept of draft"). Before that, Save
// wrote to a world setting and a Draft played from there until it was Staged and Shipped into a
// file. Now Save writes the file. The two old setting keys are still registered so a world that
// holds them can be read once: at ready a GM's client folds whatever they hold into the corpus
// files (fxstudio.js drainBuffer) and empties them. Nothing else reads them.
export const MODULE_ID = 'fvtt-mod-fxstudio';

export const SETTINGS = {
  play: 'play',
  log: 'log',
  /** the old world buffer, read once and emptied */
  oldBuffer: 'fx',
  /** the buffer's key before 2026-09-06, read once and emptied */
  olderBuffer: 'looks',
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.oldBuffer, { scope: 'world', config: false, type: Array, default: [] });
  game.settings.register(MODULE_ID, SETTINGS.olderBuffer, { scope: 'world', config: false, type: Array, default: [] });
  game.settings.register(MODULE_ID, SETTINGS.play, {
    name: 'Play FX',
    hint: 'Off: the screens still work, nothing plays.',
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

/** what the old buffers hold, as one list ({fx, to}: the corpus each was staged for, House when none), or [] */
export function oldBufferFx() {
  const out = [];
  for (const key of [SETTINGS.oldBuffer, SETTINGS.olderBuffer]) {
    let v = [];
    try { v = game.settings.get(MODULE_ID, key); } catch { v = []; }
    if (!Array.isArray(v)) continue;
    for (const l of v) if (l?.id && !out.some((o) => o.fx.id === l.id)) out.push({ fx: l, to: l.to === 'stock' || l.to === 'baseline' ? 'stock' : 'house' });
  }
  return out;
}

/** empty the old buffers (after they were folded into the files) */
export async function clearOldBuffers() {
  for (const key of [SETTINGS.oldBuffer, SETTINGS.olderBuffer]) await game.settings.set(MODULE_ID, key, []);
}

export const playing = () => { try { return game.settings.get(MODULE_ID, SETTINGS.play) !== false; } catch { return true; } };
export const logging = () => { try { return game.settings.get(MODULE_ID, SETTINGS.log) === true; } catch { return false; } };
