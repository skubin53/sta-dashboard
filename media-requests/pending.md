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

---

### blog-tide-v2
- status: pending
- for: GHL blog post — "Is Tide Laundry Detergent Toxic?"
- ghl_post_id: 6876cd3e6c3c1f682f01ee4d
- prompt: A woman in her early 40s standing in a bright laundry room, holding a bright orange Tide PODS container and reading the label with a slightly concerned expression. The Tide branding is clearly visible. Natural light from a window. Photorealistic, warm tones.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17
