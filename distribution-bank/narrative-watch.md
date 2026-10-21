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

## 2026-10-09 (day 7, 2:20am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | mostly NO: "Switch to America states that it is not a multi-level marketing (MLM) company, presenting itself instead as a home-shopping club for American-made goods" (no selling, no recruiting mandate, membership model); then a true line that it links to [partner] and that critics say the referral model "closely mirrors" MLM models | our truth page (quoted by title) and the join home page | YES: join not-an-mlm #1, theshannonnicole truth page #2, Reddit #3, join home #4 | none (nothing false: the partner link is true, the critics line is opinion) |
| Google AI Overview | Switch to America MLM | YES: "a marketing catchphrase and funnel phrase commonly used by distributors, frequently associated with [partner], a multi-level marketing (MLM) consumer-goods company", "the underlying structure relies on a consumer-membership and referral/downline model characteristic of network marketing" | generic MLM, FTC guidance page, Reddit, Facebook | YES: join not-an-mlm #1, join home #2, theshannonnicole truth page #3 | NOT SENT: "Bad response" and "Incorrect" were clicked, but the step that fills in the feedback text was refused by this session's permission system; nothing was submitted |
| Google AI Overview | Is Switch to America a scam | not a financial scam, but FALSE alias + front: "Switch to America (associated with Switch Away and AmeriSwitch at ameriswitch.com) ... critics and users widely identify it as a front or marketing funnel for [partner]"; "high-pressure membership structures" | Trustpilot ameriswitch.com, Reddit, TikTok, scamadviser (go.switchaway) | NO (worse than 10/8, when join not-an-mlm was 5th) | not attempted (feedback blocked, see above) |
| Google AI Overview | Switch to America [partner name] | describes the partner (monthly 35-point minimum, backup orders, member discounts) | partner site | no | none (true statements about the partner) |
| Google AI Overview | What is Switch to America | no: "a grassroots movement and direct-to-consumer shopping club that encourages people to replace everyday household, wellness, and personal care items with American-made, family-owned alternatives" | | YES: join home #1, switchtoamerica.com #4 | none (accurate) |
| Google AI Overview | Switch to America reviews | FALSE alias: "Switch to America (often associated with the shopping club and movement Switch Away / AmeriSwitch at ameriswitch.com) holds a 4.5 out of 5-star TrustScore on Trustpilot" | Trustpilot switch2us.com + ameriswitch.com | no | not attempted (feedback blocked) |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no AI answer box | | switchtoamerica.com #1; truth pages NOT in top 8 (Trustpilot ameriswitch, switch2usa, scam-detector, an MLM list site, switchtoamerica.com/tos, Reddit antiMLM, Facebook) | n/a |
| Trustpilot watch (WebFetch) | switchtoamerica.com, join.switchtoamerica.com, theshannonnicole.com | all 404 (no page) | | | none |

**Read:** the direct question keeps the right answer for a second day, built on our truth page. The short query stays MLM-ish, and the AmeriSwitch / Switch Away alias still drives the scam and reviews answers. Our truth pages dropped out of the scam results. Bing is unchanged.
**Feedback:** none sent today. Filling Google's feedback text box was refused by the permission system for this session, so the three false answers (MLM, scam alias, reviews alias) went unreported. Shannon can allow it, or send them herself from Google's thumbs-down on those three searches.
**No new false claim** (MLM, alias and reviews are all answered by existing pages), so no new truth page today.

## 2026-10-10 (day 8, 2:15am MT; last day of the week-one focus)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | NO (third day running): "explicitly states that it is not a multi-level marketing (MLM) company, claiming you are not required to sell items, recruit members, or build a team" | our landing pages, Vox (generic MLM) | YES: join not-an-mlm #1, theshannonnicole truth page #2, Reddit #3, join home #4, FTC MLM page #6 | none (not false) |
| Google AI Overview | Switch to America MLM | NO (first time): "a marketing campaign and referral-style landing page ... while explicitly stating it is not a traditional multi-level marketing (MLM) structure" | our landing pages | YES: join not-an-mlm #1, join home #2, theshannonnicole truth page #3 | none (not false) |
| Google AI Overview | Is Switch to America a scam | not a financial scam, but FALSE alias + a new "deceptive marketing" theme: "(also known as \"Switch Away\" or operated via AmeriSwitch) ... widely recognized as a funnel and rebranding tactic for [partner], a multi-level marketing (MLM) company"; "The Reveal": landing pages collect contact details and a representative reveals the partner "often quite late"; critics call hiding the partner name "a bait" | YouTube (Sage and Stone Homestead), Reddit r/antiMLM, Trustpilot ameriswitch.com | NO (top 8: Trustpilot x2, Reddit, TikTok, YouTube, Competition Bureau Canada, Facebook, scamadviser) | not sent (Google feedback is blocked by the permission system since 10/9) |
| Google AI Overview | Switch to America [partner name] | describes the partner (preferred member, 35 points a month, backup orders) | partner site | no | none (true statements about the partner) |
| Google AI Overview | What is Switch to America | no: "a direct-to-consumer shopping club and grassroots movement ... American-made, family-owned alternatives" | | YES: join home #1, switchtoamerica.com #4 | none (accurate) |
| Google AI Overview | Switch to America reviews | FALSE alias: "Reviews for Switch to America (also known as Switch Away or AmeriSwitch via ameriswitch.com and join.switchtoamerica.com) ... 4.5 out of 5 ... over 277 customer reviews on the AmeriSwitch Trustpilot Page" | Trustpilot switch2us.com + ameriswitch.com | no | not sent (blocked) |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no AI answer box | | switchtoamerica.com #1; truth pages not in top 8 (all 98 of our pages were submitted to Bing on 10/9; too early to see) | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 | | | none |

**Read:** both MLM searches now answer "not an MLM" from our own pages, the short query for the first time. The alias still drives the scam and reviews answers, and the scam answer has a new theme: that hiding the partner's name behind patriotic pages is deceptive. That leans on one YouTube video (Sage and Stone Homestead) and Reddit. It is not answered by any page because it touches Shannon's open decision on naming the partner openly, so no new truth page today.

**Week one (10/3 to 10/10) in one line:** the direct MLM question went from "Yes" (10/6) to "No, from our own truth page" for three days, the short query followed on day 8, and both truth pages rank #1 and #2 on Google; the AmeriSwitch / Switch Away alias is the remaining false claim, and Bing has not shown the truth pages yet.

## 2026-10-15 (2:00am MT; first run since 10/10)

No runs 10/11 to 10/14: the daily tasks expired silently after 7 days (restored 10/13), and the 10/14 1:39am run was lost to the overnight Windows update.

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | NO: "No, Switch to America is not a multi-level marketing (MLM) company" (no inventory, no selling to friends, no buy-in) | our truth page | YES: theshannonnicole.com truth page #1 | none (accurate) |
| Google AI Overview | Switch to America MLM | not addressed: the answer is about Market America (a different MLM company, from Wikipedia) and never says Switch to America is an MLM | Wikipedia, Market America | YES: theshannonnicole.com truth page #1, switchtoamerica.com #2 | none (a misread query, not a false statement about us) |
| Google AI Overview | Is Switch to America a scam | not a financial scam, but FALSE alias: "Switch to America (operating as Switch Away or AmeriSwitch at ameriswitch.com)", with AmeriSwitch's complaints (required phone consultations, high-pressure sales) | Trustpilot ameriswitch.com, Reddit | no (top 8: Reddit r/madeinusa, Trustpilot ameriswitch x2, TikTok, Switch Away Facebook, BuzzFeed, ScamAdviser go.switchaway.com, a DC AG alert) | NOT sent: Bad response and Incorrect were clicked, but filling the details box was refused by the permission system, so nothing was submitted |
| Google AI Overview | Switch to America [partner name] | describes the partner (membership, monthly product commitment, new-member pack prices) | partner site, Instagram, Trustpilot ameriswitch.com | no | none (true statements about the partner) |
| Google AI Overview | What is Switch to America | no: "a grassroots movement and online platform ... family-owned, American-made alternatives" | | YES: switchtoamerica.com #1 | none (accurate) |
| Google AI Overview | Switch to America reviews | FALSE alias: "Switch to America (ameriswitch.com), also known as Switch Away ... 4.5 out of 5 stars based on 277 reviews on Trustpilot" | Trustpilot ameriswitch.com, Reddit | switchtoamerica.com #6 | not sent (same refusal) |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no AI answer box (People also ask only) | | switchtoamerica.com #1; truth pages still NOT in top 8, six days after all 98 pages were submitted (Trustpilot Switch Away, scam-detector, switch2usa, Reddit antiMLM, two MLM list sites, an MLM-check article) | n/a |
| Brave (fetched) | Is Switch to America an MLM | n/a | | YES, first time: the three truth pages are the first three results (join not-an-mlm, theshannonnicole.com, same-as-AmeriSwitch), switchtoamerica.com #6, join home #7 | n/a |
| DuckDuckGo (html) | Is Switch to America an MLM | n/a | same as Bing | switchtoamerica.com #1, truth pages not in top 8 (later queries rate-limited) | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 (no page) | | | none |

**Read:** the direct question has said "No" from our own truth page on every check since 10/8. The short query no longer says MLM; Google now reads it as Market America. Brave ranks all three truth pages first. Still wrong: the AmeriSwitch / Switch Away alias in the scam and reviews answers, and our alias page is not in Google's scam results. Bing still shows none of the truth pages.
**Feedback:** none sent. The permission system refused filling Google's details box again (as on 10/9). Shannon can send these two herself from the thumbs-down under each answer, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new false claim** (MLM and alias are answered by existing pages), so no new truth page today.

## 2026-10-16 (1:50am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | mostly NO: "not officially categorized as a traditional multi-level marketing (MLM) company ... a private, membership-based consumer shopping club that utilizes referral-based word-of-mouth promotion" | Facebook, our pages | YES: theshannonnicole.com truth page #1 | none (not false; softer than 10/15's flat "No") |
| Google AI Overview | Switch to America MLM | mixed, NEW framing: "not a traditional multi-level marketing (MLM) company, but rather a promotional and e-commerce label tied to independent branding ... (such as grass-fed beef through platforms like SwitchToAmericaWithShemane), or a marketing front similar to how entities like Switchaway have been tied to network marketing structures like [partner]" | Facebook | YES: switchtoamerica.com #1, theshannonnicole.com truth page #2 | not sent (see below) |
| Google AI Overview | Is Switch to America a scam | FALSE alias again: "Switch to America (often associated with platforms like AmeriSwitch or Switch Away) is not an outright illegal scam, but ... draws significant criticism and skepticism" (loaded only after ~15s) | Trustpilot ameriswitch.com | no (top 8: Reddit r/madeinusa, Trustpilot ameriswitch x2, TikTok, Switch Away Facebook, BuzzFeed, ScamAdviser go.switchaway.com, a DC AG alert) | not sent (see below) |
| Google AI Overview | What is Switch to America | no: "a grassroots consumer movement and platform ... safer, family-owned, American-made alternatives" | | YES: switchtoamerica.com #1 | none (accurate) |
| Google AI Overview | Switch to America reviews | FALSE alias, stronger: "Switch Away (operating via switchtoamerica.com and ameriswitch.com) ... Rated 4.5 out of 5 stars based on 277+ customer reviews" | Trustpilot ameriswitch.com | switchtoamerica.com #6 | not sent (see below) |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | NEW: a Copilot answer box: "there is no evidence that Switch to America is a multi-level marketing (MLM) company ... it has not been independently verified as a legitimate business model" | switchtoamerica.com | switchtoamerica.com #1; truth pages still not in top 8 | n/a |
| Brave (fetched) | Is Switch to America an MLM | n/a | | YES: the three truth pages #1 to #3 (second day) | n/a |
| Brave (fetched) | Is Switch to America a scam | n/a | | YES, first time: join not-an-mlm #1, theshannonnicole.com #2, same-as-AmeriSwitch #4 | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 (no page) | | | none |

**Read:** the direct MLM question still answers no from our truth page, a little softer today. Bing now has an AI answer that also says no evidence of an MLM. The alias got worse in the reviews answer, which now says Switch Away operates switchtoamerica.com. The short query now calls it possibly "a marketing front" and names another rep's beef site. Brave ranks our pages first for both MLM and scam.
**Feedback:** none sent. The permission system refused filling Google's details box on 10/9 and 10/15, so it was not retried without Shannon's say-so. She can send the reviews and scam ones herself from the thumbs-down, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new truth page:** the alias and MLM claims are answered by existing pages. The "marketing front" line is the old hidden-identity theme; answering it would mean naming the partner, which her truth-page rules rule out.

## 2026-10-17 (1:50am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | mostly NO: "a referral-based consumer movement and online shopping club rather than a traditional multi-level marketing (MLM) company, though critics and online discussions frequently link its model to MLM-adjacent concepts" | our truth page, Facebook, the FTC MLM article | YES: theshannonnicole.com truth page #1 | none (not false) |
| Google AI Overview | Switch to America MLM | YES again, FALSE alias + front: "SwitchAway (often framed as 'Making the Switch' or 'Switch to America') is a marketing front and lead-generation tactic used by representatives of [partner], a multi-level marketing (MLM) company", with a "Concealed Identity" section | Reddit r/antiMLM switchaway, Facebook | YES: switchtoamerica.com #1, theshannonnicole.com truth page #2 | not sent (permission refusals 10/9 and 10/15) |
| Google AI Overview | Is Switch to America a scam | FALSE alias: "Switch to America (often associated with Switch Away or AmeriSwitch at ameriswitch.com) is not an illegal scam, though public opinions on its business model are mixed" | Trustpilot ameriswitch.com | no (same top 8 as 10/16) | not sent |
| Google AI Overview | What is Switch to America | no: "a consumer-focused movement and platform ... safer, non-toxic, and family-owned, American-made alternatives" | | YES: switchtoamerica.com #1 | none (accurate) |
| Google AI Overview | Switch to America reviews | FALSE alias: "Switch to America (also known as Switch Away or via ameriswitch.com and switchtoamerica.com) ... Rated around 4.5 to 4.6 out of 5 stars based on over 277" Trustpilot reviews | Trustpilot ameriswitch.com | switchtoamerica.com #6 | not sent |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | Copilot: "no evidence that Switch to America is a multi-level marketing (MLM) company ... has not been independently verified and has some trust concerns" | switchtoamerica.com | switchtoamerica.com #1; truth pages not in top 8 | n/a |
| Brave (fetched) | MLM / scam | n/a | | MLM: truth pages #1 to #3; scam: #1, #2, #4 (same as 10/16) | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 | | | none |

**Read:** the direct question holds, built on our page. The short query swung back to the worst answer since 10/6: it now calls Switch to America a marketing front for the partner, with a "Concealed Identity" section, leaning on the Reddit r/antiMLM switchaway thread. Our truth page is #2 under that answer, so the page is there; Google is choosing the alias source. The scam and reviews answers keep the AmeriSwitch alias. Bing and Brave stay good.
**Feedback:** none sent (not retried after two permission refusals). Shannon's own thumbs-down on the short-query answer is now the most useful one, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new truth page:** the "front / concealed identity" claim is the old hidden-identity theme; a direct answer would mean naming the partner, which her truth-page rules rule out. Flag for Shannon whether that rule should change for this one query.

## 2026-10-18 (about 10:10am MT; the 1:39am run fired late, at 9:56am)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | YES, FALSE, worst ever on the direct question: "Yes, Switch to America (also known as Switch Away or AmeriSwitch) is a marketing funnel and lead-generation front for [partner], which operates on a multi-level marketing (MLM) or referral-based model", with "The Connection / The Pitch / The MLM Aspect" sections | Facebook | YES: theshannonnicole.com truth page #1; join.switchtoamerica.com home #8 but its title shows as "500" (the page has no title tag) | not sent (permission refusals 10/9 and 10/15) |
| Google AI Overview | Switch to America MLM | YES by alias: "Switch Away (often marketed via sites like ameriswitch.com or switchaway.com) ... domains like switchaway.com have frequently operated as funnels or front-end marketing tools linked to [partner], a well-known multi-level marketing (MLM) ... company" | Trustpilot ameriswitch.com, the partner's own site | YES: switchtoamerica.com #1, theshannonnicole.com truth page #3 (r/antiMLM switchaway thread #4) | not sent |
| Google AI Overview | Is Switch to America a scam | FALSE alias: "Switch to America (operating as Switch Away via ameriswitch.com) is not an illegal scam ... a controversial shopping club model"; quotes ameriswitch's 4.5 TrustScore as ours | Trustpilot ameriswitch.com, Reddit r/madeinusa | no (top 8: Reddit, Trustpilot x2, TikTok, Switch Away Facebook, ScamAdviser go.switchaway.com, a DC AG alert, CTIA) | not sent |
| Google AI Overview | What is Switch to America | no: "a grassroots movement and platform that encourages consumers to shift their everyday spending toward family-owned, American-made, and non-toxic products" | | YES: switchtoamerica.com #1 | none (accurate) |
| Google AI Overview | Switch to America [partner] | not addressed: compares AmeriSwitch and the partner as two separate models | Trustpilot ameriswitch.com | no | none |
| Google | Switch to America reviews | no AI Overview today (organic only) | | switchtoamerica.com #5 under Trustpilot ameriswitch, Reddit, Trustpilot switch2us, TikTok | none |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no Copilot box today | | switchtoamerica.com #1; truth pages not in top 8 (a "list of MLM companies" page #3) | n/a |
| Brave (fetched) | MLM / scam | n/a | | MLM: the three truth pages #1 to #3; scam: #1, #2, #5 | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 | | | none |

**Read:** the direct question flipped from no (10/15 to 10/17, built on our page) to a flat yes today, naming the partner and repeating the alias, even though our truth page is still the #1 link under it. The short query and the scam answer keep the AmeriSwitch / Switch Away alias. Bing lost its Copilot box today; Brave stays clean.
**FOUND on our own site:** the join.switchtoamerica.com home page (GHL) has NO title tag and no meta description, so Google lists it under the title "500". Fixing it means adding an SEO title and description in that GHL page's settings, which is her page: needs Shannon's OK.
**Feedback:** none sent (not retried after two permission refusals). Shannon's own thumbs-down on the direct-question answer is now the most important one, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new truth page:** the "funnel / front for the partner" claim cannot be answered without naming the partner, which her truth-page rules rule out. This is now the answer to the direct question, so the 10/17 question to Shannon (bend that rule for this one claim?) is urgent.

## 2026-10-19 (about 2:00am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | back to mostly NO: "not traditionally structured as a multi-level marketing (MLM) company in the legal sense, though it heavily utilizes a consumer-referral and membership model that draws frequent comparisons to MLMs"; names the partner ("often associated with or referring to [partner]"), describes a shopping club, no inventory, no quotas, referral bonuses | Facebook (a member post), the FTC MLM article | YES: join not-an-mlm #1, theshannonnicole.com truth page #2 | none (not false) |
| Google AI Overview | Switch to America MLM | FALSE front/alias theme: "'Switch to American Made,' 'Switch Away,' or 'AmeriSwitch' are marketing fronts and referral funnels used by independent representatives for [partner]", with "The Front / The Catch / The Connection" sections | Trustpilot, Reddit | YES: join not-an-mlm #1, theshannonnicole.com #2, switchtoamericanmade.com #3, switchtoamerica.com #8 | not sent |
| Google AI Overview | Is Switch to America a scam | FALSE alias: "'Switch to America' (also known as Switch Away or AmeriSwitch, operating via Switch Away on Trustpilot) is not an outright scam ... a private shopping club model"; quotes the 4.5 TrustScore | Trustpilot ameriswitch.com | no (top 8: Reddit, Trustpilot x2, TikTok, Facebook, ScamAdviser, DC AG, BuzzFeed) | not sent |
| Google AI Overview | What is Switch to America | no: "a consumer movement and online shopping platform dedicated to offering family-owned, American-made, and non-toxic alternatives", mentions USA Never-Ever Beef and home delivery | | YES: switchtoamerica.com #1, join #5 | none (accurate) |
| Google AI Overview | Switch to America reviews | answers about a different company: "Switch Away (operating via ameriswitch.com) is a household goods wholesaler ... TrustScore: 4.5 out of 5 stars based on 277+ reviews" | Trustpilot ameriswitch.com | switchtoamerica.com #8 | not sent |
| Google AI Overview | Switch to America [partner] | not addressed: describes the partner as a shopping club "rather than a traditional MLM structure" and AmeriSwitch as "a separate household goods wholesaler" | Trustpilot, the partner's own site | no | none |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no Copilot box | | switchtoamerica.com #1; truth pages not in top 8 (switch2usa, Trustpilot, thesponsoringsystem, scam-detector, Reddit, go.switchaway, Facebook) | n/a |
| Brave (fetched) | MLM / scam | n/a | | MLM: the three truth pages #1 to #3; scam: join not-an-mlm #1, theshannonnicole.com #2, same-as-AmeriSwitch #4 | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 | | | none |

**Read:** the direct question swung back from yesterday's flat yes to mostly no, and our two truth pages are now the top two Google links for both MLM searches. The short query keeps the "marketing front / referral funnel" story, now listing Switch to American Made, Switch Away and AmeriSwitch together. The scam and reviews answers still use the Switch Away Trustpilot page as if it were ours. Bing is unchanged; Brave stays clean.
**Feedback:** none sent (not retried after the 10/9 and 10/15 permission refusals). Shannon's own thumbs-down on the short-query and scam answers stays the most useful, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new truth page:** the alias and front claims are already answered by existing pages, and answering "front for the partner" directly still needs Shannon's call on naming the partner.

## 2026-10-20 (about 2:15am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | MIXED: "not officially classified as a multi-level marketing (MLM) company by its promoters, though critics and independent observers often compare its referral and membership model to traditional network marketing structures like [partner] or Amway"; describes a shopping club, no inventory, no quotas, referral bonuses | a Facebook post, Reddit | YES: theshannonnicole.com #1, join not-an-mlm #2 (then Reddit AmeriSwitch, Trustpilot Switch Away) | not sent |
| Google AI Overview | Switch to America MLM | FALSE alias, now about "Switch Away USA (also operating as Switchaway.com or Homeland Shopper)": "a stealth marketing front and recruitment funnel for [partner], a multi-level marketing (MLM) company"; NEW alias "Homeland Shopper"; claims recruiters "intentionally hide" the partner name | a YouTube video (Sage and Stone Homestead) | YES: join not-an-mlm #1, theshannonnicole.com #2, switchtoamericanmade.com #3 | not sent |
| Google AI Overview | Is Switch to America a scam | FALSE alias: "Switch to America (also operating as Switch Away / ameriswitch.com) is not a traditional legal scam"; says it is not an MLM "because participants do not build downlines"; lists complaints about phone-gated onboarding | Trustpilot (Switch Away) | YES: theshannonnicole.com #1, join not-an-mlm #5 | not sent |
| Google AI Overview | What is Switch to America | no: "a grassroots movement and online platform dedicated to helping consumers shift their everyday household and grocery purchases toward family-owned, American-made alternatives" | switchtoamerica.com | YES: switchtoamerica.com #1, theshannonnicole.com #6 | none (accurate) |
| Google AI Overview | Switch to America reviews | answers about a different company: "AmeriSwitch (also known as Switch Away at ameriswitch.com) has a 4.5 out of 5 stars rating on Trustpilot, based on 277 customer reviews" | Trustpilot ameriswitch.com | no | not sent |
| Google AI Overview | Switch to America [partner] | compares "AmeriSwitch (often marketed via phrases like 'Switch Away' or 'Switch to America')" with the partner as two member shopping clubs | Trustpilot, the partner's own site | no | none |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no Copilot box | | switchtoamerica.com #1; truth pages not in top 8 (scam-detector, Trustpilot, switch2usa, thesponsoringsystem, Reddit, Facebook, HuffPost) | n/a |
| Brave (curl) | MLM / scam | n/a | | MLM: the three truth pages #1 to #3; scam: join not-an-mlm #1, theshannonnicole.com #2, same-as-AmeriSwitch #4 | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 | | | none |

**Read:** the direct question is mixed today (yesterday mostly no); our two truth pages stay the top two Google links on both MLM searches and on Brave. The short query now describes "Switch Away USA" with a NEW alias, "Homeland Shopper", as a front that hides the partner, sourced to one YouTube video; the reviews and scam answers keep folding Switch to America into AmeriSwitch / Switch Away. Bing still shows no AI answer and none of the truth pages.
**Feedback:** none sent (not retried after the 10/9 and 10/15 permission refusals). Shannon's own thumbs-down on the short-query, scam and reviews answers stays the most useful, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new truth page:** the alias is already answered by the same-as-AmeriSwitch page; "Homeland Shopper" is attributed to Switch Away USA, not to us, so it does not need its own page yet. Answering the "front for the partner" claim directly still needs Shannon's call on naming the partner.

## 2026-10-21 (about 2:20am MT)

| Engine | Search | Says MLM? | What it leans on | Our pages showing? | Feedback |
|---|---|---|---|---|---|
| Google AI Overview | Is Switch to America an MLM | MIXED: "not officially classified as a multi-level marketing (MLM) company, though promoters use a referral-based membership model that closely resembles one"; "often linked to or patterned after [partner]"; describes a shopping club, no inventory, referral bonuses | Reddit, a Facebook post | YES: theshannonnicole.com #1, join not-an-mlm #2 | not sent |
| Google AI Overview | Switch to America MLM | answers about a different company: "AmeriSwitch is a multi-level marketing (MLM) company" that pays on "recruiting a downline" | a YouTube / NPR podcast, Reddit | YES: join not-an-mlm #1, theshannonnicole.com #2, switchtoamericanmade.com #3 | not sent |
| Google AI Overview | Is Switch to America a scam | FALSE alias: "Switch to America (often associated with AmeriSwitch or Switch Away at ameriswitch.com) is not an outright scam"; "operates similarly to a membership or multi-level marketing (MLM)-style network"; phone-call onboarding complaints | Trustpilot (Switch Away) | join not-an-mlm #5 only (theshannonnicole.com, #1 yesterday, not in the top 8); NEW: a TikTok "Switchtoamerica Review" discover page at #3 | not sent |
| Google AI Overview | Switch to America [partner] | not about us: compares AmeriSwitch with the partner as two member shopping clubs | Trustpilot, the partner's own site | no | none |
| Google AI Overview | What is Switch to America | no: "a consumer movement and direct-to-consumer shopping club that encourages families to replace everyday household goods ... with safer, U.S.-made, family-owned alternatives" | switchtoamerica.com, Huff Industrial Marketing | YES: switchtoamerica.com #1, theshannonnicole.com #5 | none (accurate) |
| Google AI Overview | Switch to America reviews | answers about a different company: "Switch Away (ameriswitch.com) ... 4.5 out of 5 TrustScore on Trustpilot" | Trustpilot ameriswitch.com | no (TikTok "Switchtoamerica Review" #5) | not sent |
| Bing (Chrome tab, cc=us) | Is Switch to America an MLM | no readable AI answer | | switchtoamerica.com #1; truth pages not in top 8 (scam-detector, Trustpilot Switch Away, switch2usa, thesponsoringsystem, Reddit antiMLM, Facebook, HuffPost) | n/a |
| Brave (curl) | MLM / scam | bot-check page served, skipped today | | | n/a |
| Trustpilot watch (WebFetch) | 3 domains | all 404 | | | none |

**Read:** the direct question is mixed again (same as yesterday), and our two truth pages hold the top two Google links on both MLM searches. The scam answer still folds Switch to America into AmeriSwitch / Switch Away, and our scam-query placement slipped (theshannonnicole.com out of the top 8, join not-an-mlm down to #5) while a TikTok "Switchtoamerica Review" discover page rose to #3. Bing still shows no AI answer and none of the truth pages.
**Feedback:** none sent (still not retried after the 10/9 and 10/15 permission refusals). The most useful thumbs-down remains Shannon's own on the scam and reviews answers, pointing to https://join.switchtoamerica.com/post/is-switch-to-america-the-same-as-ameriswitch .
**No new truth page:** no new false claim today; the alias is already answered by the same-as-AmeriSwitch page.
