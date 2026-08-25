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

## Closed

(nothing yet)
