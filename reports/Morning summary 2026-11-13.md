# Morning summary, 13 Nov 2026 (overnight work, Runs 58 to 64)

Everything is on this computer only, in the working copy `Expense-ledger2-fixes`. **Nothing is pushed to the live app and no APK is built.** The live app is unchanged.

## What was built, in order
| Run | What you will see | Commit |
|---|---|---|
| 58 | **Categories reorganised.** New Personal Care. "Gifts & Personal" is now Gifts & Donations. "Bills & Subscriptions" is now Phone & Subscriptions (az: Rabitə və abunəliklər, ru: Связь и подписки). Duplicates are no longer offered, and about 27 new subcategories were added (Heating, Mortgage, TV, State fees…). A "Tidy up categories" card moves older entries only if you tick them, with Undo. **Two faults fixed:** the Gifts page counted haircuts, and imported cash withdrawals counted the same money twice. | 1d37bce |
| 59 | **Month-end leftover, as you approved.** Analytics shows "Not spent since you started", with each month's working. Each budget has an optional "Carry what's left into next month", off by default and capped, with overspending never carried. The monthly "add leftover to a goal" question is now an opt-in setting. A one-time hint appears for people without accounts. | da49d74 |
| 60 | **Before an import is added, the sheet shows each account's balance now and after,** so double counting is visible. Clearing a budget now has Undo. | 0a50e2a |
| 61 | **Goals: "Add money" with a note.** Every addition is kept in a history, corrections are recorded, and the goal shows the day it was reached. Your stored totals are unchanged, and the old version 9 app still opens the data. | 022bf66 |
| 62-63 | **Debts and loans** show what was left after each payment, and there is a full-history spreadsheet. **Repeating bills** list their payments. **Budgets** show their last months. | 538ce4e |
| 64 | **"Download for Excel (.xlsx)":** one file with nine sheets and a Read me sheet, checked in real Excel. The Gifts and Debts spreadsheets now save inside the Android app too. | 8dbfcca |
| — | **Review sheet** for a native speaker: 321 Azerbaijani/Russian texts added or changed since 8 Nov (`handoff/az-ru-review-runs51-60.csv`). | 0242184 |

Each run has a report in `reports/` (Run 58 … Run 64), and each was also filed in Notion.

## Tests
- Logic tests: 107 files, 2,169 checks passed, 0 failed.
- Full browser suite:
  - Run 59: 129 files, 2,233 passed / 0 failed.
  - Run 61: 132 files, 2,256 passed / 0 failed.
  - Run 64: 134 files, 2,268 passed / 0 failed. It ran in three parts: a session restart cut the full run off at 90 files, all passing; 43 more ran afterwards; and e2e_run40 ran alone, because it needs a folder that an earlier test normally creates.
- Every new feature has its own hand-worked logic test and its own on-screen test.
- **Mistakes I made and caught:**
  - Twice, a `//` note of mine disabled code on the same line. The first time it was the "Not now" button; the second time it was the test build script.
  - A date passed in the wrong form crashed the goal card when a goal was reached.
  - New buttons were too small for the 34 px rule.

  Tests caught all four, and all were fixed before the work was committed, except the build-script one, which was fixed straight after.

## Needs your answer
1. **"Left over" vs "Not spent" in Analytics.** For the same month they can differ: the old figure counts money taken from savings as money in. Should "Left over" use the new approved rule, so there is one number?
2. **Two subcategories I did not add without you:** "Lottery & betting" and "Alcohol & tobacco". Add them or not?
3. **Push to the live app?** Runs 58-64 are ready locally, and the whole browser suite is green on Run 64 (134 files, 2,268 / 0). Say "publish" and I will run the standing gate and push, then send you the link.
4. **Native-speaker check:** please pass `handoff/az-ru-review-runs51-60.csv` to someone who writes Azerbaijani and Russian well.

## Not done, and why
- **"Newer edit wins" between two phones (sync foundation):** this changes how every saved entry is stored. It is the riskiest change in the plan, so I want to do it with you awake.
- **Excel workbook in the Android app:** needs an Android-shell change and an APK build (BLOCKED).
- **Theme colours:** waiting for your palettes.
- **Widgets, notification reading, receipt photos:** these need the APK and your phone.
- **Polish passes and the stress test:** you asked for them last, after everything else.

## Nothing tested on your phone
No APK was built, so none of this has been seen on the Poco F6 yet (NOT ASSESSED).
