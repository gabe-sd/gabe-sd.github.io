# Pong TODO

Known gaps and unscheduled work for Pong, kept here rather than in the root
`TODO.md` so that an agent working on Pong and an agent working on another game
never edit the same file. The slug naming rules, and the rule that an entry is
deleted as it lands rather than marked done, are repo-wide and live in the root
`TODO.md`.

Entries are in priority order. The first one is what to do next.

`games/pong/DESIGN.md` has the model and what was tried and rejected; keep it in
step with the code, in the same commit as the change.

`tests/pong.test.js` covers the physics, the round lifecycle, the ai, the
controls, the panels, the difficulty presets, the win score, every ability, how
the effects are drawn (by reading canvas pixels, in both colour schemes) and a
soak that plays whole matches in each mode — add to it rather than around it.
Nothing is currently pinned there, but if you knowingly leave something broken,
pin it as described in `CLAUDE.md`.

Anything that changes how the game feels gets played before it merges. Not
designing for mobile at this point.

Each entry names the **gate** it has to pass: what Gabriel has to see, play or
decide before it can be called done. Gates are why the order is what it is. Feel
changes never share a gate — two of them in one playtest can be called worse
without either of us being able to say which one did it - so they are serialised
here rather than batched.

Entries with no gate need nothing from him and can run back to back.

### pong-pointer-beyond-board — The paddle stops when the mouse leaves the board

**Gate: try it with a real mouse.** Less a feel change than a hole — the check is
whether the paddle keeps up when the cursor goes past the edge of the canvas.

`pointermove` is bound to the canvas, so the paddle only tracks a pointer that is
over the board. Chasing a ball to the top and overshooting the canvas edge strands
the paddle wherever it had got to.

- Listening on `window` rather than the canvas covers everything inside the
  browser window. `handlePointerMove` already converts client coordinates against
  the canvas's own rect and clamps to the board, so it needs no new arithmetic.
- **Outside the browser window is a different problem, and possibly not solvable
  as asked.** The page receives no pointer events at all once the cursor leaves
  it, so no listener reaches that case. Pointer lock does, and it takes the cursor
  away and gives relative movement instead — which discards the 1:1 spatial
  mapping that `games/pong/DESIGN.md` says is the entire reason a mouse is worth
  using. Decide which "outside" this entry means before starting.
- The takeover guard stays. Control only moves to the pointer after
  `POINTER_TAKEOVER_PX` of movement, because the case it guards against is the
  mouse being *brushed* mid-rally. A window-level listener sees far more movement
  than a canvas-level one, so re-read that logic instead of assuming it survives
  the move.
- Pointer behaviour is the one thing here that must be verified with real XTEST
  input rather than `page.mouse` — see the section in `CLAUDE.md` and what
  believing synthetic input cost Minesweeper.

### pong-rename-anime-pong — Rename the game to Anime Pong

**Gate: none** — a copy change, not a feel change.

Display name only, decided this way to keep the blast radius small: the folder
`games/pong/`, the `pong.difficulty`/`pong.winScore` localStorage keys, and every
`pong-` slug in this file and in branch history stay exactly as they are. Renaming
any of those would break the naming convention above (the slug has to keep
matching the folder and the history), invalidate saved preferences on upgrade for
no benefit, and force a rename of every open and historical `pong-*` entry here —
none of which the new name is actually about.

What does change is what a player sees:

- `games/pong/index.html` — the `<title>` and the `<h1>`.
- root `index.html` — the hub card's `.game-name` text for this entry.
- Anywhere else the word "Pong" appears as copy rather than as an id, path or
  storage key — check the `?` panel and `#status` strings too.

Leave `games/pong/DESIGN.md`'s own title and prose alone unless doing this makes
it read strangely next to the new in-game name; it is an internal document about
the code, not player-facing copy, so it is not part of the contract either way.

`tests/docs-check.js` checks names, ids, paths and storage keys, not prose, so it
will not catch a half-renamed page — reread the touched files the way
`CLAUDE.md`'s "Reread the docs before merging" section describes.

### pong-serve-from-paddle — Serve from your own paddle, aimed where you choose

**Gate: playtest, its own.** It changes the opening of every single point and
what the ai's first read of the ball looks like, so it cannot share a session
with any other feel change.

Today `serve()` hands the ball to `newBall(serveTo)`
(`games/pong/script.js`), which spawns it at board centre on a random angle the
player has no say in — Space or a click on the board only triggers that roll.
Instead: while `phase === "serve"` and the server is the player, the ball sits on
(or at) the serving paddle, and a click chooses where it leaves from — the
vertical position, or some aim gesture — rather than the random ± `newBall`
currently rolls.

- **Decide what happens when the ai serves.** "The serve goes to whoever
  conceded the point," so the ai serves half the time. It has no click to aim
  with, so the simplest answer is: the player-side behaviour above is new, the
  ai-side serve keeps calling `newBall(serveTo)` exactly as it does today. Say so
  explicitly if a different answer is chosen, since DESIGN.md's "The round"
  section will need updating either way.
- **The click is already doing two other jobs.** "Space or a click on the board
  serves," and separately "a click on the board resumes" a pause. Aiming now
  wants the click's *position*, not just its occurrence, on top of both of those
  — work out how a click mid-pause, a click that serves, and a click that aims
  stay distinguishable, rather than assuming they compose for free.
- **The "place the ball by hand" invariant gets a new wrinkle.** DESIGN.md
  already warns that a test placing the ball has to set `phase` too, because
  `update()` returns before touching the ball outside `play`. This adds a new
  thing to be true during `serve` — the ball pinned to the paddle — that such a
  test now also has to account for.
- **This belongs before `pong-normal-rebalance`, for the same reason
  `pong-keyboard-paddle-speed` did.** Handing the player the opening
  angle is a real advantage; tuning Normal's difficulty against an opening shot
  that is about to change would have to be redone once this lands.
- Update `games/pong/DESIGN.md`'s "The round" section in the same commit, per
  `CLAUDE.md`'s rule that a doc describing how a game plays has to change with it
  — including whatever about this was tried and rejected along the way.

### pong-normal-rebalance — Normal is a bit too hard

**Gate: playtest, its own.** Gabriel called it, so he is the one who calls it
fixed.

Normal is the mode meant to be played and it currently asks too much.
`pong-keyboard-paddle-speed` has landed since this was written, so the faster
paddle is already in; judge it *after* `pong-serve-from-paddle` as well, because a
faster paddle and a self-aimed serve may between them be most of the answer, and
if they are, there is nothing left to do here.

The mode overrides very little, which is what makes it tunable.

- Its `ai` half sets only `readErrorNearPx` and `reactionTicks`; everything else
  comes from `AI_DEFAULTS`.
- It has **no `game` half at all** — stock ball, stock paddles, no handicap on
  either side. That is the mode's identity in `games/pong/DESIGN.md`, so slowing
  its ball or growing its paddle is not a tuning move, it is a different mode.
  Exhaust the other two halves first.
- Its `ability` half tunes all five moves, three of which are the opponent's.

DESIGN.md ranks the ai levers: how wrong the read still is when the ball arrives is
by far the strongest and must never reach zero, then reaction delay, then bounce
lookahead, then top speed, which is the weakest. Two recent things made this mode
harder and are the cheapest to look at first — binding Blink to the ball moved it
from 86.4% to 88.4% saves, and every move in the game now fires here.

- `node tests/ai-sweep.js` is the ruler, and it only asks whether the ai reached
  the ball. Overdrive and Squeeze make the ball harder for *you* and do not move
  that number at all, so softening them will read as having done nothing. Say
  which half you changed.
- One change per playtest.
- `pong-longer-volleys` below tunes these same ai levers for a different reason
  — rally length rather than difficulty. Land this entry first: loosening the
  ai's read to extend rallies on top of a "too hard" complaint that is still open
  conflates the two questions, and a playtest afterwards could not say which one
  it was reacting to.

### pong-longer-volleys — Rounds should last longer, more volleying

**Gate: a decision from Gabriel on the mechanism before writing any code, then
playtest, its own.** Longer rallies is a feel change like any other here, and
which knob produces it is not yet settled.

Volleying is the fun part, and rounds should have more of it. The default path is
the ai's existing difficulty levers — `AI_DEFAULTS` — rather than anything about
the ball:

- DESIGN.md already ranks them by how much they move the ai's behaviour: read
  error when the ball arrives first (never push it to zero — that is the softlock
  line), then reaction delay, then bounce lookahead, then top speed, the weakest
  of the four. Extending a rally without making the ai simply *worse* at closing
  points out favours nudging read-error/reaction rather than raw speed, the same
  ranking `pong-normal-rebalance` already uses.
- `node tests/volley-sweep.js` is the existing ruler for exactly this — it
  reports a volley (contacts per point) per mode already, for budgeting ability
  durations. Re-run it before and after as the measurement; no new tool is
  needed.

**Do not build against that default without checking first.** Ball-speed
mechanics — a slower `BALL_SPEEDUP` per hit, or a lower `BALL_SPEED_MAX` — could
produce the same effect through a completely different mechanism (a rally that
takes longer to speed out of reach, rather than an opponent that takes longer to
beat), and that fork was raised and left open rather than decided. **Ask Gabriel
which mechanism he wants before implementing either one** — the same shape as
the vines-or-laser decision gating `pong-vine-attack` below.

- Whichever is chosen, it must not be done by tuning the same levers
  `pong-normal-rebalance` just set for a different reason. Land that entry first,
  and say explicitly which half (difficulty vs. rally length) a given change is
  answering, same as that entry already asks.
- One change per playtest, per the house rule — this cannot share a session with
  `pong-normal-rebalance` or `pong-insane-ball-speed` below; all three touch
  ai/ball tuning and a single playtest cannot tell them apart.

### pong-insane-ball-speed — Insane's ball may be too fast to hit at all

**Gate: characterise first, then a decision from Gabriel if it turns out to be a
feel question rather than a bug, then playtest.**

The worry is that on Insane the ball moves fast enough that the player's own
paddle cannot realistically get to it — a question about whether *you* can hit
it, not whether the ai can, which `node tests/ai-sweep.js` was never built to
answer (it only asks whether the ai reached the ball; DESIGN.md's "What actually
changes difficulty" section already flags this blind spot for the opponent's
moves, and it applies just as much here).

**Characterise before changing anything** — there are two different causes here
and they take different fixes:

- **The ball is simply fast, on purpose.** DESIGN.md is explicit that "Insane is
  a great deal harder to play than the figure suggests, and always has been," and
  that brutality is the mode's character, not a bug. If this is the whole story,
  lowering `BALL_SPEED_MAX` for Insane is a difficulty decision indistinguishable
  from softening the mode, and needs the same sign-off `pong-normal-rebalance`
  needs for Normal — it is not something to decide unilaterally.
- **The ball is tunnelling** — travelling far enough per tick at the raised cap
  that it can cross a paddle's whole collision plane between one tick and the
  next. DESIGN.md's "The ball" section already designed around exactly this
  shape of bug: `crossingY()` interpolates the crossing rather than trusting the
  end-of-tick position, specifically because at the *current* speed cap the two
  are "at most a few pixels" apart. A cap raised enough could widen that gap past
  the paddle's own width, which would make `crossingY()`'s existing interpolation
  insufficient rather than wrong.
- Work out which one this is — e.g. measure ball travel-per-tick against
  `PADDLE_WIDTH` and the paddle's height band at Insane's cap — before picking a
  fix. If it is tunnelling, continuous collision detection (sweeping the ball's
  path against the paddle's swept rect between ticks, rather than point-sampling
  at tick boundaries) extends `crossingY()`'s own approach rather than replacing
  it. If it is not, this is a feel entry and belongs in the same conversation as
  `pong-normal-rebalance`, not a correctness fix.
- Do not batch this playtest with `pong-normal-rebalance` or
  `pong-longer-volleys` — different mode, different question, but still a feel
  change if the cause turns out to be the speed cap rather than tunnelling.

### pong-feel-pass — Tune what just shipped, now that it can be played

**Gate: playtest, and it is the whole entry.** Nothing here is a bug; every item
is a number that can only be judged by playing.

The three-mode rework went live without a final playtest. Bugs found during the
last round were fixed and merged straight away, so the state that shipped is not
the state that was last played. Start by playing all three modes. Normal has since
been played and called too hard; that verdict is `pong-normal-rebalance` and not
this entry's business.

Three specific things were flagged during that work and never decided:

- **Insane sits at ~99% saves**, up from ~98% before Blink was bound to the ball.
  Still beatable and still under the softlock line, but you take roughly half as
  many points off it as you used to. If it now reads as unwinnable rather than
  brutal, `chance` on Insane's `blink` is the knob — not the ai's reading error,
  which is what actually makes it hard.
- **Blink hops for the entire flight now.** That is what was asked for, and at
  `hopTicks` 3 it is around thirty teleports in a Normal-speed crossing. It may
  read as noise rather than menace. `hopTicks` makes it calmer; `lockPx` makes it
  settle onto the intercept sooner.
- **Assisted has not been played since Normal existed.** Its numbers were tuned
  when it sat beside Easy, and it is the one mode with a spec that is not about
  difficulty at all: it exists so a child who has not played Pong before has fun,
  which means rallies rather than a scoreline. Worth confirming it still does.

`node tests/ai-sweep.js` and `node tests/volley-sweep.js` are the two rulers, and
`games/pong/DESIGN.md` records what every figure in them means. Change one thing
at a time — a playtest cannot tell two feel changes apart.

### pong-charge-hitbox-tell — Color the paddle tips to show the Clutch hitbox

**Gate: Gabriel looks at the colours before they ship.** Not a full playtest —
this does not change how the game plays, only what it shows — but it is a new
colour on the player's own paddle, which is worth a look before it lands.

`ABILITY.clutch` already defines a band at each end of the player's paddle that
counts as a close call toward filling the meter (`games/pong/script.js`, near the
`clutch` config), and today it is completely invisible — the player has no way to
know it exists, let alone aim for it. Tint the top and bottom band of the
player's paddle to mark it.

- **It must track the band's actual definition, not the paddle's drawn size.**
  The comment on that constant is explicit about why: the band is a fraction of
  the paddle's *base* size, not its current height, specifically so an active
  Expand or Squeeze does not silently change where a close call registers. A tip
  drawn as a fraction of the live `h` would disagree with where `onPlayerReturn()`
  actually counts a close call whenever Expand or Squeeze is active — which is
  the exact failure this entry exists to avoid. A hitbox indicator that lies is
  worse than no indicator.
- Read the same base-size fraction the close-call check itself uses; do not
  recompute an independent one. `syncPaddleSize()` is still the only thing that
  writes a paddle's live height, and this entry should not need to touch it.
- Pick a colour that is not already claimed: green is Expand's and red is
  reserved for "the opponent is doing something to you" per DESIGN.md's "Three
  wind-ups, one colour." The tip tint needs its own colour, or it will misread as
  one of those two.
- A test should read canvas pixels at the band's edge, the way the existing
  Clutch-meter tests already do, rather than asserting on state — per
  `CLAUDE.md`, a meter nobody can see is precisely the failure this is fixing,
  and the same goes for a hitbox.
- Closely related to `pong-explain-the-modes` below, which is the *text* answer
  to the same hidden mechanic. Doing this one first may settle that entry's open
  question of whether the strategy needs spelling out in words at all.

### pong-explain-the-modes — Say what the modes and the powerups actually do

**Gate: read the wording.** Text in a panel rather than a feel change, so it does
not need its own playtest — but nobody except Gabriel can say whether it reads to
a beginner, which is the only audience that matters here.

The `?` panel lists the controls and the win score and nothing else. It has never
mentioned the difficulty modes, and it is silently missing the half of the game
that is hardest to work out by looking at it: a three-pip meter fills, a paddle
turns green and grows, the opponent teleports, throws lightning that leaves your
paddle shrunken and crackling, and fires a shot well above the speed the ball
otherwise reaches. None of it is named anywhere in the game.

Every mode has powerups now, so this is no longer a note about two odd modes — it
is missing from all three. It matters most on Assisted, which exists so a child
who has not played Pong before has fun, and a child is exactly who will not work
out unaided that hitting the ball with the very end of their own paddle, three
times, is what fills the meter.

The same paddle growth also means two different things depending on the mode:
help in Assisted, a reward for a long rally in Normal. If the panel says only "your
paddle gets bigger" it will be wrong in one of them.

- The panel is per-mode content in a game that can change mode from the menu at
  any time. Decide whether it lists all three at once or only the current one —
  the second reads better and means the text has to be rebuilt in
  `applyDifficulty()`, alongside the paddle and ability reset it already does.
- Naming what fills the clutch meter tells the player to aim with the edge of
  their own paddle, which is a real strategy the game currently hides. Worth
  deciding whether revealing it is the intent — `pong-charge-hitbox-tell` above
  reveals the same thing visually and landing it first may answer this question
  on its own.
- `#win-score` in that panel is already rewritten when the win score changes;
  whatever keeps mode text in step should follow the same path.
- Do not quote the numbers. A panel that says "three close calls" goes stale the
  first time `segments` is tuned, in exactly the way `games/pong/DESIGN.md` warns
  a doc does — and here the player sees the wrong version, not just the next
  developer.
- The same panel already lies to a touch device, listing keys a phone does not
  have — see "On a phone" in `games/pong/DESIGN.md`. Mobile is deferred, but it is
  the same panel and worth reading before rewriting it.

### pong-vine-attack — Vines that wrap the opponent's paddle and slow it

**Gate: a decision from Gabriel first — vines or a laser, see below — then a
playtest of its own.** How hard the slow bites, how long it lasts and how you earn
it are all feel, and it is the first thing you own that reaches the other side of
the board.

Vines shoot out of the player's paddle, cross the board, wrap around the
opponent's paddle and slow it for a few seconds. It is deliberately the mirror of
Squeeze — the opponent's lightning — and it is the move that evens the two sides
up. You get Expand and Clutch, both of which act on your own paddle; the opponent
gets Blink, Overdrive and Squeeze, and Squeeze is aimed at you.

**This replaces `pong-shooter-powerup`**, which answered the same asymmetry with a
collectable that turned your paddle into a gun and bullets that slowed the
opponent on contact. Same effect, more machinery: it needed a second moving object
and then a third, where the vine reuses the staging Squeeze already has. Four
things that entry knew are still true.

- **Slow, not shrink.** Squeeze already shrinks a paddle, and two moves doing the
  same thing read as one move. Slow is a new axis and it is legible: the paddle
  visibly cannot get there.
- **Slowing the ai means a live multiplier, never a write to `AI`.** `AI.speed`
  and `panicSpeed` are rebuilt from `AI_DEFAULTS` on every mode change, so a
  debuff written into them is either wiped or leaks into the next mode. Derive the
  value from what is active — the same shape `syncPaddleSize()` uses for paddle
  height, and for the same reason: two effects writing one field means whichever
  ends last wins.
- **It is a move like any other.** It belongs in `ABILITY` with a `modes` list and
  an off value for every knob, and both "everything off" tests have to still pass.
- **Nothing it fires may touch the ball.** The ai reads the ball by simulating
  clean physics (`predictInterceptY()`), so anything that deflected the ball would
  make the opponent misread shots for a reason the player cannot see — a bug from
  where you are sitting, not a mechanic.

**Vines, or a green laser?** Gabriel raised the laser after this entry was
written and is unsure which fits the game better. It decides what the move looks
like rather than what it does, and it is not settled — **get the answer from him
before building either.**

It is not a return to the gun. Whichever way it lands, this stays one earned move
that crosses the board and slows the opponent, staged the way Squeeze is; the
shooter's collectable, its stream of bullets and its second and third moving
objects are gone either way. Two things bear on the choice, neither decisive:

- **A slow has to be legible**, which is the argument the move is built on: the
  paddle visibly cannot get there. Vines wrapping a paddle say "bound" with no
  caption. A beam hitting one says "hit", which reads closer to damage than to
  slow, so a laser has to carry the slow some other way.
- **Something has to cross the board.** A move whose effect lands elsewhere is
  drawn in three parts and the middle one is the travel. A vine has that
  naturally; a laser arrives instantly unless the beam is drawn lingering, which
  is a choice rather than something the fiction hands you.

Four more things are undecided once that is, and the first is the real one:

- **How you earn it.** The player's moves are never a random roll — the villain
  rolls, you earn. Clutch pays out for close calls; Expand is mercy in Assisted
  and a return streak in Normal. A third player move needs a third condition that
  is neither. A collectable served into play that you have to hit is one answer,
  and is the part of the shooter entry worth keeping.
- **What colour it is.** Red means the opponent is doing something to you and all
  three of its moves are red, so a player attack cannot be red. Green is Expand's.
- **How it is staged.** A move whose effect lands somewhere else is drawn in three
  parts: the wind-up where it comes from, something crossing, and the effect where
  it lands. That rule exists because Squeeze got it wrong and the victim looked
  like the owner. `makeBolt()` and `strokePath()` already draw a jagged glowing
  path between two points — vines want a different line, not different machinery.
- **How long it lasts.** Durations aimed at the *player* are set in volleys
  because the lead-in eats half of one before the ball is coming back. This lands
  as the ball heads towards the opponent, so it bites on the very next contact:
  the lead-in argument runs the other way and Squeeze's number must not be copied
  across. `node tests/volley-sweep.js` is the ruler either way.

### pong-high-dpi-canvas — Blurry on high-DPI displays

**Gate: someone has to look at it.** Screen capture of the X11 root is black on
the dev box, so "is it sharper" cannot be answered from a terminal at all.

The canvas backing store is a fixed 600x400 scaled by CSS `max-width: 100%`, so it
is soft on any display with `devicePixelRatio > 1`. Size the backing store by
`devicePixelRatio` and scale the context to match.

- `handlePointerMove` already converts client coordinates using the ratio of
  `HEIGHT` to the element's rendered height, so it survives this change — but it is
  the thing to check first if the paddle starts tracking the pointer incorrectly.
- The menu is positioned against `.board-wrap` rather than the canvas itself, so it
  should be unaffected. Worth a look regardless.
- Nobody working on this from a terminal can see the result: screen capture of the
  X11 root is black on the dev box. It needs someone who can look at the screen to
  say whether it actually got sharper.

### pong-visual-overhaul — Real art, and a menu that feels right

**Gate: yours throughout — this is entirely a look-and-feel entry.**

Three things have accumulated here, all of them placeholder-by-agreement rather
than oversights:

- **The menu does not feel right.** Called functional-for-now when the three-row
  version shipped. It is a heading, three difficulty buttons, a "first to" row and
  Play, stacked centred over the board. It was five buttons when that complaint
  was made, so re-look before assuming it still applies.
- **The mode colours are placeholders.** Assisted green, Normal blue, Insane red,
  from `--win`, `--accent` and `--lose`. Blue doubling as "selected" is survivable
  only because selected is a filled button and unselected is an outline; if the
  art pass changes what selected looks like, check that Normal still reads as
  unchosen.
- **Real art assets**, which the game has never had — everything is `fillRect`
  against theme tokens.

`games/pong/DESIGN.md` explains why the menu is DOM buttons over the canvas rather
than shapes painted on it. That reasoning survives an art pass; the styling does
not depend on it.

Worth doing after `pong-high-dpi-canvas` rather than before — there is no point
art-directing against a backing store that is about to change resolution.

### pong-two-player — Two-player mode

**Gate: try it.** Confirm the two sets of controls do not fight each other, and
decide whether the difficulty row greys out or disappears in two-player.

W/S for the left paddle, arrows for the right. A small change to the input
handling, and it matches Tic Tac Toe and Chess, which are both already local
two-player.

- The ai and the difficulty menu both become meaningless in this mode. Decide
  whether it is a fourth button in that row, a separate toggle, or its own entry
  point.
- `updateAi()` would simply not run and the right paddle would read keys the way
  the left one does. The pointer takeover logic is written for one player and would
  need splitting or disabling.

### pong-sound — Paddle, wall and score tones

**Gate: playtest, its own.** Tones are pure feel and cannot share a session with
another feel change.

Classic Pong is its blip. A WebAudio oscillator gives paddle, wall and score tones
with no asset files and no dependency, which is what keeps it compatible with the
no-dependencies rule.

- Needs a mute toggle with the choice remembered — same namespaced key and
  try/catch treatment as the difficulty.
- Browsers refuse to start an AudioContext before a user gesture, and there is an
  obvious one to hang it off: the Play button.
- The menu is a three-button difficulty row, a three-button win score row and
  Play, so a mute control most likely sits with Restart and `?` rather than in it.

### pong-hit-feedback — Visual feedback on contact

**Gate: playtest, its own.** Trail length and flash intensity are pure feel.

A short ball trail, a paddle flash on contact, a flash on score. A few lines each
in `draw()`.

- **Most of this is already written, for the abilities rather than for contact.**
  `aiGhosts` keeps the last few paddle positions and draws them fading behind a
  blink, which is exactly the shape a ball trail wants; `paddleFlash` already
  flashes a band across a paddle; `drawCharged` draws a pulsing aura; and
  `makeBolt`/`strokePath` will draw a jagged glowing path between any two points.
  Extend those rather than building parallel machinery beside them — the knobs
  live in `ABILITY.afterimages`, `ABILITY.pop` and `ABILITY.squeeze`.
- Read the Theme section of `games/pong/DESIGN.md` first. A white core is
  invisible on the light theme's board, which is pure white, and effects drawn
  over the *board* rather than over a paddle have to pick their colour from the
  background's luminance.
- Anything that flashes has to be driven by the tick count rather than by wall
  time, or it will run at different speeds on different monitors.

### pong-persisted-stats — Remembered stats

**Gate: one question first, then none.** Where it displays is a design decision;
the storage and the counting are not.

Longest rally, or wins and losses, stored the same way as the Minesweeper best
time: one namespaced key, every access wrapped in try/catch.

- Where it displays is the open question. The menu is the obvious home and now
  carries two rows of three buttons plus Play, so anything added there has to
  earn its space rather than simply fit.

### pong-mobile-support — Make Pong work properly on a phone (deferred)

**Gate: none — deferred by decision, not by difficulty.**

Not designing for mobile at present. What an emulated phone actually did with the
game is written up under "On a phone" in `games/pong/DESIGN.md` — it mostly works,
and the three things that do not are described there. Read that before starting;
it is the only reason this entry is not simply deleted.
