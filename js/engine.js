// ===== THE UNYIELDING — raycast engine (heights, sky, lightmap, decals, billboards) =====
'use strict';
const W = 480, H = 270;
const PROJ = 300;              // focal length in pixels (~77deg hfov)
const LR = 4;                  // lightmap texels per cell
const DEC = 16;                // decal texels per world unit
const WZ0 = 5.6;               // wall decal top z
const WALL_TOP = 7.5;
const HAZE = [150, 80, 170];   // colorful distance haze (not darkness)

const Engine = {
  tex: {}, imgs: {}, masks: {}, occ: true,
};

function loadImages(cb) {
  const names = Object.keys(window.ASSETS);
  let left = names.length;
  for (const n of names) {
    const im = new Image();
    im.onload = () => {
      Engine.imgs[n] = im;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height);
      Engine.tex[n] = { w: im.width, h: im.height, d: new Uint32Array(d.data.buffer) };
      if (--left === 0) cb();
    };
    im.onerror = () => { // never hang on a bad image: use a 1px placeholder
      const c = document.createElement('canvas'); c.width = c.height = 1; Engine.imgs[n] = c;
      Engine.tex[n] = { w: 1, h: 1, d: new Uint32Array(1) }; console.error('asset failed: ' + n);
      if (--left === 0) cb();
    };
    im.src = window.ASSETS[n];
  }
}

// blood overlay mask for sprites: low-freq blobs 0..1
function bloodMaskFor(name) {
  if (Engine.masks[name]) return Engine.masks[name];
  const t = Engine.tex[name];
  const m = new Float32Array(t.w * t.h);
  const blobs = [];
  let seed = 0; for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 46; i++) blobs.push([rnd() * t.w, rnd() * t.h * 0.95, 2 + rnd() * t.w * 0.16, rnd()]);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    let v = 1;
    for (const b of blobs) {
      const dx = (x - b[0]) / b[2], dy = (y - b[1]) / (b[2] * 1.6);
      const dd = dx * dx + dy * dy;
      if (dd < 1) v = Math.min(v, b[3] * 0.85 + dd * 0.4);
    }
    // drips: vertical streaks below blobs
    m[y * t.w + x] = v + ((x * 7 + y * 3) % 5) * 0.01;
  }
  Engine.masks[name] = m;
  return m;
}

// ---------- frame buffers ----------
let ctxLow, imgData, PIX, ZB;
function initBuffers(lowCanvas) {
  ctxLow = lowCanvas.getContext('2d');
  imgData = ctxLow.createImageData(W, H);
  PIX = new Uint32Array(imgData.data.buffer);
  ZB = new Float32Array(W * H);
}

// ---------- map storage (filled by level.js) ----------
let MW = 0, MH = 0;
let FH, CH, SOLID, WT, FT, CT, SKY;  // floor height, ceil height, solid, wall tex, floor tex, ceil tex, sky
let WALLDEFS = [];  // {base, tall:{name,z0,z1,ux0,uspan}, emisBase}
let FLOORTEX = [], CEILTEX = [];
let LMr, LMg, LMb, LTr, LTg, LTb, FLK, FLKP;
const FDEC = new Map();   // cell -> Uint8Array(16*16)
const WDEC = new Map();   // faceKey -> Uint8Array(16*128)
const DRIPS = [];

function cellAt(x, y) { const ix = x | 0, iy = y | 0; if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) return -1; return iy * MW + ix; }
function isSolid(i) { return i < 0 || SOLID[i] === 1; }
function floorAt(x, y) { const i = cellAt(x, y); return i < 0 ? 99 : (SOLID[i] ? 99 : FH[i]); }

// ---------- lightmap ----------
function losCells(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0; const L = Math.hypot(dx, dy); const n = Math.ceil(L * 3);
  for (let i = 1; i < n; i++) { const t = i / n; const c = cellAt(x0 + dx * t, y0 + dy * t); if (c < 0 || (SOLID[c] && FH[c] > 3)) return false; }
  return true;
}
function buildLightmap(lights, ambient) {
  const LW = MW * LR, LH = MH * LR, N = LW * LH;
  LMr = new Float32Array(N); LMg = new Float32Array(N); LMb = new Float32Array(N);
  LTr = new Float32Array(N); LTg = new Float32Array(N); LTb = new Float32Array(N);
  FLK = new Float32Array(N); FLKP = new Float32Array(N);
  for (let i = 0; i < N; i++) { LMr[i] = ambient[0]; LMg[i] = ambient[1]; LMb[i] = ambient[2]; FLKP[i] = Math.random() * 6.28; FLK[i] = 1; }
  for (const L of lights) {
    const R = L.r; const x0 = Math.max(0, Math.floor((L.x - R) * LR)), x1 = Math.min(LW - 1, Math.ceil((L.x + R) * LR));
    const y0 = Math.max(0, Math.floor((L.y - R) * LR)), y1 = Math.min(LH - 1, Math.ceil((L.y + R) * LR));
    for (let ly = y0; ly <= y1; ly++) for (let lx = x0; lx <= x1; lx++) {
      const wx = (lx + 0.5) / LR, wy = (ly + 0.5) / LR;
      const d = Math.hypot(wx - L.x, wy - L.y); if (d > R) continue;
      const ci = cellAt(wx, wy); if (ci < 0) continue;
      if (!L.nolos && !losCells(L.x, L.y, wx, wy)) continue;
      let k = 1 - d / R; k = k * k * L.i;
      const idx = ly * LW + lx;
      if (L.flicker) { LTr[idx] += L.c[0] * k; LTg[idx] += L.c[1] * k; LTb[idx] += L.c[2] * k; }
      else { LMr[idx] += L.c[0] * k; LMg[idx] += L.c[1] * k; LMb[idx] += L.c[2] * k; }
    }
  }
}
function updateFlicker(t) {
  for (let i = 0; i < FLK.length; i++) { const p = FLKP[i]; FLK[i] = 0.82 + 0.13 * Math.sin(t * 9.1 + p) + 0.07 * Math.sin(t * 23.7 + p * 3.1); }
}
function lightAt(x, y, out) {
  let lx = (x * LR) | 0, ly = (y * LR) | 0; const LW = MW * LR;
  if (lx < 0) lx = 0; if (ly < 0) ly = 0; if (lx >= LW) lx = LW - 1; if (ly >= MH * LR) ly = MH * LR - 1;
  const i = ly * LW + lx, f = FLK[i];
  out[0] = LMr[i] + LTr[i] * f; out[1] = LMg[i] + LTg[i] * f; out[2] = LMb[i] + LTb[i] * f; return out;
}

// ---------- decals ----------
function paintFloor(x, y, rad, amt) {
  const r = Math.ceil(rad * DEC);
  const cx = x * DEC, cy = y * DEC;
  for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) {
    const dd = (px * px + py * py) / (r * r + 0.01); if (dd > 1) continue;
    if (Math.random() < dd * 0.7) continue;
    const gx = Math.floor(cx + px), gy = Math.floor(cy + py);
    const ci = cellAt(gx / DEC, gy / DEC); if (ci < 0 || SOLID[ci]) continue;
    let m = FDEC.get(ci); if (!m) { m = new Uint8Array(DEC * DEC); FDEC.set(ci, m); }
    const k = (((gy % DEC) + DEC) % DEC) * DEC + (((gx % DEC) + DEC) % DEC);
    m[k] = Math.min(255, m[k] + amt * (1 - dd * 0.5));
  }
}
function paintWall(key, u, z, rad, amt, drip) {
  let m = WDEC.get(key); if (!m) { m = new Uint8Array(DEC * 128); WDEC.set(key, m); }
  const cu = u * DEC, cz = (WZ0 - z) * DEC; const r = Math.max(1, Math.ceil(rad * DEC));
  for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) {
    const dd = (px * px + py * py) / (r * r + 0.01); if (dd > 1 || Math.random() < dd * 0.6) continue;
    const gx = Math.floor(cu + px), gy = Math.floor(cz + py);
    if (gx < 0 || gx >= DEC || gy < 0 || gy >= 128) continue;
    const k = gy * DEC + gx; m[k] = Math.min(255, m[k] + amt);
  }
  if (drip && DRIPS.length < 400) DRIPS.push({ m, u: Math.max(0, Math.min(DEC - 1, Math.floor(cu))), v: Math.floor(cz), len: 0, max: 4 + Math.random() * 22, sp: 4 + Math.random() * 8, amt: Math.min(255, amt + 40) });
}
function updateDrips(dt) {
  for (let i = DRIPS.length - 1; i >= 0; i--) {
    const d = DRIPS[i]; const old = d.len | 0; d.len += d.sp * dt; d.sp *= (1 - dt * 0.6);
    for (let l = old; l <= (d.len | 0); l++) { const v = d.v + l; if (v >= 0 && v < 128) { const k = v * DEC + d.u; d.m[k] = Math.max(d.m[k], d.amt * (1 - l / (d.max + 1))); } }
    if (d.len >= d.max || d.sp < 0.6) DRIPS.splice(i, 1);
  }
}
// blood colour ramp for decals
const BLOODC = new Uint32Array(256);
for (let i = 0; i < 256; i++) { const k = i / 255; const r = 120 + 110 * (1 - k) | 0, g = 6 * (1 - k) | 0, b = 18 + 10 * (1 - k) | 0; BLOODC[i] = (b << 16) | (g << 8) | r; }

// ---------- world render ----------
const SH = { t: 0, shimmer: 0 };
function shadePix(idx, p, d, lr, lg, lb) {
  let k = d * 0.022; if (k > 0.5) k = 0.5; const ik = 1 - k;
  shadeK(idx, p, d, lr * ik, lg * ik, lb * ik, HAZE[0] * k, HAZE[1] * k, HAZE[2] * k, ik);
}
// v2 perf: light and haze folded into one multiply-add (m*, a* precomputed per span/row)
function shadeK(idx, p, d, mr, mg, mb, ar, ag, ab, ik) {
  let r, g, b;
  if ((p >>> 24) === 250) { // emissive stained glass, shimmering
    const s = (1.15 + 0.25 * Math.sin(SH.t * 2.3 + idx * 0.013 + (idx % W) * 0.07)) * ik;
    r = (p & 255) * s + ar; g = ((p >> 8) & 255) * s + ag; b = ((p >> 16) & 255) * s + ab;
  } else { r = (p & 255) * mr + ar; g = ((p >> 8) & 255) * mg + ag; b = ((p >> 16) & 255) * mb + ab; }
  if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
  PIX[idx] = 0xff000000 | (b << 16) | (g << 8) | r; ZB[idx] = d;
}
const _l = [0, 0, 0];
function renderWorld(cam) {
  // a camera sitting exactly on a cell edge gives a zero-length first step (div by 0 -> whole columns of sky); nudge it
  if (Math.abs(cam.x - Math.round(cam.x)) < 1e-4) cam.x += 2e-4; if (Math.abs(cam.y - Math.round(cam.y)) < 1e-4) cam.y += 2e-4;
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const hor = H / 2 + cam.pitch, eye = cam.eye;
  const LW = MW * LR, LHh = MH * LR;
  const skyT = Engine.tex.sky;
  for (let col = 0; col < W; col++) {
    const camX = (col + 0.5 - W / 2) / PROJ;
    const rdx = dx - dy * camX, rdy = dy + dx * camX;
    let mx = Math.floor(cam.x), my = Math.floor(cam.y);
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let sx, sy, sdx, sdy;
    if (rdx < 0) { sx = -1; sdx = (cam.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - cam.x) * ddx; }
    if (rdy < 0) { sy = -1; sdy = (cam.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - cam.y) * ddy; }
    let ytop = 0, ybot = H, d0 = 0.02;
    let ci = my * MW + mx;
    const skyU = (((cam.ang + Math.atan(camX)) / (Math.PI * 2)) * 1024 % 512 + 512) % 512 | 0;
    for (let it = 0; it < 90; it++) {
      const d1 = Math.min(sdx, sdy);
      const f = FH[ci], c = CH[ci];
      // ---- floor span
      if (f < eye) {
        const ya = hor + (eye - f) * PROJ / d1, yb = hor + (eye - f) * PROJ / d0;
        let r0 = Math.max(ytop, Math.ceil(ya - 0.5)), r1 = Math.min(ybot, Math.ceil(yb - 0.5));
        if (r1 > r0) {
          const ft = FLOORTEX[FT[ci]]; const td = ft.d; const dec = FDEC.get(ci);
          const isBlood = FT[ci] === 6;
          for (let r = r0; r < r1; r++) {
            let dist = (eye - f) * PROJ / (r + 0.5 - hor);
            if (dist < d0) dist = d0; if (dist > d1) dist = d1;
            const wx = cam.x + rdx * dist, wy = cam.y + rdy * dist;
            let fx = wx - mx, fy = wy - my; if (fx < 0) fx = 0; if (fx > 0.999) fx = 0.999; if (fy < 0) fy = 0; if (fy > 0.999) fy = 0.999;
            let tu = (fx * 64) | 0, tv = (fy * 64) | 0;
            if (isBlood) { tu = (tu + ((SH.t * 6) | 0)) & 63; tv = (tv + ((Math.sin(SH.t + fx * 6) * 3) | 0)) & 63; }
            let p = td[tv * 64 + tu];
            if (dec) { const a = dec[((fy * DEC) | 0) * DEC + ((fx * DEC) | 0)]; if (a > 18) { const bc = BLOODC[a]; p = a > 90 ? (0xff000000 | bc) : (p & 0xff000000) | (((((p & 0xff) + (bc & 0xff)) >> 1)) | ((((p >> 8) & 0xff) >> 2) << 8) | (((((p >> 16) & 0xff) + ((bc >> 16) & 0xff)) >> 2) << 16)); } }
            let lx = (wx * LR) | 0, ly = (wy * LR) | 0; if (lx < 0) lx = 0; if (ly < 0) ly = 0; if (lx >= LW) lx = LW - 1; if (ly >= LHh) ly = LHh - 1;
            const li = ly * LW + lx, fk = FLK[li];
            let hk = dist * 0.022; if (hk > 0.5) hk = 0.5; const ik = 1 - hk;
            if (isBlood) shadeK(r * W + col, p, dist, 1.3 * ik, 1.1 * ik, 1.1 * ik, HAZE[0] * hk, HAZE[1] * hk, HAZE[2] * hk, ik);
            else shadeK(r * W + col, p, dist, (LMr[li] + LTr[li] * fk) * ik, (LMg[li] + LTg[li] * fk) * ik, (LMb[li] + LTb[li] * fk) * ik, HAZE[0] * hk, HAZE[1] * hk, HAZE[2] * hk, ik);
          }
        }
        ybot = Math.min(ybot, Math.max(ytop, Math.ceil(ya - 0.5)));
      }
      // ---- ceiling span
      if (c > eye && ytop < ybot) {
        const ya = hor - (c - eye) * PROJ / d0, yb = hor - (c - eye) * PROJ / d1;
        let r0 = Math.max(ytop, Math.ceil(ya - 0.5)), r1 = Math.min(ybot, Math.ceil(yb - 0.5));
        if (r1 > r0) {
          if (SKY[ci]) {
            for (let r = r0; r < r1; r++) { let v = (r - hor + 150) | 0; if (v < 0) v = 0; if (v > 127) v = 127; PIX[r * W + col] = skyT.d[v * 512 + skyU]; ZB[r * W + col] = 1e9; }
          } else {
            const td = CEILTEX[CT[ci]].d;
            for (let r = r0; r < r1; r++) {
              let dist = (c - eye) * PROJ / (hor - (r + 0.5));
              if (dist < d0) dist = d0; if (dist > d1) dist = d1;
              const wx = cam.x + rdx * dist, wy = cam.y + rdy * dist;
              const tu = ((wx - Math.floor(wx)) * 64) | 0, tv = ((wy - Math.floor(wy)) * 64) | 0;
              lightAt(wx, wy, _l);
              shadePix(r * W + col, td[tv * 64 + tu], dist, _l[0] * 0.9, _l[1] * 0.9, _l[2] * 0.95);
            }
          }
        }
        ytop = Math.max(ytop, Math.min(ybot, Math.ceil(yb - 0.5)));
      }
      if (ytop >= ybot) break;
      // ---- step to next cell
      let side;
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) break;
      const ni = my * MW + mx;
      d0 = d1;
      const solid = SOLID[ni] === 1;
      const nf = solid ? (FH[ni] > 6 ? WALL_TOP : FH[ni]) : FH[ni];
      let wallX = side === 0 ? cam.y + d1 * rdy : cam.x + d1 * rdx;
      const wint = Math.floor(wallX); wallX -= wint;
      const face = side === 0 ? (sx > 0 ? 0 : 1) : (sy > 0 ? 2 : 3);
      const key = ni * 4 + face;
      const hx = cam.x + rdx * (d1 - 0.05), hy = cam.y + rdy * (d1 - 0.05);
      if (nf > f) {
        const ya = hor - (nf - eye) * PROJ / d1, yb = hor - (f - eye) * PROJ / d1;
        const r0 = Math.max(ytop, Math.ceil(ya - 0.5)), r1 = Math.min(ybot, Math.ceil(yb - 0.5));
        if (r1 > r0) drawFace(col, r0, r1, d1, hor, eye, WALLDEFS[WT[ni]], wallX, wint, key, hx, hy, side, f, nf);
        ybot = Math.min(ybot, Math.max(ytop, Math.ceil(ya - 0.5)));
      }
      if (solid && FH[ni] > 6) break;
      const nc = CH[ni];
      if (nc < c && ytop < ybot) {
        const ya = hor - (c - eye) * PROJ / d1, yb = hor - (nc - eye) * PROJ / d1;
        const r0 = Math.max(ytop, Math.ceil(ya - 0.5)), r1 = Math.min(ybot, Math.ceil(yb - 0.5));
        if (r1 > r0) drawFace(col, r0, r1, d1, hor, eye, WALLDEFS[0], wallX, wint, -1, hx, hy, side);
        ytop = Math.max(ytop, Math.min(ybot, Math.ceil(yb - 0.5)));
      }
      if (ytop >= ybot) break;
      ci = ni;
    }
    for (let r = ytop; r < ybot; r++) { let v = (r - hor + 150) | 0; if (v < 0) v = 0; if (v > 127) v = 127; PIX[r * W + col] = skyT.d[v * 512 + skyU]; ZB[r * W + col] = 1e9; }
  }
}
function drawFace(col, r0, r1, d, hor, eye, def, u, wint, key, hx, hy, side, zb = -99, zt = 99) {
  lightAt(hx, hy, _l);
  const sideK = side === 0 ? 1.0 : 0.86;
  let hk = d * 0.022; if (hk > 0.5) hk = 0.5; const ik = 1 - hk;
  const lr = _l[0] * sideK * ik, lg = _l[1] * sideK * ik, lb = _l[2] * sideK * ik;
  const ar = HAZE[0] * hk, ag = HAZE[1] * hk, ab = HAZE[2] * hk;
  const base = def.base; const bd = base.d;
  const tu = (u * 64) | 0;
  const tall = def.tall;
  let tallU = 0;
  if (tall) {
    let uu = u;
    if (tall.span) uu = ((side === 0 ? 0 : (wint - tall.x0)) + u) / tall.span;
    tallU = Math.max(0, Math.min(tall.t.w - 1, (uu * tall.t.w) | 0));
  }
  const dec = key >= 0 ? WDEC.get(key) : null; const du = (u * DEC) | 0;
  for (let r = r0; r < r1; r++) {
    const z = eye + (hor - (r + 0.5)) * d / PROJ;
    let p;
    if (tall && z >= tall.z0 && z < tall.z1) {
      const tv = Math.min(tall.t.h - 1, ((tall.z1 - z) / (tall.z1 - tall.z0) * tall.t.h) | 0);
      p = tall.t.d[tv * tall.t.w + tallU];
    } else {
      let fz = z - Math.floor(z); const tv = ((1 - fz) * 63.99) | 0; p = bd[tv * 64 + tu];
    }
    if (dec) { const row = ((WZ0 - z) * DEC) | 0; if (row >= 0 && row < 128) { const a = dec[row * DEC + du]; if (a > 20) { const bc = BLOODC[a]; p = 0xff000000 | (a > 100 ? bc : ((((p & 0xff) + (bc & 0xff)) >> 1) | ((((p >> 8) & 0xff) >> 2) << 8) | (((((p >> 16) & 0xff) + ((bc >> 16) & 0xff)) >> 2) << 16))); } } }
    // v2.3 contact shadow at the wall foot + soft falloff toward the top of tall walls
    let ao = 1; const hz = z - zb; if (hz < 0.5) ao = 0.58 + 0.42 * (hz < 0 ? 0 : hz * 2);
    const tz = zt - z; if (zt < 50 && tz < 0.35) ao *= 0.8 + 0.2 * (tz / 0.35);
    if (ao < 1) { const da = ((r + col) & 1) ? 0.03 : 0; ao += da; shadeK(r * W + col, p, d, lr * ao, lg * ao, lb * ao, ar, ag, ab, ik); }
    else shadeK(r * W + col, p, d, lr, lg, lb, ar, ag, ab, ik);
  }
}

// ---------- billboards ----------
// rim light colours [r,g,b,strength]: cool amethyst/teal from the left & above, warm gold from the right
const RC = [120, 70, 255, 0.55], RW = [255, 150, 40, 0.42];
const SPR_DEF = { alpha: 1, add: false, flip: false, flash: 0, blood: 0, tint: null, wave: 0, waveF: 6, waveP: 0, legs: 0, skew: 0, lean: 0, rot: 0, sub: null, lit: true, glow: 0, shadow: true };
function drawSprite(cam, s) {
  const t = Engine.tex[s.tex]; if (!t) return;
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const rx = s.x - cam.x, ry = s.y - cam.y;
  const depth = rx * dx + ry * dy; if (depth < 0.15) return;
  const lat = -rx * dy + ry * dx;
  const hor = H / 2 + cam.pitch;
  const sc = PROJ / depth;
  const sw = s.w * sc, sh = s.h * sc;
  const cx = W / 2 + lat * sc;
  const yTop = hor - (s.z + s.h - cam.eye) * sc;
  const margin = sw * (0.15 + Math.abs(s.skew || 0) + Math.abs(s.wave || 0) + Math.abs(s.legs || 0) + Math.abs(s.lean || 0) * 0.5 + (s.rot ? 0.5 : 0));
  const x0 = Math.max(0, Math.floor(cx - sw / 2 - margin)), x1 = Math.min(W, Math.ceil(cx + sw / 2 + margin));
  const y0 = Math.max(0, Math.floor(yTop - (s.rot ? sh * 0.4 : 0))), y1 = Math.min(H, Math.ceil(yTop + sh + (s.rot ? sh * 0.4 : 0)));
  if (x1 <= x0 || y1 <= y0) return;
  // m6 perf: OCC holds opaque cores of nearer sprites drawn later in this frame; pixels inside them get fully overwritten anyway
  const occN = OCC_N;
  for (let k = 0; k < occN; k++) { const o = OCC[k]; if (o[0] <= y0 && o[1] >= y1 && o[2] <= x0 && o[3] >= x1) return; }
  const L = [1, 1, 1];
  if (s.lit !== false) { lightAt(s.x, s.y, L); L[0] = L[0] * 0.6 + 0.5; L[1] = L[1] * 0.6 + 0.5; L[2] = L[2] * 0.6 + 0.5; }
  if (s.glow) { L[0] += s.glow; L[1] += s.glow; L[2] += s.glow; }
  let hk = depth * 0.022; if (hk > 0.5) hk = 0.5; if (s.ent) hk *= 0.45;
  const sub = s.sub || [0, 0, 1, 1];
  const su0 = sub[0] * t.w, suw = (sub[2] - sub[0]) * t.w, sv0 = sub[1] * t.h, svh = (sub[3] - sub[1]) * t.h;
  const mask = s.blood > 0 ? bloodMaskFor(s.tex) : null; const bl = Math.min(0.72, s.blood || 0);
  const soft = !!s.soft; const flip = !!s.flip; const rimK = (s.rim === undefined ? (s.lit === false ? 0 : 1) : s.rim) * (s.ent ? 1.4 : 1);
  const alpha = s.alpha === undefined ? 1 : s.alpha, add = !!s.add;
  const flash = s.flash || 0, tint = s.tint;
  const cr = s.rot ? Math.cos(s.rot) : 1, srr = s.rot ? Math.sin(s.rot) : 0;
  const aspect = sh / sw;
  // v2 perf: every per-code colour transform (light, rim, tint, flash, haze) is linear -> precompute R*k+c per code
  const CK = SPR_CK; // [code][k0,k1,k2,c0,c1,c2], codes: 0 body,1 emissive,2 outline,3 rimL,4 rimR
  const t3 = tint ? tint[3] : 0;
  for (let code = 0; code < 5; code++) {
    const o = code * 6;
    for (let ch = 0; ch < 3; ch++) {
      let k, c;
      if (code === 2) { if (flash) { k = 1 - flash; c = 255 * flash; } else { k = ch === 2 ? 0.8 : 0.7; c = L[ch] * (ch === 0 ? 10 : ch === 1 ? 4 : 18); } }
      else {
        if (code === 1) { k = 1.5; c = 30; } else { k = L[ch]; c = 0; }
        if (code === 3) c += rimK * (flip ? RW[3] * RW[ch] : RC[3] * RC[ch]);
        else if (code === 4) c += rimK * (flip ? RC[3] * RC[ch] : RW[3] * RW[ch]);
        if (tint) { k *= 1 - t3; c = c * (1 - t3) + tint[ch] * t3; }
        if (flash) { k *= 1 - flash; c = c * (1 - flash) + 255 * flash; }
      }
      k *= 1 - hk; c = c * (1 - hk) + HAZE[ch] * hk;
      CK[o + ch] = k; CK[o + 3 + ch] = c;
    }
  }
  const amin = add || soft ? 4 : 100;
  const tw = t.w, td = t.d;
  const spans = texSpans(s.tex, t);
  const simpleCols = !s.rot && !s.skew && !s.wave && !s.legs && !s.lean;
  if (simpleCols) { // texel column per screen column, computed once
    for (let c = x0; c < x1; c++) { const u = (c + 0.5 - cx) / sw + 0.5; COLTX[c] = (u < 0 || u >= 1) ? -1 : (su0 + (flip ? 1 - u : u) * suw) | 0; }
  }
  for (let r = y0; r < y1; r++) {
    const v = (r + 0.5 - yTop) / sh;
    if (!s.rot && (v < 0 || v >= 1)) continue;
    const vv = v < 0 ? 0 : v > 1 ? 1 : v;
    let shift = 0, rs = 1;
    if (!simpleCols) {
      shift = (s.skew || 0) * (1 - vv);
      if (s.wave) shift += s.wave * Math.sin(vv * s.waveF + s.waveP) * (0.3 + 0.7 * vv);
      if (s.legs && vv > 0.6) shift += s.legs * (vv - 0.6) * 1.4;
      rs = 1 + (s.lean || 0) * (1 - vv);
    }
    const rowBase = r * W;
    const tyRow = simpleCols ? ((sv0 + v * svh) | 0) * tw : 0;
    let ka = W + 1, kb = W + 1, best = 0;   // widest occluded span on this row
    for (let k = 0; k < occN; k++) { const o = OCC[k]; if (r >= o[0] && r < o[1]) { const a = o[2] > x0 ? o[2] : x0, b = o[3] < x1 ? o[3] : x1; if (b - a > best) { best = b - a; ka = a; kb = b; } } }
    let cs = x0, ce = x1;
    if (best > 0) { if (ka <= x0) { cs = kb; ka = W + 1; } if (kb >= x1 && ka <= W) { ce = ka; ka = W + 1; } }
    // fast affine path: no legs warp / rotation on this row -> u is linear in c
    const fast = !simpleCols && !s.rot && !(s.legs && v > 0.6);
    const du = fast ? 1 / (sw * rs) : 0, u0 = fast ? ((0.5 - cx) / sw) / rs + 0.5 - shift : 0;
    const tyF = fast ? ((sv0 + v * svh) | 0) * tw : 0;
    if (fast && du > 0) { const lo = Math.floor(-u0 / du) - 1, hi = Math.ceil((1 - u0) / du) + 1; if (lo > cs) cs = lo; if (hi < ce) ce = hi; }
    // m6 perf: clamp to this texel row's opaque span (exact: texels outside it are below every alpha threshold)
    if (spans && (fast || simpleCols)) {
      const ty = ((sv0 + v * svh) | 0); const f = spans[ty * 2], l = spans[ty * 2 + 1];
      if (f > l) continue;
      const U0 = simpleCols ? (0.5 - cx) / sw + 0.5 : u0, DU = simpleCols ? 1 / sw : du;
      if (DU > 0) {
        let A = (f - su0) / suw, B = (l + 1 - su0) / suw;
        if (flip) { const t2 = 1 - B; B = 1 - A; A = t2; }
        const lo = Math.floor((A - U0) / DU) - 1, hi = Math.ceil((B - U0) / DU) + 2;
        if (lo > cs) cs = lo; if (hi < ce) ce = hi;
      }
    }
    for (let c = cs; c < ce; c++) {
      if (c >= ka && c < kb) { c = kb - 1; continue; }
      const idx = rowBase + c;
      if (ZB[idx] <= depth) continue;
      let ti;
      if (simpleCols) { const tx = COLTX[c]; if (tx < 0) continue; ti = tyRow + tx; }
      else if (fast) { const u = u0 + c * du; if (u < 0 || u >= 1) continue; ti = tyF + ((su0 + (flip ? 1 - u : u) * suw) | 0); }
      else {
        let u = ((c + 0.5 - cx) / sw) / rs + 0.5 - shift;
        let vq = v;
        if (s.legs && v > 0.6) {   // v2.4 stepping: the leg on the stepping side lifts (its foot rises off the floor)
          const side = (c + 0.5 - cx) / sw * (flip ? -1 : 1);
          if (side * s.legs > 0 && Math.abs(side) > 0.07) vq = 0.6 + (v - 0.6) * (1 + Math.abs(s.legs) * 3.2);
        }
        if (s.rot) { const ux = (u - 0.5), vy = (v - 0.5) * aspect; u = ux * cr - vy * srr + 0.5; vq = (ux * srr + vy * cr) / aspect + 0.5; }
        if (u < 0 || u >= 1 || vq < 0 || vq >= 1) continue;
        const uu = flip ? 1 - u : u;
        ti = ((sv0 + vq * svh) | 0) * tw + ((su0 + uu * suw) | 0);
      }
      const p = td[ti]; const a = p >>> 24;
      if (a < amin) continue;
      let R = p & 255, G = (p >> 8) & 255, B = (p >> 16) & 255;
      const o = a === 251 ? 12 : a === 250 ? 6 : a === 252 ? 18 : a === 253 ? 24 : 0;
      if (mask && o !== 12 && mask[ti] < bl) { const m = mask[ti]; const k = m < bl * 0.45 ? 0.82 : 0.55; const wet = ((ti * 7) % 13 === 0) ? 70 : 0; R = R + (150 + m * 70 + wet - R) * k; G = G * (1 - k) + (4 + wet * 0.5) * k; B = B * (1 - k) + (16 + wet * 0.4) * k; }
      R = R * CK[o] + CK[o + 3]; G = G * CK[o + 1] + CK[o + 4]; B = B * CK[o + 2] + CK[o + 5];
      const aa = a >= 250 ? alpha : alpha * (a / 255);
      if (add) { const q = PIX[idx]; R = (q & 255) + R * aa; G = ((q >> 8) & 255) + G * aa; B = ((q >> 16) & 255) + B * aa; }
      else if (aa < 0.99) { const q = PIX[idx]; R = (q & 255) * (1 - aa) + R * aa; G = ((q >> 8) & 255) * (1 - aa) + G * aa; B = ((q >> 16) & 255) * (1 - aa) + B * aa; }
      else ZB[idx] = depth;
      if (R > 255) R = 255; if (G > 255) G = 255; if (B > 255) B = 255; if (R < 0) R = 0; if (G < 0) G = 0; if (B < 0) B = 0;
      PIX[idx] = 0xff000000 | (B << 16) | (G << 8) | R;
    }
  }
}
const SPR_CK = new Float32Array(30), COLTX = new Int32Array(W);
const OCC = []; let OCC_N = 0; for (let i = 0; i < 4; i++) OCC.push([0, 0, 0, 0]);
const CORE = {}, SPANS = {};
// per texel row: first/last column with alpha >= 4 (the lowest alpha any sprite draws)
function texSpans(name, t) {
  let sp = SPANS[name]; if (sp !== undefined) return sp;
  if (!t || t.w < 8) return (SPANS[name] = null);
  sp = new Int16Array(t.h * 2);
  for (let y = 0; y < t.h; y++) { let f = t.w, l = -1; for (let x = 0; x < t.w; x++) if ((t.d[y * t.w + x] >>> 24) >= 4) { if (f === t.w) f = x; l = x; } sp[y * 2] = f; sp[y * 2 + 1] = l; }
  return (SPANS[name] = sp);
}
// largest axis-aligned rectangle of fully opaque texels in the upper 60% of a sprite (legs warp below that)
function sprCore(name) {
  if (name in CORE) return CORE[name];
  const t = Engine.tex[name]; let res = null;
  if (t && t.w >= 16 && t.h >= 16) {
    const w = t.w, hh = Math.floor(t.h * 0.6), hist = new Int32Array(w); let bestA = 0;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) hist[x] = (t.d[y * w + x] >>> 24) >= 250 ? hist[x] + 1 : 0;
      const st = [];
      for (let x = 0; x <= w; x++) {
        const hgt = x < w ? hist[x] : 0; let start = x;
        while (st.length && st[st.length - 1][1] >= hgt) { const [sx, sh] = st.pop(); const a = sh * (x - sx); if (a > bestA) { bestA = a; res = [sx, x - 1, y - sh + 1, y]; } start = sx; }
        st.push([start, hgt]);
      }
    }
    if (res && ((res[1] - res[0] + 1) < w * 0.12 || (res[3] - res[2] + 1) < t.h * 0.1)) res = null;
    if (res) res = [res[0] / w, (res[1] + 1) / w, res[2] / t.h, (res[3] + 1) / t.h];
  }
  return (CORE[name] = res);
}
// screen rect [r0,r1,c0,c1) that sprite s is guaranteed to cover with opaque pixels (conservative), or null
function occRect(cam, s, dx, dy) {
  if (s.add || s.soft || s.rot || s.sub || (s.alpha !== undefined && s.alpha < 0.99)) return null;
  const core = sprCore(s.tex); if (!core) return null;
  const depth = (s.x - cam.x) * dx + (s.y - cam.y) * dy; if (depth < 0.15) return null;
  const lat = -(s.x - cam.x) * dy + (s.y - cam.y) * dx;
  const sc = PROJ / depth, sw = s.w * sc, sh = s.h * sc;
  if (sw * sh * (core[1] - core[0]) * (core[3] - core[2]) < 300) return null;
  const cx = W / 2 + lat * sc, yTop = H / 2 + cam.pitch - (s.z + s.h - cam.eye) * sc;
  const r0 = Math.ceil(yTop + core[2] * sh) + 1, r1 = Math.floor(yTop + core[3] * sh) - 1;
  if (r1 - r0 < 2) return null;
  let ua = core[0], ub = core[1]; if (s.flip) { ua = 1 - core[1]; ub = 1 - core[0]; }
  let c0 = -1e9, c1 = 1e9;
  const skew = s.skew || 0, lean = s.lean || 0, wv = Math.abs(s.wave || 0);
  for (let k = 0; k <= 8; k++) {
    const v = core[2] + (core[3] - core[2]) * k / 8, shift = skew * (1 - v), rs = 1 + lean * (1 - v);
    if (rs <= 0.05) return null;
    const a = cx + sw * rs * (ua - 0.5 + shift + wv), b = cx + sw * rs * (ub - 0.5 + shift - wv);
    if (a > c0) c0 = a; if (b < c1) c1 = b;
  }
  c0 = Math.ceil(c0) + 1; c1 = Math.floor(c1) - 1;
  if (c1 - c0 < 2) return null;
  return [Math.max(0, r0), Math.min(H, r1), Math.max(0, c0), Math.min(W, c1), depth];
}
// draws a far->near sorted list; sprites skip pixels a nearer opaque core will overwrite later (pixel-identical result)
function drawSprites(cam, S) {
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang), n = S.length;
  if (!Engine.occ) { OCC_N = 0; for (let i = 0; i < n; i++) drawSprite(cam, S[i]); return; }
  const rects = new Array(n); let any = false;
  for (let i = 0; i < n; i++) { const r = occRect(cam, S[i], dx, dy); rects[i] = r; if (r) any = true; }
  for (let i = 0; i < n; i++) {
    OCC_N = 0;
    if (any) {
      const s = S[i], d = (s.x - cam.x) * dx + (s.y - cam.y) * dy;
      for (let j = n - 1; j > i && OCC_N < 4; j--) { const r = rects[j]; if (r && r[4] < d - 1e-4) { const o = OCC[OCC_N++]; o[0] = r[0]; o[1] = r[1]; o[2] = r[2]; o[3] = r[3]; } }
    }
    drawSprite(cam, S[i]);
  }
  OCC_N = 0;
}
// additive volumetric light shaft (procedural)
function drawShaft(cam, s, t) {
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const rx = s.x - cam.x, ry = s.y - cam.y;
  const depth = rx * dx + ry * dy; if (depth < 0.3) return;
  const lat = -rx * dy + ry * dx; const hor = H / 2 + cam.pitch; const sc = PROJ / depth;
  const sw = s.w * sc, cx = W / 2 + lat * sc;
  const yTop = hor - (s.z1 - cam.eye) * sc, yBot = hor - (s.z0 - cam.eye) * sc;
  const x0 = Math.max(0, Math.floor(cx - sw)), x1 = Math.min(W, Math.ceil(cx + sw));
  const y0 = Math.max(0, Math.floor(yTop)), y1 = Math.min(H, Math.ceil(yBot));
  const shim = 0.75 + 0.25 * Math.sin(t * 1.7 + s.ph);
  for (let r = y0; r < y1; r++) {
    const v = (r - yTop) / (yBot - yTop);
    const slant = s.slant * v * sw;   // light comes in at an angle
    const vk = (1 - v) * 0.6 + 0.4;
    for (let c = x0; c < x1; c++) {
      const idx = r * W + c; if (ZB[idx] <= depth) continue;
      const u = (c - cx - slant) / sw; const e = 1 - Math.abs(u) * 1.6; if (e <= 0) continue;
      const band = 0.7 + 0.3 * Math.sin(u * 9 + t * 0.8 + s.ph);
      const k = e * e * vk * s.i * shim * band;
      const q = PIX[idx];
      let R = (q & 255) + s.c[0] * k, G = ((q >> 8) & 255) + s.c[1] * k, B = ((q >> 16) & 255) + s.c[2] * k;
      if (R > 255) R = 255; if (G > 255) G = 255; if (B > 255) B = 255;
      PIX[idx] = 0xff000000 | (B << 16) | (G << 8) | R;
    }
  }
}
// particle square
function drawParticle(cam, x, y, z, size, col, add) {
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const rx = x - cam.x, ry = y - cam.y;
  const depth = rx * dx + ry * dy; if (depth < 0.12) return;
  const lat = -rx * dy + ry * dx; const sc = PROJ / depth;
  const sx = W / 2 + lat * sc, sy = H / 2 + cam.pitch - (z - cam.eye) * sc;
  let s = size * sc * 0.7; if (s < 1) s = 1; if (s > 5) s = 5;
  const x0 = Math.max(0, Math.round(sx - s / 2)), x1 = Math.min(W, Math.round(sx + s / 2) || x0 + 1), y0 = Math.max(0, Math.round(sy - s / 2)), y1 = Math.min(H, Math.round(sy + s / 2) || y0 + 1);
  for (let r = y0; r < Math.max(y1, y0 + 1) && r < H; r++) for (let c = x0; c < Math.max(x1, x0 + 1) && c < W; c++) {
    const idx = r * W + c; if (ZB[idx] <= depth) continue;
    if (add) { const q = PIX[idx]; let R = (q & 255) + (col & 255), G = ((q >> 8) & 255) + ((col >> 8) & 255), B = ((q >> 16) & 255) + ((col >> 16) & 255); PIX[idx] = 0xff000000 | (Math.min(255, B) << 16) | (Math.min(255, G) << 8) | Math.min(255, R); }
    else PIX[idx] = 0xff000000 | col;
  }
}
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
function drawWisp(cam, x, y, z, rw, rh, cr, cg, cb, a) {
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const rx = x - cam.x, ry = y - cam.y;
  const depth = rx * dx + ry * dy; if (depth < 0.5) return;
  const lat = -rx * dy + ry * dx; const sc = PROJ / depth;
  const sx = W / 2 + lat * sc, sy = H / 2 + cam.pitch - (z - cam.eye) * sc;
  let pw = rw * sc, ph = rh * sc; if (pw > 70) { ph *= 70 / pw; pw = 70; } if (pw < 2) return;
  const x0 = Math.max(0, Math.floor(sx - pw)), x1 = Math.min(W, Math.ceil(sx + pw)), y0 = Math.max(0, Math.floor(sy - ph)), y1 = Math.min(H, Math.ceil(sy + ph));
  const near = depth < 1.5 ? (depth - 0.5) : 1; const A = a * near;
  for (let r = y0; r < y1; r++) {
    const vy = (r + 0.5 - sy) / ph, vy2 = vy * vy; if (vy2 >= 1) continue;
    const brow = (r & 3) * 4;
    for (let c = x0; c < x1; c++) {
      const vx = (c + 0.5 - sx) / pw; let q = 1 - vx * vx - vy2; if (q <= 0) continue;
      const idx = r * W + c; const zd = ZB[idx]; if (zd <= depth - 0.6) continue;
      q = q * q * A; if (zd < depth + 0.6) q *= (zd - depth + 0.6) / 1.2;       // soft where it meets geometry
      const qq = Math.floor(q * 6 + BAYER4[brow + (c & 3)]) / 6; if (qq <= 0) continue;   // dithered bands
      const p = PIX[idx]; let R = (p & 255) + cr * qq, G = ((p >> 8) & 255) + cg * qq, B = ((p >> 16) & 255) + cb * qq;
      if (R > 255) R = 255; if (G > 255) G = 255; if (B > 255) B = 255;
      PIX[idx] = 0xff000000 | (B << 16) | (G << 8) | R;
    }
  }
}
function project(cam, x, y, z) {
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const rx = x - cam.x, ry = y - cam.y;
  const depth = rx * dx + ry * dy; if (depth < 0.12) return null;
  const lat = -rx * dy + ry * dx; const sc = PROJ / depth;
  return { x: W / 2 + lat * sc, y: H / 2 + cam.pitch - (z - cam.eye) * sc, d: depth, s: sc };
}

// ---------- v2 post FX: colour grade LUT + cheap bloom (quarter-res) ----------
const BW = W >> 2, BH = Math.ceil(H / 4);
const FX = { lut: null, bloom: null, bctx: null, bimg: null, bF: new Float32Array(BW * BH * 3), bT: new Float32Array(BW * BH * 3), vig: null, on: true, bloomK: 1.0 };
function buildLUT(grd) {
  const gr0 = grd || {};
  const SH = gr0.sh || [0.035, -0.02, 0.13], HI = gr0.hi || [0.035, 0.012, -0.03], MIX = gr0.mix || null;
  const L = new Uint32Array(64 * 64 * 64);
  const sm = x => x * x * (3 - 2 * x);
  for (let r6 = 0; r6 < 64; r6++) for (let g6 = 0; g6 < 64; g6++) for (let b6 = 0; b6 < 64; b6++) {
    let r = (r6 * 4 + 2) / 255, g = (g6 * 4 + 2) / 255, b = (b6 * 4 + 2) / 255;
    if (MIX) { const r0 = r, g0 = g, b0 = b; r = r0 * MIX[0] + g0 * MIX[1] + b0 * MIX[2]; g = r0 * MIX[3] + g0 * MIX[4] + b0 * MIX[5]; b = r0 * MIX[6] + g0 * MIX[7] + b0 * MIX[8]; }
    let l = 0.299 * r + 0.587 * g + 0.114 * b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // vibrance: push low-saturation colours harder than already-saturated ones
    const satNow = mx > 0 ? (mx - mn) / mx : 0;
    const sat = 1.17 + 0.3 * (1 - satNow);
    r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
    // gentle S-curve for punch
    r = r + (sm(Math.min(1, Math.max(0, r))) - r) * 0.32; g = g + (sm(Math.min(1, Math.max(0, g))) - g) * 0.32; b = b + (sm(Math.min(1, Math.max(0, b))) - b) * 0.32;
    // split tone: amethyst/violet shadows, warm gold highlights
    const sh = (1 - l) * (1 - l) * (1 - l), hi = l * l;
    r += sh * SH[0]; g += sh * SH[1]; b += sh * SH[2];
    r += hi * HI[0]; g += hi * HI[1]; b += hi * HI[2];
    // keep emerald greens vivid (don't let violet shadows mud them)
    if (g > r && g > b) { g += (g - Math.max(r, b)) * 0.34; b += (g - Math.max(r, b)) * 0.06; }
    // violet pop: purples get a little extra blue/red separation
    if (b > g && r > g) { const pv = (Math.min(r, b) - g) * 0.12; r += pv * 0.6; b += pv; }
    const R = Math.max(0, Math.min(255, r * 255)) | 0, G = Math.max(0, Math.min(255, g * 255)) | 0, B = Math.max(0, Math.min(255, b * 255)) | 0;
    L[(r6 << 12) | (g6 << 6) | b6] = 0xff000000 | (B << 16) | (G << 8) | R;
  }
  FX.lut = L;
  if (FX.bloom) return;
  FX.bloom = document.createElement('canvas'); FX.bloom.width = BW; FX.bloom.height = BH;
  FX.bctx = FX.bloom.getContext('2d'); FX.bimg = FX.bctx.createImageData(BW, BH);
  // violet vignette overlay
  const v = document.createElement('canvas'); v.width = W; v.height = H; const vc = v.getContext('2d');
  const gr = vc.createRadialGradient(W / 2, H / 2 - 10, H * 0.32, W / 2, H / 2, W * 0.62);
  gr.addColorStop(0, 'rgba(30,0,50,0)'); gr.addColorStop(0.7, 'rgba(36,0,60,0.18)'); gr.addColorStop(1, 'rgba(24,0,40,0.5)');
  vc.fillStyle = gr; vc.fillRect(0, 0, W, H); FX.vig = v;
}
function postFX() {
  if (!FX.on) return;
  const lut = FX.lut, N = W * H;
  for (let i = 0; i < N; i++) { const q = PIX[i]; PIX[i] = lut[((q & 0xfc) << 10) | ((q >> 4) & 0xfc0) | ((q >> 18) & 0x3f)]; }
  // bright pass, 2x2 samples per 4x4 block
  const F = FX.bF;
  for (let by = 0; by < BH; by++) {
    for (let bx = 0; bx < BW; bx++) {
      let ar = 0, ag = 0, ab = 0;
      for (let sy = 1; sy < 4; sy += 2) {
        const y = by * 4 + sy; if (y >= H) continue;
        for (let sx = 1; sx < 4; sx += 2) {
          const q = PIX[y * W + bx * 4 + sx];
          const r = q & 255, g = (q >> 8) & 255, b = (q >> 16) & 255;
          const mx = r > g ? (r > b ? r : b) : (g > b ? g : b); if (mx < 200) continue;
          const lum = (r * 77 + g * 150 + b * 29) >> 8; if (lum < 100) continue;
          const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
          const sat = (mx - mn) / mx; const w = (mx - 200) / 55 * (lum - 100) / 155 * (0.15 + 0.85 * sat);
          ar += r * w; ag += g * w; ab += b * w;
        }
      }
      const o = (by * BW + bx) * 3; F[o] = ar * 0.25; F[o + 1] = ag * 0.25; F[o + 2] = ab * 0.25;
    }
  }
  // separable box blur x2 (radius 2)
  const T = FX.bT;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -2; k <= 2; k++) { let xx = x + k; if (xx < 0) xx = 0; else if (xx >= BW) xx = BW - 1; const o = (y * BW + xx) * 3; r += F[o]; g += F[o + 1]; b += F[o + 2]; }
      const o = (y * BW + x) * 3; T[o] = r * 0.2; T[o + 1] = g * 0.2; T[o + 2] = b * 0.2;
    }
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -2; k <= 2; k++) { let yy = y + k; if (yy < 0) yy = 0; else if (yy >= BH) yy = BH - 1; const o = (yy * BW + x) * 3; r += T[o]; g += T[o + 1]; b += T[o + 2]; }
      const o = (y * BW + x) * 3; F[o] = r * 0.2; F[o + 1] = g * 0.2; F[o + 2] = b * 0.2;
    }
  }
  const d = FX.bimg.data;
  for (let i = 0, j = 0; i < BW * BH; i++, j += 3) { const o = i * 4; d[o] = Math.min(255, F[j] * 2.2); d[o + 1] = Math.min(255, F[j + 1] * 2.2); d[o + 2] = Math.min(255, F[j + 2] * 2.2); d[o + 3] = 255; }
  FX.bctx.putImageData(FX.bimg, 0, 0);
}
// ---------- v2 blood droplet: velocity-stretched streak with dark rim + bright wet head ----------
function drawDrop(cam, p, dark, hi) {
  const dx = Math.cos(cam.ang), dy = Math.sin(cam.ang);
  const rx = p.x - cam.x, ry = p.y - cam.y;
  const depth = rx * dx + ry * dy; if (depth < 0.35) return;
  const sc = PROJ / depth, hor = H / 2 + cam.pitch;
  const lat = -rx * dy + ry * dx;
  const sx = W / 2 + lat * sc, sy = hor - (p.z - cam.eye) * sc;
  // tail = position 22ms ago
  const k = 0.022; const tx = p.x - p.vx * k, ty = p.y - p.vy * k, tz = p.z - p.vz * k;
  const rx2 = tx - cam.x, ry2 = ty - cam.y; const d2 = Math.max(0.15, rx2 * dx + ry2 * dy); const sc2 = PROJ / d2;
  const ex = W / 2 + (-rx2 * dy + ry2 * dx) * sc2, ey = hor - (tz - cam.eye) * sc2;
  let s = p.size * sc * 0.55; if (s < 1) s = 1; if (s > 3) s = 3; const th = s | 0 || 1;
  let ddx = sx - ex, ddy = sy - ey; let L = Math.hypot(ddx, ddy); if (L > 8) { ddx *= 8 / L; ddy *= 8 / L; L = 8; }
  const n = Math.max(1, Math.ceil(L));
  const col = p.col;
  for (let i = 0; i <= n; i++) {
    const f = i / n; const cx = (sx - ddx * f) | 0, cy = (sy - ddy * f) | 0;
    const tt = f > 0.6 ? Math.max(1, th - 1) : th;
    for (let yy = 0; yy < tt; yy++) { const r = cy + yy; if (r < 0 || r >= H) continue;
      for (let xx = 0; xx < tt; xx++) { const c = cx + xx; if (c < 0 || c >= W) continue; const idx = r * W + c; if (ZB[idx] <= depth) continue;
        PIX[idx] = 0xff000000 | ((i === 0 && xx === 0 && yy === 0 && th > 1) ? hi : (f > 0.7 || yy === tt - 1 && tt > 2) ? dark : col); } }
  }
}
