/* ⚡ ELECTRICAL TROLL — tiny synthesized sound effects (Web Audio, no files needed) */
'use strict';

const Sfx = (() => {
  let ctx = null;
  let master = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function enabled() {
    return ctx && settings.sound;
  }

  /* Basic tone: type, start freq -> end freq over duration, with quick envelope */
  function tone(type, f0, f1, dur, vol = 0.4, delay = 0) {
    if (!enabled()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /* Filtered noise burst — used for zaps and crackles */
  function noise(dur, vol = 0.3, freq = 1200, delay = 0) {
    if (!enabled()) return;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt).connect(g).connect(master);
    src.start(t);
  }

  /* A crude "voice": a buzzy tone glided through two vowel formant filters. Used when no speech voice exists. */
  function vowel(f0a, f0b, formants, dur, vol = 0.5) {
    if (!enabled()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0a, t);
    osc.frequency.exponentialRampToValueAtTime(f0b, t + dur * 0.7);
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    vib.frequency.value = 6; vibG.gain.value = f0a * 0.03; vib.connect(vibG).connect(osc.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vol, t + 0.06);
    env.gain.setValueAtTime(vol, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [freq, q, g] of formants) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const fg = ctx.createGain(); fg.gain.value = g;
      osc.connect(bp).connect(fg).connect(env);
    }
    env.connect(master);
    osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  }

  /* Prefer a real (offline) speech voice for the exclamations; fall back to the vowel synth. */
  function speak(text, pitch, rate) {
    if (!settings.sound) return false;
    try {
      if (!('speechSynthesis' in window)) return false;
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return false;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voices.find(v => /^en/i.test(v.lang) && /female|zira|samantha|google uk english female/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang)) || voices[0];
      u.pitch = pitch; u.rate = rate; u.volume = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) { /* ignore */ } }

  return {
    init,
    ctx() { return ctx; },
    /* HAPPY — exit reached: a bouncy "ta-da!" fanfare (major chord run-up) with a rising "yaay" underneath */
    yay() {
      if (!enabled()) return;
      const run = [523, 659, 784, 1047];                                       // C E G C — bright major arpeggio
      run.forEach((f, i) => { tone('square', f, f, 0.12, 0.28, i * 0.075); tone('triangle', f / 2, f / 2, 0.12, 0.2, i * 0.075); });
      tone('square', 1047, 1047, 0.5, 0.25, 0.32);                             // held top note...
      tone('square', 1319, 1319, 0.5, 0.18, 0.32);                             // ...with a happy third on top
      tone('sine', 2093, 2093, 0.3, 0.12, 0.42);                               // sparkle
      noise(0.25, 0.12, 5000, 0.34);
      vowel(320, 520, [[700, 6, 1.0], [1250, 8, 0.7], [2600, 10, 0.3]], 0.6, 0.5);   // "yaaay!" gliding up
    },
    /* SAD — trap got the player: the classic sad trombone "wah-wah-waaah" with a drooping "ohhh" */
    oh() {
      if (!enabled()) return;
      const t0 = ctx.currentTime;
      const notes = [[466, 0.32], [440, 0.32], [415, 0.32], [370, 0.95]];       // Bb A Ab F# — each one sags
      let t = t0;
      for (let i = 0; i < notes.length; i++) {
        const [f, dur] = notes[i];
        const osc = ctx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f * 1.03, t);
        osc.frequency.exponentialRampToValueAtTime(f * (i === 3 ? 0.9 : 0.97), t + dur);       // the "wah" bend down
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 3;
        const wah = ctx.createOscillator(), wahG = ctx.createGain();
        wah.frequency.value = i === 3 ? 5 : 8; wahG.gain.value = 500; wah.connect(wahG).connect(lp.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.04);
        g.gain.setValueAtTime(0.35, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(lp).connect(g).connect(master);
        osc.start(t); wah.start(t); osc.stop(t + dur + 0.02); wah.stop(t + dur + 0.02);
        t += dur;
      }
      vowel(240, 150, [[450, 6, 1.0], [850, 8, 0.6]], 1.1, 0.4);              // "ohhhh..." drooping
    },
    click()  { tone('square', 700, 900, 0.06, 0.2); },
    key()    { tone('square', 500, 650, 0.05, 0.15); },
    jump()   { tone('square', 300, 720, 0.16, 0.25); },
    land()   { tone('triangle', 180, 90, 0.08, 0.2); },
    bounce() { tone('sine', 250, 900, 0.22, 0.35); },
    switch() { tone('square', 400, 200, 0.12, 0.3); tone('square', 600, 900, 0.1, 0.2, 0.12); },
    warn()   { tone('sawtooth', 220, 220, 0.12, 0.2); tone('sawtooth', 220, 220, 0.12, 0.2, 0.16); },
    trap()   { noise(0.25, 0.35, 900); tone('sawtooth', 160, 60, 0.3, 0.3); },
    zapLoop(){ noise(0.12, 0.12, 2500); },
    die() {
      noise(0.5, 0.5, 1800);
      tone('sawtooth', 900, 60, 0.55, 0.4);
      tone('square', 120, 40, 0.5, 0.3, 0.1);
    },
    tick(urgent) { tone('square', urgent ? 1200 : 800, urgent ? 1200 : 800, 0.07, 0.25); },
    timeUp() { [600, 500, 400, 300].forEach((f, i) => tone('sawtooth', f, f * 0.8, 0.25, 0.35, i * 0.22)); noise(0.5, 0.25, 1500, 0.9); },
    nope()   { tone('square', 300, 150, 0.15, 0.3); tone('square', 250, 120, 0.25, 0.3, 0.17); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.14, 0.3, i * 0.11));
      tone('triangle', 1047, 1568, 0.4, 0.3, 0.45);
    },
    record() {
      [659, 784, 988, 1319, 1568].forEach((f, i) => tone('square', f, f, 0.16, 0.3, i * 0.12));
      noise(0.4, 0.2, 3000, 0.6);
    }
  };
})();


/* ---------- background music: a looping chiptune generated in code (no audio files, works offline) ---------- */
const Music = (() => {
  const BPM = 128, STEP = 60 / BPM / 4;                       // 16th notes
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // Am · F · C · G (MIDI)
  const BASS = [45, 41, 36, 43];
  const ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 0, 1, 2, 1, 0];
  let ctx = null, gain = null, timer = null, nextTime = 0, step = 0, volume = 0.5, playing = false;
  const f = m => 440 * Math.pow(2, (m - 69) / 12);

  function note(type, midi, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(gain); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(t, kind) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(gain); o.start(t); o.stop(t + 0.16);
      return;
    }
    const len = Math.floor(ctx.sampleRate * (kind === 'snare' ? 0.12 : 0.04));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = kind === 'snare' ? 'bandpass' : 'highpass'; filt.frequency.value = kind === 'snare' ? 1800 : 7000;
    const g = ctx.createGain(); g.gain.value = kind === 'snare' ? 0.35 : 0.12;
    src.connect(filt).connect(g).connect(gain); src.start(t);
  }
  function scheduleStep(s, t) {
    const bar = Math.floor(s / 16) % 8, ci = Math.floor(bar / 2), chord = CHORDS[ci], i = s % 16;
    if (i % 2 === 0) note('triangle', BASS[ci] + (i % 8 === 6 ? 12 : 0), t, STEP * 1.6, 0.35);          // bass
    if (bar !== 7 || i < 8) note('square', chord[ARP[i]] + (i % 4 === 3 ? 12 : 0), t, STEP * 0.9, 0.09); // arpeggio lead
    if (bar % 2 === 1 && i % 4 === 0) note('sawtooth', chord[(i / 4) % 3] + 12, t, STEP * 3.5, 0.05);   // pad accents
    if (i === 0 || i === 8) drum(t, 'kick');
    if (i === 4 || i === 12) drum(t, 'snare');
    if (i % 2 === 1) drum(t, 'hat');
  }
  function tick() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.35) { scheduleStep(step, nextTime); step++; nextTime += STEP; }
  }
  return {
    start() {
      ctx = Sfx.ctx();
      if (!ctx || playing) return;
      gain = ctx.createGain(); gain.gain.value = volume * 0.5; gain.connect(ctx.destination);
      nextTime = ctx.currentTime + 0.1; step = 0; playing = true;
      timer = setInterval(tick, 90); tick();
    },
    stop() { clearInterval(timer); timer = null; playing = false; if (gain) { gain.disconnect(); gain = null; } },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (gain && ctx) gain.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.05); },
    volume() { return volume; },
    playing() { return playing; }
  };
})();
