// Let existing SweetAlert handlers keep their authored text and behavior.
(function () {
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('.post-body .btn');
    if (!trigger) return;
    var owner = trigger.closest('.note,.world-content-panel,.world-content-section');
    var tone = owner && owner.dataset.tone;
    if (!tone && owner) {
      tone = owner.classList.contains('primary') ? 'violet' : owner.classList.contains('success') ? 'green' : owner.classList.contains('warning') ? 'amber' : owner.classList.contains('danger') ? 'rose' : 'blue';
    }
    if (!/^(blue|violet|green|cyan|amber|rose)$/.test(tone || '')) tone = 'blue';
    Promise.resolve().then(function () {
      var modal = document.querySelector('.swal-modal');
      if (modal) modal.style.setProperty('--dialog-accent', 'var(--tone-' + tone + ')');
    });
  }, true);
})();
