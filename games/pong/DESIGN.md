# Pong: how it works and why

This file holds the *model* — the reasoning behind the design and the things that
were tried and rejected. The rules you must not break while editing are in
`CLAUDE.md`; what the code currently does is in `tests/pong.test.js`, which is the
executable version of everything below.

It deliberately names knobs and directions rather than their settings. Values live
in the code as named constants, and a document that repeats them is wrong the first
time one is tuned.

## Time

The game runs on a **fixed timestep**. `loop()` only paces: `advance()` drains
elapsed real time into whole `TICK_MS` ticks and calls `update()` once per tick.
Every speed constant is therefore per tick, not per rendered frame.

Movement used to be per frame, which meant a 144Hz monitor played the whole game
2.4x faster than a 60Hz one — ball, paddles and AI alike.

**Rejected: scaling movement by a variable frame delta.** It is the more obvious
fix and it loses on three counts. The simulation stops being reproducible, so the
same inputs give different results on different hardware. Collision behaviour
degrades when frames are slow, exactly when you least want it to. And `update()`
would need to take a time argument, which would put a notion of real time into
every test that steps it by hand — the affordance the whole suite is built on.

`advance()` clamps one frame's worth of catch-up. A backgrounded tab receives no
frames, and without the clamp the first frame back would try to simulate however
long it was away in a single step.

## The ball

`bounce()` owns velocity entirely. It derives the outgoing angle from where the
ball struck the paddle relative to that paddle's centre, then recomputes the whole
velocity vector from a speed that is stepped up per hit and capped.

The previous model multiplied `vx` per hit and **added** to `vy`, so vertical speed
accumulated without limit. Hitting near the same paddle edge repeatedly compounded
it: a long rally reached a measured speed of **61.9** against what is now a cap of
10, by which point the ball moved far enough per tick to skip vertically past a
paddle between one tick and the next. That is why nothing may accumulate into
`ball.vy` directly.

Paddle collisions test the **crossing**, not the position. `ball.x <= PADDLE_WIDTH`
stays true for several ticks as a missed ball travels off the board, so testing the
end-of-tick position let a late-arriving paddle rescue a ball that had already gone
past it. `crossingY()` interpolates where the path met the paddle's plane. The
interpolation matters less than it sounds — with speed capped, the end-of-tick
position is at most a few pixels from the crossing — but those pixels are a band at
each paddle end where the two answers differ.

Wall bounces **reflect the overshoot** rather than clamping to the wall. Clamping
quietly ate up to `|vy|` of vertical travel at every bounce, which is invisible in
play but puts the ball off any straight-line prediction of where it will end up.
That was found by checking the AI's predicted intercept against the game's own
physics and finding them 13 pixels apart over two bounces.

## The round

Play is a three-phase machine.

- **`serve`** waits for the player. A game starts here and Restart returns here.
  Space or a click on the board serves.
- **`countdown`** is the pause after a point, held for a fixed number of ticks and
  then served automatically.
- **`play`** is a live ball.

`update()` moves the paddles in every phase, so both sides can get into position
between points, but returns before touching the ball outside `play`. **A test that
places the ball by hand has to set `phase` too.**

The delay is counted in ticks rather than milliseconds so it needs no second clock
and lands exactly where a test can step to it. The serve goes to whoever conceded
the point; it used to be a coin flip, which meant points could be won by the ball
happening to launch itself at the AI.

## Pausing

Escape or `p`, and automatically on losing the window or having the tab hidden.

**Resuming is deliberately manual**, including after the window comes back. The
whole point is not to return to a ball that is already past you, so an automatic
resume would undo the feature it looks like it belongs to. A click on the board
resumes as well as the keys, because a mouse-only player would otherwise be
stranded by a keyboard-only control.

Pausing zeroes the tick accumulator rather than letting real time bank up.
Without that, resuming would replay the entire pause at once, up to the
`MAX_CATCHUP_MS` clamp.

The blur and visibility handling is covered only by dispatched events, not by a
real focus change. That is a harness limit rather than a choice, and
`tests/README.md` records what was tried so nobody spends the afternoon again.

## Controls

Keyboard movement is capped at `PADDLE_SPEED` per tick. Pointer control sets
`player.y` directly from the event handler, which runs outside the tick, so **it is
not rate-limited at all** — a mouse crosses the board in one frame where the
keyboard needs fifty-odd ticks, and repositioning the pointer while the game is
paused is a free move.

**This asymmetry is deliberate and was fixed once before being reverted.** Having
the paddle travel towards the pointer at a capped speed killed the exploit
outright, and was worse to play at every speed tried: the paddle chases the cursor
instead of being it, and the 1:1 spatial mapping that makes a mouse worth using is
gone. In a single-player game with no scoreboard the exploit costs nothing and the
fix cost something on every shot. Leave it alone.

The pointer only takes control after moving far enough to look deliberate, because
the problem it guards against is the mouse being *brushed* mid-rally rather than
moved. Handing over on any pointer movement would not have fixed anything.

## The AI

The AI predicts where the ball will reach its side of the board and is then
**deliberately degraded**. The degradation is the entire design: an AI that reads
the ball perfectly is unbeatable, and one that is simply slow plays perfectly early
and hopelessly once the ball speeds up, which is what the original chasing AI did.

The first predictive version was beatable but read as a machine, for one specific
reason: **the instant the ball was struck it set off for its final position and
stopped there.** It solved the whole trajectory immediately and its mistake was a
number rolled up front. Everything below exists to make the mistake *emerge from
watching the ball* instead.

**Limited bounce lookahead.** It simulates only a small number of wall bounces.
A ball that will bounce more than that is genuinely misread until fewer bounces
remain, at which point it suddenly understands and has to recover. The prediction
can fall outside the board when the lookahead runs out; the paddle clamp turns that
into "parked against a wall, lost it", which is the intended reading.

**Periodic glances.** It re-reads the ball on a jittered timer rather than every
tick, so the paddle is always acting on a slightly stale picture.

**Late convergence.** Its read tightens as the ball approaches, but on a curve that
keeps it wrong through most of the flight rather than tightening evenly. This is
what stops it committing early — the specific complaint above.

**A committed direction.** Which way a given approach's misread leans is rolled
once, so the error converges smoothly from wrong towards right instead of flipping
sides every glance and looking like noise.

**Wobble scaled by ball speed.** The per-glance wobble scales with how fast the
ball is coming. A slow ball is easy to follow and the paddle should look settled on
it; a fast one is not.

**An aim point.** It lines up to strike the ball somewhere other than its own
centre, which varies the angle it returns at.

Movement is a proportional controller with a limited rate of change. It winds up to
speed rather than starting at full tilt, and it brakes later than it can stop, so it
overshoots by a few pixels and has to correct. **The overshoot is not bolted on** —
it falls out of not being able to stop instantly, the same way a hand does not. It
lunges above its normal speed when badly out of position.

### Everything is switchable

Every knob in the `AI` object documents the value that turns its feature off, and
`tests/pong.test.js` asserts that **turning them all off reproduces the old direct
mover exactly**. Backing out or isolating any single part of this is a number, not
an edit. That guarantee is worth keeping: all of this is tuned by feel, and feel
changes.

### Difficulty

A difficulty is a set of overrides on the `AI` object and **nothing else**. Both
sides play the same game — same ball speed, same paddle sizes — which is what
makes the share of shots the AI saves a fair measure of the difference between
them. Presets that also moved ball speed or paddle height would break that
comparison, which is why the two joke modes are tracked separately in `TODO.md`.

They are applied over a pristine copy of the defaults each time. Applying one
preset on top of another would otherwise leave whatever the previous one had
overridden — switching from Easy back to Hard would silently keep Easy's bounce
lookahead.

The menu that selects them is **real buttons overlaid on the canvas**, not shapes
painted onto it. Canvas pixels have no keyboard focus, no tab order and nothing for
a screen reader, and hit-testing would have to be hand-rolled; DOM buttons get all
of it free and can be made to look identical. The menu shows on load and at the end
of a game, never mid-match — pause is a separate thing and does not surface it.

Play drops into the existing `serve` phase rather than starting a rally, so the
player still serves the first ball. Restart returns to the menu rather than
restarting silently, so there is one path into a match and the difficulty can be
changed on the way.

### What actually changes difficulty

Measured as the share of shots saved, over hundreds of random angles and speeds
with the paddle starting centred:

| version | saves |
| --- | --- |
| original chasing AI | 88% |
| first predictive AI | 91% |
| after the human-feel work, before tuning | **100%** |
| untuned defaults | ~92% |
| Easy / Medium / Hard | ~70% / ~86% / ~95% |

That 100% is the entry worth remembering. Making the AI feel human made it
**unbeatable**, and nothing but playing it revealed that. The cause: a read that
converges to near-certainty, combined with a recovery fast enough to always get
there in the end. Its error at the moment the ball arrives had been set to a few
pixels.

So the strongest difficulty lever by far is **how wrong it still is when the ball
arrives**, and that value must never be zero — an AI that ends up certain never
misses at all, however human it looks on the way. After that, in rough order:
reaction delay, bounce lookahead, and top speed. Raw speed is the weakest of them,
because it only moves an AI between perfect and useless.

`tests/pong.test.js` guards the range rather than the number: it throws hundreds of
shots at the AI and asserts it misses some and saves most. The band is wide on
purpose, because these are meant to be tuned by feel and the test exists to catch
"unbeatable" and "hopeless", not to pin a setting.

## Reading the game without seeing it

`#status` carries game state only — the serve prompt, the countdown, the pause
message, the result. Standing instructions live in the `?` panel, per the page
contract in `CLAUDE.md`.

The score is **not** in the status line, because `draw()` already paints it across
the top of the canvas and repeating it is the same information twice. But canvas
pixels are unreadable to a screen reader, which made the status line the only
place the score existed as text — so deleting it outright would have been an
accessibility regression. It moved to a visually hidden live region instead, which
announces it exactly when it changes.

That region is **clipped, not `display: none`**. `display: none` would take it out
of the accessibility tree as well and defeat the entire point. It looks like dead
markup; it is not.

## Geometry

`ball.x`/`ball.y` are the ball's **top left corner**, not its centre, because that
is what `fillRect` wants. Anything positioning the ball has to back off half its
width — centring it on the board means `WIDTH / 2 - BALL_SIZE / 2`, and setting it
to `WIDTH / 2` puts it a full half-width to the right of the centre line, which is
drawn at exactly `WIDTH / 2`. That shipped for a while and is obvious once seen.

`bounce()` and `predictInterceptY()` both carry the same half-width correction.
Switching to a centre-based position would remove all of them, at the cost of
touching every collision and the prediction at once — not worth doing on its own,
worth knowing if something else forces that area open.

## Theme

A canvas cannot read CSS custom properties, so the theme tokens are copied into a
plain object and re-copied from a `prefers-color-scheme` change listener. Only the
background is re-read per frame.
