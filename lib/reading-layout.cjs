'use strict';
const cheerio = require('cheerio');
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const localLink = href => (href || '').replace(/^https:\/\/world\.sch-nie\.com\/+/, '/');
const headingText = ($, node) => $(node).clone().find('.headerlink').remove().end().text().trim();

// These adapters reorganize rendered content; the Markdown remains the source
// of truth for every paragraph, date, title and destination.
function homepage(html, title, author = '') {
  const $ = cheerio.load(html, null, false);
  const intro = $('.note.danger p').html().split(/<br\s*\/?\s*>/i).map(line => line.replace(/^\s*\d\./, ''));
  const icons = ['leaf', 'layer-group', 'compass', 'users'];
  const tones = ['green', 'violet', 'amber', 'rose'];
  const routes = $('tbody tr').toArray().map((row, i) => {
    const link = $(row).find('a').first();
    return `<a class="home-route" data-tone="${tones[i]}" href="${escape(localLink(link.attr('href')))}"><i class="fa fa-${icons[i]}" aria-hidden="true"></i><span><b>${escape(link.text())}</b><span>${escape($(row).find('td').last().text())}</span></span><span aria-hidden="true">→</span></a>`;
  }).join('');
  const announcement = $('.note.info').first().find('p').html();
  const scripts = $('script').toArray().map(node => $.html(node)).join('');
  const heroTitle = title.includes('：') ? `<span class="home-title-name">${escape(title.slice(0, title.indexOf('：') + 1))}</span><span class="home-title-world">${escape(title.slice(title.indexOf('：') + 1))}</span>` : escape(title);
  return `<div class="world-home">
    <header class="home-hero"><span class="reading-eyebrow">SCHNIE / 生涅</span><h1>${heroTitle}</h1><p>${intro[0]}</p><div class="home-hero-actions"><a href="/posts/24.html">从木缘桑庭开始 <span aria-hidden="true">→</span></a><a href="/archives/">浏览全部内容</a></div><div class="home-motif" aria-hidden="true"><span>感知</span><span>创造</span><span>记录</span></div></header>
    <aside class="home-announcement" aria-labelledby="动态公告"><h2 id="动态公告"><i class="fa fa-bullhorn" aria-hidden="true"></i> 动态公告</h2><p>${announcement}</p></aside>
    <section class="home-introduction" aria-labelledby="网站介绍"><div class="reading-section-title"><span class="reading-eyebrow">ABOUT / 世界与文字</span><h2 id="网站介绍">网站介绍</h2></div><div class="home-intro-copy">${intro.slice(1).map((line, i) => `<div class="home-intro-paragraph"><span class="home-paragraph-number" aria-hidden="true">0${i + 1}</span><p>${line}</p></div>`).join('')}</div></section>
    <section class="home-navigation" aria-labelledby="导引"><div class="reading-section-title"><span class="reading-eyebrow">READING / 阅读路径</span><h2 id="导引">导引</h2></div><nav class="home-route-grid" aria-label="首页阅读导引">${routes}</nav><footer class="home-endnote"><span>SCHNIE / 生涅</span><span>${escape(author)}</span></footer></section>
  </div>${scripts}`;
}

function readingGuide(html) {
  const $ = cheerio.load(html, null, false);
  $('a[href]').each((_, a) => $(a).attr('href', localLink($(a).attr('href'))));
  const headings = new Map($('h4[id]').toArray().map(node => [headingText($, node), $(node).attr('id')]));
  const contentTones = { 主线: 'blue', 方案: 'violet', 背景: 'green', 理论: 'amber', 思维碰撞: 'cyan', 支线: 'rose' };
  const contentItem = (line, marker = '') => {
    const colon = line.indexOf('：');
    const type = colon < 0 ? '' : line.slice(0, colon);
    const title = colon < 0 ? line : line.slice(colon + 1);
    const target = headings.get(title.replace(/[<>]/g, '').trim());
    const tag = target ? 'a' : 'div';
    return `<${tag} class="guide-content-item${marker ? ' guide-choice-content' : ''}" data-tone="${contentTones[type] || 'violet'}"${target ? ` href="#${escape(target)}"` : ''}>${marker ? `<span class="guide-content-marker">${escape(marker)}</span>` : ''}<span class="guide-content-type">${escape(type)}${colon < 0 ? '' : '：'}</span><span class="guide-content-name">${escape(title)}</span>${target ? '<span class="guide-content-arrow" aria-hidden="true">↓</span>' : ''}</${tag}>`;
  };
  const types = { WORLD_LINE: ['主线', 'blue'], WORLD_PLANING: ['方案', 'violet'], WORLD_BACKGROUND: ['背景', 'green'], WORLD_THEORY: ['理论', 'amber'], THOUGHTS_COLLIDE: ['思维碰撞', 'cyan'], 'IF-LINE': ['支线', 'rose'] };
  const epochs = [];
  let epoch;
  const front = [];
  for (const node of $.root().children().toArray()) {
    const element = $(node);
    if (element.is('hr')) continue;
    if (element.is('.note.danger') && element.find('h3').length) {
      const originalHeading = element.find('h3').first();
      const fullTitle = headingText($, originalHeading);
      const match = fullTitle.match(/\s+((?:FROM,TO|FROM|TO):.*)$/);
      const name = match ? fullTitle.slice(0, match.index) : fullTitle;
      const id = originalHeading.attr('id');
      const lines = element.find('code').toArray().map(code => $(code).text());
      const branches = [];
      for (const line of lines) {
        if (/^发展[一二三]/.test(line) || !branches.length) branches.push([]);
        branches.at(-1).push(line);
      }
      const events = branches.map(branch => `<ul class="guide-events">${branch.map(line => {
        if (line.startsWith('【内容】')) return `<li class="guide-event-content">${contentItem(line.slice('【内容】'.length), '【内容】')}</li>`;
        return `<li${/^发展[一二三]|结局/.test(line) ? ' class="guide-event-key"' : ''}>${escape(line)}</li>`;
      }).join('')}</ul>`).join('');
      epoch = { id, name, header: `<header class="guide-era-header"><span class="guide-era-number">${String(epochs.length + 1).padStart(2, '0')}</span><div><span class="reading-eyebrow">${name.includes('抉择点') ? '抉择点' : '时代'}</span><h2 id="${escape(id)}">${escape(name)}</h2>${match ? `<span class="guide-era-time">${escape(match[1])}</span>` : ''}</div></header><div class="guide-era-events${branches.length > 1 ? ' has-branches' : ''}">${events}</div>`, content: [] };
      epochs.push(epoch);
    } else if (epoch && element.is('p') && /^内容包含\s*/.test(element.text())) {
      const lines = element.html().split(/<br\s*\/?\s*>/i).map(line => cheerio.load(line, null, false).text().trim()).filter(Boolean);
      const id = 'guide-contents-' + epochs.length;
      const items = lines.slice(1).map(line => contentItem(line)).join('');
      epoch.content.push(`<nav class="guide-contents" aria-labelledby="${id}"><h3 id="${id}">内容包含</h3><div>${items}</div></nav>`);
    } else if (epoch && element.is('details.note') && element.find('h4').length) {
      const heading = element.find('h4').first();
      const rawType = element.find('summary').text().trim().split('：')[0];
      const [type, tone] = types[rawType] || [rawType, 'violet'];
      const summary = element.children('p').filter((_, p) => $(p).children('strong').first().text() === '概述').first();
      const fields = element.children('p').not(summary).toArray().map(p => $.html(p)).join('');
      const metadata = element.next('p');
      let meta = '';
      if (/^【/.test(metadata.text().trim())) {
        const text = metadata.text().trim();
        const end = text.indexOf('】') + 1;
        const parts = text.slice(end).split(/\s*\|\s*/);
        meta = `<div class="guide-metadata"><p>${escape(text.slice(0, end))}</p><dl>${parts.map(part => { const split = part.indexOf('：'); return `<div><dt>${escape(part.slice(0, split))}</dt><dd>${escape(part.slice(split + 1))}</dd></div>`; }).join('')}</dl></div>`;
        metadata.attr('data-guide-consumed', 'true');
      }
      heading.find('a:not(.headerlink)').each((_, a) => $(a).attr('href', localLink($(a).attr('href'))));
      epoch.content.push(`<article class="guide-article" data-tone="${tone}"><header><span class="guide-type">${escape(type)}</span><h3 id="${escape(heading.attr('id'))}">${heading.html()}</h3></header><div class="guide-overview">${$.html(summary)}</div><details class="guide-detail"><summary>导言与解读<span aria-hidden="true">＋</span></summary><div class="guide-detail-body">${fields}${meta}</div></details></article>`);
    } else if (!element.attr('data-guide-consumed')) {
      if (epoch) epoch.content.push($.html(node)); else front.push($.html(node));
    }
  }
  const $front = cheerio.load(front.join(''), null, false);
  $front('.note').removeClass('note primary').addClass('guide-resource');
  const resources = $front('.guide-resource').toArray().map(node => $front.html(node)).join('');
  $front('.guide-resource').remove();
  $front('p').each((_, node) => {
    const paragraph = $front(node);
    if (!paragraph.text().startsWith('请严格按照【时间线顺序】阅读')) return;
    const lines = paragraph.html().split(/<br\s*\/?\s*>/i).map(line => line.trim()).filter(Boolean);
    paragraph.replaceWith(lines.map((line, i) => `<p class="${i === 0 ? 'guide-reading-rule' : 'guide-world-definition'}">${line.replace('【时间线顺序】', '<strong>【时间线顺序】</strong>').replace(/第九边缘宇宙/g, '<strong>第九边缘宇宙</strong>')}</p>`).join(''));
  });
  const nav = epochs.map((era, i) => `<a href="#${escape(era.id)}"><span>${String(i + 1).padStart(2, '0')}</span>${escape(era.name)}</a>`).join('');
  return `<div class="world-reading-guide"><div class="guide-resources">${resources}</div><aside class="guide-preface" aria-label="阅读说明"><i class="fa fa-clock" aria-hidden="true"></i><div>${$front.html()}</div></aside><nav class="guide-era-nav" aria-label="时代阅读导航"><span class="reading-eyebrow">按时间线阅读</span><div>${nav}</div></nav><div class="guide-timeline">${epochs.map(era => `<section class="guide-era">${era.header}<div class="guide-era-content">${era.content.join('')}</div></section>`).join('')}</div></div>`;
}
module.exports = { homepage, readingGuide };
