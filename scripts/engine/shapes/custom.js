// CUSTOM: the escape hatch. A list of Sequencer calls as data, each checked against the
// whitelist in core/looks.js, read in the sentence as "a custom effect". Place words in an
// argument ("source", "each-target", …) are resolved to the moment's tokens; a call named
// "effect", "sound" or "animation" starts a new section; "wait" waits on the sequence.
//
//   calls [["effect"], ["file", "jb2a.x.y"], ["atLocation", "source"], ["scaleToObject", 2], …]
import { CUSTOM_WHITELIST } from '../../core/looks.js';
import { PLACES } from '../../core/looks.js';
import { spotTarget, spotsFor } from '../places.js';

export function build(seq, scene, ctx) {
  const { moment } = ctx;
  let section = null;
  const arg = (a) => {
    if (typeof a === 'string' && PLACES.includes(a)) { const spot = spotsFor(a, moment, { lookName: ctx.look.id })[0]; return spot ? spotTarget(spot) : a; }
    return a;
  };
  for (const [method, ...args] of scene.calls ?? []) {
    if (!CUSTOM_WHITELIST.includes(method)) { ctx.notes.push(`custom: "${method}" is not allowed`); continue; }
    if (method === 'effect' || method === 'sound' || method === 'animation') { section = seq[method](); if (method !== 'animation') ctx.pictures++; continue; }
    if (method === 'wait') { seq.wait(...args); continue; }
    if (!section) { ctx.notes.push(`custom: "${method}" before any effect, sound or animation`); continue; }
    if (method === 'file') { const p = args[0]; if (section.constructor?.name === 'SoundSection' || section._isSound) ctx.sounds.push(p); else ctx.files.push(p); }
    if (typeof section[method] !== 'function') { ctx.notes.push(`custom: this section has no "${method}"`); continue; }
    section[method](...args.map(arg));
  }
}
