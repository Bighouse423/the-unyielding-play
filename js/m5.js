'use strict';
// ===== M5: stage 4 THE MOONLIT COURTYARD, stage 5 THE GARGOYLE BELFRY, nave secrets, run wiring =====
THEMES.courtyard = {
  name: 'THE MOONLIT COURTYARD', sub: 'Statues, hedges & a fountain of blood', variant: 'courtyard', map: 'crypt', boss: 'alphawolf', music: 'courtyard', sky: 'sky_moon',
  haze: [86, 70, 150], ambient: [0.44, 0.42, 0.64], torch: 'green',
  grade: { sh: [0.05, 0.03, 0.14], hi: [0.04, 0.05, 0.02] },
  pool: [['werewolf', 3], ['bat', 1.6], ['fzombie', 1.4], ['skeleton', 1.2], ['zombie', 1], ['imp', 0.8], ['ghost', 0.6]],
};
THEMES.belfry = {
  name: 'THE GARGOYLE BELFRY', sub: 'Bells, beams & things that perch', variant: 'belfry', map: 'crypt', boss: 'matriarch', music: 'belfry',
  haze: [110, 60, 96], ambient: [0.56, 0.42, 0.5], torch: 'orange',
  light: c => (c[1] > c[0] && c[1] > c[2]) ? [0.75, 0.35, 1.0] : c,
  grade: { sh: [0.08, 0.02, 0.1], hi: [0.08, 0.04, -0.02] },
  pool: [['gargoyle', 3], ['bat', 2], ['imp', 1.4], ['ghost', 1.1], ['skeleton', 1.2], ['werewolf', 0.8], ['azombie', 0.8]],
};
const M5_ORDER = ['crypt', 'ossuary', 'courtyard', 'belfry'];
const M5_LAST = 5; // last hand-built stage; Endless Descent starts after it
const _stageCfg = stageCfg;
stageCfg = function (n) {
  const c = _stageCfg(n);
  c.theme = n === 1 ? 'nave' : n === 2 ? 'crypt' : n === 3 ? 'ossuary' : n === 4 ? 'courtyard' : n === 5 ? 'belfry' : M5_ORDER[(n - 6) % 4];
  c.endless = n > M5_LAST ? n - M5_LAST : 0; c.boss = null;
  return c;
};
GAME.rogue.stageCfg = stageCfg;
let M5_SKYDEF = null;
const _applyTheme = applyTheme;
applyTheme = function () {
  _applyTheme();
  if (!M5_SKYDEF) M5_SKYDEF = Engine.tex.sky;
  const th = curTheme(); Engine.tex.sky = (th.sky && Engine.tex[th.sky]) || M5_SKYDEF;
};
stageIntro = function () {
  const th = curTheme();
  G.bigText = { t1: 'STAGE ' + RUN.stage, t2: th.name, dur: 3.2, t: 0 };
  const S = { spider: 'Down into the catacombs. Something breeds in the dark.', colossus: 'The bone halls run red. Something vast is made of the dead here.', alphawolf: 'Open sky, full moon. Something hunts the hedges. (Silver burns it.)', matriarch: 'The bells have not rung in a century. Mind the statues.' };
  const sub = RUN.stage === 1 ? 'The Lich King has claimed the Black Reliquary. Take it back.' : RUN.cfg.endless ? 'ENDLESS DESCENT ' + RUN.cfg.endless + ' - the lieutenants return, stronger. (More stages coming.)' : (S[th.boss] || '');
  const col = RUN.stage === 1 ? '#ffe080' : th.boss === 'spider' ? '#90ff90' : th.boss === 'alphawolf' ? '#c8b8ff' : th.boss === 'matriarch' ? '#ffc890' : '#ff8090';
  toast(th.sub.toUpperCase(), sub, col, 4);
};
// silver bolts now named for what they are for
{ const u = UPG.find(x => x.id === 'silverbolts'); if (u) u.desc = 'Ranged hits BLEED, x2 to staggered foes, and WEREWOLVES take x2.2 (wind-ups break). Crossbow: silver shrapnel.'; }
// before the courtyard: offer silver to a crossbow carrier
const _rollChoices5 = rollChoices;
rollChoices = function (mini) {
  const out = _rollChoices5(mini); if (mini || !Array.isArray(out)) return out;
  if (RUN.stage === 3 && !(P.mods && P.mods.silver) && (P.hasPistol || (P.wpn && P.wpn.ranged === 'crossbow')) && Math.random() < 0.6 && !out.some(u => u && u.id === 'silverbolts')) { const s = UPG.find(x => x.id === 'silverbolts'); if (s) out[out.length - 1] = s; }
  return out;
};
const _dmgIn5 = rogueDmgIn;
rogueDmgIn = function (e, dmg, o) { return beastDmgIn(e, _dmgIn5(e, dmg, o), o); };
const _visual5 = rogueVisual;
rogueVisual = function (e, v) { return beastVisual(e, _visual5(e, v)); };
const _sprites5 = rogueSprites;
rogueSprites = function (S, t) { _sprites5(S, t); beastSprites(S, t); };
// gargoyles perch as statues until you get close (or hit them)
const _eTick5 = rogueEnemyTick;
rogueEnemyTick = function (e, dt) {
  const r = _eTick5(e, dt); if (r <= 0 || !e.alive) return r;
  if (e.type === 'gargoyle' && e.statue) {
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    e.z = floorAt(e.x, e.y) + (e.perchZ || 0); e.awake = false;
    if (d < 3.4 || e.hp < e.maxhp) {
      e.statue = false; e.awake = true; e.state = 'chase'; e.cd = 0.6; SFX.play('stone', 0.5); SFX.play('screech', 0.7);
      stoneBurst(e.x, e.y, e.z + 0.5, 10, 0.6); dmgNum(e.x, e.y, e.z + 1.4, 'IT MOVES!', '#d0c8f0');
    }
    return 0;
  }
  if (e.type === 'werewolf' && e.awake && !e.howled) { e.howled = true; SFX.play('howl', 0.35); }
  return r;
};
// werewolves leap at you
const _enemyStrike5 = enemyStrike;
enemyStrike = function (e) { _enemyStrike5(e); if (e.type === 'werewolf') { e.vz = 3.4; e.z += 0.02; SFX.play('roar', 0.3); } };
// called from newGame after the enemies exist
function m5NewStage() {
  const b = G.boss; if (!b) return;
  if (b.type === 'alphawolf') { b.hidden = true; b.r = 0.95; }
  if (b.type === 'matriarch') { b.intangible = true; b.r = 1.0; b.hov = 0; b.z = floorAt(b.x, b.y); }
  let k = 0; for (const e of G.enemies) if (e.type === 'gargoyle' && !e.d.boss && (k++ % 3) !== 2) { e.statue = true; e.z = floorAt(e.x, e.y); }
}
// ---- stage 1: two more false walls in the Ruined Nave (only in a run; the v2.8 game is a separate build)
const _buildStage5 = buildStage;
buildStage = function () {
  _buildStage5();
  if (RUN.on && !RUN.hub && LEVEL.kind === 'castle') m5NaveSecrets();
};
function m5NaveSecrets() {
  const T = Engine.tex; WALLDEFS[14] = { base: T.t_stonefalse, tall: null };
  const carve = (x0, y0, x1, y1, fh, ch, ft) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * MW + x; SOLID[i] = 0; FH[i] = fh; CH[i] = ch; FT[i] = ft; CT[i] = 1; WT[i] = 0; } };
  const fw = (x, y, room) => { const i = y * MW + x; SOLID[i] = 1; FH[i] = 99; WT[i] = 14; LEVEL.cracks.push({ x, y, hp: 2, open: false, ch: 2.8, kind: 'false', room }); };
  // east: behind the nave's east wall - The Anchorite's Reliquary (a weapon cache + shards), lit violet
  carve(28, 17, 28, 17, 0, 2.8, 2); carve(29, 15, 32, 19, 0, 3.0, 5); fw(27, 17, 'anchorite');
  // south-east: off the narthex - The Bell-Ringer's Larder (a relic + a rose)
  carve(24, 36, 24, 36, 0, 2.8, 2); carve(25, 35, 29, 38, 0, 2.9, 4); fw(23, 36, 'larder');
  LEVEL.secrets.push({ id: 'anchorite', name: "The Anchorite's Reliquary", box: [28, 15, 33, 20], minZ: -9, found: false });
  LEVEL.secrets.push({ id: 'larder', name: "The Bell-Ringer's Larder", box: [24, 35, 30, 39], minZ: -9, found: false });
  LEVEL.pickups.push({ type: 'cache', x: 31, y: 17.5 }, { type: 'shards', x: 29.6, y: 15.6, amt: 20 }, { type: 'vial', x: 32.4, y: 19.4 });
  LEVEL.pickups.push({ type: 'reliq', x: 27.5, y: 36.8 }, { type: 'rose', x: 29.4, y: 38.4 }, { type: 'mana', x: 25.6, y: 35.6 });
  LEVEL.props.push({ type: 'candelabra', x: 32.4, y: 15.6, z: 0 }, { type: 'candelabra', x: 25.5, y: 38.4, z: 0 });
  LEVEL.lights.push({ x: 30.5, y: 17.5, r: 4, i: 1.1, c: [0.75, 0.35, 1.0] }, { x: 27.5, y: 36.8, r: 3.8, i: 1.05, c: [1.0, 0.7, 0.3] });
  const th = curTheme(); if (th.light) { const n = LEVEL.lights.length; LEVEL.lights[n - 1].c = th.light(LEVEL.lights[n - 1].c); LEVEL.lights[n - 2].c = th.light(LEVEL.lights[n - 2].c); }
  buildLightmap(LEVEL.lights, th.ambient || [0.6, 0.5, 0.74]);
}
