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

**Status, 2026-09-06: built, committed, rejected on sight, then fixed and
approved.** The palette, type scale and hub first landed in
`shared.css`/`hub.css`/`index.html`/`hub.js`/`about.html` (commits `4866ab4` and
`df0eb91` on `redesign-tokens-hub`, in `.claude/worktrees/redesign-tokens-hub`),
`npm test` green throughout including the required break-and-restore proofs for
the four `tests/pong.test.js` assertions touched. None of that was in question.
The look was: shown a served preview, Gabriel's reaction was "why does it look
like the cheap mockups" — not a request for tweaks, a rejection of the build as
delivered.

**Resolved the same day.** A throwaway preview (built on a copy of the hub
markup, not the real files, per "ask before starting a phase") addressed all
four points below by diffing the rejected build directly against
`design/previews/variants/amberlit.css`. Gabriel's reaction to the preview: "much
better." Folded into `hub.css`/`index.html`/`about.html` after that approval —
values and reasoning are in `design/DESIGN.md` under "Category colour," "The CRT
texture, applied," and the new "Depth and framing" section. `npm test` green
throughout; nothing here touched a token name, a canvas game, or a
`pong.test.js` assertion, so no further break-and-restore proof was needed
beyond the ones already recorded above.

His itemized reaction, verbatim where it matters — and now closed against each:

- **No depth or framing.** The page reads as flat rectangles on black, not a
  physical machine — no bezel, shadow, or vignette gives it a sense of being
  inside something.
- **The CRT texture is invisible.** "Subtle on the chrome" (settled above, under
  "The hub") reads, in the actual build, as *absent*. Whether the recipe needs
  to move off the preview gallery's "soft" setting, or whether invisible-until-
  you-look-for-it was never going to survive contact with an actual opinion, is
  part of what needs discussing rather than assumed.
- **Missing hover animations.**
- **The glow needs a redo.**
- **The tile border treatment should follow the Amber Arcade preview
  (`design/previews/variants/amberlit.css`), not what got built.** Checked
  against that file directly: its `.tile` has a plain 1px `border` all the way
  round, and the category-coloured left edge is a *separate* 4px `::before`
  layer with its own `box-shadow` glow — solid colour plus bloom, not a flat
  `border-left`. That `::before` also **animates in from `scaleY(0)` on hover/
  focus/selection** and is invisible at rest in that file, alongside a hover
  state that lifts the tile (`translateY(-2px)`), glows the whole card, and
  blooms the icon and name.

  **The build instead followed `design/mockups/hub-preview.html`**, which this
  phase was explicitly told to build from — and that file already simplified
  the tile down to a flat `border-left`, `.tile:hover` doing nothing but a
  background swap, no glow, no lift, no animated stripe. That simplification
  was reasonable *for its own purpose*: `hub-preview.html` exists to prove out
  the tap-to-arm-then-play interaction (`design/DESIGN.md`, "Tile selection"),
  and stripped everything not load-bearing for that question. Nobody carried
  the richer `amberlit.css` treatment back in before this became the file the
  real build was told to match. That gap — a mockup narrowed for one question
  becoming the reference for everything — is most of why the result reads as
  a mockup: it *is* one, just relocated into the real files.

  Note this is **not** simply "restore `amberlit.css` verbatim": that file
  also has the left stripe hidden until hover, which `design/DESIGN.md`'s
  "Category colour: at rest, all the time" section explicitly overrides for a
  documented reason (Gabriel reversed a hover-only version live in a later
  session — "bring back the green pink and blue game colors"). The glow and the
  hover animation are worth pulling back in; the stripe's *visibility at rest*
  is settled and should not silently revert along with them.

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
- **The build stage touched four assertions in `tests/pong.test.js`, all named at
  handover with their break-and-restore proof** (`ART-DIRECTOR.md` requires it):
  case 13 (the OS-theme palette check, now asserting the palette does *not*
  change) and case 28's `["light", "dark"]` loop (collapsed to the one board that
  exists) were expected — the constraint below says why. Two were not, and both
  are the same lesson: a check built against the old palette's specific *values*,
  not just against there being two themes.
  `redIn()` counted "red-dominant" pixels by raw channel magnitude
  (`r > g + 40 && r > b + 40`); Amber Arcade's ordinary paddle and ball colour
  (`colors.fg`, `colors.accent`) clears that bar too, being warm, so every
  "nothing is red yet" baseline in cases 28 and 29 started failing. Rebased on
  hue instead of magnitude — amber sits at 37-41°, `colors.villain` (the actual
  attack colour this exists to find) at 6-7°, and hue survives alpha-blending
  toward the near-black board where magnitude does not, which is what a first,
  tighter-magnitude-threshold attempt at this fix got wrong: it stopped seeing a
  real attack glow wherever the glow was faint rather than solid. Separately,
  test 26's `paddleGlows()` compared a sampled pixel against a hardcoded
  `"255,255,255"` — the old light theme's board colour — so it read as
  permanently "glowing" once the board stopped ever being white; fixed to compare
  against the board's own computed colour instead.

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
