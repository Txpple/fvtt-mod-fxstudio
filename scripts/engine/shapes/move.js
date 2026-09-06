// MOVE: the token itself. It fades, travels (or jumps) to the destination, and arrives. The
// destination is the one the moment already carries (a suite, a preview, a token's own movement) or
// the spot the acting user clicks within range: a ring shows the range, the click is checked
// against it (and against walls when asked), and the look plays from there.
//
//   range feet   pick click | movement   speed   jump (true: the token is placed; false: it travels)
//   fade {to, after, back}   after: ms before the token moves   checkCollision
import { SEQUENCE_OPTIONS, addSound, full } from '../common.js';
import { destinationSpot } from '../places.js';

/**
 * A move needs a destination. Without one on the moment it arms the picker and returns "waiting";
 * the render then plays the whole look once the click lands (render.js builds again with the
 * destination filled in).
 */
export function build(seq, scene0, ctx) {
  const s = full(scene0);
  const { moment } = ctx;
  const source = moment.source;
  if (!source) return;
  const dest = destinationSpot(moment);
  if (!dest) { ctx.waiting = { scene: s, why: 'waiting for the destination click' }; return; }
  addSound(seq, s.sound, ctx);
  const fade = s.fade ?? null;
  if (fade && (fade.to ?? 1) < 1) seq.animation().on(source).opacity(fade.to ?? 0).delay(fade.after ?? 0);
  if (!s.jump) seq.animation().on(source).delay(s.after ?? 0).moveTowards({ x: dest.topLeft.x, y: dest.topLeft.y }, { relativeToCenter: !canvas.scene.grid.type }).moveSpeed(s.speed ?? 6);
  if (fade && (fade.to ?? 1) < 1) seq.animation().on(source).opacity(1).delay((fade.after ?? 0) + (fade.back ?? 0));
  if (s.jump && !moment.noMove) {
    ctx.after = () => { setTimeout(() => { source.document.move([{ x: dest.topLeft.x, y: dest.topLeft.y }], { animate: false }); }, s.after ?? 0); };
  }
  ctx.pictures++;
}

/** arm the click: a ring around the token, the click checked, then `onPick({x, y})` */
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
  const blocked = (pos) => source.checkCollision(canvas.grid.getCenterPoint({ x: pos.x, y: pos.y }));
  const listener = (event) => {
    if (event.data.button !== 0) return;
    const pos = event.data.getLocalPosition(canvas.app.stage);
    const topLeft = canvas.grid.getTopLeftPoint({ x: pos.x, y: pos.y });
    if (canvas.grid.measurePath([source, topLeft], { gridSpaces: true }).distance > (s.range ?? 30)) { ui.notifications.error('That is beyond the range of the move.'); return; }
    if (s.checkCollision && blocked(pos)) { ui.notifications.error('Your path is blocked. Try again.'); return; }
    canvas.app.stage.removeListener('pointerdown', listener);
    Sequencer.EffectManager.endEffects({ name: 'fxstudio-move-range' });
    onPick(pos);
  };
  canvas.app.stage.addListener('pointerdown', listener);
}
