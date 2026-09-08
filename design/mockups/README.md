# Mockups

Reference compositions for the redesign, from a design session that read no repo
code — deliberately, so the visual exploration was not anchored to what already
existed. They are here so a later session can see what was agreed without anyone
re-describing it.

**They are reference images that happen to be inspectable, not code to port.**
Every one was hand-built from scratch and none reflects the site's real markup:
the Pong frames are static SVG compositions, not the canvas the game actually
draws to, the hub's class names and inline handlers are nothing like the hub's,
and the chess boards are built from a JS string so four directions could sit on
one page. Take the colour, the weight and the mood. Take nothing else.

The exception is `chess-c.reference.css` and `chess-pieces.reference.js`, which
were written deliberately against the class names the chess page already uses —
and even those arrived as reference rather than as a patch. See their section
below.

## `hub-full-color.html`

The hub grid with category accents shown always-on. Base tones carried over from
the mockup's own vocabulary: near-black `#040604`, dim green `#1f9e46`, bright
phosphor green `#33ff66`, with amber `#ffb000` and ice-blue `#3fd4ff` as the
second and third category accents. Those names (`--p-bg`, `--p-dim` and the rest)
are local to the mockup and say nothing about what the site's tokens are called.

**Three things in it are not being built**, and they are the first things a reader
will otherwise copy:

- **The filter chips** (ALL / STRATEGY / PUZZLE / ARCADE / IDEAS). With six games
  visible at once there is nothing to filter. Not settled against, just not now.
- **The unbuilt "idea" tiles.** The seven dimmed tiles are invented; the real list
  of games not yet built is two entries in the root `TODO.md`, and hardcoding a
  second copy into the hub gives us two lists that drift apart.
- **Colour by category as a fixed system.** The broader palette is wanted; which
  colour belongs to which category, and whether categories exist at all, is not
  decided. See the entry in `design/TODO.md`.

What is being built from it: the base phosphor look, the type, the always-on
accent treatment, and the top nav. **Not** the selected-game info panel — see
`hub-preview.html` below for what replaced it and why.

## `hub-select-overlay.html`

The tap-to-arm-then-play tile interaction, built and tuned in isolation to prove
it out before it went anywhere near the real hub styling. Whole-tile control, no
button, no panel — the interaction itself, not the look. Superseded in scope by
`hub-preview.html` below, which carries the same interaction forward into the
real chrome; kept because it isolates the mechanism without the visual noise.

## `hub-preview.html`

The settled result: Amber Arcade's chrome (wordmark, top nav, subtle CRT texture
on the chrome only) married to the tile interaction above, with category colour
at rest and the pulsing-glow values as tuned live against Gabriel's reaction.
This is what `design/DESIGN.md`'s "The hub" section describes in prose and exact
values — read that first; this file is the reference to build from, not to port
markup out of verbatim (it's still a throwaway preview, e.g. it loads VT323 from
the Google Fonts CDN rather than self-hosting it).

**There is no info panel in this design**, unlike `hub-full-color.html` below,
whose selected-game panel this decision drops entirely rather than repositions.

## `pong-lightning-magenta.html`

The opponent's lightning attack mid-frame — magenta player `#ff4dd8` against a
red opponent `#ff3b3b`, which was preferred over the two other pairings tried.
The bolt is a drawn composition rather than an animation spec; Pong already
implements this effect and the mockup is about its colour, not its behaviour.

Note that the magenta diverges from whatever the hub tile's colour ends up being.
That was deliberate — magenta read better against the opponent's red than the
alternatives — and whether an in-game accent should match its hub tile is
unresolved.

## `arcade-chess-pong-directions.html`

The chess and Pong exploration, from a design session on 2026-09-07 that held no
seat on the repo. Four chess directions and three Pong changes, all drawn in the
real Amber Arcade palette, at board size. **This is the file the chess build was
matched against**, and it is the only record of the Pong decisions — they were
chosen out of this page and never written anywhere else.

Every mock in it is drawn inside the same game-page chrome — breadcrumb, bloomed
title, status strap, footer, scanlines on the chrome with the board lifted out
from under them. That frame is deliberately *not* one of the options: it is the
same for all seven and it is what `game.css` was built from.

Chosen: **chess direction C**, and **all three Pong changes** in the order given.
Chess was built from this file. Pong was not — see `pong-cabinet.html` below,
which is this page revised, and is what the Pong build was matched against. This
one is kept because it is what the chess build was held to.

## `pong-cabinet.html`, `pong-handoff.md`

The Pong half of the file above, revised on 2026-09-07 after Gabriel looked at it
a second time and said the mocks needed adjustments. **The adjustment is the one
column**: the strap, scorebar, court, buttons and footer narrow to the court's own
width (626px) and centre, so `you` and `ai` sit over the paddles they label
instead of hundreds of pixels away on a wide monitor. Everything else is as it
was. `pong-cabinet.html` still carries the four chess directions unchanged — it is
the same page revised, not a new one — and they can be ignored.

`pong-handoff.md` is the written half: what is settled, with values, and a short
"what not to change" list. **The mockup won where the two disagreed**, on
Gabriel's instruction, and they did disagree once: the handoff says the paddle
colours are "already correct and not to be touched", when in the built game both
paddles rested on `--fg` and only took rose and coral while an ability tell was
running. The mockup draws them rose and coral at rest, and that is what shipped.

Two things the mockup shows that were deliberately not built, both in
`design/DESIGN.md`, "Pong: the cabinet": a glow on the resting paddles, and the
score in the status strap. One thing it shows that was built differently: the
`charge` label is drawn on the canvas rather than positioned over it, because the
canvas scales with the viewport and an overlay pinned at `left: 14px` drifts off
the meter it labels.

As with the chess handoff, the Google Fonts link was swapped for the self-hosted
face on the way in, so the file renders with no network. The original is in this
commit's git history.

## `chess-c-handoff.md`, `chess-c.reference.css`, `chess-pieces.reference.js`, `chess-c.preview.html`

Direction C in a form that can be lifted rather than retyped: the decision record,
the board and marks as working CSS, the six piece paths with a renderer, and a
harness that runs both against one position with every mark on the board at once.

The piece paths are the expensive part. The knight went through four candidates
and the king through three whole sets, judged at 54px against a served page, and
they cannot be recovered from a screenshot. The transferable finding is in the
handoff and worth repeating here: **the bad king silhouette is a tall symmetrical
shape with a rounded top standing on a plinth** — square the top and it reads as a
tombstone, round it and it reads as something worse. The outline is the problem,
not the detail.

Three things were changed on the way in, and the originals are in the git history
of this commit: the filenames were normalised, the Google Fonts link was swapped
for the self-hosted face so the files render with no network, and
`chess-c.preview.html` was pointed at its siblings rather than at a `handoff/`
subdirectory that does not exist here.

**The reference CSS is a starting point that happens to run, not a patch.** It was
written against a single static position and it draws `selected`, `last` and
`check` all on `::after`, which an element only has one of — so a king selected
while in check loses its selection ring. The built game fixes that; the file is
kept as it arrived.

## What there is no mockup for

Three of the six games have no reference composition here: Minesweeper, Sudoku and
Tic Tac Toe.

Whether those get a mockup before their phase, or are derived from the system the
token phase lays down and shown to Gabriel as the real served page, is **not
decided**. It was raised on 2026-09-04 and deliberately left until later: the
token phase has to land before there is a system to derive from, and the answer
may be obvious once it has. Chess went the first way — a mockup first, four
directions shown at board size — and it worked well enough that it is worth
copying.
