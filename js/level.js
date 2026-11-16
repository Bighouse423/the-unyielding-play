// ===== Level 1: The Ruined Nave =====
'use strict';
const LEVEL = {};
function buildLevel(theme) {
  theme = theme || {};
  MW = 38; MH = 40;
  const N = MW * MH;
  FH = new Float32Array(N); CH = new Float32Array(N); SOLID = new Uint8Array(N);
  WT = new Uint8Array(N); FT = new Uint8Array(N); CT = new Uint8Array(N); SKY = new Uint8Array(N);
  const T = Engine.tex;
  // floor textures
  FLOORTEX = [T.f_marble, T.f_carpet, T.f_tile, T.f_wood, T.f_mosaic, T.f_altar, T.f_blood, T.t_stone2];
  CEILTEX = [T.c_vault, T.c_wood];
  // wall defs
  const def = (base, tall) => ({ base: T[base], tall: tall ? { t: T[tall[0]], z0: tall[1], z1: tall[2], span: tall[3] || 0, x0: tall[4] || 0 } : null });
  WALLDEFS = [
    def('t_stone'),                               // 0 '#'
    def('t_stone', ['t_window', 0.9, 3.3]),       // 1 W
    def('t_stone', ['t_window2', 0.9, 3.3]),      // 2 V
    def('t_pillar'),                              // 3 P
    def('t_stone', ['t_banner', 1.2, 3.6]),       // 4 B
    def('t_stone', ['t_organ', 0, 2.6]),          // 5 O
    def('t_stone', ['t_statue', 0, 3.0]),         // 6 S
    def('t_stone2', ['t_rose', 0.6, 4.6, 3, 16]), // 7 R
    def('t_stone2'),                              // 8 %
    def('t_cracked'),                             // 9 C
    def('t_gate'),                                // 10 G
    def('t_irondoor'),                            // 11 I
    def('f_wood'),                                // 12 pew/pulpit sides
    def('t_stone2'),                              // 13 altar sides
  ];
  const grid = []; for (let y = 0; y < MH; y++) { grid.push(new Array(MW).fill('#')); }
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch; };
  const set = (x, y, ch) => grid[y][x] = ch;
  // ---- boss arena (open sky)
  rect(8, 0, 26, 0, '%'); rect(8, 0, 8, 9, '%'); rect(26, 0, 26, 9, '%'); rect(8, 9, 26, 9, '%');
  rect(9, 1, 25, 8, 'k'); rect(16, 0, 18, 0, 'R');
  set(11, 3, 'Q'); set(23, 3, 'Q'); set(11, 6, 'Q'); set(23, 6, 'Q');
  set(17, 9, 'G');
  // ---- transept + chasm
  rect(9, 10, 25, 13, '.'); rect(9, 11, 25, 12, '_');
  set(8, 10, 'O'); set(26, 10, 'O'); set(8, 12, 'W'); set(26, 12, 'V');
  // ---- nave
  rect(8, 14, 26, 32, '.'); rect(16, 10, 18, 10, '='); rect(16, 13, 18, 32, '=');
  for (const x of [11, 23]) for (const y of [15, 18, 21, 24, 27, 30]) set(x, y, 'P');
  for (const y of [17, 20, 26, 29]) { for (let x = 12; x <= 15; x++) set(x, y, 'p'); for (let x = 19; x <= 22; x++) set(x, y, 'p'); }
  set(13, 20, '.'); set(21, 26, '.'); set(14, 29, '.');
  // west wall details
  for (const y of [24, 27, 30]) set(7, y, 'W'); set(7, 15, 'W'); set(7, 19, 'B');
  for (const y of [15, 18, 21, 24, 30]) set(27, y, 'V'); set(27, 28, 'B'); set(27, 20, 'B');
  // Secret 1 chain: pew -> pulpit -> saint's hand -> halo
  set(8, 23, 'p'); set(8, 22, 'u'); set(8, 21, 'h'); set(9, 21, 'h'); set(7, 21, 'S');
  // Secret 2: clerestory gallery + crawl into the baptistry
  rect(8, 14, 9, 18, 'L'); set(7, 17, 'l'); set(6, 17, 'l'); set(5, 17, 'l');
  // baptistry
  rect(2, 18, 6, 23, 'b'); set(1, 20, 'W'); set(1, 22, 'V');
  // drop shortcut corridor
  rect(4, 24, 4, 36, 'c'); rect(5, 36, 10, 36, 'c'); set(11, 36, 'I');
  // nave south wall + narthex
  rect(8, 33, 26, 33, '#'); rect(16, 33, 18, 33, '=');
  rect(12, 34, 22, 38, 'n'); set(12, 35, 'B'); set(22, 35, 'B'); set(17, 39, '#');
  // east chapel + cracked wall + ossuary
  set(27, 27, 't'); rect(28, 25, 32, 29, 't'); set(32, 27, 'a'); set(33, 27, 'C'); rect(34, 25, 36, 29, 't');
  set(30, 24, 'W'); set(30, 30, 'V');
  LEVEL.grid = grid;
  // ---- convert
  const CEIL = 3.8;
  const fl = {
    '.': [0, CEIL, 0, 0], '=': [0, CEIL, 1, 0], 'p': [0.42, CEIL, 3, 0, 12], 'u': [0.84, CEIL, 3, 0, 12], 'h': [1.26, CEIL, 2, 0],
    'L': [1.85, CEIL, 2, 0], 'l': [1.85, 3.7, 2, 1], 'b': [1.26, 3.7, 4, 1], '_': [-2.2, CEIL, 6, 0], 't': [0, 2.9, 2, 1], 'a': [0.36, 2.9, 5, 1, 13],
    'k': [0, 5.0, 7, 0], 'n': [0, 3.0, 0, 1], 'c': [0, 2.5, 2, 1],
  };
  const wl = { '#': 0, 'W': 1, 'V': 2, 'P': 3, 'B': 4, 'O': 5, 'S': 6, 'R': 7, '%': 8, 'Q': 3, 'C': 9, 'G': 10, 'I': 11 };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const ch = grid[y][x], i = y * MW + x;
    if (wl[ch] !== undefined) { SOLID[i] = 1; FH[i] = 99; CH[i] = CEIL; WT[i] = wl[ch]; FT[i] = 2; CT[i] = 0; }
    else { const f = fl[ch]; FH[i] = f[0]; CH[i] = f[1]; FT[i] = f[2]; CT[i] = f[3]; WT[i] = f[4] !== undefined ? f[4] : 0; }
  }
  // sky: arena, chasm, broken nave roof
  for (let y = 1; y <= 8; y++) for (let x = 9; x <= 25; x++) SKY[y * MW + x] = 1;
  for (let y = 11; y <= 12; y++) for (let x = 9; x <= 25; x++) { SKY[y * MW + x] = 1; CH[y * MW + x] = 5.0; }
  for (let y = 21; y <= 23; y++) for (let x = 14; x <= 20; x++) { SKY[y * MW + x] = 1; CH[y * MW + x] = 5.0; }
  // ---- doors / dynamic cells
  LEVEL.doors = {
    secret: { x: 7, y: 21, open: false, target: 1.26, ft: 4 },
    gate: { x: 17, y: 9, state: 'closed' },
    iron: { x: 11, y: 36, open: false },
    cracked: { x: 33, y: 27, hp: 3, open: false },
  };
  // ---- lights
  const L = [];
  const GRN = [0.25, 1.0, 0.5];
  const torch = (x, y, green) => L.push({ x, y, r: 4.6, i: green ? 0.95 : 1.0, c: green ? GRN : [1.0, 0.55, 0.22], flicker: true });
  const isGreenTorch = (x, y) => (y === 21) || (x > 27 && x < 29);
  const pool = (x, y, c, r = 3.6, i = 0.85) => L.push({ x, y, r, i, c, nolos: false });
  for (const px of [11, 23]) for (const py of [15, 18, 21, 24, 27, 30]) torch(px + (px === 11 ? 1.1 : -0.1), py + 0.5, py === 21);
  // stained-glass pools
  const MAG = [1.0, 0.25, 0.8], CYN = [0.2, 0.9, 1.0], GLD = [1.0, 0.8, 0.25], VIO = [0.7, 0.3, 1.0], EMR = [0.2, 1.0, 0.55];
  pool(9.3, 24.5, MAG); pool(9.3, 27.5, CYN); pool(9.3, 30.5, VIO); pool(9.3, 15.5, VIO);
  pool(25.6, 15.5, CYN); pool(25.6, 18.5, MAG); pool(25.6, 21.5, VIO); pool(25.6, 24.5, EMR); pool(25.6, 30.5, GLD);
  pool(17.5, 22, [0.55, 0.5, 0.9], 4.5, 0.6); // moonlight through broken roof
  // narthex
  torch(14.5, 34.6); torch(20.5, 34.6); pool(17.5, 37, GLD, 3, 0.4);
  // transept & chasm glow
  for (let x = 10; x <= 24; x += 3) L.push({ x: x + 0.5, y: 12, r: 2.8, i: 0.7, c: [1.0, 0.15, 0.2] });
  pool(10, 10.5, GLD, 3); pool(24.5, 10.5, GLD, 3);
  // arena: red & violet braziers + rose window
  for (const [x, y] of [[10.5, 2], [24.5, 2], [10.5, 7.5], [24.5, 7.5]]) L.push({ x, y, r: 5.5, i: 1.1, c: y > 5 ? [0.3, 1.0, 0.5] : [1.0, 0.25, 0.3], flicker: true });
  pool(17.5, 2.5, MAG, 5, 0.75); pool(17.5, 4.5, [1.0, 0.5, 0.25], 4.5, 0.6); pool(13, 5, EMR, 3.5, 0.7); pool(22, 5, CYN, 3.5, 0.7);
  // baptistry: cyan holy glow
  pool(4.5, 20.5, CYN, 4, 1.0); pool(3, 23, MAG, 2.5); L.push({ x: 8.6, y: 16.2, r: 3, i: 0.8, c: GLD });
  // chapel / ossuary
  torch(28.5, 25.5, true); torch(28.5, 29.4, true); pool(31.5, 27.5, [1.0, 0.4, 0.2], 3, 0.8);
  L.push({ x: 35.5, y: 27.5, r: 3.5, i: 1.0, c: [0.3, 1.0, 0.6] });
  // corridor
  L.push({ x: 4.5, y: 30, r: 4, i: 0.6, c: GRN, flicker: true }); L.push({ x: 8, y: 36.5, r: 3.5, i: 0.5, c: [1, 0.5, 0.2], flicker: true });
  if (theme.light) for (const l of L) l.c = theme.light(l.c);
  buildLightmap(L, theme.ambient || [0.6, 0.5, 0.74]);
  LEVEL.lights = L;
  // ---- props
  const P = []; LEVEL.props = P;
  for (const px of [11, 23]) for (const py of [15, 18, 21, 24, 27, 30]) P.push({ type: 'torch', x: px + (px === 11 ? 1.06 : -0.06), y: py + 0.5, z: 1.55, green: py === 21 });
  P.push({ type: 'torch', x: 14.5, y: 34.08, z: 1.5 }, { type: 'torch', x: 20.5, y: 34.08, z: 1.5 });
  P.push({ type: 'torch', x: 28.5, y: 25.08, z: 1.5, green: true }, { type: 'torch', x: 28.5, y: 29.92, z: 1.5, green: true });
  for (const [x, y] of [[10.5, 2], [24.5, 2], [10.5, 7.5], [24.5, 7.5]]) P.push({ type: 'brazier', x, y, z: 0, green: y > 5 });
  if (theme.torch !== undefined) for (const pr of P) if (pr.type === 'torch' || pr.type === 'brazier') pr.green = theme.torch === 'green' ? true : theme.torch === 'orange' ? false : pr.green;
  for (const [x, y] of [[15.2, 31.5], [19.8, 31.5], [15.2, 14.4], [19.8, 14.4], [31.6, 26.2], [31.6, 28.8]]) P.push({ type: 'candelabra', x, y, z: 0 });
  P.push({ type: 'font', x: 4.5, y: 20.6, z: 1.26 });
  P.push({ type: 'font', x: 14.2, y: 37.6, z: 0 });
  // shafts from windows
  LEVEL.shafts = [];
  const sh = (x, y, c, slant) => LEVEL.shafts.push({ x, y, w: 0.9, z0: 0, z1: 3.3, c, i: 0.38, slant, ph: Math.random() * 6 });
  sh(8.6, 24.5, [255, 60, 200], 0.6); sh(8.6, 27.5, [60, 220, 255], 0.6); sh(8.6, 30.5, [180, 70, 255], 0.6); sh(8.6, 15.5, [170, 80, 255], 0.6);
  sh(26.4, 15.5, [60, 220, 255], -0.6); sh(26.4, 18.5, [255, 60, 200], -0.6); sh(26.4, 21.5, [180, 70, 255], -0.6); sh(26.4, 24.5, [60, 255, 150], -0.6); sh(26.4, 30.5, [255, 200, 60], -0.6);
  LEVEL.shafts.push({ x: 17.5, y: 22, w: 2.4, z0: 0, z1: 5, c: [170, 160, 255], i: 0.3, slant: 0, ph: 1 });
  LEVEL.shafts.push({ x: 17.5, y: 1.6, w: 2.2, z0: 0, z1: 4.6, c: [255, 80, 200], i: 0.33, slant: 0, ph: 2 });
  LEVEL.shafts.push({ x: 2.4, y: 20.5, w: 0.9, z0: 1.26, z1: 3.4, c: [80, 230, 255], i: 0.4, slant: 0.6, ph: 3 });
  // ---- hooks (whip interactions)
  LEVEL.hooks = [
    { id: 'halo', x: 7.97, y: 21.5, z: 2.31, range: 2.7, minZ: 1.0 },
    { id: 'censer', x: 13.2, y: 16.5, z: 2.35, range: 6.5, minZ: -9, land: { x: 9.0, y: 16.4, z: 1.85 } },
  ];
  // ---- pickups
  LEVEL.pickups = [
    { type: 'pistol', x: 3.4, y: 19.4 }, { type: 'chalice', x: 3.4, y: 22.6 },
    { type: 'shard', x: 8.6, y: 14.6 }, { type: 'mana', x: 9.4, y: 17.6 },
    { type: 'blade', x: 35.5, y: 27.5 }, { type: 'rose', x: 35.4, y: 25.6 },
    { type: 'vial', x: 25.4, y: 31.6 }, { type: 'vial', x: 9.4, y: 29.5 }, { type: 'vial', x: 24.6, y: 13.5 }, { type: 'vial', x: 29.5, y: 28.6 },
    { type: 'mana', x: 12.5, y: 32.4 }, { type: 'mana', x: 25.2, y: 16.6 }, { type: 'rose', x: 10.0, y: 10.4 }, { type: 'vial', x: 4.5, y: 33 },
  ];
  // ---- secrets
  LEVEL.secrets = [
    { id: 'baptistry', name: 'The Baptistry Behind the Saint', box: [2, 18, 7, 24], minZ: 1.0, found: false },
    { id: 'clerestory', name: 'The Clerestory', box: [8, 14, 10, 19], minZ: 1.5, found: false },
    { id: 'ossuary', name: 'The Sealed Ossuary', box: [34, 25, 37, 30], minZ: -9, found: false },
  ];
  // ---- enemies
  LEVEL.spawns = [
    ['zombie', 15.5, 30.8], ['zombie', 20.2, 31.2], ['zombie', 12.6, 27.6], ['bat', 17.5, 28.5], ['bat', 24.5, 29.5],
    ['zombie', 24.5, 25.5], ['azombie', 17.5, 24.5], ['zombie', 9.5, 25.6], ['imp', 20.5, 22.5],
    ['fzombie', 9.5, 19.5, 'ambush'], ['fzombie', 25.0, 19.5, 'ambush'],
    ['skeleton', 14.5, 18.6], ['skeleton', 20.5, 18.6], ['azombie', 17.5, 15.5], ['bat', 13.5, 15.5], ['bat', 21.5, 16], ['imp', 24.5, 14.5], ['ghost', 12.5, 22.5],
    ['skeleton', 29.5, 26.5], ['skeleton', 30.5, 28.5], ['azombie', 31.0, 27.5],
    ['ghost', 35.5, 26.5],
    ['skeleton', 12.5, 10.5], ['skeleton', 22.5, 10.5], ['bat', 17.5, 10.5],
    ['zombie', 4.5, 30.5], ['zombie', 8.5, 36.5],
  ];
  LEVEL.boss = { x: 17.5, y: 3.6 };
  LEVEL.start = { x: 17.5, y: 37.2, ang: -Math.PI / 2 };
  LEVEL.checkpoints = [{ x: 17.5, y: 36.6, ang: -Math.PI / 2 }, { x: 17.5, y: 10.4, ang: -Math.PI / 2 }];
  LEVEL.kind = 'castle'; LEVEL.arena = null; LEVEL.cracks = [LEVEL.doors.cracked]; LEVEL.bossType = 'vknight'; LEVEL.eliteRoom = null; LEVEL.rooms = null; LEVEL.gatePath = null;
  LEVEL.signs = [
    { x: 17.5, y: 35.5, r: 1.6, text: 'LMB SWORD  RMB WHIP / SHIELD  TAB SWAP', text2: 'Shield up just as a hit lands = PARRY', padText: 'R2 SWORD  L2 WHIP / SHIELD  R1 SWAP', padText2: 'Shield up just as a hit lands = PARRY', shown: false },
    { x: 17.5, y: 31.5, r: 1.6, text: 'Q / E / V ROLL - steer it with WASD', text2: 'SPACE JUMP  SHIFT RUN  red glow = FINISHER', padText: 'CIRCLE ROLL - steer it with the stick', padText2: 'CROSS JUMP  L3 SPRINT  red glow = FINISHER', shown: false },
    { x: 9.6, y: 22.5, r: 1.6, text: "The saint's halo looks... off. Tarnished.", text2: 'Climb her: pew, pulpit, hand.', shown: false },
    { x: 13.2, y: 19.0, r: 1.7, text: 'A censer hangs low from the vault.', text2: 'Crack the whip at it to latch.', shown: false },
    { x: 31.5, y: 27.5, r: 1.6, text: 'Cold air seeps from a cracked wall.', text2: '', shown: false },
    { x: 17.5, y: 13.7, r: 1.4, text: 'The floor has fallen into a sea of blood.', text2: 'RUN and JUMP.', shown: false },
  ];
}
