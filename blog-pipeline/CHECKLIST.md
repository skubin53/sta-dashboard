# THE BLOG CHECKLIST — the one and only

**Triple-check every post against this. Once before publish, once after publish against
the LIVE page, once more before you tell Shannon it is done.**

This MERGES three things that used to live apart, which is why items kept getting
missed:
- `INSTRUCTIONS-FOR-BLOG-CLAUDE.md`  (the original A- writing standard)
- `STORY-FRAMEWORK.md` + `PHOTO-GUIDE.md`  (the arc and the images)
- the 2026-07-31 SEO audit + teardown of the 10 sites currently outranking us

If this file and any of those disagree, **this file wins** and go fix the other one.

Gates run in order: **0 (voice) -> A (content) -> B (technical) -> C (images) -> D (links) -> E (post-publish)**

---

## THE THREE THINGS THAT MATTERED MOST (2026-07-31 audit)

1. **The sitemap was EMPTY.** `join.switchtoamerica.com/sitemap.xml` returned
   `<urlset></urlset>`. Zero URLs. Google had no discovery path to a single post.
   Nothing else here matters until that is fixed. It is a GHL-side setting.
2. **Zero internal links between posts.** Every post was an orphan. The page beating
   us on Scentsy has 20+ internal links and 1,200 words. We had 2,900 words and zero.
3. **We are already the fastest.** 1.91s / 124 KB vs 4.13s for the site beating us on
   Pine-Sol and 15.60s for the one beating us on Scentsy. **Stop optimising speed.**

---

## GATE 0 — VOICE AND STORY  (get this wrong and nothing else saves the post)

- [ ] **0.1 Story arc.** Reader is the HERO, Shannon is the GUIDE. Open in her home
      with a FEELING, not a chemical name. One villain, one receipt. Four steps up.
      **Never end on fear.** Close on who the reader BECOMES. (`STORY-FRAMEWORK.md`)
- [ ] **0.2 NEVER invent a conversion story for Shannon.** She has been a whole-food,
      non-toxic mom for 34+ years and **has never bought this stuff**, not even when
      her own kids were babies. Any "I used to buy it, then I read a study and
      stopped" / "I put the jar down" arc is FALSE to her life and reads as AI. Her
      empathy is that she figured it out young with nobody to guide her.
- [ ] **0.3 Shannon does not cite institutions as things SHE reads.** She trusts her
      gut and lived experience and is skeptical of agencies. "The FDA can allow it all
      it wants, I still would not touch it." The studies and links live in the BODY
      copy, not in her mouth.
- [ ] **0.4 THE SWAP RULE.**
      - **FOOD posts:** the action is ALWAYS find a **LOCAL FARM and get to know the
        farmer.** Never a mill, a bakery, a co-op, or a store.
      - **NON-FOOD posts** (cleaners, air, personal care): a cleaner real-ingredient
        swap.
      - **NEVER "read the label" as the fix.** Not even "look for a short list you
        recognise." You cannot read your way out; the label is the lie. Contrast the
        COMPANY and your trust, never label contents.
- [ ] **0.5 Never write the word "Melaleuca."** Use "the wellness company" or
      "private membership store."
- [ ] **0.6 No em-dashes, no en-dashes, no `&mdash;`.** Commas, periods, "to".
      Shannon reads them as an AI tell.
- [ ] **0.6a NO HEDGES, ANYWHERE.** Never "in my opinion", "I think", "I believe",
      "personally", "it seems", "worth considering". Shannon 2026-08-11: *"never say 'in my
      opinion'. Obviously it is, right? I only speak truth and I am loud and proud (never
      ashamed). I don't use weak words. I speak with authority against a criminal empire
      that is killing humanity."* **Delete the hedge, keep the sentence.** What carries the
      claim is the hyperlinked receipt, not a softener, so the proof section matters more.
- [ ] **0.6b NO DISCLAIMERS.** The not-a-doctor line is banned outright, in every form. The
      only real line is never writing an instruction telling a reader to stop a medication.
- [ ] **0.7 Kill the AI tells.** No jargon openings, no rule-of-three tricolons, no
      hedging, no "it's not just X, it's Y". Ground every specific in Shannon's REAL
      lived detail, never an invented one. (`sta-blog-voice-guide`)

> **0.4 false positive, fixed 2026-08-07.** Three finished posts were blocked for
> "read the label" when the sentence was *"I will not tell you to read the label"*,
> which is the rule being obeyed. `blog-gates.py` now looks at the words in front of
> the phrase and lets the negated form through. If you ever loosen that regex, keep
> the negation check.

> **"my kids" check.** Shannon raised ONE daughter. Never write "my kids", "my
> children" or "when my kids were little" in her voice. It survived into three posts
> a day after she corrected it elsewhere, so read every Shannon's Advice box and
> author bio for it before publishing.

## GATE A — CONTENT

- [ ] **A1** Title is the exact question a real person types, plus `(2026)`.
- [ ] **A2** `meta_description` written, unique, under 155 chars, **NOT the title
      repeated.** It is the only sales line we get in the search result.
      *(We shipped 3 posts with a BLANK meta description and 2 with the title
      duplicated. Cause: publisher read `description`, queue files write
      `meta_description`. Fixed in blog-publish.py 2026-07-31.)*
- [ ] **A3** Answer capsule in the first 100 words. Boxed, sourced, no preamble.
- [ ] **A4** **At least 60% of H2s are questions.** Every section opens with a
      one-line `Quick answer:` before the explanation.
- [ ] **A5** **A stat plus a NAMED authority every 150 to 200 words**, hyperlinked
      inline. Not clustered at the end.
- [ ] **A6** **An ingredient/component section with the chemical name as its own H3.**
      bettergoods.org ranks #1 for "is Pine-Sol toxic" on 9 H3s, one per chemical.
      People search "d-Limonene", not "why my chest tightens". We had zero.
- [ ] **A7** **Comparison table**, columns: *Ingredient | The concern | Named authority
      + year | Safer swap*. Add a "what it does NOT do" column where it fits; honesty
      converts.
- [ ] **A8** **Visible FAQ section**, 3 to 5 real follow-up questions, 2 to 4 sentence
      answers. This is separate from the FAQ schema in B3 and both are required.
- [ ] **A9** **Shannon's Advice box**, dark, near the end, right before the closing
      scan CTA. **PASTE THE STANDARD BLOCK VERBATIM. DO NOT WRITE A NEW ONE.**

      > **REWRITTEN BY SHANNON 2026-08-11. The old box is dead.** If you are looking at
      > `Downloads\STA-Shannons-Advice-STANDARD.txt`, that file is the 2026-08-08 version
      > and it is STALE. The canonical text is now `SHANNONS-ADVICE-SPEC.md` in this
      > folder, and there is a copy-and-paste PDF at `Documents\Shannons-Advice-Box.pdf`.

      Locked 2026-08-08 by Shannon: "This way you aren't potentially writing fake advice
      that isn't mine." Every post before that date had a DIFFERENT box, several of them
      making personal claims about her life she never made. Do not personalise it to the
      product. If a post genuinely needs a product-specific line from her, it goes in the
      BODY, or as ONE optional extra paragraph ABOVE the standard block, and it has to
      come from Shannon first.

      **The block, verbatim:**

      ```html
      <div class="shannons-advice">
      <h3>Shannon's Advice</h3>
      <span class="advice-tag">Straight talk from Shannon</span>

      <p>I do not call them grocery stores. They are poison centers meant to do you and
      your family harm. It is not just the brands who are doing the harm, it is the stores
      themselves. They allow these toxic products on their shelves. People are sick and
      dying. This is a very serious matter. How can we ever trust them again?</p>

      <p>We can't trust them. That is where Switch to America comes in. We are a new
      supply chain, built on family values, trust and affordability.</p>

      <p>You do not have to take my word for it. The proof is in my blog posts, the
      recalls, the lawsuits and the fines, and in the app I built called The Family Home
      Toxic Scorecard. Also, inside my Switch Circle private community, we talk about real
      solutions.</p>

      <p>Women come to me exhausted, in pain, stressed out, and on a list of prescriptions
      they never wanted. I have spent the last 15 years helping women get off prescription
      medications. I help families reclaim their health.</p>

      <p>We cannot stop them. I have stopped expecting to. However, we can stop walking
      into their stores. We are linking arms and together taking our control back. Control
      of our health and our finances.</p>

      <p>Start by clicking the link below and taking the SCAN.</p>
      </div>
      ```

- [ ] **A9a** **Two sentences in that box may not be reworded.** They repeat on every
      post, so an edit here repeats everywhere.
      - *"I have spent the last 15 years helping women get off prescription medications."*
        Shannon's own line, confirmed three times. The subject stays **Shannon and her
        fifteen years**, never a command to the reader. **The not-a-doctor disclaimer is
        BANNED** (Shannon 2026-08-11: "NEVER say this ever again. EVER."). Never add one.
      - *"They are poison centers meant to do you and your family harm."* Shannon removed
        the "in my opinion" frame on 2026-08-11 and **that was deliberate, do not put it
        back**. What keeps it safe is that it names no retailer, no product and no
        incident. Attach a named store to a specific claim of intent and it stops being a
        characterisation and becomes an allegation of fact.
- [ ] **A9b** **No bold inside the box, and no link inside the box.** Shannon stripped
      every `<strong>` on 2026-08-11. The closing scan CTA is the very next element on the
      page, so a link in the box is a second link to the same place four lines above the
      first. The `<p>` and `<div>` tags DO stay: they are the paragraph breaks and the
      dark panel, not decoration.
- [ ] **A10** **Proof section**: category-matched, hyperlinked real lawsuits, recalls
      or fines. **Every one attributed as an allegation**, never as proven fact.
- [ ] **A11** **Author bio block**, first person, warm.
- [ ] **A12** Include the evidence that CUTS AGAINST the story. The baby-powder post
      states the FDA found nothing in 2021, 2022 and 2023. Leaving that out is how a
      post gets torn apart in the comments.
- [ ] **A13** **Word count 1,200 to 2,000.** **Longer is NOT better.** The page beating
      us on Scentsy is 1,200 words. Our recent posts ran 2,400 to 3,100 and rank
      nowhere. Stop padding.
- [ ] **A14** **No fabricated testimonials. Never invent a named customer quote.** No
      real message means the slot stays empty. *(Two live posts carry "Jennifer M.,
      Ontario" and "Melissa R., Ontario" of unknown provenance, and a prior audit
      already flagged an unverified "12,000 families" claim on Lysol. Open question
      for Shannon.)*

## GATE B — TECHNICAL / SEO

- [ ] **B1** Post URL is in the sitemap. **CHECK THE SITEMAP IS NOT EMPTY.**
- [ ] **B2** JSON-LD `@graph` with 4 nodes: Article, Person, Organization,
      BreadcrumbList. *(Avocado shipped with NONE.)*
- [ ] **B3** **FAQPage schema** on every post. This is what wins the AI answer box.
      *(Only 2 of 7 posts had it.)*
- [ ] **B4** Verify schema SURVIVED publishing. Confirmed 2026-07-31 that GHL does NOT
      strip `<script type="application/ld+json">`. Missing on the live page means it
      was missing in the source.
- [ ] **B5** **Table of contents with jump links** near the top. *(0 of 7 had one.
      Both sites beating us do.)*
- [ ] **B6** **NO `<h1>` in the body.** GHL injects one from the title field; a second
      one is a duplicate-H1 error.
- [ ] **B7** CSS `<style>` block present: answer capsule, byline, table, CTA, author
      block, Shannon's Advice, TOC, keep-reading.
- [ ] **B8** Canonical tag present. Publish date AND a separate "last updated" date
      shown to the reader.
- [ ] **B9** Post is linked from `/blog`. *(3 of 7 were orphaned entirely.)*
- [ ] **B10** Author byline resolves to a REAL author page returning 200.
      *(`/about` and `/author/shannon-nicole` both 404. Our Person schema points at a
      person with no page. Every competitor beating us has a named author with a photo
      and a bio. Shannon's 34 years is the moat and it is currently invisible.)*

## GATE C — IMAGES

- [ ] **C1** 5 to 6 images, roughly one per 300 words. Hero is the COVER only, never
      repeated in the body.
- [ ] **C2** Every image a permanent `scan.ismyhometoxic.com/blog-images/` URL.
      **NEVER publish a CloudFront/Higgsfield link, they expire and the post dies
      silently days later.** Run `blog-images.py <date> --live` first, always.
- [ ] **C3** WebP, <=150 KB, 1600px wide. *(Raw deliveries run 7-11 MB each. One
      avocado set was 46 MB.)*
- [ ] **C4** Every image URL curled individually, returns 200.
- [ ] **C5** Descriptive alt text on every image.
- [ ] **C6** **SHOW THE REAL BRANDED BOTTLE.** Shannon, 2026-07-31: *"I want the bottle
      to say Pine Sol. It has to relate or ppl won't read the blog post. Pine sol is
      toxic. We talk about it, so let's show the actual real bottles."*
      - **DO** show the actual recognisable named product, correct bottle shape,
        colour and front branding. Match the real product FORM too (Pine-Sol is poured
        into a mop bucket, not sprayed).
      - **DO** use text overlays we author ("What's REALLY in your avocado oil?").
        She asks for these and likes them.
      - **STILL BANNED:** a person **reading, holding up or inspecting** a label, and
        the ingredient/back panel. The villain is the COMPANY, never the shopper
        squinting at fine print.
      - Trademark exposure was raised on 2026-07-31 and Shannon decided to show the
        real bottles. **Do not re-litigate it every post.** The care belongs in the
        TEXT.
- [ ] **C7** Villain frame = the product releasing harm, or the product alone in cold
      light. No skulls, hazmat, warning signs, cartoon fumes or green glow.
- [ ] **C8** Temperature ramp cold to warm, warmest LAST.
- [ ] **C9** Continuity: same woman, same clothes, same hands across the arc.
- [ ] **C10** Five fingers on every hand. Documentary realism, visible pores.

## GATE D — LINKS  (the biggest content lever we were missing)

- [ ] **D1** **At least 3 internal links to other Switch to America posts.** Every
      post, no exceptions. We had ZERO across the entire blog.
- [ ] **D2** **Never link to a post that is not live yet.** Check the target returns
      200 first. *(Ziploc shipped linking to the unpublished baby-powder post.)*
- [ ] **D3** At least one OLDER post updated to link back to the new one. Links run
      both directions or the web never forms.
- [ ] **D4** 4+ outbound citations to primary authorities ONLY: EPA, FDA, ATSDR, CDC,
      NTP, IARC, Prop 65, REACH, court filings, universities, peer-reviewed studies.
      **NEVER EWG, Environmental Working Group, Organic Consumers Association, or any
      advocacy group.** *(bettergoods.org carries 12-15. We averaged 6.)*
- [ ] **D5** **Every outbound link curled and confirmed 200 before publish.** A dead
      receipt kills the entire premise. *(Baby powder shipped with a dead FDA link,
      caught here. Lysol has a dead CDC/NIOSH link still live.)*
- [ ] **D6** **Every factual claim checked against the source page, not from memory.**
      Knowledge cutoff is before most of these news hooks. *(The avocado post had an
      invented line, "no detectable avocado oil at all", caught and removed here.)*
- [ ] **D7** Every named authority in the "sources" line is actually USED in the post.
      *(Clorox credits NTP and never cites it. Dawn promises "what dermatologists say"
      and cites no dermatologist.)*
- [ ] **D8** 2 CTA blocks minimum to `scan.ismyhometoxic.com/now`, and **one must be
      high up**, right after the first major finding. Shannon: *"Most ppl don't read
      the whole blog post."*

## GATE E — AFTER PUBLISH

- [ ] **E1** Live URL returns 200, three times.
- [ ] **E2** **Re-fetch the LIVE HTML** and confirm: images render, schema present,
      meta description correct, TOC present, internal links present. Do not trust the
      payload you sent.
- [ ] **E3** Confirm there is only ONE published post on that slug. *(Republishing
      creates duplicates; retire the old one or it keeps serving.)*
- [ ] **E4** Record in `blog-pipeline/published/YYYY-MM-DD.md` with post id + URL.
- [ ] **E5** Add the new post to the internal-link web of at least 2 older posts.
      **This is a GHL UI job, not an API job.** See the platform-traps table: replacing
      the body of an already-live post over the API 404s it. Open the older post in the
      GHL blog editor, add the `<li>` to its Keep reading list, save.

---

- [ ] **D9** **The free cheat sheet gets a line in "Keep reading".** Added 2026-08-08.
      Paste exactly this, last item in the list, so it sits above the author bio:
      `<li><a href="https://sta-checkout.theshannonnicole.workers.dev/cheatsheet"><strong>Free: the Is My Home Toxic cheat sheet</strong></a> 40 products, 6 rooms.</li>`
      It costs about 10 words, so check A13 again after adding it. Two posts went
      over the ceiling on 2026-08-08 purely from this line.

## GHL / PLATFORM TRAPS  (established by direct test, do not re-derive)

| Thing | Truth |
|---|---|
| `PUT /blogs/posts/{id}` with `rawHTML` | **silently ignored**, returns 200, body unchanged |
| `PUT` with `urlSlug` / `status` / `archived` | works |
| `PUT` missing `locationId`+`blogId` | 422 |
| archive control | boolean `archived`, NOT `status: ARCHIVED` |
| `status: DRAFT` | **UNPUBLISHES a live post** (404'd the avocado post this way) |
| body edit of a LIVE post | **DO IT IN THE GHL UI.** Proven again 2026-08-06 |
| POST a new post on a FRESH slug | renders publicly in seconds. This is what blog-publish.py does and it works |
| POST a replacement onto an EXISTING slug | **404s the live page.** GHL's public router keeps resolving that slug to the OLD post id, so the new post is unreachable no matter what you set. Setting `publishedAt` does not fix it. The only recovery is to park the new copy on a junk slug as DRAFT and put the original back, which restores 200 instantly. This is what makes `blog-swap-body.py` unusable on this blog |
| image-only change | overwrite the same repo path, no republish needed |
| list posts | `/blogs/posts/all?locationId=&blogId=&limit=&offset=&status=PUBLISHED` — **`status` is REQUIRED** or it returns 0. Flaky, retry it |
| `raw.githubusercontent.com` | **caches for MINUTES and ignores `?cb=` query strings.** On 2026-08-07 it handed blog-publish.py a body committed a minute earlier that was three edits out of date, and the dry run assembled the OLD post with the OLD images. Never read a just-committed repo file from RAW. `blog-publish.py` now goes through the **GitHub Contents API** (`/contents/<path>?ref=main`, base64 in `content`), which always reflects the real commit |
| GitHub Pages CDN | caches 404s. Wait for the Pages build to reach your commit, THEN verify with `?cb=` |
| `_config.yml` `exclude:` | anything listed vanishes from the live site |
| `POST /workflows/` | **404, there is no create endpoint.** GHL workflows cannot be made from the API at all, only read. And the builder freezes the renderer under browser automation on this account (150 workflows in the list). Anything that needs a workflow is either a manual build by Shannon or has to live in the Worker |

## THE TOOLS

| Tool | Does |
|---|---|
| `blog-images.py <photos-date> --live` | Higgsfield PNGs -> WebP <=150KB -> repo -> permanent URLs |
| `blog-enhance.py <queue-date> --write` | H2 anchors, TOC, internal links, FAQ schema |
| `blog-republish.py <queue-date> --live` | safe POST-new-then-retire-old republish |
| `blog-publish.py <queue> <photos> --live` | first publish, A-B-C-D |
| `gh-put.py <local> <repo/path> "msg"` | commit one file |

---

## WHAT THE SITES BEATING US ACTUALLY DO

| Site | Beats us on | The thing to copy |
|---|---|---|
| bettergoods.org | "is Pine-Sol toxic" #1 | An H3 per chemical name. 12-15 authority citations |
| thegentlealbum.com | Scentsy | 20+ internal links, TOC, named author w/ photo. Only 1,200 words |
| thefragrancenomads.com | Scentsy | Experience in the title: "What 15 Years of Use Taught Us" |
| safeortoxic.com | Pine-Sol | One repeatable "is X toxic" template across the category |
| getbetterwellness.com | Scentsy | Names the brand as the villain |
| karensgreencleaning.com | Fabuloso | Owns the pet-safety sub-question |
| truecellularformulas.com | Fabuloso | Product brand running a content blog, same model as us |
| healthline / City of Hope | talc + cancer | Medical reviewer on the byline |
| drugwatch / topclassactions | talc + cancer | Own the litigation angle |

**The pattern:** they win the CATEGORY, not the article. Same skeleton, every product
variation, all cross-linked.

**The strategic limit:** on medical questions ("does baby powder cause cancer") the
winners are Healthline, City of Hope and law firms. We will not outrank them. We CAN
outrank a template farm on **"is [specific brand] toxic"**. Target brand+product
queries, not medical questions.

**Our unfair advantage, currently invisible:** bettergoods.org is written by a nameless
"Better Goods Team". Shannon is a real woman who has lived this for 34 years. That is
the moat, and it is worth nothing until the author page exists (B10).
