# Run 57 report: one "Paid from" filter, and linking older entries to an account (12 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commits 09a380d and the one after it. Nothing pushed, no APK built.

## The problem (your 10 Nov screenshots)
"Bank card" + "ABB Card" showed 0 of 257, and "Cash" + "Nağd" showed 0. Cause: entries say how they were paid in two separate ways. Older ones carry a "wallet" (Cash, Bank card), and newer ones carry an "account" (Nağd, ABB Card). The two filters were separate and both had to match, so an older Cash entry could never also be on Nağd.

## Part 1: one filter, and Analytics agrees (no stored data changed)
- One row under More filters, "Paid from", replaces the two rows. In your case it offers: Any way, All cash, Nağd, All cards, ABB Card, Not set.
- "All cash" = older entries marked Cash + entries on any cash account. "Nağd" = only entries linked to Nağd. The same holds for cards (a credit-card account counts as a card), mobile wallets and bank accounts.
- Every entry falls into exactly one of All cash / All cards / … / Not set, so the counts always add up to all entries. A test checks this. An entry whose account was deleted falls back to its old mark, or to Not set, and never disappears from every filter.
- An "All cash" chip is not shown when it would be the same as your only cash account (no two buttons doing the same thing).
- Analytics: "Spending by wallet" is now "Spending by how you paid" and uses the same rule, so the two screens can never disagree.

## Part 2: optional "link older entries to an account" (changes balances, so only on your yes)
On Accounts and balances, when you have exactly one cash account (or one card account), the app may offer this:
"2 older entries are marked 'Cash' but have no account. Link them to Nağd? Nağd's balance would change from 50.00 to 45.00."
- Entries dated before the account's starting date are never linked, because the balance you typed already includes them. The offer says so ("1 entry dated before you added Nağd stays as it is"). Without this rule, opening Nağd today with 50 and linking October's cash would have taken October's spending off a second time.
- If the account has no starting date, the offer warns that every entry would count and asks you to check the new balance.
- It never guesses: with two cash accounts nothing is offered.
- Nothing else changes: the old "Cash" mark, the ids and the amounts stay as they are; only the link is added.
- Undo right after. "Not now" hides the offer for that account for good.

## Tests actually run
- Logic: 101 files, 2,072 checks passed, 0 failed. New `run57paidfrom.test.mjs` (30 checks, hand-worked), including your exact case and the starting-date rule.
- Browser, alone on the final code: new `e2e_run57_paid` 26/26 (your case on screen, the counts adding up, Analytics figures, az/ru at 320 px, linking with balance 50.00 -> 45.00, Undo, Not now remembered). Rewritten for the single row, with the same strictness: `e2e_run16_wallet` 28, `e2e_run31_ledger` 15. Also passing: e2e_run22_trip 13, e2e_run24_accounts 13, e2e_run51_integrity 30, e2e_run9 55, e2e_lang 57, e2e_bigtext 25, e2e_run53_quick 32.
- The language test's expected count went from 75 to 77 because two new groups of wording were added to what it checks (more checks, none removed).
- Full browser suite on commit ebf88cd: 126 files, 2,180 checks passed, 0 failed, 0 missing; the computer did not sleep during the run.

## Part 3: the category menu now eases closed (your 10 Nov note)
- Picking a category, or tapping Close, slides the menu down like every other sheet instead of making it vanish in one frame. The import sheet's Cancel and OK buttons do the same. With "reduce motion" switched on in the phone settings, menus still close at once.
- Changed: `screens/ledger.jsx` (category menu rows and Close), `App.jsx` (import sheet buttons). 6 lines in total, no data touched.
- New test `e2e_run57_catsheet` (9 checks). Its first version had a timing mistake of its own: it sometimes looked before the tap had landed, so it failed about 1 run in 5 even though the app was right (the app marked the menu "leaving" within 1 ms). I fixed the test so the tap and the watching happen in one step. It then passed 15 runs out of 15.
- Also rerun on this code: e2e_import 53/53, e2e_run52_statement 35/35, e2e_run24_split 12/12; logic 2,072/0.

## Status
| Item | Status |
|---|---|
| One "Paid from" filter, Analytics with the same rule | VERIFIED in tests |
| Linking older entries (starting-date rule, Undo) | VERIFIED in tests |
| On your phone with your real data | NOT ASSESSED |
| az / ru wording of the new lines | IMPLEMENTED BUT UNVERIFIED |
| Category menu and import sheet ease closed | VERIFIED in tests (15/15 repeat runs) |
| Full browser suite (before the menu change) | VERIFIED: 2,180 / 0 |
| The add form still offers the old cash/card choice only for entries that already have one | unchanged on purpose |

## Next action
The category audit (handoff/CATEGORY_AUDIT_20261112.md) is written and waits for your go-ahead. When building starts, the two faults it found go first: the Gifts page counting personal care, and imported cash withdrawals being counted as spending.
