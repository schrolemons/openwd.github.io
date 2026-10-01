'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
function readPage(route) {
  const file = path.join(root, 'public', decodeURIComponent(route), route.endsWith('/') ? 'index.html' : '');
  assert.ok(fs.existsSync(file), `Generated page missing: ${route}`);
  return cheerio.load(fs.readFileSync(file, 'utf8'));
}
function sources(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sources(name);
    if (!entry.name.endsWith('.md') || entry.name === 'index.md') return [];
    const raw = fs.readFileSync(path.join(root, name), 'utf8');
    return [{ source: name, front: yaml.load(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]) }];
  });
}

test('overview includes every post once, including the previously omitted 基础 articles', () => {
  const $ = readPage('archives/');
  const links = $('.directory-entry-link').map((_, el) => $(el).attr('href')).get();
  const posts = sources('source/_posts');
  assert.equal(links.length, posts.length);
  assert.equal(new Set(links).size, posts.length);
  for (const post of posts) assert.ok(links.includes(`/posts/${post.front.abbrlink}.html`), post.front.title);
  assert.equal($('.directory-section[data-depth="0"]').length, 3);
  assert.ok($('.directory-section[data-depth="2"]').length > 0, 'third-level categories must be visible');
  for (const post of posts) {
    const $article = readPage(`posts/${post.front.abbrlink}.html`);
    assert.ok(($article('.post-body').html() || '').trim().length > 20, `Rendered article body: ${post.front.title}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'public/css/main.css')), 'Stylesheet must render successfully');
});

test('all nested category pages contain exactly their descendant articles and a full breadcrumb', () => {
  const posts = sources('source/_posts');
  const chains = new Map();
  for (const post of posts) {
    const cats = post.front.categories;
    for (let depth = 1; depth <= cats.length; depth++) {
      const route = `categories/${cats.slice(0, depth).join('/')}/`;
      if (!chains.has(route)) chains.set(route, []);
      chains.get(route).push(`/posts/${post.front.abbrlink}.html`);
    }
  }
  for (const [route, expected] of chains) {
    const $ = readPage(route);
    assert.deepEqual($('.directory-entry-link').map((_, el) => $(el).attr('href')).get().sort(), expected.sort(), route);
    assert.equal($('.directory-breadcrumb [aria-current="page"]').length, 1, route);
    assert.equal($('.directory-stats b').first().text(), String(expected.length), `Article count: ${route}`);
  }
});

test('folder landing pages list all seven independent pages without including other folders', () => {
  const pages = sources('source/yinxing_world');
  const $ = readPage('yinxing_world/');
  assert.equal($('.directory-folder-card').length, 4);
  assert.equal($('.directory-entry-link').length, 7);
  for (const folder of ['character', 'commission', 'nowadays', 'resion']) {
    const own = pages.filter(p => p.source.startsWith(`source/yinxing_world/${folder}/`));
    const $folder = readPage(`yinxing_world/${folder}/`);
    const links = $folder('.directory-entry-link').map((_, el) => $folder(el).attr('href')).get();
    assert.deepEqual(links.sort(), own.map(p => '/' + p.source.replace('source/', '').replace(/\.md$/, '.html')).sort());
    for (const page of own) {
      const route = page.source.replace('source/', '').replace(/\.md$/, '.html');
      const $article = readPage(route);
      assert.equal($article('.folder-navigation [aria-current="page"]').length, 1, route);
      assert.equal($article('.folder-navigation .folder-article-link').length, own.length, route);
      assert.ok($article('.post-body').text().trim().length > 100, 'original article body preserved');
    }
  }
});

test('all four world extensions have a directory and a navigation bar on their original article', () => {
  for (const [directory, post, groups] of [['yinxing_world', 27, 4], ['light_withme', 28, 3], ['bingjie_domain', 25, 2], ['yanghui_days', 26, 3]]) {
    const $ = readPage(directory + '/');
    assert.equal(directory === 'bingjie_domain' ? $('.directory-resource-section').length : $('.directory-folder-card').length, groups, directory);
    const $article = readPage(`posts/${post}.html`);
    assert.equal($article('.collection-navigation').length, 1, `Collection navigation: ${post}`);
    assert.equal($article(`.collection-navigation a[href="/${directory}/"]`).length, 1);
  }
});

test('light_withme shows three groups while independent profile URLs remain available', () => {
  const $ = readPage('light_withme/');
  const links = $('.directory-entry-link').map((_, el) => $(el).attr('href')).get();
  for (const route of ['/light_withme/key_part/', '/light_withme/operator/', 'https://zero.sch-nie.com/SCHNIE_test/']) assert.ok(links.includes(route), route);
  assert.ok(!$('.directory-folder-title, .directory-section-heading').text().includes('扩列'));
  assert.ok(!links.includes('/light_withme/friend_lists/mosae/'));
  assert.ok(!readPage('posts/28.html')('.collection-navigation').text().includes('扩列'));
  assert.ok(!links.includes('/light_withme/friend_lists/'), 'editor is not included');
  assert.equal(links.length, 3);
  assert.equal($('.directory-stats b').first().text(), '3');
  assert.equal($('.directory-folder-section').length, 3, 'no nested mosae folder');
  assert.ok(!$('.content-directory').text().includes('未命名'));
  assert.equal($('.directory-folder-card[href="/light_withme/tests/"]').length, 1);
  assert.match(readPage('light_withme/key_part/').text(), /第九边缘发行计划-logo设计/);
  assert.match(readPage('light_withme/operator/').text(), /协作方式/);
  const $friends = readPage('light_withme/friend_lists/');
  assert.equal($friends('.directory-entry-link').length, 1);
  assert.equal($friends('.directory-folder-card').length, 0);
  assert.match(readPage('light_withme/friend_lists/mosae/').text(), /墨薛的个人扩列条/);
  assert.match(readPage('light_withme/friend_lists/mosae/')('title').text(), /墨薛的个人扩列条/);
  for (const route of ['light_withme/', 'bingjie_domain/', 'yanghui_days/']) {
    const $dir = readPage(route);
    assert.ok(!$dir('.directory-entry-kind').text().includes('站点入口'));
    assert.ok(!$dir('.directory-excerpt').text().includes('定向'));
  }
});

test('ice entrances are coloured resource cards on the directory and the original article', () => {
  for (const route of ['bingjie_domain/', 'posts/25.html']) {
    const $ = readPage(route);
    assert.equal($('.directory-resource-card').length, 6, route);
    assert.equal($('.directory-qr-trigger').length, 1);
    assert.equal($('.directory-resource-icon img').length, 5);
    assert.equal(new Set($('.directory-resource-card').map((_, el) => $(el).attr('data-tone')).get()).size, 6);
    for (const id of ['网站', '世界', '元点', '博客', '方舟', '启动器', '微信公众号']) assert.equal($(`[id="${id}"]`).length, 1, id);
  }
});

test('ice and sun section directories link to real headings in the original articles', () => {
  for (const [directory, post, total] of [['bingjie_domain', 25, 6], ['yanghui_days', 26, 5]]) {
    const $ = readPage(directory + '/');
    assert.equal($('.directory-entry-link').length, total);
    const $article = readPage(`posts/${post}.html`);
    for (const href of $('.directory-entry-link').map((_, el) => $(el).attr('href')).get()) {
      if (/^https?:/.test(href)) continue;
      const id = decodeURIComponent(href.split('#')[1] || '');
      assert.ok($article('[id]').toArray().some(el => $article(el).attr('id') === id), `Missing original section: ${href}`);
    }
  }
});

test('sidebar tags are stable, counted, keyboard-accessible links rather than a scroll-capturing canvas', () => {
  const $ = readPage('archives/');
  assert.equal($('#resCanvas').length, 0);
  const tags = new Map();
  for (const post of sources('source/_posts')) for (const tag of post.front.tags || []) tags.set(tag, (tags.get(tag) || 0) + 1);
  const links = $('.sidebar-tag-link');
  assert.equal(links.length, tags.size);
  for (const link of links.toArray()) {
    const name = $(link).find('.sidebar-tag-name').text();
    assert.equal($(link).find('.sidebar-tag-count').text(), String(tags.get(name)), name);
    assert.ok($(link).attr('href').startsWith('/tags/'));
    assert.ok($(link).attr('aria-label').includes(name));
  }
});

test('topic index has uniform rows and every tag pagination displays all matching articles exactly once', () => {
  const $index = readPage('tags/');
  assert.equal($index('.directory-tag-row').length, 18);
  assert.equal($index('.directory-tag-card').length, 18);
  assert.equal($index('.directory-tag-preview-link').length, 36);
  assert.equal($index('.tag-cloud').length, 0);
  assert.deepEqual($index('.directory-tag-group h2').map((_, el) => $index(el).text()).get(), ['文化体系', '十二元素', '世界三元']);
  assert.deepEqual($index('.directory-tag-group-count').map((_, el) => $index(el).text()).get(), ['3 个标签', '12 个标签', '3 个标签']);
  assert.deepEqual($index('.sidebar-tag-group h4').map((_, el) => $index(el).text()).get(), ['体系', '元素', '三元']);
  const posts = sources('source/_posts');
  const tags = new Map();
  for (const post of posts) for (const tag of post.front.tags || []) {
    if (!tags.has(tag)) tags.set(tag, []);
    tags.get(tag).push(`/posts/${post.front.abbrlink}.html`);
  }
  for (const [tag, expected] of tags) {
    const card = $index('.directory-tag-card').toArray().find(element => $index(element).find('.directory-tag-name').text() === tag);
    assert.ok(card, tag);
    for (const href of $index(card).find('.directory-tag-preview-link').map((_, element) => $index(element).attr('href')).get()) assert.ok(expected.includes(href), `Preview article belongs to tag: ${tag}`);
    const distribution = new Map();
    for (const post of posts.filter(post => (post.front.tags || []).includes(tag))) distribution.set(post.front.categories[0], (distribution.get(post.front.categories[0]) || 0) + 1);
    assert.deepEqual($index(card).find('.directory-tag-distribution > span').map((_, element) => $index(element).text().replace(/\s+/g, ' ').trim()).get().sort(), [...distribution].map(([name, count]) => `${name} ${count}`).sort(), `Civilization distribution: ${tag}`);
    const route = `tags/${tag}/`;
    const $first = readPage(route);
    const routes = new Set([route, ...$first('.pagination a[href]').map((_, el) => $first(el).attr('href').replace(/^\//, '')).get()]);
    const actual = [];
    for (const tagRoute of routes) {
      const $ = readPage(tagRoute);
      const links = $('.directory-tag-article .directory-entry-link').map((_, el) => $(el).attr('href')).get();
      assert.ok(links.length > 0, `Empty tag page: ${tagRoute}`);
      actual.push(...links);
    }
    assert.deepEqual(actual.sort(), expected.sort(), tag);
  }
  assert.equal(readPage('tags/九虹重启/page/2/')('.directory-tag-article').length, 1);
});
