// The Corpus tab (DESIGN §8, ruled 2026-09-06): where a shippable corpus is built from the game.
// What is written in this world and where each look is bound; binding a draft for the house or the
// main corpus; the ship — the corpus files written into the module on this server, a version
// stamped, a line in the record; what shipped before. The repo pulls the files back with
// tools/pull-corpus.mjs. Built on api.corpus and nothing else.
import { MODULE_ID } from '../settings.js';
import { keyWords, parseKey } from '../core/subjects.js';
import { provenance } from '../core/looks.js';
import { esc, idWords } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;

export function renderCorpus(app) {
  const a = api();
  const { drafts, bound } = a.corpus.pending();
  const counts = a.index.counts;
  const version = a.corpus.version();
  const next = a.corpus.nextVersions(version);
  const shipped = a.corpus.shipped();
  const co = app.co ?? (app.co = { version: next.patch, note: '' });
  if (![next.patch, next.minor].includes(co.version)) co.version = next.patch;
  const tiles = [['', counts.baseline, 'looks in the main corpus'], ['good', counts.house, 'in the house corpus'], ['', drafts.length, `draft${drafts.length === 1 ? '' : 's'} in this world only`], [bound.length ? 'warn' : '', bound.length, 'bound for a corpus, not yet shipped'], ['', version, 'the version']];
  const row = (l, kind) => {
    const name = l.for?.[0] ? idWords(parseKey(l.for[0])?.id) : idWords(l.id);
    const keys = (l.for ?? []).map(keyWords).join(', ');
    const sentence = a.looks.sentence(l, { name });
    const tag = kind === 'bound' ? `<span class="tag bound">bound for ${esc(a.corpus.words[l.to])}</span>` : '<span class="tag yours">draft</span>';
    const buttons = kind === 'bound'
      ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="">Keep as a draft</button>`
      : `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="house">Bind for the house corpus</button>${a.corpus.canBaseline(l) ? `<button type="button" class="quiet" data-act="co-stage" data-id="${esc(l.id)}" data-to="baseline">…the main corpus</button>` : ''}`;
    return `<div class="row"><span class="n">${esc(name)}${keys ? ` <span class="note">· ${esc(keys)}</span>` : ' <span class="note">· one item’s own look</span>'}</span><span class="b">${tag}${buttons}<button type="button" class="quiet" data-act="edit-look" data-id="${esc(l.id)}">Edit</button></span><span class="s">${esc(sentence)}${l.by || l.note ? ` <span class="note">— ${esc(provenance(l))}</span>` : ''}</span></div>`;
  };
  const waiting = [...bound.map((b) => row(b.look, 'bound')), ...drafts.map((l) => row(l, 'draft'))].join('');
  const files = [...new Set(bound.map((b) => b.file))];
  const shipCard = bound.length ? `<div class="card"><div class="sub">Ship</div>
      <div class="fields">
        <div class="field"><label>Next version</label><select class="co-version"><option value="${next.patch}"${co.version === next.patch ? ' selected' : ''}>${next.patch} — a fix or a few looks</option><option value="${next.minor}"${co.version === next.minor ? ' selected' : ''}>${next.minor} — new looks people will notice</option></select></div>
        <div class="field"><label>Release note (one line, in sentences)</label><input type="text" class="co-note" value="${esc(co.note)}" placeholder="${esc(bound.map((b) => idWords(parseKey(b.look.for?.[0] ?? '')?.id ?? b.look.id)).join(', '))}"></div>
      </div>
      <div class="actions" style="margin-top:10px"><button type="button" class="primary" data-act="co-ship">Write the corpus files and stamp ${esc(co.version)}</button></div>
      <p class="note" style="margin-top:8px">Writes ${esc(files.join(', '))} into the module on this server and stamps the version in the shipping record. Git, the tag and the release stay in the repo: <code>tools/pull-corpus.mjs --write</code> takes the files and the version, then the release ritual.</p></div>` : '';
  const history = shipped.map((s) => `<div class="row"><span class="n">${esc(s.version)} <span class="note">· ${esc(s.at)}${s.by ? ` · by ${esc(s.by)}` : ''}</span></span><span class="b"><span class="tag main">shipped</span></span><span class="s">${s.note ? `${esc(s.note)} · ` : ''}${s.looks.length} look${s.looks.length === 1 ? '' : 's'}: ${esc(s.looks.map((l) => `${idWords(l.id)} (${l.to === 'baseline' ? 'main' : 'house'})`).join(', '))}</span></div>`).join('');
  return `<div class="stack">
    <div class="tiles">${tiles.map(([c, n, l]) => `<div class="tile ${c}"><div class="num">${esc(n)}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>
    <div class="card"><div class="sub">How a look travels</div>
      <div class="flow"><div class="box"><div class="l">written in the game</div>a draft in this world</div><div class="arrow">→</div><div class="box"><div class="l">bound for</div>the house corpus, or the main corpus</div><div class="arrow">→</div><div class="box"><div class="l">shipped</div>the corpus files written into the module, a version stamped</div></div>
      <p class="note">The game writes the module’s own recipes folder on this server. The repo pulls those files back with one tool, so a look bound here is one commit away from a release. The main corpus stays GPL with its attribution; the house corpus is yours.</p></div>
    <div class="card list"><div class="sub">Not yet shipped · ${bound.length + drafts.length}</div>${waiting || '<p class="note">Nothing is written in this world that the corpus does not already hold. Create a look, or bind a draft here.</p>'}</div>
    ${shipCard}
    <div class="card list"><div class="sub">Shipped from here</div>${history || '<p class="note">Nothing has been shipped from this world yet.</p>'}</div>
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
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: `Ship ${co.version}?` }, content: `<p>${bound.length} look${bound.length === 1 ? '' : 's'} into the corpus files inside the module on this server, and the version stamped ${esc(co.version)}. The repo pulls them back with tools/pull-corpus.mjs.</p>`, rejectClose: false });
    if (!ok) return undefined;
    const r = await a.corpus.ship({ version: co.version, note: co.note });
    if (!r.ok) return app.toast(r.problems.join(' '));
    app.co = null;
    app.refresh();
    await app.render();
    return app.toast(`Shipped ${r.version}: ${r.record.looks.length} look${r.record.looks.length === 1 ? '' : 's'} into ${r.written.map((w) => w.file.split('/').pop()).join(', ')}. Pull them into the repo to release.`);
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
