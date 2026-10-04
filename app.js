document.addEventListener('DOMContentLoaded', () => {
    // 1. NATIVE HIGH-PERFORMANCE SCROLL REVEAL (Zero third-party JS, Zero Long Tasks)
    const aosElements = document.querySelectorAll('[data-aos]');
    if ('IntersectionObserver' in window) {
        const aosObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('aos-animate');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });

        aosElements.forEach(el => aosObserver.observe(el));
    } else {
        aosElements.forEach(el => el.classList.add('aos-animate'));
    }

    // 2. BURGER MENU & MOBILE DRAWER LOGIC
    const burgerMenu = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');
    const navOverlay = document.getElementById('nav-overlay');
    const burgerIcon = burgerMenu ? burgerMenu.querySelector('i') : null;

    function toggleMenu() {
        if (!navLinks || !navOverlay) return;
        navLinks.classList.toggle('active');
        navOverlay.classList.toggle('active');
        
        if (burgerIcon) {
            if (navLinks.classList.contains('active')) {
                burgerIcon.classList.remove('fa-bars');
                burgerIcon.classList.add('fa-times');
            } else {
                burgerIcon.classList.remove('fa-times');
                burgerIcon.classList.add('fa-bars');
            }
        }
    }

    if (burgerMenu) burgerMenu.addEventListener('click', toggleMenu);
    if (navOverlay) navOverlay.addEventListener('click', toggleMenu);

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks && navLinks.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // 3. AUTO-SELECT SERVICE IN FORM ON "REQUEST SERVICE" CLICK
    const serviceSelect = document.getElementById('user_service');
    const servicesContainer = document.getElementById('services-container');

    if (servicesContainer && serviceSelect) {
        servicesContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-request');
            if (btn && btn.dataset.service) {
                serviceSelect.value = btn.dataset.service;
            }
        });
    }

    // 4. VIEWPORT-AWARE PROJECT SLIDESHOW
    const projectsSection = document.getElementById('projects');
    const slideshowContainers = [
        document.getElementById('slideshow-0'),
        document.getElementById('slideshow-1'),
        document.getElementById('slideshow-2')
    ].filter(Boolean);

    let slideshowTimer = null;

    function advanceSlideshow() {
        slideshowContainers.forEach(container => {
            const images = container.querySelectorAll('.slide-img');
            if (images.length <= 1) return;
            let activeIdx = Array.from(images).findIndex(img => img.classList.contains('active'));
            if (activeIdx === -1) activeIdx = 0;
            images[activeIdx].classList.remove('active');
            let nextIdx = (activeIdx + 1) % images.length;
            images[nextIdx].classList.add('active');
        });
    }

    if (projectsSection && 'IntersectionObserver' in window) {
        const projectsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!slideshowTimer) {
                        slideshowTimer = setInterval(advanceSlideshow, 3500);
                    }
                } else {
                    if (slideshowTimer) {
                        clearInterval(slideshowTimer);
                        slideshowTimer = null;
                    }
                }
            });
        }, { threshold: 0.1 });
        projectsObserver.observe(projectsSection);
    } else {
        slideshowTimer = setInterval(advanceSlideshow, 3500);
    }

    // 5. LAZY-LOAD GOOGLE MAPS IFRAME ON VIEWPORT APPROACH
    const mapIframe = document.querySelector('.map-container iframe');
    if (mapIframe) {
        if ('IntersectionObserver' in window) {
            const mapObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (mapIframe.dataset.src) {
                            mapIframe.src = mapIframe.dataset.src;
                        }
                        observer.unobserve(mapIframe);
                    }
                });
            }, { rootMargin: '300px' });
            mapObserver.observe(mapIframe);
        } else if (mapIframe.dataset.src) {
            mapIframe.src = mapIframe.dataset.src;
        }
    }

    // 6. FORM SUBMISSION VIA GOOGLE APPS SCRIPT
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('user_name').value;
            const phone = document.getElementById('user_phone').value;
            const address = document.getElementById('user_address').value;
            const service = document.getElementById('user_service').value;

            const formData = new URLSearchParams();
            formData.append('name', name);
            formData.append('phone', phone);
            formData.append('address', address);
            formData.append('service', service);

            const scriptURL = 'https://script.google.com/macros/s/AKfycbyWSrDBZVp06uhp37oW8uI6QCl-0yN4F1TrFQ-XPsOmwsMi1nMpK_cycAy4hCQsUTOw_w/exec';

            fetch(scriptURL, {
                method: 'POST',
                body: formData
            })
            .then(() => {
                alert('تم إرسال طلبك بنجاح!');
                bookingForm.reset();
            })
            .catch(error => {
                console.error('Error!', error.message);
                alert('حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً.');
            });
        });
    }
});