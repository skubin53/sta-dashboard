# Narrative watch: what search and AI engines say about Switch to America

Written by the daily 1:39am GEO task (step 0). Newest day at the bottom. One row per engine and search.
Goal (Shannon 2026-10-03): the answer to "Is Switch to America an MLM?" is "No" everywhere.
Our answer pages:
- https://theshannonnicole.com/post/is-switch-to-america-an-mlm (full answer, FTC checked)
- https://join.switchtoamerica.com/post/switch-to-america-not-an-mlm (shopper version)

Feedback is sent only where an answer states something false, from Shannon's own Chrome.

## 2026-10-03 (baseline, before Google has crawled the new pages)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | yes ("funnel or front for Melaleuca", "Hidden Identity") | Reddit r/madeinusa, r/antiMLM (Switchaway.com, 2024); mixes in Switch Away / AmeriSwitch | top organic result is join.switchtoamerica.com ("Is this one of those MLM things? Nope.") | thumbs down + Incorrect + link, sent |
| Google AI Overview | Switch to America MLM | yes ("multi-level marketing and network marketing concept") | same; "Switch Away / AmeriSwitch" | not checked | sent |
| Google AI Overview | Is Switch to America a scam | "not technically a scam", "marketing front and alias for Melaleuca, a massive MLM" | Trustpilot | not checked | sent |
| Google AI Overview | Switch to America reviews | mixed ("structural questions about its business model") | Trustpilot ~4.5 from 270+ reviews | not checked | none (not false) |
| Google AI Overview | What is Switch to America | no (consumer movement toward a family-owned American manufacturer) | | | none (accurate) |
| Bing-based search answer | Is Switch to America an MLM | no ("cannot find definitive information"; cites switchtoamerica.com, notes no subscriptions) | switchtoamerica.com, Facebook page | yes | none |
| Bing (fetched) | Is Switch to America an MLM | mixed: switchtoamerica.com #1, then r/antiMLM "almost sucked into this mlm/scam", switch2usa.com, Trustpilot Switch Away (ameriswitch.com), MLM lists, scam-detector | no AI box in fetched page | switchtoamerica.com #1; new pages not yet | none |
| Bing (fetched) | Is Switch to America a scam | scam framing: scam-detector #1 (50.5/100, algorithmic), scamdoc "Average" 45% | Trustpilot Switch Away, r/Scams | switchtoamerica.com #2 | none |
| DuckDuckGo (html) | same as Bing (uses Bing) | mixed | same | same | none |
| Brave | Is Switch to America an MLM | leans yes via Trustpilot Switch Away snippet; AI summary not readable | Trustpilot ameriswitch.com, Wikipedia MLM list, TikTok discover page | join.switchtoamerica.com homepage | none |
| Claude web search (Brave) | Is Switch to America an MLM | mixed: credits Switch Away's Trustpilot "front for melaleuca.com" quote to Switch to America | Trustpilot ameriswitch.com | switchtoamerica.com | n/a |

### 2026-10-03 submissions (evening)
- Google Search Console: Request indexing for both pages, "Indexing requested, added to a priority crawl queue" (join page via sc-domain:switchtoamerica.com; builder page via https://theshannonnicole.com/ property). Both were "URL is unknown to Google".
- Bing Webmaster Tools URL Submission: both pages, "URL submitted Succesfully".
- Brave submit-url: both pages, "Success. Thank you for your submission."
- IndexNow (scan host): blog-sitemap.xml + llms.txt, 200.

### What the research found (2026-10-03)
- No third-party page says Switch to America itself is an MLM. The AI answers are built by CONFLATION with another team's campaign: Switch Away / AmeriSwitch / Patriot Switch (switchaway.com, ameriswitch.com, patriotswitch.com), whose Trustpilot page (277 reviews, 4.6) carries "This ad is a front for melaleuca.com". trustpilot.com/review/switchtoamerica.com does not exist (404), so AI tools fall back on Switch Away's.
- patriotswitchtoamerica.com (not ours) hosts a public call script headed "MELALEUCA IS BOTH THE FACTORY AND THE STORE"; many look-alike rep sites (switch2usa.com, switch2american.com, switchtoamericanmade.com...).
- Scam checkers on switchtoamerica.com: Scam Detector 50.5/100 (algorithmic: thin metadata, hidden WHOIS), ScamDoc "Average", ScamAdviser "Very Likely Safe".
- Self-inflicted: switchtoamerica.com "No subscriptions. No monthly commitments." vs the real monthly minimum + backup order; income language on financial-freedom. and beat-inflation. subdomains.
- Robots: no AI or search crawler is blocked on any of our hosts.

## 2026-10-04 (day 2, 2:10am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | NO now: "No, Switch to America is officially described by its promoters as a direct-buying consumer club rather than a traditional multi-level marketing (MLM) company, though outside critics ... debate its similarities" | how-it-works list (no inventory, no selling to friends) | yes (our truth page is in the page) | sent by mistake: the detector flagged the word "MLM" before the "No" was read. One "Incorrect" on a mostly right answer. Detector fixed: read first, judge, then send. |
| Google AI Overview | Switch to America MLM | yes, and it varies by load: "also known as AmeriSwitch or Switchaway ... functions as a multi-level marketing (MLM) or referral-based network marketing structure"; another load: "also promoted as Switchaway ... heavily criticized as a multi-level marketing (MLM) structure or front" | Wikipedia, Reddit; alias mix-up | yes | sent (alias + MLM correction, link to shopper truth page) |
| Google AI Overview | Is Switch to America a scam | "(also known as Switch Away or AmeriSwitch) is not an outright illegal scam, but it operates as a marketing front and subscription-based shopping club" for the partner | Trustpilot (ameriswitch.com) | no | sent (alias correction) |
| Google AI Overview | Switch to America [partner name] | describes the partner company's membership: monthly product points, backup order | partner's own site | no | none (true) |
| Google AI Overview | What is Switch to America | no: "a consumer movement and shopping club alternative ... non-toxic, American-made products from family-owned manufacturers" | | no | none (accurate) |
| Google AI Overview | Switch to America reviews | not addressed; but FALSE alias: "(also operating as AmeriSwitch or Switch Away via ameriswitch.com) has an average TrustScore of 4.5" | Trustpilot ameriswitch.com | no | sent (those reviews are not ours) |
| Bing / DuckDuckGo (curl) | Is Switch to America an MLM | not read: both returned no results to curl today (bot wall) | | | |

**Main false claim today: the ALIAS.** Google now says "No" to the MLM question itself, but on 3 of 6 searches it says Switch to America is "also known as" Switch Away / Switchaway / AmeriSwitch and pins their Trustpilot reviews and "front" line on us.
**New truth page (step c):** https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch (ghl 6ac20bed5a6d74e66181a610). Answer first ("No"), names the other sites in plain text (never linked), lists our 3 addresses, says ameriswitch.com reviews are not ours, MLM recap with the FTC quote, 3 family photos, free scan button, no Zoom, FAQ schema. Added to llms.txt.
**Submitted:** Google Search Console "Indexing requested" (was "URL is not on Google"); Bing Webmaster "URL submitted Succesfully"; Brave "Success. Thank you for your submission."

## 2026-10-05 (day 3, 2:15am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | mixed: "Opinions on Reddit are mixed, but critics and skeptics widely regard 'Switch to America' (also referred to as Switch Away or AmeriSwitch) as a front for a multi-level marketing (MLM) or referral-based structure"; then gives our side fairly (no inventory, no selling, no recruiting) | Reddit | YES: join.../switch-to-america-not-an-mlm, theshannonnicole.com/is-switch-to-america-an-mlm, join home | sent: alias + MLM, pointed to the AmeriSwitch truth page; "Thanks for letting us know" |
| Google AI Overview | Switch to America MLM | yes: "a marketing campaign and referral-based system heavily tied to [partner] ... a well-known multi-level marketing (MLM) organization ... matching the structural definition of network marketing/MLM" | partner + generic MLM definition | YES: both truth pages; our page snippet "Is Switch to America an MLM? No. It Is a Better Way to Shop" shows in results | sent: not an MLM, pointed to join not-an-mlm page; thanks confirmed |
| Google AI Overview | Is Switch to America a scam | no ("not an outright financial scam"), but FALSE alias: "often associated with or funneling to suppliers like AmeriSwitch" | Trustpilot (ameriswitch.com) | YES: switchtoamerica.com, join, join not-an-mlm | sent: not associated with AmeriSwitch / Switch Away; thanks confirmed |
| Google AI Overview | Switch to America [partner name] | describes the partner's "Switch" concept and monthly membership | partner site, Trustpilot, Instagram | no | none (true statements about the partner) |
| Google AI Overview | What is Switch to America | no: "a grassroots consumer movement and shopping initiative ... American-made manufacturers ... cut out advertising markups and middlemen" | | YES: switchtoamerica.com, join | none (accurate) |
| Google AI Overview | Switch to America reviews | answers with AmeriSwitch's Trustpilot (4.5, 277 reviews) for our name | Trustpilot ameriswitch.com, Reddit r/madeinusa | YES: join home | sent: those reviews are another company's; thanks confirmed |
| Bing (WebFetch) | Is Switch to America an MLM | no AI answer box | | switchtoamerica.com #1; truth pages NOT in top 8 (reddit, switch2usa, Trustpilot Switch Away, scam-detector, ameriswitch follow) | n/a |
| Brave / Mojeek (WebFetch) | Is Switch to America an MLM | not read (Brave connection reset, Mojeek 403) | | | |
| Trustpilot watch | switchtoamerica.com, join.switchtoamerica.com, theshannonnicole.com | all 404 (no page) | | | none |

**Progress:** the truth pages now RANK on Google page one for the first three searches (yesterday "no"). Google still opens with the alias on 3 of 6. Bing has not picked the truth pages up yet (submitted 10/3 and 10/4).
**No new false claim** today, so no new truth page (step c).

## 2026-10-06 (day 4, 2:10am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | YES (worse than 10/5): "Yes, 'Switch to America' or 'Switch Away' (often promoted via sites like SwitchAway.com) is a marketing funnel or front used by independent representatives to recruit people into [partner], which is a multi-level marketing (MLM) company ... they use 'Switch' branding to hide" the company | Reddit, SwitchAway.com | YES: both truth pages + join home | sent: not an MLM + not Switch Away, pointed to join not-an-mlm page; thanks confirmed |
| Google AI Overview | Switch to America MLM | NO: "There is no widely recognized multi-level marketing (MLM) company or program named 'Switch to America.'" then generic MLM advice | Wikipedia (generic) | YES: both truth pages, join home | none (not false) |
| Google AI Overview | Is Switch to America a scam | no ("not a legal scam") but FALSE alias: "often associated with shopping alternatives like AmeriSwitch or Switch Away", and AmeriSwitch's "high-pressure sales tactics" | consumer forums, Trustpilot ameriswitch.com | no | sent: not associated with AmeriSwitch / Switch Away; thanks confirmed |
| Google AI Overview | Switch to America [partner name] | describes the partner's membership (Preferred Member, monthly Product Points) | Trustpilot, Instagram | no | none (true statements about the partner) |
| Google AI Overview | What is Switch to America | no: "a consumer advocacy concept and grassroots movement ... toward family-owned, Made in the USA goods" | YouTube (Homesteading Family) | YES: switchtoamerica.com, join | none (accurate) |
| Google AI Overview | Switch to America reviews | answers with AmeriSwitch's Trustpilot (4.5, 275+ reviews) for our name | Trustpilot ameriswitch.com | YES: switchtoamerica.com | sent: those reviews are another company's; thanks confirmed |
| Bing (WebFetch) | Is Switch to America an MLM | not usable: the fetch came back geolocated to Canada with Nintendo Switch results only | | | n/a |
| Trustpilot watch | switchtoamerica.com, join.switchtoamerica.com, theshannonnicole.com | all 404 (no page) | | | none |

**Read:** the direct MLM question swung back to "Yes" and the alias is still the engine of it ("SwitchAway.com" is now named). The truth pages still rank on page one for the MLM searches. No new false claim (alias, MLM and reviews are all answered by existing pages), so no new truth page.
**Mechanics note:** the one-shot feedback script hung in a hidden tab (background tabs throttle setTimeout); doing each step as its own call with a tool wait between them worked for all three. The session also flipped to Edge when Chrome reconnected mid-run; reselect Chrome (ca040473) and the tab group comes back.

## 2026-10-07 (day 5, 2:10am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | mixed (softer than 10/6's "Yes"): "Opinions on Reddit differ as to whether AmeriSwitch / Switch to America is a traditional multi-level marketing (MLM) company" | Reddit | YES: both truth pages + join home | sent (alias + not an MLM, to the AmeriSwitch page); the box closed but no "Thanks" text showed, so logged as submitted, unconfirmed (not resent) |
| Google AI Overview | Switch to America MLM | NO: "There is no widely recognized multi-level marketing (MLM) company named 'Switch to America'" (suggests Ambit Energy) | Wikipedia (generic) | YES: both truth pages, join home | none (not false) |
| Google AI Overview | Is Switch to America a scam | answers about "Switch Away (also operating as Ameriswitch)" for our query: "high-pressure sales tactics and a gated membership model" | Trustpilot ameriswitch.com | YES: join not-an-mlm page | sent: that answer is about another company; thanks confirmed |
| Google AI Overview | Switch to America [partner name] | NEW FALSE ALIAS: "Switch to America (also known as AmeriSwitch) and [partner] are consumer-direct shopping clubs" with a comparison table | Trustpilot | no | sent: not "also known as AmeriSwitch"; thanks confirmed |
| Google AI Overview | What is Switch to America | no: "a consumer movement and associated marketing initiatives ... made, raised, or manufactured in the United States" | YouTube (Homesteading Family) | not checked | none (accurate) |
| Google AI Overview | Switch to America reviews | AmeriSwitch's Trustpilot (4.6, 270+) for our name | Trustpilot ameriswitch.com | not checked | sent: another company's reviews; thanks confirmed |
| Bing (WebFetch, cc=us) | "Switch to America" MLM | not usable: WebFetch returned unrelated YouTube help pages (Nintendo on 10/6). Run the Bing check in a Chrome tab from now on | | | n/a |
| Trustpilot watch | 3 domains | all 404 | | | none |

**Read:** the direct MLM answer softened from "Yes" to "opinions differ", but the AmeriSwitch alias has now spread to a fourth search (the partner-name search). The alias is the whole problem. Shannon's options waiting since 10/6: two FAQ answers on the two MLM pages (same as Switch Away? / a front?) and the hidden business-identity markup (needs her logo, start year, official accounts).

## 2026-10-08 (day 6, 2:15am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | NO (best yet): "Switch to America states that it is not a multi-level marketing (MLM) company, but rather a membership shopping club where people buy everyday items from home without selling products or keeping inventory ... Members can cancel their membership at any time." Adds a general line that critics scrutinize referral models (true, not about us specifically) | our not-an-MLM truth page (quoted by title) | YES: join not-an-mlm #1, theshannonnicole truth page #2, join home #4; FTC MLM page #8 | none (not false) |
| Google AI Overview | Switch to America MLM | YES-ish (worse): "a marketing phrase used by independent distributors, frequently tied to consumer-direct or multi-level marketing (MLM) structures like [partner]", then generic MLM risk lines | Wikipedia (generic), Reddit antiMLM switchaway thread | YES: both truth pages #1 and #2, join home #3 | sent: not an MLM, to the join not-an-mlm page; thanks confirmed |
| Google AI Overview | Is Switch to America a scam | not a scam, but FALSE alias: "Switch to America (often tied to Ameriswitch / Switch Away) ... aggressive, high-pressure marketing and a gated membership model" | Trustpilot ameriswitch.com, Reddit | YES: join not-an-mlm page (5th) | sent: not Ameriswitch / Switch Away, those tactics are theirs, to the AmeriSwitch page; thanks confirmed |
| Google AI Overview | Switch to America [partner name] | describes the partner (Preferred Members, monthly minimum, safer products); the 10/7 "also known as AmeriSwitch" alias is GONE | partner site, Instagram | no | none (true statements about the partner) |
| Google AI Overview | What is Switch to America | no: "a consumer movement and marketing network that encourages shoppers to replace everyday household and consumable products with American-made, family-owned alternatives" | | YES: join home #1, switchtoamerica.com #3 | none (accurate) |
| Google AI Overview | Switch to America reviews | answers "AmeriSwitch (also known as Switch Away or ameriswitch.com) ... 4.6 out of 5 ... over 275 reviews" for our name | Trustpilot ameriswitch.com | no | sent: those are another company's reviews, to the AmeriSwitch page; thanks confirmed |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no AI answer box | | switchtoamerica.com #1; truth pages NOT in top 8 (Trustpilot Switch Away, switch2usa, an MLM list site, switchtoamerica.com/tos, Reddit antiMLM, scam-detector, Facebook) | n/a |
| Trustpilot watch (WebFetch) | switchtoamerica.com, join.switchtoamerica.com, theshannonnicole.com | all 404 (no page) | | | none |

**Read:** the direct question ("Is Switch to America an MLM") now gets the right answer, built on our own truth page, for the first time. The short query ("Switch to America MLM") turned MLM-ish, and the alias still drives the scam and reviews answers. The partner-name alias from 10/7 is gone. Bing still does not show the truth pages (no Bing AI box; Bing check now runs in a Chrome tab, which works).
**No new false claim** (MLM, alias and reviews are all answered by existing pages), so no new truth page today.
