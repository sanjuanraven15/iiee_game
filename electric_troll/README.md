# ⚡ Electrical Troll

A touchscreen troll platformer for a large TV. HTML5 + CSS3 + vanilla JavaScript, canvas rendering,
`localStorage` only — no server, database, accounts or network calls after the page has loaded.

## Run

Serve the folder (e.g. `http://localhost/iiee_game/` under XAMPP) or open `index.html` directly.
Tap **⛶** (or SETTINGS → FULLSCREEN) to go fullscreen on the TV.

### Phones & tablets

The game is landscape-only: in portrait it shows a ROTATE YOUR DEVICE prompt. On small screens the touch buttons
grow automatically (`#stage.compact`). Fonts are self-hosted in `fonts/` — no Google Fonts request.
On iPhone/iPad use Share → **Add to Home Screen** for a full-screen, app-like launch (Safari has no fullscreen API).

### Offline

`sw.js` is a service worker that caches every file on the first visit; afterwards the game opens and plays with
no connection at all. Service workers need **https or localhost** — over a plain LAN address like
`http://192.168.x.x/iiee_game/` browsers refuse to register one, so either serve over https, or install to the
home screen once while online. Whenever any file changes, bump the `?v=` tag in `index.html` **and**
`CACHE_VERSION`/`V` in `sw.js` so clients pick up the new files.

## Game modes

**Play a Turn** (default, for players taking turns on one TV): a turn is **10 levels with 10 lives** — no
timer. Every death costs a life; at zero it is GAME OVER and the score is recorded. Clearing all 10 wins.
The deck is a fresh shuffle each turn (3 easy, 3 medium, 2 hard, 2 brutal) and every level is scrambled
so nobody can predict what is coming:

- one of the level's **trap variants** is chosen (each level has 3 different trap layouts),
- the level may be **mirrored** left↔right,
- every trap's position and timing is **jittered**, 1–2 **extra surprise traps** are dropped on random ground
  spots (always ≥340 px from other gadgets), the exit may **run away** when approached, and ~45% of signs **lie**,
- traps can **swap type** between plays (a bulb spot may hold an arc or a crusher next time), some are **duds** that look armed but never fire, fake spikes can be real (and vice versa), an ordinary platform may secretly vanish, and the exit may start somewhere else entirely,
- standing still for 2.5–4.5 s (varies per level) drops a lightbulb on your head,
- **levels 7–10 are on LOCKDOWN**: a floor-to-ceiling force field seals the way to the exit and only a **remote
  BREAKER** switch opens it — ≥500 px back on the spawn side, on a ledge (half the time hidden right behind the
  spawn). Bumping the field shoves you back and Busby drops an indirect hint. Field and breaker positions are
  picked per play. (THE LONG WAY keeps its own built-in gate instead.)
- from the third level on, a **modifier** may apply: BLACKOUT, STATIC STORM, RUSH HOUR, LOW GRAVITY, HEAVY,
  TURBO or FOG (score multipliers ×1.25–×1.5).

Score per level = tier points (500/750/1000/1500) + time bonus − 50 per death, × modifier. The finished turn is
written to the local scoreboard (`electricalTrollScores`, top 50) and the player's stats
(`electricalTrollPlayers`). Attract mode shows the top 3. Tune `TURN_LEVELS` / `TURN_LIVES` in `js/levels.js`.


## 🔌 Zip (second game, in zip/)

Open zip/index.html (or **PLAY ZIP** on the main menu). One wire from terminal **1** to the last terminal, hitting
every number in order and filling **every cell** of the board. Puzzles are generated per play (random Hamiltonian
path + numbered terminals + walls), The run is endless: boards climb from 4x4 to 9x9 with up to 16 terminals and it only ends when the fuses do. **3 fuses per run**: only a wrong terminal — or closing on the last terminal before every cell is wired — blows one.
Undo is free and unlimited (drag back over the wire, or RESET WIRE); a dead end just tells you to back up. No fuses = run over.
A bulb beside the board charges as the circuit fills, shatters when a fuse goes, and blazes when the circuit closes. A turn is **one 3-minute clock** for the whole run, and the score is simply **how many circuits you close**
before it runs out. Three fuses can end it sooner, saved to the local scoreboard (zipScores, top 20). It is a self-contained folder (its own css, fonts,
Busby, service worker and manifest), so it installs and runs offline on its own.

## Controls

- Touch: **◀ ▶** bottom-left, **▲ JUMP** bottom-right (multi-touch — hold a direction and jump at the same time).
- Keyboard (for testing): arrows / WASD, Space to jump.

## Files

| File | Purpose |
|------|---------|
| `index.html` | All screens: attract, main menu, name entry, scoreboard, summary, settings, reset confirmation, game HUD/overlays |
| `css/style.css` | 1920×1080 stage scaled to the display, big TV-sized buttons, palette |
| `js/storage.js` | Local scoreboard (`addScore`, `topScores`), per-player stats (`recordTurn`, `recentNames`), settings, `resetProgress` |
| `js/audio.js` | Synthesised sound effects, happy/sad stingers and the looping chiptune music (Web Audio, no audio files) |
| `js/levels.js` | 20 level definitions with 2 extra trap variants each, mirroring, modifiers list, seeded turn-deck builder |
| `js/traps.js` | Trap/gadget classes (falling bulbs, vanishing platforms, fake exits, zap zones, batteries, crushers, magnets, static zones…) |
| `js/mascot.js` | Busby the mascot (SVG), player sprites, indirect hint texts |
| `js/game.js` | Engine: fixed-step physics, collisions, rendering, multi-touch input |
| `js/ui.js` | Screen flow, on-screen keyboard, turn flow, attract mode, music control, fullscreen |

## Saved data

All in `localStorage`: `electricalTrollScores` (top 50 turns), `electricalTrollPlayers` (per-name stats) and
`electricalTrollSettings` (sound on/off, music volume). Corrupt data is repaired to safe defaults on load.
RESET PROGRESS clears all of it.

## Adding a level or variant

Append an object to `LEVELS` in `js/levels.js` (with a `tier` 1–4) and bump `MAX_LEVEL` in `js/storage.js`.
A variant is a partial object in the level's `variants` array; any of `traps`, `platforms`, `hazards`,
`exit`, `spawn` it contains replaces the base. Mirroring is automatic. A new trap type needs a case in
`mirrorLevel()` if it has x-coordinates.
World coordinates are 1920×1080 with the ground surface at `y = 900`; helpers `ground`, `plat`, `block`, `pool`,
`spikes`, `sign` are provided. Trap types are listed in `TRAP_TYPES` at the bottom of `js/traps.js`.
