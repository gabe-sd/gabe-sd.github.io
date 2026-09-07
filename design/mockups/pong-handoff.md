# Pong — visual design handoff

Look at **`pong-cabinet.html`** first, options 1–3 under "Anime Pong". This file
says what is settled and what the values are. Chess is already built and is not
in scope.

Pong is the last game still wearing the pre-redesign stylesheet: rounded pill
buttons, an unframed canvas floating on black, a score in the browser's own
sans-serif. Everything below is restyling. The game plays exactly as it does
now — no rule, speed, difficulty or layout-of-play change.

---

## 1. The frame

`game.css` already exists and chess already uses it. Pong adopts it unchanged:
wash off the top of the tube, scanlines, breadcrumb, bloomed title, hairline
rules top and bottom.

- `← ARCADE / **ANIME PONG**` replaces `← All games`.
- The `<h1>` becomes the bloomed `ANIME PONG`, right-aligned opposite the crumb.
- `#status` becomes the strap under the rule, with the fading block cursor.
- The controls hint moves into the footer.

**Chrome against screen** is the rule that governs all of it: the wash, bloom
and scanlines belong to the machine, and they stop at the edge of the court.
Nothing overlays the canvas.

## 2. One column

Status line, scorebar, court, buttons and footer are one column, exactly as
wide as the court. Today the canvas is 600px and the rest of the page is not,
so on a wide monitor `you` and `ai` sit hundreds of pixels from the paddles
they label.

The court stays 600×400. Nothing resizes — the column just stops where the
court stops, and centres.

## 3. The bezel

The court sits in an inset panel, not on bare black:

- background `linear-gradient(#160f08, #0d0905)`, `1px solid var(--p-hairline)`
- `inset 0 0 40px rgba(0,0,0,.8)`
- 12px padding around the court
- corner brackets top-left and bottom-right: 14px, `1px solid var(--p-rule)`,
  two sides each
- square corners. No `border-radius` anywhere on this page.

The canvas itself keeps a `1px solid var(--p-hairline)` edge on `#0d0905`.

## 4. The scorebar

A row on the bezel, above the court, its ends flush with the court's edges.

- labels `you` / `ai` — lowercase, `0.9rem`, `letter-spacing: .2em`, `--p-dim`
- `first to 5` centred, same treatment, `letter-spacing: .24em`
- the numbers — `2rem`, `you` in `--p-rose`, `ai` in `--p-coral`, each with a
  glow of its own colour at 50%

The score is currently painted on the canvas in `bold 28px system-ui`, which is
the only place on the site not in VT323. Moving it to the bezel fixes the
typeface and stops the digits sitting underneath the ball.

## 5. The menu

The rounded filled pills are the single most out-of-place thing on the page.

- unselected: transparent, `1px solid var(--p-hairline)`, `--p-dim` text
- selected: filled `--p-amber`, brown-black text (`--p-ground`), amber glow
- hover: border `--p-rule`, text `--p-pale`
- all uppercase, `letter-spacing: .1em`, square corners

Assisted and Insane change the game, so they say so: Assisted outlined in jade
(`--p-jade`), Insane in coral (`--p-coral`), Normal left plain amber. Selected
fills with that same hue.

The menu backdrop is `rgba(10,7,4,.86)`, and `READY` above it in `--p-hot` with
`var(--bloom)`.

## 6. Colour

Already correct and not to be touched: **you are rose `#ff7fcb`, the AI is
coral `#ff6a56`.** Rose is the arcade category hue on the hub, so the tile and
the game read as the same object.

One change: the opponent reads `--lose` today. It should read `--p-coral`
directly. Same pixels, but `--win` and `--lose` are outcome colours and a
paddle is not an outcome — Pong's own `DESIGN.md` already asks for this.

**The ball and the court furniture stay amber.** The ball belongs to the
machine, not to either player, and it is the only thing on the court both
paddles touch. Centre line: `--p-rule`, `2px`, `dasharray 2 10`, round caps,
45–55% opacity.

## 7. The charge meter

Three blocks in the corner of the court with no label is unreadable as
anything. Give it the word: `charge`, lowercase, `letter-spacing: .22em`,
`--p-dim` — the hub's own device for exactly this.

Blocks are 14×9, `--p-hairline` when empty, `--p-rose` with a rose glow when
full. Bottom-left of the court, 14px in.

## 8. Inside the court

Three touches, in the order they are worth doing:

1. **The serve prompt goes on the court.** `PRESS SPACE TO SERVE` in VT323,
   `--p-dim`, letterspaced, below centre. It currently sits in the status line
   above the board while the court sits empty saying nothing.
2. **A ball trail** — three or four decaying copies of the ball behind it, at
   roughly 14 / 28 / 50 / 100% opacity. The cheapest thing that makes a canvas
   game look like a tube. **Check it on Insane** — a trail on a fast ball can
   read as three balls.
3. **The score burns into the phosphor** at `#2a1c09`, large, behind play. With
   a real scorebar on the bezel this can be as faint as it likes: it is
   texture, and the number a player actually reads is elsewhere. A vignette
   over the court finishes it.

---

## What not to change

- How the game plays. No speed, difficulty, paddle, ball or AI changes.
- The lightning. It already looks like this site.
- The menu's structure — real buttons, radio groups, visible labels. It is
  accessible as built; only its skin is wrong.
- The 600×400 court.

## Files

| file | what it is |
| --- | --- |
| `pong-handoff.md` | this |
| `pong-cabinet.html` | the picture — options 1–3 under "Anime Pong" |

The mockup also contains the chess directions. Ignore them; that work landed in
`47f4374`.
