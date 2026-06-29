# Hong Lab — Website

The website for the [Hong Lab](https://honglab.bio) at Dartmouth's Geisel School of Medicine, a neurosurgical systems biology group. Live at **[honglab.bio](https://honglab.bio)**.

It is a static site — plain HTML, CSS, and vanilla JavaScript served by GitHub Pages. No framework, no build step, no dependencies.

## Editing content

Most updates do not require touching HTML. The two content files are:

- **People** → [`data/people.json`](data/people.json) — lab members, alumni, and collaborators
- **Publications** → [`data/publications.json`](data/publications.json) — papers grouped by year

### Add a lab member

1. Drop a headshot into `assets/img/people/`, named `First Last.jpg`. Keep it roughly portrait, about 800px tall and under ~120 KB (the cards crop to a 3:4 frame).
2. Add an entry to the right section's `people` array in `data/people.json`:

   ```json
   {
     "image": "../assets/img/people/First Last.jpg",
     "name": "First Last",
     "description": "A short bio.",
     "scholar": { "url": "https://scholar.google.com/citations?user=...", "label": "Google Scholar" },
     "linkedin": "https://www.linkedin.com/in/..."
   }
   ```

   `scholar`, `linkedin`, and `description` are all optional. Clicking a photo opens a bio modal showing whatever is present.

### Add a publication

Add an item under the matching year's `items` array in `data/publications.json`:

```json
{
  "title": "Paper title",
  "authors": "Smith A, Hong J, Doe B",
  "venue": "Journal Name, 10:1-10",
  "links": [{ "label": "DOI", "url": "https://doi.org/..." }]
}
```

"Hong J" is bolded automatically in the author list.

### Edit the navigation, header, or footer

These are shared across every page as web components in [`js/components.js`](js/components.js) — edit the `NAV` array or the footer markup once and it updates everywhere.

## Project structure

```
.
├── index.html          # Home (hero + research accordion)
├── people/             # /people/
├── publications/       # /publications/
├── gallery/            # /gallery/
├── contact/            # /contact/  (Leaflet/OpenStreetMap map)
├── css/style.css       # All styles
├── js/
│   ├── components.js   # Shared <site-header> / <site-footer> + nav
│   ├── home.js         # Homepage interactions (hero, accordion)
│   ├── people.js       # Renders the team grid + bio modal
│   ├── publications.js # Renders the bibliography
│   └── gallery.js      # Photo lightbox
├── data/
│   ├── people.json
│   └── publications.json
├── assets/             # Images, logos, favicon
├── CNAME               # Custom domain (honglab.bio)
├── robots.txt
└── sitemap.xml
```

Clean URLs come from the folder/`index.html` layout: `/people/` is served by `people/index.html`.

## Running locally

No dependencies. Serve the folder with any static file server that resolves directory `index.html` (so the clean URLs work):

```bash
python3 -m http.server 8799
```

Then open <http://localhost:8799/>. Opening the `.html` files directly over `file://` will not work, because the pages fetch JSON and rely on root-relative paths.

## Deploying

The site deploys automatically from the `main` branch via GitHub Pages.

1. Create a branch, make your change, and open a Pull Request into `main`.
2. After review and merge, GitHub Pages rebuilds (about a minute) and the change is live at honglab.bio.

There is no manual deploy step. The custom domain and HTTPS are already configured in the repository's **Settings → Pages**.
