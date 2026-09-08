# The preview gallery

Thirteen complete visual directions for the site, built so a whole look could be
judged by looking at it rather than described. **None of this is the site**, and
none of its markup is to be ported — the chosen direction gets rebuilt properly
into `shared.css`, `hub.css` and the hub's own `index.html`.

Open `index.html`. No server, no build, no install: every path is relative and
VT323 is read from `../../assets/fonts/`, so double-clicking the file works.
Nine of the thirteen also pull a non-VT323 face from Google Fonts and lose their
typeface offline; the four that do not are Cold Terminal, Amber Monitor, **Amber
Arcade** and Cold Terminal Mk II.

`design/previews/` is where a direction is *edited*.
`design/archive/2026-09-04-retro-interface-directions.html` is where the round is
*kept* — one file with every stylesheet, the gallery and all twenty-nine
typefaces embedded, so it needs no network and nothing beside it. Hand anyone
that single path and they see what is here.

## What is decided

**Amber Arcade** (`design/previews/variants/amberlit.css`), chosen by Gabriel on
2026-09-06. The
palette, the guest hues, the eight Minesweeper numbers and the token mapping are
written out as values in `design/DESIGN.md`; read that rather than reverse
engineering the stylesheet. What is still open, and what has to be asked before
`shared.css` is touched, is in `design/TODO.md`.

## This folder is temporary; the archive is not

It stays while it is in use — it serves the preview and the build reads its
values — and is **deleted once the redesign is finished**. At that point it is
thirteen directions of a decision already made, and nothing is lost: the archive
carries all of them and git history carries the source. See `design/TODO.md`
under `redesign-tokens-hub` for the full reasoning, including why deleting it
would have been wrong before the archive's fonts were embedded.

A later round of directions builds a new gallery and a new dated archive rather
than resurrecting this one.

## How it is put together

`index.html` links `gallery.css` and then every `variants/<id>.css`, and loads
`gallery.js`, which holds all the content and structure. Every direction gets
identical markup and identical copy — only its stylesheet differs, which is the
point: what is being compared is the design, not the words.

Two things in `gallery.js` are worth knowing before editing it. The order
`index.html` links the variants is the only place the gallery's order is written
down, and the archive build reads it from there. And a variant's `crt` field is
its *current* texture setting, which the caption buttons write to — whether a
direction has texture at all is `hasCrt`, captured once from the authored value.
Gating anything on `crt` instead is what made choosing "none" delete the control.
