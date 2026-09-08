// ==========================================================
// ANTI-GRAVITY: RADIAL SPEED WARP LINES VISUAL EFFECT
// ==========================================================

export class Speedlines {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.particleCount = 60;
    this.opacity = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initParticles();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 50 + Math.random() * 400,
        length: 60 + Math.random() * 120,
        speed: 15 + Math.random() * 25,
        width: 1.5 + Math.random() * 2.0
      });
    }
  }

  render(isBoosting, speedRatio) {
    if (!this.ctx || !this.canvas) return;

    // Fade in when boosting or at high speed
    const targetOpacity = isBoosting ? 0.9 : (speedRatio > 0.85 ? (speedRatio - 0.85) * 4 : 0);
    this.opacity += (targetOpacity - this.opacity) * 0.15;

    if (this.opacity <= 0.01) {
      this.canvas.style.opacity = '0';
      return;
    }

    this.canvas.style.opacity = `${this.opacity}`;
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const maxRadius = Math.max(cx, cy) * 1.2;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineCap = 'round';

    for (const p of this.particles) {
      p.dist += p.speed * (isBoosting ? 2.5 : 1.2);
      if (p.dist > maxRadius) {
        p.dist = 40 + Math.random() * 80;
        p.angle = Math.random() * Math.PI * 2;
      }

      const x1 = cx + Math.cos(p.angle) * p.dist;
      const y1 = cy + Math.sin(p.angle) * p.dist;
      const x2 = cx + Math.cos(p.angle) * (p.dist + p.length);
      const y2 = cy + Math.sin(p.angle) * (p.dist + p.length);

      ctx.lineWidth = p.width;
      ctx.globalAlpha = Math.min(1.0, (p.dist / maxRadius) * this.opacity);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }
}
