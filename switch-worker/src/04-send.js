
/* --------------------------------------------------------------- talking to GHL
 *
 * THE TRAP THAT NEARLY SHIPPED, written down so nobody re-introduces it.
 *
 * The obvious way to look a contact up is GET /contacts/{id}. That endpoint DOES NOT
 * RETURN dnd OR dndSettings. Not false, not empty: the keys are absent. So the natural
 * guard, `if (contact.dnd === true) return "blocked"`, is dead code that always passes.
 * On 2026-08-30 this location had 2,982 contacts with dnd=true, many of them carrying
 * SMS status "permanent", which is what GHL writes when a person texts the word STOP.
 * A guard written against GET would have texted every one of them.
 *
 * POST /contacts/search with an id filter returns the same contact WITH dnd, dndSettings,
 * tags and phone. That is why the lookup below is a search and not a get. Do not
 * "simplify" it back.
 */

async function ghl(env, method, path, body, version) {
  const headers = {
    Authorization: "Bearer " + env.GHL_TOKEN,
    Version: version || "2021-07-28",
    Accept: "application/json",
  };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(GHL + path, init);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (e) { data = { _raw: text.slice(0, 400) }; }
  return { status: res.status, ok: res.ok, data };
}

/** The only contact lookup allowed in the send path. Returns null if it cannot be read. */
async function lookupContact(env, contactId) {
  // No location binding means no lookup, which means no stop check, which means no send.
  // This used to fall back to a bare LOCATION_ID that was never declared anywhere: it
  // only ever worked because the binding happened to be set, and would have thrown a
  // ReferenceError the day somebody deployed without it.
  const loc = String(env.GHL_LOCATION || "").trim();
  if (!loc) return null;
  const r = await ghl(env, "POST", "/contacts/search", {
    locationId: loc,
    page: 1,
    pageLimit: 1,
    filters: [{ field: "id", operator: "eq", value: contactId }],
  });
  if (!r.ok || !r.data || !Array.isArray(r.data.contacts)) return null;
  const c = r.data.contacts[0];
  if (!c || c.id !== contactId) return null;   // never accept a near miss
  return c;
}

/**
 * Every reason this person must not be texted. Empty array means it is safe to send.
 * Anything that cannot be checked counts as a reason, never as an all clear.
 */
function mustNotText(contact) {
  const why = [];
  if (!contact || typeof contact !== "object") return ["contact could not be read from GHL"];

  // Master switch. 2,982 contacts had this set on 2026-08-30.
  if (contact.dnd === true) why.push("DND is on for this contact");

  // Per channel. "permanent" is what GHL writes when someone texts STOP. "active" is a
  // DND somebody switched on. Only "inactive" and a missing channel are safe.
  const ds = contact.dndSettings;
  if (ds && typeof ds === "object") {
    for (const ch of ["SMS", "RCS", "All"]) {
      const s = ds[ch];
      if (!s || typeof s !== "object") continue;
      const st = String(s.status || "").toLowerCase();
      if (st && st !== "inactive") {
        why.push("DND on " + ch + " (" + st +
                 (String(s.message || "").indexOf("STOP") >= 0 ? ", they texted STOP" : "") + ")");
      }
    }
  }

  // Shannon's own kill switch. 9,362 contacts carried "not interested" on 2026-08-30.
  const tags = Array.isArray(contact.tags) ? contact.tags : [];
  const lower = tags.map(function (t) { return String(t).toLowerCase().trim(); });
  for (const t of STOP_TAGS) {
    if (lower.indexOf(t) >= 0) why.push('tagged "' + t + '"');
  }

  if (!contact.phone || !String(contact.phone).trim()) why.push("no phone number on file");

  return why;
}

/* ------------------------------------------------------------------ the queue */

function slugify(name) {
  const s = String(name || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return s.slice(0, 24);
}

/** Give this contact a name-shaped URL, never stealing one another contact already has. */
async function allocateSlug(env, contactId, firstName) {
  const base = slugify(firstName) || "friend";
  for (let i = 1; i <= 60; i++) {
    const slug = i === 1 ? base : base + i;
    const owner = await env.REPORTS.get("packslug:" + slug);
    if (owner === null) {
      await env.REPORTS.put("packslug:" + slug, contactId);
      return slug;
    }
    if (owner === contactId) return slug;    // already ours, reuse it
  }
  return base + "-" + contactId.slice(0, 6).toLowerCase();
}

async function readRow(env, contactId) {
  return await env.REPORTS.get("packsend:" + contactId, "json");
}

async function writeRow(env, row) {
  await env.REPORTS.put("packsend:" + row.contact_id, JSON.stringify(row),
                        { expirationTtl: LOG_TTL });
}

/**
 * Called from the public POST. Writes a row and nothing else. Never sends.
 * Keyed on the contact id, so replaying the POST a thousand times makes one row.
 */
async function queuePackSend(env, sub) {
  if (!env || !env.REPORTS) return;
  if (!sub.contact_id || !Array.isArray(sub.items) || !sub.items.length) return;
  const existing = await readRow(env, sub.contact_id);
  if (existing) return;                       // the replay lock
  await writeRow(env, {
    contact_id: sub.contact_id,
    at: sub.at,
    score: sub.score,
    count: sub.count,
    items: sub.items,
    state: "queued",
    attempts: 0,
    history: [{ at: sub.at, what: "queued from checklist submission" }],
  });
}

function note(row, what) {
  row.history = (row.history || []).slice(-24);
  row.history.push({ at: new Date().toISOString(), what });
}

async function block(env, row, reasons) {
  row.state = "blocked";
  row.blocked_because = reasons;
  note(row, "BLOCKED: " + reasons.join("; "));
  await writeRow(env, row);
}

/** One row, one step. Returns a short string describing what happened. */
async function stepRow(env, row) {
  const mode = String(env.SEND_MODE || "off").toLowerCase();

  if (row.state === "sent" || row.state === "blocked" || row.state === "sending") {
    return "skip:" + row.state;
  }
  row.attempts = (row.attempts || 0) + 1;
  if (row.attempts > 24) {
    await block(env, row, ["gave up after " + (row.attempts - 1) + " attempts"]);
    return "gave-up";
  }

  // ---- build the page ----
  if (row.state === "queued") {
    const contact = await lookupContact(env, row.contact_id);
    if (!contact) {
      note(row, "could not read contact, will retry");
      await writeRow(env, row);
      return "retry:unreadable";
    }
    const why = mustNotText(contact);
    if (why.length) { await block(env, row, why); return "blocked"; }

    const built = buildPacks(row.items);
    if (!built.packs.length) {
      await block(env, row, ["nothing she ticked can make a package in the 35 to 37 point range"]);
      return "blocked:no-packs";
    }
    for (const pk of built.packs) {
      let t = 0;
      for (const p of pk) t += p.pts;
      // 35 to 37, not exactly 35. This check is the last thing standing between a wrong
      // package and a customer, so it moved the same day the target became a range; left
      // at "=== 35" it would have blocked every send instead of catching a bad one.
      if (t < TARGET_MIN || t > TARGET_MAX) {
        await block(env, row, ["built a package worth " + t + " points, outside " +
                               TARGET_MIN + " to " + TARGET_MAX]);
        return "blocked:bad-total";
      }
      const names = new Set(pk.map(function (x) { return x.name; }));
      if (names.size !== pk.length) {
        await block(env, row, ["built a package with the same product twice"]);
        return "blocked:duplicate-product";
      }
    }

    row.first_name = contact.firstName || "";
    const slug = await allocateSlug(env, row.contact_id, row.first_name);
    const html = renderPage(row, built.packs);
    await env.REPORTS.put("packpage:" + slug, JSON.stringify({
      html, contact_id: row.contact_id, at: new Date().toISOString(),
    }), { expirationTtl: LOG_TTL });

    row.slug = slug;
    row.url = PACK_HOST + "/" + slug;
    row.packs = built.packs.length;
    row.state = "ready";
    note(row, "page built at " + row.url + " (" + built.packs.length + " packs)");
    await writeRow(env, row);
    return "built";
  }

  // ---- send ----
  if (row.state === "ready") {
    // The link must work before the text goes out. A text whose link is dead is worse
    // than no text at all.
    //
    // WHY THIS IS A KV READ AND NOT AN HTTP FETCH, learned the hard way 2026-08-30.
    // The obvious gate was `fetch(row.url)` and require 200. On the first dry run that
    // gate refused both pages, logging "page not answering 200 yet", while curl from
    // outside fetched the very same URLs at 200. A Worker asking for its own custom
    // domain is a subrequest that loops back at the edge, so the check reported dead
    // pages that were perfectly alive. Left in place it is worse than no gate: it never
    // passes, so nobody is ever texted, and the reason is buried in KV.
    //
    // So the gate reads back the exact bytes the page is served from. That is the thing
    // that can actually be missing. The routing in front of it is static, proven from
    // outside, and identical for every page, so it is not what a per-woman gate should
    // be testing.
    const stored = await env.REPORTS.get("packpage:" + row.slug, "json");
    const html = stored && stored.html;
    const good = !!html && html.length > 500 &&
                 html.indexOf("Package 1") >= 0 &&
                 stored.contact_id === row.contact_id;
    if (!good) {
      note(row, "her page is not in KV yet (or belongs to someone else), will retry");
      await writeRow(env, row);
      return "retry:page-missing";
    }

    // Check again, right now. She may have replied "no thanks" since the page was built.
    const contact = await lookupContact(env, row.contact_id);
    if (!contact) {
      note(row, "could not re-read contact before sending, will retry");
      await writeRow(env, row);
      return "retry:unreadable";
    }
    const why = mustNotText(contact);
    if (why.length) { await block(env, row, why); return "blocked-late"; }

    const message = smsBody(row.url, row.packs);

    if (mode !== "live") {
      row.state = "blocked";
      row.blocked_because = ["SEND_MODE is " + mode + ", nothing was sent"];
      row.would_have_sent = message;
      note(row, "DRY RUN, would have texted " + (contact.phone || "?"));
      await writeRow(env, row);
      return "dryrun";
    }

    // Write the lock BEFORE the send. If the worker dies mid-call the row reads
    // "sending", which is never retried, because a missed text beats a second one.
    row.state = "sending";
    row.send_started = new Date().toISOString();
    note(row, "sending now");
    await writeRow(env, row);

    const r = await ghl(env, "POST", "/conversations/messages",
                        { type: "SMS", contactId: row.contact_id, message },
                        "2021-04-15");
    if (!r.ok) {
      row.state = "blocked";
      row.blocked_because = ["GHL refused the text, HTTP " + r.status];
      row.send_error = JSON.stringify(r.data).slice(0, 300);
      note(row, "send FAILED " + r.status);
      await writeRow(env, row);
      return "send-failed";
    }
    row.state = "sent";
    row.sent_at = new Date().toISOString();
    row.message_id = (r.data && (r.data.messageId || r.data.msgId)) || null;
    note(row, "TEXT SENT to " + (contact.phone || "?"));
    await writeRow(env, row);

    // Leave a trace on the contact so Shannon sees it in the record, not just in KV.
    await ghl(env, "POST", "/contacts/" + row.contact_id + "/notes", {
      body: "THREE PACKS TEXT SENT " + row.sent_at.slice(0, 10) + "\n" +
            "Her packs page: " + row.url + "\n" +
            "Sent automatically after she completed the Switch Checklist.",
    });
    return "sent";
  }

  return "skip:" + row.state;
}

async function processQueue(env) {
  if (!env || !env.REPORTS) return { error: "no KV" };
  const out = [];
  const list = await env.REPORTS.list({ prefix: "packsend:", limit: 200 });
  for (const k of list.keys) {
    const row = await env.REPORTS.get(k.name, "json");
    if (!row) continue;
    if (row.state === "sent" || row.state === "blocked" || row.state === "sending") continue;
    try {
      out.push(row.contact_id + "=" + (await stepRow(env, row)));
    } catch (e) {
      out.push(row.contact_id + "=threw:" + String((e && e.message) || e).slice(0, 80));
    }
  }
  return { handled: out.length, results: out };
}

/* ------------------------------------------------- the What's New click tracker
 *
 * Shannon texts a per-person What's New link from her own phone and wants to know the
 * moment someone opens it, so she can follow up within minutes. One open records here:
 *   - the contact is TAGGED "clicked what's new", so it shows on their record and she can
 *     pull a list of everyone who has looked.
 *   - a text goes to HER cell naming who it was and their number, so she taps and replies
 *     from her own phone.
 *
 * This is a smaller promise than the packs send and it protects a different person. The
 * text goes to Shannon, never to a lead, so the DND and stop-tag guards that shield a
 * customer do not apply: a woman who tagged herself "not interested" and then opens What's
 * New is the most worth knowing about, not the least. What still holds:
 *   - WNEW_MODE gates it. "live" tags and texts, "dryrun" writes the record and sends
 *     nothing, "off" does nothing at all. Deployed "dryrun" first, exactly like SEND_MODE.
 *   - ONE text per person per window. Someone who opens the page, hits back and opens it
 *     again is one follow-up, not two buzzes on Shannon's phone. The tag is still set every
 *     time, which is free because adding a tag a contact already has changes nothing.
 *   - fired only from /wnew's JavaScript, so an iMessage link preview never reaches it.
 *
 * THIS ENDPOINT IS PUBLIC AND UNAUTHENTICATED, exactly like the checklist POST, so it is
 * hardened the same way: a stranger poking it must never be able to hammer GHL, buzz
 * Shannon, or write to a real record.
 *   - A GLOBAL hourly ceiling caps everything below, so a flood of made-up ids cannot turn
 *     into a flood of GHL calls or texts. It fails CLOSED: if the counter cannot be read,
 *     nothing runs. Real traffic is a tiny fraction of the cap.
 *   - The contact must RESOLVE in GHL (an id-filtered search that returns that exact id).
 *     A poked-in id that is not a real contact gets no tag, no text and no lasting log.
 */
const WNEW_TAG = "clicked what's new";
const WNEW_THROTTLE = 60 * 15;   // seconds between texts to Shannon about the same person
const WNEW_HOURLY_CAP = 300;     // global ceiling on processed opens per clock hour

async function recordWhatsNewClick(env, contactId) {
  if (!env || !env.REPORTS) return;
  const mode = String(env.WNEW_MODE || "off").toLowerCase();
  if (mode === "off") return;                    // off is off: not even a KV write

  const now = new Date().toISOString();

  // Global flood guard: one counter per clock hour. Read it first; if it cannot be read,
  // fail CLOSED, because a KV problem must never open a public endpoint up to hammering
  // GHL or buzzing Shannon. Over the ceiling, shed the hit before it can touch anything.
  const hourKey = "wnewhour:" + now.slice(0, 13);   // yyyy-mm-ddTHH
  let hourN;
  try { hourN = await env.REPORTS.get(hourKey); } catch (e) { return; }
  const count = Number(hourN) || 0;
  if (count >= WNEW_HOURLY_CAP) return;
  try { await env.REPORTS.put(hourKey, String(count + 1), { expirationTtl: 7200 }); } catch (e) {}

  // The contact must be a real one. A made-up id returns null here, or an id that is not
  // this exact contact, and either way nothing further happens. This is what stops a
  // stranger with a guessed id from writing a tag or firing a text.
  const contact = await lookupContact(env, contactId);
  if (!contact || contact.id !== contactId) return;

  const name = ((contact.firstName || "") + " " + (contact.lastName || "")).trim();
  const phone = contact.phone || "";

  // Per-person throttle for the TEXT only. The tag and the log still happen every open.
  const seenKey = "wnewseen:" + contactId;
  let recent = null;
  try { recent = await env.REPORTS.get(seenKey); } catch (e) {}
  const throttled = !!recent;
  try { await env.REPORTS.put(seenKey, now, { expirationTtl: WNEW_THROTTLE }); } catch (e) {}

  // The record of a real open, kept for the /wnewlog.
  try {
    await env.REPORTS.put("wnewhit:" + contactId + ":" + now,
      JSON.stringify({ contact_id: contactId, at: now, name: name || null, mode }),
      { expirationTtl: LOG_TTL });
  } catch (e) {}

  if (mode !== "live") {
    try {
      await env.REPORTS.put("wnewdry:" + contactId + ":" + now,
        JSON.stringify({ contact_id: contactId, at: now, name: name || null,
                         phone: phone || null, throttled, would_tag: WNEW_TAG }),
        { expirationTtl: LOG_TTL });
    } catch (e) {}
    return;
  }

  // Tag the resolved contact. Idempotent, so it runs even when the text is throttled.
  try {
    await ghl(env, "POST", "/contacts/" + contactId + "/tags", { tags: [WNEW_TAG] });
  } catch (e) {}

  if (throttled) return;

  // Text Shannon. Her cell is the only number on ALERT_CONTACT_ID, so this lands on her
  // phone; the lead's own number rides along so she taps it and replies from her cell.
  const alertId = String(env.ALERT_CONTACT_ID || "").trim();
  if (!alertId) return;
  const lines = ["New What's New click", name || "Someone (no name on file)"];
  if (phone) lines.push(phone);
  lines.push("Follow up now.");
  try {
    await ghl(env, "POST", "/conversations/messages",
              { type: "SMS", contactId: alertId, message: lines.join("\n") }, "2021-04-15");
  } catch (e) {}
}
