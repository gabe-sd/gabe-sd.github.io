# Tests

Browser-driven checks for the games. They open real pages and assert on real
game state — there is nothing to unit test in isolation.

The site itself still has no dependencies; these scripts are the only thing that
needs anything installed, and they are deliberately kept out of the site tree.

## Setup

```bash
npm install
```

`playwright-core` drives a browser you already have rather than downloading one.
It is pinned to exactly 1.45.0 in `package.json`, the last release that runs on
Node 18 — a range like `^1.45` resolves to a current 1.x that refuses to start
with "Playwright requires Node.js 20 or higher".

## Running

Serve the site, then run the suites:

```bash
npm run serve &     # http.server on 8934, the port the tests expect
npm test
```

`npm test` stops at the first failing suite and exits non-zero. Individual
suites run standalone too (`node tests/chording.test.js`). Override the defaults
if your setup differs:

```bash
BASE_URL=http://localhost:3000 CHROME=/usr/bin/chromium node tests/chording.test.js
```

`CHROME` defaults to `/snap/bin/chromium`.

## What they cover, and why

- **chording.test.js** — the middle-click chord. Case 2 is the important one: it
  moves the pointer while the button is held. That bug reached `main` twice
  because synthetic clicks never move, so a still-pointer test passes against
  code that is broken for every real human. Do not delete that case.
- **instructions-panel.test.js** — the How to play toggle, and the rule that
  `#status` reports game state only. Also asserts the board does not shift when
  the status text changes.
- **best-time.test.js** — the locally stored personal best: recording it,
  clearing it from the gear panel (including that one click only arms the reset
  and closing the panel abandons it), and the path where `localStorage` throws
  (private windows, blocked site data), which would otherwise break the page on
  load.

These drive input through Playwright, which is enough for ordinary clicks. For a
*new* pointer bug, reproduce with real OS-level input first — see
`CLAUDE.md` for why and how.
