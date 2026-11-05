# -*- coding: utf-8 -*-
"""fb-group-compositor.py - pictures for Shannon's Switch to America Facebook group posts
(and a "photo in the middle" Pinterest pin variant).

Shannon 2026-11-05: "start posting every couple of days in my Switch to America Facebook Group...
make that a great interactive post with a great picture. The scan link needs to be clickable and seen."
The link is clickable in the post text; this picture makes it SEEN: the scan address is printed
on the image itself, under a gold "free scan" pill.

Same colors and fonts as pin-compositor.py (navy, gold, white, Georgia bold headline). The photo
sits in the middle in full color, text sits on navy above and below it, so no face is ever under
the headline.

    python fb-group-compositor.py fb  <photo> <out.png> <crop_center_x 0-1> "<headline line 1>" "<line 2>"
    python fb-group-compositor.py pin <photo> <out.png> <crop_center_x 0-1> "<EYEBROW>" "<line 1>" "<line 2>"

<photo> is a file name in ../blog-images (or a full path). crop_center_x = where the person is,
as a share of the photo width (0.55 = a little right of center).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
IMGDIR = os.path.join(HERE, "..", "blog-images")
NAVY = (11, 37, 69); GOLD = (244, 163, 0); WHITE = (255, 255, 255); CREAM = (230, 238, 247)
ARIALBD = [r"C:\Windows\Fonts\arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
ARIAL = [r"C:\Windows\Fonts\arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
GEO = [r"C:\Windows\Fonts\georgiab.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
SCAN_TEXT = "scan.ismyhometoxic.com/now"


def font(paths, s):
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, s)
    return ImageFont.load_default()


def crop_to(im, w, h, cx):
    """Scale the photo to cover w x h and crop around horizontal center cx (0-1)."""
    iw, ih = im.size
    s = max(w / iw, h / ih)
    im = im.resize((int(iw * s) + 1, int(ih * s) + 1), Image.LANCZOS)
    x = int(im.width * cx - w / 2)
    x = max(0, min(x, im.width - w))
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def center(d, W, text, fnt, y, fill, spacing=0):
    if spacing:
        ws = [fnt.getbbox(c)[2] - fnt.getbbox(c)[0] for c in text]
        x = (W - (sum(ws) + spacing * (len(text) - 1))) / 2
        for c, w in zip(text, ws):
            d.text((x, y), c, font=fnt, fill=fill); x += w + spacing
    else:
        bb = d.textbbox((0, 0), text, font=fnt)
        d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], y), text, font=fnt, fill=fill)


def fit(lines, maxw, start, low=40):
    s = start
    probe = ImageDraw.Draw(Image.new("RGB", (9, 9)))
    while s > low:
        f = font(GEO, s)
        if all(probe.textbbox((0, 0), ln, font=f)[2] <= maxw for ln in lines):
            return f, s
        s -= 2
    return font(GEO, low), low


def blend_edges(canvas, top, bottom, W, fade=70):
    """Fade the photo's top and bottom edges into navy so the bands feel like one piece."""
    sc = Image.new("RGBA", canvas.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sc)
    for i in range(fade):
        a = int(255 * (1 - i / fade) ** 1.6)
        sd.line([(0, top + i), (W, top + i)], fill=NAVY + (a,))
        sd.line([(0, bottom - 1 - i), (W, bottom - 1 - i)], fill=NAVY + (a,))
    return Image.alpha_composite(canvas, sc)


def pill(d, W, y, text, size, pw=None, ph=96):
    fc = font(ARIALBD, size); bb = d.textbbox((0, 0), text, font=fc)
    pw = pw or (bb[2] - bb[0]) + 110
    px = (W - pw) / 2
    d.rounded_rectangle([px, y, px + pw, y + ph], radius=ph // 2, fill=GOLD)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], y + (ph - (bb[3] - bb[1])) / 2 - bb[1]), text, font=fc, fill=NAVY)


def build_fb(photo, out, cx, head):
    W, H = 1080, 1350
    PH_TOP, PH_BOT = 0, 800
    canvas = Image.new("RGBA", (W, H), NAVY + (255,))
    canvas.paste(crop_to(photo, W, PH_BOT - PH_TOP, cx).convert("RGBA"), (0, PH_TOP))
    canvas = blend_edges(canvas, PH_TOP - 200, PH_BOT, W, fade=90)
    d = ImageDraw.Draw(canvas)
    d.rectangle([16, 16, W - 16, H - 16], outline=GOLD, width=4)
    fh, hs = fit(head, 960, 76)
    y = PH_BOT + 12
    for ln in head:
        center(d, W, ln, fh, y, WHITE); y += int(hs * 1.16)
    y += 14
    d.rectangle([W / 2 - 70, y, W / 2 + 70, y + 6], fill=GOLD)
    y += 34
    pill(d, W, y, "Take the free 3-minute home scan", 40, ph=92)
    y += 92 + 22
    center(d, W, SCAN_TEXT, font(ARIALBD, 40), y, WHITE)
    center(d, W, "SWITCH TO AMERICA", font(ARIALBD, 26), H - 74, GOLD, spacing=5)
    canvas.convert("RGB").save(out, "PNG")
    return out


def build_pin(photo, out, cx, eyebrow, head):
    W, H = 1000, 1500
    PH_TOP, PH_BOT = 400, 1170
    canvas = Image.new("RGBA", (W, H), NAVY + (255,))
    canvas.paste(crop_to(photo, W, PH_BOT - PH_TOP, cx).convert("RGBA"), (0, PH_TOP))
    canvas = blend_edges(canvas, PH_TOP, PH_BOT, W, fade=80)
    d = ImageDraw.Draw(canvas)
    d.rectangle([18, 18, W - 18, H - 18], outline=GOLD, width=4)
    center(d, W, eyebrow, font(ARIALBD, 32), 70, GOLD, spacing=7)
    fh, hs = fit(head, 880, 88)
    y = 130
    for ln in head:
        center(d, W, ln, fh, y, WHITE); y += int(hs * 1.12)
    d.rectangle([W / 2 - 70, y + 14, W / 2 + 70, y + 20], fill=GOLD)
    pill(d, W, 1215, "Take the free home scan", 44, pw=620, ph=106)
    center(d, W, "SWITCH TO AMERICA", font(ARIALBD, 27), 1372, WHITE, spacing=4)
    center(d, W, "scan.ismyhometoxic.com", font(ARIAL, 27), 1414, CREAM)
    canvas.convert("RGB").save(out, "PNG")
    return out


if __name__ == "__main__":
    mode, ph, out, cx = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
    p = ph if os.path.isabs(ph) else os.path.join(IMGDIR, ph)
    im = Image.open(p).convert("RGB")
    rest = sys.argv[5:]
    for t in rest:
        assert "\u2014" not in t and "\u2013" not in t, "no em or en dashes"
    if mode == "fb":
        print(build_fb(im, out, cx, [t for t in rest if t]))
    else:
        print(build_pin(im, out, cx, rest[0], [t for t in rest[1:] if t]))
