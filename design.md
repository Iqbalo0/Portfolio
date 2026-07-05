# Design System & Creative Concept

This document details the visual guidelines, typography, layout systems, and 3D particle configurations for the interactive portfolio.

## 1. Aesthetic Direction
The portfolio employs a **clean, minimalist, high-contrast brutalist-doodle aesthetic** consisting of a pure white background, premium maroon typography, light glassmorphism layers, and a highly interactive, customizable 3D particle system.

---

## 2. Color Palette & UI Tokens

| Token | CSS Variable | Hex Color | Description |
| :--- | :--- | :--- | :--- |
| **Primary Background** | `--bg-dark` | `#ffffff` | Pure white background for high-end clean layout. |
| **Primary Text / Logo** | `--text-light` | `#240003` | Deep luxury maroon for headings and branding. |
| **Secondary Text** | `--text-gray` | `#5e484a` | Slate-maroon for descriptive copy and active links. |
| **Primary Accent** | `--neon-cyan` | `#ab1b2b` | Crimson red for primary hover states and buttons. |
| **Secondary Accent** | `--neon-magenta` | `#5a0c13` | Darker burgundy-maroon for outlines and panel borders. |

---

## 3. Light Glassmorphism Specifications
To maintain high contrast and readability on a white background, the card containers are styled as light glassmorphism layers:
- **Background Fill**: `rgba(255, 255, 255, 0.45)`
- **Backdrop Blur Filter**: `blur(14px)`
- **Card Border**: `1px solid rgba(36, 0, 3, 0.08)` (delicate dark maroon line)
- **Drop Shadow**: `0 20px 45px rgba(36, 0, 3, 0.05)` (soft diffused shadow)

---

## 4. About Section Profile Grid
The About section features a responsive two-column grid:
- **Left Column (Profile Picture)**: A styled `150px` circular picture containing the developer image (`profile.jpg`) framed in crimson with drop shadow.
- **Right Column (Details)**: Paragraph description and bulleted tech skills stack.

---

## 5. WebGL Scene & Morphing Particle System
The interactive canvas handles the rendering of a customizable 3D particle system.

### Mathematical Particle Formulations ($N = 3000$)
- **Sphere**: Fibonacci sphere distribution for uniform placement.
  $$x = r \sin(\phi) \cos(\theta), \quad y = r \sin(\phi) \sin(\theta), \quad z = r \cos(\phi)$$
- **Torus Knot (p=2, q=3)**: Parametric winding loops.
  $$x = (R + r \cos(q t)) \cos(p t), \quad y = (R + r \cos(q t)) \sin(p t), \quad z = r \sin(q t)$$
- **Wave Grid**: A wavy mathematical terrain using sine and cosine functions.
  $$y = \sin(row \times 0.15) \times \cos(col \times 0.15) \times 0.45$$

### Customization Engine
Visitors can customize the visual parameters in real-time via a floating light-glassmorphic panel:
- **Shape Morphing**: Smooth interpolation of $X,Y,Z$ coordinates over a $1.4$s GSAP tween with power-2 easing.
- **Color Selection**: Maroon (`0x5a0c13`), Crimson (`0xab1b2b`), or Gold (`0xd4af37`).
- **Particle Size**: Small (`0.025`), Medium (`0.05`), or Large (`0.085`).
- **Blending & Transparency**: Normal blending is used for high visibility on a white canvas.

---

## 6. Animation Timelines
- **Idle Motion**: The `particleSystem` rotates automatically on both Y and X axes (`rotation.y += 0.003`, `rotation.x += 0.0015`) for gentle wobbling depth.
- **Scroll Timelines**: GSAP ScrollTrigger binds coordinates:
  - **Section 1 (Hero)**: Centered particle system.
  - **Section 2 (About)**: Shifted leftwards and rotated.
  - **Section 3 (Projects)**: Shifted rightwards and scaled up.
  - **Section 4 (Contact)**: Centered low.
