// SHOOT: a picture stretched from a place to a place — a bolt to each target (a miss flies past),
// a flight to the template, a flight to the chosen spot. `return` sends a flight back from where it
// landed. `scatter` lands a little off the mark.
//
//   from source | area | each-target   to each-target | source | template | destination
//   onMiss fly-past | play | skip   mirror random | none   wait: a number holds the sequence that long
import { addSound, elevate, full, isLast, repeats, timing, tint, useAsset } from '../common.js';
import { spotName, spotTarget, spotsFor } from '../places.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const fromSpots = spotsFor(s.from, moment, { lookName: ctx.look.id });
  const toSpots = spotsFor(s.to, moment, { lookName: ctx.look.id });
  if (!fromSpots.length || !toSpots.length) return;
  // the travelling end is whichever side names the targets; the other side is one spot
  const perTarget = ['each-target', 'targets-else-source', 'both', 'impact'].includes(s.to) ? 'to' : ['each-target', 'targets-else-source', 'both', 'impact'].includes(s.from) ? 'from' : null;
  const pairs = perTarget === 'to' ? toSpots.map((t) => ({ from: fromSpots[0], to: t, target: t }))
    : perTarget === 'from' ? fromSpots.map((f) => ({ from: f, to: toSpots[0], target: f }))
    : [{ from: fromSpots[0], to: toSpots[0], target: toSpots[0] }];
  const shots = pairs.filter((p) => !(s.onMiss === 'skip' && p.target.hit === false));
  if (!shots.length) return;
  addSound(seq, s.sound, ctx);
  const toRegion = !!toSpots[0].region;
  shots.forEach((p, i) => {
    const e = seq.effect();
    useAsset(e, s.asset, ctx);
    ctx.pictures++;
    e.atLocation(spotTarget(p.from));
    const opts = {};
    if (toRegion) opts.cacheLocation = true;
    if (s.scatter) opts.randomOffset = true;
    e.stretchTo(spotTarget(p.to), opts);
    if (s.mirror === 'random') e.randomizeMirrorY();
    repeats(e, s);
    e.opacity(s.opacity);
    if (p.target.token) { e.missed(s.onMiss === 'fly-past' && p.target.hit === false); e.name(spotName(p.target.token)); }
    elevate(e, s);
    e.zIndex(s.zIndex);
    tint(e, s);
    timing(e, s, isLast(i, shots.length));
    e.playbackRate(s.rate);
  });
  if (s.return?.asset) {
    for (const p of shots) {
      const e = seq.effect();
      useAsset(e, s.return.asset, ctx, 'return');
      e.opacity(s.opacity);
      e.atLocation(spotTarget(p.from));
      repeats(e, s);
      e.stretchTo(p.target.token ? spotName(p.target.token) : spotTarget(p.to));
      e.zIndex(s.zIndex);
      e.playbackRate(s.rate);
      tint(e, s);
    }
  }
}
