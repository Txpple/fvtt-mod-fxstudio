// The Asset Library: the libraries' own registration browsed as the table sees it — JB2A by style,
// PSFX by group and sound — each with its variants stepped by arrows or a dropdown, the VFX playing
// on a loop and the SFX behind a Play button, the Sequencer path an FX names and the file under
// it. Two doors (ruled off prototypes/fxstudio4-library.html, 2026-09-06): the tab for browsing,
// and the same browser opened from a line of Create FX to pick that line's VFX or SFX. What the
// corpus already uses is marked and named, and the Used and Unused pills filter to either.
// THE TAB DOES NOT WRITE (the user, 2026-09-07: "remove the use button"). Browsing is browsing; the
// only Use left is the picker's, when the sheet's Browse sent you here for one scene's VFX or SFX.
// The list keeps its scroll through every step: the pane re-renders itself, never the window.
import { MODULE_ID } from '../settings.js';
import { assetsOf } from '../core/fx.js';
import { esc, idWords } from './html.js';
import { leaveSheet, openSheet } from './sheet.js';

const api = () => game.modules.get(MODULE_ID).api;
const FEET = /^\d+ft$/;
const words = (s) => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const LIB_WORDS = { jb2a: ['VFX · JB2A'], psfx: ['SFX · PSFX'] };

/** the Library's view state on the window; `pick` is set by the sheet: {i, slot: 'asset' | 'sound'} */
export function libraryState(app) {
  app.view.library ??= { lib: 'jb2a', q: '', only: null, sel: null, vi: 0, fi: null, pick: null };
  return app.view.library;
}

/** every path every FX names → the FX that name it: Map<lower path, [{id, name}]> */
function usedPaths(a) {
  const used = new Map();
  for (const { fx } of a.fx.list()) {
    if (fx.off) continue;
    const name = fx.for?.[0] ? idWords(fx.for[0].split(':').slice(1).join(':')) : idWords(fx.id);
    for (const scene of fx.scenes ?? []) {
      for (const { asset } of assetsOf(scene)) {
        const paths = typeof asset === 'string' ? [asset] : asset?.paths ?? (asset?.path ? [asset.path] : asset?.family ? [asset.family] : []);
        for (const p of paths) if (typeof p === 'string') (used.get(p.toLowerCase()) ?? used.set(p.toLowerCase(), []).get(p.toLowerCase())).push({ id: fx.id, name });
      }
    }
  }
  return used;
}

/**
 * The shelf: {jb2a: [family], psfx: [family], used}, a family being {id, name, group, variants:
 * [{label, path, file}], used}. Built once per window from Sequencer's database and dropped when
 * the FX change (Studio.refresh).
 */
export function shelf(app) {
  if (app._shelf) return app._shelf;
  const a = api();
  const db = a.assets.database();
  if (!db) return (app._shelf = { jb2a: [], psfx: [], used: new Map() });
  const used = usedPaths(a);
  const inUse = (f) => { const l = f.toLowerCase(); for (const u of used.keys()) if (u === l || u.startsWith(`${l}.`)) return true; return false; };
  const variants = (path) => {
    const out = [];
    const walk = (p, prefix, d) => {
      for (const k of db.children(p)) {
        const q = `${p}.${k}`;
        const kids = db.children(q);
        const files = db.files(q);
        const label = prefix ? `${prefix} ${k}` : k;
        if (kids.length && !FEET.test(kids[0]) && d < 2) walk(q, label, d + 1);
        else if (files.length) out.push({ label, path: q, file: files[0], files });
      }
    };
    walk(path, '', 0);
    if (!out.length && db.files(path).length) { const only = db.files(path); out.push({ label: '', path, file: only[0], files: only }); }
    return out;
  };
  const jb2a = db.children('jb2a').map((style) => { const id = `jb2a.${style}`; return { id, name: words(style), group: words(style)[0], variants: variants(id), used: inUse(id) }; });
  const psfx = db.children('psfx').flatMap((g) => db.children(`psfx.${g}`).map((n) => { const id = `psfx.${g}.${n}`; return { id, name: words(n), group: words(g), variants: variants(id), used: inUse(id) }; }));
  return (app._shelf = { jb2a, psfx, used });
}

/** the FX that name this family, by the exact path each names: Map<path, [{id, name}]> */
function usersOf(app, family) {
  const { used } = shelf(app);
  const f = family.toLowerCase();
  const out = new Map();
  for (const [path, list] of used) {
    if (path !== f && !path.startsWith(`${f}.`)) continue;
    const seen = new Set();
    const who = [];
    for (const u of list) { if (seen.has(u.id)) continue; seen.add(u.id); who.push(u); }
    out.set(path, who.sort((x, y) => x.name.localeCompare(y.name)));
  }
  return out;
}

/**
 * Where a library path sits in a family's variants: {vi, fi}. A path deeper than a variant (a
 * file index, a range key) selects that variant, and a file index is carried in fi; a path
 * shallower than any variant selects the first variant under it.
 */
function locate(it, path) {
  const p = String(path).toLowerCase();
  const at = (test) => it.variants.findIndex((x) => test(x.path.toLowerCase()));
  let vi = at((q) => q === p);
  if (vi >= 0) return { vi, fi: null };
  vi = at((q) => p.startsWith(`${q}.`));
  if (vi >= 0) {
    const rest = p.slice(it.variants[vi].path.length + 1);
    const n = Number(rest);
    return { vi, fi: /^[0-9]+$/.test(rest) && n < (it.variants[vi].files?.length ?? 0) ? n : null };
  }
  vi = at((q) => q.startsWith(`${p}.`));
  return { vi: vi >= 0 ? vi : 0, fi: null };
}

/** the family a library path belongs to: jb2a.<style>, psfx.<group>.<sound> */
const familyOfPath = (path) => { const p = String(path ?? '').split('.'); return p[0] === 'psfx' ? p.slice(0, 3).join('.') : p.slice(0, 2).join('.'); };

/**
 * Point the Library at one library path: its library, its family, its variant and, when the path
 * names one file inside a variant, that file. Any filter in the way is cleared. True when it was
 * found. The door the sheet, the used-in lines and Browse all come through.
 */
export function focusPath(app, path) {
  const L = libraryState(app);
  if (!path || String(path).includes('/')) return false;
  const lib = String(path).startsWith('psfx') ? 'psfx' : 'jb2a';
  const family = familyOfPath(path);
  const it = (shelf(app)[lib] ?? []).find((r) => r.id.toLowerCase() === family.toLowerCase());
  L.lib = lib;
  L.only = null;
  L.q = '';
  if (!it) return false;
  L.sel = it.id;
  const { vi, fi } = locate(it, path);
  L.vi = vi;
  L.fi = fi;
  return true;
}

const url = (file) => (globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(file) : `/${file}`);

/**
 * EVERYTHING THE STEPPER CAN STAND ON. A variant holding ONE file is one stop. A variant holding
 * SEVERAL is the variant itself — Sequencer picks one of them at random — AND each file, because an
 * FX can name either and the used-in list already names them apart. Without this the browser showed
 * "V1 · 1 of 1" over a sound with four files in it, three of which the corpus names by hand: the
 * user, 2026-09-07 — "i see multiple versions of the sound but only one in drop down".
 */
const stepsOf = (it) => (it?.variants ?? []).flatMap((v, vi) => {
  const base = words(v.label ?? '') || it.name;
  const many = (v.files?.length ?? 0) > 1;
  const head = { vi, fi: null, label: many ? `${base} · any of ${v.files.length}` : base, path: v.path };
  return many ? [head, ...v.files.map((_, fi) => ({ vi, fi, label: `${base} · file ${fi}`, path: `${v.path}.${fi}` }))] : [head];
});

// what is in the viewer: the variant, or one file inside it when a used line named that file
const viewPath = (L, v) => (v ? (L.fi == null ? v.path : `${v.path}.${L.fi}`) : '');
const viewFile = (L, v) => (v ? (L.fi == null ? v.file : (v.files?.[L.fi] ?? v.file)) : '');
const viewLabel = (L, v) => (v ? words(v.label ?? '') + (L.fi == null ? '' : `.${L.fi}`) : '');

function current(app) {
  const L = libraryState(app);
  const all = shelf(app)[L.lib] ?? [];
  const q = L.q.trim().toLowerCase();
  const rows = all.filter((it) => (!q || it.name.toLowerCase().includes(q) || it.id.includes(q)) && (!L.only || (L.only === 'used') === it.used));
  if (!rows.some((r) => r.id === L.sel)) { L.sel = rows[0]?.id ?? null; L.vi = 0; }
  const it = rows.find((r) => r.id === L.sel) ?? null;
  if (it && L.vi >= it.variants.length) { L.vi = 0; L.fi = null; }
  const v = it?.variants[L.vi] ?? null;
  if (L.fi != null && !((v?.files?.length ?? 0) > L.fi)) L.fi = null;
  const steps = stepsOf(it);
  const si = Math.max(0, steps.findIndex((x) => x.vi === L.vi && x.fi === L.fi));
  return { L, all, rows, it, v, steps, si };
}

/** move the viewer to one of the stops, by index */
const goStep = (L, steps, i) => { const x = steps[(i + steps.length) % steps.length]; if (!x) return; L.vi = x.vi; L.fi = x.fi; };

export function renderLibrary(app) {
  const { L, all, rows, it, v, steps, si } = current(app);
  const vPath = viewPath(L, v);
  const vFile = viewFile(L, v);
  // the caption says exactly what the stepper says it is standing on — one thing, one name
  const vLabel = steps[si]?.label ?? '';
  const groups = new Map();
  for (const r of rows) (groups.get(r.group) ?? groups.set(r.group, []).get(r.group)).push(r);
  const list = [...groups.entries()].map(([g, items]) => `<div class="letter">${esc(g)}</div>${items.map((r) => `<button type="button" class="row" data-act="lib-sel" data-id="${esc(r.id)}" aria-current="${r.id === L.sel}"><span class="dot ${r.used ? 'stock' : 'none'}"></span><span class="n">${esc(r.name)}</span><span class="c">${stepsOf(r).length}</span></button>`).join('')}`).join('');
  const pick = L.pick;
  const subjectName = app.sheet?.subject?.name ?? (app.sheet?.keys?.[0] ? idWords(app.sheet.keys[0].split(':').slice(1).join(':')) : 'the FX');
  const banner = pick ? `<div class="picking"><span><b>${pick.slot === 'sound' ? 'SFX' : 'VFX'}</b> ${pick.view ? 'in' : 'for'} <b>${esc(subjectName)}</b> · scene ${pick.i + 1}</span><span class="spacer"></span><button type="button" class="quiet" data-act="lib-pick-back">Back</button>${pick.view ? '' : `<button type="button" class="primary" data-act="lib-pick-use" ${v ? '' : 'disabled'}>Use</button>`}</div>` : '';
  let stage;
  if (!it) stage = '<div class="frame"><div class="name">No match</div></div>';
  else if (L.lib === 'jb2a') stage = `${vFile ? `<video class="stage-video" src="${esc(url(vFile))}" autoplay loop muted playsinline></video>` : ''}<div class="caption"><div class="name">${esc(it.name)}</div><div class="v">${esc(vLabel)}</div></div><span class="chip">loops</span>`;
  else stage = `<div class="frame sound"><button type="button" class="play" data-act="lib-play" aria-label="play">▶</button><div class="name">${esc(it.name)}</div><div class="v">${esc(vLabel)}</div></div>`;
  const arrows = it && steps.length > 1 ? `<button type="button" class="arrow l" data-act="lib-prev" aria-label="previous">‹</button><button type="button" class="arrow r" data-act="lib-next" aria-label="next">›</button>` : '';
  const readOnly = (cls, label, value) => `<div class="path"><label>${label}</label><div class="box"><input type="text" class="${cls}" value="${esc(value)}" readonly spellcheck="false" aria-label="${label}" data-tooltip="${esc(value)}"><button type="button" data-act="lib-copy" data-text="${esc(value)}">Copy</button></div></div>`;
  const paths = it ? `<div class="paths">
      ${readOnly('lib-dbpath', 'Sequencer path', vPath || it.id)}
      ${readOnly('lib-file', 'File', vFile)}
    </div>` : '';
  // Where it is used: one line per path an FX names, ANYWHERE UNDER THIS FAMILY — not only the
  // variant on screen, which is why the head now says so (the user, 2026-09-07: "the names here
  // don't tie out"). The line for what IS on screen is marked. A path is spelled here exactly as
  // the viewer spells it: `words()` alone kept the dots, so one thing read "V1 Group05" above and
  // "V1.Group05" below.
  let usedBy = '';
  const byPath = it ? usersOf(app, it.id) : new Map();
  const nUsers = [...byPath.values()].reduce((t, l) => t + l.length, 0);
  if (it) {
    const cur = vPath.toLowerCase();
    const label = (path) => {
      if (path === it.id.toLowerCase()) return 'Default';
      const exact = it.variants.find((x) => x.path.toLowerCase() === path);
      if (exact) return words(exact.label) || it.name;
      // deeper than a variant: the variant it sits in, then which file inside it
      const under = it.variants.find((x) => path.startsWith(`${x.path.toLowerCase()}.`));
      if (under) return `${words(under.label) || it.name} · file ${path.slice(under.path.length + 1)}`;
      return words(path.slice(it.id.length + 1).replace(/\./g, ' '));
    };
    usedBy = `<div class="uses lib-users"><div class="sub">${nUsers ? `Used in ${nUsers} FX · every path under ${esc(it.name)}` : `${esc(it.name)} is used by no FX`}</div>${[...byPath.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([path, list]) => `<div class="use" data-now="${path === cur}"><button type="button" class="v link" data-act="lib-goto" data-path="${esc(path)}" data-tooltip="Load ${esc(path)} above">${esc(label(path))}</button><span class="who">${list.map((u) => `<button type="button" class="link" data-act="lib-open-fx" data-id="${esc(u.id)}" data-tooltip="Open ${esc(u.name)} in the FX Editor">${esc(u.name)}</button>`).join(', ')}</span></div>`).join('')}</div>`;
  }
  // an FX counts towards a stop when it names THAT path exactly — the files are their own stops
  // now, so counting them under their variant too would say the same FX twice
  const inFx = (x) => { const n = (byPath.get(x.path.toLowerCase()) ?? []).length; return n ? ` · ${n} FX` : ''; };
  const stepper = it ? `<div class="stepper"><button type="button" data-act="lib-prev" aria-label="previous" ${steps.length > 1 ? '' : 'disabled'}>‹</button><select class="lib-variant" aria-label="variant">${steps.map((x, i) => `<option value="${i}"${i === si ? ' selected' : ''}>${esc(x.label)} · ${i + 1} of ${steps.length}${inFx(x)}</option>`).join('')}</select><button type="button" data-act="lib-next" aria-label="next" ${steps.length > 1 ? '' : 'disabled'}>›</button></div>` : '';
  return `${banner}<div class="lib">
    <div class="shelf">
      <div class="switch">${Object.entries(LIB_WORDS).map(([lib, [label]]) => `<button type="button" data-act="lib-switch" data-lib="${lib}" aria-pressed="${L.lib === lib}">${label}</button>`).join('')}</div>
      <input type="search" class="lib-q" placeholder="Search" aria-label="Search the library" autocomplete="off" value="${esc(L.q)}">
      <div class="pills"><button type="button" class="pill lib-used" data-act="lib-only" data-only="used" aria-pressed="${L.only === 'used'}"><span class="dot stock"></span>Used · ${all.filter((r) => r.used).length}</button><button type="button" class="pill lib-unused" data-act="lib-only" data-only="unused" aria-pressed="${L.only === 'unused'}"><span class="dot none"></span>Unused · ${all.filter((r) => !r.used).length}</button></div>
      <div class="list">${list || '<p class="note" style="padding:10px 12px">No match.</p>'}</div>
    </div>
    <div class="card viewer">
      <div class="stage${L.lib === 'psfx' ? ' is-sound' : ''}">${arrows}${stage}</div>
      ${stepper}${paths}${usedBy}
    </div>
  </div>`;
}

/** re-render the pane alone, keeping the list where it was scrolled */
function rerender(app) {
  const pane = app.element?.querySelector('[data-pane="assets"]');
  if (!pane) return app.render();
  const list = pane.querySelector('.shelf .list');
  const top = list?.scrollTop ?? 0;
  pane.innerHTML = renderLibrary(app);
  const again = pane.querySelector('.shelf .list');
  if (again) again.scrollTop = top;
  return undefined;
}

async function playSound(app, file) {
  if (!file) return app.toast('No file to play.');
  try {
    app._librarySound?.stop?.();
    const src = url(file);
    const AH = globalThis.foundry?.audio?.AudioHelper ?? globalThis.AudioHelper;
    app._librarySound = await AH.play({ src, volume: 0.8, loop: false }, false);
  } catch (e) { app.toast(`Could not play it: ${e.message}`); }
}

/** the sheet's scene takes what is in the viewer: its VFX, or its SFX */
function applyPick(app, pick, path) {
  const x = app.sheet?.scenes?.[pick.i];
  if (!x || !path) return false;
  if (pick.slot === 'sound') { if (x.scene.shape === 'sound') x.scene.asset = { path }; else x.scene.sound = { ...(x.scene.sound ?? {}), asset: path }; }
  else x.scene.asset = { path };
  return true;
}

export async function onLibraryClick(app, b, act) {
  const { L, it, v, steps, si } = current(app);
  switch (act) {
    case 'lib-switch': L.lib = b.dataset.lib; L.sel = null; L.vi = 0; L.fi = null; return rerender(app);
    case 'lib-sel': L.sel = b.dataset.id; L.vi = 0; L.fi = null; return rerender(app);
    case 'lib-prev': goStep(L, steps, si - 1); return rerender(app);
    case 'lib-next': goStep(L, steps, si + 1); return rerender(app);
    case 'lib-goto': focusPath(app, b.dataset.path); return rerender(app);
    case 'lib-only': L.only = L.only === b.dataset.only ? null : b.dataset.only; L.sel = null; L.fi = null; return rerender(app);
    case 'lib-play': return playSound(app, viewFile(L, v));
    case 'lib-copy': { try { await (game.clipboard?.copyPlainText ? game.clipboard.copyPlainText(b.dataset.text) : navigator.clipboard.writeText(b.dataset.text)); app.toast('Copied.'); } catch { app.toast('Could not copy.'); } return undefined; }
    case 'lib-open-fx': { if (!(await leaveSheet(app))) return undefined; openSheet(app, { id: b.dataset.id }); return app.render(); }
    case 'lib-pick-use': { const pick = L.pick; if (pick && applyPick(app, pick, viewPath(L, v))) { L.pick = null; app.view.tab = 'editor'; app.toast(`Scene ${pick.i + 1}: ${it.name}${viewLabel(L, v) ? ` ${viewLabel(L, v)}` : ''}.`); } return app.render(); }
    case 'lib-pick-back': L.pick = null; app.view.tab = 'editor'; return app.render();
    case 'lib-open-unused': L.only = 'unused'; L.sel = null; app.view.tab = 'assets'; return app.render();
    default: return undefined;
  }
}

export function onLibraryInput(app, el) {
  const L = libraryState(app);
  if (!el.classList.contains('lib-q')) return undefined;
  L.q = el.value;
  clearTimeout(app._libTimer);
  app._libTimer = setTimeout(() => {
    rerender(app);
    const q = app.element?.querySelector('.lib-q');
    q?.focus();
    q?.setSelectionRange(q.value.length, q.value.length);
  }, 200);
  return undefined;
}

export function onLibraryChange(app, el) {
  const { L, steps } = current(app);
  if (el.classList.contains('lib-variant')) { goStep(L, steps, Number(el.value)); return rerender(app); }
  return undefined;
}

/** the sheet opens the Library to pick a scene's VFX or SFX, on what the scene names already */
export function openPicker(app, i, slot, path = null, view = false) {
  const L = libraryState(app);
  L.pick = { i, slot, view };
  L.lib = slot === 'sound' ? 'psfx' : 'jb2a';
  L.only = null;
  L.q = '';
  L.sel = null;
  L.vi = 0;
  L.fi = null;
  if (path) focusPath(app, path);
  app.view.tab = 'assets';
}
