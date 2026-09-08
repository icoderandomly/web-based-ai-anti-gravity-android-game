// ==========================================================
// ANTI-GRAVITY: AI RACING OPPONENTS WITH SPLINE NAVIGATION
// ==========================================================
import * as THREE from 'three';
import { VehicleModel } from '../vehicle/VehicleModel.js';
import { CHASSIS_TYPES } from '../vehicle/Customization.js';

export const AI_PILOT_CONFIGS = [
  {
    name: 'NOVA',
    chassisIndex: 0,
    hullColor: '#00e5ff',
    neonColor: '#ffffff',
    exhaustColor: '#00d4ff',
    personality: { aggression: 0.90, cornerSkill: 0.88, boostBias: 0.85, targetLane: -3.5 }
  },
  {
    name: 'VORTEX',
    chassisIndex: 1,
    hullColor: '#9d4edd',
    neonColor: '#ffbe0b',
    exhaustColor: '#aa00ff',
    personality: { aggression: 0.82, cornerSkill: 0.95, boostBias: 0.90, targetLane: 3.5 }
  },
  {
    name: 'PHANTOM',
    chassisIndex: 1,
    hullColor: '#361e68',
    neonColor: '#ff0055',
    exhaustColor: '#ff2244',
    personality: { aggression: 0.95, cornerSkill: 0.92, boostBias: 0.95, targetLane: 0 }
  },
  {
    name: 'TITAN',
    chassisIndex: 2,
    hullColor: '#1d5e38',
    neonColor: '#ff7700',
    exhaustColor: '#ff9900',
    personality: { aggression: 0.96, cornerSkill: 0.78, boostBias: 0.75, targetLane: -2.0 }
  },
  {
    name: 'CIRCUIT',
    chassisIndex: 0,
    hullColor: '#ffd60a',
    neonColor: '#00f0ff',
    exhaustColor: '#0088ff',
    personality: { aggression: 0.78, cornerSkill: 0.86, boostBias: 0.95, targetLane: 2.0 }
  }
];

export class AIRacer {
  constructor(scene, config, difficulty = 'medium') {
    this.scene = scene;
    this.name = config.name;
    this.config = config;
    this.difficulty = difficulty;
    this.personality = config.personality;

    const chassisDef = CHASSIS_TYPES[config.chassisIndex || 0] || CHASSIS_TYPES[0];
    this.stats = { ...chassisDef.stats };

    // Apply difficulty modifiers
    if (difficulty === 'easy') {
      this.stats.maxSpeed *= 0.85;
      this.stats.accel *= 0.82;
    } else if (difficulty === 'hard') {
      this.stats.maxSpeed *= 1.08;
      this.stats.accel *= 1.12;
    }

    // 3D Model
    this.vehicleModel = new VehicleModel(config, true, this.name);
    this.mesh = this.vehicleModel.group;
    this.scene.add(this.mesh);

    // Physics state
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.speed = 0;
    this.verticalVelocity = 0;
    this.steer = 0;
    this.throttle = 1.0;
    this.yawAngle = 0;
    this.bankAngle = 0;
    this.pitchAngle = 0;
    this.lateralOffset = 0;
    this.altitude = 0;
    this.trackU = 0;
    this.isAirborne = false;
    this.isBoosting = false;
    this.isDrifting = false;

    // Chase & pursuit telemetry
    this.isChasingPlayer = false;
    this.isDrafting = false;
    this.distToPlayer = 999;
    this.trackDistToPlayer = 0;

    // Race progress state
    this.currentLap = 1;
    this.lastCheckpointIndex = 0;
    this.checkpointProgress = 0;
    this.isFinished = false;
    this.finishTime = null;

    // Boost meter
    this.boostEnergy = 100.0;
    this.maxBoost = 100.0;

    // AI steering & behavior state
    this.currentLaneOffset = this.personality.targetLane;
    this.laneChangeTimer = 2.0 + Math.random() * 3.0;

    // Respawn state
    this.isRespawning = false;
    this.respawnTimer = 0;
  }

  updateAI(trackBuilder, delta, player = null) {
    if (this.isRespawning || this.isFinished) return;

    // 1. Spline location & look-ahead
    const currentU = this.trackU;
    const currentTransform = trackBuilder.getTransformAt(currentU);

    // Look-ahead on curve to evaluate upcoming turn sharpness (curvature)
    const lookAheadDist = 0.032;
    const lookAheadU = (currentU + lookAheadDist) % 1.0;
    const aheadTransform = trackBuilder.getTransformAt(lookAheadU);

    // Angle between current tangent and upcoming tangent
    const angleDelta = currentTransform.tangent.angleTo(aheadTransform.tangent);
    const isSharpCorner = angleDelta > 0.36;

    // 2. Player Pursuit & Chase Assessment
    this.isChasingPlayer = false;
    this.isDrafting = false;
    this.distToPlayer = player ? this.position.distanceTo(player.position) : 999;
    this.trackDistToPlayer = player ? ((player.raceProgress || 0) - (this.raceProgress || 0)) : 0;

    // Is the player ahead of this bot?
    const playerAhead = this.trackDistToPlayer > -0.01;
    let chaseThrottle = 1.0;

    if (player && playerAhead && this.distToPlayer < 240) {
      this.isChasingPlayer = true;

      // Check slipstream drafting: directly behind player within 50 meters
      const lateralDist = Math.abs(this.lateralOffset - player.lateralOffset);
      if (this.distToPlayer < 50 && lateralDist < 5.0 && this.trackDistToPlayer > 0) {
        this.isDrafting = true;
        // Lock directly into player's slipstream
        this.currentLaneOffset = player.lateralOffset;

        // Overtake maneuver when extremely close
        if (this.distToPlayer < 14) {
          const side = (player.lateralOffset >= 0) ? -4.0 : 4.0;
          this.currentLaneOffset = THREE.MathUtils.clamp(player.lateralOffset + side, -trackBuilder.halfWidth + 3, trackBuilder.halfWidth - 3);
        }
      } else {
        // Gently steer towards player's lane to hunt them down
        const followSpeed = Math.min(1, delta * 2.5);
        this.currentLaneOffset += (player.lateralOffset - this.currentLaneOffset) * followSpeed;
      }

      // Dynamic pursuit throttle & catch-up acceleration
      const catchUpUrgency = THREE.MathUtils.clamp(this.distToPlayer / 65.0, 0.2, 1.4);
      chaseThrottle = this.isDrafting ? 1.25 : (1.05 + catchUpUrgency * 0.15);

      // Slipstream velocity surge
      if (this.isDrafting) {
        this.speed = Math.min(this.stats.maxSpeed * 1.30, this.speed + 35 * delta);
      }
    } else if (player && !playerAhead) {
      // AI is leading: maintain exciting competitive pack racing
      if (this.trackDistToPlayer < -0.14) {
        chaseThrottle = 0.90; // Don't run away out of sight
      }
    }

    // 3. Throttle & Braking AI with Chase Integration
    if (isSharpCorner) {
      // Brake or coast for sharp corner based on corner skill
      const cornerBonus = this.isChasingPlayer ? 0.12 : 0;
      const safeSpeed = this.stats.maxSpeed * (0.68 + this.personality.cornerSkill * 0.18 + cornerBonus);
      if (this.speed > safeSpeed) {
        this.throttle = -0.25; // Controlled braking
      } else {
        this.throttle = 0.85;
      }
      this.isBoosting = false;
    } else {
      // Straightaways & sweeps: aggressive pursuit throttle
      this.throttle = chaseThrottle;

      // Tactical chase boost: trigger boost when chasing the player or drafting
      const chaseBoostBonus = this.isChasingPlayer ? 0.08 : 0;
      const wantsBoost = this.boostEnergy > 20 && Math.random() < ((this.personality.boostBias * 0.06) + chaseBoostBonus);

      if (wantsBoost) {
        this.isBoosting = true;
      }
      if (this.boostEnergy <= 5) {
        this.isBoosting = false;
      }
    }

    if (this.isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - 24.0 * delta);
    } else {
      // Faster boost recharge when drafting
      const rechargeRate = this.isDrafting ? 14.0 : 7.0;
      this.boostEnergy = Math.min(this.maxBoost, this.boostEnergy + rechargeRate * delta);
    }

    // 4. Dynamic lane selection (if not currently locked in draft)
    if (!this.isDrafting) {
      this.laneChangeTimer -= delta;
      if (this.laneChangeTimer <= 0) {
        this.laneChangeTimer = 2.5 + Math.random() * 3.5;
        const maxOffset = trackBuilder.halfWidth - 4.5;
        if (!this.isChasingPlayer) {
          this.currentLaneOffset = (Math.random() * 2 - 1) * maxOffset * 0.7;
        }
      }
    }

    // 5. Steering to track target waypoint ahead
    const targetU = (currentU + 0.022) % 1.0;
    const targetTf = trackBuilder.getTransformAt(targetU);
    const targetPoint = targetTf.position.clone()
      .addScaledVector(targetTf.binormal, this.currentLaneOffset);

    // Compute relative lateral error to target
    const toTarget = new THREE.Vector3().subVectors(targetPoint, this.position);
    const localTarget = toTarget.applyQuaternion(this.quaternion.clone().invert());

    // Proportional steering towards waypoint
    const steerTarget = THREE.MathUtils.clamp(localTarget.x * 0.48, -1.0, 1.0);
    this.steer += (steerTarget - this.steer) * Math.min(1, delta * 9.0);
  }

  onCollision(type, intensity = 0.5) {
    // AI bounce recovery
    this.speed *= 0.85;
    this.steer *= -0.5;
  }

  onBoostPadHit() {
    this.speed = Math.min(this.stats.maxSpeed * 1.5, this.speed + 70);
    this.boostEnergy = Math.min(this.maxBoost, this.boostEnergy + 30);
  }

  disruptWithEMP() {
    // EMP shockwave hits AI
    this.speed *= 0.4;
    this.throttle = 0;
    this.vehicleModel.setColors('#555555', '#ff0055', '#330011');
    setTimeout(() => {
      this.vehicleModel.setColors(this.config.hullColor, this.config.neonColor, this.config.exhaustColor);
    }, 2500);
  }

  reset(startTransform, gridIndex = 0) {
    // Stagger grid positions behind start line
    const row = Math.floor(gridIndex / 2) + 1;
    const side = (gridIndex % 2 === 0) ? -1 : 1;
    const startPos = startTransform.position.clone()
      .addScaledVector(startTransform.tangent, -row * 12.0)
      .addScaledVector(startTransform.binormal, side * 5.0)
      .addScaledVector(startTransform.normal, 0.75);

    this.position.copy(startPos);
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
    this.currentLap = 1;
    this.lastCheckpointIndex = 0;
    this.checkpointProgress = 0;
    this.isFinished = false;
    this.isRespawning = false;
    this.isBoosting = false;

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
  }
}
