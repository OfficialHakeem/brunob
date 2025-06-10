
document.addEventListener('DOMContentLoaded', function() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.textContent = `© ${currentYear} BrunoB`;
    }
});

document.addEventListener('DOMContentLoaded', function() {
    createFloatingParticles();
    
    enhanceLinkAnimations();
    
    addTypingAnimation();
    
    addScrollAnimations();
});

function createFloatingParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particles';
    particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    document.body.appendChild(particleContainer);
    
    for (let i = 0; i < 15; i++) {
        createParticle(particleContainer);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 1;
    const animationDuration = Math.random() * 20 + 10;
    const opacity = Math.random() * 0.5 + 0.1;
    
    particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: var(--text-accent);
        border-radius: 50%;
        opacity: ${opacity};
        left: ${Math.random() * 100}%;
        animation: floatParticle ${animationDuration}s infinite linear;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatParticle {
            0% {
                transform: translateY(100vh) rotate(0deg);
            }
            100% {
                transform: translateY(-100px) rotate(360deg);
            }
        }
    `;
    document.head.appendChild(style);
    
    container.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
        createParticle(container);    }, animationDuration * 1000);
}

function enhanceLinkAnimations() {
    const links = document.querySelectorAll('.link');
    
    links.forEach((link, index) => {
        link.style.animationDelay = `${0.6 + index * 0.1}s`;
        link.classList.add('slide-in-bottom');
        
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05) rotate(1deg)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1) rotate(0deg)';
        });
        
        link.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: radial-gradient(circle, var(--text-accent) 0%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                animation: ripple 0.6s linear;
            `;
            
            const rippleStyle = document.createElement('style');
            rippleStyle.textContent = `
                @keyframes ripple {
                    0% {
                        transform: scale(0);
                        opacity: 0.6;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(rippleStyle);
            
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

function addTypingAnimation() {
    const title = document.querySelector('.title');
    if (title) {
        const text = title.textContent;
        title.textContent = '';
        title.style.borderRight = '2px solid var(--text-accent)';
        
        let i = 0;
        function typeWriter() {
            if (i < text.length) {
                title.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            } else {
                setTimeout(() => {
                    title.style.borderRight = 'none';
                }, 1000);
            }
        }
        
        setTimeout(typeWriter, 1500);
    }
}

function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    const elements = document.querySelectorAll('.header, .about, .links, .footer');
    elements.forEach(el => observer.observe(el));
}

// Enhanced email functionality
document.addEventListener('DOMContentLoaded', function() {
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (emailLink) {
        emailLink.addEventListener('click', function(e) {
            e.preventDefault();
            const email = this.getAttribute('href').replace('mailto:', '');
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(email).then(() => {
                    showNotification('Email copied to clipboard!');
                }).catch(() => {
                    window.location.href = this.getAttribute('href');
                });
            } else {
                window.location.href = this.getAttribute('href');
            }
        });
    }
    
    // CV link functionality
    const cvLink = document.getElementById('cv-link');
    if (cvLink) {
        cvLink.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('CV aún no está disponible');
        });
    }
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--text-accent);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
    `;
    notification.textContent = message;
    
    const notificationStyle = document.createElement('style');
    notificationStyle.textContent = `
        @keyframes slideInRight {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(notificationStyle);
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}