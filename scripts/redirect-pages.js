'use strict';

const fs = require('fs');
const path = require('path');
const { presentStandalone } = require('../lib/standalone-presentation.cjs');

function findStandaloneDirs(sourceDir) {
  const results = [];

  function scan(dir, relPath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let hasIndexHtml = false;
    let hasIndexMd = false;
    const subDirs = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        subDirs.push(entry.name);
      } else if (entry.isFile()) {
        if (entry.name === 'index.html') hasIndexHtml = true;
        if (entry.name === 'index.md') hasIndexMd = true;
      }
    }

    if (hasIndexHtml && !hasIndexMd) {
      const content = fs.readFileSync(path.join(dir, 'index.html'), 'utf-8');
      if (!/^---\s*\n/.test(content)) {
        results.push({ dir, relPath });
        return;
      }
    }

    for (const name of subDirs) {
      scan(path.join(dir, name), relPath ? relPath + '/' + name : name);
    }
  }

  const roots = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of roots) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    scan(path.join(sourceDir, entry.name), entry.name);
  }

  return results;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      if (entry.name === 'index.html') fs.writeFileSync(destPath, presentStandalone(fs.readFileSync(srcPath, 'utf8')));
      else fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ===== hexo generate: 文件写盘 (before_exit 兜底) =====
hexo.extend.filter.register('before_exit', function() {
  const sourceDir = this.source_dir;
  const publicDir = this.public_dir;

  const dirs = findStandaloneDirs(sourceDir);
  for (const d of dirs) {
    copyDir(d.dir, path.join(publicDir, d.relPath));
    hexo.log.info('Standalone: ' + d.relPath + '/');
  }

  const redirectDir = path.join(sourceDir, '_redirect');
  if (fs.existsSync(redirectDir)) {
    processRedirect(redirectDir, '', publicDir, this);
  }
});

function processRedirect(dir, relPath, publicDir, hexo) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let domainTarget = null;
  const subDirs = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      subDirs.push(fullPath);
    } else if (entry.isFile() && !domainTarget) {
      if (/^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}$/.test(entry.name)) {
        domainTarget = entry.name;
      }
    }
  }

  if (domainTarget) {
    const outDir = path.join(publicDir, relPath);
    fs.mkdirSync(outDir, { recursive: true });

    const html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<script>window.open("https://' + domainTarget + '","_blank");</script>\n<title>Redirecting...</title>\n</head>\n<body style="text-align:center;padding-top:60px;font-family:sans-serif;background:#f8fafc;">\n<p style="color:#64748b;">Redirecting to <a href="https://' + domainTarget + '" target="_blank" style="color:#3b82f6;">' + domainTarget + '</a>...</p>\n</body>\n</html>';

    fs.writeFileSync(path.join(outDir, 'index.html'), presentStandalone(html));
    hexo.log.info('Redirect: ' + relPath + '/');
  }

  for (const subDir of subDirs) {
    const name = path.basename(subDir);
    const childRelPath = relPath ? relPath + '/' + name : name;
    processRedirect(subDir, childRelPath, publicDir, hexo);
  }
}

function collectRedirects(dir, relPath, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let domainTarget = null;
  const subDirs = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      subDirs.push(fullPath);
    } else if (entry.isFile() && !domainTarget) {
      if (/^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}$/.test(entry.name)) {
        domainTarget = entry.name;
      }
    }
  }

  if (domainTarget) {
    results.push({ urlPath: '/' + relPath, target: domainTarget });
  }

  for (const subDir of subDirs) {
    const name = path.basename(subDir);
    const childRelPath = relPath ? relPath + '/' + name : name;
    collectRedirects(subDir, childRelPath, results);
  }
}

// ===== hexo server: 重定向即时拦截（独立于 standalone，必须最先注册） =====
hexo.extend.filter.register('server_middleware', function(app) {
  const sourceDir = this.source_dir;
  const redirectDir = path.join(sourceDir, '_redirect');

  if (fs.existsSync(redirectDir)) {
    const redirects = [];
    try {
      collectRedirects(redirectDir, '', redirects);
    } catch (e) {
      hexo.log.warn('[redirect] scan failed:', e.message);
    }

    for (const r of redirects) {
      const target = r.target;
      app.use(r.urlPath, function(req, res) {
        const html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<script>window.open("https://' + target + '","_blank");</script>\n<title>Redirecting…</title>\n</head>\n<body style="text-align:center;padding-top:60px;font-family:sans-serif;background:#f8fafc;">\n<p style="color:#64748b;">Redirecting to <a href="https://' + target + '" target="_blank" style="color:#3b82f6;">' + target + '</a>…</p>\n</body>\n</html>';
        res.setHeader('Content-Type', 'text/html');
        res.end(presentStandalone(html));
      });
      hexo.log.info('[redirect] mounted: ' + r.urlPath + ' -> ' + target);
    }
  }
});

// ===== hexo server: 旁路路由，直接从 source/ 提供 standalone 静态文件 =====
hexo.extend.filter.register('server_middleware', function(app) {
  const sourceDir = this.source_dir;
  let dirs;

  try {
    dirs = findStandaloneDirs(sourceDir);
  } catch (e) {
    hexo.log.warn('[standalone] scan failed:', e.message);
    return;
  }

  if (dirs.length === 0) return;

  const mimeMap = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };

  for (const d of dirs) {
    const urlPrefix = '/' + d.relPath;
    const fsDir = d.dir;

    app.use(urlPrefix, function(req, res, next) {
      const subPath = req.path.slice(urlPrefix.length).replace(/^\/+/, '') || 'index.html';
      const fullPath = path.join(fsDir, subPath);

      if (!fs.existsSync(fullPath)) {
        return next();
      }

      const ext = path.extname(fullPath).toLowerCase();
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      if (ext === '.html') res.end(presentStandalone(fs.readFileSync(fullPath, 'utf8')));
      else fs.createReadStream(fullPath).pipe(res);
    });

    hexo.log.info('[standalone] mounted: ' + urlPrefix + ' -> ' + d.relPath);
  }
});
