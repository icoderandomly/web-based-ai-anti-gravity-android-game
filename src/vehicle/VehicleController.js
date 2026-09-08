// ==========================================================
// ANTI-GRAVITY: PLAYER VEHICLE CONTROLLER & CHASE CAMERA
// ==========================================================
import * as THREE from 'three';
import { VehicleModel } from './VehicleModel.js';
import { CHASSIS_TYPES } from './Customization.js';
import { input } from '../core/Input.js';
import { sound } from '../audio/SoundManager.js';

export class VehicleController {
  constructor(scene, camera, customization = {}) {
    this.scene = scene;
    this.camera = camera;
    this.customization = customization;

    const chassisDef = CHASSIS_TYPES[customization.chassisIndex || 0] || CHASSIS_TYPES[0];
    this.stats = { ...chassisDef.stats };

    // 3D Model
    this.vehicleModel = new VehicleModel(customization, false, 'PLAYER');
    this.mesh = this.vehicleModel.group;
    this.scene.add(this.mesh);

    // Physics state
    this.position = new THREE.Vector3(0, 42, 0);
    this.quaternion = new THREE.Quaternion();
    this.speed = 0; // KM/H
    this.verticalVelocity = 0;
    this.steer = 0;
    this.throttle = 0;
    this.yawAngle = 0;
    this.bankAngle = 0;
    this.pitchAngle = 0;
    this.lateralOffset = 0;
    this.altitude = 0;
    this.trackU = 0;
    this.isAirborne = false;

    // Race & gameplay state
    this.currentLap = 1;
    this.lastCheckpointIndex = 0;
    this.checkpointProgress = 0;
    this.isFinished = false;
    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.bestLapTime = null;
    this.totalRaceTime = 0;

    // Boost state
    this.boostEnergy = 100.0;
    this.maxBoost = 100.0;
    this.isBoosting = false;
    this.isDrifting = false;

    // Shield / Health state
    this.shield = this.stats.shield || 100;
    this.maxShield = this.shield;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;

    // Power-up inventory & active effects
    this.heldPowerUp = null; // 'TURBO', 'SHIELD', 'MAGNET', 'PHASE', 'BLAST'
    this.activeEffects = {
      turbo: 0,
      shield: 0,
      magnet: 0,
      phase: 0
    };

    // Respawn state
    this.isRespawning = false;
    this.respawnTimer = 0;

    // Camera settings & trauma shake
    this.cameraTrauma = 0;
    this.baseFov = 65;
    this.targetFov = 65;

    // Wire input callbacks
    input.onRespawn = () => {
      if (!this.isRespawning && !this.isFinished) {
        if (this.onManualRespawn) this.onManualRespawn(this);
      }
    };

    input.onUseItem = () => {
      this.activatePowerUp();
    };
  }

  update(delta) {
    // 1. Process Input
    input.update(delta);

    if (!this.isRespawning && !this.isFinished) {
      this.throttle = input.throttleAxis;
      this.steer = input.steerAxis;
      this.isDrifting = input.keys.drift;

      // Boost handling
      const wantsBoost = input.keys.boost || this.activeEffects.turbo > 0;
      if (wantsBoost && this.boostEnergy > 0) {
        if (!this.isBoosting) {
          sound.playBoostStart();
        }
        this.isBoosting = true;
        this.boostEnergy = Math.max(0, this.boostEnergy - 28.0 * delta);
        this.addCameraTrauma(0.12 * delta);
      } else {
        this.isBoosting = false;
        // Passive boost recharge (+ charge bonus if drifting!)
        const rechargeRate = 6.0 + (this.isDrifting ? 14.0 : 0);
        this.boostEnergy = Math.min(this.maxBoost, this.boostEnergy + rechargeRate * delta);
      }
    } else {
      this.throttle = 0;
      this.steer = 0;
      this.isBoosting = false;
      this.isDrifting = false;
    }

    // 2. Active power-up timers
    for (const key in this.activeEffects) {
      if (this.activeEffects[key] > 0) {
        this.activeEffects[key] -= delta;
        if (this.activeEffects[key] <= 0) {
          this.activeEffects[key] = 0;
        }
      }
    }

    // Invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // 3. Sound engine update
    const speedRatio = Math.min(1.0, this.speed / this.stats.maxSpeed);
    sound.updateEngine(speedRatio, this.isBoosting, this.throttle > 0);

    // 4. Update Camera
    this.updateCamera(delta);
  }

  updateCamera(delta) {
    if (!this.camera) return;

    // Follow vehicle
    const speedRatio = Math.min(1.0, this.speed / this.stats.maxSpeed);
    const boostPull = this.isBoosting ? 2.5 : 0;

    // Dynamic camera distance behind vehicle
    const followDist = 8.5 + speedRatio * 3.5 + boostPull;
    const followHeight = 3.4 + speedRatio * 0.8;

    // Target position behind vehicle in its local space
    const targetOffset = new THREE.Vector3(0, followHeight, followDist);
    targetOffset.applyQuaternion(this.quaternion);
    const desiredCamPos = new THREE.Vector3().copy(this.position).add(targetOffset);

    // Smooth camera lag
    const camLerpSpeed = 10.0;
    this.camera.position.lerp(desiredCamPos, Math.min(1, delta * camLerpSpeed));

    // Look slightly ahead of vehicle
    const lookOffset = new THREE.Vector3(0, 1.2, -10.0).applyQuaternion(this.quaternion);
    const lookTarget = new THREE.Vector3().copy(this.position).add(lookOffset);
    this.camera.lookAt(lookTarget);

    // Dynamic FOV (widens during boost)
    this.targetFov = this.isBoosting ? 82 : (this.baseFov + speedRatio * 8);
    this.camera.fov += (this.targetFov - this.camera.fov) * Math.min(1, delta * 6.0);

    // Screen Shake Trauma
    if (this.cameraTrauma > 0) {
      const shakeAmount = this.cameraTrauma * this.cameraTrauma * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmount;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - delta * 2.0);
    }

    this.camera.updateProjectionMatrix();
  }

  addCameraTrauma(amount) {
    this.cameraTrauma = Math.min(1.0, this.cameraTrauma + amount);
  }

  onCollision(type, intensity = 0.5) {
    sound.playCollision(intensity);
    this.addCameraTrauma(intensity * 0.7);

    // Damage shield if not shielded or in phase
    if (!this.isInvulnerable && this.activeEffects.shield <= 0 && this.activeEffects.phase <= 0) {
      this.shield = Math.max(0, this.shield - intensity * 15);
      if (this.shield <= 0) {
        // Hull critical: temporary sputter / respawn
        this.shield = 40; // Recover to 40%
        this.speed *= 0.4;
      }
    }
  }

  onBoostPadHit() {
    sound.playBoostPad();
    this.speed = Math.min(this.stats.maxSpeed * 1.6, this.speed + 80);
    this.boostEnergy = Math.min(this.maxBoost, this.boostEnergy + 35);
    this.addCameraTrauma(0.25);
  }

  receivePowerUp(type) {
    sound.playPowerupCollect();
    this.heldPowerUp = type;
  }

  activatePowerUp() {
    if (!this.heldPowerUp) return;
    const type = this.heldPowerUp;
    this.heldPowerUp = null;

    sound.playPowerupUse(type);

    switch (type) {
      case 'TURBO':
        this.activeEffects.turbo = 3.5;
        this.boostEnergy = this.maxBoost;
        this.speed = this.stats.maxSpeed * 1.5;
        this.addCameraTrauma(0.3);
        break;
      case 'SHIELD':
        this.activeEffects.shield = 8.0;
        break;
      case 'MAGNET':
        this.activeEffects.magnet = 10.0;
        break;
      case 'PHASE':
        this.activeEffects.phase = 5.0;
        break;
      case 'BLAST':
        if (this.onEMPBlast) this.onEMPBlast(this.position, 60.0);
        this.addCameraTrauma(0.4);
        break;
    }
  }

  reset(startTransform) {
    this.position.copy(startTransform.position).addScaledVector(startTransform.normal, 0.75);
    const rightDir = new THREE.Vector3().crossVectors(startTransform.tangent, startTransform.normal).normalize();
    const backDir = new THREE.Vector3().copy(startTransform.tangent).negate();
    this.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(rightDir, startTransform.normal, backDir)
    );
    this.speed = 0;
    this.verticalVelocity = 0;
    this.steer = 0;
    this.throttle = 0;
    this.yawAngle = 0;
    this.bankAngle = 0;
    this.pitchAngle = 0;
    this.boostEnergy = 100.0;
    this.shield = this.maxShield;
    this.heldPowerUp = null;
    this.currentLap = 1;
    this.lastCheckpointIndex = 0;
    this.checkpointProgress = 0;
    this.isFinished = false;
    this.isRespawning = false;
    this.isInvulnerable = false;
    this.activeEffects = { turbo: 0, shield: 0, magnet: 0, phase: 0 };
    this.cameraTrauma = 0;

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
  }
}
