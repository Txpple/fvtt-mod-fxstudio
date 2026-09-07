// The authoring API (ARCHITECTURE §7): the second door. Anything that can run script in the game
// — a macro, a bridge, an assistant at the table — writes an FX as data, validates it, reads it
// back as a sentence, previews it on chosen tokens, saves it to the world buffer with provenance,
// and asks what plays nothing. The screens (phase 3) are built on this, so it is always complete.
import { expand, sentence, validate, provenance } from './core/fx.js';
import { allFx, fxFor, resolve } from './core/corpus.js';
import { keysFor, keyWords } from './core/subjects.js';
import { build, ledger, play, resolveMoment } from './engine/render.js';
import { coloursOf, database, familyOf, recoloured, resolveAsset, search } from './engine/assets.js';
import { readEffect, readMessage, readRegion, subjectOfEffect, subjectOfItem } from './readers/dnd5e.js';
import { MODULE_ID, getWorldFx, setWorldFx } from './settings.js';
import { TO_WORDS, baselineFile, nextVersions, pending, ship, stage, erase } from './ship.js';

/**
 * @param state  {get index, corpora: {baseline, house, starters, shipped}, rebuild(), reload()}
 */
export function makeApi(state) {
  const ids = () => new Set([...state.index.byId.keys(), ...state.index.starters.keys()]);
  const sameFx = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const lookup = (id) => state.index.byId.get(id)?.fx ?? state.index.starters.get(id) ?? null;

  const fx = {
    /** problems with an FX, in sentences; an empty list means it is well formed */
    validate: (fx) => validate(fx, { ids: ids() }),
    /** the FX with `like` and `with` filled in */
    expand: (fx) => expand(fx, lookup),
    /** the sentence for an FX (expanded first when it inherits) */
    sentence: (fx, opts) => sentence(fx?.like ? expand(fx, lookup) : fx, opts),
    provenance,
    /** every FX the corpus holds, later layer winning per id: [{fx, original, source}] */
    list: () => allFx(state.index),
    get: (id) => state.index.byId.get(id) ?? null,
    starters: () => [...state.index.starters.values()],
    /** the FX that answer a key, on any moment kind */
    for: (key) => fxFor(state.index, key),
    /** the world buffer as it is */
    buffer: () => getWorldFx(),
    /**
     * Save an FX to the world buffer with provenance (replacing one with the same id). Returns
     * {ok, problems, fx}. `to` binds it for a corpus (house | baseline); without it the FX is a
     * draft that plays in this world only. Nothing reaches the corpus files until Corpus ships.
     */
    save: async (fx, { by = null, note = null, to = undefined } = {}) => {
      const problems = validate(fx, { ids: ids() });
      if (problems.length) return { ok: false, problems, fx };
      const stamped = { ...fx, by: by ?? fx.by ?? game.user?.name ?? 'someone', at: fx.at ?? new Date().toISOString().slice(0, 10) };
      if (note) stamped.note = note;
      if (to) stamped.to = to; else if (to === null) delete stamped.to;
      if (stamped.to === 'baseline' && !baselineFile(stamped)) return { ok: false, problems: ['an FX with no ability of its own belongs in the house corpus, not the main one'], fx };
      const buffer = getWorldFx().filter((l) => l.id !== stamped.id);
      buffer.push(stamped);
      await setWorldFx(buffer);
      state.rebuild();
      return { ok: true, problems: [], fx: stamped, sentence: sentence(expand(stamped, lookup)) };
    },
    /** take an FX out of the world buffer (a house or baseline fx of that id shows through again) */
    remove: async (id) => {
      const buffer = getWorldFx();
      const next = buffer.filter((l) => l.id !== id);
      if (next.length === buffer.length) return { ok: false, problems: [`no FX "${id}" in the world buffer`] };
      await setWorldFx(next);
      state.rebuild();
      return { ok: true };
    },
    /** the buffer's FX that recipes/house.json already holds word for word (the export has run and been deployed) */
    exported: () => getWorldFx().filter((l) => state.corpora.house.some((h) => h.id === l.id && sameFx(h, l))),
    /** drop from the buffer what the house file already holds; what it does not hold stays. Returns how many went. */
    clearExported: async () => {
      const gone = fx.exported().map((l) => l.id);
      if (!gone.length) return { ok: true, cleared: 0 };
      await setWorldFx(getWorldFx().filter((l) => !gone.includes(l.id)));
      state.rebuild();
      return { ok: true, cleared: gone.length };
    },
  };

  /** the corpus: what is written here and where it is bound, binding, shipping, the record */
  const cmpVersion = (a, b) => { const x = String(a).split('.').map(Number); const y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0); return 0; };
  const corpus = {
    pending,
    stage: async (id, to) => { const r = await stage(id, to); if (r.ok) state.rebuild(); return r; },
    /** ship every bound FX into the module's corpus files, stamp the version, keep the record, read the corpora again */
    ship: async ({ version = null, note = '' } = {}) => {
      const r = await ship({ version, note, by: game.user?.name ?? null });
      if (r.ok) await state.reload();
      return r;
    },
    /** may this FX go to the main corpus? (it needs an ability key to pick its file) */
    canBaseline: (fx) => !!baselineFile(fx),
    /** delete an FX for good: the world buffer and the module's corpus files, then the corpora read again */
    erase: async (id) => { const r = await erase(id, { corpora: state.corpora }); if (r.written.length) await state.reload(); else state.rebuild(); return r; },
    shipped: () => state.corpora.shipped ?? [],
    /** the version the module runs, or the last one shipped from here when that is newer */
    version: () => { const running = game.modules.get(MODULE_ID)?.version ?? '0.0.0'; const last = state.corpora.shipped?.[0]?.version; return last && cmpVersion(last, running) > 0 ? last : running; },
    nextVersions: (current) => nextVersions(current ?? corpus.version()),
    words: TO_WORDS,
    reload: () => state.reload(),
  };

  const subjects = {
    ofItem: (item, opts) => subjectOfItem(item, opts),
    ofEffect: (effect) => subjectOfEffect(effect),
    keysFor,
    keyWords,
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
    if (!r.fx) return { sentence: 'Nothing plays yet.', why: whyNothing(r, name), subject: r.subject, key: r.key ?? null, source: r.source ?? null, off: /switched off/.test(r.why ?? '') };
    return { sentence: sentence(r.fx, { name }), fx: r.fx, original: r.original ?? null, key: r.key, source: r.source, why: whyFx(r, name), subject: r.subject };
  };
  const SOURCE_WORDS = { world: 'an FX written in this world', house: 'the house file', baseline: 'the corpus' };
  const whyFx = (r, name) => r.pointer ? `This ${name ?? 'item'} has an FX of its own (${SOURCE_WORDS[r.source] ?? r.source}).` : `${name ?? 'It'} is ${keyWords(r.key)}, and ${SOURCE_WORDS[r.source] ?? r.source} has an FX for that.`;
  const whyNothing = (r, name) => {
    if (/switched off/.test(r.why ?? '')) return `${name ?? 'It'} was switched off on purpose (${SOURCE_WORDS[r.source] ?? r.source}); it plays nothing until you give it an FX again.`;
    const keys = r.subject?.keys ?? [];
    if (!keys.length) return 'Nothing here can be given an FX.';
    return `No FX answers ${keys.map(keyWords).join(', or ')}. Give it one below.`;
  };

  /**
   * Play an FX once on chosen tokens without saving it. `fx` may inherit (`like`).
   * @param opts {source: Token, targets: [Token], place: Region, destination: {x, y}, on}
   */
  const preview = async (fx, { source = null, targets = [], place = null, destination = null, on = null } = {}) => {
    const problems = validate(fx, { ids: ids() });
    if (problems.length) return { ok: false, problems };
    const expanded = expand(fx, lookup);
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

  /** open the screens: {tab: 'lookup' | 'create' | 'custom' | 'corpus' | 'check', item: an Item to look up, id: an FX id (Look up, or the walk when tab is 'create'), key} */
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
    read: { message: readMessage, region: readRegion, effect: readEffect },
    rebuild: () => state.rebuild(),
  };
}
