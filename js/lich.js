'use strict';
// ===== M7: THE LICH KING (stage 10, the final boss) =====
// Sits on his throne until you walk the carpet. Phase 1: SOUL VOLLEY (fans of soul-skulls: parry them back), BONE SPEARS
// (lines of bone erupt toward you), DEATH NOVA (jumpable rings), ROYAL GUARD (two of his guard rise), BLINK.
// 66%: THE PHYLACTERY - he returns to the throne, untouchable, while three phylactery crystals feed him (green beams show
// which). Break all three -> THE CROWN CRACKS: a long stagger, x1.5 damage. Then SOUL STORM spirals join his kit.
// 33%: THE UNYIELDING DEAD - the sky tears open, void shades join, he teleports constantly and swings the REAPER SWEEP
// (jump or roll it), and grave hands grab from marked circles. Death: the crown falls, a storm of freed souls.
const LK_WU = { volley: 0.6, spears: 0.75, nova: 0.8, guards: 0.9, blink: 0.3, storm: 0.7, reap: 0.95, hands: 0.7 };
BOSSREG.lich = {
  gate: 'The throne room. He is sitting there, watching you come.',
  setup(b) { b.hidden = false; b.r = 0.85; b.awake = false; b.x = 25.5; b.y = 1.95; b.z = floorAt(25.5, 1.95); b.state = 'dormant'; b.intangible = true; },
  intro(b) {
    b.hidden = false; b.awake = true; b.state = 'intro'; b.st = 0; b.poise = 0; b.lastAtk = null; b.rings = []; b.intangible = true; b.x = 25.5; b.y = 1.95; b.z = floorAt(25.5, 1.95);
    SFX.play('toll'); SFX.play('ghost'); G.shake += 2; if (SFX.mus) SFX.mus.boss = true; SFX.bossKey = 'lich';
    toast('He rises from the throne.', '"Ten of my lieutenants. And still you came."', '#a0ffb0', 3.4);
  },
  update: updateLich,
};
function lkBolt(e, a, sp, dmg) {
  const ez = e.z + e.h * 0.72, dist = Math.hypot(P.x - e.x, P.y - e.y);
  G.projectiles.push({ type: 'fireball', x: e.x + Math.cos(a) * 0.7, y: e.y + Math.sin(a) * 0.7, z: ez, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: ((P.z + 1.0) - ez) / Math.max(0.5, dist) * sp, dmg, owner: e, life: 4.5, spr: soulBoltSpr });
}
function lkBlink(e, far, to) {
  for (let i = 0; i < 26; i++) addP({ k: 'ecto', x: e.x + rand(-0.5, 0.5), y: e.y + rand(-0.5, 0.5), z: e.z + rand(0, 3), vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(0.5, 2), size: rand(0.06, 0.12), col: Math.random() < 0.5 ? RGB(120, 255, 150) : RGB(180, 80, 255), life: 0.8 });
  let best = to || null;
  if (!best) for (let k = 0; k < 24; k++) { const x = rand(14.5, 35.5), y = rand(2.4, 9.4), d = Math.hypot(x - P.x, y - P.y); if (!arenaOK(x, y) || d < 3.5 || d > (far ? 10 : 7)) continue; best = [x, y]; break; }
  if (best) { e.x = best[0]; e.y = best[1]; e.z = floorAt(e.x, e.y); }
  SFX.play('ghost', 0.8); e.blinkFx = 0.4;
  for (let i = 0; i < 20; i++) addP({ k: 'ecto', x: e.x + rand(-0.4, 0.4), y: e.y + rand(-0.4, 0.4), z: e.z + rand(0, 3), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(0.3, 1.5), size: rand(0.06, 0.1), col: RGB(120, 255, 150), life: 0.7 });
}
function lkPick(e, dist) {
  const ph = e.ph || 1, guards = G.enemies.filter(o => o.summoned && o.alive && o.type === 'royalguard').length, W = [];
  if (dist < 3) W.push(['blink', 2.5], ['nova', 2], ['reap', ph >= 3 ? 3 : 0], ['spears', 1]);
  else W.push(['volley', 3], ['spears', 2.4], ['nova', 1.3], ['guards', guards < 2 ? (ph >= 2 ? 1.0 : 1.3) : 0], ['blink', 0.6], ['storm', ph >= 2 ? 1.8 : 0], ['hands', ph >= 3 ? 2 : 0], ['reap', ph >= 3 && dist < 5.5 ? 2 : 0]);
  return beastPickW(W, e.lastAtk);
}
function lkStartAtk(e, atk, ang) {
  e.atk = atk; e.lastAtk = atk; e.state = 'windup'; e.st = 0; e.lockA = ang; e.shots = 0; e.marks = null; e.hitDone = false;
  if (atk === 'volley' || atk === 'storm') { SFX.play('ghost', 0.7); SFX.play('glint', 0.5); }
  else if (atk === 'guards') SFX.play('toll', 0.7);
  else if (atk === 'reap') { SFX.play('windup'); SFX.play('screech', 0.5); }
  else if (atk === 'hands') { SFX.play('ghost', 0.5); e.marks = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + rand(-0.3, 0.3), r = i === 0 ? 0 : rand(0.9, 2.6); const x = P.x + P.vx * 0.3 + Math.cos(a) * r, y = P.y + P.vy * 0.3 + Math.sin(a) * r; if (arenaOK(x, y)) e.marks.push([x, y]); } }
  else SFX.play('roar', 0.35);
}
const LK_PHYL = [[17.5, 4.0], [33.5, 4.0], [25.5, 8.6]];
function updateLich(e, dt) {
  const d = e.d; const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!e.awake || e.hidden) return;
  e.st += dt; e.cd -= dt; e.poise = Math.max(0, (e.poise || 0) - dt * 20); e.blinkFx = Math.max(0, (e.blinkFx || 0) - dt);
  e.ph = e.ph || 1;
  const ph = e.ph, rage = ph === 3 ? 1.3 : ph === 2 ? 1.12 : 1, floor = floorAt(e.x, e.y), dm = ph === 3 ? 1.18 : ph === 2 ? 1.08 : 1;
  beastRings(e, dt);
  if (e.state !== 'intro' && e.state !== 'throne') e.z = floor + 0.2 + Math.sin(e.t * 2) * 0.08;   // he floats
  if (Math.abs(e.kbx) + Math.abs(e.kby) > 0.01) { moveEntity(e, e.kbx * dt, e.kby * dt, e.r, 0.33, false); e.kbx *= Math.pow(0.002, dt); e.kby *= Math.pow(0.002, dt); }
  if (Math.random() < dt * 6) addP({ k: 'ecto', x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: e.z + rand(0, 0.6), vx: 0, vy: 0, vz: rand(0.2, 0.7), size: 0.08, col: ph === 3 ? RGB(180, 80, 255) : RGB(110, 255, 140), life: 0.9 });
  if (e.stagger > 0 && e.state !== 'crack') { e.stagger -= dt; e.state = 'stagger'; if (Math.random() < dt * 8) spray(e.x, e.y, e.z + 2.3, 0, 0, 1, 3, 2, 0.8, 'bone'); if (e.stagger <= 0) { e.state = 'chase'; e.st = 0; e.cd = 0.3; lkBlink(e, true); } return; }
  // phase gates
  if (ph === 1 && e.hp < e.maxhp * 0.66 && e.state !== 'intro') {
    e.ph = 2; e.phase2 = true; e.state = 'throne'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true; e.rings = []; e.phyls = [];
    lkBlink(e, false, [25.5, 1.95]);
    SFX.ev('lich_phase2', 1, ['toll', 'ghost']); SFX.play('toll'); SFX.play('ghost'); G.shake += 8; G.flashG = 0.6;
    toast('THE PHYLACTERY', '"You cannot kill what is not here." Break the crystals!', '#a0ffb0', 4);
    for (const [x, y] of LK_PHYL) { const c = makeEnemy('phyl', x, y); c.awake = true; c.summoned = true; c.frozen = true; c.z = floorAt(x, y) + 0.8; c.hp = c.maxhp = Math.round(230 * (1 + 0.1 * abyssDepth())); c.flip = false; G.enemies.push(c); e.phyls.push(c); dust(x, y, floorAt(x, y), 14); for (let i = 0; i < 20; i++) addP({ k: 'ecto', x, y, z: c.z + 0.5, vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(0, 3), size: 0.08, col: RGB(120, 255, 160), life: 0.7 }); }
  }
  if (ph === 2 && e.hp < e.maxhp * 0.33 && !['throne', 'crack', 'ascend'].includes(e.state)) {
    e.ph = 3; e.state = 'ascend'; e.st = 0; e.atk = null; e.poise = 0; e.intangible = true; e.rings = [];
    SFX.ev('lich_phase3', 1, ['screech', 'toll']); SFX.play('screech'); SFX.play('toll'); G.shake += 12; G.flashG = 0.9;
    if (Engine.tex.sky_void2) Engine.tex.sky = Engine.tex.sky_void2;
    HAZE[0] = 40; HAZE[1] = 120; HAZE[2] = 80;
    toast('THE UNYIELDING DEAD', '"I have died before. I did not care for it."', '#c890ff', 4);
  }
  switch (e.state) {
    case 'intro': {
      const k = clamp(e.st / 1.6, 0, 1); e.z = floor + 0.2 * k;
      if (Math.random() < 0.6) addP({ k: 'ecto', x: e.x + rand(-0.8, 0.8), y: e.y + rand(-0.5, 0.5), z: floor + rand(0, 3), vx: 0, vy: 0, vz: rand(1, 3), size: 0.09, col: Math.random() < 0.5 ? RGB(110, 255, 140) : RGB(180, 80, 255), life: 0.8 });
      if (e.st > 1.6 && !e.sang) { e.sang = true; SFX.ev('intro_lich', 1, ['roar','howl','screech','toll','ghost']); SFX.play('screech'); SFX.play('toll'); G.shake += 8; G.flashG = 0.5; G.bigText = { img: null, t1: d.title, t2: 'Keeper of the Black Reliquary', t: 0, dur: 3.2 }; e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 6, dmg: 10, col: RGB(120, 255, 150) }); }
      if (e.st > 3.4) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.4; lkBlink(e, false, [25.5, 4.2]); }
      break;
    }
    case 'throne': { // untouchable on the throne while the phylacteries live: soul rain + volleys
      e.x = 25.5; e.y = 1.95; e.z = floorAt(25.5, 1.95) + 0.05;
      const alive = (e.phyls || []).filter(c => c.alive);
      e.rainT = (e.rainT || 1.2) - dt; e.volT = (e.volT || 2.2) - dt;
      if (e.rainT <= 0) { e.rainT = 2.4; for (let i = 0; i < 6; i++) { const a = rand(0, TAU), r = i === 0 ? 0 : rand(0.8, 2.6); const x = P.x + P.vx * 0.3 + Math.cos(a) * r, y = P.y + P.vy * 0.3 + Math.sin(a) * r; if (arenaOK(x, y)) G.hazards.push({ x, y, t: -0.9 - i * 0.05, dmg: Math.round(13 * dm), tex: 'gflame' + (i % 4), tw: 0.6, th: 1.2, col: [120, 255, 150, 1] }); } SFX.play('ghost', 0.5); }
      if (e.volT <= 0 && losTo(e.x, e.y, P.x, P.y)) { e.volT = 3.2; for (let i = 0; i < 5; i++) lkBolt(e, ang + (i - 2) * 0.2, 6.4, Math.round(11 * dm)); SFX.play('fire', 0.6); }
      if (e.st > 1.0 && !alive.length) {
        e.state = 'crack'; e.st = 0; e.intangible = false; e.stagger = 0;
        SFX.play('clink'); SFX.play('screech'); SFX.play('heavy'); G.shake += 14; G.flashG = 0.8; G.hitstop = 0.15; G.slow = 0.6;
        toast('THE CROWN CRACKS!', 'He is open - make it count!', '#ffd060', 2.4);
        lkBlink(e, false, [25.5, 4.4]);
        for (let i = 0; i < 40; i++) addP({ k: 'spark', x: e.x, y: e.y, z: e.z + 3, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(0, 5), size: 0.06, col: RGB(255, 220, 120), life: 0.6 });
      }
      break;
    }
    case 'crack': { e.z = floor + 0.05; e.poise = -1e4; if (Math.random() < dt * 10) spray(e.x, e.y, e.z + 2.6, 0, 0, 1, 4, 2, 0.8, 'bone'); if (e.st > 3.6) { e.state = 'chase'; e.st = 0; e.cd = 0.3; lkBlink(e, true); } break; }
    case 'ascend': {
      if (e.st > 0.8 && !e.shaded) { e.shaded = true; beastSummon(e, 'voidshade', 2); m7VRing(e.x, e.y, 9, Math.round(14 * dm), RGB(180, 80, 255), 6.5, e); G.shake += 10; SFX.play('heavy'); }
      if (e.st > 2.4) { e.intangible = false; e.state = 'chase'; e.st = 0; e.cd = 0.2; lkBlink(e, true); }
      break;
    }
    case 'chase': {
      faceP(e, dx, dy);
      const sp = d.speed * 0.8 * rage * (RUN.cfg.spd || 1), want = 5.5;
      if (Math.random() < dt * 0.8) e.side *= -1;
      const tang = ang + Math.PI / 2 * e.side;
      let mx = Math.cos(ang) * (dist - want) * 0.6 + Math.cos(tang), my = Math.sin(ang) * (dist - want) * 0.6 + Math.sin(tang); const l = Math.hypot(mx, my);
      if (l > 0.05) { const ox = e.x, oy = e.y; moveEntity(e, mx / l * sp * dt, my / l * sp * dt, e.r, 0.33, false); if (!arenaOK(e.x, e.y)) { e.x = ox; e.y = oy; e.side *= -1; } }
      if (e.cd <= 0) { if (losTo(e.x, e.y, P.x, P.y)) lkStartAtk(e, lkPick(e, dist), ang); else { lkBlink(e); e.cd = 0.5; } }
      break;
    }
    case 'windup': {
      faceP(e, dx, dy);
      const wu = LK_WU[e.atk] / rage, k = Math.min(1, e.st / wu);
      e.lockA = e.lockA + angDiff(ang, e.lockA) * Math.min(1, dt * (k < 0.75 ? 6 : 0.6));
      for (let i = 0; i < 3; i++) {
        let x, y, col;
        if (e.atk === 'spears') { const o = ph >= 2 ? [-0.35, 0, 0.35][i] : 0, r = rand(0.8, 9) * Math.min(1, k * 1.4); x = e.x + Math.cos(e.lockA + o) * r; y = e.y + Math.sin(e.lockA + o) * r; col = RGB(230, 255, 220); }
        else if (e.atk === 'reap') { const a = e.lockA + rand(-1.6, 1.6), r = rand(1, 5.5); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(200, 90, 255); }
        else if (e.atk === 'hands' && e.marks && e.marks.length) { const m = e.marks[(Math.random() * e.marks.length) | 0], a = rand(0, TAU), r = rand(0, 0.6); x = m[0] + Math.cos(a) * r; y = m[1] + Math.sin(a) * r; col = RGB(110, 255, 140); }
        else if (e.atk === 'nova') { const a = rand(0, TAU), r = rand(0.5, 3); x = e.x + Math.cos(a) * r; y = e.y + Math.sin(a) * r; col = RGB(120, 255, 150); }
        else { x = e.x + rand(-0.6, 0.6); y = e.y + rand(-0.6, 0.6); col = RGB(180, 80, 255); }
        addP({ k: 'spark', x, y, z: floorAt(x, y) + 0.03, vx: 0, vy: 0, vz: 0.5 + k, size: 0.04 + 0.04 * k, col, life: 0.18 });
      }
      if (e.atk === 'volley' || e.atk === 'storm') for (let i = 0; i < 2; i++) addP({ k: 'ecto', x: e.x + rand(-0.4, 0.4), y: e.y + rand(-0.4, 0.4), z: e.z + 2.4 + rand(-0.2, 0.2), vx: 0, vy: 0, vz: 0.3, size: 0.06 + 0.05 * k, col: RGB(120, 255, 150), life: 0.25 });
      if (e.st >= wu) {
        e.state = 'strike'; e.st = 0;
        if (e.atk === 'blink') { lkBlink(e, true); e.state = 'recover'; }
        else if (e.atk === 'spears') {
          const lines = ph >= 2 ? [-0.35, 0, 0.35] : [0];
          for (const o of lines) for (let i = 0; i < 12; i++) { const r = 1.0 + i * 0.78, hx = e.x + Math.cos(e.lockA + o) * r, hy = e.y + Math.sin(e.lockA + o) * r; if (!arenaOK(hx, hy)) break; G.hazards.push({ x: hx, y: hy, t: -(0.35 + i * 0.07), dmg: Math.round(16 * dm), col: [140, 255, 170, 1] }); }
          SFX.play('rattle'); e.state = 'recover';
        } else if (e.atk === 'nova') { e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 8, dmg: Math.round(13 * dm), sp: 6.5, col: RGB(120, 255, 150) }); if (ph >= 2) e.ring2 = 0.5; SFX.play('heavy'); G.shake += 6; }
        else if (e.atk === 'guards') { beastSummon(e, 'royalguard', 2); SFX.play('rattle'); G.shake += 4; e.state = 'recover'; }
        else if (e.atk === 'hands') { for (const [x, y] of e.marks || []) G.hazards.push({ x, y, t: -0.1 - Math.random() * 0.15, dmg: Math.round(15 * dm), tex: 'p_hand', tw: 0.55, th: 0.72, col: [90, 255, 130, 1] }); SFX.play('ghost', 0.6); e.state = 'recover'; }
        else if (e.atk === 'reap') { // the reaper sweep: a huge arc - jump or roll it
          SFX.play('swingH'); SFX.play('heavy', 0.6); G.shake += 8;
          bossSlash(e, Math.round(26 * dm), 1.7, 5.8, { jumpable: true, unblockable: false });
          for (let i = 0; i < 24; i++) { const a = e.lockA + (i / 23 - 0.5) * 3.4; for (const r of [2.2, 4.2]) addP({ k: 'ecto', x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, z: e.z + 1.0, vx: Math.cos(a + Math.PI / 2) * 3, vy: Math.sin(a + Math.PI / 2) * 3, vz: 0, size: 0.09, col: i % 2 ? RGB(180, 80, 255) : RGB(110, 255, 140), life: 0.3 }); }
          e.state = 'recover';
        }
      }
      break;
    }
    case 'strike': {
      if (e.atk === 'volley') {
        const n = ph >= 3 ? 7 : 5, waves = ph >= 2 ? 3 : 2, gap = 0.3 / rage;
        if (e.shots < waves && e.st >= e.shots * gap) { for (let i = 0; i < n; i++) lkBolt(e, ang + (i - (n - 1) / 2) * 0.19 + (e.shots % 2 ? 0.09 : 0), 7.0 * rage, Math.round(13 * dm)); SFX.play('fire', 0.7); e.shots++; }
        if (e.shots >= waves && e.st > waves * gap + 0.2) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'storm') { // a spiral of souls
        const N = 22, dur = 1.6;
        while (e.shots < N && e.st >= e.shots / N * dur) { const a = e.lockA + e.shots * 0.55; lkBolt(e, a, 5.2, Math.round(10 * dm)); e.shots++; if (e.shots % 3 === 0) SFX.play('fire', 0.4); }
        if (e.shots >= N && e.st > dur + 0.2) { e.state = 'recover'; e.st = 0; }
      } else if (e.atk === 'nova') {
        if (e.ring2 > 0) { e.ring2 -= dt; if (e.ring2 <= 0) { e.rings.push({ x: e.x, y: e.y, r: 0.6, max: 8, dmg: Math.round(13 * dm), sp: 6.5, col: RGB(180, 80, 255) }); SFX.play('heavy', 0.6); } }
        if (e.st > 0.8) { e.state = 'recover'; e.st = 0; }
      } else { e.state = 'recover'; e.st = 0; }
      break;
    }
    case 'recover': {
      if (e.st >= 0.55 / rage) { e.state = 'chase'; e.st = 0; e.cd = rand(0.3, 0.8) / rage; if (Math.random() < (ph >= 3 ? 0.45 : 0.25)) lkBlink(e); }
      break;
    }
  }
}
BOSSDMG.lich = function (e, dmg, o) { if (e.state === 'crack') return dmg * 1.5; if (e.stagger > 0) return dmg * 1.25; return dmg; };
BOSSVIS.lich = function (e, v) {
  const t = e.t;
  if (e.dead) { const k = clamp((e.bossDeath || 0) / 2.4, 0, 1); v.tint = [120 + 100 * k, 255, 150 + 100 * k, 0.3 + 0.6 * k]; v.h *= 1 - 0.1 * k; v.skew = Math.sin(t * 34) * 0.05 * (1 - k); v.glow = 0.5 * k; return v; }
  v.wave = 0.025; v.waveF = 4; v.waveP = t * 2.5;
  if (e.state === 'dormant') { v.h *= 0.86; v.tint = [80, 90, 120, 0.25]; return v; }
  if (e.state === 'intro') { const k = clamp(e.st / 1.6, 0, 1); v.h *= 0.86 + 0.14 * k; v.tint = [120, 255, 150, 0.4 * (1 - k) + 0.1]; v.glow = 0.3; return v; }
  if (e.blinkFx > 0) v.alpha = 1 - e.blinkFx * 1.5;
  if (e.state === 'throne') { v.h *= 0.88; v.alpha = 0.55 + 0.15 * Math.sin(t * 5); v.tint = [120, 255, 160, 0.35]; v.glow = 0.4; return v; }
  if (e.state === 'crack') { v.skew = Math.sin(t * 9) * 0.14; v.h *= 0.88; v.tint = [255, 220, 80, 0.3 + 0.2 * Math.sin(t * 14)]; return v; }
  if (e.state === 'ascend') { v.tint = [180, 80, 255, 0.5]; v.skew = Math.sin(t * 30) * 0.06; v.glow = 0.6; v.h *= 1 + 0.05 * Math.sin(t * 20); return v; }
  const wu = (LK_WU[e.atk] || 0.7) / ((e.ph || 1) === 3 ? 1.3 : (e.ph || 1) === 2 ? 1.12 : 1), k = e.state === 'windup' ? clamp(e.st / wu, 0, 1) : 0, pulse = (0.5 + 0.5 * Math.sin(t * 36)) * k;
  if (e.state === 'windup') { v.h *= 1 + 0.06 * k; v.lean = -0.18 * k; v.tint = e.atk === 'reap' ? [200, 90, 255, 0.2 + 0.4 * pulse] : e.atk === 'spears' ? [230, 255, 220, 0.15 + 0.35 * pulse] : [120, 255, 150, 0.15 + 0.35 * pulse]; v.glow = 0.3 * k; v.rim = 2.4; }
  if (e.stagger > 0) { v.skew = Math.sin(t * 10) * 0.12; v.h *= 0.92; v.tint = [255, 220, 80, 0.25 + 0.2 * Math.sin(t * 14)]; }
  if ((e.ph || 1) === 3 && !v.tint) v.tint = [180, 80, 255, 0.14 + 0.08 * Math.sin(t * 6)];
  return v;
};
BOSSSPR.lich = function (S, t) {
  const b = G.boss; if (!b || b.type !== 'lich' || !b.alive || b.hidden) return;
  S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.55, w: 2.4, h: 3.2, add: true, alpha: 0.22 + 0.08 * Math.sin(t * 4), lit: false, tint: (b.ph || 1) === 3 ? [180, 80, 255, 1] : [110, 255, 140, 1] });
  S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.93, w: 0.9, h: 0.55, add: true, alpha: 0.4 + 0.2 * Math.sin(t * 7), lit: false, tint: [255, 220, 120, 1] }); // the crown
  if (b.state === 'throne' && b.phyls) for (const c of b.phyls) { // soul-beams from each living crystal to him
    if (!c.alive) continue; const n = 16, x0 = c.x, y0 = c.y, z0 = c.z + 0.6, x1 = b.x, y1 = b.y, z1 = b.z + 2.0;
    for (let i = 1; i < n; i++) { const k = i / n; S.push({ tex: 'glow_w', x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, z: z0 + (z1 - z0) * k + Math.sin(t * 18 + i) * 0.06 - 0.2, w: 0.36, h: 0.36, add: true, alpha: 0.65, lit: false, tint: i % 3 ? [110, 255, 150, 1] : [190, 110, 255, 1] }); }
    S.push({ tex: 'glow_w', x: c.x, y: c.y, z: c.z, w: 1.6, h: 1.6, add: true, alpha: 0.4 + 0.15 * Math.sin(t * 9), lit: false, tint: [110, 255, 150, 1] });
  }
  if (b.state === 'windup' && b.atk === 'hands' && b.marks) for (const [x, y] of b.marks) S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.15, w: 1.4, h: 0.5, add: true, alpha: 0.4 + 0.2 * Math.sin(t * 30), lit: false, tint: [110, 255, 140, 1] });
  if (b.state === 'windup' && b.atk === 'reap') { const k = clamp(b.st / (LK_WU.reap / 1.3), 0, 1); for (let i = 0; i < 18; i++) { const a = b.lockA + (i / 17 - 0.5) * 3.4, r = 1.5 + 4 * k; S.push({ tex: 'glow_w', x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, z: floorAt(b.x, b.y) - 0.12, w: 0.8, h: 0.3, add: true, alpha: 0.3 + 0.3 * k, lit: false, tint: [200, 90, 255, 1] }); } }
};
BOSSDEATH.lich = function (e) {
  for (let i = 0; i < 2; i++) addP({ k: 'ecto', x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: e.z + rand(0.3, 3), vx: rand(-0.7, 0.7), vy: rand(-0.7, 0.7), vz: rand(1.5, 4.5), size: rand(0.06, 0.13), col: Math.random() < 0.5 ? RGB(110, 255, 150) : Math.random() < 0.5 ? RGB(190, 100, 255) : RGB(240, 240, 255), life: 1.3 });
  if (e.bossDeath > 0.6 && !e.crownOff) { e.crownOff = true; addP({ k: 'piece', tex: 'ic_lichring', sub: [0, 0, 1, 1], x: e.x, y: e.y, z: e.z + e.h * 0.95, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: 4, rot: 0, vr: rand(-8, 8), w: 0.5, h: 0.45, life: 99, rest: false, mat: 'bone', bleed: 0 }); SFX.play('clink'); toast('THE CROWN FALLS', '', '#ffe080', 2); }
  if (Math.random() < 0.08) { G.flashG = Math.max(G.flashG || 0, 0.3); SFX.play('ghost', 0.4); }
  if (e.bossDeath > 2.2 && !e.gushed) {
    e.gushed = true; e.rings = [];
    for (const o of G.enemies) if (o.alive && o !== e && (o.summoned || o.type === 'phyl')) damageEnemy(o, 9999, { src: 'sword', heavy: true });
    for (let i = 0; i < 140; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + 1.6, vx: rand(-7, 7), vy: rand(-7, 7), vz: rand(1, 8), size: rand(0.07, 0.16), col: Math.random() < 0.5 ? RGB(110, 255, 150) : RGB(190, 110, 255), life: 1.8 });
    spray(e.x, e.y, e.z + 2, 0, 0, 1, 120, 6, Math.PI, 'flesh', 1.8); gibs(e.x, e.y, e.z + 1.8, 18, 'bone', 1.6); G.flashG = 1; G.shake += 10;
    if (Engine.tex.sky_void) Engine.tex.sky = Engine.tex.sky_void; HAZE[0] = 70; HAZE[1] = 30; HAZE[2] = 120;
  }
};
