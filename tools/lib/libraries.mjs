// The three Sequencer databases, loaded in plain node with no Foundry running:
//   jb2a   - JB2A Patreon's own registration file (registers `jb2a.*`)
//   psfx   - PSFX Patreon's registration file (registers `psfx.*`)
//   aa     - Automated Animations' PRIVATE database (registers `autoanimations.*`): the base
//            Patreon table plus its eight versioned merges, rebuilt from AA's sourcemap with the
//            same merge AA runs (foundry.utils.mergeObject, `_free` markers dropped). AA is MIT.
// Plus the small emulation of how Sequencer reads a database path (files under a node, the
// metadata a path inherits, range-find keys), so a tool can say what a path plays without a canvas.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES, SCRATCH, toUrl } from './env.mjs';

export async function loadJb2a() {
  const m = await import(toUrl(`${MODULES.jb2a}/scripts/jb2a_sequencer.js`));
  await m.jb2aPatreonDatabase('modules');
  return m.patreonDatabase;
}

export async function loadPsfx() {
  const m = await import(toUrl(`${MODULES.psfx}/scripts/psfx_sequencer.js`));
  await m.registerPSFXDatabase('modules/psfx-patreon');
  return m.psfxDatabase;
}

/** an older PSFX registration file (the free 0.16.0 build), for re-pointing regrouped sounds */
export async function loadPsfxOther(file, prefix = 'modules/psfx') {
  const m = await import(toUrl(file));
  await m.registerPSFXDatabase(prefix);
  return m.psfxDatabase;
}

const AA_SOURCES = [
  'src/database/jb2a-patreon-database.js',
  ...['047', '048', '049', '050', '051', '052', '053', '054'].map((v) => `src/database/database-merge/patreonDB/${v}.js`),
];

/** AA's database exactly as AA builds it for a JB2A Patreon install (all eight merges apply to 0.9.2) */
export async function loadAA() {
  const mapFile = `${MODULES.aa}/dist/autoanimations.js.map`;
  if (!existsSync(mapFile)) throw new Error(`Automated Animations is not installed at ${MODULES.aa}; the import needs its database once`);
  const map = JSON.parse(readFileSync(mapFile, 'utf8'));
  const dir = join(SCRATCH, 'aa-src');
  mkdirSync(dir, { recursive: true });
  const files = {};
  for (const src of AA_SOURCES) {
    const i = map.sources.findIndex((s) => s.endsWith(src));
    if (i < 0) throw new Error(`AA sourcemap lacks ${src}`);
    const out = join(dir, src.split('/').pop().replace(/\.js$/, '.mjs'));
    writeFileSync(out, map.sourcesContent[i]);
    files[src] = out;
  }
  const base = await import(toUrl(files[AA_SOURCES[0]]));
  await base.initializeJB2APatreonDB('modules/jb2a_patreon');
  const db = base.JB2APATREONDB;
  for (const src of AA_SOURCES.slice(1)) {
    const v = src.match(/(\d{3})\.js$/)[1];
    const m = await import(toUrl(files[src]));
    const part = await m['db' + v]('modules/jb2a_patreon');
    stripFree(part);
    mergeObject(db, part);
  }
  return db;
}

// foundry.utils.mergeObject with its defaults: recurse into plain objects, overwrite everything else
function mergeObject(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (isPlain(v) && isPlain(target[k])) mergeObject(target[k], v);
    else target[k] = v;
  }
  return target;
}
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
function stripFree(o) {
  if (!isPlain(o)) return;
  delete o._free;
  for (const v of Object.values(o)) stripFree(v);
}

// ---------------------------------------------------------------------------------------------
// Reading a database the way Sequencer does
// ---------------------------------------------------------------------------------------------
const FEET = /^\d+ft$/;

export function nodeAt(db, path) {
  const parts = path.split('.');
  parts.shift(); // the module name
  let o = db;
  for (const p of parts) {
    if (!isPlain(o) || !(p in o)) return undefined;
    o = o[p];
  }
  return o;
}

/** every file under a node, in a stable order (what a random pick chooses among) */
export function filesUnder(node) {
  const out = [];
  const walk = (o) => {
    if (typeof o === 'string') out.push(o);
    else if (Array.isArray(o)) o.forEach(walk);
    else if (isPlain(o)) for (const [k, v] of Object.entries(o)) if (!k.startsWith('_')) walk(v);
  };
  walk(node);
  return out.sort();
}

/** the `_`-prefixed metadata a path inherits, level by level (Sequencer's _getCleanData walk) */
export function metadataAt(db, path) {
  const parts = path.split('.');
  parts.shift();
  const meta = {};
  const take = (o) => { for (const [k, v] of Object.entries(o)) if (k.startsWith('_') && k !== '_templates' && k !== '_free') meta[k.slice(1)] = v; };
  let o = db;
  take(o);
  for (const p of parts) {
    if (!isPlain(o)) break;
    o = o[p];
    if (isPlain(o)) take(o);
    else break;
  }
  if (!meta.template) meta.template = 'default';
  if (typeof meta.template === 'string') meta.template = db._templates?.[meta.template] ?? [100, 0, 0];
  return meta;
}

export const isRangeFind = (node) => isPlain(node) && Object.keys(node).some((k) => FEET.test(k));

/** the subtree at a path, `_free` dropped, everything else verbatim (files, metadata, structure) */
export function subtreeAt(db, path) {
  const node = nodeAt(db, path);
  if (node === undefined) return undefined;
  return JSON.parse(JSON.stringify(node, (k, v) => (k === '_free' ? undefined : v)));
}

/** the structure of a subtree with metadata stripped: what two paths must share to play the same */
export function shape(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(shape);
  if (isPlain(node)) {
    const o = {};
    for (const k of Object.keys(node).sort()) if (!k.startsWith('_')) o[k] = shape(node[k]);
    return o;
  }
  return node;
}

/** the set of dotted paths at which a node holds files, under a module root */
export function leafPaths(db, root) {
  const out = new Map();
  const walk = (o, pre) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_')) continue;
      const q = `${pre}.${k}`;
      if (Array.isArray(v) || typeof v === 'string') out.set(q, filesUnder(v));
      else if (isRangeFind(v)) out.set(q, filesUnder(v));
      else if (isPlain(v)) walk(v, q);
    }
  };
  walk(db, root);
  return out;
}

/**
 * What a path plays, the way Sequencer reads it: a database path (with an optional trailing file
 * index, "psfx.x.y.2"), a raw file, or a raw wildcard ("modules/x/sounds/*"). Returns the files, or
 * null when nothing resolves. `dbs` maps a module name to its database object.
 */
export function resolvePath(path, dbs, roots) {
  if (!path) return null;
  if (!Array.isArray(roots)) roots = [roots];
  const isDb = !path.includes('/') && /^[a-z0-9_-]+\./i.test(path);
  if (isDb) {
    const db = dbs[path.split('.')[0]];
    if (!db) return null;
    let node = nodeAt(db, path);
    if (node !== undefined) return filesUnder(node);
    const m = /^(.*)\.(\d+)$/.exec(path);
    if (!m) return null;
    node = nodeAt(db, m[1]);
    if (node === undefined) return null;
    const files = Array.isArray(node) ? node : filesUnder(node);
    return files[Number(m[2])] !== undefined ? [files[Number(m[2])]] : null;
  }
  if (path.includes('*')) {
    const dir = path.slice(0, path.lastIndexOf('/'));
    const re = new RegExp('^' + path.slice(path.lastIndexOf('/') + 1).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    for (const root of roots) {
      if (!existsSync(`${root}/${dir}`)) continue;
      const files = readdirSync(`${root}/${dir}`).filter((f) => re.test(f)).map((f) => `${dir}/${f}`).sort();
      if (files.length) return files;
    }
    return null;
  }
  return roots.some((root) => existsSync(`${root}/${path}`)) ? [path] : null;
}

/** an index from a file to the leaf path(s) that hold it */
export function fileIndex(leaves) {
  const idx = new Map();
  for (const [path, files] of leaves) for (const f of files) (idx.get(f) ?? idx.set(f, []).get(f)).push(path);
  return idx;
}
