// Throwaway screenshot harness. Not committed.
const { chromium } = require('./node_modules/playwright-core');

const url = process.argv[2];
const out = process.argv[3];
const variant = process.argv[4];   // button label to click first, or "-"
const flaps = Number(process.argv[5] || 0);

(async () => {
  const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1240, height: 980 }, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);
  if (variant && variant !== '-') {
    await p.click(`.vstrip button:text-is("${variant}")`);
  }
  for (let i = 0; i < flaps; i++) {
    await p.keyboard.press('Space');
    await p.waitForTimeout(340);
  }
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
