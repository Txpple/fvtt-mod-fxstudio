// An aura (AA's aura menu and the aura active-effect looks): a persistent effect attached to the
// token, sized as a radius, optionally breathing and pulsing. Port of
// standard-sequences/aura-attach.js.
import { alreadyOn, effectName, elevationOf, freshTargets, getSize, open, pathOf, secondaryLayer, targetLayer, useFile } from './common.js';

export function build(ctx) {
  const { moment, primary } = ctx;
  const o = primary.options;
  const sourceToken = moment.sourceToken;
  if (!sourceToken) return null;
  const targets = moment.targets;
  const fresh = freshTargets(ctx, targets);
  const isComplete = primary.video?.variant === 'complete' || primary.video?.animation === 'complete';
  const seq = open(ctx);

  const setPrimary = (token, s) => {
    const size = getSize(true, o.size, token, o.addTokenWidth);
    useFile(s, pathOf(primary), ctx);
    s.persist(true, { persistTokenPrototype: true });
    s.origin(moment.origin);
    if (o.tint) { s.tint(o.tintColor); s.filter('ColorMatrix', { saturate: o.tintSaturate }); }
    s.size(size, { gridUnits: true });
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
    s.attachTo(token, { bindAlpha: o.unbindAlpha, bindVisibility: o.unbindVisibility });
    s.opacity(o.opacity);
    s.fadeIn(o.fadeIn);
    if (!isComplete) s.fadeOut(o.fadeOut);
    s.zIndex(o.zIndex);
    if (o.breath) {
      s.loopProperty('sprite', 'scale.x', { from: o.breathMin, to: o.breathMax, duration: o.breathDuration, pingPong: true, ease: 'easeInOutSine', gridUnits: true });
      s.loopProperty('sprite', 'scale.y', { from: o.breathMin, to: o.breathMax, duration: o.breathDuration, pingPong: true, ease: 'easeInOutSine', gridUnits: true });
    }
    if (o.alpha) s.loopProperty('alphaFilter', 'alpha', { from: o.alphaMin, to: o.alphaMax, duration: o.alphaDuration, pingPong: true });
    s.playbackRate(o.playbackRate);
    if (moment.tieTo) s.tieToDocuments(moment.tieTo);
  };
  const waitOrDelay = (s, last) => { if (last && o.isWait) s.waitUntilFinished(o.delay); else if (!o.isWait) s.delay(o.delay); };

  if (o.playOn === 'source' || (o.playOn === 'default' && targets.length < 1)) {
    if (alreadyOn(ctx, sourceToken)) return null;
    const s = seq.effect().name(effectName(ctx, sourceToken));
    setPrimary(sourceToken, s);
    if (o.isWait) s.waitUntilFinished(o.delay);
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, [sourceToken], false, false);
  }
  if ((o.playOn === 'target' || o.playOn === 'default') && targets.length > 0) {
    if (fresh.length < 1) return null;
    for (let i = 0; i < fresh.length; i++) { const s = seq.effect(); setPrimary(fresh[i], s); waitOrDelay(s, i === fresh.length - 1); }
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, fresh, !!ctx.target, false);
    if (ctx.target) targetLayer(seq, ctx.target, ctx, fresh, false);
  }
  if (o.playOn === 'both') {
    const sourceOn = alreadyOn(ctx, sourceToken);
    if (sourceOn && fresh.length < 1) return null;
    if (!sourceOn) { const s = seq.effect(); setPrimary(sourceToken, s); waitOrDelay(s, targets.length < 1); }
    for (let i = 0; i < fresh.length; i++) { const s = seq.effect(); setPrimary(fresh[i], s); waitOrDelay(s, i === fresh.length - 1); }
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, [sourceToken], false, false);
    if (fresh.length) {
      if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, fresh, !!ctx.target, false);
      if (ctx.target) targetLayer(seq, ctx.target, ctx, fresh, false);
    }
  }
  return seq;
}
