const { chromium } = require('playwright');
const [,, out, fps = '30', only] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: (process.env.VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }) });
  await p.goto('file://' + __dirname + '/scene.html' + (process.env.VERT ? '?v' : ''));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const F = +fps, times = only ? only.split(',').map(Number) : [...Array(20 * F).keys()].slice(+(process.env.FROM || 0)).map(i => i / F);
  let n = 0;
  for (const t of times) {
    await p.evaluate(t => render(t), t);
    await p.screenshot({ path: `${out}/${only ? 't' + t : String(n + +(process.env.FROM || 0)).padStart(4, '0')}.png` });
    n++;
  }
  await b.close();
})();
