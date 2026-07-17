# Instructions for Claude — Image Pipeline

## Who You Are Working With

You are working with Shannon Nicole, founder of Switch to America. Shannon has an AI system called Cameron running on a Mac Mini that manages her business. Cameron publishes SEO blog articles to her website (join.switchtoamerica.com) about common toxic household products like Tide, Dawn, Febreze, Clorox, and Lysol. These articles drive organic traffic to her free Toxic Home Scorecard at scan.ismyhometoxic.com. Cameron writes the blog content and publishes it automatically, but Cameron cannot generate images. That's where you come in.

We use Shannon's Obsidian vault as the handoff point between Cameron and you. When Cameron needs a featured image for a blog post, it writes a request into `media-requests/pending.md` with a specific Higgsfield prompt, the blog post it belongs to, and the format needed. Your job is to open that file, generate each requested image through Higgsfield using the exact prompt provided, and write the resulting image URL into `media-requests/completed.md`. Cameron checks that file at 9 AM and 3 PM MDT every day — when it sees a completed entry, it automatically downloads the image, hosts it, and updates the correct blog post. No manual steps. You generate, Cameron publishes.

---

## Your Job

1. Read `pending.md` — find any entries with `status: pending`
2. For each pending request, generate the image using Higgsfield with the exact prompt provided
3. Write the result to `completed.md` using the format below
4. Update the entry in `pending.md` to `status: handed-off` when done

## How to Generate the Image

Use Higgsfield via your MCP connector. The prompt and style are provided in each request block.
Always use **Nano Banana Pro** as the model unless the request specifies otherwise.
Aspect ratio will be specified — default is 16:9 for blog featured images.

## Writing to completed.md

Add a new entry at the bottom of completed.md (above the last line) in this exact format:

```
### [request-id]
- status: done
- image_url: [the public URL Higgsfield gave you]
- ghl_post_id: [copy from the pending entry]
- completed: [today's date and time]
- cameron_processed: false
```

**Important:** The `cameron_processed: false` line must be exactly like that — Cameron's script looks for it.

## Example

If pending.md has:
```
### blog-febreze-v2
- status: pending
- for: GHL blog post about Febreze safety
- ghl_post_id: 6a5999560b0ee64872279cf0
- prompt: A woman in her 30s in a living room, looking concerned while reading the label on a Febreze bottle she is holding. Photorealistic, natural light from a window. The Febreze bottle is clearly visible and readable.
- style: Nano Banana Pro
- aspect_ratio: 16:9
- requested: 2026-07-17
```

You would generate that image and write to completed.md:
```
### blog-febreze-v2
- status: done
- image_url: https://[higgsfield-generated-url].jpg
- ghl_post_id: 6a5999560b0ee64872279cf0
- completed: 2026-07-17T10:30:00
- cameron_processed: false
```

## When There Are No Requests

If pending.md says "No pending requests right now" — nothing to do. Check back next time.

## Notes

- Cameron will confirm via Telegram when images have been picked up and published
- You do not need to download, host, or upload images anywhere — just provide the Higgsfield URL
- One image per blog post request unless the request asks for multiple
