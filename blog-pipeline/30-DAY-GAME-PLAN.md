# The 30 Day Game Plan
### Blog + photos, 2026-08-08 through 2026-08-29

Rebuilt 2026-08-08. Replaces the old `30-day-calendar.md`, which had drifted.

---

## The rule that generated this plan

**One live post per question.** Not one per product, one per QUESTION. Before anything
goes on this calendar it gets checked against every live post. If a live post already
answers the same question about the same product, the request is deleted, not renamed.

That check is what produced the deletions below. It is also the check to run before
adding anything new.

---

## What was deleted, and why

Five requests were asking for a second set of photos for a question that is already
answered and already ranking.

| Deleted | Duplicated | Live since |
|---|---|---|
| Is Bleach Safe Around Kids? | Is Clorox Toxic? | 2026-07-18 |
| Are Yankee Candles Toxic? | Are Bath and Body Works Candles Toxic? | 2026-08-08 |
| Is Lab Grown Meat Safe? | What Is Happening to Our Beef Industry? | 2026-08-07 |
| Is Tide Laundry Detergent Toxic? | Is Tide Toxic? | 2026-07-16 |
| Is Febreze Safe to Breathe? | Is Febreze Safe? | 2026-07-17 |

**25 renders saved.**

### Three that were flagged and KEPT

Photo Claude also flagged nonstick, antiperspirant and baby shampoo. Each survives for a
specific reason, and the reason matters more than the verdict:

- **Nonstick pans (08-20)** vs the live HexClad post. HexClad is a BRAND post.
  "Are nonstick pans toxic" is the CATEGORY question and a far bigger search. A brand
  post and a category post do not compete, they feed each other.
- **Antiperspirant (08-22)** vs the live "Is Spray Deodorant Safe?". That post is about
  the 2021 benzene recall in aerosols. This one is aluminium in a stick. Different
  villain, different chemistry, different reader.
- **Johnson's baby shampoo (08-21).** Nothing live covers it. 08-10 is Suave.

---

## The calendar

Sets marked DONE are rendered and committed. Everything else is `status: requested`.

| Date | Post | Room | Photos |
|---|---|---|---|
| Aug 08 | Are Air Fresheners Toxic? | Air | **PUBLISHED** |
| Aug 08 | Are Bath and Body Works Candles Toxic? | Air | **PUBLISHED** |
| Aug 09 | Is Colgate Toothpaste Safe? | Bathroom | DONE, written, ready |
| Aug 10 | Is Suave Shampoo Safe? | Kids | DONE, needs writing |
| Aug 11 | Is Your Tap Water Safe to Drink? | Kitchen | requested |
| Aug 12 | Is Crest Toothpaste Safe? | Bathroom | requested |
| Aug 13 | Is Downy Fabric Softener Toxic? | Laundry | requested |
| Aug 14 | Is Vaseline Safe for Babies? | Kids | requested |
| Aug 15 | Is Gatorade Bad for Kids? | Kitchen | requested |
| Aug 16 | Is Bottled Water Safe? | Kitchen | requested |
| Aug 17 | Are Seed Oils Bad for You? | Kitchen | requested |
| Aug 18 | Are Plastic Cutting Boards Safe? | Kitchen | requested |
| Aug 19 | Are Dryer Sheets Toxic? | Laundry | requested |
| Aug 20 | Are Nonstick Pans Toxic? | Kitchen | requested |
| Aug 21 | Is Johnson's Baby Shampoo Safe? | Kids | requested |
| Aug 22 | Is Antiperspirant Safe? | Bathroom | requested |
| Aug 23 | Is Talc in Makeup Safe? | Makeup | requested |
| Aug 24 | Is Sunscreen Safe? | Bathroom | requested |
| Aug 25 | Is Head and Shoulders Safe? | Bathroom | requested |
| Aug 26 | Are Baby Wipes Safe? | Kids | requested |
| Aug 27 | Is Your Lipstick Safe? | Makeup | requested |
| Aug 28 | Are Food Dyes Still Legal in American Food? | Kitchen | requested |
| Aug 29 | Are Canned Foods Lined With BPA? | Kitchen | requested |

**19 sets outstanding, 95 images.**

### Room balance

Kitchen 9, Bathroom 5, Kids 4, Laundry 2, Makeup 2, Air 2 (both published).

Deliberately kitchen-heavy. The kitchen is where she is three times a day, it is the
room with the most unanswered questions, and the water and oil posts are the highest
search volume on the whole list.

---

## The actual bottleneck

It is not credits and it is not writing. **It is renders.**

The queue ran dry on 2026-08-10. Every post from Aug 11 on is blocked until its photo
set lands, because a post cannot pass gates C1, C4 or C5 without images, and publishing
one without them puts it straight back in the backlog that was found on 2026-08-07.

**Order to render in.** Straight down the calendar, oldest date first. Do not batch by
room and do not skip ahead, because the blog publishes in date order and one missing set
stalls everything behind it.

---

## Standing rules for every set

- 5 beats: hero, villain, turning-point, belonging, freedom.
- **Beat 1 is the COVER only.** It never appears in the body. Four body images.
- Temperature ramps coldest at the villain to warmest at the last frame.
- Show the real branded product and its FRONT branding.
- **Never** an ingredient panel, a back label, or anyone reading fine print.
- The villain is the product and the company. Never the woman using it.
- No gendered baby language on any Kids set.
- Same person, same clothes, same hands across all five beats.

## When a set lands

```
python blog-images.py <date> --live
python blog-gates.py <date> --links
python blog-publish.py <date> <date> --live
```

`blog-images.py` converts the CloudFront links to permanent `scan.ismyhometoxic.com`
URLs. Never publish against a CloudFront link, it expires and the post goes bare.
