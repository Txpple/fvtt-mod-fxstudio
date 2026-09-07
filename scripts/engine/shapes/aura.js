// AURA: a persistent picture attached to a token, sized as a radius, optionally breathing (its
// scale) and pulsing (its opacity). A token that already carries a picture of this origin is left alone.
//
//   at source | each-target | targets-else-source | both
//   size {radius, plusToken}   persist effect | until-removed   attach {alpha, visibility}
//   breathe {min, max, every}   pulse {min, max, every}
import { addSound, alreadyOn, elevate, full, gridSize, isLast, persistOn, timing, useAsset } from '../common.js';
import { spotsFor } from '../places.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const spots = spotsFor(s.at, moment, { fxName: ctx.fx.id }).filter((p) => p.token && !alreadyOn(p.token, moment.origin));
  if (!spots.length) return;
  addSound(seq, s.sound, ctx);
  spots.forEach((p, i) => {
    const e = seq.effect();
    useAsset(e, s.asset, ctx);
    ctx.pictures++;
    persistOn(e, s, p.token, ctx);
    if (s.tint?.colour) { e.tint(s.tint.colour); e.filter('ColorMatrix', { saturate: s.tint.saturation ?? 0 }); }
    e.size(gridSize(s.size, p) ?? 6, { gridUnits: true });
    elevate(e, s);
    e.opacity(s.opacity);
    if (s.fadeIn !== undefined) e.fadeIn(s.fadeIn);
    if (s.fadeOut !== undefined) e.fadeOut(s.fadeOut);
    e.zIndex(s.zIndex);
    if (s.breathe) {
      const b = { from: s.breathe.min ?? 0.95, to: s.breathe.max ?? 1.05, duration: s.breathe.every ?? 1000, pingPong: true, ease: 'easeInOutSine', gridUnits: true };
      e.loopProperty('sprite', 'scale.x', b);
      e.loopProperty('sprite', 'scale.y', b);
    }
    if (s.pulse) e.loopProperty('alphaFilter', 'alpha', { from: s.pulse.min ?? -0.5, to: s.pulse.max ?? 0.5, duration: s.pulse.every ?? 1000, pingPong: true });
    e.playbackRate(s.rate);
    e.name(`${ctx.fx.id} ${p.token.id}`);
    timing(e, s, isLast(i, spots.length));
  });
}
