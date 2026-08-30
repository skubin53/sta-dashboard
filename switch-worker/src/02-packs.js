
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
