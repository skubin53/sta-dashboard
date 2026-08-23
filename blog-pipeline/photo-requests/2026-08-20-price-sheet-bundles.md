---
date: 2026-08-20
type: document-images
for: "Go Ahead. Look Us Up. price sheet, page 2"
images: 3
aspect: "WIDE. 3:1 landscape banner crop. These sit as a strip across the top of a bundle card
         in a PDF, roughly 500pt x 165pt, so anything square gets cropped to ribbons."
requested_by: Shannon, 2026-08-20
---

# Three bundle banners for the price sheet

Not a blog set. These are three **standalone banners**, one per bundle card on page 2 of the
`Go Ahead. Look Us Up.` PDF. That page is nothing but numbers right now and it needs a face.
Shannon's words: **"humans relate to pictures."**

**No continuity requirement between the three.** Different rooms, different moments. But the
same woman should appear in at least two of them so the sheet feels like one household rather
than a stock library.

## The woman

**Mid fifties to early sixties.** Not styled, not glamorous, not frail. She looks like somebody
who has run a home for thirty years and still does. Reading glasses pushed up into her hair is
fine. Soft upper arms, real neck, laugh lines around the eyes, hands that have done work.

**This is deliberate and it matters.** The audience is women 40 to 60. Every other brand in this
category shoots a 28-year-old in a white kitchen and it reads as somebody else's life.

---

## IMAGE 1, The Laundry Room

**A woman in her late fifties loading a washing machine in a real laundry room.**

Morning light from one window, side-on. She is mid-task, not posing, maybe half turned as if
somebody just spoke to her from the hallway. A basket of unfolded washing on top of the dryer.
A dog, medium sized, scruffy, no particular breed, lying on the floor near her feet the way dogs
do when they have decided that is where the person is.

Honest room. A shelf with mismatched bottles. A stray sock on the floor. Paint that has been
touched up once.

**Warm. Ordinary. Unremarkable in the best way.**

---

## IMAGE 2, The Grocery Run    <-- SHANNON ASKED FOR THIS ONE SPECIFICALLY

**Grandma pushing a grocery cart with her granddaughter sitting in the cart.**

Granddaughter is roughly two or three, sitting in the child seat facing Grandma, holding
something she has been given to keep her occupied. Grandma is pushing, mid-aisle, looking at the
little one rather than at the camera. Both of them caught mid-moment, one of them saying
something to the other.

Real supermarket aisle, slightly cluttered shelving, the flat overhead light a real store has.
Not a bright clean studio set.

**Grandma is the subject. The child is the reason she is smiling.**

That distinction is the whole point. Shannon's standing rule is never to build on a baby,
because only about 7% of her women have one at home. A **grandchild** is a completely different
thing, and it lands squarely on a woman of 55 who has one every second weekend.

---

## IMAGE 3, The Spray Bottle

**Same woman as Image 1. Wiping down a kitchen counter with a cloth and a spray bottle.**

Late afternoon light. She is leaning into it slightly, doing the job properly, not daintily
dabbing. A real kitchen behind her: a fruit bowl, a kettle, a stack of post, a calendar on the
wall. The dog from Image 1 can be visible in the background if it works.

**Not sparkling-clean-showroom.** A counter mid-clean, with the cloth actually touching it.

---

## Standing rules, all three

- **REAL LIFE, not AI-perfect.** Ordinary varied everyday clothing, honest lived-in clutter,
  natural true-to-life colour. Not candy-bright. Not sad-beige.
- **Five fingers per hand. Visible pores. Distinct real-looking faces.**
- **NO readable product labels and NO label-reading poses.** These sit next to a price
  comparison that names Tide, Cascade and Windex in type. A recognisable competitor bottle in
  the photo would be a trademark problem on a customer-facing document. Keep bottles generic,
  turned, or out of focus.
- **No text, no logos, no graphic overlays.** Type goes on in the PDF.
- **Leave the right third quieter.** A dark navy price panel sits over that side of the banner,
  so keep the busy detail and the faces left of centre.

## Where they go when they land

`photos-completed/`, named `price-sheet-laundry.jpg`, `price-sheet-grocery.jpg`,
`price-sheet-spray.jpg`. The PDF generator at `sta-tools/build-price-page.py` picks them up by
those filenames and drops them into the three bundle cards. Nothing else needs changing.
