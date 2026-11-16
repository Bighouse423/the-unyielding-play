// M7C: FIT-TEXT. Every bitmap-text draw in the game goes through text(), so text() is replaced here with a fitting version:
//   1) measure; if it fits inside the bounds it is drawn exactly as before (pixel-identical),
//   2) too wide -> shrink one step (x3 -> x2 -> x1, then a condensed 6px font made from the same glyphs),
//   3) still too wide -> word-wrap onto extra lines,
//   4) finally clamp the block inside the screen (3px margins) or the current panel box (TF.box).
// fitBlock() is the paragraph version (wrap first, then shrink, then '..' truncate) for cards, menus and toasts.
// TF.log (when an array) records every drawn text box - tools/m7c/textaudit.py reads it to flag anything off-screen/overlapping.
const TF = { M: 3, box: null, log: null, off: /[?&]tfoff=1/.test(location.search), free: false };
const _text0 = text;
const TF_COND = { atlas: null, tint: {} };
function tfCondensed() { // 6px-advance glyphs: drop the doubled stroke columns of the chunky 8px font
  if (TF_COND.atlas) return TF_COND.atlas;
  const im = Engine.imgs.font8, n = (im.width / 8) | 0;
  const src = document.createElement('canvas'); src.width = im.width; src.height = im.height; const sx = src.getContext('2d'); sx.drawImage(im, 0, 0);
  const d = sx.getImageData(0, 0, im.width, im.height).data;
  const out = document.createElement('canvas'); out.width = n * 6; out.height = 8; const ox = out.getContext('2d'); const od = ox.createImageData(n * 6, 8);
  const col = (k, c) => { const a = []; for (let y = 0; y < 8; y++) a.push(d[(y * im.width + k * 8 + c) * 4 + 3] > 0 ? 1 : 0); return a; };
  for (let k = 0; k < n; k++) {
    let cols = []; for (let c = 0; c < 8; c++) cols.push(col(k, c));
    let c0 = cols.findIndex(a => a.some(v => v)), c1 = 7 - [...cols].reverse().findIndex(a => a.some(v => v));
    if (c0 < 0) continue; cols = cols.slice(c0, c1 + 1);
    const same = (a, b) => a.every((v, i) => v === b[i]);
    while (cols.length > 5) { // remove a doubled column, outer strokes first
      let cut = -1; const order = [1, cols.length - 2]; for (let i = 2; i < cols.length - 2; i++) order.push(i);
      for (const i of order) { if (i > 0 && same(cols[i], cols[i - 1])) { cut = i; break; } if (i < cols.length - 1 && same(cols[i], cols[i + 1])) { cut = i; break; } }
      if (cut < 0) cut = cols.length >> 1; cols.splice(cut, 1);
    }
    const x0 = k * 6 + ((5 - cols.length) >> 1);
    cols.forEach((a, i) => a.forEach((v, y) => { if (v) { const o = (y * n * 6 + x0 + i) * 4; od.data[o] = od.data[o + 1] = od.data[o + 2] = 255; od.data[o + 3] = 255; } }));
  }
  ox.putImageData(od, 0, 0); TF_COND.atlas = out; return out;
}
function tfCondTint(c) {
  if (TF_COND.tint[c]) return TF_COND.tint[c];
  const a = tfCondensed(), cv = document.createElement('canvas'); cv.width = a.width; cv.height = a.height; const x = cv.getContext('2d');
  x.drawImage(a, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = c; x.fillRect(0, 0, cv.width, cv.height); return (TF_COND.tint[c] = cv);
}
function tfDrawCond(ctx, str, px, y, col, shadow) {
  const draw = (fc, ox, oy) => { for (let i = 0; i < str.length; i++) { const k = str.charCodeAt(i) - 32; if (k <= 0 || k > 95) continue; ctx.drawImage(fc, k * 6, 0, 6, 8, px + i * 6 + ox, y + oy, 6, 8); } };
  if (shadow) { const sf = tfCondTint(shadow); draw(sf, 1, 1); draw(sf, -1, 0); draw(sf, 0, -1); }
  draw(tfCondTint(col), 0, 0);
}
function tfWrap(str, maxCh) { const out = []; let line = ''; for (const w of String(str).split(' ')) { if (!line) line = w; else if ((line + ' ' + w).length <= maxCh) line += ' ' + w; else { out.push(line); line = w; } } if (line || !out.length) out.push(line); return out; }
// layout a string into at most maxLines lines of <= maxW px: returns {lines, sc, adv}
function tfLayout(str, maxW, sc = 1, maxLines = 1, wrapFirst = false) {
  str = String(str); const steps = []; for (let s = sc; s >= 1; s = s > 2 ? 2 : s > 1 ? 1 : 0) { steps.push([s, 8]); if (s === 1) break; } steps.push([1, 6]);
  const ok = L => L.every(l => l.length * L.adv * L.sc <= maxW);
  const tryStep = ([s, adv], lines) => { const ch = Math.max(1, Math.floor(maxW / (adv * s))); const L = lines > 1 ? tfWrap(str, ch) : [str]; L.sc = s; L.adv = adv; return L; };
  if (wrapFirst) { for (const st of steps) { const L = tryStep(st, maxLines); if (L.length <= maxLines && ok(L)) return L; } }
  else { for (const st of steps) { const L = tryStep(st, 1); if (ok(L)) return L; } for (const st of [[1, 8], [1, 6]]) { const L = tryStep(st, maxLines); if (L.length <= maxLines && ok(L)) return L; } }
  // last resort: condensed, wrapped, cut to maxLines with '..'
  const L = tryStep([1, 6], 99), ch = Math.max(2, Math.floor(maxW / 6)); const R = L.slice(0, maxLines).map(l => l.length > ch ? l.slice(0, ch - 2) + '..' : l);
  if (L.length > maxLines) { const l = R[maxLines - 1]; R[maxLines - 1] = (l.length > ch - 2 ? l.slice(0, ch - 2) : l) + '..'; }
  R.sc = 1; R.adv = 6; R.trunc = true; return R;
}
function tfDrawLine(ctx, l, px, y, col, sc, adv, shadow) { if (adv === 8) _text0(ctx, l, px, y, col, 'left', sc, shadow); else tfDrawCond(ctx, l, px, y, col, shadow); }
function tfRec(s, x0, y0, x1, y1, ctx, how) { if (TF.log && ctx.canvas && ctx.canvas.width === W) TF.log.push({ s, x0, y0, x1, y1, how, box: TF.box ? TF.box.slice() : null }); }
text = function (ctx, str, x, y, col = '#fff', align = 'left', sc = 1, shadow = '#1a0612') {
  str = String(str);
  const cw = ctx.canvas ? ctx.canvas.width : W, chh = ctx.canvas ? ctx.canvas.height : H;
  const bx0 = TF.box ? TF.box[0] : TF.M, bx1 = TF.box ? TF.box[1] : cw - TF.M;
  const w0 = str.length * 8 * sc;
  const px0 = align === 'center' ? Math.round(x - w0 / 2) : align === 'right' ? Math.round(x - w0) : Math.round(x);
  if (TF.off || TF.free || (px0 >= bx0 && px0 + w0 <= bx1 && y >= 0 && y + 8 * sc <= chh)) {
    tfRec(str, px0, Math.round(y), px0 + w0, Math.round(y) + 8 * sc, ctx, 'fit'); return _text0(ctx, str, x, y, col, align, sc, shadow);
  }
  let maxW = align === 'left' ? bx1 - Math.max(bx0, x) : align === 'right' ? Math.min(bx1, x) - bx0 : 2 * Math.min(x - bx0, bx1 - x);
  if (maxW < 48) maxW = bx1 - bx0; // anchored hard against an edge: use the whole width and clamp
  const L = tfLayout(str, maxW, sc, 3, false), lh = (L.adv === 8 ? 9 : 9) * L.sc;
  const w = Math.max(...L.map(l => l.length * L.adv * L.sc)), h = L.length * lh - (lh - 8 * L.sc);
  let yy = Math.round(y); if (yy + h > chh - 1) yy = chh - 1 - h; if (yy < 1) yy = 1;
  for (const l of L) {
    const lw = l.length * L.adv * L.sc; let px = align === 'center' ? Math.round(x - lw / 2) : align === 'right' ? Math.round(x - lw) : Math.round(x);
    px = Math.max(bx0, Math.min(bx1 - lw, px));
    tfDrawLine(ctx, l, px, yy, col, L.sc, L.adv, shadow); tfRec(l, px, yy, px + lw, yy + 8 * L.sc, ctx, L.adv === 6 ? 'cond' : L.sc < sc ? 'shrink' : L.length > 1 ? 'wrap' : 'clamp'); yy += lh;
  }
  return w;
};
// paragraph: wrap to maxW, shrink if it still doesn't fit maxH, '..' as a last resort. Returns the height used.
function fitBlock(ctx, str, x, y, maxW, maxH, col = '#fff', align = 'center', sc = 1, lh = 9) {
  const maxLines = Math.max(1, Math.floor((maxH + (lh - 8 * sc)) / (lh)));
  let L = tfLayout(str, maxW, sc, maxLines, true); const step = L.adv === 6 ? Math.max(8, lh - 1) : lh * L.sc / sc;
  const n2 = Math.max(1, Math.floor((maxH + 1) / step)); if (L.length > n2) L = tfLayout(str, maxW, 1, n2, true);
  let yy = y; const box = TF.box; TF.box = [Math.floor(align === 'center' ? x - maxW / 2 : align === 'right' ? x - maxW : x), Math.ceil(align === 'center' ? x + maxW / 2 : align === 'right' ? x : x + maxW)];
  for (const l of L) {
    const lw = l.length * L.adv * L.sc; let px = align === 'center' ? Math.round(x - lw / 2) : align === 'right' ? Math.round(x - lw) : Math.round(x);
    tfDrawLine(ctx, l, px, yy, col, L.sc, L.adv, '#1a0612'); tfRec(l, px, yy, px + lw, yy + 8 * L.sc, ctx, L.trunc ? 'trunc' : 'block'); yy += step;
  }
  TF.box = box; return yy - y;
}
function tfWidth(str, maxW, sc = 1) { const L = tfLayout(str, maxW, sc, 1); return Math.max(...L.map(l => l.length * L.adv * L.sc)); }
// draw pre-laid-out lines (from tfLayout) centred/aligned at x, one per lh px; returns the y after the last line
function tfLines(ctx, L, x, y, col, align = 'center', lh = 9, shadow = '#1a0612') {
  for (const l of L) { const lw = l.length * L.adv * L.sc, px = align === 'center' ? Math.round(x - lw / 2) : align === 'right' ? Math.round(x - lw) : Math.round(x);
    tfDrawLine(ctx, l, px, y, col, L.sc, L.adv, shadow); tfRec(l, px, Math.round(y), px + lw, Math.round(y) + 8 * L.sc, ctx, L.trunc ? 'trunc' : 'lines'); y += lh; }
  return y;
}
function tfLinesW(L) { return Math.max(0, ...L.map(l => l.length * L.adv * L.sc)); }
