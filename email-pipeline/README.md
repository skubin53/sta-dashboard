# email-pipeline

**The 30-day sequence lives in GoHighLevel as templates `STA Email 02` to `STA Email 31`.**
There is no `STA Email 01`. The numbering starts at 02.

| File | What it is | In GHL? |
|---|---|---|
| `v3-manifest.json` + `v3-*.html` | **v3. LIVE in GHL since 2026-08-11.** Pain-first, red and navy buttons. | **YES** |
| `STA-First-10-Emails-v2.md` | v2, superseded. Kept for its link list. | no |

## Status, 2026-08-11: v3 IS LIVE

Templates 02 to 11 now carry v3. Verified by fetching each template's `previewUrl` and matching
every sentence of the new body, **never by the POST status code**, because POST returns `ok:true`
whether or not the content landed. "The cupboard nobody opens" is gone.

**v3 is not v2 reworded.** Shannon: *"This isn't a history lesson. This is about their pain
points and the solutions we have for them."* v2 opened every email with a number, and a fact is
not a hook. So the order flipped:

    v2   fact -> pain -> villain -> receipt -> action -> text link
    v3   HER PAIN -> the thing doing it -> one receipt -> the fix -> BUTTON

Buttons are table based with `bgcolor` on the `td`, the only construction Outlook renders. Red
`#b22234` for the scan, navy `#0e2240` for the Circle. Regenerate with
`sta-tools/build-emails-v3.py`, never by hand.

## What pushing actually involves, and why it is not just a body swap

The new emails are a different sequence, not a reword of the old one:

| GHL template | Old angle | New angle |
|---|---|---|
| STA Email 02 | the cupboard nobody opens | J&J, $5.5 billion, 76,000 claims |
| STA Email 03 | nobody has to tell you | Tide, New York wrote a law |
| STA Email 04 | one word | Dawn, fragrance hides thousands |
| STA Email 05 | count them on your hands | Pine-Sol, 37 million bottles recalled |
| STA Email 06 | "I raised you on that stuff" | Febreze, you are adding to the air |
| STA Email 07 | 3am, the hallway | Lysol, registered as a pesticide |
| STA Email 08 | start with the room you never think about | mascara, 82% of waterproof |
| STA Email 09 | i put it on one sheet | Ziploc, do not microwave the bag |
| STA Email 10 | ok but it is in everything | avocado oil, UC Davis |
| STA Email 11 | you did not know | benzene recall, and the close |

So it is 10 body writes AND 10 renames. It also changes the shape of the first third of the
arc: the old ten were emotional beats (safety, then refusal, then belonging), the new ten are
one villain and one receipt each, every one carrying the scan link and the Circle.

**That is a deliberate change and Shannon should see this table before it ships**, because
emails 12 to 31 were written to follow the old ten.

## The write path

`POST /emails/builder/data` with `editorType: "html"`. `PATCH` only renames, it does not
touch the body. **Verify by fetching the template's `previewUrl`, never by the status code.**
See [[ghl-email-template-body-api]].
