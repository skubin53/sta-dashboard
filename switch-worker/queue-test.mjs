// queue-test.mjs  -  run the REAL worker.js against a fake KV and a fake GHL.
//
//   python build.py && node queue-test.mjs
//
// Added 2026-10-20 with the tour-mode changes. Proves, without touching anything live:
//   - the POST answers with `packs` (queued / pending / sent-before / no-packs / no-id)
//   - ONE text per contact, ever, however many times she submits
//   - a newer list replaces an unsent one ("queued" or "blocked"), never a built or sent one
//   - a row blocked AT the send step stays locked (fail closed)
//   - a stop-tagged contact is blocked again after a resubmit
//   - only an identical list counts as a duplicate note
//   - the cron reaches rows past the first page of keys, and skips finished ones by metadata
//   - (10/24) one run builds AND sends (was two runs, up to 10 min); capped at 8 a run
import worker from "file:///C:/Users/skubi/sta-tools/cf-worker/worker.js";

class KV {
  constructor() { this.m = new Map(); this.reads = 0; }
  async get(k, t) { this.reads++; const v = this.m.get(k); if (v === undefined) return null; return t === "json" ? JSON.parse(v.v) : v.v; }
  async put(k, v, o) {
    // rate: real Cloudflare KV answers 429 to a second write of one key inside a second
    const now = Date.now(); this.last = this.last || new Map();
    if (this.rate && this.last.has(k) && now - this.last.get(k) < 1000) throw new Error("KV PUT failed: 429 Too Many Requests");
    if (this.failOnce && this.failOnce(k, String(v))) { this.failOnce = null; throw new Error("KV PUT failed: 429 Too Many Requests"); }
    this.last.set(k, now);
    this.m.set(k, { v: String(v), meta: (o && o.metadata) || null });
  }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = "", limit = 1000, cursor }) {
    const keys = [...this.m.keys()].filter((k) => k.startsWith(prefix)).sort();
    const start = cursor ? parseInt(cursor, 10) : 0;
    const page = keys.slice(start, start + limit);
    const done = start + limit >= keys.length;
    return { keys: page.map((n) => ({ name: n, metadata: this.m.get(n).meta || undefined })),
             list_complete: done, cursor: done ? undefined : String(start + limit) };
  }
}

const contacts = {};          // id -> contact
const notes = {};             // id -> [{body,dateAdded}]
const sms = [];               // {contactId, message}
const failSend = new Set();   // ids whose SMS POST returns 500
const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); const m = (init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  let r;
  if ((r = u.pathname.match(/^\/contacts\/([^/]+)\/notes$/))) {
    const id = r[1]; notes[id] = notes[id] || [];
    if (m === "GET") return ok({ notes: notes[id] });
    notes[id].push({ body: body.body, dateAdded: new Date().toISOString() });
    return ok({ note: { id: "n" + notes[id].length } });
  }
  if (u.pathname === "/contacts/search" && m === "POST") {
    const id = body.filters[0].value; const c = contacts[id];
    return ok({ contacts: c ? [c] : [] });
  }
  if (u.pathname === "/conversations/messages" && m === "POST") {
    if (failSend.has(body.contactId)) return new Response("{\"err\":1}", { status: 500 });
    sms.push(body); return ok({ messageId: "m" + sms.length });
  }
  return new Response("nf", { status: 404 });
};

const kv = new KV();
const env = { REPORTS: kv, GHL_TOKEN: "t", GHL_LOCATION: "loc", SEND_MODE: "live", LOG_KEY: "k" };
const ORIGIN = "https://scan.ismyhometoxic.com";
async function post(id, labels, score) {
  const req = new Request("https://packs.ismyhometoxic.com/", { method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ contact_id: id, score, count: labels.length,
      items: labels.map((l) => ({ group: "Test", label: l })), stores: [], storesOther: "" }) });
  return await (await worker.fetch(req, env, { waitUntil() {} })).json();
}
async function tick() { const ps = []; await worker.scheduled({}, env, { waitUntil: (p) => ps.push(p) }); return Promise.all(ps); }
const row = async (id) => kv.get("packsend:" + id, "json");
function person(id, extra) { contacts[id] = Object.assign({ id, firstName: "Test", phone: "+15555550100", tags: [], dnd: false }, extra || {}); }

const FULL = ["Shampoo", "Conditioner", "Body wash", "Hand soap", "Deodorant", "Toothpaste", "Laundry detergent",
  "Dryer sheets", "Dish soap", "Dishwasher detergent", "All-purpose cleaner", "Glass cleaner", "Toilet bowl cleaner",
  "Multivitamin / Minerals", "Magnesium", "Vitamin D3", "Coffee", "Pain relief tablets", "Protein Bars", "Body lotion"];
const MORE = FULL.concat(["Mouthwash", "Fabric softener", "Floor cleaner", "Antioxidants"]);

let fails = 0;
function check(name, cond, detail) { console.log((cond ? "  PASS  " : "  FAIL  ") + name + (cond ? "" : "   " + JSON.stringify(detail))); if (!cond) fails++; }

// 1-5: the happy path, the replay lock and replacement
const A = "AaaaaaaaaaaaaaaaaaaA"; person(A);
let r = await post(A, FULL, 120);
check("valid list -> packs queued, note saved", r.packs === "queued" && r.saved === true, r);
check("row carries state metadata", (kv.m.get("packsend:" + A).meta || {}).state === "queued", kv.m.get("packsend:" + A).meta);
r = await post(A, FULL, 120);
check("same list again (refresh) -> duplicate note, still queued", r.duplicate === true && r.packs === "queued", r);
check("only one note so far", notes[A].length === 1, notes[A].length);
r = await post(A, MORE, 140);
check("longer list while unsent -> replaces row", r.packs === "queued" && (await row(A)).items.length === MORE.length, r);
check("different list same day -> second note filed", notes[A].length === 2, notes[A].length);
await tick();
check("ONE tick builds the page AND sends exactly one text (10/24: was two ticks, up to 10 min)", (await row(A)).state === "sent" && sms.length === 1 && /packs\.ismyhometoxic\.com/.test(sms[0].message), { st: (await row(A)).state, n: sms.length });
check("...after a page check: the text's link is a page stored for her", !!(await kv.get("packpage:" + (await row(A)).slug, "json")), (await row(A)).slug);
// a row already "ready" (built on an earlier run) is not replaced by a new list
const K = "KkkkkkkkkkkkkkkkkkkkK"; person(K);
await post(K, FULL, 120);
const kr = await row(K); kr.state = "ready";
await kv.put("packsend:" + K, JSON.stringify(kr), { metadata: { state: "ready" } });
r = await post(K, MORE, 140);
check("submit while ready -> pending, row untouched", r.packs === "pending" && (await row(K)).items.length === FULL.length, r);
r = await post(A, MORE, 140);
check("after sent -> sent-before, no new row", r.packs === "sent-before" && (await row(A)).state === "sent", r);
await tick(); await tick();
check("still exactly one text after more ticks", sms.length === 1, sms.length);

// 6: stop tag blocks, resubmit is blocked again
const B = "BbbbbbbbbbbbbbbbbbbB"; person(B, { tags: ["Not Interested"] });
await post(B, FULL, 120); await tick();
check("stop-tagged contact blocked", (await row(B)).state === "blocked", (await row(B)).state);
r = await post(B, FULL, 120);
check("resubmit of blocked row -> queued again", r.packs === "queued", r);
await tick(); await tick();
check("stop-tagged contact blocked again, never texted", (await row(B)).state === "blocked" && !sms.some((s) => s.contactId === B), (await row(B)).state);

// 7: a list that cannot make a package writes no row, then a full list queues
const C = "CcccccccccccccccccccC"; person(C);
r = await post(C, ["Shampoo"], 6);
check("too-short list -> no-packs, no row", r.packs === "no-packs" && (await row(C)) === null && r.saved === true, r);
r = await post(C, FULL, 120);
check("then a full list -> queued", r.packs === "queued", r);

// 8: bad id
r = await post("short", FULL, 120);
check("invalid id -> no-id", r.packs === "no-id" && r.saved === false, r);

// 9: send fails at the send step -> locked like sent
const D = "DdddddddddddddddddddD"; person(D); failSend.add(D);
await post(D, FULL, 120); await tick(); await tick();
check("GHL refused the text -> blocked with send_started", (await row(D)).state === "blocked" && !!(await row(D)).send_started, await row(D));
failSend.delete(D);
r = await post(D, FULL, 120); await tick(); await tick();
check("resubmit after a send attempt -> sent-before, never a second try", r.packs === "sent-before" && !sms.some((s) => s.contactId === D), r);

// 10: pagination and metadata skip
for (let i = 0; i < 1500; i++) {
  const id = "E" + String(i).padStart(19, "0");
  await kv.put("packsend:" + id, JSON.stringify({ contact_id: id, state: "sent" }), { metadata: { state: "sent" } });
}
for (let i = 0; i < 5; i++) {   // old rows written before metadata existed
  const id = "F" + String(i).padStart(19, "0");
  await kv.put("packsend:" + id, JSON.stringify({ contact_id: id, state: "sent" }));
}
const Z = "ZzzzzzzzzzzzzzzzzzzZ"; person(Z);
await post(Z, FULL, 120);
const before = kv.reads; await tick();
check("row past the first 1000 keys is reached and sent in that run", (await row(Z)).state === "sent", (await row(Z)).state);
check("finished rows skipped without reads (metadata)", kv.reads - before < 100, kv.reads - before);

// 11: round-2 fixes (2026-10-20, from the adversarial review)
// a stale read that writes "queued" back over a sent row must never text twice
const G = "GgggggggggggggggggggG"; person(G);
await post(G, FULL, 120); await tick(); await tick();
const sentBefore = sms.filter((s) => s.contactId === G).length;
const stale = await row(G); stale.state = "queued"; delete stale.send_started;
await kv.put("packsend:" + G, JSON.stringify(stale), { metadata: { state: "queued" } });
await tick(); await tick();
check("row overwritten to queued after a send -> send lock blocks a second text",
  sentBefore === 1 && sms.filter((s) => s.contactId === G).length === 1 && (await row(G)).state === "blocked",
  { sentBefore, now: sms.filter((s) => s.contactId === G).length, st: (await row(G)).state });
r = await post(G, MORE, 140);
check("POST after the lock exists -> sent-before", r.packs === "sent-before", r);
// a shorter second list while queued only ADDS
const H = "HhhhhhhhhhhhhhhhhhhhH"; person(H);
await post(H, FULL, 120);
r = await post(H, ["Laundry detergent", "Collagen (Types I, II & III)", "Digestive Enzymes", "Magnesium"], 30);
check("short second list merges into the full one", r.packs === "queued" && (await row(H)).items.length === FULL.length + 2, (await row(H)).items.length);
// an unbuildable second list while queued -> pending, row untouched
r = await post(H, ["Shampoo"], 6);
check("unbuildable second list while queued -> pending", r.packs === "pending" || r.packs === "queued", r);
// an August dry-run row (would_have_sent) is locked like sent
const I = "IiiiiiiiiiiiiiiiiiiiI"; person(I);
await kv.put("packsend:" + I, JSON.stringify({ contact_id: I, state: "blocked", would_have_sent: "hi", items: [] }));
r = await post(I, FULL, 120); await tick(); await tick();
check("dry-run row -> sent-before, never auto texted", r.packs === "sent-before" && !sms.some((s) => s.contactId === I), r);
// hostile items never cost the note
const J = "JjjjjjjjjjjjjjjjjjjjJ"; person(J);
const reqJ = new Request("https://packs.ismyhometoxic.com/", { method: "POST",
  headers: { Origin: ORIGIN, "Content-Type": "text/plain;charset=UTF-8" },
  body: JSON.stringify({ contact_id: J, score: 120, count: 3, items: [null, { group: "__proto__", label: "Shampoo" }].concat(FULL.map((l) => ({ group: "T", label: l }))) }) });
r = await (await worker.fetch(reqJ, env, { waitUntil() {} })).json();
check("null item and __proto__ group -> note still filed", r.saved === true && (notes[J] || []).length === 1, r);

// 12: the same-run send is capped at 8 rows a run; the rest go out on the next run (10/24)
const many = [];
for (let i = 0; i < 11; i++) { const id = "M" + String(i).padStart(19, "0"); person(id); many.push(id); await post(id, FULL, 120); }
const n0 = sms.length;
await tick();
const sentNow = sms.length - n0;
const waiting = many.filter((id) => !sms.some((s) => s.contactId === id)).length;
check("a busy run texts at most 8 (built + sent); the rest are built and wait", sentNow === 8 && waiting >= 3, { sentNow, waiting });
await tick();
const sentAll = many.filter((id) => sms.some((s) => s.contactId === id)).length;
check("...the other 3 go out on the next run, each exactly once", sentAll === 11 && many.every((id) => sms.filter((s) => s.contactId === id).length === 1), sentAll);
// a stop tag added between building and sending still blocks the same-run send
const S = "SsssssssssssssssssssS"; person(S);
await post(S, FULL, 120);
let looked = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = new URL(url);
  if (u.pathname === "/contacts/search" && JSON.parse(init.body).filters[0].value === S && ++looked === 2) {
    contacts[S].tags = ["not interested"];
  }
  return realFetch(url, init);
};
await tick();
globalThis.fetch = realFetch;
check("opted out between build and send in the same run -> blocked, no text", (await row(S)).state === "blocked" && !sms.some((s) => s.contactId === S), (await row(S)).state);

// 13: real KV refuses a second write to one key inside a second (review 10/24). The run builds,
// pauses, then sends, so the text still goes out, the row says "sent" and her note is filed.
kv.rate = true;
const R = "RrrrrrrrrrrrrrrrrrrrR"; person(R);
await post(R, FULL, 120);
await new Promise((res) => setTimeout(res, 1100));
const nR = sms.length;
await tick();
check("with KV's one-write-a-second limit: one run builds, sends once, records sent, files the note",
  (await row(R)).state === "sent" && sms.length === nR + 1 && (notes[R] || []).some((n) => /THREE PACKS TEXT SENT/.test(n.body)),
  { st: (await row(R)).state, n: sms.length - nR });
kv.rate = false;
// a refused "sending" write leaves NO lock and no text; the next run sends her once
const Y = "YyyyyyyyyyyyyyyyyyyyY"; person(Y);
await post(Y, FULL, 120);
kv.failOnce = (k, v) => k === "packsend:" + Y && v.indexOf('"state":"sending"') >= 0;
const nY = sms.length;
await tick();
check("'sending' write refused -> no text, no send lock, row still ready",
  sms.length === nY && !(await kv.get("packlock:" + Y)) && (await row(Y)).state === "ready", { st: (await row(Y)).state, lock: await kv.get("packlock:" + Y) });
await tick();
check("...and the next run texts her exactly once", (await row(Y)).state === "sent" && sms.filter((s) => s.contactId === Y).length === 1, (await row(Y)).state);
// a run while another holds the run lock does nothing
await kv.put("packrun:lock", "x");
const Q = "QqqqqqqqqqqqqqqqqqqqQ"; person(Q);
await post(Q, FULL, 120);
await tick();
check("a run while another is going does nothing", (await row(Q)).state === "queued", (await row(Q)).state);
await kv.delete("packrun:lock");
await tick();
check("...the next run sends it", (await row(Q)).state === "sent", (await row(Q)).state);

console.log(fails ? "\n  " + fails + " FAILED" : "\n  all passed, " + sms.length + " texts total");
process.exit(fails ? 1 : 0);
