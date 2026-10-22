// tour-test.mjs  -  the Send Tour Link button, run against the REAL worker.js with a fake
// KV and a fake GHL. Nothing live is touched.
//
//   python build.py && node tour-test.mjs
//
// Added 2026-10-21. Proves:
//   - wrong or missing key: 403, nothing sent
//   - TOUR_MODE off: refuses; dryrun: reports the exact text, sends nothing
//   - live: one SMS from TOUR_FROM with her words, the contact's own id in the link, a note filed
//   - "Hi there!" when the first name is blank; proper case for "jane"
//   - a double click inside a minute is ONE text
//   - DND (SMS permanent / dnd true), a stop tag, no phone: blocked, with the reason
//   - an id GHL does not return, or a bad id: nothing sent
//   - GHL refusing the SMS: reported, no note
//   - the hourly cap holds, and the GET window page is served (not swallowed as a packs slug)
import worker from "file:///C:/Users/skubi/sta-tools/cf-worker/worker.js";

class KV {
  constructor() { this.m = new Map(); this.failGet = false; }
  async get(k, t) { if (this.failGet) throw new Error("kv down"); const v = this.m.get(k); if (v === undefined) return null; return t === "json" ? JSON.parse(v) : v; }
  async put(k, v) { this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = "" }) { return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((n) => ({ name: n })), list_complete: true }; }
}

const contacts = {};
const notes = {};
const sms = [];
const failSend = new Set();
const failedStatus = new Set();   // ids whose SMS POST answers 200 with status "failed"
const searchDown = new Set();     // ids whose search answers 500
const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); const m = (init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  let r;
  if ((r = u.pathname.match(/^\/contacts\/([^/]+)\/notes$/))) {
    const id = r[1]; notes[id] = notes[id] || [];
    notes[id].push(body.body); return ok({ note: { id: "n" } });
  }
  if (u.pathname === "/contacts/search" && m === "POST") {
    const id = body.filters[0].value; const c = contacts[id];
    if (searchDown.has(id)) return new Response("{}", { status: 500 });
    return ok({ contacts: c ? [c] : [] });
  }
  if (u.pathname === "/conversations/messages" && m === "POST") {
    if (failSend.has(body.contactId)) return new Response(JSON.stringify({ message: "Landline number" }), { status: 400 });
    if (failedStatus.has(body.contactId)) return ok({ messageId: "mf", status: "failed" });
    sms.push(body); return ok({ messageId: "m" + sms.length });
  }
  return new Response("nf", { status: 404 });
};

const KEY = "K".repeat(40);
const kv = new KV();
const env = { REPORTS: kv, GHL_TOKEN: "t", GHL_LOCATION: "loc", SEND_MODE: "live", LOG_KEY: "logk",
              TOUR_MODE: "live", TOUR_KEY: KEY, TOUR_FROM: "+18665670832" };
const ctx = { waitUntil() {} };
async function press(c, k = KEY, e = env) {
  const req = new Request("https://packs.ismyhometoxic.com/tourtext", { method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify({ c, k }) });
  const res = await worker.fetch(req, e, ctx);
  return { status: res.status, ...(await res.json()) };
}

let fails = 0;
function check(name, cond, extra) { console.log((cond ? "  PASS  " : "  FAIL  ") + name + (cond ? "" : "  " + JSON.stringify(extra || ""))); if (!cond) fails++; }

const id = (s) => (s + "AAAAAAAAAAAAAAAAAAAA").slice(0, 20);
contacts[id("jane")] = { id: id("jane"), firstName: "jane", lastName: "Doe", phone: "+12085551234", tags: [] };
contacts[id("blank")] = { id: id("blank"), firstName: "", lastName: "", phone: "+12085550000", tags: [] };
contacts[id("dnd")] = { id: id("dnd"), firstName: "Dee", phone: "+12085551111", tags: [], dndSettings: { SMS: { status: "permanent", message: "STOP" } } };
contacts[id("dndall")] = { id: id("dndall"), firstName: "Al", phone: "+12085552222", tags: [], dnd: true };
contacts[id("notint")] = { id: id("notint"), firstName: "Nia", phone: "+12085553333", tags: ["Not Interested"] };
contacts[id("nophone")] = { id: id("nophone"), firstName: "Nop", phone: "", tags: [] };
contacts[id("land")] = { id: id("land"), firstName: "Lan", phone: "+12085554444", tags: [] };
failSend.add(id("land"));

// key
let r = await press(id("jane"), "wrong");
check("wrong key -> 403, nothing sent", r.status === 403 && !r.ok && sms.length === 0, r);
r = await press(id("jane"), "");
check("empty key -> 403", r.status === 403 && !r.ok, r);
r = await press(id("jane"), KEY, { ...env, TOUR_KEY: "" });
check("worker without a key refuses even an empty key", r.status === 403 && !r.ok, r);

// modes
r = await press(id("jane"), KEY, { ...env, TOUR_MODE: "off" });
check("off -> refused", !r.ok && sms.length === 0, r);
r = await press(id("jane"), KEY, { ...env, TOUR_MODE: "dryrun" });
check("dryrun -> ok+dry, exact text, nothing sent", r.ok && r.dry && sms.length === 0 &&
      r.message === "Hi Jane! Here is the link we are going over together: https://scan.ismyhometoxic.com/tour/?contact_id=" + id("jane"), r);

// live
r = await press(id("jane"));
check("live -> sent", r.ok && !r.dry && r.to === "1234" && sms.length === 1, r);
check("from the default number", sms[0] && sms[0].fromNumber === "+18665670832", sms[0]);
check("her words + this contact's id", sms[0] && sms[0].message === "Hi Jane! Here is the link we are going over together: https://scan.ismyhometoxic.com/tour/?contact_id=" + id("jane"), sms[0]);
check("note filed on the contact", (notes[id("jane")] || []).length === 1 && notes[id("jane")][0].includes("TOUR LINK TEXTED"), notes[id("jane")]);
r = await press(id("jane"));
check("double click inside a minute -> one text", !r.ok && sms.length === 1, r);

r = await press(id("blank"));
check("blank first name -> 'Hi there!'", r.ok && sms[sms.length - 1].message.startsWith("Hi there! Here is the link"), sms[sms.length - 1]);

// guards
const before = sms.length;
r = await press(id("dnd"));
check("SMS DND permanent (STOP) -> blocked with reason", !r.ok && /DND/.test((r.why || []).join(" ")) && sms.length === before, r);
r = await press(id("dndall"));
check("dnd true -> blocked", !r.ok && sms.length === before, r);
r = await press(id("notint"));
check("'not interested' tag -> blocked", !r.ok && /not interested/.test((r.why || []).join(" ")) && sms.length === before, r);
r = await press(id("nophone"));
check("no phone -> blocked", !r.ok && /no phone/.test((r.why || []).join(" ")) && sms.length === before, r);
r = await press(id("ghost"));
check("id GHL does not return -> nothing sent", !r.ok && sms.length === before, r);
r = await press("bad id!");
check("malformed id -> nothing sent", !r.ok && sms.length === before, r);
r = await press(id("land"));
check("GHL refuses the SMS -> reported, no note", !r.ok && /refused/.test((r.why || []).join(" ")) && !(notes[id("land")] || []).length, r);

// KV down -> fail closed
kv.failGet = true;
contacts[id("kvdown")] = { id: id("kvdown"), firstName: "Kay", phone: "+12085556666", tags: [] };
r = await press(id("kvdown"));
check("KV unreadable -> nothing sent", !r.ok && sms.length === before, r);
kv.failGet = false;

// hourly cap
const hk = "tourhour:" + new Date().toISOString().slice(0, 13);
await kv.put(hk, "60");
contacts[id("cap")] = { id: id("cap"), firstName: "Cap", phone: "+12085557777", tags: [] };
r = await press(id("cap"));
check("hourly cap -> nothing sent", !r.ok && sms.length === before, r);
await kv.put(hk, "0");

// review fixes 2026-10-21
r = await press(id("dnd"));
check("blocked press lifts its lock (second press gives the DND reason again)", !r.ok && /DND/.test((r.why || []).join(" ")), r);
contacts[id("dryfirst")] = { id: id("dryfirst"), firstName: "Dot", phone: "+12085558888", tags: [] };
r = await press(id("dryfirst"), KEY, { ...env, TOUR_MODE: "dryrun" });
const n0 = sms.length;
r = await press(id("dryfirst"));
check("a test press does not lock out the real press right after", r.ok && sms.length === n0 + 1, r);
contacts[id("down")] = { id: id("down"), firstName: "Dan", phone: "+12085559999", tags: [] };
searchDown.add(id("down"));
r = await press(id("down"));
check("GHL search down -> 'did not answer', link offered, nothing sent", !r.ok && /did not answer/.test((r.why || []).join(" ")) && /contact_id=/.test(r.link || "") && sms.length === n0 + 1, r);
searchDown.delete(id("down"));
r = await press(id("down"));
check("...and the lock was lifted, so the retry sends", r.ok && sms.length === n0 + 2, r);
contacts[id("fstat")] = { id: id("fstat"), firstName: "Fay", phone: "+12085550101", tags: [] };
failedStatus.add(id("fstat"));
r = await press(id("fstat"));
check("GHL answers status failed -> Not sent, link offered, no note", !r.ok && /refused/.test((r.why || []).join(" ")) && r.link && !(notes[id("fstat")] || []).length, r);
r = await press(id("land"));
check("refused text offers the link to copy", !r.ok && r.link === "https://scan.ismyhometoxic.com/tour/?contact_id=" + id("land"), r);
const names = [["MARY", "Mary"], ["JANE DOE", "Jane"], ["o'neil", "O'Neil"], ["o’neil", "O'Neil"], ["anne-marie", "Anne-Marie"],
  ["Dr. Sue", "Sue"], ["+12085551234", "there"], [".", "there"], ["mary ann", "Mary"], ["McDonald", "McDonald"], ["émilie", "Émilie"],
  ["https://spam.example", "there"], ["Aaaaaaaaaaaaaaaaaaaaaaaaa", "there"]];
let k2 = 0;
for (const [raw, want] of names) {
  const cid2 = id("nm" + (k2++));
  contacts[cid2] = { id: cid2, firstName: raw, phone: "+1208555" + String(1000 + k2), tags: [] };
  r = await press(cid2, KEY, { ...env, TOUR_MODE: "dryrun" });
  check("greeting for " + JSON.stringify(raw) + " -> Hi " + want + "!", r.ok && r.message.startsWith("Hi " + want + "! Here is"), r.message);
}
check("note time is in Mountain time", / MT\n/.test((notes[id("jane")] || [""])[0]), notes[id("jane")]);

// the window page
const page = await worker.fetch(new Request("https://packs.ismyhometoxic.com/tourtext?c=" + id("jane")), env, ctx);
const html = await page.text();
check("GET /tourtext serves the window, not a packs page", page.status === 200 && html.includes("Sending the tour link") && !html.includes(KEY), page.status);
const put = await worker.fetch(new Request("https://packs.ismyhometoxic.com/tourtext", { method: "PUT" }), env, ctx);
check("other methods -> 405", put.status === 405, put.status);

console.log(fails ? "\n  " + fails + " FAILED" : "\n  all passed, " + sms.length + " texts total");
process.exit(fails ? 1 : 0);
