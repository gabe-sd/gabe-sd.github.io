// Checks the docs against the code. Not a browser test and not part of `npm test`
// in spirit - it asserts that CLAUDE.md, TODO.md and the DESIGN.md files still
// describe the repo they are in.
//
//   node tests/docs-check.js
//
// Deliberately free of `require("playwright-core")` so it runs on a bare clone
// with no `npm install`. It reads text; it does not need a browser.
//
// It only checks things that are mechanically decidable, which is roughly half of
// what actually goes stale. It cannot tell that "the menu is three buttons and
// Play" stopped being true - only a reader catches a sentence. Do not mistake a
// pass here for the docs being right.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const results = [];

function check(name, bad, hint) {
  const ok = bad.length === 0;
  results.push(ok);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}` + (ok ? "" : `\n        ${hint}: ${bad.join(", ")}`));
}

// Every .md in the repo, and every .js/.html/.css it could be talking about.
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name === ".git") continue;
    if (e.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
};
const files = walk(".").map((f) => f.replace(/^\.\//, ""));
const docs = files.filter((f) => f.endsWith(".md"));
const code = files
  .filter((f) => /\.(js|html|css)$/.test(f))
  .map((f) => read(f))
  .join("\n");
const allDocs = docs.map((d) => read(d)).join("\n");

// 1. A doc naming a file that does not exist sends a reader nowhere. Only paths
//    with a directory in them - bare "script.js" is prose, not a reference - and
//    not ones starting with a dot, which are a game page's own relative links
//    ("../../shared.css") quoted as examples rather than paths from the root.
const badPaths = [...allDocs.matchAll(/`([\w-]+[\w.-]*\/[\w./-]+\.\w+)`/g)]
  .map((m) => m[1])
  .filter((p, i, a) => a.indexOf(p) === i)
  .filter((p) => !fs.existsSync(path.join(ROOT, p)));
check("every file path named in a doc exists", badPaths, "missing");

// 2. Backticked names ending in () are unambiguously code. Anything without them
//    is too often an English word to check without false alarms.
const badFns = [...allDocs.matchAll(/`([A-Za-z_][\w.]*)\(\)`/g)]
  .map((m) => m[1].split(".").pop())
  .filter((n, i, a) => a.indexOf(n) === i)
  .filter((n) => !new RegExp(`\\b${n}\\b`).test(code));
check("every function a doc names still exists", badFns, "gone");

// 3. The page contract in CLAUDE.md is a list of ids other files depend on, so
//    the direction that matters is code -> doc: an id added to a page and never
//    written down is exactly how the contract drifts.
const claude = read("CLAUDE.md");
const badIds = files
  .filter((f) => f.startsWith("games/") && f.endsWith("index.html"))
  .flatMap((f) => [...read(f).matchAll(/id="([\w-]+)"/g)].map((m) => m[1]))
  .filter((id, i, a) => a.indexOf(id) === i)
  .filter((id) => !claude.includes(`#${id}`));
check("every id in a game page is in the page contract", badIds, "undocumented");

// 4. Same direction for stored data. A new localStorage key is a promise about
//    the user's browser, and CLAUDE.md is where that promise is recorded.
const badKeys = [...code.matchAll(/["'`]([a-z]+\.[A-Za-z]+)[.`"']/g)]
  .map((m) => m[1])
  .filter((k) => /^(minesweeper|pong|chess|tic|flappy)\./.test(k))
  .filter((k, i, a) => a.indexOf(k) === i)
  .filter((k) => !claude.includes(k));
check("every storage key is documented", badKeys, "undocumented");

// 5. TODO.md says to delete entries as they land, and a slug is a branch name, so
//    a slug with a merge commit behind it is work already done.
const slugs = [...read("TODO.md").matchAll(/^### ([a-z0-9-]+)/gm)].map((m) => m[1]);
//    The quotes in the pattern matter: without them `pong-mobile-support` matches
//    the merge of `pong-mobile-support-entry`, which landed the note, not the work.
const landed = slugs.filter((s) => {
  const log = execFileSync(
    "git", ["log", "--all", "--oneline", "--merges", `--grep=Merge branch '${s}'`],
    { cwd: ROOT, encoding: "utf8" }
  );
  return log.trim().length > 0;
});
check("no TODO entry has already been merged", landed, "landed");

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
