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

Gabriel decided these on 2026-09-04, with the integrator and then with the art
director. They are not open questions; a phase that wants to reopen one asks him
rather than deciding.

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
- **Ask him, before starting a phase, whether he wants a preview or wants it
  built.** He answers per phase and there is no standing rule in either direction:
  "art director should ask if i want a preview or if i want him to just build it
  before beginning work on a task." If he wants one, serve something as soon as
  there is anything to react to — for the first phase, the palette and the type
  scale on a throwaway page — iterate, and get his approval before the real page
  is built on it. If he wants it built, build it. An earlier version of this
  bullet made the preview automatic; that was the art director's reading and he
  corrected it the same day. The end-of-phase preview is a separate thing and is
  unaffected. This restates a rule proposed for `ART-DIRECTOR.md` on the branch
  `art-director-preview-gate`; when that lands and `redesign` absorbs `main`, cut
  this down to a pointer so the two cannot drift.
- **The art director fetches the font.** The VT323 woff2 and the SIL Open Font
  License text are downloaded and committed under `assets/fonts/` as part of the
  first phase, which is also when that folder starts existing. Nothing is expected
  from Gabriel.

## Phases

Each is one session, one branch, one merge into `redesign`. They are in order and
each assumes the ones above it have landed.

### redesign-flappy-bird — Flappy Bird

**Branch from:** `redesign`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

The other canvas game, and much simpler than Pong. `readColors()` in
`games/flappy-bird/script.js` maps `--win` to the pipes and `--lose` to the beak,
which is decoration borrowing outcome colours — decide whether that survives the
new palette or whether Flappy takes its own.

### redesign-minesweeper — Minesweeper

**Branch from:** `redesign`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

Mostly `style.css`. The one real piece of work is `.n1` through `.n8`, eight
hardcoded number colours that are the only place in the site with a palette of
their own. They have to stay distinguishable from each other *and* legible on the
phosphor ground, which the current eight will not be.

### redesign-sudoku — Sudoku

**Branch from:** `redesign`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

`style.css` only. The grid's box borders are drawn with `--fg` and the selected
cell with `color-mix()` on `--accent`; both want checking against the new values
rather than assuming they carry over.

### redesign-tic-tac-toe — Tic Tac Toe

**Branch from:** `redesign`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

The smallest stylesheet on the site, 32 lines, all tokens already. Last because it
is nearly free once everything above has settled.

### redesign-category-accents — Decide whether colour by category stays

**Branch from:** `redesign`

Not work yet — a decision to take with Gabriel once the hub and every game have
been seen in the new palette.

The broader palette is wanted; assigning a fixed colour per category is what is
unsettled, along with whether categories exist as a visible idea at all. Filter
chips and idea tiles were dropped for this project and can be reconsidered here.

**One half of this is now answered by practice rather than by decision.** Whether
a game's in-game accent inherits from its hub tile: both games designed since
said yes independently — chess's black army is the strategy tile's jade, Pong's
player is the arcade tile's rose. Neither was argued for on those grounds; each
was chosen by eye and turned out to agree. That is worth noticing but is not the
same as deciding it, and Flappy Bird is the next chance to find out whether it
generalises or whether two games happened to land the same way.

Close this entry by writing the answer into `design/DESIGN.md`, whichever way it
goes.
