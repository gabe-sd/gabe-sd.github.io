# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

## Minesweeper: a way to clear the best time

There is no way to reset a personal best short of opening devtools and clearing
`localStorage`, so a stray record — a test win, a fluke, someone else's go on
your machine — sticks permanently and nothing can beat it.

Add a control that clears the stored record and resets the HUD to `🏆 —`.

- The value lives under a single key, `minesweeper.bestTime.9x9-10`, built from
  `SIZE` and `MINE_COUNT` in `games/minesweeper/script.js`.
- Clear it with `localStorage.removeItem(...)` **wrapped in try/catch**, the same
  as `loadBestTime`/`saveBestTime`. Storage throws rather than returning null when
  it is unavailable (private windows, blocked site data, `file://` in some
  browsers), and an unguarded call takes the page down.
- Call `renderBestTime()` afterwards so the HUD updates without a reload.
- Worth a confirmation step, since a misclick would destroy a real record with no
  undo.
- Where it goes is a UI question: it only makes sense once a record exists, so it
  probably belongs in the instructions panel or behind the trophy, not as a fourth
  button competing with Restart.
- Add a case to `tests/best-time.test.js` covering both the clear and the
  storage-unavailable path.

## Minesweeper: remember the instructions panel state

The How to play panel resets to closed on every reload, so anyone who wants it
open has to reopen it every visit.

Persist the open/closed state and restore it on load. Same storage caveat as
above — wrap the access, and treat "cannot read" as the default (closed) rather
than letting it throw. Keep the key namespaced alongside the best time.
