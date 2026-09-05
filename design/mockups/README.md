# Mockups

Reference compositions for the redesign, from a design session that read no repo
code — deliberately, so the visual exploration was not anchored to what already
existed. They are here so a later session can see what was agreed without anyone
re-describing it.

**They are reference images that happen to be inspectable, not code to port.**
Both were hand-built from scratch and neither reflects the site's real markup: the
Pong frame is a static SVG composition, not the canvas the game actually draws to,
and the hub's markup, class names and inline handlers are nothing like the hub's.
Take the colour, the weight and the mood. Take nothing else.

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
accent treatment, the selected-game info panel, and the top nav.

## `pong-lightning-magenta.html`

The opponent's lightning attack mid-frame — magenta player `#ff4dd8` against a
red opponent `#ff3b3b`, which was preferred over the two other pairings tried.
The bolt is a drawn composition rather than an animation spec; Pong already
implements this effect and the mockup is about its colour, not its behaviour.

Note that the magenta diverges from whatever the hub tile's colour ends up being.
That was deliberate — magenta read better against the opponent's red than the
alternatives — and whether an in-game accent should match its hub tile is
unresolved.

## What there is no mockup for

Four of the six games have no reference composition here: Minesweeper, Sudoku,
Chess and Tic Tac Toe. Chess is the one that matters — `design/TODO.md` calls its
two square colours the hardest single visual question in the redesign, and there
is nothing in this folder showing an answer.

Whether those get a mockup before their phase, or are derived from the system the
token phase lays down and shown to Gabriel as the real served page, is **not
decided**. It was raised on 2026-09-04 and deliberately left until later: the
token phase has to land before there is a system to derive from, and the answer
may be obvious once it has.
