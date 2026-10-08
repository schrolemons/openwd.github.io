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
    await context.route('**/browser-sync/**', route => route.abort());
    await context.addInitScript(() => { sessionStorage.isPopupWindow = '1'; localStorage.darkmode = 'false'; });
    const page = await context.newPage();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + '/archives/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof WorldTheme !== 'undefined');
      for (const dark of [false, true]) {
        await page.evaluate(value => WorldTheme.set(value), dark);
        const titles = page.locator('.directory-entry-link[href^="/posts/"]');
        assert.ok(await titles.count() > 20);
        for (let index = 0; index < await titles.count(); index++) {
          const link = titles.nth(index);
          const expected = await link.evaluate(n => {
            const probe = document.createElement('i');
            probe.style.color = 'var(--directory-accent)';
            n.closest('.directory-section').append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
          });
          await link.hover();
          await page.waitForTimeout(220);
          assert.equal(await link.evaluate(n => getComputedStyle(n).color), expected, `hover ${await link.textContent()}`);
          await link.focus();
          await page.mouse.move(0, 0);
          await page.waitForTimeout(220);
          assert.equal(await link.evaluate(n => getComputedStyle(n).color), expected, `focus ${await link.textContent()}`);
        }
        console.log(`overview ${width}px ${dark ? 'dark' : 'light'}: all article hover/focus colours inherit their block`);
      }
      for (const [id, headings] of [
        [28, ['测试题部分', '协作者档案', '发行计划']],
        [26, ['发展历程', '欢迎访问', '世界观特征', '文章属性划分', '设定集说明']]
      ]) {
        await page.goto(base + `/posts/${id}.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof WorldTheme !== 'undefined' && [...document.querySelectorAll('.post-block,.post-body')].every(n => n.classList.contains('animated') && Number(getComputedStyle(n).opacity) > .99));
        for (const dark of [false, true]) {
          await page.evaluate(value => WorldTheme.set(value), dark);
          const result = await page.locator('.reading-prose').evaluate(n => ({
            headings: [...n.querySelectorAll('.world-content-section > h2')].map(h => h.textContent.trim()),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            excess: [...n.querySelectorAll('.world-content-section,.world-content-panel,.world-content-grid,.note')].filter(e => e.scrollWidth > e.clientWidth + 2).map(e => e.className),
            columns: [...n.querySelectorAll('.world-content-grid[data-layout="columns"]')].map(e => getComputedStyle(e).gridTemplateColumns.split(' ').length),
            rawTags: n.textContent.includes('{%'),
            links: [...n.querySelectorAll('a:not(.headerlink)')].map(a => a.getAttribute('href'))
          }));
          assert.deepEqual(result.headings, headings);
          assert.equal(result.overflow, false);
          assert.deepEqual(result.excess, []);
          assert.equal(result.rawTags, false);
          assert.ok(result.columns.every(n => n === (width < 768 ? 1 : 2)));
          if (id === 28) assert.deepEqual(result.links, ['https://zero.sch-nie.com/SCHNIE_test/', 'https://world.sch-nie.com/light_withme/operator', 'https://world.sch-nie.com/light_withme/key_part']);
          else assert.ok(result.links.includes('https://zero.sch-nie.com/core/'));
          if (width !== 320) await page.screenshot({ path: path.join(output, `${id}-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
          console.log(`article ${id} ${width}px ${dark ? 'dark' : 'light'}: headings, links, responsive layout and overflow passed`);
        }
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
