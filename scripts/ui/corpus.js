// The maintainer's BAND (DESIGN §8-9; the Stock list it sat beside was merged into the one FX tab at
// step 5, and at step 7 it moved from the foot of Coverage to the top of it — shipping is the last
// step of a workflow, not a footnote under a report). Three columns: the drafts this world wrote
// and where each is staged (House or Stock); the ship (the corpus files written into the module on
// this server, a version stamped, a line in the record); what shipped before. The import of a file
// of FX straight into Stock is in its head, and the corpus's own problems on one line under it.
// Staging lives HERE ALONE since the user stripped the FX tab back to a list (2026-09-07): the
// detail pane's "Ships as" select went with the pane. The repo pulls the files back with tools/pull-corpus.mjs. Built on
// api.corpus and api.fx and nothing else. Labels are terms.
import { MODULE_ID } from '../settings.js';
import { parseKey } from '../core/subjects.js';
import { HOOK_WORDS, SOURCE_TAG, esc, idWords } from './html.js';
import { nameForKey } from './records.js';

const api = () => game.modules.get(MODULE_ID).api;

/** the maintainer's state on the window */
const corpusState = (app) => (app.co ??= { version: null, note: '' });

/**
 * The Maintain BAND, at the top of Coverage (HANDOFF step 7, 2026-09-07): three columns that keep
 * their place — what is Waiting (the drafts this world wrote and where each is staged), the Ship
 * (the version, the note, the button that writes the corpus files into the module on this server)
 * and what has Shipped — with the corpus's own problems on one line under them. It is bounded, not
 * scrolling: the FX tab lists every Draft, this band is the overview and the button (R4).
 * Import to Stock is in its head — a file straight into the shipped corpus, which is the
 * maintainer's own job. Plain Import (a file into this world as Drafts) is on the FX tab.
 */
export function renderMaintain(app) {
  const a = api();
  const co = corpusState(app);
  const { drafts, staged } = a.corpus.pending();
  const version = a.corpus.version();
  const next = a.corpus.nextVersions(version);
  const shipped = a.corpus.shipped();
  const problems = a.index.problems ?? [];
  if (![next.patch, next.minor].includes(co.version)) co.version = next.patch;
  const row = (l, kind) => {
    const name = l.for?.[0] ? nameForKey(l.for[0]) : idWords(l.id);
    const tag = kind === 'staged' ? `<span class="tag bound">Staged: ${esc(a.corpus.words[l.to])}</span>` : `<span class="tag yours">${SOURCE_TAG.world}</span>`;
    const buttons = kind === 'staged'
      ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="">Unstage</button>`
      : `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="house">Stage: ${a.corpus.words.house}</button>${a.corpus.canStock(l) ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="stock">Stage: ${a.corpus.words.stock}</button>` : ''}`;
    return `<div class="row line"><span class="n">${esc(name)}${l.for?.length ? '' : ` <span class="note">· ${HOOK_WORDS.item}</span>`}</span><span class="b">${tag}${buttons}</span></div>`;
  };
  const waiting = [...staged.map((b) => row(b.fx, 'staged')), ...drafts.map((l) => row(l, 'draft'))];
  const files = [...new Set(staged.map((b) => b.file))].map((f) => f.split('/').pop());
  // the Ship column keeps its three controls whether or not anything is staged, greyed with the
  // reason where they stand (R1)
  const na = staged.length ? '' : ' data-na="true" disabled';
  const whyShip = staged.length ? `Writes ${esc(files.join(', '))} into the module on this server.` : 'Stage a Draft — this band is where staging lives.';
  return `<div class="card band maintain">
    <div class="bhead"><span class="sub">Maintain · ${esc(version)}</span><span class="note">Drafts play in this world only. Staged FX ship with the next version.</span><span class="spacer"></span><button type="button" class="quiet" data-act="import-fx" data-to="stock">Import to ${SOURCE_TAG.stock}</button></div>
    <div class="mgrid">
      <div class="mcol"><div class="sub">Waiting · ${waiting.length}</div>
        ${waiting.slice(0, 4).join('') || '<p class="note">No drafts.</p>'}
        ${waiting.length > 4 ? `<p class="note">+${waiting.length - 4} more on the FX tab</p>` : ''}</div>
      <div class="mcol"><div class="sub">Ship · ${staged.length} staged</div>
        <div class="fields">
          <div class="field"><label>Version</label><select class="co-version"${na}><option value="${next.patch}"${co.version === next.patch ? ' selected' : ''}>${next.patch} (patch)</option><option value="${next.minor}"${co.version === next.minor ? ' selected' : ''}>${next.minor} (minor)</option></select></div>
          <div class="field"><label>Release note</label><input type="text" class="co-note"${na} value="${esc(co.note)}" placeholder="${esc(staged.map((b) => idWords(parseKey(b.fx.for?.[0] ?? '')?.id ?? b.fx.id)).join(', '))}"></div>
        </div>
        <div class="actions"><button type="button" class="primary" data-act="co-ship"${na}>Ship ${esc(co.version)}</button></div>
        <p class="note">${whyShip}</p></div>
      <div class="mcol"><div class="sub">Shipped · ${shipped.length}</div>
        ${shipped.slice(0, 3).map((s) => `<div class="row line" data-tooltip="${esc(s.at)}${s.by ? ` · ${esc(s.by)}` : ''}"><span class="n">${esc(s.version)}${s.note ? ` <span class="note">· ${esc(s.note)}</span>` : ''}</span><span class="b"><span class="tag main">Shipped</span></span></div>`).join('') || '<p class="note">Nothing shipped from this world yet.</p>'}</div>
    </div>
    <p class="note foot ${problems.length ? 'bad' : ''}">${problems.length ? `${problems.length} corpus problem${problems.length === 1 ? '' : 's'}: ${esc(problems.slice(0, 2).join(' · '))}${problems.length > 2 ? ` · +${problems.length - 2} more` : ''}` : 'The corpus files read clean.'}</p>
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
