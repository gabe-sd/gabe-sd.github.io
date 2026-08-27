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
controls, the panels, the difficulty presets, the win score and every ability —
add to it rather than around it. Nothing is currently pinned there, but if you
knowingly leave something broken, pin it as described in `CLAUDE.md`.

Anything that changes how the game feels gets played before it merges. Not
designing for mobile at this point.

Each entry names the **gate** it has to pass: what Gabriel has to see, play or
decide before it can be called done. Gates are why the order is what it is. Feel
changes never share a gate — two of them in one playtest can be called worse
without either of us being able to say which one did it - so they are serialised
here rather than batched.

Entries with no gate need nothing from him and can run back to back.

### pong-three-modes-with-powerups — Three difficulties, and powerups in all of them

**Gate: playtest, its own, and the biggest one left.** This changes what every
mode feels like. It cannot share a session with another feel change.

Two halves of the same job. Cut the five difficulties down to three, and give
every level powerups instead of only the two joke modes.

They are one entry because the second forces the first. The five exist because
Assisted and Insane are *characters* rather than points on a scale: they own a
`game` half that changes the ball and the paddles, and they are the only modes
with abilities, while Easy, Medium and Hard differ in `ai` settings alone and all
play an identical ball. Give every level powerups and that distinction is gone —
at which point five names describe three real differences.

The measurements say the same thing. Save rates run Easy 72%, Medium 87%,
Hard 95% — but Assisted measures 80% and Insane 98% against their *own* ball, so
the five do not form one scale and never have. `tests/ai-sweep.js` marks those two
with a `*` for exactly this reason. Three modes that all play a comparable game
would make the sweep's numbers mean one thing again.

**The question to settle first is where Assisted's spec goes.** Assisted exists so
a child who has not played Pong before has fun — not so the game is hard to lose.
That is why its AI is deliberately *stronger* than Easy's while the handicap sits
on the player's side, and it is the least obvious thing in the current design. If
Assisted becomes "the easy one" on a three-point scale, decide deliberately
whether that spec survives, moves, or is dropped. Answer this before writing code;
everything else follows from it.

Then the mechanical parts:

- **`modes` arrays are the whole gating mechanism.** Every move carries one
  (`blink`, `overdrive` and `squeeze` are `["insane"]`; `expand` and `clutch` are
  `["assisted"]`). Powerups everywhere means every one of those lists changes.
  `modes: []` must keep disabling a move outright — a test asserts that all of
  `ABILITY` off gives back the plain game, and another that all of `AI` off gives
  back the old direct mover. Both have to stay true.
- **Decide whether both sides get moves at every level.** Today the split is
  thematic, not symmetric: the player gets `expand` and `clutch`, the ai gets
  `blink` and `overdrive`, and `squeeze` is an ai move that shrinks *the player's*
  paddle. `PLAYER_TELLS` and `AI_TELLS` colour them hero-green and villain-red per
  side, so a mode where both sides fire everything needs that scheme to still read
  at a glance.
- **Presets have two shapes and `applyGame()` writes every field on every call**
  so one cannot leak into the next. If all three modes gain a `game` half, keep
  that property — it is what stops choosing Insane and then Easy leaving you on
  Insane's ball.
- **`pong.difficulty` stores a level name that is about to stop existing.**
  `loadDifficulty()` already returns `null` for a name not in `DIFFICULTY`, so an
  old value degrades to the default rather than breaking. Worth a test, not worth
  a migration.
- `tests/ai-sweep.js` iterates `Object.keys(DIFFICULTY)` and follows automatically.

`games/pong/DESIGN.md` needs updating in the same commit — "Difficulty", "What
actually changes difficulty" and the Abilities section all describe the five-mode
world. So does the `ABILITY` bullet in `CLAUDE.md` if the modes contract changes
shape.

Ordering: this lands before `pong-explain-the-modes`, which would otherwise write
panel text about five modes and the two that have powerups, and have to rewrite
it a week later. It also shrinks the difficulty row from five buttons to three,
which is part of what `pong-visual-overhaul` is unhappy about — worth seeing the
three-button row before art-directing that menu.

### pong-explain-the-modes — Say what the modes and the powerups actually do

**Gate: read the wording.** Text in a panel rather than a feel change, so it does
not need its own playtest — but nobody except Gabriel can say whether it reads to
a beginner, which is the only audience that matters here.

The `?` panel lists the controls and the win score and nothing else. It has never
mentioned the difficulty modes, and since the abilities landed it is silently
missing the half of the game that is hardest to work out by looking at it: on
Assisted a three-pip meter fills and the paddle turns green and grows, on Insane
the opponent teleports, glows, shrinks your paddle and fires a shot above the
speed the ball otherwise reaches. None of it is named anywhere in the game.

It matters most for the mode it was built for. Assisted exists so a child who has
not played Pong before has fun, and a child is exactly who will not work out
unaided that hitting the ball with the very end of their own paddle, three times,
is what fills the meter.

- The panel is per-mode content in a game that can change mode from the menu at
  any time. Decide whether it lists every mode at once or only the current one —
  the second reads better and means the text has to be rebuilt in
  `applyDifficulty()`, alongside the paddle reset it already does there.
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
  version shipped. It is a heading, five difficulty buttons, a "first to" row and
  Play, stacked centred over the board.
- **The ability colours are placeholders.** Assisted is green and Insane red,
  taken from `--win` and `--lose`. Blue was asked for and could not be used:
  `--accent` is blue and already means "this button is selected", so a blue
  Assisted reads as chosen before you touch it. Changing that means deciding what
  selected looks like first.
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
- The menu is now five difficulty buttons, a win score row and Play, so a mute
  control most likely sits with Restart and `?` rather than in it.

### pong-hit-feedback — Visual feedback on contact

**Gate: playtest, its own.** Trail length and flash intensity are pure feel.

A short ball trail, a paddle flash on contact, a flash on score. A few lines each
in `draw()`.

- **Most of this is already written, for the abilities rather than for contact.**
  `aiGhosts` keeps the last few paddle positions and draws them fading behind a
  blink, which is exactly the shape a ball trail wants; `paddleFlash` already
  flashes a band across a paddle when the clutch meter fills. Extend those rather
  than building parallel machinery beside them — their knobs live in
  `ABILITY.afterimages` and `ABILITY.pop`.
- Anything that flashes has to be driven by the tick count rather than by wall
  time, or it will run at different speeds on different monitors.

### pong-persisted-stats — Remembered stats

**Gate: one question first, then none.** Where it displays is a design decision;
the storage and the counting are not.

Longest rally, or wins and losses, stored the same way as the Minesweeper best
time: one namespaced key, every access wrapped in try/catch.

- Where it displays is the open question. The menu was the obvious home when it
  held three buttons; it now carries five difficulty buttons, a three-button win
  score row and Play, so anything added there has to earn the space.

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

### site-visual-design — Improve the site's design and visual appeal

### highscore-backend — A backend for stored values

Everything is `localStorage` today, so nothing is shared between devices or
players. A high score table is the obvious first thing that needs a server, and
also the first thing that would break the "no build, no dependencies, files served
as-is" property the site has now. Worth planning before it is wanted.
