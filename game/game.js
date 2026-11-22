/* Pokédex Idle Offline — resurrección fan. Todo se calcula y se guarda en el dispositivo. */
'use strict';
const D = window.GAME_DATA;
const VERSION = '0.2';
const SAVE_KEY = 'pdxidle_offline_save';
const OFFLINE_CAP_MS = 8 * 3600e3;
const BATTLE_SEC = 8;          // duración media de un encuentro (para el progreso fuera de línea)
const SHINY_ODDS = 1 / 2048;
const STAT = ['PS', 'Ataque', 'Defensa', 'At. Esp.', 'Def. Esp.', 'Velocidad'];
const TYPE_ES = {normal:'Normal',fire:'Fuego',water:'Agua',grass:'Planta',electric:'Eléctrico',ice:'Hielo',fighting:'Lucha',poison:'Veneno',ground:'Tierra',flying:'Volador',psychic:'Psíquico',bug:'Bicho',rock:'Roca',ghost:'Fantasma',dragon:'Dragón',dark:'Siniestro',steel:'Acero',fairy:'Hada'};
const TYPE_COLOR = {normal:'#9a9a78',fire:'#e8742c',water:'#4f86e8',grass:'#5cb847',electric:'#e9c21b',ice:'#76cfcf',fighting:'#b4302a',poison:'#9443a0',ground:'#d4b25e',flying:'#9a87e8',psychic:'#f0507c',bug:'#9aaa1e',rock:'#b39a3a',ghost:'#6b569a',dragon:'#6a3af0',dark:'#6b5648',steel:'#a8a8c4',fairy:'#e59ab4'};
const NAT_ES = ['Fuerte','Huraña','Audaz','Firme','Pícara','Osada','Dócil','Plácida','Agitada','Floja','Miedosa','Activa','Seria','Alegre','Ingenua','Modesta','Afable','Mansa','Tímida','Alocada','Serena','Amable','Grosera','Cauta','Rara'];
// orden estándar de naturalezas: sube/baja sobre [Atq, Def, Vel, AtE, DfE]
const NAT_STAT = [1, 2, 5, 3, 4];
const ITEM_ES = {poke_ball:'Poké Ball',great_ball:'Super Ball',ultra_ball:'Ultra Ball',potion:'Poción',super_potion:'Superpoción',hyper_potion:'Hiperpoción',revive:'Revivir',repel:'Repelente',lure_incense:'Incienso Cebo',lucky_egg:'Huevo Suerte',link_cable:'Cable Link',fire_stone:'Piedra Fuego',water_stone:'Piedra Agua',thunder_stone:'Piedra Trueno',leaf_stone:'Piedra Hoja',moon_stone:'Piedra Lunar',sun_stone:'Piedra Solar',kings_rock:'Roca del Rey',metal_coat:'Revestimiento Metálico',dragon_scale:'Escama Dragón',up_grade:'Mejora'};
const POTION = {potion: 20, super_potion: 50, hyper_potion: 200};
const BOOST_ITEMS = {lure_incense: {key: 'lure', ms: 30 * 60e3, txt: 'Encuentros más rápidos'}, repel: {key: 'repel', ms: 30 * 60e3, txt: 'Solo salvajes fuertes'}, lucky_egg: {key: 'egg', ms: 30 * 60e3, txt: 'Experiencia x2'}};
const SHOP_LIST = ['poke_ball','great_ball','ultra_ball','potion','super_potion','hyper_potion','revive','repel','lure_incense','lucky_egg','fire_stone','water_stone','thunder_stone','leaf_stone','moon_stone','sun_stone','kings_rock','metal_coat','dragon_scale','up_grade','link_cable'];

// Gimnasios (equipos canónicos de Rojo/Azul y Oro/Plata)
const GYMS = {
  pewter_city:{l:'Brock',b:'Medalla Roca',t:[['geodude',12],['onix',14]]},
  cerulean_city:{l:'Misty',b:'Medalla Cascada',t:[['staryu',18],['starmie',21]]},
  vermilion_city:{l:'Lt. Surge',b:'Medalla Trueno',t:[['voltorb',21],['pikachu',18],['raichu',24]]},
  celadon_city:{l:'Erika',b:'Medalla Arcoíris',t:[['victreebel',29],['tangela',24],['vileplume',29]]},
  fuchsia_city:{l:'Koga',b:'Medalla Alma',t:[['koffing',37],['muk',39],['koffing',37],['weezing',43]]},
  saffron_city:{l:'Sabrina',b:'Medalla Pantano',t:[['kadabra',38],['mr_mime',37],['venomoth',38],['alakazam',43]]},
  cinnabar_island:{l:'Blaine',b:'Medalla Volcán',t:[['growlithe',42],['ponyta',40],['rapidash',42],['arcanine',47]]},
  viridian_city:{l:'Giovanni',b:'Medalla Tierra',t:[['rhyhorn',45],['dugtrio',42],['nidoqueen',44],['nidoking',45],['rhydon',50]]},
  violet_city:{l:'Pegaso',b:'Medalla Céfiro',t:[['pidgey',7],['pidgeotto',9]]},
  azalea_town:{l:'Antón',b:'Medalla Colmena',t:[['metapod',14],['kakuna',14],['scyther',16]]},
  goldenrod_city:{l:'Blanca',b:'Medalla Planicie',t:[['clefairy',18],['miltank',20]]},
  ecruteak_city:{l:'Morti',b:'Medalla Niebla',t:[['gastly',21],['haunter',21],['gengar',25],['haunter',23]]},
  cianwood_city:{l:'Aníbal',b:'Medalla Tormenta',t:[['primeape',27],['poliwrath',30]]},
  olivine_city:{l:'Yasmina',b:'Medalla Mineral',t:[['magnemite',30],['magnemite',30],['steelix',35]]},
  mahogany_town:{l:'Fredo',b:'Medalla Glaciar',t:[['seel',27],['dewgong',29],['piloswine',31]]},
  blackthorn_city:{l:'Débora',b:'Medalla Dragón',t:[['dragonair',37],['dragonair',37],['dragonair',37],['kingdra',40]]},
};

// Liga Pokémon en la Meseta Añil: 4 del Alto Mando + Campeón (equipos de Rojo/Azul y Oro/Plata)
const LEAGUES = {
  kanto: {n: 'Liga Kanto', need: 'kanto', prize: 12000, f: [
    {l: 'Lorelei', t: [['dewgong', 54], ['cloyster', 53], ['slowbro', 54], ['jynx', 56], ['lapras', 56]]},
    {l: 'Bruno', t: [['onix', 53], ['hitmonchan', 55], ['hitmonlee', 55], ['onix', 56], ['machamp', 58]]},
    {l: 'Agatha', t: [['gengar', 56], ['golbat', 56], ['haunter', 55], ['arbok', 58], ['gengar', 60]]},
    {l: 'Lance', t: [['gyarados', 58], ['dragonair', 56], ['dragonair', 56], ['aerodactyl', 60], ['dragonite', 62]]},
    {l: 'Campeón Azul', champ: 1, t: [['pidgeot', 61], ['alakazam', 59], ['rhydon', 61], ['arcanine', 61], ['exeggutor', 61], ['RIVAL', 65]]},
  ]},
  johto: {n: 'Liga Johto', need: 'johto', prize: 10000, f: [
    {l: 'Mento', t: [['xatu', 40], ['jynx', 41], ['exeggutor', 41], ['slowbro', 41], ['xatu', 42]]},
    {l: 'Koga', t: [['ariados', 40], ['venomoth', 41], ['forretress', 43], ['muk', 42], ['crobat', 44]]},
    {l: 'Bruno', t: [['hitmontop', 42], ['hitmonlee', 42], ['hitmonchan', 42], ['onix', 43], ['machamp', 46]]},
    {l: 'Karen', t: [['umbreon', 42], ['vileplume', 42], ['gengar', 45], ['murkrow', 44], ['houndoom', 47]]},
    {l: 'Campeón Lance', champ: 1, t: [['gyarados', 44], ['dragonite', 47], ['dragonite', 47], ['aerodactyl', 46], ['charizard', 46], ['dragonite', 50]]},
  ]},
};
const RIVAL_ACE = {bulbasaur: 'charizard', charmander: 'blastoise', squirtle: 'venusaur'};

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = n => '₽' + Math.floor(n).toLocaleString('es-MX');
const sp = id => D.species[id];
const itemName = id => ITEM_ES[id] || (D.items[id] ? D.items[id].n : id);
const itemImg = id => `assets/items/${id.replace(/_/g, '-')}.png`;
const dexImg = (s, shiny) => `assets/pokemon/${s}/${shiny ? 'dex-shiny-front' : 'dex-front'}.png`;
const typeTags = t => t.map(x => `<span class="tag" style="background:${TYPE_COLOR[x] || '#777'}">${TYPE_ES[x] || x}</span>`).join('');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function isDay() { const h = new Date().getHours(); return h >= 6 && h < 18; }

// ---------- Pokémon ----------
let UID = 1;
function expFor(s, lv) { return D.growth[sp(s).g][clamp(lv, 1, 100)]; }
function calcStats(m) {
  const b = sp(m.s).b, L = m.lv;
  const n = m.nat, up = Math.floor(n / 5), dn = n % 5;
  return b.map((base, i) => {
    const core = Math.floor((2 * base + m.iv[i]) * L / 100);
    if (i === 0) return core + L + 10;
    let v = core + 5;
    if (up !== dn) { if (NAT_STAT[up] === i) v = Math.floor(v * 1.1); if (NAT_STAT[dn] === i) v = Math.floor(v * 0.9); }
    return v;
  });
}
function maxHp(m) { return calcStats(m)[0]; }
function movesAt(s, lv) {
  const L = sp(s).L.filter(x => x[0] <= lv).map(x => x[1]);
  const uniq = [...new Set(L)];
  const pick = uniq.filter(id => D.moves[id]).slice(-4);
  const dmg = uniq.filter(id => D.moves[id] && D.moves[id][3] > 0);
  if (dmg.length && !pick.some(id => D.moves[id][3] > 0)) pick[0] = dmg[dmg.length - 1];  // siempre al menos un ataque que haga daño
  return pick.length ? pick : ['tackle'];
}
function makeMon(s, lv, opts = {}) {
  const m = {uid: UID++, s, lv, iv: opts.iv || [0,0,0,0,0,0].map(() => rnd(0, 31)), nat: opts.nat ?? rnd(0, 24),
    shiny: opts.shiny ?? Math.random() < SHINY_ODDS, moves: movesAt(s, lv), hp: 0};
  m.xp = expFor(s, lv);
  m.hp = maxHp(m);
  return m;
}
function monName(m) { return (m.nick || sp(m.s).n) + (m.shiny ? ' ★' : ''); }

// ---------- estado ----------
let S = null;
function newState() {
  return {v: 1, money: 3000, items: {poke_ball: 5, potion: 3}, team: [], box: [], seen: {}, caught: {}, zone: 'pallet_town',
    visited: {pallet_town: 1}, badges: {}, hunting: false, lastSeen: Date.now(), boosts: {}, ball: 'poke_ball', policy: 'new',
    autoPotion: true, cup: {day: '', round: 0, done: false, trophies: 0}, log: [], stats: {battles: 0, caught: 0, shinies: 0}, uid: 1, started: false};
}
function save() {
  if (!S) return;
  S.lastSeen = Date.now(); S.uid = UID;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* sin espacio */ }
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { S = Object.assign(newState(), JSON.parse(raw)); UID = S.uid || 1; return true; } } catch (e) {}
  S = newState(); return false;
}
function addLog(html) { S.log.unshift(html); S.log.length = Math.min(S.log.length, 60); }
function boostOn(k) { return (S.boosts[k] || 0) > Date.now(); }

// ---------- combate ----------
const STATUS_ES = {par: 'paralizado', slp: 'dormido', frz: 'congelado', brn: 'quemado', psn: 'envenenado', tox: 'gravemente envenenado'};
const STATUS_TAG = {par: 'PAR', slp: 'DOR', frz: 'CON', brn: 'QUE', psn: 'ENV', tox: 'ENV'};
const STAGE_ES = {2: 'Ataque', 3: 'Defensa', 4: 'At. Esp.', 5: 'Def. Esp.', 6: 'Velocidad', 7: 'Precisión', 8: 'Evasión'};
const IMMUNE = {par: ['electric'], brn: ['fire'], psn: ['poison', 'steel'], tox: ['poison', 'steel'], frz: ['ice']};
function eff(mtype, deftypes) { let f = 1; for (const t of deftypes) { const r = D.chart[mtype]; if (r && r[t] !== undefined) f *= r[t]; } return f; }
function vol(m) { return m._b || (m._b = {stg: [0, 0, 0, 0, 0, 0, 0, 0, 0], cnf: 0, slp: 0, tox: 0, fl: 0}); }
function endBattle(list) { for (const m of list) { delete m._b; m.st = null; } }
function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
// stats efectivos en combate: etapas + parálisis (velocidad) + quemadura (ataque)
function bstat(m, i) {
  let v = calcStats(m)[i] * stageMul(vol(m).stg[i + 1] || 0);
  if (i === 5 && m.st === 'par') v *= 0.5;
  if (i === 1 && m.st === 'brn') v *= 0.5;
  return v;
}
function moveData(id) { return D.moves[id] || ['Forcejeo', 'normal', 'physical', 50, 100, 1, 0]; }
function canAfflict(def, a) {
  if (!a) return false;
  if (a === 'cnf') return !vol(def).cnf;
  return !def.st && !(IMMUNE[a] || []).some(t => sp(def.s).t.includes(t));
}
function dmgScore(att, def, id) {
  const mv = moveData(id); if (mv[3] <= 0) return 0;
  const phys = mv[2] !== 'special';
  const ratio = phys ? bstat(att, 1) / bstat(def, 2) : bstat(att, 3) / bstat(def, 4);
  const hits = mv[7] && mv[7].h ? (mv[7].h[0] + mv[7].h[1]) / 2 : 1;
  return mv[3] * hits * ratio * (sp(att.s).t.includes(mv[1]) ? 1.5 : 1) * eff(mv[1], sp(def.s).t) * ((mv[4] || 100) / 100);
}
// La IA elige: daño esperado, pero también estados, mejoras y curación cuando conviene
function chooseMove(att, def, opts = {}) {
  let best = 'struggle', bv = -1, top = 0;
  for (const id of att.moves) top = Math.max(top, dmgScore(att, def, id));
  for (const id of att.moves) {
    const mv = D.moves[id]; if (!mv) continue;
    const fx = mv[7] || {};
    let v = dmgScore(att, def, id);
    if (mv[3] <= 0) {
      const myHp = att.hp / maxHp(att);
      if (fx.a && canAfflict(def, fx.a) && eff(mv[1], sp(def.s).t) > 0) v = top * (opts.catching && (fx.a === 'slp' || fx.a === 'par') ? 3 : fx.a === 'cnf' ? 0.5 : 0.9);
      else if (fx.hl && myHp < 0.45) v = top * 1.3;
      else if (fx.s && fx.self && myHp > 0.7 && fx.s.every(([st, c]) => (vol(att).stg[st] || 0) * Math.sign(c) < 2)) v = top * 0.7;
      else if (fx.s && !fx.self && fx.s.every(([st, c]) => (vol(def).stg[st] || 0) * Math.sign(c) < 2)) v = top * 0.35;
      else v = 0;
      v *= (mv[4] || 100) / 100;
    } else if (opts.catching && fx.a && canAfflict(def, fx.a)) v *= 1.1;
    v *= 0.85 + Math.random() * 0.3;
    if (v > bv) { bv = v; best = id; }
  }
  return bv > 0 ? best : 'struggle';
}
// ¿Puede actuar este turno? (sueño, congelación, parálisis, confusión, retroceso)
function canAct(m, who, F) {
  const b = vol(m);
  if (b.fl) { b.fl = 0; F.snap(`¡${who} retrocedió!`); return false; }
  if (m.st === 'slp') {
    if (--b.slp > 0) { F.snap(`${who} está dormido.`); return false; }
    m.st = null; F.snap(`¡${who} se despertó!`);
  }
  if (m.st === 'frz') {
    if (Math.random() < 0.2) { m.st = null; F.snap(`¡${who} se descongeló!`); } else { F.snap(`${who} está congelado.`); return false; }
  }
  if (m.st === 'par' && Math.random() < 0.25) { F.snap(`¡${who} está paralizado y no se puede mover!`); return false; }
  if (b.cnf) {
    if (--b.cnf <= 0) { b.cnf = 0; F.snap(`${who} ya no está confuso.`); }
    else if (Math.random() < 0.33) {
      const d = Math.max(1, Math.floor((Math.floor(2 * m.lv / 5 + 2) * 40 * bstat(m, 1) / bstat(m, 2)) / 50 + 2));
      m.hp = Math.max(0, m.hp - d);
      F.snap(`¡${who} está confuso y se hirió a sí mismo!`, {hit: m === F.me ? 'me' : 'foe'});
      return false;
    }
  }
  return true;
}
function applyStatus(def, a, dname, F) {
  if (!canAfflict(def, a)) return false;
  if (a === 'cnf') { vol(def).cnf = rnd(2, 5); F.snap(`¡${dname} se confundió!`); return true; }
  def.st = a;
  if (a === 'slp') vol(def).slp = rnd(2, 4);
  if (a === 'tox') vol(def).tox = 0;
  F.snap(`¡${dname} fue ${STATUS_ES[a]}!`);
  return true;
}
function applyStages(m, list, name, F) {
  for (const [st, c] of list) {
    const b = vol(m), old = b.stg[st] || 0, nv = clamp(old + c, -6, 6);
    if (nv === old) { F.snap(`¡El ${STAGE_ES[st] || 'stat'} de ${name} no puede ${c > 0 ? 'subir' : 'bajar'} más!`); continue; }
    b.stg[st] = nv;
    F.snap(`¡El ${STAGE_ES[st] || 'stat'} de ${name} ${c > 0 ? (c > 1 ? 'subió mucho' : 'subió') : (c < -1 ? 'bajó mucho' : 'bajó')}!`);
  }
}
// Ejecuta un movimiento completo con sus efectos
function useMove(att, def, id, names, side, F, opts = {}) {
  const C = D.combat, mv = moveData(id), fx = mv[7] || {};
  const [an, dn] = names;
  if (mv[4]) {
    const accStg = (vol(att).stg[7] || 0) - (vol(def).stg[8] || 0);
    const acc = mv[4] * (accStg >= 0 ? (3 + accStg) / 3 : 3 / (3 - accStg));
    if (Math.random() * 100 >= acc) { F.snap(`${an} usó ${mv[0]}, ¡pero falló!`); return; }
  }
  if (mv[3] <= 0) {
    F.snap(`${an} usó ${mv[0]}.`);
    let did = false;
    if (fx.a) did = applyStatus(def, fx.a, dn, F) || did;
    if (fx.s) { applyStages(fx.self ? att : def, fx.s, fx.self ? an : dn, F); did = true; }
    if (fx.hl) { const h = Math.floor(maxHp(att) * fx.hl / 100); att.hp = Math.min(maxHp(att), att.hp + h); F.snap(`${an} recuperó salud.`); did = true; }
    if (!did) F.snap('Pero no tuvo efecto.');
    return;
  }
  const e = eff(mv[1], sp(def.s).t);
  if (e === 0) { F.snap(`${an} usó ${mv[0]}. No afecta a ${dn}…`); return; }
  const hits = fx.h ? rnd(fx.h[0], fx.h[1]) : 1;
  const phys = mv[2] !== 'special';
  let total = 0, crit = false;
  for (let k = 0; k < hits && def.hp > 0; k++) {
    const c = Math.random() * 1e6 < C.criticalChancePpm;
    crit = crit || c;
    // los críticos ignoran las etapas desfavorables
    const A = c ? Math.max(calcStats(att)[phys ? 1 : 3], bstat(att, phys ? 1 : 3)) : bstat(att, phys ? 1 : 3);
    const Df = c ? Math.min(calcStats(def)[phys ? 2 : 4], bstat(def, phys ? 2 : 4)) : bstat(def, phys ? 2 : 4);
    let dmg = Math.floor(Math.floor(Math.floor(2 * att.lv / 5 + 2) * mv[3] * A / Df) / 50) + 2;
    dmg = dmg * (sp(att.s).t.includes(mv[1]) ? C.stabPermille / 1000 : 1) * e * (c ? C.criticalMultiplierPermille / 1000 : 1);
    dmg = Math.max(C.minDamageOnHit, Math.floor(dmg * rnd(C.damageRoll.minPermille, C.damageRoll.maxPermille) / 1000));
    if (opts.spare) dmg = Math.min(dmg, def.hp - 1); // el entrenador debilita sin derrotar
    def.hp = Math.max(0, def.hp - dmg);
    total += dmg;
  }
  let t = `${an} usó ${mv[0]}.`;
  if (e > 1) t += ' ¡Es muy eficaz!'; else if (e < 1) t += ' No es muy eficaz…';
  if (crit) t += ' ¡Golpe crítico!';
  if (hits > 1) t += ` ¡Golpeó ${hits} veces!`;
  F.snap(t, {hit: side});
  if (fx.dr && total > 0) {
    const h = Math.max(1, Math.floor(total * Math.abs(fx.dr) / 100));
    if (fx.dr > 0) { att.hp = Math.min(maxHp(att), att.hp + h); F.snap(`${dn} perdió energía.`); }
    else { att.hp = Math.max(0, att.hp - h); F.snap(`${an} se hizo daño con el retroceso.`); }
  }
  if (def.hp > 0) {
    if (fx.a && fx.ac && Math.random() * 100 < fx.ac) applyStatus(def, fx.a, dn, F);
    if (fx.fl && Math.random() * 100 < fx.fl) vol(def).fl = 1;
    if (fx.s && fx.sc && fx.sc < 100 && Math.random() * 100 < fx.sc) applyStages(fx.self ? att : def, fx.s, fx.self ? an : dn, F);
  }
  if (fx.s && fx.self && fx.sc >= 100 && att.hp > 0) applyStages(att, fx.s, an, F);  // p. ej. Fuerza Bruta, Sofoco
}
// Daño residual al final del turno
function residual(m, name, side, F) {
  if (m.hp <= 0) return;
  let d = 0, why = '';
  if (m.st === 'brn') { d = Math.floor(maxHp(m) / 16); why = 'la quemadura'; }
  if (m.st === 'psn') { d = Math.floor(maxHp(m) / 8); why = 'el veneno'; }
  if (m.st === 'tox') { vol(m).tox++; d = Math.floor(maxHp(m) * vol(m).tox / 16); why = 'el veneno'; }
  if (!d) return;
  m.hp = Math.max(0, m.hp - Math.max(1, d));
  F.snap(`${name} sufre por ${why}.`, {hit: side});
}
// Un turno completo entre dos Pokémon
function exchange(me, foe, F, opts = {}) {
  const names = {me: monName(me), foe: opts.foeName || monName(foe)};
  const mMove = chooseMove(me, foe, {catching: opts.catching});
  const fMove = chooseMove(foe, me);
  const mp = moveData(mMove)[6] || 0, fp = moveData(fMove)[6] || 0;
  const meFirst = mp !== fp ? mp > fp : bstat(me, 5) === bstat(foe, 5) ? Math.random() < 0.5 : bstat(me, 5) > bstat(foe, 5);
  const order = meFirst ? [[me, foe, mMove, 'me']] : [[foe, me, fMove, 'foe']];
  order.push(meFirst ? [foe, me, fMove, 'foe'] : [me, foe, mMove, 'me']);
  for (const [a, d, id, who] of order) {
    if (a.hp <= 0 || d.hp <= 0) continue;
    const an = names[who], dn = names[who === 'me' ? 'foe' : 'me'];
    if (!canAct(a, an, F)) continue;
    useMove(a, d, id, [an, dn], who === 'me' ? 'foe' : 'me', F, who === 'me' ? {spare: opts.spare && opts.spare()} : {});
  }
  residual(me, names.me, 'me', F);
  residual(foe, names.foe, 'foe', F);
}
function firstHealthy(team) { return team.findIndex(m => m.hp > 0); }
function catchChance(m, ball) {
  const mx = maxHp(m), rate = sp(m.s).c || 45;
  const bm = (D.items[ball] && D.items[ball].m || 1000) / 1000;
  const sb = m.st === 'slp' || m.st === 'frz' ? 2 : m.st ? 1.5 : 1;
  const a = ((3 * mx - 2 * m.hp) * rate * bm * sb) / (3 * mx);
  return clamp(a / 255, 0.01, 1);
}

// Recompensas de experiencia, niveles, movimientos y evoluciones
// Fórmula de experiencia escalada (Gen 5): entrenar contra Pokémon mucho más débiles rinde poco
function xpGain(foe, m, mult) {
  const L = foe.lv, Lp = m.lv;
  return (sp(foe.s).x * L / 5) * Math.pow((2 * L + 10) / (L + Lp + 10), 2.5) * mult + 1;
}
function giveXp(m, amount, F) {
  if (m.lv >= 100) return;
  m.xp += Math.floor(amount);
  while (m.lv < 100 && m.xp >= expFor(m.s, m.lv + 1)) {
    const oldMax = maxHp(m);
    m.lv++;
    m.hp += maxHp(m) - oldMax;
    const learned = sp(m.s).L.filter(x => x[0] === m.lv).map(x => x[1]);
    for (const mv of learned) {
      if (m.moves.includes(mv) || !D.moves[mv]) continue;
      if (m.moves.length < 4) { m.moves.push(mv); F && F.note(`${monName(m)} aprendió ${D.moves[mv][0]}.`); continue; }
      if (m.manual || D.moves[mv][3] <= 0) { F && F.note(`${monName(m)} puede aprender ${D.moves[mv][0]}. Cámbialo en Equipo → Ataques.`); continue; }
      // automático: reemplaza el ataque más débil (los de estado cuentan como débiles)
      let wi = 0; m.moves.forEach((id, i) => { if ((D.moves[id]?.[3] || 0) < (D.moves[m.moves[wi]]?.[3] || 0)) wi = i; });
      if ((D.moves[mv][3] || 0) <= (D.moves[m.moves[wi]]?.[3] || 0)) continue;
      const old = D.moves[m.moves[wi]]?.[0] || m.moves[wi];
      m.moves[wi] = mv;
      F && F.note(`${monName(m)} olvidó ${old} y aprendió ${D.moves[mv][0]}.`);
    }
    F && F.note(`<b>${monName(m)}</b> subió al nivel ${m.lv}.`);
    tryEvolve(m, null, F);
  }
}
function evoTarget(m, item) {
  const s = sp(m.s);
  for (const e of s.e) {
    if (item) { if (e.item === item) return e.to; continue; }
    if (!e.lv || m.lv < e.lv) continue;
    if (e.time === 'day' && !isDay()) continue;
    if (e.time === 'night' && isDay()) continue;
    if (e.stats !== undefined) { const st = calcStats(m); const r = Math.sign(st[1] - st[2]); if (r !== e.stats) continue; }
    return e.to;
  }
  return null;
}
function tryEvolve(m, item, F) {
  const to = evoTarget(m, item);
  if (!to) return false;
  const before = monName(m), ratio = m.hp / maxHp(m);
  m.s = to;
  m.hp = Math.max(1, Math.round(maxHp(m) * ratio));
  registerCaught(to, m.shiny);
  const msg = `¡${before} evolucionó a <b>${sp(to).n}</b>!`;
  if (F) F.note(msg); else addLog(msg);
  return true;
}
function registerSeen(s) { S.seen[s] = 1; }
function registerCaught(s, shiny) { S.seen[s] = 1; S.caught[s] = Math.max(S.caught[s] || 0, shiny ? 2 : 1); }

// Frames de animación: cada frame es una foto de lo que hay que mostrar
function Frames(enabled) {
  const f = {list: [], on: enabled, me: null, foe: null};
  f.snap = (text, fx = {}) => {
    if (!f.on) return;
    const pack = m => m && {s: m.s, shiny: m.shiny, name: monName(m), lv: m.lv, hp: m.hp, max: maxHp(m), st: m.st,
      xp: m.lv >= 100 ? 1 : (m.xp - expFor(m.s, m.lv)) / Math.max(1, expFor(m.s, m.lv + 1) - expFor(m.s, m.lv))};
    f.list.push({me: pack(f.me), foe: pack(f.foe), text, fx});
  };
  f.note = text => { addLog(text); f.snap(text); };
  return f;
}

function wildFor(zoneId) {
  const z = D.zones[zoneId];
  if (!z || !z.h || !z.E.length) return null;
  let pool = z.E;
  if (boostOn('repel')) {
    const lead = S.team[firstHealthy(S.team)];
    const strong = pool.filter(e => e[3] >= (lead ? lead.lv - 3 : 0));
    if (strong.length) pool = strong;
  }
  const tot = pool.reduce((a, e) => a + e[1], 0);
  let r = Math.random() * tot, pick = pool[0];
  for (const e of pool) { r -= e[1]; if (r <= 0) { pick = e; break; } }
  return makeMon(pick[0], rnd(pick[2], pick[3]));
}
function shouldCatch(w) {
  if (w.shiny) return S.policy !== 'none';
  if (S.policy === 'all') return true;
  if (S.policy === 'new') return !S.caught[w.s];
  return false;
}
function pickBall(w) {
  if (w.shiny) for (const b of ['ultra_ball', 'great_ball', 'poke_ball', S.ball]) if (S.items[b] > 0) return b;
  if (S.items[S.ball] > 0) return S.ball;
  for (const b of ['poke_ball', 'great_ball', 'ultra_ball']) if (S.items[b] > 0) return b;
  return null;
}
function autoPotion(m) {
  if (!S.autoPotion || m.hp <= 0) return null;
  const mx = maxHp(m);
  if (m.hp / mx > 0.35) return null;
  const need = mx - m.hp;
  const order = Object.keys(POTION).sort((a, b) => POTION[a] - POTION[b]);
  const p = order.find(k => S.items[k] > 0 && POTION[k] >= need * 0.6) || [...order].reverse().find(k => S.items[k] > 0);
  if (!p) return null;
  S.items[p]--; m.hp = Math.min(mx, m.hp + POTION[p]);
  return p;
}

// Un encuentro salvaje completo
function wildEncounter(F) {
  const z = D.zones[S.zone];
  const w = wildFor(S.zone);
  if (!w) return {stop: 'Aquí no hay Pokémon salvajes.'};
  let ai = firstHealthy(S.team);
  if (ai < 0) return {stop: 'Tu equipo está debilitado.'};
  registerSeen(w.s);
  S.stats.battles++;
  F.me = S.team[ai]; F.foe = w;
  F.snap(`¡Un ${monName(w)} salvaje (Nv. ${w.lv}) apareció!${w.shiny ? ' ✨' : ''}`, {appear: 1});
  const wantCatch = shouldCatch(w);
  let ballsThrown = 0, caught = false;
  for (let turn = 0; turn < 60; turn++) {
    const me = S.team[ai];
    F.me = me;
    // ¿lanzar Pokébola?
    if (wantCatch && w.hp > 0 && (w.hp <= maxHp(w) * 0.5 || turn >= 3 || w.shiny || w.st === 'slp' || w.st === 'par') && ballsThrown < 3) {
      const ball = pickBall(w);
      if (ball) {
        S.items[ball]--; ballsThrown++;
        const p = catchChance(w, ball);
        if (Math.random() < p) {
          caught = true;
          F.snap(`¡Lanzas una ${itemName(ball)}... y ${monName(w)} fue capturado!`, {ball: 1, caught: 1});
          break;
        }
        F.snap(`¡Lanzas una ${itemName(ball)}... ${monName(w)} se escapó!`, {ball: 1});
      }
    }
    exchange(me, w, F, {foeName: `${monName(w)} salvaje`, catching: wantCatch && !!pickBall(w), spare: () => wantCatch && pickBall(w) && ballsThrown < 3});
    if (w.hp <= 0) break;
    if (me.hp <= 0) {
      F.snap(`¡${monName(me)} se debilitó!`, {faint: 'me'});
      ai = firstHealthy(S.team);
      if (ai < 0) break;
      F.me = S.team[ai];
      F.snap(`¡Adelante, ${monName(S.team[ai])}!`, {appear: 'me'});
    }
  }
  endBattle([...S.team, w]);
  const res = {w, caught, money: 0};
  if (caught) {
    registerCaught(w.s, w.shiny);
    S.stats.caught++; if (w.shiny) S.stats.shinies++;
    w.hp = maxHp(w);
    if (S.team.length < 6) S.team.push(w); else S.box.push(w);
    addLog(`Capturaste <b>${monName(w)}</b> Nv. ${w.lv}${S.team.includes(w) ? '' : ' (enviado a la caja)'}.`);
  }
  if (w.hp <= 0 || caught) {
    const mult = boostOn('egg') ? 2 : 1;
    const lead = S.team[ai >= 0 ? ai : 0];
    if (!caught) F.snap(`¡${monName(w)} salvaje se debilitó!`, {faint: 'foe'});
    const money = Math.floor(w.lv * 9 + rnd(0, w.lv * 3));
    S.money += money; res.money = money;
    for (const m of S.team) if (m.hp > 0) giveXp(m, xpGain(w, m, m === lead ? mult : mult * 0.5), F);
    F.snap(`Ganaste ${fmt(money)}.`);
  }
  if (firstHealthy(S.team) < 0) {
    const lost = Math.floor(S.money * 0.05);
    S.money -= lost; healAll();
    S.wipes = (S.wipes || 0) + 1;
    let msg = `Tu equipo se debilitó. Perdiste ${fmt(lost)} y volviste al Centro Pokémon.`;
    if (S.wipes >= 3) { S.hunting = false; S.wipes = 0; msg += ' La caza se detuvo: esta zona es muy difícil, prueba una más fácil.'; res.whiteout = true; }
    addLog(msg); F.snap(msg);
  } else {
    if (w.hp <= 0 || caught) S.wipes = 0;
    // descanso entre encuentros: todos recuperan un poco de PS
    for (const m of S.team) m.hp = Math.min(maxHp(m), m.hp + Math.ceil(maxHp(m) * 0.12));
    for (const m of S.team) { const p = autoPotion(m); if (p) F.on && F.note(`Usaste ${itemName(p)} en ${monName(m)}.`); }
  }
  return res;
}
function healAll() { for (const m of S.team) m.hp = maxHp(m); }

// Combate contra entrenador (gimnasios y Copa)
function trainerBattle(name, foes, F) {
  let ai = firstHealthy(S.team), fi = 0;
  if (ai < 0) return false;
  F.me = S.team[ai]; F.foe = foes[0];
  F.snap(`¡${name} te desafía! Saca a ${monName(foes[0])}.`, {appear: 1});
  for (let turn = 0; turn < 300; turn++) {
    const me = S.team[ai], w = foes[fi];
    F.me = me; F.foe = w;
    exchange(me, w, F, {foeName: `${monName(w)} de ${name}`});
    if (w.hp <= 0) {
      F.snap(`¡${monName(w)} de ${name} se debilitó!`, {faint: 'foe'});
      const mult = 1.5 * (boostOn('egg') ? 2 : 1);
      for (const m of S.team) if (m.hp > 0) giveXp(m, xpGain(w, m, m === me ? mult : mult * 0.5), F);
      fi++;
      if (fi >= foes.length) { endBattle(S.team); return true; }
      F.foe = foes[fi];
      F.snap(`${name} saca a ${monName(foes[fi])}.`, {appear: 'foe'});
    }
    if (me.hp <= 0) {
      F.snap(`¡${monName(me)} se debilitó!`, {faint: 'me'});
      ai = firstHealthy(S.team);
      if (ai < 0) { endBattle(S.team); return false; }
      delete me._b; me.st = null;
      F.me = S.team[ai];
      F.snap(`¡Adelante, ${monName(S.team[ai])}!`, {appear: 'me'});
    }
  }
  endBattle(S.team);
  return false;
}
function gymBattle(zoneId) {
  const g = GYMS[zoneId];
  healAll();
  const foes = g.t.map(([s, lv]) => makeMon(s, lv, {shiny: false, iv: [20,20,20,20,20,20]}));
  const F = Frames(true);
  const win = trainerBattle(`Líder ${g.l}`, foes, F);
  if (win) {
    const prize = Math.max(...g.t.map(x => x[1])) * 100;
    const first = !S.badges[zoneId];
    S.money += first ? prize : Math.floor(prize / 4);
    S.badges[zoneId] = 1;
    F.note(first ? `¡Ganaste la <b>${g.b}</b> y ${fmt(prize)}!` : `Revancha ganada: ${fmt(Math.floor(prize / 4))}.`);
  } else F.note(`${g.l} te venció. Entrena más y vuelve.`);
  healAll();
  play(F, () => { save(); renderAll(); });
}

// Liga: 5 combates seguidos; entre uno y otro solo descansas un poco (y las pociones automáticas)
function leagueOpen(key) { return Object.keys(GYMS).filter(z => D.zones[z].r === LEAGUES[key].need && S.badges[z]).length >= 8; }
function leagueRun(key) {
  const L = LEAGUES[key];
  if (!leagueOpen(key)) return toast(`Necesitas las 8 medallas de ${L.need === 'kanto' ? 'Kanto' : 'Johto'}.`);
  S.hunting = false; clearTimeout(huntTimer);
  healAll();
  const F = Frames(true);
  let won = true;
  for (const [k, foe] of L.f.entries()) {
    const team = foe.t.map(([s, lv]) => makeMon(s === 'RIVAL' ? (RIVAL_ACE[S.starter] || 'blastoise') : s, lv, {shiny: false, iv: [25,25,25,25,25,25]}));
    F.note(`<b>${L.n}</b> · combate ${k + 1}/5: ${foe.l}`);
    if (!trainerBattle(foe.l, team, F)) { won = false; F.note(`${foe.l} te venció. La Liga se reinicia: entrena y vuelve a intentarlo.`); break; }
    for (const m of S.team) { m.hp = Math.min(maxHp(m), m.hp + Math.ceil(maxHp(m) * 0.25)); autoPotion(m); }
    if (!foe.champ) F.note(`¡Venciste a ${foe.l}!`);
  }
  if (won) {
    S.league = S.league || {};
    const first = !S.league[key];
    S.league[key] = (S.league[key] || 0) + 1;
    const prize = first ? L.prize : Math.floor(L.prize / 3);
    S.money += prize;
    S.hall = S.hall || [];
    S.hall.unshift({lg: key, d: todayKey(), t: S.team.map(m => [m.s, m.lv, m.shiny ? 1 : 0])});
    S.hall.length = Math.min(S.hall.length, 20);
    F.note(`🏆 ¡Eres el nuevo Campeón de la ${L.n}! +${fmt(prize)}. Tu equipo entró al Salón de la Fama.`);
  }
  healAll();
  play(F, () => { save(); renderAll(); });
}

// Copa diaria: rivales generados con la fecha como semilla (iguales para todos ese día)
function cupRivals(round) {
  const day = todayKey();
  const r = seeded([...day].reduce((a, c) => a * 31 + c.charCodeAt(0), round * 7919));
  const avg = Math.max(5, Math.round(S.team.reduce((a, m) => a + m.lv, 0) / Math.max(1, S.team.length)));
  const pool = Object.keys(D.species).filter(s => !sp(s).leg);
  const names = ['Rival Azul', 'Entrenadora Lila', 'As Bruno', 'Campeona Silvia', 'Rival Plata', 'Domadora Kira'];
  const size = clamp(2 + round, 3, 6);
  const team = [];
  for (let i = 0; i < size; i++) {
    const s = pool[Math.floor(r() * pool.length)];
    const m = makeMon(s, clamp(avg - 2 + round * 2, 2, 100), {shiny: false, iv: [15,15,15,15,15,15], nat: Math.floor(r() * 25)});
    team.push(m);
  }
  return {name: names[Math.floor(r() * names.length)], team};
}
function cupBattle() {
  if (S.cup.day !== todayKey()) S.cup = {day: todayKey(), round: 0, done: false, trophies: S.cup.trophies || 0};
  if (S.cup.done) return toast('La Copa de hoy ya terminó. Vuelve mañana.');
  healAll();
  const round = S.cup.round + 1;
  const rv = cupRivals(round);
  const F = Frames(true);
  const win = trainerBattle(`${rv.name} (Ronda ${round}/3)`, rv.team, F);
  if (win) {
    S.cup.round = round;
    const prize = 1500 * round;
    S.money += prize;
    const extra = round === 3 ? 'ultra_ball' : 'great_ball';
    S.items[extra] = (S.items[extra] || 0) + round * 2;
    F.note(`¡Ganaste la ronda ${round}! +${fmt(prize)} y ${round * 2} ${itemName(extra)}.`);
    if (round === 3) { S.cup.done = true; S.cup.trophies = (S.cup.trophies || 0) + 1; F.note('🏆 ¡Campeón de la Copa diaria!'); }
  } else { S.cup.done = true; F.note(`Quedaste fuera en la ronda ${round}. Mañana hay otra Copa.`); }
  healAll();
  play(F, () => { save(); renderAll(); });
}

// ---------- progreso fuera de línea ----------
function offlineProgress() {
  if (!S.hunting || !S.team.length) return null;
  const away = Math.min(Date.now() - (S.lastSeen || Date.now()), OFFLINE_CAP_MS);
  if (away < 30e3) return null;
  let secs = away / 1000;
  const before = {money: S.money, caught: S.stats.caught, lv: S.team.map(m => m.lv), dex: Object.keys(S.caught).length};
  let n = 0;
  const F = Frames(false);
  while (secs > 0 && n < 4000) {
    const lure = boostOn('lure');
    secs -= lure ? BATTLE_SEC * 0.65 : BATTLE_SEC;
    const r = wildEncounter(F); n++;
    if (r.stop || r.whiteout) break;
  }
  const ups = S.team.map((m, i) => m.lv - (before.lv[i] || m.lv)).reduce((a, b) => a + Math.max(0, b), 0);
  return {mins: Math.round(away / 60000), battles: n, money: S.money - before.money, caught: S.stats.caught - before.caught,
    newDex: Object.keys(S.caught).length - before.dex, levels: ups, stopped: !S.hunting};
}

// ---------- reproducción de animaciones ----------
let playing = false, playTimer = null;
function play(F, done) {
  showScreen('hunt');
  playing = true;
  const list = F.list;
  let i = 0;
  const step = () => {
    if (i >= list.length) { playing = false; done && done(); return; }
    drawFrame(list[i++]);
    playTimer = setTimeout(step, 650);
  };
  step();
}
function setBar(el, v) { el.style.width = (clamp(v, 0, 1) * 100) + '%'; el.className = v < 0.2 ? 'low' : v < 0.5 ? 'mid' : ''; }
function drawSide(side, m) {
  const img = $(`#${side}Img`);
  document.querySelector(`.side.${side}`).style.visibility = m ? 'visible' : 'hidden';
  if (!m) { img.classList.add('gone'); $(`#${side}Name`).textContent = '—'; $(`#${side}Lv`).textContent = ''; setBar($(`#${side}Hp`), 0); return; }
  const src = `assets/pokemon/${m.s}/${m.shiny ? 'shiny' : 'battle'}-${side === 'foe' ? 'front' : 'back'}.gif`;
  if (!img.src.endsWith(src)) img.src = src;
  img.classList.remove('gone', 'faint');
  $(`#${side}Name`).innerHTML = esc(m.name).replace('★', '<span class="shiny-tag">★</span>');
  $(`#${side}Lv`).innerHTML = `Nv. ${m.lv} · ${m.hp}/${m.max}${m.st ? ` <span class="st st-${m.st}">${STATUS_TAG[m.st]}</span>` : ''}`;
  setBar($(`#${side}Hp`), m.hp / m.max);
  if (side === 'me') $('#meXp').style.width = (clamp(m.xp, 0, 1) * 100) + '%';
}
function drawFrame(fr) {
  drawSide('foe', fr.foe); drawSide('me', fr.me);
  $('#msg').innerHTML = fr.text || '';
  const fx = fr.fx || {};
  if (fx.hit) { const el = $(`#${fx.hit}Img`); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  if (fx.faint) $(`#${fx.faint}Img`).classList.add('faint');
  if (fx.ball) { const b = $('#ballFx'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); if (fx.caught) $('#foeImg').classList.add('gone'); }
  renderLog();
}

// ---------- bucle de caza ----------
let huntTimer = null;
function huntLoop() {
  clearTimeout(huntTimer);
  if (!S.hunting) return;
  if (playing) { huntTimer = setTimeout(huntLoop, 400); return; }
  const F = Frames(!document.hidden);
  const r = wildEncounter(F);
  if (r.stop) { S.hunting = false; toast(r.stop); renderHunt(); return; }
  play(F, () => {
    save(); renderTop(); renderHuntCtl();
    huntTimer = setTimeout(huntLoop, boostOn('lure') ? 400 : 1100);
  });
}
function toggleHunt() {
  if (!S.hunting) {
    if (!D.zones[S.zone].h) return toast('En esta zona no hay Pokémon salvajes. Ve a una ruta desde el Mapa.');
    if (firstHealthy(S.team) < 0) return toast('Tu equipo está debilitado. Usa el Centro Pokémon.');
    S.hunting = true; huntLoop();
  } else { S.hunting = false; clearTimeout(huntTimer); }
  save(); renderHuntCtl();
}

// ---------- interfaz ----------
let toastT = null;
function toast(t) { const el = $('#toast'); el.innerHTML = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr-' + name));
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.s === name));
  if (name !== 'hunt') ({team: renderTeam, map: renderMap, dex: renderDex, bag: renderBag, more: renderMore})[name]();
}
function openSheet(html) { $('#sheetBox').innerHTML = html; $('#sheet').classList.remove('hidden'); }
function closeSheet() { $('#sheet').classList.add('hidden'); }
function renderTop() {
  const z = D.zones[S.zone];
  $('#zoneName').textContent = z ? z.n : S.zone;
  $('#moneyVal').textContent = fmt(S.money);
  $('#arena').className = ({cave: 'cave', water: 'water', town: 'town', dungeon: 'dungeon'})[z && z.k] || '';
}
function renderHuntCtl() {
  const b = $('#btnHunt');
  b.textContent = S.hunting ? '■ Detener' : '▶ Cazar';
  b.classList.toggle('stop', S.hunting);
  const balls = Object.keys(D.items).filter(k => D.items[k].k === 'ball' && S.items[k] > 0);
  if (!balls.includes(S.ball)) balls.unshift(S.ball);
  $('#selBall').innerHTML = balls.map(k => `<option value="${k}" ${k === S.ball ? 'selected' : ''}>${itemName(k)} (${S.items[k] || 0})</option>`).join('');
  $('#selPolicy').value = S.policy;
  $('#chkPotion').checked = S.autoPotion;
  const bs = Object.entries(BOOST_ITEMS).filter(([, v]) => boostOn(v.key)).map(([k, v]) => `${itemName(k)}: ${v.txt} (${Math.ceil((S.boosts[v.key] - Date.now()) / 60000)} min)`);
  $('#boosts').textContent = bs.join(' · ');
}
function renderLog() { $('#log').innerHTML = S.log.slice(0, 25).map(l => `<li>${l}</li>`).join(''); }
function renderHunt() {
  renderTop(); renderHuntCtl(); renderLog();
  if (!playing) {
    const lead = S.team[Math.max(0, firstHealthy(S.team))];
    drawSide('me', lead && {s: lead.s, shiny: lead.shiny, name: monName(lead), lv: lead.lv, hp: lead.hp, max: maxHp(lead), xp: (lead.xp - expFor(lead.s, lead.lv)) / Math.max(1, expFor(lead.s, lead.lv + 1) - expFor(lead.s, lead.lv))});
    if (!S.hunting) drawSide('foe', null);
  }
}
function monCard(m, i, where) {
  const mx = maxHp(m);
  return `<div class="card ${where === 'team' && i === 0 ? 'lead' : ''}" data-w="${where}" data-i="${i}"><div class="row">
    <img class="mini" src="${dexImg(m.s, m.shiny)}" alt="">
    <div class="grow"><b>${esc(monName(m))}</b> <span class="small">Nv. ${m.lv}</span><br>${typeTags(sp(m.s).t)}
    <div class="bar"><i class="${m.hp / mx < 0.2 ? 'low' : m.hp / mx < 0.5 ? 'mid' : ''}" style="width:${m.hp / mx * 100}%"></i></div><span class="small">${m.hp}/${mx} PS</span></div></div></div>`;
}
function renderTeam() {
  const el = $('#scr-team');
  el.innerHTML = `<h2>Equipo (${S.team.length}/6)</h2><div class="list">${S.team.map((m, i) => monCard(m, i, 'team')).join('')}</div>
    <h3>Caja (${S.box.length})</h3><div class="actions" style="margin-bottom:8px"><button class="btn" id="sortBox">Ordenar por nivel</button></div>
    <div class="list">${S.box.map((m, i) => monCard(m, i, 'box')).join('') || '<p class="small">Vacía. Los Pokémon que captures con el equipo lleno llegan aquí.</p>'}</div>`;
  el.querySelectorAll('.card').forEach(c => c.onclick = () => monSheet(c.dataset.w, +c.dataset.i));
  $('#sortBox').onclick = () => { S.box.sort((a, b) => b.lv - a.lv); save(); renderTeam(); };
}
function monSheet(where, i) {
  const list = where === 'team' ? S.team : S.box, m = list[i];
  if (!m) return;
  const st = calcStats(m), next = m.lv >= 100 ? 0 : expFor(m.s, m.lv + 1) - m.xp;
  const n = m.nat, up = Math.floor(n / 5), dn = n % 5;
  const natTxt = up === dn ? 'neutral' : `+${STAT[NAT_STAT[up]]} −${STAT[NAT_STAT[dn]]}`;
  const evoItems = sp(m.s).e.filter(e => e.item && S.items[e.item] > 0);
  const lvEvos = sp(m.s).e.filter(e => e.lv).map(e => `${sp(e.to).n} (Nv. ${e.lv}${e.time ? e.time === 'day' ? ', de día' : ', de noche' : ''})`);
  const itemEvos = sp(m.s).e.filter(e => e.item).map(e => `${sp(e.to).n} (${itemName(e.item)})`);
  openSheet(`<div class="row"><img class="mini" style="width:96px;height:96px" src="${dexImg(m.s, m.shiny)}"><div class="grow">
    <h2>${esc(monName(m))}</h2>${typeTags(sp(m.s).t)}<div class="small">Nº ${sp(m.s).d} · Nv. ${m.lv} · ${NAT_ES[n]} (${natTxt})</div>
    <div class="small">${m.lv < 100 ? `Faltan ${next.toLocaleString('es-MX')} PE para subir` : 'Nivel máximo'}</div></div></div>
    <table class="stats">${st.map((v, k) => `<tr><td>${STAT[k]}</td><td class="v">${k === 0 ? `${m.hp}/${v}` : v}</td><td class="small">IV ${m.iv[k]}</td></tr>`).join('')}</table>
    <h3>Movimientos</h3>${m.moves.map(id => { const mv = D.moves[id]; return mv ? `<div class="small">${typeTags([mv[1]])} <b style="color:var(--ink)">${mv[0]}</b> · Pot. ${mv[3] || '—'} · Prec. ${mv[4] || '—'}</div>` : ''; }).join('')}
    ${lvEvos.length || itemEvos.length ? `<h3>Evoluciona en</h3><div class="small">${[...lvEvos, ...itemEvos].join(' · ')}</div>` : ''}
    <div class="actions">
      ${where === 'team' && i > 0 ? '<button class="btn y" data-a="lead">Poner primero</button>' : ''}
      ${where === 'team' && S.team.length > 1 ? '<button class="btn" data-a="tobox">Mandar a la caja</button>' : ''}
      ${where === 'box' ? `<button class="btn y" data-a="toteam">${S.team.length < 6 ? 'Al equipo' : 'Cambiar por el último del equipo'}</button>` : ''}
      ${evoItems.map(e => `<button class="btn y" data-a="evo" data-item="${e.item}">Usar ${itemName(e.item)}</button>`).join('')}
      <button class="btn y" data-a="moves">Ataques</button>
      <button class="btn" data-a="nick">Mote</button>
      ${where === 'box' || S.team.length > 1 ? '<button class="btn r" data-a="release">Liberar</button>' : ''}
      <button class="btn" data-a="close">Cerrar</button>
    </div>`);
  $('#sheetBox').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'close') return closeSheet();
    if (a === 'moves') return moveSheet(where, i);
    if (a === 'lead') { S.team.unshift(S.team.splice(i, 1)[0]); }
    if (a === 'tobox') { S.box.push(S.team.splice(i, 1)[0]); }
    if (a === 'toteam') { const x = S.box.splice(i, 1)[0]; if (S.team.length >= 6) S.box.push(S.team.pop()); S.team.push(x); }
    if (a === 'evo') { const it = b.dataset.item; if (tryEvolve(m, it)) { S.items[it]--; toast(`¡Evolucionó a ${sp(m.s).n}!`); } }
    if (a === 'nick') { const nn = prompt('Mote (vacío para quitarlo):', m.nick || ''); if (nn !== null) m.nick = nn.trim().slice(0, 12) || undefined; }
    if (a === 'release') { if (!confirm(`¿Liberar a ${monName(m)}? No se puede deshacer.`)) return; list.splice(i, 1); S.money += m.lv * 10; toast(`Liberaste a ${monName(m)}. +${fmt(m.lv * 10)}`); }
    save(); closeSheet(); renderTeam(); renderHunt();
  });
}
// Elegir ataques a mano: cualquier ataque aprendido por nivel hasta el nivel actual
function moveSheet(where, i) {
  const list = where === 'team' ? S.team : S.box, m = list[i];
  const all = [...new Set(sp(m.s).L.filter(x => x[0] <= m.lv).map(x => x[1]).concat(m.moves))].filter(id => D.moves[id]);
  const sel = new Set(m.moves);
  const draw = () => {
    openSheet(`<h2>Ataques de ${esc(monName(m))}</h2><p class="small">Elige hasta 4. ${m.manual ? 'Modo manual: los ataques nuevos no reemplazan a los tuyos (te avisa en el registro).' : 'Modo automático: al subir de nivel cambia el ataque más débil por uno mejor.'}</p>
      <div class="list">${all.map(id => { const mv = D.moves[id], fx = mv[7] || {};
        const extra = fx.a ? ` · ${({par:'paraliza',slp:'duerme',frz:'congela',brn:'quema',psn:'envenena',tox:'envenena gravemente',cnf:'confunde'})[fx.a]}${fx.ac && fx.ac < 100 ? ` (${fx.ac}%)` : ''}` : fx.s ? ` · ${fx.self ? 'sube' : 'baja'} stats` : fx.hl ? ' · cura' : fx.dr > 0 ? ' · drena' : '';
        return `<div class="card ${sel.has(id) ? 'lead' : ''}" data-m="${id}"><div class="row"><div class="grow">${typeTags([mv[1]])} <b>${mv[0]}</b><br><span class="small">${mv[2] === 'status' ? 'Estado' : mv[2] === 'special' ? 'Especial' : 'Físico'} · Pot. ${mv[3] || '—'} · Prec. ${mv[4] || '—'}${extra}</span></div>${sel.has(id) ? '✔' : ''}</div></div>`; }).join('')}</div>
      <div class="actions"><button class="btn y" id="mvSave">Guardar (${sel.size}/4)</button><button class="btn" id="mvAuto">Volver a automático</button><button class="btn" id="mvBack">‹ Atrás</button></div>`);
    $('#sheetBox').querySelectorAll('[data-m]').forEach(c => c.onclick = () => {
      const id = c.dataset.m;
      if (sel.has(id)) { if (sel.size > 1) sel.delete(id); } else if (sel.size < 4) sel.add(id); else return toast('Máximo 4 ataques. Quita uno primero.');
      draw();
    });
    $('#mvSave').onclick = () => {
      if (![...sel].some(id => D.moves[id][3] > 0)) return toast('Deja al menos un ataque que haga daño.');
      m.moves = [...sel]; m.manual = true; save(); toast('Ataques guardados.'); monSheet(where, i);
    };
    $('#mvAuto').onclick = () => { m.manual = false; save(); toast('Ataques en modo automático.'); monSheet(where, i); };
    $('#mvBack').onclick = () => monSheet(where, i);
  };
  draw();
}
function zoneLabel(id) {
  const z = D.zones[id]; if (!z) return id;
  const lv = z.h && z.lv[1] ? ` · Nv. ${z.lv[0]}–${z.lv[1]}` : '';
  return `${z.n}<span class="small"> · ${({kanto:'Kanto',johto:'Johto',hoenn:'Hoenn'})[z.r]}${lv}${z.h ? '' : ' · sin salvajes'}${GYMS[id] ? ' · 🏅 Gimnasio' : ''}</span>`;
}
function travel(id) {
  S.zone = id; S.visited[id] = 1;
  const z = D.zones[id];
  if (!z.h && S.hunting) { S.hunting = false; clearTimeout(huntTimer); }
  addLog(`Viajaste a <b>${z.n}</b>.`);
  save(); renderAll(); renderMap();
}
function renderMap() {
  const z = D.zones[S.zone];
  const el = $('#scr-map');
  const flyTo = Object.keys(S.visited).filter(id => D.zones[id] && D.zones[id].k === 'town' && id !== S.zone);
  const g = GYMS[S.zone];
  const encs = z.h ? z.E.slice(0, 12).map(e => `<img class="mini" style="width:40px;height:40px;${S.seen[e[0]] ? '' : 'filter:brightness(0) opacity(.5)'}" title="${S.seen[e[0]] ? sp(e[0]).n : '???'}" src="${dexImg(e[0])}">`).join('') : '';
  el.innerHTML = `<h2>${z.n}</h2>
    <div class="card"><div>${zoneLabel(S.zone)}</div>${encs ? `<div style="margin-top:6px">${encs}</div>` : ''}
      <div class="actions">
        ${z.k === 'town' ? '<button class="btn" id="mHeal">✚ Centro Pokémon</button><button class="btn" id="mShop">🛒 Tienda</button>' : ''}
        ${S.zone === 'indigo_plateau' ? Object.keys(LEAGUES).map(k => `<button class="btn y" data-lg="${k}">🏆 ${LEAGUES[k].n}${leagueOpen(k) ? '' : ' (8 medallas)'}</button>`).join('') : ''}
        ${g ? `<button class="btn y" id="mGym">🏅 Retar a ${g.l}${S.badges[S.zone] ? ' (revancha)' : ''}</button>` : ''}
        ${z.h ? '<button class="btn y" id="mHunt">Cazar aquí</button>' : ''}
      </div></div>
    <h3>Caminos desde aquí</h3>
    <div class="list">${z.x.filter(id => D.zones[id]).map(id => `<div class="card" data-z="${id}">→ ${zoneLabel(id)}</div>`).join('')}</div>
    ${flyTo.length ? `<h3>Volar a un pueblo visitado</h3><div class="list">${flyTo.map(id => `<div class="card" data-z="${id}">✈ ${zoneLabel(id)}</div>`).join('')}</div>` : ''}`;
  el.querySelectorAll('[data-z]').forEach(c => c.onclick = () => travel(c.dataset.z));
  if ($('#mHeal')) $('#mHeal').onclick = () => { healAll(); save(); toast('Tu equipo está como nuevo.'); };
  if ($('#mShop')) $('#mShop').onclick = () => showScreen('bag');
  el.querySelectorAll('[data-lg]').forEach(b => b.onclick = () => leagueRun(b.dataset.lg));
  if ($('#mGym')) $('#mGym').onclick = () => { S.hunting = false; clearTimeout(huntTimer); gymBattle(S.zone); };
  if ($('#mHunt')) $('#mHunt').onclick = () => { showScreen('hunt'); if (!S.hunting) toggleHunt(); };
}
function renderDex() {
  const ids = Object.keys(D.species).sort((a, b) => sp(a).d - sp(b).d);
  const c = Object.keys(S.caught).length, s = Object.keys(S.seen).length;
  $('#scr-dex').innerHTML = `<h2>Pokédex</h2><p class="small">Vistos ${s} · Capturados ${c} / ${ids.length} · Shiny ${Object.values(S.caught).filter(v => v === 2).length}</p>
    <div class="dexgrid">${ids.map(id => { const st = S.caught[id] ? 'caught' : S.seen[id] ? 'seen' : 'none';
      return `<div class="dexcell ${st}" data-s="${id}"><img loading="lazy" src="${dexImg(id, S.caught[id] === 2)}" alt=""><div>${String(sp(id).d).padStart(3, '0')}</div></div>`; }).join('')}</div>`;
  $('#scr-dex').querySelectorAll('.dexcell').forEach(c => c.onclick = () => dexSheet(c.dataset.s));
}
function dexSheet(id) {
  const s = sp(id), known = S.seen[id];
  if (!known) return toast('Aún no has visto a este Pokémon.');
  const where = Object.entries(D.zones).filter(([, z]) => z.h && z.E.some(e => e[0] === id)).map(([zid, z]) => z.n).slice(0, 8);
  openSheet(`<div class="row"><img class="mini" style="width:96px;height:96px" src="${dexImg(id)}"><div class="grow"><h2>${s.n}</h2>${typeTags(s.t)}
    <div class="small">Nº ${s.d} · ${S.caught[id] ? 'Capturado' : 'Visto'}</div></div></div>
    <table class="stats">${s.b.map((v, k) => `<tr><td>${STAT[k]}</td><td class="v">${v}</td></tr>`).join('')}</table>
    <div class="small">Ratio de captura: ${s.c}</div>
    <h3>Dónde encontrarlo</h3><div class="small">${where.join(' · ') || 'Solo por evolución o en zonas especiales.'}</div>
    <div class="actions"><button class="btn" onclick="closeSheet()">Cerrar</button></div>`);
}
function renderBag() {
  const inTown = D.zones[S.zone].k === 'town';
  const own = Object.keys(S.items).filter(k => S.items[k] > 0);
  $('#scr-bag').innerHTML = `<h2>Mochila</h2>
    <div class="shop">${own.map(k => `<div class="card"><div class="row"><img src="${itemImg(k)}" alt="" onerror="this.src='assets/items/poke-ball.png'"><div class="grow">${itemName(k)}</div><span class="qty">×${S.items[k]}</span>
      ${BOOST_ITEMS[k] ? `<button class="btn y" data-use="${k}">Usar</button>` : ''}${k === 'revive' ? `<button class="btn y" data-use="revive">Usar</button>` : ''}${POTION[k] ? `<button class="btn" data-use="${k}">Usar</button>` : ''}</div></div>`).join('') || '<p class="small">Vacía.</p>'}</div>
    <h2>Tienda Pokémon</h2>${inTown ? '' : '<p class="small">Solo puedes comprar en pueblos y ciudades. Viaja a uno desde el Mapa.</p>'}
    <div class="shop">${SHOP_LIST.filter(k => D.items[k] || ITEM_ES[k]).map(k => { const p = (D.items[k] || {}).p || 2100;
      return `<div class="card"><div class="row"><img src="${itemImg(k)}" alt="" onerror="this.src='assets/items/poke-ball.png'"><div class="grow">${itemName(k)}<br><span class="small">${fmt(p)}</span></div>
      <button class="btn y" data-buy="${k}" data-q="1" ${!inTown || S.money < p ? 'disabled' : ''}>×1</button>
      <button class="btn y" data-buy="${k}" data-q="10" ${!inTown || S.money < p * 10 ? 'disabled' : ''}>×10</button></div></div>`; }).join('')}</div>`;
  $('#scr-bag').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const k = b.dataset.buy, q = +b.dataset.q, p = ((D.items[k] || {}).p || 2100) * q;
    if (S.money < p) return toast('No te alcanza.');
    S.money -= p; S.items[k] = (S.items[k] || 0) + q;
    toast(`Compraste ${q} × ${itemName(k)}.`); save(); renderTop(); renderBag();
  });
  $('#scr-bag').querySelectorAll('[data-use]').forEach(b => b.onclick = () => useItem(b.dataset.use));
}
function useItem(k) {
  if (BOOST_ITEMS[k]) { const bi = BOOST_ITEMS[k]; S.boosts[bi.key] = Math.max(Date.now(), S.boosts[bi.key] || 0) + bi.ms; S.items[k]--; toast(`${itemName(k)} activo: ${bi.txt}.`); }
  else if (k === 'revive' || POTION[k]) {
    const targets = S.team.map((m, i) => ({m, i})).filter(({m}) => k === 'revive' ? m.hp <= 0 : m.hp > 0 && m.hp < maxHp(m));
    if (!targets.length) return toast('Nadie lo necesita.');
    const {m} = targets[0];
    if (k === 'revive') m.hp = Math.floor(maxHp(m) / 2); else m.hp = Math.min(maxHp(m), m.hp + POTION[k]);
    S.items[k]--; toast(`Usaste ${itemName(k)} en ${monName(m)}.`);
  }
  save(); renderBag(); renderHuntCtl();
}
function renderMore() {
  if (S.cup.day !== todayKey()) S.cup = {day: todayKey(), round: 0, done: false, trophies: S.cup.trophies || 0};
  const kb = Object.keys(GYMS).filter(z => D.zones[z].r === 'kanto'), jb = Object.keys(GYMS).filter(z => D.zones[z].r === 'johto');
  const badge = z => `<span title="${GYMS[z].b}" style="opacity:${S.badges[z] ? 1 : .25}">🏅</span>`;
  $('#scr-more').innerHTML = `<h2>Copa diaria</h2>
    <div class="card"><div>Tres rondas contra rivales que cambian cada día. Ronda actual: <b>${S.cup.done ? 'terminada' : S.cup.round + 1}/3</b> · Trofeos: ${S.cup.trophies || 0} 🏆</div>
    <div class="actions"><button class="btn y" id="cupGo" ${S.cup.done || !S.team.length ? 'disabled' : ''}>Pelear ronda ${Math.min(3, S.cup.round + 1)}</button></div></div>
    <h2>Medallas</h2><div class="card">Kanto ${kb.map(badge).join('')}<br>Johto ${jb.map(badge).join('')}<div class="small">Reta a los líderes desde el Mapa, en su ciudad.</div></div>
    <h2>Liga Pokémon</h2><div class="card">${Object.entries(LEAGUES).map(([k, L]) => `<div>${L.n}: ${S.league && S.league[k] ? `<b>Campeón</b> ×${S.league[k]}` : leagueOpen(k) ? 'abierta (Meseta Añil)' : 'necesitas 8 medallas'}</div>`).join('')}
      ${S.hall && S.hall.length ? `<h3>Salón de la Fama</h3>${S.hall.slice(0, 5).map(h => `<div class="small">${h.d} · ${LEAGUES[h.lg].n}<br>${h.t.map(([s, lv, sh]) => `<img class="mini" style="width:40px;height:40px" title="${sp(s).n} Nv. ${lv}" src="${dexImg(s, sh)}">`).join('')}</div>`).join('')}` : ''}</div>
    ${window.AndroidApp ? `<h2>Actualizaciones</h2><div class="card"><div class="small">Versión ${VERSION} · build ${AndroidApp.build()}. La app busca versiones nuevas sola al abrirse; si solo cambió el juego, baja un parche pequeño sin reinstalar.</div>
      <div class="actions"><button class="btn y" id="updCheck">⟳ Buscar actualización</button><button class="btn" id="updHist">Historial de versiones</button></div></div>` : ''}
    <h2>Estadísticas</h2><div class="card small">Combates: ${S.stats.battles} · Capturas: ${S.stats.caught} · Shiny: ${S.stats.shinies}</div>
    <h2>Guardado</h2><div class="card"><div class="small">Tu partida se guarda sola en este teléfono. Para pasarla a otro, copia el código.</div>
      <div class="actions"><button class="btn" id="exp">Exportar</button><button class="btn" id="imp">Importar</button><button class="btn r" id="wipe">Borrar partida</button></div>
      <textarea id="saveTxt" placeholder="Aquí aparece / se pega el código de guardado"></textarea></div>
    <h2>Acerca de</h2><div class="card small">
      <b style="color:var(--ink)">Pokédex Idle Offline v${VERSION}</b> — resurrección hecha por fans de <i>Pokédex Idle</i>, para que se pueda seguir jugando aunque el juego original desaparezca.<br><br>
      Todo se juega y se guarda en este dispositivo. Los Pokédólares solo se ganan jugando.<br><br>
      Proyecto no oficial, no afiliado a Nintendo, Creatures Inc., GAME FREAK ni The Pokémon Company. Pokémon y sus nombres son marcas de sus respectivos dueños.<br>
      Créditos: sprites y diseño del juego original Pokédex Idle; datos de especies, movimientos, evoluciones y encuentros de PokéAPI.</div>`;
  if ($('#updCheck')) { $('#updCheck').onclick = () => AndroidApp.check(); $('#updHist').onclick = () => AndroidApp.history(); }
  $('#cupGo').onclick = () => { S.hunting = false; clearTimeout(huntTimer); cupBattle(); };
  $('#exp').onclick = () => { save(); $('#saveTxt').value = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); $('#saveTxt').select(); toast('Código listo para copiar.'); };
  $('#imp').onclick = () => { try { const o = JSON.parse(decodeURIComponent(escape(atob($('#saveTxt').value.trim())))); if (!o.team) throw 0; S = Object.assign(newState(), o); UID = S.uid || 1; S.lastSeen = Date.now(); save(); renderAll(); toast('Partida importada.'); } catch (e) { toast('Código no válido.'); } };
  $('#wipe').onclick = () => { if (confirm('¿Borrar la partida? No se puede deshacer.')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
}
function renderAll() { renderHunt(); }

// ---------- inicio ----------
function chooseStarter() {
  openSheet(`<h2>¡Bienvenido a Kanto!</h2><p class="small">Elige a tu primer compañero. Tu equipo cazará Pokémon salvajes por ti, incluso con el juego cerrado (hasta 8 horas).</p>
    <div class="starter">${D.starters.map(s => `<div class="card" data-s="${s}"><img src="${dexImg(s)}" alt=""><div><b>${sp(s).n}</b></div>${typeTags(sp(s).t)}</div>`).join('')}</div>`);
  $('#sheetBox').querySelectorAll('[data-s]').forEach(c => c.onclick = () => {
    const m = makeMon(c.dataset.s, 5, {shiny: false});
    S.team.push(m); registerCaught(m.s); S.starter = m.s;
    S.started = true; S.zone = 'route_1'; S.visited.route_1 = 1;
    addLog(`¡Elegiste a <b>${sp(m.s).n}</b>! Empiezas en la Ruta 1. Pulsa «Cazar».`);
    save(); closeSheet(); renderAll();
  });
}
function init() {
  load();
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => showScreen(b.dataset.s));
  $('#btnHunt').onclick = toggleHunt;
  $('#btnHeal').onclick = () => {
    const z = D.zones[S.zone];
    if (z.k !== 'town' && S.hunting) return toast('Detén la caza o viaja a un pueblo para curar gratis.');
    healAll(); save(); renderHunt(); toast(z.k === 'town' ? 'Tu equipo está como nuevo.' : 'Volviste al último Centro Pokémon y regresaste. Equipo curado.');
  };
  $('#selBall').onchange = e => { S.ball = e.target.value; save(); };
  $('#selPolicy').onchange = e => { S.policy = e.target.value; save(); };
  $('#chkPotion').onchange = e => { S.autoPotion = e.target.checked; save(); };
  $('#sheet').onclick = e => { if (e.target.id === 'sheet') closeSheet(); };
  if (!S.started || !S.team.length) { renderAll(); chooseStarter(); return; }
  const off = offlineProgress();
  save();
  renderAll();
  if (off && off.battles) {
    openSheet(`<h2>Mientras no estabas…</h2><p>Tu equipo estuvo cazando ${off.mins} min en ${D.zones[S.zone].n}.</p>
      <table class="stats"><tr><td>Combates</td><td class="v">${off.battles}</td></tr><tr><td>Pokédólares</td><td class="v">${fmt(off.money)}</td></tr>
      <tr><td>Capturas</td><td class="v">${off.caught}</td></tr><tr><td>Nuevos en la Pokédex</td><td class="v">${off.newDex}</td></tr><tr><td>Niveles subidos</td><td class="v">${off.levels}</td></tr></table>
      ${off.stopped ? '<p class="small">La caza se detuvo porque tu equipo se debilitó.</p>' : ''}
      <div class="actions"><button class="btn y" onclick="closeSheet()">¡Genial!</button></div>`);
  }
  if (S.hunting) huntLoop();
  setInterval(() => { save(); renderHuntCtl(); }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else { const o = offlineProgress(); if (o && o.battles) toast(`Mientras no estabas: ${o.battles} combates, +${fmt(o.money)}, ${o.caught} capturas.`); save(); renderAll(); }
  });
}
window.closeSheet = closeSheet;
// Botón atrás de Android: cierra ventanas o vuelve a «Cazar»; devuelve false para dejar salir de la app
window.onAndroidBack = () => {
  if (!$('#sheet').classList.contains('hidden')) { closeSheet(); return true; }
  const cur = document.querySelector('.screen.active');
  if (cur && cur.id !== 'scr-hunt') { showScreen('hunt'); return true; }
  save();
  return false;
};
window.addEventListener('pagehide', save);
init();
if (window.AndroidApp) try { AndroidApp.ready(); } catch (e) {}
