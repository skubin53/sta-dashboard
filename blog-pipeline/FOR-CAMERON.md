# FOR CAMERON — Read this every time you pick up a blog post

> **STATUS 2026-07-20: THE REWRITE BACKLOG IS COMPLETE.** All 6 framework rewrites are LIVE (potassium bromate, Lysol, Tide, Dawn, Febreze, Clorox). Do NOT publish or republish any rewrite. Going forward, publish ONLY new posts from the daily writer / 30-day plan.


## The standard is PERFECTION. Not speed.

Shannon's words (2026-07-18): "You have to STOP rushing Cameron. This isn't a race. I am looking and expecting perfection from you."

---

## MANDATORY READING ORDER before touching any post

1. **Read this file** — you are doing that now
2. **Read `blog-pipeline/PHOTO-GUIDE.md`** — BEFORE writing any photo requests. This is the Photo Bible. Every prompt you write goes through this framework. No exceptions.
3. **Read `blog-pipeline/blog-post-checklist.md`** (or Obsidian `concepts/blog-post-checklist.md`) — run every box before calling any post done.

---

## Why PHOTO-GUIDE.md is mandatory

The photos carry the story arc from fear to free. Before writing a single Higgsfield prompt:
- Read the beat-by-beat shot map (Section 5)
- Use the prompt-writing formula (Section 6) — EVERY prompt gets the realism tail
- Check the anti-AI realism checklist (Section 4) before approving any image

Writing photo prompts without reading PHOTO-GUIDE.md first is like writing the post without reading the Story Framework. The result will be wrong.

---

## What happens when you spot-check instead of checklist (2026-07-18 lesson)

Cameron called a post "9/9 verified" without running the real checklist.
Shannon found 3 real failures herself:
1. Cover image duplicated in body
2. No social proof line / 12,000+ families count
3. Images were .png, not .webp

That is not acceptable. Shannon should never have to find the failures.

---

## Checklist items most likely to be missed

- [ ] Social proof line before first CTA ("Join 12,000+ families" + real testimonial)
- [ ] Cover imageUrl is DIFFERENT from every body image (use Pexels if all Higgsfields are in body)
- [ ] Images are WebP, under 150KB (convert PNGs via sips before placing)
- [ ] Missing image = request in pending.md + set 1-hour follow-up reminder. Never drop silently.

---

## CTA block standard

Dark navy (#14263f), Shannon's circular photo on the left, gold "Run the Free Scan" button.
NOT green. NOT gold. Dark navy (#14263f) with Amazon Orange (#FF9900) button and accents. Shannon confirmed 2026-07-18. Warm and inviting.
Shannon's photo: https://raw.githubusercontent.com/skubin53/sta-dashboard/main/media/shannon-nicole-founder.jpg


---

## CTA Block Design Standard (confirmed 2026-07-18)

Shannon approved this design: "I love how you designed the attached. Going forward please use the Amazon Orange hue instead of yellow."

**Every in-content CTA block uses this exact structure:**

```html
<div class="sta-cta">
  <img src="https://api.ismyhometoxic.com/shannon-photo.jpg" alt="Shannon Nicole" class="sta-cta-photo" loading="lazy">
  <div class="sta-cta-inner">
    <span class="sta-cta-heading">What else is hiding in your home?</span>
    <p>The free 60-second scan shows you your worst room first. No email required to start.</p>
    <a href="https://scan.ismyhometoxic.com/now">Run the Free Scan</a>
  </div>
</div>
```

**Required CSS:**
```css
.sta-cta{background:#14263f;border-radius:12px;padding:24px 28px;margin:32px 0;display:flex;align-items:center;gap:20px}
.sta-cta-photo{width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;border:3px solid #FF9900}
.sta-cta-inner{flex:1}
.sta-cta-heading{color:#FF9900;font-size:1.15em;font-weight:700;margin:0 0 8px;display:block}
.sta-cta p{color:#e0eaf4;margin:0 0 16px;font-size:1em;line-height:1.6}
.sta-cta a{display:inline-block;background:#FF9900;color:#14263f!important;padding:12px 28px;border-radius:6px;font-size:1em;font-weight:700;text-decoration:none}
```

**Hard rules:**
- Background: `#14263f` (dark navy). NEVER cream or light.
- Button/accent: `#FF9900` (Amazon Orange). NEVER yellow, gold, or green.
- Shannon's photo: circular, 72×72, orange border. Always present.
- Button text: dark navy (`#14263f`). White is wrong.
