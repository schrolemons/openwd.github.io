'use strict';

const fs = require('fs');
const path = require('path');
const marked = require('marked');
const yaml = require('js-yaml');
const { protectContainerTags, applyContainerTags } = require('../lib/content-containers.cjs');

const POSTS_DIR = path.join(__dirname, '..', 'source', '_posts');
const OUTPUT_DIR = path.join(__dirname, '..', 'source', 'menu', 'posts');

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { front: {}, body: content };
  try {
    return { front: yaml.load(match[1]) || {}, body: content.slice(match[0].length) };
  } catch (e) {
    return { front: {}, body: content };
  }
}

function protectHexoTags(mdContent) {
  mdContent = mdContent.replace(/(\S[^\r\n]*)\r?\n(\{%\s*(?:note|endnote)\s)/gi, '$1\n\n$2');
  mdContent = mdContent.replace(/(\{%\s*(?:note|endnote)\s[^%]*%\})\r?\n(\S)/gi, '$1\n\n$2');

  mdContent = mdContent.replace(/\{%\s*note\s+(primary|success|warning|danger|info)(\s+[^%]+)?\s*%\}/gi, function(match, type, extra) {
    var label = extra ? extra.trim() : '';
    return '<!-- HEXO_NOTE_START ' + type.toLowerCase() + (label ? ' ' + label : '') + ' -->';
  });
  mdContent = mdContent.replace(/\{%\s*endnote\s*%\}/gi, '<!-- HEXO_ENDNOTE -->');
  mdContent = mdContent.replace(/<!--more-->/g, '');

  return protectContainerTags(mdContent);
}

function applyHexoTags(html) {
  html = html.replace(/<!--\s*HEXO_NOTE_START\s+(primary|success|warning|danger|info)(?:\s+(.*?))?\s*-->/gi, function(match, type, label) {
    var labelHtml = '';
    if (label && label.trim()) {
      labelHtml = '<div class="md-note-label">' + label.trim() + '</div>';
    }
    return '<div class="md-note md-note-' + type.toLowerCase() + '">' + labelHtml;
  });

  html = html.replace(/<!--\s*HEXO_ENDNOTE\s*-->/gi, '</div>');

  return applyContainerTags(html);
}

function markdownToHtml(mdContent) {
  return marked.parse(mdContent, { breaks: true });
}

function wrapHtml(title, bodyHtml) {
  return '<div class="menu-article">' +
    '<h1 class="menu-article-title">' + title + '</h1>' +
    '<div class="menu-article-body">' + bodyHtml + '</div>' +
    '</div>';
}

function getAllMdFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const mdFiles = getAllMdFiles(POSTS_DIR);
  let generated = 0;
  let skipped = 0;

  mdFiles.forEach(function(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { front, body } = parseFrontMatter(raw);

    const abbrlink = front.abbrlink;
    if (!abbrlink) {
      console.warn('[menu-posts] skip (no abbrlink): ' + path.basename(filePath));
      return;
    }

    let protectedBody = protectHexoTags(body);
    let htmlBody = markdownToHtml(protectedBody);
    let after = applyHexoTags(htmlBody);
    let title = front.title || path.basename(filePath, '.md');
    let finalHtml = wrapHtml(title, after);

    const outPath = path.join(OUTPUT_DIR, String(abbrlink) + '.htmlpart');

    if (fs.existsSync(outPath)) {
      const existing = fs.readFileSync(outPath, 'utf-8');
      if (existing === finalHtml) { skipped++; return; }
    }

    fs.writeFileSync(outPath, finalHtml, 'utf-8');
    generated++;
  });

  if (generated > 0) {
    console.log('[menu-posts] Generated ' + generated + ' files' + (skipped > 0 ? ', skipped ' + skipped + ' unchanged' : '') + ' in ' + OUTPUT_DIR);
  } else {
    console.log('[menu-posts] All ' + skipped + ' files up-to-date');
  }
}

main();
