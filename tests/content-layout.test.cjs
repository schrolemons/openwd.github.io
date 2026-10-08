'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const cheerio=require('cheerio');
const {decorateContent,decorateFileNotes}=require('../lib/content-layout.cjs');
const {featureTone}=require('../lib/content-directory.cjs');
test('static file titles retain all authored content and IDs without converting native disclosures',()=>{
  const original='<div class="note success"><h4 id="quote">积蓄万千载流。</h4></div><details class="note info"><summary>档案</summary><h3>详细介绍</h3><p>正文</p></details>';
  const html=decorateFileNotes(original),$=cheerio.load(html,null,false);
  assert.equal($('.world-file-note').length,1);
  assert.equal($('#quote.world-file-title').length,1);
  assert.equal($('details.world-file-note').length,0);
  assert.equal($.text(),cheerio.load(original,null,false).text());
  assert.equal(decorateFileNotes(html),html);
});
test('triad navigation follows the same perception/create/record order',()=>{
  const fs=require('node:fs');
  const $=cheerio.load(fs.readFileSync('public/tags/index.html','utf8'));
  assert.deepEqual($('.directory-tag-group').last().find('.directory-tag-name').map((_,node)=>$(node).text()).get(),['感知','创造','记录']);
});
test('article entrance tone follows its first static note, then its source reading metadata',()=>{
  for(const [type,tone] of Object.entries({primary:'violet',success:'green',warning:'amber',danger:'rose',info:'blue'})){
    assert.equal(featureTone({source:'article.md',reading_tone:'cyan',content:`<details class="note danger"><summary>展开</summary></details><div class="note ${type}"><h3>题签</h3></div>`}),tone);
  }
  assert.equal(featureTone({source:'article.md',reading_tone:'cyan',content:'<p>文章</p>'}),'cyan');
  assert.equal(featureTone({content:''}),'violet');
});
test('plan adapter derives its diagram and sequential modules from source while preserving text and destinations',()=>{
  const fs=require('node:fs'),{decorateReading}=require('../lib/reading-profiles.cjs');
  const doc=JSON.parse(fs.readFileSync('db.json','utf8')).models.Page.find(page=>page.source==='light_withme/key_part/index.md');
  const html=decorateReading(doc.content,'info',doc.source),$=cheerio.load(html,null,false),before=cheerio.load(doc.content,null,false);
  assert.deepEqual($('.world-triad-term').map((_,node)=>$(node).attr('data-label')).get(),['感知','创造','记录']);
  assert.equal($('.world-triad-index i,.world-triad-index svg,.world-triad-index img,.world-logo-symbol').length,0,'triad terms have no invented logos');
  assert.deepEqual($('.world-logo-detail').map((_,node)=>$(node).attr('data-number')).get(),['12','12','04']);
  assert.ok($('.world-logo-details').hasClass('world-ui-copy'),'structured quantity fields use UI alignment, while the prose remains indented');
  assert.equal($('.world-plan-task').length,2);
  assert.equal($('.world-participation-step[data-step]').length,2);
  assert.ok($('.world-module-eyebrow').toArray().every(node=>!$(node).text().endsWith('-')),'plan heading delimiter is absent from its visible label');
  assert.equal($('.world-module-title').length,3,'concise or contextual source headings retain their title treatment');
  assert.equal($('.world-welcome-line.world-ui-copy').length,1,'the welcome line is a contextual UI notice');
  assert.equal($.text().replace(/\s/g,''),before.text().replace(/\s/g,''));
  assert.deepEqual($('a[href]').map((_,node)=>$(node).attr('href')).get(),before('a[href]').map((_,node)=>before(node).attr('href')).get());
  assert.equal($('br').length,before('br').length);
  assert.equal(decorateReading(html,'info',doc.source),html);
});
test('plan headings support concise source titles and retain legacy delimiters only as hidden source text',()=>{
  for(const prefix of ['', '第九边缘发行计划-']){
    const original=['logo设计','现况','内容'].map((title,index)=>`<section class="world-prose-section"><div class="note info"><h3 id="module-${index}"><a class="headerlink" href="#module-${index}"></a>${prefix}${title}</h3></div></section>`).join('');
    const html=decorateContent(original,'light_withme/key_part/index.md'),$=cheerio.load(html,null,false);
    assert.deepEqual($('.world-module-title').map((_,node)=>$(node).text()).get(),['logo设计','现况','内容']);
    assert.equal($('.world-module-eyebrow').length,prefix?3:0,'no context label is invented for concise source headings');
    assert.equal($('.world-module-delimiter[aria-hidden="true"]').length,prefix?3:0);
    assert.equal($('.world-plan-logo,.world-plan-status,.world-plan-participation').length,3);
    assert.equal($.text(),cheerio.load(original,null,false).text());
    assert.equal($('.headerlink').length,3);
    assert.equal(decorateContent(html,'light_withme/key_part/index.md'),html);
  }
});
test('status cards preserve separate Markdown paragraphs inside or outside blockquotes',()=>{
  const original='<section class="world-prose-section"><div class="note info"><h3>现况</h3><p>当前时间点 FROM,TO:NOW</p></div><blockquote><p class="world-natural-paragraph">第一项<strong>任务</strong>。</p></blockquote><p class="world-natural-paragraph">第二项任务。</p></section>';
  const html=decorateContent(original,'light_withme/key_part/index.md'),$=cheerio.load(html,null,false);
  assert.deepEqual($('.world-plan-task').map((_,node)=>$(node).attr('data-sequence')).get(),['01','02']);
  assert.equal($.text(),cheerio.load(original,null,false).text());
  assert.equal(decorateContent(html,'light_withme/key_part/index.md'),html);
});
test('resource card groups original heading and description, retaining the file link and complete text',()=>{
  const original='<section class="world-prose-section"><div class="note primary"><h3 id="resource">管理条目<a class="headerlink" href="#resource"></a></h3></div><blockquote><p>此处简要列出创作成果。<br><a href="https://example.com/成果.xlsx">第九边缘管理条目</a></p></blockquote></section>';
  const html=decorateContent(original,'light_withme/operator/index.md'),$=cheerio.load(html,null,false),before=cheerio.load(original,null,false);
  assert.equal($('.world-resource-copy h3').text(),'管理条目');
  assert.equal($('.world-resource-action > a').attr('href'),'https://example.com/成果.xlsx');
  assert.equal($('.world-module-resource').attr('data-file-kind'),'XLSX');
  assert.equal($.text(),before.text());
  assert.equal($('br').length,before('br').length);
  assert.equal($('#resource .headerlink').length,1);
  assert.equal(decorateContent(html,'light_withme/operator/index.md'),html);
});
test('Wechat QR trigger retains the original image destination as a no-script fallback',()=>{
  const html='<section class="world-prose-section"><div class="note info"><h3>添加微信</h3><p><a href="http://world.sch-nie.com/images/wechat_channel.png">添加微信</a></p></div></section>';
  const $=cheerio.load(decorateContent(html,'about/index.md'),null,false),link=$('a');
  assert.equal(link.attr('href'),'http://world.sch-nie.com/images/wechat_channel.png');
  assert.equal(link.attr('data-qr-src'),'/images/wechat_channel.png');
  assert.equal(link.attr('data-qr-title'),'添加微信');
  assert.equal(link.attr('aria-haspopup'),'dialog');
  assert.equal(link.text(),'添加微信');
  assert.equal($('p').hasClass('world-ui-copy'),true);
  assert.equal($('p').hasClass('world-natural-paragraph'),false);
});
