'use strict';
// ===== M2: THE BROOD MOTHER - Giant Spider boss (sprite 16) + crypt spiderlings =====
// Every attack has a wind-up pose, a tint and a floor telegraph; she flinches on every hit, breaks posture,
// staggers on parries (finisher-able) and goes berserk at half health (ceiling drops, venom rain, bigger broods).
EDEF.spider = { spr: 's_spider', h: 2.6, hp: 1500, speed: 2.4, range: 2.4, windup: 0.6, strike: 0.25, recover: 0.6, dmg: 22, mat: 'ichor', kbRes: 0.06, boss: true, title: 'THE BROOD MOTHER' };
EDEF.spiderling = { spr: 's_spiderling', h: 0.5, hp: 18, speed: 3.4, range: 1.05, windup: 0.32, strike: 0.25, recover: 0.55, dmg: 7, mat: 'ichor', kbRes: 1.5, lunge: 6.5, name: 'Crypt Spiderling' };
MAT.ichor = [RGB(150, 230, 40), RGB(90, 170, 20), RGB(200, 10, 40), RGB(60, 110, 10), RGB(230, 255, 120)];
const SP_WU = { bite: 0.55, sweep: 0.75, spit: 0.6, brood: 0.9, venom: 0.7, drop: 0.35 };
function spiderIntro() {
  const b = G.boss; b.awake = true; b.state = 'intro'; b.st = 0; b.z = 4.6; b.poise = 0; b.lastAtk = null; b.hidden = false; b.hits = 0;
  SFX.play('screech'); SFX.play('rattle'); G.shake += 3; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'spider';
  toast('Silk threads tremble overhead...', '', '#b0ff90', 2.5);
}
function spiderPick(e, dist) {
  const p2 = e.phase2; const kids = G.enemies.filter(o => o.summoned && o.alive && o.type === 'spiderling').length;
  const W = [];
  if (dist < 3.2) W.push(['bite', 3], ['sweep', 3], ['venom', p2 ? 1 : 0], ['drop', p2 ? 1.2 : 0], ['brood', kids < 3 ? 0.6 : 0]);
  else if (dist < 7) W.push(['bite', 2.5], ['spit', 2.2], ['brood', kids < 3 ? 1 : 0], ['venom', p2 ? 1.6 : 0.5], ['drop', p2 ? 1.6 : 0.4]);
  else W.push(['spit', 3], ['bite', 1.5], ['drop', p2 ? 2 : 0.8], ['brood', kids < 3 ? 1.2 : 0]);
  let tot = 0; for (const w of W) { if (w[0] === e.lastAtk) w[1] *= 0.2; tot += w[1]; }
  let r = Math.random() * tot; for (const w of W) { r -= w[1]; if (r <= 0) return w[0]; } return W[0][0];
}
function spiderStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hits = 0; e.hitDone = false;
  if (atk === 'bite') SFX.play('glint'); else if (atk === 'spit' || atk === 'venom') SFX.play('giggle', 0.6); else if (atk === 'brood') SFX.play('rattle'); else SFX.play('screech', 0.7);
}
function spiderSpawnKids(e, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), r = rand(1.2, 2.2); let x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
    if (!arenaOK(x, y)) { x = e.x; y = e.y; }
    const s = makeEnemy('spiderling', x, y, { rise: false }); s.awake = true; s.summoned = true; s.hp = s.maxhp = Math.round(18 * (RUN.cfg.hp || 1)); G.enemies.push(s);
    for (let k = 0; k < 8; k++) addP({ k: 'blood', x, y, z: 0.2, vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(1, 3), size: 0.05, col: MAT.ichor[k % 2], life: 0.8, mat: 'ichor' });
  }
  SFX.play('gib', 0.5); SFX.play('rattle', 0.6);
}
function updateSpider(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 22); e.t += 0;
  const rage = e.phase2 ? 1.3 : 1; const floor = floorAt(e.x, e.y);
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.004, dt); e.kby *= Math.pow(0.004, dt); }
  if (!['intro', 'ceiling', 'drop'].includes(e.state) && e.z > floor) e.z = Math.max(floor, e.z - dt * 9);
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; e.intangible = false; if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.4; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['rage', 'ceiling', 'drop', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'rage'; e.st = 0; e.atk = null; e.poise = 0; SFX.play('screech'); SFX.play('roar'); G.shake += 10; G.flashG = 0.3; G.zoom = 0.1;
    toast('Her eyes blaze violet. The brood answers.', '"You will feed my children, Baron."', '#c080ff', 4);
    spiderSpawnKids(e, 4);
    for (let i = 0; i < 40; i++) addP({ k: 'ecto', x: e.x + rand(-1.2, 1.2), y: e.y + rand(-1.2, 1.2), z: e.z + rand(0, 2.4), vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(0.5, 3), size: rand(0.05, 0.1), col: Math.random() < 0.5 ? RGB(190, 70, 255) : RGB(140, 255, 60), life: rand(0.6, 1.4) });
  }
  if (e.phase2 && Math.random() < dt * 8) addP({ k: 'ember', x: e.x + rand(-0.8, 0.8), y: e.y + rand(-0.8, 0.8), z: e.z + rand(0.3, 2.2), vx: 0, vy: 0, vz: rand(0.5, 1.4), size: 0.05, col: Math.random() < 0.5 ? RGB(190, 70, 255) : RGB(140, 255, 60), life: 0.7 });
  const face = () => { const l = -dx * Math.sin(P.ang) + dy * Math.cos(P.ang); if (Math.abs(l) > 0.3) e.flip = l > 0; };
  switch (e.state) {
    case 'intro': { // lowers herself from the vault on a silk line, lands, screams
      const k = Math.min(1, e.st / 1.6); e.z = floor + 4.6 * (1 - k * k);
      if (Math.random() < dt * 20) addP({ k: 'spark', x: e.x + rand(-0.1, 0.1), y: e.y + rand(-0.1, 0.1), z: e.z + 2.6 + rand(0, 2), vx: 0, vy: 0, vz: -0.4, size: 0.03, col: RGB(230, 230, 240), life: 0.4 });
      if (e.st >= 1.6 && !e.landed) {
        e.landed = true; e.z = floor; G.shake += 12; G.hitstop = 0.12; G.flashG = 0.25; SFX.ev('intro_spider', 1, ['roar','howl','screech','toll','ghost']); SFX.play('land', 1); SFX.play('heavy'); SFX.play('screech'); SFX.play('roar', 0.6); dust(e.x, e.y, floor, 26); rumbleFx('slam');
        G.bigText = { img: null, t1: d.title, t2: 'Matriarch of the Crypt', t: 0, dur: 3.0 };
      }
      if (e.st > 3.0) { e.state = 'chase'; e.st = 0; e.cd = 0.6; }
      break;
    }
    case 'rage': if (e.st > 1.6) { e.state = 'chase'; e.st = 0; e.cd = 0.2; } break;
    case 'chase': {
      face();
      const sp = d.speed * rage * (RUN.cfg.spd || 1); const want = 3.0;
      if (Math.random() < dt * 1.4) e.side *= -1;
      e.burst = Math.max(0, (e.burst || 0) - dt); if (Math.random() < dt * 0.9) e.burst = 0.35;   // skittering bursts
      const tang = ang + Math.PI / 2 * e.side; const bk = e.burst > 0 ? 2.2 : 1;
      let mx = Math.cos(ang) * (dist - want) * 0.8 + Math.cos(tang) * 0.9, my = Math.sin(ang) * (dist - want) * 0.8 + Math.sin(tang) * 0.9;
      const l = Math.hypot(mx, my); if (l > 0.05) { mx = mx / l * sp * bk; my = my / l * sp * bk; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } e.walk += sp * bk * dt * 4; }
      if (Math.random() < dt * 5) SFX.play('step', 0.5);
      if (e.cd <= 0 && losTo(e.x, e.y, P.x, P.y)) spiderStartAtk(e, spiderPick(e, dist), ang);
      break;
    }
    case 'windup': {
      face();
      const wu = SP_WU[e.atk] / rage; const k = Math.min(1, e.st / wu);
      if (e.atk !== 'drop' && e.atk !== 'brood') e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.7 ? 6 : 0.5));
      spiderTelegraph(e, k);
      if (e.st >= wu) { e.state = 'strike'; e.st = 0; spiderStrike(e); }
      break;
    }
    case 'strike': {
      if (e.atk === 'bite') { // lunge along the locked line, fangs first
        const v = 10 * Math.max(0, 1 - e.st / 0.28); const ox = e.x, oy = e.y; moveEntity(e, Math.cos(e.lockA) * v * dt, Math.sin(e.lockA) * v * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; }
        if (!e.hitDone && dist < e.r + 0.85 && Math.abs(angDiff(ang, e.lockA)) < 1.0) { e.hitDone = true; hurtPlayer(Math.round(24 * (e.phase2 ? 1.15 : 1)), e.x, e.y, { src: e }); }
      }
      const dur = e.atk === 'bite' ? 0.32 : e.atk === 'sweep' ? 0.28 : 0.22;
      if (e.st >= dur) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': {
      const rd = (e.atk === 'drop' ? 1.1 : e.atk === 'bite' ? 0.7 : 0.55) / (e.phase2 ? 1.15 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.4, 1.0) / rage; }
      break;
    }
    case 'ceiling': { // up in the dark, a red ring stalks the Baron... then locks
      e.intangible = true; const top = Math.min(4.7, (CH[cellAt(e.x, e.y)] || 5) - 0.9);
      e.z = Math.min(top, e.z + dt * 14);
      if (e.st < 1.15) { e.tgt[0] += (P.x - e.tgt[0]) * Math.min(1, dt * 5); e.tgt[1] += (P.y - e.tgt[1]) * Math.min(1, dt * 5); }
      else if (!e.locked) { e.locked = true; SFX.play('glint'); }
      e.x += (e.tgt[0] - e.x) * Math.min(1, dt * 8); e.y += (e.tgt[1] - e.y) * Math.min(1, dt * 8);
      if (Math.random() < dt * 40) { const a = rand(0, TAU); addP({ k: 'spark', x: e.tgt[0] + Math.cos(a) * 2.1, y: e.tgt[1] + Math.sin(a) * 2.1, z: floorAt(e.tgt[0], e.tgt[1]) + 0.03, vx: 0, vy: 0, vz: e.locked ? 2 : 0.6, size: e.locked ? 0.06 : 0.04, col: e.locked ? RGB(255, 255, 255) : RGB(255, 40, 60), life: 0.2 }); }
      if (e.st >= 1.6) { e.state = 'drop'; e.st = 0; e.x = e.tgt[0]; e.y = e.tgt[1]; }
      break;
    }
    case 'drop': {
      e.z = Math.max(floor, e.z - dt * 22);
      if (e.z <= floor + 0.01) {
        e.intangible = false; e.state = 'recover'; e.st = 0; e.landed2 = true;
        G.shake += 14; G.hitstop = 0.1; SFX.play('land', 1); SFX.play('heavy'); dust(e.x, e.y, floor, 30); rumbleFx('slam');
        for (let i = 0; i < 18; i++) paintFloor(e.x + rand(-2, 2), e.y + rand(-2, 2), rand(0.1, 0.3), 120);
        if (Math.hypot(P.x - e.x, P.y - e.y) < 2.2 && P.z - groundUnder(P.x, P.y, 0.1) < 0.6) hurtPlayer(Math.round(30 * (e.phase2 ? 1.1 : 1)), e.x, e.y, { src: e, unblockable: true });
        if (e.phase2) spiderSpawnKids(e, 2);
      }
      break;
    }
  }
  // keep her clear of the Baron
  if (e.alive && !e.intangible && e.z < P.z + 1.2) { const ddx = e.x - P.x, ddy = e.y - P.y, dd = Math.hypot(ddx, ddy), md = PR + e.r; if (dd < md && dd > 0.001) moveEntity(e, ddx / dd * (md - dd), ddy / dd * (md - dd), e.r, 0.33, false); }
}
function spiderTelegraph(e, k) {
  const a0 = e.lockA; const n = 3;
  for (let i = 0; i < n; i++) {
    let x, y, col;
    if (e.atk === 'bite') { const r = rand(0.8, Math.max(1, Math.min(4.2, Math.hypot(P.x - e.x, P.y - e.y) - 0.7))) * Math.min(1, k * 1.5); x = e.x + Math.cos(a0) * r; y = e.y + Math.sin(a0) * r; col = RGB(160, 255, 80); }
    else if (e.atk === 'sweep') { const a = a0 + rand(-1.3, 1.3), r = rand(1.2, 3.2); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 40, 60); }
    else if (e.atk === 'spit' || e.atk === 'venom') { x = e.x + Math.cos(a0) * 1.1 + rand(-0.2, 0.2); y = e.y + Math.sin(a0) * 1.1 + rand(-0.2, 0.2); col = RGB(170, 255, 60); addP({ k: 'spark', x, y, z: e.z + 0.9, vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(0, 0.6), size: 0.05, col, life: 0.25 }); continue; }
    else if (e.atk === 'brood') { x = e.x + rand(-1, 1); y = e.y + rand(-1, 1); col = RGB(190, 80, 255); }
    else { x = e.x + rand(-1.5, 1.5); y = e.y + rand(-1.5, 1.5); col = RGB(255, 255, 255); }
    addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.03 * k, col, life: 0.18 });
  }
}
function spiderStrike(e) {
  const dx = P.x - e.x, dy = P.y - e.y, ang = Math.atan2(dy, dx);
  switch (e.atk) {
    case 'bite': SFX.play('swingH'); SFX.play('screech', 0.5); break;
    case 'sweep': SFX.play('swingH'); dust(e.x, e.y, floorAt(e.x, e.y), 10); bossSlash(e, Math.round(18 * (e.phase2 ? 1.15 : 1)), 1.35, 3.4, { jumpable: true }); break;
    case 'spit': {
      const n = e.phase2 ? 3 : 1; SFX.play('fire', 0.7);
      for (let i = 0; i < n; i++) {
        const a = e.lockA + (i - (n - 1) / 2) * 0.28, sp = 8.5, ez = e.z + 1.0, dz = (P.z + 0.9 - ez);
        G.projectiles.push({ type: 'web', x: e.x + Math.cos(a) * 1.0, y: e.y + Math.sin(a) * 1.0, z: ez, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: dz / Math.max(1, Math.hypot(dx, dy)) * sp, dmg: 8, life: 3, owner: e,
          spr: (p, t) => ({ tex: 'web', x: p.x, y: p.y, z: p.z - 0.25, w: 0.5, h: 0.5, lit: false, glow: 0.3, rot: t * 6, tint: [200, 255, 170, 0.3] }),
          onHit: r => { if (r === 'hit' || r === 'block') { P.webT = 2.2; toast('WEBBED', 'Roll to tear free!', '#d0ffb0', 1.2); } } });
      }
      break;
    }
    case 'brood': spiderSpawnKids(e, e.phase2 ? 3 : 2); for (let i = 0; i < 2; i++) LEVEL.props.push({ type: 'eggs', x: e.x + rand(-1.2, 1.2), y: e.y + rand(-1.2, 1.2), z: 0, burst: true }); break;
    case 'venom': {
      SFX.play('fire', 0.8); const n = e.phase2 ? 7 : 4;
      for (let i = 0; i < n; i++) { const a = rand(0, TAU), r = i === 0 ? 0 : rand(0.8, 3.2); const hx = P.x + Math.cos(a) * r, hy = P.y + Math.sin(a) * r; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.95 - i * 0.06, dmg: 10, kind: 'venom' }); }
      break;
    }
    case 'drop': e.state = 'ceiling'; e.st = 0; e.tgt = [P.x, P.y]; e.locked = false; SFX.play('rattle'); e.intangible = true; break;
  }
}
// spider sprite animation layered on top of the generic enemy visual
function spiderVisual(e, v) {
  const t = e.t;
  if (e.type === 'spiderling') {
    if (!e.dead) { const mv = e.state === 'chase' || e.state === 'strike' ? 1 : 0.3; v.wave = 0.08 * mv; v.waveF = 11; v.waveP = t * 34; v.z += Math.abs(Math.sin(t * 22)) * 0.03 * mv; v.legs = 0; v.w *= 1.25; }
    return v;
  }
  if (e.type !== 'spider' || e.dead) return v;
  const moving = e.state === 'chase' ? (e.burst > 0 ? 1.6 : 1) : 0.25;
  v.w = e.w; v.h = e.h * (v.h / e.h);
  v.wave = 0.03 * moving; v.waveF = 7; v.waveP = e.walk * 3 + t * 6; v.legs = 0; v.lean = (v.lean || 0) * 0.5;
  v.z += Math.abs(Math.sin(e.walk * 2)) * 0.05 * moving; v.skew = (v.skew || 0) * 0.6 + Math.sin(e.walk * 2) * 0.02 * moving;
  const wu = (SP_WU[e.atk] || 0.6) / (e.phase2 ? 1.3 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 38)) * k;
  if (e.state === 'windup') {
    if (e.atk === 'bite') { v.h *= 1 + 0.14 * k; v.z += 0.3 * k; v.lean = -0.25 * k; v.tint = [170, 255, 90, 0.18 + 0.35 * pulse]; }
    else if (e.atk === 'sweep') { v.skew += e.side * 0.16 * k; v.w *= 1 + 0.12 * k; v.tint = [255, 40, 50, 0.18 + 0.35 * pulse]; }
    else if (e.atk === 'spit' || e.atk === 'venom') { v.h *= 1 - 0.07 * k; v.w *= 1 + 0.05 * k; v.tint = [150, 255, 60, 0.15 + 0.35 * pulse]; }
    else if (e.atk === 'brood') { v.h *= 1 + 0.06 * Math.sin(t * 22) * k; v.tint = [180, 70, 255, 0.2 + 0.3 * pulse]; v.glow = 0.4; }
    else if (e.atk === 'drop') { v.h *= 1 - 0.2 * k; v.w *= 1 + 0.12 * k; v.tint = [255, 255, 255, 0.2 + 0.3 * pulse]; }
    v.rim = 2.2;
  } else if (e.state === 'strike') { if (e.atk === 'bite') { v.lean = 0.4; v.h *= 0.94; v.w *= 1.12; } else if (e.atk === 'sweep') { v.skew += -e.side * 0.22; v.w *= 1.15; } }
  if (e.state === 'ceiling' || (e.state === 'drop' && e.z > floorAt(e.x, e.y) + 0.3)) { v.rot = Math.PI; v.wave = 0.05; v.tint = e.locked ? [255, 255, 255, 0.25 + 0.25 * Math.sin(t * 40)] : [60, 0, 30, 0.3]; }
  if (e.phase2 && e.state !== 'windup' && !v.tint) v.tint = [180, 60, 255, 0.1 + 0.08 * Math.sin(t * 6)];
  return v;
}
// silk line on the way down, the drop ring, egg sacs
function spiderSprites(S, t) {
  const b = G.boss; if (!b || b.type !== 'spider' || !b.alive) return;
  if (b.state === 'intro' || b.state === 'ceiling') {
    const top = (CH[cellAt(b.x, b.y)] || 5.6); for (let z = b.z + b.h * 0.6; z < top; z += 0.18) S.push({ tex: 'glow_w', x: b.x, y: b.y, z, w: 0.05, h: 0.2, add: true, alpha: 0.55, lit: false, tint: [230, 230, 255, 1] });
  }
  if (b.state === 'ceiling' && b.tgt) { const fz = floorAt(b.tgt[0], b.tgt[1]); S.push({ tex: 'glow_w', x: b.tgt[0], y: b.tgt[1], z: fz - 0.2, w: 4.6, h: 0.8, add: true, alpha: (b.locked ? 0.55 : 0.3) + 0.25 * Math.sin(t * (b.locked ? 50 : 20)), lit: false, tint: b.locked ? [255, 255, 255, 1] : [255, 30, 50, 1] }); }
}
