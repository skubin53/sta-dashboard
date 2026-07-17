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
