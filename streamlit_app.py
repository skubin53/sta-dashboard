"""STA Dashboard - Cloud version. Reads from data/dashboard.db committed to repo."""
import json, re, sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
import requests

# GHL push config — token can be overridden via Streamlit Cloud secrets
GHL_PIT_TOKEN = st.secrets.get("GHL_PIT_TOKEN", "pit-04c7dc76-1b6e-450c-a726-68928a8c3a91") if hasattr(st, "secrets") else "pit-04c7dc76-1b6e-450c-a726-68928a8c3a91"
GHL_HEADERS = {"Authorization": f"Bearer {GHL_PIT_TOKEN}", "Version": "2021-07-28",
               "Accept": "application/json", "Content-Type": "application/json"}
GHL_BASE = "https://services.leadconnectorhq.com"
PUSH_WORKFLOWS = {
    "Follow-Up in 2 weeks": "0697de52-a9c1-4a56-a6e8-af47c1f2aa51",
}

def push_contact_to_workflow(contact_id, workflow_id):
    """POST /contacts/{contactId}/workflow/{workflowId}. Returns (ok, message)."""
    try:
        r = requests.post(f"{GHL_BASE}/contacts/{contact_id}/workflow/{workflow_id}",
                          headers=GHL_HEADERS, timeout=15)
        if r.status_code in (200, 201):
            return True, "ok"
        return False, f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        return False, str(e)[:120]


# Shannon's existing GHL contact for self-notifications
# (gethealthy@shannonandarielle.com)
SELF_NOTIFY_CONTACT_ID = "Ewylm2gm9RcC4JBEbLXI"

def send_email_via_ghl(contact_id, subject, html):
    """POST /conversations/messages — send an email to a GHL contact. Returns (ok, message)."""
    body = {
        "type": "Email",
        "contactId": contact_id,
        "subject": subject,
        "html": html,
    }
    try:
        r = requests.post(f"{GHL_BASE}/conversations/messages",
                          headers=GHL_HEADERS, json=body, timeout=20)
        if r.status_code in (200, 201, 202):
            return True, "sent"
        return False, f"HTTP {r.status_code}: {r.text[:200]}"
    except Exception as e:
        return False, str(e)[:200]


def _first(s, n=80):
    """Truncate to n chars at a word boundary."""
    if not s or pd.isna(s): return ""
    s = str(s).strip()
    if len(s) <= n: return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:") + "…"


def draft_outreach(row):
    """Build personalized SMS + Email + Voicemail drafts for a contact.

    Returns a dict:
      {'sms': '<text>', 'email_subject': '...', 'email_body': '...',
       'voicemail': '...', 'rationale': 'which signal triggered the variant'}

    Branches on the strongest available signal: mission > convo > tags >
    video watch % > interest level > stage > stale-reactivation.
    """
    name = (row.get("first_name") or "").strip().title() or "there"
    convo = (row.get("convo_summary") or "").strip()
    mission = (row.get("mission") or "").strip()
    interest = (row.get("interest_level") or "").strip().lower()
    video = (row.get("video_watched") or "").strip().lower()
    fin = (row.get("fin_importance") or "").strip().lower()
    days_first = row.get("days_since_first_seen")
    days_active = row.get("days_since_activity")
    stage = (row.get("pipeline_stage_name") or "").strip().lower()
    try:
        tags = [str(t).lower() for t in (json.loads(row.get("tags_json") or "[]") or [])]
    except Exception:
        tags = []
    has = lambda *needles: any(any(n in t for n in needles) for t in tags)
    try:
        days_first = int(days_first) if pd.notna(days_first) else None
        days_active = int(days_active) if pd.notna(days_active) else None
    except Exception:
        days_first, days_active = None, None

    # Pick the strongest signal and build all three channels around the same hook
    if mission:
        hook_short = _first(mission, 70).lower()
        return {
            "sms": f"Hey {name}! You mentioned wanting {hook_short}. I think we can actually help with that — got 10 min this week to chat? — Shannon",
            "email_subject": f"{name}, about wanting {_first(mission, 40).lower()}",
            "email_body": f"Hi {name},\n\nI was just looking back at your responses and saw you mentioned wanting {hook_short}.\n\nThat's exactly the kind of outcome STA is built for, and I'd love to walk you through how it could work for your situation specifically — what's worked for others in a similar spot, the realistic timeline, and any concerns you have.\n\nWould a 10-minute call this week make sense? I'm flexible — just let me know a window that works.\n\n— Shannon",
            "voicemail": f"Hey {name}, this is Shannon from Switch to America. I was looking back at your responses and saw you mentioned wanting {hook_short}. I really think we can help with that and I'd love to hop on a quick call — even just 10 minutes — to walk you through how. Give me a call back or shoot me a text when you have a sec. Talk soon.",
            "rationale": "Custom-field 'mission' — strongest signal we have. Speaks back their own words.",
        }
    if convo and len(convo) > 15:
        c_short = _first(convo, 90)
        c_email = _first(convo, 180)
        return {
            "sms": f"Hi {name}, was just looking back at where we left off: {c_short} — want to pick that up? Free for a quick call? — Shannon",
            "email_subject": f"{name}, picking up where we left off",
            "email_body": f"Hi {name},\n\nI was reviewing our last conversation — \"{c_email}\" — and wanted to follow up personally rather than letting it sit.\n\nA few quick questions and a 10-minute call would help me give you the most useful answer to what you were thinking about. Want me to send a couple times that work for me this week?\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon from Switch to America. I was just looking back at our last conversation — you'd mentioned {c_short[:60]}. Wanted to pick that up personally. Give me a call back when you can, or text me, and we'll get you sorted. Talk soon.",
            "rationale": "Last AI conversation summary — references your prior thread, very high relevance.",
        }
    if has("hot lead"):
        return {
            "sms": f"Hey {name}! Looks like you're ready to take the next step — want to grab 10 min this week to make it happen? — Shannon",
            "email_subject": f"{name}, ready for the next step?",
            "email_body": f"Hi {name},\n\nEverything in your file says you're at the point where it's time to actually pull the trigger — but maybe a few questions are holding you back. Totally normal.\n\nLet's do a 10-minute call this week. I'll answer whatever's still in the way and you can decide if it's a fit. No pressure, just clarity.\n\nWhat day works?\n\n— Shannon",
            "voicemail": f"Hey {name}, this is Shannon from STA. Your responses all signal you're ready to move — I just want to make sure nothing's in the way before you take the next step. Give me 10 minutes on the phone, I'll answer anything still nagging at you, and you decide. Call or text me back when you've got a second.",
            "rationale": "Tagged 'hot lead' — highest-intent stage. Direct ask for the close call.",
        }
    if has("not shopped") and has("booked"):
        return {
            "sms": f"Hi {name}! You booked a call but we never connected — bad timing? Let's get you re-booked at a time that actually works. — Shannon",
            "email_subject": f"Let's re-book — last time didn't work out",
            "email_body": f"Hi {name},\n\nYou booked a call with me but we didn't connect last time. That happens — life gets in the way. I don't want to lose track of you though.\n\nCan you send me 2-3 windows this week that actually work for you? I'll lock one in and we'll keep it brief — 10-15 minutes.\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon — we had a call on the books last time that didn't end up connecting. Totally fine, I just want to get you re-booked at a time that works. Shoot me a text with a couple of windows this week and I'll grab one. Talk soon.",
            "rationale": "Booked but didn't shop — call fell through. Reschedule angle.",
        }
    if has("livevideo"):
        return {
            "sms": f"Hi {name}! Thanks for joining the live — wanted to check in personally and see what questions came up after. Free for a quick call? — Shannon",
            "email_subject": f"{name}, follow-up from the live",
            "email_body": f"Hi {name},\n\nThanks for showing up to the live training. I always find that the real questions don't come up during — they come up about 24 hours after when you've had time to mull it over.\n\nWhat's still on your mind? Happy to do a quick 10-minute call to clear up anything that's still fuzzy.\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon from STA. Just wanted to follow up personally after the live training — usually the best questions come up a day or two later. What's still on your mind? Give me a call or text when you can.",
            "rationale": "Attended live video training — warm, post-event follow-up.",
        }
    if has("can't afford", "cannot afford"):
        return {
            "sms": f"Hi {name}, I remember pricing felt steep — there's a Cat 1 option I haven't fully walked you through that might change things. Open to chat? — Shannon",
            "email_subject": f"{name}, a different option we haven't really covered",
            "email_body": f"Hi {name},\n\nI know pricing felt like a stretch last time we talked. I want to be straight with you — there's a Cat 1 path I don't think I fully walked you through, and it changes the math meaningfully for a lot of families.\n\nWorth 10 minutes to see if it actually fits your budget? No pressure if the answer is still no — but I'd rather you decide with the full picture.\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon. I know pricing felt like a stretch last time. There's actually a Cat 1 option I don't think I fully covered with you that changes the math quite a bit for most families. Worth 10 minutes to see if it fits? Call me back when you have a sec.",
            "rationale": "Tagged 'can't afford' — affordability objection. Cat 1 reframe.",
        }
    if has("no show", "appt cancelled"):
        return {
            "sms": f"Hi {name}! Looks like our last call got missed — want to grab a new time? Happy to keep it short. — Shannon",
            "email_subject": f"{name}, let's re-grab a time",
            "email_body": f"Hi {name},\n\nOur last call got missed — life happens. I'd still love to connect though. Send me a couple of windows this week and I'll lock one in. Keeping it short — 10 minutes max.\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon — looks like we missed our last call. No worries, just want to get you re-booked. Text me a couple of times that work this week and I'll grab one.",
            "rationale": "No-show or cancelled — reschedule with no friction.",
        }
    if "75" in video or "100" in video or "complete" in video or "finished" in video:
        return {
            "sms": f"Hi {name}! Saw you watched a good chunk of the video. Curious what stood out — and what's holding you back from the next step? — Shannon",
            "email_subject": f"{name}, what stood out from the video?",
            "email_body": f"Hi {name},\n\nI noticed you watched a real chunk of the training video — most people don't make it past the first 5 minutes. So you're clearly looking for something specific.\n\nWhat resonated? And just as importantly — what's the one thing that's keeping you from taking the next step?\n\nReply here or grab 10 minutes on the phone and we can sort it.\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon. I saw you watched most of the training video, which tells me you're seriously looking. I'm curious what stood out and what's still in the way of the next step. Call me back when you have 10 minutes.",
            "rationale": "Watched ≥75% of video — high engagement signal, ask what resonated.",
        }
    if "50" in video:
        return {
            "sms": f"Hey {name}, noticed you got halfway through the video. Anything specific I can answer that would help you decide? — Shannon",
            "email_subject": f"{name}, halfway through — what would help?",
            "email_body": f"Hi {name},\n\nI saw you got halfway through the video and then stepped away. Could mean you got busy — could also mean a specific question came up that the video didn't answer.\n\nWhat would be most useful right now: I keep walking you through, you ask me a specific question, or we just do a quick 10-minute call?\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon. I noticed you got halfway through the training video. Curious what came up — happy to answer specific questions or just hop on a quick call. Give me a buzz when you have a sec.",
            "rationale": "Watched ~50% of video — partial engagement, ask what stopped them.",
        }
    if interest in ("very high", "high", "extremely high"):
        return {
            "sms": f"Hey {name}! Your responses said you're really aligned with what we do. Want to jump on a 10-min call this week and dig in? — Shannon",
            "email_subject": f"{name}, your responses really resonated",
            "email_body": f"Hi {name},\n\nLooking back at your responses, you're more aligned with what we do at Switch to America than most people who come through. That's not a sales line — it just means our conversation is going to be useful, not generic.\n\nGrab 10 minutes with me this week? I'd rather have a real conversation than send you another piece of content.\n\n— Shannon",
            "voicemail": f"Hey {name}, this is Shannon. Your responses really stood out — you're more aligned with what we do than most. I'd love to skip the canned follow-up and just have a real 10-minute conversation. Call me back when you can.",
            "rationale": "Self-reported interest = high/very high — direct path to the call.",
        }
    if "extreme" in fin or "very important" in fin or ("important" in fin and fin):
        return {
            "sms": f"Hi {name}, you flagged financial security as important — that's exactly what STA helps families lock in. Free for a quick call? — Shannon",
            "email_subject": f"{name}, financial security — let's talk specifics",
            "email_body": f"Hi {name},\n\nYou marked financial security as important to you. That's not a casual thing to check, and most of the families we work with end up with us specifically because of that.\n\nI'd like to walk you through what 'locking it in' actually looks like in practice for your specific situation — not the marketing version. 10 minutes on the phone, anytime this week.\n\n— Shannon",
            "voicemail": f"Hi {name}, this is Shannon. You marked financial security as important — that's the exact reason most families work with us. I'd love to walk you through what that actually looks like for your situation. Give me 10 minutes on the phone when you can.",
            "rationale": "Financial-security custom field = important — emotional driver locked in.",
        }
    if "hot" in stage or "booked" in stage:
        return {
            "sms": f"Hey {name}! Wanted to reach out personally — looks like you're ready to take the next step. Quick call this week? — Shannon",
            "email_subject": f"{name}, ready when you are",
            "email_body": f"Hi {name},\n\nEverything in your record says you're at the decision point. I don't want to leave you hanging there — let's just do a 10-minute call this week, get the last questions answered, and you decide. No pressure.\n\nWhat day works?\n\n— Shannon",
            "voicemail": f"Hey {name}, this is Shannon. Your file says you're at the decision point — let's not let that linger. Quick 10-minute call this week, get the last questions answered. Call or text me back.",
            "rationale": "Pipeline stage = hot/booked — they're in the decision zone.",
        }
    if days_active is not None and days_active > 30:
        return {
            "sms": f"{name}, it's been a minute! Just thinking of you — wanted to check in and see where you're at. Still curious about STA? — Shannon",
            "email_subject": f"Just thinking of you, {name}",
            "email_body": f"Hi {name},\n\nIt's been a while since we connected — wanted to reach out personally rather than letting you slip through the cracks.\n\nWhere are you at? Still curious about STA, or has life moved you in a different direction? Either answer is totally fine — I just don't want to keep emailing if it's not relevant anymore.\n\n— Shannon",
            "voicemail": f"Hey {name}, this is Shannon — it's been a minute. Just wanted to check in personally and see where you're at. Still curious about STA or has life moved you somewhere else? Either way's fine, just let me know.",
            "rationale": f"No activity in {days_active}d — reactivation, low-pressure check-in.",
        }
    return {
        "sms": f"Hi {name}! Wanted to circle back personally — what would be most helpful for you right now: a quick call, more info, or something else? — Shannon",
        "email_subject": f"{name}, what would be most helpful?",
        "email_body": f"Hi {name},\n\nWanted to reach out personally rather than send another canned email. What's actually most useful for you right now — a quick call, more info on a specific piece, or something else entirely? Just hit reply and tell me.\n\n— Shannon",
        "voicemail": f"Hi {name}, this is Shannon from Switch to America. Wanted to reach out personally and just ask — what's most useful for you right now? A quick call, more info on something specific? Call or text me back and let's figure it out.",
        "rationale": "Generic fallback — open question, low pressure, lets them lead.",
    }


def draft_sms(row):
    """Back-compat wrapper — delegates to draft_outreach()."""
    return draft_outreach(row)["sms"]


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
def load_appointments():
    """Past + upcoming appointments. Used by show-rate prediction."""
    if not DB_PATH.exists(): return pd.DataFrame()
    try:
        with sqlite3.connect(DB_PATH) as cx:
            df = pd.read_sql_query("SELECT * FROM appointments", cx)
    except sqlite3.OperationalError:
        return pd.DataFrame()
    if df.empty: return df
    df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce", utc=True)
    df["end_time"] = pd.to_datetime(df["end_time"], errors="coerce", utc=True)
    df["date_added"] = pd.to_datetime(df["date_added"], errors="coerce", utc=True)
    return df


def build_daily_digest_html(contacts, ads, apts):
    """Produce an email-safe HTML digest mirroring Today page (inline styles only)."""
    now_utc = pd.Timestamp.utcnow()
    now_naive = now_utc.tz_localize(None)
    yesterday_start = (now_naive.normalize() - pd.Timedelta(days=1))
    today_start = now_naive.normalize()
    today_label = pd.Timestamp.now().strftime("%A, %B %d, %Y")

    # Yesterday's KPIs
    y_leads = contacts[(contacts["date_added"] >= yesterday_start.tz_localize("UTC"))
                        & (contacts["date_added"] < today_start.tz_localize("UTC"))]
    n_leads_y = len(y_leads)
    y_spend = float(ads[ads["date"] == yesterday_start]["spend_cad"].sum()) if not ads.empty else 0
    hot_pool = contacts[contacts["in_scope"]
                        & (contacts["date_added"] >= now_utc - pd.Timedelta(days=120))
                        & (contacts["smart_score"] >= 50)
                        & ((contacts["phone"].fillna("") != "") | (contacts["email"].fillna("") != ""))]
    stale = hot_pool[hot_pool["days_since_activity"].fillna(0) > 14].sort_values("smart_score", ascending=False)
    new_shop = contacts[contacts["is_shopper"] & (contacts["date_updated"] >= now_utc - pd.Timedelta(days=7))]

    # Helpers — inline styles only (email-safe)
    kpi = lambda label, val, sub, color: (
        f'<td style="background:{color};color:#fff;padding:14px 18px;border-radius:8px;text-align:left;vertical-align:top;">'
        f'<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;opacity:0.9;">{label}</div>'
        f'<div style="font-size:24px;font-weight:800;line-height:1.1;margin:4px 0;">{val}</div>'
        f'<div style="font-size:11px;opacity:0.85;">{sub}</div></td>')

    html = [f"""<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#222;">
<div style="max-width:680px;margin:0 auto;background:#fff;">
<div style="background:linear-gradient(135deg,#3C3B6E 0%,#8B1B2A 100%);color:#fff;padding:24px 24px;">
  <div style="font-size:11px;letter-spacing:1.5px;opacity:0.85;text-transform:uppercase;">STA Daily Digest</div>
  <div style="font-size:28px;font-weight:800;margin-top:4px;">{today_label}</div>
  <div style="font-size:14px;opacity:0.9;margin-top:6px;">Your day at a glance — open the dashboard for full detail.</div>
</div>
<div style="padding:20px 24px;">
<table cellpadding="0" cellspacing="6" style="width:100%;border-collapse:separate;"><tr>
{kpi("Leads — yesterday", f"{n_leads_y:,}", "new contacts", "#3C3B6E")}
{kpi("Spend — yesterday", f"${y_spend:,.2f}", "CAD", "#B22234")}
{kpi("Hot to work", f"{len(hot_pool):,}", "score ≥ 50, reachable", "#3C3B6E")}
{kpi("Going cold", f"{len(stale):,}", "untouched 14d+", "#D4A017")}
</tr></table>
"""]

    # Section: upcoming appointments
    if not apts.empty:
        upcoming = apts[(apts["start_time"] >= now_utc) & (apts["status"].isin(["confirmed", "scheduled"]))].copy()
        if not upcoming.empty:
            preds_html = []
            contacts_idx = contacts.set_index("id")
            for _, apt in upcoming.sort_values("start_time").head(10).iterrows():
                cid = apt.get("contact_id")
                c = contacts_idx.loc[cid].to_dict() if cid in contacts_idx.index else {}
                pct, signals = predict_show(c, apt.to_dict())
                color = "#1F7A3A" if pct >= 75 else ("#D4A017" if pct >= 50 else "#8B1B2A")
                emoji = "🟢" if pct >= 75 else ("🟡" if pct >= 50 else "🔴")
                nm = f"{c.get('first_name') or ''} {c.get('last_name') or ''}".strip().title() or "(no name)"
                when = apt["start_time"].tz_convert("America/Edmonton").strftime("%a %b %-d, %-I:%M %p") if pd.notna(apt["start_time"]) else "—"
                sig = " · ".join(signals) if signals else ""
                preds_html.append(f"""
<div style="background:#fff;border-left:5px solid {color};padding:8px 12px;margin:6px 0;border-radius:5px;font-size:13px;">
<div style="display:flex;justify-content:space-between;">
<div><b style="color:#3C3B6E;">{emoji} {nm}</b> · <span style="color:#555;">{when}</span><br>
<span style="font-size:11px;color:#666;">{sig}</span></div>
<div style="background:{color};color:#fff;font-weight:800;padding:4px 10px;border-radius:14px;font-size:14px;align-self:center;">{pct}%</div>
</div></div>""")
            html.append('<h3 style="color:#3C3B6E;margin:24px 0 8px 0;">📅 Upcoming appointments</h3>')
            html.append("".join(preds_html))

    # Section: top 5 to text today
    top5 = hot_pool.sort_values("smart_score", ascending=False).head(5)
    if not top5.empty:
        html.append('<h3 style="color:#3C3B6E;margin:24px 0 8px 0;">📞 Call or text these 5 today</h3>')
        for _, r in top5.iterrows():
            rr = dict(r)
            sms = draft_outreach(rr)["sms"]
            nm = f"{rr.get('first_name') or ''} {rr.get('last_name') or ''}".strip().title()
            score = int(rr.get("smart_score") or 0)
            color = "#1F7A3A" if score >= 75 else "#D4A017"
            phone = rr.get("phone") or rr.get("email") or "—"
            html.append(f"""
<div style="background:#fff;border:2px solid {color};border-radius:8px;padding:10px 14px;margin:8px 0;font-size:13px;">
<div style="display:flex;justify-content:space-between;">
<div><b style="color:#3C3B6E;font-size:14px;">{nm}</b><br>
<span style="font-size:12px;color:#666;">{phone}</span></div>
<div style="background:{color};color:#fff;font-weight:800;padding:3px 10px;border-radius:14px;font-size:13px;align-self:center;">{score}</div>
</div>
<div style="margin-top:8px;padding:8px;background:#f6f6f6;border-radius:5px;font-size:12px;color:#333;font-style:italic;">{sms}</div>
</div>""")

    # Section: going cold (top 5)
    if not stale.empty:
        cold5 = stale.head(5)
        html.append('<h3 style="color:#8B1B2A;margin:24px 0 8px 0;">⚠️ Going cold — recover these</h3>')
        html.append('<table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;">')
        html.append('<tr style="background:#3C3B6E;color:#fff;"><th align="left">Name</th><th align="left">Score</th><th align="left">Days quiet</th><th align="left">Stage</th></tr>')
        for _, r in cold5.iterrows():
            nm = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip().title()
            html.append(f'<tr style="border-bottom:1px solid #eee;"><td>{nm}</td><td>{int(r.get("smart_score") or 0)}</td><td>{int(r.get("days_since_activity") or 0)}d</td><td>{r.get("pipeline_stage_name") or "—"}</td></tr>')
        html.append('</table>')

    # Section: this week's wins
    if not new_shop.empty:
        html.append(f'<h3 style="color:#1F7A3A;margin:24px 0 8px 0;">🎉 {len(new_shop)} new shopper{"s" if len(new_shop)!=1 else ""} this week</h3>')
        for _, r in new_shop.head(8).iterrows():
            nm = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip().title()
            html.append(f'<div style="font-size:13px;padding:4px 0;">✅ <b>{nm}</b> — {r.get("pipeline_stage_name") or ""}</div>')

    html.append("""
<div style="margin-top:30px;padding:18px;background:#f6f6f6;border-radius:8px;font-size:12px;color:#666;text-align:center;">
<a href="https://sta-dashboard-skubin.streamlit.app/" style="color:#3C3B6E;font-weight:700;text-decoration:none;">→ Open the full dashboard</a>
</div>
</div></div></body></html>""")
    return "".join(html)


def predict_show(contact_row, appointment_row):
    """Heuristic show-probability scorer. Returns (probability_pct, list_of_signals).

    Calibrated from STA historical data (n=491 past appointments, 25.7% no-show baseline):
      - "no show" tag in history    → 90% no-show, drops score hard
      - score >= 80                 → 97% show, +20
      - "hot lead" tag              → 96% show, +20
      - score 50-79                 → 77% show, +5
      - score < 50                  → 67% show, -8
      - appointment 7-14d out       → 92% show, +12 (warm + committed)
      - appointment 1-3d out        → 68% show, -5 (too cold to remember)
      - wednesday slot              → 85% show, +10
      - 7-9pm slot (evening)        → 82% show, +5
      - 5-7pm slot                  → 68% show, -5
    """
    pct = 75.0  # baseline
    signals = []
    # Score
    try: score = int(contact_row.get("smart_score") or contact_row.get("score") or 0)
    except: score = 0
    if score >= 80: pct += 20; signals.append("✅ score 80+")
    elif score >= 50: pct += 5
    else: pct -= 8; signals.append("⚠️ score under 50")
    # Tags
    try:
        tags = [str(t).lower() for t in (json.loads(contact_row.get("tags_json") or "[]") or [])]
    except Exception:
        tags = []
    if any("no show" in t for t in tags):
        pct -= 50; signals.append("🚨 previous no-show")
    if any("hot lead" in t for t in tags):
        pct += 20; signals.append("✅ hot lead tag")
    if any("can't afford" in t or "cannot afford" in t for t in tags):
        pct += 15; signals.append("✅ engaged (afford flag)")
    # Lead time
    s = appointment_row.get("start_time")
    da = appointment_row.get("date_added")
    if pd.notna(s) and pd.notna(da):
        days_ahead = (s - da).total_seconds() / 86400
        if days_ahead >= 7 and days_ahead < 14:
            pct += 12; signals.append(f"✅ booked {int(days_ahead)}d out")
        elif days_ahead >= 1 and days_ahead < 3:
            pct -= 5; signals.append("⚠️ booked 1-3d out (cold zone)")
    # Day of week + hour (in their local time)
    if pd.notna(s):
        dow = s.day_name()
        hour = s.hour
        if dow == "Wednesday": pct += 10; signals.append("✅ Wednesday slot")
        elif dow == "Sunday": pct -= 8; signals.append("⚠️ Sunday slot")
        if 19 <= hour < 21: pct += 5
        elif 17 <= hour < 19: pct -= 5
    pct = max(5, min(95, pct))
    return int(round(pct)), signals


@st.cache_data(ttl=300)
def load_opportunity_stages():
    """contact_id -> set of stage names. Built from opportunities table.
    Lets us filter by 'who is in Cat 1 stage' rather than 'who has the tag'."""
    if not DB_PATH.exists(): return {}
    try:
        with sqlite3.connect(DB_PATH) as cx:
            rows = cx.execute("SELECT contact_id, pipeline_stage_name FROM opportunities WHERE contact_id IS NOT NULL").fetchall()
    except sqlite3.OperationalError:
        return {}
    out = {}
    for cid, stage in rows:
        if not stage: continue
        out.setdefault(cid, set()).add(stage)
    return out

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
    # Opportunity-stage lookup (so we can filter by pipeline stage, not just tag)
    opp_stages = load_opportunity_stages()
    df["opp_stages"] = df["id"].map(lambda cid: opp_stages.get(cid, set()))
    df["in_cat1_stage"] = df["opp_stages"].apply(lambda s: any("Cat 1" in (x or "") for x in s))
    df["in_no_show_stage"] = df["opp_stages"].apply(lambda s: any("No Show" in (x or "") or "no show" in (x or "").lower() for x in s))
    df["in_hot_stage"] = df["opp_stages"].apply(lambda s: any("Hot" in (x or "") for x in s))
    df["in_booked_stage"] = df["opp_stages"].apply(lambda s: any("Booked" in (x or "") or "Appt Confirmed" in (x or "") for x in s))
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
view = st.sidebar.radio("View", ["Today", "Overview", "Cost per Customer", "Hot list (call these)", "Sales Funnel", "Demographics", "Push to Meta", "Sync history"])
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

if view == "Today":
    today_date = pd.Timestamp.now().strftime("%A, %B %d, %Y")
    st.markdown(f"""<div style="background:linear-gradient(135deg,{BLUE} 0%,{DARK_RED} 100%); padding:1.8rem 2rem; border-radius:14px; margin-bottom:1rem; color:{WHITE};">
<div style="font-size:0.75rem; letter-spacing:1.5px; opacity:0.85; text-transform:uppercase;">Today</div>
<div style="font-size:2rem; font-weight:800; line-height:1.1;">{today_date}</div>
<div style="font-size:0.95rem; opacity:0.9; margin-top:0.4rem;">Your daily action board — call these, watch these, celebrate these.</div>
</div>""", unsafe_allow_html=True)
    st.markdown('<div class="flag-strip"></div>', unsafe_allow_html=True)

    if contacts.empty:
        st.warning("No contacts loaded yet."); st.stop()

    # Daily digest email controls (sends to Shannon's GHL contact via GHL email API)
    em_c1, em_c2, em_c3 = st.columns([2, 1, 1])
    em_c1.markdown(f'<div style="padding-top:0.4rem; color:#666; font-size:0.85rem;">📧 Daily digest goes to <b>gethealthy@shannonandarielle.com</b> via GHL</div>', unsafe_allow_html=True)
    preview_clicked = em_c2.button("👁️ Preview email")
    send_clicked = em_c3.button("📨 Send now", type="primary")

    if preview_clicked or send_clicked:
        apts_for_digest = load_appointments()
        digest_html = build_daily_digest_html(contacts, ads, apts_for_digest)
        digest_subject = f"STA Daily Digest — {pd.Timestamp.now().strftime('%a %b %-d')}"
        if preview_clicked:
            with st.expander("📧 Email preview (HTML)", expanded=True):
                st.components.v1.html(digest_html, height=900, scrolling=True)
        if send_clicked:
            with st.spinner("Sending via GHL..."):
                ok, msg = send_email_via_ghl(SELF_NOTIFY_CONTACT_ID, digest_subject, digest_html)
            if ok:
                st.success(f"✅ Digest sent to gethealthy@shannonandarielle.com — check your inbox in a minute.")
            else:
                st.error(f"❌ Send failed: {msg}")

    now_utc = pd.Timestamp.utcnow()
    now_naive = now_utc.tz_localize(None)
    yesterday_start = (now_naive.normalize() - pd.Timedelta(days=1))
    today_start = now_naive.normalize()

    # KPI row: yesterday's leads/spend, today's hot count, stale-risk count
    leads_yest = contacts[(contacts["date_added"] >= yesterday_start.tz_localize("UTC")) & (contacts["date_added"] < today_start.tz_localize("UTC"))]
    n_leads_yest = len(leads_yest)
    if not ads.empty:
        spend_yest = float(ads[ads["date"] == yesterday_start]["spend_cad"].sum())
    else:
        spend_yest = 0
    # Hot leads = score >=50, in scope, last 120 days, with phone or email
    hot_pool = contacts[contacts["in_scope"]
                        & (contacts["date_added"] >= now_utc - pd.Timedelta(days=120))
                        & (contacts["smart_score"] >= 50)
                        & ((contacts["phone"].fillna("") != "") | (contacts["email"].fillna("") != ""))]
    n_hot = len(hot_pool)
    # Stale-risk = high score AND days_since_activity > 14
    stale_risk = hot_pool[hot_pool["days_since_activity"].fillna(0) > 14].sort_values("smart_score", ascending=False)
    n_stale = len(stale_risk)
    # New shoppers this week (became shopper - infer from is_shopper + date_updated in last 7d as proxy)
    week_ago = now_utc - pd.Timedelta(days=7)
    new_shop = contacts[contacts["is_shopper"] & (contacts["date_updated"] >= week_ago)].sort_values("date_updated", ascending=False)
    n_new_shop = len(new_shop)

    k1, k2, k3, k4 = st.columns(4)
    with k1: st.markdown(f'<div class="kpi-card"><p class="label">Yesterday — Leads</p><p class="value">{n_leads_yest:,}</p><p class="sub">new contacts</p></div>', unsafe_allow_html=True)
    with k2: st.markdown(f'<div class="kpi-card"><p class="label">Yesterday — Spend</p><p class="value">${spend_yest:,.2f}</p><p class="sub">CAD</p></div>', unsafe_allow_html=True)
    with k3: st.markdown(f'<div class="kpi-card red"><p class="label">Hot leads to work</p><p class="value">{n_hot:,}</p><p class="sub">score ≥ 50, reachable</p></div>', unsafe_allow_html=True)
    with k4: st.markdown(f'<div class="kpi-card"><p class="label">Going cold ⚠️</p><p class="value">{n_stale:,}</p><p class="sub">hot, untouched 14d+</p></div>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    # ── SECTION 1: Call/text these 5 today ──────────────────────────
    st.markdown(f"<h2 style='color:{BLUE}; margin-top:0.6rem;'>📞 Call or text these 5 today</h2>", unsafe_allow_html=True)
    st.caption("Top 5 highest-intent contacts who can be reached. Drafts ready — copy, send, move on.")
    top5 = hot_pool.sort_values("smart_score", ascending=False).head(5)
    if top5.empty:
        st.info("No reachable hot leads right now. Adjust filters on the Hot list tab if this looks wrong.")
    else:
        for _, row in top5.iterrows():
            r = dict(row)
            name = ((r.get("first_name") or "") + " " + (r.get("last_name") or "")).strip().title() or "(no name)"
            phone = r.get("phone") or ""
            email = r.get("email") or ""
            score = int(r.get("smart_score") or 0)
            stage = r.get("pipeline_stage_name") or ""
            tz = r.get("timezone") or ""
            interest = r.get("interest_level") or ""
            video = r.get("video_watched") or ""
            days_first = r.get("days_since_first_seen")
            days_active = r.get("days_since_activity")
            drafts = draft_outreach(r)
            chip_color = GREEN if score >= 75 else (GOLD if score >= 50 else "#888")
            ctx_bits = []
            if stage: ctx_bits.append(f"<b>Stage:</b> {stage}")
            if interest: ctx_bits.append(f"<b>Interest:</b> {interest}")
            if video: ctx_bits.append(f"<b>Video:</b> {video}")
            if pd.notna(days_first): ctx_bits.append(f"<b>In funnel:</b> {int(days_first)}d")
            if pd.notna(days_active): ctx_bits.append(f"<b>Last activity:</b> {int(days_active)}d ago")
            if tz: ctx_bits.append(f"<b>TZ:</b> {tz}")
            ctx_html = " · ".join(ctx_bits) if ctx_bits else "<span style='color:#aaa'>no extra context</span>"
            with st.container():
                st.markdown(f"""
<div style="background:{WHITE}; border:2px solid {chip_color}; border-radius:10px; padding:1rem 1.2rem; margin:0.5rem 0 0 0; box-shadow:0 2px 6px rgba(0,0,0,0.05);">
  <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
    <div>
      <div style="font-weight:800; color:{BLUE}; font-size:1.05rem;">{name}</div>
      <div style="font-size:0.85rem; color:#555;">📞 {phone or '—'}  ·  ✉️ {email or '—'}</div>
    </div>
    <div style="background:{chip_color}; color:{WHITE}; font-weight:800; padding:0.3rem 0.8rem; border-radius:18px; font-size:0.85rem;">{score}</div>
  </div>
  <div style="font-size:0.8rem; color:#666; padding:0.4rem 0; border-top:1px solid #eee; margin:0.4rem 0;">{ctx_html}</div>
  <div style="font-size:0.72rem; color:#888; font-style:italic;">💡 <b>Why this draft:</b> {drafts['rationale']}</div>
</div>""", unsafe_allow_html=True)
                # Three-channel tabs: SMS / Email / Voicemail
                t_sms, t_email, t_vm = st.tabs([f"📱 SMS ({len(drafts['sms'])} chars)", "✉️ Email", "🎙️ Voicemail"])
                with t_sms:
                    st.text_area("", value=drafts["sms"], height=80,
                                 key=f"today_sms_{r.get('id', name)}",
                                 help="Edit, then copy with Ctrl+A → Ctrl+C", label_visibility="collapsed")
                with t_email:
                    st.text_input("Subject", value=drafts["email_subject"],
                                  key=f"today_subj_{r.get('id', name)}")
                    st.text_area("Body", value=drafts["email_body"], height=180,
                                 key=f"today_email_{r.get('id', name)}",
                                 help="Edit, then copy with Ctrl+A → Ctrl+C")
                with t_vm:
                    st.caption(f"~{len(drafts['voicemail'].split())} words · roughly 25–35 seconds spoken")
                    st.text_area("", value=drafts["voicemail"], height=120,
                                 key=f"today_vm_{r.get('id', name)}",
                                 help="Practice once, then leave the voicemail", label_visibility="collapsed")

    # ── SECTION: Upcoming appointments + show-rate prediction ──────────────────────────
    apts = load_appointments()
    if not apts.empty:
        upcoming = apts[(apts["start_time"] >= now_utc) & (apts["status"].isin(["confirmed", "scheduled"]))].copy()
        if not upcoming.empty:
            # Join contact features
            contacts_idx = contacts.set_index("id") if "id" in contacts.columns else None
            preds = []
            for _, apt in upcoming.iterrows():
                cid = apt.get("contact_id")
                c = contacts_idx.loc[cid].to_dict() if (contacts_idx is not None and cid in contacts_idx.index) else {}
                pct, signals = predict_show(c, apt.to_dict())
                preds.append({
                    "contact_id": cid,
                    "first": c.get("first_name") or "",
                    "last": c.get("last_name") or "",
                    "phone": c.get("phone") or "",
                    "start_time": apt.get("start_time"),
                    "title": apt.get("title"),
                    "calendar_name": apt.get("calendar_name"),
                    "show_pct": pct,
                    "signals": signals,
                    "score": int(c.get("smart_score") or c.get("score") or 0),
                })
            up_df = pd.DataFrame(preds).sort_values("start_time").head(15)
            st.markdown(f"<h2 style='color:{BLUE}; margin-top:1.5rem;'>📅 Upcoming appointments — show-rate prediction</h2>", unsafe_allow_html=True)
            st.caption(f"{len(upcoming)} confirmed appointments ahead. Model calibrated from 491 past appointments (25.7% baseline no-show rate). Red = high risk, call to confirm. Green = locked in.")
            for _, row in up_df.iterrows():
                pct = row["show_pct"]
                color = GREEN if pct >= 75 else (GOLD if pct >= 50 else DARK_RED)
                emoji = "🟢" if pct >= 75 else ("🟡" if pct >= 50 else "🔴")
                name = f"{row['first']} {row['last']}".strip().title() or "(no name)"
                when_local = row["start_time"].tz_convert("America/Edmonton").strftime("%a %b %-d, %-I:%M %p") if pd.notna(row["start_time"]) else "—"
                signals_html = " · ".join(row["signals"]) if row["signals"] else "<span style='color:#aaa'>no strong signals</span>"
                phone_txt = row["phone"] or "(no phone)"
                action_text = ""
                if pct < 50:
                    action_text = f'<div style="font-size:0.8rem; color:{DARK_RED}; font-weight:700; margin-top:0.3rem;">⚠️ HIGH NO-SHOW RISK — text them today to confirm</div>'
                elif pct < 70:
                    action_text = f'<div style="font-size:0.8rem; color:{GOLD}; margin-top:0.3rem;">💡 Worth a confirmation text 24h before</div>'
                st.markdown(f"""
<div style="background:{WHITE}; border-left:6px solid {color}; padding:0.7rem 1rem; margin:0.4rem 0; border-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
  <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
    <div style="flex:1;">
      <div style="font-weight:700; color:{BLUE}; font-size:0.95rem;">{emoji} {name} · <span style="color:#555; font-weight:500;">{when_local}</span></div>
      <div style="font-size:0.8rem; color:#666;">📞 {phone_txt} · {row.get('calendar_name') or ''}</div>
      <div style="font-size:0.78rem; color:#555; margin-top:0.3rem;">{signals_html}</div>
      {action_text}
    </div>
    <div style="background:{color}; color:{WHITE}; font-weight:800; padding:0.5rem 0.9rem; border-radius:20px; font-size:1.05rem;">{pct}%</div>
  </div>
</div>""", unsafe_allow_html=True)

    # ── SECTION 2: Going cold ──────────────────────────
    st.markdown(f"<h2 style='color:{DARK_RED}; margin-top:1.5rem;'>⚠️ Going cold — recover these</h2>", unsafe_allow_html=True)
    st.caption("High-score contacts you haven't touched in 14+ days. Each one is risk of churn.")
    cold = stale_risk.head(10)
    if cold.empty:
        st.success("Nothing going cold. Nice work staying on top of follow-up.")
    else:
        cold_view = cold[["smart_score","first_name","last_name","phone","email",
                          "days_since_activity","days_since_first_seen","pipeline_stage_name","interest_level","smart_reason"]].copy()
        cold_view.columns = ["Score","First","Last","Phone","Email","Days quiet","In funnel","Stage","Interest","Why hot"]
        st.dataframe(cold_view, use_container_width=True, hide_index=True,
                     column_config={"Score": st.column_config.ProgressColumn("Score", min_value=0, max_value=100),
                                    "Why hot": st.column_config.TextColumn("Why hot", width="medium")})

    # ── SECTION 3: This week's wins ──────────────────────────
    st.markdown(f"<h2 style='color:{GREEN}; margin-top:1.5rem;'>🎉 New shoppers this week</h2>", unsafe_allow_html=True)
    if new_shop.empty:
        st.caption("No new shoppers tagged in the last 7 days yet. Make some happen today 🚀")
    else:
        st.caption(f"{n_new_shop} new shopper{'s' if n_new_shop != 1 else ''} tagged in the last 7 days — celebrate, then think about who in the Hot list looks similar.")
        win_view = new_shop.head(15)[["first_name","last_name","phone","email","date_updated","first_utm_campaign","pipeline_stage_name"]].copy()
        win_view["date_updated"] = pd.to_datetime(win_view["date_updated"]).dt.strftime("%a %b %d")
        win_view.columns = ["First","Last","Phone","Email","Tagged on","From campaign","Stage"]
        st.dataframe(win_view, use_container_width=True, hide_index=True)

elif view == "Overview":
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
        # Inner ads (the actual creatives running in this adset right now).
        # Per-ad attribution uses first_utm_content (the ad-level ID) — different
        # from first_utm_term which we discovered is the ADSET ID.
        inner_ad_list = []
        ad_groups = (adset_ads[adset_ads["spend_cad"] > 0]
                     .groupby(["ad_id", "ad_name"], as_index=False).agg(
                         spend_total=("spend_cad", "sum"),
                         first_date=("date", "min"),
                         last_date=("date", "max")
                     ).sort_values("spend_total", ascending=False))
        for _, ad_row in ad_groups.iterrows():
            ad_id = str(ad_row["ad_id"])
            ad_spend_df = adset_ads[adset_ads["ad_id"] == ad_row["ad_id"]]
            ad_contacts = contacts[contacts["first_utm_content"].astype(str) == ad_id]
            ad_w = {}
            for d in (30, 60, 90):
                sp = float(ad_spend_df[ad_spend_df["date"] >= now_naive - pd.Timedelta(days=d)]["spend_cad"].sum())
                wc = ad_contacts[ad_contacts["date_added"] >= now_utc - pd.Timedelta(days=d)]
                ad_w[d] = {"spend": sp, "leads": len(wc), "shoppers": int(wc["is_shopper"].sum()) if len(wc) else 0}
            inner_ad_list.append({"ad_name": ad_row["ad_name"], "windows": ad_w})

        adset_cards.append({
            "adset": adset, "days_since": days_since, "windows": windows,
            "inner_ads": inner_ad_list,
        })

    # Render 3 side-by-side adset cards
    cols = st.columns(3)
    for col, card in zip(cols, adset_cards):
        last_txt = ("running today" if card["days_since"] is not None and card["days_since"] <= 1
                    else (f"{card['days_since']}d since last spend" if card["days_since"] is not None else "no recent spend"))
        # Per-ad breakdown: one mini-block per ad inside this adset showing 30/60/90 leads + shoppers
        inner_blocks = []
        for ad in card["inner_ads"]:
            rows_html = ""
            for d in (30, 60, 90):
                w = ad["windows"][d]
                sp_txt = f'${w["spend"]:,.0f}' if w["spend"] else '<span style="color:#bbb">—</span>'
                ld_txt = f'{w["leads"]:,}' if w["leads"] else '<span style="color:#bbb">0</span>'
                sh_txt = f'<b style="color:{GREEN}">{w["shoppers"]:,}</b>' if w["shoppers"] else '<span style="color:#bbb">0</span>'
                rows_html += f'<tr><td style="padding:0.15rem 0.3rem; font-size:0.65rem; color:#555; font-weight:600;">{d}D</td>' \
                             f'<td style="padding:0.15rem 0.3rem; text-align:right; font-size:0.75rem;">{sp_txt}</td>' \
                             f'<td style="padding:0.15rem 0.3rem; text-align:right; font-size:0.75rem; color:{RED};">{ld_txt}</td>' \
                             f'<td style="padding:0.15rem 0.3rem; text-align:right; font-size:0.75rem;">{sh_txt}</td></tr>'
            inner_blocks.append(f"""
<div style="border-top:1px solid #eee; padding:0.4rem 0; margin-top:0.3rem;">
  <div style="font-weight:700; color:{BLUE}; font-size:0.85rem; margin-bottom:0.2rem;">{ad['ad_name']}</div>
  <table style="width:100%; border-collapse:collapse;">
    <thead><tr style="background:#f5f5f9;">
      <th style="padding:0.15rem 0.3rem; text-align:left; font-size:0.6rem; color:#888; letter-spacing:0.4px;">WIN</th>
      <th style="padding:0.15rem 0.3rem; text-align:right; font-size:0.6rem; color:#888; letter-spacing:0.4px;">SPEND</th>
      <th style="padding:0.15rem 0.3rem; text-align:right; font-size:0.6rem; color:#888; letter-spacing:0.4px;">LEADS</th>
      <th style="padding:0.15rem 0.3rem; text-align:right; font-size:0.6rem; color:#888; letter-spacing:0.4px;">SHOP</th>
    </tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
</div>""")
        inner_lines = "".join(inner_blocks) if inner_blocks else '<div style="font-size:0.85rem; color:#888; padding:0.2rem 0;">No recent spend.</div>'
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
  <div style="font-size:0.7rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:0.7rem; padding-top:0.5rem; border-top:2px solid #eee;">Ads in this set</div>
  {inner_lines}
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
    df = df.sort_values("smart_score", ascending=False).head(500).copy()
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

    # --- SMS draft generator: top N hot contacts ---
    st.markdown(f"<h2 style='color:{BLUE}; margin-top:1.8rem;'>📱 SMS drafts — call/text these today</h2>", unsafe_allow_html=True)
    st.caption("Personalized text drafts generated from each contact's GHL fields (mission, last AI convo, video watch %, interest level). Edit in place, then copy. Drafts are crafted under 200 characters so they fit one SMS.")

    n_drafts = st.slider("How many drafts to generate", min_value=3, max_value=25, value=8, step=1, key="n_drafts")
    draft_pool = df.head(n_drafts).to_dict("records")

    if not draft_pool:
        st.info("No contacts match your filters above — adjust to see drafts.")
    else:
        for i, row in enumerate(draft_pool):
            name = ((row.get("first_name") or "") + " " + (row.get("last_name") or "")).strip().title() or "(no name)"
            phone = row.get("phone") or ""
            email = row.get("email") or ""
            score = int(row.get("smart_score") or 0)
            stage = row.get("pipeline_stage_name") or ""
            tz = row.get("timezone") or ""
            convo = row.get("convo_summary") or ""
            mission = row.get("mission") or ""
            interest = row.get("interest_level") or ""
            video = row.get("video_watched") or ""
            fin = row.get("fin_importance") or ""

            draft = draft_sms(row)
            # Score-colored chip
            chip_color = GREEN if score >= 75 else (GOLD if score >= 50 else "#888")
            ctx_bits = []
            if stage: ctx_bits.append(f"<b>Stage:</b> {stage}")
            if interest: ctx_bits.append(f"<b>Interest:</b> {interest}")
            if video: ctx_bits.append(f"<b>Video:</b> {video}")
            if fin: ctx_bits.append(f"<b>Fin importance:</b> {fin}")
            if tz: ctx_bits.append(f"<b>TZ:</b> {tz}")
            ctx_html = " · ".join(ctx_bits) if ctx_bits else "<span style='color:#aaa'>no extra context</span>"

            with st.expander(f"#{i+1}  {name}  ·  score {score}  ·  {phone or email or '(no contact info)'}", expanded=(i < 3)):
                # Context block
                st.markdown(f"""
<div style='background:#fafafa; border-left:3px solid {chip_color}; padding:0.5rem 0.8rem; margin-bottom:0.6rem; font-size:0.85rem;'>
  <div style='color:#555; margin-bottom:0.3rem;'>{ctx_html}</div>
  {"<div style='color:#333;'><b>Mission:</b> " + mission + "</div>" if mission else ""}
  {"<div style='color:#333; margin-top:0.2rem;'><b>Last AI convo:</b> " + convo[:280] + ("…" if len(convo) > 280 else "") + "</div>" if convo else ""}
</div>
""", unsafe_allow_html=True)
                edited = st.text_area(
                    f"SMS draft ({len(draft)} chars)",
                    value=draft, height=90, key=f"sms_draft_{row.get('id', i)}",
                    help="Edit freely. SMS is ideally <160 chars (1 message) or <320 chars (2 messages). Click the field and Ctrl+A → Ctrl+C to copy."
                )
                # Live char-count + phone
                cc1, cc2 = st.columns([1, 3])
                cc1.markdown(f"<div style='font-size:0.75rem; color:#888;'>{len(edited)} chars</div>", unsafe_allow_html=True)
                if phone:
                    cc2.markdown(f"<div style='font-size:0.85rem; color:{BLUE}; font-weight:600;'>📱 {phone}</div>", unsafe_allow_html=True)

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

elif view == "Demographics":
    st.markdown(f"<h1 style='color:{BLUE};'>Demographics — where your ad dollars actually go</h1>", unsafe_allow_html=True)
    st.caption("From Meta's age + gender + region breakdown of the last 90 days of ad spend. Compare where the money lands vs your target audience (Women 35-60, US).")

    # Load demo + region data
    try:
        with sqlite3.connect(DB_PATH) as cx:
            demo = pd.read_sql_query("SELECT * FROM ad_insights_demo", cx)
            region = pd.read_sql_query("SELECT * FROM ad_insights_region", cx)
    except Exception:
        demo = pd.DataFrame(); region = pd.DataFrame()
    if demo.empty:
        st.warning("No demographic data synced yet. Run the daily digest job to populate."); st.stop()
    demo["date"] = pd.to_datetime(demo["date"], errors="coerce")
    region["date"] = pd.to_datetime(region["date"], errors="coerce")

    # Filter: STA-relevant campaigns + window
    win = st.slider("Window (days)", 7, 90, 90, 7)
    cutoff = pd.Timestamp.now().normalize() - pd.Timedelta(days=win)
    demo = demo[demo["date"] >= cutoff]
    region = region[region["date"] >= cutoff]
    # Optional campaign filter
    campaigns = sorted(demo["campaign_name"].dropna().unique().tolist())
    sel = st.multiselect("Campaigns (blank = all)", campaigns, default=campaigns)
    if sel:
        demo = demo[demo["campaign_name"].isin(sel)]
        region = region[region["campaign_name"].isin(sel)]

    # ── TARGETING ALIGNMENT KPIs ────────────────────
    TARGET_GENDER = "female"
    TARGET_AGES = ("35-44", "45-54")  # Women 35-60 — we'll include 55-64 partially
    total_spend = float(demo["spend_cad"].sum())
    total_leads = int(demo["leads"].sum())
    in_target = demo[(demo["gender"] == TARGET_GENDER) & (demo["age"].isin(list(TARGET_AGES) + ["55-64"]))]
    in_target_spend = float(in_target["spend_cad"].sum())
    in_target_leads = int(in_target["leads"].sum())
    off_target_spend = total_spend - in_target_spend
    male_spend = float(demo[demo["gender"] == "male"]["spend_cad"].sum())
    over_60_spend = float(demo[demo["age"] == "65+"]["spend_cad"].sum())

    k1, k2, k3, k4 = st.columns(4)
    with k1: st.markdown(f'<div class="kpi-card"><p class="label">Total spend</p><p class="value">${total_spend:,.0f}</p><p class="sub">last {win} days</p></div>', unsafe_allow_html=True)
    with k2: st.markdown(f'<div class="kpi-card green"><p class="label">On-target spend</p><p class="value">${in_target_spend:,.0f}</p><p class="sub">{in_target_spend*100/max(total_spend,1):.0f}% — Women 35-64</p></div>', unsafe_allow_html=True)
    with k3: st.markdown(f'<div class="kpi-card red"><p class="label">To MEN</p><p class="value">${male_spend:,.0f}</p><p class="sub">{male_spend*100/max(total_spend,1):.0f}% (target: 0%)</p></div>', unsafe_allow_html=True)
    with k4: st.markdown(f'<div class="kpi-card"><p class="label">To 65+</p><p class="value">${over_60_spend:,.0f}</p><p class="sub">{over_60_spend*100/max(total_spend,1):.0f}% — outside target</p></div>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    # ── HEATMAP: spend by age+gender ────────────────
    st.markdown(f"<h3 style='color:{BLUE}; margin-top:0.5rem;'>Spend by age + gender</h3>", unsafe_allow_html=True)
    grid = demo.groupby(["gender", "age"], as_index=False).agg(
        spend=("spend_cad", "sum"),
        impressions=("impressions", "sum"),
        clicks=("clicks", "sum"),
        leads=("leads", "sum"))
    grid["cpl"] = grid.apply(lambda r: r["spend"] / r["leads"] if r["leads"] else 0, axis=1)
    grid["ctr"] = grid.apply(lambda r: r["clicks"] * 100 / r["impressions"] if r["impressions"] else 0, axis=1)
    # Plot heatmap of spend
    AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
    GENDER_ORDER = ["female", "male", "unknown"]
    pivot_spend = grid.pivot_table(index="gender", columns="age", values="spend", fill_value=0)
    pivot_spend = pivot_spend.reindex(index=[g for g in GENDER_ORDER if g in pivot_spend.index],
                                       columns=[a for a in AGE_ORDER if a in pivot_spend.columns])
    pivot_leads = grid.pivot_table(index="gender", columns="age", values="leads", fill_value=0).reindex_like(pivot_spend)
    pivot_cpl = grid.pivot_table(index="gender", columns="age", values="cpl", fill_value=0).reindex_like(pivot_spend)
    # Stack text in cells: $ + leads + CPL
    cell_text = pivot_spend.copy().astype(object)
    for g in pivot_spend.index:
        for a in pivot_spend.columns:
            sp = pivot_spend.loc[g, a]
            ld = int(pivot_leads.loc[g, a]) if not pd.isna(pivot_leads.loc[g, a]) else 0
            cpl = pivot_cpl.loc[g, a]
            cell_text.loc[g, a] = f"${sp:.0f}<br>{ld} leads<br>${cpl:.2f}/lead" if sp else ""
    import plotly.graph_objects as go
    fig = go.Figure(data=go.Heatmap(
        z=pivot_spend.values, x=pivot_spend.columns.tolist(), y=pivot_spend.index.tolist(),
        text=cell_text.values, texttemplate="%{text}", textfont={"size": 11, "color": "#fff"},
        colorscale=[[0, "#eee"], [0.3, "#9aa1cc"], [1, BLUE]], showscale=True,
        hovertemplate="<b>%{y} %{x}</b><br>Spend: $%{z:,.2f}<extra></extra>"))
    fig.update_layout(height=320, margin=dict(l=10, r=10, t=10, b=10), xaxis_title="", yaxis_title="")
    st.plotly_chart(fig, use_container_width=True)

    # ── COST PER LEAD by demo ───────────────────────
    st.markdown(f"<h3 style='color:{BLUE}; margin-top:1rem;'>Cost per lead — cheapest demos first</h3>", unsafe_allow_html=True)
    by_demo = grid[(grid["leads"] >= 10) & (grid["gender"] != "unknown")].sort_values("cpl")
    disp = by_demo[["gender", "age", "spend", "impressions", "clicks", "leads", "ctr", "cpl"]].copy()
    disp["gender"] = disp["gender"].str.title()
    disp["spend"] = disp["spend"].apply(lambda v: f"${v:,.0f}")
    disp["impressions"] = disp["impressions"].apply(lambda v: f"{v:,}")
    disp["clicks"] = disp["clicks"].apply(lambda v: f"{v:,}")
    disp["leads"] = disp["leads"].apply(lambda v: f"{v:,}")
    disp["ctr"] = disp["ctr"].apply(lambda v: f"{v:.2f}%")
    disp["cpl"] = disp["cpl"].apply(lambda v: f"${v:.2f}")
    st.dataframe(disp, use_container_width=True, hide_index=True,
                 column_config={"gender": "Gender", "age": "Age", "spend": "Spend",
                                "impressions": "Impressions", "clicks": "Clicks",
                                "leads": "Leads", "ctr": "CTR", "cpl": "Cost / lead"})
    # Winner callout
    if not by_demo.empty:
        winner = by_demo.iloc[0]
        st.markdown(f'''<div class="winner">
<span class="tag">Cheapest leads</span>
<h2>{winner["gender"].title()} {winner["age"]}</h2>
<p>${winner["cpl"]:.2f} per lead — {int(winner["leads"]):,} leads from ${winner["spend"]:,.0f}. Want more of these? Push budget here in your Phase 1 campaign's age/gender targeting.</p>
</div>''', unsafe_allow_html=True)

    # ── TOP REGIONS ─────────────────────────────────
    if not region.empty:
        st.markdown(f"<h3 style='color:{BLUE}; margin-top:1rem;'>Top regions by spend</h3>", unsafe_allow_html=True)
        region_grid = region.groupby("region", as_index=False).agg(
            spend=("spend_cad", "sum"), leads=("leads", "sum"),
            impressions=("impressions", "sum"), clicks=("clicks", "sum"))
        region_grid["cpl"] = region_grid.apply(lambda r: r["spend"] / r["leads"] if r["leads"] else 0, axis=1)
        region_grid = region_grid.sort_values("spend", ascending=False).head(20)
        rdisp = region_grid.copy()
        rdisp["spend"] = rdisp["spend"].apply(lambda v: f"${v:,.0f}")
        rdisp["leads"] = rdisp["leads"].apply(lambda v: f"{v:,}")
        rdisp["impressions"] = rdisp["impressions"].apply(lambda v: f"{v:,}")
        rdisp["clicks"] = rdisp["clicks"].apply(lambda v: f"{v:,}")
        rdisp["cpl"] = rdisp["cpl"].apply(lambda v: f"${v:.2f}" if isinstance(v, (int, float)) and v else "—")
        st.dataframe(rdisp, use_container_width=True, hide_index=True,
                     column_config={"region": "Region", "spend": "Spend", "leads": "Leads",
                                    "impressions": "Impressions", "clicks": "Clicks", "cpl": "Cost / lead"})

elif view == "Push to Meta":
    st.markdown(f"<h1 style='color:{BLUE};'>Push to Meta — Custom Audience</h1>", unsafe_allow_html=True)
    st.caption("Generate Meta-ready CSVs from your GHL data. Use Include audiences as the seed for Lookalikes; use Exclude audiences to stop Meta from showing ads to people who already said no.")

    if contacts.empty:
        st.warning("No contacts loaded yet."); st.stop()

    def _tag_has(j, needles):
        try: t = [str(x).lower() for x in (json.loads(j or "[]") or [])]
        except: return False
        return any(n in t for n in needles)

    mode = st.radio("Mode", ["✅ Include — build a Lookalike from these", "🚫 Exclude — stop showing ads to these"],
                    horizontal=True, key="meta_push_mode")
    is_include = mode.startswith("✅")

    INCLUDE_GROUPS = {
        "Shopped - Cat 1 (highest-value buyers)": {
            "name": f"STA Cat 1 Buyers — {pd.Timestamp.now().strftime('%b %d %Y')}",
            # Union of: contacts with the "shopped cat 1" tag OR with an opportunity
            # in the Cat 1 pipeline stage. (Stage is the source of truth in GHL.)
            "filter": lambda c: c[c["tags_json"].apply(lambda j: _tag_has(j, ["shopped cat 1"]))
                                  | c["in_cat1_stage"]],
        },
        "All shoppers (Cat 1 + StaceyB + Placed Order + Beef)": {
            "name": f"STA All Shoppers — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "filter": lambda c: c[c["is_shopper"] | c["in_cat1_stage"]],
        },
        "Hot leads, score ≥ 80 (qualified but not yet buyers)": {
            "name": f"STA Hot Leads 80+ — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "filter": lambda c: c[c["in_scope"] & (c["smart_score"] >= 80)
                                  & ((c["phone"].fillna("") != "") | (c["email"].fillna("") != ""))],
        },
        "Hot leads + shoppers combined": {
            "name": f"STA Buyers + Hot — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "filter": lambda c: pd.concat([c[c["is_shopper"]],
                                           c[c["in_scope"] & (c["smart_score"] >= 80)
                                             & ((c["phone"].fillna("") != "") | (c["email"].fillna("") != ""))]
                                          ]).drop_duplicates(subset=["id"]),
        },
    }
    EXCLUDE_GROUPS = {
        "All bad-fit (recommended) — no-show + not interested + can't afford + DND": {
            "name": f"STA EXCLUDE Bad Fit — {pd.Timestamp.now().strftime('%b %d %Y')}",
            # Intentionally excludes "lost on first text" and "dead no answer" —
            # those people just went quiet; they may re-engage and shouldn't be
            # cut off from ads forever.
            "needles": ["no show", "not interested", "can't afford", "cannot afford",
                        "dnd", "appt cancelled",
                        "canceled membership", "canceled recovery"],
        },
        "No-shows only — booked but didn't show up": {
            "name": f"STA EXCLUDE No-Shows — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "needles": ["no show", "appt cancelled"],
        },
        "Not interested — explicitly said no": {
            "name": f"STA EXCLUDE Not Interested — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "needles": ["not interested"],
        },
        "Affordability — said it's too expensive": {
            "name": f"STA EXCLUDE Cannot Afford — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "needles": ["can't afford", "cannot afford"],
        },
        "Already enrolled — existing customers (separate audience for upsell)": {
            "name": f"STA Already Customers — {pd.Timestamp.now().strftime('%b %d %Y')}",
            "needles": ["already enrolled"],
        },
    }

    s1, s2 = st.columns([2, 1])
    if is_include:
        seed_choice = s1.radio("Seed group", list(INCLUDE_GROUPS.keys()), index=0, key="inc_seed")
        cfg = INCLUDE_GROUPS[seed_choice]
        seed = cfg["filter"](contacts)
        needles_used = None
    else:
        seed_choice = s1.radio("Exclusion seed", list(EXCLUDE_GROUPS.keys()), index=0, key="exc_seed")
        cfg = EXCLUDE_GROUPS[seed_choice]
        needles_used = cfg["needles"]
        seed = contacts[contacts["tags_json"].apply(lambda j: _tag_has(j, needles_used))]
    audience_name = s2.text_input("Audience name (for your reference)", value=cfg["name"], key="aud_name")

    # Diagnostic: which tags contributed (exclude mode only)
    if not is_include and not seed.empty:
        with st.expander("Which tags triggered this audience?"):
            from collections import Counter
            tag_hits = Counter()
            for tj in seed["tags_json"]:
                try: tt = [str(x).lower() for x in (json.loads(tj or "[]") or [])]
                except: continue
                for n in needles_used:
                    for tag in tt:
                        if n in tag:
                            tag_hits[tag] += 1
                            break
            for t, c in tag_hits.most_common():
                st.write(f"• **{c:,}** contacts tagged `{t}`")

    n_total = len(seed)
    n_email = int((seed["email"].fillna("") != "").sum()) if n_total else 0
    n_phone = int((seed["phone"].fillna("") != "").sum()) if n_total else 0
    n_reachable = int(((seed["email"].fillna("") != "") | (seed["phone"].fillna("") != "")).sum()) if n_total else 0

    accent = GREEN if is_include else DARK_RED
    k1, k2, k3, k4 = st.columns(4)
    with k1: st.markdown(f'<div class="kpi-card"><p class="label">Total in seed</p><p class="value">{n_total:,}</p><p class="sub">{seed_choice.split(" (")[0]}</p></div>', unsafe_allow_html=True)
    with k2: st.markdown(f'<div class="kpi-card red"><p class="label">With email</p><p class="value">{n_email:,}</p><p class="sub">{n_email*100/max(n_total,1):.0f}%</p></div>', unsafe_allow_html=True)
    with k3: st.markdown(f'<div class="kpi-card"><p class="label">With phone</p><p class="value">{n_phone:,}</p><p class="sub">{n_phone*100/max(n_total,1):.0f}%</p></div>', unsafe_allow_html=True)
    with k4: st.markdown(f'<div class="kpi-card green"><p class="label">Reachable</p><p class="value">{n_reachable:,}</p><p class="sub">email or phone present</p></div>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    if n_reachable == 0:
        st.error("No contacts in this seed have email or phone — nothing to upload.")
    else:
        # NOTE: We intentionally do NOT include a country column. Shannon's GHL
        # contacts have country=CA by default (it defaults to the GHL location
        # in Edmonton, AB) but the actual buyers are mostly US-based. Including
        # the wrong country tanks Meta's match rate. Without the column, Meta
        # infers country from phone area code, email domain, and Pixel signals
        # — which is more accurate in this case.
        def _norm_phone(p):
            if not p or pd.isna(p): return ""
            digits = "".join(ch for ch in str(p) if ch.isdigit())
            if not digits: return ""
            if len(digits) == 10: digits = "1" + digits
            return digits
        def _norm_email(e):
            if not e or pd.isna(e): return ""
            return str(e).strip().lower()
        def _norm_name(n):
            if not n or pd.isna(n): return ""
            return "".join(ch for ch in str(n).strip().lower() if ch.isalpha() or ch.isspace()).strip()

        rows = []
        for _, r in seed.iterrows():
            rows.append({
                "email": _norm_email(r.get("email")),
                "phone": _norm_phone(r.get("phone")),
                "fn": _norm_name(r.get("first_name")),
                "ln": _norm_name(r.get("last_name")),
            })
        out_df = pd.DataFrame(rows)
        out_df = out_df[(out_df["email"] != "") | (out_df["phone"] != "")].reset_index(drop=True)
        st.caption("Country column omitted — GHL's country defaults to Edmonton (CA) but most shoppers are US. Meta will infer country from phone area code instead.")

        st.markdown(f"<h3 style='color:{accent}'>Step 1 — Download the CSV</h3>", unsafe_allow_html=True)
        st.write(f"**{len(out_df):,} contacts** in the file. Meta will hash everything server-side on upload.")
        csv_bytes = out_df.to_csv(index=False).encode("utf-8")
        filename = audience_name.replace("—", "-").replace(" ", "_").lower() + ".csv"
        st.download_button("📥 Download Meta-ready CSV", data=csv_bytes,
                           file_name=filename, mime="text/csv", type="primary")
        with st.expander("Preview first 10 rows"):
            st.dataframe(out_df.head(10), use_container_width=True, hide_index=True)

        st.markdown(f"<h3 style='color:{accent}; margin-top:1.2rem;'>Step 2 — Upload to Meta Ads Manager</h3>", unsafe_allow_html=True)
        if is_include:
            st.markdown(f"""
1. Go to **[Ads Manager → Audiences](https://www.facebook.com/adsmanager/audiences)** (Instagram Advertising account).
2. Click **Create audience** → **Custom Audience** → **Customer list**.
3. Choose **"No, this list doesn't include a column for LTV"**.
4. Upload the file you just downloaded (`{filename}`).
5. Original data source = **"Customers who have already bought from my business"**.
6. Audience name = **`{audience_name}`**.
7. Submit. Meta matches in 30 min to a few hours.

**Then build the Lookalike:**
8. Once processing finishes, click **Create Audience → Lookalike**.
9. Source = **`{audience_name}`**.
10. Location = **United States** (or wherever your ads run).
11. Audience size = **1%** (tightest, highest quality for small seeds).
12. Click Create. LAL processes in 4–24 hours.
13. In your Phase 1 campaign's targeting, swap in the new LAL.
""")
            st.info("Pro tip: keep the old LAL running alongside for a week so you can A/B on cost-per-shopper before cutting it.")
        else:
            st.markdown(f"""
1. Go to **[Ads Manager → Audiences](https://www.facebook.com/adsmanager/audiences)**.
2. Click **Create audience** → **Custom Audience** → **Customer list**.
3. Choose **"No, this list doesn't include a column for LTV"**.
4. Upload the file (`{filename}`).
5. Original data source = **"People who haven't purchased from my business"** (this audience is people we want to AVOID).
6. Audience name = **`{audience_name}`**.
7. Submit. Meta matches in 30 min to a few hours.

**Then use it as an EXCLUSION in every campaign:**
8. Open each ad set in your active campaigns (Phase 1, Phase 2 Retarget, MM Conversions).
9. Under **Audience Controls → Excluded Custom Audiences**, click **Browse** → pick **`{audience_name}`**.
10. Save the ad set.
11. **DO NOT build a Lookalike from this** — lookalikes of bad-fit people are noisy and unreliable. Just exclude the specific people.

**What this does:** Meta will stop showing your ads to anyone on this list AND won't include them when calculating your Lookalike audiences. Budget that was being wasted on people who already said no gets redirected to people who might actually convert.
""")
            potential_save_pct = 25 if "All bad-fit" in seed_choice else 10
            st.warning(f"⚡ **Potential savings:** if even a fraction of these {n_reachable:,} people were getting impressions, excluding them could redirect ~{potential_save_pct}% of your daily spend toward fresh prospects.")

elif view == "Sync history":
    st.markdown(f"<h1 style='color:{BLUE};'>Sync history</h1>", unsafe_allow_html=True)
    st.dataframe(load_log(), use_container_width=True, hide_index=True)
