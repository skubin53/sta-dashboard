# email-pipeline

**The 30-day sequence lives in GoHighLevel as templates `STA Email 02` to `STA Email 31`.**
There is no `STA Email 01`. The numbering starts at 02.

| File | What it is | In GHL? |
|---|---|---|
| `STA-First-10-Emails-v2.md` | The rewritten first 10, 2026-08-11 | **NO. Not pushed.** |

## Status, 2026-08-11

The rewrite is done and reviewed. It is **not live**. The live templates 02 to 11 still carry
the old versions, including "the cupboard nobody opens", which Shannon rejected.

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
