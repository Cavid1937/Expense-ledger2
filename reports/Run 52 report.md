# Run 52 report: bank statements (PDF, Excel, text) and the rest of the delete/Undo work (12 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local only. Nothing pushed, no APK built.

## What you asked
"Master bank statements from every aspect, so users can import their own statement files and the app converts them to its own entries."

## What now works
A person opens Import / Export, picks a statement file (or pastes its text), and sees the normal review sheet before anything is added.

| Source | Status |
|---|---|
| ABB statement, PDF | VERIFIED on your real file: 497 of 497 rows read; the bank's own running balance confirms every row |
| ABB statement, Excel | VERIFIED on your real file: 497 of 497 rows; the damaged picture inside the file is ignored |
| Unibank statement, PDF | VERIFIED on your real file: 521 of 521 real rows (2 zero-amount card checks are left out on purpose) |
| Any other bank, Excel or text table with column headings (az, ru, en) | VERIFIED with made-up files only |
| Any other bank, table without headings | VERIFIED with made-up files when a balance column exists; otherwise refused with a reason |
| Any other bank, PDF | IMPLEMENTED BUT UNVERIFIED: only works if the PDF's rows hold a date and money columns with clear headings. No real sample yet. |
| Scanned PDF (a picture) | Not possible without text recognition; the app says so |
| Password-protected PDF | Refused with a message |

Your real files were used only to count rows and check totals. Nothing from them is stored in the project, the tests or this report.

## How the app treats a statement
- It recognises the layout from the rows themselves, not from the file name.
- The date is the day you paid, not the later day the bank booked it (ABB prints both).
- The amount is what the bank really charged. A payment in dollars keeps "20.00 USD" as a note.
- Category comes from, in this order: your own history for that exact merchant, the bank's merchant code, words in the name (metro, bus, market, pharmacy...), the built-in merchant list. Otherwise "Other".
- Transfers, wallet top-ups and cash withdrawals are grouped as one tick box (on by default). They are money that moved, not shopping.
- Payments the bank has not finished ("Lock" in Unibank) are a separate tick box, off by default, because the bank repeats them later.
- You can put all entries on one of your accounts.
- Card numbers and bank reference numbers are dropped. They are never written into an entry.
- The same statement imported twice, or once as PDF and once as Excel, adds nothing the second time. On your real ABB file, 495 of 497 rows get the very same identity from both formats; the other 2 sit on a page edge in the PDF and are caught by the "exactly the same" rule instead.
- Everything can be undone right after.

## Other work in this run (from the data-integrity job)
- Undo for deleting a debt, a loan, a loan payment, a repayment without an entry, an own category and an own subcategory.
- "Entries counted twice?" on Import / Export: shows groups with the same day and amount; you tick the copies and delete them, with Undo.
- Test launcher no longer leaves Chrome profiles behind (0 left after a run; was 83 GB).

## Files
New: `statement.js` (the reader, no dependencies), `pdfText.js` (opens a PDF; loads the PDF library only when a PDF is chosen).
Changed: `App.jsx`, `screens/settings.jsx`, `screens/debts.jsx`, `screens/add.jsx`, `i18n.js`, `package.json` (new dependency `pdfjs-dist`), test files.
Storage key `expense_ledger_v5` untouched. No stored data format changed.

## Tests actually run
- Logic: `node tests\run-logic.mjs` -> 99 files, 2,012 checks passed, 0 failed. New: `run52statement.test.mjs` (52 checks), `run51integrity.test.mjs` (50).
- Browser, alone on the final code: `e2e_run52_statement` 34/34 (a real PDF, Excel file, text file and pasted text through the import screen, az and ru), `e2e_run51_undo` 31/31, `e2e_run51_doubles` 14/14, `e2e_run51_integrity` 30/30.
- Full browser suite on the Run 51 code: 118 files, 1,992 passed, 1 failed; the failure was a test I edited while the run was going, and it passes when rerun.
- Full browser suite on the Run 52 code: see the last line of this report.
- Production build (`npm run build`): succeeds. The PDF library is in its own files (about 440 kB compressed) that load only when a PDF is opened; the main app file did not grow.
- Private check on your three real statement files: counts and totals only (see the table above).

## What is NOT done or not proven
- No statement from Kapital, PASHA, Leobank, Birbank, Rabitabank or others. Their PDFs are NOT ASSESSED.
- Not tried on a phone or in the APK. A 28-page PDF took about a second on this computer; phone speed is unknown.
- The "match the columns yourself" screen (for a file the app cannot work out) is not built. Such files are refused with a reason.
- Bank CSV files still go through the older, simpler reader (no merchant codes). Joining the two is a later step.
- az / ru wording of all new lines is my draft.
- I made a mistake during the work: installing the PDF library removed the test tools from this copy. I reinstalled them and all tests run again. Nothing in the app was affected.

## Two things you sent
- Google Cloud asked for a 30 USD prepayment: do not pay it. That screen is for a billing account (paid cloud services). Google sign-in and Drive backup do not need one. When you set it up, create the project and skip "Start free trial" / billing.
- Birbank notification (card to card): layout noted for the notification reader. It has the amount, the last digits and the balance, in a different order and wording from ABB's. Nothing from it is stored.

## Next action
Get one statement each from the banks your users use most (personal details can stay; I record only the layout), then build the "match the columns" screen for unknown layouts. After that: session 2 quick fixes.
