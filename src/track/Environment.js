// ==========================================================
// ANTI-GRAVITY: PROCEDURAL FUTURISTIC CITY & SKYLINE
// ==========================================================
import * as THREE from 'three';

export class Environment {
  constructor(scene, theme, trackBuilder = null) {
    this.scene = scene;
    this.theme = theme;
    this.trackBuilder = trackBuilder;
    this.group = new THREE.Group();
    this.trafficCars = [];
    this.floatingBeams = [];

    this.buildSkyAndStars();
    this.buildCitySkyscrapers();
    this.buildFlyingTraffic();
    this.buildHolographicBillboards();
    this.setupLighting();

    this.scene.add(this.group);
  }

  setupLighting() {
    // Ambient fill
    const ambient = new THREE.AmbientLight(0x0a1428, 1.2);
    this.group.add(ambient);

    // Directional cyber-sun / moon
    const dirLight = new THREE.DirectionalLight(this.theme.lightColor || 0x00f0ff, 1.8);
    dirLight.position.set(200, 400, 150);
    this.group.add(dirLight);

    // Secondary colored rim light
    const rimLight = new THREE.DirectionalLight(this.theme.neonSecondary || 0xff007f, 1.2);
    rimLight.position.set(-250, 150, -200);
    this.group.add(rimLight);
  }

  buildSkyAndStars() {
    // Starfield particle system
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    const starColors = [];

    for (let i = 0; i < starCount; i++) {
      const radius = 900 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = Math.max(20, radius * Math.sin(phi) * Math.sin(theta)); // Keep above ground
      const z = radius * Math.cos(phi);

      starPos.push(x, y, z);

      // Cyberpunk star colors (cyan, magenta, white)
      const rChoice = Math.random();
      if (rChoice < 0.4) {
        starColors.push(0.0, 0.9, 1.0); // Cyan
      } else if (rChoice < 0.7) {
        starColors.push(1.0, 0.2, 0.7); // Magenta
      } else {
        starColors.push(0.9, 0.95, 1.0); // Bright white
      }
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.group.add(stars);
  }

  buildCitySkyscrapers() {
    // Instanced procedural mega-structures carefully positioned around track
    const buildingCount = 110;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);

    // Canvas texture for glowing skyscraper windows with illuminated cyber borders
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#081122';
    ctx.fillRect(0, 0, 128, 256);

    ctx.fillStyle = '#00f0ff';
    for (let y = 8; y < 256; y += 16) {
      for (let x = 8; x < 128; x += 16) {
        if (Math.random() > 0.35) {
          ctx.fillRect(x, y, 6, 8);
        }
      }
    }

    // Glowing vertical corner edge trims
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 0, 4, 256);
    ctx.fillRect(124, 0, 4, 256);

    const windowTex = new THREE.CanvasTexture(canvas);
    windowTex.wrapS = THREE.RepeatWrapping;
    windowTex.wrapT = THREE.RepeatWrapping;

    const buildingMat = new THREE.MeshStandardMaterial({
      map: windowTex,
      roughness: 0.35,
      metalness: 0.8,
      color: 0x1e2d45
    });

    const instancedMesh = new THREE.InstancedMesh(buildingGeo, buildingMat, buildingCount);
    const dummy = new THREE.Object3D();

    // Helper: test 2D clearance against track spline
    const checkTrackClearance = (x, z, radius) => {
      if (!this.trackBuilder || !this.trackBuilder.samples) {
        return { isSafe: true, trackY: 40, dist: 999 };
      }
      const samples = this.trackBuilder.samples;
      let minDistSq = Infinity;
      let trackY = 40;
      for (let s = 0; s < samples.length; s += 2) {
        const pt = samples[s].point;
        const dx = x - pt.x;
        const dz = z - pt.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          trackY = pt.y;
        }
      }
      const dist = Math.sqrt(minDistSq);
      const requiredDist = this.trackBuilder.halfWidth + radius + 22.0;
      return {
        isSafe: dist >= requiredDist,
        trackY,
        dist
      };
    };

    let placedCount = 0;
    let attempts = 0;
    const maxAttempts = buildingCount * 6;

    while (placedCount < buildingCount && attempts < maxAttempts) {
      attempts++;
      const angle = (placedCount / buildingCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      // Distribute in outer skyline and inner canyon
      const isDistantSkyline = Math.random() > 0.45;
      const dist = isDistantSkyline ? (520 + Math.random() * 480) : (60 + Math.random() * 420);
      let x = Math.cos(angle) * dist;
      let z = Math.sin(angle) * dist;

      const width = 24 + Math.random() * 40;
      const depth = 24 + Math.random() * 40;
      const buildingRadius = Math.max(width, depth) * 0.72;

      // Verify track clearance
      const clearance = checkTrackClearance(x, z, buildingRadius);
      if (!clearance.isSafe) {
        // Displace radially outward past required clearance
        const pushFactor = (this.trackBuilder ? this.trackBuilder.halfWidth + buildingRadius + 30.0 : 60);
        x += (x / Math.max(1, dist)) * pushFactor;
        z += (z / Math.max(1, dist)) * pushFactor;
        const secondCheck = checkTrackClearance(x, z, buildingRadius);
        if (!secondCheck.isSafe) {
          continue; // Skip this candidate to guarantee zero track clipping
        }
      }

      // Height rules: if anywhere near track (dist < 140), roof must stay strictly BELOW track altitude
      let height;
      let y;
      if (clearance.dist < 140) {
        // Low subterranean structure: top roof is at least 15 units below the track surface
        const maxRoofAltitude = clearance.trackY - 15.0;
        height = 60 + Math.random() * 50;
        y = maxRoofAltitude - height / 2;
      } else {
        // Distant mega-skyscraper for spectacular skyline backdrop
        height = 140 + Math.random() * 260;
        y = height / 2 - 80;
      }

      dummy.position.set(x, y, z);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(placedCount, dummy.matrix);
      placedCount++;
    }

    instancedMesh.count = placedCount;
    instancedMesh.instanceMatrix.needsUpdate = true;
    this.group.add(instancedMesh);
  }

  buildFlyingTraffic() {
    // Flying traffic vehicles cruise in subterranean skyway lanes deep below the track
    const carCount = 40;
    const carGeo = new THREE.BoxGeometry(4.5, 1.2, 8.5);

    for (let i = 0; i < carCount; i++) {
      const isCyan = Math.random() > 0.5;
      const carMat = new THREE.MeshBasicMaterial({
        color: isCyan ? 0x00f0ff : 0xff3366
      });
      const car = new THREE.Mesh(carGeo, carMat);

      const radius = 220 + Math.random() * 340;
      const speed = (0.3 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1);
      const angle = Math.random() * Math.PI * 2;
      // Altitude strictly between -120 and -60 (track is at 40-120), so traffic never crosses track
      const altitude = -110 + Math.random() * 45;

      car.position.set(Math.cos(angle) * radius, altitude, Math.sin(angle) * radius);
      this.group.add(car);

      this.trafficCars.push({
        mesh: car,
        radius,
        speed,
        angle,
        altitude
      });
    }
  }

  buildHolographicBillboards() {
    const billboardDefs = [
      { text: 'NEXUS DYNAMICS', color: '#00f0ff', pos: new THREE.Vector3(260, 90, -180), rot: 0.6 },
      { text: 'HYPER-ION BOOST', color: '#ff007f', pos: new THREE.Vector3(-220, 85, 80), rot: -1.2 },
      { text: 'GRAV-CORP V9', color: '#00ff66', pos: new THREE.Vector3(80, 110, 360), rot: 2.4 }
    ];

    billboardDefs.forEach(b => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'rgba(4, 8, 20, 0.85)';
      ctx.fillRect(0, 0, 512, 160);

      ctx.strokeStyle = b.color;
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 148);

      ctx.font = '900 42px Orbitron, sans-serif';
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 18;
      ctx.fillText(b.text, 256, 95);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide
      });

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), mat);
      plane.position.copy(b.pos);
      plane.rotation.y = b.rot;
      this.group.add(plane);
    });
  }

  update(delta) {
    // Animate distant flying traffic
    for (const car of this.trafficCars) {
      car.angle += car.speed * delta * 0.4;
      car.mesh.position.x = Math.cos(car.angle) * car.radius;
      car.mesh.position.z = Math.sin(car.angle) * car.radius;
      // Orient facing movement tangent
      car.mesh.rotation.y = -car.angle + (car.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
