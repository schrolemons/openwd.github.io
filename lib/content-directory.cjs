'use strict';
const cheerio = require('cheerio');
const { readingProfile } = require('./reading-profiles.cjs');
const array = value => value?.toArray ? value.toArray() : Array.isArray(value) ? value : [];
const compare = order => (a, b) => {
  const rank = name => order.includes(name) ? order.indexOf(name) : order.length;
  return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'zh-CN');
};
function entry(document, withExcerpt = false) {
  const outer = cheerio.load(document.content || '');
  const html = outer('iframe[srcdoc]').first().attr('srcdoc') || document.content || '';
  const content = cheerio.load(html);
  const sourceName = (document.source || '').replace(/\\/g, '/').split('/');
  const fallback = sourceName.at(-1)?.startsWith('index.') ? sourceName.at(-2) : sourceName.at(-1)?.replace(/\.[^.]+$/, '');
  const title = document.title || content('title').first().text().trim() || content('h1').first().text().trim() || fallback || '内容入口';
  let excerpt = '';
  if (withExcerpt) {
    const $ = cheerio.load(document.excerpt || html);
    $('head, script, style, noscript, h1, h2, h3, h4, h5, h6').remove();
    $('p').filter((_, element) => /^定向\s*到\s*/.test($(element).text().trim())).remove();
    const letters = Array.from($.root().text().replace(/\s+/g, ' ').trim());
    excerpt = letters.slice(0, 86).join('') + (letters.length > 86 ? '…' : '');
  }
  return { id: document._id, title, tone: featureTone(document), path: document.link || document.path,
    external: !!document.link, tags: array(document.tags).slice(0, 3).map(tag => tag.name),
    date: withExcerpt && document.date?.format ? document.date.format('YYYY-MM-DD') : '',
    author: withExcerpt ? document.author || '' : '', excerpt };
}
function featureTone(document={}) {
  const $=cheerio.load(document.content||'');
  const note=$('.note:not(details)').first();
  const palette={primary:'violet',success:'green',warning:'amber',danger:'rose',info:'blue',default:'blue'};
  const classes=(note.attr('class')||'').split(/\s+/);
  return Object.keys(palette).filter(name=>classes.includes(name)).map(name=>palette[name])[0] || readingProfile(document)?.tone || 'violet';
}
function categoryTree(categories, posts, settings = {}) {
  const nodes = new Map(array(categories).map(category => [category._id, {
    id: category._id, parent: category.parent, name: category.name, path: category.path,
    anchor: 'category-' + encodeURIComponent(category.path).replace(/%/g, '_').replace(/\//g, '-'),
    children: [], entries: [], count: 0, depth: 0
  }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parent);
    if (parent) parent.children.push(node); else roots.push(node);
  }
  for (const post of array(posts)) {
    const cats = array(post.categories);
    // Hexo associates a post with every ancestor; only place it in the leaf.
    const parents = new Set(cats.map(cat => cat.parent).filter(Boolean));
    const leaf = cats.findLast(cat => !parents.has(cat._id));
    if (leaf && nodes.has(leaf._id)) nodes.get(leaf._id).entries.push(entry(post));
    else {
      if (!nodes.has('uncategorized')) {
        const node = { id: 'uncategorized', name: '未分类', path: '', anchor: 'category-uncategorized', children: [], entries: [], count: 0, depth: 0 };
        nodes.set(node.id, node); roots.push(node);
      }
      nodes.get('uncategorized').entries.push(entry(post));
    }
  }
  function finish(node, depth, tone) {
    node.depth = depth;
    node.tone = tone || settings.civilizations?.[node.name]?.tone || 'violet';
    node.symbol = settings.civilizations?.[node.name]?.symbol || '◇';
    node.entries.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    node.children.sort(compare(settings.category_order || []));
    node.children.forEach(child => finish(child, depth + 1, node.tone));
    node.count = node.entries.length + node.children.reduce((count, child) => count + child.count, 0);
  }
  roots.sort(compare(settings.civilization_order || []));
  roots.forEach(node => finish(node, 0));
  return { roots, nodes };
}
function folderTree(pages, settings = {}, collectionKey = 'yinxing_world', posts = []) {
  const info = settings.collections?.[collectionKey] || { title: '阴行世界', tone: 'violet', folders: settings.folders || {} };
  const prefix = collectionKey + '/';
  const folders = info.folders || {};
  const nodes = new Map();
  function ensureFolder(key) {
    const parts = key.split('/');
    for (let depth = 1; depth <= parts.length; depth++) {
      const name = parts.slice(0, depth).join('/');
      if (!nodes.has(name)) {
        const folder = folders[name] || {};
        nodes.set(name, { key: name, name: folder.title || parts[depth - 1], description: folder.description || '', icon: folder.icon || 'folder-open', tone: folder.tone || info.tone, heading_id: folder.heading_id || '', path: prefix + name + '/', children: [], entries: [], count: 0, depth: depth - 1 });
      }
    }
    return nodes.get(key);
  }
  for (const page of array(pages)) {
    const source = (page.source || '').replace(/\\/g, '/');
    if (!source.startsWith(prefix) || page.directory_collection || page.layout === 'directory') continue;
    const parts = source.slice(prefix.length).split('/');
    if (parts.length < 2) continue;
    if ((info.excluded_folders || []).some(key => parts.join('/').startsWith(key + '/'))) continue;
    parts.pop();
    const item = entry(page, true);
    if (/\/index\.[^/]+$/.test(source)) item.path = prefix + parts.join('/') + '/';
    const folderKey = parts.join('/');
    const flatKey = Object.keys(folders).find(key => folders[key].flatten && (folderKey === key || folderKey.startsWith(key + '/')));
    if (flatKey && folderKey === flatKey && folders[flatKey].exclude_index && /\/index\.[^/]+$/.test(source)) continue;
    ensureFolder(flatKey || folderKey).entries.push(item);
  }
  for (const [key, folder] of Object.entries(folders)) {
    for (const item of folder.entries || []) ensureFolder(key).entries.push({ title: item.title, path: item.path, excerpt: item.description || '', date: '', author: '', tags: [], external: /^https?:/.test(item.path), kind: item.kind || '' });
    if (folder.headings?.length) {
      const post = array(posts).find(post => String(post.abbrlink) === String(info.source_post));
      if (!post) throw new Error(`Collection source post missing: ${collectionKey}`);
      const $ = cheerio.load(post.content || '');
      for (const title of folder.headings) {
        const heading = $('h1, h2, h3, h4, h5, h6').toArray().find(element => $(element).clone().find('.headerlink').remove().end().text().trim() === title);
        if (!heading?.attribs.id) throw new Error(`Collection heading missing: ${collectionKey} / ${title}`);
        const container = $(heading).closest('.note, .world-content-panel, .world-content-section');
        const block = container.length ? container : $(heading);
        const fragments = [block.clone()];
        for (const sibling of block.nextAll().toArray()) {
          if ($(sibling).is('hr, h1, h2, h3, h4, h5, h6') || $(sibling).find('h1, h2, h3, h4, h5, h6').length) break;
          fragments.push($(sibling).clone());
        }
        const html = fragments.map(fragment => $.html(fragment)).join('');
        const item = entry({ title, path: post.path + '#' + encodeURIComponent(heading.attribs.id), content: html }, true);
        if (folder.direct_links) {
          const link = block.find('a[href]').not('.headerlink').first().attr('href');
          if (link) { item.path = link; item.external = /^https?:/.test(link); }
        }
        item.kind = folder.direct_links ? '' : '原文栏目';
        item.source_id = heading.attribs.id;
        item.host = item.external ? new URL(item.path).hostname : '';
        const card = folder.cards?.[title] || {};
        item.icon = card.icon || folder.icon || 'arrow-up-right-from-square';
        item.image = card.image || '';
        item.tone = card.tone || folder.tone || info.tone;
        if (card.description) item.excerpt = card.description;
        item.qr = !!folder.qr;
        if (folder.qr) item.excerpt = folder.description || '';
        ensureFolder(key).entries.push(item);
      }
    }
  }
  const roots = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.key.split('/').slice(0, -1).join('/'));
    if (parent) parent.children.push(node); else roots.push(node);
  }
  function finish(node) {
    // Raw HTML index pages may also appear in Hexo locals; explicit metadata
    // takes precedence while each destination is listed only once.
    node.entries = [...new Map(node.entries.map(item => [item.path.replace(/index\.html$/, ''), item])).values()];
    node.entries.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));
    node.children.sort((a, b) => a.key.localeCompare(b.key));
    node.children.forEach(finish);
    node.count = node.entries.length + node.children.reduce((total, child) => total + child.count, 0);
  }
  const order = Object.keys(folders);
  roots.sort((a, b) => (order.indexOf(a.key) < 0 ? order.length : order.indexOf(a.key)) - (order.indexOf(b.key) < 0 ? order.length : order.indexOf(b.key)) || a.key.localeCompare(b.key));
  roots.forEach(finish);
  // Keep independent profile URLs and their landing page, but omit this group
  // from the public collection and all of its sibling navigation.
  const visibleRoots = roots.filter(node => !folders[node.key]?.hidden_from_collection);
  const ownerPost = array(posts).find(post => String(post.abbrlink) === String(info.source_post));
  const intro = ownerPost ? cheerio.load(ownerPost.content || '')('p').first().html() : '';
  return { roots: visibleRoots, nodes, count: visibleRoots.reduce((total, node) => total + node.count, 0), key: collectionKey, path: prefix, title: info.title, description: info.description || '', intro, icon: info.icon || 'folder-open', tone: info.tone || 'violet', owner: info.source_post ? `posts/${info.source_post}.html` : '', unit: info.unit || '篇内容' };
}
module.exports = { categoryTree, folderTree, featureTone };
