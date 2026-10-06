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

// Off the homepage, a "Hong Lab" wordmark leads the header and links home
// (the homepage already carries the name large in its banner).
const onHome = () => location.pathname === '/' || location.pathname === '/index.html';

customElements.define('site-header', class extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <div class="header-brand">
          ${onHome() ? '' : '<a class="home-link" href="/">Hong Lab</a>'}
          <nav class="header-affiliations" aria-label="Affiliations">
            <a class="affil-geisel" href="https://geiselmed.dartmouth.edu/" target="_blank" rel="noopener" aria-label="Dartmouth Geisel School of Medicine"><img src="/assets/logos/shield-grey.png" alt=""></a>
            <a class="affil-cqb" href="https://sites.dartmouth.edu/cqb/" target="_blank" rel="noopener" aria-label="Center for Quantitative Biology"><img src="/assets/logos/cqb.png" alt=""></a>
            <a class="affil-ind" href="https://sites.dartmouth.edu/ind/" target="_blank" rel="noopener" aria-label="Integrative Neuroscience at Dartmouth"><img src="/assets/logos/ind.png" alt=""></a>
            <a class="affil-dh" href="https://www.dartmouth-health.org/" target="_blank" rel="noopener" aria-label="Dartmouth Health"><img src="/assets/logos/dartmouth-health-emblem.png" alt=""></a>
          </nav>
          </div>
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


    // Scroll: translucent once off the top; slips away while scrolling
    // down, returns on any scroll up. Never hides with the menu open.
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 8);
      // Homepage: clear header while it sits over the full-screen image.
      const hero = document.querySelector('.hero-image-box');
      header.classList.toggle('is-over-hero', !!hero && hero.getBoundingClientRect().bottom > header.offsetHeight + 1);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > 160 && !header.classList.contains('nav-open') && !header.classList.contains('is-over-hero') && !document.body.classList.contains('homepage')) header.classList.add('is-hidden');
      else if (goingUp || y <= 160) header.classList.remove('is-hidden');
      if (goingDown || goingUp) lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
    onScroll();
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
