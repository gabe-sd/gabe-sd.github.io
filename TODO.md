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

Left in place deliberately for now. The contract in `CLAUDE.md` was the thing
actively misleading readers and it has been corrected; the rules themselves cost
nothing but the bytes, and `shared.css` is the art director's while the redesign
is in flight. Worth sweeping once it lands.

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

### workflow-worktree-location — Worktrees must live inside the project folder

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

### workflow-cleared-worker-findings — "Report, never fix" assumes a live worker

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

### workflow-worktree-relative-paths — A tool session's cwd can leave the worktree without saying so

Twice on 2026-09-07, in one session, the shell's working directory silently
returned from `.claude/worktrees/<name>` to the shared checkout between one
command and the next. Everything written with a **relative** path after that
landed in the shared checkout instead of the branch: the first time it was most
of a phase's documentation, the second time a test file plus a full `npm test`
run, which then reported a failure the branch had already fixed and cost a
debugging cycle to explain.

Nothing was lost either time — the two trees held disjoint edits and the work was
moved across — but it is the same class of mistake "Shared ground" calls
absolute: writing into a tree you are not in. There it is framed as a thing an
agent does deliberately with `git -C` or a `cd`. This is the accidental version,
and it is quieter, because a relative path that used to be right stays spelled
the same way when it stops being right.

The proposed rule is one line and costs nothing: **from a worktree, write with
absolute paths.** Read freely with whatever is convenient; anything that
*modifies* a file — an editor tool, a shell redirect, a script — names the tree
it means. `git status` in both trees is the check that catches it after the
fact, and it should be part of finishing a phase rather than something you
happen to run.

Where it goes is the open question. It is not art-director-specific, so
`CLAUDE.md`'s "Shared ground" is the natural home, next to the existing rule it
is a variant of — but `CLAUDE.md` belongs to Gabriel and both seat files that
take a worktree would then repeat it. Decide with him.

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
longer exists. One did on 2026-09-03: the `sudoku-how-to-play` worker said it had
stopped its own server, removed the tree and went offline, and a
`python3 -m http.server` rooted in that tree was still listening afterwards. It
was found by the integrator at end of session and killed by pid.

It is quiet rather than harmful, which is the problem. A worktree serves on
`PORT=0`, so an orphan holds a random port and the usual check — is 8934 taken? —
sees nothing wrong. And neither seat file covers it: `WORKER.md` has no cleanup
section — "Handing over" is about the branch — and never mentions a server or a
process anywhere, while `INTEGRATOR.md`'s "Cleaning up" is written entirely about
branches and trees.

Two candidates, neither decided. `WORKER.md` could require stopping the server
before removing the tree, and verifying with `ss -ltnp` rather than trusting that
it stopped. Or `INTEGRATOR.md`'s cleanup could sweep for listeners whose
`/proc/<pid>/cwd` names a deleted path. The second is the stronger one, because it
catches the case where the worker believed it had cleaned up — which is the case
that actually happened — but it costs more: it has the integrator killing a
process it did not start, which "Shared ground" forbids without asking first. That
is only safe once the owning session is known to be gone, so any such rule has to
say how that is established. Decide the boundary with Gabriel before writing
either one.
