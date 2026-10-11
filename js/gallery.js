/* Gallery page: the timeline lights up as you scroll, and clicking a
   photo opens it full-size in a viewer.
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

/* The view switch (Gallery or Timeline), remembered for next time. */
(function () {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll('.view-switch button'));
  if (!buttons.length) return;

  function setView(view, remember) {
    root.setAttribute('data-gallery-view', view);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    if (remember) { try { localStorage.setItem('gallery-view', view); } catch (e) { /* private window */ } }
    window.dispatchEvent(new Event('galleryview'));
  }

  setView(root.getAttribute('data-gallery-view') === 'timeline' ? 'timeline' : 'mosaic', false);
  buttons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view, true)));
})();

/* The timeline: the line starts under the title and fills to the
   middle of the window; an event's marker lights once it is reached. */
(function () {
  const stream = document.querySelector('.gallery-stream');
  const firstYear = stream && stream.querySelector('.tl-year');
  if (!stream || !firstYear) return;

  const entries = Array.from(stream.querySelectorAll('.tl-entry'));
  let ticking = false;
  const update = () => {
    ticking = false;
    if (document.documentElement.getAttribute('data-gallery-view') !== 'timeline') return;
    const r = stream.getBoundingClientRect();
    const start = firstYear.offsetTop;
    const lit = Math.min(r.height - start, Math.max(0, window.innerHeight * 0.55 - (r.top + start)));
    stream.style.setProperty('--tl-start', `${start}px`);
    stream.style.setProperty('--tl-progress', `${lit.toFixed(0)}px`);
    const reach = window.innerHeight * 0.82;
    entries.forEach((e) => e.classList.toggle('is-seen', e.getBoundingClientRect().top < reach));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('galleryview', onScroll);
  update();
})();
