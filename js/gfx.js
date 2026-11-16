// ===== M6 graphics boost =====
// Keeps the 480x270 pixel look; everything is quality-scaled (GFX.q 2 = full, 1 = lite, 0 = off) from a rolling
// frame-time average so 60fps holds. The LOCKED hands are untouched here (their art got a palette-only repaint).
//  - load-time: wall/floor/ceiling textures get local-contrast + crevice AO; enemy sprites get a baked 1px
//    two-tone rim light (violet key from the left, toxic-green rim from the right, cool top light)
//  - per frame: wide second bloom tier, screen-space light halos on flames, horizon haze glow + floor mist,
//    twinkling stars in open skies, extra torch embers + drifting dust motes, weapon sheen + elemental embers
const GFX = { q: 2, ms: 0, n: 0, texDone: false, halo: {}, stars: null, vmp: [], bl2: null };
(function () {
  // ---------- load-time texture pass ----------
  const WALLRX = /^(t|o|k|b|a|n|f|c|h|r|l|v)_/;
  function detailTex(T) {
    const w = T.w, h = T.h, d = T.d, N = w * h; if (N < 64) return;
    const L = new Float32Array(N);
    for (let i = 0; i < N; i++) { const q = d[i]; L[i] = (q & 255) * 0.3 + ((q >> 8) & 255) * 0.55 + ((q >> 16) & 255) * 0.15; }
    const out = new Uint32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, q = d[i], a = q >>> 24; if (a === 0) { out[i] = q; continue; }
      let s = 0; for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) s += L[((y + k + h) % h) * w + ((x + j + w) % w)];
      const bl = s / 9, l = L[i], diff = l - bl;
      let m = 1 + (diff * 0.5) / Math.max(24, l);           // unsharp on luminance only (keeps hue)
      if (diff < -10) m *= 0.86;                            // crevices / mortar sink in
      else if (diff > 14) m *= 1.06;                        // lit edges catch a little more light
      const r = Math.min(255, (q & 255) * m) | 0, g = Math.min(255, ((q >> 8) & 255) * m) | 0, b = Math.min(255, ((q >> 16) & 255) * m) | 0;
      out[i] = (a << 24) | (b << 16) | (g << 8) | r;
    }
    d.set(out);
  }
  function rimTex(T) {
    const w = T.w, h = T.h, d = T.d, src = d.slice();
    const A = i => (src[i] >>> 24) > 0;
    const mix = (q, cr, cg, cb, k) => { const r = q & 255, g = (q >> 8) & 255, b = (q >> 16) & 255; return (q & 0xff000000) | (((b + (cb - b) * k) | 0) << 16) | (((g + (cg - g) * k) | 0) << 8) | ((r + (cr - r) * k) | 0); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!A(i)) continue;
      const up = y === 0 || !A(i - w), lf = x === 0 || !A(i - 1), rt = x === w - 1 || !A(i + 1);
      const q = src[i], lum = (q & 255) * 0.3 + ((q >> 8) & 255) * 0.55 + ((q >> 16) & 255) * 0.15; if (lum < 18) continue; // keep dark outlines
      if (up) d[i] = mix(q, 255, 236, 255, 0.34);
      else if (lf) d[i] = mix(q, 196, 120, 255, 0.36);
      else if (rt) d[i] = mix(q, 110, 255, 170, 0.3);
    }
  }
  function texPass() {
    GFX.texDone = true;
    for (const n in Engine.tex) {
      const T = Engine.tex[n]; if (!T || T.w < 8) continue;
      if (WALLRX.test(n) && !/^txt_/.test(n)) detailTex(T);
      else if (/^s_/.test(n)) rimTex(T);
    }
    if (typeof SPANS !== 'undefined') for (const k in SPANS) delete SPANS[k];
  }
  // ---------- quality governor ----------
  const _render = render;
  render = function (rdt) {
    if (!GFX.texDone && Engine.tex && Engine.tex.s_zombie) texPass();
    const a = performance.now(); _render(rdt); const ms = performance.now() - a;
    GFX.ms = GFX.ms * 0.97 + ms * 0.03; GFX.n++;
    if (GFX.n > 90) { if (GFX.ms > 13.5 && GFX.q > 0) { GFX.q--; GFX.n = 0; } else if (GFX.ms < 8.5 && GFX.q < 2 && GFX.n > 600) { GFX.q++; GFX.n = 0; } }
  };
  // ---------- pre-postFX: stars + motes (written into PIX so the LUT/bloom grade them too) ----------
  const _atmos = renderAtmos;
  renderAtmos = function (cam) {
    _atmos(cam);
    if (GFX.q < 1 || !FX.on) return;
    if (!GFX.stars) { GFX.stars = []; let s = 77; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 90; i++) GFX.stars.push([R() * Math.PI * 2, 0.08 + R() * 0.75, R() * 6.28, R() < 0.18]); }
    const hor = H / 2 + cam.pitch, t = G.t;
    for (const st of GFX.stars) {
      let da = st[0] - cam.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > 0.75) continue;
      const x = (W / 2 + Math.tan(da) * PROJ) | 0, y = (hor - Math.tan(st[1]) * PROJ * 0.55) | 0; if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) continue;
      const i = y * W + x; if (ZB[i] < 1e8) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * (1.3 + st[2] * 0.4) + st[2]); const v = (150 + 105 * tw) | 0;
      const col = st[3] ? (0xff000000 | (v << 16) | ((v * 0.75) << 8) | (v * 0.9)) : (0xff000000 | (v << 16) | (v << 8) | Math.min(255, v + 20));
      PIX[i] = col; if (st[3] && tw > 0.8) { if (ZB[i - 1] > 1e8) PIX[i - 1] = col; if (ZB[i + 1] > 1e8) PIX[i + 1] = col; if (ZB[i - W] > 1e8) PIX[i - W] = col; if (ZB[i + W] > 1e8) PIX[i + W] = col; }
    }
  };
  // ---------- extra particles (embers near flames, dust motes in light) ----------
  let lastT = 0;
  function spawnFX() {
    const dt = Math.min(0.05, G.t - lastT); lastT = G.t; if (dt <= 0 || G.state !== 'play' || GFX.q < 1 || !LEVEL.props) return;
    for (const pr of LEVEL.props) {
      if (pr.type !== 'torch' && pr.type !== 'brazier') continue;
      const dd = Math.abs(pr.x - P.x) + Math.abs(pr.y - P.y); if (dd > 9) continue;
      if (Math.random() < dt * (pr.type === 'brazier' ? 5 : 2.2)) addP({ k: 'ember', x: pr.x + rand(-0.08, 0.08), y: pr.y + rand(-0.08, 0.08), z: pr.z + (pr.type === 'brazier' ? 1.0 : 0.4), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.5, 1.3), size: 0.02 + Math.random() * 0.015, col: pr.green ? RGB(120, 255, 170) : RGB(255, 170 + (Math.random() * 60 | 0), 60), life: 0.9 + Math.random() * 0.8 });
    }
    if (GFX.q >= 2 && Math.random() < dt * 6) {
      const a = P.ang + rand(-0.6, 0.6), r = rand(1.2, 5); const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (!isSolid(cellAt(x, y))) addP({ k: 'ember', x, y, z: floorAt(x, y) + rand(0.3, 2.0), vx: rand(-0.08, 0.08), vy: rand(-0.08, 0.08), vz: rand(-0.03, 0.06), size: 0.012, col: Math.random() < 0.5 ? RGB(200, 170, 255) : RGB(170, 255, 200), life: 2.5 });
    }
  }
  // ---------- post-composite: wide bloom, halos, haze (drawn on ctxLow right after bloom + vignette) ----------
  function haloImg(r, g, b) {
    const k = r + ',' + g + ',' + b; if (GFX.halo[k]) return GFX.halo[k];
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},0.55)`); gr.addColorStop(0.25, `rgba(${r},${g},${b},0.22)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    // pixel-art it: quantise alpha to 6 steps so the halo reads as dithered bands, not a smooth airbrush
    const id = x.getImageData(0, 0, 64, 64), dd = id.data; for (let i = 3; i < dd.length; i += 4) { const p = (i >> 2), px = p & 63, py = p >> 6; const th = ((px & 1) ^ (py & 1)) ? 0.5 : 0; dd[i] = Math.min(255, Math.floor(dd[i] / 26 + th) * 26); }
    x.putImageData(id, 0, 0); GFX.halo[k] = c; return c;
  }
  function wideBloom(ctx) {
    if (!GFX.bl2) { const c = document.createElement('canvas'); c.width = BW >> 1; c.height = BH >> 1; GFX.bl2 = { c, x: c.getContext('2d'), F: new Float32Array((BW >> 1) * (BH >> 1) * 3), T: new Float32Array((BW >> 1) * (BH >> 1) * 3) }; GFX.bl2.img = GFX.bl2.x.createImageData(BW >> 1, BH >> 1); }
    const B = GFX.bl2, w = BW >> 1, h = BH >> 1, F = FX.bF, D = B.F, T = B.T;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 3; let r = 0, g = 0, b = 0; for (const [yy, xx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) { const s = ((y * 2 + yy) * BW + x * 2 + xx) * 3; r += F[s]; g += F[s + 1]; b += F[s + 2]; } D[o] = r * 0.25; D[o + 1] = g * 0.25; D[o + 2] = b * 0.25; }
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0; for (let k = -3; k <= 3; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)), o = (y * w + xx) * 3; r += D[o]; g += D[o + 1]; b += D[o + 2]; } const o = (y * w + x) * 3; T[o] = r / 7; T[o + 1] = g / 7; T[o + 2] = b / 7; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0; for (let k = -3; k <= 3; k++) { const yy = Math.min(h - 1, Math.max(0, y + k)), o = (yy * w + x) * 3; r += T[o]; g += T[o + 1]; b += T[o + 2]; } const o = (y * w + x) * 3; D[o] = r / 7; D[o + 1] = g / 7; D[o + 2] = b / 7; }
    }
    const d = B.img.data; for (let i = 0, j = 0; i < w * h; i++, j += 3) { const o = i * 4; d[o] = Math.min(255, D[j] * 2.6); d[o + 1] = Math.min(255, D[j + 1] * 2.6); d[o + 2] = Math.min(255, D[j + 2] * 2.6); d[o + 3] = 255; }
    B.x.putImageData(B.img, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, W, H); ctx.restore();
  }
  function halos(ctx, cam) {
    const t = G.t; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = false;
    for (const pr of LEVEL.props) {
      let z, sz, col;
      if (pr.type === 'torch') { z = pr.z + 0.25; sz = 1.5; col = pr.green ? [70, 255, 140] : [255, 150, 60]; }
      else if (pr.type === 'brazier') { z = 0.75; sz = 2.6; col = pr.green ? [70, 255, 140] : [255, 110, 70]; }
      else if (pr.type === 'candelabra') { z = 0.86; sz = 1.1; col = [255, 190, 110]; }
      else if (pr.type === 'p_cauldron' || pr.type === 'cauldron') { z = 0.8; sz = 2.4; col = [90, 255, 110]; }
      else continue;
      const p = project(cam, pr.x, pr.y, z); if (!p || p.d > 16) continue;
      const x = p.x | 0, y = p.y | 0; if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      const cx = Math.max(0, Math.min(W - 1, x)), cy = Math.max(0, Math.min(H - 1, y));
      if (ZB[cy * W + cx] < p.d - 0.35) continue; // occluded
      const fl = 0.85 + 0.15 * Math.sin(t * 13 + pr.x * 5) * Math.sin(t * 7.3 + pr.y);
      const s = Math.min(150, sz * p.s * fl);
      ctx.globalAlpha = Math.min(1, 0.9 * (1 - p.d / 17)); ctx.drawImage(haloImg(col[0], col[1], col[2]), x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }
  function haze(ctx, cam) {
    const hor = H / 2 + cam.pitch;
    const g = ctx.createLinearGradient(0, hor - 46, 0, hor + 40);
    const r = HAZE[0], gg = HAZE[1], b = HAZE[2];
    g.addColorStop(0, `rgba(${r},${gg},${b},0)`); g.addColorStop(0.5, `rgba(${Math.min(255, r + 40)},${Math.min(255, gg + 30)},${Math.min(255, b + 50)},0.12)`); g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, hor - 46), W, 86);
    // low floor mist that drifts
    const m = ctx.createLinearGradient(0, H - 70, 0, H); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, `rgba(${(r * 0.7) | 0},${(gg * 0.9) | 0},${b},0.14)`);
    ctx.globalAlpha = 0.8 + 0.2 * Math.sin(G.t * 0.6); ctx.fillStyle = m; ctx.fillRect(0, H - 70, W, 70); ctx.restore();
  }
  const _slashes = drawSlashes;
  drawSlashes = function (ctx, cam, rdt) {
    if (FX.on && G.state !== 'title' && LEVEL.props) {
      spawnFX();
      if (GFX.q >= 1) { wideBloom(ctx); halos(ctx, cam); }
      if (GFX.q >= 1) haze(ctx, cam);
    }
    return _slashes(ctx, cam, rdt);
  };
  // ---------- weapons: sheen sweep + elemental embers ----------
  const SHC = {};
  function sheenLayer(mask, phase, w0) {
    const im = Engine.imgs[mask]; if (!im) return null;
    let c = SHC[mask]; if (!c) { c = SHC[mask] = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.x = c.getContext('2d'); }
    const x = c.x, h = c.height, w = c.width; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
    const y0 = h * (1.15 - phase * 1.4);
    const g = x.createLinearGradient(0, y0 - w0, w * 0.6, y0 + w0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); return c;
  }
  const EMB = { base: ['#c8a0ff', '#ffffff'], crimson: ['#ff3050', '#ff9070'], skull: ['#70ff90', '#d0ffd0'], axe: ['#ff4030', '#ffb060'], frost: null, storm: null, rapier: ['#ff4060', '#ffd0e0'] };
  const PTS = {};
  function bladePts(mask) { if (PTS[mask]) return PTS[mask]; const T = Engine.tex[mask]; const out = []; if (T) for (let i = 0; i < T.w * T.h; i += 3) if (T.d[i] >>> 24) out.push([i % T.w, (i / T.w) | 0]); PTS[mask] = out; return out; }
  window.wpnFX = function (ctx, name, kind, X, Y, R, S, VFY, t) {
    if (GFX.q < 1) return;
    const mask = name + '_sheen';
    const cyc = (t % 3.2) / 1.1, swing = P.sw ? 1 : 0;
    if (cyc < 1 || swing) {
      const ph = swing ? ((t * 2.2) % 1) : cyc; const L = sheenLayer(mask, ph, 22);
      if (L) drawRot(ctx, L, SW_PIV[0], SW_PIV[1], X, Y, R, S, swing ? 0.5 : 0.42, 'lighter', VFY);
    }
    const E = EMB[kind] || EMB.base; if (!E) return;
    const pts = bladePts(mask); if (!pts.length) return;
    const rate = kind === 'base' ? 3 : 9; const cs = Math.cos(R), sn = Math.sin(R);
    if (Math.random() < rate / 60) { const q = pts[(Math.random() * pts.length) | 0]; const u = (q[0] - SW_PIV[0]) * S, v = (q[1] - SW_PIV[1]) * S * VFY; GFX.vmp.push({ x: X + u * cs - v * sn, y: Y + u * sn + v * cs, vx: rand(-6, 6), vy: rand(-26, -10), t: 0, life: 0.5 + Math.random() * 0.6, c: E[(Math.random() * 2) | 0] }); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = GFX.vmp.length - 1; i >= 0; i--) { const p = GFX.vmp[i]; p.t += 1 / 60; if (p.t > p.life) { GFX.vmp.splice(i, 1); continue; } p.x += p.vx / 60; p.y += p.vy / 60; ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, 1, 1); }
    ctx.restore();
  };
  window.xbowFX = function (ctx, t, name, kick) {
    if (GFX.q < 1) return; const cyc = (t % 3.6) / 1.2; if (cyc >= 1 && kick <= 0) return;
    const L = sheenLayer(name + '_sheen', kick > 0 ? 1 - kick : cyc, 30); if (!L) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(L, 0, 0); ctx.restore();
  };
})();
