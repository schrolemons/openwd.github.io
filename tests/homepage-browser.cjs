'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4000';
const output = path.resolve(process.env.HOME_PREVIEW_OUTPUT || '.repair-backups/20261003/home-refinement');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const welcome = page.locator('.swal-modal');
    await welcome.waitFor({ state: 'visible' });
    assert.equal(await welcome.locator('.swal-button').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 215, 0)');
    await welcome.locator('.swal-button').click();
    await page.locator('.swal-overlay--show-modal').waitFor({ state: 'detached' });
    const openLetters = async () => {
      if (!(await page.locator('.world-home').evaluate(node => node.classList.contains('is-letter-expanded')))) await page.locator('.home-envelope-open').click();
      try {
        await page.waitForFunction(() => document.querySelector('.world-home').classList.contains('is-letter-expanded'));
      } catch (error) {
        console.log('Unfolding state:', await page.evaluate(() => ({ scroll: scrollY, hash: location.hash, scene: {...document.querySelector('.home-mail-scene').dataset}, root: document.querySelector('.world-home').className, height: document.querySelector('.world-home').offsetHeight })));
        throw error;
      }
    };
    const originalOrder = ['home-hero', 'home-announcement', 'home-introduction', 'home-navigation'];
    for (const width of [1440, 1280, 1092, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 768 ? 900 : 1000 });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const block = document.querySelector('.post-block');
        return block.classList.contains('animated') && Number(getComputedStyle(block).opacity) > .99;
      });
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.home-hero p')).opacity) > .99);
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => Number(document.querySelector('.home-mail-scene').dataset.progress) === 0);
      assert.equal(await page.locator('.home-envelope-open').textContent(), '向下滚动');
      assert.equal(await page.locator('.home-envelope-open').evaluate(node => getComputedStyle(node).animationName), 'home-scroll-hint');
      assert.ok(await page.locator('.home-mail-scene').evaluate(node => Number(node.dataset.scrollDistance) <= 320), 'short unfolding distance');
      if (width >= 1100) {
        const tops = await page.evaluate(() => ({ cover: document.querySelector('.home-hero').getBoundingClientRect().top, menu: document.querySelector('.header').getBoundingClientRect().top }));
        assert.ok(Math.abs(tops.cover - tops.menu) < 2, 'cover aligns with the sidebar navigation');
      }
      assert.equal(await page.locator('.home-envelope-peeks > span').count(), 3);
      assert.ok(await page.locator('.home-envelope-peeks').isVisible());
      assert.ok(await page.locator('.home-announcement, .home-introduction, .home-navigation').evaluateAll(nodes => nodes.every(node => node.inert && getComputedStyle(node).clipPath.includes('100%'))), 'only the envelope is initially exposed');
      await page.addStyleTag({ content: '.fireworks, #__bs_notify__, .pace { visibility: hidden !important; }' });
      if (width === 1440 || width === 390) await page.screenshot({ path: path.join(output, `${width}-envelope-initial.png`) });
      await page.mouse.wheel(0, 150);
      await page.waitForFunction(() => scrollY >= 145 && Number(document.querySelector('.home-mail-scene').dataset.progress) > 0);
      const beforePull = await page.evaluate(() => ({ cover: document.querySelector('.home-hero').getBoundingClientRect().top, sheets: [...document.querySelector('.world-home').children].slice(1).map(node => node.getBoundingClientRect().top) }));
      await page.mouse.wheel(0, 130);
      await page.waitForFunction(() => scrollY >= 275 && Number(document.querySelector('.home-mail-scene').dataset.progress) > .3);
      const afterPull = await page.evaluate(() => ({ cover: document.querySelector('.home-hero').getBoundingClientRect().top, sheets: [...document.querySelector('.world-home').children].slice(1).map(node => node.getBoundingClientRect().top) }));
      assert.ok(Math.abs(afterPull.cover - beforePull.cover) < 1, 'cover stays still during the pull');
      assert.ok(afterPull.sheets.every((top, i) => top > beforePull.sheets[i]), 'all three sheets move downward with the wheel');
      if (width === 1440 || width === 390) await page.screenshot({ path: path.join(output, `${width}-envelope-pulling.png`) });
      await openLetters();
      assert.ok(await page.locator('.home-announcement, .home-introduction, .home-navigation').evaluateAll(nodes => nodes.every(node => !node.inert && getComputedStyle(node).clipPath === 'none')), 'all three complete sheets are available after the pull');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} horizontal overflow`);
      assert.deepEqual(await page.locator('.world-home > *').evaluateAll(nodes => nodes.map(node => node.className)), originalOrder);
      assert.deepEqual(await page.locator('.home-motif span').allTextContents(), ['感知', '创造', '记录']);
      assert.equal(await page.locator('.home-title-world').evaluate(node => getComputedStyle(node).color), 'rgb(255, 215, 0)');
      const accents = await page.locator('.home-route').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).getPropertyValue('--directory-accent').trim()));
      assert.deepEqual(accents, Array(4).fill('#ffd700'), 'navigation shares the pure gold identity');
      const columns = await page.locator('.home-route-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width < 768 ? 1 : 2);
      const sections = await page.evaluate(() => {
        const nodes = [...document.querySelector('.world-home').children];
        return { gaps: nodes.slice(1).map((node, i) => node.getBoundingClientRect().top - nodes[i].getBoundingClientRect().bottom),
          titles: nodes.slice(1).map(node => getComputedStyle(node.querySelector('h2')).fontSize),
          clauses: [...document.querySelectorAll('.home-hero-clause')].map(node => node.textContent) };
      });
      assert.ok(sections.gaps.every(gap => gap >= 19), `${width} sections have visible space between them`);
      assert.equal(new Set(sections.titles).size, 1, 'announcement and section titles share a clear hierarchy');
      assert.ok(sections.clauses.some(clause => clause.startsWith('又不乏')));
      assert.deepEqual(await page.locator('.home-letter-number').allTextContents(), ['01 / 03', '02 / 03', '03 / 03']);
      assert.ok(await page.locator('.home-envelope-stamp').isVisible(), 'postage remains visible on mobile');
      const stamp = await page.locator('.home-envelope-stamp').boundingBox();
      assert.ok(stamp.x >= 0 && stamp.x + stamp.width <= width, 'stamp fits the envelope');
      if (width >= 1100) {
        const geometry = await page.evaluate(() => ({ title: document.querySelector('.home-hero h1').getBoundingClientRect().right, art: document.querySelector('.home-celestial').getBoundingClientRect().left }));
        assert.ok(geometry.title < geometry.art, `${width} title overlaps illustration`);
      }
      await page.addStyleTag({ content: '.fireworks, #__bs_notify__, .pace { visibility: hidden !important; }' });
      if (width === 1440 || width === 390) await page.screenshot({ path: path.join(output, `${width}-viewport.png`) });
      await page.screenshot({ path: path.join(output, `${width}-final.png`) });
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => Number(document.querySelector('.home-mail-scene').dataset.progress) === 0);
      if (width === 1440) {
        await page.locator('.home-envelope-open').focus();
        await page.locator('.home-envelope-open').press('Enter');
        await page.waitForFunction(() => document.querySelector('.world-home').classList.contains('is-letter-expanded'));
        await page.keyboard.press('Home');
        await page.waitForFunction(() => Number(document.querySelector('.home-mail-scene').dataset.progress) === 0);
      }
      console.log(`PASS ${width} layout, pure gold, original order and navigation columns`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const primary = page.locator('.home-hero-actions a').first();
    await primary.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.home-hero-actions a')).boxShadow !== 'none');
    assert.equal(await primary.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 215, 0)');
    await openLetters();
    const update = page.locator('.home-announcement a');
    await update.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.home-announcement a')).backgroundColor !== 'rgba(0, 0, 0, 0)');
    const route = page.locator('.home-route').first();
    await route.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.home-route')).backgroundColor !== 'rgba(0, 0, 0, 0)');
    await page.locator('.home-route-grid').screenshot({ path: path.join(output, 'navigation-hover.png') });
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await route.focus();
    assert.ok(await route.evaluate(node => node.matches(':focus-visible')));
    const routes = await page.locator('.home-route').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const destination of routes) {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await openLetters();
      await page.locator(`.home-route[href="${destination}"]`).click();
      await page.waitForURL(`${base}${destination}`);
      assert.ok(await page.locator('.post-block').count());
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.home-hero-actions a').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    assert.equal(await page.locator('.home-title-world').evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.ok(await page.locator('.home-announcement, .home-introduction, .home-navigation').evaluateAll(nodes => nodes.every(node => !node.inert && getComputedStyle(node).clipPath === 'none')));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${base}/#网站介绍`, { waitUntil: 'domcontentloaded' });
    assert.ok(await page.locator('.home-introduction').evaluate(node => !node.inert));
    assert.equal(await page.locator('.world-home').evaluate(node => node.classList.contains('is-scroll-letter')), false);
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const plainPage = await plain.newPage();
    await plainPage.goto(base, { waitUntil: 'domcontentloaded' });
    assert.equal(await plainPage.locator('.home-announcement, .home-introduction, .home-navigation').count(), 3);
    assert.ok(await plainPage.locator('.home-announcement, .home-introduction, .home-navigation').evaluateAll(nodes => nodes.every(node => !node.inert && getComputedStyle(node).clipPath === 'none')));
    await plain.close();
    console.log('PASS initial envelope/three footers, native scroll/rewind, keyboard unfolding, welcome, hover/focus, four navigation clicks, deep links, no-JS and reduced motion.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
