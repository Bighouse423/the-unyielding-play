'use strict';
// ===== THE UNYIELDING - roguelike run layer (M1) =====
// Run loop: Stage N (remixed nave, harder each time) -> boss -> pick 1 of 3 boons -> Stage N+1. Death ends the run -> results -> new run.
const RARITY = {
  common: { n: 'COMMON', c: '#e0d8ec', g: '#9088a8', w: 60 },
  rare: { n: 'RARE', c: '#60d0ff', g: '#2a7ae0', w: 28 },
  epic: { n: 'EPIC', c: '#d878ff', g: '#9a3cff', w: 12 },
  legendary: { n: 'LEGENDARY', c: '#ffd848', g: '#ff9a20', w: 4 },
};
// stage looks: same castle hall, new palette + lighting (M2 brings real new biomes)
const THEMES = {
  nave: { name: 'THE RUINED NAVE', sub: 'Castle Hall', haze: [150, 80, 170], map: 'castle', boss: 'vknight', music: 'castle' },
  // M2: the Crypt (concept 22) - torchlit stone, green miasma, skull walls. Generated fresh every stage.
  crypt: {
    name: 'THE WEEPING CATACOMBS', sub: 'The Crypt', map: 'crypt', boss: 'spider', music: 'crypt', haze: [70, 120, 110], ambient: [0.5, 0.5, 0.6],
    grade: { sh: [0.05, 0.06, 0.12], hi: [0.08, 0.05, 0.0] },
  },
  ossuary: {
    name: 'THE BLOOD OSSUARY', sub: 'Bone chapels & blood pools', variant: 'ossuary', map: 'crypt', boss: 'colossus', music: 'ossuary', haze: [120, 34, 74], ambient: [0.54, 0.36, 0.46], torch: 'orange',
    light: c => (c[1] > c[0] && c[1] > c[2]) ? (c[2] > 0.6 ? [1.0, 0.3, 0.55] : [0.8, 0.3, 1.0]) : c,
    grade: { sh: [0.1, -0.02, 0.09], hi: [0.06, 0.0, -0.02], mix: [1.02, 0.0, 0.0, 0.03, 0.9, 0.04, 0.02, 0.0, 0.95] },
    pool: [['skeleton', 3], ['azombie', 1.6], ['fzombie', 1.6], ['bat', 1.6], ['ghost', 1.2], ['spiderling', 1.2], ['imp', 0.9], ['zombie', 1]],
  },
  witch: {
    name: 'THE WITCHLIGHT NAVE', sub: 'Castle Hall - cursed', haze: [96, 64, 176], torch: 'green', ambient: [0.36, 0.54, 0.6],
    light: c => (c[0] > c[2] + 0.3 && c[1] > 0.35) ? [0.18 + 0.1 * c[1], 1.0, 0.62] : (c[0] > 0.8 && c[1] < 0.3 && c[2] < 0.4) ? [0.7, 0.22, 1.0] : c,
    grade: { sh: [0.04, 0.03, 0.14], hi: [0.02, 0.04, 0.03] },
  },
  blood: {
    name: 'THE BLOOD MOON NAVE', sub: 'Castle Hall - drowned in red', haze: [160, 30, 96], torch: 'orange', ambient: [0.66, 0.34, 0.56],
    light: c => (c[2] > c[0] + 0.15) ? [1.0, 0.22, 0.5] : (c[1] > c[0] && c[1] > c[2]) ? c : [1.0, c[1] * 0.5, c[2] * 0.6],
    grade: { sh: [0.12, -0.03, 0.07], hi: [0.06, 0.0, -0.02], mix: [1.02, 0.0, 0.0, 0.03, 0.9, 0.04, 0.02, 0.0, 0.95] },
  },
};
function stageCfg(n) {
  const k = n - 1;
  return {
    // M4: the curve is stretched over a 10-stage run (stage 10 = x2.6 hp, x1.9 dmg). Stages 4+ are ENDLESS until M5 builds them.
    n, theme: n === 1 ? 'nave' : n === 2 ? 'crypt' : n === 3 ? 'ossuary' : n % 2 === 0 ? 'crypt' : 'ossuary',
    endless: n > 3 ? n - 3 : 0, boss: n > 3 ? ['vknight', 'spider', 'colossus'][(n - 4) % 3] : null,
    hp: 1 + 0.15 * k + 0.003 * k * k, dmg: 1 + 0.1 * k, spd: 1 + 0.03 * Math.min(k, 6),
    dens: Math.min(0.9, 0.2 * k), elite: n === 1 ? 0 : Math.min(0.45, 0.16 + 0.04 * (k - 1)),
    eliteMods: Math.min(3, 1 + Math.floor((n - 2) / 3)), bossHp: 1 + 0.22 * k, promote: Math.min(0.7, 0.15 * k),
  };
}
const ELITES = {
  armored: { n: 'ARMORED', c: '#a8c8ff', tint: [150, 180, 255] },
  hasted: { n: 'HASTED', c: '#b0ff60', tint: [150, 255, 80] },
  vampiric: { n: 'VAMPIRIC', c: '#ff4878', tint: [255, 30, 90] },
  bloodthirsty: { n: 'BLOODTHIRSTY', c: '#ff7a30', tint: [255, 100, 20] },
  venomous: { n: 'VENOMOUS', c: '#a0ff40', tint: [130, 255, 40] },
};
// ---- boons ----
const UPG = [
  { id: 'firewhip', kind: 'WEAPON', r: 'epic', name: 'FIRE WHIP', icon: 'ic_firewhip', desc: 'Lashes set foes ablaze: burn 24 dmg over 3s. Burning foes take +15% dmg and spread fire on death.', ok: () => P.wpn.whip !== 'fire', take() { P.wpn.whip = 'fire'; } },
  { id: 'frostsword', kind: 'WEAPON', r: 'epic', name: 'FROST-TOUCHED LONGSWORD', icon: 'ic_frostsword', desc: 'Hits chill (slow 40%). 3 chills FREEZE a foe solid. Heavy strike on a frozen foe SHATTERS it.', ok: () => P.wpn.sword !== 'frost', take() { P.wpn.sword = 'frost'; } },
  { id: 'saintsedge', kind: 'RELIC', r: 'legendary', name: "THE SAINT'S EDGE", icon: 'p_blade', desc: 'Sword +40% damage and it cuts through ghosts.', ok: () => !P.hasEdge, take() { P.hasEdge = true; } },
  { id: 'sidearm', kind: 'RELIC', r: 'rare', name: 'CONSECRATED SIDEARM', icon: 'p_pistol', desc: 'A holy pistol. R / Square fires (8 mana a shot). Hurts ghosts.', ok: () => !P.hasPistol, take() { P.hasPistol = true; P.mana = P.maxmana; } },
  { id: 'ironheart', kind: 'RELIC', r: 'common', name: 'IRON HEART', icon: 'p_chalice', desc: '+25 max health and heal to full.', ok: () => true, take() { P.maxhp += 25; P.hp = P.maxhp; } },
  { id: 'whetstone', kind: 'RELIC', r: 'common', name: 'WHETSTONE OF RUIN', icon: 'p_blade', desc: '+15% sword damage. Stacks.', ok: () => true, take() { P.mods.sword += 0.15; } },
  { id: 'cruellash', kind: 'RELIC', r: 'rare', name: 'CRUEL LASH', icon: 'vm_lwhip', desc: '+40% whip damage and lashed foes stay stunned longer.', ok: () => true, take() { P.mods.whip += 0.4; P.mods.stun += 0.3; } },
  { id: 'bloodletter', kind: 'RELIC', r: 'rare', name: 'BLOODLETTER', icon: 'p_rose', desc: 'Every kill heals 3 HP. Stacks.', ok: () => true, take() { P.mods.killHeal += 3; } },
  { id: 'quicksilver', kind: 'RELIC', r: 'common', name: 'QUICKSILVER GREAVES', icon: 'p_mana', desc: '+10% move speed. Stacks up to 3.', ok: () => P.mods.spd < 1.29, take() { P.mods.spd += 0.1; } },
  { id: 'soulvessel', kind: 'RELIC', r: 'common', name: 'SOUL VESSEL', icon: 'p_shard', desc: '+25 max mana and refill it.', ok: () => true, take() { P.maxmana += 25; P.mana = P.maxmana; } },
  { id: 'rosary', kind: 'RELIC', r: 'rare', name: 'BLOODIED ROSARY', icon: 'p_vial', desc: 'Parries and perfect dodges heal 10 HP.', ok: () => !P.mods.rosary, take() { P.mods.rosary = 1; } },
  // ---- M2 weapons (concept art 28 / 30 / 33 / 40) - each replaces the weapon in its slot
  { id: 'chainwhip', kind: 'WEAPON', r: 'epic', name: 'SPIKED CHAIN WHIP', icon: 'ic_chainwhip', desc: 'Reaches 30% farther and tears through 3 foes. Hits BLEED (stacks 3x).', ok: () => P.wpn.whip !== 'chain', take() { P.wpn.whip = 'chain'; } },
  { id: 'stormsword', kind: 'WEAPON', r: 'epic', name: 'PURPLE LIGHTNING LONGSWORD', icon: 'ic_stormsword', desc: 'Hits arc lightning to 2 nearby foes. Heavy strikes arc to 4 and stun.', ok: () => P.wpn.sword !== 'storm', take() { P.wpn.sword = 'storm'; } },
  { id: 'rapier', kind: 'WEAPON', r: 'epic', name: 'VAMPIRE RAPIER', icon: 'ic_rapier', desc: '35% faster strikes, 20% lighter. Every hit drinks 2 HP. 3rd thrust CRITS x1.8.', ok: () => P.wpn.sword !== 'rapier', take() { P.wpn.sword = 'rapier'; } },
  { id: 'crossbow', kind: 'WEAPON', r: 'epic', name: 'GOTHIC CROSSBOW', icon: 'ic_crossbow', desc: 'R / Square: silver bolt (6 mana). 40 dmg, pierces 3 foes, staggers, hurts ghosts.', ok: () => P.wpn.ranged !== 'crossbow', take() { P.wpn.ranged = 'crossbow'; P.hasPistol = true; P.mana = P.maxmana; } },
  // ---- M2 relics (+ synergies)
  { id: 'emberheart', kind: 'RELIC', r: 'rare', name: 'EMBER HEART', icon: 'ic_emberheart', desc: 'Burning foes EXPLODE on death (20 dmg). Fire Whip: PYRE - bigger blasts that ignite.', syn: { name: 'PYRE', has: () => P.wpn.whip === 'fire' }, ok: () => !P.mods.ember, take() { P.mods.ember = 1; } },
  { id: 'rimesigil', kind: 'RELIC', r: 'rare', name: 'RIME SIGIL', icon: 'ic_rimesigil', desc: 'Chilled or frozen foes take +30% dmg. Frost Sword: PERMAFROST - 2 hits freeze, longer.', syn: { name: 'PERMAFROST', has: () => P.wpn.sword === 'frost' }, ok: () => !P.mods.rime, take() { P.mods.rime = 1; } },
  { id: 'stormbell', kind: 'RELIC', r: 'rare', name: 'STORM BELL', icon: 'ic_stormbell', desc: 'Every 5th hit calls lightning (18 dmg). Lightning Sword: TEMPEST - every 3rd, more arcs.', syn: { name: 'TEMPEST', has: () => P.wpn.sword === 'storm' }, ok: () => !P.mods.bell, take() { P.mods.bell = 1; } },
  { id: 'fang', kind: 'RELIC', r: 'rare', name: "HEMOMANCER'S FANG", icon: 'ic_fang', desc: 'Bleeding foes take +20% dmg; bleed heals you. Chain Whip or Rapier: BLOOD PACT.', syn: { name: 'BLOOD PACT', has: () => P.wpn.whip === 'chain' || P.wpn.sword === 'rapier' }, ok: () => !P.mods.fang, take() { P.mods.fang = 1; } },
  { id: 'gravecoin', kind: 'RELIC', r: 'common', name: 'GRAVE COIN', icon: 'ic_gravecoin', desc: '+50% Reliquary Shards this run. Secrets also hold a blood rose.', ok: () => !P.mods.coin, take() { P.mods.coin = 1; } },
  { id: 'quiver', kind: 'RELIC', r: 'common', name: "HUNTER'S QUIVER", icon: 'ic_quiver', desc: 'Ranged dmg +35%, shots cost 2 less mana. Crossbow pierces 1 more.', ok: () => P.mods.quiver < 2, take() { P.mods.quiver++; P.mods.ranged += 0.35; } },
  { id: 'ironoath', kind: 'RELIC', r: 'rare', name: 'IRON OATH', icon: 'ic_ironoath', desc: 'Blocks take 5% dmg, parry window +50%. Parries release a holy shockwave.', ok: () => !P.mods.oath, take() { P.mods.oath = 1; } },
  { id: 'wraithcloak', kind: 'RELIC', r: 'rare', name: 'WRAITH CLOAK', icon: 'ic_wraithcloak', desc: 'Rolls: longer i-frames, 30% shorter cooldown. Perfect dodges heal 4.', ok: () => !P.mods.wraith, take() { P.mods.wraith = 1; } },
];
const synOn = id => { const u = UPG.find(q => q.id === id); return !!(u && u.syn && P.mods && u.syn.has() && RUN.picks.includes(id)); };
const RUN = { on: false, seed: 1, shardsRun: 0, stage: 1, picks: [], kills: 0, elites: 0, time: 0, best: +(localStorage.getItem('tu_play_m7d_best') || 0), cfg: stageCfg(1), choices: null, sel: 0, pickT: 0, resT: 0, cause: '' };
window.RUN = RUN;
function newRunPlayer() {
  P.wpn = { sword: 'base', whip: 'base', ranged: 'pistol' };
  P.mods = { sword: 1, whip: 1, stun: 0, killHeal: 0, spd: 1, rosary: 0, ranged: 1, ember: 0, rime: 0, bell: 0, fang: 0, coin: 0, quiver: 0, oath: 0, wraith: 0 };
  P.hits = 0; P.webT = 0;
}
newRunPlayer();
function curTheme() { return THEMES[RUN.cfg.theme]; }
function applyTheme() {
  const th = curTheme();
  HAZE[0] = th.haze[0]; HAZE[1] = th.haze[1]; HAZE[2] = th.haze[2];
  buildLUT(th.grade || null);
  SFX.stageKey = th.music || 'castle'; SFX.bossKey = th.boss || 'vknight';
}
// start a whole new run (title / after death)
function newRun() {
  RUN.on = true; RUN.hub = false; RUN.bosses = 0; RUN.banked = 0; RUN.seed = (Math.random() * 1e9) | 0; RUN.shardsRun = 0; RUN.secrets = 0; RUN.stage = 1; RUN.picks = []; RUN.kills = 0; RUN.elites = 0; RUN.time = 0; RUN.cfg = stageCfg(1); RUN.choices = null;
  newRunPlayer(); applyTheme();
  newGame(); if (typeof applyMeta === 'function') applyMeta(); G.state = 'play'; G.fade = 1;
  stageIntro();
}
function stageIntro() {
  const th = curTheme();
  G.bigText = { t1: 'STAGE ' + RUN.stage, t2: th.name, dur: 3.2, t: 0 };
  const sub = RUN.stage === 1 ? 'The Lich King has claimed the Black Reliquary. Take it back.' : RUN.cfg.endless ? 'ENDLESS DESCENT ' + RUN.cfg.endless + ' - the lieutenants return, stronger. (More stages coming.)' : th.boss === 'spider' ? 'Down into the catacombs. Something breeds in the dark.' : 'The bone halls run red. Something vast is made of the dead here.';
  toast(th.sub.toUpperCase(), sub, RUN.stage === 1 ? '#ffe080' : th.map === 'crypt' && th.boss === 'spider' ? '#90ff90' : '#ff8090', 4);
}
// go to the next stage, keeping everything the run has earned
function nextStage() {
  const keep = { maxhp: P.maxhp, hp: P.hp, maxmana: P.maxmana, hasPistol: P.hasPistol, hasEdge: P.hasEdge, off: P.off, wpn: P.wpn, mods: P.mods, hits: P.hits || 0 };
  RUN.kills += G.kills; RUN.time += G.time;
  if (typeof shardGain === 'function') shardGain(5 * RUN.stage, null);
  RUN.stage++; RUN.cfg = stageCfg(RUN.stage);
  applyTheme();
  newGame();
  Object.assign(P, keep);
  P.hp = Math.min(P.maxhp, keep.hp + P.maxhp * 0.4); P.mana = P.maxmana;
  G.state = 'play'; G.fade = 1;
  stageIntro();
}
// called from newGame() right after buildLevel(): density + promotions on the spawn list
function rogueSpawns(list) {
  const c = RUN.cfg; if (c.n === 1) return list;
  const out = []; const PROMO = { zombie: ['fzombie', 'skeleton', 'azombie'], bat: ['bat', 'imp'], skeleton: ['skeleton', 'azombie'], fzombie: ['fzombie', 'skeleton'] };
  for (const s of list) {
    let t = s[0];
    if (PROMO[t] && Math.random() < c.promote) t = PROMO[t][(Math.random() * PROMO[t].length) | 0];
    out.push([t, s[1], s[2], s[3]]);
    if (Math.random() < c.dens) {
      for (let k = 0; k < 8; k++) {
        const x = s[1] + rand(-1.1, 1.1), y = s[2] + rand(-1.1, 1.1); const ci = cellAt(x, y);
        if (ci >= 0 && !SOLID[ci] && Math.abs(FH[ci] - FH[cellAt(s[1], s[2])]) < 0.05 && FH[ci] > -0.5 && Math.hypot(x - LEVEL.start.x, y - LEVEL.start.y) > 5 && losTo(s[1], s[2], x, y) && !blocked(x, y, FH[ci], 0.4, 0.33)) { out.push([s[0], x, y, s[3]]); break; }
      }
    }
  }
  return out;
}
// called after newGame() created the enemies
function rogueStagePost() {
  const c = RUN.cfg;
  for (const e of G.enemies) {
    if (e.d.boss) { e.hp = e.maxhp = Math.round(e.maxhp * c.bossHp); continue; }
    e.hp = e.maxhp = Math.round(e.maxhp * c.hp); e.d.speed *= c.spd;
    if (e.forceElite) { const pool = Object.keys(ELITES).sort(() => Math.random() - 0.5); makeElite(e, pool.slice(0, Math.min(3, Math.max(1, c.eliteMods)))); continue; }
    if (Math.random() < c.elite) {
      const pool = Object.keys(ELITES).sort(() => Math.random() - 0.5);
      makeElite(e, pool.slice(0, Math.max(1, Math.min(c.eliteMods, 1 + ((Math.random() * c.eliteMods) | 0)))));
    }
  }
  G.totalEnemies = G.enemies.length;
  if (c.n > 1) LEVEL.signs = LEVEL.signs.filter(sg => !/ROLL|SWORD/.test(sg.text));
}
function makeElite(e, mods) {
  e.elite = mods; e.hp = e.maxhp = Math.round(e.maxhp * 1.7); e.dmgMul = 1.15; e.w *= 1.12; e.h *= 1.1;
  for (const m of mods) {
    if (m === 'hasted') { e.d.speed *= 1.45; e.d.windup *= 0.7; e.d.recover *= 0.7; }
    if (m === 'armored') e.armorMul = 0.55;
  }
}
const isElite = (e, m) => e.elite && e.elite.includes(m);
// enemy damage scaling (all enemy sources go through hurtPlayer)
function rogueEnemyDmg(dmg, opt) {
  if (opt.env) return dmg;
  let m = RUN.cfg.dmg; if (opt.src && opt.src.dmgMul) m *= opt.src.dmgMul;
  return Math.max(1, Math.round(dmg * m));
}
function rogueAfterHurt(res, dmg, opt) {
  const e = opt.src;
  if (res === 'hit' && e && isElite(e, 'vampiric') && e.alive) { const h = Math.round(dmg * 2); e.hp = Math.min(e.maxhp, e.hp + h); dmgNum(e.x, e.y, e.z + e.h + 0.2, '+' + h, '#ff4878'); for (let i = 0; i < 10; i++) addP({ k: 'ember', x: P.x + rand(-0.3, 0.3), y: P.y + rand(-0.3, 0.3), z: P.z + 1, vx: (e.x - P.x) * 1.5, vy: (e.y - P.y) * 1.5, vz: rand(0, 0.6), size: 0.04, col: RGB(255, 30, 80), life: 0.6 }); }
  if (res === 'parry' && P.mods.oath) { // holy shockwave
    for (const o of G.enemies) if (o.alive && !o.hidden && Math.hypot(o.x - P.x, o.y - P.y) < 2.6) damageEnemy(o, 14, { dx: o.x - P.x, dy: o.y - P.y, kb: 3, src: 'bash', col: '#fff2a0' });
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; addP({ k: 'spark', x: P.x + Math.cos(a) * 0.8, y: P.y + Math.sin(a) * 0.8, z: P.z + 1, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, vz: 0, size: 0.05, col: RGB(255, 240, 160), life: 0.35 }); }
  }
  if (res === 'dodged' && P.dodgeAge < 0.2 && !opt.nopd && P.mods.wraith) { P.hp = Math.min(P.maxhp, P.hp + 4); }
  if (res === 'hit' && e && isElite(e, 'venomous')) { P.poisonT = 3; toast('POISONED', '', '#a0ff40', 1); }
  if ((res === 'parry' || res === 'dodged' && P.dodgeAge < 0.2 && !opt.nopd) && P.mods.rosary) { P.hp = Math.min(P.maxhp, P.hp + 10); dmgNum(P.x + Math.cos(P.ang), P.y + Math.sin(P.ang), P.z + 1.4, '+10 HP', '#ff8090'); }
}
// incoming damage multiplier on an enemy (armor, burning)
function rogueDmgIn(e, dmg, o) {
  if (e.armorMul && !o.dot) { dmg *= e.armorMul; if (Math.random() < 0.7) sparks(e.x, e.y, e.z + e.h * 0.6, 6, RGB(170, 200, 255)); }
  if (e.burnT > 0 && !o.dot) dmg *= 1.15;
  if (P.mods.rime && (e.chillT > 0 || e.iceT > 0)) dmg *= 1.3;
  if (P.mods.fang && e.bleedT > 0 && !o.dot) dmg *= 1.2;
  return dmg;
}
// sword pre-hit: frost shatter bonus
function rogueSwordPre(e, dmg, step) {
  if (P.wpn.sword !== 'frost' || !(e.iceT > 0)) return dmg;
  if (step === 2 || e.hp < dmg * 2.5) {
    e.iceT = 0; e.chill = 0; e.shattered = true;
    for (let i = 0; i < 26; i++) addP({ k: 'spark', x: e.x, y: e.y, z: e.z + e.h * rand(0.2, 0.9), vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(1, 5), size: rand(0.03, 0.07), col: [RGB(220, 250, 255), RGB(120, 210, 255), RGB(60, 140, 230)][i % 3], life: rand(0.5, 1.1) });
    spray(e.x, e.y, e.z + e.h * 0.5, 0, 0, 0.6, 40, 4, Math.PI, 'ice', 1.2);
    dmgNum(e.x, e.y, e.z + e.h + 0.5, 'SHATTER!', '#c0f4ff'); SFX.play('gib', 0.8); SFX.play('clink'); G.shake += 5; G.hitstop = Math.max(G.hitstop, 0.09);
    return dmg * (e.d.boss ? 1.8 : 3);
  }
  return dmg * 1.25;
}
// after a hit lands: elemental effects + M2 weapon procs
function rogueOnHit(e, o, dmg) {
  if (!e.alive || o.dot) return;
  if (o.src === 'whip' && P.wpn.whip === 'fire') {
    if (!(e.burnT > 0)) dmgNum(e.x, e.y, e.z + e.h + 0.35, 'BURN', '#ff9a30');
    e.burnT = 3; e.burnTick = e.burnTick || 0;
    for (let i = 0; i < 14; i++) addP({ k: 'ember', x: e.x + rand(-0.25, 0.25), y: e.y + rand(-0.25, 0.25), z: e.z + e.h * rand(0.3, 0.9), vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(0.5, 2), size: rand(0.03, 0.06), col: [RGB(255, 220, 90), RGB(255, 120, 30), RGB(255, 60, 20)][i % 3], life: rand(0.3, 0.7) });
  }
  const sword = o.src === 'sword' || o.src === 'finisher';
  if (sword && P.wpn.sword === 'frost' && !e.shattered) {
    if (!(e.iceT > 0)) {
      const need = synOn('rimesigil') ? 2 : 3;
      e.chill = (e.chillT > 0 ? e.chill || 0 : 0) + 1; e.chillT = 2.6;
      if (e.chill >= need) { e.chill = 0; e.iceT = (e.d.boss ? 0.7 : 1.8) * (synOn('rimesigil') ? 1.6 : 1); dmgNum(e.x, e.y, e.z + e.h + 0.45, 'FROZEN', '#a0e8ff'); SFX.play('clink'); for (let i = 0; i < 16; i++) addP({ k: 'smoke', x: e.x + rand(-0.4, 0.4), y: e.y + rand(-0.4, 0.4), z: e.z + rand(0, e.h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.1, 0.5), size: 0.12, col: RGB(190, 235, 255), life: 0.9 }); }
      else dmgNum(e.x, e.y, e.z + e.h + 0.35, 'CHILL ' + e.chill, '#80d8ff');
    }
  }
  // chain whip (and the Blood Pact rapier): bleed stacks
  if ((o.src === 'whip' && P.wpn.whip === 'chain') || (sword && P.wpn.sword === 'rapier' && synOn('fang'))) {
    e.bleed = Math.min(3, (e.bleedT > 0 ? e.bleed || 0 : 0) + 1); e.bleedT = 4; e.bleedTick = e.bleedTick || 0;
    dmgNum(e.x, e.y, e.z + e.h + 0.35, 'BLEED ' + e.bleed, '#ff3050');
    spray(e.x, e.y, e.z + e.h * 0.6, rand(-1, 1), rand(-1, 1), 0.6, 10, 2.4, 0.8, e.d.mat);
  }
  // vampire rapier: drinks
  if (sword && P.wpn.sword === 'rapier' && o.src === 'sword') { const h = 2; if (P.hp < P.maxhp) { P.hp = Math.min(P.maxhp, P.hp + h); for (let i = 0; i < 6; i++) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + e.h * 0.6, vx: (P.x - e.x) * 2.2 + rand(-0.5, 0.5), vy: (P.y - e.y) * 2.2 + rand(-0.5, 0.5), vz: rand(0.2, 1), size: 0.035, col: RGB(255, 30, 70), life: 0.45 }); } }
  // purple lightning longsword: arcs
  if (o.src === 'sword' && P.wpn.sword === 'storm') {
    const heavy = !!o.heavy, tem = synOn('stormbell');
    stormArc(e, (heavy ? 4 : 2) + (tem ? 2 : 0), Math.max(5, (dmg || 20) * 0.4), heavy);
  }
  // storm bell: every Nth hit calls a bolt from above
  if (P.mods.bell && (sword || o.src === 'whip' || o.src === 'pistol')) {
    P.hits = (P.hits || 0) + 1; const n = synOn('stormbell') ? 3 : 5;
    if (P.hits % n === 0) { skyBolt(e, 18); }
  }
}
// lightning: jagged screen bolts between world points (drawn in drawBolts) + damage
function stormArc(src, n, dmg, stun) {
  const hit = [src]; let from = src;
  for (let k = 0; k < n; k++) {
    let best = null, bd = 3.6;
    for (const o of G.enemies) { if (!o.alive || o.hidden || hit.includes(o)) continue; const d = Math.hypot(o.x - from.x, o.y - from.y); if (d < bd && losTo(from.x, from.y, o.x, o.y)) { bd = d; best = o; } }
    if (!best) break;
    addBolt(from.x, from.y, from.z + from.h * 0.6, best.x, best.y, best.z + best.h * 0.6, '#c080ff');
    hit.push(best); const tgt = best; from = best;
    damageEnemy(tgt, dmg, { dot: true, src: 'storm', col: '#d0a0ff' });
    if (stun && tgt.alive && !tgt.d.boss) { tgt.stun = 0.5; tgt.state = 'chase'; }
    sparks(tgt.x, tgt.y, tgt.z + tgt.h * 0.6, 10, RGB(200, 140, 255));
  }
  if (hit.length > 1) { SFX.play('glint', 0.5); SFX.play('whip', 0.3); G.flashG = Math.max(G.flashG || 0, 0.05); }
}
function skyBolt(e, dmg) {
  addBolt(e.x + rand(-0.4, 0.4), e.y + rand(-0.4, 0.4), e.z + 5, e.x, e.y, e.z + 0.2, '#e8d0ff', 1.6);
  damageEnemy(e, dmg, { dot: true, src: 'storm', col: '#e0c0ff' }); SFX.play('pistol', 0.5); G.shake += 3; G.flashG = Math.max(G.flashG || 0, 0.12);
  for (let i = 0; i < 16; i++) addP({ k: 'spark', x: e.x, y: e.y, z: e.z + 0.3, vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(1, 4), size: 0.05, col: i % 2 ? RGB(220, 180, 255) : RGB(255, 255, 255), life: 0.5 });
}
const BOLTS = [];
function addBolt(x0, y0, z0, x1, y1, z1, col, w = 1) { BOLTS.push({ a: [x0, y0, z0], b: [x1, y1, z1], t: 0, dur: 0.22, col, w, seed: Math.random() * 100 }); }
function drawBolts(ctx, cam, rdt) {
  if (!BOLTS.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = BOLTS.length - 1; i >= 0; i--) {
    const b = BOLTS[i]; b.t += rdt; if (b.t > b.dur) { BOLTS.splice(i, 1); continue; }
    const pa = project(cam, ...b.a), pb = project(cam, ...b.b); if (!pa || !pb) continue;
    const k = 1 - b.t / b.dur; const N = 8; const pts = [[pa.x, pa.y]];
    const dx = pb.x - pa.x, dy = pb.y - pa.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    if (!b.straight) for (let j = 1; j < N; j++) { const f = j / N, off = (Math.sin(b.seed + j * 7.3 + b.t * 90) * 0.5 + (Math.random() - 0.5)) * Math.min(14, L * 0.18); pts.push([pa.x + dx * f + nx * off, pa.y + dy * f + ny * off]); }
    pts.push([pb.x, pb.y]);
    const line = (wd, c, al) => { ctx.globalAlpha = al * k; ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); };
    line(5 * b.w, b.col, 0.25); line(2 * b.w, b.col, 0.7); line(1, '#ffffff', 0.95);
  }
  ctx.restore();
}
// per-enemy tick: DoT, chill/freeze time dilation, elite behaviour. Returns the dt the enemy should run at.
function rogueEnemyTick(e, dt) {
  if (e.burnT > 0) {
    e.burnT -= dt; e.burnTick = (e.burnTick || 0) + dt;
    if (Math.random() < dt * 30) addP({ k: 'ember', x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), z: e.z + e.h * rand(0.1, 0.9), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.8, 2.2), size: rand(0.03, 0.06), col: Math.random() < 0.5 ? RGB(255, 150, 40) : RGB(255, 70, 20), life: rand(0.25, 0.6) });
    if (e.burnTick >= 0.25) { e.burnTick -= 0.25; damageEnemy(e, 2 * P.mods.whip, { dot: true, src: 'burn', col: '#ff9a30' }); if (!e.alive) return 0; }
  }
  if (e.bleedT > 0) {
    e.bleedT -= dt; e.bleedTick = (e.bleedTick || 0) + dt;
    if (Math.random() < dt * 10) addP({ k: 'blood', x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), z: e.z + e.h * rand(0.3, 0.8), vx: 0, vy: 0, vz: -0.5, size: 0.04, col: MAT[e.d.mat] ? MAT[e.d.mat][0] : RGB(200, 10, 30), life: 0.6, mat: e.d.mat });
    if (e.bleedTick >= 0.5) { e.bleedTick -= 0.5; damageEnemy(e, 2 * (e.bleed || 1) * P.mods.whip, { dot: true, src: 'bleed', col: '#ff3050' }); if (P.mods.fang) P.hp = Math.min(P.maxhp, P.hp + (synOn('fang') ? 2 : 1)); if (!e.alive) return 0; }
  }
  if (e.elite) {
    if (isElite(e, 'bloodthirsty') && !e.enraged && e.hp < e.maxhp * 0.5) { e.enraged = true; e.d.speed *= 1.35; e.dmgMul *= 1.3; dmgNum(e.x, e.y, e.z + e.h + 0.4, 'ENRAGED', '#ff7a30'); SFX.play('roar', 0.4); }
    if (isElite(e, 'vampiric') && e.hp < e.maxhp) e.hp = Math.min(e.maxhp, e.hp + dt * 2);
    if (Math.random() < dt * 6) { const tc = ELITES[e.elite[0]].tint; addP({ k: 'ember', x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), z: e.z + rand(0, e.h * 0.4), vx: 0, vy: 0, vz: rand(0.4, 1.2), size: 0.035, col: RGB(tc[0], tc[1], tc[2]), life: 0.7 }); }
  }
  if (e.iceT > 0) { e.iceT -= dt; if (Math.random() < dt * 8) addP({ k: 'smoke', x: e.x + rand(-0.3, 0.3), y: e.y + rand(-0.3, 0.3), z: e.z + rand(0, e.h), vx: 0, vy: 0, vz: 0.2, size: 0.08, col: RGB(200, 240, 255), life: 0.6 }); if (e.iceT <= 0) { e.shattered = false; sparks(e.x, e.y, e.z + e.h * 0.5, 10, RGB(200, 240, 255)); } return e.d.boss ? dt * 0.25 : 0; }
  if (e.chillT > 0) { e.chillT -= dt; if (Math.random() < dt * 4) addP({ k: 'spark', x: e.x + rand(-0.3, 0.3), y: e.y + rand(-0.3, 0.3), z: e.z + e.h * rand(0.3, 1), vx: 0, vy: 0, vz: 0.5, size: 0.03, col: RGB(160, 230, 255), life: 0.5 }); return dt * 0.6; }
  return dt;
}
function rogueOnKill(e) {
  if (e.burnT > 0 && P.mods.ember) emberBlast(e);
  if (isElite(e, 'venomous')) G.hazards.push({ x: e.x, y: e.y, t: -0.5, dmg: 8, kind: 'venom' });
  if (e.summoned) return;
  if (typeof shardGain === 'function') shardGain(e.d.boss ? 25 + 5 * RUN.stage : e.elite ? 5 : 1, e);
  if (e.d.boss) RUN.bosses = (RUN.bosses || 0) + 1;
  if (P.mods.killHeal && !e.d.boss) { P.hp = Math.min(P.maxhp, P.hp + P.mods.killHeal); }
  if (e.elite) { RUN.elites++; G.pickups.push(mkPickup('rose', e.x, e.y)); G.pickups.push(mkPickup('mana', e.x + 0.2, e.y)); }
  if (e.burnT > 0) { // fire spreads on death
    for (let i = 0; i < 24; i++) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + 0.5, vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(0.5, 3), size: rand(0.04, 0.07), col: [RGB(255, 230, 120), RGB(255, 130, 30), RGB(255, 60, 20)][i % 3], life: rand(0.4, 0.8) });
    for (const o of G.enemies) if (o !== e && o.alive && !o.hidden && Math.hypot(o.x - e.x, o.y - e.y) < 1.8) { o.burnT = 3; dmgNum(o.x, o.y, o.z + o.h + 0.3, 'BURN', '#ff9a30'); }
  }
}
function emberBlast(e) {
  const pyre = synOn('emberheart'), R = pyre ? 2.6 : 1.8;
  for (let i = 0; i < (pyre ? 50 : 30); i++) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + 0.6, vx: rand(-5, 5), vy: rand(-5, 5), vz: rand(1, 4), size: rand(0.04, 0.09), col: [RGB(255, 240, 140), RGB(255, 140, 30), RGB(255, 60, 20)][i % 3], life: rand(0.3, 0.7) });
  addP({ k: 'impact', x: e.x, y: e.y, z: e.z + 0.6, life: 0.2, max: 0.2, sz: R * 1.4, col: [255, 120, 30] });
  SFX.play('fire'); SFX.play('heavy', 0.6); G.shake += 4;
  for (const o of G.enemies) if (o !== e && o.alive && !o.hidden && Math.hypot(o.x - e.x, o.y - e.y) < R) { damageEnemy(o, pyre ? 30 : 20, { dot: true, src: 'burn', col: '#ffb040' }); if (pyre && o.alive) o.burnT = 3; }
}
// sprite decoration: elite aura, burn/chill/freeze tints
function rogueVisual(e, v) {
  if (!v) return v;
  if (e.type === 'spider' || e.type === 'spiderling') v = spiderVisual(e, v);
  if (e.type === 'colossus' && typeof golemVisual === 'function') v = golemVisual(e, v);
  if (e.dead) return v;
  const t = e.t;
  if (e.elite) { const tc = ELITES[e.elite[0]].tint; if (!v.tint || v.tint[3] < 0.2) v.tint = [tc[0], tc[1], tc[2], 0.16 + 0.1 * Math.sin(t * 5)]; v.glow = Math.max(v.glow || 0, 0.22); v.rim = Math.max(v.rim || 1, 1.8); }
  if (e.burnT > 0) { if (!v.tint || v.tint[3] < 0.2) v.tint = [255, 90 + 50 * Math.sin(t * 30), 20, 0.12 + 0.1 * Math.sin(t * 23)]; v.glow = Math.max(v.glow || 0, 0.18); }
  if (e.chillT > 0 && !(e.iceT > 0) && (!v.tint || v.tint[3] < 0.25)) { v.tint = [110, 190, 255, 0.22]; }
  if (e.iceT > 0) { v.tint = [110, 200, 255, 0.3]; v.glow = 0.06; v.legs = 0; v.wave = 0; v.lean = 0; v.skew = (v.skew || 0) * 0.2 + (e.iceT < 0.4 ? Math.sin(t * 50) * 0.03 : 0); v.flash = 0; v.rim = 1.6; }
  if (e.bleedT > 0 && (!v.tint || v.tint[3] < 0.15)) v.tint = [255, 20, 40, 0.1 + 0.06 * Math.sin(t * 9)];
  // up close a sprite fills the screen: scale tints / flashes / glow down so frozen or heavily-hit foes don't blow out
  const d = Math.hypot(e.x - P.x, e.y - P.y) / Math.max(1, e.h * 0.75), near = clamp((d - 0.8) / 3.2, 0, 1), kk = 0.3 + 0.7 * near;
  if (v.tint) v.tint = [v.tint[0], v.tint[1], v.tint[2], v.tint[3] * (e.state === 'windup' ? Math.max(kk, 0.75) : kk)];
  if (v.flash) v.flash *= 0.12 + 0.88 * near * near; if (v.glow) v.glow *= kk; if (v.rim > 1) v.rim = 1 + (v.rim - 1) * kk;
  return v;
}
// world-space flame / frost sprites on afflicted enemies
function rogueSprites(S, t) {
  for (const e of G.enemies) {
    if (!e.alive || e.hidden) continue;
    const nk = 0.35 + 0.65 * clamp((Math.hypot(e.x - P.x, e.y - P.y) - 0.6) / 2.4, 0, 1);
    if (e.burnT > 0) {
      const n = e.h > 1.8 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + t * 1.3 + e.t, r = e.r * 0.7, f = ((t * 12 + i * 1.7 + e.t) | 0) % 4, fl = 1 + Math.sin(t * 19 + i) * 0.12;
        const sz = (0.13 + 0.05 * (i % 2)) * clamp(e.h / 1.4, 0.7, 1.4) * Math.min(1, e.burnT / 0.5);
        S.push({ tex: 'flame' + f, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, z: e.z + e.h * (0.15 + 0.55 * ((i * 0.37) % 1)), w: sz * 0.7 * fl, h: sz * fl, lit: false, glow: 0.2, rim: 0 });
      }
      S.push({ tex: 'glow_w', x: e.x, y: e.y, z: e.z + e.h * 0.25, w: 1.1, h: 1.1, add: true, alpha: 0.22 * nk, lit: false, tint: [255, 110, 30, 1] });
    }
    if (e.iceT > 0 || e.chillT > 0) S.push({ tex: 'glow_w', x: e.x, y: e.y, z: e.z + e.h * 0.2, w: e.iceT > 0 ? 1.3 : 0.8, h: e.iceT > 0 ? 1.3 : 0.8, add: true, alpha: (e.iceT > 0 ? 0.4 : 0.2) * nk, lit: false, tint: [90, 200, 255, 1] });
    if (e.elite) { const tc = ELITES[e.elite[0]].tint; S.push({ tex: 'glow_w', x: e.x, y: e.y, z: e.z - 0.1, w: 1.2 + 0.1 * Math.sin(t * 4), h: 0.6, add: true, alpha: 0.3 * nk, lit: false, tint: [tc[0], tc[1], tc[2], 1] }); }
  }
}
// ---- pick 1 of 3 ----
function rollChoices(mini) {
  const avail = UPG.filter(u => u.ok() && (typeof isUnlocked !== 'function' || isUnlocked(u.id)));
  if (mini) { // elite spoils: 2 relics, rare or better
    const rel = avail.filter(u => u.kind === 'RELIC'); const out = [];
    const good = rel.filter(u => u.r !== 'common'); const pool = good.length >= 2 ? good : rel;
    while (out.length < 2 && pool.length) { const u = pool.splice((Math.random() * pool.length) | 0, 1)[0]; out.push(u); }
    return out;
  }
  const out = [];
  const weapons = avail.filter(u => u.kind === 'WEAPON');
  if (weapons.length && (RUN.stage === 1 || Math.random() < 0.5)) out.push(weapons[(Math.random() * weapons.length) | 0]);
  if (RUN.stage === 1 && weapons.length > 1) out.push(weapons.find(w => !out.includes(w)));   // first clear: show both new weapons
  let guard = 0;
  while (out.length < 3 && guard++ < 200) {
    const rest = avail.filter(u => !out.includes(u)); if (!rest.length) break;
    const tot = rest.reduce((a, u) => a + RARITY[u.r].w, 0); let r = Math.random() * tot;
    for (const u of rest) { r -= RARITY[u.r].w; if (r <= 0) { out.push(u); break; } }
  }
  return out.sort(() => Math.random() - 0.5);
}
function startPick(mini) {
  RUN.mini = !!mini; RUN.choices = rollChoices(mini); RUN.sel = 0; RUN.pickT = 0; RUN.picked = null;
  if (!RUN.choices.length) { RUN.mini = false; if (mini) { P.hp = P.maxhp; toast('THE RELIQUARY IS EMPTY', 'Healed to full instead.', '#ffd848', 2); return; } }
  G.state = 'pick'; releaseAll && releaseAll();
  if (document.exitPointerLock) document.exitPointerLock();
  if (!RUN.mini && SFX.since('abyss_descend') > 2) SFX.ev('level_clear', 1, ['secret']);
  SFX.play('secret');
}
function choose(i) {
  if (RUN.picked) return;
  const u = RUN.choices[i]; if (!u) return;
  RUN.picked = { u, t: 0, i }; u.take(); RUN.picks.push(u.id);
  SFX.play('pickup'); SFX.play('glint'); rumbleFx('parry');
  synergyToast(u);
}
function pickInput(rdt) {
  RUN.pickT += rdt;
  if (RUN.picked) { RUN.picked.t += rdt; if (RUN.picked.t > 0.9) { if (RUN.mini) { RUN.mini = false; G.state = 'play'; releaseAll && releaseAll(); } else nextStage(); } return; }
  if (RUN.pickT < 0.6) return;
  const n = RUN.choices.length;
  if (KP.ArrowLeft || KP.KeyA) { RUN.sel = (RUN.sel + n - 1) % n; SFX.play('swing', 0.25); }
  if (KP.ArrowRight || KP.KeyD) { RUN.sel = (RUN.sel + 1) % n; SFX.play('swing', 0.25); }
  if (KP.Digit1) choose(0); if (KP.Digit2) choose(1); if (KP.Digit3 && n > 2) choose(2);
  if (KP.Enter || KP.Space || KP.PadOK) choose(RUN.sel);
  if (MBP[0] && RUN.hover !== undefined && RUN.hover >= 0) choose(RUN.hover);
}
// mouse hover on the pick cards (HUD coordinates)
addEventListener('mousemove', e => {
  if (G.state !== 'pick' || !RUN.cards) return;
  const r = screen.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  RUN.hover = RUN.cards.findIndex(c => x >= c[0] && x < c[0] + c[2] && y >= c[1] && y < c[1] + c[3]);
  if (RUN.hover >= 0 && RUN.hover !== RUN.sel) { RUN.sel = RUN.hover; }
});
// synergy announcements (both halves owned)
function synergyToast(u) {
  for (const q of UPG) if (q.syn && RUN.picks.includes(q.id) && q.syn.has() && !(RUN.syns || (RUN.syns = [])).includes(q.syn.name)) {
    RUN.syns.push(q.syn.name); setTimeout(() => { toast('SYNERGY: ' + q.syn.name, q.name, '#ffd848', 3.5); SFX.play('secret', 0.5); }, 900);
  }
}
// relic pickups: secret-room reliquaries + elite spoils
function grantRandomRelic(minRare) {
  const rel = UPG.filter(u => u.kind === 'RELIC' && u.ok() && (typeof isUnlocked !== 'function' || isUnlocked(u.id)) && (!minRare || u.r !== 'common'));
  if (!rel.length) { P.hp = P.maxhp; toast('RELIQUARY', 'Healed to full.', '#ffd848', 2.5); return; }
  const tot = rel.reduce((a, u) => a + RARITY[u.r].w, 0); let r = Math.random() * tot, u = rel[0];
  for (const q of rel) { r -= RARITY[q.r].w; if (r <= 0) { u = q; break; } }
  u.take(); RUN.picks.push(u.id);
  G.bigText = { img: null, t1: u.name, t2: 'RELIC - ' + RARITY[u.r].n, t: 0, dur: 2.8 }; toast(u.desc, '', RARITY[u.r].c, 5);
  SFX.play('secret', 0.7); SFX.play('pickup'); rumbleFx('parry'); synergyToast(u);
}
PICK.reliq = { tex: 'p_reliq', h: 0.5, gc: [200, 80, 255], f(p) { grantRandomRelic(true); if (P.mods.coin) G.pickups.push(mkPickup('rose', p.x + 0.3, p.y)); if (typeof shardGain === 'function') shardGain(8, null); return true; } };
PICK.spoils = { tex: 'p_reliq', h: 0.62, gc: [255, 210, 60], f(p) { setTimeout(() => { if (G.state === 'play') startPick(true); }, 250); if (typeof shardGain === 'function') shardGain(6, null); return true; } };
function wrap(str, n) { const out = []; let line = ''; for (const w of str.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
function drawIcon(ctx, name, cx, cy, maxW, maxH) {
  const im = Engine.imgs[name]; if (!im) return;
  let sx = 0, sy = 0, sw = im.width, sh = im.height;
  if (name === 'vm_lwhip' || name === 'vm_lwhip_fire') { sx = 10; sy = 14; sw = 92; sh = 110; }
  let k = Math.min(maxW / sw, maxH / sh); if (k >= 1) k = Math.floor(k); else k = Math.max(0.25, k);
  const w = Math.round(sw * k), h = Math.round(sh * k);
  ctx.drawImage(im, sx, sy, sw, sh, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
}
function drawPick(ctx) {
  const t = G.t, a = Math.min(1, RUN.pickT * 2.5);
  ctx.fillStyle = `rgba(10,2,18,${0.78 * a})`; ctx.fillRect(0, 0, W, H);
  // drifting embers behind the cards
  for (let i = 0; i < 40; i++) { const x = (i * 97 + t * (10 + i % 7 * 3)) % W, y = H - ((i * 53 + t * (14 + i % 5 * 6)) % H); ctx.fillStyle = i % 3 === 0 ? 'rgba(160,80,255,0.5)' : i % 3 === 1 ? 'rgba(60,255,160,0.4)' : 'rgba(255,90,60,0.45)'; ctx.fillRect(x | 0, y | 0, 1, 1 + (i % 2)); }
  if (RUN.pickT < 0.25) return;
  text(ctx, RUN.mini ? 'ELITE SPOILS' : 'STAGE ' + RUN.stage + ' CLEARED', W / 2, 8, RUN.mini ? '#ffd848' : '#ffe080', 'center', 2);
  text(ctx, RUN.mini ? 'CLAIM ONE RELIC' : 'CHOOSE A BOON', W / 2, 28, '#d8b0ff', 'center');
  const n = RUN.choices.length, cw = 140, ch = 196, gap = 12, x0 = Math.round(W / 2 - (n * cw + (n - 1) * gap) / 2), y0 = 44;
  RUN.cards = [];
  RUN.choices.forEach((u, i) => {
    const R = RARITY[u.r], sel = i === RUN.sel, pk = RUN.picked;
    const intro = clamp((RUN.pickT - 0.25 - i * 0.1) / 0.25, 0, 1); if (intro <= 0) return;
    let x = x0 + i * (cw + gap), y = y0 + Math.round((1 - ease(intro)) * 40) - (sel && !pk ? 3 : 0);
    if (pk && pk.i !== i) { ctx.globalAlpha = Math.max(0, 1 - pk.t * 3); y += Math.round(pk.t * 40); }
    RUN.cards.push([x, y, cw, ch]);
    // glow + frame in rarity colours
    if (sel) { ctx.fillStyle = R.g; ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(t * 6); ctx.fillRect(x - 6, y - 6, cw + 12, ch + 12); ctx.globalAlpha = pk && pk.i !== i ? Math.max(0, 1 - pk.t * 3) : 1; }
    ctx.fillStyle = sel ? R.c : R.g; ctx.fillRect(x - 3, y - 3, cw + 6, ch + 6);
    ctx.fillStyle = '#12040e'; ctx.fillRect(x - 1, y - 1, cw + 2, ch + 2);
    const gr = ctx.createLinearGradient(0, y, 0, y + ch); gr.addColorStop(0, 'rgba(60,16,80,1)'); gr.addColorStop(0.55, 'rgba(24,6,34,1)'); gr.addColorStop(1, 'rgba(10,2,14,1)');
    ctx.fillStyle = gr; ctx.fillRect(x, y, cw, ch);
    for (const [cx, cy] of [[x - 3, y - 3], [x + cw, y - 3], [x - 3, y + ch], [x + cw, y + ch]]) { ctx.fillStyle = '#f0c040'; ctx.fillRect(cx, cy, 3, 3); }
    // rarity banner
    ctx.fillStyle = R.g; ctx.fillRect(x, y, cw, 12); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, cw, 1);
    text(ctx, R.n, x + cw / 2, y + 2, '#ffffff', 'center');
    // icon pedestal
    const iy = y + 50; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + cw / 2, iy + 30, 34, 5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.25 + (sel ? 0.15 * Math.sin(t * 5) : 0); const rg = ctx.createRadialGradient(x + cw / 2, iy, 2, x + cw / 2, iy, 40); rg.addColorStop(0, R.c); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(x, iy - 40, cw, 80); ctx.restore();
    drawIcon(ctx, u.icon, x + cw / 2, iy + (sel ? Math.sin(t * 3) * 2 : 0), u.kind === 'WEAPON' ? 120 : 44, u.kind === 'WEAPON' ? 70 : 44);
    // name + kind + description
    let ty = y + 92; ty += fitBlock(ctx, u.name, x + cw / 2, ty, cw - 12, 28, R.c, 'center', 1, 10);
    text(ctx, u.kind === 'WEAPON' ? (u.id.includes('whip') ? 'WHIP' : u.id === 'crossbow' ? 'RANGED WEAPON' : 'SWORD') : 'RELIC', x + cw / 2, ty + 1, u.kind === 'WEAPON' ? '#ffb060' : '#a0ffd0', 'center'); ty += 14;
    ctx.fillStyle = 'rgba(240,192,64,0.5)'; ctx.fillRect(x + 12, ty - 4, cw - 24, 1);
    { const foot = (u.syn && u.syn.has()) || u.kind === 'WEAPON'; fitBlock(ctx, u.desc, x + cw / 2, ty, cw - 4, (foot ? y + ch - 14 : y + ch - 3) - ty, '#ece0f4', 'center'); }
    if (u.syn && u.syn.has()) { text(ctx, '* ' + u.syn.name + ' *', x + cw / 2, y + ch - 11, '#ffd848', 'center'); }
    else if (u.kind === 'WEAPON') { const cur = u.id.includes('sword') || u.id === 'rapier' ? 'sword' : u.id.includes('whip') ? 'whip' : 'ranged'; text(ctx, 'replaces ' + cur, x + cw / 2, y + ch - 11, '#a088b8', 'center'); }
    if (G.inputMode !== 'pad') text(ctx, String(i + 1), x + 3, y + 14, '#806898');
    if (pk && pk.i === i) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - pk.t * 1.5); ctx.fillStyle = R.c; ctx.fillRect(x, y, cw, ch); ctx.restore(); }
    ctx.globalAlpha = 1;
  });
  if (!RUN.picked && RUN.pickT > 0.6) {
    if (G.inputMode === 'pad') promptRow(ctx, ['{DPAD}', ' choose   ', '{cross}', ' take'], W / 2, H - 10, '#e8e0f0', 'center');
    else text(ctx, 'A/D or ARROWS choose   ENTER / CLICK / 1-3 take', W / 2, H - 10, '#e8e0f0', 'center');
  }
}
// ---- run HUD: stage + owned boons (top-left) ----
function drawRunHUD(ctx) {
  if (!RUN.on) return;
  const th = curTheme();
  goldFrame(ctx, 4, 4, 60, 13, RUN.stage === 1 ? '#c060ff' : RUN.cfg.theme === 'crypt' ? '#30e090' : '#ff3050');
  if (!(typeof abyssDepth === 'function' && abyssDepth())) text(ctx, 'STAGE ' + RUN.stage, 34, 7, '#ffe080', 'center');
  RUN.shardFlash = Math.max(0, (RUN.shardFlash || 0) - 1 / 60);
  drawIcon(ctx, 'p_shard', 72, 10.5, 9, 9); text(ctx, String(RUN.shardsRun || 0), 79, 7, RUN.shardFlash > 0.3 ? '#ffffff' : '#e0a0ff');
  let x = 6; const y = 22;
  const own = [];
  if (P.wpn.sword === 'frost') own.push(['ic_frostsword', '#60d0ff']);
  if (P.wpn.sword === 'storm') own.push(['ic_stormsword', '#c080ff']);
  if (P.wpn.sword === 'rapier') own.push(['ic_rapier', '#ff4060']);
  if (P.wpn.whip === 'fire') own.push(['ic_firewhip', '#ff9a30']);
  if (P.wpn.whip === 'chain') own.push(['ic_chainwhip', '#c0c8e0']);
  if (P.wpn.ranged === 'crossbow') own.push(['ic_crossbow', '#d0a0ff']);
  if (P.wpn.sword === 'crimson') own.push(['ic_crimsonsword', '#ff3050']);
  if (P.wpn.sword === 'skull') own.push(['ic_skullblade', '#ffd040']);
  if (P.wpn.whip === 'blood') own.push(['ic_bloodwhip', '#ff2040']);
  const cnt = {}; for (const id of RUN.picks) cnt[id] = (cnt[id] || 0) + 1;
  for (const id in cnt) { const u = UPG.find(q => q.id === id); if (u && u.kind !== 'WEAPON') own.push([u.icon, RARITY[u.r].c, cnt[id]]); }
  for (const [ic, col, n] of own) {
    ctx.fillStyle = 'rgba(18,4,24,0.7)'; ctx.fillRect(x, y, 14, 14); ctx.fillStyle = col; ctx.fillRect(x, y, 14, 1); ctx.fillRect(x, y + 13, 14, 1);
    drawIcon(ctx, ic, x + 7, y + 7, 13, 13);
    if (n > 1) text(ctx, String(n), x + 12, y + 8, '#ffffff');
    x += 16;
  }
}
// elite name plates (drawn in HUD space)
function drawElitePlates(ctx, cam) {
  const placed = [];   // M7c: nearest 3 elites only, so a pack of them can't bury the screen in nameplates
  const near = G.enemies.filter(e => e.alive && e.elite && !e.hidden && Math.hypot(e.x - P.x, e.y - P.y) <= 7).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
  let shown = 0;
  for (const e of near) {
    if (shown >= 3) break;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (!losTo(P.x, P.y, e.x, e.y)) continue;
    const pr = project(cam, e.x, e.y, e.z + e.h + 0.35); if (!pr) continue; shown++;
    const nm = e.elite.map(m => ELITES[m].n).join(' '); ctx.globalAlpha = Math.min(1, (7 - d) / 2);
    // M7c: keep the plate below the top HUD row and out from under another elite's plate
    let py = Math.max(48, Math.min(H - 60, pr.y)); const nw = nm.length * 8;
    for (let k = 0; k < 8; k++) { const hit = placed.find(q => Math.abs(q[0] - pr.x) < (q[1] + nw) / 2 + 4 && Math.abs(q[2] - py) < 17); if (!hit) break; py = hit[2] + 17; }
    placed.push([pr.x, nw, py]);
    text(ctx, nm, pr.x, py - 10, ELITES[e.elite[0]].c, 'center');
    const w = 36; ctx.fillStyle = '#12040e'; ctx.fillRect(Math.round(pr.x - w / 2) - 1, Math.round(py) - 1, w + 2, 4); ctx.fillStyle = ELITES[e.elite[0]].c; ctx.fillRect(Math.round(pr.x - w / 2), Math.round(py), Math.round(w * e.hp / e.maxhp), 2);
    ctx.globalAlpha = 1;
  }
}
// ---- results (run over) ----
function startResults() {
  RUN.kills += G.kills; RUN.time += G.time; G.kills = 0; G.time = 0;
  if (typeof bankRun === 'function') bankRun();
  else if (RUN.stage > RUN.best) { RUN.best = RUN.stage; RUN.newBest = true; try { localStorage.setItem('tu_play_m7d_best', RUN.best); } catch (e) {} } else RUN.newBest = false;
  G.state = 'results'; RUN.resT = 0;
}
function resultsInput(rdt) {
  RUN.resT += rdt;
  if (RUN.resT > 1.2 && (KP.Enter || KP.Space || MBP[0] || KP.PadOK || KP.PadStart)) { if (typeof enterHub === 'function') enterHub(); else newRun(); }
  if (RUN.resT > 1.2 && (KP.Escape || KP.PadBack)) { RUN.on = false; RUN.hub = false; G.state = 'title'; applyThemeDefault(); }
}
function applyThemeDefault() { RUN.cfg = stageCfg(1); applyTheme(); buildLevel(curTheme()); }
function drawResults(ctx) {
  const a = Math.min(1, RUN.resT * 1.5);
  ctx.fillStyle = `rgba(40,0,8,${0.85 * a})`; ctx.fillRect(0, 0, W, H);
  if (RUN.resT < 0.3) return;
  const im = Engine.imgs.txt_dead; ctx.drawImage(im, Math.round(W / 2 - im.width / 2), 6);
  text(ctx, 'THE RUN ENDS', W / 2, 6 + im.height + 2, '#ffb0b0', 'center');
  let y = 6 + im.height + 20; const L = (k, v, c = '#fff') => { text(ctx, k, 150, y, '#f0c040', 'right'); text(ctx, v, 164, y, c); y += 13; };
  const tm = RUN.time | 0;
  L('REACHED', 'STAGE ' + RUN.stage + '  -  ' + curTheme().name, '#e0b0ff');
  L('BEST', 'STAGE ' + RUN.best + (RUN.newBest ? '   NEW RECORD!' : ''), RUN.newBest ? '#ffe080' : '#d0c0d0');
  L('TIME', ((tm / 60) | 0) + ':' + String(tm % 60).padStart(2, '0'));
  L('KILLS', String(RUN.kills), '#ffb0b0');
  L('ELITES SLAIN', String(RUN.elites), '#ff9a60');
  if (typeof SAVE !== 'undefined') L('SHARDS', '+' + (RUN.banked || 0) + '   (' + SAVE.shards + ' banked)', '#e0a0ff');
  L('SLAIN BY', RUN.cause || 'the dark', '#ff8090');
  y += 4; text(ctx, 'BOONS', W / 2, y, '#a0ffd0', 'center'); y += 12;
  const ids = RUN.picks; const iw = 18, x0 = Math.round(W / 2 - (ids.length * iw) / 2);
  if (!ids.length) text(ctx, 'none', W / 2, y + 2, '#806878', 'center');
  ids.forEach((id, i) => { const u = UPG.find(q => q.id === id); ctx.fillStyle = RARITY[u.r].g; ctx.fillRect(x0 + i * iw, y, 16, 16); ctx.fillStyle = '#12040e'; ctx.fillRect(x0 + i * iw + 1, y + 1, 14, 14); drawIcon(ctx, u.icon, x0 + i * iw + 8, y + 8, 14, 14); });
  if (RUN.resT > 1.2 && (G.t * 2 | 0) % 2 === 0) { if (G.inputMode === 'pad') promptRow(ctx, ['{cross}', ' THE CHAPEL    ', '{circle}', ' TITLE'], W / 2, H - 16, '#ffffff', 'center'); else text(ctx, 'ENTER - RETURN TO THE CHAPEL     ESC - TITLE', W / 2, H - 16, '#ffffff', 'center'); }
}
GAME.RUN = RUN; GAME.rogue = { newRun, nextStage, startPick, choose, stageCfg, makeElite, UPG, startResults, grantRandomRelic, stormArc };
