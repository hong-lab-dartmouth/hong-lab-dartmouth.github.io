document.addEventListener('DOMContentLoaded', async () => {
    /* =========================
       Hero Slideshow
    ========================= */

    const slideshow = document.getElementById('hero-slideshow');
    const prevButton = document.getElementById('hero-prev');
    const nextButton = document.getElementById('hero-next');

    if (slideshow) {
        let slidesData = [];

        try {
            const response = await fetch('assets/datas/home-slideshow.json');
            const data = await response.json();
            slidesData = data.slides || [];
        } catch (error) {
            console.error('Failed to load home hero slides:', error);
        }

        if (slidesData.length > 0) {
            slidesData.forEach((slideData, index) => {
                const slide = document.createElement('div');
                slide.className = index === 0 ? 'hero-slide active' : 'hero-slide';

                const img = document.createElement('img');
                img.src = `assets/home-slideshow/${slideData.image}`;
                img.alt = slideData.title || `Hong Lab slide ${index + 1}`;

                slide.appendChild(img);
                slideshow.insertBefore(slide, slideshow.querySelector('.hero-overlay'));
            });

            const slides = document.querySelectorAll('.hero-slide');
            let currentSlide = 0;
            let intervalId;

            function showSlide(nextIndex) {
                slides[currentSlide].classList.remove('active');

                currentSlide = (nextIndex + slides.length) % slides.length;

                slides[currentSlide].classList.add('active');
            }

            function nextSlide() {
                showSlide(currentSlide + 1);
            }

            function previousSlide() {
                showSlide(currentSlide - 1);
            }

            function restartAutoSlide() {
                clearInterval(intervalId);
                intervalId = setInterval(nextSlide, 3000);
            }

            if (nextButton) {
                nextButton.addEventListener('click', () => {
                    nextSlide();
                    restartAutoSlide();
                });
            }

            if (prevButton) {
                prevButton.addEventListener('click', () => {
                    previousSlide();
                    restartAutoSlide();
                });
            }

            intervalId = setInterval(nextSlide, 3000);
        }
    }

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