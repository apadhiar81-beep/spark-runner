window.addEventListener(“load”, function() {

/* roundRect polyfill — iOS Safari <16 doesn’t support it */
function rrect(c, x, y, w, h, r) {
r = Math.min(r, w/2, h/2);
c.beginPath();
c.moveTo(x+r, y);
c.lineTo(x+w-r, y);
c.arcTo(x+w, y, x+w, y+r, r);
c.lineTo(x+w, y+h-r);
c.arcTo(x+w, y+h, x+w-r, y+h, r);
c.lineTo(x+r, y+h);
c.arcTo(x, y+h, x, y+h-r, r);
c.lineTo(x, y+r);
c.arcTo(x, y, x+r, y, r);
c.closePath();
}

/* ═══════════════════════════════════════
CONSTANTS & CONFIG
═══════════════════════════════════════ */
const W = Math.min(window.innerWidth, 480);
const H = window.innerHeight;
const GROUND_Y = H - Math.round(H * 0.17);
const HERO_X = Math.round(W * 0.19);
// Size canvases to actual screen
[‘gameCanvas’,‘titleCanvas’].forEach(id=>{
const c=document.getElementById(id);
c.width=W; c.height=H;
c.style.width=W+‘px’; c.style.height=H+‘px’;
});

const BIOMES = {
rocket: { name:“ROCKET MODE”, emoji:“🚀”, color:”#ff6b6b”, sky1:”#1a0505”, sky2:”#2d0a0a”, ground:”#3d1010”, accent:”#ff4444”, speed:8,   label:“⚡ ROCKET”, particleColor:”#ff6b6b” },
buzz:   { name:“BUZZING”,     emoji:“⚡”, color:”#fbbf24”, sky1:”#1a1000”, sky2:”#2a1800”, ground:”#3a2000”, accent:”#f59e0b”, speed:6.5, label:“⚡ BUZZ”,   particleColor:”#fbbf24” },
flow:   { name:“IN THE FLOW”, emoji:“🌊”, color:”#2de8cc”, sky1:”#041218”, sky2:”#04101a”, ground:”#0a2030”, accent:”#0891b2”, speed:5,   label:“🌊 FLOW”,   particleColor:”#2de8cc” },
foggy:  { name:“FOGGY”,       emoji:“🌫️”, color:”#94a3b8”, sky1:”#0a0c10”, sky2:”#0d1018”, ground:”#1a1e28”, accent:”#475569”, speed:3.5, label:“🌫 FOGGY”,  particleColor:”#94a3b8” },
stuck:  { name:“STUCK”,       emoji:“🪨”, color:”#a78bfa”, sky1:”#0a0414”, sky2:”#120820”, ground:”#1e1040”, accent:”#6d28d9”, speed:2.5, label:“🪨 STUCK”,  particleColor:”#a78bfa” },
};

const SNAP_WORDS = {
high:   [{word:“ELECTRIC”,   state:“rocket”},{word:“HYPER”,     state:“rocket”},{word:“UNSTOPPABLE”,state:“rocket”},
{word:“BUZZING”,    state:“buzz”},  {word:“WIRED”,     state:“buzz”},  {word:“FIRED UP”,  state:“buzz”},
{word:“FOCUSED”,    state:“flow”},  {word:“GOOD”,      state:“flow”},  {word:“CALM”,      state:“flow”},
{word:“FOGGY”,      state:“foggy”}, {word:“TIRED”,     state:“foggy”}, {word:“FROZEN”,    state:“stuck”}],
mid:    [{word:“ANXIOUS”,    state:“buzz”},  {word:“RESTLESS”,  state:“buzz”},  {word:“READY”,     state:“flow”},
{word:“OKAY”,       state:“flow”},  {word:“SLOW”,      state:“foggy”}, {word:“FLAT”,      state:“stuck”}],
};

const INSIGHTS = {
rocket: “Your brain was in ROCKET MODE — high energy, fast reactions. Your hero crashed because speed without control is tough. Next run: can you notice when you’re moving TOO fast?”,
buzz:   “You were BUZZING — your hero had great speed but needed more focus at the obstacles. Try the breathing gate next time to sharpen your reactions.”,
flow:   “You were IN THE FLOW — that’s your power zone. When you feel like this, your brain performs best. Remember this feeling.”,
foggy:  “You were FOGGY this run — and your hero felt it too. That’s okay. Even foggy days teach you something. What would help you get to FLOW?”,
stuck:  “You were STUCK — and that takes real courage to still play. Your hero kept running even when it felt impossible. So did you.”,
};

/* ═══════════════════════════════════════
GAME STATE
═══════════════════════════════════════ */
let state = {
screen: “title”,
biome: “flow”,
xp: 0,
sessionXP: 0,
score: 0,
distance: 0,
checkpointDist: 400,
nextCheckpoint: 400,
lastSnap: null,
speed: 5,
running: false,
snapCount: 0,
};

/* ═══════════════════════════════════════
CANVAS SETUP
═══════════════════════════════════════ */
const canvas = document.getElementById(“gameCanvas”);
const ctx = canvas.getContext(“2d”);

/* ═══════════════════════════════════════
HERO
═══════════════════════════════════════ */
const hero = {
x: HERO_X, y: GROUND_Y - 60,
vy: 0, vx: 0,
w: 36, h: 56,
onGround: true,
jumping: false,
sliding: false,
slideTimer: 0,
trailParticles: [],
frameTimer: 0,
frame: 0,
crashed: false,
invincible: 0,
jumpCount: 0,

jump() {
if (this.jumpCount < 2 && !this.crashed) {
this.vy = -16;
this.onGround = false;
this.jumping = true;
this.jumpCount++;
spawnJumpBurst(this.x + this.w/2, this.y);
}
},

slide() {
if (!this.onGround || this.crashed) return;
this.sliding = true;
this.slideTimer = 40;
},

update() {
if (this.crashed) return;
this.vy += 0.7;
this.y += this.vy;

```
if (this.y >= GROUND_Y - this.h) {
  this.y = GROUND_Y - this.h;
  this.vy = 0;
  this.onGround = true;
  this.jumping = false;
  this.jumpCount = 0;
} else {
  this.onGround = false;
}

if (this.sliding) {
  this.slideTimer--;
  if (this.slideTimer <= 0) this.sliding = false;
}

if (this.invincible > 0) this.invincible--;

// Trail
const biome = BIOMES[state.biome];
this.trailParticles.push({
  x: this.x + (this.sliding ? this.w : 4),
  y: this.y + (this.sliding ? this.h*0.7 : this.h*0.4),
  life: 18, maxLife: 18,
  color: biome.particleColor,
  vx: -(state.speed * 0.3 + Math.random()*1.5),
  vy: (Math.random()-0.5) * 1.5,
  r: Math.random()*5+3,
});

this.trailParticles = this.trailParticles
  .map(p => ({...p, x:p.x+p.vx, y:p.y+p.vy, life:p.life-1}))
  .filter(p => p.life > 0);

this.frameTimer++;
if (this.frameTimer > 6) { this.frame = (this.frame+1)%4; this.frameTimer=0; }
```

},

draw(ctx) {
const biome = BIOMES[state.biome];
const blink = this.invincible > 0 && Math.floor(this.invincible/4)%2===0;
if (blink) return;

```
// Trail particles
this.trailParticles.forEach(p => {
  const a = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = a * 0.7;
  ctx.fillStyle = p.color;
  ctx.shadowBlur = 10;
  ctx.shadowColor = p.color;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.r * a, p.r * 0.5 * a, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
});

const hx = this.x, hy = this.sliding ? this.y + this.h*0.4 : this.y;
const hh = this.sliding ? this.h*0.6 : this.h;
const hw = this.w;

ctx.save();
ctx.shadowBlur = 20;
ctx.shadowColor = biome.color;

// Body
ctx.fillStyle = biome.color;
ctx.beginPath();
rrect(ctx, hx+4, hy+18, hw-8, hh-18, 6);
ctx.fill();

// Cape / lightning trail
ctx.fillStyle = biome.color + "80";
ctx.beginPath();
if (!this.sliding) {
  ctx.moveTo(hx, hy+20);
  ctx.lineTo(hx-20-this.frame*2, hy+28);
  ctx.lineTo(hx-12, hy+38);
  ctx.lineTo(hx, hy+35);
}
ctx.closePath();
ctx.fill();

// Helmet
ctx.fillStyle = "#0d1535";
ctx.beginPath();
ctx.ellipse(hx+hw/2, hy+12, hw/2-2, 14, 0, 0, Math.PI*2);
ctx.fill();

// Visor
ctx.fillStyle = biome.color;
ctx.globalAlpha = 0.9;
ctx.beginPath();
ctx.ellipse(hx+hw/2, hy+13, hw/2-6, 9, 0, 0, Math.PI*2);
ctx.fill();
ctx.globalAlpha = 1;

// Eyes glow
ctx.fillStyle = "#fff";
ctx.shadowBlur = 8;
ctx.shadowColor = "#fff";
ctx.fillRect(hx+hw/2-8, hy+10, 5, 4);
ctx.fillRect(hx+hw/2+3, hy+10, 5, 4);

// Lightning bolt on chest
ctx.fillStyle = "#fff";
ctx.shadowBlur = 12;
ctx.shadowColor = "#fbbf24";
ctx.beginPath();
ctx.moveTo(hx+hw/2, hy+24);
ctx.lineTo(hx+hw/2-5, hy+32);
ctx.lineTo(hx+hw/2-1, hy+32);
ctx.lineTo(hx+hw/2-3, hy+42);
ctx.lineTo(hx+hw/2+6, hy+30);
ctx.lineTo(hx+hw/2+2, hy+30);
ctx.lineTo(hx+hw/2+5, hy+24);
ctx.closePath();
ctx.fill();

// Legs (running animation)
if (!this.sliding) {
  const legOffset = Math.sin(this.frame * 1.6) * 8;
  ctx.fillStyle = biome.color;
  ctx.shadowBlur = 0;
  ctx.fillRect(hx+4, hy+hh-16, 10, 16+legOffset);
  ctx.fillRect(hx+hw-14, hy+hh-16, 10, 16-legOffset);
}

ctx.restore();

// Speed lines when fast
if (state.speed > 6) {
  ctx.save();
  ctx.strokeStyle = biome.color;
  ctx.globalAlpha = (state.speed - 6) / 6 * 0.4;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const ly = hy + 10 + i * 10;
    const len = 20 + i * 8;
    ctx.beginPath();
    ctx.moveTo(hx - len, ly);
    ctx.lineTo(hx - 5, ly);
    ctx.stroke();
  }
  ctx.restore();
}
```

},

getHitbox() {
const sh = this.sliding ? this.h*0.6 : this.h;
const sy = this.sliding ? this.y + this.h*0.4 : this.y;
return { x:this.x+6, y:sy+4, w:this.w-12, h:sh-8 };
}
};

/* ═══════════════════════════════════════
OBSTACLES
═══════════════════════════════════════ */
let obstacles = [];
let obstacleCooldown = 0;

const OBS_TYPES = [
{ type:“spike”,  w:28, h:32, color:”#ff4444” },
{ type:“wall”,   w:20, h:65, color:”#6b7fa8” },
{ type:“laser”,  w:0,  h:22, color:”#ff6b6b”, isLaser:true },
{ type:“float”,  w:32, h:28, color:”#fbbf24”, isFloat:true },
{ type:“double”, w:22, h:48, color:”#a78bfa”, isDouble:true },
];

function spawnObstacle() {
if (obstacleCooldown > 0) { obstacleCooldown–; return; }
obstacleCooldown = 90 + Math.floor(Math.random() * 70);

let typePool;
if      (state.distance < 300) typePool = [0,0,1,1];
else if (state.distance < 700) typePool = [0,0,1,1,3];
else                           typePool = [0,1,1,2,3,4];

const idx = typePool[Math.floor(Math.random()*typePool.length)];
const t   = OBS_TYPES[idx];
const obs = { …t, x: W + 30 };

if (obs.isLaser) {
obs.w        = W;
obs.y        = GROUND_Y - 85;
obs.warnTimer = 90;
} else if (obs.isFloat) {
obs.y = GROUND_Y - 110;
} else if (obs.isDouble) {
obs.y  = GROUND_Y - obs.h;
obs.x2 = W + 90;
} else {
obs.y = GROUND_Y - obs.h;
}
obstacles.push(obs);
}

/* ═══════════════════════════════════════
PARTICLES / EFFECTS
═══════════════════════════════════════ */
let particles = [];
let burstParticles = [];
let groundParticles = [];

function spawnJumpBurst(x, y) {
const biome = BIOMES[state.biome];
for (let i = 0; i < 12; i++) {
const angle = (Math.PI * 2 / 12) * i;
burstParticles.push({
x, y, life: 20, maxLife: 20,
vx: Math.cos(angle) * (3 + Math.random()*3),
vy: Math.sin(angle) * (3 + Math.random()*3),
color: biome.color, r: 3 + Math.random()*3,
});
}
}

function spawnCrashBurst(x, y) {
for (let i = 0; i < 30; i++) {
const angle = Math.random() * Math.PI * 2;
burstParticles.push({
x, y, life: 40, maxLife: 40,
vx: Math.cos(angle) * (2 + Math.random()*8),
vy: Math.sin(angle) * (2 + Math.random()*8) - 3,
color: [”#ff6b6b”,”#fbbf24”,”#fff”][Math.floor(Math.random()*3)],
r: 4 + Math.random()*6,
});
}
}

/* ═══════════════════════════════════════
BACKGROUND LAYERS
═══════════════════════════════════════ */
let bgLayers = [
{ x:0, speed:0.3, elements:[] },
{ x:0, speed:0.6, elements:[] },
{ x:0, speed:1.2, elements:[] },
];

function initBGLayers() {
bgLayers[0].elements = Array.from({length:30}, ()=>({x:Math.random()*W*2,y:Math.random()*(H-200),r:Math.random()*1.5+0.5,opacity:Math.random()*0.5+0.2}));
bgLayers[1].elements = Array.from({length:12}, ()=>({x:Math.random()*W*2,y:50+Math.random()*(H-300),w:Math.random()*80+20,h:Math.random()*40+10,opacity:Math.random()*0.15+0.05}));
bgLayers[2].elements = Array.from({length:8}, ()=>({x:Math.random()*W*2,y:Math.random()*(H-400)+50,w:Math.random()*30+8,h:Math.random()*200+50,opacity:Math.random()*0.1+0.03}));
}

/* ═══════════════════════════════════════
GROUND TILES
═══════════════════════════════════════ */
let groundX = 0;

/* ═══════════════════════════════════════
CHECKPOINT GATE
═══════════════════════════════════════ */
let gate = null;
let gateTimer = 0;

function spawnGate() {
gate = { x: W + 60, triggered: false };
}

/* ═══════════════════════════════════════
DRAW FUNCTIONS
═══════════════════════════════════════ */
function drawBackground() {
const biome = BIOMES[state.biome];

// Sky gradient
const grad = ctx.createLinearGradient(0, 0, 0, H);
grad.addColorStop(0, biome.sky1);
grad.addColorStop(0.6, biome.sky2);
grad.addColorStop(1, biome.ground);
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

// Stars (layer 0)
bgLayers[0].elements.forEach(s => {
const sx = ((s.x - bgLayers[0].x * s.opacity * 200) % (W * 1.5) + W * 1.5) % (W * 1.5);
ctx.save();
ctx.globalAlpha = s.opacity;
ctx.fillStyle = “#fff”;
ctx.beginPath();
ctx.arc(sx, s.y, s.r, 0, Math.PI*2);
ctx.fill();
ctx.restore();
});

// Mid clouds (layer 1)
bgLayers[1].elements.forEach(c => {
const cx = ((c.x - bgLayers[1].x * 80) % (W * 2) + W * 2) % (W * 2);
ctx.save();
ctx.globalAlpha = c.opacity;
ctx.fillStyle = biome.color;
ctx.filter = “blur(8px)”;
ctx.fillRect(cx, c.y, c.w, c.h);
ctx.restore();
});

// Near structures (layer 2)
bgLayers[2].elements.forEach(b => {
const bx = ((b.x - bgLayers[2].x * 160) % (W * 2) + W * 2) % (W * 2);
ctx.save();
ctx.globalAlpha = b.opacity;
ctx.fillStyle = biome.accent;
ctx.fillRect(bx, H - 120 - b.h, b.w, b.h);
ctx.restore();
});
}

function drawGround() {
const biome = BIOMES[state.biome];
groundX = (groundX - state.speed) % 60;

// Ground base
ctx.fillStyle = biome.ground;
ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

// Ground line
ctx.strokeStyle = biome.color + “40”;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(0, GROUND_Y);
ctx.lineTo(W, GROUND_Y);
ctx.stroke();

// Ground tiles
ctx.strokeStyle = biome.color + “20”;
ctx.lineWidth = 1;
for (let x = groundX; x < W; x += 60) {
ctx.beginPath();
ctx.moveTo(x, GROUND_Y);
ctx.lineTo(x, H);
ctx.stroke();
}

// Ground glow
const gg = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 30);
gg.addColorStop(0, biome.color + “30”);
gg.addColorStop(1, “transparent”);
ctx.fillStyle = gg;
ctx.fillRect(0, GROUND_Y, W, 30);
}

function drawObstacles() {
const biome = BIOMES[state.biome];

obstacles.forEach(obs => {
ctx.save();
ctx.shadowBlur = 15;
ctx.shadowColor = obs.color;

```
if (obs.isLaser) {
  if (obs.warnTimer > 0) {
    // Warning flash
    const alpha = (obs.warnTimer % 16 < 8) ? 0.8 : 0.2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 13px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("⚠ DUCK! ⚠", W/2, obs.y - 12);
    ctx.fillStyle = obs.color + "40";
    ctx.fillRect(0, obs.y, W, obs.h);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = obs.color;
    ctx.fillRect(0, obs.y, W, obs.h);
    // Laser core
    const lg = ctx.createLinearGradient(0, obs.y, 0, obs.y+obs.h);
    lg.addColorStop(0, "#fff");
    lg.addColorStop(0.5, obs.color);
    lg.addColorStop(1, "#fff");
    ctx.fillStyle = lg;
    ctx.fillRect(0, obs.y + obs.h/2 - 2, W, 4);
  }
} else if (obs.type === "spike") {
  ctx.fillStyle = obs.color;
  const n = 3;
  for (let i = 0; i < n; i++) {
    const sx = obs.x + i * (obs.w/n);
    ctx.beginPath();
    ctx.moveTo(sx, obs.y + obs.h);
    ctx.lineTo(sx + obs.w/(n*2), obs.y);
    ctx.lineTo(sx + obs.w/n, obs.y + obs.h);
    ctx.closePath();
    ctx.fill();
  }
} else {
  ctx.fillStyle = obs.color + "dd";
  ctx.beginPath();
  rrect(ctx, obs.x, obs.y, obs.w, obs.h, 4);
  ctx.fill();
  // Glow edge
  ctx.strokeStyle = obs.color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

if (obs.isDouble) {
  ctx.fillStyle = obs.color + "dd";
  ctx.beginPath();
  rrect(ctx, obs.x2, obs.y, obs.w, obs.h, 4);
  ctx.fill();
}

ctx.restore();
```

});
}

function drawGate() {
if (!gate) return;
const biome = BIOMES[state.biome];
ctx.save();
// Portal frame
ctx.shadowBlur = 30;
ctx.shadowColor = “#2de8cc”;
ctx.strokeStyle = “#2de8cc”;
ctx.lineWidth = 4;
ctx.beginPath();
rrect(ctx, gate.x - 4, GROUND_Y - 130, 50, 130, 10);
ctx.stroke();

// Portal fill
const pg = ctx.createLinearGradient(gate.x, GROUND_Y-130, gate.x+42, GROUND_Y);
pg.addColorStop(0, “#2de8cc20”);
pg.addColorStop(0.5, “#2de8cc40”);
pg.addColorStop(1, “#2de8cc20”);
ctx.fillStyle = pg;
ctx.beginPath();
rrect(ctx, gate.x - 4, GROUND_Y - 130, 50, 130, 10);
ctx.fill();

// BREATHE text
ctx.fillStyle = “#2de8cc”;
ctx.shadowBlur = 10;
ctx.font = “bold 9px Orbitron”;
ctx.textAlign = “center”;
ctx.fillText(“WARP”, gate.x + 21, GROUND_Y - 80);
ctx.fillText(“GATE”, gate.x + 21, GROUND_Y - 65);

// ✦ icon
ctx.font = “22px sans-serif”;
ctx.fillText(“⚡”, gate.x + 18, GROUND_Y - 44);
ctx.restore();
}

function drawHints() {
// Always show control zones faintly at bottom
ctx.save();
ctx.globalAlpha = 0.07;
ctx.strokeStyle = “#ffffff”;
ctx.lineWidth = 1;
ctx.setLineDash([4,4]);
ctx.beginPath();
ctx.moveTo(W * 0.67, GROUND_Y + 10);
ctx.lineTo(W * 0.67, H);
ctx.stroke();
ctx.setLineDash([]);
ctx.restore();

ctx.save();
ctx.globalAlpha = Math.max(0, Math.min(0.5, (200 - state.distance) / 200));
ctx.fillStyle = “#ffffff”;
ctx.font = “bold 13px Orbitron”;
ctx.textAlign = “center”;
ctx.fillText(“TAP LEFT = JUMP”, W * 0.33, H - 20);
ctx.fillText(“TAP RIGHT = SLIDE”, W * 0.83, H - 20);
ctx.restore();
}

function drawBurstParticles() {
burstParticles = burstParticles.map(p => ({
…p, x:p.x+p.vx, y:p.y+p.vy, vy:p.vy+0.3, life:p.life-1
})).filter(p=>p.life>0);

burstParticles.forEach(p => {
const a = p.life / p.maxLife;
ctx.save();
ctx.globalAlpha = a;
ctx.fillStyle = p.color;
ctx.shadowBlur = 8;
ctx.shadowColor = p.color;
ctx.beginPath();
ctx.arc(p.x, p.y, p.r * a, 0, Math.PI*2);
ctx.fill();
ctx.restore();
});
}

function drawDistanceMarker() {
ctx.save();
ctx.fillStyle = “rgba(0,0,0,0.4)”;
ctx.beginPath();
rrect(ctx, W/2 - 50, 48, 100, 22, 8);
ctx.fill();
ctx.fillStyle = “#fff”;
ctx.font = “bold 12px Orbitron”;
ctx.textAlign = “center”;
ctx.fillText(`${Math.floor(state.distance)}m`, W/2, 63);
ctx.restore();
}

/* ═══════════════════════════════════════
COLLISION
═══════════════════════════════════════ */
function checkCollisions() {
if (hero.invincible > 0 || hero.crashed) return;
const hb = hero.getHitbox();

for (const obs of obstacles) {
if (obs.isLaser && obs.warnTimer > 0) continue;

```
let hit = false;
if (obs.isLaser) {
  hit = hb.y + hb.h > obs.y && hb.y < obs.y + obs.h;
} else {
  hit = hb.x < obs.x + obs.w && hb.x + hb.w > obs.x &&
        hb.y < obs.y + obs.h && hb.y + hb.h > obs.y;
  if (!hit && obs.isDouble) {
    hit = hb.x < obs.x2 + obs.w && hb.x + hb.w > obs.x2 &&
          hb.y < obs.y + obs.h && hb.y + hb.h > obs.y;
  }
}

if (hit) {
  spawnCrashBurst(hero.x + hero.w/2, hero.y + hero.h/2);
  hero.crashed = true;
  setTimeout(()=>triggerGameOver(), 800);
  return;
}
```

}

// Gate collision
if (gate && !gate.triggered) {
if (hero.x + hero.w > gate.x && hero.x < gate.x + 42) {
gate.triggered = true;
triggerBreatheGate();
}
}
}

/* ═══════════════════════════════════════
GAME LOOP
═══════════════════════════════════════ */
let lastTime = 0;
let animId = null;

// continued in p2.js
