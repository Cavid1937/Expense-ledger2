# Runs 62 and 63 report: histories for debts, loans, repeating bills and budgets (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commit only. Nothing pushed, no APK built.
From your 10 Nov list (NEXT_WORK_PLAN items D9 and D10). These are read-only views: no stored data changes.

## What changed
- **Debts:** every payment line now also says what was left after it ("400.00 ₼ left after this"). Debts got a "Payments" heading, like loans already had.
- **Loans:** every instalment says what was left after it ("800.00 ₼ left after this (estimate)"). It is the same balance the loan card shows, worked out from the terms you typed.
- **"Download the full history (spreadsheet)"** on the Debts & loans page. One file covers every debt and loan, with a start line and one line per payment: date, amount, left after, and whether it is also in your entries. Columns use the app's words. A name starting with "=" is written as text, so Excel never runs it as a formula.
- **Repeating bills:** "Payments (n)" under each bill lists every recorded payment, newest first. Tapping one opens it.
- **Budgets:** "Last months" under each budget shows up to six finished months, spent against today's limit. Over-limit months are in red. A note says earlier limits are not kept, because the app does not store a history of limits.
- **The "history everywhere" check (D10)** is written in NEXT_WORK_PLAN: goals, debts, loans, gifts and accounts already had a history; bills and budgets were the two gaps, now filled.

## Tests actually run
- Logic: 106 files, 2,153 passed, 0 failed. The new `run62debts.test.mjs` has 10 checks, worked out by hand:
  - left after: 400.00, then 249.50, then 0 for 100 + 150.50 + 249.50 = 500;
  - loan balances 800 and 400 match the loan card;
  - spreadsheet lines are exact, including the formula guard and the Excel text mark.
- Browser, on the final code:
  - new `e2e_run62_history`: 7/7. On screen: the left-after lines for the debt and the loan; the downloaded spreadsheet's lines; the bill's two payments; the budget's last two months (140 of 100, and 20 of 100).
  - Also passing: e2e_run17_debts 22, e2e_run18_debts 3, e2e_run17_loancash 9, e2e_run12 35, e2e_run13 24, e2e_run59_leftover 16.
- Full browser suite on Run 61 (commit 022bf66): 132 files, 2,256 passed, 0 failed, 0 missing, and the computer did not sleep.

## Status
| Item | Status |
|---|---|
| Left after each debt and loan payment | VERIFIED in tests |
| Debts and loans spreadsheet | VERIFIED in tests |
| Bill payments list; budget last months | VERIFIED in tests |
| az / ru wording | IMPLEMENTED BUT UNVERIFIED |
| On your phone | NOT ASSESSED |
