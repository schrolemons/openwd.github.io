'use strict';
var fork = require('child_process').fork;
var path = require('path');

hexo.on('generateBefore', function() {
  return new Promise(function(resolve) {
    var child = fork(path.join(__dirname, 'generate-menu-posts.js'), [], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    child.on('close', resolve);
  });
});
