'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const { decorateReading } = require('../lib/reading-profiles.cjs');

test('copyright eligibility preserves post settings and only extends to published Markdown content pages', () => {
  const { copyrightEnabled } = require('../lib/site-presentation.cjs');
  const cc={license:'by-nc-sa',post:true};
  const post={source:'_posts/story.md'}, page={source:'yinxing_world/resion/shiheng.md',reading_style:'lore'};
  assert.equal(copyrightEnabled(post,cc),true);
  assert.equal(copyrightEnabled(page,cc,true),true);
  assert.equal(copyrightEnabled({...page,copyright:false},cc,true),false);
  assert.equal(copyrightEnabled({...post,copyright:false},cc),false);
  assert.equal(copyrightEnabled(page,{...cc,license:''},true),false);
  assert.equal(copyrightEnabled(page,{...cc,post:false},true),false);
  assert.equal(copyrightEnabled(page,{},true),false);
  assert.equal(copyrightEnabled({...page,copyright_reprint:true,post_link:'https://example.org/original'},cc,true),true);
  for(const document of [{source:'index.md'},{source:'archives/index.md'},{source:'categories/index.md',type:'categories'},{source:'tags/index.md',type:'tags'},{source:'bingjie_domain/index.md',directory_collection:'bingjie_domain'},{source:'404.md'},{source:'test-raw-html/index.md'},{source:'lib/pace/README.md'},{source:'lib/reading_progress/README.md'},{source:'raw.html'},{...page,layout:false}]){
    assert.equal(copyrightEnabled(document,cc,true),false,document.source);
  }
});

test('page scalar categories remain complete labels and post queries preserve paths', () => {
  const { categoryList } = require('../lib/site-presentation.cjs');
  assert.deepEqual(categoryList('现世之篇'), ['现世之篇']);
  const categories = [{ name: '文明', path: 'categories/文明/' }];
  assert.deepEqual(categoryList({ toArray: () => categories }), categories);
  assert.deepEqual(categoryList(categories), categories);
});

test('standalone adapter shares theme assets without rewriting authored scripts or content', () => {
  const { presentStandalone } = require('../lib/standalone-presentation.cjs');
  const source = '<!DOCTYPE html><html><head><style>.original{color:red}</style></head><body class="original"><h1>原文</h1><script>let original = "<body>";</script></body></html>';
  const result = presentStandalone(source);
  const $ = cheerio.load(result);
  assert.ok($('body').hasClass('original'));
  assert.ok($('body').hasClass('world-standalone'));
  assert.equal($('link[href="/css/world-ui.css"]').length, 1);
  assert.equal($('script:not([src])').html(), 'let original = "<body>";');
  assert.equal($('h1').text(), '原文');
  assert.equal($('style').html(), '.original{color:red}');
  assert.equal(presentStandalone(result), result);
});

test('sections keep every original node, poem line, anchor, script and fold state', () => {
  const html = '<p>第一行<br>第二行</p><hr><h2 id="setting">设定</h2><details open><summary>资料</summary><p>说明</p></details><script>window.original=1;</script><h2 id="end">结尾</h2><p><a href="/original">原文</a></p>';
  const $ = cheerio.load(decorateReading(html), null, false);
  assert.equal($('.world-prose-section').length, 3);
  assert.equal($('hr.world-section-break').length, 1);
  assert.equal($('br').length, 1);
  assert.equal($('details[open]').length, 1);
  assert.equal($('#setting').text(), '设定');
  assert.equal($('a').attr('href'), '/original');
  assert.equal($('script').html(), 'window.original=1;');
  assert.equal($.text(), cheerio.load(html, null, false).text());
  assert.equal(cheerio.load(decorateReading($.html()), null, false)('.world-prose-section').length, 3, 'idempotent');
});

test('plain narrative remains a single continuous reading block', () => {
  const $ = cheerio.load(decorateReading('<p>故事一</p><p>故事二</p>'), null, false);
  assert.equal($('.world-prose-section').length, 1);
  assert.equal($('.world-prose-section > p').length, 2);
});

test('authored ideographic spaces remain in the source text without doubling automatic indentation',()=>{
  const html='<p>　　首段<br>　　下一段</p>', $=cheerio.load(decorateReading(html,'story'),null,false);
  assert.equal($('.world-source-indent').length,2);
  assert.equal($.text(),cheerio.load(html,null,false).text());
  assert.equal(cheerio.load(decorateReading($.html(),'story'),null,false)('.world-source-indent').length,2);
});

test('natural paragraphs get independent indentation without losing inline formatting or original breaks', () => {
  const html = '<p>开头<strong>强调</strong><br>其次<code>术语</code><br>结尾<a href="/end">链接</a></p><div class="note"><p>说明<br>行二</p></div><p><img src="/art.png"><br>配图</p>';
  const result = decorateReading(html, 'story');
  const $ = cheerio.load(result, null, false);
  assert.equal($('.world-paragraph-line').length, 5);
  assert.equal($('br').length, 4);
  assert.equal($('.world-paragraph-line strong').text(), '强调');
  assert.equal($('.world-paragraph-line code').text(), '术语');
  assert.equal($('.world-paragraph-line a').attr('href'), '/end');
  assert.equal($.text(), cheerio.load(html, null, false).text());
  assert.equal(cheerio.load(decorateReading(result, 'story'), null, false)('.world-paragraph-line').length, 5);
  assert.equal(cheerio.load(decorateReading(html, 'poetry'), null, false)('.world-paragraph-line').length, 0);
  assert.equal(cheerio.load(decorateReading(html, 'info'), null, false)('.world-paragraph-line').length, 5);
});

test('header only presents source-backed dates and authors', () => {
  const { sourceMetadata } = require('../lib/site-presentation.cjs');
  const meta = sourceMetadata('---\ntitle: 资料\nauthor: 合作者\ndate: 2025-02-22 19:28:51\nupdated: 2026-10-02 12:00:00\n---\n正文');
  assert.deepEqual(meta, { author: '合作者', date: '2025-02-22', updated: '2026-10-02' });
  assert.deepEqual(sourceMetadata('---\ntitle: 无日期\n---\n正文'), { author: '', date: '', updated: '' });
  assert.deepEqual(sourceMetadata('<html><h1>原始页面</h1></html>'), { author: '', date: '', updated: '' });
});

test('content modules preserve source nodes and fold state while organizing plans, people and contacts', () => {
  const {decorateContent}=require('../lib/content-layout.cjs');
  const html='<section class="world-prose-section"><div class="note primary"><h3 id="heading">标题</h3></div><details class="note info"><summary>协作者档案：原名</summary><p>原文<strong>强调</strong><a href="/original">链接</a></p></details><div class="note info"><h4>PART1：方法</h4><p>第一项</p></div><div class="note info"><h4>PART2：方法</h4><p>第二项</p></div><script>window.original=1;</script></section>';
  const result=decorateContent(html,'light_withme/operator/index.md');
  const $=cheerio.load(result,null,false);
  assert.equal($.text(),cheerio.load(html,null,false).text());
  assert.equal($('.world-person-card').length,1);
  assert.equal($('details[open]').length,0);
  assert.equal($('.world-module-grid > .note').length,2);
  assert.equal($('a').attr('href'),'/original');
  assert.equal($('script').html(),'window.original=1;');
  assert.equal(cheerio.load(decorateContent(result,'light_withme/operator/index.md'),null,false)('.world-module-grid').length,1);
  assert.equal(decorateContent(html,'other/index.md'),html);
  assert.equal(cheerio.load(decorateContent(html,'about/index.md'),null,false)('.world-contact-grid > .note').length,2);
  assert.equal(cheerio.load(decorateContent(html,'light_withme/key_part/index.md'),null,false)('.world-module-heading').length,1);
  const person='<section class="world-prose-section"><details class="note info"><summary><p>协作者档案：原名</p></summary><p>本网站的<strong>起源建设者</strong>。<br>贡献说明<a href="/original">原链接</a><br>入职日：2024-9-1</p></details></section>';
  const profile=cheerio.load(decorateReading(person,'profile','light_withme/operator/index.md'),null,false);
  assert.equal(profile.text().replace(/\s+/g,''),cheerio.load(person,null,false).text().replace(/\s+/g,''));
  assert.equal(profile('.world-person-name').text(),'原名');
  assert.equal(profile('summary .world-person-role').text(),'本网站的起源建设者。');
  assert.equal(profile('.world-person-meta').attr('data-date'),'入职日：2024-9-1');
  assert.equal(profile('details[open]').length,0);
  assert.equal(profile('a').attr('href'),'/original');
});
