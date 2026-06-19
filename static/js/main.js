document.addEventListener("DOMContentLoaded", () => {
    
    // --- SCROLL PROGRESS BAR ---
    let isScrolling;
    window.addEventListener('scroll', () => {
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(function() {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('scroll-progress').style.width = scrolled + "%";
        }, 10);
    });

    // --- UPTIME COUNTER ---
    let uptimeSeconds = 86392500; 
    function updateUptime() {
        uptimeSeconds++;
        let d = Math.floor(uptimeSeconds / (3600*24));
        let h = Math.floor(uptimeSeconds % (3600*24) / 3600);
        let m = Math.floor(uptimeSeconds % 3600 / 60);
        let s = Math.floor(uptimeSeconds % 60);
        const counterEl = document.getElementById("uptime-counter");
        if(counterEl) counterEl.innerText = `UPTIME: ${d}d ${h}h ${m}m ${s}s`;
    }
    setInterval(updateUptime, 1000);

    // --- LIVE CLOCK ---
    function updateClock() { 
        const clockEl = document.getElementById('live-time');
        if(clockEl) clockEl.innerText = new Date().toLocaleTimeString('es-MX', { timeZone: 'America/Tijuana', hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: false }); 
    }
    setInterval(updateClock, 1000); 
    updateClock();

    // --- HACKER TEXT EFFECT ---
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    document.querySelectorAll('.hacker-text').forEach(el => {
        el.addEventListener('mouseover', event => {
            let iterations = 0;
            const interval = setInterval(() => {
                event.target.innerText = event.target.innerText.split("")
                    .map((letter, index) => {
                        if(index < iterations) return event.target.dataset.value[index];
                        return letters[Math.floor(Math.random() * 42)];
                    }).join("");
                if(iterations >= event.target.dataset.value.length) clearInterval(interval);
                iterations += 1 / 3;
            }, 30);
        });
    });

    // --- CANVAS NETWORK BACKGROUND ---
    const canvas = document.getElementById('network-canvas');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particlesArray = [];
        const mouse = { x: null, y: null, radius: 150 };

        window.addEventListener('mousemove', function(event) { mouse.x = event.x; mouse.y = event.y; });
        window.addEventListener('mouseout', function(){ mouse.x = undefined; mouse.y = undefined; });
        window.addEventListener('resize', function(){ canvas.width = innerWidth; canvas.height = innerHeight; initNetwork(); });

        class Node {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x; this.y = y; this.directionX = directionX; this.directionY = directionY; this.size = size; this.color = color;
            }
            draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
            update() {
                if(this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if(this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
                let dx = mouse.x - this.x; let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                if(distance < mouse.radius + this.size){
                    if(mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += 1;
                    if(mouse.x > this.x && this.x > this.size * 10) this.x -= 1;
                    if(mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += 1;
                    if(mouse.y > this.y && this.y > this.size * 10) this.y -= 1;
                }
                this.x += this.directionX; this.y += this.directionY;
                this.draw();
            }
        }
        function initNetwork() {
            particlesArray = [];
            let numberOfParticles = (canvas.height * canvas.width) / 18000; 
            for(let i=0; i<numberOfParticles; i++){
                let size = (Math.random() * 2) + 0.5;
                let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                let directionX = (Math.random() * 1) - 0.5;
                let directionY = (Math.random() * 1) - 0.5;
                particlesArray.push(new Node(x, y, directionX, directionY, size, '#3b82f6'));
            }
        }
        function connectNodes() {
            let opacityValue = 1;
            for(let a=0; a<particlesArray.length; a++){
                for(let b=a; b<particlesArray.length; b++){
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    if(distance < (canvas.width/8) * (canvas.height/8)){
                        opacityValue = 1 - (distance/18000);
                        ctx.strokeStyle = 'rgba(16, 185, 129,' + opacityValue + ')';
                        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(particlesArray[a].x, particlesArray[a].y); ctx.lineTo(particlesArray[b].x, particlesArray[b].y); ctx.stroke();
                    }
                }
            }
        }
        function animateNetwork() {
            requestAnimationFrame(animateNetwork);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            for(let i=0; i<particlesArray.length; i++) particlesArray[i].update();
            connectNodes();
        }
        initNetwork(); animateNetwork();
    }

    // --- BENTO 3D HOVER EFFECT ---
    if (window.matchMedia("(min-width: 768px)").matches) {
        let isTicking = false;
        document.querySelectorAll('.bento-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                if(!isTicking) {
                    window.requestAnimationFrame(() => {
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
                        card.style.setProperty("--mouse-x", `${x}px`); card.style.setProperty("--mouse-y", `${y}px`);
                        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -4; 
                        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 4;
                        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                        card.style.zIndex = "10";
                        isTicking = false;
                    });
                    isTicking = true;
                }
            });
            card.addEventListener('mouseleave', () => { card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`; card.style.zIndex = "1"; });
        });
    }

    // --- TERMINAL NOC CON OBTENCIÓN DE IP ---
    const typingElement = document.getElementById("terminal-typing-text");
    if(typingElement) {
        fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => {
                const visitorIP = data.ip;
                iniciarSecuenciaNOC(visitorIP);
            })
            .catch(error => {
                console.error("Error obteniendo IP:", error);
                iniciarSecuenciaNOC("127.0.0.1 (Offline)");
            });

        function iniciarSecuenciaNOC(ip) {
            const mensajes = [
                `Iniciando escaneo de red...`,
                `Detectando conexión entrante desde IP: ${ip}...`
            ];
            
            let mensajeIndex = 0;
            let charIndex = 0;
            let isDeleting = false;
            
            function typeWriter() {
                const currentMessage = mensajes[mensajeIndex];
                
                if (isDeleting) {
                    typingElement.textContent = currentMessage.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    typingElement.textContent = currentMessage.substring(0, charIndex + 1);
                    charIndex++;
                }

                let typeSpeed = isDeleting ? 30 : 60;

                if (!isDeleting && charIndex === currentMessage.length) {
                    typeSpeed = 1500; 
                    if (mensajeIndex === mensajes.length - 1) { return; }
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    mensajeIndex++;
                    typeSpeed = 500; 
                }

                setTimeout(typeWriter, typeSpeed);
            }
            setTimeout(typeWriter, 500);
        }
    }

    // --- TITLE ALERT ON BLUR ---
    let docTitle = document.title;
    window.addEventListener("blur", () => { document.title = "⚠️ NOC ALERT: Enlace inactivo | " + docTitle.split(" - ")[0]; });
    window.addEventListener("focus", () => { document.title = docTitle; });

}); // Fin del DOMContentLoaded

// --- FUNCIONES GLOBALES PARA EL MODAL ---
// Deben estar fuera del DOMContentLoaded para ser accesibles desde el HTML (onclick)
function openModal() { 
    document.getElementById('contactModal').classList.add('active'); 
    document.getElementById('form-status').innerHTML = ''; 
}
function closeModal() { 
    document.getElementById('contactModal').classList.remove('active'); 
    document.getElementById('contactForm').reset(); 
}

async function submitForm(event) {
    event.preventDefault();
    const btn = document.getElementById('submit-msg-btn');
    const statusDiv = document.getElementById('form-status');
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.style.pointerEvents = 'none';
    
    const FORMSPREE_URL = "https://formspree.io/f/mqakevzz"; 
    const formData = new FormData(document.getElementById('contactForm'));
    
    try {
        const res = await fetch(FORMSPREE_URL, { 
            method: 'POST', 
            body: formData,
            headers: { 'Accept': 'application/json' }
        });
        if (res.ok) { 
            statusDiv.innerHTML = '<span style="color: var(--accent-green);"><i class="fas fa-check-circle"></i> Mensaje enviado exitosamente.</span>'; 
            document.getElementById('contactForm').reset(); 
            setTimeout(closeModal, 2500); 
        } else { 
            statusDiv.innerHTML = '<span style="color: #ef4444;"><i class="fas fa-exclamation-circle"></i> Error: ¿Verificaste el formulario en Formspree?</span>'; 
        }
    } catch(e) { 
        statusDiv.innerHTML = '<span style="color: #ef4444;"><i class="fas fa-exclamation-circle"></i> Error de red.</span>'; 
    } finally { 
        btn.innerHTML = originalContent; 
        btn.style.pointerEvents = 'auto'; 
    }
}

// --- SCROLL TO TOP BUTTON ---
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
    
    if (scrollToTopBtn) {
        // Escucha el evento de scroll en la ventana
        window.addEventListener("scroll", () => {
            // Mostrar el botón solo si el usuario ha bajado más de 300 píxeles
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add("show");
            } else {
                scrollToTopBtn.classList.remove("show");
            }
        });

        // Acción al hacer clic en el botón
        scrollToTopBtn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth" // Deslizamiento suave, sin saltos bruscos
            });
        });
    }