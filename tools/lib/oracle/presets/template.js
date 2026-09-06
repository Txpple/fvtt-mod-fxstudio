// On a template (AA's templatefx menu): circle, cone, ray and square, sized to the placed
// template, attached to it or left on the ground when persistent. Port of
// standard-sequences/templateAnimation.js for Foundry 14, where a placed template is a Region
// whose first shape is a circle, cone, line or rectangle.
import { addSound, pathOf, secondaryLayer, sourceLayer, targetLayer, tint, useFile, SEQUENCE_OPTIONS } from './common.js';

/** the placed template's shape, distance (grid units) and pixel width, from a Region document */
export function templateShape(template) {
  const shape = template?.shapes?.[0];
  const type = shape?.type; // circle | cone | line | rectangle
  const distance = shape?.measuredSegments?.[0]?.distance;
  return { shape, type, distance };
}

export function build(ctx) {
  const { moment, primary } = ctx;
  const o = primary.options;
  const template = moment.template;
  if (!template) return null;
  const { shape, type, distance } = templateShape(template);
  if (!type) return null;
  const path = pathOf(primary);

  const seq = new Sequence(SEQUENCE_OPTIONS);
  const persistent = o.persistent;
  if (!persistent || o.persistType !== 'attachtemplate') {
    if (o.removeTemplate) seq.thenDo(() => { canvas.scene.deleteEmbeddedDocuments(template.documentName ?? 'Region', [template.id]); });
  }
  if (ctx.source) sourceLayer(seq, ctx.source, ctx);
  addSound(seq, primary.sound, ctx);

  if (persistent && (o.persistType === 'overheadtile' || o.persistType === 'groundtile')) {
    // AA placed a Tile through its GM socket for these; the corpus has none, and this module has no socket
    console.warn(`FX Studio | "${ctx.row.name}": tile persistence (${o.persistType}) is not carried; playing on the ground instead`);
  }

  const anchorFor = () => {
    const menuType = primary.video?.menuType;
    const defaultAnchor = type === 'circle' || type === 'rectangle' ? { x: 0.5, y: 0.5 } : { x: 0, y: 0.5 };
    const input = o.anchor;
    if (!input) return defaultAnchor;
    const dNum = menuType === 'cone' || menuType === 'ray' ? input || '0, 0.5' : input || '0.5, 0.5';
    const parsed = String(dNum).split(',').map((s) => s.trim());
    const posX = Number(parsed[0]);
    const posY = Number(parsed[1]);
    if (parsed.length === 2) return { x: posX, y: posY };
    if (parsed.length === 1) return { x: posX, y: posX };
    return defaultAnchor;
  };
  const setPrimary = (s) => {
    s.anchor(anchorFor());
    useFile(s, path, ctx);
    s.opacity(o.opacity);
    s.origin(moment.origin);
    if (o.elevation === 0) s.belowTokens(true);
    s.zIndex(o.zIndex);
    s.rotate(o.rotate);
    if (o.isMasked) s.mask(template);
    s.playbackRate(o.playbackRate);
    s.name(ctx.name);
    s.aboveLighting(o.aboveTemplate);
    s.xray(o.xray);
    tint(s, o);
  };

  const s = seq.effect();
  if (type === 'cone' || type === 'line') {
    const trueHeight = type === 'cone' ? distance : (shape.width * 2) / canvas.dimensions.distancePixels;
    setPrimary(s);
    s.size({ width: distance * canvas.dimensions.distancePixels * o.scale.x, height: trueHeight * canvas.dimensions.distancePixels * o.scale.y });
    if (o.isMasked) s.mask(template);
    if (persistent) {
      s.persist(true);
      if (o.persistType === 'attachtemplate') { s.attachTo(template); s.rotateTowards(template, { attachTo: true }); }
      else { s.atLocation(template, { cacheLocation: true }); s.rotateTowards(template, { cacheLocation: true }); }
    } else {
      s.atLocation(template, { cacheLocation: true });
      s.repeats(o.repeat, o.repeatDelay);
      s.rotateTowards(template, { cacheLocation: true });
    }
    if (!o.isWait) s.delay(o.delay);
  } else if (type === 'circle' || type === 'rectangle') {
    const trueSize = type === 'rectangle' ? distance : distance * 2;
    setPrimary(s);
    s.size({ width: canvas.grid.size * (trueSize / canvas.dimensions.distance) * o.scale.x, height: canvas.grid.size * (trueSize / canvas.dimensions.distance) * o.scale.y });
    if (persistent) {
      s.persist(true);
      if (o.persistType === 'attachtemplate') s.attachTo(template, { bindRotation: true });
      else { s.atLocation(template, { cacheLocation: true }); s.persist(); }
    } else {
      s.atLocation(template, { cacheLocation: true });
      s.repeats(o.repeat, o.repeatDelay);
    }
    if (!o.isWait) s.delay(o.delay);
  }

  if (moment.targets.length > 0 && o.isWait) seq.wait(o.delay || 250);
  if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, moment.targets, !!ctx.target, false);
  if (ctx.target) targetLayer(seq, ctx.target, ctx, moment.targets, false);
  return seq;
}
