// FILL: a picture sized to a placed template's shape (circle, cone, line, rectangle) — attached to
// the Region while it stands, left on the ground until removed, or played once. A thunderwave-style
// asset picks its variant from where the template sits against the caster (`rotate: "by-position"`).
//
//   size {fit: "shape", scale: {x, y}} (the template's measured shape) | {squares}
//   persist none | template | until-removed   mask   rotate degrees | "by-position"   aboveLighting   xray
//   clearTemplate: the template is removed once the scene has played
import { addSound, elevate, full, repeats, timing, tint, useAsset } from '../common.js';
import { normalise } from '../assets.js';
import { relativePosition, templateShape } from '../places.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const region = moment.place;
  if (!region) return;
  const { shape, type, distance } = templateShape(region);
  if (!type) return;
  addSound(seq, s.sound, ctx);
  const e = seq.effect();
  // an asset picked by where the template sits against the caster (center, mid, left), rotated to match
  let asset = s.asset;
  let rotate = s.rotate;
  const a = normalise(asset);
  if (a?.byPosition || rotate === 'by-position') {
    const pos = moment.source ? relativePosition(moment.source, region) : { type: 'center', angle: 0 };
    if (a?.byPosition) asset = a.byPosition[pos.type] ?? a.byPosition.center;
    if (rotate === 'by-position') rotate = pos.angle;
  }
  const defaultAnchor = type === 'circle' || type === 'rectangle' ? { x: 0.5, y: 0.5 } : { x: 0, y: 0.5 };
  e.anchor(s.anchor ?? defaultAnchor);
  useAsset(e, asset, ctx);
  ctx.pictures++;
  e.opacity(s.opacity);
  e.origin(moment.origin);
  elevate(e, s);
  e.zIndex(s.zIndex);
  if (rotate !== undefined) e.rotate(rotate);
  if (s.mask) e.mask(region);
  e.playbackRate(s.rate);
  e.name(ctx.look.id);
  if (s.aboveLighting !== undefined) e.aboveLighting(!!s.aboveLighting);
  if (s.xray !== undefined) e.xray(!!s.xray);
  tint(e, s);

  const scale = s.size?.scale ?? { x: 1, y: 1 };
  if (s.size?.squares !== undefined) e.size(s.size.squares, { gridUnits: true });
  else if (type === 'cone' || type === 'line') {
    const trueHeight = type === 'cone' ? distance : (shape.width * 2) / canvas.dimensions.distancePixels;
    e.size({ width: distance * canvas.dimensions.distancePixels * scale.x, height: trueHeight * canvas.dimensions.distancePixels * scale.y });
  } else {
    const trueSize = type === 'rectangle' ? distance : distance * 2;
    e.size({ width: canvas.grid.size * (trueSize / canvas.dimensions.distance) * scale.x, height: canvas.grid.size * (trueSize / canvas.dimensions.distance) * scale.y });
  }
  const directional = type === 'cone' || type === 'line';
  if (s.persist === 'template') {
    e.persist(true);
    if (directional) { e.attachTo(region); e.rotateTowards(region, { attachTo: true }); }
    else e.attachTo(region, { bindRotation: true });
  } else if (s.persist !== 'none') {
    e.persist(true);
    e.atLocation(region, { cacheLocation: true });
    if (directional) e.rotateTowards(region, { cacheLocation: true });
  } else {
    e.atLocation(region, { cacheLocation: true });
    repeats(e, s);
    if (directional) e.rotateTowards(region, { cacheLocation: true });
  }
  if (moment.tie && s.persist !== 'none') e.tieToDocuments(moment.tie);
  if (s.wait) seq.wait(s.delay || 250);
  else timing(e, s, true);
  if (s.clearTemplate && s.persist !== 'template') ctx.clearTemplate = region;
}
