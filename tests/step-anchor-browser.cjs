'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve('.repair-backups/20261004/article-refinement/qa');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('**/browser-sync/**', r => r.abort());
    await context.addInitScript(() => { sessionStorage.isPopupWindow = '1'; localStorage.darkmode = 'false'; });
    const page = await context.newPage();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const id of [28, 26, 27]) {
        await page.goto(base + `/posts/${id}.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof WorldTheme !== 'undefined' && [...document.querySelectorAll('.post-block,.post-body')].every(n => n.classList.contains('animated') && Number(getComputedStyle(n).opacity) > .99));
        for (const dark of [false, true]) {
          await page.evaluate(value => WorldTheme.set(value), dark);
          const titles = page.locator('.world-content-step > h5:has(> .headerlink)');
          assert.ok(await titles.count() > 0);
          for (let index = 0; index < await titles.count(); index++) {
            const title = titles.nth(index);
            await title.hover();
            const metric = await title.evaluate(h => {
              const a = h.querySelector('.headerlink'), box = a.getBoundingClientRect(), row = h.getBoundingClientRect();
              return { title: h.textContent.trim(), delta: Math.abs(box.top + box.height / 2 - row.top - row.height / 2), gap: row.left - box.right, left: box.left };
            });
            assert.ok(metric.delta < .5, `anchor centre: ${JSON.stringify(metric)}`);
            assert.ok(metric.gap >= 1, `anchor overlaps number: ${JSON.stringify(metric)}`);
            assert.ok(metric.left >= 0, `anchor outside viewport: ${JSON.stringify(metric)}`);
            await title.locator('.headerlink').focus();
            assert.ok(await title.locator('.headerlink').evaluate(a => !!document.getElementById(decodeURIComponent(a.hash.slice(1)))), 'original anchor target exists');
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          if (id === 28 && width !== 320) {
            await titles.nth(2).hover();
            await page.locator('.world-content-section').first().screenshot({ path: path.join(output, `anchors-${width}-${dark ? 'dark' : 'light'}.png`) });
          }
          console.log(`${id} / ${width}px / ${dark ? 'dark' : 'light'}: anchor centres, number gap, focus targets and overflow passed`);
        }
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
