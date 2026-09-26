---
type: recompress
raised: 2026-09-26
status: open
blocks: nothing (posts can publish; this is page speed)
---

# 63 delivered WebPs are over the 150 KB limit

`CHECKLIST.md` gate **C3** says every blog image is WebP, 1600px wide, **150 KB or less**. The
writing audits on 2026-09-25 and 2026-09-26 kept flagging files over it (the largest is 373 KB).
Heavy images slow the page on a phone, and page speed is part of how Google ranks the post.

This is a request only. Nothing was opened, viewed, graded or re-encoded on the content side.

**The ask:** re-encode each file below at the SAME path and SAME file name (1600px wide, WebP, at
or under 150 KB). Overwriting in place means the live and queued posts pick up the smaller file
with no republish and no slug risk. Your checklist decides the quality trade-off; if a frame
cannot get under 150 KB without visible damage, keep the better-looking file and note it here.

Sizes are from the repo copy in `blog-images/` on 2026-09-26, largest first:

- `areplasticb-belonging-v1.webp` 373 KB (post: are-plastic-bags-actually-recyclable)
- `severanceat-freedom-v1.webp` 359 KB (post: severance-at-52-what-next)
- `commissions-belonging-v1.webp` 346 KB (post: commissions-dropped-real-estate)
- `canyouexerc-together-v1.webp` 318 KB (post: can-you-exercise-your-way-out-of-bad-sleep)
- `arestorebra-belonging-v1.webp` 317 KB (post: are-store-brand-eye-drops-safe)
- `audiencebut-belonging-v1.webp` 315 KB (post: audience-but-no-product)
- `isafranchis-freedom-v1.webp` 307 KB (post: is-a-franchise-worth-it-at-50)
- `aremakeupre-belonging-v1.webp` 293 KB (post: are-makeup-remover-wipes-safe)
- `severanceat-belonging-v1.webp` 289 KB (post: severance-at-52-what-next)
- `arestorebra-freedom-v1.webp` 275 KB (post: are-store-brand-eye-drops-safe)
- `audiencebut-freedom-v1.webp` 275 KB (post: audience-but-no-product)
- `tiredofsell-belonging-v1.webp` 271 KB (post: tired-of-selling-someone-elses-product)
- `tiredofsell-freedom-v1.webp` 262 KB (post: tired-of-selling-someone-elses-product)
- `recurringvs-freedom-v1.webp` 259 KB (post: recurring-vs-residual-income)
- `doeswoolite-belonging-v1.webp` 259 KB (post: does-woolite-revive-colors)
- `doesprevage-belonging-v1.webp` 237 KB (post: does-prevagen-actually-work)
- `whyamitired-together-v1.webp` 236 KB (post: why-am-i-tired-all-the-time)
- `canyouexerc-hero-v1.webp` 235 KB (post: can-you-exercise-your-way-out-of-bad-sleep)
- `doeslaminat-hero-v1.webp` 231 KB (post: does-laminate-flooring-off-gas-formaldehyde)
- `howtotellif-belonging-v1.webp` 228 KB (post: how-to-tell-if-a-business-opportunity-is-legit)
- `issunscreen-belonging-v1.webp` 217 KB (post: 2026-08-24)
- `ltkcreatorp-belonging-v1.webp` 214 KB (post: ltk-creator-payout-change)
- `isyourlipst-freedom-v1.webp` 212 KB (post: 2026-08-27)
- `commissions-freedom-v1.webp` 211 KB (post: commissions-dropped-real-estate)
- `doeslaminat-villain-v1.webp` 211 KB (post: does-laminate-flooring-off-gas-formaldehyde)
- `howmanyhour-belonging-v1.webp` 207 KB (post: how-many-hours-does-this-take)
- `whendoesano-hero-v1.webp` 202 KB (post: when-does-an-online-shop-stop-being-worth-it)
- `howmuchshou-belonging-v1.webp` 201 KB (post: how-much-should-a-50-year-old-woman-have-saved)
- `cookievscus-villain-v1.webp` 199 KB (post: cookie-vs-customer)
- `whyamitired-context-v1.webp` 194 KB (post: why-am-i-tired-all-the-time)
- `whendoesano-freedom-v1.webp` 194 KB (post: when-does-an-online-shop-stop-being-worth-it)
- `doeswoolite-freedom-v1.webp` 191 KB (post: does-woolite-revive-colors)
- `howmanyhour-hero-v1.webp` 186 KB (post: how-many-hours-does-this-take)
- `whendoesano-turning-point-v1.webp` 185 KB (post: when-does-an-online-shop-stop-being-worth-it)
- `withoutpost-belonging-v1.webp` 185 KB (post: without-posting-your-face)
- `howtoreadan-belonging-v1.webp` 184 KB (post: how-to-read-an-income-disclosure)
- `arekcupsrea-freedom-v1.webp` 183 KB (post: are-k-cups-really-recyclable)
- `howtotellif-hero-v1.webp` 182 KB (post: how-to-tell-if-a-business-opportunity-is-legit)
- `recurringvs-belonging-v1.webp` 175 KB (post: recurring-vs-residual-income)
- `doeslaminat-freedom-v1.webp` 175 KB (post: does-laminate-flooring-off-gas-formaldehyde)
- `areplasticb-hero-v1.webp` 174 KB (post: are-plastic-bags-actually-recyclable)
- `arekcupsrea-hero-v1.webp` 173 KB (post: are-k-cups-really-recyclable)
- `canyouexerc-context-v1.webp` 172 KB (post: can-you-exercise-your-way-out-of-bad-sleep)
- `whyamitired-ease-v1.webp` 170 KB (post: why-am-i-tired-all-the-time)
- `is45toolate-freedom-v1.webp` 170 KB (post: is-45-too-late-to-start-something-new)
- `arekcupsrea-turning-point-v1.webp` 169 KB (post: are-k-cups-really-recyclable)
- `howtotellif-turning-point-v1.webp` 165 KB (post: how-to-tell-if-a-business-opportunity-is-legit)
- `whyamitired-hero-v1.webp` 165 KB (post: why-am-i-tired-all-the-time)
- `arekcupsrea-belonging-v1.webp` 163 KB (post: are-k-cups-really-recyclable)
- `areflushabl-belonging-v1.webp` 162 KB (post: are-flushable-wipes-actually-flushable)
- `areplasticb-turning-point-v1.webp` 159 KB (post: are-plastic-bags-actually-recyclable)
- `tiredofsell-hero-v1.webp` 159 KB (post: tired-of-selling-someone-elses-product)
- `issunscreen-villain-v1.webp` 156 KB (post: 2026-08-24)
- `doesprevage-turning-point-v1.webp` 156 KB (post: does-prevagen-actually-work)
- `isafranchis-hero-v1.webp` 155 KB (post: is-a-franchise-worth-it-at-50)
- `extraincome-belonging-v1.webp` 155 KB (post: builder-extra-income-women-50s)
- `severanceat-turning-point-v1.webp` 155 KB (post: severance-at-52-what-next)
- `isfabuloso-turning-point-v2.webp` 154 KB (post: is-fabuloso-safe)
- `isafranchis-belonging-v1.webp` 154 KB (post: is-a-franchise-worth-it-at-50)
- `arefooddyes-belonging-v1.webp` 153 KB (post: are-food-dyes-still-legal)
- `howmanyhour-villain-v1.webp` 152 KB (post: how-many-hours-does-this-take)
- `howmuchshou-hero-v1.webp` 151 KB (post: how-much-should-a-50-year-old-woman-have-saved)
- `howmuchshou-freedom-v1.webp` 151 KB (post: how-much-should-a-50-year-old-woman-have-saved)
