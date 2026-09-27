---
title: Fixes made in the repo that are NOT yet on the live page
purpose: stop a repo fix being mistaken for a live fix
---

# Pending live fixes

The repo file and the live GoHighLevel post are two different things. Editing the queue or
published markdown does NOT change what a reader sees. Updating a live body means the full
republish dance (POST new, retire old, re-slug, verify), which takes an indexed post down and
puts a new one up. That is worth doing for a real problem and not worth doing for a typo.

Anything listed here is fixed in the repo and still wrong on the live page. Each one rides
along with the next republish of that post for any other reason.

## Open

### 2026-07-26, Ziploc post, dead FDA citation
- **Found:** 2026-08-24, first full audit of every outbound receipt across all published posts.
- **What is wrong live:** the sentence about "microwave safe" having no regulated meaning links
  to `fda.gov/food/packaging-food-contact-substances-fcs/food-contact-substances-fcs-authorization-process`,
  which returns 404. Confirmed twice, with full browser headers, HEAD and GET.
- **Fixed in repo to:** `https://www.fda.gov/food/food-ingredients-packaging/packaging-food-contact-substances-fcs`
  (verified 200). It supports the same claim: the FCS programme authorises substances for
  specific conditions of use and does not require per-product microwave testing.
- **Why it was not swapped live immediately:** one dead link does not justify taking an indexed
  post offline and republishing it under a new post id. Past swaps are already why four live
  posts have no record and six have no ghl_post_id.
- **Alternative if it needs doing sooner:** it is a one-line paste in the GoHighLevel Code
  Editor, which is the sanctioned path for editing a live body.

### 2026-08-27, four builder posts carry the shopper cheat sheet
- **Shannon, 2026-08-27:** *"The cheat sheet does not belong on the builder post."*
- **What is wrong live:** the "Keep reading" list on four builder posts ends with
  `Free: the Is My Home Toxic cheat sheet`, a shopper lead magnet about products under the
  sink, on a page talking to a woman weighing an income decision. Same fault as gate D8c,
  which already bans the home scan on builder posts.
  - `theshannonnicole.com/post/amazon-cut-your-affiliate-commission-now-what-5366`
  - `theshannonnicole.com/post/is-45-too-late-to-start-something-new`
  - `theshannonnicole.com/post/how-referral-model-actually-works`
  - `theshannonnicole.com/post/extra-income-for-women-in-their-50s`
- **Cause:** gate D9, written 2026-08-08, before the builder track existed. It said "every
  post" because every post was a shopper post then. The eight newer builder posts had
  already stopped carrying it but nobody wrote down why, so three QC passes argued about it.
- **Fixed in repo:** removed from all four queue files, and D9 now says SHOPPER POSTS ONLY
  with the reason attached.
- **Live fix:** delete one `<li>` per post in the GHL Code Editor. Four small edits.

## Closed

### 2026-09-27, invented "12,000 families" line and two invented quotes - CLOSED
Shannon: "remove the 12,000 line." Four live shopper posts carried it (Dawn, Pine-Sol,
Ziploc, waterproof mascara), and Ziploc and Pine-Sol also quoted "Jennifer M., Ontario" and
"Melissa R., Ontario", with no source for either. Removed from all four live posts and from
the repo copies (which said 20,000). A scan of every live post on both blogs found no other
invented count or quote.
**New safe tool:** `sta-tools/blog-live-edit.py <slug> <edits.json> [--live]`. It reads
the EXACT live body (`GET /blogs/posts/<id>?locationId=` returns rawHTML, schema and
style included), applies each exact edit once, refuses if the JSON-LD, style, FAQ or CTA
counts move, tags the scan links with utm, then does the proven swap (POST new, retire old
to DRAFT on a throwaway slug, PUT the clean slug, one post on the slug, 200 twice, removed
text gone). All four verified live: 200, schema intact, canonical tag now present.
New post ids: mascara 6ab9572df25685b27b9118c3, Pine-Sol 6ab95761ec41da637e40c522,
Ziploc 6ab9578aec41da637e40c70a, Dawn 6ab957beec41da637e40c99b.
Do NOT use the GHL visual editor on these posts: it drops the style and JSON-LD from its
copy and would save them away. This tool can also clear the open items above (shopper
blog only for now).


### 2026-08-27, both posts published today shipped with unfixed bodies - CLOSED
Republished the same day via blog-republish.py, POST-new then retire-old, and verified
on the SERVED page rather than on a status code. Baby wipes now carries the Fresh Cucumber
window, "any Target store", the life-threatening sentence and correct alt text. Cookie
carries the working Amazon link, the 27 August date and correct alt text. Both 200.

Three real bugs in blog-republish.py were fixed to make this possible, and all three were
the same shape as the failure they were repairing:
  * it read the queue file from raw.githubusercontent, which caches for minutes, so it
    would have republished the STALE body while reporting success. Now uses the GitHub
    Contents API, same as blog-publish.py.
  * its image check had no retry, so it refused three times on 000s from a host whose
    images were all provably 200. Ported the hardened code() from blog-publish.py.
  * it was hardcoded to the shopper blog, so a builder post had no safe repair path at
    all. Now takes --builder.

Also learned: PUT /blogs/posts/{id} REQUIRES a status field (422 without it), and even
with status included it still silently ignores rawHTML. Re-tested directly on 2026-08-27,
so the trap table stands, with that extra detail.

Its post-publish content check is still unreliable: it looks for a marker that exists in
both the old and new bodies, so it cried "CONTENT NOT UPDATED" on a republish that had in
fact worked. Verify by grepping for something you actually changed.
