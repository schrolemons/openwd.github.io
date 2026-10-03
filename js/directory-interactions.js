'use strict';
// Native modal keeps keyboard focus contained and lets Escape close it.
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-qr-src]');
  if (!trigger) return;
  if (trigger.matches('a') && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
  event.preventDefault();
  let modal = document.querySelector('.directory-qr-dialog');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.className = 'directory-qr-dialog';
    modal.setAttribute('aria-labelledby', 'directory-qr-title');
    modal.innerHTML = '<button type="button" class="directory-qr-close" aria-label="关闭二维码">×</button><h2 id="directory-qr-title"></h2><img alt=""><p>使用微信扫描二维码</p><a target="_blank" rel="noopener">打开原图 ↗</a>';
    document.body.append(modal);
    modal.querySelector('button').addEventListener('click', () => modal.close());
    modal.addEventListener('click', click => {
      const bounds = modal.getBoundingClientRect();
      if (click.target === modal && (click.clientX < bounds.left || click.clientX > bounds.right || click.clientY < bounds.top || click.clientY > bounds.bottom)) modal.close();
    });
  }
  const title = trigger.dataset.qrTitle || '微信公众号';
  modal.querySelector('h2').textContent = title;
  modal.querySelector('img').src = trigger.dataset.qrSrc;
  modal.querySelector('img').alt = title + '二维码';
  modal.querySelector('a').href = trigger.getAttribute('href') || trigger.dataset.qrSrc;
  modal.showModal();
});
