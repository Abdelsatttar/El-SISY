document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    const langToggle = document.getElementById("lang-toggle");
    const navLinks = document.getElementById("nav-links");
    const burgerMenu = document.getElementById("burger-menu");
    const navOverlay = document.getElementById("nav-overlay");
    const header = document.getElementById("site-header");
    const progress = document.getElementById("scroll-progress");
    const bookingForm = document.getElementById("booking-form");
    const serviceSelect = document.getElementById("user_service");
    const formStatus = document.getElementById("form-status");

    const serviceNames = {
        ar: {
            consulting: "الاستشارات الهندسية",
            "design-build": "التصميم والتنفيذ",
            finishing: "أعمال التشطيب",
            "water-networks": "شبكات مياه الشرب",
            "wastewater-networks": "شبكات الصرف الصحي",
            "water-plants": "محطات مياه الشرب",
            "treatment-plants": "محطات الصرف والمعالجة",
            infrastructure: "أعمال البنية التحتية"
        },
        en: {
            consulting: "Engineering Consulting",
            "design-build": "Design & Construction",
            finishing: "Finishing Works",
            "water-networks": "Potable Water Networks",
            "wastewater-networks": "Wastewater Networks",
            "water-plants": "Drinking Water Plants",
            "treatment-plants": "Wastewater & Treatment Plants",
            infrastructure: "Infrastructure Works"
        }
    };

    let currentLang = localStorage.getItem("elsisy-lang") || "ar";

    function updateLanguage(lang) {
        currentLang = lang;
        root.lang = lang;
        root.dir = lang === "ar" ? "rtl" : "ltr";
        localStorage.setItem("elsisy-lang", lang);

        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const value = element.dataset[lang];
            if (value !== undefined) element.textContent = value;
        });

        document.querySelectorAll("[data-placeholder-ar]").forEach((input) => {
            const value = lang === "ar" ? input.dataset.placeholderAr : input.dataset.placeholderEn;
            if (value) input.placeholder = value;
        });

        document.querySelectorAll("#user_service option[data-ar]").forEach((option) => {
            option.textContent = option.dataset[lang];
        });

        const active = langToggle?.querySelector(".lang-active");
        if (active) active.textContent = lang.toUpperCase();

        document.title = lang === "ar"
            ? "El Sisy | حلول هندسية متكاملة"
            : "El Sisy | Integrated Engineering Solutions";
    }

    updateLanguage(currentLang);

    langToggle?.addEventListener("click", () => {
        updateLanguage(currentLang === "ar" ? "en" : "ar");
    });

    function closeMenu() {
        navLinks?.classList.remove("active");
        navOverlay?.classList.remove("active");
        document.body.classList.remove("menu-open");
        burgerMenu?.setAttribute("aria-expanded", "false");
        if (burgerMenu) burgerMenu.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }

    function toggleMenu() {
        if (!navLinks) return;
        const open = navLinks.classList.toggle("active");
        navOverlay?.classList.toggle("active", open);
        document.body.classList.toggle("menu-open", open);
        burgerMenu?.setAttribute("aria-expanded", String(open));
        if (burgerMenu) burgerMenu.innerHTML = open
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';
    }

    burgerMenu?.addEventListener("click", toggleMenu);
    navOverlay?.addEventListener("click", closeMenu);
    navLinks?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));

    const revealItems = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -45px 0px" });
        revealItems.forEach(item => revealObserver.observe(item));
    } else {
        revealItems.forEach(item => item.classList.add("is-visible"));
    }

    function updateScrollUI() {
        const scrollTop = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const percentage = max > 0 ? (scrollTop / max) * 100 : 0;
        if (progress) progress.style.width = percentage + "%";
        header?.classList.toggle("scrolled", scrollTop > 30);
    }

    updateScrollUI();
    window.addEventListener("scroll", updateScrollUI, { passive: true });

    document.querySelectorAll(".btn-request").forEach(button => {
        button.addEventListener("click", () => {
            const key = button.dataset.serviceKey;
            if (!key || !serviceSelect) return;
            serviceSelect.value = key;
        });
    });

    if (bookingForm) {
        bookingForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("user_name")?.value.trim();
            const phone = document.getElementById("user_phone")?.value.trim();
            const address = document.getElementById("user_address")?.value.trim();
            const serviceKey = serviceSelect?.value;

            if (!name || !phone || !address || !serviceKey) {
                if (formStatus) {
                    formStatus.textContent = currentLang === "ar"
                        ? "من فضلك أكمل البيانات المطلوبة."
                        : "Please complete all required fields.";
                }
                return;
            }

            const submitButton = bookingForm.querySelector(".btn-submit");
            const originalText = submitButton?.querySelector("span")?.textContent;

            if (submitButton) {
                submitButton.disabled = true;
                const label = submitButton.querySelector("span");
                if (label) label.textContent = currentLang === "ar" ? "جاري الإرسال..." : "Sending...";
            }

            const formData = new URLSearchParams();
            formData.append("name", name);
            formData.append("phone", phone);
            formData.append("address", address);
            formData.append("service", serviceNames[currentLang][serviceKey] || serviceKey);

            const scriptURL = "https://script.google.com/macros/s/AKfycbyWSrDBZVp06uhp37oW8uI6QCl-0yN4F1TrFQ-XPsOmwsMi1nMpK_cycAy4hCQsUTOw_w/exec";

            try {
                await fetch(scriptURL, { method: "POST", body: formData });
                bookingForm.reset();
                if (formStatus) {
                    formStatus.textContent = currentLang === "ar"
                        ? "تم إرسال طلبك بنجاح. سنتواصل معك قريبًا."
                        : "Your request was sent successfully. We will contact you soon.";
                }
            } catch (error) {
                console.error("Booking error:", error);
                if (formStatus) {
                    formStatus.textContent = currentLang === "ar"
                        ? "تعذر الإرسال حاليًا. حاول مرة أخرى أو تواصل معنا مباشرة."
                        : "We could not send the request right now. Please try again or contact us directly.";
                }
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    const label = submitButton.querySelector("span");
                    if (label) label.textContent = originalText || (currentLang === "ar" ? "إرسال الطلب" : "Send request");
                }
            }
        });
    }

    const mapIframe = document.querySelector(".map-container iframe");
    if (mapIframe && "IntersectionObserver" in window) {
        const mapObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                if (mapIframe.dataset.src) mapIframe.src = mapIframe.dataset.src;
                observer.unobserve(mapIframe);
            });
        }, { rootMargin: "400px" });
        mapObserver.observe(mapIframe);
    } else if (mapIframe?.dataset.src) {
        mapIframe.src = mapIframe.dataset.src;
    }

    window.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });
});