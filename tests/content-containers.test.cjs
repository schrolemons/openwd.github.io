'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const fs = require('node:fs');
const stylus = require('stylus');
const { renderContainer, protectContainerTags, applyContainerTags } = require('../lib/content-containers.cjs');
const { decorateReading } = require('../lib/reading-profiles.cjs');

test('authored chapters retain nested prose, original links and anchors without duplicate paper wrappers', () => {
  const panel = renderContainer('panel', ['blue'], '<h3 id="original">原题</h3><p><a href="/original/">原文</a></p>', value => value);
  const grid = renderContainer('grid', ['columns'], panel, value => value);
  const chapter = renderContainer('section', ['violet', '01'], '<h2 id="chapter">章节</h2>' + grid, value => value);
  const $ = cheerio.load(decorateReading(chapter, 'info'), null, false);
  assert.equal($('.world-prose-section').length, 1);
  assert.equal($('.world-content-section > .world-content-grid > .world-content-panel').length, 1);
  assert.equal($('.world-content-section').attr('data-index'), '01');
  assert.equal($('#original').text(), '原题');
  assert.equal($('a').attr('href'), '/original/');
  assert.equal($('p').text(), '原文');
});

test('container options are finite, invalid styles fail instead of injecting HTML', () => {
  assert.throws(() => renderContainer('section', ['violet', '" onmouseover="x'], '', value => value), /index/);
  assert.throws(() => renderContainer('panel', ['unknown'], '', value => value), /tone/);
  assert.throws(() => renderContainer('grid', ['three'], '', value => value), /layout/);
  assert.throws(() => renderContainer('unknown', [], '', value => value), /container/);
  assert.match(renderContainer('grid', [], '', value => value), /data-layout="rows"/);
});

test('every semantic tone compiles to a real CSS selector and shared palette variable', () => {
  const css = stylus.render(fs.readFileSync('source/_data/content-containers.styl', 'utf8'));
  for (const tone of ['violet', 'blue', 'green', 'cyan', 'amber', 'rose']) {
    assert.ok(css.includes(`[data-tone='${tone}']`) || css.includes(`[data-tone=${tone}]`), tone + ' selector');
    assert.ok(css.includes(`var(--tone-${tone})`), tone + ' token');
  }
  assert.ok(!css.includes('[data-tone=]'));
});

test('standalone menu pipeline renders nested container tags instead of exposing their syntax', () => {
  const marked = require('marked');
  const source = '{% content_section green 03 %}\n\n## 原题\n\n{% content_grid columns %}\n\n{% content_panel blue %}\n\n正文\n\n{% endcontent_panel %}\n\n{% endcontent_grid %}\n\n{% endcontent_section %}';
  const html = applyContainerTags(marked.parse(protectContainerTags(source)));
  const $ = cheerio.load(html, null, false);
  assert.equal($('.world-content-section > .world-content-grid > .world-content-panel').length, 1);
  assert.equal($('.world-content-section').attr('data-tone'), 'green');
  assert.equal($('h2').text(), '原题');
  assert.equal($('p').text(), '正文');
  assert.ok(!html.includes('{%'));
});

test('numbered explanation panels group complete authored items without changing their text, IDs or links', () => {
  const original = '<h4 id="q">问题</h4><h5 id="one">条目一</h5><p>第一段<strong>原文</strong></p><blockquote><p>引用</p></blockquote><h5 id="two">条目二</h5><p><a href="/x">原链接</a></p>';
  const html = renderContainer('panel', ['blue', 'steps'], original, s => s);
  const $ = cheerio.load(html, null, false);
  assert.equal($('.world-content-step').length, 2);
  assert.deepEqual($('.world-content-step').map((_, n) => $(n).attr('data-step')).get(), ['1', '2']);
  assert.equal($('.world-content-step').first().find('blockquote').length, 1);
  assert.equal($('.world-content-step').last().find('a').attr('href'), '/x');
  assert.equal($.root().text(), cheerio.load(original, null, false).root().text());
  assert.deepEqual($('[id]').map((_, n) => $(n).attr('id')).get(), ['q', 'one', 'two']);
  assert.throws(() => renderContainer('panel', ['blue', 'typo'], '', s => s), /panel/);
});

test('only standalone link paragraphs become flush entries; natural prose within new containers remains natural', () => {
  const $ = cheerio.load(decorateReading('<section class="world-prose-section world-content-section"><p>正文<a href="/a">链接</a>。</p><p><a href="/b">入口</a></p><blockquote><p>引用</p></blockquote></section>', 'info'), null, false);
  assert.equal($('p').first().hasClass('world-entry-paragraph'), false);
  assert.equal($('p').eq(1).hasClass('world-entry-paragraph'), true);
  assert.equal($('p').first().hasClass('world-natural-paragraph'), true);
});

test('plain parallel questions and compact dimensions retain grouping, ordered numbering and source nodes', () => {
  const original = '<h4 id="q">问题</h4><h5 id="one">条目</h5><p>原文<a href="/original/">链接</a></p>';
  const $ = cheerio.load(renderContainer('panel', ['blue', 'plain', 'steps'], original), null, false);
  assert.equal($('.world-content-panel.world-content-plain.world-content-steps').length, 1);
  assert.equal($('.world-content-step').length, 1);
  assert.equal($.root().text(), cheerio.load(original, null, false).root().text());
  assert.equal($('#one').length, 1);
  const compact = renderContainer('panel', ['violet', 'compact'], '<h5>【发展】</h5><ol start="5"><li>原问题</li></ol>');
  assert.match(compact, /world-content-compact/);
  assert.match(compact, /start="5"/);
  assert.match(renderContainer('grid', ['columns', 'framed'], compact), /world-content-grid world-content-framed/);
  assert.throws(() => renderContainer('grid', ['columns', 'typo'], ''), /layout/);
  const menu = applyContainerTags(require('marked').parse(protectContainerTags('{% content_panel blue plain steps %}\n\n#### 原题\n\n##### 条目\n\n正文\n\n{% endcontent_panel %}')));
  assert.equal(cheerio.load(menu)('.world-content-plain .world-content-step').length, 1);
  assert.throws(() => renderContainer('panel', ['blue', 'plain', 'typo'], ''), /panel/);
});

test('section groups keep parallel questions and a separate story without altering authored headings', () => {
  const question = renderContainer('panel', ['amber', 'plain', 'steps', 'separated'], '<h4 id="q1">Q1：原题</h4><h5 id="item">原条目</h5><p>原正文</p>');
  const source = renderContainer('panel', ['amber', 'group'], '<h3 id="intro">前置说明</h3>' + question) + '<hr>' + renderContainer('panel', ['amber', 'group'], '<h3 id="story">具体内容</h3><blockquote><p>原引用</p></blockquote>');
  const dom = cheerio.load(decorateReading(renderContainer('section', ['amber', '02'], '<h2>章节</h2>' + source), 'info'), null, false);
  assert.equal(dom('.world-content-section > .world-content-group').length, 2);
  assert.equal(dom('.world-content-group').first().find('.world-content-separated.world-content-step').length, 0);
  assert.equal(dom('.world-content-group').first().children('.world-content-separated').length, 1);
  assert.equal(dom('.world-content-group').first().find('.world-content-step').length, 1);
  assert.equal(dom('.world-content-group').last().find('blockquote').text(), '原引用');
  assert.equal(dom('#q1').text(), 'Q1：原题');
  assert.equal(dom('#item').text(), '原条目');
  assert.equal(dom('#story').text(), '具体内容');
});

test('timeline and tag-list modes preserve authored entries in both article renderers', () => {
  const source = '<h5 id="date">2019.12.30</h5><p>构想萌生。</p><h5 id="next">2020.03.23</h5><p>正式构建网站。</p>';
  const timeline = cheerio.load(renderContainer('panel', ['rose', 'plain', 'steps', 'timeline'], source), null, false);
  assert.equal(timeline('.world-content-timeline .world-content-step').length, 2);
  assert.equal(timeline.root().text(), cheerio.load(source, null, false).root().text());
  const markdown = '{% content_panel blue compact tags %}\n\n##### 关键词\n\n- 文明塔\n- 宇宙移动\n\n{% endcontent_panel %}';
  const tags = cheerio.load(applyContainerTags(require('marked').parse(protectContainerTags(markdown))), null, false);
  assert.equal(tags('.world-content-compact.world-content-tags').length, 1);
  assert.deepEqual(tags('li').map((_, n) => tags(n).text()).get(), ['文明塔', '宇宙移动']);
});
