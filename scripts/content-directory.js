/* global hexo */
'use strict';
const { categoryTree, folderTree, featureTone } = require('../lib/content-directory.cjs');
hexo.extend.helper.register('world_feature_tone', featureTone);
hexo.extend.helper.register('content_directory', function(kind, collectionKey) {
  const settings = this.site.data.content_directory || {};
  if (kind === 'folders') return folderTree(this.site.pages, settings, collectionKey || this.page.directory_collection || 'yinxing_world', this.site.posts);
  const tree = categoryTree(this.site.categories, this.page.posts || this.site.posts, settings);
  if (kind !== 'category') return tree;
  const pagePath = decodeURI(this.page.path || '');
  const current = [...tree.nodes.values()].filter(node => node.path && pagePath.startsWith(decodeURI(node.path))).sort((a, b) => b.path.length - a.path.length)[0];
  const breadcrumb = [];
  for (let node = current; node; node = tree.nodes.get(node.parent)) breadcrumb.unshift(node);
  return { ...tree, current, breadcrumb };
});
hexo.extend.helper.register('folder_navigation', function() {
  const source = (this.page.source || '').replace(/\\/g, '/');
  if (this.page.directory_collection) return null;
  const settings = this.site.data.content_directory || {};
  const collectionKey = Object.keys(settings.collections || {}).find(key => source.startsWith(key + '/'));
  if (!collectionKey) return null;
  const key = source.slice(collectionKey.length + 1).split('/').slice(0, -1).join('/');
  const tree = folderTree(this.site.pages, settings, collectionKey, this.site.posts);
  const flatKey = Object.keys(settings.collections[collectionKey].folders || {}).find(parent => settings.collections[collectionKey].folders[parent].flatten && (key === parent || key.startsWith(parent + '/')));
  const folder = tree.nodes.get(flatKey || key);
  return folder ? { ...folder, collection: tree } : null;
});
hexo.extend.helper.register('world_collections', function() {
  const settings = this.site.data.content_directory || {};
  return Object.keys(settings.collections || {}).map(key => folderTree(this.site.pages, settings, key, this.site.posts));
});
hexo.extend.helper.register('collection_navigation', function() {
  const settings = this.site.data.content_directory || {};
  const key = Object.keys(settings.collections || {}).find(key => this.page.path === `posts/${settings.collections[key].source_post}.html`);
  return key ? folderTree(this.site.pages, settings, key, this.site.posts) : null;
});
hexo.extend.helper.register('sidebar_tag_groups', function() {
  const tags = this.site.tags.toArray();
  const elements = ['金', '木', '水', '火', '土', '风', '雷', '草', '冰', '光', '阴', '阳'];
  const systems = ['灵耀体系', '九虹重启', '三大规划'];
  const tones = { 金: 'amber', 木: 'green', 水: 'blue', 火: 'rose', 土: 'amber', 风: 'cyan', 雷: 'violet', 草: 'green', 冰: 'cyan', 光: 'amber', 阴: 'violet', 阳: 'rose' };
  const creative = ['感知', '创造', '记录'];
  return [{ title: '体系', label: '文化体系', description: '按文化与叙事体系归集文章', names: systems, tone: 'violet' }, { title: '元素', label: '十二元素', description: '从元素主题寻找相关内容', names: elements, tone: 'cyan' }, { title: '三元', label: '世界三元', description: '感知、创造、记录', names: creative, tone: 'rose' }].map(group => ({
    title: group.title,
    label: group.label, description: group.description, tone: group.tone,
    tags: tags.filter(tag => group.names.length ? group.names.includes(tag.name) : !elements.includes(tag.name) && !systems.includes(tag.name)).sort((a, b) => group.names.length ? group.names.indexOf(a.name) - group.names.indexOf(b.name) : b.length - a.length || a.name.localeCompare(b.name, 'zh-CN')).map(tag => ({ name: tag.name, path: tag.path, count: tag.length, tone: tones[tag.name] || group.tone }))
  })).filter(group => group.tags.length);
});
hexo.extend.helper.register('tag_directory', function() {
  const name = this.page.tag;
  const tag = this.site.tags.toArray().find(tag => tag.name === name);
  const groups = this.sidebar_tag_groups();
  const metadata = groups.flatMap(group => group.tags).find(tag => tag.name === name);
  return {
    name, count: tag?.length || 0, tone: metadata?.tone || 'violet',
    offset: (this.page.current - 1) * (this.config.tag_generator.per_page || this.config.per_page || 10),
    entries: this.page.posts.toArray().map(post => ({
      title: post.title || '内容入口', tone: featureTone(post), path: post.link || post.path, external: !!post.link,
      date: post.updated?.format('YYYY-MM-DD') || post.date?.format('YYYY-MM-DD') || '',
      categories: post.categories.toArray().map(category => ({ name: category.name, path: category.path }))
    }))
  };
});
hexo.extend.helper.register('tag_index_groups', function() {
  const settings = this.site.data.content_directory || {};
  const allTags = this.site.tags.toArray();
  return this.sidebar_tag_groups().map(group => {
    const related = new Set();
    const tags = group.tags.map(metadata => {
      const posts = allTags.find(tag => tag.name === metadata.name).posts.toArray().sort((a, b) => +b.updated - +a.updated || a.title.localeCompare(b.title, 'zh-CN'));
      const civilizations = new Map();
      for (const post of posts) {
        related.add(post._id);
        const root = post.categories.toArray().find(category => !category.parent);
        if (root) civilizations.set(root.name, (civilizations.get(root.name) || 0) + 1);
      }
      return { ...metadata,
        civilizations: [...civilizations].sort((a, b) => settings.civilization_order.indexOf(a[0]) - settings.civilization_order.indexOf(b[0])).map(([name, count]) => ({name, count, tone: settings.civilizations?.[name]?.tone || 'violet'})),
        previews: posts.slice(0, 2).map(post => ({ title: post.title, tone: featureTone(post), path: post.path, category: post.categories.toArray().map(category => category.name).slice(0, 2).join(' / ') }))
      };
    });
    return { ...group, tags, post_count: related.size };
  });
});
hexo.extend.generator.register('world-folder-directories', function(locals) {
  const settings = locals.data.content_directory || {};
  const existing = new Set(locals.pages.map(page => page.path));
  return Object.keys(settings.collections || {}).flatMap(collectionKey => {
    const tree = folderTree(locals.pages, settings, collectionKey, locals.posts);
    const routes = [{ path: tree.path + 'index.html', title: tree.title, key: '' }, ...[...tree.nodes.values()].map(node => ({ path: node.path + 'index.html', title: node.name, key: node.key }))];
    return routes.filter(route => !existing.has(route.path)).map(route => ({ path: route.path, layout: 'directory', data: { title: route.title, directory_collection: collectionKey, directory_key: route.key, comments: false, __page: true } }));
  });
});
