/* Arte original del mundo de Pokédex Idle: terreno por capas, objetos, casas y edificios.
   Cada zona se pinta una vez en un lienzo (1 px = 1 unidad del mundo) y luego solo se recorta. */
'use strict';
const WorldArt = (() => {
  const A = window.WORLD_ART || {frames: [], zones: {}};
  const TILE = 32;
  const imgs = {};
  const img = src => { if (!imgs[src]) { imgs[src] = new Image(); imgs[src].src = src; } return imgs[src]; };
  const ready = list => list.every(i => i.complete && i.naturalWidth);
  // filas del terreno (patrones de 16 variantes de 32 px)
  const ROW = {grass: 544, shade: 512, gravel: 576, dirt: 608, stone: 640, tall: 672, rock: 704, cave: 736};
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; };
  let cache = {id: null, cv: null, items: null};

  function fill(ctx, tileImg, row, W, H, seed) {
    for (let y = 0; y < H; y += TILE) for (let x = 0; x < W; x += TILE) {
      const v = hash(x / TILE + seed, y / TILE) % 16;
      ctx.drawImage(tileImg, v * TILE, row, TILE, TILE, x, y, TILE, TILE);
    }
  }
  // Máscara de una capa: formas en unidades de casilla (32 px), con borde irregular tipo pixel art
  function mask(shapes, W, H, k) {
    const S = 2, w = Math.ceil(W / S), h = Math.ceil(H / S);
    const m = document.createElement('canvas'); m.width = w; m.height = h;
    const c = m.getContext('2d'); c.fillStyle = c.strokeStyle = '#fff'; c.lineCap = c.lineJoin = 'round';
    const u = TILE / S;
    for (const s of shapes) {
      c.beginPath();
      if (s.kind === 'ellipse') { c.ellipse(s.cx * u, s.cy * u, Math.max(0.5, s.rx * u), Math.max(0.5, s.ry * u), 0, 0, 7); c.fill(); }
      else if (s.kind === 'rect') { c.fillRect(s.x * u, s.y * u, s.w * u, s.h * u); }
      else if (s.kind === 'path' && s.points && s.points.length) {
        c.lineWidth = Math.max(1, (s.half || 1) * 2 * u);
        s.points.forEach(([x, y], i) => i ? c.lineTo(x * u, y * u) : c.moveTo(x * u, y * u));
        c.stroke();
      }
    }
    // suaviza y vuelve a cortar con ruido: bordes orgánicos de 4 px
    const b = document.createElement('canvas'); b.width = w; b.height = h;
    const bc = b.getContext('2d'); bc.filter = 'blur(2px)'; bc.drawImage(m, 0, 0);
    const d = bc.getImageData(0, 0, w, h), px = d.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = px[i + 3] / 255, t = 0.35 + (hash(x + k * 977, y) % 1000) / 1000 * 0.3;
      px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = a > t ? 255 : 0;
    }
    bc.putImageData(d, 0, 0);
    return b;
  }
  function layer(base, tileImg, row, shapes, W, H, k, waterImg) {
    if (!shapes || !shapes.length) return;
    const L = document.createElement('canvas'); L.width = W; L.height = H;
    const c = L.getContext('2d');
    if (waterImg) { for (let y = 0; y < H; y += TILE) for (let x = 0; x < W; x += TILE) c.drawImage(waterImg, (hash(x, y) % 9) * TILE, 96, TILE, TILE, x, y, TILE, TILE); }
    else fill(c, tileImg, row, W, H, k * 13);
    c.globalCompositeOperation = 'destination-in';
    c.imageSmoothingEnabled = false;
    c.drawImage(mask(shapes, W, H, k), 0, 0, W, H);
    if (waterImg) {   // orilla clara alrededor del agua, como en el original
      const O = document.createElement('canvas'); O.width = W; O.height = H; const oc = O.getContext('2d');
      oc.imageSmoothingEnabled = false;
      const mk = mask(shapes, W, H, k);
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) oc.drawImage(mk, dx, dy, W, H);
      oc.globalCompositeOperation = 'source-in'; oc.fillStyle = '#e9f3f7'; oc.fillRect(0, 0, W, H);
      base.drawImage(O, 0, 0);
    }
    base.drawImage(L, 0, 0);
  }
  function sources(z) {
    const list = [img(`assets/world/${z.set}/terrain.png`), img(`assets/world/${z.set}/water.png`)];
    const sets = new Set(z.p.map(p => A.frames[p[0]][0]).concat(z.lm.map(l => A.frames[l[1]][0])));
    for (const s of sets) list.push(img(`assets/world/${s}/props.png`));
    for (const h of z.hs) list.push(img(`assets/world/houses/${h[0]}.png`));
    return list;
  }
  // Lienzo de la zona + lista de objetos (para dibujar delante del jugador lo que tape)
  function render(zid, solidFn, gridW, gridH) {
    const z = A.zones[zid]; if (!z) return null;
    if (cache.id === zid && cache.cv) return cache;
    const src = sources(z);
    if (!ready(src)) return {loading: src};
    const W = z.w, H = z.h, terr = img(`assets/world/${z.set}/terrain.png`), water = img(`assets/world/${z.set}/water.png`);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const cave = z.gen === 'cave' || z.gen === 'dungeon';
    if (cave) {
      fill(ctx, terr, ROW.rock, W, H, 1);
      layer(ctx, terr, ROW.cave, z.t.stone, W, H, 1);
      // lo caminable según las colisiones también es suelo
      const C = document.createElement('canvas'); C.width = W; C.height = H; const cc = C.getContext('2d');
      fill(cc, terr, ROW.cave, W, H, 7); cc.globalCompositeOperation = 'destination-in';
      cc.fillStyle = '#fff'; for (let y = 0; y < gridH; y++) for (let x = 0; x < gridW; x++) if (!solidFn(x, y)) cc.fillRect(x * 16, y * 16, 16, 16);
      ctx.drawImage(C, 0, 0);
    } else {
      fill(ctx, terr, ROW.grass, W, H, 1);
      layer(ctx, terr, ROW.tall, z.t.tall, W, H, 3);
      layer(ctx, terr, ROW.dirt, z.t.dirt, W, H, 4);
      layer(ctx, terr, ROW.gravel, z.t.gravel, W, H, 5);
      layer(ctx, terr, ROW.stone, z.t.stone, W, H, 6);
      layer(ctx, terr, 0, z.t.water, W, H, 7, water);
    }
    // gradación de color del original: luz cálida sobre el terreno (medido contra las vistas del sitio)
    const GRADE = {'meadow-v1': 'rgb(43,28,24)', 'johto-v1': 'rgb(85,46,25)', 'hoenn-v1': 'rgb(66,23,22)'};
    if (!cave) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = GRADE[z.set] || 'rgb(43,28,24)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    // objetos, casas y edificios ordenados por profundidad (pie del sprite)
    const items = [];
    for (const [fi, x, y, flip] of z.p) { const f = A.frames[fi]; items.push({im: img(`assets/world/${f[0]}/props.png`), sx: f[1], sy: f[2], w: f[3], h: f[4], x: x - f[3] / 2, y: y - f[4], foot: y, flip}); }
    for (const [file, x, y] of z.hs) { const im = img(`assets/world/houses/${file}.png`); items.push({im, sx: 0, sy: 0, w: im.naturalWidth, h: im.naturalHeight, x: x - im.naturalWidth / 2, y: y - im.naturalHeight, foot: y}); }
    for (const [, fi, x, y] of z.lm) { const f = A.frames[fi]; items.push({im: img(`assets/world/${f[0]}/props.png`), sx: f[1], sy: f[2], w: f[3], h: f[4], x: x - f[3] / 2, y: y - f[4], foot: y}); }
    items.sort((a, b) => a.foot - b.foot);
    for (const it of items) drawItem(ctx, it, 0, 0);
    cache = {id: zid, cv, items};
    return cache;
  }
  function drawItem(ctx, it, camX, camY) {
    if (it.flip) {
      ctx.save(); ctx.translate(Math.round(it.x - camX + it.w), Math.round(it.y - camY)); ctx.scale(-1, 1);
      ctx.drawImage(it.im, it.sx, it.sy, it.w, it.h, 0, 0, it.w, it.h); ctx.restore();
    } else ctx.drawImage(it.im, it.sx, it.sy, it.w, it.h, Math.round(it.x - camX), Math.round(it.y - camY), it.w, it.h);
  }
  // Lo que está delante del jugador (su pie más abajo) y cerca de él se vuelve a dibujar encima
  function front(ctx, playerFootY, camX, camY, W, H, near) {
    if (!cache.items) return;
    for (const it of cache.items) {
      if (it.foot <= playerFootY || it.foot - it.h > playerFootY) continue;
      if (it.x > near.x + 24 || it.x + it.w < near.x - 24 || it.x - camX > W || it.y - camY > H) continue;
      drawItem(ctx, it, camX, camY);
    }
  }
  // Edificios de servicio del original: posición de la puerta (en unidades del mundo)
  function landmarks(zid) { const z = A.zones[zid]; return z ? z.lm.map(([kind, , x, y]) => ({kind, x, y})) : []; }
  return {has: id => !!A.zones[id], render, front, landmarks};
})();
