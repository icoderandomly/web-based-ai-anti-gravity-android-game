// ==========================================================
// ANTI-GRAVITY: PROCEDURAL 3D TRACK GENERATOR & SPLINE ENGINE
// ==========================================================
import * as THREE from 'three';

export class TrackBuilder {
  constructor(trackDef) {
    this.trackDef = trackDef;
    this.width = trackDef.width || 24;
    this.halfWidth = this.width / 2;

    // Build Catmull-Rom 3D Spline
    this.curve = new THREE.CatmullRomCurve3(trackDef.points, true, 'centripetal');
    this.curveLength = this.curve.getLength();

    // Discretized sampling for fast lookup & extrusion
    this.sampleCount = 400;
    this.samples = [];
    this.checkpoints = [];
    this.boostPadMeshes = [];
    this.obstacleMeshes = [];

    // Root Three.js group containing all track 3D objects
    this.group = new THREE.Group();

    this.initSplineFrames();
    this.buildRoadMesh();
    this.buildGuardRails();
    this.buildFinishLineArch();
    this.buildBoostPads();
    this.buildCheckpoints();
    this.buildObstacles();
  }

  initSplineFrames() {
    this.samples = [];
    const upVector = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= this.sampleCount; i++) {
      const u = i / this.sampleCount;
      const point = this.curve.getPointAt(u % 1.0);
      const tangent = this.curve.getTangentAt(u % 1.0).normalize();

      // Compute binormal (right vector)
      let binormal = new THREE.Vector3().crossVectors(tangent, upVector).normalize();
      if (binormal.lengthSq() < 0.001) {
        binormal = new THREE.Vector3(1, 0, 0);
      }

      // Compute track normal (up vector perpendicular to road)
      let normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      // Banking: compute curvature to bank sharp turns inwards
      const nextU = ((i + 1) % this.sampleCount) / this.sampleCount;
      const nextTangent = this.curve.getTangentAt(nextU).normalize();
      const curvature = new THREE.Vector3().crossVectors(tangent, nextTangent).y;
      const maxBank = 0.45; // ~26 degrees
      const bankAngle = THREE.MathUtils.clamp(curvature * 45.0, -maxBank, maxBank);

      // Rotate binormal & normal around tangent by bankAngle
      binormal.applyAxisAngle(tangent, bankAngle);
      normal.applyAxisAngle(tangent, bankAngle);

      this.samples.push({
        u,
        point,
        tangent,
        normal,
        binormal,
        bankAngle
      });
    }
  }

  buildRoadMesh() {
    const roadGeometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const segments = this.sampleCount;
    for (let i = 0; i <= segments; i++) {
      const sample = this.samples[i];
      const p = sample.point;
      const b = sample.binormal;
      const n = sample.normal;

      // Left point & Right point of track cross section
      const leftP = new THREE.Vector3().copy(p).addScaledVector(b, -this.halfWidth);
      const rightP = new THREE.Vector3().copy(p).addScaledVector(b, this.halfWidth);

      positions.push(leftP.x, leftP.y, leftP.z);
      positions.push(rightP.x, rightP.y, rightP.z);

      normals.push(n.x, n.y, n.z);
      normals.push(n.x, n.y, n.z);

      const v = (i / segments) * 60.0; // Repeat texture 60 times around track
      uvs.push(0, v);
      uvs.push(1, v);

      if (i < segments) {
        const i2 = i * 2;
        indices.push(i2, i2 + 1, i2 + 2);
        indices.push(i2 + 1, i2 + 3, i2 + 2);
      }
    }

    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeometry.setIndex(indices);

    // Procedural sci-fi magnetic road texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark metallic carbon background
    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, 512, 512);

    // Lateral grid lines
    ctx.strokeStyle = '#0f1c30';
    ctx.lineWidth = 4;
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Glowing center lane chevrons
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    for (let y = 30; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(256, y - 20);
      ctx.lineTo(280, y + 20);
      ctx.lineTo(268, y + 20);
      ctx.lineTo(256, y + 5);
      ctx.lineTo(244, y + 20);
      ctx.lineTo(232, y + 20);
      ctx.closePath();
      ctx.fill();
    }

    // Outer edge boundary lines
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(16, 512);
    ctx.moveTo(496, 0); ctx.lineTo(496, 512);
    ctx.stroke();

    const roadTexture = new THREE.CanvasTexture(canvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;

    const roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.35,
      metalness: 0.85,
      side: THREE.DoubleSide
    });

    this.roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);
  }

  buildGuardRails() {
    // Glowing neon tube barriers on left and right edges
    const railRadius = 0.5;
    const railHeight = 1.4;

    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i <= this.sampleCount; i++) {
      const sample = this.samples[i];
      const p = sample.point;
      const b = sample.binormal;
      const n = sample.normal;

      const left = new THREE.Vector3().copy(p).addScaledVector(b, -this.halfWidth).addScaledVector(n, railHeight);
      const right = new THREE.Vector3().copy(p).addScaledVector(b, this.halfWidth).addScaledVector(n, railHeight);

      leftPoints.push(left);
      rightPoints.push(right);
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftPoints, true);
    const rightCurve = new THREE.CatmullRomCurve3(rightPoints, true);

    const railGeoLeft = new THREE.TubeGeometry(leftCurve, 300, railRadius, 8, true);
    const railGeoRight = new THREE.TubeGeometry(rightCurve, 300, railRadius, 8, true);

    const railMat = new THREE.MeshStandardMaterial({
      color: this.trackDef.theme.neonPrimary,
      emissive: this.trackDef.theme.neonPrimary,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.1
    });

    const leftRail = new THREE.Mesh(railGeoLeft, railMat);
    const rightRail = new THREE.Mesh(railGeoRight, railMat);

    this.group.add(leftRail);
    this.group.add(rightRail);
  }

  buildFinishLineArch() {
    const startSample = this.samples[0];
    const p = startSample.point;
    const b = startSample.binormal;
    const n = startSample.normal;
    const t = startSample.tangent;

    const archGroup = new THREE.Group();

    // Arch frame posts
    const postHeight = 12;
    const postRadius = 0.8;
    const leftBase = new THREE.Vector3().copy(p).addScaledVector(b, -this.halfWidth - 1);
    const rightBase = new THREE.Vector3().copy(p).addScaledVector(b, this.halfWidth + 1);

    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x2a3e5c,
      metalness: 0.85,
      roughness: 0.25
    });

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.copy(leftBase).addScaledVector(n, postHeight / 2);
    leftPost.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    archGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.copy(rightBase).addScaledVector(n, postHeight / 2);
    rightPost.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    archGroup.add(rightPost);

    // Cross beam
    const beamLength = this.width + 3;
    const beamGeo = new THREE.BoxGeometry(beamLength, 2, 2.5);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x1d2c44,
      metalness: 0.9,
      roughness: 0.2
    });
    const crossBeam = new THREE.Mesh(beamGeo, beamMat);
    crossBeam.position.copy(p).addScaledVector(n, postHeight);
    crossBeam.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(b, n, t)
    );
    archGroup.add(crossBeam);

    // Holographic glowing finish banner
    const bannerGeo = new THREE.PlaneGeometry(this.width - 2, 4);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, 512, 128);

    // Checkered pattern
    const checkSize = 32;
    for (let x = 0; x < 512; x += checkSize) {
      for (let y = 0; y < 128; y += checkSize) {
        if ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0) {
          ctx.fillStyle = '#00f0ff';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Text header
    ctx.font = 'bold 36px Orbitron, sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillRect(120, 36, 272, 56);
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH LINE', 256, 76);

    const bannerTex = new THREE.CanvasTexture(canvas);
    const bannerMat = new THREE.MeshBasicMaterial({
      map: bannerTex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });

    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.copy(p).addScaledVector(n, postHeight - 2.5);
    bannerMesh.quaternion.copy(crossBeam.quaternion);
    archGroup.add(bannerMesh);

    this.group.add(archGroup);
  }

  buildBoostPads() {
    this.boostPads = [];
    const pads = this.trackDef.boostPads || [];

    pads.forEach((padDef, idx) => {
      const transform = this.getTransformAt(padDef.u);
      const padGeo = new THREE.PlaneGeometry(padDef.width || 8, padDef.length || 14);

      // Procedural neon boost pad texture
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#021810';
      ctx.fillRect(0, 0, 128, 256);

      // Glowing green forward chevrons
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;

      for (let y = 40; y < 256; y += 60) {
        ctx.beginPath();
        ctx.moveTo(64, y - 25);
        ctx.lineTo(110, y + 20);
        ctx.lineTo(95, y + 20);
        ctx.lineTo(64, y - 5);
        ctx.lineTo(33, y + 20);
        ctx.lineTo(18, y + 20);
        ctx.closePath();
        ctx.fill();
      }

      const padTex = new THREE.CanvasTexture(canvas);
      const padMat = new THREE.MeshBasicMaterial({
        map: padTex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });

      const padMesh = new THREE.Mesh(padGeo, padMat);
      // Position slightly above road surface
      padMesh.position.copy(transform.position).addScaledVector(transform.normal, 0.12);

      // Align plane flat onto road facing tangent forward
      padMesh.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(transform.binormal, transform.tangent, transform.normal)
      );

      this.group.add(padMesh);

      this.boostPads.push({
        id: idx,
        u: padDef.u,
        position: transform.position.clone(),
        width: padDef.width || 8,
        length: padDef.length || 14,
        mesh: padMesh
      });
    });
  }

  buildCheckpoints() {
    this.checkpoints = [];
    const count = 24; // 24 evenly spaced checkpoints
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const tf = this.getTransformAt(u);
      this.checkpoints.push({
        index: i,
        u,
        position: tf.position.clone(),
        tangent: tf.tangent.clone(),
        normal: tf.normal.clone(),
        binormal: tf.binormal.clone(),
        radius: this.halfWidth + 4
      });
    }
  }

  buildObstacles() {
    this.obstacles = [];
    const obsDefs = this.trackDef.obstacles || [];

    obsDefs.forEach((def, idx) => {
      const tf = this.getTransformAt(def.u);
      const pos = tf.position.clone()
        .addScaledVector(tf.binormal, def.offset || 0)
        .addScaledVector(tf.normal, 2.0);

      const obsGroup = new THREE.Group();
      obsGroup.position.copy(pos);

      if (def.type === 'MOVING_PILLAR') {
        const geo = new THREE.CylinderGeometry(1.5, 1.5, 4.5, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff0055,
          emissive: 0xff0055,
          emissiveIntensity: 0.8,
          metalness: 0.8,
          roughness: 0.2
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tf.normal);
        obsGroup.add(mesh);

        this.obstacles.push({
          id: idx,
          type: 'MOVING_PILLAR',
          u: def.u,
          baseOffset: def.offset || 0,
          currentOffset: def.offset || 0,
          position: pos,
          group: obsGroup,
          radius: 2.0,
          speed: 1.8,
          range: 6.0
        });
      } else {
        // Holographic warning energy barrier
        const geo = new THREE.BoxGeometry(4.0, 2.8, 0.8);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff3300,
          emissive: 0xff4400,
          emissiveIntensity: 1.8,
          metalness: 0.2,
          roughness: 0.1,
          transparent: true,
          opacity: 0.85
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(tf.binormal, tf.normal, tf.tangent)
        );
        obsGroup.add(mesh);

        this.obstacles.push({
          id: idx,
          type: 'BARRIER',
          u: def.u,
          position: pos,
          group: obsGroup,
          radius: 2.2
        });
      }

      this.group.add(obsGroup);
    });
  }

  updateObstacles(time) {
    for (const obs of this.obstacles) {
      if (obs.type === 'MOVING_PILLAR') {
        const offset = obs.baseOffset + Math.sin(time * obs.speed) * obs.range;
        obs.currentOffset = offset;
        const tf = this.getTransformAt(obs.u);
        const newPos = tf.position.clone()
          .addScaledVector(tf.binormal, offset)
          .addScaledVector(tf.normal, 2.0);
        obs.position.copy(newPos);
        obs.group.position.copy(newPos);
      }
    }
  }

  getTransformAt(u) {
    const wrappedU = ((u % 1.0) + 1.0) % 1.0;
    const indexF = wrappedU * this.sampleCount;
    const i0 = Math.floor(indexF);
    const i1 = (i0 + 1) % this.sampleCount;
    const alpha = indexF - i0;

    const s0 = this.samples[i0];
    const s1 = this.samples[i1];

    const position = new THREE.Vector3().lerpVectors(s0.point, s1.point, alpha);
    const tangent = new THREE.Vector3().lerpVectors(s0.tangent, s1.tangent, alpha).normalize();
    const normal = new THREE.Vector3().lerpVectors(s0.normal, s1.normal, alpha).normalize();
    const binormal = new THREE.Vector3().lerpVectors(s0.binormal, s1.binormal, alpha).normalize();
    const bankAngle = THREE.MathUtils.lerp(s0.bankAngle, s1.bankAngle, alpha);

    return { position, tangent, normal, binormal, bankAngle };
  }

  getClosestU(pos) {
    let closestU = 0;
    let minDistanceSq = Infinity;

    // 1. Coarse search among discrete samples
    for (let i = 0; i < this.sampleCount; i += 4) {
      const dSq = pos.distanceToSquared(this.samples[i].point);
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestU = this.samples[i].u;
      }
    }

    // 2. Fine search around the nearest sample
    const deltaU = 1 / this.sampleCount;
    const startU = closestU - deltaU * 2;
    const endU = closestU + deltaU * 2;
    const steps = 10;

    for (let step = 0; step <= steps; step++) {
      const u = (startU + (endU - startU) * (step / steps) + 1.0) % 1.0;
      const pt = this.curve.getPointAt(u);
      const dSq = pos.distanceToSquared(pt);
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestU = u;
      }
    }

    return closestU;
  }
}
