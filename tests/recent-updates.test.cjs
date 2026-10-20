'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cheerio = require('cheerio');

test('recent updates combine posts, standalone articles and content indexes using authored dates', () => {
  const { collectRecentUpdates } = require('../lib/recent-updates.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'world-updates-'));
  const entries = [
    ['_posts/story.md', 'posts/7.html', 'title: 故事\nupdated: 2026-10-8 10:00:00\ncategories: [九虹重启, 主线]\ntags: [火]\ndescription: 元数据摘要', '<p>正文</p>'],
    ['essays/new.md', 'essays/new.html', 'title: 新的故事\ndate: 2026-10-9 17:43:51\nreading_style: essay', '<script>不应出现</script><p>生命总渴望延续。</p><p>后续原句。</p>'],
    ['plans/index.md', 'plans/index.html', 'title: 发行计划\nreading_style: info', '<div class="photos-item"><p>横幅说明</p></div><p>计划原文。</p>'],
    ['older.md', 'older.html', 'title: 旧文\ndate: 2025-01-01', '<p>旧文</p>'],
    ['index.md', 'index.html', 'title: 首页\nreading_style: home', '<p>首页</p>'],
    ['tags/index.md', 'tags/index.html', 'title: 标签\ntype: tags', ''],
    ['collection/index.md', 'collection/index.html', 'title: 目录\ndirectory_collection: world', ''],
    ['test-raw-html/index.md', 'test-raw-html/index.html', 'title: 测试', ''],
    ['lib/vendor/README.md', 'lib/vendor/README.html', 'title: 文档', '']
  ];
  try {
    const docs = entries.map(([source, route, meta, content]) => {
      const file = path.join(root, source);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `---\n${meta}\n---\n正文`);
      fs.utimesSync(file, new Date('2026-10-07T18:00:00Z'), new Date('2026-10-07T18:00:00Z'));
      return { source, path: route, content, date: new Date('2030-01-01'), updated: new Date('2030-01-01') };
    });
    const result = collectRecentUpdates([...docs, docs[0]], root);
    assert.deepEqual(result.map(item => item.title), ['新的故事', '故事', '发行计划']);
    assert.deepEqual(result.map(item => item.date), ['2026-10-09', '2026-10-08', '2026-10-08']);
    assert.deepEqual(result.map(item => item.dateLabel), ['发布', '更新', '文件更新']);
    assert.equal(result[0].summary, '生命总渴望延续。 后续原句。');
    assert.equal(result[1].summary, '元数据摘要');
    assert.deepEqual(result[1].categories, ['九虹重启', '主线']);
    assert.deepEqual(result[1].tags, ['火']);
    assert.equal(result[2].summary, '计划原文。');
    assert.equal(result[2].url, '/plans/index.html');
    fs.writeFileSync(path.join(root, '_posts/story.md'), '---\ntitle: 故事\nupdated: 2026-10-10\n---');
    assert.equal(collectRecentUpdates(docs, root)[0].title, '故事', 'the next generation reflects changed metadata');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('homepage inserts recent updates as the second sheet with safe titles and four-page navigation', () => {
  const { homepage } = require('../lib/reading-layout.cjs');
  const html = '<div class="note danger"><p>1.简介<br>2.世界<br>3.文明<br>4.文字</p></div><div class="note info"><p>公告</p></div><table><tbody></tbody></table>';
  const $ = cheerio.load(homepage(html, '第九边缘：WORLD', '作者', [{ title: '<img src=x>', url: '/essays/new.html', date: '2026-10-09', dateLabel: '发布', categories: ['现世之篇'], tags: [], summary: '原文摘要', kind: '随笔' }]));
  assert.deepEqual($('.world-home').children().map((_, el) => $(el).attr('class')).get(), ['home-hero', 'home-announcement', 'home-recent-updates', 'home-introduction', 'home-navigation']);
  assert.deepEqual($('.home-letter-number').map((_, el) => $(el).text()).get(), ['01 / 04', '02 / 04', '03 / 04', '04 / 04']);
  assert.equal($('.home-envelope-peeks > span').length, 4);
  assert.match($('.home-envelope-open').attr('aria-controls'), /最近更新/);
  assert.equal($('.home-update-title').text(), '<img src=x>');
  assert.equal($('.home-recent-updates img').length, 0);
  assert.equal($('.home-update-link').attr('href'), '/essays/new.html');
  assert.equal($('.home-update-summary').text(), '原文摘要');
});
