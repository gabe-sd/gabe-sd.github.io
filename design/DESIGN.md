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

## Still open

In `design/TODO.md`, with the phase that closes each: which palette the site
takes, how far the CRT texture reaches, whether colour by category stays, and
whether the hub's info panel confirms the tap-to-select behaviour on touch.
