// Places: a scene's place word against a moment → the spots a picture plays at. A SPOT is
//   { token?, region?, point?, name?, hit }
// token   a Token placeable (the picture sits on it or travels to it)
// region  the placed template's Region document
// point   a scene point {x, y}
// name    the Sequencer effect name a picture landed under (an `impact` spot: the swing's or the
//         bolt's own name, which Sequencer resolves to where it ended, a miss included)
// hit     whether this spot was hit (a target's verdict; true where the moment has none)
import { wasHit } from '../core/moments.js';

/** the effect name a picture for a token is filed under, so a later scene can land where it did */
export const spotName = (token) => `spot ${token?.id ?? '?'}`;

/** the shortest grid path between two tokens in grid units (midi-qol's arithmetic, as AA measured reach) */
export function distanceBetween(t1, t2) {
  if (!canvas?.scene || !canvas.grid || !canvas.dimensions || !t1 || !t2) return -1;
  const t1StartX = t1.document.width >= 1 ? 0.5 : t1.document.width / 2;
  const t1StartY = t1.document.height >= 1 ? 0.5 : t1.document.height / 2;
  const t2StartX = t2.document.width >= 1 ? 0.5 : t2.document.width / 2;
  const t2StartY = t2.document.height >= 1 ? 0.5 : t2.document.height / 2;
  const segments = [];
  for (let x = t1StartX; x < t1.document.width; x++) {
    for (let y = t1StartY; y < t1.document.height; y++) {
      const origin = canvas.grid.getCenterPoint({ x: Math.round(t1.document.x + canvas.dimensions.size * x), y: Math.round(t1.document.y + canvas.dimensions.size * y) });
      for (let x1 = t2StartX; x1 < t2.document.width; x1++) {
        for (let y1 = t2StartY; y1 < t2.document.height; y1++) {
          const dest = canvas.grid.getCenterPoint({ x: Math.round(t2.document.x + canvas.dimensions.size * x1), y: Math.round(t2.document.y + canvas.dimensions.size * y1) });
          segments.push([origin, dest]);
        }
      }
    }
  }
  if (!segments.length) return -1;
  let distance = Infinity;
  for (const segment of segments) {
    const d = canvas.grid.measurePath(segment, { gridSpaces: true }).distance;
    if (d < distance) distance = d;
  }
  return distance / canvas.dimensions.distance;
}

/** a token's size in grid squares, the way a picture sized "one token wide" measures it (image scale and ring included) */
export function tokenSquares(token) {
  const td = token.document;
  return Math.max(td.width * td.texture.scaleX, td.height * td.texture.scaleY) / ((td.ring?.enabled && td.ring?.subject?.scale) || 1);
}

/** a random point inside this FX's standing area picture (named after the FX), else the source token */
export function insideArea(moment, name) {
  const standing = Sequencer.EffectManager.getEffects({ sceneId: canvas.scene.id, name })[0];
  if (!standing) return { token: moment.source };
  const half = canvas.grid.size / 2;
  const xMin = standing.source.x - standing.source.width / 2 + half;
  const xMax = standing.source.x + standing.source.width / 2 - half;
  const yMin = standing.source.y - standing.source.height / 2 + half;
  const yMax = standing.source.y + standing.source.height / 2 - half;
  return { point: { x: Sequencer.Helpers.random_int_between(xMin, xMax), y: Sequencer.Helpers.random_int_between(yMin, yMax) } };
}

/** the centre of the destination a move already knows, snapped as the move snaps it */
export function destinationSpot(moment) {
  const pos = moment.destination;
  if (!pos) return null;
  const gridPos = canvas.grid.getTopLeftPoint({ x: pos.x, y: pos.y });
  let centre;
  if (canvas.scene.grid.type === 0) centre = { x: gridPos.x + moment.source.w, y: gridPos.y + moment.source.w };
  else centre = canvas.grid.getCenterPoint({ x: pos.x, y: pos.y });
  return { point: centre, topLeft: gridPos };
}

/**
 * The spots a place word names for this moment. `fxName` is the FX's id (for `area`).
 * @returns [{token?, region?, point?, name?, hit}]
 */
export function spotsFor(word, moment, { fxName = null } = {}) {
  const targets = (moment.targets ?? []).map((t) => ({ token: t.token, hit: wasHit(moment, t.token) }));
  const source = moment.source ? [{ token: moment.source, hit: true }] : [];
  switch (word) {
    case 'source': return source;
    case 'each-target': return targets;
    case 'targets-else-source': return targets.length ? targets : source;
    case 'both': return [...source, ...targets];
    case 'template': return moment.place ? [{ region: moment.place, hit: true }] : [];
    case 'destination': { const d = destinationSpot(moment); return d ? [{ ...d, hit: true }] : []; }
    case 'impact': return targets.map((t) => ({ ...t, name: spotName(t.token) }));
    case 'area': return [{ ...insideArea(moment, fxName), hit: true }];
    default: return [];
  }
}

/** what a spot is, for Sequencer's location-taking calls */
export const spotTarget = (spot) => spot.name ?? spot.token ?? spot.region ?? spot.point;

/** the placed template's shape: type (circle | cone | line | rectangle), distance in grid units, the shape */
export function templateShape(region) {
  const shape = region?.shapes?.[0];
  return { shape, type: shape?.type ?? null, distance: shape?.measuredSegments?.[0]?.distance };
}

/** where the template sits against the token: center | mid | left, and the rotation (an asset picked by position) */
export function relativePosition(token, region) {
  const b = region.bounds ?? region.object?.bounds ?? region.shapes?.[0]?.bounds;
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
