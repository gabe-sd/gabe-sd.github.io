# Mockups

Reference compositions for the redesign, from design sessions that read no repo code —
deliberately, so the visual exploration was not anchored to what already existed. They
are here so a later session can see what was agreed without anyone re-describing it.

**They are reference images that happen to be inspectable, not code to port.** Every
one was hand-built from scratch and none reflects the site's real markup: the Pong
frames are static SVG compositions rather than the canvas the game draws to, the hub's
class names and inline handlers are nothing like the hub's, and the chess boards are
built from a JS string so four directions could sit on one page. Take the colour, the
weight and the mood. Take nothing else.

The exception is `chess-c.reference.css` and `chess-pieces.reference.js`, written
deliberately against the class names the chess page already uses — and even those
arrived as reference rather than as a patch.

**The decisions taken from these files are in `design/DESIGN.md`**, in a fuller form
than the mockups themselves carry. Two written handoffs used to sit here as well; they
were deleted once their builds landed, because `design/DESIGN.md` had absorbed them and
both had drifted into claiming things that contradicted what shipped. Git history has
them.

## The files

What each one is, and what was chosen from it. What was *decided* is in
`design/DESIGN.md`, in fuller form and with the values attached; none of it is
repeated here.

- **`hub-full-color.html`** — the hub grid with category accents always on, in the
  mockup's own green-phosphor vocabulary. Its token names (`--p-bg` and the rest)
  are local to it and say nothing about the site's. Three things in it are
  deliberately not built, and they are the first a reader will otherwise copy: the
  filter chips, the seven invented "idea" tiles, and the selected-game info panel.
- **`hub-select-overlay.html`** — the tap-to-arm-then-play interaction, proved out
  in isolation before it went near any styling. Superseded in scope by
  `hub-preview.html`; kept because it isolates the mechanism without the visual
  noise.
- **`hub-preview.html`** — the settled hub: Amber Arcade's chrome married to that
  interaction, with the pulse values tuned live. Still a throwaway preview — it
  loads VT323 from the Google Fonts CDN rather than self-hosting it.
- **`pong-lightning-magenta.html`** — the opponent's lightning attack mid-frame.
  The magenta was not built; the player is `--p-rose`, the arcade tile's own hue.
- **`arcade-chess-pong-directions.html`** — four chess directions and three Pong
  changes, drawn at board size on 2026-09-07. **The file the chess build was
  matched against**, and the only record of the Pong decisions being chosen: chess
  direction C, and all three Pong changes. The game-page chrome every mock sits in
  is deliberately not one of the options — it is the same for all seven, and it is
  what `game.css` was built from.
- **`pong-cabinet.html`** — the Pong half of that file, revised the same day after
  Gabriel looked again. The adjustment is the one column. It still carries the four
  chess directions unchanged; ignore them.
- **`chess-c.reference.css`, `chess-pieces.reference.js`, `chess-c.preview.html`**
  — direction C in a form that can be lifted rather than retyped. The piece paths
  are the expensive part: the knight went through four candidates and the king
  through three whole sets, judged at 54px against a served page, and they cannot
  be recovered from a screenshot. **The CSS is a starting point that happens to
  run, not a patch** — the built game fixes what it got wrong, and the file is kept
  as it arrived.

## What there is no mockup for

Three of the six games have no reference composition here: Minesweeper, Sudoku and Tic
Tac Toe.

Whether those get a mockup before their phase, or are derived from the system the token
phase laid down and shown to Gabriel as the real served page, is **not decided**. Chess
went the first way — a mockup first, four directions shown at board size — and it worked
well enough that it is worth copying.
