# Run 53 report: quick fixes from your video and phone (12 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commits 73e2245 and 53a57cb. Nothing pushed, no APK built.

## What changed

| Your point | What the app does now | Status |
|---|---|---|
| "Spreading the cost is fixed. What if the user wants 4 months?" | An "Other" choice opens a box for any whole number from 2 to 24. 1, 25 and letters are refused with a plain message. | VERIFIED |
| Quick-Add Templates: Cancel scrolls out of sight | Cancel sits inside the edit form, next to Save, at the template being edited. | VERIFIED at 360 x 640 with 14 templates |
| Long press offers copy / select all everywhere | Text can be selected only in boxes a person types in. Labels, cards, buttons and numbers cannot. | VERIFIED in the test browser; NOT checked on the Poco F6 |
| "The app should get the latest rates every day by itself" | When the app opens or comes back to the front, it fetches today's official rates for the dollar, euro, pound and every currency you have used. One request per currency per day. | VERIFIED with a pretend rate service |
| "Currency converting doesn't work in other currencies; it must work both ways" | A ledger in dollars, euro, pounds, roubles, lira or lari can record a payment in another currency, including the manat. The rate is worked out through the Central Bank's manat rates. | VERIFIED with a pretend rate service |
| No internet | The newest rate the phone already holds is offered with its date. It is used only if you tap it. Typing your own rate still works. | VERIFIED |
| Version shows "SNjTvbhv" | Settings shows "Version 53 (12.11.2026)", with the build code small beside it. | VERIFIED |

## Things you should know
- The app now contacts the rate service once a day on opening, not only when you choose a currency. Only currency codes and the date are sent. The Privacy text in the app says this in all three languages.
- A cross rate (for example euro in a dollar ledger) is the Central Bank's euro rate divided by its dollar rate. It is not a market rate; your bank's real charge can differ. "Use my bank's rate" is still there.
- A ledger whose currency sign is not a known currency (a made-up sign) still has no conversion, because no rate exists for it.
- I found and fixed a weakness while testing: a currency was marked "asked today" before the answer arrived, so a request cut off by closing the app was not retried that day. It is now marked only after the request ends.

## Not done from this group
- Black flash and icon jump at launch: this happens before the web part is on screen, so it must be fixed in the Android shell (launch window colour and splash). BLOCKED until an APK run.
- White line at the screen edge: cannot be shown to come from the app. No code changed.
- Category filter menu closing instantly: NOT STARTED. I could not locate the exact menu from the code alone and did not want to guess; I need to look at it together with your recording.
- Notification icon and sound: APK only.

## Tests actually run
- Logic: `node tests\run-logic.mjs` -> 100 files, 2,040 checks passed, 0 failed. New `run53currency.test.mjs` (28 checks). Two lines in the older `run39fx.test.mjs` were changed because the rule itself changed (conversion is no longer manat-only).
- Browser, alone on the final code: `e2e_run53_quick` 32/32 (new), `e2e_run39_fx` 15/15 (one check updated for the new rule, one made stricter, storage cleaned for the offline case), `e2e_run40` 42/42, `e2e_run41` 21/21, `e2e_run25_layers` 26/26, `e2e_run52_statement` 35/35.
- Full browser suite: see the last lines of this report.

## Status of the wording
Azerbaijani and Russian for every new line are my drafts: IMPLEMENTED BUT UNVERIFIED until a native reader checks them.

## Next action
The plain-language pass (Home, Add, Settings wording and a first-run explainer), which you called the main direction. Before that: one full browser run on the final code.

## Full browser suite result (added 12 Nov, after the report above)
Run on commit 6ebc2a5: 122 files, 2,051 checks passed, 3 failed, 51 not run. The computer slept during the run (6 standby events).
- `e2e_ux` and `e2e_ux_keyboard` timed out because of the sleep. Rerun alone: 30/30 and 21/21.
- `e2e_run9` failed 3 checks, and that was a real fault of mine: the new version label "53 (12.11.2026)" looked like an amount to the privacy-mode check. The label now uses a year-first date, "53 (2026-11-12)" (commit 4a81dc3). Rerun alone: 55/55; `e2e_run53_quick` 32/32; logic 100 files 2,040/0.
- So every one of the 122 files has passed on the final code, but not in one uninterrupted run. One clean full run with the computer kept awake is still owed before any push.
