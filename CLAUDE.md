# test-website

A static, dependency-free game arcade. Plain HTML/CSS/JS — no build step, no
package manager, no framework. Open a file or serve the directory and it runs.

## Layout

```
index.html          hub page: cards linking to each game
hub.css             styles for the hub only
shared.css          theme tokens + shared layout/button styles (used by every page)
games/<name>/
  index.html        the game page
  style.css         layout specific to that game
  script.js         that game's logic
```

Each game is self-contained in its own folder and links back to `../../index.html`.
Adding a game means creating one folder plus a card in `index.html` — nothing else
needs to change. Games share the palette via CSS custom properties in `shared.css`
(`--bg`, `--fg`, `--cell-bg`, `--cell-border`, `--accent`, `--win`, `--lose`,
`--muted`), which adapt to light/dark via `prefers-color-scheme`.

Current games: Tic Tac Toe, Pong, Minesweeper, Chess.

## Running it

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Serve it rather than using `file://` — relative paths to `../../shared.css` work
either way, but a server matches how it is actually deployed.

## Testing changes

There is no test suite. Verify by driving the real page in a browser and
checking the resulting game state, not by reading the code and reasoning about
it. `node --check <file>.js` catches syntax errors but proves nothing about
behaviour.

### Mouse/pointer behaviour must be verified with real input

Do not trust Playwright `page.mouse` or CDP `Input.dispatchMouseEvent` alone for
input bugs. They click at a fixed coordinate without any pointer motion, and they
bypass browser-level native handling (middle-click autoscroll, middle-click
paste). Drive real X11 input via XTEST (`pynput`) against a real headed browser
instead.

**Why this is in here:** Minesweeper's middle-click chording was "verified"
passing three separate times while being completely broken in real use. The chord
fired on `mouseup`, but only if the pointer never left the cell — a `mouseleave`
handler cancelled the pending chord. Since the middle button *is* the scroll
wheel, physically pressing it nudges the mouse, and any nudge across a 32px cell
edge silently killed the chord. Synthetic input never wobbles, so every test
passed. Two fixes were shipped on those false passes, and the second introduced
the `mouseleave` cancel that made it worse. It was only caught by replaying the
click with real XTEST input plus a few px of movement while the button was held.

Practical rules that follow from that:

- Include the messy parts of human input in any test: movement while a button is
  held, releasing on a different element than the press, double-fires.
- If a test passes but the reporter says it is broken, suspect the harness before
  concluding it is environmental.
- Prove a fix with a before/after run under *identical* real input — revert to the
  broken version, watch it fail, restore, watch it pass. A passing "after" alone
  is not evidence.
- Prefer input handling that does not depend on the pointer staying still.

## Machine-specific: driving a real browser on the dev box

> **This section describes one specific machine** — a Wayland session with
> XWayland on `DISPLAY=:0`, using snap-packaged browsers. On any other system
> (X11, macOS, a container, non-snap browsers) most of it will not apply and
> following it may waste time. Check `echo $WAYLAND_DISPLAY` and whether your
> browsers are snaps before assuming any of this holds.

Working this out consumed most of a debugging session, so it is recorded here:

- **Snap Chromium works on X11** with `--ozone-platform=x11` and
  `GDK_BACKEND=x11`. Without them it runs as a Wayland client and
  `window.screenX/screenY` report `0,0`, so XTEST clicks cannot be aimed at it.
- **Snap Firefox cannot open `:0`** ("cannot open display") even though its x11
  snap interface shows as connected. Workaround: download the Mozilla tarball and
  run it unconfined with `-no-remote -profile <dir>`.
- **XTEST input works** on `:0` via `pynput`. Install into a venv — the system
  Python is PEP-668 managed and refuses `pip install`.
- **Screen capture of the X11 root is black** because Wayland does the
  compositing, so screenshots are useless for reading state. Instead have the
  page report telemetry to a local HTTP server, or read state over CDP.
- CDP over websocket needs `--remote-allow-origins='*'` on the browser, or
  `suppress_origin=True` on `websocket.create_connection`.
- Node on this box is v18, so Playwright must be pinned to ~1.45 (newer needs 20+).

**Caution:** XTEST clicks go to the real shared desktop, so they land on whatever
window is on top — possibly the user's own applications, not the test window.
Check window geometry before clicking, and check process start times before any
`pkill` so a long-running personal browser session is not killed.
