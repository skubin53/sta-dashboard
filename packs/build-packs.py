# -*- coding: utf-8 -*-
"""build-packs.py  -  turn a Switch Checklist submission into three 35 to 37 point packages.

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
 1. Every package lands between 35 and 37 points. 35 is the qualifying number, so 36 and
    37 qualify too. Totals are computed, never estimated. On 2026-08-29 a hand-built
    package went out at 36 by accident and was only caught by adding it up in code, and
    that was on its way to a customer. Being deliberately in a range is not the same as
    not knowing the total.
 2. No product appears in more than one package. Three packages that share eight items are
    one package pretending to be three.
 3. Only things she actually ticked. A package that includes a product she never said she
    buys reads as a sales pitch, not a swap list.

WHAT IT WILL NOT DO
 * it will not invent a product, a price or a point value. Everything comes from
   product-map.json, harvested from the live store.
 * it will not pad a package into range with something she did not ask for. If her ticks
   cannot reach 35, it says so and builds nothing rather than inventing a list.
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

# Shannon, 2026-08-30: "I think all of these packs can be between 35 - 37 points."
#
# 35 is the qualifying number, so anything in 35..37 qualifies just the same. Demanding
# EXACTLY 35 was quietly throwing away good packages: a basket landing on 36 was discarded
# even when it was the better list. Her own example was Chad, whose laundry detergent kept
# falling out because at 10 points it rarely fits an exact 35.
TARGET_MIN = 35
TARGET_MAX = 37
TARGET = TARGET_MIN          # kept: other tools import this name

# Shannon, 2026-08-30: "there is no Laundry Detergent. That should always be in pack 1."
# If she ticked it, package 1 is built around it rather than hoping the arithmetic picks
# it up. Anything added here gets the same treatment.
PRIORITY_FIRST = ["Laundry detergent"]

# Shannon, 2026-08-30: "The beef cuts are Riverbend Ranch, which is why we are not
# including them. I want them on the list so they know we do offer that in our food
# aisles. But we just won't report on them."
#
# The checklist already says the same thing in data: the whole Beef group is
# {"unscored": true}, every cut is 0 points, and the group carries the note "Riverbend
# Ranch is a separate subscription with no product points." A 0 point item can never help
# reach 35, and it is a separate subscription, so it cannot go in a package at all.
#
# Excluded BY GROUP, not by listing the thirteen cuts. Add a new cut to the checklist and
# it is handled with no code change. Beef Tallow, Sticks and Jerky are NOT in this group,
# they are ordinary Food & Drinks products with real points, and they stay.
NEVER_IN_PACK_GROUPS = {"Beef"}

# Shannon, 2026-08-30: "yes please make one of her packs a beauty one."
#
# Marie ticked 21 makeup and skin care items and not one of them reached her page. Nothing
# was broken. The search prefers the MOST ITEMS, which is what Shannon asked for after the
# three-expensive-jars version, and beauty costs 7 to 18 points a product where a household
# item costs 2 or 3. So beauty loses every single comparison, and the woman who ticks the
# most makeup is the one guaranteed to see none of it.
#
# So one package is now built from this group alone, BEFORE the others, and only if her
# ticks can actually fill it to 35. If she ticked no beauty, or not enough of it, nothing
# changes and she gets three ordinary packages. Selected by GROUP, so it follows the
# checklist rather than a list of labels kept in step by hand.
THEME_GROUPS = ["Skin Care & Beauty"]


def in_pack_scope(item):
    """False for anything the packages must ignore. Not a gap, a deliberate exclusion."""
    if isinstance(item, dict) and item.get("group") in NEVER_IN_PACK_GROUPS:
        return False
    return True

# NO FREE-PRODUCT LOGIC LIVES HERE ANY MORE.
#
# It used to name magnesium and coffee as gifts. Shannon tested the live system on her own
# phone 2026-08-30 and found the fault: "It offered me coffee & magnesium both for FREE on
# all 3 packs. It's REALLY up to $20 in FREE product with each order. But coffee &
# Magnesium are not offered in Month 2 and 3."
#
# So the free product was never those two items. It is $20 of the customer's choice from a
# list Melaleuca changes every month. Hardcoding this month's names would go stale on the
# 1st and start promising people something they cannot have. The page states the $20 and
# names nothing, which is both simpler and the only version that stays true.
#
# Consequence: magnesium and coffee are ordinary paid products again, and can appear in a
# package like anything else she ticked.

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
# The ?k= is NOT written here. It used to be, and this file is committed to a public
# repo, so for a day anyone could read the key off raw.githubusercontent.com and open
# /log, which lists real women's names, contact ids and everything they ticked. Rotated
# 2026-08-30; the new key lives in sta-tools/.logkey, which is in no repository.
LOG_BASE = "https://switch-checklist.theshannonnicole.workers.dev/log"


def log_url():
    kf = os.path.join(os.path.dirname(HERE), ".logkey")
    if not os.path.exists(kf):
        raise SystemExit("  no sta-tools/.logkey, cannot read the submission log")
    return LOG_BASE + "?k=" + io.open(kf, encoding="utf-8").read().strip()


def load_map():
    m = json.load(io.open(MAP, encoding="utf-8"))
    return {k: v for k, v in m.items() if not k.startswith("_")}


def fetch_submission(contact_id):
    """Pull this person's most recent checklist submission from the worker's log.

    THE STALE CACHE THAT BUILT THE WRONG PERSON'S PACKAGES, 2026-08-30.
    This wrote the response to _log.json and broke out of the retry loop as soon as that
    file existed and was bigger than 40 bytes. It never deleted it first. So when curl
    failed, and curl fails here often, the check passed instantly against the PREVIOUS
    run's file and the packages were built from whoever was looked up last. Asking for
    Cheryl returned Chad's list, silently, with no error anywhere.

    Two fixes, because either alone is not enough: the file is deleted before the fetch,
    so a failure cannot be mistaken for a success, and the submission that comes back is
    checked to actually belong to the person who was asked for. Getting nothing is a fine
    outcome. Getting somebody else's shopping list and putting it in front of a customer
    is not.
    """
    out = os.path.join(HERE, "_log.json")
    if os.path.exists(out):
        os.remove(out)
    for _ in range(4):
        subprocess.run(["curl", "-s", "--max-time", "45", "-A", UA,
                        log_url() + "&contact=" + contact_id, "-o", out], capture_output=True)
        if os.path.exists(out) and os.path.getsize(out) > 40:
            break
    if not os.path.exists(out):
        print("  could not reach the log after 4 tries")
        return None
    d = json.load(io.open(out, encoding="utf-8"))
    subs = d.get("submissions") or []
    real = [s for s in subs if s.get("items")
            and s.get("contact_id") == contact_id]     # never accept a near miss
    if not real:
        return None
    real.sort(key=lambda s: s.get("at") or "", reverse=True)
    return real[0]


def candidates(items, pmap):
    """Every product available to us, given what she ticked. Label kept for display.

    Deduplicated on (label, product). A repeated tick adds nothing: the search already
    refuses to use one product twice, so a duplicate only makes the inner loop do the
    same work again. It matters because `items` arrives from a public form, and 2,850
    junk items took 2.4 seconds, which is real CPU on a Worker. Deduplicating bounds the
    pool at roughly 230 entries no matter how much is posted, and cannot change the
    result: the identical candidate can never beat the incumbent, the comparison is strict.
    """
    out = []
    seen = set()
    for it in items:
        if not in_pack_scope(it):
            continue
        lab = it.get("label") if isinstance(it, dict) else str(it)
        for prod in pmap.get(lab, []):
            key = (lab, prod[0])
            if key in seen:
                continue
            seen.add(key)
            out.append({"label": lab, "name": prod[0], "pts": prod[1], "usd": prod[2]})
    return out


def pick_package(pool, used_names, used_labels, force=None):
    """Find a set of products totalling 35 to 37 points, with as MANY items as possible.

    Rewritten 2026-08-29 after the first version produced three-item packages like
    "antioxidant + calcium + foundation", which hits 35 but reads like nothing. It was
    trying small sizes first and stopping at the first exact hit, so it always grabbed the
    biggest-point items. A woman wants to see her shopping list, not three expensive jars.

    This is a knapsack with one choice per label. Exact dynamic programming over 0..37
    points: for each label, take one of its products or none. Among every way to land in
    35..37 it prefers, in order: the most items, then the most labels she has not been
    shown yet, then the lowest cost. Cost is what separates a 35 from a 37 holding the
    same number of items.

    `force` pins one product into the package before the search starts, which is how
    laundry detergent always ends up in package 1.

    A label already used in an earlier package is skipped entirely, so three packages never
    show the same category twice.
    """
    by_label = {}
    for p in pool:
        if p["name"] in used_names or p["label"] in used_labels:
            continue
        by_label.setdefault(p["label"], []).append(p)

    # A forced product is placed first and its category taken off the table, so the rest
    # of the package is built around it instead of competing with it.
    if force is not None:
        if force["name"] in used_names or force["label"] in used_labels:
            return None
        by_label.pop(force["label"], None)
        start = (1, 1, -force["usd"], [force])
        start_pts = force["pts"]
    else:
        start = (0, 0, 0.0, [])
        start_pts = 0
    if start_pts > TARGET_MAX:
        return None
    labels = sorted(by_label)

    # state: points -> (items, freshLabels, -cost, picks)
    best = {start_pts: start}
    for lab in labels:
        nxt = dict(best)
        for pts, (cnt, fresh, negcost, picks) in best.items():
            for prod in by_label[lab]:
                np = pts + prod["pts"]
                if np > TARGET_MAX:
                    continue
                # One product can serve two categories: Tough & Tender Wipes is both the
                # all-purpose cleaner and the cleaning wipes. Without this, a man who
                # ticks both gets the same jar listed twice in one package at two
                # different lines, which reads as careless and pads the item count.
                # used_names only stops repeats BETWEEN packages; this stops them inside
                # one. Found on Chad's list 2026-08-29 before it went out.
                if any(p["name"] == prod["name"] for p in picks):
                    continue
                cand = (cnt + 1, fresh + 1, negcost - prod["usd"], picks + [prod])
                cur = nxt.get(np)
                if cur is None or cand[:3] > cur[:3]:
                    nxt[np] = cand
        best = nxt
    # Any total in 35..37 qualifies, so take the best of the three rather than insisting
    # on 35. Same preference as before: most items, then most fresh categories, then
    # cheapest. Cost is what separates a 35 from a 37 when both hold the same count.
    hits = [best[p] for p in range(TARGET_MIN, TARGET_MAX + 1) if p in best]
    if not hits:
        return None
    return max(hits, key=lambda h: h[:3])[3]


def build(items, pmap, n=3):
    pool = candidates(items, pmap)
    packs, used_names, used_labels = [], set(), set()

    # The themed package is built FIRST so it is not competing with cheap household items
    # for the same 35 points, but it is SHOWN LAST, so she still opens on the pack that
    # holds her detergent.
    themed = None
    for gname in THEME_GROUPS:
        labels = {it.get("label") for it in items
                  if isinstance(it, dict) and it.get("group") == gname}
        sub = [p for p in pool if p["label"] in labels]
        if not sub:
            continue
        got = pick_package(sub, used_names, used_labels)
        if got:
            themed = got
            for p in got:
                used_names.add(p["name"])
                used_labels.add(p["label"])
            n -= 1
            break
    for i in range(n):
        pk = None
        if i == 0:
            # Package 1 is built AROUND the priority products when she ticked them,
            # instead of leaving it to the arithmetic. Laundry detergent is 10 points and
            # kept losing to cheaper combinations, which is exactly how Chad ended up with
            # no detergent in a list where he had asked for it.
            for lab in PRIORITY_FIRST:
                options = [p for p in pool if p["label"] == lab]
                got = [pick_package(pool, used_names, used_labels, force=o) for o in options]
                got = [g for g in got if g]
                if got:
                    pk = max(got, key=lambda g: (len(g), -sum(x["usd"] for x in g)))
                    break
        if pk is None:
            pk = pick_package(pool, used_names, used_labels)
        if not pk:
            break
        packs.append(pk)
        for p in pk:
            used_names.add(p["name"])
            used_labels.add(p["label"])
    if themed:
        packs.append(themed)
    return packs, pool


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
                       if in_pack_scope(i)
                       and (i.get("label") if isinstance(i, dict) else i) not in pmap})
    if unmapped:
        print("  no product mapped yet for: %s\n" % ", ".join(unmapped[:12]))

    packs, pool = build(items, pmap)
    if not packs:
        print("  could not build a single 35 point package from these ticks.")
        raise SystemExit(1)

    for n, pk in enumerate(packs, 1):
        pts = sum(p["pts"] for p in pk)
        usd = round(sum(p["usd"] for p in pk), 2)
        flag = "" if TARGET_MIN <= pts <= TARGET_MAX else "   ** OUT OF RANGE **"
        print("  PACKAGE %d   %d items | %d points | $%.2f%s" % (n, len(pk), pts, usd, flag))
        for p in pk:
            print("     %-52s %2d pts  $%6.2f   (%s)" % (p["name"][:52], p["pts"], p["usd"], p["label"]))
        print()
    if len(packs) < 3:
        print("  only %d package(s) possible without repeating a product." % len(packs))

    if a.html:
        io.open(a.html, "w", encoding="utf-8").write(render(packs, who))
        print("  wrote %s" % a.html)


def render(packs, who):
    secs = []
    for n, pk in enumerate(packs, 1):
        rows = "".join(
            '<tr><td class="n">%s<small>%s</small></td><td class="p">%d</td>'
            '<td class="c">$%.2f</td></tr>' % (p["name"], p["label"], p["pts"], p["usd"])
            for p in pk)
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
