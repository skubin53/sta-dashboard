# Media Requests — Pending

Cameron writes image generation requests here.
Your Claude reads this file, generates the images via Higgsfield, and writes results to completed.md.

## Format

Each request block looks like:

```
### [request-id]
- status: pending
- for: [description of where it goes]
- ghl_post_id: [GHL blog post ID, if applicable]
- prompt: [exact Higgsfield prompt to use]
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: [date]
```

## GHL Post ID Reference (correct IDs as of 2026-07-17)

| Blog Post | GHL Post ID |
|---|---|
| is-tide-laundry-detergent-toxic | 6a5999559ba2b5829ac09454 |
| is-febreze-safe | 6a5999560b0ee64872279cf0 |
| is-dawn-dish-soap-safe | 6a599956220e969e9c3cfb48 |
| is-clorox-toxic | 6a599956c4669d36eb0452a0 |
| is-lysol-safe-to-inhale | 6a599957220e96dd4a3cfb56 |

---

### blog-tide-v2
- status: applied
- for: GHL blog post — "Is Tide Laundry Detergent Toxic?"
- ghl_post_id: 6a5999559ba2b5829ac09454
- prompt: A woman in her early 40s standing in a bright laundry room, holding a bright orange Tide PODS container and reading the label with a slightly concerned expression. The Tide branding is clearly visible. Natural light from a window. Photorealistic, warm tones.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17

### blog-febreze-v1
- status: applied
- for: GHL blog post — "Is Febreze Safe to Breathe?"
- ghl_post_id: 6a5999560b0ee64872279cf0
- prompt: A man in his 30s in a cozy living room, spraying a blue Febreze bottle toward a couch cushion with a slightly uncertain look on his face, as if second-guessing the product. The Febreze bottle and branding are clearly visible. Natural afternoon light. Photorealistic, warm tones.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17

### blog-dawn-v1
- status: applied
- for: GHL blog post — "Is Dawn Dish Soap Safe?"
- ghl_post_id: 6a599956220e969e9c3cfb48
- prompt: A woman in her 30s standing at a kitchen sink, holding a blue Dawn dish soap bottle and reading the ingredient label on the back with a focused, concerned expression. The Dawn logo is clearly visible. Bright natural kitchen lighting. Photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17

### blog-clorox-v1
- status: applied
- for: GHL blog post — "Is Clorox Toxic?"
- ghl_post_id: 6a599956c4669d36eb0452a0
- prompt: A woman in her 40s cleaning a bathroom countertop with a white Clorox spray bottle in her hand, pausing to look at the label with a questioning expression. The Clorox branding is clearly visible. Bright bathroom lighting. Photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17

### blog-lysol-v1
- status: applied
- for: GHL blog post — "Is Lysol Safe to Inhale?"
- ghl_post_id: 6a599957220e96dd4a3cfb56
- prompt: A woman in her 30s in a kitchen, holding a Lysol wipes container and looking at it skeptically, as if reading the warning label for the first time. The Lysol branding is clearly visible. Clean, well-lit kitchen. Photorealistic, natural light.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17

---

## TIDE POST — 5 additional in-body images (Photo Guide standard)
Per blog-post-standards.md: 5-6 images per post, 1 per 300 words. Hero (blog-tide-v2) is already applied. These 5 go inside the post body at specific sections.

### tide-label-closeup-v1
- status: pending
- for: Tide blog post body — under "What is actually in Tide?" H2, above comparison table
- ghl_post_id: 6a5999559ba2b5829ac09454
- placement: Section 2 — under the "What is actually in Tide?" heading, above the comparison table
- prompt: Close-up of a real woman's hand holding a bright orange Tide laundry detergent bottle, reading the ingredient label with a slightly concerned expression. Natural kitchen or laundry room light. The Tide logo is clearly visible. Photorealistic, warm tones, authentic feel — not studio lighting.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: is-tide-toxic-detergent-label-reading.webp
- alt_text: Close-up of hand holding Tide detergent bottle reading the ingredient label
- requested: 2026-07-17

### tide-comparison-graphic-v1
- status: pending
- for: Tide blog post body — beside the comparison table (this is the Pinterest/social share branded infographic)
- ghl_post_id: 6a5999559ba2b5829ac09454
- placement: Section 2 — beside or instead of the comparison table. This is the BRANDED GRAPHIC and the highest-leverage shareable asset.
- prompt: Clean branded infographic showing 4 toxic ingredients in Tide laundry detergent. Navy blue header row labeled "What's in Tide? What the EPA, FDA, and NTP Found." Four rows below: 1,4-Dioxane (EPA: likely carcinogen), Optical Brighteners (skin sensitization, peer-reviewed), Synthetic Fragrance (CDC: hidden hormone disruptors), Formaldehyde-Releasing Preservatives (NTP/IARC: known carcinogen). Clean sans-serif font, warm cream background, Switch to America branding at bottom right. Infographic style, Pinterest-ready.
- style: Nano Banana Pro
- aspect_ratio: 1:1
- filename: tide-toxic-ingredients-comparison-chart.webp
- alt_text: Infographic showing 4 concerning Tide ingredients and what EPA FDA NTP found about each
- requested: 2026-07-17

### tide-baby-laundry-v1
- status: pending
- for: Tide blog post body — "Does laundry detergent really stay on your clothes?" section
- ghl_post_id: 6a5999559ba2b5829ac09454
- placement: Section 4 — beside the skin-contact/residue section, emotional anchor for the 14-16 hour contact point
- prompt: Tender, warm photo of a young mother holding a freshly laundered white baby onesie up to her cheek, eyes closed, in a sunlit laundry room. Soft natural light. Authentic and warm, not clinical or stock-looking. The fabric-against-skin connection is the visual message.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: is-tide-safe-baby-clothes-laundry-residue.webp
- alt_text: Mother holding freshly laundered baby onesie to her cheek in sunlit laundry room
- requested: 2026-07-17

### tide-safe-babies-v1
- status: pending
- for: Tide blog post body — "Is Tide safe for babies and kids?" section
- ghl_post_id: 6a5999559ba2b5829ac09454
- placement: Section 5 — beside the "Is Tide safe for babies and kids?" H2
- prompt: Warm, reassuring photo of a real baby in a clean white sleeper onesie, sleeping peacefully in a crib or being held by a parent. Soft natural light, warm tones. Authentic, not studio. The mood is gentle and reassuring, not alarming.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: is-tide-safe-for-babies-non-toxic-laundry.webp
- alt_text: Baby in clean white sleeper, peaceful and warm — is Tide safe for babies?
- requested: 2026-07-17

### tide-safer-swap-shelf-v1
- status: pending
- for: Tide blog post body — "What is a non-toxic laundry detergent?" section
- ghl_post_id: 6a5999559ba2b5829ac09454
- placement: Section 6 — beside or below the label-reading checklist under "What is a non-toxic laundry detergent?"
- prompt: Clean, bright laundry room shelf or countertop showing a before-and-after swap: on the left, a familiar orange Tide bottle; on the right, a clean-label fragrance-free detergent with minimalist packaging. Warm natural light, tidy and organized. The visual message is a simple, easy swap — not scary, just better.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: non-toxic-laundry-detergent-safer-swap-tide-alternative.webp
- alt_text: Side-by-side laundry room shelf showing Tide versus a safer fragrance-free detergent swap
- requested: 2026-07-17
