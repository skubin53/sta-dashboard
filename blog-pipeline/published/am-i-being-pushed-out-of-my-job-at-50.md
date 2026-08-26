---
date: 2026-08-26
post_title: Am I Being Pushed Out of My Job at 50? (2026)
slug: am-i-being-pushed-out-of-my-job-at-50
blog: The Shannon Nicole (YjBySnIppiSfkeKxjiaO)
ghl_post_id: 6a8f439aea3d1b55e91fee3c
live_url: https://theshannonnicole.com/post/am-i-being-pushed-out-of-my-job-at-50
published_at: 2026-08-26T19:35:00+00:00
images: 4 body plus cover, every one verified 200 on the live page
word_count: 1984 visible
track: builder
status: live
---

# Publish record

Gate E run against the SERVED page, not the queue file.

- **E1** live 200, three times: `[200, 200, 200]`
- **E2** 5 images render, all 200. Schema survived: Article, BreadcrumbList, FAQPage,
  Organization, Person. Advice box present, both locked sentences verbatim. Zero scan
  links, which is the rule for a builder post. Booking link present. One `<h1>`.
  Hero appears only as og:image, twitter:image, the GHL header render and the schema
  `image` field. **Not repeated in the prose body.**
- **E3** exactly one post on the slug. The `-1` variant 404s.
- **E4** this record.
- **E5 STILL OWED.** Two older builder posts should link back to this one. That is a GHL
  Code Editor job, not an API job: swapping a live body through the API has produced a post
  that did not render publicly before.
- **E6** blog desk refreshed.

## What the checklist caught before this went out

Three passes, each point taken separately, per Shannon 2026-08-26.

1. **Dated four days in the future.** `2026-08-30` in the frontmatter, the byline, the
   published line and both schema date fields. Every gate passed. A post that publishes
   with a future date on it is wrong in the one place a reader checks whether it is
   current. New gate **B8b** now fails any post whose dates disagree.
2. **Schema description did not match the frontmatter**, and had shipped that way from the
   moment it was written. Gate B2 proved the NODES existed and never read the words inside
   them. New gate **B2b** compares headline and description against the frontmatter.
3. **All four alt texts described photographs that do not exist.** They were written from
   the photo BRIEF rather than from the delivered image: a porch step with mugs that is
   actually a street in autumn, a night kitchen with a laptop that is actually a daylight
   kitchen island, a name plate turned face down that is actually an empty open plan
   office. Rewritten from the images, one at a time, by opening each one.
4. `amibeingpus-belonging-v1.webp` was **184 KB** against a 150 KB cap. Recompressed to
   143 KB at the same 1600x893.

## Found while checking, NOT fixed, needs Shannon

**There are two live copies of the Amazon affiliate post.**
`/post/amazon-cut-your-affiliate-commission-now-what` and
`/post/amazon-cut-your-affiliate-commission-now-what-5366` both return 200 and are within
ten bytes of the same size. GHL silently suffixes a duplicate slug instead of refusing it,
so a second publish never errors. Two copies of one post compete with each other in search.
Deleting a live post is hers to decide, so nothing was touched.
