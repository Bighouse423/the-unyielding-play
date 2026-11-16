// ===== synthesized WebAudio SFX + tiny gothic music =====
'use strict';
const SFX = {
  ctx: null, master: null, noise: null, muted: false, musicOn: true, mus: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    this.ctx = new C(); this.master = this.ctx.createGain(); this.master.gain.value = 0.6;
    // v2 mix: master -> glue compressor -> out, plus a cathedral reverb send
    const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    // M7d: sample-SFX bus + a music bus that ducks under big stingers (boss intros etc.)
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);
    this.musBus = this.ctx.createGain(); this.musBus.gain.value = 1; this.musBus.connect(this.master);
    try {
      const sr = this.ctx.sampleRate, L = Math.floor(sr * 2.2), ir = this.ctx.createBuffer(2, L, sr);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < L; i++) { const k = i / L; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 3.2) * (i < sr * 0.01 ? i / (sr * 0.01) : 1); } }
      const cv = this.ctx.createConvolver(); cv.buffer = ir; const send = this.ctx.createGain(); send.gain.value = 0.2;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
      this.master.connect(send); send.connect(hp); hp.connect(cv); cv.connect(comp);
    } catch (e) { }
    this.last = {};
    const len = this.ctx.sampleRate * 1.5; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    this.loadOverrides();
    this.startMusic();
    setInterval(() => { try { this.ambTick(); } catch (e) { } }, 100);
  },
  env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  nz(t, dur, type, f0, f1, q, peak, a = 0.003) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    f0 *= this.pv; f1 *= this.pv;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); fl.Q.value = q;
    const g = c.createGain(); this.env(g, t, a, dur, peak); s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + a + 0.05);
  },
  osc(t, dur, type, f0, f1, peak, a = 0.004, dest) {
    const c = this.ctx, o = c.createOscillator(); o.type = type; if (!dest) { f0 *= this.pv; f1 *= this.pv; } o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); this.env(g, t, a, dur, peak); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + a + 0.05); return o;
  },
  pv: 1,
  // ---- external audio overrides: audio/audio.json maps a sound name -> file in /audio (see audio/README.md).
  // Any name listed there (an SFX name below, or music_explore / music_boss) replaces the synth version.
  buf: {}, fileVol: {}, fileXF: {},
  loadOverrides() {
    const c = this.ctx;
    this.musPending = 1;   // M7c: no synth music while the song files are still loading
    fetch('audio/audio.json?v=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(map => {
      map = map || {};
      // M7c: a few shared songs -> many slots. "tracks" names each song once, "music" maps slots to a track name
      this.musicMap = Object.assign({}, map.music || {});
      const ents = Object.entries(map).filter(([n]) => !n.startsWith('_') && n !== 'tracks' && n !== 'music' && n !== 'sfx');
      for (const [tn, te] of Object.entries(map.tracks || {})) ents.push(['trk:' + tn, te]);
      const isMus = n => n.startsWith('trk:') || n.startsWith('music_');
      let pend = ents.filter(([n]) => isMus(n)).length; this.musPending = pend; const done = () => { this.musPending = Math.max(0, --pend); };
      for (const [name, ent] of ents) {
        const file = typeof ent === 'string' ? ent : ent && ent.file; if (!file) { if (isMus(name)) done(); continue; }
        if (ent && ent.vol != null) this.fileVol[name] = ent.vol;
        const files = [file].concat((ent && ent.alt) || []);
        const tryF = k => fetch('audio/' + files[k]).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(ab => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
          .then(b => { this.buf[name] = b; if (ent && ent.xf != null) this.fileXF[name] = ent.xf; if (isMus(name)) done(); })
          .catch(err => { if (k + 1 < files.length) return tryF(k + 1); if (isMus(name)) done(); console.warn('audio override failed: ' + name + ' (' + files.join(', ') + ')', err); });
        tryF(0);
      }
      this.loadSfx(map.sfx, map);
    }).catch(() => { this.musPending = 0; });
  },
  playBuf(name, vol) {
    const c = this.ctx, t = c.currentTime, m = this.sfxMeta[name] || {}, b = this.buf[name];
    // M7d voice limit: <= m.max (default 3) of one sound, <= 18 sample voices total; the oldest is faded out
    const V = this.voices; for (let i = V.length - 1; i >= 0; i--) if (V[i].end < t) V.splice(i, 1);
    let same = 0; for (const v of V) if (v.n === name) same++;
    const kill = v => { try { v.g.gain.setTargetAtTime(0, t, 0.015); v.s.stop(t + 0.08); } catch (e) { } V.splice(V.indexOf(v), 1); };
    if (same >= (m.max || 3)) kill(V.find(v => v.n === name));
    if (V.length >= 18) { const o = V.find(v => !v.pri) || V[0]; kill(o); }
    // slight pitch (+-6%) and volume (+-10%) variation on repeats, except fixed stingers
    let rate = this.pv; if (!m.fixed && rate === 1) rate = 0.94 + Math.random() * 0.12;
    if (!m.fixed) vol *= 0.9 + Math.random() * 0.2;
    const s = c.createBufferSource(); s.buffer = b; if (rate !== 1) s.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = vol * (this.fileVol[name] ?? 1); s.connect(g); g.connect(this.sfxBus || this.master); s.start();
    V.push({ n: name, s, g, end: t + b.duration / rate, pri: !!m.fixed });
    if (m.duck && this.musBus) { const mg = this.musBus.gain; mg.cancelScheduledValues(t); mg.setTargetAtTime(m.duck, t, 0.06); mg.setTargetAtTime(1, t + Math.min(b.duration, 3) * 0.8, 0.5); }
    return s;
  },
  // ---- M7d: ElevenLabs sample pack (audio.json "sfx" section). Missing / still-loading files keep the synth sound.
  sfxMeta: {}, voices: [], hushT: {}, cap: null,
  loadSfx(sec, top) {
    if (!sec || typeof sec !== 'object') return;
    const c = this.ctx, dir = sec._dir || 'sfx/';
    const ogg = (() => { try { return !!new Audio().canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) { return false; } })();
    if (sec._gain != null && this.sfxBus) this.sfxBus.gain.value = sec._gain;
    const q = [];
    for (const [name, raw] of Object.entries(sec)) {
      if (name.startsWith('_') || (top && top[name])) continue;   // a top-level override of the same name wins
      const ent = typeof raw === 'number' ? { vol: raw } : typeof raw === 'string' ? { file: raw } : (raw || {});
      const base = (ent.file || name).replace(/\.(mp3|ogg|wav|m4a)$/, ''), ext = ent.file && /\.(wav|m4a)$/.test(ent.file) ? [ent.file.slice(-3)] : ogg ? ['ogg', 'mp3'] : ['mp3', 'ogg'];
      const files = ext.map(x => dir + base + '.' + x);
      if (ent.vol != null) this.fileVol[name] = ent.vol;
      this.sfxMeta[name] = { fixed: !!ent.fixed, duck: ent.duck || 0, max: ent.max || 0, loop: !!ent.loop };
      q.push([name, files]);
    }
    let live = 0; const next = () => {
      while (live < 4 && q.length) {
        const [name, files] = q.shift(); live++;
        const tryF = k => fetch('audio/' + files[k]).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(ab => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
          .then(b => { this.buf[name] = b; })
          .catch(err => { if (k + 1 < files.length) return tryF(k + 1); console.warn('sfx file failed: ' + name, err); });
        tryF(0).finally(() => { live--; next(); });
      }
    };
    next();
  },
  since(n) { return this.ctx && this.last ? this.ctx.currentTime - (this.last[n] || -99) : 99; },
  has(name) { return !!(this.ctx && this.buf[name]); },
  // semantic event: plays the sample if it is loaded (and briefly hushes the generic synth sounds it replaces);
  // if not loaded it does nothing, so the original synth calls still play.
  ev(name, vol = 1, hush, hd = 0.15) {
    if (!this.ctx || this.muted || !this.buf[name]) return false;
    const t = this.ctx.currentTime;
    if (hush) for (const h of hush) this.hushT[h] = t + hd;
    if (t - (this.last[name] || -1) < 0.028) return true; this.last[name] = t;
    this.pv = 1; this.playBuf(name, vol); return true;
  },
  later(name, sec, vol = 1) { setTimeout(() => this.ev(name, vol), sec * 1000); },
  // weapon-specific sword swings (axe / greatsword / Void Reaver); others keep swing / swingH
  swing(step) {
    const w = typeof P !== 'undefined' && P.wpn && P.wpn.sword, n = { axe: 'swing_axe', great: 'swing_great', void: 'swing_void' }[w];
    if (n && this.ev(n, step === 2 ? 1 : 0.85)) return;
    this.play(step === 2 ? 'swingH' : 'swing');
  },
  FAM: { zombie: 'undead', fzombie: 'undead', azombie: 'undead', skeleton: 'undead', penitent: 'undead', werewolf: 'beast', hellhound: 'beast', spiderling: 'beast',
    bat: 'winged', gargoyle: 'winged', imp: 'winged', ghost: 'spirit', voidshade: 'spirit', wclone: 'spirit', acolyte: 'spirit', gladiator: 'armored', royalguard: 'armored' },
  PK: { rose: 'pickup_health', shards: 'pickup_shards', reliq: 'pickup_relic', spoils: 'pickup_relic', cache: 'pickup_weapon' },
  VOX: ['groan', 'screech', 'giggle', 'windup', 'rattle', 'ghost', 'howl', 'roar'],
  // run fn with generic sounds captured; onTrue may fire a sample event (whose hush then drops the captured generics)
  capRun(fn, onTrue) {
    if (this.cap || !this.ctx) { const r = fn(); if (r && onTrue) onTrue(); return r; }
    const q = this.cap = []; let r;
    try { r = fn(); if (r && onTrue) onTrue(); } finally { this.cap = null; for (const [n, v] of q) this.play(n, v); }
    return r;
  },
  // non-boss enemy update wrapper: growl on wake, attack cry on windup (per enemy family)
  enemyTick(e, dt, fn) {
    if (this.cap || !this.ctx) { fn(e, dt); return; }
    const pa = e.awake, ps = e.state, q = this._cq || (this._cq = []); q.length = 0; this.cap = q;
    try {
      fn(e, dt);
      const f = this.FAM[e.type];
      if (f && e.alive) {
        const v = typeof P !== 'undefined' ? Math.max(0.35, Math.min(1, 1.25 - Math.hypot(e.x - P.x, e.y - P.y) / 12)) : 1;
        if (!pa && e.awake) this.ev('growl_' + f, 0.75 * v, this.VOX);
        else if (ps !== 'windup' && e.state === 'windup') this.ev('attack_' + f, 0.65 * v, this.VOX);
      }
    } finally { this.cap = null; for (let i = 0; i < q.length; i++) this.play(q[i][0], q[i][1]); q.length = 0; }
  },
  // low-health heartbeat + Abyss ambience bed (100ms tick, independent of the music system)
  ambTick() {
    const c = this.ctx; if (!c || typeof G === 'undefined') return;
    const t = c.currentTime, playing = G.state === 'play' && !G.paused && !this.muted;
    if (playing && typeof P !== 'undefined' && P.hp > 0 && P.maxhp && P.hp < P.maxhp * 0.25 && this.buf.heartbeat) {
      const k = P.hp / (P.maxhp * 0.25), per = 0.6 + 0.45 * k;
      if (t >= (this.hbT || 0)) { this.hbT = t + per; this.ev('heartbeat', 0.75 + 0.25 * (1 - k)); }
    }
    const want = (G.state === 'play' || G.state === 'pick') && this.stageKey === 'abyss' && !this.muted && this.buf.abyss_ambience;
    const a = this.amb;
    if (want && !a) {
      const s = c.createBufferSource(), b = this.buf.abyss_ambience; s.buffer = b; s.loop = true;
      if (b.duration > 1) { s.loopStart = 0.03; s.loopEnd = b.duration - 0.03; }
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(this.fileVol.abyss_ambience ?? 0.35, t, 0.8);
      s.connect(g); g.connect(this.sfxBus || this.master); s.start(); this.amb = { s, g };
    } else if (!want && a) {
      a.g.gain.cancelScheduledValues(t); a.g.gain.setTargetAtTime(0, t, 0.4); const s = a.s; setTimeout(() => { try { s.stop(); } catch (e) { } }, 2500); this.amb = null;
    }
  },
  play(name, vol = 1) {
    if (!this.ctx || this.muted) return; const t = this.ctx.currentTime;
    if (this.cap) { this.cap.push([name, vol]); return; }
    if (this.hushT[name] > t) return;   // M7d: a sample event just replaced this generic sound
    // voice throttle: identical sounds closer than 28ms merge (stops gore spam from clipping)
    const lt = this.last[name] || -1; if (t - lt < 0.028) return; this.last[name] = t;
    if (this.buf[name]) { this.pv = 1; this.playBuf(name, vol); return; }
    const v = vol * (name === 'step' ? 0.9 : 1);
    this.pv = (name === 'hit' || name === 'heavy' || name === 'swing' || name === 'swingH' || name === 'step' || name === 'gib' || name === 'clink') ? 0.9 + Math.random() * 0.2 : 1;
    switch (name) {
      case 'swing': this.nz(t, 0.16, 'bandpass', 500, 2600, 1.2, 0.35 * v, 0.03); break;
      case 'swingH': this.nz(t, 0.24, 'bandpass', 300, 1800, 1.0, 0.45 * v, 0.05); break;
      case 'hit': this.nz(t, 0.1, 'lowpass', 2600, 300, 1, 0.75 * v, 0.001); this.osc(t, 0.12, 'sine', 170, 50, 0.75 * v, 0.001); this.nz(t + 0.02, 0.2, 'bandpass', 900, 220, 5, 0.4 * v); this.nz(t + 0.05, 0.16, 'bandpass', 2200, 700, 6, 0.18 * v); break;
      case 'heavy': this.nz(t, 0.22, 'lowpass', 1800, 120, 1, 1.0 * v); this.osc(t, 0.2, 'sine', 120, 35, 0.9 * v); this.nz(t + 0.04, 0.3, 'bandpass', 500, 160, 5, 0.5 * v); break;
      case 'gib': for (let i = 0; i < 3; i++) this.nz(t + i * 0.05, 0.2, 'bandpass', 900 - i * 200, 150, 3, 0.6 * v); this.osc(t, 0.3, 'sine', 90, 30, 0.8 * v); break;
      case 'whip': this.nz(t, 0.12, 'bandpass', 400, 1500, 1, 0.2 * v, 0.06); this.nz(t + 0.14, 0.05, 'highpass', 3000, 6000, 0.7, 0.9 * v, 0.001); this.osc(t + 0.14, 0.04, 'square', 2400, 900, 0.25 * v, 0.001); break;
      case 'block': [523, 781, 1172, 1660].forEach((f, i) => this.osc(t, 0.35 - i * 0.05, i % 2 ? 'square' : 'triangle', f, f * 0.98, 0.18 * v, 0.001)); this.nz(t, 0.05, 'highpass', 2000, 4000, 1, 0.5 * v, 0.001); break;
      case 'parry': [1320, 1980, 2640, 3300].forEach((f, i) => this.osc(t + i * 0.015, 0.7, 'triangle', f, f, 0.2 * v, 0.001)); this.nz(t, 0.06, 'highpass', 3000, 6000, 1, 0.6 * v, 0.001); break;
      case 'step': this.nz(t, 0.06, 'lowpass', 500 + Math.random() * 300, 100, 1, 0.22 * v, 0.002); break;
      case 'jump': this.nz(t, 0.1, 'bandpass', 300, 900, 1, 0.2 * v, 0.01); break;
      case 'land': this.nz(t, 0.12, 'lowpass', 400, 60, 1, 0.5 * v); this.osc(t, 0.1, 'sine', 90, 40, 0.4 * v); break;
      case 'dodge': this.nz(t, 0.22, 'bandpass', 2200, 300, 1.4, 0.4 * v, 0.015); this.nz(t + 0.18, 0.1, 'lowpass', 500, 80, 1, 0.35 * v, 0.002); this.osc(t + 0.18, 0.08, 'sine', 110, 50, 0.3 * v); break;
      case 'pistol': this.nz(t, 0.35, 'lowpass', 4000, 100, 0.8, 1.0 * v, 0.001); this.osc(t, 0.25, 'sine', 220, 40, 1.0 * v, 0.001); this.osc(t, 0.6, 'triangle', 1760, 1700, 0.08 * v, 0.01); break;
      case 'hurt': this.osc(t, 0.22, 'sawtooth', 170, 90, 0.35 * v); this.nz(t, 0.15, 'lowpass', 1200, 200, 1, 0.5 * v); break;
      case 'groan': { const o = this.osc(t, 0.7, 'sawtooth', 85 + Math.random() * 30, 60, 0.12 * v, 0.1); } this.nz(t, 0.6, 'bandpass', 500, 300, 6, 0.12 * v, 0.1); break;
      case 'screech': this.osc(t, 0.2, 'square', 2200, 3100, 0.07 * v, 0.01); this.osc(t + 0.05, 0.15, 'square', 2900, 2100, 0.06 * v, 0.01); break;
      case 'giggle': for (let i = 0; i < 4; i++) this.osc(t + i * 0.07, 0.06, 'square', 900 + i * 120, 700, 0.08 * v, 0.005); break;
      case 'ghost': this.osc(t, 1.0, 'sine', 330, 220, 0.12 * v, 0.2); this.osc(t, 1.0, 'sine', 335, 225, 0.1 * v, 0.2); break;
      case 'rattle': for (let i = 0; i < 6; i++) this.nz(t + i * 0.04, 0.03, 'highpass', 2500, 3000, 2, 0.25 * v, 0.001); break;
      case 'roar': this.osc(t, 0.9, 'sawtooth', 110, 55, 0.4 * v, 0.05); this.osc(t, 0.9, 'sawtooth', 113, 57, 0.3 * v, 0.05); this.nz(t, 0.9, 'lowpass', 900, 200, 1, 0.5 * v, 0.05); break;
      case 'windup': this.osc(t, 0.25, 'triangle', 300, 900, 0.1 * v, 0.02); break;
      case 'glint': this.osc(t, 0.25, 'sine', 2600, 3400, 0.15 * v, 0.002); break;
      case 'fire': this.nz(t, 0.4, 'bandpass', 600, 200, 1, 0.4 * v, 0.02); break;
      case 'pickup': this.bell(t, 659, 0.9, 0.16 * v); this.osc(t, 0.5, 'sine', 1318 * 1.004, 1318, 0.05 * v, 0.002); this.nz(t, 0.25, 'highpass', 6000, 9000, 1, 0.08 * v, 0.002); break;
      case 'secret': this.secret(t, v); break;
      case 'stone': this.nz(t, 1.2, 'lowpass', 300, 60, 1, 0.6 * v, 0.1); this.osc(t, 1.2, 'sawtooth', 50, 40, 0.1 * v, 0.1); break;
      case 'finisher': this.nz(t, 0.5, 'lowpass', 2500, 80, 1, 1.0 * v, 0.001); this.osc(t, 0.5, 'sine', 140, 30, 1.0 * v); for (let i = 0; i < 4; i++) this.nz(t + 0.05 + i * 0.06, 0.25, 'bandpass', 800, 200, 4, 0.5 * v); break;
      case 'latch': this.nz(t, 0.05, 'highpass', 3000, 5000, 1, 0.8 * v, 0.001); this.nz(t + 0.05, 0.5, 'bandpass', 600, 1600, 1, 0.3 * v, 0.1); break;
      case 'clink': this.osc(t, 0.2, 'triangle', 1900, 1850, 0.15 * v, 0.001); break;
      case 'howl': { const o = this.osc(t, 1.6, 'sawtooth', 260, 420, 0.16 * v, 0.25); o.frequency.setValueAtTime(260, t); o.frequency.linearRampToValueAtTime(560, t + 0.6); o.frequency.linearRampToValueAtTime(380, t + 1.6); this.osc(t, 1.6, 'sine', 520, 760, 0.1 * v, 0.3); this.nz(t, 1.4, 'bandpass', 900, 600, 4, 0.12 * v, 0.2); break; }
      case 'toll': this.bell(t, 110, 3.6, 0.32 * v); this.osc(t, 2.5, 'sine', 55, 54, 0.4 * v, 0.003); break;
      case 'wing': this.nz(t, 0.18, 'lowpass', 600, 120, 1, 0.45 * v, 0.04); this.nz(t + 0.08, 0.12, 'lowpass', 400, 90, 1, 0.3 * v, 0.03); break;
    }
  },
  bell(t, f, dur, peak) { // inharmonic church-bell partials (hum, prime, tierce, quint, nominal...)
    [[0.5, 1], [1, 0.8], [1.19, 0.55], [1.5, 0.35], [2, 0.5], [2.52, 0.25], [2.67, 0.2], [3.01, 0.15], [4.1, 0.08]]
      .forEach(([r, a], i) => this.osc(t, dur * (1.4 - i * 0.1), 'sine', f * r, f * r * 0.998, peak * a, 0.002));
  },
  secret(t, v) {
    // "The Reliquary opens": low bell toll, a minor-key choir/organ swell (D minor add9 -> Bb, held, not an arpeggio),
    // breathy formant vowels and a high shimmering tail into the cathedral reverb.
    const c = this.ctx;
    this.bell(t, 146.8, 3.2, 0.32 * v); this.osc(t, 2.4, 'sine', 73.4, 72.8, 0.25 * v, 0.01);
    const voice = (t0, dur, f, pk) => {
      for (const det of [-6, 0, 7]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + (Math.random() * 4 - 2);
        const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 4.6 + Math.random(); vg.gain.value = 6; vib.connect(vg); vg.connect(o.detune);
        const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 3;      // "ah" formants
        const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 4;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t0); lp.frequency.linearRampToValueAtTime(2400, t0 + dur * 0.5); lp.frequency.linearRampToValueAtTime(900, t0 + dur);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(pk, t0 + dur * 0.35); g.gain.setValueAtTime(pk, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(f1); o.connect(f2); f1.connect(lp); f2.connect(lp); lp.connect(g); g.connect(this.master);
        o.start(t0); vib.start(t0); o.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
      }
    };
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    [50, 57, 62, 65, 64].forEach(n => voice(t + 0.15, 2.0, mtof(n), 0.08 * v));          // Dm(add9) swell
    [46, 53, 58, 62, 65].forEach(n => voice(t + 1.55, 2.3, mtof(n), 0.072 * v));         // -> Bb, darker
    [38, 45].forEach(n => this.osc(t + 0.1, 3.6, 'triangle', mtof(n), mtof(n), 0.14 * v, 0.5)); // organ pedal
    for (let i = 0; i < 14; i++) { const f = mtof([86, 89, 93, 98][i % 4]) * (1 + (Math.random() - 0.5) * 0.004); this.osc(t + 0.9 + i * 0.17 + Math.random() * 0.05, 0.9, 'sine', f, f, 0.025 * v, 0.08); }
    this.nz(t + 0.6, 2.6, 'bandpass', 5000, 9000, 6, 0.05 * v, 0.6);                       // airy shimmer
  },
  // per-stage music hooks: music_boss_<bossKey> -> music_boss, music_stage_<stageKey> -> music_explore (see audio/README.md)
  stageKey: 'castle', bossKey: 'vknight',
  // M7c: slot lists, most specific first. Each slot resolves to a legacy "music_<slot>" entry or to the track that
  // audio.json "music" maps it to. The answer is a track (buffer) name, so a song shared by two slots keeps playing across the change.
  musicSlots(boss) {
    const sk = this.stageKey || 'castle', bk = this.bossKey || 'vknight';
    if (typeof G !== 'undefined' && G.state === 'title') return ['title', 'hub', 'default'];
    if (sk === 'hub') return ['hub', 'stage_hub', 'explore', 'default'];
    if (sk === 'victory') return ['victory', 'stage_victory', 'explore', 'default'];
    if (sk === 'abyss') return boss ? ['boss_abyss', 'abyss_boss', 'boss_' + bk, 'boss', 'stage_abyss', 'abyss', 'default'] : ['stage_abyss', 'abyss', 'explore', 'default'];
    return boss ? ['boss_' + bk, 'boss', 'stage_' + sk, 'explore', 'default'] : ['stage_' + sk, 'explore', 'default'];
  },
  musicWant(boss) {
    const M = this.musicMap || {};
    for (const sl of this.musicSlots(boss)) {
      if (this.buf['music_' + sl]) return 'music_' + sl;
      const t = M[sl]; if (t && this.buf['trk:' + t]) return 'trk:' + t;
    }
    return null;
  },
  fileMusic(boss) {
    const want = this.musicWant(boss); const c = this.ctx, now = c.currentTime;
    const vol = n => (this.muted || !this.musicOn ? 0 : (this.fileVol[n] ?? 0.5));
    const fadeOut = (fm, tc) => { if (!fm) return; fm.g.gain.cancelScheduledValues(now); fm.g.gain.setTargetAtTime(0, now, tc); for (const v of fm.v) setTimeout(() => { try { v.s.stop(); } catch (e) { } }, tc * 6000); };
    if (!want) { if (this.fm) { fadeOut(this.fm, 0.5); this.fm = null; } return false; }
    if (this.fm && this.fm.name === want) {
      const fm = this.fm; fm.g.gain.setTargetAtTime(vol(want), now, 0.25);
      // schedule the next pass XF seconds before this one ends: new voice ramps up while the old ramps down
      const cur = fm.v[fm.v.length - 1], dur = fm.buf.duration, XF = fm.xf;
      if (!cur.next && now > cur.t0 + dur - XF - 1.0) {
        const t1 = cur.t0 + dur - XF; cur.next = true;
        const nv = this.musVoice(fm, t1); const N = 16;
        const cu = new Float32Array(N), cd = new Float32Array(N); for (let i = 0; i < N; i++) { const x = i / (N - 1); cu[i] = Math.sin(x * Math.PI / 2); cd[i] = Math.cos(x * Math.PI / 2); }
        nv.g.gain.setValueCurveAtTime(cu, t1, XF); cur.g.gain.setValueCurveAtTime(cd, t1, XF);
        setTimeout(() => { try { cur.s.stop(); } catch (e) { } fm.v = fm.v.filter(v => v !== cur); }, (t1 - now + XF + 0.5) * 1000);
      }
      return true;
    }
    if (this.fm) fadeOut(this.fm, 0.6);
    const g = c.createGain(); g.gain.value = 0.0001; g.connect(this.musBus || this.master);
    const buf = this.buf[want], fm = { name: want, g, buf, v: [], xf: Math.min(this.fileXF[want] ?? 2.0, buf.duration / 4) };
    const v0 = this.musVoice(fm, now + 0.05); v0.g.gain.value = 1;
    g.gain.setTargetAtTime(vol(want), now, 0.7);   // ~2s fade-in on enter (hub / title)
    this.fm = fm; return true;
  },
  musVoice(fm, t0) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = fm.buf; const g = c.createGain(); g.gain.value = 0;
    s.connect(g); g.connect(fm.g); s.start(t0); const v = { s, g, t0, next: false }; fm.v.push(v); return v;
  },
  startMusic() {
    const c = this.ctx; const g = c.createGain(); g.gain.value = 0.06; g.connect(this.master); this.mus = { g, step: 0, next: c.currentTime + 0.2, boss: false };
    // synth fallback differs per stage: castle Am, crypt slow Dm, ossuary driving Em-phrygian, chapel hub calm
    const PROGS = { castle: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], crypt: [[50, 53, 57], [49, 52, 56], [46, 50, 53], [45, 49, 52]],
      ossuary: [[52, 55, 59], [53, 57, 60], [52, 55, 59], [50, 53, 57]], hub: [[53, 57, 60], [55, 58, 62], [50, 53, 57], [52, 55, 60]],
      courtyard: [[54, 57, 61], [52, 55, 59], [50, 54, 57], [49, 52, 56]], belfry: [[55, 58, 62], [53, 57, 60], [51, 55, 58], [50, 53, 57]],
      arena: [[52, 55, 58], [53, 56, 60], [52, 55, 58], [47, 50, 54]], necropolis: [[51, 54, 58], [49, 53, 56], [47, 51, 54], [46, 49, 53]],
      kennels: [[50, 53, 57], [51, 54, 57], [48, 51, 55], [46, 50, 53]], cathedral: [[55, 59, 62], [52, 55, 59], [53, 57, 60], [50, 54, 57]], throne: [[49, 52, 56], [48, 51, 55], [46, 49, 53], [44, 48, 51]], abyss: [[47, 50, 53], [47, 51, 54], [45, 48, 51], [44, 47, 52]], victory: [[55, 59, 62], [53, 57, 60], [50, 53, 57], [52, 55, 59]] };
    const SPD = { castle: 0.24, crypt: 0.3, ossuary: 0.2, hub: 0.34, courtyard: 0.26, belfry: 0.22, arena: 0.18, necropolis: 0.28, kennels: 0.17, cathedral: 0.32, throne: 0.26, abyss: 0.36, victory: 0.3 };
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const tick = () => {
      if (!this.mus) return; const m = this.mus;
      if (this.fileMusic(m.boss) || this.musPending > 0) { m.next = c.currentTime + 0.2; setTimeout(tick, 250); return; }
      if (m.next < c.currentTime - 0.5) m.next = c.currentTime + 0.05;
      while (m.next < c.currentTime + 0.3) {
        const prog = PROGS[this.stageKey] || PROGS.castle;
        const bar = Math.floor(m.step / 8) % 4, st = m.step % 8; const ch = prog[bar]; const sp = m.boss ? (this.bossKey === 'spider' ? 0.12 : 0.14) : (SPD[this.stageKey] || 0.24);
        this.pv = 1;
        if (!this.muted && this.musicOn) {
          if (st === 0) ch.forEach(n => this.osc(m.next, sp * 7.5, 'triangle', mtof(n - 12), mtof(n - 12), 0.35, 0.15, g));
          const arp = [0, 1, 2, 1, 2, 0, 1, 2][st]; this.osc(m.next, sp * 0.9, m.boss ? 'square' : 'triangle', mtof(ch[arp] + 12), mtof(ch[arp] + 12), m.boss ? 0.25 : 0.3, 0.005, g);
          if (m.boss && st % 2 === 0) this.nz(m.next, 0.08, 'lowpass', 300, 60, 1, 0.3, 0.002);
          if (st % 4 === 0) this.osc(m.next, 0.2, 'sine', mtof(ch[0] - 24), mtof(ch[0] - 24), 0.5, 0.005, g);
        }
        m.next += sp; m.step++;
      }
      setTimeout(tick, 100);
    };
    tick();
  },
};
