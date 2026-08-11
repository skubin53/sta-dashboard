# Shannon's Advice, the final spec

**This is the one source of truth for the Advice box. Written 2026-08-10. Approved by Shannon: pending.**

Every post gets exactly one. It sits near the end, right before the closing scan CTA.

---

## What it is for

The whole article above it is careful, sourced and calm. The Advice box is Shannon breaking
in. It is the tonal shift that makes a stranger trust her, because it is the only place on
the page where a person is talking instead of an article.

If it reads like the rest of the post, it has failed.

---

## The four rules that get broken most

**1. She never bought this stuff. Ever.**

No conversion story. Not "I used to buy it and then I read something." Not "I put the jar
down." Not "years ago, before I knew better."

Shannon has kept a whole-food, non-toxic home for 34+ years. Her food comes from local farms
and her own garden, not store shelves. A conversion arc is factually false about her life,
and every reader who has followed her for a month can feel it.

**Her empathy is not "I did it too." It is "I worked it out alone, young, with nobody to
tell me."** That is the emotional bridge. Use that one.

**2. She does not cite studies as things she reads.**

She is not a researcher and she does not pretend to be. She does not say "a 2024 paper
found" or "the subcommittee reported." That is what the article body is for.

She trusts her gut and 34 years of watching, and she is openly skeptical of institutions:

> "The FDA can allow it all it wants. I still would not touch it."

That distrust IS the voice. Lead with it.

**3. The facts live upstairs, not in her mouth.**

Every number, agency and hyperlink belongs in the article body above. The box can be
completely link-free and often should be. If a link earns its place, one is plenty.

**4. It always ends on something to do tonight.**

Never end on fear. Never end on the problem. The last paragraph is one concrete, real-food
action she would actually take, and it is almost always the same shape:

- **Find a local farm and get to know the farmer.** Talk to them. Ask how they grow it.
  That relationship is how she knows her food is safe.
- Or: **make it yourself.**

Never send a reader to a mill, a bakery, a co-op or a store.

---

## The legal line, which is not optional

This is the difference between a blog that survives and one that gets a letter.

**Stated as fact, and hyperlinked:**
- An agency finding
- A recall, with its number and date
- A fine, a guilty plea, a settlement that actually happened
- A classification ("the WHO classes it as probably causing cancer in people")
- "No safe level of lead," per AAP or CDC

**Stated as Shannon's own first-person opinion, never as fact:**
- That a product *causes* harm
- That a named brand is *poisoning* people
- That something is *not fit for human consumption*
- Anything where the causation is disputed, unproven, or still an allegation

The tell is the sentence stem. **"I believe," "in my opinion," "I would not," "that is my
opinion and I will put my name on it."** She can be as blunt as she likes inside that frame,
and she should be. The frame is what makes the bluntness safe.

Lawsuits are **allegations** until a court says otherwise, every single time.

---

## Voice

- Direct. No hype words. No sugar-coating. No exclamation marks.
- **No em dashes or en dashes, anywhere.** Commas, periods, or "to".
- Short sentences. She talks the way she texts.
- Never "delve," "unpack," "landscape," "arsenal," "game-changer," "in today's world."
- No tricolons. No "It's not just X, it's Y."
- She raised **one daughter**. Never "my kids."
- Never name a competitor brand as the swap. Naming the villain brand is required.
- Never write "Melaleuca." It is the private membership store, or Switch to America.
- No medical claims. She is a coach, not a doctor.
- Never invent a testimonial, a number, a customer, or scarcity.
- **Never talk about government officials.** No legislators, no politicians, no named
  officials, and never a line like "lawmakers looked at this and said not in our state".
  Shannon, 2026-08-11: *"I would never ever talk about Government Officials. That's an evil
  world and if you don't talk about it then it doesn't exist and we never talk about it."*
  The DISTINCTION that keeps the proof section alive: citing a **law, a court case, a recall
  or a regulator's action** as a receipt is fine and is required, because that is a document
  a reader can open. Casting **people in government as characters with motives** is not.
  Write "seven states have banned it" with a link. Never write "legislators in Texas decided".

---

## Structure

Three paragraphs. Rarely four. Never two.

1. **The blunt take**, opinion-framed. What she actually thinks, said plainly.
2. **The turn.** The thing that should make a reader angry, or the part nobody mentions.
3. **What to do tonight.** Concrete, small, real food, farm-first.

---

## The HTML

```html
<div class="shannons-advice">
<h3>Shannon's Advice</h3>
<p class="advice-tag">Straight talk from a nutrition coach</p>
<p>[the blunt take, opinion-framed]</p>
<p>[the turn]</p>
<p>[what to do tonight]</p>
</div>
```

```css
.shannons-advice{background:#1b2733;border-left:6px solid #b22234;border-radius:0;padding:20px 26px;margin:26px 0;}
.shannons-advice h3{color:#f5d888;font-size:1.25em;margin:0 0 3px;}
.shannons-advice .advice-tag{font-size:0.72em;font-weight:bold;color:#8fa3b8;text-transform:uppercase;letter-spacing:1.4px;margin:0 0 12px;}
.shannons-advice p{color:#e9eef4;line-height:1.7;margin:0 0 11px;}
.shannons-advice p:last-child{margin:0;}
.shannons-advice a{color:#f5d888;}
```

---

## A worked example that follows every rule

From the lab-grown beef post, 2026-08-09:

> I am not going to soften this. Growing meat in a steel tank and selling it to families is
> one of the grossest things I have watched happen in thirty-four years of paying attention
> to food, **and I believe it is going to harm people. That is my opinion and I will put my
> name on it.**
>
> [Seven states have banned it](url). It went on a shelf in California on August 1 anyway
> and barely made the news. They are not hiding it exactly. They are counting on you being
> too busy to look.
>
> Here is what to do, and it is not complicated. Find a rancher within driving distance of
> your house and go meet him. Ask what he feeds, when he processes, and whether you can buy
> a quarter. He will talk your ear off, because he is proud of it. Once your freezer is full
> of beef from a person whose name you know, none of this can touch you.

**Why it works:** no conversion story. The harm claim is explicitly opinion and signed. The
seven-state fact is stated flat and hyperlinked. It ends on a farmer and a full freezer, not
on fear. And the last line is what she is actually selling, which is not being afraid in
your own kitchen.

---

## The test, before any post ships

1. Is there a conversion story anywhere in it? → cut it
2. Does she cite a study as something she read? → move it upstairs
3. Is any causation claim stated as fact? → put it in an "I believe" frame
4. Does it end on fear, or on an action? → must be an action
5. Is the action a farm or making it herself? → not a store, not a co-op
6. Any em dashes? → replace
7. Does it sound like the article, or like a person? → if the article, rewrite it
8. Does it mention a legislator, a politician, or any government official? → cut it. A law
   or a recall as a LINK is fine. A person in government as a character is not.
