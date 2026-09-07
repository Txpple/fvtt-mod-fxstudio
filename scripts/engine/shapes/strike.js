// STRIKE: a swing at the source, rotated toward each target and moved toward it when the target is
// out of reach; it can miss; `thrown` swaps in a flight (and a return flight) for targets beyond reach.
//
//   size {tokenWidths}   the swing's span in token widths (5 for a weapon swing, 1 for a claw or a bite)
//   thrown {asset, return: {asset}, sound, reach}   reach: "auto" (five feet, plus one square for a reach weapon) or squares
//   onMiss play | skip   mirror random | none
import { addSound, elevate, full, isLast, repeats, timing, tint, useAsset } from '../common.js';
import { distanceBetween, spotName, spotsFor } from '../places.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const source = moment.source;
  const targets = spotsFor(s.to, moment, { fxName: ctx.fx.id });
  if (!source || !targets.length) return;
  const size = (source.w / canvas.grid.size) * s.size.tokenWidths;
  const reachBonus = moment.subject?.reach ? 1 : 0;
  const reach = s.thrown?.reach && s.thrown.reach !== 'auto' ? s.thrown.reach : 5 / canvas.dimensions.distance + reachBonus;

  const swings = [];
  const flights = [];
  for (const t of targets) {
    if (s.onMiss === 'skip' && !t.hit) continue;
    const far = distanceBetween(source, t.token) > reach;
    if (far && s.thrown?.asset) flights.push(t); else swings.push({ ...t, far });
  }
  if (swings.length) addSound(seq, s.sound, ctx);
  swings.forEach((t, i) => {
    const e = seq.effect();
    useAsset(e, s.asset, ctx);
    ctx.pictures++;
    e.opacity(s.opacity);
    e.atLocation(source);
    if (t.far) e.moveTowards(t.token);
    else { e.rotateTowards(t.token); e.anchor({ x: 0.4, y: 0.5 }); }
    e.size(size, { gridUnits: true });
    repeats(e, s);
    if (s.mirror === 'random') e.randomizeMirrorY();
    e.missed(!t.hit);
    e.name(spotName(t.token));
    elevate(e, s);
    e.zIndex(s.zIndex);
    tint(e, s);
    timing(e, s, isLast(i, swings.length));
    e.playbackRate(s.rate);
  });
  if (flights.length) {
    addSound(seq, s.thrown.sound, ctx, 'thrown sound');
    flights.forEach((t, i) => {
      const e = seq.effect();
      useAsset(e, s.thrown.asset, ctx, 'thrown');
      ctx.pictures++;
      e.atLocation(source);
      e.stretchTo(t.token);
      e.opacity(s.opacity);
      e.zIndex(s.zIndex);
      repeats(e, s);
      e.missed(!t.hit);
      e.name(spotName(t.token));
      elevate(e, s);
      e.playbackRate(s.rate);
      tint(e, s);
      timing(e, s, isLast(i, flights.length));
    });
    if (s.thrown.return?.asset) {
      for (const t of flights) {
        const e = seq.effect();
        useAsset(e, s.thrown.return.asset, ctx, 'thrown return');
        e.opacity(s.opacity);
        e.atLocation(source);
        repeats(e, s);
        e.stretchTo(spotName(t.token));
        e.zIndex(s.zIndex);
        e.playbackRate(s.rate);
        tint(e, s);
      }
    }
  }
}
