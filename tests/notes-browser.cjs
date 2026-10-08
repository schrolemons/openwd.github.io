'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve('.repair-backups/20261001/note-ui');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    for (const width of [1440, 1092, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['light_withme/key_part/', 'posts/15.html', 'posts/18.html']) {
        assert.equal((await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' })).status(), 200);
        await page.waitForFunction(() => {
          const block = document.querySelector('.post-block');
          return block.classList.contains('animated') && Number(getComputedStyle(block).opacity) > .99;
        });
        await page.waitForFunction(() => { const body=document.querySelector('.post-body'); return body.classList.contains('animated') && Number(getComputedStyle(body).opacity) > .99; });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${route} overflow`);
        assert.equal(await page.locator('.book-mark-link').count(), 0, 'bookmark button is disabled');
        const frames = await page.locator('.reading-prose .note:not(details):not(.world-module-heading)').evaluateAll(nodes => nodes.map(node => {
          const style = getComputedStyle(node);
          return { file: node.classList.contains('world-file-note'), border: style.borderTopWidth, left: style.borderLeftWidth, radius: style.borderRadius, padding: style.padding, background: style.backgroundColor };
        }));
        for (const frame of frames) {
          assert.equal(frame.border, '1px', `${width} ${route} note outline`);
          assert.equal(frame.left, frame.file ? '1px' : '3px', `${width} ${route} file frame or note accent`);
          assert.equal(frame.radius, '8px', `${width} ${route} note corners`);
          assert.equal(frame.padding, width < 768 ? '16px' : '20px 24px', `${width} ${route} note spacing`);
        }
        if (route === 'light_withme/key_part/') {
          assert.equal(frames.length, 0, 'plan headings belong to their content module rather than a nested note frame');
          const headers=await page.locator('.world-layout-plan .world-module-heading h3').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).fontSize));
          assert.deepEqual(headers,Array(3).fill(width<768?'18px':'20px'),'parallel plan headings share typography');
          const caption = page.locator('.photos-item > p');
          const geometry = await caption.evaluate(node => {
            const note = document.querySelector('.reading-prose .note');
            return { alignment: getComputedStyle(node).textAlign, gap: note.getBoundingClientRect().top - node.getBoundingClientRect().bottom };
          });
          assert.equal(geometry.alignment, 'center');
          assert.ok(geometry.gap >= 20 && geometry.gap <= 85, `caption spacing: ${JSON.stringify(geometry)}`);
          const link = page.locator('.reading-prose a').filter({ hasText: '选择方式' });
          await link.hover();
          await page.waitForFunction(() => {
            const link = [...document.querySelectorAll('.reading-prose a')].find(node => node.textContent === '选择方式');
            const style = getComputedStyle(link);
            return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || (style.backgroundImage !== 'none' && style.backgroundSize === '100% 100%');
          });
          assert.equal(await link.evaluate(node => getComputedStyle(node, '::selection').color), 'rgb(23, 23, 23)', 'selected text remains readable on the gold highlight');
          if (width === 1092) {
            await page.addStyleTag({ content: '.fireworks, #__bs_notify__ { visibility: hidden !important; }' });
            await page.screenshot({ path: path.join(output, '1092-link-hover.png') });
          }
          await page.mouse.move(0, 0);
          await page.keyboard.press('Tab');
          await link.focus();
          assert.ok(await link.evaluate(node => node.matches(':focus-visible')));
          await page.waitForFunction(() => {
            const style = getComputedStyle(document.activeElement);
            return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || (style.backgroundImage !== 'none' && style.backgroundSize === '100% 100%');
          });
          await link.evaluate(node => node.blur());
          if (width === 1092 || width === 390) {
            await page.addStyleTag({ content: '.fireworks, #__bs_notify__ { visibility: hidden !important; }' });
            await page.locator('.photos-page').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
            await page.screenshot({ path: path.join(output, `${width}-cover-notes.png`) });
          }
        }
        console.log(`PASS ${width} ${route} ${frames.length} uniform notes`);
      }
    }
    console.log('PASS note frames, centred caption, compact spacing, link hover/focus and removed bookmark at four widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
