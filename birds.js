// Throwaway: crop the new bird designs, glows and score icons. Not committed.
const { chromium } = require('./node_modules/playwright-core');
const W = '/home/g/git/gabe-sd.github.io/.claude/worktrees/redesign-flappy-bird';

(async () => {
  const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 }, deviceScaleFactor: 4 });
  await p.goto('http://localhost:45791/games/flappy-bird/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);

  for (const [style, hue, glow] of [['wire', 'rose', 0], ['wire', 'cyan', 0],
                                    ['round', 'rose', 22], ['wire', 'fern', 10],
                                    ['glider', 'lime', 22], ['round', 'cyan', 22]]) {
    await p.evaluate(([s, h, g]) => {
      birdStyle = s; birdHue = h; birdGlow = g;
      phase = 'play'; bird = { y: 200, vy: 2 }; pipes = [];
      draw();
    }, [style, hue, glow]);
    const box = await p.locator('#board').boundingBox();
    await p.screenshot({
      path: `${W}/bird-${style}-${hue}-${glow}.png`,
      clip: { x: box.x + 76, y: box.y + 186, width: 52, height: 52 },
    });
  }

  // Every score icon in one row, at the size the HUD uses.
  await p.evaluate(() => {
    document.querySelector('.hud').dataset.hud = 'icons';
    const row = document.createElement('div');
    row.id = 'iconrow';
    row.style.cssText = 'display:flex;gap:18px;padding:8px 12px;color:var(--p-amber)';
    row.innerHTML = Object.values(SCORE_GLYPHS)
      .map((g) => `<span style="width:32px;height:32px;display:block">${g}</span>`).join('');
    document.querySelector('.game-in').prepend(row);
    row.querySelectorAll('svg').forEach((s) => { s.style.width = '32px'; s.style.height = '32px'; });
  });
  await p.locator('#iconrow').screenshot({ path: `${W}/icons-row.png` });

  await b.close();
})();
