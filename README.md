# gabe-sd.github.io

A small arcade of browser games, live at <https://gabe-sd.github.io/>.

Plain HTML, CSS and JavaScript. No build step, no framework, and nothing the
site needs installed — the files are served exactly as they are in this repo.
Open `index.html` and it works.

## Running it locally

```bash
npm run serve     # http.server on 8934
```

Then visit <http://localhost:8934>. A server is not strictly required, since
every path in the site is relative and `file://` works too, but serving it
matches how it is deployed.

## Tests

The only dependency in the repo is `playwright-core`, used by the tests and by
nothing else.

```bash
npm install     # once
npm test
```

The tests drive real pages in a real browser and assert on real game state.
`tests/README.md` covers what each one is for.

## Deploying

Pushing to `main` deploys. The repo name makes this a GitHub Pages *user* site,
so it serves from the domain root rather than a subpath.

## Working on it

`CLAUDE.md` has the conventions every game shares, and how several people work on
this at once without colliding — start there. Which of the two seats you are in
decides what else you read: `WORKER.md` builds one area in a worktree of its own,
`INTEGRATOR.md` holds `main` and does the merging, and they are different jobs. Everything specific to one game lives with that game: `games/<name>/DESIGN.md` for how it works and what must not be broken,
`games/<name>/TODO.md` for what is not done yet, in priority order. The root
`TODO.md` keeps what belongs to no single game.
