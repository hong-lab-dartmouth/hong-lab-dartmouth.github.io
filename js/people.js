/* People page: render the PI, team grids, and alumni from data/people.json,
   plus the bio modal. */

async function loadPeoplePage() {
  const response = await fetch('../data/people.json', { cache: 'no-store' });
  const data = await response.json();

  const peopleSection = document.getElementById('people-section');

  /* ---- Bio modal ---- */
  const bioModal = document.getElementById('bio-modal');
  const bioModalImage = document.getElementById('bio-modal-image');
  const bioModalName = document.getElementById('bio-modal-name');
  const bioModalText = document.getElementById('bio-modal-text');
  const bioModalClose = document.getElementById('bio-modal-close');
  const bioModalOverlay = document.getElementById('bio-modal-overlay');

  function openBioModal(person) {
    bioModalImage.src = person.image;
    bioModalImage.alt = person.alt || person.name;
    bioModalName.textContent = person.name;
    bioModalText.textContent = person.description;
    bioModal.classList.add('open');
    bioModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeBioModal() {
    bioModal.classList.remove('open');
    bioModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  bioModalClose.addEventListener('click', closeBioModal);
  bioModalOverlay.addEventListener('click', closeBioModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bioModal.classList.contains('open')) closeBioModal();
  });

  function addBioButton(parent, person) {
    if (!person.description || person.description.trim() === '') return;
    const bioButton = document.createElement('button');
    bioButton.type = 'button';
    bioButton.textContent = 'Bio';
    bioButton.className = 'scholar-link bio-button';
    bioButton.addEventListener('click', () => openBioModal(person));
    parent.appendChild(bioButton);
  }

  function scholarLink(scholar) {
    const a = document.createElement('a');
    a.href = scholar.url;
    a.textContent = scholar.label || 'Google Scholar';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'scholar-link';
    return a;
  }

  /* ---- Lab director / PI ---- */
  const director = data.labDirector;
  const slot = document.getElementById('lab-director-slot');

  const dirTitle = document.createElement('h2');
  dirTitle.className = 'small-section-title';
  dirTitle.textContent = director.title;
  slot.appendChild(dirTitle);

  const dirCard = document.createElement('div');
  dirCard.className = 'lab-director';
  dirCard.innerHTML = `
    <div class="lab-director-image"><img src="${director.image}" alt="${director.alt || director.name}"></div>
    <div class="lab-director-text"></div>`;
  const dirText = dirCard.querySelector('.lab-director-text');

  const dirName = document.createElement('h2');
  dirName.textContent = director.name;
  dirText.appendChild(dirName);
  if (director.scholar) dirText.appendChild(scholarLink(director.scholar));
  if (director.description && director.description.trim() !== '') {
    const bio = document.createElement('p');
    bio.className = 'lab-director-bio';
    bio.textContent = director.description;
    dirText.appendChild(bio);
  }
  slot.appendChild(dirCard);

  /* ---- Team grids + alumni ---- */
  const isAlumni = (s) => s.title.toLowerCase() === 'alumni';
  const teamSections = data.sections.filter((s) => !isAlumni(s));
  const alumniSection = data.sections.find(isAlumni);

  teamSections.forEach((section) => {
    const heading = document.createElement('h1');
    heading.className = 'page-title';
    heading.textContent = section.title;
    peopleSection.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'people-grid';

    section.people.forEach((person) => {
      const card = document.createElement('div');
      card.className = 'person-card';
      card.innerHTML = `
        <img src="${person.image}" alt="${person.alt || person.name}">
        <h2>${person.name}</h2>`;
      addBioButton(card, person);
      if (person.scholar) card.appendChild(scholarLink(person.scholar));
      grid.appendChild(card);
    });

    peopleSection.appendChild(grid);
  });

  if (alumniSection) {
    const wrap = document.createElement('div');
    wrap.className = 'side-by-side-lists';

    const column = document.createElement('div');
    column.className = 'grouped-list-column';
    column.innerHTML = `<h1 class="page-title">${alumniSection.title}</h1>`;

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

    column.appendChild(groups);
    wrap.appendChild(column);
    peopleSection.appendChild(wrap);
  }
}

loadPeoplePage().catch((error) => console.error('Failed to load people page data:', error));
