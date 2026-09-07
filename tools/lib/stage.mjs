// The offline stage: enough of Foundry's canvas and Sequencer's API, in plain node, for an FX (or
// the oracle's row) to BUILD its Sequence without a table. `Sequence` here is a RECORDER: every
// section remembers the calls made on it, so two builders can be compared call for call (the
// render-level proof, ARCHITECTURE §6.2) and a build can be read without playing.
//
//   install({dbs})       sets the globals (canvas, game, ui, Sequencer, Sequence, Item, CONFIG, fromUuidSync)
//   token({...})         a stand-in Token placeable; region({...}) a stand-in placed-template Region
//   standing             the list Sequencer.EffectManager.getEffects answers from (empty by default)
import { filesUnder, nodeAt, resolvePath } from './libraries.mjs';
import { ROOTS } from './env.mjs';

const GRID = 100;
const DISTANCE = 5;

export const standing = [];

/** a recording section: every method call is remembered and chains */
function section(kind, sequence) {
  const rec = { kind, calls: [], _isSound: kind === 'sound' };
  const proxy = new Proxy(rec, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'then' || typeof p === 'symbol') return undefined;
      if (p === 'constructor') return { name: kind === 'sound' ? 'SoundSection' : kind === 'effect' ? 'EffectSection' : 'AnimationSection' };
      // a section method that starts another section (AA chains seq.effect().file(...).then more)
      if (p === 'effect' || p === 'sound' || p === 'animation' || p === 'thenDo' || p === 'wait' || p === 'play') return (...args) => sequence[p](...args);
      return (...args) => { t.calls.push([p, args]); return proxy; };
    },
  });
  return proxy;
}

export class RecordingSequence {
  constructor(options) { this.options = options; this.sections = []; }
  effect() { const s = section('effect', this); this.sections.push(s); return s; }
  sound() { const s = section('sound', this); this.sections.push(s); return s; }
  animation() { const s = section('animation', this); this.sections.push(s); return s; }
  thenDo(fn) { this.sections.push({ kind: 'thenDo', calls: [], fn }); return this; }
  wait(ms) { this.sections.push({ kind: 'wait', calls: [['wait', [ms]]] }); return this; }
  addSequence(other) { this.sections.push(...(other.sections ?? [])); return this; }
  async play() { return; }
}

let tokenCount = 0;
/** a stand-in token: `size` in grid squares, `x`/`y` its top-left in pixels */
export function token({ id = null, name = null, x = 500, y = 500, size = 1, scale = 1, elevation = 0 } = {}) {
  tokenCount++;
  const w = size * GRID;
  const t = {
    id: id ?? `token${tokenCount}`,
    name: name ?? `Token ${tokenCount}`,
    x, y, w, h: w,
    get center() { return { x: t.x + w / 2, y: t.y + w / 2 }; },
    document: { x, y, width: size, height: size, elevation, texture: { scaleX: scale, scaleY: scale }, ring: null, move: async () => {}, update: async () => {} },
    actor: { items: { get: () => null, getName: () => null } },
    _isToken: true,
  };
  Object.defineProperty(t.document, 'x', { get: () => t.x, set: (v) => { t.x = v; } });
  Object.defineProperty(t.document, 'y', { get: () => t.y, set: (v) => { t.y = v; } });
  return t;
}

let regionCount = 0;
/** a stand-in placed template: type circle | cone | line | rectangle, distance in grid units, at x/y */
export function region({ id = null, type = 'circle', distance = 20, x = 1100, y = 500, width = 5, direction = 0 } = {}) {
  regionCount++;
  const px = distance * (GRID / DISTANCE);
  const bounds = type === 'circle' ? { x: x - px, y: y - px, width: px * 2, height: px * 2 } : type === 'rectangle' ? { x, y, width: px, height: px } : { x, y: y - px / 2, width: px, height: px };
  const shape = { type, measuredSegments: [{ distance }], width: width * (GRID / DISTANCE), direction, bounds, x, y };
  return { id: id ?? `region${regionCount}`, documentName: 'Region', shapes: [shape], bounds, x, y, flags: {}, _isRegion: true };
}

/** the database the stage answers from: {jb2a, psfx, fxstudio} registration objects */
export function database(dbs) {
  const exists = (path) => !!resolvePath(path, dbs, ROOTS);
  const files = (path) => resolvePath(path, dbs, ROOTS) ?? [];
  const children = (path) => {
    const db = dbs[path.split('.')[0]];
    const node = db ? nodeAt(db, path) : undefined;
    return node && typeof node === 'object' && !Array.isArray(node) ? Object.keys(node).filter((k) => !k.startsWith('_')) : [];
  };
  return { exists, files, children, filesUnder: (path) => { const db = dbs[path.split('.')[0]]; const n = db ? nodeAt(db, path) : undefined; return n === undefined ? null : filesUnder(n); } };
}

/** set the globals both builders read */
export function install({ dbs = {} } = {}) {
  const db = database(dbs);
  const cell = (v) => Math.floor(v / GRID) * GRID;
  globalThis.canvas = {
    grid: {
      size: GRID,
      getCenterPoint: ({ x, y }) => ({ x: cell(x) + GRID / 2, y: cell(y) + GRID / 2 }),
      getTopLeftPoint: ({ x, y }) => ({ x: cell(x), y: cell(y) }),
      measurePath: ([a, b]) => {
        const ax = a.x ?? a.document?.x ?? 0, ay = a.y ?? a.document?.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
        const dx = Math.abs(cell(ax) - cell(bx)) / GRID, dy = Math.abs(cell(ay) - cell(by)) / GRID;
        return { distance: Math.max(dx, dy) * DISTANCE };
      },
    },
    dimensions: { size: GRID, distance: DISTANCE, distancePixels: GRID / DISTANCE },
    scene: { id: 'stage', grid: { type: 1 }, regions: new Map(), deleteEmbeddedDocuments: async () => [] },
    app: { stage: { addListener() {}, removeListener() {} } },
    tokens: { get: () => null, controlled: [] },
  };
  globalThis.game = {
    user: { id: 'gm', name: 'Stage', isGM: true, active: true, color: { toString: () => '#ff0000' }, targets: new Set() },
    users: [{ id: 'gm', name: 'Stage', isGM: true, active: true }],
    settings: { get: () => undefined, set: async () => {}, register() {} },
    modules: { get: () => ({}) },
    actors: { get: () => null, contents: [] },
    i18n: { localize: (s) => s },
  };
  globalThis.ui = { notifications: { error() {}, warn() {}, info() {} } };
  globalThis.Hooks = { once() {}, on() {}, callAll() {} };
  globalThis.Item = class {};
  globalThis.CONFIG = { DND5E: { areaTargetTypes: { circle: 1, cone: 1, line: 1, square: 1, rect: 1 } } };
  globalThis.fromUuidSync = () => null;
  globalThis.ChatMessage = { getSpeakerActor: () => null };
  globalThis.Sequence = RecordingSequence;
  globalThis.Sequencer = {
    Database: {
      entryExists: (p) => db.exists(p),
      getEntry: (p) => ({ getAllFiles: () => db.files(p) }),
      getPathsUnder: (p) => db.children(p),
    },
    EffectManager: {
      getEffects: ({ object, origin, name } = {}) => standing.filter((e) => (!object || e.object === object) && (!origin || e.origin === origin) && (!name || e.name === name)),
      endEffects: () => {},
      endAllEffects: () => {},
    },
    Helpers: { random_int_between: (a, b) => Math.floor((a + b) / 2) },
  };
  return db;
}
