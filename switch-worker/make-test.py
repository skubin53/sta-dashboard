# -*- coding: utf-8 -*-
"""make-test.py  -  build packs-test.mjs from the SAME src parts that build worker.js.

The point is that the thing checked for parity against the Python is the exact code that
ships, not a hand-kept copy that quietly drifts away from it.
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
MAP = os.path.join(HERE, "..", "packs", "product-map.json")

raw = json.load(io.open(MAP, encoding="utf-8"))
pmap = {k: v for k, v in raw.items() if not k.startswith("_")}
js_map = "{\n" + "\n".join(
    "  %s: %s," % (json.dumps(k), json.dumps(v)) for k, v in pmap.items()) + "\n}"

parts = [io.open(os.path.join(SRC, f), encoding="utf-8").read()
         for f in ("01-head.js", "02-packs.js", "03-page.js")]
t = re.sub(r"/\*__PRODUCT_MAP__\*/.*?/\*__END__\*/", lambda m: js_map,
           "\n".join(parts), flags=re.S)
t += "\nexport { buildPacks, candidates, pickPackage, renderPage, PRODUCT_MAP };\n"

out = os.path.join(HERE, "packs-test.mjs")
io.open(out, "w", encoding="utf-8", newline="\n").write(t)
print("  packs-test.mjs: %d bytes, %d labels" % (len(t), len(pmap)))
