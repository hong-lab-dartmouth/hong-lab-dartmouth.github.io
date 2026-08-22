/* People page: one unified team grid (PI first, then PhD -> Medical ->
   Undergraduate) plus the alumni list, all from data/people.json.
   Clicking a photo opens the bio modal (bio + scholar link). */

const SECTION_ORDER = ['phd students', 'medical students', 'undergraduate students'];

async function loadPeoplePage() {
  const res = await fetch('/data/people.json', { cache: 'no-store' });
  const data = await res.json();
  const peopleSection = document.getElementById('people-section');

  /* ---- Bio modal ---- */
  const modal = document.getElementById('bio-modal');
  const mImage = document.getElementById('bio-modal-image');
  const mName = document.getElementById('bio-modal-name');
  const mTitle = document.getElementById('bio-modal-title');
  const mText = document.getElementById('bio-modal-text');
  const mLinks = document.getElementById('bio-modal-links');

  function openModal(person) {
    mImage.src = person.image;
    mImage.alt = person.alt || person.name;
    mName.textContent = person.name;

    mTitle.textContent = person.title || '';
    mTitle.style.display = person.title ? '' : 'none';

    const bio = (person.description || '').trim();
    mText.textContent = bio;
    mText.style.display = bio ? '' : 'none';

    mLinks.innerHTML = '';
    if (person.scholar) {
      const a = document.createElement('a');
      a.href = person.scholar.url;
      a.textContent = person.scholar.label || 'Google Scholar';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'scholar-link';
      mLinks.appendChild(a);
    }
    if (person.linkedin) {
      const a = document.createElement('a');
      a.href = person.linkedin;
      a.textContent = 'LinkedIn';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'scholar-link';
      mLinks.appendChild(a);
    }

    presentModal(person.__origin);
  }

  /* ---- Modal presentation ----------------------------------------
     The modal used to be display:none -> display:flex, so it simply
     appeared. Now it materialises: scale, opacity and the scrim's
     blur animate together, anchored to the photo that was clicked so
     the card visibly grows out of its source. It dismisses back along
     the same path, and on touch it can be dragged away — grabbable
     even while it is in the middle of closing.
     ---------------------------------------------------------------- */

  const modalCard = modal.querySelector('.bio-modal-card');
  const overlay = document.getElementById('bio-modal-overlay');

  let openSpring = null;    // drives 0 (closed) -> 1 (open)
  let dragSpring = null;    // drives vertical drag offset, in px
  let dragY = 0;
  let lastFocus = null;

  function paint(t, y) {
    /* Scale from 0.92 rather than 0 — the card is anchored to a
       thumbnail, so a small growth reads as "this expanded" while a
       zoom-from-nothing reads as a separate object arriving. */
    const scale = 0.92 + 0.08 * t;
    const fade = Math.max(0, 1 - Math.abs(y) / 320);
    modalCard.style.opacity = String(t * fade);
    modalCard.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + scale.toFixed(4) + ')';
    /* Blur and opacity move together so the scrim reads as a real
       material arriving, not a flat fade. */
    overlay.style.opacity = String(t * fade);
    overlay.style.backdropFilter = overlay.style.webkitBackdropFilter =
      'blur(' + (t * 10).toFixed(2) + 'px)';
  }

  function presentModal(origin) {
    lastFocus = document.activeElement;

    /* Anchor the growth to the clicked photo. Without this the card
       scales from the viewport centre and the spatial link between
       the thumbnail and the bio is lost. */
    if (origin && origin.getBoundingClientRect) {
      const r = origin.getBoundingClientRect();
      const c = modal.getBoundingClientRect();
      modalCard.style.transformOrigin =
        (r.left + r.width / 2 - c.left) + 'px ' + (r.top + r.height / 2 - c.top) + 'px';
    } else {
      modalCard.style.transformOrigin = '50% 50%';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    dragY = 0;
    if (openSpring) openSpring.stop();
    /* Start from wherever it currently sits, so re-opening something
       that is still closing picks up mid-flight instead of jumping. */
    const from = openSpring ? openSpring.value() : 0;
    openSpring = Motion.spring({
      from: from, to: 1, velocity: openSpring ? openSpring.velocity() : 0,
      damping: 1.0, response: 0.35,
      onFrame: (t) => paint(t, dragY)
    });

    document.getElementById('bio-modal-close').focus({ preventScroll: true });
  }

  function closeModal(velocity) {
    if (!modal.classList.contains('open')) return;
    if (openSpring) openSpring.stop();
    const from = openSpring ? openSpring.value() : 1;

    openSpring = Motion.spring({
      from: from, to: 0, velocity: velocity || 0,
      damping: 1.0, response: 0.3,
      onFrame: (t) => paint(t, dragY),
      onRest: () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        modalCard.style.transform = modalCard.style.opacity = '';
        overlay.style.opacity = overlay.style.backdropFilter =
          overlay.style.webkitBackdropFilter = '';
        dragY = 0;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }
    });
  }

  /* ---- Drag to dismiss -------------------------------------------
     1:1 with the finger, resisting upward (there is nothing above),
     and the decision to dismiss uses the release VELOCITY, not the
     distance travelled — a short fast flick should dismiss, a long
     slow drag that stops should spring back.
     ---------------------------------------------------------------- */

  const tracker = new Motion.VelocityTracker();
  let dragging = false;
  let grabOffset = 0;
  let pointerId = null;

  modalCard.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;          // pointer users have Esc and the scrim
    if (modalCard.scrollTop > 0) return;                 // let the bio scroll first
    if (e.target.closest('a, button')) return;

    dragging = true;
    pointerId = e.pointerId;
    modalCard.setPointerCapture(pointerId);
    grabOffset = e.clientY - dragY;
    tracker.reset();
    tracker.add(e.clientY, e.timeStamp);
    /* Grab it mid-animation: kill the spring but keep the value, so
       the card continues from exactly where it is on screen. */
    if (dragSpring) { dragSpring.stop(); dragSpring = null; }
  });

  modalCard.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const raw = e.clientY - grabOffset;
    /* Downward tracks the finger exactly; upward rubber-bands, since
       dragging up leads nowhere. */
    dragY = raw >= 0 ? raw : Motion.rubberband(raw, window.innerHeight);
    tracker.add(e.clientY, e.timeStamp);
    paint(openSpring ? openSpring.value() : 1, dragY);
  });

  function endDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    const v = tracker.velocity();

    /* Where is this gesture GOING, not where did it stop. */
    const projected = dragY + Motion.project(v);

    if (v > 350 || projected > window.innerHeight * 0.25) {
      closeModal(-Math.max(0.8, v / 400));
      return;
    }
    /* Springs back, carrying the finger's velocity so there is no
       seam between the drag ending and the animation starting. */
    dragSpring = Motion.spring({
      from: dragY, to: 0, velocity: v,
      damping: 0.8, response: 0.3,
      onFrame: (y) => { dragY = y; paint(openSpring ? openSpring.value() : 1, dragY); }
    });
  }

  modalCard.addEventListener('pointerup', endDrag);
  modalCard.addEventListener('pointercancel', endDrag);

  document.getElementById('bio-modal-close').addEventListener('click', () => closeModal());
  overlay.addEventListener('click', () => closeModal());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  /* ---- Build the unified team list ---- */
  const isAlumni = (s) => s.title.toLowerCase() === 'alumni';
  const team = data.sections
    .filter((s) => !isAlumni(s))
    .sort((a, b) => SECTION_ORDER.indexOf(a.title.toLowerCase()) - SECTION_ORDER.indexOf(b.title.toLowerCase()))
    .flatMap((s) => s.people.map((p) => ({ ...p, title: s.title.replace(/Students?$/i, 'Student') })));

  if (data.labDirector) {
    team.unshift({ ...data.labDirector, title: data.labDirector.title || 'Principal Investigator' });
  }

  const grid = document.createElement('div');
  grid.className = 'people-grid';

  team.forEach((person) => {
    const card = document.createElement('div');
    card.className = 'person-card';
    const clickable = (person.description && person.description.trim()) || person.scholar || person.linkedin;
    card.innerHTML = `
      <div class="person-photo${clickable ? ' is-clickable' : ''}">
        <img src="${person.image}" alt="${person.alt || person.name}" loading="lazy" decoding="async">
      </div>
      <h2>${person.name}</h2>
      ${person.title ? `<p class="person-title">${person.title}</p>` : ''}`;
    if (clickable) {
      const photo = card.querySelector('.person-photo');
      /* Hand the modal the element it should grow out of, so the card
         is spatially anchored to the photo that was clicked. */
      photo.addEventListener('click', () => {
        person.__origin = photo;
        openModal(person);
      });
    }
    grid.appendChild(card);
  });

  peopleSection.appendChild(grid);

  /* ---- Collaborators (linked names, above alumni) ---- */
  if (Array.isArray(data.collaborators) && data.collaborators.length) {
    const wrap = document.createElement('div');
    wrap.className = 'side-by-side-lists collaborators-block';
    wrap.innerHTML = '<h1 class="page-title">Collaborators</h1>';

    const list = document.createElement('div');
    list.className = 'collaborators-list';
    data.collaborators.forEach((c) => {
      const a = document.createElement('a');
      a.className = 'collaborator-link';
      a.href = c.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = c.name;
      list.appendChild(a);
    });
    wrap.appendChild(list);
    peopleSection.appendChild(wrap);
  }

  /* ---- Alumni ---- */
  const alumniSection = data.sections.find(isAlumni);
  if (alumniSection) {
    const wrap = document.createElement('div');
    wrap.className = 'side-by-side-lists';
    wrap.innerHTML = `<h1 class="page-title">${alumniSection.title}</h1>`;

    const groups = document.createElement('div');
    groups.className = 'grouped-list-wrapper';
    alumniSection.groups.forEach((group) => {
      const div = document.createElement('div');
      div.className = 'alumni-group';
      div.innerHTML = `<h2 class="alumni-group-title">${group.category}</h2>`;
      group.people.forEach((person) => {
        const name = document.createElement('p');
        name.className = 'alumni-name';
        name.textContent = person.note ? `${person.name} (${person.note})` : person.name;
        div.appendChild(name);
      });
      groups.appendChild(div);
    });
    wrap.appendChild(groups);
    peopleSection.appendChild(wrap);
  }

  // Wire up scroll-reveal for the freshly-injected cards/lists.
  if (window.initScrollReveal) window.initScrollReveal();
}

loadPeoplePage().catch((error) => console.error('Failed to load people page data:', error));
