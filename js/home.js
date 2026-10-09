document.addEventListener('DOMContentLoaded', () => {
    /* =========================
       Research index
       "Research" (the overview) is selected on load. Pointing at an area
       (hover, keyboard focus or tap) crossfades its description in, and
       the pill on the line glides to it; the last one stays shown so it
       can be read. The pill moves by transform at the display's full
       frame rate.
    ========================= */

    const list = document.querySelector('.research-list');
    if (!list) return;

    const tabs = Array.from(list.querySelectorAll('.research-tab'));
    const panels = Array.from(document.querySelectorAll('.research-area'));

    const marker = document.createElement('span');
    marker.className = 'research-marker';
    marker.setAttribute('aria-hidden', 'true');
    list.appendChild(marker);

    let current = null;

    // The label's own width (the overview tab carries extra room for its divider).
    function labelBox(tab) {
        const pad = parseFloat(getComputedStyle(tab).paddingRight) || 0;
        return { left: tab.offsetLeft, width: tab.offsetWidth - pad };
    }

    function place() {
        if (!current) return;
        const { left, width } = labelBox(current);
        // A fixed-size pill (its width scales with the root size), centred over the selected label.
        marker.style.transform = `translateX(${left + width / 2 - marker.offsetWidth / 2}px)`;
    }

    function show(tab) {
        if (tab === current) return;
        current = tab;
        const target = document.getElementById(tab.getAttribute('aria-controls'));

        tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
        panels.forEach((p) => p.classList.toggle('is-active', p === target));
        place();
    }

    tabs.forEach((tab) => {
        tab.addEventListener('pointerenter', () => show(tab));
        tab.addEventListener('focus', () => show(tab));
        tab.addEventListener('click', () => {
            show(tab);
            // Narrow screens: keep the tapped area in view if the row scrolls.
            tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        });
    });

    // Place the default without animating, once fonts have set the widths.
    const init = () => {
        marker.style.transition = 'none';
        show(tabs[0]);
        place();
        requestAnimationFrame(() => requestAnimationFrame(() => {
            marker.style.transition = '';
        }));
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(init);
    window.addEventListener('resize', place);
});

/* =========================
   Hero scroll transition
   Over the first screen of scrolling, the full-bleed nerve image eases
   into a slightly inset panel with rounded corners (insets keep its
   aspect ratio) and zooms in gently. Transform and clip-path only, so
   it runs at the display's frame rate; skipped under reduced motion.
========================= */

document.addEventListener('DOMContentLoaded', () => {
    const box = document.querySelector('.hero-image-box');
    const img = box && box.querySelector('.hero-media img');
    if (!box || !img) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    const update = () => {
        ticking = false;
        const W = box.offsetWidth, H = box.offsetHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / (H * 0.85)));
        const e = 1 - Math.pow(1 - p, 3);                       // ease-out
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const side = e * Math.min(3.5 * rem, W * 0.05);
        const vert = side * (H / W);
        box.style.clipPath = `inset(${vert.toFixed(1)}px ${side.toFixed(1)}px round ${(e * rem).toFixed(1)}px)`;
        img.style.transform = `scale(${(1 + 0.07 * e).toFixed(4)})`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
});

/* =========================
   Life in the lab
   The photos come from the Gallery page itself, so a photo added
   there joins the slideshow automatically. The first photo is in the
   page markup, so something shows even if this never runs. Pauses
   while pointed at or focused; never auto-advances under
   prefers-reduced-motion.
========================= */

document.addEventListener('DOMContentLoaded', async () => {
    const figure = document.querySelector('.lab-life');
    if (!figure) return;

    const frame = figure.querySelector('.lab-life-frame');
    const caption = figure.querySelector('.lab-life-caption');
    const galleryUrl = new URL('/gallery/', location.href);

    let photos;
    try {
        const html = await (await fetch(galleryUrl)).text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Every photo, including each one of a multi-photo event, under its event's caption.
        photos = Array.from(doc.querySelectorAll('.gallery-item')).flatMap((item) => {
            const cap = item.querySelector('.gallery-caption') || item.querySelector('figcaption');
            const text = item.dataset.caption || (cap ? cap.textContent.trim() : '');
            return Array.from(item.querySelectorAll('img')).map((img) => ({
                src: new URL(img.getAttribute('src'), galleryUrl).href,
                alt: img.getAttribute('alt') || '',
                caption: text || img.getAttribute('alt') || '',
            }));
        });
    } catch (e) {
        return; // keep the single photo already on the page
    }
    if (photos.length < 2) return;

    frame.innerHTML = '';
    caption.textContent = photos[0].caption;          // the page's built-in caption may be a different photo's
    const slides = photos.map((p, i) => {
        const img = document.createElement('img');
        img.className = 'lab-life-slide' + (i === 0 ? ' is-active' : '');
        img.src = p.src;
        img.alt = p.alt;
        img.loading = i === 0 ? 'eager' : 'lazy';
        img.decoding = 'async';
        frame.appendChild(img);
        return img;
    });

    const dots = document.createElement('div');
    dots.className = 'lab-life-dots';
    const dotButtons = photos.map((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lab-life-dot';
        b.setAttribute('aria-label', `Show photo ${i + 1}: ${p.caption}`);
        if (i === 0) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', () => { stop(); go(i); });
        dots.appendChild(b);
        return b;
    });
    caption.after(dots);

    let index = 0;
    let captionTimer = null;
    function go(i) {
        index = (i + photos.length) % photos.length;
        slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
        dotButtons.forEach((d, n) => (n === index ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
        // Switch the caption at the midpoint of the 1.1s photo crossfade, so
        // the words never run ahead of the picture.
        clearTimeout(captionTimer);
        caption.style.opacity = '0';
        captionTimer = setTimeout(() => {
            caption.textContent = photos[index].caption;
            caption.style.opacity = '1';
        }, 450);
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;
    let stopped = reduceMotion;
    const start = () => { if (!stopped && !timer) timer = setInterval(() => go(index + 1), 5000); };
    const pause = () => { clearInterval(timer); timer = null; };
    const stop = () => { stopped = true; pause(); };

    figure.addEventListener('pointerenter', pause);
    figure.addEventListener('pointerleave', start);
    figure.addEventListener('focusin', pause);
    figure.addEventListener('focusout', start);
    start();
});
