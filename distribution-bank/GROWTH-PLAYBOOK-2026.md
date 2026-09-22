# Growth Playbook 2026 (Pinterest + AI-search/Bing)

Researched 2026-09-22. The scan link is the money link: **https://scan.ismyhometoxic.com/now/**. Distribution rules + venues + hooks live in `scan-placements.md`; this file is the Pinterest and AI-search strategy.

## Pinterest (it is a search engine, not a social feed)
Reach comes from search + recommendations, so a ~959-follower account can win on ranking alone. Do NOT chase followers.
- **Fresh pins beat repins.** A new pin gets a 24-48 hour visibility window. "Fresh" = a genuinely new image AND a new angle (the 2026 algorithm reads the image semantically, so recolors and swapped backgrounds do not count). One blog post can spawn 3-5 distinct pin designs over time, staggered across boards.
- **Cadence, never bursts.** 3-5 fresh pins/day spread across the day. Ours: 2 at noon + 2 at 7pm = 4/day. Never point 2 pins at the same URL inside 72 hours (that is what throttled the account before, and it can persist for weeks).
- **SEO is everything.** Keywords in the pin title (primary keyword in the first ~40 chars), description (300-500 chars, 3-5 keywords in real sentences, NO hashtags in 2026), alt text, board name (an exact-match search phrase), board description, and profile.
- **Video + idea pins** get ~2x engagement and a 2026 distribution push; under-produced in this niche. Static pins stay the workhorse for outbound clicks. Run a mix.
- **Design for saves + clicks** (the ranking signals now). A pin with impressions but no clicks gets buried; the image must earn the click. Curiosity headline that hints at the answer without giving it away.
- **Specs:** 1000x1500 (2:3); text overlay 4-8 words, 60px+, top two-thirds, high contrast; design/preview at mobile size.
- **Board plan** (exact-match keyword names, each a 3-5 keyword description): Non-Toxic Cleaning Swaps, Safer Personal Care, Clean Beauty Over 50, Non-Toxic Home for Beginners, American Made Home Products, Toxin-Free Pantry Swaps, Empty Nest Home Reset, Homestead Clean Living. (Maps to the four creator angles: empty nest, clean beauty over 50, homesteading, patriot/American made.)
- **Keyword sources:** Pinterest search-bar autocomplete, guided-search tiles, Trends. Plan seasonal pins 45-60 days ahead.

## AI-search / Bing (this is how regular shoppers on ChatGPT find us)
ChatGPT search + Copilot pull from the **Bing index**; Perplexity blends its own crawl with Bing and shows inline sources ~97% of the time (use it as the test bench).
- **The highest-leverage move is being the helpful voice INSIDE the domains AI already trusts.** ~67% of ChatGPT citations go to ~30 domains; **Reddit is ~40%**, then YouTube, LinkedIn (Microsoft-owned, doubles as a Bing signal), Quora, Wikipedia, major publishers. Our own new pages rarely get cited fast, so value-first answers on Reddit/Quora/LinkedIn/Medium that name us and link the scan are what AI pulls. **Value-first placement IS the GEO strategy** (see `scan-placements.md`).
- **Feed Bing daily with IndexNow.** Batch POST new/updated URLs to `https://api.indexnow.org/indexnow` (fans out to Bing/Yandex) with the key + keyLocation; 200/202 = accepted. Only submit URLs on the same host as the key file. Single-URL GET: `https://www.bing.com/indexnow?url=<URL>&key=<KEY>&keyLocation=<KEYFILE>`.
- **On-page GEO pattern** (per answer page): a 2-3 sentence direct answer at the very top; H1-H2-H3 with question-shaped headers that have concrete answers; **at least one sourced statistic** (raises citation odds ~+26%; never invent one, cite the real study); one quotable definitive sentence; FAQ + Article schema; Shannon byline + short bio + real numbers (7 years, 100+ women); an internal link to the scan; keep it under 2 years old / refresh the date (79% of AI bots favor content from the last 2 years). Clean H1-H2-H3 structure is ~2.8x more likely to be cited.
- **Match format to intent:** informational questions -> how-to articles; commercial questions -> "best safer swaps for X" listicles. Build both.
- **Keep the entity name identical everywhere** (Switch to America / Shannon Nicole / Is My Home Toxic) so AI associates the citations; inconsistent naming splits authority.
- **Reality check on llms.txt:** a 2026 study of 137k+ domains found only ~3% of llms.txt files got ANY AI-crawler request, and no major provider confirms using it. Keep ours tidy, but it is NOT a citation lever - schema, page quality, freshness, and third-party mentions move the needle.
- **AI-visibility check** (rotate, track the trend not a snapshot): in a logged-out session, ask a category buyer-intent question (not our brand name) with browsing on, and note whether our domain appears. Only ~20% of brands stay visible across 5 repeat runs, so repeat the same prompts over weeks.

## One-time human setup (blocks the fully-automated version until done)
1. **Bing Webmaster Tools: verify all 3 domains** (scan.ismyhometoxic.com, join.switchtoamerica.com, theshannonnicole.com) with Shannon's Microsoft account, submit each sitemap. The single most important item - opens crawl-error data + Request Indexing, and it is what feeds ChatGPT search.
2. **Aged Reddit + Quora accounts** with real karma/history to post the placement-bank drafts (a brand-new account dropping a link is shadowbanned instantly). The cron drafts; a human posts.
3. **Pinterest:** confirm the business account has the website CLAIMED and Rich Pins validated once.
4. **Facebook groups are blocked** until a Meta account is restored (hers are shut) or a VA uses their own.
5. Optional: confirm LinkedIn + Medium logins (both AI-cited; LinkedIn feeds Bing).
