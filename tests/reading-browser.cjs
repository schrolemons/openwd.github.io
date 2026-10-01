'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve('.repair-backups/20261001/reading-ui');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    const screenshot = async options => {
      // Suppress only the transient click fireworks and development overlay in captures.
      await page.addStyleTag({ content: '.fireworks, #__bs_notify__ { visibility: hidden !important; }' });
      await page.screenshot(options);
    };
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['', 'posts/24.html', 'light_withme/', 'posts/28.html']) {
        assert.equal((await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' })).status(), 200);
        const main = page.locator(route === '' ? '.world-home' : route === 'posts/24.html' ? '.world-reading-guide' : '.content-directory').first();
        await main.waitFor({ state: 'visible' });
        await page.waitForFunction(() => {
          const node = document.querySelector('.post-block');
          return node.classList.contains('animated') && Number(getComputedStyle(node).opacity) > .99;
        });
        await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${route} overflow`);
        if (route === '') {
          assert.deepEqual(await page.locator('.world-home > *').evaluateAll(nodes => nodes.map(node => node.className)), ['home-hero', 'home-announcement', 'home-introduction', 'home-navigation']);
          assert.deepEqual(await page.locator('.home-motif span').allTextContents(), ['感知', '创造', '记录']);
          assert.equal(await page.locator('.home-title-world').innerText(), 'WORLD');
          assert.ok(await page.locator('.home-route').evaluateAll(nodes => nodes.every(node => {
            const style = getComputedStyle(node);
            return style.backgroundImage === 'none' && style.borderRadius === '0px';
          })), 'the final navigation is an open index rather than another hero card');
          assert.ok(await page.locator('.home-endnote').isVisible());
          assert.equal(await page.locator('.home-route').count(), 4);
          const columns = await page.locator('.home-route-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
          assert.equal(columns, width < 768 ? 1 : 2);
          if (width === 1440 || width === 390) await screenshot({ path: path.join(output, `${width}-home.png`), fullPage: true });
          await page.locator('.home-hero-actions a').first().click();
          await page.waitForURL('**/posts/24.html');
          assert.equal(await page.locator('.world-reading-guide').count(), 1);
        } else if (route === 'posts/24.html') {
          assert.equal(await page.locator('.guide-era').count(), 13);
          assert.equal(await page.locator('.guide-article').count(), 30);
          assert.ok(await page.locator('.guide-overview').first().isVisible());
          assert.equal(await page.locator('.guide-reading-rule strong').innerText(), '【时间线顺序】');
          assert.equal(await page.locator('.guide-world-definition strong').innerText(), '第九边缘宇宙');
          const choices = page.locator('.guide-choice-content');
          assert.equal(await choices.count(), 10);
          const colours = await choices.evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node.querySelector('.guide-content-type')).color))]);
          assert.ok(colours.length >= 3, 'content types have visibly distinct colours');
          assert.ok(await choices.evaluateAll(nodes => nodes.every(node => {
            const style = getComputedStyle(node);
            return style.backgroundImage === 'none' && style.borderLeftWidth === '0px' && style.borderRadius === '0px';
          })), 'choice content uses lightweight links rather than nested callout cards');
          if (width === 1440 || width === 390) {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await screenshot({ path: path.join(output, `${width}-guide-preface.png`) });
            await page.locator('.guide-era-events.has-branches').first().scrollIntoViewIfNeeded();
            await screenshot({ path: path.join(output, `${width}-guide-content-markers.png`) });
          }
          const choice = page.locator('.guide-choice-content[href]').last();
          await choice.focus();
          const destination = await choice.getAttribute('href');
          await choice.press('Enter');
          assert.equal(decodeURIComponent(new URL(page.url()).hash), destination);
          const details = page.locator('.guide-detail').first();
          await details.locator('summary').click();
          assert.ok(await details.evaluate(el => el.open));
          assert.ok(await details.locator('.guide-metadata').isVisible());
          if (width === 1440 || width === 390) await screenshot({ path: path.join(output, `${width}-guide-open.png`) });
          await details.locator('summary').press('Enter');
          assert.ok(!(await details.evaluate(el => el.open)));
          await page.locator('.guide-era-nav a').nth(8).click();
          const target = page.locator('.guide-era-header h2').nth(8);
          await page.waitForFunction(id => {
            const top = document.getElementById(id).getBoundingClientRect().top;
            return top >= 0 && top < 100;
          }, await target.getAttribute('id'));
          if (width === 1440 || width === 390) await screenshot({ path: path.join(output, `${width}-guide-branches.png`) });
          await page.locator('.guide-article h3 a:not(.headerlink)').nth(0).click();
          await page.waitForURL('**/posts/21.html');
          await page.locator('.post-body').waitFor({ state: 'visible' });
          assert.ok(await page.locator('.post-body').innerText());
        } else if (route === 'light_withme/') {
          assert.equal(await page.locator('.directory-folder-card').count(), 3);
          assert.ok(!(await page.locator('.directory-folder-title').allTextContents()).join('').includes('扩列'));
        } else {
          assert.ok(!(await page.locator('.collection-navigation').innerText()).includes('扩列'));
        }
        console.log(`PASS ${width} /${route}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/posts/24.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.world-reading-guide').waitFor({ state: 'visible' });
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.post-block')).opacity) > .99);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await screenshot({ path: path.join(output, '1440-guide-top.png') });
    console.log('PASS 16 page/viewport checks, reading routes, disclosure keyboard and era anchors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
