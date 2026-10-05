/* =============================================================
   Shared site chrome — single source of truth for the header
   and footer. Rendered as custom elements (<site-header> /
   <site-footer>) so every page stays in sync. All paths are
   root-relative, so the same markup works at any URL depth.
   ============================================================= */

// [label, href] — clean root-relative URLs, shared by the header and footer nav.
const NAV = [
  ['Research',     '/#research-start'],
  ['People',       '/people/'],
  ['Publications', '/publications/'],
  ['Gallery',      '/gallery/'],
  ['Contact',      '/contact/'],
];

// Marks the link for the current section so the nav shows where you are.
const isCurrent = (href) => href !== '/#research-start' && location.pathname.startsWith(href);

const navItems = (links) =>
  links.map(([label, href]) =>
    `<li><a href="${href}"${isCurrent(href) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');

customElements.define('site-header', class extends HTMLElement {
  connectedCallback() {
    // The homepage (<site-header home>) starts collapsed and expands on
    // scroll; every other page shows the full wordmark statically.
    const state = this.hasAttribute('home') ? '' : ' is-scrolled';
    this.innerHTML = `
      <header class="site-header${state}">
        <div class="header-inner">
          <a href="/" class="logo-mark" aria-label="Hong Lab home">
            <img class="logo-h" src="/assets/logos/shield-grey.png" alt="">
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
               aria-label="Dartmouth Geisel School of Medicine">
              <img src="/assets/logos/geisel.png"
                   alt="Dartmouth Geisel School of Medicine">
            </a>
          </div>

          <nav class="footer-col" aria-label="Footer navigation">
            <h4>Explore</h4>
            <ul>${navItems(NAV)}</ul>
          </nav>

          <nav class="footer-col" aria-label="Affiliations">
            <h4>Affiliations</h4>
            <ul>
              <li><a href="https://geiselmed.dartmouth.edu/" target="_blank" rel="noopener">Geisel School of Medicine</a></li>
              <li><a href="https://sites.dartmouth.edu/cqb/" target="_blank" rel="noopener">Center for Quantitative Biology</a></li>
              <li><a href="https://sites.dartmouth.edu/ind/" target="_blank" rel="noopener">Integrative Neuroscience (IND)</a></li>
              <li><a href="https://www.dartmouth-health.org/" target="_blank" rel="noopener">Dartmouth Health</a></li>
            </ul>
          </nav>

          <div class="footer-col footer-contact">
            <h4>Contact</h4>
            <p class="footer-pi">Jennifer Hong, MD</p>
            <p class="footer-role">Principal Investigator</p>
            <a href="mailto:Jennifer.Hong@Dartmouth.edu">Jennifer.Hong@Dartmouth.edu</a>
            <p class="footer-address">Vail Basic Sciences Building<br>74 College St<br>Hanover, NH 03755</p>
          </div>

        </div>
      </footer>`;
  }
});

/* =============================================================
   Mobile: open links that would open a new tab in the same tab
   instead. Delegated on the document, so it also covers links
   rendered asynchronously (people, publications).
   ============================================================= */
document.addEventListener('click', (e) => {
  if (!window.matchMedia('(max-width: 760px)').matches) return;
  const link = e.target.closest('a[target="_blank"]');
  if (link && link.href) {
    e.preventDefault();
    window.location.href = link.href;
  }
});

/* =============================================================
   "Research" nav jumps to the section without leaving
   #research-start in the address bar.
   ============================================================= */
const onHomepage = () =>
  location.pathname === '/' || location.pathname === '/index.html';

const goToResearch = () => {
  const target = document.getElementById('research-start');
  if (target) target.scrollIntoView();
  history.replaceState(null, '', location.pathname + location.search);
};

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href$="#research-start"]');
  if (link && onHomepage()) {
    e.preventDefault();
    goToResearch();
  }
});

// Arrived from another page via /#research-start — scroll, then clean the URL.
if (location.hash === '#research-start') {
  document.addEventListener('DOMContentLoaded', goToResearch);
}
