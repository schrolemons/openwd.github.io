/* global hexo */
'use strict';
const { readingProfile, decorateReading } = require('../lib/reading-profiles.cjs');
hexo.extend.helper.register('reading_profile', function(document) { return readingProfile(document || this.page); });
hexo.extend.helper.register('reading_content', function(html) { return decorateReading(html); });
