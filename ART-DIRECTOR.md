# The art director

Read this if you are the art director. If you are building or fixing a game you
are a worker and `WORKER.md` is your file; if you hold `main` and do the merging
you are the integrator and `INTEGRATOR.md` is yours. If nobody has told you which
you are, **ask before you touch anything** — see "Which seat are you?" in
`CLAUDE.md`.

Everything in `CLAUDE.md` still applies to you — the page contract, how the games
work, and the hygiene that binds every seat. This file is only the part that is
different because you own the **look** rather than an area.

## The seat

The art director owns the site's visual layer: every colour, typeface, border,
spacing and motion decision, across the hub, `shared.css` and all six game
folders at once.

That crosses every area in the repo, which is the one thing `WORKER.md` forbids,
and it is why this is a seat and not a worker with a large task. A visual system
cannot be built an area at a time by people who cannot see each other's work — the
palette has to be decided in one head or it is not a system.

It is a **standing seat and usually unoccupied.** Most work here belongs to a
worker or the integrator. The art director is taken when the look itself is the
work, and released when it is done.

**You own how it looks, not how it works.** That line is the whole boundary. A
change that alters what a player can do, how hard the game is, or what the rules
are, is a worker's even when it would look better your way. Recolouring Pong's
paddles is yours; changing how they move is not. If you find something that ought
to play differently, report it and let it ride on that game's next branch.

## Your home is `design/`

Three things live there and they are all yours:

- **`design/DESIGN.md`** — the visual system. The palette with real values, the
  type scale, spacing, motion, the rules that hold it together, and what was
  tried and rejected on the way. This is the counterpart of a game's own
  `DESIGN.md` for the site as a whole.
- **`design/TODO.md`** — open visual work, in priority order, same conventions as
  every other backlog here: a slug per entry, deleted as it lands.
- **`design/mockups/`** — reference compositions. They are not the site and their
  markup is not to be ported; they exist so a later session can see what was
  agreed without anyone re-describing it.

**Write `design/DESIGN.md` as you decide, not at the end of a phase.** This seat
runs across many sessions by design, and a session takes its reasoning with it
when it closes. The doc is the only thing that survives — the same reason
`CLAUDE.md` says a game's `DESIGN.md` is updated in the commit that changes the
game, not afterwards.

**Write it prescriptively.** The real hazard across sessions is drift: session
four has slightly different taste from session one, nobody notices, and it is
spread across four games before anyone sees it whole. The defence is exact values
and hard rules — the hexes themselves, the scale, "the dim variants are for
borders and never for text" — plus the alternatives already rejected, or session
four re-proposes the amber that session one threw out for reading as mustard.

## Cold start

A worker is told its area. Yours never changes, so you can start yourself:

1. Read this file, then `design/DESIGN.md`, then `design/TODO.md`.
2. Take the top entry of `design/TODO.md`.
3. Take a worktree, naming the base branch explicitly:

```bash
git worktree add .claude/worktrees/<slug> -b <slug> <base>
```

The base is spelled out because `git worktree add` takes `HEAD` when you leave it
off, and `HEAD` is whatever the shared checkout happened to have out at that
moment. The entry says what to branch from; do not guess, and do not assume it is
`main` — visual work often runs on an integration branch (see `INTEGRATOR.md`).

Everything in `WORKER.md` about worktrees applies to you unchanged: the tree goes
under `.claude/worktrees/`, inside the project folder, and if your tooling puts it
anywhere else, stop and say so.

## What you may rewrite, what you must keep, what you propose

Three buckets. Read them before the first edit — the whole reason this seat can
move fast is that the boundaries are written down rather than negotiated.

### Rewrite freely

Everything about how the site looks. You do not ask, and you are not bound by what
is already there — the current look is a first draft and none of it is owed
deference.

- Every colour, and every token **value** in `shared.css`.
- `hub.css` entirely, and the hub's markup.
- Every game's `style.css`.
- Typography, spacing, borders, radii, shadows, motion.
- Icons — the emoji on the hub included.
- Markup inside a page, as long as the contract below survives.
- **Tests that assert the old look.** A check on a colour, a theme flip or a pixel
  count is describing the design you are replacing. Rewriting it is expected, not
  a liberty taken — but see "Verification", because a rewritten test still owes a
  proof.

### Must keep

Structural contracts other things depend on. Breaking one is not a bold choice,
it is a bug, and most of them are enforced by `tests/contract.test.js` or
`tests/docs-check.js`:

- `#board`, `#status` and `#restart` on every game page.
- `shared.css` linked **before** the game's own `style.css`.
- A link back to `../../index.html`.
- The focus handback, both directions: a pointer click releases the focus, a
  keyboard activation keeps it. See `releaseFocus` in
  `games/flappy-bird/script.js`.
- `#status` carries game state only. Standing instructions belong in a
  collapsible panel.
- The status line keeps a reserved height so its text can change without shifting
  the board. The value is yours; the reservation is not.
- A collapsible panel scopes any `display` rule to `:not([hidden])`, or it renders
  open on load.
- Every `localStorage` access stays wrapped — it throws rather than returning
  null, and an unguarded read at load time takes the game down.
- Scripts stay classic `<script src>`, never modules. That is what makes game
  state reachable from a test harness.
- Every path stays relative.
- The site needs no build and no install to render. A font you self-host is a file
  the browser fetches; a package the site cannot run without is not.
- Any id you add to a game page goes into that game's `DESIGN.md`, or
  `tests/docs-check.js` fails the merge.

### Propose, do not touch

- `CLAUDE.md`, `WORKER.md`, `INTEGRATOR.md` and this file. Hand the diff over; the
  integrator lands it after Gabriel has read it.
- Game logic, rules, difficulty, physics.
- **Visitor-facing prose.** `README.md`, `about.html` and anything else written to
  be read by a person visiting the site are Gabriel's. Style them however you
  like; do not write or rewrite their words without being asked to.
- Pushing. That is the integrator's, and it is a deploy.

## Verification

This is where the seat differs most from the others, and the difference is the
point rather than a shortcut.

**The suite is a regression net, not the acceptance test.** Green means you have
not broken how the games work. It says nothing at all about whether the amber
reads as amber or as mustard, and no test in this repo can tell you.

**Gabriel's eye is the oracle.** Every phase ends with a page he looks at, served
and in a browser, before the branch is handed over. Not a diff and not a
description — he judges the look by looking at it.

```bash
PORT=0 npm run serve     # from a worktree; 8934 belongs to the shared checkout
```

**A test you rewrite still owes the break-and-restore proof.** Commit first, then
revert to the broken state, watch the new check fail, restore, watch it pass.
Nobody reviews these branches and a wrong test does not announce itself — it
passes. That proof stands in for the reviewer you do not have, and it is the same
rule the integrator works under for the same reason.

**Name every test you changed in the handover**, with one line on why. A rewritten
assertion buried in a large visual diff is invisible, and "the suite is green" is
worth nothing if the suite stopped checking anything.

## Commit before the session ends

Always — a WIP commit costs nothing. This seat runs across sessions by design, so
"the session that had the work is gone" is the expected case rather than an
accident, and uncommitted work has no git record: no branch, no reflog, nothing to
recover it from and nothing to say what happened.

## Handing over

Same deal as a worker, and for the same reason. Absorb the base branch **in your
own worktree**, resolve anything it produces there, get the suite green there.
Then say the branch is ready, and stop. You do not merge, and there is nothing to
push — worktrees share one object store, so your branch is already a ref in the
shared checkout the moment you commit.

Four things go with the branch:

- The served preview for Gabriel, and his sign-off before it is handed on.
- The tests you changed, named, with why.
- `design/DESIGN.md` updated in the same commits as the work, not afterwards.
- Any proposed edit to `CLAUDE.md` or a seat file, as a diff for the integrator.

**A peer's agreement is not the user's approval.** You can hand the integrator a
branch they cannot fault and it still does not authorise a push or a shared-doc
edit. That distinction is in both other seat files because it keeps being needed.

## This convention is not settled

This seat is newer than the other two and was written before it had ever been
occupied, which makes it the least tested document in the repo. `CLAUDE.md` and
both other seat files say the same of themselves and ask for the same thing in
return: where a rule here costs more than it saves, misses a case, or turns out to
be unnecessary, **propose a better version of it rather than working around it**,
and say what happened that prompted the change.

Say it to the person running the session, out loud and at the time, and open the
line with **WORKFLOW ISSUE:** in capitals so it cannot be skimmed past. A
workaround that stays in one agent's head is the one thing these conventions
cannot survive.
