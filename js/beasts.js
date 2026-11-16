'use strict';
// ===== M5: stage 4 THE ALPHA OF THE BLOOD MOON + stage 5 THE GARGOYLE MATRIARCH, and their brood =====
// ALPHA (werewolf): fast and vicious. CLAW combo (3, 4 in phase 2), POUNCE (marked landing + jumpable ring), REND dash
//   (3 chained in phase 2), HOWL (calls the pack + a jumpable ring). At half health THE BLOOD MOON RISES: the sky turns red,
//   he goes feral. SILVER BURNS HIM: crossbow / sidearm bolts and the rapier hit x1.5 (x2.2 with Silver Bolts, which also
//   interrupts his wind-ups).
// MATRIARCH (gargoyle): waits as a statue, then flies. SWOOP (marked dive line), GUST (wing blast that shoves you), RUBBLE
//   (the belfry comes down), TOLL (the bells ring out jumpable shockwaves), WHELPS, and STONE SKIN: she petrifies and takes
//   20% damage until heavy hits or the whip CRACK her shell 3 times -> shattered, staggered. Phase 2: the stone skin
//   explodes, revealing a body of molten blood; the bells toll on their own.
EDEF.werewolf = { spr: 's_werewolf', h: 1.75, hp: 80, speed: 2.7, range: 1.5, windup: 0.45, strike: 0.34, recover: 0.55, dmg: 13, mat: 'flesh', kbRes: 0.8, lunge: 7.5, silverWeak: true, name: 'Werewolf' };
EDEF.gargoyle = { spr: 's_gargoyle', h: 0.95, hp: 60, speed: 2.8, range: 1.0, windup: 0.42, strike: 0.4, recover: 0.8, dmg: 11, mat: 'stone', kbRes: 0.9, fly: 1.5, armor: 0.8, name: 'Gargoyle' };
EDEF.alphawolf = { spr: 's_alphawolf', h: 2.8, hp: 1750, speed: 2.4, range: 2.6, windup: 0.6, strike: 0.25, recover: 0.6, dmg: 22, mat: 'flesh', kbRes: 0.06, boss: true, silverWeak: true, title: 'THE ALPHA OF THE BLOOD MOON' };
EDEF.matriarch = { spr: 's_matriarch', h: 3.1, hp: 1850, speed: 2.1, range: 2.8, windup: 0.7, strike: 0.25, recover: 0.7, dmg: 22, mat: 'stone', kbRes: 0.04, boss: true, title: 'THE GARGOYLE MATRIARCH' };
MAT.stone = [RGB(210, 20, 40), RGB(150, 140, 170), RGB(110, 100, 130), RGB(150, 0, 24), RGB(255, 50, 70)];
const AW_WU = { claw: 0.5, pounce: 0.75, rend: 0.55, howl: 0.85 };
const MA_WU = { swoop: 0.85, gust: 0.65, rubble: 0.7, toll: 0.9, whelps: 0.9, stone: 0.45 };
function beastPickW(W, last) { let tot = 0; for (const w of W) { if (w[0] === last) w[1] *= 0.15; tot += w[1]; } let r = Math.random() * tot; for (const w of W) { r -= w[1]; if (r <= 0) return w[0]; } return W[0][0]; }
function beastRings(e, dt) { // expanding shockwave rings: jump them
  if (!e.rings) e.rings = [];
  for (const R of e.rings) {
    R.r += dt * (R.sp || 6.5);
    const dd = Math.hypot(P.x - R.x, P.y - R.y);
    if (!R.hit && Math.abs(dd - R.r) < 0.38 && P.z - groundUnder(P.x, P.y, 0.1) < 0.35) { R.hit = true; hurtPlayer(R.dmg, R.x, R.y, { src: e, unblockable: true }); }
    if (Math.random() < dt * 30) { const a = rand(0, TAU), x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; if (!isSolid(cellAt(x, y))) addP({ k: 'dust', x, y, z: floorAt(x, y) + 0.05, vx: Math.cos(a), vy: Math.sin(a), vz: 0.6, size: 0.1, col: R.col || RGB(220, 170, 150), life: 0.4 }); }
  }
  e.rings = e.rings.filter(R => R.r < R.max);
}
function beastSummon(e, type, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), r = rand(1.8, 3); let x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
    if (!arenaOK(x, y)) { x = e.x + rand(-0.5, 0.5); y = e.y + 1.4; }
    const s = makeEnemy(type, x, y, { rise: type !== 'gargoyle' }); s.awake = true; s.summoned = true; s.hp = s.maxhp = Math.round(EDEF[type].hp * (RUN.cfg.hp || 1)); if (type === 'gargoyle') s.z = e.z + 1; G.enemies.push(s);
    dust(x, y, floorAt(x, y), 8);
  }
}
function stoneBurst(x, y, z, n, pw = 1) { for (let i = 0; i < n; i++) addP({ k: 'gib', tex: 'gibstone', x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: z + rand(0, 0.8), vx: rand(-3, 3) * pw, vy: rand(-3, 3) * pw, vz: rand(1, 5) * pw, rot: 0, vr: rand(-12, 12), w: rand(0.14, 0.26), h: rand(0.12, 0.22), life: rand(2, 4), tint: [150, 140, 175] }); }
function keepClear(e) { if (e.alive && !e.intangible && e.z < P.z + 1.4) { const ddx = e.x - P.x, ddy = e.y - P.y, dd = Math.hypot(ddx, ddy), md = PR + e.r; if (dd < md && dd > 0.001) moveEntity(e, ddx / dd * (md - dd), ddy / dd * (md - dd), e.r, 0.33, false); } }
function faceP(e, dx, dy) { const l = -dx * Math.sin(P.ang) + dy * Math.cos(P.ang); if (Math.abs(l) > 0.4) e.flip = l > 0; }

// ======================= THE ALPHA OF THE BLOOD MOON =======================
function alphaIntro() {
  const b = G.boss; b.awake = true; b.hidden = false; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.rings = []; b.landed = false;
  b.z = floorAt(b.x, b.y) + 6; b.vz = 0;
  SFX.play('howl'); G.shake += 2; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'alphawolf';
  toast('A howl splits the night...', 'Silver burns the beast.', '#d8c8ff', 3);
}
function alphaPick(e, dist) {
  const kids = G.enemies.filter(o => o.summoned && o.alive).length, p2 = e.phase2; const W = [];
  if (dist < 3.2) W.push(['claw', 4], ['rend', 1], ['howl', kids < 2 ? 0.5 : 0]);
  else if (dist < 8) W.push(['pounce', 3], ['rend', 2.5], ['claw', 0.6], ['howl', kids < 2 ? (p2 ? 1.2 : 0.7) : 0]);
  else W.push(['pounce', 3], ['rend', 2], ['howl', kids < 2 ? 1 : 0]);
  return beastPickW(W, e.lastAtk);
}
function alphaStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hitDone = false; e.swipes = 0; e.dashes = 0;
  e.tx = P.x; e.ty = P.y;
  if (atk === 'claw') { SFX.play('windup'); SFX.play('glint', 0.5); }
  else if (atk === 'pounce') SFX.play('roar', 0.5);
  else if (atk === 'rend') { SFX.play('screech', 0.7); SFX.play('glint', 0.6); }
  else SFX.play('howl', 0.8);
}
function updateAlpha(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20);
  const rage = e.phase2 ? 1.3 : 1, floor = floorAt(e.x, e.y), dm = e.phase2 ? 1.15 : 1;
  beastRings(e, dt);
  if (e.state !== 'intro' && !(e.state === 'strike' && e.atk === 'pounce')) { if (e.z > floor + 0.01) { e.vz -= 14 * dt; e.z += e.vz * dt; if (e.z < floor) { e.z = floor; e.vz = 0; } } else { e.z = floor; e.vz = 0; } }
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; if (Math.random() < dt * 8) spray(e.x, e.y, e.z + 2, 0, 0, 1, 3, 2, 0.8, 'flesh'); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.4; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['frenzy', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'frenzy'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true; e.rings = [];
    SFX.play('howl'); SFX.play('roar'); G.shake += 8; G.flashR = 0.5;
    if (Engine.tex.sky_bloodmoon) Engine.tex.sky = Engine.tex.sky_bloodmoon;
    HAZE[0] = 170; HAZE[1] = 30; HAZE[2] = 60;
    toast('THE BLOOD MOON RISES', '"Run, little Baron. I prefer you running."', '#ff5060', 3.5);
  }
  if (e.phase2 && Math.random() < dt * 6) addP({ k: 'ember', x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: e.z + rand(0.8, 2.4), vx: 0, vy: 0, vz: rand(0.5, 1.4), size: 0.05, col: RGB(255, 30 + (Math.random() * 40 | 0), 60), life: 0.6 });
  switch (e.state) {
    case 'intro': { // drops from the battlements, lands, howls
      if (e.st > 0.9) { e.vz -= 22 * dt; e.z += e.vz * dt; }
      if (e.z <= floor && !e.landed) {
        e.z = floor; e.landed = true; G.shake += 14; G.hitstop = 0.12; SFX.play('land', 1); SFX.play('heavy'); rumbleFx('slam'); dust(e.x, e.y, floor, 30);
        for (let i = 0; i < 10; i++) paintFloor(e.x + rand(-1.2, 1.2), e.y + rand(-1.2, 1.2), rand(0.1, 0.3), 150);
        e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 5, dmg: 10, col: RGB(200, 160, 255) });
      }
      if (e.landed && !e.howled && e.st > 1.7) { e.howled = true; SFX.ev('intro_alphawolf', 1, ['roar','howl','screech','toll','ghost']); SFX.play('howl'); G.shake += 6; G.bigText = { img: null, t1: d.title, t2: 'Hound of the Lich King', t: 0, dur: 3.0 }; }
      if (e.st > 3.3) { e.state = 'chase'; e.st = 0; e.cd = 0.4; }
      break;
    }
    case 'frenzy': {
      e.z = floor + Math.abs(Math.sin(e.st * 30)) * 0.05;
      if (Math.random() < dt * 14) spray(e.x, e.y, e.z + 2.2, rand(-1, 1), rand(-1, 1), 1, 4, 3, 0.8, 'flesh');
      if (e.st > 1.0 && !e.ringed) { e.ringed = true; e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 8, dmg: 14, sp: 7, col: RGB(255, 60, 80) }); G.shake += 10; SFX.play('heavy'); }
      if (e.st > 2.0) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.2; beastSummon(e, 'werewolf', 1); }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * rage * (RUN.cfg.spd || 1); const want = 2.2;
      if (Math.random() < dt * 1.2) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) + Math.cos(tang) * 1.1, my = Math.sin(ang) * (dist - want) + Math.sin(tang) * 1.1; const l = Math.hypot(mx, my);
      if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } const pw = e.walk; e.walk += sp * dt * 2.2; if (Math.floor(pw / Math.PI) !== Math.floor(e.walk / Math.PI)) { SFX.play('step', 0.6); dust(e.x, e.y, floor, 3); if (e.phase2) paintFloor(e.x + rand(-0.3, 0.3), e.y + rand(-0.3, 0.3), 0.12, 120); } }
      if (e.cd <= 0 && losTo(e.x, e.y, P.x, P.y)) alphaStartAtk(e, alphaPick(e, dist), ang);
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = AW_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.75 ? 6 : 0.5));
      if (k < 0.8) { e.tx = P.x + P.vx * 0.25; e.ty = P.y + P.vy * 0.25; }
      for (let i = 0; i < 3; i++) { // telegraphs on the floor
        let x, y, col;
        if (e.atk === 'pounce') { const a = rand(0, TAU), r = 1.8 * Math.sqrt(Math.random()); x = e.tx + Math.cos(a) * r; y = e.ty + Math.sin(a) * r; col = RGB(255, 60, 70); }
        else if (e.atk === 'rend') { const r = rand(0.8, 8) * Math.min(1, k * 1.4); x = e.x + Math.cos(e.lockA) * r + rand(-0.3, 0.3); y = e.y + Math.sin(e.lockA) * r + rand(-0.3, 0.3); col = RGB(255, 210, 90); }
        else if (e.atk === 'claw') { const a = e.lockA + rand(-1.1, 1.1), r = rand(1, 3); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(255, 40, 60); }
        else { x = e.x + rand(-2.5, 2.5); y = e.y + rand(-2.5, 2.5); col = RGB(190, 120, 255); }
        addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
      }
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0;
        if (e.atk === 'pounce') { e.px0 = e.x; e.py0 = e.y; let tx = e.tx, ty = e.ty; if (!arenaOK(tx, ty)) { const s = bossLandSpot(tx, ty); if (s) { tx = s[0]; ty = s[1]; } else { tx = e.x; ty = e.y; } } e.tx = tx; e.ty = ty; SFX.play('roar', 0.6); SFX.play('jump'); }
        else if (e.atk === 'howl') { SFX.play('howl'); G.shake += 6; e.rings.push({ x: e.x, y: e.y, r: 0.8, max: 6.5, dmg: Math.round(10 * dm), col: RGB(190, 130, 255) }); beastSummon(e, 'werewolf', e.phase2 ? 2 : 1); }
        else if (e.atk === 'rend') SFX.play('swingH');
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'claw') {
        const n = e.phase2 ? 4 : 3, gap = e.phase2 ? 0.24 : 0.3;
        if (e.swipes < n && e.st >= e.swipes * gap) {
          e.lockA = e.lockA + angDiff(ang, e.lockA) * 0.6; e.side = e.swipes % 2 ? 1 : -1;
          if (dist > 1.8) moveEntity(e, Math.cos(e.lockA) * 0.55, Math.sin(e.lockA) * 0.55, e.r, 0.33, false);
          bossSlash(e, Math.round(13 * dm), 1.15, 3.0);
          for (let i = 0; i < 10; i++) { const a = e.lockA + (i / 9 - 0.5) * 1.8 * e.side; addP({ k: 'spark', x: e.x + Math.cos(a) * 1.6, y: e.y + Math.sin(a) * 1.6, z: e.z + 1.2 + (i / 9 - 0.5) * 0.8, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, vz: 0, size: 0.07, col: RGB(255, 40 + i * 10, 60), life: 0.2 }); }
          paintFloor(e.x + Math.cos(e.lockA) * 1.4, e.y + Math.sin(e.lockA) * 1.4, 0.2, 140);
          e.swipes++;
        }
        if (e.swipes >= n && e.st >= n * gap + 0.12) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'pounce') {
        const T = 0.75 / rage, k = Math.min(1, e.st / T);
        e.x = e.px0 + (e.tx - e.px0) * k; e.y = e.py0 + (e.ty - e.py0) * k; e.z = floorAt(e.x, e.y) + Math.sin(k * Math.PI) * 2.6;
        if (k >= 1) {
          e.z = floorAt(e.x, e.y); G.shake += 12; G.hitstop = 0.1; SFX.play('land', 1); SFX.play('heavy'); rumbleFx('slam'); dust(e.x, e.y, e.z, 24);
          spray(e.x, e.y, e.z + 0.3, 0, 0, 2, 30, 4, Math.PI, 'flesh', 1.2); for (let i = 0; i < 8; i++) paintFloor(e.x + rand(-1.2, 1.2), e.y + rand(-1.2, 1.2), rand(0.1, 0.3), 140);
          if (Math.hypot(P.x - e.x, P.y - e.y) < 2.0 && P.z - groundUnder(P.x, P.y, 0.1) < 0.6) hurtPlayer(Math.round(24 * dm), e.x, e.y, { src: e });
          e.rings.push({ x: e.x, y: e.y, r: 0.6, max: e.phase2 ? 6 : 4.5, dmg: Math.round(12 * dm), col: RGB(255, 120, 140) });
          e.state = 'recover'; e.st = 0;
        }
      } else if (e.atk === 'rend') {
        const v = 13 * rage, ox = e.x, oy = e.y;
        const bl = moveEntity(e, Math.cos(e.lockA) * v * dt, Math.sin(e.lockA) * v * dt, e.r, 0.33, false);
        if (Math.random() < dt * 40) { addP({ k: 'spark', x: e.x, y: e.y, z: e.z + rand(0.5, 2), vx: -Math.cos(e.lockA) * 3, vy: -Math.sin(e.lockA) * 3, vz: 0, size: 0.06, col: RGB(255, 200, 90), life: 0.25 }); if (e.phase2) paintFloor(e.x, e.y, 0.15, 120); }
        if (!e.hitDone && dist < 1.15) { e.hitDone = true; hurtPlayer(Math.round(18 * dm), e.x, e.y, { src: e }); spray(P.x, P.y, P.z + 1, Math.cos(e.lockA), Math.sin(e.lockA), 0.5, 40, 5, 0.6, 'flesh'); }
        const moved = Math.hypot(e.x - ox, e.y - oy);
        if (!arenaOK(e.x, e.y) || bl || moved < v * dt * 0.3 || e.st > 0.5) {
          if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; }
          e.dashes++;
          if (e.phase2 && e.dashes < 3) { e.st = 0; e.hitDone = false; e.lockA = Math.atan2(P.y - e.y, P.x - e.x); e.state = 'redash'; SFX.play('glint', 0.6); }
          else { e.state = 'recover'; e.st = 0; }
        }
      } else { if (e.st > 0.6) { e.state = 'recover'; e.st = 0; } }
      break;
    }
    case 'redash': { faceP(e, dx, dy); e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * 8); if (e.st > 0.28) { e.state = 'strike'; e.st = 0; SFX.play('swingH'); } break; }
    case 'recover': {
      const rd = (e.atk === 'pounce' ? 0.85 : e.atk === 'claw' ? 0.6 : e.atk === 'rend' ? 0.7 : 0.5) / (e.phase2 ? 1.15 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.35, 0.9) / rage; }
      break;
    }
  }
  if (!(e.state === 'strike' && (e.atk === 'rend' || e.atk === 'pounce'))) keepClear(e);
}
// ======================= THE GARGOYLE MATRIARCH =======================
function matriarchIntro() {
  const b = G.boss; b.awake = true; b.hidden = false; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.rings = []; b.hov = 0; b.intangible = true; b.lastStoneHp = b.hp;
  SFX.play('stone'); G.shake += 2; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'matriarch';
  toast('The great statue... is breathing.', '', '#e0c8ff', 2.6);
}
function matPick(e, dist) {
  const kids = G.enemies.filter(o => o.summoned && o.alive).length, p2 = e.phase2; const W = [];
  const lost = (e.lastStoneHp - e.hp) / e.maxhp;
  if (!p2 && lost > 0.14) return 'stone';
  if (dist < 3.5) W.push(['gust', 3], ['swoop', 1.2], ['rubble', 1.4], ['toll', 1]);
  else W.push(['swoop', 3.2], ['rubble', 1.8], ['toll', 1.6], ['gust', 0.6]);
  W.push(['whelps', kids < 2 ? (p2 ? 1.2 : 0.6) : 0]);
  return beastPickW(W, e.lastAtk);
}
function matStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.hitDone = false; e.swoops = 0;
  if (atk === 'swoop') { SFX.play('screech'); SFX.play('wing'); }
  else if (atk === 'gust') SFX.play('wing');
  else if (atk === 'stone') { SFX.play('stone'); toast('STONE SKIN', 'Heavy strikes or the whip crack it!', '#c8c0e0', 1.8); }
  else if (atk === 'toll') SFX.play('screech', 0.8);
  else SFX.play('screech', 0.6);
}
function matToll(e) {
  const bells = (LEVEL.props || []).filter(p => p.type === 'bell' && Math.abs(p.y - 5.5) < 6 && p.x > ARENA.x0 && p.x < ARENA.x1);
  const list = bells.length ? bells.slice().sort(() => Math.random() - 0.5).slice(0, e.phase2 ? 3 : 2) : [{ x: e.x, y: e.y }];
  for (const b of list) { e.rings.push({ x: b.x, y: b.y, r: 0.5, max: 9, dmg: Math.round(14 * (e.phase2 ? 1.12 : 1)), sp: 5.5, col: RGB(255, 210, 120) }); b.swing = 1; }
  SFX.play('toll'); G.shake += 6; rumbleFx('slam');
}
function matRubble(e, n) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), r = i === 0 ? 0 : rand(0.8, 3), hx = P.x + Math.cos(a) * r, hy = P.y + Math.sin(a) * r; if (arenaOK(hx, hy)) { G.hazards.push({ x: hx, y: hy, t: -0.85 - i * 0.08, dmg: Math.round(12 * (e.phase2 ? 1.12 : 1)) }); for (let k = 0; k < 3; k++) addP({ k: 'gib', tex: 'gibbone', x: hx + rand(-0.3, 0.3), y: hy + rand(-0.3, 0.3), z: 4.8, vx: 0, vy: 0, vz: rand(-3, -1), rot: 0, vr: rand(-8, 8), w: 0.2, h: 0.18, life: 1.2, tint: [150, 140, 175] }); } }
  SFX.play('stone', 0.8); G.shake += 3;
}
function updateMatriarch(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake) return;
  if (!e.rings) e.rings = [];
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20);
  const rage = e.phase2 ? 1.25 : 1, floor = floorAt(e.x, e.y), dm = e.phase2 ? 1.12 : 1;
  beastRings(e, dt);
  for (const b of LEVEL.props) if (b.type === 'bell' && b.swing > 0) b.swing = Math.max(0, b.swing - dt * 0.35);
  // hover height: low enough to cut (<= 1.9 over the Baron) except while she climbs for a swoop
  let want = 1.15;
  if (e.state === 'windup' && e.atk === 'swoop') want = 2.6; else if (e.state === 'strike' && e.atk === 'swoop') want = 0.55; else if (e.stone || e.state === 'stagger' || e.state === 'intro' || e.state === 'shatter') want = 0;
  else if (e.state === 'recover' && (e.atk === 'swoop' || e.atk === 'stone')) want = 0.2;
  e.hov = (e.hov || 0) + (want - (e.hov || 0)) * Math.min(1, dt * (e.state === 'strike' ? 8 : 3));
  e.z = floor + e.hov + (e.hov > 0.3 ? Math.sin(e.t * 4) * 0.12 : 0);
  if (e.hov > 0.3 && Math.floor((e.t - dt) * 2.2) !== Math.floor(e.t * 2.2)) SFX.play('wing', 0.35);
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt * 0.5, e.kby * dt * 0.5, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; e.stone = false; if (Math.random() < dt * 8) spray(e.x, e.y, e.z + 2, 0, 0, 1, 4, 2, 0.8, 'stone'); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.4; } return; }
  if (!e.phase2 && e.hp < e.maxhp * 0.5 && !['shatter', 'intro'].includes(e.state)) {
    e.phase2 = true; e.state = 'shatter'; e.st = 0; e.atk = null; e.stone = false; e.poise = 0; e.intangible = true; e.rings = [];
    SFX.play('stone'); SFX.play('gib'); SFX.play('screech'); G.shake += 12; G.flashR = 0.4; stoneBurst(e.x, e.y, e.z + 1.5, 40, 1.4);
    spray(e.x, e.y, e.z + 1.8, 0, 0, 1, 90, 5, Math.PI, 'flesh', 1.6);
    toast('HER STONE SKIN SHATTERS', '"My children will pick your bones clean."', '#ff5080', 3.5);
  }
  if (e.phase2 && Math.random() < dt * 8) addP({ k: 'ember', x: e.x + rand(-0.8, 0.8), y: e.y + rand(-0.8, 0.8), z: e.z + rand(0.8, 2.6), vx: 0, vy: 0, vz: rand(0.4, 1.2), size: 0.05, col: Math.random() < 0.6 ? RGB(255, 40, 70) : RGB(255, 120, 200), life: 0.7 });
  switch (e.state) {
    case 'intro': {
      if (Math.random() < dt * 30) addP({ k: 'spark', x: e.x + rand(-0.8, 0.8), y: e.y + rand(-0.8, 0.8), z: e.z + rand(0.3, 2.8), vx: 0, vy: 0, vz: rand(0, 0.6), size: 0.05, col: Math.random() < 0.5 ? RGB(255, 60, 120) : RGB(200, 190, 230), life: 0.3 });
      if (Math.random() < dt * 6) SFX.play('stone', 0.3);
      if (e.st > 1.6 && !e.woke) {
        e.woke = true; e.intangible = false; G.shake += 14; G.hitstop = 0.12; G.flashG = 0.2; SFX.ev('intro_matriarch', 1, ['roar','howl','screech','toll','ghost']); SFX.play('screech'); SFX.play('roar', 0.6); SFX.play('toll'); stoneBurst(e.x, e.y, e.z + 1.5, 30, 1.2); rumbleFx('slam');
        G.bigText = { img: null, t1: d.title, t2: 'Mother of the Belfry', t: 0, dur: 3.0 };
        e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 6, dmg: 10, col: RGB(255, 210, 120) });
      }
      if (e.st > 3.1) { e.state = 'chase'; e.st = 0; e.cd = 0.5; }
      break;
    }
    case 'shatter': {
      if (Math.random() < dt * 12) spray(e.x, e.y, e.z + 2, rand(-1, 1), rand(-1, 1), 1, 4, 3, 0.8, 'flesh');
      if (e.st > 1.2 && !e.tolled) { e.tolled = true; matToll(e); }
      if (e.st > 2.0) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.3; e.tollT = 7; beastSummon(e, 'gargoyle', 2); }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * rage * (RUN.cfg.spd || 1);
      if (Math.random() < dt * 0.7) e.side *= -1;
      const orbit = 3.4, tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - orbit) + Math.cos(tang) * 1.0, my = Math.sin(ang) * (dist - orbit) + Math.sin(tang) * 1.0; const l = Math.hypot(mx, my);
      if (l > 0.05) { mx = mx / l * sp; my = my / l * sp; const ox = e.x, oy = e.y; moveEntity(e, mx * dt, my * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } }
      if (e.phase2) { e.tollT -= dt; if (e.tollT <= 0) { e.tollT = 7; matToll(e); } if (Math.random() < dt * 0.25) matRubble(e, 3); }
      if (e.cd <= 0 && losTo(e.x, e.y, P.x, P.y)) matStartAtk(e, matPick(e, dist), ang);
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = MA_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.7 ? 5 : 0.3));
      if (e.atk === 'swoop' && dist < 4.5) moveEntity(e, -Math.cos(ang) * 2.2 * dt, -Math.sin(ang) * 2.2 * dt, e.r, 0.33, false); // backs off to dive
      for (let i = 0; i < 3; i++) {
        let x, y, col;
        if (e.atk === 'swoop') { const r = rand(0.5, dist + 2.5); x = e.x + Math.cos(e.lockA) * r + rand(-0.25, 0.25); y = e.y + Math.sin(e.lockA) * r + rand(-0.25, 0.25); col = RGB(200, 90, 255); }
        else if (e.atk === 'gust') { const a = e.lockA + rand(-0.7, 0.7), r = rand(1, 5); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(200, 220, 255); }
        else if (e.atk === 'rubble') { const a = rand(0, TAU), r = rand(0, 2.5); x = P.x + Math.cos(a) * r; y = P.y + Math.sin(a) * r; col = RGB(230, 210, 180); }
        else if (e.atk === 'toll') { x = e.x + rand(-1, 1); y = e.y + rand(-1, 1); col = RGB(255, 210, 120); }
        else if (e.atk === 'stone') { x = e.x + rand(-0.8, 0.8); y = e.y + rand(-0.8, 0.8); col = RGB(170, 160, 200); }
        else { x = e.x + rand(-2, 2); y = e.y + rand(-2, 2); col = RGB(120, 255, 140); }
        addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
      }
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0;
        if (e.atk === 'gust') {
          SFX.play('wing'); SFX.play('swingH'); G.shake += 4;
          if (dist < 6.5 && Math.abs(angDiff(ang, e.lockA)) < 0.75) { P.vx += Math.cos(e.lockA) * 12; P.vy += Math.sin(e.lockA) * 12; if (dist < 3.2) hurtPlayer(Math.round(9 * dm), e.x, e.y, { src: e }); }
          for (let i = 0; i < 40; i++) { const a = e.lockA + rand(-0.7, 0.7), s = rand(5, 10); addP({ k: 'dust', x: e.x + Math.cos(a), y: e.y + Math.sin(a), z: e.z + rand(0.2, 2), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(-0.3, 0.3), size: 0.08, col: RGB(200, 190, 220), life: 0.5 }); }
        } else if (e.atk === 'rubble') matRubble(e, e.phase2 ? 9 : 7);
        else if (e.atk === 'toll') matToll(e);
        else if (e.atk === 'whelps') { SFX.play('screech'); beastSummon(e, 'gargoyle', 2); }
        else if (e.atk === 'stone') { e.stone = true; e.cracks = 0; e.stoneT = 3.2; e.lastStoneHp = e.hp; stoneBurst(e.x, e.y, e.z + 1, 8, 0.4); SFX.play('stone'); }
        else if (e.atk === 'swoop') { SFX.play('screech'); SFX.play('wing'); }
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'swoop') {
        const v = 11 * rage, ox = e.x, oy = e.y;
        const bl = moveEntity(e, Math.cos(e.lockA) * v * dt, Math.sin(e.lockA) * v * dt, e.r, 0.33, false);
        if (Math.random() < dt * 30) addP({ k: 'dust', x: e.x, y: e.y, z: floor + 0.1, vx: rand(-1, 1), vy: rand(-1, 1), vz: 0.4, size: 0.1, col: RGB(180, 150, 220), life: 0.4 });
        if (!e.hitDone && dist < 1.3 && P.z - groundUnder(P.x, P.y, 0.1) < 1.2) { e.hitDone = true; hurtPlayer(Math.round(22 * dm), e.x, e.y, { src: e }); P.vx += Math.cos(e.lockA) * 7; P.vy += Math.sin(e.lockA) * 7; }
        if (!arenaOK(e.x, e.y) || bl || Math.hypot(e.x - ox, e.y - oy) < v * dt * 0.3 || e.st > 0.95) {
          if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; }
          e.swoops++;
          if (e.phase2 && e.swoops < 2) { e.st = 0; e.hitDone = false; e.lockA = Math.atan2(P.y - e.y, P.x - e.x); SFX.play('screech', 0.6); }
          else { e.state = 'recover'; e.st = 0; dust(e.x, e.y, floor, 16); SFX.play('land', 0.8); G.shake += 4; }
        }
      } else if (e.atk === 'stone') {
        e.stoneT -= dt;
        if (e.stoneT <= 0) { // she was not broken: bursts out with a gust and a little regained health
          e.stone = false; e.hp = Math.min(e.maxhp, e.hp + e.maxhp * 0.03); e.lastStoneHp = e.hp; stoneBurst(e.x, e.y, e.z + 1, 14, 0.8); SFX.play('screech'); SFX.play('wing');
          if (dist < 5) { P.vx += Math.cos(ang) * 9; P.vy += Math.sin(ang) * 9; }
          e.state = 'recover'; e.st = 0;
        }
      } else if (e.st > 0.5) { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': {
      const rd = (e.atk === 'swoop' ? 1.0 : e.atk === 'stone' ? 0.5 : 0.6) / (e.phase2 ? 1.15 : 1);
      if (e.st >= rd) { e.state = 'chase'; e.st = 0; e.cd = rand(0.5, 1.1) / rage; }
      break;
    }
  }
  if (!(e.state === 'strike' && e.atk === 'swoop')) keepClear(e);
}
// heavy hits / the whip crack her stone skin
function matStoneHit(e, dmg, o) {
  const crack = o.heavy || o.src === 'whip' || o.src === 'finisher' || o.src === 'exec';
  if (!crack) { dmgNum(e.x, e.y, e.z + e.h + 0.3, 'STONE', '#c8c0e0'); sparks(e.x, e.y, e.z + 1.5, 6, RGB(200, 190, 230)); return dmg * 0.2; }
  if (G.t - (e.crackT || -9) < 0.25) return dmg * 0.5;
  e.crackT = G.t; e.cracks = (e.cracks || 0) + 1; SFX.play('stone', 0.7); SFX.play('block', 0.6); G.shake += 3; stoneBurst(e.x, e.y, e.z + 1.6, 8, 0.7);
  dmgNum(e.x, e.y, e.z + e.h + 0.3, 'CRACK ' + e.cracks + '/3', '#ffd060');
  if (e.cracks >= 3) {
    e.stone = false; e.state = 'stagger'; e.stagger = 2.3; e.atk = null; e.st = 0; e.lastStoneHp = e.hp;
    stoneBurst(e.x, e.y, e.z + 1.5, 30, 1.3); spray(e.x, e.y, e.z + 1.8, 0, 0, 1, 70, 5, Math.PI, 'flesh', 1.5); G.slow = 0.35; G.hitstop = 0.14; SFX.play('gib'); SFX.play('roar', 0.6);
    toast('SHELL SHATTERED!', 'Strike now!', '#ffd060', 1.5);
    return dmg * 1.5;
  }
  return dmg * 0.6;
}
// ---- silver burns werewolves; stone skin
function beastDmgIn(e, dmg, o) {
  if (e.d.silverWeak) {
    const silver = o.src === 'pistol' || (o.src === 'sword' && P.wpn && P.wpn.sword === 'rapier');
    if (silver) {
      const m = P.mods && P.mods.silver ? 2.2 : 1.5; dmg *= m;
      dmgNum(e.x, e.y, e.z + e.h + 0.45, 'SILVER!', '#e8f0ff'); sparks(e.x, e.y, e.z + e.h * 0.6, 14, RGB(230, 240, 255));
      for (let i = 0; i < 8; i++) addP({ k: 'dust', x: e.x + rand(-0.3, 0.3), y: e.y + rand(-0.3, 0.3), z: e.z + e.h * rand(0.4, 0.9), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(0.8, 1.6), size: 0.1, col: RGB(220, 220, 240), life: 0.8 });
      SFX.play('fire', 0.6);
      if (e.d.boss) { e.poise = (e.poise || 0) + dmg * 1.2; if (P.mods && P.mods.silver && e.state === 'windup') { e.state = 'recover'; e.st = 0; toast('SILVER BURNS!', 'His attack falters.', '#e8f0ff', 1.1); } }
      else if (e.alive && e.stagger <= 0) { e.stagger = 0.6; e.state = 'stagger'; e.st = 0; }
    }
  }
  if (e.type === 'matriarch' && e.stone) dmg = matStoneHit(e, dmg, o);
  return dmg;
}
// ---- poses layered on the generic enemy visual
function beastVisual(e, v) {
  if (e.dead) return v;
  const t = e.t;
  if (e.type === 'werewolf') {
    if (e.state === 'windup') { const k = clamp(e.st / e.d.windup, 0, 1); v.h *= 1 - 0.14 * k; v.w *= 1 + 0.08 * k; v.lean = 0.25 * k; v.tint = [255, 60, 60, 0.15 + 0.25 * k]; }
    else if (e.state === 'strike') { v.lean = 0.45; v.h *= 1.06; }
    return v;
  }
  if (e.type === 'gargoyle') {
    if (e.statue) { v.tint = [150, 145, 175, 0.7]; v.wave = 0; return v; }
    v.w *= 1 + 0.12 * Math.sin(t * 16); v.h *= 1 - 0.04 * Math.sin(t * 16);
    return v;
  }
  if (e.type === 'alphawolf') {
    if (e.state === 'intro') { if (!e.landed) { v.h *= 1.08; v.lean = -0.2; } else if (e.st > 1.7 && e.st < 2.8) { v.h *= 1.1; v.lean = -0.35; v.tint = [200, 150, 255, 0.2]; } return v; }
    if (e.state === 'frenzy') { v.skew = Math.sin(t * 40) * 0.08; v.h *= 1.08 + 0.04 * Math.sin(t * 30); v.lean = -0.35; v.tint = [255, 20, 40, 0.45]; return v; }
    if (e.state === 'chase') { v.z += Math.abs(Math.sin(e.walk)) * 0.12; v.skew = (v.skew || 0) * 0.5 + Math.sin(e.walk) * 0.07; v.legs = 0; }
    const wu = (AW_WU[e.atk] || 0.6) / (e.phase2 ? 1.3 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
    if (e.state === 'windup') {
      if (e.atk === 'claw') { v.skew = (v.skew || 0) - e.side * 0.18 * k; v.lean = -0.15 * k; v.tint = [255, 40, 50, 0.15 + 0.35 * pulse]; }
      else if (e.atk === 'pounce') { v.h *= 1 - 0.18 * k; v.w *= 1 + 0.1 * k; v.lean = 0.3 * k; v.tint = [255, 90, 40, 0.18 + 0.35 * pulse]; }
      else if (e.atk === 'rend') { v.lean = 0.35 * k; v.h *= 1 - 0.08 * k; v.tint = [255, 220, 90, 0.18 + 0.35 * pulse]; }
      else { v.h *= 1 + 0.1 * k; v.lean = -0.4 * k; v.tint = [190, 120, 255, 0.2 + 0.3 * pulse]; v.glow = 0.3; }
      v.rim = 2.2;
    } else if (e.state === 'strike') {
      if (e.atk === 'claw') { v.skew = (v.skew || 0) + e.side * 0.28; v.w *= 1.12; v.lean = 0.3; }
      else if (e.atk === 'pounce') { v.lean = 0.45; v.h *= 1.08; }
      else if (e.atk === 'rend') { v.lean = 0.55; v.w *= 0.9; v.tint = [255, 200, 90, 0.25]; }
    } else if (e.state === 'redash') { v.lean = 0.3; v.tint = [255, 220, 90, 0.3]; }
    if (e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
    if (e.phase2 && !v.tint) v.tint = [255, 30, 50, 0.14 + 0.1 * Math.sin(t * 6)];
    return v;
  }
  if (e.type === 'matriarch') {
    if (!e.awake || e.state === 'intro' && e.st < 1.6) { const k = e.awake ? e.st / 1.6 : 0; v.tint = [150, 145, 175, 0.85 - 0.5 * k]; v.skew = e.awake ? Math.sin(t * 40) * 0.03 * k : 0; return v; }
    const fl = (e.hov || 0) > 0.3 ? 1 : 0.25, sp = e.phase2 ? 13 : 10;
    v.w *= 1 + 0.07 * Math.sin(t * sp) * fl; v.h *= 1 - 0.03 * Math.sin(t * sp) * fl;
    if (e.stone) { v.tint = [150, 145, 175, 0.75 - 0.15 * (e.cracks || 0)]; v.w = v.w * 0.96; v.skew = (e.cracks || 0) ? Math.sin(t * 50) * 0.02 * e.cracks : 0; return v; }
    if (e.state === 'shatter') { v.skew = Math.sin(t * 40) * 0.06; v.tint = [255, 30, 60, 0.4]; return v; }
    const wu = (MA_WU[e.atk] || 0.7) / (e.phase2 ? 1.25 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
    if (e.state === 'windup') {
      if (e.atk === 'swoop') { v.h *= 1 + 0.06 * k; v.tint = [200, 90, 255, 0.18 + 0.35 * pulse]; }
      else if (e.atk === 'gust') { v.w *= 1 + 0.2 * k; v.tint = [210, 230, 255, 0.15 + 0.3 * pulse]; }
      else if (e.atk === 'toll') { v.tint = [255, 210, 120, 0.15 + 0.35 * pulse]; v.glow = 0.3; }
      else if (e.atk === 'stone') { v.tint = [160, 150, 190, 0.3 + 0.4 * k]; }
      else { v.tint = [255, 230, 200, 0.15 + 0.3 * pulse]; }
      v.rim = 2.2;
    } else if (e.state === 'strike' && e.atk === 'swoop') { v.lean = 0.5; v.w *= 1.1; }
    if (e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
    if (e.phase2 && !v.tint) v.tint = [255, 30, 70, 0.16 + 0.1 * Math.sin(t * 7)];
    return v;
  }
  return v;
}
// rings, eye glows, the hanging bells, the courtyard props
function beastSprites(S, t) {
  const b = G.boss;
  if (b && b.alive && (b.type === 'alphawolf' || b.type === 'matriarch')) {
    for (const R of (b.rings || [])) {
      const n = Math.max(10, Math.round(R.r * 7)); const c = R.col; const tc = c ? [(c) & 255, (c >> 8) & 255, (c >> 16) & 255, 1] : [255, 200, 170, 1];
      for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 0.3, x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; if (isSolid(cellAt(x, y))) continue; S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.15, w: 0.7, h: 0.45, add: true, alpha: 0.6 * (1 - R.r / R.max) + 0.2, lit: false, tint: tc }); }
    }
    if (!b.hidden && b.awake) S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.55, w: 1.5, h: 1.5, add: true, alpha: 0.3 + 0.12 * Math.sin(t * 5), lit: false, tint: b.phase2 ? [255, 30, 70, 1] : b.type === 'alphawolf' ? [255, 200, 60, 1] : [230, 60, 255, 1] });
  }
  for (const pr of (LEVEL.props || [])) {
    if (pr.type === 'bell') { const sw = Math.sin(t * 5) * 0.25 * (pr.swing || 0) + Math.sin(t * 0.8 + pr.x) * 0.02; S.push({ tex: 'p_bell', x: pr.x + Math.cos(pr.a || 0) * sw, y: pr.y + Math.sin(pr.a || 0) * sw, z: pr.z, w: pr.s * 0.68, h: pr.s, skew: sw * 0.6, glow: 0.05 }); if (pr.swing > 0.05) S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z + pr.s * 0.3, w: 2.2, h: 1.8, add: true, alpha: 0.4 * pr.swing, lit: false, tint: [255, 200, 110, 1] }); }
    else if (pr.type === 'fountain') { S.push({ tex: 'p_fountain', x: pr.x, y: pr.y, z: pr.z, w: 1.75, h: 1.7 }); if (Math.random() < 0.5) addP({ k: 'blood', x: pr.x + rand(-0.45, 0.45), y: pr.y + rand(-0.45, 0.45), z: pr.z + rand(0.7, 1.2), vx: 0, vy: 0, vz: -0.5, size: 0.04, col: MAT.flesh[(Math.random() * 3) | 0], life: 0.6, mat: 'flesh' }); }
    else if (pr.type === 'angel') S.push({ tex: 'p_angel', x: pr.x, y: pr.y, z: pr.z, w: 0.72, h: 1.95 });
    else if (pr.type === 'grave') S.push({ tex: 'p_grave', x: pr.x, y: pr.y, z: floorAt(pr.x, pr.y), w: 0.5, h: 0.66 });
  }
}
function beastDeathTick(e) {
  if (e.type === 'alphawolf') { if (e.bossDeath > 2.2 && !e.gushed) { e.gushed = true; spray(e.x, e.y, e.z + 1.6, 0, 0, 1, 120, 6, Math.PI, 'flesh', 1.8); gibs(e.x, e.y, e.z + 1.4, 12, 'flesh', 1.4); } }
  else if (e.type === 'matriarch') { if (e.bossDeath > 2.2 && !e.gushed) { e.gushed = true; stoneBurst(e.x, e.y, e.z + 1.5, 45, 1.5); spray(e.x, e.y, e.z + 1.6, 0, 0, 1, 100, 6, Math.PI, 'flesh', 1.7); e.rings = []; } else if (Math.random() < 0.2) stoneBurst(e.x, e.y, e.z + rand(0.5, 2.5), 1, 0.6); if (e.z > floorAt(e.x, e.y) + 0.02) e.z = Math.max(floorAt(e.x, e.y), e.z - 0.04); }
}
