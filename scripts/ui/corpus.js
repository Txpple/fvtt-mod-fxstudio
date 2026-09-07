// The maintainer's card (DESIGN §8; the Stock list it sat beside was merged into the one FX tab at
// step 5, 2026-09-07). It is one card at the top of Coverage: the drafts this world wrote and where
// each is staged (House or Stock), the ship (the corpus files written into the module on this
// server, a version stamped, a line in the record), what shipped before; and the import of a file
// of FX straight into Stock. Staging is also on every FX's own detail pane now (ui/fxtab.js) — this
// card is where you see all of it at once and press Ship. The repo pulls the files back with
// tools/pull-corpus.mjs. Built on api.corpus and api.fx and nothing else. Labels are terms.
import { MODULE_ID } from '../settings.js';
import { parseKey } from '../core/subjects.js';
import { HOOK_WORDS, SOURCE_TAG, esc, idWords } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;

/** the maintainer's state on the window */
const corpusState = (app) => (app.co ??= { version: null, note: '' });

/** the maintainer's card: the drafts, staging, the ship, the record, the import (on Coverage) */
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
}

export function onCorpusChange(app, el) {
  if (!app.co) return undefined;
  if (el.classList.contains('co-version')) { app.co.version = el.value; return app.render(); }
  return undefined;
}
