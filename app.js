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

    // Google Apps Script web-app endpoint. If a new Apps Script project is deployed,
    // replace this URL with its deployed /exec URL.
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyWSrDBZVp06uhp37oW8uI6QCl-0yN4F1TrFQ-XPsOmwsMi1nMpK_cycAy4hCQsUTOw_w/exec";
    const responseFrameName = "el-sisy-form-response-frame";
    let pendingSubmission = null;

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

    function finishSubmission(result) {
        if (!pendingSubmission || result.requestId !== pendingSubmission.requestId) return;

        window.clearTimeout(pendingSubmission.timeoutId);
        pendingSubmission = null;

        const message = currentLang === "ar" ? result.messageAr : result.messageEn;
        setFormStatus(message || (currentLang === "ar"
            ? "تم استلام نتيجة الطلب."
            : "The request result was received."));

        if (result.ok) {
            // The request was saved. Clear the form even if the email notification failed,
            // to reduce accidental duplicate submissions.
            bookingForm.reset();
        }

        setSubmitBusy(false);
    }

    // Apps Script replies from its HTML response using postMessage. Validate the origin,
    // message type and request ID before trusting the response.
    window.addEventListener("message", (event) => {
        let hostname = "";
        try {
            hostname = new URL(event.origin).hostname;
        } catch (error) {
            return;
        }

        const trustedOrigin =
            hostname === "script.google.com" ||
            hostname.endsWith("script.googleusercontent.com") ||
            hostname === "googleusercontent.com" ||
            hostname.endsWith(".googleusercontent.com");

        if (!trustedOrigin || !event.data || event.data.type !== "EL_SISY_FORM_RESULT") return;
        finishSubmission(event.data);
    });

    if (bookingForm) {
        bookingForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (pendingSubmission) return;

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

            if (!APPS_SCRIPT_URL || !APPS_SCRIPT_URL.endsWith("/exec")) {
                setFormStatus(currentLang === "ar"
                    ? "خدمة استقبال الطلبات غير مُعدة بعد. تواصل معنا مباشرة."
                    : "The request service is not configured yet. Please contact us directly.");
                return;
            }

            let responseFrame = document.querySelector(`iframe[name="${responseFrameName}"]`);
            if (!responseFrame) {
                responseFrame = document.createElement("iframe");
                responseFrame.name = responseFrameName;
                responseFrame.title = "Request submission response";
                responseFrame.setAttribute("aria-hidden", "true");
                responseFrame.tabIndex = -1;
                responseFrame.style.cssText = "position:absolute;width:1px;height:1px;left:-10000px;border:0;visibility:hidden;";
                document.body.appendChild(responseFrame);
            }

            const requestId = (window.crypto && typeof window.crypto.randomUUID === "function")
                ? window.crypto.randomUUID().replace(/-/g, "")
                : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));

            const postForm = document.createElement("form");
            postForm.method = "POST";
            postForm.action = APPS_SCRIPT_URL;
            postForm.target = responseFrameName;
            postForm.acceptCharset = "UTF-8";
            postForm.style.display = "none";

            const values = {
                requestId,
                name,
                phone,
                address,
                service: serviceNames[currentLang][serviceKey] || serviceKey,
                language: currentLang,
                website: ""
            };

            Object.entries(values).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                postForm.appendChild(input);
            });

            setFormStatus(currentLang === "ar"
                ? "جاري إرسال الطلب والتحقق من حفظه..."
                : "Sending the request and verifying that it is saved...");
            setSubmitBusy(true);

            const timeoutId = window.setTimeout(() => {
                if (!pendingSubmission || pendingSubmission.requestId !== requestId) return;
                pendingSubmission = null;
                setFormStatus(currentLang === "ar"
                    ? "لم نتمكن من تأكيد استلام الرد. قد يكون الطلب وصل؛ راجع الشركة قبل إعادة الإرسال."
                    : "We could not verify the response. The request may have arrived; check with the company before resubmitting.");
                setSubmitBusy(false);
            }, 25000);

            pendingSubmission = { requestId, timeoutId };

            try {
                document.body.appendChild(postForm);
                postForm.submit();
            } catch (error) {
                console.error("Booking submission error:", error);
                window.clearTimeout(timeoutId);
                pendingSubmission = null;
                setFormStatus(currentLang === "ar"
                    ? "تعذر إرسال الطلب. حاول مرة أخرى أو تواصل معنا مباشرة."
                    : "The request could not be submitted. Please try again or contact us directly.");
                setSubmitBusy(false);
            } finally {
                postForm.remove();
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