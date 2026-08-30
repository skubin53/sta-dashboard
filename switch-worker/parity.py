# -*- coding: utf-8 -*-
"""parity.py  -  prove the Worker's JavaScript builds the SAME packages as the Python.

    python parity.py

The Python in sta-tools/packs/build-packs.py is what Shannon has been reviewing on paper.
The JavaScript in the Worker is what a real woman will actually receive. If those two ever
disagree, the thing she approved is not the thing that went out.

The subtle way they can disagree: the Python walks a dict keyed by an integer number of
points, and Python dicts iterate in insertion order. A JavaScript object iterates
integer-like keys in ascending numeric order instead. When two baskets tie, the first one
seen wins, so that difference silently changes which package a woman gets. The Worker uses
a Map to avoid it. This script is what proves the Map actually did its job.
"""
import importlib.util
import io
import json
import os
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
PY_SRC = os.path.join(HERE, "..", "packs", "build-packs.py")
JS_MOD = os.path.join(HERE, "packs-test.mjs").replace("\\", "/")

sys.argv = ["parity"]
spec = importlib.util.spec_from_file_location("bp", PY_SRC)
bp = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(bp)
except SystemExit:
    pass
PMAP = bp.load_map()

ALL = list(PMAP.keys())

CASES = [
    ("empty", []),
    ("one item", ["Shampoo"]),
    ("unmapped only", ["Sunscreen", "Cat food", "Tyres"]),
    ("cannot reach 35", ["Deodorant", "Toothpaste"]),
    ("magnesium only", ["Shampoo", "Conditioner", "Deodorant", "Toothpaste",
                        "Dish soap", "Magnesium", "Bone Health", "Vitamin D3"]),
    ("coffee only", ["Shampoo", "Conditioner", "Deodorant", "Toothpaste",
                     "Dish soap", "Coffee", "Bone Health", "Vitamin D3"]),
    ("both gifts", ["Shampoo", "Conditioner", "Deodorant", "Toothpaste",
                    "Dish soap", "Coffee", "Magnesium", "Bone Health", "Vitamin D3"]),
    ("neither gift", ["Shampoo", "Conditioner", "Deodorant", "Toothpaste",
                      "Dish soap", "Bone Health", "Vitamin D3", "Blush"]),
    ("duplicate labels", ["Shampoo", "Shampoo", "Shampoo", "Conditioner", "Conditioner",
                          "Deodorant", "Toothpaste", "Dish soap", "Bone Health"]),
    ("bare strings", ["Shampoo", "Conditioner", "Deodorant", "Toothpaste", "Dish soap",
                      "All-purpose cleaner", "Glass cleaner", "Bone Health"]),
    ("everything", ALL),
    ("everything minus gifts", [x for x in ALL if x not in ("Magnesium", "Coffee")]),
    ("cheryl 2026-08-29", ["Shampoo", "Conditioner", "Deodorant", "Toothpaste",
        "Hair styling products", "Dish soap", "All-purpose cleaner",
        "Bathroom & tub cleaner", "Glass cleaner", "Disinfectant", "Antioxidants",
        "Bone Health", "Collagen (Types I, II & III)",
        "Immune Support / Echinacea / Vitamin C", "Magnesium", "Multivitamin / Minerals",
        "Vitamin D3", "Pain & muscle relief cream", "First aid ointment",
        "Cuts, burns & bite cream", "Foundation", "Blush", "Eyeshadow", "Lipstick",
        "Setting spray", "Beef Sticks", "Beef Jerky"]),
    ("makeup heavy", ["Foundation", "Primer", "Blush", "Eyeshadow", "Mascara",
                      "Lipstick", "Setting spray"]),
    ("cleaning heavy", ["Laundry detergent", "Fabric softener", "Dryer sheets",
        "Laundry stain remover", "Dish soap", "Dishwasher detergent",
        "All-purpose cleaner", "Bathroom & tub cleaner", "Glass cleaner",
        "Toilet bowl cleaner", "Floor cleaner", "Disinfectant", "Cleaning wipes"]),
]


def norm(packs):
    """Reduce to the only thing that matters: which products, in which order."""
    return {"packs": [[[p["name"], p["label"], p["pts"], round(float(p["usd"]), 2)]
                       for p in pk] for pk in packs]}


def run_py(labels):
    items = [{"label": l} for l in labels]
    packs, _pool = bp.build(items, PMAP)
    return norm(packs)


def run_js(cases):
    """One node process for all cases, so this is not sixteen cold starts."""
    tmp = os.path.join(HERE, "_parity_cases.json")
    io.open(tmp, "w", encoding="utf-8").write(json.dumps(cases))
    r = subprocess.run(
        ["node", os.path.join(HERE, "parity-run.mjs"), tmp, "file:///" + JS_MOD],
        capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        print("  node failed:")
        print((r.stderr or "")[:900])
        raise SystemExit(1)
    os.remove(tmp)
    return json.loads(r.stdout)


def canon(res):
    """Compare on money as a fixed 2 decimal STRING.

    The first run of this script reported seven failures that were all Python writing
    20.0 where JavaScript writes 20. Same number, different serialiser. Comparing raw
    JSON text tests the two languages' float printers, not the packages, and would have
    sent me editing working code.
    """
    def row(r):
        return [r[0], r[1], int(r[2]), "%.2f" % float(r[3])]
    return {"packs": [[row(x) for x in pk] for pk in res["packs"]]}


def main():
    js = run_js({name: labels for name, labels in CASES})
    ok = bad = 0
    for name, labels in CASES:
        p = run_py(labels)
        j = js[name]
        same = canon(p) == canon(j)
        shape = "%d pack(s)" % len(p["packs"])
        if p["packs"]:
            shape += ", %s" % "/".join(str(len(x)) for x in p["packs"]) + " items"
        if same:
            ok += 1
            print("  PASS  %-24s %s" % (name, shape))
        else:
            bad += 1
            print("  FAIL  %-24s" % name)
            print("        python: %s" % json.dumps(p)[:400])
            print("        js    : %s" % json.dumps(j)[:400])

    # every package must be exactly 35, in both implementations
    off = []
    for name, labels in CASES:
        for src, res in (("py", run_py(labels)), ("js", js[name])):
            for n, pk in enumerate(res["packs"], 1):
                t = sum(x[2] for x in pk)
                if not (35 <= t <= 37):
                    off.append("%s %s pack%d = %d" % (name, src, n, t))
    print("\n  %d passed, %d failed" % (ok, bad))
    print("  packages outside 35 to 37 points: %s" % (", ".join(off) if off else "none"))
    if bad or off:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
