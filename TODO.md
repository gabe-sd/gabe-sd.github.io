# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

Within a section, entries are in priority order. The first one is what to do next.

Each game keeps its own backlog in its own folder, beside its `DESIGN.md`:
`games/pong/TODO.md`, `games/minesweeper/TODO.md`. A game with no such file has
no open work recorded. That split is what lets several agents work at once —
see "Several agents at once" in `CLAUDE.md`.

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

### workflow-worktree-exit-warning — Removing a worktree warns about commits that are not at risk

The worktree tooling records the branch name it created and does not follow a
rename. `CLAUDE.md` tells every worker to rename `worktree-<slug>` to the bare
slug, so by the time the worktree is removed the recorded name is a ref that no
longer exists — and the removal warning counts commits against it. On 2026-09-02
that read "will discard 35 commits" when the true answer was none: every commit
involved was already an ancestor of `main`, and `git rev-parse --verify` on the
recorded name returned "Needed a single revision".

Following the documented convention is what produces the false alarm, so the next
worker to clean up meets the same message, and the safe-looking response to it is
to keep a worktree nobody needs. What to decide is whether `CLAUDE.md` gains a
line saying the warning is expected, and how to answer it properly: check each
commit you authored with `git merge-base --is-ancestor <commit> main` rather than
trusting or fearing the count.

Filed rather than written straight into `CLAUDE.md` because changes to that file
are reviewed with Gabriel first — see `INTEGRATOR.md`, "Two speeds inside the
shell". Found by the Pong worker while removing its own worktree, and verified
from the shared checkout after the removal.

### site-favicon — The site has no favicon

Every page 404s `/favicon.ico`, because browsers ask for it whether or not you
reference one and there is no file to serve. Nothing is broken — it costs a
generic page icon in the tab and a 404 in the console — but it is the sort of
thing that reads as unfinished on a live site.

One file at the repo root is enough; browsers find `/favicon.ico` without a link
tag, which also keeps it out of every game page's `<head>`. An SVG referenced
from `shared.css`'s owning pages would need markup in all six instead.

### site-visual-design — Improve the site's design and visual appeal

### highscore-backend — A backend for stored values

Everything is `localStorage` today, so nothing is shared between devices or
players. A high score table is the obvious first thing that needs a server, and
also the first thing that would break the "no build, no dependencies, files served
as-is" property the site has now. Worth planning before it is wanted.
