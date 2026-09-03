# Pong: how it works and why

This file holds the *model* — the reasoning behind the design and the things that
were tried and rejected. The rules you must not break while editing are in
`CLAUDE.md`; what the code currently does is in `tests/pong.test.js`, which is the
executable version of everything below.

It deliberately names knobs and directions rather than their settings. Values live
in the code as named constants, and a document that repeats them is wrong the first
time one is tuned.

## Invariants

**Pong** (`games/pong/script.js`) keeps its model, its measurements and its
rejected alternatives in `games/pong/DESIGN.md` — read that before changing how it
plays. Six things will bite you without it:

- The loop only *paces*: `advance()` drains real time into whole `TICK_MS` ticks
  and calls `update()` once per tick, so every speed constant is per tick. Nothing
  may accumulate into `ball.vy` either — `bounce()` owns velocity outright.
- Three things exist for the test harness. `update()` returns before touching the
  ball outside `phase === "play"`, so a test placing the ball must set `phase`;
  loop scheduling is guarded by `running`, not by `rafId`, so a caller that
  cancelled the pending frame does not get it restarted underneath them; and
  `drawPaddle` records what it computed in `lastTell`, because the paddle shakes
  by design and counting its pixels measures the jitter rather than the tell.
- Pointer control is deliberately *not* rate-limited, which makes a mouse faster
  than the keys. That was fixed once and reverted on play. It looks like a bug.
- `PADDLE_HEIGHT` is the size a paddle *starts* at, not its size. Each paddle
  carries its own `h`, which the abilities stretch and shrink, so anything reading
  a live paddle reads `.h` — collision, drawing and the ai's own target included.
  `syncPaddleSize()` is the only thing that writes `hTarget`, and it decides by
  precedence. Letting each move write it directly is a shipped bug: whichever
  *ended* last reset the paddle to its base size, overruling an effect that was
  still running.
- Every knob in the `AI` and `ABILITY` objects documents the value that switches
  its feature off. Two tests hold that up: all of `AI` off reproduces the old
  direct mover, and all of `ABILITY` off gives back the plain game. Keep both
  true — it is all tuned by feel, and feel changes.
- A difficulty preset has three optional halves — `ai`, `game` and `ability` —
  and each is applied over a **pristine copy** by a function that writes every
  field on every call (`AI_DEFAULTS`, `applyGame`, `applyAbility`). Adding a
  fourth means adding a fourth pristine copy. Skipping that does not fail
  loudly: the previous mode's values simply survive into the next one, which is
  invisible in play and quietly falsifies every measurement taken afterwards.

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
it: a long rally reached a measured speed of **61.9** — several times what
`BALL_SPEED_MAX` allows even on Insane, which raises it — by which point the ball
moved far enough per tick to skip vertically past a paddle between one tick and
the next. That is why nothing may accumulate into `ball.vy` directly.

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
keyboard needs the better part of a second, and repositioning the pointer while the
game is paused is a free move.

**What bounds the key speed is the ball, not the mouse.** The cap sits just under
the steepest vertical descent a ball can have in Normal — `BALL_SPEED_MAX` struck
at `MAX_BOUNCE_ANGLE` — so a fast shot into a corner still outruns the keys and has
to be read early rather than chased down. Past that line every ball is reachable
from anywhere and where you were standing stops mattering, which is the whole of
the positional game. Narrowing the gap to the mouse is the point of the cap being
where it is; closing it is the thing that was already tried, below.

**One number covers all three modes.** `PADDLE_SPEED` is not part of a preset's
`game` half — that writes the ball speeds and the two paddle scales and nothing
else — so tuning it moves Easy, Normal and Insane together, and making it
per-mode means a new field there and a new line in `applyGame()`. Note also that
`node tests/ai-sweep.js` cannot see a change to it at all: the sweep asks whether
the ai reached the ball, never whether you could have. A mode retuned against a
sweep taken before the key speed moved is being tuned against the wrong game.

**This asymmetry is deliberate and was fixed once before being reverted.** Having
the paddle travel towards the pointer at a capped speed killed the exploit
outright, and was worse to play at every speed tried: the paddle chases the cursor
instead of being it, and the 1:1 spatial mapping that makes a mouse worth using is
gone. In a single-player game with no scoreboard the exploit costs nothing and the
fix cost something on every shot. Leave it alone.

The pointer only takes control after moving far enough to look deliberate, because
the problem it guards against is the mouse being *brushed* mid-rally rather than
moved. Handing over on any pointer movement would not have fixed anything.

**Tracking is bound to the window, not the canvas.** A canvas-only listener stops
seeing the pointer the moment it crosses the board edge, which strands the paddle
wherever it had got to — overshoot chasing a ball to the top and the paddle simply
stops. `handlePointerMove` already converts client coordinates against the
canvas's own rect and clamps to the board, so nothing about the arithmetic needed
to change, only what the listener is attached to. This covers everywhere inside
the browser window; the cursor leaving the window entirely delivers no pointer
events to the page at all, and nothing here reaches that case — pointer lock
would, but it trades away the 1:1 spatial mapping this section just spent several
paragraphs justifying, so it was not used for this.

**Moving the listener to the window does not move the takeover guard's border
with it — that stays the board.** Widening where movement is *seen* widens where
it can be *brushed* too: before this change, only a mouse resting over the canvas
could ever clear `POINTER_TAKEOVER_PX`, because nothing else reached the handler.
On the window, reaching for Restart or the help button while playing keyboard is
also "12px of movement" now, and unlike a rally the player is not even looking at
the board when it happens. So the guard keeps its old question — is this landing
on the board? — and only the answer to "should tracking keep going once the
pointer already has control" changed. A move is a takeover only if `handlePointerMove`
sees it while `e.clientX`/`e.clientY` fall inside the canvas's own rect; once
control is already `"pointer"`, no such check applies, which is what lets a
chase carry the paddle past the edge in the first place. Decided this way rather
than surveyed with a playtest because it restores an existing invariant — the
brushed-mouse guard predates this entry — rather than setting a new one.

## On a phone

Not designed for, but measured. An emulated phone with real touch events was
driven through a game, and the result is worth keeping because it is not what
anyone expected: **it already works.** Tapping the board serves, dragging moves
the paddle, `touch-action: none` stops the page scrolling under the drag, the
layout does not overflow and nothing errors. Three things are genuinely wrong.

**There is no way to pause.** Escape and `p` are the only manual bindings and a
phone has no keyboard. Auto-pause on a hidden tab still fires and tapping the
board resumes, so you can get out of a pause but never into one. That is a
functional hole rather than polish.

**The `?` panel lies to a touch device.** It lists W/S, the arrow keys and Space,
none of which exist on a phone, and never mentions dragging. Fixing it means
showing the right controls to the right device without sniffing the user agent; a
pointer media query is the usual answer.

**Your finger covers the paddle.** The player's paddle sits on the left edge,
exactly where you drag. Nothing fixes that except moving the control somewhere
else, which is a design question and not a bug.

One consequence of a decision made for the mouse: touch **teleports** the paddle,
because pointer control is not rate-limited (see Controls above). On a mouse that
is a curiosity. On touch, lifting a finger and putting it down elsewhere is the
normal way to move, so it happens constantly.

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

Three modes, each a character rather than a notch on a scale.

There used to be five. Easy, Medium and Hard differed in `AI` settings alone and
were the only modes *without* powerups, which is precisely what killed them: once
every mode had powerups the thing that distinguished the middle three was gone,
and five names described three real differences. They are worth remembering for
what they cost — while they existed, the middle three all played an identical
ball, which was the only reason the share of shots the ai saves compared honestly
between them. Nothing does now. Every mode is measured against its own game, and
`tests/ai-sweep.js` is a reading of one mode, not a ranking across them.

**Normal is the one you are meant to play.** It is the only mode with no `game`
half at all: stock ball, stock paddles, no handicap on either side. Its ai sits
where Medium's did, and it has every move in the game, tuned well below Insane's
settings. The moves are the show; they are not the difficulty.

**Assisted is for someone who has barely played, and what makes that fun is
rallies — not a scoreline.** Its ai is therefore *competent*, and deliberately
stronger than Easy's. That looks backwards and is the most important thing on this
page to not undo.

A crippled opponent does not play gently. It ends the point by **missing**, and a
point that ends is a rally that did not happen. Measured against a beginner —
wide aim error, slow paddle — the old weak-ai Assisted produced the **shortest
rallies of any mode in the game**: 2.3 contacts per point against Easy's 2.6 and
Medium's 3.1, with 23% of points ending without either side touching the ball.
The mode meant to be the friendliest was the one where the ball came back least.

The handicap lives on the player's side instead: a slow ball, and a paddle half as
large again as the opponent's. That combination is what lets both things be true
at once — the same beginner now sees **6.0 contacts per point, 13% untouched, and
still takes 79% of the points**. Strengthening the ai alone drops them to winning
half their points; enlarging the paddle alone leaves a quarter of points untouched.
Neither lever works without the other.

**Assisted and Insane change the game itself**, not just the opponent: both move
ball speed and paddle sizes; Normal changes neither. The menu gives each mode a
colour — green, blue, red — so the three read as characters rather than as three
settings of one slider. Normal's blue is also the colour a selected button fills
with, which works only because selected is filled and unselected is an outline.

A preset has three optional halves, and each has a pristine copy behind it:
`ai` (how well the opponent reads the ball), `game` (the ball and paddles both
sides get) and `ability` (how this mode tunes the moves). `applyGame()`,
`applyAbility()` and the rebuild of `AI` from `AI_DEFAULTS` all write **every**
field on every call rather than only the overridden ones. Applying one preset on
top of another otherwise leaves whatever the previous one set: switching off
Insane would keep its faster ball, and — a real failure caught by a test —
Normal's earned-Expand trigger would follow you into Assisted and start handing
out big paddles for rallying well, which is the exact behaviour Assisted had
removed. Invisible in play, and it makes every later measurement a lie.

`applyAbility()` replaces each nested move spec wholesale rather than merging into
it, and clones with `structuredClone` rather than `JSON` — `durationTicks` is
`Infinity` in three places, and JSON turns that into `null`.

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
| Easy / Medium / Hard, while they existed | ~72% / ~86% / ~96% |
| Assisted / Normal / Insane, each against its own game | ~82% / ~88% / ~99% |

Assisted's ai saving more than Easy's did is not a mistake — see above. It is
supposed to return the ball; the help is the player's paddle and the slow ball,
neither of which this number can see. Normal landing where Medium did is
deliberate: it is the mode that replaced it.

**These are three separate readings, not a ranking.** While Easy, Medium and Hard
existed they all played one ball, so their figures could be set against each
other. Nothing does now — every surviving mode changes the ball, the paddles or
both — so each number answers "how often does *this* mode's ai save *this* mode's
ball" and nothing else. The harness never asks how hard the ball is for the
**player**, which is most of what separates the three.

The number understates every mode with moves in it, and it is worth knowing why
rather than trusting it. Only one of the opponent's three moves changes whether
it saves anything. The charged shot and the paddle squeeze make the ball harder
for *you*, and the sweep never asks about you — it only ever asks whether the ai
got a paddle to the ball. Insane is a great deal harder to play than the figure
suggests, and always has been.

### Whether you could have reached it

`REACH=1 node tests/ai-sweep.js` asks the other half: not whether the ai got
there, but whether *you* could have. It fires the shot the other way at a paddle
driven perfectly — no misread, no reaction delay — so a miss is the shot being
out of reach at `PADDLE_SPEED` rather than the player being bad at it.

It reports a **limit rather than a rate**, and the reason is worth keeping. Every
mode saves 100% of random shots from a centred start, so a percentage says
nothing and moves for nothing. The speed at which that stops being true says how
much room the mode has left:

| mode | cap it plays | worst shot reachable to | while squeezed |
| --- | --- | --- | --- |
| Assisted | 6.5 | 17.3 | 14.2 |
| Normal | 10 | 15.0 | 13.6 |
| Insane | 14 | **14.2** | **13.0** |

The worst shot is the fastest the mode allows, dead straight so it spends the
fewest ticks in flight, at the corner furthest from the paddle. Two things follow
and neither was known before it was measured.

**Insane is tuned to within about 2% of the keyboard-reachability limit** — a cap
of 14 against a limit of 14.2. Nothing there is broken, but there is almost no
room in it: raising `BALL_SPEED_MAX` past 14.2, or lowering `PLAYER_PADDLE_SCALE`
or `PADDLE_SPEED` at all, puts Insane's worst shot beyond what a keyboard can
answer. Assisted sits 165% under its limit and Normal 50% under, so neither is
anywhere near this and only Insane needs watching.

This is the same line the "Controls" section is drawn against, and it is a
sharper version of it. That section sets `PADDLE_SPEED` just under the steepest
descent **Normal** can produce, so a fast corner shot "has to be read early
rather than chased down". The measurement here already grants the early read —
the paddle heads for the true intercept from the first tick — so what it finds is
what is left after reading perfectly, and Insane spends it all.

**With Squeeze active, Insane is already past it** — a limit of 13.0 against a
cap of 14. A shrunken paddle starts further from the ball and arrives with less
of itself, and both work the same direction. So on Insane there exists a shot no
keyboard input can save, and it is reachable only in a rally long enough for the
ball to hit the cap (15 contacts from Insane's starting speed) with a Squeeze
live at the time.

A **mouse is bound by none of this**, which is worth holding next to the
"Controls" section's note that pointer control is deliberately not rate limited.
That decision is what keeps Insane playable at its current numbers, and it means
the mode is meaningfully harder on the keys than with a mouse.

**It is not tunnelling.** That was the other candidate explanation and it is
ruled out: a paddle pinned on the intercept saves every shot at every mode's cap,
and keeps doing so at twice Insane's. The first misses appear around a cap of 56,
four times Insane's, which is where `crossingY()`'s straight-line interpolation
starts disagreeing with a path that would have bounced off a wall inside the same
tick. Nothing in the game can reach that speed, so `crossingY()` needs no
continuous collision detection at any setting the modes can produce.

Blink is the exception, and it moves the number: once it was bound to the ball
rather than to a clock it became a guaranteed save on the approaches it fires, so
the same preset reads higher than it used to. That is the whole of the change
between the old ~98% and today's ~99% — the ai did not get better at reading the
ball, one of its moves stopped expiring early.

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

The modes are **characters, not points on a scale**, and the moves are what makes
that true. Tuning numbers harder and softer only ever produced more difficulties;
what distinguishes a character is that it *does things* — the opponent blinks up
and down the board like a cartoon villain, charges a shot that comes back faster
than the game normally permits, and throws lightning that leaves your paddle
shrunken and crackling. You get moves of your own back.

Every mode has some. That was not always so: they were built for Assisted and
Insane while the middle three had none, which is exactly what left five names
describing three differences. **Not every mode has all five**, though, and the
`modes` list on each move is what decides: the opponent's three are Normal and
Insane, and Assisted gets only the two that are yours. What a preset's `ability`
half varies is the *tuning* of the moves a mode already has.

### Two kinds of tell

A move either **charges** — glowing, pulsing and shaking — or merely **tints** the
paddle, and `tell` in its config says which.

The distinction is not decoration. A charge tell is a *warning*: something is
about to happen that you should brace for, or a thing you are holding that you
have to remember to spend. A tint is a *statement*: this is what you have now.
Expand makes the paddle visibly bigger, which announces itself without help, and
— unlike Squeeze, which shrinks you and genuinely is a threat — there is nothing
to brace for. Given the charge treatment as well, it read as a second,
different thing happening on top of the growth.

`PLAYER_TELLS` checks Clutch **before** Expand, because Expand's real tell is the
paddle's own size and survives being drawn over, while a held charge has nothing
but its pulse. In the other order, a charge earned during an active Expand was
invisible.

A test separates the two by sampling a pixel just outside the paddle: a glow
bleeds past the rect and a tint does not.

#### An attack is drawn on the attacker, and travels

Squeeze shrinks your paddle, and shipped drawn entirely on *your* paddle: red
glow, shaking, the same treatment Clutch uses for a reward. The reported symptom
was "what is that powerup?" — the victim looked like the owner.

The move is now staged the way the fiction says it happens. The opponent charges
on its own paddle, a bolt of lightning crosses the board, and your paddle arrives
shrunken and crackling. `tellWhile` keeps the wind-up on the attacker only, so
once the bolt is away the opponent stops glowing rather than appearing to channel
forever.

The general rule: **a move whose effect lands somewhere else is drawn in three
parts — the wind-up where it comes from, something crossing, and the effect where
it lands.** Drawing only the effect makes the target look like the beneficiary.

#### An effect timed against the ball, not against the clock

The squeeze shipped shrinking you by a fifth for a couple of seconds and was
reported as making no noticeable difference and usually ending before the ball
came back. Both were true, and the second is the general lesson: **an effect that
starts while the ball is heading away from you spends part of its life before you
can feel it.**

The bolt lands as the ball crosses to the opponent, so roughly half a volley
passes before the ball is coming at you again. A duration that looks generous
against a stopwatch can overlap the part that matters by nothing at all — with
the original values, measured, the paddle was small at **zero** of the player's
next two contacts.

Durations for anything aimed at the player are therefore set in **volleys** —
your contact to your next contact — with the lead-in budgeted for. The volley is
worth measuring rather than assuming: it varies by more than a factor of two
across the modes, because they play different balls. The test counts contacts for
the same reason, so retuning a speed cannot quietly invalidate it.

`node tests/volley-sweep.js` is the ruler: it reports a volley per mode and how
many of your next contacts each effect covers. Measure the move's **phase** and
not the paddle's size — size says only "this paddle is not its normal height",
so the *other* size move firing later in the same rally counts as this one, and
the first version of that tool reported a squeeze lasting twice as long as it
does.

#### Three wind-ups, one colour

Red means *the opponent is doing something to you*, and all three of its moves
are red. That was fine while only two of them lived on its paddle; moving
Squeeze's tell across made three identical wind-ups, and the reported symptom was
exactly that — "what is it doing?".

They stay one colour and differ in **behaviour**, which `windUp` names.
**Overdrive swells**: one long steady build, the slowest and largest of the
three. **Blink stutters**: it flickers hard on and off, reading as something
misfiring, which it needs to do because its wind-up is the shortest. **Squeeze
barely moves**: the lightning gathering on the paddle is the tell, and shaking
underneath it only muddied that.

The test cannot count lit pixels to tell a stutter from a swell — the paddle
shakes on purpose, and the jitter is bigger than the signal. `drawPaddle` records
what it computed in `lastTell` for that reason, and the check compares how far
the glow moves *from one tick to the next*: a stutter swings, a swell creeps.
The obvious version, comparing the range across a window, fails — a swell travels
a long way in total.

#### A held charge is a layer, not a tell

A paddle draws one tell. An opponent holding a charged shot therefore stopped
looking charged the instant it wound up something else, and a charge you cannot
see is a shot you cannot brace for. It is drawn separately, on top of whatever
tell is showing, and stays until the shot is spent. Both sides get it: the
opponent's Overdrive and the player's Clutch are the same idea pointed in
opposite directions.

The test has to isolate that layer rather than assert the paddle is red, because
a wind-up reddens it anyway — the first version of the check passed with the
layer deleted.

### Lean into it

A standing instruction for anything in this section: **these are supposed to be
chaotic, exciting and loud.** The moves are most of the reason to play any of the
modes, and a restrained powerup is a wasted one. When a choice is between tasteful and
obvious, take obvious — flash white, throw a ring, shake the paddle, stack the
effects up. The rest of the game is two rectangles and a square, so there is
plenty of quiet to spend.

This is a design instruction, not licence to skip the rules above it: a move still
telegraphs, and still says whose it is. Loud and unreadable is worse than quiet.

**Every move telegraphs before it does anything.** A move is `idle`, then
`telegraph` — a visible wind-up with no effect yet — then `active`. That order is
the whole reason the moves feel fair: you see the paddle shaking and glowing, so
losing to one is something that happened rather than something the game did behind
your back. A test asserts the ball is untouched throughout the wind-up, because a
telegraph that already applied its effect would be decoration rather than a
warning.

A cooldown runs in every phase, so nothing chains into itself.

### Blink, and the second time a timer was the wrong answer

Blink teleports the opponent up and down the board while the ball crosses, then
hops onto the real intercept once it is close. The showing-off half is what makes
it read as a villain move rather than as a fast paddle.

It shipped on a `durationTicks` timer and that could not work, for a reason worth
recording because it is the *same* reason the Expand timer failed. Blink arms when
the ball turns towards the opponent, but how long the ball takes to cross depends
on its speed — which varies by mode and by rally. No fixed number tracks that.
Measured over 300 approaches per mode, the paddle was still blinking when the ball
arrived **0% of the time in Normal and 41% in Insane**. It dashed about, stopped,
and then played the point completely normally: a move that could neither save nor
miss, which is to say decoration.

It now ends when the ball stops coming. `durationTicks: Infinity` says so, and
`updateAi` ends it on the tick the ball turns round. The general rule had already
been written down for Expand — *bind an effect to its situation, not to a clock* —
and was not applied here because nothing about Blink looked like a state. What
made it one is that it exists to answer a specific ball.

The cost is real and was measured: Insane's save rate went 98.9% → ~99.1%, because
a blink that lasts the whole flight is a guaranteed save on the approaches it
fires. Normal moved 86.4% → 88.4%. That is close enough to the softlock line to
watch — see **Insane must never save everything** above.

### Charged shots

A charged shot leaves at a flat multiple of **the mode's own speed cap**, not a
multiple of whatever arrived. Scaling off the incoming ball meant a charge earned
during a slow rally fired a slow shot — the same move measured 5.2 or 9.7
depending on nothing the player did, which is the opposite of drama. It is now the
same every time, and far enough above the cap that it is unmistakable.

**Far enough above the cap** is the part that is easy to get wrong, and was. The
opponent's shot shipped at barely over 1, which looks fine in isolation: it was
still much faster than an ordinary shot early in a rally. But an ordinary shot's
speed depends on what arrived, and late in a rally it is already *at* the cap — so
the move was dramatic on the first exchange and invisible on the tenth, which is
when it is being watched for. A multiplier close to 1 does not mean "slightly
weaker", it means "works at the start of a point and nowhere else".

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

**Filling a pip is an event, and it happens where you are not looking.** The meter
sits in a corner while the close call happens on your paddle in the middle of the
board, with your eye on the ball — so the paddle bursts white at the exact point of
contact as well. Two channels for one event, because the informative one is the
one nobody is watching.

**Completing the meter runs a sequence, and the paddle waits for it.** The third
pip pops on its own, then the pips sweep left to right, then all three flare
together, and only when that finishes does the paddle start its charged pulse. The
charge itself arms at the first instant — nothing about gameplay is delayed, only
the telling of it — so the sweep reads as a wind-up with the paddle lighting up as
the payoff. Hitting the ball during the sequence cancels it: there is nothing left
to celebrate once the charge is spent, and a celebration still playing for
something you no longer have is a lie.

The whole thing is a timeline counted in ticks, in one function, rather than
nested timers. That is what makes it possible to cancel in one line and to assert
against tick by tick.

**A held charge pulses rather than glowing steadily**, and shakes on its own knob
rather than a fraction of the wind-up's. A steady light reads as part of the
paddle; a moving one reads as something waiting to go off. The pulse counts
**ticks**, not milliseconds, or it would breathe at 144Hz twice as fast as at
60Hz — the same rule anything that flashes here has to follow.

### Who fires, and why

**The villain rolls; you earn.** The opponent's moves are a random chance per
approach, raised by however many points it is behind — it stops playing around
exactly when you start winning, which is both the drama and a self-balancing
property: it cannot bully you while you are already losing.

Yours are never random, and the two of them mean **different things**:

- **Clutch is a reward.** Three close calls fill the meter; it exists to pay out
  for playing well.
- **Expand depends on the mode.** In Assisted it is *mercy*: falling behind on the
  scoreboard, or losing three points on the trot. In Normal there is no mercy to
  give — the mode has no handicap on either side — so it is a *reward* there
  instead, earned by a run of returns. One move, two meanings, and the section
  below is about how it tells them apart.

Keeping reward and mercy apart is the whole design. A handout that arrives while
you are winning is not a handicap, it is noise — which is why Assisted has no
earned trigger and Normal has no situation one.

The losing run and the score gap are **separate triggers on purpose**. Dropping
three in a row while still level is a different kind of trouble from being two
points down after trading evenly, and only one of them is visible in the score.
Winning a point wipes the run, so it measures a slide rather than a total.

**Rejected: earning the bigger paddle with a run of three returns.** It shipped
and was wrong, in a way only measurement showed. Simulated across 302 points, a
competent player — one winning every game — got **100% of their activations from
that trigger and none at all from the other two**, because they never fell behind
and never lost three straight. The mode's handicap was reaching only the players
who did not need it, mid-rally, while they were comfortably winning the point.
Worse, the streak reset when it fired, so a long rally handed the paddle over
twice: 15 of those 302 points activated it more than once while 218 activated
nothing. With the trigger gone a winning player sees the paddle **zero** times a
game and a struggling one still sees it, which is what the mode was for.

If a run of good returns should be rewarded at all, it belongs to Clutch, which is
already the half of this that pays out for skill.

**In Assisted, Expand is a state, not an event.** You have the big paddle for
exactly as long as you are in trouble: it appears when the gap or the losing run
reaches its threshold and goes when it does not. `syncExpand()` holds the move to
the condition at every point, and both halves of it are no-ops when the state
already matches. `durationTicks` and `cooldownTicks` are neutral, because nothing
about it expires.

It took two wrong answers to get there, and both are worth knowing because they
are the obvious ones:

1. **A timer.** At Assisted's ball speed one round trip is longer than the timer
   was, so a paddle earned on a return could expire before the ball came back and
   never be used at all.
2. **A number of uses.** Better — it guaranteed you got to hit something with it —
   but it still ended in the middle of a match you were losing, which is precisely
   when it was supposed to be helping. Handing the paddle back while the player is
   still three points down is the timer's failure wearing a different hat.

The lesson generalises: an effect that exists to answer a *situation* has to be
bound to that situation, not to a duration or a budget. Ask what makes it stop
being needed, and end it on that.

#### The same move, answering a different question

In Normal, Expand is a **reward**, and the whole shape inverts. There is no
trouble for it to be bound to — Normal has no comeback help by design — so it is
earned by a run of returns, runs on a timer, and is taken away by conceding.
`expandIsState()` is what tells the two apart: with either situation trigger set
the move is a state and `syncExpand()` governs it; with neither set it is earned,
and `syncExpand()` steps aside entirely.

That last part is not decoration. Left running in a mode it does not govern,
`syncExpand()` finds its condition false at every point and ends the move — so a
paddle you earned would vanish on the next point *including one you won*. The
check that catches it is "winning a point keeps the paddle you earned"; the
obvious check, that losing does not grant one, passes with the guard removed and
proves nothing.

The timer here is the one rejected above, and it works for the opposite reason: a
reward that overstays stops reading as a reward. It is set several times longer
than the rejected value, because the failure then was expiring before the ball
came back, and it is bounded at the other end by conceding.

How long it should last was measured rather than guessed. Simulating a weak, a
middling and a strong player, the pair that was shipped puts the big paddle on for
roughly **12%, 23% and 47%** of ticks respectively, arriving about every other
point. A longer timer took the strong player past 70%, at which point it is not a
reward any more — it is the paddle.

Two smaller decisions fall out of it. The streak resets when the move is earned,
or one long rally hands it straight back the moment it expires. And arriving as a
reward has to *look* different from arriving as help, so the earned version bursts
on the paddle — the same white flash the meter uses — while Assisted's simply
grows. `entranceTicks: 0` is the Assisted look.

### Paddle sizes

**One function owns `hTarget`.** `syncPaddleSize()` looks at what is active and
works out the size; nothing else writes it. That is not tidiness, it is a bug
that shipped: Squeeze and Expand each set `hTarget` when they started and reset
it to the base size when they ended, so whichever *ended* last won. Shrunk by the
lightning, then handed the bigger paddle, and when the bigger paddle wore off you
were back at normal size with the lightning still crackling over you — an effect
that was still running had been silently overruled by an unrelated one finishing.

The rule that replaces last-writer is **precedence: an attack outranks a gift.**
Being squeezed while expanded leaves you small, and when the squeeze ends the
expand takes the paddle back if it is still running. Anything else that resizes a
paddle joins that function rather than writing the field.

Two things follow from the same idea. Expand cannot *arm* while Squeeze is active
— `blockedBy` says so, with `""` as its off value — because being handed a bigger
paddle mid-attack reads as the attack having failed. And a blocked move does not
draw its tell either: a green paddle that is also small claims a gift you are not
getting.

Each paddle carries its own `h`, eased towards `hTarget` over `resizeTicks` about
its own centre. It is animated because an instant resize reads as a rendering
glitch rather than as something happening — the paddle appears to *pop*, and the
eye reports a bug. `resizeTicks: 0` gives the instant version back if that is ever
wanted, and a test pins the eased behaviour.

`PLAYER_PADDLE_SCALE` and `AI_PADDLE_SCALE` are the size a paddle settles back to
and are part of a preset's `game` half — Insane starts you shorter, Assisted much
taller. The two sides being visibly unequal in those modes is the point, not a
bug.

**Expand and Squeeze scale a paddle's own base size, not `PADDLE_HEIGHT`.** An
absolute target silently means different things in different modes. Assisted
already starts you well above the default height, so a growth target written as a
multiple of `PADDLE_HEIGHT` lands barely above where that paddle already was — a
bump the player cannot see — while the identical number in a mode with a normal
base is close to a doubling. Relative keeps the *effect* constant where the
absolute kept only the number.

### Two traps

`onPlayerReturn()` runs **after** `bounce()`, not before. A close call arms a
charged shot and `bounce()` spends charged shots, so hooking it first meant the
save that earned the charge immediately consumed it and the player never saw it.
A test drives a real edge collision rather than calling the hook, because calling
the hook directly cannot catch this.

`applyDifficulty()` resets paddle sizes and disarms everything. Without it,
picking Insane and then a gentler mode left you playing the gentler one with
Insane's short paddle — the same class of bug as a preset leaking through `AI`,
and invisible until somebody wonders why the easy mode felt wrong.

### Everything is switchable

Same contract as the `AI` object: every knob in `ABILITY` names the value that
turns its feature off, `modes: []` disables a move outright, and a test asserts
that with all of them off the game is the plain one — no move ever fires and no
paddle ever changes size. All of this is tuned by feel, and feel changes.

## The win score

`WIN_SCORE` is chosen in the menu alongside the difficulty and stored the same
way. It is orthogonal to difficulty on purpose: a long game on Assisted and a
short one on Insane are both reasonable things to want, and folding the target
into the presets would have taken that away for no gain.

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

**A colour that is not a token has to earn it, and white did not.** Effects are
drawn with a bright core over a coloured glow — the paddle flash, the meter pop,
the squeeze bolt. White works for the first two because they are drawn *on a
paddle*, which is dark in the light theme. The bolt crosses the empty board, and
the light theme's board is pure `#ffffff`, so its core was invisible in exactly
the place it mattered: the effect read as a red outline of a bolt rather than as
a bolt. `boltCore()` picks it from the board's own luminance instead, and the
light theme gained about half again as much visible bolt.

Testing it is harder than it looks. A check that counts pixels unlike the board
passes with the fixed white core still in, because the red glow alone clears any
reasonable threshold — it says the bolt is there, not that it has a core. The
check counts pixels at the *opposite end of the luminance scale from the board*,
which is the only thing a core can supply.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#help-toggle` and `#instructions`, plus a `#menu` over the board
holding `#menu-heading`, a `#difficulty` radiogroup labelled by
`#difficulty-label`, a `#win-score-choice` radiogroup labelled by
`#win-score-label`, and `#play`; a hidden `#score-reader`; and `#win-score`
inside the instructions panel, which the script rewrites whenever the chosen win
score changes.

## Stored data

`pong.difficulty` and `pong.winScore` — the chosen mode and target score. Read
and written through `loadDifficulty`/`saveDifficulty`/`loadWinScore`/`saveWinScore`,
each wrapped because `localStorage` throws rather than returning `null` when it is
unavailable. `tests/pong.test.js` covers that path for the win score by making
storage throw.
