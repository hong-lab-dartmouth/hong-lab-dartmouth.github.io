/* People page: one unified team grid (PI first, then PhD -> Medical ->
   Undergraduate) plus the alumni list, all from data/people.json.
   Clicking a photo opens the bio modal (bio + scholar link). */

const SECTION_ORDER = ['phd students', 'medical students', 'undergraduate students'];

async function loadPeoplePage() {
  const res = await fetch('../data/people.json', { cache: 'no-store' });
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

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.getElementById('bio-modal-close').addEventListener('click', closeModal);
  document.getElementById('bio-modal-overlay').addEventListener('click', closeModal);
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
    const clickable = (person.description && person.description.trim()) || person.scholar;
    card.innerHTML = `
      <img src="${person.image}" alt="${person.alt || person.name}"${clickable ? ' class="is-clickable"' : ''}>
      <h2>${person.name}</h2>
      ${person.title ? `<p class="person-title">${person.title}</p>` : ''}`;
    if (clickable) card.querySelector('img').addEventListener('click', () => openModal(person));
    grid.appendChild(card);
  });

  peopleSection.appendChild(grid);

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
}

loadPeoplePage().catch((error) => console.error('Failed to load people page data:', error));
