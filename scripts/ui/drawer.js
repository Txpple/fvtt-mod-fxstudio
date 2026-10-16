// The drawer: a picture or a sound picked into ONE scene, in place, under its cell in the inspector
// (DESIGN §28.3). It is the Assets tab's search (families by name, and by the full library path),
// its family list, its variant stepper and its sound ▶ — and nothing else: no video, since the
// sheet loads no picture (§27). A pick writes into the scene the drawer was opened on and no other,
// and only while that sheet is the one open: the drawer lives on the sheet, so a tab switch, another
// FX or Cancel takes it away with the sheet.
//
// WHAT A PICK KEEPS. Within the family the scene already names, a pick keeps what the scene
// carries: a random set ({paths}) or the three pictures by position ({byPosition}) take the picked
// colour across every member, and the template's stretch metadata stays. A picture of another
// family replaces the asset whole, since a set, a triple or a stretch belongs to the file it was
// made for.
import { MODULE_ID } from '../settings.js';
import { esc } from './html.js';
import { familyFor, familyOfPath, locate, playSound, shelf, stepsOf } from './library.js';

const api = () => game.modules.get(MODULE_ID).api;
const MEMBERS = ['center', 'mid', 'left'];

/** an asset as an object: a bare string is a library path, or a file when it has a slash */
const asObject = (a) => (typeof a === 'string' ? (a.includes('/') ? { file: a } : { path: a }) : a ?? null);
const pathOf = (a) => { const o = asObject(a); return o?.path ?? (typeof o?.file === 'string' && !o.file.includes('/') ? o.file : null); };

/** the asset one slot of a scene names */
export function slotAsset(scene, slot) {
  if (!scene) return null;
  if (slot === 'sound') return scene.shape === 'sound' ? scene.asset : scene.sound?.asset ?? null;
  if (slot === 'thrown') return scene.thrown?.asset ?? null;
  if (slot === 'return') return scene.return?.asset ?? null;
  return scene.asset ?? null;
}

/** the one library path a slot stands on: its path, the first of a random set, the middle of a triple */
export function slotPath(scene, slot) {
  const a = asObject(slotAsset(scene, slot));
  if (!a) return null;
  if (a.paths) return a.paths[0] ?? null;
  if (a.byPosition) return pathOf(a.byPosition.center);
  if (a.family) return [a.family, a.variant, a.colour].filter(Boolean).join('.');
  return pathOf(a);
}

/** Browse: the drawer opens under the cell on what the scene names; Browse again closes it */
export function openDrawer(app, i, slot) {
  const s = app.sheet;
  if (s.drawer && s.drawer.i === i && s.drawer.slot === slot) { s.drawer = null; return; }
  const path = slotPath(s.scenes[i]?.scene, slot);
  const it = path ? familyFor(app, path) : null;
  let si = 0;
  if (it) { const { vi, fi } = locate(it, path); si = Math.max(0, stepsOf(it).findIndex((x) => x.vi === vi && x.fi === fi)); }
  s.drawer = { i, slot, q: it ? it.name : '', sel: it?.id ?? null, si };
}

/** the families the drawer's box finds: by name first, then every family whose full path holds the words */
function hits(app, d) {
  const lib = d.slot === 'sound' ? 'psfx' : 'jb2a';
  const all = shelf(app)[lib] ?? [];
  const flat = (t) => String(t).toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const q = flat(d.q);
  if (!q) return all.slice(0, 40);
  const byName = all.filter((it) => flat(`${it.id} ${it.group} ${it.name}`).includes(q));
  const ids = new Set(byName.map((it) => it.id.toLowerCase()));
  const byPath = [];
  for (const h of api().assets.search(q, { roots: [lib], limit: 60 })) {
    const fam = familyOfPath(h.path).toLowerCase();
    if (ids.has(fam)) continue;
    const it = all.find((x) => x.id.toLowerCase() === fam);
    if (!it) continue;
    ids.add(fam);
    byPath.push(it);
  }
  return [...byName, ...byPath].slice(0, 40);
}

/** the drawer itself, drawn inside the inspector under the cell it picks for */
export function drawerHtml(app) {
  const s = app.sheet;
  const d = s.drawer;
  if (!d) return '';
  const what = d.slot === 'sound' ? 'a sound' : 'a picture';
  const list = hits(app, d);
  const it = d.sel ? (shelf(app)[d.slot === 'sound' ? 'psfx' : 'jb2a'] ?? []).find((x) => x.id === d.sel) ?? null : null;
  const steps = stepsOf(it);
  const step = steps[Math.min(d.si, Math.max(0, steps.length - 1))] ?? null;
  const rows = list.map((x) => `<button type="button" class="hit" data-act="dr-sel" data-id="${esc(x.id)}" aria-pressed="${x.id === d.sel}"><span class="dot ${x.used ? 'stock' : 'none'}"></span><span class="w">${esc(x.name)}</span><span class="o">${esc(x.group)} · ${stepsOf(x).length}</span></button>`).join('') || '<p class="note">No family of that name or path.</p>';
  const stepper = it ? `<div class="stepper"><button type="button" data-act="dr-prev" aria-label="previous" ${steps.length > 1 ? '' : 'disabled'}>‹</button><select class="dr-step" data-field="dr-step" aria-label="variant">${steps.map((x, k) => `<option value="${k}"${k === d.si ? ' selected' : ''}>${esc(x.label)} · ${k + 1} of ${steps.length}</option>`).join('')}</select><button type="button" data-act="dr-next" aria-label="next" ${steps.length > 1 ? '' : 'disabled'}>›</button></div>` : '';
  const play = d.slot === 'sound' && step ? `<button type="button" class="quiet play" data-act="dr-play" aria-label="Play the sound" data-tooltip="Play this sound once. Nothing is saved.">▶</button>` : '';
  return `<div class="drawer" data-slot="${d.slot}">
    <div class="dhead"><span class="sub">Pick ${what} into scene ${d.i + 1}</span><span class="note">Within the same family the scene keeps its random set, its three by position and its stretch.</span><button type="button" class="quiet" data-act="dr-close">Done</button></div>
    <input type="search" class="dr-q" data-field="dr-q" placeholder="Search the libraries by name or path" aria-label="Search the libraries" autocomplete="off" value="${esc(d.q)}">
    <div class="dlist">${rows}</div>
    ${stepper}
    <div class="dfoot">${play}<code class="dpath">${esc(step?.path ?? '')}</code><button type="button" class="primary" data-act="dr-use" ${step ? '' : 'disabled'}>Use in scene ${d.i + 1}</button></div>
  </div>`;
}

/**
 * The members of a set or a triple with the picked path's own words swapped in where the members
 * agree (the colour of a set numbered 01 to 04), or null when the pick cannot be laid over them.
 */
function swapped(members, pick) {
  const P = pick.split('.');
  const M = members.map((m) => String(m ?? '').split('.'));
  if (M.some((m) => m.length !== P.length)) return null;
  const rep = M[0];
  const out = M.map((m) => m.map((seg, k) => (P[k] !== rep[k] && M.every((x) => x[k] === rep[k]) ? P[k] : seg)).join('.'));
  const db = api().assets.database();
  if (db && out.some((p) => !db.exists(p))) return null;
  return out;
}

/** the asset after a pick: {asset, kept} — `kept` names what of the old one stayed, or null when it was replaced whole */
export function picked(old, pick) {
  const a = asObject(old);
  const fam = (p) => familyOfPath(p).toLowerCase();
  const same = (p) => !!p && fam(p) === fam(pick);
  const whole = typeof old === 'string' ? pick : { path: pick };
  if (!a) return { asset: whole, kept: null };
  const first = a.paths ? a.paths[0] : a.byPosition ? pathOf(a.byPosition.center) : pathOf(a);
  if (!same(first)) return { asset: whole, kept: null };
  if (a.paths) {
    const set = swapped(a.paths, pick);
    if (set) return { asset: { ...a, paths: set }, kept: 'set' };
  }
  if (a.byPosition) {
    const three = swapped(MEMBERS.map((k) => pathOf(a.byPosition[k])), pick);
    if (three) {
      const byPosition = {};
      MEMBERS.forEach((k, n) => { byPosition[k] = typeof a.byPosition[k] === 'string' ? three[n] : { ...asObject(a.byPosition[k]), path: three[n] }; });
      return { asset: { ...a, byPosition }, kept: 'triple' };
    }
  }
  // one path of the family, or a set the pick cannot be laid over: the path is the pick, the stretch stays
  if (typeof old === 'string') return { asset: pick, kept: null };
  const rest = { ...a };
  for (const k of ['path', 'paths', 'byPosition', 'file', 'family', 'variant', 'colour']) delete rest[k];
  const lost = a.paths ? 'set' : a.byPosition ? 'triple' : null;
  return { asset: { ...rest, path: pick }, kept: a.template ? 'template' : null, lost };
}

const KEPT_WORDS = { set: 'its random set is kept, in the new colour', triple: 'its three pictures by position are kept, in the new colour', template: 'its stretch metadata is kept' };
const LOST_WORDS = { set: 'its random set has no member of that kind, so the scene now plays this one picture', triple: 'its three pictures by position have no match of that kind, so the scene now plays this one picture' };

/** a pick written into the scene the drawer is on, and no other */
function use(app) {
  const s = app.sheet;
  const d = s.drawer;
  const x = s.scenes[d.i];
  if (!x || !s.edit) return null;
  const it = (shelf(app)[d.slot === 'sound' ? 'psfx' : 'jb2a'] ?? []).find((f) => f.id === d.sel);
  const step = stepsOf(it)[d.si];
  if (!step) return null;
  const scene = x.scene;
  const r = picked(slotAsset(scene, d.slot), step.path);
  if (d.slot === 'sound') { if (scene.shape === 'sound') scene.asset = r.asset; else scene.sound = { ...(scene.sound ?? {}), asset: r.asset }; }
  else scene.asset = r.asset;
  s.drawer = null;
  const said = [r.kept ? KEPT_WORDS[r.kept] : '', r.lost ? LOST_WORDS[r.lost] : ''].filter(Boolean).join('; ');
  return `Scene ${d.i + 1}: ${it.name} ${step.label}${said ? `; ${said}` : ''}.`;
}

/** the drawer's acts; true when the inspector needs painting */
export async function onDrawerClick(app, b, act) {
  const s = app.sheet;
  const d = s?.drawer;
  if (!d) return false;
  const it = d.sel ? (shelf(app)[d.slot === 'sound' ? 'psfx' : 'jb2a'] ?? []).find((x) => x.id === d.sel) : null;
  const steps = stepsOf(it);
  switch (act) {
    case 'dr-close': s.drawer = null; return true;
    case 'dr-sel': d.sel = b.dataset.id; d.si = 0; return true;
    case 'dr-prev': d.si = steps.length ? (d.si - 1 + steps.length) % steps.length : 0; return true;
    case 'dr-next': d.si = steps.length ? (d.si + 1) % steps.length : 0; return true;
    case 'dr-play': await playSound(app, steps[d.si]?.file); return false;
    case 'dr-use': { const said = use(app); if (said) app.toast(said); return 'scene'; }
    default: return false;
  }
}

export function onDrawerInput(app, el) {
  const d = app.sheet?.drawer;
  if (!d) return false;
  d.q = el.value;
  return true;
}

export function onDrawerChange(app, el) {
  const d = app.sheet?.drawer;
  if (!d) return false;
  d.si = Number(el.value) || 0;
  return true;
}
