// ==========================================================
// ANTI-GRAVITY: REAL-TIME 2D MINIMAP RADAR
// ==========================================================

export class Minimap {
  constructor(canvasId, trackBuilder) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.track = trackBuilder;

    // Precalculate bounds of track curve for 2D projection
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minZ = Infinity;
    this.maxZ = -Infinity;

    if (this.track && this.track.curve) {
      const pts = this.track.curve.getPoints(120);
      for (const p of pts) {
        if (p.x < this.minX) this.minX = p.x;
        if (p.x > this.maxX) this.maxX = p.x;
        if (p.z < this.minZ) this.minZ = p.z;
        if (p.z > this.maxZ) this.maxZ = p.z;
      }
    }

    this.padding = 24;
    this.scaleX = 1;
    this.scaleZ = 1;
    this.offsetX = 0;
    this.offsetZ = 0;

    this.calculateScale();
  }

  setTrack(trackBuilder) {
    this.track = trackBuilder;
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minZ = Infinity;
    this.maxZ = -Infinity;

    const pts = this.track.curve.getPoints(120);
    for (const p of pts) {
      if (p.x < this.minX) this.minX = p.x;
      if (p.x > this.maxX) this.maxX = p.x;
      if (p.z < this.minZ) this.minZ = p.z;
      if (p.z > this.maxZ) this.maxZ = p.z;
    }

    this.calculateScale();
  }

  calculateScale() {
    if (!this.canvas) return;
    const w = this.canvas.width - this.padding * 2;
    const h = this.canvas.height - this.padding * 2;
    const rangeX = (this.maxX - this.minX) || 1;
    const rangeZ = (this.maxZ - this.minZ) || 1;

    const scale = Math.min(w / rangeX, h / rangeZ);
    this.scaleX = scale;
    this.scaleZ = scale;

    this.offsetX = this.canvas.width / 2 - ((this.minX + this.maxX) / 2) * scale;
    this.offsetZ = this.canvas.height / 2 - ((this.minZ + this.maxZ) / 2) * scale;
  }

  worldToCanvas(x, z) {
    return {
      x: x * this.scaleX + this.offsetX,
      y: z * this.scaleZ + this.offsetZ
    };
  }

  render(player, aiRacers) {
    if (!this.ctx || !this.track) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Radar background circular grid
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw Track Spline Ribbon
    const points = this.track.curve.getPoints(120);
    ctx.beginPath();
    const first = this.worldToCanvas(points[0].x, points[0].z);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < points.length; i++) {
      const pt = this.worldToCanvas(points[i].x, points[i].z);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();

    // Track outer glow
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Track inner crisp line
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Draw Finish line marker
    const finishPos = this.worldToCanvas(points[0].x, points[0].z);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(finishPos.x - 3, finishPos.y - 3, 6, 6);

    // 4. Draw AI Opponents
    for (const ai of aiRacers) {
      const pt = this.worldToCanvas(ai.position.x, ai.position.z);
      ctx.fillStyle = ai.config.neonColor || '#ff0055';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Draw Player (Bright Pulsing Cyan Blip with Heading)
    if (player) {
      const pPt = this.worldToCanvas(player.position.x, player.position.z);

      // Pulse ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pPt.x, pPt.y, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Core dot
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pPt.x, pPt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
