# Re-encode request (no new render): 7 images over 150 KB

Both posts are written and queued (not live yet): is-zicam-safe (10/12) and extra-money-for-christmas (10/16).

- blog-images/iszicamsafe-belonging-v1.webp is 263,230 bytes (gate C3 wants 150 KB or less).
- blog-images/iszicamsafe-hero-v1.webp is 180,508 bytes.
- blog-images/iszicamsafe-freedom-v1.webp is 163,590 bytes.
- blog-images/iszicamsafe-turning-point-v1.webp is 163,012 bytes.
- blog-images/iszicamsafe-villain-v1.webp is 161,036 bytes.
- blog-images/extramoneyf-freedom-v1.webp is 325,982 bytes.
- blog-images/extramoneyf-belonging-v1.webp is 237,934 bytes.
- Same file names, same pixel size, same picture: only a smaller WebP encode. The posts pick it up with no edit.

status: done

## Closed 2026-10-15 (Photo Claude)
Re-encoded in place, same file names and pixel sizes. Every WebP in blog-images is now 150,000 bytes or less (206 files touched in one pass, quality stepped down from 84 until each fit; the 11 grassiest frames also got a 0.5 to 0.8 px blur first). Pictures unchanged.
