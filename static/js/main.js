(() => {
    "use strict";

    let lastFocusedElement = null;

    document.addEventListener("DOMContentLoaded", () => {
        initScrollUI();
        initSectionReveal();
        initNavHighlight();
        initLiveClock();
        initModalAccessibility();
    });

    // --- SCROLL PROGRESS & SCROLL-TO-TOP (passive + rAF throttled) ---
    function initScrollUI() {
        const progressEl = document.getElementById("scroll-progress");
        const topBtn = document.getElementById("scrollToTopBtn");
        let ticking = false;

        function updateScroll() {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (progressEl) {
                const pct = maxScroll > 0 ? Math.min(100, (scrollY / maxScroll) * 100) : 0;
                progressEl.style.width = `${pct}%`;
            }
            if (topBtn) {
                topBtn.classList.toggle("show", scrollY > 320);
            }
            ticking = false;
        }

        window.addEventListener(
            "scroll",
            () => {
                if (!ticking) {
                    window.requestAnimationFrame(updateScroll);
                    ticking = true;
                }
            },
            { passive: true }
        );

        if (topBtn) {
            topBtn.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        updateScroll();
    }

    // --- ONE-SHOT SECTION REVEAL (IntersectionObserver) ---
    function initSectionReveal() {
        const nodes = document.querySelectorAll(".reveal");
        if (!nodes.length) return;

        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced || !("IntersectionObserver" in window)) {
            nodes.forEach((el) => el.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        obs.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: "0px 0px -48px 0px", threshold: 0.05 }
        );

        nodes.forEach((el) => observer.observe(el));
    }

    // --- ACTIVE NAVIGATION HIGHLIGHT ---
    function initNavHighlight() {
        const navLinks = Array.from(document.querySelectorAll(".main-nav .nav-link"));
        if (!navLinks.length || !("IntersectionObserver" in window)) return;

        const linkById = new Map();
        navLinks.forEach((link) => {
            const id = (link.getAttribute("href") || "").replace(/^#/, "");
            if (id) linkById.set(id, link);
        });

        const sections = Array.from(linkById.keys())
            .map((id) => document.getElementById(id))
            .filter(Boolean);

        if (!sections.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        navLinks.forEach((l) => l.classList.remove("active"));
                        const activeLink = linkById.get(entry.target.id);
                        if (activeLink) activeLink.classList.add("active");
                    }
                });
            },
            { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
        );

        sections.forEach((section) => observer.observe(section));
    }

    // --- LIVE CLOCK (Mexicali / America/Tijuana, pauses when tab hidden) ---
    function initLiveClock() {
        const clockEl = document.getElementById("live-time");
        if (!clockEl) return;

        const formatter = new Intl.DateTimeFormat("es-MX", {
            timeZone: "America/Tijuana",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        let timerId = null;

        function tick() {
            const now = new Date();
            const formatted = formatter.format(now);
            clockEl.textContent = formatted;
            clockEl.setAttribute("datetime", now.toISOString());
        }

        function start() {
            tick();
            if (!timerId) timerId = window.setInterval(tick, 1000);
        }

        function stop() {
            if (timerId) {
                window.clearInterval(timerId);
                timerId = null;
            }
        }

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) stop();
            else start();
        });

        start();
    }

    // --- ACCESSIBLE CONTACT MODAL ---
    function initModalAccessibility() {
        const modal = document.getElementById("contactModal");
        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) window.closeModal();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && modal.classList.contains("active")) {
                window.closeModal();
            }
        });
    }

    window.openModal = function openModal() {
        const modal = document.getElementById("contactModal");
        const statusDiv = document.getElementById("form-status");
        if (!modal) return;

        lastFocusedElement = document.activeElement;
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        if (statusDiv) statusDiv.textContent = "";

        const firstInput = document.getElementById("sender_email");
        if (firstInput) window.setTimeout(() => firstInput.focus(), 60);
    };

    window.closeModal = function closeModal() {
        const modal = document.getElementById("contactModal");
        const form = document.getElementById("contactForm");
        if (!modal) return;

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (form) form.reset();

        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
            lastFocusedElement.focus();
        }
    };

    // --- COPY EMAIL HELPER ---
    window.copyEmail = async function copyEmail(buttonEl) {
        const email = buttonEl?.dataset?.email;
        if (!email) return;

        const feedbackEl = document.getElementById("copy-feedback");
        const labelSpan = buttonEl.querySelector("span");
        const originalText = labelSpan ? labelSpan.textContent : "";

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(email);
            } else {
                const temp = document.createElement("textarea");
                temp.value = email;
                temp.style.position = "fixed";
                temp.style.opacity = "0";
                document.body.appendChild(temp);
                temp.select();
                document.execCommand("copy");
                document.body.removeChild(temp);
            }

            if (labelSpan) labelSpan.textContent = "Correo copiado";
            if (feedbackEl) feedbackEl.textContent = `Copiado: ${email}`;

            window.setTimeout(() => {
                if (labelSpan) labelSpan.textContent = originalText;
                if (feedbackEl) feedbackEl.textContent = "";
            }, 2200);
        } catch {
            window.location.href = `mailto:${email}`;
        }
    };

    // --- CONTACT FORM SUBMISSION ---
    window.submitForm = async function submitForm(event) {
        event.preventDefault();
        const form = document.getElementById("contactForm");
        const btn = document.getElementById("submit-msg-btn");
        const statusDiv = document.getElementById("form-status");
        if (!form || !btn || !statusDiv) return;

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Enviando...</span>';
        statusDiv.textContent = "";
        statusDiv.className = "form-status";

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" },
            });

            if (response.ok) {
                statusDiv.className = "form-status status-ok";
                statusDiv.textContent = "Mensaje enviado exitosamente.";
                form.reset();
                window.setTimeout(() => window.closeModal(), 1800);
            } else {
                statusDiv.className = "form-status status-err";
                statusDiv.textContent = "No se pudo enviar el mensaje. Intenta de nuevo.";
            }
        } catch {
            statusDiv.className = "form-status status-err";
            statusDiv.textContent = "Error de red al conectar con el servidor.";
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    };
})();