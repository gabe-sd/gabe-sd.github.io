# TODO

Known gaps and unscheduled work. Not a changelog — anything done and merged
belongs in git history, not here, so delete entries as they land.

Keep entries actionable: enough context to start without rediscovering the
constraints, including whatever was non-obvious the first time round.

## Minesweeper: remember the instructions panel state

The How to play panel resets to closed on every reload, so anyone who wants it
open has to reopen it every visit.

Persist the open/closed state and restore it on load. Same storage caveat as the
best time — wrap every access in try/catch, since localStorage throws rather than
returning null when it is unavailable, and treat "cannot read" as the default
(closed) rather than letting it throw. Keep the key namespaced alongside the best
time.

## Reaction time test game

## Chimp memory test game (see human benchmark site)

## Improve pong game

## Improve site design and visual appeal

## Plan and architect a backend for stored values e.g. highscore table


