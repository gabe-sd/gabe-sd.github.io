# Chess: what a reader must not break

The invariants for Chess, kept in its own folder so that changing this game
touches no file another game's agent is editing. `CLAUDE.md` holds only what
every game shares — the page contract, the theme, the testing rules.

A design doc is only worth having if it is true, so **changing how a game plays
means updating this file in the same commit**, including whatever was tried and
rejected along the way. Rejected alternatives are the most valuable thing here and
the easiest to lose. Keep values out of it; those live in the code as named
constants, and a doc that repeats them is wrong the first time one is tuned.

**Chess** (`games/chess/script.js`) is the substantial one. Legality is layered:
`generatePseudoMoves` produces moves ignoring check; `applyMove` is pure — it
returns a new `{board, castling, enPassant}` and never mutates — so
`getLegalMoves` filters by simulating each move and discarding any that leave the
mover's own king attacked. `isSquareAttacked` is the single primitive underneath
check detection, castling-through-check rules, and `isInCheck`.
`hasAnyLegalMove` is what separates checkmate from stalemate in `updateStatus`.
Changes to move rules belong in the pseudo-move layer; do not special-case
legality in the click handler.
