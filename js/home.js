document.addEventListener('DOMContentLoaded', () => {
    /* =========================
       Research Areas Accordion
    ========================= */

    const triggers = Array.from(document.querySelectorAll('.accordion-trigger'));

    /* One spring per panel, kept so a panel that is still collapsing
       can be re-opened mid-flight and pick up from its current height
       rather than snapping. */
    const springs = new WeakMap();

    function animatePanel(panel, to) {
        const existing = springs.get(panel);
        const from = existing ? existing.value() : (parseFloat(panel.style.maxHeight) || 0);
        const carried = existing ? existing.velocity() : 0;
        if (existing) existing.stop();

        springs.set(panel, Motion.spring({
            from: from, to: to, velocity: carried,
            damping: 1.0, response: 0.35,
            onFrame: (h) => { panel.style.maxHeight = Math.max(0, h) + 'px'; }
        }));
    }

    function closeTrigger(trigger) {
        const panel = trigger.parentElement.querySelector('.accordion-panel');
        trigger.setAttribute('aria-expanded', 'false');
        if (panel) animatePanel(panel, 0);
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const panel = trigger.parentElement.querySelector('.accordion-panel');
            const isOpen = trigger.getAttribute('aria-expanded') === 'true';

            // Single-open: collapse everything first
            triggers.forEach(closeTrigger);

            // Then open the clicked one (unless it was already open)
            if (!isOpen && panel) {
                trigger.setAttribute('aria-expanded', 'true');
                animatePanel(panel, panel.scrollHeight);
            }
        });
    });

    /* =========================
       Header logo reveal
       At the top, only the "H" mark shows; once the hero "Hong Lab"
       scrolls out of view, "ong Lab" expands in the sticky header.
    ========================= */

    const header = document.querySelector('.site-header');
    const heroHeading = document.querySelector('.hero-heading');

    if (header && heroHeading && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                header.classList.toggle('is-scrolled', !entry.isIntersecting);
            });
        }, { rootMargin: '-110px 0px 0px 0px', threshold: 0 });

        observer.observe(heroHeading);
    } else if (header) {
        // No hero on this page (or no IO support): always show the full wordmark
        header.classList.add('is-scrolled');
    }
});
