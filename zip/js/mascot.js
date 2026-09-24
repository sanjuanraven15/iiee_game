/* ⚡ ELECTRICAL TROLL — "Busby the Engineer" mascot (inline SVG) + hint balloons
   renderMascot(mood, svgElement)  mood: 'idle' | 'cheer' | 'shock' | 'salute' | 'dead'
   hintFor(cause)                  a short nudge for the trap that got the player (never the full solution) */
'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (k === 'text') e.textContent = attrs[k];
    else if (k === 'href') { e.setAttribute('href', attrs[k]); e.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', attrs[k]); }
    else e.setAttribute(k, attrs[k]);
  }
  parent.appendChild(e);
  return e;
}

function renderMascot(mood, svg, logoHref = 'images/logo.png', animate = true, armsDown = false) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 200 232');
  const el = svgEl;
  const g = el('g', { class: animate ? (mood === 'cheer' || mood === 'salute' ? 'bounce' : (mood === 'shock' ? 'shake' : '')) : '' }, svg);
  const happy = mood === 'cheer' || mood === 'salute';
  const LOGO = logoHref;
  const SKIN = '#ffe3c9', SHIRT = '#6aa9e9', SHIRT_D = '#3f7fc4', VEST = '#c6ff3a', VEST_D = '#8fc700', PANTS = '#1d2a6b';
  // legs
  el('rect', { x: 66, y: 196, width: 28, height: 30, rx: 8, fill: PANTS }, g);
  el('rect', { x: 106, y: 196, width: 28, height: 30, rx: 8, fill: PANTS }, g);
  // arms (shirt sleeves + gloves)
  if (mood === 'cheer') {
    el('path', { d: 'M62,160 q-30,-30 -22,-70', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('path', { d: 'M138,160 q30,-30 22,-70', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('circle', { cx: 40, cy: 88, r: 11, fill: '#d9dde3' }, g); el('circle', { cx: 160, cy: 88, r: 11, fill: '#d9dde3' }, g);
    el('text', { x: 16, y: 72, 'font-size': 26, text: '✨' }, g); el('text', { x: 160, y: 72, 'font-size': 26, text: '✨' }, g);
  } else if (mood === 'salute') {
    el('path', { d: 'M64,166 q-25,10 -22,40', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('circle', { cx: 42, cy: 207, r: 11, fill: '#d9dde3' }, g);
    el('path', { d: 'M138,164 q52,-12 30,-66', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
  } else if (armsDown) {
    /* playable-character pose: both arms relaxed at the sides */
    el('path', { d: 'M64,166 q-25,10 -22,40', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('path', { d: 'M136,166 q25,10 22,40', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('circle', { cx: 42, cy: 207, r: 11, fill: '#d9dde3' }, g); el('circle', { cx: 158, cy: 207, r: 11, fill: '#d9dde3' }, g);
  } else {
    el('path', { d: 'M64,166 q-25,10 -22,40', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('path', { d: 'M136,166 q30,-5 42,-40', stroke: SHIRT, 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' }, g);
    el('circle', { cx: 42, cy: 207, r: 11, fill: '#d9dde3' }, g); el('circle', { cx: 180, cy: 124, r: 11, fill: '#d9dde3' }, g);
    //el('path', { d: 'M180,124 q20,-30 10,-50', stroke: '#EF4444', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, g);
  }
  // torso: blue shirt
  el('rect', { x: 54, y: 140, width: 92, height: 70, rx: 24, fill: SHIRT, stroke: SHIRT_D, 'stroke-width': 3 }, g);
  el('path', { d: 'M88,142 l12,14 l12,-14', fill: 'none', stroke: SHIRT_D, 'stroke-width': 3 }, g);   // collar
  // hi-vis vest / harness with reflective stripes
  el('path', { d: 'M62,146 h22 v62 h-22 z M116,146 h22 v62 h-22 z', fill: VEST, stroke: VEST_D, 'stroke-width': 2.5 }, g);
  el('path', { d: 'M62,170 h22 M116,170 h22 M62,190 h22 M116,190 h22', stroke: '#eef', 'stroke-width': 5 }, g);
  el('path', { d: 'M62,170 h22 M116,170 h22 M62,190 h22 M116,190 h22', stroke: '#c9cdd6', 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, g);
  // harness belt with logo badge
  el('rect', { x: 56, y: 194, width: 88, height: 12, rx: 4, fill: '#2f6fd6', stroke: '#1d2a6b', 'stroke-width': 2 }, g);
  el('circle', { cx: 100, cy: 200, r: 10, fill: '#fff', stroke: '#1d2a6b', 'stroke-width': 2 }, g);
  el('image', { href: LOGO, x: 92, y: 193, width: 16, height: 14 }, g);
  // head
  el('circle', { cx: 100, cy: 96, r: 58, fill: SKIN, stroke: '#e2b896', 'stroke-width': 3 }, g);
  // hair peeking under the hat
  el('path', { d: 'M46,92 q6,-18 20,-22 M154,92 q-6,-18 -20,-22', stroke: '#1a1a1a', 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }, g);
  // white hard hat with logo on the front
  el('path', { d: 'M40,80 a60,54 0 0 1 120,0 z', fill: '#fff', stroke: '#c5cad3', 'stroke-width': 4 }, g);
  el('rect', { x: 28, y: 74, width: 144, height: 16, rx: 8, fill: '#fff', stroke: '#c5cad3', 'stroke-width': 3 }, g);
  el('path', { d: 'M100,32 v40', stroke: '#e6e9ee', 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
  el('image', { href: LOGO, x: 82, y: 40, width: 36, height: 32 }, g);
  // safety glasses (thick black frame, clear lenses)
  el('rect', { x: 58, y: 96, width: 36, height: 24, rx: 8, fill: 'rgba(200,230,255,.35)', stroke: '#1a1a1a', 'stroke-width': 5 }, g);
  el('rect', { x: 106, y: 96, width: 36, height: 24, rx: 8, fill: 'rgba(200,230,255,.35)', stroke: '#1a1a1a', 'stroke-width': 5 }, g);
  el('path', { d: 'M94,106 h12 M58,104 l-14,-6 M142,104 l14,-6', stroke: '#1a1a1a', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  // salute: a flat glove resting on the brim of the hard hat
  if (mood === 'salute') {
    el('rect', { x: 140, y: 82, width: 34, height: 15, rx: 7, fill: '#d9dde3', stroke: '#b5bac4', 'stroke-width': 2, transform: 'rotate(-28 157 89)' }, g);
    el('path', { d: 'M146,86 l22,-11', stroke: '#c0c5ce', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
  }
  // eyes behind the lenses
  [76, 124].forEach(cx => {
    if (mood === 'dead') {                                         // lights out: crossed eyes
      el('path', { d: `M${cx - 8},101 l16,14 M${cx + 8},101 l-16,14`, stroke: '#2E2E2E', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, g);
    }
    else if (happy) el('path', { d: `M${cx - 9},111 q9,-12 18,0`, stroke: '#2E2E2E', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
    else if (mood === 'shock') { el('circle', { cx, cy: 108, r: 9, fill: '#fff', stroke: '#2E2E2E', 'stroke-width': 2 }, g); el('circle', { cx, cy: 108, r: 3, fill: '#2E2E2E' }, g); }
    else { el('circle', { cx, cy: 108, r: 8, fill: '#3b2a1a' }, g); el('circle', { cx: cx + 3, cy: 105, r: 2.6, fill: '#fff' }, g); }
  });
  if (mood === 'dead') {                                          // little open mouth and a tongue
    el('ellipse', { cx: 100, cy: 134, rx: 11, ry: 9, fill: '#2E2E2E' }, g);
    el('path', { d: 'M100,140 q7,10 -2,14', stroke: '#ff7a8a', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, g);
  }
  else if (mood === 'cheer') el('path', { d: 'M86,130 q14,22 28,0 z', fill: '#2E2E2E' }, g);
  else if (mood === 'salute') el('path', { d: 'M84,130 q16,16 32,0', stroke: '#2E2E2E', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, g);   // proud grin
  else if (mood === 'shock') { el('ellipse', { cx: 100, cy: 136, rx: 9, ry: 12, fill: '#2E2E2E' }, g); el('text', { x: 158, y: 60, 'font-size': 30, 'font-weight': 900, fill: '#EF4444', 'font-family': 'Bangers, Impact, sans-serif', text: '!!' }, g); }
  else el('path', { d: 'M88,132 q12,12 24,0', stroke: '#2E2E2E', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
}

/* ---------- player sprites: the mascot rasterized once per mood for the canvas ----------
   SVG drawn as an <img> may not reference external files, so the logo is inlined as a data URL first. */
function buildMascotSprites(done) {
  const moods = ['idle', 'shock', 'cheer', 'dead'];
  const make = logoData => {
    const out = {};
    let left = moods.length;
    for (const mood of moods) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('xmlns', SVG_NS);
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      svg.setAttribute('width', '200'); svg.setAttribute('height', '232');
      renderMascot(mood, svg, logoData, false, mood !== 'cheer');   // in-game character: hands down (cheer keeps the arms up)
      if (!logoData) svg.querySelectorAll('image').forEach(i => i.remove());
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = img.onerror = () => { URL.revokeObjectURL(url); if (--left === 0) done(out); };
      img.src = url;
      out[mood] = img;
    }
  };
  const logo = new Image();
  logo.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = 96; c.height = 96;
      c.getContext('2d').drawImage(logo, 0, 0, 96, 96);
      make(c.toDataURL('image/png'));
    } catch (e) { make(null); }          // file:// canvases are tainted — just draw without the badge
  };
  logo.onerror = () => make(null);
  logo.src = 'images/logo.png';
}

/* Indirect hints — cryptic nudges that point in a direction without naming the trap or the move. */
const HINTS = {
  bulb:      ['Some things up high were not meant to stay there.', 'The ceiling has opinions about where you stand.', 'Not everything that hangs, hangs forever.'],
  idle:      ['Rest is a luxury this place does not offer.', 'The longer you think, the closer it gets.'],
  surprise:  ['Empty air is rarely as empty as it looks.', 'Some places hum before they bite. Listen.', 'Patience sees what haste walks into.'],
  zap:       ['Everything here breathes in and out. Even the dangerous things.', 'Red is a warning, not a suggestion.'],
  battery:   ['Whatever rolls downhill would love to meet you.', 'Something is on its way. The floor is not the only path.', 'Round things travel. Feet leave the ground.'],
  crusher:   ['Heavy things prefer company.', 'The sky is not a safe place to ignore.', 'Sometimes the smartest step is no step at all.'],
  vanish:    ['Not every floor keeps its promises.', 'Flicker means goodbye.', 'Trust the ground less. Move more.'],
  floorDrop: ['Pressing things has consequences for the ground.', 'What you switched on may switch something off beneath you.'],
  pool:      ['The blue glow is pretty. Admire it from above.', 'Some gaps are wider than your confidence.', 'Water and volts were never friends.'],
  spikes:    ['Sharp things do not read signs. Neither should you, fully.', 'Pointy is sometimes real. Learn which.'],
  fakeExit:  ['Doors lie. Not all of them, but enough.', 'The obvious way out is rarely the way out.'],
  fall:      ['Edges do not forgive hesitation.', 'The gap did not move. Your timing did.', 'Gravity took the win this round.'],
  mover:     ['Things that move have a rhythm. Find it.', 'Ride, wait, then commit.'],
  static:    ['In some places, your instincts work against you.', 'When the world feels backwards, so are you.'],
  magnet:    ['Something is pulling. Pull back harder.', 'The floor is not the only thing dragging you down.'],
  barrier:   ['That wall answers to a button. Not a nearby one.', 'The way forward starts by going back.', 'Something far from here decides if this opens.'],
  gate:      ['Not every button is your friend.', 'Something opens that. Something else does not.'],
  popSpikes: ['The floor was calm. Was.', 'Some ground has teeth. Listen for the click.', 'Standing on it is a choice. So is leaving.'],
  shifter:   ['Not every floor stays where you left it.', 'The ground moved. It does that here.', 'Trust, then a shudder, then air.'],
  default:   ['This place is built to surprise you. Expect it.', 'The route you took is not the only one.', 'Watch first. Walk second.']
};
function hintFor(cause) {
  const list = HINTS[cause] || HINTS.default;
  return list[Math.floor(Math.random() * list.length)];
}
