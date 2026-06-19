/* Publications page: render papers grouped by year from data/publications.json. */

async function loadPublications() {
  const res = await fetch('../data/publications.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load publications.json');

  const data = await res.json();
  const container = document.getElementById('publications-section');

  data.years.forEach((group) => {
    const yearDiv = document.createElement('div');
    yearDiv.className = 'pub-year';

    const yearTitle = document.createElement('h2');
    yearTitle.className = 'pub-year-title';
    yearTitle.textContent = group.year;
    yearDiv.appendChild(yearTitle);

    group.items.forEach((pub) => {
      const article = document.createElement('article');
      article.className = 'pub-item';
      article.innerHTML = `
        <h3 class="pub-title">${pub.title}</h3>
        <p class="pub-authors">${pub.authors}</p>
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

      yearDiv.appendChild(article);
    });

    container.appendChild(yearDiv);
  });
}

loadPublications().catch((err) => console.error('Failed to load publications:', err));
