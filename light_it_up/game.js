/* ============================================================
   LIGHT IT UP! — a joyful chibi cable-connecting booth game
   Drag cables between terminals, flip switches, make bulbs smile.
   ============================================================ */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) {
      if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------- Levels ---------- */
  // Terminal positions are computed from part type + position.
  // bright: every bulb must be at full brightness (parallel) · dim: every bulb must glow softly (series)
  const LEVELS = [
    /* 1 — the only warm-up */
    {
      hello:
        "Hi! I'm Busby ⚡ Let's wake up the sleepy bulb! Drag a cable from + to the bulb, and one back to −.",
      win: "YAY! It's shining! ✨",
      parts: [
        { id: "B", type: "battery", x: 200, y: 300 },
        { id: "L1", type: "bulb", x: 700, y: 260 },
      ],
    },
    /* 2 */
    {
      hello:
        "Now a SWITCH and TWO bulbs. Both must be BRIGHT — each bulb needs its own path — and the switch must control them. Then TAP it ON!",
      bright: true,
      win: "One switch to rule them all! 👑",
      parts: [
        { id: "B", type: "battery", x: 170, y: 300 },
        { id: "S", type: "switch", x: 430, y: 300 },
        { id: "L1", type: "bulb", x: 720, y: 130 },
        { id: "L2", type: "bulb", x: 720, y: 430 },
      ],
    },
    /* 3 */
    {
      hello:
        "Safety first! TWO switches guard this bulb. Chain them so BOTH must be ON to light it.",
      win: "Double-checked and lit! Safety hero! 🦺",
      parts: [
        { id: "B", type: "battery", x: 160, y: 320 },
        { id: "S1", type: "switch", x: 420, y: 130 },
        { id: "S2", type: "switch", x: 700, y: 130 },
        { id: "L1", type: "bulb", x: 830, y: 380 },
      ],
    },
    /* 4 */
    {
      hello:
        "Night-light mode! 🌙 Make BOTH bulbs glow SOFTLY — chain them one after the other so they share the power (SERIES).",
      dim: true,
      win: "Cozy and soft! Perfect night-light! 🌙",
      parts: [
        { id: "B", type: "battery", x: 180, y: 300 },
        { id: "L1", type: "bulb", x: 560, y: 220 },
        { id: "L2", type: "bulb", x: 820, y: 220 },
      ],
    },
    /* 5 */
    {
      hello:
        "Three bulbs, one switch — everybody BRIGHT, and the switch in charge of all of them!",
      bright: true,
      win: "All three shining! You're a natural! 🌟",
      parts: [
        { id: "B", type: "battery", x: 160, y: 320 },
        { id: "S", type: "switch", x: 420, y: 110 },
        { id: "L1", type: "bulb", x: 640, y: 130 },
        { id: "L2", type: "bulb", x: 860, y: 260 },
        { id: "L3", type: "bulb", x: 640, y: 440 },
      ],
    },
    /* 6 */
    {
      hello:
        "Each bulb gets its OWN switch! Wire two branches — switch + bulb — and make both shine BRIGHT.",
      bright: true,
      win: "Two rooms, two switches, both bright! 🏠",
      parts: [
        { id: "B", type: "battery", x: 160, y: 300 },
        { id: "S1", type: "switch", x: 460, y: 120 },
        { id: "L1", type: "bulb", x: 790, y: 150 },
        { id: "S2", type: "switch", x: 460, y: 440 },
        { id: "L2", type: "bulb", x: 790, y: 430 },
      ],
    },
    /* 7 */
    {
      hello:
        "Night-light TRIO 🌙 — three bulbs glowing SOFTLY. Chain all three in one line so they share the power.",
      dim: true,
      win: "Three soft glows — sweet dreams! 🌙",
      parts: [
        { id: "B", type: "battery", x: 170, y: 300 },
        { id: "L1", type: "bulb", x: 450, y: 220 },
        { id: "L2", type: "bulb", x: 660, y: 220 },
        { id: "L3", type: "bulb", x: 870, y: 220 },
      ],
    },
    /* 8 */
    {
      hello:
        "Double lock! Chain BOTH switches, then feed two BRIGHT bulbs from them.",
      bright: true,
      win: "Double-locked and double-bright! 🔐",
      parts: [
        { id: "B", type: "battery", x: 160, y: 320 },
        { id: "S1", type: "switch", x: 400, y: 130 },
        { id: "S2", type: "switch", x: 640, y: 130 },
        { id: "L1", type: "bulb", x: 600, y: 420 },
        { id: "L2", type: "bulb", x: 860, y: 420 },
      ],
    },
    /* 9 */
    {
      hello:
        "The big chandelier! FOUR bulbs, all BRIGHT. Every bulb needs its own path to + and −.",
      bright: true,
      win: "WOW! The whole hall is glowing! 💎",
      parts: [
        { id: "B", type: "battery", x: 150, y: 300 },
        { id: "L1", type: "bulb", x: 520, y: 140 },
        { id: "L2", type: "bulb", x: 800, y: 140 },
        { id: "L3", type: "bulb", x: 520, y: 430 },
        { id: "L4", type: "bulb", x: 800, y: 430 },
      ],
    },
    /* 10 */
    {
      hello:
        "Two switches, four bulbs — light up the whole building, all BRIGHT, both switches working! ⚡",
      bright: true,
      win: "Halfway hero! The whole building glows! 🏢",
      parts: [
        { id: "B", type: "battery", x: 140, y: 310 },
        { id: "S1", type: "switch", x: 390, y: 110 },
        { id: "S2", type: "switch", x: 390, y: 480 },
        { id: "L1", type: "bulb", x: 640, y: 130 },
        { id: "L2", type: "bulb", x: 880, y: 130 },
        { id: "L3", type: "bulb", x: 640, y: 450 },
        { id: "L4", type: "bulb", x: 880, y: 450 },
      ],
    },
    /* 11 */
    {
      hello:
        "Triple safety! THREE switches guard one bulb. Chain all three so every one must be ON.",
      win: "Triple-checked! Safety officer of the year! 🦺🦺🦺",
      parts: [
        { id: "B", type: "battery", x: 160, y: 320 },
        { id: "S1", type: "switch", x: 380, y: 120 },
        { id: "S2", type: "switch", x: 620, y: 120 },
        { id: "S3", type: "switch", x: 860, y: 120 },
        { id: "L1", type: "bulb", x: 820, y: 400 },
      ],
    },
    /* 12 */
    {
      hello:
        "Three rooms, three switches! Each bulb gets its OWN switch — all BRIGHT.",
      bright: true,
      win: "Every room has its own light! 🏠🏠🏠",
      parts: [
        { id: "B", type: "battery", x: 150, y: 300 },
        { id: "S1", type: "switch", x: 430, y: 110 },
        { id: "L1", type: "bulb", x: 760, y: 120 },
        { id: "S2", type: "switch", x: 430, y: 300 },
        { id: "L2", type: "bulb", x: 760, y: 300 },
        { id: "S3", type: "switch", x: 430, y: 490 },
        { id: "L3", type: "bulb", x: 760, y: 480 },
      ],
    },
    /* 13 */
    {
      hello:
        "Night-light QUARTET 🌙 — four bulbs glowing SOFTLY. One long chain through all four!",
      dim: true,
      win: "Four cozy glows — the softest hallway ever! 🌙",
      parts: [
        { id: "B", type: "battery", x: 140, y: 300 },
        { id: "L1", type: "bulb", x: 420, y: 160 },
        { id: "L2", type: "bulb", x: 660, y: 160 },
        { id: "L3", type: "bulb", x: 900, y: 160 },
        { id: "L4", type: "bulb", x: 660, y: 440 },
      ],
    },
    /* 14 */
    {
      hello:
        "The big hall: one switch, FOUR bulbs, all BRIGHT — and the switch must control every bulb.",
      bright: true,
      win: "The whole hall obeys one switch! 💡💡💡💡",
      parts: [
        { id: "B", type: "battery", x: 140, y: 310 },
        { id: "S", type: "switch", x: 380, y: 300 },
        { id: "L1", type: "bulb", x: 620, y: 130 },
        { id: "L2", type: "bulb", x: 860, y: 130 },
        { id: "L3", type: "bulb", x: 620, y: 450 },
        { id: "L4", type: "bulb", x: 860, y: 450 },
      ],
    },
    /* 15 */
    {
      hello:
        "Chandelier XL! FIVE bulbs, all BRIGHT. Every bulb needs its own path to + and −.",
      bright: true,
      win: "FIVE stars! The ballroom sparkles! ✨✨✨✨✨",
      parts: [
        { id: "B", type: "battery", x: 140, y: 300 },
        { id: "L1", type: "bulb", x: 440, y: 130 },
        { id: "L2", type: "bulb", x: 680, y: 130 },
        { id: "L3", type: "bulb", x: 920, y: 130 },
        { id: "L4", type: "bulb", x: 560, y: 430 },
        { id: "L5", type: "bulb", x: 800, y: 430 },
      ],
    },
    /* 16 */
    {
      hello:
        "Two wings! Each switch controls TWO bulbs. Four bulbs BRIGHT, both switches doing their job.",
      bright: true,
      win: "Left wing, right wing — all lit! 🏛️",
      parts: [
        { id: "B", type: "battery", x: 140, y: 310 },
        { id: "S1", type: "switch", x: 400, y: 120 },
        { id: "S2", type: "switch", x: 400, y: 480 },
        { id: "L1", type: "bulb", x: 640, y: 130 },
        { id: "L2", type: "bulb", x: 880, y: 130 },
        { id: "L3", type: "bulb", x: 640, y: 450 },
        { id: "L4", type: "bulb", x: 880, y: 450 },
      ],
    },
    /* 17 */
    {
      hello:
        "Night-light FIVE 🌙 — five bulbs glowing SOFTLY in one long chain. Don't lose the thread!",
      dim: true,
      win: "Five soft glows — the whole street is sleeping! 🌙🌙",
      parts: [
        { id: "B", type: "battery", x: 140, y: 300 },
        { id: "L1", type: "bulb", x: 400, y: 150 },
        { id: "L2", type: "bulb", x: 620, y: 150 },
        { id: "L3", type: "bulb", x: 840, y: 150 },
        { id: "L4", type: "bulb", x: 510, y: 430 },
        { id: "L5", type: "bulb", x: 730, y: 430 },
      ],
    },
    /* 18 */
    {
      hello:
        "MASTER + three rooms! One master switch feeds three room switches, each with its own BRIGHT bulb. Every switch must matter!",
      bright: true,
      win: "Master of the house! Every switch obeys! 🏡",
      parts: [
        { id: "B", type: "battery", x: 130, y: 310 },
        { id: "S1", type: "switch", x: 350, y: 300 },
        { id: "S2", type: "switch", x: 560, y: 110 },
        { id: "L1", type: "bulb", x: 790, y: 120 },
        { id: "S3", type: "switch", x: 560, y: 300 },
        { id: "L2", type: "bulb", x: 790, y: 300 },
        { id: "S4", type: "switch", x: 560, y: 490 },
        { id: "L3", type: "bulb", x: 790, y: 480 },
      ],
    },
    /* 19 */
    {
      hello:
        "FIVE bulbs, two switches — all BRIGHT, both switches in charge. Plan your cables!",
      bright: true,
      win: "Five bright bulbs under two switches — expert work! 🎓",
      parts: [
        { id: "B", type: "battery", x: 130, y: 310 },
        { id: "S1", type: "switch", x: 370, y: 110 },
        { id: "S2", type: "switch", x: 370, y: 490 },
        { id: "L1", type: "bulb", x: 600, y: 120 },
        { id: "L2", type: "bulb", x: 830, y: 120 },
        { id: "L3", type: "bulb", x: 600, y: 470 },
        { id: "L4", type: "bulb", x: 830, y: 470 },
        { id: "L5", type: "bulb", x: 900, y: 295 },
      ],
    },
    /* 20 */
    {
      hello:
        "GRAND FINALE! A MASTER switch, two wing switches, four bulbs — everything BRIGHT, every switch in charge! ⚡⚡⚡",
      bright: true,
      win: "MASTER ELECTRICIAN! You lit them ALL! 🏆🏆🏆",
      parts: [
        { id: "B", type: "battery", x: 130, y: 310 },
        { id: "S1", type: "switch", x: 350, y: 300 },
        { id: "S2", type: "switch", x: 560, y: 120 },
        { id: "S3", type: "switch", x: 560, y: 480 },
        { id: "L1", type: "bulb", x: 770, y: 120 },
        { id: "L2", type: "bulb", x: 920, y: 120 },
        { id: "L3", type: "bulb", x: 770, y: 480 },
        { id: "L4", type: "bulb", x: 920, y: 480 },
      ],
    },
  ];
  /* ---------- Reference solutions (shown in the Sequence viewer on the home page) ---------- */
  const P_ = (from, ids) =>
    ids.flatMap((l) => [
      [from, l + ".a"],
      [l + ".b", "B.neg"],
    ]); // each bulb on its own path
  const S_ = (from, ids) => {
    const r = [];
    let p = from;
    ids.forEach((l) => {
      r.push([p, l + ".a"]);
      p = l + ".b";
    });
    r.push([p, "B.neg"]);
    return r;
  }; // one chain
  const SOLUTIONS = [
    {
      sol: P_("B.pos", ["L1"]),
      how: "+ → bulb → −. One cable from + to the bulb, one from the bulb back to −.",
    },
    {
      sol: [["B.pos", "S.a"], ...P_("S.b", ["L1", "L2"])],
      how: "+ → switch, then from the switch one cable to EACH bulb, and each bulb back to −. Switch ON!",
    },
    {
      sol: [["B.pos", "S1.a"], ["S1.b", "S2.a"], ...P_("S2.b", ["L1"])],
      how: "+ → S1 → S2 → bulb → −. Both switches in ONE chain, both ON.",
    },
    {
      sol: S_("B.pos", ["L1", "L2"]),
      how: "+ → L1 → L2 → −. One chain, so the bulbs SHARE the power and glow softly.",
    },
    {
      sol: [["B.pos", "S.a"], ...P_("S.b", ["L1", "L2", "L3"])],
      how: "+ → switch, then the switch to EACH of the three bulbs, and each bulb back to −.",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ...P_("S1.b", ["L1"]),
        ["B.pos", "S2.a"],
        ...P_("S2.b", ["L2"]),
      ],
      how: "Two branches: + → S1 → L1 → −  and  + → S2 → L2 → −.",
    },
    {
      sol: S_("B.pos", ["L1", "L2", "L3"]),
      how: "+ → L1 → L2 → L3 → −. One chain through all three.",
    },
    {
      sol: [["B.pos", "S1.a"], ["S1.b", "S2.a"], ...P_("S2.b", ["L1", "L2"])],
      how: "+ → S1 → S2, then S2 to EACH bulb, and each bulb back to −.",
    },
    {
      sol: P_("B.pos", ["L1", "L2", "L3", "L4"]),
      how: "Every bulb gets its OWN two cables: + to the bulb, bulb back to −.",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ...P_("S1.b", ["L1", "L2"]),
        ["B.pos", "S2.a"],
        ...P_("S2.b", ["L3", "L4"]),
      ],
      how: "+ → S1 → L1 & L2 (each back to −), and + → S2 → L3 & L4 (each back to −).",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ["S1.b", "S2.a"],
        ["S2.b", "S3.a"],
        ...P_("S3.b", ["L1"]),
      ],
      how: "+ → S1 → S2 → S3 → bulb → −. All three switches in one chain.",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ...P_("S1.b", ["L1"]),
        ["B.pos", "S2.a"],
        ...P_("S2.b", ["L2"]),
        ["B.pos", "S3.a"],
        ...P_("S3.b", ["L3"]),
      ],
      how: "Three branches: + → S1 → L1 → −, + → S2 → L2 → −, + → S3 → L3 → −.",
    },
    {
      sol: S_("B.pos", ["L1", "L2", "L3", "L4"]),
      how: "+ → L1 → L2 → L3 → L4 → −. One long chain.",
    },
    {
      sol: [["B.pos", "S.a"], ...P_("S.b", ["L1", "L2", "L3", "L4"])],
      how: "+ → switch, then the switch to EACH of the four bulbs, each bulb back to −.",
    },
    {
      sol: P_("B.pos", ["L1", "L2", "L3", "L4", "L5"]),
      how: "All five bulbs get their own two cables: + to the bulb, bulb back to −.",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ...P_("S1.b", ["L1", "L2"]),
        ["B.pos", "S2.a"],
        ...P_("S2.b", ["L3", "L4"]),
      ],
      how: "+ → S1 → L1 & L2 (each to −), and + → S2 → L3 & L4 (each to −).",
    },
    {
      sol: S_("B.pos", ["L1", "L2", "L3", "L4", "L5"]),
      how: "+ → L1 → L2 → L3 → L4 → L5 → −. One long chain through all five.",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ["S1.b", "S2.a"],
        ...P_("S2.b", ["L1"]),
        ["S1.b", "S3.a"],
        ...P_("S3.b", ["L2"]),
        ["S1.b", "S4.a"],
        ...P_("S4.b", ["L3"]),
      ],
      how: "+ → master S1. From S1: → S2 → L1 → −,  → S3 → L2 → −,  → S4 → L3 → −.",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ...P_("S1.b", ["L1", "L2", "L5"]),
        ["B.pos", "S2.a"],
        ...P_("S2.b", ["L3", "L4"]),
      ],
      how: "+ → S1 → L1, L2 & L5 (each to −), and + → S2 → L3 & L4 (each to −).",
    },
    {
      sol: [
        ["B.pos", "S1.a"],
        ["S1.b", "S2.a"],
        ...P_("S2.b", ["L1", "L2"]),
        ["S1.b", "S3.a"],
        ...P_("S3.b", ["L3", "L4"]),
      ],
      how: "+ → master S1. S1 → S2 → L1 & L2 (each to −). S1 → S3 → L3 & L4 (each to −).",
    },
  ];
  SOLUTIONS.forEach((s, i) => Object.assign(LEVELS[i], s));
  // Short circuit names — shown in-game and used to find the circuit in the Sequence viewer
  const NAMES = [
    "Sleepy Bulb", "Master Switch", "Double Safety", "Night-Light Duo", "Three Bright",
    "Two Rooms", "Night-Light Trio", "Double Lock", "Chandelier", "Whole Building",
    "Triple Safety", "Three Rooms", "Night-Light Quartet", "Big Hall", "Chandelier XL",
    "Two Wings", "Night-Light Five", "Master + 3 Rooms", "Five Under Two", "Grand Finale",
  ];
  NAMES.forEach((n, i) => (LEVELS[i].name = n));

  const CABLE_COLORS = [
    "#EF4444",
    "#0D0DCC",
    "#22C55E",
    "#FFC107",
    "#F97316",
    "#A855F7",
  ];

  /* ---------- State ---------- */
  const GAME_SECONDS = 120,          // one 2-minute timer for the whole game
    BOARD_KEY = "lightItUpScores";
  let levelIdx = 0,
    parts = [],
    cables = [],
    drag = null,
    solved = false,
    colorIdx = 0,
    autoTimer = null;
  let playing = false,
    playerName = "",
    timeLeft = GAME_SECONDS,
    tick = null,
    cleared = 0,
    exploded = false;

  function terminalsOf(p) {
    switch (p.type) {
      case "battery":
        return [
          { id: p.id + ".pos", x: p.x + 82, y: p.y - 50, label: "+" },
          { id: p.id + ".neg", x: p.x + 82, y: p.y + 50, label: "−" },
        ];
      case "bulb":
        return [
          { id: p.id + ".a", x: p.x - 50, y: p.y + 92, label: "" },
          { id: p.id + ".b", x: p.x + 50, y: p.y + 92, label: "" },
        ];
      case "switch":
        return [
          { id: p.id + ".a", x: p.x - 88, y: p.y + 8, label: "" },
          { id: p.id + ".b", x: p.x + 88, y: p.y + 8, label: "" },
        ];
    }
  }
  const allTerminals = () => parts.flatMap(terminalsOf);
  const termById = (id) => allTerminals().find((t) => t.id === id);

  /* ---------- Circuit check (tiny, friendly) ---------- */
  function analyze() {
    // union-find over terminals: cables + closed switches are perfect conductors
    const parent = {};
    const find = (x) => {
      parent[x] = parent[x] ?? x;
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const union = (a, b) => {
      parent[find(a)] = find(b);
    };
    allTerminals().forEach((t) => find(t.id));
    cables.forEach((c) => union(c.a, c.b));
    parts
      .filter((p) => p.type === "switch" && p.on)
      .forEach((p) => union(p.id + ".a", p.id + ".b"));
    const bat = parts.find((p) => p.type === "battery");
    const P = find(bat.id + ".pos"),
      N = find(bat.id + ".neg");
    const short = P === N;
    const bulbs = parts
      .filter((p) => p.type === "bulb")
      .map((b) => ({ b, u: find(b.id + ".a"), v: find(b.id + ".b") }));
    // BFS over nets using bulbs as edges (excluding one bulb); returns distance map in "bulbs traversed".
    // `stop` is the opposite battery terminal: current never flows *through* it and out again.
    const bfs = (start, exclude, stop) => {
      const d = { [start]: 0 },
        q = [start];
      while (q.length) {
        const n = q.shift();
        bulbs.forEach((e) => {
          if (e === exclude) return;
          const other = e.u === n ? e.v : e.v === n ? e.u : null;
          if (other !== null && other !== stop && d[other] === undefined) {
            d[other] = d[n] + 1;
            q.push(other);
          }
        });
      }
      return d;
    };
    const result = {};
    bulbs.forEach((e) => {
      let series = Infinity;
      if (!short && e.u !== e.v) {
        const fromP = bfs(P, e, N),
          toN = bfs(N, e, P);
        if (fromP[e.u] !== undefined && toN[e.v] !== undefined)
          series = Math.min(series, fromP[e.u] + 1 + toN[e.v]);
        if (fromP[e.v] !== undefined && toN[e.u] !== undefined)
          series = Math.min(series, fromP[e.v] + 1 + toN[e.u]);
      }
      result[e.b.id] = isFinite(series) ? 1 / series : 0; // brightness 1 = full, .5 = two in series, 0 = off
    });
    return { short, brightness: result, P, N, find };
  }

  /** True if opening this switch would turn off at least one bulb (i.e. it is in the circuit, not bypassed). */
  function switchControlsABulb(sw, an) {
    if (!sw.on) return false; // OFF but bulbs still lit → the cables skip it
    sw.on = false;
    const off = analyze();
    sw.on = true;
    return Object.keys(an.brightness).some(
      (id) => an.brightness[id] > 0 && off.brightness[id] === 0,
    );
  }

  /* ---------- Drawing: chibi parts ---------- */
  function drawBattery(g, p, an) {
    const { x, y } = p;
    el(
      "rect",
      {
        x: x - 20,
        y: y - 100,
        width: 40,
        height: 20,
        rx: 6,
        fill: "#FFC107",
        stroke: "#013f8e",
        "stroke-width": 4,
      },
      g,
    );
    el(
      "rect",
      {
        x: x - 58,
        y: y - 84,
        width: 116,
        height: 168,
        rx: 24,
        fill: "url(#batt)",
        stroke: "#013f8e",
        "stroke-width": 5,
        filter: "url(#soft)",
      },
      g,
    );
    // leads to terminals
    el(
      "path",
      {
        d: `M${x + 58},${y - 50} h24 M${x + 58},${y + 50} h24`,
        stroke: "#013f8e",
        "stroke-width": 6,
        "stroke-linecap": "round",
      },
      g,
    );
    // face
    if (an.short) {
      ["-22", "22"].forEach((dx) =>
        el(
          "path",
          {
            d: `M${x + +dx - 9},${y - 30} l18,18 m0,-18 l-18,18`,
            stroke: "#fff",
            "stroke-width": 5,
            "stroke-linecap": "round",
          },
          g,
        ),
      );
      el(
        "path",
        {
          d: `M${x - 18},${y + 22} q9,-10 18,0 q9,10 18,0`,
          fill: "none",
          stroke: "#fff",
          "stroke-width": 5,
          "stroke-linecap": "round",
        },
        g,
      );
      el(
        "text",
        {
          x: x,
          y: y - 110,
          class: "face-text",
          "font-size": 26,
          fill: "#EF4444",
          text: "💫 short! 💫",
        },
        g,
      );
    } else {
      const happy = Object.values(an.brightness).some((b) => b > 0);
      [-22, 22].forEach((dx) => {
        el("circle", { cx: x + dx, cy: y - 22, r: 13, fill: "#fff" }, g);
        el("circle", { cx: x + dx + 2, cy: y - 20, r: 7, fill: "#2E2E2E" }, g);
        el("circle", { cx: x + dx + 5, cy: y - 24, r: 2.5, fill: "#fff" }, g);
      });
      el(
        "path",
        {
          d: happy
            ? `M${x - 18},${y + 12} q18,22 36,0`
            : `M${x - 12},${y + 16} q12,8 24,0`,
          fill: "none",
          stroke: "#fff",
          "stroke-width": 5,
          "stroke-linecap": "round",
        },
        g,
      );
      [-36, 36].forEach((dx) =>
        el(
          "circle",
          { cx: x + dx, cy: y + 2, r: 7, fill: "#ff8fa3", opacity: 0.7 },
          g,
        ),
      );
    }
    el(
      "text",
      {
        x: x,
        y: y + 62,
        class: "face-text",
        "font-size": 34,
        fill: "#FFC107",
        text: "⚡",
      },
      g,
    );
  }

  function drawExplodedBulb(g, p) {
    const { x, y } = p;
    // blast rings + fireball
    [0, 0.12, 0.24].forEach((d, i) =>
      el(
        "circle",
        {
          cx: x,
          cy: y,
          r: 40,
          class: "blast",
          style: `animation-delay:${d}s`,
          stroke: i === 1 ? "#ff3d00" : "#ffb300",
        },
        g,
      ),
    );
    el("circle", { cx: x, cy: y, r: 70, class: "fireball" }, g);
    el(
      "circle",
      { cx: x - 10, cy: y - 10, r: 40, class: "fireball fireball-core" },
      g,
    );
    // smoke puffs rising from the broken glass
    [
      [-40, 0],
      [14, -14],
      [44, 8],
      [-8, -30],
      [26, 20],
      [-30, 24],
    ].forEach(([dx, dy], i) =>
      el(
        "circle",
        {
          cx: x + dx,
          cy: y + dy - 30,
          r: 22 + i * 4,
          class: "smoke",
          style: `animation-delay:${i * 0.15}s`,
        },
        g,
      ),
    );
    // base
    el(
      "path",
      {
        d: `M${x - 50},${y + 92} h22 M${x + 28},${y + 92} h22`,
        stroke: "#013f8e",
        "stroke-width": 6,
        "stroke-linecap": "round",
      },
      g,
    );
    el(
      "rect",
      {
        x: x - 24,
        y: y + 46,
        width: 48,
        height: 20,
        rx: 6,
        fill: "#9aa3a8",
        stroke: "#607D8B",
        "stroke-width": 3,
      },
      g,
    );
    el(
      "rect",
      {
        x: x - 28,
        y: y + 62,
        width: 56,
        height: 40,
        rx: 10,
        fill: "#455a64",
        stroke: "#37474f",
        "stroke-width": 3,
      },
      g,
    );
    // jagged broken glass (bottom half remains)
    el(
      "path",
      {
        d: `M${x - 58},${y + 10} l14,-22 l12,18 l14,-30 l10,26 l16,-18 l8,22 l14,-12 l10,16 q-4,44 -49,50 q-45,-6 -49,-50 z`,
        fill: "#cfd8dc",
        stroke: "#2E2E2E",
        "stroke-width": 4,
        "stroke-linejoin": "round",
      },
      g,
    );
    el(
      "path",
      {
        d: `M${x - 20},${y + 30} l10,10 l-6,12 M${x + 14},${y + 22} l-8,14 l10,10`,
        fill: "none",
        stroke: "#2E2E2E",
        "stroke-width": 2.5,
      },
      g,
    );
    // dizzy face on what's left
    [-18, 18].forEach((dx) =>
      el(
        "path",
        {
          d: `M${x + dx - 7},${y + 24} l14,14 m0,-14 l-14,14`,
          stroke: "#2E2E2E",
          "stroke-width": 4,
          "stroke-linecap": "round",
        },
        g,
      ),
    );
    el(
      "path",
      {
        d: `M${x - 10},${y + 48} q5,-6 10,0 q5,6 10,0`,
        fill: "none",
        stroke: "#2E2E2E",
        "stroke-width": 3.5,
        "stroke-linecap": "round",
      },
      g,
    );
    // flying shards + flash
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2,
        dist = 140 + (i % 3) * 60,
        sz = 10 + (i % 4) * 5;
      el(
        "polygon",
        {
          points: `${x},${y} ${x + sz},${y + sz * 0.4} ${x + sz * 0.3},${y + sz}`,
          fill: i % 3 ? "#cfd8dc" : "#ffb300",
          stroke: "#2E2E2E",
          "stroke-width": 2,
          class: "shard",
          style: `--dx:${Math.cos(a) * dist}px; --dy:${Math.sin(a) * dist - 40}px; animation-delay:${(i % 5) * 0.03}s`,
        },
        g,
      );
    }
    el(
      "text",
      {
        x: x,
        y: y - 20,
        class: "boom-text",
        "text-anchor": "middle",
        text: "💥",
      },
      g,
    );
    el(
      "text",
      {
        x: x,
        y: y - 120,
        class: "boom-word",
        "text-anchor": "middle",
        text: "KABOOM!",
      },
      g,
    );
  }

  function drawBulb(g, p, an) {
    const { x, y } = p,
      b = an.brightness[p.id] || 0;
    if (exploded) return drawExplodedBulb(g, p);
    const lit = b >= 0.99,
      dim = b > 0 && !lit;
    if (lit) {
      el("circle", { cx: x, cy: y, r: 120, fill: "url(#halo)" }, g);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        el(
          "line",
          {
            x1: x + Math.cos(a) * 72,
            y1: y + Math.sin(a) * 72,
            x2: x + Math.cos(a) * 92,
            y2: y + Math.sin(a) * 92,
            class: "ray",
          },
          g,
        );
      }
    }
    // base
    el(
      "path",
      {
        d: `M${x - 50},${y + 92} h22 M${x + 28},${y + 92} h22`,
        stroke: "#013f8e",
        "stroke-width": 6,
        "stroke-linecap": "round",
      },
      g,
    );
    el(
      "rect",
      {
        x: x - 24,
        y: y + 46,
        width: 48,
        height: 20,
        rx: 6,
        fill: "#cfd8dc",
        stroke: "#607D8B",
        "stroke-width": 3,
      },
      g,
    );
    el(
      "rect",
      {
        x: x - 28,
        y: y + 62,
        width: 56,
        height: 40,
        rx: 10,
        fill: "#607D8B",
        stroke: "#455a64",
        "stroke-width": 3,
      },
      g,
    );
    [72, 82, 92].forEach((yy) =>
      el(
        "line",
        {
          x1: x - 24,
          y1: y + yy,
          x2: x + 24,
          y2: y + yy,
          stroke: "#90a4ae",
          "stroke-width": 3,
        },
        g,
      ),
    );
    // glass
    el(
      "circle",
      {
        cx: x,
        cy: y,
        r: 60,
        fill: lit ? "url(#glow)" : dim ? "#fff1b8" : "#f4f6f8",
        stroke: "#013f8e",
        "stroke-width": 5,
        filter: "url(#soft)",
      },
      g,
    );
    el(
      "ellipse",
      {
        cx: x - 24,
        cy: y - 26,
        rx: 10,
        ry: 16,
        fill: "#fff",
        opacity: 0.7,
        transform: `rotate(-30 ${x - 24} ${y - 26})`,
      },
      g,
    );
    // face
    if (lit) {
      [-22, 22].forEach((dx) => {
        el("circle", { cx: x + dx, cy: y - 8, r: 11, fill: "#2E2E2E" }, g);
        el(
          "polygon",
          { points: star(x + dx - 3, y - 12, 5), class: "spark" },
          g,
        );
      });
      el("path", { d: `M${x - 22},${y + 12} q22,28 44,0`, fill: "#2E2E2E" }, g);
      el("path", { d: `M${x - 10},${y + 26} q10,8 20,0`, fill: "#ff6b81" }, g);
      [-36, 36].forEach((dx) =>
        el(
          "circle",
          { cx: x + dx, cy: y + 10, r: 8, fill: "#ff8fa3", opacity: 0.7 },
          g,
        ),
      );
    } else if (dim) {
      [-22, 22].forEach((dx) =>
        el(
          "path",
          {
            d: `M${x + dx - 10},${y - 8} q10,10 20,0`,
            fill: "none",
            stroke: "#2E2E2E",
            "stroke-width": 4,
            "stroke-linecap": "round",
          },
          g,
        ),
      );
      el(
        "path",
        {
          d: `M${x - 14},${y + 18} q14,6 28,0`,
          fill: "none",
          stroke: "#2E2E2E",
          "stroke-width": 4,
          "stroke-linecap": "round",
        },
        g,
      );
      el(
        "text",
        {
          x: x + 70,
          y: y - 40,
          class: "face-text",
          "font-size": 20,
          fill: "#607D8B",
          text: "dim…",
        },
        g,
      );
    } else {
      [-22, 22].forEach((dx) =>
        el(
          "path",
          {
            d: `M${x + dx - 10},${y - 6} q10,-10 20,0`,
            fill: "none",
            stroke: "#2E2E2E",
            "stroke-width": 4,
            "stroke-linecap": "round",
          },
          g,
        ),
      );
      el(
        "circle",
        {
          cx: x,
          cy: y + 20,
          r: 5,
          fill: "none",
          stroke: "#2E2E2E",
          "stroke-width": 3,
        },
        g,
      );
      el(
        "text",
        { x: x + 50, y: y - 50, class: "zzz", "font-size": 26, text: "z" },
        g,
      );
      el(
        "text",
        {
          x: x + 66,
          y: y - 66,
          class: "zzz",
          "font-size": 20,
          style: "animation-delay:.6s",
          text: "z",
        },
        g,
      );
    }
  }
  function star(cx, cy, r) {
    let s = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        rr = i % 2 ? r * 0.45 : r;
      s += cx + Math.cos(a) * rr + "," + (cy + Math.sin(a) * rr) + " ";
    }
    return s;
  }

  function drawSwitch(g, p) {
    const { x, y } = p;
    g.classList.add("switch-part");
    el(
      "path",
      {
        d: `M${x - 88},${y + 8} h24 M${x + 64},${y + 8} h24`,
        stroke: "#013f8e",
        "stroke-width": 6,
        "stroke-linecap": "round",
      },
      g,
    );
    el(
      "rect",
      {
        x: x - 66,
        y: y - 40,
        width: 132,
        height: 80,
        rx: 22,
        fill: "#fff",
        stroke: "#013f8e",
        "stroke-width": 5,
        filter: "url(#soft)",
      },
      g,
    );
    el("circle", { cx: x - 30, cy: y + 8, r: 8, fill: "#013f8e" }, g);
    el("circle", { cx: x + 34, cy: y + 8, r: 8, fill: "#013f8e" }, g);
    const ex = p.on ? x + 34 : x + 26,
      ey = p.on ? y + 8 : y - 30;
    el(
      "line",
      {
        x1: x - 30,
        y1: y + 8,
        x2: ex,
        y2: ey,
        stroke: p.on ? "#22C55E" : "#0D0DCC",
        "stroke-width": 10,
        "stroke-linecap": "round",
      },
      g,
    );
    el(
      "circle",
      {
        cx: ex,
        cy: ey,
        r: 12,
        fill: "#FFC107",
        stroke: "#013f8e",
        "stroke-width": 4,
      },
      g,
    );
    el(
      "text",
      {
        x: x,
        y: y + 64,
        class: "face-text",
        "font-size": 20,
        text: p.on ? "ON ✓" : "OFF — tap me!",
      },
      g,
    );
    // tiny face
    [-12, 6].forEach((dx) =>
      el("circle", { cx: x + dx, cy: y - 22, r: 3.5, fill: "#2E2E2E" }, g),
    );
    el(
      "path",
      {
        d: `M${x - 10},${y - 12} q7,5 14,0`,
        fill: "none",
        stroke: "#2E2E2E",
        "stroke-width": 2.5,
        "stroke-linecap": "round",
      },
      g,
    );
  }

  function cablePath(a, b) {
    const mx = (a.x + b.x) / 2,
      sag = 40 + Math.abs(a.x - b.x) * 0.12;
    // keep the sag inside the board so cables near the bottom never drop off-screen
    const cy = Math.min(Math.max(a.y, b.y) + sag, VIEW.y + VIEW.h - 14);
    return `M${a.x},${a.y} Q${mx},${cy} ${b.x},${b.y}`;
  }

  /* ---------- Render ---------- */
  function render(
    fx = {},
    G = { cables: $("cables"), parts: $("parts"), terminals: $("terminals") },
  ) {
    const an = analyze();
    VIEW = fitBoard(G.cables.ownerSVGElement, parts); // zoom the board to fill this screen
    Object.values(G).forEach((g) => {
      while (g.firstChild) g.removeChild(g.firstChild);
    });

    cables.forEach((c) => {
      const a = termById(c.a),
        b = termById(c.b);
      const d = cablePath(a, b);
      const g = el("g", {}, G.cables);
      const path = el(
        "path",
        { d, class: "cable" + (an.short ? " shorted" : ""), stroke: c.color },
        g,
      );
      el("path", { d, class: "cable-core" }, g);
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        removeCable(c);
      });
    });

    parts.forEach((p) => {
      const g = el(
        "g",
        {
          class:
            "part" +
            (fx.shake && p.type === "battery" ? " shake" : "") +
            (fx.bounce && p.type === "bulb" ? " bounce" : "") +
            (fx.wobble === p.id ? " wobble" : ""),
        },
        G.parts,
      );
      if (p.type === "battery") drawBattery(g, p, an);
      else if (p.type === "bulb") drawBulb(g, p, an);
      else if (p.type === "switch") {
        drawSwitch(g, p);
        g.addEventListener("click", () => toggleSwitch(p));
      }
    });

    allTerminals().forEach((t) => {
      const c = el(
        "circle",
        { cx: t.x, cy: t.y, r: 17, class: "term", "data-term": t.id },
        G.terminals,
      );
      c.addEventListener("pointerdown", (e) => startDrag(e, t));
      if (t.label)
        el(
          "text",
          { x: t.x, y: t.y + 8, class: "term-label", text: t.label },
          G.terminals,
        );
    });
    return an;
  }

  /* ---------- Interactions ---------- */
  /* Screen ↔ board coordinates, worked out from the board's on-screen box and its viewBox
     (preserveAspectRatio xMidYMid meet). getScreenCTM() is not used: on iPhones and some Android
     browsers it ignores the CSS scale on the game stage, so drops landed in the wrong place. */
  function boardMap(svg = $("stage")) {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const k = Math.min(r.width / vb.width, r.height / vb.height) || 1;  // screen px per board unit
    return { r, vb, k, ox: r.left + (r.width - vb.width * k) / 2, oy: r.top + (r.height - vb.height * k) / 2 };
  }
  function svgPoint(e) {
    const m = boardMap();
    return { x: m.vb.x + (e.clientX - m.ox) / m.k, y: m.vb.y + (e.clientY - m.oy) / m.k };
  }
  /* how close a finger has to be, in board units: never less than ~30 screen pixels */
  const reach = () => Math.max(48, 30 / boardMap().k);
  function startDrag(e, t) {
    if (solved || drag) return;
    e.preventDefault();
    e.stopPropagation();
    drag = {
      from: t,
      line: el("path", { class: "drag-line", d: "" }, $("drag-layer")),
    };
    sfx.pick();
  }
  function moveDrag(e) {
    if (!drag) return;
    const p = svgPoint(e);
    drag.line.setAttribute("d", cablePath(drag.from, p));
    const near = nearestTerminal(p, reach());
    document
      .querySelectorAll(".term")
      .forEach((c) =>
        c.classList.toggle("hot", near && c.dataset.term === near.id),
      );
  }
  function endDrag(e) {
    if (!drag) return;
    const p = svgPoint(e);
    const to = nearestTerminal(p, reach());
    drag.line.remove();
    const from = drag.from;
    drag = null;
    document
      .querySelectorAll(".term")
      .forEach((c) => c.classList.remove("hot"));
    if (!to || to.id === from.id) return;
    const existing = cables.find(
      (c) =>
        (c.a === from.id && c.b === to.id) ||
        (c.a === to.id && c.b === from.id),
    );
    if (existing) {
      removeCable(existing);
      return;
    } // same two dots again → unplug that cable
    if (
      to.id.split(".")[0] === from.id.split(".")[0] &&
      from.id.split(".")[0] !== "B"
    ) {
      say("Same part — try connecting to a different one! 😊");
      return;
    }
    cables.push({
      a: from.id,
      b: to.id,
      color: CABLE_COLORS[colorIdx++ % CABLE_COLORS.length],
    });
    sfx.plug();
    afterChange(to.id.split(".")[0]);
  }
  function nearestTerminal(p, radius = 48) {
    let best = null,
      bd = radius;
    allTerminals().forEach((t) => {
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    });
    return best;
  }
  function removeCable(c) {
    if (solved) return;
    cables = cables.filter((x) => x !== c);
    sfx.snip();
    afterChange();
  }
  function toggleSwitch(p) {
    if (solved) return;
    p.on = !p.on;
    sfx.click();
    afterChange(p.id);
  }

  function afterChange(wobbleId) {
    const an = render({ wobble: wobbleId });
    const level = currentLevel();
    const bulbs = parts.filter((p) => p.type === "bulb");
    if (an.short) return explode();
    const litAll = bulbs.every((b) => an.brightness[b.id] > 0);
    const brightAll = bulbs.every((b) => an.brightness[b.id] >= 0.99);
    const dimAll = bulbs.every(
      (b) => an.brightness[b.id] > 0 && an.brightness[b.id] < 0.99,
    );
    if (litAll && (level.bright ? brightAll : level.dim ? dimAll : true)) {
      // Every switch must really control something: flipping it OFF has to darken at least one bulb.
      const bypassed = parts
        .filter((p) => p.type === "switch")
        .find((sw) => !switchControlsABulb(sw, an));
      if (bypassed) {
        render({ wobble: bypassed.id });
        say(
          `The bulbs are on, but switch ${bypassed.id} isn't doing anything! ⚠ The cables skipped it — wire the switch INTO the path so it controls the bulb.`,
        );
        return;
      }
      return celebrate();
    }
    if (litAll && level.bright) {
      render({ shake: true });
      say(
        "Too dim! 🔅 In series the bulbs SHARE the power. Give each bulb its OWN path to + and −!",
      );
      return;
    }
    if (litAll && level.dim) {
      say(
        "Too bright for a night-light! 😆 Chain the bulbs one after the other so they share the power.",
      );
      return;
    }
    const lit = bulbs.filter((b) => an.brightness[b.id] > 0).length;
    if (lit > 0)
      say(
        bulbs.length > 1
          ? `${lit} of ${bulbs.length} awake! Now the others 🌟`
          : "Almost!",
      );
    else {
      const offSw = parts.filter((p) => p.type === "switch" && !p.on);
      if (offSw.length && cables.length >= 2)
        say(
          offSw.length > 1
            ? "Wired up… but the switches are OFF. Tap them!"
            : "Everything's wired… but the switch is OFF. Tap it!",
        );
      else if (cables.length === 0) say(level.hello);
      else
        say(
          [
            "Keep going!",
            "Nice cable! One more…",
            "Current needs a full loop: + → bulb → −",
          ][Math.min(cables.length - 1, 2)],
        );
    }
  }

  /* ---------- Celebration / flow ---------- */
  function celebrate() {
    solved = true;
    cleared++;
    render({ bounce: true });
    say(currentLevel().win);
    mascot("cheer");
    confetti();
    sfx.jingle();
    dots();
    if (levelIdx < LEVELS.length - 1)
      autoTimer = setTimeout(() => loadLevel(levelIdx + 1), 1300);
    else autoTimer = setTimeout(() => endTurn(true), 1300);
  }
  /* ---------- Random circuits ----------
     Each turn gets a fresh order: level 1 stays first as the warm-up, the other 19
     are shuffled. On every board the bulbs swap places among themselves and the
     switches among themselves, so the same circuit never looks the same twice. */
  let order = LEVELS.map((_, i) => i);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function newOrder() {
    order = [0, ...shuffle(LEVELS.slice(1).map((_, i) => i + 1))];
  }
  /* ---------- Orientation ----------
     Circuits are authored in a landscape 1000×600 space. On a portrait screen
     (a TV turned 90°) the board becomes 600×1000 and every part is transposed
     (x,y)→(y,x), so the circuit uses the tall space while the drawings stay upright. */
  const LAND = { w: 1000, h: 600 };
  let portrait = false;
  const boardW = () => (portrait ? LAND.h : LAND.w);
  const boardH = () => (portrait ? LAND.w : LAND.h);
  function project(ps) {
    ps.forEach((p) => {
      if (p.lx === undefined) {
        p.lx = p.x;
        p.ly = p.y;
      }
      p.x = portrait ? p.ly : p.lx;
      p.y = portrait ? p.lx : p.ly;
    });
    return ps;
  }
  function applyViewBox() {
    const vb = `0 0 ${boardW()} ${boardH()}`;
    ["stage", "seq-stage"].forEach((id) => {
      const s = $(id);
      if (s) s.setAttribute("viewBox", vb);
    });
  }

  /* Zoom the board so the circuit fills whatever screen it is on (TV, monitor, tablet):
     fit the viewBox to the parts' bounding box, stretched to the container's aspect. */
  let VIEW = { x: 0, y: 0, w: LAND.w, h: LAND.h };
  const PAD = { battery: [120, 140], bulb: [130, 140], switch: [130, 130] };   // air around the circuit — tighter means a bigger circuit
  function fitBoard(svg, ps) {
    if (!svg || !ps.length) return VIEW;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    ps.forEach((p) => {
      const [dx, dy] = PAD[p.type] || [120, 130];
      x0 = Math.min(x0, p.x - dx);
      x1 = Math.max(x1, p.x + dx);
      y0 = Math.min(y0, p.y - dy);
      y1 = Math.max(y1, p.y + dy);
    });
    let w = x1 - x0, h = y1 - y0;
    const box = svg.getBoundingClientRect();
    const ar = box.width > 0 && box.height > 0 ? box.width / box.height : w / h;
    if (w / h < ar) {
      const nw = h * ar;
      x0 -= (nw - w) / 2;
      w = nw;
    } else {
      const nh = w / ar;
      y0 -= (nh - h) / 2;
      h = nh;
    }
    svg.setAttribute("viewBox", `${Math.round(x0)} ${Math.round(y0)} ${Math.round(w)} ${Math.round(h)}`);
    return { x: x0, y: y0, w, h };
  }
  function checkOrientation() {
    // Decide from the board's own box, not the window: on a short screen the
    // header/footer leave a wide strip, where the landscape layout fits better.
    const box = $("stage").getBoundingClientRect();
    const now = box.width > 0 ? box.height > box.width : innerHeight > innerWidth;
    if (now === portrait) return false;
    portrait = now;
    applyViewBox();
    return true;
  }

  function randomizedParts(level) {
    const ps = level.parts.map((p) => Object.assign({ on: false }, p));
    ["bulb", "switch"].forEach((type) => {
      const group = ps.filter((p) => p.type === type);
      const spots = shuffle(group.map((p) => [p.x, p.y]));
      group.forEach((p, k) => {
        p.x = spots[k][0];
        p.y = spots[k][1];
      });
    });
    // Random mirror of the whole board: battery may end up right/left, top/bottom.
    const flipX = Math.random() < 0.5, flipY = Math.random() < 0.5;
    ps.forEach((p) => {
      if (flipX) p.x = 1000 - p.x;
      if (flipY) p.y = 600 - p.y;
    });
    // …and nudge the battery to a random spot in its free area.
    const bat = ps.find((p) => p.type === "battery");
    if (bat) {
      const rnd = (a, b) => a + Math.random() * (b - a);
      const others = ps.filter((p) => p !== bat);
      const half = (p) => (p.type === "switch" ? 92 : 64);
      // keep a clear gap between the battery (body ±58, terminals at +82) and the nearest part
      const leftOfAll = others.every((p) => p.x > bat.x);
      let minX = 80, maxX = 920;
      if (leftOfAll) maxX = Math.min(...others.map((p) => p.x - half(p))) - 82 - 24;
      else minX = Math.max(...others.map((p) => p.x + half(p))) + 58 + 24;
      bat.x = Math.round(Math.max(minX, Math.min(maxX, bat.x + rnd(-40, 40))));
      bat.y = Math.round(Math.max(115, Math.min(485, bat.y + rnd(-120, 120))));
    }
    ps.forEach((p) => {
      p.lx = p.x;
      p.ly = p.y;
    });
    return project(ps);
  }
  const currentLevel = () => LEVELS[order[levelIdx]];
  const lastLayout = {}; // level index → the randomized parts the player actually saw

  function loadLevel(i) {
    clearTimeout(autoTimer);
    levelIdx = i;
    solved = false;
    cables = [];
    parts = randomizedParts(currentLevel());
    mascot("happy");
    say(currentLevel().hello);
    $("hud-level").textContent = currentLevel().name.toUpperCase();
    $("board-title").textContent = `LEVEL ${levelIdx + 1} / ${LEVELS.length}`;
    lastLayout[order[levelIdx]] = parts.map((p) => Object.assign({}, p)); // remember how this circuit looked for the Sequence viewer
    dots();
    render();
  }
  function dots() {
    $("level-dots").innerHTML = LEVELS.map(
      (_, i) =>
        `<span class="${i < levelIdx || (i === levelIdx && solved) ? "done" : i === levelIdx ? "now" : ""}"></span>`,
    ).join("");
  }

  /* ---------- Explosion: a short circuit blows the bulbs and costs precious seconds ---------- */
  function explode() {
    exploded = true;
    solved = true; // lock input during the boom
    render({ shake: true });
    $("stage").parentElement.classList.add("boom");
    document.body.classList.add("boom-body");
    debris();
    sfx.boom();
    say(
      "KABOOM! 💥 Short circuit — the cable skipped the bulb and it EXPLODED! The clock is still running — be careful!",
    );
    mascot("shock");
    autoTimer = setTimeout(() => {
      $("stage").parentElement.classList.remove("boom");
      document.body.classList.remove("boom-body");
      exploded = false;
      if (!playing) return;
      cables = [];
      parts.forEach((p) => {
        if (p.type === "switch") p.on = false;
      });
      solved = false;
      mascot("happy");
      render();
      say(
        "New bulbs installed! 🔧 Remember: current must go THROUGH a bulb, never straight from + to −.",
      );
    }, 2800);
  }
  /* ---------- Timer: 2 minutes for the whole game ---------- */
  const fmt = (s) =>
    Math.floor(s / 60) + ":" + String(Math.max(0, s) % 60).padStart(2, "0");
  function updateTimer() {
    $("timer-value").textContent = fmt(timeLeft);
    $("timer").classList.toggle("warn", timeLeft <= 15);
  }
  function startClock() {
    clearInterval(tick);
    tick = setInterval(() => {
      if (!playing) return;
      timeLeft--;
      updateTimer();
      if (timeLeft <= 15 && timeLeft > 0) sfx.click();
      if (timeLeft <= 0) endTurn(false);
    }, 1000);
  }

  /* ---------- Turn flow ---------- */
  const show = (id) => {
    document
      .querySelectorAll(".overlay")
      .forEach((o) => o.classList.toggle("hidden", o.id !== id));
    $("app").dataset.screen = id || "game"; // lets the CSS size the logo / corner buttons per screen
  };
  function startTurn() {
    renderTop3(loadBoard().sort((a, b) => b.score - a.score || a.t - b.t), " pts");
    playing = true;
    cleared = 0;
    timeLeft = GAME_SECONDS;
    exploded = false;
    $("hud-player").textContent = "👷 " + playerName;
    updateTimer();
    show(null);
    newOrder();
    loadLevel(0);
    startClock();
  }
  function endTurn(finishedAll) {
    if (!playing) return;
    playing = false;
    solved = true;
    exploded = false;
    clearTimeout(autoTimer);
    clearInterval(tick);
    $("stage").parentElement.classList.remove("boom");
    document.body.classList.remove("boom-body");
    const bonus = finishedAll ? timeLeft * 10 : 0;
    const score = cleared * 100 + bonus;
    const board = loadBoard();
    const entry = { name: playerName, score, levels: cleared, t: Date.now() };
    board.push(entry);
    board.sort((a, b) => b.score - a.score || a.t - b.t);
    localStorage.setItem(BOARD_KEY, JSON.stringify(board.slice(0, 50)));
    const rank = board.indexOf(entry) + 1;
    $("result-emoji").textContent = finishedAll
      ? "🏆"
      : timeLeft <= 0
        ? "⏰"
        : "💡";
    $("result-title").textContent = finishedAll
      ? "ALL LIT UP!"
      : timeLeft <= 0
        ? "TIME'S UP!"
        : "TURN OVER";
    $("result-score").textContent = score.toLocaleString();
    $("result-detail").textContent =
      `${playerName} lit ${cleared} of ${LEVELS.length} circuits` +
      (bonus
        ? ` with ${fmt(timeLeft)} to spare (+${bonus} time bonus)!`
        : ".");
    $("result-rank").textContent =
      rank === 1
        ? "🥇 NEW #1 ON THE SCOREBOARD!"
        : `Rank #${rank} on the scoreboard`;
    const showResult = () => {
      show("result");
      confetti();
      if (finishedAll || rank === 1) sfx.jingle();
      mascot(finishedAll || rank <= 3 ? "cheer" : "happy");
      mascot(finishedAll || rank <= 3 ? "cheer" : "happy", "mascot-result");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!$("result").classList.contains("hidden")) showHome();
      }, 25000);
    };
    showResult();
  }

  /* ---------- Sequence viewer: the correct wiring of every level, browsable from the home page ---------- */
  let seqIdx = 0, seqFlipX = false, seqFlipY = false;
  function showSequence(i = seqIdx, keepFlip = false) {
    if (i !== seqIdx || !keepFlip) { seqFlipX = false; seqFlipY = false; }
    seqIdx = Math.max(0, Math.min(LEVELS.length - 1, i));
    const level = LEVELS[seqIdx];
    // Show the circuit the way the player last saw it (mirrored / shuffled), or the standard layout.
    const base = lastLayout[seqIdx] || level.parts;
    // Temporarily swap in the level's solved state, draw it into the viewer's SVG, then restore the live game.
    const saved = { parts, cables, exploded, view: VIEW };
    parts = project(
      base.map((p) => {
        const q = Object.assign({}, p, { on: true });
        const lx = q.lx !== undefined ? q.lx : q.x;
        const ly = q.ly !== undefined ? q.ly : q.y;
        q.lx = seqFlipX ? LAND.w - lx : lx;
        q.ly = seqFlipY ? LAND.h - ly : ly;
        return q;
      }),
    );
    $("seq-note").textContent = lastLayout[seqIdx] ? "Shown as you played it" : "Standard layout";
    cables = level.sol.map(([a, b], k) => ({
      a,
      b,
      color: CABLE_COLORS[k % CABLE_COLORS.length],
    }));
    exploded = false;
    render(
      {},
      {
        cables: $("seq-cables"),
        parts: $("seq-parts"),
        terminals: $("seq-terminals"),
      },
    );
    ({ parts, cables, exploded } = saved);
    VIEW = saved.view; // the game board keeps its own zoom
    $("seq-title").textContent =
      `${level.name.toUpperCase()}` +
      (level.bright ? " · BRIGHT" : level.dim ? " · NIGHT-LIGHT" : "");
    $("seq-goal").textContent = level.hello;
    $("seq-how").textContent = `Here's how: ${level.how}`;
    mascot(seqIdx % 2 ? "cheer" : "happy", "mascot-seq");
    $("seq-prev").disabled = seqIdx === 0;
    $("seq-next").disabled = seqIdx === LEVELS.length - 1;
    document
      .querySelectorAll("#seq-picker button")
      .forEach((b, k) => b.classList.toggle("active", k === seqIdx));
    show("sequence");
  }
  function buildSequencePicker() {
    const p = $("seq-picker");
    p.innerHTML = "";
    LEVELS.forEach((lv, k) => {
      const b = document.createElement("button");
      b.className = "seq-pick";
      b.innerHTML = `<span class="seq-num">${k + 1}</span>${lv.name}`;
      b.addEventListener("click", () => {
        sfx.click();
        showSequence(k);
      });
      p.appendChild(b);
    });
  }
  let idleTimer = null;
  function loadBoard() {
    try {
      return JSON.parse(localStorage.getItem(BOARD_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function showBoard(highlightName) {
    const board = loadBoard().slice(0, 10);
    $("board-list").innerHTML = board.length
      ? board
          .map(
            (e, i) =>
              `<li class="${highlightName && e.name === highlightName && i === board.findIndex((x) => x.name === highlightName) ? "me" : ""}"><span class="nm">${esc(e.name)}</span><span class="lv">${e.levels}/${LEVELS.length} lit</span><span class="sc">${e.score.toLocaleString()}</span></li>`,
          )
          .join("")
      : '<li class="empty">No scores yet — be the first! ⚡</li>';
    show("scoreboard");
  }
  const esc = (s) =>
    s.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
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
  function showHome() {
    renderTop3(loadBoard().sort((a, b) => b.score - a.score || a.t - b.t), " pts");
    clearTimeout(idleTimer);
    show("home");
  }
  function askName() {
    show("name-entry");
    $("name-input").value = "";
    setTimeout(() => $("name-input").focus(), 50);
  }
  function go() {
    const n = $("name-input").value.trim();
    playerName = n || "Player";
    sfx.click();
    startTurn();
  }
  function say(t) {
    const b = $("bubble");
    if (b.textContent === t) return;
    b.textContent = t;
    b.style.animation = "none";
    void b.offsetWidth;
    b.style.animation = "";
  }

  /* ---------- Mascot: Busby (white hard hat + logo, safety glasses, blue shirt, hi-vis harness) ---------- */
  function mascot(mood, target = "mascot") {
    const s = $(target);
    s.innerHTML = "";
    const g = el("g", { class: mood === "cheer" ? "bounce" : "" }, s);
    const SKIN = "#ffe3c9",
      SHIRT = "#6aa9e9",
      SHIRT_D = "#3f7fc4",
      VEST = "#c6ff3a",
      VEST_D = "#8fc700",
      PANTS = "#1d2a6b";
    // legs
    el("rect", { x: 66, y: 196, width: 28, height: 30, rx: 8, fill: PANTS }, g);
    el(
      "rect",
      { x: 106, y: 196, width: 28, height: 30, rx: 8, fill: PANTS },
      g,
    );
    // arms (shirt sleeves + gloves)
    if (mood === "cheer") {
      el(
        "path",
        {
          d: "M62,160 q-30,-30 -22,-70",
          stroke: SHIRT,
          "stroke-width": 18,
          "stroke-linecap": "round",
          fill: "none",
        },
        g,
      );
      el(
        "path",
        {
          d: "M138,160 q30,-30 22,-70",
          stroke: SHIRT,
          "stroke-width": 18,
          "stroke-linecap": "round",
          fill: "none",
        },
        g,
      );
      el("circle", { cx: 40, cy: 88, r: 11, fill: "#d9dde3" }, g);
      el("circle", { cx: 160, cy: 88, r: 11, fill: "#d9dde3" }, g);
      el("text", { x: 16, y: 72, "font-size": 26, text: "✨" }, g);
      el("text", { x: 160, y: 72, "font-size": 26, text: "✨" }, g);
    } else {
      el(
        "path",
        {
          d: "M64,166 q-25,10 -22,40",
          stroke: SHIRT,
          "stroke-width": 18,
          "stroke-linecap": "round",
          fill: "none",
        },
        g,
      );
      el(
        "path",
        {
          d: "M136,166 q30,-5 42,-40",
          stroke: SHIRT,
          "stroke-width": 18,
          "stroke-linecap": "round",
          fill: "none",
        },
        g,
      );
      el("circle", { cx: 42, cy: 207, r: 11, fill: "#d9dde3" }, g);
      el("circle", { cx: 180, cy: 124, r: 11, fill: "#d9dde3" }, g);
      el(
        "path",
        {
          d: "M180,124 q20,-30 10,-50",
          stroke: "#EF4444",
          "stroke-width": 7,
          "stroke-linecap": "round",
          fill: "none",
        },
        g,
      );
    }
    // torso: blue shirt
    el(
      "rect",
      {
        x: 54,
        y: 140,
        width: 92,
        height: 70,
        rx: 24,
        fill: SHIRT,
        stroke: SHIRT_D,
        "stroke-width": 3,
      },
      g,
    );
    el(
      "path",
      {
        d: "M88,142 l12,14 l12,-14",
        fill: "none",
        stroke: SHIRT_D,
        "stroke-width": 3,
      },
      g,
    ); // collar
    // hi-vis vest / harness with reflective stripes
    el(
      "path",
      {
        d: "M62,146 h22 v62 h-22 z M116,146 h22 v62 h-22 z",
        fill: VEST,
        stroke: VEST_D,
        "stroke-width": 2.5,
      },
      g,
    );
    el(
      "path",
      {
        d: "M62,170 h22 M116,170 h22 M62,190 h22 M116,190 h22",
        stroke: "#eef",
        "stroke-width": 5,
      },
      g,
    );
    el(
      "path",
      {
        d: "M62,170 h22 M116,170 h22 M62,190 h22 M116,190 h22",
        stroke: "#c9cdd6",
        "stroke-width": 1.5,
        "stroke-dasharray": "3 2",
      },
      g,
    );
    // harness belt with logo badge
    el(
      "rect",
      {
        x: 56,
        y: 194,
        width: 88,
        height: 12,
        rx: 4,
        fill: "#2f6fd6",
        stroke: "#1d2a6b",
        "stroke-width": 2,
      },
      g,
    );
    el(
      "circle",
      {
        cx: 100,
        cy: 200,
        r: 10,
        fill: "#fff",
        stroke: "#1d2a6b",
        "stroke-width": 2,
      },
      g,
    );
    el(
      "image",
      { href: "fhe_logo.png", x: 92, y: 193, width: 16, height: 14 },
      g,
    );
    // head
    el(
      "circle",
      {
        cx: 100,
        cy: 96,
        r: 58,
        fill: SKIN,
        stroke: "#e2b896",
        "stroke-width": 3,
      },
      g,
    );
    // hair peeking under the hat
    el(
      "path",
      {
        d: "M46,92 q6,-18 20,-22 M154,92 q-6,-18 -20,-22",
        stroke: "#1a1a1a",
        "stroke-width": 9,
        "stroke-linecap": "round",
        fill: "none",
      },
      g,
    );
    // white hard hat with logo on the front
    el(
      "path",
      {
        d: "M40,80 a60,54 0 0 1 120,0 z",
        fill: "#fff",
        stroke: "#c5cad3",
        "stroke-width": 4,
      },
      g,
    );
    el(
      "rect",
      {
        x: 28,
        y: 74,
        width: 144,
        height: 16,
        rx: 8,
        fill: "#fff",
        stroke: "#c5cad3",
        "stroke-width": 3,
      },
      g,
    );
    el(
      "path",
      {
        d: "M100,32 v40",
        stroke: "#e6e9ee",
        "stroke-width": 8,
        "stroke-linecap": "round",
      },
      g,
    );
    el(
      "image",
      { href: "fhe_logo.png", x: 82, y: 40, width: 36, height: 32 },
      g,
    );
    // safety glasses (thick black frame, clear lenses)
    el(
      "rect",
      {
        x: 58,
        y: 96,
        width: 36,
        height: 24,
        rx: 8,
        fill: "rgba(200,230,255,.35)",
        stroke: "#1a1a1a",
        "stroke-width": 5,
      },
      g,
    );
    el(
      "rect",
      {
        x: 106,
        y: 96,
        width: 36,
        height: 24,
        rx: 8,
        fill: "rgba(200,230,255,.35)",
        stroke: "#1a1a1a",
        "stroke-width": 5,
      },
      g,
    );
    el(
      "path",
      {
        d: "M94,106 h12 M58,104 l-14,-6 M142,104 l14,-6",
        stroke: "#1a1a1a",
        "stroke-width": 5,
        "stroke-linecap": "round",
      },
      g,
    );
    // eyes behind the lenses
    [76, 124].forEach((cx) => {
      if (mood === "cheer")
        el(
          "path",
          {
            d: `M${cx - 9},111 q9,-12 18,0`,
            stroke: "#2E2E2E",
            "stroke-width": 4,
            fill: "none",
            "stroke-linecap": "round",
          },
          g,
        );
      else if (mood === "shock") {
        el(
          "circle",
          {
            cx,
            cy: 108,
            r: 9,
            fill: "#fff",
            stroke: "#2E2E2E",
            "stroke-width": 2,
          },
          g,
        );
        el("circle", { cx, cy: 108, r: 3, fill: "#2E2E2E" }, g);
      } else {
        el("circle", { cx, cy: 108, r: 8, fill: "#3b2a1a" }, g);
        el("circle", { cx: cx + 3, cy: 105, r: 2.6, fill: "#fff" }, g);
      }
    });
    if (mood === "cheer")
      el("path", { d: "M86,130 q14,22 28,0 z", fill: "#2E2E2E" }, g);
    else if (mood === "shock") {
      el("ellipse", { cx: 100, cy: 136, rx: 9, ry: 12, fill: "#2E2E2E" }, g);
      el(
        "text",
        {
          x: 158,
          y: 60,
          "font-size": 30,
          "font-weight": 900,
          fill: "#EF4444",
          "font-family": "Baloo 2",
          text: "!!",
        },
        g,
      );
    } else
      el(
        "path",
        {
          d: "M88,132 q12,12 24,0",
          stroke: "#2E2E2E",
          "stroke-width": 4,
          fill: "none",
          "stroke-linecap": "round",
        },
        g,
      );
  }

  /* ---------- Confetti ---------- */
  /* The effects canvas covers the board in stage units (up to ~1900×3000 on an upright phone);
     keep its pixels at the screen's real resolution and draw through a scale, so bursts stay cheap. */
  function sizeFx(cv, ctx) {
    const W = cv.clientWidth, H = cv.clientHeight;
    const k = Math.max(0.25, Math.min(1, (cv.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2)) / Math.max(W, 1)));
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return [W, H];
  }
  function confetti() {
    const cv = $("confetti"),
      ctx = cv.getContext("2d");
    const [W, H] = sizeFx(cv, ctx); // drawn in stage units, stored at screen resolution
    const ps = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      r: 5 + Math.random() * 7,
      c: CABLE_COLORS[Math.floor(Math.random() * CABLE_COLORS.length)],
      a: Math.random() * Math.PI,
      s: (Math.random() - 0.5) * 0.2,
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.s;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      if (t - t0 < 3500) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  /* ---------- Debris burst (canvas) — radiates from every bulb ---------- */
  function debris() {
    const cv = $("confetti"),
      ctx = cv.getContext("2d");
    const [W, H] = sizeFx(cv, ctx); // drawn in stage units, stored at screen resolution
    const m = boardMap(),
      box = cv.getBoundingClientRect();
    const toCanvas = (x, y) => {
      const sx = m.ox + (x - m.vb.x) * m.k, sy = m.oy + (y - m.vb.y) * m.k;
      // screen pixels → canvas pixels (the whole game is scaled to fit the screen)
      return [((sx - box.left) * W) / box.width, ((sy - box.top) * H) / box.height];
    };
    const COL = [
      "#ff6a00",
      "#ffb300",
      "#ff3d00",
      "#2E2E2E",
      "#777",
      "#ffd54f",
      "#cfd8dc",
    ];
    const ps = [];
    parts
      .filter((p) => p.type === "bulb")
      .forEach((b) => {
        const [cx, cy] = toCanvas(b.x, b.y);
        for (let i = 0; i < 90; i++) {
          const a = Math.random() * Math.PI * 2,
            sp = 4 + Math.random() * 14;
          ps.push({
            x: cx,
            y: cy,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 4,
            r: 4 + Math.random() * 10,
            c: COL[Math.floor(Math.random() * COL.length)],
            a: Math.random() * Math.PI,
            s: (Math.random() - 0.5) * 0.4,
            life: 1,
          });
        }
      });
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.vx *= 0.98;
        p.a += p.s;
        p.life -= 0.012;
        if (p.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.7);
        ctx.restore();
      });
      if (t - t0 < 2000) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  /* ---------- Sounds (WebAudio, no files) ---------- */
  let actx;
  function tone(f, d = 0.1, type = "sine", v = 0.08, delay = 0) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(),
        g = actx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.value = v;
      o.connect(g);
      g.connect(actx.destination);
      o.start(actx.currentTime + delay);
      o.stop(actx.currentTime + delay + d);
    } catch (e) {}
  }
  const sfx = {
    pick: () => tone(500, 0.05),
    plug: () => {
      tone(660, 0.08);
      tone(880, 0.1, "sine", 0.08, 0.08);
    },
    snip: () => tone(300, 0.08, "square", 0.04),
    click: () => tone(1000, 0.04, "square", 0.04),
    buzz: () => tone(120, 0.35, "sawtooth", 0.07),
    boom: () => {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const t = actx.currentTime;
        // noise blast through a low-pass filter = the "KABOOM"
        const len = Math.floor(actx.sampleRate * 1.6),
          buf = actx.createBuffer(1, len, actx.sampleRate),
          d = buf.getChannelData(0);
        for (let i = 0; i < len; i++)
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = actx.createBufferSource();
        src.buffer = buf;
        const lp = actx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(3000, t);
        lp.frequency.exponentialRampToValueAtTime(200, t + 1.4);
        const g = actx.createGain();
        g.gain.setValueAtTime(1.0, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        src.connect(lp);
        lp.connect(g);
        g.connect(actx.destination);
        src.start(t);
        // sub-bass thump + crack
        const o = actx.createOscillator(),
          og = actx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.9);
        og.gain.setValueAtTime(0.9, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 1);
        o.connect(og);
        og.connect(actx.destination);
        o.start(t);
        o.stop(t + 1);
        tone(2600, 0.06, "square", 0.25);
        tone(1400, 0.1, "square", 0.2, 0.04);
        tone(45, 0.8, "sawtooth", 0.3, 0.05);
      } catch (e) {}
    },
    jingle: () =>
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone(f, 0.25, "triangle", 0.09, i * 0.11),
      ),
  };

  /* ---------- Background music ----------
     Plays bgm.mp3 from the game folder if you drop one in; otherwise a cheerful
     synthesized chiptune loop (no files needed). Mute button in the header/home. */
  const bgm = (() => {
    let muted = localStorage.getItem("lightItUpMuted") === "1",
      running = false,
      audioEl = null,
      synth = null;
    const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
    // C-major pentatonic bounce: [midi, beats]
    const LEAD = [
      72, 76, 79, 76, 81, 79, 76, 72, 74, 76, 79, 81, 84, 81, 79, 76,
    ];
    const BASS = [
      48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 57, 57, 55, 53,
    ];
    function startSynth() {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const master = actx.createGain();
      master.gain.value = muted ? 0 : 0.09;
      master.connect(actx.destination);
      const tempo = 0.14;
      let step = 0,
        next = actx.currentTime + 0.1,
        timer;
      const play = (f, t, d, type, v) => {
        const o = actx.createOscillator(),
          g = actx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + d);
      };
      const tick = () => {
        while (next < actx.currentTime + 0.3) {
          const i = step % 16;
          play(NOTE(LEAD[i]), next, tempo * 0.9, "square", 0.35);
          if (i % 2 === 0)
            play(NOTE(BASS[i]), next, tempo * 1.6, "triangle", 0.6);
          if (i % 4 === 2)
            play(
              NOTE(LEAD[i] + 12),
              next + tempo / 2,
              tempo * 0.4,
              "sine",
              0.25,
            ); // sparkle
          if (i % 4 === 0) {
            const n = actx.createBufferSource(),
              b = actx.createBuffer(1, 800, actx.sampleRate),
              d = b.getChannelData(0);
            for (let k = 0; k < 800; k++)
              d[k] = (Math.random() * 2 - 1) * (1 - k / 800);
            n.buffer = b;
            const g = actx.createGain();
            g.gain.value = 0.12;
            n.connect(g);
            g.connect(master);
            n.start(next);
          }
          next += tempo;
          step++;
        }
        timer = setTimeout(tick, 80);
      };
      tick();
      return { master, stop: () => clearTimeout(timer) };
    }
    function start() {
      if (running) return;
      running = true;
      audioEl = new Audio("bgm.mp3");
      audioEl.loop = true;
      audioEl.volume = muted ? 0 : 0.5;
      audioEl.play().catch(() => {
        audioEl = null;
        try {
          synth = startSynth();
        } catch (e) {}
      });
      audioEl &&
        audioEl.addEventListener("error", () => {
          audioEl = null;
          if (!synth)
            try {
              synth = startSynth();
            } catch (e) {}
        });
      updateBtn();
    }
    function toggle() {
      muted = !muted;
      localStorage.setItem("lightItUpMuted", muted ? "1" : "0");
      if (audioEl) audioEl.volume = muted ? 0 : 0.5;
      if (synth) synth.master.gain.value = muted ? 0 : 0.09;
      updateBtn();
    }
    function updateBtn() {
      ["btn-mute", "btn-mute-home"].forEach((id) => {
        const b = $(id);
        if (b) b.textContent = muted ? "🔇" : "🔊";
      });
    }
    updateBtn();
    return { start, toggle };
  })();

  /* ---------- On-screen keyboard (touch screens & controllers have no keyboard) ---------- */
  function buildOSK() {
    const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    const osk = $("osk");
    osk.innerHTML = "";
    const input = $("name-input");
    const press = (k) => {
      if (k === "⌫") input.value = input.value.slice(0, -1);
      else if (k === "SPACE") {
        if (input.value.length < 16 && input.value.length) input.value += " ";
      } else if (input.value.length < 16)
        input.value +=
          input.value.length === 0 || input.value.endsWith(" ")
            ? k
            : k.toLowerCase();
      sfx.click();
    };
    rows.forEach((r, ri) => {
      const row = document.createElement("div");
      row.className = "osk-row";
      [...r].forEach((k) => {
        const b = document.createElement("button");
        b.className = "key";
        b.textContent = k;
        b.addEventListener("click", () => press(k));
        row.appendChild(b);
      });
      if (ri === 2) {
        const b = document.createElement("button");
        b.className = "key";
        b.textContent = "⌫";
        b.addEventListener("click", () => press("⌫"));
        row.appendChild(b);
      }
      osk.appendChild(row);
    });
    const row = document.createElement("div");
    row.className = "osk-row";
    const sp = document.createElement("button");
    sp.className = "key wide";
    sp.textContent = "SPACE";
    sp.addEventListener("click", () => press("SPACE"));
    row.appendChild(sp);
    osk.appendChild(row);
  }

  /* ---------- Game controller: glove cursor driven by the Gamepad API ---------- */
  const pad = (() => {
    const cur = $("gp-cursor");
    let x = innerWidth / 2,
      y = innerHeight / 2,
      active = false,
      prev = {},
      hot = null;
    const btn = (gp, i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const pressed = (gp, i) => {
      const now = btn(gp, i),
        was = prev[i];
      prev[i] = now;
      return now && !was;
    };
    function under() {
      cur.style.display = "none";
      const e = document.elementFromPoint(x, y);
      cur.style.display = "";
      return e;
    }
    function fakeEvt() {
      return {
        clientX: x,
        clientY: y,
        preventDefault() {},
        stopPropagation() {},
      };
    }
    function activate() {
      const e = under();
      if (!e) return;
      const term = e.closest && e.closest(".term");
      if (term) {
        const t = termById(term.dataset.term);
        if (!drag) startDrag(fakeEvt(), t);
        else endDrag(fakeEvt());
        return;
      }
      if (drag) {
        endDrag(fakeEvt());
        return;
      } // dropped on nothing → cancel
      const cable = e.closest && e.closest(".cable");
      if (cable) {
        cable.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return;
      }
      const sw = e.closest && e.closest(".switch-part");
      if (sw) {
        sw.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return;
      }
      const b = e.closest && e.closest("button, .tab, .key");
      if (b) {
        b.click();
        return;
      }
    }
    function loop() {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = [...gps].find((g) => g && g.connected);
      if (gp) {
        if (!active) {
          active = true;
          cur.classList.remove("hidden");
          $("gp-status").textContent = "— connected ✓";
        }
        let dx = gp.axes[0] || 0,
          dy = gp.axes[1] || 0;
        if (Math.abs(dx) < 0.2) dx = 0;
        if (Math.abs(dy) < 0.2) dy = 0;
        if (btn(gp, 14)) dx = -1;
        if (btn(gp, 15)) dx = 1;
        if (btn(gp, 12)) dy = -1;
        if (btn(gp, 13)) dy = 1;
        if (dx || dy) {
          x = Math.max(0, Math.min(innerWidth - 1, x + dx * 16));
          y = Math.max(0, Math.min(innerHeight - 1, y + dy * 16));
          cur.style.left = x + "px";
          cur.style.top = y + "px";
          if (drag) moveDrag(fakeEvt());
          const e = under();
          const h =
            e &&
            e.closest &&
            e.closest(".term, button, .tab, .key, .cable, .switch-part");
          if (h !== hot) {
            hot && hot.classList.remove("hot", "hot-btn");
            hot = h;
            hot &&
              hot.classList.add(
                hot.classList.contains("term") ||
                  hot.classList.contains("key") ||
                  hot.classList.contains("tab")
                  ? "hot"
                  : "hot-btn",
              );
          }
        }
        if (pressed(gp, 0)) {
          cur.classList.add("press");
          setTimeout(() => cur.classList.remove("press"), 120);
          activate();
        }
        if (pressed(gp, 1) && drag) {
          drag.line.remove();
          drag = null;
          document
            .querySelectorAll(".term")
            .forEach((c) => c.classList.remove("hot"));
        }
        if (pressed(gp, 3) && playing && !solved) $("btn-clear").click();
        if (pressed(gp, 9)) {
          if (!$("home").classList.contains("hidden")) $("btn-play").click();
          else if (!$("name-entry").classList.contains("hidden"))
            $("btn-go").click();
        }
      }
    }
    window.addEventListener("gamepadconnected", () => {
      $("gp-status").textContent = "— connected ✓";
      say("🎮 Controller connected! Move with the stick, press A on the dots.");
    });
    window.addEventListener("gamepaddisconnected", () => {
      active = false;
      cur.classList.add("hidden");
      $("gp-status").textContent = "";
    });
    setInterval(loop, 16);
    return {};
  })();

  /* ---------- Tutorial tabs ---------- */
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((x) => x.classList.toggle("active", x === t));
      document
        .querySelectorAll(".tab-body")
        .forEach((b) =>
          b.classList.toggle("hidden", b.id !== "tut-" + t.dataset.tab),
        );
    }),
  );

  /* ---------- Boot ---------- */
  buildOSK();
  document.querySelectorAll(".steps li").forEach((li) => {
    const ico = li.querySelector(".ico");
    const span = document.createElement("span");
    while (ico.nextSibling) span.appendChild(ico.nextSibling);
    li.appendChild(span);
  });
  $("btn-howto").addEventListener("click", () => {
    sfx.click();
    show("tutorial");
  });
  buildSequencePicker();
  $("btn-sequence").addEventListener("click", () => {
    sfx.click();
    showSequence(0);
  });
  $("seq-prev").addEventListener("click", () => {
    sfx.click();
    showSequence(seqIdx - 1);
  });
  $("seq-next").addEventListener("click", () => {
    sfx.click();
    showSequence(seqIdx + 1);
  });
  $("btn-seq-close").addEventListener("click", showHome);
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => {
      sfx.click();
      showHome();
    }),
  );
  $("seq-flip-x").addEventListener("click", () => { sfx.click(); seqFlipX = !seqFlipX; showSequence(seqIdx, true); });
  $("seq-flip-y").addEventListener("click", () => { sfx.click(); seqFlipY = !seqFlipY; showSequence(seqIdx, true); });
  $("btn-tut-close").addEventListener("click", showHome);
  $("btn-mute").addEventListener("click", () => {
    bgm.start();
    bgm.toggle();
  });
  document.addEventListener("pointerdown", () => bgm.start(), { once: true }); // browsers need a gesture before audio
  const stage = $("stage");
  stage.addEventListener("pointerdown", (e) => {
    if (drag || solved || e.button > 0) return;
    if (e.target.closest && e.target.closest(".switch-part, .cable")) return;   // taps on switches / cables keep their meaning
    const t = nearestTerminal(svgPoint(e), reach());
    if (t) startDrag(e, t);
  });
  window.addEventListener("pointermove", moveDrag); // keep tracking even when the finger leaves the board
  window.addEventListener("pointerup", endDrag);
  /* the browser took the touch away (a system gesture): drop the cable in hand, connect nothing */
  window.addEventListener("pointercancel", () => {
    if (!drag) return;
    drag.line.remove();
    drag = null;
    document.querySelectorAll(".term").forEach((c) => c.classList.remove("hot"));
  });
  $("btn-clear").addEventListener("click", () => {
    if (solved) return;
    cables = [];
    parts.forEach((p) => {
      if (p.type === "switch") p.on = false;
    });
    sfx.snip();
    afterChange();
  });
  $("btn-quit").addEventListener("click", () => endTurn(false));
  $("btn-play").addEventListener("click", () => {
    sfx.click();
    askName();
  });
  $("btn-go").addEventListener("click", go);
  $("name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
  $("btn-name-back").addEventListener("click", showHome);
  $("btn-scoreboard").addEventListener("click", () => showBoard());
  $("btn-result-board").addEventListener("click", () => showBoard(playerName));
  $("btn-result-home").addEventListener("click", askName);
  $("btn-board-play").addEventListener("click", askName);
  $("btn-board-back").addEventListener("click", showHome);
  // Clear scoreboard: two taps within 4 s so nobody wipes it by accident
  let clearArmed = null;
  $("btn-board-clear").addEventListener("click", () => {
    const b = $("btn-board-clear");
    sfx.click();
    if (clearArmed) {
      clearTimeout(clearArmed);
      clearArmed = null;
      localStorage.removeItem(BOARD_KEY);
      b.textContent = "🗑 CLEAR SCOREBOARD";
      b.classList.remove("armed");
      showBoard();
      return;
    }
    b.textContent = "⚠ TAP AGAIN TO ERASE ALL";
    b.classList.add("armed");
    clearArmed = setTimeout(() => {
      clearArmed = null;
      b.textContent = "🗑 CLEAR SCOREBOARD";
      b.classList.remove("armed");
    }, 4000);
  });
  /* ---------- Stage scaling (same rules as Electrical Troll and Zip) ----------
     Everything is laid out on a big design canvas (1920×1080 landscape, or taller/wider to
     match the screen's shape) and scaled to fit, so it looks the same on phones, tablets and TVs. */
  function viewportSize() {
    const vv = window.visualViewport, cs = getComputedStyle($("viewport")), px = (v) => parseFloat(v) || 0;
    return {
      w: (vv ? vv.width : innerWidth) - px(cs.paddingLeft) - px(cs.paddingRight),
      h: (vv ? vv.height : innerHeight) - px(cs.paddingTop) - px(cs.paddingBottom),
    };
  }
  function fitStage() {
    const { w, h } = viewportSize();
    const ar = Math.max(w, 1) / Math.max(h, 1);
    const stageW = Math.round(Math.max(1920, 1080 * ar)), stageH = Math.round(Math.max(1080, 1920 / ar));
    const s = Math.min(w / stageW, h / stageH);
    const app = $("app");
    app.style.width = stageW + "px";
    app.style.height = stageH + "px";
    app.style.transform = `translate(-50%, -50%) scale(${s})`;
    app.classList.toggle("compact", s < 0.5);
    app.classList.toggle("portrait", h > w);
    app.classList.toggle("tall", stageH / stageW > 1.45); // phones held upright
  }
  fitStage();
  if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize);
  checkOrientation();
  applyViewBox();
  // Re-lay the board when the screen rotates or the window/TV resolution changes
  let reflow;
  function onResize() {
    fitStage();
    clearTimeout(reflow);
    reflow = setTimeout(() => {
      checkOrientation();
      if (parts.length) {
        project(parts);
        render(); // also re-fits the board zoom to the new screen size
      }
      if (!$("sequence").classList.contains("hidden")) showSequence(seqIdx, true);
    }, 120);
  }
  addEventListener("resize", onResize);
  addEventListener("orientationchange", onResize);

  /* ---------- Smoothness guard ----------
     The board is SVG + CSS animation (glowing bulbs, drop shadows, a pulsing hint balloon). If a device
     keeps missing frames during a turn, the costly bits switch off for the rest of the visit (.low-fx). */
  (function watchFrames() {
    let last = performance.now(), ema = 16, slowFor = 0;
    const tick = (now) => {
      const dt = now - last;
      last = now;
      if (playing && !document.hidden && dt > 0 && dt < 250) {
        ema += (dt - ema) * 0.05;
        slowFor = ema > 24 ? slowFor + dt : 0;
        if (slowFor > 1500) { $("app").classList.add("low-fx"); return; }   // done: stop watching
      }
      requestAnimationFrame(tick);
    };
    if (/[?&]lowfx=1/.test(location.search) || matchMedia("(prefers-reduced-motion: reduce)").matches) $("app").classList.add("low-fx");
    else requestAnimationFrame(tick);
  })();

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

  mascot("happy");
  mascot("cheer", "mascot-home");
  loadLevel(0);
  solved = true; // idle preview behind the home screen
  showHome();
})();
