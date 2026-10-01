'use strict';

function escapeSrcdoc(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseArgs(argsStr) {
  var opts = {};
  if (!argsStr) return opts;

  var tokenRegex = /([^\s"'=]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  var m;
  while ((m = tokenRegex.exec(argsStr)) !== null) {
    var key = m[1].toLowerCase();
    var val = m[2] || m[3] || m[4];
    opts[key] = val;
  }
  return opts;
}

function buildContainer(opts, content) {
  var width = opts.width || '100%';
  var height = opts.height || 'calc(100vh - 160px)';
  var minHeight = opts.minheight || '360px';
  var title = opts.title || '';
  var src = opts.src || '';

  var id = 'rawhtml-' + Math.random().toString(36).substr(2, 8);

  var expandJS;
  var iframeHTML;
  if (src) {
    expandJS = 'window.open(\'' + src + '\',\'_blank\')';
    iframeHTML = '<iframe id="' + id + '" class="rawhtml-tag-frame" src="' + src + '" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" style="width:' + width + ';height:' + height + ';min-height:' + minHeight + ';border:none;display:block;"></iframe>';
  } else {
    var escaped = escapeSrcdoc(content);
    var b64 = Buffer.from(content, 'utf8').toString('base64');
    expandJS = '(function(){var h=atob(\'' + b64 + '\');h=decodeURIComponent(h.split(\'\').map(function(c){return\'%\'+(\'00\'+c.charCodeAt(0).toString(16)).slice(-2)}).join(\'\'));var w=window.open(\'about:blank\',\'_blank\');w.document.write(h);w.document.close()})()';
    iframeHTML = '<iframe id="' + id + '" class="rawhtml-tag-frame" srcdoc="' + escaped + '" sandbox="allow-scripts allow-same-origin" style="width:' + width + ';height:' + height + ';min-height:' + minHeight + ';border:none;display:block;"></iframe>';
  }

  var out = '';

  out += '<div class="rawhtml-wrapper" style="margin:1.5rem 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">';

  out += '<div class="rawhtml-bar" style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 1rem;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-bottom:1px solid #e2e8f0;">';
  out += '<span class="rawhtml-bar-title" style="font-size:0.85rem;font-weight:600;color:#334155;">' + (title || '内嵌页面') + '</span>';
  out += '<button onclick="' + expandJS + '" title="全屏查看" style="padding:0.3rem 0.7rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#475569;font-size:0.78rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.25rem;transition:all 0.15s;">↗ 扩大</button>';
  out += '</div>';

  out += '<div style="padding:0;">';
  out += iframeHTML;
  out += '</div>';

  out += '<script>(function(){var f=document.getElementById("' + id + '");if(f){document.body.style.scrollbarGutter="stable";f.addEventListener("mouseenter",function(){document.body.style.overflow="hidden"});f.addEventListener("mouseleave",function(){document.body.style.overflow=""})}})();<\/script>';

  out += '</div>';

  return out;
}

var blockRegex = /\{%\s*rawhtml\s+([\s\S]+?)\s*%}([\s\S]*?)\{%\s*endrawhtml\s*%}/g;
var codeFenceRegex = /```[\s\S]*?```/g;
var PLACEHOLDER_PREFIX = '<!--RAWH-TAG-PH-';

hexo.extend.filter.register('before_post_render', function(data) {
  var blocks = [];
  var idx = 0;

  var content = data.content;

  if (!content || content.indexOf('{% rawhtml') === -1) {
    return data;
  }

  var codeFences = [];
  content = content.replace(codeFenceRegex, function(match) {
    var ph = '<!--RAWH-CODE-' + codeFences.length + '-->';
    codeFences.push(match);
    return ph;
  });

  content = content.replace(blockRegex, function(match, argsStr, body) {
    var opts = parseArgs(argsStr);
    var ph = PLACEHOLDER_PREFIX + (idx++) + '-->';
    blocks.push({ opts: opts, body: body });
    return ph;
  });

  for (var ci = 0; ci < codeFences.length; ci++) {
    content = content.replace('<!--RAWH-CODE-' + ci + '-->', codeFences[ci]);
  }

  if (idx > 0) {
    data._rawhtmlTagBlocks = blocks;
    data.content = content;
  }

  return data;
});

hexo.extend.filter.register('after_post_render', function(data) {
  if (!data._rawhtmlTagBlocks) return data;

  for (var i = 0; i < data._rawhtmlTagBlocks.length; i++) {
    var block = data._rawhtmlTagBlocks[i];
    var ph = PLACEHOLDER_PREFIX + i + '-->';
    var rendered = buildContainer(block.opts, block.body);
    data.content = data.content.split(ph).join(rendered);
  }

  delete data._rawhtmlTagBlocks;
  return data;
});
