/* ⚡ ELECTRICAL TROLL — screens, on-screen keyboard, turn flow, attract mode, wiring */
'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const screens = {
    attract: $('screen-attract'), main: $('screen-main'), scores: $('screen-scores'), summary: $('screen-summary'),
    name: $('screen-name'), settings: $('screen-settings'), confirm: $('screen-confirm'), game: $('screen-game')
  };
  let current = null;
  let nameValue = '';
  let idleSeconds = 0;
  let introTimer = null, toastTimer = null;
  let liveHintTimer = null;
  let turnPlayer = '';
  let lastTimerSec = -1;
  let deathId = 0;

  /* ---------- stage scaling: fixed 1920x1080 world fitted to TV, tablet or phone ---------- */
  function viewportSize() {
    /* visualViewport tracks the area not covered by mobile browser bars; the wrapper's padding = safe areas */
    const vv = window.visualViewport;
    const cs = getComputedStyle($('viewport'));
    const px = v => parseFloat(v) || 0;
    const w = (vv ? vv.width : window.innerWidth) - px(cs.paddingLeft) - px(cs.paddingRight);
    const h = (vv ? vv.height : window.innerHeight) - px(cs.paddingTop) - px(cs.paddingBottom);
    return { w, h };
  }
  let gameRef = null;
  function fitStage() {
    const { w, h } = viewportSize();
    const portrait = h > w;
    /* portrait is a supported layout now: the world sits on top, the touch controls fill a deck below it */
    $('rotate-overlay').classList.remove('show');
    /* the stage adopts the screen's aspect ratio (never narrower than 16:9 in either direction),
       so there are no black bars: wider screens get a wider stage, 4:3 tablets a taller one */
    const ar = Math.max(w, 1) / Math.max(h, 1);
    const stageW = Math.round(Math.max(1920, 1080 * ar));
    const stageH = Math.round(Math.max(1080, 1920 / ar));
    const s = Math.min(w / stageW, h / stageH);
    const stage = $('stage');
    stage.style.width = stageW + 'px'; stage.style.height = stageH + 'px';
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    stage.classList.toggle('compact', s < 0.5);                // bigger touch targets on small screens
    stage.classList.toggle('portrait', portrait);
    if (gameRef) {
      gameRef.resize(stageW, stageH, s);
      stage.style.setProperty('--panel-h', (gameRef.panelH || 230) + 'px');   // the buttons sit in the drawn deck
    }
  }
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
  fitStage();

  /* ---------- offline: register the service worker (needs https or localhost) ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', async () => {
      try {
        /* a worker registered from an older folder layout would keep serving stale files — drop it */
        const here = new URL('./', location.href).href;
        for (const r of await navigator.serviceWorker.getRegistrations()) if (!r.scope.startsWith(here)) await r.unregister();
        await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      } catch (err) { console.warn('Service worker not registered:', err); }
    });
  }

  function show(name) {
    for (const k in screens) screens[k].classList.toggle('active', k === name);
    current = name;
    $('stage').dataset.screen = name;
    $('btn-fullscreen-global').classList.toggle('hidden', name === 'game' || name === 'attract' || !fsSupported);
    idleSeconds = 0;
  }
  const fmtTime = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const fmtPts = n => n.toLocaleString('en-US');

  /* ---------- game ---------- */
  const game = new Game($('game-canvas'), {
    onDeath(msg, cause) {
      const lives = game.turn ? game.turn.lives : 0;
      $('death-msg').textContent = msg;
      $('level-intro').classList.remove('show');
      /* Busby pops up with an indirect hint about the kind of trap that got them */
      renderMascot('shock', $('mascot-svg'));
      $('hint-text').textContent = hintFor(cause);
      const box = $('hint-box'); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
      $('death-hint').textContent = lives > 0 ? `${lives} ${lives === 1 ? 'LIFE' : 'LIVES'} LEFT · TAP TO RETRY` : 'NO LIVES LEFT...';
      $('overlay-death').classList.add('show');
      $('hud-deaths').textContent = '💀 ' + (game.turn ? game.turn.deaths : 0);
      updateLives();
      if (lives <= 0) return;                               // game over: the engine ends the turn after the animation
      const id = ++deathId;
      setTimeout(() => { if (game.state === 'dead' && id === deathId) doRetry(); }, 2600);   // long enough to read the hint; a tap skips it
    },
    onComplete(info) {
      $('hud-score').textContent = '★ ' + fmtPts(game.turn.score);
      $('toast-text').textContent = '⚡ CLEARED! +' + fmtPts(info.score);
      clearTimeout(toastTimer);
      setTimeout(() => $('overlay-toast').classList.add('show'), 500);          // pops while Busby steps in
      toastTimer = setTimeout(() => {
        $('overlay-toast').classList.remove('show');
        if (!game.turn || !game.turn.active) return;
        if (game.turn.index + 1 >= game.turn.deck.length) { game.turn.active = false; showSummary({ ...game.turn, reason: 'win' }); }
        else startTurnLevel();
      }, 1700);                                                                   // walk-in 0.5 s + step inside 0.4 s + fade 0.35 s
    },
    onTick(t, force) {
      const s = Math.floor(t);
      if (force || s !== lastTimerSec) { lastTimerSec = s; $('hud-timer').textContent = fmtTime(s); }
    },
    onTurnEnd(turn) { setTimeout(() => showSummary(turn), 900); },
    onHint(cause) {
      renderMascot('idle', $('mascot-svg-live'));
      $('hint-text-live').textContent = hintFor(cause);
      const box = $('hint-box-live'); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
      $('overlay-hint').classList.add('show');
      clearTimeout(liveHintTimer);
      liveHintTimer = setTimeout(() => $('overlay-hint').classList.remove('show'), 3200);
    }
  });
  const inputBinder = bindGameInput(game, $('controls'));
  gameRef = game; fitStage();

  /* lives display: hearts for what is left, dim ones for what is gone */
  function updateLives() {
    if (!game.turn) return;
    const el = $('hud-turn');
    const { lives, maxLives } = game.turn;
    el.innerHTML = '❤'.repeat(lives) + '<span class="lost">' + '❤'.repeat(Math.max(0, maxLives - lives)) + '</span>';
    el.classList.toggle('urgent', lives <= 3);
    if (TEST_INFINITE_LIVES) el.innerHTML += '<span class="testtag">TEST MODE · LIVES OFF</span>';
  }

  /* ---------- turn flow ---------- */
  function startTurn(name) {
    turnPlayer = name;
    getPlayer(name); savePlayers();
    game.startTurn(TURN_LIVES, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    startTurnLevel();
  }
  function startTurnLevel() {
    const entry = game.nextTurnLevel();
    const n = entry.level;
    hideOverlays();
    show('game');
    inputBinder.clear();
    game.loadLevel(n, entry);
    game.start();
    const mod = game.mod || MODIFIERS[0];
    const label = `LEVEL ${game.turn.index + 1}/${game.turn.deck.length}`;
    $('hud-level').textContent = label;
    $('hud-levelname').textContent = LEVELS[n - 1].name + (game.level.mirrored ? ' ⇄' : '');
    $('hud-player').textContent = turnPlayer;
    $('hud-mod').textContent = mod.label;
    $('hud-deaths').textContent = '💀 ' + game.turn.deaths;
    $('hud-score').textContent = '★ ' + fmtPts(game.turn.score);
    updateLives();
    game.cb.onTick(0, true);
    $('intro-level').textContent = label;
    $('intro-name').textContent = LEVELS[n - 1].name;
    $('intro-player').textContent = turnPlayer;
    const tags = [`<span class="tier">${TIER_NAMES[game.level.tier]}</span>`];
    if (game.level.mirrored) tags.push('<span class="mirror">⇄ MIRRORED</span>');
    if (game.level.def.lockdown) tags.push('<span class="lock" title="The exit is sealed. Find the breaker.">🔒 LOCKDOWN</span>');
    if (mod.id !== 'none') tags.push(`<span title="${mod.desc}">${mod.label} ×${mod.mult}</span>`);
    $('intro-tags').innerHTML = tags.join('');
    const first = game.turn.index === 0;                   // first level of a turn: show the controls, hold the card a bit longer
    $('intro-help').classList.toggle('hidden', !first);
    if (first && !('ontouchstart' in window) && !navigator.maxTouchPoints) $('intro-help').children[0].textContent = '◀ ▶ / A D MOVE';
    $('level-intro').classList.add('show');
    clearTimeout(introTimer);
    introTimer = setTimeout(() => $('level-intro').classList.remove('show'), first ? 3200 : 1800);
  }
  function showSummary(turn) {
    game.stop(); game.state = 'idle';
    hideOverlays(); inputBinder.clear();
    const rank = addScore({ name: turnPlayer, score: turn.score, levels: turn.levels, deaths: turn.deaths, seed: turn.seed });
    recordTurn(turnPlayer, { score: turn.score, deaths: turn.deaths, highestLevel: turn.highestLevel });
    const won = turn.reason === 'win';
    $('summary-title').textContent = won ? '🏆 YOU SURVIVED ALL 10!' : '💀 GAME OVER!';
    $('summary-title').classList.toggle('warn', !won);
    $('summary-name').textContent = turnPlayer;
    $('summary-score').textContent = fmtPts(turn.score);
    const rankEl = $('summary-rank');
    rankEl.classList.toggle('record', rank === 1 && turn.score > 0);
    rankEl.textContent = turn.score === 0 ? 'NO LEVELS CLEARED... TRY AGAIN!' : (rank === 1 ? '🎉 NEW HIGH SCORE! 🎉' : '#' + rank + ' ON THE SCOREBOARD');
    const bestTier = turn.highestLevel ? TIER_NAMES[LEVELS[turn.highestLevel - 1].tier] : '—';
    $('summary-stats').textContent = `LEVELS CLEARED: ${turn.levels}/${turn.deck.length} · DEATHS: ${turn.deaths} · BEST TIER: ${bestTier}`;
    renderMascot(won ? 'salute' : 'shock', $('summary-mascot'));   // cleared all ten: Busby salutes
    $('summary-balloon').textContent = won ? 'You beat every trap I had. Respect!' : (turn.levels === 0 ? 'Not even one level? The traps send their regards.' : 'The traps got you this time. Come back for revenge!');
    show('summary');
    if (rank === 1 && turn.score > 0) Sfx.record();
  }
  $('btn-next-player').addEventListener('click', showNameEntry);
  $('btn-summary-scores').addEventListener('click', showScores);
  $('btn-summary-menu').addEventListener('click', showMain);

  function hideOverlays() {
    for (const id of ['overlay-death', 'overlay-pause', 'level-intro', 'overlay-toast']) $(id).classList.remove('show');
  }
  function doRetry() {
    if (game.state !== 'dead') return;
    $('overlay-death').classList.remove('show');
    game.retry();
  }
  $('overlay-death').addEventListener('pointerdown', e => { e.preventDefault(); if (game.player.deadTimer > 0.3) doRetry(); });

  /* pause */
  $('btn-pause').addEventListener('click', () => {
    if (game.state === 'play') { game.pause(); $('overlay-pause').classList.add('show'); }
  });
  $('btn-resume').addEventListener('click', () => { $('overlay-pause').classList.remove('show'); inputBinder.clear(); game.resume(); });
  $('btn-restart').addEventListener('click', () => { hideOverlays(); game.restartLevel(); game.start(); inputBinder.clear(); });
  $('btn-pause-select').addEventListener('click', leaveGame);
  $('btn-pause-fullscreen').addEventListener('click', toggleFullscreen);

  function leaveGame() {
    game.stop();
    game.state = 'idle';
    if (game.turn) game.turn.active = false;
    hideOverlays();
    inputBinder.clear();
    showMain();
  }

  /* ---------- on-screen keyboard ---------- */
  const ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const kb = $('keyboard');
  for (const row of ROWS) {
    const r = document.createElement('div');
    r.className = 'kb-row';
    for (const ch of row) {
      const b = document.createElement('button');
      b.className = 'key'; b.textContent = ch; b.dataset.key = ch;
      r.appendChild(b);
    }
    kb.appendChild(r);
  }
  function renderName() { $('name-display').textContent = nameValue; }
  function pressKey(k) {
    if (k === 'DELETE') nameValue = nameValue.slice(0, -1);
    else if (k === 'CLEAR') nameValue = '';
    else if (k === 'SPACE') { if (nameValue.length && nameValue.length < NAME_MAX && !nameValue.endsWith(' ')) nameValue += ' '; }
    else if (k === 'ENTER') { submitName(); return; }
    else if (nameValue.length < NAME_MAX) nameValue += k;
    Sfx.key();
    renderName();
  }
  screens.name.addEventListener('click', e => {
    const b = e.target.closest('[data-key]');
    if (b) pressKey(b.dataset.key);
  });
  window.addEventListener('keydown', e => {
    if (current !== 'name') return;
    if (e.key === 'Enter') pressKey('ENTER');
    else if (e.key === 'Backspace') pressKey('DELETE');
    else if (e.key === ' ') pressKey('SPACE');
    else if (/^[a-zA-Z0-9]$/.test(e.key)) pressKey(e.key.toUpperCase());
  });
  function submitName() {
    Sfx.click();
    startTurn(sanitizeName(nameValue) || 'PLAYER');   // a name is optional — a blank one plays as PLAYER
  }
  function showNameEntry() {
    nameValue = '';
    renderName();
    /* quick-pick chips: names seen on this TV before */
    const chips = $('name-chips');
    chips.innerHTML = '';
    for (const n of recentNames(8)) {
      const c = document.createElement('button');
      c.className = 'chip'; c.textContent = n;
      c.addEventListener('click', () => { Sfx.click(); startTurn(n); });
      chips.appendChild(c);
    }
    show('name');
  }
  $('name-cancel').addEventListener('click', showMain);

  /* ---------- menus ---------- */
  function showMain() {
    const best = topScores(1)[0];
    $('main-best').textContent = best ? `🏆 HIGH SCORE: ${best.name} — ${fmtPts(best.score)}` : 'BE THE FIRST ON THE SCOREBOARD!';
    $('btn-play-turn').textContent = '⚡ PLAY — ' + TURN_LIVES + ' LIVES';
    renderMascot('idle', $('main-mascot'));
    const greet = $('main-greet'); greet.classList.remove('pop'); void greet.offsetWidth; greet.classList.add('pop');
    show('main');
  }
  $('btn-play-turn').addEventListener('click', showNameEntry);
  $('btn-scoreboard').addEventListener('click', showScores);
  $('btn-main-settings').addEventListener('click', showSettings);

  function showScores() {
    const table = $('score-table');
    const list = topScores(10);
    table.innerHTML = list.length ? '' : '<div class="score-empty">NO SCORES YET — PLAY A TURN!</div>';
    list.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'score-row' + (i === 0 ? ' top' : '') + (s.name === turnPlayer && current === 'summary' ? ' mine' : '');
      row.innerHTML = `<div class="rank">#${i + 1}</div><div class="name">${s.name}</div><div class="meta">${s.levels} LVL · ${s.deaths} 💀</div><div class="pts">${fmtPts(s.score)}</div>`;
      table.appendChild(row);
    });
    show('scores');
  }
  $('scores-back').addEventListener('click', showMain);
  $('scores-play').addEventListener('click', showNameEntry);

  function showSettings() {
    const names = Object.keys(players);
    const best = topScores(1)[0];
    $('settings-name').textContent = names.length;
    $('settings-highest').textContent = names.reduce((a, k) => a + (players[k].turns || 0), 0);
    $('settings-deaths').textContent = best ? best.name + ' — ' + fmtPts(best.score) : '—';
    $('settings-sound').textContent = settings.sound ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    show('settings');
  }
  $('settings-back').addEventListener('click', showMain);
  $('settings-sound').addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); showSettings(); Sfx.click(); });
  $('settings-fullscreen').addEventListener('click', toggleFullscreen);
  $('settings-reset').addEventListener('click', () => show('confirm'));
  $('confirm-cancel').addEventListener('click', showSettings);
  $('confirm-reset').addEventListener('click', () => {
    resetProgress();
    Sfx.trap();
    showMain();
  });

  /* ---------- fullscreen (manual: corner button / settings / pause menu) ---------- */
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) { const p = req.call(el); if (p && p.catch) p.catch(() => {}); }
      /* on phones/tablets also try to pin landscape */
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } else {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) ex.call(document);
    }
  }
  $('btn-fullscreen-global').addEventListener('click', toggleFullscreen);
  /* iOS Safari has no fullscreen API for pages — hide the buttons there (Add to Home Screen gives fullscreen instead) */
  const fsSupported = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) && document.fullscreenEnabled !== false;
  if (!fsSupported || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone) {
    for (const id of ['btn-fullscreen-global', 'settings-fullscreen', 'btn-pause-fullscreen']) $(id).classList.add('hidden');
  }

  /* ---------- attract mode ---------- */
  function showAttract() {
    if (current === 'game') { game.stop(); game.state = 'idle'; if (game.turn) game.turn.active = false; hideOverlays(); inputBinder.clear(); }
    const top = topScores(3);
    $('attract-record').innerHTML = top.length
      ? '🏆 ' + top.map((s, i) => `#${i + 1} ${s.name} ${fmtPts(s.score)}`).join(' &nbsp;·&nbsp; ')
      : 'NEW PLAYER? STEP RIGHT UP!';
    show('attract');
  }
  screens.attract.addEventListener('pointerdown', () => { Sfx.click(); showMain(); });
  setInterval(() => {
    idleSeconds++;
    if (current === 'attract') return;
    const limit = current === 'game' ? 60 : 30;
    if (idleSeconds >= limit) showAttract();
  }, 1000);
  const wake = () => { idleSeconds = 0; Sfx.init(); if (settings.music > 0 && !Music.playing()) { Music.setVolume(settings.music); Music.start(); } };

  /* ---------- music volume control (upper right) ---------- */
  const musicSlider = $('music-slider');
  function renderMusic() {
    const pct = Math.round(settings.music * 100);
    musicSlider.value = pct;
    $('music-value').textContent = pct + '%';
    $('music-btn').textContent = pct === 0 ? '🔇' : (pct < 40 ? '🎵' : '🎶');
  }
  musicSlider.addEventListener('input', () => {
    settings.music = musicSlider.value / 100;
    Music.setVolume(settings.music);
    if (settings.music > 0 && !Music.playing()) { Sfx.init(); Music.start(); }
    renderMusic(); saveSettings();
  });
  $('music-btn').addEventListener('click', e => { e.stopPropagation(); $('music-pop').classList.toggle('open'); });
  $('music-pop').addEventListener('pointerdown', e => e.stopPropagation());
  $('music-btn').addEventListener('pointerdown', e => e.stopPropagation());
  window.addEventListener('pointerdown', () => $('music-pop').classList.remove('open'));
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', wake, true);
  window.addEventListener('touchstart', wake, true);

  /* button click sounds */
  document.addEventListener('click', e => { if (e.target.closest('.btn')) Sfx.click(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') { game.pause(); $('overlay-pause').classList.add('show'); } });

  /* debug handle (harmless in production) */
  window.ET = { game, startTurn, showMain, showAttract, showScores };

  /* ---------- boot ---------- */
  loadSettings();
  renderMusic();
  loadScores();
  loadPlayers();
  showMain();
})();
