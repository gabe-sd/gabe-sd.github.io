// Runs every suite against a server this script owns.
//
//   npm test
//
// Two things it exists for, both of which only show up with more than one
// worktree in play:
//
// The port. The suites take their base URL from BASE_URL, which used to default
// to a fixed port that whoever ran `npm run serve` happened to own. With several
// worktrees that is a shared mutable resource: one agent's suite drives another
// agent's files and goes green against the wrong checkout, silently. This starts
// a server on port 0 - the OS hands out a free one - rooted at this checkout, so
// a run can only ever test the tree it was started from.
//
// The list. Suites used to be named one by one in package.json, so every branch
// adding a game edited the same line of the same shared file. They are found by
// reading the directory instead. Order still matters, so it is defined here
// rather than left to chance: the browser suites alphabetically, then the docs
// check last, because a doc claim is only worth checking once the code it
// describes has been.
//
// BASE_URL still works and skips the built-in server, which is how you point a
// run at something else - a different checkout, or a browser you are watching.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function startServer() {
  const server = http.createServer((req, res) => {
    // Query and hash are not part of a path on disk, and a request may not climb
    // out of the checkout however it is spelled.
    const rel = decodeURIComponent(req.url.split(/[?#]/)[0]);
    let file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function suites() {
  const all = fs.readdirSync(__dirname).sort();
  const browser = all.filter((f) => f.endsWith(".test.js"));
  const docs = all.filter((f) => f === "docs-check.js");
  return [...browser, ...docs];
}

(async () => {
  const external = process.env.BASE_URL;
  const server = external ? null : await startServer();
  const base = external || `http://127.0.0.1:${server.address().port}`;
  if (!external) console.log(`serving ${ROOT} on ${base}\n`);

  let failed = null;
  for (const suite of suites()) {
    console.log(`\n──── ${suite}`);
    // spawn rather than spawnSync: the server is in this process, and a
    // synchronous child blocks the event loop it answers requests on - every
    // page load then times out with the server apparently up.
    const status = await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(__dirname, suite)], {
        stdio: "inherit",
        env: { ...process.env, BASE_URL: base },
      });
      child.on("close", resolve);
    });
    if (status !== 0) {
      failed = suite;
      break;
    }
  }

  if (server) await new Promise((r) => server.close(r));
  if (failed) {
    console.log(`\nFAILED in ${failed}`);
    process.exit(1);
  }
  console.log("\nall suites passed");
})();
