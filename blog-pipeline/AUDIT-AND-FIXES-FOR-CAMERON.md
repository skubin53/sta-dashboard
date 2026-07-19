# Blog Audit and Fix Plan: for Cameron

Hey Cameron. Shannon had the blog Claude (this side) run a full audit of all 6 live blog posts against our current standards. Here is what we found and what we are doing, so we are all working off the same playbook. This is not a knock on your work. Most of these posts were written before the Story Framework, the voice guide, and the Proof standard existed. Now that they do, we are bringing everything up to the same bar.

## What we audited against (all in this repo)
- `blog-pipeline/STORY-FRAMEWORK.md` : the arc. Reader is the hero, Shannon is the guide, open in her home with a feeling, one villain and one receipt, never end on fear, close on who she becomes.
- `blog-pipeline/INSTRUCTIONS-FOR-BLOG-CLAUDE.md` : the format, the mandatory dark Shannon's Advice box, approved sources, no em-dashes, never the word "Melaleuca."
- The Proof standard: a category-matched, hyperlinked section of real lawsuits, recalls, and fines, each attributed as an allegation, never as proven fact.
- The swap rule: FOOD posts point to a LOCAL FARM and getting to know your farmer (never a mill, bakery, co-op, or store). Non-food posts (cleaners, air, personal care) point to a cleaner real-ingredient swap. NEVER tell the reader to "read the label" as the fix.

## What we found (all 6 need work)
The newest post (potassium bromate) is the model, it is built on the framework. The five cleaner posts (Tide, Febreze, Dawn, Clorox, Lysol) were written earlier and share the same gaps.

Systemic across the 5 cleaner posts:
1. No "Shannon's Advice" box. The dark first-person coach callout is missing entirely. This is the biggest gap.
2. No "Proof" section. They name agencies but link zero real lawsuits or recalls.
3. "Read the label" is used as the fix. That breaks the rule. The fix is a cleaner swap plus the scan.
4. Old opening and voice. They open on a chemical name instead of a felt home scene, and several close on Shannon instead of on the reader. Rule-of-three tricolons and fake "I used to spray it, then I stopped" arcs recur.

Post-specific:
- Febreze: em-dashes throughout the body (a hard no, Shannon reads them as an AI tell).
- Dawn: the headline promises "what dermatologists say" but no dermatologist is cited.
- Clorox: the sources line credits NTP, but NTP is never actually used in the post.
- Lysol: a dead CDC/NIOSH link, and an unverified "12,000 families" claim.
- Bromate: the LIVE copy still says "mill/bakery," but the farm-corrected version is already in the queue (below). Important: its Florida AG subpoena and both quotes are REAL. We web-verified them today. Do not remove them.
- Mechanical: a few July 17 vs 18 date mismatches, and FAQPage JSON-LD missing on several posts that have a visible FAQ.

## What we are fixing (blog Claude side)
- Rebuilt all five cleaner posts and the flour post on the framework: story-first open, the Shannon's Advice box, a real hyperlinked Proof section, a cleaner swap instead of read-the-label, verified sources only, FAQPage schema, and no em-dashes.
- The corrected versions are being committed to `blog-pipeline/queue/` for you.

## What we need from you, Cameron
1. Replace each live post with its corrected version from `blog-pipeline/queue/`, using your normal rewrite sequence (draft the old post, publish the new one), and map each slug to its existing live URL so we do not create duplicates:
   - Potassium bromate: `queue/2026-07-19.md` (farm-corrected; we also renamed "Sources" to "Proof" and fixed the H1 typo)
   - Lysol: `queue/rewrite-is-lysol-toxic.md`
   - Tide, Febreze, Dawn, Clorox: landing in `queue/` now as `rewrite-*.md` files
2. Wait for photos as usual (the photo Claude fills `photo-requests/` then `photos-completed/`) before publishing, per the pipeline.
3. Going forward, build every post to `STORY-FRAMEWORK.md` and `INSTRUCTIONS-FOR-BLOG-CLAUDE.md`: the Shannon's Advice box, a Proof section, the right swap (farm for food, cleaner version for non-food, never "read the label"), no em-dashes, never "Melaleuca," no EWG, a story-first open, a close on the reader, and FAQPage schema.

Thanks Cameron. We are all pushing for the same thing here: every post perfect, because the blog is the brand's front door.
