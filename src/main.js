// ==========================================================
// ANTI-GRAVITY: FUTURISTIC 3D RACING GAME MAIN CONTROLLER
// ==========================================================
import * as THREE from 'three';
import { gameState, STATES } from './core/GameState.js';
import { storage } from './core/Storage.js';
import { input } from './core/Input.js';
import { sound } from './audio/SoundManager.js';
import { TRACK_DEFS } from './track/TrackData.js';
import { TrackBuilder } from './track/TrackBuilder.js';
import { Environment } from './track/Environment.js';
import { HoverPhysics } from './physics/HoverPhysics.js';
import { VehicleController } from './vehicle/VehicleController.js';
import { AIRacer, AI_PILOT_CONFIGS } from './ai/AIRacer.js';
import { PowerUpSystem } from './gameplay/PowerUpSystem.js';
import { RaceManager } from './gameplay/RaceManager.js';
import { HUD } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';
import { Speedlines } from './ui/Speedlines.js';
import { MenuManager } from './ui/MenuManager.js';
import { MobileControls } from './ui/MobileControls.js';

class AntiGravityGame {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.clock = new THREE.Clock();

    // Track & Scene
    this.currentTrackIndex = 0;
    this.currentTrackDef = TRACK_DEFS[0];
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Subsystems
    this.environment = null;
    this.trackBuilder = null;
    this.physics = null;
    this.player = null;
    this.aiRacers = [];
    this.powerUpSystem = null;
    this.raceManager = null;
    this.hud = null;
    this.minimap = null;
    this.speedlines = null;
    this.menuManager = null;
    this.mobileControls = null;

    // Turntable camera state (for Main Menu & Garage)
    this.turntableAngle = 0;
    this.isDraggingGarage = false;
    this.lastMouseX = 0;

    this.initThree();
    this.initSystems();
    this.setupGarageInteraction();
    this.loadCircuit(0, 3, 'medium');

    // Start in Main Menu
    this.setMenuMode();

    // Start render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initThree() {
    // 1. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.currentTrackDef.theme.fogColor, 0.0011);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 3000);
    this.camera.position.set(0, 48, 20);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Ensure audio unlocks on first click/touch
    const unlockAudio = () => {
      sound.ensureContext();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

  initSystems() {
    this.hud = new HUD();
    this.speedlines = new Speedlines('speedlines-canvas');
    this.mobileControls = new MobileControls();

    // In-game pause toggle
    input.onPause = () => {
      if (gameState.getState() === STATES.RACING) {
        sound.playMenuClick();
        gameState.setState(STATES.PAUSED);
      } else if (gameState.getState() === STATES.PAUSED) {
        sound.playMenuClick();
        gameState.setState(STATES.RACING);
      }
    };

    const btnPauseInGame = document.getElementById('btn-pause-ingame');
    if (btnPauseInGame) {
      btnPauseInGame.addEventListener('click', () => {
        if (gameState.getState() === STATES.RACING) {
          sound.playMenuClick();
          gameState.setState(STATES.PAUSED);
        }
      });
    }

    // Initialize UI Menu Manager
    this.menuManager = new MenuManager({
      onStartRace: (opts) => {
        this.startRace(opts.trackIndex, opts.laps, opts.difficulty);
      },
      onRestartRace: () => {
        this.startRace(this.currentTrackIndex, this.raceManager.totalLaps, this.currentDifficulty);
      },
      onCustomizationChange: (newCust) => {
        if (this.player) {
          this.player.vehicleModel.setColors(newCust.hullColor, newCust.neonColor, newCust.exhaustColor);
          if (newCust.chassisIndex !== undefined) {
            // Rebuild player model if chassis changed
            this.scene.remove(this.player.mesh);
            this.player = new VehicleController(this.scene, this.camera, newCust);
            this.positionRacersAtGrid();
          }
        }
      },
      onSettingsChange: () => {
        if (this.mobileControls) this.mobileControls.checkVisibility();
      }
    });
  }

  loadCircuit(trackIndex, laps = 3, difficulty = 'medium') {
    this.currentTrackIndex = trackIndex;
    this.currentTrackDef = TRACK_DEFS[trackIndex] || TRACK_DEFS[0];
    this.currentDifficulty = difficulty;

    // 1. Clear previous track objects
    if (this.environment) this.environment.dispose();
    if (this.trackBuilder) this.scene.remove(this.trackBuilder.group);
    if (this.powerUpSystem) this.powerUpSystem.dispose();
    if (this.player) this.scene.remove(this.player.mesh);
    for (const ai of this.aiRacers) {
      this.scene.remove(ai.mesh);
    }
    this.aiRacers = [];

    // 2. Update fog & scene background
    this.scene.fog.color.setHex(this.currentTrackDef.theme.fogColor);

    // 3. Build 3D Track & Environment
    this.trackBuilder = new TrackBuilder(this.currentTrackDef);
    this.scene.add(this.trackBuilder.group);
    this.environment = new Environment(this.scene, this.currentTrackDef.theme, this.trackBuilder);

    // 4. Build Physics engine
    this.physics = new HoverPhysics(this.trackBuilder);

    // 5. Build Player Vehicle
    const savedCust = storage.getCustomization();
    this.player = new VehicleController(this.scene, this.camera, savedCust);

    // Wire player callbacks
    this.player.onManualRespawn = (v) => {
      this.physics.triggerRespawn(v);
    };
    this.player.onRespawnStart = () => {
      this.hud.showAlert('RESPAWNING...', 'RECOVERING POSITION', 1100, 'respawn');
    };
    this.player.onEMPBlast = (origin, radius) => {
      this.powerUpSystem.triggerEMPBlast(origin, radius, this.aiRacers);
    };

    // 6. Build 5 AI Opponents
    AI_PILOT_CONFIGS.forEach((aiConfig) => {
      const ai = new AIRacer(this.scene, aiConfig, difficulty);
      ai.onRespawnStart = () => {};
      this.aiRacers.push(ai);
    });

    // 7. Build Power-Up System
    this.powerUpSystem = new PowerUpSystem(this.scene, this.trackBuilder);

    // 8. Build Race Manager
    this.raceManager = new RaceManager(this.trackBuilder, this.player, this.aiRacers, {
      laps,
      trackIndex
    });

    this.raceManager.onCountdownTick = (count, text) => {
      if (count > 0) {
        this.hud.showAlert(`${count}`, text, 0);
      } else if (count === 0) {
        this.hud.showAlert('GO!', 'ACCELERATE!', 800, 'go');
      } else {
        this.hud.hideAlert();
      }
    };

    this.raceManager.onLapComplete = (lap, totalLaps) => {
      if (lap <= totalLaps) {
        const subtitle = (lap === totalLaps) ? 'FINAL LAP!' : `LAP ${lap} OF ${totalLaps}`;
        this.hud.showAlert(`LAP ${lap}`, subtitle, 1600);
      }
    };

    // 9. Initialize Minimap Radar
    if (!this.minimap) {
      this.minimap = new Minimap('minimap-canvas', this.trackBuilder);
    } else {
      this.minimap.setTrack(this.trackBuilder);
    }

    this.positionRacersAtGrid();
  }

  positionRacersAtGrid() {
    const startTf = this.trackBuilder.getTransformAt(0.005);
    // Player on pole position
    this.player.reset(startTf);

    // 5 AI racers staggered on grid
    this.aiRacers.forEach((ai, idx) => {
      ai.reset(startTf, idx);
    });
  }

  setMenuMode() {
    this.hud.hide();
    sound.stopEngine();
    sound.stopMusic();
    gameState.setState(STATES.MAIN_MENU);
  }

  startRace(trackIndex, laps, difficulty) {
    this.loadCircuit(trackIndex, laps, difficulty);
    this.hud.show();
    sound.startEngine();
    this.raceManager.startCountdown();
  }

  setupGarageInteraction() {
    window.addEventListener('pointerdown', (e) => {
      const state = gameState.getState();
      if (state === STATES.GARAGE || state === STATES.MAIN_MENU) {
        this.isDraggingGarage = true;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isDraggingGarage) {
        const deltaX = e.clientX - this.lastMouseX;
        this.turntableAngle += deltaX * 0.008;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDraggingGarage = false;
    });
  }

  updateTurntable(delta) {
    if (!this.isDraggingGarage) {
      this.turntableAngle += delta * 0.35; // Gentle auto-rotation
    }

    if (this.player) {
      const dist = 9.5;
      const height = 3.2;
      const x = this.player.position.x + Math.sin(this.turntableAngle) * dist;
      const z = this.player.position.z + Math.cos(this.turntableAngle) * dist;
      const y = this.player.position.y + height;

      this.camera.position.set(x, y, z);
      this.camera.lookAt(this.player.position.x, this.player.position.y + 0.8, this.player.position.z);
    }
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const delta = Math.min(0.08, this.clock.getDelta());
    const state = gameState.getState();

    // 1. State Logic
    if (state === STATES.MAIN_MENU || state === STATES.GARAGE || state === STATES.TRACK_SELECT || state === STATES.SETTINGS || state === STATES.HOW_TO_PLAY) {
      // Rotate camera around vehicle in menu / garage
      this.updateTurntable(delta);
      if (this.environment) this.environment.update(delta);
    } else if (state === STATES.COUNTDOWN || state === STATES.RACING) {
      // In-Race simulation loop
      this.raceManager.update(delta);

      // Physics & Controllers
      this.player.update(delta);
      this.physics.updateVehicle(this.player, delta);

      for (const ai of this.aiRacers) {
        if (state === STATES.RACING) {
          ai.updateAI(this.trackBuilder, delta, this.player);
        }
        this.physics.updateVehicle(ai, delta);
      }

      // Track animated obstacles & power-ups
      this.trackBuilder.updateObstacles(performance.now() * 0.001);
      this.powerUpSystem.update(delta, this.player, this.aiRacers);
      if (this.environment) this.environment.update(delta);

      // HUD & Visuals
      this.hud.update(this.player, this.raceManager, this.aiRacers);
      this.minimap.render(this.player, this.aiRacers);
      this.speedlines.render(this.player.isBoosting, this.player.speed / this.player.stats.maxSpeed);
      this.mobileControls.updateItemButton(!!this.player.heldPowerUp);
    } else if (state === STATES.FINISHED) {
      // Race finished: keep gentle orbit around finish line
      this.updateTurntable(delta);
    }

    // 2. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Launch the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new AntiGravityGame();
});
