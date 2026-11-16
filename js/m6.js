'use strict';
// ===== M6: stage 6 THE BLOOD ARENA (Minotaur + champion waves), stage 7 THE WITCH'S NECROPOLIS (Necromancer Witch),
// the Bloodstained Battle Axe, 3 relics, crypt variants + boss registry. Endless Descent starts after stage 7. =====
const BOSSREG = {};          // bossType -> { intro(b), update(e, dt), gate: checkpoint text }
const CRYPT_VARIANTS = {};   // theme.variant -> generator dressing (see crypt.js)
EDEF.gladiator = { spr: 's_gladiator', h: 1.9, hp: 150, speed: 1.45, range: 1.75, windup: 0.72, strike: 0.2, recover: 0.75, dmg: 19, mat: 'flesh', kbRes: 0.4, armor: 0.55, name: 'an Arena Champion' };
EDEF.acolyte = { spr: 's_acolyte', h: 1.62, hp: 46, speed: 1.6, range: 9, windup: 0.8, strike: 0.1, recover: 1.4, dmg: 13, mat: 'flesh', kbRes: 1, ranged: true, keep: 5.2, skulls: true, name: 'a Necro Acolyte' };
EDEF.wclone = { spr: 's_witch', h: 2.7, hp: 34, speed: 1.4, range: 10, windup: 0.95, strike: 0.1, recover: 1.7, dmg: 10, mat: 'ecto', kbRes: 0.5, ranged: true, keep: 6, skulls: true, name: 'a Witch Illusion' };
EDEF.minotaur = { spr: 's_minotaur', h: 3.05, hp: 2050, speed: 2.0, range: 3.0, windup: 0.7, strike: 0.25, recover: 0.7, dmg: 24, mat: 'flesh', kbRes: 0.04, boss: true, title: 'THE MINOTAUR OF THE BLOOD ARENA' };
EDEF.witch = { spr: 's_witch', h: 2.75, hp: 1850, speed: 2.2, range: 2.4, windup: 0.7, strike: 0.25, recover: 0.7, dmg: 20, mat: 'flesh', kbRes: 0.06, boss: true, title: 'MORWEN, THE NECROMANCER WITCH' };
const UNDEAD = new Set(['zombie', 'fzombie', 'azombie', 'skeleton', 'ghost', 'acolyte', 'wclone', 'vknight', 'colossus']);
THEMES.arena = {
  name: 'THE BLOOD ARENA', sub: 'Sand, chains & champions', variant: 'arena', map: 'crypt', boss: 'minotaur', music: 'arena',
  haze: [112, 40, 96], ambient: [0.5, 0.4, 0.58], torch: 'orange',
  light: c => (c[0] > 0.9 && c[1] < 0.3 && c[2] < 0.4) ? [0.75, 0.3, 1.0] : c,
  grade: { sh: [0.08, 0.0, 0.12], hi: [0.06, 0.04, -0.02] },
  pool: [['gladiator', 1.5], ['imp', 2], ['skeleton', 1.8], ['azombie', 1.1], ['fzombie', 1.5], ['bat', 0.9]],
};
THEMES.necropolis = {
  name: "THE WITCH'S NECROPOLIS", sub: 'Mausoleums, bog-light & the restless dead', variant: 'necropolis', map: 'crypt', boss: 'witch', music: 'necropolis', sky: 'sky_necro',
  haze: [70, 46, 120], ambient: [0.44, 0.52, 0.62], torch: 'green',
  light: c => (c[0] > c[1] && c[0] > c[2] && c[0] > 0.8) ? [0.75, 0.3, 1.0] : c,
  grade: { sh: [0.04, 0.05, 0.13], hi: [0.02, 0.06, 0.02] },
  pool: [['acolyte', 2], ['zombie', 1.8], ['fzombie', 1.4], ['ghost', 1.4], ['skeleton', 1.5], ['bat', 0.8]],
};
const M6_ORDER = ['crypt', 'ossuary', 'courtyard', 'belfry', 'arena', 'necropolis'];
const M6_LAST = 7; // last hand-built stage; Endless Descent starts after it
const _stageCfg6 = stageCfg;
stageCfg = function (n) {
  const c = _stageCfg6(n);
  c.theme = n === 1 ? 'nave' : n === 2 ? 'crypt' : n === 3 ? 'ossuary' : n === 4 ? 'courtyard' : n === 5 ? 'belfry' : n === 6 ? 'arena' : n === 7 ? 'necropolis' : M6_ORDER[(n - 8) % 6];
  c.endless = n > M6_LAST ? n - M6_LAST : 0; c.boss = null;
  return c;
};
GAME.rogue.stageCfg = stageCfg;
stageIntro = function () {
  const th = curTheme();
  G.bigText = { t1: 'STAGE ' + RUN.stage, t2: th.name, dur: 3.2, t: 0 };
  const S = { spider: 'Down into the catacombs. Something breeds in the dark.', colossus: 'The bone halls run red. Something vast is made of the dead here.', alphawolf: 'Open sky, full moon. Something hunts the hedges. (Silver burns it.)', matriarch: 'The bells have not rung in a century. Mind the statues.', minotaur: 'The crowd is long dead, but the games go on. Survive the champions.', witch: 'Green fire over the graves. The dead here do not stay down.' };
  const sub = RUN.stage === 1 ? 'The Lich King has claimed the Black Reliquary. Take it back.' : RUN.cfg.endless ? 'ENDLESS DESCENT ' + RUN.cfg.endless + ' - the lieutenants return, stronger. (More stages coming.)' : (S[th.boss] || '');
  const col = RUN.stage === 1 ? '#ffe080' : { spider: '#90ff90', alphawolf: '#c8b8ff', matriarch: '#ffc890', minotaur: '#ff7060', witch: '#90ffb0' }[th.boss] || '#ff8090';
  toast(th.sub.toUpperCase(), sub, col, 4);
};
// death screen: name whatever killed you
const _playerDie6 = playerDie;
playerDie = function () { _playerDie6(); if (RUN.cause === 'dark magic' && EDEF[G.lastHit]) RUN.cause = EDEF[G.lastHit].title || EDEF[G.lastHit].name || RUN.cause; };

// ---------------- crypt variants ----------------
CRYPT_VARIANTS.arena = {
  tall: true,
  tex: (T, def) => ({
    floor: [T.f_sand, T.f_bloodsand, T.f_grate, T.f_bloodsand, T.t_stone2, T.f_sand, T.f_blood],
    ceil: [T.c_iron, T.c_vault],
    walls: [def('a_wall'), def('a_wall2'), def('a_loose'), def('a_pillar'), def('a_wall', ['a_chain', 0.4, 3.4]), def('a_wall2', ['a_rack', 0.3, 3.2]),
      def('a_crack'), def('t_gate'), def('t_sarc'), def('a_wall2'), def('a_wall', ['t_banner', 0.8, 3.4]), def('t_stone2'), def('a_false')],
  }),
  styles: ['pit', 'cages', 'armory', 'pillars', 'pit', 'cages', 'bloodsand'],
  dress(r, w, h, C) {
    const cx = (r.x0 + r.x1) / 2 + 0.5, cy = (r.y0 + r.y1) / 2 + 0.5;
    if (r.style === 'pit') { // a sunken spike pit behind an iron grate rim
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) { FH[i] = -0.3; FT[i] = 2; } }
      for (let k = 0; k < 3 + C.ri(0, 2); k++) { const [x, y] = C.freeCell(r, 1); C.props.push({ type: 'spikes', x, y, z: -0.3 }); }
      C.L.push({ x: cx, y: cy, r: 4.6, i: 1.0, c: [1.0, 0.16, 0.3] });
    } else if (r.style === 'cages') { // gibbets hanging from the iron ceiling, blood pooled beneath
      for (let k = 0; k < 2 + C.ri(0, 2); k++) { const [x, y] = C.freeCell(r, 1); C.props.push({ type: 'cage', x, y, z: r.ch - 1.9, a: C.R() * 6 }); const i = C.idx(Math.floor(x), Math.floor(y)); FT[i] = 6; }
      C.L.push({ x: cx, y: cy, r: 4.8, i: 0.95, c: [0.75, 0.3, 1.0] });
    } else if (r.style === 'armory') {
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i] && (x + y) % 3 === 0) FT[i] = 2; }
      C.props.push({ type: 'brazier', x: cx, y: cy, z: 0, green: false }); C.L.push({ x: cx, y: cy, r: 5, i: 1.1, c: C.ORG, flicker: true });
    } else if (r.style === 'bloodsand') {
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) FT[i] = C.R() < 0.6 ? 3 : 0; }
      for (let k = 0; k < 4; k++) { const [x, y] = C.freeCell(r, 0); C.props.push({ type: 'bones', x, y, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 4.8, i: 1.0, c: [1.0, 0.2, 0.3] });
    }
  },
  arena(C, gx, AX0, AX1, AY0, AY1) { // the killing floor: sand, a blood-soaked ring, a grate at the centre, gibbets overhead
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { const i = C.idx(x, y); if (SOLID[i]) continue; const d = Math.hypot((x + 0.5 - 25) / 1.6, y + 0.5 - 5.5); FT[i] = d < 1.6 ? 2 : Math.abs(d - 4) < 0.8 || C.R() < 0.15 ? 3 : 0; }
    for (const [x, y] of [[19.5, 3], [30.5, 3], [19.5, 8], [30.5, 8], [25, 1.8]]) C.props.push({ type: 'cage', x, y, z: 3.3, a: C.R() * 6 });
    for (let k = 0; k < 7; k++) C.props.push({ type: 'spikes', x: C.pick([13.2, 14.0, 36.0, 36.8]), y: rand(2.5, 9.5), z: 0 });
    C.L.push({ x: 25, y: 5.5, r: 9, i: 0.8, c: [1.0, 0.2, 0.3] }); C.L.push({ x: 25, y: 2, r: 5, i: 0.6, c: [0.8, 0.3, 1.0] });
  },
  wall: (st, h) => st === 'arena' ? [4, 5, 10, 1, 0][h % 5] : st === 'secret' ? 1 : st === 'corr' ? (h % 4 === 0 ? 4 : 0) : st === 'armory' ? [5, 1, 5, 0][h % 4] : st === 'cages' ? [4, 0, 1, 4][h % 4] : [0, 1, 4, 0, 5, 0, 10][h % 7],
  elite: ['gladiator', 'gladiator', 'imp', 'azombie'],
  snames: ["The Lanista's Purse", 'The Dead Champion', 'The Beast Pens', 'The Bloody Sand Shrine', "The Gladiator's Cell", 'The Spoliarium', 'The Iron Maiden'],
  vnames: ['The Victor\'s Vault', 'The Emperor\'s Box'],
  looseText: 'A rusted grate... something glints behind it.',
};
CRYPT_VARIANTS.necropolis = {
  sky: true, lowWT: 255,
  tex: (T, def) => ({
    floor: [T.f_soil, T.f_path, T.f_path, T.f_bog, T.f_path, T.f_marble, T.f_blood],
    ceil: [T.c_necro, T.c_vault],
    walls: [def('n_wall'), def('n_wall2'), def('n_loose'), def('k_pillar'), def('n_wall', ['n_door', 0, 2.9]), def('n_wall2'),
      def('n_crack'), def('t_gate'), def('t_sarc'), def('n_wall2'), def('n_wall', ['t_statue', 0, 2.9]), def('t_stone2'), def('n_false')],
  }),
  styles: ['mausoleum', 'ritual', 'bog', 'crosses', 'mausoleum', 'bog', 'crosses'],
  dress(r, w, h, C) {
    const cx = (r.x0 + r.x1) / 2 + 0.5, cy = (r.y0 + r.y1) / 2 + 0.5;
    if (r.style === 'mausoleum') { // stone coffins in rows, a path down the middle
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) FT[i] = 1; }
      const n = w >= 6 ? 2 : 1; for (let k = 0; k < n; k++) { const x = r.x0 + 1 + k * 3 + (w >= 6 ? 0 : Math.floor((w - 3) / 2)), y = C.ri(r.y0 + 1, r.y1 - 2); for (const yy of [y, y + 1]) { const i = C.idx(x, yy); if (!SOLID[i]) { FH[i] = 0.72; FT[i] = 2; WT[i] = 8; } } }
      C.L.push({ x: cx, y: cy, r: 4.6, i: 0.9, c: [0.75, 0.3, 1.0] });
    } else if (r.style === 'ritual') { // a bubbling cauldron inside a circle of candles
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i] && Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - 1.6) < 0.6) FT[i] = 1; }
      C.props.push({ type: 'cauldron', x: cx, y: cy, z: 0 });
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; const x = cx + Math.cos(a) * 1.6, y = cy + Math.sin(a) * 1.6; if (!SOLID[C.idx(Math.floor(x), Math.floor(y))]) C.props.push({ type: 'candelabra', x, y, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 5, i: 1.15, c: [0.3, 1.0, 0.45], flicker: true });
    } else if (r.style === 'bog') { // sunken green bog-water, crosses leaning out of it
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) { FH[i] = -0.22; FT[i] = 3; } }
      for (let k = 0; k < 3; k++) { const [x, y] = C.freeCell(r, 0); C.props.push({ type: 'cross', x, y, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 4.8, i: 1.0, c: [0.3, 1.0, 0.5] });
    } else if (r.style === 'crosses') {
      for (let k = 0; k < 4 + C.ri(0, 3); k++) { const [x, y] = C.freeCell(r, 0); C.props.push({ type: C.R() < 0.5 ? 'cross' : 'grave', x, y: y - 0.3, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 4.6, i: 0.85, c: [0.35, 1.0, 0.6] });
    }
  },
  arena(C, gx, AX0, AX1, AY0, AY1) { // the witch's garden of graves: soil, a path cross, a cauldron at the head, green bog-light
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { const i = C.idx(x, y); if (SOLID[i]) continue; FT[i] = Math.abs(x - 24.5) < 1.6 || Math.abs(y - 5.5) < 1.1 ? 1 : (x <= AX0 + 1 || x >= AX1 - 1) ? 3 : 0; }
    for (let k = 0; k < 8; k++) C.props.push({ type: C.R() < 0.5 ? 'cross' : 'grave', x: C.pick([13.3, 14.2, 35.8, 36.7, 20, 30]), y: rand(2.2, 9.6), z: 0 });
    C.props.push({ type: 'cauldron', x: 25, y: 1.9, z: 0 });
    C.L.push({ x: 25, y: 5.5, r: 9, i: 0.8, c: [0.3, 1.0, 0.5] }); C.L.push({ x: 25, y: 2, r: 5, i: 1.0, c: [0.75, 0.3, 1.0] });
  },
  wall: (st, h) => st === 'arena' ? [10, 4, 1, 0, 9][h % 5] : st === 'secret' ? 1 : st === 'corr' ? (h % 3 === 0 ? 1 : 0) : st === 'mausoleum' ? [4, 1, 0, 4, 9][h % 5] : [0, 1, 0, 10, 1, 0, 4][h % 7],
  elite: ['acolyte', 'ghost', 'azombie', 'skeleton'],
  snames: ['The Ossuary Niche', "The Gravedigger's Hut", 'The Weeping Tomb', 'The Witch\'s Larder', 'The Sunken Crypt', 'The Bone Garden', 'The Corpse Candle'],
  vnames: ['The Coven Vault', 'The Black Sepulchre'],
  looseText: 'Moss chokes these stones... they shift when you lean on them.',
};
// ---------------- enemies: gladiators block from the front; acolytes and illusions throw green skulls ----------------
const _enemyStrike6 = enemyStrike;
enemyStrike = function (e) {
  if (e.d.skulls) {
    const ez = e.z + e.h * 0.62, dist = Math.hypot(P.x - e.x, P.y - e.y), ang = Math.atan2(P.y - e.y, P.x - e.x), sp = 6.2;
    G.projectiles.push({ type: 'fireball', x: e.x, y: e.y, z: ez, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: ((P.z + 1.0) - ez) / Math.max(0.5, dist) * sp, dmg: e.d.dmg, owner: e, life: 4, spr: skullSpr });
    SFX.play('ghost', 0.5); return;
  }
  _enemyStrike6(e);
};
function skullSpr(p, t) { if (Math.random() < 0.5) addP({ k: 'ember', x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0.5, size: 0.04, col: RGB(110, 255, 120), life: 0.35 }); return { tex: 'skullgreen', x: p.x, y: p.y, z: p.z - 0.2, w: 0.42, h: 0.46, lit: false, glow: 0.6, skew: Math.sin(t * 20) * 0.05, tint: p.reflected ? [255, 200, 80, 0.4] : null }; }
const _dmgIn6 = rogueDmgIn;
rogueDmgIn = function (e, dmg, o) {
  if (P.wpn && P.wpn.sword === 'axe' && o.src === 'sword' && !o.dot) { if (e.d.armor) dmg /= e.d.armor; if (e.armorMul) dmg /= e.armorMul; }   // the axe sunders armour
  dmg = _dmgIn6(e, dmg, o);
  if (o.dot) return dmg;
  if (e.type === 'gladiator' && e.alive && (o.src === 'sword' || o.src === 'whip') && !o.heavy && e.state !== 'strike' && e.stagger <= 0) { // shield up, facing you
    if (Math.random() < 0.55) { dmg *= 0.35; sparks(e.x, e.y, e.z + e.h * 0.55, 8, RGB(255, 220, 150)); dmgNum(e.x, e.y, e.z + e.h + 0.3, 'BLOCK', '#ffd8a0'); SFX.play('block', 0.5); } }
  if (P.mods && P.mods.gravedirt && (UNDEAD.has(e.type) || (e.d.mat === 'bone'))) dmg *= 1.3;
  return BOSSDMG[e.type] ? BOSSDMG[e.type](e, dmg, o) : dmg;
};
const BOSSDMG = {};
// gladiators stride in shield-first and swing a heavy mace overhead
const _visual6 = rogueVisual;
rogueVisual = function (e, v) {
  v = _visual6(e, v); if (!v || e.dead && !BOSSVIS[e.type]) return v;
  if (e.type === 'gladiator' && !e.dead) {
    if (e.state === 'windup') { const k = clamp(e.st / e.d.windup, 0, 1); v.h *= 1 + 0.08 * k; v.lean = -0.25 * k; v.tint = [255, 120, 60, 0.15 + 0.25 * k]; }
    else if (e.state === 'strike') { v.lean = 0.4; v.h *= 0.95; }
  } else if (e.type === 'acolyte' && !e.dead) { v.wave = 0.03; v.waveF = 4; v.waveP = e.t * 3; if (e.state === 'windup') { v.glow = 0.4 * clamp(e.st / e.d.windup, 0, 1); v.tint = [120, 255, 140, 0.25 * clamp(e.st / e.d.windup, 0, 1)]; } }
  else if (e.type === 'wclone' && !e.dead) { v.alpha = 0.55 + 0.15 * Math.sin(e.t * 7); v.tint = [120, 255, 160, 0.3]; v.wave = 0.04; v.waveP = e.t * 4; }
  if (BOSSVIS[e.type]) v = BOSSVIS[e.type](e, v);
  return v;
};
const BOSSVIS = {};
// ---------------- props + boss extras ----------------
const _sprites6 = rogueSprites;
rogueSprites = function (S, t) {
  _sprites6(S, t);
  for (const pr of (LEVEL.props || [])) {
    if (pr.type === 'cage') { const sw = Math.sin(t * 1.3 + pr.a) * 0.06; S.push({ tex: 'p_cage', x: pr.x + sw, y: pr.y, z: pr.z, w: 0.62, h: 1.6, skew: sw * 0.8 }); }
    else if (pr.type === 'cauldron') { S.push({ tex: 'p_cauldron', x: pr.x, y: pr.y, z: pr.z, w: 1.0, h: 1.55 }); S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z + 0.9, w: 1.6, h: 1.2, add: true, alpha: 0.28 + 0.08 * Math.sin(t * 6 + pr.x), lit: false, tint: [90, 255, 120, 1] }); if (Math.random() < 0.25) addP({ k: 'ecto', x: pr.x + rand(-0.3, 0.3), y: pr.y + rand(-0.3, 0.3), z: pr.z + 1.0, vx: 0, vy: 0, vz: rand(0.6, 1.4), size: 0.06, col: RGB(120, 255, 140), life: 0.8 }); }
    else if (pr.type === 'cross') S.push({ tex: 'p_cross', x: pr.x, y: pr.y, z: floorAt(pr.x, pr.y), w: 0.5, h: 0.92 });
    else if (pr.type === 'spikes') S.push({ tex: 's_spike', x: pr.x, y: pr.y, z: pr.z, w: 0.5, h: 0.62, tint: [120, 20, 30, 0.35] });
  }
  for (const k in BOSSSPR) BOSSSPR[k](S, t);
};
const BOSSSPR = {};
const _deathTick6 = beastDeathTick;
beastDeathTick = function (e) { _deathTick6(e); if (BOSSDEATH[e.type]) BOSSDEATH[e.type](e); };
const BOSSDEATH = {};
// the boss door: per-boss ticks while the gate is sealed (the Minotaur's games run before he shows himself)
const _cryptDoors6 = cryptDoors;
cryptDoors = function (dt) { _cryptDoors6(dt); for (const k in BOSSTICK) BOSSTICK[k](dt); };
const BOSSTICK = {};
const _newStage6 = m5NewStage;
m5NewStage = function () { _newStage6(); G.games = null; const b = G.boss; if (b && BOSSREG[b.type] && BOSSREG[b.type].setup) BOSSREG[b.type].setup(b); };

// ---------------- weapon + relics ----------------
SWSPR.axe = ['vm_sword_axe', 'vm_sword_axe_glow']; SWTRAIL.axe = ['#ff2030', '#ffc8c8'];
const SWDMG = { axe: 1.6 }, SWSPD = { axe: 0.75 };
const M6W = [
  { id: 'battleaxe', kind: 'WEAPON', r: 'epic', name: 'BLOODSTAINED BATTLE AXE', icon: 'ic_axe', desc: '+60% damage, 25% slower. SUNDERS armor. Heavy strikes CLEAVE every foe in front of you.', ok: () => P.wpn.sword !== 'axe', take() { P.wpn.sword = 'axe'; } },
];
const M6R = [
  { id: 'laurel', r: 'rare', name: "CHAMPION'S LAUREL", desc: 'Every elite or champion you kill: +5 max health (up to +30 this run).', take() { P.mods.laurel = 1; P.mods.laurelHp = 0; } },
  { id: 'phylactery', r: 'rare', name: 'PHYLACTERY SHARD', desc: '15% of kills release a hungry soul that seeks the nearest foe (34 damage).', take() { P.mods.phyl = 1; } },
  { id: 'gravedirt', r: 'common', name: 'GRAVE DIRT', desc: 'The undead take +30% damage. Killing one heals 3.', take() { P.mods.gravedirt = 1; } },
];
for (const r of M6R) { r.kind = 'RELIC'; r.icon = 'ic_' + r.id; const k = { laurel: 'laurel', phylactery: 'phyl', gravedirt: 'gravedirt' }[r.id]; r.ok = () => !P.mods[k]; }
UPG.push(...M6W, ...M6R);
if (typeof ALTAR !== 'undefined') {
  const add = [
    { tab: 0, id: 'battleaxe', cost: 60 }, { tab: 1, id: 'laurel', cost: 40 }, { tab: 1, id: 'phylactery', cost: 45 }, { tab: 1, id: 'gravedirt', cost: 35 },
    { tab: 2, id: 'ld_axe', slot: 'sword', val: 'axe', need: 'battleaxe', cost: 55, name: 'START: BATTLE AXE', icon: 'ic_axe' },
  ];
  for (const it of add) { const at = ALTAR.items.findIndex(q => q.tab > it.tab); ALTAR.items.splice(at < 0 ? ALTAR.items.length : at, 0, it); if (it.tab <= 1) LOCKED.add(it.id); }
}
const _onHit6 = rogueOnHit;
rogueOnHit = function (e, o, dmg) {
  _onHit6(e, o, dmg);
  if (o.dot || o.cleave) return;
  if (o.heavy && o.src === 'sword' && P.wpn.sword === 'axe' && G.t - (P.cleaveT || -9) > 0.15) { // CLEAVE
    P.cleaveT = G.t; let n = 0;
    for (const q of G.enemies) {
      if (q === e || !q.alive || q.hidden) continue; const dx = q.x - P.x, dy = q.y - P.y, d = Math.hypot(dx, dy);
      if (d < 2.6 && Math.abs(angDiff(Math.atan2(dy, dx), P.ang)) < 1.0) { n++; damageEnemy(q, Math.max(10, (dmg || 30) * 0.7), { dx: dx / d, dy: dy / d, kb: 2.5, heavy: true, src: 'cleave', cleave: true, col: '#ff4050' }); }
    }
    if (n) { dmgNum(e.x, e.y, e.z + e.h + 0.7, 'CLEAVE x' + (n + 1), '#ff4050'); SFX.play('gib', 0.5); G.shake += 3; }
  }
};
const _onKill6 = rogueOnKill;
rogueOnKill = function (e) {
  _onKill6(e);
  if (P.mods.gravedirt && UNDEAD.has(e.type)) P.hp = Math.min(P.maxhp, P.hp + 3);
  if (P.mods.laurel && (e.elite || e.type === 'gladiator') && !e.summoned && (P.mods.laurelHp || 0) < 30) { P.mods.laurelHp = (P.mods.laurelHp || 0) + 5; P.maxhp += 5; P.hp += 5; dmgNum(e.x, e.y, e.z + e.h + 0.8, '+5 MAX HP', '#ffd848'); }
  if (P.mods.phyl && Math.random() < 0.15) soulWisp(e.x, e.y, e.z + e.h * 0.6);
};
function soulWisp(x, y, z) {
  let tg = null, bd = 12; for (const q of G.enemies) { if (!q.alive || q.hidden) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; tg = q; } }
  if (!tg) return;
  const a = Math.atan2(tg.y - y, tg.x - x), sp = 7, dz = (tg.z + tg.h * 0.5 - z) / Math.max(0.5, bd) * sp;
  G.projectiles.push({ type: 'wisp', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: dz, dmg: 0, reflected: true, life: 3, spr: (p, t) => { if (Math.random() < 0.6) addP({ k: 'ecto', x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0.3, size: 0.05, col: RGB(140, 255, 170), life: 0.4 }); return { tex: 'glow_w', x: p.x, y: p.y, z: p.z - 0.2, w: 0.45, h: 0.45, add: true, alpha: 0.9, lit: false, tint: [120, 255, 160, 1] }; } });
  SFX.play('ghost', 0.4);
}
