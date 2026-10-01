'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve(__dirname, '../.repair-backups/20261001/directory-ui-v2');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['tags/', 'tags/九虹重启/page/2/', 'light_withme/', 'light_withme/friend_lists/']) {
        assert.equal((await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' })).status(), 200);
        await page.locator('.content-directory').first().waitFor({ state: 'visible' });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${route} overflow`);
        assert.ok(!(await page.locator('.content-directory').first().innerText()).includes('未命名'), route);
        if (route === 'tags/') {
          assert.deepEqual(await page.locator('.directory-tag-group h2').allTextContents(), ['文化体系', '十二元素', '世界三元']);
          assert.deepEqual(await page.locator('.sidebar-tag-group h4').allTextContents(), ['体系', '元素', '三元']);
          assert.equal(await page.locator('.directory-tag-row').count(), 18);
          assert.equal(await page.locator('.directory-tag-card').count(), 18);
          assert.equal(await page.locator('.directory-tag-preview-link').count(), 36);
          assert.equal(new Set(await page.locator('.directory-tag-row').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fontSize))).size, 1);
        } else if (route.startsWith('tags/')) {
          assert.equal(await page.locator('.directory-tag-article').count(), 1);
          assert.equal(await page.locator('.directory-tag-number').innerText(), '11');
        } else {
          assert.equal(await page.locator('.directory-folder-section .directory-folder-section').count(), 0, 'profiles are not nested folders');
          const profile = page.locator('.directory-entry-link[href="/light_withme/friend_lists/mosae/"]');
          assert.match(await profile.innerText(), /墨薛的个人扩列条/);
          if (route.endsWith('friend_lists/')) assert.equal(await page.locator('.directory-entry-link').count(), 1);
        }
        if (width === 1440 || width === 390) await page.screenshot({ path: path.join(output, `${width}-final-${route.replaceAll('/', '-')}.png`), fullPage: true, animations: 'disabled' });
        console.log(`PASS: ${width} ${route}`);
      }
    }
    await page.locator('.directory-entry-link[href="/light_withme/friend_lists/mosae/"]').click();
    await page.waitForURL('**/friend_lists/mosae/');
    assert.match(await page.title(), /墨薛的个人扩列条/);
    console.log('PASS: 16 latest live preview checks and direct profile navigation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
