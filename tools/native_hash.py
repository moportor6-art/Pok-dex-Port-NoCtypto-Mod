"""Huella de la parte nativa: todo lo de android/ que va dentro de la APK (Java, manifiesto, recursos, Gradle).
Si cambia, la actualización tiene que ser la APK completa. El juego (game/) nunca cuenta.

Uso: python3 tools/native_hash.py android
"""
import hashlib, os, sys

root = sys.argv[1]
h = hashlib.sha256()
skip = {"build", ".gradle"}
for dp, dn, fn in os.walk(root):
    dn[:] = sorted(d for d in dn if d not in skip)
    for f in sorted(fn):
        p = os.path.join(dp, f)
        rel = os.path.relpath(p, root)
        if rel.endswith("BuildInfo.java"):
            continue
        h.update(rel.encode())
        h.update(open(p, "rb").read())
print(h.hexdigest()[:16])
