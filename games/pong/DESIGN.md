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

There are two kinds of preset and the difference matters.

**Easy, Medium and Hard override the `AI` object and nothing else.** All three
play the identical game — same ball speed, same paddle sizes — which is the only
reason the share of shots the ai saves is a fair measure of the gap between them.
Nothing may be added to these three that changes the game itself.

**Assisted and Insane deliberately break that**, which is why they are a separate
kind rather than two more entries in the same list. They move ball speed as well
as the ai, so each is measured against its own ball and their percentages are not
on the same scale as the middle three. A preset therefore has an `ai` half and an
optional `game` half, and the menu colours these two differently — green and red
against the accent that means "selected" — so it is visible at a glance that they
are not more of the same.

Both halves are applied over a pristine copy of the defaults each time.
`applyGame()` writes **every** field on every call rather than only the overridden
ones, for the same reason `AI` is rebuilt from `AI_DEFAULTS`: applying one preset
on top of another otherwise leaves whatever the previous one set. Switching from
Easy back to Hard would keep Easy's bounce lookahead, and switching off Insane
would keep its faster ball — invisible in play, and it makes every later
measurement a lie.

**Insane must never save everything.** Its first tuning did: 400 shots, 400 saves.
An ai that never concedes means the player can never take a point, so the match
cannot be won, only lost — that is a softlock wearing a difficulty label, not a
hard mode. The knob that does it is the same one named below, and the same rule
applies with less room: brutal is a number below 100, not at it.

The menu that selects them is **real buttons overlaid on the canvas**, not shapes
painted onto it. Canvas pixels have no keyboard focus, no tab order and nothing for
a screen reader, and hit-testing would have to be hand-rolled; DOM buttons get all
of it free and can be made to look identical. The menu shows on load and at the end
of a game, never mid-match — pause is a separate thing and does not surface it.

Play drops into the existing `serve` phase rather than starting a rally, so the
player still serves the first ball. Restart returns to the menu rather than
restarting silently, so the difficulty can be changed on the way.

**Every entry into a match clears the match first.** Play and Restart both run
`resetMatch()`, and anything that adds a third way in must too. This is not
theoretical: Play originally only hid the menu, which was correct for the load
menu — nothing to clear, loop already running — and wrong the moment the same
menu came back at the end of a game. It hid itself, left `gameOver` latched and
the loop stopped, and handed the player a frozen board showing the final score
with Restart as the only way out. The doc claimed one path into a match; the
code had two, and only one of them worked.

### What actually changes difficulty

Measured as the share of shots saved, over hundreds of random angles and speeds
with the paddle starting centred. `node tests/ai-sweep.js` is what produces these,
and re-running it is how any new preset gets a comparable figure:

| version | saves |
| --- | --- |
| original chasing AI | 88% |
| first predictive AI | 91% |
| after the human-feel work, before tuning | **100%** |
| untuned defaults | ~92% |
| Easy / Medium / Hard | ~72% / ~86% / ~96% |
| Assisted / Insane, each against its own ball | ~60% / ~99% |

The last row is not comparable with the others and the sweep marks it so. Those
two modes also change how hard the ball is for the **player**, which this harness
does not measure at all — it only ever asks whether the ai saved.

Since the abilities landed the number understates Insane badly, and it is worth
knowing why rather than trusting it. Two of its three moves — the charged shot and
the paddle squeeze — do not touch whether the ai saves anything; they make the
ball harder for *you*. The sweep cannot see them. Insane measures a shade **lower**
than it did before the moves existed, and is much harder to play.

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

## Abilities

Assisted and Insane are **characters, not points on a scale**. Tuning numbers
harder and softer produced two more difficulties; what makes these two worth
having is that the opponent has *moves* — Insane blinks up and down the board
like a cartoon villain, charges a shot that comes back faster than the game
normally permits, and squeezes your paddle. Assisted hands the same kind of thing
to you.

### Two kinds of tell

A move either **charges** — glowing, pulsing and shaking — or merely **tints** the
paddle, and `tell` in its config says which.

The distinction is not decoration. A charge tell is a *warning*: something is
about to happen that you should brace for, or a thing you are holding that you
have to remember to spend. A tint is a *statement*: this is what you have now.
Expand grows the paddle to nearly twice its size, which announces itself without
help, and — unlike Squeeze, which shrinks you and genuinely is a threat — there is
nothing to brace for. Given the charge treatment as well, it read as a second,
different thing happening on top of the growth.

`PLAYER_TELLS` checks Clutch **before** Expand, because Expand's real tell is the
paddle's own size and survives being drawn over, while a held charge has nothing
but its pulse. In the other order, a charge earned during an active Expand was
invisible.

A test separates the two by sampling a pixel just outside the paddle: a glow
bleeds past the rect and a tint does not.

**Every move telegraphs before it does anything.** A move is `idle`, then
`telegraph` — a visible wind-up with no effect yet — then `active`. That order is
the whole reason the moves feel fair: you see the paddle shaking and glowing, so
losing to one is something that happened rather than something the game did behind
your back. A test asserts the ball is untouched throughout the wind-up, because a
telegraph that already applied its effect would be decoration rather than a
warning.

A cooldown runs in every phase, so nothing chains into itself.

### Charged shots

A charged shot leaves at a flat multiple of **the mode's own speed cap**, not a
multiple of whatever arrived. Scaling off the incoming ball meant a charge earned
during a slow rally fired a slow shot — the same move measured 5.2 or 9.7
depending on nothing the player did, which is the opposite of drama. It is now the
same every time, and far enough above the cap that it is unmistakable.

**Nothing lifts the cap for the return of it.** If the opponent gets a paddle to a
charged shot, the ball comes back at ordinary speed, because the outgoing branch
of `bounce()` is the only one that reads `chargedMultiplier`. The charge is one
shot, not a lasting change to the rally — which is what keeps a reward from
turning into a punishment two touches later.

**The charge is held until it is spent, not until it expires.**
`durationTicks: Infinity` says so. A charge that timed out left the player looking
at a glowing paddle that quietly stopped meaning anything, and the glow is a
promise the game then has to keep.

**It is earned across several close calls, not one**, and the count is drawn as
three pips on the player's side. One close call granting an instant, invisible
charge was the version that read as "a powerup that does nothing": there was
nothing to watch approach, and by the time anything happened it had already
happened. Empty pips are outlined rather than absent, so a half-filled meter reads
as *two of three* rather than as two loose marks and explains itself the first
time it moves. Segments bank if the move is still on cooldown, so a close call is
never silently thrown away.

A test reads the canvas pixels rather than the state, because a meter nobody can
see is precisely the failure it replaced.

**A held charge pulses rather than glowing steadily**, and shakes on its own knob
rather than a fraction of the wind-up's. A steady light reads as part of the
paddle; a moving one reads as something waiting to go off. The pulse counts
**ticks**, not milliseconds, or it would breathe at 144Hz twice as fast as at
60Hz — the same rule anything that flashes here has to follow.

### Who fires, and why

**The villain rolls; you earn.** Insane's moves are a random chance per approach,
raised by however many points it is behind — it stops playing around exactly when
you start winning, which is both the drama and a self-balancing property: it
cannot bully you while you are already losing.

Yours are never random. Three returns in a row, three close calls, falling behind
on the scoreboard, or losing three points on the trot — the handout arrives
attached to something you did, or to being in genuine trouble. A random gift would
feel like the game pitying you at moments you had not earned and did not need.

The losing run and the score gap are **separate triggers on purpose**. Dropping
three in a row while still level is a different kind of trouble from being two
points down after trading evenly, and only one of them is visible in the score.
Winning a point wipes the run, so it measures a slide rather than a total.

**A timed effect cannot guarantee you ever get to use it.** The bigger paddle
originally ran on a timer, and at Assisted's ball speed one round trip is longer
than that timer was: earn it on a return and it could expire before the ball came
back, so the reward was routinely never touched. It ends after `usesToExpire`
returns instead, with the timer left only as a backstop for a point that ends
before you touch the ball again. Any future effect the player *earns* wants the
same treatment — the unit is opportunities, not seconds.

### Paddle sizes

Each paddle carries its own `h`, eased towards `hTarget` over `resizeTicks` about
its own centre. It is animated because an instant resize reads as a rendering
glitch rather than as something happening — the paddle appears to *pop*, and the
eye reports a bug. `resizeTicks: 0` gives the instant version back if that is ever
wanted, and a test pins the eased behaviour.

`PLAYER_PADDLE_SCALE` and `AI_PADDLE_SCALE` are the size a paddle settles back to
and are part of a preset's `game` half — Insane starts you shorter. Assisted does
**not** give a permanently taller paddle: yours grows when you have earned it and
returns afterwards, which handicaps without ever leaving the two sides looking
permanently lopsided.

### Two traps

`onPlayerReturn()` runs **after** `bounce()`, not before. A close call arms a
charged shot and `bounce()` spends charged shots, so hooking it first meant the
save that earned the charge immediately consumed it and the player never saw it.
A test drives a real edge collision rather than calling the hook, because calling
the hook directly cannot catch this.

`applyDifficulty()` resets paddle sizes and disarms everything. Without it,
choosing Insane and then Easy left you playing Easy with Insane's short paddle —
the same class of bug as a preset leaking through `AI`, and invisible until
somebody wonders why Easy felt wrong.

### Everything is switchable

Same contract as the `AI` object: every knob in `ABILITY` names the value that
turns its feature off, `modes: []` disables a move outright, and a test asserts
that with all of them off the game is the plain one — no move ever fires and no
paddle ever changes size. All of this is tuned by feel, and feel changes.

## The win score

`WIN_SCORE` is chosen in the menu alongside the difficulty and stored the same
way. It is orthogonal to difficulty on purpose: a long game on Easy and a short
one on Insane are both reasonable things to want, and folding the target into the
presets would have taken that away for no gain.

The trap is the `?` panel, which states the target and reads it from the constant
rather than hardcoding it. That was correct while the value could not change, and
became a lie the moment it could: filling the element in once at load leaves it
confidently wrong. It is refreshed wherever the win score is set, not at startup.

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
