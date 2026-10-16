// MAINTAIN, the maintainer's corner of Coverage (DESIGN 28.6): a disclosure, closed until asked,
// holding Import (a file of FX into House, the Library's own act), Import to Stock (the books'
// file, the maintainer's job) and the corpus check (the corpus files read again, their problems
// on one line). It held the Drafts, the Ship and what Shipped until the draft layer went (Save
// writes the file now); how the files reach the repo is the maintainer's tooling, not the GM's
// screen. Built on the API and nothing else. Labels are terms.
import { MODULE_ID } from '../settings.js';
import { SOURCE_TAG, esc } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;

/** the corpus files' own problems, as one line */
function problemsLine(problems) {
  if (!problems.length) return 'The corpus files read clean.';
  return `${problems.length} corpus problem${problems.length === 1 ? '' : 's'}: ${problems.slice(0, 2).join(' · ')}${problems.length > 2 ? ` · +${problems.length - 2} more` : ''}`;
}

/** the Maintain disclosure: what the corpus holds on its summary, the three doors inside */
export function renderMaintain(app, { open = false } = {}) {
  const a = api();
  const problems = a.index.problems ?? [];
  const counts = a.index.counts ?? {};
  const state = problems.length ? `${problems.length} corpus problem${problems.length === 1 ? '' : 's'}` : 'corpus clean';
  return `<details class="cvmaint" ${open ? 'open' : ''}>
    <summary data-act="cv-maint" data-tooltip="The maintainer's corner: Import, Import to ${SOURCE_TAG.stock} and the corpus check.">Maintain <span class="faint">· ${esc(state)} · ${(counts.stock ?? 0).toLocaleString('en-US')} ${SOURCE_TAG.stock} · ${counts.house ?? 0} ${SOURCE_TAG.house}</span></summary>
    <div class="body">
      <div class="acts">
        <button type="button" data-act="import-fx" data-to="house" data-tooltip="Read a file of FX into ${SOURCE_TAG.house}">Import</button>
        <button type="button" data-act="import-fx" data-to="stock" data-tooltip="Read a file of FX straight into ${SOURCE_TAG.stock}">Import to ${SOURCE_TAG.stock}</button>
        <button type="button" class="quiet" data-act="co-check" data-tooltip="Read the corpus files again and say what is wrong with them">Check the corpus</button>
      </div>
      <p class="note ${problems.length ? 'bad' : ''}">${esc(problemsLine(problems))}</p>
    </div>
  </details>`;
}

/** the corpus check: the files read again, the window follows, the answer on the toast */
export async function onCorpusClick(app, b, act) {
  if (act !== 'co-check') return undefined;
  const a = api();
  try { await a.corpus.reload(); } catch (e) { return app.toast?.(`Could not read the corpus files: ${e.message}`); }
  app.refresh?.();
  app._broken = null;
  await app.render();
  return app.toast?.(problemsLine(a.index.problems ?? []));
}
