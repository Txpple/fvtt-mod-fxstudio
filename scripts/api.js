// The authoring API (ARCHITECTURE §7): the second door. Anything that can run script in the game
// — a macro, a bridge, an assistant at the table — writes an FX as data, validates it, reads it
// back as a sentence, previews it on chosen tokens, saves it into its corpus FILE with provenance
// (House, or Stock — there is no draft layer, ruled 2026-09-12), and asks what plays nothing. The screens (phase 3) are built on this, so it is always complete.
import { sentence, validate, provenance } from './core/fx.js';
import { gateNames, registerGate } from './core/gates.js';
import { stampRecord } from './core/records.js';
import { LAYER_WORDS, allFx, fxFor, resolve } from './core/corpus.js';
import { keyLabel, keysFor, keyWords } from './core/subjects.js';
import { build, ledger, play, resolveMoment } from './engine/render.js';
import { coloursOf, database, familyOf, recoloured, resolveAsset, search } from './engine/assets.js';
import { readEffect, readMessage, readRegion, subjectOfEffect, subjectOfItem } from './readers/dnd5e.js';
import { readMoment } from './readers/battleflow.js';
import { MODULE_ID } from './settings.js';
import { erase, fileFor, stockFile, writeFx } from './files.js';

/**
 * @param state  {get index, corpora: {stock, house, starters}, rebuild(), reload()}
 */
export function makeApi(state) {

  // THE RECORDS (recipes/records.json): where every key's evidence lives. Read once, lazily — when
  // a screen opens or an FX is saved — and never by the engine, which plays without it. It is the
  // source every stamp is taken from (core/records.js) and the fallback the screens read by key.
  let records = null;
  let reading = null;
  const readRecords = () => {
    if (records) return Promise.resolve(true);
    reading ??= fetch(`modules/${MODULE_ID}/recipes/records.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((j) => { records = j.records ?? {}; return true; })
      .catch((e) => { console.warn('FX Studio | no records file, so no row can open one:', e.message); records = {}; return false; });
    return reading;
  };
  const lookup = (id) => state.index.byId.get(id)?.fx ?? state.index.starters.get(id) ?? null;
  const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  const fx = {
    /** problems with an FX, in sentences; an empty list means it is well formed */
    validate: (fx) => validate(fx),
    /**
     * The scenes an FX or a starter holds, as a fresh copy to build a new FX out of. This is how a
     * variant is made: the scenes are COPIED and then changed. No FX ever points at another one
     * (ruled 2026-09-07), so nothing here resolves a reference.
     */
    scenesOf: (id) => copy(lookup(id)?.scenes ?? []),
    /** the sentence for an FX */
    sentence: (fx, opts) => sentence(fx, opts),
    provenance,
    /** every FX the corpus holds, later layer winning per id: [{fx, original, source}] */
    list: () => allFx(state.index),
    get: (id) => state.index.byId.get(id) ?? null,
    starters: () => [...state.index.starters.values()],
    /** the FX that answer a key, on any moment kind */
    for: (key) => fxFor(state.index, key),
    /**
     * Save an FX into its corpus file with provenance (the same id there is replaced), then read
     * the corpora again. `to` is the corpus: 'house' (the default — this table's own FX, and the
     * only home of an Item Hook) or 'stock' (the books' file of the FX's kind). A house FX with a
     * stock FX's id is the House OVERRIDE: it wins by id. Returns {ok, problems, fx, file}.
     */
    save: async (fx, { by = null, note = null, to = 'house' } = {}) => {
      const problems = validate(fx);
      if (problems.length) return { ok: false, problems, fx };
      if (!fileFor(fx, to)) return { ok: false, problems: [to === 'stock' ? 'an Item Hook (no ability key) lives in House, not Stock' : `"${to}" is not a corpus (house or stock)`], fx };
      // the record is stamped from this install's address book by the FX's key, never typed (core/records.js)
      await readRecords();
      const stamped = stampRecord({ ...fx, by: by ?? fx.by ?? game.user?.name ?? 'someone', at: fx.at ?? new Date().toISOString().slice(0, 10) }, records);
      if (note) stamped.note = note;
      const file = await writeFx(stamped, to);
      await state.reload();
      return { ok: true, problems: [], fx: stamped, file, sentence: sentence(stamped) };
    },
  };

  /** the corpus: the two files, what may go where, deleting, reading again */
  const corpus = {
    /** may this FX go to Stock? (it needs an ability key to pick its file; an Item Hook is House only) */
    canStock: (fx) => !!stockFile(fx),
    /** the file an FX would be written to for a corpus */
    fileFor,
    /** delete an FX for good, out of the file of the layer that wins (House over Stock; `from` names one), then the corpora read again */
    erase: async (id, { from = null } = {}) => { const r = await erase(id, { corpora: state.corpora, from }); if (r.written.length) await state.reload(); return r; },
    /** does a Stock FX sit under this id? (a House FX with the same id is its override; deleting it shows Stock again) */
    under: (id) => (state.corpora.stock.some((l) => l.id === id) ? 'stock' : null),
    words: LAYER_WORDS,
    reload: () => state.reload(),
  };

  const subjects = {
    ofItem: (item, opts) => subjectOfItem(item, opts),
    ofEffect: (effect) => subjectOfEffect(effect),
    keysFor,
    keyWords,
    keyLabel,
  };

  /** the FX a subject (or an item) resolves to for a moment kind: {fx, key, source} or {fx: null, why} */
  const resolveFor = (subjectOrItem, on = 'use', { hasPlace = false } = {}) => {
    const subject = subjectOrItem?.keys ? subjectOrItem : subjectOrItem?.documentName === 'ActiveEffect' ? subjectOfEffect(subjectOrItem) : subjectOfItem(subjectOrItem);
    return { subject, ...resolve(state.index, subject?.keys ?? [], on, { hasPlace, pointer: subject?.pointer ?? null }) };
  };

  /** the sentence for what an item (or a subject) would play: "Fire Bolt · when used · …" or "Nothing plays yet." */
  const sentenceFor = (item, on = 'use', { hasPlace = false } = {}) => {
    const r = resolveFor(item, on, { hasPlace });
    const name = item?.name ?? r.subject?.name ?? null;
    if (!r.fx) return { sentence: 'Nothing plays.', why: whyNothing(r), subject: r.subject, key: r.key ?? null, source: r.source ?? null, off: !!r.off };
    return { sentence: sentence(r.fx, { name }), fx: r.fx, original: r.original ?? null, key: r.key, source: r.source, why: whyFx(r), subject: r.subject };
  };
  // the "why" as terms: the hook that answered and the layer it lives in (Draft · House · Stock)
  const layer = (r) => LAYER_WORDS[r.source] ?? r.source;
  const whyFx = (r) => r.pointer ? `Item Hook · ${layer(r)}` : `Global Hook · ${keyLabel(r.key)} · ${layer(r)}`;
  const whyNothing = (r) => {
    if (r.off) return `Off · ${layer(r)}`;
    const keys = r.subject?.keys ?? [];
    if (!keys.length) return 'No keys';
    return `No FX for ${keys.map(keyLabel).join(', ')}`;
  };

  /**
   * Play an FX once on chosen tokens without saving it.
   * @param opts {source: Token, targets: [Token], place: Region, destination: {x, y}, on}
   */
  const preview = async (fx, { source = null, targets = [], place = null, destination = null, on = null } = {}) => {
    const problems = validate(fx);
    if (problems.length) return { ok: false, problems };
    const expanded = copy(fx);
    const src = source ?? canvas.tokens.controlled[0] ?? null;
    const tgts = targets.length ? targets : Array.from(game.user.targets);
    if (!src) return { ok: false, problems: ['no source token: select one or pass {source}'] };
    const moment = { when: on ?? expanded.on ?? 'use', kind: 'preview', subject: { name: expanded.id, keys: expanded.for ?? [] }, source: src, targets: tgts.map((t) => ({ token: t })), place, destination, origin: `fxstudio.preview.${expanded.id}`, id: `preview-${Date.now()}`, user: game.user.id };
    const entry = await play(state.index, moment, { fx: expanded });
    return { ok: true, entry, sentence: sentence(expanded) };
  };

  /**
   * The census: every ability on the world's actors (or the given ones) and every effect, with the
   * fx that answers and what plays nothing. Data for the Check screen and the tools.
   */
  const census = ({ actors = null } = {}) => {
    const list = actors ?? game.actors.contents;
    const TYPES = ['weapon', 'spell', 'feat', 'consumable', 'equipment', 'tool'];
    const out = { actors: [], nothing: [], answered: 0, asked: 0 };
    for (const actor of list) {
      const row = { name: actor.name, type: actor.type, items: [], effects: [] };
      for (const it of actor.items) {
        if (!TYPES.includes(it.type)) continue;
        const acts = it.system?.activities?.contents ?? [];
        if (!acts.length && it.type !== 'weapon') continue;
        const subject = subjectOfItem(it, { activity: acts[0] ?? null });
        const hasPlace = acts.some((a) => a?.target?.template?.type);
        const r = resolve(state.index, subject.keys, 'use', { hasPlace, pointer: subject.pointer ?? null });
        out.asked++;
        if (r.fx) out.answered++; else out.nothing.push({ actor: actor.name, name: it.name, type: it.type, keys: subject.keys });
        row.items.push({ name: it.name, type: it.type, id: it.id, uuid: it.uuid, keys: subject.keys, hasPlace, fx: r.fx?.id ?? null, key: r.key ?? null, source: r.source ?? null, why: r.why ?? null, off: !r.fx && /switched off/.test(r.why ?? '') });
      }
      for (const ef of actor.allApplicableEffects?.() ?? actor.effects) {
        const subject = subjectOfEffect(ef);
        const r = resolve(state.index, subject.keys, 'effect');
        row.effects.push({ name: ef.name, keys: subject.keys, fx: r.fx?.id ?? null, key: r.key ?? null, source: r.source ?? null });
      }
      out.actors.push(row);
    }
    return out;
  };

  /**
   * Open the screens: {tab: 'fx' | 'editor' | 'assets' | 'coverage' (the tabs step 5 replaced —
   * stock, house, lookup, library, audit — still land where they meant to); 'editor' is the FX
   * sheet, and with an id, a key or an item it opens the sheet on it; item: an Item to ask about;
   * id: an FX id; key}
   */
  const open = (opts = {}) => state.open?.(opts) ?? null;

  const assets = {
    search: (word, opts) => search(word, opts),
    colours: (family) => coloursOf(family),
    familyOf,
    recoloured,
    resolve: (asset) => resolveAsset(asset),
    exists: (asset) => !resolveAsset(asset).missing,
    database,
  };

  return {
    get index() { return state.index; },
    get corpora() { return state.corpora; },
    get ledger() { return ledger; },
    fx,
    corpus,
    subjects,
    assets,
    resolve: resolveFor,
    resolveMoment: (moment) => resolveMoment(state.index, moment),
    sentenceFor,
    preview,
    census,
    open,
    build,
    play: (moment, opts) => play(state.index, moment, opts),
    read: { message: readMessage, region: readRegion, effect: readEffect, battleflow: readMoment },
    rebuild: () => state.rebuild(),
    /** the records: read once (resolves true when the map is here), the map as it is, and whether it is here */
    records: { read: readRecords, map: () => records, ready: () => !!records },
    /**
     * THE GATES (core/gates.js): how another module asks this table to wait. `register(name, ask)`
     * takes a function called once per moment, before it plays, which answers null (not held), or a
     * promise — settling truthy to play, or null/false to say the thing never happened and nothing
     * should play. It returns a function that unregisters it. The wait is always bounded here.
     */
    gates: { register: registerGate, names: gateNames },
  };
}
