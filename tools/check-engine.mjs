// The engine, proved without Foundry: the nine shapes, the places, the build path and the play
// path (scripts/engine/*), on the offline stage (tools/lib/stage.mjs) with a recording Sequence
// and a fake library, so nothing here needs JB2A, PSFX or a canvas. What a scene's knobs turn into
// as Sequencer calls IS the engine's contract with the sentence; this is where that contract is
// written down as checks. Read-only, offline, a second.
//
//   node tools/check-engine.mjs                 every section
//   node tools/check-engine.mjs --section mark  one section, by number or a word of its name (stamped PARTIAL)
//   node tools/check-engine.mjs --quiet         the report line and the failures only
import { harness } from './lib/check.mjs';
import { install, table, sections, click, standing } from './lib/stage.mjs';
import { toUrl, REPO } from './lib/env.mjs';
import { join } from 'node:path';

// a fake library, shaped like JB2A's registration: a path, its files; `_templates` as Sequencer keeps them
const LIB = {
  test: {
    _templates: { default: [100, 0, 0] },
    bolt: { orange: ['modules/test/bolt_orange.webm'], blue: ['modules/test/bolt_blue.webm'] },
    swing: ['modules/test/swing.webm'],
    glow: ['modules/test/glow.webm'],
    ring: ['modules/test/ring.webm'],
    cone: { center: ['modules/test/cone_center.webm'], mid: ['modules/test/cone_mid.webm'], left: ['modules/test/cone_left.webm'] },
    sfx: { whoosh: ['modules/test/whoosh.ogg'], thud: ['modules/test/thud.ogg'] },
  },
};
const db = install({ dbs: LIB });
const S = (p) => toUrl(join(REPO, 'scripts', p));
const { useDatabase } = await import(S('engine/assets.js'));
useDatabase(db);
const { build, resolveMoment, play, ledger, useSettings, endPicturesOf, SHAPES } = await import(S('engine/render.js'));
const { spotsFor, destinationSpot, templateShape, relativePosition, distanceBetween, tokenSquares, spotName } = await import(S('engine/places.js'));
const { gridSize, timing } = await import(S('engine/common.js'));
const { judgeSpot, footprintsOverlap } = await import(S('engine/shapes/move.js'));
const { buildIndex } = await import(S('core/corpus.js'));
const { SHAPES: SHAPE_NAMES, DEFAULTS } = await import(S('core/fx.js'));

const t = harness('the engine builds what the sentence says');
const T = table();
const { caster, near, far, other, regions } = T;

// ---------------------------------------------------------------------------------------------
// the fixtures: one FX of one scene against one moment, built and read back
// ---------------------------------------------------------------------------------------------
const hit = (token, hit = true) => ({ token, hit });
const moment = (over = {}) => ({ when: 'use', kind: 'use', subject: { name: 'Test', keys: ['spell:test'] }, source: caster, targets: [], origin: 'Item.test', id: 'm1', activity: null, flags: {}, ...over });
const fxOf = (...scenes) => ({ id: 'fx-test', for: ['spell:test'], on: 'use', scenes });
/** build one FX (a scene, or a list of scenes) against a moment: {seq, ctx, S: the sections read back, effects, sounds, animations} */
function built(scenes, over = {}) {
  standing.length = 0;
  const r = build(fxOf(...(Array.isArray(scenes) ? scenes : [scenes])), moment(over));
  const all = sections(r.seq);
  return { ...r, S: all, effects: all.filter((s) => s.kind === 'effect'), sounds: all.filter((s) => s.kind === 'sound'), animations: all.filter((s) => s.kind === 'animation') };
}

// ---------------------------------------------------------------------------------------------
if (t.section('the places: a place word against a moment names the spots')) {
  const m = moment({ targets: [hit(near, true), hit(far, false)], place: regions.circle, destination: { x: 860, y: 840 } });
  t.same('source is the acting token', spotsFor('source', m).map((s) => s.token.id), ['caster']);
  t.same('each-target is every target, with its verdict', spotsFor('each-target', m).map((s) => [s.token.id, s.hit]), [['near', true], ['far', false]]);
  t.same('targets-else-source is the targets when there are any', spotsFor('targets-else-source', m).map((s) => s.token.id), ['near', 'far']);
  t.same('… and the source when there are none', spotsFor('targets-else-source', moment()).map((s) => s.token.id), ['caster']);
  t.same('both is the source then the targets', spotsFor('both', m).map((s) => s.token.id), ['caster', 'near', 'far']);
  t.is('template is the placed Region', spotsFor('template', m)[0]?.region?.id, 'circle');
  t.same('… and nothing when none is placed', spotsFor('template', moment()), []);
  t.same('impact is each target under the name its own picture landed under', spotsFor('impact', m).map((s) => s.name), ['spot near', 'spot far']);
  t.same('area with no standing picture falls back to the source token', spotsFor('area', m, { fxName: 'fx-test' }).map((s) => s.token?.id), ['caster']);
  t.same('a word the grammar does not have names nothing', spotsFor('nowhere', m), []);
  t.is('a moment with no verdict counts every target as hit', spotsFor('each-target', moment({ targets: [{ token: near }] }))[0].hit, true);
  t.same('destination is the centre of the clicked square, snapped', destinationSpot(m).point, { x: 850, y: 850 });
  t.same("… with the square's top-left kept for the move itself", destinationSpot(m).topLeft, { x: 800, y: 800 });
  t.is('no destination on the moment: no spot', destinationSpot(moment()), null);
  t.same("a template's shape is its type and measured distance", [templateShape(regions.cone).type, templateShape(regions.cone).distance], ['cone', 15]);
  t.is('no Region: no type', templateShape(null).type, null);
  t.same('a template around the caster sits "center"', relativePosition(caster, { bounds: { x: 400, y: 400, width: 300, height: 300 } }), { type: 'center', angle: 0 });
  t.same('a template to the caster\'s right sits "mid", turned 270', relativePosition(caster, regions.rectangle), { type: 'mid', angle: 270 });
  t.same('a template below and to the right sits "left", turned 270', relativePosition(caster, { bounds: { x: 700, y: 700, width: 200, height: 200 } }), { type: 'left', angle: 270 });
  t.same('a template with no bounds sits "center"', relativePosition(caster, {}), { type: 'center', angle: 0 });
  t.is('the adjacent token is one square away', distanceBetween(caster, near), 1);
  t.is('the far token is six squares away', distanceBetween(caster, far), 6);
  t.is('a token below is one square away', distanceBetween(caster, other), 1);
  t.is('no canvas: no distance', (() => { const c = globalThis.canvas; globalThis.canvas = null; try { return distanceBetween(caster, near); } finally { globalThis.canvas = c; } })(), -1);
  t.is("a token's squares are its width", tokenSquares(caster), 1);
  t.is('… times its image scale', tokenSquares({ document: { width: 2, height: 2, texture: { scaleX: 1.5, scaleY: 1.5 }, ring: null } }), 3);
  t.is('… divided by its ring subject scale', tokenSquares({ document: { width: 1, height: 1, texture: { scaleX: 1, scaleY: 1 }, ring: { enabled: true, subject: { scale: 2 } } } }), 0.5);
  t.is('a size in squares is those squares', gridSize({ squares: 3 }, { token: caster }), 3);
  t.is("a size in token widths is widths times the token's squares", gridSize({ tokenWidths: 2 }, { token: { document: { width: 2, height: 2, texture: { scaleX: 1, scaleY: 1 } } } }), 4);
  t.is('a radius is a diameter', gridSize({ radius: 2 }, { token: caster }), 4);
  t.is('… plus the token when it says so', gridSize({ radius: 2, plusToken: true }, { token: caster }), 5);
  t.is('a size that fits something has no grid size', gridSize({ fit: 'object' }, { token: caster }), null);
  t.is('no size, no grid size', gridSize(undefined, {}), null);
  t.is('a spot is named after its token', spotName(near), 'spot near');
}

// ---------------------------------------------------------------------------------------------
if (t.section('the knobs every shape shares: asset, sound, timing, tint, elevation')) {
  const seq = new Sequence({});
  let e = seq.effect();
  timing(e, { wait: true, delay: 300 }, true);
  t.same('wait on the last spot holds the sequence for the delay', sections(seq)[0].get('waitUntilFinished'), [300]);
  e = seq.effect(); timing(e, { wait: 700 }, true);
  t.same('a numeric wait holds for that long', sections(seq)[1].get('waitUntilFinished'), [700]);
  e = seq.effect(); timing(e, { wait: true }, false);
  t.is('wait on a spot that is not the last: nothing', sections(seq)[2].has('waitUntilFinished'), false);
  e = seq.effect(); timing(e, { delay: 250 }, true);
  t.same('no wait: the delay applies', sections(seq)[3].get('delay'), [250]);
  const r = built({ shape: 'mark', asset: { path: 'test.glow' }, at: 'source', sound: { asset: { path: 'test.sfx.whoosh' } }, tint: { colour: '#ff0000', contrast: 0.2, saturation: -0.5 }, below: true, delay: 100, repeat: 3, every: 400, rate: 2 });
  t.same('the asset resolves to its library path and is recorded', [r.ctx.files, r.effects[0].get('file')], [['test.glow'], ['test.glow']]);
  t.is("the scene's sound is one sound section before the picture", r.S[0].kind, 'sound');
  t.same('… with the sound defaults: volume, delay, start, repeats', [r.sounds[0].get('volume'), r.sounds[0].get('delay'), r.sounds[0].get('startTime'), r.sounds[0].get('repeats')], [[0.75], [0], [0], [1, 250]]);
  t.same('the sound is recorded', r.ctx.sounds, ['test.sfx.whoosh']);
  t.same('tint is the colour plus the colour-matrix filter', [r.effects[0].get('tint'), r.effects[0].get('filter')], [['#ff0000'], ['ColorMatrix', { contrast: 0.2, saturate: -0.5 }]]);
  t.same('below puts it under the tokens', r.effects[0].get('belowTokens'), [true]);
  t.same("delay, repeat/every and rate are Sequencer's own", [r.effects[0].get('delay'), r.effects[0].get('repeats'), r.effects[0].get('playbackRate')], [[100], [3, 400], [2]]);
  const el = built({ shape: 'mark', asset: 'test.glow', at: 'source', elevation: { level: 10, absolute: true } });
  t.same('an elevation is a level, absolute or not', el.effects[0].get('elevation'), [10, { absolute: true }]);
  t.same('a bare string asset is a path', el.ctx.files, ['test.glow']);
  const gone = built({ shape: 'mark', asset: { path: 'test.nothing' }, at: 'source' });
  t.same('a missing asset is recorded and still named (softFail plays nothing, the ledger says why)', [gone.ctx.missing.length, gone.effects[0].get('file')], [1, ['test.nothing']]);
  const col = built({ shape: 'mark', asset: { path: 'test.bolt.orange', colour: 'blue' }, at: 'source' });
  t.same('a colour on the asset swaps the last segment', col.ctx.files, ['test.bolt.blue']);
  const badCol = built({ shape: 'mark', asset: { path: 'test.bolt.orange', colour: 'green' }, at: 'source' });
  t.ok('a colour the family lacks is a missing asset that names the colours it has', /orange|blue/.test(badCol.ctx.missing[0] ?? ''), badCol.ctx.missing[0]);
  const raw = built({ shape: 'mark', asset: { file: 'modules/test/raw.webm' }, at: 'source' });
  t.same("a raw file plays as itself (the disk is check-fx's business)", [raw.ctx.files, raw.ctx.missing], [['modules/test/raw.webm'], []]);
  const pick = built({ shape: 'mark', asset: { paths: ['test.glow', 'test.ring'] }, at: 'source' });
  t.same('several paths are handed to Sequencer to choose among', pick.effects[0].get('file'), [['test.glow', 'test.ring']]);
  const tmpl = built({ shape: 'mark', asset: { path: 'test.glow', template: [200, 50, 50] }, at: 'source' });
  t.same("an asset's stretch template is set on the section", tmpl.effects[0].get('template'), [{ gridSize: 200, startPoint: 50, endPoint: 50 }]);
}

// ---------------------------------------------------------------------------------------------
if (t.section('strike: a swing at the source toward each target')) {
  const swing = { shape: 'strike', asset: 'test.swing', sound: { asset: 'test.sfx.whoosh' } };
  const one = built(swing, { targets: [hit(near)] });
  t.same('one target hit: the sound, then one swing', one.S.map((s) => s.kind), ['sound', 'effect']);
  const e = one.effects[0];
  t.same('the swing sits at the source and turns toward the target', [e.get('atLocation')[0].id, e.get('rotateTowards')[0].id], ['caster', 'near']);
  t.same('… anchored off-centre so the blade reaches', e.get('anchor'), [{ x: 0.4, y: 0.5 }]);
  t.same('… five token widths wide by default, in grid units', e.get('size'), [5, { gridUnits: true }]);
  t.same('… mirrored at random, not missed, named for its target', [e.has('randomizeMirrorY'), e.get('missed'), e.get('name')], [true, [false], ['spot near']]);
  t.is('one picture counted', one.ctx.pictures, 1);
  const miss = built(swing, { targets: [hit(near, false)] });
  t.same('a miss is a swing that missed', miss.effects[0].get('missed'), [true]);
  const skip = built({ ...swing, onMiss: 'skip' }, { targets: [hit(near, false)] });
  t.is('onMiss skip on a miss: nothing plays, sound included', skip.seq, null);
  const farSwing = built(swing, { targets: [hit(far)] });
  t.same('a target out of reach: the swing moves toward it instead of turning', [farSwing.effects[0].has('moveTowards'), farSwing.effects[0].has('rotateTowards')], [true, false]);
  const thrown = built({ ...swing, thrown: { asset: 'test.bolt.orange', sound: { asset: 'test.sfx.thud' }, return: { asset: 'test.bolt.blue' } } }, { targets: [hit(near), hit(far)] });
  t.same('with a thrown asset the near target is swung at and the far one flown at, each with its sound', thrown.S.map((s) => s.kind), ['sound', 'effect', 'sound', 'effect', 'effect']);
  t.same('the flight stretches from the source to the target', [thrown.effects[1].get('atLocation')[0].id, thrown.effects[1].get('stretchTo')[0].id], ['caster', 'far']);
  t.same('the return flight stretches back to where the flight landed', thrown.effects[2].get('stretchTo'), ['spot far']);
  t.same('every asset is recorded', thrown.ctx.files, ['test.swing', 'test.bolt.orange', 'test.bolt.blue']);
  const two = { id: 'two', name: 'Two', x: 700, y: 500, w: 100, h: 100, document: { x: 700, y: 500, width: 1, height: 1, texture: { scaleX: 1, scaleY: 1 } }, _isToken: true };
  const plain = built(swing, { targets: [hit(two)] });
  t.is('two squares away is out of reach for a plain weapon', plain.effects[0].has('moveTowards'), true);
  const reach = built(swing, { targets: [hit(two)], subject: { name: 'Glaive', keys: ['weapon:glaive'], reach: true } });
  t.is('… and in reach for a reach weapon', reach.effects[0].has('rotateTowards'), true);
  const reach3 = built({ ...swing, thrown: { asset: 'test.bolt.orange', reach: 3 } }, { targets: [hit(two)] });
  t.is('a thrown reach in squares overrides the rule', reach3.effects[0].has('rotateTowards'), true);
  const both = built({ ...swing, wait: true, delay: 200 }, { targets: [hit(near), hit(other)] });
  t.same('two targets: two swings; only the last one holds the sequence', both.effects.map((s) => s.has('waitUntilFinished')), [false, true]);
  t.is('no target: nothing', built(swing).seq, null);
  t.is('no source: nothing', built(swing, { source: null, targets: [hit(near)] }).seq, null);
}

// ---------------------------------------------------------------------------------------------
if (t.section('shoot: a picture stretched from a place to a place')) {
  const bolt = { shape: 'shoot', asset: 'test.bolt.orange' };
  const one = built(bolt, { targets: [hit(near)] });
  t.same('from the source to the target', [one.effects[0].get('atLocation')[0].id, one.effects[0].get('stretchTo')[0].id], ['caster', 'near']);
  t.same('a hit did not miss; mirrored at random; named for its target', [one.effects[0].get('missed'), one.effects[0].has('randomizeMirrorY'), one.effects[0].get('name')], [[false], true, ['spot near']]);
  t.same('a miss flies past by default', built(bolt, { targets: [hit(near, false)] }).effects[0].get('missed'), [true]);
  t.same('onMiss play: a miss still lands', built({ ...bolt, onMiss: 'play' }, { targets: [hit(near, false)] }).effects[0].get('missed'), [false]);
  t.is('onMiss skip: a miss is not shot at', built({ ...bolt, onMiss: 'skip' }, { targets: [hit(near, false)] }).seq, null);
  const two = built(bolt, { targets: [hit(near), hit(far, false)] });
  t.same('one bolt per target', two.effects.map((e) => e.get('stretchTo')[0].id), ['near', 'far']);
  const toTemplate = built({ ...bolt, to: 'template' }, { place: regions.circle });
  t.same('to the template: stretched to the Region, its location cached', toTemplate.effects[0].get('stretchTo'), [regions.circle, { cacheLocation: true }]);
  t.is('… and not named or missed (no target)', toTemplate.effects[0].has('name'), false);
  t.same('scatter lands a little off the mark', built({ ...bolt, scatter: true }, { targets: [hit(near)] }).effects[0].get('stretchTo')[1], { randomOffset: true });
  const back = built({ ...bolt, return: { asset: 'test.bolt.blue' } }, { targets: [hit(near)] });
  t.same('a return flight goes back from where the bolt landed', [back.effects[1].get('atLocation')[0].id, back.effects[1].get('stretchTo')], ['caster', ['spot near']]);
  const fromTargets = built({ ...bolt, from: 'each-target', to: 'source' }, { targets: [hit(near), hit(far)] });
  t.same('from each target to the source: one per target, travelling the other way', fromTargets.effects.map((e) => [e.get('atLocation')[0].id, e.get('stretchTo')[0].id]), [['near', 'caster'], ['far', 'caster']]);
  const dest = built({ ...bolt, to: 'destination' }, { destination: { x: 860, y: 840 } });
  t.same('to the destination: a point', dest.effects[0].get('stretchTo')[0], { x: 850, y: 850 });
  t.is('to each target with none: nothing', built(bolt).seq, null);
  t.same('targets-else-source with none: to the source', built({ ...bolt, to: 'targets-else-source' }).effects[0].get('stretchTo')[0].id, 'caster');
}

// ---------------------------------------------------------------------------------------------
if (t.section('mark: a static picture at a place, once or persistent')) {
  const glow = { shape: 'mark', asset: 'test.glow' };
  const d = built(glow);
  t.same('by default on the targets, else the caster', d.effects[0].get('atLocation')[0].id, 'caster');
  t.same('… one and a half token widths wide, faded in and out, named for the FX and its token', [d.effects[0].get('size'), d.effects[0].get('fadeIn'), d.effects[0].get('fadeOut'), d.effects[0].get('name')], [[1.5, { gridUnits: true }], [250], [500], ['fx-test caster']]);
  t.is('a once-only mark is not persisted', d.effects[0].has('persist'), false);
  const each = built({ ...glow, at: 'each-target' }, { targets: [hit(near), hit(far)] });
  t.same('at each target: one each', each.effects.map((e) => e.get('atLocation')[0].id), ['near', 'far']);
  const tie = { uuid: 'ActiveEffect.x' };
  const p = built({ ...glow, at: 'each-target', persist: 'effect' }, { targets: [hit(near)], tie });
  t.same('persistent on a token: attached, kept on the prototype, stamped with the origin, tied to the effect', [p.effects[0].get('attachTo'), p.effects[0].get('persist'), p.effects[0].get('origin'), p.effects[0].get('tieToDocuments')], [[near, { bindAlpha: false, bindVisibility: false }], [true, { persistTokenPrototype: true }], ['Item.test'], [tie]]);
  const att = built({ ...glow, at: 'source', persist: 'until-removed', attach: { alpha: true, visibility: true } });
  t.same('attach knobs bind alpha and visibility', att.effects[0].get('attachTo')[1], { bindAlpha: true, bindVisibility: true });
  standing.push({ object: near, origin: 'Item.test' });
  const again = build(fxOf({ ...glow, at: 'each-target', persist: 'effect' }), moment({ targets: [hit(near)] }));
  standing.length = 0;
  t.is('a token that already carries a picture of this origin is left alone', again.seq, null);
  const tm = built({ ...glow, at: 'template', size: { squares: 4 } }, { place: regions.circle });
  t.same('at the template: at the Region, location cached, sized in squares', [tm.effects[0].get('atLocation'), tm.effects[0].get('size')], [[regions.circle, { cacheLocation: true }], [4, { gridUnits: true }]]);
  const tp = built({ ...glow, at: 'template', persist: 'template' }, { place: regions.circle });
  t.same('persistent at the template: persisted and stamped', [tp.effects[0].get('persist'), tp.effects[0].get('origin')], [[true], ['Item.test']]);
  t.same('a radius plus the token', built({ ...glow, size: { radius: 2, plusToken: true } }).effects[0].get('size'), [5, { gridUnits: true }]);
  t.same('fit to the object scales to it', built({ ...glow, size: { fit: 'object', scale: 2 } }).effects[0].get('scaleToObject'), [2]);
  t.same('follow: a once-only picture that still rides its token', built({ ...glow, follow: true }).effects[0].get('attachTo'), [caster]);
  const face = built({ ...glow, at: 'each-target', face: 'away-from-source' }, { targets: [hit(near)] });
  t.same('facing away from the source: turned toward it, then half a turn', [face.effects[0].get('rotateTowards')[0].id, face.effects[0].get('rotate')], ['caster', [180]]);
  t.same('mask clips to the token', built({ ...glow, mask: true }).effects[0].get('mask'), [caster]);
  t.same("rotate, anchor, aboveLighting are Sequencer's own", (() => { const e = built({ ...glow, rotate: 45, anchor: { x: 0, y: 1 }, aboveLighting: true }).effects[0]; return [e.get('rotate'), e.get('anchor'), e.get('aboveLighting')]; })(), [[45], [{ x: 0, y: 1 }], [true]]);
  t.is('onMiss skip on a miss: nothing', built({ ...glow, at: 'each-target', onMiss: 'skip' }, { targets: [hit(near, false)] }).seq, null);
  t.is('onMiss play on a miss: it plays', built({ ...glow, at: 'each-target' }, { targets: [hit(near, false)] }).effects.length, 1);
  t.same("at impact: where the target's own picture landed", built({ ...glow, at: 'impact' }, { targets: [hit(near)] }).effects[0].get('atLocation'), ['spot near']);
  t.same('a once-only mark of an effect moment is tied to the effect', built({ ...glow, at: 'source' }, { tie }).effects[0].get('tieToDocuments'), [tie]);
}

// ---------------------------------------------------------------------------------------------
if (t.section('fill: a picture sized to the placed template')) {
  const f = { shape: 'fill', asset: 'test.ring' };
  const c = built(f, { place: regions.circle });
  const e = c.effects[0];
  t.same('a circle: centred, sized to its diameter in pixels, at the Region with the location cached', [e.get('anchor'), e.get('size'), e.get('atLocation')], [[{ x: 0.5, y: 0.5 }], [{ width: 800, height: 800 }], [regions.circle, { cacheLocation: true }]]);
  t.same('… stamped with the origin and named for the FX', [e.get('origin'), e.get('name')], [['Item.test'], ['fx-test']]);
  t.is('… not turned (a circle has no direction)', e.has('rotateTowards'), false);
  const cone = built(f, { place: regions.cone }).effects[0];
  t.same('a cone: anchored at its point, as long as it is wide, turned with the Region', [cone.get('anchor'), cone.get('size'), cone.get('rotateTowards')], [[{ x: 0, y: 0.5 }], [{ width: 300, height: 300 }], [regions.cone, { cacheLocation: true }]]);
  const line = built(f, { place: regions.line }).effects[0];
  t.same('a line: its length by its width', line.get('size'), [{ width: 2000, height: 200 }]);
  const rect = built(f, { place: regions.rectangle }).effects[0];
  t.same('a rectangle: its side', rect.get('size'), [{ width: 300, height: 300 }]);
  t.same('a scale stretches the fit', built({ ...f, size: { fit: 'shape', scale: { x: 2, y: 0.5 } } }, { place: regions.circle }).effects[0].get('size'), [{ width: 1600, height: 400 }]);
  t.same('a size in squares ignores the shape', built({ ...f, size: { squares: 3 } }, { place: regions.circle }).effects[0].get('size'), [3, { gridUnits: true }]);
  const pt = built({ ...f, persist: 'template' }, { place: regions.circle }).effects[0];
  t.same('persist template, a circle: attached to the Region, turning with it', [pt.get('persist'), pt.get('attachTo')], [[true], [regions.circle, { bindRotation: true }]]);
  const ptc = built({ ...f, persist: 'template' }, { place: regions.cone }).effects[0];
  t.same('persist template, a cone: attached and turned toward the Region as it moves', [ptc.get('attachTo'), ptc.get('rotateTowards')], [[regions.cone], [regions.cone, { attachTo: true }]]);
  const tie = { uuid: 'Region.circle' };
  const pu = built({ ...f, persist: 'until-removed' }, { place: regions.circle, tie }).effects[0];
  t.same('persist until removed: left on the ground, tied to the Region', [pu.get('persist'), pu.get('atLocation'), pu.get('tieToDocuments')], [[true], [regions.circle, { cacheLocation: true }], [tie]]);
  const once = built({ ...f, repeat: 2 }, { place: regions.circle, tie }).effects[0];
  t.same('once: not persisted, repeats honoured, not tied', [once.has('persist'), once.get('repeats'), once.has('tieToDocuments')], [false, [2, 250], false]);
  const byPos = built({ ...f, asset: { byPosition: { center: 'test.cone.center', mid: 'test.cone.mid', left: 'test.cone.left' } }, rotate: 'by-position' }, { place: regions.rectangle }).effects[0];
  t.same('an asset picked by where the template sits against the caster, and turned to match', [byPos.get('file'), byPos.get('rotate')], [['test.cone.mid'], [270]]);
  t.same("mask, aboveLighting, xray are Sequencer's own", (() => { const x = built({ ...f, mask: true, aboveLighting: true, xray: false }, { place: regions.circle }).effects[0]; return [x.get('mask'), x.get('aboveLighting'), x.get('xray')]; })(), [[regions.circle], [true], [false]]);
  const w = built({ ...f, wait: true, delay: 400 }, { place: regions.circle });
  t.same('wait on a fill is a wait on the sequence', w.S[w.S.length - 1].calls, [['wait', [400]]]);
  const clear = built({ ...f, clearTemplate: true }, { place: regions.circle });
  t.is('clearTemplate: the sequence ends by removing the Region', clear.S[clear.S.length - 1].kind, 'thenDo');
  let deleted = null;
  canvas.scene.deleteEmbeddedDocuments = async (name, ids) => { deleted = [name, ids]; return []; };
  clear.S[clear.S.length - 1].fn();
  t.same('… by its document name and id', deleted, ['Region', ['circle']]);
  t.is('persist template with clearTemplate: the Region stays (the picture lives on it)', built({ ...f, persist: 'template', clearTemplate: true }, { place: regions.circle }).ctx.clearTemplate ?? null, null);
  t.is('no template placed: nothing', built(f).seq, null);
  t.is('a Region with no shape: nothing', built(f, { place: { id: 'r', shapes: [] } }).seq, null);
}

// ---------------------------------------------------------------------------------------------
if (t.section('aura: a persistent picture attached to a token, breathing or pulsing')) {
  const a = { shape: 'aura', asset: 'test.ring' };
  const d = built(a).effects[0];
  t.same('by default on the caster, a three-square radius as a diameter, attached, persisted', [d.get('attachTo')[0].id, d.get('size'), d.get('persist')], ['caster', [6, { gridUnits: true }], [true, { persistTokenPrototype: true }]]);
  t.same('… stamped with the origin, faded in and out, named', [d.get('origin'), d.get('fadeIn'), d.get('fadeOut'), d.get('name')], [['Item.test'], [250], [500], ['fx-test caster']]);
  const br = built({ ...a, breathe: { min: 0.9, max: 1.1, every: 2000 } }).effects[0];
  t.same("breathe loops the sprite's scale both ways", br.all('loopProperty').map((c) => c[1]), ['scale.x', 'scale.y']);
  t.same('… between its bounds, ping-pong, in grid units', br.get('loopProperty')[2], { from: 0.9, to: 1.1, duration: 2000, pingPong: true, ease: 'easeInOutSine', gridUnits: true });
  const pu = built({ ...a, pulse: { min: -0.3, max: 0.3, every: 500 } }).effects[0];
  t.same('pulse loops the alpha', pu.get('loopProperty').slice(0, 2), ['alphaFilter', 'alpha']);
  const tinted = built({ ...a, tint: { colour: '#00ff00', saturation: 1 } }).effects[0];
  t.same('a tint on an aura keeps its saturation', tinted.get('filter'), ['ColorMatrix', { saturate: 1 }]);
  const each = built({ ...a, at: 'each-target' }, { targets: [hit(near), hit(far)] });
  t.same('one per target', each.effects.map((e) => e.get('attachTo')[0].id), ['near', 'far']);
  standing.push({ object: near, origin: 'Item.test' });
  const again = build(fxOf({ ...a, at: 'each-target' }), moment({ targets: [hit(near)] }));
  standing.length = 0;
  t.is('a token already carrying it is left alone', again.seq, null);
  t.is('a spot without a token (the template) is not an aura', built({ ...a, at: 'template' }, { place: regions.circle }).seq, null);
}

// ---------------------------------------------------------------------------------------------
if (t.section('beam: attached at both ends, standing until ended')) {
  const b = { shape: 'beam', asset: 'test.bolt.orange' };
  const one = built(b, { targets: [hit(near)], tie: { uuid: 'ActiveEffect.b' } }).effects[0];
  t.same('attached to the caster, stretched to the target and following it', [one.get('attachTo')[0].id, one.get('stretchTo')], ['caster', [near, { attachTo: true }]]);
  t.same('persisted, tied, stamped, named', [one.get('persist'), one.get('tieToDocuments'), one.get('origin'), one.get('name')], [[true], [{ uuid: 'ActiveEffect.b' }], ['Item.test'], ['fx-test near']]);
  t.is('persist none: a beam that ends on its own', built({ ...b, persist: 'none' }, { targets: [hit(near)] }).effects[0].has('persist'), false);
  standing.push({ object: caster, origin: 'Item.test', data: { target: ['near'] } });
  const again = build(fxOf(b), moment({ targets: [hit(near), hit(far)] }));
  standing.length = 0;
  t.same('a target already joined by a beam of this origin is left alone; the others are joined', sections(again.seq).filter((s) => s.kind === 'effect').map((e) => e.get('stretchTo')[0].id), ['far']);
  t.is('no source: nothing', built(b, { source: null, targets: [hit(near)] }).seq, null);
  t.is('no targets: nothing', built(b).seq, null);
}

// ---------------------------------------------------------------------------------------------
if (t.section('move: the token itself, to a destination it knows or the spot the user clicks')) {
  const mv = { shape: 'move', sound: { asset: 'test.sfx.whoosh' } };
  const waiting = built(mv);
  t.same('no destination: the build waits for the click and plays nothing yet', [waiting.seq, waiting.ctx.waiting?.why], [null, 'waiting for the destination click']);
  const dest = { x: 860, y: 840 };
  const jump = built(mv, { destination: dest });
  t.same('a jump (the default): the sound, no walk, the teleport armed for after the sequence', [jump.S.map((s) => s.kind), jump.animations.length, typeof jump.ctx.after], [['sound'], 0, 'function']);
  t.is('… counts as a picture', jump.ctx.pictures, 1);
  const walk = built({ ...mv, jump: false, speed: 8 }, { destination: dest }).animations[0];
  t.same("a walk: the token moves to the square's top-left at its speed", [walk.get('on')[0].id, walk.get('moveTowards'), walk.get('moveSpeed')], ['caster', [{ x: 800, y: 800 }, { relativeToCenter: false }], [8]]);
  const faded = built({ ...mv, fade: { to: 0, after: 100, back: 900 } }, { destination: dest });
  t.same('a fade: the token dims before the move and comes back after', faded.animations.map((a) => [a.get('opacity')[0], a.get('delay')[0]]), [[0, 100], [1, 1000]]);
  t.is('a fade to 1 is no fade', built({ ...mv, fade: { to: 1 } }, { destination: dest }).animations.length, 0);
  t.is('noMove on the moment (a preview, a suite): the teleport is not armed', built(mv, { destination: dest, noMove: true }).ctx.after, null);
  // the spot judged by the spell's words, on a canvas that can be asked
  const scene = { shape: 'move', seen: true, unoccupied: true };
  t.same('off the canvas nothing can be judged: the spot is allowed', judgeSpot(scene, caster, { x: 800, y: 800 }), { ok: true });
  const parent = { grid: { sizeX: 100, sizeY: 100 }, tokens: [] };
  const doc = { id: 'caster', x: 500, y: 500, width: 1, height: 1, parent };
  const judged = { ...caster, document: doc };
  canvas.ready = true;
  globalThis.CONFIG.Canvas = { polygonBackends: { sight: { testCollision: () => false } } };
  t.same('a clear, empty spot is allowed', judgeSpot(scene, judged, { x: 800, y: 800 }), { ok: true });
  CONFIG.Canvas.polygonBackends.sight.testCollision = () => true;
  t.ok('a wall between refuses a spot that must be seen', /wall/.test(judgeSpot(scene, judged, { x: 800, y: 800 }).why ?? ''));
  t.same('… unless the scene does not ask to see it', judgeSpot({ shape: 'move', seen: false, unoccupied: true }, judged, { x: 800, y: 800 }), { ok: true });
  CONFIG.Canvas.polygonBackends.sight.testCollision = () => false;
  parent.tokens = [{ id: 'goblin', x: 800, y: 800, width: 1, height: 1, actor: { system: { isCreature: true } } }];
  t.ok('a creature on the spot refuses a spot that must be unoccupied', /creature/.test(judgeSpot(scene, judged, { x: 800, y: 800 }).why ?? ''));
  t.same('… but not a thing that is no creature', judgeSpot(scene, { ...judged, document: { ...doc, parent: { ...parent, tokens: [{ id: 'cart', x: 800, y: 800, width: 1, height: 1, actor: { system: { isCreature: false } } }] } } }, { x: 800, y: 800 }), { ok: true });
  t.same('… nor the token itself', judgeSpot(scene, { ...judged, document: { ...doc, parent: { ...parent, tokens: [{ id: 'caster', x: 800, y: 800, width: 1, height: 1 }] } } }, { x: 800, y: 800 }), { ok: true });
  t.same('… nor a creature one square over', judgeSpot(scene, judged, { x: 900, y: 800 }), { ok: true });
  const refused = build(fxOf({ shape: 'mark', asset: 'test.glow', at: 'destination' }, mv), moment({ source: judged, destination: dest }));
  t.same('a refused move stops the whole FX: no mark where the token will not go', [refused.seq, refused.ctx.refused?.includes('creature')], [null, true]);
  canvas.ready = false;
  parent.tokens = [];
  t.same('footprints overlap on their interiors, not their borders', [footprintsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 100, h: 100 }), footprintsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 0, w: 100, h: 100 })], [true, false]);
  t.is('no source: nothing', built(mv, { source: null, destination: dest }).seq, null);
}

// ---------------------------------------------------------------------------------------------
if (t.section('sound: a scene of nothing but sound')) {
  const s = built({ shape: 'sound', asset: 'test.sfx.thud', volume: 0.4, delay: 50, start: 10, repeat: 2, every: 300 });
  t.same('one sound section with every knob', [s.S.map((x) => x.kind), s.sounds[0].get('volume'), s.sounds[0].get('delay'), s.sounds[0].get('startTime'), s.sounds[0].get('repeats')], [['sound'], [0.4], [50], [10], [2, 300]]);
  t.ok('a sound-only FX plays (no picture needed)', s.seq !== null);
  const w = built({ shape: 'sound', asset: 'test.sfx.thud', wait: 600 });
  t.same('wait: the next scene waits that long', w.S[1].calls, [['wait', [600]]]);
  const gone = built({ shape: 'sound', asset: 'test.sfx.none' });
  t.same('a missing sound is recorded and still named, as a missing picture is (softFail plays nothing, the ledger says why)', [gone.ctx.missing.length, gone.sounds[0].get('file')], [1, ['test.sfx.none']]);
}

// ---------------------------------------------------------------------------------------------
if (t.section('custom: Sequencer calls as data, against the whitelist')) {
  const c = built({ shape: 'custom', calls: [['effect'], ['file', 'test.glow'], ['atLocation', 'source'], ['stretchTo', 'each-target'], ['scaleToObject', 2], ['sound'], ['file', 'test.sfx.thud'], ['wait', 100]] }, { targets: [hit(near)] });
  t.same('effect, sound and wait start their own sections', c.S.map((s) => s.kind), ['effect', 'sound', 'wait']);
  t.same("place words become the moment's tokens", [c.effects[0].get('atLocation')[0].id, c.effects[0].get('stretchTo')[0].id], ['caster', 'near']);
  t.same('files are recorded by section kind', [c.ctx.files, c.ctx.sounds], [['test.glow'], ['test.sfx.thud']]);
  t.is('an effect and a sound each count as something to play (a custom FX is never empty by accident)', c.ctx.pictures, 2);
  const bad = built({ shape: 'custom', calls: [['effect'], ['evaluate', 'x'], ['file', 'test.glow']] });
  t.ok('a call not on the whitelist is refused and noted', bad.ctx.notes.some((n) => n.includes('"evaluate" is not allowed')));
  t.is('… and the rest still plays', bad.effects[0].get('file')[0], 'test.glow');
  const early = built({ shape: 'custom', calls: [['file', 'test.glow'], ['effect']] });
  t.ok('a call before any section is noted', early.ctx.notes.some((n) => n.includes('before any effect')));
  t.same('a place word with nothing behind it is passed through as a word', built({ shape: 'custom', calls: [['effect'], ['file', 'test.glow'], ['atLocation', 'template']] }).effects[0].get('atLocation'), ['template']);
}

// ---------------------------------------------------------------------------------------------
if (t.section('the build path: scenes in order, the empty rules, every shape reachable')) {
  t.same('the engine has exactly the shapes the grammar names', Object.keys(SHAPES).sort(), [...SHAPE_NAMES].sort());
  t.same('… and a default for each', Object.keys(DEFAULTS).sort(), [...SHAPE_NAMES].sort());
  t.throws('a shape the grammar does not have throws by name', () => build({ id: 'x', scenes: [{ shape: 'sparkle' }] }, moment()), /no shape "sparkle"/);
  const order = built([{ shape: 'sound', asset: 'test.sfx.thud' }, { shape: 'mark', asset: 'test.glow', at: 'source' }, { shape: 'shoot', asset: 'test.bolt.orange' }], { targets: [hit(near)] });
  t.same('scenes build in the order they are written', order.S.map((s) => s.kind), ['sound', 'effect', 'effect']);
  t.same('every file and sound is recorded across scenes', [order.ctx.files, order.ctx.sounds], [['test.glow', 'test.bolt.orange'], ['test.sfx.thud']]);
  const noPic = built([{ shape: 'sound', asset: 'test.sfx.thud' }, { shape: 'shoot', asset: 'test.bolt.orange' }]);
  t.is('an FX whose pictures need a target plays nothing, sound included, when nothing is targeted', noPic.seq, null);
  t.is('an FX with no scenes plays nothing', build({ id: 'empty', scenes: [] }, moment()).seq, null);
  t.is('an FX with no scenes field plays nothing', build({ id: 'none' }, moment()).seq, null);
  t.same('the context starts clean', (() => { const { ctx } = build({ id: 'c', scenes: [] }, moment()); return [ctx.files, ctx.sounds, ctx.missing, ctx.pictures, ctx.notes, ctx.after]; })(), [[], [], [], 0, [], null]);
}

// ---------------------------------------------------------------------------------------------
if (t.section('resolving a moment: the word, the fallback, the silence, the pointer')) {
  const glow = [{ shape: 'mark', asset: 'test.glow' }];
  const index = buildIndex({ stock: [{ id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: glow }, { id: 'sneak-dice', for: ['feature:sneak-attack'], on: 'sneak', scenes: glow }, { id: 'fireball', for: ['spell:fireball'], on: 'use', scenes: [{ shape: 'fill', asset: 'test.ring' }] }, { id: 'fireball-flat', for: ['spell:fireball'], on: 'use', scenes: glow }], house: [{ id: 'quiet', for: ['spell:quiet'], on: 'use', off: true }, { id: 'own', for: [], on: 'use', scenes: glow }], starters: [] });
  const m = (keys, when, over = {}) => ({ ...moment({ when, subject: { name: 'x', keys } }), ...over });
  t.is('the word is answered by the FX authored for it', resolveMoment(index, m(['feature:sneak-attack'], 'sneak')).fx.id, 'sneak-dice');
  t.is('a use is answered by the use FX', resolveMoment(index, m(['feature:sneak-attack'], 'use')).fx.id, 'sneak-attack');
  const only = buildIndex({ stock: [{ id: 'sneak-attack', for: ['feature:sneak-attack'], on: 'use', scenes: glow }], house: [], starters: [] });
  const fb = resolveMoment(only, m(['feature:sneak-attack'], 'sneak'));
  t.same('a Battle Flow word with nothing authored falls back to the use FX and says so', [fb.fx.id, fb.fellBackFrom], ['sneak-attack', 'sneak']);
  t.is('hold-answered never falls back (the card already played the use)', resolveMoment(only, m(['feature:sneak-attack'], 'hold-answered')).fx, null);
  t.same('an off silences, and is not fallen past', (() => { const r = resolveMoment(index, m(['spell:quiet'], 'use')); return [r.fx, r.off]; })(), [null, true]);
  t.is('a placed template picks the FX that uses it', resolveMoment(index, m(['spell:fireball'], 'use', { place: regions.circle })).fx.id, 'fireball');
  t.is('… and no template picks the one that does not', resolveMoment(index, m(['spell:fireball'], 'use')).fx.id, 'fireball-flat');
  t.is("an item's own FX (the pointer) wins ahead of every key", resolveMoment(index, m(['spell:fireball'], 'use', { subject: { name: 'x', keys: ['spell:fireball'], pointer: 'own' } })).fx.id, 'own');
  t.ok('no keys: nothing, with a reason', /no keys/.test(resolveMoment(index, m([], 'use')).why));
}

// ---------------------------------------------------------------------------------------------
if (t.section('the play path: the ledger, the settings, the tickets, the picker')) {
  const glow = { id: 'glow', for: ['spell:glow'], on: 'use', scenes: [{ shape: 'mark', asset: 'test.glow', at: 'source' }] };
  const broken = { id: 'broken', for: ['spell:broken'], on: 'use', scenes: [{ shape: 'sparkle' }] };
  const index = buildIndex({ stock: [glow, { id: 'jump', for: ['spell:jump'], on: 'use', scenes: [{ shape: 'move', range: 30 }, { shape: 'mark', asset: 'test.ring', at: 'destination' }] }, broken], house: [], starters: [] });
  t.is('an FX the grammar refuses never reaches the index (the validator stands in front of the engine)', index.byId.has('broken'), false);
  const m = (keys, over = {}) => moment({ subject: { name: keys[0], keys }, id: `msg-${keys[0]}`, ...over });
  await t.step('play', async () => {
    ledger.length = 0;
    const dry = await play(index, m(['spell:glow']), { dryRun: true });
    t.same('a dry run resolves and builds, records, and does not play', [dry.fx, dry.played, dry.files, ledger[0].fx, ledger[0].played], ['glow', false, ['test.glow'], 'glow', false]);
    const real = await play(index, m(['spell:glow']));
    t.same('a play plays and records it', [real.played, real.why], [true, '']);
    t.same('the ledger keeps the newest first, with what the moment was', [ledger[0].fx, ledger[0].subject, ledger[0].keys], ['glow', 'spell:glow', ['spell:glow']]);
    const none = await play(index, m(['spell:nothing']));
    t.same('no FX: nothing, with the reason in the ledger', [none.fx, /no FX/.test(none.why)], [null, true]);
    const given = await play(index, m(['spell:nothing']), { fx: glow });
    t.same('a given FX plays without resolving', [given.fx, given.source, given.played], ['glow', 'given', true]);
    const silent = console.error;
    console.error = () => {};
    const bad = await play(index, m(['spell:broken']), { fx: broken });
    console.error = silent;
    t.same('a build that throws is a ledger entry, not a crash', [bad.fx, /build failed: .*sparkle/.test(bad.why)], ['broken', true]);
    useSettings({ playing: () => false });
    const off = await play(index, m(['spell:glow']));
    t.same('playing switched off: nothing, and the dry run still builds', [off.why, (await play(index, m(['spell:glow']), { dryRun: true })).fx], ['playing is switched off', 'glow']);
    useSettings({ playing: () => true });
    const ticket = m(['spell:glow'], { momentId: 'ticket-1' });
    const first = await play(index, ticket);
    const second = await play(index, ticket);
    t.same('a ticket plays once on this client', [first.played, second.fx, second.why], [true, null, 'already played (ticket ticket-1)']);
    t.is('… but a dry run of it still builds', (await play(index, ticket, { dryRun: true })).fx, 'glow');
    // the picker: a move with no destination arms a click, judges it, then plays the whole FX from there
    let errors = 0;
    ui.notifications.error = () => errors++;
    canvas.app.stage.listeners.clear();
    const armed = await play(index, m(['spell:jump']));
    t.same('a move with no destination is recorded as waiting and arms the click', [armed.fx, armed.played, armed.why, canvas.app.stage.listeners.has('pointerdown')], ['jump', false, 'waiting for the destination click', true]);
    click(2000, 500);
    t.same('a click beyond the range is refused and the picker stays armed', [errors, canvas.app.stage.listeners.has('pointerdown')], [1, true]);
    click(500, 500, { button: 2 });
    t.is('a right click is not a pick', canvas.app.stage.listeners.has('pointerdown'), true);
    const before = ledger.length;
    click(860, 840);
    await new Promise((r) => setTimeout(r, 10));
    t.same('a click in range plays the whole FX from there: the picker is gone, the mark landed at the destination', [canvas.app.stage.listeners.has('pointerdown'), ledger.length - before, ledger[0].fx, ledger[0].played, ledger[0].files], [false, 1, 'jump', true, ['test.ring']]);
    let ended = null;
    Sequencer.EffectManager.endEffects = (o) => { ended = o; };
    endPicturesOf('Item.x', near);
    t.same("ending an origin's pictures on a token asks Sequencer by origin and object", ended, { origin: 'Item.x', object: near });
    endPicturesOf('Item.x');
    t.same('… and by origin alone with no token', ended, { origin: 'Item.x' });
  });
}

t.done();
