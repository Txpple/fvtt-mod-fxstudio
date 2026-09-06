// Projectile to template (AA's preset, the Fireball shape): a projectile from the caster to the
// placed template, an optional pre-explosion, the explosion, and an after-image that may stay.
// Port of custom-sequences/proToTemp.js.
import { addSound, elevationOf, pathOf, secondaryLayer, sourceLayer, targetLayer, useFile, SEQUENCE_OPTIONS } from './common.js';

export function build(ctx) {
  const { moment, primary } = ctx;
  const data = primary.data;
  const template = moment.template;
  const sourceToken = moment.sourceToken;
  if (!template || !sourceToken) return null;

  const seq = new Sequence(SEQUENCE_OPTIONS);
  if (data.projectile.options.removeTemplate) seq.thenDo(() => { canvas.scene.deleteEmbeddedDocuments(template.documentName ?? 'Region', [template.id]); });
  if (ctx.source) sourceLayer(seq, ctx.source, ctx);

  addSound(seq, data.projectile.sound, ctx);
  {
    const o = data.projectile.options;
    const s = useFile(seq.effect(), pathOf(data.projectile), ctx)
      .atLocation(sourceToken)
      .stretchTo(template, { cacheLocation: true, randomOffset: o.randomOffset })
      .repeats(o.repeat, o.repeatDelay)
      .playbackRate(o.playbackRate)
      .waitUntilFinished(o.wait);
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
  }
  addSound(seq, data.preExplosion?.sound, ctx);
  if (data.preExplosion?.enable) {
    const o = data.preExplosion.options;
    const s = useFile(seq.effect(), pathOf(data.preExplosion), ctx)
      .atLocation(template, { cacheLocation: true })
      .scaleToObject(o.scale)
      .repeats(o.repeat, o.repeatDelay)
      .playbackRate(o.playbackRate)
      .waitUntilFinished(o.wait)
      .aboveLighting(o.aboveTemplate);
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
  }
  addSound(seq, data.explosion.sound, ctx);
  {
    const o = data.explosion.options;
    const s = useFile(seq.effect(), pathOf(data.explosion), ctx)
      .atLocation(template, { cacheLocation: true })
      .scaleToObject(o.scale)
      .repeats(o.repeat, o.repeatDelay)
      .zIndex(5)
      .playbackRate(o.playbackRate)
      .waitUntilFinished(-750 + o.wait)
      .aboveLighting(o.aboveTemplate);
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
  }
  if (data.afterImage?.customPath) {
    const o = data.afterImage.options;
    const s = useFile(seq.effect(), data.afterImage.customPath, ctx)
      .atLocation(template, { cacheLocation: true })
      .scaleToObject(o.scale)
      .persist(o.persistent)
      .origin(moment.origin)
      .fadeIn(250)
      .fadeOut(500);
    if (o.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
  }
  if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, moment.targets, !!ctx.target, false);
  if (ctx.target) targetLayer(seq, ctx.target, ctx, moment.targets, false);
  return seq;
}
