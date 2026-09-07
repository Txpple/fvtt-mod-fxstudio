// Assets: a scene's {path | paths | file | family+colour} against the libraries' own registration
// (Sequencer's database at the table; the same registration files offline through the tools'
// database shim). Answers "what plays", "does this exist", "which colours does this family have", and
// swaps a colour in when an asset names one. Nothing here knows Automated Animations' table.
//
// The database is reached through one small interface so the tools can hand in the registration
// files and the module hands in Sequencer.Database:
//   db.exists(path) → boolean · db.children(path) → [keys] · db.files(path) → [file paths]

const FEET = /^\d+ft$/;

/** the database in use: Sequencer's at the table, whatever the tools set offline */
let db = null;
export function useDatabase(d) { db = d; }
export function database() {
  if (db) return db;
  const S = globalThis.Sequencer?.Database;
  if (!S) return null;
  db = {
    exists: (path) => { try { return S.entryExists(path); } catch { return false; } },
    children: (path) => { try { return (S.getPathsUnder(path) ?? []).filter((k) => !k.startsWith('_')); } catch { return []; } },
    files: (path) => { try { const e = S.getEntry(path); const list = Array.isArray(e) ? e : [e]; return list.flatMap((x) => (x?.getAllFiles ? x.getAllFiles() : [])); } catch { return []; } },
  };
  return db;
}

export const isDbPath = (p) => typeof p === 'string' && !p.includes('/') && /^[a-z0-9_-]+\./i.test(p);

/** an asset as an object: a bare string is a path (or a file when it has a slash) */
export function normalise(asset) {
  if (!asset) return null;
  if (typeof asset === 'string') return asset.includes('/') ? { file: asset } : { path: asset };
  return asset;
}

/** the library path an asset names before any colour swap: family[.variant][.colour] or path */
export function basePath(asset) {
  const a = normalise(asset);
  if (!a) return null;
  if (a.path) return a.path;
  if (a.family) return [a.family, a.variant, a.colour].filter(Boolean).join('.');
  return null;
}

/** the family of a path: everything but a trailing colour segment (a key its parent lists beside other colours) */
export function familyOf(path) {
  if (!isDbPath(path)) return path;
  const parts = path.split('.');
  return parts.length > 2 ? parts.slice(0, -1).join('.') : path;
}

/** the colours a family offers: its child keys that lead to files, minus range keys */
export function coloursOf(family) {
  const d = database();
  if (!d || !family) return [];
  return d.children(family).filter((k) => !FEET.test(k) && !/^\d+$/.test(k));
}

/**
 * The same asset with a colour swapped in: the last segment of the path is replaced when the family
 * lists that colour; otherwise the asset is returned unchanged with `problem` set.
 */
export function recoloured(asset, colour) {
  const a = normalise(asset);
  if (!a || !colour) return a;
  const path = basePath(a);
  if (!path) return { ...a, problem: 'a raw file has no colours to swap' };
  const family = familyOf(path);
  const swapped = `${family}.${colour}`;
  const d = database();
  if (d && !d.exists(swapped)) return { ...a, problem: `${family} has no "${colour}" (it has ${coloursOf(family).join(', ') || 'no colours'})` };
  return { ...a, path: swapped, family: undefined, variant: undefined, colour };
}

/**
 * What a scene's asset resolves to for the engine: {path | paths | file, template?} and whether it exists.
 * A `colour` on the asset swaps it in first.
 */
export function resolveAsset(asset) {
  let a = normalise(asset);
  if (!a) return { missing: true, why: 'no asset' };
  if (a.byPosition) return resolveAsset(a.byPosition.center);
  if (a.colour && (a.path || a.family)) {
    const base = basePath(a);
    if (a.family || (a.path && !a.path.endsWith(`.${a.colour}`))) {
      const r = recoloured({ path: a.family ? base : a.path }, a.colour);
      if (r.problem) return { missing: true, why: r.problem, path: base };
      a = { ...a, path: r.path };
    }
  }
  const d = database();
  const out = { template: a.template ?? null };
  if (a.file) { out.file = a.file; out.play = a.file; out.missing = false; return out; }
  if (a.paths) {
    out.paths = a.paths;
    out.play = a.paths;
    // library paths are checked against the registration; raw files are the server's to serve (check-fx checks the disk)
    const gone = d ? a.paths.filter((p) => isDbPath(p) && !d.exists(p)) : [];
    if (gone.length) { out.missing = true; out.why = `${gone.join(', ')} not in the libraries`; }
    return out;
  }
  const path = a.path ?? basePath(a);
  out.path = path;
  out.play = path;
  if (d && !d.exists(path)) { out.missing = true; out.why = `${path} is not in the libraries`; }
  return out;
}

/** the first raw file behind a path (a shield's top half; the bottom is the same file named Below) */
export function firstFile(path) {
  if (!path) return null;
  if (path.includes('/')) return path;
  const d = database();
  return d?.files(path)?.[0] ?? null;
}

/** the catalogue: search the libraries for a word ("misty step") → families with their colours */
export function search(word, { roots = ['jb2a', 'psfx'], limit = 50 } = {}) {
  const d = database();
  if (!d) return [];
  const needle = String(word ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const out = [];
  const walk = (path, depth) => {
    if (out.length >= limit || depth > 6) return;
    for (const k of d.children(path)) {
      const p = `${path}.${k}`;
      if (p.toLowerCase().includes(needle)) { out.push({ path: p, colours: coloursOf(p) }); if (out.length >= limit) return; }
      else walk(p, depth + 1);
    }
  };
  for (const r of roots) walk(r, 0);
  return out;
}
