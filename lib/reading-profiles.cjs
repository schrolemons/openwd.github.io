'use strict';
const cheerio = require('cheerio');
const { prepend } = require('domutils');
const { decorateContent, decorateFileNotes } = require('./content-layout.cjs');
const profiles = {
  story: { label: '故事', description: '文明历程与人物叙事', tone: 'blue' },
  lore: { label: '设定', description: '世界背景、机制与构造', tone: 'violet' },
  essay: { label: '随笔', description: '思考、感受与记录', tone: 'green' },
  poetry: { label: '诗文', description: '诗化表达与意象', tone: 'cyan' },
  info: { label: '信息', description: '项目说明与相关资料', tone: 'cyan' },
  profile: { label: '人物档案', description: '人物、设计与协作信息', tone: 'amber' },
  guide: { label: '阅读导览', description: '时间线与篇目解读', tone: 'green' }
};
const tones = { 金: 'amber', 木: 'green', 水: 'blue', 火: 'rose', 土: 'amber', 风: 'cyan', 雷: 'violet', 草: 'green', 冰: 'cyan', 光: 'amber', 阴: 'violet', 阳: 'rose' };
const list = value => value?.toArray ? value.toArray() : Array.isArray(value) ? value : value ? [value] : [];
function inferStyle(document) {
  const source = (document.source || '').replace(/\\/g, '/');
  const id = String(document.abbrlink || '');
  if (source === 'index.md') return 'home';
  if (document.directory_collection || document.type === 'tags' || document.type === 'categories' || source === 'archives/index.md') return 'directory';
  if (id === '24') return 'guide';
  if (id === '10') return 'poetry';
  if ([3, 15, 29, 9, 12, 16].map(String).includes(id) || source.includes('/resion/')) return 'lore';
  if ([4, 5, 7, 8, 11, 14, 17, 18, 19, 20, 21, 30, 1117].map(String).includes(id) || source.includes('/commission/')) return 'story';
  if (source.includes('/nowadays/')) return 'essay';
  if (source.includes('/character/') || source.startsWith('light_withme/operator/')) return 'profile';
  return 'info';
}
function readingProfile(document = {}) {
  if (document.layout === false || document.layout === 'false' || !/\.md$/i.test(document.source || '')) return null;
  const style = document.reading_style || inferStyle(document);
  if (style === 'home' || style === 'directory') return null;
  if (!profiles[style]) throw new Error(`Unknown reading_style: ${style} (${document.source})`);
  const tone = document.reading_tone || tones[list(document.tags).map(tag => tag.name || tag).find(name => tones[name])] || profiles[style].tone;
  if (!['violet', 'blue', 'green', 'cyan', 'amber', 'rose'].includes(tone)) throw new Error(`Unknown reading_tone: ${tone} (${document.source})`);
  return { style, ...profiles[style], tone };
}
function decorateReading(html = '', style = '', source = '') {
  const $ = cheerio.load(html, null, false);
  $('blockquote').addClass('world-emphasis-quote');
  $.root().children('hr').addClass('world-section-break');
  $('table').each((_, node) => {
    if (!$(node).parent().is('.reading-table-scroll')) $(node).wrap('<div class="reading-table-scroll" tabindex="0" role="region" aria-label="表格，可横向滚动"></div>');
  });
  // Group only top-level source sections; never split poems, notes or lists.
  if (!$.root().children('.world-prose-section').length) {
    let section = null;
    const nodes = $.root().contents().toArray();
    for (const node of nodes) {
      if (node.type === 'tag' && node.name === 'hr') {
        $(node).addClass('world-section-break');
        section = null;
        continue;
      }
      if (node.type === 'tag' && /^(h1|h2)$/.test(node.name)) section = null;
      if (node.type === 'text' && !node.data.trim() && !section) continue;
      if (!section) {
        section = $('<section class="world-prose-section"></section>');
        $(node).before(section);
      }
      section.append(node);
    }
  }
  if (style && style !== 'poetry') {
    $('p').each((_, node) => {
      const paragraph = $(node);
      if (paragraph.closest('li,td,th,summary,.photos-item,.content-directory,.world-reading-guide').length || !paragraph.text().trim()) return;
      if (paragraph.find('img,video,iframe').length) { paragraph.addClass('world-media-paragraph'); return; }
      if (/^定向\s*到\s*/.test(paragraph.text().trim()) && paragraph.find('a[href]').length) { paragraph.addClass('world-ui-copy'); return; }
      paragraph.addClass('world-natural-paragraph');
      const meaningful = paragraph.contents().toArray().filter(child => child.type !== 'text' || child.data.trim());
      if (meaningful.length && meaningful.every(child => child.type === 'tag' && child.name === 'a')) paragraph.addClass('world-entry-paragraph');
      if (paragraph.hasClass('world-paragraph-lines') || !paragraph.children('br').length) return;
      paragraph.addClass('world-paragraph-lines');
      const children = paragraph.contents().toArray();
      paragraph.empty();
      let line = null;
      for (const child of children) {
        if (child.type === 'tag' && child.name === 'br') {
          $(child).addClass('world-paragraph-break');
          paragraph.append(child);
          line = null;
          continue;
        }
        if (!line) {
          line = $('<span class="world-paragraph-line"></span>');
          paragraph.append(line);
        }
        line.append(child);
      }
    });
    // Old articles sometimes carry two authored ideographic spaces already.
    // Retain those source characters in the DOM, but let the common indent own their visual width.
    $('.world-natural-paragraph:not(.world-paragraph-lines),.world-paragraph-line').each((_,node)=>{
      const item=$(node);if(item.find('.world-source-indent').length)return;
      const texts=item.find('*').addBack().contents().toArray().filter(child=>child.type==='text'&&child.data.trim());
      const first=texts[0],match=first?.data.match(/^[ \t\r\n]*[\u3000\u00a0\u2000-\u200a\u202f]+/);
      if(match){prepend(first,$('<span class="world-source-indent" aria-hidden="true"></span>').text(match[0])[0]);first.data=first.data.slice(match[0].length);}
    });
  }
  return decorateFileNotes(decorateContent($.html(), source));
}
module.exports = { profiles, inferStyle, readingProfile, decorateReading };
