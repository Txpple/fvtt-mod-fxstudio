// The melee swing (AA's melee menu): a swing from the source toward each target, thrown as the
// row's ranged weapon when the target stands out of reach, with a return flight where the weapon
// returns. Port of standard-sequences/meleeAnimation.js.
import { addSound, distanceBetween, pathOf, returnPathOf, secondaryLayer, sourceLayer, spot, targetLayer, tint, useFile, wasHit, SEQUENCE_OPTIONS } from './common.js';

export function build(ctx) {
  const { moment, row, primary } = ctx;
  const o = primary.options;
  const sourceToken = moment.sourceToken;
  if (!sourceToken || !moment.targets.length) return null;

  let sourceTokenGS = (sourceToken.w / canvas.grid.size) * 5;
  if (primary.video?.animation === 'claw' || primary.video?.animation === 'bite') sourceTokenGS = sourceToken.w / canvas.grid.size;

  // the thrown switch: the row names the ranged weapon, and whether it comes back
  const thrown = row.thrown ?? null;
  const rangeFile = thrown ? pathOf(thrown) : null;
  const returnFile = thrown ? returnPathOf(thrown) : null;
  const switchReturn = !!(thrown?.options?.isReturning && returnFile);
  // dnd5e: reach adds a square; AA read `properties.rch` on what is now a Set and never saw it (fixed here)
  const reach = moment.item?.system?.properties?.has?.('rch') ? 1 : 0;
  const switchDistance = 5;

  const rangeArray = [];
  const meleeArray = [];
  for (const target of moment.targets) {
    const distanceTo = distanceBetween(sourceToken, target);
    const rangeDistance = thrown?.options?.detect === 'manual' ? thrown.options.range : switchDistance / canvas.dimensions.distance + reach;
    const hit = wasHit(ctx, target);
    if (distanceTo > rangeDistance && rangeFile) rangeArray.push({ token: target, hit });
    else meleeArray.push({ token: target, moveTo: distanceTo > rangeDistance, hit });
  }

  const seq = new Sequence(SEQUENCE_OPTIONS);
  if (ctx.source) sourceLayer(seq, ctx.source, ctx);
  if (meleeArray.length) addSound(seq, primary.sound, ctx);

  if (meleeArray.length) {
    for (let i = 0; i < meleeArray.length; i++) {
      const t = meleeArray[i];
      const s = useFile(seq.effect(), pathOf(primary), ctx);
      s.opacity(o.opacity);
      s.atLocation(sourceToken);
      if (t.moveTo) s.moveTowards(t.token);
      else { s.rotateTowards(t.token); s.anchor({ x: 0.4, y: 0.5 }); }
      s.size(sourceTokenGS * o.size, { gridUnits: true });
      s.repeats(o.repeat, o.repeatDelay);
      s.randomizeMirrorY();
      s.missed(!t.hit);
      s.name(spot(t.token));
      if (o.elevation === 0) s.belowTokens(true);
      s.zIndex(o.zIndex);
      tint(s, o);
      if (i === meleeArray.length - 1 && o.isWait) s.waitUntilFinished(o.delay);
      else if (!o.isWait) s.delay(o.delay);
      s.playbackRate(o.playbackRate);
    }
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, meleeArray.map((e) => e.token), !!ctx.target, true);
    if (ctx.target) targetLayer(seq, ctx.target, ctx, meleeArray.map((e) => e.token), true);
  }

  if (rangeArray.length) {
    if (thrown?.sound) addSound(seq, thrown.sound, ctx);
    for (let i = 0; i < rangeArray.length; i++) {
      const t = rangeArray[i];
      const s = useFile(seq.effect(), rangeFile, ctx);
      s.atLocation(sourceToken);
      s.stretchTo(t.token);
      s.opacity(o.opacity);
      s.zIndex(o.zIndex);
      s.repeats(o.repeat, o.repeatDelay);
      s.missed(!t.hit);
      s.name(spot(t.token));
      if (o.elevation === 0) s.belowTokens(true);
      s.playbackRate(o.playbackRate);
      tint(s, o);
      if (i === rangeArray.length - 1 && o.isWait) s.waitUntilFinished(o.delay);
      else if (!o.isWait) s.delay(o.delay);
    }
    if (switchReturn) {
      for (const t of rangeArray) {
        const s = useFile(seq.effect(), returnFile, ctx);
        s.opacity(o.opacity);
        s.atLocation(sourceToken);
        s.repeats(o.repeat, o.repeatDelay);
        s.stretchTo(spot(t.token));
        s.zIndex(o.zIndex);
        s.playbackRate(o.playbackRate);
        tint(s, o);
      }
    }
    if (ctx.secondary) secondaryLayer(seq, ctx.secondary, ctx, rangeArray.map((e) => e.token), !!ctx.target, true);
    if (ctx.target) targetLayer(seq, ctx.target, ctx, rangeArray.map((e) => e.token), true);
  }
  return seq;
}
