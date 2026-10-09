/* Gallery page: click a photo to open it full-size in a viewer.
   A figure with several photos is one event: any photo opens on its
   own, and the viewer pages through the rest of the event with the
   arrows, arrow keys, a swipe or the thumbnails. */

(function () {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const lbCounter = document.getElementById('lightbox-counter');
  const lbThumbs = document.getElementById('lightbox-thumbs');
  const lbClose = document.getElementById('lightbox-close');
  const lbPrev = document.getElementById('lightbox-prev');
  const lbNext = document.getElementById('lightbox-next');

  let photos = [];
  let index = 0;
  let caption = '';
  let opener = null;

  function show(i) {
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    lbImg.classList.add('is-swapping');
    const swap = () => {
      lbImg.src = p.src;
      lbImg.alt = p.alt;
      lbImg.classList.remove('is-swapping');
    };
    // Crossfade only when paging; the first photo appears at once.
    if (lbImg.getAttribute('src')) setTimeout(swap, 120); else swap();
    lbCounter.textContent = photos.length > 1 ? `${index + 1} / ${photos.length}` : '';
    Array.from(lbThumbs.children).forEach((t, n) =>
      n === index ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current'));
  }

  function open(fig, start) {
    photos = Array.from(fig.querySelectorAll('.gallery-media img')).map((img) => ({
      src: img.src, alt: img.alt,
    }));
    const cap = fig.querySelector('.gallery-caption') || fig.querySelector('figcaption');
    caption = fig.dataset.caption || (cap ? cap.textContent.trim() : '');
    lbCaption.textContent = caption;

    const many = photos.length > 1;
    lightbox.classList.toggle('is-group', many);
    lbThumbs.innerHTML = '';
    if (many) {
      photos.forEach((p, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lightbox-thumb';
        b.setAttribute('aria-label', `Photo ${n + 1} of ${photos.length}`);
        const t = document.createElement('img');
        t.src = p.src;
        t.alt = '';
        b.appendChild(t);
        b.addEventListener('click', () => show(n));
        lbThumbs.appendChild(b);
      });
    }

    lbImg.removeAttribute('src');
    show(start || 0);
    opener = document.activeElement;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function close() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (opener && opener.focus) opener.focus();
  }

  document.querySelectorAll('.gallery-item').forEach((fig) => {
    const imgs = Array.from(fig.querySelectorAll('.gallery-media img'));
    const cap = fig.querySelector('.gallery-caption') || fig.querySelector('figcaption');
    const label = fig.dataset.caption || (cap ? cap.textContent.trim() : '');

    imgs.forEach((img, n) => {
      if (getComputedStyle(img).display === 'none') return;   // reached in the viewer only
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', imgs.length > 1
        ? `Open photo ${n + 1} of ${imgs.length}: ${label}`
        : `Open photo: ${label}`);
      img.addEventListener('click', () => open(fig, n));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(fig, n); }
      });
    });
  });

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', () => show(index - 1));
  lbNext.addEventListener('click', () => show(index + 1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-stage')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && photos.length > 1) show(index - 1);
    else if (e.key === 'ArrowRight' && photos.length > 1) show(index + 1);
    else if (e.key === 'Tab') {
      // Keep focus inside the viewer while it is open.
      const f = Array.from(lightbox.querySelectorAll('button')).filter((b) => b.offsetParent);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Swipe between an event's photos on touch screens.
  let x0 = null;
  lbImg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lbImg.addEventListener('touchend', (e) => {
    if (x0 === null || photos.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
