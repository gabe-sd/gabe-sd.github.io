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

- **contract.test.js** — the page contract, held against every game found by
  reading `games/` rather than against a list: the three shared ids, `shared.css`
  linked before the game's own, the link home, and a page that loads clean. Also
  that the hub has a card for every game folder and no card for anything else,
  since adding a game is two steps and nothing else checks that both happened.
  It is the one suite that asserts about games it does not own, which is why it
  only ever tests the contract and never how a game plays.

  Also the focus-handback clause, for whichever games are key-driven - found by
  reading each game's own `script.js` for a document/window-level keydown,
  keyup or keypress listener, not by naming games. Every in-scope button (its
  own control buttons, not the board's cells and not a `role="radio"` settings
  selector) gets a real click and, where it survives one, a real keyboard
  Enter, and `document.activeElement` is checked against it either way - the
  outcome, not whether the code happens to call `releaseFocus`. This is what
  would have caught Sudoku shipping a New Puzzle button that kept the focus
  after being clicked, letting the very next Space or Enter re-fire it and
  silently replace the board.
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
  on top: the difficulty presets and that switching between them leaks
  nothing, the chosen win score and its storage, and every ability — including
  the two contracts that say turning all of `AI` off gives back the old direct
  mover and turning all of `ABILITY` off gives back the plain game. It cancels
  the animation frame and steps `update()` by hand, so it does not race a live
  loop or depend on frame timing. Nothing is pinned in it at the moment — when
  something is knowingly left broken it goes in as a passing assertion describing
  the wrong behaviour, so that fixing it turns a check red and the before/after
  evidence arrives without anyone having to remember to look for it. Rewrite such
  an assertion as part of the fix rather than deleting it.
- **sudoku.test.js** — gameplay: selecting an editable cell (a given cell
  cannot be selected), filling it via keyboard or the number pad, that a digit
  duplicating a row/column/box peer is marked wrong and the marker clears with
  the digit, the win condition, and that Restart keeps the same puzzle while
  New puzzle moves to a different one.
- **sudoku-puzzles.test.js** — no browser. Runs a backtracking solver once per
  bundled puzzle to check it is well-formed, that `givens` agrees with
  `solution`, and — the reason this suite exists — that each puzzle has
  exactly one solution. This is the only place in the game a Sudoku solver
  exists; see "Puzzle data" in `games/sudoku/DESIGN.md`.
- **flappy-bird.test.js** — the flight model and everything hanging off it:
  that nothing moves before the first flap, that a flap sets the climb rather
  than adding to it, gravity and its terminal speed, the ceiling holding the
  bird where the ground kills it, scoring a pipe exactly once, the pipe stream
  staying evenly spaced and reachable, the lockout that stops the flap already
  in flight from restarting a dead run, and the stored best score including the
  path where `localStorage` throws. Case 17 is the one to keep: a clicked button
  holds the focus and a focused button eats the Space bar, which shipped as a
  game that stopped responding to Space the moment you opened How to play. It also asserts that the same span of real
  time produces the same flight whether it arrives as one long frame or ten
  short ones, which is the whole reason the loop is a fixed timestep. Like
  `pong.test.js` it cancels the animation frame and steps `update()` by hand.

- **docs-check.js** — the odd one out. No browser, no `npm install`, and it
  asserts about prose rather than about a game: that every file path and function
  name the docs mention still resolves; that every element id and `localStorage`
  key in a game's code is written down in that game's own `DESIGN.md` (the shared
  ids live in `CLAUDE.md`); that a game which stores anything has documented a key
  at all; and that no `TODO.md` entry has a merge commit behind it already. It
  finds the games by reading `games/`, so a new one is covered the day its folder
  exists rather than the day someone extends a list. It runs last in `npm test`,
  because a doc claim is only worth checking once the code it describes has been.

  It skips hidden directories, which matters more than it sounds: worktrees live
  at `.claude/worktrees/<name>` inside the checkout they were made from, and each
  is a full copy of the repo. Walking into them reads another branch's docs as if
  they were this one's.

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

`REACH=1` answers the question the saves figure cannot, and which
`games/pong/DESIGN.md` calls this harness's blind spot: it only ever asks whether
the *ai* got a paddle to the ball. The reach columns fire the shot the other way
at a perfectly driven paddle, and report the ball speed at which the worst shot
a mode can produce stops being reachable at `PADDLE_SPEED` — a limit rather than
a pass rate, because every mode saves 100% of ordinary shots and that number
moves for nothing. A separate column says whether the ball ever beat a paddle
pinned exactly on the intercept, which would be tunnelling and a bug.

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
