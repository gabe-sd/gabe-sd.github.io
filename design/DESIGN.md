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

**The palette is not finally decided.** What is below is what has been settled
or found so far. The open questions, and which phase closes each, are in
`design/TODO.md`.

## The direction is Amber Arcade

**Gabriel chose Amber Arcade on 2026-09-06.** That is settled; a later session
that wants to reopen it asks him rather than deciding.

How it got there. He picked **Amber Monitor** from the first eleven, and in the
same breath asked for the one thing that direction was recorded as unable to
do — the accent colour Cold Terminal and Vector Neon put into the game boards.
He also asked to see the art director's written recommendation *built* rather
than argued. Two more directions were built:

- **Amber Arcade** (`design/previews/variants/amberlit.css`) — **chosen.** Amber
  Monitor's shell, type and spacing unchanged, with six guest hues admitted to
  the boards and one category accent per tile.
- **Cold Terminal Mk II** (`design/previews/variants/coldmk2.css`) — not chosen.
  The recommendation as built: Cold Terminal plus Amber's roominess and larger
  type, Vector's per-element glow, and the texture capped at *as mocked* and
  lifted off the boards. Kept in the archive; its reading-tint and glow-scale
  ideas are worth stealing even though the direction was not taken.

**Nothing has reached `shared.css` yet.** The preview is not the site, and three
questions listed in `design/TODO.md` have to close before the build starts.

### What choosing it commits us to

- **The monochrome fiction is given up, deliberately.** A P3 amber tube cannot
  show a magenta paddle. The site is an amber-panelled machine with a colour
  display in it, not an amber monitor. Everything below follows from that.
- **Amber is the home hue and is never a category colour.** It is the wordmark,
  the cursor, the selected and active state everywhere, and Minesweeper's n1. A
  category owning it would make "selected" ambiguous.
- **Six guest hues, for the screen only**, listed with their values under "The
  guest hues" below.
- **Colour by category is in**, which pre-answers most of the
  `redesign-category-accents` entry in `design/TODO.md`. Close that entry when
  the games are done rather than treating it as still open.

### The rule that came out of it: chrome against screen

Amber Arcade needed a line to sit on, because a P3 amber tube is monochrome by
physics and cannot show a magenta paddle. The line it found is worth keeping
whichever direction wins, because Cold Terminal Mk II independently needed the
same one for its texture:

**The page has two halves. The chrome is the machine — wordmark, nav, strap,
rules, footer, the panel a game sits in. The screen is the game — the board, the
digits, the pieces, the score.** Effects that are *about the display* belong to
the chrome: the single hue, the CRT texture, the bloom. Information the player
has to decode belongs to the screen, and gets whatever colour it needs.

Both directions obey it and neither was designed to. Amber Arcade keeps one hue
on the chrome and spends six on the boards. Cold Terminal Mk II keeps the
scanlines on the chrome and lifts them off the boards. The costume and the
information stop competing, which is the thing every heavy direction in the
gallery failed at.

The consequence to carry into the game phases: **a game's board is not decorated
like the hub.** Whatever `shared.css` ends up doing to a page, the board inside
it is exempt.

## The palette

Every value the chosen direction uses, so the build does not have to be read out
of a throwaway stylesheet. Source of truth until `shared.css` exists;
`design/previews/variants/amberlit.css` carries the same numbers with the
reasoning attached, and is deleted once the build lands.

### The amber ramp — the chrome

| Value | Role | Notes |
| --- | --- | --- |
| `#0a0704` | ground | Brown-black: red channel highest, blue nearly gone |
| `#150f07` | panel | |
| `#221709` | panel, lit | a tile under the cursor |
| `#3d2807` | hairline | **never a word** |
| `#7a5008` | rule on a panel | **never a word**, ~2.9:1 |
| `#b8790a` | dim | the floor for text |
| `#f2bc62` | secondary text | |
| `#ffb000` | **amber — the home hue** | primary, selection, active |
| `#ffd694` | pale | |
| `#fff2da` | white-hot | the beam driven past amber |

Board grounds, which are not the panel: `#100b06` a Sudoku cell, `#16100a` a
Minesweeper cell, `#2a1c09` a selected cell or lit well, `#0d0905` the Pong
court. Tile description text is `#d8a45a` — one step under the secondary; an
`opacity` there instead greys the amber toward the brown ground.

### The guest hues — the screen

Six, admitted to boards and category accents only. **Never to the chrome.**

| Value | Name | Hue | Used for |
| --- | --- | --- | --- |
| `#6fdcf2` | cyan | 192° | puzzle; an entered Sudoku digit; n2 |
| `#5fd9a0` | jade | 157° | strategy; `--win`; n4 |
| `#d4e85c` | lime | 75° | n6 — **the risk value**, see below |
| `#ff6a56` | coral | 6° | `--lose`; the mine flag; Pong's opponent; n3 |
| `#ff7fcb` | rose | 328° | arcade; Pong's player; n5 |
| `#b9a2ff` | violet | 258° | n7 |

Every one is **warmed and lightened** off the value it came from in Cold
Terminal or Vector Neon. Do not substitute the originals back: `#3fd4ff` on this
ground reads as a hole punched to another site.

Minesweeper's eight: **n1 amber, n2 cyan, n3 coral, n4 jade, n5 rose, n6 lime,
n7 violet, n8 `#fff2da`.** No underline, no second device — eight hues is what
buys that. 1–3 take the three most legible and most separated because they are
what gets read at speed; 7 and 8 are almost never seen.

**The risk: lime against amber, 34° apart**, the closest pair in the set,
separated on lightness alone. It holds at preview size. If it fails on a real
16×30 board, **lime is the value to move, not amber.**

### The token mapping

Proposed, not yet built — names unchanged, values new, palette layer
underneath, per "How the tokens are layered" below:

| Token | Value | |
| --- | --- | --- |
| `--bg` | `#0a0704` | |
| `--fg` | `#f2bc62` | |
| `--card-bg` | `#150f07` | |
| `--cell-bg` | `#100b06` | |
| `--cell-border` | `#3d2807` | |
| `--accent` | `#ffb000` | amber |
| `--win` | `#5fd9a0` | jade |
| `--lose` | `#ff6a56` | coral |
| `--muted` | `#b8790a` | |

The moment those land, all six games change colour with no other work. **That is
the check that the token layer works** — and the reason the five games a phase
has not reached keep rendering correctly.

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

## The hub

Settled 2026-09-06, after several rounds against a served preview
(`design/mockups/hub-preview.html`, built on the interaction proved out in
`design/mockups/hub-select-overlay.html`). This closes the three questions the
previous session left open, and answers them differently than any of the options
originally listed for two of the three.

### Tile selection: the whole tile is the control

No separate Play button anywhere, no separate info panel anywhere on the page, no
text that shows or hides on selection. **Tap 1 arms a tile; tap 2 on that same
armed tile plays it; tapping a different tile re-arms there instead and
disarms the first.** This drops the "selected-game info panel" from the original
mockup brief entirely — not deferred, not one of the surviving options, gone.

Why: the info panel sat in the page after the whole grid, so on a phone tall
enough to need scrolling, tap 2 required scrolling to reach it first — the exact
bug Gabriel hit and reported. Putting both taps on the tile itself makes that
impossible by construction: there is nowhere else for the second tap to be.

Visual feedback on arming — exact values, tuned live against Gabriel's reaction
over several rounds:

```css
.tile.selected {
  border-color: var(--cat-accent);
  animation: armed-pulse 2.3s ease-in-out infinite;
}
@keyframes armed-pulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--cat-accent),
                          0 0 18px 3px color-mix(in srgb, var(--cat-accent) 55%, transparent); }
  50%      { box-shadow: 0 0 0 2px var(--cat-accent),
                          0 0 29px 8px color-mix(in srgb, var(--cat-accent) 72%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
  .tile.selected {
    animation: none;
    box-shadow: 0 0 0 2px var(--cat-accent),
                0 0 26px 6px color-mix(in srgb, var(--cat-accent) 70%, transparent);
  }
}
```

The glow is the tile's own category colour, not a fixed amber — Gabriel's
correction after an earlier round used amber for every tile regardless of
category. The low end of the pulse never drops near invisible and the high end
is a real jump, not a shimmer, then pulled back about 15% once the first "more
intense" pass read as gaudy; the cycle runs a little slower than first built
(2.3s, up from 1.8s) for the same reason. **The tile's footprint never changes
size between resting and armed — nothing in the grid reflows.**

The description stays in the tile permanently, at rest and armed alike; it was
never conditional on selection. This is what closes "whether the info panel
keeps the description" — there is no panel left to ask the question of.

### Category colour: at rest, all the time

The open question from the previous session is closed: **at rest**, not hover-only.
All six tiles carry their category's guest hue as a 4px left border plus a
lowercase category label under the description, visible before any interaction.
Dropping it for a plainer tile was tried live in the preview and Gabriel reversed
it immediately — "bring back the green pink and blue game colors" — it read as
losing what made the direction distinct, not as winning calm.

Category → hue, matching the guest hues table above: strategy → jade `#5fd9a0`
(Tic Tac Toe, Chess), puzzle → cyan `#6fdcf2` (Minesweeper, Sudoku), arcade →
rose `#ff7fcb` (Anime Pong, Flappy Bird). The category label text itself is
tinted with the same hue, not left dim — an intentional bit more colour than the
original preview used for that label.

**A per-tile "new" or "staff pick" badge, using a similar accent treatment, was
floated as a future idea — not decided, not this phase.** Six live games don't
need a badge system yet; if it's wanted later it is new work, not an extension of
category colour.

### The CRT texture, applied

Settled at **subtle on the chrome**, the option the preview already ran at.
Recipe, taken directly from `design/previews/gallery.css`'s own "soft" setting
rather than reinvented:

```css
.crt {
  position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: repeating-linear-gradient(to bottom,
    rgba(0,0,0,0.16) 0 1px, transparent 1px 3px);
}
```

A dark line, never a white one — see "Rejected, with the reason" above for why.
The game grid is lifted out from under it exactly the way "What the preview phase
measured" already describes doing for a board: `.grid { position: relative;
z-index: 7; background: var(--bg); }`, which both rises above the texture layer
and stops it showing through the gaps between tiles.

### Chrome, as built

Wordmark "GABE-SD ARCADE", a top nav (Home / About / GitHub — About is a stub per
the settled list above), and a status line ("Pick a game to play"). Sizes, as the
type scale this phase carries into `shared.css`:

| Element | Size | Notes |
| --- | --- | --- |
| Body | 22px (20px under 760px) | base VT323 size |
| Wordmark | 3.1rem (2.4rem under 760px) | `--hot`, heavy bloom |
| Nav link | 1.15rem | `--dim` at rest, `--pale` on hover, `--amber` + bloom when active |
| Status line | 1.3rem | `--pale` |
| Tile name | 1.75rem | `--pale` |
| Tile description | 1.08rem | `--desc` |
| Category label | 0.92rem, letter-spacing 0.22em, lowercase | tinted `var(--cat-accent)` |
| Footer | 1.02rem | `--dim` |

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
  than deleted.
- **It is not the only theme-flip check, and the second one is the dangerous
  one.** Case 28 loops over both schemes with `emulateMedia` and checks the
  bolt's core reads against the board in each. With one theme it runs the
  identical check twice and **stays green while testing nothing** — case 13
  announces itself by going red, this one does not announce itself at all.
  `design/TODO.md` carries the detail; `colorScheme` appears nowhere else in the
  suite, so those two are the whole of it.
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

**A guest hue has to be warmed toward the ground it lands on.** Amber Arcade
took Cold Terminal's and Vector Neon's accents and none of them survived the
move unchanged: `#3fd4ff` on the brown-black `#0a0704` reads as a hole punched
through to a different site, because a 100%-blue cyan has nothing in common with
a ground whose blue channel is almost gone. Every value moved a few points of
red and green and a step lighter — `#6fdcf2`, `#5fd9a0`, `#ff7fcb`. The rule
generalises past this palette: **an accent borrowed from a direction with a
different ground is a starting point, not a value.**

**Eight hues remove the need for a second device entirely.** The finding above
says a single-hue palette gets five or six steps and the rest need an underline,
an inverted cell or a border. The converse is worth stating because it is what
the colour actually buys: with six guest hues plus the home hue plus one
neutral, Amber Arcade's eight numbers need no mark at all, and the two rarest
digits stop costing the player a decode. That is the clearest single difference
between the coloured and monochrome readings of the same direction.

**A region can be lifted out from under the CRT texture, but only if the screen
gives up its stacking context.** `gallery.css` puts `.screen` at `z-index: 2`
and the texture layer at `6`; while the screen is a stacking context, nothing
inside it can rise above the texture, so no part of the page can be exempted.
Setting `.screen { z-index: auto }` and giving the board strip `z-index: 7` plus
an opaque background does it — the opaque background is not decoration, since
the texture otherwise shows straight through the gaps between cells.

Measured rather than eyeballed, because at *as mocked* the texture is too subtle
to judge from a screenshot: a scanline makes a column of pixels oscillate row to
row, so the mean absolute row-to-row difference down one column separates
textured from flat. Cold Terminal reads 11.33 through a hub tile and 5.31
through a board panel; Cold Terminal Mk II reads the identical 11.33 through the
tile and **0** through the board panel. Cold is the control — its non-zero board
figure is what proves the probe detects texture where texture exists.

## Where the exploration is kept

`design/archive/2026-09-04-retro-interface-directions.html` is the **thirteen**
directions built for the first phase, as **one self-contained file**: every
stylesheet and the gallery inlined, so it opens in a browser from anywhere with
no server and no repo around it. It starts on a reference sheet giving each
direction's palette as hexes with the role of every value, its typefaces and
scale, and its eight-number solution; the built compositions are a click away.

**The filename keeps the 2026-09-04 date even though two of the thirteen were
built on the 6th.** The date names the round, not the last edit, and Gabriel was
given that path to keep — renaming it breaks the one thing the file was made
for. A genuinely new round of directions gets a new date and a new file.

**It is generated from `design/previews/`, not maintained by hand.** Every byte
of it — gallery, stylesheets, markup, script — is an inline of those sources in
the order `index.html` links them, with the two `@font-face` `url()`s rewritten
to the CDN and `window.__START__` set so it opens on the reference sheet. So a
change to a preview does not reach the archive until it is rebuilt, and editing
the archive directly puts the two permanently out of step. The generator was
kept out of the repo deliberately: `design/previews/` is scheduled for deletion
and would leave it with nothing to read. Rebuilding is mechanical enough to
redo from this paragraph, and the check that it was done right is that
regenerating from *unchanged* sources reproduces the existing file byte for
byte.

`design/archive/` is deliberately separate from `design/previews/`. The previews
are the working source and are throwaway — they get deleted once a direction is
built. The archive does not, because a palette is reusable long after the project
that produced it, and Gabriel asked for these kept for other work.

**It is fully standalone: every typeface is embedded as a base64 data URI.**
Twenty-nine faces, latin and latin-ext only — the eight Google families the
other directions use, plus the repo's own VT323, which is byte-identical to
Google's copy. So the file makes no network request at all and needs nothing
beside it: hand the single path to anyone, on any machine, offline, and they see
what is described here. That is what it is for, and it is why it is 880K rather
than 330K.

Two things a rebuild must not lose:

- **`<meta charset="utf-8">` on the first line, and it is load-bearing.** With
  no charset the browser sniffs the first ~1KB. The earlier CDN build got UTF-8
  by luck, because a comment full of em dashes sat up there; embedding the fonts
  pushes every non-ASCII byte past the sniff window, the sniffer sees nothing but
  base64 ASCII, falls back to windows-1252, and every `·` `—` `★` `▶` in the file
  becomes mojibake. It showed up as Full Cabinet's wordmark rendering 15px wide
  of `GABEÂ·SD ARCADE`, and as nothing else — one visible symptom for a fault
  affecting the whole file.
- **Parity is checked on text metrics, not on screenshots.** PNG bytes are not
  pixels and several directions animate a cursor or a glare band, so image
  equality is the wrong bar and will never hold. Measure the wordmark, a tile
  name, the strap and the selected name in all thirteen: a swapped typeface moves
  every one of those, a blinking cursor moves none. All thirteen match the CDN
  build exactly.

The site itself still self-hosts from `assets/fonts/` and embeds nothing — a
data URI in `shared.css` would put 400K of base64 in front of first paint on
every page. The embedding is the archive's alone, and it is the price of the
file being portable.

## How the look gets checked

`ART-DIRECTOR.md` has the rule that matters: the suite is a regression net and
Gabriel's eye is the oracle. This is the mechanical part underneath it.

**An agent working on this repo can see the pages it builds.** A headless
screenshot works here and is a different thing from the X11-root capture that
does not — `CLAUDE.md`'s machine-specific section says why, and `tests/README.md`
has the working invocation and the two ways it misleads you. Not repeated here:
one copy of a fact is worth more than two that can disagree.

What belongs in this file is what it means for design work. **Use it, and use it
in a loop.** Every one of the thirteen directions needed four or five
write-look-fix rounds before it was any good, and the defects it caught were not
subtle once seen: an icon that read as a fish rather than a bird, a mine that
read as a sun, a 470px hole between a description and the button that acts on
it, an eight-colour ramp with three colours that looked alike. Every one of them
is invisible in a diff and obvious in one glance.

The corollary matters as much. A screenshot is not Gabriel looking at a served
page, and it does not shorten that step — it only means he is not the first
person to see an obvious mistake.

## Still open

In `design/TODO.md`, with the phase that closes each: whether
`design/archive/2026-09-04-retro-interface-directions.html` is rebuilt again once
the redesign finishes, or frozen as the record of the exploration.
