// The private asset table, retired by measurement (ARCHITECTURE §6.3). Automated Animations
// played JB2A's files through its own Sequencer table with its own stretch metadata. Here every
// AA path is pointed at the libraries' own registration where the same files can be played the
// same way, and AA's metadata is carried as a per-scene `template` only where it differs. What
// cannot be played natively stays in the frozen table, counted.
//
//   the AA node's files are exactly a JB2A node's files, same structure  → {path}
//   every AA file is a single-file JB2A leaf                              → {paths: [leaf paths]}
//   AA picked files out of a JB2A set (a raw file exists for each)         → {paths: [files]} or {file}
//   the AA node picks by distance (range keys) and JB2A has no twin       → frozen
//   the loop markers differ                                               → frozen (the loop points would change)
// Sounds already name PSFX's and JB2A's own paths and raw files; nothing to do.
import { filesUnder, isRangeFind, leafPaths, metadataAt, nodeAt, shape } from '../libraries.mjs';

export function makeNativiser({ jb2a, twin }) {
  const leaves = leafPaths(jb2a, 'jb2a');
  const byLeafFiles = new Map();
  for (const [p, files] of leaves) { const k = files.join('|'); (byLeafFiles.get(k) ?? byLeafFiles.set(k, []).get(k)).push(p); }
  const byNodeFiles = new Map();
  const nodeShapes = new Map();
  (function walk(o, pre) {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_')) continue;
      const q = `${pre}.${k}`;
      const files = filesUnder(v);
      (byNodeFiles.get(files.join('|')) ?? byNodeFiles.set(files.join('|'), []).get(files.join('|'))).push(q);
      nodeShapes.set(q, JSON.stringify(shape(v)));
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, q);
    }
  })(jb2a, 'jb2a');
  const singleFileLeaf = new Map();
  for (const [p, files] of leaves) if (files.length === 1) singleFileLeaf.set(files[0], p);

  const stats = { paths: 0, exact: 0, leaves: 0, ranges: 0, files: 0, frozen: 0, templateCarried: 0, markersFrozen: 0, rangeFrozen: 0, missingNode: 0 };
  const frozenPaths = new Set();
  const cache = new Map();

  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /**
   * @param aaPath  "autoanimations.x.y.z" or "fxstudio.aa.x.y.z"
   * @returns {asset, how, note?}  asset: {path} | {paths} | {file} | {path: fxstudio.aa.…} (frozen), with template where carried
   */
  function assetFor(aaPath) {
    const twinPath = aaPath.replace(/^autoanimations\./, 'fxstudio.aa.');
    if (cache.has(twinPath)) return cache.get(twinPath);
    const out = decide(twinPath);
    cache.set(twinPath, out);
    return out;
  }

  function decide(twinPath) {
    stats.paths++;
    const node = nodeAt(twin, twinPath);
    if (node === undefined) { stats.missingNode++; stats.frozen++; frozenPaths.add(twinPath); return { asset: { path: twinPath }, how: 'frozen', note: 'no such node in the frozen table (silent under AA too)' }; }
    const files = filesUnder(node);
    const aaMeta = metadataAt(twin, twinPath);
    const key = files.join('|');
    const finish = (asset, how, jbPath) => {
      const jbMeta = jbPath ? metadataAt(jb2a, jbPath) : { template: null, markers: undefined };
      const markersDiffer = !eq(aaMeta.markers ?? null, jbMeta.markers ?? null);
      if (markersDiffer) { stats.markersFrozen++; stats.frozen++; frozenPaths.add(twinPath); return { asset: { path: twinPath }, how: 'frozen', note: `loop markers differ (AA ${JSON.stringify(aaMeta.markers ?? null)}, JB2A ${JSON.stringify(jbMeta.markers ?? null)})` }; }
      const templateDiffers = !eq(aaMeta.template, jbMeta.template);
      if (templateDiffers || !jbPath) { asset.template = aaMeta.template; stats.templateCarried++; }
      stats[how]++;
      return { asset, how };
    };
    // 1. the same files under a JB2A node of the same structure
    const candidates = [...(byLeafFiles.get(key) ?? []), ...(byNodeFiles.get(key) ?? [])];
    const aaShape = JSON.stringify(shape(node));
    const exact = candidates.find((p) => nodeShapes.get(p) === aaShape);
    if (exact) return finish({ path: exact }, 'exact', exact);
    // 2. a node that picks by distance: JB2A keeps the same files with the variant above the range keys
    //    ({01: {05ft: a, 15ft: b}, 02: {…}}) and single files unwrapped; a list of the variant nodes picks
    //    a variant at random and then by distance, which is what AA's {05ft: [a1, a2], 15ft: [b1, b2]} did
    if (isRangeFind(node)) {
      for (const cand of candidates) {
        const jbNode = nodeAt(jb2a, cand);
        const variants = isRangeFind(jbNode) ? [cand] : Object.keys(jbNode ?? {}).filter((k) => !k.startsWith('_') && isRangeFind(jbNode[k])).map((k) => `${cand}.${k}`);
        if (!variants.length) continue;
        const perRange = (n) => { const out = {}; for (const [k, v] of Object.entries(n)) if (!k.startsWith('_')) out[k] = filesUnder(v); return out; };
        const want = perRange(node);
        const got = {};
        for (const v of variants) for (const [k, files] of Object.entries(perRange(nodeAt(jb2a, v)))) (got[k] ??= []).push(...files);
        for (const k of Object.keys(got)) got[k].sort();
        if (eq(want, got)) {
          const metas = variants.map((p) => JSON.stringify(metadataAt(jb2a, p)));
          if (new Set(metas).size === 1) return finish(variants.length === 1 ? { path: variants[0] } : { paths: variants }, 'ranges', variants[0]);
        }
      }
      stats.rangeFrozen++; stats.frozen++; frozenPaths.add(twinPath); return { asset: { path: twinPath }, how: 'frozen', note: 'picks its file by distance; JB2A holds no node with the same range keys' };
    }
    // 3. every file is a single-file JB2A leaf: a list of those leaves (metadata stays native per leaf)
    if (files.every((f) => singleFileLeaf.has(f))) {
      const paths = files.map((f) => singleFileLeaf.get(f));
      const jb = paths[0];
      const metas = paths.map((p) => JSON.stringify(metadataAt(jb2a, p)));
      if (new Set(metas).size === 1) return finish(paths.length === 1 ? { path: paths[0] } : { paths }, 'leaves', jb);
    }
    // 4. the files themselves, raw (AA's metadata carried as the template; markers cannot be, so they must be empty)
    if (aaMeta.markers) { stats.markersFrozen++; stats.frozen++; frozenPaths.add(twinPath); return { asset: { path: twinPath }, how: 'frozen', note: 'raw files cannot carry loop markers' }; }
    const asset = files.length === 1 ? { file: files[0] } : { paths: files };
    asset.template = aaMeta.template;
    stats.templateCarried++;
    stats.files++;
    return { asset, how: 'files' };
  }

  /** the frozen table: the subset of the twin these paths need, metadata and all */
  function frozenTable() {
    const db = { _templates: JSON.parse(JSON.stringify(twin._templates ?? {})), aa: {} };
    for (const p of frozenPaths) {
      const parts = p.split('.').slice(2); // after fxstudio.aa
      let src = twin.aa, dst = db.aa;
      for (let i = 0; i < parts.length; i++) {
        const k = parts[i];
        if (!src || !(k in src)) break;
        for (const [mk, mv] of Object.entries(src)) if (mk.startsWith('_') && mk !== '_templates' && !(mk in dst)) dst[mk] = JSON.parse(JSON.stringify(mv));
        if (i === parts.length - 1) { dst[k] = JSON.parse(JSON.stringify(src[k])); break; }
        dst[k] ??= {};
        src = src[k]; dst = dst[k];
      }
    }
    const entries = leafPaths(db, 'fxstudio').size;
    return { db, entries, paths: [...frozenPaths].sort() };
  }

  /** the first raw file of an AA node in AA's own order (what AA called the true path: a shield's top half) */
  function firstFile(aaPath) {
    const node = nodeAt(twin, aaPath.replace(/^autoanimations\./, 'fxstudio.aa.'));
    const first = (o) => {
      if (typeof o === 'string') return o;
      if (Array.isArray(o)) return first(o[0]);
      if (o && typeof o === 'object') { const k = Object.keys(o).find((x) => !x.startsWith('_')); return k ? first(o[k]) : null; }
      return null;
    };
    return node === undefined ? null : first(node);
  }

  /**
   * A slashless value that names a real node in JB2A's own database is a PATH, not a file. AA let a
   * person type either into its custom-path box, so its rows hold both; carrying the string through
   * verbatim played correctly (Sequencer takes either) but told the screens it was a raw file —
   * no colour, no variants, no Asset Library. The value is unchanged; only the key it is written
   * under changes, and only when the library really holds it.
   */
  const isLibraryPath = (v) => typeof v === 'string' && !v.includes('/') && v.startsWith('jb2a.') && nodeAt(jb2a, v) !== undefined;

  return { assetFor, firstFile, isLibraryPath, stats, frozenTable, frozenPaths };
}
