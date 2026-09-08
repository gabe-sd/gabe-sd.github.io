# TODO — the site's visual design

Open visual work: the look of the hub, the shell and the games, rather than how any
of them plays. It belongs to the art director — see `ART-DIRECTOR.md`. The design
itself is recorded in `design/DESIGN.md`.

Same conventions as every other backlog here. Entries are headed by a slug, which is
also the branch name, so one string finds the entry, the discussion and the
implementation. Entries are in priority order within a section, and are **deleted as
they land** rather than marked done — `tests/docs-check.js` fails an entry that has a
merge commit behind it.

**If you are a worker, this is not your backlog — but it is where you file.** A
game's visual gaps belong here rather than in `games/<name>/TODO.md`, because the look
is one system and fixing it a game at a time is what produced the look being replaced.
Appending an entry is allowed and wanted; taking one is not.

Each entry names the branch it is cut from. Read that line rather than assuming
`main`: visual work sometimes runs on an integration branch, and `INTEGRATOR.md`
describes how that works. Everything below is off `main` — the redesign's integration
branch merged and the ref is gone.

```markdown
### <slug> — <one line saying what changes>

**Branch from:** <base branch>

What it covers, what it must not break, and anything already ruled out. Long
enough to start on without rediscovering the constraints.
```

---

# The redesign

A complete visual overhaul: the current look is a low-effort first draft and none of
it is owed deference. The target is a dark CRT-phosphor arcade terminal — see
`design/mockups/` for what was agreed.

What was decided before the first phase is now built and described in
`design/DESIGN.md` — the dark-only palette, the self-hosted VT323, the token layering,
Pong's local colours, the hub's category accents. Two of those decisions are still
live rather than history:

- **`about.html` is a stub.** The nav links to it, so it has to exist, but its words
  are Gabriel's. "Under construction" and nothing more.
- **Verification is Gabriel looking at a served page**, and he is asked at the start
  of a phase whether he wants a preview or wants it built. The full version is in
  `ART-DIRECTOR.md`.

## Phases

Each is one session, one branch, one merge. **Whether these four still run is
Gabriel's to say, and nobody has asked him.** The overhaul landed on `main` on
2026-09-07 with the hub, the shell, chess and Pong redesigned and the other four games
framed but not restyled inside. That is a coherent place to stop — a framed page with
a pre-redesign interior was always the expected halfway state, not a defect. So the
question is live rather than rhetorical: finish the four, or call the redesign done
and let each game's interior wait for a reason of its own. Ask before starting one.

**For all four: the frame has landed** — breadcrumb, title, strap, scanlines, footer
and the shared `#instructions` panel are in place and covered by
`tests/contract.test.js`. What is left in each is the inside of the board.

### redesign-flappy-bird — Flappy Bird

**Branch from:** `main`

The other canvas game, and much simpler than Pong. `readColors()` in
`games/flappy-bird/script.js` maps `--win` to the pipes and `--lose` to the beak,
which is decoration borrowing outcome colours — decide whether that survives the new
palette or whether Flappy takes its own.

### redesign-minesweeper — Minesweeper

**Branch from:** `main`

Mostly `style.css`. The one real piece of work is `.n1` through `.n8`, eight hardcoded
number colours that are the only place in the site with a palette of their own.

**Corrected 2026-09-07, and this entry used to say the opposite.** It claimed the
current eight "will not be" legible on the phosphor ground — written before the palette
existed and never checked. It has been now: all eight were forced onto a real board and
read, and they are legible. What is wrong with them is that they are the *old* palette.

So this is a recolour rather than a legibility rescue, and smaller than the entry
implied. Distinguishable-from-each-other is still what makes it non-trivial: eight hues
that stay apart on a near-black ground, without any of them reading as the amber the
rest of the site uses for ordinary text.

### redesign-sudoku — Sudoku

**Branch from:** `main`

`style.css` only. The grid's box borders are drawn with `--fg` and the selected cell
with `color-mix()` on `--accent`; both want checking against the new values rather than
assuming they carry over.

### redesign-tic-tac-toe — Tic Tac Toe

**Branch from:** `main`

The smallest stylesheet on the site, 32 lines, all tokens already. Last because it is
nearly free once everything above has settled.

### redesign-emoji-glyphs — The emoji, which are the last off-palette thing

**Branch from:** `main`

Colour emoji are rendered by the OS font, not by ours, so they ignore the palette
entirely and are the most visible remaining break in the look. Counted on `main` at
946f476 by sweeping every served page and script for non-ASCII, which is the only
method that finds a glyph living in a string that has not fired yet:

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
- **`⚙` is a control's icon**, which is neither of the above. The frame already does
  this job without an emoji: Pong and Flappy Bird label How to play with a plain `?`.
- **Minesweeper's `💣` and `🚩` are the game's content**, not decoration. They are what
  a cell *is*. Chess solved the same problem by drawing its pieces rather than typing
  them — `games/chess/DESIGN.md` is the precedent worth reading first.
- **The six `🎉`** are a tone choice in a win message, not a palette problem. Whether
  the site wants to sound like that is Gabriel's call, and they are in `#status` text.

**Not in this entry, and worth a look while someone is in here:** `⌫` in Sudoku and
`↑` `↓` `▶` in Pong and Flappy Bird. They are monochrome symbols that render in the
page font, so they may be fine — but nobody has checked them against the palette.

**Pong is the one to notice.** It went through a full redesign phase and kept two
`🎉`, which says a game's own phase will not necessarily catch these. Hence one entry
across all four rather than a line in each.

**This entry was wrong once already, in the direction that matters.** It first listed
three of the five kinds and read as complete, because the count came from screenshots
and a narrow grep — and a screenshot cannot show a win message that has not fired. If
the list is edited again, sweep for non-ASCII across pages *and* scripts rather than
grepping for the glyphs already known about.

If the four game phases run, each can take its own game's share and this shrinks to
whatever is left. If they do not, this is worth doing on its own.

### redesign-category-accents — Decide whether colour by category stays

**Branch from:** `main`

Not work yet — a decision to take with Gabriel once the hub and every game have been
seen in the new palette. The broader palette is wanted; assigning a fixed colour per
category is what is unsettled, along with whether categories exist as a visible idea at
all. Filter chips and idea tiles were dropped for this project and can be reconsidered
here.

**One half of this is now answered by practice rather than by decision.** Whether a
game's in-game accent inherits from its hub tile: both games designed since said yes
independently — chess's black army is the strategy tile's jade, Pong's player is the
arcade tile's rose. Neither was argued for on those grounds; each was chosen by eye and
turned out to agree. That is worth noticing but is not the same as deciding it, and
Flappy Bird is the next chance to find out whether it generalises.

Close this entry by writing the answer into `design/DESIGN.md`, whichever way it goes.
