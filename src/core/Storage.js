// ==========================================================
// ANTI-GRAVITY: LOCAL STORAGE & PROGRESSION MANAGER
// ==========================================================

const STORAGE_KEY = 'antigravity_racing_save_v1';

const DEFAULT_SAVE = {
  profile: {
    level: 1,
    xp: 0,
    credits: 1000,
    wins: 0,
    racesCompleted: 0
  },
  customization: {
    chassisIndex: 0,
    hullColor: '#00d4ff',      // Cyber Cyan
    neonColor: '#00f0ff',      // Electric Cyan
    exhaustColor: '#00aaff'    // Plasma Blue
  },
  records: {
    0: { bestRaceTime: null, bestLapTime: null, completed: false }, // Track 1
    1: { bestRaceTime: null, bestLapTime: null, completed: false }, // Track 2
    2: { bestRaceTime: null, bestLapTime: null, completed: false }  // Track 3
  },
  settings: {
    masterVolume: 0.8,
    sfxVolume: 0.9,
    musicVolume: 0.7,
    graphicsQuality: 'high',
    cameraShake: true,
    speedlines: true,
    touchMode: 'auto',
    autoThrottle: true,         // Android Easy Mobile Drive
    steeringAssist: true,       // Magnetic Track Centering
    haptics: true,              // Android Vibration Feedback
    sensitivity: 1.1
  }
};

export class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          profile: { ...DEFAULT_SAVE.profile, ...(parsed.profile || {}) },
          customization: { ...DEFAULT_SAVE.customization, ...(parsed.customization || {}) },
          records: { ...DEFAULT_SAVE.records, ...(parsed.records || {}) },
          settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('Could not load save data from localStorage, using defaults', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  getProfile() {
    return this.data.profile;
  }

  getCustomization() {
    return this.data.customization;
  }

  setCustomization(updates) {
    Object.assign(this.data.customization, updates);
    this.save();
  }

  getRecords() {
    return this.data.records;
  }

  recordRace(trackIndex, raceTime, bestLapTime, position) {
    if (!this.data.records[trackIndex]) {
      this.data.records[trackIndex] = { bestRaceTime: null, bestLapTime: null, completed: false };
    }
    const rec = this.data.records[trackIndex];
    rec.completed = true;

    if (rec.bestRaceTime === null || raceTime < rec.bestRaceTime) {
      rec.bestRaceTime = raceTime;
    }
    if (rec.bestLapTime === null || (bestLapTime && bestLapTime < rec.bestLapTime)) {
      rec.bestLapTime = bestLapTime;
    }

    // Progression rewards
    let earnedXP = 150;
    let earnedCredits = 300;
    if (position === 1) {
      earnedXP = 500;
      earnedCredits = 1500;
      this.data.profile.wins++;
    } else if (position === 2) {
      earnedXP = 350;
      earnedCredits = 900;
    } else if (position === 3) {
      earnedXP = 250;
      earnedCredits = 600;
    }

    this.data.profile.xp += earnedXP;
    this.data.profile.credits += earnedCredits;
    this.data.profile.racesCompleted++;

    // Calculate level (1 level per 500 XP)
    this.data.profile.level = Math.max(1, Math.floor(this.data.profile.xp / 500) + 1);

    this.save();
    return { earnedXP, earnedCredits, newLevel: this.data.profile.level };
  }

  getSettings() {
    return this.data.settings;
  }

  saveSettings(newSettings) {
    Object.assign(this.data.settings, newSettings);
    this.save();
  }

  formatTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) return '--:--.---';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
}

export const storage = new StorageManager();
