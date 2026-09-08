// ==========================================================
// ANTI-GRAVITY: TRACK DEFINITIONS & 3D SPLINE GEOMETRY
// ==========================================================
import * as THREE from 'three';

export const TRACK_DEFS = [
  // --------------------------------------------------------
  // TRACK 1: SKYLINE CIRCUIT (Beginner)
  // --------------------------------------------------------
  {
    id: 0,
    name: 'SKYLINE CIRCUIT',
    subtitle: 'Metropolis High-Altitude Highway',
    difficulty: 'CLASS 1 (BEGINNER)',
    laps: 3,
    width: 24,
    theme: {
      fogColor: 0x060c1c,
      skyColor: 0x02040b,
      lightColor: 0x00f0ff,
      neonPrimary: 0x00f0ff,
      neonSecondary: 0x0066ff,
      roadColor: 0x0a1020,
      buildingGlow: 0x00f0ff
    },
    // 3D spline control points (X, Y, Z) creating a sweeping circuit around city center
    points: [
      new THREE.Vector3(0, 40, 0),        // Start / Finish Line
      new THREE.Vector3(0, 40, -180),     // Fast straight
      new THREE.Vector3(80, 50, -320),    // Gentle right sweeper
      new THREE.Vector3(220, 65, -380),   // Banked turn 1
      new THREE.Vector3(380, 75, -280),   // Turn apex
      new THREE.Vector3(440, 70, -120),   // Downward sweep
      new THREE.Vector3(400, 60, 60),     // Wide curve
      new THREE.Vector3(280, 50, 180),    // Skyline view straight
      new THREE.Vector3(220, 80, 320),    // Ramp up into jump
      new THREE.Vector3(120, 70, 440),    // Jump airborne zone & landing
      new THREE.Vector3(-40, 50, 420),    // Descending left sweeper
      new THREE.Vector3(-180, 45, 300),   // City canyon passage
      new THREE.Vector3(-260, 40, 140),   // Hairpin entry
      new THREE.Vector3(-240, 45, -60),   // Hairpin exit
      new THREE.Vector3(-120, 40, -40)    // Final chicane onto home straight
    ],
    boostPads: [
      { u: 0.08, width: 8, length: 14 },
      { u: 0.48, width: 8, length: 14 },
      { u: 0.72, width: 8, length: 14 }
    ],
    jumpSections: [
      { startU: 0.58, endU: 0.64 }
    ],
    powerUpLocations: [
      { u: 0.18, offset: -4 },
      { u: 0.18, offset: 4 },
      { u: 0.38, offset: 0 },
      { u: 0.68, offset: -3 },
      { u: 0.85, offset: 3 }
    ],
    obstacles: []
  },

  // --------------------------------------------------------
  // TRACK 2: NEON CORE (Intermediate)
  // --------------------------------------------------------
  {
    id: 1,
    name: 'NEON CORE',
    subtitle: 'Subterranean Cyberpunk Reactor',
    difficulty: 'CLASS 2 (INTERMEDIATE)',
    laps: 3,
    width: 22,
    theme: {
      fogColor: 0x14041a,
      skyColor: 0x05010a,
      lightColor: 0xff007f,
      neonPrimary: 0xff007f,
      neonSecondary: 0x9d4edd,
      roadColor: 0x150920,
      buildingGlow: 0xff007f
    },
    points: [
      new THREE.Vector3(0, 60, 0),        // Start line
      new THREE.Vector3(0, 50, -220),     // Fast descent
      new THREE.Vector3(-140, 40, -360),  // Sharp left turn into tunnel
      new THREE.Vector3(-280, 60, -420),  // Tunnel climb
      new THREE.Vector3(-420, 95, -300),  // Corkscrew upper spiral
      new THREE.Vector3(-360, 110, -120), // High vantage bridge
      new THREE.Vector3(-200, 95, 20),    // Overpass
      new THREE.Vector3(-60, 75, 140),    // S-bend 1
      new THREE.Vector3(80, 65, 80),      // S-bend 2
      new THREE.Vector3(220, 55, 180),    // Core entrance
      new THREE.Vector3(340, 80, 320),    // Core reactor ring ramp
      new THREE.Vector3(280, 70, 460),    // Drop zone
      new THREE.Vector3(120, 50, 480),    // Low altitude chicane
      new THREE.Vector3(-20, 55, 340),    // Tunnel exit
      new THREE.Vector3(40, 60, 160)      // Final straight entry
    ],
    boostPads: [
      { u: 0.06, width: 7, length: 15 },
      { u: 0.35, width: 7, length: 15 },
      { u: 0.65, width: 7, length: 15 },
      { u: 0.88, width: 7, length: 15 }
    ],
    jumpSections: [
      { startU: 0.70, endU: 0.76 }
    ],
    powerUpLocations: [
      { u: 0.12, offset: 0 },
      { u: 0.28, offset: -4 },
      { u: 0.52, offset: 4 },
      { u: 0.78, offset: 0 },
      { u: 0.92, offset: -3 }
    ],
    obstacles: [
      { u: 0.22, type: 'MOVING_PILLAR', offset: 0 },
      { u: 0.44, type: 'BARRIER', offset: -4 },
      { u: 0.82, type: 'MOVING_PILLAR', offset: 3 }
    ]
  },

  // --------------------------------------------------------
  // TRACK 3: VOID RUN (Advanced)
  // --------------------------------------------------------
  {
    id: 2,
    name: 'VOID RUN',
    subtitle: 'Stratospheric Orbital Array',
    difficulty: 'CLASS 3 (ADVANCED)',
    laps: 3,
    width: 20,
    theme: {
      fogColor: 0x030614,
      skyColor: 0x010207,
      lightColor: 0x00ffaa,
      neonPrimary: 0x00ffaa,
      neonSecondary: 0xffbe0b,
      roadColor: 0x08121a,
      buildingGlow: 0x00ffaa
    },
    points: [
      new THREE.Vector3(0, 120, 0),        // Stratospheric start line
      new THREE.Vector3(0, 110, -260),     // High-velocity orbital straight
      new THREE.Vector3(160, 90, -420),    // Mega-banked turn
      new THREE.Vector3(360, 110, -480),   // High launch ramp
      new THREE.Vector3(520, 140, -320),   // Floating space platform
      new THREE.Vector3(560, 120, -120),   // Void drop
      new THREE.Vector3(440, 80, 60),      // Zero-G chicane
      new THREE.Vector3(260, 65, 200),     // Narrow magnetic conduit
      new THREE.Vector3(140, 95, 380),     // Shortcut split zone
      new THREE.Vector3(-40, 130, 480),    // Orbital apex
      new THREE.Vector3(-240, 115, 420),   // High g-force hairpin
      new THREE.Vector3(-360, 95, 240),    // Downhill roller
      new THREE.Vector3(-380, 105, 40),    // Magnetic loop entry
      new THREE.Vector3(-240, 115, -100),  // Loop exit
      new THREE.Vector3(-100, 120, -40)    // Return to start
    ],
    boostPads: [
      { u: 0.05, width: 6, length: 16 },
      { u: 0.22, width: 6, length: 16 },
      { u: 0.42, width: 6, length: 16 },
      { u: 0.68, width: 6, length: 16 },
      { u: 0.86, width: 6, length: 16 }
    ],
    jumpSections: [
      { startU: 0.25, endU: 0.32 },
      { startU: 0.55, endU: 0.62 }
    ],
    powerUpLocations: [
      { u: 0.15, offset: -3 },
      { u: 0.35, offset: 3 },
      { u: 0.50, offset: 0 },
      { u: 0.75, offset: -4 },
      { u: 0.90, offset: 4 }
    ],
    obstacles: [
      { u: 0.18, type: 'BARRIER', offset: 3 },
      { u: 0.48, type: 'MOVING_PILLAR', offset: 0 },
      { u: 0.72, type: 'BARRIER', offset: -4 },
      { u: 0.94, type: 'MOVING_PILLAR', offset: 2 }
    ]
  }
];
