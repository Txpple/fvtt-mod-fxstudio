// Thunderwave (AA's preset): the square template's position against the caster picks one of three
// shapes (centred, off one side, off a corner) and the angle. Port of
// custom-sequences/thunderwave.js; the three variants live in the private twin.
import { addSound, elevationOf, sourceLayer, useFile, SEQUENCE_OPTIONS } from './common.js';

export function build(ctx) {
  const { moment, primary } = ctx;
  const data = primary.data;
  const template = moment.template;
  const sourceToken = moment.sourceToken;
  if (!template || !sourceToken) return null;
  const color = data.color;
  const position = relativePosition(sourceToken, template);
  const path = color === 'random' ? `fxstudio.aa.templatefx.square.thunderwave.${position.type}` : `fxstudio.aa.templatefx.square.thunderwave.${position.type}.${color}`;

  const seq = new Sequence(SEQUENCE_OPTIONS);
  if (ctx.source) sourceLayer(seq, ctx.source, ctx);
  addSound(seq, data.sound, ctx);
  const s = useFile(seq.effect(), path, ctx)
    .atLocation(template, { cacheLocation: true })
    .anchor({ x: 0.5, y: 0.5 })
    .rotate(position.angle)
    .opacity(data.options.opacity)
    .size(3, { gridUnits: true })
    .repeats(data.options.repeat, data.options.repeatDelay);
  if (data.options.elevation === 0) s.belowTokens(true);
  else s.elevation(elevationOf(data.options.isAbsolute, data.options.elevation), { absolute: data.options.isAbsolute });
  if (data.options.removeTemplate) seq.thenDo(() => { canvas.scene.deleteEmbeddedDocuments(template.documentName ?? 'Region', [template.id]); });
  return seq;
}

/** where the template sits against the token: its type (center | mid | left) and the rotation */
export function relativePosition(token, template) {
  const b = template.bounds ?? template.object?.bounds ?? template.shapes?.[0]?.bounds;
  if (!b) return { type: 'center', angle: 0 };
  const tokenX = token.x, tokenY = token.y, tokenW = token.w, tokenH = token.h;
  const spellX = b.x, spellY = b.y, spellW = b.width, spellH = b.height;
  const leftOfToken = tokenX + tokenW / 2 >= spellX + spellW;
  const rightOfToken = tokenX + tokenW / 2 <= spellX;
  const aboveToken = tokenY + tokenH / 2 >= spellY + spellH;
  const belowToken = tokenY + tokenH / 2 <= spellY;
  const inX = tokenX + tokenW / 2 >= spellX && tokenX + tokenW / 2 <= spellX + spellW;
  const inY = tokenY + tokenH / 2 >= spellY && tokenY + tokenH / 2 <= spellY + spellH;
  if (inX && inY) return { type: 'center', angle: 0 };
  if (inY && leftOfToken) return { type: 'mid', angle: 90 };
  if (inY && rightOfToken) return { type: 'mid', angle: 270 };
  if (inX && aboveToken) return { type: 'mid', angle: 0 };
  if (inX && belowToken) return { type: 'mid', angle: 180 };
  if (leftOfToken && aboveToken) return { type: 'left', angle: 90 };
  if (rightOfToken && aboveToken) return { type: 'left', angle: 0 };
  if (leftOfToken && belowToken) return { type: 'left', angle: 180 };
  if (rightOfToken && belowToken) return { type: 'left', angle: 270 };
  return { type: 'center', angle: 0 };
}
