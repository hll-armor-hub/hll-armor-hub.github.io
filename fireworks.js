// Fireworks Animation for New Year's Theme
class Fireworks {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fireworks = [];
        this.particles = [];
        this.animationId = null;
        this.resizeTimeout = null;
        
        this.resize();
        // Debounce resize events for better performance
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => this.resize(), 150);
        });
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    start() {
        this.canvas.style.display = 'block';
        
        // Clear any existing fireworks/particles before starting
        this.fireworks = [];
        this.particles = [];
        
        // Clear any existing intervals/animations
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.launchInterval) {
            clearInterval(this.launchInterval);
            this.launchInterval = null;
        }
        
        // Start animation loop
        this.animate();
        
        // Launch a firework every 0.25-0.5 seconds (doubled again)
        this.launchInterval = setInterval(() => {
            // Double check theme is still active before launching
            if (this.canvas.style.display === 'block' && 
                (document.body.classList.contains('theme-newyear') || 
                 document.body.classList.contains('theme-july4'))) {
                this.launchFirework();
            } else {
                // Stop launching if theme changed
                if (this.launchInterval) {
                    clearInterval(this.launchInterval);
                    this.launchInterval = null;
                }
            }
        }, 250 + Math.random() * 250);
    }
    
    stop() {
        // Stop animation immediately
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.launchInterval) {
            clearInterval(this.launchInterval);
            this.launchInterval = null;
        }
        
        // Clear all fireworks and particles
        this.fireworks = [];
        this.particles = [];
        
        // Hide canvas and clear it
        this.canvas.style.display = 'none';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    launchFirework() {
        const x = Math.random() * this.canvas.width;
        const targetY = Math.random() * (this.canvas.height * 0.3) + (this.canvas.height * 0.1);
        const speed = 8 + Math.random() * 4;
        
        // Generate random color for this firework
        const color = {
            r: Math.floor(Math.random() * 255),
            g: Math.floor(Math.random() * 255),
            b: Math.floor(Math.random() * 255)
        };
        
        // Random size multiplier (0.5 to 2.0) - makes some bigger, some smaller
        const sizeMultiplier = 0.5 + Math.random() * 1.5;
        
        this.fireworks.push({
            x: x,
            y: this.canvas.height,
            targetY: targetY,
            speed: speed,
            trail: [],
            color: color,
            sizeMultiplier: sizeMultiplier
        });
    }
    
    updateFirework(firework) {
        const dx = 0;
        const dy = -firework.speed;
        firework.y += dy;
        
        // Add trail
        firework.trail.push({ x: firework.x, y: firework.y });
        if (firework.trail.length > 5) {
            firework.trail.shift();
        }
        
        // Check if reached target
        if (firework.y <= firework.targetY) {
            this.explode(firework);
            return false;
        }
        return true;
    }
    
    explode(firework) {
        // Use the firework's color, or generate a new random one
        const baseColor = firework.color || {
            r: Math.floor(Math.random() * 255),
            g: Math.floor(Math.random() * 255),
            b: Math.floor(Math.random() * 255)
        };
        
        // Use size multiplier to vary particle count and size
        const sizeMultiplier = firework.sizeMultiplier || 1.0;
        const particleCount = Math.floor((50 + Math.random() * 30) * sizeMultiplier);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = (2 + Math.random() * 4) * sizeMultiplier;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Add slight color variation to particles for more visual interest
            const colorVariation = 30;
            const color = {
                r: Math.max(0, Math.min(255, baseColor.r + (Math.random() - 0.5) * colorVariation)),
                g: Math.max(0, Math.min(255, baseColor.g + (Math.random() - 0.5) * colorVariation)),
                b: Math.max(0, Math.min(255, baseColor.b + (Math.random() - 0.5) * colorVariation))
            };
            
            this.particles.push({
                x: firework.x,
                y: firework.y,
                vx: vx,
                vy: vy,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.01,
                size: (2 + Math.random() * 2) * sizeMultiplier,
                color: color
            });
        }
    }
    
    updateParticle(particle) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity
        particle.vx *= 0.98; // Air resistance
        particle.vy *= 0.98;
        particle.life -= particle.decay;
        return particle.life > 0;
    }
    
    drawFirework(firework) {
        // Draw trail - use random color or white/yellow for visibility
        const trailColor = firework.color || { r: 255, g: 255, b: 200 };
        const sizeMultiplier = firework.sizeMultiplier || 1.0;
        this.ctx.strokeStyle = `rgba(${trailColor.r}, ${trailColor.g}, ${trailColor.b}, 0.9)`;
        this.ctx.lineWidth = 2 * sizeMultiplier;
        this.ctx.beginPath();
        for (let i = 0; i < firework.trail.length - 1; i++) {
            this.ctx.moveTo(firework.trail[i].x, firework.trail[i].y);
            this.ctx.lineTo(firework.trail[i + 1].x, firework.trail[i + 1].y);
        }
        this.ctx.stroke();
        
        // Draw rocket - use random color or white for visibility, size varies
        const rocketColor = firework.color || { r: 255, g: 255, b: 255 };
        this.ctx.fillStyle = `rgba(${rocketColor.r}, ${rocketColor.g}, ${rocketColor.b}, 1)`;
        this.ctx.beginPath();
        this.ctx.arc(firework.x, firework.y, 3 * sizeMultiplier, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawParticle(particle) {
        const alpha = particle.life;
        this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    animate() {
        // Check if theme is still active before continuing animation
        if (this.canvas.style.display === 'none' || 
            (!document.body.classList.contains('theme-newyear') && 
             !document.body.classList.contains('theme-july4'))) {
            this.stop();
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw fireworks
        this.fireworks = this.fireworks.filter(firework => {
            const alive = this.updateFirework(firework);
            if (alive) {
                this.drawFirework(firework);
            }
            return alive;
        });
        
        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            const alive = this.updateParticle(particle);
            if (alive) {
                this.drawParticle(particle);
            }
            return alive;
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Initialize fireworks when New Year's theme is active
let fireworksInstance = null;

function initFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    if (!canvas) return;
    
    if (!fireworksInstance) {
        fireworksInstance = new Fireworks(canvas);
    }
    
    // Check if New Year's or July 4th theme is active
    const isActive = document.body.classList.contains('theme-newyear') || 
                     document.body.classList.contains('theme-july4');
    
    if (isActive) {
        // Only start if not already running
        if (fireworksInstance.canvas.style.display === 'none' || !fireworksInstance.animationId) {
            fireworksInstance.start();
        }
    } else {
        // Stop immediately if theme is not active
        fireworksInstance.stop();
    }
}

// Initialize fireworks and set up theme observer (only once)
let themeObserver = null;

function initializeFireworksSystem() {
    // Only initialize once
    if (themeObserver) return;
    
    initFireworks();
    
    // Watch for theme changes with a single observer
    themeObserver = new MutationObserver(() => {
        initFireworks();
    });
    
    themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
}

// Initialize when DOM is ready (handles both cases)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFireworksSystem);
} else {
    initializeFireworksSystem();
}

