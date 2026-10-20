'use strict';
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const cheerio = require('cheerio');
const { profiles } = require('./reading-profiles.cjs');

// Read authored metadata instead of Hexo's filesystem-derived date defaults.
function authoredTime(value) {
  if (typeof value !== 'string') return NaN;
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (!match) return NaN;
  const day = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  let time = match[4].trim().replace(/^T/, '') || '00:00:00';
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(time)) time += '+08:00';
  return Date.parse(`${day}T${time}`);
}
const plainText = html => {
  const $ = cheerio.load(String(html || ''), null, false);
  $('script,style,iframe,.headerlink,.photos-item,.world-media-paragraph').remove();
  return $.root().text().replace(/\s+/g, ' ').trim();
};
const list = value => (Array.isArray(value) ? value.flat(Infinity) : value ? [value] : []).map(String).filter(Boolean);
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });

function collectRecentUpdates(documents, sourceDirectory, root = '/') {
  const seen = new Set();
  const entries = [];
  for (const document of documents) {
    const source = String(document.source || '').replace(/\\/g, '/');
    if (!/\.md$/i.test(source) || seen.has(source) || /^(?:index\.md$|404\.md$|lib\/|test-raw-html\/|_drafts\/|_data\/)/i.test(source)) continue;
    seen.add(source);
    const file = path.resolve(sourceDirectory, source);
    if (!file.startsWith(path.resolve(sourceDirectory) + path.sep) || !fs.existsSync(file)) continue;
    const match = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const meta = match ? yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) || {} : {};
    if (!meta.title || meta.published === false || document.published === false || meta.layout === false || meta.directory_collection || /^(?:home|directory)$/.test(meta.reading_style || '') || /^(?:tags|categories|archives|404)$/.test(String(meta.type || '')) || /^(?:archives|tags|categories)\//.test(source)) continue;
    if (!document.path) continue;
    const updated = authoredTime(meta.updated), published = authoredTime(meta.date);
    const timestamp = Number.isFinite(updated) ? updated : Number.isFinite(published) ? published : fs.statSync(file).mtimeMs;
    const dateLabel = Number.isFinite(updated) ? '更新' : Number.isFinite(published) ? '发布' : '文件更新';
    const $ = cheerio.load(document.content || '', null, false);
    $('script,style,iframe,.photos-item,.world-media-paragraph').remove();
    const paragraphs = $('p').toArray().filter(node => {
      const p = $(node);
      return p.text().trim() && !p.find('img,video,iframe').length && !p.hasClass('world-ui-copy') && !p.hasClass('world-entry-paragraph') && !/^定向\s*到/.test(p.text().trim());
    });
    const excerpt = meta.description || meta.summary || meta.excerpt;
    const copy = excerpt ? plainText(excerpt).replace(/\*\*|__/g, '') : paragraphs.slice(0, 2).map(node => plainText($(node).html())).join(' ');
    const characters = Array.from(copy);
    const profile = profiles[meta.reading_style];
    const tone = ['violet', 'blue', 'green', 'cyan', 'amber', 'rose'].includes(meta.reading_tone) ? meta.reading_tone : profile?.tone || 'amber';
    entries.push({ title: String(meta.title), url: `${root.replace(/\/$/, '')}/${document.path.replace(/^\//, '')}`, source, timestamp, date: dayFormatter.format(timestamp), dateLabel, categories: list(meta.categories), tags: list(meta.tags), kind: profile?.label || '', tone, summary: characters.length > 140 ? characters.slice(0, 140).join('') + '…' : copy });
  }
  return entries.sort((a, b) => b.timestamp - a.timestamp || a.source.localeCompare(b.source, 'zh-CN')).slice(0, 3);
}
module.exports = { collectRecentUpdates };
