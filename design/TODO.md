# TODO — the site's visual design

Open visual work: the look of the hub, the shell and the games, rather than how
any of them plays. It belongs to the art director — see `ART-DIRECTOR.md`. The
design itself is recorded in `design/DESIGN.md`.

Same conventions as every other backlog here. Entries are headed by a slug, which
is also the branch name, so one string finds the entry, the discussion and the
implementation. Entries are in priority order within a section, and are **deleted
as they land** rather than marked done — git history is the record of what
happened, and `tests/docs-check.js` fails an entry that has a merge commit behind
it.

**If you are a worker, this is not your backlog — but it is where you file.** A
game's visual gaps belong here rather than in `games/<name>/TODO.md`, because the
look is one system and fixing it a game at a time is what produced the look being
replaced. Appending an entry is allowed and wanted, the same way a new game
appends a card to the hub; taking one is not.

## Where the work happens

Visual work usually crosses every area at once, which is the one thing a worker
may not do. When it does, it runs on an **integration branch** rather than on
`main`: `main` is the live site and would otherwise sit half-restyled for weeks,
and every session after the first would branch from a base nobody has seen whole.
`INTEGRATOR.md` describes how that works.

**The project running now is on `redesign`, and every entry below is cut from
it.** Nothing lands on `main` until the whole redesign does. So an entry names the
branch it is cut from; do not assume `main`:

```markdown
### <slug> — <one line saying what changes>

**Branch from:** <base branch>

What it covers, what it must not break, and anything already ruled out. Long
enough to start on without rediscovering the constraints.
```

---

# The redesign

A complete visual overhaul: the current look is a low-effort first draft and none
of it is owed deference. The target is a dark CRT-phosphor arcade terminal — see
`design/mockups/` for what was agreed, and its `README.md` for the parts of those
mockups that are deliberately not being built.

## Settled before the first phase

Gabriel decided these with the integrator on 2026-09-04. They are not open
questions; a phase that wants to reopen one asks him rather than deciding.

- **Dark only.** One near-black phosphor palette. `prefers-color-scheme` comes out
  of `shared.css`, and the light half of every theme-aware branch in the games
  goes with it.
- **Self-hosted VT323.** The woff2 and the SIL Open Font License text live under
  `assets/fonts/`, and the `@font-face` goes in `shared.css` with a relative
  `url()` so it resolves from the hub and from a game page alike. Not the Google
  Fonts CDN: it costs a visible font-swap on first paint of a design whose whole
  identity is the typeface, plus a third-party uptime and privacy dependency, and
  it breaks offline and `file://`.
- **Token names do not change — only their values.** Both canvas games read
  `--fg`, `--accent`, `--cell-border`, `--win`, `--lose` and `--cell-bg` by name
  and fall back to a hardcoded hex of the *old* palette when one is missing, so a
  rename fails nothing and silently keeps painting the design being replaced. A
  palette layer of raw phosphor values goes *underneath* the existing names. This
  is what lets five untouched games keep rendering correctly through every phase.
- **Pong owns its player and opponent colours locally.** The design brief proposed
  a site-wide player/opponent accent pair; that over-generalises one game's idea
  and is rejected. `--win` and `--lose` stay outcome colours — a solved Sudoku, a
  tripped mine — and Pong stops reading them for its paddles.
- **The hub gets** category accent colours, the selected-game info panel, and the
  top nav. **It does not get** filter chips or unbuilt "idea" tiles.
- **`about.html` is a stub.** The nav links to it, so it has to exist, but its
  words are Gabriel's — see the visitor-facing prose rule in `CLAUDE.md`. "Under
  construction" and nothing more.
- **All other work on the site is suspended** for the duration, by his decision.
- **Verification is Gabriel looking at a served page.** The suite is a regression
  net. Every phase ends with a preview he has seen before the branch is handed
  over.

## Phases

Each is one session, one branch, one merge into `redesign`. They are in order and
each assumes the ones above it have landed.

### redesign-tokens-hub — The palette, the type, and the hub

**Branch from:** `redesign`

The foundation phase. Everything after it consumes what this one decides, so it
is the phase to go slowly on.

- A palette layer of raw phosphor values in `shared.css`, with the existing token
  names mapped onto it. Names unchanged, values new, `prefers-color-scheme`
  removed.
- The self-hosted font, and the type scale built on it.
- `hub.css` and the hub's `index.html`: the grid, the accent treatment, the
  selected-game info panel, the top nav, and an `about.html` stub.
- Fill in `design/DESIGN.md` — this phase is where the visual system stops being a
  conversation and becomes a document.

Constraints beyond the settled list:

- **`tests/pong.test.js` case 13 fails the moment `prefers-color-scheme` leaves
  `shared.css`.** It asserts the canvas palette *changes* when the OS theme flips,
  which is exactly what stops being true. Rewriting it is part of this phase, not
  a surprise for the next one. It is the only theme-flip assertion in the suite.
- **Hub cards stay `<a href="games/<name>/…">`.** `tests/contract.test.js` reads
  the game folder straight out of that path.
- **The info panel moves each game's description into hover state, and touch has
  no hover.** Decide what a phone gets — the first tile shown by default, or the
  description kept in-tile under a width query — rather than discovering it on
  Gabriel's phone later.
- **The dim accent variants are borderline for text.** Check contrast before using
  one for anything a reader has to read; borders are a different matter.

### redesign-pong — Anime Pong

**Branch from:** `redesign`

The hardest game and deliberately second: if the token layer survives Pong it
survives everything. Pong paints itself in `games/pong/script.js`, so most of this
phase is there rather than in `style.css`.

- Magenta player against the red opponent, per
  `design/mockups/pong-lightning-magenta.html`. Pong defines both locally; it
  stops reading `--win` and `--lose` for hero and villain.
- The scorebar, the menu, the instructions panel, the board chrome.

Constraints:

- **`redIn()` in `tests/pong.test.js` will misread a magenta player.** It counts
  "red-dominant" pixels as `r > g + 40 && r > b + 40`, and uses that to prove a
  wind-up belongs to the *attacker*. The mockup's `#ff4dd8` is r255 b216 — it
  fails the blue test by **one unit**. Any magenta with slightly less blue starts
  counting as the opponent's red and the assertion quietly measures the wrong
  thing. Re-base it on hue distance from the opponent's colour before tuning the
  magenta by eye.
- **`boltCore()` picks the bolt's core colour from the board's luminance**, which
  existed only because the light theme's board was pure white. Under a dark-only
  palette one branch is dead. Removing it is fine; leaving it is fine; deciding by
  accident is not, and `games/pong/DESIGN.md`'s Theme section says the opposite of
  whichever you choose.
- **Do not touch "three wind-ups, one colour."** It is recorded in
  `games/pong/DESIGN.md` as a rule about *reading the game* — one colour means one
  thing is happening to you — not as a palette choice. Changing it is a proposal
  to Pong, not a restyle.
- `games/pong/DESIGN.md` and `games/pong/TODO.md` both carry colour claims that
  this phase makes false. The look half is yours to fix in the same commits.
- Unresolved and Gabriel's call: whether an in-game accent should match its hub
  tile's category colour. The mockup's magenta deliberately does not.

### redesign-flappy-bird — Flappy Bird

**Branch from:** `redesign`

The other canvas game, and much simpler than Pong. `readColors()` in
`games/flappy-bird/script.js` maps `--win` to the pipes and `--lose` to the beak,
which is decoration borrowing outcome colours — decide whether that survives the
new palette or whether Flappy takes its own.

### redesign-minesweeper — Minesweeper

**Branch from:** `redesign`

Mostly `style.css`. The one real piece of work is `.n1` through `.n8`, eight
hardcoded number colours that are the only place in the site with a palette of
their own. They have to stay distinguishable from each other *and* legible on the
phosphor ground, which the current eight will not be.

### redesign-sudoku — Sudoku

**Branch from:** `redesign`

`style.css` only. The grid's box borders are drawn with `--fg` and the selected
cell with `color-mix()` on `--accent`; both want checking against the new values
rather than assuming they carry over.

### redesign-chess — Chess

**Branch from:** `redesign`

The most hardcoded stylesheet in the repo: light and dark squares, a second pair
for dark mode, piece fills with text-shadow outlines, and move dots and rings at
`rgba(0, 0, 0, 0.35)`. None of it goes through a token today. A phosphor chess
board is also the hardest single visual question in the redesign — two square
colours that read as a board without becoming a third accent.

### redesign-tic-tac-toe — Tic Tac Toe

**Branch from:** `redesign`

The smallest stylesheet on the site, 32 lines, all tokens already. Last because it
is nearly free once everything above has settled.

### redesign-category-accents — Decide whether colour by category stays

**Branch from:** `redesign`

Not work yet — a decision to take with Gabriel once the hub and every game have
been seen in the new palette.

The broader palette is wanted; assigning a fixed colour per category is what is
unsettled, along with whether categories exist as a visible idea at all and
whether a game's in-game accent inherits from its hub tile. Filter chips and idea
tiles were dropped for this project and can be reconsidered here.

Close this entry by writing the answer into `design/DESIGN.md`, whichever way it
goes.
