(() => {
    "use strict";

    let lastFocusedElement = null;
    const prefersReducedMotion = () =>
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.addEventListener("DOMContentLoaded", () => {
        initScrollUI();
        initSectionReveal();
        initNavHighlight();
        initTelemetryClock();
        initCardSpotlight();
        initHackerText();
        initNocTerminal();
        initAmbientNetwork();
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

        if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
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

    // --- LIVE CLOCK (PST) + UPTIME COUNTER (single visibility-aware timer) ---
    function initTelemetryClock() {
        const clockEl = document.getElementById("live-time");
        const uptimeEl = document.getElementById("uptime-counter");
        if (!clockEl && !uptimeEl) return;

        const formatter = new Intl.DateTimeFormat("es-MX", {
            timeZone: "America/Tijuana",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        let uptimeSeconds = 86392500;
        let timerId = null;

        function tick() {
            const now = new Date();
            if (clockEl) {
                clockEl.textContent = formatter.format(now);
                clockEl.setAttribute("datetime", now.toISOString());
            }
            if (uptimeEl) {
                uptimeSeconds += 1;
                const d = Math.floor(uptimeSeconds / 86400);
                const h = Math.floor((uptimeSeconds % 86400) / 3600);
                const m = Math.floor((uptimeSeconds % 3600) / 60);
                const s = uptimeSeconds % 60;
                uptimeEl.textContent = `UPTIME: ${d}d ${h}h ${m}m ${s}s`;
            }
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

    // --- SUBTLE CURSOR SPOTLIGHT ON CARDS (desktop hover only, no 3D jitter) ---
    function initCardSpotlight() {
        if (!window.matchMedia("(hover: hover) and (min-width: 768px)").matches) return;

        document.querySelectorAll(".surface-card").forEach((card) => {
            let rafId = null;
            card.addEventListener("mousemove", (event) => {
                if (rafId) return;
                rafId = window.requestAnimationFrame(() => {
                    const rect = card.getBoundingClientRect();
                    card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
                    card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
                    rafId = null;
                });
            });
        });
    }

    // --- SAFE HACKER-DECODE HOVER ON SECTION KICKERS ---
    function initHackerText() {
        if (prefersReducedMotion()) return;
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_-";

        document.querySelectorAll(".hacker-text").forEach((el) => {
            const target = el.dataset.value || el.textContent.trim();
            el.addEventListener("mouseenter", () => {
                if (el._decodeInterval) window.clearInterval(el._decodeInterval);
                let iteration = 0;
                el._decodeInterval = window.setInterval(() => {
                    el.textContent = target
                        .split("")
                        .map((char, idx) => {
                            if (char === " " || char === "/") return char;
                            if (idx < iteration) return target[idx];
                            return charset[Math.floor(Math.random() * charset.length)];
                        })
                        .join("");

                    if (iteration >= target.length) {
                        window.clearInterval(el._decodeInterval);
                        el._decodeInterval = null;
                    }
                    iteration += 0.45;
                }, 24);
            });
        });
    }

    // --- NOC TERMINAL TYPEWRITER (local telemetry, zero external blocking fetch) ---
    function initNocTerminal() {
        const el = document.getElementById("terminal-typing-text");
        if (!el) return;

        const messages = [
            "Iniciando diagnóstico de enlaces troncales...",
            "Core DWDM & Microondas sincronizados · SLA 99.99% [OK]",
        ];

        if (prefersReducedMotion()) {
            el.textContent = messages[messages.length - 1];
            return;
        }

        let msgIdx = 0;
        let charIdx = 0;
        let deleting = false;
        el.textContent = "";

        function step() {
            const current = messages[msgIdx];
            if (deleting) {
                charIdx -= 1;
                el.textContent = current.slice(0, charIdx);
            } else {
                charIdx += 1;
                el.textContent = current.slice(0, charIdx);
            }

            let delay = deleting ? 22 : 44;
            if (!deleting && charIdx === current.length) {
                if (msgIdx === messages.length - 1) return;
                delay = 1400;
                deleting = true;
            } else if (deleting && charIdx === 0) {
                deleting = false;
                msgIdx += 1;
                delay = 350;
            }
            window.setTimeout(step, delay);
        }

        window.setTimeout(step, 350);
    }

    // --- LIGHTWEIGHT AMBIENT NETWORK CANVAS (capped nodes, visibility-paused) ---
    function initAmbientNetwork() {
        const canvas = document.getElementById("network-canvas");
        if (!canvas || prefersReducedMotion()) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let nodes = [];
        let animId = null;
        let resizeTimer = null;
        const maxDistSq = 155 * 155;
        const mouse = { x: null, y: null, radiusSq: 130 * 130 };

        function setup() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const targetCount = width < 768 ? 16 : Math.min(34, Math.max(22, Math.floor((width * height) / 48000)));
            nodes = Array.from({ length: targetCount }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.36,
                vy: (Math.random() - 0.5) * 0.36,
                r: Math.random() * 1.4 + 0.9,
            }));
        }

        function drawFrame() {
            if (document.hidden) {
                animId = null;
                return;
            }

            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.x += n.vx;
                n.y += n.vy;

                if (n.x <= 0 || n.x >= width) n.vx *= -1;
                if (n.y <= 0 || n.y >= height) n.vy *= -1;

                if (mouse.x !== null && mouse.y !== null) {
                    const dx = n.x - mouse.x;
                    const dy = n.y - mouse.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq > 1 && dSq < mouse.radiusSq) {
                        n.x += dx * 0.008;
                        n.y += dy * 0.008;
                    }
                }

                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(56, 189, 248, 0.34)";
                ctx.fill();
            }

            ctx.lineWidth = 0.85;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < maxDistSq) {
                        const alpha = (1 - distSq / maxDistSq) * 0.16;
                        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            animId = window.requestAnimationFrame(drawFrame);
        }

        function start() {
            if (!animId && !document.hidden) {
                animId = window.requestAnimationFrame(drawFrame);
            }
        }

        window.addEventListener("mousemove", (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }, { passive: true });

        window.addEventListener("mouseout", () => {
            mouse.x = null;
            mouse.y = null;
        });

        window.addEventListener("resize", () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(setup, 180);
        }, { passive: true });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) start();
        });

        setup();
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