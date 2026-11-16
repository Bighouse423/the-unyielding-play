'use strict';
// ===== M6: MORWEN, THE NECROMANCER WITCH =====
// Rises out of her cauldron. BLINK (green smoke, reappears elsewhere), SKULL VOLLEY (a fan of green fire-skulls - parry
// sends them back), RAISE DEAD (marked graves split open and the dead climb out), GRAVE HANDS (marked circles burst with
// grasping hands), DRAIN (a soul-beam that bleeds you and heals her - hit her 3 times to BREAK the channel and stagger her).
// At half health THE DEAD ANSWER: the sky turns sick green, two illusions of her join the fight, volleys widen and speed up.
// Death: she withers to ash and a storm of freed souls.
const WI_WU = { volley: 0.65, raise: 0.9, hands: 0.75, drain: 0.6, blink: 0.35 };
BOSSREG.witch = {
  gate: 'Green fire flickers over the graves ahead. Someone is singing.',
  setup(b) { b.hidden = true; b.r = 0.8; b.awake = false; b.x = 25; b.y = 2.6; },
  intro(b) {
    b.hidden = false; b.awake = true; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.intangible = true; b.x = 25; b.y = 2.6; b.z = floorAt(25, 2.6);
    SFX.play('ghost'); G.shake += 2; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'witch';
    toast('The cauldron boils over...', '"Another visitor for my garden."', '#a0ffb0', 3);
  },
  update: updateWitch,
};
function wiPick(e, dist) {
  const kids = G.enemies.filter(o => o.summoned && o.alive && o.type !== 'wclone').length, W = [];
  if (dist < 3) W.push(['blink', 3], ['hands', 1.5], ['volley', 1]);
  else W.push(['volley', 3], ['hands', 2], ['drain', e.phase2 ? 1.6 : 1.2], ['raise', kids < 3 ? 1.3 : 0], ['blink', 0.6]);
  return beastPickW(W, e.lastAtk);
}
function wiStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.shots = 0; e.drainHits = 0; e.marks = null;
  if (atk === 'volley') { SFX.play('ghost', 0.7); SFX.play('glint', 0.5); }
  else if (atk === 'raise') { SFX.play('roar', 0.35); e.marks = []; for (let i = 0; i < (e.phase2 ? 3 : 2); i++) { let x, y; for (let k = 0; k < 12; k++) { x = rand(14, 36); y = rand(2.5, 9.5); if (arenaOK(x, y) && Math.hypot(x - P.x, y - P.y) > 2.5) break; } e.marks.push([x, y]); } }
  else if (atk === 'hands') { SFX.play('ghost', 0.5); }
  else if (atk === 'drain') { SFX.play('screech', 0.5); }
}
function wiBlink(e, far) {
  for (let i = 0; i < 26; i++) addP({ k: 'ecto', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0, 2.4), vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(0.5, 2), size: rand(0.06, 0.12), col: Math.random() < 0.5 ? RGB(110, 255, 140) : RGB(170, 80, 255), life: 0.8 });
  let best = null;
  for (let k = 0; k < 20; k++) { const x = rand(14.5, 35.5), y = rand(2.2, 9.6), d = Math.hypot(x - P.x, y - P.y); if (!arenaOK(x, y) || d < 4 || d > (far ? 11 : 8)) continue; best = [x, y]; break; }
  if (best) { e.x = best[0]; e.y = best[1]; e.z = floorAt(e.x, e.y); }
  SFX.play('ghost', 0.8); e.blinkFx = 0.4;
  for (let i = 0; i < 20; i++) addP({ k: 'ecto', x: e.x + rand(-0.4, 0.4), y: e.y + rand(-0.4, 0.4), z: e.z + rand(0, 2.4), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(0.3, 1.5), size: rand(0.06, 0.1), col: RGB(110, 255, 140), life: 0.7 });
}
function wiSkull(e, a, sp, dmg) {
  const ez = e.z + e.h * 0.7, dist = Math.hypot(P.x - e.x, P.y - e.y);
  G.projectiles.push({ type: 'fireball', x: e.x + Math.cos(a) * 0.6, y: e.y + Math.sin(a) * 0.6, z: ez, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: ((P.z + 1.0) - ez) / Math.max(0.5, dist) * sp, dmg, owner: e, life: 4, spr: skullSpr });
}
function updateWitch(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake || e.hidden) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20); e.blinkFx = Math.max(0, (e.blinkFx || 0) - dt);
  const rage = e.phase2 ? 1.25 : 1, floor = floorAt(e.x, e.y), dm = e.phase2 ? 1.12 : 1;
  if (e.state !== 'intro') e.z = floor + 0.15 + Math.sin(e.t * 2.2) * 0.08;   // she hovers
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (Math.random() < dt * 4) addP({ k: 'ecto', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0, 0.5), vx: 0, vy: 0, vz: rand(0.2, 0.6), size: 0.07, col: e.phase2 ? RGB(140, 255, 120) : RGB(150, 80, 255), life: 0.9 });
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (Math.random() < dt * 8) spray(e.x, e.y, e.z + 2, 0, 0, 1, 3, 2, 0.8, 'flesh'); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.3; wiBlink(e, true); } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['answer', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'answer'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true;
    SFX.play('ghost'); SFX.play('screech'); G.shake += 8; G.flashG = 0.6;
    if (Engine.tex.sky_necro2) Engine.tex.sky = Engine.tex.sky_necro2;
    HAZE[0] = 40; HAZE[1] = 150; HAZE[2] = 80;
    toast('THE DEAD ANSWER', '"Rise, my darlings. Rise for mother."', '#90ff90', 3.5);
  }
  switch (e.state) {
    case 'intro': {
      if (e.st < 1.6) { e.z = floor; if (Math.random() < 0.6) addP({ k: 'ecto', x: e.x + rand(-0.7, 0.7), y: e.y + rand(-0.7, 0.7), z: floor + rand(0, 1), vx: 0, vy: 0, vz: rand(1, 3), size: 0.09, col: RGB(110, 255, 140), life: 0.8 }); }
      if (e.st > 1.6 && !e.sang) { e.sang = true; SFX.ev('intro_witch', 1, ['roar','howl','screech','toll','ghost']); SFX.play('screech'); G.shake += 5; G.flashG = 0.4; G.bigText = { img: null, t1: d.title, t2: 'Mistress of the Lich King\'s Dead', t: 0, dur: 3.0 }; }
      if (e.st > 3.2) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.4; }
      break;
    }
    case 'answer': {
      if (e.st > 0.8 && !e.cloned) { e.cloned = true; for (let i = 0; i < 2; i++) { const a = i * Math.PI + rand(-0.5, 0.5); const x = clamp(e.x + Math.cos(a) * 3, 14.5, 35.5), y = clamp(e.y + Math.sin(a) * 3, 2.2, 9.6); const c = makeEnemy('wclone', arenaOK(x, y) ? x : e.x, arenaOK(x, y) ? y : e.y + 1); c.awake = true; c.summoned = true; c.z = floorAt(c.x, c.y) + 0.15; G.enemies.push(c); for (let k = 0; k < 16; k++) addP({ k: 'ecto', x: c.x, y: c.y, z: c.z + rand(0, 2.4), vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(0.5, 2), size: 0.1, col: RGB(110, 255, 140), life: 0.8 }); } SFX.play('ghost'); beastSummon(e, 'zombie', 2); }
      if (e.st > 2.0) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.3; wiBlink(e, true); }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * 0.8 * (RUN.cfg.spd || 1), want = 6;
      if (Math.random() < dt * 0.8) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) * 0.6 + Math.cos(tang), my = Math.sin(ang) * (dist - want) * 0.6 + Math.sin(tang); const l = Math.hypot(mx, my);
      if (l > 0.05) { const ox = e.x, oy = e.y; moveEntity(e, mx / l * sp * dt, my / l * sp * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } }
      if (e.cd <= 0) { if (losTo(e.x, e.y, P.x, P.y)) wiStartAtk(e, wiPick(e, dist), ang); else { wiBlink(e); e.cd = 0.6; } }
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = WI_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * 6);
      if (e.atk === 'raise' && e.marks) for (const [x, y] of e.marks) { const a = rand(0, TAU), r = rand(0, 0.8); addP({ k: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.6 + k, size: 0.06, col: RGB(110, 255, 140), life: 0.2 }); }
      else if (e.atk === 'volley') for (let i = 0; i < 2; i++) addP({ k: 'ecto', x: e.x + rand(-0.4, 0.4), y: e.y + rand(-0.4, 0.4), z: e.z + 1.9 + rand(-0.2, 0.2), vx: 0, vy: 0, vz: 0.3, size: 0.06 + 0.05 * k, col: RGB(110, 255, 140), life: 0.25 });
      else if (e.atk === 'drain') { const r = rand(0.5, dist); addP({ k: 'spark', x: e.x + Math.cos(e.lockA) * r, y: e.y + Math.sin(e.lockA) * r, z: e.z + 1.6, vx: 0, vy: 0, vz: 0, size: 0.04 + 0.04 * k, col: RGB(150, 255, 160), life: 0.15 }); }
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0;
        if (e.atk === 'blink') { wiBlink(e, true); e.state = 'recover'; }
        else if (e.atk === 'raise') { for (const [x, y] of e.marks) { const t = Math.random() < 0.5 ? 'zombie' : 'skeleton'; const s = makeEnemy(t, x, y, { rise: true }); s.awake = true; s.summoned = true; s.hp = s.maxhp = Math.round(EDEF[t].hp * (RUN.cfg.hp || 1)); G.enemies.push(s); dust(x, y, floorAt(x, y), 12); for (let i = 0; i < 12; i++) addP({ k: 'ecto', x, y, z: floorAt(x, y) + 0.2, vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(1, 3), size: 0.08, col: RGB(110, 255, 140), life: 0.7 }); } SFX.play('rattle'); G.shake += 3; e.state = 'recover'; }
        else if (e.atk === 'hands') {
          const n = e.phase2 ? 8 : 6;
          for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.3, 0.3), r = i === 0 ? 0 : rand(0.9, 2.6); const hx = P.x + P.vx * 0.3 + Math.cos(a) * r, hy = P.y + P.vy * 0.3 + Math.sin(a) * r; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.8 - i * 0.05, dmg: Math.round(15 * dm), tex: 'p_hand', tw: 0.55, th: 0.72, col: [90, 255, 130, 1] }); }
          SFX.play('ghost', 0.6); e.state = 'recover';
        }
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'volley') {
        const n = e.phase2 ? 5 : 3, waves = e.phase2 ? 3 : 2, gap = 0.32 / rage;
        if (e.shots < waves && e.st >= e.shots * gap) { const spread = 0.22; for (let i = 0; i < n; i++) wiSkull(e, ang + (i - (n - 1) / 2) * spread, 6.8 * rage, Math.round(13 * dm)); SFX.play('fire', 0.7); e.shots++; }
        if (e.shots >= waves && e.st > waves * gap + 0.2) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'drain') { // the soul-beam: bleeds you, heals her; 3 hits break it
        faceP(e, dx, dy);
        const ok = dist < 10 && losTo(e.x, e.y, P.x, P.y);
        if (ok) { e.drainTick = (e.drainTick || 0) + dt; if (e.drainTick > 0.4) { e.drainTick = 0; const r = hurtPlayer(Math.round(6 * dm), e.x, e.y, { src: e, unblockable: true, nopd: true }); if (r !== 'dodged') { e.hp = Math.min(e.maxhp, e.hp + 12); dmgNum(e.x, e.y, e.z + e.h + 0.3, '+12', '#80ff90'); } } }
        if (e.st > 2.4 || !ok && e.st > 0.6) { e.state = 'recover'; e.st = 0; }
      } else { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': {
      if (e.st >= 0.55 / (e.phase2 ? 1.2 : 1)) { e.state = 'chase'; e.st = 0; e.cd = rand(0.3, 0.9) / rage; if (Math.random() < 0.35) wiBlink(e); }
      break;
    }
  }
}
BOSSDMG.witch = function (e, dmg, o) {
  if (e.state === 'strike' && e.atk === 'drain' && !o.dot) {
    e.drainHits = (e.drainHits || 0) + 1;
    if (e.drainHits >= 3) { e.state = 'stagger'; e.stagger = 2.0; e.atk = null; e.st = 0; G.slow = 0.35; SFX.play('screech'); G.shake += 6; toast('CHANNEL BROKEN!', 'She reels - punish her!', '#ffd060', 1.6); for (let i = 0; i < 30; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + 1.6, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(-1, 3), size: 0.08, col: RGB(110, 255, 140), life: 0.6 }); return dmg * 1.3; }
    dmgNum(e.x, e.y, e.z + e.h + 0.6, 'BREAK ' + e.drainHits + '/3', '#a0ffb0');
  }
  if (e.stagger > 0) return dmg * 1.3;
  return dmg;
};
BOSSVIS.witch = function (e, v) {
  const t = e.t;
  if (e.dead) { // withers to ash
    const k = clamp((e.bossDeath || e.deathT || 0) / 2.4, 0, 1); v.tint = [70 + 60 * (1 - k), 70 + 120 * (1 - k), 70, 0.3 + 0.6 * k]; v.h *= 1 - 0.12 * k; v.skew = Math.sin(t * 30) * 0.04 * (1 - k); return v;
  }
  v.wave = 0.03; v.waveF = 5; v.waveP = t * 3;
  if (e.state === 'intro') { const k = clamp(e.st / 1.6, 0.02, 1); if (k < 1) { v.sub = [0, 0, 1, k]; v.h *= k; } v.tint = [110, 255, 140, Math.max(0, 0.6 - e.st * 0.25)]; v.glow = 0.3; return v; }
  if (e.blinkFx > 0) v.alpha = 1 - e.blinkFx * 1.5;
  if (e.state === 'answer') { v.tint = [110, 255, 140, 0.45]; v.skew = Math.sin(t * 30) * 0.05; v.glow = 0.4; return v; }
  const wu = (WI_WU[e.atk] || 0.7) / (e.phase2 ? 1.25 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  if (e.state === 'windup') { v.h *= 1 + 0.06 * k; v.lean = -0.2 * k; v.tint = e.atk === 'drain' ? [160, 255, 170, 0.2 + 0.35 * pulse] : e.atk === 'raise' ? [170, 90, 255, 0.2 + 0.35 * pulse] : [110, 255, 140, 0.15 + 0.35 * pulse]; v.glow = 0.3 * k; v.rim = 2.2; }
  else if (e.state === 'strike' && e.atk === 'drain') { v.tint = [120, 255, 150, 0.3 + 0.15 * Math.sin(t * 30)]; v.lean = 0.15; v.glow = 0.3; }
  if (e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
  if (e.phase2 && !v.tint) v.tint = [110, 255, 140, 0.12 + 0.08 * Math.sin(t * 6)];
  return v;
};
BOSSSPR.witch = function (S, t) {
  const b = G.boss; if (!b || b.type !== 'witch' || !b.alive || b.hidden) return;
  if (b.state === 'strike' && b.atk === 'drain') { // the beam
    const n = 18, ex = b.x, ey = b.y, ez = b.z + 1.9, px = P.x, py = P.y, pz = P.z + 1.0;
    for (let i = 1; i < n; i++) { const k = i / n, x = ex + (px - ex) * k, y = ey + (py - ey) * k, z = ez + (pz - ez) * k + Math.sin(t * 20 + i) * 0.06; S.push({ tex: 'glow_w', x, y, z: z - 0.2, w: 0.38, h: 0.38, add: true, alpha: 0.7, lit: false, tint: i % 3 ? [110, 255, 140, 1] : [200, 120, 255, 1] }); }
  }
  if (b.state === 'windup' && b.atk === 'raise' && b.marks) for (const [x, y] of b.marks) S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.15, w: 1.6, h: 0.5, add: true, alpha: 0.4 + 0.2 * Math.sin(t * 30), lit: false, tint: [110, 255, 140, 1] });
  if (b.awake) S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.6, w: 1.5, h: 1.6, add: true, alpha: 0.26 + 0.1 * Math.sin(t * 5), lit: false, tint: b.phase2 ? [110, 255, 140, 1] : [170, 80, 255, 1] });
};
BOSSDEATH.witch = function (e) {
  if (Math.random() < 0.7) addP({ k: 'ecto', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0.3, 2.5), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(1.5, 4), size: rand(0.06, 0.12), col: Math.random() < 0.6 ? RGB(110, 255, 140) : RGB(220, 220, 220), life: 1.2 });
  if (Math.random() < 0.5) addP({ k: 'dust', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0.5, 2.4), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: -0.4, size: 0.1, col: RGB(110, 110, 104), life: 1.2 });
  if (e.bossDeath > 2.2 && !e.gushed) { e.gushed = true; for (const o of G.enemies) if (o.type === 'wclone' && o.alive) damageEnemy(o, 999, { src: 'sword', heavy: true }); for (let i = 0; i < 70; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + 1.4, vx: rand(-5, 5), vy: rand(-5, 5), vz: rand(1, 6), size: rand(0.07, 0.14), col: Math.random() < 0.5 ? RGB(110, 255, 140) : RGB(190, 120, 255), life: 1.4 }); spray(e.x, e.y, e.z + 1.6, 0, 0, 1, 80, 5, Math.PI, 'flesh', 1.5); }
};
