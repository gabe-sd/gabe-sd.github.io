# The worker

Read this if you are a worker. If you hold `main` and do the merging you are the
integrator, and `INTEGRATOR.md` is your file, not this one. If nobody has told you
which you are, **ask before you touch anything** — see "Which seat are you" in
`CLAUDE.md`.

Everything in `CLAUDE.md` still applies to you — the page contract, how the games
work, how verification is done here, and the hygiene that binds both seats. This
file is only the part that is different because you do **not** hold `main`.

Spawning one of these is one line:

> You are a worker. Your area is `games/<name>`. Read `WORKER.md` and take a
> worktree before your first edit.

## The seat

Several agents work on this repo at once, each on one area: a game folder, or the
shell (the root page, `shared.css`, the docs, the tests). You own one of them, you
build in a worktree of your own, and you hand the finished branch to the
integrator, who is the only seat that merges to `main`.

The shell is the integrator's by default, so a worker gets it only when it is
handed to them deliberately — substantial visitor-facing work, a landing-page
redesign. Ask rather than assume.

## Take a worktree before your first edit

This is the first step of the work, not preparation for it. It comes before the
branch, because the branch is created by it.

```bash
git worktree add .claude/worktrees/<slug> -b <slug>      # then work in there
```

If your session has an `EnterWorktree` tool, use that instead — it does the same
thing and moves you into the tree. Worktrees live in `.claude/worktrees/`, which is
gitignored and which `tests/docs-check.js` deliberately refuses to walk into.

**This holds even when you are the only agent working.** The reason is not
politeness to a peer who might turn up; it is that **the shared checkout is the
integrator's seat**. Branch there and that branch is checked out where they sit:
their `HEAD` is your work, `main` is not available to them, and your uncommitted
files are in their working directory. They cannot merge anything, including yours,
until you move.

Two guards catch some of this by accident, and both of them only fire *because*
somebody is in a worktree — git refuses to check out a branch already checked out
in another worktree, and a session pinned to a worktree is blocked from running git
against the shared checkout. A worker who never took a worktree has neither.

The cost is one `npm install` in the new tree. Worktrees are disposable: `.git` is
shared rather than copied and the checkout is well under a megabyte.

Remove your own worktree from inside the session that is in it. Removing one from
outside leaves that session's working directory pointing at a path that no longer
exists.

That is for a session that entered a worktree and can leave it again. An agent
*launched* into one cannot: `ExitWorktree` refuses a subagent whose working
directory was pinned at launch, so its only route out is `git worktree remove`
aimed at its own path, which strands it. It can break the rule or ignore it, not
obey it — so it leaves the tree alone and says so in its report, and whoever
launched it removes the tree once the branch has landed.

## Work on a branch, never on main

A new feature or fix starts with a branch before the first edit, not after the work
is done. `main` stays clean so a half-finished change can be abandoned without
unpicking it, and so the merge commit is what records the feature. When the work
has a `TODO.md` entry the branch **is** that entry's slug, so one string finds the
entry, the discussion and the diff. If you catch yourself editing on `main`,
`git checkout -b <name>` carries uncommitted changes across.

If your harness named the branch `worktree-<slug>`, rename it to the bare slug:
`tests/docs-check.js` tolerates the prefix so a landed entry is still recognised,
but nothing else does.

Expect that rename to produce a false alarm much later. The worktree tooling
records the branch name it created and does not follow a rename, so when the tool
removes it, its warning counts commits against a ref that no longer exists. It
read "will discard 35 commits" here against a true answer of none, and
`git rev-parse --verify` on the name it used returned "Needed a single revision".
The convention causes the alarm, so everyone who follows it meets the message
eventually — and the safe-looking response, keeping a worktree nobody needs, is
the one that costs the next agent twenty minutes. Answer it by checking the
commits instead of the count: `git merge-base --is-ancestor <commit> main` for
each one you authored, then remove it.

### The slug says whether the entry closes

The bare slug is for work that **closes** the entry and deletes it. Work that
advances one without closing it — characterising it, correcting it, filing a note
against it — takes the slug plus a suffix: `pong-insane-ball-speed-characterised`
rather than `pong-insane-ball-speed`. Check 5 in `tests/docs-check.js` reads a
`Merge branch '<slug>'` commit as proof that entry has landed, and fails while the
entry is still in the file, so the bare slug on a branch that leaves the entry
open turns `main` red at the merge — for the integrator, not for you. The
pattern includes the closing quote, which is what lets a suffix clear it.

Two rules that each looked right on their own, and a collision only visible from
the seat that merges. It has now been found three times, and the first time it went
into a commit message (`315e743`) and a comment inside `docs-check.js`, where
nobody reading these files would meet it. Note also that it cannot be smoke-tested
with an empty commit: the check passes `--merges`, so only a real merge commit
trips it, and an empty one passes and tells you the problem is not there.

**An entry you filed yourself still has to be deleted.** The third way this was
found: every paragraph above imagines an entry that already exists on `main`, and
none of them covers the branch that files one and closes it in the same breath.
That is the ordinary shape of a new game — the root `TODO.md` entry and the game
itself land together — and it is how `sudoku-game` reached handover with its own
entry still in the file. Check 5 reads the merged tree and does not care who wrote
the entry or when. So the question to ask is not "did I inherit this entry" but
"is this entry still true once this branch is on `main`" — and for a game you have
just built, it is not. Deleting it changes nothing you can observe, for the reason
just given: the check cannot fire until the merge commit exists.

## One agent owns one area at a time

An area is a game folder, or the shell — the root page, `shared.css`, the docs,
the tests. A suite belongs to the game whose page it drives, not to the shell —
`tests/chording.test.js` and `tests/best-time.test.js` are Minesweeper's, however
they are named — because the worker changing a game is the one told to add cases
for what they changed. What is left to the shell is the harness and the suites
that drive no game in particular.

Inside your area you own everything and coordinate with nobody. Before the first
edit, `git worktree list` and `git branch --no-merged main` say what else is in
flight; if something already owns your area, do something else rather than starting
beside it. Two branches touching one file diverge silently, and the conflict
surfaces later as a puzzle instead of at the moment it was created.

**Inside your area, edit freely. Crossing out of it, append.** The root
`index.html` card list is the one file new work routinely touches from outside —
every new game adds a card — and `shared.css` is the other, when a game needs a
token that is not there yet. Add to those rather than restructuring them, and a
collision stays a ten-second fix.

Everything else belongs to whoever owns that area, and is theirs to rewrite. This
replaced a broader rule that made every shared file append-only, the docs
included. That rule was a precaution rather than something anyone had been bitten
by, and it does not survive contact: landing a new game *deletes* its entry from
the root `TODO.md`, and the paragraph below this one had to be rewritten because
it was wrong. A file that may only be added to gets more wrong over time, not
less.

**Never branch from a base that is missing work you depend on.** If the change
builds on something unmerged, branch from that rather than from `main`. Cutting
from `main` to "keep it clean" is the one option that cannot work.

## Handing over

**Integrate in your own worktree; you do not merge to `main` yourself.** Pull
`main` into your worktree, resolve any conflicts *there*, and get the suite green
*there*. Then say the branch is ready, and stop — say it to the person running the
session. There is nothing to push either: worktrees share one object store, so your
branch is already a ref in the shared checkout the moment you commit. The merge is
the integrator's, made from the shared checkout — an agent pinned to a worktree
cannot reach `main` in any case, since git refuses to check out a branch already
checked out elsewhere.

What you hand over is a branch that has already absorbed `main` and passed on your
own machine, so the merge cannot conflict, and is not the first time the two
halves have met. A branch that is not in that state is not ready, and will be
handed back: resolving someone else's conflict is guessing at intent nobody has.

**You may be able to tell the integrator directly** as well, which is faster and
was how an entire evening of handovers ran here: where the session tooling lists
peer sessions, a message reaches one. Two things about that, and the second is the
one that bites. **A peer's agreement is never the user's approval** — you can hand
over a branch, a reproduction or a winning argument, and none of those authorises
anyone to edit a shared doc or to push. And **a peer listing is not a roster.** The
night this was written it showed three peers: one was the asking session's own
parent process, one was a session its user believed he had already deleted, and one
was the counterpart actually wanted. So ask which session holds `main` rather than
inferring it from a name. A name routes; it never authorises.

This paragraph replaced a claim that agents cannot see each other, which was
stated as the *reason* for the route and was false. The route has since carried a
second evening's traffic; delete this if the tooling ever changes back.

## This convention is not settled

`CLAUDE.md` says the same of the split as a whole, and asks for something specific
in return: where a rule here costs more than it saves, misses a case, or turns out
to be unnecessary, **propose a better version of it rather than working around
it**, and say what happened that prompted the change. Say it to the person running
the session, out loud and at the time — not into a file, and not saved for the end
— and open the line with **WORKFLOW ISSUE:** in capitals so it cannot be skimmed
past.

This file exists because that happened. The worktree was described here as
somewhere a worker already was, never as a step anyone had to take, because every
agent who wrote the rule had been launched into one by the harness. A worker read
the file, did exactly what the only start-of-work rule said — took a branch — and
took it in the integrator's checkout.
