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

Work on how the repo is run rather than on the site takes a `workflow-` prefix and
belongs in the `## Workflow` section at the end of this file, which says who acts
on it. Work on how the site looks belongs in `design/TODO.md` rather than here,
for the same reason a game's own work belongs in its folder: it has an owner and a
seat of its own.

## New games

### reaction-time-game — Reaction time test

### chimp-memory-game — Chimp memory test

See the Human Benchmark version for the shape of it.

## Site-wide

Work on how the site **looks** is not here. It belongs to the art director, and
its backlog is `design/TODO.md`, beside the design itself in `design/DESIGN.md`.
See `ART-DIRECTOR.md` for the seat.

### site-readme-for-humans — The README is written for agents, not visitors

It is the front page of a public repo, but it reads like the internal docs beside
it. Review with Gabriel before rewriting — what a visitor should get from it is
his call.

### site-dead-shared-rules — Three rules in `shared.css` are used by nothing

`.page`, `.hint` and `.back-link` are styled in `shared.css` and applied by no
page on the site. The frame replaced all three: a game page is `.game-page`, its
link home is the breadcrumb, and standing instructions live in the collapsible
panel rather than a hint line. The design mockups under `design/` do use `.page`
and `.hint`, but they are self-contained and define their own — deleting these
rules cannot touch them.

The contract in `CLAUDE.md` was the thing actively misleading readers and it has
been corrected; the rules themselves cost nothing but the bytes. They were left
alone while the redesign held `shared.css`. That landed on 2026-09-07, so the
sweep is available now.

### site-favicon — The site has no favicon

Every page 404s `/favicon.ico`, because browsers ask for it whether or not you
reference one and there is no file to serve. Nothing is broken — it costs a
generic page icon in the tab and a 404 in the console — but it is the sort of
thing that reads as unfinished on a live site.

One file at the repo root is enough; browsers find `/favicon.ico` without a link
tag, which also keeps it out of every game page's `<head>`. An SVG referenced
from `shared.css`'s owning pages would need markup in all six instead.

### highscore-backend — A backend for stored values

Everything is `localStorage` today, so nothing is shared between devices or
players. A high score table is the obvious first thing that needs a server, and
also the first thing that would break the "no build, no dependencies, files served
as-is" property the site has now. Worth planning before it is wanted.

## Workflow

How the work is run, rather than what the site does: the seat split, the merge
rules, and the conventions in `CLAUDE.md`, `WORKER.md` and `INTEGRATOR.md`. An
entry here starts life as a **WORKFLOW ISSUE:** raised out loud during a session,
which is why the prefix is `workflow-` and not `site-` — the flag and the slug are
the same thing at two stages.

**If you are a worker, this is not your backlog.** Read it freely; it is often
where the reason behind a rule is written down. But do not take work from it.
Every entry here lands
in `CLAUDE.md`, in a seat file, or in the checks behind them — all the
integrator's, and the first two only after review with Gabriel. A worker fixing
one is rewriting the rules it is working under. If a rule bites you, that is not
a task to pick up — say so at the time, marked **WORKFLOW ISSUE:**, which is what
puts an entry here in the first place.
