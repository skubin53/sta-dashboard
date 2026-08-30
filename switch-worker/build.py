# -*- coding: utf-8 -*-
"""build.py  -  assemble src/*.js into worker.js with the product map embedded.

The map is injected straight from product-map.json rather than retyped, because 45
categories of product names, point values and prices is exactly the kind of thing a
human copy retypes one digit wrong. JSON is valid JavaScript, so it drops in as is.
"""
import io, json, os, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "src")
MAP  = os.path.join(HERE, "..", "packs", "product-map.json")

raw = json.load(io.open(MAP, encoding="utf-8"))
pmap = {k: v for k, v in raw.items() if not k.startswith("_")}

# one label per line keeps the diff readable when prices are re-swept each month
lines = []
for k, v in pmap.items():
    lines.append("  %s: %s," % (json.dumps(k), json.dumps(v)))
js_map = "{\n" + "\n".join(lines) + "\n}"

parts = []
for f in sorted(os.listdir(SRC)):
    if f.endswith(".js"):
        parts.append(io.open(os.path.join(SRC, f), encoding="utf-8").read())
out = "\n".join(parts)

before = out
out = re.sub(r"/\*__PRODUCT_MAP__\*/.*?/\*__END__\*/", lambda m: js_map, out, flags=re.S)
if out == before:
    print("  FAILED: product map placeholder not found"); raise SystemExit(1)

if not out.isascii():
    bad = sorted({c for c in out if not c.isascii()})
    print("  FAILED: non-ascii in worker: %r" % bad); raise SystemExit(1)
for dash in ("\u2014", "\u2013"):
    if dash in out:
        print("  FAILED: em/en dash in copy"); raise SystemExit(1)

io.open(os.path.join(HERE, "worker.js"), "w", encoding="utf-8", newline="\n").write(out)
print("  worker.js written: %d bytes, %d lines" % (len(out), out.count("\n") + 1))
print("  product map: %d labels, %d products"
      % (len(pmap), sum(len(v) for v in pmap.values())))
