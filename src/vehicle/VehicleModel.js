// ==========================================================
// ANTI-GRAVITY: PROCEDURAL 3D HOVER RACER MESH & VISUAL FX
// ==========================================================
import * as THREE from 'three';

export class VehicleModel {
  constructor(customization = {}, isAI = false, racerName = 'PILOT') {
    this.customization = {
      chassisIndex: customization.chassisIndex || 0,
      hullColor: customization.hullColor || '#00d4ff',
      neonColor: customization.neonColor || '#00f0ff',
      exhaustColor: customization.exhaustColor || '#00aaff',
      ...customization
    };
    this.isAI = isAI;
    this.racerName = racerName;

    this.group = new THREE.Group();
    this.innerMesh = new THREE.Group(); // Handles pitch & roll banking independent of world orientation
    this.group.add(this.innerMesh);

    this.exhaustFlares = [];
    this.thrusterLight = null;

    this.buildModel();
    this.buildThrusterFlares();
    this.buildTrailSystem();
  }

  buildModel() {
    const chassis = this.customization.chassisIndex;

    // 1. Materials
    this.hullMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.hullColor),
      metalness: 0.85,
      roughness: 0.25
    });

    this.darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x0c121e,
      metalness: 0.9,
      roughness: 0.3
    });

    this.canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x050c18,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      reflectivity: 0.9
    });

    this.neonMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.neonColor),
      emissive: new THREE.Color(this.customization.neonColor),
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.1
    });

    this.exhaustMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.exhaustColor),
      emissive: new THREE.Color(this.customization.exhaustColor),
      emissiveIntensity: 2.8
    });

    // 2. Central fuselage body
    const bodyGeo = new THREE.BufferGeometry();
    let length = 4.2;
    let width = 2.4;
    let height = 0.9;

    if (chassis === 1) { // Vortex Interceptor (sharper & narrower)
      length = 4.4; width = 2.1; height = 0.8;
    } else if (chassis === 2) { // Titan Enforcer (bulkier & wider)
      length = 4.0; width = 2.8; height = 1.1;
    }

    // Aerodynamic wedge fuselage
    const bodyShape = new THREE.BoxGeometry(width, height, length);
    const bodyMesh = new THREE.Mesh(bodyShape, this.hullMat);
    bodyMesh.position.y = 0.45;
    this.innerMesh.add(bodyMesh);

    // Wedge nose cone
    const noseGeo = new THREE.ConeGeometry(width * 0.5, 1.8, 4);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    const noseMesh = new THREE.Mesh(noseGeo, this.hullMat);
    noseMesh.position.set(0, 0.42, -length / 2 - 0.7);
    this.innerMesh.add(noseMesh);

    // 3. Cockpit canopy
    const canopyGeo = new THREE.SphereGeometry(0.7, 16, 12);
    canopyGeo.scale(0.8, 0.6, 1.8);
    const canopyMesh = new THREE.Mesh(canopyGeo, this.canopyMat);
    canopyMesh.position.set(0, 0.75, -0.4);
    this.innerMesh.add(canopyMesh);

    // 4. Swept wings & stabilizers
    const wingSpan = width * 1.5;
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      // Left wing triangle
      -width * 0.4, 0.4, -0.5,
      -wingSpan, 0.55, length * 0.35,
      -width * 0.4, 0.45, length * 0.4,

      // Right wing triangle
      width * 0.4, 0.4, -0.5,
      width * 0.4, 0.45, length * 0.4,
      wingSpan, 0.55, length * 0.35
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();

    const wingMesh = new THREE.Mesh(wingGeo, this.hullMat);
    wingMesh.material.side = THREE.DoubleSide;
    this.innerMesh.add(wingMesh);

    // Glowing neon wing tip stabilizers
    const tipGeo = new THREE.BoxGeometry(0.12, 0.6, 1.4);
    const leftTip = new THREE.Mesh(tipGeo, this.neonMat);
    leftTip.position.set(-wingSpan, 0.7, length * 0.3);
    this.innerMesh.add(leftTip);

    const rightTip = new THREE.Mesh(tipGeo, this.neonMat);
    rightTip.position.set(wingSpan, 0.7, length * 0.3);
    this.innerMesh.add(rightTip);

    // Neon body racing stripes
    const stripeGeo = new THREE.BoxGeometry(0.1, 0.05, length * 0.9);
    const leftStripe = new THREE.Mesh(stripeGeo, this.neonMat);
    leftStripe.position.set(-width * 0.35, 0.92, 0);
    this.innerMesh.add(leftStripe);

    const rightStripe = new THREE.Mesh(stripeGeo, this.neonMat);
    rightStripe.position.set(width * 0.35, 0.92, 0);
    this.innerMesh.add(rightStripe);

    // 5. Rear Twin Ion Thrusters
    const thrusterRadius = 0.42;
    const thrusterLength = 1.4;
    const thrusterGeo = new THREE.CylinderGeometry(thrusterRadius, thrusterRadius * 0.9, thrusterLength, 16);
    thrusterGeo.rotateX(Math.PI / 2);

    const leftThruster = new THREE.Mesh(thrusterGeo, this.darkArmorMat);
    leftThruster.position.set(-width * 0.38, 0.48, length * 0.45);
    this.innerMesh.add(leftThruster);

    const rightThruster = new THREE.Mesh(thrusterGeo, this.darkArmorMat);
    rightThruster.position.set(width * 0.38, 0.48, length * 0.45);
    this.innerMesh.add(rightThruster);

    // Glowing interior nozzle rings
    const nozzleGeo = new THREE.RingGeometry(0.15, thrusterRadius * 0.85, 16);
    const leftNozzle = new THREE.Mesh(nozzleGeo, this.exhaustMat);
    leftNozzle.position.set(-width * 0.38, 0.48, length * 0.45 + thrusterLength / 2 + 0.01);
    this.innerMesh.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, this.exhaustMat);
    rightNozzle.position.set(width * 0.38, 0.48, length * 0.45 + thrusterLength / 2 + 0.01);
    this.innerMesh.add(rightNozzle);

    // 6. Anti-gravity glowing underbelly core
    const coreGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16);
    const coreMesh = new THREE.Mesh(coreGeo, this.neonMat);
    coreMesh.position.set(0, 0.05, 0);
    this.innerMesh.add(coreMesh);

    // Underbelly glow point light
    this.underglow = new THREE.PointLight(new THREE.Color(this.customization.neonColor), 2.5, 6.0);
    this.underglow.position.set(0, -0.2, 0);
    this.innerMesh.add(this.underglow);
  }

  buildThrusterFlares() {
    // Dynamic exhaust flame cones
    const flameGeo = new THREE.ConeGeometry(0.35, 2.2, 16);
    flameGeo.rotateX(-Math.PI / 2);
    flameGeo.translate(0, 0, 1.1);

    const flameMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.customization.exhaustColor),
      transparent: true,
      opacity: 0.85
    });

    const length = 4.2;
    const width = 2.4;

    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-width * 0.38, 0.48, length * 0.45 + 0.7);
    this.innerMesh.add(leftFlame);

    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(width * 0.38, 0.48, length * 0.45 + 0.7);
    this.innerMesh.add(rightFlame);

    this.exhaustFlares = [leftFlame, rightFlame];
  }

  buildTrailSystem() {
    // Ion particle trails
    this.maxTrailPoints = 30;
    this.trailHistoryLeft = [];
    this.trailHistoryRight = [];

    const trailGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(this.maxTrailPoints * 2 * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const trailMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.customization.exhaustColor),
      transparent: true,
      opacity: 0.7,
      linewidth: 3
    });

    this.trailLineLeft = new THREE.Line(new THREE.BufferGeometry(), trailMat);
    this.trailLineRight = new THREE.Line(new THREE.BufferGeometry(), trailMat);
  }

  setColors(hullHex, neonHex, exhaustHex) {
    if (hullHex) {
      this.customization.hullColor = hullHex;
      this.hullMat.color.set(hullHex);
    }
    if (neonHex) {
      this.customization.neonColor = neonHex;
      this.neonMat.color.set(neonHex);
      this.neonMat.emissive.set(neonHex);
      if (this.underglow) this.underglow.color.set(neonHex);
    }
    if (exhaustHex) {
      this.customization.exhaustColor = exhaustHex;
      this.exhaustMat.color.set(exhaustHex);
      this.exhaustMat.emissive.set(exhaustHex);
      for (const flame of this.exhaustFlares) {
        flame.material.color.set(exhaustHex);
      }
    }
  }

  updateVisuals(speedRatio, isBoosting, throttle, bankAngle, pitchAngle, time) {
    // 1. Dynamic bank roll and pitch tilt on innerMesh
    this.innerMesh.rotation.z = bankAngle;
    this.innerMesh.rotation.x = pitchAngle;

    // 2. Subtle hover bobbing
    this.innerMesh.position.y = Math.sin(time * 7.0) * 0.06;

    // 3. Thruster exhaust scaling
    const boostMultiplier = isBoosting ? 2.2 : 1.0;
    const throttleScale = 0.4 + (throttle > 0 ? throttle : 0.1) * 0.6 + speedRatio * 0.5;
    const finalFlameScaleZ = throttleScale * boostMultiplier;
    const flicker = 0.92 + Math.random() * 0.16;

    for (const flame of this.exhaustFlares) {
      flame.scale.set(1.0, 1.0, finalFlameScaleZ * flicker);
      flame.material.opacity = Math.min(1.0, (0.5 + speedRatio * 0.5) * (isBoosting ? 1.0 : 0.85));
    }
  }
}
