/* Entrenadores del juego original: cuerpos de 32x56 con 9 cuadros (frente, espalda, lado y caminando)
   y retratos de 48x48. */
'use strict';
const Avatar = (() => {
  const KEYS = ['hero', 'heroine', 'breeder', 'trainer_ace_m', 'trainer_ace_f', 'trainer_youngster', 'trainer_lass', 'trainer_ranger_m',
    'trainer_ranger_f', 'trainer_swimmer', 'trainer_surfer', 'trainer_camper', 'trainer_picnicker', 'trainer_rocker', 'trainer_idol',
    'trainer_scholar', 'trainer_karate', 'trainer_mystic', 'trainer_biker', 'trainer_rancher'];
  const NAMES = {hero: 'Héroe', heroine: 'Heroína', breeder: 'Criadora', trainer_ace_m: 'As', trainer_ace_f: 'As (chica)', trainer_youngster: 'Joven',
    trainer_lass: 'Colegiala', trainer_ranger_m: 'Guardabosques', trainer_ranger_f: 'Guardabosques (chica)', trainer_swimmer: 'Nadadora',
    trainer_surfer: 'Surfista', trainer_camper: 'Campista', trainer_picnicker: 'Dominguera', trainer_rocker: 'Rockero', trainer_idol: 'Idol',
    trainer_scholar: 'Estudiosa', trainer_karate: 'Karateka', trainer_mystic: 'Mística', trainer_biker: 'Motorista', trainer_rancher: 'Granjero'};
  const CW = 32, CH = 56;
  // cuadros: abajo (0 quieto, 3-4 andando), arriba (1, 5-6), lado mirando a la izquierda (2, 7-8)
  const FR = {down: [0, 3, 4], up: [1, 5, 6], left: [2, 7, 8], right: [2, 7, 8]};
  const imgs = {};
  function key(k) {
    if (typeof k === 'number') return KEYS[((k % KEYS.length) + KEYS.length) % KEYS.length];
    if (KEYS.includes(k)) return k;
    let h = 0; for (const ch of String(k)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;   // líderes y rivales: un aspecto fijo por nombre
    return KEYS[2 + h % (KEYS.length - 2)];
  }
  function body(k) { const kk = key(k); if (!imgs[kk]) { imgs[kk] = new Image(); imgs[kk].src = `assets/trainers/bodies/${kk}.png`; } return imgs[kk]; }
  // Dibuja con el pie en (x, y) [centro abajo]; step 0 = quieto
  function drawBody(ctx, x, y, k, dir = 'down', step = 0, scale = 1, onload) {
    const im = body(k);
    if (!im.complete || !im.naturalWidth) { if (onload) im.onload = onload; return false; }
    const f = FR[dir] || FR.down, fi = step ? f[1 + (step % 2)] : f[0];
    const w = CW * scale, h = CH * scale;
    if (dir === 'right') {
      ctx.save(); ctx.translate(Math.round(x + w / 2), Math.round(y - h)); ctx.scale(-1, 1);
      ctx.drawImage(im, fi * CW, 0, CW, CH, 0, 0, w, h); ctx.restore();
    } else ctx.drawImage(im, fi * CW, 0, CW, CH, Math.round(x - w / 2), Math.round(y - h), w, h);
    return true;
  }
  // Retrato (para la barra superior, el selector y las presentaciones de combate)
  const url = k => `assets/trainers/portraits/${key(k)}.png`;
  // cuerpo de frente recortado (para mostrarlo en <img>, p. ej. al empezar un combate)
  const stand = {};
  function standUrl(k) {
    const kk = key(k); if (stand[kk]) return stand[kk];
    const im = body(kk);
    if (!im.complete || !im.naturalWidth) return url(kk);
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    c.getContext('2d').drawImage(im, 0, 0, CW, CH, 0, 0, CW, CH);
    return (stand[kk] = c.toDataURL());
  }
  KEYS.forEach(body);   // precarga
  const bodyUrl = k => `assets/trainers/bodies/${key(k)}.png`;
  // compatibilidad con el dibujo anterior (16x16 => cuerpo a escala)
  function draw(ctx, x, y, scale, k, frame = 0) { return drawBody(ctx, x + 8 * scale, y + 16 * scale, k, 'down', frame ? 1 : 0, scale / 2); }
  return {KEYS, NAMES, key, drawBody, draw, url, bodyUrl, standUrl, count: KEYS.length};
})();
