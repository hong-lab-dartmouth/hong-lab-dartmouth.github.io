document.addEventListener('DOMContentLoaded', () => {
    /* =========================
       Research Areas Accordion
    ========================= */

    const triggers = Array.from(document.querySelectorAll('.accordion-trigger'));

    function closeTrigger(trigger) {
        const panel = trigger.parentElement.querySelector('.accordion-panel');
        trigger.setAttribute('aria-expanded', 'false');
        if (panel) {
            panel.style.maxHeight = null;
        }
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
                panel.style.maxHeight = panel.scrollHeight + 'px';
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
