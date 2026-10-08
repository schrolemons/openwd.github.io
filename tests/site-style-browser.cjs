'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4010';
const output = path.resolve('.repair-backups/20261003/style-unification/screenshots');
fs.mkdirSync(output, { recursive: true });
const examples = ['/', '/SCHNIE/', '/archives/', '/categories/', '/tags/', '/tags/九虹重启/page/2/', '/posts/24.html', '/posts/25.html', '/posts/26.html', '/posts/27.html', '/posts/28.html', '/posts/18.html', '/posts/15.html', '/posts/10.html', '/about/', '/light_withme/key_part/', '/light_withme/operator/', '/yinxing_world/', '/bingjie_domain/', '/yanghui_days/', '/light_withme/', '/yinxing_world/character/mosae.html', '/yinxing_world/nowadays/Connect.html'];
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const allRoutes = files('public').filter(file => file.endsWith('.html') && cheerio.load(fs.readFileSync(file, 'utf8'))('.post-block').length).map(file => '/' + path.relative('public', file).replaceAll('\\', '/').replace(/index\.html$/, ''));
const samples = [];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
    await context.addInitScript(() => { sessionStorage.setItem('isPopupWindow', '1'); localStorage.setItem('darkmode', 'false'); });
    const page = await context.newPage();
    for (const width of process.argv.includes('--wide') ? [2335,3840] : process.argv.includes('--small') ? [320, 768, 1092] : [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of process.argv.includes('--all') ? allRoutes : examples) {
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200, route);
        await page.waitForFunction(() => { const n = document.querySelector('.post-block'); return n && n.classList.contains('animated') && Number(getComputedStyle(n).opacity) > .99; });
        await page.locator('.world-theme-toggle').waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.post-body,.post-header')].every(n => n.classList.contains('animated') && Number(getComputedStyle(n).opacity) > .99));
        if (route === '/') await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.home-hero p')).opacity) > .99);
        for (const mode of ['light', 'dark']) {
          if (await page.locator('.world-theme-toggle').getAttribute('aria-pressed') !== String(mode === 'dark')) await page.locator('.world-theme-toggle').click();
          assert.equal(await page.locator('html').getAttribute('data-world-theme'), mode, route);
          const result = await page.evaluate(() => {
            const node = document.querySelector('.reading-prose') || document.querySelector('.content-directory') || document.querySelector('.world-home');
            const raw = getComputedStyle(document.documentElement);
            const sameRole = selector => [...document.querySelectorAll(selector)].map(n => { const s=getComputedStyle(n); return `${s.fontSize}/${s.fontWeight}/${s.lineHeight}`; });
            const box = document.querySelector('.reading-prose .world-prose-section, .directory-header, .home-announcement');
            const profile = document.querySelector('.reading-document');
            const para = document.querySelector('.world-paragraph-line') || document.querySelector('.world-natural-paragraph');
            const inkProbe = document.createElement('span'); inkProbe.style.color='var(--world-ink)'; document.body.append(inkProbe);
            const inkColor = getComputedStyle(inkProbe).color; inkProbe.remove();
            const notes = [...document.querySelectorAll('.post-body .note')].map(n => {
              const s = getComputedStyle(n), probe = document.createElement('span'); probe.style.color='var(--note-accent)'; n.append(probe);
              const accent = getComputedStyle(probe).color; probe.remove();
              return { person:n.classList.contains('world-person-card'), border:s.borderLeftColor, accent, headings:[...n.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>getComputedStyle(h).color) };
            });
            const header = document.querySelector('.reading-document .post-header');
            const prose = document.querySelector('.reading-prose:not(.reading-preview)') || document.querySelector('.world-reading-guide');
            const frame = n => n && ({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right});
            const alignedExtras = prose ? [...document.querySelectorAll('.folder-navigation,.collection-navigation,.comments,.tabs-comment')].filter(n=>n.getBoundingClientRect().width>0).map(frame) : [];
            const addendum=[...document.querySelectorAll('.directory-addendum > .directory-section-heading')].map(n=>({background:getComputedStyle(n).backgroundColor,border:getComputedStyle(n).borderTopWidth}));
            return { overflow: document.documentElement.scrollWidth > innerWidth + 1, style: profile?.dataset.readingStyle,
              text: node ? getComputedStyle(node).color : null, ink: raw.getPropertyValue('--world-ink').trim(), alignedExtras, addendum,
              paper: raw.getPropertyValue('--world-paper').trim(), surface: box ? getComputedStyle(box).backgroundColor : null,
              font: node ? getComputedStyle(node).fontFamily : null, indent: para ? getComputedStyle(para).textIndent : null,
              notes, inkColor, metadataAlignment: document.querySelector('.world-meta') ? getComputedStyle(document.querySelector('.world-meta')).justifyContent : null,
              headerFrame:frame(header), proseFrame:frame(prose),
              headings: sameRole('.directory-resource-title'), articleLinks: sameRole('.directory-tag-article .directory-entry-link'),
              envelope: document.querySelectorAll('.home-hero, .home-mail-scene').length,
              homeScript: [...document.scripts].some(n=>n.src.includes('home-letter.js')),
              ancestorOpacity: [...document.querySelectorAll('.main-inner,.content-wrap,.sidebar')].every(n=>Number(getComputedStyle(n).opacity) === 1) };
          });
          assert.equal(result.overflow, false, `${width} ${mode} ${route} horizontal overflow`);
          assert.ok(result.ancestorOpacity, `full-opacity readable text: ${route}`);
          result.addendum.forEach(n=>{assert.notEqual(n.background,'rgba(0, 0, 0, 0)','directory addendum heading has its paper backplate');assert.equal(n.border,'1px');});
          if (result.metadataAlignment) assert.equal(result.metadataAlignment, 'flex-start', `${route} header metadata alignment`);
          if (result.headerFrame && result.proseFrame) {
            assert.ok(Math.abs(result.headerFrame.left-result.proseFrame.left)<1 && Math.abs(result.headerFrame.right-result.proseFrame.right)<1, `${route} header and prose share reading width`);
            for(const extra of result.alignedExtras) assert.ok(Math.abs(extra.left-result.proseFrame.left)<1 && Math.abs(extra.right-result.proseFrame.right)<1,`${route} navigation/comments share the complete reading column`);
          }
          for (const note of result.notes) {
            if(!note.person) assert.equal(note.border, note.accent, `${route} note semantic accent`);
            assert.ok(note.headings.every(color => color === result.inkColor), `${route} note headings follow theme contrast`);
          }
          if (route !== '/') { assert.equal(result.envelope, 0, route); assert.equal(result.homeScript, false, route); }
          if (result.style === 'story' && result.font && !route.startsWith('/SCHNIE/')) { assert.ok(result.font.includes('Serif') || result.font.includes('SimSun'), route); if (result.indent) assert.ok(parseFloat(result.indent) > 30, route); }
          if (result.style === 'poetry' && result.font && !route.startsWith('/SCHNIE/')) assert.ok(result.font.includes('Serif') || result.font.includes('SimSun'), route);
          assert.ok(new Set(result.headings).size <= 1, 'parallel resource titles share typography');
          assert.ok(new Set(result.articleLinks).size <= 1, 'parallel article links share typography');
          if (result.surface && mode === 'dark') assert.ok(!result.surface.includes('255, 255, 255'), `${route}: white content remains`);
          samples.push({ width, route, mode, ...result });
          if (examples.includes(route)) {
            await page.addStyleTag({ content: '.fireworks, #__bs_notify__, .pace { visibility: hidden !important; }' });
            await page.screenshot({ path: path.join(output, `${width}-${mode}-${route.replaceAll('/', '_') || 'home'}.png`),fullPage:process.argv.includes('--wide')&&route==='/light_withme/operator/' });
            if (['/posts/24.html','/posts/15.html','/tags/'].includes(route)) {
              await page.evaluate(() => scrollTo(0, Math.min(document.documentElement.scrollHeight - innerHeight, 1200)));
              await page.screenshot({ path: path.join(output, `${width}-${mode}-${route.replaceAll('/', '_')}-body.png`) });
              await page.evaluate(() => scrollTo(0,0));
            }
          }
        }
        console.log(`PASS ${width} ${route} light/dark, type and layout`);
      }
    }
    // Theme choice survives a full reload and a navigation; no reset init script here.
    const lifecycle = await browser.newContext({ colorScheme: 'dark' });
    await lifecycle.addInitScript(() => sessionStorage.setItem('isPopupWindow','1'));
    const q = await lifecycle.newPage();
    await q.goto(base + '/about/', {waitUntil:'domcontentloaded'});
    assert.equal(await q.locator('html').getAttribute('data-world-theme'), 'dark');
    await q.locator('.world-theme-toggle').click();
    await q.reload({waitUntil:'domcontentloaded'});
    assert.equal(await q.locator('html').getAttribute('data-world-theme'), 'light');
    await q.goto(base + '/posts/15.html', {waitUntil:'domcontentloaded'});
    assert.equal(await q.locator('html').getAttribute('data-world-theme'), 'light');
    await lifecycle.close();
    fs.writeFileSync(path.join(output, `results${process.argv.includes('--all') ? '-all' : process.argv.includes('--wide') ? '-wide' : process.argv.includes('--small') ? '-small' : ''}.json`), JSON.stringify(samples, null, 2));
    console.log(`PASS ${samples.length} page/viewport/theme combinations and theme persistence.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
