'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve(process.env.HOME_PREVIEW_OUTPUT || '.repair-backups/20261009/recent-updates');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    await context.route('**/browser-sync/**', route => route.abort());
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    const sheets = '.home-announcement, .home-recent-updates, .home-introduction, .home-navigation';
    const open = async () => {
      await page.locator('.home-envelope-open').click();
      await page.waitForFunction(() => document.querySelector('.world-home').classList.contains('is-letter-expanded'));
    };
    for (const theme of ['light', 'dark']) {
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.WorldTheme && document.querySelector('.home-mail-scene')?.dataset.progress === '0.00000');
        await page.evaluate(dark => WorldTheme.set(dark), theme === 'dark');
        assert.equal(await page.locator('.home-recent-updates').evaluate(node => node.inert), true, 'new sheet is concealed and inert');
        await open();
        assert.ok(await page.locator(sheets).evaluateAll(nodes => nodes.length === 4 && nodes.every(node => !node.inert && getComputedStyle(node).clipPath === 'none')));
        assert.equal(await page.locator('.home-update-link').count(), 3);
        const entries = await page.locator('.home-update-link').evaluateAll(nodes => nodes.map(node => {
          const box = node.getBoundingClientRect();
          const title = node.querySelector('h3');
          const summary = node.querySelector('p');
          return { x: box.x, right: box.right, width: box.width, title: title.textContent, titleBox: title.getBoundingClientRect().right, metaOffset: Math.abs(node.querySelector('.home-update-meta').firstElementChild.getBoundingClientRect().left - title.getBoundingClientRect().left), overflow: title.scrollWidth > title.clientWidth + 1, summary: summary?.textContent, summaryHeight: summary?.getBoundingClientRect().height, lineHeight: summary ? parseFloat(getComputedStyle(summary).lineHeight) : 0, color: getComputedStyle(title).color, paper: getComputedStyle(node.closest('section')).backgroundColor };
        }));
        for (const item of entries) {
          assert.ok(item.x >= 0 && item.right <= width, `${theme}/${width}: row within viewport`);
          assert.ok(item.title && item.summary && !item.overflow, 'full title and original excerpt are available');
          assert.ok(item.metaOffset < 1, 'metadata and title share a left baseline');
          assert.ok(item.summaryHeight <= item.lineHeight * 2 + 1, 'excerpt occupies at most two lines');
          assert.notEqual(item.color, item.paper, 'theme provides distinct ink and paper');
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const first = page.locator('.home-update-link').first();
        await first.hover();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.home-update-link')).backgroundColor !== 'rgba(0, 0, 0, 0)');
        await page.mouse.move(0, 0);
        await page.keyboard.press('Tab');
        await first.focus();
        assert.ok(await first.evaluate(node => node.matches(':focus-visible') && getComputedStyle(node).outlineStyle !== 'none'));
        await page.addStyleTag({ content: '.fireworks, .pace { visibility: hidden !important; }' });
        await page.locator('.home-recent-updates').screenshot({ path: path.join(output, `${theme}-${width}-recent-updates.png`) });
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForFunction(() => document.querySelector('.home-mail-scene').dataset.progress === '0.00000');
        assert.ok(await page.locator(sheets).evaluateAll(nodes => nodes.every(node => node.inert && getComputedStyle(node).clipPath.includes('100%'))), 'all four sheets rewind into the envelope');
        console.log(`PASS ${theme}/${width}: four sheets, three previews, hover/focus, rewind, no overflow`);
      }
    }
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await open();
    const urls = await page.locator('.home-update-link').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const url of urls) {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await open();
      await page.locator(`.home-update-link[href="${url}"]`).click();
      await page.waitForURL(`${base}${url}`);
      assert.ok(await page.locator('.post-body').count(), 'opens the authored content page');
    }
    await page.goto(`${base}/#最近更新`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.home-recent-updates').evaluate(node => node.inert), false);
    assert.equal(await page.locator('.world-home').evaluate(node => node.classList.contains('is-scroll-letter')), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    assert.ok(await page.locator(sheets).evaluateAll(nodes => nodes.every(node => !node.inert && getComputedStyle(node).clipPath === 'none')));
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const plainPage = await plain.newPage();
    await plainPage.goto(base, { waitUntil: 'domcontentloaded' });
    assert.equal(await plainPage.locator('.home-update-link').count(), 3);
    assert.ok(await plainPage.locator(sheets).evaluateAll(nodes => nodes.every(node => getComputedStyle(node).clipPath === 'none')));
    await plain.close();
    console.log('PASS three article clicks, latest-updates deep link, reduced motion and no-JS');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
