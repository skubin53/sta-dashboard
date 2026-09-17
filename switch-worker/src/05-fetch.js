
/* ------------------------------------------------------------------- requests */

function cors(origin) {
  const ok = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

const ID_OK = /^[A-Za-z0-9]{15,30}$/;
// esc() (HTML escape) is defined in 03-page.js and in module scope here after the build
// concatenates the files. The /wnewgen page uses it on names, phones and the search box.

async function logSubmission(env, rec) {
  if (!env || !env.REPORTS) return null;
  try {
    const key = "switch:" + rec.at + ":" + (rec.contact_id || "none");
    await env.REPORTS.put(key, JSON.stringify(rec), { expirationTtl: LOG_TTL });
    return key;
  } catch (e) {
    return null;
  }
}

async function markLog(env, key, patch) {
  if (!env || !env.REPORTS || !key) return;
  try {
    const prev = await env.REPORTS.get(key, "json");
    if (!prev) return;
    await env.REPORTS.put(key, JSON.stringify({ ...prev, ...patch }),
                          { expirationTtl: LOG_TTL });
  } catch (e) { /* the note matters more than the bookkeeping */ }
}

const NOT_FOUND =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex"><title>Not found</title>' +
  '<body style="margin:0;background:#0B2545;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
  '<div style="max-width:600px;margin:0 auto;padding:60px 24px">' +
  '<h1 style="font-size:1.4em;margin:0 0 10px">This page is not here</h1>' +
  '<p style="color:#BFD2E6;line-height:1.6">If Shannon sent you a link to your packs, ' +
  'check the address, or just reply to her text and she will send it again.</p></div>';

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // ----------------------------------------------- What's New click tracker
    // Shannon texts packs.ismyhometoxic.com/wnew?c=<contactId> from her own phone. When a
    // person OPENS it she wants a text naming who clicked and the contact tagged, so she
    // follows up within minutes.
    //
    // WHY A JAVASCRIPT PAGE AND NOT A 302. iMessage and most texting apps FETCH a link to
    // build the little preview card the instant a text is sent, on the sender's phone and
    // the receiver's, before anyone taps. A plain redirect would fire on that preview and
    // tell Shannon someone clicked when nobody has. Preview fetchers do not run JavaScript,
    // so the record is fired from JS: a real person in a real browser triggers it, a
    // preview never does. This path must sit ABOVE the packs-slug handler, which would
    // otherwise swallow /wnew as a page name.
    if (request.method === "GET" && url.pathname === "/wnew") {
      const dest = "https://switchtoamerica.com/whatisnew";
      const raw = String(url.searchParams.get("c") || url.searchParams.get("contact_id") || "").trim();
      const cid = ID_OK.test(raw) ? raw : "";
      const page =
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow">' +
        '<meta property="og:title" content="What&#39;s New at Switch to America">' +
        '<meta property="og:description" content="A quick look at what is new.">' +
        '<title>Switch to America</title>' +
        '<noscript><meta http-equiv="refresh" content="0;url=' + dest + '"></noscript>' +
        '</head><body style="margin:0;background:#0B2545;color:#fff;' +
        'font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
        '<div style="max-width:600px;margin:0 auto;padding:80px 24px;text-align:center">' +
        '<p style="color:#BFD2E6;font-size:1.1em">Taking you there...</p>' +
        '<p><a href="' + dest + '" style="color:#fff">Continue</a></p></div>' +
        '<script>(function(){var d=' + JSON.stringify(dest) + ',c=' + JSON.stringify(cid) + ';' +
        'try{if(c){var u="/wnew-hit?c="+encodeURIComponent(c);' +
        'if(!navigator.sendBeacon||!navigator.sendBeacon(u)){' +
        'fetch(u,{method:"POST",keepalive:true});}}}catch(e){}' +
        'location.replace(d);})();</script></body></html>';
      return new Response(page, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
                   "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    // The click record itself, fired by /wnew's JavaScript beacon (a POST). POST ONLY, on
    // purpose: a zero-JS URL security scanner that reads the /wnew-hit URL out of the page
    // body and GETs it would otherwise log a false open and text Shannon. The real client
    // never issues a GET here, so nothing legitimate is lost. A stray GET falls through to
    // a harmless 404 below.
    if (url.pathname === "/wnew-hit" && request.method === "POST") {
      const raw = String(url.searchParams.get("c") || url.searchParams.get("contact_id") || "").trim();
      if (ID_OK.test(raw)) {
        try { await recordWhatsNewClick(env, raw); }
        catch (e) { /* a tracking miss must never error the beacon */ }
      }
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // Who has opened What's New, newest first. Guarded by the same ?k= as the other logs.
    if (request.method === "GET" && url.pathname === "/wnewlog") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      if (!env.REPORTS) return json({ error: "no KV bound" }, 500, origin);
      const rows = [];
      for (const pfx of ["wnewhit:", "wnewdry:"]) {
        const list = await env.REPORTS.list({ prefix: pfx, limit: 500 });
        for (const k of list.keys) {
          const v = await env.REPORTS.get(k.name, "json");
          if (v) rows.push({ kind: pfx.replace(":", ""), ...v });
        }
      }
      rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      return json({ mode: String(env.WNEW_MODE || "off"), count: rows.length,
                    rows: rows.slice(0, 200) }, 200, origin);
    }

    // ----------------------------------------------- What's New link generator
    // Shannon's own bookmarked tool. She opens packs.ismyhometoxic.com/wnewgen?k=<key> on
    // her phone, types a name or number, and gets that person's tracked link to copy into a
    // text. Guarded by the same ?k= as the logs, because it searches her CRM; the key lives
    // in her private bookmark, never in a public page. Read only: it never writes anything.
    if (request.method === "GET" && url.pathname === "/wnewgen") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      const k = readKey(env);
      const q = String(url.searchParams.get("q") || "").trim().slice(0, 60);
      let results = "";
      if (q) {
        let contacts = [];
        try {
          const r = await ghl(env, "POST", "/contacts/search",
            { locationId: String(env.GHL_LOCATION || ""), page: 1, pageLimit: 15, query: q });
          if (r.ok && r.data && Array.isArray(r.data.contacts)) contacts = r.data.contacts;
        } catch (e) {}
        if (!contacts.length) {
          results = '<p class="none">No matches for "' + esc(q) + '". Try a first name, last name, or phone.</p>';
        } else {
          results = contacts.map(function (c) {
            const nm = ((c.firstName || "") + " " + (c.lastName || "")).trim() || "(no name)";
            const link = "https://packs.ismyhometoxic.com/wnew?c=" + c.id;
            return '<div class="card"><div class="nm">' + esc(nm) +
              (c.phone ? ' <span class="ph">' + esc(c.phone) + '</span>' : '') + '</div>' +
              '<div class="lk">' + esc(link) + '</div>' +
              '<button class="cp" data-l="' + esc(link) + '">Copy link</button></div>';
          }).join("");
        }
      }
      const page =
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="robots" content="noindex,nofollow"><title>What&#39;s New links</title>' +
        '<style>' +
        'body{margin:0;background:#0B2545;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}' +
        '.wrap{max-width:640px;margin:0 auto;padding:24px 16px}' +
        'h1{font-size:1.2em;margin:0 0 4px}.sub{color:#BFD2E6;margin:0 0 16px;font-size:.9em}' +
        'form{display:flex;gap:8px;margin-bottom:20px}' +
        'input{flex:1;padding:12px;border:0;border-radius:8px;font-size:16px}' +
        'form button{padding:12px 16px;border:0;border-radius:8px;background:#F4A300;color:#0B2545;font-weight:700;font-size:16px}' +
        '.card{background:#12345f;border-radius:10px;padding:14px;margin-bottom:12px}' +
        '.nm{font-weight:700;margin-bottom:6px}.ph{color:#BFD2E6;font-weight:400;font-size:.9em}' +
        '.lk{color:#BFD2E6;font-size:.82em;word-break:break-all;margin-bottom:10px}' +
        '.cp{padding:10px 14px;border:0;border-radius:8px;background:#fff;color:#0B2545;font-weight:700}' +
        '.none{color:#BFD2E6}' +
        '</style></head><body><div class="wrap">' +
        '<h1>What&#39;s New links</h1>' +
        '<p class="sub">Find a person, copy their link, paste it into your text. When they open it you get a text and they are tagged.</p>' +
        '<form method="GET" action="/wnewgen">' +
        '<input type="hidden" name="k" value="' + esc(k) + '">' +
        '<input name="q" value="' + esc(q) + '" placeholder="Name or phone" autocomplete="off" autofocus>' +
        '<button type="submit">Find</button></form>' +
        results +
        '<script>document.addEventListener("click",function(e){var b=e.target.closest(".cp");if(!b)return;' +
        'var l=b.getAttribute("data-l");if(navigator.clipboard){navigator.clipboard.writeText(l).then(function(){' +
        'b.textContent="Copied";setTimeout(function(){b.textContent="Copy link";},1500);});}});</script>' +
        '</div></body></html>';
      return new Response(page, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
                   "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    // ---------------------------------------------------------------- the log
    if (request.method === "GET" && url.pathname === "/log") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      if (!env.REPORTS) return json({ error: "no KV bound" }, 500, origin);
      const want = (url.searchParams.get("contact") || "").trim();
      const list = await env.REPORTS.list({ prefix: "switch:", limit: 1000 });
      const keys = list.keys.map((k) => k.name).sort().reverse();
      const out = [];
      for (const k of keys) {
        if (want && !k.endsWith(":" + want)) continue;
        const v = await env.REPORTS.get(k, "json");
        if (v) out.push(v);
        if (out.length >= 100) break;
      }
      return json({ count: out.length, submissions: out }, 200, origin);
    }

    // ------------------------------------------------------- the packs queue
    // Every row, what state it is in, and for a blocked row exactly why. This is how
    // Shannon or I answer "did she get her text" without guessing.
    if (request.method === "GET" && url.pathname === "/packlog") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      if (!env.REPORTS) return json({ error: "no KV bound" }, 500, origin);
      const list = await env.REPORTS.list({ prefix: "packsend:", limit: 500 });
      const rows = [];
      const tally = {};
      for (const k of list.keys) {
        const v = await env.REPORTS.get(k.name, "json");
        if (!v) continue;
        tally[v.state] = (tally[v.state] || 0) + 1;
        rows.push(v);
      }
      rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      return json({ mode: String(env.SEND_MODE || "off"), tally, count: rows.length,
                    rows }, 200, origin);
    }

    // Run the queue by hand. Same code the cron runs, no shortcuts, same guards.
    if (request.method === "GET" && url.pathname === "/packrun") {
      if (url.searchParams.get("k") !== readKey(env)) return new Response("no", { status: 403 });
      const r = await processQueue(env);
      return json({ mode: String(env.SEND_MODE || "off"), ...r }, 200, origin);
    }

    // ----------------------------------------------------------- a packs page
    // GET /<name> on packs.ismyhometoxic.com. Served straight out of KV, so the link
    // in a text works the instant the page is built.
    if (request.method === "GET") {
      const slug = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
      if (slug && /^[a-z0-9-]{1,40}$/.test(slug) && env.REPORTS) {
        const page = await env.REPORTS.get("packpage:" + slug, "json");
        if (page && page.html) {
          return new Response(page.html, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Robots-Tag": "noindex, nofollow",
            },
          });
        }
      }
      return new Response(NOT_FOUND, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8",
                   "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, origin);
    }

    // ------------------------------------------------- a checklist submission
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return json({ error: "bad json" }, 400, origin);
    }

    const contactId = String(data.contact_id || "").trim();
    const score = Number(data.score) || 0;
    const count = Number(data.count) || 0;
    const items = Array.isArray(data.items) ? data.items : [];

    // Shannon, 2026-08-30: ask where they already shop, before the checklist.
    // Comes off a public form, so it is clamped hard: at most 12 entries, 40 characters
    // each, and the free text capped at 120. It is never scored and never touches a
    // package. It exists so she walks into the call already knowing where their money
    // goes now.
    const stores = (Array.isArray(data.stores) ? data.stores : [])
      .filter(function (x) { return typeof x === "string" && x.trim(); })
      .slice(0, 12)
      .map(function (x) { return x.trim().slice(0, 40); });
    const storesOther = String(data.storesOther || "").trim().slice(0, 120);

    const rec = {
      at: new Date().toISOString(),
      contact_id: contactId || null,
      score,
      count,
      items,
      stores,
      storesOther,
      origin,
      saved: false,
      outcome: "pending",
    };
    const logKey = await logSubmission(env, rec);

    if (!ID_OK.test(contactId)) {
      await markLog(env, logKey, { outcome: "no valid contact id" });
      return json({ ok: false, saved: false, reason: "no valid contact id" }, 200, origin);
    }

    // Queue the packs page and the text. Writes one row and returns. Sends nothing.
    // Wrapped so that a queue problem can never cost her the score note below.
    try {
      await queuePackSend(env, rec);
    } catch (e) { /* the note is the job that must not fail */ }

    const byGroup = {};
    for (const it of items) {
      const g = String(it.group || "Other").slice(0, 60);
      const l = String(it.label || "").slice(0, 80);
      if (!l) continue;
      (byGroup[g] = byGroup[g] || []).push(l);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    let body = `SWITCH CHECKLIST  ${stamp}\n`;
    body += `Score ${score}   |   ${count} products they already buy elsewhere\n`;
    for (const g of Object.keys(byGroup)) {
      body += `\n${g}\n`;
      for (const l of byGroup[g]) body += `  - ${l}\n`;
    }
    if (!items.length) body += "\nNothing was selected.\n";
    body = body.slice(0, 8000);

    try {
      const r0 = await fetch(`${GHL}/contacts/${contactId}/notes`, {
        headers: {
          Authorization: `Bearer ${env.GHL_TOKEN}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      });
      if (r0.ok) {
        const j0 = await r0.json();
        const already = ((j0 && j0.notes) || []).some((x) =>
          String(x.body || "").toUpperCase().indexOf("SWITCH CHECKLIST") >= 0 &&
          String(x.dateAdded || "").slice(0, 10) === stamp);
        if (already) {
          await markLog(env, logKey, { outcome: "duplicate, already filed today" });
          return json({ ok: true, saved: true, duplicate: true }, 200, origin);
        }
      }
    } catch (e) { /* if the check fails, go ahead and file it. */ }

    let res;
    try {
      res = await fetch(`${GHL}/contacts/${contactId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GHL_TOKEN}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ body }),
      });
    } catch (e) {
      await markLog(env, logKey, { outcome: "fetch threw: " + String(e && e.message || e) });
      return json({ ok: false, saved: false, reason: "network" }, 200, origin);
    }

    if (!res.ok) {
      const detail = await res.text();
      console.log("GHL note failed", res.status, detail.slice(0, 300));
      await markLog(env, logKey, {
        outcome: "GHL " + res.status,
        detail: detail.slice(0, 300),
      });
      return json({ ok: false, saved: false, status: res.status }, 200, origin);
    }

    const out = await res.json();
    const noteId = (out && out.note && out.note.id) || null;
    await markLog(env, logKey, { saved: true, outcome: "saved", note_id: noteId });
    return json({ ok: true, saved: true, noteId }, 200, origin);
  },

  // Every 5 minutes. A few minutes after she finishes the list she gets the text, which
  // reads more like Shannon actually looked at it than an instant reply would.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processQueue(env));
  },
};
