// ==========================================================
// ANTI-GRAVITY: GAME STATE MANAGER
// ==========================================================

export const STATES = {
  MAIN_MENU: 'MAIN_MENU',
  TRACK_SELECT: 'TRACK_SELECT',
  GARAGE: 'GARAGE',
  SETTINGS: 'SETTINGS',
  HOW_TO_PLAY: 'HOW_TO_PLAY',
  COUNTDOWN: 'COUNTDOWN',
  RACING: 'RACING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED'
};

export class GameStateManager {
  constructor() {
    this.currentState = STATES.MAIN_MENU;
    this.previousState = STATES.MAIN_MENU;
    this.listeners = [];
  }

  getState() {
    return this.currentState;
  }

  setState(newState, payload = {}) {
    if (this.currentState === newState) return;
    this.previousState = this.currentState;
    this.currentState = newState;

    for (const listener of this.listeners) {
      try {
        listener(newState, this.previousState, payload);
      } catch (e) {
        console.error('Error in state change listener:', e);
      }
    }
  }

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  isRacing() {
    return this.currentState === STATES.RACING || this.currentState === STATES.COUNTDOWN;
  }

  isPaused() {
    return this.currentState === STATES.PAUSED;
  }
}

export const gameState = new GameStateManager();
