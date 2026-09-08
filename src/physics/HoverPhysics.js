// ==========================================================
// ANTI-GRAVITY: HOVER PHYSICS & FLIGHT SIMULATION ENGINE
// WITH MOBILE STEERING ASSIST & TRACK CENTERING
// ==========================================================
import * as THREE from 'three';
import { storage } from '../core/Storage.js';

export class HoverPhysics {
  constructor(trackBuilder) {
    this.track = trackBuilder;
    this.gravity = 35.0; // Gravity when airborne
    this.targetHoverHeight = 0.75;
  }

  updateVehicle(vehicle, delta) {
    if (vehicle.isRespawning) {
      this.handleRespawnState(vehicle, delta);
      return;
    }

    const settings = storage.getSettings();

    // 1. Determine vehicle's current spline parameter u
    const currentU = this.track.getClosestU(vehicle.position);
    vehicle.trackU = currentU;
    const tf = this.track.getTransformAt(currentU);

    // 2. Compute altitude above track plane
    const toVehicle = new THREE.Vector3().subVectors(vehicle.position, tf.position);
    const altitude = toVehicle.dot(tf.normal);
    const lateralOffset = toVehicle.dot(tf.binormal);
    vehicle.altitude = altitude;
    vehicle.lateralOffset = lateralOffset;

    // Check if airborne or on track
    const isAirborne = altitude > this.targetHoverHeight * 2.2 || altitude < -2.0;
    vehicle.isAirborne = isAirborne;

    // 3. Acceleration & Speed logic
    const topSpeedBase = vehicle.stats.maxSpeed;
    const topSpeedBoost = topSpeedBase * (vehicle.stats.boostPower || 1.45);
    const maxSpeed = vehicle.isBoosting ? topSpeedBoost : topSpeedBase;

    // Throttle force
    let targetForwardSpeed = 0;
    if (vehicle.throttle > 0) {
      targetForwardSpeed = maxSpeed * vehicle.throttle;
    } else if (vehicle.throttle < 0) {
      targetForwardSpeed = -maxSpeed * 0.4 * Math.abs(vehicle.throttle); // Reverse / brake
    }

    // Smooth progressive start launch curve: reduce initial start acceleration so vehicle takes off smoothly
    let startSpeedFactor = 1.0;
    if (vehicle.speed < 140) {
      // Starts at 0.38x acceleration at 0 KM/H and ramps up smoothly to 1.0x at 140 KM/H
      startSpeedFactor = 0.38 + (Math.max(0, vehicle.speed) / 140) * 0.62;
    }

    // Acceleration rate
    const baseAccel = vehicle.isBoosting ? 175 : 72;
    const accelRate = baseAccel * (vehicle.stats.accel / 80) * startSpeedFactor;
    if (vehicle.speed < targetForwardSpeed) {
      vehicle.speed = Math.min(targetForwardSpeed, vehicle.speed + accelRate * delta);
    } else {
      // Natural drag / braking
      const brakeRate = (vehicle.throttle < 0 ? 140 : 42);
      vehicle.speed = Math.max(targetForwardSpeed, vehicle.speed - brakeRate * delta);
    }

    // Convert speed (KM/H) to units/second with smoother, controlled velocity scale
    const worldSpeed = vehicle.speed * 0.27;

    // 4. Steering & Banking
    const turnRate = 2.5 * (vehicle.stats.handling / 85) * (vehicle.isDrifting ? 1.4 : 1.0);
    vehicle.yawAngle -= vehicle.steer * turnRate * delta;

    // Magnetic Track Centering / Steering Assist (for Easy Mobile Racing)
    if (settings.steeringAssist && !vehicle.isAI && !isAirborne) {
      const assistThreshold = this.track.halfWidth - 3.8;
      if (Math.abs(lateralOffset) > assistThreshold) {
        const excess = Math.abs(lateralOffset) - assistThreshold;
        const sign = Math.sign(lateralOffset);
        // Gently steer inward
        vehicle.yawAngle += sign * excess * 0.4 * delta;
        // Subtle magnetic pull towards center
        vehicle.position.addScaledVector(tf.binormal, -sign * excess * 1.8 * delta);
      }
    }

    // Visual bank angle (roll into turns)
    const targetBank = -vehicle.steer * 0.55 * (vehicle.isDrifting ? 1.3 : 1.0);
    vehicle.bankAngle += (targetBank - vehicle.bankAngle) * Math.min(1, delta * 10.0);

    // Visual pitch angle (up on accel, down on brake)
    let targetPitch = 0;
    if (vehicle.throttle > 0) targetPitch = -0.06;
    if (vehicle.throttle < 0) targetPitch = 0.08;
    if (isAirborne) {
      targetPitch = THREE.MathUtils.clamp(vehicle.verticalVelocity * -0.02, -0.25, 0.25);
    }
    vehicle.pitchAngle += (targetPitch - vehicle.pitchAngle) * Math.min(1, delta * 8.0);

    // 5. Vertical suspension vs gravity
    if (!isAirborne) {
      // Damped harmonic hover spring
      const heightError = this.targetHoverHeight - altitude;
      const springK = 80.0;
      const dampingC = 12.0;
      const springForce = springK * heightError - dampingC * vehicle.verticalVelocity;

      vehicle.verticalVelocity += springForce * delta;
      vehicle.position.addScaledVector(tf.normal, vehicle.verticalVelocity * delta);

      // Snap orientation to track normal & tangent
      const forwardDir = new THREE.Vector3().copy(tf.tangent);
      forwardDir.applyAxisAngle(tf.normal, vehicle.yawAngle);

      // Local -Z is forward (nose), Local +Z is backward (thrusters), Local +X is right, Local +Y is up
      const rightDir = new THREE.Vector3().crossVectors(forwardDir, tf.normal).normalize();
      const backDir = new THREE.Vector3().copy(forwardDir).negate();

      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(
          rightDir,
          tf.normal,
          backDir
        )
      );
      vehicle.quaternion.slerp(targetQuat, Math.min(1, delta * 12.0));
    } else {
      // Ballistic airborne flight
      vehicle.verticalVelocity -= this.gravity * delta;
      vehicle.position.y += vehicle.verticalVelocity * delta;

      // Keep forward momentum
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(vehicle.quaternion);
      vehicle.position.addScaledVector(forward, worldSpeed * delta);
    }

    // 6. Forward displacement along track
    if (!isAirborne) {
      const forwardDir = new THREE.Vector3().copy(tf.tangent);
      forwardDir.applyAxisAngle(tf.normal, vehicle.yawAngle);
      vehicle.position.addScaledVector(forwardDir, worldSpeed * delta);
    }

    // 7. Track Boundary Collision (Guardrails)
    const trackHalfWidth = this.track.halfWidth;
    const margin = 1.4;
    if (Math.abs(lateralOffset) > trackHalfWidth - margin) {
      const sign = Math.sign(lateralOffset);
      // Deflect inwards
      const pushDir = new THREE.Vector3().copy(tf.binormal).multiplyScalar(-sign);
      vehicle.position.addScaledVector(pushDir, 0.6);

      // Speed penalty & bounce
      vehicle.speed = Math.max(0, vehicle.speed * 0.88);
      vehicle.yawAngle *= -0.3; // Deflect nose inward

      if (vehicle.onCollision) {
        vehicle.onCollision('BARRIER', 0.6);
      }
    }

    // 8. Fall Detection
    const distToCenter = vehicle.position.distanceTo(tf.position);
    if (distToCenter > 38.0 || altitude < -18.0) {
      this.triggerRespawn(vehicle);
    }

    // 9. Sync 3D mesh transform
    vehicle.mesh.position.copy(vehicle.position);
    vehicle.mesh.quaternion.copy(vehicle.quaternion);
    vehicle.vehicleModel.updateVisuals(
      vehicle.speed / topSpeedBase,
      vehicle.isBoosting,
      vehicle.throttle,
      vehicle.bankAngle,
      vehicle.pitchAngle,
      performance.now() * 0.001
    );
  }

  triggerRespawn(vehicle) {
    if (vehicle.isRespawning) return;
    vehicle.isRespawning = true;
    vehicle.respawnTimer = 1.1; // 1.1s delay
    vehicle.speed = 0;
    vehicle.verticalVelocity = 0;

    if (vehicle.onRespawnStart) {
      vehicle.onRespawnStart();
    }
  }

  handleRespawnState(vehicle, delta) {
    vehicle.respawnTimer -= delta;
    if (vehicle.respawnTimer <= 0) {
      // Find latest valid checkpoint
      const cpIndex = vehicle.lastCheckpointIndex || 0;
      const cp = this.track.checkpoints[cpIndex] || this.track.checkpoints[0];

      vehicle.position.copy(cp.position).addScaledVector(cp.normal, this.targetHoverHeight + 0.5);
      vehicle.speed = 50; // Push forward safely
      vehicle.yawAngle = 0;
      vehicle.bankAngle = 0;
      vehicle.pitchAngle = 0;
      vehicle.verticalVelocity = 0;
      vehicle.isRespawning = false;
      vehicle.isInvulnerable = true;
      vehicle.invulnerableTimer = 1.8;

      const forwardDir = cp.tangent.clone();
      const rightDir = new THREE.Vector3().crossVectors(forwardDir, cp.normal).normalize();
      const backDir = new THREE.Vector3().copy(forwardDir).negate();
      vehicle.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(rightDir, cp.normal, backDir)
      );

      vehicle.mesh.position.copy(vehicle.position);
      vehicle.mesh.quaternion.copy(vehicle.quaternion);

      if (vehicle.onRespawnEnd) {
        vehicle.onRespawnEnd();
      }
    }
  }
}
