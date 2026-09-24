/* ⚡ ELECTRICAL TROLL — local scoreboard, player stats and settings (localStorage only, no server) */
'use strict';

const STORAGE_KEY = 'electricalTrollPlayer';
const SETTINGS_KEY = 'electricalTrollSettings';
const MAX_LEVEL = 20;
const NAME_MAX = 15;

let settings = { sound: true, music: 0.5 };

/* Keep names simple for the on-screen keyboard: letters, digits, spaces; max 15 chars. */
function sanitizeName(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/* RESET PROGRESS: wipes the scoreboard and every player's stats (and any old profile key from earlier versions). */
function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SCORES_KEY);
    localStorage.removeItem(PLAYERS_KEY);
  } catch (e) { /* ignore */ }
  scores = [];
  players = {};
}

/* ---------- turn mode: local scoreboard + per-player stats (still localStorage only) ---------- */
const SCORES_KEY = 'electricalTrollScores';
const PLAYERS_KEY = 'electricalTrollPlayers';
const SCORES_MAX = 50;
let scores = [];      // [{ name, score, levels, deaths, seed, date }] sorted by score desc
let players = {};     // { NAME: { bestScore, turns, totalDeaths, highestLevel, lastPlayed } }

function loadScores() {
  scores = [];
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    if (Array.isArray(raw)) {
      for (const s of raw) {
        if (!s || typeof s !== 'object') continue;
        const name = sanitizeName(s.name);
        if (!name) continue;
        scores.push({ name, score: clampInt(s.score, 0, 9999999), levels: clampInt(s.levels, 0, 999),
          deaths: clampInt(s.deaths, 0, 99999), seed: clampInt(s.seed, 0, 4294967295), date: typeof s.date === 'string' ? s.date : '' });
      }
    }
  } catch (e) { scores = []; }
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, SCORES_MAX);
  return scores;
}

function saveScores() {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(scores)); } catch (e) { /* ignore */ }
}

/* Adds a finished turn. Returns its rank (1 = best score ever on this TV). */
function addScore(entry) {
  const clean = { name: sanitizeName(entry.name), score: clampInt(entry.score, 0, 9999999), levels: clampInt(entry.levels, 0, 999),
    deaths: clampInt(entry.deaths, 0, 99999), seed: clampInt(entry.seed, 0, 4294967295), date: new Date().toISOString() };
  scores.push(clean);
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, SCORES_MAX);
  saveScores();
  const rank = scores.indexOf(clean) + 1;
  return rank > 0 ? rank : SCORES_MAX + 1;
}

function topScores(n = 10) { return scores.slice(0, n); }

function loadPlayers() {
  players = {};
  try {
    const raw = JSON.parse(localStorage.getItem(PLAYERS_KEY) || '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const k of Object.keys(raw)) {
        const name = sanitizeName(k), p = raw[k];
        if (!name || !p || typeof p !== 'object') continue;
        players[name] = { bestScore: clampInt(p.bestScore, 0, 9999999), turns: clampInt(p.turns, 0, 99999),
          totalDeaths: clampInt(p.totalDeaths, 0, 999999), highestLevel: clampInt(p.highestLevel, 0, MAX_LEVEL),
          lastPlayed: typeof p.lastPlayed === 'string' ? p.lastPlayed : '' };
      }
    }
  } catch (e) { players = {}; }
  return players;
}

function savePlayers() {
  try { localStorage.setItem(PLAYERS_KEY, JSON.stringify(players)); } catch (e) { /* ignore */ }
}

function getPlayer(name) {
  name = sanitizeName(name);
  if (!players[name]) players[name] = { bestScore: 0, turns: 0, totalDeaths: 0, highestLevel: 0, lastPlayed: '' };
  return players[name];
}

function recordTurn(name, result) {
  const p = getPlayer(name);
  p.turns++;
  p.totalDeaths += clampInt(result.deaths, 0, 99999);
  p.bestScore = Math.max(p.bestScore, clampInt(result.score, 0, 9999999));
  p.highestLevel = Math.max(p.highestLevel, clampInt(result.highestLevel, 0, MAX_LEVEL));
  p.lastPlayed = new Date().toISOString();
  savePlayers();
  return p;
}

/* Most recently seen names, for the quick-pick chips on the name screen. */
function recentNames(n = 8) {
  return Object.keys(players).sort((a, b) => (players[b].lastPlayed || '').localeCompare(players[a].lastPlayed || '')).slice(0, n);
}

/* Small local settings (sound on/off) */
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        settings.sound = s.sound !== false;
        settings.music = Number.isFinite(Number(s.music)) ? Math.max(0, Math.min(1, Number(s.music))) : 0.5;
      }
    }
  } catch (e) { settings = { sound: true, music: 0.5 }; }
  return settings;
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
