// ==========================================================
// ANTI-GRAVITY: IN-RACE HUD TELEMETRY & ALERTS CONTROLLER
// ==========================================================
import { storage } from '../core/Storage.js';

export class HUD {
  constructor() {
    this.elHud = document.getElementById('hud');
    this.elPos = document.getElementById('hud-pos');
    this.elTime = document.getElementById('hud-time');
    this.elBestTime = document.getElementById('hud-best-time');
    this.elLap = document.getElementById('hud-lap');
    this.elSpeed = document.getElementById('hud-speed');
    this.elSpeedBar = document.getElementById('speed-bar-fill');
    this.elBoostVal = document.getElementById('boost-val');
    this.elBoostBar = document.getElementById('boost-bar-fill');
    this.elShieldVal = document.getElementById('shield-val');
    this.elShieldBar = document.getElementById('shield-bar-fill');
    this.elPowerUp = document.getElementById('powerup-slot');
    this.elChaseBadge = document.getElementById('hud-chase-badge');

    this.elAlert = document.getElementById('hud-center-alert');
    this.elAlertTitle = document.getElementById('alert-title');
    this.elAlertSubtitle = document.getElementById('alert-subtitle');

    this.alertTimeout = null;
  }

  show() {
    if (this.elHud) this.elHud.classList.remove('hidden');
  }

  hide() {
    if (this.elHud) this.elHud.classList.add('hidden');
    this.hideAlert();
  }

  update(player, raceManager, aiRacers = []) {
    if (!player || !this.elHud) return;

    // 1. Position
    if (this.elPos) {
      this.elPos.textContent = player.positionRank || 1;
    }

    // 2. Lap & Times
    if (this.elLap && raceManager) {
      const displayLap = Math.min(raceManager.totalLaps, player.currentLap);
      this.elLap.textContent = `${displayLap} / ${raceManager.totalLaps}`;
    }

    if (this.elTime) {
      this.elTime.textContent = storage.formatTime(player.totalRaceTime);
    }
    if (this.elBestTime) {
      this.elBestTime.textContent = storage.formatTime(player.bestLapTime);
    }

    // 3. Speedometer
    const currentSpeed = Math.round(player.speed);
    if (this.elSpeed) {
      this.elSpeed.textContent = currentSpeed;
    }
    if (this.elSpeedBar) {
      const maxSpd = player.stats.maxSpeed * (player.stats.boostPower || 1.45);
      const pct = Math.min(100, Math.max(0, (currentSpeed / maxSpd) * 100));
      this.elSpeedBar.style.width = `${pct}%`;
    }

    // 4. Boost Meter
    const boostPct = Math.round((player.boostEnergy / player.maxBoost) * 100);
    if (this.elBoostVal) {
      this.elBoostVal.textContent = `${boostPct}%`;
    }
    if (this.elBoostBar) {
      this.elBoostBar.style.width = `${boostPct}%`;
      if (boostPct >= 99) {
        this.elBoostBar.style.boxShadow = '0 0 16px #ffffff, 0 0 8px #00f0ff';
      } else {
        this.elBoostBar.style.boxShadow = '0 0 10px #00f0ff';
      }
    }

    // 5. Shield Integrity
    const shieldPct = Math.round((player.shield / player.maxShield) * 100);
    if (this.elShieldVal) {
      this.elShieldVal.textContent = `${shieldPct}%`;
    }
    if (this.elShieldBar) {
      this.elShieldBar.style.width = `${shieldPct}%`;
      if (shieldPct < 30) {
        this.elShieldBar.style.background = 'linear-gradient(90deg, #ff0055, #ff5500)';
        this.elShieldBar.style.boxShadow = '0 0 10px #ff0055';
      } else {
        this.elShieldBar.style.background = 'linear-gradient(90deg, #00ff66, #00f0ff)';
        this.elShieldBar.style.boxShadow = '0 0 8px #00ff66';
      }
    }

    // 6. Power-Up Slot
    if (this.elPowerUp) {
      if (player.heldPowerUp) {
        this.elPowerUp.innerHTML = `<span class="powerup-text">${player.heldPowerUp}</span>`;
        this.elPowerUp.classList.remove('empty');
        this.elPowerUp.classList.add('ready');
      } else {
        this.elPowerUp.innerHTML = `<span class="powerup-text">NO ITEM</span>`;
        this.elPowerUp.classList.add('empty');
        this.elPowerUp.classList.remove('ready');
      }
    }

    // 7. Closest AI Pursuer Proximity Radar
    if (this.elChaseBadge && aiRacers && aiRacers.length > 0) {
      let closestChaser = null;
      let minChaserDist = Infinity;

      for (const ai of aiRacers) {
        if (ai.isFinished) continue;
        const trackDist = (player.raceProgress || 0) - (ai.raceProgress || 0);
        const dist = ai.position.distanceTo(player.position);
        if (trackDist > 0 && dist < 75 && dist < minChaserDist) {
          minChaserDist = dist;
          closestChaser = ai;
        }
      }

      if (closestChaser) {
        const isDrafting = closestChaser.isDrafting;
        const statusIcon = isDrafting ? '⚡ SLIPSTREAM' : '⚠️ PURSUIT';
        const distNum = Math.max(1, Math.round(minChaserDist));
        this.elChaseBadge.innerHTML = `<span class="chase-icon">${statusIcon}:</span> ${closestChaser.name} <span class="chase-dist">${distNum}m</span>`;
        this.elChaseBadge.className = `hud-chase-badge ${isDrafting ? 'danger' : 'warning'}`;
      } else {
        this.elChaseBadge.className = 'hud-chase-badge hidden';
      }
    }
  }

  showAlert(title, subtitle, durationMs = 1500, titleClass = '') {
    if (!this.elAlert) return;
    if (this.alertTimeout) clearTimeout(this.alertTimeout);

    this.elAlertTitle.textContent = title;
    this.elAlertTitle.className = `alert-title ${titleClass}`;
    this.elAlertSubtitle.textContent = subtitle;

    this.elAlert.classList.remove('hidden');

    if (durationMs > 0) {
      this.alertTimeout = setTimeout(() => {
        this.hideAlert();
      }, durationMs);
    }
  }

  hideAlert() {
    if (this.elAlert) this.elAlert.classList.add('hidden');
  }
}
