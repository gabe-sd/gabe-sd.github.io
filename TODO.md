# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

Within a section, entries are in priority order. The first one is what to do next.

## Naming entries

Every entry is headed by a slug — the game, then **the work**:
`pong-difficulty-menu`, not `pong-difficulty`. Areas recur and get revisited; a
specific piece of work happens once, which is what keeps slugs from colliding.

The slug is also the branch name, so it lands in the merge commit and one string
retrieves the entry, the discussion and the implementation:

```bash
grep -rn "<slug>" .               # the entry, and anything referring to it
git log --all --grep="<slug>"     # the work itself, once it has landed
```

Run both before inventing a slug. Nothing else is needed: git is the record of
retired slugs, so there is no list to maintain, and a slug that did somehow repeat
still describes what it names in both places.

## Pong

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

### pong-keyboard-paddle-speed — The keyboard paddle is too slow

**Gate: playtest, its own.** A speed is pure feel, and this one changes how the
whole game plays rather than how one mode does.

`PADDLE_SPEED` caps keyboard movement at a fixed number of pixels per tick and has
never been tuned. It is slow enough that crossing the board is a commitment rather
than a decision.

- **Do not "fix" the pointer while you are in here.** Pointer control sets
  `player.y` straight from the event handler, outside the tick, so it is not
  rate-limited at all and a mouse crosses the board in one frame. That asymmetry
  is deliberate: it was fixed once and reverted on play, and `games/pong/DESIGN.md`
  has the argument under Controls. Raising the key speed narrows the gap, which is
  the point. Closing it is the thing that was already tried.
- Per **tick**, not per frame, like every other speed here.
- It is not part of a preset's `game` half — `applyGame()` writes `BALL_SPEED`,
  `BALL_SPEED_MAX` and the two paddle scales and nothing else — so one number
  changes all three modes at once. A per-mode speed means a fifth field there and
  a fifth line in that function.
- **This is why it comes before `pong-normal-rebalance`.** A faster paddle makes
  every mode easier, and `node tests/ai-sweep.js` cannot see it: the sweep asks
  only whether the ai reached the ball, never whether you could have. Tuning
  Normal against a paddle that is about to change would have to be done twice.

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

### pong-normal-rebalance — Normal is a bit too hard

**Gate: playtest, its own.** Gabriel called it, so he is the one who calls it
fixed.

Normal is the mode meant to be played and it currently asks too much. Judge it
*after* `pong-keyboard-paddle-speed`: a faster paddle may be most of the answer,
and if it is, there is nothing left to do here.

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

### pong-vine-attack — Vines that wrap the opponent's paddle and slow it

**Gate: playtest, its own.** How hard the slow bites, how long it lasts and how
you earn it are all feel, and it is the first thing you own that reaches the other
side of the board.

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

Four things are undecided, and the first is the real design question:

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
  deciding whether revealing it is the intent.
- `#win-score` in that panel is already rewritten when the win score changes;
  whatever keeps mode text in step should follow the same path.
- Do not quote the numbers. A panel that says "three close calls" goes stale the
  first time `segments` is tuned, in exactly the way `games/pong/DESIGN.md` warns
  a doc does — and here the player sees the wrong version, not just the next
  developer.
- The same panel already lies to a touch device, listing keys a phone does not
  have — see "On a phone" in `games/pong/DESIGN.md`. Mobile is deferred, but it is
  the same panel and worth reading before rewriting it.

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

## Minesweeper

### minesweeper-panel-state — Remember the panel open/closed state

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

## New games

### reaction-time-game — Reaction time test

### chimp-memory-game — Chimp memory test

See the Human Benchmark version for the shape of it.

## Site-wide

### site-favicon — The site has no favicon

Every page 404s `/favicon.ico`, because browsers ask for it whether or not you
reference one and there is no file to serve. Nothing is broken — it costs a
generic page icon in the tab and a 404 in the console — but it is the sort of
thing that reads as unfinished on a live site.

One file at the repo root is enough; browsers find `/favicon.ico` without a link
tag, which also keeps it out of every game page's `<head>`. An SVG referenced
from `shared.css`'s owning pages would need markup in all five instead.

### site-visual-design — Improve the site's design and visual appeal

### highscore-backend — A backend for stored values

Everything is `localStorage` today, so nothing is shared between devices or
players. A high score table is the obvious first thing that needs a server, and
also the first thing that would break the "no build, no dependencies, files served
as-is" property the site has now. Worth planning before it is wanted.
