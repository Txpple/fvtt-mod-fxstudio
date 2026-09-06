// Teleportation (AA's teleport preset): a range ring around the caster, the user clicks where to
// go, then a start effect, a flight between, an end effect, the token fading and moving. Port of
// custom-sequences/teleportation.js without the 3D branch. Interactive by nature: it runs on the
// acting user's client. A moment that already carries `destination` (a suite, a preview) skips
// the click and builds the sequence at once.
import { addSound, elevationOf, pathOf, useFile, SEQUENCE_OPTIONS } from './common.js';

export function build(ctx) {
  const { moment } = ctx;
  const sourceToken = moment.sourceToken;
  if (!sourceToken) return null;
  if (moment.destination) return buildMove(ctx, moment.destination);
  armPicker(ctx);
  return null;
}

function armPicker(ctx) {
  const { moment, primary } = ctx;
  const data = primary.data;
  const sourceToken = moment.sourceToken;
  const sourceTokenGS = sourceToken.w / canvas.grid.size;
  const userIDs = game.users.map((u) => u.id);
  const gmIDs = game.users.filter((u) => u.isGM).map((u) => u.id);
  const hideBorder = data.options.hideFromPlayers ? gmIDs : userIDs;
  const borderSize = sourceTokenGS / canvas.grid.size + 0.5 + data.options.range / canvas.dimensions.distance;
  const borderType = data.options.measureType === 'equidistant' ? 'roundedRect' : 'circle';
  const borderLocation = borderType === 'circle' ? {} : { offset: { x: -borderSize, y: -borderSize }, gridUnits: true };
  const borderData = { lineSize: 4, lineColor: game.user.color.toString(), radius: borderType === 'circle' ? borderSize : 0.25, width: borderSize * 2, height: borderSize * 2, gridUnits: true, name: 'teleBorder' };

  const borderSeq = new Sequence(SEQUENCE_OPTIONS);
  const border = borderSeq.effect().fadeIn(500).persist().fadeOut(500).atLocation(sourceToken, borderLocation).shape(borderType, borderData).elevation(sourceToken.document.elevation + 1).forUsers(hideBorder).name('teleportation').opacity(0.75);
  if (borderType === 'circle') {
    border.loopProperty('shapes.teleBorder', 'scale.x', { from: 0.98, to: 1.02, duration: 1500, pingPong: true, ease: 'easeInOutSine' });
    border.loopProperty('shapes.teleBorder', 'scale.y', { from: 0.98, to: 1.02, duration: 1500, pingPong: true, ease: 'easeInOutSine' });
  }
  borderSeq.play();

  const testCollision = (pos) => sourceToken.checkCollision(canvas.grid.getCenterPoint({ x: pos.x, y: pos.y }));
  const listener = (event) => {
    if (event.data.button !== 0) return;
    const pos = event.data.getLocalPosition(canvas.app.stage);
    const topLeft = canvas.grid.getTopLeftPoint({ x: pos.x, y: pos.y });
    if (canvas.grid.measurePath([sourceToken, topLeft], { gridSpaces: true }).distance <= data.options.range) {
      if (data.options.checkCollision && testCollision(pos)) ui.notifications.error('Your path is blocked. Try again.');
      else {
        canvas.app.stage.removeListener('pointerdown', listener);
        Sequencer.EffectManager.endEffects({ name: 'teleportation' });
        const seq = buildMove(ctx, pos);
        seq?.play().then(() => ctx.after?.());
      }
    } else ui.notifications.error('That is beyond the range of the teleport.');
  };
  canvas.app.stage.addListener('pointerdown', listener);
}

/** the move itself, for a destination in scene pixels */
export function buildMove(ctx, pos) {
  const { moment, primary } = ctx;
  const data = primary.data;
  const sourceToken = moment.sourceToken;
  const sourceTokenGS = sourceToken.w / canvas.grid.size;
  const gridPos = canvas.grid.getTopLeftPoint({ x: pos.x, y: pos.y });
  let centerPos;
  if (canvas.scene.grid.type === 0) centerPos = [gridPos.x + sourceToken.w, gridPos.y + sourceToken.w];
  else { const c = canvas.grid.getCenterPoint({ x: pos.x, y: pos.y }); centerPos = [c.x, c.y]; }
  const startX = sourceToken.center?.x;
  const startY = sourceToken.center?.y;
  const delayFade = data.options.delayFade || 0;
  const delayReturn = data.options.delayReturn || 0;

  const seq = new Sequence(SEQUENCE_OPTIONS);
  addSound(seq, data.sound, ctx);
  if (data.start) {
    const o = data.start.options;
    const s = useFile(seq.effect(), pathOf(data.start), ctx);
    s.atLocation({ x: startX, y: startY });
    s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
    s.size(sourceTokenGS * 1.5 * o.size, { gridUnits: true });
    s.opacity(o.opacity);
    s.fadeIn(o.fadeIn);
    s.fadeOut(o.fadeOut);
    s.delay(o.delay);
    s.playbackRate(o.playbackRate);
    if (o.isMasked) s.mask(sourceToken);
  }
  if (data.between) {
    const o = data.between.options;
    const s = useFile(seq.effect(), pathOf(data.between), ctx);
    s.atLocation({ x: startX, y: startY });
    s.delay(o.delay);
    s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
    s.opacity(o.opacity);
    s.stretchTo({ x: centerPos[0], y: centerPos[1] });
    s.playbackRate(o.playbackRate);
  }
  if (data.end) {
    const o = data.end.options;
    const s = useFile(seq.effect(), pathOf(data.end), ctx);
    s.atLocation({ x: centerPos[0], y: centerPos[1] });
    s.delay(o.delay);
    s.elevation(elevationOf(o.isAbsolute, o.elevation), { absolute: o.isAbsolute });
    s.size(sourceTokenGS * 1.5 * o.size, { gridUnits: true });
    s.fadeIn(o.fadeIn);
    s.fadeOut(o.fadeOut);
    s.playbackRate(o.playbackRate);
    if (o.isMasked) s.mask(sourceToken);
  }
  if (data.options.alpha < 1) seq.animation().on(sourceToken).opacity(data.options.alpha).delay(delayFade);
  if (!data.options.teleport) seq.animation().on(sourceToken).delay(data.options.delayMove).moveTowards({ x: gridPos.x, y: gridPos.y }, { relativeToCenter: !canvas.scene.grid.type }).moveSpeed(data.options.speed);
  if (data.options.alpha < 1) seq.animation().on(sourceToken).opacity(1).delay(delayFade + delayReturn);
  // AA moved the token once the whole sequence had played; the dispatcher runs `after` then
  if (data.options.teleport && !moment.noMove) {
    ctx.after = () => { setTimeout(() => { sourceToken.document.move([{ x: gridPos.x, y: gridPos.y }], { animate: false }); }, data.options.delayMove ?? 0); };
  }
  return seq;
}
