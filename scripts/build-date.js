/* global hexo */
'use strict';
const { createBuildDate } = require('../lib/build-date.cjs');
const buildDate = createBuildDate();
hexo.extend.filter.register('before_generate', function () { buildDate.refresh(); });
hexo.extend.helper.register('world_build_date', function () { return buildDate.read(); });
