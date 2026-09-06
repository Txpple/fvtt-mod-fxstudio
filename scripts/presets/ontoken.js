// On a token (AA's on-token menu, and the on-token active-effect looks): an effect on the source,
// on each target, or both, persistent when the row says so; shield effects play as a bottom and a
// top half. Port of standard-sequences/staticAnimation.js.
import { alreadyOn, effectName, firstFile, freshTargets, getSize, open, pathOf, secondaryLayer, spot, targetLayer, tint, useFile } from './common.js';

export function build(ctx) {
  const { moment, primary } = ctx;
  const o = primary.options;
  const sourceToken = moment.sourceToken;
  if (!sourceToken) return null;
  const path = pathOf(primary);
  const sourceSize = getSize(o.isRadius, o.size, sourceToken, o.addTokenWidth);
  const truePath = o.isShieldFX ? firstFile(path) : null;
  const bottomAnim = truePath?.replace('Above', 'Below') ?? null;
  const targets = moment.targets;
  const fresh = freshTargets(ctx, targets);
  const isComplete = primary.video?.variant === 'complete' || primary.video?.animation === 'complete';

  const seq = open(ctx);

  const setBottom = (token, size, s) => {
    useFile(s, bottomAnim, ctx);
    s.opacity(o.opacity);
    s.size(size, { gridUnits: true });
    if (o.isMasked) s.mask(token);
    s.rotate(180);
    s.fadeIn(250);
    s.fadeOut(500);
    tint(s, o);
    if (!o.persistent) { s.atLocation(token); s.repeats(o.repeat, o.repeatDelay); }
    else { s.attachTo(token, { bindAlpha: o.unbindAlpha, bindVisibility: o.unbindVisibility }); s.persist(true, { persistTokenPrototype: true }); s.origin(moment.origin); }
    s.playbackRate(o.playbackRate);
    if (moment.tieTo) s.tieToDocuments(moment.tieTo);
  };
  const setTop = (token, size, s) => {
    useFile(s, truePath, ctx);
    s.opacity(o.opacity);
    s.size(size, { gridUnits: true });
    if (o.isMasked) s.mask(token);
    s.fadeIn(250);
    s.fadeOut(500);
    tint(s, o);
    if (!o.persistent) { s.atLocation(token); s.repeats(o.repeat, o.repeatDelay); }
    else { s.attachTo(token, { bindAlpha: o.unbindAlpha, bindVisibility: o.unbindVisibility }); s.persist(true, { persistTokenPrototype: true }); s.origin(moment.origin); }
    s.playbackRate(o.playbackRate);
    if (moment.tieTo) s.tieToDocuments(moment.tieTo);
  };
  const setPrimary = (token, size, s) => {
    useFile(s, path, ctx);
    s.opacity(o.opacity);
    s.size(size, { gridUnits: true });
    if (o.elevation === 0) s.belowTokens(true);
    if (o.isMasked) s.mask(token);
    s.zIndex(o.zIndex);
    tint(s, o);
    if (!o.persistent) { s.atLocation(token); s.repeats(o.repeat, o.repeatDelay); s.fadeIn(o.fadeIn); s.fadeOut(o.fadeOut); }
    else {
      s.fadeIn(o.fadeIn);
      if (!isComplete) s.fadeOut(o.fadeOut);
      s.attachTo(token, { bindAlpha: o.unbindAlpha, bindVisibility: o.unbindVisibility });
      s.persist(true, { persistTokenPrototype: true });
      s.origin(moment.origin);
    }
    s.anchor({ x: o.anchor.x, y: o.anchor.y });
    s.playbackRate(o.playbackRate);
    if (moment.tieTo) s.tieToDocuments(moment.tieTo);
  };
  // one token, named, with the wait/delay rule the caller decides
  const place = (token, size, named, timing) => {
    if (o.isShieldFX) {
      const bottom = seq.effect().name(named);
      setBottom(token, size, bottom);
      const top = seq.effect().name(named);
      setTop(token, size, top);
      timing(top);
    } else {
      const s = seq.effect().name(named);
      setPrimary(token, size, s);
      timing(s);
    }
  };
  const waitOnly = (s) => { if (o.isWait) s.waitUntilFinished(o.delay); };
  const waitOrDelay = (last) => (s) => { if (last && o.isWait) s.waitUntilFinished(o.delay); else if (!o.isWait) s.delay(o.delay); };

  if (o.playOn === 'source' || (o.playOn === 'default' && targets.length < 1)) {
    if (alreadyOn(ctx, sourceToken)) return null;
    place(sourceToken, sourceSize, effectName(ctx, sourceToken), waitOnly);
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, [sourceToken], false, false);
  }

  if ((o.playOn === 'target' || o.playOn === 'default') && targets.length > 0) {
    if (fresh.length < 1) return null;
    for (let i = 0; i < fresh.length; i++) {
      const t = fresh[i];
      place(t, getSize(o.isRadius, o.size, t, o.addTokenWidth), spot(t), waitOrDelay(i === fresh.length - 1));
    }
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, fresh, !!ctx.target, true);
    if (ctx.target) targetLayer(seq, ctx.target, ctx, targets, true);
  }

  if (o.playOn === 'both') {
    const sourceOn = alreadyOn(ctx, sourceToken);
    if (sourceOn && fresh.length < 1) return null;
    if (!sourceOn) place(sourceToken, sourceSize, spot(sourceToken), waitOrDelay(fresh.length < 1));
    for (let i = 0; i < fresh.length; i++) {
      const t = fresh[i];
      place(t, getSize(o.isRadius, o.size, t, o.addTokenWidth), spot(t), waitOrDelay(i === fresh.length - 1));
    }
    if (ctx.secondary && !sourceOn) secondaryLayer(seq, ctx.secondary, ctx, [sourceToken], false, false);
    if (fresh.length) {
      if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, fresh, !!ctx.target, true);
      if (ctx.target) targetLayer(seq, ctx.target, ctx, targets, true);
    }
  }
  return seq;
}
