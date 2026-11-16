# Money figures: what each one means

Written 16 November 2026 (Run 98). One entry per figure the app shows about "how much money". Each entry says what goes in, what is left out, the sum, and where it can be wrong. Add to this file when a figure is added or changed; do not describe a figure anywhere else in a different way.

Words used the same way everywhere:

- **Recorded**: an entry the person saved, dated today or earlier.
- **Dated ahead**: an entry the person saved with a future date. It has not happened yet.
- **Scheduled**: a payment or income the app expects from a recurring item or a loan plan. Not a record.
- **Estimate**: a figure worked out from the above. Never a bank balance.

## 1. Account balance

- Code: `accountBalances` (App.jsx).
- Sum: opening amount + income entries on that account - expense entries on that account + transfers in - transfers out, up to today.
- Left out: entries dated ahead; entries with no account; entries whose account no longer exists.
- Can be wrong when: the person saves entries without choosing an account (see 4), or the opening amount was typed wrong.
- It is the person's own record, not a live bank balance.

## 2. Safe to Spend

- Code: `calcSafeToSpend` (App.jsx).
- Sum: this calendar month's recorded income - the larger of the savings floor and the goal contributions - this month's recorded spending - scheduled payments still unpaid this month.
- Shows a figure only when income is recorded this month.
- Per day: the figure divided by the days left in the calendar month.
- Known weakness (open owner decision): it follows the calendar month, not the pay cycle. It does not use account balances.

## 3. Until your next income (Run 97)

- Code: `calcUntilPay` (App.jsx). Shown on Home only while Safe to Spend has no figure.
- Needs: at least one shown account, and a known next income date within 45 days (a recurring income, or an income entry dated ahead).
- Sum: what the shown accounts hold today - scheduled payments and loan payments due before that date (overdue unrecorded ones included) - expense entries dated ahead before that date.
- Per day: the result divided by the days from today up to the day before the income, rounded down to the qapik.
- Shows nothing when: no accounts; no income date known; a recurring income is overdue and unrecorded or due today; income is already recorded this month.
- Not double counted: a scheduled payment that already has its linked entry is counted once (as the entry).
- Can be wrong when: spending was saved with no account (see 4); a hidden account holds money; the income comes late.

## 4. Spending with no account (Run 98)

- Code: `unassignedSpend` (App.jsx). Shown as a line on the "Until your next income" card.
- Counts: expense entries with no account (or an account that no longer exists), dated from the earliest opening date of a shown account up to today.
- Why that date: the opening amount the person typed already includes everything before it.
- Says nothing when no shown account has an opening date: the app cannot know.
- It is **never taken out of any figure**. The money may have come from somewhere the person does not track (cash in a pocket). The app shows the amount and says the figure above may be too high by up to that much.

## 5. Bank statement checks (Run 98)

- Code: `statementNeedsOk` (App.jsx); the checks themselves are in statement.js.
- A statement needs the person's tick before it can be added when: rows do not add up with the bank's own running balance, or the rows' totals differ from the bank's summary.
- No tick is asked for when the file has nothing to check against. Nothing failed in that case; the sheet says the rows could not be checked.

## Not written up here yet

Month-end forecast, run-out day, net position, loan plans, budget remaining, goal progress, "left over since you started". Their code has its own comments; they should be added here in the same form.
