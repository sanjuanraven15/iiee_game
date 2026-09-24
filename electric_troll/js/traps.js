/* ⚡ ELECTRICAL TROLL — traps, gadgets and troll devices
   Every trap exposes: reset(), update(dt, g), draw(ctx, g), solids(), hazards()
   `g` is the running Game instance (player, particles, sfx helpers). */
'use strict';

const GRAVITY = 2600;
const COLORS = {
  yellow: '#ffd60a', cyan: '#29e0ff', magenta: '#ff2fa0', green: '#4dff88', red: '#ff3d5a',
  metal: '#243255', metalDark: '#141d38', metalEdge: '#4b64a3', text: '#f4f7ff', muted: '#8b9bc4'
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function inTrigger(p, t) {
  const cx = p.x + p.w / 2;
  return cx >= t[0] && cx <= t[1];
}
function rand(a, b) { return a + Math.random() * (b - a); }

/* ---------- drawing helpers shared by traps and the game ---------- */
function drawBolt(ctx, x1, y1, x2, y2, color, width = 4, jag = 22) {
  const segs = Math.max(3, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 40));
  const nx = -(y2 - y1), ny = (x2 - x1);
  const len = Math.hypot(nx, ny) || 1;
  const pts = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs, off = rand(-jag, jag);
    pts.push({ x: x1 + (x2 - x1) * t + nx / len * off, y: y1 + (y2 - y1) * t + ny / len * off });
  }
  pts.push({ x: x2, y: y2 });
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  /* fat halo, then the bolt, then a hot white core */
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.strokeStyle = color;
  ctx.globalAlpha *= 0.4; ctx.lineWidth = width * 2.2; trace();
  ctx.globalAlpha /= 0.4; ctx.lineWidth = width; trace();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = Math.max(1, width * 0.42); trace();
  /* a branch that goes nowhere, like real arcs do */
  if (pts.length > 3 && Math.random() < 0.55) {
    const a = pts[1 + Math.floor(Math.random() * (pts.length - 2))];
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, width * 0.6);
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + rand(-jag * 1.6, jag * 1.6), a.y + rand(-jag * 1.2, jag * 1.2));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatform(ctx, r, style = 'metal') {
  const { x, y, w, h } = r;
  ctx.fillStyle = COLORS.metalDark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = COLORS.metal;
  ctx.fillRect(x + 4, y + 4, w - 8, Math.max(4, h - 8));
  /* top edge highlight */
  ctx.fillStyle = style === 'metal' ? COLORS.metalEdge : COLORS.yellow;
  ctx.fillRect(x, y, w, 6);
  /* rivets */
  ctx.fillStyle = '#5f7bc4';
  for (let rx = x + 18; rx < x + w - 10; rx += 60) {
    ctx.beginPath(); ctx.arc(rx, y + 18, 4, 0, Math.PI * 2); ctx.fill();
  }
  /* circuit traces on tall blocks */
  if (h > 60) {
    ctx.strokeStyle = 'rgba(41,224,255,.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let tx = x + 30; tx < x + w - 30; tx += 90) {
      ctx.moveTo(tx, y + 40); ctx.lineTo(tx, y + h - 30); ctx.lineTo(tx + 40, y + h - 30);
    }
    ctx.stroke();
  }
}

function drawSpikes(ctx, r, color = '#c7d3f2', tip = '#ffffff') {
  const n = Math.max(1, Math.floor(r.w / 28));
  const sw = r.w / n;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sx = r.x + i * sw;
    ctx.moveTo(sx, r.y + r.h);
    ctx.lineTo(sx + sw / 2, r.y);
    ctx.lineTo(sx + sw, r.y + r.h);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tip;
  for (let i = 0; i < n; i++) {
    const sx = r.x + i * sw;
    ctx.beginPath(); ctx.arc(sx + sw / 2, r.y + 6, 3, 0, Math.PI * 2); ctx.fill();
  }
  /* a highlight sweeping along the row so a wall of spikes never looks flat */
  const sweep = ((Date.now() / 1400) % 1.6) - 0.3;
  const gx = r.x + r.w * sweep;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
  lg.addColorStop(0, 'rgba(255,255,255,0)');
  lg.addColorStop(0.5, 'rgba(255,255,255,.35)');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sx = r.x + i * sw;
    ctx.moveTo(sx, r.y + r.h); ctx.lineTo(sx + sw / 2, r.y); ctx.lineTo(sx + sw, r.y + r.h);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawExitDoor(ctx, e, time, glow = COLORS.green, label = 'EXIT') {
  const { x, y } = e;
  const w = 70, h = 100;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
  ctx.save();
  /* halo and slow rays: the exit has to read from the far side of the room */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x + w / 2, y + h / 2);
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.09 + 0.06 * pulse;
  ctx.beginPath(); ctx.arc(0, 0, 86 + 16 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(time * 0.35);
  ctx.globalAlpha = 0.045 + 0.035 * pulse;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(200, -22); ctx.lineTo(200, 22); ctx.fill();
  }
  ctx.restore();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 25 + Math.sin(time * 4) * 8;
  ctx.fillStyle = '#0b2a16';
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 5;
  ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6);
  ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
  ctx.globalAlpha = 1;
  /* sign above */
  ctx.fillStyle = '#04120a';
  ctx.fillRect(x - 12, y - 42, w + 24, 34);
  ctx.strokeStyle = glow; ctx.lineWidth = 3;
  ctx.strokeRect(x - 12, y - 42, w + 24, 34);
  ctx.fillStyle = glow;
  ctx.font = '26px Bangers, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 16);
  /* three chevrons marching down into the doorway */
  for (let i = 0; i < 3; i++) {
    const k = ((time * 1.6 + i * 0.33) % 1);
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.75;
    const cy = y - 58 + k * 22;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 13, cy); ctx.lineTo(x + w / 2, cy + 11); ctx.lineTo(x + w / 2 + 13, cy);
    ctx.lineWidth = 4; ctx.strokeStyle = glow; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSignPost(ctx, x, y, text) {
  ctx.save();
  ctx.font = '30px Bangers, Impact, sans-serif';
  const tw = Math.max(140, ctx.measureText(text).width + 36);
  ctx.fillStyle = '#5b4224';
  ctx.fillRect(x - 5, y - 70, 10, 70);
  ctx.fillStyle = '#c99a55';
  ctx.fillRect(x - tw / 2, y - 126, tw, 60);
  ctx.strokeStyle = '#7a5a2c'; ctx.lineWidth = 3;
  ctx.strokeRect(x - tw / 2, y - 126, tw, 60);
  ctx.fillStyle = '#2b1d00';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 85);
  ctx.restore();
}

/* ---------- base ---------- */
class Trap {
  constructor(def) { this.def = def; this.armed = !def.armedBy; }
  arm() { this.armed = true; }
  reset() { this.armed = !this.def.armedBy; }
  update() {}
  draw() {}
  solids() { return []; }
  hazards() { return []; }
}

/* A lightbulb hanging from the ceiling. Drops when the player walks under it. */
class FallingBulb extends Trap {
  reset() { super.reset(); this.state = 'hang'; this.y = this.def.y; this.vy = 0; this.swing = 0; }
  update(dt, g) {
    this.swing += dt;
    if (this.state === 'hang' && this.armed && inTrigger(g.player, this.def.trigger)) {
      if (this.def.dud) { this.armed = false; this.swing += 3; g.sfxWarn(); return; }   // a wobble and a hum, nothing more
      this.state = 'fall'; g.sfxTrap();
    }
    if (this.state === 'fall') {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      const r = this.hazardRect();
      for (const s of g.solids) {
        if (rectsOverlap(r, s) && this.vy > 0) {
          this.state = 'broken'; this.y = s.y - 80;
          g.sparks(r.x + 28, this.y + 60, 22, COLORS.yellow);
          g.fxDebris(r.x + 28, this.y + 56, 12, ['#dfe9ff', '#9fb6ee', COLORS.yellow]);
          g.fxRing(r.x + 28, this.y + 60, { color: '#ffffff', r0: 5, r1: 80, life: 0.26, width: 4 });
          g.shake(0.12, 4);
          g.sfxZap(); break;
        }
      }
      if (this.y > 1200) this.state = 'broken';
    }
  }
  hazardRect() { return { x: this.def.x - 26, y: this.y, w: 52, h: 78 }; }
  hazards() { return this.state === 'fall' ? [this.hazardRect()] : []; }
  draw(ctx) {
    const x = this.def.x;
    if (this.state !== 'broken') {
      ctx.strokeStyle = '#8b9bc4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.y); ctx.stroke();
    }
    const y = this.y;
    if (this.state === 'broken') {
      ctx.fillStyle = '#9fb0d8';
      ctx.fillRect(x - 14, y + 44, 28, 26);
      ctx.fillStyle = 'rgba(255,214,10,.5)';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 30 + i * 15, y + 78); ctx.lineTo(x - 22 + i * 15, y + 56 + (i % 2) * 10); ctx.lineTo(x - 14 + i * 15, y + 78); ctx.fill(); }
      return;
    }
    const wob = this.state === 'hang' ? Math.sin(this.swing * 2) * 2 : 0;
    ctx.save();
    ctx.translate(x + wob, y);
    ctx.fillStyle = '#9fb0d8';
    ctx.fillRect(-14, 0, 28, 26);
    ctx.fillStyle = '#6f7fa8';
    for (let i = 4; i < 26; i += 7) ctx.fillRect(-14, i, 28, 3);
    ctx.shadowColor = COLORS.yellow; ctx.shadowBlur = this.state === 'fall' ? 40 : 18;
    ctx.fillStyle = this.state === 'fall' ? '#fff1a8' : '#ffe680';
    ctx.beginPath(); ctx.arc(0, 52, 26, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#d9a900'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 36); ctx.lineTo(-4, 50); ctx.lineTo(4, 44); ctx.lineTo(8, 58); ctx.stroke();
    ctx.restore();
  }
}

/* Looks like a normal platform, short-circuits and disappears shortly after you stand on it. */
class VanishPlatform extends Trap {
  reset() { super.reset(); this.present = true; this.timer = -1; this.respawn = 0; }
  update(dt, g) {
    if (this.present) {
      if (this.timer < 0 && g.player.standingOn === this) { this.timer = this.def.delay ?? 0.4; g.sfxWarn(); }
      if (this.timer >= 0) {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.present = false; this.respawn = this.def.respawn ?? 3;
          g.sparks(this.def.x + this.def.w / 2, this.def.y + 10, 24, COLORS.cyan);
          g.fxRing(this.def.x + this.def.w / 2, this.def.y + 10, { color: COLORS.cyan, r0: 10, r1: this.def.w, life: 0.3, width: 5, squash: 0.35 });
          for (let k = 0; k < 4; k++) g.fxSmoke(this.def.x + rand(0, this.def.w), this.def.y + 8, { vy: rand(-70, -20), r1: rand(34, 56), life: 0.55, alpha: 0.24 });
          g.sfxZap();
        }
      }
    } else {
      this.respawn -= dt;
      if (this.respawn <= 0 && !rectsOverlap(g.player, this.rect())) { this.present = true; this.timer = -1; }
    }
  }
  rect() { return { x: this.def.x, y: this.def.y, w: this.def.w, h: this.def.h ?? 30, owner: this }; }
  solids() { return this.present ? [this.rect()] : []; }
  draw(ctx) {
    if (!this.present) return;
    const flick = this.timer >= 0 && Math.floor(this.timer * 20) % 2 === 0;
    ctx.save();
    if (flick) ctx.globalAlpha = 0.45;
    drawPlatform(ctx, this.rect(), 'metal');
    if (this.timer >= 0) {
      const r = this.rect();
      drawBolt(ctx, r.x, r.y + 10, r.x + r.w, r.y + 10, COLORS.cyan, 3, 8);
    }
    ctx.restore();
  }
}

/* A door that says EXIT. It is lying. */
class FakeExit extends Trap {
  reset() { super.reset(); this.state = 'idle'; this.zapTimer = 0; this.text = 0; }
  update(dt, g) {
    const p = g.player;
    const cx = this.def.x + 35, pcx = p.x + p.w / 2;
    const d = Math.abs(cx - pcx);
    if (this.state === 'idle' && d < (this.def.revealRange ?? 260)) {
      this.state = 'suspicious';
      g.level.exitHidden = false;
      g.sfxNope();
      g.sparks(g.level.exit.x + 35, g.level.exit.y + 50, 20, COLORS.green);
    }
    if (this.state === 'suspicious' && d < (this.def.range ?? 110)) {
      this.state = 'zap'; this.zapTimer = 1.0; this.text = 1.4; g.sfxTrap();
      g.sparks(cx, this.def.y + 50, 30, COLORS.red);
    }
    if (this.state === 'zap') { this.zapTimer -= dt; if (this.zapTimer <= 0) this.state = 'dead'; }
    if (this.text > 0) this.text -= dt;
  }
  hazards() { return this.state === 'zap' ? [{ x: this.def.x - 60, y: this.def.y - 20, w: 190, h: 120 }] : []; }
  draw(ctx, g) {
    const dead = this.state === 'dead';
    drawExitDoor(ctx, this.def, g.time, dead ? '#4a4a4a' : (this.state === 'suspicious' ? COLORS.red : COLORS.green), dead ? 'NOPE' : 'EXIT');
    if (this.state === 'suspicious') {
      ctx.save(); ctx.translate(rand(-2, 2), rand(-2, 2)); ctx.restore();
    }
    if (this.state === 'zap') {
      for (let i = 0; i < 4; i++) drawBolt(ctx, this.def.x - 60 + i * 60, this.def.y - 20, this.def.x - 30 + i * 60, this.def.y + 100, COLORS.red, 4);
    }
    if (this.text > 0) {
      ctx.font = '48px Bangers, Impact, sans-serif'; ctx.fillStyle = COLORS.red; ctx.textAlign = 'center';
      ctx.fillText('NOPE!', this.def.x + 35, this.def.y - 60);
    }
  }
}

/* Coil spring: bounces the player up hard. */
class Spring extends Trap {
  reset() { super.reset(); this.squash = 0; }
  update(dt) { if (this.squash > 0) this.squash -= dt * 3; }
  rect() { return { x: this.def.x, y: this.def.y, w: 80, h: 30, owner: this, bounce: this.def.power ?? 1500 }; }
  solids() { return [this.rect()]; }
  onBounce(g) {
    this.squash = 1; g.sfxBounce();
    g.sparks(this.def.x + 40, this.def.y, 10, COLORS.yellow);
    g.fxRing(this.def.x + 40, this.def.y + 6, { color: COLORS.yellow, r0: 8, r1: 90, life: 0.3, width: 5, squash: 0.3 });
    g.fxPop(this.def.x + 40, this.def.y - 60, 'BOING!', COLORS.yellow, { size: 38, life: 0.7 });
  }
  draw(ctx) {
    const { x, y } = this.def;
    const s = 1 - this.squash * 0.5;
    ctx.save();
    ctx.translate(x + 40, y + 30);
    ctx.scale(1, s);
    ctx.strokeStyle = '#d0d8ee'; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(-30, -i * 12 - 2); ctx.lineTo(30, -i * 12 - 8); }
    ctx.stroke();
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(-40, -52, 80, 12);
    ctx.fillStyle = '#7a5c00';
    ctx.fillRect(-40, -44, 80, 4);
    ctx.restore();
  }
}

/* A platform that patrols between two points, carrying the player. */
class MovingPlatform extends Trap {
  reset() { super.reset(); this.t = 0; this.x = this.def.x1; this.y = this.def.y1; this.dx = 0; this.dy = 0; }
  update(dt) {
    const d = this.def;
    const dist = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
    this.t += dt * (d.speed ?? 200) / dist;
    const k = (1 - Math.cos(this.t * Math.PI)) / 2;  // ease back and forth
    const nx = d.x1 + (d.x2 - d.x1) * k, ny = d.y1 + (d.y2 - d.y1) * k;
    this.dx = nx - this.x; this.dy = ny - this.y;
    this.x = nx; this.y = ny;
  }
  rect() { return { x: this.x, y: this.y, w: this.def.w, h: this.def.h ?? 30, owner: this, carry: true }; }
  solids() { return [this.rect()]; }
  draw(ctx) {
    drawPlatform(ctx, this.rect(), 'moving');
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath(); ctx.arc(this.x + 12, this.y + 18, 5, 0, Math.PI * 2); ctx.arc(this.x + this.def.w - 12, this.y + 18, 5, 0, Math.PI * 2); ctx.fill();
  }
}

/* Magnetic belt: pushes whatever stands on it. */
class Conveyor extends Trap {
  reset() { super.reset(); this.phase = 0; }
  update(dt, g) {
    this.phase += dt * this.def.dir * (this.def.speed ?? 300);
    if (g.player.standingOn === this) g.player.push += this.def.dir * (this.def.speed ?? 300);
  }
  rect() { return { x: this.def.x, y: this.def.y, w: this.def.w, h: this.def.h ?? 30, owner: this }; }
  solids() { return [this.rect()]; }
  draw(ctx) {
    const r = this.rect();
    drawPlatform(ctx, r);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, 12); ctx.clip();
    ctx.fillStyle = COLORS.magenta;
    const off = ((this.phase % 40) + 40) % 40;
    for (let sx = r.x - 40 + off; sx < r.x + r.w + 40; sx += 40) {
      ctx.beginPath(); ctx.moveTo(sx, 12 + r.y); ctx.lineTo(sx + 10 * this.def.dir, r.y + 6); ctx.lineTo(sx, r.y); ctx.lineTo(sx + 6 * this.def.dir, r.y); ctx.lineTo(sx + 16 * this.def.dir, r.y + 6); ctx.lineTo(sx + 6 * this.def.dir, r.y + 12); ctx.fill();
    }
    ctx.restore();
  }
}

/* Rolling battery — a big AA cell that rolls along the floor and bounces off walls. */
class Battery {
  constructor(x, y, dir, speed) { this.x = x; this.y = y; this.w = 56; this.h = 56; this.vx = dir * speed; this.vy = 0; this.rot = 0; this.life = 14; this.dead = false; }
  update(dt, g) {
    this.life -= dt;
    this.vy += GRAVITY * dt;
    const res = g.moveBody(this, dt);
    if (res.hitWall) this.vx = -this.vx;
    this.rot += this.vx * dt / 28;
    if (this.y > 1200 || this.life <= 0) this.dead = true;
  }
  rect() { return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 }; }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + 28, this.y + 28);
    ctx.rotate(this.rot);
    ctx.shadowColor = COLORS.red; ctx.shadowBlur = 14;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffb800';
    ctx.beginPath(); ctx.arc(0, 0, 27, -0.9, 0.9); ctx.lineTo(0, 0); ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(-7, -2, 14, 4); ctx.fillRect(-2, -7, 4, 14);
    ctx.restore();
  }
}

class BatterySpawner extends Trap {
  reset() { super.reset(); this.fired = false; this.timer = this.def.every ? 1.2 : 0; }
  update(dt, g) {
    const d = this.def;
    if (!this.armed) return;
    if (d.every) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (g.batteries.length < (d.max ?? 4)) g.batteries.push(new Battery(d.x, d.y, d.dir, d.speed ?? 350));
        this.timer = d.every;
      }
    } else if (!this.fired && (!d.trigger || inTrigger(g.player, d.trigger))) {
      this.fired = true;
      g.batteries.push(new Battery(d.x, d.y, d.dir, d.speed ?? 350));
      g.sfxWarn();
    }
  }
  draw(ctx) {
    if (!this.def.every) return;
    /* battery dispenser hatch */
    const { x, y } = this.def;
    ctx.fillStyle = COLORS.metalDark; ctx.fillRect(x - 10, y - 20, 80, 90);
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 4; ctx.strokeRect(x - 10, y - 20, 80, 90);
    ctx.fillStyle = COLORS.red; ctx.font = '22px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('AA', x + 30, y + 30);
  }
}

/* Zap zone: periodically energized area (tesla coil / laser / power surge). */
class ZapZone extends Trap {
  reset() { super.reset(); this.t = this.def.phase ?? 0; this.active = false; this.warn = false; }
  update(dt, g) {
    const on = this.def.on ?? 0.8, off = this.def.off ?? 1.4, cycle = on + off;
    this.t += dt;
    if (this.def.dud) { this.active = false; this.warn = (this.t % 2) < 0.3; return; }      // blinks like it is about to fire; never does
    const k = ((this.t % cycle) + cycle) % cycle;
    const wasActive = this.active;
    this.active = k < on;
    this.warn = !this.active && k > cycle - 0.3;
    if (this.active && !wasActive && Math.abs((g.player.x + g.player.w / 2) - (this.def.x + this.def.w / 2)) < 500) g.sfxZapLoop();
  }
  rect() { return { x: this.def.x, y: this.def.y, w: this.def.w, h: this.def.h }; }
  hazards() { return this.active ? [this.rect()] : []; }
  draw(ctx) {
    const r = this.rect();
    const vertical = r.h > r.w;
    /* emitter blocks */
    ctx.fillStyle = COLORS.metalDark;
    if (vertical) { ctx.fillRect(r.x - 8, r.y - 4, r.w + 16, 22); ctx.fillRect(r.x - 8, r.y + r.h - 18, r.w + 16, 22); }
    else { ctx.fillRect(r.x - 4, r.y - 8, 22, r.h + 16); ctx.fillRect(r.x + r.w - 18, r.y - 8, 22, r.h + 16); }
    ctx.fillStyle = this.active ? COLORS.yellow : (this.warn ? COLORS.red : '#4b64a3');
    if (vertical) { ctx.fillRect(r.x, r.y + 2, r.w, 8); ctx.fillRect(r.x, r.y + r.h - 10, r.w, 8); }
    else { ctx.fillRect(r.x + 2, r.y, 8, r.h); ctx.fillRect(r.x + r.w - 10, r.y, 8, r.h); }
    if (this.active) {
      ctx.fillStyle = 'rgba(255,214,10,.12)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      const n = 2 + Math.floor((vertical ? r.w : r.h) / 60);
      for (let i = 0; i < n; i++) {
        if (vertical) { const bx = r.x + rand(6, r.w - 6); drawBolt(ctx, bx, r.y, bx + rand(-10, 10), r.y + r.h, i % 2 ? COLORS.cyan : COLORS.yellow, 3, 12); }
        else { const by = r.y + rand(6, r.h - 6); drawBolt(ctx, r.x, by, r.x + r.w, by + rand(-10, 10), i % 2 ? COLORS.cyan : COLORS.yellow, 3, 12); }
      }
    } else if (this.warn) {
      ctx.strokeStyle = 'rgba(255,61,90,.5)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
      ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([]);
    }
  }
}

/* Invisible until the player walks in; then it crackles for a moment and starts cycling. */
class SurpriseZap extends Trap {
  reset() { super.reset(); this.triggered = false; this.t = 0; this.active = false; this.warn = false; }
  update(dt, g) {
    if (!this.triggered) {
      if (this.armed && inTrigger(g.player, this.def.trigger)) { this.triggered = true; this.t = 0; g.sfxWarn(); }
      return;
    }
    this.t += dt;
    const warnT = this.def.warn ?? 0.3, on = this.def.on ?? 0.7, off = this.def.off ?? 1.3;
    if (this.def.dud) { this.warn = this.t < warnT + 0.4; this.active = false; return; }    // crackles, then fizzles out
    if (this.t < warnT) { this.warn = true; this.active = false; return; }
    if (this.def.repeat === false) { this.active = this.t < warnT + on; this.warn = false; return; }
    const cycle = on + off;
    const k = (this.t - warnT) % cycle;
    const was = this.active;
    this.active = k < on;
    this.warn = !this.active && k > cycle - 0.25;
    if (this.active && !was) g.sfxZapLoop();
  }
  rect() { return { x: this.def.x, y: this.def.y, w: this.def.w, h: this.def.h }; }
  hazards() { return this.active ? [this.rect()] : []; }
  draw(ctx) {
    if (!this.triggered) return;
    const r = this.rect();
    if (this.active) {
      ctx.fillStyle = 'rgba(255,47,160,.12)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      for (let i = 0; i < 3; i++) { const bx = r.x + rand(4, r.w - 4); drawBolt(ctx, bx, r.y, bx + rand(-16, 16), r.y + r.h, i % 2 ? COLORS.magenta : COLORS.yellow, 4, 16); }
    } else if (this.warn) {
      for (let i = 0; i < 2; i++) { const bx = r.x + rand(4, r.w - 4); drawBolt(ctx, bx, r.y + rand(0, r.h), bx + rand(-20, 20), r.y + rand(0, r.h), 'rgba(255,47,160,.6)', 2, 10); }
    }
  }
}

/* Spikes that are only decoration. Trust nobody. */
class FakeSpikes extends Trap {
  draw(ctx) { drawSpikes(ctx, { x: this.def.x, y: this.def.y, w: this.def.w, h: 30 }, '#c7d3f2', '#ffffff'); }
}

/* Solid but invisible platform; revealed once you touch it. Stays revealed after death. */
class HiddenPlatform extends Trap {
  constructor(def) { super(def); this.revealed = false; this.glow = 0; }
  reset() { super.reset(); }
  onTouch(g) { if (!this.revealed) { this.revealed = true; this.glow = 1; g.sparks(this.def.x + this.def.w / 2, this.def.y + 10, 16, COLORS.cyan); g.sfxSwitch(); } }
  update(dt) { if (this.glow > 0) this.glow -= dt; }
  rect() { return { x: this.def.x, y: this.def.y, w: this.def.w, h: this.def.h ?? 30, owner: this, hidden: true }; }
  solids() { return [this.rect()]; }
  draw(ctx) {
    if (!this.revealed) return;
    ctx.save();
    if (this.glow > 0) { ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 30 * this.glow; }
    drawPlatform(ctx, this.rect(), 'metal');
    ctx.restore();
  }
}

/* Floor switch: opens gates / arms traps with the same id. */
class Switch extends Trap {
  reset() { super.reset(); this.pressed = false; }
  rect() { return { x: this.def.x, y: this.def.y - 22, w: 80, h: 22 }; }
  update(dt, g) {
    if (!this.pressed && rectsOverlap(g.player, this.rect())) {
      this.pressed = true; g.sfxSwitch();
      g.sparks(this.def.x + 40, this.def.y - 20, 18, COLORS.green);
      g.fxRing(this.def.x + 40, this.def.y - 18, { color: COLORS.green, r0: 6, r1: 110, life: 0.4, width: 6 });
      g.activate(this.def.id, { x: this.def.x + 40, y: this.def.y - 26 });
    }
  }
  draw(ctx) {
    const { x, y } = this.def;
    ctx.fillStyle = COLORS.metalDark; ctx.fillRect(x - 6, y - 12, 92, 12);
    ctx.fillStyle = this.pressed ? COLORS.green : COLORS.red;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = this.pressed ? 18 : 12 + Math.sin(Date.now() / 140) * 8;    // an unpressed breaker begs to be hit
    ctx.fillRect(x + 6, this.pressed ? y - 16 : y - 30, 68, this.pressed ? 6 : 20);
    ctx.shadowBlur = 0;
    if (!this.pressed) {                                   // arrow bouncing on top of it
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 220);
      ctx.fillStyle = COLORS.yellow;
      const ay = y - 62 + Math.sin(Date.now() / 260) * 5;
      ctx.beginPath(); ctx.moveTo(x + 40, ay + 16); ctx.lineTo(x + 26, ay); ctx.lineTo(x + 54, ay); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = COLORS.text; ctx.font = '20px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((this.pressed ? '✓ ' : '') + (this.pressed ? 'ON' : (this.def.label || 'PUSH')), x + 40, y - 36);
  }
}

/* Gate: solid until its switch is pressed, then slides up. */
class Gate extends Trap {
  reset() { super.reset(); this.open = false; this.lift = 0; }
  activate() { this.open = true; }
  update(dt) { if (this.open && this.lift < 1) this.lift = Math.min(1, this.lift + dt * 1.6); }
  rect() { const h = this.def.h * (1 - this.lift); return { x: this.def.x, y: this.def.y, w: this.def.w, h: Math.max(0, h), owner: this }; }
  solids() { return this.lift >= 1 ? [] : [this.rect()]; }
  draw(ctx) {
    const r = this.rect();
    /* frame */
    ctx.fillStyle = COLORS.metalDark; ctx.fillRect(r.x - 10, this.def.y - 30, this.def.w + 20, 30);
    if (r.h <= 0) return;
    ctx.fillStyle = '#3a1020'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 4; ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.fillStyle = COLORS.red;
    for (let yy = r.y + 20; yy < r.y + r.h - 10; yy += 34) ctx.fillRect(r.x + 10, yy, r.w - 20, 6);
    if (r.h > 120) {                                    // readable without relying on the colour
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = COLORS.text; ctx.font = '26px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('LOCKED', 0, 9); ctx.restore();
    }
  }
}

/* Force field from the ceiling to the floor: a wall you cannot jump, duck or sneak past. Only the remote
   breaker — a switch with the same id, placed far away — shuts it down. Bumping into it shoves you back. */
class Barrier extends Trap {
  reset() { super.reset(); this.on = true; this.fade = 1; this.cool = 0; this.shove = 0; this.dir = 0; this.hinted = false; }
  activate() { this.on = false; }
  rect() { return { x: this.def.x, y: this.def.y, w: this.def.w, h: this.def.h, owner: this }; }
  solids() { return this.on ? [this.rect()] : []; }
  update(dt, g) {
    const p = g.player, r = this.rect();
    this.cool = Math.max(0, this.cool - dt);
    if (!this.on) {
      if (this.fade > 0) {
        if (this.fade === 1) {
          g.sfxSwitch(); g.shake(0.25, 8);
          g.fxRing(r.x + r.w / 2, r.y + r.h / 2, { color: COLORS.cyan, r0: 20, r1: 260, life: 0.5, width: 8 });
          for (let k = 0; k < 8; k++) g.fxArc(r.x + rand(0, r.w), r.y + (k / 8) * r.h, r.x + rand(-40, r.w + 40), r.y + ((k + 1) / 8) * r.h, COLORS.cyan, 0.2, { delay: k * 0.02, width: 3, jag: 20 });
        }
        this.fade = Math.max(0, this.fade - dt * 1.4);
        if (Math.random() < 0.5) g.sparks(r.x + r.w / 2, rand(r.y, r.y + r.h), 2, COLORS.cyan);
      }
      return;
    }
    if (this.shove > 0) { this.shove -= dt; p.push += this.dir * 620 * Math.max(0, this.shove / 0.22); }
    const near = { x: p.x - 8, y: p.y, w: p.w + 16, h: p.h };
    if (this.cool <= 0 && rectsOverlap(near, r)) {
      this.cool = 0.6; this.shove = 0.22;
      this.dir = p.x + p.w / 2 < r.x + r.w / 2 ? -1 : 1;
      if (p.onGround) { p.vy = -300; p.onGround = false; }
      g.sparks(r.x + r.w / 2, p.y + p.h / 2, 18, COLORS.cyan);
      g.fxRing(r.x + r.w / 2, p.y + p.h / 2, { color: COLORS.cyan, r0: 6, r1: 120, life: 0.32, width: 6, squash: 1.6 });
      g.fxPop(p.x + p.w / 2, p.y - 40, 'NOPE!', COLORS.cyan, { size: 40, life: 0.7 });
      g.sfxNope(); g.shake(0.15, 7);
      if (!this.hinted) { this.hinted = true; g.hint('barrier'); }   // Busby comments once per attempt
    }
  }
  draw(ctx, g) {
    const r = this.rect(), cx = r.x + r.w / 2, t = g.time;
    /* emitters top and bottom */
    ctx.fillStyle = COLORS.metalDark; ctx.fillRect(r.x - 22, r.y, r.w + 44, 26); ctx.fillRect(r.x - 22, r.y + r.h - 26, r.w + 44, 26);
    ctx.fillStyle = this.on ? COLORS.red : COLORS.green;
    ctx.fillRect(r.x - 14, r.y + 8, 10, 10); ctx.fillRect(r.x + r.w + 4, r.y + 8, 10, 10);
    ctx.fillRect(r.x - 14, r.y + r.h - 18, 10, 10); ctx.fillRect(r.x + r.w + 4, r.y + r.h - 18, 10, 10);
    const a = this.on ? 1 : this.fade;
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      const grad = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
      grad.addColorStop(0, 'rgba(41,224,255,0)'); grad.addColorStop(0.5, 'rgba(41,224,255,0.28)'); grad.addColorStop(1, 'rgba(41,224,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(r.x - 10, r.y, r.w + 20, r.h);
      /* crackling vertical arcs */
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 3; ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 16;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const ph = t * (7 + k * 2.3) + k * 1.7;
        for (let y = r.y + 26; y <= r.y + r.h - 26; y += 22) {
          const x = cx + Math.sin(y * 0.05 + ph) * (r.w * 0.35) + (Math.random() - 0.5) * 6;
          if (y === r.y + 26) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      /* label */
      ctx.save();
      ctx.translate(cx, r.y + r.h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = COLORS.text; ctx.font = '30px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
      ctx.fillText(this.on ? 'LOCKED · BREAKER ELSEWHERE' : 'OPEN', 0, 10);
      ctx.restore();
    }
  }
}

/* Heavy block that drops from above when you walk near — then becomes a step. */
class Crusher extends Trap {
  reset() { super.reset(); this.state = 'hang'; this.y = this.def.y; this.shake = 0; }
  update(dt, g) {
    if (this.state === 'hang' && this.armed && inTrigger(g.player, this.def.trigger)) { this.state = 'warn'; this.shake = this.def.dud ? 0.6 : (this.def.warn ?? 0.3); g.sfxWarn(); }
    if (this.state === 'warn') { this.shake -= dt; if (this.shake <= 0) this.state = this.def.dud ? 'hang' : 'fall'; if (this.state === 'hang') this.armed = false; }
    if (this.state === 'fall') {
      this.y += (this.def.speed ?? 1500) * dt;
      const r = this.rect();
      for (const s of g.solids) {
        if (s.owner === this) continue;
        if (rectsOverlap(r, s) && s.y >= r.y + r.h - 40) {
          this.y = s.y - this.def.h; this.state = 'landed';
          const iy = this.y + this.def.h;
          g.sparks(r.x + r.w / 2, iy, 26, COLORS.yellow);
          g.fxRing(r.x + r.w / 2, iy, { color: 'rgba(220,235,255,1)', r0: 10, r1: 170, life: 0.34, width: 8, squash: 0.28 });
          g.fxDebris(r.x + r.w / 2, iy, 10, [COLORS.metalEdge, '#8fa3d8', COLORS.yellow]);
          for (let k = 0; k < 5; k++) g.fxSmoke(r.x + rand(0, r.w), iy - 6, { vx: rand(-260, 260), vy: rand(-60, -10), r1: rand(40, 70), life: 0.6, alpha: 0.28 });
          g.sfxTrap(); g.shake(0.35, 15);
          break;
        }
      }
    }
  }
  rect() { return { x: this.def.x, y: this.y, w: this.def.w, h: this.def.h, owner: this }; }
  solids() { return this.state === 'fall' ? [] : [this.rect()]; }
  hazards() { return this.state === 'fall' ? [{ x: this.def.x + 4, y: this.y + this.def.h - 20, w: this.def.w - 8, h: 24 }] : []; }
  draw(ctx) {
    const r = this.rect();
    ctx.save();
    if (this.state === 'warn') ctx.translate(rand(-4, 4), rand(-3, 3));
    if (this.state !== 'landed') { ctx.strokeStyle = '#8b9bc4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, 0); ctx.lineTo(r.x + r.w / 2, r.y); ctx.stroke(); }
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COLORS.yellow; ctx.lineWidth = 6; ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    ctx.fillStyle = COLORS.yellow;
    for (let sx = r.x + 10; sx < r.x + r.w - 20; sx += 30) { ctx.beginPath(); ctx.moveTo(sx, r.y + r.h - 8); ctx.lineTo(sx + 14, r.y + 8); ctx.lineTo(sx + 22, r.y + 8); ctx.lineTo(sx + 8, r.y + r.h - 8); ctx.fill(); }
    ctx.fillStyle = '#111'; ctx.font = '26px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.state === 'landed' ? 'STEP' : '⚠', r.x + r.w / 2, r.y + r.h / 2 + 9);
    ctx.restore();
  }
}

/* Static electricity cloud: swaps LEFT and RIGHT while inside. */
class StaticZone extends Trap {
  reset() { super.reset(); this.inside = false; }
  update(dt, g) {
    /* hysteresis: the reversal switches on only once the player is well inside the cloud and switches
       off only once they are well outside it — otherwise the controls flip every frame at the edge
       and the player can never push through */
    const p = g.player, z = this.def;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const M = 70;
    const was = this.inside;
    if (!this.inside) {
      if (cx > z.x + M && cx < z.x + z.w - M && cy > z.y && cy < z.y + z.h) this.inside = true;
    } else {
      if (cx < z.x - M || cx > z.x + z.w + M || cy < z.y - M || cy > z.y + z.h + M) this.inside = false;
    }
    if (this.inside) p.reversed = true;
    if (this.inside && !was) g.sfxZapLoop();
  }
  draw(ctx, g) {
    const r = this.def;
    ctx.fillStyle = 'rgba(180, 80, 255, .12)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(200,120,255,.35)'; ctx.lineWidth = 3; ctx.setLineDash([16, 12]);
    ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([]);
    if (Math.random() < 0.3) drawBolt(ctx, r.x + rand(0, r.w), r.y + rand(0, r.h), r.x + rand(0, r.w), r.y + rand(0, r.h), 'rgba(220,150,255,.7)', 2, 14);
    ctx.fillStyle = 'rgba(220,150,255,.9)'; ctx.font = '40px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('⚡ STATIC ⚡', r.x + r.w / 2, r.y + 60 + Math.sin(g.time * 3) * 6);
    ctx.font = '26px Bangers, Impact, sans-serif';
    ctx.fillText('CONTROLS REVERSED', r.x + r.w / 2, r.y + 96);
  }
}

/* Electromagnet: drags the player sideways while inside its field. */
class Magnet extends Trap {
  reset() { super.reset(); this.t = 0; this.active = !this.def.pulse; }
  update(dt, g) {
    this.t += dt;
    if (this.def.pulse) { const c = this.def.pulse.on + this.def.pulse.off; this.active = (this.t % c) < this.def.pulse.on; }
    if (this.def.triggerX !== undefined && !this.triggered) {
      const dir = this.def.triggerDir ?? 1;      // mirrored levels trigger when passing the other way
      if ((g.player.x + g.player.w / 2 - this.def.triggerX) * dir > 0) { this.triggered = true; g.sfxWarn(); } else return;
    }
    if (this.active && rectsOverlap(g.player, this.def.zone)) g.player.push += this.def.pull;
  }
  draw(ctx) {
    const { x, y } = this.def, z = this.def.zone;
    const on = this.active && (this.def.triggerX === undefined || this.triggered);
    if (on) {
      ctx.strokeStyle = 'rgba(255,47,160,.35)'; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const yy = z.y + z.h * (0.2 + i * 0.15);
        ctx.beginPath(); ctx.moveTo(z.x, yy); ctx.quadraticCurveTo((z.x + x) / 2, yy - 60 + i * 20, x, y + 30); ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = on ? COLORS.red : '#7a2a3a'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(0, 30, 34, Math.PI * 0.5, Math.PI * 1.5, false); ctx.stroke();
    ctx.strokeStyle = '#d0d8ee';
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(16, -4); ctx.moveTo(0, 64); ctx.lineTo(16, 64); ctx.stroke();
    ctx.fillStyle = COLORS.text; ctx.font = '22px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(on ? 'N' : '-', 8, 4);
    ctx.restore();
  }
}

/* A section of floor that collapses after being armed by a switch. */
class FloorDrop extends Trap {
  reset() { super.reset(); this.timer = -1; this.y = this.def.y; this.gone = false; }
  activate() { if (this.timer < 0) this.timer = this.def.delay ?? 1.0; }
  update(dt, g) {
    if (this.timer > 0) { this.timer -= dt; if (this.timer <= 0) { this.timer = 0; g.sfxTrap(); } }
    if (this.timer === 0 && !this.gone) { this.y += 900 * dt; if (this.y > 1200) this.gone = true; }
  }
  rect() { return { x: this.def.x, y: this.y, w: this.def.w, h: this.def.h, owner: this }; }
  solids() { return this.gone ? [] : [this.rect()]; }
  draw(ctx) {
    if (this.gone) return;
    ctx.save();
    if (this.timer > 0) ctx.translate(rand(-3, 3), 0);
    drawPlatform(ctx, this.rect(), 'ground');
    ctx.restore();
  }
}

/* Floor that looks perfectly normal until spikes shoot up out of it. Random delay: sometimes it catches
   a runner, sometimes only the one who stops to think. Retracts and re-arms. */
class PopSpikes extends Trap {
  reset() { super.reset(); this.state = 'idle'; this.t = 0; this.stand = 0; }
  update(dt, g) {
    const p = g.player, d = this.def;
    const over = p.x + p.w > d.x && p.x < d.x + d.w && p.onGround && Math.abs(p.y + p.h - d.y - 30) < 4;
    if (this.state === 'idle') {
      if (over && this.armed) { this.stand += dt; if (this.stand >= (d.delay ?? 0.3)) { this.state = 'warn'; this.t = 0; g.sfxWarn(); } }
      else this.stand = Math.max(0, this.stand - dt * 2);
    } else if (this.state === 'warn') {
      this.t += dt; if (this.t >= 0.16) {
        this.state = 'up'; this.t = 0; g.sfxTrap();
        g.sparks(d.x + d.w / 2, d.y, 14, COLORS.red);
        g.fxRing(d.x + d.w / 2, d.y + d.h, { color: 'rgba(255,120,140,1)', r0: 8, r1: 90, life: 0.3, width: 5, squash: 0.3 });
        g.shake(0.12, 4);
      }
    } else if (this.state === 'up') {
      this.t += dt; if (this.t >= (d.on ?? 1.0)) { this.state = 'down'; this.t = 0; }
    } else if (this.state === 'down') {
      this.t += dt; if (this.t >= (d.off ?? 2.0)) { this.state = 'idle'; this.stand = 0; }
    }
  }
  hazards() { return this.state === 'up' ? [{ x: this.def.x + 4, y: this.def.y + 2, w: this.def.w - 8, h: 28 }] : []; }
  draw(ctx) {
    const d = this.def;
    if (this.state === 'up') { drawSpikes(ctx, { x: d.x, y: d.y, w: d.w, h: 30 }, '#ff5a6e', '#fff'); return; }
    /* flush with the floor: a row of faint slits, glowing red for the split second before they fire */
    const warn = this.state === 'warn';
    ctx.fillStyle = warn ? COLORS.red : 'rgba(0,0,0,.35)';
    if (warn) { ctx.shadowColor = COLORS.red; ctx.shadowBlur = 12; }
    const nn = Math.max(1, Math.floor(d.w / 28)), sw = d.w / nn;
    for (let i = 0; i < nn; i++) ctx.fillRect(d.x + i * sw + sw / 2 - 2, d.y + 24, 4, 6);
    ctx.shadowBlur = 0;
  }
}

/* A platform that shudders and lurches sideways once you have stood on it — WITHOUT taking you along. */
class Shifter extends Trap {
  reset() { super.reset(); this.x = this.def.x; this.state = 'idle'; this.stand = 0; this.t = 0; }
  update(dt, g) {
    const d = this.def;
    if (this.state === 'idle') {
      if (g.player.standingOn === this && this.armed) { this.stand += dt; if (this.stand >= (d.delay ?? 0.6)) { this.state = 'warn'; this.t = 0; g.sfxWarn(); } }
    } else if (this.state === 'warn') {
      this.t += dt; if (this.t >= 0.25) { this.state = 'move'; this.t = 0; g.sfxTrap(); g.shake(0.2); }
    } else if (this.state === 'move') {
      this.t += dt;
      const k = Math.min(1, this.t / 0.3);
      this.x = d.x + d.dir * d.dist * (1 - Math.pow(1 - k, 3));       // fast ease-out lurch
      if (k >= 1) this.state = 'done';
    }
  }
  /* no dx/dy on the owner → the engine does not carry the player: the floor slips away under them */
  rect() { return { x: this.x, y: this.def.y, w: this.def.w, h: this.def.h ?? 30, owner: this }; }
  solids() { return [this.rect()]; }
  draw(ctx) {
    ctx.save();
    if (this.state === 'warn') ctx.translate(rand(-4, 4), rand(-2, 2));
    drawPlatform(ctx, this.rect(), 'metal');
    ctx.restore();
  }
}

/* Signpost with a (possibly dishonest) hint. */
class Sign extends Trap {
  draw(ctx, g) { drawSignPost(ctx, this.def.x, this.def.y, g.fog ? '? ? ? ? ?' : this.def.text); }
}

const TRAP_TYPES = {
  bulb: FallingBulb, vanish: VanishPlatform, fakeExit: FakeExit, spring: Spring, mover: MovingPlatform,
  conveyor: Conveyor, battery: BatterySpawner, zap: ZapZone, surprise: SurpriseZap, fakeSpikes: FakeSpikes,
  hidden: HiddenPlatform, switch: Switch, gate: Gate, crusher: Crusher, static: StaticZone, magnet: Magnet,
  floorDrop: FloorDrop, sign: Sign, popSpikes: PopSpikes, shifter: Shifter, barrier: Barrier
};

function createTrap(def) {
  const T = TRAP_TYPES[def.type];
  if (!T) { console.warn('Unknown trap type', def.type); return new Trap(def); }
  return new T(def);
}
