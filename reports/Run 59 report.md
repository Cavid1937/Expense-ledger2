# Run 59 report: money left at the end of a month (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commit only. Nothing pushed, no APK built.
Built exactly as approved on 12 Nov: `handoff/NEXT_WORK_PLAN.md`, sections "DECIDED 12 Nov: month-end leftover" and "APPROVED 12 Nov ... exact definitions".

## What changed
1. **"Not spent since you started"** is a new card in Analytics > Overview.
   - It shows one quiet line for the month you are looking at: "October 2026: 230.00 ₼ not spent", "… overspent", or "This month so far: …".
   - Below it is a running total over finished months, with a note saying how it is worked out.
   - "Show each month" lists every finished month with money in, money out and the result, then the total.
   - It appears once there is at least one finished month.
   - It is never called savings.
2. **How "not spent" is worked out.** The month line and the running total use one function, so they always agree.
   - Money in: earned income only. Money taken from savings is not counted, and neither are refunds, loan money or debt repayments.
   - Money out:
     - counted on the day it was paid, so a cost spread over months counts once;
     - only your own share of a cost someone will pay back;
     - for a loan instalment, only the interest;
     - refunds lower it.
   - Budgets play no part at all.
3. **Per-budget carry-over.** When you edit a budget, a new tick box "Carry what's left into next month" appears. It is off by default.
   - Only the unused part is carried, at most one month's limit.
   - Overspending is never carried; an overspent month starts the next one at the plain limit.
   - The budget shows "300.00 ₼ + 50.00 ₼ left from last month", and its limit reads 350.00.
   - The budget amount you typed never changes.
   - Analytics and the Home tips use the same limits.
4. **The month-start question "add last month's leftover to a goal" is now off.**
   - It can be turned on in Budgets & Goals > Goals.
   - People who saw it before get one sentence there saying it used to be asked every month.
5. **One-time hint for people without accounts.** If you have entries but no account, Accounts shows: "Add your cash or card as an account to see where unused money stays." "Got it" removes it for good.
6. **Backups.** The carry-over choices and the goal-offer setting travel in the backup's preferences, the same way as the theme. On import they apply only where this phone has none. Older backups import with both off.

## Tests actually run
- Logic: 103 files, 2,123 passed, 0 failed. The new `run59leftover.test.mjs` has 20 checks, worked out by hand:
  - October: in 1,000 (the 200 taken from savings left out); out 350 + 600 + 60 + 20 − 30 = 1,000; not spent 0. The debt repayment is left out.
  - The running total is July −10, August 0, September 700 and October 0, giving 690. This month so far is 400, shown apart.
  - Every row equals the month line, and December to January works.
  - Carry-over: food 50 carried into October, then 0 after an overspent October; transport capped at 100 (not 200); December to January 30; nothing when off; nothing in the month it is turned on.
  - Older backups import with both settings off.
- Browser, on the final code:
  - new `e2e_run59_leftover`: 16/16. On screen: 700 − 100 = 600.00 with the savings withdrawal left out; the month list; last month overspent by 100.00; the carry tick box off by default; 300 + 50 = 350 when it was turned on last month; the goal setting off by default; the accounts hint shown once.
  - `e2e_run50`: 12/12. It gained a check that the month-start question is off by default; its other sections turn the setting on first.
  - `e2e_run58_cats`: 25/25.
- Screenshots at 320 px in az and ru: nothing wider than the screen, and no errors.
- **A mistake of mine, caught by e2e_run50:** a note I added in App.jsx with `//` commented out the "Not now" action on the same line, so "Not now" stopped working. I fixed it before committing, and re-checked my other notes.
- Full browser suite: see PHASE_CHECKPOINT.md (it runs after this commit).

## Status
| Item | Status |
|---|---|
| "Not spent" month line and running total | VERIFIED in tests |
| Per-budget carry-over (off by default, capped, no overspend carried) | VERIFIED in tests |
| Goal question off by default, available as a setting | VERIFIED in tests |
| Accounts hint once | VERIFIED in tests |
| Backup carries the choices; old backups import with them off | VERIFIED in logic tests (not yet as a browser round trip) |
| An older app version opening newer data | NOT ASSESSED for these two new preferences (older versions ignore unknown preference fields by their own cleaning rule; not run) |
| az / ru wording | IMPLEMENTED BUT UNVERIFIED |
| On your phone | NOT ASSESSED |

## Worth knowing
- Analytics now shows two figures for the same month that can differ: the existing "Left over" and the new "not spent". "Left over" counts money taken from savings as money in, and counts spread costs month by month. "Not spent" follows the approved definition. I kept "Left over" as it was, because the approval did not ask to change it. If you want one number, the simplest fix is to make "Left over" use the same rule. That changes an existing figure, so it is your call.
