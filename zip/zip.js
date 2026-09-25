/* 🔌 ZIP — draw one wire from terminal 1 to the last terminal, in order, through every cell.
   Undo is free and unlimited (drag back over the wire, or RESET). Only a real mistake costs a fuse:
   touching a terminal out of order, or closing on the last terminal before every cell is wired. Three per run.
   One run = 2 minutes on a single clock, which only starts on the player's first move. Your score is simply how many circuits you close before it runs out
   (three fuses can end it sooner). Puzzles are generated on the fly, so no two are alike. */
'use strict';

const $ = id => document.getElementById(id);
const NAME_MAX = 12;
const FUSES = 3;
const RUN_SECONDS = 120;                 // one clock for the whole turn, not per level
const SCORES_KEY = 'zipScores';
const SCORES_MAX = 20;

/* ---------- level ladder: grid size, number of terminals, walls ---------- */
const LADDER = [
  { R: 5, C: 5, n: 6, walls: 0 },
  { R: 5, C: 5, n: 6, walls: 0 },
  { R: 5, C: 5, n: 7, walls: 0 },
  { R: 5, C: 5, n: 7, walls: 3 },
  { R: 5, C: 6, n: 8, walls: 3 },
  { R: 6, C: 6, n: 8, walls: 4 },
  { R: 6, C: 6, n: 9, walls: 6 },
  { R: 6, C: 7, n: 10, walls: 6 },
  { R: 7, C: 7, n: 11, walls: 8 },
  { R: 7, C: 7, n: 12, walls: 10 }
];
/* Past the hand-made ladder the boards keep growing on their own — the run only ends when the
   fuses do. Sizes climb to 9x9, terminals to 16, walls level off so puzzles stay interesting. */
const ENDLESS_SIZES = [[7, 7], [7, 8], [8, 8], [8, 9], [9, 9]];
function levelSpec(lvl) {
  if (lvl <= LADDER.length) return LADDER[lvl - 1];
  const k = lvl - LADDER.length;                                  // 1, 2, 3, ...
  const [R, C] = ENDLESS_SIZES[Math.min(ENDLESS_SIZES.length - 1, Math.floor((k - 1) / 3))];
  return { R, C, n: Math.min(18, 12 + Math.ceil(k / 2)), walls: Math.min(30, 10 + k * 2) };
}

/* ---------- utils ---------- */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sanitizeName = s => String(s || '').replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, NAME_MAX);
const fmtTime = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const fmtPts = n => n.toLocaleString('en-US');

/* ---------- scores ---------- */
function loadScores() {
  try { const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]'); return Array.isArray(raw) ? raw.filter(s => s && typeof s === 'object').map(s => ({ name: sanitizeName(s.name), score: Math.max(0, s.score | 0), level: Math.max(0, s.level | 0), date: String(s.date || '') })) : []; }
  catch (e) { return []; }
}
function addScore(entry) {
  const list = loadScores();
  const rec = { name: sanitizeName(entry.name), score: entry.score | 0, level: entry.level | 0, date: new Date().toISOString() };
  list.push(rec);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, SCORES_MAX);
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(top)); } catch (e) { /* storage full or blocked: play on */ }
  const i = top.indexOf(rec);
  return i < 0 ? list.indexOf(rec) + 1 : i + 1;              // rank on the board (or overall if it fell off the top 20)
}

/* ---------- sound (tiny synth) ---------- */
const Sfx = (() => {
  let ctx = null;
  const ac = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  const tone = (f, t, type = 'square', vol = 0.08, slide = 0) => {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), c.currentTime + t);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + t);
  };
  /* a crude "voice": a buzzy tone glided through vowel formant filters */
  const vowel = (f0a, f0b, formants, dur, vol = 0.4) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0a, t);
    osc.frequency.exponentialRampToValueAtTime(f0b, t + dur * 0.7);
    const vib = c.createOscillator(), vibG = c.createGain();
    vib.frequency.value = 6; vibG.gain.value = f0a * 0.03; vib.connect(vibG).connect(osc.frequency);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vol, t + 0.06);
    env.gain.setValueAtTime(vol, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [freq, q, gain] of formants) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const fg = c.createGain(); fg.gain.value = gain;
      osc.connect(bp).connect(fg).connect(env);
    }
    env.connect(c.destination);
    osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  };

  return {
    init: ac,
    click: () => tone(600, 0.06, 'square', 0.05),
    key: () => tone(900, 0.05, 'square', 0.04),
    step: i => tone(330 + Math.min(i, 40) * 18, 0.07, 'triangle', 0.07),
    terminal: () => { tone(660, 0.12, 'square', 0.07); setTimeout(() => tone(990, 0.16, 'square', 0.07), 70); },
    buzz: () => tone(110, 0.35, 'sawtooth', 0.12, -60),
    fuse: () => { tone(200, 0.25, 'sawtooth', 0.12, -150); setTimeout(() => tone(80, 0.3, 'square', 0.1), 120); },
    smash: () => {                                       /* glass: a bright noise burst, then tinkling shards */
      const c = ac(); if (!c) return;
      const len = Math.floor(c.sampleRate * 0.45), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
      const g = c.createGain(); g.gain.setValueAtTime(0.45, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45);
      src.connect(hp).connect(g).connect(c.destination); src.start();
      tone(70, 0.3, 'square', 0.12, -30);
      for (let i = 0; i < 5; i++) setTimeout(() => tone(1800 + Math.random() * 2200, 0.09, 'triangle', 0.045), 120 + i * 70);
    },
    tick: () => tone(880, 0.05, 'square', 0.06),
    /* HAPPY — circuit closed: a bouncy "ta-da!" fanfare with a rising "yaay" underneath (same as Electrical Troll) */
    yay: () => {
      const c = ac(); if (!c) return;
      const t0 = c.currentTime;
      const ping = (type, f, dur, vol, delay) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t0 + delay);
        g.gain.setValueAtTime(0.0001, t0 + delay);
        g.gain.exponentialRampToValueAtTime(vol, t0 + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
        o.connect(g).connect(c.destination); o.start(t0 + delay); o.stop(t0 + delay + dur + 0.02);
      };
      [523, 659, 784, 1047].forEach((f, i) => { ping('square', f, 0.12, 0.2, i * 0.075); ping('triangle', f / 2, 0.12, 0.14, i * 0.075); });
      ping('square', 1047, 0.5, 0.18, 0.32);                       // held top note...
      ping('square', 1319, 0.5, 0.13, 0.32);                       // ...with a happy third on top
      ping('sine', 2093, 0.3, 0.09, 0.42);                         // sparkle
      vowel(320, 520, [[700, 6, 1.0], [1250, 8, 0.7], [2600, 10, 0.3]], 0.6, 0.35);   // "yaaay!" gliding up
    },
    /* SAD — a fuse blows: the classic sad trombone "wah-wah-waaah" with a drooping "ohhh" */
    oh: () => {
      const c = ac(); if (!c) return;
      let t = c.currentTime;
      const notes = [[466, 0.32], [440, 0.32], [415, 0.32], [370, 0.95]];   // Bb A Ab F# — each one sags
      notes.forEach(([f, dur], i) => {
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 1.03, t);
        o.frequency.exponentialRampToValueAtTime(f * (i === 3 ? 0.9 : 0.97), t + dur);   // the "wah" bend down
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 3;
        const wah = c.createOscillator(), wahG = c.createGain();
        wah.frequency.value = i === 3 ? 5 : 8; wahG.gain.value = 500; wah.connect(wahG).connect(lp.frequency);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.26, t + 0.04);
        g.gain.setValueAtTime(0.26, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(lp).connect(g).connect(c.destination);
        o.start(t); wah.start(t); o.stop(t + dur + 0.02); wah.stop(t + dur + 0.02);
        t += dur;
      });
      vowel(240, 150, [[450, 6, 1.0], [850, 8, 0.6]], 1.1, 0.3);          // "ohhhh..." drooping
    },
    hum: () => { tone(120, 0.5, 'sine', 0.05); setTimeout(() => tone(240, 0.6, 'sine', 0.04), 60); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'square', 0.08), i * 90)),
    over: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.1), i * 160)),
    record: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.08), i * 80))
  };
})();

/* ---------- puzzle generation ----------
   A random Hamiltonian path on an R×C grid via the "backbite" walk: start from a snake path, then
   repeatedly attach one end to a random grid neighbour and cut the path there to keep it a path. */
function hamiltonianPath(R, C, rng) {
  const N = R * C;
  let path = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) path.push(r * C + (r % 2 ? C - 1 - c : c));
  const nbrs = v => { const r = (v / C) | 0, c = v % C, out = []; if (r > 0) out.push(v - C); if (r < R - 1) out.push(v + C); if (c > 0) out.push(v - 1); if (c < C - 1) out.push(v + 1); return out; };
  const pos = new Int32Array(N);
  for (let it = 0; it < N * 60; it++) {
    if (rng() < 0.5) path.reverse();
    for (let i = 0; i < N; i++) pos[path[i]] = i;
    const head = path[N - 1];
    const cand = nbrs(head).filter(v => v !== path[N - 2]);
    if (!cand.length) continue;
    const v = cand[Math.floor(rng() * cand.length)];
    const j = pos[v];
    path = path.slice(0, j + 1).concat(path.slice(j + 1).reverse());
  }
  return path;
}

function makePuzzle(level, seed) {
  const rng = makeRng(seed);
  const spec = levelSpec(level);
  const { R, C } = spec;
  const N = R * C;
  const path = hamiltonianPath(R, C, rng);
  /* terminals: 1 at the start, the last one at the end, the rest spread along the path with jitter */
  const n = Math.min(spec.n, Math.floor(N / 2));
  const idx = [0];
  for (let k = 1; k < n - 1; k++) {
    let i = Math.round(k * (N - 1) / (n - 1) + (rng() - 0.5) * (N / n) * 0.8);
    i = Math.max(idx[idx.length - 1] + 2, Math.min(N - 1 - 2 * (n - 1 - k), i));
    idx.push(i);
  }
  idx.push(N - 1);
  const numbers = new Map();
  idx.forEach((i, k) => numbers.set(path[i], k + 1));
  /* walls: grid edges the solution never uses */
  const onPath = new Set();
  for (let i = 0; i < N - 1; i++) onPath.add(edgeKey(path[i], path[i + 1]));
  const cands = [];
  for (let v = 0; v < N; v++) {
    const r = (v / C) | 0, c = v % C;
    if (c < C - 1 && !onPath.has(edgeKey(v, v + 1))) cands.push(edgeKey(v, v + 1));
    if (r < R - 1 && !onPath.has(edgeKey(v, v + C))) cands.push(edgeKey(v, v + C));
  }
  const walls = new Set();
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  for (const e of cands.slice(0, spec.walls)) walls.add(e);
  return { R, C, N, path, numbers, count: n, walls, start: path[0], end: path[N - 1] };
}
const edgeKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;

/* ---------- game state ---------- */
const game = {
  player: 'PLAYER', level: 1, score: 0, fuses: FUSES, puzzle: null,
  wire: [], next: 1, retracting: false, timeLeft: RUN_SECONDS, started: false, active: false, busy: false, seed: 1
};

function newLevel() {
  /* the clock is never reset between levels; it only ever starts on the first move of the turn */
  game.seed = (game.seed * 1103515245 + 12345 + Date.now()) >>> 0;
  game.puzzle = makePuzzle(game.level, game.seed);
  game.wire = []; game.next = 1; game.retracting = false; game.busy = false;
  fxReset(true);                                            // cells drop in for the new board
  showClock();
  bulbReset();
  const lvlEl = $('hud-level');
  lvlEl.textContent = 'LEVEL ' + game.level;
  lvlEl.classList.remove('bump'); void lvlEl.offsetWidth; lvlEl.classList.add('bump');
  $('hud-size').textContent = `${game.puzzle.R} × ${game.puzzle.C} · ${game.puzzle.count} TERMINALS`;
  setMsg(game.started ? 'START AT 1' : 'TAP 1 TO START THE CLOCK', '');
  draw();
}

function showClock() {
  const el = $('hud-timer');
  el.textContent = fmtTime(Math.max(0, Math.ceil(game.timeLeft)));
  el.classList.toggle('urgent', game.started && game.timeLeft <= 20);
  el.classList.toggle('ready', !game.started);             // parked at 3:00 until the first move
}
/* the first touch on the board sets the two minutes running */
function startClock() {
  if (game.started || !game.active) return;
  game.started = true;
  showClock();
  if (!game.wire.length) setMsg('START AT 1', '');
}
/* the two minutes are up: the turn ends there, and the circuits you closed are the score */
function timeUp() {
  if (!game.active) return;
  game.timeLeft = 0; showClock();
  setMsg('TIME UP!', 'bad');
  game.busy = true;
  Sfx.buzz();
  setTimeout(() => endRun('time'), 900);
}

function setMsg(text, cls) {
  const m = $('zip-msg'); m.textContent = text; m.className = 'zip-msg' + (cls ? ' ' + cls : '');
  void m.offsetWidth; m.classList.add(cls === 'bad' ? 'bad' : 'fresh');
}
function renderFuses(pop) {
  const el = $('fuses');
  [...el.children].forEach((s, i) => {
    const blown = i >= game.fuses;
    if (blown && pop && i === game.fuses) { s.classList.remove('just-blown'); void s.offsetWidth; s.classList.add('just-blown'); }
    s.classList.toggle('blown', blown);
  });
  el.classList.remove('pop'); if (pop) { void el.offsetWidth; el.classList.add('pop'); }
}
function blowFuse(reason) {
  if (game.busy) return;
  game.fuses--;
  renderFuses(true);
  Sfx.fuse(); Sfx.oh();                                /* sad trombone; the shatter follows when the glass goes */
  bulbBoom();
  setMsg(reason + ' · FUSE BLOWN', 'bad');
  flash = 1; fxShake(1); fx.vignette = 1; fx.fail = 1;      // the wire you have drawn goes dead red
  {
    const g = geom(), h = game.wire.length ? centre(game.wire[game.wire.length - 1], g) : { x: canvas.width / 2, y: canvas.height / 2 };
    fxSpark(h.x, h.y, 26, '#ff3d5a', 420); fxRing(h.x, h.y, '#ff3d5a', 12, g.cell * 2.4, 0.7);
  }
  if (game.fuses <= 0) { game.busy = true; setTimeout(() => endRun('fuses'), 2000); }   // let the blast finish first
}

const adjacent = (a, b, C) => (Math.abs(a - b) === C) || (Math.abs(a - b) === 1 && ((a / C) | 0) === ((b / C) | 0));

function tryMove(v) {
  if (!game.active || game.busy) return;
  const p = game.puzzle, w = game.wire;
  if (!w.length) {
    if (v === p.start) { w.push(v); game.next = 2; Sfx.terminal(); setMsg('WIRE TO 2', ''); draw(); }
    else setMsg('START AT 1', 'bad');
    return;
  }
  const head = w[w.length - 1];
  if (v === head) return;
  /* dragging back over your own wire = undo. Free, unlimited, never costs a fuse. */
  if (w.length >= 2 && v === w[w.length - 2]) {
    game.retracting = true;
    const popped = w.pop();
    if (p.numbers.has(popped)) game.next = p.numbers.get(popped);
    setMsg(game.next <= p.count ? 'WIRE TO ' + game.next : 'CLOSE THE CIRCUIT', '');
    Sfx.click(); draw(); return;
  }
  if (!adjacent(head, v, p.C)) return;
  if (p.walls.has(edgeKey(head, v))) {
    Sfx.buzz(); setMsg('WALL', 'bad');
    const g = geom(), a = centre(head, g), b = centre(v, g);           // sparks where the wire hits the barrier
    fxSpark((a.x + b.x) / 2, (a.y + b.y) / 2, 8, '#ffd60a', 200);
    fxShake(0.25);
    return;
  }
  if (w.includes(v)) { Sfx.buzz(); setMsg('WIRE ALREADY THERE', 'bad'); return; }
  if (p.numbers.has(v)) {
    const num = p.numbers.get(v);
    if (num !== game.next) { blowFuse('WRONG TERMINAL (' + num + ')'); return; }
    if (num === p.count && w.length + 1 !== p.N) { blowFuse('TOO EARLY — FILL EVERY CELL'); return; }
  }
  w.push(v); game.retracting = false;
  {
    const g = geom(), c = centre(v, g);
    if (p.numbers.has(v)) {                                            // a terminal locks in with a ring and a burst
      fxCell(v, '#4dff88'); fxRing(c.x, c.y, '#4dff88', g.cell * 0.3, g.cell * 1.1, 0.6);
      fxSpark(c.x, c.y, 14, '#4dff88', 320);
    } else fxCell(v, '#29e0ff');                                       // plain cells just flash as they fill
  }
  if (p.numbers.has(v)) { game.next++; Sfx.terminal(); setMsg(game.next <= p.count ? 'WIRE TO ' + game.next : 'CLOSE THE CIRCUIT', ''); }
  else Sfx.step(w.length);
  if (w.length === p.N && v === p.end) { win(); draw(); return; }
  /* dead end: nowhere legal to go from here — just say so. Backing out is free, so this costs nothing. */
  const moves = neighbours(v, p).filter(u => !w.includes(u) && !p.walls.has(edgeKey(v, u)) && (!p.numbers.has(u) || (p.numbers.get(u) === game.next && (game.next !== p.count || w.length + 1 === p.N))));
  if (!moves.length) { Sfx.buzz(); setMsg('DEAD END — DRAG BACK', 'bad'); }
  draw();
}
/* Tapping a numbered terminal rewinds the circuit to that number: everything wired after it is
   dropped and drawing carries on from the terminal you touched. Free — this is an undo, not a mistake. */
function tapCell(v) {
  if (!game.active || game.busy) return;
  const p = game.puzzle, w = game.wire;
  if (!p.numbers.has(v)) { tryMove(v); return; }             // plain cell: behaves exactly as before
  const num = p.numbers.get(v);
  const at = w.indexOf(v);
  if (at >= 0) {                                             // already wired: cut everything after it
    if (at === w.length - 1) return;                         // already the live end
    game.wire = w.slice(0, at + 1);
    game.next = num + 1;
    game.retracting = false;
    setMsg(game.next <= p.count ? 'REWOUND - WIRE TO ' + game.next : 'CLOSE THE CIRCUIT', '');
    Sfx.click(); draw(); return;
  }
  if (num === 1) {                                           // tapping 1 starts the whole circuit over
    game.wire = [v]; game.next = 2; game.retracting = false;
    setMsg('WIRE TO 2', ''); Sfx.terminal(); draw(); return;
  }
  if (!w.length) { setMsg('START AT 1', 'bad'); Sfx.buzz(); return; }
  if (num === game.next) { tryMove(v); return; }             // wiring into the terminal you are due — normal rules
  setMsg('REACH ' + game.next + ' FIRST', 'bad'); Sfx.buzz();  // a tap never costs a fuse, only wiring into one does
}

function neighbours(v, p) { const r = (v / p.C) | 0, c = v % p.C, out = []; if (r > 0) out.push(v - p.C); if (r < p.R - 1) out.push(v + p.C); if (c > 0) out.push(v - 1); if (c < p.C - 1) out.push(v + 1); return out; }

function win() {
  game.busy = true;
  bulbLight();
  /* power surges along the finished wire, cell by cell */
  fx.surge = { t: 0 };
  { const g = geom(), c = centre(game.wire[game.wire.length - 1], g); fxRing(c.x, c.y, '#4dff88', g.cell * 0.3, g.cell * 2.6, 0.8); }
  game.score++;                                          // the score is simply the circuits you close
  $('hud-score').textContent = '⚡ ' + game.score;
  setMsg('POWER ON!', 'good');
  Sfx.win(); Sfx.yay();                                   // the happy one, same as Electrical Troll
  $('toast-text').textContent = '⚡ CIRCUIT ' + game.score + ' CLOSED!';
  $('overlay-toast').classList.add('show');
  setTimeout(() => {
    $('overlay-toast').classList.remove('show');
    if (!game.active) return;
    game.level++; newLevel();
  }, 1300);
}

function resetWire() {
  if (!game.active || game.busy || !game.wire.length) return;
  game.wire = []; game.next = 1; game.retracting = false;
  Sfx.click(); setMsg('START AT 1', ''); draw();
}

function endRun(reason) {
  game.active = false;
  const levelsDone = game.level - 1;
  const rank = addScore({ name: game.player, score: game.score, level: levelsDone });   // score = circuits closed
  $('summary-title').textContent = reason === 'fuses' ? '💥 ALL FUSES BLOWN' : (reason === 'time' ? "⏱ TIME'S UP!" : '🔌 RUN ENDED');
  $('summary-name').dataset.level = game.level;
  $('summary-title').className = 'title ' + (reason === 'fuses' ? 'warn' : (reason === 'time' ? 'warn' : ''));
  $('summary-name').textContent = game.player;
  $('summary-score').innerHTML = fmtPts(game.score) + '<span class="score-unit">CIRCUITS</span>';
  const r = $('summary-rank');
  r.classList.toggle('record', rank === 1 && game.score > 0);
  r.textContent = game.score === 0 ? 'NO CIRCUITS CLOSED... TRY AGAIN!' : (rank === 1 ? '🎉 NEW HIGH SCORE! 🎉' : '#' + rank + ' ON THE SCOREBOARD');
  $('summary-stats').textContent = `IN 2 MINUTES · REACHED LEVEL ${game.level} · FUSES LEFT: ${game.fuses}`;
  renderMascot(levelsDone >= 10 ? 'salute' : (reason === 'fuses' ? 'shock' : 'cheer'), $('summary-mascot'), 'images/logo.png');
  $('summary-balloon').textContent = game.score >= 10 ? `${game.score} circuits in two minutes. You could wire our whole plant. Respect!`
    : game.score >= 5 ? `${game.score} circuits in two minutes. Sharp work!`
    : (reason === 'fuses' ? (game.score === 0 ? 'Three fuses, zero circuits. The board sends its regards.' : 'Every fuse gone before the clock. The board wins this one.')
      : game.score === 0 ? 'Two minutes, zero circuits. The board sends its regards.'
      : 'Time is up. Beat that on your next turn!');
  show('summary');
  if (reason === 'fuses' || reason === 'time') Sfx.over();
  if (rank === 1 && game.score > 0) setTimeout(() => Sfx.record(), 700);
}

/* ---------- board rendering ---------- */
const canvas = $('board'), ctx = canvas.getContext('2d');
let flash = 0, raf = 0;
/* Busby sits on the live end of the wire: grinning while it goes well, out cold when a fuse blows */
let headSprites = null;
buildMascotSprites(sprites => { headSprites = sprites; });
function headMood() {
  if (bulb && (bulb.mode === 'flare' || bulb.mode === 'boom')) return 'dead';
  if (bulb && bulb.lit) return 'cheer';
  return 'idle';
}
/* ---------- board effects: sparks, rings, cell pulses, the winning surge ---------- */
const fx = { parts: [], rings: [], pulses: new Map(), surge: null, shake: 0, intro: 0, vignette: 0, fail: 0 };
function fxReset(intro) { fx.parts = []; fx.rings = []; fx.pulses.clear(); fx.surge = null; fx.shake = 0; fx.vignette = 0; fx.fail = 0; fx.intro = intro ? 1 : 0; }
function fxSpark(x, y, count, colour, speed = 260) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random());
    fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.35 + Math.random() * 0.5, colour, size: 2 + Math.random() * 3 });
  }
}
function fxRing(x, y, colour, r0 = 10, grow = 90, max = 0.55) { fx.rings.push({ x, y, colour, r0, grow, life: 0, max }); }
function fxCell(v, colour) { fx.pulses.set(v, { t: 0, colour }); }
function fxShake(a) { fx.shake = Math.max(fx.shake, a); }

/* ---------- the board ----------
   Board coordinates are (u, v) in pixels measured from the middle of the board, h is the height above it.
   The view is straight on and flat — the grid stays a true square, no lean, no rows shrinking into the
   distance — but anything with height still stands up off the board: h simply lifts it up the screen,
   which is what gives the pads, walls, posts and cable their thickness.
   Everything drawn goes through proj(); cellAt() runs the same maths backwards. */
const LIFT = 0;                                  // 0 = the grid is drawn flat; only the cable keeps its depth
const SIN_T = LIFT, COS_T = 1;                   // COS_T = 1: every row is the same size, board stays square
const ORTHO = 2e6;                               // a camera so far away the perspective flattens out

function proj(u, v, h, g) {
  const z = g.D - h * COS_T - v * SIN_T;
  const s = g.F / z;                             // ~1 everywhere: nothing shrinks with depth any more
  return { x: g.cx + u * s, y: g.cy - (h * SIN_T - v * COS_T) * s, s };
}

/* Picks the biggest cell size whose projected board still fits the canvas, then centres it. */
const geom = () => {
  const p = game.puzzle;
  const W = canvas.width, H = canvas.height;
  const pad = p.C >= 8 || p.R >= 8 ? 16 : 26;
  const D = ORTHO;                               // flat view: no perspective, only the raised edges
  let cell = Math.min((W - pad * 2) / p.C, (H - pad * 2) / (p.R * COS_T + 1.2));
  let g = null;
  for (let pass = 0; pass < 4; pass++) {
    g = { cell, R: p.R, C: p.C, D, F: D, cx: W / 2, cy: H / 2,
          bw: cell * p.C, bh: cell * p.R, tileH: cell * 0.22, slab: cell * 0.5 };
    const m = cell * 0.34;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const u of [-g.bw / 2 - m, g.bw / 2 + m])
      for (const v of [-g.bh / 2 - m, g.bh / 2 + m])
        for (const h of [-g.slab, g.tileH + cell * 0.62]) {
          const q = proj(u, v, h, g);
          if (q.x < minX) minX = q.x; if (q.x > maxX) maxX = q.x;
          if (q.y < minY) minY = q.y; if (q.y > maxY) maxY = q.y;
        }
    g.cy += H / 2 - (minY + maxY) / 2;
    const k = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
    if (k > 0.99 && k < 1.02) break;
    cell *= Math.min(k, 1.25);
  }
  return g;
};
/* the middle of a cell's top face, in screen pixels — sparks and rings still work in screen space */
const centre = (v, g) => proj(-g.bw / 2 + (v % g.C + 0.5) * g.cell, -g.bh / 2 + (((v / g.C) | 0) + 0.5) * g.cell, g.tileH, g);

let lastDraw = performance.now();
function draw() {
  if (!game.puzzle) return;
  const now = performance.now(), dt = Math.min(0.05, (now - lastDraw) / 1000); lastDraw = now;
  const p = game.puzzle, g = geom(), t = now / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* effects clocks */
  if (fx.intro > 0) fx.intro = Math.max(0, fx.intro - dt * 1.25);
  fx.shake = Math.max(0, fx.shake - dt * 3);
  fx.vignette = Math.max(0, fx.vignette - dt * 1.6);
  fx.fail = Math.max(0, fx.fail - dt * 0.7);                 // red fades back to live cyan
  if (fx.surge) { fx.surge.t += dt; if (fx.surge.t > 1.6) fx.surge = null; }
  for (const [v, pulse] of fx.pulses) { pulse.t += dt * 2.6; if (pulse.t >= 1) fx.pulses.delete(v); }

  ctx.save();
  if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * 26 * fx.shake, (Math.random() - 0.5) * 26 * fx.shake);

  /* how far the winning surge has travelled along the wire */
  const surgeAt = fx.surge ? fx.surge.t / 0.9 * game.wire.length : -1;

  /* ---------- the board, drawn back to front ---------- */
  const T = g.tileH, INSET = Math.max(2, g.cell * 0.05);
  const P = (u, v, h) => proj(u, v, h, g);
  const quad = pts => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); };
  const face = (pts, fill) => { ctx.fillStyle = fill; quad(pts); ctx.fill(); };
  const corners = (col, row, h, inset) => {
    const x0 = -g.bw / 2 + col * g.cell + inset, x1 = x0 + g.cell - inset * 2;
    const y0 = -g.bh / 2 + row * g.cell + inset, y1 = y0 + g.cell - inset * 2;
    return [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)];   // back-left, back-right, front-right, front-left
  };
  /* top face catches the light, the front is in shadow, the side sits in between */
  /* flat pads: a calm board so the cable is what your eye follows */
  const PAL = {
    idle:  { top: '#15224b', edge: '#2f4578', pad: 'rgba(139,155,196,.35)' },
    live:  { top: '#0f4b68', edge: 'rgba(120,240,255,.85)', pad: 'rgba(200,250,255,.7)' },
    surge: { top: '#0e5c3c', edge: 'rgba(150,255,190,.9)', pad: 'rgba(210,255,230,.75)' },
    dead:  { top: '#5e1a2c', edge: 'rgba(255,120,140,.85)', pad: 'rgba(255,190,200,.65)' }
  };

  /* the circuit board itself: a slab with a visible edge, so the cells have something to stand on */
  {
    const m = g.cell * 0.34, x0 = -g.bw / 2 - m, x1 = g.bw / 2 + m, y0 = -g.bh / 2 - m, y1 = g.bh / 2 + m;
    const t4 = [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    face(t4, '#0a1330');
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(41,224,255,.22)'; ctx.lineWidth = 2; quad(t4); ctx.stroke();
    ctx.restore();
  }

  /* cells: little raised pads, near rows drawn last so they overlap the ones behind */
  const cx0 = (p.C - 1) / 2, cy0 = (p.R - 1) / 2;
  for (let v = 0; v < p.N; v++) {
    const col = v % p.C, row = (v / p.C) | 0;
    const wireIdx = game.wire.indexOf(v), inWire = wireIdx >= 0;
    let h = T, inset = INSET, alpha = 1;
    if (fx.intro > 0) {                                              /* new level: the cells drop onto the board */
      const dist = Math.hypot(col - cx0, row - cy0) / Math.hypot(cx0 + 1, cy0 + 1);
      const k = Math.max(0, Math.min(1, (1 - fx.intro) * 1.9 - dist * 0.7));
      if (k <= 0) continue;
      const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
      h = T + (1 - e) * g.cell * 0.9;
      inset = INSET + (1 - e) * g.cell * 0.2;
      alpha = k;
    }
    const pulse = fx.pulses.get(v);
    const surged = surgeAt >= 0 && wireIdx >= 0 && wireIdx <= surgeAt;
    const dead = inWire && fx.fail > 0;                               // everything already connected reads as faulty
    const pal = dead ? PAL.dead : surged ? PAL.surge : inWire ? PAL.live : PAL.idle;
    const c = P(-g.bw / 2 + (col + 0.5) * g.cell, -g.bh / 2 + (row + 0.5) * g.cell, h);
    const half = (g.cell - inset * 2) / 2, rad = Math.max(6, g.cell * 0.13);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pulse) { ctx.shadowColor = pulse.colour; ctx.shadowBlur = 30 * (1 - pulse.t); }
    ctx.fillStyle = pal.top;
    roundRect(c.x - half, c.y - half, half * 2, half * 2, rad); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = pal.edge; ctx.lineWidth = 2 + (pulse ? 3 * (1 - pulse.t) : 0);
    roundRect(c.x - half, c.y - half, half * 2, half * 2, rad); ctx.stroke();
    /* solder pad in the middle of the cell */
    ctx.fillStyle = pal.pad;
    ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* walls: hazard-striped blocks standing on the board between two cells */
  for (const key of p.walls) {
    const [a, b] = key.split('-').map(Number);
    const vertical = Math.abs(a - b) === 1;                           // a bar standing between side-by-side cells
    const ex = -g.bw / 2 + (((a % p.C) + (b % p.C)) / 2 + 0.5) * g.cell;
    const ey = -g.bh / 2 + ((((a / p.C) | 0) + ((b / p.C) | 0)) / 2 + 0.5) * g.cell;
    const hx = vertical ? g.cell * 0.07 : g.cell * 0.44;
    const hy = vertical ? g.cell * 0.44 : g.cell * 0.07;
    const hTop = T + g.cell * 0.32;
    const t4 = [P(ex - hx, ey - hy, hTop), P(ex + hx, ey - hy, hTop), P(ex + hx, ey + hy, hTop), P(ex - hx, ey + hy, hTop)];
    ctx.save();
    face(t4, '#ffd60a');
    const N = 5;                                                      // black hazard dashes along the bar
    for (let i = 0; i < N; i += 2) {
      const f0 = -1 + (i / N) * 2, f1 = -1 + ((i + 1) / N) * 2;
      face(vertical
        ? [P(ex - hx, ey + hy * f0, hTop), P(ex + hx, ey + hy * f0, hTop), P(ex + hx, ey + hy * f1, hTop), P(ex - hx, ey + hy * f1, hTop)]
        : [P(ex + hx * f0, ey - hy, hTop), P(ex + hx * f1, ey - hy, hTop), P(ex + hx * f1, ey + hy, hTop), P(ex + hx * f0, ey + hy, hTop)],
        '#12100a');
    }
    ctx.restore();
  }

  /* the wire: a cable lying on top of the pads, thinning towards the back of the board */
  if (game.wire.length) {
    const pts = game.wire.map(v => centre(v, g));
    const live = fx.surge ? '#4dff88' : '#7ff0ff';
    const halo = fx.surge ? 'rgba(77,255,136,.4)' : 'rgba(41,224,255,.35)';
    const path = () => { ctx.beginPath(); pts.forEach((c, i) => i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)); };
    const avg = pts.reduce((a, c) => a + c.s, 0) / pts.length;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path(); ctx.strokeStyle = halo; ctx.lineWidth = g.cell * 0.42 * avg;
    ctx.shadowColor = fx.surge ? '#4dff88' : '#29e0ff'; ctx.shadowBlur = 24 + (fx.surge ? 24 : 0); ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 1; i < pts.length; i++) {                            // per segment, so the cable has depth
      const a = pts[i - 1], b = pts[i], sc = (a.s + b.s) / 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(2,10,28,.6)'; ctx.lineWidth = g.cell * 0.3 * sc; ctx.stroke();   // dark rim = round cable
      ctx.strokeStyle = live; ctx.lineWidth = g.cell * 0.22 * sc; ctx.stroke();
      ctx.save();
      ctx.translate(0, -g.cell * 0.05 * sc);                          // highlight sits on the upper side of the tube
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = g.cell * 0.05 * sc; ctx.stroke();
      ctx.restore();
    }
    /* dashes flowing from terminal 1 towards the head: the current itself */
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([g.cell * 0.14 * avg, g.cell * 0.34 * avg]);
    ctx.lineDashOffset = -t * g.cell * avg * (fx.surge ? 4.5 : 1.6);
    ctx.strokeStyle = fx.surge ? '#dfffe9' : '#d8fbff'; ctx.lineWidth = g.cell * 0.1 * avg;
    path(); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    /* a blown fuse kills the line: the drawn circuit glows red until it recovers */
    if (fx.fail > 0) {
      ctx.globalAlpha = Math.min(1, fx.fail);
      ctx.shadowColor = '#ff3d5a'; ctx.shadowBlur = 26;
      path(); ctx.strokeStyle = 'rgba(255,61,90,.55)'; ctx.lineWidth = g.cell * 0.42 * avg; ctx.stroke();
      ctx.shadowBlur = 0;
      path(); ctx.strokeStyle = '#ff6b7f'; ctx.lineWidth = g.cell * 0.22 * avg; ctx.stroke();
      path(); ctx.strokeStyle = '#ffd7dd'; ctx.lineWidth = g.cell * 0.06 * avg; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    /* the surge front: a bright bead racing to the end */
    if (fx.surge && surgeAt >= 0 && surgeAt < game.wire.length) {
      const i = Math.floor(surgeAt), fq = surgeAt - i;
      const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)];
      const x = a.x + (b.x - a.x) * fq, y = a.y + (b.y - a.y) * fq;
      ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 30; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, g.cell * 0.2 * a.s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (Math.random() < 0.6) fxSpark(x, y, 2, '#bfffd4', 180);
    }
  }

  /* terminals: numbered posts sticking up out of the board */
  for (const [v, num] of p.numbers) {
    const c = centre(v, g), done = game.wire.includes(v), isNext = num === game.next && !done;
    const r = g.cell * 0.3 * c.s, ry = r * COS_T;
    const lift = g.cell * 0.16 * c.s * SIN_T;                          // how tall the post looks from here
    ctx.save();
    if (isNext) {                                                      /* the terminal you are due keeps calling you */
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 3;
      ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 40;
      const rr = r + 12 + Math.sin(t * 4) * 3;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * COS_T, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 18 + Math.sin(t * 6) * 8;
    }
    const deadT = done && fx.fail > 0.15;
    const top = deadT ? '#ff5f76' : done ? '#4dff88' : (isNext ? '#ffd60a' : '#1a2550');
    const side = deadT ? '#8e1024' : done ? '#1a7f40' : (isNext ? '#9c7400' : '#0d1533');
    if (lift > 0.5) {                                    // only when the board is drawn with height
      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.moveTo(c.x - r, c.y - lift);
      ctx.lineTo(c.x - r, c.y);
      ctx.ellipse(c.x, c.y, r, ry, 0, Math.PI, 0, true);
      ctx.lineTo(c.x + r, c.y - lift);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = top;
    ctx.strokeStyle = deadT ? '#a3122a' : done ? '#1f8f48' : (isNext ? '#b38600' : '#4b64a3'); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(c.x, c.y - lift, r, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    /* the number lies flat on the top of the post */
    ctx.save();
    ctx.translate(c.x, c.y - lift); ctx.scale(1, COS_T);
    ctx.fillStyle = done || isNext ? '#0b1020' : '#f4f7ff';
    ctx.font = `${Math.round(g.cell * 0.38 * c.s)}px Bangers, Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 2);
    ctx.restore();
    ctx.restore();
  }

  /* Busby rides the live end of the wire — drawn last so nothing on the board hides him */
  if (game.wire.length) {
    const head = game.wire[game.wire.length - 1];
    const h = centre(head, g);
    const onTerminal = p.numbers.has(head);
    const mood = headMood();
    const img = headSprites && headSprites[mood];
    ctx.save();
    /* his shadow on the board, and the glow he stands in */
    ctx.fillStyle = 'rgba(2,6,18,.45)';
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, g.cell * 0.2 * h.s, g.cell * 0.2 * h.s * COS_T, 0, 0, Math.PI * 2); ctx.fill();
    if (!onTerminal) {
      ctx.shadowColor = mood === 'dead' ? '#ff3d5a' : '#29e0ff'; ctx.shadowBlur = 26;
      ctx.fillStyle = mood === 'dead' ? 'rgba(255,61,90,.3)' : 'rgba(180,245,255,.38)';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, (g.cell * 0.26 + Math.sin(t * 8) * 2) * h.s, (g.cell * 0.26 + Math.sin(t * 8) * 2) * h.s * COS_T, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (img && img.complete && img.naturalWidth) {
      const hh = g.cell * 0.78 * h.s, hw = hh * (200 / 232);
      const bob = mood === 'dead' ? 0 : Math.sin(t * 6) * g.cell * 0.03 * h.s;
      /* standing on a post he steps up onto it, so the number stays readable under him */
      const lift = onTerminal ? g.cell * 0.2 * h.s * SIN_T : 0;
      ctx.translate(h.x, h.y + bob - lift);
      if (mood === 'dead') ctx.rotate(0.25);                            // keeled over
      ctx.drawImage(img, -hw / 2, -hh * 0.9, hw, hh);
    } else {                                                            // sprites still rasterizing
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(h.x, h.y, g.cell * 0.16 * h.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  /* rings, sparks */
  for (const ring of fx.rings) {
    ring.life += dt; const k = ring.life / ring.max; if (k > 1) continue;
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = ring.colour; ctx.lineWidth = 8 * (1 - k);
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r0 + ring.grow * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  fx.rings = fx.rings.filter(r => r.life < r.max);
  for (const q of fx.parts) {
    q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 420 * dt; q.vx *= 0.97;
    const a = Math.max(0, 1 - q.life / q.max); if (a <= 0) continue;
    ctx.globalAlpha = a; ctx.fillStyle = q.colour;
    ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  fx.parts = fx.parts.filter(q => q.life < q.max);

  ctx.restore();                                            // end of the shake transform

  /* a red wash across the board when a fuse goes */
  if (fx.vignette > 0) {
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.72);
    vg.addColorStop(0, 'rgba(255,61,90,0)');
    vg.addColorStop(1, `rgba(255,61,90,${(0.55 * fx.vignette).toFixed(3)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  /* short-circuit flash */
  if (flash > 0) { ctx.fillStyle = `rgba(255,61,90,${flash * 0.35})`; ctx.fillRect(0, 0, canvas.width, canvas.height); flash = Math.max(0, flash - 0.05); }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

let lastFrame = performance.now();
function loop() {
  raf = requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.05, (now - lastFrame) / 1000);
  governPerf(now - lastFrame);
  lastFrame = now;
  if (current === 'game') { drawBulb(dt); draw(); }        // keeps burning / smoking while a message is up
  if (!game.active) return;
  if (game.started && !game.busy && game.timeLeft > 0) {   // runs from the first move; stops while a level is being cleared
    const was = Math.ceil(game.timeLeft);
    game.timeLeft = Math.max(0, game.timeLeft - dt);
    const left = Math.ceil(game.timeLeft);
    if (left !== was) {
      showClock();
      if (left > 0 && left <= 10) Sfx.tick();              // the last ten seconds get loud
    }
    if (game.timeLeft <= 0) timeUp();
  }
}

/* ---------- pointer → cells ---------- */
/* ---------- the bulb beside the board ----------
   It charges as the circuit fills, detonates when a fuse goes and blazes when the wire is complete.
   The blast runs in stages: the filament flares white-hot, the glass bursts into spinning shards on a
   shockwave, embers and sparks rain down, smoke rolls up, and the bare socket keeps arcing for a while
   before a new bulb screws itself in. ---------- */
const bulbCv = $('bulb'), bx = bulbCv.getContext('2d');
/* ---------- smoothness guard ----------
   Glow blur is the costliest thing Zip draws. If a device keeps missing frames during play, the blur
   (and the stage's CSS glow effects, via .low-fx) switch off for the rest of the visit. */
const perf = { ema: 16, slowFor: 0, lowFx: /[?&]lowfx=1/.test(location.search) };
const BLUR = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
for (const c of [ctx, bx]) if (BLUR && BLUR.set) Object.defineProperty(c, 'shadowBlur', {
  configurable: true, get() { return BLUR.get.call(this); }, set(v) { BLUR.set.call(this, perf.lowFx ? 0 : v); }
});
if (perf.lowFx) $('stage').classList.add('low-fx');
function governPerf(dtMs) {
  if (perf.lowFx || current !== 'game' || document.hidden || dtMs <= 0 || dtMs > 250) return;
  perf.ema += (dtMs - perf.ema) * 0.05;
  perf.slowFor = perf.ema > 24 ? perf.slowFor + dtMs : 0;
  if (perf.slowFor > 1500) { perf.lowFx = true; $('stage').classList.add('low-fx'); }
}
const bulb = { glow: 0, t: 0, mode: 'ok', shards: [], smoke: [], sparks: [], embers: [], rings: [],
  flash: 0, white: 0, shake: 0, lit: false, litT: 0, reform: 1, arc: 0 };

function bulbBoom() {
  bulb.mode = 'flare'; bulb.t = 0; bulb.lit = false; bulb.litT = 0; bulb.reform = 0; bulb.arc = 2.0;
  bulb.shards = []; bulb.smoke = []; bulb.sparks = []; bulb.embers = []; bulb.rings = [];
  bulb.glow = 2.6;                                          // the filament overloads before it goes
}
function bulbBurst() {
  bulb.mode = 'boom'; bulb.flash = 1; bulb.white = 1; bulb.shake = 1;
  bulb.rings.push({ r: 10, life: 0, max: 0.75 }, { r: 0, life: -0.08, max: 0.9 });
  for (let i = 0; i < 46; i++) {                            // glass
    const ang = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 620;
    bulb.shards.push({ x: Math.cos(ang) * 22, y: Math.sin(ang) * 22, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 190,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 20, s: 6 + Math.random() * 22, life: 0, max: 1.1 + Math.random() * 0.7 });
  }
  for (let i = 0; i < 34; i++) {                            // white-hot sparks
    const ang = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 420;
    bulb.sparks.push({ x: 0, y: 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.3 + Math.random() * 0.6 });
  }
  for (let i = 0; i < 16; i++) {                            // embers of the burnt filament
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 60 + Math.random() * 260;
    bulb.embers.push({ x: 0, y: 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.9 + Math.random() * 1.1, s: 2 + Math.random() * 3 });
  }
  for (let i = 0; i < 12; i++) bulb.smoke.push({ x: (Math.random() - 0.5) * 60, y: 6, vx: (Math.random() - 0.5) * 34,
    vy: -30 - Math.random() * 54, r: 14 + Math.random() * 24, life: 0, max: 1.3 + Math.random() * 1.1 });
}
function bulbLight() { bulb.lit = true; bulb.litT = 0; bulb.mode = 'ok'; bulb.reform = 1; bulb.rings.push({ r: 20, life: 0, max: 0.9, warm: true }); Sfx.hum(); }
function bulbReset() { bulb.mode = 'ok'; bulb.lit = false; bulb.litT = 0; bulb.glow = 0; bulb.reform = 1; bulb.arc = 0;
  bulb.shards = []; bulb.smoke = []; bulb.sparks = []; bulb.embers = []; bulb.rings = []; bulb.flash = 0; bulb.white = 0; bulb.shake = 0; }
function roundRectOn(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

/* a ragged electric arc between two points */
function drawArc(c, x1, y1, x2, y2, spread, colour, width) {
  c.strokeStyle = colour; c.lineWidth = width; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1);
  const steps = 5;
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    c.lineTo(x1 + (x2 - x1) * k + (Math.random() - 0.5) * spread, y1 + (y2 - y1) * k + (Math.random() - 0.5) * spread);
  }
  c.lineTo(x2, y2); c.stroke();
}

function drawBulb(dt) {
  const W = bulbCv.width, H = bulbCv.height, cx = W / 2, cy = H * 0.40, R = 108;
  bx.clearRect(0, 0, W, H);
  bulb.t += dt;
  if (bulb.mode === 'flare' && bulb.t > 0.14) { bulbBurst(); Sfx.smash(); }        // flare, then the glass lets go
  if (bulb.mode === 'boom' && bulb.t > 1.9) { bulb.mode = 'ok'; bulb.reform = 0; } // a fresh bulb screws itself in
  if (bulb.mode === 'ok' && bulb.reform < 1) bulb.reform = Math.min(1, bulb.reform + dt * 1.6);
  if (bulb.lit) bulb.litT += dt;
  bulb.arc = Math.max(0, bulb.arc - dt);
  bulb.flash = Math.max(0, bulb.flash - dt * 2.4);
  bulb.white = Math.max(0, bulb.white - dt * 5.5);
  bulb.shake = Math.max(0, bulb.shake - dt * 2.2);

  const p = game.puzzle;
  const prog = p && p.N ? game.wire.length / p.N : 0;
  const flaring = bulb.mode === 'flare';
  const broken = bulb.mode === 'boom';
  /* switching on surges past full brightness before settling, the way a real filament does */
  const surge = bulb.lit ? 1 + Math.max(0, 0.55 - bulb.litT * 1.6) : 0;
  const want = flaring ? 2.6 : broken ? 0 : (bulb.lit ? surge : prog * 0.62);
  bulb.glow += (want - bulb.glow) * Math.min(1, dt * (flaring ? 30 : 6));
  const flick = bulb.lit ? 1 + Math.sin(bulb.t * 24) * 0.035 + Math.sin(bulb.t * 6.3) * 0.022 : 1;
  const G = Math.max(0, bulb.glow) * flick;
  const baseTop = cy + R * 0.86;

  bx.save();
  if (bulb.shake > 0) bx.translate((Math.random() - 0.5) * 22 * bulb.shake, (Math.random() - 0.5) * 22 * bulb.shake);

  /* cord and ceiling rose */
  bx.strokeStyle = '#3a4a78'; bx.lineWidth = 8; bx.lineCap = 'round';
  bx.beginPath(); bx.moveTo(cx, 0); bx.lineTo(cx, cy - R - 56); bx.stroke();
  bx.fillStyle = '#24365f'; roundRectOn(bx, cx - 30, cy - R - 62, 60, 16, 7); bx.fill();

  /* halo, and rays once it is fully lit */
  if (G > 0.02 && !broken) {
    const grd = bx.createRadialGradient(cx, cy, R * 0.12, cx, cy, R * (2.1 + Math.min(1.4, G) * 0.9));
    grd.addColorStop(0, 'rgba(255,236,178,' + Math.min(0.85, 0.6 * G).toFixed(3) + ')');
    grd.addColorStop(0.35, 'rgba(255,196,70,' + Math.min(0.5, 0.26 * G).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(255,170,40,0)');
    bx.fillStyle = grd; bx.fillRect(-W, -H, W * 3, H * 3);
    if (bulb.lit) {
      bx.save(); bx.translate(cx, cy); bx.globalAlpha = 0.14 + Math.sin(bulb.t * 3.1) * 0.035; bx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 12; i++) { bx.rotate(Math.PI / 6); const len = R * (2.0 + (i % 3) * 0.26);
        bx.beginPath(); bx.moveTo(0, -R * 1.05); bx.lineTo(-10, -len); bx.lineTo(10, -len); bx.closePath(); bx.fill(); }
      bx.restore();
    }
  }

  /* shockwave rings */
  for (const ring of bulb.rings) {
    ring.life += dt; if (ring.life < 0) continue;
    const k = ring.life / ring.max; if (k > 1) continue;
    bx.save(); bx.globalAlpha = (1 - k) * (ring.warm ? 0.5 : 0.75);
    bx.strokeStyle = ring.warm ? '#ffe9a8' : '#ffffff'; bx.lineWidth = (ring.warm ? 8 : 12) * (1 - k);
    bx.beginPath(); bx.arc(cx, cy, ring.r + k * R * (ring.warm ? 2.2 : 3.4), 0, Math.PI * 2); bx.stroke(); bx.restore();
  }
  bulb.rings = bulb.rings.filter(r => r.life < r.max);

  /* ---------- the screw cap: a metal cylinder, lit from the upper left ---------- */
  bx.save();
  const capW = 44, capW2 = 38, capH = 78;
  const metal = bx.createLinearGradient(cx - capW, 0, cx + capW, 0);
  metal.addColorStop(0, '#333c56'); metal.addColorStop(0.16, '#78839f');
  metal.addColorStop(0.36, '#e6ebf6'); metal.addColorStop(0.56, '#a8b1c7');
  metal.addColorStop(0.8, '#626c86'); metal.addColorStop(1, '#2c3449');
  bx.fillStyle = metal;
  bx.beginPath();
  bx.moveTo(cx - capW, baseTop); bx.lineTo(cx + capW, baseTop);
  bx.lineTo(cx + capW2, baseTop + capH); bx.lineTo(cx - capW2, baseTop + capH);
  bx.closePath(); bx.fill();
  /* you look slightly down on it, so the top rim shows as an ellipse with the glass sunk into it */
  bx.fillStyle = '#ccd4e6';
  bx.beginPath(); bx.ellipse(cx, baseTop, capW, 10, 0, 0, Math.PI * 2); bx.fill();
  bx.fillStyle = 'rgba(16,24,46,.5)';
  bx.beginPath(); bx.ellipse(cx, baseTop + 1, capW * 0.7, 6, 0, 0, Math.PI * 2); bx.fill();
  /* threads: every ridge catches the light on top and falls into shadow underneath */
  for (let i = 0; i < 4; i++) {
    const y = baseTop + 15 + i * 16, hw = capW - 1.5 - i * 1.6;
    bx.strokeStyle = 'rgba(255,255,255,.34)'; bx.lineWidth = 3;
    bx.beginPath(); bx.moveTo(cx - hw, y - 2); bx.quadraticCurveTo(cx, y + 7, cx + hw, y - 2); bx.stroke();
    bx.strokeStyle = 'rgba(18,26,48,.55)'; bx.lineWidth = 4;
    bx.beginPath(); bx.moveTo(cx - hw, y + 3); bx.quadraticCurveTo(cx, y + 12, cx + hw, y + 3); bx.stroke();
  }
  /* insulator ring and the contact button at the very bottom */
  bx.fillStyle = '#1d2540';
  bx.beginPath(); bx.ellipse(cx, baseTop + capH, capW2, 12, 0, 0, Math.PI * 2); bx.fill();
  bx.fillStyle = '#525d7c';
  bx.beginPath(); bx.ellipse(cx, baseTop + capH + 7, 17, 7.5, 0, 0, Math.PI * 2); bx.fill();
  bx.fillStyle = 'rgba(255,255,255,.35)';
  bx.beginPath(); bx.ellipse(cx - 5, baseTop + capH + 5, 6, 2.6, 0, 0, Math.PI * 2); bx.fill();
  bx.restore();

  /* ---------- the glass: a ball with a lit side, a shadowed side and a rim light ---------- */
  const scale = broken ? 0 : bulb.reform;
  if (scale > 0.02) {
    const lit = Math.min(1, G);
    bx.save();
    bx.translate(cx, cy); bx.scale(scale, scale); bx.translate(-cx, -cy);

    /* the neck flaring down into the cap, shaded round like a cone */
    const neck = bx.createLinearGradient(cx - 48, 0, cx + 48, 0);
    neck.addColorStop(0, 'rgba(52,80,136,.5)'); neck.addColorStop(0.34, 'rgba(168,198,240,.42)');
    neck.addColorStop(0.64, 'rgba(104,140,196,.4)'); neck.addColorStop(1, 'rgba(40,66,118,.5)');
    bx.fillStyle = neck;
    bx.beginPath();                                    // shoulders curving out of the cap into the ball
    bx.moveTo(cx - 41, baseTop + 3);
    bx.quadraticCurveTo(cx - 52, cy + R * 0.86, cx - R * 0.62, cy + R * 0.74);
    bx.quadraticCurveTo(cx, cy + R * 0.94, cx + R * 0.62, cy + R * 0.74);
    bx.quadraticCurveTo(cx + 52, cy + R * 0.86, cx + 41, baseTop + 3);
    bx.closePath(); bx.fill();

    /* body of the glass — the light sits up and to the left, so the far side goes dark */
    const gg = bx.createRadialGradient(cx - R * 0.36, cy - R * 0.42, R * 0.05, cx - R * 0.04, cy - R * 0.02, R * 1.08);
    gg.addColorStop(0, 'rgba(255,255,255,' + (0.3 + 0.6 * lit).toFixed(3) + ')');
    gg.addColorStop(0.42, 'rgba(198,226,255,' + (0.15 + 0.34 * lit).toFixed(3) + ')');
    gg.addColorStop(0.8, 'rgba(96,140,205,' + (0.22 + 0.16 * lit).toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(48,78,140,.34)');
    bx.fillStyle = gg;
    bx.beginPath(); bx.arc(cx, cy, R, 0, Math.PI * 2); bx.fill();

    /* when it is on, the whole volume glows from the filament outwards */
    if (G > 0.03) {
      const wg = bx.createRadialGradient(cx, cy + R * 0.05, R * 0.04, cx, cy, R);
      wg.addColorStop(0, 'rgba(255,242,198,' + Math.min(0.92, 0.52 * G).toFixed(3) + ')');
      wg.addColorStop(0.55, 'rgba(255,206,108,' + Math.min(0.6, 0.3 * G).toFixed(3) + ')');
      wg.addColorStop(1, 'rgba(255,170,50,0)');
      bx.fillStyle = wg;
      bx.beginPath(); bx.arc(cx, cy, R, 0, Math.PI * 2); bx.fill();
    }
    /* the thickness of the glass, as a shadow hugging the bottom-right inside */
    const ig = bx.createRadialGradient(cx + R * 0.28, cy + R * 0.3, R * 0.25, cx + R * 0.16, cy + R * 0.18, R * 1.02);
    ig.addColorStop(0, 'rgba(8,18,44,0)'); ig.addColorStop(1, 'rgba(6,14,38,' + (0.42 - 0.18 * lit).toFixed(3) + ')');
    bx.fillStyle = ig;
    bx.beginPath(); bx.arc(cx, cy, R, 0, Math.PI * 2); bx.fill();

    /* rim light wrapping the lower right edge */
    bx.save();
    bx.globalCompositeOperation = 'lighter';
    bx.strokeStyle = 'rgba(140,200,255,.5)'; bx.lineWidth = 5; bx.lineCap = 'round';
    bx.beginPath(); bx.arc(cx, cy, R - 3, Math.PI * 0.06, Math.PI * 0.64); bx.stroke();
    bx.restore();
    bx.strokeStyle = 'rgba(214,236,255,' + (0.4 + 0.4 * lit).toFixed(3) + ')'; bx.lineWidth = 3;
    bx.beginPath(); bx.arc(cx, cy, R, 0, Math.PI * 2); bx.stroke();

    /* ---- the filament assembly, standing inside the glass ---- */
    const hot = Math.min(1, G * 1.25);
    /* glass stem holding the wires */
    bx.fillStyle = 'rgba(206,228,255,.28)';
    bx.beginPath();
    bx.moveTo(cx - 13, cy + R * 0.34); bx.quadraticCurveTo(cx - 17, cy + 22, cx - 7, cy + 12);
    bx.lineTo(cx + 7, cy + 12); bx.quadraticCurveTo(cx + 17, cy + 22, cx + 13, cy + R * 0.34);
    bx.closePath(); bx.fill();
    /* support wires */
    bx.strokeStyle = 'rgba(176,196,230,.8)'; bx.lineWidth = 4.5; bx.lineCap = 'round';
    bx.beginPath();
    bx.moveTo(cx - 8, cy + 16); bx.lineTo(cx - 24, cy + 2);
    bx.moveTo(cx + 8, cy + 16); bx.lineTo(cx + 24, cy + 2);
    bx.stroke();
    /* the coil: a row of little loops, so it reads as wound wire rather than a zigzag */
    bx.save();
    const coilCol = flaring ? '#ffffff'
      : 'rgb(' + Math.round(126 + 129 * hot) + ',' + Math.round(84 + 152 * hot) + ',' + Math.round(74 + 96 * hot) + ')';
    bx.strokeStyle = coilCol; bx.lineWidth = 2.6 + hot * 1.8; bx.lineCap = 'round';
    if (hot > 0.05) { bx.shadowColor = flaring ? '#ffffff' : 'rgba(255,205,110,' + Math.min(1, hot).toFixed(3) + ')'; bx.shadowBlur = 30 * Math.min(1.6, hot); }
    const loops = 6, span = 44, ly = cy - 10;
    for (let i = 0; i < loops; i++) {
      const lx = cx - span / 2 + (span / (loops - 1)) * i;
      const wob = Math.sin(bulb.t * (flaring ? 16 : 3) + i * 0.9) * (flaring ? 3 : 0.8) * Math.max(0.2, hot);
      bx.beginPath();
      bx.ellipse(lx, ly + wob, 6, 17 + wob, 0, 0, Math.PI * 2);     // one turn of wire, seen edge on
      bx.stroke();
    }
    bx.beginPath();                                    // the ends running down to the posts
    bx.moveTo(cx - span / 2, ly + 15); bx.lineTo(cx - 24, cy + 2);
    bx.moveTo(cx + span / 2, ly + 15); bx.lineTo(cx + 24, cy + 2);
    bx.stroke();
    bx.restore();
    if (flaring) drawArc(bx, cx - 24, cy + 2, cx + 24, cy + 2, 26, 'rgba(255,255,255,.9)', 3);

    /* ---- what sells the glass: the highlights ---- */
    bx.save();
    bx.globalCompositeOperation = 'lighter';
    const sp = bx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 1, cx - R * 0.4, cy - R * 0.44, R * 0.44);
    sp.addColorStop(0, 'rgba(255,255,255,.7)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    bx.fillStyle = sp;
    bx.beginPath(); bx.ellipse(cx - R * 0.4, cy - R * 0.44, R * 0.34, R * 0.24, -0.5, 0, Math.PI * 2); bx.fill();
    bx.globalAlpha = 0.85; bx.fillStyle = '#ffffff';
    bx.beginPath(); bx.ellipse(cx - R * 0.5, cy - R * 0.5, R * 0.1, R * 0.055, -0.5, 0, Math.PI * 2); bx.fill();
    bx.globalAlpha = 0.3; bx.strokeStyle = '#ffffff'; bx.lineWidth = 4.5; bx.lineCap = 'round';
    bx.beginPath(); bx.arc(cx, cy, R * 0.82, Math.PI * 0.76, Math.PI * 1.04); bx.stroke();   // light wrapping the left edge
    bx.globalAlpha = 0.2; bx.lineWidth = 3;
    bx.beginPath(); bx.arc(cx, cy, R * 0.88, Math.PI * 0.2, Math.PI * 0.36); bx.stroke();
    bx.restore();
    bx.restore();
  } else if (broken) {
    /* jagged crown of glass left in the socket, with the snapped filament posts arcing */
    bx.save(); bx.translate(cx, baseTop + 2); bx.scale(0.68, 0.5);   // what is left sits down in the cap
    bx.fillStyle = 'rgba(190,225,255,.22)'; bx.strokeStyle = 'rgba(210,235,255,.55)'; bx.lineWidth = 4;
    bx.beginPath(); bx.moveTo(-R * 0.6, R * 0.32);
    for (const [tx, ty] of [[-0.44, 0.02], [-0.32, 0.22], [-0.14, -0.06], [0.02, 0.2], [0.18, -0.02], [0.34, 0.2], [0.48, 0.04], [0.6, 0.32]]) bx.lineTo(tx * R, ty * R);
    bx.closePath(); bx.fill(); bx.stroke();
    bx.strokeStyle = 'rgba(150,170,200,.9)'; bx.lineWidth = 5; bx.lineCap = 'round';
    bx.beginPath(); bx.moveTo(-20, R * 0.34); bx.lineTo(-18, R * 0.02); bx.moveTo(20, R * 0.34); bx.lineTo(18, R * 0.04); bx.stroke();
    bx.restore();
    if (bulb.arc > 0 && Math.random() < 0.6) {                 // the socket keeps spitting
      bx.save(); bx.globalAlpha = Math.min(1, bulb.arc);
      bx.shadowColor = '#7ff0ff'; bx.shadowBlur = 18;
      drawArc(bx, cx - 14, baseTop - 10, cx + 14, baseTop - 10, 18, '#bff4ff', 3);
      drawArc(bx, cx - 14, baseTop - 10, cx + 14, baseTop - 10, 10, '#ffffff', 1.5);
      bx.restore();
      if (Math.random() < 0.25) bulb.sparks.push({ x: (Math.random() - 0.5) * 30, y: R * 0.86 - 14,
        vx: (Math.random() - 0.5) * 160, vy: 40 + Math.random() * 120, life: 0, max: 0.4 + Math.random() * 0.4 });
    }
  }

  /* smoke first (behind the debris) */
  if (bulb.smoke.length) {
    bx.save(); bx.translate(cx, cy);
    for (const s of bulb.smoke) {
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy *= 0.985; s.r += dt * 30;
      const al = Math.max(0, 1 - s.life / s.max) * 0.5; if (al <= 0) continue;
      const sg = bx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);   // soft puff, not a flat disc
      sg.addColorStop(0, 'rgba(150,158,176,' + (al * 0.55).toFixed(3) + ')');
      sg.addColorStop(0.6, 'rgba(120,128,148,' + (al * 0.28).toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(110,118,140,0)');
      bx.fillStyle = sg;
      bx.beginPath(); bx.arc(s.x, s.y, s.r, 0, Math.PI * 2); bx.fill();
    }
    bx.restore(); bx.globalAlpha = 1;
    bulb.smoke = bulb.smoke.filter(s => s.life < s.max);
  }
  /* glass shards, tumbling with a bright edge */
  if (bulb.shards.length) {
    bx.save(); bx.translate(cx, cy);
    for (const s of bulb.shards) {
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 980 * dt; s.vx *= 0.995; s.rot += s.vr * dt;
      const al = Math.max(0, 1 - s.life / s.max); if (al <= 0) continue;
      bx.save(); bx.translate(s.x, s.y); bx.rotate(s.rot); bx.globalAlpha = al;
      bx.fillStyle = 'rgba(214,240,255,.8)'; bx.strokeStyle = 'rgba(255,255,255,.95)'; bx.lineWidth = 1.6;
      bx.beginPath(); bx.moveTo(0, -s.s * 0.62); bx.lineTo(s.s * 0.52, s.s * 0.42); bx.lineTo(-s.s * 0.46, s.s * 0.52); bx.closePath();
      bx.fill(); bx.stroke();
      bx.globalAlpha = al * 0.9; bx.strokeStyle = '#ffffff'; bx.lineWidth = 1;
      bx.beginPath(); bx.moveTo(-s.s * 0.2, -s.s * 0.2); bx.lineTo(s.s * 0.22, s.s * 0.16); bx.stroke();
      bx.restore();
    }
    bx.restore(); bx.globalAlpha = 1;
    bulb.shards = bulb.shards.filter(s => s.life < s.max);
  }
  /* embers: glowing bits of filament with a short trail */
  if (bulb.embers.length) {
    bx.save(); bx.translate(cx, cy);
    for (const e of bulb.embers) {
      e.life += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 620 * dt; e.vx *= 0.98;
      const al = Math.max(0, 1 - e.life / e.max); if (al <= 0) continue;
      bx.globalAlpha = al; bx.strokeStyle = 'rgba(255,150,40,' + (al * 0.6).toFixed(3) + ')'; bx.lineWidth = e.s;
      bx.beginPath(); bx.moveTo(e.x - e.vx * 0.02, e.y - e.vy * 0.02); bx.lineTo(e.x, e.y); bx.stroke();
      bx.fillStyle = al > 0.5 ? '#fff0c0' : '#ff9a2e';
      bx.beginPath(); bx.arc(e.x, e.y, e.s, 0, Math.PI * 2); bx.fill();
    }
    bx.restore(); bx.globalAlpha = 1;
    bulb.embers = bulb.embers.filter(e => e.life < e.max);
  }
  /* sparks */
  if (bulb.sparks.length) {
    bx.save(); bx.translate(cx, cy);
    for (const s of bulb.sparks) {
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 520 * dt; s.vx *= 0.97;
      const al = Math.max(0, 1 - s.life / s.max); if (al <= 0) continue;
      bx.globalAlpha = al; bx.fillStyle = al > 0.6 ? '#fff6d0' : '#ffd60a';
      bx.fillRect(s.x - 2, s.y - 2, 4.5, 4.5);
    }
    bx.restore(); bx.globalAlpha = 1;
    bulb.sparks = bulb.sparks.filter(s => s.life < s.max);
  }
  /* blast light */
  if (bulb.flash > 0) {
    bx.save();
    const fg = bx.createRadialGradient(cx, cy, 0, cx, cy, R * 3.4);
    fg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * bulb.flash).toFixed(3) + ')');
    fg.addColorStop(0.35, 'rgba(255,214,10,' + (0.4 * bulb.flash).toFixed(3) + ')');
    fg.addColorStop(1, 'rgba(255,61,90,0)');
    bx.fillStyle = fg; bx.fillRect(-W, -H, W * 3, H * 3); bx.restore();
  }
  bx.restore();
  if (bulb.white > 0) { bx.fillStyle = 'rgba(255,255,255,' + (0.75 * bulb.white).toFixed(3) + ')'; bx.fillRect(0, 0, W, H); }

  bx.fillStyle = broken || flaring ? '#ff3d5a' : (bulb.lit ? '#ffd60a' : '#8b9bc4');
  bx.font = '42px Bangers, Impact, sans-serif'; bx.textAlign = 'center'; bx.letterSpacing = '3px';
  bx.fillText(broken || flaring ? 'BLOWN!' : (bulb.lit ? 'POWER ON' : Math.round(prog * 100) + '% WIRED'), cx, H - 14);
}

let dragging = false, lastCell = -1;
function cellAt(e) {
  const p = game.puzzle; if (!p) return -1;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * canvas.width, y = (e.clientY - rect.top) / rect.height * canvas.height;
  const g = geom();
  /* the reverse of proj(): drop a ray through the pointer onto the top surface of the pads */
  const A = g.tileH * SIN_T, B = g.tileH * COS_T;
  const Y = (g.cy - y) / g.F;
  const den = COS_T - Y * SIN_T;
  if (Math.abs(den) < 1e-6) return -1;
  const bv = (A - Y * (g.D - B)) / den;
  const z = g.D - B - bv * SIN_T;
  if (z <= 1) return -1;
  const bu = (x - g.cx) * z / g.F;
  const fx_ = bu + g.bw / 2, fy_ = bv + g.bh / 2;
  const c = Math.floor(fx_ / g.cell), r = Math.floor(fy_ / g.cell);
  if (c < 0 || r < 0 || c >= p.C || r >= p.R) return -1;
  /* only the middle of a cell counts, so brushing a corner never registers as a diagonal hop */
  const dx = Math.abs(fx_ - (c + 0.5) * g.cell), dy = Math.abs(fy_ - (r + 0.5) * g.cell);
  if (dx > g.cell * 0.42 || dy > g.cell * 0.46) return -1;
  return r * p.C + c;
}
canvas.addEventListener('pointerdown', e => {
  Sfx.init(); dragging = true; canvas.setPointerCapture(e.pointerId);
  startClock();                                          // the turn is only timed once they actually play
  const v = cellAt(e); lastCell = v; if (v >= 0) tapCell(v);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const v = cellAt(e);
  if (v < 0 || v === lastCell) return;
  /* a fast drag can skip cells along a row/column: walk through them one at a time */
  const p = game.puzzle, C = p.C;
  if (lastCell >= 0 && (((lastCell / C) | 0) === ((v / C) | 0) || lastCell % C === v % C)) {
    const step = ((lastCell / C) | 0) === ((v / C) | 0) ? Math.sign(v - lastCell) : Math.sign(v - lastCell) * C;
    for (let u = lastCell + step; u !== v + step; u += step) tryMove(u);
  } else tryMove(v);
  lastCell = v;
});
const endDrag = () => { dragging = false; lastCell = -1; game.retracting = false; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ---------- keyboard: the arrow keys drive the wire, for a desk setup or a TV remote ----------
   Same rules as dragging — stepping back over the wire is an undo, a wrong terminal still costs a fuse. */
function keyMove(dx, dy) {
  if (!game.active || game.busy) return;
  const p = game.puzzle, w = game.wire;
  startClock();                                          // the first key press starts the turn, like the first touch
  if (!w.length) { tapCell(p.start); return; }           // pick up terminal 1
  const head = w[w.length - 1];
  const r = (head / p.C) | 0, c = head % p.C;
  const nr = r + dy, nc = c + dx;
  if (nr < 0 || nc < 0 || nr >= p.R || nc >= p.C) return;
  tryMove(nr * p.C + nc);
}
const KEY_DIRS = {
  arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1],
  a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1]
};
window.addEventListener('keydown', e => {
  if (current !== 'game' || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = String(e.key).toLowerCase();
  const dir = KEY_DIRS[k];
  if (dir) { e.preventDefault(); keyMove(dir[0], dir[1]); return; }
  if (k === 'backspace' || k === 'z') {                  // step back one cell
    e.preventDefault();
    if (game.wire.length >= 2 && !game.busy) tryMove(game.wire[game.wire.length - 2]);
    return;
  }
  if (k === 'r') { e.preventDefault(); resetWire(); }    // clear the wire and start the circuit again
  if (k === 'escape') { e.preventDefault(); if (game.active) { Sfx.click(); endRun('quit'); } }
});

/* ---------- screens ---------- */
const screens = { main: $('screen-main'), name: $('screen-name'), scores: $('screen-scores'), game: $('screen-game'), summary: $('screen-summary') };
let current = 'main';
function show(name) {
  for (const k in screens) screens[k].classList.toggle('active', k === name);
  current = name; $('stage').dataset.screen = name;
}
/* Top 3 card on the main screen: medal, name, score */
function renderTop3(rows, unit) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const medals = ['🥇', '🥈', '🥉'];
  $('main-top3').innerHTML = '<div class="top3-title">🏆 TOP 3 PLAYERS</div>' + (rows.length
    ? '<ol class="top3-list">' + rows.slice(0, 3).map((r, i) => `<li><span class="top3-medal">${medals[i]}</span><span class="top3-name">${esc(r.name)}</span><span class="top3-score">${r.score.toLocaleString('en-US')}${unit}</span></li>`).join('') + '</ol>'
    : '<div class="top3-empty">No scores yet — be the first!</div>');
  /* the same three, as a faint strip on the play screen */
  const strip = $('game-top3');
  if (strip) strip.innerHTML = '<span class="gt3-label">🏆 TOP 3</span>' + (rows.length
    ? rows.slice(0, 3).map((r, i) => `<span class="gt3-item">${medals[i]} ${esc(r.name)} <b>${r.score.toLocaleString('en-US')}${unit}</b></span>`).join('')
    : '<span class="gt3-item">BE THE FIRST!</span>');
}
function showMain() {
  renderTop3(loadScores(), ' ⚡');
  const top = loadScores()[0];
  $('main-best').textContent = top ? `🏆 TOP: ${top.name} — ${top.score} CIRCUIT${top.score === 1 ? '' : 'S'} IN 2 MINUTES` : 'BE THE FIRST ON THE SCOREBOARD!';
  renderMascot('idle', $('main-mascot'), 'images/logo.png');
  show('main');
}
function showScores() {
  const list = loadScores();
  const table = $('score-table');
  table.innerHTML = list.length ? list.map((s, i) => `<div class="score-row${i === 0 ? ' top' : ''}"><span class="rank">#${i + 1}</span><span class="name">${s.name}</span><span class="meta">REACHED LEVEL ${s.level + 1}</span><span class="pts">${fmtPts(s.score)} ⚡</span></div>`).join('')
    : '<div class="score-row"><span></span><span class="name">NO SCORES YET — PLAY A TURN!</span></div>';
  $('scores-reset').classList.toggle('hidden', !list.length);
  show('scores');
}
function startRun(name) {
  renderTop3(loadScores(), ' ⚡');
  game.player = name; game.level = 1; game.score = 0; game.fuses = FUSES; game.active = true; game.busy = false;
  game.timeLeft = RUN_SECONDS; game.started = false;     // one three-minute clock, started by the first move
  $('hud-player').textContent = name; $('hud-score').textContent = '⚡ 0';
  renderFuses(false);
  show('game');
  newLevel();
}

/* ---------- name entry ---------- */
let nameValue = '';
const ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
for (const row of ROWS) {
  const r = document.createElement('div'); r.className = 'kb-row';
  for (const ch of row) { const b = document.createElement('button'); b.className = 'key'; b.textContent = ch; b.dataset.key = ch; r.appendChild(b); }
  $('keyboard').appendChild(r);
}
function pressKey(k) {
  if (k === 'DELETE') nameValue = nameValue.slice(0, -1);
  else if (k === 'CLEAR') nameValue = '';
  else if (k === 'SPACE') { if (nameValue.length && nameValue.length < NAME_MAX && !nameValue.endsWith(' ')) nameValue += ' '; }
  else if (k === 'ENTER') { submitName(); return; }
  else if (nameValue.length < NAME_MAX) nameValue += k;
  Sfx.key(); $('name-display').textContent = nameValue;
}
function submitName() {
  startRun(sanitizeName(nameValue) || 'PLAYER');   // a name is optional — a blank one plays as PLAYER
}
screens.name.addEventListener('click', e => { const b = e.target.closest('[data-key]'); if (b) pressKey(b.dataset.key); });
window.addEventListener('keydown', e => {
  if (current !== 'name') return;
  if (e.key === 'Enter') pressKey('ENTER'); else if (e.key === 'Backspace') pressKey('DELETE'); else if (e.key === ' ') pressKey('SPACE');
  else if (/^[a-zA-Z0-9]$/.test(e.key)) pressKey(e.key.toUpperCase());
});
function openNameEntry() { nameValue = ''; $('name-display').textContent = ''; show('name'); }

/* ---------- buttons ---------- */
$('btn-play').addEventListener('click', () => { Sfx.init(); Sfx.click(); openNameEntry(); });
$('btn-scoreboard').addEventListener('click', () => { Sfx.click(); showScores(); });
$('name-cancel').addEventListener('click', () => { Sfx.click(); showMain(); });
$('scores-back').addEventListener('click', () => { Sfx.click(); showMain(); });
/* wiping the scoreboard always asks first: it cannot be undone */
$('scores-reset').addEventListener('click', () => { Sfx.click(); $('modal-confirm').classList.remove('hidden'); });
$('confirm-no').addEventListener('click', () => { Sfx.click(); $('modal-confirm').classList.add('hidden'); });
$('confirm-yes').addEventListener('click', () => {
  try { localStorage.removeItem(SCORES_KEY); } catch (e) { /* nothing saved, nothing to clear */ }
  Sfx.buzz();
  $('modal-confirm').classList.add('hidden');
  showScores();
});
$('scores-play').addEventListener('click', () => { Sfx.click(); openNameEntry(); });
$('btn-reset').addEventListener('click', () => { Sfx.click(); resetWire(); });
$('btn-quit').addEventListener('click', () => { if (!game.active) return; Sfx.click(); endRun('quit'); });
$('summary-next').addEventListener('click', () => { Sfx.click(); openNameEntry(); });
$('summary-scores').addEventListener('click', () => { Sfx.click(); showScores(); });
$('summary-menu').addEventListener('click', () => { Sfx.click(); showMain(); });
window.addEventListener('pointerdown', () => Sfx.init(), { once: true });

/* ---------- stage scaling (same rules as Electrical Troll) ---------- */
function viewportSize() {
  const vv = window.visualViewport, cs = getComputedStyle($('viewport')), px = v => parseFloat(v) || 0;
  return { w: (vv ? vv.width : window.innerWidth) - px(cs.paddingLeft) - px(cs.paddingRight), h: (vv ? vv.height : window.innerHeight) - px(cs.paddingTop) - px(cs.paddingBottom) };
}
function fitStage() {
  const { w, h } = viewportSize();
  const portrait = h > w;
  /* Zip plays fine either way: in portrait the board goes on top and the bulb + instructions sit below it,
     so there is no "rotate your device" nag — the stage simply adopts the screen's shape. */
  $('rotate-overlay').classList.remove('show');
  const ar = Math.max(w, 1) / Math.max(h, 1);
  const stageW = Math.round(Math.max(1920, 1080 * ar)), stageH = Math.round(Math.max(1080, 1920 / ar));
  const s = Math.min(w / stageW, h / stageH);
  const stage = $('stage');
  stage.style.width = stageW + 'px'; stage.style.height = stageH + 'px';
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  stage.classList.toggle('compact', s < 0.5);
  stage.classList.toggle('portrait', portrait);
  stage.classList.toggle('tall', stageH / stageW > 1.45);        // phones held upright get the roomiest layout
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', () => setTimeout(fitStage, 150));
if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
fitStage();

/* offline: ONE worker for the whole site (sw.js at the site root) saves the hub and every game,
   so all of them open with no connection. Older per-game workers inside this site are retired;
   workers of other sites on the same domain (e.g. other GitHub Pages projects) are left alone. */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', async () => {
    try {
      const root = new URL('../', location.href).href;
      for (const r of await navigator.serviceWorker.getRegistrations())
        if (r.scope.startsWith(root) && r.scope !== root) await r.unregister();
      await navigator.serviceWorker.register(root + 'sw.js', { scope: root, updateViaCache: 'none' });
    } catch (e) { /* offline support is a bonus, never a blocker */ }
  });
}

showMain();
loop();
window.ZIP = { game, fx, geom, proj, centre, cellAt, makePuzzle, hamiltonianPath, tryMove, tapCell, keyMove, startRun, showMain, newLevel, resetWire, bulb, bulbBoom, bulbLight, drawBulb, levelSpec, timeUp, startClock, RUN_SECONDS };
