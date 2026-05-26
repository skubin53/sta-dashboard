"""STA Dashboard - Streamlit Cloud version. Reads from data/dashboard.db committed to repo."""
import json, sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pandas as pd
import streamlit as st
import plotly.graph_objects as go

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
</style>
""", unsafe_allow_html=True)

@st.cache_data(ttl=300)
def load_contacts():
    if not DB_PATH.exists(): return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as cx:
        df = pd.read_sql_query("SELECT * FROM contacts", cx)
    if df.empty: return df
    df["date_updated"] = pd.to_datetime(df["date_updated"], errors="coerce", utc=True)
    df["date_added"] = pd.to_datetime(df["date_added"], errors="coerce", utc=True)
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
    return df

@st.cache_data(ttl=300)
def load_log():
    if not DB_PATH.exists(): return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as cx:
        return pd.read_sql_query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 20", cx)

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
view = st.sidebar.radio("View", ["Cost per Customer", "Hot list (call these)", "Sales Funnel", "Sync history"])
with st.sidebar.expander("Data freshness"):
    log = load_log()
    if log.empty: st.warning("No sync runs yet.")
    else:
        g = log[log["job"] == "ghl_contacts"].head(1); m = log[log["job"] == "meta_insights"].head(1)
        st.write("Last GHL sync:", g["finished_at"].iloc[0] if not g.empty else "never")
        st.write("Last Meta sync:", m["finished_at"].iloc[0] if not m.empty else "never")
    if st.button("Refresh cache"): st.cache_data.clear(); st.rerun()

if not DB_PATH.exists():
    st.error("dashboard.db not found in data/ folder. Make sure it's committed to the repo.")
    st.stop()

contacts = load_contacts(); ads = load_ads()

if view == "Cost per Customer":
    st.markdown(f"<h1 style='color:{BLUE};'>Cost per Customer - by ad</h1>", unsafe_allow_html=True)
    st.caption("Per-ad performance over 30 / 60 / 90 day windows. Currently-running ads only.")
    if contacts.empty or ads.empty:
        st.warning("No data yet."); st.stop()
    f1, f2, f3 = st.columns([2, 1, 1])
    search = f1.text_input("Search by ad name", value="", placeholder="e.g. Reel 03, Best Post")
    active_within = f2.number_input("Currently running (spend in last N days)", min_value=1, value=14, step=1)
    sort_metric = f3.selectbox("Sort by", ["30d shoppers", "30d spend", "30d $/customer (cheapest)", "30d leads"])
    running_ad_ids = currently_running_ads(ads, active_within)
    if not running_ad_ids:
        st.warning(f"No ads with spend in the last {active_within} days."); st.stop()
    s30 = window_stats(contacts, ads, 30); s60 = window_stats(contacts, ads, 60); s90 = window_stats(contacts, ads, 90)
    s30 = s30[s30["ad_id"].isin(running_ad_ids)]
    s60 = s60[s60["ad_id"].isin(running_ad_ids)]
    s90 = s90[s90["ad_id"].isin(running_ad_ids)]
    all_names = pd.concat([s30[["ad_id","ad_name","campaign_name"]], s60[["ad_id","ad_name","campaign_name"]], s90[["ad_id","ad_name","campaign_name"]]]).drop_duplicates(subset=["ad_id"])
    s30_r = s30[["ad_id","spend_cad","leads","shoppers","cpc","cpl"]].rename(columns={"spend_cad":"spend_30","leads":"leads_30","shoppers":"shoppers_30","cpc":"cpc_30","cpl":"cpl_30"})
    s60_r = s60[["ad_id","spend_cad","leads","shoppers","cpc","cpl"]].rename(columns={"spend_cad":"spend_60","leads":"leads_60","shoppers":"shoppers_60","cpc":"cpc_60","cpl":"cpl_60"})
    s90_r = s90[["ad_id","spend_cad","leads","shoppers","cpc","cpl"]].rename(columns={"spend_cad":"spend_90","leads":"leads_90","shoppers":"shoppers_90","cpc":"cpc_90","cpl":"cpl_90"})
    merged = all_names.merge(s30_r, on="ad_id", how="left").merge(s60_r, on="ad_id", how="left").merge(s90_r, on="ad_id", how="left")
    for c in ["spend_30","leads_30","shoppers_30","cpc_30","cpl_30","spend_60","leads_60","shoppers_60","cpc_60","cpl_60","spend_90","leads_90","shoppers_90","cpc_90","cpl_90"]:
        merged[c] = merged[c].fillna(0)
    if search:
        s = search.lower()
        mask_name = merged["ad_name"].astype(str).str.lower().str.contains(s, na=False)
        mask_camp = merged["campaign_name"].astype(str).str.lower().str.contains(s, na=False)
        merged = merged[mask_name | mask_camp]
    if sort_metric == "30d shoppers":
        merged = merged.sort_values("shoppers_30", ascending=False)
    elif sort_metric == "30d $/customer (cheapest)":
        only_with_cust = merged[merged["cpc_30"] > 0].sort_values("cpc_30", ascending=True)
        no_cust = merged[merged["cpc_30"] == 0].sort_values("spend_30", ascending=False)
        merged = pd.concat([only_with_cust, no_cust])
    elif sort_metric == "30d spend":
        merged = merged.sort_values("spend_30", ascending=False)
    else:
        merged = merged.sort_values("leads_30", ascending=False)
    st.write(f"**{len(merged):,}** currently-running ads (spend in last {active_within}d).")
    disp = merged.copy()
    for d in ["30","60","90"]:
        disp[f"spend_{d}"] = disp[f"spend_{d}"].apply(lambda v: f"${v:,.2f}" if v else "-")
        disp[f"cpc_{d}"] = disp[f"cpc_{d}"].apply(lambda v: f"${v:,.2f}" if v else "-")
        disp[f"leads_{d}"] = disp[f"leads_{d}"].apply(lambda v: f"{int(v):,}")
        disp[f"shoppers_{d}"] = disp[f"shoppers_{d}"].apply(lambda v: f"{int(v):,}")
    cols_to_show = ["ad_name","campaign_name",
        "spend_30","leads_30","shoppers_30","cpc_30",
        "spend_60","leads_60","shoppers_60","cpc_60",
        "spend_90","leads_90","shoppers_90","cpc_90"]
    st.dataframe(disp[cols_to_show].head(100), use_container_width=True, hide_index=True,
        column_config={
            "ad_name": "Ad", "campaign_name": "Campaign",
            "spend_30": "Spend (30d)", "leads_30": "Leads (30d)", "shoppers_30": "Cust (30d)", "cpc_30": "Cost/Cust (30d)",
            "spend_60": "Spend (60d)", "leads_60": "Leads (60d)", "shoppers_60": "Cust (60d)", "cpc_60": "Cost/Cust (60d)",
            "spend_90": "Spend (90d)", "leads_90": "Leads (90d)", "shoppers_90": "Cust (90d)", "cpc_90": "Cost/Cust (90d)",
        })
    st.caption("Pattern reading: 30d=0 + 60d/90d>0 = fading creative (kill it). 30d growing vs 60d/90d = scaling well (push budget).")

elif view == "Hot list (call these)":
    st.markdown(f"<h1 style='color:{BLUE};'>Hot list - call these next</h1>", unsafe_allow_html=True)
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
    if recent.empty:
        st.warning(f"No {scope_label} added in the last 90 days."); st.stop()
    rows = recent.to_dict("records")
    counts = []
    for i, stage in enumerate(FUNNEL_STAGES):
        n = len(rows) if i == 0 else sum(1 for r in rows if reached_stage(r, i))
        counts.append((stage["label"], n))
    fig = go.Figure(go.Funnel(y=[c[0] for c in counts], x=[c[1] for c in counts],
        textinfo="value+percent initial",
        marker=dict(color=STAGE_COLORS[:len(counts)]),
        connector=dict(line=dict(color="#ccc", width=2))))
    fig.update_layout(height=440, margin=dict(t=20, b=20, l=10, r=10), plot_bgcolor="white", paper_bgcolor="white")
    st.plotly_chart(fig, use_container_width=True)
    drop_rows = []
    for i in range(1, len(counts)):
        prev_label, prev_n = counts[i-1]
        cur_label, cur_n = counts[i]
        conv = (cur_n / prev_n * 100) if prev_n else 0
        drop = prev_n - cur_n
        drop_rows.append({"From": prev_label, "To": cur_label,
            "From count": f"{prev_n:,}", "To count": f"{cur_n:,}",
            "Lost": f"{drop:,}", "Conversion %": f"{conv:.1f}%"})
    st.dataframe(pd.DataFrame(drop_rows), use_container_width=True, hide_index=True)

elif view == "Sync history":
    st.markdown(f"<h1 style='color:{BLUE};'>Sync history</h1>", unsafe_allow_html=True)
    st.dataframe(load_log(), use_container_width=True, hide_index=True)
