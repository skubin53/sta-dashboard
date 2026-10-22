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
// The What's New links Shannon texts use this cleaner, on-brand host (same worker, added
// as a second Workers custom domain 2026-09-17). The tracked link is WNEW_HOST + /wnew?c=.
const WNEW_HOST = "https://whatisnew.ismyhometoxic.com";
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

// Shannon, 2026-08-30: "each pack does not need more than 1 package of wipes. I always
// prefer to recommend the Soluguard WIpes (they work the best)"
//
// Visible on Marie's page: package 1 held Tough & Tender Wipes, Clear Power Glass Wipes
// AND Sol-U-Guard Wipes. All-purpose cleaner, glass cleaner, cleaning wipes and
// disinfectant are four separate ticks that each have a wipe as their cheapest product,
// and nothing stopped them stacking because the only rule was one product per category.
//
// A package may now hold AT MOST ONE wipe, and when it holds one the search prefers hers,
// ranked ABOVE price so it wins even when it costs more. The other ticks fall back to the
// spray version, which is a better bundle anyway.
//
// Plain substring on purpose, no regex. In the Python this started life as a word
// boundary pattern and the escape arrived in the file as a literal backspace byte, so it
// matched nothing and failed silently while every check passed. No product name contains
// "wipe" inside another word.
const PREFERRED = ["Sol-U-Guard Botanical Convenience Wipes"];

function isWipe(p) { return String(p.name).toLowerCase().indexOf("wipe") >= 0; }
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
const PRODUCT_MAP = {
  "Shampoo": [["Affinia Moisture Shampoo", 4, 8.49], ["Affinia Volume Shampoo", 4, 8.49], ["Melaleuca Original Shampoo", 9, 17.49], ["Melaleuca Herbal Shampoo", 9, 17.49]],
  "Conditioner": [["Affinia Moisture Conditioner", 4, 8.49], ["Affinia Volume Conditioner", 4, 8.49], ["Sei Bella Salon Conditioner", 10, 20.0]],
  "Body wash": [["Renew Body Wash", 6, 10.99], ["Alloy 3-in-1 Hair & Body Wash", 5, 9.99]],
  "Hand soap": [["Renew Hand Wash", 4, 7.39]],
  "Body lotion": [["Affinia Nourishing Body Lotion", 4, 9.29], ["Renew Intensive Skin Therapy", 10, 16.99], ["Body Satin Hand Creme", 2, 3.59]],
  "Deodorant": [["Alloy Deodorant", 2, 5.79], ["Affinia Antiperspirant & Deodorant", 2, 5.79], ["Melaleuca Herbal Deodorant", 2, 5.79]],
  "Toothpaste": [["Exceed Essential Oil Tooth Polish", 2, 4.59], ["Classic Tooth Polish", 2, 4.59], ["Exceed Hydroxyapatite Tooth Polish", 2, 5.19]],
  "Mouthwash": [["Breath-Away Essential Oil Mouth Rinse", 4, 8.59]],
  "Hair styling products": [["Sei Bella Dry Shampoo", 10, 19.5], ["Soft Hold Styling Cream Sei Bella", 9, 17.0], ["Sei Bella Hair Oil", 11, 24.0]],
  "Laundry detergent": [["MelaPower 9x Detergent", 10, 19.49]],
  "Fabric softener": [["MelaSoft 9x Liquid Fabric Softener", 5, 12.59]],
  "Dryer sheets": [["MelaSoft Dryer Sheets", 3, 6.49]],
  "Laundry stain remover": [["PreSpot Instant Stain Remover", 1, 2.59], ["PreSpot Gel with Scrub Brush", 2, 4.19]],
  "Dish soap": [["Lemon Brite Hand Dishwashing Liquid", 2, 4.39], ["Lemon Brite Hand Dishwashing Liquid: Lavender", 2, 4.39]],
  "Dishwasher detergent": [["Diamond Brite Gel Automatic Dishwasher Detergent", 4, 8.19], ["Diamond Brite Packs Automatic Dishwasher Detergent", 4, 9.49]],
  "All-purpose cleaner": [["Tough & Tender Wipes", 2, 4.29], ["Tough & Tender 12x All-Purpose Cleaner", 3, 6.99], ["Tough & Tender 12x All-Purpose Cleaner: Lavender", 3, 6.99]],
  "Bathroom & tub cleaner": [["Tub & Tile 12x Bathroom Cleaner", 3, 6.99]],
  "Glass cleaner": [["Clear Power Glass Wipes", 2, 4.29], ["Clear Power 12x Glass Cleaner", 3, 6.99]],
  "Toilet bowl cleaner": [["Safe & Mighty Toilet Bowl Cleaner", 3, 6.19]],
  "Floor cleaner": [["Clean & Gleam 12x Floor Cleaner", 3, 6.99], ["Clean & Gleam Floor Polish", 4, 10.29]],
  "Disinfectant": [["Sol-U-Guard Botanical Convenience Wipes", 3, 6.19], ["Sol-U-Guard Botanical 2x Disinfectant", 6, 11.39]],
  "Cleaning wipes": [["Sol-U-Guard Botanical Convenience Wipes", 3, 6.19], ["Tough & Tender Wipes", 2, 4.29], ["Clear Power Glass Wipes", 2, 4.29]],
  "Antioxidants": [["CellWise Broad Spectrum Antioxidant", 10, 17.79], ["Provex-Plus Circulatory System Antioxidant", 11, 17.79]],
  "Bone Health": [["Calcium Complete", 6, 11.49], ["K2-D3 Optimal Calcium Delivery", 13, 24.99]],
  "Collagen (Types I, II & III)": [["Vitality for Life Collagen Boost With Ceramides", 16, 39.89], ["Vitality for Life Collagen Boost with Astaxanthin", 16, 39.89]],
  "Immune Support / Echinacea / Vitamin C": [["Activate Immune Complex", 6, 13.29], ["Activate-C Immune Complex Drink: Orange", 6, 12.99], ["Activate-C Immune Complex Drink: Raspberry", 6, 12.99]],
  "Magnesium": [["Mela-Out Magnesium", 11, 24.59]],
  "Multivitamin / Minerals": [["Vitality Multivitamin & Mineral", 8, 14.99], ["Vitality Pack", 10, 20.48]],
  "Vitamin D3": [["Vitality Vitamin D3", 4, 8.39]],
  "Joint Care (Glucosamine)": [["Replenex Extra Strength", 12, 22.39], ["Replenex Extra Strength Drink", 12, 22.39]],
  "Probiotics": [["Exceed Oral Probiotic Mint", 9, 19.99]],
  "Digestive Enzymes": [["FiberWise Cobbler Bar: Blueberry", 4, 10.29]],
  "Allergy medicine": [["CounterAct Allergy", 5, 12.29]],
  "Pain relief tablets": [["CounterAct Pain - Acetaminophen", 2, 4.59], ["CounterAct IB - Ibuprofen", 2, 4.59]],
  "Pain & muscle relief cream": [["Pain-A-Trate Original", 6, 10.69], ["Pain-A-Trate Ultra", 7, 12.79]],
  "First aid ointment": [["Triple Antibiotic Ointment", 3, 6.19], ["MelaGel Topical Balm - Disk", 5, 8.39], ["MelaGel Topical Gel - Tube", 5, 8.39]],
  "Cuts, burns & bite cream": [["DermaCort Anti-Itch Cream", 5, 7.49]],
  "Foundation": [["Sei Bella Flawless Liquid Foundation", 10, 27.0], ["Sei Bella Mineral Foundation", 11, 21.5]],
  "Primer": [["Sei Bella Foundation Primer", 11, 22.5]],
  "Blush": [["Sei Bella Powder Blush", 7, 15.0], ["Sei Bella Powder Blush with Compact", 8, 18.0]],
  "Eyeshadow": [["Sei Bella Snowed In Eyeshadow Palette", 8, 25.0], ["Sei Bella Eyeshadow Palette: Morning Coffee", 9, 30.0]],
  "Mascara": [["Sei Bella Dramatic Impact Mascara: Black", 8, 15.5], ["Sei Bella Defining Lash Mascara", 8, 15.5]],
  "Lipstick": [["Sei Bella Lipstick", 8, 16.5], ["SeiBella Lip Gloss", 5, 12.5]],
  "Setting spray": [["Sei Bella Finishing Spray", 9, 17.0], ["Sei Bella Makeup Setting Spray", 9, 20.0]],
  "Coffee": [["Mountain Cabin Coffee", 5, 11.49]],
  "Beef Sticks": [["Riverbend Ranch Beef Sticks", 4, 10.75]],
  "Beef Jerky": [["Riverbend Ranch Beef Jerky: Original", 3, 8.95]],
  "Bar soap": [["Alloy Luxury Glycerin Bar", 3, 4.79], ["The Platinum Bar", 3, 4.79], ["Luxury Glycerin Bath Bar", 3, 4.79]],
  "Shave gel or cream": [["Alloy Shave Gel", 2, 5.99], ["Affinia Shave Gel", 2, 5.99]],
  "Air freshener": [["Revive Plug In Oils", 3, 6.79], ["Revive Fabric Freshener & Wrinkle Relaxer Concentrate", 4, 7.89]],
  "Caffeine (Mental Clarity & Focus)": [["Vitality For Life FocusAP", 13, 25.99], ["CoQ10+ Cellular Energy Support", 15, 27.89]],
  "Omega-3s (Cardiovascular)": [["Coldwater Omega-3", 8, 17.19], ["CardiOmega EPA", 10, 19.79]],
  "Fruit & Nut / Dark Chocolate Bars": [["Simply Fit Coconut Cocoa Rounds", 4, 8.99]],
  "Granola Bars": [["Simply Fit Chewy Snack Bars", 3, 6.79]],
  "Nut & Fruit Clusters": [["Simply Fit Nut & Fruit Clusters", 4, 8.99]],
  "Protein Bars": [["Proflex Pro Protein Bars", 7, 15.89], ["Access Exercise Bars", 8, 16.99], ["Attain with CraveBlocker Bars", 5, 11.49]],
  "Protein Shakes": [["Proflex Protein Shake", 11, 26.59], ["Access Exercise Shake: Chocolate Slam", 9, 19.99], ["Proflex Pro Whey Protein Shake", 15, 35.79]],
  "Beef Tallow": [["Riverbend Ranch Beef Tallow", 6, 14.95]],
  "Seasonings": [["Homestead Blend", 4, 7.99], ["Southern Spice", 4, 7.99], ["Honey Cured Heat", 4, 7.99]],
  "Baking mixes": [["Simply Fit Simple Start Baking Mix: Pancakes", 7, 17.99], ["Simply Fit Simple Start Baking Mix: Muffins", 8, 21.99]],
  "Popcorn": [["Simply Fit Microwave Popcorn", 2, 4.49]],
  "Electrolyte hydration": [["Sustain Active Hydration", 6, 12.99]],
  "Facial cleanser": [["Sei Bella Honey and Rose Soothing Foam Cleanser", 9, 19.5], ["Sei Bella Charcoal & Flower Detoxifying Cleanser", 7, 17.0]],
  "Facial toner": [["Sei Bella Deep Marine Sea Toner", 10, 21.5]],
  "Eye treatment": [["Sei Bella Night Recovery Eye Cream", 16, 29.0]],
  "Overnight or peptide treatment": [["Sei Bella Honey & Rose Overnight Recovery Cream", 15, 32.0], ["Sei Bella Deep Marine Age Defying Overnight Cream", 18, 37.5]],
  "Concealer": [["Sei Bella Flawless Concealer", 8, 19.5]],
  "Powder": [["Sei Bella Pressed Powder with Compact", 8, 19.0]],
  "Bronzer or contour": [["Sei Bella Powder Bronzer", 9, 16.5], ["Sei Bella Contour Palette", 8, 23.5]],
  "Eyeliner": [["Sei Bella Eyeliner", 7, 14.5], ["Sei Bella Liquid Eyeliner", 6, 14.0]],
  "Eyebrow pencil": [["Sei Bella Brow Pencil", 7, 16.5], ["Sei Bella Brow Tint", 7, 16.5]],
  "Lip gloss": [["SeiBella Lip Gloss", 5, 12.5]],
  "Lip liner": [["Sei Bella Lip Liner", 8, 16.5]],
  "Single essential oils": [["PURE Eucalyptus Essential Oil", 4, 8.75], ["PURE Cedarwood Essential Oil", 5, 10.0], ["PURE Clove Essential Oil", 5, 10.5]],
  "Essential oil blends": [["PURE Armor Protective Essential Oil Blend", 10, 20.5], ["PURE Blue Heat Soothing Essential Oil Blend", 10, 20.5]],
  "Linen or room spray": [["I'm a Dreamer Nighttime Linen Spray", 4, 10.75], ["Hit Refresh Odor Spray", 4, 10.75]],
  "Bath bombs & shower melts": [["Let's Get Steamy Shower Melts", 9, 22.25]],
  "Laundry scent booster": [["MelaBoost Laundry Fragrance Booster", 5, 11.99]],
  "Bleach alternative": [["MelaBrite 9x Color Booster", 8, 15.99]],
  "Antacid": [["Calmicid Antacid Supplement", 3, 6.19]],
  "Acid reducer": [["Calmicid AC Acid Reducer", 6, 14.59]],
  "Natural Insect Repellent": [["Natural Insect Repellent", 4, 6.79]],
  "Women's Menopausal Support": [["EstrAval Menopause Support", 14, 23.49]],
  "Furniture polish": [["Rustic Touch Furniture Polish (sprayer not included)", 3, 6.99]],
  "Men's Antiperspirant / Deodorant": [["Alloy Antiperspirant & Deodorant", 2, 5.79]],
  "Men's 3-in-1 Hair & Body Wash": [["Alloy 3-in-1 Hair & Body Wash", 5, 9.99]],
  "Men's Shave Gel": [["Alloy Shave Gel", 2, 5.99]],
  "Mints (Sugar-Free)": [["Exceed Mints", 1, 2.69]],
  "Crave Blocking Bars": [["Attain with CraveBlocker Bars", 5, 11.49]],
  "Post-Workout Drink (Creatine)": [["Vitality Elevate Pure Creatine", 5, 10.99]],
  "Pre-Workout Drink": [["Vitality Elevate Pre-Workout: Limeade", 9, 19.99]],
  "Makeup remover": [["Sei Bella Honey & Rose Balm to Oil Makeup Eraser", 9, 20.0], ["Sei Bella Makeup Removing Cleansing Wipes", 5, 10.0]],
  "Facial moisturizer": [["Sei Bella Charcoal & Flower Daily Mattifying Lotion", 12, 28.0], ["Sei Bella Honey & Rose Daily Soothing Lotion", 15, 32.0], ["Sei Bella Deep Marine Ageless Daily Lotion", 18, 37.0]],
  "Wax melts or warmers": [["Revive Plug in Oil Warmer", 3, 7.29]],
  "Vegan Crackers": [["Simply Fit Veggie Protein Crisps", 4, 11.19]],
  "Vegan Veggie Protein Crisps": [["Simply Fit Veggie Protein Crisps", 4, 11.19]],
  "Healthy Snacks": [["R3 Lifestyle Snack Pack", 22, 60.76]],
  "Fat Burner": [["NutraTherm Stimulant-Free Fat Burner", 16, 31.29]],
  "Perfume": [["Sei Bella White Floral & Vanilla", 26, 56.0], ["Sei Bella Pink Iris & Sandalwood", 26, 56.0], ["Sei Bella Jasmine & Cedarwood", 26, 56.0]],
};

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


/* ------------------------------------------------------------------ the packs
 * A port of sta-tools/packs/build-packs.py. It must produce byte-identical
 * packages to the Python, because the Python is what Shannon has been reviewing.
 *
 * THE ONE THING A CARELESS PORT GETS WRONG
 * The Python walks `best`, a dict keyed by an integer number of points, and Python
 * dicts iterate in INSERTION order. A JavaScript object does not: integer-like keys
 * come back in ascending numeric order no matter what order you put them in. When two
 * different baskets tie on (items, freshLabels, cost) the first one seen wins, so
 * iteration order silently decides the winner. Using a Map keeps insertion order and
 * keeps the two implementations honest. Do not "simplify" these Maps into objects.
 *
 * Maps also mean a label like "__proto__" coming off a public form is just a string.
 */

// Deduplicated on (label, product). A repeated tick adds nothing: the search already
// refuses to use one product twice, so a duplicate only makes the inner loop redo the
// same work. `items` comes off a public form, and 2,850 junk items cost 2.4 seconds of
// Worker CPU. This bounds the pool at ~230 entries however much is posted, and cannot
// change the result, because an identical candidate never beats the incumbent under a
// strict comparison.
function candidates(items) {
  const out = [];
  const seen = new Set();
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    let lab;
    if (it && typeof it === "object") {
      // deliberately out of scope, not a gap. See NEVER_IN_PACK_GROUPS.
      if (NEVER_IN_PACK_GROUPS.indexOf(it.group) >= 0) continue;
      lab = it.label;
    } else lab = it;
    if (typeof lab !== "string") continue;
    const prods = Object.prototype.hasOwnProperty.call(PRODUCT_MAP, lab)
      ? PRODUCT_MAP[lab] : null;
    if (!Array.isArray(prods)) continue;
    for (const p of prods) {
      const key = lab + "\u0000" + p[0];
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: lab, name: p[0], pts: p[1], usd: p[2] });
    }
  }
  return out;
}

// Python's tuple comparison on (count, fresh, preferred, negCost), element by element.
// "preferred" sits ABOVE cost so her Sol-U-Guard wipes win even when they cost more.
function better(a, b) {
  if (a.cnt !== b.cnt) return a.cnt > b.cnt;
  if (a.fresh !== b.fresh) return a.fresh > b.fresh;
  if (a.pref !== b.pref) return a.pref > b.pref;
  return a.negcost > b.negcost;
}

function pickPackage(pool, usedNames, usedLabels, force) {
  const byLabel = new Map();
  for (const p of pool) {
    if (usedNames.has(p.name) || usedLabels.has(p.label)) continue;
    if (!byLabel.has(p.label)) byLabel.set(p.label, []);
    byLabel.get(p.label).push(p);
  }
  // A forced product is placed first and its category taken off the table, so the rest
  // of the package is built around it instead of competing with it.
  let startPts = 0;
  let start = { cnt: 0, fresh: 0, pref: 0, negcost: 0.0, picks: [] };
  if (force) {
    if (usedNames.has(force.name) || usedLabels.has(force.label)) return null;
    byLabel.delete(force.label);
    start = { cnt: 1, fresh: 1, pref: PREFERRED.indexOf(force.name) >= 0 ? 1 : 0,
              negcost: -force.usd, picks: [force] };
    startPts = force.pts;
  }
  if (startPts > TARGET_MAX) return null;

  // Python: labels = sorted(by_label). Codepoint order, stated explicitly.
  const labels = Array.from(byLabel.keys()).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

  let best = new Map();
  best.set(startPts, start);

  for (const lab of labels) {
    const nxt = new Map(best);
    for (const [pts, st] of best) {
      for (const prod of byLabel.get(lab)) {
        const np = pts + prod.pts;
        if (np > TARGET_MAX) continue;
        // One product can serve two categories: Tough & Tender Wipes is both the
        // all-purpose cleaner and the cleaning wipes. Without this, ticking both puts
        // the same jar in one package twice on two different lines. usedLabels only
        // stops repeats BETWEEN packages; this stops them inside one.
        let dup = false;
        for (const p of st.picks) { if (p.name === prod.name) { dup = true; break; } }
        if (dup) continue;
        // at most one wipe per package
        if (isWipe(prod)) {
          let hasWipe = false;
          for (const p of st.picks) { if (isWipe(p)) { hasWipe = true; break; } }
          if (hasWipe) continue;
        }
        const cand = {
          cnt: st.cnt + 1,
          fresh: st.fresh + 1,
          pref: st.pref + (PREFERRED.indexOf(prod.name) >= 0 ? 1 : 0),
          negcost: st.negcost - prod.usd,
          picks: st.picks.concat([prod]),
        };
        const cur = nxt.get(np);
        if (cur === undefined || better(cand, cur)) nxt.set(np, cand);
      }
    }
    best = nxt;
  }
  // Any total in 35..37 qualifies, so take the best of the three rather than insisting
  // on 35. Same preference: most items, then most fresh categories, then cheapest.
  let win = null;
  for (let p = TARGET_MIN; p <= TARGET_MAX; p++) {
    const h = best.get(p);
    if (h && (win === null || better(h, win))) win = h;
  }
  return win ? win.picks : null;
}

function buildPacks(items, n) {
  n = n || 3;
  const pool = candidates(items);

  const packs = [];
  const usedNames = new Set();
  const usedLabels = new Set();

  // Built FIRST so it is not competing with cheap household items, shown LAST so she
  // still opens on the pack with her detergent in it. See THEME_GROUPS.
  let themed = null;
  for (const gname of THEME_GROUPS) {
    const labels = new Set();
    if (Array.isArray(items)) {
      for (const it of items) {
        if (it && typeof it === "object" && it.group === gname &&
            typeof it.label === "string") labels.add(it.label);
      }
    }
    if (!labels.size) continue;
    const sub = pool.filter((p) => labels.has(p.label));
    if (!sub.length) continue;
    const got = pickPackage(sub, usedNames, usedLabels);
    if (got && got.length) {
      themed = got;
      for (const p of got) { usedNames.add(p.name); usedLabels.add(p.label); }
      n -= 1;
      break;
    }
  }
  for (let i = 0; i < n; i++) {
    let pk = null;
    if (i === 0) {
      // Package 1 is built AROUND the priority products when she ticked them, instead of
      // leaving it to the arithmetic. Laundry detergent is 10 points and kept losing to
      // cheaper combinations, which is how Chad ended up with no detergent in a list
      // where he had asked for it.
      for (const lab of PRIORITY_FIRST) {
        const options = pool.filter((p) => p.label === lab);
        let win = null, winKey = null;
        for (const o of options) {
          const g = pickPackage(pool, usedNames, usedLabels, o);
          if (!g || !g.length) continue;
          let cost = 0;
          for (const x of g) cost += x.usd;
          // Python max(key=(len, -cost)) keeps the FIRST maximal item, so only a
          // strictly better candidate is allowed to replace the incumbent.
          const key = [g.length, -cost];
          if (winKey === null || key[0] > winKey[0] ||
              (key[0] === winKey[0] && key[1] > winKey[1])) {
            win = g; winKey = key;
          }
        }
        if (win) { pk = win; break; }
      }
    }
    if (pk === null) pk = pickPackage(pool, usedNames, usedLabels);
    if (!pk || !pk.length) break;
    packs.push(pk);
    for (const p of pk) { usedNames.add(p.name); usedLabels.add(p.label); }
  }
  if (themed) packs.push(themed);
  return { packs };
}


/* ------------------------------------------------------------------- the page
 * Same design Shannon approved on the hand-built /cheryl page, generated.
 * Everything that could come from outside is escaped: the only field a stranger
 * could influence is the first name, and it is printed in the heading.
 */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];

function prettyDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

// Which shelf of the house a category lives on. Used only to write the one line under
// each package heading, so a pack reads like a place in her home and not a list.
const BUCKETS = [
  ["your bathroom shelf", ["Shampoo", "Conditioner", "Body wash", "Hand soap",
    "Body lotion", "Deodorant", "Toothpaste", "Mouthwash", "Hair styling products"]],
  ["the things you clean with", ["Laundry detergent", "Fabric softener", "Dryer sheets",
    "Laundry stain remover", "Dish soap", "Dishwasher detergent", "All-purpose cleaner",
    "Bathroom & tub cleaner", "Glass cleaner", "Toilet bowl cleaner", "Floor cleaner",
    "Disinfectant", "Cleaning wipes"]],
  ["the supplements you take", ["Antioxidants", "Bone Health",
    "Collagen (Types I, II & III)", "Immune Support / Echinacea / Vitamin C", "Magnesium",
    "Multivitamin / Minerals", "Vitamin D3", "Joint Care (Glucosamine)", "Probiotics",
    "Digestive Enzymes"]],
  ["your medicine cabinet", ["Allergy medicine", "Pain relief tablets",
    "Pain & muscle relief cream", "First aid ointment", "Cuts, burns & bite cream"]],
  ["your makeup bag", ["Foundation", "Primer", "Blush", "Eyeshadow", "Mascara",
    "Lipstick", "Setting spray"]],
  ["the pantry", ["Coffee", "Beef Sticks", "Beef Jerky"]],
];

function blurb(pack) {
  const counts = new Map();
  for (const p of pack) {
    for (const pair of BUCKETS) {
      if (pair[1].indexOf(p.label) >= 0) {
        counts.set(pair[0], (counts.get(pair[0]) || 0) + 1);
        break;
      }
    }
  }
  const ranked = Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1]; });
  const top = ranked.slice(0, 3).map(function (e) { return e[0]; });
  if (!top.length) return "";
  let s;
  if (top.length === 1) s = top[0];
  else if (top.length === 2) s = top[0] + " and " + top[1];
  else s = top[0] + ", " + top[1] + ", and " + top[2];
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

/**
 * Names come out of GHL however they were typed. Chad's is stored "chad murphy", so the
 * page would have opened "chad, here are...", which looks like nobody checked.
 *
 * Only fix a name that is ENTIRELY lower case. A name with any capital in it was typed
 * deliberately, and blanket title casing would turn McKenzie into Mckenzie and O'Brien
 * into O'brien. Better to leave a correct name alone than to "correct" it into a
 * misspelling of somebody's own name.
 */
function properName(s) {
  const n = String(s || "").trim();
  if (!n || n !== n.toLowerCase()) return n;
  return n.replace(/(^|[\s'-])([a-z])/g, function (m, sep, ch) {
    return sep + ch.toUpperCase();
  });
}

/**
 * Count the packs in the heading instead of assuming three.
 *
 * Caught on the first live dry run: Natalie's page said "3 different packs" over two
 * packs, because the heading was a fixed string. It only ever says three when there are
 * three. A woman who counts two under a heading that promises three has been told a small
 * lie by the first sentence she reads.
 */
function headline(first, n) {
  const body = n === 1
    ? "here is a pack put together from your choices"
    : "here are " + n + " different packs based on your choices";
  return first ? first + ", " + body : body.charAt(0).toUpperCase() + body.slice(1);
}

function renderPage(rec, packs) {
  const first = properName(rec.first_name);
  const secs = [];
  for (let i = 0; i < packs.length; i++) {
    const pk = packs[i];
    let rows = "";
    for (const p of pk) {
      rows += '<tr><td class="n">' + esc(p.name) + "<small>" + esc(p.label) +
              '</small></td><td class="p">' + p.pts + '</td><td class="c">' +
              money(p.usd) + "</td></tr>";
    }
    let pts = 0, usd = 0;
    for (const p of pk) { pts += p.pts; usd += p.usd; }
    const b = blurb(pk);
    secs.push(
      '<section class="pkg"><h2>Package ' + (i + 1) +
      ' <span class="cnt">' + pk.length + " products</span></h2>" +
      (b ? '<p class="blurb">' + esc(b) + "</p>" : "") +
      '<div class="scroll"><table>' +
      '<tr><th>Product</th><th class="p">Points</th><th class="c">Price</th></tr>' +
      rows +
      '<tr class="tot"><td>Total</td><td class="p">' + pts +
      '</td><td class="c">' + money(usd) + "</td></tr>" +
      "</table></div></section>");
  }

  const sub = rec.count
    ? "Score " + rec.score + " &middot; " + rec.count +
      " products you already buy elsewhere"
    : "";

  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex, nofollow">\n' +
    "<title>" + (packs.length === 1 ? "Your Pack" : "Your " + packs.length + " Packs") +
    "</title>\n<style>\n" + PAGE_CSS + "\n</style>\n</head>\n<body>\n" +
    '<header><div class="wrap">\n <h1>' + esc(headline(first, packs.length)) +
    "</h1>\n <p>Built from your Switch Checklist, " + esc(prettyDate(rec.at)) + "</p>\n" +
    (sub ? ' <div class="meta">' + sub + "</div>\n" : "") +
    "</div></header>\n" +
    '<div class="wrap">\n' + secs.join("\n") + "\n" +
    // Shannon, 2026-08-30: "So just add at the bottom / $20 in FREE product".
    // One line under all three packs, naming no products, because the list of what is
    // free changes every month.
    '<p class="freebar">' + esc(FREE_PRODUCT_LINE) + "</p>\n" +
    // Shannon, 2026-08-30. "Take this out - Same shelf, better quality, and the price you
    // see is what you pay." and "Keep - These are things you usually buy.  At Melaleuca
    // you will get a 90 day money back guarantee, and you can cancel any time."
    // Her wording, and she names the supplier here on purpose.
    '<p class="foot">These are things you usually buy.  At Melaleuca you will get a ' +
    "90 day money back guarantee, and you can cancel any time.</p>\n" +
    "</div>\n</body>\n</html>\n";
}

const PAGE_CSS = [
  ":root{--navy:#0B2545;--red:#C8102E;--cream:#FBF7F0;--line:#E3E0D8;--ink:#1B2A41;--muted:#5A6B80;--bg:#fff;--green:#1D7A4C}",
  "@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0E1620;--cream:#152030;--line:#25344A;--ink:#E6ECF3;--muted:#9DB0C6;--navy:#E6ECF3;--red:#FF8A80;--green:#5FD39B}}",
  ":root[data-theme=dark]{--bg:#0E1620;--cream:#152030;--line:#25344A;--ink:#E6ECF3;--muted:#9DB0C6;--navy:#E6ECF3;--red:#FF8A80;--green:#5FD39B}",
  "*{box-sizing:border-box}",
  'body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.55}',
  ".wrap{max-width:820px;margin:0 auto;padding:0 20px 60px}",
  "header{background:#0B2545;color:#fff;padding:30px 0 26px;margin-bottom:6px}",
  "header h1{margin:0 0 6px;font-size:1.5em;color:#fff;line-height:1.25}",
  "header p{margin:0;color:#BFD2E6;font-size:.95em}",
  ".meta{margin-top:13px;font-size:.87em;color:#BFD2E6}",
  ".pkg{margin:32px 0 0}",
  "h2{color:var(--navy);font-size:1.25em;margin:0 0 2px;border-bottom:2px solid var(--line);padding-bottom:7px}",
  ".cnt{font-weight:400;color:var(--muted);font-size:.72em;margin-left:7px}",
  ".blurb{color:var(--muted);font-size:.93em;margin:8px 0 12px}",
  ".scroll{overflow-x:auto}",
  "table{width:100%;border-collapse:collapse;font-size:.95em}",
  "th{text-align:left;background:var(--cream);color:var(--navy);padding:8px 10px;font-size:.78em;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid var(--line)}",
  "td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}",
  "td.n{font-weight:600;color:var(--navy)}",
  "td.n small{display:block;font-weight:400;color:var(--muted);font-size:.84em;margin-top:1px}",
  "th.p,td.p{text-align:right;width:76px;font-variant-numeric:tabular-nums}",
  "th.c,td.c{text-align:right;width:96px;font-variant-numeric:tabular-nums;color:var(--red);font-weight:600}",
  "tr.free td.c{color:var(--green);font-weight:800;letter-spacing:.04em}",
  "tr.free td.n{color:var(--green)}",
  "tr.tot td{border-top:2px solid var(--navy);border-bottom:none;font-weight:800;font-size:1.06em;padding-top:11px;color:var(--navy)}",
  "tr.tot td.c{color:var(--red);font-size:1.2em}",
  ".freebar{margin:30px 0 0;padding:14px 16px;border:2px solid var(--green);border-radius:8px;color:var(--green);font-weight:800;font-size:1.05em;text-align:center;letter-spacing:.01em}",
  ".foot{margin:22px 0 0;color:var(--muted);font-size:.93em;border-top:1px solid var(--line);padding-top:16px}",
  "@media(max-width:520px){body{font-size:15px}td,th{padding:7px 6px}th.c,td.c{width:82px}}",
].join("\n");


/* --------------------------------------------------------------- talking to GHL
 *
 * THE TRAP THAT NEARLY SHIPPED, written down so nobody re-introduces it.
 *
 * The obvious way to look a contact up is GET /contacts/{id}. That endpoint DOES NOT
 * RETURN dnd OR dndSettings. Not false, not empty: the keys are absent. So the natural
 * guard, `if (contact.dnd === true) return "blocked"`, is dead code that always passes.
 * On 2026-08-30 this location had 2,982 contacts with dnd=true, many of them carrying
 * SMS status "permanent", which is what GHL writes when a person texts the word STOP.
 * A guard written against GET would have texted every one of them.
 *
 * POST /contacts/search with an id filter returns the same contact WITH dnd, dndSettings,
 * tags and phone. That is why the lookup below is a search and not a get. Do not
 * "simplify" it back.
 */

async function ghl(env, method, path, body, version) {
  const headers = {
    Authorization: "Bearer " + env.GHL_TOKEN,
    Version: version || "2021-07-28",
    Accept: "application/json",
  };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(GHL + path, init);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (e) { data = { _raw: text.slice(0, 400) }; }
  return { status: res.status, ok: res.ok, data };
}

/** The only contact lookup allowed in the send path. Returns null if it cannot be read. */
async function lookupContact(env, contactId) {
  // No location binding means no lookup, which means no stop check, which means no send.
  // This used to fall back to a bare LOCATION_ID that was never declared anywhere: it
  // only ever worked because the binding happened to be set, and would have thrown a
  // ReferenceError the day somebody deployed without it.
  const loc = String(env.GHL_LOCATION || "").trim();
  if (!loc) return null;
  const r = await ghl(env, "POST", "/contacts/search", {
    locationId: loc,
    page: 1,
    pageLimit: 1,
    filters: [{ field: "id", operator: "eq", value: contactId }],
  });
  if (!r.ok || !r.data || !Array.isArray(r.data.contacts)) return null;
  const c = r.data.contacts[0];
  if (!c || c.id !== contactId) return null;   // never accept a near miss
  return c;
}

/**
 * Every reason this person must not be texted. Empty array means it is safe to send.
 * Anything that cannot be checked counts as a reason, never as an all clear.
 */
function mustNotText(contact) {
  const why = [];
  if (!contact || typeof contact !== "object") return ["contact could not be read from GHL"];

  // Master switch. 2,982 contacts had this set on 2026-08-30.
  if (contact.dnd === true) why.push("DND is on for this contact");

  // Per channel. "permanent" is what GHL writes when someone texts STOP. "active" is a
  // DND somebody switched on. Only "inactive" and a missing channel are safe.
  const ds = contact.dndSettings;
  if (ds && typeof ds === "object") {
    for (const ch of ["SMS", "RCS", "All"]) {
      const s = ds[ch];
      if (!s || typeof s !== "object") continue;
      const st = String(s.status || "").toLowerCase();
      if (st && st !== "inactive") {
        why.push("DND on " + ch + " (" + st +
                 (String(s.message || "").indexOf("STOP") >= 0 ? ", they texted STOP" : "") + ")");
      }
    }
  }

  // Shannon's own kill switch. 9,362 contacts carried "not interested" on 2026-08-30.
  const tags = Array.isArray(contact.tags) ? contact.tags : [];
  const lower = tags.map(function (t) { return String(t).toLowerCase().trim(); });
  for (const t of STOP_TAGS) {
    if (lower.indexOf(t) >= 0) why.push('tagged "' + t + '"');
  }

  if (!contact.phone || !String(contact.phone).trim()) why.push("no phone number on file");

  return why;
}

/* ------------------------------------------------------------------ the queue */

function slugify(name) {
  const s = String(name || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return s.slice(0, 24);
}

/** Give this contact a name-shaped URL, never stealing one another contact already has. */
async function allocateSlug(env, contactId, firstName) {
  const base = slugify(firstName) || "friend";
  for (let i = 1; i <= 60; i++) {
    const slug = i === 1 ? base : base + i;
    const owner = await env.REPORTS.get("packslug:" + slug);
    if (owner === null) {
      await env.REPORTS.put("packslug:" + slug, contactId);
      return slug;
    }
    if (owner === contactId) return slug;    // already ours, reuse it
  }
  return base + "-" + contactId.slice(0, 6).toLowerCase();
}

// Key of the one-text-per-person lock. See the send step in stepRow.
const SEND_LOCK = "packlock:";

async function readRow(env, contactId) {
  return await env.REPORTS.get("packsend:" + contactId, "json");
}

async function writeRow(env, row) {
  // The state rides on the key's metadata too, so processQueue can skip finished rows
  // from the list() alone instead of spending a KV read on each one every 5 minutes.
  await env.REPORTS.put("packsend:" + row.contact_id, JSON.stringify(row),
                        { expirationTtl: LOG_TTL, metadata: { state: row.state } });
}

/**
 * Called from the public POST. Writes a row and nothing else. Never sends.
 * Keyed on the contact id, so replaying the POST a thousand times makes one row.
 *
 * Returns what it did, so the score page can tell the truth (2026-10-20, tour mode: the
 * page used to say "watch your phone" even when no text could ever come):
 *   "queued"       a text will go out (new row, or a newer list replaced an unsent one)
 *   "pending"      a text is already on its way from an earlier list (built, not sent)
 *   "sent-before"  this contact already got her packs text; one text per person, ever
 *   "no-packs"     nothing she ticked can fill a 35 to 37 point package, so no row
 *   "empty" / "no-kv"
 *
 * THE REPLAY LOCK STILL HOLDS FOR ANYTHING THAT CAN TEXT. A row that is "ready",
 * "sending" or "sent" is never touched, so at most one text per contact. Only two kinds
 * of row may be replaced, and neither has sent anything:
 *   - "queued": not built yet. She went back from her score, added what she forgot and
 *     submitted again within the few minutes before the cron built it. The longer list
 *     should win; before this, it was silently ignored.
 *   - "blocked" BEFORE the send step (no packs, DND, a stop tag, dry run...). A new list
 *     goes back through every one of the same guards, so a contact who said "not
 *     interested" is blocked again before anything is built. A row blocked AT the send
 *     step (send_started set) is locked like a sent one.
 */
async function queuePackSend(env, sub) {
  if (!env || !env.REPORTS) return "no-kv";
  if (!sub.contact_id || !Array.isArray(sub.items) || !sub.items.length) return "empty";
  // The send lock lives in its own key that only the cron's send step writes (below, in
  // stepRow). A stale KV read of the row can never undo it.
  if (await env.REPORTS.get(SEND_LOCK + sub.contact_id)) return "sent-before";
  const existing = await readRow(env, sub.contact_id);
  let history = [];
  let items = sub.items.slice(0, 300);
  if (existing) {
    // send_started means the send step was reached. A row GHL "refused" may still have
    // gone out, so it is treated exactly like sent: fail closed, never a second text.
    // would_have_sent is a dry-run row from August, which may have been texted by hand.
    if (existing.state === "sent" || existing.send_started || existing.would_have_sent) {
      return "sent-before";
    }
    if (existing.state !== "queued" && existing.state !== "blocked") return "pending";
    if (existing.state === "queued" && Array.isArray(existing.items)) {
      // Same visit, she went back and added what she forgot. A resubmission can only ADD:
      // a shorter second list (a phone that reloaded the checklist empty) never wipes the
      // full one.
      const seen = new Set();
      const merged = [];
      for (const it of existing.items.concat(items)) {
        const k = it && typeof it === "object" ? String(it.group) + "|" + String(it.label) : String(it);
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(it);
      }
      items = merged.slice(0, 300);
    }
  }
  // Same builder the cron uses. A list that cannot fill one package would only be
  // blocked by the cron later; say so now and write NO row, so the slot stays free for
  // the fuller list she may still submit.
  if (!buildPacks(items).packs.length) {
    return existing && existing.state === "queued" ? "pending" : "no-packs";
  }
  if (existing) {
    history = (existing.history || []).slice(-12);
    history.push({ at: sub.at, what: "replaced (" + existing.state + ") by a newer list" });
  }
  history.push({ at: sub.at, what: "queued from checklist submission" });
  await writeRow(env, {
    contact_id: sub.contact_id,
    at: sub.at,
    score: sub.score,
    count: sub.count,
    items,
    state: "queued",
    attempts: 0,
    history,
  });
  return "queued";
}

function note(row, what) {
  row.history = (row.history || []).slice(-24);
  row.history.push({ at: new Date().toISOString(), what });
}

async function block(env, row, reasons) {
  row.state = "blocked";
  row.blocked_because = reasons;
  note(row, "BLOCKED: " + reasons.join("; "));
  await writeRow(env, row);
}

/** One row, one step. Returns a short string describing what happened. */
async function stepRow(env, row) {
  const mode = String(env.SEND_MODE || "off").toLowerCase();

  if (row.state === "sent" || row.state === "blocked" || row.state === "sending") {
    return "skip:" + row.state;
  }
  row.attempts = (row.attempts || 0) + 1;
  if (row.attempts > 24) {
    await block(env, row, ["gave up after " + (row.attempts - 1) + " attempts"]);
    return "gave-up";
  }

  // ---- build the page ----
  if (row.state === "queued") {
    const contact = await lookupContact(env, row.contact_id);
    if (!contact) {
      note(row, "could not read contact, will retry");
      await writeRow(env, row);
      return "retry:unreadable";
    }
    const why = mustNotText(contact);
    if (why.length) { await block(env, row, why); return "blocked"; }

    const built = buildPacks(row.items);
    if (!built.packs.length) {
      await block(env, row, ["nothing she ticked can make a package in the 35 to 37 point range"]);
      return "blocked:no-packs";
    }
    for (const pk of built.packs) {
      let t = 0;
      for (const p of pk) t += p.pts;
      // 35 to 37, not exactly 35. This check is the last thing standing between a wrong
      // package and a customer, so it moved the same day the target became a range; left
      // at "=== 35" it would have blocked every send instead of catching a bad one.
      if (t < TARGET_MIN || t > TARGET_MAX) {
        await block(env, row, ["built a package worth " + t + " points, outside " +
                               TARGET_MIN + " to " + TARGET_MAX]);
        return "blocked:bad-total";
      }
      const names = new Set(pk.map(function (x) { return x.name; }));
      if (names.size !== pk.length) {
        await block(env, row, ["built a package with the same product twice"]);
        return "blocked:duplicate-product";
      }
    }

    row.first_name = contact.firstName || "";
    const slug = await allocateSlug(env, row.contact_id, row.first_name);
    const html = renderPage(row, built.packs);
    await env.REPORTS.put("packpage:" + slug, JSON.stringify({
      html, contact_id: row.contact_id, at: new Date().toISOString(),
    }), { expirationTtl: LOG_TTL });

    row.slug = slug;
    row.url = PACK_HOST + "/" + slug;
    row.packs = built.packs.length;
    row.state = "ready";
    note(row, "page built at " + row.url + " (" + built.packs.length + " packs)");
    await writeRow(env, row);
    return "built";
  }

  // ---- send ----
  if (row.state === "ready") {
    // The link must work before the text goes out. A text whose link is dead is worse
    // than no text at all.
    //
    // WHY THIS IS A KV READ AND NOT AN HTTP FETCH, learned the hard way 2026-08-30.
    // The obvious gate was `fetch(row.url)` and require 200. On the first dry run that
    // gate refused both pages, logging "page not answering 200 yet", while curl from
    // outside fetched the very same URLs at 200. A Worker asking for its own custom
    // domain is a subrequest that loops back at the edge, so the check reported dead
    // pages that were perfectly alive. Left in place it is worse than no gate: it never
    // passes, so nobody is ever texted, and the reason is buried in KV.
    //
    // So the gate reads back the exact bytes the page is served from. That is the thing
    // that can actually be missing. The routing in front of it is static, proven from
    // outside, and identical for every page, so it is not what a per-woman gate should
    // be testing.
    const stored = await env.REPORTS.get("packpage:" + row.slug, "json");
    const html = stored && stored.html;
    const good = !!html && html.length > 500 &&
                 html.indexOf("Package 1") >= 0 &&
                 stored.contact_id === row.contact_id;
    if (!good) {
      note(row, "her page is not in KV yet (or belongs to someone else), will retry");
      await writeRow(env, row);
      return "retry:page-missing";
    }

    // Check again, right now. She may have replied "no thanks" since the page was built.
    const contact = await lookupContact(env, row.contact_id);
    if (!contact) {
      note(row, "could not re-read contact before sending, will retry");
      await writeRow(env, row);
      return "retry:unreadable";
    }
    const why = mustNotText(contact);
    if (why.length) { await block(env, row, why); return "blocked-late"; }

    const message = smsBody(row.url, row.packs);

    if (mode !== "live") {
      row.state = "blocked";
      row.blocked_because = ["SEND_MODE is " + mode + ", nothing was sent"];
      row.would_have_sent = message;
      note(row, "DRY RUN, would have texted " + (contact.phone || "?"));
      await writeRow(env, row);
      return "dryrun";
    }

    // The one-text-per-person lock, in a key the public POST never writes (2026-10-20).
    // The POST may replace a queued row, and a KV read can be up to a minute stale, so a
    // row alone could in theory be overwritten back to "queued" after a send. This key
    // cannot be: once it exists, nobody is texted packs again.
    if (await env.REPORTS.get(SEND_LOCK + row.contact_id)) {
      await block(env, row, ["already texted once (send lock)"]);
      return "blocked:send-lock";
    }
    await env.REPORTS.put(SEND_LOCK + row.contact_id, new Date().toISOString(),
                          { expirationTtl: LOG_TTL });

    // Write the lock BEFORE the send. If the worker dies mid-call the row reads
    // "sending", which is never retried, because a missed text beats a second one.
    row.state = "sending";
    row.send_started = new Date().toISOString();
    note(row, "sending now");
    await writeRow(env, row);

    const r = await ghl(env, "POST", "/conversations/messages",
                        { type: "SMS", contactId: row.contact_id, message },
                        "2021-04-15");
    if (!r.ok) {
      row.state = "blocked";
      row.blocked_because = ["GHL refused the text, HTTP " + r.status];
      row.send_error = JSON.stringify(r.data).slice(0, 300);
      note(row, "send FAILED " + r.status);
      await writeRow(env, row);
      return "send-failed";
    }
    row.state = "sent";
    row.sent_at = new Date().toISOString();
    row.message_id = (r.data && (r.data.messageId || r.data.msgId)) || null;
    note(row, "TEXT SENT to " + (contact.phone || "?"));
    await writeRow(env, row);

    // Leave a trace on the contact so Shannon sees it in the record, not just in KV.
    await ghl(env, "POST", "/contacts/" + row.contact_id + "/notes", {
      body: "THREE PACKS TEXT SENT " + row.sent_at.slice(0, 10) + "\n" +
            "Her packs page: " + row.url + "\n" +
            "Sent automatically after she completed the Switch Checklist.",
    });
    return "sent";
  }

  return "skip:" + row.state;
}

async function processQueue(env) {
  if (!env || !env.REPORTS) return { error: "no KV" };
  const out = [];
  // Every page of keys, not just the first. Finished rows stay under this prefix for two
  // years and keys come back sorted by contact id, so a single list() of 200 would one
  // day stop reaching new women whose ids sort late, with no error anywhere (found
  // 2026-10-20 at 17 rows, before it bit). Ten pages is 10,000 rows of headroom.
  let cursor;
  for (let page = 0; page < 10; page++) {
    const list = await env.REPORTS.list({ prefix: "packsend:", limit: 1000, cursor });
    for (const k of list.keys) {
      // Rows written since 2026-10-20 carry their state as metadata. Older rows have
      // none and are read as before.
      const ms = k.metadata && k.metadata.state;
      if (ms === "sent" || ms === "blocked" || ms === "sending") continue;
      const row = await env.REPORTS.get(k.name, "json");
      if (!row) continue;
      if (row.state === "sent" || row.state === "blocked" || row.state === "sending") continue;
      try {
        out.push(row.contact_id + "=" + (await stepRow(env, row)));
      } catch (e) {
        out.push(row.contact_id + "=threw:" + String((e && e.message) || e).slice(0, 80));
      }
    }
    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
  }
  return { handled: out.length, results: out };
}

/* ------------------------------------------------- the What's New click tracker
 *
 * Shannon texts a per-person What's New link from her own phone and wants to know the
 * moment someone opens it, so she can follow up within minutes. One open records here:
 *   - the contact is TAGGED "clicked what's new", so it shows on their record and she can
 *     pull a list of everyone who has looked.
 *   - a text goes to HER cell naming who it was and their number, so she taps and replies
 *     from her own phone.
 *
 * This is a smaller promise than the packs send and it protects a different person. The
 * text goes to Shannon, never to a lead, so the DND and stop-tag guards that shield a
 * customer do not apply: a woman who tagged herself "not interested" and then opens What's
 * New is the most worth knowing about, not the least. What still holds:
 *   - WNEW_MODE gates it. "live" tags and texts, "dryrun" writes the record and sends
 *     nothing, "off" does nothing at all. Deployed "dryrun" first, exactly like SEND_MODE.
 *   - ONE text per person per window. Someone who opens the page, hits back and opens it
 *     again is one follow-up, not two buzzes on Shannon's phone. The tag is still set every
 *     time, which is free because adding a tag a contact already has changes nothing.
 *   - fired only from /wnew's JavaScript, so an iMessage link preview never reaches it.
 *
 * THIS ENDPOINT IS PUBLIC AND UNAUTHENTICATED, exactly like the checklist POST, so it is
 * hardened the same way: a stranger poking it must never be able to hammer GHL, buzz
 * Shannon, or write to a real record.
 *   - A GLOBAL hourly ceiling caps everything below, so a flood of made-up ids cannot turn
 *     into a flood of GHL calls or texts. It fails CLOSED: if the counter cannot be read,
 *     nothing runs. Real traffic is a tiny fraction of the cap.
 *   - The contact must RESOLVE in GHL (an id-filtered search that returns that exact id).
 *     A poked-in id that is not a real contact gets no tag, no text and no lasting log.
 */
const WNEW_TAG = "clicked what's new";
const WNEW_THROTTLE = 60 * 15;   // seconds between texts to Shannon about the same person
const WNEW_HOURLY_CAP = 300;     // global ceiling on processed opens per clock hour

async function recordWhatsNewClick(env, contactId) {
  if (!env || !env.REPORTS) return;
  const mode = String(env.WNEW_MODE || "off").toLowerCase();
  if (mode === "off") return;                    // off is off: not even a KV write

  const now = new Date().toISOString();

  // Global flood guard: one counter per clock hour. Read it first; if it cannot be read,
  // fail CLOSED, because a KV problem must never open a public endpoint up to hammering
  // GHL or buzzing Shannon. Over the ceiling, shed the hit before it can touch anything.
  const hourKey = "wnewhour:" + now.slice(0, 13);   // yyyy-mm-ddTHH
  let hourN;
  try { hourN = await env.REPORTS.get(hourKey); } catch (e) { return; }
  const count = Number(hourN) || 0;
  if (count >= WNEW_HOURLY_CAP) return;
  try { await env.REPORTS.put(hourKey, String(count + 1), { expirationTtl: 7200 }); } catch (e) {}

  // The contact must be a real one. A made-up id returns null here, or an id that is not
  // this exact contact, and either way nothing further happens. This is what stops a
  // stranger with a guessed id from writing a tag or firing a text.
  const contact = await lookupContact(env, contactId);
  if (!contact || contact.id !== contactId) return;

  const name = ((contact.firstName || "") + " " + (contact.lastName || "")).trim();
  const phone = contact.phone || "";

  // Per-person throttle for the TEXT only. The tag and the log still happen every open.
  const seenKey = "wnewseen:" + contactId;
  let recent = null;
  try { recent = await env.REPORTS.get(seenKey); } catch (e) {}
  const throttled = !!recent;
  try { await env.REPORTS.put(seenKey, now, { expirationTtl: WNEW_THROTTLE }); } catch (e) {}

  // The record of a real open, kept for the /wnewlog.
  try {
    await env.REPORTS.put("wnewhit:" + contactId + ":" + now,
      JSON.stringify({ contact_id: contactId, at: now, name: name || null, mode }),
      { expirationTtl: LOG_TTL });
  } catch (e) {}

  if (mode !== "live") {
    try {
      await env.REPORTS.put("wnewdry:" + contactId + ":" + now,
        JSON.stringify({ contact_id: contactId, at: now, name: name || null,
                         phone: phone || null, throttled, would_tag: WNEW_TAG }),
        { expirationTtl: LOG_TTL });
    } catch (e) {}
    return;
  }

  // Tag the resolved contact. Idempotent, so it runs even when the text is throttled.
  try {
    await ghl(env, "POST", "/contacts/" + contactId + "/tags", { tags: [WNEW_TAG] });
  } catch (e) {}

  if (throttled) return;

  // Text Shannon. She moves her cell between contacts, so find whichever contact holds
  // ALERT_PHONE right now rather than pin an id that goes stale. GHL blocks duplicate
  // phones, so at most one contact has it; the endsWith check guards against a fuzzy query
  // matching a name or email that merely contains the digits.
  const want = String(env.ALERT_PHONE || "").replace(/\D/g, "").slice(-10);
  if (want.length < 10) return;
  let alertId = "";
  try {
    const rs = await ghl(env, "POST", "/contacts/search",
      { locationId: String(env.GHL_LOCATION || ""), page: 1, pageLimit: 5, query: want });
    const cs = (rs.ok && rs.data && Array.isArray(rs.data.contacts)) ? rs.data.contacts : [];
    const hit = cs.find(function (c) {
      return String(c.phone || "").replace(/\D/g, "").endsWith(want);
    });
    if (hit && hit.id) alertId = hit.id;
  } catch (e) {}
  if (!alertId) return;

  const lines = ["New What's New click", name || "Someone (no name on file)"];
  if (phone) lines.push(phone);          // the lead's number, so she taps and replies
  lines.push("Follow up now.");
  try {
    await ghl(env, "POST", "/conversations/messages",
              { type: "SMS", contactId: alertId, message: lines.join("\n") }, "2021-04-15");
  } catch (e) {}
}


/* ------------------------------------------------------- the Send Tour Link button
 *
 * Shannon, 2026-10-21: "Is there a way to put that in GHL? A button that push once we are
 * on the phone with the appt? Once they answer, can we push a button that texts them this
 * link?" ... "Use the default phone number. There must be a way to do it. Another team is
 * already doing it. They literally click a button and it emails the link over with that
 * person ID so that the answers are saved in the notes."
 *
 * GHL itself has no one-click button on a contact (checked 2026-10-21: no manual trigger,
 * no contact quick actions; only paid add-ons). So the button is a bookmark in her Chrome.
 * On a lead's contact page it reads the contact id out of the address bar and opens
 * GET /tourtext?c=<id>#k=<key> in a small window. That page POSTs here, and this sends:
 *
 *   "Hi <first>! Here is the link we are going over together:
 *    https://scan.ismyhometoxic.com/tour/?contact_id=<id>"
 *
 * from the location's default number (TOUR_FROM, 866-567-0832, the number every reminder
 * already goes out on), then files a note on the contact. The id in the link is what ties
 * her checklist to her record, so her answers land in the notes and the packs text follows.
 *
 * WHO CAN FIRE IT. Only someone holding TOUR_KEY, which lives in her bookmark and in
 * sta-tools/.tourkey, never in this file (the dashboard repo is public). The key travels in
 * the URL FRAGMENT, which a browser never sends to a server, and then in the POST body.
 *
 * WHAT IT WILL NOT DO, whoever holds the key:
 *   - text a contact that GHL says is DND, or that carries a stop tag, or has no phone.
 *     The same mustNotText() that guards the packs send. The window shows her the reason.
 *   - text the same person twice inside TOUR_GAP seconds (a double click is one text).
 *   - go past TOUR_HOURLY_CAP live texts or TOUR_TRY_CAP presses in a clock hour. Both are
 *     soft (KV has no atomic add) but fail CLOSED if KV cannot be read.
 *   - send anything at all unless TOUR_MODE is "live". "dryrun" checks everything and
 *     reports what it would have sent; "off" refuses.
 *   - send any words but these: the message is fixed here, only the name and id change.
 *
 * Reviewed 2026-10-21 before going live (wf_2652d482-bb0): lock moved ahead of the GHL
 * lookup, every press counted, the window re-runs on a second click, GHL "failed" status
 * caught, the link shown with a Copy button when a text cannot go, the name cleaned.
 */
const TOUR_GAP = 60;               // seconds before the same contact can be texted again
const TOUR_HOURLY_CAP = 60;        // live texts per clock hour, all contacts together
const TOUR_TRY_CAP = 120;          // key-valid presses per clock hour, whatever the outcome
const TOUR_DAY_CAP = 3;            // live tour texts to ONE lead per day (Mountain date)
const TOUR_SIG_TRY_CAP = 10;       // presses of ONE lead's note link per hour
const TOUR_PAGE = "https://scan.ismyhometoxic.com/tour/?contact_id=";
const HONORIFICS = ["dr", "mr", "mrs", "ms", "miss", "mx"];

// The greeting name, from whatever was typed on a public form. One clean word or "there":
// letters, apostrophes and hyphens only, at most 20 characters, never a title, never a
// phone number or a URL (a link in a text from the toll-free number can trip carrier filters).
function greetName(raw) {
  const words = String(raw || "").replace(/\u2019/g, "'").trim().split(/\s+/);
  for (let w of words) {
    if (/[\/:@]|www\./i.test(w)) return "";          // a link or an email, not a name
    w = w.replace(/[^\p{L}'-]/gu, "").replace(/^['-]+|['-]+$/g, "");
    if (!w || !/\p{L}/u.test(w)) continue;
    if (HONORIFICS.indexOf(w.toLowerCase()) >= 0) continue;
    if (w.length > 20) return "";
    if (w.length > 1 && w === w.toUpperCase()) w = w.toLowerCase();    // MARY -> Mary
    if (w === w.toLowerCase()) {
      w = w.replace(/(^|['-])(\p{Ll})/gu, function (m, sep, ch) { return sep + ch.toUpperCase(); });
    }
    return w;
  }
  return "";
}

function tourMessage(contact) {
  return "Hi " + (greetName(contact.firstName) || "there") +
         "! Here is the link we are going over together: " + TOUR_PAGE + contact.id;
}

function lastFour(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : "";
}

function mountainTime(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", { timeZone: "America/Edmonton", month: "short",
      day: "numeric", hour: "numeric", minute: "2-digit" }) + " MT";
  } catch (e) { return iso.slice(0, 16).replace("T", " ") + " UTC"; }
}

function mountainDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Edmonton" });   // yyyy-mm-dd
  } catch (e) { return String(iso).slice(0, 10); }
}

async function bump(env, key, n) {
  try { await env.REPORTS.put(key, String(n + 1), { expirationTtl: 7200 }); } catch (e) {}
}

// The SEND TOUR LINK note on each lead (Shannon 2026-10-22: "How will Kristen & other
// builders do that? ... It needs to be simple. A button that is already on each lead.")
// Its link carries a signature for THAT contact only: HMAC-SHA256 of "tour:<id>" under the
// TOUR_SIGN secret. Anyone who sees the note can text that one lead their own tour link,
// at most TOUR_DAY_CAP times a day, and nothing else. TOUR_SIGN must never be rotated
// casually: every note already pinned on a lead stops working when it changes.
async function tourSig(env, cid) {
  const secret = String((env && env.TOUR_SIGN) || "");
  if (!secret || !ID_OK.test(String(cid || ""))) return "";
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode("tour:" + cid)));
  let b = "";
  for (let i = 0; i < 16; i++) b += String.fromCharCode(mac[i]);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function tourNoteLink(env, cid) {
  const sig = await tourSig(env, cid);
  return sig ? PACK_HOST + "/tourtext?c=" + cid + "#s=" + sig : "";
}

async function sendTourLink(env, body) {
  const mode = String(env.TOUR_MODE || "off").toLowerCase();
  const key = String(env.TOUR_KEY || "");
  const cid = String(body.c || "").trim();
  const viaKey = !!key && String(body.k || "") === key;       // Shannon's own bookmark
  let viaSig = false;                                          // the pinned note on a lead
  if (!viaKey && body.s && ID_OK.test(cid)) {
    const sig = await tourSig(env, cid);
    viaSig = !!sig && String(body.s) === sig;
  }
  if (!viaKey && !viaSig) return { ok: false, status: 403, why: ["This link or button is not valid. Ask Shannon for a new one."] };
  if (mode === "off") return { ok: false, why: ["The tour link button is switched off."] };
  if (!ID_OK.test(cid)) return { ok: false, why: ["Open the lead's contact page in GHL first, then click the button."] };
  if (!env.REPORTS) return { ok: false, why: ["The worker has no storage, so nothing was sent."] };
  const link = TOUR_PAGE + cid;
  const now = new Date().toISOString();
  const hour = now.slice(0, 13);
  const KVDOWN = { ok: false, link, why: ["Storage could not be read, so nothing was sent. Try again in a minute."] };

  // A single lead's note link can be switched off without touching anyone else's.
  try { if (await env.REPORTS.get("tourrevoke:" + cid)) return { ok: false, why: ["The tour link button for this lead is switched off."] }; }
  catch (e) { return KVDOWN; }

  // Budgets (2026-10-22 review). Shannon's bookmark shares one hourly budget. A note link
  // gets its OWN small budget per lead, so one copied link can never use up everyone
  // else's. Presses refused by the 60 s lock are not counted. Unreadable = refuse.
  const tryKey = viaKey ? "tourtry:" + hour : "tourtry:" + cid + ":" + hour;
  const tryCap = viaKey ? TOUR_TRY_CAP : TOUR_SIG_TRY_CAP;
  let tries, n;
  try {
    tries = Number(await env.REPORTS.get(tryKey)) || 0;
    n = Number(await env.REPORTS.get("tourhour:" + hour)) || 0;
  } catch (e) { return KVDOWN; }
  if (tries >= tryCap) return { ok: false, link, why: ["Too many presses this hour, so nothing was sent. Copy the link below if they still need it."] };
  if (n >= TOUR_HOURLY_CAP) return { ok: false, link, why: ["More than " + TOUR_HOURLY_CAP + " tour links this hour. Nothing was sent."] };

  // The per-person lock goes on BEFORE the GHL lookup. KV has no compare-and-set, so the
  // lock carries a random nonce and is read back after a short pause: of several presses
  // racing in the same data center, only the one whose nonce survived goes on.
  const lockKey = "tourlock:" + cid;
  let recent;
  try { recent = await env.REPORTS.get(lockKey); } catch (e) { return KVDOWN; }
  if (recent) return { ok: false, why: ["The link already went to this person less than a minute ago."], at: String(recent).split("|")[1] || "" };
  const nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)) + "|" + now;
  try { await env.REPORTS.put(lockKey, nonce, { expirationTtl: TOUR_GAP }); }
  catch (e) { return KVDOWN; }
  await new Promise(function (r) { setTimeout(r, 150); });
  let back = null;
  try { back = await env.REPORTS.get(lockKey); } catch (e) {}
  if (back && back !== nonce) return { ok: false, why: ["This link is already being sent. Look for it in the conversation in a moment."] };
  await bump(env, tryKey, tries);

  // The day count is RESERVED here, next to the lock and before the GHL calls, and given
  // back on every path that ends without a text.
  const dayKey = "tourday:" + cid + ":" + mountainDate(now);
  let today;
  try { today = Number(await env.REPORTS.get(dayKey)) || 0; }
  catch (e) { try { await env.REPORTS.delete(lockKey); } catch (e2) {} return KVDOWN; }
  if (today >= TOUR_DAY_CAP) {
    try { await env.REPORTS.delete(lockKey); } catch (e) {}
    return { ok: false, link, why: ["The tour link already went to this person " + today + " times today, so nothing was sent. Copy the link below if they still need it."] };
  }
  try { await env.REPORTS.put(dayKey, String(today + 1), { expirationTtl: 60 * 60 * 36 }); }
  catch (e) { try { await env.REPORTS.delete(lockKey); } catch (e2) {} return KVDOWN; }
  async function release() {
    try { await env.REPORTS.delete(lockKey); } catch (e) {}
    try { await env.REPORTS.put(dayKey, String(today), { expirationTtl: 60 * 60 * 36 }); } catch (e) {}
  }

  // Same DND-aware id search as the packs send (see the trap note at the top of
  // 04-send.js), read here so "GHL did not answer" and "no such contact" are told apart.
  const loc = String(env.GHL_LOCATION || "").trim();
  let sr = null;
  if (loc) {
    try {
      sr = await ghl(env, "POST", "/contacts/search", { locationId: loc, page: 1, pageLimit: 1,
        filters: [{ field: "id", operator: "eq", value: cid }] });
    } catch (e) { sr = null; }
  }
  if (!sr || !sr.ok) {
    await release();
    return { ok: false, link, why: ["GHL did not answer" + (sr ? " (HTTP " + sr.status + ")" : "") + ". Nothing was sent. Try again in a minute."] };
  }
  const contact = Array.isArray(sr.data && sr.data.contacts) ? sr.data.contacts[0] : null;
  if (!contact || contact.id !== cid) {
    await release();
    return { ok: false, why: ["This contact is not in your GHL account, so nothing was sent."] };
  }
  // A note link shows only the first name and no phone digits or opt-out detail: it can
  // be copied out of GHL, and whoever holds it should learn nothing about the lead.
  const name = viaKey
    ? (((contact.firstName || "") + " " + (contact.lastName || "")).trim() || "(no name on file)")
    : (greetName(contact.firstName) || "this lead");
  const to = viaKey ? lastFour(contact.phone) : "";
  const why = mustNotText(contact);
  if (why.length) {
    await release();
    return viaKey ? { ok: false, name, to, why }
      : { ok: false, name, link, why: ["This person cannot get texts from us (they opted out, or there is no cell number on file). You can copy the link below and email it instead."] };
  }

  const message = tourMessage(contact);
  const from = String(env.TOUR_FROM || "").trim();

  if (mode !== "live") {
    await release();
    try {
      await env.REPORTS.put("tourdry:" + cid + ":" + now,
        JSON.stringify({ contact_id: cid, at: now, via: viaKey ? "key" : "note", to: lastFour(contact.phone), from, message }),
        { expirationTtl: 60 * 60 * 24 * 30 });
    } catch (e) {}
    return { ok: true, dry: true, name, to, from, message };
  }

  await bump(env, "tourhour:" + hour, n);
  const payload = { type: "SMS", contactId: cid, message };
  if (from) payload.fromNumber = from;
  const rec = { contact_id: cid, at: now, via: viaKey ? "key" : "note", to: lastFour(contact.phone), from };
  let r;
  try {
    r = await ghl(env, "POST", "/conversations/messages", payload, "2021-04-15");
  } catch (e) {
    rec.error = "threw: " + String((e && e.message) || e).slice(0, 200);     // lock + day count kept: it may have gone
    try { await env.REPORTS.put("tourtext:" + cid + ":" + now, JSON.stringify(rec), { expirationTtl: LOG_TTL }); } catch (e2) {}
    return { ok: false, name, to, link, why: ["The text may or may not have gone out. Ask them if it came in before clicking again."] };
  }
  const st = String((r.data && r.data.status) || "").toLowerCase();
  rec.ok = r.ok; rec.status = r.status; rec.msg_status = st || null;
  rec.message_id = (r.data && (r.data.messageId || r.data.msgId)) || null;
  if (!r.ok || st === "failed" || st === "undelivered") {
    await release();       // nothing went out, so a retry (or a fixed number) must not be refused
    rec.error = JSON.stringify(r.data).slice(0, 300);
    try { await env.REPORTS.put("tourtext:" + cid + ":" + now, JSON.stringify(rec), { expirationTtl: LOG_TTL }); } catch (e) {}
    const msg = (r.data && (r.data.message || r.data.error)) || "";
    return { ok: false, name, to, link, why: ["GHL refused the text" + (r.ok ? "" : " (HTTP " + r.status + ")") +
             (msg && viaKey ? ": " + String(msg).slice(0, 160) : "") + ". Copy the link below and email it to them instead."] };
  }
  try { await env.REPORTS.put("tourtext:" + cid + ":" + now, JSON.stringify(rec), { expirationTtl: LOG_TTL }); } catch (e) {}

  // A trace on the record, so whoever opens the contact sees the link went out.
  try {
    await ghl(env, "POST", "/contacts/" + cid + "/notes", {
      body: "TOUR LINK TEXTED " + mountainTime(now) + "\n" + link + "\nSent with the Send Tour Link " + (viaKey ? "button." : "note."),
    });
  } catch (e) {}
  return { ok: true, name, to, from, at: now };
}

// The little window the bookmark opens. It shows who it is texting and the result. The key
// arrives in the #fragment and goes back out only in the POST body to this same host.
// A second click while this window is open changes only the #fragment (the address was
// cleaned after the first run), which the browser treats as the same page: no reload. So
// the work runs on load AND on every hashchange that carries a key, with a busy flag so a
// click while a POST is in flight is ignored. The KV lock still makes a double click one text.
const TOUR_WINDOW =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">' +
  '<title>Send Tour Link</title><style>' +
  'body{margin:0;background:#0B2545;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}' +
  '.w{padding:24px 22px}h1{font-size:1.25em;margin:0 0 10px}p{margin:0 0 10px;line-height:1.45;color:#DCE6F2}' +
  '.ok h1{color:#7BE0A0}.no h1{color:#FF9AA2}.msg{background:#12345f;border-radius:10px;padding:12px;font-size:.92em;color:#fff;word-break:break-all}' +
  'ul{margin:0 0 10px;padding-left:20px;color:#fff}button{margin:6px 8px 0 0;padding:10px 16px;border:0;border-radius:8px;' +
  'background:#fff;color:#0B2545;font-weight:700;font-size:15px;cursor:pointer}' +
  '</style></head><body><div class="w" id="w"><h1>Sending the tour link...</h1><p>One moment.</p></div>' +
  '<script>(function(){' +
  'var w=document.getElementById("w"),busy=false,c=new URLSearchParams(location.search).get("c")||"";' +
  'var CLOSE="<button onclick=\\"window.close()\\">Close</button>";' +
  'function h(s){return String(s==null?"":s).replace(/[&<>"]/g,function(x){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[x];});}' +
  'function copyBox(l){if(!l)return"";return"<p>Their link:</p><p class=msg>"+h(l)+"</p><button id=cp>Copy link</button>";}' +
  'function wire(l){var b=document.getElementById("cp");if(b&&l)b.onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(l).then(function(){b.textContent="Copied";});};}' +
  'function go(){var m=location.hash.match(/(k|s)=([^&]+)/);if(!m||busy)return;var a={c:c};a[m[1]]=decodeURIComponent(m[2]);busy=true;' +
  'try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}' +
  'w.className="w";w.innerHTML="<h1>Sending the tour link...</h1><p>One moment.</p>";' +
  'fetch("/tourtext",{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(a)})' +
  '.then(function(r){return r.json();}).then(function(j){busy=false;' +
  'var who=h(j.name||"")+(j.to?" (ending "+h(j.to)+")":"");' +
  'if(j.ok&&j.dry){w.className="w ok";w.innerHTML="<h1>TEST ONLY, nothing sent</h1><p>It would text "+who+":</p><p class=msg>"+h(j.message)+"</p>"+CLOSE;return;}' +
  'if(j.ok){w.className="w ok";w.innerHTML="<h1>Sent!</h1><p>The tour link is on its way to "+who+".</p><p>Ask them if it came in.</p>"+CLOSE;setTimeout(function(){window.close();},8000);return;}' +
  'w.className="w no";w.innerHTML="<h1>Not sent</h1>"+(who?"<p>"+who+"</p>":"")+"<ul>"+(j.why||["Unknown problem."]).map(function(x){return"<li>"+h(x)+"</li>";}).join("")+"</ul>"+copyBox(j.link)+CLOSE;wire(j.link);' +
  '}).catch(function(){busy=false;w.className="w no";w.innerHTML="<h1>Not sent</h1><p>The button could not reach the server. Check the internet and click it again.</p>"+CLOSE;});}' +
  'window.addEventListener("hashchange",go);go();' +
  '})();</script></body></html>';

/* ------------------------------------------- SEND TOUR LINK notes on the leads
 *
 * Every NEW contact, and everyone booked on a tour calendar, gets one pinned note with a
 * SEND TOUR LINK link (their own signed link, see tourSig). Pinned notes sit at the top of
 * the Notes panel in GHL, on the web and in the phone app, so Kristen and every builder
 * just open the lead and click it. Runs from its own cron (TOUR_NOTE_CRON, every 5 minutes),
 * so it never shares a subrequest budget with the packs queue.
 *
 *   - TOUR_NOTES gates it: "live" writes notes, "dryrun" logs who would get one, "off" nothing.
 *   - one note per contact, ever: KV tournote:<id> remembers it.
 *   - skipped: builder prospects (tag boostyourincome: their call is the Zoom, not a tour)
 *     and anyone who opted out (DND, stop tags). A lead with NO PHONE still gets the note:
 *     the click re-checks everything and says "no cell number on file", and the button is
 *     already there if a number is added later (2026-10-22 review).
 *   - a failed note POST (429, 5xx) stops the run BEFORE the cursor passes that lead, so
 *     the next run retries it; a "pending" marker goes on before each POST and a run lock
 *     keeps a manual /tournoterun from overlapping the cron, so a lead never gets two notes.
 *   - new contacts are read in date order from a cursor, so a busy hour is finished on the
 *     next run instead of skipped; at most TOUR_NOTES_PER_RUN notes are written per run.
 */
const TOUR_NOTE_CRON = "1-59/5 * * * *";     // every 5 minutes, one minute after the packs cron
const TOUR_NOTES_PER_RUN = 12;
const TOUR_NOTE_SKIP_TAGS = ["boostyourincome"];
const TOUR_CALENDARS = [
  "1cSkufApIXXOrrDSlsfn", "7qPj2dFr91uOtgbhKc3O", "8KyVN97V9STkCZ8fv8tm", "DhQIAxElvFEm9JvanpS2",
  "MFE31N22BzC6yUkKhjfk", "Uu9A7T3weNNMrqGDXhSh", "VcaBdXq7kJAAb3q9lwVu", "Y8AxPZdBot07yyAMM0yQ",
  "bfmvjAoI4FxLd2cOyn9c", "tS0J4P5TcSyAxL79gcR5", "tutfx6nixvxzqsdolstb", "wz7NpKeOERbYhUsmEfff",
  "xRWH8ROP4UOsxNCyyxGf",
];   // the shopper tour calendars; the 5 builder Zoom calendars are left out on purpose
const TOUR_NOTES_BACK_DAYS = 45;   // first run reaches back this far for new contacts

function tourNoteHtml(link, contact) {
  const who = greetName(contact && contact.firstName) || "them";
  return '<p><a href="' + link + '" target="_blank"><strong>SEND TOUR LINK</strong></a></p>' +
         "<p>Click it once you are on the call with " + esc(who) + ". It texts " + esc(who) +
         " the tour link from 866-567-0832, and the checklist answers save here.</p>";
}

async function tourNoteFor(env, contact, mode) {
  const cid = contact.id;
  const tags = (Array.isArray(contact.tags) ? contact.tags : []).map(function (t) { return String(t).toLowerCase().trim(); });
  if (TOUR_NOTE_SKIP_TAGS.some(function (t) { return tags.indexOf(t) >= 0; })) {
    if (mode === "live") await env.REPORTS.put("tournote:" + cid, "skip:builder", { expirationTtl: LOG_TTL });
    return "skip:builder";
  }
  const why = mustNotText(contact).filter(function (w) { return w.indexOf("no phone") < 0; });
  if (why.length) {
    if (mode === "live") await env.REPORTS.put("tournote:" + cid, "skip:" + why[0].slice(0, 60), { expirationTtl: 60 * 60 * 24 * 7 });
    return "skip:dnd";
  }
  const link = await tourNoteLink(env, cid);
  if (!link) return "no-sign-key";
  if (mode !== "live") {
    await env.REPORTS.put("tournotedry:" + cid, JSON.stringify({ at: new Date().toISOString(),
      name: ((contact.firstName || "") + " " + (contact.lastName || "")).trim() }), { expirationTtl: 60 * 60 * 24 * 7 });
    return "dry";
  }
  // "pending" BEFORE the POST: an overlapping run sees it and skips. No marker, no POST.
  try { await env.REPORTS.put("tournote:" + cid, "pending", { expirationTtl: 3600 }); }
  catch (e) { return "kv-failed"; }
  let r;
  try { r = await ghl(env, "POST", "/contacts/" + cid + "/notes", { body: tourNoteHtml(link, contact), pinned: true }); }
  catch (e) { r = { ok: false, status: 0 }; }
  if (!r.ok) {
    try { await env.REPORTS.delete("tournote:" + cid); } catch (e) {}
    return "note-failed:" + r.status;
  }
  try {
    await env.REPORTS.put("tournote:" + cid, String((r.data && r.data.note && r.data.note.id) || "ok"), { expirationTtl: LOG_TTL });
  } catch (e) {}     // the "pending" marker still blocks a repeat for an hour
  return "noted";
}

function retryable(res) {
  const m = /^note-failed:(\d+)$/.exec(res || "");
  if (!m) return res === "kv-failed";
  const st = Number(m[1]);
  return st === 0 || st === 429 || st >= 500;
}

async function ensureTourNotes(env) {
  const mode = String((env && env.TOUR_NOTES) || "off").toLowerCase();
  if (mode === "off" || !env.REPORTS || !String(env.TOUR_SIGN || "")) return { skipped: mode };
  const loc = String(env.GHL_LOCATION || "").trim();
  if (!loc) return { skipped: "no location" };

  // One run at a time (a manual /tournoterun must not overlap the cron).
  const lockKey = "tournotes:lock";
  if (await env.REPORTS.get(lockKey)) return { skipped: "another run is going" };
  await env.REPORTS.put(lockKey, new Date().toISOString(), { expirationTtl: 120 });
  try {
    return await tourNotesPass(env, mode, loc);
  } finally {
    try { await env.REPORTS.delete(lockKey); } catch (e) {}
  }
}

async function tourNotesPass(env, mode, loc) {
  const now = Date.now();
  const out = [];
  let made = 0;
  let stopped = false;
  const seen = {};

  // 1) new contacts, oldest first, from the cursor. The search starts an hour BEFORE the
  // cursor, because GHL's search index can show a contact late or out of order; the
  // tournote: markers make the re-read free of duplicates.
  const curKey = mode === "live" ? "tournotes:since" : "tournotes:since:dry";
  let since = await env.REPORTS.get(curKey);
  if (!since) since = new Date(now - TOUR_NOTES_BACK_DAYS * 86400000).toISOString();
  const from = new Date(Date.parse(since) - 60 * 60000).toISOString();
  const sr = await ghl(env, "POST", "/contacts/search", { locationId: loc, page: 1, pageLimit: 50,
    filters: [{ field: "dateAdded", operator: "range", value: { gte: from } }],
    sort: [{ field: "dateAdded", direction: "asc" }] });
  let cursor = since;
  try {
    if (sr.ok && sr.data && Array.isArray(sr.data.contacts)) {
      for (const c of sr.data.contacts) {
        if (!c || !ID_OK.test(String(c.id || ""))) continue;
        if (made >= TOUR_NOTES_PER_RUN) break;             // the cursor stops here; next run resumes
        seen[c.id] = 1;
        if (!(await env.REPORTS.get("tournote:" + c.id))) {
          const res = await tourNoteFor(env, c, mode);
          out.push(c.id + "=" + res);
          if (res === "noted" || res === "dry") made++;
          if (retryable(res)) { stopped = true; break; }  // GHL or KV hiccup: retry this lead next run
          if (/^note-failed:/.test(res)) {
            await env.REPORTS.put("tournote:" + c.id, "fail:" + res.split(":")[1], { expirationTtl: 86400 });
          }
        }
        if (c.dateAdded && c.dateAdded > cursor) cursor = c.dateAdded;
      }
    }
  } finally {
    if (cursor > since) await env.REPORTS.put(curKey, cursor);
  }

  // 2) everyone booked on a tour calendar (yesterday to 30 days out), every half hour
  const calKey = mode === "live" ? "tournotes:cal" : "tournotes:cal:dry";
  const lastCal = Number(await env.REPORTS.get(calKey)) || 0;
  if (!stopped && made < TOUR_NOTES_PER_RUN && now - lastCal > 30 * 60000) {
    const ids = [];
    let calOk = true;
    for (const cal of TOUR_CALENDARS) {
      const r = await ghl(env, "GET", "/calendars/events?locationId=" + loc + "&calendarId=" + cal +
        "&startTime=" + (now - 86400000) + "&endTime=" + (now + 30 * 86400000), undefined, "2021-04-15");
      if (!r.ok || !r.data || !Array.isArray(r.data.events)) { calOk = false; continue; }
      for (const e of r.data.events) {
        const st = String(e.appointmentStatus || "").toLowerCase();
        if (!e.contactId || e.deleted || st === "cancelled" || st === "invalid") continue;
        if (!seen[e.contactId] && ids.indexOf(e.contactId) < 0) ids.push(e.contactId);
      }
    }
    let finished = calOk;
    for (const cid of ids) {
      if (!ID_OK.test(cid)) continue;
      if (await env.REPORTS.get("tournote:" + cid)) continue;
      if (made >= TOUR_NOTES_PER_RUN) { finished = false; break; }
      const c = await lookupContact(env, cid);
      if (!c) { finished = false; continue; }
      const res = await tourNoteFor(env, c, mode);
      out.push(cid + "=" + res);
      if (res === "noted" || res === "dry") made++;
      if (retryable(res)) { finished = false; break; }
    }
    if (finished) await env.REPORTS.put(calKey, String(now));
  }
  return { mode, made, results: out };
}


/* ------------------------------------------------------------------- requests */

function cors(origin) {
  const ok = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

const ID_OK = /^[A-Za-z0-9]{15,30}$/;
// esc() (HTML escape) is defined in 03-page.js and in module scope here after the build
// concatenates the files. The /wnewgen page uses it on names, phones and the search box.

async function logSubmission(env, rec) {
  if (!env || !env.REPORTS) return null;
  try {
    const key = "switch:" + rec.at + ":" + (rec.contact_id || "none");
    await env.REPORTS.put(key, JSON.stringify(rec), { expirationTtl: LOG_TTL });
    return key;
  } catch (e) {
    return null;
  }
}

async function markLog(env, key, patch) {
  if (!env || !env.REPORTS || !key) return;
  try {
    const prev = await env.REPORTS.get(key, "json");
    if (!prev) return;
    await env.REPORTS.put(key, JSON.stringify({ ...prev, ...patch }),
                          { expirationTtl: LOG_TTL });
  } catch (e) { /* the note matters more than the bookkeeping */ }
}

const NOT_FOUND =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex"><title>Not found</title>' +
  '<body style="margin:0;background:#0B2545;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
  '<div style="max-width:600px;margin:0 auto;padding:60px 24px">' +
  '<h1 style="font-size:1.4em;margin:0 0 10px">This page is not here</h1>' +
  '<p style="color:#BFD2E6;line-height:1.6">If Shannon sent you a link to your packs, ' +
  'check the address, or just reply to her text and she will send it again.</p></div>';

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // ----------------------------------------------- Send Tour Link button (2026-10-21)
    // GET is the little window her bookmark opens; it POSTs back here from the same host,
    // so no CORS is involved. Above the packs-slug handler, which would take /tourtext as
    // a page name. Everything that decides whether a text goes out is in 04-tour.js.
    if (url.pathname === "/tourtext") {
      if (request.method === "GET") {
        return new Response(TOUR_WINDOW, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
                     "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" },
        });
      }
      if (request.method === "POST") {
        let body = {};
        try {
          const t = await request.text();
          if (t.length < 2000) body = JSON.parse(t) || {};
        } catch (e) {}
        let res;
        try { res = await sendTourLink(env, body); }
        catch (e) { res = { ok: false, why: ["Something broke on the server, so nothing was sent."] }; }
        const st = res.status || 200;
        delete res.status;
        return new Response(JSON.stringify(res), {
          status: st, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      return new Response("no", { status: 405 });
    }

    // ----------------------------------------------- What's New click tracker
    // Shannon texts packs.ismyhometoxic.com/wnew?c=<contactId> from her own phone. When a
    // person OPENS it she wants a text naming who clicked and the contact tagged, so she
    // follows up within minutes.
    //
    // WHY A JAVASCRIPT PAGE AND NOT A 302. iMessage and most texting apps FETCH a link to
    // build the little preview card the instant a text is sent, on the sender's phone and
    // the receiver's, before anyone taps. A plain redirect would fire on that preview and
    // tell Shannon someone clicked when nobody has. Preview fetchers do not run JavaScript,
    // so the record is fired from JS: a real person in a real browser triggers it, a
    // preview never does. This path must sit ABOVE the packs-slug handler, which would
    // otherwise swallow /wnew as a page name.
    if (request.method === "GET" && url.pathname === "/wnew") {
      const dest = "https://switchtoamerica.com/whatisnew";
      const raw = String(url.searchParams.get("c") || url.searchParams.get("contact_id") || "").trim();
      const cid = ID_OK.test(raw) ? raw : "";
      const page =
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow">' +
        '<meta property="og:title" content="What&#39;s New at Melaleuca">' +
        '<meta property="og:description" content="A quick look at what is new.">' +
        '<title>Switch to America</title>' +
        '<noscript><meta http-equiv="refresh" content="0;url=' + dest + '"></noscript>' +
        '</head><body style="margin:0;background:#0B2545;color:#fff;' +
        'font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
        '<div style="max-width:600px;margin:0 auto;padding:80px 24px;text-align:center">' +
        '<p style="color:#BFD2E6;font-size:1.1em">Taking you there...</p>' +
        '<p><a href="' + dest + '" style="color:#fff">Continue</a></p></div>' +
        '<script>(function(){var d=' + JSON.stringify(dest) + ',c=' + JSON.stringify(cid) + ';' +
        'try{if(c){var u="/wnew-hit?c="+encodeURIComponent(c);' +
        'if(!navigator.sendBeacon||!navigator.sendBeacon(u)){' +
        'fetch(u,{method:"POST",keepalive:true});}}}catch(e){}' +
        'location.replace(d);})();</script></body></html>';
      return new Response(page, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
                   "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    // The click record itself, fired by /wnew's JavaScript beacon (a POST). POST ONLY, on
    // purpose: a zero-JS URL security scanner that reads the /wnew-hit URL out of the page
    // body and GETs it would otherwise log a false open and text Shannon. The real client
    // never issues a GET here, so nothing legitimate is lost. A stray GET falls through to
    // a harmless 404 below.
    if (url.pathname === "/wnew-hit" && request.method === "POST") {
      const raw = String(url.searchParams.get("c") || url.searchParams.get("contact_id") || "").trim();
      if (ID_OK.test(raw)) {
        try { await recordWhatsNewClick(env, raw); }
        catch (e) { /* a tracking miss must never error the beacon */ }
      }
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // Who has opened What's New, newest first. Guarded by the same ?k= as the other logs.
    if (request.method === "GET" && url.pathname === "/wnewlog") {
      if (!readKey(env) || url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      if (!env.REPORTS) return json({ error: "no KV bound" }, 500, origin);
      const rows = [];
      for (const pfx of ["wnewhit:", "wnewdry:"]) {
        const list = await env.REPORTS.list({ prefix: pfx, limit: 500 });
        for (const k of list.keys) {
          const v = await env.REPORTS.get(k.name, "json");
          if (v) rows.push({ kind: pfx.replace(":", ""), ...v });
        }
      }
      rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      return json({ mode: String(env.WNEW_MODE || "off"), count: rows.length,
                    rows: rows.slice(0, 200) }, 200, origin);
    }

    // ----------------------------------------------- What's New link generator
    // Shannon's own bookmarked tool. She opens packs.ismyhometoxic.com/wnewgen?k=<key> on
    // her phone, types a name or number, and gets that person's tracked link to copy into a
    // text. Guarded by the same ?k= as the logs, because it searches her CRM; the key lives
    // in her private bookmark, never in a public page. Read only: it never writes anything.
    if (request.method === "GET" && url.pathname === "/wnewgen") {
      if (!readKey(env) || url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      const k = readKey(env);
      const q = String(url.searchParams.get("q") || "").trim().slice(0, 60);
      let results = "";
      if (q) {
        let contacts = [];
        try {
          const r = await ghl(env, "POST", "/contacts/search",
            { locationId: String(env.GHL_LOCATION || ""), page: 1, pageLimit: 15, query: q });
          if (r.ok && r.data && Array.isArray(r.data.contacts)) contacts = r.data.contacts;
        } catch (e) {}
        if (!contacts.length) {
          results = '<p class="none">No matches for "' + esc(q) + '". Try a first name, last name, or phone.</p>';
        } else {
          results = contacts.map(function (c) {
            const nm = ((c.firstName || "") + " " + (c.lastName || "")).trim() || "(no name)";
            const link = WNEW_HOST + "/wnew?c=" + c.id;
            return '<div class="card"><div class="nm">' + esc(nm) +
              (c.phone ? ' <span class="ph">' + esc(c.phone) + '</span>' : '') + '</div>' +
              '<div class="lk">' + esc(link) + '</div>' +
              '<button class="cp" data-l="' + esc(link) + '">Copy link</button></div>';
          }).join("");
        }
      }
      const page =
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow"><title>What&#39;s New links</title>' +
        '<style>' +
        'body{margin:0;background:#0B2545;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}' +
        '.wrap{max-width:640px;margin:0 auto;padding:24px 16px}' +
        'h1{font-size:1.2em;margin:0 0 4px}.sub{color:#BFD2E6;margin:0 0 16px;font-size:.9em}' +
        'form{display:flex;gap:8px;margin-bottom:20px}' +
        'input{flex:1;padding:12px;border:0;border-radius:8px;font-size:16px}' +
        'form button{padding:12px 16px;border:0;border-radius:8px;background:#F4A300;color:#0B2545;font-weight:700;font-size:16px}' +
        '.card{background:#12345f;border-radius:10px;padding:14px;margin-bottom:12px}' +
        '.nm{font-weight:700;margin-bottom:6px}.ph{color:#BFD2E6;font-weight:400;font-size:.9em}' +
        '.lk{color:#BFD2E6;font-size:.82em;word-break:break-all;margin-bottom:10px}' +
        '.cp{padding:10px 14px;border:0;border-radius:8px;background:#fff;color:#0B2545;font-weight:700}' +
        '.none{color:#BFD2E6}' +
        '</style></head><body><div class="wrap">' +
        '<h1>What&#39;s New links</h1>' +
        '<p class="sub"><b>This page is just for you. Do not text this page.</b> Search a person, tap Copy link, and text THAT link. When they open it you get a text and they are tagged.</p>' +
        '<form method="GET" action="/wnewgen">' +
        '<input type="hidden" name="k" value="' + esc(k) + '">' +
        '<input name="q" value="' + esc(q) + '" placeholder="Name or phone" autocomplete="off" autofocus>' +
        '<button type="submit">Find</button></form>' +
        results +
        '<script>document.addEventListener("click",function(e){var b=e.target.closest(".cp");if(!b)return;' +
        'var l=b.getAttribute("data-l");if(navigator.clipboard){navigator.clipboard.writeText(l).then(function(){' +
        'b.textContent="Copied";setTimeout(function(){b.textContent="Copy link";},1500);});}});</script>' +
        '</div></body></html>';
      return new Response(page, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
                   "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    // ---------------------------------------------------------------- the log
    if (request.method === "GET" && url.pathname === "/log") {
      if (!readKey(env) || url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      if (!env.REPORTS) return json({ error: "no KV bound" }, 500, origin);
      const want = (url.searchParams.get("contact") || "").trim();
      const list = await env.REPORTS.list({ prefix: "switch:", limit: 1000 });
      const keys = list.keys.map((k) => k.name).sort().reverse();
      const out = [];
      for (const k of keys) {
        if (want && !k.endsWith(":" + want)) continue;
        const v = await env.REPORTS.get(k, "json");
        if (v) out.push(v);
        if (out.length >= 100) break;
      }
      return json({ count: out.length, submissions: out }, 200, origin);
    }

    // ------------------------------------------------------- the packs queue
    // Every row, what state it is in, and for a blocked row exactly why. This is how
    // Shannon or I answer "did she get her text" without guessing.
    if (request.method === "GET" && url.pathname === "/packlog") {
      if (!readKey(env) || url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      if (!env.REPORTS) return json({ error: "no KV bound" }, 500, origin);
      const list = await env.REPORTS.list({ prefix: "packsend:", limit: 500 });
      const rows = [];
      const tally = {};
      for (const k of list.keys) {
        const v = await env.REPORTS.get(k.name, "json");
        if (!v) continue;
        tally[v.state] = (tally[v.state] || 0) + 1;
        rows.push(v);
      }
      rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      return json({ mode: String(env.SEND_MODE || "off"), tally, count: rows.length,
                    rows }, 200, origin);
    }

    // Run the SEND TOUR LINK notes pass by hand (same code as its cron). LOG_KEY guarded.
    if (request.method === "GET" && url.pathname === "/tournoterun") {
      if (!readKey(env) || url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      const r = await ensureTourNotes(env);
      return json(r, 200, origin);
    }

    // Run the queue by hand. Same code the cron runs, no shortcuts, same guards.
    if (request.method === "GET" && url.pathname === "/packrun") {
      if (!readKey(env) || url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      const r = await processQueue(env);
      return json({ mode: String(env.SEND_MODE || "off"), ...r }, 200, origin);
    }

    // ----------------------------------------------------------- a packs page
    // GET /<name> on packs.ismyhometoxic.com. Served straight out of KV, so the link
    // in a text works the instant the page is built.
    if (request.method === "GET") {
      const slug = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
      if (slug && /^[a-z0-9-]{1,40}$/.test(slug) && env.REPORTS) {
        const page = await env.REPORTS.get("packpage:" + slug, "json");
        if (page && page.html) {
          return new Response(page.html, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Robots-Tag": "noindex, nofollow",
            },
          });
        }
      }
      return new Response(NOT_FOUND, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8",
                   "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, origin);
    }

    // ------------------------------------------------- a checklist submission
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return json({ error: "bad json" }, 400, origin);
    }

    const contactId = String(data.contact_id || "").trim();
    const score = Number(data.score) || 0;
    const count = Number(data.count) || 0;
    // The checklist has about 165 boxes. Anything longer is junk off a public form.
    const items = (Array.isArray(data.items) ? data.items : []).slice(0, 300);

    // Shannon, 2026-08-30: ask where they already shop, before the checklist.
    // Comes off a public form, so it is clamped hard: at most 12 entries, 40 characters
    // each, and the free text capped at 120. It is never scored and never touches a
    // package. It exists so she walks into the call already knowing where their money
    // goes now.
    const stores = (Array.isArray(data.stores) ? data.stores : [])
      .filter(function (x) { return typeof x === "string" && x.trim(); })
      .slice(0, 12)
      .map(function (x) { return x.trim().slice(0, 40); });
    const storesOther = String(data.storesOther || "").trim().slice(0, 120);

    const rec = {
      at: new Date().toISOString(),
      contact_id: contactId || null,
      score,
      count,
      items,
      stores,
      storesOther,
      origin,
      saved: false,
      outcome: "pending",
    };
    const logKey = await logSubmission(env, rec);

    if (!ID_OK.test(contactId)) {
      await markLog(env, logKey, { outcome: "no valid contact id" });
      return json({ ok: false, saved: false, reason: "no valid contact id", packs: "no-id" },
                  200, origin);
    }

    // Queue the packs page and the text. Writes one row and returns. Sends nothing.
    // Runs AFTER the note is filed (2026-10-20): the package search costs real CPU, and
    // the note is the job that must not fail. Wrapped so a queue problem never throws.
    // `packs` goes back in every answer below, so the score page only says "watch your
    // phone" when a text is really coming ("queued" or "pending").
    let packs = "error";
    const queue = async () => {
      try { packs = await queuePackSend(env, rec); } catch (e) { /* never costs the note */ }
    };

    // A null item or a group named "__proto__" used to throw here, before the note.
    const byGroup = Object.create(null);
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const g = String(it.group || "Other").slice(0, 60);
      const l = String(it.label || "").slice(0, 80);
      if (!l) continue;
      (byGroup[g] = byGroup[g] || []).push(l);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    let body = `SWITCH CHECKLIST  ${stamp}\n`;
    body += `Score ${score}   |   ${count} products they already buy elsewhere\n`;
    for (const g of Object.keys(byGroup)) {
      body += `\n${g}\n`;
      for (const l of byGroup[g]) body += `  - ${l}\n`;
    }
    if (!items.length) body += "\nNothing was selected.\n";
    body = body.slice(0, 8000);

    try {
      const r0 = await fetch(`${GHL}/contacts/${contactId}/notes`, {
        headers: {
          Authorization: `Bearer ${env.GHL_TOKEN}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      });
      if (r0.ok) {
        const j0 = await r0.json();
        // Only the SAME list is a duplicate (a refresh, or the back button re-running the
        // score page). A different list the same day is her going back to add what she
        // forgot, and that one must be filed, or the note shows the short list forever.
        // Changed 2026-10-20; before, any checklist note that day blocked the next one.
        // Compared with tags and all whitespace removed, in case GHL stores the note
        // with <br> or different line breaks than were sent.
        const norm = (t) => String(t || "").replace(/<[^>]*>/g, "").replace(/\s+/g, "");
        const already = ((j0 && j0.notes) || []).some((x) =>
          norm(x.body) === norm(body) &&
          String(x.dateAdded || "").slice(0, 10) === stamp);
        if (already) {
          await queue();
          await markLog(env, logKey, { outcome: "duplicate, already filed today", packs });
          return json({ ok: true, saved: true, duplicate: true, packs }, 200, origin);
        }
      }
    } catch (e) { /* if the check fails, go ahead and file it. */ }

    let res;
    try {
      res = await fetch(`${GHL}/contacts/${contactId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GHL_TOKEN}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ body }),
      });
    } catch (e) {
      await queue();
      await markLog(env, logKey, { outcome: "fetch threw: " + String(e && e.message || e), packs });
      return json({ ok: false, saved: false, reason: "network", packs }, 200, origin);
    }

    if (!res.ok) {
      const detail = await res.text();
      console.log("GHL note failed", res.status, detail.slice(0, 300));
      await queue();
      await markLog(env, logKey, {
        outcome: "GHL " + res.status,
        detail: detail.slice(0, 300),
        packs,
      });
      return json({ ok: false, saved: false, status: res.status, packs }, 200, origin);
    }

    const out = await res.json();
    const noteId = (out && out.note && out.note.id) || null;
    await queue();
    await markLog(env, logKey, { saved: true, outcome: "saved", note_id: noteId, packs });
    return json({ ok: true, saved: true, noteId, packs }, 200, origin);
  },

  // Every 5 minutes. A few minutes after she finishes the list she gets the text, which
  // reads more like Shannon actually looked at it than an instant reply would.
  async scheduled(event, env, ctx) {
    // Two crons (2026-10-22): the packs queue every 5 minutes, and the SEND TOUR LINK notes
    // on their own schedule so neither eats the other's subrequest budget.
    if (event && event.cron === TOUR_NOTE_CRON) { ctx.waitUntil(ensureTourNotes(env)); return; }
    ctx.waitUntil(processQueue(env));
  },
};
