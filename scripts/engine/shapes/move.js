// MOVE: the token itself. It fades, travels (or jumps) to the destination, and arrives. The
// destination is the one the moment already carries (a suite, a preview, a token's own movement) or
// the spot the acting user clicks within range: a ring shows the range, the click is judged, and
// the FX plays from there.
//
//   range feet   pick click | movement   speed   jump (true: the token is placed; false: it travels)
//   fade {to, after, back}   after: ms before the token moves
//   seen (the spot must be a space the caster can see: no sight-blocking wall between)
//   unoccupied (no creature may stand on the spot)
//
// A jump is a teleport: the token is placed with Foundry's own teleport movement action
// (`displace`, the one its undo uses), which crosses walls and creatures — a bare move is walked
// by Foundry and stopped by a wall, and by dnd5e's movement automation in front of a hostile.
// What the spell's words demand of the spot (2026-09-04 at the table, Misty Step: "an unoccupied
// space you can see") is judged here before the token moves, and never the range: the ring and the
// table hold that. Carried over from Misc Patches' teleport patch on 2026-09-06, now that the move
// is this module's own.
import { SEQUENCE_OPTIONS, addSound, full } from '../common.js';
import { destinationSpot } from '../places.js';

/**
 * A move needs a destination. Without one on the moment it arms the picker and returns "waiting";
 * the render then plays the whole fx once the click lands (render.js builds again with the
 * destination filled in).
 */
export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const source = moment.source;
  if (!source) return;
  const dest = destinationSpot(moment);
  if (!dest) { ctx.waiting = { scene: s, why: 'waiting for the destination click' }; return; }
  if (!moment.noMove) {
    const verdict = judgeSpot(s, source, dest.topLeft);
    if (!verdict.ok) { ctx.notes.push(`the move was refused: ${verdict.why}`); ctx.refused = verdict.why; return; }
  }
  addSound(seq, s.sound, ctx);
  const fade = s.fade ?? null;
  if (fade && (fade.to ?? 1) < 1) seq.animation().on(source).opacity(fade.to ?? 0).delay(fade.after ?? 0);
  if (!s.jump) seq.animation().on(source).delay(s.after ?? 0).moveTowards({ x: dest.topLeft.x, y: dest.topLeft.y }, { relativeToCenter: !canvas.scene.grid.type }).moveSpeed(s.speed ?? 6);
  if (fade && (fade.to ?? 1) < 1) seq.animation().on(source).opacity(1).delay((fade.after ?? 0) + (fade.back ?? 0));
  if (s.jump && !moment.noMove) {
    ctx.after = () => { setTimeout(() => { teleport(source, dest.topLeft); }, s.after ?? 0); };
  }
  ctx.pictures++;
}

/** place the token with Foundry's own teleport action: across walls and creatures, no walk */
export function teleport(token, topLeft) {
  return token.document.move([{ x: topLeft.x, y: topLeft.y, action: 'displace' }], { animate: false });
}

/**
 * The spot judged by the scene's words: `seen` — a sight-blocking wall between the token's centre
 * and the spot's refuses; `unoccupied` — a creature standing on the spot refuses. {ok, why}.
 * Off the canvas (the tools' stage) nothing can be judged and the spot is allowed.
 */
export function judgeSpot(scene, token, topLeft) {
  const s = full(scene);
  try {
    const doc = token.document;
    if (!doc?.parent || !globalThis.canvas?.ready) return { ok: true };
    if (s.seen && sightBlocked(token, topLeft)) return { ok: false, why: 'the spot must be a space you can see, and a wall stands between' };
    if (s.unoccupied && occupied(token, topLeft)) return { ok: false, why: 'the spot must be an unoccupied space, and a creature stands there' };
    return { ok: true };
  } catch (e) {
    console.warn('FX Studio | the spot could not be judged; the move goes on', e);
    return { ok: true };
  }
}

const centreOf = (doc, topLeft) => (typeof doc.getCenterPoint === 'function' ? doc.getCenterPoint(topLeft) : { x: topLeft.x + (doc.width * doc.parent.grid.sizeX) / 2, y: topLeft.y + (doc.height * doc.parent.grid.sizeY) / 2 });

function sightBlocked(token, topLeft) {
  // from the DOCUMENT's position: the placeable lags behind it while Foundry 14 animates a move
  const from = centreOf(token.document, { x: token.document.x, y: token.document.y });
  const to = centreOf(token.document, topLeft);
  return !!CONFIG.Canvas.polygonBackends.sight.testCollision(from, to, { type: 'sight', mode: 'any' });
}

/** two axis-aligned footprints overlap (a square is its interior, not its border) */
export function footprintsOverlap(a, b) {
  const eps = 1;
  return b.x < a.x + a.w - eps && b.x + b.w > a.x + eps && b.y < a.y + a.h - eps && b.y + b.h > a.y + eps;
}

function occupied(token, topLeft) {
  const doc = token.document;
  const grid = doc.parent.grid;
  const mine = { x: topLeft.x, y: topLeft.y, w: doc.width * grid.sizeX, h: doc.height * grid.sizeY };
  return doc.parent.tokens.some((t) => t.id !== doc.id && t.actor?.system?.isCreature !== false && footprintsOverlap(mine, { x: t.x, y: t.y, w: t.width * grid.sizeX, h: t.height * grid.sizeY }));
}

/** arm the click: a ring around the token, the click judged (range, then the spot's words), then `onPick({x, y})` */
export function armPicker(scene0, moment, onPick) {
  const s = full(scene0);
  const source = moment.source;
  const sourceTokenGS = source.w / canvas.grid.size;
  const borderSize = sourceTokenGS / canvas.grid.size + 0.5 + (s.range ?? 30) / canvas.dimensions.distance;
  const borderData = { lineSize: 4, lineColor: game.user.color.toString(), radius: borderSize, width: borderSize * 2, height: borderSize * 2, gridUnits: true, name: 'range' };
  const ring = new Sequence(SEQUENCE_OPTIONS);
  const border = ring.effect().fadeIn(500).persist().fadeOut(500).atLocation(source, {}).shape('circle', borderData).elevation(source.document.elevation + 1).forUsers(game.users.map((u) => u.id)).name('fxstudio-move-range').opacity(0.75);
  border.loopProperty('shapes.range', 'scale.x', { from: 0.98, to: 1.02, duration: 1500, pingPong: true, ease: 'easeInOutSine' });
  border.loopProperty('shapes.range', 'scale.y', { from: 0.98, to: 1.02, duration: 1500, pingPong: true, ease: 'easeInOutSine' });
  ring.play();
  const listener = (event) => {
    if (event.data.button !== 0) return;
    const pos = event.data.getLocalPosition(canvas.app.stage);
    const topLeft = canvas.grid.getTopLeftPoint({ x: pos.x, y: pos.y });
    if (canvas.grid.measurePath([source, topLeft], { gridSpaces: true }).distance > (s.range ?? 30)) { ui.notifications.error('That is beyond the range of the move.'); return; }
    const verdict = judgeSpot(s, source, topLeft);
    if (!verdict.ok) { ui.notifications.warn(`${verdict.why.charAt(0).toUpperCase()}${verdict.why.slice(1)}. Pick again.`); return; }
    canvas.app.stage.removeListener('pointerdown', listener);
    Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
    onPick(pos);
  };
  canvas.app.stage.addListener('pointerdown', listener);
}
