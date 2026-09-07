// SOUND: a sound on its own — a scene of nothing but sound. (A picture scene carries its own
// `sound`, played as the scene starts; this shape is for an FX that is only a sound, or a sound
// between pictures.)
//
//   asset   volume   delay   start (ms into the file)   repeat   every   wait
import { addSound, full } from '../common.js';

export function build(seq, scene0, ctx) {
  const s = full(scene0);
  addSound(seq, { asset: s.asset, volume: s.volume, delay: s.delay, start: s.start, repeat: s.repeat, every: s.every }, ctx);
  if (s.wait) seq.wait(typeof s.wait === 'number' ? s.wait : 0);
}
