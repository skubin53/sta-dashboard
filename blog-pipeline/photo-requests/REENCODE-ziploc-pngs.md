---
date: 2026-10-13
slug: can-you-microwave-ziploc-bags
status: open
priority: medium
requested_by: "Shannon 2026-10-13: \"Yes fix everything\" (10/13 posts and pins audit, finding F15)"
---

# Re-encode request (no new render): 5 Ziploc PNGs, about 9.3 MB on one LIVE post

The live post https://join.switchtoamerica.com/post/can-you-microwave-ziploc-bags loads 5 full-size PNGs. On a phone that is slow, and the hero is also the share image.

| file | now |
|---|---|
| blog-images/ziploc-hero-v1.png (cover + og:image) | 1,781,411 bytes |
| blog-images/ziploc-villain-v1.png | 2,343,581 bytes |
| blog-images/ziploc-swap-v1.png | 1,512,786 bytes |
| blog-images/ziploc-belonging-v1.png | 1,755,870 bytes |
| blog-images/ziploc-freedom-v1.png | 1,893,176 bytes |

**Deliver:** the same pictures as WebP, 1600 px wide (or the current width if it is smaller), 150 KB or less each. Save them NEXT TO the PNGs as `blog-images/ziploc-<beat>-v1.webp`, using the same names with .webp. Keep the PNGs, because the live post points at them until it is swapped.

**Do not change the pictures themselves.** It is only a smaller encode.

When done, write photos-completed/REENCODE-ziploc-pngs.md with the 5 new sizes. The content session then swaps the 5 src values and the GHL cover image on the live post (blog-live-edit.py).
