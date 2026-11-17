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
- Known gap (Run 100, open owner decision): loan payments from the Debts page that are still due this month are **not** taken out, unless the person also set the loan up as a recurring payment. The card names the amount (`loanDueInMonth`: unpaid plan payments dated this month or earlier) and says it is not taken out. Subtracting it would count it twice for people who have both.
- Run 100: when accounts and a next income date are known, the card also shows figure 3 as one line ("Until your next income on ..."). The two figures are different on purpose and both are named.

## 3. Until your next income (Run 97)

- Code: `calcUntilPay` (App.jsx). Shown on Home only while Safe to Spend has no figure.
- Needs: at least one shown account, and a known next income date within 45 days (a recurring income, or an income entry dated ahead).
- Sum: what the shown accounts hold today - scheduled payments and loan payments due before that date (overdue unrecorded ones included) - expense entries dated ahead before that date.
- Per day: the result divided by the days from today up to the day before the income, rounded down to the qapik.
- Shows nothing when: no accounts; no income date known; a recurring income is overdue and unrecorded or due today; income is already recorded this month.
- Run 100: with the option `afterIncome` the same sum is worked out after this month's income is recorded (for the line on the Safe to Spend card). Hand example: 26 Nov, salary recorded on the 25th, accounts 1,540, rent 150 due 7 Dec and internet 20 due 15 Dec, next salary 25 Dec: 1,540 - 170 = 1,370 over 29 days = 47.24 a day. Safe to Spend on the same day says 510 for 5 days.
- Not double counted: a scheduled payment that already has its linked entry is counted once (as the entry).
- Possible double count: a loan that is on the Debts page AND set up as a recurring payment is taken out twice here (never optimistic).
- Can be wrong when: spending was saved with no account (see 4); a hidden account holds money; the income comes late.

## 4. Spending with no account (Run 98)

- Code: `unassignedSpend` (App.jsx). Shown as a line on the "Until your next income" card.
- Counts: expense entries with no account (or an account that no longer exists), dated from the earliest opening date of a shown account up to today.
- Why that date: the opening amount the person typed already includes everything before it.
- Says nothing when no shown account has an opening date: the app cannot know.
- It is **never taken out of any figure**. The money may have come from somewhere the person does not track (cash in a pocket). The app shows the amount and says the figure above may be too high by up to that much.

- Run 99: the same amount is shown under the account balances on Home (`unassignedEntries` gives the list; `unassignedSpend` adds that same list up, so the list and the amount cannot disagree).

## 4a. Putting an entry on an account (Run 99)

- Code: `assignAccount` (App.jsx), used by the "Choose accounts" sheet on Home.
- Changes only the account of entries that have none (or whose account no longer exists). Amount, date, id and every other field stay as they were. An entry that already has an account is never moved.
- Refuses an account that does not exist. The person chooses; the app never guesses. One Undo puts everything back.
- Effect: that account's balance (1) goes down by the entry's amount, and the amount in (4) goes down by the same.
- Hand example: card opens at 200, income 2,000 on the card, 20 spent on the card: 2,180. Two entries with no account, 12.50 and 7.50. Both put on the card: 2,180 - 12.50 - 7.50 = 2,160.

## 4b. "What if I buy something?" (Run 99)

- Code: `whatIfSpend` (App.jsx). A question about a figure already on the card. Nothing is saved and no figure changes.
- On Safe to Spend: left after = figure - amount; per day = left after / days left in the month (same division as that card).
- On "Until your next income": left after = figure - amount; per day = left after / days to the income, rounded down to the qapik (same as that card).
- If the amount is more than what is left it says by how much, and gives no per-day figure.
- No answer for: zero, a negative amount, text that is not a number, 1,000,000,000 or more.
- Hand example: 170 left, 3 days, buy 20: 150 left; 150 / 3 = 50.00 a day instead of 56.66 (170 / 3 = 56.666, rounded down).
- It inherits every limit of the figure it starts from.

## 4c. Home-screen widget (Run 99)

- Code: `widgetSnapshot` (App.jsx). Shows the first three accounts that are not hidden. Before Run 99 a hidden account could appear there.

## 5. Bank statement checks (Run 98)

- Code: `statementNeedsOk` (App.jsx); the checks themselves are in statement.js.
- A statement needs the person's tick before it can be added when: rows do not add up with the bank's own running balance, or the rows' totals differ from the bank's summary.
- No tick is asked for when the file has nothing to check against. Nothing failed in that case; the sheet says the rows could not be checked.

## 6. Month-end forecast (written up in Run 99; code unchanged)

- Code: `forecastCore`, `calcMonthEndForecast` (App.jsx).
- Fixed part: spent so far this month + expense entries dated later this month + scheduled payments still to come or overdue this month.
- Usual part: average daily spending over up to 28 days ending yesterday, leaving out recurring and bill entries and any purchase far above the median. Multiplied by the days left.
- Range: plus or minus the daily spread times the square root of the days left; never below the fixed part.
- The range is shown only if at least 2 of the last 3 months can be checked, and in at least two thirds of them the range made on the 10th contained what was really spent.
- Shows nothing with too few days of history.
- Estimate. One unusual week moves it.

## 7. Run-out day (written up in Run 99; code unchanged)

- Code: `calcRunOutDay` (App.jsx).
- Sum: Safe to Spend left / usual daily spending (the same usual part as 6) = days the money covers. Day = today + those days, rounded down.
- Shown only when: Safe to Spend is above zero, it is the 5th or later, the cover is at least 2 days shorter than the days left, and the day falls in this month.
- It inherits the limits of Safe to Spend (2) and of the forecast (6).

## 8. Net position (written up in Run 99; code unchanged)

- Code: `netPosition`, `loanRemainingCents` (App.jsx).
- Sum: balances of the shown accounts (1) + what people owe you - what you owe - what is left on loans.
- Loan balances come from the repayment plan after the payments recorded so far. They are estimates: an extra payment or the bank's own rounding can move them.
- Shows nothing when there are no debts and no loans.
- Hidden accounts are left out.

## 9. Loan plan (written up in Run 100; code unchanged)

- Code: `loanSchedule` (App.jsx). All amounts in whole qapik.
- Four kinds. Monthly rate r = yearly rate / 12.
  - Equal payments (annuity): payment = P x r / (1 - (1 + r)^-n), rounded; or the bank's own payment if the person typed it. Each month: interest = balance x r, rounded; the rest lowers the balance. The last payment takes whatever is left.
  - Equal principal: principal part = P / n, rounded; interest on the falling balance; the last part takes what is left.
  - Flat: total interest = P x rate x n / 12; spread evenly; the last payment takes the rounding.
  - No interest: P / n rounded down; the last payment takes the rest.
- Refused (no plan shown): a payment that never lowers the balance; invalid amounts, months or dates.
- Dates: the same day each month, shortened to the month's last day when needed.
- Estimate: a bank can round differently or charge fees the person did not enter.
- Spending rule (owner, 30 October): a loan payment is money out in full; only its interest counts as spending; an unknown split counts nothing as spending.

## 10. Budget left and carry-over (written up in Run 100; code unchanged)

- Code: `calcBudgetStatus`, `budgetCarried` (App.jsx).
- Limit this month = the budget + what was carried in (if carrying is on for that budget). Percent = spent / limit, capped at 100. "Over" when spent is above the limit. Warning from 80%.
- "Ahead of pace": only in the current month, when the percent used is more than 10 points above the share of the month that has passed.
- Carry-over: off unless switched on per budget. Month by month from the month it was switched on: carried = the unused part, never more than one month's limit, never negative (overspending is not carried).
- A planning figure only. No money is created or moved.
- Limit: the current budget amount is used for every past month (budget history is not kept).

## 11. Goal progress (written up in Run 100; code unchanged)

- Code: `calcGoalProgress`, `goalRequiredMonthly`, `goalScenario` (App.jsx). Whole qapik.
- Percent = saved / target, capped at 100. Complete when saved is at least the target.
- With a monthly amount: months needed = remaining / monthly amount, rounded up; one payment on the 1st of each month.
- With a date: needed per month = remaining / months until the date, rounded **up** to the qapik (never short at the end).
- States: no date, overdue, complete, invalid (no target).
- Goals reduce Safe to Spend (2) only through the monthly amounts of goals that still need money.

## Not written up here yet

"Left over since you started" and the month summary. Their code has its own comments; they should be added here in the same form.

## Known structural weakness

Figures 2, 3, 6 and 7 each collect scheduled payments by themselves. They agree today (tests), but a change to one can leave the others behind. Planned: one shared "money position" calculation, with tests written first.
