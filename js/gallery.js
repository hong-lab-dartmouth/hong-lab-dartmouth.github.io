/* Gallery page: click a photo to open it full-size in a lightbox.

   The lightbox now materialises from the thumbnail that was clicked
   rather than appearing, and it is navigable: arrow keys on a
   pointer, horizontal drag on touch. A flick uses momentum
   projection to decide which photo it lands on, so a small fast
   gesture can travel further than a slow deliberate one. */

(function () {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const lbClose = document.getElementById('lightbox-close');
  if (!lightbox) return;

  const figures = Array.from(document.querySelectorAll('.gallery-item'));
  const slides = figures.map((fig) => {
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    return {
      src: img ? img.src : '',
      alt: img ? img.alt : '',
      caption: cap ? cap.textContent : '',
      origin: img
    };
  });

  let index = 0;
  let openSpring = null;   // 0 (closed) -> 1 (open)
  let panSpring = null;    // horizontal offset in px
  let panX = 0;
  let lastFocus = null;

  function paint(t, x) {
    /* Horizontal travel fades the image out towards the edges, so a
       swipe that is going nowhere still gives continuous feedback. */
    const fade = Math.max(0, 1 - Math.abs(x) / (window.innerWidth * 0.9));
    const scale = 0.94 + 0.06 * t;
    lbImg.style.opacity = String(t * fade);
    lbImg.style.transform =
      'translate3d(' + x.toFixed(2) + 'px,0,0) scale(' + scale.toFixed(4) + ')';
    lightbox.style.opacity = String(t);
    lightbox.style.backdropFilter = lightbox.style.webkitBackdropFilter =
      'blur(' + (t * 4).toFixed(2) + 'px)';
    lbCaption.style.opacity = String(t * fade);
  }

  function show(i) {
    index = (i + slides.length) % slides.length;
    const s = slides[index];
    lbImg.src = s.src;
    lbImg.alt = s.alt || '';
    lbCaption.textContent = s.caption || '';
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);

    /* Grow from the thumbnail so the full-size image reads as the
       same object enlarging, not a new one arriving. */
    const origin = slides[index].origin;
    if (origin) {
      const r = origin.getBoundingClientRect();
      lbImg.style.transformOrigin =
        (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px';
    }

    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    panX = 0;
    if (openSpring) openSpring.stop();
    openSpring = Motion.spring({
      from: openSpring ? openSpring.value() : 0, to: 1,
      damping: 1.0, response: 0.35,
      onFrame: (t) => paint(t, panX)
    });
    lbClose.focus({ preventScroll: true });
  }

  function close() {
    if (!lightbox.classList.contains('open')) return;
    if (openSpring) openSpring.stop();
    openSpring = Motion.spring({
      from: openSpring ? openSpring.value() : 1, to: 0,
      damping: 1.0, response: 0.3,
      onFrame: (t) => paint(t, panX),
      onRest: () => {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        lbImg.src = '';
        lbImg.style.transform = lbImg.style.opacity = '';
        lightbox.style.opacity = lightbox.style.backdropFilter =
          lightbox.style.webkitBackdropFilter = '';
        panX = 0;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }
    });
  }

  /* Slide to a neighbour: the outgoing image travels off in the
     direction of travel, the incoming one enters from the opposite
     edge — same path out as in. */
  function go(delta, velocity) {
    if (slides.length < 2) return;
    const w = window.innerWidth;
    if (panSpring) panSpring.stop();

    panSpring = Motion.spring({
      from: panX, to: -delta * w, velocity: velocity || 0,
      damping: 1.0, response: 0.32,
      onFrame: (x) => { panX = x; paint(openSpring ? openSpring.value() : 1, panX); },
      onRest: () => {
        show(index + delta);
        panX = delta * w * 0.35;
        panSpring = Motion.spring({
          from: panX, to: 0,
          damping: 0.8, response: 0.3,
          onFrame: (x) => { panX = x; paint(openSpring ? openSpring.value() : 1, panX); }
        });
      }
    });
  }

  figures.forEach((fig, i) => {
    const img = fig.querySelector('img');
    if (img) img.addEventListener('click', () => open(i));
  });

  lbClose.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });

  /* ---- Swipe -------------------------------------------------------
     Tracked 1:1 with a ~10px threshold before committing to a
     direction, so a tap is never stolen by the drag recogniser. At the
     first and last photo the pan rubber-bands instead of stopping. */

  const tracker = new Motion.VelocityTracker();
  let dragging = false;
  let decided = false;
  let startX = 0;
  let startY = 0;
  let pointerId = null;

  lbImg.addEventListener('pointerdown', (e) => {
    dragging = true;
    decided = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    tracker.reset();
    tracker.add(e.clientX, e.timeStamp);
    if (panSpring) { panSpring.stop(); panSpring = null; }
  });

  lbImg.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!decided) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;   // hysteresis
      if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }  // vertical wins
      decided = true;
      lbImg.setPointerCapture(pointerId);
    }

    panX = dx;
    tracker.add(e.clientX, e.timeStamp);
    paint(openSpring ? openSpring.value() : 1, panX);
  });

  function endSwipe(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    if (!decided) return;

    const v = tracker.velocity();
    /* Land where the flick is HEADED, not where the finger stopped. */
    const projected = panX + Motion.project(v);
    const threshold = window.innerWidth * 0.3;

    if (projected < -threshold) go(1, v);
    else if (projected > threshold) go(-1, v);
    else {
      panSpring = Motion.spring({
        from: panX, to: 0, velocity: v,
        damping: 0.8, response: 0.3,
        onFrame: (x) => { panX = x; paint(openSpring ? openSpring.value() : 1, panX); }
      });
    }
  }

  lbImg.addEventListener('pointerup', endSwipe);
  lbImg.addEventListener('pointercancel', endSwipe);
})();
