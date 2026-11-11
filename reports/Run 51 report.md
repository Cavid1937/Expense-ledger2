# Run 51 report: merge double counting, account removal, Undo (11 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local only. Nothing pushed, no APK built.
Model: Fable 5.2. First session of the planned job (data integrity).

## What you reported
1. Importing the phone's export into the browser copy with Merge counted most things twice.
2. An account was removed without any question, and there was no Undo.

## What I found (reproduced with made-up data on the old code)
1. Double counting: CONFIRMED. Four payments that exist on both devices under different internal ids, three of them with different words: after a merge the old code showed 7 entries and 94.20 spent instead of 4 entries and 51.10. The old rule skipped an entry only when every word matched.
2. Same-named accounts: CONFIRMED. Both devices have "ABB Card", created separately. After a merge the old code dropped the file's card, left its entries pointing at an account that did not exist, and the card here looked unused, so it could be removed without a warning.
3. Why your account was removable BEFORE the import: NOT PROVEN. The old guard only looked at entries linked to that exact account. Entries recorded the older way ("Bank card" without an account) never counted. That fits what you saw, but I could not confirm it on your data.

## What changed
- Merge now sorts the file's entries into four groups before adding anything: already here (same record), exactly the same, look the same (same day, kind and amount, different words), and new. The sheet shows the four numbers and up to three examples. Both "skip" boxes are ticked to begin with; you can untick either.
- Matching is one to one. Two real coffees at the same price on one day in the file, against one here, give one match and one new entry. Nothing real is dropped.
- An account in the file with the same name as one here is treated as that account. Its entries and transfers go to your account. Opening balances are never added together. A transfer that is already here is not added again.
- Removing an account always asks first. It shows the balance, how many entries and transfers use it, and lets you move the entries to another account or to "No account". Entries are never deleted. Its transfers are deleted, and the sheet says so.
- Undo after removing an account, and after removing a transfer. Undo puts back the account, its transfers and the entries' links, and keeps anything you did in between.
- Test launcher: each test now deletes its temporary Chrome profile (the cause of the 83 GB).

Files: `App.jsx`, `screens/settings.jsx`, `i18n.js` (18 new or changed lines of wording in en/az/ru), `tests/harness.mjs`, `tests/browser/lib.mjs`, `tests/run-browser.mjs`, new tests below. Storage key `expense_ledger_v5` untouched; no stored data format changed.

Screenshots (made-up data): `reports/run51/merge-sheet-en.png`, `merge-sheet-az.png`, `remove-account-en.png`, `remove-account-az.png`.

## Tests actually run
- `node tests\run-logic.mjs`: 98 files, 1,951 checks passed, 0 failed (was 97 files, 1,910). New: `run51integrity.test.mjs`, 41 checks, expected values worked out by hand.
- Browser, run alone on the final code: `e2e_run51_integrity.mjs` 30/30 (new), `e2e_import.mjs` 53/53 (two checks reworded, one made stricter), `e2e_run24_accounts.mjs` 13/13.
- Full browser suite (118 files): see the line added at the end of this report.
- Before/after reproduction script on the last commit and on this change: 7 entries / 94.20 before, 4 entries / 51.10 after.

## Status
| Item | Status |
|---|---|
| Merge no longer double counts look-alikes | VERIFIED (logic + browser, synthetic data) |
| Same-named accounts merge into one | VERIFIED |
| Account removal asks, moves entries, Undo | VERIFIED |
| Transfer removal Undo | VERIFIED |
| Cause of the removal you saw before the import | NOT PROVEN (likely: old-style entries without an account link) |
| Same checks on the APK and on your real data | NOT ASSESSED (needs a build and you) |
| Undo for every other delete (templates, categories, goals, budgets, bills, debts, loans, gifts, trips) | NEEDS WORK (audit not done yet) |
| Same record edited on both devices: newer edit should win | NEEDS WORK (today the copy already here wins; needs change stamps) |
| Balance check after a merge ("this account changed by more than the file explains") | NEEDS WORK |
| az / ru wording of the new lines | IMPLEMENTED BUT UNVERIFIED (my drafts; needs a native reader) |

## Weak points you should know
- "Look the same" is a judgement. Two different 0.60 metro rides on one day, one recorded on each device, will be offered as look-alikes and skipped unless you untick the box. The sheet shows the count and examples, and Merge has Undo. I chose this default because double counting was the real damage; say so if you want the box unticked by default.
- Removing an account deletes its transfers, which changes the other account's balance. The sheet warns about it. Turning such a transfer into a plain income or expense is not offered yet.
- Entries already doubled in your browser copy are not cleaned by this change. A "find duplicates" tool for existing data is not built.
- The live preview could not start in this copy (the dev tool is not installed here); the screens were checked through the test browser and screenshots instead.

## Next action
Audit every delete button in the app and give each the same Undo, then the "find duplicates in what I already have" tool. After that: session 2 (quick fixes from your video and phone).
