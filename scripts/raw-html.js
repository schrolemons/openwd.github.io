'use strict';

function escapeForSrcdoc(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processRawHtml(html, config) {
  config = config || {};
  var w = config.width || '100%';
  var h = config.height || 'calc(100vh - 100px)';
  var mh = config.minHeight || '600px';

  var escaped = escapeForSrcdoc(html);

  var containerCSS = '<style>' +
    '.raw-html-container{margin:0 auto;padding:0;max-width:100%;}' +
    '.raw-html-frame{width:' + w + ';height:' + h + ';min-height:' + mh + ';border:none;display:block;}' +
    '</style>';

  var iframeScrollScript = '<script>' +
    'var __rf=document.querySelector(".raw-html-frame");' +
    'if(__rf){' +
      '__rf.addEventListener("mouseenter",function(){document.body.style.overflow="hidden"});' +
      '__rf.addEventListener("mouseleave",function(){document.body.style.overflow=""});' +
      'document.body.style.scrollbarGutter="stable";' +
    '}' +
    '<\/script>';

  var iframeHTML = '<div class="raw-html-container">' +
    '<iframe class="raw-html-frame" srcdoc="' + escaped + '" ' +
    'sandbox="allow-scripts allow-same-origin">' +
    '</iframe>' +
    '</div>';

  return containerCSS + '\n' + iframeHTML + '\n' + iframeScrollScript;
}

hexo.extend.filter.register('before_post_render', function(data) {
  if (data.content && data.content.trimStart().toLowerCase().startsWith('<!doctype html>')) {
    data._rawHtmlContent = data.content;
    data._rawHtmlConfig = {
      width: data.raw_html_width,
      height: data.raw_html_height,
      minHeight: data.raw_html_min_height
    };
    data.content = '<!--hexo-raw-html-placeholder-->';
  }
  return data;
});

hexo.extend.filter.register('after_post_render', function(data) {
  if (data._rawHtmlContent) {
    data.content = processRawHtml(data._rawHtmlContent, data._rawHtmlConfig);
    delete data._rawHtmlContent;
    delete data._rawHtmlConfig;
  }
  return data;
});
