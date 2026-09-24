/* ⚡ ELECTRICAL TROLL — 20 original single-screen levels (1920x1080 world, ground top at y=900)
   Each level has a base trap set plus `variants` (partial overrides). One is picked at random per
   play, and the whole level may be mirrored, so a level never plays the same way twice. */
'use strict';

const G = 900;                                  // ground surface
const ground = (x1, x2) => ({ x: x1, y: G, w: x2 - x1, h: 180, kind: 'ground' });
const block = (x, y, w, h) => ({ x, y, w, h, kind: 'block' });
const plat = (x, y, w, h = 30) => ({ x, y, w, h, kind: 'plat' });
const pool = (x1, x2) => ({ type: 'pool', x: x1, y: 940, w: x2 - x1, h: 140 });   // electrified liquid
const spikes = (x, w, y = 870) => ({ type: 'spikes', x, y, w, h: 30 });
const sign = (x, text, y = G) => ({ type: 'sign', x, y, text });

const DEATH_MESSAGES = [
  'Watt just happened?!',
  'Ohm my goodness!',
  'Current status: FRIED.',
  'That was... shocking.',
  'Resistance was futile.',
  'You have been grounded.',
  'Short circuit detected!',
  'That really hertz.',
  'Amp\'d up a little too much.',
  'Sparky is now extra crispy.',
  'Insulation not included.',
  'You are positively negative now.',
  'The lightbulb had a bright idea.',
  'Battery: 1 — You: 0',
  'Zap! Right in the transistor.',
  'Well, that circuit is broken.',
  'Please don\'t conduct yourself like that.',
  'Static-ally speaking: bad move.',
  'Your fuse just blew.',
  'Try re-volting. Get it? Retry.',
  'Skill issue detected.',
  'The trap saw that coming. You did not.',
  'Have you tried NOT dying?',
  'That one was obvious. Honestly.',
  'The exit is laughing at you.',
  'Nice try. No, actually, it was not.',
  'Plot twist: it was a trap.',
  'Maybe walking is not your thing.',
  'The sign lied. Signs do that.'
];

/* Signs sometimes lie. Sometimes they just mock you. */
const TROLL_SIGNS = [
  'TOTALLY SAFE →', 'NOTHING HERE, PROMISE', 'NO TRAPS AHEAD', 'YOU GOT THIS', 'JUST RUN!', 'DO NOT JUMP',
  'JUMP NOW!', 'THE FLOOR IS FINE', 'TRUST THE SIGN', 'STOP READING, GO!', 'SAFE ZONE', 'WHY ARE YOU STILL HERE?',
  'THIS ONE IS EASY', 'DO NOT STAND STILL...', 'GO BACK', 'ALMOST THERE (NOT)'
];

const TURN_LEVELS = 10;   // a turn is exactly ten levels
const TURN_LIVES = 10;    // ten deaths and it is game over
const TEST_INFINITE_LIVES = false;   // TESTING: deaths do not cost lives. Set to false before the real launch!

/* Turn modifiers ("mutators") — announced at level start, multiply the level score. */
const MODIFIERS = [
  { id: 'none',      label: '',                 mult: 1.0 },
  { id: 'blackout',  label: '🌑 BLACKOUT',       mult: 1.5, desc: 'Only a small light around you' },
  { id: 'static',    label: '⚡ STATIC STORM',   mult: 1.5, desc: 'Controls reversed all level' },
  { id: 'rush',      label: '🔋 RUSH HOUR',      mult: 1.5, desc: 'Batteries keep coming' },
  { id: 'lowgrav',   label: '🎈 LOW GRAVITY',    mult: 1.25, desc: 'Floaty jumps' },
  { id: 'heavy',     label: '🪨 HEAVY',          mult: 1.25, desc: 'Short, heavy jumps' },
  { id: 'turbo',     label: '💨 TURBO',          mult: 1.25, desc: 'You run much faster' },
  { id: 'fog',       label: '🌫 FOG',            mult: 1.25, desc: 'Signs are unreadable' }
];

const TIER_NAMES = ['', 'EASY', 'MEDIUM', 'HARD', 'BRUTAL'];
const TIER_POINTS = [0, 500, 750, 1000, 1500];

const LEVELS = [
  /* 1 */ {
    name: 'WARM-UP', tier: 1,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 1920), block(900, 820, 160, 80)],
    hazards: [],
    traps: [sign(300, 'WALK TO THE EXIT →'), sign(1450, 'NOTHING TO SEE HERE'),
      { type: 'bulb', x: 1550, y: 560, trigger: [1400, 1920] }],
    variants: [
      { traps: [sign(300, 'WALK TO THE EXIT →'), sign(1300, 'ALMOST THERE!'),
        { type: 'surprise', x: 1400, y: 700, w: 70, h: 200, trigger: [1330, 1500], warn: 0.3, on: 0.7, off: 1.4 }] },
      { traps: [sign(300, 'WALK TO THE EXIT →'), sign(1300, 'WATCH YOUR HEAD'),
        { type: 'crusher', x: 1500, y: 260, w: 120, h: 120, trigger: [1350, 1400], speed: 1500, warn: 0 }] }
    ]
  },
  /* 2 */ {
    name: 'MIND THE GAP', tier: 1,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 600), ground(860, 1250), ground(1600, 1920)],
    hazards: [pool(600, 860), pool(1250, 1600)],
    traps: [sign(300, 'MIND THE GAP'),
      { type: 'shifter', x: 1380, y: 720, w: 120, h: 30, delay: 0.5, dir: 1, dist: 220 },
      { type: 'vanish', x: 1330, y: 900, w: 190, h: 180, delay: 0.4 }],
    variants: [
      { platforms: [ground(0, 600), ground(860, 1250), ground(1600, 1920), plat(1380, 720, 120), block(1330, 900, 190, 180)],
        traps: [sign(300, 'MIND THE GAP'), { type: 'bulb', x: 1420, y: 560, trigger: [1300, 1520] }] },
      { traps: [sign(300, 'MIND THE GAP'),
        { type: 'surprise', x: 700, y: 700, w: 60, h: 200, trigger: [520, 600], warn: 0.3, on: 0.7, off: 1.4 },
        { type: 'vanish', x: 1330, y: 900, w: 190, h: 180, delay: 0.4 }] }
    ]
  },
  /* 3 */ {
    name: 'WRONG DOOR', tier: 1,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 620, hidden: true },
    platforms: [ground(0, 1920), block(1600, 720, 320, 180)],
    hazards: [],
    traps: [sign(650, 'EXIT →'),
      { type: 'fakeExit', x: 900, y: 800, revealRange: 260, range: 110 }],
    variants: [
      { exit: { x: 400, y: 800, hidden: true },
        traps: [sign(650, 'EXIT →'), sign(1450, 'UP HERE →'), { type: 'fakeExit', x: 1780, y: 620, revealRange: 260, range: 110 }] },
      { traps: [sign(500, 'EXIT →'),
        { type: 'fakeExit', x: 700, y: 800, revealRange: 200, range: 110 },
        { type: 'fakeExit', x: 1200, y: 800, revealRange: 200, range: 110 }] }
    ]
  },
  /* 4 */ {
    name: 'SHORT CIRCUIT STAIRS', tier: 1,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 420 },
    platforms: [ground(0, 700), plat(760, 760, 180), plat(1320, 520, 180), plat(1600, 520, 320)],
    hazards: [pool(700, 1920)],
    traps: [sign(400, 'KEEP MOVING!'),
      { type: 'vanish', x: 1040, y: 640, w: 180, delay: 0.5 },
      { type: 'zap', x: 1500, y: 400, w: 60, h: 120, on: 0.9, off: 1.6 }],
    variants: [
      { platforms: [ground(0, 700), plat(760, 760, 180), plat(1040, 640, 180), plat(1600, 520, 320)],
        traps: [sign(400, 'KEEP MOVING!'),
          { type: 'vanish', x: 1320, y: 520, w: 180, delay: 0.5 },
          { type: 'zap', x: 1500, y: 400, w: 60, h: 120, on: 0.9, off: 1.6 }] },
      { platforms: [ground(0, 700), plat(760, 760, 180), plat(1040, 640, 180), plat(1320, 520, 180), plat(1600, 520, 320)],
        traps: [sign(400, 'LOOK UP!'),
          { type: 'bulb', x: 850, y: 300, trigger: [760, 940] },
          { type: 'bulb', x: 1410, y: 100, trigger: [1320, 1500] },
          { type: 'zap', x: 1560, y: 400, w: 60, h: 120, on: 0.6, off: 1.2 }] }
    ]
  },
  /* 5 */ {
    name: 'BATTERY RUN', tier: 1,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 1920)],
    hazards: [],
    traps: [sign(300, 'BATTERIES NOT INCLUDED'),
      { type: 'popSpikes', x: 880, y: 870, w: 160, delay: 0.25, on: 1.0, off: 2.0 },
      { type: 'battery', x: 1900, y: 840, dir: -1, speed: 380, trigger: [500, 700] },
      { type: 'battery', x: 1900, y: 840, dir: -1, speed: 460, trigger: [1050, 1250] },
      { type: 'battery', x: 1900, y: 840, dir: -1, speed: 600, trigger: [1500, 1650] }],
    variants: [
      { traps: [sign(300, 'LOOK BEHIND YOU'),
        { type: 'battery', x: 1900, y: 840, dir: -1, speed: 400, trigger: [400, 600] },
        { type: 'battery', x: -60, y: 840, dir: 1, speed: 650, trigger: [700, 800] },
        { type: 'battery', x: 1900, y: 840, dir: -1, speed: 500, trigger: [1300, 1450] }] },
      { traps: [sign(300, 'BATTERY SALE!'),
        { type: 'battery', x: 1840, y: 840, dir: -1, speed: 340, every: 2.5, max: 3 },
        { type: 'surprise', x: 1300, y: 700, w: 60, h: 200, trigger: [1200, 1400], warn: 0.3, on: 0.6, off: 1.4 }] }
    ]
  },
  /* 6 */ {
    name: 'SPRING LOADED', tier: 2,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 400 },
    platforms: [ground(0, 1920), plat(700, 470, 220), plat(1050, 560, 200), plat(1500, 500, 420)],
    hazards: [],
    traps: [sign(300, 'BOING!'), sign(1300, '↑ UP THERE ↑'),
      { type: 'spring', x: 420, y: 870, power: 1750 },
      { type: 'vanish', x: 300, y: 420, w: 260, delay: 0.35 },
      { type: 'bulb', x: 1150, y: 60, trigger: [1050, 1250] }],
    variants: [
      { platforms: [ground(0, 1920), plat(300, 420, 260), plat(1050, 560, 200), plat(1500, 500, 420)],
        traps: [sign(300, 'BOING!'), sign(1300, '↑ UP THERE ↑'),
          { type: 'spring', x: 420, y: 870, power: 1750 },
          { type: 'vanish', x: 700, y: 470, w: 220, delay: 0.4 },
          { type: 'bulb', x: 1650, y: 100, trigger: [1500, 1700] }] },
      { traps: [sign(300, 'BOING!'), sign(1200, 'BOING AGAIN!'),
        { type: 'spring', x: 420, y: 870, power: 1750 },
        { type: 'spring', x: 1300, y: 870, power: 1500 },
        { type: 'vanish', x: 300, y: 420, w: 260, delay: 0.35 },
        { type: 'surprise', x: 1150, y: 700, w: 60, h: 200, trigger: [1000, 1100], warn: 0.3, on: 0.7, off: 1.3 }] }
    ]
  },
  /* 7 */ {
    name: 'PUSH ME', tier: 2,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 1920)],
    hazards: [],
    traps: [sign(500, 'PRESS THE SWITCH TO OPEN THE GATE'),
      { type: 'switch', x: 800, y: 900, id: 'g1' },
      { type: 'gate', x: 1500, y: 700, w: 60, h: 200, id: 'g1' },
      { type: 'battery', x: 1900, y: 840, dir: -1, speed: 420, armedBy: 'g1' }],
    variants: [
      { traps: [sign(500, 'PRESS THE SWITCH TO OPEN THE GATE'),
        { type: 'switch', x: 800, y: 900, id: 'g1' },
        { type: 'gate', x: 1500, y: 700, w: 60, h: 200, id: 'g1' },
        { type: 'crusher', x: 1300, y: 260, w: 120, h: 120, trigger: [1150, 1210], speed: 1500, warn: 0, armedBy: 'g1' }] },
      { traps: [sign(400, 'PRESS THE SWITCH'),
        { type: 'switch', x: 600, y: 900, id: 'd' },
        { type: 'switch', x: 1200, y: 900, id: 'g1' },
        { type: 'gate', x: 1500, y: 700, w: 60, h: 200, id: 'g1' },
        { type: 'bulb', x: 640, y: 560, trigger: [0, 1920], armedBy: 'd' }] }
    ]
  },
  /* 8 */ {
    name: 'CONVEYOR CHAOS', tier: 2,
    spawn: { x: 120, y: 840 }, exit: { x: 1790, y: 800 },
    platforms: [ground(0, 400), ground(1700, 1920)],
    hazards: [pool(400, 1700)],
    traps: [sign(200, 'MOVING WALKWAYS AHEAD'),
      { type: 'conveyor', x: 400, y: 900, w: 400, dir: -1, speed: 300 },
      { type: 'conveyor', x: 900, y: 900, w: 300, dir: 1, speed: 450 },
      { type: 'conveyor', x: 1400, y: 900, w: 300, dir: -1, speed: 250 },
      { type: 'zap', x: 1550, y: 780, w: 60, h: 120, on: 0.7, off: 1.3 }],
    variants: [
      { traps: [sign(200, 'MOVING WALKWAYS AHEAD'),
        { type: 'conveyor', x: 400, y: 900, w: 400, dir: 1, speed: 350 },
        { type: 'conveyor', x: 900, y: 900, w: 300, dir: -1, speed: 300 },
        { type: 'conveyor', x: 1400, y: 900, w: 300, dir: 1, speed: 400 },
        { type: 'zap', x: 1000, y: 780, w: 60, h: 120, on: 0.7, off: 1.3 }] },
      { traps: [sign(200, 'FAST WALKWAYS AHEAD'),
        { type: 'conveyor', x: 400, y: 900, w: 400, dir: -1, speed: 380 },
        { type: 'conveyor', x: 900, y: 900, w: 300, dir: 1, speed: 550 },
        { type: 'conveyor', x: 1400, y: 900, w: 300, dir: -1, speed: 330 },
        { type: 'bulb', x: 1050, y: 560, trigger: [900, 1100] }] }
    ]
  },
  /* 9 */ {
    name: 'TRUST ISSUES', tier: 2,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 1920), plat(600, 720, 180), plat(1160, 720, 180)],
    hazards: [],
    traps: [sign(450, 'DANGER! DO NOT TOUCH!'),
      { type: 'fakeSpikes', x: 700, y: 870, w: 600 },
      { type: 'vanish', x: 880, y: 620, w: 180, delay: 0.3 },
      { type: 'surprise', x: 1340, y: 700, w: 80, h: 200, trigger: [1300, 1460], warn: 0.3, on: 0.7, off: 1.4 }],
    variants: [
      { platforms: [ground(0, 1920), plat(600, 720, 180), plat(880, 620, 180), plat(1160, 720, 180)],
        hazards: [spikes(700, 600)],
        traps: [sign(450, 'JUST WALK. TRUST ME.'),
          { type: 'surprise', x: 1340, y: 700, w: 80, h: 200, trigger: [1300, 1460], warn: 0.3, on: 0.7, off: 1.4 }] },
      { hazards: [spikes(1000, 300)],
        traps: [sign(450, 'THE LEFT HALF IS SAFE'),
          { type: 'fakeSpikes', x: 700, y: 870, w: 300 },
          { type: 'vanish', x: 880, y: 620, w: 180, delay: 0.3 },
          { type: 'surprise', x: 1340, y: 700, w: 80, h: 200, trigger: [1300, 1460], warn: 0.3, on: 0.7, off: 1.4 }] }
    ]
  },
  /* 10 */ {
    name: 'MOVING PARTS', tier: 2,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 300), ground(1620, 1920)],
    hazards: [pool(300, 1620)],
    traps: [sign(100, 'WAIT FOR IT...'),
      { type: 'mover', x1: 350, y1: 800, x2: 750, y2: 800, w: 160, speed: 200 },
      { type: 'mover', x1: 950, y1: 650, x2: 1300, y2: 650, w: 160, speed: 220 },
      { type: 'zap', x: 1560, y: 700, w: 60, h: 200, on: 0.6, off: 1.5 }],
    variants: [
      { traps: [sign(100, 'WAIT FOR IT...'),
        { type: 'mover', x1: 350, y1: 800, x2: 750, y2: 800, w: 160, speed: 200 },
        { type: 'mover', x1: 950, y1: 750, x2: 1300, y2: 600, w: 160, speed: 220 },
        { type: 'bulb', x: 800, y: 400, trigger: [700, 900] },
        { type: 'zap', x: 1560, y: 700, w: 60, h: 200, on: 0.6, off: 1.5 }] },
      { traps: [sign(100, 'HOP HOP HOP'),
        { type: 'mover', x1: 350, y1: 800, x2: 600, y2: 800, w: 120, speed: 220 },
        { type: 'mover', x1: 750, y1: 700, x2: 1000, y2: 700, w: 120, speed: 240 },
        { type: 'mover', x1: 1150, y1: 650, x2: 1450, y2: 650, w: 120, speed: 260 },
        { type: 'zap', x: 1560, y: 700, w: 60, h: 200, on: 0.6, off: 1.5 }] }
    ]
  },
  /* 11 */ {
    name: 'STATIC SHOCK', tier: 3,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 600), ground(800, 1200), ground(1450, 1920)],
    hazards: [pool(600, 800), pool(1200, 1450)],
    traps: [sign(350, 'STATIC AHEAD!'),
      { type: 'static', x: 830, y: 300, w: 670, h: 600 },
      { type: 'battery', x: 1900, y: 840, dir: -1, speed: 300, trigger: [1450, 1560] }],
    variants: [
      { traps: [sign(200, 'STATIC EVERYWHERE!'),
        { type: 'static', x: 300, y: 300, w: 1200, h: 600 },
        { type: 'battery', x: 1900, y: 840, dir: -1, speed: 300, trigger: [1450, 1560] }] },
      { traps: [sign(350, 'STATIC AHEAD!'),
        { type: 'static', x: 1150, y: 300, w: 350, h: 600 },
        { type: 'bulb', x: 1000, y: 560, trigger: [900, 1050] },
        { type: 'battery', x: 1900, y: 840, dir: -1, speed: 340, trigger: [1450, 1560] }] }
    ]
  },
  /* 12 */ {
    name: 'MAGNET MADNESS', tier: 3,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 700), ground(950, 1920), block(0, 620, 140, 40)],
    hazards: [pool(700, 950), spikes(1500, 80)],
    traps: [sign(300, 'WHAT IS THAT HUM?'),
      { type: 'magnet', x: 40, y: 540, zone: { x: 950, y: 0, w: 900, h: 900 }, pull: -200, triggerX: 1000 }],
    variants: [
      { platforms: [ground(0, 700), ground(950, 1920), block(1780, 620, 140, 40)],
        traps: [sign(300, 'WHAT IS THAT HUM?'),
          { type: 'magnet', x: 1830, y: 540, zone: { x: 950, y: 0, w: 900, h: 900 }, pull: 220, triggerX: 1000 }] },
      { traps: [sign(300, 'IT COMES AND GOES'),
        { type: 'magnet', x: 40, y: 540, zone: { x: 950, y: 0, w: 900, h: 900 }, pull: -260, triggerX: 1000, pulse: { on: 1, off: 1 } },
        { type: 'zap', x: 1300, y: 700, w: 60, h: 200, on: 0.6, off: 1.2 }] }
    ]
  },
  /* 13 */ {
    name: 'CRUSHER', tier: 3,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 500 },
    platforms: [ground(0, 1920), block(1450, 600, 470, 300)],
    hazards: [],
    traps: [sign(250, 'LOOK UP!'),
      { type: 'crusher', x: 450, y: 260, w: 120, h: 120, trigger: [600, 700], speed: 1500 },
      { type: 'crusher', x: 850, y: 260, w: 120, h: 120, trigger: [500, 560], speed: 1500 },
      { type: 'crusher', x: 1300, y: 260, w: 120, h: 120, trigger: [1150, 1210], speed: 1500, warn: 0, step: true }],   // lands beside the block: your step up
    variants: [
      { traps: [sign(250, 'LOOK UP!'),
        { type: 'crusher', x: 450, y: 260, w: 120, h: 120, trigger: [300, 360], speed: 1500, warn: 0 },
        { type: 'crusher', x: 850, y: 260, w: 120, h: 120, trigger: [700, 760], speed: 1500 },
        { type: 'crusher', x: 1300, y: 260, w: 120, h: 120, trigger: [1150, 1210], speed: 1500, warn: 0, step: true }] },
      { traps: [sign(250, 'LOOK UP!'),
        { type: 'crusher', x: 600, y: 260, w: 120, h: 120, trigger: [450, 510], speed: 1500, warn: 0 },
        { type: 'crusher', x: 1000, y: 260, w: 120, h: 120, trigger: [850, 910], speed: 1500 },
        { type: 'crusher', x: 1300, y: 260, w: 120, h: 120, trigger: [1150, 1210], speed: 1500, warn: 0, step: true }] }
    ]
  },
  /* 14 */ {
    name: 'WHICH SWITCH?', tier: 3,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 1920)],
    hazards: [],
    traps: [sign(280, 'PRESS THE MIDDLE SWITCH'),
      { type: 'switch', x: 460, y: 900, id: 'a' },
      { type: 'switch', x: 800, y: 900, id: 'b' },
      { type: 'switch', x: 1140, y: 900, id: 'c' },
      { type: 'gate', x: 1500, y: 700, w: 60, h: 200, id: 'c' },
      { type: 'battery', x: -60, y: 840, dir: 1, speed: 600, armedBy: 'a' },
      { type: 'surprise', x: 770, y: 700, w: 140, h: 200, trigger: [0, 1920], armedBy: 'b', warn: 0.25, on: 0.8, repeat: false },
      { type: 'bulb', x: 1420, y: 560, trigger: [1270, 1460], armedBy: 'c' }],
    variants: [
      { traps: [sign(280, 'PRESS THE LEFT SWITCH'),
        { type: 'switch', x: 460, y: 900, id: 'a' },
        { type: 'switch', x: 800, y: 900, id: 'b' },
        { type: 'switch', x: 1140, y: 900, id: 'c' },
        { type: 'gate', x: 1500, y: 700, w: 60, h: 200, id: 'a' },
        { type: 'bulb', x: 1420, y: 560, trigger: [1270, 1460], armedBy: 'a' },
        { type: 'battery', x: -60, y: 840, dir: 1, speed: 600, armedBy: 'b' },
        { type: 'surprise', x: 1110, y: 700, w: 140, h: 200, trigger: [0, 1920], armedBy: 'c', warn: 0.25, on: 0.8, repeat: false }] },
      { traps: [sign(280, 'PRESS ALL THREE'),
        { type: 'switch', x: 460, y: 900, id: 'a' },
        { type: 'switch', x: 800, y: 900, id: 'b' },
        { type: 'switch', x: 1140, y: 900, id: 'c' },
        { type: 'gate', x: 1500, y: 700, w: 60, h: 200, id: 'a' },
        { type: 'crusher', x: 1300, y: 260, w: 120, h: 120, trigger: [1150, 1210], speed: 1500, warn: 0, armedBy: 'b' },
        { type: 'battery', x: -60, y: 840, dir: 1, speed: 650, armedBy: 'c' }] }
    ]
  },
  /* 15 */ {
    name: 'INVISIBLE PATH', tier: 3,
    spawn: { x: 120, y: 840 }, exit: { x: 1780, y: 800 },
    platforms: [ground(0, 400), ground(1600, 1920)],
    hazards: [pool(400, 1600)],
    traps: [sign(200, 'MORE THAN MEETS THE EYE'),
      { type: 'vanish', x: 430, y: 880, w: 100, h: 20, delay: 0.3 },
      { type: 'hidden', x: 520, y: 800, w: 140 },
      { type: 'hidden', x: 800, y: 700, w: 140 },
      { type: 'hidden', x: 1080, y: 760, w: 140 },
      { type: 'hidden', x: 1360, y: 820, w: 140 }],
    variants: [
      { traps: [sign(200, 'MORE THAN MEETS THE EYE'),
        { type: 'hidden', x: 520, y: 820, w: 140 },
        { type: 'hidden', x: 800, y: 740, w: 140 },
        { type: 'hidden', x: 1080, y: 660, w: 140 },
        { type: 'hidden', x: 1360, y: 760, w: 140 }] },
      { traps: [sign(200, 'MORE THAN MEETS THE EYE'),
        { type: 'vanish', x: 700, y: 860, w: 120, h: 30, delay: 0.3 },
        { type: 'hidden', x: 560, y: 780, w: 160 },
        { type: 'hidden', x: 900, y: 720, w: 160 },
        { type: 'hidden', x: 1240, y: 800, w: 160 }] }
    ]
  },
  /* 16 */ {
    name: 'LASER HALL', tier: 4,
    spawn: { x: 120, y: 840 }, exit: { x: 1400, y: 800, moveTo: { x: 1780, y: 400 }, range: 150 },
    platforms: [ground(0, 1920), plat(1600, 500, 320)],
    hazards: [],
    traps: [sign(250, 'TIMING IS EVERYTHING'),
      { type: 'zap', x: 500, y: 0, w: 30, h: 900, on: 0.9, off: 1.4, phase: 0 },
      { type: 'zap', x: 820, y: 0, w: 30, h: 900, on: 0.9, off: 1.4, phase: 0.8 },
      { type: 'zap', x: 1140, y: 0, w: 30, h: 900, on: 0.9, off: 1.4, phase: 1.6 },
      { type: 'spring', x: 1460, y: 870, power: 1500 }],
    variants: [
      { traps: [sign(250, 'TIMING IS EVERYTHING'),
        { type: 'zap', x: 600, y: 0, w: 30, h: 900, on: 0.7, off: 1.1, phase: 0 },
        { type: 'zap', x: 900, y: 0, w: 30, h: 900, on: 0.7, off: 1.1, phase: 0.5 },
        { type: 'zap', x: 1200, y: 0, w: 30, h: 900, on: 0.7, off: 1.1, phase: 1.0 },
        { type: 'spring', x: 1460, y: 870, power: 1500 }] },
      { exit: { x: 1400, y: 800, moveTo: { x: 200, y: 800 }, range: 150 },
        traps: [sign(250, 'TIMING IS EVERYTHING'),
          { type: 'zap', x: 500, y: 0, w: 30, h: 900, on: 0.9, off: 1.4, phase: 0 },
          { type: 'zap', x: 820, y: 0, w: 30, h: 900, on: 0.9, off: 1.4, phase: 0.8 },
          { type: 'zap', x: 1140, y: 0, w: 30, h: 900, on: 0.9, off: 1.4, phase: 1.6 }] }
    ]
  },
  /* 17 */ {
    name: 'BATTERY STORM', tier: 4,
    spawn: { x: 120, y: 840 }, exit: { x: 1700, y: 320 },
    platforms: [ground(0, 1920), plat(400, 740, 1520), plat(0, 580, 1400), plat(400, 420, 1520),
      block(-60, 0, 60, 1080), block(1920, 0, 60, 1080)],
    hazards: [],
    traps: [sign(150, 'UP, UP, UP!'),
      { type: 'battery', x: 1840, y: 360, dir: -1, speed: 260, every: 3, max: 4 }],
    variants: [
      { traps: [sign(150, 'UP, UP, UP!'),
        { type: 'battery', x: 1840, y: 360, dir: -1, speed: 300, every: 2.2, max: 5 }] },
      { traps: [sign(150, 'UP, UP, UP!'),
        { type: 'battery', x: 1840, y: 360, dir: -1, speed: 260, every: 3, max: 4 },
        { type: 'bulb', x: 1450, y: 300, trigger: [1380, 1520] }] }
    ]
  },
  /* 18 */ {
    name: 'THE LONG WAY', tier: 4,
    spawn: { x: 260, y: 840 }, exit: { x: 60, y: 800 },   // exit is in a pocket right behind you; the gate seals it, the switch is at the far end
    platforms: [ground(0, 1300), ground(1550, 1650)],
    hazards: [pool(1300, 1550), spikes(600, 90)],
    traps: [sign(330, 'SO CLOSE...'), sign(1720, 'PRESS ME!'),
      { type: 'gate', x: 150, y: 600, w: 60, h: 300, id: 's' },
      { type: 'zap', x: 1000, y: 700, w: 60, h: 200, on: 0.8, off: 1.2 },
      { type: 'vanish', x: 1360, y: 900, w: 130, h: 180, delay: 0.5 },
      { type: 'floorDrop', x: 1650, y: 900, w: 270, h: 180, id: 's', delay: 1.2 },
      { type: 'switch', x: 1800, y: 900, id: 's' },
      { type: 'battery', x: -60, y: 840, dir: 1, speed: 450, armedBy: 's', trigger: [1200, 1300] }],
    variants: [
      { platforms: [ground(0, 1300), ground(1550, 1650), block(1360, 900, 130, 180)],
        traps: [sign(330, 'SO CLOSE...'), sign(1720, 'PRESS ME!'),
          { type: 'gate', x: 150, y: 600, w: 60, h: 300, id: 's' },
          { type: 'zap', x: 1000, y: 700, w: 60, h: 200, on: 0.5, off: 0.9 },
          { type: 'floorDrop', x: 1650, y: 900, w: 270, h: 180, id: 's', delay: 0.8 },
          { type: 'switch', x: 1800, y: 900, id: 's' },
          { type: 'battery', x: -60, y: 840, dir: 1, speed: 450, armedBy: 's', trigger: [1200, 1300] }] },
      { platforms: [ground(0, 1300), ground(1650, 1920)],
        traps: [sign(330, 'SO CLOSE...'), sign(1750, 'NOTHING HERE'),
          { type: 'gate', x: 150, y: 600, w: 60, h: 300, id: 's' },
          { type: 'zap', x: 1000, y: 700, w: 60, h: 200, on: 0.8, off: 1.2 },
          { type: 'vanish', x: 1360, y: 900, w: 130, h: 180, delay: 0.5 },
          { type: 'floorDrop', x: 1550, y: 900, w: 100, h: 180, id: 's', delay: 1.0 },
          { type: 'switch', x: 1570, y: 900, id: 's' },
          { type: 'battery', x: -60, y: 840, dir: 1, speed: 450, armedBy: 's', trigger: [1200, 1300] }] }
    ]
  },
  /* 19 */ {
    name: 'EVERYTHING AT ONCE', tier: 4,
    spawn: { x: 100, y: 840 }, exit: { x: 1800, y: 800 },
    platforms: [ground(0, 500), ground(700, 1000), ground(1250, 1920)],
    hazards: [pool(500, 700), pool(1000, 1250), spikes(1400, 80)],
    traps: [sign(200, 'EVERYTHING AT ONCE!'),
      { type: 'bulb', x: 350, y: 560, trigger: [200, 420] },
      { type: 'vanish', x: 540, y: 900, w: 120, h: 180, delay: 0.35 },
      { type: 'fakeSpikes', x: 750, y: 870, w: 200 },
      { type: 'battery', x: 1900, y: 840, dir: -1, speed: 420, trigger: [1250, 1320] },
      { type: 'zap', x: 1600, y: 700, w: 60, h: 200, on: 0.7, off: 1.3 }],
    variants: [
      { traps: [sign(200, 'EVERYTHING AT ONCE!'),
        { type: 'battery', x: -60, y: 840, dir: 1, speed: 500, trigger: [300, 400] },
        { type: 'vanish', x: 540, y: 900, w: 120, h: 180, delay: 0.35 },
        { type: 'fakeSpikes', x: 750, y: 870, w: 200 },
        { type: 'bulb', x: 900, y: 560, trigger: [780, 950] },
        { type: 'zap', x: 1600, y: 700, w: 60, h: 200, on: 0.7, off: 1.3 }] },
      { traps: [sign(200, 'EVERYTHING AT ONCE!'),
        { type: 'bulb', x: 350, y: 560, trigger: [200, 420] },
        { type: 'vanish', x: 540, y: 900, w: 120, h: 180, delay: 0.35 },
        { type: 'fakeSpikes', x: 750, y: 870, w: 200 },
        { type: 'crusher', x: 1300, y: 260, w: 120, h: 120, trigger: [1250, 1290], speed: 1500, warn: 0 },
        { type: 'zap', x: 1600, y: 700, w: 60, h: 200, on: 0.7, off: 1.3 }] }
    ]
  },
  /* 20 */ {
    name: 'THE GENERATOR', tier: 4,
    spawn: { x: 100, y: 840 }, exit: { x: 1780, y: 800, moveTo: { x: 1840, y: 380 }, range: 150 },
    platforms: [ground(0, 400), ground(1520, 1920), plat(760, 700, 160), plat(1320, 700, 160), plat(1720, 480, 200)],
    hazards: [pool(400, 1520)],
    traps: [sign(150, 'THE FINAL TEST'),
      { type: 'mover', x1: 420, y1: 820, x2: 620, y2: 820, w: 150, speed: 200 },
      { type: 'zap', x: 960, y: 0, w: 40, h: 900, on: 1.0, off: 1.6 },
      { type: 'vanish', x: 1060, y: 640, w: 160, delay: 0.6 },
      { type: 'mover', x1: 1560, y1: 840, x2: 1560, y2: 560, w: 150, speed: 150 },
      { type: 'bulb', x: 1820, y: 300, trigger: [1700, 1760] },
      { type: 'surprise', x: 1740, y: 380, w: 60, h: 100, trigger: [1720, 1790], warn: 0.3, on: 0.6, off: 1.2 }],
    variants: [
      { exit: { x: 1780, y: 800, moveTo: { x: 200, y: 800 }, range: 150 },
        traps: [sign(150, 'THE FINAL TEST'),
          { type: 'mover', x1: 420, y1: 820, x2: 620, y2: 820, w: 150, speed: 200 },
          { type: 'zap', x: 960, y: 0, w: 40, h: 900, on: 1.0, off: 1.6 },
          { type: 'vanish', x: 1060, y: 640, w: 160, delay: 0.6 },
          { type: 'bulb', x: 1700, y: 560, trigger: [1600, 1720] }] },
      { traps: [sign(150, 'THE FINAL TEST'),
        { type: 'mover', x1: 420, y1: 820, x2: 620, y2: 820, w: 150, speed: 200 },
        { type: 'zap', x: 960, y: 0, w: 40, h: 900, on: 0.6, off: 1.0 },
        { type: 'vanish', x: 1060, y: 640, w: 160, delay: 0.4 },
        { type: 'mover', x1: 1560, y1: 840, x2: 1560, y2: 560, w: 150, speed: 150 },
        { type: 'battery', x: 1880, y: 420, dir: -1, speed: 200, every: 3, max: 2 },
        { type: 'surprise', x: 1740, y: 380, w: 60, h: 100, trigger: [1720, 1790], warn: 0.3, on: 0.6, off: 1.2 }] }
    ]
  }
];

/* ---------- level resolution: variant choice + optional mirroring ---------- */

const W = 1920;
const clone = o => JSON.parse(JSON.stringify(o));

function variantCount(n) { return 1 + ((LEVELS[n - 1].variants || []).length); }

/* Build a concrete level definition: base level with variant `v` (0 = base) applied, optionally mirrored. */
function resolveLevel(n, v = 0, mirror = false, salt = null, lockdown = false) {
  const base = LEVELS[n - 1];
  const def = clone({ name: base.name, tier: base.tier, spawn: base.spawn, exit: base.exit, platforms: base.platforms, hazards: base.hazards, traps: base.traps });
  if (v > 0 && base.variants && base.variants[v - 1]) Object.assign(def, clone(base.variants[v - 1]));
  def.level = n; def.variant = v; def.mirrored = mirror;
  if (salt !== null && salt !== undefined) scrambleLevel(def, makeRng(salt));
  if (lockdown) addLockdown(def, makeRng(((salt ?? 1) * 31 + 7) >>> 0));
  return mirror ? mirrorLevel(def) : def;
}

/* ---------- per-play scramble: the same variant never plays the same way twice ----------
   Jitters every trap's position and timing, drops 1-3 extra surprise traps on random
   ground spots, sometimes makes the exit run away, and rewrites some signs to lie. */
/* Rough footprint of a trap, used to keep exits and new traps out of each other's way. */
function trapRect(t) {
  switch (t.type) {
    case 'zap': case 'surprise': case 'static': case 'gate': case 'floorDrop': case 'vanish': case 'hidden': case 'fakeSpikes': case 'popSpikes': case 'shifter': case 'barrier':
      return { x: t.x, y: t.y, w: t.w, h: t.h || 30 };
    case 'crusher': return { x: t.x, y: t.y, w: t.w, h: 900 - t.y };           // everything under it gets flattened
    case 'bulb': return { x: t.x - 40, y: t.y, w: 80, h: 900 - t.y };
    case 'switch': case 'spring': return { x: t.x, y: t.y - 40, w: 80, h: 40 };
    case 'fakeExit': return { x: t.x - 60, y: t.y - 20, w: 190, h: 120 };
    case 'mover': return { x: Math.min(t.x1, t.x2), y: Math.min(t.y1, t.y2), w: Math.abs(t.x2 - t.x1) + t.w, h: Math.abs(t.y2 - t.y1) + 30 };
    default: return null;
  }
}
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const grow = (r, m) => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });

function scrambleLevel(def, rng) {
  const j = (a, b) => a + rng() * (b - a);
  const shiftTrigger = (t, d) => { if (t.trigger) t.trigger = [Math.max(0, t.trigger[0] + d), Math.min(W, t.trigger[1] + d)]; };
  /* is there a raised platform/block over this x? (then a crusher would land on it / an arc would fire through it) */
  const platsAt = (x, m = 90) => def.platforms.some(p => p.kind !== 'ground' && x + m > p.x && x - m < p.x + p.w);
  /* can an exit door stand here? nothing built over it, no hazard under it, no trap right next to it */
  const doorClear = (x, y) => {
    const door = { x, y, w: 70, h: 100 };
    if (def.platforms.some(p => overlaps(door, p))) return false;
    if (def.hazards.some(h => overlaps(grow(door, 40), h))) return false;
    for (const t of def.traps) { const r = trapRect(t); if (r && overlaps(grow(door, 130), r)) return false; }
    return true;
  };

  /* ---- surprise swaps: the SAME spot can hold a different trap next time, or nothing at all ---- */
  const swapped = [];
  for (const t of def.traps) {
    const r = rng();
    switch (t.type) {
      case 'bulb':
        if (r < 0.22 && !platsAt(t.x)) swapped.push({ type: 'surprise', x: t.x - 30, y: 700, w: 60, h: 200, trigger: [t.x - 130, t.x + 40], warn: 0.3, on: 0.7, off: 1.3, extra: t.extra });
        else if (r < 0.34 && !platsAt(t.x)) swapped.push({ type: 'crusher', x: t.x - 60, y: 260, w: 120, h: 120, trigger: [t.x - 160, t.x - 100], speed: 1500, warn: 0, extra: t.extra });
        else if (r < 0.46) swapped.push({ ...t, dud: true });                     // hangs there menacingly, never drops
        else swapped.push(t);
        break;
      case 'surprise':
        if (r < 0.2) swapped.push({ type: 'bulb', x: t.x + t.w / 2, y: 560, trigger: [t.x - 130, t.x - 10], extra: t.extra });
        else if (r < 0.32) swapped.push({ ...t, dud: true });                     // crackles once, then nothing
        else swapped.push(t);
        break;
      case 'crusher':
        if (t.step) swapped.push(t);
        else if (r < 0.2) swapped.push({ type: 'bulb', x: t.x + t.w / 2, y: 560, trigger: [t.x - 100, t.x + 20], extra: t.extra });
        else if (r < 0.32) swapped.push({ ...t, dud: true });                     // shakes... and stays up
        else swapped.push(t);
        break;
      case 'zap':
        if (r < 0.15) swapped.push({ ...t, dud: true });                          // looks live, never fires
        else swapped.push(t);
        break;
      case 'fakeSpikes':
        if (r < 0.3) def.hazards.push({ type: 'spikes', x: t.x, y: t.y, w: t.w, h: 30 });   // ...this time they are real
        else swapped.push(t);
        break;
      case 'battery':
        if (!t.every && r < 0.3) { t.x = t.x < 0 ? 1900 : -60; t.dir = -t.dir; }          // comes from the other side
        swapped.push(t);
        break;
      default: swapped.push(t);
    }
  }
  def.traps = swapped;
  /* real spikes sometimes turn out to be harmless decoration — and the player can never be sure which */
  def.hazards = def.hazards.filter(h => {
    if (h.type === 'spikes' && rng() < 0.2) { def.traps.push({ type: 'fakeSpikes', x: h.x, y: h.y, w: h.w }); return false; }
    return true;
  });
  /* an innocent-looking platform may secretly short-circuit (never the one the exit stands on) */
  const holdsDoor = (p, e) => e && e.x + 70 > p.x && e.x < p.x + p.w && Math.abs(e.y + 100 - p.y) < 2;
  const candidates = def.platforms.filter(p => p.kind === 'plat' && p.w >= 100 && p.w <= 320 && !holdsDoor(p, def.exit) && !holdsDoor(p, def.exit.moveTo));
  if (candidates.length && rng() < 0.55) {
    const p = candidates[Math.floor(rng() * candidates.length)];
    def.platforms = def.platforms.filter(q => q !== p);
    if (rng() < 0.4) def.traps.push({ type: 'vanish', x: p.x, y: p.y, w: p.w, h: p.h, delay: j(0.45, 0.8), respawn: 2.5 });
    else def.traps.push({ type: 'shifter', x: p.x, y: p.y, w: p.w, h: p.h, delay: j(0.35, 1.0), dir: rng() < 0.5 ? -1 : 1, dist: j(170, 280) });
  }

  for (const t of def.traps) {
    switch (t.type) {
      case 'bulb': { const d = j(-60, 60); t.x += d; shiftTrigger(t, d); t.y = Math.max(200, t.y + j(-50, 40)); break; }
      case 'surprise': {
        let d = j(-50, 50);
        const moved = { x: t.x + d, y: t.y, w: t.w, h: t.h };
        if (def.platforms.some(p => p.kind !== 'ground' && overlaps(moved, p))) d = 0;   // never slide an arc into a platform
        const doors = [def.exit, def.exit.moveTo].filter(Boolean).map(e => ({ x: e.x, y: e.y, w: 70, h: 100 }));
        if (doors.some(dr => overlaps(moved, dr))) d = 0;                                 // ...or onto the exit door
        t.x += d; shiftTrigger(t, d); t.warn = (t.warn ?? 0.3) * j(0.7, 1.1); t.on = (t.on ?? 0.7) * j(0.8, 1.3); t.off = (t.off ?? 1.3) * j(0.6, 1.2); break;
      }
      case 'zap': t.on = (t.on ?? 0.8) * j(0.8, 1.3); t.off = (t.off ?? 1.4) * j(0.6, 1.2); t.phase = rng() * 3; break;
      case 'battery': t.speed = (t.speed ?? 350) * j(0.85, 1.35); shiftTrigger(t, j(-60, 60)); if (t.every) t.every *= j(0.7, 1.1); break;
      case 'crusher': shiftTrigger(t, j(-30, 30)); if (rng() < 0.4) t.warn = 0; break;
      case 'vanish': t.delay = (t.delay ?? 0.4) * j(0.6, 1.2); break;
      case 'magnet': t.pull *= j(0.9, 1.35); break;
      case 'mover': t.speed = (t.speed ?? 200) * j(0.9, 1.3); break;
      case 'sign': if (rng() < 0.45) t.text = TROLL_SIGNS[Math.floor(rng() * TROLL_SIGNS.length)]; break;
    }
  }
  /* extra traps on random ground spots, away from spawn, exit and existing gadgets */
  const grounds = def.platforms.filter(p => p.kind === 'ground' && p.w >= 380);
  /* every existing gadget's centre (and where its trigger sits) — new traps keep a clear GAP from all of them
     so the player always has room to breathe and react between surprises */
  const GAP = 440;
  const busyX = () => {
    const xs = [];
    for (const t of def.traps) {
      if (t.type === 'sign') continue;
      if (t.type === 'mover') xs.push((t.x1 + t.x2) / 2 + t.w / 2);
      else if (t.type === 'magnet') xs.push(t.x);
      else if (t.type === 'battery') { if (t.trigger) xs.push((t.trigger[0] + t.trigger[1]) / 2); }
      else if (t.x !== undefined) xs.push(t.x + (t.w || 60) / 2);
      if (t.trigger && t.type !== 'battery') xs.push((t.trigger[0] + t.trigger[1]) / 2);
    }
    return xs;
  };
  const extras = 1 + (rng() < 0.25 ? 1 : 0);         // one, occasionally two — never a wall of traps
  for (let i = 0; i < extras && grounds.length; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const g = grounds[Math.floor(rng() * grounds.length)];
      const x = j(g.x + 160, g.x + g.w - 160);
      const far = (px, d) => Math.abs(px - x) > d;
      if (!far(def.spawn.x + 22, 400) || !far(def.exit.x + 35, 320)) continue;
      if (def.exit.moveTo && !far(def.exit.moveTo.x + 35, 320)) continue;
      if (busyX().some(bx => !far(bx, GAP))) continue;
      const r = rng();
      const open = !platsAt(x);
      if (r < 0.35 && open) def.traps.push({ type: 'surprise', x: x - 30, y: 700, w: 60, h: 200, trigger: [x - 130, x + 40], warn: j(0.25, 0.4), on: j(0.5, 0.8), off: j(1.0, 1.6), extra: true });
      else if (r < 0.55 || (!open && r < 0.75)) def.traps.push({ type: 'bulb', x, y: 560, trigger: [x - 160, x - 40], extra: true });
      else if (r < 0.65) def.traps.push({ type: 'crusher', x: x - 60, y: 260, w: 120, h: 120, trigger: [x - 160, x - 100], speed: 1500, warn: 0, extra: true });
      else if (r < 0.88) def.traps.push({ type: 'popSpikes', x: x - 80, y: g.y - 30, w: 160, delay: j(0.1, 0.6), on: j(0.8, 1.4), off: j(1.5, 3), extra: true });
      else { const fromRight = rng() < 0.5; def.traps.push({ type: 'battery', x: fromRight ? 1900 : -60, y: 840, dir: fromRight ? -1 : 1, speed: j(380, 560), trigger: [x - 60, x + 60], extra: true }); }
      break;
    }
  }
  /* ---- floor betrayal: about a third of levels get a strip of pop-up spikes on open ground (same clearance rules) ---- */
  if (rng() < 0.38 && grounds.length) {
    for (let tries = 0; tries < 30; tries++) {
      const g = grounds[Math.floor(rng() * grounds.length)];
      const x = j(g.x + 180, g.x + g.w - 180);
      const far = (px, d) => Math.abs(px - x) > d;
      if (!far(def.spawn.x + 22, 350) || !far(def.exit.x + 35, 300)) continue;
      if (def.exit.moveTo && !far(def.exit.moveTo.x + 35, 300)) continue;
      if (busyX().some(bx => !far(bx, 330))) continue;
      def.traps.push({ type: 'popSpikes', x: x - 80, y: g.y - 30, w: 160, delay: j(0.1, 0.6), on: j(0.8, 1.4), off: j(1.5, 3), extra: true });
      break;
    }
  }

  /* ---- breathing room: sudden-death traps (bulb / arc / crusher) keep a minimum distance from each other.
     When two end up too close, the extra one goes; designed traps stay (levels like CRUSHER need them as steps). ---- */
  const SUDDEN = ['bulb', 'surprise', 'crusher', 'popSpikes'];
  const MIN_SPACING = 320;
  const centre = t => t.type === 'bulb' ? t.x : t.x + (t.w || 0) / 2;
  let changed = true;
  while (changed) {
    changed = false;
    const list = def.traps.filter(t => SUDDEN.includes(t.type));
    outer: for (let i = 0; i < list.length; i++) for (let k = i + 1; k < list.length; k++) {
      const a = list[i], b = list[k];
      if (Math.abs(centre(a) - centre(b)) >= MIN_SPACING) continue;
      const drop = b.extra ? b : (a.extra ? a : null);
      if (!drop) continue;                                  // two designed traps close together: the level meant it
      def.traps = def.traps.filter(t => t !== drop);
      changed = true; break outer;
    }
  }

  /* sometimes the exit is simply not where the level usually puts it */
  if (!def.exit.moveTo && !def.exit.hidden && rng() < 0.2 && grounds.length) {
    const spots = [];
    for (const g of grounds) for (let x = g.x + 100; x <= g.x + g.w - 170; x += 40) if (Math.abs(x - def.spawn.x) > 700 && Math.abs(x - def.exit.x) > 300 && doorClear(x, g.y - 100)) spots.push({ x, y: g.y - 100 });
    if (spots.length) { const sp = spots[Math.floor(rng() * spots.length)]; def.exit.x = sp.x; def.exit.y = sp.y; }
  }
  /* the exit sometimes runs away to another piece of ground when you get close */
  if (!def.exit.moveTo && !def.exit.hidden && rng() < 0.3 && grounds.length) {
    const spots = [];
    for (const g of grounds) for (let x = g.x + 100; x <= g.x + g.w - 170; x += 40) if (Math.abs(x - def.exit.x) > 500 && Math.abs(x - def.spawn.x) > 300 && doorClear(x, g.y - 100)) spots.push({ x, y: g.y - 100 });
    if (spots.length) { const sp = spots[Math.floor(rng() * spots.length)]; def.exit.moveTo = { x: sp.x, y: sp.y }; def.exit.range = 150; }
  }
  return def;
}

/* ---------- lockdown (levels 7-10 of a turn): a force field seals the exit; only a breaker far away opens it ----------
   The field is a full-height column between spawn and exit, so no route past it exists. The breaker is a
   switch on the spawn side, at least 500 px from the field, preferring spots behind the spawn or up on a
   platform — i.e. the last place a player in a hurry would look. */
function addLockdown(def, rng) {
  const ex = def.exit, sp = def.spawn;
  const toExit = Math.sign(ex.x - sp.x) || 1;
  const SOFT = ['static', 'fakeSpikes', 'sign'];                   // these may share space with the field
  const footprints = def.traps.filter(t => !SOFT.includes(t.type)).map(trapRect).filter(Boolean);
  const moverRects = def.traps.filter(t => t.type === 'mover').map(trapRect);
  const clearOf = (r, m) => !footprints.some(f => overlaps(grow(r, m), f));
  const grounds = def.platforms.filter(p => p.kind === 'ground');

  /* ---- field candidates: 150-700 px before the exit door, between spawn and exit.
     Clear columns first; if the level is too busy, columns through other gadgets; movers only as a last resort. ---- */
  const cands = [];
  const lo = Math.min(sp.x, ex.x), hi = Math.max(sp.x, ex.x);
  for (let x = lo + 140; x <= hi - 40; x += 20) {
    const dExit = toExit > 0 ? ex.x - x : x - (ex.x + 70);
    if (dExit < 150 || dExit > 700) continue;
    if (Math.abs(x - sp.x) < 160) continue;
    if (ex.moveTo && Math.abs(ex.moveTo.x + 35 - (x + 20)) < 120) continue;   // the run-away door must not land inside it
    const col = { x, y: 0, w: 40, h: 1080 };
    const overPlat = def.platforms.some(p => p.kind !== 'ground' && overlaps(col, p));
    const overMover = moverRects.some(r => overlaps(grow(col, 30), r));
    const busy = !clearOf(col, 30);
    let score = (overPlat ? 0 : 500) + rng() * 300;
    if (busy) score -= 2000;                                    // through another gadget: only if nothing cleaner exists
    if (overMover) score -= 6000;                               // a moving platform ramming you into it: truly last resort
    cands.push({ x, score });
  }
  if (!cands.length) return false;                              // exit hugs the spawn (THE LONG WAY has its own gate)
  cands.sort((a, b) => b.score - a.score);

  /* ---- breaker spots for a given field: on the spawn side, ≥ minDist from the field, never on the direct path.
     Either up on an existing low ledge, or on a small ledge bolted to the wall — often behind the spawn. ---- */
  const wantBehind = rng() < 0.5;                                  // half the time the breaker hides right behind the spawn
  /* room to stand and to jump up onto the spot: nothing built in the 150 px above it */
  const headroom = (x, w, y) => !def.platforms.some(q => overlaps({ x: x - 20, y: y - 150, w: w + 40, h: 150 }, q)) && clearOf({ x: x - 20, y: y - 150, w: w + 40, h: 150 }, 0);
  const breakerSpots = (bx, minDist) => {
    const farEnough = x => toExit > 0 ? x + 80 <= bx - minDist : x >= bx + 40 + minDist;
    const spots = [];
    for (const p of def.platforms) {
      if (p.kind === 'ground' || p.y < 640 || p.y > 780) continue;          // one jump up — never something you need a chain of tricks for
      for (let x = p.x + 20; x <= p.x + p.w - 100; x += 40) {
        if (!farEnough(x)) continue;
        const r = { x, y: p.y - 40, w: 80, h: 40 };
        if (def.platforms.some(q => q !== p && overlaps(r, q))) continue;
        if (!clearOf(r, 60) || !headroom(x, 80, p.y)) continue;
        spots.push({ x, y: p.y, score: 500 + rng() * 300 });
      }
    }
    for (const g of grounds) {
      for (let x = g.x + 10; x <= g.x + g.w - 150; x += 40) {
        if (!farEnough(x)) continue;
        const ledgeY = 720 + Math.floor(rng() * 3) * 20, ledgeW = 120 + Math.floor(rng() * 3) * 30;
        const ledge = { x: x - 30, y: ledgeY, w: ledgeW, h: 30 };
        if (def.platforms.some(q => overlaps(grow(ledge, 40), q))) continue;   // nothing already built here
        if (def.hazards.some(h => overlaps(grow(ledge, 30), h))) continue;
        if (!clearOf(grow(ledge, 20), 60)) continue;                          // not under a bulb, not next to a gadget
        if (!headroom(ledge.x, ledge.w, ledge.y)) continue;                     // nothing hanging over it (wall blocks, platforms)
        if (ex.x + 70 > ledge.x - 60 && ex.x < ledge.x + ledge.w + 60) continue;
        const behind = toExit > 0 ? x + 40 < sp.x + 22 : x + 40 > sp.x + 22;  // behind the spawn: nobody looks there
        spots.push({ x, y: ledgeY, ledge, score: 400 + (behind ? (wantBehind ? 350 : -250) : 0) + rng() * 300 });
      }
    }
    /* last resort: flat on the ground, as far from the field as the level allows */
    if (!spots.length) for (const g of grounds) for (let x = g.x + 20; x <= g.x + g.w - 100; x += 40) {
      if (!farEnough(x) || Math.abs(x + 40 - (sp.x + 22)) < 150) continue;
      const r = { x, y: g.y - 40, w: 80, h: 40 };
      if (def.hazards.some(h => overlaps(grow(r, 30), h))) continue;
      if (def.platforms.some(q => q !== g && overlaps(r, q))) continue;
      if (!clearOf(r, 60) || !headroom(x, 80, g.y)) continue;
      spots.push({ x, y: g.y, score: Math.abs(x - bx) + rng() * 300 });
    }
    return spots.sort((a, b) => b.score - a.score);
  };

  let bx = null, spot = null;
  for (const minDist of [500, 380]) {
    for (const c of cands) { const sp2 = breakerSpots(c.x, minDist); if (sp2.length) { bx = c.x; spot = sp2[0]; break; } }
    if (spot) break;
  }
  if (!spot) return false;

  const id = 'lock' + Math.floor(rng() * 1e6);
  def.traps.push({ type: 'barrier', x: bx, y: 0, w: 40, h: 1080, id });
  if (spot.ledge) def.platforms.push({ ...spot.ledge, kind: 'plat' });
  def.traps.push({ type: 'switch', x: spot.x, y: spot.y, id, label: 'BREAKER' });

  /* a sign by the field — honest a little more often than not */
  const signX = bx - toExit * 120;
  const honest = ['BREAKER IS FAR AWAY', 'GO BACK. SERIOUSLY.', 'LOOK BEHIND YOU', 'TRY HIGHER. FURTHER.'];
  const lies = ['JUST JUMP IT', 'PUSH HARDER', 'WAIT HERE, IT OPENS', 'IT IS NOT REAL'];
  const pool = rng() < 0.6 ? honest : lies;
  if (grounds.some(p => signX > p.x && signX < p.x + p.w))
    def.traps.push({ type: 'sign', x: signX, y: G, text: pool[Math.floor(rng() * pool.length)] });
  def.lockdown = true;
  return true;
}

const flipRect = r => { r.x = W - r.x - r.w; };
const flipPoint = (o, key, w = 0) => { o[key] = W - o[key] - w; };
const flipTrigger = t => { if (t) { const a = t[0], b = t[1]; t[0] = W - b; t[1] = W - a; } };
const flipText = s => s.replace(/→|←/g, m => (m === '→' ? '←' : '→'));

function mirrorLevel(def) {
  def.platforms.forEach(flipRect);
  def.hazards.forEach(flipRect);
  flipPoint(def.spawn, 'x', 44);
  flipPoint(def.exit, 'x', 70);
  if (def.exit.moveTo) flipPoint(def.exit.moveTo, 'x', 70);
  for (const t of def.traps) {
    switch (t.type) {
      case 'bulb': flipPoint(t, 'x'); flipTrigger(t.trigger); break;
      case 'vanish': case 'hidden': case 'zap': case 'surprise': case 'gate': case 'floorDrop':
      case 'static': case 'fakeSpikes': case 'crusher': case 'popSpikes': case 'barrier': flipRect(t); flipTrigger(t.trigger); break;
      case 'shifter': flipRect(t); t.dir = -t.dir; break;
      case 'fakeExit': flipPoint(t, 'x', 70); break;
      case 'spring': case 'switch': flipPoint(t, 'x', 80); break;
      case 'mover': flipPoint(t, 'x1', t.w); flipPoint(t, 'x2', t.w); break;
      case 'conveyor': flipRect(t); t.dir = -t.dir; break;
      case 'battery': flipPoint(t, 'x', 56); t.dir = -t.dir; flipTrigger(t.trigger); break;
      case 'magnet':
        flipPoint(t, 'x', 50); flipRect(t.zone); t.pull = -t.pull;
        if (t.triggerX !== undefined) { t.triggerX = W - t.triggerX; t.triggerDir = -(t.triggerDir ?? 1); }
        break;
      case 'sign': flipPoint(t, 'x'); t.text = flipText(t.text); break;
    }
  }
  return def;
}

/* ---------- turn deck: a fresh, tier-ordered shuffle of levels for every turn ---------- */

/* Small seeded RNG (mulberry32) so a whole turn can be reproduced from one number. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
  return arr;
}

/* Deck = exactly TURN_LEVELS levels: 3 easy, 3 medium, 2 hard, 2 brutal — each group shuffled.
   Every entry also gets a random variant, mirror flag, modifier and a scramble salt. */
function buildTurnDeck(seed) {
  const rng = makeRng(seed);
  const byTier = [[], [], [], [], []];
  LEVELS.forEach((l, i) => byTier[l.tier].push(i + 1));
  byTier.forEach(t => shuffle(t, rng));
  const deck = [];
  const take = (tier, count) => { while (count-- > 0 && byTier[tier].length) deck.push(byTier[tier].shift()); };
  take(1, 3); take(2, 3); take(3, 2); take(4, 2);
  while (deck.length < TURN_LEVELS) { const rest = [...byTier[1], ...byTier[2], ...byTier[3], ...byTier[4]]; if (!rest.length) break; deck.push(rest[Math.floor(rng() * rest.length)]); }
  return deck.slice(0, TURN_LEVELS).map((n, idx) => {
    const v = Math.floor(rng() * variantCount(n));
    const mirror = idx > 0 && rng() < 0.5;
    let mod = MODIFIERS[0];
    if (idx >= 2 && rng() < 0.55) mod = MODIFIERS[1 + Math.floor(rng() * (MODIFIERS.length - 1))];
    return { level: n, variant: v, mirror, mod, salt: Math.floor(rng() * 1e9), idleLimit: 2.4 + rng() * 2.2, lockdown: idx >= 6 };   // levels 7-10: sealed exit, remote breaker
  });
}
