# Sudoku: what a reader must not break

The invariants for Sudoku, kept in its own folder so that changing this game
touches no file another game's agent is editing. `CLAUDE.md` holds only what
every game shares — the page contract, the theme, the testing rules.

A design doc is only worth having if it is true, so **changing how a game plays
means updating this file in the same commit**, including whatever was tried and
rejected along the way. Rejected alternatives are the most valuable thing here
and the easiest to lose. Keep values out of it; those live in the code as named
constants, and a doc that repeats them is wrong the first time one is tuned.

**Sudoku** (`games/sudoku/script.js`) ships as a small fixed set of puzzles
rather than generating them on the fly. That single choice is what keeps the
rest of this simple: `script.js` itself never needs a solver or a
uniqueness-checker — see "Puzzle data" below for where that logic actually
lives, and for how the set was produced.

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
fails if any bundled puzzle is malformed or non-unique. That test is the only
place in this game a Sudoku solver exists.

All 23 puzzles were produced by a one-off Node script — random full-grid
backtracking for a fresh `solution` each time, then digging cells out while a
solver confirmed uniqueness stayed at exactly one, keeping only puzzles with
at least 24 givens and discarding any that duplicated an existing one. That
script was not kept; it lived outside this repo for one run and its output is
only these puzzle entries. A generator bug in it could in principle have
produced a malformed or non-unique puzzle despite passing locally — which is
exactly what `tests/sudoku-puzzles.test.js` exists to catch before it can
reach `main`, machine-generated puzzle data included, not only hand-authored
typos. Whoever adds puzzle 24 either writes a similar throwaway generator or
hand-picks one; either way, run it through that test before it lands.

The first 3 puzzles were originally hand-picked instead: three shifts of one
formula grid (row *r* = row 0 rotated by a fixed offset per row), dug down by
hand. A playtester caught it immediately — "the bot literally placed 1-9 in
each row, but shifted" — because once you see the rotation in one row, every
other row is readable off it without ever touching Sudoku logic. Legal by the
uniqueness check (nothing above requires a grid to be *hard*, only correct),
but not what "puzzle" means to a player. They were replaced with generator
output; see "What makes a puzzle good" below for the guideline this became.

## What makes a puzzle good

Legal and unique is necessary but not sufficient — the formula-grid puzzles
above were both, and still weren't Sudoku to play. Everything in `PUZZLES`
must also clear these, checked in `tests/sudoku-puzzles.test.js`:

- **No formula grid.** A `solution` where one row is a cyclic rotation of
  another lets a player read the whole grid off a single row with no
  deduction — that's the defect above, generalized past the exact rotation
  offsets it used. A grid from genuine randomized backtracking (candidate
  order shuffled at every cell, as the generator script does) hits this by
  chance for a given row pair at roughly 9-in-362880 odds; across the 36 pairs
  in a 9x9 grid that's near enough to never that a hit means reroll, not bad
  luck. Checked by `tests/sudoku-puzzles.test.js`.
- **At least 24 givens** (the uniqueness floor is 17; this repo's bar is
  higher so a puzzle has room to start without immediately forcing a long
  forced-chain deduction). Checked by `tests/sudoku-puzzles.test.js`, which
  also keeps the absolute 17-given floor as a structural sanity check
  independent of this repo's stricter bar.
- **Every row, every column, and every 3x3 box has at least one given.**
  A row with zero clues is what "give enough clues to begin with so numbers
  can be placed" (the same playtester feedback) is pointing at directly —
  nowhere in that row to even start. Box coverage was added after a deeper
  audit past this same feedback found three shipped puzzles with an empty
  box despite passing the row/column check — legal, unique, and still a
  region with nothing to go on. Checked by `tests/sudoku-puzzles.test.js`.
- **Exactly one solution**, already covered above.

None of this is a difficulty tier — see "Not in v1" above. It's a floor on
board *content*, orthogonal to how hard a legally-unique puzzle is to solve.

## Page ids

On top of the shared `#board`, `#status` and `#restart` from `CLAUDE.md`'s page
contract: `#number-pad` (digit buttons 1-9 plus an eraser), and `#new-puzzle`
(swaps to a different entry in `PUZZLES` — distinct from `#restart`, which
re-blanks the current one).

## Stored data

None yet.
