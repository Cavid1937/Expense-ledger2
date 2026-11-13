# Run 76 report: polish pass, publish, a 10-minute outage and its fix, APK (13 Nov 2026)

**Live now:** https://expense-ledger2.vercel.app, release 76 (main at 1761804; app code 377f67f). APK release 76 sent.
**Rollback point:** 249d208, release 69 plus the privacy page.

## Polish pass (before publishing)
- **What I checked:** the newest screens, in Graphite at 320px (az), Ivory at 320px (ru), Sea glass at 320px (az) and Ivory at 390px (en). Each was scanned for text contrast, sideways overflow and tap size.
  - Screens: the Home summary card, the summary sheet, Recurring with subscriptions, the bill editor, the kind picker, the Drive and notifications cards, and the Write-to-us form.
  - Result: no contrast problems anywhere.
- **Fixed:**
  - At 320px in az and ru, the bill editor's date ran off the screen. Columns can now shrink and a long date ends in "…".
  - The second line repeating the date under each date field was removed in both places. The picker button already shows it in the app's language, and the old Run 7 test now checks the button instead, with the same wording.
  - "Restore from Google Drive" and "Copy the text" were squashed 21px buttons; they now use the normal secondary style.
  - The backup banner's "I have the file" button (25px) and its × (12×19px) are now at least 36px.
- **Left as is:** the switches (50×30), which are the app's standard size everywhere.

## Publishing, and what went wrong
- **Before pushing:**
  - the full browser suite on 8e27493: 146 files, 2,399/0/0;
  - the files touched by the polish, run one by one: 20 files, all passing;
  - logic: 121 files, 2,366/0/0;
  - `vite build` OK.
- **Pushed d40ec8b.** My live check found the site **crashing on open**: "Cannot access 'Qe' before initialization".
  - **Cause:** the new monthly-summary file computed a value from `KEY` (from App.jsx) while loading. App.jsx and the screens import each other, and in the real website build App.jsx wasn't ready at that moment.
  - **Why the tests passed:** the browser tests bundle the app differently, so they never saw it.
- **Fixed and pushed 377f67f** about 10 minutes after the first push.
  - Proven by the offline test, which builds and opens the real website version: 17/17.
  - On the live site it opens, shows Version 76, has 3 theme cards and the Report-a-problem row, and Gifts is hidden.
- **Impact:** for about 10 minutes, anyone opening the site saw it fail to start. Data was not affected, because nothing had loaded. They get the fix the next time they open it online.
- **So it can't recur:**
  - A new test (run76loadorder) fails if any screen reads App.jsx values while loading. I confirmed it flags the old line.
  - From now on, the real-build offline test (`node tests\pwa\offline-check.mjs`) is part of every publish check, before pushing.

## APK
- **File:** Expense-Ledger-release-76.apk (8,450,904 bytes), built from 1761804, the same code as live.
- **Contents checked:** I opened it: release 76, the fixed summary key, the pickers, the notification reader and its permission are all inside.
- **Not run on a phone yet.** Please install it over the old one.

## Status
| Item | Status |
|---|---|
| Live site, release 76 | VERIFIED (live check after the hotfix) |
| Polish of the new screens | VERIFIED (scan + screenshots) |
| APK release 76 | IMPLEMENTED BUT UNVERIFIED (needs your phone) |
| Bank notifications, Drive sign-in, pickers on a real phone | NOT ASSESSED (needs your phone) |
