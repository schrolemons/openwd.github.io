(function () {
  'use strict';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var preference = null;
  try { preference = localStorage.getItem('darkmode'); } catch (_) {}
  if (preference !== 'true' && preference !== 'false') preference = null;
  function apply() {
    var dark = preference === null ? media.matches : preference === 'true';
    root.dataset.worldTheme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    var button = document.querySelector('.world-theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到暗夜模式');
      button.title = button.getAttribute('aria-label');
      button.classList.toggle('is-dark', dark);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#1c1c1b' : '#fcfbf8';
    root.dispatchEvent(new CustomEvent('world-theme-change', { detail: { theme: root.dataset.worldTheme } }));
  }
  apply();
  function mount() {
    if (!document.querySelector('.world-theme-toggle')) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'world-theme-toggle darkmode-toggle';
      var mark = document.createElement('span');
      mark.className = 'world-theme-mark';
      mark.setAttribute('aria-hidden', 'true');
      button.appendChild(mark);
      button.addEventListener('click', function () {
        window.WorldTheme.set(root.dataset.worldTheme !== 'dark');
      });
      document.body.appendChild(button);
    }
    apply();
  }
  window.WorldTheme = { set: function (dark) {
    preference = String(Boolean(dark));
    try { localStorage.setItem('darkmode', preference); } catch (_) {}
    apply();
  } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
  media.addEventListener('change', function () { if (preference === null) apply(); });
  window.addEventListener('storage', function (event) {
    if (event.key === 'darkmode' || event.key === null) {
      preference = event.newValue === 'true' || event.newValue === 'false' ? event.newValue : null;
      apply();
    }
  });
})();
