// Screenshot the live projects page for its link preview: node scripts/preview.js (needs playwright), then commit
// scripts/projects-preview.png.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light' });
  await p.goto('https://corey.sciu.to/projects/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'scripts/projects-preview.png' });
  await b.close();
})();
