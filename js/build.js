// ===== build tag + stale-tab guard: a tab left open from an older build reloads itself
// when you are on the title screen or in the Chapel (never mid-run), so you always play the latest deploy.
// m5c: also shows the build in the run HUD, warns mid-run when a newer build is live, and hard-pins the
// stage -> boss order so no path (theme fallback, endless, stale cfg) can repeat a boss in stages 1-7.
// m7: pinned through stage 10 (the Lich King); stages 11+ are THE ABYSS (corrupted rotation, see m7.js).
const BUILD = 'm7d';
const STAGE_PIN = { 1: ['nave', 'vknight'], 2: ['crypt', 'spider'], 3: ['ossuary', 'colossus'], 4: ['courtyard', 'alphawolf'], 5: ['belfry', 'matriarch'], 6: ['arena', 'minotaur'], 7: ['necropolis', 'witch'], 8: ['kennels', 'cerberax'], 9: ['cathedral', 'uknight'], 10: ['throne', 'lich'] };
(function () {
  const tag = () => 'BUILD ' + BUILD.toUpperCase();
  const _dt = drawTitle; drawTitle = function (ctx) { _dt(ctx); text(ctx, tag(), 6, H - 10, '#8070a8', 'left'); };
  if (typeof drawHubHUD === 'function') { const _dh = drawHubHUD; drawHubHUD = function (ctx) { _dh(ctx); text(ctx, tag(), 6, 30, '#8070a8', 'left'); }; }
  if (typeof drawRunHUD === 'function') { const _dr = drawRunHUD; drawRunHUD = function (ctx) { _dr(ctx); if (RUN.on) text(ctx, BUILD.toUpperCase(), W - 5, 7, '#6a5a90', 'right'); }; }
  // pin stage theme + boss
  const _sc = stageCfg; stageCfg = function (n) { const c = _sc(n); const p = STAGE_PIN[n]; if (p && THEMES[p[0]]) { c.theme = p[0]; c.boss = null; c.endless = 0; } return c; };
  GAME.rogue.stageCfg = stageCfg;
  const _bs = buildStage; buildStage = function () {
    _bs.apply(this, arguments);
    const p = RUN.on && !RUN.hub && STAGE_PIN[RUN.stage];
    if (p && EDEF[p[1]] && LEVEL.bossType !== p[1]) { console.warn('stage pin: stage ' + RUN.stage + ' boss ' + LEVEL.bossType + ' -> ' + p[1]); LEVEL.bossType = p[1]; }
  };
  // Public frozen snapshot: no version polling, no auto-reload, no "NEW BUILD IS LIVE" toast.
})();
