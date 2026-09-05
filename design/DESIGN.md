# The site's visual design

What the site looks like and why, for the whole site rather than for one game.
The counterpart of `games/pong/DESIGN.md` and its siblings, one level up: those
describe how a game plays and what a reader must not break in it, this describes
the look every page shares.

It belongs to the art director — see `ART-DIRECTOR.md`, which also says who owns
what while that seat is empty. Read this file before changing anything visual,
whichever seat you are in, and read it *first* if you are the art director
starting a session: it is the only thing that carries a decision from one session
to the next.

## How this file is written

**As decisions are made, not afterwards.** A session takes its reasoning with it
when it closes, so a value that only exists in a conversation is a value nobody
can defend or reproduce next week.

**Prescriptively.** Exact hex values, the exact scale, the rules that hold it
together — not "a warm amber" but the number, and the rule about where it may and
may not be used. Descriptive prose cannot stop drift; a value can.

**With the rejected alternatives kept.** What was tried and thrown out, and what
was wrong with it. A dead end nobody records gets explored again by the next
session, which is the same reason every game's `DESIGN.md` carries one.

## What goes in it

The palette and what each colour is for. The type scale and the typefaces, with
where they come from. Spacing, borders, radii. Motion, and what respects
`prefers-reduced-motion`. Any rule that keeps the system coherent — which colours
may carry text, which are structural only, what a game may vary and what it may
not. The tokens in `shared.css` and what each one means.

---

**The palette is not decided yet.** What is below is what has been settled or
found so far. The open questions, and which phase closes each, are in
`design/TODO.md`.

## The typeface

**VT323, self-hosted**, at `assets/fonts/`:

| File | What it is |
| --- | --- |
| `vt323-latin.woff2` | The Latin subset. Everything the site actually sets. |
| `vt323-latin-ext.woff2` | Latin Extended. 16K, for accented characters. |
| `OFL.txt` | The SIL Open Font License the face ships under. |

The `@font-face` lives in `shared.css` with a **relative** `url()`, so it
resolves from the hub and from a game page alike, the same way every other path
on this site does.

**Not the Google Fonts CDN.** It costs a visible font-swap on first paint of a
design whose entire identity is the typeface; it adds a third-party uptime and
privacy dependency to a site that otherwise has neither; and it breaks offline
and from `file://`. Two font files totalling 34K is a cheaper price than any of
that.

The Vietnamese subset Google serves is deliberately not committed. It is another
16K for characters this site has no use for.

**A self-hosted font is not a build step.** It is a file the browser fetches,
like the stylesheet. The rule in `CLAUDE.md` is that the site must need no build
and no install to render, and this does not.

## How the tokens are layered

`shared.css` already owns nine token names — `--bg`, `--fg`, `--card-bg`,
`--cell-bg`, `--cell-border`, `--accent`, `--win`, `--lose`, `--muted`. The
redesign **changes their values and never their names**, and puts a layer of raw
palette values underneath them:

```css
:root {
  --p-<name>: #......;   /* the palette: raw values, named for what they are */
  --bg: var(--p-<name>); /* the contract: named for what it does */
}
```

This is not tidiness. `games/pong/script.js` and `games/flappy-bird/script.js`
read `--fg`, `--accent`, `--cell-border`, `--win`, `--lose` and `--cell-bg` **by
name at runtime**, and each lookup falls back to a hardcoded hex of the *old*
palette when the name is missing. So renaming a token breaks nothing loudly: the
canvas quietly carries on painting the design that was replaced, every test still
passes, and nobody finds out until they look at Pong.

Change a name only by changing that script in the same commit, fallback included.

The layer underneath is what lets a phase restyle one game while the five it has
not reached yet keep rendering correctly.

## Dark only

One palette. `prefers-color-scheme` comes out of `shared.css`, and the light half
of every theme-aware branch in the games goes with it. Gabriel's decision,
2026-09-04.

Consequences a later session will hit:

- `tests/pong.test.js` case 13 asserts the canvas palette *changes* when the OS
  theme flips. That stops being true and the assertion has to be rewritten rather
  than deleted — it is the only theme-flip check in the suite.
- `boltCore()` in `games/pong/script.js` picks the lightning bolt's core colour
  from the board's luminance, which existed only because the light theme's board
  was pure white. One branch of it is now dead.

## What a game may vary

**Pong owns its player and opponent colours locally.** An earlier proposal made a
player/opponent accent pair site-wide; that over-generalises one game's idea and
is rejected. `--win` and `--lose` stay *outcome* colours — a solved Sudoku, a
tripped mine — and Pong stops reading them for its paddles.

## Rejected, with the reason

**A white scanline overlay on a near-black ground.** The agreed mockup draws the
CRT texture as a 1px white line at 3.5% opacity every 3px, blended `overlay`.
Reproduced at full size it is invisible, and the reason is physical rather than a
matter of taste: a scanline is the dark *gap* between lines, not the line. On a
near-black page a white stripe has nothing to lighten, so it does nothing.

Drawing the gap instead — a dark line at low opacity every 3px, no blend mode —
modulates the bright text and the glow, which is where the effect is actually
visible. That is what the preview gallery implements, at four strengths, so the
question of how far the texture reaches can be answered by looking rather than
by arguing.

## What the preview phase measured

Eleven directions were built as complete hub compositions, each carrying a
sample of a Sudoku fragment, Minesweeper's eight numbers and a Pong scorebar,
because the hub flatters any palette and a board you have to read does not.
These are the findings that outlive whichever direction is chosen.

**VT323 carries less colour than the contrast maths says.** Its strokes are one
pixel at normal reading sizes, so a colour that clears 4.5:1 as a solid glyph
can still vanish into the ground when set in this face. The usable bottom of any
ramp is about two steps higher than the numbers suggest. Check a colour by
looking at it *set in VT323 at its real size*, not by computing it.

**Heavy CRT texture is not viable behind a dense board.** At the heavy setting
the texture's dark line every 3.5px cuts two bands through every Minesweeper
glyph, and saturated mid-tones break into fragments. The only fix found was
cells about 35% larger with a double glow, so the bloom refills the gap the way
a real phosphor does. That works on a ten-cell sample and cannot work on a
16×30 board. **At "as mocked" and below the same digits are fine.** So the
texture is a question of degree rather than of yes or no, and the ceiling is set
by Minesweeper rather than by taste.

**Eight distinguishable numbers do not exist inside one hue.** Five independent
attempts converged on the same answer from different directions: a single-hue
palette gets five or six steps, and the remaining two or three need a *second
device* rather than another colour. The devices that worked were an underline
under the glyph, an inverted cell, a dithered field, a border, and a weight
change. Two of them also observed that splitting the eight into two visibly
different halves — dark-on-light against light-on-dark — is worth more when
actually reading a board than any single pair being maximally separated.

That is a rule for `redesign-minesweeper` whichever palette wins: **do not spend
the whole problem on hue.** A monochrome direction should plan on roughly six
colours and two marks.

**Chrome and other transparent-fill text takes `filter: drop-shadow`, never
`text-shadow`.** With `-webkit-text-fill-color: transparent` a text shadow is
drawn *through* the glyph rather than behind it, and a gradient fill turns to
mud.

## Where the exploration is kept

`design/archive/2026-09-04-retro-interface-directions.html` is the eleven
directions built for the first phase, as **one self-contained file**: every
stylesheet and the gallery inlined, so it opens in a browser from anywhere with
no server and no repo around it. It starts on a reference sheet giving each
direction's palette as hexes with the role of every value, its typefaces and
scale, and its eight-number solution; the built compositions are a click away.

`design/archive/` is deliberately separate from `design/previews/`. The previews
are the working source and are throwaway — they get deleted once a direction is
built. The archive does not, because a palette is reusable long after the project
that produced it, and Gabriel asked for these kept for other work.

That copy pulls its fonts from the font CDN, which is the price of being portable
— a single file lifted out of the repo cannot resolve a relative font path. It is
the one exception, and the site itself still self-hosts.

## How the look gets checked

`ART-DIRECTOR.md` has the rule that matters: the suite is a regression net and
Gabriel's eye is the oracle. This is the mechanical part underneath it.

**An agent working on this repo can see the pages it builds.** A headless
screenshot works here and is a different thing from the X11-root capture that
does not — `CLAUDE.md`'s machine-specific section says why, and `tests/README.md`
has the working invocation and the two ways it misleads you. Not repeated here:
one copy of a fact is worth more than two that can disagree.

What belongs in this file is what it means for design work. **Use it, and use it
in a loop.** Every one of the eleven directions needed four or five
write-look-fix rounds before it was any good, and the defects it caught were not
subtle once seen: an icon that read as a fish rather than a bird, a mine that
read as a sun, a 470px hole between a description and the button that acts on
it, an eight-colour ramp with three colours that looked alike. Every one of them
is invisible in a diff and obvious in one glance.

The corollary matters as much. A screenshot is not Gabriel looking at a served
page, and it does not shorten that step — it only means he is not the first
person to see an obvious mistake.

## Still open

In `design/TODO.md`, with the phase that closes each: which palette the site
takes, how far the CRT texture reaches, whether colour by category stays, and
whether the hub's info panel confirms the tap-to-select behaviour on touch.
