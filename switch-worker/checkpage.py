# -*- coding: utf-8 -*-
"""checkpage.py  -  fetch a live packs page and check what it actually says.

    python checkpage.py jenny natalie

Reads the SERVED page, not the source. A worker template can lose characters between the
file on disk and the bytes a phone receives, so the only honest check is the response.
"""
import io
import re
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124 Safari/537.36")


def get(url):
    r = subprocess.run(["curl", "-s", "--max-time", "60", "--retry", "3",
                        "--retry-all-errors", "-A", UA, "-w", "\n%{http_code}", url],
                       capture_output=True, text=True, encoding="utf-8")
    out = (r.stdout or "").rsplit("\n", 1)
    return (out[1].strip() if len(out) == 2 else "000"), (out[0] if len(out) == 2 else "")


def one(slug):
    code, h = get("https://packs.ismyhometoxic.com/" + slug)
    print("\n  /%s   HTTP %s, %d bytes" % (slug, code, len(h)))
    if code != "200":
        print("    page is not serving")
        return False

    def find(pat, default="?"):
        m = re.search(pat, h, re.S)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else default

    print("    heading  : %s" % find(r"<h1>(.*?)</h1>"))
    print("    built    : %s" % find(r"<header>.*?<p>(.*?)</p>"))
    print("    subtitle : %s" % find(r'<div class="meta">(.*?)</div>', "-"))
    print("    noindex  : %s" % ("yes" if "noindex" in h else "NO"))

    heads = re.findall(r"<h2>Package (\d+) <span class=\"cnt\">(\d+) products</span>", h)
    totals = re.findall(
        r'<tr class="tot"><td>Total</td><td class="p">(\d+)</td>'
        r'<td class="c">\$([0-9.]+)</td>', h)
    frees = len(re.findall(r'tr class="free"', h))

    for i, (n, cnt) in enumerate(heads):
        t = totals[i] if i < len(totals) else ("?", "?")
        print("    Package %s: %s products, %s points, $%s" % (n, cnt, t[0], t[1]))
    print("    free rows: %d" % frees)

    ok = True
    if not totals:
        print("    ** no totals found in the page **")
        ok = False
    bad = [t for t, _ in totals if not (35 <= int(t) <= 37)]
    if bad:
        print("    ** package totals outside 35 to 37: %s **" % bad)
        ok = False
    # the heading must not promise more packs than the page shows
    m = re.search(r"here are (\d+) different packs", h)
    if m and int(m.group(1)) != len(heads):
        print("    ** heading says %s packs, page shows %d **" % (m.group(1), len(heads)))
        ok = False
    if len(heads) == 1 and m:
        print("    ** heading uses the plural for a single pack **")
        ok = False
    if ok:
        print("    OK: every total is 35 to 37, heading matches the pack count")
    return ok


if __name__ == "__main__":
    slugs = sys.argv[1:] or ["jenny", "natalie"]
    results = [one(s) for s in slugs]
    print("\n  %d of %d pages clean" % (sum(1 for x in results if x), len(results)))
    raise SystemExit(0 if all(results) else 1)
