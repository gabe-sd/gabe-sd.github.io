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

So an entry here names the branch it is cut from. Do not assume `main`:

```markdown
### <slug> — <one line saying what changes>

**Branch from:** <base branch>

What it covers, what it must not break, and anything already ruled out. Long
enough to start on without rediscovering the constraints.
```

---

**Nothing is open.** Work in flight lives on its integration branch, where the
entries for it are; this file on `main` carries the conventions and nothing else,
deliberately — `tests/docs-check.js` check 5 searches every ref for merge commits,
so an entry sitting here would be read as landed the moment its phase merged on
another branch, and would fail the suite on `main` in the middle of a project.
