"""Construye game/data.js juntando el catálogo de Pokédex Idle con datos de PokéAPI (CSV)."""
import csv, json, sys, collections, random

CAT, CSV, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(CAT))

def rows(name):
    return list(csv.DictReader(open(f"{CSV}/{name}.csv", encoding="utf-8")))

def i(x, default=None):
    return int(x) if x not in (None, "") else default

species_csv = {r["identifier"].replace("-", "_"): r for r in rows("pokemon_species")}
sp_by_id = {i(r["id"]): r["identifier"].replace("-", "_") for r in rows("pokemon_species")}
poke_csv = {i(r["id"]): r for r in rows("pokemon")}
items_csv = {i(r["id"]): r["identifier"].replace("-", "_") for r in rows("items")}
moves_csv = {i(r["id"]): r["identifier"].replace("-", "_") for r in rows("moves")}

# --- Movimientos (del catálogo) ---
moves = {}
for m in d["moves"]:
    moves[m["id"]] = [m["name"], m["type"], m["category"], m["power"] or 0, m["accuracy"] or 0, m["pp"], m["priority"]]

# --- Efectos de movimientos (estados, cambios de stats, drenar, curar) ---
moves_by_ident = {r["identifier"].replace("-", "_"): r for r in rows("moves")}
meta = {i(r["move_id"]): r for r in rows("move_meta")}
stat_ch = collections.defaultdict(list)
for r in rows("move_meta_stat_changes"):
    stat_ch[i(r["move_id"])].append([i(r["stat_id"]), i(r["change"])])
AIL = {1: "par", 2: "slp", 3: "frz", 4: "brn", 5: "psn", 6: "cnf"}
for mid, mv in moves.items():
    r = moves_by_ident.get(mid)
    if not r:
        continue
    num = i(r["id"])
    mm = meta.get(num, {})
    fx = {}
    ail = i(mm.get("meta_ailment_id"), 0)
    if ail in AIL:
        fx["a"] = AIL[ail]
        fx["ac"] = i(mm.get("ailment_chance"), 0) or (100 if mv[3] == 0 else 0)
        if mid in ("toxic",):
            fx["a"] = "tox"
    if stat_ch.get(num):
        fx["s"] = stat_ch[num]
        fx["sc"] = i(mm.get("stat_chance"), 0) or (100 if mv[3] == 0 else 0)
        fx["self"] = 1 if r["target_id"] in ("7", "4", "13") else 0
    for k, col in (("dr", "drain"), ("hl", "healing"), ("fl", "flinch_chance")):
        v = i(mm.get(col), 0)
        if v:
            fx[k] = v
    if i(mm.get("min_hits"), 0) and i(mm.get("max_hits"), 0) > 1:
        fx["h"] = [i(mm["min_hits"]), i(mm["max_hits"])]
    if fx:
        mv.append(fx)

# --- Tabla de tipos ---
types = {i(r["id"]): r["identifier"] for r in rows("types")}
chart = collections.defaultdict(dict)
for r in rows("type_efficacy"):
    a, t, f = types[i(r["damage_type_id"])], types[i(r["target_type_id"])], i(r["damage_factor"])
    if a in ("shadow", "unknown", "stellar") or t in ("shadow", "unknown", "stellar"):
        continue
    if f != 100:
        chart[a][t] = f / 100

# --- Curvas de experiencia ---
growth = collections.defaultdict(lambda: [0] * 101)
for r in rows("experience"):
    lv = i(r["level"])
    if lv <= 100:
        growth[i(r["growth_rate_id"])][lv] = i(r["experience"])

# --- Learnsets por nivel (Cristal > Oro/Plata > Amarillo > Rojo/Azul > Esmeralda > RF/VH) ---
VG_PREF = [4, 3, 2, 1, 6, 5, 7]
learn = collections.defaultdict(lambda: collections.defaultdict(list))
for r in rows("pokemon_moves"):
    if r["pokemon_move_method_id"] != "1":
        continue
    pid = i(r["pokemon_id"])
    if pid > 251:
        continue
    vg = i(r["version_group_id"])
    if vg not in VG_PREF:
        continue
    mid = moves_csv.get(i(r["move_id"]))
    if mid in moves:
        learn[pid][vg].append((max(1, i(r["level"], 1)), mid))

# --- Evoluciones ---
evo = collections.defaultdict(list)
for r in rows("pokemon_evolution"):
    to = sp_by_id.get(i(r["evolved_species_id"]))
    if not to or to not in species_csv or i(species_csv[to]["id"]) > 251:
        continue
    frm = species_csv[to]["evolves_from_species_id"]
    if not frm:
        continue
    frm = sp_by_id[i(frm)]
    trig = i(r["evolution_trigger_id"])
    e = {"to": to}
    if trig == 1:
        if r["minimum_level"]:
            e["lv"] = i(r["minimum_level"])
        elif r["minimum_happiness"]:
            e["lv"] = 22  # amistad -> nivel fijo
            if r["time_of_day"]:
                e["time"] = r["time_of_day"]
        else:
            e["lv"] = 30
        if r["relative_physical_stats"]:
            e["stats"] = i(r["relative_physical_stats"])
    elif trig == 2:
        e["item"] = items_csv.get(i(r["held_item_id"])) or "link_cable"
        if e["item"] != "link_cable":
            e["item"] = e["item"]  # Rey Roca, Revestimiento Metálico, etc.
    elif trig == 3:
        e["item"] = items_csv[i(r["trigger_item_id"])]
    else:
        continue
    if not any(x["to"] == to for x in evo[frm]):
        evo[frm].append(e)

# --- Especies ---
species = {}
for s in d["species"]:
    c = species_csv[s["id"]]
    pid = i(c["id"])
    p = poke_csv[pid]
    ls = []
    for vg in VG_PREF:
        if learn[pid].get(vg):
            ls = sorted(set(learn[pid][vg]))
            break
    b = s["baseStats"]
    species[s["id"]] = {
        "n": s["name"], "d": s["dexNumber"], "t": s["types"],
        "b": [b["hp"], b["attack"], b["defense"], b["spAttack"], b["spDefense"], b["speed"]],
        "c": i(c["capture_rate"]), "x": i(p["base_experience"], 60), "g": i(c["growth_rate_id"]),
        "L": ls, "e": evo.get(s["id"], []),
        "leg": 1 if c["is_legendary"] == "1" or c["is_mythical"] == "1" else 0,
    }

# --- Encuentros por zona ---
locs = {i(r["id"]): r["identifier"] for r in rows("locations")}
areas = {i(r["id"]): i(r["location_id"]) for r in rows("location_areas")}
slots = {i(r["id"]): i(r["rarity"]) for r in rows("encounter_slots")}
REGION_VERS = {"kanto": [1, 2, 3, 6, 10, 11], "johto": [4, 5, 6], "hoenn": [7, 8, 9]}
enc_by_loc = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 999, 0]))
enc_rows = rows("encounters")
OVERRIDE = {
    "victory_road": "kanto-victory-road-2", "union_cave_b2f": "union-cave", "route_40": "johto-sea-route-40",
    "route_41": "johto-sea-route-41", "dark_cave_blackthorn": "dark-cave", "route_27": "kanto-route-27",
    "route_26": "kanto-route-26", "route_28": "kanto-route-28", "whirl_islands_depths": "whirl-islands",
    "mt_mortar_upper": "mt-mortar", "mt_silver_summit": "mt-silver", "route_104_north": "hoenn-route-104",
    "route_111_desert": "hoenn-route-111", "route_112_north": "hoenn-route-112",
    "route_126_underwater": "hoenn-route-126", "ever_grande_city_south": "ever-grande-city",
    "meteor_falls_back": "meteor-falls", "hoenn_safari_zone_expansion": "hoenn-safari-zone",
    "abandoned_ship_hold": "abandoned-ship", "scorched_slab": "scorched-slab", "sky_pillar_3f": "sky-pillar",
    "sky_pillar_5f": "sky-pillar",
}
name_to_loc = {v: k for k, v in locs.items()}
valid_ids = {i(species_csv[s]["id"]) for s in species}

def zone_loc(z):
    zid = z["id"].replace("_", "-")
    r = z["region"]
    cands = [OVERRIDE.get(z["id"], ""), zid, f"{r}-{zid}"]
    if zid.startswith("sea-route"):
        n = zid.split("-")[-1]
        cands += [f"{r}-sea-route-{n}", f"{r}-route-{n}"]
    for c in cands:
        if c in name_to_loc:
            return name_to_loc[c]
    return None

zone_loc_id = {z["id"]: zone_loc(z) for z in d["zones"]}
wanted = {}
for z in d["zones"]:
    if zone_loc_id[z["id"]]:
        wanted[(zone_loc_id[z["id"]], z["region"])] = None
for e in enc_rows:
    pid = i(e["pokemon_id"])
    if pid not in valid_ids:
        continue
    loc = areas[i(e["location_area_id"])]
    v = i(e["version_id"])
    for reg, vs in REGION_VERS.items():
        if v in vs and (loc, reg) in wanted:
            acc = enc_by_loc[(loc, reg)][sp_by_id[pid]]
            acc[0] += slots.get(i(e["encounter_slot_id"]), 10)
            acc[1] = min(acc[1], i(e["min_level"]))
            acc[2] = max(acc[2], i(e["max_level"]))

zones = {}
for z in d["zones"]:
    lr = z["levelRange"] or {}
    zones[z["id"]] = {
        "n": z["name"], "r": z["region"], "k": z["kind"], "h": 1 if z["huntable"] else 0,
        "lv": [lr.get("min", 0), lr.get("max", 0)],
        "x": sorted({e["targetZoneId"] for e in z["map"]["exits"]}),
        "E": [],
    }
    L = zone_loc_id[z["id"]]
    pool = enc_by_loc.get((L, z["region"])) if L else None
    if pool:
        pool = {s: a for s, a in pool.items() if not species[s]["leg"]}
    if pool:
        for a in pool.values():
            a[2] = min(a[2], a[1] + 8)  # evita rangos raros (pesca/surf mezclados)
        tot = sum(a[0] for a in pool.values())
        zones[z["id"]]["E"] = sorted(([s, round(1000 * a[0] / tot), a[1], a[2]] for s, a in pool.items()), key=lambda x: -x[1])

# Zonas cazables sin tabla: heredar de vecinas
for _ in range(4):
    for zid, z in zones.items():
        if z["h"] and not z["E"]:
            for n in z["x"]:
                if zones.get(n, {}).get("E"):
                    z["E"] = zones[n]["E"]
                    break
# Último recurso: especies por tipo de terreno de la región
KIND_TYPES = {"cave": ["rock", "ground"], "water": ["water"], "forest": ["bug", "grass"], "dungeon": ["ghost", "poison", "psychic"]}
for zid, z in zones.items():
    if z["h"] and not z["E"]:
        tys = KIND_TYPES.get(z["k"], ["normal", "flying"])
        pool = [s for s, v in species.items() if set(v["t"]) & set(tys) and not v["leg"] and not species_csv[s]["evolves_from_species_id"]][:8]
        z["E"] = [[s, 125, max(2, z["lv"][0]), max(5, z["lv"][1])] for s in pool]
    # Rango de nivel de la zona si no venía
    if z["h"] and not z["lv"][1] and z["E"]:
        z["lv"] = [min(e[2] for e in z["E"]), max(e[3] for e in z["E"])]

# --- Objetos (sin nada del Vault/cripto) ---
CRYPTO = {"vault_incense", "vault_super_incense"}
PRICES = {"poke_ball": 200, "great_ball": 600, "ultra_ball": 1200, "potion": 300, "super_potion": 700,
          "hyper_potion": 1200, "revive": 1500, "lure_incense": 800, "repel": 400, "lucky_egg": 5000,
          "link_cable": 3000, "level_ball": 900, "lure_ball": 900, "moon_ball": 900, "friend_ball": 900,
          "love_ball": 900, "fast_ball": 900, "heavy_ball": 900}
items = {}
for it in d["items"]:
    if it["id"] in CRYPTO:
        continue
    price = PRICES.get(it["id"])
    if price is None and it["category"] == "material":
        price = 2100 if it["id"].endswith("_stone") else 1500
    items[it["id"]] = {"n": it["name"], "k": it["category"], "p": price or 1000,
                       "m": it["catchMultiplierPermille"], "rv": it["reviveHpPermille"]}
# Evoluciones que piden objetos que el catálogo no trae
for s in species.values():
    for e in s["e"]:
        if "item" in e and e["item"] not in items:
            items[e["item"]] = {"n": e["item"].replace("_", " ").title(), "k": "material", "p": 2100, "m": None, "rv": None}

data = {
    "species": species, "moves": moves, "chart": chart, "growth": {k: v for k, v in growth.items()},
    "zones": zones, "items": items, "natures": [n if isinstance(n, str) else n.get("id") for n in d["natures"]],
    "starters": [s["species"]["id"] for s in d["starters"]], "combat": d["sheetRules"]["combat"],
}
with open(OUT, "w", encoding="utf-8") as f:
    f.write("window.GAME_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")

hz = [z for z in zones.values() if z["h"]]
print("especies", len(species), "sin learnset", [k for k, v in species.items() if not v["L"]][:10])
print("con evolución", sum(1 for v in species.values() if v["e"]))
print("zonas cazables", len(hz), "vacías", sum(1 for z in hz if not z["E"]))
print("objetos", len(items))
print("ruta 1:", zones["route_1"]["E"][:6], zones["route_1"]["lv"])
print("bosque verde:", zones["viridian_forest"]["E"][:6])
