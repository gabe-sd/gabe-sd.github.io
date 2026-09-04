# Sudoku TODO

Known gaps and unscheduled work for this game. Not a changelog — delete
entries as they land. See the root `TODO.md` for the naming rules.

### sudoku-famous-puzzles-mode — A mode built on curated, named puzzles

The 100-puzzle set (`sudoku-puzzle-quality`, once it lands) is procedurally
generated and quality-checked against `DESIGN.md`'s "What makes a puzzle
good" — deliberately, so there's no attribution or manual-verification
burden. That rules out puzzles that are famous *because of who made them or
what record they hold* — Arto Inkala's "AI Escargot" and world's-hardest
puzzles, the "Everest" and "Golden Nugget" grids, and so on. Those only work
as a named, curated set: each hand-sourced, each still run through
`tests/sudoku-puzzles.test.js` for legality and uniqueness (that check is
generator-agnostic), but the source and name kept alongside the entry
instead of being anonymous.

Likely its own mode alongside "New puzzle" — cycling through 5-10 named
puzzles rather than folding them into the 100 — since mixing generated and
curated puzzles in one list would need a way to tell them apart or lose the
point of naming them. Discuss the shape with Gabriel before building; this
entry exists to record the idea, not a decided design.
