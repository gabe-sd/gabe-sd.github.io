# Tests

Mostly browser-driven checks for the games: they open real pages and assert on
real game state, because there is nothing to unit test in isolation. The one
exception is `docs-check.js`, which reads the docs instead.

The site itself still has no dependencies; these scripts are the only thing that
needs anything installed, and they are deliberately kept out of the site tree.

## Setup

```bash
npm install
```

`playwright-core` drives a browser you already have rather than downloading one.
It is pinned to exactly 1.45.0 in `package.json`. That pin was originally forced
by Node 18, where anything newer refuses to start with "Playwright requires
Node.js 20 or higher"; the dev box now runs Node 22, so the constraint is gone
and the pin is only holding the suites to the version they are known to pass
on. Moving to a current 1.x is now a normal dependency bump — run the suites
after it, since a browser-driving library is exactly the kind of dependency
whose behaviour shifts between releases.

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
- **pong.test.js** — the physics and controls: paddle collisions, wall bounces,
  scoring, the round lifecycle (serve prompt, the pause after a point, serving
  back at whoever conceded), the win condition, paddle clamping, and the hidden
  live region that carries the score to a screen reader. Then the things layered
  on top: the five difficulty presets and that switching between them leaks
  nothing, the chosen win score and its storage, and every ability — including
  the two contracts that say turning all of `AI` off gives back the old direct
  mover and turning all of `ABILITY` off gives back the plain game. It cancels
  the animation frame and steps `update()` by hand, so it does not race a live
  loop or depend on frame timing. Nothing is pinned in it at the moment — when
  something is knowingly left broken it goes in as a passing assertion describing
  the wrong behaviour, so that fixing it turns a check red and the before/after
  evidence arrives without anyone having to remember to look for it. Rewrite such
  an assertion as part of the fix rather than deleting it.
- **docs-check.js** — the odd one out. No browser, no `npm install`, and it
  asserts about prose rather than about a game: that every file path and
  function name the docs mention still resolves, and that every element id and
  `localStorage` key in the code is written down in `CLAUDE.md`. It runs last in
  `npm test`.

  It only catches what is mechanically decidable, which is about half of what
  goes stale. It cannot tell that "the menu is three buttons and Play" stopped
  being true, and a clean run is not evidence the docs are right.

  Two things were tried and dropped while writing it, both because a checker
  that cries wolf is worse than none. Checking every backticked word against the
  code flags `pkill`, `pynput`, `mouseleave` and `devicePixelRatio` — external
  names and browser APIs the repo legitimately mentions without using — so it
  only checks names written with `()`. And matching a TODO slug against merge
  commits with a bare `--grep` flags `pong-mobile-support` because
  `pong-mobile-support-entry` was merged; the pattern includes the surrounding
  quotes for that reason.

## Tuning, not testing

`ai-sweep.js` is not part of `npm test`. It measures how often Pong's ai saves a
shot, which is the number every claim about difficulty in `games/pong/DESIGN.md`
rests on. The suite guards the *range* — beatable, not hopeless — and this tells
you where inside it a change actually landed.

```bash
node tests/ai-sweep.js                       # every entry in DIFFICULTY
N=2000 node tests/ai-sweep.js                # more samples, tighter figure
node tests/ai-sweep.js '{"speed":3.5}'       # a one-off override
```

Change this rather than writing a second one. A figure produced by a differently
shaped harness cannot be compared with the ones already recorded, and comparing
them is the entire point.

## Notes

These drive input through Playwright, which is enough for ordinary clicks. For a
*new* pointer bug, reproduce with real OS-level input first — see
`CLAUDE.md` for why and how.

One known gap: Pong's pause-on-blur is covered by dispatching `blur` and
`visibilitychange`, which exercises the wiring but not the browser's delivery of
them. `bringToFront()` cannot stand in for a real focus change — tried with a
second page, with a headed browser, and with a second tab in one context, and
none of them produce a blur, a visibilitychange, or even a `document.hasFocus()`
flip, because it activates the CDP target without touching window-manager focus.
Closing that gap properly needs XTEST against the real desktop; don't spend the
time again on `bringToFront`.
