/* global hexo */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { sourceMetadata, categoryList, copyrightEnabled } = require('../lib/site-presentation.cjs');
const styleDirectory=path.join(hexo.source_dir,'_data');
const assets=fs.readdirSync(styleDirectory).filter(name=>name.endsWith('.styl')).sort().map(name=>path.join(styleDirectory,name));
assets.push(path.join(hexo.base_dir,'themes/next-restored/source/css/main.styl'),path.join(hexo.base_dir,'themes/next-restored/source/js/directory-interactions.js'),path.join(hexo.source_dir,'js/world-theme.js'),path.join(hexo.source_dir,'js/world-content-ui.js'));
const assetVersion=crypto.createHash('sha256').update(assets.map(file=>fs.readFileSync(file,'utf8')).join('\n')).digest('hex').slice(0,12);
hexo.extend.helper.register('world_ui_version',()=>assetVersion);
hexo.extend.helper.register('world_categories', document => categoryList(document?.categories));
hexo.extend.helper.register('world_copyright_enabled', copyrightEnabled);
hexo.extend.helper.register('world_source_meta', function(document) {
  const original=document?.source?document:this.site?.pages?.toArray()?.find(item=>item.path===document?.path);
  const name = original?.source;
  if (!name) return sourceMetadata();
  const file = path.resolve(hexo.source_dir, name);
  if (!file.startsWith(path.resolve(hexo.source_dir) + path.sep) || !fs.existsSync(file)) return sourceMetadata();
  return sourceMetadata(fs.readFileSync(file, 'utf8'));
});
