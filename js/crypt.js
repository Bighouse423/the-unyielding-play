'use strict';
// ===== M2: THE CRYPT - seeded catacomb generator (concept art 22) =====
// A chain of rooms on a 5x5 slot grid climbing north to a vaulted boss arena. Every stage rolls a new layout:
// room shapes and styles (pillared halls, sarcophagus vaults, ossuary pits, tomb galleries with raised ledges,
// miasma grates), an elite room with spoils, and two secret rooms behind breakable walls, each holding a relic.
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buildCrypt(theme, seed) {
  theme = theme || {};
  const R = mulberry(seed || 1); const ri = (a, b) => a + Math.floor(R() * (b - a + 1)); const pick = a => a[Math.floor(R() * a.length)];
  MW = 50; MH = 58; const N = MW * MH;
  FH = new Float32Array(N); CH = new Float32Array(N); SOLID = new Uint8Array(N);
  WT = new Uint8Array(N); FT = new Uint8Array(N); CT = new Uint8Array(N); SKY = new Uint8Array(N);
  const T = Engine.tex;
  FLOORTEX = [T.f_crypt, T.f_crypt2, T.f_lid, T.f_blood, T.t_stone2, T.f_marble, T.f_altar];
  CEILTEX = [T.c_crypt, T.c_vault];
  const def = (base, tall) => ({ base: T[base], tall: tall ? { t: T[tall[0]], z0: tall[1], z1: tall[2], span: 0, x0: 0 } : null });
  WALLDEFS = [
    def('t_crypt'), def('t_crypt2'), def('t_skulls'), def('t_cpillar'), def('t_crypt', ['t_tomb', 0.05, 2.3]), def('t_crypt2', ['t_grate', 0, 2.1]),
    def('t_cryptcrack'), def('t_gate'), def('t_sarc'), def('t_skullcol'), def('t_crypt', ['t_skullcol', 0, 2.6]), def('t_stone2'),
    def('t_cryptfalse'),
  ];
  // the Blood Ossuary is its own place: bone-and-crimson stone, red marble, living blood pools, bone chapels and charnel pits
  const OSS = theme.variant === 'ossuary';
  if (OSS) {
    FLOORTEX = [T.f_oss, T.f_oss2, T.f_redmarble, T.f_blood, T.t_stone2, T.f_redmarble, T.f_blood];
    CEILTEX = [T.c_oss, T.c_vault];
    WALLDEFS = [
      def('o_wall'), def('o_wall2'), def('t_skulls'), def('t_skullcol'), def('o_wall', ['t_skullcol', 0, 2.6]), def('o_wall2', ['t_grate', 0, 2.1]),
      def('o_crack'), def('t_gate'), def('t_sarc'), def('t_skullcol'), def('o_wall2', ['t_skulls', 0.4, 2.4]), def('t_stone2'),
      def('o_wallfalse'),
    ];
  }
  // M5: the Moonlit Courtyard (open sky over every room, hedges, statues, a fountain of blood) and the Gargoyle Belfry
  const CY = theme.variant === 'courtyard', BF = theme.variant === 'belfry';
  if (CY) {
    FLOORTEX = [T.f_cobble, T.f_flag, T.f_flag, T.f_grass, T.f_flag, T.f_marble, T.f_blood];
    CEILTEX = [T.c_arcade, T.c_vault];
    WALLDEFS = [
      def('k_wall'), def('k_wall2'), def('k_ivy'), def('k_pillar'), def('k_wall', ['t_banner', 0.7, 2.7]), def('k_hedge'),
      def('k_crack'), def('t_gate'), def('t_sarc'), def('k_wall2', ['t_window', 0.5, 2.7]), def('k_wall', ['t_statue', 0, 2.9]), def('t_stone2'),
      def('k_false'),
    ];
  } else if (BF) {
    FLOORTEX = [T.f_plank, T.f_wood, T.f_plank, T.f_pitwood, T.t_stone2, T.f_marble, T.f_blood];
    CEILTEX = [T.c_beam, T.c_wood];
    WALLDEFS = [
      def('b_wall'), def('b_wall2'), def('b_loose'), def('b_beam'), def('b_wall', ['t_banner', 0.8, 3.0]), def('b_wall', ['b_slit', 0.4, 3.0]),
      def('b_crack'), def('t_gate'), def('t_sarc'), def('b_wall2'), def('b_wall', ['t_window', 0.6, 3.2]), def('b_wall2'),
      def('b_false'),
    ];
  }
  // M6: data-driven variants (Blood Arena, Witch's Necropolis...) registered in CRYPT_VARIANTS
  const VX = (typeof CRYPT_VARIANTS !== 'undefined' && CRYPT_VARIANTS[theme.variant]) || null;
  if (VX) { const tx = VX.tex(T, def); FLOORTEX = tx.floor; CEILTEX = tx.ceil; WALLDEFS = tx.walls; }
  const room = new Int16Array(N).fill(-1);   // which room an open cell belongs to (-2 corridor)
  const idx = (x, y) => y * MW + x;
  for (let i = 0; i < N; i++) { SOLID[i] = 1; FH[i] = 99; CH[i] = 3.2; WT[i] = 0; }
  const open = (x, y, fh, ch, ft, rid, ct = 0) => { if (x < 1 || y < 1 || x >= MW - 1 || y >= MH - 1) return; const i = idx(x, y); SOLID[i] = 0; FH[i] = fh; CH[i] = ch; FT[i] = ft; CT[i] = ct; WT[i] = 0; room[i] = rid; };
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && !SOLID[idx(x, y)];
  // ---- slot grid + main path
  const SX = 5, SY = 5, OX = 2, OY = 12, SS = 9;
  const used = {}; const key = (cx, cy) => cx + ',' + cy;
  let cx = ri(1, 3), cy = SY - 1; const path = [[cx, cy]]; used[key(cx, cy)] = 'path';
  let side = 0;
  while (cy > 0) {
    const opts = [];
    if (side < 2) { if (cx > 0 && !used[key(cx - 1, cy)]) opts.push([-1, 0]); if (cx < SX - 1 && !used[key(cx + 1, cy)]) opts.push([1, 0]); }
    opts.push([0, -1]); if (path.length < 3) opts.push([0, -1]);
    const [dx, dy] = pick(opts); cx += dx; cy += dy; side = dy ? 0 : side + 1;
    path.push([cx, cy]); used[key(cx, cy)] = 'path';
  }
  // ---- rooms
  const rooms = [];
  const STYLES = VX ? VX.styles : CY ? ['fountain', 'garden', 'statues', 'graveyard', 'fountain', 'garden', 'pillars'] : BF ? ['bellroom', 'gallery', 'pillars', 'brokenfloor', 'bellroom', 'gallery'] : OSS ? ['bonechapel', 'bloodpool', 'charnel', 'bonechapel', 'bloodpool', 'tombs', 'sarc'] : ['pillars', 'sarc', 'ossuary', 'tombs', 'gallery', 'miasma'];
  const mkRoom = (cx, cy, kind) => {
    const sx = OX + cx * SS, sy = OY + cy * SS;
    const big = kind === 'path' || kind === 'elite';
    const w = big ? ri(5, 7) : ri(3, 4), h = big ? ri(5, 7) : ri(3, 4);
    const x0 = sx + 1 + ri(0, 7 - w), y0 = sy + 1 + ri(0, 7 - h);
    const r = { id: rooms.length, cx, cy, kind, x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, style: kind === 'path' ? pick(STYLES) : kind === 'elite' ? 'pillars' : 'secret', ch: big ? ((BF || (VX && VX.tall)) ? (w * h > 30 ? 5.4 : 4.6) : w * h > 30 ? 4.2 : 3.6) : 2.8 };
    rooms.push(r); return r;
  };
  const pr = path.map(([x, y], i) => mkRoom(x, y, 'path'));
  pr[0].style = 'start';
  // merge sideways neighbours into long halls now and then
  for (let i = 1; i < pr.length; i++) {
    const a = pr[i - 1], b = pr[i];
    if (a.cy === b.cy && R() < 0.45 && a.style !== 'start') { const y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1); if (y1 - y0 >= 3) { b.hallWith = a.id; b.style = 'hall'; a.style = 'hall'; b.hy0 = y0; b.hy1 = y1; } }
  }
  const carveRoom = r => {
    const ft = r.style === 'ossuary' ? 1 : r.style === 'start' ? 4 : r.kind === 'secret' ? 5 : 0, ct = r.ch > 4 ? 1 : 0;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) open(x, y, 0, r.ch, ft, r.id, ct);
  };
  for (const r of pr) carveRoom(r);
  for (const b of pr) if (b.hallWith !== undefined) { const a = rooms[b.hallWith]; const x0 = Math.min(a.x1, b.x1), x1 = Math.max(a.x0, b.x0); for (let y = b.hy0; y <= b.hy1; y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) open(x, y, 0, Math.min(a.ch, b.ch), 0, b.id, 0); }
  const center = r => [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.y0 + r.y1) / 2)];
  // corridors (2 wide) between consecutive path rooms
  const corridor = (a, b, wide, ch = 2.7, rid = -2) => {
    const [ax, ay] = center(a), [bx, by] = center(b); const cells = [];
    const put = (x, y) => { if (!isOpen(x, y)) { open(x, y, 0, ch, 1, rid, 0); cells.push([x, y]); } if (wide && !isOpen(x + 1, y)) { open(x + 1, y, 0, ch, 1, rid, 0); cells.push([x + 1, y]); } };
    const putH = (x, y) => { if (!isOpen(x, y)) { open(x, y, 0, ch, 1, rid, 0); cells.push([x, y]); } if (wide && !isOpen(x, y + 1)) { open(x, y + 1, 0, ch, 1, rid, 0); cells.push([x, y + 1]); } };
    if (a.cx === b.cx) { // vertical neighbours: down/up, jog at the slot boundary
      const my = Math.floor((ay + by) / 2);
      for (let y = Math.min(ay, my); y <= Math.max(ay, my); y++) put(ax, y);
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) putH(x, my);
      for (let y = Math.min(my, by); y <= Math.max(my, by); y++) put(bx, y);
    } else {
      const mx = Math.floor((ax + bx) / 2);
      for (let x = Math.min(ax, mx); x <= Math.max(ax, mx); x++) putH(x, ay);
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) put(mx, y);
      for (let x = Math.min(mx, bx); x <= Math.max(mx, bx); x++) putH(x, by);
    }
    return cells;
  };
  for (let i = 1; i < pr.length; i++) if (pr[i].hallWith === undefined) corridor(pr[i - 1], pr[i], true);
  // ---- elite room + two secret rooms in free neighbour slots
  const freeNb = r => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [r.cx + dx, r.cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < SX && y < SY && !used[key(x, y)]);
  const mids = pr.slice(1, -1).filter(r => freeNb(r).length);
  let elite = null;
  if (mids.length) {
    const host = mids[Math.floor(mids.length / 2)]; const [ex, ey] = pick(freeNb(host)); used[key(ex, ey)] = 'elite';
    elite = mkRoom(ex, ey, 'elite'); carveRoom(elite); corridor(host, elite, true);
  }
  // M4: 3-4 secrets per stage. Wall kinds: CRACKED (visible), loose SKULLS, and FALSE walls (discoloured bricks + a hairline
  // crack; only the draft of dust and a whisper give them away). One secret usually leads on to a deeper VAULT behind a second false wall.
  const secrets = []; const cracks = [];
  const nSec = 3 + (R() < 0.5 ? 1 : 0);
  const hostCands = pr.slice(0, -1).filter(r => freeNb(r).length).sort(() => R() - 0.5);
  const secretBehind = (host, kind, passage) => {
    const nb = freeNb(host); if (!nb.length) return null; const [sx2, sy2] = pick(nb); used[key(sx2, sy2)] = 'secret';
    const s = mkRoom(sx2, sy2, 'secret'); carveRoom(s);
    const cells = corridor(host, s, false, 2.5, s.id);
    let wall = null;
    for (const [x, y] of cells) { if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => room[idx(x + dx, y + dy)] === host.id || (room[idx(x + dx, y + dy)] === -2))) { wall = [x, y]; break; } }
    if (!wall) wall = cells[0];
    if (!wall) return null;
    const i = idx(wall[0], wall[1]); SOLID[i] = 1; FH[i] = 99; WT[i] = kind === 'cracked' ? 6 : kind === 'skulls' ? 2 : 12;
    cracks.push({ x: wall[0], y: wall[1], hp: kind === 'false' ? 2 : 3, open: false, ch: 2.5, kind, room: s.id });
    s.wall = wall; s.skind = kind; secrets.push(s); return s;
  };
  const KINDS = ['cracked', 'skulls', 'false', 'false'];
  for (const host of hostCands) {
    if (secrets.length >= nSec) break;
    secretBehind(host, KINDS[secrets.length] || 'false');
  }
  // a deeper vault behind one of them (multi-room hidden area)
  const vh = secrets.filter(s => freeNb(s).length).sort(() => R() - 0.5)[0];
  if (vh) { const v = secretBehind(vh, 'false'); if (v) { v.vault = true; v.parentSec = vh.id; } }
  // ---- boss arena (vaulted, high) + gate
  const last = pr[pr.length - 1]; const [lx] = center(last);
  const AX0 = 12, AX1 = 37, AY0 = 1, AY1 = 10;
  for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) open(x, y, 0, 5.6, 1, 99, 1);
  for (const [px, py] of [[16, 3], [33, 3], [16, 8], [33, 8]]) { const i = idx(px, py); SOLID[i] = 1; FH[i] = 99; WT[i] = 3; room[i] = -1; }
  const gx = clamp(lx, AX0 + 3, AX1 - 3);
  // gate connector: north margin row (no room ever reaches it), then straight down into the last room
  for (let x = Math.min(gx, lx); x <= Math.max(gx, lx); x++) open(x, AY1 + 2, 0, 2.9, 1, -2, 0);
  for (let y = AY1 + 2; y <= last.y0; y++) open(lx, y, 0, 2.9, 1, -2, 0);
  const gi = idx(gx, AY1 + 1); SOLID[gi] = 1; FH[gi] = 99; WT[gi] = 7; CH[gi] = 2.9; FT[gi] = 1;
  // ---- room dressing
  const props = []; const L = []; const pickups = []; const spawns = []; const signs = [];
  const GRN = [0.3, 1.0, 0.45], ORG = [1.0, 0.55, 0.22], VIO = [0.7, 0.3, 1.0];
  const wallTorch = (r, green) => { // a torch on a random wall face of the room
    for (let k = 0; k < 30; k++) {
      const sideK = ri(0, 3); let x, y, ox = 0, oy = 0;
      if (sideK === 0) { x = ri(r.x0, r.x1); y = r.y0; oy = -1; } else if (sideK === 1) { x = ri(r.x0, r.x1); y = r.y1; oy = 1; } else if (sideK === 2) { x = r.x0; y = ri(r.y0, r.y1); ox = -1; } else { x = r.x1; y = ri(r.y0, r.y1); ox = 1; }
      if (isOpen(x + ox, y + oy)) continue;
      const tx = x + 0.5 + ox * 0.44, ty = y + 0.5 + oy * 0.44;
      if (props.some(p => p.type === 'torch' && Math.hypot(p.x - tx, p.y - ty) < 2.2)) continue;
      props.push({ type: 'torch', x: tx, y: ty, z: 1.5, green: !!green });
      L.push({ x: x + 0.5 - ox * 0.1, y: y + 0.5 - oy * 0.1, r: 4.4, i: green ? 0.95 : 1.05, c: green ? GRN : ORG, flicker: true });
      return;
    }
  };
  const freeCell = (r, avoidEdge = 1) => { for (let k = 0; k < 60; k++) { const x = ri(r.x0 + avoidEdge, r.x1 - avoidEdge), y = ri(r.y0 + avoidEdge, r.y1 - avoidEdge); const i = idx(x, y); if (!SOLID[i] && FH[i] === 0 && !props.some(p => Math.hypot(p.x - x - 0.5, p.y - y - 0.5) < 0.9)) return [x + 0.5, y + 0.5]; } return [(r.x0 + r.x1) / 2 + 0.5, (r.y0 + r.y1) / 2 + 0.5]; };
  const CX = { R, ri, pick, idx, isOpen, room, props, L, freeCell, cracks, pickups, spawns, GRN, ORG, VIO };
  for (const r of rooms) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    if (VX && VX.dress && r.kind !== 'secret') VX.dress(r, w, h, CX);
    if (r.kind === 'secret') {
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 3.2, i: 1.0, c: VIO });
      continue;
    }
    if (r.style === 'pillars' || r.style === 'hall') { if (w >= 5 && h >= 5) for (const [px, py] of [[r.x0 + 1, r.y0 + 1], [r.x1 - 1, r.y0 + 1], [r.x0 + 1, r.y1 - 1], [r.x1 - 1, r.y1 - 1]]) { const i = idx(px, py); if (R() < 0.85) { SOLID[i] = 1; FH[i] = 99; WT[i] = 3; } } }
    if (r.style === 'sarc') { const n = w >= 6 ? 2 : 1; for (let k = 0; k < n; k++) { const x = r.x0 + 1 + k * 3 + (w >= 6 ? 0 : Math.floor((w - 3) / 2)), y = ri(r.y0 + 1, r.y1 - 2); for (const yy of [y, y + 1]) { const i = idx(x, yy); if (!SOLID[i]) { FH[i] = 0.72; FT[i] = 2; WT[i] = 8; } } } }
    if (r.style === 'ossuary') { for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = idx(x, y); FH[i] = -0.3; FT[i] = 3; } for (let k = 0; k < 4; k++) { const [x, y] = freeCell(r, 0); props.push({ type: 'bones', x, y, z: 0 }); } }
    if (r.style === 'gallery') { // raised ledge along the north wall (0.9), stairs 0.3 / 0.6 - never across a doorway
      let sxp = ri(r.x0 + 1, r.x1 - 1); let n = 0; const raised = [];
      const crackNb = (x, y) => cracks.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) === 1);
      for (let x = r.x0; x <= r.x1; x++) {
        const door = crackNb(x, r.y0) || crackNb(x, r.y0 + 1) || isOpen(x, r.y0 - 1) || (x === r.x0 && isOpen(x - 1, r.y0)) || (x === r.x1 && isOpen(x + 1, r.y0)) || (x === r.x0 && isOpen(x - 1, r.y0 + 1)) || (x === r.x1 && isOpen(x + 1, r.y0 + 1));
        if (door || x === sxp - 2 && false) continue; const i = idx(x, r.y0); if (SOLID[i]) continue; FH[i] = 0.9; FT[i] = 4; WT[i] = 11; n++; raised.push(x);
      }
      if (raised.length && !raised.includes(sxp)) { const inner = raised.filter(x => x > r.x0 && x < r.x1); sxp = (inner.length ? inner : raised)[Math.floor(R() * (inner.length || raised.length))]; }
      const i1 = idx(sxp, r.y0 + 1), i2 = idx(sxp, r.y0 + 2);
      if (!SOLID[i1]) { FH[i1] = 0.6; FT[i1] = 4; WT[i1] = 11; } if (r.y0 + 2 <= r.y1 && !SOLID[i2]) { FH[i2] = 0.3; FT[i2] = 4; WT[i2] = 11; }
      r.ledge = n > 2;
    }
    if (r.style === 'bloodpool') { // a sunken pool of living blood with bone islands to cross on
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = idx(x, y); if (!SOLID[i]) { FH[i] = -0.25; FT[i] = 6; } }
      const ni = 2 + ri(0, 2); for (let k = 0; k < ni; k++) { const x = ri(r.x0 + 1, r.x1 - 1), y = ri(r.y0 + 1, r.y1 - 1), i = idx(x, y); FH[i] = 0; FT[i] = 4; if (k === 0) { props.push({ type: 'candelabra', x: x + 0.5, y: y + 0.5, z: 0 }); } }
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 4.8, i: 0.95, c: [1.0, 0.18, 0.3] });
    }
    if (r.style === 'bonechapel') { // skull-column colonnade down both sides, raised red-marble altar dais at the far end
      for (let y = r.y0 + 1; y < r.y1; y += 2) for (const x of [r.x0 + 1, r.x1 - 1]) { if (w < 5) break; const i = idx(x, y); if (!SOLID[i]) { SOLID[i] = 1; FH[i] = 99; WT[i] = 9; } }
      for (let x = r.x0 + 2; x <= r.x1 - 2; x++) { const i = idx(x, r.y0); if (!SOLID[i] && !isOpen(x, r.y0 - 1)) { FH[i] = 0.3; FT[i] = 2; WT[i] = 11; } }
      props.push({ type: 'candelabra', x: r.x0 + 1.5, y: r.y0 + 0.5, z: 0 }); props.push({ type: 'candelabra', x: r.x1 - 0.5, y: r.y0 + 0.5, z: 0 });
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: r.y0 + 1, r: 4.2, i: 1.0, c: [1.0, 0.55, 0.3] }); L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: r.y1, r: 3.6, i: 0.7, c: VIO });
    }
    if (r.style === 'charnel') { // a bone-strewn pit around a burning brazier
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = idx(x, y); if (!SOLID[i]) { FH[i] = -0.2; FT[i] = 3; } }
      for (let k = 0; k < 7; k++) { const [x, y] = freeCell(r, 0); props.push({ type: 'bones', x, y, z: 0 }); }
      const bx = (r.x0 + r.x1) / 2 + 0.5, by = (r.y0 + r.y1) / 2 + 0.5; props.push({ type: 'brazier', x: bx, y: by, z: 0, green: false }); L.push({ x: bx, y: by, r: 5, i: 1.1, c: ORG, flicker: true });
    }
    if (r.style === 'fountain') { // a fountain of blood on a low plinth, in a puddle of it
      const fx = Math.floor((r.x0 + r.x1) / 2), fy = Math.floor((r.y0 + r.y1) / 2), i = idx(fx, fy);
      FH[i] = 0.36; FT[i] = 6; WT[i] = 11; props.push({ type: 'fountain', x: fx + 0.5, y: fy + 0.5, z: 0.36 });
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const j = idx(fx + ox, fy + oy); if (!SOLID[j] && FH[j] === 0 && room[j] === r.id) FT[j] = 6; }
      L.push({ x: fx + 0.5, y: fy + 0.5, r: 4.4, i: 1.0, c: [1.0, 0.16, 0.3] });
    }
    if (r.style === 'garden') { // grass and rows of clipped hedges (never on the edge ring, so the room always connects)
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = idx(x, y); if (!SOLID[i]) FT[i] = 3; }
      if (w >= 6 && h >= 5) for (let y = r.y0 + 2; y <= r.y1 - 2; y += 2) for (let x = r.x0 + 2; x <= r.x1 - 2; x++) { if ((x + y) % 4 === 0) continue; const i = idx(x, y); SOLID[i] = 1; FH[i] = 99; WT[i] = 5; }
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 4.5, i: 0.8, c: [0.4, 1.0, 0.5] });
    }
    if (r.style === 'statues') { // weeping angels on plinths
      for (const [px, py] of [[r.x0 + 1, r.y0 + 1], [r.x1 - 1, r.y0 + 1], [r.x0 + 1, r.y1 - 1], [r.x1 - 1, r.y1 - 1]]) { if (w < 5 || h < 5) break; const i = idx(px, py); if (SOLID[i] || R() < 0.15) continue; FH[i] = 0.42; FT[i] = 2; WT[i] = 11; props.push({ type: 'angel', x: px + 0.5, y: py + 0.5, z: 0.42 }); }
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 5, i: 0.85, c: [0.6, 0.55, 1.0] });
    }
    if (r.style === 'graveyard') {
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = idx(x, y); if (!SOLID[i] && R() < 0.7) FT[i] = 3; }
      for (let k = 0; k < 4 + ri(0, 3); k++) { const [x, y] = freeCell(r, 0); props.push({ type: 'grave', x, y: y - 0.3, z: 0 }); }
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 4.5, i: 0.8, c: [0.35, 1.0, 0.6] });
    }
    if (r.style === 'bellroom') { // a great bell hanging in the middle of the room
      const bx = (r.x0 + r.x1) / 2 + 0.5, by = (r.y0 + r.y1) / 2 + 0.5; props.push({ type: 'bell', x: bx, y: by, z: r.ch - 3.2, s: 1.5, a: R() * TAU });
      L.push({ x: bx, y: by, r: 4.8, i: 1.0, c: [1.0, 0.7, 0.3] });
    }
    if (r.style === 'brokenfloor') { // rotten planks fallen through: dark pits in the middle, a safe ring around the edge
      for (let y = r.y0 + 1; y < r.y1; y++) for (let x = r.x0 + 1; x < r.x1; x++) { const i = idx(x, y); if (!SOLID[i] && R() < 0.45) { FH[i] = -0.3; FT[i] = 3; } }
      L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 4.4, i: 0.9, c: [0.75, 0.35, 1.0] });
    }
    if (r.style === 'miasma') { L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: 4.6, i: 0.9, c: GRN }); }
    const nT = r.style === 'start' ? 2 : (w * h > 30 ? 3 : 2);
    for (let k = 0; k < nT; k++) wallTorch(r, r.style === 'miasma' && k === 0);
    if ((CY || (VX && VX.sky)) && r.kind !== 'secret') L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: Math.max(w, h) * 0.8 + 2, i: 0.3, c: [0.55, 0.55, 1.0] }); // moonlight
    if (R() < 0.35 && r.style !== 'ossuary' && r.style !== 'fountain') { const [x, y] = freeCell(r); props.push({ type: 'candelabra', x, y, z: 0 }); L.push({ x, y, r: 2.6, i: 0.6, c: [1.0, 0.7, 0.35] }); }
  }
  // corridor glow: dim green miasma pools along the way
  for (let i = 1; i < pr.length; i++) { const [ax, ay] = center(pr[i - 1]), [bx, by] = center(pr[i]); L.push({ x: (ax + bx) / 2 + 0.5, y: (ay + by) / 2 + 0.5, r: 3.6, i: 0.85, c: i % 2 ? GRN : VIO }); }
  // corridors stay bright and colourful: violet / green glow-pools every few cells along every passage
  { let n = 0; for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) { const i = idx(x, y); if (SOLID[i] || room[i] !== -2) continue; const hs = (x * 92821 ^ y * 68917) >>> 0; if (hs % 6 !== 0) continue; n++; L.push({ x: x + 0.5, y: y + 0.5, r: 3.2, i: 0.75, c: n % 2 ? VIO : GRN }); } }
  // rooms: a coloured fill light so no room reads as a black box
  for (const r of rooms) { if (r.style === 'secret') continue; L.push({ x: (r.x0 + r.x1) / 2 + 0.5, y: (r.y0 + r.y1) / 2 + 0.5, r: Math.max(r.x1 - r.x0, r.y1 - r.y0) * 0.7 + 2, i: 0.45, c: R() < 0.5 ? VIO : [0.35, 1.0, 0.7] }); }
  // arena: braziers, violet pool, web-strewn floor, egg sacs
  for (const [x, y] of [[13.5, 2], [36.5, 2], [13.5, 9.5], [36.5, 9.5]]) { props.push({ type: 'brazier', x, y, z: 0, green: y < 5 }); L.push({ x, y, r: 6, i: 1.15, c: y < 5 ? GRN : [1.0, 0.3, 0.35], flicker: true }); }
  L.push({ x: 25, y: 5.5, r: 7, i: 0.8, c: VIO }); L.push({ x: 25, y: 2, r: 5, i: 0.5, c: [0.4, 0.9, 0.7] });
  if (VX && VX.arena) VX.arena(CX, gx, AX0, AX1, AY0, AY1);
  else if (CY) { // a moonlit parade ground: flagstone cross, grass borders, angels along the north wall, graves
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { const i = idx(x, y); if (SOLID[i]) continue; if (x <= AX0 + 1 || x >= AX1 - 1 || y === AY0) FT[i] = 3; else if (Math.abs(x - 24.5) < 1.6 || Math.abs(y - 5.5) < 1.1) FT[i] = 1; }
    for (const ax of [19, 31]) { const i = idx(ax, AY0); FH[i] = 0.42; WT[i] = 11; FT[i] = 2; props.push({ type: 'angel', x: ax + 0.5, y: AY0 + 0.5, z: 0.42 }); }
    for (let k = 0; k < 6; k++) props.push({ type: 'grave', x: pick([13.2, 14.1, 35.9, 36.8]), y: rand(2.5, 9.5), z: 0 });
    L.push({ x: 25, y: 5.5, r: 9, i: 0.7, c: [0.6, 0.6, 1.0] });
  } else if (BF) { // the bell chamber: oak floor, three great bells high in the beams
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { const i = idx(x, y); if (SOLID[i]) continue; if ((x + y) % 5 === 0) FT[i] = 1; }
    for (const [x, y] of [[19.5, 3], [25.5, 2.6], [31.5, 3]]) props.push({ type: 'bell', x, y, z: 3.4, s: 2.0, a: 0 });
    L.push({ x: 25, y: 3, r: 7, i: 0.8, c: [1.0, 0.7, 0.35] });
  } else if (OSS) { // blood moats along the side walls of the Knight's vault, red-marble floor
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { const i = idx(x, y); if (SOLID[i]) continue; if (x <= AX0 + 1 || x >= AX1 - 1) { FH[i] = -0.25; FT[i] = 6; } else if ((x + y) % 2 === 0) FT[i] = 2; }
    for (let k = 0; k < 6; k++) { const x = pick([15, 19, 31, 35]) + 0.5, y = pick([1.5, 9.5]); if (y > 5 && Math.abs(x - gx - 0.5) < 2.5) continue; props.push({ type: 'candelabra', x, y, z: 0 }); }
    L.push({ x: 13, y: 5.5, r: 5, i: 0.9, c: [1.0, 0.15, 0.3] }); L.push({ x: 37, y: 5.5, r: 5, i: 0.9, c: [1.0, 0.15, 0.3] });
  } else {
  for (let k = 0; k < 6; k++) props.push({ type: 'eggs', x: pick([13.3, 14.2, 35.8, 36.6]), y: rand(2, 9.5), z: 0 });
  for (let k = 0; k < 8; k++) props.push({ type: 'web', x: rand(13, 37), y: pick([1.3, 10.6]), z: rand(3.2, 4.6) });
  }
  for (let k = 0; k < 6; k++) props.push({ type: 'bones', x: rand(14, 36), y: rand(2, 10), z: 0 });
  // the courtyard is open to the moon: low curtain walls (3.2), hedges (2.2), sky over everything; the renderer carries rays over the walls
  if (CY || (VX && VX.sky)) {
    for (let i = 0; i < N; i++) { SKY[i] = 1; CH[i] = 99; if (SOLID[i] && FH[i] > 6) FH[i] = (CY && WT[i] === 5) || (VX && VX.lowWT === WT[i]) ? 2.2 : 3.2; }
    for (const c of cracks) { c.ch = 99; c.from = 3.2; }
    LEVEL.wallH = 3.2;
  } else LEVEL.wallH = 99;
  // theme lights
  if (theme.light) for (const l of L) l.c = theme.light(l.c);
  if (theme.torch !== undefined) for (const p of props) if (p.type === 'torch' || p.type === 'brazier') p.green = theme.torch === 'green' ? true : theme.torch === 'orange' ? false : p.green;
  buildLightmap(L, theme.ambient || [0.34, 0.4, 0.36]);
  LEVEL.lights = L; LEVEL.props = props;
  // ---- wall dressing: perimeter textures by room style
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const i = idx(x, y); if (!SOLID[i] || WT[i] === 3 || WT[i] === 6 || WT[i] === 7 || cracks.some(c => c.x === x && c.y === y)) continue;
    let rr = -1; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = idx(x + dx, y + dy); if (!SOLID[j] && room[j] >= 0) { rr = room[j]; break; } }
    const hsh = (x * 73856093 ^ y * 19349663) >>> 0;
    if (CY || BF || VX) {
      const st5 = rr >= 0 && rr !== 99 ? rooms[rr].style : rr === 99 ? 'arena' : 'corr';
      if (VX) WT[i] = VX.wall(st5, hsh);
      else if (CY) WT[i] = st5 === 'arena' ? [10, 4, 9, 0, 1][hsh % 5] : st5 === 'garden' ? (hsh % 3 ? 5 : 0) : st5 === 'secret' ? 1 : st5 === 'corr' ? (hsh % 3 === 0 ? 1 : 0) : st5 === 'graveyard' ? [1, 0, 10, 0][hsh % 4] : [0, 1, 0, 9, 1, 0, 10, 0, 4, 1][hsh % 10];
      else WT[i] = st5 === 'arena' ? [10, 5, 4, 0, 1][hsh % 5] : st5 === 'secret' ? 1 : st5 === 'corr' ? (hsh % 4 === 0 ? 5 : 0) : st5 === 'bellroom' ? [1, 5, 0, 1][hsh % 4] : [0, 1, 4, 5, 0][hsh % 5];
      continue;
    }
    if (rr === 99) { WT[i] = hsh % 5 === 0 ? 4 : hsh % 5 === 1 ? 2 : hsh % 5 === 2 ? 10 : 1; continue; }
    if (rr < 0) { WT[i] = hsh % 3 === 0 ? 1 : 0; continue; }
    const st = rooms[rr].style;
    if (st === 'ossuary' || st === 'charnel') WT[i] = hsh % 3 === 0 ? 10 : 2;
    else if (st === 'bonechapel') WT[i] = hsh % 3 === 0 ? 9 : hsh % 3 === 1 ? 10 : 1;
    else if (st === 'bloodpool') WT[i] = hsh % 4 === 0 ? 2 : hsh % 2 ? 1 : 0;
    else if (st === 'tombs' || st === 'gallery') WT[i] = hsh % 3 === 0 ? 4 : hsh % 3 === 1 ? 0 : 1;
    else if (st === 'miasma') WT[i] = hsh % 2 ? 5 : 1;
    else if (st === 'secret') WT[i] = 9;
    else WT[i] = hsh % 4 === 0 ? 1 : hsh % 7 === 0 ? 4 : 0;
  }
  // ---- spawns / pickups / secrets
  const POOL = theme.pool || [['skeleton', 3], ['zombie', 2], ['azombie', 1.2], ['ghost', 1], ['bat', 1.2], ['spiderling', 2.5], ['fzombie', 1.2], ['imp', 0.6]];
  const wpick = () => { const tot = POOL.reduce((a, p) => a + p[1], 0); let r = R() * tot; for (const p of POOL) { r -= p[1]; if (r <= 0) return p[0]; } return POOL[0][0]; };
  for (const r of pr) {
    if (r.style === 'start') continue;
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    const n = 2 + ri(0, 2) + (w * h > 30 ? 1 : 0);
    for (let k = 0; k < n; k++) { const [x, y] = freeCell(r, 0); spawns.push([wpick(), x, y]); }
    if (R() < 0.55) { const [x, y] = freeCell(r); pickups.push({ type: R() < 0.7 ? 'vial' : 'mana', x, y }); }
    if (r.ledge) { const x = (r.x0 + r.x1) / 2 + 0.5; pickups.push({ type: R() < 0.5 ? 'rose' : 'mana', x, y: r.y0 + 0.5 }); }
  }
  if (elite) { for (let k = 0; k < 3; k++) { const [x, y] = freeCell(elite, 1); spawns.push([pick(VX ? VX.elite : CY ? ['werewolf', 'azombie', 'fzombie'] : BF ? ['gargoyle', 'werewolf', 'azombie'] : ['azombie', 'skeleton', 'fzombie', 'spiderling']), x, y, 'elite']); } }
  LEVEL.secrets = []; 
  const SNAMES = (VX ? VX.snames.slice() : CY ? ['The Gardener\'s Grave', 'The Moon Shrine', 'The Drowned Grotto', 'The Hedge Saint', 'The Widow\'s Bower', 'The Lantern Crypt', 'The Thorn Chapel'] : BF ? ['The Ringer\'s Loft', 'The Clock Hollow', 'The Rookery', 'The Bell-Founder\'s Cell', 'The Rope Store', 'The Silent Carillon', 'The Owl\'s Roost'] : OSS ? ['The Marrow Shrine', 'The Red Confessional', 'The Saint of Bones', 'The Drowned Reliquary', 'The Crimson Niche', 'The Bone Choir', 'The Flayed Chantry'] : ['The Bone Oratory', 'The Forgotten Ossuary', 'The Weeping Niche', 'The Silent Reliquary', 'The Hollow Saint', 'The Widow\'s Larder', 'The Gravedigger\'s Hole']).sort(() => R() - 0.5);
  const VNAMES = VX ? VX.vnames : CY ? ['The Moonlit Vault', 'The Hunter\'s Cache'] : BF ? ['The Bell Vault', 'The Founder\'s Strongroom'] : OSS ? ['The Blood Vault', 'The Tithe Vault'] : ['The Deep Vault', 'The Sexton\'s Armory'];
  let rew = 0;
  secrets.forEach((s, k) => {
    const cx = (s.x0 + s.x1) / 2 + 0.5, cy = (s.y0 + s.y1) / 2 + 0.5;
    LEVEL.secrets.push({ id: 'crypt' + k, name: s.vault ? pick(VNAMES) : SNAMES[k % SNAMES.length], box: [s.x0, s.y0, s.x1 + 1, s.y1 + 1], minZ: -9, found: false });
    if (s.vault) { // the deep vault: a weapon cache + a pile of shards
      pickups.push({ type: 'cache', x: cx, y: cy }); pickups.push({ type: 'shards', x: s.x0 + 0.5, y: s.y0 + 0.5, amt: 30 });
      if (s.x1 > s.x0) pickups.push({ type: 'rose', x: s.x1 + 0.5, y: s.y1 + 0.5 });
      L.push({ x: cx, y: cy, r: 3.6, i: 1.1, c: [1.0, 0.75, 0.3] });
    } else {
      const kind = rew++ % 3;
      if (kind === 0) pickups.push({ type: 'reliq', x: cx, y: cy });
      else if (kind === 1) pickups.push({ type: 'shards', x: cx, y: cy, amt: 20 });
      else pickups.push({ type: R() < 0.5 ? 'cache' : 'reliq', x: cx, y: cy });
      if (s.x1 > s.x0) pickups.push({ type: kind === 1 ? 'mana' : 'vial', x: s.x0 + 0.5, y: s.y1 + 0.5 });
    }
    const c = cracks[k];
    if (c.kind === 'cracked') signs.push({ x: c.x + 0.5, y: c.y + 0.5, r: 2.0, text: 'Cold air seeps from a cracked wall.', text2: '', shown: false });
    else if (c.kind === 'skulls') signs.push({ x: c.x + 0.5, y: c.y + 0.5, r: 1.4, text: VX ? VX.looseText : CY ? 'The ivy here hides loose stones...' : BF ? 'These bricks sound hollow...' : 'The skulls in this wall are loose...', text2: 'Strike them.', shown: false });
  });
  LEVEL.cracks = cracks;
  LEVEL.kind = 'crypt';
  LEVEL.doors = { gate: { x: gx, y: AY1 + 1, state: 'closed' } };
  LEVEL.hooks = []; LEVEL.shafts = [];
  // dusty light shafts down through ceiling grates in the arena
  LEVEL.shafts.push({ x: 25, y: 5.5, w: 2.4, z0: 0, z1: 5.6, c: [150, 90, 255], i: 0.28, slant: 0, ph: 1 });
  LEVEL.shafts.push({ x: 19, y: 4, w: 1.2, z0: 0, z1: 5.6, c: [90, 255, 150], i: 0.22, slant: 0.2, ph: 2 });
  LEVEL.shafts.push({ x: 31, y: 7, w: 1.2, z0: 0, z1: 5.6, c: [90, 255, 150], i: 0.22, slant: -0.2, ph: 3 });
  LEVEL.pickups = pickups; LEVEL.spawns = spawns; LEVEL.signs = signs;
  const [sx0, sy0] = center(pr[0]);
  const sdir = pr[1] ? Math.atan2(center(pr[1])[1] - sy0, center(pr[1])[0] - sx0) : -Math.PI / 2;
  LEVEL.start = { x: sx0 + 0.5, y: sy0 + 0.5, ang: Math.round(sdir / (Math.PI / 2)) * (Math.PI / 2) };
  LEVEL.checkpoints = [{ x: LEVEL.start.x, y: LEVEL.start.y, ang: LEVEL.start.ang }, { x: gx + 0.5, y: AY1 + 2.5, ang: -Math.PI / 2 }];
  LEVEL.boss = { x: 25, y: 4.5 };
  LEVEL.arena = { x0: AX0 + 0.3, x1: AX1 + 0.7, y0: AY0 + 0.3, y1: AY1 + 0.7 };
  LEVEL.eliteRoom = elite ? { box: [elite.x0, elite.y0, elite.x1 + 1, elite.y1 + 1], cx: (elite.x0 + elite.x1) / 2 + 0.5, cy: (elite.y0 + elite.y1) / 2 + 0.5, cleared: false } : null;
  LEVEL.rooms = rooms; LEVEL.path = pr.map(r => center(r).map(v => v + 0.5)); LEVEL.grid = null;
  LEVEL.gatePath = [gx + 0.5, AY1 + 2.5];
}
// crypt doors: the boss gate opens when you reach it and seals behind you
function cryptDoors(dt) {
  const g = LEVEL.doors.gate; const gi = g.y * MW + g.x;
  if (g.state === 'closed' && Math.hypot(P.x - g.x - 0.5, P.y - g.y - 1.5) < 1.3 && G.boss && G.boss.alive) {
    g.state = 'open'; animCell(g.x, g.y, 2.9, 0, 1.0); SFX.ev('door', 1, ['stone']); SFX.play('stone'); G.checkpoint = 1; toast('CHECKPOINT', (typeof BOSSREG !== 'undefined' && BOSSREG[LEVEL.bossType]) ? BOSSREG[LEVEL.bossType].gate : LEVEL.bossType === 'spider' ? 'Something vast stirs in the dark above.' : LEVEL.bossType === 'colossus' ? 'Bones rattle beyond the gate... thousands of them.' : LEVEL.bossType === 'alphawolf' ? 'Something big is pacing out there. Under the moon.' : LEVEL.bossType === 'matriarch' ? 'One of the statues up there... was not there before.' : 'The vault ahead reeks of old blood.', '#a0ffd0', 2.4);
  }
  if (g.state === 'open' && P.y < g.y - 0.4 && G.boss && G.boss.alive) {
    g.state = 'sealed'; animCell(g.x, g.y, 0, 2.9, 0.6, () => { SOLID[gi] = 1; FH[gi] = LEVEL.wallH || 99; });
    SFX.play('stone'); if (typeof BOSSREG !== 'undefined' && BOSSREG[G.boss.type]) BOSSREG[G.boss.type].intro(G.boss); else if (G.boss.type === 'spider') spiderIntro(); else if (G.boss.type === 'colossus') golemIntro(); else if (G.boss.type === 'alphawolf') alphaIntro(); else if (G.boss.type === 'matriarch') matriarchIntro(); else bossIntro();
  }
  // elite room spoils
  const er = LEVEL.eliteRoom;
  if (er && !er.cleared) {
    const left = G.enemies.filter(e => e.eliteRoom && e.alive).length; const any = G.enemies.some(e => e.eliteRoom);
    if (any && left === 0) { er.cleared = true; const p = mkPickup('spoils', er.cx, er.cy); p.z = 1.2; G.pickups.push(p); SFX.play('secret', 0.6); toast('ELITE SPOILS', 'A reliquary appears.', '#ffd848', 3); }
  }
}
