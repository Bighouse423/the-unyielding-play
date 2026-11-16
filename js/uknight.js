'use strict';
// ===== M7: SIR VALCOR, THE UNDEAD KNIGHT (stage 9) =====
// Kneels at the altar of the ruined nave until you come in. GREATSWORD COMBO (3 swings - the last is a gold-flashing
// overhead: PARRY IT to shatter his posture), OVERHEAD SLAM (a line of grave-fire races along the floor), LUNGE (a
// charging thrust - sidestep it), GRAVE PLUNGE (sword into the floor: jumpable rings of green fire).
// At half health HIS OATH BREAKS: lightning hits him, spectral blades rain on marked circles, the combo gains a 4th swing.
// Death: he plants the sword, kneels one last time and comes apart.
const UK_WU = { combo: 0.6, slam: 0.85, lunge: 0.6, plunge: 0.7, blades: 0.75 };
BOSSREG.uknight = {
  gate: 'A knight kneels at the altar ahead. His armour is rusted through. He is still praying.',
  setup(b) { b.hidden = false; b.r = 0.85; b.awake = false; b.x = 25; b.y = 2.6; b.state = 'kneel'; b.intangible = true; },
  intro(b) {
    b.hidden = false; b.awake = true; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.rings = []; b.intangible = true; b.x = 25; b.y = 2.6; b.z = floorAt(25, 2.6);
    SFX.play('toll'); G.shake += 2; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'uknight';
    toast('The knight stops praying.', '"None pass. Not while I keep the oath."', '#c8b0ff', 3.2);
  },
  update: updateUKnight,
};
function ukPick(e, dist) {
  const p2 = e.phase2, W = [];
  if (dist < 3.4) W.push(['combo', 4], ['slam', 1.4], ['plunge', p2 ? 1.2 : 0.8], ['blades', p2 ? 1 : 0]);
  else if (dist < 8) W.push(['lunge', 2.6], ['slam', 2.4], ['plunge', 0.8], ['combo', 0.6], ['blades', p2 ? 1.8 : 0]);
  else W.push(['lunge', 3], ['slam', 1.6], ['blades', p2 ? 2 : 0]);
  return beastPickW(W, e.lastAtk);
}
function ukStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hitDone = false; e.swipes = 0; e.marks = null;
  if (atk === 'combo') { SFX.play('windup'); SFX.play('glint', 0.5); }
  else if (atk === 'lunge') { SFX.play('glint'); }
  else if (atk === 'slam') SFX.play('windup');
  else if (atk === 'blades') { SFX.play('ghost', 0.6); e.marks = []; const n = e.phase2 ? 7 : 5; for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.3, 0.3), r = i === 0 ? 0 : rand(1.2, 3.2); const x = P.x + P.vx * 0.4 + Math.cos(a) * r, y = P.y + P.vy * 0.4 + Math.sin(a) * r; if (arenaOK(x, y)) e.marks.push([x, y]); } }
  else SFX.play('roar', 0.4);
}
function ukGraveFire(x, y, delay, dmg) { if (arenaOK(x, y)) G.hazards.push({ x, y, t: -delay, dmg, tex: 'gflame' + ((Math.random() * 4) | 0), tw: 0.62, th: 1.1, col: [90, 255, 130, 1] }); }
function updateUKnight(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake || e.hidden) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 18);
  const rage = e.phase2 ? 1.2 : 1, floor = floorAt(e.x, e.y), dm = e.phase2 ? 1.12 : 1;
  beastRings(e, dt);
  e.z = floor;
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (Math.random() < dt * 3) addP({ k: 'ecto', x: e.x + rand(-0.4, 0.4), y: e.y + rand(-0.4, 0.4), z: e.z + 2.6, vx: 0, vy: 0, vz: rand(0.3, 0.8), size: 0.05, col: RGB(110, 240, 255), life: 0.6 }); // his eyes smoke
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (Math.random() < dt * 8) spray(e.x, e.y, e.z + 2.2, 0, 0, 1, 3, 2, 0.8, 'flesh'); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.5; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['oath', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'oath'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true; e.rings = [];
    SFX.play('roar'); G.shake += 8; G.flashG = 0.4;
    HAZE[0] = 90; HAZE[1] = 60; HAZE[2] = 150;
    toast('HIS OATH BREAKS', '"Then I will keep it in blood."', '#d0b0ff', 3.5);
  }
  switch (e.state) {
    case 'intro': {
      if (e.st > 1.0 && !e.rose) { e.rose = true; SFX.play('stone'); SFX.play('clink'); G.shake += 4; dust(e.x, e.y, e.z, 20); }
      if (e.st > 1.9 && !e.sang) { e.sang = true; SFX.ev('intro_uknight', 1, ['roar','howl','screech','toll','ghost']); SFX.play('roar'); G.shake += 6; G.flashG = 0.25; G.bigText = { img: null, t1: d.title, t2: 'Last Oathsworn of the Cathedral', t: 0, dur: 3.0 }; e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 4.5, dmg: 8, col: RGB(110, 255, 140) }); }
      if (e.st > 3.4) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.4; }
      break;
    }
    case 'oath': { // lightning finds him; he tears the rotten tabard off and rises faster
      if (e.st > 0.5 && !e.bolted) { e.bolted = true; if (typeof addBolt === 'function') for (let i = 0; i < 3; i++) addBolt(e.x + rand(-1, 1), e.y + rand(-1, 1), 9, e.x, e.y, e.z + 2.4, [200, 160, 255], 1.6); G.flashG = 0.8; G.shake += 12; SFX.play('heavy'); SFX.play('toll'); e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 8, dmg: 14, sp: 7, col: RGB(200, 140, 255) }); for (let i = 0; i < 30; i++) addP({ k: 'spark', x: e.x, y: e.y, z: e.z + 2.4, vx: rand(-5, 5), vy: rand(-5, 5), vz: rand(-1, 5), size: 0.06, col: RGB(220, 200, 255), life: 0.5 }); }
      if (e.st > 1.9) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.2; }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * rage * (RUN.cfg.spd || 1), want = 2.6;
      if (Math.random() < dt * 0.8) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) + Math.cos(tang) * 0.6, my = Math.sin(ang) * (dist - want) + Math.sin(tang) * 0.6; const l = Math.hypot(mx, my);
      if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } const pw = e.walk; e.walk += sp * dt * 1.8; if (Math.floor(pw / Math.PI) !== Math.floor(e.walk / Math.PI)) { SFX.play('step', 0.8); SFX.play('clink', 0.25); dust(e.x, e.y, floor, 3); } }
      if (e.cd <= 0 && losTo(e.x, e.y, P.x, P.y)) ukStartAtk(e, ukPick(e, dist), ang);
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = UK_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.7 ? 6 : 0.6));
      for (let i = 0; i < 3; i++) {
        let x, y, col;
        if (e.atk === 'slam') { const r = rand(0.8, 9) * Math.min(1, k * 1.4); x = e.x + Math.cos(e.lockA) * r + rand(-0.2, 0.2); y = e.y + Math.sin(e.lockA) * r + rand(-0.2, 0.2); col = RGB(110, 255, 140); }
        else if (e.atk === 'lunge') { const r = rand(0.8, 7) * Math.min(1, k * 1.4); x = e.x + Math.cos(e.lockA) * r + rand(-0.15, 0.15); y = e.y + Math.sin(e.lockA) * r + rand(-0.15, 0.15); col = RGB(255, 220, 90); }
        else if (e.atk === 'combo') { const a = e.lockA + rand(-1.1, 1.1), r = rand(1, 3.2); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 120, 60); }
        else if (e.atk === 'blades' && e.marks && e.marks.length) { const m = e.marks[(Math.random() * e.marks.length) | 0], a = rand(0, TAU), r = rand(0, 0.7); x = m[0] + Math.cos(a) * r; y = m[1] + Math.sin(a) * r; col = RGB(200, 140, 255); }
        else { x = e.x + rand(-2.5, 2.5); y = e.y + rand(-2.5, 2.5); col = RGB(110, 255, 140); }
        addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
      }
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0;
        if (e.atk === 'slam') { // the sword comes down: a line of grave-fire races away from the impact
          G.shake += 10; G.hitstop = 0.08; SFX.play('heavy'); SFX.play('stone'); rumbleFx('slam'); dust(e.x + Math.cos(e.lockA) * 1.6, e.y + Math.sin(e.lockA) * 1.6, floor, 18);
          bossSlash(e, Math.round(24 * dm), 0.5, 3.4);
          const lines = e.phase2 ? [-0.32, 0, 0.32] : [0];
          for (const o of lines) for (let i = 0; i < 11; i++) { const r = 1.4 + i * 0.75; ukGraveFire(e.x + Math.cos(e.lockA + o) * r, e.y + Math.sin(e.lockA + o) * r, 0.18 + i * 0.06, Math.round(14 * dm)); }
          for (let i = 0; i < 6; i++) paintFloor(e.x + Math.cos(e.lockA) * 1.6 + rand(-0.5, 0.5), e.y + Math.sin(e.lockA) * 1.6 + rand(-0.5, 0.5), 0.2, 160);
        } else if (e.atk === 'plunge') { // sword into the floor: rings of green fire
          SFX.play('heavy'); SFX.play('ghost', 0.7); G.shake += 8; dust(e.x, e.y, floor, 20);
          e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 7, dmg: Math.round(13 * dm), col: RGB(110, 255, 140) });
          if (e.phase2) e.ring2 = 0.55;
        } else if (e.atk === 'blades') {
          for (const [x, y] of e.marks || []) G.hazards.push({ x, y, t: -0.15 - Math.random() * 0.2, dmg: Math.round(17 * dm), tex: 'p_blade', tw: 0.5, th: 1.5, col: [200, 140, 255, 1] });
          SFX.play('glint'); e.state = 'recover';
        } else if (e.atk === 'lunge') SFX.play('swingH');
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'combo') {
        const n = e.phase2 ? 4 : 3, gaps = [0, 0.42, 0.84, 1.42, 1.9], fin = n - 1;
        if (e.swipes < n && e.st >= gaps[e.swipes] / rage) {
          e.lockA = e.lockA + angDiff(ang, e.lockA) * 0.55;
          if (dist > 2.0) moveEntity(e, Math.cos(e.lockA) * 0.55, Math.sin(e.lockA) * 0.55, e.r, 0.33, false);
          if (e.swipes === fin) { // the overhead: gold flash before it, parry it to break him
            const r = (() => { const ddx = P.x - e.x, ddy = P.y - e.y, dd = Math.hypot(ddx, ddy); if (dd < 3.4 && Math.abs(angDiff(Math.atan2(ddy, ddx), e.lockA)) < 0.8) return hurtPlayer(Math.round(26 * dm), e.x, e.y, { src: e }); return 'miss'; })();
            SFX.play('swingH'); SFX.play('heavy', 0.6); G.shake += 6; dust(e.x + Math.cos(e.lockA) * 1.8, e.y + Math.sin(e.lockA) * 1.8, floor, 12);
            if (r === 'parry') { e.stagger = 3.0; e.state = 'stagger'; e.st = 0; e.atk = null; G.slow = 0.5; toast('POSTURE BROKEN!', 'His guard is open - punish him!', '#ffd060', 1.8); SFX.play('clink'); SFX.play('roar', 0.6); for (let i = 0; i < 26; i++) addP({ k: 'spark', x: e.x + Math.cos(e.lockA) * 1.2, y: e.y + Math.sin(e.lockA) * 1.2, z: e.z + 2, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(0, 4), size: 0.06, col: RGB(255, 230, 140), life: 0.5 }); return; }
          } else bossSlash(e, Math.round(15 * dm), 1.1, 3.3);
          for (let i = 0; i < 10; i++) { const a = e.lockA + (i / 9 - 0.5) * 1.6 * (e.swipes % 2 ? 1 : -1); addP({ k: 'spark', x: e.x + Math.cos(a) * 1.8, y: e.y + Math.sin(a) * 1.8, z: e.z + 1.5 + (i / 9 - 0.5) * 0.9, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, vz: 0, size: 0.07, col: e.swipes === fin ? RGB(255, 220, 120) : RGB(120, 240, 255), life: 0.2 }); }
          e.swipes++;
        }
        if (e.swipes >= n && e.st >= gaps[n - 1] / rage + 0.2) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'lunge') {
        const v = 12 * rage, ox = e.x, oy = e.y;
        const bl = moveEntity(e, Math.cos(e.lockA) * v * dt, Math.sin(e.lockA) * v * dt, e.r, 0.33, false);
        if (Math.random() < dt * 40) addP({ k: 'spark', x: e.x, y: e.y, z: e.z + rand(0.8, 2.4), vx: -Math.cos(e.lockA) * 3, vy: -Math.sin(e.lockA) * 3, vz: 0, size: 0.06, col: RGB(140, 230, 255), life: 0.25 });
        if (!e.hitDone && dist < 1.4) { e.hitDone = true; hurtPlayer(Math.round(20 * dm), e.x, e.y, { src: e }); spray(P.x, P.y, P.z + 1, Math.cos(e.lockA), Math.sin(e.lockA), 0.5, 40, 5, 0.6, 'flesh'); }
        if (!arenaOK(e.x, e.y) || bl || Math.hypot(e.x - ox, e.y - oy) < v * dt * 0.3 || e.st > 0.5) { if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; } e.state = 'recover'; e.st = 0; if (e.phase2) for (let i = 0; i < 4; i++) ukGraveFire(e.x + rand(-1.5, 1.5), e.y + rand(-1.5, 1.5), 0.4, Math.round(12 * dm)); }
      } else if (e.atk === 'plunge') {
        if (e.ring2 > 0) { e.ring2 -= dt; if (e.ring2 <= 0) { e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 7, dmg: Math.round(13 * dm), col: RGB(200, 140, 255) }); SFX.play('heavy', 0.6); } }
        if (e.st > 0.9) { e.state = 'recover'; e.st = 0; }
      } else { if (e.st > 0.45) { e.state = 'recover'; e.st = 0; } }
      break;
    }
    case 'recover': {
      const rd = (e.atk === 'combo' ? 0.75 : e.atk === 'slam' ? 0.85 : e.atk === 'lunge' ? 0.8 : 0.6) / (e.phase2 ? 1.12 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.3, 0.8) / rage; }
      break;
    }
  }
  if (!(e.state === 'strike' && e.atk === 'lunge') && e.state !== 'intro') keepClear(e);
}
BOSSDMG.uknight = function (e, dmg, o) { if (e.stagger > 0) return dmg * 1.35; return dmg; };
BOSSVIS.uknight = function (e, v) {
  const t = e.t;
  if (e.dead) { const k = clamp((e.bossDeath || 0) / 2.4, 0, 1); v.h *= 1 - 0.25 * Math.min(1, k * 2); v.tint = [120, 220, 255, 0.2 + 0.4 * k]; v.skew = Math.sin(t * 40) * 0.04 * (1 - k); return v; }
  if (e.state === 'kneel' || (e.state === 'intro' && e.st < 1.0)) { v.h *= 0.74; v.w *= 1.06; v.tint = [140, 160, 200, 0.2]; return v; }
  if (e.state === 'intro') { const k = clamp((e.st - 1.0) / 0.5, 0, 1); v.h *= 0.74 + 0.26 * k; return v; }
  const wu = (UK_WU[e.atk] || 0.7) / (e.phase2 ? 1.2 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  if (e.state === 'windup') {
    if (e.atk === 'slam') { v.h *= 1 + 0.1 * k; v.lean = -0.35 * k; v.tint = [110, 255, 140, 0.15 + 0.35 * pulse]; }
    else if (e.atk === 'lunge') { v.h *= 1 - 0.1 * k; v.lean = 0.25 * k; v.tint = [255, 220, 90, 0.15 + 0.35 * pulse]; }
    else if (e.atk === 'plunge') { v.h *= 1 + 0.06 * k; v.tint = [110, 255, 140, 0.15 + 0.3 * pulse]; }
    else if (e.atk === 'blades') { v.tint = [200, 140, 255, 0.15 + 0.35 * pulse]; v.glow = 0.3 * k; }
    else { v.lean = -0.2 * k; v.tint = [120, 230, 255, 0.12 + 0.3 * pulse]; }
    v.rim = 2.2;
  } else if (e.state === 'strike' && e.atk === 'combo') {
    const fin = (e.phase2 ? 4 : 3) - 1, gaps = [0, 0.42, 0.84, 1.42, 1.9], r = e.phase2 ? 1.2 : 1;
    if (e.swipes === fin) { const q = clamp(1 - (gaps[fin] / r - e.st) / 0.5, 0, 1); v.h *= 1 + 0.12 * q; v.lean = -0.4 * q; v.tint = [255, 220, 100, 0.25 + 0.45 * q * (0.5 + 0.5 * Math.sin(t * 40))]; v.glow = 0.5 * q; v.rim = 2.4; }
    else v.lean = e.swipes % 2 ? 0.3 : -0.1;
  } else if (e.state === 'strike' && e.atk === 'lunge') { v.lean = 0.5; v.h *= 0.95; }
  else if (e.state === 'oath') { v.tint = [220, 200, 255, 0.4 + 0.2 * Math.sin(t * 30)]; v.skew = Math.sin(t * 28) * 0.05; v.glow = 0.5; }
  if (e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.9; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
  if (e.phase2 && !v.tint) v.tint = [180, 140, 255, 0.1 + 0.06 * Math.sin(t * 6)];
  return v;
};
BOSSSPR.uknight = function (S, t) {
  const b = G.boss; if (!b || b.type !== 'uknight' || !b.alive || b.hidden) return;
  S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + 2.4, w: 0.9, h: 0.5, add: true, alpha: 0.45 + 0.15 * Math.sin(t * 6), lit: false, tint: [110, 240, 255, 1] }); // his eyes
  if (b.phase2) S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.5, w: 2.4, h: 3.0, add: true, alpha: 0.18 + 0.06 * Math.sin(t * 5), lit: false, tint: [190, 140, 255, 1] });
  if (b.state === 'windup' && b.atk === 'blades' && b.marks) for (const [x, y] of b.marks) S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.15, w: 1.5, h: 0.5, add: true, alpha: 0.4 + 0.25 * Math.sin(t * 30), lit: false, tint: [200, 140, 255, 1] });
  if (b.state === 'windup' && b.atk === 'blades' && b.marks) for (const [x, y] of b.marks) { const k = clamp(b.st / (UK_WU.blades / (b.phase2 ? 1.2 : 1)), 0, 1); S.push({ tex: 'p_blade', x, y, z: floorAt(x, y) + 3.4 - 1.2 * k, w: 0.45, h: 1.35, lit: false, glow: 0.4, alpha: 0.3 + 0.5 * k, tint: [200, 140, 255, 0.5] }); }
};
BOSSDEATH.uknight = function (e) {
  if (Math.random() < 0.5) addP({ k: 'ecto', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0.3, 2.6), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: rand(1, 3), size: rand(0.05, 0.1), col: Math.random() < 0.6 ? RGB(120, 230, 255) : RGB(220, 220, 220), life: 1 });
  if (e.bossDeath > 2.2 && !e.gushed) { e.gushed = true; e.rings = []; stoneBurst(e.x, e.y, e.z + 1.6, 30, 1.3); spray(e.x, e.y, e.z + 1.8, 0, 0, 1, 130, 6, Math.PI, 'flesh', 1.8); gibs(e.x, e.y, e.z + 1.5, 12, 'bone', 1.3); for (let i = 0; i < 50; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + 2, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(1, 6), size: rand(0.06, 0.12), col: RGB(120, 230, 255), life: 1.2 }); }
};
