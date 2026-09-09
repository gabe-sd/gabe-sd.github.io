// Throwaway: crop the bird at 4x for each design and hue. Not committed.
const { chromium } = require('./node_modules/playwright-core');

(async () => {
  const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1240, height: 1100 }, deviceScaleFactor: 4 });
  await p.goto('http://localhost:45791/games/flappy-bird/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);

  for (const [style, hue] of [['round', 'rose'], ['glider', 'rose'], ['fowl', 'rose'],
                              ['fowl', 'amber'], ['round', 'lime'], ['round', 'cyan']]) {
    await p.evaluate(([s, h]) => {
      birdStyle = s; birdHue = h;
      phase = 'play'; bird = { y: 200, vy: 2 }; pipes = [];
      draw();
    }, [style, hue]);
    const box = await p.locator('#board').boundingBox();
    await p.screenshot({
      path: `/home/g/git/gabe-sd.github.io/.claude/worktrees/redesign-flappy-bird/bird-${style}-${hue}.png`,
      clip: { x: box.x + 78, y: box.y + 188, width: 48, height: 48 },
    });
  }
  await b.close();
})();
