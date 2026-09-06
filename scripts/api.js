// The authoring API (ARCHITECTURE §7): the second door. Anything that can run script in the game
// — a macro, a bridge, an assistant at the table — writes a look as data, validates it, reads it
// back as a sentence, previews it on chosen tokens, saves it to the world buffer with provenance,
// and asks what plays nothing. The screens (phase 3) are built on this, so it is always complete.
import { expand, sentence, validate, provenance } from './core/looks.js';
import { allLooks, looksFor, resolve } from './core/corpus.js';
import { keysFor, keyWords } from './core/subjects.js';
import { build, ledger, play, resolveMoment } from './engine/render.js';
import { coloursOf, database, familyOf, recoloured, resolveAsset, search } from './engine/assets.js';
import { readEffect, readMessage, readRegion, subjectOfEffect, subjectOfItem } from './readers/dnd5e.js';
import { getWorldLooks, setWorldLooks } from './settings.js';

/**
 * @param state  {get index, corpora: {baseline, house, starters}, rebuild()}
 */
export function makeApi(state) {
  const ids = () => new Set([...state.index.byId.keys(), ...state.index.starters.keys()]);
  const lookup = (id) => state.index.byId.get(id)?.look ?? state.index.starters.get(id) ?? null;

  const looks = {
    /** problems with a look, in sentences; an empty list means it is well formed */
    validate: (look) => validate(look, { ids: ids() }),
    /** the look with `like` and `with` filled in */
    expand: (look) => expand(look, lookup),
    /** the sentence for a look (expanded first when it inherits) */
    sentence: (look, opts) => sentence(look?.like ? expand(look, lookup) : look, opts),
    provenance,
    /** every look the corpus holds, later layer winning per id: [{look, original, source}] */
    list: () => allLooks(state.index),
    get: (id) => state.index.byId.get(id) ?? null,
    starters: () => [...state.index.starters.values()],
    /** the looks that answer a key, on any moment kind */
    for: (key) => looksFor(state.index, key),
    /** the world buffer as it is */
    buffer: () => getWorldLooks(),
    /**
     * Save a look to the world buffer with provenance (replacing one with the same id). Returns
     * {ok, problems, look}. Nothing reaches recipes/house.json until a person runs the export.
     */
    save: async (look, { by = null, note = null } = {}) => {
      const problems = validate(look, { ids: ids() });
      if (problems.length) return { ok: false, problems, look };
      const stamped = { ...look, by: by ?? look.by ?? game.user?.name ?? 'someone', at: look.at ?? new Date().toISOString().slice(0, 10) };
      if (note) stamped.note = note;
      const buffer = getWorldLooks().filter((l) => l.id !== stamped.id);
      buffer.push(stamped);
      await setWorldLooks(buffer);
      state.rebuild();
      return { ok: true, problems: [], look: stamped, sentence: sentence(expand(stamped, lookup)) };
    },
    /** take a look out of the world buffer (a house or baseline look of that id shows through again) */
    remove: async (id) => {
      const buffer = getWorldLooks();
      const next = buffer.filter((l) => l.id !== id);
      if (next.length === buffer.length) return { ok: false, problems: [`no look "${id}" in the world buffer`] };
      await setWorldLooks(next);
      state.rebuild();
      return { ok: true };
    },
  };

  const subjects = {
    ofItem: (item, opts) => subjectOfItem(item, opts),
    ofEffect: (effect) => subjectOfEffect(effect),
    keysFor,
    keyWords,
  };

  /** the look a subject (or an item) resolves to for a moment kind: {look, key, source} or {look: null, why} */
  const resolveFor = (subjectOrItem, on = 'use', { hasPlace = false } = {}) => {
    const subject = subjectOrItem?.keys ? subjectOrItem : subjectOrItem?.documentName === 'ActiveEffect' ? subjectOfEffect(subjectOrItem) : subjectOfItem(subjectOrItem);
    return { subject, ...resolve(state.index, subject?.keys ?? [], on, { hasPlace }) };
  };

  /** the sentence for what an item would play: "Fire Bolt · when used · …" or "Nothing plays yet." */
  const sentenceFor = (item, on = 'use') => {
    const r = resolveFor(item, on);
    if (!r.look) return { sentence: 'Nothing plays yet.', why: r.why, subject: r.subject };
    return { sentence: sentence(r.look, { name: item.name }), look: r.look, key: r.key, source: r.source, why: `${item.name} is ${keyWords(r.key)}, and ${r.source} has a look for that.`, subject: r.subject };
  };

  /**
   * Play a look once on chosen tokens without saving it. `look` may inherit (`like`).
   * @param opts {source: Token, targets: [Token], place: Region, destination: {x, y}, on}
   */
  const preview = async (look, { source = null, targets = [], place = null, destination = null, on = null } = {}) => {
    const problems = validate(look, { ids: ids() });
    if (problems.length) return { ok: false, problems };
    const expanded = expand(look, lookup);
    const src = source ?? canvas.tokens.controlled[0] ?? null;
    const tgts = targets.length ? targets : Array.from(game.user.targets);
    if (!src) return { ok: false, problems: ['no source token: select one or pass {source}'] };
    const moment = { when: on ?? expanded.on ?? 'use', kind: 'preview', subject: { name: expanded.id, keys: expanded.for ?? [] }, source: src, targets: tgts.map((t) => ({ token: t })), place, destination, origin: `fxstudio.preview.${expanded.id}`, id: `preview-${Date.now()}`, user: game.user.id };
    const entry = await play(state.index, moment, { look: expanded });
    return { ok: true, entry, sentence: sentence(expanded) };
  };

  /**
   * The census: every ability on the world's actors (or the given ones) and every effect, with the
   * look that answers and what plays nothing. Data for the Check screen and the tools.
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
        const r = resolve(state.index, subject.keys, 'use', { hasPlace });
        out.asked++;
        if (r.look) out.answered++; else out.nothing.push({ actor: actor.name, name: it.name, type: it.type, keys: subject.keys });
        row.items.push({ name: it.name, type: it.type, keys: subject.keys, look: r.look?.id ?? null, key: r.key ?? null, source: r.source ?? null, why: r.why ?? null });
      }
      for (const ef of actor.allApplicableEffects?.() ?? actor.effects) {
        const subject = subjectOfEffect(ef);
        const r = resolve(state.index, subject.keys, 'effect');
        row.effects.push({ name: ef.name, keys: subject.keys, look: r.look?.id ?? null, key: r.key ?? null, source: r.source ?? null });
      }
      out.actors.push(row);
    }
    return out;
  };

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
    looks,
    subjects,
    assets,
    resolve: resolveFor,
    resolveMoment: (moment) => resolveMoment(state.index, moment),
    sentenceFor,
    preview,
    census,
    build,
    play: (moment, opts) => play(state.index, moment, opts),
    read: { message: readMessage, region: readRegion, effect: readEffect },
    rebuild: () => state.rebuild(),
  };
}
