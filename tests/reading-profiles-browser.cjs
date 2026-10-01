'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { readingProfile } = require('../lib/reading-profiles.cjs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8')).models;
const docs = [...db.Post, ...db.Page].filter(doc => /\.md$/.test(doc.source || ''));
const route = doc => doc.source.startsWith('_posts/') ? `posts/${doc.abbrlink}.html` : doc.path;
const examples = ['posts/21.html', 'posts/18.html', 'posts/15.html', 'posts/3.html', 'posts/10.html', 'posts/24.html', 'posts/25.html', 'posts/28.html', 'yinxing_world/nowadays/Connect.html', 'yinxing_world/character/mosae.html', 'light_withme/operator/', 'test-raw-html/'];
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve('.repair-backups/20261001/markdown-reading/screenshots');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    for (const width of [1440, 390, 768, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const targets = width === 1440 || width === 390 ? docs.map(route) : examples;
      for (const target of targets) {
        assert.equal((await page.goto(`${base}/${target}`, { waitUntil: 'domcontentloaded' })).status(), 200, target);
        await page.locator('.post-block').first().waitFor({ state: 'visible' });
        await page.waitForFunction(() => {
          const node = document.querySelector('.post-block');
          return node.classList.contains('animated') && Number(getComputedStyle(node).opacity) > .99;
        });
        const result = await page.evaluate(() => {
          const prose = document.querySelector('.reading-prose');
          return { width: document.documentElement.scrollWidth, style: document.querySelector('.reading-document')?.dataset.readingStyle,
            size: prose ? parseFloat(getComputedStyle(prose).fontSize) : null,
            columns: prose?.querySelector('.img-column') ? getComputedStyle(prose.querySelector('.img-column')).gridTemplateColumns.split(' ').length : null,
            headingCount: prose?.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
            calloutTitles: prose?.querySelectorAll('.reading-section-label').length };
        });
        assert.ok(result.width <= width + 1, `${width} ${target} horizontal overflow: ${JSON.stringify(result)}`);
        const doc = docs.find(doc => route(doc) === target || route(doc) === target + 'index.html');
        if (doc) assert.equal(result.style || null, readingProfile(doc)?.style || null, target);
        if (result.size) assert.ok(result.size >= 16 && result.size <= 18, `${width} ${target} font size ${result.size}`);
        if (result.columns) assert.equal(result.columns, width < 768 ? 1 : 3, target);
        if ((width === 1440 || width === 390) && (examples.includes(target) || ['index.html', 'about/index.html', 'yinxing_world/character/mosae.html', 'light_withme/operator/index.html'].includes(target))) {
          await page.addStyleTag({ content: '.fireworks, #__bs_notify__ { visibility: hidden !important; }' });
          await page.screenshot({ path: path.join(output, `${width}-${target.replaceAll('/', '-')}.png`) });
        }
        console.log(`PASS ${width} ${target}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/posts/15.html`, { waitUntil: 'domcontentloaded' });
    const fold = page.locator('.reading-prose details').first();
    if (await fold.count()) {
      await fold.locator('summary').click();
      assert.ok(await fold.evaluate(el => el.open));
      await fold.locator('summary').press('Enter');
      assert.ok(!(await fold.evaluate(el => el.open)));
    }
    await page.goto(`${base}/light_withme/operator/`, { waitUntil: 'domcontentloaded' });
    const embed = page.locator('.reading-prose iframe').first();
    assert.ok((await embed.getAttribute('src')).includes('friend_lists/mosae'));
    await page.goto(`${base}/posts/24.html`, { waitUntil: 'domcontentloaded' });
    const link = page.locator('.guide-contents a').first();
    await link.click();
    assert.ok((await page.url()).includes('#'));
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    assert.deepEqual(await page.locator('.world-home > *').evaluateAll(nodes => nodes.map(node => node.className)), ['home-hero', 'home-announcement', 'home-introduction', 'home-navigation']);
    assert.deepEqual(await page.locator('.home-motif span').allTextContents(), ['感知', '创造', '记录']);
    console.log('PASS 124 page/viewport checks plus disclosure, embeds, guide links and homepage order.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
