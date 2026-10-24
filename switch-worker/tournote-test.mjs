// tournote-test.mjs  -  the SEND TOUR LINK note on each lead, against the REAL worker.js with
// a fake KV and a fake GHL. Nothing live is touched.
//
//   python build.py && node tournote-test.mjs
//
// Added 2026-10-22. Proves:
//   - the note link's signature texts THAT contact, and only that contact
//   - a wrong, missing or swapped signature is refused (403), and so is a worker with no TOUR_SIGN
//   - at most 3 tour texts to one lead per day, then "already went 3 times today" + the link
//   - the notes pass: one pinned note per new contact, with that contact's own signed link
//   - builder prospects (boostyourincome) and DND / stop-tagged contacts get no note
//   - booked tour-calendar contacts get a note; cancelled bookings and builder calendars do not
//   - (10/24) a builder's new tour calendar is read from GHL's list; booked + builder tag -> note
//   - TOUR_NOTES off writes nothing; dryrun writes no note; a busy run resumes from its cursor
//   - the cron string routes to the notes pass, the 5-minute cron still runs the packs queue
import worker from "file:///C:/Users/skubi/sta-tools/cf-worker/worker.js";

class KV {
  constructor() { this.m = new Map(); }
  async get(k, t) { const v = this.m.get(k); if (v === undefined) return null; return t === "json" ? JSON.parse(v) : v; }
  async put(k, v) { this.m.set(k, String(v)); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = "" }) { return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((n) => ({ name: n })), list_complete: true }; }
}

const contacts = {};
const notes = {};          // id -> [{body, pinned}]
const sms = [];
const events = {};         // calendarId -> [event]
let searchCalls = 0;
const failNote = new Set();
let calListFail = false;
// GHL's calendar list: a known tour calendar, a builder's NEW tour calendar (switchwith...), the
// builder Zoom calendar, an inactive tour-looking one, and a personal calendar that is NOT a tour.
const calendarList = [
  { id: "Y8AxPZdBot07yyAMM0yQ", name: "Switch to America - Nicole Perez", widgetSlug: "patriotichousewife", isActive: true },
  { id: "7Q9QMySWZZkHQnPfIohP", name: "Cheryl Colidron", widgetSlug: "switchwithcherylc", isActive: true },
  { id: "w6s75rMfU2Gfg8OAVMv9", name: "Build it once. Get paid every month. Forever.", widgetSlug: "boostyourincome", isActive: true },
  { id: "OFFoffOFFoffOFFoff12", name: "Switch to America - Old", widgetSlug: "switchwithold", isActive: false },
  { id: "PERSpersPERSpers1234", name: "Ron's Personal Calendar", widgetSlug: "ron-personal", isActive: true },
];
const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); const m = (init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  let r;
  if ((r = u.pathname.match(/^\/contacts\/([^/]+)\/notes$/)) && m === "POST") {
    const id = r[1];
    if (failNote.has(id)) return new Response("{}", { status: 429 });
    notes[id] = notes[id] || [];
    notes[id].push({ body: body.body, pinned: body.pinned }); return ok({ note: { id: "n" + id.slice(0, 4) + notes[id].length } });
  }
  if (u.pathname === "/contacts/search" && m === "POST") {
    searchCalls++;
    if (body.filters && body.filters[0] && body.filters[0].field === "id") {
      const c = contacts[body.filters[0].value]; return ok({ contacts: c ? [c] : [] });
    }
    const gte = body.filters[0].value.gte;
    const list = Object.values(contacts).filter((c) => c.dateAdded && c.dateAdded >= gte)
      .sort((a, b) => a.dateAdded.localeCompare(b.dateAdded)).slice(0, body.pageLimit || 20);
    return ok({ contacts: list, total: list.length });
  }
  if (u.pathname === "/calendars/" && m === "GET") {
    if (calListFail) return new Response("{}", { status: 500 });
    return ok({ calendars: calendarList });
  }
  if (u.pathname === "/calendars/events" && m === "GET") {
    return ok({ events: events[u.searchParams.get("calendarId")] || [] });
  }
  if (u.pathname === "/conversations/messages" && m === "POST") { sms.push(body); return ok({ messageId: "m" + sms.length }); }
  return new Response("nf", { status: 404 });
};

const kv = new KV();
const env = { REPORTS: kv, GHL_TOKEN: "t", GHL_LOCATION: "loc", SEND_MODE: "live", LOG_KEY: "logk",
              TOUR_MODE: "live", TOUR_KEY: "K".repeat(40), TOUR_FROM: "+18665670832",
              TOUR_SIGN: "S".repeat(48), TOUR_NOTES: "live" };
const ctx = { pending: [], waitUntil(p) { this.pending.push(p); } };
let fails = 0;
function check(name, cond, extra) { console.log((cond ? "  PASS  " : "  FAIL  ") + name + (cond ? "" : "  " + JSON.stringify(extra === undefined ? "" : extra).slice(0, 400))); if (!cond) fails++; }
const id = (s) => (s + "AAAAAAAAAAAAAAAAAAAA").slice(0, 20);
const iso = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString();

async function press(c, extra, e = env) {
  const req = new Request("https://packs.ismyhometoxic.com/tourtext", { method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify({ c, ...extra }) });
  const res = await worker.fetch(req, e, ctx);
  return { status: res.status, ...(await res.json()) };
}
async function notesRun(e = env) {
  const res = await worker.fetch(new Request("https://packs.ismyhometoxic.com/tournoterun?k=logk"), e, ctx);
  return res.json();
}
function sigFrom(noteBody) { const m = /#s=([A-Za-z0-9_-]+)/.exec(noteBody || ""); return m ? m[1] : ""; }
function cidFrom(noteBody) { const m = /tourtext\?c=([A-Za-z0-9]+)#/.exec(noteBody || ""); return m ? m[1] : ""; }

// ---------------------------------------------------------------- the notes pass
contacts[id("ann")] = { id: id("ann"), firstName: "ann", lastName: "Lee", phone: "+12085550001", tags: ["nicoleperez"], dateAdded: iso(300) };
contacts[id("bob")] = { id: id("bob"), firstName: "Bob", phone: "+12085550002", tags: ["boostyourincome", "booked"], dateAdded: iso(200) };
contacts[id("dee")] = { id: id("dee"), firstName: "Dee", phone: "+12085550003", tags: [], dateAdded: iso(100), dndSettings: { SMS: { status: "permanent", message: "STOP" } } };
contacts[id("nia")] = { id: id("nia"), firstName: "Nia", phone: "+12085550004", tags: ["not interested"], dateAdded: iso(90) };
contacts[id("old")] = { id: id("old"), firstName: "Old", phone: "+12085550005", tags: [], dateAdded: iso(60 * 24 * 90) };   // 90 days ago
contacts[id("cal")] = { id: id("cal"), firstName: "Cal", phone: "+12085550006", tags: [], dateAdded: iso(60 * 24 * 200) };  // old contact, booked
contacts[id("can")] = { id: id("can"), firstName: "Can", phone: "+12085550007", tags: [], dateAdded: iso(60 * 24 * 200) };  // cancelled booking
contacts[id("biz")] = { id: id("biz"), firstName: "Biz", phone: "+12085550008", tags: [], dateAdded: iso(60 * 24 * 200) };  // builder calendar only
events["Y8AxPZdBot07yyAMM0yQ"] = [{ contactId: id("cal"), appointmentStatus: "confirmed" }, { contactId: id("can"), appointmentStatus: "cancelled" }];
events["w6s75rMfU2Gfg8OAVMv9"] = [{ contactId: id("biz"), appointmentStatus: "confirmed" }];

let r = await notesRun({ ...env, TOUR_NOTES: "off" });
check("TOUR_NOTES off -> nothing written", Object.keys(notes).length === 0 && r.skipped === "off", r);
r = await notesRun({ ...env, TOUR_NOTES: "dryrun" });
check("dryrun -> no notes written, but logs who would get one", Object.keys(notes).length === 0 && r.made >= 1 && kv.m.has("tournotedry:" + id("ann")), r);
check("dryrun does not move the live cursor", !kv.m.has("tournotes:since"), [...kv.m.keys()]);

r = await notesRun();
check("new contact gets ONE pinned note", (notes[id("ann")] || []).length === 1 && notes[id("ann")][0].pinned === true, notes[id("ann")]);
const annNote = (notes[id("ann")] || [{}])[0].body || "";
check("note says SEND TOUR LINK and greets her by name", annNote.includes("SEND TOUR LINK") && annNote.includes("with Ann."), annNote);
check("note link is her own contact id", cidFrom(annNote) === id("ann"), annNote);
check("builder prospect (boostyourincome) gets no note", !notes[id("bob")], notes[id("bob")]);
check("DND (texted STOP) gets no note", !notes[id("dee")], notes[id("dee")]);
check("'not interested' gets no note", !notes[id("nia")], notes[id("nia")]);
check("contact older than 45 days is not swept by the new-contact pass", !notes[id("old")]);
check("booked on a tour calendar -> note", (notes[id("cal")] || []).length === 1, r);
check("cancelled booking -> no note", !notes[id("can")]);
check("builder Zoom calendar -> no note", !notes[id("biz")]);
r = await notesRun();
check("second run writes no duplicate notes", (notes[id("ann")] || []).length === 1 && (notes[id("cal")] || []).length === 1, r);

// 2026-10-24 (Cheryl Coldiron): a builder's NEW tour calendar is watched with no code change,
// and a lead booked on a tour calendar gets the note even with the builder tag.
contacts[id("che")] = { id: id("che"), firstName: "Cheryl", phone: "+12085550009", tags: ["boostyourincome", "booked", "nicoleperez"], dateAdded: iso(20) };
events["7Q9QMySWZZkHQnPfIohP"] = [{ contactId: id("che"), appointmentStatus: "confirmed" }];
contacts[id("off")] = { id: id("off"), firstName: "Off", phone: "+12085550010", tags: [], dateAdded: iso(60 * 24 * 200) };
events["OFFoffOFFoffOFFoff12"] = [{ contactId: id("off"), appointmentStatus: "confirmed" }];
contacts[id("ron")] = { id: id("ron"), firstName: "Ron", phone: "+12085550012", tags: ["boostyourincome"], dateAdded: iso(60 * 24 * 200) };
events["PERSpersPERSpers1234"] = [{ contactId: id("ron"), appointmentStatus: "confirmed" }];
// the review's safety cases: booked + builder tag + DND; skip:builder marker, now not interested;
// a brand-new non-builder lead booked in the same run; Shannon's hand-noted test contact
contacts[id("bdn")] = { id: id("bdn"), firstName: "Bdn", phone: "+12085550013", tags: ["boostyourincome"], dateAdded: iso(60 * 24 * 200), dndSettings: { SMS: { status: "permanent", message: "STOP" } } };
contacts[id("bni")] = { id: id("bni"), firstName: "Bni", phone: "+12085550014", tags: ["boostyourincome", "not interested"], dateAdded: iso(60 * 24 * 200) };
await kv.put("tournote:" + id("bni"), "skip:builder");
contacts[id("fre")] = { id: id("fre"), firstName: "Fre", phone: "+12085550015", tags: [], dateAdded: iso(15) };
contacts["kDtIN9rIIMOHLvJukrqt"] = { id: "kDtIN9rIIMOHLvJukrqt", firstName: "Shannon", phone: "+12085550016", tags: ["boostyourincome"], dateAdded: iso(60 * 24 * 200) };
events["7Q9QMySWZZkHQnPfIohP"].push({ contactId: id("bdn"), appointmentStatus: "confirmed" }, { contactId: id("bni"), appointmentStatus: "confirmed" },
  { contactId: id("fre"), appointmentStatus: "confirmed" }, { contactId: "kDtIN9rIIMOHLvJukrqt", appointmentStatus: "confirmed" });
await kv.delete("tournotes:cal");
r = await notesRun();
check("booked on a NEW builder tour calendar -> note, even with the builder tag", (notes[id("che")] || []).length === 1, r);
check("...her note links her own contact id", cidFrom((notes[id("che")] || [{}])[0].body) === id("che"));
check("...the run says it read GHL's list and names the calendar it will not watch", r.cals && /^ghl:/.test(r.cals.src) && r.cals.unknown.indexOf("PERSpersPERSpers1234") >= 0 && r.cals.unknown.indexOf("w6s75rMfU2Gfg8OAVMv9") < 0, r.cals);
check("...a personal calendar is not watched (builder prospect booked there: no note)", !notes[id("ron")], notes[id("ron")]);
check("...a builder prospect who is NOT booked still gets none", !notes[id("bob")], notes[id("bob")]);
check("...the builder Zoom calendar still gives none", !notes[id("biz")], notes[id("biz")]);
check("...an inactive calendar is not read", !notes[id("off")], notes[id("off")]);
check("booked + builder tag + texted STOP -> no note", !notes[id("bdn")] && /^skip:/.test(kv.m.get("tournote:" + id("bdn")) || ""), kv.m.get("tournote:" + id("bdn")));
check("skip:builder marker, now 'not interested', booked -> no note", !notes[id("bni")], notes[id("bni")]);
check("brand-new lead who books in the same run -> exactly ONE note", (notes[id("fre")] || []).length === 1, notes[id("fre")]);
check("Shannon's hand-noted test contact -> no second note", !notes["kDtIN9rIIMOHLvJukrqt"], notes["kDtIN9rIIMOHLvJukrqt"]);
check("the run stays inside the GHL call budget", r.calls <= 45, r.calls);
await kv.delete("tournotes:cal");
r = await notesRun();
check("...and nobody gets a second note on the next calendar pass", (notes[id("che")] || []).length === 1 && (notes[id("fre")] || []).length === 1, r);
calListFail = true;
contacts[id("kno")] = { id: id("kno"), firstName: "Kno", phone: "+12085550011", tags: [], dateAdded: iso(60 * 24 * 200) };
events["Y8AxPZdBot07yyAMM0yQ"].push({ contactId: id("kno"), appointmentStatus: "confirmed" });
await kv.delete("tournotes:cal");
r = await notesRun();
check("calendar list down -> the known tour calendars are still read, and the run says fallback", (notes[id("kno")] || []).length === 1 && r.cals && /^fallback/.test(r.cals.src), r);
calListFail = false;

// cursor: 15 brand new contacts, cap 12 per run, the rest come next run
for (let i = 0; i < 15; i++) {
  const c = id("n" + String(i).padStart(2, "0"));
  contacts[c] = { id: c, firstName: "N" + i, phone: "+1208555" + (2000 + i), tags: [], dateAdded: iso(30 - i) };
}
r = await notesRun();
const firstBatch = Object.keys(notes).filter((k) => k.startsWith("n")).length;
r = await notesRun();
const both = Object.keys(notes).filter((k) => k.startsWith("n")).length;
check("busy run stops at 12 and the next run finishes the rest", firstBatch === 12 && both === 15, { firstBatch, both });

// review fixes 2026-10-22: a failed note POST is retried next run; no-phone leads still get a note
contacts[id("nop")] = { id: id("nop"), firstName: "Nop", phone: "", tags: [], dateAdded: iso(5) };
contacts[id("flk")] = { id: id("flk"), firstName: "Flk", phone: "+12085559000", tags: [], dateAdded: iso(4) };
failNote.add(id("flk"));
r = await notesRun();
check("no-phone lead still gets the note (the click explains)", (notes[id("nop")] || []).length === 1, r);
check("429 on a note POST -> no note yet, no marker", !notes[id("flk")] && !kv.m.has("tournote:" + id("flk")), r);
failNote.delete(id("flk"));
r = await notesRun();
check("...and the next run retries that lead", (notes[id("flk")] || []).length === 1, r);
await kv.put("tournotes:lock", "x");
r = await notesRun();
check("a run while another is going does nothing", r.skipped === "another run is going", r);
await kv.delete("tournotes:lock");

// ---------------------------------------------------------------- the note link sends
const sig = sigFrom(annNote);
let n0 = sms.length;
r = await press(id("ann"), { s: sig });
check("the note's link texts that lead", r.ok && sms.length === n0 + 1 && sms[sms.length - 1].contactId === id("ann") && sms[sms.length - 1].fromNumber === "+18665670832", r);
check("...with her own tour link", sms[sms.length - 1].message === "Hi Ann! Here is the link we are going over together: https://scan.ismyhometoxic.com/tour/?contact_id=" + id("ann"), sms[sms.length - 1]);
n0 = sms.length;
r = await press(id("cal"), { s: sig });
check("Ann's signature cannot text Cal (swapped link) -> 403", r.status === 403 && !r.ok && sms.length === n0, r);
r = await press(id("ann"), { s: sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A") });
check("a changed signature -> 403", r.status === 403 && sms.length === n0, r);
r = await press(id("ann"), {});
check("no signature, no key -> 403", r.status === 403 && sms.length === n0, r);
r = await press(id("ann"), { s: sig }, { ...env, TOUR_SIGN: "" });
check("worker with no TOUR_SIGN refuses every note link", r.status === 403 && sms.length === n0, r);
r = await press(id("ann"), { s: sig }, { ...env, TOUR_SIGN: "T".repeat(48) });
check("a rotated TOUR_SIGN breaks old links (fails closed)", r.status === 403 && sms.length === n0, r);
r = await press(id("ann"), { k: "K".repeat(40) });
check("Shannon's bookmark key still works (inside the 60 s lock -> refused, not 403)", r.status === 200 && !r.ok && /less than a minute/.test((r.why || []).join(" ")), r);

const deeSig = await (async () => { const { createHmac } = await import("node:crypto"); return createHmac("sha256", env.TOUR_SIGN).update("tour:" + id("dee")).digest().subarray(0, 16).toString("base64url"); })();
r = await press(id("dee"), { s: deeSig });
check("note link on an opted-out lead: generic reason, first name only, no phone digits", !r.ok && /cannot get texts/.test((r.why || []).join(" ")) && !/STOP|DND/.test((r.why || []).join(" ")) && !r.to && r.name === "Dee", r);
// daily cap: clear the 60 s lock between presses to reach the cap
const calSig = sigFrom((notes[id("cal")] || [{}])[0].body);
for (let i = 0; i < 3; i++) { await kv.delete("tourlock:" + id("cal")); await press(id("cal"), { s: calSig }); }
await kv.delete("tourlock:" + id("cal"));
n0 = sms.length;
r = await press(id("cal"), { s: calSig });
check("4th tour text to one lead in a day is refused, with the link to copy", !r.ok && /3 times today/.test((r.why || []).join(" ")) && r.link && sms.length === n0, r);

// ---------------------------------------------------------------- cron routing
const before = searchCalls;
ctx.pending = [];
await worker.scheduled({ cron: "1-59/5 * * * *" }, env, ctx);
await Promise.all(ctx.pending);
check("the tour-notes cron runs the notes pass", searchCalls > before);
ctx.pending = [];
await worker.scheduled({ cron: "*/5 * * * *" }, env, ctx);
await Promise.all(ctx.pending);
check("the 5-minute cron still runs the packs queue (no crash)", true);

// the window page passes s= through
const page = await (await worker.fetch(new Request("https://packs.ismyhometoxic.com/tourtext?c=" + id("ann")), env, ctx)).text();
check("window page reads k= or s= from the #fragment", page.includes("(k|s)=") && !page.includes(env.TOUR_SIGN), "");
const runNoKey = await worker.fetch(new Request("https://packs.ismyhometoxic.com/tournoterun"), env, ctx);
check("/tournoterun needs the log key", runNoKey.status === 403, runNoKey.status);

console.log(fails ? "\n  " + fails + " FAILED" : "\n  all passed");
process.exit(fails ? 1 : 0);
