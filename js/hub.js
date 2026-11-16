'use strict';
// ===== M3: THE CHAPEL - the hub between runs =====
// A small walkable chapel. Spend Reliquary Shards at the altar on unlocks (weapons and relics join the drop pool),
// starting loadouts and small capped blessings. Walk through the iron door to descend. Progress lives in localStorage.
const SAVE_KEY = 'tu_share_m7d_fresh_k4c9_save';
function defaultSave() { return { v: 1, shards: 0, unl: {}, upg: { vit: 0, soul: 0, might: 0, fortune: 0 }, load: { sword: 'base', whip: 'base', ranged: 'none' }, best: { stage: 0, kills: 0, time: 0 }, stats: { runs: 0, kills: 0, elites: 0, bosses: 0, secrets: 0, shards: 0 } }; }
function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { s = null; }
  const d = defaultSave(); if (!s || typeof s !== 'object') s = {};
  const out = Object.assign(d, s); for (const k of ['unl', 'upg', 'load', 'best', 'stats']) out[k] = Object.assign(defaultSave()[k], s[k] || {});
  // Public friends copy: never import tu_save / tu_best / tu_play_* or any older key.
  return out;
}
const SAVE = loadSave(); window.SAVE = SAVE;
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); localStorage.setItem('tu_share_m7d_fresh_k4c9_best', SAVE.best.stage); } catch (e) {} }
RUN.best = Math.max(RUN.best || 0, SAVE.best.stage);

// ---- the altar's offerings ----
// tab 0 ARMORY: weapons into the drop pool, tab 1 RELICS into the drop pool, tab 2 LOADOUT: start runs with them, tab 3 BLESSINGS: capped stats
const ALTAR = {
  tabs: ['ARMORY', 'RELICS', 'LOADOUT', 'BLESSINGS'],
  items: [
    { tab: 0, id: 'stormsword', cost: 60 }, { tab: 0, id: 'rapier', cost: 60 }, { tab: 0, id: 'chainwhip', cost: 50 }, { tab: 0, id: 'crossbow', cost: 70 },
    { tab: 1, id: 'gravecoin', cost: 20 }, { tab: 1, id: 'emberheart', cost: 35 }, { tab: 1, id: 'rimesigil', cost: 35 }, { tab: 1, id: 'stormbell', cost: 40 },
    { tab: 1, id: 'fang', cost: 40 }, { tab: 1, id: 'ironoath', cost: 45 }, { tab: 1, id: 'wraithcloak', cost: 45 },
    // loadouts: slot, value, the unlock they need, purchase cost
    { tab: 2, id: 'ld_frost', slot: 'sword', val: 'frost', need: 'frostsword', cost: 45, name: 'START: FROST LONGSWORD', icon: 'ic_frostsword' },
    { tab: 2, id: 'ld_storm', slot: 'sword', val: 'storm', need: 'stormsword', cost: 50, name: 'START: LIGHTNING SWORD', icon: 'ic_stormsword' },
    { tab: 2, id: 'ld_rapier', slot: 'sword', val: 'rapier', need: 'rapier', cost: 50, name: 'START: VAMPIRE RAPIER', icon: 'ic_rapier' },
    { tab: 2, id: 'ld_fire', slot: 'whip', val: 'fire', need: 'firewhip', cost: 45, name: 'START: FIRE WHIP', icon: 'ic_firewhip' },
    { tab: 2, id: 'ld_chain', slot: 'whip', val: 'chain', need: 'chainwhip', cost: 50, name: 'START: CHAIN WHIP', icon: 'ic_chainwhip' },
    { tab: 2, id: 'ld_pistol', slot: 'ranged', val: 'pistol', need: 'sidearm', cost: 35, name: 'START: HOLY SIDEARM', icon: 'p_pistol' },
    { tab: 2, id: 'ld_xbow', slot: 'ranged', val: 'crossbow', need: 'crossbow', cost: 60, name: 'START: GOTHIC CROSSBOW', icon: 'ic_crossbow' },
    // blessings: 3 tiers each
    { tab: 3, id: 'vit', up: true, costs: [30, 60, 100], name: 'BLESSING OF VIGOR', icon: 'p_chalice', desc: '+10 max health per tier.' },
    { tab: 3, id: 'soul', up: true, costs: [25, 50, 85], name: 'BLESSING OF THE SOUL', icon: 'p_shard', desc: '+10 max mana per tier.' },
    { tab: 3, id: 'might', up: true, costs: [40, 80, 130], name: 'BLESSING OF MIGHT', icon: 'p_blade', desc: '+6% sword and whip damage per tier.' },
    { tab: 3, id: 'fortune', up: true, costs: [30, 60, 95], name: 'BLESSING OF TITHES', icon: 'ic_gravecoin', desc: '+10% Reliquary Shards per tier.' },
  ],
};
const UPG_CAP = 3;
const LOCKED = new Set(ALTAR.items.filter(it => it.tab <= 1).map(it => it.id));
function isUnlocked(id) { return !LOCKED.has(id) || !!SAVE.unl[id]; }
function altarInfo(it) {
  if (it.tab <= 1) { const u = UPG.find(q => q.id === it.id); return { name: u.name, icon: u.icon, desc: u.desc, r: u.r }; }
  if (it.tab === 2) { const u = UPG.find(q => q.id === it.need); return { name: it.name, icon: it.icon, desc: 'Begin every run wielding it. ' + (u ? u.desc : ''), r: 'epic' }; }
  return { name: it.name, icon: it.icon, desc: it.desc, r: 'rare' };
}
// state of an offering: {label, can, cost, done, equipped}
function altarState(it) {
  if (it.tab <= 1) return SAVE.unl[it.id] ? { label: 'IN THE POOL', done: true } : { label: it.cost + '', cost: it.cost, can: SAVE.shards >= it.cost };
  if (it.tab === 2) {
    if (!isUnlocked(it.need)) return { label: 'NEEDS UNLOCK', locked: true };
    const eq = SAVE.load[it.slot] === it.val;
    if (SAVE.unl[it.id]) return { label: eq ? 'EQUIPPED' : 'OWNED', done: true, equipped: eq };
    return { label: it.cost + '', cost: it.cost, can: SAVE.shards >= it.cost };
  }
  const lv = SAVE.upg[it.id] || 0;
  if (lv >= UPG_CAP) return { label: 'MAX', done: true, lv };
  return { label: it.costs[lv] + '', cost: it.costs[lv], can: SAVE.shards >= it.costs[lv], lv };
}
function altarBuy(it) {
  const st = altarState(it);
  if (it.tab === 2 && st.done) { // toggle equip
    SAVE.load[it.slot] = st.equipped ? (it.slot === 'ranged' ? 'none' : 'base') : it.val; writeSave(); SFX.play('pickup'); return;
  }
  if (st.done || st.locked) { SFX.play('block', 0.4); return; }
  if (!st.can) { SFX.play('block', 0.4); ALTARUI.deny = 0.5; return; }
  SAVE.shards -= st.cost;
  if (it.up) SAVE.upg[it.id] = (SAVE.upg[it.id] || 0) + 1;
  else { SAVE.unl[it.id] = 1; if (it.tab === 2) SAVE.load[it.slot] = it.val; }
  writeSave(); SFX.ev('altar_buy', 1, ['glint', 'pickup']); SFX.play('glint'); SFX.play('pickup'); ALTARUI.flash = 0.6;
  addBurst();
}
function addBurst() { for (let i = 0; i < 40; i++) addP({ k: 'ember', x: 10.5 + rand(-0.4, 0.4), y: 4.5 + rand(-0.3, 0.3), z: 1.2, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: rand(0.5, 2.5), size: rand(0.03, 0.06), col: [RGB(220, 140, 255), RGB(120, 255, 170), RGB(255, 220, 120)][i % 3], life: rand(0.5, 1.1) }); }

// ---- shards ----
function shardGain(n, e) {
  if (!RUN.on) return 0;
  const k = (P.mods && P.mods.coin ? 1.5 : 1) * (1 + 0.1 * (SAVE.upg.fortune || 0));
  const v = Math.max(1, Math.round(n * k)); RUN.shardsRun = (RUN.shardsRun || 0) + v;
  RUN.shardFlash = 0.6;
  if (e && n >= 4) dmgNum(e.x, e.y, (e.z || 0) + (e.h || 1) + 0.5, '+' + v + ' SHARDS', '#d090ff');
  return v;
}
// bank the run into the save (called from startResults)
function bankRun() {
  const got = RUN.shardsRun || 0; SAVE.shards += got; SAVE.stats.shards += got; RUN.banked = got;
  SAVE.stats.runs++; SAVE.stats.kills += RUN.kills; SAVE.stats.elites += RUN.elites; SAVE.stats.bosses += RUN.bosses || 0; SAVE.stats.secrets += RUN.secrets || 0;
  RUN.newBest = RUN.stage > SAVE.best.stage; if (RUN.newBest) SAVE.best.stage = RUN.stage;
  SAVE.best.kills = Math.max(SAVE.best.kills, RUN.kills); SAVE.best.time = Math.max(SAVE.best.time, RUN.time | 0);
  RUN.best = SAVE.best.stage; writeSave();
}
// apply blessings + loadout to a fresh run (called from newRun after newGame)
function applyMeta() {
  const u = SAVE.upg;
  P.maxhp = 100 + 10 * u.vit; P.hp = P.maxhp; P.maxmana = 50 + 10 * u.soul; P.mana = Math.max(P.mana, 30 + 5 * u.soul);
  P.mods.sword *= 1 + 0.06 * u.might; P.mods.whip *= 1 + 0.06 * u.might;
  for (const it of ALTAR.items) {
    if (it.tab !== 2 || !SAVE.unl[it.id] || SAVE.load[it.slot] !== it.val) continue;
    if (it.slot === 'ranged') { P.hasPistol = true; P.mana = P.maxmana; if (it.val === 'crossbow') P.wpn.ranged = 'crossbow'; }
    else P.wpn[it.slot] = it.val;
    RUN.picks.push(it.need);
  }
}

// ---- the chapel level ----
function buildChapel() {
  MW = 21; MH = 26; const N = MW * MH; const T = Engine.tex; const I = (x, y) => y * MW + x;
  FH = new Float32Array(N); CH = new Float32Array(N); SOLID = new Uint8Array(N);
  WT = new Uint8Array(N); FT = new Uint8Array(N); CT = new Uint8Array(N); SKY = new Uint8Array(N);
  FLOORTEX = [T.f_marble, T.f_carpet, T.f_altar, T.f_mosaic, T.t_stone2, T.f_crypt, T.f_blood];
  CEILTEX = [T.c_vault, T.c_wood];
  const def = (base, tall) => ({ base: T[base], tall: tall ? { t: T[tall[0]], z0: tall[1], z1: tall[2], span: tall[3] || 0, x0: tall[4] || 0 } : null });
  WALLDEFS = [
    def('t_stone'), def('t_stone', ['t_window', 0.9, 3.3]), def('t_stone2', ['t_rose', 0.8, 4.4, 3, 9]), def('t_pillar'),
    def('t_stone', ['t_banner', 1.2, 3.6]), def('t_stone', ['t_organ', 0, 2.6]), def('t_stone', ['t_statue', 0, 3.0]),
    def('t_irondoor'), def('t_sarc'), def('t_crypt'), def('t_crypt', ['t_skullcol', 0, 2.6]),
  ];
  for (let i = 0; i < N; i++) { SOLID[i] = 1; FH[i] = 99; CH[i] = 5; WT[i] = 0; }
  const open = (x, y, fh = 0, ch = 5.2, ft = 0, ct = 0) => { const i = I(x, y); SOLID[i] = 0; FH[i] = fh; CH[i] = ch; FT[i] = ft; CT[i] = ct; };
  // nave x 3..17, y 3..20
  for (let y = 3; y <= 20; y++) for (let x = 3; x <= 17; x++) open(x, y, 0, 5.2, (x + y) % 2 ? 0 : 3, 0);
  for (let y = 6; y <= 20; y++) for (let x = 9; x <= 11; x++) FT[I(x, y)] = 1;               // red carpet up the aisle
  for (let y = 3; y <= 5; y++) for (let x = 6; x <= 14; x++) { FH[I(x, y)] = 0.3; FT[I(x, y)] = 2; } // altar dais
  for (const x of [9, 10, 11]) { const i = I(x, 4); FH[i] = 1.0; FT[i] = 2; WT[i] = 8; }                                 // the altar block (solid by height)
  // side aisles lower ceiling (wood), nave vault
  for (let y = 3; y <= 20; y++) for (const x of [3, 4, 16, 17]) { CH[I(x, y)] = 3.6; CT[I(x, y)] = 1; }
  // pillars
  for (const y of [8, 12, 16]) for (const x of [5, 15]) { const i = I(x, y); SOLID[i] = 1; FH[i] = 99; WT[i] = 3; }
  // walls
  for (let y = 3; y <= 20; y++) { WT[I(2, y)] = y % 4 === 1 ? 1 : y % 4 === 3 ? 4 : 0; WT[I(18, y)] = y % 4 === 1 ? 1 : y % 4 === 3 ? 4 : 0; }
  for (let x = 3; x <= 17; x++) WT[I(x, 2)] = x >= 9 && x <= 11 ? 2 : x === 7 || x === 13 ? 5 : x === 4 || x === 16 ? 6 : 0;
  for (let x = 3; x <= 17; x++) WT[I(x, 21)] = x === 10 ? 7 : x === 8 || x === 12 ? 6 : x === 5 || x === 15 ? 4 : 0;
  // the descent: a short dark passage behind the iron door
  for (let y = 22; y <= 24; y++) open(10, y, 0, 3.2, 5, 0);
  for (let y = 22; y <= 24; y++) { WT[I(9, y)] = 10; WT[I(11, y)] = 10; }
  WT[I(10, 25)] = 9;
  // door cell stays solid until opened
  { const i = I(10, 21); SOLID[i] = 1; FH[i] = 99; CH[i] = 3.2; }
  // props + lights
  const props = [], L = [];
  for (const y of [6.5, 10.5, 14.5, 18.5]) for (const x of [8.4, 12.6]) props.push({ type: 'candelabra', x, y, z: 0 });
  props.push({ type: 'brazier', x: 7.5, y: 4.2, z: 0.3, green: false }, { type: 'brazier', x: 13.5, y: 4.2, z: 0.3, green: false });
  props.push({ type: 'brazier', x: 8.6, y: 20.3, z: 0, green: true }, { type: 'brazier', x: 12.4, y: 20.3, z: 0, green: true });
  props.push({ type: 'relicfloat', x: 10.5, y: 4.5, z: 1.55 });
  for (const y of [6.5, 10.5, 14.5, 18.5]) { L.push({ x: 8.4, y, r: 3.6, i: 0.75, c: [1, 0.72, 0.38] }); L.push({ x: 12.6, y, r: 3.6, i: 0.75, c: [1, 0.72, 0.38] }); }
  L.push({ x: 10.5, y: 4.6, r: 6, i: 1.25, c: [1, 0.8, 0.5] });
  L.push({ x: 10.5, y: 3.2, r: 7, i: 0.9, c: [0.7, 0.35, 1] });
  L.push({ x: 3.8, y: 6, r: 4.5, i: 0.7, c: [0.6, 0.3, 1] }, { x: 17.2, y: 6, r: 4.5, i: 0.7, c: [0.6, 0.3, 1] });
  L.push({ x: 3.8, y: 15, r: 4.5, i: 0.7, c: [0.3, 1, 0.55] }, { x: 17.2, y: 15, r: 4.5, i: 0.7, c: [0.3, 1, 0.55] });
  L.push({ x: 10.5, y: 20.2, r: 4, i: 1.0, c: [0.35, 1, 0.55] }, { x: 10.5, y: 23.5, r: 3, i: 0.9, c: [0.4, 1, 0.6] });
  buildLightmap(L, [0.5, 0.42, 0.56]);
  LEVEL.lights = L; LEVEL.props = props;
  LEVEL.kind = 'hub'; LEVEL.arena = null; LEVEL.cracks = []; LEVEL.hooks = []; LEVEL.secrets = []; LEVEL.pickups = []; LEVEL.spawns = [];
  LEVEL.signs = [{ x: 10.5, y: 17.5, r: 2.2, text: 'THE CHAPEL OF THE UNYIELDING', text2: 'Offer shards at the altar. The iron door leads down.', shown: false }];
  LEVEL.shafts = [{ x: 10.5, y: 3.6, w: 2.6, z0: 0, z1: 4.8, c: [190, 110, 255], i: 0.32, slant: 0.35, ph: 1 }, { x: 10.5, y: 8.5, w: 1.4, z0: 0, z1: 5.0, c: [120, 255, 170], i: 0.18, slant: 0.2, ph: 2 }];
  LEVEL.doors = { gate: { x: 10, y: 21, state: 'closed' }, cracked: null };
  LEVEL.start = { x: 10.5, y: 19.3, ang: -Math.PI / 2 };
  LEVEL.checkpoints = [{ ...LEVEL.start }];
  LEVEL.boss = { x: 10.5, y: 23.5 }; LEVEL.bossType = 'zombie';
  LEVEL.eliteRoom = null; LEVEL.rooms = null; LEVEL.gatePath = null; LEVEL.path = null;
}

// ---- hub flow ----
const ALTARUI = { tab: 0, sel: 0, t: 0, arm: true, flash: 0, deny: 0 };
function enterHub() {
  RUN.on = false; RUN.hub = true; RUN.cfg = stageCfg(1);
  HAZE[0] = 120; HAZE[1] = 70; HAZE[2] = 160; buildLUT({ sh: [0.06, 0.02, 0.12], hi: [0.08, 0.05, 0.02] }); SFX.stageKey = 'hub'; SFX.bossKey = 'vknight';
  newRunPlayer(); newGame(); RUN.hub = true;
  // no boss here: retire the placeholder newGame() makes
  if (G.boss) { G.boss.alive = false; G.boss.hidden = true; G.boss.awake = false; } G.enemies = []; G.totalEnemies = 0;
  applyMeta(); RUN.picks = [];
  G.state = 'play'; G.fade = 1; ALTARUI.arm = true;
  G.bigText = { t1: 'THE CHAPEL', t2: SAVE.shards + ' RELIQUARY SHARDS', dur: 2.6, t: 0 };
}
function leaveHubForRun() { RUN.hub = false; newRun(); }
// called from updateDoors when LEVEL.kind === 'hub'
function hubTick(dt) {
  const g = LEVEL.doors.gate, gi = g.y * MW + g.x;
  const da = Math.hypot(P.x - 10.5, P.y - 4.5);
  if (!ALTARUI.arm && da > 2.1) ALTARUI.arm = true;
  if (ALTARUI.arm && da < 1.75) { ALTARUI.arm = false; openAltar(); return; }
  if (g.state === 'closed' && Math.hypot(P.x - 10.5, P.y - 21.5) < 2.0) { g.state = 'open'; animCell(g.x, g.y, 3.0, 0, 0.8); SFX.ev('door', 1, ['stone']); SFX.play('stone'); toast('THE DESCENT', 'Walk on to begin a run.', '#a0ffd0', 2.2); }
  if (g.state === 'open' && P.y > 22.6) { g.state = 'gone'; G.fade = 1; SFX.play('stone'); leaveHubForRun(); }
}
function openAltar() {
  G.state = 'altar'; ALTARUI.t = 0; releaseAll(); if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {}
  SFX.play('glint', 0.6);
}
function closeAltar() { G.state = 'play'; releaseAll(); }
function altarList() { return ALTAR.items.filter(it => it.tab === ALTARUI.tab); }
function altarInput(rdt) {
  ALTARUI.t += rdt; ALTARUI.flash = Math.max(0, ALTARUI.flash - rdt); ALTARUI.deny = Math.max(0, ALTARUI.deny - rdt);
  const L = altarList();
  if (KP.ArrowUp || KP.KeyW) ALTARUI.sel = (ALTARUI.sel + L.length - 1) % L.length, (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25));
  if (KP.ArrowDown || KP.KeyS) ALTARUI.sel = (ALTARUI.sel + 1) % L.length, (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25));
  // M7c: mouse wheel / PgUp / PgDn / Home / End step through the list (no wrap) - the window scrolls with the selection
  let step = ALTARUI.wheel || 0; ALTARUI.wheel = 0;
  if (KP.PageDown) step += 7; if (KP.PageUp) step -= 7; if (KP.End) step += 999; if (KP.Home) step -= 999;
  if (step) { const ns = clamp(ALTARUI.sel + step, 0, L.length - 1); if (ns !== ALTARUI.sel) { ALTARUI.sel = ns; (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25)); } }
  // mouse: click a tab to switch, click a row to select it, click the selected row again to offer / equip
  const ck = ALTARUI.click; ALTARUI.click = null;
  if (ck && ck.tab !== undefined && ck.tab !== ALTARUI.tab) { ALTARUI.tab = ck.tab; ALTARUI.sel = 0; ALTARUI.top = 0; (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25)); }
  if (ck && ck.row !== undefined && ck.row < L.length) { if (ck.row === ALTARUI.sel) { if (ALTARUI.t > 0.25) altarBuy(L[ck.row]); } else { ALTARUI.sel = ck.row; (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25)); } }
  if (KP.ArrowLeft || KP.KeyA || KP.KeyQ) { ALTARUI.tab = (ALTARUI.tab + 3) % 4; ALTARUI.sel = 0; (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25)); }
  if (KP.ArrowRight || KP.KeyD || KP.KeyE || KP.Tab) { ALTARUI.tab = (ALTARUI.tab + 1) % 4; ALTARUI.sel = 0; (SFX.ev('ui_click', 0.5, ['clink']), SFX.play('clink', 0.25)); }
  ALTARUI.sel = Math.min(ALTARUI.sel, altarList().length - 1);
  if (ALTARUI.t > 0.25 && (KP.Enter || KP.Space || KP.PadOK)) altarBuy(altarList()[ALTARUI.sel]);
  if (ALTARUI.t > 0.25 && (KP.Escape || KP.PadBack || KP.Backspace)) closeAltar();
}
function drawAltar(ctx) {
  ctx.fillStyle = 'rgba(14,0,24,0.78)'; ctx.fillRect(0, 0, W, H);
  const fx = 22, fy = 6, fw = W - 44, fh = H - 24;
  goldFrame(ctx, fx, fy, fw, fh, '#c060ff');
  text(ctx, 'THE ALTAR OF SHARDS', W / 2, fy + 6, '#ffe080', 'center', 2);
  drawIcon(ctx, 'p_shard', fx + fw - 40, fy + 11, 10, 10);
  text(ctx, String(SAVE.shards), fx + fw - 8, fy + 8, ALTARUI.flash > 0 ? '#ffffff' : ALTARUI.deny > 0 ? '#ff6070' : '#e0a0ff', 'right');
  // tabs
  const tw = (fw - 20) / 4;
  ALTARUI.hit = { tabs: [], rows: [] };
  ALTAR.tabs.forEach((nm, i) => { const x = fx + 10 + i * tw, on = i === ALTARUI.tab; ALTARUI.hit.tabs.push([x + 1, fy + 26, tw - 2, 12, i]); ctx.fillStyle = on ? 'rgba(160,80,255,0.45)' : 'rgba(40,10,60,0.6)'; ctx.fillRect(x + 1, fy + 26, tw - 2, 12); if (on) { ctx.fillStyle = '#f0c040'; ctx.fillRect(x + 1, fy + 37, tw - 2, 1); } text(ctx, nm, x + tw / 2, fy + 28, on ? '#ffe080' : '#a080b0', 'center'); });
  const L = altarList(); let y = fy + 44;
  // M7: the lists outgrew the frame - show a scrolling window of 8 rows that follows the selection
  const ROWS = 8; ALTARUI.top = clamp(ALTARUI.top || 0, Math.max(0, ALTARUI.sel - ROWS + 1), Math.min(ALTARUI.sel, Math.max(0, L.length - ROWS)));
  const top = ALTARUI.top;
  if (L.length > ROWS) { const bh = ROWS * 16, th = Math.max(10, bh * ROWS / L.length), ty = fy + 42 + (bh - th) * top / (L.length - ROWS); ctx.fillStyle = 'rgba(60,20,90,0.8)'; ctx.fillRect(fx + fw - 7, fy + 42, 3, bh); ctx.fillStyle = '#c080ff'; ctx.fillRect(fx + fw - 7, Math.round(ty), 3, Math.round(th));
    // M7c: scroll arrows (lit when there is more that way) + a position counter
    const ax = fx + fw - 8, up = top > 0, dn = top + ROWS < L.length, pulse = (G.t * 3 | 0) % 2 ? '#ffe080' : '#f0c040';
    for (let k = 0; k < 3; k++) { ctx.fillStyle = up ? pulse : 'rgba(120,80,150,0.5)'; ctx.fillRect(ax + 2 - k, fy + 37 + k, 1 + 2 * k, 1); ctx.fillStyle = dn ? pulse : 'rgba(120,80,150,0.5)'; ctx.fillRect(ax + 2 - k, fy + 175 - k, 1 + 2 * k, 1); }
    if (dn) { for (let k = 0; k < 3; k++) { ctx.fillStyle = pulse; ctx.fillRect(W / 2 - 2 + k, fy + 172 + k, 5 - 2 * k, 1); } }
    if (up) { for (let k = 0; k < 3; k++) { ctx.fillStyle = pulse; ctx.fillRect(W / 2 - k, fy + 39 + k, 1 + 2 * k, 1); } }
    text(ctx, (ALTARUI.sel + 1) + '/' + L.length, fx + fw - 12, fy + 178, '#a090b0', 'right'); }
  L.forEach((it, i) => {
    if (i < top || i >= top + ROWS) return;
    const inf = altarInfo(it), st = altarState(it), sel = i === ALTARUI.sel; ALTARUI.hit.rows.push([fx + 10, y - 2, fw - 20, 16, i]);
    if (sel) { ctx.fillStyle = 'rgba(160,80,255,0.35)'; ctx.fillRect(fx + 10, y - 2, fw - 20, 15); ctx.fillStyle = '#f0c040'; ctx.fillRect(fx + 10, y - 2, 2, 15); }
    ctx.fillStyle = RARITY[inf.r].g; ctx.fillRect(fx + 15, y - 1, 13, 13); ctx.fillStyle = '#12040e'; ctx.fillRect(fx + 16, y, 11, 11);
    drawIcon(ctx, inf.icon, fx + 21.5, y + 5.5, 11, 11);
    let nm = inf.name; if (it.up) nm += '   ' + (st.lv || 0) + '/' + UPG_CAP;
    { const nr = Math.min(fx + fw - 48, fx + fw - 14 - String(st.label).length * 8 - 6); tfLines(ctx, tfLayout(nm, nr - (fx + 32), 1, 1), fx + 32, y + 2, st.locked ? '#706070' : sel ? '#ffffff' : '#e0d0e8', 'left'); }
    const col = st.done ? (st.equipped ? '#60ffb0' : '#a0ffd0') : st.locked ? '#806878' : st.can ? '#e0a0ff' : '#ff6070';
    if (st.cost) drawIcon(ctx, 'p_shard', fx + fw - 44, y + 5, 8, 8);
    text(ctx, st.label, fx + fw - 14, y + 2, col, 'right');
    y += 16;
  });
  // description of the selected offering
  const it = L[ALTARUI.sel]; if (it) {
    const inf = altarInfo(it); let yy = fy + fh - 52;
    ctx.fillStyle = 'rgba(30,6,40,0.8)'; ctx.fillRect(fx + 10, yy - 4, fw - 20, 30);
    fitBlock(ctx, inf.desc, W / 2, yy, 432, 26, '#d8c8e0', 'center');
  }
  const s = SAVE.stats;
  text(ctx, 'BEST STAGE ' + SAVE.best.stage + '   RUNS ' + s.runs + '   KILLS ' + s.kills + '   BOSSES ' + s.bosses, W / 2, fy + fh - 16, '#a090b0', 'center');
  if ((G.t * 2 | 0) % 2 === 0 || true) { if (G.inputMode === 'pad') promptRow(ctx, ['{cross}', ' OFFER / EQUIP   ', '{circle}', ' LEAVE   D-PAD MOVE'], W / 2, H - 13, '#ffffff', 'center'); else text(ctx, 'W/S/WHEEL SELECT   A/D TAB   ENTER/CLICK OFFER   ESC LEAVE', W / 2, H - 13, '#ffffff', 'center'); }
}
// hub HUD: shards + records
function drawHubHUD(ctx) {
  goldFrame(ctx, 4, 4, 84, 13, '#c060ff'); text(ctx, 'THE CHAPEL', 46, 7, '#ffe080', 'center');
  goldFrame(ctx, W - 96, 4, 92, 13, '#c060ff'); drawIcon(ctx, 'p_shard', W - 86, 10.5, 9, 9); text(ctx, SAVE.shards + ' SHARDS', W - 8, 7, '#e0a0ff', 'right');
  text(ctx, 'BEST STAGE ' + SAVE.best.stage + '  RUNS ' + SAVE.stats.runs, W - 6, 21, '#a090b0', 'right');
  const da = Math.hypot(P.x - 10.5, P.y - 4.5);
  if (da < 3.2 && (G.t * 2 | 0) % 2 === 0) text(ctx, 'APPROACH THE ALTAR', W / 2, H - 56, '#ffe080', 'center');
}
// M7c: mouse for the altar - wheel scrolls the list, clicks pick tabs / rows (real mouse events only, not pad R2)
(() => {
  const hp = e => { const cv = document.getElementById('screen'), r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const at = (list, x, y) => (list || []).find(c => x >= c[0] && x < c[0] + c[2] && y >= c[1] && y < c[1] + c[3]);
  addEventListener('wheel', e => { if (G.state !== 'altar' || Math.abs(e.deltaY) < 1) return; ALTARUI.wheel = (ALTARUI.wheel || 0) + Math.sign(e.deltaY); }, { passive: true });
  addEventListener('mousedown', e => { if (G.state !== 'altar' || e.button !== 0 || !ALTARUI.hit) return; const [x, y] = hp(e); const tb = at(ALTARUI.hit.tabs, x, y), rw = at(ALTARUI.hit.rows, x, y);
    if (tb) ALTARUI.click = { tab: tb[4] }; else if (rw) ALTARUI.click = { row: rw[4] }; });
})();
GAME.hub = { enterHub, buildChapel, SAVE, ALTAR, altarBuy, isUnlocked, shardGain, openAltar, closeAltar, writeSave, defaultSave, applyMeta };
