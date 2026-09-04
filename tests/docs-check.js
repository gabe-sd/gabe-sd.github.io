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
    // Nothing hidden, which is .git and also .claude/worktrees - every worktree
    // is a full checkout living inside this one, so walking into them would read
    // another branch's docs as if they were this branch's. That is not
    // hypothetical: a stale worktree holding an entry this branch just landed
    // fails the merged-entry check below, on main, immediately after merging.
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
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

// The games are whatever is in games/, never a list anyone has to extend. Every
// check below that is per-game reads this, so a new game is covered the day its
// folder exists rather than the day someone remembers to add it.
const games = fs
  .readdirSync(path.join(ROOT, "games"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// A game's own docs, plus CLAUDE.md for the things every game shares. Each game
// is held against this rather than against one shared list, which is what keeps
// two games' agents out of the same file.
const claude = read("CLAUDE.md");
const docsFor = (game) => claude + "\n" + files
  .filter((f) => f.startsWith(`games/${game}/`) && f.endsWith(".md"))
  .map((f) => read(f))
  .join("\n");

// 3. The page contract is a list of ids other files depend on, so the direction
//    that matters is code -> doc: an id added to a page and never written down is
//    exactly how the contract drifts. The shared ids live in CLAUDE.md and a
//    game's own in its DESIGN.md; both are in docsFor().
const badIds = games.flatMap((game) => {
  const page = path.join("games", game, "index.html");
  if (!fs.existsSync(path.join(ROOT, page))) return [];
  const doc = docsFor(game);
  return [...read(page).matchAll(/id="([\w-]+)"/g)]
    .map((m) => m[1])
    .filter((id, i, a) => a.indexOf(id) === i)
    .filter((id) => !doc.includes(`#${id}`))
    .map((id) => `${game}:#${id}`);
});
check("every id in a game page is in the page contract", badIds, "undocumented");

// 4. Same direction for stored data. A localStorage key is a promise about the
//    user's browser, and the game's own doc is where that promise is recorded.
//    A key is recognised by the game name in front of the dot, and the names come
//    from the folders: `flappy-bird` owns `flappy.`, `tic-tac-toe` owns `tic.`.
const prefixes = games.map((g) => g.split("-")[0]);
const badKeys = games.flatMap((game) => {
  const prefix = game.split("-")[0];
  const doc = docsFor(game);
  return [...code.matchAll(/["'`]([a-z]+\.[A-Za-z]+)[.`"']/g)]
    .map((m) => m[1])
    .filter((k) => k.startsWith(prefix + "."))
    .filter((k, i, a) => a.indexOf(k) === i)
    .filter((k) => !doc.includes(k));
});
check("every storage key is documented", badKeys, "undocumented");

// 4b. The check above can only see a key whose prefix matches the game's folder,
//     so a game storing under some other name would be checked against nothing at
//     all and pass in silence. What is decidable is the other direction: a game
//     that reaches for localStorage has to have written down a key of its own.
const undocumentedStores = games.filter((game) => {
  const script = path.join("games", game, "script.js");
  if (!fs.existsSync(path.join(ROOT, script))) return false;
  if (!read(script).includes("localStorage")) return false;
  const prefix = game.split("-")[0];
  return !new RegExp(`\\b${prefix}\\.[A-Za-z]`).test(docsFor(game));
});
check("every game that stores data documents a key", undocumentedStores, "silent");

// 5. Entries are deleted as they land, and a slug is a branch name, so a slug with
//    a merge commit behind it is work already done. Every TODO.md counts: the root
//    one and each game's own. Reading only the root would make this pass on
//    nothing the moment the per-game files appeared.
const todos = files.filter((f) => f === "TODO.md" || f.endsWith("/TODO.md"));
const slugs = todos.flatMap((f) =>
  [...read(f).matchAll(/^### ([a-z0-9-]+)/gm)].map((m) => `${f}:${m[1]}`)
);
//    The quotes in the pattern matter: without them `pong-mobile-support` matches
//    the merge of `pong-mobile-support-entry`, which landed the note, not the work.
//    The optional prefix is there because a worktree branch is created as
//    `worktree-<slug>`, and a merge of one is still that entry landing.
const landed = slugs.filter((entry) => {
  const slug = entry.split(":")[1];
  const log = execFileSync(
    "git",
    //  -E so the optional prefix needs no backslashes: a template literal eats
    //  them, which silently turned the group into three literal characters and
    //  made this check pass on everything.
    ["log", "--all", "--oneline", "--merges", "-E",
     `--grep=Merge branch '(worktree-)?${slug}'`],
    { cwd: ROOT, encoding: "utf8" }
  );
  return log.trim().length > 0;
});
check("no TODO entry has already been merged", landed, "landed");

// 6. A game with no TODO.md is fine - it means nothing is open. A TODO.md in a
//    folder that owns no backlog is not: it is a list nobody will find. The
//    folders that own one are the games, plus design/, which is the art
//    director's - the visual layer belongs to every game and therefore to none of
//    them, so its backlog cannot live in a game folder.
const TODO_OWNERS = ["design"];
const strayTodos = todos
  .filter((f) => f !== "TODO.md")
  .filter((f) => {
    const [dir, sub] = f.split("/");
    if (dir === "games") return !games.includes(sub || "");
    return !TODO_OWNERS.includes(dir);
  });
check("every per-game TODO.md sits in a game folder", strayTodos, "stray");

// 7. The seat router. The first thing an agent does here is read its own seat's
//    file, and check 1 cannot guard that pointer: it only matches paths with a
//    directory in them, so a bare `WORKER.md` at the root is prose to it. Rename
//    or delete one and the router points nowhere, leaving the next worker with no
//    rule telling it to take a worktree - which is the failure that put this
//    check here.
//
//    It reads the router section rather than the whole file, because the whole
//    file mentions both names in passing and the first version of this check
//    passed with the router bullet deleted. Anchoring on the heading means a
//    reworded router still passes and a renamed heading fails loudly, which is
//    the right way round: the heading is part of what an agent is told to look
//    for.
const ROUTER_HEADING = "## Which seat are you?";
const routerStart = claude.indexOf(ROUTER_HEADING);
const router =
  routerStart === -1
    ? ""
    : claude.slice(routerStart).split(/\n## /)[0];
const brokenRouter = (routerStart === -1 ? [ROUTER_HEADING] : []).concat(
  ["WORKER.md", "INTEGRATOR.md", "ART-DIRECTOR.md"].filter(
    (f) => !files.includes(f) || !router.includes(`\`${f}\``)
  )
);
check("CLAUDE.md routes to a seat file that exists", brokenRouter, "unrouted");

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
