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

## `hub-full-color.html`

The hub grid with category accents shown always-on. Base tones carried over from the
mockup's own vocabulary: near-black `#040604`, dim green `#1f9e46`, bright phosphor
green `#33ff66`, with amber `#ffb000` and ice-blue `#3fd4ff` as the second and third
category accents. Those names (`--p-bg`, `--p-dim` and the rest) are local to the
mockup and say nothing about what the site's tokens are called.

**Three things in it are not being built**, and they are the first things a reader will
otherwise copy:

- **The filter chips** (ALL / STRATEGY / PUZZLE / ARCADE / IDEAS). With six games
  visible at once there is nothing to filter. Not settled against, just not now.
- **The unbuilt "idea" tiles.** The seven dimmed tiles are invented; the real list of
  games not yet built is two entries in the root `TODO.md`, and hardcoding a second copy
  into the hub gives us two lists that drift apart.
- **The selected-game info panel.** Dropped entirely rather than repositioned — the
  whole tile became the select-and-play control, which left a panel nothing to do. See
  `design/DESIGN.md`, "Tile selection: the whole tile is the control".

What is being built from it: the base phosphor look, the type, the always-on accent
treatment, and the top nav.

## `hub-select-overlay.html`

The tap-to-arm-then-play tile interaction, built and tuned in isolation to prove it out
before it went near the real hub styling. Whole-tile control, no button, no panel — the
interaction itself, not the look. Superseded in scope by `hub-preview.html`, which
carries it forward into the real chrome; kept because it isolates the mechanism without
the visual noise.

## `hub-preview.html`

The settled result: Amber Arcade's chrome married to the tile interaction above, with
category colour at rest and the pulsing-glow values as tuned live against Gabriel's
reaction. `design/DESIGN.md`'s "The hub" section describes this in prose and exact
values — read that first. It is still a throwaway preview: it loads VT323 from the
Google Fonts CDN rather than self-hosting it.

## `pong-lightning-magenta.html`

The opponent's lightning attack mid-frame — magenta player `#ff4dd8` against a red
opponent `#ff3b3b`, preferred over the two other pairings tried. The bolt is a drawn
composition rather than an animation spec; Pong already implements the effect and the
mockup is about its colour.

**The magenta was not built.** The player is `--p-rose` `#ff7fcb`, the arcade tile's own
hue, which settled the question this file left open — whether an in-game accent should
match its hub tile. See `design/DESIGN.md`, "Rose against coral, all the way down".

## `arcade-chess-pong-directions.html`

The chess and Pong exploration, from a session on 2026-09-07. Four chess directions and
three Pong changes, all drawn in the real Amber Arcade palette, at board size. **This is
the file the chess build was matched against**, and it is the only record of the Pong
decisions being chosen.

Every mock in it is drawn inside the same game-page chrome — breadcrumb, bloomed title,
status strap, footer, scanlines on the chrome with the board lifted out from under them.
That frame is deliberately *not* one of the options: it is the same for all seven and it
is what `game.css` was built from.

Chosen: **chess direction C**, and **all three Pong changes**. Chess was built from this
file; Pong was built from `pong-cabinet.html` below.

## `pong-cabinet.html`

The Pong half of the file above, revised on 2026-09-07 after Gabriel looked at it a
second time. **The adjustment is the one column**: the strap, scorebar, court, buttons
and footer narrow to the court's own width and centre, so `you` and `ai` sit over the
paddles they label instead of hundreds of pixels away on a wide monitor. Everything else
is as it was. It still carries the four chess directions unchanged — it is the same page
revised, not a new one — and they can be ignored.

Two things it shows that were deliberately not built, both in `design/DESIGN.md`, "Pong:
the cabinet": a glow on the resting paddles, and the score in the status strap. One
thing built differently: the `charge` label is drawn on the canvas rather than positioned
over it, because the canvas scales with the viewport and an overlay pinned at
`left: 14px` drifts off the meter it labels.

The Google Fonts link was swapped for the self-hosted face on the way in, so the file
renders with no network.

## `chess-c.reference.css`, `chess-pieces.reference.js`, `chess-c.preview.html`

Direction C in a form that can be lifted rather than retyped: the board and marks as
working CSS, the six piece paths with a renderer, and a harness that runs both against
one position with every mark on the board at once.

The piece paths are the expensive part. The knight went through four candidates and the
king through three whole sets, judged at 54px against a served page, and they cannot be
recovered from a screenshot. What was learned from that is in `design/DESIGN.md`, "The
pieces".

**The reference CSS is a starting point that happens to run, not a patch.** It was
written against a single static position and it draws `selected`, `last` and `check` all
on `::after`, which an element only has one of — so a king selected while in check loses
its selection ring. The built game fixes that; the file is kept as it arrived.

Filenames were normalised on the way in, the Google Fonts link swapped for the
self-hosted face, and `chess-c.preview.html` pointed at its siblings rather than at a
`handoff/` subdirectory that does not exist here.

## What there is no mockup for

Three of the six games have no reference composition here: Minesweeper, Sudoku and Tic
Tac Toe.

Whether those get a mockup before their phase, or are derived from the system the token
phase laid down and shown to Gabriel as the real served page, is **not decided**. Chess
went the first way — a mockup first, four directions shown at board size — and it worked
well enough that it is worth copying.
