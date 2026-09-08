// ==========================================================
// ANTI-GRAVITY: 3D POWER-UP PICKUPS & ACTIVE ABILITIES
// ==========================================================
import * as THREE from 'three';

export const POWER_UP_TYPES = ['TURBO', 'SHIELD', 'MAGNET', 'PHASE', 'BLAST'];

export class PowerUpSystem {
  constructor(scene, trackBuilder) {
    this.scene = scene;
    this.track = trackBuilder;
    this.group = new THREE.Group();
    this.pickups = [];

    this.buildPickups();
    this.scene.add(this.group);
  }

  buildPickups() {
    const locs = this.track.trackDef.powerUpLocations || [];
    const colors = {
      TURBO: 0x00f0ff,
      SHIELD: 0x00ff66,
      MAGNET: 0xffbe0b,
      PHASE: 0x9d4edd,
      BLAST: 0xff007f
    };

    locs.forEach((loc, idx) => {
      const type = POWER_UP_TYPES[idx % POWER_UP_TYPES.length];
      const color = colors[type];

      const tf = this.track.getTransformAt(loc.u);
      const pos = tf.position.clone()
        .addScaledVector(tf.binormal, loc.offset || 0)
        .addScaledVector(tf.normal, 1.4);

      // Rotating 3D holographic octahedron
      const geo = new THREE.OctahedronGeometry(1.2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.8,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.88
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      // Outer wireframe halo
      const haloGeo = new THREE.RingGeometry(1.4, 1.6, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2;
      mesh.add(haloMesh);

      this.group.add(mesh);

      this.pickups.push({
        id: idx,
        type,
        mesh,
        basePos: pos.clone(),
        position: pos.clone(),
        radius: 2.2,
        active: true,
        respawnTimer: 0
      });
    });
  }

  update(delta, player, aiRacers) {
    const time = performance.now() * 0.001;

    for (const pickup of this.pickups) {
      if (!pickup.active) {
        pickup.respawnTimer -= delta;
        if (pickup.respawnTimer <= 0) {
          pickup.active = true;
          pickup.mesh.visible = true;
        }
        continue;
      }

      // Floating bob and spin
      pickup.mesh.rotation.y = time * 2.5;
      pickup.mesh.rotation.z = Math.sin(time * 2.0) * 0.3;
      pickup.mesh.position.y = pickup.basePos.y + Math.sin(time * 4.0 + pickup.id) * 0.3;

      // Magnet pull toward player if magnet power-up active
      if (player.activeEffects.magnet > 0) {
        const distToPlayer = pickup.position.distanceTo(player.position);
        if (distToPlayer < 24.0) {
          pickup.position.lerp(player.position, delta * 5.0);
          pickup.mesh.position.copy(pickup.position);
        }
      }

      // Check collision with player
      if (player.position.distanceTo(pickup.position) < pickup.radius + 1.2) {
        if (!player.heldPowerUp) {
          player.receivePowerUp(pickup.type);
          this.collectPickup(pickup);
        }
      }
    }
  }

  collectPickup(pickup) {
    pickup.active = false;
    pickup.mesh.visible = false;
    pickup.respawnTimer = 8.0; // Respawns after 8s
    pickup.position.copy(pickup.basePos);
    pickup.mesh.position.copy(pickup.basePos);
  }

  triggerEMPBlast(origin, radius, aiRacers) {
    for (const ai of aiRacers) {
      const dist = origin.distanceTo(ai.position);
      if (dist < radius) {
        ai.disruptWithEMP();
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
