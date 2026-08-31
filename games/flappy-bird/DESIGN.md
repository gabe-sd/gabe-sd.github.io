# Flappy Bird: what a reader must not break

The invariants for Flappy Bird, kept in its own folder so that changing this game
touches no file another game's agent is editing. `CLAUDE.md` holds only what
every game shares — the page contract, the theme, the testing rules.

A design doc is only worth having if it is true, so **changing how a game plays
means updating this file in the same commit**, including whatever was tried and
rejected along the way. Rejected alternatives are the most valuable thing here and
the easiest to lose. Keep values out of it; those live in the code as named
constants, and a doc that repeats them is wrong the first time one is tuned.

**Flappy Bird** (`games/flappy-bird/script.js`) borrows Pong's pacing and for the
same reasons: `advance()` drains real time into whole `TICK_MS` ticks, so every
constant in it is per tick rather than per frame, `update()` returns before
touching anything outside `phase === "play"` so a test can place the bird and
step time by hand, and loop scheduling is guarded by `running` rather than by
`rafId`. Three rules keep the game honest. The bird never moves horizontally —
`BIRD_X` is fixed and the world scrolls past it, which is why collision only ever
tests one x. A flap *sets* `bird.vy` rather than adding to it, so mashing the key
cannot accumulate lift. And a pipe's hitbox is exactly the two rectangles
`draw()` paints: no lip, no inset, nothing decorative hanging off the side, so
what kills you is what you can see.

The ceiling clamps the bird and the ground ends the run — dying to something
above the screen reads as the game cheating. New pipes are spaced off the last
pipe rather than off the screen edge, so the interval stays exact however the
ticks land.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#help-toggle` and `#instructions`, plus `#score` and `#best-score` in
a HUD row above the board.

## Stored data

`flappy.bestScore` — the best run. Read and written through
`loadBestScore`/`saveBestScore`, both wrapped because `localStorage` throws rather
than returning `null` when it is unavailable. `tests/flappy-bird.test.js` covers
that path by making storage throw.
