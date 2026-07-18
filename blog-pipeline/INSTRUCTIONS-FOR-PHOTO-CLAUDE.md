# Instructions for Shannon's Photo Claude (Higgsfield)

## Who You Are Working With

You are working with Shannon Nicole, founder of Switch to America. Cameron (an AI system on a Mac Mini) writes and publishes SEO blog posts. Cameron writes the blog content and requests photos, but cannot generate images. That's your job.

Cameron's 7:30 AM cron reads the day's blog post, extracts the image descriptions, and writes photo requests here. Your job is to generate each image via Higgsfield and write the URLs back so Cameron can publish the finished post by 8:30 AM.

---

## Your Daily Job (runs at 8:00 AM MDT)

1. Open `blog-pipeline/photo-requests/YYYY-MM-DD.md` — use today's date
2. For each pending request, generate the image via Higgsfield using the exact prompt provided
3. Write the completed URLs to `blog-pipeline/photos-completed/YYYY-MM-DD.md`
4. Commit and push to GitHub

Cameron checks at 8:30 AM. When all photos for the day are in `photos-completed/`, it publishes.

---

## Reading the Photo Requests

Each day's request file looks like:

```
---
date: 2026-07-21
post_title: Is Fabuloso Toxic? What the CPSC and EPA Actually Say (2026)
slug: is-fabuloso-toxic
ghl_post_id: [will be filled in by Cameron after publishing]
status: pending
---

### fabuloso-hero-v1
- placement: hero
- aspect_ratio: 16:9
- style: Nano Banana Pro
- prompt: [exact prompt to use]

### fabuloso-label-v1
- placement: body — under ingredients section
- aspect_ratio: 16:9
- style: Nano Banana Pro
- prompt: [exact prompt to use]

[... more requests ...]
```

---

## Writing Completed Photos

Save results to `blog-pipeline/photos-completed/YYYY-MM-DD.md` (same date as the request file):

```
---
date: 2026-07-21
post_title: Is Fabuloso Toxic? What the CPSC and EPA Actually Say (2026)
status: done
cameron_processed: false
---

### fabuloso-hero-v1
- status: done
- image_url: https://[higgsfield-cloudfront-url].jpg
- placement: hero
- completed: [timestamp]

### fabuloso-label-v1
- status: done
- image_url: https://[higgsfield-cloudfront-url].jpg
- placement: body — under ingredients section
- completed: [timestamp]

[... one entry per request ...]
```

**Important:** The `cameron_processed: false` line in the frontmatter must be exactly that. Cameron's script looks for it.

---

## Image Standards

- Model: **Nano Banana Pro** (always, unless request specifies otherwise)
- Style: photorealistic, warm tones, natural light
- People: real, warm, lived-in — NOT AI-looking or stock-photo
- Products: brand name and packaging clearly visible
- Mood: concerned-but-calm, not alarmed or dramatic

---

## When No Requests Exist

If there is no file at `blog-pipeline/photo-requests/YYYY-MM-DD.md` for today, or the file says status: complete — nothing to do. Check back tomorrow.

---

## Confirmation

After committing photos, tell Shannon: "Photos for [title] are committed. Cameron publishes at 8:30 AM."
