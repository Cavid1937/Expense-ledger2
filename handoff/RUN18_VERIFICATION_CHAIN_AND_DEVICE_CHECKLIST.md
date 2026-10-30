# Run 18 — how the app is verified, and what only a real phone can confirm

## 1. Reproducible verification chain (what was actually run)
Source: worktree `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`, base = live commit 84c0771 (rollback target) plus the uncommitted Run 18 P1 changes.

| Step | Command (from the worktree folder) | What it proves | Last result (2026-10-31, working copy) |
|---|---|---|---|
| Logic tests | `node tests/run-logic.mjs` | calculations, storage rules, import/export rules, translations catalogue | 29 files, 908 checks passed, 0 failed, 0 missing |
| Browser tests | `node tests/run-browser.mjs` | the real bundled app in a real browser (screens, taps, storage failures) | NOT YET RE-RUN as a full set after Run 18 (single files passed: e2e_run18_debts 3/3, e2e_run18_import 6/6) |
| Expected counts | `tests/expected-counts.json` | a test file that silently runs fewer checks than expected is reported as a PROBLEM | updated for the 4 new Run 18 files |
| Clean-room gate | `scratchpad\cleanroom-run17.ps1` pattern: copy to a temp folder, `npm ci`, logic, build, az audit, full browser | nothing depends on files that only exist on this computer | run before any push |

Notes
- The `tests/` folder is intentionally NOT committed to git (it is local only). A fresh clone of the repository cannot re-run these tests. To make the chain reproducible by someone else, the tests folder must be committed or archived with the release — OWNER DECISION needed.
- Versions: Node as installed on this computer (record with `node --version` at gate time); dependencies pinned by `package-lock.json` (`npm ci`).
- A passing test proves only what it checks. None of these tests ran on a phone.

## 2. Owner checklist for the Poco F6 (nothing below is VERIFIED until you tell me the result)
Do these on the installed app, with test data only.
1. Open the app, add one expense with the number pad. Close the app completely, reopen: the entry is still there.
2. Settings → export a backup. Find the file on the phone. Open it in a file viewer (it should be readable text).
3. Add a debt (Debts & loans). Export a backup, then import it with "Merge": no duplicate debt appears.
4. Import with "Replace", then tap Undo within 8 seconds: the entries AND the debts return.
5. Add a loan, tap "Mark as paid": Transactions shows the full payment; Analytics counts only the interest.
6. Turn on airplane mode, open the app: it still opens and works.
7. Rotate the phone and switch to dark mode: nothing becomes unreadable.
8. Write down anything that looks wrong or feels confusing, in your own words.

## 3. Person-to-person debts and cash flow — current behaviour and OPEN DECISION
Current (confirmed from code): paying back a debt you owe, or receiving money on a debt owed to you, changes ONLY the debt balance. It creates no transaction, so it is not in your Transactions list, spending, income or cash flow.
Consequence: if you really paid 100 ₼ to Rauf, your account balance in the app does not drop unless you also enter a normal expense.
Options for the owner to choose (I have not implemented any):
A. Keep as is (debts are a separate memo list; you enter the cash movement yourself).
B. Ask on each repayment "Also record this as an expense/income?" (default off).
C. Record automatically as a cash-out/in marked as a transfer that is excluded from spending (like loan principal).
My recommendation: B, because it keeps the user in control and avoids silent duplicates.
