# -*- coding: utf-8 -*-
"""Switch to America - Pinterest pin compositor (Shannon-approved style 2026-09-21).
Composites a REAL blog photo (from ../blog-images) into a dark-navy 1000x1500 pin:
the photo shows in full color through the middle, gold + white text top and bottom.
Scroll-stopping QUESTION headline tied to each post's real concern. No competitor
labels in frame. American Made, no percentages, no em dashes, never Melaleuca.

Run: python pin-compositor.py   ->  writes pinx_<slug>.png into $PIN_OUT (default cwd).
Recipes are embedded below; edit a headline here and re-run to regenerate.
Needs Pillow (pip install pillow)."""
import io, os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
IMGDIR = os.environ.get("PIN_IMGDIR", os.path.join(HERE, "..", "blog-images"))
OUT = os.environ.get("PIN_OUT", os.getcwd())
W, H = 1000, 1500
NAVY=(11,37,69); GOLD=(244,163,0); WHITE=(255,255,255); CREAM=(230,238,247)

def font(paths, s):
    for p in paths:
        if os.path.exists(p): return ImageFont.truetype(p, s)
    return ImageFont.truetype("DejaVuSans-Bold.ttf", s)
ARIALBD=[r"C:\Windows\Fonts\arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
ARIAL=[r"C:\Windows\Fonts\arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
GEO=[r"C:\Windows\Fonts\georgiab.ttf", r"C:\Windows\Fonts\arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]

def cover(im):
    iw,ih=im.size; s=max(W/iw,H/ih); im=im.resize((int(iw*s)+1,int(ih*s)+1))
    x=(im.width-W)//2; y=(im.height-H)//2; return im.crop((x,y,x+W,y+H))

def center(d,text,fnt,y,fill,spacing=0,shadow=None):
    if spacing:
        ws=[fnt.getbbox(c)[2]-fnt.getbbox(c)[0] for c in text]; x=(W-(sum(ws)+spacing*(len(text)-1)))/2
        for c,w in zip(text,ws):
            if shadow: d.text((x+2,y+2),c,font=fnt,fill=shadow)
            d.text((x,y),c,font=fnt,fill=fill); x+=w+spacing
    else:
        bb=d.textbbox((0,0),text,font=fnt); x=(W-(bb[2]-bb[0]))/2-bb[0]
        if shadow: d.text((x+2,y+3),text,font=fnt,fill=shadow)
        d.text((x,y),text,font=fnt,fill=fill)

def fit(lines):
    s=94
    while s>50:
        f=font(GEO,s); d=ImageDraw.Draw(Image.new("RGB",(9,9)))
        if all(d.textbbox((0,0),ln,font=f)[2]<=850 for ln in lines): return f,s
        s-=4
    return font(GEO,50),50

def build(photo, slug, eyebrow, head):
    base=cover(Image.open(os.path.join(IMGDIR,photo)).convert("RGB")).convert("RGBA")
    scrim=Image.new("RGBA",(W,H),(0,0,0,0)); sd=ImageDraw.Draw(scrim)
    for y in range(H):
        a=0
        if y<700: a=int(238*(1-(y/700))**1.15)
        if y>930: a=max(a,int(240*((y-930)/(H-930))**1.2))
        sd.line([(0,y),(W,y)],fill=(11,37,69,a))
    base=Image.alpha_composite(base,scrim); d=ImageDraw.Draw(base)
    d.rectangle([18,18,W-18,H-18],outline=GOLD,width=4)
    center(d,eyebrow,font(ARIALBD,32),120,GOLD,spacing=7,shadow=(0,0,0))
    fh,hs=fit(head); y=210
    for ln in head: center(d,ln,fh,y,WHITE,shadow=(3,10,22)); y+=int(hs*1.12)
    dy=y+16; d.rectangle([W/2-70,dy,W/2+70,dy+6],fill=GOLD)
    pw,ph=560,110; px=(W-pw)/2; py=1200
    d.rounded_rectangle([px,py,px+pw,py+ph],radius=55,fill=GOLD)
    fc=font(ARIALBD,44); bb=d.textbbox((0,0),"See the safer swap",font=fc)
    d.text(((W-(bb[2]-bb[0]))/2-bb[0],py+(ph-(bb[3]-bb[1]))/2-bb[1]),"See the safer swap",font=fc,fill=NAVY)
    center(d,"SWITCH TO AMERICA",font(ARIALBD,27),1380,WHITE,spacing=4,shadow=(0,0,0))
    center(d,"scan.ismyhometoxic.com",font(ARIAL,25),1422,CREAM,shadow=(0,0,0))
    out=os.path.join(OUT,"pinx_%s.png"%slug); base.convert("RGB").save(out,"PNG"); return out

# slug, photo, eyebrow, headline line 1, headline line 2
RECIPES=[
 ("dawn","dawn-clean-kitchen-morning-v1.webp","NON-TOXIC CLEANING","Is your dish soap","causing cancer?"),
 ("fabuloso","fabuloso-freedom-v2.webp","NON-TOXIC CLEANING","Is your floor cleaner","growing bacteria?"),
 ("dryer","aredryershe-freedom-v1.webp","NON-TOXIC LAUNDRY","What are dryer sheets","doing to your skin?"),
 ("nonstick","arenonstick-freedom-v1.webp","SAFER COOKWARE","Is your nonstick","pan toxic?"),
 ("air","areairfreshe-belonging-v1.webp","FRAGRANCE-FREE HOME","Is your air freshener","making you sick?"),
 ("lysol","is-lysol-safe-to-inhale-03.webp","NON-TOXIC CLEANING","Is your disinfectant","hurting your lungs?"),
 ("pinesol","fabuloso-two-moms-kitchen-v1.webp","NON-TOXIC CLEANING","Is that clean smell","bad for your lungs?"),
 ("febreze","febreze-belonging-v1.webp","FRAGRANCE-FREE HOME","Is that fresh scent","safe to breathe?"),
 ("tide","tide-freedom-v1.webp","NON-TOXIC LAUNDRY","Is your laundry soap","harming your skin?"),
 ("sunscreen","issunscreen-freedom-v1.webp","CLEAN BEAUTY","Is your sunscreen","in your blood?"),
]

if __name__=="__main__":
    for slug,photo,eb,h1,h2 in RECIPES:
        try: print("wrote", build(photo,slug,eb,[h1,h2]))
        except Exception as e: print("FAILED", slug, e)
