# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

## Minesweeper: remember the panel open/closed state

Both collapsible panels — How to play (`#instructions`) and the gear's advanced
panel (`#settings`) — reset to closed on every reload, so anyone who wants one
open has to reopen it every visit.

Persist the open/closed state of each and restore it on load. Same storage caveat
as the best time — wrap every access in try/catch, since localStorage throws
rather than returning null when it is unavailable, and treat "cannot read" as the
default (closed) rather than letting it throw. Keep the keys namespaced alongside
the best time.

- Both panels toggle via the `hidden` attribute, with `aria-expanded` on their
  button kept in step; restoring state on load has to set both, not just the
  attribute.
- A panel with a `display` rule needs it scoped to `:not([hidden])` — any display
  value otherwise beats `hidden` and the panel loads open. `.settings` has this;
  `.instructions` has no display rule so it does not need it yet.
- `tests/instructions-panel.test.js` and `tests/best-time.test.js` both assume the
  panels start closed. Restoring a saved "open" would break them, so either clear
  the keys in test setup or assert the restore explicitly.

## Reaction time test game

## Chimp memory test game (see human benchmark site)

## Pong: physics, round flow, and difficulty

A bucket of related work on `games/pong/`, roughly ordered. The physics fixes come
first because difficulty tuning is meaningless until movement is frame-rate
independent and ball speed is bounded — any number tuned before that only holds on
one monitor.

Nothing in `games/pong/` has test coverage, so take the "no test coverage" entry
below alongside the first change rather than after it. Suggested order: frame-rate
independence and the velocity model together (they are one rewrite of `update()`),
then the round lifecycle, then the AI and its settings.

Entry IDs (`P1`, `P2`, ...) are for referring to these in conversation. They are
assigned once and never reused or renumbered — deleting a landed entry leaves a
gap, and closing that gap would silently repoint every reference made before it.
Keep them out of commit messages and branch names: the ID stops meaning anything
the moment the entry is deleted, so history has to describe itself. When deleting
a landed entry, grep the file for its ID first — a cross-reference to an entry
that no longer exists is unrecoverable without digging through old versions.

### P1 — Movement is frame-rate dependent

`update()` moves everything a fixed number of pixels per *frame*, and
`requestAnimationFrame` fires at the display refresh rate — so a 144Hz monitor
plays the whole game 2.4x faster than a 60Hz one, ball and paddles and AI alike.
Scale every movement by elapsed time instead.

- Clamp the delta. A backgrounded tab throttles `requestAnimationFrame`, so the
  first frame after returning can carry a delta of seconds and jump the ball clean
  through a paddle.
- `PADDLE_SPEED`, `AI_SPEED` and the ball's base speed all become per-second rather
  than per-frame. The current values are per-frame at 60Hz, so multiply by 60 to
  land on the same feel.

### P2 — The paddle can rescue a ball that is already past it

Paddle collision tests `ball.x <= PADDLE_WIDTH` — a half-plane, not a band. A ball
that misses vertically stays inside that region for several frames while it
travels out to `ball.x < 0`, so sliding the paddle down onto it afterwards still
registers a hit. Slow balls linger there longest, so it is most exploitable exactly
when the game is easiest. Test the crossing between the previous and current
position, not the current position alone.

### P3 — Ball velocity is unbounded and never normalized

Two separate problems in the same few lines of `update()`:

- `ball.vx *= -1.05` on every paddle hit, compounding with no cap. A long rally
  ends up faster than the collision code samples reliably.
- `ball.vy += hitPos * 4` *adds* to the existing vy rather than setting the angle,
  so repeatedly hitting near the same paddle edge accumulates vertical speed
  indefinitely. The ball ends up steep, fast, and barely crossing the board.

Fix both at once: derive an angle from the hit position, then set `vx`/`vy` from
`(speed, angle)` with `speed` capped. That also removes the oddity that only `vx`
grows, which flattens the ball's trajectory as a rally goes on.

### P4 — Arrow keys scroll the page

`handleKeyDown` never calls `preventDefault()`, so in a short window the up/down
arrows scroll the document out from under the canvas while you play.

### P5 — Mouse and keyboard controls fight each other

The `pointermove` handler sets `player.y` absolutely while the keys move it
relatively, so brushing the mouse mid-rally teleports the paddle. Track which
input was used last and ignore the other until it is used again.

### P6 — Round lifecycle: pause between points, sensible serve, no auto-start

Three changes to the same area, best done together:

- `onScore()` spawns the next ball instantly at centre. A player can concede and be
  under fire before registering the first point. Freeze the ball at centre for
  about a second with a countdown, then serve.
- `newBall()` picks its direction at random, so points can be won by coin flip when
  it serves itself into the AI. Serve toward whoever just conceded.
- The script calls `loop()` at load, so the ball is live before the player has read
  the controls or focused the window. Start in a "press Space to serve" state.

### P7 — No pause, and no auto-pause on blur

There is no way to stop the game. Add a Space or Escape toggle, and pause on
`blur` and `visibilitychange` so alt-tabbing does not cost a point. This pairs with
the delta clamp above — both exist because the game keeps running when unattended.

### P8 — The AI is an omniscient tracker

The AI chases the ball's *current* y at all times, even while the ball travels away
from it. It is beatable only because `AI_SPEED` is slower than the ball, which
means it plays perfectly in the early game and hopelessly once the ball speeds up,
and never reads as an opponent making decisions.

Replace with a predictive AI, which is also what makes real difficulty settings
possible:

- react only once the ball is heading toward it,
- predict the intercept y by simulating the ball's path including wall bounces,
- add a deliberate error term to that prediction,
- add a reaction delay before it starts moving,
- aim at a chosen point on its paddle rather than always the centre, so its
  returns vary.

### P9 — Difficulty settings

Depends on the predictive AI above. The honest knobs are AI *error* and *reaction
delay* — speed alone only moves the AI between perfect and useless. An Easy /
Normal / Hard preset would vary error magnitude, reaction delay, AI max speed, ball
base speed, and possibly `PADDLE_HEIGHT`.

- Minesweeper's gear button (`#settings-toggle` opening `#settings`) is the
  established pattern for a panel like this; follow it rather than inventing a
  second one.
- Any panel with a `display` rule needs it scoped to `:not([hidden])`, or the
  display value beats `hidden` and it renders open on load.
- Persist the choice in one namespaced `localStorage` key alongside the Minesweeper
  keys, and wrap every access in try/catch — `localStorage` throws rather than
  returning null when unavailable, and an unguarded read at load takes the page
  down. Treat "cannot read" as the default difficulty.

### P10 — Configurable win score

`WIN_SCORE` is hardcoded to 5, which is a short game. First to 5 / 7 / 11 belongs
in the same settings panel as the difficulty.

### P11 — Standing instructions are in the status line

`#status` starts as "First to 5 wins · W/S or ↑/↓ to move", but the page contract
in `CLAUDE.md` reserves `#status` for game state only — standing instructions go in
a collapsible panel like Minesweeper's `#instructions`. Worth folding in whenever
the controls list grows, which most of the entries above will do.

### P13 — Theme changes need a reload

Known limitation, documented in `CLAUDE.md`: a canvas cannot use CSS custom
properties, so `colors` is read once at load via `getComputedStyle`. Switching the
OS theme mid-game leaves the paddles and ball in the old palette. Re-reading them
from a `matchMedia("(prefers-color-scheme: dark)")` change listener closes it in a
few lines.

### P14 — Blurry on high-DPI displays

The canvas backing store is a fixed 600x400 scaled by CSS `max-width: 100%`, so it
is soft on any display with `devicePixelRatio > 1`. Size the backing store by
`devicePixelRatio` and scale the context to match.

- `handlePointerMove` already converts client coordinates using the ratio of
  `HEIGHT` to the element's rendered height, so it survives this change — but it is
  the thing to check first if the paddle starts tracking the pointer incorrectly.

### P15 — Nice to have

- **Sound.** Classic Pong is its blip. A WebAudio oscillator gives paddle, wall and
  score tones with no asset files and no dependency, which is what keeps it
  compatible with the no-dependencies rule. Needs a mute toggle, remembered.
- **Persisted stats.** Longest rally, or wins and losses, stored the same way as
  the Minesweeper best time: one namespaced key, every access wrapped.
- **Two-player mode.** W/S for the left paddle, arrows for the right. Small change
  to the input handling, and it matches Tic Tac Toe and Chess, which are both
  already local two-player.
- **Hit feedback.** A short ball trail, a paddle flash on contact, a flash on
  score. A few lines each in `draw()`.

### P16 — The loop never stops

`loop()` keeps scheduling frames after `gameOver`, redrawing a frozen board
forever. Stopping it on game over and restarting it in `restart()` is the tidy
version.

- Do **not** delete `rafId` as unused. It is never passed to
  `cancelAnimationFrame` by the game, but it is the only handle a test has to
  freeze the loop and step `update()` deterministically. Removing it would take
  the Pong suite's freeze control with it — see the `freeze` helper in
  `tests/pong.test.js`.

## Improve site design and visual appeal

## Plan and architect a backend for stored values e.g. highscore table
