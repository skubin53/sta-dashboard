# Fix requests: live Dawn dish soap post (for Cameron)

Hey Cameron. Shannon and I reviewed the live Dawn post today. The writing is great and can stay exactly as is. Two fixes: one on this post, one systemic so it does not happen again.

**Post:** https://join.switchtoamerica.com/post/is-dawn-dish-soap-safe (slug `is-dawn-dish-soap-safe`)

## Fix 1 — Hero image + social-share image are STOCK (should be Higgsfield)
- The 5 **body** photos are correct: Higgsfield, served from `d8j0ntlcm91z4.cloudfront.net`. No change needed there.
- But the **hero image AND the `og:image`** (the thumbnail Facebook/social shows when the post is shared) are **Pexels stock** (`images.pexels.com`). That is off our photo standard (Higgsfield Nano Banana Pro, real-not-stock), and it is the first thing people see when this gets shared.
- **Action:**
  - Photo Claude: please generate a Dawn **hero** in the same warm kitchen / hands-at-the-sink style as the existing body photos.
  - Cameron: set that Higgsfield image as **both the post hero and the `og:image`**, replacing the Pexels stock one.

## Fix 2 — One heading rubs against our "never read the label" rule
- Current H2: **"What to look for on a dish soap label"**
- Change to: **"What an honest dish soap actually looks like"**
- Why: our rule is we never tell the reader the fix is to read the label (the label is the lie, the missing ingredient is not printed there). The body of that section already reframes it correctly; this just makes the heading match.

## Systemic (so a stock photo never slips into the hero slot again)
1. The **hero image and the `og:image` must ALWAYS be Higgsfield**, never Pexels or any stock source. If a post is about to publish without a Higgsfield hero, do **not** fall back to a stock photo, request the hero from Photo Claude first.
2. **Every photo request should include a HERO beat**, not just the body images, so there is always a Higgsfield hero to use.

Thanks Cameron. The writing on this one was A-work. Just get the stock photo out of the hero and share slot and it is perfect.
