// The projectile (AA's range menu): from the source to each target, a miss flying past, with a
// return flight where the weapon returns. Port of standard-sequences/rangedAnimation.js.
import { fakeSource, open, pathOf, returnPathOf, secondaryLayer, spot, targetLayer, tint, useFile, wasHit } from './common.js';

export function build(ctx) {
  const { moment, primary } = ctx;
  const o = primary.options;
  const sourceToken = moment.sourceToken;
  if (!sourceToken || !moment.targets.length) return null;
  const returnFile = returnPathOf(primary);
  const switchReturn = !!(o.isReturning && returnFile);
  // AA only honoured onlyX for custom paths, and its sanitized data never carried the flag: never
  const onlyX = false;
  const at = o.animationSource ? fakeSource(ctx) : null;

  const seq = open(ctx);
  const targets = moment.targets;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const hit = wasHit(ctx, t);
    const s = useFile(seq.effect(), pathOf(primary), ctx);
    if (at) s.atLocation({ x: at.x, y: at.y });
    else s.atLocation(o.reverse ? t : sourceToken);
    if (o.reverse) s.stretchTo(sourceToken, { onlyX, randomOffset: o.randomOffset });
    else s.stretchTo(t, { onlyX, randomOffset: o.randomOffset });
    s.randomizeMirrorY();
    s.repeats(o.repeat, o.repeatDelay);
    s.opacity(o.opacity);
    s.missed(!hit);
    s.name(spot(t));
    if (o.elevation === 0) s.belowTokens(true);
    s.zIndex(o.zIndex);
    tint(s, o);
    if (i === targets.length - 1 && o.isWait) s.waitUntilFinished(o.delay);
    else if (!o.isWait) s.delay(o.delay);
    s.playbackRate(o.playbackRate);
  }
  if (switchReturn) {
    for (const t of targets) {
      const s = useFile(seq.effect(), returnFile, ctx);
      s.opacity(o.opacity);
      s.atLocation(sourceToken);
      s.repeats(o.repeat, o.repeatDelay);
      s.stretchTo(spot(t));
      s.zIndex(o.zIndex);
      s.playbackRate(o.playbackRate);
      tint(s, o);
    }
  }
  if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, targets, !!ctx.target, true);
  if (ctx.target) targetLayer(seq, ctx.target, ctx, targets, true);
  return seq;
}
