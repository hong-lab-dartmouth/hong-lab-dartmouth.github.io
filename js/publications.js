/* Publications page: render papers grouped by year from data/publications.json. */

async function loadPublications() {
  const res = await fetch('../data/publications.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load publications.json');

  const data = await res.json();
  const container = document.getElementById('publications-section');

  // Bold the lab PI in author lists (academic convention).
  const emphasize = (authors) => authors.replace(/(Hong J)\b/g, '<strong>$1</strong>');

  data.years.forEach((group) => {
    const yearDiv = document.createElement('div');
    yearDiv.className = 'pub-year';
    yearDiv.innerHTML = `<h2 class="pub-year-title">${group.year}</h2>`;

    const list = document.createElement('div');
    list.className = 'pub-list';

    group.items.forEach((pub) => {
      const primary = pub.links && pub.links[0] ? pub.links[0].url : null;
      const title = primary
        ? `<a class="pub-title-link" href="${primary}" target="_blank" rel="noopener noreferrer">${pub.title}</a>`
        : pub.title;

      const article = document.createElement('article');
      article.className = 'pub-item';
      article.innerHTML = `
        <h3 class="pub-title">${title}</h3>
        <p class="pub-authors">${emphasize(pub.authors)}</p>
        <p class="pub-venue">${pub.venue}</p>`;

      if (pub.links && pub.links.length > 0) {
        const links = document.createElement('div');
        links.className = 'pub-links';
        pub.links.forEach((link) => {
          const a = document.createElement('a');
          a.href = link.url;
          a.className = 'pub-link';
          a.textContent = link.label;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          links.appendChild(a);
        });
        article.appendChild(links);
      }

      list.appendChild(article);
    });

    yearDiv.appendChild(list);
    container.appendChild(yearDiv);
  });

  // Wire up scroll-reveal for the freshly-injected year groups.
  if (window.initScrollReveal) window.initScrollReveal();
}

loadPublications().catch((err) => console.error('Failed to load publications:', err));
