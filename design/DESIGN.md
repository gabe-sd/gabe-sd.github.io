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

**This file is a stub.** Nothing has been designed into it yet. The visual work is
tracked in `design/TODO.md`; the first phase to land fills this in.
