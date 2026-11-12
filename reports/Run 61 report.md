# Run 61 report: adding money to goals, with a history and a finished state (13 Nov 2026)

Working copy: `Expense-ledger2-fixes`, branch `fix/financial-correctness-2026-10-26`. Local commit only. Nothing pushed, no APK built.
From your 10 Nov list (NEXT_WORK_PLAN, items C7 and C8). Neither needed a decision from you.

## What changed
1. **The goal card's button is now "Add money"; it used to be "Update".** You type the amount to add, plus an optional note such as "Birthday money", and it is added to what the goal holds. Before, the number you typed replaced the total.
2. **Each goal has a history.** "History (n)" opens a list of every addition, newest first, with its date and note.
   - An older goal also shows what it held before the history began, so the list always adds up to the total.
   - Money moved in from last month's leftover shows as "From last month's leftover".
3. **Mistakes can still be fixed.** "Correct the total instead" sets the total directly. The difference is written into the history as "Total corrected", so nothing goes unexplained. Changing "Saved so far" in the goal's edit form does the same.
4. **Reaching a goal.** When an addition reaches the target, a message says "Goal reached: Laptop. Well done!", and the card shows "Reached on 13 Nov 2026". When the whole history is known, it also shows how long it took ("1,000.00 ₼ saved in 42 days").

## Data safety
- A goal's total ("saved") is stored exactly as before. Every figure (Safe to Spend, the coach, month-start offers) reads that same number.
- The history and the reached day are two optional extra fields. Older backups import exactly as before, without a history.
- Tested with the real previous app version (version 9): it opens data that has a goal history without any error, and the goal still shows 450 of 1,000. That older version drops the history it does not know, and only the history.

## Tests actually run
- Logic: 105 files, 2,143 passed, 0 failed. The new `run61goals.test.mjs` has 14 checks, worked out by hand:
  - adding money: 300 + 150 = 450, cents stay exact (0.10 + 0.20), reaching exactly 1,000 sets the day, and adding again later does not celebrate twice;
  - a correction down to 250 records −50, and the history adds up;
  - the leftover offer writes its line;
  - backups keep the history, and an older backup imports unchanged.
- Browser, on the final code:
  - new `e2e_run61_goals`: 11/11. On screen: adding 150 with a note; History (1) showing the line and the 300 held before; correcting to 400 (−50); adding 600 reaching 1,000 with "Reached on"; the card fitting at 320 px in az and ru with the add row open.
  - new `e2e_run61_downgrade`: 4/4.
  - Also passing: e2e 27 (rewritten for "Add money" with the same strictness: letters, negative and scientific numbers are still refused; adding 1,300 to 3,200 gives exactly 4,500 with one history line), e2e_run34_motion 41, e2e_run50 12, e2e_run59_leftover 16, e2e_downgrade 26, e2e_run37_roundtrip 13, e2e_lang 57.
- **A mistake of mine, caught by the new test:** the first version of "how long it took" passed a date in the wrong form, and the goal card crashed once a goal was reached. Fixed before committing.

## Status
| Item | Status |
|---|---|
| Add money with a history, corrections recorded | VERIFIED in tests |
| Reached state with the day | VERIFIED in tests |
| Older app version opening the new data | VERIFIED (version 9; total intact, history dropped by that version) |
| az / ru wording | IMPLEMENTED BUT UNVERIFIED |
| On your phone | NOT ASSESSED |
