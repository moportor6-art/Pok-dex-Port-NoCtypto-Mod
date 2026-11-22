/* Mapas caminables: usan las colisiones originales de cada zona; el arte se dibuja por código. */
'use strict';
const WorldMap = (() => {
  const T = 16;                 // tamaño de cada casilla en pantalla (px CSS)
  const grids = {};
  let cv = null, ctx = null, zoneId = null, G = null, M = null;
  let px = 0, py = 0, fx = 0, fy = 0;          // posición en casillas (y animada)
  let path = [], moving = false, frame = 0, raf = 0, last = 0, follower = [];
  let onExit = null, onStep = null, onDoor = null, ignoreExit = null, ignoreDoor = null;
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; };

  function grid(id) {
    if (grids[id]) return grids[id];
    const m = window.GAME_MAPS[id]; if (!m) return null;
    const rows = m.g.map(r => { const out = []; const re = /(\d*)([.x])/g; let k; while ((k = re.exec(r))) { const n = k[1] ? +k[1] : 1; for (let i = 0; i < n; i++) out.push(k[2] === 'x' ? 1 : 0); } return out; });
    const g = {w: m.w, h: m.h, rows, m};
    if (D.zones[id] && D.zones[id].k === 'town') analyzeTown(id, g);
    return (grids[id] = g);
  }
  // Pueblos: separa los edificios (bloques grandes de pared), asigna Centro, Tienda, Gimnasio y Liga, y traza caminos
  function analyzeTown(id, g) {
    const {w, h, rows} = g, comp = new Int32Array(w * h).fill(-1), list = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (rows[y][x] !== 1 || comp[y * w + x] !== -1) continue;
      const c = {id: list.length, cells: [], x0: x, y0: y, x1: x, y1: y}, st = [y * w + x];
      comp[y * w + x] = c.id;
      while (st.length) {
        const k = st.pop(), cx = k % w, cy = (k / w) | 0;
        c.cells.push(k);
        c.x0 = Math.min(c.x0, cx); c.x1 = Math.max(c.x1, cx); c.y0 = Math.min(c.y0, cy); c.y1 = Math.max(c.y1, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || rows[ny][nx] !== 1 || comp[ny * w + nx] !== -1) continue;
          comp[ny * w + nx] = c.id; st.push(ny * w + nx);
        }
      }
      list.push(c);
    }
    const touchesEdge = c => c.x0 === 0 || c.y0 === 0 || c.x1 === w - 1 || c.y1 === h - 1;
    const bld = list.filter(c => c.cells.length >= 16 && c.x1 - c.x0 >= 3 && c.y1 - c.y0 >= 2 && !touchesEdge(c) && c.cells.length >= (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1) * 0.6);
    for (const b of bld) {
      b.bld = 1;
      // puerta: casilla libre justo debajo del edificio, lo más al centro posible
      const mid = (b.x0 + b.x1) / 2;
      let best = null;
      for (let x = b.x0; x <= b.x1; x++) if (b.y1 + 1 < h && rows[b.y1 + 1][x] === 0 && rows[b.y1][x] === 1 && (!best || Math.abs(x - mid) < Math.abs(best[0] - mid))) best = [x, b.y1 + 1];
      b.door = best;
    }
    const withDoor = bld.filter(b => b.door);
    const sp = m => Math.hypot((m.x0 + m.x1) / 2 - g.m.sp[0], (m.y0 + m.y1) / 2 - g.m.sp[1]);
    const roles = {};
    const take = (role, pick) => { const b = pick(withDoor.filter(x => !x.role)); if (b) { b.role = role; roles[role] = b; } };
    const big = arr => arr.sort((a, b) => b.cells.length - a.cells.length)[0];
    const near = arr => arr.sort((a, b) => sp(a) - sp(b))[0];
    const hasLeague = Object.values(LEAGUES).some(L => (L.zone || 'indigo_plateau') === id);
    if (hasLeague) take('league', big);
    if (GYMS[id]) take('gym', big);
    take('center', near);
    take('shop', near);
    // si el pueblo no tiene edificio para algo, se pone un puesto cerca de la entrada
    for (const role of ['center', 'shop']) {
      if (roles[role]) continue;
      let pick = null;
      for (let r = 3; r < 14 && !pick; r++) for (let dy = -r; dy <= r && !pick; dy++) for (let dx = -r; dx <= r && !pick; dx++) {
        const x = g.m.sp[0] + dx, y = g.m.sp[1] + dy;
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 || rows[y][x] === 1 || rows[y - 1][x] === 1) continue;
        if (g.m.ex.some(e => x >= e[1] - 1 && x <= e[1] + e[3] && y >= e[2] - 1 && y <= e[2] + e[4])) continue;
        if (Object.values(roles).some(o => Math.abs(o.door[0] - x) < 3 && Math.abs(o.door[1] - y) < 3)) continue;
        pick = [x, y];
      }
      if (pick) roles[role] = {kiosk: 1, door: pick, x0: pick[0], x1: pick[0], y0: pick[1] - 1, y1: pick[1] - 1};
    }
    g.comp = comp; g.bld = list; g.roles = roles;
    // caminos de arena entre la entrada, las salidas y las puertas
    const pts = [g.m.sp, ...g.m.ex.map(e => [e[1] + (e[3] >> 1), e[2] + (e[4] >> 1)]), ...withDoor.map(b => b.door)];
    const path = new Uint8Array(w * h);
    const bfs = (a, b) => {
      const prev = new Int32Array(w * h).fill(-1), q = [a[1] * w + a[0]]; prev[q[0]] = q[0];
      for (let qi = 0; qi < q.length; qi++) {
        const c = q[qi]; if (c === b[1] * w + b[0]) break;
        const cx = c % w, cy = (c / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = ny * w + nx;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || rows[ny][nx] === 1 || prev[n] !== -1) continue;
          prev[n] = c; q.push(n);
        }
      }
      let c = b[1] * w + b[0]; if (prev[c] === -1) return;
      while (c !== prev[c]) { path[c] = 1; if (c % w + 1 < w) path[c + 1] = path[c + 1] || 2; c = prev[c]; }
      path[c] = 1;
    };
    for (const p of pts.slice(1)) bfs([clamp(g.m.sp[0], 0, w - 1), clamp(g.m.sp[1], 0, h - 1)], [clamp(p[0], 0, w - 1), clamp(p[1], 0, h - 1)]);
    g.path = path;
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
  const ROLE = {center: {roof: '#e5484d', icon: '✚'}, shop: {roof: '#3d6fd6', icon: '🛒'}, gym: {roof: '#f39a2b', icon: '🏅'}, league: {roof: '#7a4fd6', icon: '🏆'}};
  function townTile(x, y, sx, sy) {
    const P = PAL.town;
    if (!solid(x, y)) {
      const pv = G.path[y * G.w + x];
      if (pv) { ctx.fillStyle = P.floor[hash(x, y) % 3]; ctx.fillRect(sx, sy, T, T); }
      else {
        ctx.fillStyle = ['#7cc85a', '#76c254', '#83cd60'][hash(x, y) % 3]; ctx.fillRect(sx, sy, T, T);
        const r = hash(x, y) % 29;
        if (r === 0) { ctx.fillStyle = '#ff6b8a'; ctx.fillRect(sx + 4, sy + 5, 3, 3); ctx.fillStyle = '#ffd34d'; ctx.fillRect(sx + 9, sy + 9, 3, 3); }
        else if (r === 1) { ctx.fillStyle = '#5aa844'; ctx.fillRect(sx + 3, sy + 8, 2, 5); ctx.fillRect(sx + 8, sy + 6, 2, 6); }
      }
      for (const b of G.bld) if (b.door && b.door[0] === x && b.door[1] === y) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(sx + 3, sy, T - 6, 4); }
      for (const [role, b] of Object.entries(G.roles)) if (b.kiosk && b.door[0] === x && b.door[1] === y) {
        ctx.fillStyle = ROLE[role].roof; ctx.fillRect(sx, sy - 6, T, 7);
        ctx.fillStyle = '#efe6d2'; ctx.fillRect(sx + 2, sy + 1, T - 4, T - 3);
        ctx.fillStyle = '#5a3d24'; ctx.fillRect(sx + 2, sy + T - 4, T - 4, 2);
      }
      return;
    }
    const c = G.bld[G.comp[y * G.w + x]];
    if (!c || !c.bld) {   // bloques pequeños: arbustos y vallas
      ctx.fillStyle = '#7cc85a'; ctx.fillRect(sx, sy, T, T);
      if (c && c.cells.length <= 6) { ctx.fillStyle = '#c9a06a'; ctx.fillRect(sx, sy + 6, T, 3); ctx.fillRect(sx + 2, sy + 3, 3, 11); ctx.fillRect(sx + 11, sy + 3, 3, 11); }
      else { ctx.fillStyle = '#2f7d3b'; ctx.beginPath(); ctx.arc(sx + 8, sy + 8, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#245f2d'; ctx.beginPath(); ctx.arc(sx + 9, sy + 10, 4, 0, 7); ctx.fill(); }
      return;
    }
    const roofRows = Math.max(1, Math.ceil((c.y1 - c.y0 + 1) * 0.5));
    const role = c.role && ROLE[c.role];
    const roof = role ? role.roof : P.roof[c.id % P.roof.length];
    if (y < c.y0 + roofRows) {
      ctx.fillStyle = roof; ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; if ((y - c.y0) % 2 === 0) ctx.fillRect(sx, sy + 2, T, 2);
      if (y === c.y0 + roofRows - 1) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(sx, sy + T - 3, T, 3); }
    } else {
      ctx.fillStyle = P.wall; ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(sx, sy + T - 1, T, 1);
      const isDoor = c.door && x === c.door[0] && y === c.y1;
      if (isDoor) { ctx.fillStyle = '#5a3d24'; ctx.fillRect(sx + 3, sy + 2, T - 6, T - 2); ctx.fillStyle = '#ffcb3d'; ctx.fillRect(sx + T - 6, sy + 8, 2, 2); }
      else if ((x - c.x0) % 3 === 1) { ctx.fillStyle = P.win; ctx.fillRect(sx + 3, sy + 4, 10, 7); ctx.fillStyle = '#fff'; ctx.fillRect(sx + 3, sy + 4, 10, 1); }
    }
  }
  function tile(x, y, sx, sy) {
    const P = PAL[KIND] || PAL.route;
    if (KIND === 'town' && G.bld) return townTile(x, y, sx, sy);
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
    // letreros de los edificios con función
    if (G.roles) for (const [role, b] of Object.entries(G.roles)) {
      const cx = ((b.x0 + b.x1 + 1) / 2) * T - camX, cy = b.y0 * T - camY;
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
      const label = ({center: 'Centro Pokémon', shop: 'Tienda', gym: 'Gimnasio', league: 'Liga Pokémon'})[role];
      const tw = ctx.measureText(label).width + 24;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(cx - tw / 2, cy - 2, tw, 18);
      ctx.fillStyle = '#fff'; ctx.fillText(ROLE[role].icon + ' ' + label, cx, cy + 12);
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
        const door = G.roles && Object.entries(G.roles).find(([, b]) => b.door && b.door[0] === px && b.door[1] === py);
        if (door && door[0] !== ignoreDoor) { ignoreDoor = door[0]; path = []; moving = false; draw(); onDoor && onDoor(door[0]); raf = 0; return; }
        if (!door) ignoreDoor = null;
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
    onExit = opts.onExit; onStep = opts.onStep; onDoor = opts.onDoor;
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
  return {mount, place, roles: id => { const g = grid(id); return g && g.roles ? Object.keys(g.roles) : []; }, door: (id, r) => { const g = grid(id); return g && g.roles && g.roles[r] ? g.roles[r].door : null; }, walkTo: (x, y) => { path = route(x, y); kick(); }, has: id => !!(window.GAME_MAPS && window.GAME_MAPS[id]), stop: () => { path = []; }};
})();
