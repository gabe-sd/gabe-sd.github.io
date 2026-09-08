# Chess: what a reader must not break

## How it plays

**Chess** (`games/chess/script.js`) is the substantial one. Legality is layered:
`generatePseudoMoves` produces moves ignoring check; `applyMove` is pure — it
returns a new `{board, castling, enPassant}` and never mutates — so
`getLegalMoves` filters by simulating each move and discarding any that leave the
mover's own king attacked. `isSquareAttacked` is the single primitive underneath
check detection, castling-through-check rules, and `isInCheck`.
`hasAnyLegalMove` is what separates checkmate from stalemate in `updateStatus`.
Changes to move rules belong in the pseudo-move layer; do not special-case
legality in the click handler.

## The ids this page adds

Beyond `#board`, `#status` and `#restart`, which every game has:

| id | what it is |
| --- | --- |
| `#taken-by-white` | the capture tray on White's edge — what White has taken |
| `#taken-by-black` | the capture tray on Black's edge — what Black has taken |

`tests/docs-check.js` holds every id in the page against this table, so an id
added to `index.html` and not written here fails the suite. That is the point:
an undocumented id is how the page contract drifts.

The page stores nothing. There is no `localStorage` key to document.

## What it looks like

The look belongs to the art director — `ART-DIRECTOR.md` — and the whole system
is in `design/DESIGN.md`, "Chess: the vector grid": the values, the three
directions this one was chosen over, the two rejected sets of kings and the
silhouette rule that came out of them. Everything rejected on looks is there
rather than here. What matters in *this* file is the part a reader of the code
could break:

- **The pieces are drawn, not typed.** `PIECE_PATHS` holds six stroke SVG paths
  on a 48×48 grid and `pieceSVG()` wraps them. They replaced a map of Unicode
  chess characters, which VT323 does not contain — `U+2654-265F` fell through to
  whatever face the reader's OS served, so the board looked like a different
  site on every machine. **Do not go back to glyphs** without a second self-hosted
  typeface, which is the cost that ruled them out.
- **Colour arrives through `currentColor`**, from `.piece-w` and `.piece-b`. No
  piece carries a colour of its own, which is what lets the same markup serve
  the live board and the dimmed capture trays.
- **Four marks can land on one square at once** — the king you just moved, into
  check, while it is selected. Each takes a layer of its own: the check wash on
  the square's `background-image`, the last move on `::before`, the selection on
  `::after`, the move dots above those and the piece above everything. An element
  has one `::after`; sharing it is what made selecting a checked king lose its
  ring in the reference this was built from.
- **`state.captured` and `state.lastMove` are display state**, and they are
  updated in the click handler rather than in `applyMove`. `applyMove` is pure
  and gets called once per candidate move while filtering for legality — anything
  recorded inside it would count every move nobody played.
- **The material figure is a difference, shown once.** Only the side that is
  ahead carries a number. Two running totals would be two numbers to subtract
  before learning the one thing a player reads for, and the losing side showing
  nothing is itself the fastest way to say who is losing.
