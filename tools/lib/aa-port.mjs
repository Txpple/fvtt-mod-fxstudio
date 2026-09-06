// What Automated Animations 7.0.22 does with an autorec entry, ported line for line so the import
// can prove parity against AA's own reading of a row rather than against itself.
//
//   sanitize*   DataSanitizer: the option tables with their defaults (src/aa-classes/DataSanitizer.js)
//   buildPath   the database path AA hands Sequencer, with AA's fallback-to-first-key when a path
//               does not validate (src/animation-functions/file-builder/build-filepath.js)
//   lookup      the autorec search: longest rinsed label contained in the name, exact-match and
//               excluded terms honoured (src/aa-classes/aaAutorecFunctions.js, findAnimation.js)
//
// Automated Animations is MIT (c) Otigon and contributors; this file is a derived port, MIT.
// Runtime-only fields AA computes on the canvas (fakeLocation) are left out; nothing else is.

export const MENUS = ['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset', 'aefx'];

export const rinse = (s) => (s ? s.replace(/\s+/g, '').toLowerCase() : s);

// ---------------------------------------------------------------------------------------------
// DataSanitizer
// ---------------------------------------------------------------------------------------------
export function convertToXY(input, isAnchor) {
  const dNum = isAnchor ? 0.5 : 1;
  if (!input) return { x: dNum, y: dNum };
  const parsed = String(input).split(',').map((s) => s.trim());
  const posX = Number(parsed[0]);
  const posY = Number(parsed[1]);
  if (parsed.length === 2) return { x: isNaN(posX) ? dNum : posX, y: isNaN(posY) ? dNum : posY };
  if (parsed.length === 1) return { x: isNaN(posX) ? dNum : posX, y: isNaN(posX) ? dNum : posX };
  return { x: dNum, y: dNum };
}

/** setSound: false when off, else the sound section's inputs (delay already includes addDelay) */
export function sanitizeSound(data = {}, addDelay = 0, overrideRepeat = false) {
  const input = {
    enable: data.enable ?? false,
    file: data.file,
    delay: (data.delay ?? 0) + addDelay,
    startTime: data.startTime ?? 0,
    volume: data.volume ?? 1,
    repeat: overrideRepeat || data.repeat || 1,
    repeatDelay: data.repeatDelay ?? 250,
  };
  if (!input.enable || !input.file) return false;
  delete input.enable;
  return input;
}
// the preset flavour of setSound (compilePreset's local): no addDelay, no override
export const sanitizePresetSound = (data = {}) => sanitizeSound(data, 0, false);

export function sanitizePrimaryOptions(data = {}, type) {
  switch (type) {
    case 'melee':
      return {
        contrast: data.contrast ?? 0, delay: data.delay || 0, elevation: data.elevation ?? 1000, isAbsolute: data.isAbsolute ?? false,
        isWait: data.isWait ?? false, opacity: data.opacity ?? 1, playbackRate: data.playbackRate || 1, repeat: data.repeat || 1,
        repeatDelay: data.repeatDelay ?? 1, saturation: data.saturation ?? 0, size: data.size || 1, tint: data.tint ?? false,
        tintColor: data.tintColor || '#FFFFFF', zIndex: data.zIndex || 1,
      };
    case 'range':
      return {
        animationSource: data.animationSource ?? false, contrast: data.contrast ?? 0, delay: data.delay || 0, elevation: data.elevation ?? 1000,
        isAbsolute: data.isAbsolute ?? false, isReturning: data.isReturning ?? false, isWait: data.isWait ?? false, onlyX: data.onlyX ?? false,
        opacity: data.opacity ?? 1, playbackRate: data.playbackRate || 1, randomOffset: data.randomOffset ?? false, repeat: data.repeat || 1,
        repeatDelay: data.repeatDelay ?? 1, reverse: data.reverse ?? false, saturation: data.saturation ?? 0, tint: data.tint ?? false,
        tintColor: data.tintColor || '#FFFFFF', zIndex: data.zIndex || 1,
      };
    case 'ontoken':
      return {
        addTokenWidth: data.addTokenWidth ?? false, anchor: convertToXY(data.anchor, true), contrast: data.contrast ?? 0, delay: data.delay ?? 1,
        elevation: data.elevation ?? 1000, isAbsolute: data.isAbsolute ?? false, fadeIn: data.fadeIn ?? 250, fadeOut: data.fadeOut ?? 500,
        isMasked: data.isMasked ?? false, isRadius: data.isRadius ?? false, isWait: data.isWait ?? false, opacity: data.opacity ?? 1,
        persistent: data.persistent ?? false, playbackRate: data.playbackRate || 1, playOn: data.playOn || 'default', repeat: data.repeat || 1,
        repeatDelay: data.repeatDelay ?? 1, saturation: data.saturation ?? 0, size: data.size || 1, tint: data.tint ?? false,
        tintColor: data.tintColor || '#FFFFFF', unbindAlpha: data.unbindAlpha ?? false, unbindVisibility: data.unbindVisibility ?? false,
        zIndex: data.zIndex || 1,
      };
    case 'templatefx':
      return {
        aboveTemplate: data.aboveTemplate ?? false, anchor: data.anchor, contrast: data.contrast ?? 0, delay: data.delay ?? 1,
        elevation: data.elevation ?? 1000, isAbsolute: data.isAbsolute ?? false, isMasked: data.isMasked ?? false, isWait: data.isWait ?? false,
        occlusionMode: data.occlusionMode || '3', occlusionAlpha: data.occlusionAlpha ?? 1, opacity: data.opacity ?? 1,
        persistent: data.persistent ?? false, persistType: data.persistType || 'sequencerground', playbackRate: data.playbackRate || 1,
        removeTemplate: data.removeTemplate ?? false, repeat: data.repeat || 1, repeatDelay: data.repeatDelay ?? 1, rotate: data.rotate ?? 0,
        saturation: data.saturation ?? 0, scale: convertToXY(data.scale), tint: data.tint ?? false, tintColor: data.tintColor || '#FFFFFF',
        scaleX: data.scaleX || 1, scaleY: data.scaleY || 1, xray: data.xray ?? false, zIndex: data.zIndex || 1,
      };
    case 'aura':
      return {
        addTokenWidth: data.addTokenWidth ?? false, alpha: data.alpha ?? false, alphaDuration: data.alphaDuration || 1000, alphaMax: data.alphaMax ?? 0.5,
        alphaMin: data.alphaMin ?? -0.5, breath: data.breath ?? false, breathDuration: data.breathDuration || 1000, breathMax: data.breathMax ?? 1.05,
        breathMin: data.breathMin ?? 0.95, contrast: data.contrast ?? 0, delay: data.delay || 1, elevation: data.elevation ?? 1000,
        isAbsolute: data.isAbsolute ?? false, fadeIn: data.fadeIn ?? 250, fadeOut: data.fadeOut ?? 500, isWait: data.isWait ?? false,
        opacity: data.opacity ?? 1, playbackRate: data.playbackRate || 1, playOn: data.playOn || 'source', size: data.size || 3,
        tint: data.tint ?? false, tintColor: data.tintColor || '#FFFFFF', tintSaturate: data.tintSaturate ?? 0, unbindAlpha: data.unbindAlpha ?? false,
        unbindVisibility: data.unbindVisibility ?? false, zIndex: data.zIndex || 1,
      };
    default:
      return undefined;
  }
}

export const sanitizeVideo = (video = {}) => ({
  dbSection: video.dbSection, menuType: video.menuType, animation: video.animation, variant: video.variant, color: video.color,
  customPath: video.enableCustom && video.customPath ? video.customPath : false,
});

export function sanitizeMeleeSwitch(sw = {}) {
  const video = sw.video || {};
  const options = sw.options || {};
  return {
    video: { dbSection: 'range', menuType: video.menuType, animation: video.animation, variant: video.variant, color: video.color, customPath: video.enableCustom && video.customPath ? video.customPath : false },
    options: { detect: options.detect || 'automatic', range: options.range || 2, isReturning: options.isReturning ?? false, switchType: options.switchType || 'on' },
    sound: sanitizeSound(sw.sound || {}),
  };
}

export function sanitizeSecondaryOptions(options = {}, overrideRepeat = false) {
  return {
    addTokenWidth: options.addTokenWidth ?? false, anchor: convertToXY(options.anchor, true), contrast: options.contrast ?? 0, delay: options.delay ?? 0,
    elevation: options.elevation ?? 1000, isAbsolute: options.isAbsolute ?? false, fadeIn: options.fadeIn ?? 250, fadeOut: options.fadeOut ?? 250,
    isMasked: options.isMasked ?? false, isRadius: options.isRadius ?? false, isWait: options.isWait ?? false, opacity: options.opacity || 1,
    playbackRate: options.playbackRate || 1, repeat: overrideRepeat || options.repeat || 1, repeatDelay: options.repeatDelay ?? 250,
    rotateSource: options.rotateSource ?? false, saturation: options.saturation ?? 0, size: options.size || 1, tint: options.tint ?? false,
    tintColor: options.tintColor || '#FFFFFF', zIndex: options.zIndex || 1,
  };
}

export function sanitizeSourceOptions(options = {}, primaryOptions = {}) {
  return {
    animationSource: primaryOptions.animationSource ?? false, addTokenWidth: options.addTokenWidth ?? false, anchor: convertToXY(options.anchor, true),
    contrast: options.contrast ?? 0, delay: options.delay ?? 0, elevation: options.elevation ?? 1000, isAbsolute: options.isAbsolute ?? false,
    fadeIn: options.fadeIn ?? 250, fadeOut: options.fadeOut ?? 500, isMasked: options.isMasked ?? false, isRadius: options.isRadius ?? false,
    isWait: options.isWait ?? false, opacity: options.opacity || 1, persistent: options.persistent ?? false, playbackRate: options.playbackRate || 1,
    repeat: options.repeat || 1, repeatDelay: options.repeatDelay || 1, saturation: options.saturation ?? 0, size: options.size || 1,
    tint: options.tint ?? false, tintColor: options.tintColor || '#FFFFFF', zIndex: options.zIndex || 1,
  };
}

export function sanitizeTargetOptions(options = {}) {
  return {
    addTokenWidth: options.addTokenWidth ?? false, anchor: convertToXY(options.anchor, true), contrast: options.contrast ?? 0, delay: options.delay ?? 0,
    elevation: options.elevation ?? 1000, fadeIn: options.fadeIn ?? 250, fadeOut: options.fadeOut ?? 250, isAbsolute: options.isAbsolute ?? false,
    isMasked: options.isMasked ?? false, isRadius: options.isRadius ?? false, opacity: options.opacity || 1, playbackRate: options.playbackRate || 1,
    persistent: options.persistent ?? false, repeat: options.repeat || 1, repeatDelay: options.repeatDelay ?? 250, rotateSource: options.rotateSource ?? false,
    saturation: options.saturation ?? 0, size: options.size || 1, tint: options.tint ?? false, tintColor: options.tintColor || '#FFFFFF',
    unbindAlpha: options.unbindAlpha ?? false, unbindVisibility: options.unbindVisibility ?? false, zIndex: options.zIndex || 1,
  };
}

/** the whole entry as AA's DataSanitizer sees it (preset entries: compilePreset) */
export function sanitizeEntry(entry) {
  const menu = entry.menu === 'aefx' ? entry.activeEffectType : entry.menu;
  if (entry.menu === 'preset') return { menu: 'preset', presetType: entry.presetType, primary: sanitizePreset(entry) };
  const primary = entry.primary || entry.data || {};
  const options = sanitizePrimaryOptions(primary.options || {}, menu);
  const video = sanitizeVideo(primary.video || {});
  const out = { menu, primary: { video, options } };
  out.primary.sound = sanitizeSound(primary.sound || {}, options.isWait ? 0 : options.delay);
  if (menu === 'melee') out.primary.meleeSwitch = sanitizeMeleeSwitch(entry.meleeSwitch);
  if (video.menuType === 'shieldfx' && !primary.video?.enableCustom) out.primary.options.isShieldFX = true;
  const sec = entry.secondary || {};
  if (sec.enable) {
    const o = sanitizeSecondaryOptions(sec.options || {});
    const v = sanitizeVideo(sec.video || {});
    v.dbSection = 'static';
    out.secondary = { video: v, options: o, sound: sanitizeSound(sec.sound || {}, o.isWait ? 0 : o.delay) };
  } else out.secondary = false;
  const src = entry.source || {};
  if (src.enable) {
    const o = sanitizeSourceOptions(src.options || {}, out.primary.options);
    const v = sanitizeVideo(src.video || {});
    v.dbSection = 'static';
    out.source = { video: v, options: o, sound: sanitizeSound(src.sound || {}, o.isWait ? 0 : o.delay) };
  } else out.source = false;
  const tgt = entry.target || {};
  if (tgt.enable) {
    const o = sanitizeTargetOptions(tgt.options || {});
    const v = sanitizeVideo(tgt.video || {});
    v.dbSection = 'static';
    out.target = { video: v, options: o, sound: sanitizeSound(tgt.sound || {}, tgt.options?.delay ?? 0) };
  } else out.target = false;
  const so = entry.soundOnly?.sound;
  out.soundOnly = so?.enable && so?.file ? { file: so.file, volume: so.volume ?? 0.75, delay: so.delay ?? 0, startTime: so.startTime ?? 0, repeat: so.repeat ?? 1, repeatDelay: so.repeatDelay ?? 250 } : false;
  out.macro = entry.macro?.enable && entry.macro?.name ? { name: entry.macro.name, args: entry.macro.args, playWhen: entry.macro.playWhen ?? '0' } : false;
  return out;
}

const presetVideo = (v = {}, dbSection) => ({ dbSection, menuType: v.menuType, animation: v.animation, variant: v.variant, color: v.color, customPath: v.enableCustom && v.customPath ? v.customPath : false });

export function sanitizePreset(entry) {
  const flags = entry.data || {};
  switch (entry.presetType) {
    case 'proToTemp': {
      const p = flags.projectile || {}, po = p.options || {};
      const pe = flags.preExplosion || {}, peo = pe.options || {};
      const ex = flags.explosion || {}, exo = ex.options || {};
      const ai = flags.afterImage || {}, aio = ai.options || {};
      return {
        projectile: { video: presetVideo(p, 'range'), options: { elevation: po.elevation || 1000, isAbsolute: po.isAbsolute ?? false, playbackRate: po.playbackRate || 1, randomOffset: po.randomOffset ?? false, repeat: po.repeat || 1, repeatDelay: po.repeatDelay || 250, removeTemplate: po.removeTemplate ?? false, wait: po.wait ?? -500, opacity: po.opacity ?? 1 }, sound: sanitizePresetSound(p.sound || {}) },
        preExplosion: { enable: pe.enable || false, video: presetVideo(pe, 'static'), options: { aboveTemplate: peo.aboveTemplate ?? false, elevation: peo.elevation ?? 1000, isAbsolute: peo.isAbsolute ?? false, playbackRate: peo.playbackRate || 1, repeat: peo.repeat || 1, repeatDelay: peo.repeatDelay || 250, scale: peo.scale || 1, wait: peo.wait ?? -500, opacity: peo.opacity ?? 1 }, sound: sanitizePresetSound(pe.sound || {}) },
        explosion: { video: presetVideo(ex, 'static'), options: { aboveTemplate: exo.aboveTemplate ?? false, elevation: exo.elevation ?? 1000, isAbsolute: exo.isAbsolute ?? false, playbackRate: exo.playbackRate || 1, repeat: exo.repeat || 1, repeatDelay: exo.repeatDelay || 250, scale: exo.scale || 1, wait: exo.wait ?? -500, opacity: exo.opacity ?? 1 }, sound: sanitizePresetSound(ex.sound || {}) },
        afterImage: { enable: ai.enable ?? false, customPath: ai.enable && ai.customPath ? ai.customPath : false, options: { elevation: aio.elevation ?? 1000, isAbsolute: aio.isAbsolute ?? false, persistent: aio.persistent ?? false, scale: aio.scale || 1 } },
      };
    }
    case 'teleportation': {
      const s = flags.start || {}, so = s.options || {};
      const b = flags.between || {}, bo = b.options || {};
      const e = flags.end || {}, eo = e.options || {};
      const o = flags.options || {};
      return {
        start: !s.enable ? false : { video: presetVideo(s, 'static'), options: { delay: so.delay ?? 0, elevation: so.elevation ?? 1000, isAbsolute: so.isAbsolute ?? false, fadeIn: so.fadeIn ?? 250, fadeOut: so.fadeOut ?? 500, isMasked: so.isMasked ?? false, isRadius: so.isRadius ?? false, opacity: so.opacity ?? 1, playbackRate: so.playbackRate || 1, size: so.size ?? 1 } },
        between: !b.enable ? false : { video: presetVideo(b, 'range'), options: { delay: bo.delay ?? 0, elevation: bo.elevation ?? 1000, isAbsolute: bo.isAbsolute ?? false, opacity: bo.opacity ?? 1, playbackRate: bo.playbackRate ?? 1 } },
        // AA reads the END layer's fades from the START options (a slip in AA, carried as is)
        end: !e.enable ? false : { video: presetVideo(e, 'static'), options: { delay: eo.delay ?? 0, elevation: eo.elevation ?? 1000, isAbsolute: eo.isAbsolute ?? false, fadeIn: so.fadeIn ?? 250, fadeOut: so.fadeOut ?? 500, isMasked: eo.isMasked ?? false, isRadius: eo.isRadius ?? false, opacity: eo.opacity ?? 1, playbackRate: eo.playbackRate || 1, size: eo.size ?? 1 } },
        options: { measureType: o.measureType || 'alternating', hideFromPlayers: o.hideFromPlayers ?? false, range: o.range ?? 30, teleport: o.teleport ?? false, delayMove: o.delayMove ?? 0, speed: o.speed || 6, alpha: o.alpha ?? 1, delayFade: o.delayFade ?? 0, delayReturn: o.delayReturn ?? 0, checkCollision: o.checkCollision ?? false },
        sound: sanitizePresetSound(flags.sound || {}),
      };
    }
    case 'dualattach': {
      const v = flags.video || {}, o = flags.options || {};
      return { video: presetVideo(v, 'range'), options: { elevation: o.elevation ?? 1000, isAbsolute: o.isAbsolute ?? false, onlyX: o.onlyX ?? false, opacity: o.opacity ?? 1, playbackRate: o.playbackRate }, sound: sanitizePresetSound(flags.sound || {}) };
    }
    case 'thunderwave': {
      const o = flags.options || {};
      return { color: flags.color || 'blue', options: { elevation: o.elevation ?? 1000, isAbsolute: o.isAbsolute ?? false, opacity: o.opacity ?? 1, repeat: o.repeat || 1, repeatDelay: o.repeatDelay ?? 250, removeTemplate: o.removeTemplate ?? false }, sound: sanitizePresetSound(flags.sound || {}) };
    }
    default:
      throw new Error(`unknown preset type ${entry.presetType}`);
  }
}

// ---------------------------------------------------------------------------------------------
// buildFile: the database path AA sends to Sequencer
// ---------------------------------------------------------------------------------------------
/**
 * @param aa   AA's database object (root, without the "autoanimations." prefix)
 * @returns {file, filePath, returnFile, fallback} — file is the dotted path; fallback names the
 *          levels AA silently replaced with the first key because the stored path did not validate
 */
export function buildPath(aa, video, { getTruePath = false, isReturnable = false } = {}) {
  const { dbSection: dbType, menuType, animation, variant, color, customPath } = video;
  if (!dbType && !customPath) return false;
  if (customPath) return { file: customPath, filePath: customPath, custom: true };
  const valid = dbType && menuType && animation && variant && color && exists(aa, dbType, menuType, animation, variant, color === 'random' ? null : color);
  let cleanType = menuType, cleanAnimation = animation, cleanVariant = variant, cleanColor = color;
  const fallback = [];
  if (!valid) {
    cleanType = cleanKey(aa[dbType], menuType, fallback, 'menuType');
    cleanAnimation = cleanKey(aa[dbType]?.[cleanType], animation, fallback, 'animation');
    cleanVariant = cleanKey(aa[dbType]?.[cleanType]?.[cleanAnimation], variant, fallback, 'variant');
    cleanColor = cleanKey(aa[dbType]?.[cleanType]?.[cleanAnimation]?.[cleanVariant], color, fallback, 'color');
  }
  const base = `autoanimations.${dbType}.${cleanType}.${cleanAnimation}.${cleanVariant}`;
  const file = color === 'random' ? base : `${base}.${cleanColor}`;
  const out = { file, custom: false, fallback: fallback.length ? fallback : undefined };
  if (getTruePath) {
    const variantNode = aa[dbType]?.[cleanType]?.[cleanAnimation]?.[cleanVariant] ?? {};
    const colours = Object.keys(variantNode);
    out.filePath = color === 'random' ? variantNode[colours[0]]?.[0] : variantNode[cleanColor]?.[0];
  }
  if (isReturnable) {
    const returnable = Object.keys(aa.return?.weapon ?? {});
    out.returnFile = returnable.includes(cleanAnimation)
      ? (color === 'random' ? `autoanimations.return.weapon.${cleanAnimation}.${cleanVariant}` : `autoanimations.return.weapon.${cleanAnimation}.${cleanVariant}.${cleanColor}`)
      : false;
  }
  return out;
}
function exists(aa, ...parts) {
  let o = aa;
  for (const p of parts) {
    if (p === null) return true;
    if (!o || typeof o !== 'object' || !(p in o)) return false;
    o = o[p];
  }
  return true;
}
function cleanKey(node, prop, fallback, level) {
  const keys = Object.keys(node ?? {});
  if (keys.find((k) => k === prop)) return prop;
  const pick = keys[0] !== '_markers' ? keys[0] : keys[1];
  fallback.push(`${level}: ${prop} -> ${pick}`);
  return pick;
}

// ---------------------------------------------------------------------------------------------
// The autorec lookup
// ---------------------------------------------------------------------------------------------
export function sortAndFilter(entries) {
  const sorted = [...entries].sort((a, b) => (b.label?.replace(/\s+/g, '').length ?? 0) - (a.label?.replace(/\s+/g, '').length ?? 0));
  return { exact: sorted.filter((x) => x.advanced?.exactMatch), best: sorted.filter((x) => !x.advanced?.exactMatch) };
}

export function menuSearch(menus, trueName) {
  const rinsed = rinse(trueName);
  if (!rinsed) return false;
  return (
    menus.exact.find((x) => x.label && x.label === trueName) ||
    menus.best.find((x) =>
      x.advanced?.excludedTerms?.length
        ? x.label && rinsed.includes(rinse(x.label)) && !x.advanced.excludedTerms.some((el) => rinsed.includes(rinse(el)))
        : x.label && rinsed.includes(rinse(x.label)),
    ) ||
    false
  );
}

/**
 * AA's handleItem for a dnd5e use: the activity name first (unless "heal"/"summon"), then the item
 * name; a template placement re-searches the templatefx menu when the first hit was melee/range/ontoken.
 * @param world  {melee:[], range:[], ...} the autorec menus (each entry tagged with .menu)
 */
export function aaLookup(world, { itemName, activityNames = [], isTemplate = false, isEffect = false }) {
  if (isEffect) return menuSearch(sortAndFilter(world.aefx ?? []), itemName);
  const all = sortAndFilter(['melee', 'range', 'ontoken', 'templatefx', 'aura', 'preset'].flatMap((m) => world[m] ?? []));
  const names = [...activityNames.filter((n) => n && !['heal', 'summon'].includes(n.trim())), itemName];
  let found = false;
  for (const n of names) {
    found = menuSearch(all, n);
    if (found) break;
  }
  if (found && isTemplate && ['range', 'melee', 'ontoken'].includes(found.menu)) found = menuSearch(sortAndFilter(world.templatefx ?? []), itemName);
  return found;
}
