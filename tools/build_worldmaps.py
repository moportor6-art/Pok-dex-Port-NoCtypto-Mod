"""Construye game/worldmaps.js con los mapas originales de Pokédex Idle (terreno, objetos, casas y edificios)
y copia el arte del mundo a game/assets/world/.

Uso: python3 tools/build_worldmaps.py <carpeta_worldart> <game/>

<carpeta_worldart> debe tener zones.json (definiciones extraídas del cliente original), los manifiestos
meadow-v1 / johto-v1 / hoenn-v1 / houses-v2 y sus imágenes (world-art/...).
"""
import json, os, shutil, sys

src, game = sys.argv[1], sys.argv[2]
zones = json.load(open(f"{src}/zones.json"))
catalog = json.load(open(f"{src}/../catalog.json"))
region_of = {z["id"]: z["region"] for z in catalog["zones"]}
SETS = {"kanto": "meadow-v1", "johto": "johto-v1", "hoenn": "hoenn-v1"}
out_assets = f"{game}/assets/world"
os.makedirs(out_assets, exist_ok=True)

# Atlas de objetos por región (y meadow como respaldo: tiene los edificios principales)
atlas = {}
for reg, s in SETS.items():
    m = json.load(open(f"{src}/{s}/manifest.json"))
    atlas[s] = m["atlas"]["frames"]
    os.makedirs(f"{out_assets}/{s}", exist_ok=True)
    for f in ("terrain.png", "water.png", "props.png"):
        shutil.copy(f"{src}/world-art/{s}/{f}", f"{out_assets}/{s}/{f}")

houses = json.load(open(f"{src}/houses-v2/manifest.json"))["lots"]
used_house = set()

def art_for(kind, zid, reg):
    """Edificio de servicio: primero el propio de la ciudad, luego el de la región, luego el genérico."""
    city = zid.replace("_city", "").replace("_town", "").replace("_island", "")
    s = SETS[reg]
    for name in (f"{kind}_{city}", f"{kind}_compact" if reg == "kanto" else f"{kind}_{reg}", f"{kind}_{reg}", kind):
        for st in (s, "meadow-v1"):
            if name in atlas[st]:
                return st, name
    return None, None

names, frames_used = [], {}
def idx(setname, name):
    key = f"{setname}:{name}"
    if key not in frames_used:
        frames_used[key] = len(names)
        names.append(key)
    return frames_used[key]

out = {}
missing = {}
for zid, d in zones.items():
    if zid not in region_of:
        continue
    reg = region_of[zid]; s = SETS[reg]
    T = {k: v for k, v in d["terrain"].items() if v}
    props = []
    for p in d["props"]:
        st = s if p["name"] in atlas[s] else "meadow-v1" if p["name"] in atlas["meadow-v1"] else None
        if not st:
            missing[p["name"]] = missing.get(p["name"], 0) + 1
            continue
        props.append([idx(st, p["name"]), p["x"], p["y"], 1 if p.get("flip") else 0])
    hs = []
    for h in d.get("houseLots", []):
        fp = h["facade"]["prop"]
        st = s if fp in atlas[s] else "meadow-v1" if fp in atlas["meadow-v1"] else None
        if st:   # la fachada del original está en el atlas de objetos
            props.append([idx(st, fp), h["facade"]["x"], h["facade"]["y"], 0])
            continue
        f = houses.get(h["houseId"])
        if not f:
            continue
        used_house.add(f)
        hs.append([f, h["facade"]["x"], h["facade"]["y"], [h["door"]["x"], h["door"]["y"], h["door"]["w"], h["door"]["h"]]])
    lm = []
    for l in d.get("landmarks", []):
        st, name = art_for(l["kind"], zid, reg)
        if name:
            lm.append([l["kind"], idx(st, name), l["x"], l["y"]])
    out[zid] = {"set": s, "w": d["geometry"]["width"], "h": d["geometry"]["height"], "gen": d["generator"],
                "t": T, "p": props, "hs": hs, "lm": lm}

# frames de cada objeto usado: [set, x, y, w, h]
frames = []
for key in names:
    st, name = key.split(":", 1)
    f = atlas[st][name]
    frames.append([st, f["x"], f["y"], f["w"], f["h"]])

for f in used_house:
    dst = f"{out_assets}/houses/{f}.png"
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy(f"{src}/world-art/houses-v2/{f}.png", dst)

with open(f"{game}/worldmaps.js", "w") as fh:
    fh.write("window.WORLD_ART=" + json.dumps({"frames": frames, "zones": out}, separators=(",", ":")) + ";\n")
print("zonas", len(out), "objetos distintos", len(frames), "casas", len(used_house),
      "objetos sin arte", sum(missing.values()), sorted(missing.items(), key=lambda x: -x[1])[:8])
