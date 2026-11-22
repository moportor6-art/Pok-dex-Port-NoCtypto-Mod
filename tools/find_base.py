"""Busca la versión base: la última con la misma huella nativa que publicó files.json (su APK es la referencia
de los parches). Baja su files.json.

Uso: python3 tools/find_base.py <huella> <carpeta>   → imprime el build base (0 si no hay)
"""
import json, os, subprocess, sys

native, dest = sys.argv[1], sys.argv[2]
repo = os.environ["GITHUB_REPOSITORY"]
try:
    rels = json.loads(subprocess.check_output(["gh", "api", f"repos/{repo}/releases?per_page=50"]))
except Exception:
    rels = []
cands = []
for r in rels:
    tag = r["tag_name"]
    if not tag.startswith("build-"):
        continue
    names = {a["name"]: a for a in r["assets"]}
    if "contenido.json" in names and "files.json" in names:
        cands.append((int(tag[6:]), tag, names))
for b, tag, names in sorted(cands, reverse=True):
    raw = subprocess.check_output(["gh", "api", "-H", "Accept: application/octet-stream", names["contenido.json"]["url"]])
    if json.loads(raw).get("native") == native:
        os.makedirs(dest, exist_ok=True)
        subprocess.check_call(["gh", "release", "download", tag, "-R", repo, "-p", "files.json", "-D", dest, "--clobber"],
                              stdout=sys.stderr)
        print(b)
        sys.exit(0)
print(0)
