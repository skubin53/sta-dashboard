# -*- coding: utf-8 -*-
"""
blog-republish.py  -  push an already-live post's UPDATED body to GHL, safely.

    python blog-republish.py <queue-date> [--live]

GHL ignores rawHTML on PUT, so updating a live post means POST-new + retire-old.
Done in the WRONG order that 404s the live post. This does it in the right order:

    1. resolve which photos-completed file actually holds this post's slots
    2. assemble the body, check every image is 200
    3. find the CURRENT live post id by reading it off the live page
    4. POST the new version   <-- new post exists BEFORE anything is taken down
    5. move the OLD post to a throwaway slug, DRAFT
    6. PUT the clean slug onto the NEW post, PUBLISHED
    7. verify 200 and confirm the new markup is actually on the page

Learned the hard way on 2026-07-31: `status: ARCHIVED` is not a thing, and sending
`status: DRAFT` to the live post takes it offline. Never touch the old post until
the new one is confirmed to exist.
"""
import re, io, sys, json, time, random, subprocess, base64
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

RAW = "https://raw.githubusercontent.com/skubin53/sta-dashboard/main"
API = "https://services.leadconnectorhq.com"
ENV = Path(r"C:\Users\skubi\Favorites\Downloads\Cowork - Workspace\env 11")
TMP = Path(r"C:\Users\skubi\AppData\Local\Temp\sta-blog")
# Shopper blog by default. Pass --builder for The Shannon Nicole, which is a separate
# blog on the SAME location, with its own hostname. Added 2026-08-27: this script could
# only ever repair shopper posts, so a builder post with a dead link and a wrong date had
# no safe repair path at all.
BUILDER = "--builder" in sys.argv
BLOG_ID = "YjBySnIppiSfkeKxjiaO" if BUILDER else "Hulr7aT2G6a5AdONSXQx"
LIVE = ("https://theshannonnicole.com/post/" if BUILDER
        else "https://join.switchtoamerica.com/post/")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"

PHOTO_FILES = ["2026-07-18", "2026-07-19", "2026-07-20", "2026-07-20-dawn-hero",
               "2026-07-21", "2026-07-21-v2", "2026-07-22", "2026-07-22-v2",
               "2026-07-23-mascara", "2026-07-24", "2026-07-25-ziploc",
               "2026-07-30", "2026-07-31"]

args = [a for a in sys.argv[1:] if not a.startswith("--")]
if not args:
    print(__doc__)
    raise SystemExit(1)
QDATE = args[0]
GO = "--live" in sys.argv

E = {}
for ln in ENV.read_text(encoding="utf-8", errors="ignore").splitlines():
    s = ln.strip()
    if s and not s.startswith("#") and "=" in s:
        k, v = s.split("=", 1)
        E[k.strip()] = v.strip().strip('"').strip("'")
TOK = E.get("GHL_PIT_TOKEN_BLOGS") or E["GHL_PIT_TOKEN"]
LOC = E["GHL_LOCATION_ID"]


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


GH = "https://api.github.com/repos/skubin53/sta-dashboard"


def _gh_contents(repo_path):
    """Read a repo file through the GitHub Contents API. Never stale, unlike RAW."""
    pat = E.get("GITHUB_PAT", "")
    if not pat:
        return None
    o = TMP / "_rc.json"
    try:
        o.unlink()
    except FileNotFoundError:
        pass
    sh(["curl", "-s", "--max-time", "60", "-A", UA,
        "-H", "Authorization: token " + pat,
        "%s/contents/%s?ref=main" % (GH, repo_path), "-o", str(o)])
    if not o.exists():
        return None
    try:
        j = json.loads(o.read_text(encoding="utf-8", errors="replace"))
        return base64.b64decode(j["content"]).decode("utf-8", "replace")
    except Exception:
        return None


def fetch(url):
    """Read a repo file. Goes through the Contents API, NOT raw.githubusercontent.

    Ported from blog-publish.py on 2026-08-27. raw.githubusercontent caches for
    MINUTES and ignores ?cb= busting, so a file committed seconds earlier comes back
    STALE. This script would then republish the OLD body while reporting success,
    which is precisely the failure that shipped two posts unfixed this morning: the
    gates ran on the local file and the publisher read a different one.
    """
    if url.startswith(RAW):
        j = _gh_contents(url[len(RAW):].lstrip("/"))
        if j is not None:
            return j
    out = TMP / "_rf.txt"
    try:
        out.unlink()
    except FileNotFoundError:
        pass
    sh(["curl", "-s", "--max-time", "60", "-A", UA, url, "-o", str(out)])
    return out.read_text(encoding="utf-8", errors="replace") if out.exists() else None


_PROVEN = {}


def code(u, tries=8):
    """HTTP status, retried hard, because 000 means "could not connect", not "gone".

    Ported from blog-publish.py on 2026-08-27. The image host drops the first
    connection routinely: a republish of a post whose images were all provably 200
    was refused three times in a row on 000s. Refusing was RIGHT, the input was
    wrong. A genuine 404 answers instantly and identically every time, so retrying
    costs nothing on a truly dead image. Once a URL has answered 200 in this
    process that verdict is cached, because a later 000 on a URL already proven
    alive is information about the socket, not about the file.
    """
    if _PROVEN.get(u):
        return _PROVEN[u]
    c = "000"
    for i in range(tries):
        c = ((sh(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-L",
                  "--max-time", "45", "-A", UA, u]).stdout) or "").strip()
        if c != "000":
            if c == "200":
                _PROVEN[u] = c
            return c
        if i < tries - 1:
            time.sleep(3 + 4 * i)
    return c


def ghl(method, path, payload=None):
    out = TMP / "_rg.json"
    try:
        out.unlink()
    except FileNotFoundError:
        pass
    cmd = ["curl", "-s", "--max-time", "90", "-X", method,
           "-H", "Authorization: Bearer " + TOK,
           "-H", "Version: 2021-07-28", "-H", "Accept: application/json"]
    if payload is not None:
        p = TMP / "_rb.json"
        p.write_text(json.dumps(payload), encoding="utf-8")
        cmd += ["-H", "Content-Type: application/json", "--data", "@" + str(p)]
    cmd += [API + path, "-o", str(out)]
    sh(cmd)
    try:
        return json.loads(out.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return None


# ------------------------------------------------------------------- load post
doc = fetch("%s/blog-pipeline/queue/%s.md?cb=%d" % (RAW, QDATE, random.randint(1,10**9)))
if not doc or len(doc) < 500:
    print("cannot read queue/%s.md" % QDATE)
    raise SystemExit(1)
m = re.match(r"^---\s*\n(.*?)\n---\s*\n", doc, re.S)
fm, body = {}, (doc[m.end():] if m else doc)
if m:
    for ln in m.group(1).splitlines():
        if ":" in ln:
            k, v = ln.split(":", 1)
            fm[k.strip()] = v.strip().strip('"')
slug = fm.get("slug", "")
slots = [s.strip() for s in re.findall(r"\[IMAGE:\s*([^\]]+)\]", body)]
print("%s  ->  %s" % (QDATE, slug))
print("  slots: %d %s" % (len(slots), slots if slots else ""))

# --------------------------------------------- resolve the right photos file(s)
urls = {}
if slots:
    # PHOTO_FILES below is hand maintained and stops at 2026-07-31. Same staleness bug as
    # blog-enhance.py had. Try the post's OWN date first so a new post resolves without
    # anyone having to remember to edit this list, then fall back to the old list.
    for pf in [QDATE] + PHOTO_FILES:
        d = fetch("%s/blog-pipeline/photos-completed/%s.md?cb=%d" % (RAW, pf, random.randint(1,10**9)))
        if not d or "image_url" not in d:
            continue
        cur = None
        for ln in d.splitlines():
            h = re.match(r"^###\s+(\S+)", ln)
            if h:
                cur = h.group(1).strip()
            u = re.search(r"image_url:\s*(\S+)", ln)
            if u and cur and cur in slots and cur not in urls:
                urls[cur] = u.group(1).strip()
    missing = [s for s in slots if s not in urls]
    if missing:
        print("  MISSING IMAGES: %s" % missing)
        raise SystemExit(1)
    stale = [s for s in slots if not urls[s].startswith("https://scan.ismyhometoxic.com")]
    if stale:
        print("  REFUSING: these are not permanent repo URLs, run blog-images.py first: %s" % stale)
        raise SystemExit(1)

# ----------------------------------------------------------- assemble the body
hero = next((s for s in slots if "hero" in s.lower()), None)
# posts written with direct <img> tags have no [IMAGE:] slots, so there is no hero to
# resolve. Without this the cover goes out blank and the post has no card image.
cover = urls.get(hero, "") or fm.get("cover", "")
ALT = {"hero": fm.get("title", ""), "villain": "What is actually inside the bottle",
       "turning": "The moment of deciding against it",
       "belonging": "One woman sharing a safer swap with another",
       "freedom": "A clean home with nothing to hide"}


def alt_for(n):
    for k, v in ALT.items():
        if k in n.lower():
            return v
    return fm.get("title", "")


out = body
for s in slots:
    if s == hero:
        out = out.replace("[IMAGE: %s]" % s, "")
        continue
    out = out.replace("[IMAGE: %s]" % s,
                      '<img src="%s" alt="%s" loading="lazy" style="width:100%%;height:auto;'
                      'border-radius:8px;margin:28px 0;">' % (urls[s], alt_for(s)))
left = re.findall(r"\[IMAGE:[^\]]*\]", out)
if left:
    print("  leftover tokens: %s" % left)
    raise SystemExit(1)

bad = []
for u in sorted(set(re.findall(r'<img[^>]+src="([^"]+)"', out))):
    c = code(u)
    if c != "200":
        bad.append((c, u))
if cover and code(cover) != "200":
    bad.append(("cover", cover))
if bad:
    print("  IMAGE NOT 200: %s" % bad)
    raise SystemExit(1)

words = len(re.sub(r"<[^>]+>", " ", out).split())
desc = (fm.get("meta_description") or fm.get("description") or fm.get("title", ""))[:250]
print("  words %d | toc %s | keep-reading %s | faq %s | images %d ok"
      % (words, "Y" if '<nav class="sta-toc"' in out else "N",
         "Y" if '<div class="sta-keep-reading">' in out else "N",
         "Y" if "FAQPage" in out else "N", len(slots)))
print("  cover : %s" % (cover or "NONE"))
print("  meta  : %s" % desc[:88])
if not GO:
    print("  DRY RUN")
    raise SystemExit(0)

# ------------------------------------------------- find the current live post ids
#
# DO NOT scrape ids off the rendered page. The old version of this did
#     re.findall(r'"(6a[0-9a-f]{22})"', page)
# and took whichever matched most often. The live HTML is full of ids that look
# exactly like a post id (assets, blocks, the funnel itself), so on 2026-08-03 it
# picked 6a70191a7d6b2fb74bf78e43, which is not a post at all. The PUT to retire it
# went nowhere, the real old post stayed PUBLISHED on the slug, and the live page
# kept serving the old body while every check here reported success.
#
# Ask the API which posts hold this slug. That is the only authoritative answer.
def published_on_slug(s):
    r = ghl("GET", "/blogs/posts/all?locationId=%s&blogId=%s&limit=50&offset=0"
                   "&status=PUBLISHED" % (LOC, BLOG_ID))
    rows = (r or {}).get("blogs") or (r or {}).get("data") or []
    return [b for b in rows if (b.get("urlSlug") or "") == s]

old_ids = [b.get("_id") or b.get("id") for b in published_on_slug(slug)]
print("  currently PUBLISHED on this slug: %s" % (old_ids or "none"))

# ------------------------------------------------------- 1) POST the new version
payload = {"title": fm.get("title", ""), "locationId": LOC, "blogId": BLOG_ID,
           "imageUrl": cover, "imageAltText": fm.get("title", ""),
           "description": desc, "urlSlug": slug, "status": "PUBLISHED",
           "rawHTML": out, "categories": [], "tags": [], "wordCount": words,
           "publishedAt": fm.get("date", "") + "T12:00:00Z"}
r = ghl("POST", "/blogs/posts", payload)
node = (r or {}).get("data") or (r or {}).get("blogPost") or (r or {})
new_id = node.get("_id") or node.get("id")
if not new_id:
    print("  POST FAILED: %s" % str(r)[:220])
    raise SystemExit(1)
print("  new post id: %s" % new_id)

# --------------------------------------- 2) retire old, 3) claim slug on the new
for i, oid in enumerate(old_ids):
    if not oid or oid == new_id:
        continue
    ghl("PUT", "/blogs/posts/" + oid,
        {"locationId": LOC, "blogId": BLOG_ID, "status": "DRAFT", "archived": True,
         "urlSlug": "%s-retired-%s-%d" % (slug, QDATE.replace("-", ""), i)})
    print("  retired old post %s" % oid)
ghl("PUT", "/blogs/posts/" + new_id,
    {"locationId": LOC, "blogId": BLOG_ID, "status": "PUBLISHED", "urlSlug": slug})

# Checklist E3. Two posts PUBLISHED on one slug means the old one keeps serving and
# every downstream check silently passes against stale content.
time.sleep(10)
still = [b.get("_id") or b.get("id") for b in published_on_slug(slug)]
if len(still) != 1 or still[0] != new_id:
    print("  !! E3 FAIL: published on this slug = %s (expected only %s)" % (still, new_id))
else:
    print("  E3 ok: exactly one published post on the slug")

# ------------------------------------------------------------------- 4) verify
ok = 0
for i in range(4):
    time.sleep(12)
    if code(LIVE + slug) == "200":
        ok += 1
        if ok >= 2:
            break
print("  live 200: %s" % ("YES" if ok >= 2 else "NO"))
live = fetch(LIVE + slug) or ""
print("  on page -> toc:%s links:%s faq:%s schema:%s"
      % ("Y" if "sta-toc" in live else "N",
         "Y" if "sta-keep-reading" in live else "N",
         "Y" if "FAQPage" in live else "N",
         live.count("application/ld+json")))

# The checks above are structural and every version of the post passes them, which is
# exactly why the 2026-08-03 republish reported success while the page still served
# the old body. Prove the NEW text is on the page by fingerprinting the longest
# sentence we just assembled and looking for it verbatim.
plain = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", out))
cands = [s.strip() for s in re.split(r"(?<=[.!?]) ", plain) if 45 < len(s.strip()) < 160]
fingerprint = max(cands, key=len) if cands else ""
def _norm(s):
    # GHL re-encodes apostrophes and quotes on the way out, so a literal match on a sentence
    # containing "FDA's" fails even when the body updated perfectly. That produced a false
    # "CONTENT NOT UPDATED" on 2026-08-12, which is worse than no check: a warning that cries
    # wolf gets ignored the day it is real. Normalise the characters GHL rewrites.
    s = re.sub(r"[‘’ʼ']", "'", s)
    s = re.sub(r"[“”]", '"', s)
    s = s.replace("&#39;", "'").replace("&rsquo;", "'").replace("&amp;", "&")
    s = re.sub(r"[–—]", "-", s)
    return re.sub(r"\s+", " ", s)

if fingerprint:
    if _norm(fingerprint) in _norm(live):
        print("  content verified: the new body is on the live page")
    else:
        print("  !! CONTENT NOT UPDATED. The live page is still serving an older body.")
        print("     looked for: %s" % fingerprint[:90])
print("  %s%s" % (LIVE, slug))

# ---------------------------------------------------------------- sitemap refresh
# GHL's own sitemap tool cannot list blog posts at all, so we host ours and rebuild it
# here. Doing it on every publish is the whole point: nobody has to remember.
import subprocess as _sp
print("")
print("refreshing the blog sitemap" if not BUILDER else
      "NO sitemap step: theshannonnicole.com has no sitemap in this pipeline yet")
_r = None if BUILDER else _sp.run([sys.executable, str(Path(__file__).with_name("sitemap-build.py")), "--live"],
             capture_output=True, text=True)
for _ln in ((_r.stdout if _r else "") or "").splitlines()[-3:]:
    print("  " + _ln)
