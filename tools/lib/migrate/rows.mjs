// A phase-1 row (Automated Animations' entry, losslessly read) → a look in the grammar of
// scripts/core/looks.js. The mapping table, one line per AA option, is this file; the report
// prints it so a reader can see where every value went. AA's concepts (menus, playOn, isRadius,
// shield flags, "complete" loops, the last-of-all-targets wait) end here as values on scenes.
//
// The scene defaults the engine reads (DEFAULTS in core/looks.js) equal AA's own defaults, so a
// knob is written only where AA's value differs from them; the render-level proof checks the result.
import { DEFAULTS, SOUND_DEFAULTS } from '../../../scripts/core/looks.js';
import { slug } from '../../../scripts/core/subjects.js';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isComplete = (l) => l?.video?.variant === 'complete' || l?.video?.animation === 'complete';

/** drop a knob that equals the shape's default */
function trim(scene) {
  const d = DEFAULTS[scene.shape] ?? {};
  for (const [k, v] of Object.entries(scene)) {
    if (v === undefined) { delete scene[k]; continue; }
    if (k !== 'shape' && k in d && eq(d[k], v)) delete scene[k];
  }
  if (scene.repeat === undefined || scene.repeat === 1) delete scene.every;
  if (scene.delay === 0) delete scene.delay;
  if (scene.size && scene.size.scale === undefined) delete scene.size.scale;
  return scene;
}

/** AA's sound {file, volume, delay, startTime, repeat, repeatDelay} → {asset, volume, delay, start, repeat, every} */
export function soundOf(s) {
  if (!s?.file) return undefined;
  const out = { asset: s.file };
  if (s.volume !== undefined && s.volume !== SOUND_DEFAULTS.volume) out.volume = s.volume;
  if (s.delay) out.delay = s.delay;
  if (s.startTime) out.start = s.startTime;
  if (s.repeat && s.repeat !== 1) { out.repeat = s.repeat; if (s.repeatDelay !== undefined && s.repeatDelay !== SOUND_DEFAULTS.every) out.every = s.repeatDelay; }
  return out;
}

const tintOf = (o) => (o.tint ? { colour: o.tintColor, contrast: o.contrast ?? 0, saturation: o.saturation ?? 0 } : undefined);
/** elevation as AA emitted it: 'below-only' (0 → under the tokens, else nothing), 'both' (else at level−1), 'always' */
function elevationOf(o, mode) {
  if (mode !== 'always' && o.elevation === 0) return { below: true };
  if (mode === 'below-only') return {};
  const level = o.isAbsolute ? o.elevation : o.elevation - 1;
  return { elevation: { level, absolute: !!o.isAbsolute } };
}
const attachOf = (o) => (o.unbindAlpha || o.unbindVisibility ? { alpha: !!o.unbindAlpha, visibility: !!o.unbindVisibility } : undefined);
const sizeOf = (o) => (o.isRadius ? { radius: o.size, plusToken: o.addTokenWidth || undefined } : { tokenWidths: 1.5 * o.size });
const repeatOf = (o) => ({ repeat: o.repeat, every: o.repeatDelay });
const AT_OF = { source: 'source', default: 'targets-else-source', target: 'each-target', both: 'both' };

/**
 * @param row       a phase-1 row
 * @param assetFor  (aaPath) → {asset, how, note} from the nativiser
 * @param opts      {id, keys, on}
 * @returns {look, notes: [sentences about what was translated with a difference]}
 */
export function rowToLook(row, nativiser, { id, keys, on }) {
  const { assetFor, firstFile } = nativiser;
  const notes = [];
  const scenes = [];
  const assetOf = (layer, where) => {
    if (!layer) return undefined;
    if (layer.aa) { const r = assetFor(layer.aa); if (r.note) notes.push(`${where}: ${r.note}`); return r.asset; }
    if (layer.file) return { file: layer.file };
    return undefined;
  };
  const clean = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  // --- the extra layers every menu can carry -------------------------------------------------
  const sourceScene = (layer) => {
    const o = layer.options;
    const s = { shape: 'mark', at: o.animationSource ? 'area' : 'source', asset: assetOf(layer, 'source'), sound: soundOf(layer.sound), anchor: o.anchor, fadeIn: o.fadeIn, fadeOut: isComplete(layer) ? 0 : o.fadeOut, opacity: o.opacity, rate: o.playbackRate, ...repeatOf(o), size: sizeOf(o), zIndex: o.zIndex, ...elevationOf(o, 'both'), tint: tintOf(o), mask: o.isMasked || undefined, delay: o.delay, wait: o.isWait || undefined };
    if (o.persistent) s.persist = 'until-removed'; else if (!o.animationSource) s.follow = true;
    return trim(s);
  };
  const secondaryScene = (layer, at, targetLayerPresent) => {
    const o = layer.options;
    if (o.isWait && !targetLayerPresent) notes.push('secondary: AA neither waited nor delayed here (a wait with no target layer); the scene waits');
    const s = { shape: 'mark', at, asset: assetOf(layer, 'secondary'), sound: soundOf(layer.sound), anchor: o.anchor, fadeIn: o.fadeIn, fadeOut: o.fadeOut, opacity: o.opacity, rate: o.playbackRate, ...repeatOf(o), size: sizeOf(o), zIndex: o.zIndex, ...elevationOf(o, 'both'), tint: tintOf(o), mask: o.isMasked || undefined, face: o.rotateSource ? 'away-from-source' : undefined, delay: o.delay, wait: o.isWait || undefined };
    return trim(s);
  };
  const targetScene = (layer, at) => {
    const o = layer.options;
    const s = { shape: 'mark', at, asset: assetOf(layer, 'target'), sound: soundOf(layer.sound), anchor: o.anchor, fadeIn: o.fadeIn, fadeOut: isComplete(layer) ? 0 : o.fadeOut, opacity: o.opacity, rate: o.playbackRate, ...repeatOf(o), size: sizeOf(o), zIndex: o.zIndex, ...elevationOf(o, 'both'), tint: tintOf(o), mask: o.isMasked || undefined, face: o.rotateSource ? 'away-from-source' : undefined, delay: o.delay };
    if (o.persistent) { s.persist = 'until-removed'; s.attach = attachOf(o); }
    return trim(s);
  };
  const extras = (row, { secondaryAt, targetAt, withTarget = true }) => {
    const sec = row.fx.find((l) => l.preset === 'secondary');
    const tgt = row.fx.find((l) => l.preset === 'target');
    const out = [];
    if (sec) out.push(secondaryScene(sec, secondaryAt, !!tgt));
    if (tgt && withTarget) out.push(targetScene(tgt, targetAt));
    return out;
  };
  const source = row.fx?.find((l) => l.preset === 'source');
  const primary = row.fx?.[0];

  if (row.soundOnly) {
    const s = row.soundOnly;
    scenes.push(trim({ shape: 'sound', asset: s.file, volume: s.volume, delay: s.delay, start: s.startTime, repeat: s.repeat, every: s.repeatDelay }));
    return { look: finish(), notes };
  }

  switch (primary?.preset) {
    // --- the swing ----------------------------------------------------------------------------
    case 'melee-swing': {
      const o = primary.options;
      const clawOrBite = primary.video?.animation === 'claw' || primary.video?.animation === 'bite';
      const s = { shape: 'strike', asset: assetOf(primary, 'swing'), sound: soundOf(primary.sound), size: { tokenWidths: (clawOrBite ? 1 : 5) * o.size }, ...repeatOf(o), opacity: o.opacity, zIndex: o.zIndex, ...elevationOf(o, 'below-only'), tint: tintOf(o), delay: o.delay, wait: o.isWait || undefined, rate: o.playbackRate };
      const th = row.thrown;
      if (th && (th.aa || th.file)) {
        s.thrown = { asset: assetOf(th, 'thrown') };
        if (th.options?.isReturning && th.returnAa) s.thrown.return = { asset: assetFor(th.returnAa).asset };
        const snd = soundOf(th.sound); if (snd) s.thrown.sound = snd;
        if (th.options?.detect === 'manual') s.thrown.reach = th.options.range;
      } else if (th) notes.push('thrown: the switch was on but named no flight; nothing is thrown (as under AA)');
      if (source) scenes.push(sourceScene(source));
      scenes.push(trim(s));
      scenes.push(...extras(row, { secondaryAt: 'impact', targetAt: 'impact' }));
      break;
    }
    // --- the bolt -----------------------------------------------------------------------------
    case 'projectile': {
      const o = primary.options;
      const s = { shape: 'shoot', asset: assetOf(primary, 'bolt'), sound: soundOf(primary.sound), from: o.animationSource ? 'area' : o.reverse ? 'each-target' : 'source', to: o.reverse ? 'source' : 'each-target', scatter: o.randomOffset || undefined, ...repeatOf(o), opacity: o.opacity, zIndex: o.zIndex, ...elevationOf(o, 'below-only'), tint: tintOf(o), delay: o.delay, wait: o.isWait || undefined, rate: o.playbackRate };
      if (o.isReturning && primary.returnAa) s.return = { asset: assetFor(primary.returnAa).asset };
      if (source) scenes.push(sourceScene(source));
      scenes.push(trim(s));
      scenes.push(...extras(row, { secondaryAt: 'impact', targetAt: 'impact' }));
      break;
    }
    // --- on a token ---------------------------------------------------------------------------
    case 'on-token': {
      const o = primary.options;
      const at = AT_OF[o.playOn] ?? 'targets-else-source';
      const persist = o.persistent ? (on === 'effect' ? 'effect' : 'until-removed') : 'none';
      const sourceOnly = at === 'source';
      const common = { at, sound: soundOf(primary.sound), opacity: o.opacity, size: sizeOf(o), rate: o.playbackRate, tint: tintOf(o), mask: o.isMasked || undefined, persist, attach: o.persistent ? attachOf(o) : undefined };
      // AA applied the delay only with a wait when the picture sat on the caster; carried as it was
      const timingOf = () => (sourceOnly ? { wait: o.isWait || undefined, delay: o.isWait ? o.delay : undefined } : { wait: o.isWait || undefined, delay: o.delay });
      if (source) scenes.push(sourceScene(source));
      if (o.isShieldFX) {
        // AA played a shield as its first raw file (the top half) and the same file named Below (the bottom half)
        const topFile = primary.aa ? firstFile(primary.aa) : primary.file ?? null;
        const bottomFile = topFile?.replace('Above', 'Below') ?? null;
        if (!topFile) notes.push('shield: no raw file to split into halves');
        scenes.push(trim({ shape: 'mark', ...common, asset: { file: bottomFile }, rotate: 180, fadeIn: 250, fadeOut: 500, zIndex: 0, ...(o.persistent ? {} : repeatOf(o)) }));
        scenes.push(trim({ shape: 'mark', ...common, sound: undefined, asset: { file: topFile }, fadeIn: 250, fadeOut: 500, zIndex: 0, ...(o.persistent ? {} : repeatOf(o)), ...timingOf() }));
      } else {
        const s = { shape: 'mark', ...common, asset: assetOf(primary, 'mark'), zIndex: o.zIndex, ...elevationOf(o, 'below-only'), anchor: o.anchor, fadeIn: o.fadeIn, fadeOut: o.persistent && isComplete(primary) ? 0 : o.fadeOut, ...(o.persistent ? {} : repeatOf(o)), ...timingOf() };
        scenes.push(trim(s));
      }
      if (o.playOn === 'both') notes.push('on both: AA played the secondary layer twice (once for the caster, once for the targets) with its sound each time; the scene plays once over both');
      scenes.push(...extras(row, { secondaryAt: at, targetAt: 'each-target', withTarget: !sourceOnly }));
      break;
    }
    // --- on a template ------------------------------------------------------------------------
    case 'template': {
      const o = primary.options;
      const s = { shape: 'fill', asset: assetOf(primary, 'fill'), sound: soundOf(primary.sound), size: { fit: 'shape', scale: o.scale && (o.scale.x !== 1 || o.scale.y !== 1) ? o.scale : undefined }, opacity: o.opacity, ...elevationOf(o, 'below-only'), zIndex: o.zIndex, rotate: o.rotate || undefined, mask: o.isMasked || undefined, rate: o.playbackRate, aboveLighting: o.aboveTemplate || undefined, xray: o.xray || undefined, tint: tintOf(o), delay: o.isWait ? undefined : o.delay, wait: o.isWait || undefined, clearTemplate: o.removeTemplate || undefined };
      if (o.anchor) { const parsed = String(o.anchor).split(',').map((x) => Number(x.trim())); if (parsed.length === 2 && parsed.every(Number.isFinite)) s.anchor = { x: parsed[0], y: parsed[1] }; else if (parsed.length === 1 && Number.isFinite(parsed[0])) s.anchor = { x: parsed[0], y: parsed[0] }; }
      if (o.persistent) { s.persist = o.persistType === 'attachtemplate' ? 'template' : 'until-removed'; if (o.persistType === 'overheadtile' || o.persistType === 'groundtile') notes.push(`fill: tile persistence (${o.persistType}) was never carried; it stays on the ground`); }
      else Object.assign(s, repeatOf(o));
      if (s.size.scale === undefined) delete s.size.scale;
      if (source) scenes.push(sourceScene(source));
      scenes.push(trim(s));
      scenes.push(...extras(row, { secondaryAt: 'each-target', targetAt: 'each-target' }));
      break;
    }
    // --- the aura -----------------------------------------------------------------------------
    case 'aura': {
      const o = primary.options;
      const at = AT_OF[o.playOn] ?? 'source';
      const s = { shape: 'aura', at, asset: assetOf(primary, 'aura'), sound: soundOf(primary.sound), size: { radius: o.size, plusToken: o.addTokenWidth || undefined }, tint: o.tint ? { colour: o.tintColor, saturation: o.tintSaturate } : undefined, ...elevationOf(o, 'both'), attach: attachOf(o), opacity: o.opacity, fadeIn: o.fadeIn, fadeOut: isComplete(primary) ? 0 : o.fadeOut, zIndex: o.zIndex, rate: o.playbackRate, persist: on === 'effect' ? 'effect' : 'until-removed', breathe: o.breath ? { min: o.breathMin, max: o.breathMax, every: o.breathDuration } : undefined, pulse: o.alpha ? { min: o.alphaMin, max: o.alphaMax, every: o.alphaDuration } : undefined, wait: o.isWait || undefined, delay: at === 'source' ? (o.isWait ? o.delay : undefined) : o.delay };
      if (source) scenes.push(sourceScene(source));
      scenes.push(trim(s));
      scenes.push(...extras(row, { secondaryAt: at, targetAt: 'each-target', withTarget: at !== 'source' }));
      break;
    }
    // --- the compositions AA called presets --------------------------------------------------
    case 'teleport': {
      const d = primary.data;
      const snd = soundOf(d.sound);
      const parts = [];
      if (d.start?.aa || d.start?.file) { const o = d.start.options; parts.push(trim({ shape: 'mark', at: 'source', asset: assetOf(d.start, 'start'), ...elevationOf(o, 'always'), size: { tokenWidths: 1.5 * o.size }, opacity: o.opacity, fadeIn: o.fadeIn, fadeOut: o.fadeOut, delay: o.delay, rate: o.playbackRate, mask: o.isMasked || undefined, zIndex: 0 })); }
      if (d.between?.aa || d.between?.file) { const o = d.between.options; parts.push(trim({ shape: 'shoot', from: 'source', to: 'destination', asset: assetOf(d.between, 'between'), delay: o.delay, ...elevationOf(o, 'always'), opacity: o.opacity, rate: o.playbackRate, mirror: 'none', zIndex: 0 })); }
      if (d.end?.aa || d.end?.file) { const o = d.end.options; parts.push(trim({ shape: 'mark', at: 'destination', asset: assetOf(d.end, 'end'), delay: o.delay, ...elevationOf(o, 'always'), size: { tokenWidths: 1.5 * o.size }, opacity: o.opacity, fadeIn: o.fadeIn, fadeOut: o.fadeOut, rate: o.playbackRate, mask: o.isMasked || undefined, zIndex: 0 })); }
      if (snd) { if (parts.length) parts[0].sound = snd; else parts.push({ shape: 'sound', ...snd }); }
      const o = d.options;
      const move = { shape: 'move', range: o.range, speed: o.speed, jump: !!o.teleport, after: o.delayMove, pick: 'click', ...(o.checkCollision ? {} : { seen: false }) }; // AA's Check Collision was the user's own "walls matter" per look: it is now "a space you can see" (the default); off means the spot need not be seen
      if (o.alpha < 1) move.fade = { to: o.alpha, after: o.delayFade, back: o.delayReturn };
      if (o.hideFromPlayers || o.measureType !== 'alternating') notes.push('move: the range ring is always shown to everyone and measured alternating; AA had switches for both (no row used them)');
      scenes.push(...parts, trim(move));
      break;
    }
    case 'projectile-to-template': {
      const d = primary.data;
      if (source) scenes.push(sourceScene(source));
      { const o = d.projectile.options; scenes.push(trim({ shape: 'shoot', from: 'source', to: 'template', asset: assetOf(d.projectile, 'projectile'), sound: soundOf(d.projectile.sound), scatter: o.randomOffset || undefined, ...repeatOf(o), rate: o.playbackRate, wait: o.wait === 0 ? true : o.wait, ...elevationOf(o, 'both'), mirror: 'none', zIndex: 0, clearTemplate: o.removeTemplate || undefined })); }
      const preSound = soundOf(d.preExplosion?.sound);
      if (d.preExplosion?.enable && (d.preExplosion.aa || d.preExplosion.file)) { const o = d.preExplosion.options; scenes.push(trim({ shape: 'mark', at: 'template', asset: assetOf(d.preExplosion, 'pre-explosion'), sound: preSound, size: { fit: 'object', scale: o.scale }, ...repeatOf(o), rate: o.playbackRate, wait: o.wait === 0 ? true : o.wait, aboveLighting: o.aboveTemplate || undefined, ...elevationOf(o, 'both'), fadeIn: 0, fadeOut: 0, zIndex: 0 })); }
      else if (preSound) scenes.push({ shape: 'sound', ...preSound });
      { const o = d.explosion.options; scenes.push(trim({ shape: 'mark', at: 'template', asset: assetOf(d.explosion, 'explosion'), sound: soundOf(d.explosion.sound), size: { fit: 'object', scale: o.scale }, ...repeatOf(o), zIndex: 5, rate: o.playbackRate, wait: -750 + o.wait === 0 ? true : -750 + o.wait, aboveLighting: o.aboveTemplate || undefined, ...elevationOf(o, 'both'), fadeIn: 0, fadeOut: 0 })); }
      if (d.afterImage?.customPath) { const o = d.afterImage.options; scenes.push(trim({ shape: 'mark', at: 'template', asset: { file: d.afterImage.customPath }, size: { fit: 'object', scale: o.scale }, persist: o.persistent ? 'until-removed' : 'none', fadeIn: 250, fadeOut: 500, ...elevationOf(o, 'both'), zIndex: 0 })); }
      scenes.push(...extras(row, { secondaryAt: 'each-target', targetAt: 'each-target' }));
      break;
    }
    case 'dual-attach': {
      const d = primary.data;
      if (source) scenes.push(sourceScene(source));
      const o = d.options;
      if (o.opacity !== undefined && o.opacity !== 1) notes.push(`beam: AA never applied the beam's opacity (${o.opacity}); not carried`);
      scenes.push(trim({ shape: 'beam', from: 'source', to: 'each-target', asset: assetOf(d, 'beam'), sound: soundOf(d.sound), rate: o.playbackRate, ...elevationOf(o, 'both'), persist: 'until-removed' }));
      break;
    }
    case 'thunderwave': {
      const d = primary.data;
      if (source) scenes.push(sourceScene(source));
      const o = d.options;
      // three pictures picked by where the template sits against the caster, each nativised on its own
      const byPosition = {};
      for (const pos of ['center', 'mid', 'left']) {
        const r = assetFor(`autoanimations.templatefx.square.thunderwave.${pos}` + (d.color === 'random' ? '' : `.${d.color}`));
        byPosition[pos] = r.asset;
        if (r.note) notes.push(`thunderwave ${pos}: ${r.note}`);
      }
      scenes.push(trim({ shape: 'fill', asset: { byPosition }, sound: soundOf(d.sound), size: { squares: 3 }, rotate: 'by-position', opacity: o.opacity, ...repeatOf(o), ...elevationOf(o, 'both'), zIndex: 0, clearTemplate: o.removeTemplate || undefined }));
      break;
    }
    default:
      notes.push(`no mapping for preset "${primary?.preset}"`);
  }

  function finish() {
    const look = { id, for: keys, on, scenes: scenes.map(clean) };
    return look;
  }
  return { look: finish(), notes };
}

/** the id a row gets: its slug, made unique by its menu when a same-named row came first */
export function idFor(label, menu, taken) {
  const base = slug(label) || 'look';
  const suffix = { melee: 'swing', range: 'bolt', ontoken: 'mark', templatefx: 'area', aura: 'aura', preset: 'preset', aefx: 'effect' }[menu] ?? menu;
  let id = base;
  if (taken.has(id)) id = `${base}-${suffix}`;
  let n = 2;
  while (taken.has(id)) id = `${base}-${suffix}-${n++}`;
  taken.add(id);
  return id;
}
