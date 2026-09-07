// Tap-to-arm-then-play: the tile itself is the control, no separate button
// and no info panel. Tiles stay real <a href="games/..."> links — see
// tests/contract.test.js, which finds every game from that attribute — and
// the arm/play behavior is layered on top of ordinary link navigation rather
// than replacing it: an armed tile's second click is never intercepted, so it
// navigates exactly the way a plain link would.

function deselect(tile) {
  tile.classList.remove("selected");
}

document.querySelectorAll(".tile").forEach(function (tile) {
  tile.addEventListener("click", function (e) {
    if (tile.classList.contains("selected")) {
      return;
    }
    e.preventDefault();
    document.querySelectorAll(".tile.selected").forEach(deselect);
    tile.classList.add("selected");
  });
});
