# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A static game arcade: plain HTML/CSS/JS with no build step, no framework, and no
runtime dependencies. Files are served as-is. The only dependency in the repo is
`playwright-core`, used by the browser tests and nothing else — keep it that way,
and never make the site itself need a build or a package install to run.

The repo is named `gabe-sd.github.io`, which makes it a GitHub Pages *user* site:
it deploys from `main` to the domain root, `https://gabe-sd.github.io/`, not to a
`/<repo>/` subpath. Every path in the site is relative (`shared.css`,
`../../index.html`), so nothing depends on that prefix either way — keep it
relative, and a future rename stays a non-event.

Known gaps and unscheduled work live in `games/<name>/TODO.md` for a game, and in
the root `TODO.md` for everything else — site-wide work, games not built yet, and
the slug naming rules. Check the relevant one before starting something new, and
delete entries as they land rather than marking them done — git history is the
record of what happened.

## As simple as possible, but as complex as it needs to be

The guiding principle here, and the reason this repo has no build step, no
framework and one dependency.

Both halves do work. The first rejects machinery whose cost outruns its benefit at
this size: continuous integration was considered and dropped because the whole
suite runs in seconds and can simply be run, and a file of completed
`TODO.md` entries was dropped because the deletion diff already is one. The second
is what stops that becoming an excuse to under-build: Pong's fixed timestep is more
machinery than scaling movement by a frame delta, and earns it by keeping the
simulation deterministic and `update()` free of any notion of time; its loop guards
scheduling on a `running` flag rather than on `rafId` being null because the
simpler version silently restarted the loop underneath the test harness.

The test is the same in both directions: **name what breaks if this were simpler.**
A concrete answer justifies the complexity. No answer means take it out.

## Several agents at once

This site is one repo holding several small, nearly independent projects: a game
lives entirely in `games/<name>/`, and adding one means creating that folder and a
card in the root `index.html`. That independence is what makes it reasonable to
have several agents working at the same time, each in its own worktree, each on a
different part of the site.

Most of what makes that safe is structural rather than procedural. Each game's
backlog is in `games/<name>/TODO.md` and its invariants in
`games/<name>/DESIGN.md`, so two agents on two games share no file. The checks in
`tests/docs-check.js` find games by reading the `games/` folder rather than from a
list someone has to extend. The rules left over are these.

**Work on a branch, never on main.** A new feature or fix starts with a branch
before the first edit, not after the work is done. `main` stays clean so a
half-finished change can be abandoned without unpicking it, and so the merge
commit is what records the feature. When the work has a `TODO.md` entry the branch
**is** that entry's slug, so one string finds the entry, the discussion and the
diff. If you catch yourself editing on `main`, `git checkout -b <name>` carries
uncommitted changes across.

**One agent owns one area at a time.** An area is a game folder, or the shell —
the root page, `shared.css`, the docs, the tests. Inside your area you own
everything and coordinate with nobody. Before the first edit, `git worktree list`
and `git branch --no-merged main` say what else is in flight; if something already
owns your area, do something else rather than starting beside it. Two branches
touching one file diverge silently, and the conflict surfaces later as a puzzle
instead of at the moment it was created.

**Your worktree is yours; nobody else's is. Read freely, never write.** Reading
another worktree is fine and sometimes the only way to work something out —
diffing what two of them were serving is how a port collision got diagnosed here.
**Writing into one you do not own is a hard rule, not a preference: never.**

That covers more than editing a file. A git command aimed at another tree does the
same damage in one line (`git -C`, or a `cd` followed by a `checkout` or `reset`),
and so does `git worktree remove` or `prune` while somebody is live in it, or
merging, force-pushing or deleting a branch that is someone's work in progress.
The rule is absolute because uncommitted work has no git record: clobber it and
there is nothing to recover it from and nothing to say what happened.

Processes count as well. Before killing anything you did not start, find out whose
it is — `ls -l /proc/<pid>/cwd` names the directory it was launched from. A server
already holding the port you wanted is far more likely to be another agent's than
a leftover of yours.

Two things stop some of this by accident, and neither is a substitute for the
rule: git refuses to check out a branch that is already checked out in another
worktree, and an agent session pinned to a worktree is blocked from running git
against the shared checkout. Somebody at a terminal has neither guard.

**Shared files are append-only, and get their own commit.** The root
`index.html` card list is the one every new game touches, and `CLAUDE.md`, the
root `TODO.md` and `shared.css` are the others. Appending rather than
restructuring keeps a collision to a ten-second fix, and keeping the edit in a
commit of its own means it can be replayed without unpicking the feature around
it.

**Never branch from a base that is missing work you depend on.** If the change
builds on something unmerged, branch from that rather than from `main`. Cutting
from `main` to "keep it clean" is the one option that cannot work.

**Integrate in your own worktree; never resolve on main.** Whoever finishes first
merges to `main` with `--no-ff` and runs the suite there. Everyone after that
pulls `main` into their own worktree, gets green *there*, and only then merges —
also `--no-ff`, explicitly, because a branch that has just absorbed `main` would
otherwise fast-forward and leave no merge commit for the slug to live in. Test
after each merge rather than after the last one: git catches conflicting text for
free, but two changes that each apply cleanly and break only together are what
actually costs you an afternoon, and after two merges there is nothing to tell you
which one it was.

**Share nothing at runtime.** `npm test` starts its own server on a free port, so
suites in different worktrees cannot end up driving each other's files — that
happened, and the run went green against the wrong checkout. The git stash stack
*is* shared across every worktree in the repo, so do not use it; a WIP commit sets
work aside without reaching into somebody else's.

The desktop is shared in the same way, and it is the one shared thing with no
technical guard at all. XTEST input goes to the real display and lands on whatever
window is on top, so two agents driving the pointer at once corrupt both runs —
and produce exactly the kind of false pass the pointer section below exists to
prevent. Only one runs at a time. There is no lock and none is worth building for
this: check for a headed browser you did not start (`pgrep -af chromium`, then
`ls -l /proc/<pid>/cwd` for whose it is), and if one is up, wait rather than run
concurrently and believe the number.

A doc-only edit belonging to work already in flight rides on that branch rather
than taking its own. The rule exists so half-finished work can be abandoned and so
the merge commit records the feature; a one-commit note gets neither and pays the
stale-base cost.

### This convention is not settled

All of the above came out of one experiment with two agents, not out of long
practice, and the parts of it that are wrong have not been found yet. It is
written down so there is something concrete to disagree with.

So: if you hit friction with it — a rule that cost more than it saved, a collision
it did not prevent, a step that turned out to be unnecessary — **propose a better
version of this section rather than working around it**, and say what happened
that prompted the change. That goes for anything you would improve about how the
work is split, merged or verified, not only the rules listed here. A workaround
that stays in one agent's head is the one thing this section cannot survive.

## Commands

```bash
npm test                        # every suite, on a server it starts itself
npm run serve                   # a server on 8934 to play in a browser; tests do not need it
node tests/chording.test.js     # one suite on its own; needs a server (npm run serve)
node tests/docs-check.js        # do the docs still describe this repo? no browser
node tests/ai-sweep.js          # how often Pong's ai saves; a ruler, not a test
node tests/volley-sweep.js      # how long a Pong volley is, and what each effect covers
node --check games/<name>/script.js   # syntax only - proves nothing about behaviour
```

`tests/ai-sweep.js` and `tests/volley-sweep.js` are deliberately outside
`npm test`: they measure rather than assert, and every difficulty and duration
claim in `games/pong/DESIGN.md` came out of one of them. Extend them rather than
writing a third — a figure from a differently shaped harness cannot be set
against the ones already recorded.

`npm install` first (once) for the tests; see `tests/README.md`. `npm test` needs
no server running — `tests/run-all.js` starts one on a free port rooted at the
checkout it lives in, which is what stops a run in one worktree testing another
one's files. `BASE_URL` still overrides it. To *play* rather than test, use
`npm run serve` and open the page: relative paths work from `file://` too, but a
server matches how it is deployed.

There is no linter or build. Tests are browser-driven and live in `tests/` — they
open real pages and assert on real game state, since there is nothing meaningful
to unit test in isolation. Add a suite there when you add a game or a feature
with state worth protecting.

## Architecture

### The page contract

Every game lives in `games/<name>/` as three files (`index.html`, `style.css`,
`script.js`), plus a `DESIGN.md` once it has earned one, and is otherwise
self-contained. Adding a game means creating that
folder and a card in the root `index.html`: the site has no registry, no
manifest and no build to update. What does need updating is all outside the
site — the page contract below, the game's ids and any storage key it invents,
a suite in `tests/`, which `npm test` finds by reading the directory rather than
from a list anyone has to extend.

Each game page follows a contract that `shared.css` depends on:

- Links `../../shared.css` **first**, then its own `style.css`.
- Uses the ids `#board`, `#status`, `#restart`. Game scripts look these up by id,
  and `shared.css` styles `.page`, `.status`, `.hint`, `.btn` (with `.secondary`
  and `.icon`), `.controls`, `.back-link` for them.
- **May add ids of its own, and writes them down in its own `DESIGN.md`.**
  `tests/docs-check.js` holds every id in a game page against that game's doc, so
  an id added to a page and never written down fails the check — which is the
  point, since an undocumented id is how the contract drifts. Recording them per
  game rather than in one shared list is also what keeps two games' agents out of
  the same file.
- Treats `#status` as game state only — what just happened, or what to do next.
  Standing instructions belong in a collapsible panel (Minesweeper, Pong and
  Flappy Bird all use `#instructions`), not the status line. `shared.css` gives
  `.status` a reserved min-height so its text can change without shifting the
  board.
- Links back to `../../index.html`.
- **Hands the focus back after a pointer click on its own buttons**, in any game
  whose keys drive play. A clicked button keeps the focus, and a focused button
  takes Space and Enter as its own activation — so the key that plays the game
  quietly becomes the key that works the button. In Flappy Bird, Space stopped
  flapping the moment How to play was clicked. Clicking the board did not recover
  it either: `preventDefault()` on `pointerdown` suppresses the mousedown the
  browser uses to move the focus, so the game has to blur by hand. `releaseFocus`
  does it on a pointer click only; a keyboard activation (`detail === 0`) has to
  keep the focus, or tabbing through the controls loses it on the first press.

`shared.css` owns the theme as CSS custom properties (`--bg`, `--fg`, `--cell-bg`,
`--cell-border`, `--accent`, `--win`, `--lose`, `--muted`) which flip under
`prefers-color-scheme: dark`. Per-game stylesheets should consume these tokens
rather than hardcoding colours, so a game restyles with the theme for free.
`hub.css` applies only to the root page.

### Scripts are classic, not modules

Game scripts are loaded as plain `<script src>` — not `type="module"`. Top-level
`let`/`const`/`function` bindings therefore live in the global scope and are
reachable from devtools or a test harness. This is the main testing affordance in
the repo: you can call `restart()`, `handleFlag(r, c)`, `handleReveal(r, c)` and
read `grid`, `state`, `gameOver` directly to set up a specific position instead of
clicking a game into shape. Keep it that way — switching a game to a module would
break that.

### Per-game designs worth knowing before editing

Each game's invariants — what a reader must not break — live with the game, in
`games/<name>/DESIGN.md`, along with its model and whatever was tried and rejected
getting there. Read that file before changing how a game plays, and update it in
the same commit as the change.

They are kept there rather than here so that two agents working on two games are
never editing the same file. Nothing about one game belongs in this file; what
belongs here is only what every game shares.

### Persisted state

Games that remember anything do it in `localStorage`, under a key namespaced by
the game (`<game>.<thing>`, never a bare name). Keep it local — no network, no
accounts. **Which keys a game owns is written down in that game's own
`DESIGN.md`**, not here; `tests/docs-check.js` holds each game's keys against its
own doc, and it finds the games by reading the `games/` folder, so a new one is
covered the day its folder exists and there is no list to remember to extend.

Wrap every `localStorage` access. It does not merely return `null` when
unavailable, it *throws* — in private windows, with site data blocked, and from
`file://` in some browsers — so an unguarded read at load time takes the whole
game down. Every reader degrades to a default instead, and every game that stores
anything has a test covering the throwing path.

Anything that clears stored data is two-step: the first click arms it, the second
does it. Minesweeper's Reset best time is the pattern — see its `DESIGN.md`.
Clearing cannot be undone, and a confirm dialog is not available to us in a page
that has to work with no dependencies.

Collapsible panels toggle via the `hidden` attribute, so any `display` rule on
one must be scoped to `:not([hidden])` — a display value otherwise wins over
`hidden` and the panel renders open on load.

## Verifying changes

Drive the real page and assert on game state. Reading the code and reasoning about
it is not verification, and `node --check` only catches syntax errors. Run
`npm test` before merging; add cases for what you changed.

**Reread the docs before merging, not after.** Grep the files you touched for
their own names and see what the docs claim about them. One Pong branch left four
separate claims wrong across three files — that a menu had three buttons in it,
that `draw()` kept no history, that Minesweeper held the only stored data, that
the speed cap was a fixed number — and every one of them would have sent the next
reader somewhere wrong. `tests/docs-check.js` runs inside `npm test` and catches
the mechanical half: a name that no longer exists, a path that does not resolve,
an id or a storage key nobody wrote down. It cannot read a sentence. A doc that
passes it can still be describing a game you deleted.

Four principles underneath that, each of which has already paid for itself here:

- **A test that has never failed has not been shown to test anything.** Prove
  every fix by reverting to the broken code, watching the new test fail, then
  restoring and watching it pass. What that catches is not a bad fix — it is a
  test that passes for the wrong reason.
  **Commit before you do it.** "Restoring" means `git checkout -- <file>`, which
  restores the file to `HEAD` — so on a branch with nothing committed yet, the
  proof destroys the very work it was meant to verify. That has happened twice
  here, both times costing a full replay of the change from scratch. Commit, then
  break, then `git checkout` back.
- **Characterise before you change.** Against code with no coverage, first write
  tests for what it does *now*. Every test failure while building Pong out was a
  wrong assumption of the author's rather than a regression, which is what these
  tests are mostly for: an assumption-checker first, a safety net second.
- **Assert outcomes, not mechanics.** "The ball came back" survives a rewrite of
  how movement is timed; "the ball moved six pixels" does not. A test pinned to
  the implementation has to be rewritten by the very change it was meant to guard.
- **Write down what you ruled out.** A dead end nobody records gets explored again
  by the next person, or by you in a month. `tests/README.md` carries the ones
  found so far.
- **A canvas measurement is a claim about pixels, not about the thing you meant.**
  Every visual check here has had to be rewritten at least once because something
  else in the scene produced the same signal: a wind-up reddens a paddle, so "is
  it still red" passed with the charge layer deleted; the glow around a bolt
  clears any "changed pixels" threshold, so a missing white core went unnoticed;
  a bright core drawn over red *lowers* a red-pixel count, so strengthening an
  effect made the number go down. Decide what only the thing under test could
  produce, and measure that.

Behaviour you are knowingly leaving broken should be pinned as a passing assertion
that states the wrong result and says so. Fixing it then turns a check red, so the
before/after evidence arrives without anyone having to remember to look for it.

Where a suite drives the harness itself — freezing a loop, stepping a tick —
assert that the harness works before assuming it does. A freeze that silently stops
working turns every later check into a race that still passes.

### Mouse/pointer behaviour must be verified with real input

Do not trust Playwright `page.mouse` or CDP `Input.dispatchMouseEvent` alone for
input bugs. They click at a fixed coordinate without any pointer motion and bypass
browser-level native handling (middle-click autoscroll, middle-click paste). Drive
real X11 input via XTEST (`pynput`) against a real headed browser instead.

**Why this is here:** Minesweeper's middle-click chording was "verified" passing
three separate times while being completely broken in real use. The chord fired on
`mouseup`, but only if the pointer never left the cell — a `mouseleave` handler
cancelled the pending chord. Since the middle button *is* the scroll wheel,
pressing it physically nudges the mouse, and any nudge across a 32px cell edge
silently killed the chord. Synthetic input never wobbles, so every test passed. Two
fixes shipped on those false passes, and the second introduced the `mouseleave`
cancel that made it worse. It was caught only by replaying the click with real
XTEST input plus a few px of movement while the button was held.

Rules that follow:

- Include the messy parts of human input: movement while a button is held,
  releasing on a different element than the press, repeated fires.
- If a test passes but the reporter says it is broken, suspect the harness before
  concluding it is environmental.
- Run the before/after proof above under *identical real input*, not synthetic —
  a synthetic replay of a pointer bug is what produced the false passes in the
  first place.
- Prefer input handling that does not depend on the pointer staying still.

`tests/chording.test.js` case 2 is the standing guard for this — it moves the
pointer while the button is held. Do not delete it.

## Machine-specific: driving a real browser on the dev box

> **This is the dev box**, and development happens on it: a Wayland session with
> XWayland on `DISPLAY=:0`, using snap-packaged browsers. Everything below was
> learned the hard way here and holds here. None of it is portable — on X11,
> macOS, in a container or with non-snap browsers, most of it is wrong and
> following it wastes time. If the machine ever changes, `echo $WAYLAND_DISPLAY`
> and whether the browsers are snaps are what to check first.

- **Snap Chromium works on X11** with `--ozone-platform=x11` and
  `GDK_BACKEND=x11`. Without them it runs as a Wayland client and
  `window.screenX/screenY` report `0,0`, so XTEST clicks cannot be aimed at it.
- **Snap Firefox cannot open `:0`** ("cannot open display") even though its x11
  snap interface shows as connected. Workaround: download the Mozilla tarball and
  run it unconfined with `-no-remote -profile <dir>`.
- **XTEST input works** on `:0` via `pynput`. Install into a venv — the system
  Python is PEP-668 managed and refuses `pip install`.
- **Screen capture of the X11 root is black** because Wayland does the
  compositing, so screenshots cannot be used to read state. Have the page report
  telemetry to a local HTTP server, or read state over CDP.
- CDP over websocket needs `--remote-allow-origins='*'`, or `suppress_origin=True`
  on `websocket.create_connection`.
- Node here is v22, so nothing forces the `playwright-core` pin any more. It
  stays at exactly 1.45.0 because that is what the suites are known to pass on,
  not because a newer one would refuse to start — see `tests/README.md`.

**Caution:** XTEST clicks go to the real shared desktop and land on whatever window
is on top — possibly the user's own applications, or another agent's browser,
rather than the test window. Check window geometry before clicking, and check
process start times before any `pkill` so a long-running personal browser session
is not killed. With more than one agent running this is not only a risk to what
you hit but to what you measure: two of these at once corrupt both runs, so they
are serialised across agents — see "Several agents at once".
