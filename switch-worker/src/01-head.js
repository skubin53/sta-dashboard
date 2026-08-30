/**
 * The Switch Checklist webhook, and the packs page it sends people to.
 *
 * TWO JOBS NOW.
 *
 *  1. POST /            a checklist submission arrives. Log it to KV, append a NOTE to
 *                       the GoHighLevel contact. This half is UNCHANGED from 2026-08-26.
 *
 *  2. Three packs       Shannon, 2026-08-30: "Yes it should be an automatic message that
 *                       is sent to them once they have completed the checklist."
 *                       So a submission also queues a personal packs page and a text.
 *                       GET /<name> serves that page on packs.ismyhometoxic.com.
 *                       The cron sends the text.
 *
 * WHY THE SEND DOES NOT HAPPEN IN THE WEB REQUEST
 * This endpoint is unauthenticated, by design: the checklist page is public and cannot
 * hold a token. The original file says, in its own words, "anyone who gets hold of a
 * checklist link can therefore add noise to one contact and can never destroy anything."
 * Bolting a text message onto that would hand a stranger a way to make Shannon's business
 * text a real woman, repeatedly, by replaying one POST.
 *
 * So the POST only ever WRITES A ROW. Nothing is sent from a web request, ever. A cron
 * picks the row up, and the row is keyed on the contact id, so a thousand replays create
 * ONE row and send AT MOST ONE text. That is the whole reason for the split.
 *
 * THE SEND FAILS CLOSED. In order, every single time, no exceptions:
 *   - SEND_MODE must be the string "live". Anything else and it only writes down what it
 *     would have done. Deployed as "dryrun" on purpose.
 *   - the contact must be readable from GHL right now. Cannot read, does not send.
 *   - the contact must not be on any stop list. DND, any channel. Any stop tag.
 *   - the contact must have a phone number.
 *   - the packs page must already be answering 200 on the public internet. A text whose
 *     link is dead is worse than no text.
 *   - the stop checks run TWICE: once when the page is built, and again in the seconds
 *     before the send. A woman who replies "no thanks" in between must not get it.
 *   - one text per contact for all time. The KV row is the lock, and it is written
 *     BEFORE the send, not after, so a crash mid-send cannot produce a second one.
 * If any check cannot be completed, that is a NO. Unsure never sends.
 *
 * Bindings: GHL_TOKEN (secret), REPORTS (KV), SEND_MODE (plain text).
 */

const GHL = "https://services.leadconnectorhq.com";

const ALLOWED = [
  "https://scan.ismyhometoxic.com",
  "https://join.switchtoamerica.com",
];

// Reading the log needs this in ?k=. It is not a high value secret, but the log holds
// real women's names, contact ids and everything they ticked, so it is not nothing.
// It lives in a BINDING rather than in this file: hardcoded, it would be readable by
// anyone who ever saw this source, and Shannon's dashboard repo is public. Same value as
// before, so the existing tooling that calls /log keeps working.
function readKey(env) { return String((env && env.LOG_KEY) || ""); }
const PACK_HOST = "https://packs.ismyhometoxic.com";
// Shannon, 2026-08-30: "I think all of these packs can be between 35 - 37 points."
// 35 is the qualifying number, so 36 and 37 qualify just the same. Insisting on exactly
// 35 was throwing away better lists: her example was Chad, whose laundry detergent kept
// falling out because at 10 points it rarely fits an exact 35.
const TARGET_MIN = 35;
const TARGET_MAX = 37;

// Shannon, 2026-08-30: "there is no Laundry Detergent. That should always be in pack 1."
const PRIORITY_FIRST = ["Laundry detergent"];

// Shannon, 2026-08-30: "The beef cuts are Riverbend Ranch, which is why we are not
// including them. I want them on the list so they know we do offer that in our food
// aisles. But we just won't report on them."
//
// The checklist already says this in data: the whole Beef group is {"unscored": true},
// every cut is 0 points, and the group carries the note "Riverbend Ranch is a separate
// subscription with no product points." A 0 point item can never help reach 35.
//
// Excluded BY GROUP, so a new cut added to the checklist needs no code change. Beef
// Tallow, Sticks and Jerky are NOT in this group. They are ordinary Food & Drinks
// products with real points and they stay in the packages.
const NEVER_IN_PACK_GROUPS = ["Beef"];

// Shannon, 2026-08-30: "yes please make one of her packs a beauty one."
//
// Marie ticked 21 makeup and skin care items and not one reached her page. Nothing was
// broken. The search prefers the MOST ITEMS, which Shannon asked for after the three
// expensive jars version, and beauty costs 7 to 18 points a product where a household item
// costs 2 or 3. Beauty loses every comparison, so the woman who ticks the most makeup is
// the one guaranteed to see none of it.
//
// One package is now built from this group alone, BEFORE the others so it is not competing
// for the same 35 points, and shown LAST so she still opens on the pack holding her
// detergent. Only happens if her ticks can actually fill it. Selected by GROUP so it
// follows the checklist instead of a hand-kept list of labels.
const THEME_GROUPS = ["Skin Care & Beauty"];
const LOG_TTL = 60 * 60 * 24 * 730;

// Shannon's message, as SHE rewrote it 2026-08-30 after sending it to Chad by hand:
// "This is the text that Chad received from me. I changed it a bit. This should be for
// everyone." Her copy is not mine to improve. Reproduced character for character,
// including the two spaces after "anyway." and the trailing space after "money.".
//
// TWO THINGS ARE SUBSTITUTED, AND ONLY TWO: the link, and the number of packs.
//
// She wrote "3 packs", having seen Chad's page, which has three. Most do: every real
// checklist on record ticked 24 items or more and produced three. But 1 and 2 are
// genuinely reachable, roughly a quarter of randomly generated tick-lists, typically
// someone who ticks 10 to 20 things. Sending that person "here are 3 packs" over a page
// showing two is a small lie in the first line she reads, and the page heading was
// already fixed for exactly this reason. So the numeral tracks reality. Her sentence is
// otherwise untouched, and if she wants it to always read 3, that is one line below.
const SMS_LINES = [
  "Perfect - thank you for taking the time to do that list.",
  "",
  "__PACKS__",
  "(with prices)",
  "",
  "Take a look & tell me what you think?",
  "",
  "These are items you buy anyway.  Now you are getting better quality and saving money. ",
  "",
  "Keep in mind, we have a 90 day money back guarantee and you can cancel at anytime - super easy.",
  "",
  "__URL__",
];

function smsBody(url, n) {
  // A row written before the count existed would otherwise render "here are undefined
  // packs". Fall back to her literal sentence, which is right for almost everyone.
  if (typeof n !== "number" || !isFinite(n) || n < 1) n = 3;
  n = Math.floor(n);
  const packs = n === 1
    ? "Based on your results, here is a pack that I put together for you."
    : "Based on your results, here are " + n + " packs that I put together for you.";
  return SMS_LINES.join("\n").replace("__PACKS__", packs).replace("__URL__", url);
}

// Any one of these on a contact means never text them. Lower case, compared lower case.
// "not interested" is Shannon's own kill switch and the reason this list exists at all.
const STOP_TAGS = [
  "not interested",
  "do not contact",
  "do not text",
  "dnd",
  "unsubscribe",
  "unsubscribed",
  "opted out",
  "opt out",
  "stop",
  "wrong number",
  "deceased",
];

// Harvested from the live Melaleuca store 2026-08-29, US Member price and product points.
// Generated from product-map.json; do not hand edit, re-run the build script.
const PRODUCT_MAP = /*__PRODUCT_MAP__*/null/*__END__*/;

// NO FREE-PRODUCT LOGIC LIVES HERE ANY MORE.
//
// It used to name magnesium and coffee as gifts. Shannon tested the live system on her own
// phone 2026-08-30 and found the fault herself: "It offered me coffee & magnesium both for
// FREE on all 3 packs. It's REALLY up to $20 in FREE product with each order. But coffee &
// Magnesium are not offered in Month 2 and 3."
//
// The free product was never those two items. It is $20 of the customer's choice from a
// list Melaleuca changes every month. Hardcoding this month's names would go stale on the
// 1st and start promising people something they cannot have. The page states the $20 and
// names nothing, which is the only version that stays true without maintenance.
//
// Consequence: magnesium and coffee are ordinary paid products again.
const FREE_PRODUCT_LINE = "Plus $20 in FREE product with each order";
