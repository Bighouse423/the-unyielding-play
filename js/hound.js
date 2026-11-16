'use strict';
// ===== M7: CERBERAX, THE HELLFORGE ALPHA (stage 8) =====
// Bursts out of the great kennel. BITE combo (3, 4 in phase 2), POUNCE (marked landing + jumpable fire ring; he PANTS after
// landing - punish window, +30% damage taken), FLAME BREATH (a sweeping cone of fireballs - parry sends them back),
// HOWL (calls hellhounds + a ring). At half health THE FORGE AWAKENS: he leaves a burning trail, pounces twice,
// and calls LAVA ERUPTIONS up through the floor. Death: he blows apart in a gout of fire and blood.
const HH_WU = { bite: 0.5, pounce: 0.75, breath: 0.7, howl: 0.85, erupt: 0.8 };
BOSSREG.cerberax = {
  gate: 'Chains rattle in the forge pit. Something big is pulling at them.',
  setup(b) { b.hidden = true; b.r = 0.85; b.awake = false; b.x = 25; b.y = 2.4; },
  intro(b) {
    b.hidden = false; b.awake = true; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.rings = []; b.intangible = true; b.landed = false;
    b.x = 25; b.y = 2.3; b.z = floorAt(25, 2.3); b.px0 = b.x; b.py0 = b.y; b.tx = 25; b.ty = 5.6;
    SFX.play('howl'); G.shake += 3; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'hellhound';
    toast('The kennel bars are bending...', '"Heel," says no one. It does not heel.', '#ff9a50', 3);
  },
  update: updateCerberax,
};
function hhFlames(x, y, n, rad, delay, dmg, spread = 0.06) {
  for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.2, 0.2), r = i === 0 && rad > 0.5 ? 0 : rand(rad * 0.4, rad); const hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -delay - i * spread, dmg, tex: 'flame' + (i % 4), tw: 0.6, th: 1.0, col: [255, 120, 30, 1] }); }
}
function hhPick(e, dist) {
  const kids = G.enemies.filter(o => o.summoned && o.alive).length, p2 = e.phase2, W = [];
  if (dist < 3.2) W.push(['bite', 4], ['breath', 1.4], ['howl', kids < 2 ? 0.5 : 0], ['erupt', p2 ? 1 : 0]);
  else if (dist < 8) W.push(['pounce', 3], ['breath', 2.4], ['bite', 0.6], ['howl', kids < 2 ? (p2 ? 1.2 : 0.8) : 0], ['erupt', p2 ? 1.6 : 0]);
  else W.push(['pounce', 3], ['breath', 1.2], ['howl', kids < 2 ? 1 : 0], ['erupt', p2 ? 1.5 : 0]);
  return beastPickW(W, e.lastAtk);
}
function hhStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hitDone = false; e.swipes = 0; e.tx = P.x; e.ty = P.y; e.shots = 0; e.pounces = e.pounces || 0;
  if (atk === 'bite') { SFX.play('windup'); SFX.play('glint', 0.5); }
  else if (atk === 'pounce') SFX.play('roar', 0.55);
  else if (atk === 'breath') { SFX.play('fire', 0.8); SFX.play('screech', 0.4); }
  else if (atk === 'erupt') SFX.play('roar', 0.7);
  else SFX.play('howl', 0.8);
}
function updateCerberax(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake || e.hidden) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20); e.pantT = Math.max(0, (e.pantT || 0) - dt);
  const rage = e.phase2 ? 1.25 : 1, floor = floorAt(e.x, e.y), dm = e.phase2 ? 1.15 : 1;
  beastRings(e, dt);
  if (e.state !== 'intro' && !(e.state === 'strike' && e.atk === 'pounce')) { if (e.z > floor + 0.01) { e.vz -= 14 * dt; e.z += e.vz * dt; if (e.z < floor) { e.z = floor; e.vz = 0; } } else { e.z = floor; e.vz = 0; } }
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (Math.random() < dt * (e.phase2 ? 14 : 6)) addP({ k: 'ember', x: e.x + rand(-0.7, 0.7), y: e.y + rand(-0.7, 0.7), z: e.z + rand(0.4, 2.2), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.6, 1.8), size: 0.05, col: Math.random() < 0.5 ? RGB(255, 140, 30) : RGB(255, 60, 20), life: 0.6 });
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (Math.random() < dt * 8) spray(e.x, e.y, e.z + 1.8, 0, 0, 1, 3, 2, 0.8, 'flesh'); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.4; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['forge', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'forge'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true; e.rings = [];
    SFX.play('howl'); SFX.play('roar'); G.shake += 9; G.flashR = 0.5;
    HAZE[0] = 190; HAZE[1] = 60; HAZE[2] = 30;
    toast('THE FORGE AWAKENS', 'The floor is getting hot.', '#ff8a40', 3.5);
  }
  if (e.phase2 && e.state === 'chase') { e.trailT = (e.trailT || 0) - dt; if (e.trailT <= 0) { e.trailT = 0.55; if (Math.hypot(P.x - e.x, P.y - e.y) > 1.6) G.hazards.push({ x: e.x, y: e.y, t: -0.35, dmg: Math.round(8 * dm), tex: 'flame' + ((Math.random() * 4) | 0), tw: 0.55, th: 0.85, col: [255, 120, 30, 1] }); } }
  switch (e.state) {
    case 'intro': { // tears out of the kennel and bounds into the pit
      if (e.st < 0.9) { e.z = floor; if (Math.random() < 0.5) addP({ k: 'spark', x: e.x + rand(-0.8, 0.8), y: e.y + rand(-0.3, 0.3), z: rand(0.2, 2.4), vx: rand(-2, 2), vy: rand(0.5, 3), vz: rand(0, 2), size: 0.05, col: RGB(255, 200, 120), life: 0.3 }); if (Math.random() < dt * 8) { SFX.play('clink', 0.5); G.shake += 1.5; } }
      else if (!e.landed) {
        const k = Math.min(1, (e.st - 0.9) / 0.75); e.x = e.px0 + (e.tx - e.px0) * k; e.y = e.py0 + (e.ty - e.py0) * k; e.z = floorAt(e.x, e.y) + Math.sin(k * Math.PI) * 3;
        if (k >= 1) { e.landed = true; e.z = floorAt(e.x, e.y); G.shake += 14; G.hitstop = 0.12; SFX.play('land', 1); SFX.play('heavy'); rumbleFx('slam'); dust(e.x, e.y, e.z, 30); stoneBurst(25, 2.3, 0.5, 16, 1.2); e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 5, dmg: 10, col: RGB(255, 140, 60) }); hhFlames(e.x, e.y, 6, 2.2, 0.15, 10, 0.02); for (let i = 0; i < 10; i++) paintFloor(e.x + rand(-1.2, 1.2), e.y + rand(-1.2, 1.2), rand(0.1, 0.3), 150); }
      }
      if (e.landed && !e.howled && e.st > 2.1) { e.howled = true; SFX.ev('intro_hellhound', 1, ['roar','howl','screech','toll','ghost']); SFX.play('howl'); SFX.play('roar', 0.7); G.shake += 6; G.flashR = 0.25; G.bigText = { img: null, t1: d.title, t2: 'Kennelmaster of the Lich King', t: 0, dur: 3.0 }; }
      if (e.st > 3.6) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.4; }
      break;
    }
    case 'forge': {
      e.z = floor + Math.abs(Math.sin(e.st * 30)) * 0.05;
      if (Math.random() < dt * 14) spray(e.x, e.y, e.z + 2, rand(-1, 1), rand(-1, 1), 1, 4, 3, 0.8, 'flesh');
      if (e.st > 0.9 && !e.ringed) { e.ringed = true; e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 8, dmg: 14, sp: 7, col: RGB(255, 110, 40) }); hhFlames(e.x, e.y, 10, 3.2, 0.2, 12, 0.03); G.shake += 10; SFX.play('heavy'); }
      if (e.st > 2.1) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.2; beastSummon(e, 'hellhound', 2); }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * rage * (RUN.cfg.spd || 1), want = 2.4;
      if (Math.random() < dt * 1.2) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) + Math.cos(tang) * 1.1, my = Math.sin(ang) * (dist - want) + Math.sin(tang) * 1.1; const l = Math.hypot(mx, my);
      if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } const pw = e.walk; e.walk += sp * dt * 2.2; if (Math.floor(pw / Math.PI) !== Math.floor(e.walk / Math.PI)) { SFX.play('step', 0.6); dust(e.x, e.y, floor, 3); } }
      if (e.cd <= 0 && losTo(e.x, e.y, P.x, P.y)) hhStartAtk(e, hhPick(e, dist), ang);
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = HH_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.75 ? 6 : 0.5));
      if (k < 0.8) { e.tx = P.x + P.vx * 0.25; e.ty = P.y + P.vy * 0.25; }
      for (let i = 0; i < 3; i++) {
        let x, y, col;
        if (e.atk === 'pounce') { const a = rand(0, TAU), r = 1.9 * Math.sqrt(Math.random()); x = e.tx + Math.cos(a) * r; y = e.ty + Math.sin(a) * r; col = RGB(255, 90, 30); }
        else if (e.atk === 'breath') { const a = e.lockA + rand(-0.45, 0.45), r = rand(0.8, 5.5) * Math.min(1, k * 1.3); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 170, 40); }
        else if (e.atk === 'bite') { const a = e.lockA + rand(-1.0, 1.0), r = rand(1, 3); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 40, 40); }
        else if (e.atk === 'erupt') { x = P.x + rand(-2.6, 2.6); y = P.y + rand(-2.6, 2.6); col = RGB(255, 110, 20); }
        else { x = e.x + rand(-2.5, 2.5); y = e.y + rand(-2.5, 2.5); col = RGB(255, 120, 60); }
        addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
      }
      if (e.atk === 'breath' && Math.random() < 0.6) addP({ k: 'ember', x: e.x + Math.cos(e.lockA) * 0.9, y: e.y + Math.sin(e.lockA) * 0.9, z: e.z + 1.5, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.2, 1), size: 0.05 + 0.05 * k, col: RGB(255, 170, 50), life: 0.3 });
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0;
        if (e.atk === 'pounce') { e.px0 = e.x; e.py0 = e.y; let tx = e.tx, ty = e.ty; if (!arenaOK(tx, ty)) { const s = bossLandSpot(tx, ty); if (s) { tx = s[0]; ty = s[1]; } else { tx = e.x; ty = e.y; } } e.tx = tx; e.ty = ty; SFX.play('roar', 0.6); SFX.play('jump'); }
        else if (e.atk === 'howl') { SFX.play('howl'); G.shake += 6; e.rings.push({ x: e.x, y: e.y, r: 0.8, max: 6.5, dmg: Math.round(10 * dm), col: RGB(255, 130, 60) }); beastSummon(e, 'hellhound', e.phase2 ? 2 : 1); }
        else if (e.atk === 'erupt') { hhFlames(P.x + P.vx * 0.3, P.y + P.vy * 0.3, e.phase2 ? 9 : 7, 2.8, 0.85, Math.round(15 * dm)); SFX.play('heavy', 0.7); G.shake += 5; e.state = 'recover'; }
        else if (e.atk === 'breath') { SFX.play('fire'); e.sweep = Math.random() < 0.5 ? 1 : -1; }
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'bite') {
        const n = e.phase2 ? 4 : 3, gap = e.phase2 ? 0.25 : 0.31;
        if (e.swipes < n && e.st >= e.swipes * gap) {
          e.lockA = e.lockA + angDiff(ang, e.lockA) * 0.6;
          if (dist > 1.8) moveEntity(e, Math.cos(e.lockA) * 0.6, Math.sin(e.lockA) * 0.6, e.r, 0.33, false);
          bossSlash(e, Math.round(13 * dm), 1.0, 3.0);
          for (let i = 0; i < 10; i++) { const a = e.lockA + (i / 9 - 0.5) * 1.4; addP({ k: 'ember', x: e.x + Math.cos(a) * 1.5, y: e.y + Math.sin(a) * 1.5, z: e.z + 1.1, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, vz: rand(0, 1), size: 0.06, col: i % 2 ? RGB(255, 150, 40) : RGB(255, 50, 30), life: 0.25 }); }
          paintFloor(e.x + Math.cos(e.lockA) * 1.4, e.y + Math.sin(e.lockA) * 1.4, 0.2, 140); SFX.play('gib', 0.3);
          e.swipes++;
        }
        if (e.swipes >= n && e.st >= n * gap + 0.12) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'pounce') {
        const T = 0.72 / rage, k = Math.min(1, e.st / T);
        e.x = e.px0 + (e.tx - e.px0) * k; e.y = e.py0 + (e.ty - e.py0) * k; e.z = floorAt(e.x, e.y) + Math.sin(k * Math.PI) * 2.8;
        if (Math.random() < 0.6) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + 1, vx: 0, vy: 0, vz: -1, size: 0.07, col: RGB(255, 120, 30), life: 0.4 });
        if (k >= 1) {
          e.z = floorAt(e.x, e.y); G.shake += 12; G.hitstop = 0.1; SFX.play('land', 1); SFX.play('heavy'); rumbleFx('slam'); dust(e.x, e.y, e.z, 24);
          spray(e.x, e.y, e.z + 0.3, 0, 0, 2, 30, 4, Math.PI, 'flesh', 1.2); for (let i = 0; i < 8; i++) paintFloor(e.x + rand(-1.2, 1.2), e.y + rand(-1.2, 1.2), rand(0.1, 0.3), 140);
          if (Math.hypot(P.x - e.x, P.y - e.y) < 2.0 && P.z - groundUnder(P.x, P.y, 0.1) < 0.6) hurtPlayer(Math.round(24 * dm), e.x, e.y, { src: e });
          e.rings.push({ x: e.x, y: e.y, r: 0.6, max: e.phase2 ? 6 : 4.5, dmg: Math.round(12 * dm), col: RGB(255, 120, 60) });
          if (e.phase2) hhFlames(e.x, e.y, 6, 1.8, 0.25, Math.round(10 * dm), 0.02);
          e.pounces++;
          if (e.phase2 && e.pounces % 2 === 1) { e.state = 'windup'; e.atk = 'pounce'; e.st = HH_WU.pounce / rage * 0.45; e.tx = P.x; e.ty = P.y; SFX.play('roar', 0.5); }   // the double pounce
          else { e.state = 'pant'; e.st = 0; e.pantT = 1.1; toast('HE IS WINDED', 'Strike!', '#ffd060', 0.9); }
        }
      } else if (e.atk === 'breath') { // a sweeping cone of fire: parry it back down his throat
        const dur = e.phase2 ? 1.35 : 1.1, a = e.lockA + e.sweep * (e.st / dur - 0.5) * 0.9;
        e.breathT = (e.breathT || 0) - dt;
        if (e.breathT <= 0) { e.breathT = 0.075; const ez = e.z + 1.5, sp = 7.5, dist0 = Math.max(0.5, dist); G.projectiles.push({ type: 'fireball', x: e.x + Math.cos(a) * 1.0, y: e.y + Math.sin(a) * 1.0, z: ez, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: ((P.z + 1.0) - ez) / dist0 * sp, dmg: Math.round(7 * dm), owner: e, life: 1.0 }); if (Math.random() < 0.4) SFX.play('fire', 0.4); }
        for (let i = 0; i < 2; i++) addP({ k: 'ember', x: e.x + Math.cos(a) * 1.0, y: e.y + Math.sin(a) * 1.0, z: e.z + 1.5, vx: Math.cos(a + rand(-0.2, 0.2)) * 6, vy: Math.sin(a + rand(-0.2, 0.2)) * 6, vz: rand(-0.5, 0.5), size: 0.08, col: Math.random() < 0.5 ? RGB(255, 200, 60) : RGB(255, 90, 20), life: 0.5 });
        if (e.st > dur) { e.state = 'recover'; e.st = 0; }
      } else { if (e.st > 0.6) { e.state = 'recover'; e.st = 0; } }
      break;
    }
    case 'pant': { if (Math.random() < dt * 6) addP({ k: 'smoke', x: e.x + Math.cos(e.lockA) * 0.8, y: e.y + Math.sin(e.lockA) * 0.8, z: e.z + 1.3, vx: 0, vy: 0, vz: 0.6, size: 0.12, col: RGB(80, 70, 70), life: 0.8 }); if (e.st > 1.1 / (e.phase2 ? 1.2 : 1)) { e.state = 'chase'; e.st = 0; e.cd = rand(0.2, 0.6); } break; }
    case 'recover': {
      const rd = (e.atk === 'bite' ? 0.6 : e.atk === 'breath' ? 0.75 : 0.5) / (e.phase2 ? 1.15 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.35, 0.9) / rage; }
      break;
    }
  }
  if (!(e.state === 'strike' && e.atk === 'pounce') && e.state !== 'intro') keepClear(e);
}
BOSSDMG.cerberax = function (e, dmg, o) { if (e.state === 'pant') return dmg * 1.3; if (e.stagger > 0) return dmg * 1.25; return dmg; };
BOSSVIS.cerberax = function (e, v) {
  const t = e.t;
  if (e.dead) { const k = clamp((e.bossDeath || 0) / 2.4, 0, 1); v.tint = [255, 90 * (1 - k), 20, 0.3 + 0.4 * k]; v.skew = Math.sin(t * 40) * 0.05 * (1 - k); return v; }
  if (e.state === 'intro' && !e.landed) { v.tint = [255, 120, 40, 0.2]; v.lean = 0.3; return v; }
  const wu = (HH_WU[e.atk] || 0.7) / (e.phase2 ? 1.25 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  if (e.state === 'windup') {
    if (e.atk === 'pounce') { v.h *= 1 - 0.18 * k; v.w *= 1 + 0.1 * k; v.lean = 0.3 * k; v.tint = [255, 90, 30, 0.18 + 0.35 * pulse]; }
    else if (e.atk === 'breath') { v.h *= 1 + 0.05 * k; v.lean = -0.25 * k; v.tint = [255, 190, 60, 0.15 + 0.4 * pulse]; v.glow = 0.4 * k; }
    else { v.lean = -0.15 * k; v.tint = [255, 60, 40, 0.15 + 0.35 * pulse]; }
    v.rim = 2.2;
  } else if (e.state === 'strike' && e.atk === 'pounce') { v.lean = 0.45; v.h *= 1.08; }
  else if (e.state === 'strike' && e.atk === 'breath') { v.lean = 0.25; v.tint = [255, 170, 50, 0.25 + 0.1 * Math.sin(t * 30)]; v.glow = 0.4; }
  else if (e.state === 'pant') { v.h *= 0.94 + 0.03 * Math.sin(t * 14); v.tint = [255, 230, 120, 0.2 + 0.15 * Math.sin(t * 10)]; }
  if (e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
  if (e.phase2 && !v.tint) v.tint = [255, 110, 30, 0.12 + 0.08 * Math.sin(t * 8)];
  return v;
};
BOSSSPR.cerberax = function (S, t) {
  const b = G.boss; if (!b || b.type !== 'cerberax' || !b.alive || b.hidden) return;
  S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.5, w: 2.6, h: 2.2, add: true, alpha: (b.phase2 ? 0.3 : 0.18) + 0.08 * Math.sin(t * 7), lit: false, tint: [255, 100, 30, 1] });
  if ((b.state === 'windup' || b.state === 'strike') && b.atk === 'breath') S.push({ tex: 'glow_w', x: b.x + Math.cos(b.lockA) * 1.0, y: b.y + Math.sin(b.lockA) * 1.0, z: b.z + 1.1, w: 1.0, h: 1.0, add: true, alpha: 0.7, lit: false, tint: [255, 200, 70, 1] });
  if (b.state === 'windup' && b.atk === 'pounce') S.push({ tex: 'glow_w', x: b.tx, y: b.ty, z: floorAt(b.tx, b.ty) - 0.15, w: 3.6, h: 0.6, add: true, alpha: 0.35 + 0.25 * Math.sin(t * 30), lit: false, tint: [255, 90, 30, 1] });
};
BOSSDEATH.cerberax = function (e) {
  if (Math.random() < 0.7) addP({ k: 'ember', x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: e.z + rand(0.3, 2), vx: rand(-0.8, 0.8), vy: rand(-0.8, 0.8), vz: rand(1, 3.5), size: rand(0.05, 0.1), col: Math.random() < 0.5 ? RGB(255, 150, 40) : RGB(255, 50, 20), life: 1 });
  if (e.bossDeath > 2.2 && !e.gushed) { e.gushed = true; e.rings = []; for (let i = 0; i < 80; i++) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + 1.2, vx: rand(-6, 6), vy: rand(-6, 6), vz: rand(1, 7), size: rand(0.06, 0.12), col: Math.random() < 0.5 ? RGB(255, 170, 50) : RGB(255, 60, 20), life: 1.3 }); spray(e.x, e.y, e.z + 1.4, 0, 0, 1, 130, 6, Math.PI, 'flesh', 1.9); gibs(e.x, e.y, e.z + 1.2, 14, 'flesh', 1.5); for (let i = 0; i < 16; i++) paintFloor(e.x + rand(-2, 2), e.y + rand(-2, 2), rand(0.2, 0.5), 220); }
};
