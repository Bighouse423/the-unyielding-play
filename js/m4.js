'use strict';
// ===== M4: new weapons (Crimson-Edged Longsword, Black-Gold Skull Blade, Enchanted Blood Whip), 12 new relics,
// crossbow focus (free from the start, favoured in early picks, heavier fire/reload, bolt impacts + stuck bolts),
// and secret-wall tells (drafts of dust, a whisper when close, Dowsing Skull hum). =====
SWSPR.crimson = ['vm_sword_crimson', 'vm_sword_crimson_glow']; SWSPR.skull = ['vm_sword_skull', 'vm_sword_skull_glow'];
SWTRAIL.crimson = ['#ff1840', '#ffd0d8']; SWTRAIL.skull = ['#f0b030', '#fff0c0'];
const M4W = [
  { id: 'crimsonsword', kind: 'WEAPON', r: 'epic', name: 'CRIMSON-EDGED LONGSWORD', icon: 'ic_crimsonsword', desc: 'Hits BLEED. Heavy strikes burst in a BLOOD NOVA: hits every foe nearby and heals you 4 per foe.', ok: () => P.wpn.sword !== 'crimson', take() { P.wpn.sword = 'crimson'; } },
  { id: 'skullblade', kind: 'WEAPON', r: 'epic', name: 'BLACK-GOLD SKULL BLADE', icon: 'ic_skullblade', desc: '+40% damage, 15% slower. Heavy strikes EXECUTE foes under 30% HP (they drop shards). Bosses take extra posture damage.', ok: () => P.wpn.sword !== 'skull', take() { P.wpn.sword = 'skull'; } },
  { id: 'bloodwhip', kind: 'WEAPON', r: 'epic', name: 'ENCHANTED BLOOD WHIP', icon: 'ic_bloodwhip', desc: 'Lashes drink 2 HP, make foes BLEED and DRAG them to you. +25% damage to bleeding foes.', ok: () => P.wpn.whip !== 'blood', take() { P.wpn.whip = 'blood'; } },
];
const XB = () => P.wpn.ranged === 'crossbow';
const M4R = [
  { id: 'silverbolts', r: 'rare', name: 'SILVER BOLTS', desc: 'Ranged hits BLEED and deal x2 to staggered foes. Crossbow: bolts burst in silver shrapnel.', syn: { name: 'SILVER STORM', has: XB }, take() { P.mods.silver = 1; } },
  { id: 'repeater', r: 'rare', name: 'REPEATING MECHANISM', desc: 'Every ranged shot fires a free second shot. Crossbow reloads 30% faster.', syn: { name: 'BOLT THROWER', has: XB }, take() { P.mods.repeater = 1; } },
  { id: 'martyrcup', r: 'common', name: "MARTYR'S CHALICE", desc: '+10 max health. Every new stage heals 30% of your max health.', take() { P.mods.martyr = 1; P.maxhp += 10; P.hp += 10; } },
  { id: 'thornmail', r: 'common', name: 'THORNED MAIL', desc: 'Foes that hit you (or your shield) take 15 damage and BLEED.', take() { P.mods.thorns = 1; } },
  { id: 'lastrites', r: 'legendary', name: 'LAST RITES', desc: 'Once per run, a killing blow leaves you at 30 HP with 2s of holy invulnerability.', take() { P.mods.rites = 1; } },
  { id: 'headsman', r: 'rare', name: "HEADSMAN'S HOOD", desc: 'Foes under 15% health die to any hit (not bosses). Heads roll.', take() { P.mods.headsman = 1; } },
  { id: 'soulsiphon', r: 'common', name: 'SOUL SIPHON', desc: 'Every kill restores 5 mana.', take() { P.mods.siphon = 1; } },
  { id: 'moonrose', r: 'common', name: 'MOONLIT ROSE', desc: 'Blood roses heal 75. 8% of kills drop a rose.', take() { P.mods.moonrose = 1; } },
  { id: 'dowsing', r: 'common', name: 'DOWSING SKULL', desc: 'Hidden walls hum and glow when you are near. Each secret found gives +10 shards.', take() { P.mods.dowse = 1; } },
  { id: 'dreadhorn', r: 'rare', name: 'DREAD HORN', desc: 'Parries blast a war horn: foes within 4m are stunned for 1.5s.', take() { P.mods.horn = 1; } },
  { id: 'gildedtooth', r: 'common', name: 'GILDED TOOTH', desc: 'Elites and bosses drop double Reliquary Shards.', take() { P.mods.tooth = 1; } },
  { id: 'berserk', r: 'rare', name: "BERSERKER'S BRAND", desc: 'Below 40% health: +40% damage and 10% faster.', take() { P.mods.berserk = 1; } },
];
for (const r of M4R) { r.kind = 'RELIC'; r.icon = 'ic_' + r.id; const k = { silverbolts: 'silver', repeater: 'repeater', martyrcup: 'martyr', thornmail: 'thorns', lastrites: 'rites', headsman: 'headsman', soulsiphon: 'siphon', moonrose: 'moonrose', dowsing: 'dowse', dreadhorn: 'horn', gildedtooth: 'tooth', berserk: 'berserk' }[r.id]; r.ok = () => !P.mods[k]; }
UPG.push(...M4W, ...M4R);
// ---- altar: new unlocks + loadouts; the crossbow is free from the start ----
if (typeof ALTAR !== 'undefined') {
  LOCKED.delete('crossbow');
  const add = [
    { tab: 0, id: 'crimsonsword', cost: 55 }, { tab: 0, id: 'skullblade', cost: 65 }, { tab: 0, id: 'bloodwhip', cost: 55 },
    { tab: 1, id: 'repeater', cost: 40 }, { tab: 1, id: 'headsman', cost: 40 }, { tab: 1, id: 'dreadhorn', cost: 40 }, { tab: 1, id: 'lastrites', cost: 60 },
    { tab: 2, id: 'ld_crimson', slot: 'sword', val: 'crimson', need: 'crimsonsword', cost: 50, name: 'START: CRIMSON LONGSWORD', icon: 'ic_crimsonsword' },
    { tab: 2, id: 'ld_skull', slot: 'sword', val: 'skull', need: 'skullblade', cost: 55, name: 'START: SKULL BLADE', icon: 'ic_skullblade' },
    { tab: 2, id: 'ld_blood', slot: 'whip', val: 'blood', need: 'bloodwhip', cost: 50, name: 'START: BLOOD WHIP', icon: 'ic_bloodwhip' },
  ];
  for (const it of add) { const at = ALTAR.items.findIndex(q => q.tab > it.tab); ALTAR.items.splice(at < 0 ? ALTAR.items.length : at, 0, it); if (it.tab <= 1) LOCKED.add(it.id); }
  const xb = ALTAR.items.find(q => q.id === 'ld_xbow'); if (xb) xb.cost = 40;
}
// ---- crossbow shows up early ----
const _rollChoices = rollChoices;
rollChoices = function (mini) {
  const out = _rollChoices(mini); if (mini) return out;
  const xb = UPG.find(u => u.id === 'crossbow');
  if (RUN.stage <= 3 && xb.ok() && isUnlocked('crossbow') && !out.includes(xb) && Math.random() < (RUN.stage === 1 ? 1 : 0.55)) {
    let i = out.findIndex((u, k) => u.kind === 'WEAPON' && k > 0); if (i < 0) i = out.length - 1; if (out.length < 3) out.push(xb); else out[i] = xb;
  }
  return out;
};
// ---- damage in / on hit / on kill / hurt hooks ----
const _dmgIn = rogueDmgIn;
rogueDmgIn = function (e, dmg, o) {
  dmg = _dmgIn(e, dmg, o);
  if (o.dot) return dmg;
  if (P.mods.berserk && P.hp < P.maxhp * 0.4) dmg *= 1.4;
  if (P.wpn.whip === 'blood' && e.bleedT > 0) dmg *= 1.25;
  if (P.mods.silver && o.src === 'pistol' && e.stagger > 0) { dmg *= 2; dmgNum(e.x, e.y, e.z + e.h + 0.6, 'x2', '#e0e8ff'); }
  if (P.wpn.sword === 'skull' && e.d.boss && o.heavy && (o.src === 'sword')) e.poise = (e.poise || 0) + dmg * 0.25;
  return dmg;
};
function addBleed(e, max) { e.bleed = Math.min(max || 3, (e.bleedT > 0 ? e.bleed || 0 : 0) + 1); e.bleedT = 4; e.bleedTick = e.bleedTick || 0; dmgNum(e.x, e.y, e.z + e.h + 0.35, 'BLEED ' + e.bleed, '#ff3050'); }
const _onHit = rogueOnHit;
rogueOnHit = function (e, o, dmg) {
  _onHit(e, o, dmg);
  if (!e.alive || o.dot) return;
  const sword = o.src === 'sword' || o.src === 'finisher';
  if (sword && P.wpn.sword === 'crimson') {
    addBleed(e, 3); spray(e.x, e.y, e.z + e.h * 0.6, rand(-1, 1), rand(-1, 1), 0.6, 14, 3, 0.8, e.d.mat);
    if (o.heavy && G.t - (P.novaT || -9) > 0.3) {
      P.novaT = G.t; let n = 0;
      for (const q of G.enemies) if (q !== e && q.alive && !q.hidden && Math.hypot(q.x - e.x, q.y - e.y) < 2.2) { n++; damageEnemy(q, Math.max(8, (dmg || 20) * 0.5), { dx: q.x - e.x, dy: q.y - e.y, kb: 2, src: 'nova', col: '#ff3050' }); addBleed(q, 3); }
      const h = 4 * (n + 1); P.hp = Math.min(P.maxhp, P.hp + h);
      for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; addP({ k: 'blood', x: e.x, y: e.y, z: e.z + e.h * 0.5, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, vz: rand(0, 1.5), size: 0.06, col: MAT.flesh[i % 3], life: 0.6, mat: 'flesh' }); }
      dmgNum(e.x, e.y, e.z + e.h + 0.7, 'BLOOD NOVA +' + h, '#ff4060'); SFX.play('gib', 0.7); G.shake += 4; G.flashR = Math.max(G.flashR, 0.18);
    }
  }
  if (o.heavy && o.src === 'sword' && P.wpn.sword === 'skull' && !e.d.boss && e.hp < e.maxhp * 0.3) {
    dmgNum(e.x, e.y, e.z + e.h + 0.6, 'EXECUTE', '#ffd040'); damageEnemy(e, e.hp + 999, { dx: o.dx, dy: o.dy, kb: 4, heavy: true, src: 'exec', col: '#ffd040' });
    gibs(e.x, e.y, e.z + e.h * 0.6, 14, e.d.mat, 1.3); G.hitstop = Math.max(G.hitstop, 0.08); G.shake += 5; SFX.play('gib'); shardGain(2, null); return;
  }
  if (o.src === 'whip' && P.wpn.whip === 'blood') {
    P.hp = Math.min(P.maxhp, P.hp + 2); if (!(e.bleed >= 2 && e.bleedT > 0)) addBleed(e, 2);
    if (!e.d.boss) { const d = Math.hypot(P.x - e.x, P.y - e.y) || 1; e.kbx += (P.x - e.x) / d * 5.5; e.kby += (P.y - e.y) / d * 5.5; }
    for (let i = 0; i < 8; i++) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + e.h * 0.6, vx: (P.x - e.x) * 2.2 + rand(-0.5, 0.5), vy: (P.y - e.y) * 2.2 + rand(-0.5, 0.5), vz: rand(0.2, 1), size: 0.035, col: RGB(255, 40, 70), life: 0.5 });
  }
  if (P.mods.silver && o.src === 'pistol') {
    addBleed(e, 3);
    if (XB() && G.t - (P.shrapT || -9) > 0.05) { P.shrapT = G.t; for (const q of G.enemies) if (q !== e && q.alive && !q.hidden && Math.hypot(q.x - e.x, q.y - e.y) < 1.5) damageEnemy(q, 15, { dx: q.x - e.x, dy: q.y - e.y, kb: 1.5, src: 'shrapnel', col: '#e0e8ff' }); sparks(e.x, e.y, e.z + e.h * 0.6, 22, RGB(230, 235, 255)); }
  }
  if (P.mods.headsman && !e.d.boss && e.alive && e.hp < e.maxhp * 0.15) { dmgNum(e.x, e.y, e.z + e.h + 0.6, 'BEHEADED', '#ff6070'); damageEnemy(e, e.hp + 999, { dx: o.dx, dy: o.dy, kb: 3, heavy: true, src: 'exec', col: '#ff6070' }); gibs(e.x, e.y, e.z + e.h * 0.9, 8, e.d.mat, 1.1); }
};
const _onKill = rogueOnKill;
rogueOnKill = function (e) {
  _onKill(e);
  if (e.summoned) return;
  if (P.mods.siphon) P.mana = Math.min(P.maxmana, P.mana + 5);
  if (P.mods.moonrose && Math.random() < 0.08) G.pickups.push(mkPickup('rose', e.x, e.y));
};
const _shardGain = shardGain;
shardGain = function (n, e) { if (e && P.mods && P.mods.tooth && (e.elite || e.d.boss)) n *= 2; return _shardGain(n, e); };
const _afterHurt = rogueAfterHurt;
rogueAfterHurt = function (res, dmg, opt) {
  _afterHurt(res, dmg, opt);
  const e = opt.src;
  if (P.mods.thorns && e && e.alive && (res === 'hit' || res === 'block') && Math.hypot(e.x - P.x, e.y - P.y) < 3.5) { damageEnemy(e, 15, { dx: e.x - P.x, dy: e.y - P.y, kb: 1, src: 'thorns', col: '#c0ff80' }); addBleed(e, 3); }
  if (res === 'parry' && P.mods.horn) {
    SFX.play('roar', 0.5); G.shake += 4; G.zoom = 0.06;
    for (const o of G.enemies) if (o.alive && !o.hidden && Math.hypot(o.x - P.x, o.y - P.y) < 4) { if (o.d.boss) o.poise = (o.poise || 0) + 90; else { o.stagger = Math.max(o.stagger, 1.5); o.state = 'stagger'; o.st = 0; o.atk = null; } dmgNum(o.x, o.y, o.z + o.h + 0.3, 'DREAD', '#d090ff'); }
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; addP({ k: 'spark', x: P.x + Math.cos(a) * 0.8, y: P.y + Math.sin(a) * 0.8, z: P.z + 1, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, vz: 0, size: 0.05, col: RGB(200, 120, 255), life: 0.45 }); }
  }
};
const _playerDie = playerDie;
playerDie = function () {
  if (RUN.on && P.mods && P.mods.rites && !P.ritesUsed) {
    P.ritesUsed = true; P.hp = 30; P.iframes = 2; G.flashG = 0.8; G.slow = 0.8; G.zoom = 0.12; SFX.play('secret', 0.6); SFX.play('glint');
    G.bigText = { img: null, t1: 'LAST RITES', t2: 'Not yet, Baron.', t: 0, dur: 2.2 };
    for (let i = 0; i < 50; i++) addP({ k: 'ecto', x: P.x + rand(-0.6, 0.6), y: P.y + rand(-0.6, 0.6), z: P.z + rand(0, 1.8), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: rand(1, 3), size: rand(0.05, 0.1), col: RGB(255, 250, 220), life: 1 });
    return;
  }
  return _playerDie();
};
const _nextStage = nextStage;
nextStage = function () { _nextStage(); if (P.mods.martyr) { P.hp = Math.min(P.maxhp, P.hp + P.maxhp * 0.3); } };
PICK.rose.f = function (p) { if (P.hp >= P.maxhp) return false; const h = P.mods && P.mods.moonrose ? 75 : 50; P.hp = Math.min(P.maxhp, P.hp + h); toast('+' + h + ' BLOOD ROSE', '', '#ff8090', 1.2); return true; };
// secret rewards
PICK.shards = { tex: 'p_shard', h: 0.34, gc: [200, 110, 255], f(p) { const v = shardGain(p.amt || 20, null); G.bigText = { img: null, t1: '+' + v + ' RELIQUARY SHARDS', t2: 'A hidden tithe', t: 0, dur: 2.2 }; SFX.play('glint'); SFX.play('pickup'); return true; } };
PICK.cache = { tex: 'p_blade', h: 0.55, gc: [255, 200, 70], f(p) { grantWeaponCache(); return true; } };
function grantWeaponCache() {
  const ws = UPG.filter(u => u.kind === 'WEAPON' && u.ok() && isUnlocked(u.id));
  const xb = ws.find(u => u.id === 'crossbow');
  const u = xb && Math.random() < 0.6 ? xb : ws[(Math.random() * ws.length) | 0];
  if (!u) { shardGain(25, null); toast('WEAPON CACHE', 'Empty - 25 shards instead.', '#ffd848', 2.5); return; }
  u.take(); RUN.picks.push(u.id);
  G.bigText = { img: null, t1: u.name, t2: 'WEAPON CACHE', t: 0, dur: 3 }; toast(u.desc, '', RARITY[u.r].c, 5);
  SFX.play('pickup'); SFX.play('glint'); rumbleFx('parry'); synergyToast(u);
}
// ---- crossbow: repeater + reload speed + heavier impacts + bolts that stick in the walls ----
const STUCK = [];
const _fireXB = fireCrossbow;
fireCrossbow = function () {
  const before = P.pistol, wall = rayMarch(30);
  _fireXB();
  if (P.pistol && P.pistol !== before) {
    if (P.mods.repeater) P.pistol.dur *= 0.7;
    const a = aimVec(); const hits = enemiesOnRay(wall.d, 0.2);
    for (const h of hits.slice(0, 3)) { const e = h.e; spray(e.x, e.y, e.z + e.h * 0.55, a.x, a.y, 0.25, 30, 5, 0.35, e.d.mat, 1.3); wallSplatNear(e.x + a.x * 0.9, e.y + a.y * 0.9, e.z + e.h * 0.6); addP({ k: 'impact', x: e.x - a.x * 0.2, y: e.y - a.y * 0.2, z: e.z + e.h * 0.6, life: 0.1, max: 0.1, sz: 1.0, col: [230, 210, 255] }); }
    if (hits.length < 3) { STUCK.push({ x: wall.x - a.x * 0.06, y: wall.y - a.y * 0.06, z: wall.z, t: 0 }); if (STUCK.length > 30) STUCK.shift(); }
    for (let i = 0; i < 10; i++) VMP.length < 140 && VMP.push({ x: W / 2 + rand(-6, 6), y: H - 150 + rand(-4, 4), vx: rand(-40, 40), vy: rand(-50, -10), life: rand(0.15, 0.3), t: 0, c: Math.random() < 0.5 ? '#e0c8ff' : '#ffffff' });
    if (P.mods.repeater && !P.repeating) P.repeatQ = 0.16;
  }
};
const _firePistol = firePistol;
firePistol = function () {
  const before = P.pistol; _firePistol();
  if (!XB() && P.pistol && P.pistol !== before && P.mods.repeater && !P.repeating) P.repeatQ = 0.14;
};
function m4Tick(dt) {
  if (P.repeatQ > 0) { P.repeatQ -= dt; if (P.repeatQ <= 0) { const sv = P.pistol, mana = P.mana; P.pistol = null; P.repeating = true; P.mana = P.maxmana; (XB() ? fireCrossbow : firePistol)(); P.repeating = false; P.mana = mana; if (!P.pistol) P.pistol = sv; else if (sv) P.pistol = sv; } }
  P.berserkOn = !!(P.mods.berserk && P.hp < P.maxhp * 0.4);
  if (P.berserkOn && Math.random() < dt * 6) addP({ k: 'ember', x: P.x + rand(-0.4, 0.4), y: P.y + rand(-0.4, 0.4), z: P.z + rand(0.2, 1.2), vx: 0, vy: 0, vz: 1, size: 0.03, col: RGB(255, 40, 40), life: 0.5 });
  for (const s of STUCK) s.t += dt;
  // secret tells: a faint draft of dust breathing out of hidden walls, a whisper when you are close
  const cr = LEVEL.cracks || []; const R0 = P.mods.dowse ? 9 : 6;
  for (const c of cr) {
    if (!c || c.open) continue;
    const cx = c.x + 0.5, cy = c.y + 0.5, d = Math.hypot(P.x - cx, P.y - cy); if (d > R0) continue;
    if (Math.random() < dt * (3 + 5 * (1 - d / R0))) {
      // emerge from a face that borders open floor, drift outwards
      const F = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([fx, fy]) => !isSolid(cellAt(cx + fx, cy + fy)));
      if (F.length) { const [fx, fy] = F[(Math.random() * F.length) | 0]; const along = rand(-0.45, 0.45); addP({ k: 'dust', x: cx + fx * 0.52 + (fy ? along : 0), y: cy + fy * 0.52 + (fx ? along : 0), z: rand(0.2, 2.0), vx: fx * rand(0.25, 0.6), vy: fy * rand(0.25, 0.6), vz: rand(-0.05, 0.12), size: rand(0.03, 0.06), col: Math.random() < 0.5 ? RGB(200, 170, 255) : RGB(170, 255, 200), life: rand(0.9, 1.6) }); }
    }
    if (d < 3.1 && !c.hinted) { c.hinted = true; SFX.play('ghost', 0.14); if (P.mods.dowse) SFX.play('glint', 0.5); }
    if (d > 5) c.hinted = false;
  }
  // dowsing: +10 shards per newly found secret
  const nf = (LEVEL.secrets || []).filter(s => s.found).length;
  if (RUN.on && nf > (RUN.m4found || 0) && P.mods.dowse) shardGain(10 * (nf - (RUN.m4found || 0)), null);
  RUN.m4found = nf;
}
const _rogueSprites = rogueSprites;
rogueSprites = function (S, t) {
  _rogueSprites(S, t);
  if (typeof golemSprites === 'function') golemSprites(S, t);
  for (const s of STUCK) S.push({ tex: 'bolt_stuck', x: s.x, y: s.y, z: s.z - 0.04, w: 0.32, h: 0.08, lit: true });
  if (P.mods.dowse) for (const c of (LEVEL.cracks || [])) { if (!c || c.open) continue; const d = Math.hypot(P.x - c.x - 0.5, P.y - c.y - 0.5); if (d < 9) S.push({ tex: 'glow_w', x: c.x + 0.5, y: c.y + 0.5, z: 0.6, w: 1.6, h: 1.6, add: true, alpha: (0.22 + 0.12 * Math.sin(t * 4)) * (1 - d / 9), lit: false, tint: [120, 255, 160, 1] }); }
};
function m4NewStage() { STUCK.length = 0; RUN.m4found = 0; }
