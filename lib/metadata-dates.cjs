'use strict';
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const zone = 'Asia/Shanghai';

function authoredTime(value, source, field) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim().replace(/^(\d{4})-(\d{1,2})-(\d{1,2})/, (_, year, month, day) => `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  const date = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)
    ? moment.parseZone(text, moment.ISO_8601, true)
    : moment.tz(text, ['YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm:ss'], true, zone);
  if (!date.isValid()) throw new Error(`[metadata-dates] Invalid ${field} in ${source}`);
  return date.valueOf();
}

function planUpdate(file, source) {
  const stat = fs.statSync(file);
  const raw = fs.readFileSync(file, 'utf8');
  const front = raw.match(/^(\uFEFF?---)(\r?\n)([\s\S]*?)(\r?\n---)(?=\r?\n|$)/);
  if (!front) return null;
  const meta = yaml.load(front[3], { schema: yaml.JSON_SCHEMA }) || {};
  if (!meta.title) return null;
  const published = authoredTime(meta.date, source, 'date');
  const updated = authoredTime(meta.updated, source, 'updated');
  // Some legacy posts have only updated: keep that existing contract.
  const field = published === null && updated === null ? 'date' : 'updated';
  const last = Math.max(published ?? -Infinity, updated ?? -Infinity);
  if (Math.floor(stat.mtimeMs / 1000) <= Math.floor(last / 1000)) return null;
  const value = moment(stat.mtimeMs).tz(zone).format('YYYY-MM-DD[T]HH:mm:ssZ');
  const line = new RegExp(`^(${field}:[ \\t]*)([^\\r\\n]*)`, 'm');
  const old = front[3].match(line);
  const comment = old?.[2].match(/[ \t]+#.*$/)?.[0] || '';
  const header = old
    ? front[3].replace(line, (_, prefix) => `${prefix}'${value}'${comment}`)
    : `${front[3]}${front[2]}${field}: '${value}'`;
  const text = front[1] + front[2] + header + front[4] + raw.slice(front[0].length);
  return { file, source, field, value, text, stat };
}

function syncMetadataDates(sourceDirectory) {
  const plans = [];
  const walk = (directory, prefix = '') => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
      const source = prefix + entry.name;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!prefix && ['lib', '_data', 'test-raw-html'].includes(entry.name)) continue;
        walk(file, source + '/');
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const plan = planUpdate(file, source);
        if (plan) plans.push(plan);
      }
    }
  };
  walk(path.resolve(sourceDirectory));
  // Validate every header before changing any file; only the selected date line changes.
  for (const plan of plans) {
    try { fs.writeFileSync(plan.file, plan.text); }
    finally { fs.utimesSync(plan.file, plan.stat.atimeMs / 1000, plan.stat.mtimeMs / 1000); }
  }
  return plans.map(({ source, field, value }) => ({ source, field, value }));
}

function registerMetadataDates(hexo) {
  hexo.extend.filter.register('before_generate', async function () {
    const command = hexo.extend.console.alias[hexo.env.cmd] || hexo.env.cmd;
    if (command !== 'generate') return;
    const changed = syncMetadataDates(hexo.source_dir);
    if (!changed.length) return;
    const Cache = hexo.model('Cache');
    for (const item of changed) {
      const id = path.relative(hexo.base_dir, path.join(hexo.source_dir, item.source)).replace(/\\/g, '/');
      const cache = Cache.findById(id);
      if (cache) {
        // Restoring mtime is intentional: invalidate the old metadata's source cache explicitly.
        cache.modified = -1;
        await cache.save();
      }
    }
    await hexo.source.process();
    hexo.locals.invalidate();
    hexo.log.info('[metadata-dates] Synced %d Markdown date fields from file modification times', changed.length);
  }, 1);
}
module.exports = { syncMetadataDates, registerMetadataDates };
