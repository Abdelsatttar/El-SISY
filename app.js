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

    
    // Keep status notifications bilingual and synchronized with the language toggle.
    let toastElement = null;
    let toastState = null;
    let toastTimer = null;
    let toastHiddenTimer = null;
    let buttonFeedbackTimer = null;

    function ensureToast() {
        if (toastElement) return toastElement;

        toastElement = document.createElement("div");
        toastElement.className = "site-toast";
        toastElement.id = "site-toast";
        toastElement.setAttribute("role", "status");
        toastElement.setAttribute("aria-live", "polite");
        toastElement.setAttribute("aria-atomic", "true");
        toastElement.hidden = true;
        toastElement.innerHTML = `
            <span class="toast-icon" aria-hidden="true"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <span class="toast-copy">
                <strong class="toast-title"></strong>
                <span class="toast-message"></span>
            </span>
            <button class="toast-close" type="button" aria-label="Close notification"><i class="fa-solid fa-xmark"></i></button>
            <span class="toast-progress" aria-hidden="true"><span></span></span>
        `;
        document.body.appendChild(toastElement);
        toastElement.querySelector(".toast-close")?.addEventListener("click", hideToast);
        return toastElement;
    }

    function localized(value) {
        if (typeof value === "string") return value;
        return value?.[currentLang] || value?.ar || value?.en || "";
    }

    function renderToast() {
        if (!toastState || !toastElement) return;
        const icons = {
            loading: "fa-spinner fa-spin",
            success: "fa-circle-check",
            warning: "fa-triangle-exclamation",
            error: "fa-circle-xmark"
        };
        const icon = toastElement.querySelector(".toast-icon i");
        if (icon) icon.className = "fa-solid " + (icons[toastState.type] || icons.loading);
        const title = toastElement.querySelector(".toast-title");
        const message = toastElement.querySelector(".toast-message");
        if (title) title.textContent = localized(toastState.title);
        if (message) message.textContent = localized(toastState.message);
        const close = toastElement.querySelector(".toast-close");
        if (close) close.setAttribute("aria-label", currentLang === "ar" ? "إغلاق الإشعار" : "Close notification");
    }

    function showToast(type, title, message, duration = 6500) {
        window.clearTimeout(toastTimer);
        window.clearTimeout(toastHiddenTimer);
        toastState = { type, title, message };
        const toast = ensureToast();
        toast.className = "site-toast toast-" + type;
        toast.hidden = false;
        toast.style.setProperty("--toast-duration", Math.max(duration, 1) + "ms");
        const progress = toast.querySelector(".toast-progress");
        if (progress) progress.hidden = duration <= 0;
        renderToast();

        window.requestAnimationFrame(() => toast.classList.add("is-visible"));

        if (duration > 0) {
            toastTimer = window.setTimeout(hideToast, duration);
        }
    }

    function hideToast() {
        window.clearTimeout(toastTimer);
        if (!toastElement) return;
        toastElement.classList.remove("is-visible");
        toastHiddenTimer = window.setTimeout(() => {
            if (toastElement && !toastElement.classList.contains("is-visible")) {
                toastElement.hidden = true;
            }
        }, 260);
    }

    function setFormStatus(message) {
        if (formStatus) formStatus.textContent = message || "";
    }

    function setSubmitBusy(isBusy, outcome = "idle") {
        const button = bookingForm?.querySelector(".btn-submit");
        if (!button) return;
        window.clearTimeout(buttonFeedbackTimer);
        button.disabled = isBusy;
        button.classList.toggle("is-submitting", isBusy);
        button.classList.toggle("is-success", !isBusy && outcome === "success");
        button.classList.toggle("is-warning", !isBusy && outcome === "warning");
        button.classList.toggle("is-error", !isBusy && outcome === "error");

        const label = button.querySelector("span");
        const icon = button.querySelector("i");
        if (label) {
            if (isBusy) {
                label.textContent = currentLang === "ar" ? "جاري الإرسال..." : "Sending...";
            } else if (outcome === "success") {
                label.textContent = currentLang === "ar" ? "تم الإرسال بنجاح" : "Sent successfully";
            } else if (outcome === "warning") {
                label.textContent = currentLang === "ar" ? "تم الحفظ" : "Request saved";
            } else if (outcome === "error") {
                label.textContent = currentLang === "ar" ? "حاول مرة أخرى" : "Try again";
            } else {
                label.textContent = currentLang === "ar" ? "إرسال الطلب" : "Send request";
            }
        }
        if (icon) {
            icon.className = "fa-solid " + (
                isBusy ? "fa-spinner fa-spin" :
                outcome === "success" ? "fa-check" :
                outcome === "warning" ? "fa-triangle-exclamation" :
                outcome === "error" ? "fa-rotate-right" : "fa-arrow-left arrow-icon"
            );
        }

        if (!isBusy && outcome !== "idle") {
            buttonFeedbackTimer = window.setTimeout(() => {
                button.classList.remove("is-success", "is-warning", "is-error");
                if (label) label.textContent = currentLang === "ar" ? "إرسال الطلب" : "Send request";
                if (icon) icon.className = "fa-solid fa-arrow-left arrow-icon";
            }, 3200);
        }
    }

    const FORM_API_URL = "/api/submit";
    let submissionInProgress = false;
    let reusableRequest = null;

    if (bookingForm) {
        bookingForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submissionInProgress) return;

            const name = document.getElementById("user_name")?.value.trim();
            const phone = document.getElementById("user_phone")?.value.trim();
            const address = document.getElementById("user_address")?.value.trim();
            const serviceKey = serviceSelect?.value;

            if (!name || !phone || !address || !serviceKey) {
                const message = {
                    ar: "من فضلك أكمل البيانات المطلوبة.",
                    en: "Please complete all required fields."
                };
                setFormStatus(message[currentLang]);
                showToast("warning",
                    { ar: "فيه بيانات ناقصة", en: "Missing information" },
                    message,
                    5000
                );
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

            // Keep the request ID when retrying the same details, so retries stay deduplicated.
            if (!reusableRequest || reusableRequest.signature !== signature) {
                reusableRequest = { signature, requestId: createRequestId() };
            }
            const payload = { ...values, requestId: reusableRequest.requestId };

            submissionInProgress = true;
            setSubmitBusy(true);
            const loadingTitle = { ar: "بنستقبل طلبك", en: "Sending your request" };
            const loadingMessage = {
                ar: "بنحفظ بياناتك ونتأكد من وصولها للشركة...",
                en: "Saving your details and confirming delivery..."
            };
            setFormStatus(loadingMessage[currentLang]);
            showToast("loading", loadingTitle, loadingMessage, 0);

            // Keep the user informed if Google takes a few seconds to respond.
            const slowNoticeTimer = window.setTimeout(() => {
                if (!submissionInProgress) return;
                showToast("loading",
                    { ar: "لسه بنأكد الطلب", en: "Still confirming your request" },
                    {
                        ar: "الاتصال بياخد وقت أطول من المعتاد. سيب الصفحة مفتوحة لحظات.",
                        en: "This is taking a little longer than usual. Please keep this page open."
                    },
                    0
                );
            }, 6500);

            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 35000);
            let outcome = "idle";

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
                    outcome = "error";
                    const message = {
                        ar: result.messageAr || "لم يتم حفظ الطلب. حاول مرة أخرى.",
                        en: result.messageEn || "The request was not saved. Please try again."
                    };
                    setFormStatus(message[currentLang]);
                    showToast("error",
                        { ar: "لم يتم إرسال الطلب", en: "Request not submitted" },
                        message,
                        7500
                    );
                    return;
                }

                bookingForm.reset();
                reusableRequest = null;

                if (result.emailSent === false) {
                    outcome = "warning";
                    const message = {
                        ar: result.messageAr || "تم حفظ الطلب، لكن تعذر إرسال إشعار البريد الإلكتروني.",
                        en: result.messageEn || "The request was saved, but the email notification could not be sent."
                    };
                    setFormStatus(message[currentLang]);
                    showToast("warning",
                        { ar: "تم حفظ الطلب مع تنبيه", en: "Request saved with a warning" },
                        message,
                        8500
                    );
                } else {
                    outcome = "success";
                    const message = {
                        ar: result.messageAr || "تم حفظ طلبك وإشعار فريق الشركة. هنتواصل معاك قريبًا.",
                        en: result.messageEn || "Your request was saved and the company was notified. We will contact you soon."
                    };
                    setFormStatus(message[currentLang]);
                    showToast("success",
                        { ar: "تم إرسال طلبك بنجاح", en: "Request sent successfully" },
                        message,
                        7500
                    );
                }
            } catch (error) {
                console.error("Booking submission failed:", error);
                outcome = "error";
                const message = error.name === "AbortError"
                    ? {
                        ar: "الاتصال أخد وقت طويل. ماقدرناش نأكد الحفظ؛ راجع الشيت قبل إعادة الإرسال.",
                        en: "The request timed out. We could not confirm the save; check the sheet before retrying."
                    }
                    : {
                        ar: error.message || "تعذر إرسال الطلب. حاول مرة أخرى.",
                        en: "The request could not be confirmed. Please try again."
                    };
                setFormStatus(message[currentLang]);
                showToast("error",
                    { ar: "تعذر تأكيد الطلب", en: "Could not confirm request" },
                    message,
                    8500
                );
            } finally {
                window.clearTimeout(timeoutId);
                window.clearTimeout(slowNoticeTimer);
                submissionInProgress = false;
                setSubmitBusy(false, outcome);
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