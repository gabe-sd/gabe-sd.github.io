# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A static game arcade: plain HTML/CSS/JS with no build step, no package manager,
no framework, and no dependencies. Files are served as-is.

## Commands

```bash
python3 -m http.server 8000     # serve at http://localhost:8000
node --check games/<name>/script.js   # syntax only - proves nothing about behaviour
```

Serve rather than opening `file://`; relative paths work either way, but a server
matches how it is deployed.

There is no test suite, linter, or build. The equivalent of "running one test" is
driving a single game page in a browser and asserting on the resulting game
state — see *Verifying changes* below.

## Architecture

### The page contract

Every game lives in `games/<name>/` as three files (`index.html`, `style.css`,
`script.js`) and is otherwise self-contained. Adding a game means creating that
folder and a card in the root `index.html` — nothing else changes.

Each game page follows a contract that `shared.css` depends on:

- Links `../../shared.css` **first**, then its own `style.css`.
- Uses the ids `#board`, `#status`, `#restart` (Minesweeper adds `#mine-count`,
  `#timer`). Game scripts look these up by id, and `shared.css` styles `.page`,
  `.status`, `.hint`, `.btn`, `.back-link` for them.
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

**Chess** (`games/chess/script.js`) is the substantial one. Legality is layered:
`generatePseudoMoves` produces moves ignoring check; `applyMove` is pure — it
returns a new `{board, castling, enPassant}` and never mutates — so
`getLegalMoves` filters by simulating each move and discarding any that leave the
mover's own king attacked. `isSquareAttacked` is the single primitive underneath
check detection, castling-through-check rules, and `isInCheck`.
`hasAnyLegalMove` is what separates checkmate from stalemate in `updateStatus`.
Changes to move rules belong in the pseudo-move layer; do not special-case
legality in the click handler.

**Pong** (`games/pong/script.js`) runs a `requestAnimationFrame` loop over mutable
`player`/`ai`/`ball` objects. A canvas cannot use CSS custom properties, so theme
colours are read once at load via `getComputedStyle` into a `colors` object; only
the background is re-read per frame. Consequence: switching the OS theme mid-game
will not restyle the paddles or ball until reload.

**Minesweeper** (`games/minesweeper/script.js`) places mines lazily on the first
reveal, excluding the 3x3 around that cell, so the first click is always safe —
`grid` is empty until then. `floodReveal` recurses through zero-adjacency cells.
Chording fires on middle **mousedown** (see below).

## Verifying changes

Drive the real page and assert on game state. Reading the code and reasoning about
it is not verification, and `node --check` only catches syntax errors.

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
- Prove a fix with a before/after run under *identical* real input — revert to the
  broken version, watch it fail, restore, watch it pass. A passing "after" alone is
  not evidence.
- Prefer input handling that does not depend on the pointer staying still.

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
- Node here is v18, so Playwright must be pinned to ~1.45 (newer requires 20+).

**Caution:** XTEST clicks go to the real shared desktop and land on whatever window
is on top — possibly the user's own applications rather than the test window. Check
window geometry before clicking, and check process start times before any `pkill`
so a long-running personal browser session is not killed.
