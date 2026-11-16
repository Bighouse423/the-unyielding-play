// ===== THE UNYIELDING — game logic =====
'use strict';
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; if (!isFinite(d)) return 0; if (d > Math.PI || d < -Math.PI) d -= TAU * Math.round(d / TAU); return d; };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const RGB = (r, g, b) => (b << 16) | (g << 8) | r;

// ---------- canvases ----------
const screen = document.getElementById('screen');
const sctx = screen.getContext('2d');
const low = document.createElement('canvas'); low.width = W; low.height = H;
const hud = document.createElement('canvas'); hud.width = W; hud.height = H;
const hctx = hud.getContext('2d');
let SCALE = 2;
function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  SCALE = Math.max(1, Math.floor(s * 1.0001)) || 1;
  const bs = Math.max(1, Math.floor(s)); // backing store scale
  screen.width = W * bs; screen.height = H * bs; SCALE = bs;
  screen.style.width = Math.floor(W * s) + 'px'; screen.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', resize);

// ---------- bitmap text ----------
const FONTC = {};
function fontTint(col) {
  if (FONTC[col]) return FONTC[col];
  const im = Engine.imgs.font8; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  FONTC[col] = c; return c;
}
function text(ctx, str, x, y, col = '#fff', align = 'left', sc = 1, shadow = '#1a0612') {
  str = String(str); const w = str.length * 8 * sc;
  let px = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? Math.round(x - w) : Math.round(x);
  y = Math.round(y);
  const draw = (fc, ox, oy) => { for (let i = 0; i < str.length; i++) { const k = str.charCodeAt(i) - 32; if (k <= 0 || k > 95) continue; ctx.drawImage(fc, k * 8, 0, 8, 8, px + i * 8 * sc + ox, y + oy, 8 * sc, 8 * sc); } };
  if (shadow) { const sf = fontTint(shadow); draw(sf, sc, sc); draw(sf, -1, 0); draw(sf, 0, -1); }
  draw(fontTint(col), 0, 0);
  return w;
}

// ---------- state ----------
const G = { hazards: [],
  state: 'loading', t: 0, time: 0, hitstop: 0, slow: 0, shake: 0, flashR: 0, flashG: 0, zoom: 0, roll: 0,
  enemies: [], particles: [], projectiles: [], pickups: [], props: [], dmgNums: [], toasts: [], screenBlood: [],
  boss: null, checkpoint: 0, kills: 0, totalEnemies: 0, lich: null, lichDone: false, ambushDone: false, bossPhase: 0,
  finisher: null, latchCenser: 0, censerSwing: 0, bigText: null, mouseLocked: false, paused: false, deaths: 0,
};
const P = {
  x: 0, y: 0, z: 0, vz: 0, vx: 0, vy: 0, ang: 0, pitch: 0, hp: 100, maxhp: 100, mana: 30, maxmana: 50,
  onGround: true, coyote: 0, jumpBuf: 0, iframes: 0, dodgeT: 0, dodgeAge: 9, dodgeCD: 0, ddx: 0, ddy: 0, punish: 0,
  shieldUp: false, shieldT: 0, raise: 0, blockShake: 0, parryFlash: 0, off: 'whip', swapT: 0, swapDur: 0.34, swapTo: null, swapLbl: 0, turnV: 0, sway: 0, swayY: 0, shieldKick: 0,
  sw: null, swQueued: false, comboT: 0, whip: null, pistol: null, bash: null,
  hasPistol: false, hasEdge: false, latch: null, bob: 0, bobAmt: 0, landDip: 0, landV: 0, hurtT: 0, eyeOff: 0,
  lastSafe: { x: 0, y: 0, z: 0 }, stepAcc: 0, kick: 0, falling: 0,
};

// ---------- input ----------
const K = {}; const KP = {}; let mouseDX = 0, mouseDY = 0; const MB = [false, false, false]; const MBP = [false, false, false];
const lastTap = { KeyA: 0, KeyD: 0, KeyW: 0, KeyS: 0 };
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.metaKey && e.code !== 'MetaLeft' && e.code !== 'MetaRight') { releaseAll(); return; }   // Cmd-shortcuts never become game input
  if (!K[e.code]) { KP[e.code] = true; if (e.code in lastTap) { const n = performance.now(); if (n - lastTap[e.code] < 240) KP['dbl' + e.code] = true; lastTap[e.code] = n; } }
  K[e.code] = true; SFX.init(); G.inputMode = 'kb';
});
addEventListener('wheel', e => { if (G.state === 'play' && !G.paused && Math.abs(e.deltaY) > 2) KP.Wheel = true; }, { passive: true });
// v2.7: never leave a key "held". macOS sends no keyup for keys released while Cmd is down, and focus/pointer-lock
// changes swallow keyups too, so drop every held key/button on any of those.
function releaseAll() { for (const k in K) K[k] = false; for (const k in KP) delete KP[k]; MB[0] = MB[1] = MB[2] = false; for (const k in lastTap) lastTap[k] = 0; if (typeof PAD !== 'undefined' && PAD.held) PAD.held.clear(); }
addEventListener('keyup', e => { K[e.code] = false; if (e.code === 'MetaLeft' || e.code === 'MetaRight' || e.key === 'Meta') releaseAll(); });
addEventListener('blur', () => { releaseAll(); if (G.state === 'play' && G.mouseLocked) G.paused = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
screen.addEventListener('mousedown', e => { SFX.init(); G.inputMode = 'kb'; MB[e.button] = true; MBP[e.button] = true; if (G.state === 'play' && !G.mouseLocked && screen.requestPointerLock) { try { const r = screen.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) {} } });
addEventListener('mouseup', e => { MB[e.button] = false; });
screen.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('contextmenu', e => { if (e.target !== screen) releaseAll(); });   // a real OS menu opened: its keyups never reach us
addEventListener('mousemove', e => { if (G.mouseLocked) { mouseDX += e.movementX; mouseDY += e.movementY; } });
document.addEventListener('pointerlockchange', () => {
  const was = G.mouseLocked; G.mouseLocked = document.pointerLockElement === screen;
  if (was && !G.mouseLocked) releaseAll();
  if (was && !G.mouseLocked && G.state === 'play') G.paused = true;
});

// ---------- enemy definitions ----------
const EDEF = {
  zombie:   { spr: 's_zombie', h: 1.3, hp: 40, speed: 1.15, range: 1.25, windup: 0.6, strike: 0.15, recover: 0.55, dmg: 10, mat: 'flesh', kbRes: 1, name: 'Rotting Zombie' },
  fzombie:  { spr: 's_fzombie', h: 1.22, hp: 28, speed: 3.8, range: 1.4, windup: 0.32, strike: 0.28, recover: 0.5, dmg: 9, mat: 'flesh', kbRes: 1.1, lunge: 6 },
  azombie:  { spr: 's_azombie', h: 1.6, hp: 120, speed: 0.85, range: 1.5, windup: 0.95, strike: 0.18, recover: 0.8, dmg: 22, mat: 'flesh', kbRes: 0.45, armor: 0.65 },
  skeleton: { spr: 's_skeleton', h: 1.42, hp: 55, speed: 1.9, range: 1.4, windup: 0.48, strike: 0.15, recover: 0.5, dmg: 12, mat: 'bone', kbRes: 0.9, shieldBlock: 0.4, reassemble: true },
  bat:      { spr: 's_bat', h: 0.5, hp: 14, speed: 3.4, range: 1.0, windup: 0.35, strike: 0.35, recover: 0.7, dmg: 6, mat: 'flesh', kbRes: 1.6, fly: 1.45 },
  imp:      { spr: 's_imp', h: 0.72, hp: 26, speed: 2.6, range: 8, windup: 0.6, strike: 0.1, recover: 1.5, dmg: 12, mat: 'imp', kbRes: 1.4, fly: 1.55, ranged: true, keep: 4.5 },
  ghost:    { spr: 's_ghost', h: 1.6, hp: 50, speed: 1.6, range: 1.2, windup: 0.6, strike: 0.25, recover: 0.9, dmg: 10, mat: 'ecto', kbRes: 0.6, fly: 0.25, phase: true, swordImmune: true },
  vknight:  { spr: 's_vknight', h: 2.5, hp: 1600, speed: 1.7, range: 2.7, windup: 0.75, strike: 0.2, recover: 0.7, dmg: 22, mat: 'flesh', kbRes: 0.08, boss: true },
};
const MAT = {
  flesh: [RGB(220, 10, 30), RGB(170, 0, 20), RGB(255, 40, 50), RGB(120, 0, 12), RGB(240, 70, 80)],
  bone: [RGB(200, 20, 30), RGB(140, 0, 20), RGB(235, 225, 200), RGB(220, 210, 190), RGB(255, 40, 50)],
  imp: [RGB(255, 60, 20), RGB(220, 20, 20), RGB(255, 140, 40), RGB(160, 0, 10), RGB(255, 200, 60)],
  ice: [RGB(220, 250, 255), RGB(150, 220, 255), RGB(90, 170, 240), RGB(255, 255, 255), RGB(60, 120, 220)],
  ecto: [RGB(140, 240, 255), RGB(90, 200, 255), RGB(220, 255, 255), RGB(120, 160, 255), RGB(180, 255, 240)],
};

function makeEnemy(type, x, y, opt = {}) {
  const d = Object.assign({}, EDEF[type]); const tx = Engine.tex[d.spr];
  const e = {
    type, d, x, y, z: d.fly ? d.fly : floorAt(x, y), vx: 0, vy: 0, kbx: 0, kby: 0, vz: 0,
    hp: d.hp, maxhp: d.hp, state: 'idle', st: 0, downT: 0, freezeT: 0, hurtMax: 0.3, t: Math.random() * 10, walk: Math.random() * 6, flash: 0, blood: 0,
    stagger: 0, stun: 0, hurtT: 0, cd: rand(0.3, 1.2), awake: false, alive: true, dead: false, deathT: 0, deathType: null,
    w: d.h * tx.w / tx.h, h: d.h, r: d.boss ? 0.85 : Math.min(0.42, d.h * tx.w / tx.h * 0.35), flip: Math.random() < 0.5, side: Math.random() < 0.5 ? 1 : -1,
    hidden: !!opt.ambush, ambush: !!opt.ambush, riseT: opt.rise ? 0 : 1, lockDx: 0, lockDy: 0, hitDone: false, reassembled: false, tint: null,
    atk: null, phase2: false, lastSeen: 0,
  };
  if (RUN.on && RUN.ready && !d.boss) e.hp = e.maxhp = Math.round(e.maxhp * RUN.cfg.hp);
  return e;
}

// ---------- particles ----------
const PCAP = 2600;
function addP(p) { if (G.particles.length > PCAP) G.particles.splice(0, 200); G.particles.push(p); return p; }
function spray(x, y, z, dx, dy, dz, n, spd, spread, mat = 'flesh', big = 1) {
  const cols = MAT[mat] || MAT.flesh;
  for (let i = 0; i < n; i++) {
    const s = spd * rand(0.35, 1.25);
    const a = Math.atan2(dy, dx) + rand(-spread, spread);
    const hl = Math.hypot(dx, dy);
    const up = dz + rand(-spread, spread) * 0.8;
    addP({ k: mat === 'ecto' ? 'ecto' : 'blood', x: x + rand(-0.05, 0.05), y: y + rand(-0.05, 0.05), z: z + rand(-0.08, 0.08), vx: Math.cos(a) * s * (hl > 0.01 ? 1 : rand(0, 1)), vy: Math.sin(a) * s * (hl > 0.01 ? 1 : rand(0, 1)), vz: up * s + rand(0, 2.2), size: rand(0.025, 0.07) * big, col: cols[(Math.random() * cols.length) | 0], life: rand(1.2, 2.4), mat });
  }
}
function gibs(x, y, z, n, mat = 'flesh', power = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(1.5, 4.5) * power;
    const tex = mat === 'stone' ? (Math.random() < 0.8 ? 'gibstone' : 'gibbone') : mat === 'bone' || (mat === 'flesh' && Math.random() < 0.2) ? 'gibbone' : mat === 'ecto' ? null : 'gib' + ((Math.random() * 4) | 0);
    if (!tex) { addP({ k: 'ecto', x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(1, 4), size: 0.09, col: MAT.ecto[i % 5], life: 1.5 }); continue; }
    addP({ k: 'gib', tex, x, y, z: z + rand(-0.2, 0.2), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(2, 6) * power, rot: rand(0, TAU), vr: rand(-15, 15), w: rand(0.13, 0.22), life: 30, rest: false, mat, bleed: mat !== 'bone' ? 1.2 : 0 });
  }
}
function sparks(x, y, z, n, col = RGB(255, 220, 90)) {
  for (let i = 0; i < n; i++) addP({ k: 'spark', x, y, z, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(-1, 4), size: 0.025, col, life: rand(0.15, 0.4) });
}
function dust(x, y, z, n) { for (let i = 0; i < n; i++) addP({ k: 'dust', x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: z + rand(0, 1.5), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(0.1, 0.8), size: rand(0.05, 0.12), col: RGB(200, 180, 170), life: rand(0.6, 1.4) }); }
function screenSplat(n, big = 1) {
  for (let i = 0; i < n; i++) G.screenBlood.push({ x: Math.random() < 0.7 ? (Math.random() < 0.5 ? rand(4, 120) : rand(W - 120, W - 4)) : rand(20, W - 20), y: rand(6, H - 70), r: rand(2, 7) * big, life: rand(1.4, 2.6), vy: rand(4, 18), drops: [] });
}

function updateParticles(dt) {
  const ps = G.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) { ps.splice(i, 1); continue; }
    if (p.k === 'impact') continue;
    if (p.k === 'mote') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; continue; }
    if (p.k === 'ember') { p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx += rand(-2, 2) * dt; continue; }
    if (p.k === 'spark' || p.k === 'dust' || p.k === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.k === 'spark') p.vz -= 9 * dt; continue; }
    if (p.k === 'gib' || p.k === 'piece') {
      if (p.rest) { if (p.life < 1 && p.k === 'gib') p.fade = p.life; continue; }
      p.vz -= 13 * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      const fl = floorAt(nx, ny);
      if (fl > p.z + 0.05) { // hit wall
        const ci = cellAt(nx, ny);
        if (p.bleed > 0) wallSplat(p.x, p.y, nx, ny, p.z, 0.12, 160, true);
        if (Math.floor(nx) !== Math.floor(p.x)) p.vx *= -0.4; else p.vy *= -0.4;
      } else { p.x = nx; p.y = ny; }
      p.z += p.vz * dt; p.rot += p.vr * dt;
      if (p.bleed > 0 && Math.random() < 0.5) { addP({ k: 'blood', x: p.x, y: p.y, z: p.z, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: 0, size: 0.03, col: MAT.flesh[(Math.random() * 3) | 0], life: 1, mat: 'flesh' }); p.bleed -= dt; }
      const g = floorAt(p.x, p.y);
      if (p.z <= g) {
        p.z = g;
        if (p.mat !== 'bone') paintFloor(p.x, p.y, p.k === 'piece' ? 0.3 : 0.12, 140);
        if (Math.abs(p.vz) > 1.6) { p.vz = -p.vz * 0.32; p.vx *= 0.55; p.vy *= 0.55; p.vr *= 0.5; if (p.k === 'gib' && Math.random() < 0.4) SFX.play('clink', 0.3); }
        else { p.rest = true; p.vz = 0; p.rot = p.k === 'piece' ? (Math.abs(Math.sin(p.rot)) > 0.5 ? Math.PI / 2 * Math.sign(Math.sin(p.rot)) : 0) : p.rot; }
      }
      continue;
    }
    // blood / ecto droplets
    p.vz -= 12 * dt;
    const ox = p.x, oy = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const g = floorAt(p.x, p.y);
    if (g > p.z) {
      // either entered a wall or a raised floor's side, or landed
      const og = floorAt(ox, oy);
      if (og <= p.z + 0.02 && (Math.floor(p.x) !== Math.floor(ox) || Math.floor(p.y) !== Math.floor(oy))) {
        if (p.k === 'blood') wallSplat(ox, oy, p.x, p.y, p.z, p.size * 1.6, rand(120, 220), Math.random() < 0.45);
      } else if (p.k === 'blood') paintFloor(p.x, p.y, p.size * 1.3, rand(110, 210));
      ps.splice(i, 1); continue;
    }
  }
}
function wallSplat(ox, oy, nx, ny, z, rad, amt, drip) {
  const cxo = Math.floor(ox), cyo = Math.floor(oy), cxn = Math.floor(nx), cyn = Math.floor(ny);
  const ci = cellAt(nx, ny); if (ci < 0) return;
  let face, u;
  if (cxn !== cxo) { face = cxn > cxo ? 0 : 1; u = ny - Math.floor(ny); }
  else if (cyn !== cyo) { face = cyn > cyo ? 2 : 3; u = nx - Math.floor(nx); }
  else return;
  paintWall(ci * 4 + face, u, z, rad, amt, drip);
}

// ---------- collision ----------
const PR = 0.24;
function blocked(x, y, z, r, step, flying) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) return true;
    const i = cy * MW + cx;
    if (SOLID[i]) return true;
    if (!flying && FH[i] > z + step) return true;
    if (flying && FH[i] > z - 0.1) return true;
  }
  return false;
}
function groundUnder(x, y, r) {
  let g = -99; const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const i = cy * MW + cx; if (i >= 0 && !SOLID[i] && FH[i] > g) g = FH[i]; }
  return g;
}
function losTo(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), n = Math.ceil(L * 4);
  for (let i = 1; i < n; i++) { const c = cellAt(x0 + dx * i / n, y0 + dy * i / n); if (c < 0 || SOLID[c]) return false; }
  return true;
}
function moveEntity(o, dx, dy, r, step, flying) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.12));
  let hit = false;
  for (let k = 0; k < n; k++) {
    const sx = dx / n, sy = dy / n;
    if (!blocked(o.x + sx, o.y, o.z, r, step, flying)) o.x += sx; else hit = true;
    if (!blocked(o.x, o.y + sy, o.z, r, step, flying)) o.y += sy; else hit = true;
  }
  return hit;
}

// ---------- flow field for ground enemies ----------
let FLOW = null, flowCell = -1, flowT = 0;
function updateFlow() {
  const pc = cellAt(P.x, P.y); if (pc === flowCell && flowT > 0) return; flowCell = pc; flowT = 0.4;
  FLOW = new Int16Array(MW * MH).fill(-1);
  const q = [pc]; FLOW[pc] = 0; let h = 0;
  while (h < q.length) {
    const c = q[h++]; const cx = c % MW, cy = (c / MW) | 0, d = FLOW[c];
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + ox, ny = cy + oy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const n = ny * MW + nx; if (FLOW[n] >= 0 || SOLID[n]) continue;
      if (Math.abs(FH[n] - FH[c]) > 0.35 && !(FH[c] > FH[n])) { if (FH[n] - FH[c] > 0.35) continue; }
      if (FH[n] < -1) continue;
      FLOW[n] = d + 1; q.push(n);
    }
  }
}

// ---------- toasts / numbers ----------
function toast(t1, t2 = '', col = '#ffe9a0', dur = 3.2) { G.toasts.push({ t1, t2, col, t: 0, dur }); if (G.toasts.length > 3) G.toasts.shift(); }
function dmgNum(x, y, z, txt, col = '#fff') { G.dmgNums.push({ x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z, txt: String(txt), col, t: 0 }); }

// ---------- player damage ----------
function hurtPlayer(dmg, srcx, srcy, opt = {}) {
  if (G.state !== 'play') return 'none';
  if (RUN.on) dmg = rogueEnemyDmg(dmg, opt);
  const prevHit = G.lastHit; G.lastHit = opt.src ? opt.src.type : opt.env ? 'chasm' : 'magic';
  const res = hurtPlayer0(dmg, srcx, srcy, opt);
  if (res !== 'hit' && res !== 'block') G.lastHit = prevHit;
  if (RUN.on) rogueAfterHurt(res, dmg, opt);
  return res;
}
function hurtPlayer0(dmg, srcx, srcy, opt) {
  const ang = Math.atan2(srcy - P.y, srcx - P.x);
  if (P.iframes > 0) {
    if (P.dodgeAge < 0.2 && !opt.nopd) { G.slow = 0.35; P.punish = 2.0; toast('PERFECT DODGE', 'Next strike deals double', '#ff6070', 1.4); SFX.play('glint'); }
    return 'dodged';
  }
  const facing = Math.abs(angDiff(ang, P.ang)) < 1.3;
  if (P.shieldUp && P.raise > 0.6 && facing && !opt.unblockable) {
    if (P.shieldT < 0.22 * (P.mods && P.mods.oath ? 1.5 : 1) && !opt.noparry) { // PARRY
      P.parryFlash = 1; P.shieldKick = 1; G.slow = 0.3; G.hitstop = 0.08; G.shake += 4; G.flashG = 0.5; rumbleFx('parry');
      SFX.play('parry'); sparks(P.x + Math.cos(P.ang) * 0.6, P.y + Math.sin(P.ang) * 0.6, P.z + 1.1, 26);
      P.mana = Math.min(P.maxmana, P.mana + 8);
      toast('PARRY!', opt.src && opt.src.alive ? 'Staggered - strike to FINISH' : '', '#fff2a0', 1.2);
      if (opt.src && opt.src.alive) { const e = opt.src; e.stagger = e.d.boss ? 2.2 : 1.8; e.state = 'stagger'; e.st = 0; e.atk = null; }
      return 'parry';
    }
    const dd = Math.ceil(dmg * (opt.blockMul || (P.mods && P.mods.oath ? 0.05 : 0.15)));
    P.hp -= dd; P.blockShake = 1; G.shake += 2.5; SFX.play('block'); rumbleFx('block');
    sparks(P.x + Math.cos(P.ang) * 0.6, P.y + Math.sin(P.ang) * 0.6, P.z + 1.0, 12);
    P.vx -= Math.cos(ang) * 3; P.vy -= Math.sin(ang) * 3;
    if (P.hp <= 0) playerDie();
    return 'block';
  }
  G.combo = 0; G.comboT = 0;
  rumbleFx(dmg >= 20 ? 'hurtBig' : 'hurt', Math.min(1, 0.6 + dmg / 40));
  P.hp -= dmg; P.hurtT = 0.4; G.flashR = Math.min(0.5, 0.22 + dmg / 60); G.shake += 3 + dmg / 6;
  P.vx -= Math.cos(ang) * 4; P.vy -= Math.sin(ang) * 4;
  SFX.play('hurt'); screenSplat(1 + (dmg / 10 | 0), 1);
  spray(P.x, P.y, P.z + 1.1, -Math.cos(ang), -Math.sin(ang), 0.4, 10 + dmg, 2.5, 0.8);
  if (P.hp <= 0) playerDie();
  return 'hit';
}
function playerDie() {
  RUN.cause = ({ alphawolf: 'THE ALPHA OF THE BLOOD MOON', matriarch: 'THE GARGOYLE MATRIARCH', werewolf: 'a Werewolf', gargoyle: 'a Gargoyle', colossus: 'THE OSSUARY COLOSSUS', spider: 'the Brood Mother', spiderling: 'a Crypt Spiderling', zombie: 'a Rotting Zombie', fzombie: 'a Ghoul Runner', azombie: 'an Armored Zombie', skeleton: 'a Skeleton Warrior', bat: 'a Vampire Bat', imp: 'an Imp', ghost: 'a Specter', vknight: 'THE VAMPIRE KNIGHT', chasm: 'the blood sea' })[G.lastHit] || 'dark magic';
  P.hp = 0; G.state = 'dead'; G.deadT = 0; G.deaths++; SFX.ev('player_death', 1, ['heavy']); SFX.play('heavy'); screenSplat(30, 1.6);
  if (document.exitPointerLock) document.exitPointerLock();
}

// ---------- damage to enemies ----------
function bleed(e, px, py, pz, dx, dy, dz, dmg, heavy) {
  const m = e.d.mat; const n = Math.min(120, (10 + dmg * 1.3) * (heavy ? 1.7 : 1)) | 0;
  spray(px, py, pz, dx, dy, dz, n, 3 + dmg / 12 + (heavy ? 2 : 0), heavy ? 0.7 : 0.45, m, heavy ? 1.3 : 1);
  spray(px, py, pz, -dx * 0.3, -dy * 0.3, 0.6, (n / 4) | 0, 1.8, 1.2, m);
  if (heavy && m !== 'ecto') gibs(px, py, pz, 1 + ((Math.random() * 2) | 0), m, 0.7);
  if (m !== 'ecto') {
    // splatter nearby walls & floor directly
    for (let i = 0; i < 3 + (heavy ? 4 : 0); i++) paintFloor(e.x + rand(-0.6, 0.6) + dx * 0.5, e.y + rand(-0.6, 0.6) + dy * 0.5, rand(0.08, 0.22), 170);
  }
}
function damageEnemy(e, dmg, o) {
  if (!e.alive) return;
  if (e.d.boss && (e.state === 'intro' || e.intangible)) return;
  if (RUN.on) dmg = rogueDmgIn(e, dmg, o);
  dmg = Math.round(dmg);
  if (o.dot) { dmg = Math.max(1, dmg); e.hp -= dmg; e.flash = Math.max(e.flash, 0.35); e.awake = true; e.blood = clamp(1 - e.hp / e.maxhp, 0, 1) * 0.95 + 0.08; if (Math.random() < 0.5) dmgNum(e.x, e.y, e.z + e.h + 0.1, dmg, o.col || '#ff9a30'); if (e.hp <= 0) killEnemy(e, o); return; }
  e.hp -= dmg; e.flash = 1; e.awake = true;
  if (o.src === 'whip') rumbleFx('tick', 2); else if (o.src !== 'pistol') rumbleFx(o.heavy ? 'swordHeavy' : 'sword');
  G.combo = (G.comboT > 0 ? G.combo : 0) + 1; G.comboT = 2.2; G.comboPop = 1;
  e.blood = clamp(1 - e.hp / e.maxhp, 0, 1) * 0.95 + 0.08;
  const dx = o.dx || 0, dy = o.dy || 0;
  const pz = e.z + e.h * (o.hz || 0.62);
  const px = e.x - Math.cos(P.ang) * e.r * 0.6, py = e.y - Math.sin(P.ang) * e.r * 0.6;
  bleed(e, px, py, pz, dx, dy, o.dz || 0.25, dmg, o.heavy);
  addP({ k: 'impact', x: px, y: py, z: pz, life: o.heavy ? 0.12 : 0.08, max: o.heavy ? 0.12 : 0.08, sz: o.heavy ? 1.3 : 0.8, col: e.d.mat === 'ecto' ? [120, 255, 200] : e.d.mat === 'bone' ? [255, 240, 200] : [255, 230, 210] });
  P.kick += o.heavy ? -9 : -4;
  if (o.src === 'sword' || o.src === 'finisher' || o.src === 'whip' || o.src === 'bash') {
    const mat = e.d.mat; const sc = mat === 'ecto' ? RGB(90, 255, 180) : mat === 'bone' ? RGB(255, 230, 170) : RGB(255, 200, 120);
    sparks(px, py, pz, o.heavy ? 10 : 6, sc); sparks(px, py, pz, o.heavy ? 5 : 3, Math.random() < 0.5 ? RGB(190, 110, 255) : RGB(90, 255, 160));
    if (!G.slashes) G.slashes = [];
    const st = P.sw ? P.sw.step : 0; const ang = o.src === 'whip' ? rand(-0.3, 0.3) : st === 0 ? -0.5 : st === 1 ? 0.5 : 1.35;
    G.slashes.push({ x: px, y: py, z: pz, ang: ang + rand(-0.15, 0.15), t: 0, dur: o.heavy ? 0.16 : 0.11, len: o.heavy ? 1.25 : 0.9, red: P.punish > 0 || mat === 'flesh', heavy: !!o.heavy });
  }
  const kb = (o.kb || 1.5) * e.d.kbRes;
  e.kbx += Math.cos(P.ang) * kb; e.kby += Math.sin(P.ang) * kb;
  G.hitstop = Math.max(G.hitstop, o.heavy ? 0.085 : 0.05); G.shake += o.heavy ? 4.5 : 2;
  dmgNum(e.x, e.y, e.z + e.h + 0.1, dmg, o.col || (o.heavy ? '#ffcf40' : '#ffffff'));
  SFX.play(o.heavy ? 'heavy' : 'hit');
  if (o.src === 'sword' || o.src === 'finisher') P.swordBlood = Math.min(1, P.swordBlood + (o.heavy ? 0.35 : 0.18));
  // hit reactions: everyone flinches; heavy hits / the whip knock ground enemies flat
  const big = o.heavy || o.src === 'whip';
  e.hurtT = e.d.boss ? (o.heavy ? 0.26 : 0.16) : (big ? 0.36 : 0.3); e.hurtMax = e.hurtT; e.hurtBig = big; e.hurtSide = Math.random() < 0.5 ? 1 : -1;
  if (!e.d.boss) e.freezeT = big ? 0.09 : 0.055; // per-enemy hit-freeze
  addP({ k: 'impact', x: px, y: py, z: pz, life: 0.12, max: 0.12, sz: big ? 1.0 : 0.7, col: e.d.mat === 'ecto' ? [80, 255, 180] : e.d.mat === 'bone' ? [255, 220, 170] : [220, 10, 30] });
  if (!e.d.boss && !e.d.fly && e.d.mat !== 'ecto') {
    if (e.state === 'windup' && !big && !o.interrupt) e.st = Math.max(0, e.st - 0.18); // light hits push the wind-up back
    if (big && e.hp > 0 && e.type !== 'azombie' && e.downT <= 0) { e.downT = o.src === 'whip' ? 0.9 : 1.15; e.downMax = e.downT; e.state = 'down'; e.st = 0; e.atk = null; e.vz = 2.2; e.z += 0.02; e.kbx *= 1.6; e.kby *= 1.6; }
    else if (big && e.type === 'azombie') e.hurtT = e.hurtMax = 0.42;
  }
  if (e.d.boss && e.hp > 0 && e.state !== 'stagger' && e.state !== 'rage') {
    e.poise = (e.poise || 0) + dmg * (o.heavy ? 1.3 : 1); e.pressure = (e.pressure || 0) + 1;
    if (e.poise > (e.phase2 ? 340 : 280) && e.state !== 'plunge') { e.poise = 0; e.stagger = 1.25; e.state = 'stagger'; e.st = 0; e.atk = null; G.slow = 0.35; SFX.play('roar', 0.6); toast('POSTURE BROKEN', 'Strike now!', '#ffd060', 1.2); }
  }
  if ((o.interrupt || o.heavy) && e.state === 'windup' && !e.d.boss) { e.state = 'stagger'; e.stagger = 1.0; e.st = 0; }
  if (o.interrupt && e.state === 'windup' && e.d.boss && e.atk === 'wave') { e.state = 'recover'; e.st = 0; }
  if (Math.hypot(e.x - P.x, e.y - P.y) < 1.5 && o.src !== 'whip' && e.d.mat !== 'ecto') screenSplat(o.heavy ? 3 : 1, 0.8);
  if (e.hp <= 0) { killEnemy(e, o); return; }
  if (RUN.on) rogueOnHit(e, o, dmg);
  if (!e.d.boss && e.hp < e.maxhp * 0.3 && e.stagger <= 0 && (o.heavy || Math.random() < 0.35)) { e.stagger = 1.5; e.state = 'stagger'; e.st = 0; }
}
function killEnemy(e, o) {
  e.alive = false; e.dead = true; e.deathT = 0; e.hp = 0; if (!e.summoned) G.kills++; G.killFlash = 1;
  if (RUN.on) rogueOnKill(e);
  if (o.src === 'burn' && !e.d.boss && !e.d.reassemble) o = Object.assign({}, o, { heavy: Math.random() < 0.5 });
  let type = o.finisher ? 'burst' : (o.heavy || o.src === 'pistol') ? (Math.random() < 0.4 || o.punish ? 'burst' : 'dismember') : 'collapse';
  if (e.type === 'bat' || e.type === 'imp' || e.type === 'gargoyle') type = o.finisher || o.heavy || Math.random() < 0.5 ? 'burst' : 'collapse';
  if (e.type === 'ghost') type = 'fade';
  if (e.d.reassemble && !e.reassembled && type !== 'burst') type = 'bones';
  if (e.d.boss) type = 'boss';
  e.deathType = type; e.deathSide = Math.random() < 0.5 ? 1 : -1;
  SFX.ev(e.d.boss ? 'boss_death' : 'death_' + (SFX.FAM[e.type] || '-'), 0.85, ['roar', 'ghost', 'rattle', 'screech', 'groan']);
  const cx = e.x, cy = e.y, cz = e.z + e.h * 0.55;
  const m = e.d.mat;
  if (type === 'burst') {
    spray(cx, cy, cz, 0, 0, 0.6, 110, 6, Math.PI, m, 1.5); gibs(cx, cy, cz, m === 'bone' ? 10 : 14, m, 1.2);
    if (m !== 'ecto') for (let i = 0; i < 10; i++) paintFloor(cx + rand(-1.2, 1.2), cy + rand(-1.2, 1.2), rand(0.15, 0.4), 200);
    SFX.play('gib'); G.shake += 6;
  } else if (type === 'dismember') {
    const dir = Math.atan2(e.y - P.y, e.x - P.x);
    const pc = (sub, w, h, z, sp, up) => addP({ k: 'piece', tex: e.d.spr, sub, x: cx, y: cy, z, vx: Math.cos(dir + rand(-0.6, 0.6)) * sp, vy: Math.sin(dir + rand(-0.6, 0.6)) * sp, vz: up, rot: 0, vr: rand(-9, 9), w, h, life: 40, rest: false, mat: m, bleed: 2.5 });
    pc([0, 0, 1, 0.42], e.w, e.h * 0.42, e.z + e.h * 0.58, rand(2.5, 4.5), rand(3, 5.5));
    if (Math.random() < 0.7) pc([0, 0.18, 0.38, 0.6], e.w * 0.38, e.h * 0.42, e.z + e.h * 0.45, rand(3, 5), rand(2, 4));
    e.sub = [0, 0.42, 1, 1]; e.subH = 0.58;
    spray(cx, cy, e.z + e.h * 0.6, 0, 0, 1.2, 70, 4.5, 0.9, m, 1.3); gibs(cx, cy, cz, 4, m);
    SFX.play('gib');
  } else if (type === 'fade') { spray(cx, cy, cz, 0, 0, 0.5, 60, 3, Math.PI, 'ecto'); SFX.play('ghost'); }
  else if (type === 'bones') { gibs(cx, cy, cz, 5, 'bone', 0.8); spray(cx, cy, cz, Math.cos(P.ang), Math.sin(P.ang), 0.4, 30, 3, 0.8, 'bone'); SFX.play('rattle'); e.reT = 4.5; }
  else if (type === 'boss') { e.bossDeath = 0; G.slow = 0.6; SFX.play('roar'); }
  else { spray(cx, cy, cz, Math.cos(P.ang), Math.sin(P.ang), 0.5, 40, 3.5, 0.7, m); }
  if (!e.d.boss && type !== 'bones') {
    P.mana = Math.min(P.maxmana, P.mana + 3);
    const r = Math.random();
    if (r < 0.16) G.pickups.push(mkPickup('vial', e.x, e.y)); else if (r < 0.34) G.pickups.push(mkPickup('mana', e.x, e.y));
  }
}

// ---------- pickups ----------
function mkPickup(type, x, y) { return { type, x, y, z: floorAt(x, y), t: Math.random() * 6, taken: false, vz: 2.5, drop: true }; }
const PICK = {
  vial: { tex: 'p_vial', h: 0.34, gc: [255, 40, 60], f(p) { if (P.hp >= P.maxhp) return false; P.hp = Math.min(P.maxhp, P.hp + 25); toast('+25 BLOOD VIAL', '', '#ff8090', 1.2); return true; } },
  rose: { tex: 'p_rose', h: 0.36, gc: [255, 40, 90], f(p) { if (P.hp >= P.maxhp) return false; P.hp = Math.min(P.maxhp, P.hp + 50); toast('+50 BLOOD ROSE', '', '#ff8090', 1.2); return true; } },
  mana: { tex: 'p_mana', h: 0.26, gc: [60, 140, 255], f(p) { if (P.mana >= P.maxmana) return false; P.mana = Math.min(P.maxmana, P.mana + 20); toast('+20 MANA', '', '#9fd0ff', 1.2); return true; } },
  chalice: { tex: 'p_chalice', h: 0.42, gc: [255, 200, 60], f(p) { P.maxhp += 25; P.hp = P.maxhp; toast('HOLY CHALICE', 'Max health +25', '#ffe080', 3); return true; } },
  shard: { tex: 'p_shard', h: 0.42, gc: [40, 255, 130], f(p) { P.maxmana += 25; P.mana = P.maxmana; toast('SOUL SHARD', 'Max mana +25', '#80ffb0', 3); return true; } },
  pistol: { tex: 'p_pistol', h: 0.3, gc: [255, 210, 90], f(p) { if (P.hasPistol) { P.maxmana += 10; P.mana = P.maxmana; toast('SIDEARM BLESSED', 'Max mana +10', '#ffe080', 3); return true; } P.hasPistol = true; P.mana = P.maxmana; toast('THE CONSECRATED SIDEARM', 'Press R to fire (8 mana a shot, hurts ghosts)', '#ffe080', 4.5); return true; } },
  blade: { tex: 'p_blade', h: 0.55, gc: [255, 60, 80], f(p) { if (P.hasEdge) { P.mods.sword += 0.1; toast("SAINT'S BLESSING", 'Sword damage +10%', '#ff9090', 3); return true; } P.hasEdge = true; toast("THE SAINT'S EDGE", 'Sword +40% damage and it cuts ghosts', '#ff9090', 4.5); return true; } },
  key: { tex: 'p_key', h: 0.55, gc: [255, 210, 60], f(p) { G.victoryAt = G.time + 1.2; toast(RUN.on ? 'A RELIQUARY KEY' : 'THE FIRST RELIQUARY KEY', RUN.on ? 'The way deeper opens...' : 'The Lich King will want this back.', '#ffe080', 4); return true; } },
};
function updatePickups(dt) {
  for (const p of G.pickups) {
    if (p.taken) continue; p.t += dt;
    if (p.drop) { p.vz -= 10 * dt; p.z += p.vz * dt; const g = floorAt(p.x, p.y); if (p.z <= g) { p.z = g; p.drop = false; } }
    if (Math.hypot(p.x - P.x, p.y - P.y) < 0.62 && Math.abs(p.z - P.z) < 1.1) {
      if (SFX.capRun(() => PICK[p.type].f(p), () => SFX.ev(SFX.PK[p.type] || '-', 0.85, ['pickup', 'glint', 'secret']))) { p.taken = true; SFX.play('pickup'); for (let i = 0; i < 14; i++) addP({ k: 'spark', x: p.x, y: p.y, z: p.z + 0.3, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: rand(1, 3), size: 0.03, col: RGB(255, 230, 120), life: 0.5 }); }
    }
  }
}

// ---------- doors & dynamic cells ----------
const DOORANIM = [];
function animCell(x, y, from, to, dur, after) { DOORANIM.push({ i: y * MW + x, x, y, from, to, dur, t: 0, after }); SOLID[y * MW + x] = 0; FH[y * MW + x] = from; }
function updateDoors(dt) {
  for (let k = DOORANIM.length - 1; k >= 0; k--) {
    const a = DOORANIM[k]; a.t += dt; const f = clamp(a.t / a.dur, 0, 1);
    FH[a.i] = lerp(a.from, a.to, ease(f));
    if (Math.random() < 0.5) dust(a.x + 0.5, a.y + 0.5, Math.max(0, FH[a.i]), 1);
    if (f >= 1) { DOORANIM.splice(k, 1); if (a.after) a.after(); }
  }
  if (LEVEL.kind === 'crypt') { cryptDoors(dt); return; }
  if (LEVEL.kind === 'hub') { hubTick(dt); return; }
  const D = LEVEL.doors;
  // iron one-way door (shortcut)
  if (!D.iron.open && P.x < 11.1 && P.x > 7 && Math.abs(P.y - 36.5) < 0.8) {
    D.iron.open = true; animCell(11, 36, 3.5, 0, 0.9, () => { WT[36 * MW + 11] = 0; }); SFX.ev('door', 1, ['stone']); SFX.play('stone'); toast('SHORTCUT OPENED', 'The barred door to the narthex swings free.', '#a0ffd0');
  }
  if (!D.iron.open && !D.iron.told && P.x < 13 && Math.abs(P.y - 36.5) < 0.9 && P.x > 11.5) { D.iron.told = true; toast('Barred from the other side.', '', '#c8b0c0', 2); }
  // boss gate
  const g = D.gate;
  if (g.state === 'closed' && P.y < 10.9 && P.y > 9.9 && G.boss && G.boss.alive) { g.state = 'open'; animCell(17, 9, 3.8, 0, 1.0); SFX.ev('door', 1, ['stone']); SFX.play('stone'); G.checkpoint = 1; toast('CHECKPOINT', 'The font of the transept glows.', '#a0ffd0', 2); }
  if (g.state === 'open' && P.y < 8.2 && G.boss && G.boss.alive) {
    g.state = 'sealed'; animCell(17, 9, 0, 3.8, 0.6, () => { SOLID[9 * MW + 17] = 1; FH[9 * MW + 17] = 99; });
    SFX.play('stone'); bossIntro();
  }
}
function openSecretWall(silent) {
  const D = LEVEL.doors.secret; if (D.open) return; D.open = true;
  animCell(7, 21, 3.8, 1.26, 1.4, () => { FT[21 * MW + 7] = 4; CH[21 * MW + 7] = 3.7; });
  SFX.ev('secret_wall', 1, ['stone']); SFX.play('stone'); G.shake += 3;
  if (!silent) toast('The saint lowers her hand...', 'The wall behind her slides away.', '#a0f0ff', 3);
}
function hitCracked(x, y) {
  const list = LEVEL.cracks || [LEVEL.doors.cracked];
  const D = list.find(c => !c.open && Math.floor(x) === c.x && Math.floor(y) === c.y); if (!D) return false;
  D.hp--; sparks(x, y, 1.2, 10, RGB(220, 200, 180)); dust(D.x + 0.5, D.y + 0.5, 0.5, 8); SFX.play(D.kind === 'skulls' ? 'rattle' : 'block', 0.6); G.shake += 2;
  if (D.hp <= 0 && D.ch) { const ci = D.y * MW + D.x; CH[ci] = D.ch; FT[ci] = 1; CT[ci] = 0; WT[ci] = 0; }
  if (D.hp <= 0) { D.open = true; animCell(D.x, D.y, D.from || D.ch || 3.8, 0, 0.45); SFX.ev('secret_wall', 1, ['stone']); SFX.play('stone'); G.shake += 5; for (let i = 0; i < 14; i++) addP({ k: 'gib', tex: 'gibbone', x: D.x + 0.5, y: D.y + 0.5, z: rand(0.3, 2), vx: rand(-3, -0.5), vy: rand(-2, 2), vz: rand(0, 3), rot: 0, vr: rand(-10, 10), w: 0.2, life: 20, rest: false, mat: 'bone', bleed: 0 }); toast('The wall crumbles!', '', '#e0d0c0', 2); }
  return true;
}

// ---------- hooks ----------
function aimVec() { const el = Math.atan(P.pitch / PROJ); return { x: Math.cos(P.ang) * Math.cos(el), y: Math.sin(P.ang) * Math.cos(el), z: Math.sin(el) }; }
function eyeZ() { return P.z + 0.62; }
function hookInAim() {
  const a = aimVec(); const ez = eyeZ();
  let best = null, bd = 1e9;
  for (const h of LEVEL.hooks) {
    if (h.used) continue;
    const dx = h.x - P.x, dy = h.y - P.y, dz = h.z - ez; const d = Math.hypot(dx, dy, dz);
    if (d > h.range || P.z < h.minZ) continue;
    const dot = (dx * a.x + dy * a.y + dz * a.z) / d;
    if (dot < 0.93) continue;
    if (!losTo(P.x, P.y, h.x - (h.id === 'halo' ? 0.1 : 0), h.y)) continue;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}
function triggerHook(h) {
  SFX.play('latch');
  if (h.id === 'halo') { h.used = true; sparks(h.x, h.y, h.z, 30); openSecretWall(); }
  if (h.id === 'censer') {
    G.censerSwing = 1.6;
    P.latch = { t: 0, dur: 0.85, x0: P.x, y0: P.y, z0: P.z, cx: h.x, cy: h.y, cz: h.z - 1.1, x1: h.land.x, y1: h.land.y, z1: h.land.z + 0.25 };
    P.vz = 0; G.zoom = 0.08; toast('LATCH!', '', '#ffe080', 0.8);
  }
}

// ---------- player attacks ----------
const ROLL_T = 0.3;
const SWING = [
  { dur: 0.30, hitAt: 0.40, dmg: 18, kb: 1.6, heavy: false, side: -1 },
  { dur: 0.30, hitAt: 0.40, dmg: 18, kb: 1.6, heavy: false, side: 1 },
  { dur: 0.44, hitAt: 0.48, dmg: 36, kb: 4.0, heavy: true, side: 0 },
];
function startSwap(to, dur = 0.34) {
  if (P.whip || P.latch || G.finisher) return;
  if ((P.swapTo || P.off) === to) return;
  if (P.swapT > 0 && P.swapTo) { // reverse mid-swap
    if (P.swapT > P.swapDur / 2) { P.swapTo = to === P.off ? null : to; if (!P.swapTo) P.swapT = 0; } else { P.swapTo = to; P.swapT = P.swapDur - P.swapT; }
    return;
  }
  P.swapTo = to; P.swapDur = dur; P.swapT = dur; P.shieldUp = false; SFX.play('swing', 0.35);
}
function startSword() {
  if (P.shieldUp && P.raise > 0.5) { if (!P.bash) { P.bash = { t: 0, done: false }; SFX.play('swingH'); } return; }
  if (P.whip || P.latch) return;
  const sw = P.sw;
  if (!sw) { const step = P.comboT > 0 ? (P.lastStep + 1) % 3 : 0; P.sw = { step, t: 0, done: false }; SFX.swing(step); }
  else if (sw.t > SWING[sw.step].dur * 0.2) P.swQueued = true;
}
function enemiesInArc(range, arc) {
  const out = [];
  for (const e of G.enemies) {
    if (!e.alive || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y; const d = Math.hypot(dx, dy) - e.r;
    if (d > range) continue;
    const a = Math.abs(angDiff(Math.atan2(dy, dx), P.ang));
    if (a > arc && !(d < 0.35 && a < 1.6)) continue;
    if (e.z > P.z + 2.0 || e.z + e.h < P.z - 0.1) continue;
    if (!losTo(P.x, P.y, e.x, e.y)) continue;
    out.push(e);
  }
  return out;
}
function swordHit(step) {
  const S = SWING[step]; const right = { x: -Math.sin(P.ang), y: Math.cos(P.ang) }; const fw = { x: Math.cos(P.ang), y: Math.sin(P.ang) };
  const sdx = S.side ? right.x * S.side + fw.x * 0.6 : fw.x, sdy = S.side ? right.y * S.side + fw.y * 0.6 : fw.y;
  // finisher check first
  const targets = enemiesInArc(1.75, 0.95);
  const st = targets.find(e => e.stagger > 0 && e.alive);
  if (st) { startFinisher(st); return; }
  let any = false;
  for (const e of targets) {
    any = true;
    let dmg = S.dmg * (P.hasEdge ? 1.4 : 1) * (P.punish > 0 ? 2 : 1) * P.mods.sword;
    if (P.wpn && P.wpn.sword === 'skull') dmg *= 1.4;
    if (P.wpn && typeof SWDMG !== 'undefined' && SWDMG[P.wpn.sword]) dmg *= SWDMG[P.wpn.sword];
    if (P.wpn && P.wpn.sword === 'rapier') { dmg *= 0.8; if (step === 2) { dmg *= 1.8; dmgNum(e.x, e.y, e.z + e.h + 0.55, 'CRIT', '#ff4060'); } }
    if (RUN.on) dmg = rogueSwordPre(e, dmg, step);
    if (e.d.swordImmune && !P.hasEdge) { dmg *= 0.3; dmgNum(e.x, e.y, e.z + e.h + 0.35, 'RESIST', '#80e0ff'); spray(e.x, e.y, e.z + e.h * 0.6, sdx, sdy, 0.2, 12, 2, 0.6, 'ecto'); SFX.play('ghost', 0.4); e.flash = Math.max(e.flash || 0, 0.5); }   // specters: steel barely bites (30%); whip, shots or the Saint's Edge hurt fully
    if (e.d.shieldBlock && step < 2 && e.stagger <= 0 && e.state !== 'windup' && Math.random() < e.d.shieldBlock) {
      dmgNum(e.x, e.y, e.z + e.h, 'BLOCKED', '#c0c0d0'); sparks(e.x - fw.x * 0.3, e.y - fw.y * 0.3, e.z + e.h * 0.6, 14); SFX.play('block', 0.8); e.kbx += fw.x * 1.2; e.kby += fw.y * 1.2; G.hitstop = 0.04; G.shake += 1.5; continue;
    }
    if (e.d.armor) { dmg *= e.d.armor; sparks(e.x - fw.x * 0.3, e.y - fw.y * 0.3, e.z + e.h * 0.6, 6); }
    damageEnemy(e, dmg, { dx: sdx, dy: sdy, dz: step === 2 ? -0.2 : 0.3, kb: S.kb, heavy: S.heavy || P.punish > 0, src: 'sword', col: P.punish > 0 ? '#ff5060' : undefined });
  }
  if (P.punish > 0 && any) P.punish = 0;
  // bonepiles
  for (const e of G.enemies) if (e.dead && e.deathType === 'bones' && e.reT > 0 && Math.hypot(e.x - P.x, e.y - P.y) < 1.8) { e.reT = -1; e.deathType = 'shattered'; gibs(e.x, e.y, e.z + 0.2, 8, 'bone', 1); SFX.play('rattle'); dmgNum(e.x, e.y, e.z + 0.5, 'SHATTERED', '#e0d8c0'); }
  // walls
  const hx = P.x + fw.x * 1.0, hy = P.y + fw.y * 1.0;
  if (!any) { const c = cellAt(hx, hy); if (c >= 0 && SOLID[c]) { if (!hitCracked(hx, hy)) { sparks(P.x + fw.x * 0.7, P.y + fw.y * 0.7, eyeZ() - 0.2, 6); SFX.play('clink', 0.6); } } }
}
function startFinisher(e) {
  G.finisher = { e, t: 0, dur: 0.62, done: false, sx: P.x, sy: P.y };
  e.frozen = true; G.slow = 0.6; SFX.play('glint'); G.zoom = 0.12; rumbleFx('finisher');
  toast('FINISHER', '', '#ff3040', 1.0);
}
function updateFinisher(dt) {
  const F = G.finisher; if (!F) return;
  F.t += dt; const e = F.e;
  const ang = Math.atan2(e.y - F.sy, e.x - F.sx); P.ang = P.ang + angDiff(ang, P.ang) * Math.min(1, dt * 18);
  const k = Math.min(1, F.t / 0.18); const tx = e.x - Math.cos(ang) * (e.r + 0.55), ty = e.y - Math.sin(ang) * (e.r + 0.55);
  const nx = lerp(F.sx, tx, ease(k)), ny = lerp(F.sy, ty, ease(k));
  if (!blocked(nx, ny, P.z, PR, 0.32)) { P.x = nx; P.y = ny; }
  if (!F.done && F.t > 0.26) {
    F.done = true; e.frozen = false;
    G.hitstop = 0.14; G.shake += 9; G.flashR = 0.25; SFX.play('finisher'); screenSplat(14, 1.4);
    const fw = { x: Math.cos(P.ang), y: Math.sin(P.ang) };
    spray(e.x, e.y, e.z + e.h * 0.6, fw.x, fw.y, 0.8, 100, 7, 0.6, e.d.mat, 1.5);
    spray(e.x, e.y, e.z + e.h * 0.6, -fw.x, -fw.y, 0.8, 50, 4, 0.8, e.d.mat, 1.2);
    for (let i = 0; i < 8; i++) wallSplatNear(e.x, e.y, e.z + e.h * 0.5);
    P.hp = Math.min(P.maxhp, P.hp + 12); P.mana = Math.min(P.maxmana, P.mana + 10);
    if (e.d.boss) { e.stagger = 0; e.state = 'recover'; e.st = 0; damageEnemy(e, 150, { dx: fw.x, dy: fw.y, dz: 0.5, kb: 3, heavy: true, src: 'finisher', col: '#ff3040' }); gibs(e.x, e.y, e.z + 1.4, 6, 'flesh', 1); }
    else { e.stagger = 0; damageEnemy(e, 9999, { dx: fw.x, dy: fw.y, dz: 0.5, kb: 3, heavy: true, finisher: true, src: 'finisher', col: '#ff3040' }); }
    dmgNum(e.x, e.y, e.z + e.h + 0.4, '+12 HP', '#ff8090');
  }
  if (F.t >= F.dur) { G.finisher = null; P.sw = null; P.comboT = 0; }
}
function wallSplatNear(x, y, z) {
  const a = rand(0, TAU); for (let d = 0.2; d < 2.5; d += 0.1) {
    const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d; const c = cellAt(nx, ny);
    if (c < 0 || SOLID[c] || FH[c] > z) { wallSplat(x + Math.cos(a) * (d - 0.1), y + Math.sin(a) * (d - 0.1), nx, ny, z + rand(-0.4, 0.6), rand(0.15, 0.35), 220, true); return; }
  }
}
function rayMarch(maxD) {
  const a = aimVec(); let x = P.x, y = P.y, z = eyeZ();
  for (let d = 0; d < maxD; d += 0.05) {
    const nx = P.x + a.x * d, ny = P.y + a.y * d, nz = eyeZ() + a.z * d;
    const c = cellAt(nx, ny);
    if (c < 0 || SOLID[c] || FH[c] > nz || CH[c] < nz) return { x: nx, y: ny, z: nz, d, wall: true, px: x, py: y };
    x = nx; y = ny; z = nz;
  }
  return { x, y, z, d: maxD, wall: false };
}
function enemiesOnRay(maxD, rad) {
  const a = aimVec(); const ez = eyeZ(); const out = [];
  for (const e of G.enemies) {
    if (!e.alive || e.hidden) continue;
    const cx = e.x - P.x, cy = e.y - P.y, cz = e.z + e.h * 0.55 - ez;
    const t = cx * a.x + cy * a.y + cz * a.z; if (t < 0 || t > maxD) continue;
    const px = cx - a.x * t, py = cy - a.y * t, pz = cz - a.z * t;
    if (Math.hypot(px, py) > e.r + rad || Math.abs(pz) > e.h * 0.5 + rad) continue;
    if (!losTo(P.x, P.y, e.x, e.y)) continue;
    out.push({ e, t });
  }
  return out.sort((a, b) => a.t - b.t);
}
function startWhip() {
  if (P.whip || P.sw || P.latch || (P.shieldUp && P.raise > 0.4)) return;
  const h = hookInAim();
  P.whip = { t: 0, done: false, hook: h, tx: null };
  SFX.play('whip');
}
function whipResolve() {
  const W_ = P.whip; const a = aimVec(); rumbleFx('whip');
  if (W_.hook) { W_.tgt = { x: W_.hook.x, y: W_.hook.y, z: W_.hook.z }; triggerHook(W_.hook); return; }
  const CHAIN = P.wpn && P.wpn.whip === 'chain'; const R = CHAIN ? 6.2 : 4.8; const wall = rayMarch(R);
  const hits = enemiesOnRay(Math.min(R, wall.d + 0.3), CHAIN ? 0.5 : 0.4).slice(0, CHAIN ? 3 : 2);
  W_.tgt = { x: wall.x, y: wall.y, z: wall.z };
  if (hits.length) {
    const e = hits[0].e; W_.tgt = { x: e.x, y: e.y, z: e.z + e.h * 0.55 };
    for (const { e } of hits) {
      const bonus = (e.type === 'bat' || e.type === 'imp') ? 1.6 : 1;
      damageEnemy(e, 13 * bonus * (P.punish > 0 ? 2 : 1) * P.mods.whip, { dx: a.x, dy: a.y, dz: 0.3, kb: 0.6, heavy: false, interrupt: true, src: 'whip', col: P.wpn.whip === 'fire' ? '#ffa040' : CHAIN ? '#ff6070' : '#ffd0a0' });
      e.stun = 0.45 + P.mods.stun;
      if (e.d.fly && e.alive && !e.d.boss) { e.kbx -= a.x * 3.5; e.kby -= a.y * 3.5; }
    }
    if (P.punish > 0) P.punish = 0;
  } else if (wall.wall) {
    if (!hitCracked(wall.x, wall.y)) sparks(wall.px || wall.x, wall.py || wall.y, wall.z, 8);
  }
  // swat projectiles
  for (const p of G.projectiles) {
    const cx = p.x - P.x, cy = p.y - P.y, cz = p.z - eyeZ(); const t = cx * a.x + cy * a.y + cz * a.z;
    if (t > 0 && t < R && Math.hypot(cx - a.x * t, cy - a.y * t, cz - a.z * t) < 0.5) { p.dead = true; sparks(p.x, p.y, p.z, 14, RGB(255, 160, 60)); dmgNum(p.x, p.y, p.z, 'SWAT', '#ffc080'); }
  }
  for (const e of G.enemies) if (e.dead && e.deathType === 'bones' && e.reT > 0) { const d = Math.hypot(e.x - wall.x, e.y - wall.y); if (d < 0.7 || hits.length === 0 && Math.hypot(e.x - P.x, e.y - P.y) < R && Math.abs(angDiff(Math.atan2(e.y - P.y, e.x - P.x), P.ang)) < 0.15) { e.reT = -1; e.deathType = 'shattered'; gibs(e.x, e.y, e.z + 0.2, 8, 'bone', 1); SFX.play('rattle'); } }
}
function firePistol() {
  if (P.wpn && P.wpn.ranged === 'crossbow') return fireCrossbow();
  if (!P.hasPistol || P.pistol || P.mana < 8 - 2 * ((P.mods && P.mods.quiver) || 0) || P.latch) return;
  P.mana -= 8 - 2 * ((P.mods && P.mods.quiver) || 0); P.pistol = { t: 0 }; SFX.play('pistol'); G.shake += 4; P.kick += 9;
  const a = aimVec(); const wall = rayMarch(25);
  const hits = enemiesOnRay(wall.d, 0.15);
  if (hits.length) {
    const e = hits[0].e;
    damageEnemy(e, 45 * (P.punish > 0 ? 2 : 1) * ((P.mods && P.mods.ranged) || 1), { dx: a.x, dy: a.y, dz: 0.2, kb: 3, heavy: true, src: 'pistol', col: '#ffe080' });
    if (P.punish > 0) P.punish = 0;
  } else {
    if (!hitCracked(wall.x, wall.y)) { sparks(wall.px || wall.x, wall.py || wall.y, wall.z, 16); }
  }
  for (let i = 0; i < 6; i++) addP({ k: 'smoke', x: P.x + a.x * 0.6, y: P.y + a.y * 0.6, z: eyeZ() - 0.15, vx: rand(-0.3, 0.3) + a.x * 0.6, vy: rand(-0.3, 0.3) + a.y * 0.6, vz: rand(0.1, 0.5), size: 0.1, col: RGB(220, 220, 230), life: 0.7 });
}
function bashResolve() {
  const fw = { x: Math.cos(P.ang), y: Math.sin(P.ang) };
  const t = enemiesInArc(1.5, 0.9);
  for (const e of t) {
    damageEnemy(e, 8, { dx: fw.x, dy: fw.y, dz: 0.4, kb: 4.5, heavy: false, src: 'bash', col: '#e0e0ff' });
    if (e.alive && !e.d.boss) { e.stagger = 1.1; e.state = 'stagger'; e.st = 0; e.atk = null; }
    sparks(e.x - fw.x * 0.3, e.y - fw.y * 0.3, e.z + e.h * 0.5, 8);
  }
  if (t.length) { SFX.play('block', 0.8); G.shake += 3; }
  else { const hx = P.x + fw.x * 0.9, hy = P.y + fw.y * 0.9; const c = cellAt(hx, hy); if (c >= 0 && SOLID[c]) hitCracked(hx, hy); }
}

// ---------- player update ----------
function updatePlayer(dt) {
  // look
  const sens = 0.0024 * (G.sens || 1);
  const angBefore = P.ang;
  P.ang += mouseDX * sens; P.pitch = clamp(P.pitch - mouseDY * 0.9, -150, 150); mouseDX = 0; mouseDY = 0;
  if (K.ArrowLeft) P.ang -= 2.7 * dt; if (K.ArrowRight) P.ang += 2.7 * dt;
  if (K.PageUp || K.KeyO) P.pitch = clamp(P.pitch + 120 * dt, -150, 150);
  if (K.PageDown || K.KeyU) P.pitch = clamp(P.pitch - 120 * dt, -150, 150);
  if (K.Home) P.pitch *= 0.8;
  P.turnV += ((angDiff(P.ang, P.prevAng === undefined ? P.ang : P.prevAng) / Math.max(dt, 0.001)) - P.turnV) * Math.min(1, dt * 12); P.prevAng = P.ang;

  // timers
  P.iframes -= dt; P.dodgeT -= dt; P.dodgeCD -= dt; P.dodgeAge += dt; P.punish -= dt; P.hurtT -= dt; P.comboT -= dt;
  P.parryFlash = Math.max(0, P.parryFlash - dt * 3); P.blockShake = Math.max(0, P.blockShake - dt * 5); P.kick *= Math.pow(0.001, dt);
  P.mana = Math.min(P.maxmana, P.mana + dt * 1.5);
  if (P.webT > 0) P.webT -= dt;
  if (P.poisonT > 0) { P.poisonT -= dt; P.poisonTick = (P.poisonTick || 0) + dt; if (P.poisonTick > 0.5) { P.poisonTick = 0; if (P.hp > 1) { P.hp -= 1; dmgNum(P.x + Math.cos(P.ang), P.y + Math.sin(P.ang), P.z + 1.2, '-1', '#a0ff40'); } } }
  // latch swing
  if (P.latch) {
    const L = P.latch; L.t += dt; const k = clamp(L.t / L.dur, 0, 1); const e = ease(k);
    const b = (a0, a1, a2) => (1 - e) * (1 - e) * a0 + 2 * (1 - e) * e * a1 + e * e * a2;
    P.x = b(L.x0, L.cx, L.x1); P.y = b(L.y0, L.cy, L.y1); P.z = b(L.z0, L.cz, L.z1) + Math.sin(k * Math.PI) * 0.4;
    G.roll = Math.sin(k * Math.PI) * 0.12;
    if (k >= 1) { P.latch = null; P.vz = 0.5; P.vx = 0; P.vy = 0; P.onGround = false; }
    return;
  }
  // inputs (keyboard digital + left-stick analog)
  let fwd = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0);
  let str = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
  let padMag = 0;
  if (typeof PAD !== 'undefined' && PAD.connected && Math.hypot(PAD.lx, PAD.ly) > 0) { fwd = -PAD.ly; str = PAD.lx; padMag = Math.min(1, Math.hypot(PAD.lx, PAD.ly)); }
  const run = K.ShiftLeft || K.ShiftRight || (typeof PAD !== 'undefined' && PAD.run);
  const fx = Math.cos(P.ang), fy = Math.sin(P.ang), rx = -fy, ry = fx;
  // off-hand swap (Tab / mouse wheel / 1 = whip, 2 = shield / pad Triangle, R1, D-pad)
  let want = null;
  if (KP.Tab || KP.Wheel) want = (P.swapTo || P.off) === 'whip' ? 'shield' : 'whip';
  if (KP.Digit1) want = 'whip'; if (KP.Digit2) want = 'shield';
  const quickShield = K.KeyF || K.KeyC || K.KeyL || MB[1];   // dedicated block keys always mean "shield" - swaps it in if needed
  if (quickShield && P.off !== 'shield' && P.swapTo !== 'shield') want = 'shield';
  if (want) startSwap(want, quickShield ? 0.22 : 0.34);
  if (P.swapT > 0) {
    const half = P.swapDur / 2; const before = P.swapT; P.swapT -= dt;
    if (before > half && P.swapT <= half && P.swapTo) { P.off = P.swapTo; SFX.play(P.off === 'shield' ? 'block' : 'whip', 0.25); P.swapLbl = 1.2; }
    if (P.swapT <= 0) { P.swapT = 0; P.swapTo = null; }
  }
  P.swapLbl = Math.max(0, P.swapLbl - dt);
  // shield: hold the off-hand button with the shield equipped (or any dedicated block key); tap = parry window
  const offHeld = MB[2] || K.KeyK || (typeof PAD !== 'undefined' && PAD.l2);
  const wantShield = P.off === 'shield' && P.swapT <= 0 && (offHeld || quickShield);
  if (wantShield && !P.shieldUp) { P.shieldUp = true; P.shieldT = 0; }
  if (!wantShield) P.shieldUp = false;
  if (P.shieldUp) P.shieldT += dt;
  P.raise = clamp(P.raise + (P.shieldUp ? 9 : -7) * dt, 0, 1);
  P.shieldKick = Math.max(0, P.shieldKick - dt * 4);
  // dodge roll: goes where you steer (WASD / left stick, relative to facing). No steer: Q = left, E = right, V / pad = back
  let dodgeReq = null;
  if (KP.KeyQ) dodgeReq = 'Q'; else if (KP.KeyE) dodgeReq = 'E'; else if (KP.KeyV || KP.PadRoll) dodgeReq = 'B';
  else if (KP.dblKeyA) dodgeReq = 'A'; else if (KP.dblKeyD) dodgeReq = 'D'; else if (KP.dblKeyW) dodgeReq = 'W'; else if (KP.dblKeyS) dodgeReq = 'S';
  if (dodgeReq) { P.dodgeBuf = 0.15; P.dodgeBufReq = dodgeReq; } else if ((P.dodgeBuf -= dt) > 0) dodgeReq = P.dodgeBufReq;
  if (dodgeReq && P.dodgeCD <= 0 && !G.finisher && !P.latch) {
    P.dodgeBuf = 0; if (P.sw) P.sw = null; // roll cancels sword recovery
    let lf = fwd, ls = str;
    if (dodgeReq === 'A') { lf = 0; ls = -1; } else if (dodgeReq === 'D') { lf = 0; ls = 1; } else if (dodgeReq === 'W') { lf = 1; ls = 0; } else if (dodgeReq === 'S') { lf = -1; ls = 0; }
    if (Math.hypot(lf, ls) < 0.25) { if (dodgeReq === 'Q') { lf = 0; ls = -1; } else if (dodgeReq === 'E') { lf = 0; ls = 1; } else { lf = -1; ls = 0; } }
    const l = Math.hypot(lf, ls); lf /= l; ls /= l;
    P.ddx = fx * lf + rx * ls; P.ddy = fy * lf + ry * ls; P.dodgeF = lf; P.dodgeSide = ls;
    P.dodgeT = ROLL_T; P.iframes = 0.36 + (P.mods && P.mods.wraith ? 0.12 : 0); P.dodgeAge = 0; P.dodgeCD = 0.46 * (P.mods && P.mods.wraith ? 0.7 : 1); P.rolls = (P.rolls || 0) + 1; if (P.webT > 0) { P.webT = 0; toast('TORE FREE', '', '#d0ffb0', 0.8); }
    SFX.play('dodge'); rumbleFx('dodge');
    for (let i = 0; i < 6; i++) dust(P.x, P.y, P.z, 1);
  }
  // attacks
  if (G.finisher) { /* locked */ }
  else {
    if (MBP[0] || KP.KeyJ) startSword();
    if ((MBP[2] || KP.KeyK || KP.PadOff) && P.off === 'whip' && P.swapT <= 0) startWhip();
    if (KP.KeyR) firePistol();
  }
  // sword update
  if (P.sw) {
    const S = SWING[P.sw.step]; P.sw.t += dt * (P.wpn && P.wpn.sword === 'rapier' ? 1.35 : P.wpn && P.wpn.sword === 'skull' ? 0.85 : (P.wpn && typeof SWSPD !== 'undefined' && SWSPD[P.wpn.sword]) || 1);
    if (!P.sw.done && P.sw.t >= S.dur * S.hitAt) { P.sw.done = true; swordHit(P.sw.step); }
    if (P.sw && P.sw.t >= S.dur) {
      P.lastStep = P.sw.step; P.comboT = 0.4;
      if (P.swQueued) { P.swQueued = false; const step = (P.sw.step + 1) % 3; P.sw = { step, t: 0, done: false }; P.lastStep = step; SFX.swing(step); }
      else P.sw = null;
    }
  }
  if (P.whip) { P.whip.t += dt; if (!P.whip.done && P.whip.t >= 0.17) { P.whip.done = true; whipResolve(); } if (P.whip.t >= 0.46) P.whip = null; }
  if (P.pistol) { P.pistol.t += dt; if (P.pistol.t > (P.pistol.dur || 0.42)) P.pistol = null; }
  if (P.bash) { P.bash.t += dt; if (!P.bash.done && P.bash.t > 0.1) { P.bash.done = true; bashResolve(); } if (P.bash.t > 0.38) P.bash = null; }
  // movement
  let speed = (run ? 5.7 : 3.5) * P.mods.spd * (P.berserkOn ? 1.1 : 1); if (P.shieldUp) speed *= 0.55; if (P.sw) speed *= 0.85; if (P.webT > 0) speed *= 0.45;
  if (padMag > 0) speed *= 0.35 + 0.65 * padMag;
  let tx = fx * fwd + rx * str, ty = fy * fwd + ry * str; const tl = Math.hypot(tx, ty); if (tl > 0) { tx = tx / tl * speed; ty = ty / tl * speed; }
  const acc = P.onGround ? 14 : 5;
  P.vx += (tx - P.vx) * Math.min(1, acc * dt); P.vy += (ty - P.vy) * Math.min(1, acc * dt);
  let mvx = P.vx, mvy = P.vy;
  if (P.dodgeT > 0) {
    // true quick roll: explosive start, ease-out, camera tucks low and tilts through the roll
    const k = 1 - P.dodgeT / ROLL_T; const v = 10.5 * (1.25 - k) ;
    mvx = P.ddx * v; mvy = P.ddy * v;
    G.roll = -P.dodgeSide * 0.32 * Math.sin(k * Math.PI);
    const fk = P.dodgeF || 0;
    P.rollDip = 0.24 * Math.sin(Math.min(1, k * 1.15) * Math.PI);
    P.rollPitch = (-38 * Math.abs(P.dodgeSide) - 44 * Math.max(0, fk) + 30 * Math.max(0, -fk)) * Math.sin(k * Math.PI);
    if (P.dodgeT - dt <= 0) { dust(P.x, P.y, P.z, 5); SFX.play('step', 1); P.landV = 0.05; }
  } else { G.roll *= Math.pow(0.0005, dt); P.rollDip = (P.rollDip || 0) * Math.pow(0.0001, dt); P.rollPitch = (P.rollPitch || 0) * Math.pow(0.0001, dt); }
  if (G.finisher) { mvx = 0; mvy = 0; }
  moveEntity(P, mvx * dt, mvy * dt, PR, 0.33, false);
  // push out of enemies
  for (const e of G.enemies) {
    if (!e.alive || e.hidden || e.d.phase || e.intangible) continue;
    if (e.z > P.z + 1.6 || e.z + e.h < P.z + 0.2) continue;
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy), md = PR + e.r * (e.d.boss ? 1 : 0.8);
    if (d < md && d > 0.001) {
      const push = (md - d); moveEntity(P, dx / d * push, dy / d * push, PR, 0.33, false);
      if (e.d.boss) { const d2 = Math.hypot(P.x - e.x, P.y - e.y); if (d2 < md - 0.01) moveEntity(e, -dx / d * (md - d2), -dy / d * (md - d2), e.r, 0.33, false); } // pinned against a wall: shove him instead
    }
  }
  // jump & gravity
  if (KP.Space) P.jumpBuf = 0.12; P.jumpBuf -= dt; P.coyote -= dt;
  const g = groundUnder(P.x, P.y, PR - 0.02);
  if (P.onGround) P.coyote = 0.1;
  if (P.jumpBuf > 0 && P.coyote > 0) { P.vz = 3.9; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; SFX.play('jump'); P.landV = -0.06; }
  P.vz -= 11.5 * dt; P.z += P.vz * dt;
  const cell = cellAt(P.x, P.y);
  if (cell >= 0 && P.z + 1.7 > CH[cell] && P.vz > 0 && !SKY[cell]) P.vz = 0;
  if (P.z <= g) {
    if (!P.onGround) {
      const impact = -P.vz; if (impact > 2) { P.landV = Math.min(0.18, impact * 0.022); SFX.play('land', Math.min(1, impact / 8)); if (impact > 6) G.shake += 3; dust(P.x, P.y, g, 4); }
    }
    if (g - P.z < 0.36) { P.eyeOff -= (g - P.z); }
    P.z = g; P.vz = 0; P.onGround = true;
  } else if (P.z > g + 0.02) P.onGround = false;
  P.eyeOff *= Math.pow(0.0001, dt);
  // fell into chasm
  if (P.z < -0.9) {
    hurtPlayer(15, P.x, P.y, { unblockable: true, nopd: true, env: true }); spray(P.x, P.y, -2, 0, 0, 1, 40, 4, Math.PI);
    if (P.hp > 0) { P.x = P.lastSafe.x; P.y = P.lastSafe.y; P.z = P.lastSafe.z; P.vz = 0; P.vx = P.vy = 0; toast('The blood sea spits you back out.', '', '#ff8090', 2); }
    return;
  }
  if (P.onGround && g > -0.5 && groundUnder(P.x, P.y, PR + 0.35) > -0.5 && P.dodgeT <= 0) { P.lastSafe.x = P.x; P.lastSafe.y = P.y; P.lastSafe.z = P.z; }
  // view bob & footsteps
  const sp = Math.hypot(mvx, mvy);
  if (P.onGround && sp > 0.5) { P.bob += dt * sp * 2.3; P.stepAcc += dt * sp; if (P.stepAcc > 1.55) { P.stepAcc = 0; SFX.play('step', run ? 0.9 : 0.6); } }
  P.bobAmt += ((P.onGround ? clamp(sp / 5.7, 0, 1) : 0) - P.bobAmt) * Math.min(1, dt * 8);
  // landing spring
  P.landDip = P.landDip || 0; P.landDip += P.landV; P.landV *= 0.5; P.landDip *= Math.pow(0.002, dt);
}

// ---------- enemy AI ----------
function enemyStrike(e) {
  const d = e.d; const dist = Math.hypot(P.x - e.x, P.y - e.y);
  if (d.ranged) {
    const ez = e.z + e.h * 0.5; const ang = Math.atan2(P.y - e.y, P.x - e.x); const dz = (P.z + 1.0) - ez; const sp = 6.5;
    G.projectiles.push({ type: 'fireball', x: e.x, y: e.y, z: ez, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: dz / Math.max(0.5, dist) * sp, dmg: d.dmg, owner: e, life: 4 });
    SFX.play('fire'); return;
  }
  if (d.lunge) { const a = Math.atan2(P.y - e.y, P.x - e.x); e.lockDx = Math.cos(a); e.lockDy = Math.sin(a); e.hitDone = false; return; }
  if (e.type === 'bat') { e.hitDone = false; return; }
  if (e.type === 'ghost') { const a = Math.atan2(P.y - e.y, P.x - e.x); e.lockDx = Math.cos(a); e.lockDy = Math.sin(a); e.hitDone = false; return; }
  if (dist < d.range + 0.35 && Math.abs(P.z - e.z) < 1.2) hurtPlayer(d.dmg, e.x, e.y, { src: e });
  else SFX.play('swing', 0.4);
}
function updateEnemy(e, dt) {
  const d = e.d;
  e.t += dt; e.flash = Math.max(0, e.flash - dt * 10); e.hurtT -= dt;
  if (e.dead) { updateDead(e, dt); return; }
  if (RUN.on && !e.hidden && e.alive) { dt = rogueEnemyTick(e, dt); if (dt <= 0 || !e.alive) return; }
  if (e.hidden) {
    if (e.ambush && !G.ambushDone && P.y < 23.5 && P.y > 13) { G.ambushDone = true; for (const o of G.enemies) if (o.ambush) { o.hidden = false; o.awake = true; o.riseT = 0; SFX.play('screech'); } toast('AMBUSH!', 'Something sprints out of the dark aisles.', '#ff6070', 1.6); }
    return;
  }
  if (e.frozen) return;
  if (e.freezeT > 0 && !e.d.boss) { e.freezeT -= dt; return; }
  if (e.riseT < 1) { e.riseT += dt * 0.9; if (Math.random() < 0.3) dust(e.x, e.y, e.z, 1); if (e.riseT < 1) return; }
  if (d.boss) { if (typeof BOSSREG !== 'undefined' && BOSSREG[e.type]) BOSSREG[e.type].update(e, dt); else if (e.type === 'spider') updateSpider(e, dt); else if (e.type === 'colossus') updateGolem(e, dt); else if (e.type === 'alphawolf') updateAlpha(e, dt); else if (e.type === 'matriarch') updateMatriarch(e, dt); else updateBoss(e, dt); return; }
  const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy);
  const los = losTo(e.x, e.y, P.x, P.y);
  if (!e.awake && dist < 10 && los && Math.abs(P.z - e.z) < 3) { e.awake = true; if (e.type === 'zombie' || e.type === 'azombie') SFX.play('groan', 0.7); if (e.type === 'bat' || e.type === 'gargoyle') SFX.play('screech', 0.6); if (e.type === 'imp') SFX.play('giggle'); if (e.type === 'ghost') SFX.play('ghost', 0.6); }
  // knockback
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) {
    moveEntity(e, e.kbx * dt, e.kby * dt, e.r * 0.8, 0.33, !!d.fly && !d.phase);
    e.kbx *= Math.pow(0.004, dt); e.kby *= Math.pow(0.004, dt);
  }
  // ground & chasm
  if (!d.fly) {
    const g = groundUnder(e.x, e.y, e.r * 0.5);
    if (e.z > g + 0.01) { e.vz -= 12 * dt; e.z += e.vz * dt; if (e.z < g) { e.z = g; e.vz = 0; } }
    else { e.z = g; e.vz = 0; }
    if (e.z < -1.2) { spray(e.x, e.y, -2.0, 0, 0, 1, 30, 4, Math.PI); dmgNum(e.x, e.y, -1, 'DROWNED', '#ff6070'); e.alive = false; e.dead = true; e.deathType = 'gone'; if (!e.summoned) G.kills++; SFX.play('gib', 0.6); return; }
  }
  if (e.stun > 0) { e.stun -= dt; }
  if (e.downT > 0) { e.downT -= dt; e.state = 'down'; if (e.downT <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.5; dust(e.x, e.y, e.z, 4); } else if (e.downMax - e.downT < 0.05 && Math.random() < 0.5) dust(e.x, e.y, e.z, 2); return; }
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; } return; }
  if (!e.awake) { e.state = 'idle'; return; }
  e.cd -= dt; e.st += dt;
  const ang = Math.atan2(dy, dx);
  const speed = d.speed * (e.stun > 0 ? 0.2 : 1);
  if (d.fly) {
    // flyers bob
    const tz = (e.type === 'ghost' ? P.z + 0.15 : Math.max(P.z + 1.1, d.fly)) + Math.sin(e.t * 2.2) * 0.15;
    if (e.state !== 'strike') e.z += (tz - e.z) * Math.min(1, dt * 2);
  }
  switch (e.state) {
    case 'idle': case 'chase': case 'hurt': case 'stagger': case 'down': {
      e.state = 'chase';
      if (e.hurtT > e.hurtMax * 0.45) break; // flinch: stop in place
      let mx = 0, my = 0;
      if (e.type === 'bat' || e.type === 'gargoyle') { // circle then swoop
        const tang = ang + Math.PI / 2 * e.side; const want = 2.3;
        mx = Math.cos(tang) * 0.8 + Math.cos(ang) * (dist - want) * 0.6; my = Math.sin(tang) * 0.8 + Math.sin(ang) * (dist - want) * 0.6;
        const l = Math.hypot(mx, my) || 1; mx = mx / l * speed; my = my / l * speed;
        if (e.cd <= 0 && dist < 3.2 && los) { e.state = 'windup'; e.st = 0; SFX.play('screech', 0.6); }
      } else if (d.ranged) {
        const want = d.keep; const tang = ang + Math.PI / 2 * e.side;
        mx = Math.cos(ang) * (dist - want) * 0.7 + Math.cos(tang) * 0.7; my = Math.sin(ang) * (dist - want) * 0.7 + Math.sin(tang) * 0.7;
        const l = Math.hypot(mx, my) || 1; mx = mx / l * speed; my = my / l * speed;
        if (Math.random() < dt * 0.4) e.side *= -1;
        if (e.cd <= 0 && dist < d.range && los) { e.state = 'windup'; e.st = 0; SFX.play('giggle', 0.7); }
      } else {
        let gx = dx, gy = dy;
        if (!los && !d.phase && FLOW) {
          const c = cellAt(e.x, e.y); const cx = c % MW, cy = (c / MW) | 0; let best = FLOW[c] < 0 ? 9999 : FLOW[c], bx = 0, by = 0;
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (cy + oy) * MW + cx + ox; if (FLOW[n] >= 0 && FLOW[n] < best) { best = FLOW[n]; bx = ox; by = oy; } }
          if (bx || by) { gx = cx + bx + 0.5 - e.x; gy = cy + by + 0.5 - e.y; }
        }
        const l = Math.hypot(gx, gy) || 1;
        mx = gx / l * speed; my = gy / l * speed;
        if (dist < d.range * 0.8) { mx *= 0.1; my *= 0.1; }
        if (e.cd <= 0 && dist < d.range && los && Math.abs(P.z - e.z) < 1.3) { e.state = 'windup'; e.st = 0; SFX.play('windup', 0.6); if (e.type === 'skeleton') SFX.play('rattle', 0.5); if (e.type === 'zombie' || e.type === 'azombie') SFX.play('groan', 0.5); }
      }
      // separation
      for (const o of G.enemies) { if (o === e || !o.alive || o.hidden) continue; const sx = e.x - o.x, sy = e.y - o.y, sd = Math.hypot(sx, sy); if (sd < 0.6 && sd > 0.001) { mx += sx / sd * 1.2; my += sy / sd * 1.2; } }
      const moved = Math.hypot(mx, my) * dt;
      if (d.phase) { e.x = clamp(e.x + mx * dt, 1, MW - 1); e.y = clamp(e.y + my * dt, 1, MH - 1); }
      else moveEntity(e, mx * dt, my * dt, e.r * 0.8, 0.33, !!d.fly);
      const wk0 = Math.floor(e.walk / Math.PI); e.walk += moved * 5.5;
      // v2.4 heavy footfalls: the boss / armoured dead plant each step (dust + a little weight in the camera)
      if ((d.boss || e.type === 'azombie') && Math.floor(e.walk / Math.PI) !== wk0) {
        const side = (Math.floor(e.walk / Math.PI) & 1) ? 1 : -1, ca = Math.cos(P.ang + Math.PI / 2) * 0.35 * side, sa = Math.sin(P.ang + Math.PI / 2) * 0.35 * side;
        dust(e.x + ca, e.y + sa, e.z, d.boss ? 4 : 2);
        if (d.boss) { const dd = Math.hypot(P.x - e.x, P.y - e.y); if (dd < 9) { G.shake += 1.2 * (1 - dd / 9); SFX.play('land', 0.25 * (1 - dd / 9)); rumbleFx('stomp', 1 - dd / 9); } }
      }
      if (Math.abs(mx) + Math.abs(my) > 0.05) { const lat = -(mx) * Math.sin(P.ang) + my * Math.cos(P.ang); if (Math.abs(lat) > 0.3) e.flip = lat < 0; }
      if (e.type === 'zombie' && Math.random() < dt * 0.15) SFX.play('groan', 0.35);
      break;
    }
    case 'windup': {
      const wu = d.windup;
      if (e.st >= wu) { e.state = 'strike'; e.st = 0; enemyStrike(e); }
      break;
    }
    case 'strike': {
      if (e.type === 'bat' || e.type === 'gargoyle') { // swoop at head
        const tz = P.z + 1.2; const l = Math.hypot(dx, dy) || 1;
        moveEntity(e, dx / l * 7 * dt, dy / l * 7 * dt, e.r * 0.6, 0.33, true); e.z += (tz - e.z) * Math.min(1, dt * 6);
        if (!e.hitDone && dist < 0.75) { e.hitDone = true; hurtPlayer(d.dmg, e.x, e.y, { src: e }); }
      }
      if (!d.lunge && !d.fly && !d.ranged && e.st < d.strike * 0.6 && dist > e.r + 0.55) moveEntity(e, dx / dist * 3.2 * dt, dy / dist * 3.2 * dt, e.r * 0.8, 0.33, false); // short lunge
      if (d.lunge) { if (dist > e.r + 0.45) moveEntity(e, e.lockDx * d.lunge * dt, e.lockDy * d.lunge * dt, e.r * 0.8, 0.33, false); if (!e.hitDone && dist < 1.0) { e.hitDone = true; hurtPlayer(d.dmg, e.x, e.y, { src: e }); } }
      if (e.type === 'ghost') { e.x += e.lockDx * 5 * dt; e.y += e.lockDy * 5 * dt; if (!e.hitDone && dist < 0.8 && Math.abs(P.z - e.z) < 1.4) { e.hitDone = true; hurtPlayer(d.dmg, e.x, e.y, { src: e, unblockable: false }); P.mana = Math.max(0, P.mana - 10); } }
      if (e.st >= d.strike) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': if (e.st >= d.recover) { e.state = 'chase'; e.st = 0; e.cd = rand(0.4, 1.4); } break;
  }
}
function updateDead(e, dt) {
  e.deathT += dt;
  if (e.deathType === 'bones' && e.reT > 0) {
    e.reT -= dt;
    if (e.reT < 1.2 && Math.random() < dt * 8) { SFX.play('rattle', 0.3); }
    if (e.reT <= 0) { e.dead = false; e.alive = true; e.reassembled = true; e.hp = Math.round(e.maxhp * 0.6); e.blood = 0.5; e.state = 'chase'; e.riseT = 0.4; e.deathType = null; e.awake = true; if (!e.summoned) G.kills--; toast('The bones knit back together...', 'Shatter the pile, or finish it.', '#e0d8c0', 2); }
    return;
  }
  if (e.deathType === 'collapse' || e.deathType === 'dismember') {
    if (e.deathT < 1.2 && Math.random() < dt * 20) paintFloor(e.x + rand(-0.3, 0.3), e.y + rand(-0.3, 0.3), rand(0.1, 0.25) + e.deathT * 0.3, 90);
    if (e.deathT < 0.6 && Math.random() < dt * 25) spray(e.x, e.y, e.z + e.h * 0.4 * (1 - e.deathT), 0, 0, 1.4, 3, 2.2, 0.6, e.d.mat);
  }
  if (e.deathType === 'boss') updateBossDeath(e, dt);
}

// ---------- boss: the Vampire Knight ----------
function bossIntro() {
  const b = G.boss; b.awake = true; b.state = 'intro'; b.st = 0; b.z = 4.2; b.poise = 0; b.lastAtk = null; b.mistA = 1; b.hits = 0;
  SFX.play('screech'); G.shake += 3; if (SFX.mus) SFX.mus.boss = true;
  toast('"Turn back, Baron. The Court has no use for you."', '', '#ff9090', 3);
}
const ARENA = { x0: 9.7, x1: 25.3, y0: 1.7, y1: 8.3 };
function buildStage() { if (RUN.hub && typeof buildChapel === 'function') { buildChapel(); return; } const th = RUN.on ? curTheme() : THEMES.nave; if (RUN.on && th.map === 'crypt') { buildCrypt(th, (RUN.seed + RUN.stage * 7919) | 0); LEVEL.bossType = RUN.cfg.boss || th.boss; } else { buildLevel(th); } }
function bossLandSpot(x, y) { // a free spot near (x,y) that is not on top of the Baron
  const md = PR + 0.85 + 0.25; let a0 = Math.atan2(y - P.y, x - P.x);
  if (Math.hypot(x - P.x, y - P.y) >= md && arenaOK(x, y)) return [x, y];
  for (let i = 0; i < 12; i++) { const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5; const tx = P.x + Math.cos(a) * md, ty = P.y + Math.sin(a) * md; if (arenaOK(tx, ty)) return [tx, ty]; }
  return null;
}
function arenaOK(x, y) { return x > ARENA.x0 && x < ARENA.x1 && y > ARENA.y0 && y < ARENA.y1 && !blocked(x, y, 0, 0.85, 0.33, false); }
function bossPick(e, dist) {
  const p2 = e.phase2; const bats = G.enemies.filter(o => o.summoned && o.alive && o.type === 'bat').length;
  const W = [];
  if (dist < 3.3) W.push(['combo', 4], ['sweep', 2.2], ['plunge', p2 ? 0.9 : 0.5], ['mist', p2 ? 1 : 0.5], ['spikes', p2 ? 1.3 : 0], ['bats', bats < 2 ? 0.5 : 0], ['wave', 0.5]);
  else if (dist < 7.5) W.push(['thrust', 3], ['wave', 2.2], ['plunge', 1.5], ['mist', 1.3], ['bats', bats < 2 ? 1 : 0], ['spikes', p2 ? 2 : 0]);
  else W.push(['wave', 3], ['thrust', 2], ['mist', 1.5], ['plunge', 1.2], ['spikes', p2 ? 1.5 : 0]);
  let tot = 0; for (const w of W) { if (w[0] === e.lastAtk) w[1] *= 0.25; tot += w[1]; }
  let r = Math.random() * tot; for (const w of W) { r -= w[1]; if (r <= 0) return w[0]; } return W[0][0];
}
const BOSS_WU = { combo: 0.55, sweep: 0.8, thrust: 0.6, wave: 0.7, bats: 0.85, spikes: 0.75, mist: 0.4, plunge: 0.45 };
function bossSlash(e, dmg, arc, range, opt = {}) {
  const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  SFX.play('swingH'); addP({ k: 'impact', x: e.x + Math.cos(e.lockA) * 1.2, y: e.y + Math.sin(e.lockA) * 1.2, z: e.z + 1.3, life: 0.1, max: 0.1, sz: 1.4, col: e.phase2 ? [200, 90, 255] : [255, 80, 90] });
  if (dist < range && Math.abs(angDiff(ang, e.lockA)) < arc) {
    if (opt.jumpable && P.z - groundUnder(P.x, P.y, 0.1) > 0.3) { dmgNum(P.x, P.y, P.z + 1.6, 'JUMPED', '#a0ffd0'); return; }
    hurtPlayer(dmg, e.x, e.y, Object.assign({ src: e }, opt));
  }
}
function bossStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hits = 0;
  if (atk === 'thrust') SFX.play('glint'); else if (atk === 'mist') SFX.play('ghost', 0.7); else if (atk === 'bats' || atk === 'spikes') SFX.play('roar', 0.45); else SFX.play('windup');
}
function updateBoss(e, dt) { bossAI(e, dt); bossSeparate(e); }
function bossSeparate(e) { // never stand inside the Baron
  if (!e.alive || e.intangible || e.z > P.z + 1.2) return;
  const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy), md = PR + e.r;
  if (d < md && d > 0.001) moveEntity(e, dx / d * (md - d), dy / d * (md - d), e.r, 0.33, false);
}
function bossAI(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 22); e.pressure = Math.max(0, (e.pressure || 0) - dt * 2.2);
  const rage = e.phase2 ? 1.3 : 1;
  const floor = floorAt(e.x, e.y);
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.004, dt); e.kby *= Math.pow(0.004, dt); }
  if (e.mistA === undefined) e.mistA = 1;
  if (e.state !== 'mist' && e.mistA < 1) e.mistA = Math.min(1, e.mistA + dt * 4);
  if (e.state !== 'plunge' && e.state !== 'intro' && e.z > floor) { e.z = Math.max(floor, e.z - dt * 9); }
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.35; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && e.state !== 'rage' && e.state !== 'plunge' && e.state !== 'mist') {
    e.phase2 = true; e.state = 'rage'; e.st = 0; e.atk = null; SFX.play('roar'); G.shake += 10; G.flashR = 0.35; G.zoom = 0.1; e.poise = 0;
    toast('His eyes flash purple. Another voice speaks:', '"Prepared for everything, Baron? Except this."', '#d090ff', 4);
    for (let i = 0; i < 3; i++) { const b = makeEnemy('bat', e.x + rand(-2, 2), e.y + rand(-1, 2)); b.awake = true; b.z = 2.5; b.summoned = true; G.enemies.push(b); }
    for (let i = 0; i < 40; i++) addP({ k: 'ecto', x: e.x + rand(-1, 1), y: e.y + rand(-1, 1), z: e.z + rand(0, 2.5), vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(0.5, 3), size: rand(0.05, 0.1), col: Math.random() < 0.5 ? RGB(200, 60, 255) : RGB(255, 30, 60), life: rand(0.6, 1.4) });
  }
  if (e.phase2 && Math.random() < dt * 10) addP({ k: 'ember', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0.3, 2.4), vx: 0, vy: 0, vz: rand(0.6, 1.6), size: 0.05, col: Math.random() < 0.5 ? RGB(190, 70, 255) : RGB(255, 40, 70), life: 0.7 });
  const face = () => { const l = Math.abs(-dx * Math.sin(P.ang) + dy * Math.cos(P.ang)); if (l > 0.2) e.flip = (-dx * Math.sin(P.ang) + dy * Math.cos(P.ang)) > 0; };
  switch (e.state) {
    case 'intro': { // descends out of the night sky, lands, roars
      const k = Math.min(1, e.st / 0.9);
      e.z = floor + 4.2 * (1 - k * k);
      if (Math.random() < dt * 30) addP({ k: 'ecto', x: e.x + rand(-1.5, 1.5), y: e.y + rand(-1.5, 1.5), z: e.z + rand(0, 2), vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(-1, 1), size: 0.07, col: RGB(40, 0, 30), life: 0.8 });
      if (e.st >= 0.9 && !e.landed) {
        e.landed = true; e.z = floor; G.shake += 12; G.hitstop = 0.12; G.flashR = 0.3; SFX.ev('intro_vknight', 1, ['roar','howl','screech','toll','ghost']); SFX.play('land', 1); SFX.play('heavy'); SFX.play('roar'); dust(e.x, e.y, floor, 24); rumbleFx('slam');
        for (let i = 0; i < 16; i++) paintFloor(e.x + rand(-1.6, 1.6), e.y + rand(-1.6, 1.6), rand(0.1, 0.3), 140);
        G.bigText = { img: null, t1: 'THE VAMPIRE KNIGHT', t2: RUN.on && RUN.stage > 1 ? 'Risen from the Blood Ossuary' : 'Lieutenant of the Blood Court', t: 0, dur: 3.0 };
      }
      if (e.st > 2.5) { e.state = 'chase'; e.st = 0; e.cd = 0.5; }
      break;
    }
    case 'rage': if (e.st > 1.6) { e.state = 'chase'; e.st = 0; e.cd = 0.25; } break;
    case 'chase': {
      face();
      const sp = d.speed * rage; const want = 2.1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) * 0.9 + Math.cos(tang) * 0.5, my = Math.sin(ang) * (dist - want) * 0.9 + Math.sin(tang) * 0.5;
      const l = Math.hypot(mx, my); if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); e.walk += sp * dt * 3.2; }
      if (Math.random() < dt * 0.5) e.side *= -1;
      if (e.pressure > 3.5 && dist < 3.2) { e.pressure = 0; bossStartAtk(e, Math.random() < 0.5 ? 'mist' : (e.phase2 ? 'plunge' : 'sweep'), ang); break; }
      if (e.cd <= 0) bossStartAtk(e, bossPick(e, dist), ang);
      break;
    }
    case 'windup': {
      face();
      const wu = BOSS_WU[e.atk] / (e.phase2 ? 1.25 : 1);
      if (e.atk === 'thrust' && e.st < wu * 0.75) e.lockA = ang; // locks in for the last quarter: dodge sideways
      if (e.atk === 'sweep' || e.atk === 'combo') e.lockA += angDiff(ang, e.lockA) * Math.min(1, dt * 3);
      if (e.atk === 'mist') e.mistA = Math.max(0.12, 1 - e.st / wu);
      if (['thrust', 'sweep', 'wave', 'combo'].includes(e.atk)) bossTelegraph(e, e.st / wu);
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0; e.hitDone = false;
        if (e.atk === 'sweep') bossSlash(e, 24, 1.25, 3.1, { noparry: true, blockMul: 0.4, jumpable: true });
        else if (e.atk === 'wave') { const n = e.phase2 ? 5 : 3; for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.3; G.projectiles.push({ type: 'bloodwave', x: e.x + Math.cos(a) * 0.8, y: e.y + Math.sin(a) * 0.8, z: 0.35, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, vz: 0, dmg: 15, owner: e, life: 3, low: true }); } SFX.play('fire'); }
        else if (e.atk === 'thrust') SFX.play('swingH');
        else if (e.atk === 'combo') { e.hits = 0; e.nextHit = 0; }
        else if (e.atk === 'bats') { for (let i = 0; i < (e.phase2 ? 4 : 3); i++) { const b = makeEnemy('bat', e.x + rand(-1.2, 1.2), e.y + rand(-1.2, 1.2)); b.awake = true; b.z = e.z + 2.2; b.summoned = true; b.cd = rand(0.5, 1.5); G.enemies.push(b); } SFX.play('screech'); for (let i = 0; i < 30; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + 2, vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(0, 3), size: 0.07, col: RGB(60, 0, 40), life: 0.8 }); }
        else if (e.atk === 'spikes') {
          const n = 7; const a0 = ang; const tx = P.x, ty = P.y;
          for (let i = 0; i < n; i++) { const r = 1.1 + i * 0.85; const hx = e.x + Math.cos(a0) * r, hy = e.y + Math.sin(a0) * r; if (!arenaOK(hx, hy)) break; G.hazards.push({ x: hx, y: hy, t: -(0.5 + i * 0.1), dmg: 17 }); }
          for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const hx = tx + Math.cos(a) * 1.3, hy = ty + Math.sin(a) * 1.3; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -1.05, dmg: 17 }); }
          G.hazards.push({ x: tx, y: ty, t: -1.2, dmg: 20 });
          SFX.play('fire');
        }
        else if (e.atk === 'mist') { e.state = 'mist'; e.st = 0; e.mistA = 0.08; e.intangible = true; SFX.play('ghost'); }
        else if (e.atk === 'plunge') { e.state = 'plunge'; e.st = 0; e.plT = null; SFX.play('jump'); SFX.play('screech', 0.6); dust(e.x, e.y, floor, 10); }
      }
      break;
    }
    case 'mist': { // drifts as a cloud of blood mist, reforms behind you
      e.mistA = 0.3;
      if (Math.random() < dt * 40) addP({ k: 'ecto', x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: e.z + rand(0.2, 2.2), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: rand(0.2, 1), size: 0.08, col: Math.random() < 0.5 ? RGB(150, 0, 30) : RGB(120, 40, 200), life: 0.6 });
      const behind = () => { const fx = Math.cos(P.ang), fy = Math.sin(P.ang);
        for (const [ox, oy] of [[-fx * 2.1, -fy * 2.1], [-fx * 1.6 + fy * 1.4, -fy * 1.6 - fx * 1.4], [-fx * 1.6 - fy * 1.4, -fy * 1.6 + fx * 1.4], [fy * 2.2, -fx * 2.2], [-fy * 2.2, fx * 2.2]]) if (arenaOK(P.x + ox, P.y + oy)) return [P.x + ox, P.y + oy];
        return null; };
      if (!e.mistTo && e.st > 0.15) e.mistTo = behind() || [e.x, e.y];
      if (e.mistTo && Math.random() < dt * 30) addP({ k: 'spark', x: e.mistTo[0] + rand(-0.4, 0.4), y: e.mistTo[1] + rand(-0.4, 0.4), z: floorAt(e.mistTo[0], e.mistTo[1]) + 0.05, vx: 0, vy: 0, vz: 1.2, size: 0.06, col: RGB(200, 60, 255), life: 0.25 });
      if (e.st > 0.6 / rage) {
        const fin = behind() || (Math.hypot(e.mistTo[0] - P.x, e.mistTo[1] - P.y) > 1.5 ? e.mistTo : [e.x, e.y]); // re-check: the Baron may have moved
        e.x = fin[0]; e.y = fin[1]; e.mistTo = null; e.intangible = false; e.mistA = 0.35;
        SFX.play('glint'); for (let i = 0; i < 20; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + rand(0, 2.2), vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(-0.5, 1), size: 0.08, col: RGB(170, 40, 220), life: 0.5 });
        bossStartAtk(e, 'sweep', Math.atan2(P.y - e.y, P.x - e.x)); e.st = 0.8 - 0.48 / rage; e.lastAtk = 'mist'; // short, readable re-strike from behind
      }
      break;
    }
    case 'plunge': { // leaps into the air, tracks you, then slams down where his shadow is
      const up = 0.55, hang = 0.4 / rage, fall = 0.18;
      if (e.st < up) { const k = e.st / up; e.z = floor + 3.6 * Math.sin(k * Math.PI / 2); const l = Math.max(0.01, dist); const sp = Math.min(7, dist * 3); moveEntity(e, dx / l * sp * dt, dy / l * sp * dt, e.r, 9, true); }
      else if (e.st < up + hang) { if (!e.plT) e.plT = [P.x, P.y]; e.z = floor + 3.6; if (Math.random() < dt * 60) { const a = rand(0, TAU); addP({ k: 'spark', x: e.plT[0] + Math.cos(a) * 1.7, y: e.plT[1] + Math.sin(a) * 1.7, z: floorAt(e.plT[0], e.plT[1]) + 0.04, vx: 0, vy: 0, vz: 0.8, size: 0.06, col: RGB(255, 40, 60), life: 0.22 }); } }
      else if (e.st < up + hang + fall) { const k = (e.st - up - hang) / fall; const tx = e.plT[0], ty = e.plT[1]; let nx = lerp(e.x, tx, k), ny = lerp(e.y, ty, k); const sp = bossLandSpot(nx, ny); if (sp) { e.x = sp[0]; e.y = sp[1]; } e.z = floor + 3.6 * (1 - k); }
      else if (!e.hitDone) {
        e.hitDone = true; e.z = floorAt(e.x, e.y); G.shake += 11; G.hitstop = 0.06; SFX.play('heavy'); SFX.play('land', 1); dust(e.x, e.y, e.z, 26); rumbleFx('slam', 0.9);
        for (let i = 0; i < 12; i++) paintFloor(e.x + rand(-1.5, 1.5), e.y + rand(-1.5, 1.5), rand(0.1, 0.3), 150);
        const pd = Math.hypot(P.x - e.x, P.y - e.y);
        if (pd < 2.0 && P.z - groundUnder(P.x, P.y, 0.1) < 0.4) hurtPlayer(28, e.x, e.y, { src: e, noparry: true, blockMul: 0.5 });
        if (e.phase2) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const hx = e.x + Math.cos(a) * 2.3, hy = e.y + Math.sin(a) * 2.3; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.35, dmg: 14 }); }
      }
      else if (e.st > up + hang + fall + 0.9) { e.state = 'chase'; e.st = 0; e.cd = rand(0.3, 0.7) / rage; e.atk = null; }
      break;
    }
    case 'strike': {
      if (e.atk === 'thrust') {
        const sp = 13; if (dist > e.r + 0.7) moveEntity(e, Math.cos(e.lockA) * sp * dt, Math.sin(e.lockA) * sp * dt, e.r, 0.33, false);
        if (!e.hitDone && dist < 1.4) { e.hitDone = true; hurtPlayer(20, e.x, e.y, { src: e }); }
        if (e.st > 0.45 || (e.st > 0.15 && dist <= e.r + 0.75)) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'combo') {
        const n = e.phase2 ? 4 : 3, gap = 0.3 / rage;
        if (e.hits < n && e.st >= e.nextHit) {
          e.lockA = ang; e.hits++; e.nextHit = e.st + gap;
          if (dist > e.r + 0.75) moveEntity(e, Math.cos(ang) * Math.min(0.45, dist - e.r - 0.75), Math.sin(ang) * Math.min(0.45, dist - e.r - 0.75), e.r, 0.33, false);
          bossSlash(e, e.hits === n ? 20 : 14, 1.15, 3.0, {});
        }
        if (e.hits >= n && e.st > e.nextHit) { e.state = 'recover'; e.st = 0; }
      } else if (e.st > 0.25) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': if (e.st > (e.atk === 'sweep' ? 0.75 : e.atk === 'combo' ? 0.8 : 0.6) / rage) { e.state = 'chase'; e.st = 0; e.cd = rand(0.12, 0.55) / rage; } break;
  }
}
// phase-2 blood spikes: telegraphed floor eruptions
function updateHazards(dt) {
  for (const h of G.hazards) {
    h.t += dt;
    if (h.kind === 'venom') { updateVenom(h, dt); continue; }
    if (h.t < 0) { if (Math.random() < dt * 26) addP({ k: 'spark', x: h.x + rand(-0.3, 0.3), y: h.y + rand(-0.3, 0.3), z: floorAt(h.x, h.y) + 0.03, vx: 0, vy: 0, vz: 0.6 + (h.t > -0.25 ? 1.2 : 0), size: 0.05, col: RGB(255, 30, 60), life: 0.2 }); continue; }
    if (!h.up) { h.up = true; SFX.play('gib', 0.35); spray(h.x, h.y, floorAt(h.x, h.y) + 0.2, 0, 0, 2.2, 14, 3, 0.5, 'flesh'); paintFloor(h.x, h.y, 0.35, 200); G.shake += 0.8; }
    if (!h.hit && h.t < 0.3 && Math.hypot(P.x - h.x, P.y - h.y) < 0.62 && P.z - groundUnder(P.x, P.y, 0.1) < 0.45) { h.hit = true; hurtPlayer(h.dmg, h.x, h.y, { unblockable: true, nopd: false }); }
  }
  G.hazards = G.hazards.filter(h => h.t < (h.kind === 'venom' ? 3.2 : 0.95));
}
// floor telegraphs: glowing marks show where each attack will land
function bossTelegraph(e, k) {
  const n = 3; const a0 = e.lockA;
  const col = e.atk === 'thrust' ? RGB(255, 220, 80) : e.atk === 'sweep' ? RGB(255, 40, 60) : e.atk === 'combo' ? RGB(255, 120, 60) : RGB(200, 60, 255);
  for (let i = 0; i < n; i++) {
    let x, y;
    if (e.atk === 'thrust') { const r = rand(0.8, 5.2) * Math.min(1, k * 1.4); x = e.x + Math.cos(a0) * r + rand(-0.12, 0.12); y = e.y + Math.sin(a0) * r + rand(-0.12, 0.12); }
    else if (e.atk === 'sweep' || e.atk === 'combo') { const arc = e.atk === 'combo' ? 1.1 : 1.25; const a = a0 + rand(-arc, arc); const r = rand(1.0, 3.0); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; }
    else { const r = rand(0.8, 6); x = e.x + Math.cos(a0) * r + rand(-0.4, 0.4); y = e.y + Math.sin(a0) * r + rand(-0.4, 0.4); }
    addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.03 * k, col, life: 0.18 });
  }
}
function updateBossDeath(e, dt) {
  if (typeof golemDeathTick === 'function') golemDeathTick(e);
  if (typeof beastDeathTick === 'function') beastDeathTick(e);
  e.bossDeath += dt; const t = e.bossDeath;
  if (t < 2.4) { // kneels as shafts of violet light tear out of him
    if (Math.random() < dt * 22) addP({ k: 'ecto', x: e.x + rand(-0.3, 0.3), y: e.y + rand(-0.3, 0.3), z: e.z + rand(0.4, 2), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(2, 5), size: rand(0.05, 0.1), col: Math.random() < 0.6 ? RGB(210, 120, 255) : RGB(255, 240, 255), life: 0.9 });
    if (Math.random() < dt * 3) { SFX.play('glint', 0.5); G.flashG = Math.max(G.flashG || 0, 0.12); }
    if (t > 1.0 && !e.kneelT) { e.kneelT = 1; SFX.play('land', 1); dust(e.x, e.y, e.z, 14); G.shake += 4; }
  }
  if (Math.random() < dt * 14) { spray(e.x + rand(-0.4, 0.4), e.y + rand(-0.4, 0.4), e.z + e.h * rand(0.4, 0.9) * (1 - t / 3), rand(-1, 1), rand(-1, 1), 1.6, 12, 4.5, 0.8, 'flesh', 1.4); G.shake += 0.6; }
  if (Math.random() < dt * 6) wallSplatNear(e.x, e.y, 1.2);
  if (t > 2.4 && !e.dburst) {
    e.dburst = true; G.shake += 16; G.hitstop = 0.22; G.flashR = 0.3; G.flashG = 0.9; G.zoom = 0.14; G.slow = 1.2; rumbleFx('bossDeath'); SFX.play('finisher'); SFX.play('gib'); SFX.play('roar', 0.8);
    for (const o of G.enemies) if (o.summoned && o.alive) damageEnemy(o, 999, { src: 'sword', heavy: true });
    spray(e.x, e.y, e.z + 1.2, 0, 0, 0.9, 240, 8, Math.PI, 'flesh', 1.8); gibs(e.x, e.y, e.z + 1.2, 26, 'flesh', 1.5);
    const pc = (sub, w, h, z) => addP({ k: 'piece', tex: e.d.spr, sub, x: e.x, y: e.y, z, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(3, 7), rot: 0, vr: rand(-10, 10), w, h, life: 99, rest: false, mat: 'flesh', bleed: 3 });
    pc([0.25, 0, 0.75, 0.22], e.w * 0.5, e.h * 0.22, e.z + 2.1); pc([0, 0.2, 0.5, 0.55], e.w * 0.5, e.h * 0.35, e.z + 1.4); pc([0.5, 0.2, 1, 0.55], e.w * 0.5, e.h * 0.35, e.z + 1.4); pc([0.4, 0.5, 0.62, 1], e.w * 0.22, e.h * 0.5, e.z + 0.8);
    for (let i = 0; i < 30; i++) paintFloor(e.x + rand(-2.5, 2.5), e.y + rand(-2.5, 2.5), rand(0.2, 0.6), 220);
    for (let i = 0; i < 16; i++) wallSplatNear(e.x, e.y, rand(0.5, 3));
    screenSplat(18, 1.5);
    const k = mkPickup('key', e.x, e.y); k.z = 1.5; G.pickups.push(k);
    if (SFX.mus) SFX.mus.boss = false;
    toast((e.d.title || 'THE VAMPIRE KNIGHT') + ' IS SLAIN', 'Take the reliquary key.', '#ffe080', 4);
  }
}

// ---------- projectiles ----------
function updateProjectiles(dt) {
  for (const p of G.projectiles) {
    if (p.dead) continue;
    p.life -= dt; if (p.life <= 0) { p.dead = true; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const c = cellAt(p.x, p.y);
    if (c < 0 || SOLID[c] || FH[c] > p.z) { p.dead = true; sparks(p.x, p.y, p.z, 12, p.type === 'bloodwave' ? RGB(255, 40, 60) : RGB(255, 150, 40)); if (p.type === 'bloodwave') { paintFloor(p.x, p.y, 0.4, 200); wallSplatNear(p.x, p.y, 0.6); } continue; }
    if (p.type === 'fireball' && Math.random() < 0.6) addP({ k: 'ember', x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0.4, size: 0.04, col: RGB(255, 140, 30), life: 0.35 });
    if (p.type === 'bloodwave' && Math.random() < 0.8) { paintFloor(p.x, p.y, 0.12, 120); addP({ k: 'blood', x: p.x + rand(-0.3, 0.3), y: p.y + rand(-0.3, 0.3), z: p.z, vx: 0, vy: 0, vz: 1.5, size: 0.05, col: MAT.flesh[1], life: 1, mat: 'flesh' }); }
    if (p.reflected) {
      for (const e of G.enemies) { if (!e.alive) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 0.3 && p.z > e.z && p.z < e.z + e.h) { p.dead = true; damageEnemy(e, 34, { dx: p.vx / 7, dy: p.vy / 7, kb: 2, heavy: true, src: 'reflect', col: '#ffc040' }); break; } }
      continue;
    }
    const dpl = Math.hypot(p.x - P.x, p.y - P.y);
    if (dpl < 0.5 && p.z > P.z - 0.1 && p.z < P.z + 1.8) {
      if (p.low && P.z - groundUnder(P.x, P.y, 0.1) > 0.3) continue;
      const r = hurtPlayer(p.dmg, p.x - p.vx * 0.1, p.y - p.vy * 0.1, { src: null });
      if (p.onHit) p.onHit(r);
      if (r === 'dodged') continue;
      if (r === 'parry' && p.type === 'fireball') { p.reflected = true; const o = p.owner; const a = o && o.alive ? Math.atan2(o.y - p.y, o.x - p.x) : P.ang; p.vx = Math.cos(a) * 9; p.vy = Math.sin(a) * 9; p.vz = o && o.alive ? ((o.z + o.h / 2) - p.z) / Math.max(0.5, Math.hypot(o.x - p.x, o.y - p.y)) * 9 : 0; p.life = 3; toast('REFLECTED!', '', '#ffc040', 1); continue; }
      p.dead = true; sparks(p.x, p.y, p.z, 10, RGB(255, 140, 40));
    }
  }
  G.projectiles = G.projectiles.filter(p => !p.dead);
}

// ---------- events ----------
// ---------- v2.3 atmosphere: drifting purple/green ground fog + dust motes around the Baron ----------
const WISP_N = 22;
function updateAtmos(dt) {
  if (!G.wisps) G.wisps = [];
  const W_ = G.wisps;
  for (let i = W_.length - 1; i >= 0; i--) { const w = W_[i]; w.t += dt; w.x += w.vx * dt; w.y += w.vy * dt; if (w.t > w.life || Math.hypot(w.x - P.x, w.y - P.y) > 10 || isSolid(cellAt(w.x, w.y))) W_.splice(i, 1); }
  let tries = 0;
  while (W_.length < WISP_N && tries++ < 6) {
    const a = rand(0, Math.PI * 2), d = rand(1.5, 8.5); const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    const ci = cellAt(x, y); if (ci < 0 || isSolid(ci)) continue;
    const green = Math.random() < 0.38;
    W_.push({ x, y, z: floorAt(x, y) + rand(0.05, 0.45), rw: rand(0.9, 1.8), rh: rand(0.22, 0.42), vx: rand(-0.12, 0.12), vy: rand(-0.12, 0.12), t: 0, life: rand(6, 11),
      c: green ? [40, 170, 110] : [120, 60, 200], a: rand(0.42, 0.7) });
  }
  // dust motes drifting in the air near you (pick up the local light colour)
  if (Math.random() < dt * 22) {
    const a = rand(0, Math.PI * 2), d = rand(0.8, 4.5); const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (!isSolid(cellAt(x, y))) { const L = [0, 0, 0]; lightAt(x, y, L); const k = 26; addP({ k: 'mote', x, y, z: floorAt(x, y) + rand(0.2, 2.2), vx: rand(-0.06, 0.06), vy: rand(-0.06, 0.06), vz: rand(-0.04, 0.05), size: 0.022, col: RGB(Math.min(255, 18 + L[0] * k), Math.min(255, 14 + L[1] * k), Math.min(255, 26 + L[2] * k)), life: rand(2, 4) }); }
  }
}
function renderAtmos(cam) {
  if (!G.wisps || !FX.on) return;
  for (const w of G.wisps) {
    const k = Math.min(1, w.t / 1.5, (w.life - w.t) / 2); if (k <= 0) continue;
    const br = 0.85 + 0.15 * Math.sin(G.t * 0.7 + w.x);
    drawWisp(cam, w.x, w.y, w.z, w.rw * br, w.rh, w.c[0], w.c[1], w.c[2], w.a * k);
  }
}
function updateEvents(dt) {
  for (const s of LEVEL.secrets) {
    if (s.found) continue; const b = s.box;
    if (P.x >= b[0] && P.x < b[2] && P.y >= b[1] && P.y < b[3] && P.z >= s.minZ) {
      s.found = true; SFX.play('secret'); if (RUN.on) { RUN.secrets = (RUN.secrets || 0) + 1; if (typeof shardGain === 'function') shardGain(10, null); } G.bigText = { img: 'txt_secret', t1: s.name, t2: 'Secret ' + LEVEL.secrets.filter(q => q.found).length + ' of ' + LEVEL.secrets.length, t: 0, dur: 3.4 };
      if (s.id === 'baptistry') openSecretWall(true);
    }
  }
  for (const s of LEVEL.signs) { if (!s.shown && Math.hypot(P.x - s.x, P.y - s.y) < s.r) { s.shown = true; const pad = G.inputMode === 'pad' && s.padText; toast(pad ? s.padText : s.text, pad ? s.padText2 : s.text2, '#ffe9a0', 4.5); } }
  // the Lich King's projection after the first secret
  const anyFound = LEVEL.secrets.some(s => s.found);
  if (anyFound && !G.lichDone && LEVEL.kind === 'castle' && P.x > 10.5 && P.x < 24 && P.y > 14 && P.y < 32 && P.z < 0.5) {
    G.lichDone = true; G.lich = { x: 17.5, y: 12.6, z: 1.3, t: 0 }; SFX.play('ghost'); SFX.play('roar', 0.5);
    toast('"Found a toy, Baron? How charming."', '"Let my children play with you."', '#d090ff', 4.5);
    setTimeout(() => toast('KAEL: "Keep talking. I\'m coming up there."', '', '#ffe080', 3), 3800);
    for (const [x, y] of [[14.5, 18.5], [20.5, 18.5], [17.5, 22.5], [13.5, 24.5]]) { const z = makeEnemy(x === 17.5 ? 'azombie' : 'zombie', x, y, { rise: true }); z.awake = true; z.blood = 0.3; z.summoned = true; G.enemies.push(z); }
  }
  if (G.lich) { G.lich.t += dt; if (G.lich.t > 6) G.lich = null; else if (Math.random() < dt * 30) addP({ k: 'ecto', x: G.lich.x + rand(-0.4, 0.4), y: G.lich.y + rand(-0.3, 0.3), z: G.lich.z + rand(0, 1.8), vx: 0, vy: 0, vz: 0.6, size: 0.06, col: RGB(180, 80, 255), life: 1 }); }
  if (G.victoryAt && G.time > G.victoryAt && G.state === 'play' && RUN.on) { G.victoryAt = 0; startPick(); return; }
  if (G.victoryAt && G.time > G.victoryAt && G.state === 'play') { G.state = 'victory'; G.vicT = 0; if (document.exitPointerLock) document.exitPointerLock(); SFX.play('secret'); }
  // ambient: embers & motes
  updateAtmos(dt);
  if (Math.random() < dt * 25) { const pr = LEVEL.props[(Math.random() * LEVEL.props.length) | 0]; if (pr.type === 'torch' || pr.type === 'brazier') addP({ k: 'ember', x: pr.x + rand(-0.05, 0.05), y: pr.y + rand(-0.05, 0.05), z: pr.z + (pr.type === 'brazier' ? 1.1 : 0.35), vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), vz: rand(0.4, 1.0), size: 0.025, col: pr.green ? RGB(80, 255, 140 + (Math.random() * 80 | 0)) : RGB(255, 150 + (Math.random() * 80 | 0), 40), life: rand(0.6, 1.4) }); }
  if (Math.random() < dt * 14) { const s = LEVEL.shafts[(Math.random() * LEVEL.shafts.length) | 0]; addP({ k: 'mote', x: s.x + rand(-0.4, 0.4), y: s.y + rand(-0.4, 0.4), z: rand(s.z0, s.z1 * 0.8), vx: rand(-0.05, 0.05), vy: rand(-0.05, 0.05), vz: rand(-0.06, 0.06), size: 0.02, col: RGB(s.c[0] * 0.7 | 0, s.c[1] * 0.7 | 0, s.c[2] * 0.7 | 0), life: rand(2, 4) }); }
}

// ---------- setup / reset ----------
function newGame() {
  RUN.ready = false; buildStage(); if (RUN.on) LEVEL.spawns = rogueSpawns(LEVEL.spawns);
  Object.assign(ARENA, LEVEL.arena || { x0: 9.7, x1: 25.3, y0: 1.7, y1: 8.3 }); FDEC.clear(); WDEC.clear(); DRIPS.length = 0; DOORANIM.length = 0;
  G.enemies = []; G.particles = []; G.projectiles = []; G.hazards = []; G.dmgNums = []; G.toasts = []; G.screenBlood = [];
  G.kills = 0; G.time = 0; G.checkpoint = 0; G.lich = null; G.lichDone = false; G.ambushDone = false; G.victoryAt = 0; G.finisher = null; G.bigText = null; G.deaths = 0;
  for (const s of LEVEL.spawns) { const e = makeEnemy(s[0], s[1], s[2], { ambush: s[3] === 'ambush' }); if (s[3] === 'elite') { e.forceElite = true; e.eliteRoom = true; } G.enemies.push(e); }
  G.boss = makeEnemy(LEVEL.bossType || 'vknight', LEVEL.boss.x, LEVEL.boss.y); G.boss.flip = false; G.enemies.push(G.boss);
  if (G.boss.type === 'colossus') { G.boss.hidden = true; G.boss.r = 1.0; }
  if (typeof m4NewStage === 'function') m4NewStage();
  if (typeof m5NewStage === 'function') m5NewStage();
  if (G.boss.type === 'spider') { G.boss.hidden = true; G.boss.z = 4.6; G.boss.w = 3.0; G.boss.r = 1.05; }
  G.totalEnemies = G.enemies.length;
  if (RUN.on) rogueStagePost();
  RUN.ready = true;
  G.pickups = LEVEL.pickups.map(p => ({ ...mkPickup(p.type, p.x, p.y), drop: false, amt: p.amt }));
  Object.assign(P, { x: LEVEL.start.x, y: LEVEL.start.y, z: 0, vz: 0, vx: 0, vy: 0, ang: LEVEL.start.ang, pitch: 0, hp: 100, maxhp: 100, mana: 30, maxmana: 50, hasPistol: false, hasEdge: false, off: 'whip', swapT: 0, swapTo: null, rolls: 0, sw: null, whip: null, pistol: null, bash: null, latch: null, punish: 0, iframes: 0 });
  P.lastSafe = { x: P.x, y: P.y, z: 0 };
  for (const h of LEVEL.hooks) h.used = false;
  if (SFX.mus) SFX.mus.boss = false;
}
function respawn() {
  const c = LEVEL.checkpoints[G.checkpoint];
  Object.assign(P, { x: c.x, y: c.y, z: floorAt(c.x, c.y), vz: 0, vx: 0, vy: 0, ang: c.ang, pitch: 0, hp: P.maxhp, mana: P.maxmana, swapT: 0, swapTo: null, sw: null, whip: null, pistol: null, bash: null, latch: null, iframes: 1.5 });
  G.finisher = null; G.projectiles = []; G.hazards = []; G.screenBlood = [];
  // reset the boss fight if it was in progress
  const b = G.boss; const D = LEVEL.doors.gate;
  if (b && b.alive && D.state === 'sealed') {
    Object.assign(b, { x: LEVEL.boss.x, y: LEVEL.boss.y, z: 0, hp: b.maxhp, blood: 0, state: 'idle', awake: false, phase2: false, stagger: 0, kbx: 0, kby: 0, landed: false, mistA: 1, intangible: false, mistTo: null, poise: 0, hpLag: undefined });
    G.enemies = G.enemies.filter(e => !(e.summoned && e.alive));
    G.enemies = G.enemies.filter(e => !(e.type === 'bat' && e.alive && e.y < 9));
    D.state = 'open'; SOLID[9 * MW + 17] = 0; FH[9 * MW + 17] = 0; if (SFX.mus) SFX.mus.boss = false;
  }
  for (const e of G.enemies) if (e.alive && Math.hypot(e.x - P.x, e.y - P.y) < 4 && !e.d.boss) { e.awake = false; e.x += (e.x - P.x) * 0.5; }
  G.state = 'play';
}

// ---------- visuals: enemies ----------
function enemyVisual(e) {
  if (e.hidden) return null;
  const d = e.d, t = e.t;
  let w = e.w, h = e.h, z = e.z, skew = 0, lean = 0, wave = 0, waveF = 6, waveP = 0, legs = 0, tint = e.tint, flash = e.flash, alpha = d.mat === 'ecto' ? 0.7 : 1, tex = d.spr, sub = null, glow = 0;
  if (e.dead) {
    const dt = e.deathT;
    switch (e.deathType) {
      case 'collapse': { // knees buckle, then he topples sideways
        const k1 = ease(Math.min(1, dt / 0.3)), k2 = ease(clamp((dt - 0.38) / 0.42, 0, 1));
        h *= (1 - 0.2 * k1) * (1 - 0.68 * k2); w *= 1 + 0.08 * k1 + 0.5 * k2; lean = -0.25 * k1 * (1 - k2); skew = e.deathSide * (0.12 * k1 + 0.5 * k2) + Math.sin(dt * 30) * 0.04 * (1 - k2);
        tint = [255, 20, 30, Math.max(0, 0.5 - dt * 2)]; if (k2 > 0.3) tint = [70, 0, 10, 0.3 * k2]; flash = Math.max(0, 0.8 - dt * 4); if (dt > 0.78 && dt < 0.84 && !e.thud) { e.thud = true; dust(e.x, e.y, e.z, 6); SFX.play('land', 0.5); } break; }
      case 'dismember': { const k = ease(Math.min(1, dt / 0.6)); sub = e.sub; h = e.h * 0.58 * (1 - 0.55 * k); w *= 1 + 0.3 * k; skew = e.deathSide * 0.35 * k; tint = [90, 0, 10, 0.35 * k]; break; }
      case 'burst': if (dt > 0.09) return null; w *= 1.3; h *= 1.12; flash = 1; break;
      case 'bones': { tex = 'bonepile'; w = 0.9; h = 0.32; flash = 0; if (e.reT < 1.2) skew = Math.sin(t * 40) * 0.08; tint = null; e.bloodHide = true; break; }
      case 'fade': { if (dt > 0.9) return null; alpha *= 1 - dt / 0.9; wave = 0.2 * dt; z += dt * 0.9; h *= 1 + dt * 0.5; break; }
      case 'boss': { if (e.dburst) return null; const k = Math.min(1, e.bossDeath / 2.4); h *= 1 - 0.32 * k; w *= 1 + 0.12 * k; skew = Math.sin(t * 45) * 0.04 * k; tint = [255, 20, 40, 0.25 + 0.2 * Math.sin(t * 20)]; flash = Math.max(0, Math.sin(t * 9)) * 0.5 * k; break; }
      default: return null;
    }
    return { tex, x: e.x, y: e.y, z, w, h, flip: e.flip, skew, lean, wave, waveF, waveP, legs, tint, flash, blood: e.deathType === 'bones' ? 0 : Math.max(e.blood, 0.5), alpha, sub };
  }
  const ph = e.walk;
  // locomotion cycles
  if (!d.fly) { // walk cycle: bob on each step, hip sway, legs scissor
    const step = Math.abs(Math.sin(ph)), moving = e.state === 'chase' ? 1 : 0.35;
    z += step * 0.075 * h * moving; legs = Math.sin(ph) * 0.12 * moving; skew += Math.sin(ph) * 0.045 * moving;
    h *= 1 - 0.05 * (1 - step) * moving; w *= 1 + 0.04 * (1 - step) * moving;
    wave = 0.018 * Math.sin(t * 2.1); waveF = 5; waveP = t * 2;
    h *= 1 + 0.015 * Math.sin(t * 2.4);
  }
  switch (e.type) {
    case 'zombie': skew += Math.sin(ph * 0.5) * 0.09; wave += 0.02 * Math.sin(t * 3); break;
    case 'fzombie': lean += 0.16; legs *= 1.8; skew += Math.sin(ph) * 0.05; break;
    case 'azombie': legs *= 0.6; skew += Math.sin(ph * 0.5) * 0.04; break;
    case 'skeleton': skew += (Math.random() - 0.5) * 0.02 + Math.sin(ph * 0.5) * 0.05; break;
    case 'bat': { const f = Math.abs(Math.sin(t * 15)); h *= 0.6 + 0.55 * f; w *= 1.08 - 0.18 * f; z += Math.sin(t * 15) * 0.04; wave = 0.04; waveF = 8; waveP = t * 15; break; }
    case 'imp': { h *= 0.86 + 0.2 * Math.sin(t * 18); z += Math.sin(t * 4) * 0.08; skew = Math.sin(t * 2) * 0.06; break; }
    case 'ghost': { wave = 0.09; waveF = 5; waveP = t * 3.2; z += Math.sin(t * 1.7) * 0.1; alpha = 0.62 + 0.1 * Math.sin(t * 5); glow = 0.3; break; }
    case 'vknight': { wave = 0.03 * Math.sin(t * 1.5); waveF = 4; waveP = t * 2; legs *= 0.7; if (e.phase2) tint = [200, 60, 255, 0.12 + 0.08 * Math.sin(t * 6)]; break; }
  }
  const wuDur = d.boss ? (BOSS_WU[e.atk] || 0.7) / (e.phase2 ? 1.25 : 1) : d.windup;
  if (e.state === 'windup') {
    const k = clamp(e.st / wuDur, 0, 1);
    h *= 1 + 0.13 * k; w *= 1 - 0.08 * k; lean -= 0.28 * k; skew += (Math.random() - 0.5) * 0.05 * k - e.side * 0.1 * k; legs = 0;
    const pulse = (0.5 + 0.5 * Math.sin(t * 38)) * k;
    const tc = d.boss ? (e.atk === 'thrust' ? [255, 220, 80] : e.atk === 'sweep' ? [255, 40, 40] : e.atk === 'combo' ? [255, 130, 50] : e.atk === 'mist' ? [190, 60, 255] : e.atk === 'plunge' ? [255, 255, 255] : [255, 60, 160]) : d.ranged ? [255, 160, 40] : [255, 235, 150];
    tint = [tc[0], tc[1], tc[2], 0.15 + 0.35 * pulse]; glow = 0.2 * k;
    if (e.st < 0.1) flash = Math.max(flash, (1 - e.st / 0.1) * 0.55); // glint on wind-up start
  } else if (e.state === 'strike') { const cs = e.atk === 'combo' ? (e.hits % 2 ? 1 : -1) : e.side; lean += 0.48; w *= 1.2; h *= 0.9; skew += cs * 0.16; z -= 0.02 * h; }
  else if (e.state === 'recover') { const k = 1 - clamp(e.st / (d.recover || 0.6), 0, 1); lean += 0.24 * k; h *= 1 - 0.09 * k; w *= 1 + 0.05 * k; skew += Math.sin(t * 6) * 0.03 * k; }
  if (e.state === 'down') { // knocked flat, then scrambles up
    const el = e.downMax - e.downT, kf = Math.min(1, 0.5 + el / 0.12), ku = ease(clamp((0.35 - e.downT) / 0.35, 0, 1)); const k = kf * (1 - ku);
    h *= 1 - 0.62 * k; w *= 1 + 0.45 * k; skew += e.hurtSide * 0.45 * k; lean -= 0.3 * k; legs = 0; tint = [255, 30, 30, 0.25 * k];
  }
  if (d.boss && e.state === 'cast') { h *= 1.08; glow = 0.4; }
  if (d.boss && e.mistA < 1) { alpha *= e.mistA; wave += 0.25 * (1 - e.mistA); waveF = 9; waveP = t * 12; tint = [150, 0, 40, 0.6 * (1 - e.mistA)]; }
  if (d.boss && e.state === 'plunge') { h *= 1.12; w *= 0.88; skew = 0; lean = 0.2; }
  if (d.boss && e.state === 'windup' && e.atk === 'plunge') { const k = clamp(e.st / 0.45, 0, 1); h *= 1 - 0.18 * k; w *= 1 + 0.12 * k; }
  if (d.boss && e.state === 'windup' && (e.atk === 'bats' || e.atk === 'spikes')) { h *= 1 + 0.06 * Math.sin(t * 25); glow = 0.45; tint = e.atk === 'bats' ? [120, 40, 255, 0.35] : [255, 20, 60, 0.4]; }
  if (e.state === 'intro' || e.state === 'rage') { h *= 1 + 0.05 * Math.sin(t * 20); skew += Math.sin(t * 31) * 0.03; tint = e.state === 'rage' ? [190, 60, 255, 0.4] : [255, 40, 40, 0.15]; }
  if (e.hurtT > 0) { // flinch: squash, recoil back, little hop; white flash fades into red
    const k = clamp(e.hurtT / (e.hurtMax || 0.3), 0, 1), bs = d.boss ? 0.45 : 1, bb = e.hurtBig ? 1.35 : 1;
    skew += e.hurtSide * 0.3 * k * bs * bb; lean -= 0.34 * k * bs * bb; h *= 1 - 0.16 * k * bs * bb; w *= 1 + 0.12 * k * bs;
    z += Math.sin((1 - k) * Math.PI) * 0.06 * h * bs * (e.hurtBig ? 1.5 : 1);
    if (flash < 0.45) tint = [255, 25, 25, 0.6 * k];
  }
  if (e.stagger > 0) { skew += Math.sin(t * 14) * 0.13; h *= 0.94; tint = [255, 20, 20, 0.28 + 0.22 * Math.sin(t * 12)]; glow = 0.15; }
  if (e.riseT < 1) { z -= h * (1 - e.riseT); skew += Math.sin(t * 20) * 0.05; }
  const vv = { tex, x: e.x, y: e.y, z, w, h, flip: e.flip, skew, lean, wave, waveF, waveP, legs, tint, flash, blood: e.blood, alpha, glow, sub, rim: e.state === 'windup' ? 2.2 : e.stagger > 0 ? 1.6 : 1 };
  return RUN.on ? rogueVisual(e, vv) : vv;
}

// ---------- render: sprites ----------
function collectSprites(cam) {
  const S = []; const t = G.t; const rx = -Math.sin(cam.ang), ry = Math.cos(cam.ang);
  for (const pr of LEVEL.props) {
    if (pr.type === 'torch') {
      S.push({ tex: 'sconce', x: pr.x, y: pr.y, z: pr.z, w: 0.14, h: 0.24 });
      const f = ((t * 11 + pr.x * 3) | 0) % 4; const fl = 1 + Math.sin(t * 17 + pr.y) * 0.08;
      S.push({ tex: (pr.green ? 'gflame' : 'flame') + f, x: pr.x, y: pr.y, z: pr.z + 0.2, w: 0.15 * fl, h: 0.24 * fl, lit: false, glow: 0.35, rim: 0 });
      S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z - 0.05, w: 0.75 * fl, h: 0.75 * fl, add: true, alpha: 0.42 * fl, lit: false, tint: pr.green ? [60, 255, 120, 1] : [255, 140, 40, 1] });
    } else if (pr.type === 'brazier') {
      S.push({ tex: 'sconce', x: pr.x, y: pr.y, z: 0, w: 0.5, h: 0.85 });
      S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: 0.35, w: 1.9, h: 1.7, add: true, alpha: 0.4 + 0.05 * Math.sin(t * 11 + pr.x), lit: false, tint: pr.green ? [60, 255, 120, 1] : [255, 70, 60, 1] });
      for (let i = 0; i < 3; i++) { const f = ((t * 12 + i * 1.7 + pr.x) | 0) % 4; const o = (i - 1) * 0.12; S.push({ tex: (pr.green ? 'gflame' : 'flame') + f, x: pr.x + rx * o, y: pr.y + ry * o, z: 0.62, w: 0.3, h: 0.55 * (1 + 0.1 * Math.sin(t * 13 + i)), lit: false, glow: 0.45 }); }
    } else if (pr.type === 'candelabra') {
      S.push({ tex: 'candelabra', x: pr.x, y: pr.y, z: 0, w: 0.5, h: 0.95 });
      for (const o of [-0.2, 0, 0.2]) { const f = ((t * 10 + o * 9 + pr.y) | 0) % 4; S.push({ tex: 'flame' + f, x: pr.x + rx * o, y: pr.y + ry * o, z: 0.86, w: 0.07, h: 0.11, lit: false }); } S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: 0.62, w: 0.9, h: 0.5, add: true, alpha: 0.3, lit: false, tint: [255, 170, 60, 1] });
    } else if (pr.type === 'relicfloat') { const bob = Math.sin(t * 2) * 0.06; S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z - 0.35 + bob, w: 1.8, h: 1.8, add: true, alpha: 0.45 + 0.1 * Math.sin(t * 3), lit: false, tint: [200, 110, 255, 1] }); S.push({ tex: 'p_reliq', x: pr.x, y: pr.y, z: pr.z + bob, w: 0.62, h: 0.62, lit: false, glow: 0.7 }); }
    else if (pr.type === 'font') S.push({ tex: 'font', x: pr.x, y: pr.y, z: pr.z, w: 0.95, h: 0.62 });
    else if (pr.type === 'bones') S.push({ tex: 'bonescatter', x: pr.x, y: pr.y, z: floorAt(pr.x, pr.y), w: 1.0, h: 0.4 });
    else if (pr.type === 'eggs') S.push({ tex: 'eggsac', x: pr.x, y: pr.y, z: floorAt(pr.x, pr.y), w: 0.8, h: 0.55, glow: 0.1 });
    else if (pr.type === 'web') S.push({ tex: 'web', x: pr.x, y: pr.y, z: pr.z, w: 1.2, h: 1.2, alpha: 0.55, lit: true, rim: 0 });
  }
  // censer (pendulum)
  if (LEVEL.hooks[1]) { const h = LEVEL.hooks[1]; const sw = Math.sin(t * 3.2) * 0.45 * Math.min(1, G.censerSwing) + Math.sin(t * 0.9) * 0.04; S.push({ tex: 'censer', x: h.x + sw, y: h.y, z: h.z - 0.75, w: 0.3, h: 0.95, glow: 0.1 }); }
  // hook glows
  const aimH = G.state === 'play' ? hookInAim() : null;
  for (const h of LEVEL.hooks) {
    if (h.used && h.id === 'halo') continue;
    const near = Math.hypot(h.x - P.x, h.y - P.y) < h.range + 1;
    const pul = 0.5 + 0.5 * Math.sin(t * 5);
    if (near || h === aimH) S.push({ tex: 'halo_glow', x: h.id === 'halo' ? h.x + 0.05 : h.x, y: h.y, z: h.z - 0.22 - (h.id === 'censer' ? 0.45 : 0), w: h === aimH ? 0.55 : 0.4, h: h === aimH ? 0.55 : 0.4, add: true, alpha: h === aimH ? 0.9 : 0.25 + 0.25 * pul, lit: false });
  }
  for (const p of G.pickups) {
    if (p.taken) continue; const D = PICK[p.type]; const tx = Engine.tex[D.tex];
    const spin = 0.25 + 0.75 * Math.abs(Math.cos(p.t * 2.4));
    S.push({ tex: D.tex, x: p.x, y: p.y, z: p.z + 0.12 + Math.sin(p.t * 3) * 0.06, w: D.h * tx.w / tx.h * spin, h: D.h, glow: 0.35 + 0.2 * Math.sin(p.t * 6), lit: false });
    S.push({ tex: 'glow_w', x: p.x, y: p.y, z: p.z - 0.1, w: 0.85, h: 0.85, add: true, alpha: 0.5 + 0.15 * Math.sin(p.t * 5), lit: false, tint: [...(D.gc || [255, 220, 120]), 1] });
  }
  for (const e of G.enemies) {
    const v = enemyVisual(e); if (!v) continue;
    if (e.alive && !e.hidden && (e.d.boss || e.type === 'ghost' || e.type === 'imp')) {
      const ph = e.d.boss && e.phase2; const c = ph ? [170, 60, 255, 1] : e.type === 'ghost' ? [60, 255, 170, 1] : e.type === 'imp' ? [255, 90, 30, 1] : [255, 30, 60, 1];
      const sz = e.d.boss ? (ph ? 3.4 : 2.6) : e.type === 'ghost' ? 1.8 : 1.1;
      S.push({ tex: 'glow_w', x: v.x, y: v.y, z: v.z + v.h * 0.5 - sz / 2, w: sz, h: sz, add: true, alpha: (e.d.boss ? (ph ? 0.3 : 0.12) : 0.3) * (0.85 + 0.15 * Math.sin(t * 7)), lit: false, tint: c, dep2: 0.01 });
      if (ph) S.push({ tex: 'glow_w', x: v.x, y: v.y, z: v.z + v.h * 0.4 - 1.5, w: 2.4 + 0.3 * Math.sin(t * 9), h: 3.0, add: true, alpha: (0.22 + 0.1 * Math.sin(t * 13)) * (e.mistA ?? 1), lit: false, tint: [255, 20, 50, 1], dep2: 0.012 });
    }
    if (e.d.boss && e.alive && e.state === 'plunge' && e.plT) { const fz = floorAt(e.plT[0], e.plT[1]); S.push({ tex: 'glow_w', x: e.plT[0], y: e.plT[1], z: fz - 0.15, w: 3.8, h: 0.6, add: true, alpha: 0.35 + 0.25 * Math.sin(t * 30), lit: false, tint: [255, 30, 50, 1] }); }
    if (!e.d.fly && !e.dead && e.type !== 'ghost') { const fx = Math.cos(cam.ang) * 0.06, fy = Math.sin(cam.ang) * 0.06, air = e.d.boss ? clamp((e.z - floorAt(e.x, e.y)) / 3.6, 0, 1) : 0; S.push({ tex: 'glow_w', x: e.x + fx, y: e.y + fy, z: floorAt(e.x, e.y) - e.w * 0.06, w: e.w * (1.1 + air * 0.6), h: e.w * (0.22 + air * 0.12), alpha: 0.55, soft: true, lit: false, tint: [10, 0, 20, 1], rim: 0 }); }
    if (e.alive && !e.hidden) v.ent = 1;
    S.push(v);
  }
  for (const hz of G.hazards) {
    const fz = floorAt(hz.x, hz.y);
    if (hz.kind === 'venom') { const k = hz.t < 0 ? 1 + hz.t / 1.0 : Math.max(0, 1 - Math.max(0, hz.t - 2.6) / 0.6); S.push({ tex: 'glow_w', x: hz.x, y: hz.y, z: fz - 0.14, w: hz.t < 0 ? 0.6 + 0.6 * k : 1.5, h: hz.t < 0 ? 0.28 : 0.42, add: true, alpha: (hz.t < 0 ? 0.2 + 0.3 * k + 0.15 * Math.sin(t * 40) : 0.55 * k), lit: false, tint: [120, 255, 40, 1] }); continue; }
    if (hz.t < 0) { const k = 1 + hz.t / 1.2; S.push({ tex: 'glow_w', x: hz.x, y: hz.y, z: fz - 0.12, w: 0.9 + 0.3 * k, h: 0.3, add: true, alpha: 0.2 + 0.3 * k + 0.15 * Math.sin(t * 40), lit: false, tint: hz.col || [255, 20, 50, 1] }); continue; }
    const r = hz.t < 0.08 ? hz.t / 0.08 : hz.t > 0.6 ? Math.max(0, 1 - (hz.t - 0.6) / 0.35) : 1;
    S.push({ tex: hz.tex || 's_spike', x: hz.x, y: hz.y, z: fz - 0.05, w: hz.tw || 0.62, h: (hz.th || (1.2 + (hz.x * 7.3 % 0.6))) * r, lit: false, glow: 0.2, tint: hz.t < 0.05 ? [255, 255, 255, 0.5] : null });
    S.push({ tex: 'glow_w', x: hz.x, y: hz.y, z: fz - 0.3, w: 1.0, h: 0.6 * r, add: true, alpha: 0.18 * r, lit: false, tint: hz.col || [255, 30, 60, 1] });
  }
  for (const p of G.projectiles) {
    if (p.spr) S.push(p.spr(p, t));
    else if (p.type === 'fireball') S.push({ tex: 'fireball', x: p.x, y: p.y, z: p.z - 0.15, w: 0.3, h: 0.3, add: true, alpha: 1, lit: false, glow: 0.5 });
    else S.push({ tex: 'bloodwave', x: p.x, y: p.y, z: p.z - 0.25, w: 1.3, h: 0.5, lit: false, glow: 0.3, flip: (G.t * 10 | 0) % 2 === 0 });
  }
  for (const p of G.particles) {
    if ((p.k === 'gib' || p.k === 'piece') && Math.hypot(p.x - cam.x, p.y - cam.y) < 0.8) continue;
    if (p.k === 'gib') S.push({ tex: p.tex, x: p.x, y: p.y, z: p.z, w: p.w, h: p.w * 0.85, rot: p.rest ? p.rot % 1.2 : p.rot, alpha: p.fade !== undefined ? p.fade : 1 });
    else if (p.k === 'impact') { const k = p.life / p.max; S.push({ tex: 'glow_w', x: p.x, y: p.y, z: p.z - p.sz * 0.5 * (1.4 - k * 0.4), w: p.sz * (1.4 - k * 0.4), h: p.sz * (1.4 - k * 0.4), add: true, alpha: 0.9 * k, lit: false, tint: [...p.col, 1] }); }
    else if (p.k === 'piece') S.push({ tex: p.tex, sub: p.sub, x: p.x, y: p.y, z: p.z, w: p.w, h: p.h, rot: p.rot, blood: 0.85, tint: [90, 0, 10, 0.2] });
  }
  if (G.lich) { const L = G.lich; const a = Math.min(1, L.t * 1.5) * Math.min(1, (6 - L.t) * 1.5); S.push({ tex: 's_lich', x: L.x, y: L.y, z: L.z + Math.sin(L.t * 2) * 0.1, w: 1.6, h: 2.4, add: true, alpha: 0.8 * a, lit: false, wave: 0.06, waveF: 6, waveP: L.t * 4, glow: 0.4 }); }
  if (RUN.on) { rogueSprites(S, t); spiderSprites(S, t); }
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  for (const s of S) s.dep = (s.x - cam.x) * dx + (s.y - cam.y) * dy;
  // anything practically inside the lens would balloon to fill the screen: drop it
  for (let i = S.length - 1; i >= 0; i--) { const s = S[i]; if (s.dep < 0.42 && Math.abs(s.x - cam.x) < 0.5 && Math.abs(s.y - cam.y) < 0.5) S.splice(i, 1); }
  S.sort((a, b) => b.dep - a.dep);
  return S;
}
const BLOOD_DARK = RGB(96, 0, 14), BLOOD_HI = RGB(255, 150, 150);
function renderParticles(cam) {
  for (const p of G.particles) {
    if (p.k !== 'blood' && Math.abs(p.x - cam.x) < 0.6 && Math.abs(p.y - cam.y) < 0.6 && Math.hypot(p.x - cam.x, p.y - cam.y) < 0.55) continue; // right on the lens they balloon into blobs
    switch (p.k) {
      case 'blood': drawDrop(cam, p, BLOOD_DARK, BLOOD_HI); break;
      case 'spark': case 'ember': case 'ecto': drawParticle(cam, p.x, p.y, p.z, p.size, p.col, true); break;
      case 'mote': drawParticle(cam, p.x, p.y, p.z, p.size, p.col, true); break;
      case 'dust': case 'smoke': drawParticle(cam, p.x, p.y, p.z, p.size * (1 + (1.4 - p.life)), p.col, false); break;
    }
  }
}

// ---------- view-model ----------
// v2.1 view-model: separate sword / gauntleted fists / vambrace forearms anchored off-screen at the shoulders
// pose = [pivotX, pivotY, rot, scale]; pivot = centre of the sword grip (inside the fist)
const VSC = 1.05, BLADE_L = 185, SW_PIV = [44, 188], SW_WRIST = [24, 24];
const SWK = [
  [[0, 408, 216, -0.72, 1], [0.14, 448, 176, 0.85, 1.0], [0.24, 458, 166, 1.15, 1.03], [0.40, 300, 148, -0.55, 1.1], [0.54, 150, 188, -1.8, 1.05], [0.68, 118, 216, -2.1, 1.0], [1, 408, 216, -0.72, 1]],
  [[0, 408, 216, -0.72, 1], [0.14, 200, 176, -1.3, 1.0], [0.24, 160, 170, -1.7, 1.03], [0.40, 284, 142, 0.1, 1.1], [0.54, 430, 184, 1.55, 1.05], [0.68, 456, 216, 1.9, 1.0], [1, 408, 216, -0.72, 1]],
  [[0, 408, 216, -0.72, 1], [0.18, 380, 156, 0.25, 1.04], [0.34, 342, 110, 0.55, 1.1], [0.48, 268, 166, -0.25, 1.2], [0.60, 214, 262, -1.2, 1.16], [0.74, 240, 282, -1.35, 1.1], [1, 408, 216, -0.72, 1]],
];
const SW_TRAIL = [[0.24, 0.62], [0.24, 0.62], [0.34, 0.66]];
const FK = [[0, 408, 216, -0.72, 1], [0.18, 440, 250, 0.55, 1.12], [0.28, 256, 158, -0.04, 1.5], [0.45, 260, 163, 0.28, 1.45], [0.62, 408, 216, -0.72, 1]];
// Catmull-Rom through the keys: one continuous arc instead of stop-start segments
function samplePose(keys, t) {
  const n = keys.length; if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < n - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1), u2 = u * u, u3 = u2 * u;
      const p0 = keys[Math.max(0, i - 1)], p3 = keys[Math.min(n - 1, i + 2)]; const out = [];
      for (let k = 1; k <= 4; k++) out.push(0.5 * (2 * a[k] + (-p0[k] + b[k]) * u + (2 * p0[k] - 5 * a[k] + 4 * b[k] - p3[k]) * u2 + (-p0[k] + 3 * a[k] - 3 * b[k] + p3[k]) * u3));
      return out;
    }
  }
  return keys[n - 1].slice(1);
}
const VM = {};
function tinted(name, col) {
  const k = name + col; if (VM[k]) return VM[k];
  const im = Engine.imgs[name]; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); VM[k] = c; return c;
}
// blood on the blade (only the blade area)
function bloodyBlade() {
  if (VM.bblade) return VM.bblade;
  const im = Engine.imgs.vm_sword2; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 90; i++) { x.fillStyle = ['#b0001a', '#e01030', '#7a0010'][i % 3]; const yy = 14 + Math.random() * 132; x.fillRect(34 + Math.random() * 18, yy, 2 + Math.random() * 4, 2 + Math.random() * 9); }
  VM.bblade = c; return c;
}
P.swordBlood = 0;
function drawRot(ctx, img, px, py, x, y, rot, sc, alpha = 1, op, fy = 1) {
  ctx.save(); ctx.globalAlpha = alpha; if (op) ctx.globalCompositeOperation = op;
  ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.scale(sc, sc * fy); ctx.drawImage(img, -px, -py); ctx.restore();
}
// forearm: anchored at the wrist, aimed at an off-screen shoulder, stretched lengthwise to reach it
const H3D = {"vm_rh3d":{"fw":128,"fh":128,"frames":[{"c":[64.0,64.0],"ang":-2.129,"arm":[109.6,108.9],"aw":17.5,"k":-2.1},{"c":[64.0,64.0],"ang":-1.629,"arm":[117.0,108.0],"aw":17.5,"k":-1.6},{"c":[64.0,64.0],"ang":-1.072,"arm":[82.4,117.9],"aw":14.4,"k":-1.1},{"c":[64.0,64.0],"ang":-0.749,"arm":[73.9,117.5],"aw":17.6,"k":-0.72},{"c":[64.0,64.0],"ang":0.01,"arm":[68.9,116.2],"aw":13.7,"k":0.0},{"c":[64.0,64.0],"ang":0.53,"arm":[91.3,117.0],"aw":15.2,"k":0.5},{"c":[64.0,64.0],"ang":0.971,"arm":[77.9,116.5],"aw":15.0,"k":1.0},{"c":[64.0,64.0],"ang":1.53,"arm":[61.9,117.4],"aw":14.1,"k":1.5},{"c":[64.0,64.0],"ang":1.93,"arm":[44.3,117.6],"aw":15.0,"k":1.9}]},"vm_lw3d":{"fw":128,"fh":128,"frames":[{"c":[64.0,64.0],"ang":0.748,"arm":[46.6,117.3],"aw":17.0,"k":0.72},{"c":[64.0,64.0],"ang":0.328,"arm":[42.6,116.2],"aw":16.4,"k":0.3},{"c":[64.0,64.0],"ang":-0.324,"arm":[41.6,117.6],"aw":15.9,"k":-0.35},{"c":[64.0,64.0],"ang":0.95,"arm":[36.3,112.7],"aw":17.0,"k":0.95},{"c":[64.0,64.0],"ang":1.3,"arm":[21.2,100.3],"aw":17.0,"k":1.3},{"c":[64.0,64.0],"ang":1.55,"arm":[13.6,88.6],"aw":17.0,"k":1.55}]},"vm_ls3d":{"fw":128,"fh":128,"frames":[{"c":[64.0,64.0],"ang":-0.982,"arm":[39.3,109.0],"aw":13.6,"dors":-0.95,"k":-0.78},{"c":[64.0,64.0],"ang":-0.798,"arm":[31.9,105.2],"aw":13.6,"dors":-1.0,"k":-0.7}]}};
// v2.4: baked 3D gauntlet frames (v2.8: whip fist = exact mirror of the sword grip; snap/crack/follow frames rotate it rigidly with the forearm, tools/whip28_*.py). Pick the frame baked nearest this weapon angle, then rotate by the residual so the
// baked grip axis lies exactly on the weapon grip. Returns the forearm anchor (screen) so the vambrace can run off-screen.
function h3dFrame(name, R) { const m = H3D[name]; let bi = 0, bd = 1e9; for (let i = 0; i < m.frames.length; i++) { const d = Math.abs(m.frames[i].k - R); if (d < bd) { bd = d; bi = i; } } return [m, m.frames[bi], bi]; }
function h3dArm(name, X, Y, R, S) { const [m, f] = h3dFrame(name, R); const rot = R - f.ang; const p = local(X, Y, rot, S, f.arm[0] - f.c[0], f.arm[1] - f.c[1]); p.push(f.aw * S); return p; }
// vambrace strip baked with the same shader; its top width matches the baked forearm where the hand frame hands over
function drawArm3(ctx, img, w, sx, sy) {
  const dx = sx - w[0], dy = sy - w[1]; const d = Math.hypot(dx, dy); const th = Math.atan2(-dx, dy);
  ctx.save(); ctx.translate(Math.round(w[0]), Math.round(w[1])); ctx.rotate(th); ctx.scale(2 * w[2] / (img.width - 4), Math.max(1, d / (img.height - 10))); ctx.drawImage(img, -img.width / 2, -3); ctx.restore();
}
function drawH3D(ctx, name, X, Y, R, S, alpha = 1, op) {
  const [m, f, i] = h3dFrame(name, R); const img = Engine.imgs[name]; if (!img) return;
  ctx.save(); ctx.globalAlpha = alpha; if (op) ctx.globalCompositeOperation = op;
  ctx.translate(Math.round(X), Math.round(Y)); ctx.rotate(R - f.ang); ctx.scale(S, S);
  ctx.drawImage(img, i * m.fw, 0, m.fw, m.fh, -f.c[0], -f.c[1], m.fw, m.fh); ctx.restore();
}
function drawArm(ctx, img, wx, wy, sx, sy, wsc) {
  const dx = sx - wx, dy = sy - wy; const d = Math.hypot(dx, dy); const th = Math.atan2(-dx, dy);
  ctx.save(); ctx.translate(Math.round(wx), Math.round(wy)); ctx.rotate(th); ctx.scale(wsc, clamp(d / 185, 0.7, 1.9)); ctx.drawImage(img, -38, -6); ctx.restore();
}
function local(x, y, rot, sc, lx, ly) { const c = Math.cos(rot), s = Math.sin(rot); return [x + (lx * c - ly * s) * sc, y + (lx * s + ly * c) * sc]; }
let VFY = 0.86; // blade foreshortening (points away from the camera at rest)
function tipOf(pose, f = 1) { const L = BLADE_L * VSC * pose[3] * f * VFY; return [pose[0] + Math.sin(pose[2]) * L, pose[1] - Math.cos(pose[2]) * L]; }
function drawViewModel(ctx, cam) {
  const t = G.t;
  // weapon sway: lags behind mouse/stick turning, breathes when idle
  P.sway += (clamp(-P.turnV * 7, -20, 20) - P.sway) * 0.16;
  let bx = Math.sin(P.bob) * 7 * P.bobAmt + Math.sin(t * 1.3) * 1.5 + P.sway;
  let by = Math.abs(Math.cos(P.bob)) * 6 * P.bobAmt + Math.sin(t * 1.6) * 1.6;
  by += clamp(-P.vz * 2.2, -8, 12) + P.landDip * 140 - 8;
  if (P.hurtT > 0) { bx += Math.sin(t * 60) * 3; by += 4; }
  if (P.dodgeT > 0) { const k = Math.sin((1 - P.dodgeT / ROLL_T) * Math.PI); bx += -(P.dodgeSide || 0) * 34 * k; by += (60 + 30 * Math.max(0, P.dodgeF || 0)) * k; }
  const swayRot = P.sway * 0.004 + Math.sin(t * 1.1) * 0.02 + Math.sin(P.bob) * 0.03 * P.bobAmt;
  // ---- sword (right hand)
  let pose, keys = null, st = 0;
  if (G.finisher) pose = samplePose(FK, G.finisher.t);
  else if (P.sw) { keys = SWK[P.sw.step]; st = P.sw.t / SWING[P.sw.step].dur; pose = samplePose(keys, st); }
  else { pose = [408 + Math.sin(t * 0.7) * 2, 216 + Math.sin(t * 1.4) * 1.5, -0.72 + swayRot + Math.sin(t * 0.9) * 0.025, 1]; }
  if (P.shieldUp && P.raise > 0.2 && !P.sw) pose = [lerp(pose[0], 440, P.raise), lerp(pose[1], 236, P.raise), lerp(pose[2], 0.3, P.raise), pose[3]];
  VFY += ((P.sw || G.finisher ? 0.97 : 0.86) - VFY) * 0.25;
  const X = pose[0] + bx, Y = pose[1] + by, R = pose[2], S = pose[3] * VSC;
  // magical trail: violet ribbon (white-hot core) following the blade through the strike
  if (keys) {
    const [s0, s1] = SW_TRAIL[P.sw.step];
    if (st > s0 && st < s1 + 0.14) {
      const tEnd = Math.min(st, s1), tStart = Math.max(s0, tEnd - 0.13), ff = st > s1 ? Math.max(0, 1 - (st - s1) / 0.14) : 1;
      const red = P.punish > 0; const N = 14;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const pp = samplePose(keys, tStart + (tEnd - tStart) * i / N); pp[0] += bx; pp[1] += by;
        const tip = tipOf(pp), base = tipOf(pp, 0.5), core = tipOf(pp, 0.8);
        if (prev) {
          const k = Math.pow(i / N, 1.6) * ff;
          const fr = P.wpn && P.wpn.sword === 'frost', TC = SWTRAIL[(P.wpn && P.wpn.sword) || 'base'] || SWTRAIL.base;
          ctx.globalAlpha = 0.3 * k; ctx.fillStyle = red ? '#ff2050' : TC[0];
          ctx.beginPath(); ctx.moveTo(prev.tip[0], prev.tip[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(base[0], base[1]); ctx.lineTo(prev.base[0], prev.base[1]); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.4 * k * k; ctx.fillStyle = red ? '#ffd0d8' : TC[1];
          ctx.beginPath(); ctx.moveTo(prev.tip[0], prev.tip[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(core[0], core[1]); ctx.lineTo(prev.core[0], prev.core[1]); ctx.closePath(); ctx.fill();
          if ((i * 7 + (t * 60 | 0)) % 5 === 0) { ctx.globalAlpha = k; ctx.fillStyle = fr ? (i % 2 ? '#a0e8ff' : '#ffffff') : i % 2 ? '#60ffb0' : '#ffffff'; ctx.fillRect(Math.round(tip[0] + rand(-4, 4)), Math.round(tip[1] + rand(-4, 4)), 2, 2); }
        }
        prev = { tip, base, core };
      }
      ctx.restore();
    }
  }
  const S3 = S / VSC, wr = h3dArm('vm_rh3d', X, Y, R, S3 * 1.1);
  drawArm3(ctx, Engine.imgs.vm_rarm3d, wr, 530 - (530 - wr[0]) * 0.45 + bx * 0.4, 352 + by * 0.3);
  const FROST = P.wpn && P.wpn.sword === 'frost', SWK_ = (P.wpn && P.wpn.sword) || 'base', SWS = SWSPR[SWK_] || SWSPR.base;
  drawRot(ctx, Engine.imgs[SWS[0]], SW_PIV[0], SW_PIV[1], X, Y, R, S, 1, null, VFY);
  if (P.swordBlood > 0.02) drawRot(ctx, bloodyBlade(), SW_PIV[0], SW_PIV[1], X, Y, R, S, clamp(P.swordBlood, 0, 1), null, VFY);
  const runeA = (P.sw ? 0.95 : 0.5 + 0.25 * Math.sin(t * 3)) * (P.hasEdge ? 1.2 : 1);
  drawRot(ctx, Engine.imgs[SWS[1]], SW_PIV[0], SW_PIV[1], X, Y, R, S, clamp(runeA * (FROST || SWK_ === 'storm' ? 1.15 : 1), 0, 1), 'lighter', VFY);
  if (typeof wpnFX === 'function') wpnFX(ctx, SWS[0], SWK_, X, Y, R, S, VFY, t);
  if (FROST) frostBlade(ctx, X, Y, R, S, t);
  if (SWK_ === 'storm') stormBlade(ctx, X, Y, R, S, t);
  if (SWK_ === 'rapier') rapierBlade(ctx, X, Y, R, S, t);
  if (P.punish > 0) drawRot(ctx, tinted('vm_sword2', '#ff2040'), SW_PIV[0], SW_PIV[1], X, Y, R, S, 0.3 + 0.2 * Math.sin(t * 20), 'lighter', VFY);
  drawH3D(ctx, 'vm_rh3d', X, Y, R, S3 * 1.1);
  // ---- left hand: shield / whip (swap lowers one off-screen and raises the other) / pistol
  let drop = 0;
  if (P.swapT > 0) { const k = 1 - P.swapT / P.swapDur; const e = k < 0.5 ? k * 2 : (1 - k) * 2; drop = (1 - Math.pow(1 - e, 2)) * 175; }
  if (P.pistol && P.wpn && P.wpn.ranged === 'crossbow') {
    drawCrossbow(ctx, bx, by, t);
  } else if (P.pistol) {
    const k = Math.max(0, 1 - P.pistol.t / 0.16);
    const x = 70 + bx, y = 150 + by + 28 * k, rot = -0.18 * k + 0.12;
    drawRot(ctx, Engine.imgs.vm_pistol, 50, 100, x + 50, y + 100, rot, 1.05);
    if (P.pistol.t < 0.07) drawRot(ctx, Engine.imgs.muzzle, 20, 20, x + 52 + Math.sin(rot) * 100, y + 2, 0, 1.6 + Math.random() * 0.5, 1, 'lighter');
  } else if (P.off === 'shield') {
    const r = 1 - Math.pow(1 - P.raise, 3);
    // v2.6 enarme hold: forearm through the strap near the elbow, fist round the hand-grip near the top-middle.
    // Idle: shield low on the left, slightly edge-on. Raised: up + toward the centre, top rim just under eye level.
    let x = lerp(-30, 34, r) + bx * 0.6, y = lerp(130, 110, r) + by * 0.5 + drop, rot = lerp(-0.2, -0.06, r) + swayRot * 0.5, sc = lerp(0.95, 1.3, r), ex = lerp(0.84, 0.95, r);
    if (P.blockShake > 0) { x += Math.sin(t * 70) * 5 * P.blockShake; y += 7 * P.blockShake; rot += 0.12 * P.blockShake * Math.sin(t * 45); }
    if (P.shieldKick > 0) { const k = P.shieldKick; rot -= 0.16 * k; sc += 0.06 * k; y -= 10 * k; x += 10 * k; ex -= 0.06 * k; }
    if (P.bash) { const k = Math.sin(clamp(P.bash.t / 0.38, 0, 1) * Math.PI); x += 55 * k; y -= 24 * k; sc += 0.12 * k; ex += 0.05 * k; }
    const SI = Engine.imgs.vm_shield_in;
    const drawSh = (img, a = 1, op) => { ctx.save(); ctx.globalAlpha = a; if (op) ctx.globalCompositeOperation = op; ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.scale(sc * ex, sc); ctx.drawImage(img, 0, 0); ctx.restore(); };
    const SL = (lx, ly) => local(x, y, rot, 1, lx * sc * ex, ly * sc);
    drawSh(SI);
    if (P.parryFlash > 0) drawSh(tinted('vm_shield_in', '#ffe9a0'), P.parryFlash * 0.4, 'lighter');
    if (P.shieldUp && P.shieldT < 0.22) drawSh(tinted('vm_shield_in', '#ffffff'), 0.18 * (1 - P.shieldT / 0.22), 'lighter');
    const gp = SL(92, 64), fr = rot + Math.atan2(-0.618 * ex, 0.786);
    const fsc = sc * 0.88, wr2 = h3dArm('vm_ls3d', gp[0], gp[1], fr, fsc), el = SL(92 - 0.79 * 230, 64 + 0.62 * 230);   // forearm runs along the shield back
    drawArm3(ctx, Engine.imgs.vm_larm3d, wr2, el[0], el[1]);
    drawSh(Engine.imgs.vm_shield_strap);   // the enarme strap goes over the forearm
    drawH3D(ctx, 'vm_ls3d', gp[0], gp[1], fr, fsc);
  } else {
    // v2.7 whip: slanted rest (handle ~41 deg up-right toward the centre, mirroring the sword) and a real crack:
    // anticipation (arm up/back, wrist cocked) -> snap (fast, smeared) -> crack at full extension -> follow-through
    // low-right across the body -> rebound -> recoil to the rest slant. Each key has its own baked fist angle.
    let hx = 96 + bx + Math.sin(t * 0.8) * 1.5, hy = 198 + by + drop, hr = 0.72 + swayRot + Math.sin(t * 1.2) * 0.03;
    const w = P.whip; let lash = null;
    if (w) { const q = whipPose(w.t); hx += q[0] - 96; hy += q[1] - 198; hr += q[2] - 0.72; lash = w.t; }
    if (P.latch) { hr = 1.0 + swayRot; hx += 50; hy -= 26; }
    const wsc = 1.1;   // v2.8: same size as the sword fist (the whip fist is its exact mirror)
    const top = local(hx, hy, hr, wsc, 0, -50);
    const wr3 = h3dArm('vm_lw3d', hx, hy, hr, wsc);
    drawArm3(ctx, Engine.imgs.vm_larm3d, wr3, -34 + (hx - 96) * 0.42 + bx * 0.3, 360 - (198 - hy) * 0.25);
    // motion smear through the snap: ghost fists + a lilac streak along the handle-tip path
    if (w && w.t > 0.085 && w.t < 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      let prev = null;
      for (let g = 6; g >= 0; g--) {
        const q = whipPose(Math.max(0, w.t - g * 0.008)); const gx = q[0] + (hx - (w ? whipPose(w.t)[0] : 0)), gy = q[1] + (hy - whipPose(w.t)[1]);
        const tp = local(gx, gy, q[2], wsc, 0, -46);
        if (prev) { ctx.globalAlpha = 0.09 * (7 - g); ctx.strokeStyle = g % 2 ? '#b080ff' : '#f0dcff'; ctx.lineWidth = 6 - g * 0.6; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke(); }
        prev = tp;
        if (g === 3 || g === 6) drawH3D(ctx, 'vm_lw3d', gx, gy, q[2], wsc, 0.16, 'lighter');
      }
      ctx.restore();
    }
    // coil: leaves the hand as the arm cocks back, reels back in as a loose coil during the recoil
    const cTarget = P.latch ? 0 : w ? (w.t < 0.3 ? Math.max(0, 1 - w.t / 0.04) : (w.t - 0.3) / 0.16) : 1, cdt = clamp(t - (P.coilT || t), 0, 0.1); P.coilT = t;
    if (P.coilV === undefined) P.coilV = 1;
    P.coilV = cTarget < P.coilV ? cTarget : Math.min(cTarget, P.coilV + cdt * 6);
    if (P.coilV > 0.02) drawCoil(ctx, top, hx, hy, P.coilV, t, !!(w && w.t > 0.3));
    if (lash !== null && lash > 0.01) drawLash(ctx, cam, top, hx, hy, lash, w.tgt, P.coilV);
    if (P.latch) { const h = LEVEL.hooks[1]; const pr = project(cam, h.x, h.y, h.z - 0.3); if (pr) drawWhipTo(ctx, top[0], top[1], pr.x, pr.y, 1, t); }
    const FIRE = P.wpn && P.wpn.whip === 'fire', CHN = P.wpn && P.wpn.whip === 'chain', BLD = P.wpn && P.wpn.whip === 'blood';
    drawRot(ctx, FIRE ? Engine.imgs.vm_lwhandle_fire : CHN ? Engine.imgs.vm_lwhandle_chain : BLD ? Engine.imgs.vm_lwhandle_blood : Engine.imgs.vm_lwhandle, 62, 62, hx, hy, hr, wsc);
    drawRot(ctx, FIRE ? Engine.imgs.vm_lwhip_fire_glow : CHN ? Engine.imgs.vm_lwhip_chain_glow : BLD ? Engine.imgs.vm_lwhip_blood_glow : Engine.imgs.vm_lwhip_glow, 62, 62, hx, hy, hr, wsc, 0.45 + 0.2 * Math.sin(t * 4) + (lash !== null && lash > 0.12 && lash < 0.22 ? 0.4 : 0), 'lighter');
    drawH3D(ctx, 'vm_lw3d', hx, hy, hr, wsc);
  }
}
// M1: elemental viewmodel FX
const VMP = [];   // screen-space embers / frost motes for the viewmodel
function fireCord(ctx, pts, amt) {
  // flame licks along the cord: brighter toward the popper, embers peel off
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const n = pts.length, t = G.t;
  if (amt >= 1) {   // lash: a hot glowing core + outer heat haze along the whole cord
    const line = (w, c, al) => { ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1]); for (let i = 2; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
    line(9, '#ff3a08', 0.22); line(5, '#ff7a20', 0.4); line(2, '#ffe080', 0.7);
  }
  for (let i = 2; i < n; i++) {
    const s = i / (n - 1), p = pts[i]; if ((i + (t * 30 | 0)) % 2) continue;
    const fl = (0.4 + 0.6 * s) * Math.min(1, amt), h = (2 + 6 * s * (0.6 + 0.4 * Math.sin(t * 25 + i * 1.7))) * (amt >= 1 ? 1.5 : 1);
    ctx.globalAlpha = 0.55 * fl; ctx.fillStyle = '#ff5a10'; ctx.fillRect(Math.round(p[0] - 2), Math.round(p[1] - h), 4, Math.round(h));
    ctx.globalAlpha = 0.7 * fl; ctx.fillStyle = '#ffc040'; ctx.fillRect(Math.round(p[0] - 1), Math.round(p[1] - h * 0.6), 2, Math.round(h * 0.6));
    if (Math.random() < (amt >= 1 ? 0.18 : 0.06) * fl && VMP.length < 140) VMP.push({ x: p[0], y: p[1] - h, vx: rand(-12, 12), vy: rand(-40, -15), life: rand(0.25, 0.6), t: 0, c: Math.random() < 0.5 ? '#ffb040' : '#ff5020' });
  }
  ctx.restore();
}
function frostBlade(ctx, X, Y, R, S, t) {
  // cold mist drifting off the blade + a glint running up the edge
  for (let k = 0; k < 2; k++) if (Math.random() < 0.35 && VMP.length < 140) { const u = rand(0.15, 0.95); const p = tipOf([X, Y, R, S / VSC], u); VMP.push({ x: p[0] + rand(-3, 3), y: p[1] + rand(-3, 3), vx: rand(-6, 6), vy: rand(4, 14), life: rand(0.4, 0.9), t: 0, c: Math.random() < 0.6 ? '#c0f0ff' : '#60c0ff', frost: 1 }); }
  const g = (t * 0.9) % 1; const p = tipOf([X, Y, R, S / VSC], 0.2 + g * 0.78);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 * Math.sin(g * Math.PI); ctx.fillStyle = '#e8fcff';
  ctx.fillRect(Math.round(p[0]) - 3, Math.round(p[1]), 7, 1); ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 1, 7); ctx.restore();
}
function drawVMP(ctx, rdt) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = VMP.length - 1; i >= 0; i--) {
    const q = VMP[i]; q.t += rdt; if (q.t > q.life) { VMP.splice(i, 1); continue; }
    q.x += q.vx * rdt; q.y += q.vy * rdt; if (!q.frost) q.vy -= 30 * rdt;
    ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.frost ? 2 : 1, q.frost ? 1 : 2);
  }
  ctx.restore();
}
// whip hand keys: [t, x, y, handle angle]; snap segments run linear (fast), the rest ease
const WHIPK = [[0, 96, 198, 0.72], [0.04, 84, 180, 0.30], [0.085, 66, 146, -0.35], [0.12, 126, 170, 0.95], [0.16, 178, 188, 1.3], [0.22, 226, 224, 1.55], [0.3, 188, 214, 1.3], [0.46, 96, 198, 0.72]];
function whipPose(wt) {
  const K_ = WHIPK; if (wt >= K_[K_.length - 1][0]) return K_[K_.length - 1].slice(1);
  let i = 0; while (wt > K_[i + 1][0]) i++;
  const a = K_[i], b = K_[i + 1]; let k = (wt - a[0]) / (b[0] - a[0]);
  if (i === 2) k = k * k * (1.6 - 0.6 * k);              // snap: accelerate out of the cock
  else if (i !== 3) k = k * k * (3 - 2 * k);
  return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];
}
// whip cord through the lash: trails behind the cocked arm, rolls out as a travelling loop, cracks straight,
// rebounds with a wave and reels back toward the coil
function drawLash(ctx, cam, S, hx, hy, wt, tgt, coil) {
  let tx = W / 2 + 26, ty = H / 2 - 4;
  if (tgt) { const pr = project(cam, tgt.x, tgt.y, tgt.z); if (pr) { tx = pr.x; ty = pr.y; } }
  else if (P.whip && P.whip.hook) { const h = P.whip.hook, pr = project(cam, h.x, h.y, h.z); if (pr) { tx = pr.x; ty = pr.y; } }
  const N = 34, pts = [], dx = tx - S[0], dy = ty - S[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux;   // n = "up" side of the line
  const trail = (s, len, sway) => [S[0] + (44 + sway) * s * len, S[1] + (6 * s + 52 * s * s) * len];   // streams out to the right and falls
  for (let i = 0; i <= N; i++) {
    const s = i / N; let p;
    if (wt < 0.085) { const len = clamp(wt / 0.085, 0.2, 1) * 1.6; p = trail(s, len, -10 * Math.sin(s * 3 + wt * 30)); }
    else if (wt < 0.17) {
      const u = (wt - 0.085) / 0.085, r = 6 + 28 * (1 - u), dl = 0.09;
      if (s <= u) { const bow = Math.sin(s / Math.max(u, 0.01) * Math.PI) * 10 * (1 - u); p = [S[0] + dx * s + nx * bow, S[1] + dy * s + ny * bow + 6 * s * (1 - u)]; }
      else {
        const q = s - u;
        if (q < dl) { const ph = q / dl * Math.PI, f = u + Math.sin(ph) * r / L * 0.6; p = [S[0] + dx * f + nx * r * (1 - Math.cos(ph)) / 2, S[1] + dy * f + ny * r * (1 - Math.cos(ph)) / 2]; }
        else { const back = u - (q - dl) * 1.15; if (back > 0) p = [S[0] + dx * back + nx * r, S[1] + dy * back + ny * r]; else { const z = -back; p = [S[0] + nx * r + 14 * z, S[1] + ny * r + 60 * z]; } }
      }
    } else if (wt < 0.3) {
      const k = (wt - 0.17) / 0.13, ext = 1 - 0.3 * k, wave = Math.sin(s * 10 - (wt - 0.17) * 70) * 13 * s * (0.3 + k) * (1 - k * 0.6);
      p = [S[0] + dx * s * ext + nx * wave, S[1] + dy * s * ext + ny * wave + s * s * 40 * k];
    } else {
      const k = clamp((wt - 0.3) / 0.16, 0, 1), ext = 0.7 * (1 - k), sag = s * s * (40 + 30 * k);
      p = [S[0] + dx * s * ext + 20 * s * k, S[1] + dy * s * ext + sag * (1 - k * 0.4) + Math.sin(s * 8 + wt * 30) * 4 * (1 - k)];
    }
    pts.push(p);
  }
  // render (same leather/steel-stud look as before), tapering toward the popper
  let prev = null;
  if (P.wpn && P.wpn.whip === 'chain') chainCord(ctx, pts, 1);
  else for (let i = 0; i <= N; i++) {
    const s = i / N, p = pts[i], th = Math.max(1, Math.round(6 * (1 - s) + 1.5));
    const FW = P.wpn && P.wpn.whip === 'fire', fs = FW ? Math.min(1, s * 1.6) : 0;
    ctx.fillStyle = FW ? '#2a0806' : (P.wpn && P.wpn.whip === 'blood') ? '#1a0206' : '#2a120a'; ctx.fillRect(Math.round(p[0] - th / 2) - 1, Math.round(p[1] - th / 2) - 1, th + 2, th + 2);
    if (prev) { const steps = Math.ceil(Math.hypot(p[0] - prev[0], p[1] - prev[1]) / 1.5); for (let k = 0; k < steps; k++) { const q = [lerp(prev[0], p[0], k / steps), lerp(prev[1], p[1], k / steps)]; ctx.fillStyle = FW ? (fs > 0.5 ? '#e04010' : '#8a2410') : (P.wpn && P.wpn.whip === 'blood') ? (i % 3 ? '#8a0c20' : '#ff3050') : '#7a3a20'; ctx.fillRect(Math.round(q[0] - th / 2), Math.round(q[1] - th / 2), th, th); ctx.fillStyle = FW ? (fs > 0.5 ? '#ffd060' : '#ff7a30') : '#c07040'; ctx.fillRect(Math.round(q[0] - th / 2), Math.round(q[1] - th / 2), th, 1); } }
    if (i % 4 === 2) { ctx.fillStyle = '#e8e8f0'; ctx.fillRect(Math.round(p[0] + th / 2), Math.round(p[1] - 1), 2, 1); }
    prev = p;
  }
  if (P.wpn && P.wpn.whip === 'fire') fireCord(ctx, pts, 1);
  const tip = pts[N];
  // the loop leading edge glows as it rolls out; crack = white star + shock ring + embers at full extension
  if (wt > 0.1 && wt < 0.17) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.fillStyle = '#c090ff'; const f = pts[Math.round((wt - 0.085) / 0.085 * N)] || tip; ctx.fillRect(Math.round(f[0]) - 2, Math.round(f[1]) - 2, 4, 4); ctx.restore(); }
  if (wt > 0.155 && wt < 0.23) {
    const k = 1 - Math.abs(wt - 0.175) / 0.055, r = 5 + 10 * k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(tip[0] - r), Math.round(tip[1]) - 1, Math.round(r * 2), 2); ctx.fillRect(Math.round(tip[0]) - 1, Math.round(tip[1] - r), 2, Math.round(r * 2));
    ctx.fillStyle = '#ffc040'; for (const [a, b] of [[-1, -1], [1, 1], [1, -1], [-1, 1]]) ctx.fillRect(Math.round(tip[0] + a * r * 0.6), Math.round(tip[1] + b * r * 0.6), 2, 2);
    const rr = 4 + (wt - 0.155) * 260; ctx.globalAlpha = 0.5 * (1 - (wt - 0.155) / 0.075); ctx.strokeStyle = '#d0b0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(tip[0], tip[1], rr, rr * 0.7, 0, 0, TAU); ctx.stroke();
    for (let e = 0; e < 5; e++) { const a = e * 1.3 + wt * 40, d = rr * 0.8; ctx.globalAlpha = 0.7 * k; ctx.fillStyle = e % 2 ? '#60ffb0' : '#ffe080'; ctx.fillRect(Math.round(tip[0] + Math.cos(a) * d), Math.round(tip[1] + Math.sin(a) * d * 0.7), 1, 1); }
    ctx.restore();
  }
}
function drawCord(ctx, pts, th) {
  const pass = (col, grow, dy) => { ctx.fillStyle = col; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 1.2)); for (let k = 0; k < n; k++) { const x = lerp(p[0], q[0], k / n), y = lerp(p[1], q[1], k / n); const tt = (th[i] || th) + grow; ctx.fillRect(Math.round(x - tt / 2), Math.round(y - tt / 2 + dy), Math.max(1, Math.round(tt)), grow < 0 ? 1 : Math.max(1, Math.round(tt))); } } };
  if (P.wpn && P.wpn.whip === 'fire') { pass('#2a0806', 2, 0); pass('#a02810', 0, 0); pass('#ff8a30', -1.5, -0.5); fireCord(ctx, pts, 0.6); return; }
  if (P.wpn && P.wpn.whip === 'chain') { chainCord(ctx, pts, 0); return; }
  if (P.wpn && P.wpn.whip === 'blood') { pass('#1a0206', 2, 0); pass('#7a0818', 0, 0); pass('#ff3050', -1.5, -0.5); return; }
  pass('#24100a', 2, 0); pass('#7a3a20', 0, 0); pass('#c07040', -1.5, -0.5);
}
function drawCoil(ctx, top, hx, hy, c, t, reeling) {
  // a loose coil hanging below-left of the fist (gravity is screen-down); shrinks + unwinds as c -> 0
  const s = 0.35 + 0.65 * c, loops = 2.4 * c, spin = reeling ? t * 22 : 0;
  const C = [hx + 54 + 6 * (1 - c), hy + 4 + 4 * s];   // v2.7: hangs off the slanted handle's tip, clear of the HUD
  const pts = [[top[0], top[1]]];
  const rx0 = 14 * s, ry0 = 17 * s;
  const P0 = [C[0] + Math.cos(-Math.PI / 2 + spin) * rx0, C[1] + Math.sin(-Math.PI / 2 + spin) * ry0];
  for (let i = 1; i <= 10; i++) { const u = i / 10; const cx = top[0] + 30, cy = top[1] + 4; pts.push([(1 - u) * (1 - u) * top[0] + 2 * (1 - u) * u * cx + u * u * P0[0], (1 - u) * (1 - u) * top[1] + 2 * (1 - u) * u * cy + u * u * P0[1]]); }
  const N = Math.max(2, Math.round(loops * 26));
  for (let i = 1; i <= N; i++) {
    const u = i / N * loops; const a = -Math.PI / 2 + spin + u * Math.PI * 2;
    const k = u / 2.4; const rx = rx0 * (1 + 0.18 * k), ry = ry0 * (1 + 0.22 * k);
    pts.push([C[0] + 3 * k + Math.cos(a) * rx, C[1] + 5 * k + Math.sin(a) * ry + Math.sin(t * 2 + u) * 0.8]);
  }
  // loose tail of the lash hanging out of the bottom of the coil
  const last = pts[pts.length - 1]; for (let i = 1; i <= 6; i++) pts.push([last[0] + Math.sin(t * 1.7) * i * 0.6, last[1] + i * 3 * c]);
  drawCord(ctx, pts, 3);
}
function drawWhip(ctx, cam, sx, sy, e, wt, tgt) {
  let tx = W / 2 + 18, ty = H / 2 + 24;
  if (tgt) { const pr = project(cam, tgt.x, tgt.y, tgt.z); if (pr) { tx = pr.x; ty = pr.y; } }
  drawWhipTo(ctx, sx, sy, tx, ty, e, wt);
  if (wt > 0.16 && wt < 0.25) { // crack spark at the tip
    const k = 1 - Math.abs(wt - 0.2) / 0.05; const tp = whipPt(sx, sy, tx, ty, e, wt, 1); const r = 4 + 8 * k;
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(tp[0] - r), Math.round(tp[1]) - 1, Math.round(r * 2), 2); ctx.fillRect(Math.round(tp[0]) - 1, Math.round(tp[1] - r), 2, Math.round(r * 2));
    ctx.fillStyle = '#ffc040'; ctx.fillRect(Math.round(tp[0] - r * 0.6), Math.round(tp[1] - r * 0.6), 2, 2); ctx.fillRect(Math.round(tp[0] + r * 0.6), Math.round(tp[1] + r * 0.6), 2, 2); ctx.fillRect(Math.round(tp[0] + r * 0.6), Math.round(tp[1] - r * 0.6), 2, 2); ctx.fillRect(Math.round(tp[0] - r * 0.6), Math.round(tp[1] + r * 0.6), 2, 2);
  }
}
function whipPt(sx, sy, tx, ty, e, wt, s) {
  const dx = tx - sx, dy = ty - sy; const L = Math.hypot(dx, dy) || 1; const nx = -dy / L, ny = dx / L;
  const bx = sx + dx * s * e, by = sy + dy * s * e;
  const off = Math.sin(s * Math.PI) * -34 * (1 - e * 0.75) + Math.sin(s * 13 - wt * 55) * 9 * (1 - s * 0.4) * (1 - e * 0.6);
  return [bx + nx * off, by + ny * off + s * s * 26 * (1 - e)];
}
function drawWhipTo(ctx, sx, sy, tx, ty, e, wt) {
  const N = 30; let prev = null;
  for (let i = 0; i <= N; i++) {
    const s = i / N; const p = whipPt(sx, sy, tx, ty, e, wt, s); const th = Math.max(1, Math.round(5 * (1 - s) + 1));
    const FW = P.wpn && P.wpn.whip === 'fire', fs = FW ? Math.min(1, s * 1.6) : 0;
    ctx.fillStyle = FW ? '#2a0806' : (P.wpn && P.wpn.whip === 'blood') ? '#1a0206' : '#2a120a'; ctx.fillRect(Math.round(p[0] - th / 2) - 1, Math.round(p[1] - th / 2) - 1, th + 2, th + 2);
    if (prev) { const steps = Math.ceil(Math.hypot(p[0] - prev[0], p[1] - prev[1]) / 1.5); for (let k = 0; k < steps; k++) { const q = [lerp(prev[0], p[0], k / steps), lerp(prev[1], p[1], k / steps)]; ctx.fillStyle = FW ? (fs > 0.5 ? '#e04010' : '#8a2410') : (P.wpn && P.wpn.whip === 'blood') ? (i % 3 ? '#8a0c20' : '#ff3050') : '#7a3a20'; ctx.fillRect(Math.round(q[0] - th / 2), Math.round(q[1] - th / 2), th, th); ctx.fillStyle = FW ? (fs > 0.5 ? '#ffd060' : '#ff7a30') : '#c07040'; ctx.fillRect(Math.round(q[0] - th / 2), Math.round(q[1] - th / 2), th, 1); } }
    if (i % 4 === 2) { ctx.fillStyle = '#e8e8f0'; ctx.fillRect(Math.round(p[0] + th / 2), Math.round(p[1] - 1), 2, 1); ctx.fillRect(Math.round(p[0] - th / 2 - 2), Math.round(p[1]), 2, 1); }
    prev = p;
  }
}

function drawSlashes(ctx, cam, rdt) {
  if (!G.slashes || !G.slashes.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = G.slashes.length - 1; i >= 0; i--) {
    const s = G.slashes[i]; s.t += rdt; const k = s.t / s.dur; if (k >= 1) { G.slashes.splice(i, 1); continue; }
    const pr = project(cam, s.x, s.y, s.z); if (!pr) continue;
    const L = Math.min(120, s.len * pr.s) * (0.6 + 0.6 * Math.min(1, k * 3)); const c = Math.cos(s.ang), sn = Math.sin(s.ang);
    const th = Math.max(1, (s.heavy ? 5 : 3.5) * (1 - k));
    const N = Math.ceil(L / 1.5);
    for (let j = 0; j <= N; j++) {
      const u = j / N - 0.5; const taper = 1 - Math.abs(u) * 2; const w = Math.max(1, Math.round(th * taper));
      const x = Math.round(pr.x + c * u * L), y = Math.round(pr.y + sn * u * L);
      ctx.globalAlpha = (1 - k) * 0.9; ctx.fillStyle = s.red ? '#c0103c' : '#8a40ff'; ctx.fillRect(x - w, y - w, w * 2, w * 2);
      ctx.globalAlpha = (1 - k); ctx.fillStyle = '#fff4f0'; ctx.fillRect(x - (w >> 1), y - (w >> 1), Math.max(1, w), Math.max(1, w));
    }
  }
  ctx.restore();
}
// ---------- HUD ----------
function bar(ctx, x, y, w, h, frac, c1, c2, back = '#2a0a18', lag = null, c3 = null) {
  // gold-capped bevelled bar with a lagging "chip" segment
  ctx.fillStyle = '#0c0208'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#c89028'; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillStyle = '#6a3c10'; ctx.fillRect(x - 1, y + h, w + 2, 1);
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  const fw = Math.round(w * clamp(frac, 0, 1));
  if (lag !== null) { const lw = Math.round(w * clamp(lag, 0, 1)); if (lw > fw) { ctx.fillStyle = '#fff0c0'; ctx.fillRect(x + fw, y, lw - fw, h); ctx.fillStyle = '#ff9040'; ctx.fillRect(x + fw, y + h - 1, lw - fw, 1); } }
  ctx.fillStyle = c1; ctx.fillRect(x, y, fw, h);
  ctx.fillStyle = c3 || 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y + h - 2, fw, 2);
  ctx.fillStyle = c2; ctx.fillRect(x, y, fw, 1); ctx.fillStyle = 'rgba(255,255,255,0.55)'; if (fw > 2) ctx.fillRect(x + 1, y + 1, Math.max(0, fw - 2), 1);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = x + 8; i < x + w; i += 8) ctx.fillRect(i, y, 1, h);
  if (fw > 0 && fw < w) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + fw - 1, y, 1, h); }
  // gem end caps
  for (const ex of [x - 4, x + w + 1]) { ctx.fillStyle = '#f0c040'; ctx.fillRect(ex, y - 1, 3, h + 2); ctx.fillStyle = '#fff0a0'; ctx.fillRect(ex, y - 1, 3, 1); }
}
function goldFrame(ctx, x, y, w, h, gem = '#d01040') {
  ctx.fillStyle = '#6a3c10'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#f0c040'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#fff0a0'; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y - 1, 1, h + 2);
  ctx.fillStyle = '#12040e'; ctx.fillRect(x, y, w, h);
  for (const [cx, cy] of [[x - 2, y - 2], [x + w - 1, y - 2], [x - 2, y + h - 1], [x + w - 1, y + h - 1]]) { ctx.fillStyle = gem; ctx.fillRect(cx, cy, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, cy, 1, 1); }
}
function drawHUD(ctx, cam, rdt) {
  ctx.clearRect(0, 0, W, H);
  const t = G.t;
  // screen blood
  for (let i = G.screenBlood.length - 1; i >= 0; i--) {
    const b = G.screenBlood[i]; b.life -= rdt; b.y += b.vy * rdt * 0.4; b.vy *= 0.99;
    if (b.life <= 0) { G.screenBlood.splice(i, 1); continue; }
    const a = Math.min(1, b.life / 0.8);
    ctx.globalAlpha = a * 0.8; const R = Math.round(b.r), X = Math.round(b.x), Y = Math.round(b.y);
    if (!b.shape) { b.shape = []; for (let k = 0; k < 6; k++) b.shape.push([rand(-0.8, 0.8) * R | 0, rand(-0.8, 0.8) * R | 0, Math.max(2, rand(0.4, 0.9) * R | 0)]); }
    ctx.fillStyle = '#8a0012'; for (const q of b.shape) ctx.fillRect(X + q[0] - q[2], Y + q[1] - q[2], q[2] * 2, q[2] * 2);
    ctx.fillStyle = '#c8102a'; for (const q of b.shape) ctx.fillRect(X + q[0] - (q[2] >> 1) - 1, Y + q[1] - (q[2] >> 1) - 1, q[2], q[2]);
    ctx.fillStyle = '#ff5060'; ctx.fillRect(X - (R >> 2) - 1, Y - (R >> 2) - 1, 2, 2);
    ctx.fillStyle = '#8a0012'; ctx.fillRect(X - 1, Y, 2, Math.round(R * 2.2 * (2.6 - b.life)));
  }
  ctx.globalAlpha = 1;
  // red damage flash + low hp vignette
  if (G.flashR > 0) { ctx.fillStyle = `rgba(220,0,20,${G.flashR})`; ctx.fillRect(0, 0, W, H); }
  if (G.flashG > 0) { ctx.fillStyle = `rgba(255,230,150,${G.flashG * 0.6})`; ctx.fillRect(0, 0, W, H); }
  if (P.webT > 0 && Engine.imgs.web) { ctx.save(); ctx.globalAlpha = Math.min(1, P.webT / 0.6) * 0.55; const wi = Engine.imgs.web; ctx.drawImage(wi, -20, -16, 170, 170); ctx.drawImage(wi, W - 150, H - 150, 170, 170); ctx.globalAlpha *= 0.6; ctx.drawImage(wi, W - 140, -30, 150, 150); ctx.restore(); }
  if (P.poisonT > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); g.addColorStop(0, 'rgba(60,200,40,0)'); g.addColorStop(1, `rgba(60,200,40,${Math.min(0.35, P.poisonT * 0.25)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const lowHp = P.hp / P.maxhp;
  if (lowHp < 0.35) { const a = (0.35 - lowHp) * 1.6 * (0.6 + 0.4 * Math.sin(t * 6)); const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 280); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(200,0,20,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // crosshair / hook prompt
  const hk = hookInAim();
  if (hk) {
    const pr = project(cam, hk.x, hk.y, hk.z - (hk.id === 'censer' ? 0.6 : 0)); if (pr) { const s = 10 + Math.sin(t * 10) * 2; ctx.fillStyle = '#ffd040'; for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.fillRect(Math.round(pr.x + ox * s - (ox > 0 ? 4 : 0)), Math.round(pr.y + oy * s), 5, 1); ctx.fillRect(Math.round(pr.x + ox * s), Math.round(pr.y + oy * s - (oy > 0 ? 4 : 0)), 1, 5); } { const pad = G.inputMode === 'pad'; const lbl = P.off === 'whip' ? (pad ? ['{L2}', ' WHIP'] : ['RMB: WHIP']) : (pad ? ['{R1}', ' SWAP TO WHIP'] : ['TAB: SWAP TO WHIP']); promptRow(ctx, lbl, pr.x, pr.y + s + 4, '#ffd040', 'center'); } }
  }
  ctx.fillStyle = P.punish > 0 ? '#ff3050' : '#ffe080'; ctx.fillRect(W / 2 - 1, H / 2 - 5, 2, 3); ctx.fillRect(W / 2 - 1, H / 2 + 3, 2, 3); ctx.fillRect(W / 2 - 5, H / 2 - 1, 3, 2); ctx.fillRect(W / 2 + 3, H / 2 - 1, 3, 2);
  // finisher prompt
  const fin = G.enemies.find(e => e.alive && e.stagger > 0 && Math.hypot(e.x - P.x, e.y - P.y) < 2.4);
  if (fin && !G.finisher && (t * 4 | 0) % 2 === 0) text(ctx, 'STRIKE TO FINISH!', W / 2, H / 2 + 26, '#ff4050', 'center');
  // damage numbers
  for (let i = G.dmgNums.length - 1; i >= 0; i--) {
    const d = G.dmgNums[i]; d.t += rdt; if (d.t > 0.9) { G.dmgNums.splice(i, 1); continue; }
    const pr = project(cam, d.x, d.y, d.z + d.t * 0.6); if (!pr) continue;
    const sc = d.t < 0.08 ? 2 : 1; ctx.globalAlpha = Math.min(1, (0.9 - d.t) * 4);
    text(ctx, d.txt, pr.x, pr.y - 4, d.col, 'center', sc);
    ctx.globalAlpha = 1;
  }
  // staggered enemies: red "!" marker
  for (const e of G.enemies) if (e.alive && e.stagger > 0) { const pr = project(cam, e.x, e.y, e.z + e.h + 0.25); if (pr && pr.d < 14) text(ctx, '!', pr.x, pr.y - 8 + Math.sin(t * 12) * 2, '#ff3040', 'center', 2); }
  // boss bar
  const b = G.boss;
  if (b && b.awake && (b.alive || (b.deathType === 'boss' && !b.burst))) {
    b.hpLag = b.hpLag === undefined ? b.hp : (b.hpLag > b.hp ? Math.max(b.hp, b.hpLag - rdt * b.maxhp * 0.35) : b.hp);
    text(ctx, (b.d.title || 'THE VAMPIRE KNIGHT') + (RUN.on && RUN.cfg.endless ? '  +' + RUN.cfg.endless : ''), W / 2, 7, b.phase2 ? '#e0a0ff' : '#ffd060', 'center');
    bar(ctx, 90, 19, 300, 7, b.hp / b.maxhp, b.phase2 ? '#a040ff' : '#d0102a', b.phase2 ? '#e0b0ff' : '#ff8090', '#1a0410', b.hpLag / b.maxhp, b.phase2 ? '#4a1080' : '#700010');
    ctx.fillStyle = '#f0c040'; ctx.fillRect(239, 16, 2, 13); ctx.fillStyle = '#30e090'; ctx.fillRect(239, 15, 2, 2);
  }
  // bottom panel
  const py = H - 33;
  P.hpLag = P.hpLag === undefined ? P.hp : (P.hpLag > P.hp ? Math.max(P.hp, P.hpLag - rdt * (P.hurtT > 0 ? 8 : 60)) : P.hp);
  P.mpLag = P.mpLag === undefined ? P.mana : (P.mpLag > P.mana ? Math.max(P.mana, P.mpLag - rdt * 30) : P.mana);
  const g = ctx.createLinearGradient(0, py, 0, H); g.addColorStop(0, 'rgba(52,14,64,0.94)'); g.addColorStop(0.5, 'rgba(30,8,40,0.96)'); g.addColorStop(1, 'rgba(10,2,14,0.98)');
  ctx.fillStyle = g; ctx.fillRect(0, py, W, 33);
  ctx.fillStyle = '#f0c040'; ctx.fillRect(0, py, W, 1); ctx.fillStyle = '#8a5a18'; ctx.fillRect(0, py + 1, W, 1); ctx.fillStyle = 'rgba(160,80,255,0.35)'; ctx.fillRect(0, py + 2, W, 1);
  // filigree studs along the rim
  for (let x = 8; x < W; x += 24) { ctx.fillStyle = '#f0c040'; ctx.fillRect(x, py - 1, 2, 2); ctx.fillStyle = (x / 24 | 0) % 2 ? '#30e090' : '#c060ff'; ctx.fillRect(x, py + 3, 2, 1); }
  const pulse = P.hp / P.maxhp < 0.35 ? 0.5 + 0.5 * Math.sin(t * 8) : 0;
  ctx.drawImage(Engine.imgs.p_chalice, 5, py + 5 - (pulse * 2 | 0));
  text(ctx, 'HP', 30, py + 6, '#ffb0b0');
  bar(ctx, 52, py + 6, 80, 7, P.hp / P.maxhp, P.hp / P.maxhp < 0.35 ? (t * 6 | 0) % 2 ? '#ff2040' : '#b00020' : '#e0102e', '#ff90a0', '#2a0a18', P.hpLag / P.maxhp, '#80001a');
  text(ctx, Math.max(0, Math.ceil(P.hp)) + '/' + P.maxhp, 198, py + 6, P.hurtT > 0 ? '#ff6070' : '#fff', 'right');
  text(ctx, 'MP', 30, py + 19, '#a0c8ff');
  bar(ctx, 52, py + 19, 80, 6, P.mana / P.maxmana, P.mana >= 8 ? '#3a78ff' : '#284890', '#b0e0ff', '#0a1030', P.mpLag / P.maxmana, '#14306a');
  text(ctx, Math.floor(P.mana) + '', 198, py + 19, '#cfe0ff', 'right');
  // face (Doom-style), gold gem frame
  const fx = W / 2 - 17, fy = py + 1;
  goldFrame(ctx, fx - 1, fy, 36, 31, P.punish > 0 ? '#ff2040' : '#30e090');
  const look = P.hurtT > 0 ? (Math.sin(t * 40) * 2) | 0 : Math.round(Math.sin(t * 0.7) * 1.5);
  ctx.drawImage(Engine.imgs.s_kael, 46 + look, 3, 34, 30, fx, fy + 1, 34, 30);
  if (P.hurtT > 0.3) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(fx, fy + 1, 34, 30); }
  else if (P.hurtT > 0 || lowHp < 0.5) { ctx.fillStyle = `rgba(200,0,20,${P.hurtT > 0 ? 0.45 : (0.5 - lowHp) * 0.8})`; ctx.fillRect(fx, fy + 1, 34, 30); }
  if (P.punish > 0) { ctx.fillStyle = 'rgba(255,40,60,0.25)'; ctx.fillRect(fx, fy + 1, 34, 30); }
  if (P.iframes > 0 && P.dodgeT > 0) { ctx.fillStyle = 'rgba(120,255,200,0.25)'; ctx.fillRect(fx, fy + 1, 34, 30); }
  // right side: sidearm / relic slots
  goldFrame(ctx, 286, py + 5, 44, 22, '#c060ff');
  if (P.hasPistol) { const XB = P.wpn && P.wpn.ranged === 'crossbow', cst = XB ? Math.max(2, 6 - 2 * ((P.mods && P.mods.quiver) || 0)) : 8 - 2 * ((P.mods && P.mods.quiver) || 0); if (XB) ctx.drawImage(Engine.imgs.ic_crossbow, 293, py + 5, 23, 22); else ctx.drawImage(Engine.imgs.p_pistol, 290, py + 8); text(ctx, 'R', 322, py + 18, P.mana >= cst ? '#ffe080' : '#806040'); }
  else text(ctx, '--', 300, py + 12, '#806070');
  if (P.hasEdge) { goldFrame(ctx, 336, py + 3, 12, 26, '#ff4060'); ctx.drawImage(Engine.imgs.p_blade, 338, py + 2, 8, 28); }
  // off-hand slot: equipped whip / shield (+ swap progress)
  {
    const ox = 352, oy = py + 3; const sw = P.swapT > 0 ? 1 - Math.abs(1 - 2 * (1 - P.swapT / P.swapDur)) : 0;
    goldFrame(ctx, ox, oy, 28, 26, P.off === 'shield' ? '#60a0ff' : '#30e090');
    ctx.save(); ctx.globalAlpha = 1 - sw * 0.8;
    if (P.off === 'shield') ctx.drawImage(Engine.imgs.vm_shield, ox + 5, oy + 2, 18, 22); else ctx.drawImage(Engine.imgs.vm_lwhip, 10, 14, 92, 110, ox + 4, oy + 2, 20, 23);
    ctx.restore();
    if (P.shieldUp && P.off === 'shield') { ctx.fillStyle = 'rgba(255,240,160,0.35)'; ctx.fillRect(ox + 1, oy + 1, 26, 24); }
    if (P.swapLbl > 0) { ctx.globalAlpha = Math.min(1, P.swapLbl * 2); text(ctx, P.off === 'shield' ? 'SHIELD' : 'WHIP', ox + 14, oy - 14, P.off === 'shield' ? '#a0c8ff' : '#80ffb0', 'center'); ctx.globalAlpha = 1; }
  }
  const sf = LEVEL.secrets.filter(s => s.found).length;
  G.killFlash = Math.max(0, (G.killFlash || 0) - rdt * 3);
  if (LEVEL.kind === 'hub') { drawHubHUD(ctx); } else {
  text(ctx, 'SECRETS ' + sf + '/' + LEVEL.secrets.length, W - 6, py + 5, sf ? '#60ffb0' : '#a0ffd0', 'right');
  text(ctx, 'KILLS ' + G.kills + '/' + G.totalEnemies, W - 6, py + 15, G.killFlash > 0.5 ? '#ffffff' : '#ffb0b0', 'right');
  const tm = G.time | 0; text(ctx, ((tm / 60) | 0) + ':' + String(tm % 60).padStart(2, '0'), W - 6, py + 25, '#c0b0d0', 'right');
  }
  // hit-chain counter
  if (G.combo >= 3 && G.comboT > 0) {
    const pop = Math.max(0, G.comboPop || 0); G.comboPop = pop - rdt * 6;
    const sc = pop > 0.5 ? 2 : 1; const a = Math.min(1, G.comboT * 2); ctx.globalAlpha = a;
    const cc = G.combo >= 15 ? '#ff40ff' : G.combo >= 8 ? '#ff4050' : '#ffd040';
    text(ctx, G.combo + ' HITS', W - 10, 52, cc, 'right', sc); text(ctx, G.combo >= 15 ? 'MERCILESS' : G.combo >= 8 ? 'BRUTAL' : 'CHAIN', W - 10, 52 + 9 * sc + 2, '#f0e0ff', 'right');
    ctx.globalAlpha = 1;
  }
  if (RUN.on && G.state !== 'pick' && G.state !== 'results') { drawElitePlates(ctx, cam); drawRunHUD(ctx); }
  // toasts
  let ty = 36;
  for (let i = G.toasts.length - 1; i >= 0; i--) {
    const o = G.toasts[i]; o.t += rdt; if (o.t > o.dur) { G.toasts.splice(i, 1); continue; }
  }
  for (const o of (G.state === "victory" || G.state === 'pick' || G.state === 'results' || G.paused ? [] : G.toasts)) {
    const a = Math.min(1, o.t * 6, (o.dur - o.t) * 2.5); ctx.globalAlpha = a;
    // M7c: long toasts (relic descriptions, Abyss modifiers) wrap to 2 lines / condense instead of running off the screen
    const L1 = tfLayout(o.t1, W - 28, 1, 2, true), L2 = o.t2 ? tfLayout(o.t2, W - 28, 1, 2, true) : null;
    const bottom = ty + 9 * (L1.length - 1) + (L2 ? 10 + 9 * (L2.length - 1) : 0) + 8, bh = bottom - ty + (L2 ? 4 : 5);
    { const bw = Math.min(W - 12, Math.max(tfLinesW(L1), L2 ? tfLinesW(L2) : 0) + 16); ctx.fillStyle = 'rgba(20,4,30,0.55)'; ctx.fillRect(W / 2 - bw / 2, ty - 3, bw, bh); ctx.fillStyle = 'rgba(240,192,64,0.6)'; ctx.fillRect(W / 2 - bw / 2, ty - 3, bw, 1); }
    const y2 = tfLines(ctx, L1, W / 2, ty, o.col); if (L2) tfLines(ctx, L2, W / 2, y2 + 1, '#f0e8f0'); ty += bh + (L2 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
  if (G.bigText) {
    const B = G.bigText; B.t += rdt; if (B.t > B.dur) G.bigText = null; else {
      const a = Math.min(1, B.t * 4, (B.dur - B.t) * 2); ctx.globalAlpha = a;
      let y = 92;
      if (B.img) { const im = Engine.imgs[B.img]; ctx.drawImage(im, Math.round(W / 2 - im.width / 2), y - 10); y += im.height; }
      else { const fit = (n, k) => n * 8 * k <= W - 12; let L = [B.t1]; if (!fit(B.t1.length, 2)) { const m = B.t1.length >> 1; let c = -1; for (let d = 0; d < m && c < 0; d++) { if (B.t1[m + d] === ' ') c = m + d; else if (B.t1[m - d] === ' ') c = m - d; } if (c > 0) L = [B.t1.slice(0, c), B.t1.slice(c + 1)]; } const lw = Math.max(...L.map(l => l.length)); const sc = B.t < 0.15 && fit(lw, 3) ? 3 : fit(lw, 2) ? 2 : 1; if (L.length > 1) y -= 9; for (const l of L) { text(ctx, l, W / 2, y, '#ff4050', 'center', sc); y += sc * 8 + 2; } y += 22 - (sc * 8 + 2); }
      if (B.img) text(ctx, B.t1, W / 2, y, '#ffffff', 'center'); text(ctx, B.t2, W / 2, y + 12, B.img ? '#a0e0ff' : '#ffd0d0', 'center');
      ctx.globalAlpha = 1;
    }
  }
}

// ---------- screens ----------
function drawTitle(ctx) {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(30,0,40,0.35)'); g.addColorStop(0.6, 'rgba(20,0,20,0.15)'); g.addColorStop(1, 'rgba(10,0,10,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const k = Engine.imgs.s_kael; const sc = 1.45; const kb = Math.sin(G.t * 1.2) * 2;
  ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(96, H - 6, 70, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.drawImage(k, 8, Math.round(H - k.height * sc - 4 + kb), Math.round(k.width * sc), Math.round(k.height * sc));
  const ti = Engine.imgs.txt_title; ctx.drawImage(ti, Math.round(W / 2 - ti.width / 2 + 50), 14);
  const su = Engine.imgs.txt_sub; ctx.drawImage(su, Math.round(W / 2 - su.width / 2 + 50), 14 + ti.height - 4);
  text(ctx, 'BARON KAEL THE UNYIELDING', 290, 120, '#ffe080', 'center');
  text(ctx, 'A ROGUELIKE DESCENT' + (RUN.best ? '   BEST: STAGE ' + RUN.best : ''), 290, 131, '#d8a8ff', 'center');
  if ((G.t * 2 | 0) % 2 === 0) { if (G.inputMode === 'pad') promptRow(ctx, ['PRESS ', '{cross}', ' TO BEGIN'], 290, 150, '#ffffff', 'center'); else text(ctx, 'CLICK OR PRESS ENTER', 290, 150, '#ffffff', 'center'); }
  if (G.inputMode === 'pad') {
    const rows = [[['L STICK'], 'move'], [['R STICK'], 'look'], [['{R2}'], 'sword combo'], [['{L2}'], 'off-hand: whip / shield'], [['{triangle}', ' ', '{R1}'], 'swap whip <-> shield'], [['{circle}'], 'roll toward the stick'], [['{cross}', ' ', '{L3}'], 'jump   sprint'], [['{square}'], 'holy sidearm (find it)'], [['{OPTIONS}'], 'pause / settings']];
    let y = 166; for (const [g, b] of rows) { promptRow(ctx, g, 286, y, '#f0c040', 'right'); text(ctx, b, 294, y, '#e8e0f0'); y += 11; }
  } else {
    const lines = [['WASD / ARROWS', 'move (arrows turn)'], ['MOUSE', 'look (click to lock)'], ['LMB / J', 'sword combo'], ['RMB / K', 'off-hand: whip / shield'], ['TAB / WHEEL', 'swap whip <-> shield (1 2)'], ['F / MMB', 'quick shield, tap = parry'], ['Q / E / V', 'roll - steer it with WASD'], ['SPACE  SHIFT', 'jump   run'], ['R', 'holy sidearm (find it)']];
    let y = 166; for (const [a, b] of lines) { text(ctx, a, 286, y, '#f0c040', 'right'); text(ctx, b, 294, y, '#e8e0f0'); y += 11; }
  }
}
function drawDead(ctx) {
  ctx.fillStyle = `rgba(120,0,10,${Math.min(0.55, G.deadT * 0.6)})`; ctx.fillRect(0, 0, W, H);
  if (G.deadT > 0.6) {
    const im = Engine.imgs.txt_dead; ctx.drawImage(im, Math.round(W / 2 - im.width / 2), 70);
    text(ctx, 'ENTER / CLICK - rise again at the last font', W / 2, 150, '#ffffff', 'center');
    text(ctx, 'BACKSPACE - restart the level', W / 2, 164, '#ffb0b0', 'center');
  }
}
function drawVictory(ctx) {
  ctx.fillStyle = `rgba(14,4,20,${Math.min(0.82, G.vicT)})`; ctx.fillRect(0, 0, W, H);
  if (G.vicT < 0.5) return;
  const im = Engine.imgs.txt_victory; ctx.drawImage(im, Math.round(W / 2 - im.width / 2), 8);
  const k = Engine.imgs.s_kael; ctx.drawImage(k, W - k.width - 10, H - k.height - 6);
  const tm = G.time | 0; const sf = LEVEL.secrets.filter(s => s.found).length;
  let y = 70; const L = (a, b, c = '#fff') => { text(ctx, a, 40, y, '#f0c040'); text(ctx, b, 200, y, c); y += 14; };
  L('TIME', ((tm / 60) | 0) + ':' + String(tm % 60).padStart(2, '0'));
  L('KILLS', G.kills + ' / ' + G.totalEnemies + '   (' + Math.round(100 * G.kills / G.totalEnemies) + '%)', '#ffb0b0');
  L('SECRETS', sf + ' / ' + LEVEL.secrets.length + '   (' + Math.round(100 * sf / LEVEL.secrets.length) + '%)', '#a0ffd0');
  for (const s of LEVEL.secrets) { text(ctx, (s.found ? '+ ' : '- ') + (s.found ? s.name : '? ? ? ? ? ?'), 56, y, s.found ? '#a0ffd0' : '#806878'); y += 11; }
  y += 4;
  { const rl = [P.hasPistol && 'Sidearm', P.maxhp > 100 && 'Chalice', P.maxmana > 50 && 'Soul Shard', P.hasEdge && "Saint's Edge"].filter(Boolean); L('RELICS', rl.length ? rl.length + ' / 4' : 'none', '#ffe0a0'); for (let i = 0; i < rl.length; i += 2) { text(ctx, rl.slice(i, i + 2).join(', '), 56, y, '#ffe0a0'); y += 12; } }
  L('DEATHS', String(G.deaths), '#d0c0d0');
  text(ctx, 'Next: the Blood Court...', 40, y + 6, '#d090ff');
  if ((G.t * 2 | 0) % 2 === 0) text(ctx, 'ENTER - play again', 40, y + 26, '#ffffff');
}

// ---------- main loop ----------
let lastT = performance.now();
const cam = { x: 0, y: 0, eye: 0.6, ang: 0, pitch: 0 };
function update(dt) {
  if (RUN.on && typeof m4Tick === 'function') m4Tick(dt);
  updatePlayer(dt);
  updateFinisher(dt);
  flowT -= dt; updateFlow();
  for (const e of G.enemies) { if (e.alive && !e.d.boss) SFX.enemyTick(e, dt, updateEnemy); else updateEnemy(e, dt); }
  updateProjectiles(dt); updateHazards(dt);
  updateParticles(dt);
  updatePickups(dt);
  updateDoors(dt);
  updateEvents(dt);
  updateDrips(dt);
  G.censerSwing = Math.max(0, G.censerSwing - dt * 0.3);
  G.comboT = Math.max(0, (G.comboT || 0) - dt); if (G.comboT <= 0) G.combo = 0;
  P.swordBlood = Math.max(0, P.swordBlood - dt * 0.02);
  // cap resting gibs
  let rest = 0; for (let i = G.particles.length - 1; i >= 0; i--) { const p = G.particles[i]; if (p.k === 'gib' && p.rest) { rest++; if (rest > 160) G.particles.splice(i, 1); } }
}
function render(rdt) {
  // camera
  if (G.state === 'title') {
    const tt = G.t * 0.15; cam.x = 17.5 + Math.sin(tt) * 2.5; cam.y = 29 - Math.sin(tt * 0.7) * 3; cam.eye = 1.1; cam.ang = -Math.PI / 2 + Math.sin(tt * 1.3) * 0.4; cam.pitch = 18;
  } else {
    cam.x = P.x; cam.y = P.y; cam.eye = P.z + 0.62 + P.eyeOff - P.landDip - (P.rollDip || 0) + Math.abs(Math.cos(P.bob)) * 0.035 * P.bobAmt; cam.ang = P.ang; cam.pitch = P.pitch + P.kick + (P.rollPitch || 0);
  }
  SH.t = G.t; updateFlicker(G.t);
  renderWorld(cam);
  const S = collectSprites(cam);
  drawSprites(cam, S);
  for (const s of LEVEL.shafts) drawShaft(cam, s, G.t);
  renderParticles(cam);
  renderAtmos(cam);
  postFX();
  ctxLow.putImageData(imgData, 0, 0);
  ctxLow.imageSmoothingEnabled = false;
  if (FX.on) { ctxLow.globalCompositeOperation = 'lighter'; ctxLow.globalAlpha = FX.bloomK; ctxLow.imageSmoothingEnabled = true; ctxLow.drawImage(FX.bloom, 0, 0, W, H); ctxLow.globalAlpha = 1; ctxLow.globalCompositeOperation = 'source-over'; ctxLow.imageSmoothingEnabled = false; ctxLow.drawImage(FX.vig, 0, 0); }
  drawSlashes(ctxLow, cam, rdt);
  if (typeof drawBolts === 'function') drawBolts(ctxLow, cam, rdt);
  if (G.state === 'play' || G.state === 'dead' || G.state === 'pick' || G.state === 'altar') { drawViewModel(ctxLow, cam); drawVMP(ctxLow, rdt); }
  // composite with shake / roll / zoom
  G.shake = Math.min(G.shake, 14); const sh = G.shake; G.shake *= Math.pow(0.002, rdt);
  G.flashR = Math.max(0, G.flashR - rdt * 1.8); G.flashG = Math.max(0, G.flashG - rdt * 3); G.zoom *= Math.pow(0.01, rdt);
  sctx.imageSmoothingEnabled = false;
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, screen.height);
  const z = 1 + G.zoom + Math.abs(G.roll) * 0.6;
  sctx.setTransform(SCALE * z, 0, 0, SCALE * z, screen.width / 2 + rand(-sh, sh) * SCALE * 0.5, screen.height / 2 + rand(-sh, sh) * SCALE * 0.5);
  sctx.rotate(G.roll);
  sctx.drawImage(low, -W / 2, -H / 2);
  sctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (G.state === 'play' || G.state === 'dead' || G.state === 'victory') drawHUD(hctx, cam, rdt);
  else if (G.state === 'pick' || G.state === 'results') hctx.clearRect(0, 0, W, H);
  else hctx.clearRect(0, 0, W, H);
  if (G.state === 'title') drawTitle(hctx);
  if (G.state === 'dead' && !RUN.on) drawDead(hctx);
  if (G.state === 'dead' && RUN.on) { hctx.fillStyle = `rgba(120,0,10,${Math.min(0.55, G.deadT * 0.6)})`; hctx.fillRect(0, 0, W, H); }
  if (G.state === 'victory') drawVictory(hctx);
  if (G.state === 'pick') drawPick(hctx);
  if (G.state === 'altar') drawAltar(hctx);
  if (G.state === 'results') drawResults(hctx);
  if (G.paused && G.state === 'play') {
    hctx.fillStyle = 'rgba(16,0,28,0.7)'; hctx.fillRect(0, 0, W, H);
    const pad = G.inputMode === 'pad';
    const padPg = G.pmPage === 'pad', L = pmList(), fy = padPg ? 30 : 48, fh = padPg ? 210 : 168;
    goldFrame(hctx, W / 2 - 130, fy, 260, fh, '#c060ff');
    text(hctx, padPg ? 'CONTROLLER' : 'PAUSED', W / 2, fy + 10, '#ffe080', 'center', 2);
    let yy = fy + 36;
    L.forEach((it, i) => {
      const sel = i === (G.pmSel || 0);
      if (sel) { hctx.fillStyle = 'rgba(160,80,255,0.35)'; hctx.fillRect(W / 2 - 118, yy - 3, 236, 13); hctx.fillStyle = '#f0c040'; hctx.fillRect(W / 2 - 118, yy - 3, 2, 13); }
      text(hctx, it.label(), W / 2, yy, sel ? '#ffffff' : '#c8b8e0', 'center');
      if (sel && ['sound', 'fx', 'sens', 'psx', 'psy', 'pinv', 'pacc', 'pas', 'pturn', 'pvib'].includes(it.id)) { text(hctx, '<', W / 2 - 110, yy, '#f0c040'); text(hctx, '>', W / 2 + 102, yy, '#f0c040'); }
      yy += padPg ? 16 : 15;
    });
    const py = fy + fh - 32;
    if (pad) { promptRow(hctx, ['{cross}', ' select  ', '{circle}', ' back  ', '{DPAD}', ' change'], W / 2, py, '#e8e0f0', 'center'); promptRow(hctx, ['{OPTIONS}', ' resume'], W / 2, py + 14, '#e8e0f0', 'center'); }
    else { text(hctx, padPg ? 'ARROWS change   ESC back' : 'ARROWS + ENTER   ESC resume', W / 2, py, '#e8e0f0', 'center'); text(hctx, 'M sound  G fx  [ ] mouse', W / 2, py + 14, '#a898c0', 'center'); }
  }
  if (G.fade > 0) { G.fade = Math.max(0, G.fade - rdt * 2.2); hctx.fillStyle = `rgba(6,0,10,${G.fade})`; hctx.fillRect(0, 0, W, H); }
  sctx.drawImage(hud, 0, 0);
}
// ---------- pause menu (mouse, keyboard hotkeys, arrows / D-pad navigation) ----------
const PM_ITEMS = [
  { id: 'resume', label: () => 'RESUME' },
  { id: 'restart', label: () => RUN.on ? 'ABANDON RUN (NEW RUN)' : 'RESTART LEVEL' },
  { id: 'sound', label: () => 'SOUND  ' + (SFX.muted ? 'OFF' : 'ON') },
  { id: 'fx', label: () => 'GLOW & COLOUR FX  ' + (FX.on ? 'ON' : 'OFF') },
  { id: 'sens', label: () => 'MOUSE SPEED  ' + (G.sens || 1).toFixed(1) },
  { id: 'pad', label: () => 'CONTROLLER SETTINGS  >' },
];
const PM_PAD = [
  { id: 'psx', label: () => 'LOOK SPEED X  ' + PADCFG.sx.toFixed(1) },
  { id: 'psy', label: () => 'LOOK SPEED Y  ' + PADCFG.sy.toFixed(1) },
  { id: 'pinv', label: () => 'INVERT Y  ' + (PADCFG.inv ? 'ON' : 'OFF') },
  { id: 'pacc', label: () => 'LOOK ACCELERATION  ' + (PADCFG.accel ? 'ON' : 'OFF') },
  { id: 'pas', label: () => 'AIM ASSIST  ' + (PADCFG.assist ? 'ON' : 'OFF') },
  { id: 'pturn', label: () => 'QUICK TURN  ' + ({ R3: 'R3', DPAD: 'D-PAD DOWN', OFF: 'OFF' })[PADCFG.turn] },
  { id: 'pvib', label: () => 'VIBRATION  ' + (['OFF', 'LOW', 'FULL'])[PADCFG.vib === 1 ? 2 : PADCFG.vib ? 1 : 0] },
  { id: 'pback', label: () => '<  BACK' },
];
const pmList = () => G.pmPage === 'pad' ? PM_PAD : PM_ITEMS;
function pmAct(id, dir) {
  if (id === 'resume') { if (!dir) G.paused = false; }
  else if (id === 'restart') { if (!dir) { G.paused = false; if (RUN.on) newRun(); else { newGame(); G.fade = 1; } } }
  else if (id === 'sound') SFX.muted = !SFX.muted;
  else if (id === 'fx') FX.on = !FX.on;
  else if (id === 'sens') G.sens = clamp(Math.round(((G.sens || 1) + (dir || 1) * 0.1) * 10) / 10, 0.3, 3);
  else if (id === 'pad') { if (!dir || dir > 0) { G.pmPage = 'pad'; G.pmSel = 0; } }
  else if (id === 'pback') { if (!dir || dir < 0) { G.pmPage = null; G.pmSel = PM_ITEMS.length - 1; } }
  else {
    const st = v => Math.round(clamp(v, 0.3, 3) * 10) / 10;
    if (id === 'psx') PADCFG.sx = st(PADCFG.sx + (dir || 1) * 0.1);
    else if (id === 'psy') PADCFG.sy = st(PADCFG.sy + (dir || 1) * 0.1);
    else if (id === 'pinv') PADCFG.inv = !PADCFG.inv;
    else if (id === 'pacc') PADCFG.accel = !PADCFG.accel;
    else if (id === 'pas') PADCFG.assist = PADCFG.assist ? 0 : 1;
    else if (id === 'pturn') { const o = ['R3', 'DPAD', 'OFF']; PADCFG.turn = o[(o.indexOf(PADCFG.turn) + (dir < 0 ? 2 : 1)) % 3]; }
    else if (id === 'pvib') { const o = [0, 0.5, 1]; PADCFG.vib = o[(o.indexOf(PADCFG.vib) + (dir < 0 ? 2 : 1)) % 3]; rumbleFx('parry'); }
    savePadCfg();
  }
}
function pauseMenuInput() {
  const L = pmList(); G.pmSel = Math.min(G.pmSel || 0, L.length - 1); const n = L.length;
  if (KP.ArrowUp || KP.KeyW) G.pmSel = (G.pmSel + n - 1) % n;
  if (KP.ArrowDown || KP.KeyS) G.pmSel = (G.pmSel + 1) % n;
  const it = L[G.pmSel].id;
  if (G.pmPage === 'pad' && (KP.PadBack || KP.Escape || KP.Backspace)) { G.pmPage = null; G.pmSel = PM_ITEMS.length - 1; for (const k of ['PadBack', 'Escape', 'Backspace', 'PadStart']) delete KP[k]; return; }
  if (KP.ArrowLeft || KP.KeyA) pmAct(it, -1);
  if (KP.ArrowRight || KP.KeyD) pmAct(it, 1);
  if (KP.Enter || KP.Space || KP.PadOK) pmAct(it, 0);
  if (MBP[0] || KP.Escape || KP.PadBack || KP.PadStart) G.paused = false;
  if (KP.Backspace) pmAct('restart', 0);
  if (KP.KeyM) pmAct('sound', 0);
  if (KP.KeyG) pmAct('fx', 0);
  if (KP.BracketLeft) pmAct('sens', -1);
  if (KP.BracketRight) pmAct('sens', 1);
}
// v2.2: one bad frame must never kill the game loop
const ERRS = { n: 0, last: '', t: 0, el: null };
function showErr(err) {
  ERRS.n++; const msg = (err && (err.message || err)) + ''; console.error(err);
  if (msg !== ERRS.last || performance.now() - ERRS.t > 3000) {
    ERRS.last = msg; ERRS.t = performance.now();
    if (!ERRS.el) { ERRS.el = document.createElement('div'); ERRS.el.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:70%;font:12px monospace;color:#fff;background:rgba(120,0,30,.85);padding:6px 9px;border-radius:4px;z-index:9;pointer-events:none;white-space:pre-wrap'; document.body.appendChild(ERRS.el); }
    ERRS.el.textContent = 'Game hiccup (kept running): ' + msg.slice(0, 160) + '\nIf this keeps showing, hard-refresh with Cmd+Shift+R.';
    ERRS.el.style.display = 'block'; clearTimeout(ERRS.hide); ERRS.hide = setTimeout(() => { ERRS.el.style.display = 'none'; }, 6000);
  }
}
function frame(now) {
  if (!window.RUN) { requestAnimationFrame(frame); return; }   // rogue.js still loading
  try { frameInner(now); } catch (err) { showErr(err); for (const k in KP) delete KP[k]; MBP[0] = MBP[1] = MBP[2] = false; }
  requestAnimationFrame(frame);
}
function frameInner(now) {
  const rdt = Math.min(0.05, (now - lastT) / 1000) * (window.GAME_TS || 1); lastT = now; G.t += rdt;
  if (typeof pollPad === 'function') { try { pollPad(rdt); } catch (e) { if (!ERRS.padWarned) { ERRS.padWarned = true; console.warn('gamepad read failed', e); } } }
  if (G.state === 'title') { if (KP.Enter || KP.Space || MBP[0] || KP.PadOK || KP.PadStart) { SFX.init(); if (typeof enterHub === 'function') enterHub(); else newRun(); } }
  else if (G.state === 'altar') { altarInput(rdt); updateParticles(rdt); }
  else if (G.state === 'pick') { pickInput(rdt); updateParticles(rdt * 0.5); }
  else if (G.state === 'results') { resultsInput(rdt); updateParticles(rdt * 0.3); }
  else if (G.state === 'play') {
    if (G.paused) {
      pauseMenuInput();
    }
    else {
      if (KP.Escape) { G.paused = true; G.pmSel = 0; G.pmPage = null; }
      let dt = rdt;
      if (G.slow > 0) { G.slow -= rdt; dt *= 0.3; }
      if (G.hitstop > 0) { G.hitstop -= rdt; dt = 0; }
      if (dt > 0) update(dt);
      G.time += rdt;
    }
  } else if (G.state === 'dead') {
    G.deadT += rdt; updateParticles(rdt * 0.3);
    if (RUN.on) { if (G.deadT > 2.2 || (G.deadT > 0.9 && (KP.Enter || MBP[0] || KP.PadOK || KP.PadStart))) startResults(); }
    else if (G.deadT > 0.8) { if (KP.Enter || MBP[0] || KP.PadOK || KP.PadStart) { respawn(); G.fade = 0.8; } if (KP.Backspace || KP.PadRestart) { newGame(); G.state = 'play'; G.fade = 1; } }
  } else if (G.state === 'victory') { G.vicT += rdt; if (G.vicT > 1.5 && (KP.Enter || MBP[0] || KP.PadOK || KP.PadStart)) { newGame(); G.state = 'title'; G.fade = 1; } }
  render(rdt);
  for (const k in KP) delete KP[k]; MBP[0] = MBP[1] = MBP[2] = false;
}
// public test hooks
window.GAME = { G, P, LEVEL: () => LEVEL, dbg: { bossIntro, bossStartAtk, damageEnemy, makeEnemy, enemyVisual },  newGame, respawn, start() { if (window.newRun) newRun(); else { newGame(); G.state = 'play'; } }, tp(x, y, ang, pitch = 0, z) { P.x = x; P.y = y; if (ang !== undefined) P.ang = ang; P.pitch = pitch; P.z = z !== undefined ? z : floorAt(x, y); P.vz = 0; }, key(code, down) { if (down) { if (!K[code]) KP[code] = true; K[code] = true; } else K[code] = false; }, click(b) { MBP[b] = true; } };
const REQUIRED_IMGS = ['vm_sword_frost', 'vm_sword_frost_glow', 'vm_lwhandle_fire', 'vm_lwhip_fire_glow', 'ic_firewhip', 'ic_frostsword', 'vm_sword2', 'vm_sword_glow', 'vm_rhand', 'vm_rarm', 'vm_larm', 'vm_lwhip', 'vm_lwhip_glow', 'vm_lgrip', 's_spike', 'vm_shield_in', 'vm_lfist', 'vm_shield_strap', 'vm_rh3d', 'vm_lw3d', 'vm_ls3d', 'vm_lwhandle', 'vm_rarm3d', 'vm_larm3d', 's_spider', 's_spiderling', 'vm_crossbow', 'vm_crossbow_glow', 'vm_crossbow_bolt', 'vm_crossbow_empty', 'vm_sword_storm', 'vm_sword_storm_glow', 'vm_sword_rapier', 'vm_sword_rapier_glow', 'vm_lwhandle_chain', 'vm_lwhip_chain_glow', 't_crypt', 't_crypt2', 't_cryptcrack', 'c_crypt', 'f_crypt', 'f_crypt2', 'f_lid', 't_skulls', 't_skullcol', 't_tomb', 't_grate', 't_cpillar', 't_sarc', 'web', 'eggsac', 'p_reliq', 'bonescatter'];
function checkAssets() {
  const miss = REQUIRED_IMGS.filter(n => !Engine.imgs[n]);
  if (miss.length) {
    // an old cached assets.js: reload once with a cache-buster, otherwise carry on with placeholders
    if (!/[?&]r=/.test(location.search)) { location.replace(location.pathname + '?r=' + Date.now()); return false; }
    for (const n of miss) { const c = document.createElement('canvas'); c.width = c.height = 1; Engine.imgs[n] = c; Engine.tex[n] = { w: 1, h: 1, d: new Uint32Array(1) }; }
    showErr('Some art is from an older cached version - press Cmd+Shift+R');
  }
  return true;
}
loadImages(() => { if (!checkAssets()) return; resize(); initBuffers(low); buildLUT(); buildLevel(); G.state = 'title'; requestAnimationFrame(frame); });
