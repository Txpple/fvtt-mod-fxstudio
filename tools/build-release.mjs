#!/usr/bin/env node
// Build the release zip for a GitHub release (CLAUDE.md "Release ritual"), from the repo root:
//
//   node tools/build-release.mjs
//
// Then attach BOTH assets, the zip and a bare copy of module.json:
//   gh release create vX.Y.Z --title "vX.Y.Z - short phrase" --notes-file dist/RELEASE-NOTES.md \
//     dist/fvtt-mod-fxstudio.zip module.json
//
// ⚠ The notes are HAND-WRITTEN in dist/ (gitignored) for a public page. Never point gh at an
// internal document (NEXT-SESSION, BACKLOG, DESIGN): they hold the working knowledge, not notes.
//
// The ten offline checks run first and are a precondition of the build: a release built from a tree
// that fails them is not a release, and there is no skip flag on purpose (they take seconds). The zip
// itself is the family's builder, tools/build-module-zip.mjs in the suite folder this clone sits in
// (or FXS_SUITE): it checks module.json's version against its download URL, packs scripts/, styles/,
// module.json, LICENSE and README.md, plus recipes/ (the corpus the module FETCHES at boot, with the
// GPL-3 stock's own licence, recipes/STOCK-LICENSE, riding beside it, as ruled), writes forward-slash
// entries, refuses CRLF files and reads the archive back: every entry equal to the tree, every
// relative import resolving inside it.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fail = (msg) => {
  console.error(`build-release: ${msg}`);
  process.exit(1);
};

const CHECKS = ["check-imports", "check-layers", "check-legacy", "check-gates", "check-moments",
  "check-contract", "check-fx", "check-engine", "check-reader", "check-build"];
for (const check of CHECKS) {
  console.log(`gate: ${check}`);
  try {
    const out = execFileSync(process.execPath, [join(repo, "tools", `${check}.mjs`)], { cwd: repo, encoding: "utf8" });
    console.log(out.trimEnd().split("\n").at(-1));
  } catch (err) {
    process.stdout.write(err.stdout ?? "");
    process.stderr.write(err.stderr ?? "");
    fail(`tools/${check}.mjs failed - refusing to build a release from this tree`);
  }
}

if (!existsSync(join(repo, "recipes", "STOCK-LICENSE"))) {
  fail("recipes/STOCK-LICENSE is missing - the GPL-3 stock cannot ship without its licence");
}

const suite = resolve(process.env.FXS_SUITE ?? join(repo, ".."));
const builder = join(suite, "tools", "build-module-zip.mjs");
if (!existsSync(builder)) fail(`the family's builder is not at ${builder}; set FXS_SUITE to the suite folder`);

const { version } = JSON.parse(readFileSync(join(repo, "module.json"), "utf8"));
try {
  execFileSync(process.execPath, [builder, repo, "--tag", `v${version}`, "--include", "recipes"], { stdio: "inherit" });
} catch {
  fail("the zip did not build");
}
