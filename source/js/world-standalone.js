// Bridge legacy avatar mode switching to the same preference as every Hexo page.
(function () {
  function sync() {
    if (!document.body.matches('.world-standalone:has(.cute-card)')) return;
    var dark = document.documentElement.dataset.worldTheme === 'dark';
    document.body.classList.toggle('night-mode', dark);
    // The existing avatar animation owns this flag; keep its next toggle correct.
    if (typeof isNightMode === 'boolean') isNightMode = dark;
  }
  document.documentElement.addEventListener('world-theme-change', sync);
  document.addEventListener('DOMContentLoaded', function () {
    sync();
    if (!document.body.matches(':has(.cute-card)')) return;
    new MutationObserver(function () {
      var dark = document.body.classList.contains('night-mode');
      if (dark !== (document.documentElement.dataset.worldTheme === 'dark')) window.WorldTheme.set(dark);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }, { once: true });
})();
