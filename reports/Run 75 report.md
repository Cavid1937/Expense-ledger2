# Run 75 report: every open item from the owner queue (13 Nov 2026)

Local commits b1096b7 … 8e27493 in the app and f4f863c in the Android shell. Nothing is pushed, and no APK has been sent; you said "Not yet".

## What changed, in plain words
1. **Small fixes.**
   - At 320px the amount "0.00" on Add was cut off; on narrow phones it is now drawn at most 38px tall.
   - The old offline test was brought up to date: cache v3, 3 icons, fonts, the version label. It passes 17/17.
   - The Analytics tab "Dinamika" was measured and fits, so nothing needed changing.
2. **The app's own pickers (your item 7).** Every date field (9) and option list (17) now opens the app's own bottom sheet, in the active theme and language, instead of Android's grey window.
   - The date sheet has Today / Yesterday / No date and a month calendar; days outside the allowed range can't be picked.
   - The real control stays hidden underneath, so saving and all earlier tests are unchanged.
   - Found and fixed on the way: a sheet drawn inside a folding section had zero height, and one opened behind the Add screen. Sheets are now drawn at the top of the page.
3. **Subscriptions separate from repeating payments (item 6).** It is the same Recurring page, in two groups.
   - "Subscriptions" shows its own monthly and yearly total.
   - What counts as a subscription: Phone & Subscriptions, or names like Netflix, Spotify, iCloud or "abunə" / "подписка". Each bill can be set to Subscription, Other, or Decide automatically.
   - The new field is optional, so older files stay valid.
4. **Report a problem / Write to us (item 4).** A new row in Settings opens a short form:
   - your message;
   - an optional contact, only if you want an answer;
   - optional technical details (version, screen size, last error; never entries).

   Long numbers such as card or phone numbers are hidden before sending, and one phone can send at most 3 a day. Reports go to a new add-only table in the free Supabase project: anyone can add, nobody can read through the app. I checked this from outside: add 201, read 401, junk 400.
5. **Screen-open counts (item 3).** These are inside "Help improve the app" (off unless chosen): names and counts only, cleared after each send. They are shown in "Show what would be shared".
6. **Monthly summary on the phone (item 5, your choice).**
   - In the first week of a month, Home offers "Your October summary is ready": earned, refunds, spent, surplus or deficit, change from the month before, where the money went, exceeded budgets and goals.
   - "Share or e-mail it to myself" uses the phone's own share menu or mail app; "Copy the text" is also there.
   - An optional reminder on the 1st ("…summary is ready", with no amounts on the lock screen).
   - Nothing is sent anywhere unless you share it.
7. **Payments from bank notifications (item 1, must-have).** This is in the Android app only.
   - **Off by default.** Turning it on opens Android's settings, where you allow notification access.
   - **What is kept:** the listener keeps only texts that look like a payment (an amount with ₼, AZN, USD, EUR or RUB), on the phone, at most 60, and drops everything else. Card numbers and balances are never kept, and nothing is sent.
   - **Review, never automatic:** when you open the app, the kept payments appear in the usual review (duplicates recognised). Nothing is added without your OK.
   - **Duplicates:** the bank's and the wallet's notice about one payment, arriving within 5 minutes, become one entry; two separate rides an hour apart stay two.
   - The in-app Privacy page now lists this permission honestly. It used to say the app asks for no permissions.
8. **Learning new notice formats (item 2).** This also needs "Help improve the app" on.
   - A notice the app could not read is reduced to its layout: every digit becomes #, and every word except common banking words becomes [W]. For example: "Hesabınıza ## AZN mədaxil [W]. Qalıq: ### AZN".
   - You see it in "Show what would be shared" before anything goes.
   - The server table itself refuses any text containing a digit.
   - Found and fixed: the same layout arriving twice in one batch was kept twice.

The public privacy page (/privacy.html) was updated for items 4, 5 and 8. It goes live with the next publish.

## Tests actually run
- **Logic:** `node tests\run-logic.mjs`: 121 files, 2,366 passed, 0 failed.
  - New: run75subs 9, run75feedback 10, run75screens 5, run75report 12, run75notices 5, run75layouts 6.
  - i18n went from 84 to 86.
- **Browser (new):**

  | Test | Result |
  |---|---|
  | e2e_run75_pickers | 9/9 |
  | e2e_run75_subs | 6/6 |
  | e2e_run75_feedback | 7/7 |
  | e2e_run75_report | 8/8 |
  | e2e_run75_notices | 10/10 |

- **Browser (touched):**
  - e2e_run16_info 15/15 (Settings now has 8 rows);
  - pwa offline-check 17/17;
  - 23 Recurring-related files all pass;
  - add, debts, import, mapping, accounts and bills tests all pass.
- **Full browser suite:** `node tests\run-browser.mjs` on 8e27493: **146 files, 2,399 passed, 0 failed, 0 missing**, 0 standby events. An earlier run after the pickers: 142 files, 2,368/0/0.
- **Android APK:** compiled (BUILD SUCCESSFUL). I opened it: it contains the notification listener, its permission and all the new screens. It has not been run on a phone.

## Not verified / limits
- **Notification reading on a real phone** is IMPLEMENTED BUT UNVERIFIED.
  - The listener can only be proven on your Poco F6.
  - Xiaomi may stop background services, so check that notification access stays on.
  - Only bank formats the reader knows become entries; others become masked layouts if you share.
- **Google Drive sign-in** is still unverified for real.
- **Subscriptions:** a "remind me to cancel" option was not built. Bill reminders already cover due dates.
- **Translations:** az/ru texts still need the native-speaker review.
