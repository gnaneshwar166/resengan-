/**
 * Naruto Jutsu-Cam Visual Effects Engine
 * High-performance Canvas 2D / procedural particle and energy renderer
 * Supports: Rasengan, Chidori, Shadow Clone, Fireball, Reaper Death Seal, Kamui, Susanoo
 */

class JutsuEffectsEngine {
  constructor(canvas, video) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.video = video;

    this.time = 0;
    this.particles = [];
    this.smokePuffs = [];
    this.lightningArcs = [];
    this.activeJutsu = 'rasengan';
    this.charge = 0; // 0 to 1

    // State trackers
    this.cloneActive = false;
    this.lastJutsu = null;
    this.kamuiPhase = 0; // 0: Sharingan, 1: Mangekyo, 2: Kamui vortex
    this.susanooPhase = 0; // 0: Sharingan, 1: Ribcage, 2: Full Avatar
    this.kamuiTimer = 0;
    this.susanooTimer = 0;

    // Video rasengan element refs
    this.orbs = Array.from(document.querySelectorAll('.rasengan'));
  }

  setJutsu(jutsuName) {
    if (this.activeJutsu !== jutsuName) {
      this.lastJutsu = this.activeJutsu;
      this.activeJutsu = jutsuName;
      this.charge = 0.2;
      this.kamuiTimer = 0;
      this.susanooTimer = 0;

      // Trigger audio on switch
      if (window.jutsuAudio) {
        window.jutsuAudio.stopRasengan();
        window.jutsuAudio.stopChidori();
        window.jutsuAudio.stopFireball();

        if (jutsuName === 'rasengan') window.jutsuAudio.startRasengan();
        else if (jutsuName === 'chidori') window.jutsuAudio.startChidori();
        else if (jutsuName === 'clone') {
          window.jutsuAudio.playShadowClone();
          this.spawnSmokeExplosion(this.canvas.width * 0.25, this.canvas.height * 0.5);
          this.spawnSmokeExplosion(this.canvas.width * 0.75, this.canvas.height * 0.5);
        }
        else if (jutsuName === 'fireball') window.jutsuAudio.startFireball();
        else if (jutsuName === 'reaper') window.jutsuAudio.playReaperDeathSeal();
        else if (jutsuName === 'kamui') {
          window.jutsuAudio.playSharingan();
          setTimeout(() => window.jutsuAudio && window.jutsuAudio.playKamui(), 700);
        }
        else if (jutsuName === 'susanoo') {
          window.jutsuAudio.playSharingan();
          setTimeout(() => window.jutsuAudio && window.jutsuAudio.playSusanoo(), 600);
        }
      }
    }
  }

  // Update loop called every frame
  update(dt = 0.016) {
    this.time += dt;
    this.kamuiTimer += dt;
    this.susanooTimer += dt;

    // Ramp charge up smoothly
    this.charge = Math.min(1.0, this.charge + dt * 1.5);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.size) p.size *= p.sizeGrowth || 0.98;
      if (p.rot !== undefined) p.rot += p.rotSpeed || 0;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update smoke puffs
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const sp = this.smokePuffs[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.radius += sp.growth;
      sp.life -= sp.decay;
      sp.rot += sp.rotSpeed;
      if (sp.life <= 0) {
        this.smokePuffs.splice(i, 1);
      }
    }
  }

  // Clear canvas
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Render all active effects
  render(handsData, faceLandmarks) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    // Hide html video orbs by default unless rasengan is active
    if (this.activeJutsu !== 'rasengan') {
      this.orbs.forEach(orb => orb.style.opacity = '0');
    }

    // Extract key positions
    let hand1 = null, hand2 = null;
    if (handsData && handsData.multiHandLandmarks) {
      if (handsData.multiHandLandmarks[0]) hand1 = handsData.multiHandLandmarks[0];
      if (handsData.multiHandLandmarks[1]) hand2 = handsData.multiHandLandmarks[1];
    }

    let leftEye = { x: w * 0.43, y: h * 0.38 };
    let rightEye = { x: w * 0.57, y: h * 0.38 };
    let mouth = { x: w * 0.50, y: h * 0.52 };
    let headCenter = { x: w * 0.50, y: h * 0.36 };
    let eyeDist = w * 0.14;

    if (faceLandmarks && faceLandmarks[0]) {
      const fl = faceLandmarks[0];
      // FaceMesh eye landmarks: 33/133 right eye, 362/263 left eye
      if (fl[133] && fl[33]) {
        rightEye = { x: (1 - (fl[33].x + fl[133].x) / 2) * w, y: ((fl[33].y + fl[133].y) / 2) * h };
      }
      if (fl[362] && fl[263]) {
        leftEye = { x: (1 - (fl[362].x + fl[263].x) / 2) * w, y: ((fl[362].y + fl[263].y) / 2) * h };
      }
      if (fl[13]) {
        mouth = { x: (1 - fl[13].x) * w, y: fl[13].y * h };
      }
      if (fl[10]) {
        headCenter = { x: (1 - fl[10].x) * w, y: (fl[10].y + 0.05) * h };
      }
      eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || (w * 0.14);
    }

    // Dispatch effect renderers
    switch (this.activeJutsu) {
      case 'rasengan':
        this.renderRasengan(hand1, hand2, w, h);
        break;
      case 'chidori':
        this.renderChidori(hand1, hand2, w, h);
        break;
      case 'clone':
        this.renderShadowClone(w, h);
        break;
      case 'fireball':
        this.renderFireball(mouth, hand1, w, h);
        break;
      case 'reaper':
        this.renderReaperDeathSeal(headCenter, w, h);
        break;
      case 'kamui':
        this.renderSharinganKamui(leftEye, rightEye, eyeDist, w, h);
        break;
      case 'susanoo':
        this.renderSharinganSusanoo(leftEye, rightEye, headCenter, eyeDist, w, h);
        break;
    }

    // Render general particles & smoke
    this.renderSmokePuffs();
    this.renderParticles();
  }

  // ==========================================
  // 1. RASENGAN RENDERER
  // ==========================================
  renderRasengan(hand1, hand2, w, h) {
    const hands = [hand1, hand2].filter(Boolean);

    if (hands.length === 0) {
      // Default center preview if no hand detected
      this.drawProceduralRasengan(w * 0.5, h * 0.5, 95, this.charge);
      return;
    }

    hands.forEach((hand, idx) => {
      const wrist = hand[0];
      const midKnk = hand[9];
      const cx = (1 - (wrist.x + midKnk.x) / 2) * w;
      const handSpan = Math.hypot((hand[9].x - hand[0].x) * w, (hand[9].y - hand[0].y) * h);
      const cy = ((wrist.y + midKnk.y) / 2) * h - handSpan * 0.85;
      const radius = Math.max(55, Math.min(140, handSpan * 0.75));

      // Draw procedural energy sphere
      this.drawProceduralRasengan(cx, cy, radius, this.charge);

      // Support original video element overlay if present
      if (this.orbs[idx]) {
        const orb = this.orbs[idx];
        orb.style.left = `${cx}px`;
        orb.style.top = `${cy}px`;
        orb.style.width = `${radius * 7.5}px`;
        orb.style.opacity = (this.charge * 0.85).toFixed(2);
      }
    });
  }

  drawProceduralRasengan(x, y, radius, charge) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Outer cyan aura
    const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 1.5);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.25, 'rgba(0, 240, 255, 0.85)');
    grad.addColorStop(0.65, 'rgba(10, 110, 255, 0.45)');
    grad.addColorStop(1, 'rgba(0, 60, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-speed spiraling chakra rings
    const spiralCount = 14;
    const rotSpeed = this.time * 9.0;

    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00f0ff';

    for (let i = 0; i < spiralCount; i++) {
      const baseAngle = (i / spiralCount) * Math.PI * 2 + rotSpeed;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 230, 255, 0.8)';
      ctx.beginPath();
      for (let r = 5; r <= radius * 1.05; r += 4) {
        const theta = baseAngle + (r / radius) * 3.8;
        const px = x + Math.cos(theta) * r;
        const py = y + Math.sin(theta) * r;
        if (r === 5) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 3. Dense glowing core
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.45);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, '#a6f4ff');
    coreGrad.addColorStop(1, 'rgba(0, 195, 255, 0.3)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // 4. Spawn swirling outer chakra sparks
    if (Math.random() < 0.65) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.5);
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.sin(angle) * 3.5 + (Math.random() - 0.5),
        vy: Math.cos(angle) * 3.5 + (Math.random() - 0.5),
        size: Math.random() * 4 + 2,
        color: '#62f0ff',
        decay: 0.04,
        life: 1.0
      });
    }

    ctx.restore();
  }

  // ==========================================
  // 2. CHIDORI RENDERER
  // ==========================================
  renderChidori(hand1, hand2, w, h) {
    const hands = [hand1, hand2].filter(Boolean);
    let targetX = w * 0.5;
    let targetY = h * 0.65;
    let handSpan = 100;

    if (hands.length > 0) {
      const hand = hands[0];
      const wrist = hand[0];
      const knk = hand[9];
      targetX = (1 - (wrist.x + knk.x) / 2) * w;
      targetY = ((wrist.y + knk.y) / 2) * h;
      handSpan = Math.hypot((knk.x - wrist.x) * w, (knk.y - wrist.y) * h) * 1.2;
    }

    const ctx = this.ctx;
    ctx.save();

    // 1. Blinding lightning core
    const coreRadius = Math.max(40, handSpan * 0.55);
    const grad = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, coreRadius * 1.8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(120, 235, 255, 0.9)');
    grad.addColorStop(0.7, 'rgba(0, 140, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 80, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(targetX, targetY, coreRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Recursive branching lightning bolts
    const boltCount = 10;
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#00f0ff';

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const length = coreRadius * (1.2 + Math.random() * 1.6);
      const endX = targetX + Math.cos(angle) * length;
      const endY = targetY + Math.sin(angle) * length;
      this.drawLightningBolt(targetX, targetY, endX, endY, 4, '#ffffff', '#00f0ff');
    }

    // 3. Electric sparks flying off
    for (let s = 0; s < 3; s++) {
      const spAngle = Math.random() * Math.PI * 2;
      const spSpeed = Math.random() * 8 + 4;
      this.particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(spAngle) * spSpeed,
        vy: Math.sin(spAngle) * spSpeed,
        size: Math.random() * 3.5 + 1.5,
        color: Math.random() > 0.4 ? '#ffffff' : '#4deeea',
        decay: 0.05,
        life: 1.0
      });
    }

    ctx.restore();
  }

  drawLightningBolt(x1, y1, x2, y2, displace, coreColor = '#ffffff', glowColor = '#00e5ff') {
    const ctx = this.ctx;
    const segments = [];
    segments.push({ x: x1, y: y1 });

    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = 7;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const nx = -dy / Math.hypot(dx, dy);
      const ny = dx / Math.hypot(dx, dy);
      const jitter = (Math.random() - 0.5) * displace * 25;
      segments.push({
        x: x1 + dx * t + nx * jitter,
        y: y1 + dy * t + ny * jitter
      });
    }
    segments.push({ x: x2, y: y2 });

    // Outer glow stroke
    ctx.beginPath();
    ctx.moveTo(segments[0].x, segments[0].y);
    for (let i = 1; i < segments.length; i++) {
      ctx.lineTo(segments[i].x, segments[i].y);
    }
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner bright white stroke
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Random child branch
    if (Math.random() < 0.45 && segments.length > 4) {
      const branchIdx = Math.floor(segments.length / 2);
      const bx = segments[branchIdx].x;
      const by = segments[branchIdx].y;
      const bAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;
      const bLen = Math.hypot(dx, dy) * 0.5;
      this.drawLightningBolt(bx, by, bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen, displace * 0.6, coreColor, glowColor);
    }
  }

  // ==========================================
  // 3. SHADOW CLONE RENDERER
  // ==========================================
  renderShadowClone(w, h) {
    const ctx = this.ctx;

    // Render 2 clones of live video feed to the left and right
    const cloneWidth = w * 0.65;
    const cloneHeight = h * 0.65;
    const cy = h * 0.25;

    ctx.save();
    ctx.globalAlpha = 0.88;

    // Left Clone
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00a8ff';
    ctx.drawImage(this.video, -w * 0.28, cy, cloneWidth, cloneHeight);
    ctx.restore();

    // Right Clone
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff9f1a';
    ctx.drawImage(this.video, w * 0.62, cy, cloneWidth, cloneHeight);
    ctx.restore();

    // Chakra aura ribbons linking clones
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(100, 220, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.6);
    ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.7, h * 0.7, w * 0.9, h * 0.6);
    ctx.stroke();

    ctx.restore();
  }

  spawnSmokeExplosion(cx, cy) {
    const puffCount = 35;
    for (let i = 0; i < puffCount; i++) {
      const angle = (i / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 9 + 4;
      this.smokePuffs.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 25 + 20,
        growth: Math.random() * 1.4 + 0.8,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        decay: Math.random() * 0.025 + 0.015,
        life: 1.0,
        shade: Math.random() > 0.3 ? '#f5f5f5' : '#e0e0e0'
      });
    }
  }

  renderSmokePuffs() {
    const ctx = this.ctx;
    ctx.save();
    for (const sp of this.smokePuffs) {
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.globalAlpha = Math.max(0, sp.life);

      // Fluffy cartoon smoke cloud with manga outline
      ctx.fillStyle = sp.shade;
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;

      ctx.beginPath();
      const r = sp.radius;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.arc(r * 0.45, -r * 0.25, r * 0.75, 0, Math.PI * 2);
      ctx.arc(-r * 0.45, -r * 0.25, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  // ==========================================
  // 4. FIREBALL (KATON: GŌKAKYŪ) RENDERER
  // ==========================================
  renderFireball(mouth, hand1, w, h) {
    const ctx = this.ctx;
    let startX = mouth.x;
    let startY = mouth.y;

    if (hand1) {
      const wrist = hand1[0];
      const knk = hand1[9];
      startX = (1 - (wrist.x + knk.x) / 2) * w;
      startY = ((wrist.y + knk.y) / 2) * h;
    }

    const orbX = w * 0.5;
    const orbY = h * 0.58;
    const orbRadius = Math.min(w, h) * 0.28;

    ctx.save();

    // 1. Concentrated fire jet from mouth/hand to giant orb
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.75)';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff4500';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(orbX, orbY);
    ctx.stroke();

    ctx.lineWidth = 12;
    ctx.strokeStyle = '#fff59d';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(orbX, orbY);
    ctx.stroke();

    // 2. Giant Swirling Fireball
    const grad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius * 1.3);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, '#fff7a0');
    grad.addColorStop(0.45, '#ff6600');
    grad.addColorStop(0.8, '#d90429');
    grad.addColorStop(1, 'rgba(100, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 3. Swirling flame tongues
    const flameTongues = 16;
    const flameSpeed = this.time * 5.0;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff3300';

    for (let i = 0; i < flameTongues; i++) {
      const angle = (i / flameTongues) * Math.PI * 2 + flameSpeed;
      const rOuter = orbRadius * (1.0 + Math.sin(this.time * 8 + i) * 0.25);
      const fx = orbX + Math.cos(angle) * rOuter;
      const fy = orbY + Math.sin(angle) * rOuter;

      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 200, 0, 0.85)' : 'rgba(255, 50, 0, 0.75)';
      ctx.beginPath();
      ctx.arc(fx, fy, orbRadius * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Flame sparks bursting outward
    for (let k = 0; k < 6; k++) {
      const spAngle = Math.random() * Math.PI * 2;
      const spDist = orbRadius * (0.4 + Math.random() * 0.8);
      const speed = Math.random() * 7 + 3;
      this.particles.push({
        x: orbX + Math.cos(spAngle) * spDist,
        y: orbY + Math.sin(spAngle) * spDist,
        vx: Math.cos(spAngle) * speed + (Math.random() - 0.5) * 3,
        vy: Math.sin(spAngle) * speed - 2.5,
        size: Math.random() * 5 + 3,
        color: Math.random() > 0.4 ? '#ffcc00' : '#ff3b00',
        decay: 0.045,
        life: 1.0
      });
    }

    ctx.restore();
  }

  // ==========================================
  // 5. REAPER DEATH SEAL (SHIKI FŪJIN) RENDERER
  // ==========================================
  renderReaperDeathSeal(headCenter, w, h) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Ominous purple spirit vignette
    const vigGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.75);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.7, 'rgba(30, 0, 50, 0.55)');
    vigGrad.addColorStop(1, 'rgba(15, 0, 30, 0.85)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Looming Shinigami Spectre behind user
    const shinX = headCenter.x;
    const shinY = headCenter.y - h * 0.22;
    const scale = Math.min(w, h) / 700;

    ctx.save();
    ctx.translate(shinX, shinY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.88;

    // A. Wild spiky white ghostly hair
    ctx.fillStyle = '#f0edf6';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#b5179e';
    ctx.beginPath();
    ctx.moveTo(0, -110);
    const hairSpikes = [
      [-120, -160], [-80, -220], [-30, -250], [0, -270],
      [30, -250], [80, -220], [120, -160], [140, -100],
      [110, 0], [0, 40], [-110, 0], [-140, -100]
    ];
    for (const [hx, hy] of hairSpikes) {
      ctx.lineTo(hx + Math.sin(this.time * 3 + hy) * 8, hy);
    }
    ctx.closePath();
    ctx.fill();

    // B. Terrifying Demonic Face
    ctx.fillStyle = '#e2daf0';
    ctx.beginPath();
    ctx.ellipse(0, -60, 65, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // C. Curved Demon Horns
    ctx.fillStyle = '#7209b7';
    ctx.beginPath();
    ctx.moveTo(-50, -110);
    ctx.quadraticCurveTo(-95, -170, -65, -200);
    ctx.quadraticCurveTo(-55, -160, -35, -120);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(50, -110);
    ctx.quadraticCurveTo(95, -170, 65, -200);
    ctx.quadraticCurveTo(55, -160, 35, -120);
    ctx.fill();

    // D. Glowing Demonic Eyes
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0055';
    ctx.beginPath();
    ctx.arc(-26, -72, 8, 0, Math.PI * 2);
    ctx.arc(26, -72, 8, 0, Math.PI * 2);
    ctx.fill();

    // E. Sealing Tantō Dagger in jaws
    ctx.fillStyle = '#dcdcdc';
    ctx.strokeStyle = '#3a0ca3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-110, -30, 220, 14);
    ctx.fill();
    ctx.stroke();

    // F. Prayer / Rosary Beads
    ctx.fillStyle = '#560bad';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#9d4edd';
    for (let b = -4; b <= 4; b++) {
      ctx.beginPath();
      ctx.arc(b * 24, 25 + Math.abs(b) * 6, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 3. Floating Cursed Kanji summoning runes
    const kanjiList = ['封', '死', '鬼', '魂', '呪'];
    const circleRadius = Math.min(w, h) * 0.32;
    const rot = this.time * 0.8;

    ctx.font = 'bold 36px "Noto Serif JP", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0aaff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#9d4edd';

    for (let k = 0; k < kanjiList.length; k++) {
      const angle = rot + (k / kanjiList.length) * Math.PI * 2;
      const kx = headCenter.x + Math.cos(angle) * circleRadius;
      const ky = headCenter.y + Math.sin(angle) * (circleRadius * 0.45) + h * 0.15;
      ctx.fillText(kanjiList[k], kx, ky);
    }

    // 4. Ghostly purple soul wisps
    if (Math.random() < 0.4) {
      const wAngle = Math.random() * Math.PI * 2;
      const wDist = Math.random() * circleRadius;
      this.particles.push({
        x: headCenter.x + Math.cos(wAngle) * wDist,
        y: headCenter.y + h * 0.2 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3.5 - 1.5,
        size: Math.random() * 6 + 3,
        color: '#c77dff',
        decay: 0.03,
        life: 1.0
      });
    }

    ctx.restore();
  }

  // ==========================================
  // 6. SHARINGAN ➔ KAMUI RENDERER
  // ==========================================
  renderSharinganKamui(leftEye, rightEye, eyeDist, w, h) {
    const ctx = this.ctx;
    const eyeRadius = Math.max(14, eyeDist * 0.22);

    ctx.save();

    // Phase 1: Draw Sharingan on both eyes
    const isMangekyo = this.kamuiTimer > 1.2;
    this.drawSharinganEye(leftEye.x, leftEye.y, eyeRadius, isMangekyo);
    this.drawSharinganEye(rightEye.x, rightEye.y, eyeRadius, isMangekyo);

    // Phase 2: If Mangekyo awakened, spawn the Kamui Spacetime Vortex
    if (this.kamuiTimer > 1.8) {
      const vortexX = rightEye.x;
      const vortexY = rightEye.y;
      this.drawKamuiVortex(vortexX, vortexY, w, h);
    }

    ctx.restore();
  }

  drawSharinganEye(x, y, radius, mangekyo = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // Glowing red iris
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff0033';

    const irisGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    irisGrad.addColorStop(0, '#ff1a1a');
    irisGrad.addColorStop(0.7, '#cc0000');
    irisGrad.addColorStop(1, '#110000');

    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Black outer ring
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = radius * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    const rot = this.time * 6.0;

    if (!mangekyo) {
      // 3-Tomoe Sharingan
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        const angle = rot + (i / 3) * Math.PI * 2;
        const tx = Math.cos(angle) * (radius * 0.55);
        const ty = Math.sin(angle) * (radius * 0.55);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle + Math.PI / 2);
        // Tomoe comma shape
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(radius * 0.12, 0);
        ctx.quadraticCurveTo(radius * 0.18, -radius * 0.25, 0, -radius * 0.35);
        ctx.lineTo(-radius * 0.08, 0);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Kakashi / Obito's Mangekyō Pinwheel
      ctx.save();
      ctx.rotate(rot * 1.5);
      ctx.fillStyle = '#000000';

      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(radius * 0.7, radius * 0.25, 0, radius * 0.95);
        ctx.quadraticCurveTo(-radius * 0.2, radius * 0.45, 0, 0);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawKamuiVortex(cx, cy, w, h) {
    const ctx = this.ctx;
    ctx.save();

    const maxRadius = Math.min(w, h) * 0.45;
    const vortexSpeed = this.time * 8.0;

    // Spacetime spiral distortion lines
    ctx.lineWidth = 3.0;
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#9d4edd';

    const arms = 12;
    for (let a = 0; a < arms; a++) {
      const baseA = (a / arms) * Math.PI * 2 - vortexSpeed;
      ctx.strokeStyle = a % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(157, 78, 221, 0.85)';
      ctx.beginPath();
      for (let r = 10; r < maxRadius; r += 5) {
        const theta = baseA + (r / maxRadius) * 4.5;
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (r === 10) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Black Hole / Singularity in the center
    const singGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.35);
    singGrad.addColorStop(0, '#000000');
    singGrad.addColorStop(0.5, 'rgba(30, 0, 50, 0.95)');
    singGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = singGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Spacetime debris shards sucked in
    for (let p = 0; p < 4; p++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = maxRadius * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.cos(angle + 0.4) * 6,
        vy: -Math.sin(angle + 0.4) * 6,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#ffffff' : '#c77dff',
        decay: 0.05,
        life: 1.0
      });
    }

    ctx.restore();
  }

  // ==========================================
  // 7. SHARINGAN ➔ SUSANOO RENDERER
  // ==========================================
  renderSharinganSusanoo(leftEye, rightEye, headCenter, eyeDist, w, h) {
    const ctx = this.ctx;
    const eyeRadius = Math.max(14, eyeDist * 0.22);

    ctx.save();

    // 1. Blazing Mangekyo Eyes
    this.drawSharinganEye(leftEye.x, leftEye.y, eyeRadius, true);
    this.drawSharinganEye(rightEye.x, rightEye.y, eyeRadius, true);

    // 2. Giant Ethereal Susanoo Chakra Ribcage & Avatar
    const susX = headCenter.x;
    const susY = headCenter.y + h * 0.15;
    const ribSpan = Math.min(w, h) * 0.42;

    ctx.shadowBlur = 35;
    ctx.shadowColor = '#9d4edd';

    // A. Chakra Ribs (Left & Right curved massive bone arcs)
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#c77dff';
    ctx.lineCap = 'round';

    const ribLevels = [-0.15, 0.05, 0.25, 0.45];
    for (const lvl of ribLevels) {
      const ry = susY + lvl * ribSpan;
      const rxOffset = ribSpan * 0.85 * (1 - Math.abs(lvl) * 0.4);

      // Left Rib
      ctx.beginPath();
      ctx.moveTo(susX - 10, ry);
      ctx.bezierCurveTo(susX - rxOffset * 0.6, ry - 30, susX - rxOffset, ry + 20, susX - rxOffset * 0.9, ry + 50);
      ctx.stroke();

      // Right Rib
      ctx.beginPath();
      ctx.moveTo(susX + 10, ry);
      ctx.bezierCurveTo(susX + rxOffset * 0.6, ry - 30, susX + rxOffset, ry + 20, susX + rxOffset * 0.9, ry + 50);
      ctx.stroke();
    }

    // B. Susanoo Spinal Column
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#e0aaff';
    ctx.beginPath();
    ctx.moveTo(susX, susY - ribSpan * 0.35);
    ctx.lineTo(susX, susY + ribSpan * 0.65);
    ctx.stroke();

    // C. Giant Demonic Avatar Eyes towering above
    const avY = headCenter.y - h * 0.26;
    ctx.fillStyle = '#ffea00';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ffea00';
    ctx.beginPath();
    ctx.ellipse(susX - ribSpan * 0.4, avY, 28, 12, -0.25, 0, Math.PI * 2);
    ctx.ellipse(susX + ribSpan * 0.4, avY, 28, 12, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // D. Flaming Chakra Horns & Shoulder Armor
    ctx.fillStyle = 'rgba(157, 78, 221, 0.55)';
    ctx.beginPath();
    ctx.moveTo(susX - ribSpan * 0.6, avY);
    ctx.quadraticCurveTo(susX - ribSpan * 0.9, avY - 140, susX - ribSpan * 0.5, avY - 200);
    ctx.quadraticCurveTo(susX - ribSpan * 0.4, avY - 120, susX - ribSpan * 0.3, avY - 20);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(susX + ribSpan * 0.6, avY);
    ctx.quadraticCurveTo(susX + ribSpan * 0.9, avY - 140, susX + ribSpan * 0.5, avY - 200);
    ctx.quadraticCurveTo(susX + ribSpan * 0.4, avY - 120, susX + ribSpan * 0.3, avY - 20);
    ctx.fill();

    // E. Rising ethereal purple chakra flames
    for (let f = 0; f < 5; f++) {
      const fx = susX + (Math.random() - 0.5) * ribSpan * 1.6;
      this.particles.push({
        x: fx,
        y: susY + ribSpan * 0.5,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 6 - 3,
        size: Math.random() * 8 + 4,
        color: Math.random() > 0.4 ? '#9d4edd' : '#e0aaff',
        decay: 0.035,
        life: 1.0
      });
    }

    ctx.restore();
  }

  // ==========================================
  // GENERAL PARTICLE RENDERER
  // ==========================================
  renderParticles() {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

window.JutsuEffectsEngine = JutsuEffectsEngine;
