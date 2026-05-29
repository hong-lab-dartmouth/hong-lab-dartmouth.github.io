const HERO_JSON_PATH = "assets/datas/home-hero.json";
const HERO_IMAGE_BASE = "assets/home-hero/";

const heroSlideshow = document.getElementById("hero-slideshow");
const heroSlideTitle = document.getElementById("hero-slide-title");
const prevButton = document.getElementById("hero-prev");
const nextButton = document.getElementById("hero-next");

let slides = [];
let currentIndex = 0;
let autoplayInterval = null;

function renderSlides(slideData) {
    const overlay = heroSlideshow.querySelector(".hero-overlay");

    slideData.forEach((slide, index) => {
        const slideElement = document.createElement("div");
        slideElement.className = `hero-slide ${index === 0 ? "active" : ""}`;

        const img = document.createElement("img");
        img.src = `${HERO_IMAGE_BASE}${slide.image}`;
        img.alt = slide.title || "Hong Lab slideshow image";
        img.loading = index === 0 ? "eager" : "lazy";

        slideElement.appendChild(img);
        heroSlideshow.insertBefore(slideElement, overlay);
    });

    updateSlideTitle();
}

function updateSlideTitle() {
    if (!slides.length) return;
    heroSlideTitle.textContent = slides[currentIndex].title || "";
}

function showSlide(index) {
    const slideElements = heroSlideshow.querySelectorAll(".hero-slide");
    if (!slideElements.length) return;

    slideElements.forEach((slide) => slide.classList.remove("active"));

    currentIndex = (index + slideElements.length) % slideElements.length;
    slideElements[currentIndex].classList.add("active");
    updateSlideTitle();
}

function nextSlide() {
    showSlide(currentIndex + 1);
}

function prevSlide() {
    showSlide(currentIndex - 1);
}

function startAutoplay() {
    stopAutoplay();
    autoplayInterval = setInterval(nextSlide, 5000);
}

function stopAutoplay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
    }
}

async function initHeroSlideshow() {
    try {
        const response = await fetch(HERO_JSON_PATH);

        if (!response.ok) {
            throw new Error(`Failed to load slideshow JSON: ${response.status}`);
        }

        const data = await response.json();
        slides = Array.isArray(data.slides) ? data.slides : [];

        if (!slides.length) {
            heroSlideTitle.textContent = "";
            return;
        }

        renderSlides(slides);
        startAutoplay();

        nextButton.addEventListener("click", () => {
            nextSlide();
            startAutoplay();
        });

        prevButton.addEventListener("click", () => {
            prevSlide();
            startAutoplay();
        });
    } catch (error) {
        console.error(error);
        heroSlideTitle.textContent = "";
    }
}

initHeroSlideshow();