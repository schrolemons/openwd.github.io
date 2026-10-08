'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4010';
const output = path.resolve('.repair-backups/20261003/style-unification/standalone');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/menu/', '/light_withme/friend_lists/mosae/']) {
        assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
        await page.locator('.world-theme-toggle').waitFor();
        await page.locator(route.includes('mosae') ? '.cute-card' : '#starfield-toggle').first().waitFor();
        assert.equal(await page.locator('script[src="/js/world-theme.js"]').count(), 1);
        for (const mode of ['light', 'dark']) {
          await page.evaluate(dark => WorldTheme.set(dark), mode === 'dark');
          await page.waitForFunction(dark => {
            const surface = document.querySelector('.cute-card') || document.body;
            return getComputedStyle(surface).backgroundColor === (dark ? 'rgb(28, 28, 27)' : 'rgb(252, 251, 248)');
          }, mode === 'dark');
          const data = await page.evaluate(() => {
            const surface = document.querySelector('.cute-card') || document.body;
            return { overflow: document.documentElement.scrollWidth > innerWidth + 1, background: getComputedStyle(surface).backgroundColor,
              paper: getComputedStyle(document.documentElement).getPropertyValue('--world-paper').trim(), ink: getComputedStyle(surface).color,
              titleFill: document.querySelector('.cute-header') && getComputedStyle(document.querySelector('.cute-header')).webkitTextFillColor };
          });
          assert.equal(data.overflow, false, `${width} ${route}`);
          assert.ok(data.background !== 'rgba(0, 0, 0, 0)', `${route} themed surface`);
          if (mode === 'dark') assert.ok(data.background !== 'rgb(255, 255, 255)', route);
          if (data.titleFill) assert.ok(!data.titleFill.includes('0, 0, 0, 0'), 'profile heading remains visible');
          if (route === '/menu/') {
            assert.equal(await page.locator('#era-info-panel').evaluate(n => getComputedStyle(n).backgroundColor), mode === 'dark' ? 'rgb(28, 28, 27)' : 'rgb(252, 251, 248)', 'timeline reading panel follows common paper');
          }
          await page.addStyleTag({content:'#__bs_notify__,.pace {visibility:hidden !important}'});
          await page.screenshot({ path: path.join(output, `${width}-${mode}-${route.includes('mosae') ? 'profile' : 'timeline'}.png`) });
        }
        if (route.includes('mosae')) {
          const overlap=await page.evaluate(()=>{
            const mark=document.querySelector('.world-theme-toggle').getBoundingClientRect();
            return [...document.querySelectorAll('.scroll-button')].some(n=>{const box=n.getBoundingClientRect();return box.left<mark.right&&box.right>mark.left&&box.top<mark.bottom&&box.bottom>mark.top;});
          });
          assert.equal(overlap,false,'theme and scrolling controls remain distinct');
          await page.locator('#avatar-container').click();
          await page.waitForFunction(() => document.documentElement.dataset.worldTheme === 'light');
          assert.equal(await page.evaluate(() => localStorage.getItem('darkmode')), 'false');
          await page.locator('[onclick^="openHobbyModal"]').first().click();
          await page.locator('.hobby-modal').waitFor({ state: 'visible' });
          await page.locator('.world-theme-toggle').click();
          assert.equal(await page.locator('.hobby-modal').evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(28, 28, 27)');
          await page.locator('.hobby-modal-close').click();
          await page.locator('.hobby-modal').waitFor({ state: 'hidden' });
        } else {
          await page.locator('#starfield-toggle').click();
          await page.locator('#starfield-toggle').click();
          assert.ok(await page.locator('#bg-canvas').count(), 'timeline artwork retained');
        }
        console.log(`PASS ${width} ${route} both themes and original controls`);
      }
    }
    await page.goto(base + '/light_withme/operator/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => { const n=document.querySelector('.post-body'); return n.classList.contains('animated') && Number(getComputedStyle(n).opacity)>.99; });
    await page.locator('.world-theme-toggle').waitFor();
    await page.evaluate(() => WorldTheme.set(true));
    const frame = page.frames().find(frame => frame.url().includes('/friend_lists/mosae'));
    assert.ok(frame, 'original embedded profile exists');
    await frame.waitForFunction(() => document.documentElement.dataset.worldTheme === 'dark');
    const embed = page.locator('iframe[src*="friend_lists/mosae"]');
    const fold = page.locator('details').filter({has:embed});
    if (await fold.count() && !(await fold.evaluate(n => n.open))) await fold.locator('summary').click();
    await embed.scrollIntoViewIfNeeded();
    await frame.locator('.world-theme-toggle').click();
    await page.waitForFunction(() => document.documentElement.dataset.worldTheme === 'light');
    assert.deepEqual(errors, [], 'owned standalone scripts still execute without errors');
    console.log('PASS avatar, hobby dialog, timeline view, parent/iframe theme sync and no script errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
