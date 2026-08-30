
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

// Python's tuple comparison on (count, fresh, negCost), element by element.
function better(a, b) {
  if (a.cnt !== b.cnt) return a.cnt > b.cnt;
  if (a.fresh !== b.fresh) return a.fresh > b.fresh;
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
  let start = { cnt: 0, fresh: 0, negcost: 0.0, picks: [] };
  if (force) {
    if (usedNames.has(force.name) || usedLabels.has(force.label)) return null;
    byLabel.delete(force.label);
    start = { cnt: 1, fresh: 1, negcost: -force.usd, picks: [force] };
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
