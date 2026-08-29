# Harvesting the Melaleuca catalogue (name, points, US price)

Worked out 2026-08-29 while building three 35 point packages for a customer. Takes about
two minutes end to end. Re-run it rather than trusting a saved snapshot, because prices and
point values change and a stale price in front of a customer is worse than no price.

## The two things that are easy to get wrong

**1. A category page only shows the first 39 or 40 products.** Supplements looked like 39
products and is actually 120. Scrolling does NOT load the rest, and there is no infinite
scroll. There is a **SHOW ALL** button, and clicking it puts `pageNumber=9999` in the URL.

So append `?pageNumber=9999` to every category URL and you get the whole thing in one load.
Without it the packages get built from a third of the catalogue and nobody notices.

**2. Chrome must be logged in, and the tab renders even when hidden.** Unlike the
GoHighLevel page builder, melaleuca.com draws fine in a background tab, so the harvest works
even when the browser pane is not on screen.

Confirm the currency before trusting anything: the page carries `"CurrencyCode":"USD"` and
`"Language":"en-US"` in its embedded config. The account being logged in decides this.

## The categories that cover the Switch Checklist

    /productstore/personal-care/hair-care        shampoo, conditioner, styling, dry shampoo
    /productstore/personal-care/bath-body        deodorant, body, hand wash
    /productstore/personal-care/dental           tooth polish
    /productstore/cleaning-and-laundry/cleaning  dish, all-purpose, tub & tile, glass, disinfectant
    /productstore/supplements                    every vitamin, collagen, magnesium
    /productstore/medicines-and-treatments       pain relief, first aid, anti-itch
    /productstore/beauty/color-cosmetics         foundation, blush, eyeshadow, lipstick, setting spray
    /productstore/healthy-foods-and-drinks       beef sticks, jerky, snacks

Eight pages, 548 products on 2026-08-29.

## The extractor

Every product is one `li.p-catListing__col`. Its text reads like:

    Sei Bella Hair Oil $24.00Member $40.00Non-Member 11 Points SELECT

So: name is everything before the first price, Member price is the first `$n.nn` before the
word Member, and points is the number before `Points`. Run this in the page console per
category:

```js
(function(cat){
  const seen=new Set(), out=[];
  document.querySelectorAll('li.p-catListing__col').forEach(li=>{
    const t=(li.innerText||'').replace(/\s+/g,' ').trim();
    const pts=t.match(/(\d+(?:\.\d+)?)\s*Points?/i);
    const mem=t.match(/\$([\d,]+\.\d\d)\s*Member/i);
    if(!pts||!mem) return;
    let name=t.split(/\$[\d,]+\.\d\d/)[0]
      .replace(/^(LIMITED TIME|NEW|Monthly Feature Special:)\s*/gi,'')
      .replace(/Save \$[\d.]+ vs buying individual products/gi,'')
      .replace(/Shop \d+ Options?|Shop More Options?|SAVINGS PACK/gi,'').trim();
    const key=name+'|'+pts[1];
    if(seen.has(key)||!name) return;
    seen.add(key);
    out.push([name.slice(0,58), parseFloat(pts[1]), parseFloat(mem[1].replace(',',''))]);
  });
  const store=JSON.parse(localStorage.getItem('__mel_data')||'{}');
  store[cat]=out;
  localStorage.setItem('__mel_data', JSON.stringify(store));
  return out.length;
})('supplements')
```

localStorage survives navigation on the same domain, so it accumulates across all eight
category pages and can be read out at the end.

## Filtering, and why it matters

Drop anything matching `bundle|savings pack|value pack|collection|2.?pack|pump|refill` and
anything with **0 points**. Pumps and refills are 0 points and would silently add cost to a
package without moving it toward 35. Bundles are real products but they make a package look
like one line item instead of a shopping list.

## Building the packages

Points are small integers, mostly 2 to 4 for household items and 7 to 16 for supplements and
beauty. Hitting exactly 35 is a small knapsack problem, and it is easy to be one or two out.

**Total it in code, never in your head.** On 2026-08-29 I got Package 2 wrong at 36 and only
caught it because a script added it up. That was going in front of a customer.

Rough shapes that land on 35 cleanly:
- household heavy: ten items of 2 to 3 points plus one supplement
- hair and kitchen: a 10 point dry shampoo plus 4 point items
- beauty: four items only, 7 to 11 points each

## The last mile, if this is ever automated

The Switch Checklist worker ALREADY stores what each person ticked:

    "items":[{"group":"Bathroom & Personal Care","label":"Shampoo"}, ...]

So a submission carries everything needed to pick products automatically. The only piece
that does not exist yet is a mapping from checklist label to two or three candidate
products, which is about 31 labels.
