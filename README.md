# SyncBreaker Retro (Gemini Experimental Build)

> **Note:** This repository (`syncbreaker_retro`) is an experimental build created on top of the **initial prototype version of SyncBreaker** specifically to **test and evaluate Gemini models** on from-scratch UI design, custom 2D physics engine programming, and timing bar rendering.
>
> A much more advanced version of the game lives in the main repository: **[dormhi/syncbreaker](https://github.com/dormhi/syncbreaker)** ([Play Main Version](https://dormhi.github.io/syncbreaker/)).

🔗 **[Play SyncBreaker Retro on GitHub Pages](https://dormhi.github.io/syncbreaker_retro/)**

---

## 🧪 About This Experiment

Built using pure **Vanilla JavaScript** and the **HTML5 Canvas 2D API** (zero external engines or frameworks), this experiment explores how well Gemini models can design and implement three core pillars from scratch on top of the early SyncBreaker codebase:

1. **Modern Glassmorphism & Minimalist Neon UI** (`js/UIManager.js`, `css/style.css`)
2. **Custom 2D Physics Engine** (`js/PhysicsEngine.js`)
3. **Fluid Neon Light Capsule Timing Bar** (`js/LevelManager.js`, `js/LevelThemes.js`)

---

## ✨ Key Implemented Features

### ⚙️ 2D Physics Engine (`js/PhysicsEngine.js`)
- **`Spring1D` & `Spring2D`**: Hooke's Law spring-damper oscillators (`stiffness`, `damping`, `mass`) integrated with semi-implicit Euler steps.
- **`SliderPhysics`**: Timing bar cursor kinematics with smooth velocity acceleration, elastic boundary bounce (`0.92` reflection factor), squash-and-stretch springs (`squashX`, `squashY`), elastic end-bumper springs (`leftBumperSpring`, `rightBumperSpring`), and an 18-sample fluid motion trail.
- **`WaveBarPhysics`**: A 48-node coupled 1D spring oscillator stretched across the timing bar that propagates kinetic ripples on hits, cursor motion, and wall bounces.
- **`CameraPhysics`**: Directional spring recoil (`Spring2D`), rotational tilt (`angle`), and decaying `trauma` screen shake on impacts.
- **`PhysicsWorld2D`**: Rigid-body glass/neon debris shard simulation (`gravity`, drag, angular velocity, and floor collision bounce with `restitution: 0.58`) alongside expanding neon shockwave rings.

### 🪟 Glassmorphic Neon Interface (`js/UIManager.js`, `js/GameManager.js`, `js/LockpickSystem.js`)
- Frosted translucent glass panels (`drawGlassPanel`) with specular top edge highlights, subtle inner color gradients, and moving ambient bokeh orbs for background depth.
- Spring-animated glass buttons and node cards (`scaleSpring`, `hoverSpring`) with fiber-optic animated connection pulses in the Network Topology Hub.
- Top HUD featuring `SYSTEM SCORE`, bouncing `COMBO` neon pills, and a 7-cell liquid-neon `ENERGY CORE` bar.
- Redesigned radial **Code Breaker (Lockpick)** mini-game with a frosted glass dial, `25°` comet-trail scanner cursor, alignment flare, and spring-pulsing directional pills.

### ⚡ Fluid Light Timing Bar (`js/LevelManager.js`)
- Multi-layered frosted glass chassis with elastic neon end bumpers and scale ticks.
- Recessed dark light track displaying the live 48-node `WaveBarPhysics` harmonic wave.
- Spring-morphing target zone featuring an outer **Good** neon capsule and an inner **35% Perfect** core.
- Vertical white-hot light-blade cursor with squash-and-stretch deformation, trailing neon ribbon, and floating themed icon micro-badge.

---

## 🎮 Controls & Gameplay

- **Timing Bar (Main Defense):** Press `Space` (or **Tap** on mobile) when the light-blade cursor aligns inside the glowing neon target zone. Clean all 6 infected system nodes to unlock **Endless Mode**.
- **Code Breaker (Lockpick / Recovery):** Press `Arrow Keys` / `WASD` (or **Swipe** Up/Down/Left/Right on mobile) when the rotating scanner aligns with each directional node.

---

## 🗂️ Project Structure

```text
.
├── index.html             # Entry point (GitHub Pages ready)
├── .nojekyll              # Disables Jekyll processing on GitHub Pages
├── css/
│   └── style.css          # Radial cyber-glass frame & canvas styling
└── js/
    ├── utils.js           # Math, easing & canvas rounded-rect helpers
    ├── PhysicsEngine.js   # Custom 2D spring-damper, wave & debris physics
    ├── EnergySystem.js    # Charge regeneration & localStorage persistence
    ├── StateManager.js    # Finite state machine & screen transitions
    ├── UIManager.js       # Glassmorphism primitives, spring buttons & HUD
    ├── LockpickSystem.js  # Radial code breaker mini-game
    ├── SoundManager.js    # Web Audio API oscillator synthesis & ambient audio
    ├── LevelThemes.js     # Per-level neon palettes, icons & particles
    ├── LevelManager.js    # Timing bar, level progression & endless waves
    ├── GameManager.js     # Menu, Hub, bokeh background & input routing
    └── main.js            # Responsive 960x640 canvas & requestAnimationFrame loop
```

---

## 🛠️ Running Locally & GitHub Pages

No build step or dependencies are required:

```bash
git clone https://github.com/dormhi/syncbreaker_retro.git
cd syncbreaker_retro
```

Open `index.html` directly in your browser or serve with any static HTTP server (e.g., `python3 -m http.server 8000`).  
For **GitHub Pages**, configure **Settings → Pages → Deploy from a branch** on `main` / `/ (root)`.
