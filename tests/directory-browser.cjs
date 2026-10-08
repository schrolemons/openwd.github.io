'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.repair-backups/20261001/directory-ui-v2');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  let route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (!route || route.endsWith('/')) route += 'index.html';
  const file = path.resolve(root, 'public', route);
  if (!file.startsWith(path.join(root, 'public') + path.sep)) return res.writeHead(403).end();
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
    await context.addInitScript(() => sessionStorage.setItem('isPopupWindow', '1'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const routes = ['archives/', 'categories/', 'tags/', 'tags/九虹重启/', 'tags/九虹重启/page/2/', 'tags/冰/', 'categories/逝痕文明/', 'categories/逝痕文明/外世拓展/', 'categories/终末文明/基础/', 'yinxing_world/', 'yinxing_world/character/', 'yinxing_world/commission/', 'yinxing_world/nowadays/', 'yinxing_world/resion/', 'yinxing_world/nowadays/Connect.html', 'light_withme/', 'light_withme/key_part/', 'light_withme/operator/', 'light_withme/tests/', 'light_withme/friend_lists/', 'bingjie_domain/', 'bingjie_domain/websites/', 'bingjie_domain/channels/', 'yanghui_days/', 'yanghui_days/world_guide/', 'posts/25.html', 'posts/26.html', 'posts/27.html', 'posts/28.html'];
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        const response = await page.goto(base + '/' + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        assert.equal(response.status(), 200, route);
        await page.locator('.content-directory').first().waitFor({ state: 'visible' });
        const result = await page.evaluate(() => {
          const dir = document.querySelector('.content-directory');
          const links = [...dir.querySelectorAll('a')];
          const rect = dir.getBoundingClientRect();
          return {
            pageWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
            directoryBounds: { x: rect.x, right: rect.right },
            overflow: links.filter(a => { const r = a.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map(a => a.textContent.trim()),
            titleSize: dir.querySelector('h1') ? getComputedStyle(dir.querySelector('h1')).fontSize : null,
            metadataAlignment: dir.querySelector('.directory-stats, .directory-entry-meta') ? getComputedStyle(dir.querySelector('.directory-stats, .directory-entry-meta')).justifyContent : null,
            breadcrumbAlignment: dir.querySelector('.directory-breadcrumb') ? getComputedStyle(dir.querySelector('.directory-breadcrumb')).justifyContent : null,
            excerptSize: dir.querySelector('.directory-excerpt') ? getComputedStyle(dir.querySelector('.directory-excerpt')).fontSize : null,
            columns: dir.querySelector('.directory-folder-grid') ? getComputedStyle(dir.querySelector('.directory-folder-grid')).gridTemplateColumns : null
          };
        });
        assert.ok(result.pageWidth <= width + 1, `${width} ${route}: horizontal page overflow ${JSON.stringify(result)}`);
        assert.deepEqual(result.overflow, [], `${width} ${route}: overflowing links`);
        assert.ok(result.directoryBounds.x >= -1 && result.directoryBounds.right <= width + 1, `${width} ${route}: directory bounds`);
        if (result.titleSize) assert.ok(parseFloat(result.titleSize) >= 26, `header hierarchy: ${route}`);
        if (result.metadataAlignment) assert.equal(result.metadataAlignment, 'flex-start', `Metadata alignment: ${route}`);
        if (result.breadcrumbAlignment) assert.equal(result.breadcrumbAlignment, 'flex-start', `Breadcrumb alignment: ${route}`);
        if (route === 'light_withme/key_part/') {
          // Wait until the theme's entry animation settles before measuring spacing.
          await page.waitForFunction(() => document.querySelector('.photos-page').getBoundingClientRect().top - document.querySelector('.folder-navigation').getBoundingClientRect().bottom >= 30);
          const geometry = await page.evaluate(() => {
            const nav = document.querySelector('.folder-navigation').getBoundingClientRect();
            const cover = document.querySelector('.photos-page').getBoundingClientRect();
            const image = document.querySelector('.photos-page img').getBoundingClientRect();
            return { gap: cover.top - nav.bottom, imageHeight: image.height };
          });
          assert.ok(geometry.gap >= 24, `Cover overlaps navigation: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.imageHeight <= (width < 768 ? 210 : 320) + 1, `Oversized cover: ${JSON.stringify(geometry)}`);
        }
        if (route === 'categories/' && width === 1440) {
          const columns = await page.locator('.directory-tree').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
          assert.equal(columns, 3, 'desktop civilization catalog has three columns');
        }
        if (width === 1440 || width === 390) {
          const name = route.replace(/\/$/, '').replaceAll('/', '-');
          await page.screenshot({ path: path.join(output, `${width}-${name}.png`), fullPage: ['archives/', 'categories/', 'yinxing_world/', 'bingjie_domain/', 'light_withme/', 'tags/'].includes(route), animations: 'disabled' });
        }
        console.log(JSON.stringify({ width, route, ...result }));
      }
    }
    // Exercise the actual user path: overview -> folder -> article -> sibling -> folder.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/archives/', { waitUntil: 'domcontentloaded' });
    await page.locator('.directory-collection-card[href="/yinxing_world/"]').click();
    await page.waitForURL('**/yinxing_world/');
    await page.locator('.directory-folder-card[href="/yinxing_world/nowadays/"]').click();
    await page.waitForURL('**/yinxing_world/nowadays/');
    await page.locator('.directory-entry-link[href="/yinxing_world/nowadays/Connect.html"]').click();
    await page.waitForURL('**/Connect.html');
    await page.locator('.folder-article-link[href="/yinxing_world/nowadays/Junction.html"]').click();
    await page.waitForURL('**/Junction.html');
    await page.locator('.folder-navigation-heading a[href="/yinxing_world/nowadays/"]').click();
    await page.waitForURL('**/yinxing_world/nowadays/');
    await page.goto(base + '/archives/', { waitUntil: 'domcontentloaded' });
    await page.locator('.directory-jump a').nth(2).click();
    const hash = new URL(page.url()).hash.slice(1);
    assert.ok(await page.locator(`[id="${hash}"]`).isVisible());
    // Every local link in the new surfaces must resolve to a generated file.
    for (const route of ['archives/', 'categories/', 'yinxing_world/', 'light_withme/', 'bingjie_domain/', 'yanghui_days/']) {
      await page.goto(base + '/' + route, { waitUntil: 'domcontentloaded' });
      const links = await page.locator('.content-directory a').evaluateAll(nodes => nodes.map(a => a.getAttribute('href')).filter(h => h?.startsWith('/')));
      for (const link of new Set(links)) assert.equal((await context.request.get(base + link)).status(), 200, `Broken directory link: ${link}`);
    }
    await page.goto(base + '/archives/', { waitUntil: 'domcontentloaded' });
    const colours = await page.locator('.directory-tree > [data-depth="0"]').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).getPropertyValue('--directory-accent').trim()));
    assert.equal(new Set(colours).size, 3, 'civilizations must have distinct colours');
    const sidebarCenter = await page.locator('.sidebar-tag-heading').evaluate(node => {
      const title = node.querySelector('h3').getBoundingClientRect();
      const parent = node.getBoundingClientRect();
      return Math.abs((title.left + title.right) / 2 - (parent.left + parent.right) / 2);
    });
    assert.ok(sidebarCenter <= 1, 'sidebar tag heading is centered');
    assert.equal(await page.locator('#resCanvas').count(), 0);
    const tag = page.locator('.sidebar-tag-link').first();
    const before = await tag.boundingBox();
    await tag.hover();
    const after = await tag.boundingBox();
    assert.deepEqual(before, after, 'tag positions must stay stable on hover');
    await tag.focus();
    assert.ok(await tag.evaluate(node => node === document.activeElement));
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => scrollY > 0), 'scrolling over tags should scroll the page');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/tags/**');
    await page.goto(base + '/tags/', { waitUntil: 'domcontentloaded' });
    const sizes = await page.locator('.directory-tag-row').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fontSize));
    assert.equal(new Set(sizes).size, 1, 'topic index uses a uniform font size');
    await page.locator('.directory-tag-row[href="/tags/%E4%B9%9D%E8%99%B9%E9%87%8D%E5%90%AF/"]').click();
    await page.waitForURL('**/tags/**');
    assert.equal(await page.locator('.directory-tag-article').count(), 10);
    await page.locator('.pagination a').filter({ hasText: '2' }).click();
    await page.waitForURL('**/page/2/');
    const $ = require('cheerio').load(fs.readFileSync(path.join(root, 'public/tags/九虹重启/page/2/index.html'), 'utf8'));
    assert.equal(await page.locator('.directory-tag-article').count(), $('.directory-tag-article').length, 'pagination retains every current matching article');
    await page.goto(base + '/bingjie_domain/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => [...document.querySelectorAll('.directory-resource-icon img')].every(image => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator('.directory-resource-icon img').count(), 5, 'all real site icons load');
    // QR image must use the exact link in the original article, with native focus handling.
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + '/bingjie_domain/', { waitUntil: 'domcontentloaded' });
      const qr = page.locator('.directory-qr-trigger');
      const source = await qr.getAttribute('data-qr-src');
      await qr.click();
      const dialog = page.locator('.directory-qr-dialog');
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await dialog.locator('img').getAttribute('src'), source);
      assert.equal(await dialog.locator('a').getAttribute('href'), source);
      assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)));
      await page.screenshot({ path: path.join(output, `${width}-qr-modal.png`), animations: 'disabled' });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.ok(await qr.evaluate(node => node === document.activeElement), 'focus returns to QR button');
    }
    await page.goto(base + '/yanghui_days/world_guide/', { waitUntil: 'domcontentloaded' });
    await page.locator('.directory-entry-link').first().click();
    await page.waitForURL('**/posts/26.html#*');
    const headingId = decodeURIComponent(new URL(page.url()).hash.slice(1));
    await page.locator(`[id="${headingId}"]`).waitFor({ state: 'visible' });
    const unexpected = [...new Set(errors)].filter(message => message !== 'btf is not defined');
    assert.deepEqual(unexpected, [], 'new JavaScript errors');
    console.log(`PASS: ${routes.length * 4} viewport/page checks, navigation, tag hover/focus/scroll and QR dialogs. Existing errors: ${JSON.stringify([...new Set(errors)])}`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
