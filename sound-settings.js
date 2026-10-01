/* 🔊 FUJI-HAYA — ONE volume for the whole site (roulette + every game).
   Load this BEFORE a page's own scripts. It:
   • routes every Web Audio sound through one volume knob (each AudioContext's "destination" becomes
     a gain node set to that volume), so effects AND music follow it without touching the games' code;
   • scales <audio> elements and spoken text (speech synthesis) the same way;
   • gives each page the same 🔊 button + slider: FHSound.attach(button), or FHSound.floating();
   • remembers the level on this device (shared by all pages) and follows changes made in other tabs. */
(function () {
  'use strict';
  const KEY = 'fhVolume';
  let vol = 0.8;
  try { const v = parseFloat(localStorage.getItem(KEY)); if (v >= 0 && v <= 1) vol = v; } catch (e) {}
  // older per-game mute switches would silence a game behind this knob's back — the knob is in charge now
  try { localStorage.removeItem('lightItUpMuted'); localStorage.removeItem('fhSpinMuted'); } catch (e) {}

  /* ---------- Web Audio: destination → shared gain → speakers ---------- */
  const gains = new Set();
  const protos = [window.BaseAudioContext, window.AudioContext, window.webkitAudioContext].filter(Boolean).map(C => C.prototype);
  for (const P of protos) {
    const d = Object.getOwnPropertyDescriptor(P, 'destination');
    if (!d || !d.get || d.get.__fh) continue;
    const realGet = d.get;
    const get = function () {
      if (!this.__fhGain) {
        const out = realGet.call(this), g = this.createGain();
        g.gain.value = vol; g.connect(out);
        this.__fhGain = g; gains.add(g);
      }
      return this.__fhGain;
    };
    get.__fh = true;
    Object.defineProperty(P, 'destination', { configurable: true, get });
  }

  /* ---------- <audio>/<video>: the page's own volume × the shared one ---------- */
  const media = new Set();
  const vd = window.HTMLMediaElement && Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
  if (vd && vd.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: true,
      get() { return this.__fhWant !== undefined ? this.__fhWant : vd.get.call(this); },
      set(v) { this.__fhWant = v; media.add(this); vd.set.call(this, Math.max(0, Math.min(1, v * vol))); },
    });
  }

  /* ---------- speech: Busby's voice follows the knob too ---------- */
  if (window.speechSynthesis && speechSynthesis.speak) {
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = (u) => { if (vol <= 0.001) return; try { u.volume = (u.volume === undefined ? 1 : u.volume) * vol; } catch (e) {} speak(u); };
  }

  function apply() {
    for (const g of gains) { try { g.gain.setTargetAtTime(vol, g.context.currentTime, 0.03); } catch (e) { g.gain.value = vol; } }
    for (const m of media) { try { vd.set.call(m, Math.max(0, Math.min(1, (m.__fhWant === undefined ? 1 : m.__fhWant) * vol))); } catch (e) {} }
    for (const b of buttons) paint(b);
    if (panel) { slider.value = Math.round(vol * 100); value.textContent = Math.round(vol * 100) + '%'; }
  }
  function set(v, save = true) {
    vol = Math.max(0, Math.min(1, v));
    if (vol > 0.001) lastOn = vol;
    if (save) { try { localStorage.setItem(KEY, String(vol)); } catch (e) {} }
    apply();
  }
  let lastOn = vol > 0.001 ? vol : 0.8;
  window.addEventListener('storage', e => { if (e.key === KEY && e.newValue !== null) set(parseFloat(e.newValue) || 0, false); });

  /* ---------- the control: a button that opens a slider ---------- */
  const icon = () => vol <= 0.001 ? '🔇' : vol < 0.4 ? '🔈' : vol < 0.75 ? '🔉' : '🔊';
  const buttons = new Set();
  function paint(b) { b.textContent = icon(); b.setAttribute('aria-label', 'Volume ' + Math.round(vol * 100) + '%'); b.classList.toggle('fh-muted', vol <= 0.001); }
  let panel = null, slider = null, value = null, anchor = null;
  function css() {
    if (document.getElementById('fh-sound-css')) return;
    const s = document.createElement('style'); s.id = 'fh-sound-css';
    s.textContent = `
.fh-vol { position: fixed; z-index: 2000; display: none; align-items: center; gap: 12px; padding: 12px 16px;
  background: rgba(16,26,51,.97); border: 3px solid #29e0ff; border-radius: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.6);
  font-family: 'Bangers', Impact, 'Arial Black', sans-serif; color: #f4f7ff; letter-spacing: 2px; touch-action: none; }
.fh-vol.open { display: flex; }
.fh-vol .fh-mute { width: 44px; height: 44px; flex: none; border-radius: 12px; border: 2px solid #24365f; background: #0c1530; color: #fff; font-size: 22px; cursor: pointer; }
.fh-vol label { font-size: 18px; color: #8b9bc4; }
.fh-vol input { -webkit-appearance: none; appearance: none; width: min(56vw, 240px); height: 12px; border-radius: 6px; background: #1a2850; outline: none; }
.fh-vol input::-webkit-slider-thumb { -webkit-appearance: none; width: 34px; height: 34px; border-radius: 50%; background: #ffd60a; border: 4px solid #7a5c00; cursor: pointer; }
.fh-vol input::-moz-range-thumb { width: 30px; height: 30px; border-radius: 50%; background: #ffd60a; border: 4px solid #7a5c00; cursor: pointer; }
.fh-vol .fh-val { min-width: 54px; text-align: right; font-size: 22px; color: #ffd60a; }
.fh-sound-float { position: fixed; top: 12px; right: 12px; z-index: 1500; width: 48px; height: 48px; border-radius: 14px; cursor: pointer;
  font-size: 24px; border: 3px solid #29e0ff; background: linear-gradient(180deg,#16244a,#0c1530); color: #fff; box-shadow: 0 6px 0 #061027; }
.fh-muted { opacity: .75; }`;
    document.head.appendChild(s);
  }
  function build() {
    if (panel) return;
    css();
    panel = document.createElement('div'); panel.className = 'fh-vol'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Volume');
    panel.innerHTML = '<button class="fh-mute" type="button" aria-label="Mute"></button><label>VOLUME</label><input type="range" min="0" max="100" step="5" aria-label="Volume"><span class="fh-val"></span>';
    document.body.appendChild(panel);
    slider = panel.querySelector('input'); value = panel.querySelector('.fh-val');
    const mute = panel.querySelector('.fh-mute'); buttons.add(mute);
    slider.addEventListener('input', () => set(slider.value / 100));
    mute.addEventListener('click', e => { e.stopPropagation(); set(vol > 0.001 ? 0 : lastOn); });
    ['pointerdown', 'touchstart', 'click'].forEach(t => panel.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    document.addEventListener('pointerdown', () => close());
    window.addEventListener('resize', () => place());
    apply();
  }
  function place() {
    if (!panel || !anchor || !panel.classList.contains('open')) return;
    const r = anchor.getBoundingClientRect(), pw = panel.offsetWidth, ph = panel.offsetHeight;
    let left = Math.min(innerWidth - pw - 8, Math.max(8, r.right - pw));
    let top = r.bottom + 8; if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    panel.style.left = left + 'px'; panel.style.top = top + 'px';
  }
  function open(a) { build(); anchor = a; panel.classList.add('open'); place(); }
  function close() { if (panel) panel.classList.remove('open'); }
  function attach(btn) {
    if (!btn) return null;
    const b = btn.cloneNode(true);                     // drop the page's old mute handler
    btn.replaceWith(b);
    buttons.add(b); paint(b);
    const stop = e => e.stopPropagation();
    b.addEventListener('pointerdown', stop); b.addEventListener('touchstart', stop, { passive: true });
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); build(); panel.classList.contains('open') && anchor === b ? close() : open(b); });
    return b;
  }
  function floating() {
    css();
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fh-sound-float';
    document.body.appendChild(b);
    return attach(b);
  }
  window.FHSound = { attach, floating, get volume() { return vol; }, set volume(v) { set(v); } };
})();
