import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- APPLICATION SETUP ---
class App {
    constructor() {
        this.canvas = document.querySelector('#webgl-canvas');
        this.isTabActive = true;
        this.isMobile = window.innerWidth <= 768;
        
        // Mouse coordinate states for parallax
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };

        this.initThree();
        this.initLights();
        this.initObjects();
        this.initPostProcessing();
        this.initScrollAnimations();
        this.initResize();
        this.initNavigation();
        this.initCursor();
        this.initMouseEvents();
        this.initControlPanelEvents();
        this.initHamburger();
        
        // Start Render Loop
        this.animate();
    }

    // 1. Setup Scene, Camera, and WebGLRenderer
    initThree() {
        this.scene = new THREE.Scene();
        
        // Fog & Scene Background (Fog matched to solid background color for clean postprocessing alpha)
        const bgColor = '#ffffff';
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.FogExp2(bgColor, 0.01);

        this.camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            100
        );
        this.camera.position.set(0, 0, 6);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
        
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    // 2. Setup Lighting (Ambient and Cinematic Rim Lights)
    initLights() {
        this.ambientLight = new THREE.AmbientLight('#ffffff', 0.55);
        this.scene.add(this.ambientLight);

        // Directional Light 1: Crimson (Rim Light Back-Right)
        this.cyanLight = new THREE.DirectionalLight('#ab1b2b', 1.8);
        this.cyanLight.position.set(5, 3, -4);
        this.scene.add(this.cyanLight);

        // Directional Light 2: Soft Rose-Pink (Rim Light Front-Left)
        this.magentaLight = new THREE.DirectionalLight('#ffb3c1', 1.8);
        this.magentaLight.position.set(-5, -2, 4);
        this.scene.add(this.magentaLight);

        // Subtle white light from top-center
        this.topLight = new THREE.DirectionalLight('#ffffff', 0.6);
        this.topLight.position.set(0, 5, 0);
        this.scene.add(this.topLight);
    }

    // 3. Setup Wave Particle System (Grid)
    initObjects() {
        // Parent Parallax Group: Handles mouse parallax offset shifts
        this.parallaxGroup = new THREE.Group();
        this.scene.add(this.parallaxGroup);

        // Child Scroll Group: Handles ScrollTrigger timeline position & rotation
        this.meshGroup = new THREE.Group();
        this.parallaxGroup.add(this.meshGroup);

        // Grid configurations for Wave Particles
        this.gridX = this.isMobile ? 50 : 100;
        this.gridZ = this.isMobile ? 25 : 50;
        this.particleCount = this.gridX * this.gridZ;
        
        // Initial wave state
        this.waveStyle = 'calm';
        this.waveSpeed = 1.0;

        const positions = new Float32Array(this.particleCount * 3);

        let i = 0;
        const separationX = 0.18; 
        const separationZ = 0.18;
        const offsetX = (this.gridX * separationX) / 2;
        const offsetZ = (this.gridZ * separationZ) / 2;

        for (let ix = 0; ix < this.gridX; ix++) {
            for (let iz = 0; iz < this.gridZ; iz++) {
                positions[i] = ix * separationX - offsetX;     // x
                positions[i + 1] = 0;                          // y (will be animated)
                positions[i + 2] = iz * separationZ - offsetZ; // z
                i += 3;
            }
        }

        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particlePositions = this.particleGeometry.attributes.position;

        // Custom Points Material
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0x5a0c13, // Maroon default
            size: 0.05,
            transparent: true,
            opacity: 0.82,
            depthWrite: true
        });

        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.meshGroup.add(this.particleSystem);

        // Initial setup for the wave group (Place at the bottom)
        this.meshGroup.position.set(0, -2.5, -2);
        this.meshGroup.rotation.x = Math.PI / 12; // Slight tilt
    }

    // Set particle color dynamically
    setParticleColor(colorName) {
        let colorHex;
        if (colorName === 'maroon') colorHex = 0x5a0c13;
        else if (colorName === 'crimson') colorHex = 0xab1b2b;
        else if (colorName === 'gold') colorHex = 0xd4af37;
        else return;

        gsap.to(this.particleMaterial.color, {
            r: ((colorHex >> 16) & 255) / 255,
            g: ((colorHex >> 8) & 255) / 255,
            b: (colorHex & 255) / 255,
            duration: 0.6
        });
    }

    // Set particle size dynamically
    setParticleSize(sizeName) {
        let sizeVal;
        if (sizeName === 'small') sizeVal = 0.025;
        else if (sizeName === 'medium') sizeVal = 0.05;
        else if (sizeName === 'large') sizeVal = 0.085;
        else return;

        gsap.to(this.particleMaterial, {
            size: sizeVal,
            duration: 0.5
        });
    }

    // Bind GUI control buttons to panel collapse/expand and styles
    initControlPanelEvents() {
        // Wave Style selectors
        document.querySelectorAll('#wave-selectors .ctrl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#wave-selectors .ctrl-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.waveStyle = btn.dataset.wave;
            });
        });

        // Color selectors
        document.querySelectorAll('#color-selectors .ctrl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#color-selectors .ctrl-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setParticleColor(btn.dataset.color);
            });
        });

        // Size selectors
        document.querySelectorAll('#size-selectors .ctrl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#size-selectors .ctrl-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setParticleSize(btn.dataset.size);
            });
        });

        // Toggle Control Panel (Close/Open sliding animations)
        const controlPanel = document.getElementById('controlPanel');
        const closeBtn = document.getElementById('closePanelBtn');
        const openBtn = document.getElementById('openPanelBtn');

        if (controlPanel && closeBtn && openBtn) {
            // Check if mobile for different initial state and animation
            const isMobile = window.innerWidth <= 768;

            // Initially on mobile, start closed. On desktop, start open.
            if (isMobile) {
                gsap.set(controlPanel, { y: '100%', opacity: 0, visibility: 'hidden' });
                gsap.set(openBtn, { scale: 1, opacity: 1, visibility: 'visible' });
            } else {
                gsap.set(controlPanel, { x: 0, opacity: 1, visibility: 'visible' });
                gsap.set(openBtn, { scale: 0.9, opacity: 0, visibility: 'hidden' });
            }

            closeBtn.addEventListener('click', () => {
                const currentIsMobile = window.innerWidth <= 768;
                gsap.timeline()
                    .to(controlPanel, { 
                        x: currentIsMobile ? 0 : -150, 
                        y: currentIsMobile ? '100%' : 0,
                        opacity: 0, 
                        duration: 0.4, 
                        ease: 'power2.inOut',
                        onComplete: () => {
                            gsap.set(controlPanel, { visibility: 'hidden' });
                        }
                    })
                    .to(openBtn, { 
                        scale: 1, 
                        opacity: 1, 
                        visibility: 'visible', 
                        duration: 0.3, 
                        ease: 'back.out(1.7)' 
                    }, '-=0.1');
            });

            openBtn.addEventListener('click', () => {
                const currentIsMobile = window.innerWidth <= 768;
                gsap.timeline()
                    .to(openBtn, { 
                        scale: 0.9, 
                        opacity: 0, 
                        duration: 0.3, 
                        ease: 'power2.in',
                        onComplete: () => {
                            gsap.set(openBtn, { visibility: 'hidden' });
                        }
                    })
                    .set(controlPanel, { visibility: 'visible' })
                    .to(controlPanel, { 
                        x: 0, 
                        y: 0,
                        opacity: 1, 
                        duration: 0.4, 
                        ease: 'power2.out' 
                    }, '-=0.1');
            });
        }
    }

    // Hamburger Menu Toggle for Mobile Navigation
    initHamburger() {
        const hamburger = document.getElementById('hamburgerBtn');
        const navLinks = document.querySelector('.nav-links');
        if (!hamburger || !navLinks) return;

        hamburger.addEventListener('click', () => {
            const isOpen = navLinks.classList.contains('open');
            if (isOpen) {
                this.closeNav(hamburger, navLinks);
            } else {
                this.openNav(hamburger, navLinks);
            }
        });

        // Auto-close nav when a link is clicked
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (this.isMobile && navLinks.classList.contains('open')) {
                    this.closeNav(hamburger, navLinks);
                }
            });
        });
    }

    openNav(hamburger, navLinks) {
        hamburger.classList.add('active');
        navLinks.classList.add('open');
        // Prevent body scroll when nav is open
        document.body.style.overflow = 'hidden';
    }

    closeNav(hamburger, navLinks) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
    }

    // 4. Setup Post-processing Glow via UnrealBloomPass
    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // UnrealBloomPass parameters: (resolution, strength, radius, threshold)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.2,   // strength
            0.2,   // radius
            0.85   // threshold
        );
        this.composer.addPass(this.bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    // 5. Bind camera, mesh, and DOM text elements to ScrollTrigger
    initScrollAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // Set initial visibility of sections via GSAP
        gsap.set('#sec-hero', { autoAlpha: 1, y: 0, pointerEvents: 'auto' });
        gsap.set(['#sec-about', '#sec-projects', '#sec-contact'], { autoAlpha: 0, y: 30, pointerEvents: 'none' });

        // Scroll Timeline bound directly to #scroll-height-generator
        this.scrollTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '#scroll-height-generator',
                start: 'top top',
                end: 'bottom bottom',
                scrub: this.isMobile ? 1 : 1.5
            }
        });

        this.scrollTimeline
            // --- Phase 1: Hero to About (Scroll progress 0% -> ~33%) ---
            .to('#sec-hero', { autoAlpha: 0, y: -40, pointerEvents: 'none', duration: 1 })
            .to('.scroll-indicator', { autoAlpha: 0, duration: 0.5 }, '<')
            .to('#sec-about', { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1 }, '<')
            .to(this.meshGroup.position, { x: -1.0, y: -2.0, z: -1.0, duration: 1 }, '<')
            .to(this.camera.position, { x: -0.5, y: 0, z: 5.0, duration: 1 }, '<')
            .to(this.meshGroup.rotation, { x: Math.PI / 6, y: 0.1, z: -0.05, duration: 1 }, '<')

            // --- Phase 2: About to Projects (Scroll progress ~33% -> ~66%) ---
            .to('#sec-about', { autoAlpha: 0, y: -40, pointerEvents: 'none', duration: 1 })
            .to('#sec-projects', { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1 }, '<')
            .to(this.meshGroup.position, { x: 1.0, y: -1.5, z: -3.0, duration: 1 }, '<')
            .to(this.camera.position, { x: 0.5, y: 0.2, z: 5.5, duration: 1 }, '<')
            .to(this.meshGroup.rotation, { x: Math.PI / 8, y: -0.1, z: 0.05, duration: 1 }, '<')

            // --- Phase 3: Projects to Contact (Scroll progress ~66% -> 100%) ---
            .to('#sec-projects', { autoAlpha: 0, y: -40, pointerEvents: 'none', duration: 1 })
            .to('#sec-contact', { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1 }, '<')
            .to(this.meshGroup.position, { x: 0, y: -2.2, z: 0, duration: 1 }, '<')
            .to(this.camera.position, { x: 0, y: 0, z: 3.5, duration: 1 }, '<')
            .to(this.meshGroup.rotation, { x: Math.PI / 10, y: 0, z: 0, duration: 1 }, '<');

        ScrollTrigger.refresh();
    }

    // 6. Setup link clicking to scroll programmatically
    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        // Highlight active links on scroll
        ScrollTrigger.create({
            trigger: '#scroll-height-generator',
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                const progress = self.progress;
                let activeIndex = 0;
                
                if (progress > 0.8) activeIndex = 3;
                else if (progress > 0.48) activeIndex = 2;
                else if (progress > 0.15) activeIndex = 1;
                
                navLinks.forEach((link, idx) => {
                    if (idx === activeIndex) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });

        // Click to scroll for header links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetIdx = parseInt(link.getAttribute('data-section'));
                const scrollPos = targetIdx * window.innerHeight;
                window.scrollTo({
                    top: scrollPos,
                    behavior: 'smooth'
                });
            });
        });

        // Click to scroll for CTA buttons
        document.querySelectorAll('button[data-section]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetIdx = parseInt(btn.getAttribute('data-section'));
                const scrollPos = targetIdx * window.innerHeight;
                window.scrollTo({
                    top: scrollPos,
                    behavior: 'smooth'
                });
            });
        });
    }

    // 7. Setup Custom Glowing Cursor Animations
    initCursor() {
        const dot = document.querySelector('.custom-cursor-dot');
        const outline = document.querySelector('.custom-cursor-outline');

        if (dot && outline) {
            window.addEventListener('mousemove', (e) => {
                // Instantly update inner dot position
                gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0 });
                // Smoothly update outer circle outline with inertia
                gsap.to(outline, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out' });
            });

            // Wire hover animations for all clickable targets
            const hoverables = document.querySelectorAll('a, button, .project-card');
            hoverables.forEach(el => {
                el.addEventListener('mouseenter', () => {
                    dot.classList.add('hover');
                    outline.classList.add('hover');
                });
                el.addEventListener('mouseleave', () => {
                    dot.classList.remove('hover');
                    outline.classList.remove('hover');
                });
            });
        }
    }

    // 8. Capture Mouse Movements for Parallax Parallax
    initMouseEvents() {
        window.addEventListener('mousemove', (e) => {
            // Map coordinate offsets between [-1, 1]
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Optimization: Suspend updates on tab change
        document.addEventListener('visibilitychange', () => {
            this.isTabActive = !document.hidden;
        });
    }

    // Dynamic resizing
    initResize() {
        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Update mobile flag
            this.isMobile = width <= 768;

            // Camera aspect ratio
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            // Renderer dimensions
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));

            // Composer passes dimensions
            this.composer.setSize(width, height);
            this.bloomPass.setSize(width, height);
            
            ScrollTrigger.refresh();
        });
    }

    // Render loop
    animate() {
        requestAnimationFrame(() => this.animate());

        // Skip render processing frames if tab is minimized/inactive
        if (!this.isTabActive) return;

        // 1. Animate Wave Particles
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const time = Date.now() * 0.001 * this.waveSpeed;
            
            for (let i = 0; i < this.particleCount * 3; i += 3) {
                const x = positions[i];
                const z = positions[i + 2];
                
                let y = 0;
                if (this.waveStyle === 'calm') {
                    y = Math.sin(x * 0.5 + time) * 0.25 + Math.cos(z * 0.5 + time * 0.8) * 0.25;
                } else if (this.waveStyle === 'storm') {
                    y = Math.sin(x * 1.5 + time * 2.0) * 0.4 + Math.cos(z * 1.2 + time * 1.5) * 0.4;
                } else if (this.waveStyle === 'digital') {
                    // Stepped sine wave for a pixelated/digital feel
                    y = Math.round(Math.sin(x * 1.2 + time) * 0.3 + Math.cos(z * 1.2 + time) * 0.3);
                }
                
                positions[i + 1] = y;
            }
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }

        // 2. Linear Interpolation (lerp) mouse movement coordinates for lag inertia
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        // 3. Translate mouse coordinates into parallax displacement on the parallaxGroup
        if (this.parallaxGroup) {
            this.parallaxGroup.position.x = this.mouse.x * 0.4;
            this.parallaxGroup.position.y = this.mouse.y * 0.4;
            
            // Wobble mesh angles slightly
            this.parallaxGroup.rotation.y = this.mouse.x * 0.15;
            this.parallaxGroup.rotation.x = -this.mouse.y * 0.15;
        }

        // 4. Focus camera towards center of scene
        if (this.camera) {
            this.camera.lookAt(0, 0, 0);
        }

        // 5. Composer Post-processing render (Bloom render instead of base WebGL renderer)
        this.composer.render();
    }
}

// Start app on full window load for correct bounds calculations
window.addEventListener('load', () => {
    new App();
});
