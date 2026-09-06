// BEAM: a picture attached at both ends — the caster and each target — that follows both and
// stands until ended. A target already joined by a beam of this origin is left alone.
//
//   from source   to each-target   persist until-removed | effect
import { addSound, elevate, full, useAsset } from '../common.js';
import { spotsFor } from '../places.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const from = spotsFor(s.from, moment, { lookName: ctx.look.id })[0];
  if (!from?.token) return;
  const standing = Sequencer.EffectManager.getEffects({ object: from.token, origin: moment.origin });
  const targets = spotsFor(s.to, moment, { lookName: ctx.look.id }).filter((p) => p.token && !standing.some((x) => x.data?.target?.includes?.(p.token.id)));
  if (!targets.length) return;
  addSound(seq, s.sound, ctx);
  for (const p of targets) {
    const e = seq.effect();
    useAsset(e, s.asset, ctx);
    ctx.pictures++;
    e.attachTo(from.token);
    e.stretchTo(p.token, { attachTo: true });
    if (s.persist !== 'none') { e.persist(true); if (moment.tie) e.tieToDocuments(moment.tie); }
    e.playbackRate(s.rate);
    e.origin(moment.origin);
    e.opacity(s.opacity ?? 1);
    elevate(e, s);
    e.name(`${ctx.look.id} ${p.token.id}`);
  }
}
