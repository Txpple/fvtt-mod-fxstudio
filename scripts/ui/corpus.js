// The Corpus tab (DESIGN §8; reshaped on the user's word 2026-09-06): Stock itself, read as rows
// like Custom — the ability, what it plays, searchable — for whoever maintains it. The
// maintainer's controls sit in one small card underneath: the drafts this world wrote and where
// each is staged (House or Stock), the ship (the corpus files written into the module on this
// server, a version stamped, a line in the record), what shipped before; and the import of a file
// of FX straight into Stock. The repo pulls the files back with tools/pull-corpus.mjs. Built on
// api.corpus and api.fx and nothing else. Labels are terms (ruled 2026-09-06).
import { MODULE_ID } from '../settings.js';
import { keyLabel, parseKey } from '../core/subjects.js';
import { HOOK_WORDS, SOURCE_TAG, esc, idWords } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;
const PAGE = 500;

/** the maintainer's state on the window, shared by the Stock list and the Maintain card (Audit) */
const corpusState = (app) => (app.co ??= { version: null, note: '', q: '', show: PAGE });

export function renderCorpus(app) {
  const a = api();
  const co = corpusState(app);
  const q = co.q.trim().toLowerCase();
  const stock = a.fx.list().filter((e) => e.source === 'stock');
  const rows = stock.map((e) => {
    const key = e.fx.for?.[0] ?? null;
    const name = key ? idWords(parseKey(key)?.id) : idWords(e.fx.id);
    const keys = (e.fx.for ?? []).map(keyLabel).join(', ');
    const sentence = a.fx.sentence(e.original, { name });
    return { e, name, keys, sentence, text: `${e.fx.id} ${name} ${keys} ${sentence}`.toLowerCase() };
  }).filter((r) => !q || r.text.includes(q)).sort((x, y) => x.name.localeCompare(y.name));
  const shown = Math.min(co.show, rows.length);
  const body = rows.slice(0, shown).map(({ e, name, keys }) => `<div class="row line"><span class="n"><button type="button" class="link" data-act="open-fx" data-id="${esc(e.fx.id)}">${esc(name)}</button>${keys ? ` <span class="note">· ${esc(keys)}</span>` : ''}</span><span class="b"><button type="button" class="quiet" data-act="open-fx" data-id="${esc(e.fx.id)}">View</button><button type="button" class="quiet" data-act="delete-fx" data-id="${esc(e.fx.id)}">Delete</button></span></div>`).join('');
  const more = rows.length > shown ? `<p class="note more"><button type="button" class="link" data-act="co-more">Load more</button> · ${rows.length - shown} more</p>` : '';
  return `<div class="stack">
    <div class="search"><input type="search" class="co-q" placeholder="Search" aria-label="Search Stock" value="${esc(co.q)}"></div>
    <div class="card list lines"><div class="sub">${SOURCE_TAG.stock} · ${rows.length}${q ? ` of ${stock.length}` : ''} FX</div>${body || '<p class="note">No match.</p>'}${more}</div>
  </div>`;
}

/** the maintainer's card: the drafts, staging, the ship, the record, the import (on Audit) */
export function renderMaintain(app) {
  const a = api();
  const co = corpusState(app);
  const { drafts, staged } = a.corpus.pending();
  const version = a.corpus.version();
  const next = a.corpus.nextVersions(version);
  const shipped = a.corpus.shipped();
  if (![next.patch, next.minor].includes(co.version)) co.version = next.patch;
  const row = (l, kind) => {
    const name = l.for?.[0] ? idWords(parseKey(l.for[0])?.id) : idWords(l.id);
    const tag = kind === 'staged' ? `<span class="tag bound">Staged: ${esc(a.corpus.words[l.to])}</span>` : `<span class="tag yours">${SOURCE_TAG.world}</span>`;
    const buttons = kind === 'staged'
      ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="">Unstage</button>`
      : `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="house">Stage: ${a.corpus.words.house}</button>${a.corpus.canStock(l) ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="stock">Stage: ${a.corpus.words.stock}</button>` : ''}`;
    return `<div class="row"><span class="n">${esc(name)}${l.for?.length ? '' : ` <span class="note">· ${HOOK_WORDS.item}</span>`}</span><span class="b">${tag}${buttons}</span></div>`;
  };
  const waiting = [...staged.map((b) => row(b.fx, 'staged')), ...drafts.map((l) => row(l, 'draft'))].join('');
  const files = [...new Set(staged.map((b) => b.file))];
  const ship = staged.length ? `<div class="fields" style="margin-top:10px">
        <div class="field"><label>Version</label><select class="co-version"><option value="${next.patch}"${co.version === next.patch ? ' selected' : ''}>${next.patch} (patch)</option><option value="${next.minor}"${co.version === next.minor ? ' selected' : ''}>${next.minor} (minor)</option></select></div>
        <div class="field"><label>Release note</label><input type="text" class="co-note" value="${esc(co.note)}" placeholder="${esc(staged.map((b) => idWords(parseKey(b.fx.for?.[0] ?? '')?.id ?? b.fx.id)).join(', '))}"></div>
      </div>
      <div class="actions" style="margin-top:10px"><button type="button" class="primary" data-act="co-ship">Ship ${esc(co.version)}</button></div>
      <p class="note" style="margin-top:8px">Writes ${esc(files.join(', '))} into the module on this server. Git, tag and release: <code>tools/pull-corpus.mjs</code>.</p>` : '';
  const history = shipped.slice(0, 5).map((s) => `<div class="row"><span class="n">${esc(s.version)} <span class="note">· ${esc(s.at)}${s.by ? ` · ${esc(s.by)}` : ''}</span></span><span class="b"><span class="tag main">Shipped</span></span>${s.note ? `<span class="s">${esc(s.note)}</span>` : ''}</div>`).join('');
  return `<div class="card list"><div class="sub">Maintain · ${esc(version)}</div>
    <p class="note">Drafts play in this world only. Staged FX ship with the next version.</p>
    ${waiting || '<p class="note">No drafts.</p>'}
    ${ship}
    <div class="actions" style="margin-top:10px"><button type="button" data-act="import-fx" data-to="stock">Import to ${SOURCE_TAG.stock}</button></div>
    ${history ? `<div class="sub" style="margin-top:14px">Shipped</div>${history}` : ''}
  </div>`;
}

export async function onCorpusClick(app, b, act) {
  const a = api();
  if (act === 'co-more') { corpusState(app).show += PAGE; return app.render(); }
  if (act === 'co-stage') {
    const r = await a.corpus.stage(b.dataset.id, b.dataset.to || null);
    if (!r.ok) return app.toast(r.problems.join(' '));
    app.refresh();
    await app.render();
    return app.toast(b.dataset.to ? `${idWords(b.dataset.id)} staged: ${a.corpus.words[b.dataset.to]}.` : `${idWords(b.dataset.id)} unstaged.`);
  }
  if (act === 'co-ship') {
    const co = app.co;
    const { staged } = a.corpus.pending();
    const files = [...new Set(staged.map((b) => b.file))].map((f) => f.split('/').pop());
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: `Ship ${co.version}?` }, content: `<p>${staged.length} FX → ${esc(files.join(', '))}. Version ${esc(co.version)}.</p>`, rejectClose: false, modal: true });
    if (!ok) return undefined;
    const r = await a.corpus.ship({ version: co.version, note: co.note });
    if (!r.ok) return app.toast(r.problems.join(' '));
    app.co = null;
    app.refresh();
    await app.render();
    return app.toast(`Shipped ${r.version}: ${r.record.fx.length} FX → ${r.written.map((w) => w.file.split('/').pop()).join(', ')}. Pull into the repo to release.`);
  }
  return undefined;
}

export function onCorpusInput(app, el) {
  if (!app.co) return;
  if (el.classList.contains('co-note')) app.co.note = el.value;
  if (el.classList.contains('co-q')) {
    app.co.q = el.value;
    app.co.show = PAGE;
    clearTimeout(app._coTimer);
    app._coTimer = setTimeout(() => {
      const pane = app.element.querySelector('[data-pane="stock"]');
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
