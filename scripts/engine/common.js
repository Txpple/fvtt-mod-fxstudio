// What every shape shares: the Sequence options, one `.file()` helper that records what a build
// names (so a build can be read without playing), the sound section, sizing, timing, tint,
// elevation and persistence — each a knob with one meaning across shapes. This directory is the
// only place Sequencer's API is called.
import { SOUND_DEFAULTS, withDefaults } from '../core/fx.js';
import { resolveAsset } from './assets.js';
import { tokenSquares } from './places.js';

export const SEQUENCE_OPTIONS = { moduleName: 'FX Studio', softFail: true };

/** a fresh build context */
export function contextFor(fx, moment) {
  return { fx, moment, files: [], sounds: [], missing: [], after: null, pictures: 0, notes: [] };
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

/**
 * Under the tokens, or at an elevation. `on`: the placeables the picture stands on, its source then
 * its target (a point stands on nothing). On Foundry 14 a scene is cut into levels and Sequencer
 * draws a picture only on the viewed level its elevation falls in, so an elevation is held inside
 * the level the picture plays on (`withinLevel`); one held up at the floor stays under the tokens.
 */
export function elevate(section, scene, ctx = null, ...on) {
  if (scene.below) { section.belowTokens(true); return; }
  if (!scene.elevation) return;
  const absolute = !!scene.elevation.absolute;
  const held = withinLevel(scene.elevation.level, absolute, on, ctx?.moment?.source);
  section.elevation(held.level, { absolute });
  if (held.below) section.belowTokens(true);
}

/** how far under its level's top a raised picture is held: a picture exactly at the top belongs to the level above */
export const LEVEL_MARGIN = 0.01;

/** a placeable's elevation as Sequencer reads it: a token's number, a region's bottom, 0 for a point */
function elevationOf(o) {
  const e = o?.document?.elevation ?? o?.elevation ?? 0;
  const n = typeof e === 'object' ? e?.bottom ?? e?.top ?? 0 : e;
  return Number.isFinite(n) ? n : 0;
}

/**
 * The elevation knob, held inside the level the picture plays on: {level, below}. Stock's
 * `level: 999` means "above everything" and its negative levels "under the token"; on a Foundry 14
 * scene with levels (a level spans, say, 0 to 10) a picture at 999 or at -2 is on no level and
 * Sequencer never draws it. The level is the first token's of `on`, else the acting token's
 * (`fallback`), else the viewed one. Above its top (less LEVEL_MARGIN) the picture is held at the
 * top, still over every token of the level (Sequencer sorts its pictures over tokens at one
 * elevation); under its bottom it is held at the bottom and put under the tokens (`below`), as it
 * was meant to be. Sequencer places a relative elevation from the higher of the picture's source and
 * target (a missing one counting 0), so a relative amount is cut from there. A scene without levels
 * (Foundry 13), or a level's open end, keeps the knob as authored.
 */
export function withinLevel(level, absolute, on = [], fallback = null) {
  const as = { level, below: false };
  const levels = globalThis.canvas?.scene?.levels;
  if (!levels?.size || typeof levels.get !== 'function') return as;
  const holder = [...on, fallback].find((o) => o?.document?.level && levels.get(o.document.level));
  const lvl = holder ? levels.get(holder.document.level) : globalThis.canvas?.level ?? null;
  const { bottom, top } = lvl?.elevation ?? {};
  const base = absolute ? 0 : Math.max(...on.map(elevationOf), ...(on.length < 2 ? [0] : []));
  const z = base + level;
  if (Number.isFinite(top) && z > top - LEVEL_MARGIN) return { level: top - LEVEL_MARGIN - base, below: false };
  if (Number.isFinite(bottom) && z < bottom) return { level: bottom - base, below: true };
  return as;
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

/** does this token already carry a picture of this origin? (an FX never doubles up on a token) */
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
