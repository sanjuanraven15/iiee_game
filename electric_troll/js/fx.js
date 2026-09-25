/* ⚡ ELECTRICAL TROLL — effects layer.
   Particles, shockwaves, dust, arcs, floating text, screen shake/flash and the living background.
   Everything hangs off Game.prototype, so the engine just calls this.fxSomething(). */
'use strict';

const FX_CAP = 560;             // hard ceiling — a booth TV must never choke on confetti

Object.assign(Game.prototype, {

  /* ---------- emitters ---------- */
  fxPush(q) {
    const list = this.particles;
    if (list.length >= FX_CAP) list.splice(0, list.length - FX_CAP + 1);
    list.push(q);
    return q;
  },

  /* The classic burst. Every trap calls sparks(x, y, n, color), so the signature never changes —
     it just throws a lot more light around now: streaked sparks, embers, smoke and a shockwave. */
  sparks(x, y, n, color = COLORS.yellow) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(150, 640);
      this.fxPush({
        kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 170,
        life: rand(0.26, 0.8), t: 0, color, size: rand(2.5, 6), drag: 0.965, grav: 1500
      });
    }
    if (n >= 14) {
      this.fxRing(x, y, { color, r0: 8, r1: 54 + n * 2.6, life: 0.32, width: 6 });
      const embers = Math.min(7, Math.round(n / 4));
      for (let i = 0; i < embers; i++) this.fxEmber(x, y, color);
      for (let i = 0; i < 3; i++) this.fxSmoke(x + rand(-18, 18), y + rand(-12, 12), { r1: rand(42, 78), life: rand(0.5, 0.95), alpha: 0.26 });
    }
    return this;
  },

  fxEmber(x, y, color = COLORS.yellow) {
    return this.fxPush({
      kind: 'ember', x, y, vx: rand(-200, 200), vy: rand(-340, -70),
      life: rand(0.7, 1.6), t: 0, color, size: rand(2, 4.2), drag: 0.988, grav: 460, ph: rand(0, 6.3)
    });
  },

  fxRing(x, y, o = {}) {
    return this.fxPush({
      kind: 'ring', x, y, t: 0, life: o.life ?? 0.4, r0: o.r0 ?? 6, r1: o.r1 ?? 90,
      width: o.width ?? 5, color: o.color || COLORS.cyan, delay: o.delay || 0, squash: o.squash || 1
    });
  },

  fxSmoke(x, y, o = {}) {
    return this.fxPush({
      kind: 'smoke', x, y, vx: o.vx ?? rand(-30, 30), vy: o.vy ?? rand(-70, -20), t: 0,
      life: o.life ?? 0.7, r0: o.r0 ?? 8, r1: o.r1 ?? 52, alpha: o.alpha ?? 0.3, color: o.color || '#b9c9ff'
    });
  },

  fxDebris(x, y, n, colors = [COLORS.yellow, COLORS.cyan, '#ffffff']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(180, 620);
      this.fxPush({
        kind: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 320, t: 0,
        life: rand(0.6, 1.3), w: rand(5, 13), h: rand(3, 7), rot: rand(0, 6.3), vr: rand(-12, 12),
        color: colors[i % colors.length], grav: 1700, drag: 0.99
      });
    }
    return this;
  },

  /* a live lightning arc that re-jags every frame */
  fxArc(x1, y1, x2, y2, color = COLORS.cyan, life = 0.2, o = {}) {
    return this.fxPush({
      kind: 'arc', x: x1, y: y1, x2, y2, t: 0, life, color,
      width: o.width || 3, jag: o.jag || 18, delay: o.delay || 0
    });
  },

  /* comic pop text: "ZAP!", "+450" */
  fxPop(x, y, text, color = COLORS.yellow, o = {}) {
    return this.fxPush({
      kind: 'text', x, y, t: 0, life: o.life ?? 0.9, text, color,
      size: o.size ?? 54, vy: o.vy ?? -110, delay: o.delay || 0
    });
  },

  /* full-screen colour wash — death, power surge, level clear */
  fxFlash(color = '#ffffff', strength = 0.5, life = 0.25) {
    if (this.flashT > 0 && this.flashMax > strength) return this;
    this.flashColor = color; this.flashMax = strength; this.flashLife = life; this.flashT = life;
    return this;
  },

  /* smooth, decaying shake instead of per-frame jitter */
  shake(t, mag = 9) {
    this.shakeT = Math.max(this.shakeT || 0, t);
    this.shakeMag = Math.max(this.shakeMag || 0, mag);
    return this;
  },

  /* ---------- player juice ---------- */
  fxStep(x, y, dir) {
    this.fxSmoke(x, y - 4, { vx: dir * rand(40, 120), vy: rand(-60, -15), r0: 4, r1: rand(20, 34), life: rand(0.3, 0.5), alpha: 0.22 });
    if (Math.random() < 0.35) this.fxPush({ kind: 'spark', x, y: y - 2, vx: dir * rand(60, 200), vy: rand(-180, -40), life: 0.22, t: 0, color: COLORS.cyan, size: 2.5, drag: 0.95, grav: 1400 });
  },

  fxSkid(x, y, dir) {
    for (let i = 0; i < 4; i++) this.fxSmoke(x + i * dir * 6, y - 4, { vx: dir * rand(90, 260), vy: rand(-90, -20), r0: 6, r1: rand(26, 46), life: rand(0.35, 0.6), alpha: 0.26 });
    this.fxRing(x, y - 6, { color: 'rgba(200,220,255,1)', r0: 6, r1: 34, life: 0.22, width: 3, squash: 0.35 });
  },

  fxJump(x, y) {
    this.fxRing(x, y, { color: COLORS.cyan, r0: 8, r1: 52, life: 0.26, width: 4, squash: 0.35 });
    for (let i = 0; i < 4; i++) this.fxSmoke(x + rand(-14, 14), y - 4, { vy: rand(-40, -10), r1: rand(22, 38), life: 0.4, alpha: 0.2 });
    for (let i = 0; i < 5; i++) this.fxPush({ kind: 'spark', x: x + rand(-12, 12), y, vx: rand(-160, 160), vy: rand(-60, 120), life: 0.25, t: 0, color: COLORS.cyan, size: 3, drag: 0.94, grav: 900 });
  },

  fxLand(x, y, impact) {
    const k = Math.max(0, Math.min(1, (impact - 420) / 1300));
    if (k <= 0.02) return;
    this.fxRing(x, y, { color: 'rgba(210,230,255,1)', r0: 8, r1: 44 + 90 * k, life: 0.26 + 0.12 * k, width: 3 + 4 * k, squash: 0.3 });
    const puffs = 2 + Math.round(k * 5);
    for (let i = 0; i < puffs; i++) {
      const dir = i % 2 ? 1 : -1;
      this.fxSmoke(x + dir * rand(4, 20), y - 4, { vx: dir * rand(70, 220 + 160 * k), vy: rand(-70, -10), r0: 5, r1: rand(24, 44 + 30 * k), life: rand(0.35, 0.65), alpha: 0.2 + 0.12 * k });
    }
    if (k > 0.45) {
      for (let i = 0; i < 5; i++) this.fxPush({ kind: 'spark', x, y, vx: rand(-320, 320), vy: rand(-260, -40), life: 0.3, t: 0, color: COLORS.yellow, size: 3, drag: 0.95, grav: 1600 });
      this.shake(0.1 + 0.08 * k, 3 + 5 * k);
    }
  },

  /* he materialises at the spawn point instead of just appearing */
  fxSpawn(x, y) {
    this.fxRing(x, y - 30, { color: COLORS.cyan, r0: 120, r1: 10, life: 0.35, width: 6 });
    this.fxRing(x, y, { color: COLORS.yellow, r0: 4, r1: 70, life: 0.3, width: 4, squash: 0.4, delay: 0.3 });
    for (let i = 0; i < 12; i++) this.fxPush({ kind: 'spark', x: x + rand(-30, 30), y: y - rand(0, 70), vx: rand(-120, 120), vy: rand(-220, -40), life: rand(0.3, 0.6), t: 0, color: i % 2 ? COLORS.cyan : COLORS.yellow, size: rand(2, 5), drag: 0.96, grav: 900, delay: 0.28 });
  },

  /* power surge running down the line from a breaker to whatever it opens */
  fxSurgeLine(from, to, color = COLORS.cyan) {
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const ax = from.x + (to.x - from.x) * t0, ay = from.y + (to.y - from.y) * t0;
      const bx = from.x + (to.x - from.x) * t1, by = from.y + (to.y - from.y) * t1;
      this.fxArc(ax, ay, bx, by, color, 0.16, { delay: i * 0.055, width: 4, jag: 26 });
      this.fxPush({ kind: 'spark', x: bx, y: by, vx: rand(-90, 90), vy: rand(-140, 40), life: 0.3, t: 0, color, size: 3.5, drag: 0.95, grav: 700, delay: i * 0.055 });
    }
  },

  /* ---------- per-step update ---------- */
  fxUpdate(dt) {
    const list = this.particles;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (q.delay > 0) { q.delay -= dt; continue; }
      q.t += dt;
      switch (q.kind) {
        case 'spark': case 'ember':
          q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt; q.vx *= q.drag; q.vy *= q.drag;
          break;
        case 'debris':
          q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt; q.vx *= q.drag; q.rot += q.vr * dt;
          break;
        case 'smoke':
          q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 0.97; q.vx *= 0.97;
          break;
        case 'text':
          q.y += q.vy * dt; q.vy *= 0.94;
          break;
      }
    }
    this.particles = list.filter(q => q.delay > 0 || q.t < q.life);

    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT === 0) this.shakeMag = 0;
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
    if (this.dangerT > 0) this.dangerT = Math.max(0, this.dangerT - dt);

    /* far-away storm: the whole booth lights up for a moment every few seconds */
    const a = this.amb || (this.amb = { next: rand(4, 9), t: 0, x: 0, n: 1 });
    if (a.t > 0) a.t = Math.max(0, a.t - dt);
    a.next -= dt;
    if (a.next <= 0) { a.next = rand(6, 14); a.t = 0.5; a.x = rand(120, (this.viewW || WORLD_W) - 120); a.n = 1 + Math.floor(Math.random() * 3); }
  },

  /* ---------- drawing ---------- */
  fxDraw(ctx) {
    const list = this.particles;
    if (!list.length) return;
    ctx.save();
    /* soft stuff first, behind the sparks */
    for (const q of list) {
      if (q.kind !== 'smoke' || q.delay > 0) continue;
      const k = q.t / q.life;
      const r = q.r0 + (q.r1 - q.r0) * k;
      ctx.globalAlpha = q.alpha * (1 - k) * (k < 0.15 ? k / 0.15 : 1);
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const q of list) {
      if (q.kind !== 'debris' || q.delay > 0) continue;
      const k = q.t / q.life;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
      ctx.restore();
    }
    /* everything electric glows additively */
    ctx.globalCompositeOperation = 'lighter';
    for (const q of list) {
      if (q.delay > 0) continue;
      const k = q.t / q.life;
      if (q.kind === 'spark') {
        const a = 1 - k * k;
        ctx.globalAlpha = a;
        ctx.strokeStyle = q.color; ctx.lineWidth = q.size; ctx.lineCap = 'round';
        const tx = q.vx * 0.016, ty = q.vy * 0.016;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - tx, q.y - ty); ctx.stroke();
        if (q.size > 4) { ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 0.45, 0, Math.PI * 2); ctx.fill(); }
      } else if (q.kind === 'ember') {
        const flick = 0.55 + 0.45 * Math.sin(q.t * 26 + q.ph);
        ctx.globalAlpha = (1 - k) * flick;
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2); ctx.fill();
      } else if (q.kind === 'ring') {
        const e = 1 - Math.pow(1 - k, 3);                       // fast out, soft stop
        const r = q.r0 + (q.r1 - q.r0) * e;
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.9;
        ctx.strokeStyle = q.color; ctx.lineWidth = Math.max(0.5, q.width * (1 - k * 0.7));
        ctx.beginPath(); ctx.ellipse(q.x, q.y, Math.max(0.5, r), Math.max(0.5, r * q.squash), 0, 0, Math.PI * 2); ctx.stroke();
      } else if (q.kind === 'arc') {
        ctx.globalAlpha = 1 - k;
        drawBolt(ctx, q.x, q.y, q.x2, q.y2, q.color, q.width, q.jag);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    for (const q of list) {
      if (q.kind !== 'text' || q.delay > 0) continue;
      const k = q.t / q.life;
      const pop = k < 0.18 ? 0.6 + (k / 0.18) * 0.55 : 1.12 - 0.1 * k;
      ctx.save();
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      ctx.translate(q.x, q.y); ctx.scale(pop, pop);
      ctx.font = q.size + 'px Bangers, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(4,8,20,.85)'; ctx.strokeText(q.text, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  },

  /* camera shake: smooth noise that decays, with a touch of roll */
  fxApplyShake(ctx) {
    if (!this.shakeT) return;
    const k = Math.min(1, this.shakeT * 3.2);
    const amp = (this.shakeMag || 9) * k * k;
    const ph = this.time * 47;
    const dx = (Math.sin(ph) + Math.sin(ph * 2.7) * 0.5) * amp;
    const dy = (Math.cos(ph * 1.3) + Math.sin(ph * 3.1) * 0.4) * amp * 0.7;
    const cx = this.viewW / 2, cy = this.viewH / 2;
    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(Math.sin(ph * 0.9) * amp * 0.0011);
    ctx.translate(-cx, -cy);
  },

  /* ---------- living background ---------- */
  fxBuildAmbience() {
    const VW = this.viewW || WORLD_W, VH = this.viewH || WORLD_H;
    /* dust motes with a hint of parallax */
    this.motes = [];
    const n = Math.round(34 + VW / 60);
    for (let i = 0; i < n; i++) {
      this.motes.push({ x: Math.random() * VW, y: Math.random() * VH, r: rand(1, 3.4), sp: rand(8, 34), ph: rand(0, 6.3), depth: rand(0.2, 1) });
    }
    /* travelling current pulses along the background circuit traces */
    this.pulses = [];
    const paths = this.tracePaths || [];
    for (let i = 0; i < paths.length; i += 3) {
      const pts = paths[i];
      if (!pts || pts.length < 2) continue;
      let len = 0; const seg = [];
      for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); seg.push(d); len += d; }
      if (len < 120) continue;
      this.pulses.push({ pts, seg, len, speed: rand(110, 260), off: Math.random() * len, color: Math.random() < 0.25 ? COLORS.yellow : COLORS.cyan });
      if (this.pulses.length >= 14) break;
    }
    /* vignette, pre-rendered small once per resize and stretched over the stage (a gradient scales for free) */
    const sc = Math.min(1, 512 / Math.max(VW, VH));
    const cw = Math.max(16, Math.round(VW * sc)), ch = Math.max(16, Math.round(VH * sc));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.28, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.65, 'rgba(2,5,16,.28)'); g.addColorStop(1, 'rgba(1,3,10,.72)');
    x.fillStyle = g; x.fillRect(0, 0, cw, ch);
    this.vig = c;
  },

  fxDrawAmbience(ctx) {
    const VW = this.viewW, VH = this.viewH;
    const t = this.time;
    if (!this.motes || !this.motes.length) this.fxBuildAmbience();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    /* current running through the wall traces (skipped in low-FX mode: pure decoration) */
    for (const p of this.lowFx ? [] : this.pulses) {
      let d = (p.off + t * p.speed) % p.len;
      let i = 0;
      while (i < p.seg.length && d > p.seg[i]) { d -= p.seg[i]; i++; }
      if (i >= p.seg.length) continue;
      const a = p.pts[i], b = p.pts[i + 1];
      const k = p.seg[i] ? d / p.seg[i] : 0;
      const px = a.x + (b.x - a.x) * k, py = a.y + (b.y - a.y) * k;
      const tailK = Math.max(0, k - 0.22);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x + (b.x - a.x) * tailK, a.y + (b.y - a.y) * tailK); ctx.lineTo(px, py); ctx.stroke();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    /* floating dust, nudged by where the player is standing */
    const ppx = this.player ? this.player.x : WORLD_W / 2;
    const par = -(ppx - WORLD_W / 2) * 0.02;
    ctx.fillStyle = 'rgba(160,210,255,1)';
    for (const m of this.lowFx ? [] : this.motes) {
      const y = ((m.y - t * m.sp) % VH + VH) % VH;
      const x = m.x + par * m.depth + Math.sin(t * 0.7 + m.ph) * 12;
      ctx.globalAlpha = 0.1 + 0.22 * m.depth;
      ctx.beginPath(); ctx.arc(((x % VW) + VW) % VW, y, m.r * m.depth, 0, Math.PI * 2); ctx.fill();
    }
    /* distant storm */
    const a = this.amb;
    if (a && a.t > 0) {
      const k = a.t / 0.5;
      const strobe = Math.random() < 0.6 ? 1 : 0.35;
      ctx.globalAlpha = 0.16 * k * strobe;
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(0, 0, VW, VH);
      if (k > 0.45) {
        ctx.globalAlpha = 0.5 * strobe;
        for (let i = 0; i < a.n; i++) drawBolt(ctx, a.x + i * 60, 0, a.x + i * 60 + rand(-140, 140), VH * 0.42, 'rgba(190,235,255,.9)', 3, 40);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },

  /* vignette + the red pulse while Busby is fried */
  fxDrawVignette(ctx) {
    if (this.vig) { ctx.globalAlpha = 1; ctx.drawImage(this.vig, 0, 0, this.viewW, this.viewH); }
    if (this.dangerT > 0) {
      const k = this.dangerT / 0.75;
      const g = ctx.createRadialGradient(this.viewW / 2, this.viewH / 2, Math.min(this.viewW, this.viewH) * 0.2, this.viewW / 2, this.viewH / 2, Math.max(this.viewW, this.viewH) * 0.7);
      g.addColorStop(0, 'rgba(255,0,40,0)');
      g.addColorStop(1, 'rgba(255,20,60,' + (0.32 * k) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
  },

  fxDrawFlash(ctx) {
    if (this.flashT <= 0) return;
    const k = this.flashT / this.flashLife;
    ctx.globalAlpha = this.flashMax * k * k;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(-20, -20, this.viewW + 40, this.viewH + 40);
    ctx.globalAlpha = 1;
  },

  /* how far below the player the nearest surface is — used for the contact shadow */
  fxGroundBelow(p) {
    const cx = p.x + p.w / 2;
    let best = WORLD_H + 200;
    for (const s of this.solids) {
      if (s.w <= 0 || s.h <= 0) continue;
      if (cx < s.x - 4 || cx > s.x + s.w + 4) continue;
      if (s.y + 2 < p.y + p.h) continue;
      if (s.y < best) best = s.y;
    }
    return best;
  },

  /* soft shadow that tightens as he comes down — cheap depth cue, big readability win */
  fxDrawShadow(ctx, p) {
    const gy = this.fxGroundBelow(p);
    const drop = Math.max(0, gy - (p.y + p.h));
    if (drop > 420) return;
    const k = 1 - drop / 420;
    ctx.save();
    ctx.globalAlpha = 0.1 + 0.3 * k * k;
    ctx.fillStyle = '#01030a';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, gy - 2, 12 + 22 * k, 4 + 6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /* the exit pulls at him: it brightens and licks sparks toward the door as he closes in */
  fxExitLure(ctx, ex) {
    const p = this.player;
    const d = Math.hypot((ex.x + 35) - (p.x + p.w / 2), (ex.y + 50) - (p.y + p.h / 2));
    if (d > 460) return;
    const k = 1 - d / 460;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 + 0.32 * k;
    const g = ctx.createRadialGradient(ex.x + 35, ex.y + 50, 10, ex.x + 35, ex.y + 50, 150 + 90 * k);
    g.addColorStop(0, 'rgba(140,255,190,.9)'); g.addColorStop(1, 'rgba(60,255,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ex.x - 220, ex.y - 180, 510, 420);
    ctx.restore();
    if (Math.random() < 0.12 + 0.2 * k) {
      const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 90;
      this.fxPush({
        kind: 'spark', x: ex.x + 35 + Math.cos(a) * r, y: ex.y + 50 + Math.sin(a) * r,
        vx: -Math.cos(a) * 260, vy: -Math.sin(a) * 260, life: 0.42, t: 0, color: COLORS.green, size: 3.2, drag: 0.99, grav: 0
      });
    }
  }
});
