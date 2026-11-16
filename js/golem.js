'use strict';
// ===== M4: THE OSSUARY COLOSSUS - stage 3 boss (bone golem soaked in blood) =====
// Slow and enormous. Every attack is telegraphed with a pose, a tint and floor marks:
//  SLAM (both fists, crater + a jumpable shockwave ring), SWEEP (jumpable arm sweep), SKULLS (flaming skull volley),
//  SPIKES (a line of bone spears racing at the Baron), CHARGE (lumbering bull-rush; if he hits a wall he is STUNNED).
// At half health he COLLAPSES into a bone heap and reforms - faster, raising skeletons and calling a rain of bone.
EDEF.colossus = { spr: 's_colossus', h: 3.3, hp: 1900, speed: 1.35, range: 3.0, windup: 0.8, strike: 0.25, recover: 0.8, dmg: 26, mat: 'flesh', kbRes: 0.03, boss: true, title: 'THE OSSUARY COLOSSUS' };
const GO_WU = { slam: 0.85, sweep: 0.7, skulls: 0.65, spikes: 0.75, charge: 0.95, summon: 1.0 };
function golemIntro() {
  const b = G.boss; b.awake = true; b.state = 'intro'; b.st = 0; b.z = floorAt(b.x, b.y); b.poise = 0; b.lastAtk = null; b.hidden = false; b.hits = 0; b.asm = 0; b.rings = [];
  SFX.play('rattle'); SFX.play('groan'); G.shake += 3; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'colossus';
  toast('The bones of a thousand dead begin to move...', '', '#ffb0c0', 2.6);
}
function golemPick(e, dist) {
  const p2 = e.phase2; const kids = G.enemies.filter(o => o.summoned && o.alive).length;
  const W = [];
  if (dist < 3.4) W.push(['slam', 3], ['sweep', 3], ['spikes', 0.4], ['summon', p2 && kids < 2 ? 0.6 : 0]);
  else if (dist < 7.5) W.push(['charge', 2.2], ['skulls', 2.4], ['spikes', 2], ['slam', 0.6], ['summon', p2 && kids < 2 ? 1 : 0]);
  else W.push(['charge', 3], ['skulls', 2.5], ['spikes', 2.2]);
  let tot = 0; for (const w of W) { if (w[0] === e.lastAtk) w[1] *= 0.15; tot += w[1]; }
  let r = Math.random() * tot; for (const w of W) { r -= w[1]; if (r <= 0) return w[0]; } return W[0][0];
}
function golemStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hitDone = false;
  if (atk === 'slam') { SFX.play('groan'); SFX.play('glint', 0.6); }
  else if (atk === 'charge') { SFX.play('roar', 0.7); }
  else if (atk === 'skulls') SFX.play('giggle', 0.5);
  else if (atk === 'spikes' || atk === 'summon') SFX.play('rattle');
  else SFX.play('glint', 0.5);
}
function boneBurst(x, y, z, n, pw = 1) { for (let i = 0; i < n; i++) addP({ k: 'gib', tex: 'gibbone', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), z: z + rand(0, 0.6), vx: rand(-3, 3) * pw, vy: rand(-3, 3) * pw, vz: rand(1, 5) * pw, rot: 0, vr: rand(-12, 12), w: rand(0.12, 0.22), h: rand(0.12, 0.22), life: rand(2, 4) }); }
function golemSlamAt(e, x, y, dmg, r) {
  const fz = floorAt(x, y);
  G.shake += 14; G.hitstop = 0.1; SFX.play('land', 1); SFX.play('heavy'); SFX.play('stone', 0.7); rumbleFx('slam'); dust(x, y, fz, 26); boneBurst(x, y, fz, 10, 0.8);
  for (let i = 0; i < 14; i++) paintFloor(x + rand(-1.5, 1.5), y + rand(-1.5, 1.5), rand(0.15, 0.35), 160);
  spray(x, y, fz + 0.3, 0, 0, 2.2, 40, 4, Math.PI, 'flesh', 1.3);
  if (Math.hypot(P.x - x, P.y - y) < r && P.z - groundUnder(P.x, P.y, 0.1) < 0.6) hurtPlayer(dmg, x, y, { src: e, unblockable: false });
  e.rings.push({ x, y, r: 0.6, hit: false, max: e.phase2 ? 7 : 5.5, dmg: Math.round(dmg * 0.6) });
}
function golemSpawnSkels(e, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), r = rand(1.6, 2.6); let x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
    if (!arenaOK(x, y)) { x = e.x + rand(-0.5, 0.5); y = e.y + 1.2; }
    const s = makeEnemy('skeleton', x, y, { rise: true }); s.awake = true; s.summoned = true; s.hp = s.maxhp = Math.round(55 * (RUN.cfg.hp || 1)); G.enemies.push(s);
    boneBurst(x, y, floorAt(x, y), 6, 0.5);
  }
  SFX.play('rattle'); SFX.play('groan', 0.6);
}
function updateGolem(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake) return;
  if (!e.rings) e.rings = [];
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20);
  const rage = e.phase2 ? 1.28 : 1; const floor = floorAt(e.x, e.y);
  e.z = floor;
  // shockwave rings: jump them
  for (const R of e.rings) {
    R.r += dt * 6.5;
    const dd = Math.hypot(P.x - R.x, P.y - R.y);
    if (!R.hit && Math.abs(dd - R.r) < 0.38 && P.z - groundUnder(P.x, P.y, 0.1) < 0.35) { R.hit = true; hurtPlayer(R.dmg, R.x, R.y, { src: e, unblockable: true, nopd: false }); }
    if (Math.random() < dt * 30) { const a = rand(0, TAU), x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; if (!isSolid(cellAt(x, y))) addP({ k: 'dust', x, y, z: floorAt(x, y) + 0.05, vx: Math.cos(a), vy: Math.sin(a), vz: 0.6, size: 0.1, col: RGB(220, 170, 150), life: 0.4 }); }
  }
  e.rings = e.rings.filter(R => R.r < R.max);
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (Math.random() < dt * 6) boneBurst(e.x, e.y, e.z + 2, 1, 0.5); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.5; e.stunned = false; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['collapse', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'collapse'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true;
    SFX.play('gib'); SFX.play('rattle'); SFX.play('stone'); G.shake += 12; boneBurst(e.x, e.y, e.z + 1.5, 30, 1.2);
    spray(e.x, e.y, e.z + 1.5, 0, 0, 1, 80, 5, Math.PI, 'flesh', 1.6);
    toast('The Colossus crumbles...', '', '#ffb0c0', 2);
  }
  if (e.phase2 && Math.random() < dt * 9) addP({ k: 'ember', x: e.x + rand(-0.7, 0.7), y: e.y + rand(-0.7, 0.7), z: e.z + rand(1, 2.4), vx: 0, vy: 0, vz: rand(0.5, 1.5), size: 0.05, col: Math.random() < 0.5 ? RGB(190, 70, 255) : RGB(255, 40, 70), life: 0.7 });
  const face = () => { const l = -dx * Math.sin(P.ang) + dy * Math.cos(P.ang); if (Math.abs(l) > 0.4) e.flip = l > 0; };
  switch (e.state) {
    case 'intro': { // the bones fly together into the Colossus
      e.asm = Math.min(1, e.st / 1.8);
      if (e.st < 1.8 && Math.random() < dt * 40) { const a = rand(0, TAU), r = rand(3, 6); addP({ k: 'gib', tex: 'gibbone', x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, z: rand(0.2, 3), vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, vz: rand(0, 2), rot: 0, vr: rand(-12, 12), w: 0.18, h: 0.18, life: 0.6 }); }
      if (Math.random() < dt * 8) SFX.play('rattle', 0.4);
      if (e.st >= 1.8 && !e.landed) {
        e.landed = true; G.shake += 14; G.hitstop = 0.14; G.flashR = 0.3; SFX.ev('intro_colossus', 1, ['roar','howl','screech','toll','ghost']); SFX.play('roar'); SFX.play('heavy'); SFX.play('land', 1); dust(e.x, e.y, floor, 30); rumbleFx('slam');
        spray(e.x, e.y, e.z + 2.6, 0, 0, 1, 60, 4, Math.PI, 'flesh', 1.4);
        G.bigText = { img: null, t1: d.title, t2: 'Bone-Tithe of the Lich King', t: 0, dur: 3.0 };
      }
      if (e.st > 3.2) { e.state = 'chase'; e.st = 0; e.cd = 0.5; }
      break;
    }
    case 'collapse': { // a heap of bones and blood... then it reforms
      if (e.st < 1.4 && Math.random() < dt * 10) spray(e.x + rand(-0.6, 0.6), e.y + rand(-0.6, 0.6), e.z + 0.3, 0, 0, 1.5, 6, 2, 0.8, 'flesh');
      if (e.st > 1.4 && !e.reformed) {
        e.reformed = true; e.intangible = false; G.shake += 12; G.flashG = 0.3; G.zoom = 0.1; SFX.play('roar'); SFX.play('screech', 0.6); boneBurst(e.x, e.y, e.z, 20, 1);
        toast('IT REFORMS - SOAKED IN BLOOD', '"The Lich King\'s tithe is your marrow, Baron."', '#ff6080', 3.5);
        golemSpawnSkels(e, 2);
      }
      if (e.st > 2.3) { e.state = 'chase'; e.st = 0; e.cd = 0.3; }
      break;
    }
    case 'chase': {
      face();
      const sp = d.speed * rage * (RUN.cfg.spd || 1); const want = 2.6;
      if (Math.random() < dt * 0.8) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) + Math.cos(tang) * 0.5, my = Math.sin(ang) * (dist - want) + Math.sin(tang) * 0.5;
      const l = Math.hypot(mx, my);
      if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } const pw = e.walk; e.walk += sp * dt * 2.6; if (Math.floor(pw / Math.PI) !== Math.floor(e.walk / Math.PI)) { SFX.play('land', 0.35); G.shake += 0.8; dust(e.x, e.y, floor, 4); } }
      if (e.cd <= 0 && losTo(e.x, e.y, P.x, P.y)) golemStartAtk(e, golemPick(e, dist), ang);
      break;
    }
    case 'windup': {
      face();
      const wu = GO_WU[e.atk] / rage; const k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.75 ? 5 : 0.4));
      golemTelegraph(e, k, dist);
      if (e.st >= wu) { e.state = 'strike'; e.st = 0; golemStrike(e, dist); }
      break;
    }
    case 'strike': {
      if (e.atk === 'charge') {
        const v = 9.5 * rage; const ox = e.x, oy = e.y;
        const blocked_ = moveEntity(e, Math.cos(e.lockA) * v * dt, Math.sin(e.lockA) * v * dt, e.r, 0.33, false);
        const moved = Math.hypot(e.x - ox, e.y - oy);
        if (Math.random() < dt * 30) dust(e.x, e.y, floor, 2);
        if (!e.hitDone && dist < e.r + 0.9) { e.hitDone = true; hurtPlayer(Math.round(30 * (e.phase2 ? 1.12 : 1)), e.x, e.y, { src: e }); P.vx += Math.cos(e.lockA) * 9; P.vy += Math.sin(e.lockA) * 9; }
        if (!arenaOK(e.x, e.y) || blocked_ || moved < v * dt * 0.35) { // crashed into a wall or pillar: STUNNED
          e.x = ox; e.y = oy; e.state = 'stagger'; e.stagger = 2.1; e.stunned = true; e.atk = null; e.st = 0;
          G.shake += 16; G.hitstop = 0.12; SFX.play('stone'); SFX.play('heavy'); SFX.play('gib', 0.6); rumbleFx('slam'); boneBurst(e.x + Math.cos(e.lockA), e.y + Math.sin(e.lockA), e.z + 2.4, 16, 0.8); dust(e.x, e.y, floor, 24);
          for (let i = 0; i < 6; i++) { const hx = e.x + rand(-3, 3), hy = e.y + rand(-3, 3); if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.6 - i * 0.07, dmg: 10 }); }
          toast('STUNNED!', 'He crashed into the wall - strike now!', '#ffd060', 1.6); break;
        }
        if (e.st >= 1.5) { e.state = 'recover'; e.st = 0; }
        break;
      }
      const dur = e.atk === 'slam' ? 0.35 : e.atk === 'sweep' ? 0.3 : 0.25;
      if (e.st >= dur) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': {
      const rd = (e.atk === 'slam' ? 1.0 : e.atk === 'charge' ? 0.9 : e.atk === 'summon' ? 0.6 : 0.7) / (e.phase2 ? 1.15 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.5, 1.1) / rage; }
      break;
    }
  }
  // blood rain of bone in phase 2
  if (e.phase2 && e.state !== 'collapse' && Math.random() < dt * 0.35) { for (let i = 0; i < 3; i++) { const a = rand(0, TAU), r = rand(0.6, 2.6), hx = P.x + Math.cos(a) * r, hy = P.y + Math.sin(a) * r; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.9 - i * 0.1, dmg: 10 }); } }
  // keep him clear of the Baron
  if (e.alive && !e.intangible) { const ddx = e.x - P.x, ddy = e.y - P.y, dd = Math.hypot(ddx, ddy), md = PR + e.r; if (dd < md && dd > 0.001) moveEntity(e, ddx / dd * (md - dd), ddy / dd * (md - dd), e.r, 0.33, false); }
}
function golemTelegraph(e, k, dist) {
  const a0 = e.lockA;
  for (let i = 0; i < 3; i++) {
    let x, y, col;
    if (e.atk === 'slam') { const cx = e.x + Math.cos(a0) * 1.7, cy = e.y + Math.sin(a0) * 1.7, a = rand(0, TAU), r = 2.0 * Math.sqrt(Math.random()); x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r; col = RGB(255, 255, 255); }
    else if (e.atk === 'sweep') { const a = a0 + rand(-1.4, 1.4), r = rand(1.2, 3.4); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 40, 60); }
    else if (e.atk === 'charge') { const r = rand(1, 7) * Math.min(1, k * 1.4); x = e.x + Math.cos(a0) * r + rand(-0.4, 0.4); y = e.y + Math.sin(a0) * r + rand(-0.4, 0.4); col = RGB(255, 90, 40); }
    else if (e.atk === 'spikes') { const r = rand(1, Math.max(1.2, dist + 1)); x = e.x + Math.cos(a0) * r; y = e.y + Math.sin(a0) * r; col = RGB(230, 220, 200); }
    else if (e.atk === 'skulls') { x = e.x + Math.cos(a0) * 0.9 + rand(-0.3, 0.3); y = e.y + Math.sin(a0) * 0.9 + rand(-0.3, 0.3); addP({ k: 'spark', x, y, z: e.z + 2.6 + rand(-0.3, 0.3), vx: 0, vy: 0, vz: rand(0, 0.6), size: 0.06, col: RGB(120, 255, 90), life: 0.25 }); continue; }
    else { x = e.x + rand(-2, 2); y = e.y + rand(-2, 2); col = RGB(190, 80, 255); }
    addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
  }
}
function golemStrike(e, dist) {
  const dx = P.x - e.x, dy = P.y - e.y;
  const dm = e.phase2 ? 1.12 : 1;
  switch (e.atk) {
    case 'slam': golemSlamAt(e, e.x + Math.cos(e.lockA) * 1.7, e.y + Math.sin(e.lockA) * 1.7, Math.round(28 * dm), 2.0); break;
    case 'sweep': SFX.play('swingH'); dust(e.x, e.y, floorAt(e.x, e.y), 12); bossSlash(e, Math.round(22 * dm), 1.45, 3.7, { jumpable: true }); break;
    case 'charge': SFX.play('roar', 0.6); SFX.play('heavy', 0.6); break;
    case 'summon': golemSpawnSkels(e, 2); break;
    case 'spikes': {
      SFX.play('rattle'); const n = Math.min(12, Math.ceil(dist + 3));
      for (const off of e.phase2 ? [-0.32, 0, 0.32] : [0]) for (let i = 1; i <= n; i++) { const a = e.lockA + off, hx = e.x + Math.cos(a) * i * 0.8, hy = e.y + Math.sin(a) * i * 0.8; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.25 - i * 0.07, dmg: Math.round(16 * dm) }); }
      break;
    }
    case 'skulls': {
      const n = e.phase2 ? 5 : 3; SFX.play('fire', 0.8);
      for (let i = 0; i < n; i++) {
        const a = e.lockA + (i - (n - 1) / 2) * 0.22, sp = 7.5, ez = e.z + 2.6, dz = (P.z + 1.0 - ez);
        G.projectiles.push({ type: 'fireball', x: e.x + Math.cos(a) * 1.0, y: e.y + Math.sin(a) * 1.0, z: ez, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: dz / Math.max(1, Math.hypot(dx, dy)) * sp, dmg: Math.round(12 * dm), life: 3, owner: e,
          spr: (p, t) => ({ tex: 'skullproj', x: p.x, y: p.y, z: p.z - 0.2, w: 0.42, h: 0.4, lit: false, glow: 0.4, tint: [120, 255, 90, 0.15] }) });
      }
      break;
    }
  }
}
// pose animation layered on the generic enemy visual
function golemVisual(e, v) {
  if (e.type !== 'colossus' || e.dead) return v;
  const t = e.t;
  if (e.state === 'intro') { const k = e.asm || 0; v.alpha = (v.alpha || 1) * Math.min(1, k * 1.6); v.h *= 0.4 + 0.6 * k; v.wave = 0.2 * (1 - k); v.waveF = 9; v.waveP = t * 14; if (k < 1) v.tint = [255, 230, 210, 0.5 * (1 - k)]; return v; }
  if (e.state === 'collapse') { const k = e.st < 1.4 ? Math.min(1, e.st / 0.35) : Math.max(0, 1 - (e.st - 1.4) / 0.6); v.h *= 1 - 0.72 * k; v.w *= 1 + 0.35 * k; v.skew = Math.sin(t * 30) * 0.05 * k; v.tint = [255, 20, 40, 0.3 * k]; return v; }
  // heavy lumbering steps
  if (e.state === 'chase') { v.z += Math.abs(Math.sin(e.walk)) * 0.06; v.skew = (v.skew || 0) * 0.5 + Math.sin(e.walk) * 0.05; v.legs = 0; }
  const wu = (GO_WU[e.atk] || 0.7) / (e.phase2 ? 1.28 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  if (e.state === 'windup') {
    if (e.atk === 'slam') { v.h *= 1 + 0.16 * k; v.w *= 1 - 0.06 * k; v.lean = -0.3 * k; v.tint = [255, 255, 255, 0.15 + 0.35 * pulse]; }
    else if (e.atk === 'sweep') { v.skew = (v.skew || 0) + e.side * 0.2 * k; v.w *= 1 + 0.1 * k; v.tint = [255, 40, 50, 0.18 + 0.35 * pulse]; }
    else if (e.atk === 'charge') { v.lean = 0.25 * k; v.h *= 1 - 0.1 * k; v.w *= 1 + 0.08 * k; v.z += Math.abs(Math.sin(t * 30)) * 0.05 * k; v.tint = [255, 90, 30, 0.2 + 0.35 * pulse]; }
    else if (e.atk === 'skulls') { v.h *= 1 + 0.05 * k; v.glow = 0.4 * k; v.tint = [120, 255, 90, 0.15 + 0.3 * pulse]; }
    else if (e.atk === 'spikes') { v.h *= 1 - 0.12 * k; v.tint = [240, 230, 210, 0.15 + 0.3 * pulse]; }
    else { v.tint = [190, 70, 255, 0.2 + 0.3 * pulse]; v.glow = 0.4; }
    v.rim = 2.2;
  } else if (e.state === 'strike') {
    if (e.atk === 'slam') { v.h *= 0.86; v.w *= 1.16; v.lean = 0.45; }
    else if (e.atk === 'sweep') { v.skew = (v.skew || 0) - e.side * 0.26; v.w *= 1.14; }
    else if (e.atk === 'charge') { v.lean = 0.4; v.z += Math.abs(Math.sin(t * 22)) * 0.1; v.skew = Math.sin(t * 22) * 0.06; v.tint = [255, 60, 30, 0.25]; }
  }
  if (e.stunned && e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
  if (e.phase2 && !v.tint) v.tint = [255, 30, 70, 0.1 + 0.08 * Math.sin(t * 6)];
  return v;
}
// shockwave rings + the soul flame
function golemSprites(S, t) {
  const b = G.boss; if (!b || b.type !== 'colossus' || !b.alive) return;
  for (const R of (b.rings || [])) {
    const n = Math.max(10, Math.round(R.r * 7));
    for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 0.3, x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; if (isSolid(cellAt(x, y))) continue; S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.15, w: 0.7, h: 0.45, add: true, alpha: 0.6 * (1 - R.r / R.max) + 0.2, lit: false, tint: [255, 200, 170, 1] }); }
  }
  if (!b.hidden && b.state !== 'collapse' && b.state !== 'intro') S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.42, w: 1.4, h: 1.4, add: true, alpha: 0.35 + 0.15 * Math.sin(t * 5), lit: false, tint: b.phase2 ? [255, 40, 90, 1] : [170, 70, 255, 1] });
}
// extra bone gore on the death burst (the generic boss death does the blood)
function golemDeathTick(e) {
  if (e.type !== 'colossus') return;
  if (e.bossDeath > 2.4 && !e.boneOut) { e.boneOut = true; boneBurst(e.x, e.y, e.z + 1.5, 40, 1.4); e.rings = []; }
  else if (Math.random() < 0.2) boneBurst(e.x, e.y, e.z + rand(0.5, 2.5), 1, 0.6);
}
