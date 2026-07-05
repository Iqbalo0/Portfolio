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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
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

    // 3. Setup 3D Particle System and Decoupled Hierarchy Groups
    initObjects() {
        // Parent Parallax Group: Handles mouse parallax offset shifts
        this.parallaxGroup = new THREE.Group();
        this.scene.add(this.parallaxGroup);

        // Child Scroll Group: Handles ScrollTrigger timeline position & rotation
        this.meshGroup = new THREE.Group();
        this.parallaxGroup.add(this.meshGroup);

        this.particleCount = 3000;
        this.spherePositions = [];
        this.torusPositions = [];
        this.wavePositions = [];

        // 1. Generate Target Coordinates: Sphere (Fibonacci distribution)
        for (let i = 0; i < this.particleCount; i++) {
            const phi = Math.acos(1 - 2 * (i / this.particleCount));
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const radius = 1.35;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            this.spherePositions.push(x, y, z);
        }

        // 2. Generate Target Coordinates: Torus Knot (p=2, q=3)
        for (let i = 0; i < this.particleCount; i++) {
            const t = (i / this.particleCount) * Math.PI * 2 * 10;
            const p = 2;
            const q = 3;
            const r = 0.8 + 0.3 * Math.cos(q * t);
            const x = r * Math.cos(p * t);
            const y = r * Math.sin(p * t);
            const z = 0.3 * Math.sin(q * t);
            this.torusPositions.push(x * 1.5, y * 1.5, z * 1.5);
        }

        // 3. Generate Target Coordinates: Wave Grid
        for (let i = 0; i < this.particleCount; i++) {
            const row = Math.floor(i / 54);
            const col = i % 54;
            const x = ((row / 54) - 0.5) * 3.4;
            const z = ((col / 54) - 0.5) * 3.4;
            const y = Math.sin(row * 0.15) * Math.cos(col * 0.15) * 0.45;
            this.wavePositions.push(x, y, z);
        }

        // Create starting geometry (Sphere)
        const startingPositions = new Float32Array(this.spherePositions);
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(startingPositions, 3));
        this.particlePositions = this.particleGeometry.attributes.position;

        // Custom Points Material (High-contrast normal blending for white theme)
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0x5a0c13, // Maroon default
            size: 0.05,
            transparent: true,
            opacity: 0.82,
            depthWrite: true
        });

        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.meshGroup.add(this.particleSystem);

        // Initial setup for the group
        this.meshGroup.position.set(0, 0, 0);
    }

    // Morph active particles to new target position array smoothly using GSAP
    morphParticleShape(targetShapeName) {
        let targetArray;
        if (targetShapeName === 'sphere') targetArray = this.spherePositions;
        else if (targetShapeName === 'torus') targetArray = this.torusPositions;
        else if (targetShapeName === 'wave') targetArray = this.wavePositions;
        else return;

        const sourceArray = [...this.particlePositions.array];
        const current = this.particlePositions.array;
        const len = current.length;

        if (this.morphTween) this.morphTween.kill();

        const morphObj = { progress: 0 };
        this.morphTween = gsap.to(morphObj, {
            progress: 1,
            duration: 1.4,
            ease: 'power2.inOut',
            onUpdate: () => {
                const p = morphObj.progress;
                for (let i = 0; i < len; i++) {
                    current[i] = sourceArray[i] + (targetArray[i] - sourceArray[i]) * p;
                }
                this.particlePositions.needsUpdate = true;
            }
        });
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

    // Bind GUI control buttons to morphing functions
    initControlPanelEvents() {
        // Shape selectors
        document.querySelectorAll('#shape-selectors .ctrl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#shape-selectors .ctrl-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.morphParticleShape(btn.dataset.shape);
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
                scrub: 1.5
            }
        });

        this.scrollTimeline
            // --- Phase 1: Hero to About (Scroll progress 0% -> ~33%) ---
            .to('#sec-hero', { autoAlpha: 0, y: -40, pointerEvents: 'none', duration: 1 })
            .to('.scroll-indicator', { autoAlpha: 0, duration: 0.5 }, '<')
            .to('#sec-about', { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1 }, '<')
            .to(this.meshGroup.position, { x: -1.8, y: -0.2, z: 0.5, duration: 1 }, '<')
            .to(this.camera.position, { x: -0.5, y: 0, z: 5.0, duration: 1 }, '<')
            .to(this.meshGroup.rotation, { x: 0.5, y: 1.5, z: 0.2, duration: 1 }, '<')

            // --- Phase 2: About to Projects (Scroll progress ~33% -> ~66%) ---
            .to('#sec-about', { autoAlpha: 0, y: -40, pointerEvents: 'none', duration: 1 })
            .to('#sec-projects', { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1 }, '<')
            .to(this.meshGroup.position, { x: 1.8, y: 0.3, z: -0.5, duration: 1 }, '<')
            .to(this.camera.position, { x: 0.5, y: 0.2, z: 5.5, duration: 1 }, '<')
            .to(this.meshGroup.rotation, { x: -0.5, y: 3.14, z: -0.5, duration: 1 }, '<')

            // --- Phase 3: Projects to Contact (Scroll progress ~66% -> 100%) ---
            .to('#sec-projects', { autoAlpha: 0, y: -40, pointerEvents: 'none', duration: 1 })
            .to('#sec-contact', { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1 }, '<')
            .to(this.meshGroup.position, { x: 0, y: -0.8, z: 1.0, duration: 1 }, '<')
            .to(this.camera.position, { x: 0, y: 0, z: 3.5, duration: 1 }, '<')
            .to(this.meshGroup.rotation, { x: 1.0, y: 4.7, z: 0, duration: 1 }, '<');

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

            // Camera aspect ratio
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            // Renderer dimensions
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

        // 1. Idle auto-rotation on the particle system
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.003;
            this.particleSystem.rotation.x += 0.0015;
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
