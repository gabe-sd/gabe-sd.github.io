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

**The remaining phases are ordinary work off `main`.** The redesign ran on an
integration branch — `redesign` — while it crossed every area at once; that ended
when the branch merged and the ref went, and nothing below is cut from it any
more. An entry still names the branch it is cut from, because the next project
that needs an integration branch will take one again. Read the line; do not
assume:

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
  is what lets the games a phase has not reached keep rendering correctly.
- **Pong owns its player and opponent colours locally.** The design brief proposed
  a site-wide player/opponent accent pair; that over-generalises one game's idea
  and is rejected. `--win` and `--lose` stay outcome colours — a solved Sudoku, a
  tripped mine — and Pong stops reading them for its paddles.
- **The hub gets** category accent colours and the top nav. **It does not get**
  filter chips or unbuilt "idea" tiles. The selected-game info panel was on this
  list and was dropped entirely rather than trimmed: the whole tile became the
  select-and-play control, which left a panel nothing to do. See
  `design/DESIGN.md`, "Tile selection: the whole tile is the control".
- **`about.html` is a stub.** The nav links to it, so it has to exist, but its
  words are Gabriel's — see the visitor-facing prose rule in `CLAUDE.md`. "Under
  construction" and nothing more.
- **Other work on the site was suspended while the redesign held `main`**, by his
  decision. That ended when the integration branch landed. The phases still open
  below are ordinary work and block nothing.
- **Verification is Gabriel looking at a served page.** The suite is a regression
  net. Every phase ends with a preview he has seen before the branch is handed
  over.
- **Ask him, before starting a phase, whether he wants a preview or wants it
  built.** He answers per phase and there is no standing rule in either direction.
  The full version is in `ART-DIRECTOR.md`, which is where it belongs — it landed
  there in `art-director-preview-gate`, and this is deliberately a pointer rather
  than a second copy. The end-of-phase preview above is a separate thing and is
  unaffected.
- **The art director fetched the font.** The VT323 woff2 and the SIL Open Font
  License text are committed under `assets/fonts/`, done as part of the first
  phase. Nothing was needed from Gabriel.

## Phases

Each is one session, one branch, one merge into `main`. They are in order and
each assumes the ones above it have landed.

**What would make that wrong is a later project taking an integration branch
again.** If one does, this line and the `Branch from:` line in every entry below
are the two places the base is written down, and both go stale the day the branch
is cut — not the day it lands.

**Whether these four still run is Gabriel's to say, and nobody has asked him.**
The overhaul landed on `main` on 2026-09-07 with the hub, the shell, chess and
Pong redesigned and the other four games framed but not restyled inside. That is
a coherent place to stop — a framed page with a pre-redesign interior was always
the expected halfway state, not a defect. So the question is live rather than
rhetorical: finish the four, or call the redesign done and let each game's
interior wait for a reason of its own. Ask before starting one.

### redesign-flappy-bird — Flappy Bird

**Branch from:** `main`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

The other canvas game, and much simpler than Pong. `readColors()` in
`games/flappy-bird/script.js` maps `--win` to the pipes and `--lose` to the beak,
which is decoration borrowing outcome colours — decide whether that survives the
new palette or whether Flappy takes its own.

### redesign-minesweeper — Minesweeper

**Branch from:** `main`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

Mostly `style.css`. The one real piece of work is `.n1` through `.n8`, eight
hardcoded number colours that are the only place in the site with a palette of
their own. They have to stay distinguishable from each other *and* legible on the
phosphor ground.

**Corrected 2026-09-07, and this entry used to say the opposite.** It claimed the
current eight "will not be" legible on the phosphor ground. That was written
before the palette existed and was never checked. It has been now — all eight
forced onto a real board and read, once the redesign was live — and they are
legible. What is wrong with them is that they are the *old* palette, not that
they cannot be seen.

So this is a recolour to fit the new look rather than a legibility rescue, and it
is a smaller job than the entry implied. Distinguishable-from-each-other is still
the constraint that makes it non-trivial: eight hues that stay apart from one
another on a near-black ground, without any of them reading as the amber the rest
of the site uses for ordinary text.

### redesign-sudoku — Sudoku

**Branch from:** `main`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

`style.css` only. The grid's box borders are drawn with `--fg` and the selected
cell with `color-mix()` on `--accent`; both want checking against the new values
rather than assuming they carry over.

### redesign-tic-tac-toe — Tic Tac Toe

**Branch from:** `main`

**The frame has landed** — breadcrumb, title, strap, scanlines, footer and the
shared `#instructions` panel are all in place and covered by
`tests/contract.test.js`. What is left is the inside of the board, which is what
this entry is for.

The smallest stylesheet on the site, 32 lines, all tokens already. Last because it
is nearly free once everything above has settled.

### redesign-emoji-glyphs — The emoji, which are the last off-palette thing

**Branch from:** `main`

Colour emoji are rendered by the OS font, not by ours, so they ignore the
palette entirely and are the most visible remaining break in the look. Counted on
`main` at 946f476 by sweeping every served page and script for non-ASCII, which
is the only method that finds a glyph living in a string that has not fired yet:

| Game | Where | Glyphs |
| --- | --- | --- |
| minesweeper | HUD, board, settings button, win message | `🚩` `⏱` `🏆`, `💣` `🚩` as cell content, `⚙` on the settings button, `🎉` ×3 |
| flappy-bird | HUD | `🐦` `🏆` |
| pong | status line and the menu | `🎉` ×2 |
| sudoku | status line | `🎉` |

Chess, Tic Tac Toe and the hub have none.

Four problems wearing one costume, and they do not have one answer:

- **The HUD glyphs** are labels — flags left, time, best. VT323 has no icons, so
  replacing them means a word, an abbreviation or a drawn glyph.
- **`⚙` is a control's icon**, which is neither of the above. The frame already
  does this job without an emoji: Pong and Flappy Bird label How to play with a
  plain `?`. So the cheap answer may be a character rather than a drawing.
- **Minesweeper's `💣` and `🚩` are the game's content**, not decoration. They are
  what a cell *is*. Chess solved the same problem by drawing its pieces rather
  than typing them, which is the precedent worth reading first —
  `games/chess/DESIGN.md`.
- **The six `🎉`** are a tone choice in a win message, not a palette problem.
  Deleting them is a one-character diff each; whether the site wants to sound
  like that is Gabriel's call, and they are in `#status` text, which is prose he
  owns.

**Not in this entry, and worth a look while someone is in here:** `⌫` in Sudoku
and `↑` `↓` `▶` in Pong and Flappy Bird. They are monochrome symbols that render
in the page font rather than colour emoji, so they may be fine exactly as they
are — but nobody has checked them against the phosphor palette.

**Pong is the one to notice.** It went through a full redesign phase and kept two
`🎉`, which says a game's own phase will not necessarily catch these — nobody was
looking for them. Hence one entry across all four rather than a line in each.

**This entry was wrong once already, in the direction that matters.** It first
listed three of the five kinds and read as complete, because the count behind it
came from screenshots and a narrow grep — and a screenshot cannot show a win
message that has not fired, or a string that only exists in a script. If the list
is edited again, sweep for non-ASCII across pages *and* scripts rather than
grepping for the glyphs already known about.

If the four game phases above run, each can take its own game's share and this
entry shrinks to whatever is left. If they do not, this is worth doing on its own.

### redesign-category-accents — Decide whether colour by category stays

**Branch from:** `main`

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
