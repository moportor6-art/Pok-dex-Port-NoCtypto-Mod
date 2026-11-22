"""Escribe contenido.json (lo lee el actualizador de la app).

Uso: python3 tools/manifest.py <build> <huella> <apk> <salida> [--patch patch.zip <base>]
"""
import hashlib, json, os, sys


def info(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return {"size": os.path.getsize(p), "sha": h.hexdigest()}


a = sys.argv[1:]
m = {"build": int(a[0]), "native": a[1], "apk": info(a[2])}
rest = a[4:]
if rest[:1] == ["--patch"]:
    m["patch"] = dict(info(rest[1]), base=int(rest[2]))
json.dump(m, open(a[3], "w"), indent=1)
print(json.dumps(m, indent=1))
