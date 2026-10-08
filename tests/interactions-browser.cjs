'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve('.repair-backups/20261003/home-refinement');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    const visit = async route => {
      assert.equal((await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => {
        const block = document.querySelector('.post-block');
        return block.classList.contains('animated') && Number(getComputedStyle(block).opacity) > .99;
      });
      await page.waitForFunction(() => [...document.querySelectorAll('.post-body,.post-header')].every(n=>n.classList.contains('animated') && Number(getComputedStyle(n).opacity)>.99));
    };
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await visit('light_withme/key_part/');
      const link = page.locator('.reading-prose a').filter({ hasText: '选择方式' });
      const href = await link.getAttribute('href');
      await link.hover();
      await page.waitForFunction(() => {
        const node = [...document.querySelectorAll('.reading-prose a')].find(node => node.textContent === '选择方式');
        return getComputedStyle(node).backgroundSize === '100% 100%';
      });
      await page.addStyleTag({ content: '.fireworks, #__bs_notify__ { visibility: hidden !important; }' });
      await page.screenshot({ path: path.join(output, `${width}-text-hover.png`) });
      await link.click();
      await page.waitForURL(new URL(href, `${base}/light_withme/key_part/`).href);
      await visit('bingjie_domain/');
      const qr = page.locator('.directory-qr-trigger');
      const originalQr = await qr.getAttribute('data-qr-src');
      await qr.hover();
      await qr.click();
      const dialog = page.locator('.directory-qr-dialog');
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await dialog.locator('img').getAttribute('src'), originalQr);
      await dialog.locator('.directory-qr-close').click();
      await dialog.waitFor({ state: 'hidden' });
      assert.ok(await qr.evaluate(node => node === document.activeElement));
      await visit('yinxing_world/commission/mosae.html');
      const action = page.locator('#btn1-1');
      const actionBackground = await action.evaluate(n=>getComputedStyle(n).backgroundColor);
      await action.hover();
      await page.waitForFunction(before => getComputedStyle(document.querySelector('#btn1-1')).backgroundColor !== before, actionBackground);
      assert.equal(await action.evaluate(n=>getComputedStyle(n).backgroundImage),'none');
      await action.click();
      await page.locator('.swal-overlay--show-modal').waitFor({ state: 'visible' });
      assert.ok((await page.locator('.swal-modal').textContent()).includes('You clicked the button!'));
      await page.locator('.swal-button').click();
      await page.locator('.swal-overlay--show-modal').waitFor({ state: 'detached' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      console.log(`PASS ${width}: text highlight/click, QR open/close/focus and original article button/popup`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await visit('tags/');
    const tag = page.locator('.sidebar-tag-link').first();
    const before = await tag.boundingBox();
    await tag.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar-tag-link')).backgroundColor !== 'rgba(0, 0, 0, 0)');
    const after = await tag.boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(after[key] - before[key]) < .1, 'tag cluster positions remain stable');
    assert.equal(await tag.evaluate(node => getComputedStyle(node).transform), 'none');
    await page.keyboard.press('Tab');
    await tag.focus();
    assert.equal(await tag.evaluate(node => getComputedStyle(node).outlineColor), 'rgb(255, 215, 0)');
    const destination = await tag.getAttribute('href');
    await tag.press('Enter');
    await page.waitForURL(new URL(destination, base).href);
    assert.ok(await page.locator('.directory-tag-article').count());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit('bingjie_domain/');
    await page.locator('.directory-qr-trigger').hover();
    assert.equal(await page.locator('.directory-qr-trigger').evaluate(node => getComputedStyle(node).transform), 'none');
    assert.equal(await page.locator('.directory-qr-trigger').evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    console.log('PASS stable coloured tags, keyboard navigation and reduced motion.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
