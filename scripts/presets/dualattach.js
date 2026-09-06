// Dual attach (AA's preset, the Witch Bolt shape): a persistent beam attached to the caster and
// stretched to each target, following both. Port of custom-sequences/dual-attach.js.
import { addSound, elevationOf, pathOf, sourceLayer, useFile, SEQUENCE_OPTIONS } from './common.js';

export function build(ctx) {
  const { moment, primary } = ctx;
  const data = primary.data;
  const sourceToken = moment.sourceToken;
  if (!sourceToken) return null;
  // AA honoured onlyX only for a custom path
  const onlyX = data.video === null ? !!data.options.onlyX : false;
  const standing = Sequencer.EffectManager.getEffects({ object: sourceToken, origin: moment.origin });

  const seq = new Sequence(SEQUENCE_OPTIONS);
  if (ctx.source) sourceLayer(seq, ctx.source, ctx);
  addSound(seq, data.sound, ctx);
  let any = false;
  for (const target of moment.targets) {
    if (standing.some((e) => e.data?.target?.includes?.(target.id))) continue;
    any = true;
    const s = useFile(seq.effect(), pathOf(data), ctx)
      .attachTo(sourceToken)
      .stretchTo(target, { attachTo: true, onlyX })
      .persist(true)
      .playbackRate(data.options.playbackRate)
      .origin(moment.origin);
    if (data.options.elevation === 0) s.belowTokens(true);
    else s.elevation(elevationOf(data.options.isAbsolute, data.options.elevation), { absolute: data.options.isAbsolute });
  }
  return any || ctx.source ? seq : null;
}
