// What every preset shares: the Sequence options, the path a layer plays through, AA's sizing and
// distance arithmetic, the sound section, and the three extra layers (source, secondary, target)
// that any primary can carry. Ported from Automated Animations 7.0.22 (MIT, (c) Otigon and
// contributors): system-handlers/commonSequences.js and workflow-data.js, simplified to what this
// corpus uses (no macros, no Levels, no 3D) and kept line-for-line where a number is a number.
//
// A CONTEXT (ctx) is what a preset builds from:
//   moment     what happened (scripts/reader.js): sourceToken, targets, hits, template, item, origin…
//   row        the corpus row that answered
//   primary    row.fx[0]; secondary / source / target: the extra layers, or undefined
//   files      every path this build named, in order (the suites read it; the ledger keeps it)
//   sounds     every sound it named
//   name       the matched name, rinsed the way AA rinsed it (the effect name templates carry)

export const SEQUENCE_OPTIONS = { moduleName: 'FX Studio', softFail: true };

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const rinse = (s) => (s ?? '').replace(/\s+/g, '').toLowerCase();

/** the Sequencer path a layer (or a preset part) plays through: the private twin of AA's table, else the custom path */
export function pathOf(part) {
  if (!part) return null;
  if (part.aa) return `fxstudio.aa.${part.aa.replace(/^autoanimations\./, '')}`;
  return part.file ?? null;
}

/** a return animation's path (returning weapons), or null */
export const returnPathOf = (part) => (part?.returnAa ? `fxstudio.aa.${part.returnAa.replace(/^autoanimations\./, '')}` : null);

/** the first raw file behind a database path (what AA called the true path; shield effects play it raw) */
export function firstFile(path) {
  if (!path) return null;
  if (path.includes('/')) return path;
  try {
    if (!Sequencer.Database.entryExists(path)) return null;
    const entry = Sequencer.Database.getEntry(path);
    const list = Array.isArray(entry) ? entry : [entry];
    const files = list.flatMap((e) => (e?.getAllFiles ? e.getAllFiles() : []));
    return files[0] ?? null;
  } catch {
    return null;
  }
}

/** .file() with a record of it, so a build can be read without playing */
export function useFile(section, path, ctx) {
  ctx.files.push(path);
  return section.file(path);
}

/** AA's setSound: one sound section, its delay already carrying the layer's delay when the layer does not wait */
export function addSound(seq, sound, ctx) {
  if (!sound?.file) return;
  ctx.sounds.push(sound.file);
  seq.sound().file(sound.file).delay(sound.delay ?? 0).startTime(sound.startTime ?? 0).volume(sound.volume ?? 1).repeats(sound.repeat ?? 1, sound.repeatDelay ?? 250);
}

/** AA's getSize: grid units for an effect on a token */
export function getSize(isRadius, size, token, addToken = false) {
  const td = token.document;
  const maxSize = Math.max(td.width * td.texture.scaleX, td.height * td.texture.scaleY) / ((td.ring?.enabled && td.ring?.subject?.scale) || 1);
  if (isRadius && addToken) return size * 2 + maxSize;
  if (isRadius) return size * 2;
  return maxSize * 1.5 * size;
}

/** AA's elevation: absolute, or one under the value so the effect sits with the token */
export const elevationOf = (abs, level) => (abs ? level : level - 1);

/** AA's getDistance (midi-qol's arithmetic): the shortest grid path between two tokens, in grid units */
export function distanceBetween(t1, t2) {
  if (!canvas?.scene || !canvas.grid || !canvas.dimensions || !t1 || !t2) return -1;
  const t1StartX = t1.document.width >= 1 ? 0.5 : t1.document.width / 2;
  const t1StartY = t1.document.height >= 1 ? 0.5 : t1.document.height / 2;
  const t2StartX = t2.document.width >= 1 ? 0.5 : t2.document.width / 2;
  const t2StartY = t2.document.height >= 1 ? 0.5 : t2.document.height / 2;
  const segments = [];
  for (let x = t1StartX; x < t1.document.width; x++) {
    for (let y = t1StartY; y < t1.document.height; y++) {
      const origin = canvas.grid.getCenterPoint({ x: Math.round(t1.document.x + canvas.dimensions.size * x), y: Math.round(t1.document.y + canvas.dimensions.size * y) });
      for (let x1 = t2StartX; x1 < t2.document.width; x1++) {
        for (let y1 = t2StartY; y1 < t2.document.height; y1++) {
          const dest = canvas.grid.getCenterPoint({ x: Math.round(t2.document.x + canvas.dimensions.size * x1), y: Math.round(t2.document.y + canvas.dimensions.size * y1) });
          segments.push([origin, dest]);
        }
      }
    }
  }
  if (!segments.length) return -1;
  let distance = Infinity;
  for (const segment of segments) {
    const d = canvas.grid.measurePath(segment, { gridSpaces: true }).distance;
    if (d < distance) distance = d;
  }
  return distance / canvas.dimensions.distance;
}

/** tint plus the colour-matrix filter, as AA applied them together */
export function tint(section, o) {
  if (!o.tint) return;
  section.tint(o.tintColor);
  section.filter('ColorMatrix', { contrast: o.contrast, saturate: o.saturation });
}

/** the name AA gave an effect: the effect's own name on a token for active effects, "spot <id>" otherwise */
export const spot = (token) => `spot ${token.id}`;
export const effectName = (ctx, token) => (ctx.moment.kind === 'effect' ? `${ctx.moment.names[0]}${token.id}` : spot(token));

/** AA's fakeSource: a random point inside a template effect of this name, else the source token */
export function fakeSource(ctx) {
  const templateSource = Sequencer.EffectManager.getEffects({ sceneId: canvas.scene.id, name: ctx.name })[0];
  if (!templateSource) return ctx.moment.sourceToken;
  const half = canvas.grid.size / 2;
  const xMin = templateSource.source.x - templateSource.source.width / 2 + half;
  const xMax = templateSource.source.x + templateSource.source.width / 2 - half;
  const yMin = templateSource.source.y - templateSource.source.height / 2 + half;
  const yMax = templateSource.source.y + templateSource.source.height / 2 - half;
  return { x: Sequencer.Helpers.random_int_between(xMin, xMax), y: Sequencer.Helpers.random_int_between(yMin, yMax) };
}

/** true when the target was hit; a moment without a verdict (a use, a save) counts every target as hit */
export const wasHit = (ctx, token) => (ctx.moment.hits ? ctx.moment.hits.has(token.id) : true);

/** targets that do not already carry an effect of this origin (AA re-used the loop while a persistent effect stood) */
export const freshTargets = (ctx, targets) => targets.filter((t) => Sequencer.EffectManager.getEffects({ object: t, origin: ctx.moment.origin }).length === 0);
export const alreadyOn = (ctx, token) => Sequencer.EffectManager.getEffects({ object: token, origin: ctx.moment.origin }).length > 0;

// ---------------------------------------------------------------------------------------------
// the extra layers (commonSequences.js)
// ---------------------------------------------------------------------------------------------

export function sourceLayer(seq, layer, ctx) {
  const o = layer.options;
  const sourceToken = ctx.moment.sourceToken;
  addSound(seq, layer.sound, ctx);
  const s = useFile(seq.effect(), pathOf(layer), ctx)
    .anchor({ x: o.anchor.x, y: o.anchor.y })
    .fadeIn(o.fadeIn)
    .opacity(o.opacity)
    .origin(ctx.moment.origin)
    .playbackRate(o.playbackRate)
    .repeats(o.repeat, o.repeatDelay)
    .size(getSize(o.isRadius, o.size, sourceToken, o.addTokenWidth), { gridUnits: true })
    .zIndex(o.zIndex);
  if (o.elevation === 0) s.belowTokens(true);
  else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
  tint(s, o);
  if (o.animationSource) {
    const at = fakeSource(ctx);
    s.atLocation({ x: at.x, y: at.y });
  } else {
    s.attachTo(sourceToken);
    if (o.persistent) s.persist(true, { persistTokenPrototype: true });
  }
  if (o.isMasked) s.mask(sourceToken);
  if (ctx.moment.tieTo) s.tieToDocuments(ctx.moment.tieTo);
  if (!(layer.video?.variant === 'complete' || layer.video?.animation === 'complete')) s.fadeOut(o.fadeOut);
  if (o.isWait) s.waitUntilFinished(o.delay);
  else s.delay(o.delay);
}

export function secondaryLayer(seq, layer, ctx, targets, targetEnabled = false, missable = false) {
  const o = layer.options;
  addSound(seq, layer.sound, ctx);
  const all = ctx.moment.targets.length;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const s = useFile(seq.effect(), pathOf(layer), ctx)
      .anchor({ x: o.anchor.x, y: o.anchor.y })
      .atLocation(missable ? spot(t) : t)
      .fadeIn(o.fadeIn)
      .fadeOut(o.fadeOut)
      .opacity(o.opacity)
      .origin(ctx.moment.origin)
      .playbackRate(o.playbackRate)
      .repeats(o.repeat, o.repeatDelay)
      .size(getSize(o.isRadius, o.size, t, o.addTokenWidth), { gridUnits: true })
      .zIndex(o.zIndex);
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
    tint(s, o);
    // AA counts the last of ALL targets here, not of the array it was handed; kept as it was
    if (i === all - 1 && o.isWait && targetEnabled) s.waitUntilFinished(o.delay);
    else if (!o.isWait) s.delay(o.delay);
    if (o.rotateSource) { s.rotateTowards(ctx.moment.sourceToken); s.rotate(180); }
    if (o.isMasked) s.mask(t);
  }
}

export function targetLayer(seq, layer, ctx, targets, missable = false) {
  const o = layer.options;
  addSound(seq, layer.sound, ctx);
  for (const t of targets) {
    if (alreadyOn(ctx, t)) continue;
    const s = useFile(seq.effect(), pathOf(layer), ctx)
      .anchor({ x: o.anchor.x, y: o.anchor.y })
      .delay(o.delay)
      .fadeIn(o.fadeIn)
      .opacity(o.opacity)
      .origin(ctx.moment.origin)
      .playbackRate(o.playbackRate)
      .repeats(o.repeat, o.repeatDelay)
      .size(getSize(o.isRadius, o.size, t, o.addTokenWidth), { gridUnits: true })
      .zIndex(o.zIndex);
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
    tint(s, o);
    if (o.persistent) {
      s.persist(true, { persistTokenPrototype: true });
      s.attachTo(t, { bindVisibility: o.unbindVisibility, bindAlpha: o.unbindAlpha });
    } else s.atLocation(missable ? spot(t) : t);
    if (o.rotateSource) { s.rotateTowards(ctx.moment.sourceToken); s.rotate(180); }
    if (o.isMasked) s.mask(t);
    if (!(layer.video?.variant === 'complete' || layer.video?.animation === 'complete')) s.fadeOut(o.fadeOut);
  }
}

/** a new Sequence with the source layer and the primary sound in AA's order */
export function open(ctx, { withSource = true, withSound = true } = {}) {
  const seq = new Sequence(SEQUENCE_OPTIONS);
  if (withSource && ctx.source) sourceLayer(seq, ctx.source, ctx);
  if (withSound) addSound(seq, ctx.primary.sound, ctx);
  return seq;
}
