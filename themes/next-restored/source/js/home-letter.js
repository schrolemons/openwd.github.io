'use strict';
(() => {
  const home = document.querySelector('.world-home');
  if (!home) return;
  const sheets = [...home.children].filter(node => !node.matches('.home-hero'));
  const opener = home.querySelector('.home-envelope-open');
  const scene = document.createElement('div');
  scene.className = 'home-mail-scene';
  home.before(scene);
  scene.append(home);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let geometry = null;
  let frame = 0;
  let measurement = 0;
  let lastSize = '';
  let lastProgress = null;
  let lastExpanded = null;
  let accessible = null;
  // offsetTop deliberately ignores the theme's temporary entrance transforms.
  const documentTop = node => {
    let top = 0;
    for (; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };
  const setAccessible = visible => {
    if (visible === accessible) return;
    accessible = visible;
    sheets.forEach(sheet => {
      sheet.inert = !visible;
      if (visible) sheet.removeAttribute('aria-hidden');
      else sheet.setAttribute('aria-hidden', 'true');
    });
  };
  const render = () => {
    frame = 0;
    if (!geometry) return;
    const progress = Math.max(0, Math.min(1, (scrollY - geometry.start) / geometry.distance));
    const value = progress.toFixed(5);
    if (value === lastProgress) return;
    lastProgress = value;
    home.style.setProperty('--letter-progress', value);
    scene.dataset.progress = value;
    const expanded = progress >= 1;
    home.classList.toggle('is-letter-expanded', expanded);
    setAccessible(expanded);
    if (expanded !== lastExpanded) {
      lastExpanded = expanded;
      opener.setAttribute('aria-expanded', String(expanded));
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
  const measure = () => {
    measurement = 0;
    lastProgress = null;
    lastExpanded = null;
    home.classList.remove('is-scroll-letter');
    scene.style.height = '';
    // Direct links and reduced motion retain the complete ordinary reading view.
    if (reducedMotion.matches || location.hash) {
      geometry = null;
      home.classList.remove('is-letter-expanded');
      delete scene.dataset.progress;
      setAccessible(true);
      opener.removeAttribute('aria-expanded');
      return;
    }
    const top = documentTop(scene);
    const stickyTop = Math.max(0, Math.min(12, top));
    const firstTop = sheets[0].offsetTop;
    const margin = parseFloat(getComputedStyle(sheets[0]).marginTop);
    const lift = margin + parseFloat(getComputedStyle(home.querySelector('.home-envelope-peeks')).height);
    const distance = Math.round(Math.max(160, Math.min(320, innerHeight * .32)));
    sheets.forEach(sheet => sheet.style.setProperty('--letter-shift', `${-(sheet.offsetTop - firstTop + lift)}px`));
    home.style.setProperty('--envelope-top', `${stickyTop}px`);
    geometry = { start: Math.max(0, top - stickyTop), distance };
    home.classList.add('is-scroll-letter');
    scene.style.height = `${home.offsetHeight + distance}px`;
    scene.dataset.scrollStart = String(geometry.start);
    scene.dataset.scrollDistance = String(distance);
    lastSize = `${home.offsetWidth}:${home.offsetHeight}:${innerHeight}`;
    render();
  };
  const scheduleMeasure = () => { if (!measurement) measurement = requestAnimationFrame(measure); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', scheduleMeasure, { passive: true });
  addEventListener('hashchange', scheduleMeasure);
  reducedMotion.addEventListener('change', scheduleMeasure);
  new ResizeObserver(() => {
    const size = `${home.offsetWidth}:${home.offsetHeight}:${innerHeight}`;
    if (size !== lastSize) scheduleMeasure();
  }).observe(home);
  opener.addEventListener('click', event => {
    if (!geometry) return;
    event.preventDefault();
    measure();
    scrollTo({ top: geometry.start + geometry.distance, behavior: 'smooth' });
  });
  measure();
  document.fonts.ready.then(scheduleMeasure);
})();
