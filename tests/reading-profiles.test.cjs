'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cheerio = require('cheerio');
const { profiles, readingProfile, decorateReading } = require('../lib/reading-profiles.cjs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8')).models;
const documents = [...db.Post, ...db.Page].filter(doc => /\.md$/.test(doc.source || ''));
const text = value => value.replace(/\s+/g, '');
const attrs = ($, selector, name) => $(selector).map((_, el) => $(el).attr(name)).get();

test('every rendered Markdown has the correct reading profile and retains its complete content and embeds', () => {
  assert.equal(documents.length, 50);
  const found = new Set();
  for (const doc of documents) {
    const route = doc.source.startsWith('_posts/') ? `posts/${doc.abbrlink}.html` : doc.path;
    const page = cheerio.load(fs.readFileSync(path.join('public', route), 'utf8'));
    const profile = readingProfile(doc);
    if (!profile) {
      assert.equal(page('.reading-document').length, 0, route);
      assert.ok(page('.content-directory, .world-home').length > 0, route);
      continue;
    }
    found.add(profile.style);
    assert.equal(page('.reading-document').attr('data-reading-style'), profile.style, route);
    assert.equal(page('.reading-document').attr('data-tone'), profile.tone, route);
    assert.equal(page('.reading-kicker').length, 1, route);
    if (String(doc.abbrlink) === '24' || String(doc.abbrlink) === '25') continue; // specialized guide/resource layouts have their own preservation tests
    const original = cheerio.load(doc.content, null, false);
    const rendered = cheerio.load(page('.reading-prose').html(), null, false);
    assert.equal(text(rendered.text()), text(original.text()), `Complete original text: ${doc.source}`);
    for (const [selector, name] of [['[id]', 'id'], ['a[href]', 'href'], ['img[src]', 'src'], ['iframe[src]', 'src']]) {
      assert.deepEqual(attrs(rendered, selector, name), attrs(original, selector, name), `${name}: ${doc.source}`);
    }
    const frameOriginal = attrs(original, 'iframe[srcdoc]', 'srcdoc');
    const frameRendered = attrs(rendered, 'iframe[srcdoc]', 'srcdoc');
    assert.equal(frameOriginal.length, frameRendered.length, route);
    frameOriginal.forEach((html, i) => {
      const before = cheerio.load(html), after = cheerio.load(frameRendered[i]);
      assert.equal(after('body').html(), before('body').html(), `Embedded HTML body: ${doc.source}`);
      // The existing dark-mode plugin injects its own style into iframe heads.
      for (const style of before('style').toArray()) assert.ok(after('style').toArray().some(el => after(el).html() === before(style).html()));
      assert.deepEqual(before('script').map((_, el) => before(el).html()).get(), after('script').map((_, el) => after(el).html()).get());
    });
    for (const tag of ['details', 'summary', 'script', 'button', 'table', 'img', 'iframe']) assert.equal(rendered(tag).length, original(tag).length, `${tag}: ${doc.source}`);
    assert.ok(rendered('table').toArray().every(table => rendered(table).parent().is('.reading-table-scroll')), route);
  }
  assert.deepEqual([...found].sort(), Object.keys(profiles).sort());
});

test('explicit type/tone fields take precedence and unsupported fields fail visibly', () => {
  assert.equal(readingProfile({ source: '_posts/story.md', reading_style: 'lore', reading_tone: 'rose' }).style, 'lore');
  assert.equal(readingProfile({ source: '_posts/story.md', reading_style: 'lore', reading_tone: 'rose' }).tone, 'rose');
  assert.throws(() => readingProfile({ source: 'x.md', reading_style: 'typo' }), /Unknown reading_style/);
  assert.throws(() => readingProfile({ source: 'x.md', reading_tone: 'typo' }), /Unknown reading_tone/);
  assert.equal(readingProfile({ source: 'standalone.html' }), null);
  const decorated = cheerio.load(decorateReading('<div class="note info"><h3 id="a">标题</h3></div><details class="note"><summary>展开</summary><p>正文</p></details>'));
  assert.equal(decorated('.note.info').length, 1, 'heading-only notes retain their original callout semantics');
  assert.equal(decorated('.reading-section-label').length, 0, 'heading-only notes do not opt into a borderless style');
  assert.equal(decorated('details[open]').length, 0, 'original fold state is preserved');
});

test('formatting migration preserves the Markdown body and existing metadata', { skip: !fs.existsSync('.repair-backups/20261001/markdown-reading/sources.json') }, () => {
  const yaml = require('js-yaml');
  const manifest = JSON.parse(fs.readFileSync('.repair-backups/20261001/markdown-reading/sources.json', 'utf8'));
  for (const item of manifest) {
    const raw = fs.readFileSync(item.file, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const body = match ? raw.slice(match[0].length) : raw;
    // The author added these three content markers during the formatting pass.
    // Keep the original backup intact and account only for these exact edits.
    const checkedBody = item.file === 'source/_posts/perception/light/木缘桑庭.md'
      ? body.replace(/`【内容】(主线：<星源绘逢>|思维碰撞：<水渊蚀源>|支线：<重返故都>)`\r?\n/g, '`$1`\r\n')
      : body;
    assert.equal(crypto.createHash('sha256').update(checkedBody).digest('hex'), item.bodyHash, item.file);
    const old = fs.readFileSync(item.backup, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (match && old) {
      const current = yaml.load(match[1]);
      delete current.reading_style; delete current.reading_tone;
      assert.deepEqual(current, yaml.load(old[1]), `Original frontmatter: ${item.file}`);
    }
  }
});
