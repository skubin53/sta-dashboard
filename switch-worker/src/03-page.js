
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
