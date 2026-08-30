
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
