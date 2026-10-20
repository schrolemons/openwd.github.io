/* global hexo */
'use strict';
const { homepage, readingGuide } = require('../lib/reading-layout.cjs');
const { collectRecentUpdates } = require('../lib/recent-updates.cjs');
hexo.extend.helper.register('world_homepage', function() {
  const documents = [...this.site.posts.toArray(), ...this.site.pages.toArray()];
  return homepage(this.page.content, this.page.title, this.config.author, collectRecentUpdates(documents, hexo.source_dir, this.config.root));
});
hexo.extend.helper.register('world_reading_guide', function(html) { return readingGuide(html); });
