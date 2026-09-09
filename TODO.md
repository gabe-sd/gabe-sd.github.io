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
where the reason behind a rule is written down, and `WORKER.md` sends you to one
of these entries on purpose. But do not take work from it. Every entry here lands
in `CLAUDE.md`, in a seat file, or in the checks behind them — all the
integrator's, and the first two only after review with Gabriel. A worker fixing
one is rewriting the rules it is working under. If a rule bites you, that is not
a task to pick up — say so at the time, marked **WORKFLOW ISSUE:**, which is what
puts an entry here in the first place.

### workflow-slug-reference-check — Nothing checks that a slug a doc names still exists

A slug is both a `TODO.md` entry heading and the branch name for that work, and
docs point at them in backticks — "see `redesign-tokens-hub` for the reasoning".
Those references rot in one specific way: the work lands, the entry is deleted as
the convention requires, and every pointer to it is now aimed at nothing.
`tests/docs-check.js` cannot see it. Check 1 only matches paths with a directory
in them, and a slug is neither a path nor a function name.

It has already happened: `design/previews/README.md` sent readers to
`redesign-tokens-hub` for the full reasoning, and that entry was deleted in
`5232f4e`. Found by hand during the docs passes, not by any check.

The rule is one line — **every backticked slug is either an open entry heading in
some `TODO.md`, or has a merge commit naming it.** Open means still to do, merged
means it landed and git has it; neither means dangling. Check 5 already builds the
merge-subject pattern this needs (both accepted shapes, closing quote or colon),
so this is mostly a second use of it.

Two false-positive shapes to expect, both currently benign and neither worth
failing on: the naming rules quote `pong-difficulty-menu` and `pong-difficulty` as
illustrations, and `games/pong/TODO.md` names `pong-shooter-powerup`, an entry
retired by replacement rather than by landing. Scope the pattern to known area
prefixes or the false-alarm rate makes it worthless — the thing check 5's own
history warns about.

This is the integrator's, needs the break-and-restore proof like any `tests/`
change, and is first here because it is the only entry in this section that needs
no decision from Gabriel first.

### workflow-worktree-location — Worktrees must live inside the project folder

Gabriel's decision, 2026-09-03: every Claude instance keeps its files under the
project folder, for security. A worktree at `.claude/worktrees/<slug>` satisfies
that — it is gitignored, and `tests/docs-check.js` refuses to walk into hidden
directories so a worktree's `TODO.md` is never read as this branch's. A sibling
directory outside the repo does not.

It happened once, on a worker spawned before `WORKER.md` existed, whose
instructions never mentioned a worktree at all. Nothing is being changed for it:
`WORKER.md` now carries the path inside the command, which is the fix for exactly
that case. This entry exists to set the trigger:

**If a worker that has read `WORKER.md` still puts a tree outside the project
folder, the doc is not enough and something structural is needed.** What that
should be is Gabriel's call before anyone builds it. The obvious candidate — a
check that fails when `git worktree list` names a path outside the repo — is
weaker than it sounds, because a test runs after the tree exists and so reports
rather than prevents.

### workflow-cleared-worker-findings — "Report, never fix" assumes a live worker

`INTEGRATOR.md` tells the integrator to report a finding in a game's area rather
than fix it, and let it ride on that game's next branch. That reasoning holds only
while the worker is live — it has no answer for one being cleared. It happened on
`sudoku-puzzle-quality`: two wrong doc claims found, branch merged, session retired
the same evening, so the findings existed only in a chat log about to close.
Gabriel authorised a direct edit in Sudoku's area, once, by name — which worked and
is not a rule.

What to decide: what the integrator does by default when the owning session is
gone. Filing an entry in that game's `TODO.md` is the obvious candidate and is
cheap, but it is still an edit in somebody else's area, which is the thing the rule
exists to prevent. **Ask Gabriel rather than picking one**; the answer belongs in
`INTEGRATOR.md` once it is settled.

### workflow-npm-serve-background — `npm run serve` from a worktree binds the port and answers nothing

On 2026-09-07, `PORT=0 npm run serve` and `PORT=8936 npm run serve` started as
background tasks from a worktree both bound their port and then closed every
connection without a response — `curl` reported an empty reply, and a browser
`ERR_EMPTY_RESPONSE`. The same `python3 -u -m http.server <port>` run directly
from the same directory, in the foreground *or* backgrounded, served normally,
and `npm run serve` from the shared checkout was fine throughout.

So it is the npm wrapper plus the background task runner, not the server and not
the worktree. It was worked around by running `python3 -m http.server` directly
and passing on that URL, which is exactly what the npm script does anyway.

Unresolved: whether this reproduces outside the one harness it was seen in, and
whether the `exec` in the `serve` script is involved. Worth ten minutes before
`CLAUDE.md`'s "Port 8934 is the shared checkout's" paragraph tells the next agent
to run a command that does not work where it tells them to run it.

### workflow-worktree-server-orphan — Removing a worktree leaves its server running

`git worktree remove` succeeds while a preview server is still serving that path,
and the process outlives the tree with its cwd pointing at a directory that no
longer exists. One did, after its worker said it had stopped the server and gone
offline. It is quiet rather than harmful, which is the problem: a worktree serves
on `PORT=0`, so an orphan holds a random port and the usual check — is 8934 taken?
— sees nothing wrong. Neither seat file covers it.

Two candidates, neither decided. `WORKER.md` could require verifying with
`ss -ltnp` rather than trusting the server stopped. Or `INTEGRATOR.md`'s cleanup
could sweep for listeners whose `/proc/<pid>/cwd` names a deleted path — stronger,
because it catches the case that actually happened, where the worker believed it
had cleaned up. It costs more, though: it has the integrator killing a process it
did not start, which "Shared ground" forbids without asking. That is safe only once
the owning session is known to be gone, so any such rule has to say how that is
established. **Decide the boundary with Gabriel before writing either.**
