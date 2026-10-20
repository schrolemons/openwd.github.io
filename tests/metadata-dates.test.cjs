'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const yaml = require('js-yaml');
const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), 'world-metadata-dates-'));
const clean = root => {
  assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('world-metadata-dates-'));
  fs.rmSync(root, { recursive: true, force: true });
};
function write(root, name, text, instant = '2026-10-08T18:30:45Z') {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  fs.utimesSync(file, new Date(instant), new Date(instant));
  return file;
}
const metadata = file => yaml.load(fs.readFileSync(file, 'utf8').match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/)[1], { schema: yaml.JSON_SCHEMA });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('new Markdown gets Shanghai date, existing publication date survives, and updated-only articles retain their structure', () => {
  const { syncMetadataDates } = require('../lib/metadata-dates.cjs');
  const root = fixture();
  try {
    const fresh = write(root, 'essays/new.md', '---\ntitle: 新文\n---\n正文\n');
    const old = write(root, '_posts/old.md', '---\ntitle: 旧文\ndate: 2025-02-01\nupdated: 2026-08-25 # 更新说明\n---\n原文\n');
    const onlyUpdated = write(root, '_posts/updated.md', '---\ntitle: 旧文章\nupdated: 2026-08-25\n---\n原文\n');
    const result = syncMetadataDates(root);
    assert.equal(result.length, 3);
    assert.equal(metadata(fresh).date, '2026-10-09T02:30:45+08:00');
    assert.equal(metadata(fresh).updated, undefined);
    assert.equal(metadata(old).date, '2025-02-01');
    assert.equal(metadata(old).updated, '2026-10-09T02:30:45+08:00');
    assert.ok(fs.readFileSync(old, 'utf8').includes('# 更新说明'));
    assert.equal(metadata(onlyUpdated).date, undefined);
    assert.equal(metadata(onlyUpdated).updated, '2026-10-09T02:30:45+08:00');
    for (const file of [fresh, old, onlyUpdated]) assert.ok(Math.abs(fs.statSync(file).mtimeMs - Date.parse('2026-10-08T18:30:45Z')) < 1);
    const before = [fresh, old, onlyUpdated].map(hash);
    assert.deepEqual(syncMetadataDates(root), []);
    assert.deepEqual([fresh, old, onlyUpdated].map(hash), before, 'unchanged generation writes no files');
    fs.appendFileSync(fresh, '新增内容\n');
    fs.utimesSync(fresh, new Date('2026-10-10T05:12:13Z'), new Date('2026-10-10T05:12:13Z'));
    assert.equal(syncMetadataDates(root).length, 1);
    assert.equal(metadata(fresh).date, '2026-10-09T02:30:45+08:00');
    assert.equal(metadata(fresh).updated, '2026-10-10T13:12:13+08:00');
  } finally { clean(root); }
});

test('metadata update preserves BOM, CRLF, all other metadata and body bytes; skips vendor files and timestamps that are not newer', () => {
  const { syncMetadataDates } = require('../lib/metadata-dates.cjs');
  const root = fixture();
  try {
    const original = '\uFEFF---\r\ntitle: "索引" # 标题注释\r\ncustom:\r\n  - A\r\ndate: 2025-01-01\r\n---\r\n{% note info %}\r\n原文 **保留**\r\n{% endnote %}\r\n';
    const index = write(root, 'plans/index.md', original);
    const vendor = write(root, 'lib/vendor/README.md', '---\ntitle: vendor\n---\nREADME');
    const plain = write(root, 'plain.md', '没有元数据的文件');
    const future = write(root, 'future.md', '---\ntitle: 未来\ndate: 2027-01-01\n---\n原文');
    const sameSecond = write(root, 'same.md', '---\ntitle: 同一秒\ndate: 2026-10-09T02:30:45+08:00\n---\n原文', '2026-10-08T18:30:45.999Z');
    const skipped = [vendor, plain, future, sameSecond].map(hash);
    assert.deepEqual(syncMetadataDates(root).map(item => item.source), ['plans/index.md']);
    const changed = fs.readFileSync(index, 'utf8');
    assert.equal(changed.replace("updated: '2026-10-09T02:30:45+08:00'\r\n", ''), original);
    assert.deepEqual([vendor, plain, future, sameSecond].map(hash), skipped);
  } finally { clean(root); }
});

test('plain hexo g refreshes model and generated output in the same run, even with an existing mtime cache', async () => {
  const { registerMetadataDates } = require('../lib/metadata-dates.cjs');
  const Hexo = require('hexo');
  const root = fixture();
  const source = path.join(root, 'source');
  let hexo;
  try {
    fs.mkdirSync(source);
    fs.symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'), 'junction');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ hexo: { version: '7.3.0' }, dependencies: { 'hexo-renderer-marked': '^7.0.0' } }));
    fs.writeFileSync(path.join(root, '_config.yml'), 'title: 日期测试\ntheme: false\npermalink: posts/:title.html\n');
    const post = write(source, '_posts/story.md', '---\ntitle: Story\ndate: 2025-01-01\nupdated: 2026-08-25\n---\n正文');
    const index = write(source, 'plans/index.md', '---\ntitle: 计划\n---\n计划正文');
    hexo = new Hexo(root, { _: ['g'], silent: true });
    await hexo.init();
    hexo.extend.generator.register('date-proof', function () {
      return [...this.model('Post').toArray(), ...this.model('Page').toArray()].map(doc => ({ path: `${doc.source.replace(/\.md$/, '')}.txt`, data: `${doc.date.toISOString()}|${doc.updated?.toISOString() || ''}|${doc.content}` }));
    });
    // Prime Hexo's mtime cache before enabling the feature.
    await hexo.call('generate');
    const originalDate = hexo.model('Post').findOne({ source: '_posts/story.md' }).date.toISOString();
    registerMetadataDates(hexo);
    await hexo.call('generate');
    const postOutput = fs.readFileSync(path.join(root, 'public/_posts/story.txt'), 'utf8');
    assert.ok(postOutput.startsWith(`${originalDate}|2026-10-08T18:30:45.000Z|`), postOutput);
    assert.ok(fs.readFileSync(path.join(root, 'public/plans/index.txt'), 'utf8').startsWith('2026-10-08T18:30:45.000Z|'));
    const before = [post, index].map(hash);
    await hexo.call('generate');
    assert.deepEqual([post, index].map(hash), before);
    fs.appendFileSync(post, '\n后续修改');
    fs.utimesSync(post, new Date('2026-10-10T05:12:13Z'), new Date('2026-10-10T05:12:13Z'));
    const created = write(source, 'essays/created.md', '---\ntitle: 后来新建\n---\n新正文', '2026-10-10T06:00:01Z');
    await hexo.call('generate');
    const modifiedOutput = fs.readFileSync(path.join(root, 'public/_posts/story.txt'), 'utf8');
    assert.ok(modifiedOutput.startsWith(`${originalDate}|2026-10-10T05:12:13.000Z|`), modifiedOutput);
    assert.ok(modifiedOutput.includes('后续修改'));
    assert.equal(metadata(created).date, '2026-10-10T14:00:01+08:00');
    assert.ok(fs.readFileSync(path.join(root, 'public/essays/created.txt'), 'utf8').startsWith('2026-10-10T06:00:01.000Z|'));
  } finally {
    if (hexo) await hexo.exit();
    clean(root);
  }
});
