# Sudoku: what a reader must not break

The invariants for Sudoku, kept in its own folder so that changing this game
touches no file another game's agent is editing. `CLAUDE.md` holds only what
every game shares — the page contract, the theme, the testing rules.

A design doc is only worth having if it is true, so **changing how a game plays
means updating this file in the same commit**, including whatever was tried and
rejected along the way. Rejected alternatives are the most valuable thing here
and the easiest to lose. Keep values out of it; those live in the code as named
constants, and a doc that repeats them is wrong the first time one is tuned.

**Sudoku** (`games/sudoku/script.js`) ships as a small fixed set of hand-picked
puzzles rather than generating them on the fly. That single choice is what keeps
the rest of this simple: each puzzle bundles its own solution alongside its
givens, so nothing here needs a solver or a uniqueness-checker.

Because a puzzle's solution is already known, "is this cell wrong" is a straight
comparison to that solution rather than general Sudoku-validity logic
(row/column/box duplicate detection) — a filled cell is wrong the moment it
disagrees with the solution's digit at that position, and the puzzle is solved
when every editable cell matches. This only holds because each bundled puzzle is
pre-verified to have exactly one solution; if that stopped being true,
comparison-to-solution and validity-checking would diverge, and mistake
detection would need to become genuine constraint-checking instead.

## Model

- `PUZZLES`: an array of `{ givens, solution }`, both 9x9 grids of 0-9 (0 =
  blank in `givens`). `givens` is what's shown on load and after Restart;
  `solution` is never shown but is what filled cells are checked against.
- `grid`: the live 9x9 state of what the player has entered — starts as a copy
  of the current puzzle's `givens`.
- A cell is either **given** (non-zero in `givens`, not editable) or
  **editable** (zero in `givens`, player-fillable).
- Selecting an editable cell, then typing a digit 1-9 (keyboard) or clicking a
  `#number-pad` button, fills it; Backspace/Delete or an eraser button clears
  it. Given cells ignore all of this.
- A filled editable cell that disagrees with `solution` at that position is
  marked wrong, live as it's typed — one array comparison, no board-wide scan.
- Win: every editable cell is filled and matches `solution`.
- Restart re-copies the current puzzle's `givens` into `grid`. New puzzle picks
  a different entry from `PUZZLES` and does the same.

## Not in v1

Decided against for a first version, each because it would add real complexity
to a game meant to stay very simple — not ruled out permanently, just not yet
earned:

- **On-the-fly generation.** Needs a backtracking solver plus a uniqueness
  check while digging holes — real logic, not wiring. A fixed set is what makes
  everything else above trivial.
- **Difficulty tiers.** With a fixed set there's no generator parameter to hang
  a tier on; New puzzle just moves through the set. Could group the set into
  tiers by given-count later without touching the model above.
- **Pencil marks, undo/redo, a hint button, a timer.** None of these change the
  model above; each is an independent addition layered on top if ever wanted.
- **Persistence.** No `localStorage` key yet — nothing survives a reload.
  Whichever of these lands first should follow Minesweeper's wrapped-read
  pattern (its own `DESIGN.md`) rather than an unguarded call.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#number-pad` (digit buttons 1-9 plus an eraser), and `#new-puzzle`
(swaps to a different entry in `PUZZLES` — distinct from `#restart`, which
re-blanks the current one).

## Stored data

None yet.
