// Read a Foundry LevelDB folder offline. Foundry holds a LOCK on the live folder, so a folder is
// SNAPSHOT (copied, LOCK excluded) into scratch first and read from there; the copy is cheap
// (settings is a few MB, actors ~20 MB). The .log holds writes not yet compacted, and is copied
// too, so the snapshot is what Foundry would read.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { SCRATCH, classicLevel } from './env.mjs';

export function snapshot(srcDir, name = basename(srcDir)) {
  const dst = join(SCRATCH, 'db', name);
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  cpSync(srcDir, dst, { recursive: true, filter: (p) => basename(p) !== 'LOCK' });
  return dst;
}

export async function readAll(dir) {
  const ClassicLevel = classicLevel();
  const db = new ClassicLevel(dir, { readOnly: true });
  await db.open();
  const out = [];
  for await (const [k, v] of db.iterator()) out.push([k, v]);
  await db.close();
  return out;
}

/** world settings as {key: rawValueString} */
export async function readSettings(dir) {
  const settings = {};
  for (const [, v] of await readAll(dir)) {
    const d = JSON.parse(v);
    settings[d.key] = d.value;
  }
  return settings;
}

/** actors and their embedded items and effects from a snapshot of data/actors */
export async function readActors(dir) {
  const actors = {};
  const items = {};
  const effects = {};
  for (const [k, v] of await readAll(dir)) {
    if (k.startsWith('!actors!')) {
      const a = JSON.parse(v);
      actors[a._id] = a;
    } else if (k.startsWith('!actors.items!')) {
      const [actorId] = k.split('!')[2].split('.');
      (items[actorId] ??= []).push(JSON.parse(v));
    } else if (k.startsWith('!actors.items.effects!')) {
      const [actorId, itemId] = k.split('!')[2].split('.');
      (effects[`${actorId}.${itemId}`] ??= []).push(JSON.parse(v));
    } else if (k.startsWith('!actors.effects!')) {
      const [actorId] = k.split('!')[2].split('.');
      (effects[actorId] ??= []).push(JSON.parse(v));
    }
  }
  return { actors, items, effects };
}

/** a compendium pack of items: the top-level documents only */
export async function readPackItems(dir) {
  const out = [];
  for (const [k, v] of await readAll(dir)) if (k.startsWith('!items!')) out.push(JSON.parse(v));
  return out;
}

/**
 * Every ActiveEffect a pack holds — on its items, on its actors, and on its actors' items — with
 * THE RECORD IT LIVES ON. An effect is not an item, so no item list can hold one; the name is what
 * an `effect:` key meets, and the record that carries it is what a person wants opened (the effect
 * "Blessed" lives on the spell Bless). `on.path` is the uuid tail after the pack:
 * `Item.<id>`, `Actor.<id>` or `Actor.<id>.Item.<id>`.
 */
export async function readPackEffects(dir) {
  const rows = await readAll(dir);
  const items = {}, actors = {}, actorItems = {};
  for (const [k, v] of rows) {
    if (k.startsWith('!items!')) { const d = JSON.parse(v); items[d._id] = d; }
    else if (k.startsWith('!actors!')) { const d = JSON.parse(v); actors[d._id] = d; }
    else if (k.startsWith('!actors.items!')) { const d = JSON.parse(v); actorItems[d._id] = d; }
  }
  const out = [];
  for (const [k, v] of rows) {
    if (!k.includes('.effects!')) continue;
    const d = JSON.parse(v);
    if (!d?.name) continue;
    const ids = k.split('!')[2].split('.');
    let on = null;
    if (k.startsWith('!items.effects!')) { const p = items[ids[0]]; if (p) on = { path: `Item.${ids[0]}`, name: p.name, type: p.type }; }
    else if (k.startsWith('!actors.effects!')) { const p = actors[ids[0]]; if (p) on = { path: `Actor.${ids[0]}`, name: p.name, type: 'actor' }; }
    else if (k.startsWith('!actors.items.effects!')) { const p = actorItems[ids[1]]; if (p) on = { path: `Actor.${ids[0]}.Item.${ids[1]}`, name: p.name, type: p.type }; }
    out.push({ name: d.name, on });
  }
  return out;
}

export const packDir = (moduleDir, pack) => (existsSync(`${moduleDir}/packs/${pack}`) ? `${moduleDir}/packs/${pack}` : null);
