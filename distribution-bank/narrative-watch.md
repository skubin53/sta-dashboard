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
