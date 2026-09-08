// ==========================================================
// ANTI-GRAVITY: VEHICLE CUSTOMIZATION & STAT DEFINITIONS
// ==========================================================

export const CHASSIS_TYPES = [
  {
    id: 0,
    name: 'AERO STRIKER',
    desc: 'Balanced high-velocity racer with aerodynamic agility',
    stats: {
      maxSpeed: 310,       // KM/H
      accel: 68,
      handling: 85,
      shield: 100,
      boostPower: 1.40
    }
  },
  {
    id: 1,
    name: 'VORTEX INTERCEPTOR',
    desc: 'Ultra-lightweight chassis built for sharp cornering & instant boost',
    stats: {
      maxSpeed: 290,
      accel: 78,
      handling: 95,
      shield: 80,
      boostPower: 1.55
    }
  },
  {
    id: 2,
    name: 'TITAN ENFORCER',
    desc: 'Heavy magnetic plating with supreme top speed and shield durability',
    stats: {
      maxSpeed: 330,
      accel: 58,
      handling: 70,
      shield: 130,
      boostPower: 1.32
    }
  }
];

export const COLOR_PALETTES = {
  hull: [
    { name: 'Cyber Cyan', hex: '#00d4ff' },
    { name: 'Apex Crimson', hex: '#ff2244' },
    { name: 'Neon Violet', hex: '#9d4edd' },
    { name: 'Solar Gold', hex: '#ffbe0b' },
    { name: 'Toxic Lime', hex: '#00ff66' },
    { name: 'Stealth Carbon', hex: '#1e2430' }
  ],
  neon: [
    { name: 'Electric Cyan', hex: '#00f0ff' },
    { name: 'Hot Magenta', hex: '#ff007f' },
    { name: 'Laser Green', hex: '#00ff66' },
    { name: 'Acid Yellow', hex: '#ffee00' },
    { name: 'Plasma White', hex: '#ffffff' }
  ],
  exhaust: [
    { name: 'Plasma Blue', hex: '#00aaff' },
    { name: 'Hyper Orange', hex: '#ff6600' },
    { name: 'Void Purple', hex: '#cc00ff' },
    { name: 'Laser Red', hex: '#ff1133' }
  ]
};
