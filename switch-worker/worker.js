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
  "Cleaning wipes": [["Tough & Tender Wipes", 2, 4.29], ["Clear Power Glass Wipes", 2, 4.29]],
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
};

// A gift is offered ONLY when that category is one she actually ticked.
const GIFTS = [
  ["Magnesium", "Mela-Out Magnesium", 11, 24.59],
  ["Coffee", "Mountain Cabin Coffee", 5, 11.49],
];


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

function candidates(items) {
  const out = [];
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    let lab;
    if (it && typeof it === "object") lab = it.label;
    else lab = it;
    if (typeof lab !== "string") continue;
    const prods = Object.prototype.hasOwnProperty.call(PRODUCT_MAP, lab)
      ? PRODUCT_MAP[lab] : null;
    if (!Array.isArray(prods)) continue;
    for (const p of prods) {
      out.push({ label: lab, name: p[0], pts: p[1], usd: p[2] });
    }
  }
  return out;
}

// Python's tuple comparison on (count, fresh, negCost), element by element.
function better(a, b) {
  if (a.cnt !== b.cnt) return a.cnt > b.cnt;
  if (a.fresh !== b.fresh) return a.fresh > b.fresh;
  return a.negcost > b.negcost;
}

function pickPackage(pool, usedNames, usedLabels) {
  const byLabel = new Map();
  for (const p of pool) {
    if (usedNames.has(p.name) || usedLabels.has(p.label)) continue;
    if (!byLabel.has(p.label)) byLabel.set(p.label, []);
    byLabel.get(p.label).push(p);
  }
  // Python: labels = sorted(by_label). Codepoint order, stated explicitly.
  const labels = Array.from(byLabel.keys()).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

  let best = new Map();
  best.set(0, { cnt: 0, fresh: 0, negcost: 0.0, picks: [] });

  for (const lab of labels) {
    const nxt = new Map(best);
    for (const [pts, st] of best) {
      for (const prod of byLabel.get(lab)) {
        const np = pts + prod.pts;
        if (np > TARGET) continue;
        // One product can serve two categories: Tough & Tender Wipes is both the
        // all-purpose cleaner and the cleaning wipes. Without this, ticking both puts
        // the same jar in one package twice on two different lines. usedLabels only
        // stops repeats BETWEEN packages; this stops them inside one.
        let dup = false;
        for (const p of st.picks) { if (p.name === prod.name) { dup = true; break; } }
        if (dup) continue;
        const cand = {
          cnt: st.cnt + 1,
          fresh: st.fresh + 1,
          negcost: st.negcost - prod.usd,
          picks: st.picks.concat([prod]),
        };
        const cur = nxt.get(np);
        if (cur === undefined || better(cand, cur)) nxt.set(np, cand);
      }
    }
    best = nxt;
  }
  const hit = best.get(TARGET);
  return hit ? hit.picks : null;
}

function giftsFor(items) {
  const ticked = new Set();
  if (Array.isArray(items)) {
    for (const it of items) {
      let lab;
      if (it && typeof it === "object") lab = it.label;
      else lab = it;
      if (typeof lab === "string") ticked.add(lab);
    }
  }
  const out = [];
  for (const [lab, name, pts, usd] of GIFTS) {
    if (ticked.has(lab)) out.push({ label: lab, name, pts, usd });
  }
  return out;
}

function buildPacks(items, n) {
  n = n || 3;
  let pool = candidates(items);
  const gifts = giftsFor(items);
  const giftLabels = new Set(gifts.map((g) => g.label));
  pool = pool.filter((p) => !giftLabels.has(p.label));

  const packs = [];
  const usedNames = new Set();
  const usedLabels = new Set();
  for (let i = 0; i < n; i++) {
    const pk = pickPackage(pool, usedNames, usedLabels);
    if (!pk || !pk.length) break;
    packs.push(pk);
    for (const p of pk) { usedNames.add(p.name); usedLabels.add(p.label); }
  }
  return { packs, gifts };
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

function renderPage(rec, packs, gifts) {
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
    const giftNote = gifts.length === 1
      ? "yours free with your first order"
      : "choose one of these free with your first order";
    for (const g of gifts) {
      rows += '<tr class="free"><td class="n">' + esc(g.name) + "<small>" +
              esc(g.label) + " &middot; " + giftNote + '</small></td><td class="p">' +
              g.pts + '</td><td class="c">FREE</td></tr>';
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
    "<title>Your Three Packs</title>\n<style>\n" + PAGE_CSS + "\n</style>\n</head>\n<body>\n" +
    '<header><div class="wrap">\n <h1>' + esc(headline(first, packs.length)) +
    "</h1>\n <p>Built from your Switch Checklist, " + esc(prettyDate(rec.at)) + "</p>\n" +
    (sub ? ' <div class="meta">' + sub + "</div>\n" : "") +
    "</div></header>\n" +
    '<div class="wrap">\n' + secs.join("\n") + "\n" +
    '<p class="foot">These are things you buy anyway. Same shelf, better quality, and the ' +
    "price you see is what you pay. 90 day money back guarantee, and you can cancel any " +
    "time.</p>\n" +
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
  ".foot{margin:34px 0 0;color:var(--muted);font-size:.93em;border-top:1px solid var(--line);padding-top:16px}",
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

async function readRow(env, contactId) {
  return await env.REPORTS.get("packsend:" + contactId, "json");
}

async function writeRow(env, row) {
  await env.REPORTS.put("packsend:" + row.contact_id, JSON.stringify(row),
                        { expirationTtl: LOG_TTL });
}

/**
 * Called from the public POST. Writes a row and nothing else. Never sends.
 * Keyed on the contact id, so replaying the POST a thousand times makes one row.
 */
async function queuePackSend(env, sub) {
  if (!env || !env.REPORTS) return;
  if (!sub.contact_id || !Array.isArray(sub.items) || !sub.items.length) return;
  const existing = await readRow(env, sub.contact_id);
  if (existing) return;                       // the replay lock
  await writeRow(env, {
    contact_id: sub.contact_id,
    at: sub.at,
    score: sub.score,
    count: sub.count,
    items: sub.items,
    state: "queued",
    attempts: 0,
    history: [{ at: sub.at, what: "queued from checklist submission" }],
  });
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
      await block(env, row, ["nothing she ticked can make a 35 point package"]);
      return "blocked:no-packs";
    }
    for (const pk of built.packs) {
      let t = 0;
      for (const p of pk) t += p.pts;
      if (t !== TARGET) {
        await block(env, row, ["built a package worth " + t + " points, not " + TARGET]);
        return "blocked:bad-total";
      }
    }

    row.first_name = contact.firstName || "";
    const slug = await allocateSlug(env, row.contact_id, row.first_name);
    const html = renderPage(row, built.packs, built.gifts);
    await env.REPORTS.put("packpage:" + slug, JSON.stringify({
      html, contact_id: row.contact_id, at: new Date().toISOString(),
    }), { expirationTtl: LOG_TTL });

    row.slug = slug;
    row.url = PACK_HOST + "/" + slug;
    row.packs = built.packs.length;
    row.gifts = built.gifts.map(function (g) { return g.name; });
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

    const message = SMS_BODY.replace("__URL__", row.url);

    if (mode !== "live") {
      row.state = "blocked";
      row.blocked_because = ["SEND_MODE is " + mode + ", nothing was sent"];
      row.would_have_sent = message;
      note(row, "DRY RUN, would have texted " + (contact.phone || "?"));
      await writeRow(env, row);
      return "dryrun";
    }

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
  const list = await env.REPORTS.list({ prefix: "packsend:", limit: 200 });
  for (const k of list.keys) {
    const row = await env.REPORTS.get(k.name, "json");
    if (!row) continue;
    if (row.state === "sent" || row.state === "blocked" || row.state === "sending") continue;
    try {
      out.push(row.contact_id + "=" + (await stepRow(env, row)));
    } catch (e) {
      out.push(row.contact_id + "=threw:" + String((e && e.message) || e).slice(0, 80));
    }
  }
  return { handled: out.length, results: out };
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

    // ---------------------------------------------------------------- the log
    if (request.method === "GET" && url.pathname === "/log") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
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
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
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

    // Run the queue by hand. Same code the cron runs, no shortcuts, same guards.
    if (request.method === "GET" && url.pathname === "/packrun") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
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
    const items = Array.isArray(data.items) ? data.items : [];

    const rec = {
      at: new Date().toISOString(),
      contact_id: contactId || null,
      score,
      count,
      items,
      origin,
      saved: false,
      outcome: "pending",
    };
    const logKey = await logSubmission(env, rec);

    if (!ID_OK.test(contactId)) {
      await markLog(env, logKey, { outcome: "no valid contact id" });
      return json({ ok: false, saved: false, reason: "no valid contact id" }, 200, origin);
    }

    // Queue the packs page and the text. Writes one row and returns. Sends nothing.
    // Wrapped so that a queue problem can never cost her the score note below.
    try {
      await queuePackSend(env, rec);
    } catch (e) { /* the note is the job that must not fail */ }

    const byGroup = {};
    for (const it of items) {
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
        const already = ((j0 && j0.notes) || []).some((x) =>
          String(x.body || "").toUpperCase().indexOf("SWITCH CHECKLIST") >= 0 &&
          String(x.dateAdded || "").slice(0, 10) === stamp);
        if (already) {
          await markLog(env, logKey, { outcome: "duplicate, already filed today" });
          return json({ ok: true, saved: true, duplicate: true }, 200, origin);
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
      await markLog(env, logKey, { outcome: "fetch threw: " + String(e && e.message || e) });
      return json({ ok: false, saved: false, reason: "network" }, 200, origin);
    }

    if (!res.ok) {
      const detail = await res.text();
      console.log("GHL note failed", res.status, detail.slice(0, 300));
      await markLog(env, logKey, {
        outcome: "GHL " + res.status,
        detail: detail.slice(0, 300),
      });
      return json({ ok: false, saved: false, status: res.status }, 200, origin);
    }

    const out = await res.json();
    const noteId = (out && out.note && out.note.id) || null;
    await markLog(env, logKey, { saved: true, outcome: "saved", note_id: noteId });
    return json({ ok: true, saved: true, noteId }, 200, origin);
  },

  // Every 5 minutes. A few minutes after she finishes the list she gets the text, which
  // reads more like Shannon actually looked at it than an instant reply would.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processQueue(env));
  },
};
