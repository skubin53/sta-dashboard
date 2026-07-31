# THE BLOG CHECKLIST

**Every post gets triple-checked against this before it goes live, and again after.**
Built 2026-07-31 from a live audit of all 7 published posts plus a teardown of the
10 sites currently outranking us. Nothing in here is theory. Every item is something
we actually got wrong, or something a site beating us actually does.

Run order: **A (content) -> B (technical) -> C (images) -> D (links) -> E (post-publish)**

---

## THE THREE THINGS THAT MATTERED MOST

Discovered 2026-07-31. These outrank every other item on this list.

1. **The sitemap was EMPTY.** `join.switchtoamerica.com/sitemap.xml` returned
   `<urlset></urlset>`. Zero URLs. Google had no discovery path to a single post.
   Nothing else on this checklist matters until that is true.
2. **Zero internal links between posts.** Every post was an orphan. The page beating
   us on Scentsy has 20+ internal links and only 1,200 words. We had 2,900 words and
   zero links, and lost.
3. **We are already the fastest.** 1.91s / 124 KB, versus 4.13s for the site beating
   us on Pine-Sol and 15.60s for the one beating us on Scentsy. **Do not spend another
   hour on speed.** It is not the problem and never was.

---

## A. CONTENT

- [ ] **A1** Title is the exact question a real person types, plus `(2026)`.
- [ ] **A2** `meta_description` is written, unique, under 155 chars, and is NOT the
      title repeated. It is the only sales line we get in the search results.
      *(We shipped 3 posts with a BLANK meta description and 2 with the title
      duplicated into it. Root cause: the publisher read `description`, the queue
      files write `meta_description`. Fixed in blog-publish.py 2026-07-31.)*
- [ ] **A3** Answer capsule in the first 100 words. Question answered before the fold.
- [ ] **A4** Every H2 is a real question. Every H2 is followed by a `Quick answer:` line.
- [ ] **A5** **An ingredient/component section with the chemical name as its own H3.**
      bettergoods.org ranks #1 for "is Pine-Sol toxic" on the back of 9 H3s, one per
      chemical. People search "d-Limonene", not "why my chest tightens". We had zero.
- [ ] **A6** Comparison table with a "what it does NOT do" column. Honesty converts.
- [ ] **A7** Shannon's Advice box. Facts flat and hyperlinked; "poisoning / causes
      harm" stays her first-person OPINION, never stated as fact.
- [ ] **A8** Include the evidence that CUTS AGAINST the story. The baby-powder post
      states the FDA found nothing in 2021, 2022 and 2023. Leaving that out is how a
      post gets torn apart in the comments.
- [ ] **A9** Never end on fear. Ends on the reader's competence.
- [ ] **A10** No em-dashes. No en-dashes. No `&mdash;`. Commas, periods, "to".
- [ ] **A11** 1,500 to 2,500 words. **Longer is NOT better** — the page beating us
      on Scentsy is 1,200 words. Stop padding.
- [ ] **A12** No fabricated testimonials. **Never invent a named customer quote.**
      If we have no real message, the slot stays empty. *(Two live posts carry
      "Jennifer M., Ontario" and "Melissa R., Ontario" of unknown provenance. Open
      question for Shannon.)*

## B. TECHNICAL / SEO

- [ ] **B1** Post URL is in the sitemap. **CHECK THE SITEMAP IS NOT EMPTY.**
- [ ] **B2** JSON-LD present and valid: Article + Person + Organization + Breadcrumb.
      *(Avocado shipped with NONE. Audit every post.)*
- [ ] **B3** **FAQPage schema** on every post. This is what wins the AI answer box.
      *(Only 2 of 7 posts had it.)*
- [ ] **B4** Verify the schema SURVIVED publishing. Confirmed 2026-07-31 that GHL does
      NOT strip `<script type="application/ld+json">`, so if it is missing on the live
      page it was missing in the source.
- [ ] **B5** **Table of contents with jump links** near the top.
      *(0 of 7 posts had one. Both sites beating us do.)*
- [ ] **B6** Canonical tag present.
- [ ] **B7** Publish date AND a separate "last updated" date shown to the reader.
- [ ] **B8** Post is linked from `/blog`. *(3 of 7 posts were not linked from
      anywhere and were completely orphaned.)*
- [ ] **B9** Author byline resolves to a REAL author page that returns 200.
      *(`/about` and `/author/shannon-nicole` both 404. Our Person schema points at
      a person with no page. Every competitor beating us has a named author with a
      photo and a bio.)*

## C. IMAGES

- [ ] **C1** Hero is the COVER only. Never repeated in the body.
- [ ] **C2** Every image is a permanent `scan.ismyhometoxic.com/blog-images/` URL.
      **NEVER publish a CloudFront/Higgsfield link — they expire and the post dies
      silently days later.** Run `blog-images.py <date> --live` first, always.
- [ ] **C3** Every image WebP, <=150 KB, 1600px wide. *(Raw deliveries run 7-11 MB
      each. One avocado set was 46 MB.)*
- [ ] **C4** Every image URL curled individually and returns 200.
- [ ] **C5** Descriptive alt text on every image.
- [ ] **C6** **NO READABLE PRODUCT LABEL OR BRAND LOGO.** Shannon's hard rule, and
      also a trademark question: a photorealistic branded bottle used as the villain
      of an article alleging harm is a different risk from naming the company in
      careful, sourced text. Approved text overlays that WE author (e.g. "What's
      REALLY in your avocado oil?") are fine and are Shannon's call.
- [ ] **C7** Villain frame = the product releasing harm, or the product alone in cold
      light. Never packaging text. No skulls, hazmat, warning signs or cartoon fumes.
- [ ] **C8** Temperature ramp cold to warm, warmest LAST.
- [ ] **C9** Continuity: same woman, same clothes, same hands across the arc.
- [ ] **C10** Five fingers on every hand. Documentary realism, visible pores.

## D. LINKS  *(the biggest content lever we were missing)*

- [ ] **D1** **At least 3 internal links to other Switch to America posts.** Every
      post. No exceptions. We had ZERO across the entire blog.
- [ ] **D2** At least one older post updated to link BACK to the new one. Links have
      to run both directions or the web never forms.
- [ ] **D3** 4+ outbound citations to primary authorities only: FDA, EPA, CDC, NIH,
      IARC, NTP, court filings, universities. Never EWG or advocacy sites.
      *(bettergoods.org carries 12-15. We averaged 6.)*
- [ ] **D4** **Every outbound link curled and confirmed 200 before publish.** A dead
      receipt kills the entire premise. *(The baby-powder post shipped with a dead
      FDA link caught at this gate.)*
- [ ] **D5** Every factual claim checked against the source page, not from memory.
      Knowledge cutoff is before most of these news hooks. *(The avocado post had an
      invented line, "no detectable avocado oil at all", caught and removed at this
      gate.)*
- [ ] **D6** 2 CTA blocks minimum, and **one must be high up**, right after the first
      major finding. Shannon: "Most ppl don't read the whole blog post."

## E. AFTER PUBLISH

- [ ] **E1** Live URL returns 200, three times.
- [ ] **E2** Re-fetch the LIVE HTML and confirm: images render, schema present, meta
      description correct, internal links present. Do not trust the payload we sent.
- [ ] **E3** Record in `blog-pipeline/published/YYYY-MM-DD.md` with post id + URL.
- [ ] **E4** Add the new post to the internal-link web of at least 2 older posts.

---

## GHL / PLATFORM TRAPS  (established by direct test, do not re-derive)

| Thing | Truth |
|---|---|
| `PUT /blogs/posts/{id}` with `rawHTML` | **silently ignored**, returns 200, body unchanged |
| `PUT` with `urlSlug` / `status` / `archived` | works |
| `PUT` missing `locationId`+`blogId` | 422 |
| archive control | boolean `archived`, NOT `status: ARCHIVED` |
| `status: DRAFT` | **UNPUBLISHES a live post** (404'd the avocado post this way) |
| body edit | POST new FIRST, confirm, THEN move old off the slug. Never take the live one down first |
| image-only change | overwrite the same repo path. Live post picks it up, no republish |
| `raw.githubusercontent.com` | caches ~60s. Confirm an edit is visible on raw BEFORE publishing |
| GitHub Pages CDN | caches 404s. Wait for the Pages build to reach your commit, THEN verify with `?cb=` |
| `_config.yml` `exclude:` | anything listed vanishes from the live site. Excluding `blog-images` 404'd every photo on the live Ziploc post |

---

## WHAT THE SITES BEATING US ACTUALLY DO

| Site | Beats us on | The thing to copy |
|---|---|---|
| bettergoods.org | "is Pine-Sol toxic" #1 | An H3 per chemical name. 12-15 authority citations |
| thegentlealbum.com | Scentsy | 20+ internal links, TOC, named author w/ photo. Only 1,200 words |
| thefragrancenomads.com | Scentsy | Experience in the title: "What 15 Years of Use Taught Us" |
| safeortoxic.com | Pine-Sol | One repeatable "is X toxic" template across the whole category |
| getbetterwellness.com | Scentsy | Names the brand as the villain |
| karensgreencleaning.com | Fabuloso | Owns the pet-safety sub-question |
| truecellularformulas.com | Fabuloso | Product brand running a content blog, same model as us |
| healthline / City of Hope | talc + cancer | Medical reviewer on the byline |
| drugwatch / topclassactions | talc + cancer | Own the litigation angle |

**The pattern:** they win the CATEGORY, not the article. Same skeleton, every product
variation, all cross-linked into a web.

**The strategic limit:** on medical questions ("does baby powder cause cancer") the
winners are Healthline, City of Hope and law firms. We will not outrank them. We CAN
outrank a template farm on "is [specific brand] toxic", because that is product-specific
and nobody holds a medical monopoly on it. **Target brand+product queries, not medical
questions.**

**Our unfair advantage, currently invisible:** bettergoods.org is written by a nameless
"Better Goods Team". Shannon is a real woman who has cleaned this way for thirty years.
That is the moat. It is worth nothing until the author page exists (B9).
