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

        const active = langToggle?.querySelector(".lang-active") || langToggle?.querySelector("strong");
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

    
    // Same-origin Vercel function proxies form requests to Apps Script.
    const FORM_API_URL = "/api/submit";
    let submissionInProgress = false;
    let reusableRequest = null;

    function setFormStatus(message) {
        if (formStatus) formStatus.textContent = message || "";
    }

    function setSubmitBusy(isBusy) {
        const button = bookingForm?.querySelector(".btn-submit");
        if (!button) return;
        button.disabled = isBusy;
        button.classList.toggle("is-submitting", isBusy);
        const label = button.querySelector("span");
        if (label) {
            label.textContent = isBusy
                ? (currentLang === "ar" ? "جاري إرسال الطلب..." : "Sending request...")
                : (currentLang === "ar" ? "إرسال الطلب" : "Send request");
        }
    }

    function createRequestId() {
        return (window.crypto && typeof window.crypto.randomUUID === "function")
            ? window.crypto.randomUUID().replace(/-/g, "")
            : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
    }

    if (bookingForm) {
        bookingForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submissionInProgress) return;

            const name = document.getElementById("user_name")?.value.trim();
            const phone = document.getElementById("user_phone")?.value.trim();
            const address = document.getElementById("user_address")?.value.trim();
            const serviceKey = serviceSelect?.value;

            if (!name || !phone || !address || !serviceKey) {
                setFormStatus(currentLang === "ar"
                    ? "من فضلك أكمل البيانات المطلوبة."
                    : "Please complete all required fields.");
                return;
            }

            const values = {
                name,
                phone,
                address,
                service: serviceNames[currentLang][serviceKey] || serviceKey,
                language: currentLang,
                website: ""
            };
            const signature = JSON.stringify(values);

            // Reuse the same ID when retrying identical form data. Apps Script uses this
            // ID to deduplicate requests if Google loses the response after saving it.
            if (!reusableRequest || reusableRequest.signature !== signature) {
                reusableRequest = {
                    signature,
                    requestId: createRequestId()
                };
            }

            const payload = { ...values, requestId: reusableRequest.requestId };

            submissionInProgress = true;
            setSubmitBusy(true);
            setFormStatus(currentLang === "ar"
                ? "جاري إرسال الطلب..."
                : "Sending your request...");

            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 35000);

            try {
                const response = await fetch(FORM_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                    cache: "no-store",
                    credentials: "same-origin"
                });

                const result = await response.json().catch(() => null);
                if (!response.ok || !result) {
                    const detail = currentLang === "ar"
                        ? (result?.messageAr || "خدمة استقبال الطلبات لم ترجع استجابة صحيحة.")
                        : (result?.messageEn || "The request service returned an invalid response.");
                    throw new Error(detail);
                }

                if (result.ok !== true) {
                    setFormStatus(currentLang === "ar"
                        ? (result.messageAr || "لم يتم حفظ الطلب. حاول مرة أخرى.")
                        : (result.messageEn || "The request was not saved. Please try again."));
                    return;
                }

                bookingForm.reset();
                reusableRequest = null;
                setFormStatus(currentLang === "ar"
                    ? (result.messageAr || "تم حفظ طلبك بنجاح.")
                    : (result.messageEn || "Your request was saved successfully."));
            } catch (error) {
                console.error("Booking submission failed:", error);
                if (error.name === "AbortError") {
                    setFormStatus(currentLang === "ar"
                        ? "استغرق الاتصال وقتًا أطول من المتوقع. لم نتمكن من تأكيد الحفظ؛ راجع الشيت قبل إعادة الإرسال. إعادة المحاولة بنفس البيانات ستستخدم رقم الطلب نفسه."
                        : "The request timed out. Check the sheet before resubmitting; retrying the same details will reuse the same request ID.");
                } else {
                    setFormStatus(error.message || (currentLang === "ar"
                        ? "تعذر إرسال الطلب. حاول مرة أخرى."
                        : "Could not submit the request. Please try again."));
                }
            } finally {
                window.clearTimeout(timeoutId);
                submissionInProgress = false;
                setSubmitBusy(false);
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