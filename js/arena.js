'use strict';
// ===== M6: THE MINOTAUR OF THE BLOOD ARENA =====
// THE GAMES: the gate seals and two waves of champions (gladiators + imps, then gladiators + skeletons) pour out of the
//   pens. Clear them and the Minotaur smashes in through the north wall.
// CLEAVE combo (2 swings, 3 in phase 2), GORE charge (marked lane; slams into a wall or pillar -> HORNS STUCK, a long
//   stagger), STOMP (jumpable shockwave, 2 in phase 2), AXE THROW (a spinning axe that flies out and comes back - dodge it
//   twice). At half health: BLOOD FRENZY - he roars, the sand erupts in blood spikes, one more champion wave, chained gores.
const MI_WU = { cleave: 0.62, gore: 0.9, stomp: 0.8, throw: 0.7 };
function miSpawnWave(n) {
  const W = n === 1 ? [['gladiator', 2], ['imp', 3]] : n === 2 ? [['gladiator', 2], ['skeleton', 2], ['imp', 2]] : [['gladiator', 1], ['imp', 2], ['fzombie', 2]];
  const spots = [[14, 2.5], [36, 2.5], [14, 9], [36, 9], [20, 1.8], [30, 1.8], [25, 2], [18, 9.2], [32, 9.2]];
  let k = 0;
  for (const [type, c] of W) for (let i = 0; i < c; i++) {
    const [x, y] = spots[(k++ + n * 3) % spots.length];
    const s = makeEnemy(type, x + rand(-0.4, 0.4), y + rand(-0.3, 0.3), { rise: type === 'skeleton' || type === 'fzombie' });
    s.awake = true; s.summoned = true; s.games = true; s.hp = s.maxhp = Math.round(EDEF[type].hp * (RUN.cfg.hp || 1) * (type === 'gladiator' ? 1.1 : 1));
    if (type === 'gladiator') { s.forceElite = false; s.tint = null; }
    G.enemies.push(s); dust(s.x, s.y, floorAt(s.x, s.y), 10); sparks(s.x, s.y, 1, 8, RGB(255, 200, 120));
  }
  SFX.play('roar', 0.5); SFX.play('stone', 0.6); G.shake += 4;
}
BOSSREG.minotaur = {
  gate: 'The sand beyond the gate is wet. The crowd is long dead... the games are not.',
  setup(b) { b.hidden = true; b.r = 1.0; b.awake = false; },
  intro(b) { // the gate seals: THE GAMES BEGIN
    G.games = { wave: 0, t: 0, boss: b };
    G.bigText = { img: null, t1: 'THE GAMES BEGIN', t2: 'Survive the champions', t: 0, dur: 2.6 };
    SFX.play('roar', 0.7); G.shake += 3; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'minotaur';
  },
  update: updateMinotaur,
};
BOSSTICK.minotaur = function (dt) {
  const g = G.games; if (!g || !g.boss || g.boss.type !== 'minotaur') return;
  g.t += dt; const b = g.boss;
  const live = G.enemies.filter(e => e.games && (e.alive || (e.reT > 0 && !e.reassembled)));
  const left = live.length;
  // stragglers: every 12s (from 18s) the crowd drags anyone hiding back onto the sand near the Baron; a last 1-2 cowards
  // that still won't fight (30s+) or any wave dragging past 60s get taken by the crowd so the games can't soft-lock
  if ((g.wave === 1 || g.wave === 2) && left > 0 && (g.t > 60 || (g.t > 30 && left <= 2 && live.every(e => Math.hypot(e.x - P.x, e.y - P.y) > 6)))) { for (const e of live) if (e.alive) { e.games = false; e.alive = false; e.hidden = true; dust(e.x, e.y, floorAt(e.x, e.y), 14); } else e.games = false; toast('THE CROWD TAKES THE COWARDS', '', '#ff8050', 1.6); }
  if ((g.wave === 1 || g.wave === 2) && g.t > (g.pulled || 0) * 12 + 18 && left > 0) {
    g.pulled = (g.pulled || 0) + 1;
    for (const e of live) if (e.alive && Math.hypot(e.x - P.x, e.y - P.y) > 5) { const a = Math.random() * 6.28; const x = Math.max(12, Math.min(38, P.x + Math.cos(a) * 3)), y = Math.max(1.6, Math.min(9.4, P.y + Math.sin(a) * 2.5)); if (!SOLID[Math.floor(y) * MW + Math.floor(x)]) { e.x = x; e.y = y; e.z = floorAt(x, y); } e.awake = true; e.state = 'chase'; dust(e.x, e.y, e.z, 10); }
    if (live.length && g.pulled === 1) toast('THE CROWD WANTS BLOOD', '', '#ff8050', 1.4);
  }
  if (g.wave === 0 && g.t > 2.2) { g.wave = 1; g.t = 0; miSpawnWave(1); toast('WAVE I', 'Champions of the sand', '#ffb060', 2); }
  else if (g.wave === 1 && left === 0 && g.t > 1.5) { g.wave = 2; g.t = 0; g.pulled = 0; miSpawnWave(2); toast('WAVE II', 'The pens open wider', '#ffb060', 2); G.pickups.push(mkPickup('vial', 25, 6)); }
  else if (g.wave === 2 && left === 0 && g.t > 1.5) { g.wave = 3; g.t = 0; G.pickups.push(mkPickup('rose', 25, 7)); toast('THE CROWD ROARS...', 'Something answers it.', '#ff6050', 2.2); SFX.play('roar'); G.shake += 6; }
  else if (g.wave === 3 && g.t > 2.2) { g.wave = 4; miBurstIn(b); }
  else if (g.wave === 4) G.games = null;
};
function miBurstIn(b) { // smashes through the north wall into the arena
  b.hidden = false; b.awake = true; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.rings = []; b.x = 25; b.y = 2.2; b.z = floorAt(25, 2.2);
  G.shake += 16; G.hitstop = 0.12; SFX.play('stone'); SFX.play('heavy'); SFX.play('roar'); rumbleFx('slam');
  stoneBurst(25, 1.4, 1.2, 40, 1.4); dust(25, 2, 0, 30);
  for (let i = 0; i < 8; i++) paintFloor(25 + rand(-1.5, 1.5), 2.5 + rand(0, 1.5), rand(0.1, 0.3), 150);
}
function miPick(e, dist) {
  const W = [];
  if (dist < 3.4) W.push(['cleave', 4], ['stomp', 1.6], ['gore', 0.6]);
  else if (dist < 8) W.push(['gore', 3], ['throw', 2.2], ['stomp', 1], ['cleave', 0.5]);
  else W.push(['gore', 3], ['throw', 2.5]);
  return beastPickW(W, e.lastAtk);
}
function miStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hitDone = false; e.swings = 0; e.gores = 0; e.stomps = 0;
  if (atk === 'cleave') { SFX.play('windup'); SFX.play('glint', 0.5); }
  else if (atk === 'gore') { SFX.play('roar', 0.6); }
  else if (atk === 'stomp') SFX.play('heavy', 0.5);
  else { SFX.play('glint'); SFX.play('swing', 0.6); }
}
function miGoreBegin(e) { e.state = 'strike'; e.st = 0; e.hitDone = false; SFX.play('roar', 0.5); SFX.play('heavy', 0.6); }
function updateMinotaur(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake || e.hidden) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20);
  const rage = e.phase2 ? 1.25 : 1, floor = floorAt(e.x, e.y), dm = e.phase2 ? 1.15 : 1;
  beastRings(e, dt); miAxeTick(e, dt);
  e.z = floor;
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (e.stagger > 0) {
    e.stagger -= dt; e.state = 'stagger';
    if (Math.random() < dt * (e.stuck ? 14 : 8)) spray(e.x, e.y, e.z + 2.4, rand(-1, 1), rand(-1, 1), 1, 4, 2, 0.8, 'flesh');
    if (e.stuck && Math.random() < dt * 6) stoneBurst(e.x + Math.cos(e.lockA) * 1.1, e.y + Math.sin(e.lockA) * 1.1, e.z + 2.4, 1, 0.5);
    if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.5; if (e.stuck) { e.stuck = false; SFX.play('stone', 0.7); stoneBurst(e.x + Math.cos(e.lockA), e.y + Math.sin(e.lockA), e.z + 2.4, 10, 0.8); } }
    return;
  }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['frenzy', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'frenzy'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true; e.rings = []; e.axe = null;
    SFX.play('roar'); SFX.play('heavy'); G.shake += 10; G.flashR = 0.5; HAZE[0] = 180; HAZE[1] = 26; HAZE[2] = 40;
    toast('BLOOD FRENZY', '"MORE! GIVE ME MORE!"', '#ff4050', 3.2);
  }
  if (e.phase2 && Math.random() < dt * 5) addP({ k: 'ember', x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: e.z + rand(1, 2.8), vx: 0, vy: 0, vz: rand(0.6, 1.4), size: 0.05, col: RGB(255, 40 + (Math.random() * 40 | 0), 50), life: 0.6 });
  switch (e.state) {
    case 'intro': {
      faceP(e, dx, dy);
      if (!e.roared && e.st > 0.8) { e.roared = true; SFX.ev('intro_minotaur', 1, ['roar','howl','screech','toll','ghost']); SFX.play('roar'); G.shake += 8; e.rings.push({ x: e.x, y: e.y, r: 0.8, max: 6, dmg: 10, col: RGB(255, 120, 90) }); G.bigText = { img: null, t1: d.title, t2: 'Champion of the Lich King', t: 0, dur: 3.0 }; }
      if (e.st > 3.0) { e.state = 'chase'; e.st = 0; e.cd = 0.5; }
      break;
    }
    case 'frenzy': {
      e.z = floor + Math.abs(Math.sin(e.st * 26)) * 0.05;
      if (Math.random() < dt * 14) spray(e.x, e.y, e.z + 2.4, rand(-1, 1), rand(-1, 1), 1, 4, 3, 0.8, 'flesh');
      if (e.st > 0.8 && !e.spiked) { e.spiked = true; G.shake += 8; SFX.play('heavy'); for (let i = 0; i < 26; i++) { const hx = rand(13.5, 36.5), hy = rand(1.8, 9.8); if (arenaOK(hx, hy) && Math.hypot(hx - P.x, hy - P.y) > 1.2) G.hazards.push({ x: hx, y: hy, t: -0.9 - Math.random() * 0.8, dmg: 14 }); } }
      if (e.st > 2.2) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.6; miSpawnWave(3); for (const s of G.enemies) if (s.games) s.games = false; toast('THE PENS OPEN AGAIN', '', '#ffb060', 1.6); }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * rage * (RUN.cfg.spd || 1); const want = 2.4;
      if (Math.random() < dt * 0.9) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) + Math.cos(tang) * 0.8, my = Math.sin(ang) * (dist - want) + Math.sin(tang) * 0.8; const l = Math.hypot(mx, my);
      if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } const pw = e.walk; e.walk += sp * dt * 1.8; if (Math.floor(pw / Math.PI) !== Math.floor(e.walk / Math.PI)) { SFX.play('step', 0.9); G.shake += 0.8; dust(e.x, e.y, floor, 4); } }
      if (e.cd <= 0 && !e.axe && losTo(e.x, e.y, P.x, P.y)) miStartAtk(e, miPick(e, dist), ang);
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = MI_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.75 ? 6 : 0.4));
      for (let i = 0; i < 3; i++) { // telegraphs on the floor
        let x, y, col;
        if (e.atk === 'gore') { const r = rand(0.8, 10) * Math.min(1, k * 1.4); x = e.x + Math.cos(e.lockA) * r + rand(-0.4, 0.4); y = e.y + Math.sin(e.lockA) * r + rand(-0.4, 0.4); col = RGB(255, 80, 40); }
        else if (e.atk === 'cleave') { const a = e.lockA + rand(-1.0, 1.0), r = rand(1, 3.4); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 40, 60); }
        else if (e.atk === 'stomp') { const a = rand(0, TAU), r = rand(0.5, 3) * k; x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 170, 120); }
        else { const r = rand(1, Math.min(dist, 9)); x = e.x + Math.cos(e.lockA) * r; y = e.y + Math.sin(e.lockA) * r; col = RGB(255, 220, 120); }
        addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
      }
      if (e.atk === 'gore' && Math.random() < dt * 10) dust(e.x - Math.cos(e.lockA) * 0.6, e.y - Math.sin(e.lockA) * 0.6, floor, 2); // pawing the sand
      if (e.st >= wu) {
        if (e.atk === 'gore') miGoreBegin(e);
        else {
          e.state = 'strike'; e.st = 0;
          if (e.atk === 'throw') { e.axe = { x: e.x, y: e.y, z: e.z + 1.6, a: e.lockA, d: 0, max: Math.min(10, Math.max(5, dist + 1.5)), out: true, t: 0, hit: false, dmg: Math.round(20 * dm) }; SFX.play('swingH'); }
        }
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'cleave') {
        const n = e.phase2 ? 3 : 2, gap = e.phase2 ? 0.34 : 0.42;
        if (e.swings < n && e.st >= e.swings * gap) {
          e.lockA = e.lockA + angDiff(ang, e.lockA) * 0.55; e.side = e.swings % 2 ? 1 : -1;
          if (dist > 2) moveEntity(e, Math.cos(e.lockA) * 0.6, Math.sin(e.lockA) * 0.6, e.r, 0.33, false);
          bossSlash(e, Math.round(18 * dm), 1.1, 3.5); G.shake += 3;
          for (let i = 0; i < 12; i++) { const a = e.lockA + (i / 11 - 0.5) * 2.0 * e.side; addP({ k: 'spark', x: e.x + Math.cos(a) * 2.0, y: e.y + Math.sin(a) * 2.0, z: e.z + 1.4 + (i / 11 - 0.5) * 0.9, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, vz: 0, size: 0.08, col: RGB(255, 60 + i * 12, 70), life: 0.22 }); }
          paintFloor(e.x + Math.cos(e.lockA) * 1.8, e.y + Math.sin(e.lockA) * 1.8, 0.25, 160);
          e.swings++;
        }
        if (e.swings >= n && e.st >= n * gap + 0.15) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'gore') {
        const v = 11 * rage, ox = e.x, oy = e.y;
        const bl = moveEntity(e, Math.cos(e.lockA) * v * dt, Math.sin(e.lockA) * v * dt, e.r, 0.33, false);
        const moved = Math.hypot(e.x - ox, e.y - oy);
        if (Math.random() < dt * 30) dust(e.x, e.y, floor, 2);
        if (e.phase2 && Math.random() < dt * 20) paintFloor(e.x, e.y, 0.15, 120);
        if (!e.hitDone && dist < e.r + 0.9) { e.hitDone = true; hurtPlayer(Math.round(28 * dm), e.x, e.y, { src: e }); P.vx += Math.cos(e.lockA) * 10; P.vy += Math.sin(e.lockA) * 10; spray(P.x, P.y, P.z + 1, Math.cos(e.lockA), Math.sin(e.lockA), 0.5, 40, 5, 0.6, 'flesh'); }
        if (!arenaOK(e.x, e.y) || bl || moved < v * dt * 0.35) { // HORNS STUCK in the wall
          e.x = ox; e.y = oy; e.state = 'stagger'; e.stagger = e.phase2 ? 2.0 : 2.5; e.stuck = true; e.atk = null; e.st = 0;
          G.shake += 16; G.hitstop = 0.12; SFX.play('stone'); SFX.play('heavy'); rumbleFx('slam'); stoneBurst(e.x + Math.cos(e.lockA) * 1.1, e.y + Math.sin(e.lockA) * 1.1, e.z + 2.4, 18, 0.9); dust(e.x, e.y, floor, 24);
          for (let i = 0; i < (e.phase2 ? 7 : 4); i++) { const hx = e.x + rand(-3.5, 3.5), hy = e.y + rand(-3.5, 3.5); if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.6 - i * 0.08, dmg: 10 }); }
          toast('HORNS STUCK!', 'He gored the wall - carve him up!', '#ffd060', 1.6); break;
        }
        if (e.st >= 1.3) {
          e.gores++;
          if (e.phase2 && e.gores < 3) { e.state = 'regore'; e.st = 0; e.hitDone = false; SFX.play('roar', 0.5); }
          else { e.state = 'recover'; e.st = 0; }
        }
      } else if (e.atk === 'stomp') {
        const n = e.phase2 ? 2 : 1;
        if (e.stomps < n && e.st >= e.stomps * 0.55) {
          e.stomps++; G.shake += 10; G.hitstop = 0.06; SFX.play('land', 1); SFX.play('heavy'); rumbleFx('slam'); dust(e.x, e.y, floor, 26);
          e.rings.push({ x: e.x, y: e.y, r: 0.8, max: e.phase2 ? 8 : 6.5, dmg: Math.round(14 * dm), sp: 7, col: RGB(255, 150, 110) });
          if (dist < 2.2 && P.z - groundUnder(P.x, P.y, 0.1) < 0.5) hurtPlayer(Math.round(20 * dm), e.x, e.y, { src: e });
          if (e.phase2) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + e.st; const hx = e.x + Math.cos(a) * 2.6, hy = e.y + Math.sin(a) * 2.6; if (arenaOK(hx, hy)) G.hazards.push({ x: hx, y: hy, t: -0.4, dmg: 12 }); }
        }
        if (e.stomps >= n && e.st > n * 0.55 + 0.2) { e.state = 'recover'; e.st = 0; }
      } else { if (!e.axe || e.st > 3.5) { e.state = 'recover'; e.st = 0; } }
      break;
    }
    case 'regore': { faceP(e, dx, dy); e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * 8); for (let i = 0; i < 2; i++) { const r = rand(0.8, 8); addP({ k: 'spark', x: e.x + Math.cos(e.lockA) * r, y: e.y + Math.sin(e.lockA) * r, z: floor + 0.03, vx: 0, vy: 0, vz: 1.2, size: 0.07, col: RGB(255, 80, 40), life: 0.18 }); } if (e.st > 0.42) miGoreBegin(e); break; }
    case 'recover': {
      const rd = (e.atk === 'gore' ? 0.8 : e.atk === 'cleave' ? 0.65 : e.atk === 'stomp' ? 0.7 : 0.5) / (e.phase2 ? 1.15 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.4, 1.0) / rage; }
      break;
    }
  }
  if (!(e.state === 'strike' && e.atk === 'gore')) keepClear(e);
}
// the thrown axe: spins out along the lane, hangs, and comes back to his hand
function miAxeTick(e, dt) {
  const A = e.axe; if (!A) return;
  A.t += dt; const sp = 10;
  if (A.out) { A.d += sp * dt; if (A.d >= A.max) { A.out = false; A.hit = false; SFX.play('swing', 0.6); } A.x = e.x + Math.cos(A.a) * A.d; A.y = e.y + Math.sin(A.a) * A.d; if (isSolid(cellAt(A.x, A.y))) { A.out = false; A.hit = false; sparks(A.x, A.y, A.z, 14, RGB(255, 200, 120)); SFX.play('block', 0.6); A.d = Math.max(0, A.d - 0.4); } }
  else { const tx = e.x, ty = e.y, ddx = tx - A.x, ddy = ty - A.y, dd = Math.hypot(ddx, ddy); if (dd < 0.7) { e.axe = null; SFX.play('block', 0.5); return; } A.x += ddx / dd * sp * 1.15 * dt; A.y += ddy / dd * sp * 1.15 * dt; }
  if (Math.random() < dt * 30) addP({ k: 'spark', x: A.x, y: A.y, z: A.z, vx: rand(-1, 1), vy: rand(-1, 1), vz: 0, size: 0.05, col: RGB(255, 60, 70), life: 0.2 });
  if (Math.floor(A.t * 9) !== Math.floor((A.t - dt) * 9)) SFX.play('swing', 0.35);
  if (!A.hit && Math.hypot(P.x - A.x, P.y - A.y) < 0.75 && Math.abs((P.z + 1) - A.z) < 1.1) { A.hit = true; const r = hurtPlayer(A.dmg, A.x, A.y, { src: e }); if (r !== 'dodged') spray(P.x, P.y, P.z + 1.1, Math.cos(A.a), Math.sin(A.a), 0.4, 30, 4, 0.7, 'flesh'); }
}
BOSSVIS.minotaur = function (e, v) {
  if (e.dead) return v;
  const t = e.t;
  if (e.state === 'intro') { if (e.st < 0.8) { v.h *= 0.9 + 0.1 * e.st / 0.8; v.lean = 0.3; } else if (e.st < 2.0) { v.h *= 1.08; v.lean = -0.35; v.tint = [255, 90, 70, 0.25]; } return v; }
  if (e.state === 'frenzy') { v.skew = Math.sin(t * 36) * 0.07; v.h *= 1.08; v.lean = -0.35; v.tint = [255, 20, 40, 0.45]; return v; }
  if (e.state === 'chase') { v.skew = (v.skew || 0) * 0.4 + Math.sin(e.walk) * 0.05; v.z += Math.abs(Math.sin(e.walk)) * 0.08; v.legs = 0; }
  const wu = (MI_WU[e.atk] || 0.7) / (e.phase2 ? 1.25 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  if (e.state === 'windup') {
    if (e.atk === 'cleave') { v.skew = (v.skew || 0) - e.side * 0.16 * k; v.lean = -0.2 * k; v.h *= 1 + 0.05 * k; v.tint = [255, 40, 50, 0.15 + 0.35 * pulse]; }
    else if (e.atk === 'gore') { v.lean = 0.35 * k; v.h *= 1 - 0.12 * k; v.w *= 1 + 0.08 * k; v.z += Math.abs(Math.sin(t * 24)) * 0.05 * k; v.tint = [255, 90, 30, 0.18 + 0.35 * pulse]; }
    else if (e.atk === 'stomp') { v.h *= 1 + 0.1 * k; v.lean = -0.25 * k; v.z += 0.25 * k; v.tint = [255, 170, 110, 0.18 + 0.3 * pulse]; }
    else { v.skew = (v.skew || 0) + 0.2 * k; v.tint = [255, 220, 120, 0.18 + 0.3 * pulse]; }
    v.rim = 2.2;
  } else if (e.state === 'strike') {
    if (e.atk === 'cleave') { v.skew = (v.skew || 0) + e.side * 0.26; v.w *= 1.1; v.lean = 0.3; }
    else if (e.atk === 'gore') { v.lean = 0.5; v.z += Math.abs(Math.sin(t * 22)) * 0.1; v.skew = Math.sin(t * 22) * 0.05; v.tint = [255, 60, 30, 0.25]; }
    else if (e.atk === 'stomp') { v.h *= 0.94; v.w *= 1.06; }
  } else if (e.state === 'regore') { v.lean = 0.35; v.tint = [255, 90, 30, 0.3]; }
  if (e.stagger > 0) { v.skew = Math.sin(t * (e.stuck ? 18 : 10)) * (e.stuck ? 0.06 : 0.12); v.lean = e.stuck ? 0.45 : 0; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
  if (e.phase2 && !v.tint) v.tint = [255, 30, 50, 0.14 + 0.1 * Math.sin(t * 6)];
  return v;
};
BOSSSPR.minotaur = function (S, t) {
  const b = G.boss; if (!b || b.type !== 'minotaur' || !b.alive || b.hidden) return;
  for (const R of (b.rings || [])) {
    const n = Math.max(10, Math.round(R.r * 7)); const c = R.col; const tc = [(c) & 255, (c >> 8) & 255, (c >> 16) & 255, 1];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 0.3, x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; if (isSolid(cellAt(x, y))) continue; S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.15, w: 0.7, h: 0.45, add: true, alpha: 0.6 * (1 - R.r / R.max) + 0.2, lit: false, tint: tc }); }
  }
  if (b.axe) { const A = b.axe; S.push({ tex: 'ic_axe', x: A.x, y: A.y, z: A.z - 0.55, w: 0.95, h: 1.1, rot: A.t * 16, lit: false, glow: 0.3 }); S.push({ tex: 'glow_w', x: A.x, y: A.y, z: A.z - 0.6, w: 1.4, h: 1.2, add: true, alpha: 0.35, lit: false, tint: [255, 40, 60, 1] }); }
  if (b.awake) S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.55, w: 1.7, h: 1.6, add: true, alpha: 0.28 + 0.1 * Math.sin(t * 5), lit: false, tint: b.phase2 ? [255, 30, 60, 1] : [255, 120, 60, 1] });
};
BOSSDEATH.minotaur = function (e) {
  if (e.bossDeath > 2.2 && !e.gushed) { e.gushed = true; e.axe = null; spray(e.x, e.y, e.z + 1.8, 0, 0, 1, 140, 6, Math.PI, 'flesh', 1.9); gibs(e.x, e.y, e.z + 1.6, 14, 'flesh', 1.5); addP({ k: 'gib', tex: 'ic_axe', x: e.x, y: e.y, z: e.z + 2, vx: rand(-2, 2), vy: rand(-2, 2), vz: 5, rot: 0, vr: 9, w: 0.9, h: 1.0, life: 99 }); }
  if (e.bossDeath < 2.2 && Math.random() < 0.15) { G.shake += 1; dust(e.x, e.y, e.z, 2); }
};
BOSSDMG.minotaur = function (e, dmg, o) {
  if (e.stuck) { if (Math.random() < 0.3) dmgNum(e.x, e.y, e.z + e.h + 0.4, 'x1.5', '#ffd060'); return dmg * 1.5; }
  return dmg;
};
