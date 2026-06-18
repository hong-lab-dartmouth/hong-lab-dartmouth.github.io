document.addEventListener('DOMContentLoaded', () => {
    /* =========================
    Research Focus Modal
    ========================= */

    const focusCards = document.querySelectorAll('.focus-circle-card');

    const modal = document.getElementById('focus-modal');
    const modalOverlay = document.getElementById('focus-modal-overlay');
    const modalClose = document.getElementById('focus-modal-close');
    const modalTitle = document.getElementById('focus-modal-title');
    const modalDescription = document.getElementById('focus-modal-description');
    const modalImage = document.getElementById('focus-modal-image');

    if (modal && modalOverlay && modalClose && modalTitle && modalDescription && modalImage) {
        function openFocusModal(card) {
            const cardImage = card.querySelector('img');

            modalTitle.textContent = card.dataset.title;
            modalDescription.textContent = card.dataset.description;

            modalImage.src = cardImage.src;
            modalImage.alt = cardImage.alt;

            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeFocusModal() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        focusCards.forEach(card => {
            card.addEventListener('click', () => {
                openFocusModal(card);
            });
        });

        modalClose.addEventListener('click', closeFocusModal);
        modalOverlay.addEventListener('click', closeFocusModal);

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && modal.classList.contains('open')) {
                closeFocusModal();
            }
        });
    }

});