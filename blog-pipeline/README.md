# blog-pipeline, what each folder means

**Set straight 2026-08-11.** Before this, `queue/` held 20 files and 18 were already live, so
"how many posts are waiting" could not be answered by looking. It can now.

| Folder | Means |
|---|---|
| `queue/` | **Not live yet.** Nothing else lives here. `ls queue \| wc -l` is the answer to "how many are waiting". |
| `published/` | Live in GoHighLevel. The source file moves here the day it publishes. |
| `photo-requests/` | Posts that still need images. **This is Photo Claude's whole world.** |
| `photo-requests-done/` | Requests whose post is published. Photo Claude ignores this. |
| `photos-completed/` | Higgsfield image URLs, keyed by beat. |
| `hold/` | Written but deliberately blocked from publishing. Should normally be empty. |

## The rules that keep it true

1. **A post moves `queue/` to `published/` the moment it goes live.** Same session.
2. **A photo request moves to `photo-requests-done/` only when its post is PUBLISHED.**
   Shannon, 2026-08-11: *"Do not take them out of Photo Claude until you have published
   them."* Not when it is written, not when the images come back. Published.
3. **A replacement post stays in `queue/` even though its slug is already live.** It is not
   done, it is about to overwrite something. Two of these exist right now.

## Cadence

**2 posts a day, at noon.** Written and run against `CHECKLIST.md` the day before, run
against it AGAIN at noon, then published. Never more than 2.

**Nothing publishes itself.** Cameron (the Mac Mini) was retired 2026-07-26 and there is no
cron. The deploy runs only when Shannon opens a session. If nobody publishes in session,
nothing goes out, which is why zero posts published on 9, 10 and 11 August.
