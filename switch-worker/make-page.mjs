// make-page.mjs  -  build one person's packs page and print it, using the SAME renderer
// the Worker uses, so what Shannon sends by hand is identical to what the automation
// sends by itself.
//
//   node make-page.mjs <submission.json> <firstName> <slug>
//
// Prints JSON: {slug, html, packs, gifts, totals}. Writes nothing anywhere.
import { readFileSync } from "node:fs";

const [subPath, firstName, slug] = process.argv.slice(2);
const mod = await import("file:///C:/Users/skubi/sta-tools/cf-worker/packs-test.mjs");

const sub = JSON.parse(readFileSync(subPath, "utf8"));
const built = mod.buildPacks(sub.items);

const rec = {
  first_name: firstName,
  at: sub.at,
  score: sub.score,
  count: sub.count,
};
const html = mod.renderPage(rec, built.packs);

const totals = built.packs.map((pk) => ({
  items: pk.length,
  pts: pk.reduce((a, b) => a + b.pts, 0),
  usd: Math.round(pk.reduce((a, b) => a + b.usd, 0) * 100) / 100,
  dupes: pk.length - new Set(pk.map((p) => p.name)).size,
}));

process.stdout.write(JSON.stringify({
  slug,
  html,
  packs: built.packs.map((pk) => pk.map((p) => [p.name, p.label, p.pts, p.usd])),
  totals,
}));
