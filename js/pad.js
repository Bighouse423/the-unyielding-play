// ---------- v2.1: PS5 DualSense / standard-mapping gamepad support ----------
// Standard mapping: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12-15 D-pad U/D/L/R
const PAD = { idx: -1, connected: false, id: '', prev: [], held: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, l2: false, r2: false, run: false, lookHeld: 0, lastRumble: 0, sens: 1 };
// v2.7 controller settings (pause menu -> CONTROLLER), saved between sessions
const PADCFG = Object.assign({ sx: 1, sy: 1, inv: false, assist: 1, turn: 'R3', accel: true, vib: 1 }, (() => { try { return JSON.parse(localStorage.getItem('tu_play_m7d_pad') || '{}'); } catch (e) { return {}; } })());
function savePadCfg() { try { localStorage.setItem('tu_play_m7d_pad', JSON.stringify(PADCFG)); } catch (e) { } }
function padDZ(v, d) { const a = Math.abs(v); if (a < d) return 0; return Math.sign(v) * Math.min(1, (a - d) / (1 - d)); }
addEventListener('gamepaddisconnected', e => {
  if (!e.gamepad || e.gamepad.index !== PAD.idx) return;
  PAD.connected = false; PAD.idx = -1; for (const k of PAD.held) K[k] = false; PAD.held.clear(); PAD.l2 = PAD.r2 = false; G.inputMode = 'kb';
  toast('CONTROLLER DISCONNECTED', '', '#ffb0b0', 2); if (G.state === 'play') G.paused = true;
});
function padHold(code, on) { if (on) { if (!K[code]) KP[code] = true; K[code] = true; PAD.held.add(code); } else if (PAD.held.has(code)) { K[code] = false; PAD.held.delete(code); } }
function pollPad(rdt) {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  // v2.7: only 'standard'-mapped pads are trusted outright; any other HID device (non-standard DualSense mapping,
  // flight sticks, 3D mice, phantom Bluetooth devices...) must press a real button before it can drive the game
  if (!PAD.armed) PAD.armed = {};
  for (const g of list) if (g && g.connected && g.mapping !== 'standard' && !PAD.armed[g.index] && g.buttons && Array.prototype.some.call(g.buttons, x => x && (x.pressed || x.value > 0.5))) PAD.armed[g.index] = true;
  const ok = g => g && g.connected && g.buttons && g.buttons.length >= 16 && (g.mapping === 'standard' || PAD.armed[g.index]);
  if (PAD.idx >= 0 && ok(list[PAD.idx])) gp = list[PAD.idx];
  else for (const g of list) if (ok(g)) { gp = g; break; }
  if (!gp) { if (PAD.connected) { PAD.connected = false; for (const k of PAD.held) K[k] = false; PAD.held.clear(); } PAD.lx = PAD.ly = PAD.rx = PAD.ry = 0; PAD.l2 = PAD.r2 = false; return; }
  if (!PAD.connected || PAD.idx !== gp.index) {
    PAD.connected = true; PAD.idx = gp.index; PAD.id = gp.id; PAD.prev = gp.buttons.map(() => true); // ignore buttons already down
    // calibrate: remember each axis's resting value; an axis only counts once it has really moved away from rest
    PAD.rest = Array.from(gp.axes || [], v => v || 0); PAD.live = PAD.rest.map(() => false); PAD.calibN = 0;
    PAD.ds = /dualsense|054c|wireless controller|ps5|playstation/i.test(gp.id);
    toast('CONTROLLER CONNECTED', (PAD.ds ? 'DualSense' : 'Gamepad') + ' ready - OPTIONS opens the menu', '#80c8ff', 3); G.inputMode = 'pad';
  }
  const bv = i => { const x = gp.buttons[i]; return !x ? 0 : typeof x === 'object' ? (x.value || (x.pressed ? 1 : 0)) : +x; };
  const b = []; for (let i = 0; i < 17; i++) b[i] = bv(i) > 0.5;
  // analog triggers: fire at 12% travel, release under 6% (hysteresis = no chatter, instant re-press)
  PAD.tv = PAD.tv || [false, false];
  for (const [j, i] of [[0, 6], [1, 7]]) { const v = bv(i); PAD.tv[j] = PAD.tv[j] ? v > 0.06 : v > 0.12; b[i] = PAD.tv[j]; }
  const P_ = i => b[i] && !PAD.prev[i];
  const raw = gp.axes || [];
  // first few frames after connect: keep refining the rest values (some pads settle a frame or two late)
  if (PAD.calibN < 6) { PAD.calibN++; for (let i = 0; i < raw.length; i++) if (!PAD.live[i]) PAD.rest[i] = raw[i] || 0; }
  const ax = [];
  for (let i = 0; i < 4; i++) {
    const v = raw[i] || 0, r0 = PAD.rest[i] || 0;
    if (!PAD.live[i] && (Math.abs(r0) < 0.3 ? PAD.calibN >= 6 : Math.abs(v - r0) > 0.35)) PAD.live[i] = true;   // parked axes must move first
    // small resting offsets (drift) are subtracted; a big resting value (axis parked at -1/+1) is ignored until it moves
    ax[i] = PAD.live[i] ? (Math.abs(r0) < 0.3 ? clamp(v - r0, -1, 1) : v) : 0;
  }
  // radial deadzones (no axis-aligned creep), rescaled so movement still starts smoothly
  const rdz = (x, y, d) => { const m = Math.hypot(x, y); if (m < d) return [0, 0]; const k = Math.min(1, (m - d) / (1 - d)) / m; return [x * k, y * k]; };
  [PAD.lx, PAD.ly] = rdz(ax[0], ax[1], 0.22);
  const [rx, ry] = rdz(ax[2], ax[3], 0.18);
  PAD.rx = rx; PAD.ry = ry;
  if (b.some(v => v) || Math.hypot(PAD.lx, PAD.ly, rx, ry) > 0.2) G.inputMode = 'pad';
  const inMenu = G.state !== 'play' || G.paused;
  if (inMenu) {
    for (const c of PAD.held) K[c] = false; PAD.held.clear(); PAD.l2 = PAD.r2 = false;
    if (P_(12)) KP.ArrowUp = true; if (P_(13)) KP.ArrowDown = true; if (P_(14)) KP.ArrowLeft = true; if (P_(15)) KP.ArrowRight = true;
    if (P_(0)) KP.PadOK = true; if (P_(9)) KP.PadStart = true; if (P_(1)) KP.PadBack = true; if (P_(2)) KP.PadRestart = true;
    // menu stick navigation (one step per push)
    if (P_(3)) KP.PadY = true;
    // stick navigation (both axes) with hold-to-repeat, same for the D-pad
    const sx_ = ax[0] || 0, sy = ax[1] || 0;
    let dir = Math.abs(sy) > 0.55 && Math.abs(sy) >= Math.abs(sx_) ? (sy < 0 ? 'ArrowUp' : 'ArrowDown') : Math.abs(sx_) > 0.55 ? (sx_ < 0 ? 'ArrowLeft' : 'ArrowRight') : null;
    if (!dir) dir = b[12] ? 'ArrowUp' : b[13] ? 'ArrowDown' : b[14] ? 'ArrowLeft' : b[15] ? 'ArrowRight' : null;
    if (dir !== PAD.navDir) { PAD.navDir = dir; PAD.navT = 0.38; if (dir && !(P_(12) || P_(13) || P_(14) || P_(15))) KP[dir] = true; }
    else if (dir) { PAD.navT -= rdt; if (PAD.navT <= 0) { PAD.navT = 0.09; KP[dir] = true; } }
    PAD.stickNav = !!dir;
  } else {
    padHold('Space', b[0]);                         // Cross: jump
    if (P_(1) || P_(4)) KP.PadRoll = true;          // Circle (or L1): roll toward the left stick
    if (P_(2)) KP.KeyR = true;                      // Square: holy sidearm
    if (P_(3) || P_(5)) KP.Tab = true;              // Triangle / R1: swap whip <-> shield
    if (P_(14)) KP.Digit1 = true; if (P_(15)) KP.Digit2 = true; // D-pad left/right: pick whip / shield
    if (P_(7)) MBP[0] = true; PAD.r2 = b[7];        // R2: sword
    if (P_(6)) KP.PadOff = true; PAD.l2 = b[6];     // L2: off-hand (lash, or hold to block / tap to parry)
    // L3: sprint toggle. Stays on through short stick wobbles; drops when you let go (0.25 s grace) or pull back
    if (P_(10)) { PAD.run = !PAD.run; rumbleFx(PAD.run ? 'sprintOn' : 'tick'); }
    if (PAD.run) { if (Math.hypot(PAD.lx, PAD.ly) < 0.2 || PAD.ly > 0.5) { PAD.runGrace = (PAD.runGrace || 0) + rdt; if (PAD.runGrace > 0.25) PAD.run = false; } else PAD.runGrace = 0; }
    // R3: 180 quick-turn (configurable), D-pad up: re-centre the view
    if (((P_(11) && PADCFG.turn === 'R3') || (P_(13) && PADCFG.turn === 'DPAD')) && !PAD.qt && !G.finisher && !P.latch) { PAD.qt = { t: 0, from: P.ang }; rumbleFx('tick'); }
    if (P_(12)) K.Home = true; else if (!b[12]) K.Home = false;
    if (PAD.qt) { PAD.qt.t += rdt; const k = Math.min(1, PAD.qt.t / 0.2), e = k * k * (3 - 2 * k); P.ang = PAD.qt.from + Math.PI * e; if (k >= 1) PAD.qt = null; }
    if (P_(9)) KP.Escape = true;                    // Options: pause
    // right stick look: exponential response (fine aim near centre), outer-edge turn boost, optional ramp-up
    // acceleration when held at full tilt, separate X/Y speed, invert Y, gentle aim assist
    const m = Math.hypot(rx, ry);
    const as = PADCFG.assist ? aimAssist() : null;
    if (m > 0 && !PAD.qt) {
      const resp = 0.25 * m + 0.75 * (Math.exp(2 * m) - 1) / (Math.exp(2) - 1), curve = resp / m;   // linear-exponential blend
      if (m > 0.9) PAD.lookHeld += rdt; else PAD.lookHeld = 0;
      const edge = m > 0.94 ? 1.18 : 1;
      const acc = PADCFG.accel ? 1 + Math.min(1, Math.max(0, PAD.lookHeld - 0.15) / 0.4) * 0.75 : 1;
      const slow = as ? as.slow : 1, sm = G.slow > 0 ? 0.6 : 1;
      P.ang += rx * curve * 2.7 * PADCFG.sx * edge * acc * slow * sm * rdt;
      P.pitch = clamp(P.pitch - ry * (PADCFG.inv ? -1 : 1) * curve * 230 * PADCFG.sy * Math.min(acc, 1.3) * slow * rdt, -150, 150);
    } else PAD.lookHeld = 0;
    // magnetism: only while you are actively moving or aiming, and only a nudge (never snaps, never fights you)
    if (as && as.e && (m > 0 || Math.hypot(PAD.lx, PAD.ly) > 0.3)) {
      const k = Math.min(1, rdt * 3.2) * as.pull;
      P.ang += as.da * k; P.pitch = clamp(P.pitch + as.dp * k * 0.5, -150, 150);
    }
  }
  PAD.prev = b;
}
// aim assist target: nearest live enemy close to the crosshair, in line of sight, within 14 m
function aimAssist() {
  if (G.inputMode !== 'pad') return null;
  let best = null, bs = 1e9;
  for (const e of G.enemies) {
    if (!e.alive || e.hidden || e.intangible || (e.d && e.d.phase)) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > 14 || d < 0.4) continue;
    let da = Math.atan2(dy, dx) - P.ang; da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const cone = Math.max(0.06, Math.atan2(e.r * 1.6 + 0.25, d));          // ~ the enemy's on-screen width plus a margin
    if (Math.abs(da) > cone * 2.2) continue;
    const zc = e.z + (e.h || 1.4) * 0.55, ez = P.z + 0.62; const dp = Math.atan2(zc - ez, d) * PROJ - P.pitch;
    if (Math.abs(dp) > 70) continue;
    if (typeof losTo === 'function' && !losTo(P.x, P.y, e.x, e.y)) continue;
    const sc = Math.abs(da) / cone; if (sc < bs) { bs = sc; best = { e, da, dp, cone }; }
  }
  if (!best) return { slow: 1, e: null };
  const inside = Math.abs(best.da) < best.cone;
  return { e: best.e, da: best.da, dp: best.dp, slow: inside ? 0.62 : 0.82, pull: inside ? 0.18 : 0.32 };
}
// rumble patterns: [strong, weak, ms, delayMs] steps
const RUMBLE = {
  sword: [[0.28, 0.55, 60, 0]], swordHeavy: [[0.75, 0.6, 90, 0], [0.3, 0.2, 70, 110]],
  whip: [[0.05, 0.9, 35, 0], [0.5, 0.2, 40, 45]],                         // high snap then a sharp crack
  block: [[0.85, 0.3, 110, 0]], parry: [[0.2, 1, 50, 0], [1, 0.6, 140, 70]],
  hurt: [[0.9, 0.7, 200, 0]], hurtBig: [[1, 0.9, 260, 0], [0.5, 0.3, 160, 300]],
  stomp: [[0.65, 0.1, 120, 0]], slam: [[1, 0.8, 380, 0]], bossDeath: [[1, 1, 600, 0], [0.6, 0.4, 500, 700]],
  dodge: [[0.12, 0.35, 80, 0]], finisher: [[1, 1, 320, 0]], tick: [[0, 0.25, 30, 0]], sprintOn: [[0, 0.3, 30, 0], [0, 0.3, 30, 70]],
};
function rumbleFx(name, scale = 1) {
  const seq = RUMBLE[name]; if (!seq) return;
  for (const [s_, w_, ms, d] of seq) { if (d) setTimeout(() => rumble(s_ * scale, w_ * scale, ms, true), d); else rumble(s_ * scale, w_ * scale, ms, true); }
}
// dual-rumble on hits, blocks, parries
function rumble(strong, weak, ms, force) {
  if (!PAD.connected || G.inputMode !== 'pad' || !PADCFG.vib) return;
  strong *= PADCFG.vib; weak *= PADCFG.vib;
  const now = performance.now(); if (!force && now - PAD.lastRumble < 45 && strong < 0.6) return; PAD.lastRumble = now;
  try {
    const gp = navigator.getGamepads()[PAD.idx]; if (!gp) return;
    const a = gp.vibrationActuator;
    if (a && a.playEffect) { const r = a.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }); if (r && r.catch) r.catch(() => {}); PAD.rumbles = (PAD.rumbles || 0) + 1; }
    else if (gp.hapticActuators && gp.hapticActuators[0]) { gp.hapticActuators[0].pulse(strong, ms); PAD.rumbles = (PAD.rumbles || 0) + 1; }
  } catch (e) { }
}
// PlayStation-style button glyphs (8x8-ish, drawn on the HUD canvas)
const PSCOL = { cross: '#7cb4ff', circle: '#ff6878', square: '#f08ad8', triangle: '#40e0b0' };
function psGlyph(ctx, name, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (PSCOL[name]) {
    ctx.fillStyle = '#140820'; ctx.beginPath(); ctx.arc(x + 4.5, y + 4.5, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = PSCOL[name]; ctx.fillStyle = PSCOL[name]; ctx.lineWidth = 1.4; ctx.beginPath();
    if (name === 'cross') { ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y + 2); ctx.lineTo(x + 2, y + 7); }
    else if (name === 'circle') ctx.arc(x + 4.5, y + 4.5, 2.7, 0, TAU);
    else if (name === 'square') ctx.rect(x + 2, y + 2, 5, 5);
    else { ctx.moveTo(x + 4.5, y + 1.5); ctx.lineTo(x + 7.6, y + 7); ctx.lineTo(x + 1.4, y + 7); ctx.closePath(); }
    ctx.stroke(); return 11;
  }
  const w = name.length * 8 + 4;
  ctx.fillStyle = '#140820'; ctx.fillRect(x - 1, y - 1, w, 10); ctx.fillStyle = '#c8c0e0'; ctx.fillRect(x - 1, y - 1, w, 1); ctx.fillRect(x - 1, y + 8, w, 1);
  text(ctx, name, x + 1, y, '#ffffff', 'left', 1, null); return w + 2;
}
// draws "glyph glyph label" rows; a glyph token is wrapped in {}
function promptRow(ctx, parts, x, y, col = '#e8e0f0', align = 'left') {
  let w = 0; for (const p of parts) w += p[0] === '{' ? (PSCOL[p.slice(1, -1)] ? 11 : (p.length - 2) * 8 + 6) : p.length * 8;
  let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  for (const p of parts) { if (p[0] === '{') cx += psGlyph(ctx, p.slice(1, -1), cx, y); else { text(ctx, p, cx, y, col); cx += p.length * 8; } }
  return w;
}
