/* Avatares de entrenador en pixel art, dibujados por código (diseño propio). */
'use strict';
const Avatar = (() => {
  // c = gorra, s = camiseta, h = pelo, k = piel, p = pantalón, z = zapatos, o = contorno, w = blanco
  const FRONT = [
    '....oooooooo....',
    '...occcccccco...',
    '..occcccwwccco..',
    '..occcccccccco..',
    '..oooooooooooo..',
    '..ohkkkkkkkkho..',
    '..ohkokkkkokho..',
    '..ohkkkkkkkkho..',
    '...okkkkkkkko...',
    '..ossokkkkosso..',
    '.osssssssssssso.',
    '.oksssssssssko..',
    '..okssssssskoo..',
    '...opppopppo....',
    '...opppopppo....',
    '...ozzo.ozzo....',
  ];
  const WALK = [
    null, null, null, null, null, null, null, null, null, null, null, null, null,
    '...opppopppo....',
    '...ozzoopppo....',
    '.........ozzo...',
  ];
  const PALETTES = [
    {c: '#e5484d', s: '#3d6fd6', h: '#3a2a1e', k: '#f3c9a0', p: '#2c2f45', z: '#d03b3b'},
    {c: '#2f9e5b', s: '#f0c330', h: '#6b3d1f', k: '#e8b98b', p: '#334', z: '#222'},
    {c: '#7a4fd6', s: '#ff8fb0', h: '#1c1c28', k: '#f6d2b0', p: '#3c3c5c', z: '#7a4fd6'},
    {c: '#f39a2b', s: '#2b2b33', h: '#f1d36b', k: '#f3c9a0', p: '#4a3b2c', z: '#f39a2b'},
    {c: '#1f8fbf', s: '#e9e9e9', h: '#8c3d2b', k: '#c98c62', p: '#1f3b5c', z: '#1f8fbf'},
    {c: '#222631', s: '#c43c3c', h: '#d8d8d8', k: '#f0c8a8', p: '#222631', z: '#555'},
    {c: '#e86fc0', s: '#6fd6c9', h: '#5a2d82', k: '#8d5a3b', p: '#2d2d3d', z: '#e86fc0'},
    {c: '#9a7b4f', s: '#5a7d3c', h: '#2a1a12', k: '#a8704a', p: '#3d3326', z: '#6b4a2c'},
  ];
  function pal(key) {
    if (typeof key === 'number') return PALETTES[((key % PALETTES.length) + PALETTES.length) % PALETTES.length];
    let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTES[h % PALETTES.length];
  }
  function draw(ctx, x, y, scale, key, frame = 0, flip = false) {
    const P = Object.assign({o: '#141625', w: '#ffffff'}, pal(key));
    for (let r = 0; r < 16; r++) {
      const row = (frame && WALK[r]) ? WALK[r] : FRONT[r];
      for (let c = 0; c < 16; c++) {
        const ch = row[flip ? 15 - c : c];
        if (ch === '.') continue;
        ctx.fillStyle = P[ch] || '#000';
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
  const cache = {};
  function url(key, size = 96) {
    const id = key + ':' + size;
    if (cache[id]) return cache[id];
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    draw(cv.getContext('2d'), 0, 0, size / 16, key);
    return (cache[id] = cv.toDataURL());
  }
  return {draw, url, count: PALETTES.length};
})();
