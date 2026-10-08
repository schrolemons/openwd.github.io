'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4012';
const models = JSON.parse(fs.readFileSync('db.json', 'utf8')).models;
const documents = [...models.Post, ...models.Page].filter(n => /\.md$/.test(n.source || '') && /<hr\b/.test(n.content || ''));
const output = path.resolve('.repair-backups/20261004/prose-ui/previews');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    await Promise.all([1440, 390].map(async width => {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await context.route('**/browser-sync/**', r => r.abort());
      await context.addInitScript(() => { sessionStorage.isPopupWindow = '1'; localStorage.darkmode = 'false'; });
      const page = await context.newPage();
      await page.goto(base + '/archives/', { waitUntil: 'domcontentloaded' });
      const reference = await page.locator('.directory-tree > .directory-section').first().evaluate(n => parseFloat(getComputedStyle(n).marginBottom));
      assert.equal(reference, width < 768 ? 24 : 34);
      let count = 0;
      for (const document of documents) {
        const route = document.source.startsWith('_posts/') ? 'posts/' + document.abbrlink + '.html' : document.path;
        await page.goto(base + '/' + route, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof WorldTheme !== 'undefined');
        for (const dark of [false, true]) {
          await page.evaluate(d => WorldTheme.set(d), dark);
          const breaks = await page.locator('.post-body hr').evaluateAll(nodes => nodes.map(n => {
            const s = getComputedStyle(n);
            return { height: n.getBoundingClientRect().height, border: s.borderTopWidth, background: s.backgroundColor, before: getComputedStyle(n, '::before').display, after: getComputedStyle(n, '::after').display, margin: [s.marginTop, s.marginBottom] };
          }));
          for (const n of breaks) {
            assert.equal(n.border, '0px', document.source);
            assert.equal(n.background, 'rgba(0, 0, 0, 0)', document.source);
            assert.equal(n.before, 'none', document.source);
            assert.equal(n.after, 'none', document.source);
            assert.deepEqual(n.margin, ['0px', '0px'], document.source);
            if (n.height) assert.equal(n.height, reference, document.source);
          }
          if (!dark) count += breaks.length;
        }
      }
      await page.goto(base + '/posts/27.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => [...document.querySelectorAll('.post-block,.post-body')].every(n => n.classList.contains('animated') && Number(getComputedStyle(n).opacity) > .99));
      for (const dark of [false, true]) {
        await page.evaluate(d => WorldTheme.set(d), dark);
        const gaps = await page.locator('.reading-prose > hr.world-section-break').evaluateAll(ns => ns.map(n => n.nextElementSibling.getBoundingClientRect().top - n.previousElementSibling.getBoundingClientRect().bottom));
        assert.equal(gaps.length, 3);
        gaps.forEach(gap => assert.ok(Math.abs(gap - reference) < 1, `${width}/${dark}: chapter gap ${gap}, overview ${reference}`));
        const separator = page.locator('.reading-prose > hr.world-section-break').first();
        await separator.scrollIntoViewIfNeeded();
        const rect = await separator.boundingBox();
        await page.screenshot({ path: path.join(output, `separator-${width}-${dark ? 'dark' : 'light'}.png`), clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y - 90), width: rect.width, height: 220 } });
      }
      await page.goto(base + '/menu/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof openArticleReader === 'function');
      await page.evaluate(() => openArticleReader('/posts/27.html', '灵耀体系：阴行世界'));
      await page.locator('.menu-article-body .world-content-section').first().waitFor();
      for (const dark of [false, true]) {
        await page.evaluate(d => WorldTheme.set(d), dark);
        const gaps = await page.locator('.menu-article-body > hr').evaluateAll(ns => ns.map(n => ({ gap: n.nextElementSibling.getBoundingClientRect().top - n.previousElementSibling.getBoundingClientRect().bottom, border: getComputedStyle(n).borderTopWidth })));
        assert.equal(gaps.length, 3);
        gaps.forEach(n => { assert.equal(n.border, '0px'); assert.ok(Math.abs(n.gap - reference) < 1); });
      }
      console.log(`PASS ${width}: ${count} Markdown separators in ${documents.length} pages, article and menu chapter gaps match overview ${reference}px in both themes`);
      await context.close();
    }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
