
/* ------------------------------------------------------- the Send Tour Link button
 *
 * Shannon, 2026-10-21: "Is there a way to put that in GHL? A button that push once we are
 * on the phone with the appt? Once they answer, can we push a button that texts them this
 * link?" ... "Use the default phone number. There must be a way to do it. Another team is
 * already doing it. They literally click a button and it emails the link over with that
 * person ID so that the answers are saved in the notes."
 *
 * GHL itself has no one-click button on a contact (checked 2026-10-21: no manual trigger,
 * no contact quick actions; only paid add-ons). So the button is a bookmark in her Chrome.
 * On a lead's contact page it reads the contact id out of the address bar and opens
 * GET /tourtext?c=<id>#k=<key> in a small window. That page POSTs here, and this sends:
 *
 *   "Hi <first>! Here is the link we are going over together:
 *    https://scan.ismyhometoxic.com/tour/?contact_id=<id>"
 *
 * from the location's default number (TOUR_FROM, 866-567-0832, the number every reminder
 * already goes out on), then files a note on the contact. The id in the link is what ties
 * her checklist to her record, so her answers land in the notes and the packs text follows.
 *
 * WHO CAN FIRE IT. Only someone holding TOUR_KEY, which lives in her bookmark and in
 * sta-tools/.tourkey, never in this file (the dashboard repo is public). The key travels in
 * the URL FRAGMENT, which a browser never sends to a server, and then in the POST body.
 *
 * WHAT IT WILL NOT DO, whoever holds the key:
 *   - text a contact that GHL says is DND, or that carries a stop tag, or has no phone.
 *     The same mustNotText() that guards the packs send. The window shows her the reason.
 *   - text the same person twice inside TOUR_GAP seconds (a double click is one text).
 *   - go past TOUR_HOURLY_CAP live texts or TOUR_TRY_CAP presses in a clock hour. Both are
 *     soft (KV has no atomic add) but fail CLOSED if KV cannot be read.
 *   - send anything at all unless TOUR_MODE is "live". "dryrun" checks everything and
 *     reports what it would have sent; "off" refuses.
 *   - send any words but these: the message is fixed here, only the name and id change.
 *
 * Reviewed 2026-10-21 before going live (wf_2652d482-bb0): lock moved ahead of the GHL
 * lookup, every press counted, the window re-runs on a second click, GHL "failed" status
 * caught, the link shown with a Copy button when a text cannot go, the name cleaned.
 */
const TOUR_GAP = 60;               // seconds before the same contact can be texted again
const TOUR_HOURLY_CAP = 60;        // live texts per clock hour, all contacts together
const TOUR_TRY_CAP = 120;          // key-valid presses per clock hour, whatever the outcome
const TOUR_DAY_CAP = 3;            // live tour texts to ONE lead per day (Mountain date)
const TOUR_PAGE = "https://scan.ismyhometoxic.com/tour/?contact_id=";
const HONORIFICS = ["dr", "mr", "mrs", "ms", "miss", "mx"];

// The greeting name, from whatever was typed on a public form. One clean word or "there":
// letters, apostrophes and hyphens only, at most 20 characters, never a title, never a
// phone number or a URL (a link in a text from the toll-free number can trip carrier filters).
function greetName(raw) {
  const words = String(raw || "").replace(/\u2019/g, "'").trim().split(/\s+/);
  for (let w of words) {
    if (/[\/:@]|www\./i.test(w)) return "";          // a link or an email, not a name
    w = w.replace(/[^\p{L}'-]/gu, "").replace(/^['-]+|['-]+$/g, "");
    if (!w || !/\p{L}/u.test(w)) continue;
    if (HONORIFICS.indexOf(w.toLowerCase()) >= 0) continue;
    if (w.length > 20) return "";
    if (w.length > 1 && w === w.toUpperCase()) w = w.toLowerCase();    // MARY -> Mary
    if (w === w.toLowerCase()) {
      w = w.replace(/(^|['-])(\p{Ll})/gu, function (m, sep, ch) { return sep + ch.toUpperCase(); });
    }
    return w;
  }
  return "";
}

function tourMessage(contact) {
  return "Hi " + (greetName(contact.firstName) || "there") +
         "! Here is the link we are going over together: " + TOUR_PAGE + contact.id;
}

function lastFour(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : "";
}

function mountainTime(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", { timeZone: "America/Edmonton", month: "short",
      day: "numeric", hour: "numeric", minute: "2-digit" }) + " MT";
  } catch (e) { return iso.slice(0, 16).replace("T", " ") + " UTC"; }
}

function mountainDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Edmonton" });   // yyyy-mm-dd
  } catch (e) { return String(iso).slice(0, 10); }
}

async function bump(env, key, n) {
  try { await env.REPORTS.put(key, String(n + 1), { expirationTtl: 7200 }); } catch (e) {}
}

// The SEND TOUR LINK note on each lead (Shannon 2026-10-22: "How will Kristen & other
// builders do that? ... It needs to be simple. A button that is already on each lead.")
// Its link carries a signature for THAT contact only: HMAC-SHA256 of "tour:<id>" under the
// TOUR_SIGN secret. Anyone who sees the note can text that one lead their own tour link,
// at most TOUR_DAY_CAP times a day, and nothing else. TOUR_SIGN must never be rotated
// casually: every note already pinned on a lead stops working when it changes.
async function tourSig(env, cid) {
  const secret = String((env && env.TOUR_SIGN) || "");
  if (!secret || !ID_OK.test(String(cid || ""))) return "";
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode("tour:" + cid)));
  let b = "";
  for (let i = 0; i < 16; i++) b += String.fromCharCode(mac[i]);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function tourNoteLink(env, cid) {
  const sig = await tourSig(env, cid);
  return sig ? PACK_HOST + "/tourtext?c=" + cid + "#s=" + sig : "";
}

async function sendTourLink(env, body) {
  const mode = String(env.TOUR_MODE || "off").toLowerCase();
  const key = String(env.TOUR_KEY || "");
  const cid = String(body.c || "").trim();
  let authed = !!key && String(body.k || "") === key;
  if (!authed && body.s && ID_OK.test(cid)) {
    const sig = await tourSig(env, cid);
    authed = !!sig && String(body.s) === sig;
  }
  if (!authed) return { ok: false, status: 403, why: ["This link or button is not valid. Ask Shannon for a new one."] };
  if (mode === "off") return { ok: false, why: ["The tour link button is switched off."] };
  if (!ID_OK.test(cid)) return { ok: false, why: ["Open the lead's contact page in GHL first, then click the button."] };
  if (!env.REPORTS) return { ok: false, why: ["The worker has no storage, so nothing was sent."] };
  const link = TOUR_PAGE + cid;
  const now = new Date().toISOString();
  const hour = now.slice(0, 13);

  // Every key-valid press counts here, sent or not, so even a leaked key cannot turn this
  // into an unlimited contact lookup. Then the ceiling on live texts. Unreadable = refuse.
  let tries, n;
  try {
    tries = Number(await env.REPORTS.get("tourtry:" + hour)) || 0;
    n = Number(await env.REPORTS.get("tourhour:" + hour)) || 0;
  } catch (e) {
    return { ok: false, link, why: ["Storage could not be read, so nothing was sent. Try again in a minute."] };
  }
  if (tries >= TOUR_TRY_CAP) return { ok: false, why: ["Too many presses this hour. Nothing was sent."] };
  await bump(env, "tourtry:" + hour, tries);
  if (n >= TOUR_HOURLY_CAP) return { ok: false, link, why: ["More than " + TOUR_HOURLY_CAP + " tour links this hour. Nothing was sent."] };

  // The per-person lock goes on FIRST, before the GHL lookup, so two quick presses cannot
  // both get through while the lookup is in flight. It is lifted again on every path that
  // ends without a live send, so a blocked or test press never says "already went".
  const lockKey = "tourlock:" + cid;
  let recent;
  try { recent = await env.REPORTS.get(lockKey); }
  catch (e) { return { ok: false, link, why: ["Storage could not be read, so nothing was sent. Try again in a minute."] }; }
  if (recent) return { ok: false, why: ["The link already went to this person less than a minute ago."], at: recent };
  try { await env.REPORTS.put(lockKey, now, { expirationTtl: TOUR_GAP }); }
  catch (e) { return { ok: false, link, why: ["Storage could not be written, so nothing was sent. Try again in a minute."] }; }
  async function unlock() { try { await env.REPORTS.delete(lockKey); } catch (e) {} }

  const dayKey = "tourday:" + cid + ":" + mountainDate(now);
  let today;
  try { today = Number(await env.REPORTS.get(dayKey)) || 0; }
  catch (e) { await unlock(); return { ok: false, link, why: ["Storage could not be read, so nothing was sent. Try again in a minute."] }; }
  if (today >= TOUR_DAY_CAP) {
    await unlock();
    return { ok: false, link, why: ["The tour link already went to this person " + today + " times today, so nothing was sent. Copy the link below if they still need it."] };
  }

  // Same DND-aware id search as the packs send (see the trap note at the top of
  // 04-send.js), read here so "GHL did not answer" and "no such contact" are told apart.
  const loc = String(env.GHL_LOCATION || "").trim();
  let sr = null;
  if (loc) {
    try {
      sr = await ghl(env, "POST", "/contacts/search", { locationId: loc, page: 1, pageLimit: 1,
        filters: [{ field: "id", operator: "eq", value: cid }] });
    } catch (e) { sr = null; }
  }
  if (!sr || !sr.ok) {
    await unlock();
    return { ok: false, link, why: ["GHL did not answer" + (sr ? " (HTTP " + sr.status + ")" : "") + ". Nothing was sent. Try again in a minute."] };
  }
  const contact = Array.isArray(sr.data && sr.data.contacts) ? sr.data.contacts[0] : null;
  if (!contact || contact.id !== cid) {
    await unlock();
    return { ok: false, why: ["This contact is not in your GHL account, so nothing was sent."] };
  }
  const name = ((contact.firstName || "") + " " + (contact.lastName || "")).trim() || "(no name on file)";
  const to = lastFour(contact.phone);
  const why = mustNotText(contact);
  if (why.length) { await unlock(); return { ok: false, name, to, why }; }

  const message = tourMessage(contact);
  const from = String(env.TOUR_FROM || "").trim();

  if (mode !== "live") {
    await unlock();
    try {
      await env.REPORTS.put("tourdry:" + cid + ":" + now,
        JSON.stringify({ contact_id: cid, at: now, name, to, from, message }),
        { expirationTtl: 60 * 60 * 24 * 30 });
    } catch (e) {}
    return { ok: true, dry: true, name, to, from, message };
  }

  await bump(env, "tourhour:" + hour, n);
  try { await env.REPORTS.put(dayKey, String(today + 1), { expirationTtl: 60 * 60 * 36 }); } catch (e) {}
  const payload = { type: "SMS", contactId: cid, message };
  if (from) payload.fromNumber = from;
  const rec = { contact_id: cid, at: now, name, to, from };
  let r;
  try {
    r = await ghl(env, "POST", "/conversations/messages", payload, "2021-04-15");
  } catch (e) {
    rec.error = "threw: " + String((e && e.message) || e).slice(0, 200);
    try { await env.REPORTS.put("tourtext:" + cid + ":" + now, JSON.stringify(rec), { expirationTtl: LOG_TTL }); } catch (e2) {}
    return { ok: false, name, to, link, why: ["The text may or may not have gone out. Ask them if it came in before clicking again."] };
  }
  const st = String((r.data && r.data.status) || "").toLowerCase();
  rec.ok = r.ok; rec.status = r.status; rec.msg_status = st || null;
  rec.message_id = (r.data && (r.data.messageId || r.data.msgId)) || null;
  if (!r.ok || st === "failed" || st === "undelivered") {
    await unlock();       // nothing went out, so a retry (or a fixed number) must not be refused
    rec.error = JSON.stringify(r.data).slice(0, 300);
    try { await env.REPORTS.put("tourtext:" + cid + ":" + now, JSON.stringify(rec), { expirationTtl: LOG_TTL }); } catch (e) {}
    const msg = (r.data && (r.data.message || r.data.error)) || "";
    return { ok: false, name, to, link, why: ["GHL refused the text" + (r.ok ? "" : " (HTTP " + r.status + ")") +
             (msg ? ": " + String(msg).slice(0, 160) : "") + ". Copy the link below and email it to them instead."] };
  }
  try { await env.REPORTS.put("tourtext:" + cid + ":" + now, JSON.stringify(rec), { expirationTtl: LOG_TTL }); } catch (e) {}

  // A trace on the record, so whoever opens the contact sees the link went out.
  try {
    await ghl(env, "POST", "/contacts/" + cid + "/notes", {
      body: "TOUR LINK TEXTED " + mountainTime(now) + "\n" + link + "\nSent with the Send Tour Link button.",
    });
  } catch (e) {}
  return { ok: true, name, to, from, at: now };
}

// The little window the bookmark opens. It shows who it is texting and the result. The key
// arrives in the #fragment and goes back out only in the POST body to this same host.
// A second click while this window is open changes only the #fragment (the address was
// cleaned after the first run), which the browser treats as the same page: no reload. So
// the work runs on load AND on every hashchange that carries a key, with a busy flag so a
// click while a POST is in flight is ignored. The KV lock still makes a double click one text.
const TOUR_WINDOW =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">' +
  '<title>Send Tour Link</title><style>' +
  'body{margin:0;background:#0B2545;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}' +
  '.w{padding:24px 22px}h1{font-size:1.25em;margin:0 0 10px}p{margin:0 0 10px;line-height:1.45;color:#DCE6F2}' +
  '.ok h1{color:#7BE0A0}.no h1{color:#FF9AA2}.msg{background:#12345f;border-radius:10px;padding:12px;font-size:.92em;color:#fff;word-break:break-all}' +
  'ul{margin:0 0 10px;padding-left:20px;color:#fff}button{margin:6px 8px 0 0;padding:10px 16px;border:0;border-radius:8px;' +
  'background:#fff;color:#0B2545;font-weight:700;font-size:15px;cursor:pointer}' +
  '</style></head><body><div class="w" id="w"><h1>Sending the tour link...</h1><p>One moment.</p></div>' +
  '<script>(function(){' +
  'var w=document.getElementById("w"),busy=false,c=new URLSearchParams(location.search).get("c")||"";' +
  'var CLOSE="<button onclick=\\"window.close()\\">Close</button>";' +
  'function h(s){return String(s==null?"":s).replace(/[&<>"]/g,function(x){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[x];});}' +
  'function copyBox(l){if(!l)return"";return"<p>Their link:</p><p class=msg>"+h(l)+"</p><button id=cp>Copy link</button>";}' +
  'function wire(l){var b=document.getElementById("cp");if(b&&l)b.onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(l).then(function(){b.textContent="Copied";});};}' +
  'function go(){var m=location.hash.match(/(k|s)=([^&]+)/);if(!m||busy)return;var a={c:c};a[m[1]]=decodeURIComponent(m[2]);busy=true;' +
  'try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}' +
  'w.className="w";w.innerHTML="<h1>Sending the tour link...</h1><p>One moment.</p>";' +
  'fetch("/tourtext",{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(a)})' +
  '.then(function(r){return r.json();}).then(function(j){busy=false;' +
  'var who=h(j.name||"")+(j.to?" (ending "+h(j.to)+")":"");' +
  'if(j.ok&&j.dry){w.className="w ok";w.innerHTML="<h1>TEST ONLY, nothing sent</h1><p>It would text "+who+":</p><p class=msg>"+h(j.message)+"</p>"+CLOSE;return;}' +
  'if(j.ok){w.className="w ok";w.innerHTML="<h1>Sent!</h1><p>The tour link is on its way to "+who+".</p><p>Ask them if it came in.</p>"+CLOSE;setTimeout(function(){window.close();},8000);return;}' +
  'w.className="w no";w.innerHTML="<h1>Not sent</h1>"+(who?"<p>"+who+"</p>":"")+"<ul>"+(j.why||["Unknown problem."]).map(function(x){return"<li>"+h(x)+"</li>";}).join("")+"</ul>"+copyBox(j.link)+CLOSE;wire(j.link);' +
  '}).catch(function(){busy=false;w.className="w no";w.innerHTML="<h1>Not sent</h1><p>The button could not reach the server. Check the internet and click it again.</p>"+CLOSE;});}' +
  'window.addEventListener("hashchange",go);go();' +
  '})();</script></body></html>';

/* ------------------------------------------- SEND TOUR LINK notes on the leads
 *
 * Every NEW contact, and everyone booked on a tour calendar, gets one pinned note with a
 * SEND TOUR LINK link (their own signed link, see tourSig). Pinned notes sit at the top of
 * the Notes panel in GHL, on the web and in the phone app, so Kristen and every builder
 * just open the lead and click it. Runs from its own cron (TOUR_NOTE_CRON), so it never
 * shares a subrequest budget with the packs queue.
 *
 *   - TOUR_NOTES gates it: "live" writes notes, "dryrun" logs who would get one, "off" nothing.
 *   - one note per contact, ever: KV tournote:<id> remembers it.
 *   - skipped: builder prospects (tag boostyourincome: their call is the Zoom, not a tour)
 *     and anyone the packs send would refuse to text (DND, stop tags, no phone). Those are
 *     re-checked after a week, in case it changes.
 *   - new contacts are read in date order from a cursor, so a busy hour is finished on the
 *     next run instead of skipped; at most TOUR_NOTES_PER_RUN notes are written per run.
 */
const TOUR_NOTE_CRON = "3-59/10 * * * *";
const TOUR_NOTES_PER_RUN = 12;
const TOUR_NOTE_SKIP_TAGS = ["boostyourincome"];
const TOUR_CALENDARS = [
  "1cSkufApIXXOrrDSlsfn", "7qPj2dFr91uOtgbhKc3O", "8KyVN97V9STkCZ8fv8tm", "DhQIAxElvFEm9JvanpS2",
  "MFE31N22BzC6yUkKhjfk", "Uu9A7T3weNNMrqGDXhSh", "VcaBdXq7kJAAb3q9lwVu", "Y8AxPZdBot07yyAMM0yQ",
  "bfmvjAoI4FxLd2cOyn9c", "tS0J4P5TcSyAxL79gcR5", "tutfx6nixvxzqsdolstb", "wz7NpKeOERbYhUsmEfff",
  "xRWH8ROP4UOsxNCyyxGf",
];   // the shopper tour calendars; the 5 builder Zoom calendars are left out on purpose
const TOUR_NOTES_BACK_DAYS = 45;   // first run reaches back this far for new contacts

function tourNoteHtml(link, contact) {
  const who = greetName(contact && contact.firstName) || "them";
  return '<p><a href="' + link + '" target="_blank"><strong>SEND TOUR LINK</strong></a></p>' +
         "<p>Click it once you are on the call with " + esc(who) + ". It texts " + esc(who) +
         " the tour link from 866-567-0832, and the checklist answers save here.</p>";
}

async function tourNoteFor(env, contact, mode) {
  const cid = contact.id;
  const tags = (Array.isArray(contact.tags) ? contact.tags : []).map(function (t) { return String(t).toLowerCase().trim(); });
  if (TOUR_NOTE_SKIP_TAGS.some(function (t) { return tags.indexOf(t) >= 0; })) {
    await env.REPORTS.put("tournote:" + cid, "skip:builder", { expirationTtl: LOG_TTL });
    return "skip:builder";
  }
  const why = mustNotText(contact);
  if (why.length) {
    await env.REPORTS.put("tournote:" + cid, "skip:" + why[0].slice(0, 60), { expirationTtl: 60 * 60 * 24 * 7 });
    return "skip:dnd";
  }
  const link = await tourNoteLink(env, cid);
  if (!link) return "no-sign-key";
  if (mode !== "live") {
    await env.REPORTS.put("tournotedry:" + cid, JSON.stringify({ at: new Date().toISOString(),
      name: ((contact.firstName || "") + " " + (contact.lastName || "")).trim() }), { expirationTtl: 60 * 60 * 24 * 7 });
    return "dry";
  }
  const r = await ghl(env, "POST", "/contacts/" + cid + "/notes", { body: tourNoteHtml(link, contact), pinned: true });
  if (!r.ok) return "note-failed:" + r.status;
  await env.REPORTS.put("tournote:" + cid, String((r.data && r.data.note && r.data.note.id) || "ok"), { expirationTtl: LOG_TTL });
  return "noted";
}

async function ensureTourNotes(env) {
  const mode = String((env && env.TOUR_NOTES) || "off").toLowerCase();
  if (mode === "off" || !env.REPORTS || !String(env.TOUR_SIGN || "")) return { skipped: mode };
  const loc = String(env.GHL_LOCATION || "").trim();
  if (!loc) return { skipped: "no location" };
  const now = Date.now();
  const out = [];
  let made = 0;
  const seen = {};

  // 1) new contacts, oldest first, from the cursor
  const curKey = mode === "live" ? "tournotes:since" : "tournotes:since:dry";
  let since = await env.REPORTS.get(curKey);
  if (!since) since = new Date(now - TOUR_NOTES_BACK_DAYS * 86400000).toISOString();
  const sr = await ghl(env, "POST", "/contacts/search", { locationId: loc, page: 1, pageLimit: 50,
    filters: [{ field: "dateAdded", operator: "range", value: { gte: since } }],
    sort: [{ field: "dateAdded", direction: "asc" }] });
  let cursor = since;
  if (sr.ok && sr.data && Array.isArray(sr.data.contacts)) {
    for (const c of sr.data.contacts) {
      if (!c || !ID_OK.test(String(c.id || ""))) continue;
      if (made >= TOUR_NOTES_PER_RUN) break;               // the cursor stops here; next run resumes
      seen[c.id] = 1;
      if (!(await env.REPORTS.get("tournote:" + c.id))) {
        const res = await tourNoteFor(env, c, mode);
        out.push(c.id + "=" + res);
        if (res === "noted" || res === "dry") made++;
      }
      if (c.dateAdded && c.dateAdded > cursor) cursor = c.dateAdded;
    }
  }
  if (cursor !== since) await env.REPORTS.put(curKey, cursor);

  // 2) everyone booked on a tour calendar (yesterday to 30 days out), every half hour
  const calKey = mode === "live" ? "tournotes:cal" : "tournotes:cal:dry";
  const lastCal = Number(await env.REPORTS.get(calKey)) || 0;
  if (made < TOUR_NOTES_PER_RUN && now - lastCal > 30 * 60000) {
    const ids = [];
    for (const cal of TOUR_CALENDARS) {
      const r = await ghl(env, "GET", "/calendars/events?locationId=" + loc + "&calendarId=" + cal +
        "&startTime=" + (now - 86400000) + "&endTime=" + (now + 30 * 86400000), undefined, "2021-04-15");
      if (!r.ok || !r.data || !Array.isArray(r.data.events)) continue;
      for (const e of r.data.events) {
        const st = String(e.appointmentStatus || "").toLowerCase();
        if (!e.contactId || e.deleted || st === "cancelled" || st === "invalid") continue;
        if (!seen[e.contactId] && ids.indexOf(e.contactId) < 0) ids.push(e.contactId);
      }
    }
    let finished = true;
    for (const cid of ids) {
      if (!ID_OK.test(cid)) continue;
      if (await env.REPORTS.get("tournote:" + cid)) continue;
      if (made >= TOUR_NOTES_PER_RUN) { finished = false; break; }
      const c = await lookupContact(env, cid);
      if (!c) continue;
      const res = await tourNoteFor(env, c, mode);
      out.push(cid + "=" + res);
      if (res === "noted" || res === "dry") made++;
    }
    if (finished) await env.REPORTS.put(calKey, String(now));
  }
  return { mode, made, results: out };
}
