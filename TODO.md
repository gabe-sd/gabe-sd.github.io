# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

Once a section has enough entries to need them, they carry a short ID (`P1`, `P2`,
… for Pong) so they can be named in conversation. Three rules stop those rotting:

- **Assigned once, never reused or renumbered.** Deleting a landed entry leaves a
  gap; closing the gap silently repoints every reference made before it.
- **Kept out of commit messages and branch names.** An ID stops meaning anything
  the moment its entry is deleted, so history has to describe itself.
- **Grep for the ID before deleting an entry.** A cross-reference to an entry that
  no longer exists cannot be recovered without digging through old file versions.

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

## Pong

Remaining work on `games/pong/`. Entries stay in ID order so a reference is easy to
find; priority is stated here rather than encoded in the ordering.

Suggested order: P17 whenever, it is small and touches nothing else. P18 next —
it is a live fairness problem and it decides whether mouse control survives at
all. Then P8 and P9 together, since difficulty settings are only meaningful
against an AI that has something worth tuning. P2, P14 and P15 are independent and
can go in any order.

`tests/pong.test.js` covers the physics, the round lifecycle, the controls and the
panels — add to it rather than around it. Its last section pins known-wrong
behaviour as passing assertions, so fixing P2 is supposed to turn a check red;
rewrite that assertion as part of the fix rather than deleting it.

### P2 — The paddle can rescue a ball that is already past it

Paddle collision tests `ball.x <= PADDLE_WIDTH` — a half-plane, not a band. A ball
that misses vertically stays inside that region for several frames while it
travels out to `ball.x < 0`, so sliding the paddle down onto it afterwards still
registers a hit. Slow balls linger there longest, so it is most exploitable exactly
when the game is easiest. Test the crossing between the previous and current
position, not the current position alone.

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

### P17 — Drop the score from the status line

`draw()` already paints both scores across the top of the canvas, so `#status`
repeating them as "You 1 — 0 AI" is the same information twice, and it pushes the
message that matters out past a separator. Strip the score and leave `#status`
saying only what is happening: the serve prompt, "serving…", "paused, Esc to
resume", and the win or loss.

- `updateStatus()` builds every branch from one `score` string, so this is a
  rewrite of that function, not a deletion in one place.
- Blank during a rally is correct and matches Minesweeper, whose status empties
  once play starts. `.status` has a reserved min-height in `shared.css`, so
  nothing shifts when it goes empty.
- **The canvas score is invisible to a screen reader.** `#status` is currently its
  only non-visual readout, so deleting it outright is an accessibility regression.
  Either keep a visually hidden live region carrying the score, or have the
  between-points message carry it ("1 — 0, serving…") so it is announced exactly
  when it changes. Do not simply drop it.
- `tests/pong.test.js` asserts the status reports the score after a point. That
  assertion moves to whatever carries the score instead.

### P18 — Pausing lets a mouse player reposition for free

Pause, move the pointer to where the ball is heading, unpause: the paddle is
already there. It reads as cheating because it is — a keyboard player cannot do
it, since `update()` does not run while paused and the keys only move the paddle
`PADDLE_SPEED` per tick.

That asymmetry is the real bug, and it is not actually about pausing. Pointer
control sets `player.y` absolutely from an event handler that runs outside
`update()`, so nothing rate-limits it. Even unpaused, a mouse crosses the whole
board in one frame where the keyboard needs over fifty ticks.

Worth trying before removing the mouse:

- Give the pointer a *target* instead of a position. `handlePointerMove` records
  where the player wants the paddle; `update()` moves `player.y` towards it by at
  most `PADDLE_SPEED` per tick. Repositioning while paused then only sets a target
  the paddle still has to travel to at normal speed, so the exploit disappears —
  and mouse and keyboard get the same top speed for the first time. Try this one
  first.
- Failing that, ignore pointer input while paused and make the P5 takeover
  threshold apply again on resume. Weaker: it delays the snap by one event rather
  than preventing it.
- Failing that, allow pausing only between points. Kills the exploit but takes
  most of the value out of P7.
- Last resort, drop mouse control. Simplest fix, and the game is playable without
  it, but it is a real loss for anyone who prefers a mouse — exhaust the above
  first.

Whichever lands, the pause cases in `tests/pong.test.js` should gain one that
moves the pointer while paused and asserts the paddle does not end up somewhere it
could not have travelled to.

## Improve site design and visual appeal

## Plan and architect a backend for stored values e.g. highscore table
