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
- Run 100 to 102: loan payments from the Debts page were named on the card but not taken out. Run 103 (owner decision D9): they are taken out, in full, without counting twice. See 12.
- Run 100: when accounts and a next income date are known, the card also shows figure 3 as one line ("Until your next income on ..."). The two figures are different on purpose and both are named.

## 3. Until your next income (Run 97)

- Code: `calcUntilPay` (App.jsx). Shown on Home only while Safe to Spend has no figure.
- Needs: at least one shown account, and a known next income date within 45 days (a recurring income, or an income entry dated ahead).
- Sum: what the shown accounts hold today - scheduled payments and loan payments due before that date (overdue unrecorded ones included) - expense entries dated ahead before that date.
- Per day: the result divided by the days from today up to the day before the income, rounded down to the qapik.
- Shows nothing when: no accounts; no income date known; a recurring income is overdue and unrecorded or due today; income is already recorded this month.
- Run 100: with the option `afterIncome` the same sum is worked out after this month's income is recorded (for the line on the Safe to Spend card). Hand example: 26 Nov, salary recorded on the 25th, accounts 1,540, rent 150 due 7 Dec and internet 20 due 15 Dec, next salary 25 Dec: 1,540 - 170 = 1,370 over 29 days = 47.24 a day. Safe to Spend on the same day says 510 for 5 days.
- Not double counted: a scheduled payment that already has its linked entry is counted once (as the entry).
- Run 101: a bill payment typed in ahead as an ordinary entry (same category, same name, same amount) is also counted once, as the entry, but only when it is dated before the income. Before Run 101 it was counted twice, so this figure was too low by that amount. It is the same rule Safe to Spend has used since Run 22 (F1).
- Run 102: entries dated ahead are taken off as money, the same way the accounts count them: a loan payment in full (not only its interest), money lent or paid back to a person, and the whole of a cost someone will pay back later. Before Run 102 they were taken from the spending view, so such an entry dated ahead made this figure too high by the missing part. The next income date is still found as before; a refund dated ahead is never taken as the income. An entry dated ahead paid from a hidden account is not taken off, because that account's money is not counted either; an entry with no account still is (the cautious side). Test: tests/logic/run102cash.test.mjs, tests/browser/e2e_run102_cash.mjs.
- Run 100 to 102: a loan that was on the Debts page AND set up as a recurring payment was taken out twice here. Run 103: counted once (see 12). Run 103 also stops counting loan plan rows dated before the current month (see 12, rule 1).
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
- Run 101: a bill payment typed in ahead as an ordinary entry (same category, name and amount) is counted once, as the entry. Before Run 101 it was counted twice, so the forecast was too high by that amount. The check of earlier months (the range) uses the same rule, so whether the range is shown can change.
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

## 12. Loan instalments in the money figures (Run 103, owner decision D9, 17 November 2026)

Written before the code was changed, as the owner asked. Code: `loanOpenRows` and `openCommitments` (App.jsx).

Owner rule: a loan instalment is money out in full. Its principal is not spending; its interest (and fees) is spending.

**Which instalments are still to pay** (one loan, one period):

1. Rows of the loan plan (figure 9) dated before the current month are left out. The app cannot know whether they were paid; the Debts page has no "already paid" step for an old loan, so counting them would take out up to years of payments at once. Bills follow the same rule (only this month's dates).
2. f = the first plan row dated in the current month or later. k = payments recorded on the Debts page.
3. Payments that belong to rows f and later: the recorded payments after the first f, if there are any; otherwise the payments dated in the current month or later (someone who added an old loan and pays this month's instalment). The larger count of the two is used.
4. Those payments settle rows f, f+1, ... in order, one row each. A payment smaller than its row leaves the difference due (interest is settled first, so the difference is principal first). A larger payment does not settle the next row (never optimistic).
5. Every row still due and dated in the period counts in full. Overdue rows of the current month count too.

**Not counted twice:**

- A loan linked to a recurring payment (the choice "Is this loan also a recurring payment?" on the loan card, stored as `loan.billId`) is counted only through that recurring payment. Choosing "No, or find it by name and amount" removes the link.
- Without a link, a loan is also left out when an active recurring payment has the lender's name (ignoring case and spaces) and the same amount as the instalment to the qapik. The recurring payment already counts it. When such a loan is marked paid, its entry is linked to that recurring payment (`billId`), so the recurring payment shows as paid too. Limit: this works for recurring payments set up as bills; an older recurring entry that was never turned into a bill is matched by name and amount but its paid state is not linked.
- An ordinary entry typed in ahead (dated after today, in the period, linked to no bill and no loan) with the lender's name and the instalment amount to the qapik IS that instalment. It is counted once, as the entry. One entry settles one row or one bill date, never both.
- A loan payment already recorded is counted once: its interest in spending, its principal as money out (below), and the row is settled.

**Figures:**

- Safe to Spend (2): remaining = income received - reserve - spending recorded this month - unpaid bill dates this month - **instalments still due this month (in full)** - **principal of loan payments recorded this month**. The last item is new: the spending list holds only the interest of a loan payment, so without it marking an instalment paid would raise Safe to Spend by its principal. Worked out as (loan payments this month in the raw entries) - (the same payments in the spending list).
- Until your next income (3): instalments still due before the income date, in full (as before, but now with rule 1 and the duplicate rules). Recorded payments are already in the account balances.
- Month-end forecast (6): a spending figure, so only the **interest** of instalments still due this month is added to the fixed part. The principal is returned as a separate amount ("also leaving your accounts, not spending") and shown under the forecast. Loan payment entries are left out of the usual daily pace (they are scheduled). The check of earlier months counts only the Debts-page payments recorded up to that month's 10th. Owner may overturn this split; the owner's sentence also said "forecasts", which this keeps for the money figures and the separate principal line.
- Run-out day (7): follows Safe to Spend, so it now includes instalments.

**Hand-worked cases** (flat-rate loan of 1,200.00 at 12% for 12 months: instalment 112.00 = 12.00 interest + 100.00 principal; first payment 20 October 2026, one payment recorded on 20 October; today 17 November 2026; income recorded 1,000.00; spending recorded 200.00; no reserve, no bills):

- A. Before paying November's instalment: Safe to Spend = 1,000 - 200 - 112 = **688.00**.
- B. After "Mark paid" on 17 November (entry 112.00, interest 12.00): spending 212; principal paid 100; instalment settled. 1,000 - 212 - 100 - 0 = **688.00**. Paying does not change the figure.
- C. Old loan, never recorded: same loan for 24 months (instalment 62.00 = 12.00 + 50.00), first payment 20 November 2025, no payments recorded. Only November 2026's 62.00 counts, not the 12 earlier ones. After "Mark paid" today: k = 1, one payment dated this month, so November is settled: the figure does not change.
- D. Partial: November's row has a recorded payment of 80.00 against 112.00: 32.00 is still due.
- E. Duplicate: a recurring payment "Kapital Bank" 112.00 on the 20th and the loan from "Kapital Bank" with instalment 112.00: 112.00 is taken out once. 688.00.
- F. Typed ahead: an ordinary entry "Kapital Bank" 112.00 dated 20 November (no loan, no bill): spending 312 includes it; the instalment is settled by it. 1,000 - 312 = **688.00**.
- G. Due on payday: until-income on 17 November with the next salary on 20 November does not count an instalment on the 20th (it belongs to the next pay cycle); one on the 19th counts. Safe to Spend counts both (calendar month).
- H. Month boundary: on 28 November with salary on 5 December, an instalment on 1 December counts in until-income and not in November's Safe to Spend.
- I. Until-income: accounts 900.00, salary 25 November, instalment 112.00 on the 20th: 900 - 112 = 788.00 over 8 days = 98.50 a day.
- J. Forecast for case A: 12.00 interest is added to the fixed part; 100.00 is shown as principal leaving the accounts.

Tests: tests/logic/run103loans.test.mjs (39 checks), tests/browser/e2e_run103_loans.mjs (14 checks), tests/browser/e2e_run100_cycle.mjs (14 checks).

Not changed (outside D9): money lent to or repaid by a person (Debts page, "debts") is still left out of Safe to Spend.

## 13. Which figure Home shows first (Run 103, owner decision D1, 17 November 2026)

- "Until your next income" (3) is the main Home figure whenever it can be worked out, before or after this month's income.
- Safe to Spend (2) then follows as the second card, named "Safe to Spend this month", with the line "Calendar-month figure, for monthly budgeting." The two are never added or mixed.
- When (3) cannot be worked out, Safe to Spend stays the main figure and one note says what is missing (`calcUntilPay` gives the reason): no account with a balance; no next income date (a recurring income or an income entry dated ahead); the expected income is overdue; the income is due today; the next income is more than 45 days away. The app never guesses an income date.
- Before this month's income arrives and (3) can be worked out, the "waiting" month card still shows below it, also as the second card.
- "What if I buy something?" sits on the main card only.
## Not written up here yet

"Left over since you started" and the month summary. Their code has its own comments; they should be added here in the same form.

## Known structural weakness

Until Run 100, figures 2, 3, 6 and 7 each collected scheduled payments by themselves, and they did not agree: only figure 2 knew that a payment typed in ahead is the bill's payment.

Run 101: figures 2, 3 and 6 now take unpaid scheduled payments from one place, `openCommitments` (App.jsx). Figure 7 uses figures 2 and 6, so it follows. Test: tests/logic/run101due.test.mjs.

Still separate until Run 103: loan payments from the Debts page were collected only by figure 3 (and named, not subtracted, on figure 2). Run 103 (owner decision D9): `openCommitments` also returns the loan instalments still due (see 12), so figures 2, 3, 6 and 7 use one list.
