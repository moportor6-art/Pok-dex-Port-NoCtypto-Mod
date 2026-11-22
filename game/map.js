/* Mapas caminables: usan las colisiones originales de cada zona; el arte se dibuja por código. */
'use strict';
const WorldMap = (() => {
  const T = 16;                 // tamaño de cada casilla en pantalla (px CSS)
  const grids = {};
  let cv = null, ctx = null, zoneId = null, G = null, M = null;
  let px = 0, py = 0, fx = 0, fy = 0;          // posición en casillas (y animada)
  let path = [], moving = false, frame = 0, raf = 0, last = 0, follower = [];
  let onExit = null, onStep = null, ignoreExit = null;
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; };

  function grid(id) {
    if (grids[id]) return grids[id];
    const m = window.GAME_MAPS[id]; if (!m) return null;
    const rows = m.g.map(r => { const out = []; const re = /(\d*)([.x])/g; let k; while ((k = re.exec(r))) { const n = k[1] ? +k[1] : 1; for (let i = 0; i < n; i++) out.push(k[2] === 'x' ? 1 : 0); } return out; });
    return (grids[id] = {w: m.w, h: m.h, rows, m});
  }
  const solid = (x, y) => x < 0 || y < 0 || x >= G.w || y >= G.h || G.rows[y][x] === 1;
  const exitAt = (x, y) => G.m.ex.find(e => x >= e[1] && x < e[1] + e[3] && y >= e[2] && y < e[2] + e[4]);
  // hierba alta: manchas decorativas en rutas (también donde salen salvajes al caminar)
  const tall = (x, y) => KIND !== 'town' && !solid(x, y) && (hash(x >> 2, y >> 2) % 5 === 0) && (hash(x, y) % 4 !== 0);
  let KIND = 'route';

  const PAL = {
    route: {floor: ['#7cc85a', '#76c254', '#83cd60'], tall: '#4f9e3a', tall2: '#3f8a2e', solidA: '#2f7d3b', solidB: '#245f2d', trunk: '#6b4a2c'},
    forest: {floor: ['#5fae4a', '#59a845', '#66b450'], tall: '#3f8a2e', tall2: '#2f7424', solidA: '#1f5f2b', solidB: '#174822', trunk: '#5a3d24'},
    town: {floor: ['#d9c79a', '#d4c294', '#ddcca0'], tall: '#7cc85a', tall2: '#5aa844', roof: ['#d0443e', '#3d6fd6', '#2f9e5b', '#8a5bd0'], wall: '#efe6d2', win: '#7fb2e5'},
    cave: {floor: ['#9c7f5f', '#957859', '#a38666'], tall: '#7d6448', tall2: '#6b553c', solidA: '#5a5560', solidB: '#433f48', trunk: '#2e2b33'},
    water: {floor: ['#4a9fe0', '#4699da', '#50a6e6'], tall: '#3a86c8', tall2: '#7cc4f5', solidA: '#c9b48a', solidB: '#a8946c', trunk: '#7a6a50'},
    dungeon: {floor: ['#5b4f7a', '#564a74', '#615580'], tall: '#4a3f66', tall2: '#3c3254', solidA: '#2b2545', solidB: '#1f1a33', trunk: '#120f20'},
  };
  function tile(x, y, sx, sy) {
    const P = PAL[KIND] || PAL.route;
    if (!solid(x, y)) {
      ctx.fillStyle = P.floor[hash(x, y) % 3]; ctx.fillRect(sx, sy, T, T);
      if (KIND === 'water' && hash(x, y) % 7 === 0) { ctx.fillStyle = P.tall2; ctx.fillRect(sx + 3, sy + 6, 6, 2); }
      else if (tall(x, y)) {
        ctx.fillStyle = P.tall; ctx.fillRect(sx + 1, sy + 7, 14, 9);
        ctx.fillStyle = P.tall2; for (let i = 0; i < 4; i++) ctx.fillRect(sx + 2 + i * 4, sy + 4 + (i % 2) * 2, 2, 6);
      } else if (KIND !== 'town' && hash(x, y) % 23 === 0) { ctx.fillStyle = '#f4f0a0'; ctx.fillRect(sx + 6, sy + 6, 3, 3); }
      return;
    }
    if (KIND === 'town') {
      const roofCell = !solid(x, y - 1) || y === 0 || solid(x, y - 1) && !solid(x, y - 2) && hash(x >> 3, y >> 3) % 2;
      const roof = P.roof[hash(x >> 3, (y - (roofCell ? 0 : 1)) >> 3) % P.roof.length];
      if (!solid(x, y - 1) || !solid(x, y - 2)) { ctx.fillStyle = roof; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(sx, sy + T - 3, T, 3); }
      else { ctx.fillStyle = P.wall; ctx.fillRect(sx, sy, T, T); if (hash(x, y) % 3 === 0) { ctx.fillStyle = P.win; ctx.fillRect(sx + 4, sy + 4, 8, 7); } }
      return;
    }
    ctx.fillStyle = P.floor[0]; ctx.fillRect(sx, sy, T, T);
    if (KIND === 'cave' || KIND === 'dungeon' || KIND === 'water') {
      ctx.fillStyle = P.solidA; ctx.fillRect(sx + 1, sy + 2, 14, 13);
      ctx.fillStyle = P.solidB; ctx.fillRect(sx + 3, sy + 9, 10, 5);
    } else {
      ctx.fillStyle = P.trunk; ctx.fillRect(sx + 6, sy + 10, 4, 6);
      ctx.fillStyle = P.solidA; ctx.beginPath(); ctx.arc(sx + 8, sy + 7, 7, 0, 7); ctx.fill();
      ctx.fillStyle = P.solidB; ctx.beginPath(); ctx.arc(sx + 9, sy + 9, 4, 0, 7); ctx.fill();
    }
  }
  function draw() {
    if (!ctx || !G) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#11142a'; ctx.fillRect(0, 0, W, H);
    const camX = clamp(fx * T + T / 2 - W / 2, Math.min(0, G.w * T - W), Math.max(0, G.w * T - W));
    const camY = clamp(fy * T + T / 2 - H / 2, Math.min(0, G.h * T - H), Math.max(0, G.h * T - H));
    const x0 = Math.floor(camX / T), y0 = Math.floor(camY / T);
    for (let y = y0; y <= y0 + Math.ceil(H / T) + 1; y++) for (let x = x0; x <= x0 + Math.ceil(W / T) + 1; x++) {
      if (x < 0 || y < 0 || x >= G.w || y >= G.h) continue;
      tile(x, y, Math.round(x * T - camX), Math.round(y * T - camY));
    }
    // salidas
    const t = performance.now() / 300;
    for (const e of G.m.ex) {
      const sx = e[1] * T - camX, sy = e[2] * T - camY;
      ctx.fillStyle = `rgba(255,203,61,${0.25 + 0.15 * Math.sin(t)})`;
      ctx.fillRect(sx, sy, e[3] * T, e[4] * T);
      const z = D.zones[e[0]];
      if (z) {
        ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        const lx = clamp(sx + e[3] * T / 2, 50, W - 50), ly = clamp(sy + e[4] * T / 2 + 4, 14, H - 6);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; const tw = ctx.measureText(z.n).width + 10; ctx.fillRect(lx - tw / 2, ly - 11, tw, 15);
        ctx.fillStyle = '#ffcb3d'; ctx.fillText('→ ' + z.n, lx, ly);
      }
    }
    // Pokémon que te sigue
    const lead = S.team[0];
    if (lead && follower.length) {
      const f = follower[0];
      const img = dexCache(lead);
      if (img.complete) ctx.drawImage(img, f[0] * T - camX - 8, f[1] * T - camY - 14, 32, 32);
    }
    // jugador
    Avatar.draw(ctx, Math.round(fx * T - camX), Math.round(fy * T - camY - 6), 1, S.avatar ?? 0, moving ? (frame >> 3) % 2 : 0);
    // destino
    if (path.length) { const p = path[path.length - 1]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(p[0] * T - camX + 2, p[1] * T - camY + 2, T - 4, T - 4); }
  }
  const imgCache = {};
  function dexCache(m) { const k = m.s + (m.shiny ? 's' : ''); if (!imgCache[k]) { imgCache[k] = new Image(); imgCache[k].src = dexImg(m.s, m.shiny); imgCache[k].onload = draw; } return imgCache[k]; }
  // Camino más corto (BFS) hasta la casilla tocada
  function route(tx, ty) {
    if (solid(tx, ty)) {   // si tocas un obstáculo, busca la casilla libre más cercana
      let best = null, bd = 1e9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (!solid(tx + dx, ty + dy) && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = [tx + dx, ty + dy]; }
      if (!best) return [];
      [tx, ty] = best;
    }
    const W = G.w, prev = new Int32Array(W * G.h).fill(-1), q = [py * W + px];
    prev[py * W + px] = py * W + px;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], x = c % W, y = (c / W) | 0;
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * W + nx;
        if (solid(nx, ny) || prev[n] !== -1) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (prev[ty * W + tx] === -1) return [];
    const out = []; let c = ty * W + tx;
    while (c !== py * W + px) { out.push([c % W, (c / W) | 0]); c = prev[c]; }
    return out.reverse();
  }
  const SPEED = 7;   // casillas por segundo
  function loop(t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    frame++;
    if (path.length) {
      moving = true;
      const [tx, ty] = path[0];
      const dx = tx - fx, dy = ty - fy, d = Math.hypot(dx, dy), st = SPEED * dt;
      if (d <= st) {
        fx = tx; fy = ty; follower.unshift([px, py]); follower.length = Math.min(follower.length, 3);
        px = tx; py = ty; path.shift();
        S.pos = {zone: zoneId, x: px, y: py};
        const ex = exitAt(px, py);
        if (!ex) ignoreExit = null;
        if (ex && ex !== ignoreExit) { path = []; moving = false; draw(); onExit && onExit(ex); raf = 0; return; }
        if (onStep && onStep(px, py, tall(px, py))) { path = []; }
      } else { fx += dx / d * st; fy += dy / d * st; }
    } else moving = false;
    draw();
    raf = (path.length || moving) && cv && cv.isConnected ? requestAnimationFrame(loop) : 0;
    if (!raf) { moving = false; draw(); }
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
  function mount(canvas, zid, opts) {
    cv = canvas; ctx = cv.getContext('2d');
    onExit = opts.onExit; onStep = opts.onStep;
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * devicePixelRatio); cv.height = Math.round(r.height * devicePixelRatio);
    if (zid !== zoneId || !G) {
      zoneId = zid; G = grid(zid); path = []; follower = [];
      if (!G) return false;
      KIND = ({forest: 'forest', town: 'town', cave: 'cave', water: 'water', dungeon: 'dungeon'})[D.zones[zid].k] || 'route';
      const p = S.pos && S.pos.zone === zid ? [S.pos.x, S.pos.y] : G.m.sp;
      px = clamp(p[0], 0, G.w - 1); py = clamp(p[1], 0, G.h - 1);
      if (solid(px, py)) [px, py] = G.m.sp;
      fx = px; fy = py;
      ignoreExit = exitAt(px, py) || null;   // si apareces sobre una salida, no te devuelve al instante
    }
    cv.onpointerdown = e => {
      const b = cv.getBoundingClientRect(), W = cv.clientWidth, H = cv.clientHeight;
      const camX = clamp(fx * T + T / 2 - W / 2, Math.min(0, G.w * T - W), Math.max(0, G.w * T - W));
      const camY = clamp(fy * T + T / 2 - H / 2, Math.min(0, G.h * T - H), Math.max(0, G.h * T - H));
      const tx = Math.floor((e.clientX - b.left + camX) / T), ty = Math.floor((e.clientY - b.top + camY) / T);
      path = route(tx, ty);
      kick();
    };
    draw();
    return true;
  }
  // Coloca al jugador al llegar a otra zona
  function place(zid, x, y) { S.pos = {zone: zid, x, y}; zoneId = null; }
  return {mount, place, has: id => !!(window.GAME_MAPS && window.GAME_MAPS[id]), stop: () => { path = []; }};
})();
