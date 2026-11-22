"""Lista de archivos del juego con su sha256 (para calcular parches).

Uso: python3 tools/files_json.py game salida.json
"""
import hashlib, json, os, sys

root, out = sys.argv[1], sys.argv[2]
files = {}
for dp, dn, fn in os.walk(root):
    for f in fn:
        p = os.path.join(dp, f)
        files[os.path.relpath(p, root).replace(os.sep, "/")] = hashlib.sha256(open(p, "rb").read()).hexdigest()
json.dump(dict(sorted(files.items())), open(out, "w"), indent=0)
print(len(files), "archivos")
