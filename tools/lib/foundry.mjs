// A live Foundry client for the tools that need one (the smoke suites), through the MCP repo's
// headless browser, the way Battle Flow's tools/target.mjs does it. The LOCAL sandbox is the
// default and the only target these tools know; there is no prod switch here on purpose.
//
// Joins as "Tester Assistant" (BF_SUITE_USER), never as the MCP bridge's own identity, so a bridge
// left connected shows up as a second user instead of an invisible collision. Disconnect the
// bridge (`disconnect-bridge` on foundry-local5e) before running a suite.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MCP_REPO, toUrl } from './env.mjs';

export function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(MCP_REPO, '.env'), 'utf8').split(/\r?\n/)) {
    if (line.trimStart().startsWith('#')) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export async function connectSandbox({ tag = 'fxstudio', watchdogMs = 180_000 } = {}) {
  const env = loadEnv();
  const { Foundry } = await import(toUrl(join(MCP_REPO, 'dist', 'foundry.js')));
  const serverUrl = env.LOCAL_SERVER_URL || 'http://localhost:30000';
  const user = env.BF_SUITE_USER || 'Tester Assistant';
  console.log(`[${tag}] local sandbox (${serverUrl}) as "${user}"`);
  const watchdog = setTimeout(() => { console.error(`[${tag}] WATCHDOG: ${watchdogMs / 1000}s elapsed, aborting`); process.exit(3); }, watchdogMs);
  const f = new Foundry({ serverUrl, user, password: env.BF_SUITE_PASSWORD ?? '', adminKey: env.LOCAL_ADMIN_KEY, worldId: env.LOCAL_WORLD_ID || env.MOLTEN_WORLD_ID });
  await f.connect();
  const who = await f.evaluate(() => ({ user: game.user.name, gm: game.user.isGM, world: game.world.id, users: game.users.filter((u) => u.active).map((u) => u.name) }), null);
  console.log(`[${tag}] connected as ${who.user} (gm ${who.gm}) to ${who.world}; active users: ${who.users.join(', ')}`);
  const dispose = async () => { clearTimeout(watchdog); await Promise.race([f.dispose(), new Promise((r) => setTimeout(r, 15_000))]); };
  return { f, env, dispose };
}
