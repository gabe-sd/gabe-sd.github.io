# Tic Tac Toe

Nine buttons and eight win lines. The rules were never the interesting part of
this game and are not what this file is for: what is worth not breaking is the
board built on it in the redesign, and why each piece of it is the way it is.

The site-wide half — the palette, the typeface, the frame — is in
`design/DESIGN.md`. This is only what belongs to this game.

## The ids and the state it keeps

The three ids of the page contract, and no others: `#board`, `#status`,
`#restart`. **It stores nothing** — no `localStorage` key, no score carried
between games. A finished game is cleared by Restart and that is all the memory
there is.

Two `data-` attributes on `#board` carry the state `style.css` needs, and
`script.js` is the only thing that writes them:

- `data-turn` — `X`, `O`, or empty once the game is over. It chooses the ghost
  mark shown under the pointer, which is how the board says whose turn it is.
- `data-over` — `win`, `draw`, or empty. It dims the squares outside a win, and
  the whole board on a draw.

A square carries `data-mark` while it holds one, which is what colours it.

## The board is a hash, not a grid of cells

Four lines and nothing else: no square, no fill, no frame, no border on anything.
The lines are drawn as gradients on `#board`'s own `::before` and `::after`,
inset so they stop short of the board's edge the way a drawn `#` does.

**Three directions were built and played on a served page.** Two of them drew a
cell per square — a dark ground with a hairline around every square, the same
vector grid chess uses, once with the site font's letters in it and once with
drawn marks. Both lost for the same reason: three squares' worth of boxes reads
as a table, where the hash reads as something drawn on a screen. Chess keeps its
grid because sixty-four squares need naming and counting; nine do not.

**The lines sit above the squares** (`z-index`), and the marks above the lines.
That order is load-bearing rather than cosmetic: an empty square lights its own
background under the pointer, and with the lines below it a hover painted over
the grid — the board lost its middle column as the pointer crossed it.
`tests/tic-tac-toe.test.js` case 7 counts grid-coloured pixels in the strip a
line runs through, with and without a hover, because that is the only measure
only a visible line can produce.

## The marks are drawn, and each player owns a hue

X and O are stroke SVG on the hub's own 48 grid at the hub's weight, injected by
`script.js` and coloured entirely through `currentColor` — the same hand that
draws the hub's icons and chess's pieces. The site font's own X and O were built
first and set against them on a served page: they lost because a typeface's
letters are the one thing on the board that is not drawn, and its O reads thin
beside its X.

**X is violet, O is jade.** About a hundred degrees apart, matched in lightness,
and neither of them amber, so both stand clear of the amber grid they sit on.
Jade is also the hub's strategy-tile hue, which is where chess's black army gets
its colour; violet is not this tile's, and that is deliberate — see
`design/DESIGN.md` on hub-tile inheritance, which Flappy Bird settled as a
tendency rather than a rule.

**A drawn mark is hidden from the accessibility tree**, so `script.js` appends
the mark to the square's own `aria-label` instead: a square reads as "Cell 5, X"
rather than going on announcing itself as empty once it has been played.

## Whose turn it is, shown by the board rather than told by a label

An empty square under the pointer lights, and shows a ghost of the mark about to
land in it, in that player's colour. The status line says it too, but the board
saying it is what stops a player having to look away from where they are aiming.

## A win is said in brightness, because it cannot be said in colour

The three that won bloom; everything else goes half-lit. **The win may not be
announced by changing a mark's colour**, and this is the rule most likely to be
broken by someone tidying up later: `--win` is jade, and jade is O's own colour
for the whole game. A mark turning jade to say "this won" would be speaking in a
hue the board has been using all along to mean something else. `tests/tic-tac-toe.test.js`
case 4 pins it — a mark's colour is the same whether it won or not.

A draw dims the whole board to the same value: nobody's three.

**Rejected, with the reason:**

- **A line struck through the winning three.** Built and looked at. On a square
  board a diagonal win runs at exactly the angle of one arm of an X, so the line
  lay along that arm and ate it: the X's stopped reading as X's.
- **The same line run behind the marks**, with a gap cut around each one, which
  does fix the diagonal. It survives as the better of the two line treatments,
  and lost to the glow on looks alone — the gaps read as dark rings against the
  lit background. Worth reaching for again if a win ever needs to say *which*
  three rather than just *that* three won.
- **A lit square behind each winning mark.** It was the loudest signal of the
  three and it put back the one thing the hash board exists without: a box.
