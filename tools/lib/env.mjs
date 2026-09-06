// Where things are on this machine. Every tool resolves through here so a path lives in one place.
//
//   FOUNDRY_DATA   the Foundry Data dir (default: the local sandbox's)
//   FXS_WORLD      the world id (default: the Molten world, which the sandbox is a byte copy of)
//   FXS_MCP_REPO   the MCP repo, whose node_modules hold classic-level (the LevelDB reader)
//   FXS_SCRATCH    where snapshots and extracted sources go (default: dist/scratch, gitignored)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = (process.env.FOUNDRY_DATA ?? 'C:/Users/sippelmc/AppData/Local/FoundryVTT/Data').replace(/\\/g, '/');
export const WORLD = process.env.FXS_WORLD ?? 'the-broken-heart-of-greenrest';
export const MCP_REPO = resolve(process.env.FXS_MCP_REPO ?? join(REPO, '..', 'fvtt-mcp-molten5e'));
export const SCRATCH = resolve(process.env.FXS_SCRATCH ?? join(REPO, 'dist', 'scratch'));
export const RECIPES = join(REPO, 'recipes');
// Foundry's own public assets (icons/svg/*.svg and the like) live in the app install, not in Data
export const APP_PUBLIC = (process.env.FOUNDRY_APP_PUBLIC ?? 'C:/Program Files/Foundry Virtual Tabletop/resources/app/public').replace(/\\/g, '/');
/** where a raw file path may live, in order */
export const ROOTS = [DATA, APP_PUBLIC];

export const MODULES = {
  jb2a: `${DATA}/modules/jb2a_patreon`,
  psfx: `${DATA}/modules/psfx-patreon`,
  aa: `${DATA}/modules/autoanimations`,
  dnd5eAnimations: `${DATA}/modules/dnd5e-animations`,
  phb: `${DATA}/modules/dnd-players-handbook`,
  sequencer: `${DATA}/modules/sequencer`,
  dnd5e: `${DATA}/systems/dnd5e`,
  mm: `${DATA}/modules/dnd-monster-manual`,
  dmg: `${DATA}/modules/dnd-dungeon-masters-guide`,
  ravenloft: `${DATA}/modules/dnd-ravenloft-horrors-within`,
};

export const worldDb = (name) => `${DATA}/worlds/${WORLD}/data/${name}`;

mkdirSync(SCRATCH, { recursive: true });

const require = createRequire(join(MCP_REPO, 'package.json'));
export function classicLevel() {
  try {
    return require('classic-level').ClassicLevel;
  } catch (e) {
    throw new Error(`classic-level is not installed under ${MCP_REPO}; run npm install there (${e.message})`);
  }
}

export function moduleVersion(dir) {
  const p = `${dir}/module.json`;
  if (!existsSync(p)) return null;
  return JSON.parse(require('node:fs').readFileSync(p, 'utf8')).version;
}

export const toUrl = (p) => `file:///${resolve(p).replace(/\\/g, '/')}`;
