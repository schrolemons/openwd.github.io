'use strict';
const cheerio = require('cheerio');
const tones = new Set(['violet', 'blue', 'green', 'cyan', 'amber', 'rose']);

// Authored block containers share site tokens; their contents stay Markdown.
function renderContainer(kind, args = [], content = '', render = value => value) {
  let attributes;
  let tag = 'div';
  const modes = kind === 'panel' ? args.slice(1) : [];
  if (kind === 'section' || kind === 'panel') {
    const tone = args[0] || 'violet';
    if (!tones.has(tone)) throw new Error(`Unknown content tone: ${tone}`);
    for (const mode of modes) if (!['steps', 'plain', 'compact', 'group', 'separated', 'timeline', 'tags'].includes(mode)) throw new Error(`Unknown content panel mode: ${mode}`);
    attributes = `class="world-content-${kind}${kind === 'section' ? ' world-prose-section' : modes.map(mode => ' world-content-' + mode).join('')}" data-tone="${tone}"`;
    if (kind === 'section') {
      tag = 'section';
      if (args[1] && !/^\d{1,2}$/.test(args[1])) throw new Error(`Invalid chapter index: ${args[1]}`);
      if (args[1]) attributes += ` data-index="${args[1]}"`;
    }
  } else if (kind === 'grid') {
    const layout = args[0] || 'rows';
    if (!['rows', 'columns'].includes(layout)) throw new Error(`Unknown content layout: ${layout}`);
    if (args.slice(1).some(mode => mode !== 'framed')) throw new Error(`Unknown content layout mode: ${args.slice(1).join(' ')}`);
    attributes = `class="world-content-grid${args.includes('framed') ? ' world-content-framed' : ''}" data-layout="${layout}"`;
  } else throw new Error(`Unknown content container: ${kind}`);
  const html = `<${tag} ${attributes}>${render(content)}</${tag}>`;
  return modes.includes('steps') ? decorateStepPanels(html) : html;
}
function decorateStepPanels(html) {
  const $ = cheerio.load(html, null, false);
  $('.world-content-steps').each((_, node) => {
    const panel = $(node);
    if (panel.children('.world-content-step-list').length || !panel.children('h5').length) return;
    const list = $('<div class="world-content-step-list" role="list"></div>');
    let item = null, index = 0;
    for (const child of panel.contents().toArray()) {
      if (child.type === 'tag' && child.name === 'h5') {
        if (!index) $(child).before(list);
        item = $('<div class="world-content-step" role="listitem"></div>').attr('data-step', String(++index)).attr('aria-label', `第${index}项`);
        list.append(item);
      }
      if (item) item.append(child);
    }
  });
  return $.html();
}
// The standalone menu uses marked directly, so protect these block boundaries
// as comments until Markdown has rendered, then restore the same shared shell.
function protectContainerTags(markdown) {
  return markdown.replace(/\{%\s*(end)?content_(section|panel|grid)\s*([^%]*?)%\}/g,
    (_, end, kind, args) => `<!-- WORLD_CONTAINER_${end ? 'END' : 'START'} ${kind}${args.trim() ? ' ' + args.trim() : ''} -->`);
}
function applyContainerTags(html) {
  const rendered = html.replace(/<!--\s*WORLD_CONTAINER_START (section|panel|grid)([^>]*?)\s*-->/g,
    (_, kind, args) => renderContainer(kind, args.trim() ? args.trim().split(/\s+/) : []).replace(/<\/(?:section|div)>$/, ''))
    .replace(/<!--\s*WORLD_CONTAINER_END (section|panel|grid)\s*-->/g, (_, kind) => `</${kind === 'section' ? 'section' : 'div'}>`);
  return rendered.includes('world-content-steps') ? decorateStepPanels(rendered) : rendered;
}
module.exports = { renderContainer, protectContainerTags, applyContainerTags };
