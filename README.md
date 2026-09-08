# ANTI-GRAVITY ⚡

> **"Defy Gravity. Own the Track."**

A high-octane 3D futuristic anti-gravity arcade racing game built for the web, optimized for desktop and touch devices (Android & iOS). Pilot hovercraft that float above magnetic ribbon tracks soaring hundreds of meters above a bustling cyberpunk metropolis.

live at:- https://statuesque-marzipan-e80b30.netlify.app/

---

## 🚀 Features

### 🛸 Anti-Gravity Physics
* **Hover Suspension**: Damped harmonic spring simulation keeping the vehicle floating $0.75\text{m}$ above the track surface.
* **3D Banking & Pitch**: Dynamic roll into turns (up to $35^\circ$), pitch up on acceleration, and pitch down on braking.
* **Plasma Drifting**: Loosen lateral grip to slide around hairpins and charge extra boost energy.
* **Airborne Ballistics**: 3D parabolic gravity trajectory when launching off elevated ramps and chasms.
* **Magnetic Track Centering (Steering Assist)**: Subtle assist pulling your craft away from walls for smooth, fluid mobile racing.
* **Fall Detection & Respawn**: Automated 1-second recovery with temporary invulnerability shield.

### 🏁 Floating Circuits
1. **Track 01 — Skyline Circuit** *(Beginner)*: Wide glowing highway weaving through towering mega-structures, 3 boost pads, and a highway jump ramp.
2. **Track 02 — Neon Core** *(Intermediate)*: Multi-level corkscrews, tight chicanes, plasma tunnels, moving hazard pillars, and 4 boost strips.
3. **Track 03 — Void Run** *(Advanced)*: Orbital floating track segments, massive zero-G jumps, and a hazardous shortcut tunnel.

### 🤖 5 Unique AI Opponents
* **NOVA** (Cyan/White, aggressive speedster)
* **VORTEX** (Purple/Gold, master cornering & drifting)
* **PHANTOM** (Black/Red, stealthy top-speed specialist)
* **TITAN** (Green/Orange, heavy rammer with high shield)
* **CIRCUIT** (Yellow/Blue, tactical boost manager)
* *Difficulty Presets*: **Casual**, **Pilot**, and **Elite**.

### ⚡ Ion Boost & Power-Up Arsenal
* **Ion Boost**: Instant 45% speed surge, dynamic camera pull, FOV expansion ($65^\circ \to 82^\circ$), and radial speed warp lines.
* **TURBO**: Maximum rocket surge with invincibility frames.
* **SHIELD**: Hexagonal kinetic barrier absorbing collisions and obstacles.
* **MAGNET**: Electromagnetically pulls nearby energy pickups towards the vehicle.
* **PHASE**: Quantum phase shift allowing the craft to pass through barriers safely.
* **EMP BLAST**: Shockwave pulse disrupting and slowing nearby AI rivals.

### 🏎️ Vehicle Garage & Customization
* **3 Chassis Models**:
  * *Aero Striker*: Balanced velocity and agile handling.
  * *Vortex Interceptor*: Lightweight chassis built for sharp cornering.
  * *Titan Enforcer*: Heavy magnetic armor with supreme top speed and shield durability.
* **Color Customization**: Hull Paint, Neon Trim, and Ion Exhaust Glow.
* **Interactive 3D Turntable**: Inspect your hovercraft with live 3D drag rotation.

### 🔊 Procedural Web Audio API Sound Engine
* 100% self-contained synthesized sound (no external audio files required).
* Dynamic engine pitch tracking throttle and speed.
* High-tech countdown beeps (880 Hz) and victory fanfare.
* Boost rocket roar, boost pad whoosh, metallic impact crunch, and pickup arpeggios.
* Built-in 135 BPM synthwave arpeggio soundtrack.

### 📱 Android & Touch-First Design
* **Ergonomic Thumb Zones**: Left thumb steering pad (tap or slide) and right thumb action cluster (massive boost button, drift, brake, and item).
* **Auto-Drive Mode**: Default on touch devices — vehicle automatically accelerates to cruising speed, eliminating thumb fatigue.
* **Haptic Vibration**: Tactile feedback via Android `navigator.vibrate` on button taps, boost triggers, and collisions.
* **One-Tap Fullscreen**: Toggle `⛶` in the HUD to hide browser address bars for a native app feel.
* **Orientation Advisor**: Automatically suggests rotating to landscape mode on mobile phones.

---

## 🎮 Controls

### Desktop Controls (Keyboard & Mouse)
| Input | Action |
| :--- | :--- |
| `W` or `↑` | Accelerate / Thrust |
| `S` or `↓` | Brake / Reverse |
| `A` or `←` | Steer Left & Bank |
| `D` or `→` | Steer Right & Bank |
| **Move Mouse Left / Right** | Proportional Mouse Steering & Banking |
| **Left Click** *(Hold)* | Ion Boost / Thrust |
| **Right Click** *(Hold)* | Plasma Drift |
| **Middle Click** | Use Power-Up Item |
| `Space` *(Hold)* | Ion Boost |
| `Shift` *(Hold)* | Plasma Drift |
| `E` or `F` | Use Power-Up Item |
| `R` | Respawn Craft |
| `Escape` or `P` | Pause Race |
| `🎮 BUTTONS` | Toggle on-screen touch/click buttons on desktop |

### Mobile / Android Touch Controls
| Control | Action |
| :--- | :--- |
| `◀ LEFT` / `▶ RIGHT` | Tap or slide thumb to steer and bank |
| `⚡ BOOST` | Hold for massive velocity surge |
| `↺ DRIFT` | Hold to slide around hairpins |
| `🛑 BRAKE` | Tap to slow down before corners |
| `USE ITEM` | Activates currently held power-up |
| `⟳ RESPAWN` | Quick recovery to the latest checkpoint |
| `⛶ FULLSCREEN` | Toggle immersive fullscreen mode |

---

## 🛠️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or newer recommended)

### Installation & Launch
1. Clone or open the project folder in your terminal:
   ```bash
   cd "app based game"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser:
   * **On your computer**: [http://localhost:5173](http://localhost:5173)
   * **On your Android / Mobile phone** (connected to the same Wi-Fi):
     Open Chrome and navigate to the Network IP shown in the terminal (e.g. `http://10.12.1.109:5173/`).

### Production Build
To create an optimized production bundle:
```bash
npm run build
```
The output will be generated in the `dist/` directory, ready to deploy to Netlify, Vercel, or GitHub Pages.

---

## 📁 Project Structure

```
app based game/
├── index.html                  # Main HTML, HUD telemetry, touch zones, modal screens
├── package.json                # Project dependencies (Three.js, Vite)
├── vite.config.js              # Vite server & bundler configuration
├── README.md                   # Project documentation
├── public/
│   └── favicon.svg             # Futuristic neon game favicon
└── src/
    ├── main.js                 # App entry point, render loop, Three.js orchestration
    ├── style.css               # Cyberpunk glassmorphism design system & responsive layout
    ├── core/
    │   ├── GameState.js        # State machine (MENU, GARAGE, RACING, PAUSED, FINISHED)
    │   ├── Storage.js          # Persistent progression (XP, credits, records, settings)
    │   └── Input.js            # Unified keyboard, touch-pad drag & haptic vibration
    ├── audio/
    │   └── SoundManager.js     # Procedural Web Audio API sound synthesizer
    ├── physics/
    │   └── HoverPhysics.js     # Damped hover suspension, banking, jumps, steering assist
    ├── track/
    │   ├── TrackData.js        # 3D spline definitions, boost pads, obstacles, jumps
    │   ├── TrackBuilder.js     # 3D procedural track extrusion, guardrails, checkpoints
    │   └── Environment.js      # Procedural skyscrapers, flying traffic, holographic signs
    ├── vehicle/
    │   ├── VehicleModel.js     # Procedural 3D hover racer mesh with glowing thrusters
    │   ├── VehicleController.js# Player craft controller, boost meter, chase camera
    │   └── Customization.js    # Chassis types, color palettes, and vehicle stats
    ├── ai/
    │   └── AIRacer.js          # 5 AI competitors with curvature anticipation & boosting
    ├── gameplay/
    │   ├── RaceManager.js      # Countdown, laps, real-time 1st-6th ranks, finish line
    │   └── PowerUpSystem.js    # 3D rotating pickups, magnet pull & EMP shockwave
    └── ui/
        ├── HUD.js              # Speedometer, lap counter, boost bar, alerts
        ├── Minimap.js          # 2D canvas radar showing track spline and racer blips
        ├── Speedlines.js       # Radial particle speed lines warp effect
        ├── MenuManager.js      # Main menu, garage turntable, track select, results
        └── MobileControls.js   # Android touch controls overlay & orientation advisor
```

---

## 💡 Tips for High-Speed Racing

* **Master the Drift**: Drifting around corners not only tightens your turning radius, it actively charges your **Ion Boost** meter!
* **Hit the Green Boost Pads**: Driving over neon green strips gives an instant speed impulse and restores 35% boost energy.
* **Airborne Alignment**: When launching off jump ramps, keep your craft centered to ensure a smooth landing without losing momentum.
* **Use EMP Blasts in Traffic**: When stuck in a cluster of AI opponents, deploy the EMP BLAST to temporarily disrupt their engines and slip past!

---

*Defy Gravity. Own the Track.*
