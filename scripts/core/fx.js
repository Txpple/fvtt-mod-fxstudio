// A LOOK is the sentence the user would say, as data (ARCHITECTURE §4). One grammar for the
// screens, the API, the files and an assistant: this module holds it, checks it, and turns an FX
// back into its sentence. The sentence is generated from the FX and never parsed back. Pure: no
// Foundry, no Sequencer.
//
// EVERY FX STATES ITSELF IN FULL. There are no shortcuts: no FX points at another one, and none
// inherits (ruled 2026-09-07 — a pointer can leave an orphan, and one FX changing what a different
// FX plays is not something a person can see on the screen in front of them). A variant is a COPY:
// "Sharran Step is Misty Step in black" means the whole of Misty Step written out again with the
// colour changed, standing on its own. The starters (`recipes/starters.json`) are stencils the
// screens stamp a fresh scene out of, never anything an FX refers to.
//
// A LOOK
//   { id, for: [keys], on, off?, scenes: [scene…], by?, at?, note? }
//   id      unique across the corpora; a house fx with a stock fx's id replaces it
//   for     the subject keys it answers (core/subjects.js); empty for a starter
//   on      the moment kind it answers (core/moments.js WHEN)
//   off     a house fx that silences whatever answered before it (its `for` keys play nothing)
//   scenes  the pictures and sounds, in start order — always stated, always this FX's own
//   by, at, note   who wrote it (a name, an assistant, "the migration"), when (ISO date), why
//   (There is no draft or staging field: an FX lives in its corpus file, House or Stock, and Save
//   writes the file — ruled 2026-09-12.)
//
// A SCENE — every knob is named for what it does and means the same thing in every shape
//   shape    strike | shoot | mark | fill | aura | beam | move | sound | custom
//   asset    {path} a library path (jb2a.fire_bolt.orange) · {paths: [...]} one of several, chosen
//            at random · {file} a raw file · {family, colour, variant} the same path in parts ·
//            plus colour? (a colour to swap in) and template? [grid, start, end] (Sequencer's
//            stretch metadata, only where the migration had to keep AA's)
//   sound    {asset, volume, delay, start, repeat, every, wait} played as this scene starts
//   at | from, to   places (PLACES); `at` for a picture that stays put, `from`/`to` for one that travels
//   size     one of, by shape: {tokenWidths} · {radius, plusToken} · {squares} · {fit: "shape" | "object", scale}
//   delay, wait, repeat, every, rate, fadeIn, fadeOut     timing (ms; `wait` true or ms: the next scene starts after this one)
//   opacity, tint {colour, contrast, saturation}, mirror ("random"), below (under tokens), elevation {level, absolute}, mask, zIndex, anchor {x, y}, rotate (degrees or "by-position"), face ("away-from-source"), aboveLighting, xray, scatter
//   persist  none | effect (while the tying effect stands) | template (while the Region stands) | until-removed
//   attach   {alpha, visibility} whether an attached picture follows the token's alpha and visibility (both true)
//   onMiss   fly-past | play | skip — for shapes that can miss
//   return   {asset} a return flight (shoot)
//   thrown   {asset, return, sound, reach} — strike: what flies when the target is out of reach
//   breathe {min, max, every}, pulse {min, max, every} — aura
//   range, pick ("click" | "movement"), speed, fade {to, after, back}, after, jump — move; seen, unoccupied: what the
//            spell's words demand of the spot (a space you can see; an unoccupied space), judged before the token moves
//   clearTemplate   the placed template is removed once the scene has played
//   calls    custom only: [[method, ...args], …] against a whitelist

import { WHEN, WHEN_WORDS } from './moments.js';
import { isKey } from './subjects.js';
import { recordProblems } from './records.js';

export const SCHEMA_VERSION = 2;
export const SHAPES = ['strike', 'shoot', 'mark', 'fill', 'aura', 'beam', 'move', 'sound', 'custom'];
export const PLACES = ['source', 'each-target', 'targets-else-source', 'both', 'template', 'destination', 'impact', 'area'];
export const PERSIST = ['none', 'effect', 'template', 'until-removed'];
export const ON_MISS = ['fly-past', 'play', 'skip'];
export const PICK = ['click', 'movement'];
export const SIZE_KINDS = ['tokenWidths', 'radius', 'squares', 'fit'];
export const FIT = ['shape', 'object'];

/** the knobs each shape reads; anything else on a scene is a problem the validator names */
const COMMON = ['shape', 'asset', 'sound', 'delay', 'wait', 'repeat', 'every', 'rate', 'fadeIn', 'fadeOut', 'opacity', 'tint', 'below', 'elevation', 'zIndex', 'anchor', 'note'];
export const KNOBS = {
  strike: [...COMMON, 'from', 'to', 'size', 'mirror', 'onMiss', 'thrown'],
  shoot: [...COMMON, 'from', 'to', 'mirror', 'onMiss', 'return', 'scatter', 'clearTemplate'],
  mark: [...COMMON, 'at', 'size', 'mask', 'persist', 'attach', 'follow', 'face', 'rotate', 'aboveLighting', 'mirror', 'onMiss'],
  fill: [...COMMON, 'at', 'size', 'mask', 'persist', 'rotate', 'aboveLighting', 'xray', 'clearTemplate'],
  aura: [...COMMON, 'at', 'size', 'persist', 'attach', 'breathe', 'pulse'],
  beam: [...COMMON, 'from', 'to', 'persist'],
  move: ['shape', 'sound', 'delay', 'range', 'pick', 'speed', 'fade', 'after', 'jump', 'seen', 'unoccupied', 'note'],
  sound: ['shape', 'asset', 'volume', 'delay', 'start', 'repeat', 'every', 'wait', 'note'],
  custom: ['shape', 'calls', 'note'],
};

/** what a scene means when it does not say: the engine reads these, the docs print them */
export const DEFAULTS = {
  strike: { from: 'source', to: 'each-target', size: { tokenWidths: 5 }, mirror: 'random', onMiss: 'play', opacity: 1, zIndex: 1, repeat: 1, every: 250, rate: 1 },
  shoot: { from: 'source', to: 'each-target', mirror: 'random', onMiss: 'fly-past', opacity: 1, zIndex: 1, repeat: 1, every: 250, rate: 1 },
  mark: { at: 'targets-else-source', size: { tokenWidths: 1.5 }, persist: 'none', opacity: 1, zIndex: 1, repeat: 1, every: 250, rate: 1, fadeIn: 250, fadeOut: 500, anchor: { x: 0.5, y: 0.5 }, onMiss: 'play' },
  fill: { at: 'template', size: { fit: 'shape', scale: { x: 1, y: 1 } }, persist: 'none', opacity: 1, zIndex: 1, repeat: 1, every: 250, rate: 1 },
  aura: { at: 'targets-else-source', size: { radius: 3 }, persist: 'until-removed', opacity: 1, zIndex: 1, rate: 1, fadeIn: 250, fadeOut: 500 },
  beam: { from: 'source', to: 'each-target', persist: 'until-removed', rate: 1 },
  move: { range: 30, pick: 'click', speed: 120, jump: true, after: 0, seen: true, unoccupied: true },
  sound: { volume: 0.75, delay: 0, start: 0, repeat: 1, every: 250 },
  custom: {},
};
export const SOUND_DEFAULTS = { volume: 0.75, delay: 0, start: 0, repeat: 1, every: 250 };

/** the Sequencer calls a custom scene may make, and nothing else */
export const CUSTOM_WHITELIST = ['effect', 'sound', 'animation', 'wait', 'file', 'atLocation', 'attachTo', 'stretchTo', 'rotateTowards', 'moveTowards', 'size', 'scale', 'scaleToObject', 'opacity', 'fadeIn', 'fadeOut', 'delay', 'duration', 'repeats', 'playbackRate', 'persist', 'origin', 'name', 'belowTokens', 'elevation', 'zIndex', 'anchor', 'rotate', 'randomRotation', 'mirrorX', 'mirrorY', 'randomizeMirrorX', 'randomizeMirrorY', 'tint', 'filter', 'mask', 'missed', 'waitUntilFinished', 'volume', 'startTime', 'endTime', 'timeRange', 'loopProperty', 'animateProperty', 'aboveLighting', 'xray', 'template', 'on', 'moveSpeed', 'scaleIn', 'scaleOut', 'rotateIn', 'rotateOut', 'text', 'screenSpace', 'locally', 'forUsers'];

/** a scene with the shape's defaults underneath it */
export const withDefaults = (scene) => ({ ...(DEFAULTS[scene?.shape] ?? {}), ...scene });

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** is this an asset the engine can resolve? */
export function assetProblems(asset, where) {
  const out = [];
  if (typeof asset === 'string') return out; // a bare path is accepted and read as {path}
  if (!isObj(asset)) return [`${where}: the asset must be a path, or {path}, {paths}, {file}, {family, colour} or {byPosition}`];
  const ways = ['path', 'paths', 'file', 'family', 'byPosition'].filter((k) => asset[k] !== undefined);
  if (ways.length !== 1) out.push(`${where}: the asset names ${ways.length ? ways.join(' and ') : 'nothing'}; it needs exactly one of path, paths, file, family or byPosition`);
  if (asset.byPosition !== undefined) {
    if (!isObj(asset.byPosition) || !['center', 'mid', 'left'].every((k) => asset.byPosition[k] !== undefined)) out.push(`${where}: byPosition needs an asset for each of center, mid and left (where the template sits against the caster)`);
    else for (const k of ['center', 'mid', 'left']) out.push(...assetProblems(asset.byPosition[k], `${where} ${k}`));
  }
  if (asset.paths !== undefined && (!Array.isArray(asset.paths) || !asset.paths.length || !asset.paths.every((p) => typeof p === 'string'))) out.push(`${where}: paths must be a list of library paths`);
  if (asset.template !== undefined && !(Array.isArray(asset.template) && asset.template.length === 3 && asset.template.every(isNum))) out.push(`${where}: template must be [grid, start, end]`);
  return out;
}

/** every asset a scene names, with where it sits (for the checks) */
export function assetsOf(scene) {
  const out = [];
  if (scene.asset?.byPosition) for (const k of ['center', 'mid', 'left']) out.push({ asset: scene.asset.byPosition[k], where: `asset ${k}` });
  else if (scene.asset) out.push({ asset: scene.asset, where: 'asset' });
  if (scene.sound?.asset) out.push({ asset: scene.sound.asset, where: 'sound' });
  if (scene.return?.asset) out.push({ asset: scene.return.asset, where: 'return' });
  if (scene.thrown?.asset) out.push({ asset: scene.thrown.asset, where: 'thrown' });
  if (scene.thrown?.return?.asset) out.push({ asset: scene.thrown.return.asset, where: 'thrown return' });
  if (scene.thrown?.sound?.asset) out.push({ asset: scene.thrown.sound.asset, where: 'thrown sound' });
  return out;
}

function sceneProblems(scene, i, fx) {
  const where = `scene ${i + 1}${scene?.shape ? ` (${scene.shape})` : ''}`;
  if (!isObj(scene)) return [`${where}: a scene must be an object`];
  const out = [];
  if (!SHAPES.includes(scene.shape)) { out.push(`${where}: the shape "${scene.shape}" is not one of ${SHAPES.join(', ')}`); return out; }
  const allowed = KNOBS[scene.shape];
  for (const k of Object.keys(scene)) if (!allowed.includes(k)) out.push(`${where}: a ${scene.shape} does not read "${k}" (it reads ${allowed.filter((a) => a !== 'shape').join(', ')})`);
  const needsAsset = !['move', 'custom'].includes(scene.shape);
  if (needsAsset && scene.asset === undefined) out.push(`${where}: names no asset`);
  for (const { asset, where: w } of assetsOf(scene)) out.push(...assetProblems(asset, `${where} ${w}`));
  for (const p of ['at', 'from', 'to']) if (scene[p] !== undefined && !PLACES.includes(scene[p])) out.push(`${where}: "${scene[p]}" is not a place (${PLACES.join(', ')})`);
  if (scene.size !== undefined) {
    if (!isObj(scene.size)) out.push(`${where}: size must be one of {tokenWidths}, {radius}, {squares}, {fit}`);
    else {
      const kinds = SIZE_KINDS.filter((k) => scene.size[k] !== undefined);
      if (kinds.length !== 1) out.push(`${where}: size names ${kinds.length ? kinds.join(' and ') : 'nothing'}; it needs exactly one of ${SIZE_KINDS.join(', ')}`);
      if (scene.size.fit !== undefined && !FIT.includes(scene.size.fit)) out.push(`${where}: size.fit must be "shape" (the template's measured shape) or "object" (the placed object's bounds)`);
      for (const k of ['tokenWidths', 'radius', 'squares']) if (scene.size[k] !== undefined && !(isNum(scene.size[k]) && scene.size[k] > 0)) out.push(`${where}: size.${k} must be a positive number`);
    }
  }
  if (scene.persist !== undefined && !PERSIST.includes(scene.persist)) out.push(`${where}: persist must be one of ${PERSIST.join(', ')}`);
  if (scene.onMiss !== undefined && !ON_MISS.includes(scene.onMiss)) out.push(`${where}: onMiss must be one of ${ON_MISS.join(', ')}`);
  if (scene.pick !== undefined && !PICK.includes(scene.pick)) out.push(`${where}: pick must be "click" or "movement"`);
  for (const k of ['delay', 'repeat', 'every', 'rate', 'fadeIn', 'fadeOut', 'opacity', 'zIndex', 'range', 'speed', 'after', 'volume', 'start']) if (scene[k] !== undefined && !isNum(scene[k])) out.push(`${where}: ${k} must be a number`);
  if (scene.wait !== undefined && !(scene.wait === true || scene.wait === false || isNum(scene.wait))) out.push(`${where}: wait must be true, false or a number of milliseconds`);
  if (scene.opacity !== undefined && (scene.opacity < 0 || scene.opacity > 1)) out.push(`${where}: opacity must be between 0 and 1`);
  if (scene.rotate !== undefined && !(isNum(scene.rotate) || scene.rotate === 'by-position')) out.push(`${where}: rotate must be degrees or "by-position"`);
  if (scene.mirror !== undefined && !['random', 'none'].includes(scene.mirror)) out.push(`${where}: mirror must be "random" or "none"`);
  if (scene.face !== undefined && scene.face !== 'away-from-source') out.push(`${where}: face must be "away-from-source"`);
  if (scene.tint !== undefined && !(isObj(scene.tint) && typeof scene.tint.colour === 'string')) out.push(`${where}: tint must be {colour, contrast?, saturation?}`);
  if (scene.elevation !== undefined && !(isObj(scene.elevation) && isNum(scene.elevation.level))) out.push(`${where}: elevation must be {level, absolute?}`);
  if (scene.anchor !== undefined && !(isObj(scene.anchor) && isNum(scene.anchor.x) && isNum(scene.anchor.y))) out.push(`${where}: anchor must be {x, y}`);
  if (scene.sound !== undefined && scene.shape !== 'sound') {
    if (!isObj(scene.sound) || scene.sound.asset === undefined) out.push(`${where}: sound must be {asset, volume?, delay?, start?, repeat?, every?}`);
    else for (const k of Object.keys(scene.sound)) if (!['asset', 'volume', 'delay', 'start', 'repeat', 'every', 'wait'].includes(k)) out.push(`${where}: a sound does not read "${k}"`);
  }
  if (scene.thrown !== undefined && (!isObj(scene.thrown) || scene.thrown.asset === undefined)) out.push(`${where}: thrown must be {asset, return?, sound?, reach?}`);
  if (scene.return !== undefined && (!isObj(scene.return) || scene.return.asset === undefined)) out.push(`${where}: return must be {asset}`);
  if (scene.shape === 'fill' && scene.at !== undefined && scene.at !== 'template') out.push(`${where}: a fill is always at the template`);
  if (scene.shape === 'custom') {
    if (!Array.isArray(scene.calls) || !scene.calls.length) out.push(`${where}: custom needs calls: [[method, ...args], …]`);
    else for (const c of scene.calls) { if (!Array.isArray(c) || typeof c[0] !== 'string') out.push(`${where}: each call is [method, ...args]`); else if (!CUSTOM_WHITELIST.includes(c[0])) out.push(`${where}: "${c[0]}" is not a call a custom scene may make`); }
  }
  void fx;
  return out;
}

/**
 * Every problem with an FX, in sentences. An empty list means the FX is well formed (whether its
 * assets exist is the engine's and the check tool's question, not this one).
 */
export function validate(fx) {
  const out = [];
  if (!isObj(fx)) return ['an FX must be an object'];
  if (typeof fx.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(fx.id)) out.push(`the id "${fx.id}" must be lower-case letters, digits and dashes`);
  if (fx.for !== undefined) {
    if (!Array.isArray(fx.for)) out.push('"for" must be a list of subject keys');
    else for (const k of fx.for) if (!isKey(k)) out.push(`"${k}" is not a subject key (kind:id, e.g. spell:fire-bolt or weapon:maul)`);
  }
  if (fx.on !== undefined && !WHEN.includes(fx.on)) out.push(`"on" must be one of ${WHEN.join(', ')}`);
  if (fx.to !== undefined) out.push('"to" is not part of the grammar any more: an FX lives in House or Stock, and Save writes the file');
  if (fx.off) {
    if (!fx.for?.length) out.push('an "off" fx needs the keys it silences in "for"');
    out.push(...recordProblems(fx.record));
    return out;
  }
  if (fx.on === undefined) out.push('says nothing about when it plays ("on")');
  if (!Array.isArray(fx.scenes) || !fx.scenes.length) out.push('has no scenes');
  // the shortcuts are gone (2026-09-07): an FX that points at another one is named in a sentence
  // that says what to write instead, so an old file or an assistant is told rather than half-read
  if (fx.like !== undefined) out.push(`"like" is not part of the grammar: an FX states its scenes in full. Copy the scenes of "${fx.like}" into this FX and change what differs.`);
  if (fx.with !== undefined) out.push('"with" is not part of the grammar: state the change on the scene it belongs to.');
  if (Array.isArray(fx.scenes)) fx.scenes.forEach((s, i) => out.push(...sceneProblems(s, i, fx)));
  // "like" and "with" are named above in their own sentence; they are not just unknown words
  // the record it stands on (core/records.js): stamped by every writer, read by the screens, never by the engine
  out.push(...recordProblems(fx.record));
  for (const k of Object.keys(fx)) if (!['id', 'for', 'record', 'on', 'off', 'scenes', 'by', 'at', 'note', 'to', 'source', 'like', 'with'].includes(k)) out.push(`an FX does not have a "${k}"`);
  return out;
}

// ---------------------------------------------------------------------------------------------
// the sentence
// ---------------------------------------------------------------------------------------------
export const PLACE_WORDS = {
  source: 'the caster', 'each-target': 'each target', 'targets-else-source': 'each target, or the caster when nothing is targeted', both: 'the caster and each target',
  template: 'the template', destination: 'the chosen spot', impact: 'where the last picture landed', area: 'inside the standing area',
};
const AT_WORDS = { ...PLACE_WORDS, 'each-target': 'each target', source: 'the caster' };

/** the words for an asset: "JB2A fire bolt, orange" · "the PSFX fire bolt sound" · "spell-slot.webm" */
export function assetWords(asset) {
  if (!asset) return 'nothing';
  const a = typeof asset === 'string' ? (asset.includes('/') ? { file: asset } : { path: asset }) : asset;
  const colour = a.colour ? String(a.colour).replace(/_/g, ' ') : null;
  if (a.byPosition) return `${assetWords(a.byPosition.center)}, picked by where the template sits`;
  if (a.file) return a.file.split('/').pop() + (colour ? `, ${colour}` : '');
  if (a.paths) return `one of ${a.paths.length} (${pathWords(a.paths[0])}…)` + (colour ? `, ${colour}` : '');
  if (a.family) return `${pathWords(a.family)}${a.variant ? ` ${a.variant}` : ''}${colour ? `, ${colour}` : ''}`;
  if (a.path) {
    // a colour swapped in replaces the path's own colour segment in the words
    if (a.colour && !a.path.endsWith(`.${a.colour}`)) return `${pathWords(a.path.split('.').slice(0, -1).join('.'))}, ${colour}`;
    return pathWords(a.path);
  }
  return 'nothing';
}
export function pathWords(path) {
  if (!path) return '';
  if (path.includes('/')) return path.split('/').pop();
  const parts = path.split('.');
  const lib = { jb2a: 'JB2A', psfx: 'PSFX', fxstudio: 'the frozen table' }[parts[0]] ?? parts[0];
  const rest = parts.slice(1).map((p) => p.replace(/_/g, ' ')).join(' ');
  return `${lib} ${rest}`.trim();
}
const soundWords = (s) => (s?.asset ? `with sound (${assetWords(s.asset)})` : '');
const persistWords = { effect: 'for as long as the effect stands', template: 'for as long as the template stands', 'until-removed': 'until it is removed', none: '' };
const sizeWords = (size) => {
  if (!size) return '';
  if (size.tokenWidths !== undefined) return `${size.tokenWidths === 1 ? 'a token' : size.tokenWidths + ' token'} wide`;
  if (size.radius !== undefined) return `${size.radius} square${size.radius === 1 ? '' : 's'} around${size.plusToken ? ' the token' : ''}`;
  if (size.squares !== undefined) return `${size.squares} square${size.squares === 1 ? '' : 's'} wide`;
  if (size.fit) { const sc = typeof size.scale === 'number' ? size.scale : size.scale?.x; return sc && sc !== 1 ? `scaled ×${sc}` : ''; }
  return '';
};
const timingWords = (s) => {
  const out = [];
  if (s.delay) out.push(`after ${s.delay} ms`);
  if (s.repeat > 1) out.push(`${s.repeat} times`);
  if (s.rate && s.rate !== 1) out.push(`at ${s.rate}× speed`);
  if (s.opacity !== undefined && s.opacity !== 1) out.push(`at ${Math.round(s.opacity * 100)}% opacity`);
  if (s.tint?.colour) out.push(`tinted ${s.tint.colour}`);
  if (s.below) out.push('under the tokens');
  return out.join(', ');
};

/** one scene as a clause */
export function sceneWords(scene) {
  const s = withDefaults(scene);
  const a = assetWords(s.asset);
  const t = timingWords(s);
  const tail = (words) => [words, t].filter(Boolean).join(', ');
  switch (s.shape) {
    case 'strike': {
      let w = `a swing (${a}) at ${PLACE_WORDS[s.to]}`;
      if (s.thrown) w += `, thrown as ${assetWords(s.thrown.asset)} when the target is out of reach${s.thrown.return ? ' and flying back' : ''}`;
      if (s.onMiss === 'skip') w += ', only on a hit';
      return tail(w);
    }
    case 'shoot': {
      let w = `a bolt (${a}) shoots from ${PLACE_WORDS[s.from]} to ${PLACE_WORDS[s.to]}`;
      const canMiss = ['each-target', 'targets-else-source', 'both', 'impact'].includes(s.to) || ['each-target', 'both'].includes(s.from);
      if (canMiss && s.onMiss === 'fly-past') w += ' and flies past on a miss'; else if (canMiss && s.onMiss === 'skip') w += ', only on a hit';
      if (s.return) w += ', then returns';
      return tail(w);
    }
    case 'mark': {
      let w = `a mark (${a}) on ${AT_WORDS[s.at]}`;
      const sz = sizeWords(s.size); if (sz) w += `, ${sz}`;
      if (s.persist !== 'none') w += ` ${persistWords[s.persist]}`;
      return tail(w);
    }
    case 'fill': {
      let w = `the area fills with ${a}`;
      const sz = sizeWords(s.size); if (sz) w += `, ${sz}`;
      if (s.persist !== 'none') w += ` ${persistWords[s.persist]}`;
      if (s.clearTemplate) w += ', and the template is cleared';
      return tail(w);
    }
    case 'aura': {
      let w = `an aura (${a}) around ${AT_WORDS[s.at]}`;
      const sz = sizeWords(s.size); if (sz) w += `, ${sz}`;
      if (s.breathe) w += ', breathing';
      if (s.pulse) w += ', pulsing';
      if (s.persist !== 'none') w += ` ${persistWords[s.persist]}`;
      return tail(w);
    }
    case 'beam': return tail(`a beam (${a}) from ${PLACE_WORDS[s.from]} to ${PLACE_WORDS[s.to]}${s.persist !== 'none' ? ` ${persistWords[s.persist]}` : ''}`);
    case 'move': {
      const spot = s.seen && s.unoccupied ? ', an unoccupied space they can see' : s.seen ? ', a space they can see' : s.unoccupied ? ', an unoccupied space' : '';
      return tail(`the caster ${s.fade ? 'fades and ' : ''}${s.jump ? 'appears' : 'travels'} at the chosen spot${s.range ? ` within ${s.range} feet` : ''}${spot}${s.pick === 'movement' ? ', read from the token\'s own move' : ''}`);
    }
    case 'sound': return `sound (${a})`;
    case 'custom': return 'a custom effect';
    default: return `(${s.shape})`;
  }
}

/**
 * The sentence for an FX: "Fire Bolt · when used · a bolt (JB2A fire bolt, orange) shoots from the
 * caster to each target and flies past on a miss · with sound (PSFX fire bolt)." — the sound clause mirrors the VFX form (the user, 2026-09-06)
 * @param fx   an fx, as written
 * @param opts   {name: what to call it (the subject's name); short: no provenance}
 */
export function sentence(fx, { name = null } = {}) {
  if (!fx) return 'Nothing plays.';
  if (fx.off) return `${name ?? fx.id} · plays nothing (switched off).`;
  const head = name ?? fx.id.replace(/-/g, ' ');
  const when = WHEN_WORDS[fx.on] ?? fx.on;
  const scenes = fx.scenes ?? [];
  const clauses = [];
  const sounds = [];
  scenes.forEach((s, i) => {
    if (s.shape === 'sound') { sounds.push(`(${assetWords(s.asset)})`); return; }
    const words = sceneWords(s);
    const prev = scenes[i - 1];
    const joiner = i === 0 ? '' : prev?.wait ? 'then ' : 'and ';
    clauses.push(joiner + words);
    if (s.sound?.asset) sounds.push(soundWords(s.sound).replace(/^with sound /, ''));
  });
  let body = clauses.join(', ');
  if (sounds.length) body += ` · with sound ${[...new Set(sounds)].join(' and ')}`;
  return `${titleWords(head)} · ${when} · ${body}.`;
}

const titleWords = (s) => String(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** the provenance as a line: "by the migration · 2026-09-06 · D&D5e Animations 3.3.0" */
export function provenance(fx) {
  if (!fx) return '';
  const parts = [];
  if (fx.by) parts.push(`by ${fx.by}`);
  if (fx.at) parts.push(fx.at);
  if (fx.note) parts.push(fx.note);
  return parts.join(' · ');
}
