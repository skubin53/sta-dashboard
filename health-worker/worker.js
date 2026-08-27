/**
 * sta-health  -  switchtoamericahealth.com and chat.switchtoamericahealth.com
 *
 * WHY THIS IS A SEPARATE WORKER AND NOT A ROUTE ON sta-checkout
 *
 * On 2026-08-26 the whole sta-checkout worker was bound to switchtoamericahealth.com as a
 * Workers Custom Domain. A Custom Domain has NO path scoping, so the $7 audit checkout
 * answered at the root of a health-branded domain. Shannon: "you did change that on your
 * own judgement. Put the $7 audit back where it was." It was reverted the same day.
 *
 * sta-checkout now runs on LIVE Stripe keys (STRIPE_PK = pk_live_). It takes real money.
 * Adding hostname branching inside it would have worked, but it puts the payment worker at
 * risk for a change that has nothing to do with payments, and every future route added to
 * that worker would silently become reachable on the health domain again.
 *
 * So this is its own worker. The checkout cannot leak onto these hostnames because the
 * checkout code is not in this file. That is the whole point.
 *
 * WHAT IT SERVES
 *   switchtoamericahealth.com/            Shannon's bio page
 *   chat.switchtoamericahealth.com/       the AI chat
 *   .../ask /ask-google /ask-signin /ask-verify   proxied to sta-checkout, which holds
 *                                                 the Anthropic key and the chat index
 *   anything else                         302 to /   (fail closed, never fall through)
 *
 * The bio page lives in the sta-dashboard repo, so editing it is a git push and needs no
 * redeploy here. Same pattern as the Look Us Up page. It is deliberately NOT inlined:
 * page markup inside a template literal loses its backslashes and `node --check` passes
 * anyway, which has cost a whole broken page before.
 */

const BIO_URL = "https://scan.ismyhometoxic.com/switchtoamericahealth/index.html";
const UPSTREAM = "https://sta-checkout.theshannonnicole.workers.dev";

// The chat page's own XHR calls. Anything not here does not reach the upstream worker.
const CHAT_API = new Set(["/ask", "/ask-google", "/ask-signin", "/ask-verify"]);
const CHAT_PAGE = new Set(["/chat", "/ask-shannon"]);

const HOSTS = {
  "switchtoamericahealth.com": "bio",
  "www.switchtoamericahealth.com": "bio",
  "chat.switchtoamericahealth.com": "chat",
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();
    const p = url.pathname.replace(/\/+$/, "") || "/";
    const role = HOSTS[host] || "bio";

    // ---- the chat's API calls, proxied straight through --------------------
    // Method, headers and body are preserved so sign-in and streaming behave the same as
    // they do on the workers.dev origin.
    if (CHAT_API.has(p)) {
      const target = UPSTREAM + url.pathname + url.search;
      const r = await env.CHECKOUT.fetch(new Request(target, req));
      const h = new Headers(r.headers);
      h.delete("content-encoding");
      h.delete("content-length");
      return new Response(r.body, { status: r.status, headers: h });
    }

    // ---- the chat page itself ----------------------------------------------
    if (CHAT_PAGE.has(p) || (role === "chat" && p === "/")) {
      let r;
      try {
        r = await env.CHECKOUT.fetch(new Request(UPSTREAM + "/chat"));
      } catch (e) {
        return new Response("Temporarily unavailable", { status: 503 });
      }
      if (!r.ok) return new Response("Temporarily unavailable", { status: 503 });
      return new Response(r.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Frame-Options": "SAMEORIGIN",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      });
    }

    // ---- the bio page -------------------------------------------------------
    if (role === "bio" && p === "/") {
      let r;
      try {
        r = await fetch(BIO_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
      } catch (e) {
        return new Response("Temporarily unavailable", { status: 503 });
      }
      if (!r.ok) return new Response("Temporarily unavailable", { status: 503 });
      return new Response(r.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Frame-Options": "SAMEORIGIN",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      });
    }

    // ---- fail closed --------------------------------------------------------
    // Not a 404. Anything unrecognised goes to the front door of whichever hostname it
    // arrived on, so a stray or guessed path can never surface something that was never
    // meant to live on this domain.
    return Response.redirect(url.origin + "/", 302);
  },
};
