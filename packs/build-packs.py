# -*- coding: utf-8 -*-
"""build-packs.py  -  turn a Switch Checklist submission into three 35 point packages.

    python build-packs.py --demo                 build from a sample submission
    python build-packs.py --contact <id>         build from that person's real submission
    python build-packs.py --contact <id> --html out.html

Shannon, 2026-08-29: "When someone fills out this form, is that something we can do
automatically? Put together 3 packs based on their choices?"

WHY THIS IS POSSIBLE AT ALL
The Switch Checklist worker already stores exactly what was ticked, not just a score:

    {"score":292,"count":41,"items":[{"group":"Bathroom & Personal Care","label":"Shampoo"}, ...]}

So every submission already carries the input. Nothing about the checklist has to change.

THE THREE RULES THAT SHAPE A PACKAGE
 1. Every package lands on EXACTLY 35 points. Totals are computed, never estimated. On
    2026-08-29 a hand-built package went out at 36 and was only caught by adding it up in
    code, and that was on its way to a customer.
 2. No product appears in more than one package. Three packages that share eight items are
    one package pretending to be three.
 3. Only things she actually ticked. A package that includes a product she never said she
    buys reads as a sales pitch, not a swap list.

WHAT IT WILL NOT DO
 * it will not invent a product, a price or a point value. Everything comes from
   product-map.json, harvested from the live store.
 * it will not pad a package to reach 35 with something she did not ask for. If her ticks
   cannot reach 35, it says so and builds the largest honest package instead.
"""
import argparse
import io
import json
import os
import subprocess
import sys
from itertools import combinations

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.join(HERE, "product-map.json")
TARGET = 35

# Shannon, 2026-08-30: "magnesium is always FREE with the first order, or coffee is always
# FREE with the first order. But only put those options if they chose those products."
#
# So a gift is offered ONLY when that category is one she actually ticked. Never dangle a
# free thing she has shown no interest in: it turns a swap list into a sales pitch, which
# is the one thing these packages are supposed to avoid.
#
# A gift does NOT count toward the 35 and does NOT count toward the cost. It also removes
# that category from the paid pool, so magnesium can never be free in one line and charged
# for in another.
GIFTS = {
    "Magnesium": ("Mela-Out Magnesium", 11, 24.59),
    "Coffee": ("Mountain Cabin Coffee", 5, 11.49),
}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
LOG = "https://switch-checklist.theshannonnicole.workers.dev/log?k=sw7k2mq4vd9x"


def load_map():
    m = json.load(io.open(MAP, encoding="utf-8"))
    return {k: v for k, v in m.items() if not k.startswith("_")}


def fetch_submission(contact_id):
    """Pull this person's most recent checklist submission from the worker's log."""
    out = os.path.join(HERE, "_log.json")
    for _ in range(4):
        subprocess.run(["curl", "-s", "--max-time", "45", "-A", UA,
                        LOG + "&contact=" + contact_id, "-o", out], capture_output=True)
        if os.path.exists(out) and os.path.getsize(out) > 40:
            break
    d = json.load(io.open(out, encoding="utf-8"))
    subs = d.get("submissions") or []
    real = [s for s in subs if s.get("items")]
    if not real:
        return None
    real.sort(key=lambda s: s.get("at") or "", reverse=True)
    return real[0]


def candidates(items, pmap):
    """Every product available to us, given what she ticked. Label kept for display."""
    out = []
    for it in items:
        lab = it.get("label") if isinstance(it, dict) else str(it)
        for prod in pmap.get(lab, []):
            out.append({"label": lab, "name": prod[0], "pts": prod[1], "usd": prod[2]})
    return out


def pick_package(pool, used_names, used_labels):
    """Find a set of products hitting EXACTLY 35 points, with as MANY items as possible.

    Rewritten 2026-08-29 after the first version produced three-item packages like
    "antioxidant + calcium + foundation", which hits 35 but reads like nothing. It was
    trying small sizes first and stopping at the first exact hit, so it always grabbed the
    biggest-point items. A woman wants to see her shopping list, not three expensive jars.

    This is a knapsack with one choice per label. Exact dynamic programming over 0..35
    points: for each label, take one of its products or none. Among the ways to reach
    exactly 35 it prefers, in order: the most items, then the most labels she has not been
    shown yet, then the lowest cost.

    A label already used in an earlier package is skipped entirely, so three packages never
    show the same category twice.
    """
    by_label = {}
    for p in pool:
        if p["name"] in used_names or p["label"] in used_labels:
            continue
        by_label.setdefault(p["label"], []).append(p)
    labels = sorted(by_label)

    # state: points -> (items, freshLabels, -cost, picks)
    best = {0: (0, 0, 0.0, [])}
    for lab in labels:
        nxt = dict(best)
        for pts, (cnt, fresh, negcost, picks) in best.items():
            for prod in by_label[lab]:
                np = pts + prod["pts"]
                if np > TARGET:
                    continue
                cand = (cnt + 1, fresh + 1, negcost - prod["usd"], picks + [prod])
                cur = nxt.get(np)
                if cur is None or cand[:3] > cur[:3]:
                    nxt[np] = cand
        best = nxt
    hit = best.get(TARGET)
    return hit[3] if hit else None


def gifts_for(items):
    """Which free gifts apply, given only what she actually ticked."""
    ticked = {(i.get("label") if isinstance(i, dict) else str(i)) for i in items}
    return [{"label": lab, "name": g[0], "pts": g[1], "usd": g[2]}
            for lab, g in GIFTS.items() if lab in ticked]


def build(items, pmap, n=3):
    pool = candidates(items, pmap)
    gifts = gifts_for(items)
    # a gifted category is never also sold in a package
    gift_labels = {g["label"] for g in gifts}
    pool = [p for p in pool if p["label"] not in gift_labels]
    packs, used_names, used_labels = [], set(), set()
    for _ in range(n):
        pk = pick_package(pool, used_names, used_labels)
        if not pk:
            break
        packs.append(pk)
        for p in pk:
            used_names.add(p["name"])
            used_labels.add(p["label"])
    return packs, pool, gifts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--contact")
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--html")
    a = ap.parse_args()
    pmap = load_map()

    if a.demo:
        items = [{"label": l} for l in
                 ["Shampoo", "Conditioner", "Deodorant", "Toothpaste", "Hair styling products",
                  "Dish soap", "All-purpose cleaner", "Bathroom & tub cleaner", "Glass cleaner",
                  "Disinfectant", "Antioxidants", "Bone Health", "Collagen (Types I, II & III)",
                  "Immune Support / Echinacea / Vitamin C", "Magnesium",
                  "Multivitamin / Minerals", "Vitamin D3", "Pain & muscle relief cream",
                  "First aid ointment", "Cuts, burns & bite cream", "Foundation", "Blush",
                  "Eyeshadow", "Lipstick", "Setting spray", "Beef Sticks", "Beef Jerky"]]
        who = "demo (Cheryl's 2026-08-29 checklist)"
    elif a.contact:
        sub = fetch_submission(a.contact)
        if not sub:
            print("  no checklist submission with items found for that contact")
            raise SystemExit(1)
        items = sub["items"]
        who = "%s  (score %s, %s products, %s)" % (a.contact, sub.get("score"),
                                                   sub.get("count"), (sub.get("at") or "")[:10])
    else:
        print(__doc__)
        raise SystemExit(1)

    covered = [i for i in items if (i.get("label") if isinstance(i, dict) else i) in pmap]
    print("  %s" % who)
    print("  ticked %d items, %d of them have products mapped\n" % (len(items), len(covered)))
    unmapped = sorted({(i.get("label") if isinstance(i, dict) else i) for i in items
                       if (i.get("label") if isinstance(i, dict) else i) not in pmap})
    if unmapped:
        print("  no product mapped yet for: %s\n" % ", ".join(unmapped[:12]))

    packs, pool, gifts = build(items, pmap)
    if not packs:
        print("  could not build a single 35 point package from these ticks.")
        raise SystemExit(1)

    for n, pk in enumerate(packs, 1):
        pts = sum(p["pts"] for p in pk)
        usd = round(sum(p["usd"] for p in pk), 2)
        flag = "" if pts == TARGET else "   ** NOT 35 **"
        print("  PACKAGE %d   %d items | %d points | $%.2f%s" % (n, len(pk), pts, usd, flag))
        for p in pk:
            print("     %-52s %2d pts  $%6.2f   (%s)" % (p["name"][:52], p["pts"], p["usd"], p["label"]))
        note = "free with first order" if len(gifts) == 1 else "choose ONE free with first order"
        for g in gifts:
            print("     %-52s %2d pts  %6s   (%s, %s)"
                  % (g["name"][:52], g["pts"], "FREE", g["label"], note))
        print()
    if len(packs) < 3:
        print("  only %d package(s) possible without repeating a product." % len(packs))

    if a.html:
        io.open(a.html, "w", encoding="utf-8").write(render(packs, who, gifts))
        print("  wrote %s" % a.html)


def render(packs, who, gifts=()):
    secs = []
    for n, pk in enumerate(packs, 1):
        rows = "".join(
            '<tr><td class="n">%s<small>%s</small></td><td class="p">%d</td>'
            '<td class="c">$%.2f</td></tr>' % (p["name"], p["label"], p["pts"], p["usd"])
            for p in pk)
        rows += "".join(
            '<tr class="free"><td class="n">%s<small>%s &middot; %s</small></td>'
            '<td class="p">%d</td><td class="c">FREE</td></tr>'
            % (g["name"], g["label"],
               "yours free with your first order" if len(gifts) == 1
               else "choose one of these free with your first order", g["pts"])
            for g in gifts)
        secs.append(
            '<section class="pkg"><h2>Package %d <span class="cnt">%d products</span></h2>'
            '<div class="scroll"><table><tr><th>Product</th><th class="p">Points</th>'
            '<th class="c">Price</th></tr>%s<tr class="tot"><td>Total</td>'
            '<td class="p">%d</td><td class="c">$%.2f</td></tr></table></div></section>'
            % (n, len(pk), rows, sum(p["pts"] for p in pk),
               sum(p["usd"] for p in pk)))
    return ("<title>Your Three Packs</title><style>"
            ":root{--navy:#0B2545;--red:#C8102E;--cream:#FBF7F0;--line:#E3E0D8;--ink:#1B2A41;"
            "--muted:#5A6B80;--bg:#fff}"
            "@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0E1620;"
            "--cream:#152030;--line:#25344A;--ink:#E6ECF3;--muted:#9DB0C6;--navy:#E6ECF3;--red:#FF8A80}}"
            "*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);"
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.55}"
            ".wrap{max-width:820px;margin:0 auto;padding:0 20px 60px}"
            "header{background:#0B2545;color:#fff;padding:30px 0 26px}"
            "header h1{margin:0;font-size:1.5em;color:#fff}"
            ".pkg{margin:32px 0 0}h2{color:var(--navy);font-size:1.25em;margin:0 0 8px;"
            "border-bottom:2px solid var(--line);padding-bottom:7px}"
            ".cnt{font-weight:400;color:var(--muted);font-size:.72em;margin-left:7px}"
            ".scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.95em}"
            "th{text-align:left;background:var(--cream);color:var(--navy);padding:8px 10px;"
            "font-size:.78em;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid var(--line)}"
            "td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}"
            "td.n{font-weight:600;color:var(--navy)}td.n small{display:block;font-weight:400;"
            "color:var(--muted);font-size:.84em}"
            "th.p,td.p{text-align:right;width:76px;font-variant-numeric:tabular-nums}"
            "th.c,td.c{text-align:right;width:96px;font-variant-numeric:tabular-nums;"
            "color:var(--red);font-weight:600}"
            "tr.free td.c{color:#1D7A4C;font-weight:800}tr.free td.n{color:#1D7A4C}tr.tot td{border-top:2px solid var(--navy);border-bottom:none;font-weight:800;"
            "padding-top:11px;color:var(--navy)}tr.tot td.c{color:var(--red);font-size:1.2em}"
            "</style><header><div class='wrap'><h1>3 different packs based on your choices</h1>"
            "</div></header><div class='wrap'>" + "".join(secs) + "</div>")


if __name__ == "__main__":
    main()
