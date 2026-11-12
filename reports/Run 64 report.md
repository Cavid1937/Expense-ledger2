# Run 64 report: everything in one Excel file, and exports that work in the Android app (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commit only. Nothing pushed, no APK built.
From your 10 Nov list (NEXT_WORK_PLAN item E11, "make the export one coherent, self-explaining system").

## What changed
1. **"Download for Excel (.xlsx)" on Import & Export.** One file holds nine sheets:
   - Read me
   - Entries
   - Accounts
   - Transfers
   - Budgets
   - Goals
   - Goal history
   - Debts and loans
   - Repeating bills

   Details:
   - The **Read me** sheet says what each sheet holds and how many rows it has. It also says the file is for reading, and that the backup file is what moves data to another phone.
   - **Headings and sheet names are in the app's language and words**, for example "Where you paid" / "Harada ödəmisiniz".
   - **Cells:** amounts are real numbers (shown as 12.50) and dates are YYYY-MM-DD. Text is always stored as text, so nothing a person typed can become a formula.
   - **Linking:** every entry, account, goal and bill keeps its id, so the sheets can be matched to each other.
   - **How it is made:** the file is produced on the phone, with no library and nothing sent anywhere.
   - **Checked in the real Excel** on this computer: all nine sheets open with Azerbaijani names and headings, and amounts show with 2 decimals.
2. **The Gifts and Debts & loans spreadsheets now work inside the Android app.** They used a plain browser download, which does nothing in the app. They now save into Downloads the same way the main CSV does.
3. **Not in the Android app yet:** the Excel workbook button appears only in the browser version. The app's save bridge takes text only, and a workbook is binary. Adding binary saves needs a change to the Android shell and an APK build, so it is not done.
4. **Nothing existing changed:** the CSV export, the backup file and the import are exactly as before.

## Two mistakes of mine, found and fixed tonight
- The full browser suite on Runs 62-63 reported 2 problem files:
  - **Downgrade test:** I had broken the test build script with the same `//` note mistake as in Run 59. This happened after the 62-63 commit, while the suite was running.
  - **Touch-target test:** the new small "Last months" / "Payments" / "History" buttons were 32 px tall; the rule is at least 34. I raised them to 36.
- Both files pass now. I also checked every note added in Runs 58-64, and none sits in front of code on the same line.

## Tests actually run
- Logic: 107 files, 2,169 passed, 0 failed. The new `run64xlsx.test.mjs` has 13 checks, worked out by hand:
  - sheet order and headings;
  - the entry row, with its amount as a number and the account by name;
  - account balance 100 − 12.50 = 87.50;
  - the budget line;
  - goal history 300 + 150 = 450;
  - the debt payment, with 400 left after it;
  - Read me counts;
  - the file read back with the app's own reader, where '=cmd' stays text;
  - sheet names that Excel would refuse are cleaned;
  - Azerbaijani headings.
- The language test went from 78 to 81 checks: three new wording groups are now checked.
- Browser, on the final code:
  - new `e2e_run64_xlsx`: 5/5 (the button, the download, nine sheets, both entries read back).
  - Also passing: e2e_run61_downgrade 4, e2e_downgrade 26, e2e_ux_lang 8, e2e_ux 30, e2e_run62_history 7, e2e_run61_goals 11, e2e_run50gifts 9, e2e_import 53.
- Full browser suite: see PHASE_CHECKPOINT.md (it runs after this commit).

## Status
| Item | Status |
|---|---|
| Excel workbook (browser version) | VERIFIED in tests and opened in Excel |
| Gifts / debts spreadsheets in the Android app | IMPLEMENTED BUT UNVERIFIED (needs an APK on your phone) |
| Excel workbook in the Android app | BLOCKED (needs a native save of binary files and an APK build) |
| az / ru wording | IMPLEMENTED BUT UNVERIFIED |
