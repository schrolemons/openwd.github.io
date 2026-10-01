/* global hexo */
'use strict';
const { homepage, readingGuide } = require('../lib/reading-layout.cjs');
hexo.extend.helper.register('world_homepage', function() { return homepage(this.page.content, this.page.title, this.config.author); });
hexo.extend.helper.register('world_reading_guide', function(html) { return readingGuide(html); });
