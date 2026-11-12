# Run 60 report: balances shown before an import, Undo when a budget is cleared (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commit only. Nothing pushed, no APK built.
Both items were open in the data-integrity plan (NEXT_WORK_PLAN, "TOP PRIORITY DATA-INTEGRITY JOB", items 3 and 6), and neither needs a decision from you.

## What changed
1. **The import sheet now shows account balances before anything is added.** For each account the import would change, it shows the balance now and after. Examples:
   - "ABB Card: 70.00 ₼ now, 161.00 ₼ after"
   - "Savings (new account): 510.00 ₼"

   A note says: "If a balance looks doubled, cancel and check before adding." This is the double counting you ran into on 10 Nov, made visible before it is saved. The preview runs the same steps as the Add button, which I moved into one shared function, so the two cannot disagree.
2. **Clearing a budget can be undone.** Saving a budget empty now shows "Food & Dining budget removed" with Undo. Undo puts the old limit back, unless you set a new one in the meantime.

## Tests actually run
- Logic: 104 files, 2,129 passed, 0 failed. The new `run60balance.test.mjs` has 6 checks, worked out by hand:
  - a statement on Card: 70 now, 107.50 after;
  - an entry already here is not counted again: 57.50 now, 107.50 after;
  - a backup file whose "Card" is the Card here: 70 now, 65 after, and its 999 opening is not added;
  - a new Savings account: 510;
  - nothing shown without accounts;
  - the preview changes nothing.
- Browser, on the final code:
  - new `e2e_run60_balances`: 8/8. On screen: no lines until an account is chosen, then "ABB Card: 70.00 ₼ now, 161.00 ₼ after", with nothing added by looking; clearing the Food budget, then Undo brings 400 back.
  - Also: e2e_import 53, e2e_run52_statement 37, e2e_run51_integrity 30, e2e_run24_accounts 13.
- Full browser suite on Run 59 (commit da49d74): 129 files, 2,233 passed, 0 failed, 0 missing, and the computer did not sleep.

## Status
| Item | Status |
|---|---|
| Balances before adding an import | VERIFIED in tests |
| Undo when clearing a budget | VERIFIED in tests |
| On your phone | NOT ASSESSED |
| az / ru wording | IMPLEMENTED BUT UNVERIFIED |

## Still open in the integrity plan
- "Newer edit wins" when the same entry was changed on two devices. This needs change stamps on every entry, which is a data-format change. I am leaving it for when sync is built, rather than changing the saved data shape overnight.
