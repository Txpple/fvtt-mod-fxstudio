// By the Books' contract against what this module reads of it. By the Books records what it publishes
// in its own repo (contracts/moment.json: the bythebooks.* hooks, each word's and each record's payload
// fields; contracts/card-flags.json: its flag keys), and this reads those files from its clone beside
// this one (FXS_BYTHEBOOKS names another place): every word and record scripts/readers/bythebooks.js
// matches must be in the contract, every payload field it touches (`READS`) a field the contract names
// for those words, the one card flag the gate reads a key the contract records, and the versions the
// ones contracts/consumes.json names. `READS` is held to the reader's code first: a field the code
// touches that the list does not name fails. With no By the Books clone the contract half is skipped,
// saying so. Offline, a second.
//   node tools/check-contract.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BYTHEBOOKS, REPO, toUrl } from './lib/env.mjs';

const { READS, DECLINED } = await import(toUrl(join(REPO, 'scripts/readers/bythebooks.js')));
const { BYTHEBOOKS_RECORDS, BYTHEBOOKS_WORDS } = await import(toUrl(join(REPO, 'scripts/core/moments.js')));

let ok = 0, bad = 0;
const is = (what, pass, why = '') => { pass ? ok++ : bad++; console.log(`  ${pass ? '✓' : '✗'} ${what}${pass || !why ? '' : ` — ${why}`}`); };
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const consumes = readJson(join(REPO, 'contracts', 'consumes.json'));
const wants = (contract) => consumes.consumes.find((c) => c.emitter === 'fvtt-mod-bythebooks' && c.contract === contract);
const momentWant = wants('moment');
const flagsWant = wants('card-flags');

console.log('what the reader touches, against its own list');
const src = readFileSync(join(REPO, 'scripts/readers/bythebooks.js'), 'utf8');
const touched = new Set();
for (const m of src.matchAll(/\bpayload\??\.(\w+)(?:\??\.(\w+))?/g)) touched.add(m[1] === 'details' && m[2] ? `details.${m[2]}` : m[1]);
for (const m of src.matchAll(/\brow\??\.(\w+)/g)) touched.add(`targets[].${m[1]}`);
touched.delete('details');
const listed = new Set([...READS.envelope, ...READS.details]);
const unlisted = [...touched].filter((f) => !listed.has(f));
is('every payload field the reader touches is in READS', unlisted.length === 0, `not listed: ${unlisted.join(', ')}`);
const flagReads = [...src.matchAll(/flags\?\.\[(?:MODULE|LEGACY)\]\?\.(\w+)\?\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`);
const flagListed = Object.entries(READS.flags).flatMap(([k, fs]) => fs.map((f) => `${k}.${f}`));
is('every card flag the gate reads is in READS.flags', flagReads.every((f) => flagListed.includes(f)), `read: ${flagReads.join(', ')}`);
is('consumes.json names the words the reader plays', JSON.stringify(momentWant?.events) === JSON.stringify(BYTHEBOOKS_WORDS), `consumes ${JSON.stringify(momentWant?.events)}`);
is('and the records it reads under a word it otherwise skips', JSON.stringify(momentWant?.records) === JSON.stringify(Object.keys(BYTHEBOOKS_RECORDS)), `consumes ${JSON.stringify(momentWant?.records)}`);
is('and the card flags', JSON.stringify(flagsWant?.keys) === JSON.stringify(READS.flags), `consumes ${JSON.stringify(flagsWant?.keys)}`);

const MOMENT = join(BYTHEBOOKS, 'contracts', 'moment.json');
const FLAGS = join(BYTHEBOOKS, 'contracts', 'card-flags.json');
if (!existsSync(MOMENT)) {
  console.log(`\nSKIP the contract: no ${MOMENT} (clone fvtt-mod-bythebooks beside this repo, or set FXS_BYTHEBOOKS)`);
} else {
  const contract = readJson(MOMENT);
  console.log(`\nBy the Books' moment contract (version ${contract.version}, ${contract.recorded?.suites?.length ?? 0} suites recorded)`);
  is(`the version is the one consumes.json names (${momentWant.version})`, contract.version === momentWant.version,
    `By the Books publishes version ${contract.version}: re-read its contracts/moment.json against readers/bythebooks.js, then set the version in contracts/consumes.json`);
  for (const word of BYTHEBOOKS_WORDS) is(`"${word}" is a word By the Books publishes`, !!contract.events?.[word], 'not in its events');
  for (const pair of Object.keys(BYTHEBOOKS_RECORDS)) {
    const [event, kind] = pair.split('|');
    is(`"${kind}" is a record publishing "${event}"`, !!contract.kinds?.[kind]?.events?.includes(event), `its kinds say ${JSON.stringify(contract.kinds?.[kind]?.events)}`);
  }
  const pairs = Object.keys(contract.moments ?? {}).filter((p) => BYTHEBOOKS_WORDS.includes(p.split('|')[0]) || p in BYTHEBOOKS_RECORDS);
  const fields = new Set(pairs.flatMap((p) => contract.moments[p].fields ?? []));
  if (!fields.size) {
    console.log('  · no recorded payload for the words read yet: the field checks wait for By the Books\' recording run');
  } else {
    console.log(`  · ${pairs.length} recorded pair(s) for the words read: ${pairs.join(', ')}`);
    for (const f of [...READS.envelope, ...READS.details]) is(`the payload carries ${f}`, fields.has(f), 'not a field of any recorded pair this reader reads');
    const examples = (name) => new Set(pairs.flatMap((p) => exampleValues(contract.moments[p].details, name)));
    const answers = examples('answer');
    const outcomes = examples('outcome');
    console.log(`  · answers recorded: ${[...answers].sort().join(', ') || '(none)'}; outcomes: ${[...outcomes].sort().join(', ') || '(none)'}`);
    const known = [...DECLINED.answer, ...DECLINED.outcome];
    for (const v of [...answers, ...outcomes].filter((v) => !known.includes(v))) console.log(`  · "${v}" is read as a resolve that happened`);
  }
}

if (!existsSync(FLAGS)) {
  console.log(`\nSKIP the card flags: no ${FLAGS}`);
} else {
  const flags = readJson(FLAGS);
  console.log(`\nBy the Books' card-flag contract (version ${flags.version})`);
  is(`the version is the one consumes.json names (${flagsWant.version})`, flags.version === flagsWant.version,
    `By the Books publishes version ${flags.version}: re-read its contracts/card-flags.json against the gate, then set the version in contracts/consumes.json`);
  for (const [key, want] of Object.entries(READS.flags)) {
    const k = flags.keys?.[key];
    is(`"${key}" is a key By the Books writes`, !!k, 'not in its keys');
    if (k?.recorded) for (const f of want) is(`"${key}" carries ${f}`, k.fields.includes(f), `its fields: ${k.fields.join(', ')}`);
    else if (k) console.log(`  · "${key}" has no recorded shape yet`);
  }
}

/** the observed values of a details field, off a recorded schema's examples */
function exampleValues(details, name) {
  return details?.properties?.[name]?.examples ?? [];
}

console.log(`\n${bad ? 'FAIL' : 'PASS'}: ${ok} of ${ok + bad}, what this module reads of By the Books is in its contract`);
process.exit(bad ? 1 : 0);
