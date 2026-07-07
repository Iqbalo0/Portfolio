# PortoGuweh

# 3D Interactive Particle Portfolio

A premium, interactive web portfolio featuring a real-time customizable 3D Particle Morphing system, light glassmorphism cards, developer profile photo grid, and smooth scroll transitions.

---

## 🚀 Key Features
- **Dynamic Wave Particle Grid**: A highly performant 3D sine-wave particle system rendered at the bottom of the screen.
- **Interactive Visual Engine**: Floating glass control panel allowing visitors to change wave styles (Calm, Storm, Digital), colors, and sizes.
- **Mobile First UX**: Sleek glassmorphism mobile header, fullscreen hamburger navigation, and optimized touch targets.
- **Fluid Math Animations**: Wave coordinates dynamically calculated using trigonometric functions (`Math.sin`/`Math.cos`).
- **About Me Profile Photo Grid**: Styled round developer profile image (`profile.jpg`) side-by-side with text details.
- **GSAP ScrollTrigger**: Camera positions and particle coordinates coordinate organically with scroll depth.
- **Light Glassmorphic Cards**: Highly readable frosted translucent panels for text details.
- **Custom Interactive Cursor**: Hover transitions and scale animation tailored for link and button components.
- **Performance visibility handler**: Automatically pauses WebGL calculations when the window is minimized or hidden.

---

## 📁 File Structure
- `index.html` - Core DOM structure, floating GUI control panel, portfolio content sections, and CDN integrations.
- `style.css` - Custom typography system, layout classes, light glassmorphism cards, responsive about grid, and cursor animations.
- `main.js` - Three.js particle math, shapes generator, lighting, post-processing composer, morph timelines, and control panel event handlers.
- `profile.jpg` - Flat-style vector developer avatar.
- `design.md` - Complete visual design guidelines and parameter tokens tables.
- `read.me` - Project overview and startup directions.

---

## 🛠️ Quick Start

To launch and run the portfolio locally:

1. **Host via HTTP Server**:
   You can run a quick python server inside this directory:
   ```bash
   python -m http.server 8000
   ```
2. **Access in Browser**:
   Open [http://localhost:8000](http://localhost:8000) inside your web browser.

3. **or use**
(npx serve . --listen 3000)
