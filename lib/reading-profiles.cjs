'use strict';
const cheerio = require('cheerio');
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
function decorateReading(html = '') {
  const $ = cheerio.load(html, null, false);
  $('table').each((_, node) => {
    if (!$(node).parent().is('.reading-table-scroll')) $(node).wrap('<div class="reading-table-scroll" tabindex="0" role="region" aria-label="表格，可横向滚动"></div>');
  });
  return $.html();
}
module.exports = { profiles, inferStyle, readingProfile, decorateReading };
