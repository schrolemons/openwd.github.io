'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://localhost:4012';
const output = path.resolve('.repair-backups/20261004/chapter-containers/previews');
const expectedSections = [...fs.readFileSync('source/_posts/record/light/阴行世界.md', 'utf8').matchAll(/^##\s+(.+)$/gm)].map(m=>m[1].trim());
const expectedToneCount = new Set([...fs.readFileSync('source/_posts/record/light/阴行世界.md', 'utf8').matchAll(/content_section\s+(\w+)/g)].map(m => m[1])).size;
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('**/browser-sync/**', r => r.abort());
    await context.addInitScript(() => { sessionStorage.isPopupWindow = '1'; localStorage.darkmode = 'false'; });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal((await page.goto(base + '/posts/27.html', { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => typeof WorldTheme !== 'undefined' && [...document.querySelectorAll('.post-block,.post-body')].every(n => n.classList.contains('animated') && Number(getComputedStyle(n).opacity) > .99));
      await page.addStyleTag({ content: '.fireworks,#__bs_notify__,.pace,.reading-progress-bar,.headband{visibility:hidden!important}' });
      for (const dark of [false, true]) {
        await page.evaluate(d => WorldTheme.set(d), dark);
        const results = await page.evaluate(() => {
          const scope = document.querySelector('.reading-prose');
          const sections = [...scope.querySelectorAll('.world-content-section')];
          const grid = scope.querySelector('.world-content-grid[data-layout="columns"]');
          const metrics = [];
          const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
          const luminance = color => {
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
            const c = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
            return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
          };
          const contrasts = [...scope.querySelectorAll('.world-content-section h2,.world-content-panel h3,.world-content-panel h4,.world-content-panel h5')].map(n => {
            let background = n;
            while (getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
            const ink = luminance(getComputedStyle(n).color), paper = luminance(getComputedStyle(background).backgroundColor);
            return (Math.max(ink, paper) + .05) / (Math.min(ink, paper) + .05);
          });
          const firstGlyph = n => {
            const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: t => t.parentElement.closest('.headerlink') || !t.textContent.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
            const text = walker.nextNode();
            const index = text.textContent.search(/\S/);
            const range = new Range(); range.setStart(text, index); range.setEnd(text, index + 1);
            return range.getBoundingClientRect().left;
          };
          for (const note of scope.querySelectorAll('.world-content-grid > .note')) {
            const title = note.querySelector('.world-file-title'), p = note.querySelector('p');
            metrics.push(Math.abs(firstGlyph(title) - firstGlyph(p)));
          }
          return {
            titles: sections.map(n => n.querySelector('h2').textContent),
            accents: sections.map(n => getComputedStyle(n.querySelector('h2')).color),
            columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
            stories: sections[0].querySelectorAll('.world-content-grid > .note').length,
            topics: sections[2].querySelectorAll('.world-content-grid > .note').length,
            dimensions: [...grid.querySelectorAll('h5')].map(n => n.textContent),
            firstGroups: [...sections[0].children].filter(n => n.classList.contains('world-content-group')).map(n => ({title: n.querySelector('h3').textContent, tone: n.dataset.tone})),
            alignment: metrics,
            contrast: Math.min(...contrasts),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            excess: [...scope.querySelectorAll('.world-content-section,.world-content-panel,.world-content-grid,.note')].filter(n => n.getBoundingClientRect().right > innerWidth + 1 || n.scrollWidth > n.clientWidth + 2).map(n => n.className)
          };
        });
        assert.deepEqual(results.titles, expectedSections);
        assert.equal(new Set(results.accents).size, expectedToneCount, 'chapter tones follow authored Markdown');
        assert.equal(results.columns, width < 768 ? 1 : 2);
        assert.equal(results.stories, 6); assert.equal(results.topics, 3);
        assert.deepEqual(results.dimensions, ['【宏观】', '【当下】', '【发展】', '【归属】']);
        assert.deepEqual(results.firstGroups, [{title: '异世之篇前置说明', tone: 'violet'}, {title: '异世之篇具体内容', tone: 'violet'}], 'otherworld preface and content share reusable group layout');
        const firstGroupGap = await page.locator('.world-content-section').first().evaluate(n => {
          const groups = [...n.children].filter(c => c.classList.contains('world-content-group'));
          return [groups[1].getBoundingClientRect().top - groups[0].getBoundingClientRect().bottom, parseFloat(getComputedStyle(n).getPropertyValue('--world-separator-gap'))];
        });
        assert.ok(Math.abs(firstGroupGap[0] - firstGroupGap[1]) < 1, 'otherworld groups use shared whitespace separator');
        assert.ok(results.alignment.every(value => value < 1), JSON.stringify(results.alignment));
        assert.ok(results.contrast >= 4.5, `${width}/${dark} contrast ${results.contrast}`);
        assert.equal(results.overflow, false, `${width}/${dark} page overflow`);
        assert.deepEqual(results.excess, [], `${width}/${dark} container overflow`);
        const hierarchy = await page.locator('.world-content-section').nth(1).evaluate(section => {
          const groups = [...section.children].filter(n => n.classList.contains('world-content-group'));
          const questions = [...groups[0].children].filter(n => n.classList.contains('world-content-plain'));
          const compact = [...questions[1].querySelectorAll('.world-content-compact')];
          const metric = n => { const s = getComputedStyle(n); return { size: parseFloat(s.fontSize), border: s.borderBottomWidth }; };
          return {
            chapter: metric(section.querySelector('h2')), subtitle: metric(section.querySelector('h3')),
            questions: questions.map(n => ({ size: metric(n.querySelector('h4')).size, border: getComputedStyle(n).borderLeftWidth, topBorder: getComputedStyle(n).borderTopWidth, padding: getComputedStyle(n).paddingTop, parent: n.parentElement === groups[0], tone: n.dataset.tone })),
            children: compact.map(n => ({ size: metric(n.querySelector('h5')).size, border: getComputedStyle(n).borderLeftWidth, padding: getComputedStyle(n).padding, background: getComputedStyle(n).backgroundColor, start: Number(n.querySelector('ol').getAttribute('start') || 1) })),
            inlineStyles: questions.flatMap(n => [n, ...n.querySelectorAll('.world-content-panel')]).some(n => n.hasAttribute('style')),
            groups: groups.length, tone: section.dataset.tone,
            groupGap: groups[1].getBoundingClientRect().top - groups[0].getBoundingClientRect().bottom,
            expectedGap: parseFloat(getComputedStyle(section).getPropertyValue('--world-separator-gap')),
            noteTones: [...groups[1].querySelectorAll('.note')].every(n => getComputedStyle(n).getPropertyValue('--note-accent').trim() === getComputedStyle(section).getPropertyValue('--tone-blue').trim())
          };
        });
        assert.equal(hierarchy.questions.length, 3, 'Q1/Q2/Q3 are parallel modules');
        assert.equal(new Set(hierarchy.questions.map(n => n.size)).size, 1, 'question titles use the same role');
        assert.ok(hierarchy.chapter.size > hierarchy.subtitle.size && hierarchy.subtitle.size > hierarchy.questions[0].size);
        assert.equal(hierarchy.subtitle.border, '0px', 'subtitle has no competing heading rule');
        assert.ok(hierarchy.questions.every(n => n.parent && n.border === '0px' && n.topBorder === '1px' && n.padding === '24px' && n.tone === 'amber'));
        assert.equal(hierarchy.groups, 2, 'preface and content have independent group containers');
        assert.equal(hierarchy.tone, 'amber', 'corridor uses gold theme');
        assert.ok(Math.abs(hierarchy.groupGap - hierarchy.expectedGap) < 1, 'groups share site whitespace separator');
        assert.equal(hierarchy.noteTones, true, 'information notes retain blue');
        assert.equal(hierarchy.children.length, 4);
        assert.deepEqual(hierarchy.children.map(n => n.start), [1, 3, 5, 7], 'eight questions retain source numbering');
        assert.ok(hierarchy.children.every(n => n.size < hierarchy.questions[0].size && n.border === '0px' && n.padding === '0px' && n.background === 'rgba(0, 0, 0, 0)'));
        assert.equal(hierarchy.inlineStyles, false, 'Markdown containers use shared classes');
        const framed = page.locator('.world-content-grid.world-content-framed');
        assert.equal(await framed.count(), 1, 'Q2 dimensions share one frame');
        assert.deepEqual(await framed.evaluate(n => { const s = getComputedStyle(n); return [s.borderTopWidth, s.borderTopStyle, s.borderTopColor, getComputedStyle(document.documentElement).getPropertyValue('--world-ink').trim()]; }), ['1px', 'solid', dark ? 'rgb(236, 233, 226)' : 'rgb(36, 36, 36)', dark ? '#ece9e2' : '#242424']);
        assert.equal(await framed.locator('.world-content-compact').count(), 4);
        if (width !== 320) {
          await page.locator('.world-content-section').first().locator('.world-content-group').first().screenshot({path:path.resolve(`.repair-backups/20261004/otherworld-groups/preface-${width}-${dark ? 'dark' : 'light'}.png`)});
          for (const [name, locator] of [['chapter', page.locator('.world-content-section').first()], ['dimensions', page.locator('.world-content-grid[data-layout="columns"]')], ['topics', page.locator('.world-content-section').nth(2)]]) {
            await locator.screenshot({ path: path.join(output, `${name}-${width}-${dark ? 'dark' : 'light'}.png`) });
          }
          await page.locator('.world-content-plain').nth(1).screenshot({ path: path.resolve(`.repair-backups/20261004/qa-hierarchy/q2-${width}-${dark ? 'dark' : 'light'}.png`) });
          await page.locator('.world-content-group').last().screenshot({ path: path.resolve(`.repair-backups/20261004/corridor-groups/content-${width}-${dark ? 'dark' : 'light'}.png`) });
        }
        if (width === 1440 && !dark) {
          const toc = page.locator('.post-toc a').filter({ hasText: '世界区域' });
          assert.equal(await toc.count(), 1);
          const href = await toc.getAttribute('href');
          await toc.click();
          await page.waitForFunction(id => { const n = document.getElementById(decodeURIComponent(id.slice(1))); return n && n.getBoundingClientRect().top >= 0 && n.getBoundingClientRect().top < innerHeight; }, href);
        }
        console.log(`${width}px ${dark ? 'dark' : 'light'}: structure, palette, grid, first-glyph alignment and overflow passed`);
      }
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + '/menu/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof openArticleReader === 'function' && typeof WorldTheme !== 'undefined');
      await page.evaluate(() => openArticleReader('/posts/27.html', '灵耀体系：阴行世界'));
      await page.locator('.menu-article-body .world-content-section').first().waitFor();
      for (const dark of [false, true]) {
        await page.evaluate(d => WorldTheme.set(d), dark);
        const result = await page.locator('.menu-article-body').evaluate(n => ({
          sections: n.querySelectorAll('.world-content-section').length,
          tags: n.textContent.includes('{%'),
          columns: getComputedStyle(n.querySelector('.world-content-grid[data-layout="columns"]')).gridTemplateColumns.split(' ').length,
          accents: [...n.querySelectorAll('.world-content-section')].map(s => getComputedStyle(s.querySelector('h2')).color),
          overflow: n.scrollWidth > n.clientWidth + 2
        }));
        assert.equal(result.sections, 4);
        assert.equal(result.tags, false);
        assert.equal(result.columns, width < 768 ? 1 : 2);
        assert.equal(new Set(result.accents).size, expectedToneCount);
        assert.equal(result.overflow, false, `menu ${width}/${dark}`);
      }
      await page.evaluate(() => closeArticleReader());
      console.log(`${width}px menu reader: containers, palette, responsive grid and original close control passed`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
