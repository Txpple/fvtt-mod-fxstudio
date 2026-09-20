// A live Foundry client for the tools that need one (the smoke suites), through the MCP's
// headless browser — the declared `fvtt-mcp-dnd5e/client` contract (a file: dependency), the way
// Battle Flow's tools/target.mjs does it. The LOCAL sandbox is the default and the only target
// these tools know; there is no prod switch here on purpose.
//
// Joins as "Tester Assistant" (the SUITE identity: FOUNDRY_SUITE_USER, alias BF_SUITE_USER in
// the MCP repo's .env), never as the MCP bridge's own identity, so a bridge left connected shows
// up as a second user instead of an invisible collision. Disconnect the bridge
// (`disconnect-bridge` on foundry-local5e) before running a suite.
import { connectFoundry, loadEnv } from 'fvtt-mcp-dnd5e/client';

export { loadEnv };

export async function connectSandbox({ tag = 'fxstudio', watchdogMs = 180_000 } = {}) {
  // connectFoundry: the MCP's .env → the `local` preset → the suite identity → connect, with
  // the watchdog armed before the connect and dispose raced against a ceiling.
  const { f, env, dispose } = await connectFoundry({ host: 'local', identity: 'suite', tag, watchdogMs });
  const who = await f.evaluate(() => ({ user: game.user.name, gm: game.user.isGM, world: game.world.id, users: game.users.filter((u) => u.active).map((u) => u.name) }), null);
  console.log(`[${tag}] connected as ${who.user} (gm ${who.gm}) to ${who.world}; active users: ${who.users.join(', ')}`);
  if (process.env.FX_TRACE) {
    const p = f.page; // the bridge's Playwright page — private to the class, reachable in JS
    p?.on('crash', () => console.error('[trace] PAGE CRASH'));
    p?.on('close', () => console.error('[trace] PAGE CLOSED'));
    p?.on('pageerror', (e) => console.error('[trace] pageerror: ' + String(e.message).slice(0, 300)));
    p?.on('console', (m) => { if (m.type() === 'error') console.error('[trace] console: ' + m.text().slice(0, 300)); });
  }
  return { f, env, dispose };
}
