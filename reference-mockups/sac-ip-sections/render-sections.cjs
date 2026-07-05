const { chromium } = require('C:/Users/zhuzhenyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

(async () => {
  const root = path.resolve('.');
  mkdirSync(root, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:4177/index.html', { waitUntil: 'domcontentloaded' });

  const names = ['hero', 'public-archive', 'private-studio', 'profile-system', 'thought-flow', 'closing-cta'];

  for (let i = 1; i <= 6; i += 1) {
    const id = `section-${String(i).padStart(2, '0')}`;
    await page.evaluate((sectionId) => {
      const element = document.getElementById(sectionId);
      window.scrollTo({ top: element ? element.offsetTop : 0, left: 0, behavior: 'instant' });
    }, id);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(root, `${String(i).padStart(2, '0')}-${names[i - 1]}.png`),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
  }

  await browser.close();
})();
