# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

Once a section has enough entries to need them, they carry a short ID prefixed by
the game (`P` for Pong) so they can be named in conversation. Four rules stop those
rotting:

- **Assigned once, never reused or renumbered.** Deleting a landed entry leaves a
  gap; closing the gap silently repoints every reference made before it.
- **Kept out of commit messages and branch names.** An ID stops meaning anything
  the moment its entry is deleted, so history has to describe itself.
- **Grep for the ID before deleting an entry.** A cross-reference to an entry that
  no longer exists cannot be recovered without digging through old file versions.
- **Never cite an ID that has already gone.** Point at the code or the behaviour
  instead — a new entry referring to landed work is the same dead link arriving
  from the other direction.

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

Order of work:

1. **P19** — Assisted and Insane, two more buttons in the menu's difficulty row.
2. **P14** and **P15**, whenever. P14 needs someone who can see the canvas; P15
   wants splitting into separate entries before any of it starts.

**P10 is deferred** and deliberately not in that list. It was going to ride along
with the difficulty work on the grounds that a settings panel would have room for
it; the menu that was built — three difficulty buttons and Play — does not. It
needs somewhere to live before it needs building, and it may not be wanted at all.

Step 1 changes how the game feels, so it gets played before it merges. Not
designing for mobile at this point.

`games/pong/DESIGN.md` has the model and what was tried and rejected; keep it in
step with the code, in the same commit as the change.

`tests/pong.test.js` covers the physics, the round lifecycle, the controls and the
panels — add to it rather than around it. Nothing is currently pinned there, but
if you knowingly leave something broken, pin it as described in `CLAUDE.md`.

### P10 — Configurable win score (deferred)

`WIN_SCORE` is hardcoded to 5, which is a short game. First to 5 / 7 / 11 would be
the obvious options.

Deferred rather than scheduled: the difficulty menu is three buttons and Play, so
there is nowhere for this to go without adding a second row that nobody has asked
for. Decide where it lives — and whether it is wanted — before building it. The
`?` panel already reads the win score from `WIN_SCORE` rather than hardcoding it,
so that part will not need revisiting.

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

### P19 — Assisted and Insane modes

Two difficulty modes beyond the Easy / Medium / Hard that P9 adds, sitting outside
them at both ends: **Assisted**, a genuine handicap for someone who just wants to
rally, and **Insane**, comically hard on purpose.

These are separate from P9 because they change *the game*, not the opponent. P9's
presets only override the `AI` object, so both sides play the same game and the
save-rate sweep measures the difference honestly. These two would also move ball
speed and paddle height, which is a different kind of change and worth keeping
distinguishable.

- Assisted: slower serve and a lower speed cap, a taller player paddle, and an ai
  well below Easy. It should be very hard to lose.
- Insane: faster ball, shorter player paddle, and an ai near the top of what the
  levers allow. It should be close to unwinnable and obviously a joke.
- Two more buttons in the menu's `#difficulty` row, or a second row if five across
  is too wide at 600px. `applyDifficulty()` already layers a preset over a pristine
  copy of the defaults, so adding entries to `DIFFICULTY` is most of the work — but
  these two also need to reset whatever they change *outside* the `AI` object,
  which nothing does yet.
- The save-rate figure in `games/pong/DESIGN.md` stops being comparable across
  modes once the ball and paddle change, since it measures the ai against a fixed
  game. Either measure these separately or say plainly that the number only
  applies to the ai-only presets.
- Asymmetric paddle heights make the two sides visibly unequal. That is the point
  here, but it is worth confirming it does not look broken before committing to it.

## Improve site design and visual appeal

## Plan and architect a backend for stored values e.g. highscore table
