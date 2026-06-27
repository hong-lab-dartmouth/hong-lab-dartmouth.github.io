/* =============================================================
   Shared site chrome — single source of truth for the header
   and footer. Rendered as custom elements (<site-header> /
   <site-footer>) so every page stays in sync. Paths resolve
   from the site root, so the same markup works at any depth.
   ============================================================= */

const ROOT = location.pathname.includes('/pages/') ? '../' : '';

// [label, href] — order shared by the header and footer nav.
const NAV = [
  ['Research',     `${ROOT}index.html#research-start`],
  ['People',       `${ROOT}pages/people.html`],
  ['Publications', `${ROOT}pages/publications.html`],
  ['Gallery',      `${ROOT}pages/gallery.html`],
  ['Contact',      `${ROOT}pages/contact.html`],
];

const navItems = (links) =>
  links.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('');

customElements.define('site-header', class extends HTMLElement {
  connectedCallback() {
    // The homepage (<site-header home>) starts collapsed and expands on
    // scroll; every other page shows the full wordmark statically.
    const state = this.hasAttribute('home') ? '' : ' is-scrolled';
    this.innerHTML = `
      <header class="site-header${state}">
        <div class="header-inner">
          <a href="${ROOT}index.html" class="logo-mark" aria-label="Hong Lab home">
            <img class="logo-h" src="${ROOT}assets/logos/shield-grey.png" alt="">
            <span class="logo-rest"><span class="logo-rest-text">Hong&nbsp;Lab</span></span>
          </a>
          <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">
            <svg class="icon-menu" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
            <svg class="icon-close" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
          </button>
          <nav class="main-nav" aria-label="Main navigation">
            <ul>${navItems(NAV)}</ul>
          </nav>
        </div>
      </header>`;

    // Mobile menu toggle
    const header = this.querySelector('.site-header');
    const toggle = this.querySelector('.nav-toggle');
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
    this.querySelectorAll('.main-nav a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }
});

customElements.define('site-footer', class extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <a class="footer-geisel" href="https://geiselmed.dartmouth.edu/" target="_blank" rel="noopener"
               aria-label="Dartmouth Geisel School of Medicine, Department of Molecular & Systems Biology">
              <img src="${ROOT}assets/logos/geisel-molsysbio.png"
                   alt="Dartmouth Geisel School of Medicine — Department of Molecular & Systems Biology">
            </a>
          </div>
          <nav class="footer-nav" aria-label="Footer navigation">
            <h4>Explore</h4>
            <ul>${navItems(NAV.slice(0, 4))}</ul>
          </nav>
          <div class="footer-contact">
            <h4>Contact</h4>
            <p>Jennifer Hong, MD</p>
            <a href="mailto:Jennifer.Hong@Dartmouth.edu">Jennifer.Hong@Dartmouth.edu</a>
            <p class="footer-address">Vail Basic Sciences Building<br>74 College St, Hanover, NH</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 Geisel School of Medicine at Dartmouth</p>
        </div>
      </footer>`;
  }
});
