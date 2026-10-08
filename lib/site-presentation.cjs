'use strict';
const yaml = require('js-yaml');
const { readingProfile } = require('./reading-profiles.cjs');
function sourceMetadata(source = '') {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const data = match ? yaml.load(match[1]) || {} : {};
  const day = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
  const date = day(data.date), updated = day(data.updated);
  return { author: typeof data.author === 'string' ? data.author : '', date, updated: updated !== date ? updated : '' };
}
function categoryList(value) {
  return value?.toArray ? value.toArray() : Array.isArray(value) ? value : value ? [value] : [];
}
function copyrightEnabled(document = {}, creativeCommons = {}, contentPage = false) {
  if (!creativeCommons.license || !creativeCommons.post || document.copyright === false) return false;
  if (contentPage) {
    const source = (document.source || '').replace(/\\/g, '/');
    // Navigation, utilities and vendored documentation are not authored reading pages.
    if (!readingProfile(document) || /^(?:404\.md$|lib\/|test-raw-html\/)/i.test(source)) return false;
  }
  return true;
}
module.exports = { sourceMetadata, categoryList, copyrightEnabled };
