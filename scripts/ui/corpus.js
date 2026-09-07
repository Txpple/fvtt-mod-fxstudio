// The Corpus tab (DESIGN §8; reshaped on the user's word 2026-09-06): the main corpus itself, read
// as rows like Custom — the ability, what it plays, searchable — for whoever maintains it. The
// maintainer's controls sit in one small card underneath: what this world wrote and where each is
// bound, binding a draft for the house or the main corpus, the ship (the corpus files written into
// the module on this server, a version stamped, a line in the record), what shipped before; and the
// import of a file of FX into the main corpus. The repo pulls the files back with
// tools/pull-corpus.mjs. Built on api.corpus and api.fx and nothing else.
import { MODULE_ID } from '../settings.js';
import { keyWords, parseKey } from '../core/subjects.js';
import { provenance } from '../core/fx.js';
import { esc, idWords } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;

export function renderCorpus(app) {
  const a = api();
  const co = app.co ?? (app.co = { version: null, note: '', q: '' });
  const q = co.q.trim().toLowerCase();
  const main = a.fx.list().filter((e) => e.source === 'baseline');
  const rows = main.map((e) => {
    const key = e.fx.for?.[0] ?? null;
    const name = key ? idWords(parseKey(key)?.id) : idWords(e.fx.id);
    const keys = (e.fx.for ?? []).map(keyWords).join(', ');
    const sentence = a.fx.sentence(e.original, { name });
    return { e, name, keys, sentence, text: `${e.fx.id} ${name} ${keys} ${sentence}`.toLowerCase() };
  }).filter((r) => !q || r.text.includes(q)).sort((x, y) => x.name.localeCompare(y.name));
  const body = rows.slice(0, 500).map(({ e, name, keys }) => `<div class="row line"><span class="n"><button type="button" class="link" data-act="open-fx" data-id="${esc(e.fx.id)}">${esc(name)}</button>${keys ? ` <span class="note">· for any ${esc(keys)}</span>` : ''}</span><span class="b"><button type="button" class="quiet" data-act="edit-fx" data-id="${esc(e.fx.id)}">Edit</button><button type="button" class="quiet" data-act="delete-fx" data-id="${esc(e.fx.id)}">Delete</button></span></div>`).join('');
  return `<div class="stack">
    <div class="search"><input type="search" class="co-q" placeholder="Search the main corpus…" aria-label="Search the main corpus" value="${esc(co.q)}"></div>
    <div class="card list lines"><div class="sub">${rows.length}${q ? ` of ${main.length}` : ''} FX in the main corpus${q ? ' matching' : ''}</div><p class="note">Click a name to read it.</p>${body || '<p class="note">Nothing matches.</p>'}${rows.length > 500 ? '<p class="note">Showing 500. Search to narrow.</p>' : ''}</div>
    ${renderMaintain(app)}
  </div>`;
}

/** the maintainer's card: what this world wrote, binding, the ship, the record, the import */
function renderMaintain(app) {
  const a = api();
  const co = app.co;
  const { drafts, bound } = a.corpus.pending();
  const version = a.corpus.version();
  const next = a.corpus.nextVersions(version);
  const shipped = a.corpus.shipped();
  if (![next.patch, next.minor].includes(co.version)) co.version = next.patch;
  const row = (l, kind) => {
    const name = l.for?.[0] ? idWords(parseKey(l.for[0])?.id) : idWords(l.id);
    const tag = kind === 'bound' ? `<span class="tag bound">bound for ${esc(a.corpus.words[l.to])}</span>` : '<span class="tag yours">draft</span>';
    const buttons = kind === 'bound'
      ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="">Keep as a draft</button>`
      : `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="house">Bind for the house corpus</button>${a.corpus.canBaseline(l) ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="baseline">Bind for the main corpus</button>` : ''}`;
    return `<div class="row"><span class="n">${esc(name)}${l.for?.length ? '' : ' <span class="note">· attached to an item in this world</span>'}</span><span class="b">${tag}${buttons}</span></div>`;
  };
  const waiting = [...bound.map((b) => row(b.fx, 'bound')), ...drafts.map((l) => row(l, 'draft'))].join('');
  const files = [...new Set(bound.map((b) => b.file))];
  const ship = bound.length ? `<div class="fields" style="margin-top:10px">
        <div class="field"><label>Next version</label><select class="co-version"><option value="${next.patch}"${co.version === next.patch ? ' selected' : ''}>${next.patch} — a fix or a few FX</option><option value="${next.minor}"${co.version === next.minor ? ' selected' : ''}>${next.minor} — new FX people will notice</option></select></div>
        <div class="field"><label>Release note (one line)</label><input type="text" class="co-note" value="${esc(co.note)}" placeholder="${esc(bound.map((b) => idWords(parseKey(b.fx.for?.[0] ?? '')?.id ?? b.fx.id)).join(', '))}"></div>
      </div>
      <div class="actions" style="margin-top:10px"><button type="button" class="primary" data-act="co-ship">Write the corpus files and stamp ${esc(co.version)}</button></div>
      <p class="note" style="margin-top:8px">Writes ${esc(files.join(', '))} into the module on this server and stamps the version in the shipping record. Git, the tag and the release stay in the repo: <code>tools/pull-corpus.mjs</code>.</p>` : '';
  const history = shipped.slice(0, 5).map((s) => `<div class="row"><span class="n">${esc(s.version)} <span class="note">· ${esc(s.at)}${s.by ? ` · by ${esc(s.by)}` : ''}</span></span><span class="b"><span class="tag main">shipped</span></span>${s.note ? `<span class="s">${esc(s.note)}</span>` : ''}</div>`).join('');
  return `<div class="card list"><div class="sub">Maintain · version ${esc(version)}</div>
    <p class="note">What this world wrote, and where each is bound. A draft plays here only; bound, it ships into the module with the next version. Binding is the maintainer's choice, never the author's.</p>
    ${waiting || '<p class="note">Nothing waits. Create FX, or import a file below.</p>'}
    ${ship}
    <div class="actions" style="margin-top:10px"><button type="button" data-act="import-fx" data-to="baseline">Import a file into the main corpus…</button></div>
    ${history ? `<div class="sub" style="margin-top:14px">Shipped from here</div>${history}` : ''}
  </div>`;
}

export async function onCorpusClick(app, b, act) {
  const a = api();
  if (act === 'co-stage') {
    const r = await a.corpus.stage(b.dataset.id, b.dataset.to || null);
    if (!r.ok) return app.toast(r.problems.join(' '));
    app.refresh();
    await app.render();
    return app.toast(b.dataset.to ? `${idWords(b.dataset.id)} is bound for ${a.corpus.words[b.dataset.to]}.` : `${idWords(b.dataset.id)} is a draft again.`);
  }
  if (act === 'co-ship') {
    const co = app.co;
    const { bound } = a.corpus.pending();
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: `Ship ${co.version}?` }, content: `<p>${bound.length} FX into the corpus files inside the module on this server, and the version stamped ${co.version}.</p>`, rejectClose: false, modal: true });
    if (!ok) return undefined;
    const r = await a.corpus.ship({ version: co.version, note: co.note });
    if (!r.ok) return app.toast(r.problems.join(' '));
    app.co = null;
    app.refresh();
    await app.render();
    return app.toast(`Shipped ${r.version}: ${r.record.fx.length} FX into ${r.written.map((w) => w.file.split('/').pop()).join(', ')}. Pull them into the repo to release.`);
  }
  return undefined;
}

export function onCorpusInput(app, el) {
  if (!app.co) return;
  if (el.classList.contains('co-note')) app.co.note = el.value;
  if (el.classList.contains('co-q')) {
    app.co.q = el.value;
    clearTimeout(app._coTimer);
    app._coTimer = setTimeout(() => {
      const pane = app.element.querySelector('[data-pane="corpus"]');
      if (!pane) return;
      pane.innerHTML = renderCorpus(app);
      const q = pane.querySelector('.co-q');
      q?.focus();
      q?.setSelectionRange(q.value.length, q.value.length);
    }, 250);
  }
}

export function onCorpusChange(app, el) {
  if (!app.co) return undefined;
  if (el.classList.contains('co-version')) { app.co.version = el.value; return app.render(); }
  return undefined;
}
