# Flappy Bird: what a reader must not break

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

## The board, as drawn

The palette and every value are in `design/DESIGN.md`, "Flappy Bird: one lit
actor". What is here is the part a reader must not break.

**The bird is drawn no bigger than the square that kills it.** `drawBirdShape()`
paints about the origin inside a box `BIRD_SIZE` across, which is exactly the
hitbox. An earlier beak reached seven pixels past the right edge, so the bird
looked wider than it flew and a gap that was clearable read as fatal. Case 19 of
`tests/flappy-bird.test.js` measures the drawn ink and holds it inside that box.

**The one deliberate exception is the glow**, which spills past the edge on
purpose — it is half of how being alive reads, and going out is half of how
death does. That is why the test measures `drawBirdShape()` rather than
`drawBird()`: the shape has to fit, the light does not.

**A pipe paints strictly inside the rectangle it is handed**, for the same
reason the hitbox rule above exists — the glow is clipped to the rectangle so
the light stops where the pipe does. This is the drawing half of the older rule
that a pipe's hitbox is exactly the two rectangles `draw()` paints.

**Death keeps the drawing and changes its state**: the ink goes to the outcome
colour and the light goes out. Swapping the bird for a solid shape was tried and
rejected — every other thing on this board is line work, and a filled ball on it
reads as a piece from another game.

**The ground and the ceiling do not look alike, because they do not behave
alike.** The ground is drawn on the pixels that end the run; the ceiling, which
only stops the bird, is a broken rule at part strength. Before this phase neither
was drawn at all, so the thing that kills you was invisible.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#help-toggle` and `#instructions`, plus `#score` and `#best-score` in
a HUD row above the board.

Each of those two holds three things rather than a string: a `.gly` drawn glyph,
`aria-hidden`; a `.lbl` word, taken out of the picture but not out of the
reading; and the `.n` that `renderScore()` and `renderBest()` write into. **The
render functions depend on that `.n` existing** — every other check in the suite
reads `textContent`, which concatenates, so it would pass just as happily against
a readout with no `.n` in it at all. Case 20 holds the markup itself.

## Stored data

`flappy.bestScore` — the best run. Read and written through
`loadBestScore`/`saveBestScore`, both wrapped because `localStorage` throws rather
than returning `null` when it is unavailable. `tests/flappy-bird.test.js` covers
that path by making storage throw.
