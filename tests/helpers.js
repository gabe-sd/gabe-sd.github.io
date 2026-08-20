const { chromium } = require("playwright-core");

// Both overridable so the suites are not tied to one machine's browser or port.
const BASE_URL = process.env.BASE_URL || "http://localhost:8934";
const CHROME = process.env.CHROME || "/snap/bin/chromium";

function launch() {
  return chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-gpu"],
  });
}

function url(path) {
  return BASE_URL + path;
}

// Tiny assertion collector: prints as it goes, exits non-zero if anything failed.
function makeChecks() {
  const results = [];
  function check(name, cond, detail) {
    results.push({ name, ok: !!cond });
    console.log(
      `  ${cond ? "PASS" : "FAIL"}  ${name}` +
      (detail !== undefined ? `  [${detail}]` : "")
    );
  }
  function report() {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    return failed.length ? 1 : 0;
  }
  return { check, report };
}

// Minesweeper stores no state between reveals until the first click, so tests
// drive the globals directly - see "Scripts are classic, not modules" in CLAUDE.md.
const NEIGHBOURS = `
  function nb(r, c) {
    const o = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) o.push([nr, nc]);
    }
    return o;
  }
`;

module.exports = { launch, url, makeChecks, NEIGHBOURS, BASE_URL, CHROME };
