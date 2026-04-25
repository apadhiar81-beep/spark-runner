// continued from p1.js

function gameLoop(ts) {
if (!state.running) return;
try {
const dt = Math.min((ts - lastTime) / 16.67, 3);
lastTime = ts;

const biome = BIOMES[state.biome];

// Speed ramp
state.speed = Math.min(biome.speed + state.distance * 0.003, biome.speed * 1.8);

// Move obstacles
obstacles.forEach(obs => {
obs.x -= state.speed;
if (obs.isDouble) obs.x2 -= state.speed;
if (obs.isLaser && obs.warnTimer > 0) obs.warnTimer–;
});
obstacles = obstacles.filter(obs => obs.x > -60);

// Move gate
if (gate) {
gate.x -= state.speed;
if (gate.x < -60) gate = null;
}

// Scroll BG
bgLayers.forEach((l,i) => l.x += [0.003, 0.008, 0.015][i] * state.speed);

// Distance
state.distance += state.speed * 0.05;

// Checkpoint
if (state.distance >= state.nextCheckpoint && !gate) {
state.nextCheckpoint += state.checkpointDist;
state.checkpointDist = Math.max(200, state.checkpointDist - 20);
state.snapCount++;

```
if (state.snapCount % 2 === 0) {
  spawnGate();
} else {
  pauseForSnap();
  return;
}
```

}

spawnObstacle();
hero.update();
checkCollisions();

// Draw
ctx.clearRect(0, 0, W, H);
drawBackground();
drawGround();
drawGate();
drawObstacles();
drawBurstParticles();
hero.draw(ctx);
drawDistanceMarker();
drawHints();

// Update HUD
document.getElementById(“hudScore”).textContent = `${Math.floor(state.distance)}m`;
document.getElementById(“hudXP”).textContent = `⚡ ${state.xp + state.sessionXP} XP`;
state.sessionXP = Math.floor(state.distance * 0.5 + (state.snapCount * 15));

animId = requestAnimationFrame(gameLoop);
} catch(e) { console.error(‘Loop:’,e.message); }
}

/* ═══════════════════════════════════════
SNAP ASSESSMENT
═══════════════════════════════════════ */
let snapTimerInterval = null;
let snapTimeLeft = 5;

function pauseForSnap() {
state.running = false;
if (animId) cancelAnimationFrame(animId);
showScreen(“snapScreen”);
runSnapAssessment();
}

function runSnapAssessment() {
const words = […SNAP_WORDS.high, …SNAP_WORDS.mid];
const shuffled = words.sort(()=>Math.random()-0.5).slice(0, 8);

const container = document.getElementById(“snapWords”);
container.innerHTML = “”;
shuffled.forEach(item => {
const btn = document.createElement(“button”);
btn.className = “snap-word”;
btn.textContent = item.word;
btn.onclick = () => handleSnapSelect(item, btn);
container.appendChild(btn);
});

snapTimeLeft = 6;
const fill = document.getElementById(“snapTimerFill”);
fill.style.width = “100%”;
fill.style.transition = “none”;

clearInterval(snapTimerInterval);
snapTimerInterval = setInterval(() => {
snapTimeLeft -= 0.1;
const pct = Math.max(0, (snapTimeLeft / 6) * 100);
fill.style.transition = “width 0.1s linear”;
fill.style.width = pct + “%”;
if (snapTimeLeft <= 0) {
clearInterval(snapTimerInterval);
// Auto-select random if no pick
applySnapResult(“flow”);
}
}, 100);
}

function handleSnapSelect(item, btn) {
clearInterval(snapTimerInterval);
btn.style.background = BIOMES[item.state].color + “40”;
btn.style.borderColor = BIOMES[item.state].color;
btn.style.transform = “scale(1.12)”;
state.lastSnap = item.state;
setTimeout(()=>applySnapResult(item.state), 600);
}

function applySnapResult(snapState) {
state.lastSnap = snapState;

// Adapt biome based on snap
const adaptMap = {
rocket: “flow”,   // too high → bring to flow
buzz:   “flow”,   // still high → bring to flow
flow:   “flow”,   // perfect → stay
foggy:  “buzz”,   // low → boost
stuck:  “buzz”,   // stuck → boost
};
state.biome = adaptMap[snapState] || “flow”;

// Update HUD state indicator
const hudState = document.getElementById(“hudState”);
const biome = BIOMES[state.biome];
hudState.textContent = biome.label;
hudState.style.background = biome.color + “30”;
hudState.style.color = biome.color;
hudState.style.border = `1px solid ${biome.color}50`;

resumeGame();
}

/* ═══════════════════════════════════════
BREATHE GATE
═══════════════════════════════════════ */
let breatheInterval = null;
let breathePhaseIdx = 0;
let breatheCount = 4;
let breatheCyclesDone = 0;
const BREATHE_PHASES = [
{label:“BREATHE IN”, color:”#2de8cc”, dur:4},
{label:“HOLD”,       color:”#fbbf24”, dur:4},
{label:“BREATHE OUT”,color:”#818cf8”, dur:4},
{label:“HOLD”,       color:”#38bdf8”, dur:2},
];

function triggerBreatheGate() {
state.running = false;
if (animId) cancelAnimationFrame(animId);
showScreen(“breatheScreen”);
startBreathe();
}

function startBreathe() {
breathePhaseIdx = 0;
breatheCyclesDone = 0;
breatheCount = BREATHE_PHASES[0].dur;
updateBreatheUI();

const ring = document.getElementById(“breatheRing”);
ring.style.boxShadow = `0 0 60px #2de8cc60`;
ring.style.border = `3px solid #2de8cc`;
ring.style.background = `radial-gradient(circle, #2de8cc15, transparent)`;

const dots = document.getElementById(“breatheDots”);
dots.innerHTML = “”;
for (let i = 0; i < 3; i++) {
const d = document.createElement(“div”);
d.id = `bdot${i}`;
d.style.cssText = `width:12px;height:12px;border-radius:50%;background:#111828;border:2px solid #2de8cc40;transition:background .3s;`;
dots.appendChild(d);
}

clearInterval(breatheInterval);
breatheInterval = setInterval(tickBreathe, 1000);
}

function tickBreathe() {
breatheCount–;
if (breatheCount <= 0) {
breathePhaseIdx = (breathePhaseIdx + 1) % BREATHE_PHASES.length;
if (breathePhaseIdx === 0) {
breatheCyclesDone++;
document.getElementById(`bdot${Math.min(breatheCyclesDone-1,2)}`).style.background = “#2de8cc”;
if (breatheCyclesDone >= 3) {
clearInterval(breatheInterval);
addSessionXP(30);
showToast(“🌊 +30 XP — Breathe complete!”);
setTimeout(resumeGame, 800);
return;
}
}
breatheCount = BREATHE_PHASES[breathePhaseIdx].dur;
updateBreatheUI();
} else {
document.getElementById(“breatheCount”).textContent = breatheCount;
}
}

function updateBreatheUI() {
const ph = BREATHE_PHASES[breathePhaseIdx];
document.getElementById(“breatheCount”).textContent = breatheCount;
document.getElementById(“breathePhase”).textContent = ph.label;
document.getElementById(“breathePhase”).style.color = ph.color;
const ring = document.getElementById(“breatheRing”);
ring.style.border = `3px solid ${ph.color}`;
ring.style.boxShadow = `0 0 60px ${ph.color}40`;
ring.style.transform = breathePhaseIdx === 0 || breathePhaseIdx === 1 ? “scale(1.15)” : “scale(1)”;
ring.style.transition = `transform ${ph.dur}s ease, border .5s, box-shadow .5s`;
}

/* ═══════════════════════════════════════
/* ═══════════════════════════════════════
CRASH CHECK-IN — 3 STEP FLOW
═══════════════════════════════════════ */
function triggerGameOver() {
state.running = false;
if (animId) cancelAnimationFrame(animId);
const earned = Math.floor(state.distance * 0.5 + state.snapCount * 15);
state.xp += earned;
state._crashEarned = earned;
showScreen(“gameoverScreen”);
showCrashStep1();
}

function showCrashStep1() {
var msgs = {
rocket:“You were moving FAST — sometimes the engine outruns the brakes.”,
buzz:“Lots of energy this run. Hard to slow down when buzzing.”,
flow:“Even in flow state, obstacles catch us. That’s okay.”,
foggy:“Running foggy is hard. You still made it this far.”,
stuck:“Starting when stuck takes courage. You showed up.”
};
var bs = state.lastSnap || “flow”;
var box = document.getElementById(“crashContent”);
box.innerHTML =
‘<div style="font-size:72px">💥</div>’ +
‘<div style="font-family:Orbitron,sans-serif;font-size:26px;font-weight:900;color:#ff6b6b">YOU CRASHED</div>’ +
‘<div style="font-size:13px;color:#6b7fa8;max-width:280px;line-height:1.7">’ + Math.floor(state.distance) + ‘m · +’ + state._crashEarned + ’ XP — ’ + msgs[bs] + ‘</div>’ +
‘<div style="background:#111828;border-radius:20px;padding:18px;max-width:290px;border:1px solid #ffffff15;margin:4px 0">’ +
‘<div style="font-family:Orbitron,sans-serif;font-size:10px;color:#fbbf24;letter-spacing:3px;margin-bottom:10px">BEFORE YOU RUN AGAIN</div>’ +
‘<div style="font-size:14px;color:#e8f0ff;line-height:1.8">Crashes happen to everyone.<br>Let's check in with your brain first.</div>’ +
‘</div>’ +
‘<button id="goCheckInBtn" style="background:linear-gradient(135deg,#38bdf8,#818cf8);border:none;border-radius:16px;color:#fff;font-family:Orbitron,sans-serif;font-size:15px;font-weight:700;padding:16px 40px;cursor:pointer;width:100%;max-width:280px">CHECK IN 🧠</button>’;
document.getElementById(“goCheckInBtn”).onclick = showCrashStep2;
}

function showCrashStep2() {
var allWords = [
{word:“ELECTRIC”,state:“rocket”},{word:“HYPER”,state:“rocket”},{word:“WIRED”,state:“buzz”},
{word:“BUZZING”,state:“buzz”},{word:“FIRED UP”,state:“buzz”},{word:“FOCUSED”,state:“flow”},
{word:“CALM”,state:“flow”},{word:“GOOD”,state:“flow”},{word:“ANXIOUS”,state:“buzz”},
{word:“FOGGY”,state:“foggy”},{word:“TIRED”,state:“foggy”},{word:“FLAT”,state:“stuck”},
{word:“FROZEN”,state:“stuck”},{word:“OKAY”,state:“flow”},{word:“RESTLESS”,state:“buzz”}
];
var picked = allWords.sort(function(){return Math.random()-0.5;}).slice(0,9);
var box = document.getElementById(“crashContent”);
box.innerHTML =
‘<div style="font-family:Orbitron,sans-serif;font-size:12px;color:#fbbf24;letter-spacing:4px">RIGHT NOW I FEEL…</div>’ +
‘<div style="font-size:13px;color:#6b7fa8;margin-bottom:4px">Tap the word that fits</div>’ +
‘<div id="wordGrid" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:340px"></div>’;
var grid = document.getElementById(“wordGrid”);
picked.forEach(function(item) {
var btn = document.createElement(“button”);
btn.textContent = item.word;
btn.style.cssText = “background:#111828;border:2px solid #ffffff25;border-radius:99px;color:#e8f0ff;font-family:Orbitron,sans-serif;font-size:13px;font-weight:700;padding:14px 18px;cursor:pointer;min-width:100px;”;
btn.onclick = function(){ showCrashStep3(item); };
grid.appendChild(btn);
});
}

function showCrashStep3(item) {
state.lastSnap = item.state;
var biome = BIOMES[item.state];
var adaptMap = {rocket:“flow”,buzz:“flow”,flow:“flow”,foggy:“buzz”,stuck:“buzz”};
state.biome = adaptMap[item.state] || “flow”;
var bonusXP = 25;
state.xp += bonusXP;
var box = document.getElementById(“crashContent”);
box.innerHTML =
‘<div style="font-size:52px">’ + biome.emoji + ‘</div>’ +
‘<div style="font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:' + biome.color + '">’ + biome.name + ‘</div>’ +
‘<div style="background:#111828;border-radius:20px;padding:18px;max-width:300px;border:1px solid #ffffff15;font-size:14px;color:#94a3b8;line-height:1.8">’ + INSIGHTS[item.state] + ‘</div>’ +
‘<div style="font-family:Orbitron,sans-serif;font-size:12px;color:#fbbf24">+’ + ((state._crashEarned||0)+bonusXP) + ’ XP · Check-in bonus +’ + bonusXP + ’ XP 🎉</div>’ +
‘<button id="goRetryBtn" style="background:linear-gradient(135deg,#38bdf8,#818cf8);border:none;border-radius:16px;color:#fff;font-family:Orbitron,sans-serif;font-size:15px;font-weight:700;padding:16px 40px;cursor:pointer;width:100%;max-width:280px">RUN AGAIN ⚡</button>’ +
‘<button id="goMenuBtn" style="background:transparent;border:2px solid #38bdf850;border-radius:12px;color:#38bdf8;font-family:Nunito,sans-serif;font-size:14px;font-weight:700;padding:10px 28px;cursor:pointer;width:100%;max-width:280px">Main Menu</button>’;
document.getElementById(“goRetryBtn”).onclick = function(){ startGame(); };
document.getElementById(“goMenuBtn”).onclick  = function(){ showScreen(“title”); document.getElementById(“hud”).classList.add(“hidden”); };
}

/* ═══════════════════════════════════════
GAME START / RESUME / RESET
function startGame() {
hero.x = HERO_X;
hero.y = GROUND_Y - hero.h;
hero.vy = 0; hero.vx = 0;
hero.onGround = true;
hero.jumping = false;
hero.sliding = false;
hero.crashed = false;
hero.invincible = 0;
hero.jumpCount = 0;
hero.trailParticles = [];

obstacles = [];
burstParticles = [];
obstacleCooldown = 150;
gate = null;

state.running = true;
state.distance = 0;
state.sessionXP = 0;
state.nextCheckpoint = 600;
state.checkpointDist = 500;
state.snapCount = 0;
state.lastSnap = null;
state.biome = “flow”;
state.speed = 5;

// Set initial HUD state
const hudState = document.getElementById(“hudState”);
hudState.textContent = “🌊 FLOW”;
hudState.style.color = “#2de8cc”;
hudState.style.background = “#2de8cc20”;
hudState.style.border = “1px solid #2de8cc40”;

showScreen(“game”);
document.getElementById(“hud”).classList.remove(“hidden”);

initBGLayers();
lastTime = performance.now();
animId = requestAnimationFrame(gameLoop);
}

function resumeGame() {
showScreen(“game”);
// Clear any obstacles that built up off-screen, give breathing room
obstacles = obstacles.filter(obs => obs.x > 0 && obs.x < W + 200);
obstacleCooldown = 100;
hero.invincible = 60;
state.running = true;
lastTime = performance.now();
animId = requestAnimationFrame(gameLoop);
}

function addSessionXP(amount) {
state.sessionXP += amount;
showFloatingXP(”+” + amount + “ XP”);
}

let toastTimeout = null;
function showToast(msg) {
let t = document.getElementById(“gameToast”);
if (!t) {
t = document.createElement(“div”);
t.id = “gameToast”;
t.style.cssText = `position:absolute;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#2de8cc,#818cf8);border-radius:99px;padding:8px 20px;font-family:Orbitron;font-size:12px;font-weight:700;color:#fff;z-index:50;pointer-events:none;white-space:nowrap;`;
document.getElementById(“app”).appendChild(t);
}
t.textContent = msg;
t.style.opacity = “1”;
clearTimeout(toastTimeout);
toastTimeout = setTimeout(()=>{ t.style.opacity=“0”; }, 2000);
}

function showFloatingXP(msg) {
const el = document.createElement(“div”);
el.style.cssText = `position:absolute;left:${W/2-30}px;top:${H/2}px;font-family:Orbitron;font-size:18px;color:#fbbf24;font-weight:900;pointer-events:none;z-index:50;animation:floatUp 1.2s ease forwards;`;
el.textContent = msg;
document.getElementById(“app”).appendChild(el);
setTimeout(()=>el.remove(), 1300);
}

/* ═══════════════════════════════════════
SCREEN MANAGEMENT
═══════════════════════════════════════ */
function showScreen(name) {
document.getElementById(“titleScreen”).classList.add(“hidden”);
document.getElementById(“snapScreen”).classList.add(“hidden”);
document.getElementById(“breatheScreen”).classList.add(“hidden”);
document.getElementById(“gameoverScreen”).classList.add(“hidden”);

if (name !== “game”) {
document.getElementById(name + “Screen”).classList.remove(“hidden”);
document.getElementById(“hud”).classList.add(“hidden”);
document.getElementById(“ctrlOverlay”).classList.add(“hidden”);
document.getElementById(“jumpBtn”).style.display = “none”;
document.getElementById(“slideBtn”).style.display = “none”;
} else {
document.getElementById(“hud”).classList.remove(“hidden”);
document.getElementById(“ctrlOverlay”).classList.remove(“hidden”);
document.getElementById(“jumpBtn”).style.display = “block”;
document.getElementById(“slideBtn”).style.display = “block”;
}
}

/* ═══════════════════════════════════════
TITLE SCREEN ANIMATION
═══════════════════════════════════════ */
const titleCanvas = document.getElementById(“titleCanvas”);
const tctx = titleCanvas.getContext(“2d”);
const titleStars = Array.from({length:150},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.3,twinkle:Math.random()*Math.PI*2,speed:Math.random()*0.02+0.01}));
const titleHero = {x:-60, y:GROUND_Y-80, vx:4};

function animateTitle() {
tctx.clearRect(0,0,W,H);

// BG
const grad = tctx.createLinearGradient(0,0,0,H);
grad.addColorStop(0,”#04060f”);
grad.addColorStop(0.5,”#040d1e”);
grad.addColorStop(1,”#040810”);
tctx.fillStyle = grad;
tctx.fillRect(0,0,W,H);

// Stars
titleStars.forEach(s=>{
s.twinkle += s.speed;
const a = 0.3 + Math.sin(s.twinkle)*0.4;
tctx.globalAlpha = a;
tctx.fillStyle = “#fff”;
tctx.beginPath();
tctx.arc(s.x,s.y,s.r,0,Math.PI*2);
tctx.fill();
tctx.globalAlpha = 1;
});

// Moving hero on title
titleHero.x += titleHero.vx;
if (titleHero.x > W + 60) titleHero.x = -60;

// Hero trail
tctx.save();
for(let i=0;i<8;i++){
const tx = titleHero.x - i*12;
tctx.globalAlpha = (1 - i/8) * 0.5;
tctx.fillStyle = “#38bdf8”;
tctx.shadowBlur = 10;
tctx.shadowColor = “#38bdf8”;
tctx.beginPath();
tctx.ellipse(tx+8, titleHero.y+28, 8-i, 4, 0, 0, Math.PI*2);
tctx.fill();
}

// Hero body
tctx.globalAlpha = 1;
tctx.fillStyle = “#38bdf8”;
tctx.shadowBlur = 25;
tctx.shadowColor = “#38bdf8”;
tctx.beginPath();
rrect(tctx, titleHero.x+4, titleHero.y+18, 28, 38, 5);
tctx.fill();
tctx.fillStyle = “#0d1535”;
tctx.beginPath();
tctx.ellipse(titleHero.x+18, titleHero.y+12, 14, 13, 0, 0, Math.PI*2);
tctx.fill();
tctx.fillStyle = “#38bdf8”;
tctx.beginPath();
tctx.ellipse(titleHero.x+18, titleHero.y+13, 10, 9, 0, 0, Math.PI*2);
tctx.fill();
// Lightning bolt
tctx.fillStyle = “#fff”;
tctx.shadowColor = “#fbbf24”;
tctx.beginPath();
tctx.moveTo(titleHero.x+18, titleHero.y+24);
tctx.lineTo(titleHero.x+13, titleHero.y+32);
tctx.lineTo(titleHero.x+17, titleHero.y+32);
tctx.lineTo(titleHero.x+15, titleHero.y+40);
tctx.lineTo(titleHero.x+22, titleHero.y+30);
tctx.lineTo(titleHero.x+18, titleHero.y+30);
tctx.lineTo(titleHero.x+21, titleHero.y+24);
tctx.closePath();
tctx.fill();
tctx.restore();

// Ground
tctx.strokeStyle = “#38bdf830”;
tctx.lineWidth = 2;
tctx.beginPath();
tctx.moveTo(0, GROUND_Y);
tctx.lineTo(W, GROUND_Y);
tctx.stroke();

requestAnimationFrame(animateTitle);
}
animateTitle();

/* ═══════════════════════════════════════
INPUT HANDLING — SIMPLE & RELIABLE
═══════════════════════════════════════ */

// Tap anywhere on left 2/3 = JUMP, right 1/3 = SLIDE
document.getElementById(“app”).addEventListener(“touchstart”, e=>{
if (!state.running) return;
e.preventDefault();
const x = e.touches[0].clientX;
const screenW = window.innerWidth;
if (x > screenW * 0.67) {
hero.slide();
} else {
hero.jump();
}
}, {passive:false});

// Keyboard fallback
document.addEventListener(“keydown”, e=>{
if (!state.running) return;
if (e.code===“Space”||e.code===“ArrowUp”) { e.preventDefault(); hero.jump(); }
if (e.code===“ArrowDown”) { e.preventDefault(); hero.slide(); }
});

/* ═══════════════════════════════════════

/* ═══════════════════════════════════════
BUTTON HANDLERS
═══════════════════════════════════════ */
document.getElementById(“startBtn”).onclick = function(){ startGame(); };
document.getElementById(“startBtn”).addEventListener(“touchend”, function(e){ e.preventDefault(); startGame(); }, {passive:false});
document.getElementById(“jumpBtn”).addEventListener(“touchstart”, function(e){ e.preventDefault(); if(state.running) hero.jump(); }, {passive:false});
document.getElementById(“slideBtn”).addEventListener(“touchstart”, function(e){ e.preventDefault(); if(state.running) hero.slide(); }, {passive:false});
document.getElementById(“howBtn”).onclick = function(){
alert(“SPARK RUNNER\n\nLEFT side = JUMP\nRIGHT side = SLIDE\n\nEvery 600m a snap check-in adapts your world.\nWARP GATES = breathing +30 XP.\nCrash = check in before running again.”);
};
document.getElementById(“breatheSkip”).onclick = function(){
clearInterval(breatheInterval);
showToast(“Skipped (-20 XP)”);
resumeGame();
};
/* ═══════════════════════════════════════
GLOBAL CSS ANIM INJECTION
═══════════════════════════════════════ */
const style = document.createElement(“style”);
style.textContent = `@keyframes floatUp { from { opacity:1; transform:translateY(0); } to   { opacity:0; transform:translateY(-60px); } } @keyframes crashBounce { 0%   { transform:scale(0.3) rotate(-20deg); opacity:0; } 60%  { transform:scale(1.2) rotate(10deg); opacity:1; } 100% { transform:scale(1) rotate(0deg); } }`;
document.head.appendChild(style);

});
