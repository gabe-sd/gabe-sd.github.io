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

`tests/pong.test.js` covers the physics, the round lifecycle, the ai, the controls
and the panels — add to it rather than around it. Nothing is currently pinned
there, but if you knowingly leave something broken, pin it as described in
`CLAUDE.md`.

Anything that changes how the game feels gets played before it merges. Not
designing for mobile at this point.

Each entry names the **gate** it has to pass: what Gabriel has to see, play or
decide before it can be called done. Gates are why the order is what it is. Feel
changes never share a gate — two of them in one playtest can be called worse
without either of us being able to say which one did it - so they are serialised
here rather than batched.

Entries with no gate need nothing from him and can run back to back.

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

### pong-assisted-insane-modes — Should the joke modes change paddle sizes too

**Gate: playtest — this entry *is* the question.** Play Assisted. If it is already
hard to lose, delete this entry; the modes are done.

Assisted and Insane ship handicapping ball speed and the ai, and **not** paddle
height, which the original entry also called for. That half was held back on
purpose: a taller player paddle against a normal ai one is visibly asymmetric, and
whether that reads as deliberate or as a rendering bug is not answerable from a
terminal.

- The measured save rates are ~60% for Assisted and ~99% for Insane, each against
  its own ball — see `games/pong/DESIGN.md`, and note those two are not on the same
  scale as Easy/Medium/Hard.
- If paddle height is wanted, `PADDLE_HEIGHT` has to split into a player and an ai
  value, which is ~18 references in `script.js` and ~14 in `tests/pong.test.js`.
  `applyGame()` is already the place it would be reset from, and already writes
  every field on every call, so the reset discipline comes free.
- Insane must keep saving less than 100%. Section 25 of the suite asserts it, and
  `games/pong/DESIGN.md` says why: an ai that never concedes cannot be beaten, only
  survived, which is a softlock rather than a difficulty.

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
- The menu has room for a mute control, or it can sit with Restart and `?`.

### pong-hit-feedback — Visual feedback on contact

**Gate: playtest, its own.** Trail length and flash intensity are pure feel.

A short ball trail, a paddle flash on contact, a flash on score. A few lines each
in `draw()`.

- `draw()` redraws from scratch every frame and keeps no history, so a trail needs
  the last few positions stored somewhere.
- Anything that flashes has to be driven by the tick count rather than by wall
  time, or it will run at different speeds on different monitors.

### pong-persisted-stats — Remembered stats

**Gate: one question first, then none.** Where it displays is a design decision;
the storage and the counting are not.

Longest rally, or wins and losses, stored the same way as the Minesweeper best
time: one namespaced key, every access wrapped in try/catch.

- Where it displays is the open question. The menu is the obvious home, and it is
  currently three buttons and Play.

### pong-mobile-support — Make Pong work properly on a phone (deferred)

**Gate: none — deferred by decision, not by difficulty.**

**Deferred: not designing for mobile at present.** Recorded because the findings
below came from actually driving an emulated phone with real touch events, and
would otherwise have to be rediscovered.

It already works, which is the surprising part. Tapping the board serves, dragging
moves the paddle, `touch-action: none` correctly stops the page scrolling under the
drag, the layout does not overflow, and there are no errors. The canvas renders at
342x229 inside a 390px viewport. Three things are actually wrong:

- **There is no way to pause.** Escape and `p` are the only manual bindings and a
  phone has no keyboard. Auto-pause on a hidden tab still works and tapping the
  board resumes, so it is possible to get *out* of a pause but not into one. This
  is a functional hole rather than polish.
- **The `?` panel lies.** It lists W/S, the arrow keys and Space, none of which
  exist on a phone, and never mentions dragging. Whatever fixes this has to avoid
  showing keyboard controls to a touch device and vice versa without sniffing the
  user agent — a pointer media query is the usual answer.
- **Your finger covers the paddle**, since the player's paddle is on the left edge
  exactly where you drag. Nothing to do about that without moving the control
  somewhere else, which is a design question rather than a bug.

Also worth knowing: touch teleports the paddle, because pointer control is
deliberately not rate-limited — see the Controls section of `games/pong/DESIGN.md`
for why that was fixed once and reverted. On a mouse it is a curiosity; on touch,
lifting a finger and putting it down elsewhere is the normal way to move, so it
happens constantly.

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
