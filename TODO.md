# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

Within a section, entries are in priority order. The first one is what to do next.

Each game keeps its own backlog in its own folder, beside its `DESIGN.md`:
`games/pong/TODO.md`, `games/minesweeper/TODO.md`. A game with no such file has
no open work recorded. That split is what lets several agents work at once —
see "Shared ground" in `CLAUDE.md`, and `WORKER.md`.

What stays here is everything belonging to no single game: the naming rules
below, games that do not exist yet, and site-wide work.

## Naming entries

Every entry is headed by a slug — the game, then **the work**:
`pong-difficulty-menu`, not `pong-difficulty`. Areas recur and get revisited; a
specific piece of work happens once, which is what keeps slugs from colliding.

The slug is also the branch name, so it lands in the merge commit and one string
retrieves the entry, the discussion and the implementation:

```bash
grep -rn "<slug>" .               # the entry, and anything referring to it
git log --all --grep="<slug>"     # the work itself, once it has landed
```

Run both before inventing a slug. Nothing else is needed: git is the record of
retired slugs, so there is no list to maintain, and a slug that did somehow repeat
still describes what it names in both places.

## New games

### reaction-time-game — Reaction time test

### chimp-memory-game — Chimp memory test

See the Human Benchmark version for the shape of it.

## Site-wide

### site-readme-for-humans — The README is written for agents, not visitors

It is the front page of a public repo, but it reads like the internal docs beside
it. Review with Gabriel before rewriting — what a visitor should get from it is
his call.

### site-favicon — The site has no favicon

Every page 404s `/favicon.ico`, because browsers ask for it whether or not you
reference one and there is no file to serve. Nothing is broken — it costs a
generic page icon in the tab and a 404 in the console — but it is the sort of
thing that reads as unfinished on a live site.

One file at the repo root is enough; browsers find `/favicon.ico` without a link
tag, which also keeps it out of every game page's `<head>`. An SVG referenced
from `shared.css`'s owning pages would need markup in all six instead.

### site-worktree-location — Worktrees must live inside the project folder

Gabriel's decision, 2026-09-03: every Claude instance keeps its files under the
project folder, for security. A worktree at `.claude/worktrees/<slug>` satisfies
that — it is gitignored, and `tests/docs-check.js` deliberately refuses to walk
into hidden directories so a worktree's `TODO.md` is never read as this branch's.
A sibling directory outside the repo does not.

It happened once, on `sudoku-puzzle-quality`. That worker had been spawned before
`WORKER.md` existed, so its instructions never mentioned a worktree at all; when
it was told mid-task to create one, it ran `git worktree add` by hand and put the
tree at `/home/g/git/gabe-sd.github.io.worktrees/<slug>`. That is the ordinary git
convention — most guides put worktrees outside the repo, because inside needs a
gitignore entry — so it was a reasonable choice made in the absence of any
instruction. Nothing in the repo said otherwise where a worker would look: the
location was recorded only in `tests/README.md` and a comment in
`tests/docs-check.js`, both harness files a game fix has no reason to open.

Nothing is being changed for it. `WORKER.md` now gives the path in the command
itself, which is the fix for exactly this case — an agent that was going to run
the command by hand now has the path in front of it. This entry exists to record
the decision and to set the trigger:

**If a worker that has read `WORKER.md` still puts a tree outside the project
folder, the doc is not enough and something structural is needed.** What that
should be is not decided, and is Gabriel's call before anyone builds it. Note that
the obvious candidate — a check that fails when `git worktree list` names a path
outside the repo — is weaker than it sounds: a test runs after the tree already
exists, so it reports rather than prevents. The cheapest thing that could work is
already in place, which is the path sitting inside the command in `WORKER.md`.
One instance with a known cause is not evidence a rule needs machinery behind
it.

### site-cleared-worker-findings — "Report, never fix" assumes a live worker

`INTEGRATOR.md` tells the integrator to report a finding in a game's area rather
than fixing it, and to let it ride on that game's next branch. The reasoning holds
— the context is alive in another session, and a fix on `main` collides with the
branch that worker is holding.

It has no answer for a worker that is being cleared. That happened on
`sudoku-puzzle-quality`: the review turned up two wrong claims in Sudoku's docs,
the branch merged, and the session was retired the same evening. There was no next
branch and nobody holding context, so the findings existed only in one chat log
that was about to be closed. Gabriel resolved it by authorising a direct edit in
Sudoku's area, once, by name — which worked, and is not a rule.

What to decide: what the integrator does by default when the owning session is
gone. Filing an entry in that game's `TODO.md` is the obvious candidate and is
cheap, but it is still an edit in somebody else's area, which is the thing the
rule exists to prevent. Ask Gabriel rather than picking one — the boundary of that
rule is his, and the answer belongs in `INTEGRATOR.md` once it is settled.

### site-visual-design — Improve the site's design and visual appeal

### highscore-backend — A backend for stored values

Everything is `localStorage` today, so nothing is shared between devices or
players. A high score table is the obvious first thing that needs a server, and
also the first thing that would break the "no build, no dependencies, files served
as-is" property the site has now. Worth planning before it is wanted.
