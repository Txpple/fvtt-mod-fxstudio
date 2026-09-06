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

export const packDir = (moduleDir, pack) => (existsSync(`${moduleDir}/packs/${pack}`) ? `${moduleDir}/packs/${pack}` : null);
