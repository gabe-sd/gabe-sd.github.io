# Chess, direction C — art director handoff

Written 2026-09-07 from a design session that held no seat on the repo, so nothing
here has been committed. It is the decision record for the chess board's look;
the mockup beside it is the picture, and the two reference files are the values
in a form you can lift rather than retype.

**Do this first, before any code: write the decisions below into
`design/DESIGN.md`.** That file is the only thing that carries a decision from
one session to the next, and this document is not in the repo. Everything in
"Rejected, with the reason" is the expensive half — it cost four rounds of
drawing and exists nowhere else.

---

## The decision

**Chess takes direction C, the vector grid.** Gabriel chose it against three
alternatives that were built and shown at board size:

| | what it was | why not |
| --- | --- | --- |
| A | two steps of the amber ramp, solid-vs-outline Unicode armies | fine, but ships a second typeface (below) |
| B | near-neutral jade-tinted squares, amber army vs jade army, side console | the recommendation at the time; not chosen |
| **C** | **no square fills at all, stroke SVG pieces** | **chosen** |
| D | VT323 letters, `K Q R B N P` upper/lower | most on-brand, least playable |

The thing that pushed it: **VT323 has no chess glyphs.** Its two subsets stop at
Latin Extended, so `U+2654–265F` falls through to whatever the OS serves — the
soft serif in the current screenshots, a different face on every machine. A and B
both accept a second typeface on the chess page. C and D make the problem
disappear. C does it without asking the player to read letters as pieces.

C also puts the board inside the hub's own drawing vocabulary: the six pieces are
stroke icons on the same 48×48 grid, at the same weight, as the six tile icons in
`index.html`. The site gets one drawing hand.

---

## Exact values

Everything below is in `chess-c.reference.css` as working CSS against the class
names `games/chess/index.html` already uses. Values, not descriptions:

**The board.** Ground `#080503`. Frame `1px solid var(--p-rule)`. Light squares
have **no fill at all**; dark squares are `rgba(255, 176, 0, 0.05)`. Every square
carries an inset `0.5px` hairline at `rgba(255, 176, 0, 0.13)`. That hairline is
the direction: the board is drawn rather than filled, which is what makes it read
as a vector display instead of a chess set photographed at night.

**The pieces.** One `<svg viewBox="0 0 48 48">` per piece, `fill="none"`,
`stroke="currentColor"`, `stroke-width="2.2"`, round joins and caps, sized at
**78%** of the square. White is `--p-pale` with `drop-shadow(0 0 5px rgba(255,214,148,.5))`;
black is `--p-jade` with `drop-shadow(0 0 5px rgba(95,217,160,.4))`. Colour comes
through `currentColor`, so no piece needs a rule of its own. Paths are in
`chess-pieces.reference.js`.

**The marks**, identical whichever skin had won, so they are not C's to change:

| state | treatment |
| --- | --- |
| selected | square fills `var(--p-panel-lit)` `#221709`, plus `inset 0 0 0 2px var(--p-amber)` and a 16px amber glow |
| legal move | a **block, not a circle** — 26% of the square, `--mark`, 10px glow at 60% |
| capture | four corner brackets inset 6%, 30% long, 2px — a reticle, not a ring |
| last move | `rgba(255,176,0,.10)` wash plus a 1px inset at 22%, on **both** squares |
| check | `inset 0 0 0 2px var(--p-coral)`, an 18px inner coral glow, and a 10% coral wash |

`--mark` follows **the side to move**: amber on White's turn, jade on Black's.

**The capture trays.** One on each edge of the board, inside the same grid as the
squares so they line up with the files and nothing reflows as pieces come off:
what Black has taken along the top, what White has taken along the bottom, each
on the side of the player who took them.

- Same six drawings at **26px**, at **42%** of their own army's hue mixed toward
  `--p-hairline`, with the glow **off**. A captured piece is spent and must not
  compete with the live board an inch away.
- Ordered **Q R B N P**, as every chess interface orders them.
- **One number on the whole board:** the material difference, carried only by the
  side that is ahead, sitting half a space after that side's last captured piece.
  Values are the standard 9/5/3/3/1. Two running totals would be two numbers to
  subtract before learning the only thing a player reads for, and the losing side
  showing nothing is itself the fastest way to say who is losing.
- No labels. The pieces are jade or amber, which says whose they were; the edge
  says who took them.

---

## The two drawings that were settled, and the rule under them

**The knight is the angular one** — straight lines only, no curve anywhere,
picked over three rounder alternatives including a filled silhouette and a pixel
version. It is the only piece in the set with no curve in it. That reads as
detail rather than inconsistency at 54px, but it is a live question: angularising
the other five (flatten the bishop's dome to two facets, zigzag the queen's
crown, square the king's shoulders) would make the direction more committed. Not
decided.

**The king is "Broad"** — a wide dome, a collar band at `M15 28h18` at
`stroke-width 1.5`, and the standard base. Chosen after **two entire further sets
were rejected**, which is where the useful finding is:

> **The bad silhouette is a tall symmetrical shape with a rounded top standing on
> a plinth.** Square the top and it reads as a tombstone; round it and it reads as
> something worse. No crown, band or proportion fixes it — the outline is the
> problem, and both rejections were about the outline rather than the detail.

Carry that into the four pieces nobody has reviewed. It is the one transferable
result of the whole exercise.

---

## Rejected, with the reason

- **Unicode chess glyphs (directions A and B).** Not in VT323; a second typeface,
  self-hosted per the font rule, or an OS-dependent serif.
- **Letters as pieces (direction D).** The most on-brand thing built and the least
  playable: a `N` is not a horse, and casual players read shapes faster.
- **Filled or pixel pieces.** Both read best of all at 54px. Both are a whole
  *set*, not one piece — an outlined army cannot carry one filled member — and
  neither was wanted.
- **Six kings built as carved figures on plinths** (crowned, faceted, broad,
  cross-first, regalia, lobed-crown). Rejected on silhouette, per above.
- **Five kings built as emblems** (imperial crown, heraldic shield, crowned head
  in profile, crowned shield, orb and cross). Rejected outright. Worth recording
  that a throne was drawn and thrown out before they were shown: front-on, a panel
  with a cross on it is literally a grave marker.
- **A move log and capture tray in a side console.** That was direction B's idea.
  C puts the captures on the board edges instead; the move log is not in scope and
  is new game behaviour, not restyling.

---

## Still open

- **Four pieces have never been reviewed** — rook, bishop, queen, pawn. They are
  the originals from the first build.
- **Whether the whole set goes angular** to match the knight.
- **The board on a phone.** Eight 54px squares plus gutters does not fit 375px,
  and the coordinates are the first thing to drop.
- **Whether the game-page chrome becomes shared CSS.** The mockup draws a
  breadcrumb, a bloomed title, a status strap with the hub's fading cursor, and
  the wash and scanlines on the chrome only with the board lifted out from under
  them. Five other games need the same frame, so it probably belongs beside
  `hub.css` as something like `game.css` rather than copied six times — but that
  is a decision about the system, not about chess.

---

## What the mockup does not cover, and you must

- **The markup is not portable.** The mockup renders its board from a JS string
  builder to show four directions on one page. The game has real DOM squares and
  the existing ids. Take the values, not the structure.
- **The trays are new page furniture.** However you id them, they go into
  `games/chess/DESIGN.md` in the same commit — `tests/docs-check.js` holds every
  id in a game page against that game's doc, and an undocumented id fails it.
- **The mockup loads VT323 from the Google CDN.** The site self-hosts from
  `assets/fonts/`; do not copy that link tag.
- **Verification is the served page, not the mockup.** Headless screenshots work
  here (`tests/README.md` has the invocation) and the page to be shot has to sit
  inside the project directory, since snap Chromium cannot read outside it.

---

## Branch state, checked 2026-09-07

- The shared checkout is on **`redesign`**. `redesign-tokens-hub` — the entire
  Amber Arcade palette, `shared.css`, `hub.css` and the hub — **is not merged into
  it yet**. Branch chess off `redesign-tokens-hub`, or wait for it to land;
  branching off `redesign` gets a base with none of the tokens and the board will
  render in the old blue-and-white theme.
- **`redesign-pong` is live and has work in it**: commit `3e42a3e` moves the
  player paddle from `--win` to the hub's rose `--p-rose` and rewrites the
  affected assertion in `tests/pong.test.js`. Do not touch Pong files from a chess
  branch. The Pong half of the mockup — the terminal menu, the bezel and scorebar,
  the ball trail, and the opponent's `--lose` half of the colour change — belongs
  on that branch or a successor to it.
- Take a worktree before the first edit, and serve with `PORT=0 npm run serve`.
  Port 8934 is the shared checkout's.

---

## Files in this package

| file | what it is |
| --- | --- |
| `chess-c-handoff.md` | this document |
| `arcade-chess-pong-directions.html` | the mockup: four chess directions, three Pong changes, all drawn in the real palette. Reference, not code to port. |
| `chess-c.reference.css` | the board, marks and trays as working CSS against the class names the game already uses |
| `chess-pieces.reference.js` | the six piece paths and a renderer, classic-script style |
| `chess-c.preview.html` | a harness that runs the two reference files against one position with every mark on the board at once — proof they work, and something to look at while tuning |

The two reference files are a starting point that happens to run, not a patch —
`chess-c.preview.html` is how I checked that they do: board 434px against a
432px tray, `+3` present on White's edge and absent on Black's.
Read them, lift what is useful, and check the result on a served page —
`design/DESIGN.md` says it plainly and it is worth repeating: every one of the
thirteen preview directions needed four or five write-look-fix rounds, and the
defects it caught were obvious once seen and invisible in a diff.
