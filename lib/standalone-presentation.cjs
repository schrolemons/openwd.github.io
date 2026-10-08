'use strict';
// Splice only the shell: source scripts, canvas art and authored body stay intact.
function presentStandalone(html) {
  if (html.includes('data-world-presentation="shared"')) return html;
  return html.replace(/<head\b[^>]*>/i, '$&\n<script src="/js/world-theme.js" data-world-presentation="shared"></script>\n<script src="/js/world-standalone.js" defer></script>')
    .replace(/<\/head\s*>/i, '<link rel="stylesheet" href="/css/world-ui.css">\n$&')
    .replace(/<body\b([^>]*)>/i, (_, attributes) => {
      const attrs = /\bclass\s*=/.test(attributes) ? attributes.replace(/\bclass=(['"])(.*?)\1/i, (_, quote, classes) => `class=${quote}${classes} world-standalone${quote}`) : attributes + ' class="world-standalone"';
      return '<body' + attrs + '>';
    });
}
module.exports = { presentStandalone };
