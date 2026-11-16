'use strict';
// ===== M2 weapons: Purple Lightning Longsword, Vampire Rapier, Spiked Chain Whip, Gothic Crossbow =====
// Sword variants swap only the blade sprite: the approved 3D-baked hand + hold stay pixel-identical.
const SWSPR = { base: ['vm_sword2', 'vm_sword_glow'], frost: ['vm_sword_frost', 'vm_sword_frost_glow'], storm: ['vm_sword_storm', 'vm_sword_storm_glow'], rapier: ['vm_sword_rapier', 'vm_sword_rapier_glow'] };
const SWTRAIL = { base: ['#9a50ff', '#f0dcff'], frost: ['#40b8ff', '#e0faff'], storm: ['#b040ff', '#ffffff'], rapier: ['#ff2050', '#ffd0dc'] };
function stormBlade(ctx, X, Y, R, S, t) {
  // crackling violet arcs that hop along the blade, brighter mid-swing
  const amt = P.sw ? 1 : 0.45;
  if (Math.random() < 0.55 * amt) {
    const u0 = rand(0.25, 0.85), u1 = Math.min(0.98, u0 + rand(0.08, 0.2));
    const a = tipOf([X, Y, R, S / VSC], u0), b = tipOf([X, Y, R, S / VSC], u1);
    const side = Math.random() < 0.5 ? -1 : 1, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1;
    const pts = [a]; for (let i = 1; i < 5; i++) { const f = i / 5, o = side * rand(2, 7); pts.push([a[0] + (b[0] - a[0]) * f + nx / L * o, a[1] + (b[1] - a[1]) * f + ny / L * o]); } pts.push(b);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, c, al] of [[3, '#9a40ff', 0.35], [1, '#f0e0ff', 0.9]]) { ctx.globalAlpha = al * amt; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    ctx.restore();
  }
  if (Math.random() < 0.3 && VMP.length < 140) { const p = tipOf([X, Y, R, S / VSC], rand(0.3, 0.95)); VMP.push({ x: p[0], y: p[1], vx: rand(-20, 20), vy: rand(-25, 5), life: rand(0.15, 0.35), t: 0, c: Math.random() < 0.5 ? '#d0a0ff' : '#ffffff' }); }
}
function rapierBlade(ctx, X, Y, R, S, t) {
  // a bead of blood glinting down the needle, drips off the tip
  const g = (t * 0.7) % 1; const p = tipOf([X, Y, R, S / VSC], 0.25 + g * 0.72);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * Math.sin(g * Math.PI); ctx.fillStyle = '#ff4060';
  ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 2, 2); ctx.restore();
  if (Math.random() < 0.04 && VMP.length < 140) { const q = tipOf([X, Y, R, S / VSC], 0.99); VMP.push({ x: q[0], y: q[1], vx: 0, vy: 30, life: 0.6, t: 0, c: '#c01030', frost: 1 }); }
}
// spiked chain: steel links alternating face-on / edge-on, spikes every third link
function chainCord(ctx, pts, lash) {
  const n = pts.length; let acc = 0, k = 0;
  for (let i = 1; i < n; i++) {
    const p = pts[i - 1], q = pts[i]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.01) continue;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
    for (let d = 0; d < L; d += 1) {
      acc += 1; if (acc < 3.2) continue; acc = 0; k++;
      const x = p[0] + ux * d, y = p[1] + uy * d, s = i / n, big = 1 + (1 - s) * 1.2;
      const face = k % 2 === 0;
      ctx.fillStyle = '#12101c'; ctx.fillRect(Math.round(x - 2 * big), Math.round(y - 2 * big), Math.round(4 * big), Math.round(4 * big));
      if (face) { ctx.fillStyle = '#8890a8'; ctx.fillRect(Math.round(x - 1.5 * big), Math.round(y - 1.5 * big), Math.round(3 * big), Math.round(3 * big)); ctx.fillStyle = '#1c1a28'; ctx.fillRect(Math.round(x - 0.5), Math.round(y - 0.5), 1, 1); ctx.fillStyle = '#d8e0f0'; ctx.fillRect(Math.round(x - 1.5 * big), Math.round(y - 1.5 * big), Math.round(2 * big), 1); }
      else { ctx.fillStyle = '#b0b8d0'; ctx.fillRect(Math.round(x - 1.5 * big), Math.round(y - 0.5), Math.round(3 * big), Math.max(1, Math.round(big))); }
      if (k % 3 === 0) { const nx = -uy, ny = ux; ctx.fillStyle = '#e8ecff'; ctx.fillRect(Math.round(x + nx * 3 * big), Math.round(y + ny * 3 * big), 1, 1); ctx.fillRect(Math.round(x - nx * 3 * big), Math.round(y - ny * 3 * big), 1, 1); ctx.fillStyle = '#c02040'; ctx.fillRect(Math.round(x + nx * 2 * big), Math.round(y + ny * 2 * big), 1, 1); }
    }
  }
  if (lash) { const tip = pts[n - 1]; ctx.fillStyle = '#12101c'; ctx.fillRect(Math.round(tip[0]) - 4, Math.round(tip[1]) - 4, 8, 8); ctx.fillStyle = '#c8d0e8'; ctx.fillRect(Math.round(tip[0]) - 3, Math.round(tip[1]) - 3, 6, 6); ctx.fillStyle = '#ffffff'; for (const [a, b] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) ctx.fillRect(Math.round(tip[0]) + a, Math.round(tip[1]) + b, 1, 1); ctx.fillStyle = '#ff2050'; ctx.fillRect(Math.round(tip[0]) - 1, Math.round(tip[1]) - 1, 2, 2); }
}
// Gothic Crossbow: hitscan silver bolt that pierces, with a visible streak
function fireCrossbow() {
  const cost = Math.max(2, 6 - 2 * ((P.mods && P.mods.quiver) || 0));
  if (!P.hasPistol || P.pistol || P.mana < cost || P.latch) return;
  P.mana -= cost; P.pistol = { t: 0, dur: 0.8, xb: 1 }; SFX.ev('xbow_fire', 1, ['whip', 'swingH', 'clink']); SFX.play('whip', 0.9); SFX.play('swingH', 0.8); SFX.play('clink', 0.6); G.shake += 3; P.kick += 6; rumbleFx('whip');
  const a = aimVec(); const wall = rayMarch(30);
  const pierce = 3 + ((P.mods && P.mods.quiver) ? 1 : 0);
  const hits = enemiesOnRay(wall.d, 0.2).slice(0, pierce);
  const ez = eyeZ() - 0.25;
  hits.forEach((h, i) => {
    const e = h.e;
    damageEnemy(e, 40 * (P.punish > 0 ? 2 : 1) * ((P.mods && P.mods.ranged) || 1) * (i ? 0.8 : 1), { dx: a.x, dy: a.y, dz: 0.15, kb: 2.5, heavy: true, src: 'pistol', col: '#e8d0ff' });
    if (e.alive && !e.d.boss) { e.stagger = Math.max(e.stagger, 0.55); e.state = 'stagger'; e.st = 0; e.atk = null; }
    spray(e.x, e.y, e.z + e.h * 0.55, a.x, a.y, 0.3, 24, 4, 0.4, e.d.mat, 1.1);
  });
  if (P.punish > 0 && hits.length) P.punish = 0;
  SFX.ev('bolt_impact', hits.length ? 0.8 : 0.6);
  if (!hits.length || hits.length < pierce) { if (!hitCracked(wall.x, wall.y)) sparks(wall.px || wall.x, wall.py || wall.y, wall.z, 12, RGB(220, 200, 255)); }
  addBolt(P.x + a.x * 0.6, P.y + a.y * 0.6, ez, wall.x, wall.y, wall.z, '#c8a8ff', 0.7); BOLTS[BOLTS.length - 1].straight = true; BOLTS[BOLTS.length - 1].dur = 0.12;
}
function drawCrossbow(ctx, bx, by, t) {
  const pt = P.pistol.t, im = Engine.imgs.vm_crossbow, em = Engine.imgs.vm_crossbow_empty, bolt = Engine.imgs.vm_crossbow_bolt;
  // raise -> shot kick -> settle -> reload (bolt slides home) -> lower
  const raise = Math.min(1, pt / 0.06), lower = clamp((pt - 0.62) / 0.18, 0, 1);
  const kick = Math.max(0, 1 - pt / 0.14);
  const x = Math.round(W / 2 - 128 + bx * 0.7), y = Math.round(H - 168 + by * 0.6 + (1 - raise) * 70 + lower * 150 - kick * 12 + Math.sin(pt * 40) * kick * 2);
  const loaded = pt > 0.56;
  ctx.save(); ctx.translate(x + 116, y + 120); ctx.rotate(-0.05 * kick + 0.04 * Math.sin(clamp((pt - 0.3) / 0.3, 0, 1) * Math.PI)); ctx.translate(-116, -120);
  // bowstring: snapped forward after the shot, drawn back when cocked
  const cock = loaded ? 1 : clamp((pt - 0.36) / 0.2, 0, 1), vib = pt < 0.34 ? Math.sin(pt * 95) * (1 - pt / 0.34) * 7 : 0, ny = lerp(74, 116, cock) + vib;
  // M4: sound cues ride the animation (string snap -> crank -> bolt click)
  const PS = P.pistol; if (PS) { if (pt > 0.3 && !PS.s1) { PS.s1 = 1; if (PS.xb) SFX.ev('xbow_crank', 0.75, ['latch', 'clink'], 0.4); SFX.play('latch', 0.5); } if (pt > 0.55 && !PS.s2) { PS.s2 = 1; SFX.play('clink', 0.7); G.shake += 0.6; } }
  ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 100); ctx.lineTo(116, ny); ctx.lineTo(217, 100); ctx.stroke();
  ctx.strokeStyle = '#d8d0e8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, 100); ctx.lineTo(116, ny); ctx.lineTo(217, 100); ctx.stroke();
  ctx.drawImage(loaded || pt < 0.02 ? im : em, 0, 0);
  // M4: the cranequin - a crank on the stock winds the string back (spins during the reload)
  if (pt > 0.26 && pt < 0.62) { const k = clamp((pt - 0.26) / 0.32, 0, 1), ca = k * TAU * 2.2, cx = 152, cy = 108, rx = 26, ry = 16;
    const ex = Math.round(cx + Math.cos(ca) * rx), ey = Math.round(cy + Math.sin(ca) * ry);
    // M5: a faint swept path + a bolder steel arm so the wind-up reads at a glance
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * Math.sin(k * Math.PI); ctx.strokeStyle = '#b080ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#14081c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#d8ccec'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - 1); ctx.lineTo(ex, ey - 1); ctx.stroke();
    ctx.fillStyle = '#14081c'; ctx.fillRect(ex - 5, ey - 6, 11, 13); ctx.fillStyle = '#8a4a26'; ctx.fillRect(ex - 4, ey - 5, 9, 11); ctx.fillStyle = '#c07a3a'; ctx.fillRect(ex - 3, ey - 4, 3, 9);
    ctx.fillStyle = '#14081c'; ctx.fillRect(cx - 6, cy - 6, 12, 12); ctx.fillStyle = '#f0c040'; ctx.fillRect(cx - 5, cy - 5, 10, 10); ctx.fillStyle = '#fff0a0'; ctx.fillRect(cx - 4, cy - 4, 3, 3); ctx.fillStyle = '#5a2a80'; ctx.fillRect(cx - 2, cy - 2, 4, 4); }
  if (!loaded && pt > 0.4) { const k = clamp((pt - 0.4) / 0.16, 0, 1); ctx.globalAlpha = k; ctx.drawImage(bolt, 0, Math.round((1 - k) * 34)); ctx.globalAlpha = 1; }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5) + kick * 0.5; ctx.drawImage(Engine.imgs.vm_crossbow_glow, 0, 0);
  if (typeof xbowFX === 'function') { ctx.globalAlpha = 1; xbowFX(ctx, t, loaded || pt < 0.02 ? 'vm_crossbow' : 'vm_crossbow_empty', kick); }
  ctx.restore();
  if (pt < 0.09) { const k = 1 - pt / 0.09; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = '#e0c8ff'; ctx.fillRect(Math.round(x + 104), Math.round(y - 6), 25, 3); ctx.fillRect(Math.round(x + 115), Math.round(y - 22), 3, 34);
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#a060ff'; ctx.beginPath(); ctx.ellipse(x + 116, y - 5, 22 * (1.2 - k * 0.5), 9 * (1.2 - k * 0.5), 0, 0, TAU); ctx.fill(); ctx.restore(); }
}
// spider venom: telegraph ring, then a hissing pool that bites while you stand in it
function updateVenom(h, dt) {
  h.t += dt; const fz = floorAt(h.x, h.y);
  if (h.t < 0) { if (Math.random() < dt * 24) addP({ k: 'spark', x: h.x + rand(-0.5, 0.5), y: h.y + rand(-0.5, 0.5), z: fz + 0.03, vx: 0, vy: 0, vz: 0.5 + (h.t > -0.25 ? 1.4 : 0), size: 0.05, col: RGB(150, 255, 60), life: 0.2 }); return; }
  if (!h.up) { h.up = true; SFX.play('fire', 0.4); spray(h.x, h.y, fz + 0.3, 0, 0, 2.2, 12, 3, 0.5, 'ichor'); h.tick = 0; }
  if (Math.random() < dt * 8) addP({ k: 'smoke', x: h.x + rand(-0.5, 0.5), y: h.y + rand(-0.5, 0.5), z: fz + 0.05, vx: 0, vy: 0, vz: rand(0.2, 0.6), size: 0.1, col: RGB(110, 220, 50), life: 0.7 });
  h.tick -= dt;
  if (h.tick <= 0 && Math.hypot(P.x - h.x, P.y - h.y) < 0.75 && P.z - groundUnder(P.x, P.y, 0.1) < 0.35) { h.tick = 0.5; hurtPlayer(h.dmg, h.x, h.y, { unblockable: true, nopd: true, env: false }); P.poisonT = Math.max(P.poisonT || 0, 1.5); }
}
