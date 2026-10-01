/* 🎵 FUJI-HAYA — background music for the hub and the games, in the same chiptune style as Electrical Troll.
   Generated in code (no audio files, works offline). Each page gets its own tune:
     FHMusic.autoplay('zone')   → starts on the first tap / key press (browsers need a gesture first)
     FHMusic.play('zip') · FHMusic.stop() · FHMusic.click()
   Everything goes to the AudioContext's destination, so the site-wide volume knob (sound-settings.js) controls it. */
(function () {
  'use strict';
  const m2f = m => 440 * Math.pow(2, (m - 69) / 12);
  /* chord roots/triads in MIDI, a bass line, an arpeggio order, tempo */
  const SONGS = {
    zone:  { bpm: 124, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], bass: [48, 43, 45, 41], arp: [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 0, 2, 1, 2, 1] },   // C · G · Am · F
    zip:   { bpm: 118, chords: [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]], bass: [38, 46, 41, 48], arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 0] },   // Dm · Bb · F · C
    spin:  { bpm: 128, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: [45, 41, 36, 43], arp: [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 0, 1, 2, 1, 0] },   // Am · F · C · G — same groove as Electrical Troll
    light: { bpm: 132, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bass: [48, 45, 41, 43], arp: [0, 1, 2, 1, 2, 1, 0, 1, 0, 1, 2, 1, 2, 0, 1, 2] },   // C · Am · F · G
  };
  const BASE = 0.25;
  let ctx = null, out = null, timer = null, nextTime = 0, step = 0, song = null, want = null, duckTo = 1;

  function ac() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function note(type, midi, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = m2f(midi);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function drum(t, kind) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.16);
      return;
    }
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'snare' ? 1800 : 7000;
    const g = ctx.createGain(); g.gain.value = kind === 'snare' ? 0.35 : 0.12;
    src.connect(f).connect(g).connect(out); src.start(t, 0, kind === 'snare' ? 0.12 : 0.04);
  }
  function scheduleStep(s, t) {
    const S = SONGS[song], STEP = 60 / S.bpm / 4;
    const bar = Math.floor(s / 16) % 8, ci = Math.floor(bar / 2), chord = S.chords[ci], i = s % 16;
    if (i % 2 === 0) note('triangle', S.bass[ci] + (i % 8 === 6 ? 12 : 0), t, STEP * 1.6, 0.35);            // bass
    if (bar !== 7 || i < 8) note('square', chord[S.arp[i]] + (i % 4 === 3 ? 12 : 0), t, STEP * 0.9, 0.08);  // arpeggio lead
    if (bar % 2 === 1 && i % 4 === 0) note('sawtooth', chord[(i / 4) % 3] + 12, t, STEP * 3.5, 0.045);     // pad accents
    if (i === 0 || i === 8) drum(t, 'kick');
    if (i === 4 || i === 12) drum(t, 'snare');
    if (i % 2 === 1) drum(t, 'hat');
  }
  function tick() {
    if (!ctx || !song) return;
    const STEP = 60 / SONGS[song].bpm / 4;
    while (nextTime < ctx.currentTime + 0.35) { scheduleStep(step, nextTime); step++; nextTime += STEP; }
  }
  function play(name) {
    want = SONGS[name] ? name : 'zone';
    if (!ac()) return;
    if (song === want && timer) return;
    stop(true);
    song = want;
    out = ctx.createGain(); out.gain.value = BASE * duckTo; out.connect(ctx.destination);
    nextTime = ctx.currentTime + 0.1; step = 0;
    timer = setInterval(tick, 90); tick();
  }
  function stop(keepWish) {
    clearInterval(timer); timer = null;
    if (out) { const o = out; try { o.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); } catch (e) {} setTimeout(() => o.disconnect(), 300); out = null; }
    song = null;
    if (!keepWish) want = null;
  }
  /* a short UI blip, like the games' button clicks */
  function click() {
    if (!ac()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.08);
  }
  /* start on the first gesture; pause while the tab / app is in the background */
  function autoplay(name) {
    want = name;
    const go = () => { if (want && !timer) play(want); };
    ['pointerdown', 'keydown', 'touchend'].forEach(t => window.addEventListener(t, go, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { const w = want; stop(true); want = w; }
      else if (want && ctx && ctx.state !== 'closed') play(want);
    });
  }
  /* duck(0.3) = music at 30 % of its level (e.g. while a wheel spins); duck(1) = back to normal */
  function duck(level) {
    duckTo = Math.max(0, Math.min(1, level));
    if (out && ctx) out.gain.setTargetAtTime(BASE * duckTo, ctx.currentTime, 0.25);
  }
  window.FHMusic = { play, stop: () => stop(false), autoplay, click, duck, get playing() { return !!timer; } };
})();
