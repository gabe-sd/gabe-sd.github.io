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

```bash
npm test            # nothing to start first
```

`tests/run-all.js` is what that runs. It serves *this* checkout on a port the OS
picks, runs every `*.test.js` in this directory alphabetically and then
`docs-check.js`, and stops at the first failing suite with a non-zero exit.

Two things follow from it owning the server. Adding a suite means adding the file
and nothing else — there is no list to extend, which is what keeps two branches
adding two games out of the same line of `package.json`. And a run can only test
the tree it was started from: the old fixed port belonged to whoever ran
`npm run serve`, so with several worktrees in play a suite could drive another
checkout's files and pass against the wrong code. That happened.

A suite run on its own has no such server, so give it one — either `npm run serve`
in another shell, which is the 8934 that `BASE_URL` defaults to, or point it
somewhere else. In a worktree use `PORT=0 npm run serve` instead, which takes a
free port rather than the shared checkout's, and pass that port in `BASE_URL`:

```bash
BASE_URL=http://localhost:3000 CHROME=/usr/bin/chromium node tests/chording.test.js
```

`BASE_URL` also works on `npm test`, where it skips the built-in server entirely.

`CHROME` defaults to `/snap/bin/chromium`.

## What they cover, and why

Each suite says what it asserts. What follows is only what the files cannot say
about themselves.

- **contract.test.js** — the page contract, the shared frame, and the hub having
  a card for every game folder and no card for anything else. It is the one suite
  that asserts about games it does not own, which is why it only ever tests the
  contract and never how a game plays. What it covers is found by reading `games/`
  and each game's own `script.js` — which games exist, which are key-driven — so a
  new game is covered the day its folder exists.
- **chording.test.js** — the middle-click chord. **Case 2 must not be deleted:**
  it moves the pointer while the button is held. That bug reached `main` twice
  because synthetic clicks never move, so a still-pointer test passes against code
  that is broken for every real human.
- **flappy-bird.test.js** — the flight model, the pipe stream and the stored best
  score. **Case 17 must not be deleted:** a clicked button holds the focus and a
  focused button eats the Space bar, which shipped as a game that stopped
  responding to Space the moment you opened How to play.
- **pong.test.js** — the physics, the round lifecycle, the ai, the presets and
  every ability. Nothing is pinned in it at the moment; when something is
  knowingly left broken it goes in as a passing assertion describing the wrong
  behaviour, so that fixing it turns a check red. Rewrite such an assertion as
  part of the fix rather than deleting it.
- **sudoku-puzzles.test.js** — no browser. It is the only place in this repo a
  Sudoku solver exists, which is what lets the game ship a fixed set without
  carrying one; see "Puzzle data" in `games/sudoku/DESIGN.md`.
- **instructions-panel.test.js**, **best-time.test.js** and **sudoku.test.js** —
  the How to play toggle and `#status` carrying game state only, the locally
  stored personal best including the path where `localStorage` throws, and
  Sudoku's gameplay.
- **docs-check.js** — the odd one out: no browser, no `npm install`, and it
  asserts about prose. It runs last, because a doc claim is only worth checking
  once the code it describes has been. **It skips hidden directories**, which
  matters more than it sounds: worktrees live at `.claude/worktrees/<name>` inside
  the checkout they were made from, so walking into one reads another branch's
  docs as this one's. Two widenings were tried and dropped, both because a checker
  that cries wolf is worse than none: checking every backticked word flags
  `pkill` and `devicePixelRatio`, names the repo mentions without using, so it
  only checks names written with `()`; and matching a slug with a bare `--grep`
  flagged `pong-mobile-support` because `pong-mobile-support-entry` had merged,
  which is why the pattern includes the closing quote or colon. It catches only
  what is mechanically decidable, about half of what goes stale — a clean run is
  not evidence the docs are right.

## Tuning, not testing

`ai-sweep.js` is not part of `npm test`. It measures how often Pong's ai saves a
shot, which is the number every claim about difficulty in `games/pong/DESIGN.md`
rests on. The suite guards the *range* — beatable, not hopeless — and this tells
you where inside it a change actually landed.

Being outside `npm test` has a consequence worth stating outright: **nothing
checks that these two files still run.** A green suite says nothing about
`ai-sweep.js` or `volley-sweep.js`, so an edit that leaves either unable to start
— a stray backtick in a template literal, a rename half-applied — is invisible
until somebody reaches for the tool, which may be weeks later and will be
somebody deciding something. Run the sweep you touched after editing it, and
`node --check` first if the edit was to a string or a template. That applies to
edits which change no measurement at all: reformatting the output is exactly the
kind of change that feels too safe to re-run.

```bash
node tests/ai-sweep.js                       # every entry in DIFFICULTY
N=2000 node tests/ai-sweep.js                # more samples, tighter figure
node tests/ai-sweep.js '{"speed":3.5}'       # a one-off override
REACH=1 node tests/ai-sweep.js               # and whether *you* could reach it
```

Two kinds of number come out of these, and only one of them should reproduce.
`REACH=1`'s limit columns are a binary search and deterministic: run from a
different checkout on a different port and they come back identical to the
hundredth, which they did three times over — 17.27/14.24, 14.99/13.57,
14.24/12.95. If those ever differ between runs, that is a real signal and worth
chasing. Everything else samples: the saves percentages, the tunnelled count, and
every volley-sweep figure move a few percent run to run, and comparing two of them
proves nothing on its own. Neither sweep's output says which is which, so a reader
handed one row cannot tell.

`REACH=1` answers the question the saves figure cannot — whether *you* could have
reached the ball, rather than whether the ai did. It reports a limit rather than a
pass rate, and a separate column says whether the ball ever beat a paddle pinned
exactly on the intercept, which would be tunnelling and a bug. What the columns
mean and what they measured is in `games/pong/DESIGN.md`, "Whether you could have
reached it".

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

A headless screenshot is a different thing from the X11-root capture `CLAUDE.md`
warns off — it never touches the real display, so it works on this machine and is
how a visual change gets checked without a headed browser:

```js
const { chromium } = require('<repo>/node_modules/playwright-core');
const b = await chromium.launch({ executablePath: '/snap/bin/chromium',
                                  args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1240, height: 900 },
                            deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts && document.fonts.ready);
await p.screenshot({ path: out, fullPage: true });
```

Snap Chromium is confined and cannot read files under `/home/g/.claude/`, so the
page being shot has to sit inside the project directory. And a screenshot only
proves what it shows — force any hover, `data-` state or motion frame before the
shot, or it is a picture of the resting page.

**`deviceScaleFactor: 2` is for reading detail, never for judging a game.** It
doubles every dimension, so a 10px paddle arrives 20px wide and a resampled edge
arrives smoothed across four pixels instead of two. Pong's redesign was checked
entirely that way and passed every look while the real page was rendering the
game into the background — see `games/pong/DESIGN.md`, "The canvas is drawn 1:1".

Three rules came out of it, and they are cheap:

- **Judge at `deviceScaleFactor: 1`**, at a realistic window width, full page.
  Shoot at 2x afterwards if you need to read something small.
- **Let the real loop run.** Click the real buttons, press the real keys, wait,
  then capture. A hand-posed frame with `running = false` proves that `draw()`
  can draw; it proves nothing about what a player sees.
- **Measure the thing you are claiming.** "Is the paddle visible" is a claim
  about a rendered pixel, so read that pixel — with the effect on and off, at
  every position the paddle can reach. Two of this session's fixes were sized
  that way and one was abandoned because the numbers said it cost more than it
  gave.
