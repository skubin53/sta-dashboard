# Google indexing requests log

Daily task: sta-tools/workflows/cron-gsc-indexing.txt (8:47 AM). Queue: sta-tools/gsc-index-queue.json. Quota is about 10 Request-indexing a day for the whole Google account.

- 2026-10-19 (set up, done by hand): blog-sitemap.xml resubmitted in the scan property (last read was Sep 25 at 57 pages; read again today: 86). Shopper requested 10 (Halloween candy, electric blankets, antibacterial hand soap, Angry Orange, Zicam, protein after 50, cinnamon lead, frozen blueberries, Woolite, Prevagen). Builder: Christmas money + Social Security raise already on Google; work-from-home hit Quota Exceeded. Queue left: shopper 31, builder 26.
- 2026-10-20 8:47 run (ran 9:20 AM): Quota Exceeded on the FIRST request (the Dawn recrawl), so nothing was requested. The quota looks like a ROLLING 24 hours: yesterday's 10 manual requests were made about 3:45 to 4:00 PM. A one-shot retry is set for 4:33 PM today. Shopper requested 0, builder requested 0, already indexed 0, quota hit yes. Queue left: shopper 32, builder 27, recrawl 1.
