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
const TARGET = 35;
const LOG_TTL = 60 * 60 * 24 * 730;

// Shannon's message, 2026-08-30, verbatim. Her copy is not mine to improve; the only
// thing this code substitutes is the link on the last line.
const SMS_BODY = [
  "Perfect - thank you for taking the time to do that.",
  "",
  "Based on your results, here are 3 packs that I put together for you.",
  "",
  "Take a look & tell me what you think?",
  "",
  "These are items you buy anyway.  Now you are getting better quality and saving money. ",
  "",
  "Keep in mind, we have a 90 day money back guarantee and you can cancel at anytime - super easy.",
  "",
  "__URL__",
].join("\n");

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

// A gift is offered ONLY when that category is one she actually ticked.
const GIFTS = [
  ["Magnesium", "Mela-Out Magnesium", 11, 24.59],
  ["Coffee", "Mountain Cabin Coffee", 5, 11.49],
];
