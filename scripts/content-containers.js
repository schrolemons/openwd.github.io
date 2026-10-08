/* global hexo */
'use strict';
const { renderContainer } = require('../lib/content-containers.cjs');
for (const kind of ['section', 'panel', 'grid']) {
  hexo.extend.tag.register(`content_${kind}`, function(args, content) {
    return renderContainer(kind, args, content, text => hexo.render.renderSync({ text, engine: 'markdown' }));
  }, { ends: true });
}
