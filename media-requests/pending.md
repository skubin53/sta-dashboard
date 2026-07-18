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

## CLOROX POST — 5 in-body images needed
GHL Post ID: 6a5add01220e9606ef417e68
Post URL: join.switchtoamerica.com/post/is-clorox-spray-toxic
Hero already live at api.ismyhometoxic.com/blog-image-clorox.jpg

### clorox-label-closeup-v1
- status: handed-off
- for: Clorox post — "What is in Clorox bleach spray?" section
- ghl_post_id: 6a5add01220e9606ef417e68
- placement: Under the "What is in Clorox bleach spray?" H2
- prompt: Close-up of a woman's hand holding a white Clorox spray bottle and reading the ingredient label on the back. Natural light, bathroom or kitchen setting. The Clorox logo is clearly visible. Photorealistic, warm tones, authentic not studio.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: is-clorox-spray-toxic-ingredients-label.webp
- alt_text: Close-up of hand holding Clorox spray bottle reading the ingredient label
- requested: 2026-07-17

### clorox-fumes-bathroom-v1
- status: handed-off
- for: Clorox post — "What happens when you breathe Clorox fumes?" section
- ghl_post_id: 6a5add01220e9606ef417e68
- placement: Beside the "What happens when you breathe Clorox fumes?" section
- prompt: A woman in a small bathroom with no window, crouching to spray Clorox on the bathtub, her hand raised slightly to wave away fumes, a slightly uncomfortable expression. Realistic bathroom setting, tight space, inadequate ventilation visible. Warm documentary tone, not scary.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: clorox-spray-fumes-small-bathroom-ventilation.webp
- alt_text: Woman spraying Clorox in a small bathroom waving away fumes
- requested: 2026-07-17

### clorox-mixing-danger-v1
- status: handed-off
- for: Clorox post — "Why is mixing Clorox with other cleaners so dangerous?" section (beside or instead of comparison table)
- ghl_post_id: 6a5add01220e9606ef417e68
- placement: This is the BRANDED GRAPHIC — comparison infographic, 1:1 for Pinterest/social
- prompt: Clean branded infographic titled "Never Mix These With Bleach" on a navy background. Four rows showing: Bleach + Ammonia (window cleaners) = Chloramine gas (CDC); Bleach + Vinegar = Chlorine gas (CDC); Bleach + Toilet bowl cleaner = Chlorine gas (CDC); Spraying in small rooms = Aerosol exposure (EPA). Clean sans-serif font, red warning icons, Switch to America branding bottom right. Infographic style, Pinterest-ready, warm cream rows.
- style: Nano Banana Pro
- aspect_ratio: 1:1
- filename: clorox-bleach-mixing-dangers-comparison-infographic.webp
- alt_text: Infographic showing 4 dangerous Clorox bleach combinations and what CDC EPA found
- requested: 2026-07-17

### clorox-ventilation-v1
- status: handed-off
- for: Clorox post — "Did we start over-spraying after COVID?" section
- ghl_post_id: 6a5add01220e9606ef417e68
- placement: Beside the over-spraying/COVID section
- prompt: A woman in a bright, well-ventilated kitchen with a window open and sunlight coming in, wiping a countertop with a damp cloth instead of spraying. Calm, peaceful expression. This image shows the BETTER alternative — a cloth instead of spray, fresh air. Warm, reassuring tone.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: safer-cleaning-method-cloth-ventilation-no-spray.webp
- alt_text: Woman wiping kitchen countertop with damp cloth near open window instead of spraying bleach
- requested: 2026-07-17

### clorox-safer-swap-v1
- status: handed-off
- for: Clorox post — "What should you look for in a safer clean?" section
- ghl_post_id: 6a5add01220e9606ef417e68
- placement: Beside or below the safer clean checklist
- prompt: Clean, organized bathroom or kitchen shelf showing a before-and-after swap: on the left, a familiar white Clorox spray bottle; on the right, a hydrogen-peroxide-based cleaner with minimal packaging. Warm natural light, tidy and inviting. Simple swap, not alarming.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: clorox-safer-cleaner-swap-hydrogen-peroxide-alternative.webp
- alt_text: Side-by-side shelf showing Clorox spray versus a safer hydrogen-peroxide cleaner swap
- requested: 2026-07-17

---

## TIDE POST — 5 additional in-body images (Photo Guide standard)
Per blog-post-standards.md: 5-6 images per post, 1 per 300 words. Hero (blog-tide-v2) is already applied. These 5 go inside the post body at specific sections.

### tide-label-closeup-v1
- status: handed-off
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
- status: handed-off
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
- status: handed-off
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
- status: handed-off
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
- status: handed-off
- for: Tide blog post body — "What is a non-toxic laundry detergent?" section
- ghl_post_id: 6a5999559ba2b5829ac09454
- placement: Section 6 — beside or below the label-reading checklist under "What is a non-toxic laundry detergent?"
- prompt: Clean, bright laundry room shelf or countertop showing a before-and-after swap: on the left, a familiar orange Tide bottle; on the right, a clean-label fragrance-free detergent with minimalist packaging. Warm natural light, tidy and organized. The visual message is a simple, easy swap — not scary, just better.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: non-toxic-laundry-detergent-safer-swap-tide-alternative.webp
- alt_text: Side-by-side laundry room shelf showing Tide versus a safer fragrance-free detergent swap
- requested: 2026-07-17

---

## FEBREZE POST — 5 in-body images needed
## GHL post will be published at slug: is-febreze-safe-to-breathe
## Hero already exists: api.ismyhometoxic.com/blog-image-febreze.jpg

### febreze-label-closeup-v1
- status: pending
- for: Febreze blog post body — "What is actually inside a bottle of Febreze?" section
- ghl_post_id: TBD (new post, not yet published)
- placement: Section 1 — below opening paragraphs, before the comparison table
- prompt: Close-up of real hands reading the back label of a blue Febreze bottle, finger pointing at the ingredient list. Natural light, kitchen or laundry room background slightly blurred. The person looks focused and curious, not alarmed. Authentic and photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: febreze-ingredient-label-closeup-reading.webp
- alt_text: Close-up of hands reading the ingredient label on a blue Febreze bottle
- requested: 2026-07-17

### febreze-comparison-graphic-v1
- status: pending
- for: Febreze blog post body — beside the ingredient comparison table
- ghl_post_id: TBD
- placement: Section 2 — directly after the comparison table. This is the 1:1 Pinterest-shareable branded infographic.
- prompt: Clean branded graphic showing four Febreze ingredient concerns side by side with gentler alternatives. Switch to America red and navy color palette. Bold readable text. Designed for Pinterest sharing. 1:1 square format. Professional infographic style, not hand-drawn.
- style: Nano Banana Pro
- aspect_ratio: 1:1
- filename: febreze-ingredients-vs-safer-alternatives-infographic.webp
- alt_text: Branded infographic comparing Febreze ingredients to safer alternatives
- requested: 2026-07-17

### febreze-sensitive-airways-v1
- status: pending
- for: Febreze blog post body — "Can breathing Febreze irritate your lungs?" section
- ghl_post_id: TBD
- placement: Section 3 — beside or below the "Can breathing Febreze irritate your lungs?" paragraphs
- prompt: Gentle, warm photo of a young child sitting on a living room couch next to a parent, both looking relaxed and healthy. The room looks cozy and clean. Natural light through a window. No spray products visible. The mood is tender and protective, not alarming. Authentic and photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: febreze-child-indoor-air-sensitive-airways.webp
- alt_text: Young child and parent relaxing on couch in a bright clean living room
- requested: 2026-07-17

### febreze-indoor-air-v1
- status: pending
- for: Febreze blog post body — "Why does spraying Febreze indoors matter more than outdoors?" section
- ghl_post_id: TBD
- placement: Section 4 — beside or below the indoor air paragraphs
- prompt: A woman in her 30s or 40s opening a large window in a bright living room, letting fresh air in. Sunlight streaming in. She looks calm and purposeful. The room is tidy and real, not staged. The visual message is simple: fresh air is the answer. Authentic and photorealistic, warm tones.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: febreze-open-window-fresh-air-indoor-air-quality.webp
- alt_text: Woman opening a large window in a bright living room to let in fresh air
- requested: 2026-07-17

### febreze-natural-swap-v1
- status: pending
- for: Febreze blog post body — "What should you look for instead?" section
- ghl_post_id: TBD
- placement: Section 5 — beside or below the label-reading checklist
- prompt: Clean, bright kitchen counter with natural odor alternatives: a halved lemon, a small bowl of baking soda, a fresh herb bundle (rosemary or eucalyptus), and a window open in the background. Warm natural light. Tidy and inviting, not clinical. The message is simple swaps, not deprivation. Authentic and photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: febreze-natural-odor-alternatives-safer-swap-kitchen.webp
- alt_text: Natural odor alternatives on a bright kitchen counter: lemon, baking soda, fresh herbs, open window
- requested: 2026-07-17

---

## DAWN POST — 5 in-body images needed
## GHL post will replace slug: is-dawn-dish-soap-safe
## Hero already exists: api.ismyhometoxic.com/blog-image-dawn.jpg

### dawn-label-closeup-v1
- status: pending
- for: Dawn blog post body — "What is 1,4-dioxane?" section
- ghl_post_id: 6a599956220e969e9c3cfb48
- placement: Section 1 — below the 1,4-dioxane paragraphs, before the preservative section
- prompt: Close-up of real hands reading the back label of a blue Dawn dish soap bottle, one finger tracing the ingredient list. Natural kitchen light, sink visible in background slightly blurred. The person looks focused and curious. Authentic and photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: dawn-dish-soap-ingredient-label-closeup.webp
- alt_text: Close-up of hands reading the ingredient label on a blue Dawn dish soap bottle
- requested: 2026-07-17

### dawn-rinse-dishes-v1
- status: pending
- for: Dawn blog post body — "What is really left on your dishes?" section
- ghl_post_id: 6a599956220e969e9c3cfb48
- placement: Section 2 — beside or below the dishes/residue section
- prompt: A mom in her 30s or 40s rinsing dishes at a bright kitchen sink, warm natural light. A blue Dawn bottle visible nearby. She looks thoughtful, as if wondering about the soap she just used. Authentic, warm, and real, not staged. Photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: dawn-dish-soap-rinsing-dishes-kitchen-sink.webp
- alt_text: Mom rinsing dishes at a bright kitchen sink with Dawn dish soap nearby
- requested: 2026-07-17

### dawn-comparison-graphic-v1
- status: pending
- for: Dawn blog post body — beside the ingredient comparison table
- ghl_post_id: 6a599956220e969e9c3cfb48
- placement: Section 3 — directly after the comparison table. 1:1 Pinterest-shareable branded infographic.
- prompt: Clean branded graphic showing four Dawn ingredient concerns (1,4-dioxane, MIT preservative, fragrance, ethylene oxide) with gentler alternatives. Switch to America red and navy color palette. Bold readable text. Designed for Pinterest sharing. 1:1 square format. Professional infographic style.
- style: Nano Banana Pro
- aspect_ratio: 1:1
- filename: dawn-dish-soap-ingredients-safer-alternatives-infographic.webp
- alt_text: Branded infographic comparing Dawn dish soap ingredients to safer alternatives
- requested: 2026-07-17

### dawn-hands-skin-v1
- status: pending
- for: Dawn blog post body — "What preservative is in Dawn?" section
- ghl_post_id: 6a599956220e969e9c3cfb48
- placement: Section 4 — beside the preservative/skin section (after the label checklist)
- prompt: Close-up of a woman's hands gently washing a dish under running water at a kitchen sink. Soft natural light. The skin looks normal and healthy. The mood is practical and calm, not alarming. Authentic and photorealistic, warm tones.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: dawn-dish-soap-hands-washing-skin-contact.webp
- alt_text: Close-up of hands washing a dish under running water at a kitchen sink
- requested: 2026-07-17

### dawn-safer-swap-v1
- status: pending
- for: Dawn blog post body — "Where do you go from here?" section
- ghl_post_id: 6a599956220e969e9c3cfb48
- placement: Section 5 — beside or below the closing section before the final CTA
- prompt: Bright kitchen counter with a simple, clean-label dish soap bottle (no specific brand shown, minimal packaging) next to a kitchen sponge and a clean white plate. Warm natural light. Tidy and inviting. The message is a simple, easy swap. Authentic and photorealistic.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- filename: dawn-dish-soap-safer-swap-cleaner-alternative.webp
- alt_text: Clean kitchen counter with a simple dish soap alternative and fresh dishes
- requested: 2026-07-17
