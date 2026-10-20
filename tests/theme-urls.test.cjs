'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const scripts = path.resolve(__dirname, '../themes/next-restored/scripts');

// Exercise the theme without allowing the deprecated API, even on older Node releases.
function load(relative, hexo) {
  const filename = path.resolve(scripts, relative);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  const localRequire = name => {
    if (name === 'url' || name === 'node:url') {
      return { ...require('node:url'), parse() { throw new Error('url.parse is deprecated'); } };
    }
    const resolved = nativeRequire.resolve(name);
    if (name.startsWith('.') && resolved.startsWith(scripts + path.sep)) {
      return load(path.relative(scripts, resolved), hexo);
    }
    return nativeRequire(name);
  };
  const run = vm.runInThisContext(`(function(require, module, exports, hexo) {\n${fs.readFileSync(filename, 'utf8')}\n})`, { filename });
  run(localRequire, module, module.exports, hexo);
  return module.exports;
}

function helpers(file) {
  const registered = {};
  load(file, { extend: { helper: { register(name, callback) { registered[name] = callback; } } } });
  return registered;
}

test('theme configuration exports the hostname without legacy URL parsing', () => {
  const { next_config } = helpers('helpers/next-config.js');
  const context = {
    config: { url: 'https://WORLD.example:8443/blog/', root: '/blog/', highlight: {}, prismjs: {} },
    theme: { highlight: {}, codeblock: {}, tabs: {}, prism: {} },
    url_for: value => value,
    __: value => value
  };
  assert.equal(next_config.call(context).hostname, 'world.example');
});

test('theme links keep relative, anchor, same-site and protocol-relative URLs internal', () => {
  const nextUrl = load('helpers/next-url.js');
  const context = { config: { url: 'https://world.example/blog/' }, theme: {}, url_for: value => value };
  for (const url of ['/posts/1.html', 'posts/1.html', '#contents', 'https://world.example/post', '//cdn.example/file']) {
    const html = nextUrl.call(context, url, 'link');
    assert.match(html, /^<a /);
    assert.doesNotMatch(html, /target=|external|data-url=/);
  }
  assert.match(nextUrl.call(context, 'https://other.example/post', 'link'), /rel="noopener" target="_blank"/);
  assert.match(nextUrl.call(context, 'mailto:author@example.com', 'mail'), /target="_blank"/);
  context.theme.exturl = true;
  const external = nextUrl.call(context, 'https://other.example/post', 'link', { class: 'menu-link' });
  assert.match(external, /^<span class="exturl menu-link"/);
  assert.ok(external.includes(Buffer.from('https://other.example/post').toString('base64')));
});

test('preconnect accepts absolute CDN URLs and omits local paths', () => {
  const { next_pre } = helpers('helpers/engine.js');
  const context = { theme: { preconnect: true, js: '/js', font: {}, vendors: { internal: 'local', plugins: 'custom', custom_cdn_url: 'https://cdn.example/assets' } } };
  assert.equal(next_pre.call(context), '<link rel="preconnect" href="https://cdn.example" crossorigin>');
  context.theme.js = 'https://scripts.example/js';
  assert.ok(next_pre.call(context).includes('href="https://scripts.example"'));
  context.theme.vendors.custom_cdn_url = '/assets';
  assert.equal(next_pre.call(context), '<link rel="preconnect" href="https://scripts.example" crossorigin>');
});

test('post filter converts only absolute external links and retains link metadata', () => {
  let filter;
  load('filters/post.js', {
    config: { url: 'https://world.example/' },
    theme: { config: { exturl: true, exturl_icon: true } },
    extend: { filter: { register(name, callback) { filter = callback; } } }
  });
  const data = { content: '<a href="/post">local</a><a href="https://world.example/post">same</a><a href="//cdn.example/post">relative</a><a href="https://other.example/?a=1&amp;b=2" title="details">external</a>' };
  filter(data);
  assert.ok(data.content.startsWith('<a href="/post">local</a><a href="https://world.example/post">same</a><a href="//cdn.example/post">relative</a>'));
  assert.ok(data.content.includes(Buffer.from('https://other.example/?a=1&b=2').toString('base64')));
  assert.match(data.content, /title="details">external<i class="fa fa-external-link-alt"><\/i><\/span>/);
});
