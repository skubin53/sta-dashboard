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
