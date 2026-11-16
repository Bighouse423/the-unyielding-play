'use strict';
// ===== M7: the run is complete. Stage 8 THE HELLFORGE KENNELS (Cerberax), stage 9 THE RUINED CATHEDRAL (Sir Valcor),
// stage 10 THE LICH'S THRONE (the Lich King, 3 phases) -> VICTORY + credits -> "Descend further" into THE ABYSS:
// a post-game void under the throne with corrupted remixes of every lieutenant, depth scaling and Abyss-only loot. =====
const M7_LAST = 10;
EDEF.hellhound = { spr: 's_hellhound', h: 1.2, hp: 74, speed: 3.0, range: 1.45, windup: 0.42, strike: 0.34, recover: 0.6, dmg: 13, mat: 'flesh', kbRes: 0.8, lunge: 8, name: 'a Hellhound' };
EDEF.penitent = { spr: 's_penitent', h: 1.9, hp: 125, speed: 1.3, range: 1.95, windup: 0.85, strike: 0.25, recover: 0.9, dmg: 18, mat: 'flesh', kbRes: 0.5, censer: true, name: 'a Penitent Flagellant' };
EDEF.royalguard = { spr: 's_royalguard', h: 2.0, hp: 140, speed: 1.5, range: 2.1, windup: 0.75, strike: 0.22, recover: 0.8, dmg: 17, mat: 'bone', kbRes: 0.4, armor: 0.62, shield: true, name: 'a Royal Guard of the Lich' };
EDEF.voidshade = { spr: 's_voidshade', h: 2.05, hp: 62, speed: 1.9, range: 9, windup: 0.75, strike: 0.1, recover: 1.3, dmg: 11, mat: 'ecto', kbRes: 0.8, ranged: true, keep: 4.6, voidbolt: true, name: 'a Void Shade' };
EDEF.phyl = { spr: 'ic_phylactery', h: 1.15, hp: 150, speed: 0, range: 0, windup: 9, strike: 0.1, recover: 1, dmg: 0, mat: 'ecto', kbRes: 0, name: 'a Phylactery' };
EDEF.cerberax = { spr: 's_hellalpha', h: 2.65, hp: 1950, speed: 2.5, range: 2.6, windup: 0.6, strike: 0.25, recover: 0.6, dmg: 22, mat: 'flesh', kbRes: 0.05, boss: true, title: 'CERBERAX, THE HELLFORGE ALPHA' };
EDEF.uknight = { spr: 's_uknight', h: 3.1, hp: 2150, speed: 2.0, range: 3.0, windup: 0.7, strike: 0.25, recover: 0.7, dmg: 24, mat: 'flesh', kbRes: 0.03, boss: true, title: 'SIR VALCOR, THE UNDEAD KNIGHT' };
EDEF.lich = { spr: 's_lich', h: 3.3, hp: 2450, speed: 2.0, range: 2.6, windup: 0.7, strike: 0.25, recover: 0.7, dmg: 22, mat: 'bone', kbRes: 0.02, boss: true, title: 'THE LICH KING' };
for (const k of ['penitent', 'royalguard', 'uknight', 'lich', 'phyl']) UNDEAD.add(k);

// ---------------- themes ----------------
THEMES.kennels = {
  name: 'THE HELLFORGE KENNELS', sub: 'Forges, lava & the hounds of hell', variant: 'kennels', map: 'crypt', boss: 'cerberax', music: 'kennels',
  haze: [120, 34, 60], ambient: [0.56, 0.36, 0.44], torch: 'orange',
  light: c => (c[1] > c[0] && c[1] > c[2]) ? [1.0, 0.42, 0.18] : c,
  grade: { sh: [0.1, 0.0, 0.1], hi: [0.08, 0.02, -0.04] },
  pool: [['hellhound', 2.4], ['imp', 1.8], ['skeleton', 1.4], ['fzombie', 1.2], ['azombie', 1.0], ['bat', 0.7]],
};
THEMES.cathedral = {
  name: 'THE RUINED CATHEDRAL', sub: 'Shattered glass, storm & the oathbound dead', variant: 'cathedral', map: 'crypt', boss: 'uknight', music: 'cathedral', sky: 'sky_storm',
  haze: [64, 52, 118], ambient: [0.5, 0.5, 0.66], torch: 'green',
  light: c => (c[0] > 0.9 && c[1] < 0.5) ? [0.8, 0.35, 1.0] : c,
  grade: { sh: [0.05, 0.03, 0.14], hi: [0.04, 0.05, 0.02] },
  pool: [['penitent', 2.0], ['skeleton', 1.8], ['ghost', 1.2], ['azombie', 1.2], ['acolyte', 1.0], ['bat', 0.8]],
};
THEMES.throne = {
  name: "THE LICH'S THRONE", sub: 'The end of the descent. He is waiting.', variant: 'throne', map: 'crypt', boss: 'lich', music: 'throne', sky: 'sky_void',
  haze: [70, 30, 120], ambient: [0.48, 0.42, 0.66], torch: 'green',
  light: c => (c[0] > 0.9 && c[1] > 0.4 && c[2] < 0.4) ? [0.4, 1.0, 0.5] : c,
  grade: { sh: [0.07, 0.0, 0.16], hi: [0.02, 0.07, 0.03] },
  pool: [['royalguard', 2.0], ['acolyte', 1.4], ['skeleton', 1.4], ['ghost', 1.0], ['penitent', 0.9], ['imp', 0.8]],
};
THEMES.abyss = {
  name: 'THE ABYSS', sub: 'Below the throne, the dark goes on forever', variant: 'abyss', map: 'crypt', boss: 'vknight', music: 'abyss', sky: 'sky_void',
  haze: [56, 20, 104], ambient: [0.46, 0.4, 0.66], torch: 'green',
  light: c => (c[0] > 0.8 && c[1] < 0.6) ? [0.72, 0.3, 1.0] : c,
  grade: { sh: [0.08, 0.0, 0.18], hi: [0.03, 0.08, 0.04] },
  pool: [['voidshade', 2.2], ['hellhound', 1.2], ['royalguard', 1.2], ['penitent', 1.0], ['ghost', 1.0], ['gladiator', 0.8], ['werewolf', 0.8]],
};
// The Abyss: corrupted remixes of every lieutenant, in a fixed rotation (the matriarch needs her belfry, so she stays home)
const ABYSS_BOSSES = ['vknight', 'alphawolf', 'minotaur', 'cerberax', 'colossus', 'witch', 'uknight', 'spider', 'lich'];
const ABYSS_MODS = {
  RIFTS: { n: 'VOID RIFTS', d: 'the floor tears open under you' },
  NOVA: { n: 'VOID NOVA', d: 'expanding rings of the dark - jump them' },
  BOLTS: { n: 'SOUL BOLTS', d: 'volleys of void skulls - parry them back' },
  SHADES: { n: 'SPLITTING', d: 'void shades tear free at 70% and 40%' },
  LEECH: { n: 'SOUL-LEECH', d: 'every wound it gives you heals it' },
};
const abyssName = t => ((EDEF[t] && EDEF[t].title) || { vknight: 'THE VAMPIRE KNIGHT', spider: 'THE BROOD MOTHER', colossus: 'THE OSSUARY COLOSSUS' }[t] || 'LIEUTENANT').replace(/^THE /, '');
const abyssDepth = () => (RUN.cfg && RUN.cfg.abyss) || 0;
function abyssMods(depth, seed) {
  const all = ['RIFTS', 'NOVA', 'BOLTS', 'SHADES', 'LEECH']; let s = (seed ^ (depth * 2654435761)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = all.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, Math.min(5, 1 + Math.ceil(depth / 2)));
}
const _stageCfg7 = stageCfg;
stageCfg = function (n) {
  const c = _stageCfg7(n);
  if (n === 8) c.theme = 'kennels'; else if (n === 9) c.theme = 'cathedral'; else if (n === 10) c.theme = 'throne';
  c.endless = 0; c.abyss = 0;
  if (n > M7_LAST) { // THE ABYSS
    const d = n - M7_LAST; c.theme = 'abyss'; c.abyss = d; c.boss = ABYSS_BOSSES[(d - 1) % ABYSS_BOSSES.length];
    c.hp = 2.55 + 0.16 * d; c.dmg = 1.85 + 0.09 * d; c.bossHp = 2.45 + 0.24 * d; c.spd = 1.2 + 0.012 * Math.min(d, 10);
    c.dens = Math.min(1, 0.85 + 0.03 * d); c.elite = Math.min(0.6, 0.45 + 0.02 * d); c.eliteMods = 3; c.promote = 0.75;
  } else c.boss = null;
  return c;
};
GAME.rogue.stageCfg = stageCfg;
const _stageIntro7 = stageIntro;
stageIntro = function () {
  const th = curTheme(), d = abyssDepth();
  if (d) {
    G.bigText = { t1: 'THE ABYSS', t2: 'DEPTH ' + d, dur: 3.4, t: 0 };
    const b = G.boss, mods = (b && b.cor) ? b.cor.mods.map(m => ABYSS_MODS[m].n).join('  -  ') : '';
    toast('DEPTH ' + d + ': THE CORRUPTED ' + abyssName(RUN.cfg.boss) + ' WAITS', mods, '#c890ff', 4.5);
    return;
  }
  if (RUN.stage >= 8 && RUN.stage <= M7_LAST) {
    G.bigText = { t1: 'STAGE ' + RUN.stage, t2: th.name, dur: 3.2, t: 0 };
    const S = { 8: ['Lava burns - jump it. Something down here has three throats.', '#ff8a40'], 9: ['The knight who guards the nave never left his post.', '#c8b0ff'], 10: ['The last door. The Reliquary sits on his throne.', '#a0ffb0'] }[RUN.stage];
    toast(th.sub.toUpperCase(), S[0], S[1], 4.5);
    return;
  }
  _stageIntro7();
};

// ---------------- crypt variants ----------------
function m7Ring(C, cx, cy, rad, type, n, a0 = 0) { for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad; if (!SOLID[C.idx(Math.floor(x), Math.floor(y))]) C.props.push({ type, x, y, z: 0 }); } }
function m7Raise(C, x, y, h, ft, wt) { const i = C.idx(Math.floor(x), Math.floor(y)); if (SOLID[i]) return false; FH[i] = h; FT[i] = ft; WT[i] = wt; return true; }
CRYPT_VARIANTS.kennels = {
  tall: true,
  tex: (T, def) => ({
    floor: [T.f_basalt, T.f_hgrate, T.f_ember, T.f_lava, T.t_stone2, T.f_basalt, T.f_blood],
    ceil: [T.c_forge, T.c_vault],
    walls: [def('h_wall'), def('h_wall2'), def('h_loose'), def('h_pillar'), def('h_wall', ['h_kennel', 0, 2.7]), def('h_wall2', ['h_chain', 0.4, 3.6]),
      def('h_crack'), def('t_gate'), def('t_sarc'), def('h_wall2'), def('h_wall', ['h_kennel', 0, 2.7]), def('t_stone2'), def('h_false')],
  }),
  styles: ['forge', 'kennelrow', 'lavapit', 'chains', 'forge', 'lavapit', 'kennelrow'],
  dress(r, w, h, C) {
    const cx = (r.x0 + r.x1) / 2 + 0.5, cy = (r.y0 + r.y1) / 2 + 0.5;
    if (r.style === 'forge') { // an anvil on a raised hearth, ember-grates all round
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i] && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 2.2) FT[i] = (x + y) % 2 ? 2 : 1; }
      if (m7Raise(C, cx, cy, 0.36, 4, 11)) C.props.push({ type: 'anvil', x: Math.floor(cx) + 0.5, y: Math.floor(cy) + 0.5, z: 0.36 });
      C.props.push({ type: 'brazier', x: r.x0 + 1.5, y: r.y0 + 1.5, z: 0, green: false });
      C.L.push({ x: cx, y: cy, r: 5, i: 1.2, c: C.ORG, flicker: true });
    } else if (r.style === 'kennelrow') { // cages of chained hounds along the walls
      for (let k = 0; k < 2 + C.ri(0, 2); k++) { const [x, y] = C.freeCell(r, 1); C.props.push({ type: 'kennel', x, y, z: 0 }); const i = C.idx(Math.floor(x), Math.floor(y)); FT[i] = 6; }
      for (let k = 0; k < 4; k++) { const [x, y] = C.freeCell(r, 0); C.props.push({ type: 'bones', x, y, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 4.8, i: 1.0, c: [1.0, 0.25, 0.2] });
    } else if (r.style === 'lavapit') { // a sunken channel of lava with basalt stepping stones (lava BURNS - jump it)
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) { FH[i] = -0.3; FT[i] = 3; } }
      const ni = 3 + C.ri(0, 2); for (let k = 0; k < ni; k++) { const x = C.ri(r.x0 + 1, r.x1 - 1), y = C.ri(r.y0 + 1, r.y1 - 1), i = C.idx(x, y); FH[i] = 0; FT[i] = 0; }
      for (let x = r.x0 + 1; x < r.x1; x++) { const i = C.idx(x, Math.floor(cy)); if (!SOLID[i] && (x % 2 === 0)) { FH[i] = 0; FT[i] = 1; } }
      C.L.push({ x: cx, y: cy, r: 5.2, i: 1.25, c: [1.0, 0.45, 0.12], flicker: true });
    } else if (r.style === 'chains') { // hanging chains and gibbets dripping blood
      for (let k = 0; k < 2 + C.ri(0, 2); k++) { const [x, y] = C.freeCell(r, 1); C.props.push({ type: 'cage', x, y, z: r.ch - 1.9, a: C.R() * 6 }); FT[C.idx(Math.floor(x), Math.floor(y))] = 6; }
      C.L.push({ x: cx, y: cy, r: 4.6, i: 0.95, c: [0.75, 0.3, 1.0] });
    }
  },
  arena(C, gx, AX0, AX1, AY0, AY1) { // the great forge pit: basalt, a ring of ember grates, two lava channels down the flanks
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
      const i = C.idx(x, y); if (SOLID[i]) continue; const d = Math.hypot((x + 0.5 - 25) / 1.6, y + 0.5 - 5.5);
      if ((x === 17 || x === 33) && y >= AY0 + 2 && y <= AY1 - 2) { FH[i] = -0.3; FT[i] = 3; continue; }
      FT[i] = d < 1.4 ? 1 : Math.abs(d - 4.2) < 0.7 ? 2 : C.R() < 0.08 ? 2 : 0;
    }
    for (const [x, y] of [[19.5, 1.7], [30.5, 1.7], [14.5, 9.4], [35.5, 9.4]]) C.props.push({ type: 'kennel', x, y, z: 0 });
    C.props.push({ type: 'anvil', x: 25, y: 1.8, z: 0 });
    for (const [x, y] of [[20, 3], [30, 3], [20, 8], [30, 8]]) C.props.push({ type: 'cage', x, y, z: 3.4, a: C.R() * 6 });
    C.L.push({ x: 25, y: 5.5, r: 9, i: 0.85, c: [1.0, 0.35, 0.15] }); C.L.push({ x: 17.5, y: 5.5, r: 4, i: 1.0, c: [1.0, 0.5, 0.1], flicker: true }); C.L.push({ x: 33.5, y: 5.5, r: 4, i: 1.0, c: [1.0, 0.5, 0.1], flicker: true });
    C.L.push({ x: 25, y: 2, r: 5, i: 0.6, c: [0.8, 0.3, 1.0] });
  },
  wall: (st, h) => st === 'arena' ? [4, 5, 10, 1, 0, 5][h % 6] : st === 'secret' ? 1 : st === 'corr' ? (h % 4 === 0 ? 5 : 0) : st === 'kennelrow' ? [4, 4, 0, 10][h % 4] : st === 'chains' ? [5, 1, 5, 0][h % 4] : [0, 1, 4, 0, 5, 0, 1][h % 7],
  elite: ['hellhound', 'hellhound', 'imp', 'azombie'],
  snames: ['The Whelping Pen', "The Smith's Hoard", 'The Bone Bin', 'The Slag Vault', "The Kennelmaster's Den", 'The Branding Room', 'The Cold Forge'],
  vnames: ['The Hellforge Vault', 'The Molten Reliquary'],
  looseText: 'Soot-black bricks, hot to the touch... one of them shifts.',
};
CRYPT_VARIANTS.cathedral = {
  sky: true, lowWT: 255,
  tex: (T, def) => ({
    floor: [T.f_nave, T.f_carpet, T.f_rubble, T.f_rubble, T.t_stone2, T.f_nave, T.f_blood],
    ceil: [T.c_cath, T.c_vault],
    walls: [def('r_wall'), def('r_wall2'), def('r_loose'), def('r_pillar'), def('r_wall', ['r_glass', 0.35, 3.05]), def('r_wall2'),
      def('r_crack'), def('t_gate'), def('t_sarc'), def('r_wall2'), def('r_wall', ['t_statue', 0, 2.9]), def('t_stone2'), def('r_false')],
  }),
  styles: ['pews', 'statues', 'collapsed', 'chapel', 'pews', 'gallery', 'collapsed'],
  dress(r, w, h, C) {
    const cx = (r.x0 + r.x1) / 2 + 0.5, cy = (r.y0 + r.y1) / 2 + 0.5;
    if (r.style === 'pews') { // rows of broken pews either side of a red carpet
      for (let y = r.y0; y <= r.y1; y++) { const i = C.idx(Math.floor(cx), y); if (!SOLID[i]) FT[i] = 1; }
      for (let y = r.y0 + 1; y < r.y1; y += 2) for (const x of [cx - 1.6, cx + 1.6]) { if (w < 5) break; if (!SOLID[C.idx(Math.floor(x), y)]) C.props.push({ type: 'pew', x, y: y + 0.5, z: 0, broken: C.R() < 0.35 }); }
      C.L.push({ x: cx, y: cy, r: 4.8, i: 0.9, c: [0.75, 0.4, 1.0] });
    } else if (r.style === 'collapsed') { // the roof came down: rubble heaps and a hole of stormlight
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i] && C.R() < 0.55) FT[i] = 2; }
      for (let k = 0; k < 2; k++) { const [x, y] = C.freeCell(r, 1); const i = C.idx(Math.floor(x), Math.floor(y)); if (!SOLID[i]) { FH[i] = 0.45; FT[i] = 4; WT[i] = 11; } }
      for (let k = 0; k < 4; k++) { const [x, y] = C.freeCell(r, 0); C.props.push({ type: 'bones', x, y, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 5, i: 0.9, c: [0.6, 0.65, 1.0] });
    } else if (r.style === 'chapel') { // a side chapel: candles round a raised altar
      if (m7Raise(C, cx, r.y0 + 0.5, 0.3, 2, 11)) C.props.push({ type: 'candelabra', x: Math.floor(cx) + 0.5, y: r.y0 + 0.5, z: 0.3 });
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i] && (x + y) % 2) FT[i] = 1; }
      m7Ring(C, cx, cy + 0.3, 1.5, 'candelabra', 4, 0.4);
      C.L.push({ x: cx, y: cy, r: 4.6, i: 1.1, c: [1.0, 0.7, 0.35], flicker: true }); C.L.push({ x: cx, y: r.y0 + 1, r: 3, i: 0.8, c: [0.4, 1.0, 0.55] });
    }
  },
  arena(C, gx, AX0, AX1, AY0, AY1) { // the nave: checkered marble, a carpet up the middle to the altar, broken pews, angels
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { const i = C.idx(x, y); if (SOLID[i]) continue; FT[i] = Math.abs(y + 0.5 - 5.5) < 1.1 ? 1 : (x <= AX0 + 1 || x >= AX1 - 1) && C.R() < 0.6 ? 2 : 0; }
    for (const x of [16.5, 19, 31, 33.5]) for (const y of [3.0, 8.0]) C.props.push({ type: 'pew', x, y, z: 0, broken: C.R() < 0.4 });
    for (const ax of [21, 29]) { const i = C.idx(ax, AY0); FH[i] = 0.42; WT[i] = 11; FT[i] = 4; C.props.push({ type: 'angel', x: ax + 0.5, y: AY0 + 0.5, z: 0.42 }); }
    C.L.push({ x: 25, y: 5.5, r: 9, i: 0.8, c: [0.6, 0.5, 1.0] }); C.L.push({ x: 25, y: 2, r: 5, i: 0.9, c: [0.4, 1.0, 0.55] });
    C.L.push({ x: 14, y: 5.5, r: 4, i: 0.7, c: [1.0, 0.3, 0.4] }); C.L.push({ x: 36, y: 5.5, r: 4, i: 0.7, c: [1.0, 0.3, 0.4] });
  },
  wall: (st, h) => st === 'arena' ? [4, 10, 4, 1, 0, 4][h % 6] : st === 'secret' ? 1 : st === 'corr' ? (h % 3 === 0 ? 1 : 0) : st === 'pews' || st === 'chapel' ? [4, 1, 4, 0, 10][h % 5] : [0, 4, 1, 0, 10, 1, 4][h % 7],
  elite: ['penitent', 'skeleton', 'azombie', 'acolyte'],
  snames: ['The Reliquary Niche', 'The Bell-Ringer\'s Loft', 'The Sacristy', 'The Confessional', 'The Choir Crypt', 'The Bishop\'s Tomb', 'The Broken Font'],
  vnames: ['The Treasury of Saints', 'The Undercroft'],
  looseText: 'The mortar here has rotted to dust... the stones give.',
};
CRYPT_VARIANTS.throne = {
  sky: true, lowWT: 255,
  tex: (T, def) => ({
    floor: [T.f_obsidian, T.f_pcarpet, T.f_soulglass, T.f_soulglass, T.t_stone2, T.f_obsidian, T.f_blood],
    ceil: [T.c_throne, T.c_vault],
    walls: [def('l_wall'), def('l_wall2'), def('l_loose'), def('l_pillar'), def('l_wall', ['l_banner', 0.5, 3.1]), def('l_wall2'),
      def('l_crack'), def('t_gate'), def('t_sarc'), def('l_wall2'), def('l_wall', ['t_statue', 0, 2.9]), def('t_stone2'), def('l_false')],
  }),
  styles: ['hall', 'souls', 'guardroom', 'pillars', 'souls', 'hall', 'guardroom'],
  dress(r, w, h, C) {
    const cx = (r.x0 + r.x1) / 2 + 0.5, cy = (r.y0 + r.y1) / 2 + 0.5;
    if (r.style === 'hall') { for (let y = r.y0; y <= r.y1; y++) { const i = C.idx(Math.floor(cx), y); if (!SOLID[i]) FT[i] = 1; } C.L.push({ x: cx, y: cy, r: 4.6, i: 0.9, c: [0.72, 0.3, 1.0] }); }
    else if (r.style === 'souls') { // a sunken well of trapped souls under glass
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) { FH[i] = -0.2; FT[i] = 3; } }
      C.L.push({ x: cx, y: cy, r: 5, i: 1.15, c: [0.35, 1.0, 0.55] });
    } else if (r.style === 'guardroom') { // weapon racks and candles, a brazier of green fire
      C.props.push({ type: 'brazier', x: cx, y: cy, z: 0, green: true }); m7Ring(C, cx, cy, 1.7, 'candelabra', 3, 0.3);
      for (let k = 0; k < 3; k++) { const [x, y] = C.freeCell(r, 0); C.props.push({ type: 'bones', x, y, z: 0 }); }
      C.L.push({ x: cx, y: cy, r: 5, i: 1.1, c: [0.35, 1.0, 0.5], flicker: true });
    }
  },
  arena(C, gx, AX0, AX1, AY0, AY1) { // the throne room: obsidian, a purple carpet from the gate to the throne dais, soul-glass wells
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
      const i = C.idx(x, y); if (SOLID[i]) continue;
      if (Math.abs(x + 0.5 - 25) < 1.1) FT[i] = 1; else if ((x === 18 || x === 32) && (y === 4 || y === 7)) { FH[i] = -0.2; FT[i] = 3; } else FT[i] = (x + y) % 2 ? 0 : 5;
    }
    for (const x of [24, 25, 26]) { const i = C.idx(x, AY0); if (!SOLID[i]) { FH[i] = 0.3; FT[i] = 1; WT[i] = 11; } }
    C.props.push({ type: 'throne', x: 25.5, y: AY0 + 0.45, z: 0.3 });
    for (const [x, y] of [[20.5, 2], [30.5, 2], [16, 9.3], [34, 9.3]]) C.props.push({ type: 'brazier', x, y, z: 0, green: true });
    for (const x of [17, 21, 29, 33]) C.props.push({ type: 'candelabra', x, y: 5.5, z: 0 });
    C.L.push({ x: 25, y: 5.5, r: 9, i: 0.8, c: [0.72, 0.3, 1.0] }); C.L.push({ x: 25.5, y: 2, r: 5, i: 1.2, c: [0.4, 1.0, 0.5], flicker: true });
  },
  wall: (st, h) => st === 'arena' ? [4, 1, 4, 10, 0, 4][h % 6] : st === 'secret' ? 1 : st === 'corr' ? (h % 3 === 0 ? 4 : 0) : [0, 1, 4, 0, 10, 1, 0][h % 7],
  elite: ['royalguard', 'royalguard', 'acolyte', 'penitent'],
  snames: ['The Crown Vault', 'The Embalming Room', "The Lich's Library", 'The Soul Cellar', 'The Phylactery Shrine', 'The Ossuary of Kings', 'The Black Chapel'],
  vnames: ['The Royal Treasury', 'The Hoard of the Lich'],
  looseText: 'Gold leaf is peeling off this block... it is hollow behind.',
};
CRYPT_VARIANTS.abyss = {
  sky: true, lowWT: 255,
  tex: (T, def) => ({
    floor: [T.f_void, T.f_soulglass, T.f_voidpool, T.f_voidpool, T.t_stone2, T.f_void, T.f_blood],
    ceil: [T.c_void, T.c_vault],
    walls: [def('v_wall'), def('v_wall2'), def('v_loose'), def('v_pillar'), def('v_wall', ['v_crystal', 0.2, 3.1]), def('v_wall2'),
      def('v_crack'), def('t_gate'), def('t_sarc'), def('v_wall2'), def('v_wall', ['v_crystal', 0.2, 3.1]), def('t_stone2'), def('v_false')],
  }),
  styles: ['rift', 'crystals', 'voidpool', 'pillars', 'rift', 'voidpool', 'crystals'],
  dress(r, w, h, C) {
    const cx = (r.x0 + r.x1) / 2 + 0.5, cy = (r.y0 + r.y1) / 2 + 0.5;
    if (r.style === 'rift') { for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i] && Math.abs((x - r.x0) - (y - r.y0) * 1.2) < 1.2) FT[i] = 2; } C.L.push({ x: cx, y: cy, r: 5, i: 1.1, c: [0.75, 0.3, 1.0] }); }
    else if (r.style === 'crystals') { for (let k = 0; k < 3; k++) { const [x, y] = C.freeCell(r, 1); const i = C.idx(Math.floor(x), Math.floor(y)); if (!SOLID[i]) { FH[i] = 0.5; FT[i] = 2; WT[i] = 4; } } C.L.push({ x: cx, y: cy, r: 5, i: 1.15, c: [0.35, 1.0, 0.6] }); }
    else if (r.style === 'voidpool') { for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = C.idx(x, y); if (!SOLID[i]) { FH[i] = -0.25; FT[i] = 3; } } C.L.push({ x: cx, y: cy, r: 5, i: 1.0, c: [0.7, 0.25, 1.0] }); }
  },
  arena(C, gx, AX0, AX1, AY0, AY1) { // a floating island of void-stone, cracked with green light, pools at the edges
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
      const i = C.idx(x, y); if (SOLID[i]) continue; const d = Math.hypot((x + 0.5 - 25) / 1.7, y + 0.5 - 5.5);
      FT[i] = Math.abs(d - 3.2) < 0.55 ? 2 : (x <= AX0 + 1 || x >= AX1 - 1) && C.R() < 0.5 ? 3 : 0;
    }
    for (const [x, y] of [[14, 2], [36, 2], [14, 9.5], [36, 9.5]]) C.props.push({ type: 'brazier', x, y, z: 0, green: true });
    C.L.push({ x: 25, y: 5.5, r: 9, i: 0.85, c: [0.7, 0.3, 1.0] }); C.L.push({ x: 25, y: 5.5, r: 4, i: 0.8, c: [0.35, 1.0, 0.55] });
  },
  wall: (st, h) => st === 'arena' ? [4, 1, 0, 10, 1, 0][h % 6] : st === 'secret' ? 1 : st === 'corr' ? (h % 4 === 0 ? 4 : 0) : [0, 1, 0, 4, 1, 0, 10][h % 7],
  elite: ['voidshade', 'royalguard', 'hellhound', 'penitent'],
  snames: ['The Drowned Star', 'A Pocket of Nothing', 'The Last Light', 'The Whispering Hollow', 'The Eye\'s Nest', 'The Cradle of Shades', 'The Broken Moon'],
  vnames: ['The Heart of the Abyss', 'The Bottom of Everything'],
  looseText: 'This stone hums... and there is a space behind it.',
};

// ---------------- enemies ----------------
const _enemyStrike7 = enemyStrike;
enemyStrike = function (e) {
  if (e.d.voidbolt) { voidBolt(e, Math.atan2(P.y - e.y, P.x - e.x), 6.4, e.d.dmg); SFX.play('ghost', 0.5); return; }
  _enemyStrike7(e);
  if (e.d.censer) { // the censer bursts on the floor where you stood: a follow-up ring of green fire
    const tx = P.x + P.vx * 0.2, ty = P.y + P.vy * 0.2; if (Math.hypot(tx - e.x, ty - e.y) < 3) G.hazards.push({ x: tx, y: ty, t: -0.55, dmg: 9, tex: 'gflame1', tw: 0.6, th: 0.9, col: [90, 255, 130, 1] });
  }
};
function voidBolt(e, a, sp, dmg, ez) {
  ez = ez ?? e.z + e.h * 0.62; const dist = Math.hypot(P.x - e.x, P.y - e.y);
  G.projectiles.push({ type: 'fireball', x: e.x + Math.cos(a) * 0.5, y: e.y + Math.sin(a) * 0.5, z: ez, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: ((P.z + 1.0) - ez) / Math.max(0.5, dist) * sp, dmg, owner: e, life: 4.5, spr: voidSpr });
}
function voidSpr(p, t) {
  if (Math.random() < 0.6) addP({ k: 'ecto', x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0.3, size: 0.05, col: Math.random() < 0.5 ? RGB(190, 90, 255) : RGB(110, 255, 150), life: 0.35 });
  return { tex: 'glow_w', x: p.x, y: p.y, z: p.z - 0.25, w: 0.5, h: 0.5, add: true, alpha: 0.95, lit: false, tint: p.reflected ? [255, 210, 90, 1] : [180, 80, 255, 1] };
}
function soulBoltSpr(p, t) {
  if (Math.random() < 0.6) addP({ k: 'ecto', x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0.4, size: 0.05, col: RGB(120, 255, 160), life: 0.4 });
  return { tex: 'skullgreen', x: p.x, y: p.y, z: p.z - 0.22, w: 0.46, h: 0.5, lit: false, glow: 0.7, skew: Math.sin(t * 20) * 0.05, tint: p.reflected ? [255, 200, 80, 0.4] : [200, 120, 255, 0.25] };
}
// lava burns (the Kennels); royal guards raise their shields
BOSSTICK.m7 = function (dt) {
  if (G.m7Purge && G.state === 'play') { G.m7Purge = false; // no spawn-camping: ranged foes never start in sight of the entrance
    for (const e of G.enemies) if (e.alive && !e.d.boss && e.d.ranged && Math.hypot(e.x - P.x, e.y - P.y) < 11) { e.alive = false; e.hidden = true; } }
  if (!RUN.on || G.state !== 'play') return;
  if (P.hourT > 0) P.hourT -= dt;
  const th = curTheme();
  if (th && th.variant === 'kennels') {
    const i = cellAt(P.x, P.y);
    if (i >= 0 && FT[i] === 3 && FH[i] < 0 && P.z - FH[i] < 0.12) {
      G.lavaT = (G.lavaT || 0) - dt;
      if (Math.random() < dt * 30) addP({ k: 'ember', x: P.x + rand(-0.4, 0.4), y: P.y + rand(-0.4, 0.4), z: P.z + 0.1, vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(1, 3), size: 0.05, col: Math.random() < 0.5 ? RGB(255, 140, 30) : RGB(255, 60, 20), life: 0.6 });
      if (G.lavaT <= 0) { G.lavaT = 0.4; const pi = P.iframes; P.iframes = 0; hurtPlayer(5, P.x, P.y + 0.01, { env: true, unblockable: true, nopd: true }); P.iframes = pi; if (!G.lavaWarned) { G.lavaWarned = true; toast('LAVA!', 'It burns - jump across.', '#ff8a40', 1.8); } }
    } else G.lavaT = 0;
  }
  // flame breath / bone spears etc. use the shared hazard list; a few M7 hazards have their own looks (see BOSSSPR.m7)
  if (G.vrings && G.vrings.length) {
    for (const R of G.vrings) {
      R.r += dt * (R.sp || 6);
      const dd = Math.hypot(P.x - R.x, P.y - R.y);
      if (!R.hit && Math.abs(dd - R.r) < 0.4 && P.z - groundUnder(P.x, P.y, 0.1) < 0.35) { R.hit = true; hurtPlayer(R.dmg, R.x, R.y, { src: R.src || null, unblockable: true }); }
      if (Math.random() < dt * 40) { const a = rand(0, TAU), x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; if (!isSolid(cellAt(x, y))) addP({ k: 'ecto', x, y, z: floorAt(x, y) + 0.08, vx: Math.cos(a), vy: Math.sin(a), vz: 0.8, size: 0.08, col: R.col || RGB(190, 90, 255), life: 0.4 }); }
    }
    G.vrings = G.vrings.filter(R => R.r < R.max);
  }
  if (G.rifts && G.rifts.length) { // void rifts: marked, then they tear open (player-made rifts hit enemies instead)
    for (const r of G.rifts) {
      r.t += dt;
      if (r.t >= 0 && !r.done) {
        r.done = true; G.shake += r.mine ? 2 : 3; SFX.play('ghost', 0.6);
        for (let i = 0; i < 26; i++) addP({ k: 'ecto', x: r.x, y: r.y, z: floorAt(r.x, r.y) + 0.1, vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(2, 6), size: rand(0.06, 0.12), col: Math.random() < 0.6 ? RGB(180, 80, 255) : RGB(110, 255, 150), life: 0.7 });
        if (r.mine) { for (const q of G.enemies) if (q.alive && !q.hidden && Math.hypot(q.x - r.x, q.y - r.y) < r.rad) damageEnemy(q, r.dmg, { dx: q.x - r.x, dy: q.y - r.y, kb: 2, heavy: true, src: 'rift', col: '#c890ff' }); }
        else if (Math.hypot(P.x - r.x, P.y - r.y) < r.rad && P.z - groundUnder(P.x, P.y, 0.1) < 0.5) hurtPlayer(r.dmg, r.x, r.y, { src: r.src || null, unblockable: true });
      }
    }
    G.rifts = G.rifts.filter(r => r.t < 0.5);
  }
};
function m7Rift(x, y, delay, dmg, rad, src, mine) { if (!G.rifts) G.rifts = []; G.rifts.push({ x, y, t: -delay, dmg, rad: rad || 0.9, src, mine: !!mine }); }
function m7VRing(x, y, max, dmg, col, sp, src) { if (!G.vrings) G.vrings = []; G.vrings.push({ x, y, r: 0.6, max, dmg, col, sp, src }); }

// ---------------- props + M7 effects ----------------
BOSSSPR.m7 = function (S, t) {
  for (const pr of (LEVEL.props || [])) {
    if (pr.type === 'anvil') { S.push({ tex: 'p_anvil', x: pr.x, y: pr.y, z: pr.z, w: 0.78, h: 0.92 }); S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z + 0.2, w: 1.3, h: 0.9, add: true, alpha: 0.22 + 0.08 * Math.sin(t * 5 + pr.x), lit: false, tint: [255, 110, 30, 1] }); if (Math.random() < 0.15) addP({ k: 'ember', x: pr.x + rand(-0.2, 0.2), y: pr.y + rand(-0.2, 0.2), z: pr.z + 0.7, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.8, 1.8), size: 0.04, col: RGB(255, 150, 40), life: 0.7 }); }
    else if (pr.type === 'kennel') { S.push({ tex: 'p_kennel', x: pr.x, y: pr.y, z: pr.z, w: 1.05, h: 1.15 }); const bl = (Math.sin(t * 1.7 + pr.x * 3) > 0.92) ? 0 : 1; if (bl) S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z + 0.45, w: 0.4, h: 0.25, add: true, alpha: 0.6, lit: false, tint: [255, 40, 30, 1] }); }
    else if (pr.type === 'pew') S.push({ tex: 'p_pew', x: pr.x, y: pr.y, z: pr.z, w: 1.0, h: 1.0, skew: pr.broken ? 0.12 : 0, tint: pr.broken ? [60, 40, 50, 0.25] : null });
    else if (pr.type === 'throne') { const b = G.boss, sat = b && b.type === 'lich' && b.alive && (b.state === 'throne' || b.state === 'dormant'); S.push({ tex: 'p_throne', x: pr.x, y: pr.y, z: pr.z, w: 1.75, h: 3.1 }); S.push({ tex: 'glow_w', x: pr.x, y: pr.y, z: pr.z + 1.0, w: 2.6, h: 3.0, add: true, alpha: (sat ? 0.4 : 0.2) + 0.08 * Math.sin(t * 3), lit: false, tint: [120, 255, 150, 1] }); }
  }
  if (G.rifts) for (const r of G.rifts) { const fz = floorAt(r.x, r.y); if (r.t < 0) { const k = clamp(1 + r.t / 0.9, 0, 1); S.push({ tex: 'glow_w', x: r.x, y: r.y, z: fz - 0.14, w: (0.6 + 1.2 * k) * r.rad, h: 0.34, add: true, alpha: 0.25 + 0.35 * k + 0.15 * Math.sin(t * 40), lit: false, tint: r.mine ? [255, 210, 120, 1] : [190, 80, 255, 1] }); } else { const k = 1 - r.t / 0.5; S.push({ tex: 'glow_w', x: r.x, y: r.y, z: fz - 0.4, w: 1.6 * r.rad, h: 2.6 * k, add: true, alpha: 0.7 * k, lit: false, tint: [150, 255, 170, 1] }); for (let j = 0; j < 3; j++) { const ox = (j - 1) * 0.28 * r.rad; S.push({ tex: 'p_blade', x: r.x + ox, y: r.y - ox * 0.5, z: fz - 0.1, w: (j === 1 ? 0.26 : 0.18) * r.rad, h: (j === 1 ? 0.95 : 0.6) * k, lit: false, glow: 0.5, tint: r.mine ? [255, 200, 110, 0.55] : [180, 80, 255, 0.55] }); } } }
  if (G.vrings) for (const R of G.vrings) { const n = 14; for (let i = 0; i < n; i++) { const a = i / n * TAU + t; const x = R.x + Math.cos(a) * R.r, y = R.y + Math.sin(a) * R.r; S.push({ tex: 'glow_w', x, y, z: floorAt(x, y) - 0.12, w: 0.7, h: 0.3, add: true, alpha: 0.6 * (1 - R.r / R.max * 0.6), lit: false, tint: R.colA || [190, 90, 255, 1] }); } }
};
const _newStage7 = m5NewStage;
m5NewStage = function () {
  G.vrings = []; G.rifts = []; G.haloUsed = false; G.lavaT = 0; G.lavaWarned = false; G.voidPulseT = 0;
  _newStage7();
  // no spawn-camping: ranged foes never start within sight-range of the entrance
  G.m7Purge = true;
  const b = G.boss, d = abyssDepth();
  if (b && d) { // corrupt the lieutenant
    b.cor = { mods: abyssMods(d, RUN.seed | 0), t: { RIFTS: 4, NOVA: 6, BOLTS: 3 }, split: 0, announced: false };
    b.d.title = 'CORRUPTED ' + abyssName(b.type);
    b.dmgMul = 1 + 0.04 * d;
  }
};
// the corruption: extra void attacks on top of the boss' own kit
BOSSTICK.abyss = function (dt) {
  const b = G.boss; if (!b || !b.cor || !b.alive || !b.awake || b.hidden || G.state !== 'play') return;
  const C = b.cor, d = abyssDepth(), dm = 1 + 0.05 * d, B = G.bigText;
  if (B && !B.cor && (B.t1 === b.d.title || B.t1 === 'THE VAMPIRE KNIGHT')) { B.cor = 1; B.t1 = b.d.title; B.t2 = 'Remade by the Abyss  -  Depth ' + d; }
  if (b.state === 'intro') return;
  C.annT = (C.annT || 0) + dt;
  if (!C.announced && ((!G.bigText && !G.toasts.length) || C.annT > 5)) { C.announced = true; SFX.bossKey = 'abyss'; toast('THE ABYSS HAS CORRUPTED IT', C.mods.map(m => ABYSS_MODS[m].n).join('  -  '), '#c890ff', 3.5); }
  if (Math.random() < dt * 10) addP({ k: 'ecto', x: b.x + rand(-0.6, 0.6), y: b.y + rand(-0.6, 0.6), z: b.z + rand(0.2, b.h), vx: 0, vy: 0, vz: rand(0.4, 1.4), size: 0.07, col: Math.random() < 0.55 ? RGB(180, 80, 255) : RGB(110, 255, 150), life: 0.7 });
  const has = m => C.mods.includes(m), busy = b.state === 'stagger' || b.intangible;
  for (const k in C.t) C.t[k] -= dt * (b.phase2 ? 1.25 : 1);
  if (has('RIFTS') && C.t.RIFTS <= 0 && !busy) { C.t.RIFTS = Math.max(3.2, 6.2 - d * 0.2); const n = 3 + Math.min(4, d >> 1); for (let i = 0; i < n; i++) { const a = rand(0, TAU), r = i === 0 ? 0 : rand(1, 2.8); const x = P.x + P.vx * 0.35 + Math.cos(a) * r, y = P.y + P.vy * 0.35 + Math.sin(a) * r; if (arenaOK(x, y)) m7Rift(x, y, 0.9 + i * 0.06, Math.round(14 * dm), 0.85, b); } SFX.play('ghost', 0.7); }
  if (has('NOVA') && C.t.NOVA <= 0 && !busy) { C.t.NOVA = Math.max(4.5, 8 - d * 0.25); m7VRing(b.x, b.y, 7.5, Math.round(12 * dm), RGB(190, 90, 255), 5.5, b); G.shake += 4; SFX.play('heavy', 0.6); }
  if (has('BOLTS') && C.t.BOLTS <= 0 && !busy && losTo(b.x, b.y, P.x, P.y)) { C.t.BOLTS = Math.max(2.4, 4.4 - d * 0.15); const a0 = Math.atan2(P.y - b.y, P.x - b.x), n = 3 + (d > 4 ? 2 : 0); for (let i = 0; i < n; i++) voidBolt(b, a0 + (i - (n - 1) / 2) * 0.2, 6.6, Math.round(10 * dm), b.z + b.h * 0.7); SFX.play('fire', 0.6); }
  if (has('SHADES')) { const f = b.hp / b.maxhp; if ((C.split === 0 && f < 0.7) || (C.split === 1 && f < 0.4)) { C.split++; beastSummon(b, 'voidshade', 2); G.flashG = 0.4; toast('IT SPLITS!', 'Void shades tear free.', '#c890ff', 1.6); } }
};
const _visual7 = rogueVisual;
rogueVisual = function (e, v) {
  v = _visual7(e, v); if (!v) return v;
  if (e.dead) return v;
  if (e.type === 'hellhound') { if (e.state === 'windup') { const k = clamp(e.st / e.d.windup, 0, 1); v.h *= 1 - 0.1 * k; v.w *= 1 + 0.08 * k; v.tint = [255, 100, 30, 0.2 + 0.3 * k]; v.glow = 0.3 * k; } }
  else if (e.type === 'penitent') { if (e.state === 'windup') { const k = clamp(e.st / e.d.windup, 0, 1); v.lean = -0.3 * k; v.h *= 1 + 0.07 * k; v.tint = [110, 255, 140, 0.15 + 0.3 * k]; } else if (e.state === 'strike') { v.lean = 0.45; v.h *= 0.95; } }
  else if (e.type === 'royalguard') { if (e.state === 'windup') { const k = clamp(e.st / e.d.windup, 0, 1); v.lean = -0.22 * k; v.tint = [255, 220, 120, 0.12 + 0.25 * k]; } else if (e.state === 'strike') v.lean = 0.4; }
  else if (e.type === 'voidshade') { v.alpha = 0.78 + 0.15 * Math.sin(e.t * 6); v.wave = 0.05; v.waveF = 4; v.waveP = e.t * 4; v.glow = 0.25; if (e.state === 'windup') v.tint = [180, 80, 255, 0.35 * clamp(e.st / e.d.windup, 0, 1)]; }
  else if (e.type === 'phyl') { v.h *= 1 + 0.05 * Math.sin(e.t * 4); v.glow = 0.6; v.tint = [120, 255, 160, 0.2 + 0.15 * Math.sin(e.t * 9)]; v.rim = 2.4; }
  if (e.cor && e.alive) { const p = 0.5 + 0.5 * Math.sin(e.t * 5); if (!v.tint) v.tint = p > 0.5 ? [170, 70, 255, 0.18 + 0.1 * p] : [90, 255, 150, 0.12 + 0.1 * p]; v.glow = Math.max(v.glow || 0, 0.18); v.rim = Math.max(v.rim || 0, 2.2); }
  return v;
};
BOSSSPR.abyss = function (S, t) {
  const b = G.boss; if (!b || !b.cor || !b.alive || b.hidden) return;
  S.push({ tex: 'glow_w', x: b.x, y: b.y, z: b.z + b.h * 0.45, w: b.w * 1.4, h: b.h * 1.1, add: true, alpha: 0.2 + 0.08 * Math.sin(t * 5), lit: false, tint: [170, 70, 255, 1] });
  S.push({ tex: 'glow_w', x: b.x, y: b.y, z: floorAt(b.x, b.y) - 0.15, w: 3.2, h: 0.7, add: true, alpha: 0.35, lit: false, tint: [90, 255, 150, 1] });
};
// royal guards: shield up from the front (heavy hits / the whip get round it)
const _dmgIn7 = rogueDmgIn;
rogueDmgIn = function (e, dmg, o) {
  dmg = _dmgIn7(e, dmg, o);
  if (o.dot) return dmg;
  if (e.d.shield && e.alive && (o.src === 'sword' || o.src === 'pistol') && !o.heavy && e.state !== 'strike' && e.stagger <= 0 && Math.random() < 0.5) { dmg *= 0.3; sparks(e.x, e.y, e.z + e.h * 0.55, 8, RGB(255, 220, 120)); dmgNum(e.x, e.y, e.z + e.h + 0.3, 'BLOCK', '#ffe0a0'); SFX.play('block', 0.5); }
  // weapons + relics
  if ((o.src === 'sword' || o.src === 'finisher') && P.mods) {
    if (P.mods.lichring && P.mana >= P.maxmana - 0.5) dmg *= 1.2;
    if (P.mods.abysseye) { P.eyeN = (P.eyeN || 0) + 1; if (P.eyeN % 5 === 0) { dmg *= 2.5; dmgNum(e.x, e.y, e.z + e.h + 0.65, 'VOID CRIT', '#d090ff'); for (let i = 0; i < 16; i++) addP({ k: 'ecto', x: e.x, y: e.y, z: e.z + e.h * 0.6, vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(0, 3), size: 0.07, col: RGB(190, 90, 255), life: 0.5 }); G.hitstop = Math.max(G.hitstop, 0.07); } }
  }
  if (P.hourT > 0 && !o.dot) dmg *= 1.4;
  return dmg;
};

// ---------------- weapons ----------------
SWSPR.ruby = ['vm_sword_ruby', 'vm_sword_ruby_glow']; SWTRAIL.ruby = ['#ff1040', '#ffc0d0'];
SWSPR.great = ['vm_sword_great', 'vm_sword_great_glow']; SWTRAIL.great = ['#d01020', '#ffe0e0'];
SWSPR.void = ['vm_sword_void', 'vm_sword_void_glow']; SWTRAIL.void = ['#a040ff', '#a0ffc0'];
SWDMG.ruby = 1.1; SWDMG.great = 1.85; SWDMG.void = 1.45; SWSPD.great = 0.68; SWSPD.void = 0.95;
const M7W = [
  { id: 'rubysword', kind: 'WEAPON', r: 'epic', name: 'VAMPIRE RUBY LONGSWORD', icon: 'ic_rubysword', desc: '+10% damage. Every 4th hit on the same foe RUPTURES it: +30 damage, and you drink 6 HP.', ok: () => P.wpn.sword !== 'ruby', take() { P.wpn.sword = 'ruby'; } },
  { id: 'greatsword', kind: 'WEAPON', r: 'epic', name: 'BLOOD-GROOVE GREATSWORD', icon: 'ic_greatsword', desc: '+85% damage, 32% slower. Heavy strikes hurl a crimson BLOOD WAVE down the line (34 dmg).', ok: () => P.wpn.sword !== 'great', take() { P.wpn.sword = 'great'; } },
  { id: 'voidreaver', kind: 'WEAPON', r: 'legendary', name: 'THE VOID REAVER', icon: 'ic_voidreaver', abyss: true, desc: 'ABYSS-FORGED. +45% damage. Heavy strikes tear a VOID RIFT under the foe (40 dmg to all near it). Kills heal 3.', ok: () => !!RUN.won && P.wpn.sword !== 'void', take() { P.wpn.sword = 'void'; } },
];
const M7R = [
  { id: 'hellfang', r: 'rare', name: 'HELLHOUND FANG', desc: 'Sword hits have a 25% chance to set foes ablaze (burn 24 over 3s).', k: 'hellfang' },
  { id: 'halo', r: 'epic', name: 'SHATTERED HALO', desc: 'Once per stage, a killing blow leaves you at 1 HP instead: 2s of holy invulnerability and a nova (40 dmg).', k: 'halo' },
  { id: 'lichring', r: 'epic', name: "THE LICH KING'S RING", desc: 'Kills restore 4 mana. While your mana is full, sword hits deal +20%.', k: 'lichring' },
  { id: 'voidheart', r: 'legendary', name: 'HEART OF THE VOID', abyss: true, desc: 'ABYSS RELIC. +40 max health. When you are struck, the void pulses out (24 dmg to foes near you).', k: 'voidheart', take() { P.mods.voidheart = 1; P.maxhp += 40; P.hp += 40; } },
  { id: 'abysseye', r: 'legendary', name: 'EYE OF THE ABYSS', abyss: true, desc: 'ABYSS RELIC. Every 5th sword hit is a VOID CRIT for x2.5 damage.', k: 'abysseye' },
  { id: 'hourglass', r: 'epic', name: 'THE BROKEN HOURGLASS', abyss: true, desc: 'ABYSS RELIC. Parries and perfect dodges slow time for a moment; you deal +40% damage for 2.5s after.', k: 'hourglass' },
  { id: 'voidrune', r: 'epic', name: 'VOID RUNE', abyss: true, desc: 'ABYSS RELIC. Kills have a 30% chance to tear a void rift where they fell (30 dmg to foes nearby).', k: 'voidrune' },
];
for (const r of M7R) { r.kind = 'RELIC'; r.icon = 'ic_' + r.id; const k = r.k; const ab = r.abyss; r.ok = () => !P.mods[k] && (!ab || !!RUN.won); if (!r.take) r.take = function () { P.mods[k] = 1; }; }
UPG.push(...M7W, ...M7R);
if (typeof ALTAR !== 'undefined') {
  const add = [
    { tab: 0, id: 'rubysword', cost: 65 }, { tab: 0, id: 'greatsword', cost: 75 }, { tab: 1, id: 'hellfang', cost: 40 }, { tab: 1, id: 'halo', cost: 70 }, { tab: 1, id: 'lichring', cost: 60 },
    { tab: 2, id: 'ld_ruby', slot: 'sword', val: 'ruby', need: 'rubysword', cost: 55, name: 'START: RUBY LONGSWORD', icon: 'ic_rubysword' },
    { tab: 2, id: 'ld_great', slot: 'sword', val: 'great', need: 'greatsword', cost: 60, name: 'START: GREATSWORD', icon: 'ic_greatsword' },
  ];
  for (const it of add) { const at = ALTAR.items.findIndex(q => q.tab > it.tab); ALTAR.items.splice(at < 0 ? ALTAR.items.length : at, 0, it); if (it.tab <= 1) LOCKED.add(it.id); }
}
// the Abyss loot weighs heavier in the Abyss (and never shows up before the Lich King falls)
const _roll7 = rollChoices;
rollChoices = function (mini) {
  const out = _roll7(mini);
  if (RUN.won && out.length && !out.some(u => u.abyss)) {
    const ab = UPG.filter(u => u.abyss && u.ok()); if (ab.length && Math.random() < (mini ? 0.5 : 0.65)) out[(Math.random() * out.length) | 0] = ab[(Math.random() * ab.length) | 0];
  }
  return out;
};
const _onHit7 = rogueOnHit;
rogueOnHit = function (e, o, dmg) {
  _onHit7(e, o, dmg);
  if (o.dot || o.cleave || !e.alive) return;
  const sword = o.src === 'sword' || o.src === 'finisher';
  if (sword && P.wpn.sword === 'ruby') { // RUPTURE
    e.rubyN = (e.rubyN || 0) + 1; if (e.rubyN % 4 === 0 && e.alive) {
      dmgNum(e.x, e.y, e.z + e.h + 0.7, 'RUPTURE', '#ff2050'); SFX.play('gib', 0.7); G.shake += 3;
      spray(e.x, e.y, e.z + e.h * 0.6, 0, 0, 1.2, 60, 5, Math.PI, e.d.mat, 1.4); for (let i = 0; i < 6; i++) paintFloor(e.x + rand(-0.8, 0.8), e.y + rand(-0.8, 0.8), rand(0.1, 0.3), 190);
      P.hp = Math.min(P.maxhp, P.hp + 6); dmgNum(P.x + Math.cos(P.ang), P.y + Math.sin(P.ang), P.z + 1.4, '+6 HP', '#ff8090');
      damageEnemy(e, 30, { src: 'rupture', dot: true, col: '#ff2050' });
    }
  }
  if (sword && o.heavy && P.wpn.sword === 'great' && G.t - (P.waveT || -9) > 0.35) { // BLOOD WAVE
    P.waveT = G.t; const a = P.ang, sp = 9;
    G.projectiles.push({ type: 'bloodwave', x: P.x + Math.cos(a) * 0.6, y: P.y + Math.sin(a) * 0.6, z: P.z + 0.55, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, dmg: 0, reflected: true, life: 1.1 });
    SFX.play('swingH'); G.shake += 3;
  }
  if (sword && o.heavy && P.wpn.sword === 'void' && G.t - (P.riftT || -9) > 0.3) { P.riftT = G.t; m7Rift(e.x, e.y, 0.35, 40, 1.6, null, true); }
  if (sword && P.mods.hellfang && Math.random() < 0.25 && !(e.burnT > 0)) { e.burnT = 3; e.burnTick = e.burnTick || 0; dmgNum(e.x, e.y, e.z + e.h + 0.35, 'BURN', '#ff9a30'); }
};
const _onKill7 = rogueOnKill;
rogueOnKill = function (e) {
  _onKill7(e);
  if (P.mods.lichring) P.mana = Math.min(P.maxmana, P.mana + 4);
  if (P.wpn.sword === 'void') P.hp = Math.min(P.maxhp, P.hp + 3);
  if (P.mods.voidrune && !e.d.boss && Math.random() < 0.3) m7Rift(e.x, e.y, 0.45, 30, 1.8, null, true);
  if (e.type === 'hellhound') { for (let i = 0; i < 18; i++) addP({ k: 'ember', x: e.x, y: e.y, z: e.z + 0.6, vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(1, 4), size: rand(0.04, 0.07), col: Math.random() < 0.5 ? RGB(255, 140, 30) : RGB(255, 50, 20), life: rand(0.5, 1) }); }
  if (e.d.boss && abyssDepth()) { const d = abyssDepth(); shardGain(45 + 30 * d, e); RUN.abyssBest = Math.max(RUN.abyssBest || 0, d); }
};
// relic hooks on the player side
const _afterHurt7 = rogueAfterHurt;
rogueAfterHurt = function (res, dmg, opt) {
  _afterHurt7(res, dmg, opt);
  const b = G.boss;
  if (res === 'hit' && b && b.cor && b.cor.mods.includes('LEECH') && opt.src === b && b.alive && G.t - (b.cor.leechT || -9) > 1.2) { b.cor.leechT = G.t; const h = Math.round(b.maxhp * 0.012); b.hp = Math.min(b.maxhp, b.hp + h); dmgNum(b.x, b.y, b.z + b.h + 0.3, '+' + h, '#c890ff'); }
  if (res === 'hit' && P.mods.voidheart && G.t - (G.voidPulseT || -9) > 2) {
    G.voidPulseT = G.t; for (const q of G.enemies) if (q.alive && !q.hidden && Math.hypot(q.x - P.x, q.y - P.y) < 2.8) damageEnemy(q, 24, { dx: q.x - P.x, dy: q.y - P.y, kb: 3, src: 'bash', col: '#c890ff' });
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; addP({ k: 'ecto', x: P.x + Math.cos(a) * 0.7, y: P.y + Math.sin(a) * 0.7, z: P.z + 0.9, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, vz: 0, size: 0.06, col: RGB(190, 90, 255), life: 0.35 }); }
  }
  if (P.mods.hourglass && (res === 'parry' || (res === 'dodged' && P.dodgeAge < 0.2 && !opt.nopd))) { P.hourT = 2.5; G.slow = Math.max(G.slow, 0.9); dmgNum(P.x + Math.cos(P.ang), P.y + Math.sin(P.ang), P.z + 1.5, 'TIME BREAKS', '#d0b0ff'); }
};
const _playerDie7 = playerDie;
playerDie = function () {
  if (RUN.on && P.mods && P.mods.halo && !G.haloUsed && G.state === 'play') {
    G.haloUsed = true; P.hp = 1; P.iframes = 2.0; P.dodgeAge = 9; G.flashG = 0.9; G.slow = 0.8; G.shake += 8; SFX.play('toll'); SFX.play('parry');
    toast('THE HALO SHATTERS', 'Not yet.', '#fff2a0', 2.2);
    for (const q of G.enemies) if (q.alive && !q.hidden && Math.hypot(q.x - P.x, q.y - P.y) < 3.2) damageEnemy(q, 40, { dx: q.x - P.x, dy: q.y - P.y, kb: 4, heavy: true, src: 'bash', col: '#fff2a0' });
    for (let i = 0; i < 50; i++) { const a = i / 50 * TAU; addP({ k: 'spark', x: P.x + Math.cos(a) * 0.6, y: P.y + Math.sin(a) * 0.6, z: P.z + 1, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, vz: rand(-0.5, 1), size: 0.06, col: RGB(255, 240, 170), life: 0.5 }); }
    return;
  }
  _playerDie7();
  if (EDEF[G.lastHit] && (RUN.cause === 'dark magic' || !RUN.cause)) RUN.cause = EDEF[G.lastHit].title || EDEF[G.lastHit].name || RUN.cause;
  const b = G.boss; if (b && b.cor && G.lastHit === b.type) RUN.cause = b.d.title;
  if (G.lastHit === 'chasm' && curTheme().variant === 'kennels') RUN.cause = 'the hellforge lava';
  if (RUN.cause === 'dark magic') { // a projectile kill: name whoever threw it
    let best = null, bd = 1.4; for (const q of G.projectiles) { const o = q.owner; if (!o || !o.d) continue; const dd = Math.hypot(q.x - P.x, q.y - P.y); if (dd < bd) { bd = dd; best = o; } }
    if (best) RUN.cause = (best.cor && best.d.title) || best.d.title || best.d.name || RUN.cause; else if (abyssDepth()) RUN.cause = 'the Abyss';
  }
};
// HUD: the depth counter
const _runHud7 = drawRunHUD;
drawRunHUD = function (ctx) {
  _runHud7(ctx); if (!RUN.on) return;
  const d = abyssDepth();
  if (d) { goldFrame(ctx, 4, 4, 60, 13, '#a040ff'); text(ctx, 'DEPTH ' + d, 34, 7, (G.t * 2 | 0) % 2 ? '#e0b0ff' : '#c890ff', 'center'); }
  const sw = { ruby: ['ic_rubysword', '#ff3050'], great: ['ic_greatsword', '#ff6070'], void: ['ic_voidreaver', '#c080ff'], axe: ['ic_axe', '#ff4050'] }[P.wpn && P.wpn.sword];
  if (sw) { const x = W - 22, y = 12; ctx.fillStyle = 'rgba(18,4,24,0.7)'; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = sw[1]; ctx.fillRect(x, y, 16, 1); ctx.fillRect(x, y + 15, 16, 1); drawIcon(ctx, sw[0], x + 8, y + 8, 14, 14); }
};

// ---------------- VICTORY ----------------
const _startPick7 = startPick;
startPick = function (mini) {
  if (!mini && RUN.on && RUN.stage === M7_LAST && !RUN.won && G.state === 'play') { startWin(); return; }
  _startPick7(mini);
};
GAME.rogue.startPick = startPick;
const M7_FALLEN = [['THE VAMPIRE KNIGHT', 'Blood Cathedral'], ['THE BROOD MOTHER', 'Weeping Catacombs'], ['THE OSSUARY COLOSSUS', 'Blood Ossuary'], ['THE ALPHA OF THE BLOOD MOON', 'Moonlit Courtyard'], ['THE GARGOYLE MATRIARCH', 'Gargoyle Belfry'],
  ['THE MINOTAUR', 'Blood Arena'], ['MORWEN, THE NECROMANCER WITCH', "Witch's Necropolis"], ['CERBERAX, THE HELLFORGE ALPHA', 'Hellforge Kennels'], ['SIR VALCOR, THE UNDEAD KNIGHT', 'Ruined Cathedral'], ['THE LICH KING', "The Lich's Throne"]];
function startWin() {
  RUN.won = true; RUN.winScreen = true; RUN.winT = 0; RUN.winSel = 0; RUN.resT = 0;
  RUN.kills += G.kills; RUN.time += G.time; G.kills = 0; G.time = 0;
  RUN.winPay = shardGain(300 + 15 * (RUN.secrets || 0) + 3 * (RUN.elites || 0), null);
  if (typeof SAVE !== 'undefined') { SAVE.stats.wins = (SAVE.stats.wins || 0) + 1; const tm = RUN.time | 0; RUN.firstWin = !SAVE.best.win; if (!SAVE.best.win || tm < SAVE.best.win) SAVE.best.win = tm; if (typeof writeSave === 'function') writeSave(); }
  G.state = 'results'; releaseAll && releaseAll(); if (document.exitPointerLock) document.exitPointerLock();
  SFX.stageKey = 'victory'; if (SFX.mus) SFX.mus.boss = false;
  SFX.play('secret'); SFX.play('toll');
}
function winChoose(i) {
  if (RUN.winT < 1.6) return;
  RUN.winScreen = false;
  if (i === 0) { // DESCEND INTO THE ABYSS: a boon first, then depth 1
    G.state = 'play'; SFX.ev('abyss_descend', 1, ['ghost', 'heavy']); SFX.play('ghost'); SFX.play('heavy'); _startPick7(false);
  } else { RUN.retired = true; startResults(); }
}
const _resultsInput7 = resultsInput;
resultsInput = function (rdt) {
  if (!RUN.winScreen) { _resultsInput7(rdt); return; }
  RUN.winT += rdt; RUN.resT += rdt;
  if (RUN.winT < 1.6) return;
  if (KP.ArrowLeft || KP.KeyA || KP.ArrowUp || KP.KeyW) { RUN.winSel = 0; SFX.play('swing', 0.25); }
  if (KP.ArrowRight || KP.KeyD || KP.ArrowDown || KP.KeyS) { RUN.winSel = 1; SFX.play('swing', 0.25); }
  if (KP.Enter || KP.Space || KP.PadOK || KP.PadStart) winChoose(RUN.winSel);
  else if (KP.Escape || KP.PadBack) winChoose(1);
  else if (MBP[0] && RUN.winHover >= 0) winChoose(RUN.winHover);
};
addEventListener('mousemove', e => {
  if (G.state !== 'results' || !RUN.winScreen || !RUN.winBtns) return;
  const r = screen.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  RUN.winHover = RUN.winBtns.findIndex(c => x >= c[0] && x < c[0] + c[2] && y >= c[1] && y < c[1] + c[3]); if (RUN.winHover >= 0) RUN.winSel = RUN.winHover;
});
function drawWin(ctx) {
  const T = RUN.winT || 0, a = Math.min(1, T * 1.2);
  ctx.fillStyle = `rgba(16,0,26,${0.86 * a})`; ctx.fillRect(0, 0, W, H);
  // falling gold motes + rising souls
  for (let i = 0; i < 46; i++) { const sx = (i * 97.3) % W, sp = 10 + (i * 13) % 22, y = (T * sp + i * 37) % (H + 10) - 5; ctx.fillStyle = i % 3 ? `rgba(255,210,90,${0.5 * a})` : `rgba(140,255,170,${0.45 * a})`; ctx.fillRect(Math.round(sx + Math.sin(T + i) * 4), Math.round(i % 2 ? y : H - y), i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
  if (T < 0.25) return;
  goldFrame(ctx, 14, 6, W - 28, H - 14, '#ffd848');
  const pulse = 0.5 + 0.5 * Math.sin(T * 3);
  ctx.globalAlpha = Math.min(1, (T - 0.25) * 2);
  text(ctx, 'VICTORY', W / 2 + 1, 15, '#4a1060', 'center', 3); text(ctx, 'VICTORY', W / 2, 14, pulse > 0.5 ? '#ffe080' : '#ffd040', 'center', 3);
  text(ctx, 'THE LICH KING IS DESTROYED.', W / 2, 38, '#a0ffb0', 'center'); text(ctx, 'THE BLACK RELIQUARY IS YOURS.', W / 2, 48, '#80d090', 'center');
  if (RUN.firstWin) text(ctx, 'FIRST CLEAR!', W / 2, 60, pulse > 0.5 ? '#ffe080' : '#ff9a40', 'center');
  // left: the run; right: the fallen (credits)
  let y = 78; const L = (k, v, c = '#fff') => { text(ctx, k, 116, y, '#f0c040', 'right'); text(ctx, v, 124, y, c); y += 12; };
  const tm = RUN.time | 0;
  L('TIME', ((tm / 60) | 0) + ':' + String(tm % 60).padStart(2, '0'), '#ffffff');
  L('KILLS', String(RUN.kills), '#ffb0b0'); L('ELITES', String(RUN.elites || 0), '#ff9a60'); L('SECRETS', String(RUN.secrets || 0), '#a0ffd0'); L('BOONS', String(RUN.picks.length), '#d8b0ff');
  L('TITHE', '+' + (RUN.winPay || 0) + ' SHARDS', '#e0a0ff'); L('RUN TOTAL', String(RUN.shardsRun || 0) + ' SHARDS', '#e0a0ff');
  if (typeof SAVE !== 'undefined') L('VICTORIES', String(SAVE.stats.wins || 1), '#ffe080');
  // credits roll: the ten lieutenants
  const cx = 346, top = 72, bot = 214; ctx.save(); ctx.beginPath(); ctx.rect(232, top, 228, bot - top); ctx.clip();
  ctx.fillStyle = 'rgba(255,216,72,0.25)'; ctx.fillRect(228, top, 1, bot - top);
  const roll = Math.max(0, T - 0.6) * 14 % 540; let cy = bot - roll;
  const line = (s, c, sc = 1) => { if (cy > top - 12 && cy < bot + 2) text(ctx, s, cx, cy, c, 'center', sc); cy += sc === 2 ? 18 : 10; };
  line('THE FALLEN', '#ffd848', 2); cy += 2;
  for (const [n, w] of M7_FALLEN) { if (n.length > 27 && n.includes(', ')) { const [a1, a2] = n.split(', '); line(a1, '#ffffff'); line(a2, '#ffd0d0'); } else line(n, '#ffffff'); line(w, '#a080c0'); cy += 3; }
  cy += 8; line('THE UNYIELDING', '#ff4060', 2); line('a gothic roguelike', '#d0c0e0'); cy += 6; line('THANK YOU FOR PLAYING', '#a0ffb0'); cy += 8;
  line('...but the dark goes on.', '#c890ff'); line('Something stirs below.', '#c890ff');
  ctx.restore();
  // the choice
  const bw = 200, bh = 22, by = H - 46, bx0 = W / 2 - bw - 6, bx1 = W / 2 + 6; RUN.winBtns = [[bx0, by, bw, bh], [bx1, by, bw, bh]];
  if (T > 1.6) {
    for (let i = 0; i < 2; i++) {
      const [bx] = RUN.winBtns[i], on = RUN.winSel === i;
      ctx.fillStyle = on ? (i === 0 ? 'rgba(150,50,255,0.6)' : 'rgba(200,150,40,0.45)') : 'rgba(40,10,60,0.7)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = on ? '#ffe080' : '#806090'; ctx.fillRect(bx, by, bw, 1); ctx.fillRect(bx, by + bh - 1, bw, 1);
      text(ctx, i === 0 ? 'DESCEND INTO THE ABYSS' : 'RETURN TO THE CHAPEL', bx + bw / 2, by + 4, on ? '#ffffff' : '#c0a8d0', 'center');
      text(ctx, i === 0 ? 'keep your build' : 'bank shards, end run', bx + bw / 2, by + 13, on ? '#d8c0ff' : '#806890', 'center');
    }
    if ((G.t * 2 | 0) % 2 === 0) text(ctx, G.inputMode === 'pad' ? 'LEFT / RIGHT TO CHOOSE' : 'LEFT / RIGHT - ENTER TO CHOOSE', W / 2, H - 19, '#a090b0', 'center');
  }
  ctx.globalAlpha = 1;
}
const _drawResults7 = drawResults;
drawResults = function (ctx) {
  if (RUN.winScreen) { drawWin(ctx); return; }
  if (!RUN.won) { _drawResults7(ctx); return; }
  // a won run ends - in the Abyss, or by walking back to the Chapel
  const a = Math.min(1, RUN.resT * 1.5);
  ctx.fillStyle = `rgba(20,0,32,${0.88 * a})`; ctx.fillRect(0, 0, W, H);
  if (RUN.resT < 0.3) return;
  const d = abyssDepth(), dead = !RUN.retired;
  text(ctx, dead ? 'THE ABYSS CLAIMS YOU' : 'VICTORIOUS', W / 2 + 1, 13, '#2a0638', 'center', 2); text(ctx, dead ? 'THE ABYSS CLAIMS YOU' : 'VICTORIOUS', W / 2, 12, dead ? '#d090ff' : '#ffe080', 'center', 2);
  text(ctx, 'VICTOR OF THE BLACK RELIQUARY', W / 2, 34, '#a0ffb0', 'center');
  let y = 50; const L = (k, v, c = '#fff') => { text(ctx, k, 150, y, '#f0c040', 'right'); text(ctx, v, 164, y, c); y += 13; };
  const tm = RUN.time | 0;
  L('DEEPEST', d ? 'ABYSS DEPTH ' + d : 'THE LICH\'S THRONE', '#e0b0ff');
  L('TIME', ((tm / 60) | 0) + ':' + String(tm % 60).padStart(2, '0'));
  L('KILLS', String(RUN.kills), '#ffb0b0'); L('ELITES SLAIN', String(RUN.elites), '#ff9a60');
  if (typeof SAVE !== 'undefined') { L('SHARDS', '+' + (RUN.banked || 0) + '   (' + SAVE.shards + ' banked)', '#e0a0ff'); L('VICTORIES', String(SAVE.stats.wins || 1), '#ffe080'); }
  if (dead) L('SLAIN BY', RUN.cause || 'the dark', '#ff8090');
  y += 4; text(ctx, 'BOONS', W / 2, y, '#a0ffd0', 'center'); y += 12;
  const ids = RUN.picks.slice(0, 22); const iw = 18, x0 = Math.round(W / 2 - (ids.length * iw) / 2);
  ids.forEach((id, i) => { const u = UPG.find(q => q.id === id); if (!u) return; ctx.fillStyle = RARITY[u.r].g; ctx.fillRect(x0 + i * iw, y, 16, 16); ctx.fillStyle = '#12040e'; ctx.fillRect(x0 + i * iw + 1, y + 1, 14, 14); drawIcon(ctx, u.icon, x0 + i * iw + 8, y + 8, 14, 14); });
  if (RUN.resT > 1.2 && (G.t * 2 | 0) % 2 === 0) text(ctx, 'ENTER - RETURN TO THE CHAPEL     ESC - TITLE', W / 2, H - 16, '#ffffff', 'center');
};
const _newRun7 = newRun;
newRun = function () { RUN.won = false; RUN.winScreen = false; RUN.retired = false; RUN.firstWin = false; RUN.abyssBest = 0; _newRun7(); };
GAME.rogue.newRun = newRun;
