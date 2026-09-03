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
the rest of this simple: `script.js` itself never needs a solver or a
uniqueness-checker — see "Puzzle data" below for where that logic actually
lives.

"Is this cell wrong" is real Sudoku legality — a filled editable cell is wrong
if its digit duplicates another cell's digit in the same row, column, or 3x3
box, checked against that cell's ~20 peers. **Comparison against the bundled
solution was considered and rejected**: it only agrees with legality-checking
on a *complete* grid, where uniqueness guarantees the two are the same grid. On
a partial fill they diverge — a digit can be legal (no conflict yet) but still
not the solution's digit for that cell, so comparing to the solution would flag
it wrong immediately. That turns the game into a guess-checker: try 1-9 in a
cell and keep whichever doesn't turn red, no deduction required. Legality-
checking is barely more code and is what makes it Sudoku.

Win, unlike the per-cell check, *is* a valid use of uniqueness: every cell
filled with no conflicts anywhere is enough, because a unique-solution puzzle
has only one conflict-free complete grid — no need to compare against
`solution` there either.

## Model

- `PUZZLES`: an array of `{ givens, solution }`, both 9x9 grids of 0-9 (0 =
  blank in `givens`). `givens` is what's shown on load and after Restart.
  `solution` is bundled but not read by any runtime check below — it exists so
  puzzle data can be verified once, in tests (see "Puzzle data"), and so a
  future hint feature has somewhere to read a correct digit from.
- `grid`: the live 9x9 state of what the player has entered — starts as a copy
  of the current puzzle's `givens`.
- A cell is either **given** (non-zero in `givens`, not editable) or
  **editable** (zero in `givens`, player-fillable).
- Selecting an editable cell, then typing a digit 1-9 (keyboard) or clicking a
  `#number-pad` button, fills it; Backspace/Delete or an eraser button clears
  it. Given cells ignore all of this.
- A filled editable cell whose digit duplicates another cell's digit in the
  same row, column, or 3x3 box is marked wrong, live as it's typed — checks
  that cell's ~20 peers, no board-wide scan.
- Win: every editable cell is filled and no cell conflicts with any peer.
- Restart re-copies the current puzzle's `givens` into `grid`. New puzzle picks
  a different entry from `PUZZLES` and does the same.

## Not in v1

Decided against for a first version, each because it would add real complexity
to a game meant to stay very simple — not ruled out permanently, just not yet
earned:

- **On-the-fly generation.** Needs a backtracking solver plus a uniqueness
  check while digging holes — real logic, not wiring, and it would have to run
  in `script.js` itself. A fixed set moves that logic to a one-time offline or
  test-time check instead (see "Puzzle data").
- **Difficulty tiers.** With a fixed set there's no generator parameter to hang
  a tier on; New puzzle just moves through the set. Could group the set into
  tiers by given-count later without touching the model above.
- **Pencil marks, undo/redo, a hint button, a timer.** None of these change the
  model above; each is an independent addition layered on top if ever wanted.
- **Persistence.** No `localStorage` key yet — nothing survives a reload.
  Whichever of these lands first should follow Minesweeper's wrapped-read
  pattern (its own `DESIGN.md`) rather than an unguarded call.

## Puzzle data

Each entry in `PUZZLES` must be a legal, complete `solution` (every row,
column, and box a permutation of 1-9) whose `givens` is consistent with it and
has exactly one solution. None of that is checked at runtime — checking it
there is exactly the generator complexity this design avoids. Instead
`tests/sudoku-puzzles.test.js` runs a solver once per puzzle at test time and
fails if any bundled puzzle is malformed or non-unique, so a typo in hand-
authored puzzle data cannot reach `main` silently. That test is the only place
in this game a Sudoku solver exists.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#number-pad` (digit buttons 1-9 plus an eraser), and `#new-puzzle`
(swaps to a different entry in `PUZZLES` — distinct from `#restart`, which
re-blanks the current one).

## Stored data

None yet.
