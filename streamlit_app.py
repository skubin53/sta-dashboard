"""STA Dashboard - Cloud version. Reads from data/dashboard.db committed to repo."""
import json, re, sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pandas as pd
import streamlit as st
import plotly.graph_objects as go


def creative_key(name):
    """Roll up audience/phase prefixes so 'Best Post #1' and 'Interest: Open (Best Posts #1)'
    are recognized as the same creative concept across years of FB ad-ID churn."""
    if not name or pd.isna(name): return "(unattributed)"
    n = str(name).lower()
    rules = [
        (r'best\s*posts?\s*#?\s*(\d+)', lambda m: f'Best Post #{m.group(1)}'),
        (r'original\s*posts?\s*pt\s*(\d+)', lambda m: f'Original Posts PT{m.group(1)}'),
        (r'reel\s*0?(\d+)', lambda m: f'Reel {int(m.group(1)):02d}'),
        (r'(truth|save|shift|switch|detox|tour)\s*reel', lambda m: f'{m.group(1).upper()} Reel'),
        (r'post\s*#\s*(\d+)', lambda m: f'Post #{m.group(1)}'),
        (r'new\s*video\s*#\s*(\d+)', lambda m: f'Video #{m.group(1)}'),
        (r'new\s*image\s*#\s*(\d+)', lambda m: f'Image #{m.group(1)}'),
        (r'phase\s*2\s*-?\s*retarget', lambda m: 'Phase 2 Retarget'),
        (r'patriot\s*pride', lambda m: 'Patriot Pride'),
        (r'homesteading', lambda m: 'Homesteading'),
        (r'former\s*networkers', lambda m: 'Former Networkers'),
        (r'group\s*funnel', lambda m: 'Group Funnel Videos'),
        (r'new\s*videos', lambda m: 'NEW VIDEOS audience'),
        (r'beef', lambda m: 'Beef'),
    ]
    for pat, fn in rules:
        m = re.search(pat, n)
        if m: return fn(m)
    return str(name).strip()

DB_PATH = Path(__file__).resolve().parent / "data" / "dashboard.db"

RED = "#B22234"; BLUE = "#3C3B6E"; GOLD = "#D4A017"
WHITE = "#FFFFFF"; CREAM = "#FAFAFA"; DARK_RED = "#8B1B2A"; GREEN = "#1F7A3A"

CAMPAIGN_META = {
    "MM - Switch To America - Conversions": {"color": BLUE, "type": "lead_gen", "label": "Conversions"},
    "STA - Phase 2 Retarget":                {"color": RED,  "type": "lead_gen", "label": "Retarget"},
    "STA - Phase 1":                         {"color": GOLD, "type": "engagement", "label": "Engagement"},
}
ACTIVE_CAMPAIGN_NAMES = list(CAMPAIGN_META.keys())

CF_INTEREST = "UQPGxIfHy8NSvyg2Mkuy"
CF_FIN      = "6c688ouMMXKIv4gR4Oa2"
CF_VID      = "tuw7WtjfJHXxjU3CRT1o"
CF_GOALS    = "yueImTLblEdpeLQqZrCk"
CF_MISSION  = "lBBFdNqtuwM9GDybeRc0"
CF_CONVO    = "UkM9h3rYcHcvRBrV060q"

EXCLUDE_TAGS = ["shopped", "shopped cat 1", "shopped cat 2", "shopped beef",
    "booked", "appt confirmed", "appt set", "confirm sms", "scheduled",
    "already enrolled", "already member", "already a member",
    "dnd", "not interested", "cannot afford", "can't afford",
    "former member", "canceled membership", "cancelled membership"]
EXCLUDE_STAGE_NEEDLES = ["shopped", "appt confirmed", "booking request",
    "already enrolled", "dnd", "zap dnd", "not interested",
    "cannot afford", "cancelled membership", "no show"]
POS_TAGS = {"hot lead":35, "serious":15, "priority call a":20,
    "watched 75% thank you":15, "livevideo":10, "attended zoom":20,
    "first contact":5, "ai responded":8, "information sent":5, "vimeo sent":5}
INTEREST_MAP = {"i want to make the switch and learn how i can join":35,
    "i'm only interested in making the switch":15}
FIN_MAP = {"my future depends on making this work!":30,
    "just looking to make some extra money on the side":10, "not that important":-5}
VID_MAP = {"75%+":20, "50-75%":12, "25-50%":6, "less than 25%":0}
STAGE_BONUS = [("tour done - not shopped", 50), ("ai needs attention", 25),
    ("hot lead", 40), ("ai responded", 10), ("information sent", 15),
    ("email sent with info", 10), ("enroll link sent", 15),
    ("working contacted", 8), ("new lead", 5)]

FUNNEL_STAGES = [
    {"label": "All leads",            "tags": None},
    {"label": "New / First contact",  "tags": ["new lead","first contact","fbook/insta lp","new fb lead"]},
    {"label": "Engaged",              "tags": ["ai responded","working contacted","ai needs attention",
        "vimeo sent","vimeo video sent","information sent","link sent","enroll link sent","guest link sent",
        "bin video >75","bin video <=75","bin video <=50","watched 75% thank you","livevideo"]},
    {"label": "Booked / Hot lead",    "tags": ["hot lead","booked","appt confirmed","appt set","scheduled","confirm sms"]},
    {"label": "Shopped",              "tags": ["shopped","shopped cat 1","shopped cat 2","shopped cat 2/3","shopped beef","staceybshopper","placed order"]},
]
STAGE_COLORS = [BLUE, "#5B5E99", GOLD, RED, GREEN]
SHOPPER_TAGS = ["shopped","shopped cat 1","shopped cat 2","shopped cat 2/3","shopped beef","staceybshopper","placed order"]

def _safe_lower(v):
    if v is None: return ""
    if isinstance(v, float):
        try:
            if pd.isna(v): return ""
        except: return ""
    if not isinstance(v, str):
        try: v = str(v)
        except: return ""
    return v.lower()

def has_any_tag(tags_json, needles):
    try: tags = json.loads(tags_json or "[]")
    except: return False
    lowered = [_safe_lower(t) for t in tags if t]
    for n in needles:
        for t in lowered:
            if n in t: return True
    return False

def in_scope(tags, stage):
    lowered = [_safe_lower(t) for t in tags if t]
    for ex in EXCLUDE_TAGS:
        for t in lowered:
            if ex in t: return False
    s = _safe_lower(stage)
    if s:
        for ex in EXCLUDE_STAGE_NEEDLES:
            if ex in s: return False
    return True

def smart_score(row):
    try: tags = json.loads(row.get("tags_json") or "[]")
    except: tags = []
    try: custom = json.loads(row.get("custom_json") or "{}")
    except: custom = {}
    stage = row.get("pipeline_stage_name")
    scope = in_scope(tags, stage)
    if row.get("dnd"): return 0, ["DND"], False
    pts = 0; reasons = []
    s_lower = _safe_lower(stage)
    for needle, w in STAGE_BONUS:
        if needle in s_lower:
            pts += w; reasons.append(f"+{w} stage:{needle}"); break
    for tag in [_safe_lower(t) for t in tags if t]:
        for needle, w in POS_TAGS.items():
            if needle in tag:
                pts += w; reasons.append(f"+{w} tag:{needle}"); break
    interest = _safe_lower(custom.get(CF_INTEREST)).strip()
    for k, w in INTEREST_MAP.items():
        if k in interest: pts += w; reasons.append(f"+{w} interest"); break
    fin = _safe_lower(custom.get(CF_FIN)).strip()
    for k, w in FIN_MAP.items():
        if k in fin: pts += w; reasons.append(f"{'+' if w>=0 else ''}{w} fin"); break
    vid = (custom.get(CF_VID) or "")
    if isinstance(vid, str): vid = vid.strip()
    else: vid = ""
    if vid in VID_MAP and VID_MAP[vid]:
        pts += VID_MAP[vid]; reasons.append(f"+{VID_MAP[vid]} video:{vid}")
    goals = _safe_lower(custom.get(CF_GOALS))
    if "booking" in goals: pts += 15; reasons.append("+15 goal:booking")
    if "phone" in goals: pts += 5; reasons.append("+5 goal:phone")
    d = row.get("date_updated")
    if d is not None:
        try:
            dt = pd.to_datetime(d, utc=True, errors="coerce")
            if pd.notna(dt):
                days = (datetime.now(timezone.utc) - dt.to_pydatetime()).days
                if days <= 3: pts += 12; reasons.append("+12 active <=3d")
                elif days <= 7: pts += 8; reasons.append("+8 active <=7d")
                elif days <= 30: pts += 4; reasons.append("+4 active <=30d")
                elif days >= 180: pts -= 8; reasons.append(f"-8 stale {days}d")
                elif days >= 90: pts -= 4; reasons.append(f"-4 stale {days}d")
        except: pass
    return max(0, min(100, pts + 30)), reasons, scope

def is_fb_lp_lead(row):
    try: tags = json.loads(row.get("tags_json") or "[]")
    except: return False
    lowered = [_safe_lower(t) for t in tags if t]
    src_field = _safe_lower(row.get("source"))
    utm = _safe_lower(row.get("first_utm_source"))
    if any("messenger" in t for t in lowered): return False
    if "messenger" in src_field: return False
    if any("fbook/insta lp" in t for t in lowered): return True
    if any(t in ("facebook","new fb lead","new fb ads","fb lead week 2 starts","fb lead week 3 starts","fb lead week 4 starts") for t in lowered): return True
    if utm in ("fb","facebook","ig","instagram"): return True
    if "switch to america" in src_field or "fbook/insta lp" in src_field: return True
    return False

st.set_page_config(page_title="STA Dashboard", layout="wide", initial_sidebar_state="expanded")

st.markdown(f"""
<style>
.main {{ padding-top: 0.5rem; }}
[data-testid="stSidebar"] {{ background-color: {CREAM}; border-right: 4px solid {BLUE}; }}
.hero {{ background: linear-gradient(120deg, {BLUE} 0%, {RED} 100%); padding: 1.5rem 2rem; border-radius: 12px; color: {WHITE}; margin-bottom: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }}
.hero h1 {{ color: {WHITE} !important; margin: 0; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; }}
.hero p {{ color: rgba(255,255,255,0.85); margin: 0.4rem 0 0 0; font-size: 1rem; }}
.kpi-card {{ background: {WHITE}; border-radius: 10px; padding: 1.1rem 1.2rem; border-left: 6px solid {BLUE}; box-shadow: 0 2px 8px rgba(0,0,0,0.08); height: 100%; }}
.kpi-card.red {{ border-left-color: {RED}; }}
.kpi-card.gold {{ border-left-color: {GOLD}; }}
.kpi-card.green {{ border-left-color: {GREEN}; }}
.kpi-card .label {{ color: #666; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }}
.kpi-card .value {{ color: {BLUE}; font-size: 1.9rem; font-weight: 800; margin: 0.2rem 0; line-height: 1.1; }}
.kpi-card.red .value {{ color: {RED}; }}
.kpi-card.gold .value {{ color: {GOLD}; }}
.kpi-card.green .value {{ color: {GREEN}; }}
.kpi-card .sub {{ color: #888; font-size: 0.78rem; margin: 0; }}
.camp-card {{ background: {WHITE}; border-radius: 10px; padding: 1.1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); height: 100%; border-top: 5px solid {BLUE}; margin-bottom: 1rem; }}
.camp-card.red {{ border-top-color: {RED}; }}
.camp-card.gold {{ border-top-color: {GOLD}; }}
.camp-card h3 {{ margin: 0 0 0.2rem 0; font-size: 1rem; font-weight: 700; color: #222; line-height: 1.25; }}
.camp-card .objective {{ font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 0.6rem; }}
.camp-metrics {{ display: flex; gap: 0.8rem; margin: 0.8rem 0; flex-wrap: wrap; }}
.camp-metric {{ flex: 1; min-width: 70px; }}
.camp-metric .v {{ font-size: 1.35rem; font-weight: 800; color: {BLUE}; line-height: 1; }}
.camp-metric.red .v {{ color: {RED}; }}
.camp-metric.gold .v {{ color: {GOLD}; }}
.camp-metric .l {{ font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.2rem; }}
.daytable {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }}
.daytable th {{ text-align: left; padding: 0.4rem 0.5rem; background: {BLUE}; color: {WHITE}; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }}
.daytable.red th {{ background: {RED}; }}
.daytable.gold th {{ background: {GOLD}; }}
.daytable td {{ padding: 0.4rem 0.5rem; border-bottom: 1px solid #eee; }}
.daytable tr:last-child td {{ border-bottom: none; }}
.daytable tr:nth-child(even) {{ background: #fafafa; }}
.flag-strip {{ height: 6px; background: repeating-linear-gradient(90deg, {RED} 0, {RED} 14.28%, {WHITE} 14.28%, {WHITE} 28.57%); border-radius: 3px; margin-bottom: 1rem; }}
.bottleneck {{ background: linear-gradient(135deg, {RED} 0%, {DARK_RED} 100%); color: {WHITE}; padding: 1.4rem 1.8rem; border-radius: 12px; margin: 1.2rem 0; box-shadow: 0 4px 18px rgba(178,34,52,0.35); }}
.bottleneck .tag {{ display: inline-block; background: rgba(255,255,255,0.2); color: {WHITE}; padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 0.6rem; }}
.bottleneck h2 {{ color: {WHITE} !important; margin: 0; font-size: 1.5rem; font-weight: 800; }}
.bottleneck p {{ color: rgba(255,255,255,0.95); margin: 0.5rem 0 0 0; font-size: 1rem; line-height: 1.4; }}
.bottleneck .nums {{ display: flex; gap: 2rem; margin-top: 0.8rem; }}
.bottleneck .nums div {{ flex: 1; }}
.bottleneck .nums .n {{ font-size: 1.8rem; font-weight: 800; color: {WHITE}; line-height: 1; }}
.bottleneck .nums .l {{ font-size: 0.75rem; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; }}
.winner {{ background: linear-gradient(135deg, {GREEN} 0%, #155a2a 100%); color: {WHITE}; padding: 1.4rem 1.8rem; border-radius: 12px; margin: 1.2rem 0; box-shadow: 0 4px 18px rgba(31,122,58,0.35); }}
.winner .tag {{ display: inline-block; background: rgba(255,255,255,0.2); color: {WHITE}; padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 0.6rem; }}
.winner h2 {{ color: {WHITE} !important; margin: 0; font-size: 1.5rem; font-weight: 800; }}
.winner p {{ color: rgba(255,255,255,0.95); margin: 0.5rem 0 0 0; font-size: 1rem; line-height: 1.4; }}
.winner .nums {{ display: flex; gap: 2rem; margin-top: 0.8rem; }}
.winner .nums div {{ flex: 1; }}
.winner .nums .n {{ font-size: 1.8rem; font-weight: 800; color: {WHITE}; line-height: 1; }}
.winner .nums .l {{ font-size: 0.75rem; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; }}
</style>
""", unsafe_allow_html=True)

@st.cache_data(ttl=300)
def load_ad_lookup():
    """ad_id -> {ad_name, creative_key}. Built offline by resolving every distinct
    first_utm_term against Meta Graph API; lets us match historic shoppers to current
    creatives even though FB reissues ad IDs."""
    if not DB_PATH.exists(): return {}
    try:
        with sqlite3.connect(DB_PATH) as cx:
            rows = cx.execute("SELECT ad_id, ad_name FROM ad_lookup").fetchall()
    except sqlite3.OperationalError:
        return {}
    return {aid: {"ad_name": nm, "creative_key": creative_key(nm)} for aid, nm in rows}

@st.cache_data(ttl=300)
def load_contacts():
    if not DB_PATH.exists(): return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as cx:
        df = pd.read_sql_query("SELECT * FROM contacts", cx)
    if df.empty: return df
    df["date_updated"] = pd.to_datetime(df["date_updated"], errors="coerce", utc=True)
    df["date_added"] = pd.to_datetime(df["date_added"], errors="coerce", utc=True)
    lookup = load_ad_lookup()
    df["ad_name_attrib"] = df["first_utm_term"].map(lambda t: (lookup.get(t) or {}).get("ad_name") or (t if t else None))
    df["creative_key_attrib"] = df["ad_name_attrib"].map(creative_key)
    results = df.apply(lambda r: smart_score(dict(r)), axis=1)
    df["smart_score"] = [r[0] for r in results]
    df["smart_reason"] = [" | ".join(r[1]) if r[1] else "(no signals)" for r in results]
    df["in_scope"] = [r[2] for r in results]
    df["is_fb_lp"] = df.apply(lambda r: is_fb_lp_lead(dict(r)), axis=1)
    df["is_shopper"] = df["tags_json"].apply(lambda j: has_any_tag(j, SHOPPER_TAGS))
    def cf_val(json_str, fid):
        try: return (json.loads(json_str or "{}").get(fid) or "")
        except: return ""
    df["interest_level"] = df["custom_json"].apply(lambda j: cf_val(j, CF_INTEREST))
    df["fin_importance"] = df["custom_json"].apply(lambda j: cf_val(j, CF_FIN))
    df["video_watched"] = df["custom_json"].apply(lambda j: cf_val(j, CF_VID))
    df["mission"] = df["custom_json"].apply(lambda j: cf_val(j, CF_MISSION))
    df["convo_summary"] = df["custom_json"].apply(lambda j: cf_val(j, CF_CONVO))
    now_utc = pd.Timestamp.utcnow()
    df["days_since_activity"] = ((now_utc - df["date_updated"]).dt.total_seconds() / 86400).round(0).astype("Int64")
    df["days_since_first_seen"] = ((now_utc - df["date_added"]).dt.total_seconds() / 86400).round(0).astype("Int64")
    return df

@st.cache_data(ttl=300)
def load_ads():
    if not DB_PATH.exists(): return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as cx:
        df = pd.read_sql_query("SELECT * FROM ad_insights", cx)
    if "date" in df.columns: df["date"] = pd.to_datetime(df["date"], errors="coerce")
    if "ad_name" in df.columns:
        df["creative_key"] = df["ad_name"].map(creative_key)
    return df

@st.cache_data(ttl=300)
def load_log():
    if not DB_PATH.exists(): return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as cx:
        return pd.read_sql_query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 20", cx)

def cad(v):
    if pd.isna(v) or v is None: return "-"
    return f"${v:,.2f}"

def reached_stage(row, stage_idx):
    if stage_idx == 0: return True
    needles = FUNNEL_STAGES[stage_idx]["tags"] or []
    return has_any_tag(row.get("tags_json"), needles)

def reached_any_above(row, stage_idx):
    for i in range(stage_idx + 1, len(FUNNEL_STAGES)):
        if reached_stage(row, i): return True
    return False

def window_stats(contacts_df, ads_df, days):
    now_naive = pd.Timestamp.utcnow().tz_localize(None)
    now_utc = pd.Timestamp.utcnow()
    cutoff_ads = now_naive - pd.Timedelta(days=days)
    cutoff_contacts = now_utc - pd.Timedelta(days=days)
    window_ads = ads_df[ads_df["date"] >= cutoff_ads]
    by_ad_spend = window_ads.groupby(["ad_id", "ad_name", "campaign_name"], as_index=False, dropna=False).agg(spend_cad=("spend_cad","sum"))
    window_contacts = contacts_df[(contacts_df["date_added"] >= cutoff_contacts) & contacts_df["first_utm_term"].notna() & (contacts_df["first_utm_term"] != "")]
    by_ad_contacts = window_contacts.groupby("first_utm_term", as_index=False).agg(leads=("id","count"), shoppers=("is_shopper","sum")).rename(columns={"first_utm_term":"ad_id"})
    merged = by_ad_spend.merge(by_ad_contacts, on="ad_id", how="left").fillna({"leads":0,"shoppers":0})
    merged["leads"] = merged["leads"].astype(int)
    merged["shoppers"] = merged["shoppers"].astype(int)
    merged["cpc"] = merged.apply(lambda r: (r["spend_cad"]/r["shoppers"]) if r["shoppers"] else 0, axis=1)
    merged["cpl"] = merged.apply(lambda r: (r["spend_cad"]/r["leads"]) if r["leads"] else 0, axis=1)
    return merged

def currently_running_ads(ads_df, active_cutoff_days):
    now_naive = pd.Timestamp.utcnow().tz_localize(None)
    cutoff = now_naive - pd.Timedelta(days=active_cutoff_days)
    recent = ads_df[(ads_df["date"] >= cutoff) & (ads_df["spend_cad"] > 0)]
    return set(recent["ad_id"].dropna().unique())

st.sidebar.markdown(f"<h2 style='color:{BLUE}; margin:0;'>STA Dashboard</h2>", unsafe_allow_html=True)
st.sidebar.markdown(f"<p style='color:{RED}; font-weight:600; margin:0 0 1rem 0;'>Switch to America</p>", unsafe_allow_html=True)
view = st.sidebar.radio("View", ["Overview", "Cost per Customer", "Hot list (call these)", "Sales Funnel", "Sync history"])
with st.sidebar.expander("Data freshness"):
    log = load_log()
    if log.empty: st.warning("No sync runs yet.")
    else:
        g = log[log["job"] == "ghl_contacts"].head(1); m = log[log["job"] == "meta_insights"].head(1)
        st.write("Last GHL sync:", g["finished_at"].iloc[0] if not g.empty else "never")
        st.write("Last Meta sync:", m["finished_at"].iloc[0] if not m.empty else "never")
    if st.button("Refresh cache"): st.cache_data.clear(); st.rerun()

if not DB_PATH.exists():
    st.error("dashboard.db not found.")
    st.stop()

contacts = load_contacts(); ads = load_ads()

if view == "Overview":
    st.markdown('<div class="hero"><h1>Switch to America</h1><p>Last 7 days of ad performance across your active campaigns</p></div>', unsafe_allow_html=True)
    st.markdown('<div class="flag-strip"></div>', unsafe_allow_html=True)
    if ads.empty:
        st.warning("No Meta data yet."); st.stop()
    cutoff = pd.Timestamp.utcnow().tz_localize(None).normalize() - pd.Timedelta(days=7)
    ads7 = ads[(ads["date"] >= cutoff) & (ads["campaign_name"].isin(ACTIVE_CAMPAIGN_NAMES))].copy()
    if ads7.empty:
        st.info("No ad-day rows in the last 7 days for the 3 active campaigns."); st.stop()
    ads7["objective"] = ads7["campaign_name"].map(lambda n: CAMPAIGN_META.get(n, {}).get("type", "lead_gen"))
    leadgen_ads = ads7[ads7["objective"] == "lead_gen"]
    total_spend = ads7["spend_cad"].sum()
    total_leads = int(leadgen_ads["leads"].sum())
    avg_cpl = (leadgen_ads["spend_cad"].sum() / total_leads) if total_leads else 0
    total_clicks = int(ads7["clicks"].sum())
    in_scope_n = int(contacts["in_scope"].sum()) if "in_scope" in contacts.columns else 0
    hot_n = int(((contacts["smart_score"] >= 70) & (contacts["in_scope"])).sum()) if "smart_score" in contacts.columns else 0
    k1, k2, k3, k4, k5 = st.columns(5)
    with k1: st.markdown(f'<div class="kpi-card"><p class="label">7-day Spend</p><p class="value">${total_spend:,.2f}</p><p class="sub">CAD - all campaigns</p></div>', unsafe_allow_html=True)
    with k2: st.markdown(f'<div class="kpi-card red"><p class="label">7-day Leads</p><p class="value">{total_leads:,}</p><p class="sub">from lead-gen only</p></div>', unsafe_allow_html=True)
    with k3: st.markdown(f'<div class="kpi-card"><p class="label">Avg CPL</p><p class="value">${avg_cpl:,.2f}</p><p class="sub">lead-gen campaigns</p></div>', unsafe_allow_html=True)
    with k4: st.markdown(f'<div class="kpi-card gold"><p class="label">7-day Clicks</p><p class="value">{total_clicks:,}</p><p class="sub">all campaigns</p></div>', unsafe_allow_html=True)
    with k5: st.markdown(f'<div class="kpi-card red"><p class="label">Hot leads to call</p><p class="value">{hot_n}</p><p class="sub">in scope: {in_scope_n:,}</p></div>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(f"<h3 style='color:{BLUE}; margin-top:1rem;'>Daily spend - last 7 days</h3>", unsafe_allow_html=True)
    daily = ads7.groupby(["date","campaign_name"], as_index=False).agg(spend=("spend_cad","sum"), leads=("leads","sum"), clicks=("clicks","sum"))
    daily["cpl"] = daily.apply(lambda r: r["spend"]/r["leads"] if r["leads"] else 0, axis=1)
    daily["cpc"] = daily.apply(lambda r: r["spend"]/r["clicks"] if r["clicks"] else 0, axis=1)
    fig = go.Figure()
    for camp in ACTIVE_CAMPAIGN_NAMES:
        sub = daily[daily["campaign_name"] == camp].sort_values("date")
        if sub.empty: continue
        color = CAMPAIGN_META[camp]["color"]
        fig.add_trace(go.Bar(x=sub["date"], y=sub["spend"], name=camp, marker_color=color, opacity=0.9, hovertemplate="%{x|%a %b %d}<br>$%{y:.2f} CAD<extra></extra>"))
    fig.update_layout(barmode="group", height=320, margin=dict(t=20, b=20, l=10, r=10), plot_bgcolor="white", paper_bgcolor="white", legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0), yaxis=dict(title="Daily spend (CAD)", gridcolor="#eee"), xaxis=dict(gridcolor="#eee"))
    st.plotly_chart(fig, use_container_width=True)
    st.markdown(f"<h3 style='color:{RED}; margin-top:0.5rem;'>Cost per lead - lead-gen campaigns only</h3>", unsafe_allow_html=True)
    fig2 = go.Figure()
    for camp in [c for c in ACTIVE_CAMPAIGN_NAMES if CAMPAIGN_META[c]["type"] == "lead_gen"]:
        sub = daily[daily["campaign_name"] == camp].sort_values("date")
        if sub.empty: continue
        color = CAMPAIGN_META[camp]["color"]
        fig2.add_trace(go.Scatter(x=sub["date"], y=sub["cpl"], name=camp, mode="lines+markers", line=dict(color=color, width=3), marker=dict(size=9), hovertemplate="%{x|%a %b %d}<br>CPL: $%{y:.2f} CAD<extra></extra>"))
    fig2.update_layout(height=280, margin=dict(t=20, b=20, l=10, r=10), plot_bgcolor="white", paper_bgcolor="white", legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0), yaxis=dict(title="Cost per lead (CAD)", gridcolor="#eee"), xaxis=dict(gridcolor="#eee"))
    st.plotly_chart(fig2, use_container_width=True)
    st.markdown(f"<h3 style='color:{BLUE}; margin-top:1rem;'>Campaign breakdown</h3>", unsafe_allow_html=True)
    cols = st.columns(3)
    for i, camp in enumerate(ACTIVE_CAMPAIGN_NAMES):
        meta = CAMPAIGN_META[camp]
        is_eng = meta["type"] == "engagement"
        sub = ads7[ads7["campaign_name"] == camp].copy()
        if sub.empty:
            with cols[i]:
                st.markdown(f'<div class="camp-card"><h3>{camp}</h3><p>No data in last 7 days.</p></div>', unsafe_allow_html=True)
            continue
        sub_daily = sub.groupby("date", as_index=False).agg(spend=("spend_cad","sum"), leads=("leads","sum"), clicks=("clicks","sum"), reach=("reach","sum")).sort_values("date", ascending=False)
        sub_daily["cpl"] = sub_daily.apply(lambda r: r["spend"]/r["leads"] if r["leads"] else 0, axis=1)
        sub_daily["cpc"] = sub_daily.apply(lambda r: r["spend"]/r["clicks"] if r["clicks"] else 0, axis=1)
        tot_spend = sub_daily["spend"].sum()
        tot_leads = int(sub_daily["leads"].sum())
        tot_clicks = int(sub_daily["clicks"].sum())
        tot_cpl = tot_spend / tot_leads if tot_leads else 0
        tot_cpc = tot_spend / tot_clicks if tot_clicks else 0
        if i == 0: cls = "camp-card"; mcls = ""; tcls = ""
        elif i == 1: cls = "camp-card red"; mcls = "red"; tcls = "red"
        else: cls = "camp-card gold"; mcls = "gold"; tcls = "gold"
        if is_eng:
            metrics_html = (f'<div class="camp-metric"><div class="v">${tot_spend:,.2f}</div><div class="l">7-day spend</div></div>'
                f'<div class="camp-metric {mcls}"><div class="v">{tot_clicks:,}</div><div class="l">7-day clicks</div></div>'
                f'<div class="camp-metric"><div class="v">${tot_cpc:.2f}</div><div class="l">avg CPC</div></div>')
            rows_html = ""
            for _, r in sub_daily.iterrows():
                day = pd.to_datetime(r["date"]).strftime("%a %b %d")
                rows_html += f"<tr><td>{day}</td><td>${r['spend']:.2f}</td><td>{int(r['clicks']):,}</td><td>${r['cpc']:.2f}</td></tr>"
            table_head = "<tr><th>Day</th><th>Spend</th><th>Clicks</th><th>CPC</th></tr>"
        else:
            metrics_html = (f'<div class="camp-metric"><div class="v">${tot_spend:,.2f}</div><div class="l">7-day spend</div></div>'
                f'<div class="camp-metric {mcls}"><div class="v">{tot_leads:,}</div><div class="l">7-day leads</div></div>'
                f'<div class="camp-metric"><div class="v">${tot_cpl:.2f}</div><div class="l">avg CPL</div></div>')
            rows_html = ""
            for _, r in sub_daily.iterrows():
                day = pd.to_datetime(r["date"]).strftime("%a %b %d")
                rows_html += f"<tr><td>{day}</td><td>${r['spend']:.2f}</td><td>{int(r['leads'])}</td><td>${r['cpl']:.2f}</td></tr>"
            table_head = "<tr><th>Day</th><th>Spend</th><th>Leads</th><th>CPL</th></tr>"
        html = f'<div class="{cls}"><h3>{camp}</h3><div class="objective">{meta["label"]} campaign</div>'
        html += f'<div class="camp-metrics">{metrics_html}</div>'
        html += f'<table class="daytable {tcls}"><thead>{table_head}</thead><tbody>{rows_html}</tbody></table></div>'
        with cols[i]:
            st.markdown(html, unsafe_allow_html=True)

elif view == "Cost per Customer":
    st.markdown(f"<h1 style='color:{BLUE};'>Cost per Customer</h1>", unsafe_allow_html=True)
    if contacts.empty or ads.empty:
        st.warning("No data yet."); st.stop()

    win_col, _ = st.columns([1, 4])
    window_days = win_col.number_input("Window (days)", min_value=7, value=90, step=7)
    cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=window_days)
    cutoff_naive = pd.Timestamp.utcnow().tz_localize(None) - pd.Timedelta(days=window_days)
    recent = contacts[contacts["date_added"] >= cutoff].copy()
    recent_with_camp = recent[recent["first_utm_campaign"].notna() & (recent["first_utm_campaign"] != "")].copy()
    by_camp = recent_with_camp.groupby("first_utm_campaign").agg(
        leads=("id", "count"), shoppers=("is_shopper", "sum"),
    ).reset_index().rename(columns={"first_utm_campaign": "campaign_id"})
    spend = ads[ads["date"] >= cutoff_naive].groupby(["campaign_id", "campaign_name"], as_index=False).agg(
        spend_cad=("spend_cad", "sum"), impressions=("impressions", "sum"), clicks=("clicks", "sum"),
    )
    merged = spend.merge(by_camp, on="campaign_id", how="left").fillna({"leads": 0, "shoppers": 0})
    merged["leads"] = merged["leads"].astype(int)
    merged["shoppers"] = merged["shoppers"].astype(int)

    # MM Conversions scoping: only count the 3 active ad sets Shannon runs.
    # Other adsets in MM Conversions (retired Best Posts #2/#3, NEW VIDEOS, etc.)
    # would otherwise inflate the campaign card vs. the 3-adset breakdown below.
    MM_NAME = "MM - Switch To America - Conversions"
    MM_ADSETS = [
        "Interest: Open (Original Posts PT1)",
        "Interest: Open (Best Posts #1)",
        "Interest: Open (Original Posts PT2)",
    ]
    mm_ads = ads[(ads["campaign_name"] == MM_NAME) & (ads["adset_name"].isin(MM_ADSETS))]
    mm_3_ad_ids = set(mm_ads["ad_id"].dropna().astype(str).unique())
    mm_3_spend = float(mm_ads[mm_ads["date"] >= cutoff_naive]["spend_cad"].sum())
    mm_attrib_mask = (
        contacts["first_utm_term"].astype(str).isin(mm_3_ad_ids)
        | (contacts["ad_name_attrib"].isin(MM_ADSETS))
        | (contacts["ad_name_attrib"].astype(str).str.startswith(tuple(MM_ADSETS), na=False))
    )
    mm_in_window = contacts[mm_attrib_mask & (contacts["date_added"] >= cutoff)]
    mm_3_leads = len(mm_in_window)
    mm_3_shoppers = int(mm_in_window["is_shopper"].sum()) if mm_3_leads else 0
    # Overwrite MM Conversions row in merged with the 3-adset totals
    mm_mask = merged["campaign_name"] == MM_NAME
    if mm_mask.any():
        merged.loc[mm_mask, "spend_cad"] = mm_3_spend
        merged.loc[mm_mask, "leads"] = mm_3_leads
        merged.loc[mm_mask, "shoppers"] = mm_3_shoppers

    merged["cost_per_lead"] = merged.apply(lambda r: (r["spend_cad"] / r["leads"]) if r["leads"] else 0, axis=1)
    merged["cost_per_customer"] = merged.apply(lambda r: (r["spend_cad"] / r["shoppers"]) if r["shoppers"] else 0, axis=1)
    merged["lead_to_customer_pct"] = merged.apply(lambda r: (r["shoppers"] / r["leads"] * 100) if r["leads"] else 0, axis=1)
    active_summary = merged[merged["campaign_name"].isin(ACTIVE_CAMPAIGN_NAMES)].copy()
    total_spend = active_summary["spend_cad"].sum()
    total_leads = int(active_summary["leads"].sum())
    total_shoppers = int(active_summary["shoppers"].sum())
    avg_cpc = (total_spend / total_shoppers) if total_shoppers else 0
    overall_conv = (total_shoppers / total_leads * 100) if total_leads else 0
    k1, k2, k3, k4 = st.columns(4)
    with k1: st.markdown(f'<div class="kpi-card"><p class="label">{window_days}-day Spend</p><p class="value">${total_spend:,.2f}</p><p class="sub">CAD - 3 active campaigns</p></div>', unsafe_allow_html=True)
    with k2: st.markdown(f'<div class="kpi-card red"><p class="label">Total Leads</p><p class="value">{total_leads:,}</p><p class="sub">attributed to campaigns</p></div>', unsafe_allow_html=True)
    with k3: st.markdown(f'<div class="kpi-card green"><p class="label">Customers</p><p class="value">{total_shoppers:,}</p><p class="sub">{overall_conv:.1f}% of leads</p></div>', unsafe_allow_html=True)
    with k4: st.markdown(f'<div class="kpi-card green"><p class="label">Avg Cost per Customer</p><p class="value">${avg_cpc:,.2f}</p><p class="sub">CAD per shopper</p></div>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)
    qualified = active_summary[active_summary["shoppers"] >= 1].copy()
    if not qualified.empty:
        winner = qualified.sort_values("cost_per_customer").iloc[0]
        st.markdown(f'''<div class="winner">
<span class="tag">Cheapest customers</span>
<h2>{winner["campaign_name"]}</h2>
<p>${winner["cost_per_customer"]:,.2f} CAD per shopper - your best customer-acquisition channel. Recommend increasing budget here.</p>
<div class="nums">
<div><div class="n">${winner["spend_cad"]:,.0f}</div><div class="l">Spend</div></div>
<div><div class="n">{int(winner["leads"]):,}</div><div class="l">Leads</div></div>
<div><div class="n">{int(winner["shoppers"]):,}</div><div class="l">Shoppers</div></div>
<div><div class="n">{winner["lead_to_customer_pct"]:.1f}%</div><div class="l">Lead-to-customer</div></div>
</div>
</div>''', unsafe_allow_html=True)
    st.markdown(f"<h3 style='color:{BLUE}; margin-top:1.5rem;'>By active campaign</h3>", unsafe_allow_html=True)
    cols = st.columns(3)
    for i, camp in enumerate(ACTIVE_CAMPAIGN_NAMES):
        rows = merged[merged["campaign_name"] == camp]
        if rows.empty:
            with cols[i]:
                st.markdown(f'<div class="camp-card"><h3>{camp}</h3><p>No data.</p></div>', unsafe_allow_html=True)
            continue
        r = rows.iloc[0]
        if i == 0: cls = "camp-card"; mcls = ""
        elif i == 1: cls = "camp-card red"; mcls = "red"
        else: cls = "camp-card gold"; mcls = "gold"
        cpl_str = f"${r['cost_per_lead']:.2f}" if r['cost_per_lead'] else "-"
        cpc_str = f"${r['cost_per_customer']:.2f}" if r['cost_per_customer'] else "-"
        conv_str = f"{r['lead_to_customer_pct']:.1f}%" if r['leads'] else "-"
        html = f'<div class="{cls}"><h3>{camp}</h3><div class="objective">{CAMPAIGN_META[camp]["label"]} campaign</div>'
        html += f'<div class="camp-metrics">'
        html += f'<div class="camp-metric"><div class="v">${r["spend_cad"]:,.0f}</div><div class="l">{window_days}-day spend</div></div>'
        html += f'<div class="camp-metric {mcls}"><div class="v">{int(r["leads"]):,}</div><div class="l">leads</div></div>'
        html += f'<div class="camp-metric"><div class="v">{int(r["shoppers"]):,}</div><div class="l">shoppers</div></div>'
        html += f'</div><div class="camp-metrics">'
        html += f'<div class="camp-metric"><div class="v">{cpl_str}</div><div class="l">cost per lead</div></div>'
        html += f'<div class="camp-metric {mcls}"><div class="v">{cpc_str}</div><div class="l">cost per customer</div></div>'
        html += f'<div class="camp-metric"><div class="v">{conv_str}</div><div class="l">lead -> customer</div></div>'
        html += f'</div></div>'
        with cols[i]:
            st.markdown(html, unsafe_allow_html=True)

    # --- MM Conversions breakdown by ad set ---
    # Shannon's 3 ad sets inside MM - Switch To America - Conversions.
    # For each ad set: sum spend across all ads in that adset, count lifetime
    # leads/shoppers across every contact attributed to either (a) a current
    # ad inside this adset, or (b) the adset name directly (historic attributions
    # where Meta returned the adset name as the "ad" name after the original
    # ad was deleted).
    mm_name = "MM - Switch To America - Conversions"
    MM_ADSETS = [
        "Interest: Open (Original Posts PT1)",
        "Interest: Open (Best Posts #1)",
        "Interest: Open (Original Posts PT2)",
    ]
    now_naive = pd.Timestamp.utcnow().tz_localize(None)

    st.markdown(f"<h3 style='color:{BLUE}; margin-top:1.5rem;'>Inside <span style='color:{RED}'>MM - Switch To America - Conversions</span>: by ad set</h3>", unsafe_allow_html=True)
    st.caption("3 ad sets currently running. Everything below is in matched 30 / 60 / 90 day windows — the 30D sum across all 3 cards equals the 30D number on the MM Conversions card above (same for 60D and 90D).")

    now_utc = pd.Timestamp.utcnow()
    adset_cards = []
    for adset in MM_ADSETS:
        adset_ads = ads[(ads["campaign_name"] == mm_name) & (ads["adset_name"] == adset)]
        current_ad_ids = set(adset_ads["ad_id"].dropna().astype(str).unique())
        # Last active day
        last_day = adset_ads[adset_ads["spend_cad"] > 0]["date"].max() if not adset_ads.empty else None
        days_since = (now_naive - last_day).days if pd.notna(last_day) else None
        # Contacts attributed to this adset:
        #   (a) first_utm_term in this adset's current ad_ids, OR
        #   (b) resolved ad_name_attrib equals or starts with this adset name
        attrib_mask = (
            contacts["first_utm_term"].astype(str).isin(current_ad_ids)
            | (contacts["ad_name_attrib"] == adset)
            | (contacts["ad_name_attrib"].astype(str).str.startswith(adset, na=False))
        )
        in_set = contacts[attrib_mask]
        # Per-window: spend (ad insights date) AND leads/shoppers (contacts.date_added)
        windows = {}
        for days in (30, 60, 90):
            sp = float(adset_ads[adset_ads["date"] >= now_naive - pd.Timedelta(days=days)]["spend_cad"].sum())
            win_c = in_set[in_set["date_added"] >= now_utc - pd.Timedelta(days=days)]
            leads = len(win_c)
            shoppers = int(win_c["is_shopper"].sum()) if leads else 0
            cpc = (sp / shoppers) if shoppers else 0
            windows[days] = {"spend": sp, "leads": leads, "shoppers": shoppers, "cpc": cpc}
        # Inner ads (the actual creatives running in this adset right now)
        inner_ads = (adset_ads[adset_ads["spend_cad"] > 0]
                     .groupby("ad_name", as_index=False)["spend_cad"].sum()
                     .sort_values("spend_cad", ascending=False))

        adset_cards.append({
            "adset": adset, "days_since": days_since, "windows": windows,
            "inner_ads": inner_ads,
        })

    # Render 3 side-by-side adset cards
    cols = st.columns(3)
    for col, card in zip(cols, adset_cards):
        last_txt = ("running today" if card["days_since"] is not None and card["days_since"] <= 1
                    else (f"{card['days_since']}d since last spend" if card["days_since"] is not None else "no recent spend"))
        inner_lines = "".join(
            f'<div style="display:flex; justify-content:space-between; padding:0.2rem 0; border-top:1px solid #eee; font-size:0.85rem;">'
            f'<span>{r["ad_name"]}</span><span style="font-weight:600;">${r["spend_cad"]:,.0f}</span></div>'
            for _, r in card["inner_ads"].iterrows()
        )
        # Pick header border color based on whether ANY window has shoppers
        any_shoppers = any(w["shoppers"] > 0 for w in card["windows"].values())
        border = BLUE if any_shoppers else "#888"
        # Build the 30/60/90 windowed table
        def _cell(v, kind):
            if kind == "money": return f'<b>${v:,.0f}</b>' if v else '<span style="color:#bbb;">—</span>'
            if kind == "num": return f'<b>{v:,}</b>' if v else '<span style="color:#bbb;">0</span>'
            if kind == "cpc": return f'<b style="color:{GOLD}">${v:,.0f}</b>' if v else '<span style="color:#bbb;">—</span>'
            return str(v)
        win_rows_html = ""
        for days in (30, 60, 90):
            w = card["windows"][days]
            win_rows_html += f"""
<tr>
  <td style="padding:0.35rem 0.4rem; font-size:0.7rem; font-weight:700; color:{BLUE}; background:#f5f5f9; text-align:left;">{days}D</td>
  <td style="padding:0.35rem 0.4rem; text-align:right; font-size:0.9rem;">{_cell(w['spend'], 'money')}</td>
  <td style="padding:0.35rem 0.4rem; text-align:right; font-size:0.9rem; color:{RED};">{_cell(w['leads'], 'num')}</td>
  <td style="padding:0.35rem 0.4rem; text-align:right; font-size:0.9rem; color:{GREEN};">{_cell(w['shoppers'], 'num')}</td>
  <td style="padding:0.35rem 0.4rem; text-align:right; font-size:0.85rem;">{_cell(w['cpc'], 'cpc')}</td>
</tr>"""
        with col:
            st.markdown(f"""
<div style="background:{WHITE}; border:2px solid {border}; border-radius:12px; padding:1.1rem 1.2rem; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
  <div style="font-weight:800; color:{BLUE}; font-size:1rem; line-height:1.2;">{card['adset']}</div>
  <div style="font-size:0.7rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.6rem;">{last_txt}</div>
  <table style="width:100%; border-collapse:collapse; margin-bottom:0.6rem;">
    <thead>
      <tr style="background:{BLUE}; color:{WHITE};">
        <th style="padding:0.3rem 0.4rem; font-size:0.65rem; text-align:left; letter-spacing:0.5px;">Window</th>
        <th style="padding:0.3rem 0.4rem; font-size:0.65rem; text-align:right; letter-spacing:0.5px;">Spend</th>
        <th style="padding:0.3rem 0.4rem; font-size:0.65rem; text-align:right; letter-spacing:0.5px;">Leads</th>
        <th style="padding:0.3rem 0.4rem; font-size:0.65rem; text-align:right; letter-spacing:0.5px;">Shoppers</th>
        <th style="padding:0.3rem 0.4rem; font-size:0.65rem; text-align:right; letter-spacing:0.5px;">$/Shop</th>
      </tr>
    </thead>
    <tbody>{win_rows_html}</tbody>
  </table>
  <div style="font-size:0.7rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:0.7rem;">Ads in this set</div>
  {inner_lines if inner_lines else '<div style="font-size:0.85rem; color:#888; padding:0.2rem 0;">No recent spend.</div>'}
</div>
""", unsafe_allow_html=True)
    st.caption("Leads/Shoppers per window = contacts whose first-touch was in that timeframe (by date added to GHL). Shoppers typically convert weeks after first touch, so 30D shopper counts will be smaller than 90D.")

    # --- All creatives (everything, retired included) — collapsed by default ---
    with st.expander("All creatives across every campaign (retired + active)", expanded=False):
        spend_rows = []
        for label, days in [("spend_30", 30), ("spend_60", 60), ("spend_90", 90)]:
            cutoff = now_naive - pd.Timedelta(days=days)
            spend_rows.append(ads[ads["date"] >= cutoff].groupby("creative_key", as_index=False)["spend_cad"].sum().rename(columns={"spend_cad": label}))
        name_per_key = (ads.dropna(subset=["ad_name"]).sort_values("date", ascending=False)
                        .drop_duplicates(subset=["creative_key"])[["creative_key", "campaign_name"]])
        all_df = name_per_key.merge(lifetime, on="creative_key", how="outer")
        all_df["campaign_name"] = all_df["campaign_name"].fillna("(retired)")
        for s in spend_rows: all_df = all_df.merge(s, on="creative_key", how="left")
        for c in ["spend_30","spend_60","spend_90","leads","shoppers"]:
            all_df[c] = all_df[c].fillna(0)
        all_df["leads"] = all_df["leads"].astype(int)
        all_df["shoppers"] = all_df["shoppers"].astype(int)
        all_df = all_df.sort_values(["shoppers","spend_30"], ascending=[False, False])
        disp = all_df.copy()
        for c in ["spend_30","spend_60","spend_90"]:
            disp[c] = disp[c].apply(lambda v: f"${v:,.2f}" if v else "-")
        st.dataframe(
            disp[["creative_key","campaign_name","spend_30","spend_60","spend_90","leads","shoppers"]].head(200),
            use_container_width=True, hide_index=True,
            column_config={
                "creative_key": "Creative", "campaign_name": "Current Campaign",
                "spend_30": "Spend (30d)", "spend_60": "Spend (60d)", "spend_90": "Spend (90d)",
                "leads": "Leads (lifetime)", "shoppers": "Shoppers (lifetime)",
            })
        st.caption("Lifetime spend will be more complete once we pull historical Meta data — future bite-size step.")

elif view == "Hot list (call these)":
    st.markdown(f"<h1 style='color:{BLUE};'>Hot list - call these next</h1>", unsafe_allow_html=True)
    st.caption("Only contacts added in the last 120 days. Excludes anyone already shopped, booked, DND, not interested, or already a member.")
    if contacts.empty:
        st.warning("No data yet."); st.stop()
    c1, c2, c3, c4, c5 = st.columns(5)
    window_days = c1.number_input("Show contacts added in last N days", min_value=7, value=120, step=10)
    min_score = c2.slider("Min score", 0, 100, 50)
    only_with_contact = c3.checkbox("Has phone or email", value=True)
    tz_filter = c4.multiselect("Timezone", sorted([t for t in contacts["timezone"].dropna().unique() if t]), default=[])
    not_touched_days = c5.number_input("Hide if active in last N days", min_value=0, value=0)
    date_cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=window_days)
    df = contacts[contacts["in_scope"]].copy()
    df = df[df["date_added"] >= date_cutoff]
    df = df[df["smart_score"] >= min_score]
    if only_with_contact:
        df = df[(df["phone"].fillna("") != "") | (df["email"].fillna("") != "")]
    if tz_filter:
        df = df[df["timezone"].isin(tz_filter)]
    if not_touched_days > 0:
        df = df[(df["days_since_activity"].fillna(99999) >= not_touched_days)]
    df = df.sort_values("smart_score", ascending=False).head(500)
    show_cols = ["smart_score","first_name","last_name","phone","email","timezone",
        "days_since_activity","days_since_first_seen","pipeline_stage_name",
        "interest_level","fin_importance","video_watched","convo_summary",
        "mission","first_utm_campaign","smart_reason"]
    show_cols = [c for c in show_cols if c in df.columns]
    pool = contacts[(contacts["in_scope"]) & (contacts["date_added"] >= date_cutoff)]
    st.write(f"Top **{len(df):,}** of {len(pool):,} contacts in last {window_days} days at score >= {min_score}")
    st.dataframe(df[show_cols], use_container_width=True, hide_index=True,
        column_config={"smart_score": st.column_config.ProgressColumn("Score", min_value=0, max_value=100),
            "convo_summary": st.column_config.TextColumn("Last AI Convo Summary", width="medium"),
            "mission": st.column_config.TextColumn("Their mission/purpose", width="medium"),
            "smart_reason": st.column_config.TextColumn("Why hot", width="medium")})
    st.download_button("Download CSV", data=df[show_cols].to_csv(index=False).encode("utf-8"),
        file_name=f"hot_list_{pd.Timestamp.now().strftime('%Y%m%d_%H%M')}.csv", mime="text/csv")

elif view == "Sales Funnel":
    st.markdown(f"<h1 style='color:{BLUE};'>Sales Funnel - last 90 days</h1>", unsafe_allow_html=True)
    fb_only = st.checkbox("FB/IG landing-page leads only (exclude Messenger)", value=True)
    if contacts.empty:
        st.warning("No data yet."); st.stop()
    cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=90)
    recent = contacts[contacts["date_added"] >= cutoff].copy()
    if fb_only:
        recent = recent[recent["is_fb_lp"]].copy()
        scope_label = "FB/IG landing-page leads"
    else:
        scope_label = "all sources"
    st.caption(f"Last 90 days, {scope_label}. The win is Hot lead/booked -> Shopped (Cat 1).")
    if recent.empty:
        st.warning(f"No {scope_label} added in the last 90 days."); st.stop()
    rows = recent.to_dict("records")
    counts = []
    for i, stage in enumerate(FUNNEL_STAGES):
        n = len(rows) if i == 0 else sum(1 for r in rows if reached_stage(r, i))
        counts.append((stage["label"], n))
    bottleneck_idx = None
    bottleneck_rate = 999.0
    for i in range(len(counts) - 1):
        from_n = counts[i][1]; to_n = counts[i+1][1]
        rate = (to_n / from_n * 100) if from_n else 0
        if from_n >= 30 and rate < bottleneck_rate:
            bottleneck_rate = rate
            bottleneck_idx = i
    if bottleneck_idx is not None:
        from_label = counts[bottleneck_idx][0]
        to_label = counts[bottleneck_idx + 1][0]
        from_n = counts[bottleneck_idx][1]
        to_n = counts[bottleneck_idx + 1][1]
        lost = from_n - to_n
        st.markdown(f'''<div class="bottleneck">
<span class="tag">Bottleneck detected</span>
<h2>{from_label} -> {to_label}</h2>
<p>{from_n:,} {scope_label} reached <b>{from_label}</b> in the last 90 days. Only <b>{to_n:,}</b> ({bottleneck_rate:.1f}%) progressed to <b>{to_label}</b>. The other <b>{lost:,}</b> got stuck here.</p>
<div class="nums">
<div><div class="n">{from_n:,}</div><div class="l">Reached stage</div></div>
<div><div class="n">{to_n:,}</div><div class="l">Progressed</div></div>
<div><div class="n">{lost:,}</div><div class="l">Lost / stuck</div></div>
<div><div class="n">{bottleneck_rate:.1f}%</div><div class="l">Pass-through</div></div>
</div>
</div>''', unsafe_allow_html=True)
    fig = go.Figure(go.Funnel(y=[c[0] for c in counts], x=[c[1] for c in counts],
        textinfo="value+percent initial",
        marker=dict(color=STAGE_COLORS[:len(counts)]),
        connector=dict(line=dict(color="#ccc", width=2))))
    fig.update_layout(height=440, margin=dict(t=20, b=20, l=10, r=10), plot_bgcolor="white", paper_bgcolor="white")
    st.plotly_chart(fig, use_container_width=True)
    st.markdown(f"<h3 style='color:{BLUE}; margin-top:1rem;'>Stage-by-stage drop-off</h3>", unsafe_allow_html=True)
    drop_rows = []
    for i in range(1, len(counts)):
        prev_label, prev_n = counts[i-1]
        cur_label, cur_n = counts[i]
        conv = (cur_n / prev_n * 100) if prev_n else 0
        drop = prev_n - cur_n
        marker = " *** BOTTLENECK ***" if i - 1 == bottleneck_idx else ""
        drop_rows.append({"From": prev_label + marker, "To": cur_label,
            "From count": f"{prev_n:,}", "To count": f"{cur_n:,}",
            "Lost": f"{drop:,}", "Conversion %": f"{conv:.1f}%"})
    st.dataframe(pd.DataFrame(drop_rows), use_container_width=True, hide_index=True)
    st.markdown(f"<h3 style='color:{RED}; margin-top:1.5rem;'>People stuck at the bottleneck</h3>", unsafe_allow_html=True)
    stage_options = [s["label"] for i, s in enumerate(FUNNEL_STAGES[:-1])]
    default_idx = bottleneck_idx if bottleneck_idx is not None else 0
    c1, c2 = st.columns([2, 1])
    chosen_stage_label = c1.selectbox("Which stage to inspect:", stage_options, index=default_idx)
    chosen_idx = stage_options.index(chosen_stage_label)
    min_days = c2.number_input("Inactive for at least N days", min_value=0, value=14)
    def is_stuck(r):
        if not reached_stage(r, chosen_idx): return False
        if reached_any_above(r, chosen_idx): return False
        days = r.get("days_since_activity") or 0
        if pd.isna(days): days = 0
        if days < min_days: return False
        if not r.get("in_scope"): return False
        return True
    stuck = recent[recent.apply(is_stuck, axis=1)].copy()
    stuck = stuck.sort_values("days_since_activity", ascending=False).head(200)
    stuck_cols = ["first_name","last_name","phone","email","timezone","days_since_activity",
                  "days_since_first_seen","convo_summary","mission","first_utm_campaign"]
    stuck_cols = [c for c in stuck_cols if c in stuck.columns]
    st.write(f"**{len(stuck):,}** people stuck at **{chosen_stage_label}** ({scope_label}) with {min_days}+ days of inactivity (showing top 200)")
    if not stuck.empty:
        st.dataframe(stuck[stuck_cols], use_container_width=True, hide_index=True,
            column_config={
                "convo_summary": st.column_config.TextColumn("Last AI Convo Summary", width="medium"),
                "mission": st.column_config.TextColumn("Their mission/purpose", width="medium")})
        st.download_button("Download CSV (for personal follow-up)",
            data=stuck[stuck_cols].to_csv(index=False).encode("utf-8"),
            file_name=f"stuck_at_{chosen_stage_label.replace(' ','_')}_{pd.Timestamp.now().strftime('%Y%m%d')}.csv",
            mime="text/csv")
    else:
        st.success(f"Nobody's stuck at {chosen_stage_label} right now.")

elif view == "Sync history":
    st.markdown(f"<h1 style='color:{BLUE};'>Sync history</h1>", unsafe_allow_html=True)
    st.dataframe(load_log(), use_container_width=True, hide_index=True)
