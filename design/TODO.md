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

### redesign-tokens-hub — The palette, the type, and the hub

**Branch from:** `redesign`

The foundation phase. Everything after it consumes what this one decides, so it
is the phase to go slowly on.

- A palette layer of raw phosphor values in `shared.css`, with the existing token
  names mapped onto it. Names unchanged, values new, `prefers-color-scheme`
  removed.
- The self-hosted font, and the type scale built on it.
- `hub.css` and the hub's `index.html`: the grid, the tap-to-arm-then-play tile
  interaction (build from `design/mockups/hub-preview.html`), the top nav, and an
  `about.html` stub. There is no separate info panel — see `design/DESIGN.md`
  under "The hub" for why and for the exact values.
- Fill in `design/DESIGN.md` — this phase is where the visual system stops being a
  conversation and becomes a document.

**The direction is Amber Arcade**, chosen by Gabriel on 2026-09-06. The palette,
the guest hues, the eight Minesweeper numbers and the proposed token mapping are
all written out in `design/DESIGN.md`; read that before touching `shared.css`.

**The three questions a previous session left open are closed.** Answered
2026-09-06 against a served preview, and written out in full in
`design/DESIGN.md` under "The hub" — read that before building, not this
summary:

1. **CRT texture: subtle on the chrome.** The exact recipe is in `design/DESIGN.md`.
2. **The info panel: dropped entirely**, not merely trimmed. The whole tile is
   now the select-and-play control (tap 1 arms it, tap 2 plays it), which needed
   no panel to begin with. This was not one of the three options originally
   listed for this question — the interaction changed underneath it.
3. **Category colour: at rest, on all six tiles, all the time.** Tried
   hover-only live in the preview and Gabriel reversed it immediately.

Two things Gabriel should not be surprised by, both stated to him already:

- **This phase ends with the site looking half-done, and that is correct.** It
  delivers the palette, the type and the hub. The six games get new token
  *values* and keep their old shapes until their own phases.
- **Chess is untouched by any of this.** Two square colours that read as a board
  on brown-black without becoming a seventh accent is still the hardest single
  question in the redesign.

One question left open and worth asking with the three above: whether the
`design/archive/` copy should be rebuilt again after the build lands, or frozen
as the record of the exploration. It currently holds thirteen directions.

Constraints beyond the settled list:

- **`tests/pong.test.js` case 13 fails the moment `prefers-color-scheme` leaves
  `shared.css`.** It asserts the canvas palette *changes* when the OS theme flips,
  which is exactly what stops being true. Rewriting it is part of this phase, not
  a surprise for the next one.

- **It is not the only theme-flip assertion, and the other one is the dangerous
  one.** `tests/pong.test.js` case 28, "the squeeze attack, and blink lasting as
  long as the ball", loops `for (const scheme of ["light", "dark"])`, opens a page
  per scheme with `emulateMedia`, and checks that the bolt's core reads against
  the board in each. Its own comment says why: the board is pure white in the
  light theme and near-black in the dark one, and a fixed white core is invisible
  on a white board.

  Once `prefers-color-scheme` leaves `shared.css`, `emulateMedia` has nothing to
  switch. Both iterations render the same dark board, the loop runs the identical
  check twice, and **it stays green while having stopped testing the thing it was
  written for.** Case 13 announces itself by going red; this one does not announce
  itself at all, which makes it the exact failure `CLAUDE.md` describes — a test
  that passes for the wrong reason is indistinguishable from one that passes for
  the right reason, in a diff and in a test run alike.

  Whoever writes `shared.css` owns both. Rewrite the measurement and keep the
  guard: the claim worth protecting is that the bolt's core stays visible against
  whatever the board now is, which is still true and still worth a test — it is
  only the *two themes* half that dies. `colorScheme` appears nowhere outside
  `tests/pong.test.js`, so those two are the whole of it.
- **Hub cards stay `<a href="games/<name>/…">`.** `tests/contract.test.js` reads
  the game folder straight out of that path.
- **The two-tap touch behaviour is confirmed and built differently than
  planned.** The original leaning (2026-09-04: a separate info panel, tap 1 fills
  it, tap 2 plays from it) hit a real bug — on a phone tall enough to need
  scrolling, the panel sat below the fold and tap 2 needed a scroll first. The
  fix that shipped, after several rounds against `design/mockups/hub-preview.html`,
  removes the panel rather than repositioning it: the whole tile is the control,
  arms on tap 1 with a pulsing glow, plays on tap 2. Full detail and exact CSS in
  `design/DESIGN.md` under "The hub". Build from that file and from
  `design/mockups/hub-select-overlay.html`, not from `hub-full-color.html`, whose
  info-panel structure this supersedes.
- **The dim accent variants are borderline for text.** Check contrast before using
  one for anything a reader has to read; borders are a different matter.
- **Nothing under `tests/` is touched by the preview stage of this phase**, and no
  assertion has been rewritten. `ART-DIRECTOR.md` requires every rewritten test to
  be named at handover with its break-and-restore proof, so record it here: the
  answer so far is *none*. The branch changes `assets/fonts/` and `design/` only,
  which is also why a green suite says so little about it. That changes the moment
  the chosen direction reaches `shared.css` — `tests/pong.test.js` case 13 is the
  first assertion that has to be rewritten, and the constraint below says why.

- **The directions built for this phase are in `design/previews/`**, with a
  start page saying what has to be decided and a reference sheet giving every
  direction's palette, type and number solution as values. They are throwaway and
  are not to be ported — the chosen one gets rebuilt properly into `shared.css`,
  `hub.css` and the hub's markup. What they measured is recorded in
  `design/DESIGN.md`.

  Eleven went up first. Gabriel picked **Amber Monitor** on 2026-09-06 and asked
  for two more: Amber with the board colour that Cold Terminal and Vector Neon
  have, and the art director's written recommendation built rather than argued.
  Those are **Amber Arcade** (`amberlit.css`) and **Cold Terminal Mk II**
  (`coldmk2.css`), thirteen in total, and the live choice is between those two
  and plain Amber Monitor. He has not picked between them yet, and until he does
  nothing goes into `shared.css`.

  **The folder stays until the redesign is finished, then is deleted.** Gabriel
  delegated the call on 2026-09-06; this is the art director's, and the reasoning
  matters more than the answer because a later session will want to reopen it.

  It is kept *now* because it is in active use: it is what the phone preview
  serves and what the build reads its values from. It goes *after*, because at
  that point it is thirteen directions of a decision already made, in a repo
  whose stated principle is to name what breaks if a thing were simpler. Nothing
  does: `design/archive/` holds every one of them in a single file that is now
  genuinely standalone — fonts embedded, no network, no sibling files — and git
  history holds the source. That the archive was *not* standalone until the fonts
  were embedded is exactly why deleting the folder would have been wrong before
  and is right after.

  What was recorded here previously called the folder "throwaway", which is the
  word that caused the confusion worth avoiding: it reads as "this preview does
  not matter", and Gabriel corrected it — the design preview does have to be part
  of the repo permanently. It is, via the archive. Only the *editable working
  source* is temporary, and only once nothing needs to edit it.

  If a later round of directions is wanted, build a new gallery rather than
  resurrecting this one, and let the archive take a new date. That is what the
  dated filename is for.

- **How far the CRT texture reaches is open.** `pong-lightning-magenta.html`
  carries a scanline overlay — 1px of white at 3.5% every 3px, blended `overlay` —
  and a glow on nearly every element. Whether that belongs in `shared.css` for the
  whole site, stays Pong's alone, or is dropped entirely is undecided, and since
  the answer would live in `shared.css` it belongs to this phase. Put it in front
  of Gabriel in the preview rather than choosing it quietly: it is the largest
  difference between a phosphor palette and a costume, and legibility on the
  puzzle games is what it costs.

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
