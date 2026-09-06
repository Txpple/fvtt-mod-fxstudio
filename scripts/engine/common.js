// What every shape shares: the Sequence options, one `.file()` helper that records what a build
// names (so a build can be read without playing), the sound section, sizing, timing, tint,
// elevation and persistence — each a knob with one meaning across shapes. This directory is the
// only place Sequencer's API is called.
import { SOUND_DEFAULTS, withDefaults } from '../core/looks.js';
import { resolveAsset } from './assets.js';
import { tokenSquares } from './places.js';

export const SEQUENCE_OPTIONS = { moduleName: 'FX Studio', softFail: true };

/** a fresh build context */
export function contextFor(look, moment) {
  return { look, moment, files: [], sounds: [], missing: [], after: null, pictures: 0, notes: [] };
}

/** .file() on a section, the asset resolved, the path recorded; a missing asset is recorded and still named (softFail plays nothing) */
export function useAsset(section, asset, ctx, where = 'asset') {
  const r = resolveAsset(asset);
  if (r.missing) ctx.missing.push(`${where}: ${r.why}`);
  if (r.play) { ctx.files.push(r.play); section.file(r.play); }
  if (r.template) section.template({ gridSize: r.template[0], startPoint: r.template[1], endPoint: r.template[2] });
  return r;
}

/** one sound section: {asset, volume, delay, start, repeat, every} */
export function addSound(seq, sound, ctx, where = 'sound') {
  if (!sound?.asset) return;
  const s = { ...SOUND_DEFAULTS, ...sound };
  const r = resolveAsset(s.asset);
  if (r.missing) ctx.missing.push(`${where}: ${r.why}`);
  if (!r.play) return;
  ctx.sounds.push(r.play);
  seq.sound().file(r.play).delay(s.delay).startTime(s.start).volume(s.volume).repeats(s.repeat, s.every);
}

/** tint plus the colour-matrix filter, together */
export function tint(section, scene) {
  const t = scene.tint;
  if (!t?.colour) return;
  section.tint(t.colour);
  section.filter('ColorMatrix', { contrast: t.contrast ?? 0, saturate: t.saturation ?? 0 });
}

/** under the tokens, or at an elevation */
export function elevate(section, scene) {
  if (scene.below) section.belowTokens(true);
  else if (scene.elevation) section.elevation(scene.elevation.level, { absolute: !!scene.elevation.absolute });
}

/** grid units for a size knob at a spot, or null when the size fits something (a template, an object) */
export function gridSize(size, spot) {
  if (!size) return null;
  if (size.squares !== undefined) return size.squares;
  const token = spot?.token;
  const squares = token ? tokenSquares(token) : 1;
  if (size.tokenWidths !== undefined) return squares * size.tokenWidths;
  if (size.radius !== undefined) return size.radius * 2 + (size.plusToken ? squares : 0);
  return null;
}

/** the wait-or-delay rule: the last spot of a waiting scene holds the sequence; otherwise the delay applies */
export function timing(section, scene, last) {
  const wait = scene.wait;
  if (wait) { if (last) section.waitUntilFinished(typeof wait === 'number' ? wait : scene.delay ?? 0); }
  else if (scene.delay) section.delay(scene.delay);
}

export const repeats = (section, scene) => { if (scene.repeat !== undefined) section.repeats(scene.repeat, scene.every ?? 250); };

/** does this token already carry a picture of this origin? (a look never doubles up on a token) */
export const alreadyOn = (token, origin) => !!token && !!origin && Sequencer.EffectManager.getEffects({ object: token, origin }).length > 0;

/** persist a picture on a token: attached, kept on the prototype, tied to the effect it stands for */
export function persistOn(section, scene, token, ctx) {
  const attach = scene.attach ?? {};
  section.attachTo(token, { bindAlpha: !!attach.alpha, bindVisibility: !!attach.visibility });
  section.persist(true, { persistTokenPrototype: true });
  section.origin(ctx.moment.origin);
  if (ctx.moment.tie) section.tieToDocuments(ctx.moment.tie);
}

/** the scene with its shape's defaults underneath */
export const full = (scene) => withDefaults(scene);

/** the spot index that holds the wait: the last one */
export const isLast = (i, n) => i === n - 1;
