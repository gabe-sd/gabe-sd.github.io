# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A static game arcade: plain HTML/CSS/JS with no build step, no framework, and no
runtime dependencies. Files are served as-is. The only dependency in the repo is
`playwright-core`, used by the browser tests and nothing else — keep it that way,
and never make the site itself need a build or a package install to run.

The repo is named `gabe-sd.github.io`, which makes it a GitHub Pages *user* site:
it deploys from `main` to the domain root, `https://gabe-sd.github.io/`, not to a
`/<repo>/` subpath. Every path in the site is relative (`shared.css`,
`../../index.html`), so nothing depends on that prefix either way — keep it
relative, and a future rename stays a non-event.

Known gaps and unscheduled work live in `TODO.md`. Check it before starting
something new, and delete entries there as they land rather than marking them
done — git history is the record of what happened.

## As simple as possible, but as complex as it needs to be

The guiding principle here, and the reason this repo has no build step, no
framework and one dependency.

Both halves do work. The first rejects machinery whose cost outruns its benefit at
this size: continuous integration was considered and dropped because the whole
suite runs in fourteen seconds and can simply be run, and a file of completed
`TODO.md` entries was dropped because the deletion diff already is one. The second
is what stops that becoming an excuse to under-build: Pong's fixed timestep is more
machinery than scaling movement by a frame delta, and earns it by keeping the
simulation deterministic and `update()` free of any notion of time; its loop guards
scheduling on a `running` flag rather than on `rafId` being null because the
simpler version silently restarted the loop underneath the test harness.

The test is the same in both directions: **name what breaks if this were simpler.**
A concrete answer justifies the complexity. No answer means take it out.

## Work on a branch, never on main

Any new feature or fix starts with a branch — `git checkout -b <short-name>`
before the first edit, not after the work is done. `main` stays clean so a
half-finished change can be abandoned or set aside without unpicking it, and so
the merge commit is what records the feature (see `minesweeper-highscore` in the
history). Name it for the change, not the game alone — and when the work has a
`TODO.md` entry, the branch **is** that entry's slug, so the merge commit carries
it into history and one string finds the entry, the discussion and the diff.

If you catch yourself editing on `main`, move the work across before committing:
`git checkout -b <name>` carries uncommitted changes with it.

Two principles follow, both learned by breaking them:

- **A branch is not finished until it is merged, so keep one open at a time.**
  Unmerged work is a liability, not a safe place to leave things. Two branches
  touching the same file diverge silently, and the conflict surfaces later as a
  puzzle instead of at the moment it was created.
- **Never branch from a base that is missing work you depend on.** If the change
  builds on something unmerged, merge that first or branch from it. Cutting from
  `main` to "keep it clean" is the one option that cannot work.

A doc-only edit belonging to work already in flight rides on that branch rather
than taking its own. The rule exists so half-finished work can be abandoned and so
the merge commit records the feature; a one-commit note gets neither and pays the
stale-base cost.

## Commands

```bash
npm run serve                   # http.server on 8934, the port the tests expect
npm test                        # all browser suites; non-zero exit on failure
node tests/chording.test.js     # one suite on its own
node --check games/<name>/script.js   # syntax only - proves nothing about behaviour
```

`npm install` first (once) for the tests; see `tests/README.md`. Serve rather than
opening `file://`; relative paths work either way, but a server matches how it is
deployed.

There is no linter or build. Tests are browser-driven and live in `tests/` — they
open real pages and assert on real game state, since there is nothing meaningful
to unit test in isolation. Add a suite there when you add a game or a feature
with state worth protecting.

## Architecture

### The page contract

Every game lives in `games/<name>/` as three files (`index.html`, `style.css`,
`script.js`), plus a `DESIGN.md` once it has earned one, and is otherwise
self-contained. Adding a game means creating that
folder and a card in the root `index.html` — nothing else changes.

Each game page follows a contract that `shared.css` depends on:

- Links `../../shared.css` **first**, then its own `style.css`.
- Uses the ids `#board`, `#status`, `#restart`; games may add their own on top
  (Minesweeper has `#flag-count`, `#timer`, `#best-time`, `#help-toggle`,
  `#instructions`, and a gear button `#settings-toggle` opening `#settings`,
  which holds `#reset-best`; Pong has `#help-toggle` and `#instructions` too).
  Game scripts look these up by id, and `shared.css` styles `.page`, `.status`,
  `.hint`, `.btn` (with `.secondary` and `.icon`), `.controls`, `.back-link`
  for them.
- Treats `#status` as game state only — what just happened, or what to do next.
  Standing instructions belong in a collapsible panel (both Minesweeper and Pong
  use `#instructions`), not the status line. `shared.css` gives `.status` a reserved
  min-height so its text can change without shifting the board.
- Links back to `../../index.html`.

`shared.css` owns the theme as CSS custom properties (`--bg`, `--fg`, `--cell-bg`,
`--cell-border`, `--accent`, `--win`, `--lose`, `--muted`) which flip under
`prefers-color-scheme: dark`. Per-game stylesheets should consume these tokens
rather than hardcoding colours, so a game restyles with the theme for free.
`hub.css` applies only to the root page.

### Scripts are classic, not modules

Game scripts are loaded as plain `<script src>` — not `type="module"`. Top-level
`let`/`const`/`function` bindings therefore live in the global scope and are
reachable from devtools or a test harness. This is the main testing affordance in
the repo: you can call `restart()`, `handleFlag(r, c)`, `handleReveal(r, c)` and
read `grid`, `state`, `gameOver` directly to set up a specific position instead of
clicking a game into shape. Keep it that way — switching a game to a module would
break that.

### Per-game designs worth knowing before editing

Keep each entry to a paragraph or two of *invariants* — what a reader must not
break. When one outgrows that it has started carrying design rationale instead,
which belongs in `games/<name>/DESIGN.md` with the invariants and a pointer left
here. Pong has one; the others do not need one yet.

A design doc is only worth having if it is true, so **changing how a game plays
means updating its design doc in the same commit** — the model, and anything tried
and rejected along the way. Rejected alternatives are the most valuable thing in
there and the easiest to lose: without them the next person re-runs the experiment
and reaches the same answer a day later. Keep values out of it; those live in the
code as named constants, and a doc that repeats them is wrong the first time one is
tuned.

**Chess** (`games/chess/script.js`) is the substantial one. Legality is layered:
`generatePseudoMoves` produces moves ignoring check; `applyMove` is pure — it
returns a new `{board, castling, enPassant}` and never mutates — so
`getLegalMoves` filters by simulating each move and discarding any that leave the
mover's own king attacked. `isSquareAttacked` is the single primitive underneath
check detection, castling-through-check rules, and `isInCheck`.
`hasAnyLegalMove` is what separates checkmate from stalemate in `updateStatus`.
Changes to move rules belong in the pseudo-move layer; do not special-case
legality in the click handler.

**Pong** (`games/pong/script.js`) keeps its model, its measurements and its
rejected alternatives in `games/pong/DESIGN.md` — read that before changing how it
plays. Four things will bite you without it:

- The loop only *paces*: `advance()` drains real time into whole `TICK_MS` ticks
  and calls `update()` once per tick, so every speed constant is per tick. Nothing
  may accumulate into `ball.vy` either — `bounce()` owns velocity outright.
- Two things exist for the test harness. `update()` returns before touching the
  ball outside `phase === "play"`, so a test placing the ball must set `phase`;
  and loop scheduling is guarded by `running`, not by `rafId`, so a caller that
  cancelled the pending frame does not get it restarted underneath them.
- Pointer control is deliberately *not* rate-limited, which makes a mouse faster
  than the keys. That was fixed once and reverted on play. It looks like a bug.
- Every knob in the `AI` object documents the value that switches its feature off,
  and a test asserts that all of them off reproduces the old direct mover. Keep
  that true: it is all tuned by feel, and feel changes.

**Minesweeper** (`games/minesweeper/script.js`) places mines lazily on the first
reveal, excluding the 3x3 around that cell, so the first click is always safe —
`grid` is empty until then. `floodReveal` recurses through zero-adjacency cells.
Chording fires on middle **mousedown** (see below). The HUD counter shows flags
left to place (`MINE_COUNT - flagCount`), which is why it carries a flag icon;
the bomb icon means an actual revealed mine.

### Persisted state

The Minesweeper best time is the only stored data: one `localStorage` key,
namespaced by board configuration (`minesweeper.bestTime.9x9-10`) so adding a
difficulty later cannot compare records across board sizes. Keep it local — no
network, no accounts.

Wrap every `localStorage` access. It does not merely return `null` when
unavailable, it *throws* — in private windows, with site data blocked, and from
`file://` in some browsers — so an unguarded read at load time takes the whole
game down. `loadBestTime`/`saveBestTime`/`clearBestTime` degrade to "no record"
instead, and
`tests/best-time.test.js` covers that path by making storage throw.

The gear panel's Reset best time button clears the key. It is disabled whenever
`loadBestTime()` returns `null`, which covers both "no record yet" and "storage
unavailable" — there is nothing to clear either way, and the greyed-out button is
the whole explanation, so it carries no note. Clearing cannot be undone, so the
button is two-step: the first click arms it, the second clears. Anything else
destructive added to that panel should follow the same pattern.

Collapsible panels toggle via the `hidden` attribute, so any `display` rule on
one must be scoped to `:not([hidden])` — a display value otherwise wins over
`hidden` and the panel renders open on load.

## Verifying changes

Drive the real page and assert on game state. Reading the code and reasoning about
it is not verification, and `node --check` only catches syntax errors. Run
`npm test` before merging; add cases for what you changed.

Four principles underneath that, each of which has already paid for itself here:

- **A test that has never failed has not been shown to test anything.** Prove
  every fix by reverting to the broken code, watching the new test fail, then
  restoring and watching it pass. What that catches is not a bad fix — it is a
  test that passes for the wrong reason.
- **Characterise before you change.** Against code with no coverage, first write
  tests for what it does *now*. Every test failure while building Pong out was a
  wrong assumption of the author's rather than a regression, which is what these
  tests are mostly for: an assumption-checker first, a safety net second.
- **Assert outcomes, not mechanics.** "The ball came back" survives a rewrite of
  how movement is timed; "the ball moved six pixels" does not. A test pinned to
  the implementation has to be rewritten by the very change it was meant to guard.
- **Write down what you ruled out.** A dead end nobody records gets explored again
  by the next person, or by you in a month. `tests/README.md` carries the ones
  found so far.

Behaviour you are knowingly leaving broken should be pinned as a passing assertion
that states the wrong result and says so. Fixing it then turns a check red, so the
before/after evidence arrives without anyone having to remember to look for it.

Where a suite drives the harness itself — freezing a loop, stepping a tick —
assert that the harness works before assuming it does. A freeze that silently stops
working turns every later check into a race that still passes.

### Mouse/pointer behaviour must be verified with real input

Do not trust Playwright `page.mouse` or CDP `Input.dispatchMouseEvent` alone for
input bugs. They click at a fixed coordinate without any pointer motion and bypass
browser-level native handling (middle-click autoscroll, middle-click paste). Drive
real X11 input via XTEST (`pynput`) against a real headed browser instead.

**Why this is here:** Minesweeper's middle-click chording was "verified" passing
three separate times while being completely broken in real use. The chord fired on
`mouseup`, but only if the pointer never left the cell — a `mouseleave` handler
cancelled the pending chord. Since the middle button *is* the scroll wheel,
pressing it physically nudges the mouse, and any nudge across a 32px cell edge
silently killed the chord. Synthetic input never wobbles, so every test passed. Two
fixes shipped on those false passes, and the second introduced the `mouseleave`
cancel that made it worse. It was caught only by replaying the click with real
XTEST input plus a few px of movement while the button was held.

Rules that follow:

- Include the messy parts of human input: movement while a button is held,
  releasing on a different element than the press, repeated fires.
- If a test passes but the reporter says it is broken, suspect the harness before
  concluding it is environmental.
- Run the before/after proof above under *identical real input*, not synthetic —
  a synthetic replay of a pointer bug is what produced the false passes in the
  first place.
- Prefer input handling that does not depend on the pointer staying still.

`tests/chording.test.js` case 2 is the standing guard for this — it moves the
pointer while the button is held. Do not delete it.

## Machine-specific: driving a real browser on the dev box

> **This describes one specific machine** — a Wayland session with XWayland on
> `DISPLAY=:0`, using snap-packaged browsers. On any other system (X11, macOS, a
> container, non-snap browsers) most of it will not apply and following it will
> waste time. Check `echo $WAYLAND_DISPLAY` and whether the browsers are snaps
> before assuming any of it holds.

- **Snap Chromium works on X11** with `--ozone-platform=x11` and
  `GDK_BACKEND=x11`. Without them it runs as a Wayland client and
  `window.screenX/screenY` report `0,0`, so XTEST clicks cannot be aimed at it.
- **Snap Firefox cannot open `:0`** ("cannot open display") even though its x11
  snap interface shows as connected. Workaround: download the Mozilla tarball and
  run it unconfined with `-no-remote -profile <dir>`.
- **XTEST input works** on `:0` via `pynput`. Install into a venv — the system
  Python is PEP-668 managed and refuses `pip install`.
- **Screen capture of the X11 root is black** because Wayland does the
  compositing, so screenshots cannot be used to read state. Have the page report
  telemetry to a local HTTP server, or read state over CDP.
- CDP over websocket needs `--remote-allow-origins='*'`, or `suppress_origin=True`
  on `websocket.create_connection`.
- Node here is v22, so nothing forces the `playwright-core` pin any more. It
  stays at exactly 1.45.0 because that is what the suites are known to pass on,
  not because a newer one would refuse to start — see `tests/README.md`.

**Caution:** XTEST clicks go to the real shared desktop and land on whatever window
is on top — possibly the user's own applications rather than the test window. Check
window geometry before clicking, and check process start times before any `pkill`
so a long-running personal browser session is not killed.
