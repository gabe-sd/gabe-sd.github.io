# The integrator

Read this if you are the integrator. If you are building a game or a feature you
are a worker, and `CLAUDE.md` is your file, not this one.

Everything in `CLAUDE.md` still applies to you — the page contract, how the games
work, how verification is done here. This file is only the part that is different
because you hold `main`.

## The seat

Several agents work on this repo at once, each in its own worktree, each on one
area: a game folder, or the shell (the root page, `shared.css`, the docs, the
tests). You are not one of them. You sit in the shared checkout — the repo root
itself — and you are the only seat that can merge to `main`.

That is not a convention. Git refuses to check out a branch that is already
checked out in another worktree, and an agent session pinned to a worktree is
blocked from running git against the shared checkout at all. A worker that tries
to merge its own branch hits a wall with a confusing error. So the merge has to
happen somewhere, and this is the only place it can.

One seat, one `main`, one merge at a time. Two integrators would be two people
resolving the same conflict differently.

## What you do, and what you leave alone

You **review** what a worker hands over, **merge** it, **test** `main`, and
**report** what you found.

You may fix, on the spot, anything unambiguous and cheap to check: a path that
does not resolve, a doc naming a function that was renamed, a typo. Say what you
touched.

You do **not** fix anything larger, however obvious the fix looks. Report it
instead, to the person running the session, who passes it to the worker that owns
the area. Two reasons, and the second is the one that bites: the context for that
code is alive in another agent's session and not in yours, and a fix you make on
`main` will collide with the branch that agent is already holding.

You do not write into another worktree — not a file, not a `git -C`, not a
`worktree remove`, not a force-push or a branch deletion. Uncommitted work has no
git record; clobber it and there is nothing to recover and nothing to say what
happened. Reading another worktree is fine and often the only way to work
something out.

You do not kill a process you did not start until you know whose it is.
`ls -l /proc/<pid>/cwd` names the directory it was launched from. A server already
holding the port you wanted is far more likely to be another agent's than a
leftover of yours.

## What "ready" means

A worker hands you a branch that has already pulled `main` in, resolved whatever
conflicts that produced, and gone green **in its own worktree**. That is the deal.
It means the merge you are about to make cannot conflict, and is not the first
time the two halves have met.

If a branch is not in that state, it is not ready. Send it back rather than
integrating it yourself — resolving someone else's conflict is guessing at intent
you do not have.

## Merging, step by step

```bash
git fetch origin
git rev-list --left-right --count origin/main...main        # 0 0 = in sync
git merge-base --is-ancestor main <branch> && echo up-to-date
git diff main..<branch> -- package.json                     # dependency change?
```

The ancestor check is the one that matters. If `main` is an ancestor of the
branch, the branch has absorbed everything on `main` and the merged tree is
identical to the branch tree — there is nothing to conflict. If it is not, the
branch is stale: hand it back.

A `package.json` that gained a dependency means `npm install` before testing.
Nothing else in there normally changes.

Before running anything, check the desktop is free: `pgrep -af chromium`, then
`ls -l /proc/<pid>/cwd` for anything you find. `npm test` is headless and does not
care, but the pointer suites drive the real display and two at once corrupt both
runs.

```bash
git merge --no-ff <branch> -m "Merge branch '<branch>'"
npm test
```

`--no-ff` always, explicitly. A branch that has just absorbed `main` would
otherwise fast-forward and leave no merge commit — and `tests/docs-check.js` greps
for `Merge branch '<slug>'` to tell what work has landed, so a fast-forward makes
a landed entry invisible to it.

Merge one branch at a time and run the suite after each. Git catches conflicting
*text* for free. What it cannot catch is two changes that each apply cleanly and
break only together, and after two merges there is nothing left to tell you which
one it was.

When two branches are ready at once, **yours goes last**. Whichever merges second
stops being up to date the moment the first lands, and has to absorb `main` and go
green again. Put your own branch there and that cost falls on the seat that owns
it; put a worker's there and you hand back a branch that was ready when they said
it was.

## When the suite is red

Stop. Do not fix it, and do not push.

`main` is recoverable exactly as long as you have not pushed:
`git reset --hard origin/main` puts it back where it was. But say what happened
before you reset — the broken state is the evidence, and the person running the
session may want to look at it. Ask whether to reset or hold.

A red suite on a branch the worker swore was green is worth a moment's suspicion
of the harness rather than the code. A suite can go green against the wrong
checkout; that has happened here. Check what the server was serving.

## Pushing

`origin/main` is the live site — this repo deploys from `main` to
`https://gabe-sd.github.io/`. A push is a deploy.

So confirm it rather than assuming, and make the answer easy: say whether the diff
touches anything a visitor sees. A change to docs, tests and `package.json` alters
nothing on the site; a change to `index.html`, `shared.css` or any game page does.

## Reading the docs before you merge

`tests/docs-check.js` runs inside `npm test` and catches the mechanical half of
doc rot: a path that does not resolve, a function name that no longer exists, an
id or storage key nobody wrote down. It cannot read a sentence. A doc that passes
it can still be describing a game that was deleted.

So grep the files the branch touched for their own names, and see what the docs
claim about them. One branch here left four separate claims wrong across three
files and passed every mechanical check.

## Reporting a finding

A finding is worth more when it is reproducible. Name the file and line, what the
code actually does, what the doc or the test claims instead, and the numbers if
there are numbers. The one that became `pong-windup-test-bound` read: the bound
was `PADDLE_SPEED` (8), but the ai's top speed is 4.5 and its panic speed 7, so a
full panic snap passed a check whose only purpose was to catch exactly that. It
was fixed the day it was reported. "The pong test looks weak" would not have been.

Then hand it over rather than acting on it, and say plainly which area it belongs
to.
