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

### 2026-08-27, both posts published today shipped with unfixed bodies
- **What is wrong live:** `are-baby-wipes-safe` is dated August 26 in the byline and schema,
  `cookie-vs-customer` is dated August 29 (two days in the FUTURE, which can stop Google
  indexing it), and the first "Worth reading next" link on the cookie post 404s because it
  points at the clean Amazon slug instead of the `-5366` one that is actually live.
- **Cause, and it is a process hole worth keeping:** `blog-publish.py` reads the queue file
  from **GitHub**, not from local disk. The dates and the link were fixed locally, the gates
  were run locally and passed on the fixed file, then the publisher shipped the unfixed
  GitHub copy. The commit came afterwards. **Local file, repo file and live post are three
  different things.** Gate E2 exists to catch exactly this and the live HTML was checked for
  schema, meta and TOC but not for the one field that had just been edited.
- **Rule from it:** commit and push BEFORE publishing, always, and re-check on the live page
  the specific thing you just changed.
- **Live fix:** paste the corrected bodies in the GHL Code Editor.

## Closed

(nothing yet)
