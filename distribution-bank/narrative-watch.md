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
