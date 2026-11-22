/* Música y efectos de sonido: chiptune original generado con Web Audio (sin archivos de audio). */
'use strict';
const Sound = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let cur = null, timer = null, step = 0, nextT = 0;
  let musicOn = true, sfxOn = true, vol = 0.6;
  const N = {C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11};
  const freq = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * Math.pow(2, (N[m[1]] + 12 * (+m[2] + 1) - 69) / 12) : 0; };
  // Cada pista: tempo (pasos por minuto) y canales en texto: nota por paso, "-" = silencio, "~" = sostener
  const TRACKS = {
    route: {bpm: 264, lead: 'E5 G5 A5 G5 E5 D5 C5 D5 E5 ~ G5 C6 B5 A5 G5 ~ F5 A5 C6 A5 G5 E5 C5 E5 D5 E5 F5 D5 G5 ~ ~ - E5 G5 A5 G5 E5 D5 C5 D5 E5 ~ G5 C6 D6 C6 B5 ~ A5 C6 B5 A5 G5 F5 E5 D5 C5 ~ ~ ~ - - - -',
      bass: 'C3 ~ G3 ~ C3 ~ G3 ~ A2 ~ E3 ~ A2 ~ E3 ~ F2 ~ C3 ~ F2 ~ C3 ~ G2 ~ D3 ~ G2 ~ D3 ~ C3 ~ G3 ~ C3 ~ G3 ~ A2 ~ E3 ~ A2 ~ E3 ~ F2 ~ C3 ~ G2 ~ D3 ~ C3 ~ G2 ~ C3 ~ ~ ~', drum: 'k-h-s-h-k-h-s-h-'},
    town: {bpm: 200, lead: 'C5 ~ E5 G5 F5 ~ A5 ~ G5 ~ E5 ~ C5 ~ ~ - D5 ~ F5 A5 G5 ~ B4 ~ C5 ~ ~ ~ - - - - E5 ~ G5 C6 B5 ~ A5 ~ G5 ~ F5 ~ E5 ~ ~ - F5 ~ E5 D5 C5 ~ D5 ~ C5 ~ ~ ~ - - - -',
      bass: 'C3 ~ ~ ~ F2 ~ ~ ~ C3 ~ ~ ~ G2 ~ ~ ~ D3 ~ ~ ~ G2 ~ ~ ~ C3 ~ ~ ~ G2 ~ ~ ~ A2 ~ ~ ~ F2 ~ ~ ~ C3 ~ ~ ~ A2 ~ ~ ~ F2 ~ ~ ~ G2 ~ ~ ~ C3 ~ ~ ~ C3 ~ ~ ~', drum: ''},
    cave: {bpm: 168, lead: 'A4 ~ - E5 ~ - D5 C5 B4 ~ ~ - - - - - G4 ~ - D5 ~ - C5 B4 A4 ~ ~ - - - - - F4 ~ - C5 ~ - B4 A4 G#4 ~ ~ - B4 ~ E5 ~ A4 ~ ~ ~ ~ ~ ~ ~ - - - -',
      bass: 'A2 ~ ~ ~ ~ ~ ~ ~ E2 ~ ~ ~ ~ ~ ~ ~ G2 ~ ~ ~ ~ ~ ~ ~ D2 ~ ~ ~ ~ ~ ~ ~ F2 ~ ~ ~ ~ ~ ~ ~ E2 ~ ~ ~ ~ ~ ~ ~ A2 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~', drum: ''},
    battle: {bpm: 320, lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 G4 B4 D5 G5 F5 D5 B4 D5 E5 ~ G#5 ~ B5 ~ E6 ~ A5 ~ ~ G5 F5 ~ E5 ~ D5 ~ ~ E5 F5 ~ G5 ~ E5 ~ ~ ~ D5 ~ C5 ~ B4 ~ C5 D5 E5 ~ ~ ~ ~ ~',
      bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 G2 G3 G2 G3 G2 G3 G2 G3 E2 E3 E2 E3 E2 E3 E2 E3 F2 F3 F2 F3 F2 F3 F2 F3 C3 C4 C3 C4 C3 C4 C3 C4 D3 D4 D3 D4 E2 E3 E2 E3 A2 A3 A2 A3 A2 ~ ~ ~', drum: 'k-hhs-hhk-khs-hh'},
  };
  const JINGLES = {
    victory: {bpm: 300, lead: 'C5 E5 G5 C6 ~ G5 C6 ~ D6 ~ ~ ~ E6 ~ ~ ~ ~ ~', bass: 'C3 ~ ~ ~ ~ ~ G2 ~ ~ ~ ~ ~ C3 ~ ~ ~ ~ ~'},
    catch: {bpm: 360, lead: 'G5 C6 E6 G6 ~ ~ E6 G6 ~ ~ ~ ~', bass: 'C3 ~ ~ ~ ~ ~ G2 C3 ~ ~ ~ ~'},
    levelup: {bpm: 420, lead: 'C5 E5 G5 C6 ~ ~', bass: 'C3 ~ G2 C3 ~ ~'},
    champion: {bpm: 260, lead: 'G4 C5 E5 G5 ~ E5 G5 ~ A5 G5 F5 E5 D5 ~ ~ ~ E5 G5 C6 ~ B5 ~ C6 ~ ~ ~ ~ ~ ~ ~ ~ ~', bass: 'C3 ~ ~ ~ C3 ~ ~ ~ F2 ~ ~ ~ G2 ~ ~ ~ C3 ~ ~ ~ G2 ~ C3 ~ ~ ~ ~ ~ ~ ~ ~ ~'},
  };
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.35 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.5 : 0; sfxGain.connect(master);
    return true;
  }
  function tone(dest, type, f, t, dur, g = 0.2, slide = 0) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.008);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function noise(dest, t, dur, g, hp) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), a = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(a); a.connect(dest); s.start(t); s.stop(t + dur);
  }
  const parse = str => (str || '').split(/\s+/).filter(Boolean);
  function lenAt(arr, i) { let n = 1; while (arr[i + n] === '~') n++; return n; }
  function playStep(tr, i, t, dest) {
    const sp = 60 / tr.bpm;
    const L = tr._lead || (tr._lead = parse(tr.lead)), B = tr._bass || (tr._bass = parse(tr.bass));
    const li = i % L.length, bi = i % B.length;
    if (L[li] && L[li] !== '-' && L[li] !== '~') tone(dest, 'square', freq(L[li]), t, sp * lenAt(L, li) * 0.95, 0.11);
    if (B[bi] && B[bi] !== '-' && B[bi] !== '~') tone(dest, 'triangle', freq(B[bi]), t, sp * lenAt(B, bi) * 0.95, 0.22);
    if (tr.drum) {
      const d = tr.drum[i % tr.drum.length];
      if (d === 'k') tone(dest, 'sine', 140, t, 0.12, 0.35, 0.3);
      if (d === 's') noise(dest, t, 0.09, 0.25, 1500);
      if (d === 'h') noise(dest, t, 0.03, 0.08, 7000);
    }
  }
  function tick() {
    if (!cur || !ctx) return;
    const tr = TRACKS[cur], sp = 60 / tr.bpm;
    while (nextT < ctx.currentTime + 0.25) { playStep(tr, step++, nextT, musicGain); nextT += sp; }
  }
  function music(name) {
    if (name === cur) return;
    cur = name; step = 0;
    clearInterval(timer); timer = null;
    if (!name || !ctx) return;
    nextT = ctx.currentTime + 0.05;
    timer = setInterval(tick, 80);
  }
  function jingle(name) {
    if (!ctx || !sfxOn) return;
    const j = JINGLES[name]; if (!j) return;
    const n = parse(j.lead).length, sp = 60 / j.bpm, t0 = ctx.currentTime + 0.02;
    const old = musicGain.gain.value;
    if (musicOn) { musicGain.gain.setValueAtTime(old, t0); musicGain.gain.linearRampToValueAtTime(0.05, t0 + 0.05); musicGain.gain.linearRampToValueAtTime(0.35, t0 + n * sp + 0.3); }
    for (let i = 0; i < n; i++) playStep(j, i, t0 + i * sp, sfxGain);
  }
  function sfx(name) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'hit': noise(sfxGain, t, 0.12, 0.5, 600); tone(sfxGain, 'square', 220, t, 0.08, 0.15, 0.5); break;
      case 'crit': noise(sfxGain, t, 0.2, 0.7, 300); tone(sfxGain, 'sawtooth', 330, t, 0.15, 0.2, 0.3); break;
      case 'status': tone(sfxGain, 'square', 660, t, 0.08, 0.12); tone(sfxGain, 'square', 520, t + 0.08, 0.08, 0.12); tone(sfxGain, 'square', 440, t + 0.16, 0.12, 0.12); break;
      case 'up': [523, 659, 784].forEach((f, i) => tone(sfxGain, 'square', f, t + i * 0.06, 0.07, 0.1)); break;
      case 'down': [784, 659, 523].forEach((f, i) => tone(sfxGain, 'square', f, t + i * 0.06, 0.07, 0.1)); break;
      case 'heal': [523, 784, 1047, 1319].forEach((f, i) => tone(sfxGain, 'triangle', f, t + i * 0.07, 0.12, 0.25)); break;
      case 'ball': tone(sfxGain, 'square', 900, t, 0.06, 0.12, 0.5); tone(sfxGain, 'square', 600, t + 0.25, 0.05, 0.1); tone(sfxGain, 'square', 600, t + 0.6, 0.05, 0.1); break;
      case 'faint': tone(sfxGain, 'square', 600, t, 0.5, 0.15, 0.2); break;
      case 'appear': tone(sfxGain, 'square', 440, t, 0.05, 0.1); tone(sfxGain, 'square', 880, t + 0.05, 0.08, 0.1); break;
      case 'buy': tone(sfxGain, 'square', 1319, t, 0.06, 0.1); tone(sfxGain, 'square', 1760, t + 0.07, 0.1, 0.1); break;
      case 'step': noise(sfxGain, t, 0.02, 0.05, 3000); break;
      case 'door': tone(sfxGain, 'square', 330, t, 0.06, 0.1); tone(sfxGain, 'square', 494, t + 0.06, 0.06, 0.1); tone(sfxGain, 'square', 659, t + 0.12, 0.1, 0.1); break;
      default: if (JINGLES[name]) jingle(name);
    }
  }
  function settings(o) {
    if ('music' in o) musicOn = o.music;
    if ('sfx' in o) sfxOn = o.sfx;
    if ('vol' in o) vol = o.vol;
    if (!ctx) return;
    master.gain.value = vol;
    musicGain.gain.value = musicOn ? 0.35 : 0;
    sfxGain.gain.value = sfxOn ? 0.5 : 0;
  }
  // El audio solo puede empezar después de que el jugador toca la pantalla
  const unlock = () => { if (init()) { const c = cur; cur = null; music(c || Sound.want); } };
  ['pointerdown', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, unlock, {passive: true}));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  return {music: n => { Sound.want = n; if (ctx) music(n); }, sfx, jingle, settings, want: null};
})();
