// MARK: a static picture at a place — on a token (sized to it or as a radius), at the template, at
// the chosen spot, where the last picture landed. Once, or persistent (attached, kept on the token's
// prototype, tied to the effect it stands for). A token that already carries a picture of this
// origin is left alone: a look never doubles up.
//
//   at source | each-target | targets-else-source | both | template | destination | impact
//   size {tokenWidths} | {radius, plusToken} | {squares} | {fit: "object", scale}
//   persist none | effect | until-removed   attach {alpha, visibility}   follow: a once-only picture that still follows its token
//   face "away-from-source"   rotate degrees   mask   mirror random | none   onMiss play | skip
import { addSound, alreadyOn, elevate, full, gridSize, isLast, persistOn, repeats, timing, tint, useAsset } from '../common.js';
import { spotTarget, spotsFor } from '../places.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const persistent = s.persist !== 'none';
  let spots = spotsFor(s.at, moment, { lookName: ctx.look.id });
  spots = spots.filter((p) => !(p.token && alreadyOn(p.token, moment.origin)) && !(s.onMiss === 'skip' && p.hit === false));
  if (!spots.length) return;
  addSound(seq, s.sound, ctx);
  spots.forEach((p, i) => {
    const e = seq.effect();
    useAsset(e, s.asset, ctx);
    ctx.pictures++;
    e.opacity(s.opacity);
    const size = gridSize(s.size, p);
    if (size !== null) e.size(size, { gridUnits: true });
    else if (s.size?.fit === 'object') e.scaleToObject(s.size.scale ?? 1);
    elevate(e, s);
    if (s.mask && (p.token || p.region)) e.mask(p.token ?? p.region);
    e.zIndex(s.zIndex);
    tint(e, s);
    if (s.rotate !== undefined) e.rotate(s.rotate);
    if (p.region) { e.atLocation(p.region, { cacheLocation: true }); if (persistent) { e.persist(true); e.origin(moment.origin); } else repeats(e, s); }
    else if (persistent && p.token) persistOn(e, s, p.token, ctx);
    else {
      if (s.follow && p.token) e.attachTo(p.token); else e.atLocation(spotTarget(p));
      repeats(e, s);
      if (ctx.moment.tie) e.tieToDocuments(ctx.moment.tie);
    }
    if (s.fadeIn !== undefined) e.fadeIn(s.fadeIn);
    if (s.fadeOut !== undefined) e.fadeOut(s.fadeOut);
    if (s.face === 'away-from-source' && moment.source) { e.rotateTowards(moment.source); e.rotate(180); }
    if (s.mirror === 'random') e.randomizeMirrorY();
    if (s.aboveLighting) e.aboveLighting(true);
    if (s.anchor) e.anchor(s.anchor);
    e.playbackRate(s.rate);
    if (p.token) e.name(`${ctx.look.id} ${p.token.id}`);
    timing(e, s, isLast(i, spots.length));
  });
}
