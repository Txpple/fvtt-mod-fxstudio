// The maintainer's BAND at the top of Coverage. It held three columns — the Drafts waiting, the
// Ship, what Shipped — until the draft layer went (the user, 2026-09-12: "no more concept of
// draft … either its a file or not"). Save writes the corpus file now, so there is nothing to
// stage and nothing to ship: the band is the import of a file of FX straight into Stock (the
// maintainer's own job; the Library tab's Import writes House) and the corpus's own problems on
// one line. The repo pulls the files back with tools/pull-corpus.mjs. Built on the API and
// nothing else. Labels are terms.
import { MODULE_ID } from '../settings.js';
import { SOURCE_TAG, esc } from './html.js';

const api = () => game.modules.get(MODULE_ID).api;

/** the Maintain band: Import to Stock, and the corpus files' own problems */
export function renderMaintain(app) {
  const a = api();
  const problems = a.index.problems ?? [];
  const version = game.modules.get(MODULE_ID)?.version ?? '';
  const counts = a.index.counts ?? {};
  return `<div class="card band maintain">
    <div class="bhead"><span class="sub">Maintain · ${esc(version)}</span><span class="note">${counts.house ?? 0} ${SOURCE_TAG.house} · ${counts.stock ?? 0} ${SOURCE_TAG.stock}. Save writes the file; pull the files into the repo to release.</span><span class="spacer"></span><button type="button" class="quiet" data-act="import-fx" data-to="stock" data-tooltip="Read a file of FX straight into ${SOURCE_TAG.stock}">Import to ${SOURCE_TAG.stock}</button></div>
    <p class="note foot ${problems.length ? 'bad' : ''}">${problems.length ? `${problems.length} corpus problem${problems.length === 1 ? '' : 's'}: ${esc(problems.slice(0, 2).join(' · '))}${problems.length > 2 ? ` · +${problems.length - 2} more` : ''}` : 'The corpus files read clean.'}</p>
  </div>`;
}

/** the band has no controls of its own left: Import to Stock is the window's `import-fx` act */
export async function onCorpusClick() { return undefined; }
