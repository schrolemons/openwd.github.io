'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cheerio = require('cheerio');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8')).models;
const read = route => cheerio.load(fs.readFileSync('public/' + route, 'utf8'));
const normalize = text => text.replace(/[\s：|]/g, '');

test('reading guide preserves every source paragraph, era, title, anchor and destination', () => {
  const original = cheerio.load(db.Post.find(post => String(post.abbrlink) === '24').content);
  const page = read('posts/24.html');
  const body = page('.world-reading-guide');
  assert.equal(body.length, 1);
  const text = normalize(body.clone().find('[aria-hidden="true"]').remove().end().text());
  for (const p of original('p').toArray()) {
    if (original(p).parent().is('summary')) continue; // technical note names become Chinese type badges
    assert.ok(text.includes(normalize(original(p).text())), original(p).text().slice(0, 50));
  }
  const eraIds = original('.note.danger h3').map((_, el) => original(el).attr('id')).get();
  assert.equal(body.find('.guide-era').length, eraIds.length);
  assert.deepEqual(body.find('.guide-era-header h2').map((_, el) => page(el).attr('id')).get(), eraIds);
  assert.equal(body.find('.guide-article').length, original('details h4').length);
  assert.equal(body.find('.guide-overview p').length, original('details h4').length);
  const contents = original('p').filter((_, el) => /^内容包含/.test(original(el).text()));
  assert.equal(body.find('.guide-contents').length, contents.length);
  const marked = original('.note.danger code').filter((_, el) => original(el).text().startsWith('【内容】'));
  assert.equal(body.find('.guide-choice-content').length, marked.length);
  assert.ok(marked.length >= 3);
  const typeTones = { 主线: 'blue', 方案: 'violet', 背景: 'green', 理论: 'amber', 思维碰撞: 'cyan', 支线: 'rose' };
  assert.deepEqual(body.find('.guide-choice-content').map((_, el) => page(el).attr('data-tone')).get(), marked.map((_, el) => typeTones[original(el).text().slice(4).split('：')[0]] || 'violet').get());
  assert.deepEqual(body.find('.guide-choice-content').map((_, el) => normalize(page(el).clone().find('[aria-hidden="true"]').remove().end().text())).get(), marked.map((_, el) => normalize(original(el).text())).get());
  for (const el of body.find('.guide-content-item[href]').toArray()) assert.equal(body.find(`[id="${page(el).attr('href').slice(1)}"]`).length, 1);
  for (const el of original('[id]').toArray()) assert.equal(body.find(`[id="${original(el).attr('id')}"]`).length, 1);
  const map = href => href.replace(/^https:\/\/world\.sch-nie\.com\/+/, '/');
  const hrefs = body.find('a:not(.headerlink)').map((_, el) => page(el).attr('href')).get();
  for (const el of original('a:not(.headerlink)').toArray()) assert.ok(hrefs.includes(map(original(el).attr('href'))));
  assert.equal(body.find('.guide-reading-rule strong').text(), '【时间线顺序】');
  assert.equal(body.find('.guide-world-definition strong').text(), '第九边缘宇宙');
  assert.equal(body.find('.guide-preface').next().attr('class'), 'guide-era-nav');
});

test('homepage preserves original introduction, announcement and four working reading routes', () => {
  const original = cheerio.load(db.Page.find(page => page.source === 'index.md').content);
  const page = read('index.html');
  assert.equal(page('.world-home').length, 1);
  assert.deepEqual(page('.world-home').children().map((_, el) => page(el).attr('class')).get(), ['home-hero', 'home-announcement', 'home-introduction', 'home-navigation']);
  assert.deepEqual(page('.home-motif span').map((_, el) => page(el).text()).get(), ['感知', '创造', '记录']);
  assert.equal(normalize(page('.home-hero h1').text()), normalize(db.Page.find(page => page.source === 'index.md').title));
  assert.equal(page('.home-title-world').text(), 'WORLD');
  assert.equal(page('.home-navigation .home-endnote').length, 1);
  const intro = original('.note.danger p').text().split(/[1-4]\./).filter(Boolean);
  for (const p of intro) assert.ok(normalize(page('.world-home').text()).includes(normalize(p)));
  assert.equal(normalize(page('.home-announcement p').text()), normalize(original('.note.info p').first().text()));
  const paths = page('.home-route').map((_, el) => page(el).attr('href')).get();
  assert.deepEqual(paths, ['/posts/24.html', '/archives/', '/light_withme/key_part/', '/light_withme/operator/']);
  for (const route of paths) assert.ok(fs.existsSync('public' + route + (route.endsWith('/') ? 'index.html' : '')));
  assert.match(page('.post-body script').html(), /isPopupWindow/);
});
