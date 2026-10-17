---
type: re-render
slug: how-to-read-an-income-disclosure
image: howtoreadan-belonging-v1
raised: 2026-08-31
status: done
closed: 2026-10-17
---

# Re-render needed: howtoreadan-belonging-v1

**Not a content problem. The picture is right.** It is the garden centre glasshouse, two
women walking an aisle with a trolley of ferns, exactly as briefed, and the alt text
matches it.

**It will not meet gate C3.** C3 asks for WebP, 1600px wide, 150 KB or under. This frame
is banks of real foliage at every depth, which is the worst case there is for WebP, so the
detail it has to encode is genuine rather than noise. Measured at 1600px:

    q60  199,644     q52  182,826     q44  168,008     q36  154,260
    q56  189,428     q48  174,676     q40  161,036

It never reaches 150 KB, and by q36 it looks it. Shipped today at **q56, 189 KB**, which is 35 KB over, because the alternative was either a visibly mushy photo or dropping to
1400px and breaking the width half of the same gate. Every other image in both of today's
posts is inside the cap.

**What would fix it:** the same scene rendered with less foliage depth behind the two
women. A shallower background, or the trolley against a plainer bank rather than aisles
receding, would cut the encoded detail without changing what the frame says. The point of
the shot is the two women mid-conversation with nothing being sold, and that survives a
simpler background.

## Closed 2026-10-17 (Photo Claude)
Closed without a re-render: the 2026-10-15 re-encode pass brought howtoreadan-belonging-v1.webp to 145,688 bytes at 1600px (quality 48 after a 0.5 px softening), inside gate C3, and the picture reads the same.
