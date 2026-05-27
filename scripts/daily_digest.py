"""Daily 6am MT job — refresh data + email Shannon her digest.

Runs in GitHub Actions at 12:00 UTC (= 6am MDT summer / 5am MST winter).

Sequence:
  1. Pull last 90d of GHL contacts (incremental)
  2. Pull GHL opportunities (current state)
  3. Pull GHL appointments (180d back + 60d forward)
  4. Pull last 90d of Meta ad insights
  5. Build today's HTML digest
  6. Send via GHL email API to Shannon's contact

After the script runs, the workflow commits the refreshed
data/dashboard.db so Streamlit Cloud auto-redeploys with fresh data —
which means the daily email AND the live dashboard both stay fresh
without any manual intervention.
"""
from __future__ import annotations
import json, re, sqlite3, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
import requests
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "dashboard.db"

# These are also in streamlit_app.py / hub.py. Private repo so embedding is fine.
GHL_PIT_TOKEN = "pit-04c7dc76-1b6e-450c-a726-68928a8c3a91"
GHL_LOCATION_ID = "pkNKuHS8wz0aQmZKEXHr"
GHL_BASE = "https://services.leadconnectorhq.com"
GHL_HEADERS = {"Authorization": f"Bearer {GHL_PIT_TOKEN}", "Version": "2021-07-28",
               "Accept": "application/json", "Content-Type": "application/json"}
META_ACCESS_TOKEN = "EAASnLDAf7twBRqtlqacqQywbP5AZAbfZCo9TxbDKsDF8yRV1V4dBzEchslOpdVA0tZA0lmpZAPazFejcTY45gM6PcGdqNz8L2mZAnCWO7W5vIwPTDhiLgIwpUfrRpUO7yLoA59N1JiHK6P97LPoo5wI4xH01DpXgES4a4lzUWmHBcH0pb0uCzMKCDXZC7OGJ8KGSLlvBOGZA8eEJQZDZD"
META_BASE = "https://graph.facebook.com/v19.0"
STA_AD_ACCOUNT = "act_1160695693945424"
SHANNON_CONTACT_ID = "Ewylm2gm9RcC4JBEbLXI"
PIPELINE_ID = "RpBQfqFQk6iHXvIgkD5U"   # Switch to America
STA_CALENDARS = {
    "MFE31N22BzC6yUkKhjfk": "Switch To America",
    "VcaBdXq7kJAAb3q9lwVu": "Switch to America - Facebook",
    "wz7NpKeOERbYhUsmEfff": "Switch To America!",
    "tutfx6nixvxzqsdolstb": "Copy of Switch To America",
    "bfmvjAoI4FxLd2cOyn9c": "Shannon",
    "tS0J4P5TcSyAxL79gcR5": "Switch to America - Paula",
    "xRWH8ROP4UOsxNCyyxGf": "Switch to America - Stacey Joe",
    "1cSkufApIXXOrrDSlsfn": "Switch to America - Dawn",
    "8KyVN97V9STkCZ8fv8tm": "Switch to America - Cheryl Evans",
    "Uu9A7T3weNNMrqGDXhSh": "Switch to America - Nino",
    "KgyGVSZoQc9SPrhVG6Hr": "Switch to America - Danielle",
}

SHOPPER_TAGS = ["shopped", "shopped cat 1", "shopped cat 2", "shopped beef",
                "staceybshopper", "placed order"]
EXCLUDE_TAGS = SHOPPER_TAGS + ["already enrolled", "booked", "dnd", "not interested"]


def log(msg):
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}Z] {msg}", flush=True)


# ───────────────────── SYNCS ─────────────────────────────────────────

def pull_contacts(since_days=90):
    log(f"Pulling GHL contacts (since {since_days}d)…")
    now_iso = datetime.now(timezone.utc).isoformat()
    cutoff_ms = int((datetime.now(timezone.utc) - timedelta(days=since_days)).timestamp() * 1000)
    cx = sqlite3.connect(DB_PATH)
    rows = 0
    sa = sai = None
    page = 0
    while True:
        page += 1
        params = {"locationId": GHL_LOCATION_ID, "limit": 100}
        if sa and sai: params["startAfter"] = sa; params["startAfterId"] = sai
        for attempt in range(4):
            try:
                r = requests.get(f"{GHL_BASE}/contacts/", headers=GHL_HEADERS, params=params, timeout=30)
                if r.status_code == 429: time.sleep(2 ** attempt); continue
                r.raise_for_status(); data = r.json(); break
            except requests.RequestException:
                if attempt == 3: raise
                time.sleep(2 ** attempt)
        contacts = data.get("contacts") or []
        if not contacts: break
        for c in contacts:
            _upsert_contact(cx, c, now_iso)
            rows += 1
        cx.commit()
        meta = data.get("meta") or {}
        sa = meta.get("startAfter"); sai = meta.get("startAfterId")
        stop = False
        try:
            last_dt = datetime.fromisoformat((contacts[-1].get("dateUpdated") or "").replace("Z", "+00:00"))
            if last_dt.timestamp() * 1000 < cutoff_ms: stop = True
        except Exception: pass
        if stop or not (sa and sai): break
        time.sleep(0.15)
    log(f"  Contacts pulled: {rows} across {page} pages")
    cx.close()


def _attr(attributions):
    out = {f"first_utm_{k}": None for k in ["source", "medium", "campaign", "content", "term"]}
    out["first_fbclid"] = None; out["first_page_url"] = None
    out.update({f"last_utm_{k}": None for k in ["source", "campaign", "content", "term"]})
    if not isinstance(attributions, list): return out
    for a in attributions:
        if not isinstance(a, dict): continue
        is_first = a.get("isFirst"); is_last = a.get("isLast")
        prefix = "first_" if is_first else ("last_" if is_last else "")
        if not prefix: continue
        for k in ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"]:
            snake = re.sub(r"([A-Z])", r"_\1", k).lower()  # utmSource -> utm_source
            key = f"{prefix}{snake}"
            if key in out and a.get(k): out[key] = a.get(k)
        if is_first:
            if a.get("fbclid"): out["first_fbclid"] = a.get("fbclid")
            if a.get("url"): out["first_page_url"] = a.get("url")
    return out


def _upsert_contact(cx, c, now_iso):
    a = _attr(c.get("attributions"))
    cx.execute("""INSERT OR REPLACE INTO contacts
        (id, first_name, last_name, email, phone, country, timezone, source, type, dnd,
         date_added, date_updated, tags_json, custom_json,
         first_utm_source, first_utm_medium, first_utm_campaign, first_utm_content, first_utm_term,
         first_fbclid, first_page_url, last_utm_source, last_utm_campaign, last_utm_content, last_utm_term,
         pipeline_id, pipeline_stage_id, pipeline_stage_name, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
        c.get("id"), c.get("firstName"), c.get("lastName"), c.get("email"), c.get("phone"),
        c.get("country"), c.get("timezone"), c.get("source"), c.get("type"),
        1 if c.get("dnd") else 0,
        c.get("dateAdded"), c.get("dateUpdated"),
        json.dumps(c.get("tags") or []), json.dumps(c.get("customFields") or []),
        a["first_utm_source"], a["first_utm_medium"], a["first_utm_campaign"],
        a["first_utm_content"], a["first_utm_term"],
        a["first_fbclid"], a["first_page_url"],
        a["last_utm_source"], a["last_utm_campaign"], a["last_utm_content"], a["last_utm_term"],
        None, None, None, now_iso))


def pull_opportunities():
    log("Pulling GHL opportunities…")
    # Get stages
    r = requests.get(f"{GHL_BASE}/opportunities/pipelines", headers=GHL_HEADERS,
                     params={"locationId": GHL_LOCATION_ID}, timeout=20)
    stages = {}
    for p in r.json().get("pipelines", []):
        if p.get("id") == PIPELINE_ID:
            for s in p.get("stages", []):
                stages[s.get("id")] = s.get("name")
    cx = sqlite3.connect(DB_PATH)
    cx.execute("DELETE FROM opportunities WHERE pipeline_id = ?", (PIPELINE_ID,))
    params = {"location_id": GHL_LOCATION_ID, "pipeline_id": PIPELINE_ID, "limit": 100}
    inserted = 0
    while True:
        r = requests.get(f"{GHL_BASE}/opportunities/search", headers=GHL_HEADERS, params=params, timeout=30)
        if r.status_code != 200: break
        data = r.json()
        opps = data.get("opportunities", [])
        if not opps: break
        rows = [(o.get("id"), o.get("contactId"), o.get("pipelineId"), o.get("pipelineStageId"),
                 stages.get(o.get("pipelineStageId"), ""), o.get("name"), o.get("status"),
                 o.get("monetaryValue") or 0, o.get("createdAt"), o.get("updatedAt"),
                 o.get("lastStageChangeAt"), o.get("source")) for o in opps]
        cx.executemany("INSERT OR REPLACE INTO opportunities VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        cx.commit()
        inserted += len(rows)
        meta = data.get("meta", {}) or {}
        sa = meta.get("startAfter"); sai = meta.get("startAfterId")
        if not (sa and sai): break
        params["startAfter"] = sa; params["startAfterId"] = sai
        time.sleep(0.08)
    log(f"  Opportunities pulled: {inserted}")
    cx.close()


def pull_appointments():
    log("Pulling GHL appointments (180d back + 60d forward)…")
    cx = sqlite3.connect(DB_PATH)
    now = datetime.now(timezone.utc)
    chunks = []
    for i in range(-180, 60, 30):
        s = now + timedelta(days=i); e = now + timedelta(days=min(i + 30, 60))
        chunks.append((int(s.timestamp() * 1000), int(e.timestamp() * 1000)))
    total = 0
    for cal_id, cal_name in STA_CALENDARS.items():
        for start_ms, end_ms in chunks:
            r = requests.get(f"{GHL_BASE}/calendars/events", headers=GHL_HEADERS,
                             params={"locationId": GHL_LOCATION_ID, "calendarId": cal_id,
                                     "startTime": start_ms, "endTime": end_ms}, timeout=30)
            if r.status_code != 200: continue
            evts = r.json().get("events", [])
            rows = [(e.get("id"), e.get("contactId"), cal_id, cal_name,
                     (e.get("title") or "")[:200], e.get("appointmentStatus"),
                     e.get("startTime"), e.get("endTime"), e.get("dateAdded"),
                     e.get("dateUpdated"), e.get("address"), (e.get("notes") or "")[:500],
                     e.get("assignedUserId")) for e in evts]
            if rows:
                cx.executemany("INSERT OR REPLACE INTO appointments VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
                cx.commit()
                total += len(rows)
            time.sleep(0.05)
    log(f"  Appointments pulled: {total}")
    cx.close()


def pull_meta_demographics(days=90):
    """Pull age+gender and region breakdowns of insights."""
    log(f"Pulling Meta demographics (last {days}d)…")
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    cx = sqlite3.connect(DB_PATH)
    cx.execute('''CREATE TABLE IF NOT EXISTS ad_insights_demo (
        date TEXT, ad_id TEXT, ad_name TEXT, campaign_id TEXT, campaign_name TEXT,
        adset_id TEXT, adset_name TEXT, age TEXT, gender TEXT,
        spend_cad REAL, impressions INTEGER, clicks INTEGER, leads INTEGER, synced_at TEXT,
        PRIMARY KEY (date, ad_id, age, gender))''')
    cx.execute('''CREATE TABLE IF NOT EXISTS ad_insights_region (
        date TEXT, ad_id TEXT, ad_name TEXT, campaign_id TEXT, campaign_name TEXT,
        adset_id TEXT, adset_name TEXT, region TEXT,
        spend_cad REAL, impressions INTEGER, clicks INTEGER, leads INTEGER, synced_at TEXT,
        PRIMARY KEY (date, ad_id, region))''')
    cx.execute("DELETE FROM ad_insights_demo")
    cx.execute("DELETE FROM ad_insights_region")
    cx.commit()
    fields = "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions"
    for bd, table, col in [("age,gender", "demo", None), ("region", "region", "region")]:
        url = f"{META_BASE}/{STA_AD_ACCOUNT}/insights"
        params = {"access_token": META_ACCESS_TOKEN, "level": "ad", "fields": fields,
                  "breakdowns": bd, "time_increment": 1, "limit": 500,
                  "time_range": json.dumps({"since": str(start), "until": str(end)})}
        inserted = 0
        while url:
            r = requests.get(url, params=params, timeout=120)
            if r.status_code != 200: break
            data = r.json()
            now_iso = datetime.now(timezone.utc).isoformat()
            rows = []
            for d in data.get("data", []):
                leads = 0
                for a in (d.get("actions") or []):
                    if a.get("action_type") in ("lead", "onsite_conversion.lead_grouped"):
                        try: leads += int(a.get("value", 0))
                        except: pass
                base = (d.get("date_start"), d.get("ad_id"), d.get("ad_name"),
                        d.get("campaign_id"), d.get("campaign_name"),
                        d.get("adset_id"), d.get("adset_name"))
                if table == "demo":
                    rows.append(base + (d.get("age"), d.get("gender"),
                                float(d.get("spend") or 0), int(d.get("impressions") or 0),
                                int(d.get("clicks") or 0), leads, now_iso))
                else:
                    rows.append(base + (d.get("region"),
                                float(d.get("spend") or 0), int(d.get("impressions") or 0),
                                int(d.get("clicks") or 0), leads, now_iso))
            if rows:
                placeholders = ",".join(["?"] * len(rows[0]))
                cx.executemany(f"INSERT OR REPLACE INTO ad_insights_{table} VALUES ({placeholders})", rows)
                cx.commit()
                inserted += len(rows)
            url = (data.get("paging") or {}).get("next"); params = None
        log(f"  {bd}: {inserted} rows")
    cx.close()


def pull_meta_insights(days=90):
    log(f"Pulling Meta insights (last {days}d)…")
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    cx = sqlite3.connect(DB_PATH)
    cx.execute("DELETE FROM ad_insights WHERE ad_account_id = ?", (STA_AD_ACCOUNT,))
    fields = "date_start,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,inline_link_clicks,cpm,cpc,ctr,actions,cost_per_action_type"
    url = f"{META_BASE}/{STA_AD_ACCOUNT}/insights"
    params = {"access_token": META_ACCESS_TOKEN, "level": "ad", "fields": fields,
              "time_increment": 1, "limit": 500, "time_range": json.dumps({"since": str(start), "until": str(end)})}
    inserted = 0
    while url:
        r = requests.get(url, params=params, timeout=60)
        if r.status_code != 200:
            log(f"  Meta error: {r.text[:200]}"); break
        data = r.json()
        now_iso = datetime.now(timezone.utc).isoformat()
        rows = []
        for d in data.get("data", []):
            leads = 0
            for a in (d.get("actions") or []):
                if a.get("action_type") in ("lead", "onsite_conversion.lead_grouped"):
                    try: leads += int(a.get("value", 0))
                    except: pass
            spend = float(d.get("spend") or 0) * 1.0  # already CAD for STA acct
            rows.append((d.get("date_start"), STA_AD_ACCOUNT, d.get("campaign_id"), d.get("campaign_name"),
                         d.get("adset_id"), d.get("adset_name"), d.get("ad_id"), d.get("ad_name"),
                         spend, int(d.get("impressions") or 0), int(d.get("reach") or 0),
                         int(d.get("clicks") or 0), int(d.get("inline_link_clicks") or 0),
                         float(d.get("cpm") or 0), float(d.get("cpc") or 0), float(d.get("ctr") or 0),
                         leads, 0, now_iso))
        if rows:
            cx.executemany("INSERT OR REPLACE INTO ad_insights VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
            cx.commit()
            inserted += len(rows)
        url = (data.get("paging") or {}).get("next")
        params = None
    log(f"  Ad insight rows pulled: {inserted}")
    cx.close()


# ───────────────────── DIGEST + SEND ─────────────────────────────────

def _has_any_tag(tags_json, needles):
    try: tags = [str(t).lower() for t in (json.loads(tags_json or "[]") or [])]
    except Exception: return False
    return any(n in tags for n in needles)


def _first(s, n=80):
    if not s or pd.isna(s): return ""
    s = str(s).strip()
    if len(s) <= n: return s
    return s[:n].rsplit(" ", 1)[0].rstrip(".,;:") + "…"


def _draft_sms(row):
    """Mirrors draft_outreach() SMS branch in streamlit_app.py."""
    name = (row.get("first_name") or "").strip().title() or "there"
    convo = (row.get("convo_summary") or "").strip()
    mission = (row.get("mission") or "").strip()
    interest = (row.get("interest_level") or "").strip().lower()
    video = (row.get("video_watched") or "").strip().lower()
    try: tags = [str(t).lower() for t in (json.loads(row.get("tags_json") or "[]") or [])]
    except: tags = []
    has = lambda *n: any(any(x in t for x in n) for t in tags)
    if mission:
        return f"Hey {name}! You mentioned wanting {_first(mission,70).lower()}. I think we can actually help — got 10 min this week? — Shannon"
    if convo and len(convo) > 15:
        return f"Hi {name}, was just looking back at where we left off: {_first(convo,90)} — want to pick that up? — Shannon"
    if has("hot lead"):
        return f"Hey {name}! Looks like you're ready to take the next step — want to grab 10 min this week to make it happen? — Shannon"
    if "75" in video or "100" in video or "complete" in video:
        return f"Hi {name}! Saw you watched a good chunk of the video. Curious what stood out — and what's holding you back? — Shannon"
    if interest in ("very high", "high", "extremely high"):
        return f"Hey {name}! Your responses said you're really aligned with what we do. Want to jump on a 10-min call this week? — Shannon"
    return f"Hi {name}! Wanted to circle back personally — what would be most helpful right now: a quick call, more info, or something else? — Shannon"


def _predict_show(contact_row, apt):
    pct = 75.0; signals = []
    try: score = int(contact_row.get("score") or 0)
    except: score = 0
    if score >= 80: pct += 20; signals.append("✅ score 80+")
    elif score >= 50: pct += 5
    else: pct -= 8; signals.append("⚠️ score under 50")
    try: tags = [str(t).lower() for t in (json.loads(contact_row.get("tags_json") or "[]") or [])]
    except: tags = []
    if any("no show" in t for t in tags): pct -= 50; signals.append("🚨 previous no-show")
    if any("hot lead" in t for t in tags): pct += 20; signals.append("✅ hot lead tag")
    s, da = apt.get("start_time"), apt.get("date_added")
    if pd.notna(s) and pd.notna(da):
        d = (s - da).total_seconds() / 86400
        if 7 <= d < 14: pct += 12; signals.append(f"✅ booked {int(d)}d out")
        elif 1 <= d < 3: pct -= 5; signals.append("⚠️ cold-zone booking")
    if pd.notna(s):
        if s.day_name() == "Wednesday": pct += 10; signals.append("✅ Wednesday slot")
        elif s.day_name() == "Sunday": pct -= 8; signals.append("⚠️ Sunday slot")
    return int(round(max(5, min(95, pct)))), signals


CF_INTEREST = "UQPGxIfHy8NSvyg2Mkuy"
CF_FIN = "6c688ouMMXKIv4gR4Oa2"
CF_VID = "tuw7WtjfJHXxjU3CRT1o"
CF_MISSION = "lBBFdNqtuwM9GDybeRc0"
CF_CONVO = "UkM9h3rYcHcvRBrV060q"
CF_AI_RESPONSE = "sJR44dmIdWLMh9Zlj2gP"  # 211 contacts populated — used as convo fallback
CF_FIN_GOALS = "6qHZqcNynJRziF4HQT3v"   # 57 contacts populated


def _cf_val(json_str, fid):
    """Extract a custom-field value by id. GHL custom_json is a dict
    keyed by field id (legacy) OR a list of {id,value} dicts. Handle both."""
    try:
        d = json.loads(json_str or "[]")
    except Exception:
        return ""
    if isinstance(d, dict):
        return d.get(fid) or ""
    if isinstance(d, list):
        for f in d:
            if isinstance(f, dict) and f.get("id") == fid:
                return f.get("value") or f.get("fieldValueString") or ""
    return ""


def build_digest_html():
    cx = sqlite3.connect(DB_PATH)
    contacts = pd.read_sql_query("SELECT * FROM contacts", cx)
    if contacts.empty: return None
    contacts["date_added"] = pd.to_datetime(contacts["date_added"], errors="coerce", utc=True)
    contacts["date_updated"] = pd.to_datetime(contacts["date_updated"], errors="coerce", utc=True)
    # Extract custom fields the draft_sms logic relies on
    contacts["interest_level"] = contacts["custom_json"].apply(lambda j: _cf_val(j, CF_INTEREST))
    contacts["video_watched"]  = contacts["custom_json"].apply(lambda j: _cf_val(j, CF_VID))
    contacts["mission"]        = contacts["custom_json"].apply(lambda j: _cf_val(j, CF_MISSION))
    contacts["fin_importance"] = contacts["custom_json"].apply(lambda j: _cf_val(j, CF_FIN))
    # convo_summary falls back to Latest AI Response (211 populated)
    contacts["convo_summary"]  = contacts["custom_json"].apply(
        lambda j: _cf_val(j, CF_CONVO) or _cf_val(j, CF_AI_RESPONSE))
    contacts["is_shopper"] = contacts["tags_json"].apply(lambda j: _has_any_tag(j, SHOPPER_TAGS))
    contacts["in_scope"] = contacts["tags_json"].apply(lambda j: not _has_any_tag(j, EXCLUDE_TAGS))
    now_utc = pd.Timestamp.utcnow()
    contacts["days_since_activity"] = ((now_utc - contacts["date_updated"]).dt.total_seconds() / 86400).round().astype("Int64")
    # Simple score proxy from existing 'score' column if present
    if "score" in contacts.columns:
        contacts["smart_score"] = pd.to_numeric(contacts["score"], errors="coerce").fillna(0).astype(int)
    else:
        contacts["smart_score"] = 50

    try:
        ads = pd.read_sql_query("SELECT * FROM ad_insights", cx)
        ads["date"] = pd.to_datetime(ads["date"], errors="coerce")
    except Exception:
        ads = pd.DataFrame()
    try:
        apts = pd.read_sql_query("SELECT * FROM appointments", cx)
        apts["start_time"] = pd.to_datetime(apts["start_time"], errors="coerce", utc=True)
        apts["date_added"] = pd.to_datetime(apts["date_added"], errors="coerce", utc=True)
    except Exception:
        apts = pd.DataFrame()
    cx.close()

    now_naive = now_utc.tz_localize(None)
    yest = now_naive.normalize() - pd.Timedelta(days=1)
    today_start = now_naive.normalize()
    y_leads = contacts[(contacts["date_added"] >= yest.tz_localize("UTC"))
                       & (contacts["date_added"] < today_start.tz_localize("UTC"))]
    y_spend = float(ads[ads["date"] == yest]["spend_cad"].sum()) if not ads.empty else 0
    hot_pool = contacts[contacts["in_scope"]
                        & (contacts["date_added"] >= now_utc - pd.Timedelta(days=120))
                        & (contacts["smart_score"] >= 50)
                        & ((contacts["phone"].fillna("") != "") | (contacts["email"].fillna("") != ""))]
    stale = hot_pool[hot_pool["days_since_activity"].fillna(0) > 14].sort_values("smart_score", ascending=False)
    new_shop = contacts[contacts["is_shopper"] & (contacts["date_updated"] >= now_utc - pd.Timedelta(days=7))]
    today_label = pd.Timestamp.now().strftime("%A, %B %d, %Y")

    kpi = lambda label, val, sub, color: (
        f'<td style="background:{color};color:#fff;padding:14px 18px;border-radius:8px;text-align:left;vertical-align:top;">'
        f'<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;opacity:0.9;">{label}</div>'
        f'<div style="font-size:24px;font-weight:800;line-height:1.1;margin:4px 0;">{val}</div>'
        f'<div style="font-size:11px;opacity:0.85;">{sub}</div></td>')

    html = [f"""<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#222;">
<div style="max-width:680px;margin:0 auto;background:#fff;">
<div style="background:linear-gradient(135deg,#3C3B6E 0%,#8B1B2A 100%);color:#fff;padding:24px;">
  <div style="font-size:11px;letter-spacing:1.5px;opacity:0.85;text-transform:uppercase;">STA Daily Digest</div>
  <div style="font-size:28px;font-weight:800;margin-top:4px;">{today_label}</div>
  <div style="font-size:14px;opacity:0.9;margin-top:6px;">Your day at a glance — open the dashboard for full detail.</div>
</div>
<div style="padding:20px 24px;">
<table cellpadding="0" cellspacing="6" style="width:100%;border-collapse:separate;"><tr>
{kpi("Leads — yesterday", f"{len(y_leads):,}", "new contacts", "#3C3B6E")}
{kpi("Spend — yesterday", f"${y_spend:,.2f}", "CAD", "#B22234")}
{kpi("Hot to work", f"{len(hot_pool):,}", "score ≥ 50, reachable", "#3C3B6E")}
{kpi("Going cold", f"{len(stale):,}", "untouched 14d+", "#D4A017")}
</tr></table>
"""]
    # Upcoming appointments
    if not apts.empty:
        upcoming = apts[(apts["start_time"] >= now_utc) & (apts["status"].isin(["confirmed", "scheduled"]))]
        if not upcoming.empty:
            html.append('<h3 style="color:#3C3B6E;margin:24px 0 8px 0;">📅 Upcoming appointments</h3>')
            contacts_idx = contacts.set_index("id")
            for _, apt in upcoming.sort_values("start_time").head(10).iterrows():
                cid = apt.get("contact_id")
                c = contacts_idx.loc[cid].to_dict() if cid in contacts_idx.index else {}
                pct, sig = _predict_show(c, apt.to_dict())
                color = "#1F7A3A" if pct >= 75 else ("#D4A017" if pct >= 50 else "#8B1B2A")
                emoji = "🟢" if pct >= 75 else ("🟡" if pct >= 50 else "🔴")
                nm = f"{c.get('first_name') or ''} {c.get('last_name') or ''}".strip().title() or "(no name)"
                when = apt["start_time"].tz_convert("America/Edmonton").strftime("%a %b %-d, %-I:%M %p") if pd.notna(apt["start_time"]) else "—"
                html.append(f"""
<div style="background:#fff;border-left:5px solid {color};padding:8px 12px;margin:6px 0;border-radius:5px;font-size:13px;">
<table cellpadding="0" cellspacing="0" style="width:100%;"><tr>
<td><b style="color:#3C3B6E;">{emoji} {nm}</b> · <span style="color:#555;">{when}</span><br>
<span style="font-size:11px;color:#666;">{' · '.join(sig)}</span></td>
<td style="text-align:right;width:60px;"><span style="background:{color};color:#fff;font-weight:800;padding:4px 10px;border-radius:14px;font-size:14px;">{pct}%</span></td>
</tr></table></div>""")
    # Top 5 to text
    top5 = hot_pool.sort_values("smart_score", ascending=False).head(5)
    if not top5.empty:
        html.append('<h3 style="color:#3C3B6E;margin:24px 0 8px 0;">📞 Call or text these 5 today</h3>')
        for _, r in top5.iterrows():
            rr = dict(r)
            sms = _draft_sms(rr)
            nm = f"{rr.get('first_name') or ''} {rr.get('last_name') or ''}".strip().title()
            score = int(rr.get("smart_score") or 0)
            color = "#1F7A3A" if score >= 75 else "#D4A017"
            phone = rr.get("phone") or rr.get("email") or "—"
            html.append(f"""
<div style="background:#fff;border:2px solid {color};border-radius:8px;padding:10px 14px;margin:8px 0;font-size:13px;">
<table cellpadding="0" cellspacing="0" style="width:100%;"><tr>
<td><b style="color:#3C3B6E;font-size:14px;">{nm}</b><br><span style="font-size:12px;color:#666;">{phone}</span></td>
<td style="text-align:right;width:50px;"><span style="background:{color};color:#fff;font-weight:800;padding:3px 10px;border-radius:14px;font-size:13px;">{score}</span></td>
</tr></table>
<div style="margin-top:8px;padding:8px;background:#f6f6f6;border-radius:5px;font-size:12px;color:#333;font-style:italic;">{sms}</div>
</div>""")
    # Going cold
    if not stale.empty:
        html.append('<h3 style="color:#8B1B2A;margin:24px 0 8px 0;">⚠️ Going cold — recover these</h3>')
        html.append('<table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;">')
        html.append('<tr style="background:#3C3B6E;color:#fff;"><th align="left">Name</th><th align="left">Score</th><th align="left">Days quiet</th></tr>')
        for _, r in stale.head(5).iterrows():
            nm = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip().title()
            html.append(f'<tr style="border-bottom:1px solid #eee;"><td>{nm}</td><td>{int(r.get("smart_score") or 0)}</td><td>{int(r.get("days_since_activity") or 0)}d</td></tr>')
        html.append('</table>')
    # New shoppers
    if not new_shop.empty:
        html.append(f'<h3 style="color:#1F7A3A;margin:24px 0 8px 0;">🎉 {len(new_shop)} new shopper{"s" if len(new_shop)!=1 else ""} this week</h3>')
        for _, r in new_shop.head(8).iterrows():
            nm = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip().title()
            html.append(f'<div style="font-size:13px;padding:4px 0;">✅ <b>{nm}</b></div>')

    html.append("""
<div style="margin-top:30px;padding:18px;background:#f6f6f6;border-radius:8px;font-size:12px;color:#666;text-align:center;">
<a href="https://sta-dashboard-skubin.streamlit.app/" style="color:#3C3B6E;font-weight:700;text-decoration:none;">→ Open the full dashboard</a>
</div>
</div></div></body></html>""")
    return "".join(html)


def send_email(subject, html):
    body = {"type": "Email", "contactId": SHANNON_CONTACT_ID,
            "subject": subject, "html": html}
    r = requests.post(f"{GHL_BASE}/conversations/messages",
                      headers=GHL_HEADERS, json=body, timeout=30)
    log(f"  GHL send response: HTTP {r.status_code}")
    if r.status_code not in (200, 201, 202):
        log(f"  Body: {r.text[:300]}")
        return False
    return True


def main():
    if not DB_PATH.exists():
        log(f"DB not found at {DB_PATH}"); sys.exit(1)
    log("=== STA Daily Digest run ===")
    try: pull_meta_insights(days=90)
    except Exception as e: log(f"  ⚠️ Meta sync failed: {e}")
    try: pull_meta_demographics(days=90)
    except Exception as e: log(f"  ⚠️ Meta demographics sync failed: {e}")
    try: pull_contacts(since_days=90)
    except Exception as e: log(f"  ⚠️ Contacts sync failed: {e}")
    try: pull_opportunities()
    except Exception as e: log(f"  ⚠️ Opportunities sync failed: {e}")
    try: pull_appointments()
    except Exception as e: log(f"  ⚠️ Appointments sync failed: {e}")

    log("Building digest HTML…")
    html = build_digest_html()
    if not html:
        log("Digest empty — aborting send."); sys.exit(1)
    subject = f"STA Daily Digest — {datetime.now().strftime('%a %b %d')}"
    log(f"Sending email '{subject}' to Shannon's GHL contact…")
    ok = send_email(subject, html)
    log("Done." if ok else "Send failed.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
