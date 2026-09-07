// The Create-a-fx walk (DESIGN §8, ruled 2026-09-06 off prototypes/fxstudio3-create.html): five
// steps — for what, start from, the FX, when it plays, save to — built on the API. The draft is
// a plain fx in the grammar (core/fx.js); every step reads it back as the sentence; nothing is
// parsed from words. "Duplicate an existing fx", "a starter" and "from scratch" are three ways to
// seed the scenes and nothing more: after that the walk is the same for every FX.
import { MODULE_ID } from '../settings.js';
import { keyWords, parseKey, slug } from '../core/subjects.js';
import { PLACES, PLACE_WORDS, pathWords, sceneWords, withDefaults } from '../core/fx.js';
import { ON_WORDS, colourWords, dot, esc, idWords, statusOf } from './html.js';
import { openPicker } from './library.js';

const api = () => game.modules.get(MODULE_ID).api;
export const STEPS = ['For what', 'Start from', 'The FX', 'When it plays'];
const KIND_WORDS = { spell: 'a spell', weapon: 'a weapon', feature: 'a feature', item: 'an item', effect: 'an effect' };
const SCALES = [[0.5, 'half size'], [0.75, 'a little smaller'], [1, 'as it comes'], [1.5, 'a little bigger'], [2, 'twice the size']];
const STARTER_OF_SHAPE = { strike: 'starter:swing', shoot: 'starter:bolt', mark: 'starter:mark', fill: 'starter:fill', aura: 'starter:aura', beam: 'starter:beam', move: 'starter:teleport', sound: 'starter:sound' };
const SHAPE_WORDS = { strike: 'a swing', shoot: 'a bolt', mark: 'a mark', fill: 'a fill', aura: 'an aura', beam: 'a beam', move: 'a move', sound: 'a sound' };
/** what each shape does, in a sentence: the tooltip on its pill and the legend under them */
const SHAPE_HELP = {
  strike: 'A swing: a melee attack played on the target, like a sword arc. For weapons and claws.',
  shoot: 'A bolt: something flies from the caster to each target. Fire Bolt, an arrow, Guiding Bolt.',
  mark: 'A mark: a VFX placed on one spot or one token, once. A burst on the caster, a glyph on the target.',
  fill: 'A fill: the whole area of a placed template is covered, for as long as it stands. Fireball, Web, Grease.',
  aura: 'An aura: a VFX that stays around a token and moves with it until the effect ends. Shield of Faith, Spirit Guardians.',
  beam: 'A beam: a line held from the caster to the target while it lasts. Lightning Bolt, a ray.',
  move: 'A move: the caster fades and reappears at the chosen spot. Misty Step and every teleport.',
  sound: 'A sound: an SFX on its own, with no VFX. Use it for a scene that is only heard.',
};
const OUTCOMES = ['on a hit', 'on a miss', 'on a failed save', 'when damage lands'];
const canMiss = (scene) => ['strike', 'shoot', 'mark'].includes(scene.shape);
const hasPicture = (scene) => !['sound', 'move', 'custom'].includes(scene.shape);
const clone = (v) => JSON.parse(JSON.stringify(v));
const round = (n) => Math.round(n * 100) / 100;

/** the key a subject answers by: its first bare key */
export const bareKey = (subject) => subject?.keys?.find((k) => !k.includes('/')) ?? subject?.keys?.[0] ?? null;

/**
 * Start a walk on the window: {subject, from: an FX id to duplicate, fxId: an FX to edit (its
 * subject found from its first key)}. With a subject and an FX to start from, it opens on step 3.
 */
export function startWalk(app, { subject = null, from = null, fxId = null, scenes = null } = {}) {
  const a = api();
  const w = { step: 1, subject: null, start: null, from: null, scenes: [], on: 'use', onMiss: 'play', key: null, onlyThis: false, note: '', finding: null };
  if (fxId && a.fx.get(fxId)) { w.subject = subject ?? app.subjectForFx(fxId); w.start = 'dup'; w.from = fxId; }
  else { w.subject = subject; if (from) { w.start = 'dup'; w.from = from; } }
  if (w.subject) {
    setSubject(w, w.subject);
    w.onlyThis = !!w.subject.pointer && w.from === w.subject.pointer;
    w.step = w.start ? 3 : 2;
  }
  if (w.step === 3) seed(w);
  if (scenes?.length) { w.start = 'scratch'; w.from = null; w.scenes = scenes.map((scene) => ({ scene: clone(scene), scale: 1 })); }
  app.walk = w;
  app.view.tab = 'create';
  return w;
}

function setSubject(w, subject) {
  w.subject = subject;
  w.key = bareKey(subject);
  w.on = subject?.on ?? 'use';
  if (!w.key) w.onlyThis = false;
}

/** the scenes the walk begins with: a copy of the FX or starter it starts from; nothing from scratch */
function seed(w) {
  w.scenes = [];
  if (!w.from || w.start === 'scratch') return;
  try {
    const ex = api().fx.expand({ id: 'draft', like: w.from });
    w.scenes = (ex.scenes ?? []).map((scene) => ({ scene: clone(scene), scale: 1 }));
    if (w.scenes.some((x) => canMiss(x.scene) && withDefaults(x.scene).onMiss === 'skip')) w.onMiss = 'skip';
  } catch { w.scenes = []; }
}

const ready = (w, n) => [!!w.subject, !!w.start && (w.start === 'scratch' || !!w.from), w.scenes.length > 0, true][n - 1];

/** the FX the walk describes, ready to validate or save */
export function draftFx(app) {
  const a = api();
  const w = app.walk;
  const s = w.subject;
  const p = parseKey(w.key ?? '');
  const owner = s?.actor?.name ?? s?.owner ?? null;
  const baseId = p?.id ?? slug(s?.name ?? '') ?? '';
  let id = w.onlyThis ? `${baseId}-${slug(owner ?? 'this')}` : baseId || 'fx';
  if (!w.onlyThis && w.key) {
    const existing = a.fx.get(id);
    if (existing && !(existing.original?.for ?? []).includes(w.key)) id = `${p?.kind ?? 'fx'}-${id}`;
  }
  const again = w.onlyThis || !w.key ? null : a.fx.get(id);
  const keys = w.onlyThis || !w.key ? [] : [...new Set([...(again?.original?.for ?? []), w.key])];
  const scenes = w.scenes.map(({ scene, scale }) => {
    const out = clone(scene);
    if (scale !== 1) {
      const size = clone(withDefaults(scene).size ?? null);
      if (size) {
        for (const k of ['tokenWidths', 'radius', 'squares']) if (size[k] !== undefined) size[k] = round(size[k] * scale);
        if (size.fit) size.scale = typeof size.scale === 'number' ? round(size.scale * scale) : { x: round((size.scale?.x ?? 1) * scale), y: round((size.scale?.y ?? 1) * scale) };
        out.size = size;
      }
    }
    if (canMiss(scene)) { if (w.onMiss === 'skip') out.onMiss = 'skip'; else if (out.onMiss === 'skip') delete out.onMiss; }
    return out;
  });
  const note = w.note.trim() || (w.start === 'dup' && w.from ? `like ${idWords(w.from)}` : w.start === 'starter' ? `from the starter ${idWords(w.from)}` : 'from scratch');
  return { id, for: keys, on: w.on, scenes, note };
}

function sentenceOf(app) {
  const a = api();
  try {
    const fx = draftFx(app);
    const problems = a.fx.validate(fx);
    if (problems.length) return `<span class="bad">${esc(problems[0])}</span>`;
    return `<b>${esc(a.fx.sentence(fx, { name: app.walk.subject?.name ?? undefined }))}</b>`;
  } catch (e) { return `<span class="bad">${esc(e.message)}</span>`; }
}

// -----------------------------------------------------------------------------------------------
// rendering
// -----------------------------------------------------------------------------------------------
export function renderCreate(app) {
  const w = app.walk ?? startWalk(app);
  const bar = STEPS.map((t, i) => { const n = i + 1; const st = n === w.step ? 'now' : n < w.step ? 'done' : 'todo'; return `<button type="button" class="step" data-state="${st}" data-act="cw-step" data-step="${n}" ${st === 'todo' ? 'disabled' : ''}><span class="k">${n}</span>${t}</button>`; }).join('');
  const body = [step1, step2, step3, step4][w.step - 1](app, w);
  const nav = `<div class="nav">${w.step > 1 ? '<button type="button" data-act="cw-back">Back</button>' : '<button type="button" class="quiet" data-act="cw-cancel">Cancel</button>'}<span class="spacer"></span>${w.step < 4 ? `<button type="button" class="primary" data-act="cw-next" ${ready(w, w.step) ? '' : 'disabled'}>Next</button>` : '<button type="button" class="primary" data-act="cw-save">Save</button>'}</div>`;
  return `<div class="steps">${bar}</div><div class="card walk">${body}${nav}</div>`;
}

function step1(app, w) {
  const s = w.subject;
  let hint = '';
  if (s) {
    const r = app.answerFor(s);
    const has = r?.fx ? `already has an FX (<b>${esc(idWords(r.original?.id ?? r.fx.id))}</b>, ${r.source === 'baseline' ? 'in the corpus' : 'custom'}); the new one replaces it for ${esc(s.name)}` : `${dot('none')}plays nothing yet`;
    hint = `<div class="hint"><span><b>${esc(s.name)}</b> · ${has}</span></div>`;
  }
  const kinds = s?.isNew ? `<div class="pills" style="margin-top:10px"><span class="lbl">it is</span>${Object.entries(KIND_WORDS).map(([k, wd]) => `<button type="button" class="pill" aria-pressed="${s.kind === k}" data-act="cw-kind" data-kind="${k}">${wd}</button>`).join('')}</div>` : '';
  return `<h3>What is this FX for?</h3><p class="note lead">An ability on a sheet, or one the corpus has never heard of yet.</p>
    <div class="search"><input type="search" class="fx-q cw-q" placeholder="Type an ability… Fire Bolt, Goldthorn, Second Wind" aria-label="What is this FX for" autocomplete="off" value="${esc(s?.name ?? '')}"><div class="suggest" data-open="false"></div></div>
    ${hint}${kinds}`;
}

function step2(app, w) {
  const a = api();
  const s = w.subject;
  const r = app.answerFor(s);
  const choice = (id, title, sub) => `<button type="button" class="choice" aria-pressed="${w.start === id}" data-act="cw-start" data-start="${id}"><b>${title}</b><span>${sub}</span></button>`;
  const dup = w.start === 'dup' ? `<div class="field search"><label>Which fx?</label><input type="text" class="cw-like" value="${esc(w.from ? idWords(w.from) : '')}" placeholder="an FX… Misty Step, Fire Bolt" autocomplete="off"><div class="suggest" data-open="false"></div></div>` : '';
  const starters = w.start === 'starter' ? `<div class="pills" style="margin-top:12px"><span class="lbl">which one?</span>${a.fx.starters().map((st) => `<button type="button" class="pill" aria-pressed="${w.from === st.id}" data-act="cw-from" data-id="${esc(st.id)}" title="${esc(st.note ?? '')}">${esc(idWords(st.id))}</button>`).join('')}</div>${w.from?.startsWith('starter:') ? `<p class="note" style="margin-top:6px">${esc(a.index.starters.get(w.from)?.note ?? '')}</p>` : ''}` : '';
  return `<h3>Start from</h3><p class="note lead">${r?.fx ? `${esc(s.name)} already has an FX. Duplicate it and change what you like, or start elsewhere.` : 'Most fx are a small change to one that exists.'}</p>
    <div class="choices">
      ${choice('dup', 'Duplicate an existing fx', 'Pick any FX in the corpus and work from there. Misty Step but black is two clicks.')}
      ${choice('starter', 'A starter', 'One plain shape — a bolt, a swing, a mark, an aura — with its colours and a sound to choose.')}
      ${choice('scratch', 'From scratch', 'An empty fx. Add scenes one at a time: what plays, where, how big, with what sound.')}
    </div>${dup}${starters}`;
}

const placeOptions = (current) => PLACES.filter((p) => !['impact', 'area'].includes(p) || p === current).map((p) => `<option value="${p}"${p === current ? ' selected' : ''}>${esc(PLACE_WORDS[p])}</option>`).join('');

function sceneRow(app, w, { scene, scale }, i) {
  const a = api();
  const s = withDefaults(scene);
  const knobs = [];
  if (hasPicture(scene)) {
    const res = a.assets.resolve(scene.asset);
    const path = res.path ?? '';
    const family = path ? a.assets.familyOf(path) : null;
    const colours = family ? a.assets.colours(family) : [];
    const worn = path.split('.').pop();
    const colour = colours.includes(worn) ? worn : '';
    knobs.push(`<span class="search"><input type="text" class="cw-asset" data-i="${i}" value="${esc(pathWords(family ?? path) || (scene.asset?.file ? scene.asset.file.split('/').pop() : ''))}" placeholder="a picture… fire bolt, healing, mist" aria-label="picture" autocomplete="off"><div class="suggest" data-open="false"></div></span>`);
    knobs.push(`<button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="asset" title="browse the pictures">browse…</button>`);
    knobs.push(`<select class="cw-colour" data-i="${i}" aria-label="colour" ${colours.length ? '' : 'disabled'}>${colours.length ? colours.map((c) => `<option value="${esc(c)}"${c === colour ? ' selected' : ''}>${esc(colourWords(c))}</option>`).join('') : '<option value="">one colour</option>'}</select>`);
  }
  if (scene.shape === 'sound') {
    const res = a.assets.resolve(scene.asset);
    knobs.push(`<span class="search"><input type="text" class="cw-sound-q" data-i="${i}" value="${esc(pathWords(res.path ?? ''))}" placeholder="fire, sword, heal, teleport…" aria-label="sound" autocomplete="off"><div class="suggest" data-open="false"></div></span>`);
    knobs.push(`<button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="sound" title="browse the sounds">browse…</button>`);
  }
  if (['strike', 'shoot', 'beam'].includes(scene.shape)) knobs.push(`<select class="cw-place" data-i="${i}" data-k="to" aria-label="to">${placeOptions(s.to)}</select>`);
  else if (['mark', 'aura'].includes(scene.shape)) knobs.push(`<select class="cw-place" data-i="${i}" data-k="at" aria-label="where">${placeOptions(s.at)}</select>`);
  if (s.size) knobs.push(`<select class="cw-size" data-i="${i}" aria-label="size">${SCALES.map(([v, wd]) => `<option value="${v}"${Number(scale) === v ? ' selected' : ''}>${wd}</option>`).join('')}</select>`);
  if (scene.shape === 'move') {
    const spot = s.seen && s.unoccupied ? 'seen-unoccupied' : s.seen ? 'seen' : s.unoccupied ? 'unoccupied' : 'any';
    knobs.push(`<select class="cw-spot" data-i="${i}" aria-label="the spot">${[['seen-unoccupied', 'to an unoccupied space they can see'], ['unoccupied', 'to an unoccupied space, seen or not'], ['seen', 'to a space they can see'], ['any', 'to any space']].map(([v, wd]) => `<option value="${v}"${spot === v ? ' selected' : ''}>${wd}</option>`).join('')}</select>`);
    knobs.push(`<input type="number" class="cw-range" data-i="${i}" value="${esc(String(s.range ?? 30))}" min="5" step="5" aria-label="range in feet" style="width:80px" title="range in feet">`);
  }
  if (scene.shape !== 'sound' && scene.shape !== 'custom') {
    const has = !!scene.sound?.asset;
    const finding = w.finding === i;
    knobs.push(`<select class="cw-sound" data-i="${i}" aria-label="sound"><option value="keep"${finding ? '' : ' selected'}>${has ? `with ${esc(pathWords(a.assets.resolve(scene.sound.asset).path ?? ''))}` : 'no sound'}</option>${has ? '<option value="none">no sound</option>' : ''}<option value="find"${finding ? ' selected' : ''}>another sound…</option></select>`);
    if (finding) knobs.push(`<span class="search"><input type="text" class="cw-sound-q" data-i="${i}" placeholder="fire, sword, heal, teleport…" aria-label="find a sound" autocomplete="off"><div class="suggest" data-open="false"></div></span>`);
    knobs.push(`<button type="button" class="quiet browse" data-act="cw-browse" data-i="${i}" data-slot="sound" title="browse the sounds">browse…</button>`);
  }
  return `<div class="scene"><div class="shape">${esc(scene.shape)}</div><div class="knobs">${knobs.join('')}</div><button type="button" class="quiet drop" data-act="cw-drop" data-i="${i}" aria-label="remove this scene">✕</button><div class="line">${esc(sceneWords(scene))}</div></div>`;
}

function step3(app, w) {
  const rows = w.scenes.map((x, i) => sceneRow(app, w, x, i)).join('');
  const lead = `${w.start === 'dup' && w.from ? `A copy of ${esc(idWords(w.from))}. ` : w.start === 'starter' && w.from ? `${esc(idWords(w.from))} to begin with. ` : ''}Each line is one scene: what plays, in what colour, where, how big, with what sound. The sentence underneath is what the module will say about it.`;
  return `<h3>The FX</h3><p class="note lead">${lead}</p>
    <div class="scenes">${rows || '<p class="note">No scenes yet. Add one below.</p>'}</div>
    <div class="pills" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--fx-line2)"><span class="lbl">add a scene:</span>${Object.entries(SHAPE_WORDS).map(([sh, wd]) => `<button type="button" class="pill" data-act="cw-add" data-shape="${sh}" data-tooltip="${esc(SHAPE_HELP[sh])}" title="${esc(SHAPE_HELP[sh])}">${wd}</button>`).join('')}<button type="button" class="quiet" data-act="cw-shapes" aria-expanded="${!!w.shapesOpen}">what are these?</button></div>
    ${w.shapesOpen ? `<div class="legend">${Object.entries(SHAPE_HELP).map(([sh, help]) => `<div class="row"><span class="n">${esc(SHAPE_WORDS[sh])}</span><span class="s">${esc(help)}</span></div>`).join('')}</div>` : ''}
    <div class="preview">${sentenceOf(app)}</div>`;
}

function step4(app, w) {
  const s = w.subject;
  const on = Object.entries(ON_WORDS).map(([k, wd]) => `<button type="button" class="pill" aria-pressed="${w.on === k}" data-act="cw-on" data-on="${k}">${wd}</button>`).join('');
  const outcomes = OUTCOMES.map((o) => `<button type="button" class="pill" disabled>${o}</button>`).join('');
  const miss = w.scenes.some((x) => canMiss(x.scene)) ? `<div class="sub">on a miss</div><div class="pills"><button type="button" class="pill" aria-pressed="${w.onMiss === 'play'}" data-act="cw-miss" data-v="play">still plays, as a miss</button><button type="button" class="pill" aria-pressed="${w.onMiss === 'skip'}" data-act="cw-miss" data-v="skip">plays nothing</button></div>` : '';
  const bare = (s?.keys ?? []).filter((k) => !k.includes('/'));
  const keys = bare.map((k) => `<button type="button" class="pill" aria-pressed="${!w.onlyThis && w.key === k}" data-act="cw-key" data-key="${esc(k)}">${esc(keyWords(k))}</button>`).join('');
  const only = s?.uuid && s?.owner ? `<button type="button" class="pill" aria-pressed="${w.onlyThis}" data-act="cw-only">only this one, on ${esc(s.owner.split(' ')[0])}’s sheet</button>` : '';
  return `<h3>When it plays</h3><p class="note lead">The moment the FX answers, and who it answers for.</p>
    <div class="sub">the moment</div><div class="pills">${on}</div>
    <div class="sub">the outcome<span class="soon">phase 4</span></div><div class="pills">${outcomes}</div>
    <p class="note" style="margin-top:6px">Until phase 4 an FX plays at the moment above whatever happens. The outcomes — a hit flash, a miss, a failed save — come with it.</p>
    ${miss}
    ${keys || only ? `<div class="sub">answers for</div><div class="pills">${keys}${only}</div>` : ''}
    <div class="field"><label>Why (a note for whoever reads this later)</label><input type="text" class="cw-note" value="${esc(w.note)}" placeholder="${esc(noteOf(app))}"></div>
    <div class="preview"><div class="sub" style="margin:0 0 6px">what will be saved</div>${sentenceOf(app)}<p class="note" style="margin:6px 0 0">By ${esc(game.user.name)}, today. It plays here at once${w.onlyThis ? ` for that one ${esc(s?.name ?? 'item')}` : ''}.</p></div>`;
}

/** the note the draft would carry if the user writes none */
function noteOf(app) { try { return draftFx(app)?.note ?? ''; } catch { return ''; } }

// -----------------------------------------------------------------------------------------------
// events (the window routes every act that starts with cw- here)
// -----------------------------------------------------------------------------------------------
export async function onCreateClick(app, b, act) {
  const a = api();
  const w = app.walk;
  if (!w) return undefined;
  switch (act) {
    case 'cw-step': w.step = Number(b.dataset.step); break;
    case 'cw-next': if (!ready(w, w.step)) return undefined; w.step++; if (w.step === 3 && !w.scenes.length) seed(w); break;
    case 'cw-back': w.step--; break;
    case 'cw-cancel': app.walk = null; app.view.tab = 'lookup'; break;
    case 'cw-hit': { const e = app.entries[Number(b.dataset.i)]; if (e) setSubject(w, app.subjectFromEntry(e)); break; }
    case 'cw-new': setSubject(w, app.subjectNew(b.dataset.name)); break;
    case 'cw-kind': setSubject(w, app.subjectNew(w.subject.name, b.dataset.kind)); break;
    case 'cw-start': {
      if (w.start === b.dataset.start) break;
      w.start = b.dataset.start;
      w.from = w.start === 'dup' ? (app.answerFor(w.subject)?.original?.id ?? null) : w.start === 'starter' ? 'starter:bolt' : null;
      w.scenes = [];
      break;
    }
    case 'cw-from': case 'cw-like-hit': w.from = b.dataset.id; w.scenes = []; break;
    case 'cw-add': {
      const ex = a.fx.expand({ id: 'draft', like: STARTER_OF_SHAPE[b.dataset.shape] });
      const scene = (ex.scenes ?? []).find((sc) => sc.shape === b.dataset.shape) ?? ex.scenes?.[0];
      if (scene) w.scenes.push({ scene: clone(scene), scale: 1 });
      break;
    }
    case 'cw-drop': w.scenes.splice(Number(b.dataset.i), 1); break;
    case 'cw-shapes': w.shapesOpen = !w.shapesOpen; break;
    case 'cw-browse': openPicker(app, Number(b.dataset.i), b.dataset.slot); break;
    case 'cw-asset-hit': { const x = w.scenes[Number(b.dataset.i)]; if (x) x.scene.asset = { path: b.dataset.path }; break; }
    case 'cw-sound-hit': {
      const x = w.scenes[Number(b.dataset.i)];
      if (x) { if (x.scene.shape === 'sound') x.scene.asset = { path: b.dataset.path }; else x.scene.sound = { ...(x.scene.sound ?? {}), asset: b.dataset.path }; }
      w.finding = null;
      break;
    }
    case 'cw-on': w.on = b.dataset.on; break;
    case 'cw-miss': w.onMiss = b.dataset.v; break;
    case 'cw-key': w.key = b.dataset.key; w.onlyThis = false; break;
    case 'cw-only': w.onlyThis = !w.onlyThis; break;
    case 'cw-save': return saveWalk(app);
    default: return undefined;
  }
  return app.render();
}

export function onCreateInput(app, el) {
  const a = api();
  const w = app.walk;
  if (!w) return;
  const box = el.parentElement?.querySelector('.suggest');
  const open = (html) => { if (!box) return; box.innerHTML = html; box.dataset.open = html ? 'true' : 'false'; };
  const q = el.value.trim();
  if (el.classList.contains('cw-q')) {
    if (!q) return open('');
    const hits = app.searchHits(q);
    return open(hits.map(({ e, i }) => `<div class="hit" data-act="cw-hit" data-i="${i}"><span>${dot(e.status)}${esc(e.name)}${e.effect ? ' <span class="note">effect</span>' : ''}</span><span class="o">${esc(app.hitWhere(e))}</span></div>`).join('')
      + `<div class="hit" data-act="cw-new" data-name="${esc(q)}"><span class="o">${hits.length ? 'Not one of these? ' : 'Nothing called that on a sheet. '}A new ability called “${esc(q)}”.</span></div>`);
  }
  if (el.classList.contains('cw-like')) {
    const hits = app.likeHits(q).filter((h) => h.tag !== 'starter');
    return open(hits.map((h) => `<div class="hit" data-act="cw-like-hit" data-id="${esc(h.id)}"><span>${esc(h.words)}${h.keys ? ` <span class="note">· ${esc(h.keys.slice(0, 60))}</span>` : ''}</span><span class="o">${esc(h.tag)}</span></div>`).join('') || '<div class="hit"><span class="o">No FX called that. Type a few letters of its name.</span></div>');
  }
  if (el.classList.contains('cw-asset')) {
    if (q.length < 2) return open('');
    const hits = a.assets.search(q, { roots: ['jb2a'], limit: 30 });
    return open(hits.map((h) => `<div class="hit" data-act="cw-asset-hit" data-i="${el.dataset.i}" data-path="${esc(h.colours.length ? `${h.path}.${h.colours[0]}` : h.path)}"><span>${esc(pathWords(h.path))}</span><span class="o">${h.colours.length ? `${h.colours.length} colour${h.colours.length === 1 ? '' : 's'}` : 'one'}</span></div>`).join('') || '<div class="hit"><span class="o">No picture with that in its name.</span></div>');
  }
  if (el.classList.contains('cw-sound-q')) {
    if (q.length < 2) return open('');
    const hits = a.assets.search(q, { roots: ['psfx'], limit: 30 });
    return open(hits.map((h) => `<div class="hit" data-act="cw-sound-hit" data-i="${el.dataset.i}" data-path="${esc(h.path)}"><span>${esc(pathWords(h.path))}</span><span class="o">${h.colours.length ? `one of ${h.colours.length}` : 'sound'}</span></div>`).join('') || '<div class="hit"><span class="o">No sound with that in its name.</span></div>');
  }
  if (el.classList.contains('cw-note')) { w.note = el.value; }
}

export function onCreateChange(app, el) {
  const a = api();
  const w = app.walk;
  if (!w) return undefined;
  const x = w.scenes[Number(el.dataset.i)];
  if (el.classList.contains('cw-colour') && x) { const r = a.assets.recoloured(x.scene.asset, el.value); if (!r.problem) x.scene.asset = { path: r.path }; return app.render(); }
  if (el.classList.contains('cw-place') && x) { x.scene[el.dataset.k] = el.value; return app.render(); }
  if (el.classList.contains('cw-size') && x) { x.scale = Number(el.value) || 1; return app.render(); }
  if (el.classList.contains('cw-spot') && x) {
    const seen = el.value === 'seen-unoccupied' || el.value === 'seen';
    const unoccupied = el.value === 'seen-unoccupied' || el.value === 'unoccupied';
    if (seen) delete x.scene.seen; else x.scene.seen = false;
    if (unoccupied) delete x.scene.unoccupied; else x.scene.unoccupied = false;
    return app.render();
  }
  if (el.classList.contains('cw-range') && x) { const n = Number(el.value); if (n > 0) { if (n === 30) delete x.scene.range; else x.scene.range = n; } return app.render(); }
  if (el.classList.contains('cw-sound') && x) {
    if (el.value === 'none') { delete x.scene.sound; w.finding = null; }
    else if (el.value === 'find') w.finding = Number(el.dataset.i);
    else w.finding = null;
    return app.render();
  }
  return undefined;
}

/** Enter in a search box takes the first hit */
export function onCreateKey(app, ev) {
  const el = ev.target;
  const w = app.walk;
  if (!w || ev.key !== 'Enter') return false;
  if (el.classList.contains('cw-q')) {
    ev.preventDefault();
    const q = el.value.trim();
    if (!q) return true;
    const hits = app.searchHits(q);
    const exact = hits.find((h) => h.e.name.toLowerCase() === q.toLowerCase()) ?? hits[0];
    setSubject(w, exact ? app.subjectFromEntry(exact.e) : app.subjectNew(q));
    app.render();
    return true;
  }
  if (el.classList.contains('cw-like')) {
    ev.preventDefault();
    const hit = app.likeHits(el.value).filter((h) => h.tag !== 'starter')[0];
    if (hit) { w.from = hit.id; w.scenes = []; app.render(); }
    return true;
  }
  return false;
}

async function saveWalk(app) {
  const a = api();
  const w = app.walk;
  const s = w.subject;
  let fx;
  try { fx = draftFx(app); } catch (e) { return app.toast(e.message); }
  const r = await a.fx.save(fx, { by: game.user.name });
  if (!r.ok) return app.toast(r.problems.join(' '));
  const item = s?.uuid ? fromUuidSync(s.uuid) : null;
  if (w.onlyThis && item) await item.setFlag(MODULE_ID, 'fx', fx.id);
  else if (item && s.pointer && !w.onlyThis) await item.unsetFlag(MODULE_ID, 'fx');
  app.walk = null;
  app.refresh();
  if (item) app.showItem(item); else { app.view.subject = s; app.view.tab = 'lookup'; }
  await app.render();
  return app.toast(`Saved. ${s.name} plays it now.`);
}
