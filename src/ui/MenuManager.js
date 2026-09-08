// ==========================================================
// ANTI-GRAVITY: MENU NAVIGATION & UI CONTROLLER
// ==========================================================
import { gameState, STATES } from '../core/GameState.js';
import { storage } from '../core/Storage.js';
import { sound } from '../audio/SoundManager.js';
import { COLOR_PALETTES, CHASSIS_TYPES } from '../vehicle/Customization.js';
import { TRACK_DEFS } from '../track/TrackData.js';

export class MenuManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.selectedTrack = 0;
    this.selectedLaps = 3;
    this.selectedDifficulty = 'medium';

    this.screens = {
      [STATES.MAIN_MENU]: document.getElementById('screen-main-menu'),
      [STATES.TRACK_SELECT]: document.getElementById('screen-track-select'),
      [STATES.GARAGE]: document.getElementById('screen-garage'),
      [STATES.SETTINGS]: document.getElementById('screen-settings'),
      [STATES.HOW_TO_PLAY]: document.getElementById('screen-how-to-play'),
      [STATES.PAUSED]: document.getElementById('screen-pause'),
      [STATES.FINISHED]: document.getElementById('screen-results')
    };

    this.initMainMenu();
    this.initTrackSelect();
    this.initGarage();
    this.initSettings();
    this.initPause();
    this.initResults();
    this.initFullscreen();
    this.updateUserStats();

    // Listen to GameState transitions
    gameState.onChange((newState, prevState, payload) => {
      this.handleStateChange(newState, prevState, payload);
    });
  }

  handleStateChange(newState, prevState, payload) {
    for (const key in this.screens) {
      if (this.screens[key]) {
        this.screens[key].classList.add('hidden');
        this.screens[key].classList.remove('active');
      }
    }

    if (this.screens[newState]) {
      this.screens[newState].classList.remove('hidden');
      this.screens[newState].classList.add('active');
    }

    if (newState === STATES.MAIN_MENU) {
      this.updateUserStats();
    } else if (newState === STATES.FINISHED) {
      this.showResults(payload);
    }
  }

  updateUserStats() {
    const profile = storage.getProfile();
    const records = storage.getRecords();

    const elLvl = document.getElementById('user-level');
    const elCred = document.getElementById('user-credits');
    const elWins = document.getElementById('user-wins');

    if (elLvl) elLvl.textContent = profile.level;
    if (elCred) elCred.textContent = `${profile.credits.toLocaleString()} CR`;
    if (elWins) elWins.textContent = profile.wins;

    for (let i = 0; i < 3; i++) {
      const elRec = document.getElementById(`best-track-${i}`);
      if (elRec && records[i] && records[i].bestRaceTime) {
        elRec.textContent = storage.formatTime(records[i].bestRaceTime);
      }
    }
  }

  initMainMenu() {
    const bindBtn = (id, targetState) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          sound.playMenuClick();
          gameState.setState(targetState);
        });
      }
    };

    bindBtn('btn-menu-start', STATES.TRACK_SELECT);
    bindBtn('btn-menu-garage', STATES.GARAGE);
    bindBtn('btn-menu-tracks', STATES.TRACK_SELECT);
    bindBtn('btn-menu-how', STATES.HOW_TO_PLAY);
    bindBtn('btn-menu-settings', STATES.SETTINGS);

    const bindBack = (id, targetState) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          sound.playMenuClick();
          gameState.setState(targetState);
        });
      }
    };

    bindBack('btn-track-back', STATES.MAIN_MENU);
    bindBack('btn-garage-back', STATES.MAIN_MENU);
    bindBack('btn-how-back', STATES.MAIN_MENU);
    bindBack('btn-settings-back', STATES.MAIN_MENU);
  }

  initTrackSelect() {
    const cards = document.querySelectorAll('.track-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        sound.playMenuClick();
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedTrack = parseInt(card.dataset.track, 10);
      });
    });

    const selectLaps = document.getElementById('select-laps');
    if (selectLaps) {
      selectLaps.addEventListener('change', (e) => {
        this.selectedLaps = parseInt(e.target.value, 10);
      });
    }

    const selectDiff = document.getElementById('select-difficulty');
    if (selectDiff) {
      selectDiff.addEventListener('change', (e) => {
        this.selectedDifficulty = e.target.value;
      });
    }

    const btnLaunch = document.getElementById('btn-launch-race');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        sound.playMenuClick();
        if (this.callbacks.onStartRace) {
          this.callbacks.onStartRace({
            trackIndex: this.selectedTrack,
            laps: this.selectedLaps,
            difficulty: this.selectedDifficulty
          });
        }
      });
    }
  }

  initGarage() {
    const cust = storage.getCustomization();

    const chassisBtns = document.querySelectorAll('.chassis-btn');
    chassisBtns.forEach(btn => {
      const chassisId = parseInt(btn.dataset.chassis, 10);
      if (chassisId === cust.chassisIndex) btn.classList.add('active');

      btn.addEventListener('click', () => {
        sound.playMenuClick();
        chassisBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        storage.setCustomization({ chassisIndex: chassisId });
        this.updateGarageStats(chassisId);
        if (this.callbacks.onCustomizationChange) {
          this.callbacks.onCustomizationChange(storage.getCustomization());
        }
      });
    });

    const renderPalette = (containerId, colors, activeHex, onSelectKey) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      colors.forEach(col => {
        const chip = document.createElement('div');
        chip.className = `color-chip ${col.hex.toLowerCase() === activeHex.toLowerCase() ? 'active' : ''}`;
        chip.style.backgroundColor = col.hex;
        chip.title = col.name;

        chip.addEventListener('click', () => {
          sound.playMenuClick();
          container.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');

          const update = { [onSelectKey]: col.hex };
          storage.setCustomization(update);
          if (this.callbacks.onCustomizationChange) {
            this.callbacks.onCustomizationChange(storage.getCustomization());
          }
        });

        container.appendChild(chip);
      });
    };

    renderPalette('palette-hull', COLOR_PALETTES.hull, cust.hullColor, 'hullColor');
    renderPalette('palette-neon', COLOR_PALETTES.neon, cust.neonColor, 'neonColor');
    renderPalette('palette-exhaust', COLOR_PALETTES.exhaust, cust.exhaustColor, 'exhaustColor');

    this.updateGarageStats(cust.chassisIndex);
  }

  updateGarageStats(chassisIndex) {
    const def = CHASSIS_TYPES[chassisIndex] || CHASSIS_TYPES[0];
    const elSpeed = document.getElementById('stat-bar-speed');
    const elAccel = document.getElementById('stat-bar-accel');
    const elHandling = document.getElementById('stat-bar-handling');
    const elShield = document.getElementById('stat-bar-shield');

    if (elSpeed) elSpeed.style.width = `${(def.stats.maxSpeed / 450) * 100}%`;
    if (elAccel) elAccel.style.width = `${def.stats.accel}%`;
    if (elHandling) elHandling.style.width = `${def.stats.handling}%`;
    if (elShield) elShield.style.width = `${(def.stats.shield / 140) * 100}%`;
  }

  initSettings() {
    const settings = storage.getSettings();

    // Volume Sliders
    const bindSlider = (id, valId, key, onApply) => {
      const input = document.getElementById(id);
      const valDisplay = document.getElementById(valId);
      if (!input) return;

      input.value = Math.round(settings[key] * 100);
      if (valDisplay) valDisplay.textContent = `${input.value}%`;

      input.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (valDisplay) valDisplay.textContent = `${val}%`;
        const normalized = val / 100;
        storage.saveSettings({ [key]: normalized });
        if (onApply) onApply(normalized);
      });
    };

    bindSlider('vol-master', 'vol-master-val', 'masterVolume', (v) => sound.setVolumes({ master: v }));
    bindSlider('vol-sfx', 'vol-sfx-val', 'sfxVolume', (v) => sound.setVolumes({ sfx: v, engine: v * 0.7 }));
    bindSlider('vol-music', 'vol-music-val', 'musicVolume', (v) => sound.setVolumes({ music: v }));

    // Mobile Easy Racing Toggles
    const bindToggle = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.checked = !!settings[key];
      el.addEventListener('change', (e) => {
        sound.playMenuClick();
        storage.saveSettings({ [key]: e.target.checked });
        if (this.callbacks.onSettingsChange) this.callbacks.onSettingsChange();
      });
    };

    bindToggle('setting-autothrottle', 'autoThrottle');
    bindToggle('setting-assist', 'steeringAssist');
    bindToggle('setting-haptics', 'haptics');
    bindToggle('setting-shake', 'cameraShake');

    const elTouch = document.getElementById('setting-touch');
    if (elTouch) {
      elTouch.value = settings.touchMode || 'auto';
      elTouch.addEventListener('change', (e) => {
        sound.playMenuClick();
        storage.saveSettings({ touchMode: e.target.value });
        if (this.callbacks.onSettingsChange) this.callbacks.onSettingsChange();
      });
    }

    const elSens = document.getElementById('setting-sensitivity');
    const elSensVal = document.getElementById('setting-sensitivity-val');
    if (elSens) {
      elSens.value = Math.round((settings.sensitivity || 1.1) * 100);
      if (elSensVal) elSensVal.textContent = `${elSens.value}%`;
      elSens.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (elSensVal) elSensVal.textContent = `${v}%`;
        storage.saveSettings({ sensitivity: v / 100 });
      });
    }

    sound.setVolumes({
      master: settings.masterVolume,
      sfx: settings.sfxVolume,
      engine: settings.sfxVolume * 0.7,
      music: settings.musicVolume
    });
  }

  initFullscreen() {
    const toggleFullscreen = () => {
      sound.playMenuClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen request denied or not supported:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    const btnHUD = document.getElementById('btn-fullscreen-toggle');
    const btnSettings = document.getElementById('btn-settings-fullscreen');
    if (btnHUD) btnHUD.addEventListener('click', toggleFullscreen);
    if (btnSettings) btnSettings.addEventListener('click', toggleFullscreen);
  }

  initPause() {
    const btnResume = document.getElementById('btn-pause-resume');
    const btnRestart = document.getElementById('btn-pause-restart');
    const btnSettings = document.getElementById('btn-pause-settings');
    const btnQuit = document.getElementById('btn-pause-quit');

    if (btnResume) {
      btnResume.addEventListener('click', () => {
        sound.playMenuClick();
        gameState.setState(STATES.RACING);
      });
    }

    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        sound.playMenuClick();
        if (this.callbacks.onRestartRace) this.callbacks.onRestartRace();
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        sound.playMenuClick();
        gameState.setState(STATES.SETTINGS);
      });
    }

    if (btnQuit) {
      btnQuit.addEventListener('click', () => {
        sound.playMenuClick();
        sound.stopEngine();
        sound.stopMusic();
        gameState.setState(STATES.MAIN_MENU);
      });
    }
  }

  initResults() {
    const btnNext = document.getElementById('btn-result-next');
    const btnRetry = document.getElementById('btn-result-retry');
    const btnMenu = document.getElementById('btn-result-menu');

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        sound.playMenuClick();
        this.selectedTrack = (this.selectedTrack + 1) % TRACK_DEFS.length;
        if (this.callbacks.onStartRace) {
          this.callbacks.onStartRace({
            trackIndex: this.selectedTrack,
            laps: this.selectedLaps,
            difficulty: this.selectedDifficulty
          });
        }
      });
    }

    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        sound.playMenuClick();
        if (this.callbacks.onRestartRace) this.callbacks.onRestartRace();
      });
    }

    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        sound.playMenuClick();
        sound.stopEngine();
        sound.stopMusic();
        gameState.setState(STATES.MAIN_MENU);
      });
    }
  }

  showResults(payload) {
    const { rank, totalTime, bestLap, rewards, standings } = payload;

    const elBadge = document.getElementById('result-badge');
    const elTitle = document.getElementById('result-title');
    const elTime = document.getElementById('result-total-time');
    const elBestLap = document.getElementById('result-best-lap');
    const elXp = document.getElementById('result-xp');
    const elCredits = document.getElementById('result-credits');
    const tbody = document.getElementById('leaderboard-tbody');

    if (elBadge) {
      if (rank === 1) {
        elBadge.className = 'result-badge gold';
        elBadge.textContent = '1st PLACE';
        if (elTitle) elTitle.textContent = 'CHAMPION OF THE VOID';
      } else if (rank === 2) {
        elBadge.className = 'result-badge silver';
        elBadge.textContent = '2nd PLACE';
        if (elTitle) elTitle.textContent = 'PODIUM FINISHER';
      } else if (rank === 3) {
        elBadge.className = 'result-badge bronze';
        elBadge.textContent = '3rd PLACE';
        if (elTitle) elTitle.textContent = 'PODIUM FINISHER';
      } else {
        elBadge.className = 'result-badge participant';
        elBadge.textContent = `${rank}th PLACE`;
        if (elTitle) elTitle.textContent = 'RACE COMPLETED';
      }
    }

    if (elTime) elTime.textContent = storage.formatTime(totalTime);
    if (elBestLap) elBestLap.textContent = storage.formatTime(bestLap);

    if (rewards) {
      if (elXp) elXp.textContent = `+${rewards.earnedXP} XP`;
      if (elCredits) elCredits.textContent = `+${rewards.earnedCredits.toLocaleString()} CR`;
    }

    if (tbody && standings) {
      tbody.innerHTML = '';
      const winnerTime = standings[0] ? standings[0].time : totalTime;

      standings.forEach(r => {
        const tr = document.createElement('tr');
        if (r.isPlayer) tr.className = 'player-row';

        const gap = (r.rank === 1) ? 'LEADER' : `+${(r.time - winnerTime).toFixed(3)}s`;

        tr.innerHTML = `
          <td>#${r.rank}</td>
          <td>${r.name}</td>
          <td>${r.vehicle}</td>
          <td>${storage.formatTime(r.time)}</td>
          <td>${gap}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}
