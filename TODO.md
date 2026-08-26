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

1. **P9 and P10** together — same panel, same stored settings, and P10 is nearly
   free once the panel exists.
2. `games/pong/DESIGN.md`. The AI model is the content it has been waiting for,
   and `CLAUDE.md` is already past the paragraph it allows a game there.
3. **P14** and **P15**, whenever. P14 needs someone who can see the canvas; P15
   wants splitting into separate entries before any of it starts.

Step 1 changes how the game feels, so it gets played before it merges.

`tests/pong.test.js` covers the physics, the round lifecycle, the controls and the
panels — add to it rather than around it. Nothing is currently pinned there, but
if you knowingly leave something broken, pin it as described in `CLAUDE.md`.

### P9 — Difficulty settings

The levers already exist as the `AI` object in `games/pong/script.js`; a preset is
a set of overrides on it. The ones that actually change difficulty are
`readErrorNearPx` (how wrong it still is when the ball arrives — the single
strongest lever, since an ai that ends up certain never misses at all),
`reactionTicks`, `lookaheadBounces` and `speed`. An Easy /
Normal / Hard preset would vary error magnitude, reaction delay, AI max speed, ball
base speed, and possibly `PADDLE_HEIGHT`.

- Minesweeper's gear button (`#settings-toggle` opening `#settings`) is the
  established pattern for a panel like this; follow it rather than inventing a
  second one.
- Any panel with a `display` rule needs it scoped to `:not([hidden])`, or the
  display value beats `hidden` and it renders open on load.
- Persist the choice in one namespaced `localStorage` key alongside the Minesweeper
  keys, and wrap every access in try/catch — `localStorage` throws rather than
  returning null when unavailable, and an unguarded read at load takes the page
  down. Treat "cannot read" as the default difficulty.

### P10 — Configurable win score

`WIN_SCORE` is hardcoded to 5, which is a short game. First to 5 / 7 / 11 belongs
in the same settings panel as the difficulty.

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

## Improve site design and visual appeal

## Plan and architect a backend for stored values e.g. highscore table
