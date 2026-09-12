// Coverage (HANDOFF step 7, built 2026-09-07): what has an FX and what does not, in one tab, over
// two scopes — MY ACTORS (the census the window already holds, read with no await) and COMPENDIUMS
// (the books the user picks, read once and asked what plays). Both were computed on every render
// before this; only the second was ever on screen.
//
// MAINTAIN IS THE BAND AT THE TOP. It is the last step of a workflow — write FX, check the table is
// covered, maintain — not a footnote under a report, which is where it sat.
//
// One scroll region (R4): the rows. The band, the scope switch and the tiles are fixed height and
// say "+N more" rather than growing. Four tiles at permanent addresses (R1) — Abilities · With FX ·
// No FX · Errors — showing "—" before a book is read, never dropped. Every row is one height (R3)
// and every column is proportional (R2). Built on the API and the window's own census.
import { MODULE_ID } from '../settings.js';
import { keyLabel, parseKey } from '../core/subjects.js';
import { KIND_WORDS, dot, esc, statusOf } from './html.js';
import { renderMaintain } from './corpus.js';
import { assetsOf } from '../core/fx.js';

const api = () => game.modules.get(MODULE_ID).api;
const PAGE = 200;
/** the two scopes, at permanent addresses in that order */
const SCOPES = [['mine', 'My actors'], ['books', 'Compendiums']];

/** the tab's own state: which scope, whether the books are being picked, and how much is shown */
const cvState = (app) => (app.cvv ??= { scope: 'mine', picking: true, show: PAGE, books: null, chosen: new Set(), reading: false });

// -----------------------------------------------------------------------------------------------
// what the tab is about: the rows, and the four numbers over them
// -----------------------------------------------------------------------------------------------
/** every Item compendium in the world, grouped by the package that ships it */
function bookShelf() {
  const groups = new Map();
  for (const p of game.packs) {
    if (p.documentName !== 'Item') continue;
    const m = p.metadata;
    const pkg = m.packageType === 'world' ? 'This world' : m.packageType === 'system' ? (game.system.title ?? m.packageName) : (game.modules.get(m.packageName)?.title ?? m.packageName);
    (groups.get(pkg) ?? groups.set(pkg, []).get(pkg)).push({ id: p.collection, name: m.label ?? p.collection, size: p.index.size });
  }
  return [...groups.entries()].map(([pkg, books]) => ({ pkg, books: books.sort((x, y) => x.name.localeCompare(y.name)) })).sort((x, y) => x.pkg.localeCompare(y.pkg));
}

/**
 * The rows the list shows, as groups with a head: the abilities on this world's actors that play
 * nothing (My actors), the books to pick from, or the abilities in the books that were read.
 */
function groupsOf(app) {
  const st = cvState(app);
  if (st.scope === 'mine') {
    const out = [];
    for (const row of app.census?.actors ?? []) {
      const none = row.items.filter((it) => !it.fx);
      if (!none.length) continue;
      out.push({
        head: `${row.name} · ${none.length} of ${row.items.length}`,
        rows: none.map((it) => {
          const kind = parseKey(it.keys[0] ?? '')?.kind;
          return `<div class="row"><button type="button" class="pickbtn" data-act="entry" data-uuid="${esc(it.uuid)}" data-create="1" data-tooltip="Write an FX for ${esc(it.name)}">
            <span class="n">${dot(statusOf(it))}${esc(it.name)}</span>
            <span class="s">${esc(it.keys[0] ? keyLabel(it.keys[0]) : 'no key')}</span>
          </button><span class="tag">${esc(it.off ? 'Off' : KIND_WORDS[kind] ?? it.type)}</span></div>`;
        }),
      });
    }
    return out;
  }
  if (st.picking || !st.books) {
    return bookShelf().map(({ pkg, books }) => ({
      head: pkg,
      rows: books.map((b) => `<div class="row" data-now="${st.chosen.has(b.id)}"><button type="button" class="pickbtn" data-act="cv-book" data-book="${esc(b.id)}" aria-pressed="${st.chosen.has(b.id)}">
        <span class="n">${esc(b.name)}</span>
      </button><span class="tag">${b.size}</span></div>`),
    }));
  }
  return st.books.map((b) => ({
    head: `${b.name} · ${b.answered} of ${b.asked}`,
    rows: b.nothing.map((n) => `<div class="row"><button type="button" class="pickbtn" data-act="key" data-key="${esc(n.key)}" data-tooltip="Write an FX for ${esc(n.name)}">
      <span class="n">${dot('none')}${esc(n.name)}</span>
      <span class="s">${esc(n.key ? keyLabel(n.key) : 'no key')}</span>
    </button><span class="tag">No FX</span></div>`),
  }));
}

/** Abilities · With FX for the scope on screen; null before a book has been read */
function counts(app) {
  const st = cvState(app);
  if (st.scope === 'mine') { const c = app.census ?? { asked: 0, answered: 0 }; return { asked: c.asked, answered: c.answered }; }
  if (!st.books) return { asked: null, answered: null };
  return { asked: st.books.reduce((t, b) => t + b.asked, 0), answered: st.books.reduce((t, b) => t + b.answered, 0) };
}

// -----------------------------------------------------------------------------------------------
// rendering
// -----------------------------------------------------------------------------------------------
const num = (n) => (n === null ? '—' : String(n));

/** the FX naming an asset the libraries do not have — the check tools/check-fx.mjs runs, on screen; cached until the corpus is read again */
function brokenIds(app) {
  if (app._broken) return app._broken;
  const a = api();
  const out = new Set();
  for (const { fx } of a.fx.list()) {
    if (fx.off) continue;
    for (const scene of fx.scenes ?? []) {
      if (assetsOf(scene).some(({ asset }) => !a.assets.exists(asset))) { out.add(fx.id); break; }
    }
  }
  app._broken = out;
  return out;
}

/** the four numbers over the list. Errors counts the FX naming an asset the libraries do not have (the Broken assets facet went, 2026-09-12: the number stays, the door does not) */
function tiles(app) {
  const { asked, answered } = counts(app);
  const no = asked === null ? null : asked - answered;
  const broken = brokenIds(app).size;
  const scope = cvState(app).scope === 'mine' ? 'on your actors' : 'in the books read';
  const cell = (cls, n, label, why) => `<div class="tile ${cls}" data-tooltip="${esc(why)}"><div class="num">${num(n)}</div><div class="l">${esc(label)}</div></div>`;
  return `<div class="tiles">
    ${cell('', asked, 'Abilities', `Abilities ${scope} that can play an FX.`)}
    ${cell(answered ? 'good' : '', answered, 'With FX', `Abilities ${scope} that something answers.`)}
    ${cell(no ? 'warn' : 'good', no, 'No FX', `Abilities ${scope} that play nothing. They are the rows below.`)}
    ${cell(broken ? 'bad' : 'good', broken, 'Errors', broken ? `${broken} FX name an asset the libraries do not have: ${[...brokenIds(app)].slice(0, 6).join(', ')}${broken > 6 ? ', …' : ''}` : 'Every FX names an asset the libraries have.')}
  </div>`;
}

export function renderCoverage(app) {
  const st = cvState(app);
  const groups = groupsOf(app);
  const total = groups.reduce((t, g) => t + g.rows.length, 0);
  const books = st.scope === 'books';
  const picking = books && (st.picking || !st.books);
  // one flat run of heads and rows, cut at the page, so the count and the "+N more" agree
  const page = Math.min(st.show, total);
  let left = page;
  const body = groups.map((g) => {
    if (left <= 0) return '';
    const take = g.rows.slice(0, left);
    left -= take.length;
    return `<div class="grouphead">${esc(g.head)}</div>${take.join('')}`;
  }).join('');
  const more = total > page ? `<p class="note more"><button type="button" class="link" data-act="cv-more">Load more</button> · ${total - page} more</p>` : '';
  const empty = st.scope === 'mine' ? 'Every ability on your actors has an FX.' : picking ? 'No item compendiums in this world.' : 'All have FX.';
  const n = st.chosen.size;
  const scope = SCOPES.map(([v, w]) => `<button type="button" data-act="cv-scope" data-scope="${v}" aria-pressed="${st.scope === v}">${w}</button>`).join('');
  const head = st.scope === 'mine' ? `${total} with no FX · ${app.census?.actors?.length ?? 0} actors`
    : picking ? `${total} compendiums · ${n} picked`
      : `${total} with no FX · ${st.books.length} read`;
  return `<div class="coverage">
    ${renderMaintain(app)}
    <div class="cvscope">
      <div class="segs">${scope}</div>
      <span class="note">${esc(head)}</span>
      <span class="spacer"></span>
      <button type="button" data-act="cv-pick" ${books && !picking ? '' : 'data-na="true" disabled'} data-tooltip="${books ? 'Pick the compendiums again.' : 'Compendiums are picked in that scope.'}">Books · ${n}</button>
      <button type="button" class="primary" data-act="cv-check" ${books && n && !st.reading ? '' : 'data-na="true" disabled'} data-tooltip="${books ? (n ? 'Read the picked compendiums and ask what plays for each ability.' : 'Pick a compendium first.') : 'My actors is read from the world already.'}">${st.reading ? 'Checking…' : `Check${n ? ` (${n})` : ''}`}</button>
    </div>
    ${tiles(app)}
    <div class="cvlist card">
      <div class="rows">${body || `<p class="note">${esc(empty)}</p>`}${more}</div>
    </div>
  </div>`;
}

// -----------------------------------------------------------------------------------------------
// events
// -----------------------------------------------------------------------------------------------
/** read the picked books once: every ability in them asked what plays, through the API */
async function checkBooks(app) {
  const a = api();
  const st = cvState(app);
  const packs = [...st.chosen].map((id) => game.packs.get(id)).filter((p) => p?.documentName === 'Item');
  const out = [];
  for (const p of packs) {
    const docs = await p.getDocuments();
    const row = { name: p.metadata.label ?? p.collection, asked: 0, answered: 0, nothing: [] };
    for (const d of docs) {
      if (!['spell', 'feat', 'weapon', 'consumable', 'equipment', 'tool'].includes(d.type)) continue;
      const acts = d.system?.activities?.contents ?? [];
      if (!acts.length && d.type !== 'weapon') continue;
      const hasPlace = acts.some((x) => x?.target?.template?.type);
      const r = a.resolve(a.subjects.ofItem(d, { activity: acts[0] ?? null }), 'use', { hasPlace });
      row.asked++;
      if (r.fx) row.answered++;
      else row.nothing.push({ name: d.name, key: r.subject?.keys?.find((k) => !k.includes('/')) ?? r.subject?.keys?.[0] });
    }
    out.push(row);
  }
  st.books = out;
  st.picking = false;
}

export async function onCoverageClick(app, b, act) {
  const st = cvState(app);
  switch (act) {
    case 'cv-scope': st.scope = b.dataset.scope; st.show = PAGE; return app.render();
    case 'cv-book': { const id = b.dataset.book; if (st.chosen.has(id)) st.chosen.delete(id); else st.chosen.add(id); return app.render(); }
    case 'cv-pick': st.picking = true; st.show = PAGE; return app.render();
    case 'cv-check': st.reading = true; st.show = PAGE; await app.render(); try { await checkBooks(app); } finally { st.reading = false; } return app.render();
    case 'cv-more': st.show += PAGE; return app.render();
    default: return undefined;
  }
}
