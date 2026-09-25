/* ⚡ ELECTRICAL TROLL — game engine (canvas, fixed-step physics, touch + keyboard input) */
'use strict';

const WORLD_W = 1920, WORLD_H = 1080;
const WORLD_OFFSET = 180;      // world is drawn this many px higher so the touch controls never cover gameplay
const PLAYER_W = 44, PLAYER_H = 60;
const MOVE_SPEED = 440, JUMP_SPEED = 1000, MAX_FALL = 1800;
const COYOTE = 0.1, JUMP_BUFFER = 0.14;
const STEP = 1 / 120;

class Game {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    /* Render quality. The stage is laid out in big design pixels (1920 wide, up to ~4000 tall on an
       upright phone) but a phone only shows a fraction of that — so the canvas is drawn at the
       screen's real resolution (q ≤ 1) and scaled up. qMul / lowFx are lowered automatically if the
       device still can't keep up (see governPerf). */
    this.q = 1; this.qMul = 1; this.lowFx = false; this.screenScale = 1;
    this.perf = { ema: 16, slowFor: 0, level: 0 };
    const blurDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
    const game = this;
    /* glow blur is measured in canvas pixels, not design pixels: scale it with q, drop it entirely in low-FX mode */
    if (blurDesc && blurDesc.set) Object.defineProperty(this.ctx, 'shadowBlur', {
      configurable: true,
      get() { return blurDesc.get.call(this); },
      set(v) { blurDesc.set.call(this, game.lowFx ? 0 : v * game.q); }
    });
    this.cb = callbacks;             // { onDeath(msg), onComplete(info), onTick(timer) }
    this.input = { left: false, right: false, jump: false };
    this.jumpWasHeld = false;
    this.state = 'idle';             // idle | play | dead | complete | paused
    this.levelIndex = 0;
    this.time = 0;
    this.timer = 0;
    this.sessionScore = 0;
    this.levelDeaths = 0;
    this.particles = [];
    this.batteries = [];
    this.traps = [];
    this.solids = [];
    this.shakeT = 0; this.shakeMag = 0; this.hitStop = 0;
    this.flashT = 0; this.flashLife = 0.25; this.flashMax = 0; this.flashColor = '#fff';
    this.dangerT = 0;                 // red pulse right after a death
    this.motes = []; this.pulses = []; this.tracePaths = []; this.vig = null; this.amb = null;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.viewW = WORLD_W; this.viewH = WORLD_H; this.ox = 0; this.oy = 0;   // stage size / world offset (set by resize)
    this.portrait = false; this.panelH = WORLD_OFFSET; this.shift = WORLD_OFFSET;   // control deck / how far the world rides up
    this.bg = this.buildBackground();
    /* company cover photo behind the level (dimmed so the level stays readable), rebuilt once loaded */
    this.coverImg = new Image();
    this.coverImg.onload = () => { this.bg = this.buildBackground(); };
    this.coverImg.src = 'images/cover.jpg';
    this.player = this.makePlayer(0, 0);
    this.loop = this.loop.bind(this);
    /* the mascot is the playable character; until the sprites are ready the vector fallback draws */
    this.sprites = null;
    if (typeof buildMascotSprites === 'function') buildMascotSprites(s => { this.sprites = s; });
  }

  /* The stage can be wider (or taller) than 16:9 to fill the screen; the 1920x1080 world sits inside it.
     Landscape: the world is centred and rides up so the buttons overlay the bottom strip.
     Portrait: the screen splits — world in the upper part, a deep deck of touch controls underneath. */
  resize(w, h, screenScale = this.screenScale) {
    w = Math.round(w); h = Math.round(h);
    this.screenScale = screenScale;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const q = Math.max(0.3, Math.min(1, screenScale * dpr * this.qMul));
    const cw = Math.round(w * q), ch = Math.round(h * q);
    if (w === this.viewW && h === this.viewH && this.canvas.width === cw && this.canvas.height === ch) return;
    this.viewW = w; this.viewH = h; this.q = q;
    this.canvas.width = cw; this.canvas.height = ch;
    this.portrait = h > w * 1.1;
    this.panelH = this.portrait ? Math.round(Math.max(420, Math.min(h * 0.30, 1100))) : WORLD_OFFSET;
    this.shift = this.portrait ? 0 : WORLD_OFFSET;
    this.ox = Math.round((w - WORLD_W) / 2);
    const hud = this.portrait ? 240 : 0;                                   // the HUD keeps the very top for itself
    this.oy = this.portrait
      ? Math.round(hud + Math.max(0, (h - this.panelH - hud - WORLD_H) / 2))
      : Math.round((h - WORLD_H) / 2);
    this.bg = this.buildBackground();
    this.fxBuildAmbience();
    this.darkLayer = null;
    if (!this.running) this.draw();
  }

  /* ---------- setup ---------- */
  makePlayer(x, y) {
    return {
      x, y, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuffer: 0,
      facing: 1, standingOn: null, push: 0, reversed: false, dead: false, deadTimer: 0,
      anim: 0, squash: 0, landedAt: 0
    };
  }

  /* opts: { variant, mirror, mod } — all optional (classic mode passes a random variant only) */
  loadLevel(n, opts = {}) {
    this.levelIndex = n;
    this.levelOpts = opts;
    const def = resolveLevel(n, opts.variant || 0, !!opts.mirror, opts.salt ?? null, !!opts.lockdown);
    this.mod = opts.mod || MODIFIERS[0];
    this.applyModifier(this.mod, def);
    this.level = {
      def, name: def.name, tier: def.tier, mirrored: def.mirrored,
      platforms: def.platforms.map(p => ({ ...p })),
      hazards: def.hazards.map(h => ({ ...h })),
      exit: { ...def.exit },
      exitHidden: !!def.exit.hidden,
      exitMoved: false,
      exitPuff: 0
    };
    this.traps = def.traps.map(createTrap);
    this.timer = 0;
    this.levelDeaths = 0;
    this.time = 0;
    this.exitAnim = null;
    this.fadeIn = 0.45;                 // new level fades up from black
    this.spawnPlayer();
    this.state = 'play';
    this.cb.onTick(this.timer, true);
  }

  /* Modifiers tweak the player's physics or the level itself for one level. */
  applyModifier(mod, def) {
    this.gravMul = 1; this.jumpMul = 1; this.speedMul = 1;
    this.forceReverse = false; this.blackout = false; this.fog = false;
    switch (mod.id) {
      case 'lowgrav': this.gravMul = 0.6; this.jumpMul = 0.85; break;
      case 'heavy': this.gravMul = 1.25; this.jumpMul = 1.12; break;
      case 'turbo': this.speedMul = 1.35; break;
      case 'static': this.forceReverse = true; break;
      case 'blackout': this.blackout = true; break;
      case 'fog': this.fog = true; break;
      case 'rush': {
        /* a battery dispenser at the exit side, rolling toward the spawn */
        const dir = def.spawn.x < def.exit.x ? -1 : 1;
        def.traps.push({ type: 'battery', x: def.exit.x + 7, y: def.exit.y + 44, dir, speed: 300, every: 4, max: 3 });
        break;
      }
    }
  }

  /* When the exit runs away, drop a fresh random trap somewhere on the way to its new spot.
     Rolled at runtime (not from the level seed) so even a replay of the same deck differs. */
  spawnAmbush(fromX, toX) {
    const dir = toX > fromX ? 1 : -1;
    const lo = Math.min(fromX, toX) + 260, hi = Math.max(fromX, toX) - 220;
    const grounds = this.level.platforms.filter(g => g.kind === 'ground');
    let def = null;
    for (let tries = 0; tries < 12 && hi > lo; tries++) {
      const x = lo + Math.random() * (hi - lo);
      const g = grounds.find(r => x > r.x + 80 && x < r.x + r.w - 80);
      if (!g) continue;
      const crowded = this.traps.some(t => ['bulb', 'surprise', 'crusher', 'zap', 'switch', 'gate'].includes(t.def.type) && Math.abs((t.def.x + (t.def.w || 0) / 2) - x) < 320);
      if (crowded) continue;                              // keep breathing room from whatever is already there
      const open = !this.level.platforms.some(p => p.kind !== 'ground' && x + 90 > p.x && x - 90 < p.x + p.w);
      const r = open ? Math.random() : 0;               // under a platform only a bulb makes sense
      const before = (a, b) => (dir > 0 ? [x - b, x - a] : [x + a, x + b]);   // trigger zone on the player's side of the trap
      if (r < 0.35) def = { type: 'bulb', x, y: 560, trigger: before(40, 160) };
      else if (r < 0.7) def = { type: 'surprise', x: x - 30, y: 700, w: 60, h: 200, trigger: dir > 0 ? [x - 130, x + 40] : [x - 40, x + 130], warn: 0.3, on: 0.7, off: 1.3 };
      else def = { type: 'crusher', x: x - 60, y: 260, w: 120, h: 120, trigger: before(100, 160), speed: 1500, warn: 0 };
      break;
    }
    /* no room on the ground? a battery comes rolling from the exit's side instead */
    if (!def) def = { type: 'battery', x: dir > 0 ? 1900 : -60, y: 840, dir: -dir, speed: 420 + Math.random() * 120, trigger: [0, WORLD_W] };
    def.ephemeral = true;                                     // re-rolled next time; gone after a retry
    const t = createTrap(def); t.reset(); this.traps.push(t);
    Sfx.warn();
  }

  /* ---------- turn mode ---------- */
  startTurn(lives, seed) {
    this.turn = { active: true, lives, maxLives: lives, score: 0, levels: 0, deaths: 0, seed,
      highestLevel: 0, deck: buildTurnDeck(seed), index: -1 };
    this.sessionScore = 0;
  }
  endTurn() { if (this.turn) this.turn.active = false; }
  /* Loads the next level of the turn deck (wraps around if a player somehow clears the whole deck). */
  nextTurnLevel() {
    const t = this.turn;
    t.index = (t.index + 1) % t.deck.length;
    const entry = t.deck[t.index];
    this.loadLevel(entry.level, entry);
    return entry;
  }

  levelScore() {
    const tier = this.level.tier || 1;
    const base = TIER_POINTS[tier] + Math.max(0, 60 - Math.floor(this.timer)) * 10 - this.levelDeaths * 50;
    return Math.round(Math.max(100, base) * (this.mod ? this.mod.mult : 1) / 10) * 10;
  }

  spawnPlayer() {
    const s = this.level.def.spawn;
    this.player = this.makePlayer(s.x, s.y);
    this.batteries = [];
    this.particles = [];
    this.shakeT = 0; this.shakeMag = 0; this.hitStop = 0; this.flashT = 0; this.dangerT = 0;
    this.level.exitHidden = !!this.level.def.exit.hidden;
    this.level.exit = { ...this.level.def.exit };
    this.level.exitMoved = false;
    this.traps = this.traps.filter(t => !t.def.ephemeral);   // idle-punisher bulbs do not survive a retry
    for (const t of this.traps) t.reset();
    this.collectSolids();
    this.fxSpawn(this.player.x + this.player.w / 2, this.player.y + this.player.h);
    this.idleT = 0;
    this.moved = false;                                   // idle punisher stays disarmed until the first input of this attempt
  }

  retry() {
    this.spawnPlayer();
    this.state = 'play';
  }

  restartLevel() { this.loadLevel(this.levelIndex, this.levelOpts); }

  pause() { if (this.state === 'play') this.state = 'paused'; }
  resume() { if (this.state === 'paused') { this.state = 'play'; this.last = performance.now(); } }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = this.lastFrame = performance.now();
    requestAnimationFrame(this.loop);
    /* watchdog: some TV browsers throttle requestAnimationFrame — keep the game alive via timer */
    /* only when frames have truly stalled — a merely slow frame must not trigger extra (costly) redraws */
    this.watchdog = setInterval(() => {
      if (this.running && performance.now() - this.lastFrame > 150) this.loop(performance.now(), true);
    }, 50);
  }
  stop() { this.running = false; clearInterval(this.watchdog); }

  /* ---------- helpers used by traps ---------- */
  /* sparks(), shake(), fxRing() and friends all live in js/fx.js */

  /* A breaker was thrown: the power surges down the line and whatever it feeds opens up. */
  activate(id, from) {
    let target = null;
    for (const t of this.traps) {
      if (t.def.id === id && typeof t.activate === 'function') {
        t.activate();
        const d = t.def;
        if (!target) target = { x: d.x + (d.w || 60) / 2, y: d.y + (d.h || 40) / 2 };
      }
      if (t.def.armedBy === id) t.arm();
    }
    if (!target) return;
    this.fxFlash(COLORS.cyan, 0.26, 0.3);
    this.shake(0.2, 6);
    if (from) this.fxSurgeLine(from, target);
    this.fxRing(target.x, target.y, { color: COLORS.cyan, r0: 10, r1: 150, life: 0.45, width: 7, delay: 0.26 });
    this.fxPop(target.x, target.y - 120, 'POWER OFF!', COLORS.cyan, { size: 44, delay: 0.3 });
    this.sparks(target.x, target.y, 16, COLORS.cyan);
  }
  hint(cause) { if (this.cb.onHint) this.cb.onHint(cause); }   // Busby speaks without anyone dying
  sfxTrap() { Sfx.trap(); }
  sfxZap() { Sfx.zapLoop(); }
  sfxWarn() { Sfx.warn(); }
  sfxNope() { Sfx.nope(); }
  sfxBounce() { Sfx.bounce(); }
  sfxSwitch() { Sfx.switch(); }
  sfxZapLoop() { Sfx.zapLoop(); }

  collectSolids() {
    const list = this.level.platforms.slice();
    for (const t of this.traps) for (const s of t.solids()) list.push(s);
    this.solids = list;
    return list;
  }

  /* Generic AABB mover used by the player and batteries. */
  moveBody(body, dt, vx = body.vx) {
    let hitWall = false;
    body.x += vx * dt;
    for (const s of this.solids) {
      if (s.w <= 0 || s.h <= 0) continue;
      if (rectsOverlap(body, s)) {
        if (vx > 0) body.x = s.x - body.w; else if (vx < 0) body.x = s.x + s.w; else continue;
        hitWall = true;
        if (s.owner && s.owner.onTouch) s.owner.onTouch(this);
      }
    }
    body.y += body.vy * dt;
    let onGround = false, standingOn = null, bounce = 0;
    for (const s of this.solids) {
      if (s.w <= 0 || s.h <= 0) continue;
      if (rectsOverlap(body, s)) {
        if (body.vy > 0) {
          body.y = s.y - body.h; onGround = true; standingOn = s.owner || s;
          if (s.bounce) bounce = s.bounce;
        } else if (body.vy < 0) {
          body.y = s.y + s.h;
        } else continue;
        body.vy = 0;
        if (s.owner && s.owner.onTouch) s.owner.onTouch(this);
      }
    }
    return { hitWall, onGround, standingOn, bounce };
  }

  /* ---------- main loop ---------- */
  loop(now, manual) {
    if (!this.running) return;
    this.lastFrame = now;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!manual) this.governPerf(dt);
    if (dt > 0.1) dt = 0.1;
    if (this.state === 'play' || this.state === 'dead' || this.state === 'complete' || this.state === 'turnover') {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 8) { this.step(STEP); this.acc -= STEP; steps++; }
    }
    this.draw();
    if (!manual) requestAnimationFrame(this.loop);
  }

  /* If the device keeps missing frames during play, trade eye candy for smoothness, one notch at a time:
     1) glow blur + background dust off, 2) and 3) lower render resolution. */
  governPerf(dt) {
    const p = this.perf;
    if (this.state !== 'play' || dt <= 0 || dt > 0.25) return;
    p.ema += (dt * 1000 - p.ema) * 0.05;
    p.slowFor = p.ema > 24 ? p.slowFor + dt : 0;          // ~40 fps or worse, for a while
    if (p.slowFor < 1.5 || p.level >= 3) return;
    p.level++; p.slowFor = 0; p.ema = 16;
    if (p.level === 1) this.lowFx = true;
    else { this.qMul *= 0.75; this.resize(this.viewW, this.viewH); }
  }

  step(dt) {
    this.time += dt;
    const p = this.player;
    this.fxUpdate(dt);
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); return; }   // freeze frame: the hit lands harder

    if (this.state === 'dead') {
      p.deadTimer += dt;
      /* out of lives: the death animation plays, then the turn is over */
      if (this.turn && this.turn.active && this.turn.lives <= 0 && p.deadTimer > 1.3) {
        this.turn.active = false;
        this.state = 'turnover';
        Sfx.timeUp();
        this.cb.onTurnEnd({ ...this.turn, reason: 'lives' });
      }
      return;
    }
    if (this.state === 'complete' && this.exitAnim) {
      /* Busby walks into the door, shrinks into the light, then the screen fades out */
      const a = this.exitAnim, p = this.player;
      a.t += dt;
      const walkT = 0.5;
      if (a.t < walkT) {
        const k = a.t / walkT;
        p.x = a.fromX + (a.toX - a.fromX) * k;
        p.facing = a.toX >= a.fromX ? 1 : -1;
        p.anim += dt;                                     // keeps the run bob going
        p.onGround = true; p.vx = 400;
      } else {
        p.x = a.toX; p.vx = 0;
        const k = Math.min(1, (a.t - walkT) / 0.4);
        a.scale = 1 - 0.75 * k;                           // shrinking as he steps inside
        a.alpha = 1 - k;
        if (k > 0 && Math.random() < 0.3) this.sparks(this.level.exit.x + 35, this.level.exit.y + rand(10, 90), 2, COLORS.green);
      }
      a.fade = Math.max(0, Math.min(1, (a.t - 0.95) / 0.35));   // fade to black after he is in
      return;
    }
    if (this.fadeIn > 0) this.fadeIn = Math.max(0, this.fadeIn - dt);
    if (this.state !== 'play') return;

    this.timer += dt;
    this.cb.onTick(this.timer, false);

    /* rage bait: stand still too long and a bulb drops on your head (turn mode only) */
    if (this.turn && this.turn.active) {
      const idle = !this.input.left && !this.input.right && !this.input.jump && p.onGround;
      if (this.input.left || this.input.right || this.input.jump) this.moved = true;
      this.idleT = idle && this.moved ? (this.idleT || 0) + dt : Math.min(this.idleT || 0, 0);
      const limit = (this.levelOpts && this.levelOpts.idleLimit) || 3;    // varies per level — never quite sure how long is safe
      if (this.idleT > limit) {                              // only bites once you have moved and then frozen mid-level
        const bulb = createTrap({ type: 'bulb', x: p.x + p.w / 2, y: Math.max(200, p.y - 340), trigger: [0, WORLD_W], ephemeral: true });
        bulb.reset(); this.traps.push(bulb);
        this.idleT = -4;   // cooldown before it can happen again
      }
    }

    /* traps think first (they read last frame's standingOn) */
    p.push = 0; p.reversed = this.forceReverse;
    for (const t of this.traps) t.update(dt, this);
    if (p.standingOn && p.standingOn.def && p.standingOn.dx !== undefined) {   // ride moving platforms
      p.x += p.standingOn.dx; p.y += p.standingOn.dy;
    }
    this.collectSolids();

    /* input → velocity */
    let left = this.input.left, right = this.input.right;
    if (p.reversed) { const tmp = left; left = right; right = tmp; }
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    p.vx = dir * MOVE_SPEED * this.speedMul;
    if (dir !== 0) p.facing = dir;
    if ((this.input.jump && !this.jumpWasHeld) || this.jumpPressed) p.jumpBuffer = JUMP_BUFFER;
    this.jumpPressed = false;
    this.jumpWasHeld = this.input.jump;
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);
    if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = -JUMP_SPEED * this.jumpMul; p.jumpBuffer = 0; p.coyote = 0; p.onGround = false; p.squash = -0.25;
      Sfx.jump();
      this.fxJump(p.x + p.w / 2, p.y + p.h);
    }
    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * this.gravMul * dt);

    const wasGround = p.onGround, impact = p.vy;      // how hard he was falling, for the landing dust
    const res = this.moveBody(p, dt, p.vx + p.push);
    p.onGround = res.onGround; p.standingOn = res.standingOn;
    if (p.standingOn) { p.lastStand = p.standingOn.def ? p.standingOn.def.type : 'ground'; p.lastStandAt = this.time; }   // for fall hints
    if (res.bounce) { p.vy = -res.bounce; p.onGround = false; if (p.standingOn.onBounce) p.standingOn.onBounce(this); }
    if (p.onGround && !wasGround) { p.squash = 0.3; Sfx.land(); this.fxLand(p.x + p.w / 2, p.y + p.h, impact); }
    p.squash *= 0.86;
    p.x = Math.max(0, Math.min(WORLD_W - p.w, p.x));
    p.anim += dt * (dir !== 0 && p.onGround ? 1 : 0.3);

    /* dust off the boots, and a skid puff when he turns on a dime */
    if (p.onGround && Math.abs(p.vx) > 60) {
      this.dustT = (this.dustT || 0) + dt;
      if (this.dustT > 0.1) { this.dustT = 0; this.fxStep(p.x + p.w / 2 - p.facing * 12, p.y + p.h, -p.facing); }
      if (p.prevFacing && p.prevFacing !== p.facing) this.fxSkid(p.x + p.w / 2, p.y + p.h, -p.facing);
    } else this.dustT = 0;
    p.prevFacing = p.facing;

    /* batteries */
    for (const b of this.batteries) b.update(dt, this);
    this.batteries = this.batteries.filter(b => !b.dead);

    /* death checks */
    if (p.y > WORLD_H + 80) {
      const why = ['vanish', 'floorDrop', 'mover', 'shifter'].includes(p.lastStand) ? p.lastStand : (p.push !== 0 ? 'magnet' : (p.reversed ? 'static' : 'fall'));
      this.die(why); return;
    }
    const box = { x: p.x + 6, y: p.y + 4, w: p.w - 12, h: p.h - 6 };
    const betrayed = ['vanish', 'floorDrop', 'shifter'].includes(p.lastStand) && this.time - (p.lastStandAt || 0) < 1.5;
    for (const h of this.level.hazards) if (rectsOverlap(box, h)) { this.die(betrayed ? p.lastStand : h.type); return; }
    for (const t of this.traps) for (const h of t.hazards()) if (rectsOverlap(box, h)) { this.die(t.def.ephemeral ? 'idle' : t.def.type); return; }
    for (const b of this.batteries) if (rectsOverlap(box, b.rect())) { this.die('battery'); return; }

    /* exit */
    const ex = this.level.exit;
    if (ex.moveTo && !this.level.exitMoved) {
      const d = Math.abs((ex.x + 35) - (p.x + p.w / 2));
      if (d < (ex.range ?? 150)) {
        this.level.exitMoved = true; this.level.exitPuff = 1.2;
        this.sparks(ex.x + 35, ex.y + 50, 24, COLORS.green);
        this.fxRing(ex.x + 35, ex.y + 50, { color: COLORS.green, r0: 8, r1: 190, life: 0.45, width: 8 });
        for (let i = 0; i < 4; i++) this.fxSmoke(ex.x + 35 + rand(-30, 30), ex.y + 50, { vy: rand(-90, -20), r1: rand(50, 90), life: 0.7, alpha: 0.3, color: '#9dffc4' });
        this.shake(0.22, 7);
        ex.x = ex.moveTo.x; ex.y = ex.moveTo.y;
        Sfx.nope();
        this.spawnAmbush(p.x + p.w / 2, ex.x + 35);          // the new route is never free
      }
    }
    if (this.level.exitPuff > 0) this.level.exitPuff -= dt;
    if (!this.level.exitHidden && rectsOverlap(box, { x: ex.x, y: ex.y, w: 70, h: 100 })) this.complete();
  }

  die(cause = 'default') {
    const p = this.player;
    p.dead = true; p.deadTimer = 0;
    this.state = 'dead';
    this.levelDeaths++;
    if (this.turn && this.turn.active) { this.turn.deaths++; if (!TEST_INFINITE_LIVES) this.turn.lives = Math.max(0, this.turn.lives - 1); }
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    this.hitStop = 0.09;                                   // everything stops for a heartbeat
    this.fxFlash('#ffffff', 0.85, 0.24);
    this.dangerT = 0.75;
    this.fxRing(cx, cy, { color: COLORS.yellow, r0: 12, r1: 280, life: 0.5, width: 11 });
    this.fxRing(cx, cy, { color: COLORS.cyan, r0: 6, r1: 180, life: 0.34, width: 6 });
    this.fxRing(cx, cy, { color: '#ffffff', r0: 4, r1: 110, life: 0.22, width: 4 });
    this.sparks(cx, cy, 40, COLORS.yellow);
    this.sparks(cx, cy, 20, COLORS.cyan);
    this.fxDebris(cx, cy, 14, [COLORS.yellow, COLORS.cyan, '#ffffff', COLORS.red]);
    for (let i = 0; i < 6; i++) this.fxArc(cx, cy, cx + rand(-220, 220), cy + rand(-170, 170), i % 2 ? COLORS.cyan : COLORS.yellow, 0.22, { delay: i * 0.03, width: 4, jag: 26 });
    this.fxPop(cx, cy - 90, 'ZAP!', COLORS.yellow, { size: 72 });
    this.shake(0.5, 17);
    Sfx.die();
    setTimeout(() => Sfx.oh(), 120);
    const msg = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
    this.cb.onDeath(msg, cause);
  }

  complete() {
    this.state = 'complete';
    const p = this.player;
    const ex = this.level.exit;
    this.exitAnim = { t: 0, fromX: p.x, toX: ex.x + 35 - p.w / 2, scale: 1, alpha: 1, fade: 0 };
    this.input.left = this.input.right = this.input.jump = false;
    const wx = p.x + p.w / 2, wy = p.y + p.h / 2;
    this.fxFlash(COLORS.green, 0.3, 0.35);
    this.shake(0.2, 5);
    for (let i = 0; i < 6; i++) this.sparks(wx + rand(-200, 200), p.y + rand(-200, 100), 16, [COLORS.yellow, COLORS.cyan, COLORS.magenta, COLORS.green][i % 4]);
    for (let i = 0; i < 3; i++) this.fxRing(ex.x + 35, ex.y + 50, { color: [COLORS.green, '#ffffff', COLORS.cyan][i], r0: 10, r1: 200 + i * 90, life: 0.55 + i * 0.12, width: 9 - i * 2, delay: i * 0.09 });
    this.fxDebris(ex.x + 35, ex.y + 40, 20, [COLORS.green, COLORS.yellow, COLORS.cyan, '#ffffff', COLORS.magenta]);
    Sfx.win();
    setTimeout(() => Sfx.yay(), 150);
    const score = this.levelScore();
    this.fxPop(ex.x + 35, ex.y - 60, '+' + score, COLORS.green, { size: 62, life: 1.2, delay: 0.12 });
    this.sessionScore += score;
    const inTurn = this.turn && this.turn.active;
    if (inTurn) {
      this.turn.score += score; this.turn.levels++;
      this.turn.highestLevel = Math.max(this.turn.highestLevel, this.levelIndex);
    }
    this.cb.onComplete({ level: this.levelIndex, time: this.timer, score, deaths: this.levelDeaths, sessionScore: this.sessionScore, inTurn, mod: this.mod });
  }

  /* ---------- rendering ---------- */
  buildBackground() {
    const VW = this.viewW || WORLD_W, VH = this.viewH || WORLD_H;
    const c = document.createElement('canvas');
    c.width = Math.round(VW * this.q); c.height = Math.round(VH * this.q);
    const x = c.getContext('2d');
    x.scale(this.q, this.q);                        // built at the canvas's real resolution
    const grd = x.createRadialGradient(VW / 2, 300, 100, VW / 2, 500, Math.max(1300, VW * 0.7));
    grd.addColorStop(0, '#111c3d'); grd.addColorStop(1, '#05080f');
    x.fillStyle = grd; x.fillRect(0, 0, VW, VH);
    if (this.coverImg && this.coverImg.complete && this.coverImg.naturalWidth) {
      /* cover photo, dimmed and tinted deep blue so the level stays readable */
      const iw = this.coverImg.naturalWidth, ih = this.coverImg.naturalHeight;
      const s = Math.max(VW / iw, VH / ih);
      const dw = iw * s, dh = ih * s;
      x.globalAlpha = 0.18;
      x.drawImage(this.coverImg, (VW - dw) / 2, (VH - dh) / 2, dw, dh);
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(6, 14, 70, .65)';
      x.fillRect(0, 0, VW, VH);
    }
    /* faint grid */
    x.strokeStyle = 'rgba(41,224,255,.06)'; x.lineWidth = 1;
    for (let gx = 0; gx <= VW; gx += 60) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, VH); x.stroke(); }
    for (let gy = 0; gy <= VH; gy += 60) { x.beginPath(); x.moveTo(0, gy); x.lineTo(VW, gy); x.stroke(); }
    /* circuit traces */
    x.strokeStyle = 'rgba(41,224,255,.14)'; x.lineWidth = 3; x.lineCap = 'round';
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const paths = [];
    for (let i = 0; i < 40 + Math.floor((VW - WORLD_W) / 50); i++) {
      let px = rnd() * VW, py = rnd() * (VH - 220);
      const pts = [{ x: px, y: py }];
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        if (rnd() < 0.5) px += (rnd() - 0.5) * 400; else py += (rnd() - 0.5) * 300;
        x.lineTo(px, py); pts.push({ x: px, y: py });
      }
      x.stroke();
      paths.push(pts);
      x.fillStyle = 'rgba(41,224,255,.25)'; x.beginPath(); x.arc(px, py, 5, 0, Math.PI * 2); x.fill();
    }
    this.tracePaths = paths;        // the ambience layer sends glowing current down these
    /* distant pylons */
    x.strokeStyle = 'rgba(139,155,196,.12)'; x.lineWidth = 6;
    const oy = (VH - WORLD_H) / 2;
    for (let bx = 200 + ((VW - WORLD_W) / 2) % 520; bx < VW; bx += 520) {
      x.beginPath(); x.moveTo(bx - 60, oy + 900); x.lineTo(bx, oy + 300); x.lineTo(bx + 60, oy + 900); x.stroke();
      x.beginPath(); x.moveTo(bx - 90, oy + 420); x.lineTo(bx + 90, oy + 420); x.moveTo(bx - 70, oy + 560); x.lineTo(bx + 70, oy + 560); x.stroke();
    }
    return c;
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.q, 0, 0, this.q, 0, 0);   // draw in design pixels; the canvas itself is smaller
    ctx.save();
    ctx.drawImage(this.bg, 0, 0, this.viewW, this.viewH);
    this.fxDrawAmbience(ctx);                       // drifting dust, current in the walls, distant storm
    if (!this.level) { ctx.restore(); return; }

    ctx.save();
    this.fxApplyShake(ctx);                         // only the world shakes; the frame around it stays put
    /* the world is centred in the stage and shifted up so the bottom strip stays free for the touch controls */
    ctx.save();
    ctx.translate(this.ox, this.oy - this.shift);

    /* electrified pools & spikes (static hazards) */
    for (const h of this.level.hazards) {
      if (h.type === 'pool') this.drawPool(ctx, h);
      else if (h.type === 'spikes') drawSpikes(ctx, h, '#ff7a8a', '#fff');
    }
    for (const pl of this.level.platforms) drawPlatform(ctx, pl, pl.kind === 'ground' ? 'metal' : 'metal');
    for (const t of this.traps) t.draw(ctx, this);
    for (const b of this.batteries) b.draw(ctx);

    const ex = this.level.exit;
    if (!this.level.exitHidden) {
      if (this.state === 'play') this.fxExitLure(ctx, ex);        // the door glows brighter the closer he gets
      if (this.exitAnim) {
        /* door swings open: a bright column of light spills out */
        const k = Math.min(1, this.exitAnim.t / 0.5);
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.5 * k;
        const lg = ctx.createLinearGradient(ex.x, ex.y - 60, ex.x, ex.y + 100);
        lg.addColorStop(0, 'rgba(180,255,210,0)'); lg.addColorStop(1, 'rgba(120,255,170,0.9)');
        ctx.fillStyle = lg;
        ctx.fillRect(ex.x - 30 * k, ex.y - 60 * k, 70 + 60 * k, 160 + 60 * k);
        /* rays fanning out of the doorway */
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(ex.x + 35, ex.y + 50);
        ctx.rotate(this.time * 0.6);
        ctx.fillStyle = 'rgba(150,255,200,' + (0.1 + 0.12 * k) + ')';
        for (let i = 0; i < 10; i++) {
          ctx.rotate(Math.PI / 5);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, -26); ctx.lineTo(300, 26); ctx.fill();
        }
        ctx.restore();
        drawExitDoor(ctx, ex, this.time, '#c8ffdc', 'EXIT');
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.45 * k) + ')';
        ctx.fillRect(ex.x + 8, ex.y + 8, 54, 84);              // the open doorway, glowing white
      } else drawExitDoor(ctx, ex, this.time);
    }
    if (this.level.exitPuff > 0) {
      const k = 1.2 - this.level.exitPuff;
      ctx.save();
      ctx.translate(ex.x + 35, ex.y - 70 - k * 40);
      ctx.rotate(Math.sin(k * 22) * 0.06);
      ctx.font = '48px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(4,8,20,.8)'; ctx.strokeText('NOT SO FAST!', 0, 0);
      ctx.fillStyle = COLORS.green; ctx.fillText('NOT SO FAST!', 0, 0);
      ctx.restore();
    }

    this.fxDrawShadow(ctx, this.player);            // contact shadow: tells you where you will land
    this.drawPlayer(ctx);
    this.fxDraw(ctx);                               // sparks, dust, rings, arcs, pop text
    if (this.blackout) this.drawBlackout(ctx);
    ctx.restore();                                  // end world transform
    ctx.restore();                                  // end shake

    this.drawSideStrips(ctx);
    this.fxDrawVignette(ctx);
    this.drawControlPanel(ctx);
    const fade = this.exitAnim ? this.exitAnim.fade : this.fadeIn > 0 ? Math.min(1, this.fadeIn / 0.45) : 0;
    if (fade > 0) { ctx.fillStyle = `rgba(2,4,12,${fade})`; ctx.fillRect(-20, -20, this.viewW + 40, this.viewH + 40); }
    this.fxDrawFlash(ctx);
    ctx.restore();
  }

  /* On screens wider than 16:9 the world ends before the stage does: dim the margins and mark the edge. */
  drawSideStrips(ctx) {
    if (this.portrait) {                                    // portrait: dim above the world and outline the play area
      const top = this.oy, bottom = this.oy + WORLD_H;
      ctx.fillStyle = 'rgba(2, 4, 12, .5)';
      ctx.fillRect(0, 0, this.viewW, Math.max(0, top));
      ctx.fillRect(0, bottom, this.viewW, Math.max(0, this.viewH - this.panelH - bottom));
      ctx.fillStyle = 'rgba(41,224,255,.25)';
      ctx.fillRect(0, top - 3, this.viewW, 3);
      ctx.fillRect(0, bottom, this.viewW, 3);
      return;
    }
    if (this.ox <= 0) return;
    const top = this.oy - this.shift, h = WORLD_H - this.shift;
    ctx.fillStyle = 'rgba(2, 4, 12, .45)';
    ctx.fillRect(0, 0, this.ox, this.viewH);
    ctx.fillRect(this.ox + WORLD_W, 0, this.ox + 1, this.viewH);
    ctx.fillStyle = 'rgba(41,224,255,.25)';
    ctx.fillRect(this.ox - 3, top, 3, h);
    ctx.fillRect(this.ox + WORLD_W, top, 3, h);
  }

  /* BLACKOUT modifier: darkness with a flickering light around the player; the exit still glows faintly */
  drawBlackout(ctx) {
    /* the darkness lives on its own layer so the hole only cuts the darkness, not the world */
    const LX = this.ox, LY = this.oy - this.shift;          // layer origin in world space
    if (!this.darkLayer) { this.darkLayer = document.createElement('canvas'); this.darkLayer.width = Math.round(this.viewW * this.q); this.darkLayer.height = Math.round(this.viewH * this.q); }
    const d = this.darkLayer.getContext('2d');
    d.setTransform(this.q, 0, 0, this.q, 0, 0);
    const p = this.player;
    const cx = p.x + p.w / 2 + LX, cy = p.y + p.h / 2 + LY;
    const r = 250 + Math.sin(this.time * 9) * 10;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, this.viewW, this.viewH);
    d.fillStyle = 'rgba(2,4,10,0.94)';
    d.fillRect(0, 0, this.viewW, this.viewH);
    d.globalCompositeOperation = 'destination-out';
    const g = d.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.fillRect(cx - r, cy - r, r * 2, r * 2);
    const ex = this.level.exit;
    if (!this.level.exitHidden) {
      const exx = ex.x + 35 + LX, exy = ex.y + 50 + LY;
      const eg = d.createRadialGradient(exx, exy, 10, exx, exy, 120);
      eg.addColorStop(0, 'rgba(0,0,0,0.6)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = eg; d.fillRect(exx - 135, exy - 150, 270, 300);
    }
    ctx.drawImage(this.darkLayer, -LX, -LY, this.viewW, this.viewH);
  }

  /* bottom strip behind the on-screen buttons: a dark control panel with a hazard stripe */
  drawControlPanel(ctx) {
    const top = this.viewH - this.panelH;
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, top, this.viewW, this.panelH);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, this.viewW, 16); ctx.clip();
    for (let x = -40; x < this.viewW + 40; x += 40) {
      ctx.fillStyle = (x / 40) % 2 === 0 ? COLORS.yellow : '#111';
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 40, top); ctx.lineTo(x + 20, top + 16); ctx.lineTo(x - 20, top + 16); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(41,224,255,.15)'; ctx.lineWidth = 2;
    for (let x = 0; x <= this.viewW; x += 120) { ctx.beginPath(); ctx.moveTo(x, top + 16); ctx.lineTo(x, this.viewH); ctx.stroke(); }
  }

  drawPool(ctx, h) {
    const t = this.time;
    const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
    g.addColorStop(0, '#2f7bff'); g.addColorStop(0.4, '#10309f'); g.addColorStop(1, '#040f2c');
    ctx.fillStyle = g;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    /* two waves lapping at different speeds */
    for (let w = 0; w < 2; w++) {
      ctx.strokeStyle = w ? 'rgba(41,224,255,.35)' : COLORS.cyan;
      ctx.lineWidth = w ? 9 : 4;
      ctx.beginPath();
      for (let x = h.x; x <= h.x + h.w; x += 14) ctx.lineTo(x, h.y + Math.sin(x / (34 + w * 22) + t * (5 - w * 1.7)) * (5 + w * 3));
      ctx.stroke();
    }
    /* the glow it throws back up the pit walls */
    const gl = ctx.createLinearGradient(0, h.y - 100, 0, h.y + 8);
    gl.addColorStop(0, 'rgba(41,224,255,0)'); gl.addColorStop(1, 'rgba(41,224,255,.2)');
    ctx.fillStyle = gl; ctx.fillRect(h.x, h.y - 100, h.w, 108);
    ctx.restore();
    /* arcs skipping off the surface */
    if (Math.random() < 0.4) {
      const bx = h.x + rand(0, h.w);
      drawBolt(ctx, bx, h.y, bx + rand(-70, 70), h.y - rand(10, 70), Math.random() < 0.4 ? COLORS.cyan : COLORS.yellow, 2.5, 12);
    }
    /* bubbles rising out of the murk */
    if (Math.random() < 0.3) this.fxPush({
      kind: 'ember', x: h.x + rand(6, h.w - 6), y: h.y + h.h - 8, vx: rand(-18, 18), vy: rand(-130, -60),
      life: rand(0.5, 1.1), t: 0, color: 'rgba(170,235,255,1)', size: rand(1.5, 3.4), drag: 0.997, grav: -150, ph: rand(0, 6.3)
    });
    ctx.fillStyle = 'rgba(255,214,10,.9)'; ctx.font = '22px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
    for (let x = h.x + 80; x < h.x + h.w - 40; x += 260) ctx.fillText('⚡ HIGH VOLTAGE ⚡', x, h.y + 40 + Math.sin(t * 3 + x) * 3);
  }

  drawPlayer(ctx) {
    const p = this.player;
    const dead = p.dead;
    if (this.sprites && this.sprites.idle && this.sprites.idle.naturalWidth) { this.drawMascotPlayer(ctx); return; }
    ctx.save();
    let jx = 0, jy = 0;
    if (dead) { jx = rand(-4, 4); jy = rand(-4, 4); }
    ctx.translate(p.x + p.w / 2 + jx, p.y + p.h + jy);
    const sx = 1 + p.squash * 0.6, sy = 1 - p.squash * 0.6;
    ctx.scale(p.facing * sx, sy);
    const moving = Math.abs(p.vx) > 1 && p.onGround;
    const bob = moving ? Math.sin(p.anim * 14) * 3 : Math.sin(this.time * 3) * 1.5;
    /* feet */
    ctx.fillStyle = '#1a1a1a';
    const step = moving ? Math.sin(p.anim * 14) * 6 : 0;
    ctx.beginPath(); ctx.ellipse(-11 + step, -3, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11 - step, -3, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    /* body */
    ctx.translate(0, -bob);
    ctx.shadowColor = dead ? COLORS.red : COLORS.yellow; ctx.shadowBlur = dead ? 30 : 14;
    const bg = ctx.createLinearGradient(0, -60, 0, 0);
    bg.addColorStop(0, dead ? '#ffb3a0' : '#fff08a'); bg.addColorStop(1, dead ? '#e07a5f' : '#ffc400');
    ctx.fillStyle = bg;
    roundRect(ctx, -22, -62, 44, 60, 14); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#7a5c00'; ctx.lineWidth = 3; roundRect(ctx, -22, -62, 44, 60, 14); ctx.stroke();
    /* chest bolt */
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath(); ctx.moveTo(3, -30); ctx.lineTo(-6, -16); ctx.lineTo(0, -16); ctx.lineTo(-3, -6); ctx.lineTo(7, -20); ctx.lineTo(1, -20); ctx.closePath(); ctx.fill();
    /* plug prongs on the head */
    ctx.fillStyle = '#d0d8ee';
    ctx.fillRect(-9, -74, 5, 13); ctx.fillRect(4, -74, 5, 13);
    if (!p.onGround && !dead) { ctx.fillStyle = COLORS.cyan; ctx.beginPath(); ctx.arc(0, -78, 4 + Math.random() * 3, 0, Math.PI * 2); ctx.fill(); }
    /* eyes */
    if (dead) {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
      for (const ex of [-9, 9]) { ctx.beginPath(); ctx.moveTo(ex - 5, -50); ctx.lineTo(ex + 5, -40); ctx.moveTo(ex + 5, -50); ctx.lineTo(ex - 5, -40); ctx.stroke(); }
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(0, -24, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      const blink = (this.time % 3.7) < 0.12;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-8, -44, 7, blink ? 1 : 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, -44, 7, blink ? 1 : 8, 0, 0, Math.PI * 2); ctx.fill();
      if (!blink) {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-6, -43, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(11, -43, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(1, -30, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    ctx.restore();
  }
}

/* Sparky as the player: sprite anchored at the feet, flipped to face the way he runs */
Game.prototype.drawMascotPlayer = function (ctx) {
  const p = this.player;
  const dead = p.dead;
  const ea = this.state === 'complete' && this.exitAnim ? this.exitAnim : null;
  if (ea && ea.alpha <= 0) return;                       // he is inside the door now
  const img = dead ? this.sprites.shock : this.sprites.idle;
  const H = 86, W = H * 200 / 232;
  const moving = Math.abs(p.vx) > 1 && p.onGround;
  const bob = moving ? Math.abs(Math.sin(p.anim * 14)) * 4 : (p.onGround ? Math.sin(this.time * 3) * 1.2 : 0);
  const tilt = moving ? Math.sin(p.anim * 14) * 0.07 : (!p.onGround ? -p.facing * Math.max(-0.25, Math.min(0.25, p.vy / 4000)) : 0);
  const sx = 1 + p.squash * 0.5, sy = 1 - p.squash * 0.5;

  /* after-images when he is really shifting (turbo, or a long fall) */
  p.trail = p.trail || [];
  if (!dead && !ea && (Math.abs(p.vx) > 520 || p.vy > 1050)) {
    p.trail.push({ x: p.x, y: p.y, f: p.facing });
    if (p.trail.length > 6) p.trail.shift();
  } else if (p.trail.length) p.trail.shift();
  if (p.trail.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.trail.length - 1; i++) {
      const gh = p.trail[i];
      ctx.globalAlpha = ((i + 1) / p.trail.length) * 0.2;
      ctx.save();
      ctx.translate(gh.x + p.w / 2, gh.y + p.h);
      ctx.scale(gh.f, 1);
      ctx.drawImage(img, -W / 2, -H, W, H);
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.save();
  let jx = 0, jy = 0;
  if (dead) { jx = rand(-4, 4); jy = rand(-4, 4); }
  ctx.translate(p.x + p.w / 2 + jx, p.y + p.h + jy);
  ctx.rotate(tilt * p.facing);
  ctx.scale(p.facing * sx, sy);
  if (ea) { ctx.globalAlpha = ea.alpha; ctx.scale(ea.scale, ea.scale); }
  /* the charge he carries around with him — a soft falloff, never a visible disc */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (dead ? 0.55 : 0.2 + 0.07 * Math.sin(this.time * 7)) * (ea ? ea.alpha : 1);
  const hr = W * (dead ? 1.15 : 0.95);
  const hg = ctx.createRadialGradient(0, -H * 0.5, 2, 0, -H * 0.5, hr);
  hg.addColorStop(0, dead ? 'rgba(255,61,90,.85)' : 'rgba(255,214,10,.55)');
  hg.addColorStop(0.45, dead ? 'rgba(255,61,90,.25)' : 'rgba(255,190,40,.16)');
  hg.addColorStop(1, 'rgba(255,190,40,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -H * 0.5, hr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.shadowColor = dead ? COLORS.red : 'rgba(0,0,0,.6)'; ctx.shadowBlur = dead ? 30 : 10; ctx.shadowOffsetY = 4;
  ctx.drawImage(img, -W / 2, -H - bob + 2, W, H);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (!p.onGround && !dead) {           // thruster spark under the boots while airborne
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath(); ctx.arc(0, 2, 4 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(0, 10, 7, 16 + Math.random() * 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  /* stray arcs crackling over him — world space, so they live in the particle layer */
  if (!dead && !ea && Math.random() < 0.03) {
    const cx = p.x + p.w / 2;
    this.fxArc(cx + rand(-18, 18), p.y + 6, cx + rand(-24, 24), p.y + p.h - 8, COLORS.cyan, 0.11, { width: 2, jag: 7 });
  }
  if (dead && Math.random() < 0.3) {
    const cx = p.x + p.w / 2;
    this.fxArc(cx + rand(-30, 30), p.y - 10, cx + rand(-40, 40), p.y + p.h, Math.random() < 0.5 ? COLORS.yellow : COLORS.cyan, 0.13, { width: 3, jag: 14 });
  }
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- input: multi-touch buttons + keyboard ---------- */
function bindGameInput(game, controlsEl) {
  const pointers = new Map();   // pointerId -> control name
  const buttons = Array.from(controlsEl.querySelectorAll('.ctrl'));

  function refresh() {
    const active = new Set(pointers.values());
    game.input.left = active.has('left');
    game.input.right = active.has('right');
    const jumpNow = active.has('jump') || keyJump;
    if (jumpNow && !game.input.jump) game.jumpPressed = true;   // latch taps shorter than a frame
    game.input.jump = jumpNow;
    if (keyLeft) game.input.left = true;
    if (keyRight) game.input.right = true;
    for (const b of buttons) b.classList.toggle('active', active.has(b.dataset.ctrl));
  }
  function ctrlAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest ? el.closest('.ctrl') : null;
    return b ? b.dataset.ctrl : null;
  }
  if (window.PointerEvent) {
    /* Pointer Events: every finger is its own pointerId, so several buttons can be held at once */
    controlsEl.addEventListener('pointerdown', e => {
      const c = ctrlAt(e.clientX, e.clientY);
      if (!c) return;
      e.preventDefault();
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pointers.set(e.pointerId, c);
      refresh();
    });
    const move = e => {
      if (!pointers.has(e.pointerId)) return;
      const c = ctrlAt(e.clientX, e.clientY);
      if (c) pointers.set(e.pointerId, c); else pointers.delete(e.pointerId);
      refresh();
    };
    const up = e => { if (pointers.delete(e.pointerId)) refresh(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  } else {
    /* Touch Events fallback for older TV browsers */
    const touchUpdate = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const c = ctrlAt(t.clientX, t.clientY);
        if (c) pointers.set(t.identifier, c); else pointers.delete(t.identifier);
      }
      refresh();
    };
    const touchEnd = e => { for (const t of e.changedTouches) pointers.delete(t.identifier); refresh(); };
    controlsEl.addEventListener('touchstart', touchUpdate, { passive: false });
    controlsEl.addEventListener('touchmove', touchUpdate, { passive: false });
    window.addEventListener('touchend', touchEnd);
    window.addEventListener('touchcancel', touchEnd);
  }
  window.addEventListener('blur', () => { pointers.clear(); keyLeft = keyRight = keyJump = false; refresh(); });

  let keyLeft = false, keyRight = false, keyJump = false;
  const keymap = k => ({ ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump' }[k]);
  window.addEventListener('keydown', e => {
    const c = keymap(e.code); if (!c) return;
    if (c === 'left') keyLeft = true; if (c === 'right') keyRight = true; if (c === 'jump') keyJump = true;
    e.preventDefault(); refresh();
  });
  window.addEventListener('keyup', e => {
    const c = keymap(e.code); if (!c) return;
    if (c === 'left') keyLeft = false; if (c === 'right') keyRight = false; if (c === 'jump') keyJump = false;
    refresh();
  });
  return { clear() { pointers.clear(); keyLeft = keyRight = keyJump = false; refresh(); } };
}
