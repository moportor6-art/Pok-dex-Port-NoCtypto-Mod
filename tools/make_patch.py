"""Crea patch.zip con los archivos del juego que cambiaron respecto a la versión base.

Uso: python3 tools/make_patch.py game files_base.json files_actual.json patch.zip  → imprime cuántos archivos
"""
import json, os, sys, zipfile

root, base, cur, out = sys.argv[1:5]
b, c = json.load(open(base)), json.load(open(cur))
changed = [f for f, h in c.items() if b.get(f) != h]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in changed:
        z.write(os.path.join(root, f), f)
print(len(changed))
