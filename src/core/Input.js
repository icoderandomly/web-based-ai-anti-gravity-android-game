// ==========================================================
// ANTI-GRAVITY: UNIFIED KEYBOARD, MOUSE & ANDROID CONTROLLER
// ==========================================================
import { storage } from './Storage.js';

export class InputManager {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      boost: false,
      drift: false,
      item: false,
      respawn: false,
      pause: false
    };

    this.steerAxis = 0;
    this.throttleAxis = 0;
    this.mouseSteerAxis = 0;
    this.mouseSteerActive = false;
    this.sensitivity = 1.1;

    // Detect touch / Android / mobile capability
    this.isAndroid = /Android/i.test(navigator.userAgent);
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
    this.isTouchDevice = this.isAndroid || this.isMobile || this.hasTouch;

    this.onPause = null;
    this.onRespawn = null;
    this.onUseItem = null;

    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
  }

  // Haptic feedback for Android
  vibrate(pattern = 15) {
    const settings = storage.getSettings();
    if (settings.haptics && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          this.mouseSteerActive = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          this.mouseSteerActive = false;
          break;
        case 'Space':
          this.keys.boost = true;
          this.vibrate(20);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.drift = true;
          this.vibrate(15);
          break;
        case 'KeyE':
        case 'KeyF':
          this.keys.item = true;
          this.vibrate(25);
          if (this.onUseItem) this.onUseItem();
          break;
        case 'KeyR':
          this.keys.respawn = true;
          if (this.onRespawn) this.onRespawn();
          break;
        case 'Escape':
        case 'KeyP':
          if (this.onPause) this.onPause();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.boost = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.drift = false;
          break;
        case 'KeyE':
        case 'KeyF':
          this.keys.item = false;
          break;
        case 'KeyR':
          this.keys.respawn = false;
          break;
      }
    });
  }

  bindMouse() {
    // Desktop mouse movement steering
    window.addEventListener('mousemove', (e) => {
      // Only steer if mouse moved significantly away from center and not clicking UI
      if (e.target.closest('.ui-screen:not(.hidden)') || e.target.closest('.hud-box') || e.target.closest('.touch-pad-btn') || e.target.closest('.touch-main-btn')) {
        return;
      }

      const centerX = window.innerWidth / 2;
      const deadzone = 40; // Pixels around center
      const diffX = e.clientX - centerX;

      if (Math.abs(diffX) > deadzone) {
        this.mouseSteerActive = true;
        const normalized = (Math.abs(diffX) - deadzone) / (centerX * 0.45);
        this.mouseSteerAxis = Math.sign(diffX) * Math.min(1.0, normalized);
      } else {
        this.mouseSteerAxis = 0;
      }
    });

    // Mouse click actions on canvas
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ui-screen:not(.hidden)') || e.target.closest('.hud-box') || e.target.closest('.touch-pad-btn') || e.target.closest('.touch-main-btn')) {
        return;
      }

      if (e.button === 0) { // Left click: Boost / Drive
        this.keys.boost = true;
        this.vibrate(20);
      } else if (e.button === 2) { // Right click: Drift
        this.keys.drift = true;
        this.vibrate(15);
      } else if (e.button === 1) { // Middle click: Item
        if (this.onUseItem) this.onUseItem();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.keys.boost = false;
      } else if (e.button === 2) {
        this.keys.drift = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      // Prevent context menu on canvas so right-click can drift
      if (!e.target.closest('.ui-screen:not(.hidden)')) {
        e.preventDefault();
      }
    });
  }

  bindTouch() {
    const bindBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;

      const downHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('pressed');
        this.mouseSteerActive = false;
        this.vibrate(18);
        onDown();
      };

      const upHandler = (e) => {
        e.preventDefault();
        el.classList.remove('pressed');
        onUp();
      };

      el.addEventListener('pointerdown', downHandler);
      el.addEventListener('pointerup', upHandler);
      el.addEventListener('pointercancel', upHandler);
      el.addEventListener('pointerleave', upHandler);
    };

    // Steering buttons (works for mouse click and touch tap)
    bindBtn('touch-left', () => { this.keys.left = true; }, () => { this.keys.left = false; });
    bindBtn('touch-right', () => { this.keys.right = true; }, () => { this.keys.right = false; });

    // Actions
    bindBtn('touch-boost', () => {
      this.keys.boost = true;
      this.vibrate([25, 20, 25]);
    }, () => {
      this.keys.boost = false;
    });

    bindBtn('touch-drift', () => {
      this.keys.drift = true;
      this.vibrate(20);
    }, () => {
      this.keys.drift = false;
    });

    bindBtn('touch-brake', () => {
      this.keys.backward = true;
      this.vibrate(15);
    }, () => {
      this.keys.backward = false;
    });

    bindBtn('touch-item', () => {
      this.keys.item = true;
      this.vibrate(30);
      if (this.onUseItem) this.onUseItem();
    }, () => {
      this.keys.item = false;
    });

    bindBtn('touch-respawn', () => {
      this.vibrate(35);
      if (this.onRespawn) this.onRespawn();
    }, () => {});

    // Left Touch Steering Zone: Drag / Slide gesture support!
    const steerZone = document.getElementById('touch-steer-zone');
    if (steerZone) {
      let isDraggingZone = false;
      let startX = 0;

      steerZone.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.touch-pad-btn')) return;
        isDraggingZone = true;
        startX = e.clientX;
        this.mouseSteerActive = false;
        this.vibrate(10);
      });

      window.addEventListener('pointermove', (e) => {
        if (isDraggingZone) {
          const deltaX = e.clientX - startX;
          if (deltaX < -15) {
            this.keys.left = true;
            this.keys.right = false;
          } else if (deltaX > 15) {
            this.keys.right = true;
            this.keys.left = false;
          } else {
            this.keys.left = false;
            this.keys.right = false;
          }
        }
      });

      const endZoneDrag = () => {
        if (isDraggingZone) {
          isDraggingZone = false;
          this.keys.left = false;
          this.keys.right = false;
        }
      };
      window.addEventListener('pointerup', endZoneDrag);
      window.addEventListener('pointercancel', endZoneDrag);
    }
  }

  update(delta) {
    const settings = storage.getSettings();
    this.sensitivity = settings.sensitivity || 1.1;

    // 1. Steering: Combine keys, touch buttons, and mouse steering
    let targetSteer = 0;
    if (this.keys.left) targetSteer -= 1;
    if (this.keys.right) targetSteer += 1;

    if (this.mouseSteerActive && !this.keys.left && !this.keys.right) {
      targetSteer = this.mouseSteerAxis;
    }

    targetSteer *= this.sensitivity;

    const steerSpeed = 15.0;
    this.steerAxis += (targetSteer - this.steerAxis) * Math.min(1, delta * steerSpeed);

    // 2. Throttle & Auto-Drive
    let targetThrottle = 0;
    if (settings.autoThrottle) {
      if (this.keys.backward) {
        targetThrottle = -0.6; // Brake
      } else {
        targetThrottle = 1.0; // Auto cruise forward
      }
    } else {
      if (this.keys.forward) targetThrottle += 1;
      if (this.keys.backward) targetThrottle -= 1;
    }

    // Progressive throttle ramp at initial launch
    const throttleSpeed = (targetThrottle > this.throttleAxis && this.throttleAxis < 0.4) ? 5.5 : 12.0;
    this.throttleAxis += (targetThrottle - this.throttleAxis) * Math.min(1, delta * throttleSpeed);
  }

  reset() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.boost = false;
    this.keys.drift = false;
    this.keys.item = false;
    this.keys.respawn = false;
    this.steerAxis = 0;
    this.throttleAxis = 0;
    this.mouseSteerAxis = 0;
    this.mouseSteerActive = false;
  }
}

export const input = new InputManager();
