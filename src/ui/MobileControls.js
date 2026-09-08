// ==========================================================
// ANTI-GRAVITY: MOBILE & TABLET ON-SCREEN TOUCH CONTROLS
// ==========================================================
import { storage } from '../core/Storage.js';

export class MobileControls {
  constructor() {
    this.container = document.getElementById('mobile-touch-controls');
    this.itemBtn = document.getElementById('touch-item');
    this.advisor = document.getElementById('orientation-advisor');
    this.btnDismissAdvisor = document.getElementById('btn-dismiss-orientation');
    this.btnToggle = document.getElementById('btn-touch-toggle');
    this.autoDriveBadge = document.getElementById('hud-auto-drive-badge');

    // Robust Android & Mobile browser detection
    this.isAndroid = /Android/i.test(navigator.userAgent);
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1024;

    this.initAdvisor();
    this.initToggle();
    this.checkVisibility();
    window.addEventListener('resize', () => this.checkVisibility());
  }

  initAdvisor() {
    if (this.btnDismissAdvisor && this.advisor) {
      this.btnDismissAdvisor.addEventListener('click', () => {
        this.advisor.classList.add('dismissed');
      });
    }
  }

  initToggle() {
    if (this.btnToggle) {
      this.btnToggle.addEventListener('click', () => {
        const settings = storage.getSettings();
        const currentlyActive = this.container && this.container.classList.contains('active');
        const nextMode = currentlyActive ? 'off' : 'on';
        storage.saveSettings({ touchMode: nextMode });
        this.checkVisibility();
      });
    }
  }

  checkVisibility() {
    if (!this.container) return;

    const settings = storage.getSettings();
    const shouldShow = (settings.touchMode === 'on') ||
      (settings.touchMode !== 'off' && (this.isAndroid || this.isMobile || this.hasTouch));

    if (shouldShow) {
      this.container.classList.add('active');
      if (this.btnToggle) this.btnToggle.classList.add('active');
    } else {
      this.container.classList.remove('active');
      if (this.btnToggle) this.btnToggle.classList.remove('active');
    }

    if (this.autoDriveBadge) {
      if (settings.autoThrottle) {
        this.autoDriveBadge.style.display = 'block';
      } else {
        this.autoDriveBadge.style.display = 'none';
      }
    }
  }

  updateItemButton(heldPowerUp) {
    if (!this.itemBtn) return;
    if (heldPowerUp) {
      this.itemBtn.innerHTML = `<span class="item-badge-text">USE ${heldPowerUp}</span>`;
      this.itemBtn.classList.remove('hidden');
    } else {
      this.itemBtn.classList.add('hidden');
    }
  }
}
