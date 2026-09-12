// The harness every offline check shares: numbered sections, one-line assertions, one report line.
// A check is a plain script — no test framework, no runner, no config — so it reads top to bottom
// and runs in a second. The rules it keeps for every check:
//   · `--section <n|word>` runs one section (by number, or a word from its name) and stamps the
//     report line ⚠ PARTIAL RUN, so a green partial run is never mistaken for a green run
//   · the report line is `PASS: n of n, <what it proves>` or `FAIL: …`; the exit code follows it
//   · an assertion that throws is a failure with the error, never a crash: the report line prints
//
//   const t = harness('the engine builds what the sentence says');
//   t.section('places');
//   t.is('what', got, want);        strict equality
//   t.same('what', got, want);      deep equality (stable JSON)
//   t.ok('what', truthy);
//   t.throws('what', () => fn(), /message/);
//   await t.done();                 the report line; sets process.exitCode
export function harness(proves, argv = process.argv.slice(2)) {
  const onlyArg = (() => { const i = argv.indexOf('--section'); return i >= 0 ? argv[i + 1] : null; })();
  const quiet = argv.includes('--quiet');
  let ok = 0, bad = 0, n = 0, skipping = false, ran = 0;
  const failures = [];
  // deep equality by a stable JSON: keys sorted, a cycle (a live document pointing back at its parent) written as its uuid or id
  const stable = (v) => {
    const seen = new WeakSet();
    return JSON.stringify(v, (k, x) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return x;
      if (seen.has(x)) return x.uuid ?? x.id ?? '[circular]';
      seen.add(x);
      return Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]]));
    });
  };
  const say = (line) => { if (!quiet) console.log(line); };
  const report = (what, pass, detail = '') => {
    if (skipping) return pass;
    if (pass) ok++; else { bad++; failures.push(`${current}: ${what}${detail}`); }
    say(`  ${pass ? '✓' : '✗'} ${what}${pass ? '' : detail}`);
    return pass;
  };
  let current = '';
  const t = {
    /** start a section; returns false when `--section` skips it (so a check can skip its setup too) */
    section(name) {
      n++;
      current = name;
      skipping = onlyArg !== null && String(n) !== onlyArg && !name.toLowerCase().includes(onlyArg.toLowerCase());
      if (!skipping) { ran++; say(`\n${n}. ${name}`); }
      return !skipping;
    },
    get skipping() { return skipping; },
    is: (what, got, want) => report(what, Object.is(got, want) || got === want, ` — got ${fmt(got)}, wanted ${fmt(want)}`),
    same: (what, got, want) => report(what, stable(got) === stable(want), ` — got ${stable(got)}, wanted ${stable(want)}`),
    ok: (what, cond, detail = '') => report(what, !!cond, detail ? ` — ${detail}` : ' — falsy'),
    throws(what, fn, re = null) {
      let err = null;
      try { fn(); } catch (e) { err = e; }
      if (!err) return report(what, false, ' — nothing was thrown');
      return report(what, !re || re.test(err.message), ` — threw "${err.message}"`);
    },
    /** run a step that may throw; a throw is one failure, not a crash */
    async step(what, fn) {
      try { await fn(); } catch (e) { report(what, false, ` — threw ${e.stack?.split('\n').slice(0, 2).join(' ') ?? e.message}`); }
    },
    /** the report line */
    done() {
      const partial = onlyArg !== null ? ` ⚠ PARTIAL RUN (--section ${onlyArg}: ${ran} of ${n} sections)` : '';
      if (quiet && failures.length) for (const f of failures) console.log('  ✗ ' + f);
      console.log(`\n${bad ? 'FAIL' : 'PASS'}: ${ok} of ${ok + bad}, ${proves}${partial}`);
      process.exitCode = bad ? 1 : 0;
      return !bad;
    },
  };
  return t;
}

const fmt = (v) => { try { return typeof v === 'string' ? JSON.stringify(v) : v && typeof v === 'object' ? JSON.stringify(v) : String(v); } catch { return String(v); } };
