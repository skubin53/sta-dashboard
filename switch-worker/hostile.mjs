// hostile.mjs  -  throw junk at buildPacks the way the open internet will.
//
// The checklist POST is unauthenticated, so `items` is attacker controlled. Anything
// here that throws would take out the note-writing that shares the same request, and
// anything that hangs would burn the Worker's CPU limit. Neither is allowed.
//
//   node hostile.mjs

const mod = await import("file:///C:/Users/skubi/sta-tools/cf-worker/packs-test.mjs");
const { buildPacks } = mod;

const big = [];
for (let i = 0; i < 20000; i++) big.push({ label: "Shampoo" });

const deep = { label: "Shampoo" };
let cur = deep;
for (let i = 0; i < 2000; i++) { cur.next = { label: "x" }; cur = cur.next; }

const cyclic = { label: "Shampoo" };
cyclic.self = cyclic;

const CASES = [
  ["null", null],
  ["undefined", undefined],
  ["a string not an array", "Shampoo"],
  ["a number", 42],
  ["an object not an array", { label: "Shampoo" }],
  ["array of nulls", [null, null, undefined]],
  ["array of numbers", [1, 2, 3]],
  ["array of arrays", [["Shampoo"], ["Conditioner"]]],
  ["label is a number", [{ label: 5 }]],
  ["label is an object", [{ label: { toString: () => "Shampoo" } }]],
  ["label is an array", [{ label: ["Shampoo"] }]],
  ["label null", [{ label: null }]],
  ["no label key", [{ group: "x" }]],
  ["__proto__ as label", [{ label: "__proto__" }]],
  ["constructor as label", [{ label: "constructor" }]],
  ["prototype as label", [{ label: "prototype" }]],
  ["toString as label", [{ label: "toString" }]],
  ["hasOwnProperty as label", [{ label: "hasOwnProperty" }]],
  ["very long label", [{ label: "A".repeat(500000) }]],
  ["non ascii label", [{ label: "\u0428\u0430\u043c\u043f\u0443\u043d\u044c" }]],
  ["emoji label", [{ label: "\ud83d\ude00\ud83e\uddf4" }]],
  ["20000 duplicate items", big],
  ["deeply nested object", [deep]],
  ["cyclic object", [cyclic]],
  ["getter that throws", [{ get label() { throw new Error("boom"); } }]],
  ["frozen array", Object.freeze([{ label: "Shampoo" }])],
  ["sparse array", (() => { const a = []; a[5] = { label: "Shampoo" }; return a; })()],
  ["every real label x50", (() => {
    const out = [];
    for (let i = 0; i < 50; i++) {
      for (const k of Object.keys(mod.PRODUCT_MAP)) out.push({ label: k });
    }
    return out;
  })()],
];

let threw = 0, slow = 0, polluted = 0, ok = 0;
const LIMIT = 2000; // ms. A Worker gets far less CPU than this.

for (const [name, input] of CASES) {
  const t0 = Date.now();
  let res = null, err = null;
  try {
    res = buildPacks(input);
  } catch (e) {
    err = e;
  }
  const ms = Date.now() - t0;

  // did anything leak onto Object.prototype?
  const dirty = ({}).polluted !== undefined || ({})["Shampoo"] !== undefined ||
                Object.prototype.hasOwnProperty.call(Object.prototype, "label");

  let badTotal = "";
  if (res && res.packs) {
    for (let i = 0; i < res.packs.length; i++) {
      const t = res.packs[i].reduce((a, b) => a + b.pts, 0);
      if (t < 35 || t > 37) badTotal += " pack" + (i + 1) + "=" + t + "pts";
    }
  }

  const flags = [];
  if (err) { flags.push("THREW " + (err.message || "").slice(0, 40)); threw++; }
  if (ms > LIMIT) { flags.push("SLOW " + ms + "ms"); slow++; }
  if (dirty) { flags.push("PROTOTYPE POLLUTED"); polluted++; }
  if (badTotal) flags.push("BAD TOTAL" + badTotal);
  if (!flags.length) ok++;

  const shape = res ? res.packs.length + " packs" : "-";
  console.log("  %s %s  %s%s",
    flags.length ? "FAIL" : "ok  ",
    name.padEnd(26),
    (shape + ", " + ms + "ms").padEnd(18),
    flags.join("; "));
}

console.log("\n  %d clean, %d threw, %d too slow, %d polluted the prototype",
            ok, threw, slow, polluted);
process.exit(threw + slow + polluted ? 1 : 0);
