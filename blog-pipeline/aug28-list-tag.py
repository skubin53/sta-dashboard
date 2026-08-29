# -*- coding: utf-8 -*-
"""aug28-list-tag.py  -  tag the "Aug 28th" re-enrolment list.

    python aug28-list-tag.py           dry run
    python aug28-list-tag.py --live    write it

Shannon, 2026-08-28: "find everyone that is eligible to re-enroll that hasn't been texted in
the last 2 weeks and put them in a SMart List called 'Aug 28th'".

WHY A TAG AND NOT A LIST
A GoHighLevel Smart List is a SAVED FILTER, not a fixed set of people, and there is no API
to create one. Every candidate endpoint 404s or 400s (checked 2026-08-28). So the people get
a tag, and the Smart List is then one saved filter on that tag. The tag is the durable half
anyway: it is what a workflow or a send would actually target, and it can be re-checked
later, which a hand-built list cannot.

WHO IS ON IT
Only `can-reenroll-now`. That tag was written on 2026-08-26 from Melaleuca's own
"Date Elig. Reenroll" field, so it means eligibility was READ, not guessed.

WHO IS DELIBERATELY NOT ON IT, and why each one matters
  * `cannot-reenroll-yet` (96 people). Telling one of them she can re-enrol is the Bonnie
    Naga mistake, which Shannon has already had happen to her once.
  * `reenroll-date-unknown` (120). Nobody knows. Unknown is not eligible.
  * the older `reenroll` / `pam-reenroll` / `david-reenroll` / `reenrollpam` tags. Those mean
    the account is gone, NOT that the date has been checked. They predate the eligibility
    pass. Including them would be guessing at exactly the thing that has already gone wrong.
  * anyone carrying a stop tag: not interested, stop, dnd, zap dnd, shopped cat 1.
  * anyone permanently DND on SMS at carrier level, which Shannon cannot undo.
  * anyone with no phone number, because this list exists to be texted.
  * anyone texted on or after the cutoff.

FAIL CLOSED. Every contact is re-read at write time, not trusted from the scan file, because
a stop tag could have been added in between. If a contact cannot be re-read, it is SKIPPED.
A missed opportunity costs nothing. Texting a woman twice in a fortnight, or texting somebody
who already said no, costs Shannon the relationship.
"""
import io
import sys
import time

sys.path.insert(0, r"C:\Users\skubi\AppData\Local\Temp\claude\C--Users-skubi"
                   r"\e987a8c6-0ee7-4f05-b259-650b8fa444fa\scratchpad")
from ghl import call, LOCATION

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8",
                              errors="replace", line_buffering=True)
LIVE = "--live" in sys.argv

TAG = "aug 28th"
SRC = r"C:\Users\skubi\sta-tools\_aug28_list.tsv"
STOP = {"not interested", "stop", "dnd", "zap dnd", "shopped cat 1"}

rows = []
for i, ln in enumerate(io.open(SRC, encoding="utf-8").read().splitlines()):
    if i == 0 or not ln.strip():
        continue
    p = (ln.split("\t") + [""] * 3)[:3]
    rows.append({"id": p[0], "name": p[1], "last": p[2]})
print("  %d on the list from the scan\n" % len(rows))

tagged = already = blocked_stop = blocked_dnd = blocked_nophone = unread = failed = 0

for r in rows:
    code, d = call("GET", "/contacts/%s" % r["id"])
    c = (d.get("contact") or {}) if isinstance(d, dict) else {}
    if code != 200 or not c:
        print("  SKIP, could not re-read  %s" % r["name"][:30])
        unread += 1
        time.sleep(0.13)
        continue

    tags = {t.lower() for t in (c.get("tags") or [])}
    if tags & STOP:
        print("  SKIP, stop tag added since the scan  %-26s %s"
              % (r["name"][:26], ",".join(sorted(tags & STOP))))
        blocked_stop += 1
        time.sleep(0.13)
        continue

    sms = ((c.get("dndSettings") or {}).get("SMS") or {})
    if str(sms.get("status", "")).lower() == "permanent" or c.get("dnd") is True:
        print("  SKIP, permanent DND  %s" % r["name"][:30])
        blocked_dnd += 1
        time.sleep(0.13)
        continue

    if not (c.get("phone") or "").strip():
        print("  SKIP, no phone  %s" % r["name"][:30])
        blocked_nophone += 1
        time.sleep(0.13)
        continue

    if TAG in tags:
        already += 1
        time.sleep(0.13)
        continue

    if LIVE:
        code, resp = call("POST", "/contacts/%s/tags" % r["id"], {"tags": [TAG]})
        if code not in (200, 201):
            print("  TAG FAILED  %-26s http %s" % (r["name"][:26], code))
            failed += 1
            time.sleep(0.2)
            continue
        time.sleep(0.14)
    tagged += 1
    if tagged % 50 == 0:
        print("   tagged %d..." % tagged)

print("\n" + "=" * 60)
print("  tagged '%s'            : %d" % (TAG, tagged))
print("  already had it              : %d" % already)
print("  skipped, stop tag           : %d" % blocked_stop)
print("  skipped, permanent DND      : %d" % blocked_dnd)
print("  skipped, no phone           : %d" % blocked_nophone)
print("  skipped, unreadable         : %d" % unread)
print("  failed                      : %d" % failed)
print("  ------------------------------------")
print("  accounted for               : %d of %d"
      % (tagged + already + blocked_stop + blocked_dnd + blocked_nophone + unread + failed,
         len(rows)))
if not LIVE:
    print("\n  DRY RUN. add --live to write.")
