// Runs the Worker's own buildPacks over a set of cases and prints JSON.
// Called by parity.py. Kept as a real file rather than an inline -e string, because
// escaping a multi-line script through two languages is how typos get introduced.
import { readFileSync } from "node:fs";

const casesPath = process.argv[2];
const modPath = process.argv[3];

const m = await import(modPath);
const cases = JSON.parse(readFileSync(casesPath, "utf8"));

const out = {};
for (const [name, labels] of Object.entries(cases)) {
  const r = m.buildPacks(labels.map((l) => ({ label: l })));
  out[name] = {
    packs: r.packs.map((pk) =>
      pk.map((p) => [p.name, p.label, p.pts, Math.round(p.usd * 100) / 100])),
    gifts: r.gifts.map((g) => [g.name, g.label, g.pts, Math.round(g.usd * 100) / 100]),
  };
}
process.stdout.write(JSON.stringify(out));
